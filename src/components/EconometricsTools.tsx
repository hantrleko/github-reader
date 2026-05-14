import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Line, LineChart, Legend, ComposedChart, ReferenceArea, Area,
} from "recharts";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import PresetButtons, { Preset } from "./PresetButtons";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { HistoryDrawer } from "@/components/common/HistoryDrawer";
import { GARCHTool, CointTool, KalmanTool } from "./econ/Sprint1Tools";
import { MIDASTool } from "./econ/MIDASTool";
import { DCCGarchTool } from "./econ/DCCGarchTool";
import { SyntheticControlTool, StaggeredDIDTool, RegimeSwitchTool } from "./econ/CausalAdvancedTools";
import { LogitProbitTool } from "./econ/LogitProbitTool";
import { QuantileRegTool } from "./econ/QuantileRegTool";
import { PSMTool, ARIMATool, LocalProjectionTool } from "./econ/V21Tools";
import { LassoTool, PanelTool, TobitTool } from "./econ/V22Tools";
import { DLMTool } from "./econ/V23Tools";
import { DoubleMLTool, CausalForestTool, BayesianRegTool } from "./econ/V24Tools";
import { EquationBlock } from "@/components/common/EquationBlock";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ──────────────────  Deterministic PRNG  ────────────────── */
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
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ──────────────────  Linear regression helpers  ────────────────── */
interface OLSResult {
  alpha: number;
  beta: number;
  se_beta: number;
  r2: number;
  n: number;
}
function ols(xs: number[], ys: number[]): OLSResult {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const beta = sxy / sxx;
  const alpha = my - beta * mx;
  // SSR
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const e = ys[i] - (alpha + beta * xs[i]);
    ssr += e * e;
  }
  const sigma2 = ssr / (n - 2);
  const se_beta = Math.sqrt(sigma2 / sxx);
  const r2 = 1 - ssr / syy;
  return { alpha, beta, se_beta, r2, n };
}
/** 2SLS with single instrument z */
function tsls(xs: number[], ys: number[], zs: number[]): OLSResult {
  const first = ols(zs, xs);                // x = π0 + π1 z
  const xhat = zs.map((z) => first.alpha + first.beta * z);
  return ols(xhat, ys);
}

/** Solve Ax = b for small (≤4) symmetric positive-definite systems via Gaussian elimination. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
    if (Math.abs(M[piv][i]) < 1e-12) return null;
    [M[i], M[piv]] = [M[piv], M[i]];
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

/**
 * Weighted local polynomial regression evaluated at x = c.
 * Regresses y on (x-c), (x-c)^2, ..., (x-c)^p with kernel weights.
 * Returns intercept = Ê[Y | X = c] on this side of the cutoff, plus predicted line for plotting.
 */
function localPoly(
  xs: number[],
  ys: number[],
  c: number,
  h: number,
  p: 1 | 2,
  kernel: "triangular" | "uniform" = "triangular",
): { intercept: number; coefs: number[]; n: number } | null {
  const n = xs.length;
  if (n < p + 2) return null;
  const k = p + 1;
  const A: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const b: number[] = new Array(k).fill(0);
  let used = 0;
  for (let i = 0; i < n; i++) {
    const u = (xs[i] - c) / h;
    if (Math.abs(u) > 1) continue;
    const w = kernel === "triangular" ? (1 - Math.abs(u)) : 1;
    if (w <= 0) continue;
    used++;
    const dx = xs[i] - c;
    const row: number[] = [1];
    for (let j = 1; j <= p; j++) row.push(row[j - 1] * dx);
    for (let r = 0; r < k; r++) {
      for (let cc = 0; cc < k; cc++) A[r][cc] += w * row[r] * row[cc];
      b[r] += w * row[r] * ys[i];
    }
  }
  if (used < p + 2) return null;
  const sol = solveLinear(A, b);
  if (!sol) return null;
  return { intercept: sol[0], coefs: sol, n: used };
}

/** Predict from localPoly coefficients at given x. */
function polyPredict(coefs: number[], c: number, x: number): number {
  const dx = x - c;
  let v = 0, p = 1;
  for (let i = 0; i < coefs.length; i++) { v += coefs[i] * p; p *= dx; }
  return v;
}

/**
 * Weighted local polynomial regression with HC0-robust standard error of the intercept
 * (Eicker-Huber-White sandwich on the kernel-weighted least-squares estimator).
 * Used by the CCT bias-corrected RDD estimator.
 */
function localPolySE(
  xs: number[],
  ys: number[],
  c: number,
  h: number,
  p: 1 | 2,
  kernel: "triangular" | "uniform" = "triangular",
): { intercept: number; coefs: number[]; se: number; n: number; sigma2: number } | null {
  const n = xs.length;
  if (n < p + 2) return null;
  const k = p + 1;
  const A: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const bv: number[] = new Array(k).fill(0);
  const rows: { row: number[]; w: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const u = (xs[i] - c) / h;
    if (Math.abs(u) > 1) continue;
    const w = kernel === "triangular" ? (1 - Math.abs(u)) : 1;
    if (w <= 0) continue;
    const dx = xs[i] - c;
    const row: number[] = [1];
    for (let j = 1; j <= p; j++) row.push(row[j - 1] * dx);
    rows.push({ row, w, y: ys[i] });
    for (let r = 0; r < k; r++) {
      for (let cc = 0; cc < k; cc++) A[r][cc] += w * row[r] * row[cc];
      bv[r] += w * row[r] * ys[i];
    }
  }
  if (rows.length < p + 2) return null;
  // Invert A by solving against identity.
  const Ainv: number[][] = [];
  for (let j = 0; j < k; j++) {
    const e = new Array(k).fill(0); e[j] = 1;
    const col = solveLinear(A.map(r => [...r]), e);
    if (!col) return null;
    Ainv.push(col);
  }
  // Coefficients via Ainv * bv.
  const coefs = new Array(k).fill(0);
  for (let r = 0; r < k; r++) for (let j = 0; j < k; j++) coefs[r] += Ainv[r][j] * bv[j];
  // Residuals and meat matrix M = sum w_i^2 e_i^2 x_i x_i'
  let ssr = 0;
  const M: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const { row, w, y } of rows) {
    let yhat = 0;
    for (let r = 0; r < k; r++) yhat += coefs[r] * row[r];
    const e = y - yhat;
    ssr += w * e * e;
    const w2e2 = w * w * e * e;
    for (let r = 0; r < k; r++) for (let cc = 0; cc < k; cc++) M[r][cc] += w2e2 * row[r] * row[cc];
  }
  // V = Ainv * M * Ainv
  const AM: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let r = 0; r < k; r++) for (let cc = 0; cc < k; cc++)
    for (let j = 0; j < k; j++) AM[r][cc] += Ainv[r][j] * M[j][cc];
  const V: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let r = 0; r < k; r++) for (let cc = 0; cc < k; cc++)
    for (let j = 0; j < k; j++) V[r][cc] += AM[r][j] * Ainv[cc][j];
  const v00 = Math.max(V[0][0], 0);
  const sigma2 = ssr / Math.max(rows.length - k, 1);
  return { intercept: coefs[0], coefs, se: Math.sqrt(v00), n: rows.length, sigma2 };
}

/* ════════════════════════════════════════════════════════════
   1. OLS vs IV/2SLS — endogeneity demo
   ════════════════════════════════════════════════════════════ */
const OLSvsIV = () => {
  const [n, setN] = useState(200);
  const [trueBeta, setTrueBeta] = useState(1.0);
  const [endo, setEndo] = useState(0.7);    // Cov(x, ε)
  const [zStrength, setZStrength] = useState(0.8); // Cov(z, x)
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const xs: number[] = [], ys: number[] = [], zs: number[] = [], pts: any[] = [];
    for (let i = 0; i < n; i++) {
      const z = randn(rng);
      const u = randn(rng);
      const ex = randn(rng);
      const ey = randn(rng);
      const x = zStrength * z + endo * u + ex;
      const y = trueBeta * x + u + ey;
      xs.push(x); ys.push(y); zs.push(z);
      pts.push({ x, y, z });
    }
    const olsR = ols(xs, ys);
    const ivR = tsls(xs, ys, zs);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);

    const mx = xs.reduce((a, b) => a + b, 0) / n;
    let sxx = 0;
    for (let i = 0; i < n; i++) sxx += (xs[i] - mx) ** 2;
    const resVar = (a: number, b: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const e = ys[i] - (a + b * xs[i]);
        s += e * e;
      }
      return s / Math.max(n - 2, 1);
    };
    const sigma2_ols = resVar(olsR.alpha, olsR.beta);
    const sigma2_iv = resVar(ivR.alpha, ivR.beta);
    const seFit = (sig2: number, xv: number) =>
      Math.sqrt(sig2 * (1 / n + ((xv - mx) ** 2) / Math.max(sxx, 1e-9)));

    const STEPS = 40;
    const band = Array.from({ length: STEPS + 1 }, (_, i) => {
      const xv = xMin + ((xMax - xMin) * i) / STEPS;
      const yhO = olsR.alpha + olsR.beta * xv;
      const yhI = ivR.alpha + ivR.beta * xv;
      const sO = 1.96 * seFit(sigma2_ols, xv);
      const sI = 1.96 * seFit(sigma2_iv, xv);
      return {
        x: +xv.toFixed(3),
        olsY: +yhO.toFixed(4),
        olsCI: [+(yhO - sO).toFixed(4), +(yhO + sO).toFixed(4)] as [number, number],
        ivY: +yhI.toFixed(4),
        ivCI: [+(yhI - sI).toFixed(4), +(yhI + sI).toFixed(4)] as [number, number],
      };
    });

    return { pts, olsR, ivR, band };
  }, [n, trueBeta, endo, zStrength, seed]);

  // R² history (last 30 parameter changes)
  const historyRef = useRef<{ k: number; ols: number; iv: number }[]>([]);
  const counterRef = useRef(0);
  const [, setHistoryTick] = useState(0);
  useEffect(() => {
    counterRef.current += 1;
    historyRef.current = [
      ...historyRef.current,
      { k: counterRef.current, ols: +data.olsR.r2.toFixed(4), iv: +data.ivR.r2.toFixed(4) },
    ].slice(-30);
    setHistoryTick((t) => t + 1);
  }, [data]);
  const resetHistory = () => {
    historyRef.current = [];
    counterRef.current = 0;
    setHistoryTick((t) => t + 1);
  };

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "强内生性", description: "Cov(x,ε)=0.8, 弱IV", apply: () => { setEndo(0.8); setZStrength(0.4); setTrueBeta(1); } },
        { name: "无内生性", description: "OLS=IV, 教学对照", apply: () => { setEndo(0); setZStrength(0.8); setTrueBeta(1); } },
        { name: "弱工具变量", description: "z·x相关性低", apply: () => { setEndo(0.6); setZStrength(0.15); setTrueBeta(1); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="样本量 n" value={n} min={50} max={1000} step={50} onChange={setN} />
          <Slider label="真实 β" value={trueBeta} min={-2} max={3} step={0.1} onChange={setTrueBeta} />
          <Slider label="内生性 Cov(x, ε)" value={endo} min={0} max={1.2} step={0.05} onChange={setEndo} />
          <Slider label="工具变量强度 Cov(z, x)" value={zStrength} min={0.05} max={1.5} step={0.05} onChange={setZStrength} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <ResultRow label="OLS β̂" value={data.olsR.beta} truth={trueBeta} se={data.olsR.se_beta} color={CHART_RED} />
          <ResultRow label="IV (2SLS) β̂" value={data.ivR.beta} truth={trueBeta} se={data.ivR.se_beta} color={CHART_GOLD} />
          <ResultRow label="OLS R²" value={data.olsR.r2} color={CHART_RED} />
          <ResultRow label="IV R²" value={data.ivR.r2} color={CHART_GOLD} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">解读：</span>当 x 与误差项相关时，OLS 估计系统性偏离真实 β。</p>
            <p>阴影带为拟合值 95% 置信区间 ŷ ± 1.96·SE(ŷ)，SE(ŷ)=σ̂·√(1/n+(x-x̄)²/Sₓₓ)。</p>
            <p>弱工具变量 → IV 阴影带显著变宽，方差放大。</p>
          </div>
        </div>
      </div>

      <div className="h-[340px] mt-4 rounded-xl border border-border p-4 bg-secondary/20">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.band}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 11 }} domain={["dataMin", "dataMax"]} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="olsCI" stroke="none" fill={CHART_RED} fillOpacity={0.13} name="OLS 95% CI" />
            <Area type="monotone" dataKey="ivCI" stroke="none" fill={CHART_GOLD} fillOpacity={0.13} name="IV 95% CI" />
            <Scatter name="样本" data={data.pts} fill={CHART_TEAL} fillOpacity={0.45} dataKey="y" />
            <Line name="OLS 拟合" type="monotone" dataKey="olsY" stroke={CHART_RED} strokeWidth={2} dot={false} />
            <Line name="IV/2SLS 拟合" type="monotone" dataKey="ivY" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-foreground">R² 趋势（最近 {historyRef.current.length} 次参数变化）</h4>
          <button
            onClick={resetHistory}
            className="text-xs px-2 py-1 rounded border border-border hover:border-gold hover:text-gold transition-colors"
          >
            清空
          </button>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyRef.current}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 1]} stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ols" name="OLS R²" stroke={CHART_RED} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="iv" name="IV R²" stroke={CHART_GOLD} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. DID — Difference-in-Differences
   ════════════════════════════════════════════════════════════ */
type DynamicMode = "instant" | "ramp" | "decay";

