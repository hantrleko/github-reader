import { useTranslation } from "react-i18next";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Bar, BarChart, ScatterChart, Scatter, Cell,
} from "recharts";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Plus, X, Loader2, Database, Cpu } from "lucide-react";
import PresetButtons, { Preset } from "../PresetButtons";
import { useFredSeries } from "@/lib/marketData";
import { toast } from "@/hooks/use-toast";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ──────────────── PRNG & basic stats ──────────────── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);

/* Approx normal CDF (Abramowitz-Stegun) for p-values */
function normCdf(x: number): number {
  const b1 =  0.319381530, b2 = -0.356563782, b3 =  1.781477937,
        b4 = -1.821255978, b5 =  1.330274429, p  =  0.2316419;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const phi = Math.exp(-0.5 * ax * ax) / Math.sqrt(2 * Math.PI);
  const y = 1 - phi * (b1*t + b2*t*t + b3*t**3 + b4*t**4 + b5*t**5);
  return 0.5 * (1 + sign * (2 * y - 1));
}
const tPvalue2Sided = (tStat: number) => 2 * (1 - normCdf(Math.abs(tStat))); // df>30 ≈ N(0,1)
/* Chi-square upper-tail p (df, x) — Wilson-Hilferty approximation */
function chi2P(x: number, df: number): number {
  if (x <= 0) return 1;
  const r = Math.cbrt(x / df);
  const z = (r - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normCdf(z);
}

/* ──────────────── Weight kernels ──────────────── */
export type Kernel = "beta" | "exp";
function betaWeights(K: number, t1: number, t2: number): number[] {
  const a = Math.max(t1, 1e-3), b = Math.max(t2, 1e-3);
  const w: number[] = [];
  let s = 0;
  for (let k = 1; k <= K; k++) {
    const x = k / (K + 1);
    const v = Math.pow(x, a - 1) * Math.pow(1 - x, b - 1);
    w.push(v); s += v;
  }
  return w.map((v) => v / Math.max(s, 1e-12));
}
function expAlmonWeights(K: number, t1: number, t2: number): number[] {
  const raw: number[] = []; let s = 0;
  for (let k = 1; k <= K; k++) {
    const v = Math.exp(t1 * k + t2 * k * k);
    raw.push(v); s += v;
  }
  return raw.map((v) => v / Math.max(s, 1e-12));
}
function weightsFor(kernel: Kernel, K: number, t1: number, t2: number): number[] {
  return kernel === "beta" ? betaWeights(K, t1, t2) : expAlmonWeights(K, t1, t2);
}

/* ──────────────── Linear algebra (small) ──────────────── */
/** Solve A x = b via Gauss-Jordan, A is n×n, returns x and inverse (for SE) */
function solveWithInverse(A: number[][], b: number[]): { x: number[]; inv: number[][] } {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, ...Array.from({length: n}, (_, j) => (i === j ? 1 : 0)), b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    if (Math.abs(M[piv][i]) < 1e-12) throw new Error("Singular matrix");
    [M[i], M[piv]] = [M[piv], M[i]];
    const f = M[i][i];
    for (let j = 0; j < 2*n + 1; j++) M[i][j] /= f;
    for (let r = 0; r < n; r++) if (r !== i) {
      const g = M[r][i];
      for (let j = 0; j < 2*n + 1; j++) M[r][j] -= g * M[i][j];
    }
  }
  const inv = M.map(row => row.slice(n, 2*n));
  const x = M.map(row => row[2*n]);
  return { x, inv };
}

/** OLS y = Xβ + ε ; X must include intercept column */
interface OLSFit {
  beta: number[]; se: number[]; tStat: number[]; pVal: number[];
  resid: number[]; yhat: number[]; r2: number; adjR2: number;
  rmse: number; n: number; k: number; sigma2: number;
}
function olsFit(X: number[][], y: number[]): OLSFit {
  const n = X.length, k = X[0].length;
  // XtX, Xty
  const XtX = Array.from({length: k}, () => Array(k).fill(0));
  const Xty = Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = a; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
  const { x: beta, inv } = solveWithInverse(XtX, Xty);
  const yhat = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
  const resid = y.map((yi, i) => yi - yhat[i]);
  const ssr = resid.reduce((s, e) => s + e * e, 0);
  const my = mean(y);
  const sst = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
  const r2 = 1 - ssr / Math.max(sst, 1e-12);
  const adjR2 = 1 - (1 - r2) * (n - 1) / Math.max(n - k, 1);
  const sigma2 = ssr / Math.max(n - k, 1);
  const se = inv.map((row, i) => Math.sqrt(Math.max(sigma2 * row[i], 0)));
  const tStat = beta.map((b, i) => b / Math.max(se[i], 1e-12));
  const pVal = tStat.map(tPvalue2Sided);
  return { beta, se, tStat, pVal, resid, yhat, r2, adjR2, rmse: Math.sqrt(ssr / n), n, k, sigma2 };
}

