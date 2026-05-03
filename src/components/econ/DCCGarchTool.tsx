import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ReferenceArea, ComposedChart, Bar, ScatterChart, Scatter,
} from "recharts";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Plus, X, Loader2, Database, Cpu, Activity } from "lucide-react";
import PresetButtons, { Preset } from "../PresetButtons";
import { useMarketQuotes } from "@/lib/marketData";
import { toast } from "@/hooks/use-toast";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED  = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GREEN = "hsl(140, 55%, 45%)";
const CHART_PURPLE = "hsl(280, 50%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";
const PALETTE = [CHART_GOLD, CHART_TEAL, CHART_BLUE, CHART_PURPLE];

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
function variance(a: number[]) {
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(a.length - 1, 1);
}
function normCdf(x: number): number {
  const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937,
        b4 = -1.821255978, b5 = 1.330274429, p = 0.2316419;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const phi = Math.exp(-0.5 * ax * ax) / Math.sqrt(2 * Math.PI);
  const y = 1 - phi * (b1 * t + b2 * t * t + b3 * t ** 3 + b4 * t ** 4 + b5 * t ** 5);
  return 0.5 * (1 + sign * (2 * y - 1));
}
/* z_{α} for normal — used for portfolio VaR.
 * normalQuantile: Beasley–Springer–Moro inverse normal CDF (returns z s.t. Φ(z)=p). */
function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) return p <= 0 ? -Infinity : Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
              1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
              6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
          ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}
/* z_α for one-sided lower tail at confidence α (e.g. α=0.95 ⇒ z≈1.6449). */
const zAlpha = (alpha: number) => normalQuantile(alpha);

/* ──────────────── Chi-squared survival (df=1,2) via series ──────────────── */
/* Lanczos log-gamma */
function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
/* Lower regularised incomplete gamma P(a,x) via series + continued fraction */
function regLowerGamma(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    // series
    let term = 1 / a, sum = term;
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  } else {
    // continued fraction for Q, then 1-Q
    let b = x + 1 - a, c = 1 / 1e-30, d = 1 / b, h = d;
    for (let i = 1; i < 200; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    const Q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
    return 1 - Q;
  }
}
function chiSqSurvival(stat: number, df: number): number {
  if (!isFinite(stat) || stat <= 0) return 1;
  return 1 - regLowerGamma(df / 2, stat / 2);
}

/* ──────────────── Asset spec & built-in offline panel ──────────────── */
export type DataMode = "offline" | "live";
export interface AssetSpec {
  id: string;
  symbol: string;       // ticker (live) or panel key (offline)
  label: string;
  weight: number;       // portfolio weight (will be re-normalised)
}

/* Hand-tuned synthetic 5-year daily-return panel for SPY/TLT/GLD/QQQ.
   Built so true unconditional ρ matches stylised facts:
   ρ(SPY,TLT)≈-0.30, ρ(SPY,GLD)≈+0.05, ρ(TLT,GLD)≈+0.30,
   ρ(SPY,QQQ)≈+0.92, with a 2020-Mar shock window injected. */
function buildOfflinePanel(seed = 17): { dates: string[]; returnsBySymbol: Record<string, number[]> } {
  const rng = mulberry32(seed);
  const N = 1260; // ~5y daily
  const dates: string[] = [];
  // start 2020-01-02
  let day = new Date("2020-01-02").getTime();
  for (let i = 0; i < N; i++) {
    // skip weekends (rough)
    const d = new Date(day);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      day += 24 * 3600 * 1000; d.setTime(day);
    }
    dates.push(d.toISOString().slice(0, 10));
    day += 24 * 3600 * 1000;
  }

  // common factor f, idiosyncratic e
  const SPY: number[] = [], TLT: number[] = [], GLD: number[] = [], QQQ: number[] = [];
  // base annual vols → daily
  const vSPY = 0.18 / Math.sqrt(252);
  const vTLT = 0.13 / Math.sqrt(252);
  const vGLD = 0.15 / Math.sqrt(252);
  const vQQQ = 0.22 / Math.sqrt(252);

  for (let i = 0; i < N; i++) {
    // crisis window: i in [55, 75] (covid)
    const inCrisis = i >= 55 && i <= 75;
    const volMult = inCrisis ? 3.5 : (Math.abs(Math.sin(i / 60)) > 0.92 ? 1.8 : 1.0);
    const fEq = randn(rng);                          // equity factor
    const fRate = randn(rng);                        // rate factor
    const fGold = randn(rng);                        // gold factor
    const eS = randn(rng), eT = randn(rng), eG = randn(rng), eQ = randn(rng);

    // Equity proxies load on fEq with high corr; QQQ ≈ SPY but more vol
    const rSPY = volMult * vSPY * (0.95 * fEq + 0.31 * eS);
    const rQQQ = volMult * vQQQ * (0.92 * fEq + 0.39 * eQ + 0.10 * eS);
    // Treasury bonds: anti-correlated with equity in normal regime, flips in crisis
    const eqLoad = inCrisis ? -0.10 : -0.32;
    const rTLT  = volMult * vTLT * (eqLoad * fEq + 0.60 * fRate + 0.50 * eT);
    // Gold: weak positive with bonds, near-zero with SPY
    const rGLD  = volMult * vGLD * (0.05 * fEq + 0.30 * fRate + 0.95 * fGold + 0.20 * eG);
    SPY.push(rSPY); TLT.push(rTLT); GLD.push(rGLD); QQQ.push(rQQQ);
  }
  return { dates, returnsBySymbol: { SPY, TLT, GLD, QQQ } };
}
const OFFLINE_SYMBOLS = ["SPY", "TLT", "GLD", "QQQ"] as const;
const OFFLINE_LABEL: Record<string, string> = {
  SPY: "标普500 ETF", TLT: "20年期美债 ETF", GLD: "黄金 ETF", QQQ: "纳斯达克100 ETF",
};

/* ──────────────── Univariate GARCH(1,1) QMLE ──────────────── */
function garchVarPath(omega: number, alpha: number, beta: number, r: number[]): number[] {
  const n = r.length;
  const sig2 = new Array<number>(n);
  sig2[0] = Math.max(variance(r), 1e-8);
  for (let t = 1; t < n; t++) {
    sig2[t] = Math.max(omega + alpha * r[t - 1] * r[t - 1] + beta * sig2[t - 1], 1e-12);
  }
  return sig2;
}
function garchNegLogLik(params: number[], r: number[]): number {
  const [omega, alpha, beta] = params;
  if (omega <= 0 || alpha < 0 || beta < 0 || alpha + beta >= 0.999) return 1e12;
  const sig2 = garchVarPath(omega, alpha, beta, r);
  let ll = 0;
  for (let t = 1; t < r.length; t++) {
    ll += 0.5 * (Math.log(2 * Math.PI) + Math.log(sig2[t]) + r[t] * r[t] / sig2[t]);
  }
  return ll;
}

