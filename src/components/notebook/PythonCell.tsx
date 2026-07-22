/**
 * Python cell for the Reactive Notebook — runs real CPython (numpy included)
 * via a Pyodide Web Worker kernel. Params from slider cells are injected as
 * the Python dict `p`.
 */
import { useEffect, useState } from "react";
import { Loader2, Play, Square, Sparkles } from "lucide-react";
import {
  runPython,
  interruptKernel,
  getKernelStatus,
  onKernelStatus,
  type PyRunResult,
} from "@/lib/notebook/pyKernel";

const STATUS_LABEL: Record<string, string> = {
  cold: "Python 内核未启动 (首次运行下载 ~6MB WASM)",
  booting: "内核启动中…",
  ready: "内核就绪 · numpy 可用",
  busy: "运行中…",
  dead: "内核崩溃 — 再次运行将重启",
};

export const PY_PLACEHOLDER = `import numpy as np
S, K, T, r, sigma = p["S"], p["K"], p["T"], p["r"], p["sigma"]
from math import log, sqrt, exp, erf
N = lambda x: 0.5*(1+erf(x/sqrt(2)))
d1 = (log(S/K)+(r+sigma**2/2)*T)/(sigma*sqrt(T))
d2 = d1 - sigma*sqrt(T)
call = S*N(d1) - K*exp(-r*T)*N(d2)
print(f"BS call = {call:.4f}")
call`;

const PythonCell = ({
  body,
  params,
  onChange,
}: {
  body: string;
  params: Record<string, number>;
  onChange: (body: string) => void;
}) => {
  const [status, setStatus] = useState(getKernelStatus());
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<PyRunResult | null>(null);

  useEffect(() => onKernelStatus(setStatus), []);

  const run = async () => {
    setRunning(true);
    try {
      const r = await runPython(body || "pass", params);
      setOut(r);
    } catch (e) {
      setOut({
        ok: false,
        result: null,
        stdout: "",
        error: String((e as Error)?.message || e),
        ms: 0,
      });
    } finally {
      setRunning(false);
    }
  };

  const stop = () => {
    interruptKernel();
    setRunning(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          disabled={running || status === "booting"}
          className="inline-flex items-center gap-1 px-3 py-1 bg-gold text-background text-[10px] font-mono uppercase tracking-wider hover:bg-gold/85 disabled:opacity-50"
        >
          {running || status === "booting" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          Run
        </button>
        {(running || status === "busy") && (
          <button
            onClick={stop}
            className="inline-flex items-center gap-1 px-2 py-1 border border-rose-500/60 text-rose-400 text-[10px] font-mono uppercase tracking-wider hover:bg-rose-500/10"
            title="终止内核(可打断死循环)"
          >
            <Square className="w-3 h-3" /> Stop
          </button>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <span
            className={
              "inline-block w-1.5 h-1.5 rounded-full " +
              (status === "ready"
                ? "bg-emerald-400"
                : status === "busy" || status === "booting"
                ? "bg-amber-400 animate-pulse"
                : status === "dead"
                ? "bg-rose-500"
                : "bg-muted-foreground/50")
            }
          />
          {STATUS_LABEL[status]}
        </span>
        {out && out.ms > 0 && (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground tabular-nums">
            {out.ms} ms
          </span>
        )}
      </div>
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder={PY_PLACEHOLDER}
        className="w-full bg-background border border-border/60 px-2 py-1 text-xs font-mono min-h-[140px] resize-y focus:outline-none focus:border-gold"
      />
      {out && (
        <div className="space-y-1">
          {out.stdout && (
            <pre className="bg-background/60 border border-border/40 px-3 py-2 text-[11px] font-mono text-foreground/85 overflow-auto max-h-48 whitespace-pre-wrap">
              {out.stdout}
            </pre>
          )}
          {out.result !== null && !out.error && (
            <pre className="bg-background/60 border-l-2 border-gold/60 border-y border-r border-border/40 px-3 py-2 text-[11px] font-mono text-gold overflow-auto max-h-48 whitespace-pre-wrap">
              {out.result}
            </pre>
          )}
          {out.error && (
            <pre className="bg-rose-950/20 border border-rose-500/40 px-3 py-2 text-[11px] font-mono text-rose-400 overflow-auto max-h-48 whitespace-pre-wrap">
              {out.error}
            </pre>
          )}
        </div>
      )}
      <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        真实 CPython (Pyodide WASM) · 滑块参数可通过 <code className="text-gold">p["名称"]</code> 读取 · import numpy/scipy/pandas 会自动安装
      </p>
    </div>
  );
};

export default PythonCell;