/* ──────────────── Diagnostics ──────────────── */
/** Breusch-Pagan: regress e² on X (excluding intercept), test n·R² ~ χ²(p) */
function breuschPagan(resid: number[], X: number[][]): { stat: number; df: number; p: number } {
  const e2 = resid.map(r => r * r);
  // re-fit OLS of e² on X
  const fit = olsFit(X, e2);
  const stat = resid.length * fit.r2;
  const df = X[0].length - 1;
  return { stat, df, p: chi2P(stat, df) };
}
/** Ljung-Box Q on residuals at h lags */
function ljungBox(resid: number[], h = 8): { Q: number; df: number; p: number; acf: number[] } {
  const n = resid.length;
  const m = mean(resid);
  const denom = resid.reduce((s, r) => s + (r - m) ** 2, 0);
  const acf: number[] = [];
  let Q = 0;
  for (let k = 1; k <= h; k++) {
    let num = 0;
    for (let i = k; i < n; i++) num += (resid[i] - m) * (resid[i - k] - m);
    const r = num / Math.max(denom, 1e-12);
    acf.push(r);
    Q += (r * r) / (n - k);
  }
  Q *= n * (n + 2);
  return { Q, df: h, p: chi2P(Q, h), acf };
}
/** Jarque-Bera normality test */
function jarqueBera(resid: number[]): { JB: number; p: number; skew: number; kurt: number } {
  const n = resid.length, m = mean(resid);
  let s2 = 0, s3 = 0, s4 = 0;
  for (const r of resid) { const d = r - m; s2 += d*d; s3 += d*d*d; s4 += d*d*d*d; }
  const sigma = Math.sqrt(s2 / n);
  const skew = (s3 / n) / (sigma ** 3 || 1e-12);
  const kurt = (s4 / n) / (sigma ** 4 || 1e-12);
  const JB = (n / 6) * (skew * skew + ((kurt - 3) ** 2) / 4);
  return { JB, p: chi2P(JB, 2), skew, kurt };
}

/* ──────────────── Variable spec ──────────────── */
export interface VarSpec {
  id: string;
  name: string;       // human label
  series: string;     // FRED series id (when real-data)
  kernel: Kernel;
  K: number;
  theta1: number;
  theta2: number;
}

/* ──────────────── MIDAS regressor builder ────────────────
   For each variable, build aggregated regressor x_t = Σ w_k(θ) · x_high(t-k+1)
   then full design matrix X = [1, agg_1, agg_2, ...]
*/
function buildAggregator(specs: VarSpec[], xHighByVar: number[][], nLow: number): number[][] {
  // returns matrix nLow × (1 + V) with intercept
  const V = specs.length;
  const X: number[][] = Array.from({ length: nLow }, () => [1, ...Array(V).fill(0)]);
  for (let v = 0; v < V; v++) {
    const sp = specs[v];
    const w = weightsFor(sp.kernel, sp.K, sp.theta1, sp.theta2);
    const xh = xHighByVar[v];
    for (let p = 0; p < nLow; p++) {
      let agg = 0;
      for (let k = 1; k <= sp.K; k++) {
        const idx = (p + 1) * sp.K - k;
        if (idx >= 0 && idx < xh.length) agg += w[k - 1] * xh[idx];
      }
      X[p][v + 1] = agg;
    }
  }
  return X;
}

/** SSR for current θ vector (used by Nelder-Mead) */
function midasSSR(thetaFlat: number[], specs: VarSpec[], xHighByVar: number[][], y: number[]): number {
  const V = specs.length;
  const updated = specs.map((sp, i) => ({ ...sp, theta1: thetaFlat[2*i], theta2: thetaFlat[2*i + 1] }));
  let X: number[][];
  try { X = buildAggregator(updated, xHighByVar, y.length); } catch { return 1e18; }
  let fit: OLSFit;
  try { fit = olsFit(X, y); } catch { return 1e18; }
  return fit.resid.reduce((s, e) => s + e * e, 0);
}

/* ──────────────── Nelder-Mead ──────────────── */
interface NMTrace { iter: number; ssr: number; theta: number[] }
function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  opts: { maxIter?: number; tol?: number; bounds?: [number, number][]; onStep?: (t: NMTrace) => void } = {}
): { x: number[]; fx: number; iters: number; trace: NMTrace[] } {
  const { maxIter = 200, tol = 1e-6, bounds, onStep } = opts;
  const n = x0.length;
  const clamp = (x: number[]) => bounds ? x.map((v, i) => Math.min(Math.max(v, bounds[i][0]), bounds[i][1])) : x;
  // Initial simplex
  const simplex: { x: number[]; fx: number }[] = [];
  simplex.push({ x: clamp([...x0]), fx: f(clamp([...x0])) });
  for (let i = 0; i < n; i++) {
    const xi = [...x0];
    xi[i] = xi[i] === 0 ? 0.05 : xi[i] * 1.05;
    const xc = clamp(xi);
    simplex.push({ x: xc, fx: f(xc) });
  }
  const trace: NMTrace[] = [];
  let iter = 0;
  while (iter < maxIter) {
    simplex.sort((a, b) => a.fx - b.fx);
    trace.push({ iter, ssr: simplex[0].fx, theta: [...simplex[0].x] });
    onStep?.(trace[trace.length - 1]);
    // Convergence: spread of fx
    const spread = simplex[simplex.length - 1].fx - simplex[0].fx;
    if (spread < tol) break;
    // Centroid (excluding worst)
    const centroid = Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i].x[j];
    for (let j = 0; j < n; j++) centroid[j] /= n;
    const worst = simplex[n];
    // Reflection
    const xr = clamp(centroid.map((c, j) => c + (c - worst.x[j])));
    const fr = f(xr);
    if (fr < simplex[0].fx) {
      // Expansion
      const xe = clamp(centroid.map((c, j) => c + 2 * (c - worst.x[j])));
      const fe = f(xe);
      simplex[n] = fe < fr ? { x: xe, fx: fe } : { x: xr, fx: fr };
    } else if (fr < simplex[n - 1].fx) {
      simplex[n] = { x: xr, fx: fr };
    } else {
      // Contraction
      const xc = clamp(centroid.map((c, j) => c + 0.5 * (worst.x[j] - c)));
      const fc = f(xc);
      if (fc < worst.fx) simplex[n] = { x: xc, fx: fc };
      else {
        // Shrink toward best
        const best = simplex[0].x;
        for (let i = 1; i <= n; i++) {
          const xi = clamp(simplex[i].x.map((v, j) => best[j] + 0.5 * (v - best[j])));
          simplex[i] = { x: xi, fx: f(xi) };
        }
      }
    }
    iter++;
  }
  simplex.sort((a, b) => a.fx - b.fx);
  trace.push({ iter, ssr: simplex[0].fx, theta: [...simplex[0].x] });
  return { x: simplex[0].x, fx: simplex[0].fx, iters: iter, trace };
}