const DIDTool = () => {
  const [trend, setTrend] = useState(2);
  const [treatLevel, setTreatLevel] = useState(3);
  const [effect, setEffect] = useState(4);
  const [noise, setNoise] = useState(0.5);
  const [seed, setSeed] = useState(7);
  const [preTrendBias, setPreTrendBias] = useState(0);
  const [nUnits, setNUnits] = useState(40);
  const [dynamicMode, setDynamicMode] = useState<DynamicMode>("instant");

  // True per-period treatment effect τ(k) for k>=0, given peak `effect`
  const trueTau = (k: number, mode: DynamicMode, peak: number): number => {
    if (k < 0) return 0;
    if (mode === "instant") return peak;
    if (mode === "ramp") {
      // linear ramp: 0 at k=0 baseline → reaches `peak` by k=3, capped
      const ramp = Math.min((k + 1) / 4, 1);
      return peak * ramp;
    }
    // decay: peak at k=0, exponentially decays toward 0
    return peak * Math.exp(-0.6 * k);
  };

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const T = 8;
    const treatStart = 4;

    // simulate nUnits per group across T periods
    // event-time k = t - treatStart  (k = -4..3)
    const ks: number[] = [];
    for (let t = 0; t < T; t++) ks.push(t - treatStart);

    // collect outcomes per (group, unit, t)
    const ctrlPanel: number[][] = []; // [unit][t]
    const treatPanel: number[][] = [];
    for (let u = 0; u < nUnits; u++) {
      const cFE = randn(rng) * 0.5;       // unit fixed effect
      const tFE = randn(rng) * 0.5;
      const cRow: number[] = [];
      const tRow: number[] = [];
      for (let t = 0; t < T; t++) {
        const c = trend * t + cFE + randn(rng) * noise;
        const k = t - treatStart;
        const bias = preTrendBias * t;
        const tau_t = trueTau(k, dynamicMode, effect);
        const tv = trend * t + treatLevel + bias + tau_t + tFE + randn(rng) * noise;
        cRow.push(c);
        tRow.push(tv);
      }
      ctrlPanel.push(cRow);
      treatPanel.push(tRow);
    }

    // group means per period
    const meanCol = (M: number[][], t: number) => {
      let s = 0; for (let u = 0; u < M.length; u++) s += M[u][t];
      return s / M.length;
    };
    const series: any[] = [];
    for (let t = 0; t < T; t++) {
      series.push({
        t,
        control: +meanCol(ctrlPanel, t).toFixed(3),
        treated: +meanCol(treatPanel, t).toFixed(3),
      });
    }

    // 2x2 ATT
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const cPre = avg(series.slice(0, treatStart).map(d => d.control));
    const cPost = avg(series.slice(treatStart).map(d => d.control));
    const tPre = avg(series.slice(0, treatStart).map(d => d.treated));
    const tPost = avg(series.slice(treatStart).map(d => d.treated));
    const att = (tPost - tPre) - (cPost - cPre);

    // counterfactual (parallel-trends extrapolation)
    const counterfactual = series.map(d => ({
      t: d.t,
      cf: d.t < treatStart ? null : tPre + (d.control - cPre),
    }));
    const merged = series.map((d, i) => ({ ...d, cf: counterfactual[i].cf }));

    // ── Event Study: τ_k = (Ȳ₁,k - Ȳ₁,baseline) - (Ȳ₀,k - Ȳ₀,baseline)
    // baseline = period just before treatment (k = -1, i.e. t = treatStart-1)
    const baseT = treatStart - 1;
    // per-unit differences against own baseline; then group mean diff
    const diffsPerK = (M: number[][], t: number) =>
      M.map((row) => row[t] - row[baseT]);
    const eventRows: any[] = [];
    for (let t = 0; t < T; t++) {
      const k = t - treatStart;
      const trueK = trueTau(k, dynamicMode, effect);
      if (t === baseT) {
        eventRows.push({ k, tau: 0, lo: 0, hi: 0, ci: [0, 0] as [number, number], trueK });
        continue;
      }
      const dT = diffsPerK(treatPanel, t);
      const dC = diffsPerK(ctrlPanel, t);
      const mT = avg(dT), mC = avg(dC);
      const tau_k = mT - mC;
      const varOf = (arr: number[], m: number) =>
        arr.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(arr.length - 1, 1);
      const seK = Math.sqrt(varOf(dT, mT) / nUnits + varOf(dC, mC) / nUnits);
      eventRows.push({
        k,
        tau: +tau_k.toFixed(4),
        lo: +(tau_k - 1.96 * seK).toFixed(4),
        hi: +(tau_k + 1.96 * seK).toFixed(4),
        ci: [+(tau_k - 1.96 * seK).toFixed(4), +(tau_k + 1.96 * seK).toFixed(4)] as [number, number],
        trueK: +trueK.toFixed(4),
      });
    }

    return { series: merged, att, treatStart, eventRows, baseT };
  }, [trend, treatLevel, effect, noise, seed, preTrendBias, nUnits, dynamicMode]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "瞬时跳跃", description: "ATT=4, k≥0 立即生效", apply: () => { setTrend(2); setTreatLevel(3); setEffect(4); setNoise(0.5); setPreTrendBias(0); setDynamicMode("instant"); } },
        { name: "渐进上升", description: "效应逐期累积到峰值", apply: () => { setEffect(4); setPreTrendBias(0); setNoise(0.4); setDynamicMode("ramp"); } },
        { name: "衰减回归", description: "首期峰值后指数衰减", apply: () => { setEffect(5); setPreTrendBias(0); setNoise(0.4); setDynamicMode("decay"); } },
        { name: "违反平行趋势", description: "处理组预期已偏离", apply: () => { setEffect(4); setPreTrendBias(0.6); setNoise(0.4); setDynamicMode("instant"); } },
      ]} />

      {/* Dynamic effect mode selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-muted-foreground">动态效应模式：</span>
        {([
          { id: "instant", label: "瞬时跳跃", desc: "τ_k = ATT 对所有 k≥0" },
          { id: "ramp", label: "渐进上升", desc: "线性爬升至峰值" },
          { id: "decay", label: "衰减回归", desc: "指数衰减 e^(-0.6k)" },
        ] as const).map((m) => (
          <button
            key={m.id}
            onClick={() => setDynamicMode(m.id)}
            title={m.desc}
            className={
              "text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
              (dynamicMode === m.id
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40")
            }
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="共同趋势斜率" value={trend} min={-2} max={5} step={0.1} onChange={setTrend} />
          <Slider label="处理组初始水平差" value={treatLevel} min={-5} max={10} step={0.1} onChange={setTreatLevel} />
          <Slider label="真实政策效应 (ATT)" value={effect} min={-5} max={10} step={0.1} onChange={setEffect} />
          <Slider label="预趋势偏差 (违反PT)" value={preTrendBias} min={-1} max={1} step={0.05} onChange={setPreTrendBias} />
          <Slider label="噪声强度" value={noise} min={0} max={3} step={0.05} onChange={setNoise} />
          <Slider label="每组单位数" value={nUnits} min={10} max={200} step={5} onChange={setNUnits} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <ResultRow label="估计 ATT (2×2 DID)" value={data.att} truth={effect} se={NaN} color={CHART_GOLD} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">2×2 DID：</span>τ̂ = (Ȳ₁ₚₒₛₜ − Ȳ₁ₚᵣₑ) − (Ȳ₀ₚₒₛₜ − Ȳ₀ₚᵣₑ)</p>
            <p><span className="text-gold">事件研究：</span>τ_k = (Ȳ₁,k − Ȳ₁,−1) − (Ȳ₀,k − Ȳ₀,−1)，k=−1 为基准期 (固定为 0)。</p>
            <p>k&lt;0 的 τ_k 显著非零 → 平行趋势假设被违反；k≥0 即动态处理效应。</p>
          </div>
        </div>
      </div>

      <div className="h-[300px] mt-4 rounded-xl border border-border p-4 bg-secondary/20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.series}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "期 t", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 11 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={data.treatStart} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "政策实施", fill: CHART_GOLD, fontSize: 10, position: "top" }} />
            <Line dataKey="control" name="控制组均值" stroke={CHART_TEAL} strokeWidth={2} dot={{ r: 3 }} />
            <Line dataKey="treated" name="处理组均值" stroke={CHART_GOLD} strokeWidth={2} dot={{ r: 3 }} />
            <Line dataKey="cf" name="反事实 (平行趋势)" stroke={CHART_RED} strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Event Study panel */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-foreground">事件研究 (Event Study) τ_k ± 95% CI</h4>
          <span className="text-[10px] font-mono text-muted-foreground">基准期 k=−1（设为 0）</span>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.eventRows}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "事件时间 k", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="2 2" />
              <ReferenceLine x={-0.5} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "处理前 / 处理后", fill: CHART_GOLD, fontSize: 10, position: "top" }} />
              <Area dataKey="ci" stroke="none" fill={CHART_GOLD} fillOpacity={0.18} name="95% CI" />
              <Line dataKey="trueK" name="真实 τ_k (DGP)" stroke={CHART_RED} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} />
              <Line dataKey="tau" name="估计 τ̂_k" stroke={CHART_GOLD} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground font-mono">
          金线为 τ̂_k 估计 + 95% CI 阴影；红虚线为 DGP 设定的真实 τ_k 路径。当前模式：
          <span className="text-gold ml-1">
            {dynamicMode === "instant" && "瞬时跳跃 — k≥0 立即达到峰值并保持"}
            {dynamicMode === "ramp" && "渐进上升 — 政策效应需要时间累积"}
            {dynamicMode === "decay" && "衰减回归 — 首期冲击大、后期消退"}
          </span>。
          k&lt;0 的 CI 应覆盖 0 → 平行趋势成立。
        </p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. RDD — Sharp Regression Discontinuity
   ════════════════════════════════════════════════════════════ */
type RDDMode = "sharp" | "fuzzy";