/* ──────────────── Nelder-Mead (re-implemented locally — small) ──────────────── */
interface NMTrace { iter: number; ll: number; theta: number[] }
function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  opts: { maxIter?: number; tol?: number; bounds?: [number, number][]; onStep?: (t: NMTrace) => void } = {}
): { x: number[]; fx: number; iters: number; trace: NMTrace[] } {
  const { maxIter = 250, tol = 1e-7, bounds, onStep } = opts;
  const n = x0.length;
  const clamp = (x: number[]) => bounds ? x.map((v, i) => Math.min(Math.max(v, bounds[i][0]), bounds[i][1])) : x;
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
    trace.push({ iter, ll: simplex[0].fx, theta: [...simplex[0].x] });
    onStep?.(trace[trace.length - 1]);
    if (simplex[n].fx - simplex[0].fx < tol) break;
    const centroid = Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i].x[j];
    for (let j = 0; j < n; j++) centroid[j] /= n;
    const worst = simplex[n];
    const xr = clamp(centroid.map((c, j) => c + (c - worst.x[j])));
    const fr = f(xr);
    if (fr < simplex[0].fx) {
      const xe = clamp(centroid.map((c, j) => c + 2 * (c - worst.x[j])));
      const fe = f(xe);
      simplex[n] = fe < fr ? { x: xe, fx: fe } : { x: xr, fx: fr };
    } else if (fr < simplex[n - 1].fx) {
      simplex[n] = { x: xr, fx: fr };
    } else {
      const xc = clamp(centroid.map((c, j) => c + 0.5 * (worst.x[j] - c)));
      const fc = f(xc);
      if (fc < worst.fx) simplex[n] = { x: xc, fx: fc };
      else {
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
  trace.push({ iter, ll: simplex[0].fx, theta: [...simplex[0].x] });
  return { x: simplex[0].x, fx: simplex[0].fx, iters: iter, trace };
}

/* ──────────────── DCC core ────────────────
   Engle (2002) two-step QMLE.
   Step 1: univariate GARCH on each return series → standardised residuals z_{i,t}=r_{i,t}/σ_{i,t}
   Step 2: dynamic conditional correlation
     Q_t = (1-a-b) * Q̄ + a * z_{t-1} z_{t-1}' + b * Q_{t-1}
     R_t = diag(Q_t)^{-1/2} * Q_t * diag(Q_t)^{-1/2}
   Loglik (Gaussian, correlation part):
     L_c = -0.5 Σ_t [ log|R_t| + z_t' R_t^{-1} z_t - z_t' z_t ]
*/
interface UniGarchFit {
  symbol: string;
  omega: number; alpha: number; beta: number;
  ll: number;
  sig2: number[];   // conditional variance path
  z: number[];      // standardised residuals
  persistence: number;
  uncondVar: number;
}
function fitUniGarch(symbol: string, r: number[]): UniGarchFit {
  const v0 = Math.max(variance(r), 1e-8);
  const x0 = [0.05 * v0, 0.08, 0.88];
  const bounds: [number, number][] = [[1e-10, 10 * v0], [1e-6, 0.4], [1e-6, 0.998]];
  const res = nelderMead((p) => garchNegLogLik(p, r), x0, { maxIter: 220, bounds });
  const [omega, alpha, beta] = res.x;
  const sig2 = garchVarPath(omega, alpha, beta, r);
  const z = r.map((ri, i) => ri / Math.sqrt(sig2[i]));
  const persistence = alpha + beta;
  const uncondVar = persistence < 1 ? omega / (1 - persistence) : NaN;
  return { symbol, omega, alpha, beta, ll: -res.fx, sig2, z, persistence, uncondVar };
}

/* matrix helpers for d×d */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, k = B.length;
  const C = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0;
    for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    C[i][j] = s;
  }
  return C;
}
function matInv(A: number[][]): { inv: number[][]; det: number } {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  let detSign = 1;
  let det = 1;
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    if (Math.abs(M[piv][i]) < 1e-14) return { inv: [], det: 0 };
    if (piv !== i) { [M[i], M[piv]] = [M[piv], M[i]]; detSign = -detSign; }
    det *= M[i][i];
    const f = M[i][i];
    for (let j = 0; j < 2 * n; j++) M[i][j] /= f;
    for (let r = 0; r < n; r++) if (r !== i) {
      const g = M[r][i];
      for (let j = 0; j < 2 * n; j++) M[r][j] -= g * M[i][j];
    }
  }
  return { inv: M.map(row => row.slice(n, 2 * n)), det: det * detSign };
}
function logDet(A: number[][]): number {
  // via LU pivot — small d so reuse matInv det
  const { det } = matInv(A);
  return det > 0 ? Math.log(det) : Math.log(1e-300);
}

/** Run DCC recursion with given (a,b). Returns R_t path and aggregate corr-loglik. */
function dccRecursion(Z: number[][], a: number, b: number): { Rpath: number[][][]; ll: number } {
  const n = Z.length, d = Z[0].length;
  // unconditional Q̄ from standardised residuals
  const Qbar = Array.from({ length: d }, () => Array(d).fill(0));
  for (let t = 0; t < n; t++) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++)
    Qbar[i][j] += Z[t][i] * Z[t][j];
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) Qbar[i][j] /= n;

  let Q = Qbar.map(row => row.slice());
  const Rpath: number[][][] = [];
  let ll = 0;
  const c = 1 - a - b;
  for (let t = 0; t < n; t++) {
    if (t > 0) {
      const z = Z[t - 1];
      for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) {
        Q[i][j] = c * Qbar[i][j] + a * z[i] * z[j] + b * Q[i][j];
      }
    }
    // R_t = diag(Q)^{-1/2} Q diag(Q)^{-1/2}
    const sd = Array.from({ length: d }, (_, i) => Math.sqrt(Math.max(Q[i][i], 1e-14)));
    const R = Array.from({ length: d }, (_, i) =>
      Array.from({ length: d }, (_, j) => Q[i][j] / (sd[i] * sd[j])));
    Rpath.push(R);
    // contribution to corr loglik: -0.5(log|R| + z'R^{-1}z - z'z)
    if (t > 0) {
      const { inv, det } = matInv(R);
      if (!inv.length || det <= 0) { ll -= 1e6; continue; }
      let quad = 0;
      const zt = Z[t];
      for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) quad += zt[i] * inv[i][j] * zt[j];
      const zz = zt.reduce((s, x) => s + x * x, 0);
      ll += -0.5 * (Math.log(det) + quad - zz);
    }
  }
  return { Rpath, ll };
}
function fitDCC(Z: number[][]): { a: number; b: number; ll: number; Rpath: number[][][]; trace: NMTrace[] } {
  const obj = (p: number[]) => {
    const [a, b] = p;
    if (a < 1e-6 || b < 1e-6 || a + b > 0.999) return 1e10;
    return -dccRecursion(Z, a, b).ll;
  };
  const res = nelderMead(obj, [0.04, 0.93], {
    maxIter: 180, tol: 1e-6, bounds: [[1e-5, 0.5], [1e-5, 0.998]],
  });
  const { Rpath, ll } = dccRecursion(Z, res.x[0], res.x[1]);
  return { a: res.x[0], b: res.x[1], ll, Rpath, trace: res.trace };
}