/* ──────────────── FRED helpers ──────────────── */
/** Aggregate monthly values to quarterly mean; return aligned arrays */
function monthlyToQuarterlyMean(dates: string[], values: number[]): { q: string[]; v: number[] } {
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const yr = d.slice(0, 4);
    const m = parseInt(d.slice(5, 7), 10);
    const q = Math.ceil(m / 3);
    const key = `${yr}-Q${q}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(values[i]);
  }
  const sorted = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  return { q: sorted.map(([k]) => k), v: sorted.map(([, arr]) => mean(arr)) };
}
/** Convert quarterly series of *levels* to QoQ % change */
function pctChange(values: number[]): number[] {
  const out: number[] = [NaN];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    out.push(prev === 0 ? 0 : (values[i] / prev - 1) * 100);
  }
  return out;
}
/** Same for monthly */
const monthlyPctChange = pctChange;

/* ──────────────── Synthetic offline panel ──────────────── */
function buildOfflinePanel(seed = 7) {
  const rng = mulberry32(seed);
  const nQ = 90; // quarters
  const K = 3;   // months per quarter
  const months = nQ * K;
  // Three monthly indicators with different DGPs
  const indpro: number[] = [], payems: number[] = [], cpi: number[] = [];
  let p = 100, e = 130, c = 200;
  for (let m = 0; m < months; m++) {
    p *= 1 + (0.002 + 0.01 * Math.sin(m / 18) + 0.005 * randn(rng));
    e *= 1 + (0.0015 + 0.005 * Math.sin(m / 24 + 1) + 0.003 * randn(rng));
    c *= 1 + (0.002 + 0.001 * randn(rng));
    indpro.push(p); payems.push(e); cpi.push(c);
  }
  const indproPct = monthlyPctChange(indpro);
  const payemsPct = monthlyPctChange(payems);
  const cpiPct = monthlyPctChange(cpi);
  // True DGP: quarterly y depends on weighted month-1 (most recent) heavily for INDPRO and PAYEMS
  const wTrueIndpro = betaWeights(K, 1, 4);
  const wTruePayems = betaWeights(K, 1, 2);
  const wTrueCpi = betaWeights(K, 2, 2);
  const y: number[] = [];
  for (let q = 0; q < nQ; q++) {
    let ai = 0, ae = 0, ac = 0;
    for (let k = 1; k <= K; k++) {
      const idx = (q + 1) * K - k;
      ai += wTrueIndpro[k - 1] * (isFinite(indproPct[idx]) ? indproPct[idx] : 0);
      ae += wTruePayems[k - 1] * (isFinite(payemsPct[idx]) ? payemsPct[idx] : 0);
      ac += wTrueCpi[k - 1] * (isFinite(cpiPct[idx]) ? cpiPct[idx] : 0);
    }
    y.push(0.4 + 0.55 * ai + 0.45 * ae - 0.15 * ac + 0.25 * randn(rng));
  }
  const qLabels = Array.from({ length: nQ }, (_, i) => {
    const yr = 2002 + Math.floor(i / 4);
    const q = (i % 4) + 1;
    return `${yr}-Q${q}`;
  });
  return {
    qLabels, y,
    high: {
      INDPRO: indproPct.map(v => isFinite(v) ? v : 0),
      PAYEMS: payemsPct.map(v => isFinite(v) ? v : 0),
      CPIAUCSL: cpiPct.map(v => isFinite(v) ? v : 0),
      UNRATE: indproPct.map((_, i) => 5 + Math.sin(i / 30) + 0.4 * randn(rng)),
      UMCSENT: payemsPct.map((_, i) => 85 + 10 * Math.sin(i / 36) + 3 * randn(rng)),
    } as Record<string, number[]>,
  };
}

/* ──────────────── UI building blocks ──────────────── */
const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";
const MiniSlider = ({ label, value, min, max, step, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-1">
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <span className="text-[10px] font-mono text-gold tabular-nums">
        {fmt ? fmt(value) : value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
  </div>
);

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-card border border-border px-3 py-2 shadow-lg">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(4) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ──────────────── FRED hook orchestrator ────────────────
   Hooks call rules: we conditionally fetch up to 5 series via fixed-position hooks.
*/
const TARGET_SERIES = "GDPC1"; // Real GDP, quarterly

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export const MIDASTool = () => {
  const { t } = useTranslation();
const FRED_CATALOG: { id: string; label: string; transform: "pct" | "level" }[] = [
  { id: "INDPRO",   label: t("labs.midas.text001", { defaultValue: "工业生产指数 (M)" }),      transform: "pct" },
  { id: "PAYEMS",   label: t("labs.midas.text002", { defaultValue: "非农就业 (M)" }),          transform: "pct" },
  { id: "CPIAUCSL", label: t("labs.midas.text003", { defaultValue: "CPI 全项 (M)" }),          transform: "pct" },
  { id: "UNRATE",   label: t("labs.midas.text004", { defaultValue: "失业率 (M)" }),            transform: "level" },
  { id: "UMCSENT",  label: t("labs.midas.text005", { defaultValue: "密歇根消费者信心 (M)" }),  transform: "level" },
];
  // ── Data source toggle ─────────────────────────
  const [source, setSource] = useState<"offline" | "fred">("offline");
  const [startDate, setStartDate] = useState("2002-01-01");

  // ── Fetch FRED series (conditionally enabled) ──
  const fredEnabled = source === "fred";
  const sIndpro   = useFredSeries("INDPRO",   startDate, fredEnabled);
  const sPayems   = useFredSeries("PAYEMS",   startDate, fredEnabled);
  const sCpi      = useFredSeries("CPIAUCSL", startDate, fredEnabled);
  const sUnrate   = useFredSeries("UNRATE",   startDate, fredEnabled);
  const sUmcsent  = useFredSeries("UMCSENT",  startDate, fredEnabled);
  const sGdp      = useFredSeries("GDPC1",    startDate, fredEnabled);

  const fredQueries = [sIndpro, sPayems, sCpi, sUnrate, sUmcsent, sGdp];
  const fredLoading = fredEnabled && fredQueries.some(q => q.isLoading);
  const fredError = fredEnabled && fredQueries.some(q => q.isError);

  // ── Variable specs (multi-variable cards) ──────
  const [specs, setSpecs] = useState<VarSpec[]>([
    { id: "v1", name: t("labs.midas.text006", { defaultValue: "INDPRO 工业生产" }), series: "INDPRO",   kernel: "beta", K: 3, theta1: 1, theta2: 4 },
    { id: "v2", name: t("labs.midas.text007", { defaultValue: "PAYEMS 非农就业" }), series: "PAYEMS",   kernel: "beta", K: 3, theta1: 1, theta2: 2 },
  ]);
  const [seed, setSeed] = useState(7);

  // ── Optimisation state ─────────────────────────
  const [optimising, setOptimising] = useState(false);
  const [optTrace, setOptTrace] = useState<NMTrace[]>([]);
  const [optResult, setOptResult] = useState<{ thetas: number[]; ssr: number; iters: number } | null>(null);

  // ── Build aligned data panel (high-freq + low-freq) ─
  const panel = useMemo(() => {
    if (source === "offline") {
      const off = buildOfflinePanel(seed);
      return { qLabels: off.qLabels, y: off.y, high: off.high };
    }
    // FRED mode
    if (fredLoading || fredError || !sGdp.data) return null;
    const gdpQ = monthlyToQuarterlyMean(sGdp.data.dates, sGdp.data.values); // GDPC1 is already quarterly; bucketing harmless
    const yPct = pctChange(gdpQ.v).slice(1); // drop first NaN
    const qLabelsFull = gdpQ.q.slice(1);
    const high: Record<string, number[]> = {};
    const map: Record<string, any> = {
      INDPRO: sIndpro, PAYEMS: sPayems, CPIAUCSL: sCpi, UNRATE: sUnrate, UMCSENT: sUmcsent,
    };
    for (const [k, q] of Object.entries(map)) {
      if (!q.data) { high[k] = []; continue; }
      const cfg = FRED_CATALOG.find(c => c.id === k)!;
      const raw = q.data.values as number[];
      high[k] = cfg.transform === "pct" ? monthlyPctChange(raw).map(v => isFinite(v) ? v : 0) : raw;
    }
    return { qLabels: qLabelsFull, y: yPct, high };
  }, [source, seed, sIndpro.data, sPayems.data, sCpi.data, sUnrate.data, sUmcsent.data, sGdp.data, fredLoading, fredError]);

  // ── Run regression with current θ ──────────────
  const fit = useMemo(() => {
    if (!panel) return null;
    const xHigh = specs.map(sp => panel.high[sp.series] || []);
    // Determine usable nLow: each var needs ≥ K*nLow high-freq obs
    const maxNLow = Math.min(panel.y.length, ...specs.map((sp, i) => Math.floor(xHigh[i].length / sp.K)));
    const nLow = Math.max(maxNLow, 4);
    const yUsed = panel.y.slice(panel.y.length - nLow);
    const labelsUsed = panel.qLabels.slice(panel.qLabels.length - nLow);
    const xHighTrim = specs.map((sp, i) => xHigh[i].slice(xHigh[i].length - nLow * sp.K));
    let X: number[][];
    try { X = buildAggregator(specs, xHighTrim, nLow); } catch { return null; }
    let ols: OLSFit;
    try { ols = olsFit(X, yUsed); } catch { return null; }
    // Diagnostics
    const Xnoint = X.map(r => r.slice(1));
    const bp = Xnoint[0].length > 0 ? breuschPagan(ols.resid, X) : { stat: 0, df: 0, p: 1 };
    const lb = ljungBox(ols.resid, Math.min(8, Math.max(2, Math.floor(nLow / 5))));
    const jb = jarqueBera(ols.resid);
    return { ols, bp, lb, jb, nLow, yUsed, labelsUsed, xHighTrim };
  }, [panel, specs]);

  /* ── Optimise θ via Nelder-Mead ── */
  const runOptimisation = useCallback(() => {
    if (!panel || !fit) return;
    setOptimising(true);
    setOptTrace([]);
    setOptResult(null);
    const x0: number[] = specs.flatMap(sp => [sp.theta1, sp.theta2]);
    // bounds depend on kernel
    const bounds: [number, number][] = specs.flatMap(sp =>
      sp.kernel === "beta"
        ? [[0.1, 8] as [number, number], [0.1, 12] as [number, number]]
        : [[-0.5, 0.5] as [number, number], [-0.05, 0.05] as [number, number]]
    );
    // Run synchronously then push trace (NM is fast at this size)
    const f = (theta: number[]) => midasSSR(theta, specs, fit.xHighTrim, fit.yUsed);
    setTimeout(() => {
      const result = nelderMead(f, x0, { maxIter: 250, tol: 1e-8, bounds });
      // Sample the trace down to ≤ 60 points for chart
      const step = Math.max(1, Math.floor(result.trace.length / 60));
      setOptTrace(result.trace.filter((_, i) => i % step === 0 || i === result.trace.length - 1));
      setOptResult({ thetas: result.x, ssr: result.fx, iters: result.iters });
      // Apply optimised θ back to specs
      setSpecs(prev => prev.map((sp, i) => ({
        ...sp, theta1: result.x[2*i], theta2: result.x[2*i + 1],
      })));
      setOptimising(false);
      toast({ title: t("labs.midas.text008", { defaultValue: "优化完成" }), description: t("labs.midas.text009", { defaultValue: "Nelder-Mead {{var0}} 步 · 最终 SSR={{var1}}", var0: result.iters, var1: result.fx.toFixed(4) }) });
    }, 30);
  }, [panel, fit, specs]);

  /* ── Variable card management ── */
  const addVar = () => {
    if (specs.length >= 4) { toast({ title: t("labs.midas.text010", { defaultValue: "最多 4 个解释变量" }) }); return; }
    const used = new Set(specs.map(s => s.series));
    const nextSeries = FRED_CATALOG.find(c => !used.has(c.id))?.id || "UNRATE";
    const cfg = FRED_CATALOG.find(c => c.id === nextSeries)!;
    setSpecs([...specs, {
      id: `v${Date.now()}`, name: cfg.label, series: nextSeries,
      kernel: "beta", K: 3, theta1: 1, theta2: 3,
    }]);
  };
  const removeVar = (id: string) => {
    if (specs.length <= 1) { toast({ title: t("labs.midas.text011", { defaultValue: "至少保留 1 个变量" }) }); return; }
    setSpecs(specs.filter(s => s.id !== id));
  };
  const updateVar = (id: string, patch: Partial<VarSpec>) => {
    setSpecs(specs.map(s => s.id === id ? { ...s, ...patch, name: patch.series ? (FRED_CATALOG.find(c => c.id === patch.series)?.label ?? s.name) : s.name } : s));
  };

  const presets: Preset[] = [
    { name: t("labs.midas.text012", { defaultValue: "工业 + 就业" }), description: t("labs.midas.text013", { defaultValue: "INDPRO & PAYEMS 双指标 (Beta, K=3)" }), apply: () => {
      setSpecs([
        { id: "v1", name: t("labs.midas.text006", { defaultValue: "INDPRO 工业生产" }), series: "INDPRO", kernel: "beta", K: 3, theta1: 1, theta2: 4 },
        { id: "v2", name: t("labs.midas.text007", { defaultValue: "PAYEMS 非农就业" }), series: "PAYEMS", kernel: "beta", K: 3, theta1: 1, theta2: 2 },
      ]);
    }},
    { name: t("labs.midas.text016", { defaultValue: "三因子组合" }), description: t("labs.midas.text017", { defaultValue: "+CPI 通胀指标" }), apply: () => {
      setSpecs([
        { id: "v1", name: t("labs.midas.text006", { defaultValue: "INDPRO 工业生产" }), series: "INDPRO",   kernel: "beta", K: 3, theta1: 1, theta2: 4 },
        { id: "v2", name: t("labs.midas.text007", { defaultValue: "PAYEMS 非农就业" }), series: "PAYEMS",   kernel: "beta", K: 3, theta1: 1, theta2: 2 },
        { id: "v3", name: t("labs.midas.text020", { defaultValue: "CPI 通胀" }),        series: "CPIAUCSL", kernel: "beta", K: 3, theta1: 2, theta2: 2 },
      ]);
    }},
    { name: t("labs.midas.text021", { defaultValue: "Exp-Almon 单因子" }), description: t("labs.midas.text022", { defaultValue: "INDPRO 指数加权 K=6" }), apply: () => {
      setSpecs([
        { id: "v1", name: t("labs.midas.text006", { defaultValue: "INDPRO 工业生产" }), series: "INDPRO", kernel: "exp", K: 6, theta1: -0.05, theta2: -0.001 },
      ]);
    }},
    { name: t("labs.midas.text024", { defaultValue: "宽窗口" }), description: t("labs.midas.text025", { defaultValue: "K=6 月度滞后, INDPRO+PAYEMS" }), apply: () => {
      setSpecs([
        { id: "v1", name: t("labs.midas.text006", { defaultValue: "INDPRO 工业生产" }), series: "INDPRO", kernel: "beta", K: 6, theta1: 1, theta2: 5 },
        { id: "v2", name: t("labs.midas.text007", { defaultValue: "PAYEMS 非农就业" }), series: "PAYEMS", kernel: "beta", K: 6, theta1: 1, theta2: 3 },
      ]);
    }},
  ];

  // ── Charts: weight curves, fit, residuals, ACF ──
  const weightCharts = useMemo(() => specs.map(sp => {
    const w = weightsFor(sp.kernel, sp.K, sp.theta1, sp.theta2);
    return { spec: sp, data: w.map((wk, i) => ({ lag: i + 1, w: +wk.toFixed(5) })) };
  }), [specs]);

  const fitChart = useMemo(() => {
    if (!fit) return [];
    return fit.yUsed.map((y, i) => ({
      t: fit.labelsUsed[i],
      y: +y.toFixed(4),
      yhat: +fit.ols.yhat[i].toFixed(4),
      resid: +fit.ols.resid[i].toFixed(4),
    }));
  }, [fit]);

  const acfChart = useMemo(() => fit ? fit.lb.acf.map((r, i) => ({
    lag: i + 1, acf: +r.toFixed(4),
  })) : [], [fit]);

  const acfBand = fit ? 1.96 / Math.sqrt(fit.nLow) : 0;
  const residVsFitted = useMemo(() => fit ? fit.ols.resid.map((r, i) => ({
    yhat: fit.ols.yhat[i], resid: r,
  })) : [], [fit]);

  // ── Render ────────────────────────────────────
  return (
    <>
      {/* Header info */}
      <div className="rounded-lg bg-secondary/30 border border-gold/15 px-4 py-3 mb-6 text-xs">
        <div className="flex flex-wrap gap-x-6 gap-y-2 items-baseline">
          <span className="font-mono text-gold uppercase tracking-wider text-[10px]">
            {t("labs.midas.text028", { defaultValue: "MIDAS · 多变量 ·" })}{source === "offline" ? t("labs.midas.text029", { defaultValue: "离线样本" }) : t("labs.midas.text030", { defaultValue: "FRED 实时" })}
          </span>
          <div className="text-muted-foreground leading-relaxed flex-1 min-w-[280px]">
            <InlineMath math={String.raw`y_t = \alpha + \sum_{v=1}^{V}\beta_v \!\sum_{k=1}^{K_v}\! w_k(\theta_v)\,x^{(v,H)}_{t-k/K_v} + \varepsilon_t`} />
            <span className="text-foreground/70 ml-2">{t("labs.midas.text031", { defaultValue: "月度 → 季度 GDP QoQ% 预测" })}</span>
          </div>
        </div>
      </div>

      {/* Data source toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{t("labs.midas.text032", { defaultValue: "数据源" })}</span>
        {(["offline", "fred"] as const).map(s => (
          <button key={s} onClick={() => setSource(s)}
            className={`text-xs px-3 py-1.5 rounded-md font-mono inline-flex items-center gap-1.5 transition ${
              source === s ? "bg-gold/15 text-gold border border-gold/40" : "bg-secondary text-muted-foreground border border-border hover:text-foreground"
            }`}>
            {s === "offline" ? <Cpu className="w-3 h-3" /> : <Database className="w-3 h-3" />}
            {s === "offline" ? t("labs.midas.text033", { defaultValue: "合成离线" }) : t("labs.midas.text030", { defaultValue: "FRED 实时" })}
          </button>
        ))}
        {source === "fred" && (
          <>
            <label className="text-[10px] font-mono text-muted-foreground ml-2">{t("labs.midas.text035", { defaultValue: "起始" })}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="text-xs font-mono bg-secondary text-foreground border border-border rounded px-2 py-1" />
            {fredLoading && <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {t("labs.midas.text036", { defaultValue: "加载 FRED…" })}</span>}
            {fredError && <span className="text-[11px] text-red-400">{t("labs.midas.text037", { defaultValue: "FRED 加载失败 · 请确认 FRED_API_KEY 已配置" })}</span>}
          </>
        )}
        {source === "offline" && (
          <>
            <label className="text-[10px] font-mono text-muted-foreground ml-2">{t("labs.midas.text038", { defaultValue: "种子" })}</label>
            <input type="number" min={1} max={9999} value={seed} onChange={e => setSeed(parseInt(e.target.value) || 7)}
              className="w-20 text-xs font-mono bg-secondary text-foreground border border-border rounded px-2 py-1" />
          </>
        )}
      </div>

      <PresetButtons presets={presets} />

      {/* Variable cards */}
      <div className="mt-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{t("labs.midas.text039", { defaultValue: "解释变量 (" })}{specs.length}/4)</p>
          <button onClick={addVar} disabled={specs.length >= 4}
            className="text-[11px] font-mono inline-flex items-center gap-1 px-2 py-1 rounded border border-gold/40 text-gold hover:bg-gold/10 disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus className="w-3 h-3" /> {t("labs.midas.text040", { defaultValue: "新增变量" })}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {specs.map((sp) => (
            <div key={sp.id} className="rounded-lg border border-border bg-card/60 p-3 relative">
              <button onClick={() => removeVar(sp.id)} title={t("labs.midas.text041", { defaultValue: "移除" })}
                className="absolute top-2 right-2 text-muted-foreground hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground">{t("labs.midas.text042", { defaultValue: "FRED 序列" })}</label>
                  <select value={sp.series} onChange={e => updateVar(sp.id, { series: e.target.value })}
                    className="w-full text-xs font-mono bg-secondary text-foreground border border-border rounded px-2 py-1 mt-1">
                    {FRED_CATALOG.map(c => <option key={c.id} value={c.id}>{c.id} · {c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground">{t("labs.midas.text043", { defaultValue: "权重核" })}</label>
                  <div className="flex gap-1 mt-1">
                    {(["beta", "exp"] as const).map(k => (
                      <button key={k} onClick={() => updateVar(sp.id, { kernel: k })}
                        className={`flex-1 text-[10px] font-mono px-2 py-1 rounded ${
                          sp.kernel === k ? "bg-gold/15 text-gold border border-gold/40" : "bg-secondary text-muted-foreground border border-border"
                        }`}>{k === "beta" ? "Beta" : "Exp-Almon"}</button>
                    ))}
                  </div>
                </div>
                <MiniSlider label={t("labs.midas.text044", { defaultValue: "K (滞后数)" })} value={sp.K} min={2} max={12} step={1} onChange={(v) => updateVar(sp.id, { K: v })} />
                <MiniSlider
                  label={sp.kernel === "beta" ? "θ₁ shape₁" : "θ₁ linear"}
                  value={sp.theta1}
                  min={sp.kernel === "beta" ? 0.1 : -0.5}
                  max={sp.kernel === "beta" ? 8 : 0.5}
                  step={sp.kernel === "beta" ? 0.1 : 0.01}
                  onChange={(v) => updateVar(sp.id, { theta1: v })}
                />
                <MiniSlider
                  label={sp.kernel === "beta" ? "θ₂ shape₂" : "θ₂ quad"}
                  value={sp.theta2}
                  min={sp.kernel === "beta" ? 0.1 : -0.05}
                  max={sp.kernel === "beta" ? 12 : 0.05}
                  step={sp.kernel === "beta" ? 0.1 : 0.001}
                  onChange={(v) => updateVar(sp.id, { theta2: v })}
                />
              </div>
              {/* mini weight curve */}
              <div className="h-[70px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weightCharts.find(w => w.spec.id === sp.id)?.data || []}>
                    <XAxis dataKey="lag" hide />
                    <YAxis hide />
                    <Bar dataKey="w" fill={CHART_GOLD} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimisation panel */}
      <div className="rounded-lg border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground">{t("labs.midas.text045", { defaultValue: "Nelder-Mead 数值优化" })}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {t("labs.midas.text046", { defaultValue: "对所有变量的 (θ₁, θ₂) 联合最小化 SSR = Σ(yₜ − ŷₜ)²; β 与 α 在每步 OLS 闭式求解。" })}</p>
          </div>
          <button onClick={runOptimisation} disabled={optimising || !fit}
            className="text-xs font-mono px-4 py-2 rounded-md bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 disabled:opacity-40 inline-flex items-center gap-2">
            {optimising ? <><Loader2 className="w-3 h-3 animate-spin" /> {t("labs.midas.text047", { defaultValue: "优化中…" })}</> : t("labs.midas.text048", { defaultValue: "▶ 运行优化" })}
          </button>
        </div>
        {optResult && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <div className="rounded bg-card/60 border border-border p-2">
                <p className="text-[10px] text-muted-foreground">{t("labs.midas.text049", { defaultValue: "迭代步数" })}</p>
                <p className="text-sm font-mono text-gold">{optResult.iters}</p>
              </div>
              <div className="rounded bg-card/60 border border-border p-2">
                <p className="text-[10px] text-muted-foreground">{t("labs.midas.text050", { defaultValue: "最终 SSR" })}</p>
                <p className="text-sm font-mono text-gold">{optResult.ssr.toFixed(4)}</p>
              </div>
              <div className="rounded bg-card/60 border border-border p-2">
                <p className="text-[10px] text-muted-foreground">{t("labs.midas.text051", { defaultValue: "起始 SSR" })}</p>
                <p className="text-sm font-mono text-foreground">{optTrace[0]?.ssr.toFixed(4) ?? "—"}</p>
              </div>
              <div className="rounded bg-card/60 border border-border p-2">
                <p className="text-[10px] text-muted-foreground">{t("labs.midas.text052", { defaultValue: "改进" })}</p>
                <p className="text-sm font-mono text-foreground">
                  {optTrace[0] ? `${(100 * (1 - optResult.ssr / optTrace[0].ssr)).toFixed(2)}%` : "—"}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{t("labs.midas.text053", { defaultValue: "SSR 收敛轨迹 (log scale)" })}</p>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={optTrace}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="iter" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                    <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} scale="log" domain={["auto", "auto"]} />
                    <Tooltip content={<Tip />} />
                    <Line type="monotone" dataKey="ssr" stroke={CHART_GOLD} strokeWidth={1.5} dot={false} name="SSR" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
              {t("labs.midas.text054", { defaultValue: "最优 θ:" })}{" "}
              {specs.map((sp, i) => (
                <span key={sp.id} className="mr-3">
                  <span className="text-gold">{sp.series}</span> ({sp.kernel})
                  → θ₁={optResult.thetas[2*i].toFixed(3)}, θ₂={optResult.thetas[2*i + 1].toFixed(3)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Regression results table — t-tests */}
      {fit && (
        <div className="rounded-lg border border-border bg-card p-4 mb-6">
          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-3">{t("labs.midas.text055", { defaultValue: "回归显著性 · t-检验" })}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 px-2">{t("labs.midas.text056", { defaultValue: "变量" })}</th>
                  <th className="text-right py-1.5 px-2">{t("labs.midas.text057", { defaultValue: "系数 β̂" })}</th>
                  <th className="text-right py-1.5 px-2">SE</th>
                  <th className="text-right py-1.5 px-2">t</th>
                  <th className="text-right py-1.5 px-2">p-value</th>
                  <th className="text-center py-1.5 px-2">{t("labs.midas.text058", { defaultValue: "显著性" })}</th>
                </tr>
              </thead>
              <tbody>
                {[t("labs.midas.text059", { defaultValue: "α (截距)" }), ...specs.map(s => `${s.series} (β·MIDAS)`)].map((label, i) => {
                  const p = fit.ols.pVal[i];
                  const stars = p < 0.01 ? "***" : p < 0.05 ? "**" : p < 0.1 ? "*" : "";
                  return (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-1.5 px-2 text-foreground">{label}</td>
                      <td className="text-right py-1.5 px-2 text-gold tabular-nums">{fit.ols.beta[i].toFixed(4)}</td>
                      <td className="text-right py-1.5 px-2 text-muted-foreground tabular-nums">{fit.ols.se[i].toFixed(4)}</td>
                      <td className="text-right py-1.5 px-2 text-foreground tabular-nums">{fit.ols.tStat[i].toFixed(2)}</td>
                      <td className="text-right py-1.5 px-2 text-foreground tabular-nums">{p.toFixed(4)}</td>
                      <td className="text-center py-1.5 px-2 text-gold">{stars || <span className="text-muted-foreground/50">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {t("labs.midas.text060", { defaultValue: "*** p<0.01, ** p<0.05, * p<0.1 · t-分布大样本近似 N(0,1) · n=" })}{fit.nLow}, k={fit.ols.k}, R²={fit.ols.r2.toFixed(4)}{t("labs.midas.text061", { defaultValue: ", 调整 R²=" })}{fit.ols.adjR2.toFixed(4)}, RMSE={fit.ols.rmse.toFixed(4)}
          </p>
        </div>
      )}

      {/* Diagnostic tests */}
      {fit && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">{t("labs.midas.text062", { defaultValue: "Breusch-Pagan (异方差)" })}</p>
            <p className="text-lg font-mono text-foreground mt-1">χ² = {fit.bp.stat.toFixed(3)}</p>
            <p className={`text-xs font-mono mt-1 ${fit.bp.p < 0.05 ? "text-red-400" : "text-emerald-400"}`}>
              p = {fit.bp.p.toFixed(4)} · {fit.bp.p < 0.05 ? t("labs.midas.text063", { defaultValue: "拒绝同方差 ⚠" }) : t("labs.midas.text064", { defaultValue: "未拒绝同方差 ✓" })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">df = {fit.bp.df}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">{t("labs.midas.text065", { defaultValue: "Ljung-Box (自相关)" })}</p>
            <p className="text-lg font-mono text-foreground mt-1">Q = {fit.lb.Q.toFixed(3)}</p>
            <p className={`text-xs font-mono mt-1 ${fit.lb.p < 0.05 ? "text-red-400" : "text-emerald-400"}`}>
              p = {fit.lb.p.toFixed(4)} · {fit.lb.p < 0.05 ? t("labs.midas.text066", { defaultValue: "残差自相关 ⚠" }) : t("labs.midas.text067", { defaultValue: "白噪声 ✓" })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">h = {fit.lb.df} {t("labs.midas.text068", { defaultValue: "阶" })}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">{t("labs.midas.text069", { defaultValue: "Jarque-Bera (正态)" })}</p>
            <p className="text-lg font-mono text-foreground mt-1">JB = {fit.jb.JB.toFixed(3)}</p>
            <p className={`text-xs font-mono mt-1 ${fit.jb.p < 0.05 ? "text-red-400" : "text-emerald-400"}`}>
              p = {fit.jb.p.toFixed(4)} · {fit.jb.p < 0.05 ? t("labs.midas.text070", { defaultValue: "非正态 ⚠" }) : t("labs.midas.text071", { defaultValue: "正态 ✓" })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{t("labs.midas.text072", { defaultValue: "偏度=" })}{fit.jb.skew.toFixed(2)}{t("labs.midas.text073", { defaultValue: ", 峰度=" })}{fit.jb.kurt.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Fit chart */}
      {fit && (
        <div className="rounded-lg border border-border bg-card p-4 mb-4">
          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">{t("labs.midas.text074", { defaultValue: "实际 vs 拟合 — 季度 GDP QoQ% (n =" })}{fit.nLow})</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fitChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(fit.nLow / 12) - 1)} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="y" stroke={CHART_BLUE} strokeWidth={1.4} dot={{ r: 1.5 }} name={t("labs.midas.text075", { defaultValue: "实际 yₜ" })} />
                <Line type="monotone" dataKey="yhat" stroke={CHART_GOLD} strokeWidth={1.6} dot={false} name={t("labs.midas.text076", { defaultValue: "MIDAS 拟合 ŷₜ" })} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Residual diagnostics: 3 charts in a row */}
      {fit && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Residuals over time */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">{t("labs.midas.text077", { defaultValue: "残差时间序列 eₜ" })}</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fitChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="t" hide />
                  <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={0} stroke={CHART_TEXT} />
                  <Line type="monotone" dataKey="resid" stroke={CHART_RED} strokeWidth={1.2} dot={{ r: 1.2 }} name="eₜ" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Resid vs Fitted */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">{t("labs.midas.text078", { defaultValue: "残差 vs 拟合值" })}</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis type="number" dataKey="yhat" stroke={CHART_TEXT} tick={{ fontSize: 9 }} name="ŷ" />
                  <YAxis type="number" dataKey="resid" stroke={CHART_TEXT} tick={{ fontSize: 9 }} name="e" />
                  <ReferenceLine y={0} stroke={CHART_TEXT} />
                  <Tooltip content={<Tip />} />
                  <Scatter data={residVsFitted} fill={CHART_TEAL} fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 text-center">{t("labs.midas.text079", { defaultValue: "理想:云团均匀, 无漏斗形 (异方差信号)" })}</p>
          </div>
          {/* ACF */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">{t("labs.midas.text080", { defaultValue: "残差 ACF (95% 带 ±1.96/√n)" })}</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acfChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="lag" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
                  <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9 }} domain={[-0.5, 0.5]} />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={acfBand} stroke={CHART_RED} strokeDasharray="3 3" />
                  <ReferenceLine y={-acfBand} stroke={CHART_RED} strokeDasharray="3 3" />
                  <ReferenceLine y={0} stroke={CHART_TEXT} />
                  <Bar dataKey="acf">
                    {acfChart.map((d, i) => (
                      <Cell key={i} fill={Math.abs(d.acf) > acfBand ? CHART_RED : CHART_GOLD} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!fit && source === "fred" && !fredLoading && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("labs.midas.text081", { defaultValue: "数据加载中或 FRED 接口未就绪。请检查 FRED_API_KEY 配置或切换到「合成离线」数据源。" })}</div>
      )}
    </>
  );
};

export default MIDASTool;
