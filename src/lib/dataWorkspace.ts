/**
 * Data Workspace — a cross-tool dataset store backed by IndexedDB.
 *
 * Any tool can `saveDataset()` a series it fetched (FRED, AlphaVantage, …)
 * and any other tool can `listDatasets()` / `loadDataset()` to reuse it —
 * including user-uploaded CSV files. Series survive reloads and work offline.
 */

export interface Dataset {
  id: string;
  name: string;
  source: "csv" | "fred" | "market" | "coingecko" | "worldbank" | "manual" | string;
  /** ISO dates (or plain x labels) */
  dates: string[];
  /** numeric values */
  values: number[];
  /** optional extra columns for multi-column CSVs */
  columns?: Record<string, number[]>;
  createdAt: number;
  meta?: Record<string, unknown>;
}

const DB_NAME = "eflab-data";
const STORE = "datasets";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export async function saveDataset(d: Omit<Dataset, "id" | "createdAt"> & { id?: string }): Promise<Dataset> {
  const full: Dataset = {
    ...d,
    id: d.id || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  await tx("readwrite", (s) => s.put(full));
  notifyChange();
  return full;
}

export async function listDatasets(): Promise<Dataset[]> {
  const all = await tx<Dataset[]>("readonly", (s) => s.getAll() as IDBRequest<Dataset[]>);
  return (all || []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function loadDataset(id: string): Promise<Dataset | undefined> {
  return tx<Dataset | undefined>("readonly", (s) => s.get(id) as IDBRequest<Dataset | undefined>);
}

export async function deleteDataset(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
  notifyChange();
}

/* ── change notification (for React hooks) ─────────────────── */
const listeners = new Set<() => void>();
function notifyChange() {
  listeners.forEach((fn) => fn());
}
export function onDatasetsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ── transforms ────────────────────────────────────────────── */
export type TransformId = "none" | "logReturns" | "simpleReturns" | "diff" | "zscore" | "cumsum";

export const TRANSFORMS: { id: TransformId; label: string }[] = [
  { id: "none", label: "原始序列" },
  { id: "simpleReturns", label: "简单收益率" },
  { id: "logReturns", label: "对数收益率" },
  { id: "diff", label: "一阶差分" },
  { id: "zscore", label: "标准化 (z-score)" },
  { id: "cumsum", label: "累积和" },
];

export function applyTransform(values: number[], t: TransformId): number[] {
  switch (t) {
    case "simpleReturns": {
      const out: number[] = [];
      for (let i = 1; i < values.length; i++) out.push(values[i] / values[i - 1] - 1);
      return out;
    }
    case "logReturns": {
      const out: number[] = [];
      for (let i = 1; i < values.length; i++) out.push(Math.log(values[i] / values[i - 1]));
      return out;
    }
    case "diff": {
      const out: number[] = [];
      for (let i = 1; i < values.length; i++) out.push(values[i] - values[i - 1]);
      return out;
    }
    case "zscore": {
      const m = values.reduce((s, x) => s + x, 0) / (values.length || 1);
      const sd = Math.sqrt(values.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(values.length - 1, 1));
      return values.map((x) => (sd > 0 ? (x - m) / sd : 0));
    }
    case "cumsum": {
      let acc = 0;
      return values.map((x) => (acc += x));
    }
    default:
      return values;
  }
}

/* ── CSV parsing ───────────────────────────────────────────── */
export interface ParsedCsv {
  dates: string[];
  columns: Record<string, number[]>;
}

/**
 * Parse a CSV with a header row. First column is treated as the date/x axis
 * if non-numeric; all numeric columns become series.
 */
export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("CSV 至少需要表头 + 1 行数据");

  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const header = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));

  const firstColNumeric = rows.every((r) => r[0] !== "" && !isNaN(Number(r[0])));
  const dateCol = firstColNumeric ? -1 : 0;

  const dates: string[] = rows.map((r, i) => (dateCol === 0 ? r[0] : String(i + 1)));
  const columns: Record<string, number[]> = {};

  for (let c = 0; c < header.length; c++) {
    if (c === dateCol) continue;
    const name = header[c] || `col${c}`;
    const vals: number[] = [];
    let numericCount = 0;
    for (const r of rows) {
      const v = Number(r[c]);
      if (r[c] !== "" && !isNaN(v)) {
        vals.push(v);
        numericCount++;
      } else {
        vals.push(NaN);
      }
    }
    if (numericCount >= rows.length * 0.5) columns[name] = vals;
  }

  if (!Object.keys(columns).length) throw new Error("未找到数值列");
  return { dates, columns };
}

/* ── stats helper for the workspace UI ─────────────────────── */
export function seriesStats(values: number[]) {
  const v = values.filter((x) => isFinite(x));
  const n = v.length;
  if (!n) return { n: 0, mean: NaN, std: NaN, min: NaN, max: NaN };
  const mean = v.reduce((s, x) => s + x, 0) / n;
  const std = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(n - 1, 1));
  return { n, mean, std, min: Math.min(...v), max: Math.max(...v) };
}