const RDDTool = () => {
  const [n, setN] = useState(300);
  const [cutoff, setCutoff] = useState(0);
  const [jump, setJump] = useState(3);
  const [slopeL, setSlopeL] = useState(1);
  const [slopeR, setSlopeR] = useState(1);
  const [noise, setNoise] = useState(0.8);
  const [seed, setSeed] = useState(11);
  const [bandwidth, setBandwidth] = useState(2);
  const [bwMethod, setBwMethod] = useState<"manual" | "rot" | "cct">("manual");
  const [manipulation, setManipulation] = useState(0);
  const [mode, setMode] = useState<RDDMode>("sharp");
  const [pBelow, setPBelow] = useState(0.10); // P(D=1 | X<c) — always-takers
  const [pAbove, setPAbove] = useState(0.75); // P(D=1 | X≥c) — compliers + always-takers
  // Note: for sharp RDD these are forced to 0 / 1.
  // ── New: Donut RDD, polynomial order, kernel, Placebo cutoff ──
  const [donut, setDonut] = useState(0);                       // donut hole half-width δ; drop |x-c| ≤ δ
  const [polyOrder, setPolyOrder] = useState<1 | 2>(1);        // local linear (1) or local quadratic (2)
  const [kernel, setKernel] = useState<"triangular" | "uniform">("triangular");
  const [placeboShift, setPlaceboShift] = useState(1.5);       // false cutoff = c + shift; expect τ̂≈0

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const pBel = mode === "sharp" ? 0 : pBelow;
    const pAbo = mode === "sharp" ? 1 : pAbove;

    const pts: { x: number; y: number; treated: number; D: number }[] = [];
    for (let i = 0; i < n; i++) {
      let x = (rng() - 0.5) * 10;
      if (manipulation > 0 && x < cutoff && x > cutoff - 1.0) {
        if (rng() < manipulation) {
          x = cutoff + rng() * 0.5;
        }
      }
      const aboveCutoff = x >= cutoff ? 1 : 0;
      // assignment Z = 1 if x >= c. Treatment receipt D depends on probability.
      const probD = aboveCutoff ? pAbo : pBel;
      const D = rng() < probD ? 1 : 0;
      const slope = aboveCutoff ? slopeR : slopeL;
      // Outcome depends on actual treatment receipt D (not on Z)
      const y = slope * (x - cutoff) + D * jump + randn(rng) * noise;
      pts.push({ x, y, treated: D, D });
    }

    // ── Donut hole: drop observations within ±δ of the (real) cutoff ──
    const ptsAfterDonut = donut > 0 ? pts.filter(p => Math.abs(p.x - cutoff) > donut) : pts;
    const nKept = ptsAfterDonut.length;

    // helper: local-poly fit on one side, then build a 2-point line for plotting on [c-h, c]/[c, c+h]
    const fitSide = (
      pool: typeof pts,
      side: "left" | "right",
      target: "y" | "D",
      cval: number,
      h: number,
    ) => {
      const sub = side === "left"
        ? pool.filter(p => p.x < cval && p.x >= cval - h)
        : pool.filter(p => p.x >= cval && p.x <= cval + h);
      if (sub.length < polyOrder + 2) return null;
      const xs = sub.map(p => p.x);
      const ys = sub.map(p => (target === "y" ? p.y : p.D));
      // For one-sided local poly we use 2*h as kernel bandwidth so all sub points get positive weight
      // and "triangular" weight is computed wrt distance from c.
      const fit = localPoly(xs, ys, cval, h, polyOrder, kernel);
      return fit;
    };

    // ── Local-poly fits on Y (reduced form / sharp τ̂) at the real cutoff ──
    const fitLY = fitSide(ptsAfterDonut, "left", "y", cutoff, bandwidth);
    const fitRY = fitSide(ptsAfterDonut, "right", "y", cutoff, bandwidth);
    const yL = fitLY ? fitLY.intercept : NaN;
    const yR = fitRY ? fitRY.intercept : NaN;
    const tauSharp = yR - yL;     // reduced-form jump in Y at c
    const lineL = fitLY
      ? Array.from({ length: 21 }, (_, i) => {
          const x = cutoff - bandwidth + (i / 20) * bandwidth;
          return { x, y: polyPredict(fitLY.coefs, cutoff, x) };
        })
      : [];
    const lineR = fitRY
      ? Array.from({ length: 21 }, (_, i) => {
          const x = cutoff + (i / 20) * bandwidth;
          return { x, y: polyPredict(fitRY.coefs, cutoff, x) };
        })
      : [];

    // ── First-stage local-poly on D (probability of treatment) ──
    const fitLD = fitSide(ptsAfterDonut, "left", "D", cutoff, bandwidth);
    const fitRD = fitSide(ptsAfterDonut, "right", "D", cutoff, bandwidth);
    const dL = fitLD ? Math.min(Math.max(fitLD.intercept, 0), 1) : NaN;
    const dR = fitRD ? Math.min(Math.max(fitRD.intercept, 0), 1) : NaN;
    const dJump = dR - dL;        // first-stage jump
    const dLineL = fitLD
      ? Array.from({ length: 21 }, (_, i) => {
          const x = cutoff - bandwidth + (i / 20) * bandwidth;
          return { x, p: polyPredict(fitLD.coefs, cutoff, x) };
        })
      : [];
    const dLineR = fitRD
      ? Array.from({ length: 21 }, (_, i) => {
          const x = cutoff + (i / 20) * bandwidth;
          return { x, p: polyPredict(fitRD.coefs, cutoff, x) };
        })
      : [];

    // ── Wald / Fuzzy estimator ──
    const tauWald = mode === "fuzzy" ? tauSharp / (Math.abs(dJump) > 1e-6 ? dJump : NaN) : tauSharp;

    // ── Rule-of-Thumb optimal bandwidth (simplified IK-style) ──
    // h_ROT = 1.84 * σ_X * n^{-1/5}; serves as a coarse data-driven suggestion.
    const allX = ptsAfterDonut.map(p => p.x);
    const meanX = allX.reduce((a, b) => a + b, 0) / Math.max(allX.length, 1);
    const varX = allX.reduce((a, b) => a + (b - meanX) ** 2, 0) / Math.max(allX.length - 1, 1);
    const hROT = 1.84 * Math.sqrt(Math.max(varX, 1e-6)) * Math.pow(Math.max(nKept, 1), -1 / 5);

    // ── CCT (Calonico-Cattaneo-Titiunik 2014) MSE-optimal bandwidth & robust bias-corrected inference ──
    // Pilot stage: fit local quadratic on each side over a wide pilot bandwidth to estimate
    //   • σ²(c±)  (residual variance near the cutoff)
    //   • m''(c±) = 2 · γ₂ from the quadratic coefficient
    //   • f̂_X(c)  (density of the running variable at c)
    // Then h_CCT = ( V / (4 n B²) )^{1/5}, B = μ₂(K)·[m''_R − m''_L]/2, V = (σ²_L+σ²_R)/f̂_X(c).
    // For the triangular kernel μ₂ = ∫_{-1}^{1} u² K(u) du = 1/6.
    const hPilot = Math.max(0.8 * (allX.length ? (Math.max(...allX) - Math.min(...allX)) : 1), 2 * hROT);
    const leftSub = ptsAfterDonut.filter(p => p.x < cutoff && p.x >= cutoff - hPilot);
    const rightSub = ptsAfterDonut.filter(p => p.x >= cutoff && p.x <= cutoff + hPilot);
    const pilotL = leftSub.length >= 4
      ? localPolySE(leftSub.map(p => p.x), leftSub.map(p => p.y), cutoff, hPilot, 2, kernel) : null;
    const pilotR = rightSub.length >= 4
      ? localPolySE(rightSub.map(p => p.x), rightSub.map(p => p.y), cutoff, hPilot, 2, kernel) : null;
    const m2L = pilotL ? 2 * (pilotL.coefs[2] ?? 0) : 0;
    const m2R = pilotR ? 2 * (pilotR.coefs[2] ?? 0) : 0;
    const sig2L = pilotL ? pilotL.sigma2 : 1;
    const sig2R = pilotR ? pilotR.sigma2 : 1;
    const fHatX = Math.max((leftSub.length + rightSub.length) / Math.max(2 * hPilot * Math.max(nKept, 1), 1e-6), 1e-6);
    const mu2K = kernel === "triangular" ? 1 / 6 : 1 / 3;
    const Bconst = (mu2K / 2) * (m2R - m2L);
    const Vconst = (sig2L + sig2R) / fHatX;
    const hCCT = Math.abs(Bconst) > 1e-6
      ? Math.pow(Vconst / (4 * Math.max(nKept, 1) * Bconst * Bconst), 1 / 5)
      : hROT; // degenerate (no curvature) → fall back to ROT
    const hCCTclamped = Math.min(Math.max(hCCT, 0.3), 6);

    // ── Robust bias-corrected estimator at the *current* bandwidth h ──
    // τ̂_bc = τ̂_ll(h) − h² · μ₂ · [m''_R − m''_L]/2 (using pilot m'' from above).
    // SE_bc combines HC-robust local-linear SEs plus the CCT variance-inflation (ρ = h/b, here b=hPilot).
    const llL = fitLY ? localPolySE(
      ptsAfterDonut.filter(p => p.x < cutoff && p.x >= cutoff - bandwidth).map(p => p.x),
      ptsAfterDonut.filter(p => p.x < cutoff && p.x >= cutoff - bandwidth).map(p => p.y),
      cutoff, bandwidth, 1, kernel,
    ) : null;
    const llR = fitRY ? localPolySE(
      ptsAfterDonut.filter(p => p.x >= cutoff && p.x <= cutoff + bandwidth).map(p => p.x),
      ptsAfterDonut.filter(p => p.x >= cutoff && p.x <= cutoff + bandwidth).map(p => p.y),
      cutoff, bandwidth, 1, kernel,
    ) : null;
    const seConv = (llL && llR) ? Math.sqrt(llL.se * llL.se + llR.se * llR.se) : NaN;
    const biasEst = (bandwidth * bandwidth) * mu2K * (m2R - m2L) / 2;
    const tauBC = tauSharp - biasEst;
    const rho = bandwidth / Math.max(hPilot, 1e-6);
    // CCT-style variance inflation factor (educational approximation): 1 + ρ²·(small constant).
    const seBC = isFinite(seConv) ? seConv * Math.sqrt(1 + 0.5 * rho * rho) : NaN;
    const zBC = isFinite(seBC) && seBC > 0 ? tauBC / seBC : NaN;
    const erfcLocal = (v: number) => {
      const t = 1 / (1 + 0.3275911 * Math.abs(v));
      const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-v * v);
      return v >= 0 ? 1 - y : 1 + y;
    };
    const pBC = isFinite(zBC) ? erfcLocal(Math.abs(zBC) / Math.SQRT2) : NaN;
    const ciBClo = tauBC - 1.96 * seBC;
    const ciBChi = tauBC + 1.96 * seBC;

    // ── Placebo cutoff (false cutoff at c + placeboShift). Expect τ̂_placebo ≈ 0. ──
    const cFalse = cutoff + placeboShift;
    const fitLYp = fitSide(ptsAfterDonut, "left", "y", cFalse, bandwidth);
    const fitRYp = fitSide(ptsAfterDonut, "right", "y", cFalse, bandwidth);
    const tauPlacebo =
      fitLYp && fitRYp ? fitRYp.intercept - fitLYp.intercept : NaN;

    // density rows for McCrary (unchanged)
    const xs = pts.map(p => p.x);
    const xMin = -5, xMax = 5;
    const binW = 0.25;
    const edgesL: number[] = [];
    for (let e = cutoff; e > xMin - binW; e -= binW) edgesL.unshift(e);
    const edgesR: number[] = [];
    for (let e = cutoff; e < xMax + binW; e += binW) edgesR.push(e);
    const counts: { mid: number; count: number; side: -1 | 1 }[] = [];
    for (let i = 0; i < edgesL.length - 1; i++) {
      const lo = edgesL[i], hi = edgesL[i + 1];
      const c = xs.filter(x => x >= lo && x < hi).length;
      counts.push({ mid: (lo + hi) / 2, count: c, side: -1 });
    }
    for (let i = 0; i < edgesR.length - 1; i++) {
      const lo = edgesR[i], hi = edgesR[i + 1];
      const c = xs.filter(x => x >= lo && x < hi).length;
      counts.push({ mid: (lo + hi) / 2, count: c, side: 1 });
    }
    const densityRows = counts.map(c => ({
      mid: +c.mid.toFixed(3),
      density: +(c.count / (n * binW)).toFixed(4),
      side: c.side,
      densityL: c.side === -1 ? +(c.count / (n * binW)).toFixed(4) : null,
      densityR: c.side === 1 ? +(c.count / (n * binW)).toFixed(4) : null,
    }));
    const leftBins = counts.filter(c => c.side === -1 && c.mid >= cutoff - bandwidth);
    const rightBins = counts.filter(c => c.side === 1 && c.mid <= cutoff + bandwidth);
    let fHatL = NaN, fHatR = NaN;
    if (leftBins.length >= 3) {
      const olsBL = ols(leftBins.map(b => b.mid), leftBins.map(b => b.count / (n * binW)));
      fHatL = Math.max(olsBL.alpha + olsBL.beta * cutoff, 1e-6);
    }
    if (rightBins.length >= 3) {
      const olsBR = ols(rightBins.map(b => b.mid), rightBins.map(b => b.count / (n * binW)));
      fHatR = Math.max(olsBR.alpha + olsBR.beta * cutoff, 1e-6);
    }
    const theta = Math.log(fHatR) - Math.log(fHatL);
    const seTheta = Math.sqrt(1 / (n * bandwidth * fHatL) + 1 / (n * bandwidth * fHatR));
    const z = theta / seTheta;
    const erfc = (v: number) => {
      const t = 1 / (1 + 0.3275911 * Math.abs(v));
      const y = 1 - (((((
        1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-v * v);
      return v >= 0 ? 1 - y : 1 + y;
    };
    const pVal = erfc(Math.abs(z) / Math.SQRT2);
    const densLineL =
      leftBins.length >= 3
        ? [
            { mid: cutoff - bandwidth, fit: fHatL + (ols(leftBins.map(b => b.mid), leftBins.map(b => b.count / (n * binW)))).beta * (-bandwidth) },
            { mid: cutoff, fit: fHatL },
          ]
        : [];
    const densLineR =
      rightBins.length >= 3
        ? [
            { mid: cutoff, fit: fHatR },
            { mid: cutoff + bandwidth, fit: fHatR + (ols(rightBins.map(b => b.mid), rightBins.map(b => b.count / (n * binW)))).beta * (bandwidth) },
          ]
        : [];

    return {
      pts, tauSharp, tauWald, lineL, lineR, yL, yR,
      dL, dR, dJump, dLineL, dLineR,
      densityRows, fHatL, fHatR, theta, seTheta, z, pVal, densLineL, densLineR,
      nKept, hROT, tauPlacebo, cFalse,
      hCCT: hCCTclamped, tauBC, seBC, zBC, pBC, ciBClo, ciBChi, seConv, biasEst, m2L, m2R,
    };
  }, [n, cutoff, jump, slopeL, slopeR, noise, seed, bandwidth, manipulation, mode, pBelow, pAbove, donut, polyOrder, kernel, placeboShift]);

  // Auto-sync bandwidth to selected data-driven method (ROT or CCT) whenever it changes.
  useEffect(() => {
    if (bwMethod === "manual") return;
    const target = bwMethod === "rot" ? data.hROT : data.hCCT;
    if (!isFinite(target)) return;
    const clamped = +Math.max(0.5, Math.min(5, target)).toFixed(2);
    if (Math.abs(clamped - bandwidth) > 1e-3) setBandwidth(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bwMethod, data.hROT, data.hCCT]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "清晰跳跃 (Sharp)", description: "确定性处理 τ=3", apply: () => { setMode("sharp"); setJump(3); setNoise(0.5); setBandwidth(2); setManipulation(0); } },
        { name: "Fuzzy 高顺从", description: "0.10 → 0.85, 强工具", apply: () => { setMode("fuzzy"); setPBelow(0.10); setPAbove(0.85); setJump(3); setNoise(0.5); setBandwidth(2); setManipulation(0); setN(800); } },
        { name: "Fuzzy 弱跳跃", description: "0.30 → 0.45, 弱工具", apply: () => { setMode("fuzzy"); setPBelow(0.30); setPAbove(0.45); setJump(3); setNoise(0.5); setBandwidth(2); setN(1200); } },
        { name: "存在操纵", description: "个体跳到切点之上", apply: () => { setMode("sharp"); setJump(3); setNoise(0.5); setManipulation(0.7); setN(600); } },
        { name: "Donut 修正", description: "存在操纵 + δ=0.5 剔除", apply: () => { setMode("sharp"); setJump(3); setNoise(0.5); setManipulation(0.7); setN(600); setDonut(0.5); } },
        { name: "局部二次拟合", description: "polyOrder=2，缓解边界偏误", apply: () => { setPolyOrder(2); setBandwidth(3); setNoise(0.6); } },
      ]} />

      {/* Mode toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-muted-foreground">RDD 模式：</span>
        {([
          { id: "sharp" as const, label: "Sharp RDD", desc: "D = 1{X≥c} 确定性" },
          { id: "fuzzy" as const, label: "Fuzzy RDD", desc: "D 概率性跳跃, 用 Wald" },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.desc}
            className={
              "text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
              (mode === m.id
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40")
            }
          >
            {m.label}
          </button>
        ))}
        <span className="text-xs font-mono text-muted-foreground ml-3">多项式阶数：</span>
        {([1, 2] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPolyOrder(p)}
            className={
              "text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
              (polyOrder === p
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40")
            }
          >
            {p === 1 ? "Local Linear" : "Local Quadratic"}
          </button>
        ))}
        <span className="text-xs font-mono text-muted-foreground ml-3">核函数：</span>
        {(["triangular", "uniform"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKernel(k)}
            className={
              "text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
              (kernel === k
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40")
            }
          >
            {k === "triangular" ? "Triangular" : "Uniform"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="样本量 n" value={n} min={50} max={2000} step={50} onChange={setN} />
          <Slider label="切点 c" value={cutoff} min={-3} max={3} step={0.1} onChange={setCutoff} />
          <Slider label="真实跳跃 τ" value={jump} min={-5} max={8} step={0.1} onChange={setJump} />
          <Slider label="左侧斜率" value={slopeL} min={-2} max={3} step={0.1} onChange={setSlopeL} />
          <Slider label="右侧斜率" value={slopeR} min={-2} max={3} step={0.1} onChange={setSlopeR} />
          <Slider label="噪声 σ" value={noise} min={0.1} max={3} step={0.05} onChange={setNoise} />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">带宽选择：</span>
            {([
              { id: "manual" as const, label: "手动", desc: "拖动滑块自由设定" },
              { id: "rot" as const, label: `ROT (${data.hROT.toFixed(2)})`, desc: "Rule-of-Thumb h ≈ 1.84·σ̂_X·n^(-1/5)" },
              { id: "cct" as const, label: `CCT (${data.hCCT.toFixed(2)})`, desc: "Calonico-Cattaneo-Titiunik MSE-optimal h" },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setBwMethod(m.id)}
                title={m.desc}
                className={
                  "text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
                  (bwMethod === m.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40")
                }
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Slider
                label={`带宽 h${bwMethod !== "manual" ? ` · ${bwMethod.toUpperCase()} 自动` : ""}`}
                value={bandwidth} min={0.5} max={5} step={0.1}
                onChange={(v) => { setBwMethod("manual"); setBandwidth(v); }}
              />
            </div>
            <button
              onClick={() => setBwMethod("rot")}
              title={`Rule-of-Thumb h ≈ 1.84·σ̂_X·n^(-1/5) = ${data.hROT.toFixed(3)}`}
              className="text-[10px] font-mono px-2 py-1 rounded border border-gold/60 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap mb-2"
            >
              用 ROT h ({data.hROT.toFixed(2)})
            </button>
            <button
              onClick={() => setBwMethod("cct")}
              title={`CCT MSE-optimal h ≈ (V / 4nB²)^{1/5} = ${data.hCCT.toFixed(3)}`}
              className="text-[10px] font-mono px-2 py-1 rounded border border-gold/60 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap mb-2"
            >
              用 CCT h ({data.hCCT.toFixed(2)})
            </button>
          </div>
          <Slider label="Donut 半径 δ (剔除 |X−c|≤δ)" value={donut} min={0} max={1} step={0.05} onChange={setDonut} />
          <Slider label="操纵概率 (just-below 跳到 just-above)" value={manipulation} min={0} max={1} step={0.05} onChange={setManipulation} />
          <Slider label="假断点偏移 (Placebo)" value={placeboShift} min={-3} max={3} step={0.1} onChange={setPlaceboShift} />
          {mode === "fuzzy" && (
            <>
              <Slider label="P(D=1 | X<c)  (always-takers)" value={pBelow} min={0} max={1} step={0.05} onChange={setPBelow} />
              <Slider label="P(D=1 | X≥c)" value={pAbove} min={0} max={1} step={0.05} onChange={setPAbove} />
            </>
          )}
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <ResultRow
            label={mode === "fuzzy" ? "Wald 估计 τ̂ = ΔY/ΔD" : "局部线性 τ̂"}
            value={data.tauWald}
            truth={jump}
            color={CHART_GOLD}
          />
          {mode === "fuzzy" && (
            <>
              <ResultRow label="reduced-form ΔY = Y(c⁺)−Y(c⁻)" value={data.tauSharp} color={CHART_BLUE} />
              <ResultRow
                label="first-stage ΔD = P̂(c⁺)−P̂(c⁻)"
                value={data.dJump}
                color={Math.abs(data.dJump) < 0.1 ? CHART_RED : CHART_TEAL}
              />
            </>
          )}
          {mode === "sharp" && (
            <>
              <ResultRow label="切点左极限 Y(c⁻)" value={data.yL} color={CHART_TEAL} />
              <ResultRow label="切点右极限 Y(c⁺)" value={data.yR} color={CHART_RED} />
            </>
          )}
          <ResultRow
            label={`Placebo τ̂ @ c'=${data.cFalse.toFixed(2)} (期望≈0)`}
            value={data.tauPlacebo}
            color={Math.abs(data.tauPlacebo) > Math.abs(jump) * 0.3 ? CHART_RED : CHART_TEAL}
          />
          <div className="rounded-lg border border-gold/40 bg-gold/5 p-3 space-y-1 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-gold font-bold">CCT 偏差校正稳健推断</span>
              <span className="text-[10px] text-muted-foreground">h_CCT={data.hCCT.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">τ̂_bc = τ̂_ll − ĥ²·μ₂·(m̂″_R−m̂″_L)/2</span>
              <span className="text-foreground">{isFinite(data.tauBC) ? data.tauBC.toFixed(3) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">偏差估计 b̂(h)</span>
              <span className="text-foreground">{isFinite(data.biasEst) ? data.biasEst.toFixed(3) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">robust SE</span>
              <span className="text-foreground">{isFinite(data.seBC) ? data.seBC.toFixed(3) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">z / p-value</span>
              <span className="text-foreground">
                {isFinite(data.zBC) ? data.zBC.toFixed(2) : "—"} / {isFinite(data.pBC) ? data.pBC.toFixed(3) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">95% CI (robust)</span>
              <span className="text-foreground">
                [{isFinite(data.ciBClo) ? data.ciBClo.toFixed(2) : "—"}, {isFinite(data.ciBChi) ? data.ciBChi.toFixed(2) : "—"}]
              </span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground px-2">
            实际用于估计的样本（去除 donut 后）：<span className="text-foreground">{data.nKept}</span> / {n}
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            {mode === "sharp" ? (
              <>
                <p><span className="text-gold">Sharp：</span>τ = lim_{"{x→c⁺}"} E[Y|X] − lim_{"{x→c⁻}"} E[Y|X]</p>
                <p>处理在切点处确定性变化（D=1{"{X≥c}"}），τ̂ 即为 Y 的局部线性跳跃。</p>
              </>
            ) : (
              <>
                <p><span className="text-gold">Fuzzy / Wald：</span>τ = (lim Y⁺−lim Y⁻) / (lim P(D=1)⁺−lim P(D=1)⁻)</p>
                <p>把 Z=1{"{X≥c}"} 视为工具变量，τ 是 LATE（complier 的局部平均处理效应）。</p>
                <p>第一阶段 ΔD 越大 → 工具越强；ΔD→0 时 Wald 方差爆炸（弱工具问题）。</p>
              </>
            )}
            <p>带宽 h 越小偏差越小但方差越大 (bias-variance trade-off)。</p>
            <p className="mt-1"><span className="text-gold">Donut RDD：</span>剔除 |X−c|≤δ 的样本以缓解 heaping / 操纵性堆积造成的偏误 (Barreca et al. 2011)。</p>
            <p><span className="text-gold">Placebo：</span>在非处理位置 c′ 跑同样估计；若 |τ̂(c′)| 显著非零则识别假设可疑。</p>
            <p><span className="text-gold">局部多项式：</span>p=2 减小边界偏误（O(h³) vs O(h²)）但方差更大；推荐 p=1 + Triangular kernel (CCT)。</p>
            <p className="mt-1"><span className="text-gold">CCT 带宽 (Calonico-Cattaneo-Titiunik 2014)：</span>
              h* = (V / 4nB²)^{"{1/5}"}，其中 B = μ₂(K)·[m″(c⁺)−m″(c⁻)]/2 由 pilot 局部二次拟合估计，V = (σ²_L+σ²_R)/f̂_X(c)。
              比 ROT 更接近真正最小化渐近 MSE 的最优带宽，但需要二阶导数与密度估计。</p>
            <p><span className="text-gold">偏差校正稳健推断：</span>
              τ̂_bc = τ̂_ll(h) − ĥ²·μ₂·(m̂″_R−m̂″_L)/2 显式扣除主导偏差项；
              robust SE 在常规 HC0 sandwich 上加入因 bias 估计带来的方差膨胀因子，
              使 t 统计量在 MSE-optimal 带宽下仍渐近正确（Calonico, Cattaneo, Titiunik 2014; Cattaneo et al. 2020）。</p>
          </div>
        </div>
      </div>

      {/* Outcome RDD plot */}
      <div className="h-[340px] mt-4 rounded-xl border border-border p-4 bg-secondary/20">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" domain={[-5, 5]} stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="y" stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceArea x1={cutoff - bandwidth} x2={cutoff + bandwidth} fill={CHART_GOLD} fillOpacity={0.05} />
            <ReferenceLine x={cutoff} stroke={CHART_GOLD} strokeDasharray="4 4" />
            <Scatter name="未接受处理 (D=0)" data={data.pts.filter(p => p.D === 0)} fill={CHART_TEAL} fillOpacity={0.45} />
            <Scatter name="接受处理 (D=1)" data={data.pts.filter(p => p.D === 1)} fill={CHART_RED} fillOpacity={0.45} />
            <Line name="左侧拟合 E[Y|X]" data={data.lineL} dataKey="y" stroke={CHART_TEAL} strokeWidth={2.5} dot={false} />
            <Line name="右侧拟合 E[Y|X]" data={data.lineR} dataKey="y" stroke={CHART_RED} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* First-stage chart (fuzzy only) */}
      {mode === "fuzzy" && (
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h4 className="text-sm font-semibold text-foreground">第一阶段：P(D=1 | X) 在切点处跳跃</h4>
            <div className="flex gap-3 text-[11px] font-mono">
              <span>P̂(c⁻) = <span style={{color: CHART_TEAL}}>{Number.isFinite(data.dL) ? data.dL.toFixed(3) : "—"}</span></span>
              <span>P̂(c⁺) = <span style={{color: CHART_RED}}>{Number.isFinite(data.dR) ? data.dR.toFixed(3) : "—"}</span></span>
              <span>ΔD = <span className="text-gold font-bold">{Number.isFinite(data.dJump) ? data.dJump.toFixed(3) : "—"}</span></span>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" domain={[-5, 5]} stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "跑分变量 X", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis type="number" domain={[0, 1]} stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "P(D=1|X)", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceArea x1={cutoff - bandwidth} x2={cutoff + bandwidth} fill={CHART_GOLD} fillOpacity={0.05} />
                <ReferenceLine x={cutoff} stroke={CHART_GOLD} strokeDasharray="4 4" />
                <Scatter
                  name="个体处理状态 D"
                  data={data.pts.map(p => ({ x: p.x, p: p.D + (Math.random() - 0.5) * 0.04 }))}
                  dataKey="p"
                  fill={CHART_BLUE}
                  fillOpacity={0.35}
                />
                <Line name="左侧 P̂(D=1|X)" data={data.dLineL} dataKey="p" stroke={CHART_TEAL} strokeWidth={2.5} dot={false} />
                <Line name="右侧 P̂(D=1|X)" data={data.dLineR} dataKey="p" stroke={CHART_RED} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] font-mono text-muted-foreground leading-relaxed">
            <span className="text-gold">Wald = ΔY / ΔD = </span>
            {Number.isFinite(data.tauSharp) ? data.tauSharp.toFixed(3) : "—"} / {Number.isFinite(data.dJump) ? data.dJump.toFixed(3) : "—"}
            {" = "}
            <span className="text-gold font-bold">{Number.isFinite(data.tauWald) ? data.tauWald.toFixed(3) : "—"}</span>
            。当 ΔD 接近 0（弱工具），Wald 估计极不稳定 — 注意提高 P(D=1|X≥c) 与 P(D=1|X&lt;c) 的差距。
          </p>
        </div>
      )}

      {/* McCrary density test panel */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h4 className="text-sm font-semibold text-foreground">McCrary 密度检验</h4>
          <div className="flex gap-3 text-[11px] font-mono">
            <span>f̂(c⁻) = <span style={{color: CHART_TEAL}}>{isFinite(data.fHatL) ? data.fHatL.toFixed(4) : "—"}</span></span>
            <span>f̂(c⁺) = <span style={{color: CHART_RED}}>{isFinite(data.fHatR) ? data.fHatR.toFixed(4) : "—"}</span></span>
            <span>θ̂ = log f̂(c⁺)−log f̂(c⁻) = <span className="text-gold">{isFinite(data.theta) ? data.theta.toFixed(3) : "—"}</span></span>
            <span>z = <span className="text-gold">{isFinite(data.z) ? data.z.toFixed(2) : "—"}</span></span>
            <span>p = <span className="font-bold" style={{color: Math.abs(data.z) > 1.96 ? CHART_RED : CHART_TEAL}}>
              {isFinite(data.pVal) ? data.pVal.toFixed(4) : "—"}
            </span></span>
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.densityRows}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="mid" type="number" domain={[-5, 5]} stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "跑分变量 X", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "密度 f̂(X)", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={cutoff} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "c", fill: CHART_GOLD, fontSize: 10, position: "top" }} />
              <ReferenceArea x1={cutoff - bandwidth} x2={cutoff + bandwidth} fill={CHART_GOLD} fillOpacity={0.04} />
              {/* Histogram bars via thin scatters with size proxy is messy; use Line of two side series */}
              <Scatter name="左侧密度 (X<c)" data={data.densityRows.filter(d => d.side === -1)} dataKey="density" fill={CHART_TEAL} />
              <Scatter name="右侧密度 (X≥c)" data={data.densityRows.filter(d => d.side === 1)} dataKey="density" fill={CHART_RED} />
              <Line name="左侧局部线性" data={data.densLineL} dataKey="fit" stroke={CHART_TEAL} strokeWidth={2.5} dot={false} />
              <Line name="右侧局部线性" data={data.densLineR} dataKey="fit" stroke={CHART_RED} strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 text-[11px] font-mono text-muted-foreground leading-relaxed">
          <p><span className="text-gold">McCrary (2008)：</span>检验跑分变量密度 f(X) 在切点 c 处是否连续。原假设 H₀: f(c⁻)=f(c⁺)。</p>
          <p>检验量 θ̂ = log f̂(c⁺) − log f̂(c⁻)，SE(θ̂) ≈ √(1/(nh·f̂(c⁻)) + 1/(nh·f̂(c⁺)))，z = θ̂/SE。</p>
          <p>|z| &gt; 1.96 (p &lt; 0.05) → <span style={{color: CHART_RED}} className="font-bold">拒绝 H₀，存在操纵迹象</span>，RDD 估计可疑；否则不能拒绝连续性。</p>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   4. GMM — moment-based estimator demo (mean of distribution)
   ════════════════════════════════════════════════════════════ */