/* ──────────────── UI helpers ──────────────── */
const Slider = ({
  label, value, min, max, step, onChange, sub,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; sub?: string }) => (
  <div>
    <label className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
      <span>{label}</span>
      <span className="text-foreground tabular-nums">{value.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 2)}</span>
    </label>
    {sub && <div className="text-[10px] text-muted-foreground/70 mb-1">{sub}</div>}
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-gold" />
  </div>
);

/** Heatmap of d×d correlation matrix at a single timestep */
const CorrHeatmap = ({ R, labels }: { R: number[][]; labels: string[] }) => {
  const d = R.length;
  const cell = (rho: number) => {
    // map ρ ∈ [-1,1] to gold (positive) ↔ red (negative)
    if (rho >= 0) return `hsl(43, 80%, ${88 - 38 * rho}%)`;
    return `hsl(0, 70%, ${88 + 38 * rho}%)`;
  };
  return (
    <div className="inline-block">
      <div className="grid gap-px bg-border/40 p-px rounded"
        style={{ gridTemplateColumns: `60px repeat(${d}, 64px)` }}>
        <div />
        {labels.map(l => (
          <div key={l} className="text-[10px] font-mono text-muted-foreground text-center py-1 bg-card">
            {l}
          </div>
        ))}
        {labels.map((rl, i) => (
          <>
            <div key={`h-${rl}`} className="text-[10px] font-mono text-muted-foreground text-right pr-2 py-1 bg-card">
              {rl}
            </div>
            {R[i].map((rho, j) => (
              <div key={`${i}-${j}`}
                className="aspect-square flex items-center justify-center text-[11px] font-mono tabular-nums text-foreground"
                style={{ background: cell(rho) }}>
                {rho.toFixed(2)}
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  );
};

/* ──────────────── Main component ──────────────── */
const DEFAULT_OFFLINE_ASSETS: AssetSpec[] = [
  { id: "a1", symbol: "SPY", label: OFFLINE_LABEL.SPY, weight: 0.5 },
  { id: "a2", symbol: "TLT", label: OFFLINE_LABEL.TLT, weight: 0.3 },
  { id: "a3", symbol: "GLD", label: OFFLINE_LABEL.GLD, weight: 0.2 },
];

export const DCCGarchTool = () => {
  const [mode, setMode] = useState<DataMode>("offline");
  const [assets, setAssets] = useState<AssetSpec[]>(DEFAULT_OFFLINE_ASSETS);
  // Selected confidence levels (decimal). Default 90/95/99 + a custom slot.
  const [vaRLevels, setVaRLevels] = useState<number[]>([0.90, 0.95, 0.99]);
  const [vaRConf, setVaRConf] = useState<number>(0.95);
  const [customConf, setCustomConf] = useState<string>("97.5");
  const [snapshotIdx, setSnapshotIdx] = useState<number>(0); // for heatmap slider
  const [running, setRunning] = useState(false);
  const [fit, setFit] = useState<{
    uni: UniGarchFit[];
    dcc: { a: number; b: number; ll: number };
    Rpath: number[][][];
    dates: string[];
    portRet: number[];
    portVol: number[];   // sqrt of portfolio variance, daily
    crisisIdx: [number, number] | null;
  } | null>(null);

  /* ---------- Live data fetch ---------- */
  const liveQ0 = useMarketQuotes(assets[0]?.symbol || "SPY", "5y", mode === "live");
  const liveQ1 = useMarketQuotes(assets[1]?.symbol || "TLT", "5y", mode === "live" && assets.length > 1);
  const liveQ2 = useMarketQuotes(assets[2]?.symbol || "GLD", "5y", mode === "live" && assets.length > 2);
  const liveQ3 = useMarketQuotes(assets[3]?.symbol || "QQQ", "5y", mode === "live" && assets.length > 3);
  const liveQs = [liveQ0, liveQ1, liveQ2, liveQ3];
  const liveLoading = mode === "live" && liveQs.slice(0, assets.length).some(q => q.isLoading);
  const liveError = mode === "live" && liveQs.slice(0, assets.length).find(q => q.error);

  /* ---------- Build aligned return panel ---------- */
  const panel = useMemo(() => {
    if (mode === "offline") {
      const off = buildOfflinePanel(17);
      const cols = assets.map(a => off.returnsBySymbol[a.symbol] ?? off.returnsBySymbol.SPY);
      return { dates: off.dates, returns: cols, ok: true };
    }
    // live mode: align by intersection of dates
    const qs = liveQs.slice(0, assets.length);
    if (qs.some(q => !q.data)) return { dates: [], returns: [], ok: false };
    // build date-indexed maps
    const maps = qs.map(q => {
      const m = new Map<string, number>();
      for (let i = 0; i < q.data!.dates.length - 1; i++) {
        m.set(q.data!.dates[i + 1], q.data!.returns[i]);
      }
      return m;
    });
    // common dates
    const common: string[] = [];
    for (const d of maps[0].keys()) if (maps.every(m => m.has(d))) common.push(d);
    common.sort();
    const cols = maps.map(m => common.map(d => m.get(d)!));
    return { dates: common, returns: cols, ok: common.length > 60 };
  }, [mode, assets, liveQ0.data, liveQ1.data, liveQ2.data, liveQ3.data]);

  /* ---------- Fit pipeline ---------- */
  const runFit = useCallback(async () => {
    if (!panel.ok || panel.returns.length === 0) {
      toast({ title: "数据不足", description: "需要至少 60 个共同观测日", variant: "destructive" });
      return;
    }
    setRunning(true);
    // yield to UI
    await new Promise(r => setTimeout(r, 30));
    try {
      // Step 1: univariate GARCH on each return series
      const uni = panel.returns.map((r, i) => fitUniGarch(assets[i].symbol, r));
      // Step 2: stack standardised residuals
      const T = uni[0].z.length;
      const Z: number[][] = Array.from({ length: T }, (_, t) => uni.map(u => u.z[t]));
      const dccRes = fitDCC(Z);
      // Portfolio variance time path
      const w = (() => {
        const ws = assets.map(a => Math.max(a.weight, 0));
        const s = sum(ws) || 1;
        return ws.map(x => x / s);
      })();
      const portRet: number[] = [], portVol: number[] = [];
      for (let t = 0; t < T; t++) {
        // covariance Σ_t = D R_t D where D = diag(σ_i,t)
        const sd = uni.map(u => Math.sqrt(u.sig2[t]));
        let varP = 0, retP = 0;
        for (let i = 0; i < uni.length; i++) {
          retP += w[i] * panel.returns[i][t];
          for (let j = 0; j < uni.length; j++) {
            varP += w[i] * w[j] * sd[i] * sd[j] * dccRes.Rpath[t][i][j];
          }
        }
        portRet.push(retP);
        portVol.push(Math.sqrt(Math.max(varP, 0)));
      }
      // Auto-detect crisis window (offline: 2020-Mar; live: max-vol stretch)
      let crisisIdx: [number, number] | null = null;
      if (mode === "offline" && T > 80) crisisIdx = [55, 75];
      else {
        // pick top-1% vol stretch
        const sorted = [...portVol].sort((a, b) => b - a);
        const thr = sorted[Math.floor(sorted.length * 0.02)];
        const above = portVol.map((v, i) => v >= thr ? i : -1).filter(i => i >= 0);
        if (above.length > 0) crisisIdx = [above[0], above[above.length - 1]];
      }
      setFit({
        uni, dcc: { a: dccRes.a, b: dccRes.b, ll: dccRes.ll },
        Rpath: dccRes.Rpath, dates: panel.dates, portRet, portVol, crisisIdx,
      });
      setSnapshotIdx(T - 1);
      toast({ title: "DCC-GARCH 拟合完成", description: `T=${T}, a=${dccRes.a.toFixed(3)}, b=${dccRes.b.toFixed(3)}` });
    } catch (e) {
      toast({ title: "拟合失败", description: String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }, [panel, assets, mode]);

  /* Auto-fit on mount in offline mode */
  useEffect(() => {
    if (mode === "offline" && !fit && !running) runFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, assets.map(a => a.symbol).join(","), assets.length]);

  /* ---------- Asset card actions ---------- */
  const addAsset = () => {
    if (assets.length >= 4) return;
    const used = new Set(assets.map(a => a.symbol));
    const next = OFFLINE_SYMBOLS.find(s => !used.has(s)) || "QQQ";
    setAssets([...assets, { id: `a${Date.now()}`, symbol: next, label: OFFLINE_LABEL[next] || next, weight: 0.1 }]);
  };
  const removeAsset = (id: string) => {
    if (assets.length <= 2) {
      toast({ title: "至少需要 2 个资产" });
      return;
    }
    setAssets(assets.filter(a => a.id !== id));
  };
  const updateAsset = (id: string, patch: Partial<AssetSpec>) => {
    setAssets(assets.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  /* ---------- Presets ---------- */
  const presets: Preset[] = [
    { name: "经典 60/40 + 黄金", description: "SPY 60% / TLT 30% / GLD 10%",
      apply: () => setAssets([
        { id: "a1", symbol: "SPY", label: OFFLINE_LABEL.SPY, weight: 0.6 },
        { id: "a2", symbol: "TLT", label: OFFLINE_LABEL.TLT, weight: 0.3 },
        { id: "a3", symbol: "GLD", label: OFFLINE_LABEL.GLD, weight: 0.1 },
      ])},
    { name: "纯股双指数", description: "SPY + QQQ 高相关验证",
      apply: () => setAssets([
        { id: "a1", symbol: "SPY", label: OFFLINE_LABEL.SPY, weight: 0.5 },
        { id: "a2", symbol: "QQQ", label: OFFLINE_LABEL.QQQ, weight: 0.5 },
      ])},
    { name: "全资产 4 维", description: "SPY+TLT+GLD+QQQ",
      apply: () => setAssets([
        { id: "a1", symbol: "SPY", label: OFFLINE_LABEL.SPY, weight: 0.4 },
        { id: "a2", symbol: "TLT", label: OFFLINE_LABEL.TLT, weight: 0.2 },
        { id: "a3", symbol: "GLD", label: OFFLINE_LABEL.GLD, weight: 0.2 },
        { id: "a4", symbol: "QQQ", label: OFFLINE_LABEL.QQQ, weight: 0.2 },
      ])},
  ];

  /* ---------- Derived series for charts ---------- */
  const corrSeries = useMemo(() => {
    if (!fit) return [];
    const T = fit.Rpath.length;
    const d = fit.uni.length;
    return fit.dates.slice(0, T).map((dt, t) => {
      const row: any = { date: dt, idx: t };
      for (let i = 0; i < d; i++) for (let j = i + 1; j < d; j++) {
        row[`${assets[i].symbol}-${assets[j].symbol}`] = fit.Rpath[t][i][j];
      }
      return row;
    });
  }, [fit, assets]);

  const portSeries = useMemo(() => {
    if (!fit) return [];
    const z = zAlpha(vaRConf);
    return fit.dates.map((dt, t) => ({
      date: dt, idx: t,
      vol: fit.portVol[t] * 100,
      var: -z * fit.portVol[t] * 100, // negative tail
      ret: fit.portRet[t] * 100,
    }));
  }, [fit, vaRConf]);

  /* ---------- VaR back-test (Kupiec POF + Christoffersen independence/CC) ---------- */
  const backtest = useMemo(() => {
    if (!fit || fit.portRet.length < 30) return null;
    // Helper: compute LR_uc, LR_ind, LR_cc from a hits sequence
    const lrFromHits = (hits: number[], p: number) => {
      const safeLog = (x: number) => Math.log(Math.max(x, 1e-300));
      const T = hits.length;
      let n1 = 0;
      for (let t = 0; t < T; t++) n1 += hits[t];
      const n0 = T - n1;
      const piHat = n1 / T;
      const llNull = n1 * safeLog(p) + n0 * safeLog(1 - p);
      const llAlt  = n1 * safeLog(piHat) + n0 * safeLog(1 - piHat);
      const LR_uc = 2 * (llAlt - llNull);
      let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
      for (let t = 1; t < T; t++) {
        const a = hits[t - 1], b = hits[t];
        if (a === 0 && b === 0) n00++;
        else if (a === 0 && b === 1) n01++;
        else if (a === 1 && b === 0) n10++;
        else n11++;
      }
      const pi01 = n01 / Math.max(n00 + n01, 1);
      const pi11 = n11 / Math.max(n10 + n11, 1);
      const piAll = (n01 + n11) / Math.max(n00 + n01 + n10 + n11, 1);
      const llIndH0 = (n00 + n10) * safeLog(1 - piAll) + (n01 + n11) * safeLog(piAll);
      const llIndH1 = n00 * safeLog(1 - pi01) + n01 * safeLog(pi01)
                    + n10 * safeLog(1 - pi11) + n11 * safeLog(pi11);
      const LR_ind = 2 * (llIndH1 - llIndH0);
      const LR_cc  = LR_uc + LR_ind;
      return { n1, n0, piHat, n00, n01, n10, n11, LR_uc, LR_ind, LR_cc };
    };
    // Monte-Carlo p-value under H0: hits ~ iid Bernoulli(p)
    const mcPValues = (T: number, p: number, obs: { uc: number; ind: number; cc: number }, B = 2000) => {
      let cUC = 0, cIND = 0, cCC = 0;
      const sim: number[] = new Array(T);
      for (let b = 0; b < B; b++) {
        for (let t = 0; t < T; t++) sim[t] = Math.random() < p ? 1 : 0;
        const s = lrFromHits(sim, p);
        // Use ≥ (one-sided LR upper tail). +1 smoothing for finite-sample p-value.
        if (s.LR_uc  >= obs.uc)  cUC++;
        if (s.LR_ind >= obs.ind) cIND++;
        if (s.LR_cc  >= obs.cc)  cCC++;
      }
      return {
        p_uc:  (cUC  + 1) / (B + 1),
        p_ind: (cIND + 1) / (B + 1),
        p_cc:  (cCC  + 1) / (B + 1),
        B,
      };
    };
    const compute = (alpha: number) => {
      const z = zAlpha(alpha);
      const p = 1 - alpha;
      const T = fit.portRet.length;
      // Hit indicator I_t = 1 if r_t < -z·σ_t  (loss exceeds VaR)
      const hits: number[] = new Array(T);
      const exceedances: { date: string; idx: number; ret: number; var: number }[] = [];
      let n1 = 0;
      for (let t = 0; t < T; t++) {
        const v = -z * fit.portVol[t];
        const breach = fit.portRet[t] < v ? 1 : 0;
        hits[t] = breach;
        if (breach) {
          n1++;
          exceedances.push({
            date: fit.dates[t], idx: t,
            ret: fit.portRet[t] * 100, var: v * 100,
          });
        }
      }
      const n0 = T - n1;
      const piHat = n1 / T;
      // Kupiec POF (LR_uc): -2 ln[ p^n1 (1-p)^n0 / piHat^n1 (1-piHat)^n0 ]
      const safeLog = (x: number) => Math.log(Math.max(x, 1e-300));
      const llNull = n1 * safeLog(p) + n0 * safeLog(1 - p);
      const llAlt  = n1 * safeLog(piHat) + n0 * safeLog(1 - piHat);
      const LR_uc = 2 * (llAlt - llNull);
      const p_uc_chi  = chiSqSurvival(LR_uc, 1);
      // Christoffersen independence: count transitions n_ij
      let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
      for (let t = 1; t < T; t++) {
        const a = hits[t - 1], b = hits[t];
        if (a === 0 && b === 0) n00++;
        else if (a === 0 && b === 1) n01++;
        else if (a === 1 && b === 0) n10++;
        else n11++;
      }
      const pi01 = n01 / Math.max(n00 + n01, 1);
      const pi11 = n11 / Math.max(n10 + n11, 1);
      const piAll = (n01 + n11) / Math.max(n00 + n01 + n10 + n11, 1);
      const llIndH0 = (n00 + n10) * safeLog(1 - piAll) + (n01 + n11) * safeLog(piAll);
      const llIndH1 = n00 * safeLog(1 - pi01) + n01 * safeLog(pi01)
                    + n10 * safeLog(1 - pi11) + n11 * safeLog(pi11);
      const LR_ind = 2 * (llIndH1 - llIndH0);
      const p_ind_chi  = chiSqSurvival(LR_ind, 1);
      const LR_cc  = LR_uc + LR_ind;
      const p_cc_chi   = chiSqSurvival(LR_cc, 2);
      const expected = T * p;
      // Auto-switch to Monte-Carlo bootstrap when chi-sq asymptotics unreliable
      // Trigger if expected breaches < 10 or actual breaches < 10 (incl. zero).
      const useMC = expected < 10 || n1 < 10;
      let p_uc = p_uc_chi, p_ind = p_ind_chi, p_cc = p_cc_chi;
      let mcInfo: { B: number } | null = null;
      if (useMC) {
        const mc = mcPValues(T, p, { uc: LR_uc, ind: LR_ind, cc: LR_cc }, 2000);
        p_uc = mc.p_uc; p_ind = mc.p_ind; p_cc = mc.p_cc;
        mcInfo = { B: mc.B };
      }
      return {
        alpha, p, T, n1, expected, piHat,
        LR_uc, p_uc, LR_ind, p_ind, LR_cc, p_cc,
        p_uc_chi, p_ind_chi, p_cc_chi,
        method: useMC ? "mc" as const : "chi2" as const,
        mcInfo,
        n00, n01, n10, n11, exceedances,
      };
    };
    const results = vaRLevels.map(compute);
    return { results, byLevel: Object.fromEntries(results.map(r => [r.alpha, r])) };
  }, [fit, vaRLevels]);

  /* Cumulative breaches series for the chart (current vaRConf) */
  const breachSeries = useMemo(() => {
    if (!fit || !backtest) return [];
    const cur = backtest.byLevel[vaRConf] ?? backtest.results[0];
    const z = zAlpha(vaRConf);
    let cumExp = 0, cumAct = 0;
    return fit.dates.map((dt, t) => {
      cumExp += cur.p;
      const breach = fit.portRet[t] < -z * fit.portVol[t] ? 1 : 0;
      cumAct += breach;
      return {
        date: dt, idx: t,
        expected: cumExp,
        actual: cumAct,
        ret: fit.portRet[t] * 100,
        var: -z * fit.portVol[t] * 100,
        breach: breach ? fit.portRet[t] * 100 : null,
      };
    });
  }, [fit, backtest, vaRConf]);


  const corrPairs = useMemo(() => {
    const d = assets.length;
    const out: { key: string; color: string }[] = [];
    let k = 0;
    for (let i = 0; i < d; i++) for (let j = i + 1; j < d; j++) {
      out.push({ key: `${assets[i].symbol}-${assets[j].symbol}`, color: PALETTE[k++ % PALETTE.length] });
    }
    return out;
  }, [assets]);

  const labels = assets.map(a => a.symbol);

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />

      {/* Mode + actions row */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/60">
        <div className="flex gap-2">
          {(["offline", "live"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setFit(null); }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono inline-flex items-center gap-1.5 transition-colors ${
                mode === m ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {m === "offline" ? <Database className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
              {m === "offline" ? "内置离线样本" : "实时行情 (Yahoo)"}
            </button>
          ))}
        </div>
        <div className="flex-1 text-[10px] font-mono text-muted-foreground/80">
          {mode === "offline"
            ? "5y 合成日频:SPY/TLT/GLD/QQQ,内嵌 2020 危机窗口"
            : "实时拉取 5 年日线,按交集对齐;符号可改为任意 Yahoo 股票代码"}
        </div>
        <button
          onClick={runFit}
          disabled={running || liveLoading || !panel.ok}
          className="px-4 py-1.5 rounded-md bg-gold text-primary-foreground text-[11px] font-mono uppercase tracking-wider hover:bg-gold/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {(running || liveLoading) && <Loader2 className="w-3 h-3 animate-spin" />}
          <Cpu className="w-3 h-3" />
          {running ? "拟合中…" : liveLoading ? "下载中…" : "运行 DCC-GARCH"}
        </button>
      </div>

      {liveError && (
        <div className="text-[11px] font-mono text-destructive p-2 rounded bg-destructive/10 border border-destructive/30">
          实时数据获取失败: {(liveError.error as Error)?.message || "unknown"} — 请切换离线样本
        </div>
      )}

      {/* Asset cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {assets.map((a, i) => (
          <div key={a.id} className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                <input
                  value={a.symbol}
                  onChange={(e) => updateAsset(a.id, { symbol: e.target.value.toUpperCase().slice(0, 8) })}
                  className="w-20 bg-transparent border-b border-border/60 text-sm font-mono uppercase focus:outline-none focus:border-gold"
                />
                <span className="text-[11px] text-muted-foreground">
                  {mode === "offline" ? (OFFLINE_LABEL[a.symbol] || "—") : (liveQs[i]?.data?.currency || "")}
                </span>
              </div>
              <button onClick={() => removeAsset(a.id)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <Slider label={`权重 w_${i + 1}`} value={a.weight} min={0} max={1} step={0.05}
              onChange={(v) => updateAsset(a.id, { weight: v })} />
            {fit && fit.uni[i] && (
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-1 border-t border-border/40">
                <div><span className="text-muted-foreground">ω </span><span className="text-foreground tabular-nums">{fit.uni[i].omega.toExponential(2)}</span></div>
                <div><span className="text-muted-foreground">α </span><span className="text-foreground tabular-nums">{fit.uni[i].alpha.toFixed(3)}</span></div>
                <div><span className="text-muted-foreground">β </span><span className="text-foreground tabular-nums">{fit.uni[i].beta.toFixed(3)}</span></div>
                <div className="col-span-3 text-muted-foreground/80">
                  α+β = <span className={`tabular-nums ${fit.uni[i].persistence > 0.97 ? "text-gold" : "text-foreground"}`}>
                    {fit.uni[i].persistence.toFixed(3)}
                  </span>{fit.uni[i].persistence > 0.97 && " (高持续)"}
                </div>
              </div>
            )}
          </div>
        ))}
        {assets.length < 4 && (
          <button onClick={addAsset}
            className="rounded-lg border border-dashed border-border/60 p-3 text-[11px] font-mono text-muted-foreground hover:text-gold hover:border-gold/40 inline-flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> 添加资产
          </button>
        )}
      </div>

      {/* DCC fit summary */}
      {fit && (
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryStat label="DCC a" value={fit.dcc.a.toFixed(4)} hint="新息冲击权重" />
          <SummaryStat label="DCC b" value={fit.dcc.b.toFixed(4)} hint="相关性持续性" />
          <SummaryStat label="a + b" value={(fit.dcc.a + fit.dcc.b).toFixed(4)}
            hint={fit.dcc.a + fit.dcc.b > 0.97 ? "⚠ 接近单位根" : "平稳"} />
          <SummaryStat label="logL_corr" value={fit.dcc.ll.toFixed(1)} hint={`T=${fit.Rpath.length}`} />
        </div>
      )}

      {/* Dynamic correlation curves */}
      {fit && corrSeries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-mono uppercase tracking-wider text-foreground">
              动态条件相关 ρ_ij(t)
            </h4>
            <span className="text-[10px] font-mono text-muted-foreground">
              点击曲线标签可查看相关性的时变路径
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={corrSeries} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: CHART_TEXT, fontSize: 10 }}
                interval={Math.floor(corrSeries.length / 8)} />
              <YAxis domain={[-1, 1]} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                formatter={(v: number) => v.toFixed(3)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="3 3" />
              {fit.crisisIdx && (
                <ReferenceArea x1={corrSeries[fit.crisisIdx[0]]?.date}
                  x2={corrSeries[Math.min(fit.crisisIdx[1], corrSeries.length - 1)]?.date}
                  fill={CHART_RED} fillOpacity={0.08}
                  label={{ value: "危机期 (相关性飙升)", fill: CHART_RED, fontSize: 10, position: "insideTop" }} />
              )}
              {corrPairs.map(p => (
                <Line key={p.key} type="monotone" dataKey={p.key} stroke={p.color}
                  dot={false} strokeWidth={1.5} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Snapshot heatmap + slider */}
      {fit && fit.Rpath.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[auto,1fr] items-start">
          <div>
            <h4 className="text-sm font-mono uppercase tracking-wider text-foreground mb-2">
              相关矩阵快照 R_t
            </h4>
            <CorrHeatmap R={fit.Rpath[snapshotIdx]} labels={labels} />
            <div className="mt-3 text-[10px] font-mono text-muted-foreground">
              {fit.dates[snapshotIdx]} · t = {snapshotIdx + 1}
            </div>
          </div>
          <div className="pt-7 space-y-3">
            <input type="range" min={0} max={fit.Rpath.length - 1} value={snapshotIdx}
              onChange={(e) => setSnapshotIdx(parseInt(e.target.value))}
              className="w-full accent-gold" />
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <button onClick={() => setSnapshotIdx(0)}
                className="px-2 py-1 rounded bg-secondary/50 hover:bg-secondary text-muted-foreground">
                ⟸ 起始
              </button>
              <button
                onClick={() => fit.crisisIdx && setSnapshotIdx(Math.floor((fit.crisisIdx[0] + fit.crisisIdx[1]) / 2))}
                disabled={!fit.crisisIdx}
                className="px-2 py-1 rounded bg-destructive/15 hover:bg-destructive/25 text-destructive disabled:opacity-40">
                ↯ 危机期
              </button>
              <button onClick={() => setSnapshotIdx(fit.Rpath.length - 1)}
                className="px-2 py-1 rounded bg-secondary/50 hover:bg-secondary text-muted-foreground">
                最近 ⟹
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              拖动可观察相关结构如何随时间漂移。在危机期,通常所有 ρ_ij 同向飙升 ⇒ 多元化失效。
            </p>
          </div>
        </div>
      )}

      {/* Portfolio VaR time series */}
      {fit && portSeries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-mono uppercase tracking-wider text-foreground">
              组合时变波动率 & VaR
            </h4>
            <div className="flex flex-wrap items-center gap-1">
              {vaRLevels.map(c => (
                <button key={c} onClick={() => setVaRConf(c)}
                  className={`px-2 py-1 rounded text-[10px] font-mono ${
                    Math.abs(vaRConf - c) < 1e-9 ? "bg-gold/20 text-gold" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {(c * 100).toFixed(c >= 0.999 ? 2 : 1).replace(/\.0$/, "")}%
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={portSeries} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: CHART_TEXT, fontSize: 10 }}
                interval={Math.floor(portSeries.length / 8)} />
              <YAxis tick={{ fill: CHART_TEXT, fontSize: 10 }}
                label={{ value: "%", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                formatter={(v: number) => `${v.toFixed(3)}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="3 3" />
              {fit.crisisIdx && (
                <ReferenceArea x1={portSeries[fit.crisisIdx[0]]?.date}
                  x2={portSeries[Math.min(fit.crisisIdx[1], portSeries.length - 1)]?.date}
                  fill={CHART_RED} fillOpacity={0.08} />
              )}
              <Line dataKey="ret" type="monotone" stroke={CHART_TEAL} dot={false} name="组合日收益" strokeWidth={1} />
              <Line dataKey="vol" type="monotone" stroke={CHART_GOLD} dot={false} name="σ_p,t" strokeWidth={1.5} />
              <Line dataKey="var" type="monotone" stroke={CHART_RED} dot={false} name={`-z·σ_p,t (${(vaRConf*100).toFixed(0)}%)`} strokeWidth={1.5} strokeDasharray="4 3" />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground/80 mt-2">
            <InlineMath math={`\\text{VaR}_t^{${(vaRConf*100).toFixed(0)}\\%} = z_\\alpha \\cdot \\sqrt{w'\\Sigma_t w}`} />
            {" "}— 高斯分位数下的单日组合损失上界。注意危机期 σ_p 同时受单变量波动率与相关性飙升驱动。
          </p>
        </div>
      )}

      {/* VaR back-testing panel: Kupiec POF + Christoffersen */}
      {fit && backtest && (
        <div className="rounded-lg border border-border/60 bg-card/30 p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-mono uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-gold" /> VaR 回测面板 — Kupiec / Christoffersen
            </h4>
            <span className="text-[10px] font-mono text-muted-foreground">
              T = {backtest.results[0]?.T ?? 0} 天 · 当前可视化: {(vaRConf * 100).toFixed(2).replace(/\.?0+$/, "")}%
            </span>
          </div>

          {/* Confidence-level selector: presets + custom α */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/40 bg-card/40 p-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">置信度 α</span>
            {[0.90, 0.95, 0.975, 0.99, 0.995].map(lv => {
              const on = vaRLevels.some(x => Math.abs(x - lv) < 1e-9);
              return (
                <button key={lv}
                  onClick={() => setVaRLevels(prev => {
                    const has = prev.some(x => Math.abs(x - lv) < 1e-9);
                    const next = has ? prev.filter(x => Math.abs(x - lv) >= 1e-9) : [...prev, lv].sort((a,b)=>a-b);
                    if (has && Math.abs(vaRConf - lv) < 1e-9 && next.length) setVaRConf(next[0]);
                    return next.length ? next : prev;
                  })}
                  className={`px-2 py-1 rounded text-[10px] font-mono border ${
                    on ? "border-gold/50 bg-gold/15 text-gold" : "border-border/40 text-muted-foreground hover:text-foreground"
                  }`}>
                  {(lv * 100).toFixed(lv >= 0.995 ? 1 : (lv === 0.975 ? 1 : 0))}%
                </button>
              );
            })}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] font-mono text-muted-foreground">自定义</span>
              <input
                type="number" min={50} max={99.99} step={0.1}
                value={customConf}
                onChange={(e) => setCustomConf(e.target.value)}
                className="w-16 h-7 px-2 rounded bg-background border border-border/50 text-[11px] font-mono tabular-nums"
              />
              <span className="text-[10px] font-mono text-muted-foreground">%</span>
              <button
                onClick={() => {
                  const v = parseFloat(customConf);
                  if (!Number.isFinite(v) || v <= 50 || v >= 99.999) return;
                  const lv = v / 100;
                  setVaRLevels(prev => prev.some(x => Math.abs(x - lv) < 1e-6)
                    ? prev
                    : [...prev, lv].sort((a,b)=>a-b));
                  setVaRConf(lv);
                }}
                className="px-2 py-1 rounded text-[10px] font-mono border border-gold/40 text-gold hover:bg-gold/10">
                添加
              </button>
            </div>
          </div>

          <div className={`grid gap-3 ${backtest.results.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {backtest.results.map((bt) => {
              const verdict = (pv: number) => pv < 0.05
                ? { tag: "拒绝 H0", cls: "text-[hsl(0,70%,55%)]" }
                : { tag: "接受 H0", cls: "text-[hsl(140,55%,45%)]" };
              const vUC = verdict(bt.p_uc);
              const vIND = verdict(bt.p_ind);
              const vCC = verdict(bt.p_cc);
              const isActive = Math.abs(vaRConf - bt.alpha) < 1e-9;
              return (
                <div key={bt.alpha}
                  className={`rounded-md border p-3 ${
                    isActive ? "border-gold/50 bg-gold/5" : "border-border/40 bg-card/40"
                  }`}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-foreground">
                      {(bt.alpha * 100).toFixed(2).replace(/\.?0+$/, "")}% VaR
                      <span className="ml-1 text-[9px] text-muted-foreground">z={zAlpha(bt.alpha).toFixed(3)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVaRConf(bt.alpha)}
                        className="text-[10px] font-mono text-muted-foreground hover:text-gold underline-offset-2 hover:underline">
                        可视化
                      </button>
                      {backtest.results.length > 1 && (
                        <button
                          onClick={() => setVaRLevels(prev => {
                            const next = prev.filter(x => Math.abs(x - bt.alpha) >= 1e-9);
                            if (Math.abs(vaRConf - bt.alpha) < 1e-9 && next.length) setVaRConf(next[0]);
                            return next.length ? next : prev;
                          })}
                          className="text-[10px] font-mono text-muted-foreground hover:text-[hsl(0,70%,55%)]">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded bg-secondary/30 p-2">
                      <div className="text-[9px] font-mono uppercase text-muted-foreground">实际违约</div>
                      <div className="text-base font-display tabular-nums text-foreground">{bt.n1}</div>
                    </div>
                    <div className="rounded bg-secondary/30 p-2">
                      <div className="text-[9px] font-mono uppercase text-muted-foreground">期望</div>
                      <div className="text-base font-display tabular-nums text-foreground">{bt.expected.toFixed(1)}</div>
                    </div>
                    <div className="rounded bg-secondary/30 p-2">
                      <div className="text-[9px] font-mono uppercase text-muted-foreground">π̂</div>
                      <div className="text-base font-display tabular-nums text-foreground">{(bt.piHat * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/40">
                        <th className="text-left py-1">检验</th>
                        <th className="text-right">LR</th>
                        <th className="text-right">df</th>
                        <th className="text-right">p-value</th>
                        <th className="text-right">结论</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground tabular-nums">
                      <tr className="border-b border-border/20">
                        <td className="py-1 text-muted-foreground">Kupiec POF (覆盖率)</td>
                        <td className="text-right">{bt.LR_uc.toFixed(3)}</td>
                        <td className="text-right">1</td>
                        <td className="text-right">{bt.p_uc.toFixed(4)}</td>
                        <td className={`text-right ${vUC.cls}`}>{vUC.tag}</td>
                      </tr>
                      <tr className="border-b border-border/20">
                        <td className="py-1 text-muted-foreground">Christoffersen IND (独立性)</td>
                        <td className="text-right">{bt.LR_ind.toFixed(3)}</td>
                        <td className="text-right">1</td>
                        <td className="text-right">{bt.p_ind.toFixed(4)}</td>
                        <td className={`text-right ${vIND.cls}`}>{vIND.tag}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-muted-foreground">联合 CC (UC+IND)</td>
                        <td className="text-right">{bt.LR_cc.toFixed(3)}</td>
                        <td className="text-right">2</td>
                        <td className="text-right">{bt.p_cc.toFixed(4)}</td>
                        <td className={`text-right ${vCC.cls}`}>{vCC.tag}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-[10px] text-muted-foreground/80 mt-2 leading-relaxed">
                    转移计数 n₀₀={bt.n00} · n₀₁={bt.n01} · n₁₀={bt.n10} · n₁₁={bt.n11}
                    {bt.n11 > 0 && " · ⚠ 出现连续违约"}
                  </div>
                  {(() => {
                    const lowExp = bt.expected < 5;
                    const lowAct = bt.n1 < 5;
                    const zeroAct = bt.n1 === 0;
                    if (!lowExp && !lowAct) return null;
                    const msgs: string[] = [];
                    if (zeroAct) {
                      msgs.push(`实际违约 = 0,Kupiec/Christoffersen LR 退化(π̂=0),p-value 不可靠`);
                    } else if (lowAct) {
                      msgs.push(`实际违约 n₁=${bt.n1} < 5,χ² 渐近近似不稳定`);
                    }
                    if (lowExp) {
                      msgs.push(`期望违约 ${bt.expected.toFixed(1)} < 5(T=${bt.T},α=${(bt.alpha * 100).toFixed(2).replace(/\.?0+$/, "")}%),建议增大样本或降低置信水平`);
                    }
                    return (
                      <div className="mt-2 rounded border border-[hsl(38,92%,50%)]/40 bg-[hsl(38,92%,50%)]/10 px-2 py-1.5 text-[10px] leading-relaxed text-[hsl(38,92%,40%)] dark:text-[hsl(38,92%,65%)]">
                        ⚠ <span className="font-mono uppercase tracking-wider">样本不足</span> · {msgs.join(" · ")}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {breachSeries.length > 0 && (
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                累计违约次数: 实际 vs 期望 (α = {(vaRConf * 100).toFixed(0)}%)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={breachSeries} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: CHART_TEXT, fontSize: 10 }}
                    interval={Math.floor(breachSeries.length / 8)} />
                  <YAxis tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                    formatter={(v: number) => v.toFixed(2)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="expected" type="monotone" stroke={CHART_TEAL} dot={false}
                    name="期望累计 (T·p)" strokeWidth={1.5} strokeDasharray="4 3" />
                  <Line dataKey="actual" type="monotone" stroke={CHART_RED} dot={false}
                    name="实际累计违约" strokeWidth={1.8} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                若实际曲线显著偏离期望线 → 模型 低估/高估 风险。Kupiec 检验等价于"两曲线终点是否显著不同"。
              </p>
            </div>
          )}

          {breachSeries.length > 0 && (
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                违约日标注 — 红点 = 损失击穿 VaR
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={breachSeries} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: CHART_TEXT, fontSize: 10 }}
                    interval={Math.floor(breachSeries.length / 8)} />
                  <YAxis tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                    formatter={(v: number | null) => v == null ? "—" : `${v.toFixed(3)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="3 3" />
                  <Line dataKey="ret" type="monotone" stroke={CHART_TEAL} dot={false}
                    name="组合日收益" strokeWidth={1} />
                  <Line dataKey="var" type="monotone" stroke={CHART_RED} dot={false}
                    name={`VaR 阈值 (${(vaRConf*100).toFixed(0)}%)`} strokeWidth={1.5} strokeDasharray="4 3" />
                  <Scatter dataKey="breach" fill={CHART_RED} name="违约" shape="circle" />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                <InlineMath math={`I_t = \\mathbf{1}\\{r_{p,t} < -z_\\alpha \\sigma_{p,t}\\}`} />
                {" "}— 期望频率 {((1 - vaRConf) * 100).toFixed(2).replace(/\.?0+$/, "")}%。簇集出现的红点提示违约非独立 → Christoffersen 拒绝 H0。
              </p>
            </div>
          )}

          <div className="rounded-md border border-gold/20 bg-gold/5 p-3 text-[11px] text-foreground/90 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mb-1">检验公式</div>
            <div>Kupiec POF: <InlineMath math={`LR_{uc} = -2\\ln\\frac{(1-p)^{n_0} p^{n_1}}{(1-\\hat\\pi)^{n_0}\\hat\\pi^{n_1}} \\sim \\chi^2_1`} /></div>
            <div>Christoffersen IND: <InlineMath math={`LR_{ind} \\sim \\chi^2_1`} /> · 条件覆盖 <InlineMath math={`LR_{cc} = LR_{uc} + LR_{ind} \\sim \\chi^2_2`} /></div>
          </div>
        </div>
      )}

      {/* Standardised residual diagnostics */}
      {fit && (
        <div>
          <h4 className="text-sm font-mono uppercase tracking-wider text-foreground mb-2">
            标准化残差散点 (z_i, z_j) — 应近似无关联
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {(() => {
              const pairs: { i: number; j: number }[] = [];
              for (let i = 0; i < fit.uni.length; i++) for (let j = i + 1; j < fit.uni.length; j++)
                pairs.push({ i, j });
              return pairs.slice(0, 4).map(({ i, j }) => {
                const data = fit.uni[i].z.map((zi, t) => ({ x: zi, y: fit.uni[j].z[t] }));
                // Pearson on standardised residuals
                const mx = mean(data.map(d => d.x));
                const my = mean(data.map(d => d.y));
                let sxy = 0, sxx = 0, syy = 0;
                for (const d of data) { sxy += (d.x - mx) * (d.y - my); sxx += (d.x - mx) ** 2; syy += (d.y - my) ** 2; }
                const rho = sxy / Math.sqrt(Math.max(sxx * syy, 1e-12));
                return (
                  <div key={`${i}-${j}`} className="rounded-md border border-border/40 p-2">
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-muted-foreground">{labels[i]} vs {labels[j]}</span>
                      <span className="text-foreground tabular-nums">ρ̄ = {rho.toFixed(3)}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                        <XAxis dataKey="x" tick={{ fill: CHART_TEXT, fontSize: 9 }} domain={[-5, 5]} type="number" />
                        <YAxis dataKey="y" tick={{ fill: CHART_TEXT, fontSize: 9 }} domain={[-5, 5]} type="number" />
                        <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="2 2" />
                        <ReferenceLine x={0} stroke={CHART_TEXT} strokeDasharray="2 2" />
                        <Scatter data={data} fill={PALETTE[(i + j) % PALETTE.length]} fillOpacity={0.35} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Pedagogical box */}
      <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 text-[12px] text-foreground/90 space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">两步 QMLE 估计流程</div>
        <ol className="list-decimal pl-5 space-y-1">
          <li><strong>Step 1</strong> 对每个资产分别 QMLE 估计 GARCH(1,1):
            <InlineMath math={`\\sigma_{i,t}^2 = \\omega_i + \\alpha_i r_{i,t-1}^2 + \\beta_i \\sigma_{i,t-1}^2`} /></li>
          <li>得到标准化残差
            <InlineMath math={`z_{i,t} = r_{i,t} / \\sigma_{i,t}`} />, 应满足
            <InlineMath math={`E[z_{i,t}^2] \\approx 1`} /></li>
          <li><strong>Step 2</strong> 在 z 上估计 DCC(1,1) 参数 (a,b),
            <InlineMath math={`Q_t = (1-a-b)\\bar Q + a z_{t-1}z_{t-1}' + b Q_{t-1}`} /></li>
          <li>归一化为相关矩阵
            <InlineMath math={`R_t = \\mathrm{diag}(Q_t)^{-1/2} Q_t \\mathrm{diag}(Q_t)^{-1/2}`} />,
            然后 <InlineMath math={`\\Sigma_t = D_t R_t D_t`} /> 用于 VaR/对冲。</li>
        </ol>
        <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <strong className="text-foreground">观察要点:</strong> 在危机期, 通常股-债 ρ 由负转正、所有跨资产 ρ 同向逼近 1 — 即"相关性崩塌",
          多元化失效, 组合 VaR 同时被波动率和相关性双双放大。这是 DCC-GARCH 相比静态相关矩阵的核心价值。
        </div>
      </div>
    </div>
  );
};

const SummaryStat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-lg border border-border/60 bg-card/40 p-3">
    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    <div className="text-lg font-display text-foreground tabular-nums mt-1">{value}</div>
    {hint && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{hint}</div>}
  </div>
);

export default DCCGarchTool;