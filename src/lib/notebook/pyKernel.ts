/**
 * Pyodide (WASM Python) kernel running inside a Web Worker.
 *
 * - Lazy singleton: nothing is downloaded until the first `runPython` call.
 * - The worker script is generated via Blob URL so we don't need to bundle
 *   Pyodide — it is streamed from the official CDN (~6 MB, cached by the
 *   browser + our service worker after first use).
 * - Each run gets the notebook params injected as a Python dict `p`.
 * - stdout / stderr are captured and returned together with the repr of the
 *   last expression (Jupyter-style).
 * - `interrupt()` hard-terminates the worker (kills infinite loops) and the
 *   next run boots a fresh kernel.
 */

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export interface PyRunResult {
  ok: boolean;
  /** repr() of the value of the last expression (if any) */
  result: string | null;
  /** captured stdout */
  stdout: string;
  /** error message (traceback tail) if failed */
  error: string | null;
  /** wall-clock ms */
  ms: number;
  /** JSON-serialisable value if the last expression was convertible */
  json?: unknown;
}

type KernelStatus = "cold" | "booting" | "ready" | "busy" | "dead";

const WORKER_SRC = `
let pyodide = null;
let booted = false;

async function boot(indexURL) {
  importScripts(indexURL + "pyodide.js");
  pyodide = await self.loadPyodide({ indexURL });
  // Preload the scientific stack most finance work needs.
  await pyodide.loadPackage(["numpy", "micropip"]);
  booted = true;
}

self.onmessage = async (e) => {
  const { id, type, code, params, indexURL, packages } = e.data;
  try {
    if (type === "boot") {
      await boot(indexURL);
      self.postMessage({ id, type: "booted" });
      return;
    }
    if (type === "loadPackages") {
      await pyodide.loadPackage(packages);
      self.postMessage({ id, type: "packagesLoaded" });
      return;
    }
    if (type === "run") {
      const t0 = Date.now();
      // Inject params dict
      pyodide.globals.set("p", pyodide.toPy(params || {}));
      // Capture stdout
      await pyodide.runPythonAsync(
        "import sys, io\\n_ef_out = io.StringIO()\\n_ef_old = sys.stdout\\nsys.stdout = _ef_out"
      );
      let result = null, error = null, json;
      try {
        // Auto-load imported packages (numpy already in)
        await pyodide.loadPackagesFromImports(code);
        const value = await pyodide.runPythonAsync(code);
        if (value !== undefined && value !== null) {
          try {
            if (typeof value === "object" && value.toJs) {
              const js = value.toJs({ dict_converter: Object.fromEntries, create_proxies: false });
              try { json = JSON.parse(JSON.stringify(js)); } catch {}
              result = String(value);
              value.destroy && value.destroy();
            } else {
              json = value;
              result = String(value);
            }
          } catch { result = String(value); }
        }
      } catch (err) {
        const msg = String(err && err.message || err);
        // Trim the pyodide-internal frames from the traceback
        const lines = msg.split("\\n").filter((l) =>
          !l.includes('File "/lib/python') && !l.includes("pyodide/") );
        error = lines.slice(-12).join("\\n");
      }
      const stdout = await pyodide.runPythonAsync(
        "sys.stdout = _ef_old\\n_ef_out.getvalue()"
      );
      self.postMessage({ id, type: "result", ok: !error, result, stdout: stdout || "", error, ms: Date.now() - t0, json });
      return;
    }
  } catch (err) {
    self.postMessage({ id, type: "result", ok: false, result: null, stdout: "", error: String(err && err.message || err), ms: 0 });
  }
};
`;

let worker: Worker | null = null;
let status: KernelStatus = "cold";
let bootPromise: Promise<void> | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
const statusListeners = new Set<(s: KernelStatus) => void>();

function setStatus(s: KernelStatus) {
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

export function getKernelStatus(): KernelStatus {
  return status;
}

export function onKernelStatus(fn: (s: KernelStatus) => void): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

function spawn(): Worker {
  const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
  const w = new Worker(URL.createObjectURL(blob));
  w.onmessage = (e) => {
    const { id } = e.data;
    const p = pending.get(id);
    if (p) {
      pending.delete(id);
      p.resolve(e.data);
    }
  };
  w.onerror = (e) => {
    pending.forEach((p) => p.reject(new Error(e.message || "worker error")));
    pending.clear();
    setStatus("dead");
  };
  return w;
}

function post<T = any>(msg: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    worker!.postMessage({ ...msg, id });
  });
}

async function ensureBooted(): Promise<void> {
  if (status === "ready" || status === "busy") return;
  if (bootPromise) return bootPromise;
  setStatus("booting");
  worker = spawn();
  bootPromise = post({ type: "boot", indexURL: PYODIDE_CDN })
    .then(() => setStatus("ready"))
    .catch((e) => {
      setStatus("dead");
      bootPromise = null;
      throw e;
    });
  return bootPromise;
}

/**
 * Run Python code with notebook params available as dict `p`.
 * First call boots the kernel (~5-10 s on cold cache).
 */
export async function runPython(
  code: string,
  params: Record<string, number> = {}
): Promise<PyRunResult> {
  await ensureBooted();
  setStatus("busy");
  try {
    const r = await post<PyRunResult & { type: string }>({ type: "run", code, params });
    return {
      ok: r.ok,
      result: r.result ?? null,
      stdout: r.stdout ?? "",
      error: r.error ?? null,
      ms: r.ms ?? 0,
      json: r.json,
    };
  } finally {
    if (status !== "dead") setStatus("ready");
  }
}

/** Hard-kill the kernel (stops infinite loops). Next run boots fresh. */
export function interruptKernel(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pending.forEach((p) => p.reject(new Error("kernel interrupted")));
  pending.clear();
  bootPromise = null;
  setStatus("cold");
}