const GMMTool = () => {
  const [trueMu, setTrueMu] = useState(2);
  const [trueSigma, setTrueSigma] = useState(1.5);
  const [n, setN] = useState(200);
  const [w1, setW1] = useState(0.5);  // weight on first moment
  const [seed, setSeed] = useState(99);

  const [includeM3, setIncludeM3] = useState(false);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const xs: number[] = [];
    for (let i = 0; i < n; i++) xs.push(trueMu + trueSigma * randn(rng));
    const m1 = xs.reduce((a, b) => a + b, 0) / n;
    const m2 = xs.reduce((a, b) => a + b * b, 0) / n;
    const m3 = xs.reduce((a, b) => a + b * b * b, 0) / n;
    const sampleVar = m2 - m1 * m1;
    const sigmaUsed = Math.sqrt(Math.max(sampleVar, 1e-6));

    // Per-observation moment functions. For k moments, returns array length k.
    // g_i(μ) where E[g_i(μ₀)] = 0 :
    //   g₁ = x_i − μ
    //   g₂ = x_i² − (μ² + σ²)             (σ from sample)
    //   g₃ = x_i³ − (μ³ + 3 μ σ²)         (Normal third moment)
    const gPerObs = (mu: number, xi: number): number[] => {
      const arr = [xi - mu, xi * xi - (mu * mu + sigmaUsed * sigmaUsed)];
      if (includeM3) arr.push(xi * xi * xi - (mu * mu * mu + 3 * mu * sigmaUsed * sigmaUsed));
      return arr;
    };
    const gBar = (mu: number): number[] => {
      const k = includeM3 ? 3 : 2;
      const acc = new Array(k).fill(0);
      for (let i = 0; i < n; i++) {
        const gi = gPerObs(mu, xs[i]);
        for (let j = 0; j < k; j++) acc[j] += gi[j];
      }
      return acc.map((v) => v / n);
    };
    const Qfn = (mu: number, W: number[][]): number => {
      const g = gBar(mu);
      let s = 0;
      for (let i = 0; i < g.length; i++)
        for (let j = 0; j < g.length; j++) s += g[i] * W[i][j] * g[j];
      return s;
    };
    const k = includeM3 ? 3 : 2;
    const eye = (kk: number): number[][] => {
      const M: number[][] = [];
      for (let i = 0; i < kk; i++) {
        const r = new Array(kk).fill(0);
        // user-controlled weight on g₁ vs the rest (only meaningful when k=2)
        if (kk === 2) r[i] = i === 0 ? w1 : 1 - w1;
        else r[i] = 1 / kk;
        M[i] = r;
      }
      return M;
    };

    // ── Step 1: GMM with identity / user weight, grid search for μ ──
    const W1 = eye(k);
    const grid = (W: number[][]) => {
      let bestMu = m1, bestQ = Infinity;
      for (let mu = -5; mu <= 10; mu += 0.001) {
        const Q = Qfn(mu, W);
        if (Q < bestQ) { bestQ = Q; bestMu = mu; }
      }
      return { bestMu, bestQ };
    };
    const step1 = grid(W1);

    // ── Step 2: Efficient GMM. Compute Ω̂ at μ̂_step1, take inverse → W₂ ──
    // Ω̂ = (1/n) Σ g_i g_i' (centered at gBar)
    const muHat1 = step1.bestMu;
    const gAtHat = gBar(muHat1);
    const Omega: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      const gi = gPerObs(muHat1, xs[i]).map((v, j) => v - gAtHat[j]);
      for (let a = 0; a < k; a++)
        for (let b = 0; b < k; b++) Omega[a][b] += gi[a] * gi[b];
    }
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) Omega[a][b] /= n;
    // Invert (k=2 or 3) via Gauss–Jordan
    const invertMatrix = (M: number[][]): number[][] | null => {
      const sz = M.length;
      const A = M.map((r, i) => [...r, ...new Array(sz).fill(0).map((_, j) => (i === j ? 1 : 0))]);
      for (let i = 0; i < sz; i++) {
        // pivot
        let piv = A[i][i];
        if (Math.abs(piv) < 1e-10) {
          let swap = -1;
          for (let r = i + 1; r < sz; r++) if (Math.abs(A[r][i]) > 1e-10) { swap = r; break; }
          if (swap < 0) return null;
          [A[i], A[swap]] = [A[swap], A[i]];
          piv = A[i][i];
        }
        for (let j = 0; j < 2 * sz; j++) A[i][j] /= piv;
        for (let r = 0; r < sz; r++) {
          if (r === i) continue;
          const f = A[r][i];
          for (let j = 0; j < 2 * sz; j++) A[r][j] -= f * A[i][j];
        }
      }
      return A.map((r) => r.slice(sz));
    };
    const Winv = invertMatrix(Omega) ?? eye(k);
    const step2 = grid(Winv);

    // ── J statistic = n · Q(μ̂_eff) using efficient W (=Ω̂⁻¹) ──
    // df = #moments − #params = k − 1
    const J = n * step2.bestQ;
    const df = k - 1;

    // χ² survival function via series for regularized upper incomplete gamma
    // For df=1 or 2 use closed forms; general via continued fraction.
    const chi2Sf = (x: number, dof: number): number => {
      if (x <= 0) return 1;
      if (dof === 1) {
        // SF = erfc(sqrt(x/2))
        const erfc = (v: number) => {
          const t = 1 / (1 + 0.3275911 * Math.abs(v));
          const y = 1 - (((((
            1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-v * v);
          return v >= 0 ? 1 - y : 1 + y;
        };
        return erfc(Math.sqrt(x / 2));
      }
      if (dof === 2) return Math.exp(-x / 2);
      // general: use regularized upper incomplete gamma Q(a, x/2) with a = dof/2
      const a = dof / 2;
      const z = x / 2;
      // Use continued fraction (Numerical Recipes 6.2)
      const ITMAX = 200, EPS = 3e-7, FPMIN = 1e-30;
      let b = z + 1 - a;
      let c0 = 1 / FPMIN;
      let d = 1 / b;
      let h = d;
      for (let i = 1; i <= ITMAX; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c0 = b + an / c0;
        if (Math.abs(c0) < FPMIN) c0 = FPMIN;
        d = 1 / d;
        const del = d * c0;
        h *= del;
        if (Math.abs(del - 1) < EPS) break;
      }
      // gln (Stirling)
      const gln = (xx: number) => {
        const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
          -1.231739572450155, 0.001208650973866179, -5.395239384953e-6];
        let y = xx, ttt = xx + 5.5;
        ttt -= (xx + 0.5) * Math.log(ttt);
        let ser = 1.000000000190015;
        for (let j = 0; j < 6; j++) { y += 1; ser += cof[j] / y; }
        return -ttt + Math.log(2.5066282746310005 * ser / xx);
      };
      return Math.exp(-z + a * Math.log(z) - gln(a)) * h;
    };
    const pJ = df > 0 ? chi2Sf(J, df) : NaN;

    // ── Q(μ) curve under the active weight matrix (= W₁ for tutorial) ──
    const muLo = trueMu - 2.5, muHi = trueMu + 2.5, nGrid = 161;
    const curve: any[] = [];
    let qMin = Infinity, qMax = -Infinity;
    for (let i = 0; i < nGrid; i++) {
      const mu = muLo + ((muHi - muLo) * i) / (nGrid - 1);
      const q1 = Qfn(mu, W1);
      qMin = Math.min(qMin, q1);
      qMax = Math.max(qMax, q1);
      curve.push({ mu: +mu.toFixed(3), Q: +q1.toFixed(6) });
    }

    return {
      m1, m2, m3,
      sampleVar,
      step1, step2,
      bestMu: step2.bestMu,
      bestQ: step2.bestQ,
      curve,
      J, df, pJ,
      k,
    };
  }, [trueMu, trueSigma, n, w1, seed, includeM3]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "等权重 (2 矩)", description: "标准 GMM, 仅识别 μ", apply: () => { setW1(0.5); setTrueMu(2); setTrueSigma(1.5); setIncludeM3(false); } },
        { name: "仅一阶矩", description: "w₁=1, 退化为样本均值", apply: () => { setW1(1); setIncludeM3(false); } },
        { name: "过度识别 (3 矩)", description: "加入三阶矩, J 检验有意义", apply: () => { setW1(0.5); setTrueMu(2); setTrueSigma(1.5); setIncludeM3(true); setN(500); } },
      ]} />

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-muted-foreground">矩条件数：</span>
        <button
          onClick={() => setIncludeM3(false)}
          className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " +
            (!includeM3 ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-foreground/40")}
        >
          2 矩 (g₁, g₂) — 恰好识别
        </button>
        <button
          onClick={() => setIncludeM3(true)}
          className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " +
            (includeM3 ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-foreground/40")}
        >
          3 矩 (g₁, g₂, g₃) — 过度识别 (df=2)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="真实 μ" value={trueMu} min={-3} max={5} step={0.1} onChange={setTrueMu} />
          <Slider label="真实 σ" value={trueSigma} min={0.2} max={3} step={0.1} onChange={setTrueSigma} />
          <Slider label="样本量 n" value={n} min={30} max={2000} step={10} onChange={setN} />
          <Slider label="一阶矩权重 w₁ (仅 2 矩有效)" value={w1} min={0} max={1} step={0.05} onChange={setW1} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <ResultRow label="一阶段 μ̂ (用户权重)" value={data.step1.bestMu} truth={trueMu} color={CHART_TEAL} />
          <ResultRow label="二阶段有效 GMM μ̂" value={data.step2.bestMu} truth={trueMu} color={CHART_GOLD} />
          <ResultRow label="目标函数 Q(μ̂_eff)" value={data.step2.bestQ} color={CHART_RED} />

          {/* J test card */}
          <div
            className="p-3 rounded-lg border bg-secondary/30"
            style={{ borderColor: data.df > 0 && data.pJ < 0.05 ? CHART_RED : "hsl(var(--border))" }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-muted-foreground">
                Hansen J 过度识别检验 (χ²(df={data.df}))
              </span>
              {data.df === 0 && (
                <span className="text-[10px] font-mono text-muted-foreground">恰好识别 → J 不可用</span>
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-base font-mono font-semibold tabular-nums" style={{ color: CHART_GOLD }}>
                J = {Number.isFinite(data.J) ? data.J.toFixed(3) : "—"}
              </span>
              <span className="text-sm font-mono tabular-nums">
                p ={" "}
                <span
                  className="font-bold"
                  style={{ color: Number.isFinite(data.pJ) && data.pJ < 0.05 ? CHART_RED : CHART_TEAL }}
                >
                  {Number.isFinite(data.pJ) ? data.pJ.toFixed(4) : "—"}
                </span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {data.df === 0
                  ? "需要 ≥1 多余矩"
                  : Number.isFinite(data.pJ) && data.pJ < 0.05
                    ? "拒绝矩条件 — 模型可能错设"
                    : "未拒绝 — 矩条件相容"}
              </span>
            </div>
          </div>

          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">矩条件：</span>g₁=m₁−μ, g₂=m₂−(μ²+σ²){data.k === 3 && ", g₃=m₃−(μ³+3μσ²)"}</p>
            <p><span className="text-gold">两步 GMM：</span>μ̂_(1) → Ω̂⁻¹ → μ̂_(2) (有效)</p>
            <p><span className="text-gold">J 统计量：</span>J = n·Q(μ̂_eff) ~ χ²(q−p)，q=矩数, p=参数数。</p>
          </div>
        </div>
      </div>

      {/* Q(μ) curve */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-foreground">目标函数曲线 Q(μ)</h4>
          <span className="text-[10px] font-mono text-muted-foreground">在用户权重矩阵下绘制</span>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.curve}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="mu" type="number" domain={["dataMin", "dataMax"]} stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "μ", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 11 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "Q(μ)", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={trueMu} stroke={CHART_TEAL} strokeDasharray="4 4" label={{ value: "真实 μ", fill: CHART_TEAL, fontSize: 10, position: "top" }} />
              <ReferenceLine x={data.step1.bestMu} stroke={CHART_BLUE} strokeDasharray="3 3" label={{ value: "μ̂_(1)", fill: CHART_BLUE, fontSize: 10, position: "insideTopRight" }} />
              <ReferenceLine x={data.step2.bestMu} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "μ̂_(2) 有效", fill: CHART_GOLD, fontSize: 10, position: "top" }} />
              <Line dataKey="Q" name="Q(μ)" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
              {/* explicit minimum marker */}
              <Scatter
                name="最小点"
                data={[{ mu: +data.step1.bestMu.toFixed(3), Q: +data.step1.bestQ.toFixed(6) }]}
                dataKey="Q"
                fill={CHART_RED}
                shape="star"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground font-mono">
          曲线在 <span className="text-gold">μ̂</span> 处取最小值；曲率越大 → 信息越多 → μ̂ 估计越精确（渐近方差越小）。
          切换到 <span className="text-gold">3 矩</span> 模式后，J = n·Q(μ̂) 的大小可检验额外的矩条件是否被数据支持。
        </p>
      </div>
    </div>
  );
};

/* ──────────────────  SVAR / IRF Tool  ────────────────── */
const SVARTool = () => {
  const [seed, setSeed] = useState(11);
  const [T, setT] = useState(200);
  const [H, setH] = useState(20);            // IRF horizon
  const [a11, setA11] = useState(0.6);       // y1_{t-1} → y1
  const [a12, setA12] = useState(0.1);       // y2_{t-1} → y1
  const [a21, setA21] = useState(0.2);       // y1_{t-1} → y2
  const [a22, setA22] = useState(0.5);       // y2_{t-1} → y2
  const [b21, setB21] = useState(0.4);       // contemporaneous: ε1 → y2 (Cholesky lower triangular)
  const [s1, setS1] = useState(1.0);         // structural shock 1 std
  const [s2, setS2] = useState(1.0);         // structural shock 2 std
  const [boots, setBoots] = useState(200);
  const [shockIdx, setShockIdx] = useState<0 | 1>(0); // which structural shock to plot
  const [identMode, setIdentMode] = useState<"chol" | "bq" | "both">("chol");

  /* Simulate reduced-form VAR(1):
     y_t = A y_{t-1} + u_t,  u_t = B0 ε_t,  ε ~ N(0, diag(s1², s2²))
     Cholesky identification: B0 = [[1,0],[b21,1]]                                   */
  const simulate = (rng: () => number) => {
    const y = [[0, 0]];
    for (let t = 1; t < T; t++) {
      const e1 = randn(rng) * s1;
      const e2 = randn(rng) * s2;
      const u1 = e1;
      const u2 = b21 * e1 + e2;
      const yp = y[t - 1];
      y.push([
        a11 * yp[0] + a12 * yp[1] + u1,
        a21 * yp[0] + a22 * yp[1] + u2,
      ]);
    }
    return y;
  };

  /* Estimate VAR(1) by OLS equation-by-equation, then Cholesky on Σ̂_u */
  const estimate = (y: number[][]) => {
    const n = y.length;
    // Build regressors: const + y1_{t-1} + y2_{t-1}
    const fitEq = (col: 0 | 1) => {
      // Solve normal equations 3x3
      let X00 = 0, X01 = 0, X02 = 0, X11 = 0, X12 = 0, X22 = 0;
      let b0 = 0, b1 = 0, b2 = 0;
      let cnt = 0;
      for (let t = 1; t < n; t++) {
        const x1 = y[t - 1][0], x2 = y[t - 1][1], yt = y[t][col];
        X00 += 1; X01 += x1; X02 += x2;
        X11 += x1 * x1; X12 += x1 * x2; X22 += x2 * x2;
        b0 += yt; b1 += x1 * yt; b2 += x2 * yt;
        cnt++;
      }
      // 3x3 inverse via cofactors
      const M = [[X00, X01, X02], [X01, X11, X12], [X02, X12, X22]];
      const det =
        M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
        M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
        M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
      if (Math.abs(det) < 1e-12) return { c: 0, p1: 0, p2: 0 };
      const inv = [
        [(M[1][1] * M[2][2] - M[1][2] * M[2][1]) / det,
         -(M[0][1] * M[2][2] - M[0][2] * M[2][1]) / det,
         (M[0][1] * M[1][2] - M[0][2] * M[1][1]) / det],
        [-(M[1][0] * M[2][2] - M[1][2] * M[2][0]) / det,
         (M[0][0] * M[2][2] - M[0][2] * M[2][0]) / det,
         -(M[0][0] * M[1][2] - M[0][2] * M[1][0]) / det],
        [(M[1][0] * M[2][1] - M[1][1] * M[2][0]) / det,
         -(M[0][0] * M[2][1] - M[0][1] * M[2][0]) / det,
         (M[0][0] * M[1][1] - M[0][1] * M[1][0]) / det],
      ];
      return {
        c: inv[0][0] * b0 + inv[0][1] * b1 + inv[0][2] * b2,
        p1: inv[1][0] * b0 + inv[1][1] * b1 + inv[1][2] * b2,
        p2: inv[2][0] * b0 + inv[2][1] * b1 + inv[2][2] * b2,
      };
    };
    const eq1 = fitEq(0);
    const eq2 = fitEq(1);
    const A = [[eq1.p1, eq1.p2], [eq2.p1, eq2.p2]];
    // Residuals & Σ̂
    let s11 = 0, s22 = 0, s12 = 0, k = 0;
    for (let t = 1; t < n; t++) {
      const r1 = y[t][0] - eq1.c - eq1.p1 * y[t - 1][0] - eq1.p2 * y[t - 1][1];
      const r2 = y[t][1] - eq2.c - eq2.p1 * y[t - 1][0] - eq2.p2 * y[t - 1][1];
      s11 += r1 * r1; s22 += r2 * r2; s12 += r1 * r2; k++;
    }
    s11 /= k; s22 /= k; s12 /= k;
    // Cholesky on Σ̂ = L L', L lower-triangular
    const L11 = Math.sqrt(Math.max(s11, 1e-12));
    const L21 = s12 / L11;
    const L22 = Math.sqrt(Math.max(s22 - L21 * L21, 1e-12));
    const Lhat = [[L11, 0], [L21, L22]];
    return { A, L: Lhat, Sigma: [[s11, s12], [s12, s22]] as number[][] };
  };

  /* Blanchard-Quah long-run identification:
     Long-run cumulative impact C(1) = (I - A)⁻¹. Restrict C(1)·B to be lower-triangular
     ⇒ shock ε₂ has zero long-run effect on y₁.
     Algorithm: H = C(1) Σ C(1)', Cholesky H = K K' (lower-tri), B = (I - A) · K. */
  const bqIdentify = (A: number[][], Sigma: number[][]) => {
    const I_A = [[1 - A[0][0], -A[0][1]], [-A[1][0], 1 - A[1][1]]];
    const det = I_A[0][0] * I_A[1][1] - I_A[0][1] * I_A[1][0];
    if (Math.abs(det) < 1e-8) return [[0, 0], [0, 0]];
    const C1 = [
      [ I_A[1][1] / det, -I_A[0][1] / det],
      [-I_A[1][0] / det,  I_A[0][0] / det],
    ];
    const CS = [
      [C1[0][0] * Sigma[0][0] + C1[0][1] * Sigma[1][0], C1[0][0] * Sigma[0][1] + C1[0][1] * Sigma[1][1]],
      [C1[1][0] * Sigma[0][0] + C1[1][1] * Sigma[1][0], C1[1][0] * Sigma[0][1] + C1[1][1] * Sigma[1][1]],
    ];
    const Hm = [
      [CS[0][0] * C1[0][0] + CS[0][1] * C1[0][1], CS[0][0] * C1[1][0] + CS[0][1] * C1[1][1]],
      [CS[1][0] * C1[0][0] + CS[1][1] * C1[0][1], CS[1][0] * C1[1][0] + CS[1][1] * C1[1][1]],
    ];
    const k11 = Math.sqrt(Math.max(Hm[0][0], 1e-12));
    const k21 = Hm[1][0] / k11;
    const k22 = Math.sqrt(Math.max(Hm[1][1] - k21 * k21, 1e-12));
    const K = [[k11, 0], [k21, k22]];
    const B = [
      [I_A[0][0] * K[0][0] + I_A[0][1] * K[1][0], I_A[0][0] * K[0][1] + I_A[0][1] * K[1][1]],
      [I_A[1][0] * K[0][0] + I_A[1][1] * K[1][0], I_A[1][0] * K[0][1] + I_A[1][1] * K[1][1]],
    ];
    return B;
  };

  /* IRF: Φ_h = A^h, structural IRF to shock j of size 1 SD: Φ_h · L · e_j           */
  const computeIRF = (A: number[][], L: number[][], j: 0 | 1, h: number) => {
    // Initial impact = L[:,j]
    let v = [L[0][j], L[1][j]];
    const out: { y1: number; y2: number }[] = [{ y1: v[0], y2: v[1] }];
    for (let s = 1; s <= h; s++) {
      v = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
      out.push({ y1: v[0], y2: v[1] });
    }
    return out;
  };

  const result = useMemo(() => {
    const rng = mulberry32(seed);
    const y = simulate(rng);
    const { A, L, Sigma } = estimate(y);
    const Bbq = bqIdentify(A, Sigma);
    const irfChol = computeIRF(A, L, shockIdx, H);
    const irfBq = computeIRF(A, Bbq, shockIdx, H);

    // Bootstrap: resample residuals to get IRF CI
    const n = y.length;
    // Recompute residuals using estimated A & implicit constants (refit for residuals)
    const fitFull = () => {
      const eqRes = (col: 0 | 1) => {
        const res: number[] = [];
        // simple OLS again for residuals
        let mx1 = 0, mx2 = 0, my = 0; let cnt = 0;
        for (let t = 1; t < n; t++) { mx1 += y[t-1][0]; mx2 += y[t-1][1]; my += y[t][col]; cnt++; }
        // Use estimated A row
        const row = col === 0 ? [A[0][0], A[0][1]] : [A[1][0], A[1][1]];
        const c = my / cnt - row[0] * (mx1 / cnt) - row[1] * (mx2 / cnt);
        for (let t = 1; t < n; t++) {
          res.push(y[t][col] - c - row[0] * y[t-1][0] - row[1] * y[t-1][1]);
        }
        return { c, res };
      };
      return [eqRes(0), eqRes(1)];
    };
    const fits = fitFull();
    const res1 = fits[0].res, res2 = fits[1].res;
    const c1 = fits[0].c, c2 = fits[1].c;

    const irfBootC: number[][][] = []; // Cholesky bootstrap
    const irfBootB: number[][][] = []; // BQ bootstrap
    for (let b = 0; b < boots; b++) {
      const ysim: number[][] = [[y[0][0], y[0][1]]];
      for (let t = 1; t < n; t++) {
        const idx = Math.floor(rng() * res1.length);
        const u1 = res1[idx], u2 = res2[idx];
        ysim.push([
          c1 + A[0][0] * ysim[t-1][0] + A[0][1] * ysim[t-1][1] + u1,
          c2 + A[1][0] * ysim[t-1][0] + A[1][1] * ysim[t-1][1] + u2,
        ]);
      }
      const est = estimate(ysim);
      const ibC = computeIRF(est.A, est.L, shockIdx, H);
      const Bb = bqIdentify(est.A, est.Sigma);
      const ibB = computeIRF(est.A, Bb, shockIdx, H);
      irfBootC.push(ibC.map(p => [p.y1, p.y2]));
      irfBootB.push(ibB.map(p => [p.y1, p.y2]));
    }

    const q = (arr: number[], p: number) => {
      const s = [...arr].sort((a, b) => a - b);
      const i = Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))));
      return s[i];
    };
    const series2 = irfChol.map((pt, h) => {
      const v1c = irfBootC.map(b => b[h][0]);
      const v2c = irfBootC.map(b => b[h][1]);
      const v1b = irfBootB.map(b => b[h][0]);
      const v2b = irfBootB.map(b => b[h][1]);
      const ptB = irfBq[h];
      const c_y1_lo = boots ? q(v1c, 0.025) : pt.y1;
      const c_y1_hi = boots ? q(v1c, 0.975) : pt.y1;
      const c_y2_lo = boots ? q(v2c, 0.025) : pt.y2;
      const c_y2_hi = boots ? q(v2c, 0.975) : pt.y2;
      const b_y1_lo = boots ? q(v1b, 0.025) : ptB.y1;
      const b_y1_hi = boots ? q(v1b, 0.975) : ptB.y1;
      const b_y2_lo = boots ? q(v2b, 0.025) : ptB.y2;
      const b_y2_hi = boots ? q(v2b, 0.975) : ptB.y2;
      return {
        h,
        // Cholesky
        y1: pt.y1, y2: pt.y2,
        y1_lo_v: c_y1_lo, y1_band_v: c_y1_hi - c_y1_lo,
        y2_lo_v: c_y2_lo, y2_band_v: c_y2_hi - c_y2_lo,
        // BQ
        y1_bq: ptB.y1, y2_bq: ptB.y2,
        y1_bq_lo_v: b_y1_lo, y1_bq_band_v: b_y1_hi - b_y1_lo,
        y2_bq_lo_v: b_y2_lo, y2_bq_band_v: b_y2_hi - b_y2_lo,
      };
    });

    /* ── Historical Decomposition (using Cholesky ident: B = L) ──
       1) ε_t = L⁻¹ u_t  (structural shocks from reduced-form residuals)
       2) For variable i:  ŷ_{i,t} - baseline = Σ_j Σ_{s=0..t-1} (Φ_s · L)_{ij} · ε_{t-s, j}
       Φ_s = A^s, M_s = Φ_s · L. We split contribution by shock j and overlay actual.       */
    const Linv = (() => {
      const a = L[0][0], b = L[0][1], c = L[1][0], d = L[1][1];
      const det = a * d - b * c;
      return [[d / det, -b / det], [-c / det, a / det]];
    })();
    const eps: number[][] = res1.map((r1, t) => {
      const u1 = r1, u2 = res2[t];
      return [Linv[0][0] * u1 + Linv[0][1] * u2, Linv[1][0] * u1 + Linv[1][1] * u2];
    });
    // Precompute M_s = A^s · L for s = 0..eps.length
    const Mlist2: number[][][] = [];
    {
      let Phi = [[1, 0], [0, 1]];
      for (let s = 0; s < eps.length; s++) {
        Mlist2.push([
          [Phi[0][0] * L[0][0] + Phi[0][1] * L[1][0], Phi[0][0] * L[0][1] + Phi[0][1] * L[1][1]],
          [Phi[1][0] * L[0][0] + Phi[1][1] * L[1][0], Phi[1][0] * L[0][1] + Phi[1][1] * L[1][1]],
        ]);
        Phi = [
          [A[0][0] * Phi[0][0] + A[0][1] * Phi[1][0], A[0][0] * Phi[0][1] + A[0][1] * Phi[1][1]],
          [A[1][0] * Phi[0][0] + A[1][1] * Phi[1][0], A[1][0] * Phi[0][1] + A[1][1] * Phi[1][1]],
        ];
      }
    }
    // baseline (deterministic part) = forecast from initial condition with no shocks
    const N = eps.length;
    const baseline: number[][] = [[y[0][0], y[0][1]]];
    for (let t = 1; t <= N; t++) {
      const yp = baseline[t - 1];
      baseline.push([
        c1 + A[0][0] * yp[0] + A[0][1] * yp[1],
        c2 + A[1][0] * yp[0] + A[1][1] * yp[1],
      ]);
    }
    const hd: { t: number; y1_e1: number; y1_e2: number; y2_e1: number; y2_e2: number; y1_actual: number; y2_actual: number; y1_base: number; y2_base: number }[] = [];
    for (let t = 0; t < N; t++) {
      let c11 = 0, c12 = 0, c21 = 0, c22 = 0;
      for (let s = 0; s <= t; s++) {
        const M = Mlist2[s];
        const e = eps[t - s];
        c11 += M[0][0] * e[0]; c12 += M[0][1] * e[1];
        c21 += M[1][0] * e[0]; c22 += M[1][1] * e[1];
      }
      // y_{t+1} corresponds to first observation after init in residual indexing
      const tIdx = t + 1;
      hd.push({
        t: tIdx,
        y1_e1: c11, y1_e2: c12,
        y2_e1: c21, y2_e2: c22,
        y1_actual: y[tIdx][0] - baseline[tIdx][0],
        y2_actual: y[tIdx][1] - baseline[tIdx][1],
        y1_base: baseline[tIdx][0],
        y2_base: baseline[tIdx][1],
      });
    }

    /* ── FEVD: variance share contributed by shock j to variable i at horizon h ── */
    const Mfevd: number[][][] = [];
    {
      let Phi = [[1, 0], [0, 1]];
      for (let h = 0; h <= H; h++) {
        Mfevd.push([
          [Phi[0][0] * L[0][0] + Phi[0][1] * L[1][0], Phi[0][0] * L[0][1] + Phi[0][1] * L[1][1]],
          [Phi[1][0] * L[0][0] + Phi[1][1] * L[1][0], Phi[1][0] * L[0][1] + Phi[1][1] * L[1][1]],
        ]);
        Phi = [
          [A[0][0] * Phi[0][0] + A[0][1] * Phi[1][0], A[0][0] * Phi[0][1] + A[0][1] * Phi[1][1]],
          [A[1][0] * Phi[0][0] + A[1][1] * Phi[1][0], A[1][0] * Phi[0][1] + A[1][1] * Phi[1][1]],
        ];
      }
    }
    const fevd: { h: number; y1_e1: number; y1_e2: number; y2_e1: number; y2_e2: number }[] = [];
    let cumY1 = [0, 0], cumY2 = [0, 0];
    for (let h = 0; h <= H; h++) {
      cumY1[0] += Mfevd[h][0][0] ** 2; cumY1[1] += Mfevd[h][0][1] ** 2;
      cumY2[0] += Mfevd[h][1][0] ** 2; cumY2[1] += Mfevd[h][1][1] ** 2;
      const t1 = cumY1[0] + cumY1[1] || 1e-12;
      const t2 = cumY2[0] + cumY2[1] || 1e-12;
      fevd.push({
        h,
        y1_e1: cumY1[0] / t1, y1_e2: cumY1[1] / t1,
        y2_e1: cumY2[0] / t2, y2_e2: cumY2[1] / t2,
      });
    }

    /* ── Granger causality F-tests on the bivariate VAR(1) ──
       H0: y_j does NOT Granger-cause y_i  ⇔  A[i,j]=0  (only 1 lag, q=1, df1=1, df2=n-3) */
    const grangerSSR = (col: 0 | 1, useY1: boolean, useY2: boolean) => {
      let n = 0;
      const xs: number[][] = [];
      const ys: number[] = [];
      for (let t = 1; t < y.length; t++) {
        const row = [1];
        if (useY1) row.push(y[t - 1][0]);
        if (useY2) row.push(y[t - 1][1]);
        xs.push(row); ys.push(y[t][col]); n++;
      }
      const k = xs[0].length;
      const XtX: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
      const Xty: number[] = Array(k).fill(0);
      for (let i = 0; i < n; i++) {
        for (let a = 0; a < k; a++) {
          Xty[a] += xs[i][a] * ys[i];
          for (let b2 = 0; b2 < k; b2++) XtX[a][b2] += xs[i][a] * xs[i][b2];
        }
      }
      const M = XtX.map((r, i) => [...r, Xty[i]]);
      for (let i = 0; i < k; i++) {
        let piv = i;
        for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
        [M[i], M[piv]] = [M[piv], M[i]];
        const d = M[i][i] || 1e-12;
        for (let j = i; j <= k; j++) M[i][j] /= d;
        for (let r = 0; r < k; r++) if (r !== i) {
          const f = M[r][i];
          for (let j = i; j <= k; j++) M[r][j] -= f * M[i][j];
        }
      }
      const beta = M.map(r => r[k]);
      let ssr = 0;
      for (let i = 0; i < n; i++) {
        let yhat = 0;
        for (let a = 0; a < k; a++) yhat += xs[i][a] * beta[a];
        ssr += (ys[i] - yhat) ** 2;
      }
      return { ssr, n, k };
    };

    /* p-value for F(1, df2) via incomplete beta function:
       P(F > f) = I_{df2/(df2+f)}(df2/2, 1/2)                                            */
    const lnGamma = (z: number): number => {
      const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
                 -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
      let x = z, y2 = z, tmp = x + 5.5;
      tmp -= (x + 0.5) * Math.log(tmp);
      let ser = 1.000000000190015;
      for (let j = 0; j < 6; j++) { y2 += 1; ser += c[j] / y2; }
      return -tmp + Math.log(2.5066282746310005 * ser / x);
    };
    const betacf = (a: number, b: number, x: number): number => {
      const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30;
      const qab = a + b, qap = a + 1, qam = a - 1;
      let c = 1, d = 1 - qab * x / qap;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      d = 1 / d; let h = d;
      for (let m = 1; m <= MAXIT; m++) {
        const m2 = 2 * m;
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d; h *= d * c;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d; const del = d * c; h *= del;
        if (Math.abs(del - 1) < EPS) break;
      }
      return h;
    };
    const betaI = (a: number, b: number, x: number): number => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
      if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
      return 1 - bt * betacf(b, a, 1 - x) / b;
    };
    const pValueF = (f: number, df1: number, df2: number) => {
      if (!Number.isFinite(f) || f <= 0) return 1;
      return betaI(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
    };

    // Test: does y2 Granger-cause y1?  (drop y2 lag from y1 equation)
    const ug1 = grangerSSR(0, true, true);
    const rg1 = grangerSSR(0, true, false);
    const F_2to1 = ((rg1.ssr - ug1.ssr) / 1) / (ug1.ssr / (ug1.n - ug1.k));
    const p_2to1 = pValueF(F_2to1, 1, ug1.n - ug1.k);
    // Test: does y1 Granger-cause y2?
    const ug2 = grangerSSR(1, true, true);
    const rg2 = grangerSSR(1, false, true);
    const F_1to2 = ((rg2.ssr - ug2.ssr) / 1) / (ug2.ssr / (ug2.n - ug2.k));
    const p_1to2 = pValueF(F_1to2, 1, ug2.n - ug2.k);

    const granger = {
      y2_to_y1: { F: F_2to1, p: p_2to1, df: ug1.n - ug1.k },
      y1_to_y2: { F: F_1to2, p: p_1to2, df: ug2.n - ug2.k },
    };

    return { series: series2, A, L, Bbq, hd, fevd, granger };
  }, [seed, T, H, a11, a12, a21, a22, b21, s1, s2, boots, shockIdx]);

  const presets: Preset[] = [
    { name: "标准教科书", description: "稳定 VAR + 中等同期溢出", apply: () => { setA11(0.6); setA12(0.1); setA21(0.2); setA22(0.5); setB21(0.4); setS1(1); setS2(1); setT(200); setH(20); } },
    { name: "高持续性", description: "接近单位根，IRF 衰减很慢", apply: () => { setA11(0.9); setA22(0.85); setA12(0.05); setA21(0.05); setB21(0.3); } },
    { name: "无同期溢出", description: "B0 对角，y2 对 ε1 的瞬时反应=0", apply: () => { setB21(0); } },
    { name: "强同期溢出", description: "ε1 立即推动 y2 大幅上升", apply: () => { setB21(1.2); } },
    { name: "短样本", description: "T=60, 看置信带变宽", apply: () => { setT(60); setBoots(150); } },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />

      {/* Sliders */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
        <Slider label="样本量 T" value={T} min={50} max={500} step={10} onChange={setT} />
        <Slider label="IRF 期数 H" value={H} min={5} max={40} step={1} onChange={setH} />
        <Slider label="Bootstrap 次数" value={boots} min={0} max={400} step={20} onChange={setBoots} />
        <Slider label="A₁₁ (y₁→y₁)" value={a11} min={-0.95} max={0.95} step={0.05} onChange={setA11} />
        <Slider label="A₁₂ (y₂→y₁)" value={a12} min={-0.5} max={0.5} step={0.05} onChange={setA12} />
        <Slider label="A₂₁ (y₁→y₂)" value={a21} min={-0.5} max={0.5} step={0.05} onChange={setA21} />
        <Slider label="A₂₂ (y₂→y₂)" value={a22} min={-0.95} max={0.95} step={0.05} onChange={setA22} />
        <Slider label="B₀ 同期 b₂₁" value={b21} min={-1.5} max={1.5} step={0.05} onChange={setB21} />
        <Slider label="σ(ε₁)" value={s1} min={0.2} max={2} step={0.1} onChange={setS1} />
        <Slider label="σ(ε₂)" value={s2} min={0.2} max={2} step={0.1} onChange={setS2} />
        <Slider label="随机种子" value={seed} min={1} max={200} step={1} onChange={setSeed} />
        <div className="flex items-end">
          <div className="flex gap-1 w-full">
            {[0, 1].map(i => (
              <button key={i} onClick={() => setShockIdx(i as 0 | 1)}
                className={`flex-1 px-3 py-2 text-xs font-mono rounded-md border transition-all ${
                  shockIdx === i
                    ? "bg-gold/20 border-gold text-gold"
                    : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                }`}>
                冲击 ε{i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Identification mode toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">识别策略</span>
        {[
          { id: "chol", label: "Cholesky" },
          { id: "bq", label: "Blanchard-Quah (长期约束)" },
          { id: "both", label: "对比叠加" },
        ].map(opt => (
          <button key={opt.id} onClick={() => setIdentMode(opt.id as "chol" | "bq" | "both")}
            className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${
              identMode === opt.id
                ? "bg-gold/20 border-gold text-gold"
                : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Identification note */}
      <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-[11px] font-mono text-gold uppercase tracking-wider mt-0.5 shrink-0">Cholesky</span>
          <div className="text-xs text-muted-foreground leading-relaxed">
            短期排序约束：<InlineMath math={String.raw`B_0`} /> 下三角 ⇒ <InlineMath math={String.raw`\varepsilon_2`} /> 同期不影响 <InlineMath math={String.raw`y_1`} />。
            <span className="text-foreground/70 ml-1">(Short-run recursive ordering)</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider mt-0.5 shrink-0" style={{ color: CHART_TEAL }}>Blanchard-Quah</span>
          <div className="text-xs text-muted-foreground leading-relaxed">
            长期约束：<InlineMath math={String.raw`C(1)\,B`} /> 下三角 ⇒ <InlineMath math={String.raw`\varepsilon_2`} /> <span className="underline">长期</span>累计对 <InlineMath math={String.raw`y_1`} /> 为 0。
            <span className="text-foreground/70 ml-1">(Long-run zero restriction; e.g. demand shocks have no permanent effect on output)</span>
          </div>
        </div>
      </div>

      {/* Two IRF plots */}
      {[
        { key: "y1", label: `y₁ 对 ε${shockIdx + 1} 的脉冲响应` },
        { key: "y2", label: `y₂ 对 ε${shockIdx + 1} 的脉冲响应` },
      ].map(cfg => {
        const cLo = `${cfg.key}_lo_v`, cBand = `${cfg.key}_band_v`, cLine = cfg.key;
        const bLo = `${cfg.key}_bq_lo_v`, bBand = `${cfg.key}_bq_band_v`, bLine = `${cfg.key}_bq`;
        const showChol = identMode === "chol" || identMode === "both";
        const showBq = identMode === "bq" || identMode === "both";
        return (
          <div key={cfg.key} className="rounded-xl border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{cfg.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground">95% Bootstrap CI</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={result.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="h" stroke={CHART_TEXT} tick={{ fontSize: 11 }}
                  label={{ value: "horizon h", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11, fontFamily: "monospace" }}
                  formatter={(v: number) => v.toFixed(3)}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="2 2" />
                {showChol && <>
                  <Area type="monotone" dataKey={cLo} stackId={`c-${cfg.key}`} stroke="none" fill="transparent" legendType="none" name="" />
                  <Area type="monotone" dataKey={cBand} stackId={`c-${cfg.key}`} stroke="none" fill={CHART_GOLD} fillOpacity={0.18} legendType="none" name="" />
                  <Line type="monotone" dataKey={cLine} stroke={CHART_GOLD} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART_GOLD }} name="Cholesky" />
                </>}
                {showBq && <>
                  <Area type="monotone" dataKey={bLo} stackId={`b-${cfg.key}`} stroke="none" fill="transparent" legendType="none" name="" />
                  <Area type="monotone" dataKey={bBand} stackId={`b-${cfg.key}`} stroke="none" fill={CHART_TEAL} fillOpacity={0.18} legendType="none" name="" />
                  <Line type="monotone" dataKey={bLine} stroke={CHART_TEAL} strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 2, fill: CHART_TEAL }} name="Blanchard-Quah" />
                </>}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );
      })}

      {/* FEVD: forecast error variance decomposition (Cholesky) */}
      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">方差分解 FEVD (Cholesky)</span>
          <span className="text-[10px] font-mono text-muted-foreground">各结构冲击对预测误差方差贡献份额</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { key: "y1", label: "y₁ 的 FEVD", e1: "y1_e1", e2: "y1_e2" },
            { key: "y2", label: "y₂ 的 FEVD", e1: "y2_e1", e2: "y2_e2" },
          ].map(cfg => (
            <div key={cfg.key}>
              <div className="text-[10px] font-mono text-muted-foreground mb-1">{cfg.label}</div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={result.fevd} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} stackOffset="expand">
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="h" stroke={CHART_TEXT} tick={{ fontSize: 11 }}
                    label={{ value: "horizon h", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 10 }} />
                  <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11, fontFamily: "monospace" }}
                    formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Area type="monotone" dataKey={cfg.e1} stackId="f" name="ε₁ 贡献" stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.55} />
                  <Area type="monotone" dataKey={cfg.e2} stackId="f" name="ε₂ 贡献" stroke={CHART_TEAL} fill={CHART_TEAL} fillOpacity={0.55} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Decomposition (Cholesky) */}
      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">历史分解 Historical Decomposition</span>
          <span className="text-[10px] font-mono text-muted-foreground">y_t − 基线 = Σ_j (累计冲击 ε_j 贡献)</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { key: "y1", label: "y₁ 路径分解", e1: "y1_e1", e2: "y1_e2", actual: "y1_actual" },
            { key: "y2", label: "y₂ 路径分解", e1: "y2_e1", e2: "y2_e2", actual: "y2_actual" },
          ].map(cfg => (
            <div key={cfg.key}>
              <div className="text-[10px] font-mono text-muted-foreground mb-1">{cfg.label}</div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={result.hd} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 11 }}
                    label={{ value: "t", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 10 }} />
                  <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11, fontFamily: "monospace" }}
                    formatter={(v: number) => v.toFixed(3)} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="2 2" />
                  <Area type="monotone" dataKey={cfg.e1} stackId="hd" name="ε₁ 累计贡献"
                    stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.45} />
                  <Area type="monotone" dataKey={cfg.e2} stackId="hd" name="ε₂ 累计贡献"
                    stroke={CHART_TEAL} fill={CHART_TEAL} fillOpacity={0.45} />
                  <Line type="monotone" dataKey={cfg.actual} stroke={CHART_RED} strokeWidth={1.8} dot={false}
                    name="实际偏离 (y_t − baseline)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
          公式：y<sub>i,t</sub> − ŷ<sub>i,t|0</sub> = Σ<sub>j</sub> Σ<sub>s=0..t-1</sub> (Φ<sub>s</sub>L)<sub>ij</sub> · ε<sub>t-s,j</sub>。
          堆叠面积 = 各结构冲击的累计贡献；红线 = 实际偏离基线，应与堆叠总高度吻合（识别正确的诊断）。
        </div>
      </div>

      {/* Granger causality */}
      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Granger 因果检验</div>
            <div className="text-[10px] font-mono text-muted-foreground/70">Granger Causality F-Test  ·  H₀: lagged predictor is jointly insignificant</div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
            df = (1, {result.granger.y2_to_y1.df})  ·  α = 0.05
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { dir: "y₂ ⟶ y₁", direnEn: "Does y₂ Granger-cause y₁ ?", coef: "A_{12}", res: result.granger.y2_to_y1 },
            { dir: "y₁ ⟶ y₂", direnEn: "Does y₁ Granger-cause y₂ ?", coef: "A_{21}", res: result.granger.y1_to_y2 },
          ].map(t => {
            const reject = t.res.p < 0.05;
            return (
              <div key={t.dir} className={`p-3 rounded-lg border ${reject ? "border-gold/40 bg-gold/5" : "border-border bg-secondary/30"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono font-semibold text-foreground">{t.dir}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${reject ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"}`}>
                    {reject ? "拒绝 H₀ · Reject" : "不拒绝 · Fail to reject"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mb-1">{t.direnEn}</div>
                <div className="text-[10px] font-mono text-muted-foreground mb-2">
                  H₀ : <InlineMath math={t.coef + " = 0"} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">F-stat</span>
                    <span className="text-gold tabular-nums font-semibold">{Number.isFinite(t.res.F) ? t.res.F.toFixed(3) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">p-value</span>
                    <span className={`tabular-nums font-semibold ${reject ? "text-gold" : "text-foreground"}`}>
                      {t.res.p < 0.001 ? "< 0.001" : t.res.p.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                  {reject
                    ? <>有证据表明存在 Granger 因果关系。<span className="text-foreground/60">Significant predictive content.</span></>
                    : <>没有显著证据表明 Granger 因果关系。<span className="text-foreground/60">No significant predictive content.</span></>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[10px] font-mono text-muted-foreground leading-relaxed text-center">
          <InlineMath math={String.raw`F = \dfrac{(\mathrm{SSR}_R - \mathrm{SSR}_U)/q}{\mathrm{SSR}_U/(n-k)} \;\sim\; F(q,\, n-k)`} />
          <span className="ml-2">此处 <InlineMath math="q=1" /> (1 期滞后), <InlineMath math="k=3" /> (常数 + 2 滞后)</span>
        </div>
      </div>

      {/* Estimated matrices */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-border bg-secondary/30">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">估计 Â</div>
          <pre className="text-xs font-mono text-gold leading-tight">
{`[ ${result.A[0][0].toFixed(3).padStart(6)}  ${result.A[0][1].toFixed(3).padStart(6)} ]
[ ${result.A[1][0].toFixed(3).padStart(6)}  ${result.A[1][1].toFixed(3).padStart(6)} ]`}
          </pre>
        </div>
        <div className="p-3 rounded-lg border border-border bg-secondary/30">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Cholesky L̂</div>
          <pre className="text-xs font-mono text-gold leading-tight">
{`[ ${result.L[0][0].toFixed(3).padStart(6)}  ${result.L[0][1].toFixed(3).padStart(6)} ]
[ ${result.L[1][0].toFixed(3).padStart(6)}  ${result.L[1][1].toFixed(3).padStart(6)} ]`}
          </pre>
        </div>
        <div className="p-3 rounded-lg border border-border bg-secondary/30">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">BQ B̂  (长期约束)</div>
          <pre className="text-xs font-mono leading-tight" style={{ color: CHART_TEAL }}>
{`[ ${result.Bbq[0][0].toFixed(3).padStart(6)}  ${result.Bbq[0][1].toFixed(3).padStart(6)} ]
[ ${result.Bbq[1][0].toFixed(3).padStart(6)}  ${result.Bbq[1][1].toFixed(3).padStart(6)} ]`}
          </pre>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────  Shared UI atoms  ────────────────── */
const Slider = ({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <span className="text-xs font-mono text-gold tabular-nums">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)}
      className="w-full accent-gold cursor-pointer" />
  </div>
);

const ResultRow = ({ label, value, truth, se, color }: { label: string; value: number; truth?: number; se?: number; color: string }) => {
  const bias = truth != null ? value - truth : null;
  return (
    <div className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-base font-mono font-semibold tabular-nums" style={{ color }}>
          {Number.isFinite(value) ? value.toFixed(3) : "—"}
        </span>
        {bias != null && Number.isFinite(bias) && (
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            偏差 {bias >= 0 ? "+" : ""}{bias.toFixed(3)}
          </span>
        )}
        {se != null && Number.isFinite(se) && (
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">SE {se.toFixed(3)}</span>
        )}
      </div>
    </div>
  );
};

/* ──────────────────  Main module  ────────────────── */
type ToolId = "olsiv" | "did" | "sdid" | "rdd" | "synth" | "gmm" | "svar" | "garch" | "dcc" | "regime" | "coint" | "kalman" | "midas" | "logit" | "qreg" | "psm" | "arima" | "lp" | "lasso" | "panel" | "tobit" | "dlm" | "dml" | "cforest" | "bayes";

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; python: string; component: React.FC }[] = [
  { id: "olsiv", name: "OLS / IV (工具变量)", nameEn: "Ordinary Least Squares & Instrumental Variables",
    formula: String.raw`y_i = \alpha + \beta\, x_i + \varepsilon_i \qquad\text{(IV)}\quad \hat{x}_i = \hat{\pi}\, z_i \;\Rightarrow\; \hat{\beta}_{\mathrm{IV}}`,
    python: `import numpy as np

def ols(X, y):
    X = np.column_stack([np.ones(len(y)), X])
    beta = np.linalg.solve(X.T @ X, X.T @ y)
    resid = y - X @ beta
    sigma2 = (resid @ resid) / (len(y) - X.shape[1])
    var_beta = sigma2 * np.linalg.inv(X.T @ X)
    return beta, np.sqrt(np.diag(var_beta))

def iv_2sls(X, y, Z):
    """Two-stage least squares with instrument Z."""
    X = np.column_stack([np.ones(len(y)), X])
    Z = np.column_stack([np.ones(len(y)), Z])
    Pz = Z @ np.linalg.solve(Z.T @ Z, Z.T)
    return np.linalg.solve(X.T @ Pz @ X, X.T @ Pz @ y)`,
    component: OLSvsIV },
  { id: "did",   name: "DID (双重差分)", nameEn: "Difference-in-Differences",
    formula: String.raw`\hat{\tau}_{\mathrm{DID}} = \bigl(\bar{Y}_{1,\mathrm{post}} - \bar{Y}_{1,\mathrm{pre}}\bigr) - \bigl(\bar{Y}_{0,\mathrm{post}} - \bar{Y}_{0,\mathrm{pre}}\bigr)`,
    python: `import numpy as np
import pandas as pd

def did_estimator(df):
    """df: columns [y, treated (0/1), post (0/1)]"""
    df = df.copy()
    df["interaction"] = df["treated"] * df["post"]
    X = df[["treated", "post", "interaction"]].values
    X = np.column_stack([np.ones(len(df)), X])
    beta = np.linalg.solve(X.T @ X, X.T @ df["y"].values)
    return {"alpha": beta[0], "treated": beta[1], "post": beta[2], "DID": beta[3]}`,
    component: DIDTool },
  { id: "rdd",   name: "RDD (断点回归)", nameEn: "Regression Discontinuity Design",
    formula: String.raw`\tau_{\mathrm{RDD}} = \lim_{x \downarrow c} \mathbb{E}[Y\mid X=x] - \lim_{x \uparrow c} \mathbb{E}[Y\mid X=x]`,
    python: `import numpy as np

def rdd_local_linear(x, y, c, bandwidth):
    """Sharp RDD: fit local linear on each side of cutoff c."""
    mask_l = (x >= c - bandwidth) & (x < c)
    mask_r = (x >= c) & (x <= c + bandwidth)
    fit_l = np.polyfit(x[mask_l] - c, y[mask_l], 1)
    fit_r = np.polyfit(x[mask_r] - c, y[mask_r], 1)
    return fit_r[1] - fit_l[1]`,
    component: RDDTool },
  { id: "sdid", name: "Staggered DID (Callaway-Sant'Anna)", nameEn: "Staggered DiD with Heterogeneous Treatment Timing — Callaway & Sant'Anna (2021)",
    formula: String.raw`\mathrm{ATT}(g, t) = \mathbb{E}\!\left[Y_t - Y_{g-1}\,\big|\,G=g\right] - \mathbb{E}\!\left[Y_t - Y_{g-1}\,\big|\,C=1\right],\qquad \mathrm{ATT}(e) = \tfrac{1}{|G_e|}\sum_{g} \mathrm{ATT}(g,\, g+e)`,
    python: `import numpy as np

def cs_att(panel, group_col="G", time_col="t", y_col="y"):
    """Callaway-Sant'Anna ATT(g,t) using never-treated as control."""
    treated = sorted(g for g in panel[group_col].unique() if np.isfinite(g))
    rows = []
    for g in treated:
        for t in panel[time_col].unique():
            if t < g: continue
            base = panel[panel[time_col] == g - 1].set_index("id")[y_col]
            now  = panel[panel[time_col] == t    ].set_index("id")[y_col]
            d = now - base
            mask_g = panel[panel[time_col]==t].set_index("id")[group_col] == g
            mask_c = ~np.isfinite(panel[panel[time_col]==t].set_index("id")[group_col])
            rows.append((g, t, d[mask_g].mean() - d[mask_c].mean()))
    return rows`,
    component: StaggeredDIDTool },
  { id: "synth", name: "Synthetic Control (合成对照)", nameEn: "Synthetic Control Method — Abadie, Diamond & Hainmueller (2010)",
    formula: String.raw`W^* = \arg\min_{w \in \Delta^{J-1}} \bigl\| X_1 - X_0\, w \bigr\|^{2},\qquad \widehat{\mathrm{ATT}}_t = Y_{1t} - \sum_{j=2}^{J+1} w_j^*\, Y_{jt}`,
    python: `import numpy as np
from scipy.optimize import minimize

def synthetic_control(X1, X0):
    """X1: (T0,) treated pre-period; X0: (T0, J) donor pool."""
    J = X0.shape[1]
    cons = [{"type": "eq", "fun": lambda w: w.sum() - 1}]
    bnds = [(0, 1)] * J
    res = minimize(lambda w: ((X1 - X0 @ w) ** 2).sum(),
                   x0=np.ones(J)/J, bounds=bnds, constraints=cons)
    return res.x`,
    component: SyntheticControlTool },
  { id: "gmm",   name: "GMM (广义矩估计)", nameEn: "Generalized Method of Moments",
    formula: String.raw`\hat{\mu}_{\mathrm{GMM}} = \arg\min_{\mu}\; g(\mu)^{\!\top}\, W\, g(\mu), \qquad J = n \cdot Q(\hat{\mu}_{\mathrm{eff}}) \sim \chi^2_{q-p}`,
    python: `import numpy as np
from scipy.optimize import minimize

def gmm_estimate(moments, theta0, W=None):
    def Q(theta):
        g = moments(theta).mean(axis=0)
        Wm = np.eye(len(g)) if W is None else W
        return g @ Wm @ g
    return minimize(Q, theta0, method="BFGS").x`,
    component: GMMTool },
  { id: "svar",  name: "SVAR / IRF (结构向量自回归)", nameEn: "Structural Vector Autoregression & Impulse Response",
    formula: String.raw`y_t = A\, y_{t-1} + B_0\, \varepsilon_t, \qquad \mathrm{IRF}_h = A^{h} \cdot L \cdot e_j`,
    python: `import numpy as np

def svar_irf(A, L, horizon=20):
    """A = VAR(1) coefficient, L = lower-triangular Cholesky of Sigma."""
    n = A.shape[0]
    irf = np.zeros((horizon, n, n))
    Ah = np.eye(n)
    for h in range(horizon):
        irf[h] = Ah @ L
        Ah = Ah @ A
    return irf`,
    component: SVARTool },
  { id: "garch", name: "GARCH / EGARCH (波动率)", nameEn: "Generalized Autoregressive Conditional Heteroskedasticity",
    formula: String.raw`\sigma_t^2 = \omega + \alpha\,r_{t-1}^2 + \beta\,\sigma_{t-1}^2 \qquad\text{(EGARCH)}\;\; \ln\sigma_t^2 = \omega + \beta\ln\sigma_{t-1}^2 + \alpha(|z_{t-1}|-E|z|) + \gamma z_{t-1}`,
    python: `import numpy as np
from scipy.optimize import minimize

def garch_loglik(params, r):
    omega, alpha, beta = params
    sig2 = np.zeros(len(r))
    sig2[0] = np.var(r)
    for t in range(1, len(r)):
        sig2[t] = omega + alpha * r[t-1]**2 + beta * sig2[t-1]
    return 0.5 * np.sum(np.log(sig2) + r**2 / sig2)`,
    component: GARCHTool },
  { id: "regime", name: "Markov Regime-Switching (Hamilton)", nameEn: "Markov Regime-Switching Model — Hamilton (1989)",
    formula: String.raw`y_t \mid S_t = i \;\sim\; \mathcal{N}(\mu_i,\, \sigma_i^2),\qquad \Pr(S_t = j \mid S_{t-1} = i) = p_{ij},\qquad \mathbb{E}[d_i] = \dfrac{1}{1 - p_{ii}}`,
    python: `import numpy as np

def hamilton_filter(y, mu, sigma, P):
    """Forward filter for 2-state Gaussian Markov-switching model."""
    T = len(y); pi1 = (1 - P[1,1]) / (2 - P[0,0] - P[1,1])
    pred = np.array([pi1, 1 - pi1]); filt = np.zeros((T, 2)); ll = 0.0
    for t in range(T):
        lik = np.array([np.exp(-0.5*((y[t]-mu[i])/sigma[i])**2)/(sigma[i]*np.sqrt(2*np.pi)) for i in range(2)])
        joint = pred * lik; s = joint.sum()
        ll += np.log(s); filt[t] = joint / s
        pred = filt[t] @ P
    return filt, ll`,
    component: RegimeSwitchTool },
  { id: "dcc", name: "DCC-GARCH (动态相关)", nameEn: "Dynamic Conditional Correlation — Engle (2002)",
    formula: String.raw`Q_t = (1-a-b)\,\bar{Q} + a\,z_{t-1}z_{t-1}^{\top} + b\,Q_{t-1},\qquad R_t = \mathrm{diag}(Q_t)^{-1/2}\, Q_t\, \mathrm{diag}(Q_t)^{-1/2},\quad \Sigma_t = D_t R_t D_t`,
    python: `import numpy as np
from scipy.optimize import minimize

def fit_garch11(r):
    """Step 1: univariate GARCH(1,1) QMLE per asset."""
    def neg_ll(p):
        omega, alpha, beta = p
        if omega <= 0 or alpha < 0 or beta < 0 or alpha + beta >= 0.999:
            return 1e12
        sig2 = np.empty_like(r); sig2[0] = r.var()
        for t in range(1, len(r)):
            sig2[t] = omega + alpha * r[t-1]**2 + beta * sig2[t-1]
        return 0.5 * np.sum(np.log(sig2[1:]) + r[1:]**2 / sig2[1:])
    res = minimize(neg_ll, [0.05*r.var(), 0.08, 0.88], method="Nelder-Mead")
    omega, alpha, beta = res.x
    sig2 = np.empty_like(r); sig2[0] = r.var()
    for t in range(1, len(r)):
        sig2[t] = omega + alpha * r[t-1]**2 + beta * sig2[t-1]
    return sig2, r / np.sqrt(sig2)

def fit_dcc(returns):
    """Engle (2002) DCC(1,1). returns: (T, d) matrix."""
    sig2_z = [fit_garch11(returns[:, i]) for i in range(returns.shape[1])]
    Z = np.column_stack([z for _, z in sig2_z])
    Qbar = (Z.T @ Z) / len(Z)
    def neg_corr_ll(p):
        a, b = p
        if a < 0 or b < 0 or a + b > 0.999: return 1e10
        Q = Qbar.copy(); ll = 0.0
        for t in range(1, len(Z)):
            zlag = Z[t-1][:, None]
            Q = (1 - a - b) * Qbar + a * (zlag @ zlag.T) + b * Q
            sd = np.sqrt(np.diag(Q))
            R = Q / np.outer(sd, sd)
            sign, logdet = np.linalg.slogdet(R)
            quad = Z[t] @ np.linalg.solve(R, Z[t])
            ll += -0.5 * (logdet + quad - Z[t] @ Z[t])
        return -ll
    res = minimize(neg_corr_ll, [0.04, 0.93], method="Nelder-Mead")
    return {"a": res.x[0], "b": res.x[1], "Z": Z, "ll": -res.fun}`,
    component: DCCGarchTool },
  { id: "coint", name: "协整 / VECM", nameEn: "Cointegration & Vector Error Correction Model",
    formula: String.raw`y_t = \alpha + \beta\, x_t + u_t,\quad u_t \sim I(0)\;\Rightarrow\;\Delta y_t = \alpha_{\mathrm{ec}}\,u_{t-1} + \gamma\,\Delta x_t + \varepsilon_t`,
    python: `import numpy as np
from statsmodels.tsa.stattools import adfuller

def engle_granger(y, x):
    X = np.column_stack([np.ones(len(y)), x])
    beta = np.linalg.solve(X.T @ X, X.T @ y)
    u = y - X @ beta
    adf_stat, p_value, *_ = adfuller(u, regression="nc")
    return {"beta": beta[1], "alpha": beta[0],
            "adf": adf_stat, "p": p_value,
            "cointegrated": p_value < 0.05}`,
    component: CointTool },
  { id: "kalman", name: "Kalman / HP 滤波", nameEn: "Kalman Filter & Hodrick-Prescott Decomposition",
    formula: String.raw`\hat\beta_{t|t} = \hat\beta_{t|t-1} + K_t\bigl(y_t - x_t\hat\beta_{t|t-1}\bigr),\quad K_t = \dfrac{P_{t|t-1}\,x_t}{x_t^2 P_{t|t-1} + R}`,
    python: `import numpy as np

def kalman_1d(y, x, R=1.0, Q=1e-4, beta0=0.0, P0=1.0):
    """Time-varying beta: beta_t = beta_{t-1} + eta, y_t = x_t beta_t + eps."""
    beta = np.zeros(len(y))
    beta[0], P = beta0, P0
    for t in range(1, len(y)):
        P_pred = P + Q
        K = P_pred * x[t] / (x[t]**2 * P_pred + R)
        beta[t] = beta[t-1] + K * (y[t] - x[t] * beta[t-1])
        P = (1 - K * x[t]) * P_pred
    return beta`,
    component: KalmanTool },
  { id: "midas", name: "MIDAS (混频回归)", nameEn: "Mixed Data Sampling — High-Freq X → Low-Freq y",
    formula: String.raw`y_t = \alpha + \beta\sum_{k=1}^{K} w_k(\theta)\, x_{t-k/K}^{(H)} + \varepsilon_t,\qquad w_k(\theta) = \dfrac{f(k/(K+1);\,\theta_1,\theta_2)}{\sum_{j=1}^{K} f(j/(K+1);\,\theta_1,\theta_2)}`,
    python: `import numpy as np
from scipy.optimize import minimize

def beta_weights(K, t1, t2):
    """Ghysels (2007) Beta lag polynomial, normalised."""
    x = np.arange(1, K + 1) / (K + 1)
    w = x ** (t1 - 1) * (1 - x) ** (t2 - 1)
    return w / w.sum()

def midas_loss(params, y, X_high, K):
    """X_high: (n_low, K) matrix of K most-recent high-freq lags per low-freq period."""
    alpha, beta, t1, t2 = params
    w = beta_weights(K, max(t1, 1e-3), max(t2, 1e-3))
    yhat = alpha + beta * (X_high @ w)
    return np.mean((y - yhat) ** 2)

def fit_midas(y, X_high, K, x0=(0.0, 1.0, 1.0, 5.0)):
    res = minimize(midas_loss, x0, args=(y, X_high, K), method="Nelder-Mead")
    return res.x  # alpha, beta, theta1, theta2`,
    component: MIDASTool },
];

TOOLS.push({
  id: "logit",
  name: "Logit / Probit (离散选择)",
  nameEn: "Binary Choice Models — Logit, Probit & Marginal Effects",
  formula: String.raw`P(y_i=1\mid x_i) = F(x_i^{\top}\beta),\qquad \mathrm{AME}_k = \frac{1}{n}\sum_{i=1}^{n} f(x_i^{\top}\hat{\beta})\,\hat{\beta}_k,\qquad F \in \{\Lambda,\,\Phi\}`,
  python: `import numpy as np
from scipy.optimize import minimize
from scipy.stats import norm

def neg_ll(beta, X, y, family="logit"):
    z = X @ beta
    if family == "logit":
        p = 1 / (1 + np.exp(-z))
    else:
        p = norm.cdf(z)
    p = np.clip(p, 1e-12, 1 - 1e-12)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p)).sum()

def fit(X, y, family="logit"):
    res = minimize(neg_ll, np.zeros(X.shape[1]), args=(X, y, family), method="BFGS")
    return res.x

def ame(beta, X, family="logit"):
    z = X @ beta
    if family == "logit":
        f = (1 / (1 + np.exp(-z))) * (1 - 1 / (1 + np.exp(-z)))
    else:
        f = norm.pdf(z)
    return f.mean() * beta  # vector of marginal effects`,
  component: LogitProbitTool,
});

TOOLS.push({
  id: "qreg",
  name: "Quantile Regression (分位数回归)",
  nameEn: "Quantile Regression — Koenker & Bassett (1978)",
  formula: String.raw`\hat\beta(\tau) = \arg\min_{\beta}\sum_{i=1}^{n} \rho_{\tau}\bigl(y_i - x_i^{\top}\beta\bigr),\qquad \rho_{\tau}(u) = u\bigl(\tau - \mathbf{1}\{u<0\}\bigr)`,
  python: `import numpy as np
from scipy.optimize import linprog

def quantile_regression(X, y, tau=0.5):
    """Koenker-Bassett quantile regression via linear programming.
    Reformulate min Σ ρ_τ(y - Xβ) as LP with positive/negative residuals u, v.
    """
    n, k = X.shape
    # Variables: [β (k), u (n, ≥0), v (n, ≥0)]; equality: Xβ + u - v = y
    c = np.concatenate([np.zeros(k), tau * np.ones(n), (1 - tau) * np.ones(n)])
    A_eq = np.hstack([X, np.eye(n), -np.eye(n)])
    bounds = [(None, None)] * k + [(0, None)] * (2 * n)
    res = linprog(c, A_eq=A_eq, b_eq=y, bounds=bounds, method="highs")
    return res.x[:k]

def quantile_path(X, y, taus=(0.1, 0.25, 0.5, 0.75, 0.9)):
    return {tau: quantile_regression(X, y, tau) for tau in taus}`,
  component: QuantileRegTool,
});

TOOLS.push({
  id: "psm",
  name: "PSM / IPW / AIPW (双稳健)",
  nameEn: "Propensity-Score Methods — Matching, Weighting & Doubly-Robust ATE",
  formula: String.raw`\widehat{\mathrm{ATE}}_{\mathrm{AIPW}} = \frac{1}{n}\sum_{i=1}^{n}\!\left[ m_1(X_i) - m_0(X_i) + \frac{T_i\bigl(Y_i - m_1(X_i)\bigr)}{\hat{e}(X_i)} - \frac{(1-T_i)\bigl(Y_i - m_0(X_i)\bigr)}{1 - \hat{e}(X_i)} \right]`,
  python: `import numpy as np
from sklearn.linear_model import LogisticRegression, LinearRegression

def aipw(X, T, Y):
    """Doubly-robust ATE: consistent if EITHER e(X) or m_t(X) is correct."""
    e = LogisticRegression().fit(X, T).predict_proba(X)[:, 1].clip(0.02, 0.98)
    m1 = LinearRegression().fit(X[T==1], Y[T==1]).predict(X)
    m0 = LinearRegression().fit(X[T==0], Y[T==0]).predict(X)
    return np.mean((m1 - m0) + T*(Y - m1)/e - (1-T)*(Y - m0)/(1-e))

def ipw(X, T, Y):
    e = LogisticRegression().fit(X, T).predict_proba(X)[:, 1].clip(0.02, 0.98)
    return np.mean(T*Y/e - (1-T)*Y/(1-e))`,
  component: PSMTool,
});

TOOLS.push({
  id: "arima",
  name: "ARIMA + 自动定阶 (AIC/BIC)",
  nameEn: "ARIMA(p,d,q) with Hannan-Rissanen Estimation & Information Criteria",
  formula: String.raw`\Phi(L)(1-L)^d\, y_t = \Theta(L)\,\varepsilon_t,\qquad \mathrm{AIC} = -2\ell + 2k,\quad \mathrm{BIC} = -2\ell + k\ln n,\quad (\hat p,\hat q) = \arg\min_{p,q}\mathrm{AIC}(p,q)`,
  python: `import numpy as np

def hannan_rissanen(y, p, q, L=10):
    """Two-step ARMA(p,q): long-AR for residuals, then OLS on (y_lags, eps_lags)."""
    T = len(y)
    # Step 1: long AR(L) → residuals
    Xa = np.column_stack([np.ones(T-L)] + [y[L-i-1:T-i-1] for i in range(L)])
    ba = np.linalg.lstsq(Xa, y[L:], rcond=None)[0]
    eps = np.zeros(T); eps[L:] = y[L:] - Xa @ ba
    # Step 2: OLS on lagged y and lagged eps
    s = max(p, q, L)
    X = np.column_stack([np.ones(T-s)] +
        [y[s-i-1:T-i-1] for i in range(p)] +
        [eps[s-j-1:T-j-1] for j in range(q)])
    return np.linalg.lstsq(X, y[s:], rcond=None)[0]

def auto_order(y, pmax=3, qmax=3):
    best = (None, np.inf)
    for p in range(pmax+1):
        for q in range(qmax+1):
            res = hannan_rissanen(y, p, q)
            # ssr → aic ...
            if aic < best[1]: best = ((p, q), aic)
    return best[0]`,
  component: ARIMATool,
});

TOOLS.push({
  id: "lp",
  name: "Local Projections (Jordà)",
  nameEn: "Local Projections vs. VAR Wold Impulse Responses — Jordà (2005)",
  formula: String.raw`y_{t+h} = \alpha_h + \beta_h\, x_t + \gamma_h^{\top} W_t + u_{t+h},\qquad \widehat{\mathrm{IRF}}_{\mathrm{LP}}(h) = \hat{\beta}_h,\quad \mathrm{SE}(\hat\beta_h) \text{ via Newey-West}(h)`,
  python: `import numpy as np
from numpy.linalg import lstsq

def local_projection_irf(y, x, H=12, W=None):
    """Jordà (2005): one regression per horizon h → IRF = β_h."""
    irf = []
    for h in range(H+1):
        Xh = np.column_stack([np.ones(len(x)-h-1), x[:-h-1] if h>0 else x[:-1]])
        if W is not None: Xh = np.column_stack([Xh, W[:-h-1]])
        yh = y[h+1:] if h>0 else y[1:]
        b = lstsq(Xh, yh, rcond=None)[0]
        irf.append(b[1])
    return np.array(irf)`,
  component: LocalProjectionTool,
});

TOOLS.push({
  id: "lasso",
  name: "LASSO / Ridge / ElasticNet",
  nameEn: "Regularised Regression — LASSO, Ridge & Elastic Net with K-fold CV",
  formula: String.raw`\hat{\beta}(\lambda,\alpha) = \arg\min_{\beta}\;\frac{1}{2n}\bigl\lVert y - X\beta\bigr\rVert_2^2 + \lambda\!\left[\alpha\,\lVert\beta\rVert_1 + \tfrac{1}{2}(1-\alpha)\,\lVert\beta\rVert_2^2\right]`,
  python: `import numpy as np
from sklearn.linear_model import ElasticNetCV

def fit_elastic_net(X, y, alpha=1.0, n_alphas=50, cv=5):
    """alpha=1 → LASSO; alpha=0 → Ridge; 0<alpha<1 → Elastic Net.
    Uses coordinate descent (Friedman-Hastie-Tibshirani 2010)."""
    model = ElasticNetCV(l1_ratio=alpha, n_alphas=n_alphas, cv=cv,
                         fit_intercept=True, max_iter=5000)
    model.fit(X, y)
    return {"beta": model.coef_,
            "lambda_min": model.alpha_,
            "mse_path": model.mse_path_.mean(axis=1),
            "lambdas": model.alphas_}

def lambda_1se(lambdas, mse_path):
    """Breiman 1-SE rule: most regularised λ within 1 SE of λ_min."""
    mean = mse_path.mean(axis=1); se = mse_path.std(axis=1) / np.sqrt(mse_path.shape[1])
    k_min = mean.argmin()
    return lambdas[(mean <= mean[k_min] + se[k_min]).argmax()]`,
  component: LassoTool,
});

TOOLS.push({
  id: "panel",
  name: "Panel FE / RE + Hausman",
  nameEn: "Panel Data — Fixed vs Random Effects with Hausman Specification Test",
  formula: String.raw`y_{it} = \alpha_i + \beta\, x_{it} + \varepsilon_{it},\qquad H = (\hat\beta_{\mathrm{FE}} - \hat\beta_{\mathrm{RE}})^{\top}\!\bigl[V(\hat\beta_{\mathrm{FE}}) - V(\hat\beta_{\mathrm{RE}})\bigr]^{-1}\!(\hat\beta_{\mathrm{FE}} - \hat\beta_{\mathrm{RE}}) \sim \chi^2_k`,
  python: `import numpy as np
from linearmodels.panel import PanelOLS, RandomEffects

def panel_estimators(df):
    """df is a MultiIndex (entity, time) DataFrame with y, x columns."""
    pooled = PanelOLS.from_formula("y ~ 1 + x", df).fit()
    fe     = PanelOLS.from_formula("y ~ 1 + x + EntityEffects", df).fit()
    re     = RandomEffects.from_formula("y ~ 1 + x", df).fit()
    return pooled, fe, re

def hausman_test(fe, re):
    """H ~ χ²(k); reject H₀ ⇒ use FE."""
    diff = fe.params - re.params
    var  = fe.cov - re.cov
    H    = float(diff.T @ np.linalg.inv(var) @ diff)
    from scipy.stats import chi2
    return H, 1 - chi2.cdf(H, df=len(diff))`,
  component: PanelTool,
});

TOOLS.push({
  id: "tobit",
  name: "Tobit / Heckman 两步",
  nameEn: "Limited Dependent Variables — Tobit & Heckman Sample-Selection Correction",
  formula: String.raw`\text{Tobit:}\;y_i^* = X_i^{\top}\beta + \varepsilon_i,\;y_i = \max(0, y_i^*).\quad \text{Heckman:}\;y_i = X_i^{\top}\beta + \rho\sigma\,\hat\lambda(Z_i^{\top}\hat\gamma) + \eta_i,\;\hat\lambda = \dfrac{\phi(Z\hat\gamma)}{\Phi(Z\hat\gamma)}`,
  python: `import numpy as np
from scipy.optimize import minimize
from scipy.stats import norm

def tobit_neg_ll(params, X, y):
    beta, log_sigma = params[:-1], params[-1]
    sigma = np.exp(log_sigma)
    Xb = X @ beta
    obs = y > 0
    L = np.where(obs,
                 -0.5*np.log(2*np.pi) - log_sigma - 0.5*((y - Xb)/sigma)**2,
                 np.log(np.clip(norm.cdf(-Xb/sigma), 1e-12, 1)))
    return -L.sum()

def heckit_two_step(X, y, Z, d):
    """1) Probit on (Z, d).  2) OLS on selected sample with Mills λ̂."""
    from statsmodels.discrete.discrete_model import Probit
    gamma = Probit(d, Z).fit(disp=False).params
    Zg = Z @ gamma
    lam = norm.pdf(Zg) / np.clip(norm.cdf(Zg), 1e-9, 1)
    sel = d == 1
    Xs  = np.column_stack([X[sel], lam[sel]])
    beta = np.linalg.lstsq(Xs, y[sel], rcond=None)[0]
    return {"beta": beta[:-1], "rho_sigma": beta[-1], "gamma": gamma}`,
  component: TobitTool,
});

TOOLS.push({
  id: "dlm",
  name: "DLM 结构时间序列",
  nameEn: "Dynamic Linear Model — Local Linear Trend + Seasonal Decomposition (Harvey 1989)",
  formula: String.raw`y_t = \mu_t + \gamma_t + \varepsilon_t,\;\; \mu_t = \mu_{t-1} + \nu_{t-1} + \eta_t,\;\; \nu_t = \nu_{t-1} + \zeta_t,\;\; \gamma_t = -\!\!\sum_{s=1}^{S-1}\!\gamma_{t-s} + \omega_t`,
  python: `import numpy as np
import statsmodels.api as sm

def fit_dlm(y, period=12):
    """Local-linear-trend + stochastic seasonal via UnobservedComponents."""
    model = sm.tsa.UnobservedComponents(
        y, level="local linear trend",
        seasonal=period, stochastic_seasonal=True,
    )
    res = model.fit(disp=False)
    return {
        "level":    res.smoothed_state[0],
        "slope":    res.smoothed_state[1],
        "seasonal": res.smoothed_state[2],
        "loglik":   res.llf,
        "params":   res.params,
        "forecast": res.get_forecast(24).predicted_mean,
    }`,
  component: DLMTool,
});


/** Compact collapsible Python reference snippet — companion to the formula bar. */
const PythonReference = ({ code }: { code: string }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="mb-6 rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 hover:text-gold flex items-center gap-2"
        >
          <span>{open ? "▾" : "▸"}</span> Python 参考实现
        </button>
        {open && (
          <button
            onClick={onCopy}
            className="text-[10px] font-mono text-muted-foreground hover:text-gold transition-colors"
          >
            {copied ? "已复制 ✓" : "复制"}
          </button>
        )}
      </div>
      {open && (
        <pre className="m-0 p-4 text-[11px] leading-relaxed font-mono text-foreground/90 overflow-x-auto bg-secondary/20">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};

const EconometricsTools = () => {
  const { t } = useTranslation();
  const [tool, setTool] = useState<ToolId>("olsiv");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => {
    if (s?.tool) setTool(s.tool);
  }, []);
  useSharedState<{ tool: ToolId }>("econ", apply);

  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            {t("sections.econ.tag")}
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            {t("sections.econ.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            实时模拟数据生成过程 (DGP)，可视化估计量在不同场景下的偏差与方差
          </p>
        </motion.div>

        {/* Tool tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 ${
                tool === t.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <motion.div
          key={tool}
          ref={captureRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 md:p-10 glow-gold"
        >
          <div className="flex flex-wrap justify-end gap-2 mb-4">
            <HistoryDrawer
              storageKey="econ"
              currentState={{ tool }}
              onApply={(s: any) => { if (s?.tool) setTool(s.tool); }}
              summarize={(s: any) => `工具: ${s.tool}`}
            />
            <ShareExportToolbar
              storageKey="econ"
              anchorId="econometrics"
              state={{ tool }}
              captureRef={captureRef}
              filename={`econ-${tool}`}
            />
          </div>

          {/* Formula bar */}
          <div className="text-center mb-3 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">
              {Active.nameEn}
            </p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock math={Active.formula} />
            </div>
          </div>

          <PythonReference code={Active.python} />

          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default EconometricsTools;
