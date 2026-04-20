import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Line, LineChart, Legend, ComposedChart, ReferenceArea, Area,
} from "recharts";
import PresetButtons, { Preset } from "./PresetButtons";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(220, 12%, 18%)";
const CHART_TEXT = "hsl(220, 10%, 50%)";

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
  const [manipulation, setManipulation] = useState(0);
  const [mode, setMode] = useState<RDDMode>("sharp");
  const [pBelow, setPBelow] = useState(0.10); // P(D=1 | X<c) — always-takers
  const [pAbove, setPAbove] = useState(0.75); // P(D=1 | X≥c) — compliers + always-takers
  // Note: for sharp RDD these are forced to 0 / 1.

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

    // ── Local-linear fits on Y (reduced form / sharp τ̂) ──
    const left = pts.filter(p => p.x >= cutoff - bandwidth && p.x < cutoff);
    const right = pts.filter(p => p.x <= cutoff + bandwidth && p.x >= cutoff);
    const olsLY = left.length > 5 ? ols(left.map(p => p.x), left.map(p => p.y)) : null;
    const olsRY = right.length > 5 ? ols(right.map(p => p.x), right.map(p => p.y)) : null;
    const yL = olsLY ? olsLY.alpha + olsLY.beta * cutoff : NaN;
    const yR = olsRY ? olsRY.alpha + olsRY.beta * cutoff : NaN;
    const tauSharp = yR - yL;     // reduced-form jump in Y at c
    const lineL = olsLY ? [{ x: cutoff - bandwidth, y: olsLY.alpha + olsLY.beta * (cutoff - bandwidth) }, { x: cutoff, y: yL }] : [];
    const lineR = olsRY ? [{ x: cutoff, y: yR }, { x: cutoff + bandwidth, y: olsRY.alpha + olsRY.beta * (cutoff + bandwidth) }] : [];

    // ── First-stage local-linear on D (probability of treatment) ──
    const olsLD = left.length > 5 ? ols(left.map(p => p.x), left.map(p => p.D)) : null;
    const olsRD = right.length > 5 ? ols(right.map(p => p.x), right.map(p => p.D)) : null;
    const dL = olsLD ? Math.min(Math.max(olsLD.alpha + olsLD.beta * cutoff, 0), 1) : NaN;
    const dR = olsRD ? Math.min(Math.max(olsRD.alpha + olsRD.beta * cutoff, 0), 1) : NaN;
    const dJump = dR - dL;        // first-stage jump
    const dLineL = olsLD ? [{ x: cutoff - bandwidth, p: olsLD.alpha + olsLD.beta * (cutoff - bandwidth) }, { x: cutoff, p: dL }] : [];
    const dLineR = olsRD ? [{ x: cutoff, p: dR }, { x: cutoff + bandwidth, p: olsRD.alpha + olsRD.beta * (cutoff + bandwidth) }] : [];

    // ── Wald / Fuzzy estimator ──
    const tauWald = mode === "fuzzy" ? tauSharp / (Math.abs(dJump) > 1e-6 ? dJump : NaN) : tauSharp;

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
    };
  }, [n, cutoff, jump, slopeL, slopeR, noise, seed, bandwidth, manipulation, mode, pBelow, pAbove]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "清晰跳跃", description: "强政策效应 τ=3, 无操纵", apply: () => { setJump(3); setNoise(0.5); setBandwidth(2); setManipulation(0); } },
        { name: "弱效应高噪声", description: "τ=1, 检验功效", apply: () => { setJump(1); setNoise(1.5); setBandwidth(2); setManipulation(0); } },
        { name: "存在操纵", description: "个体跳到切点之上", apply: () => { setJump(3); setNoise(0.5); setManipulation(0.7); setN(600); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="样本量 n" value={n} min={50} max={1500} step={50} onChange={setN} />
          <Slider label="切点 c" value={cutoff} min={-3} max={3} step={0.1} onChange={setCutoff} />
          <Slider label="真实跳跃 τ" value={jump} min={-5} max={8} step={0.1} onChange={setJump} />
          <Slider label="左侧斜率" value={slopeL} min={-2} max={3} step={0.1} onChange={setSlopeL} />
          <Slider label="右侧斜率" value={slopeR} min={-2} max={3} step={0.1} onChange={setSlopeR} />
          <Slider label="噪声 σ" value={noise} min={0.1} max={3} step={0.05} onChange={setNoise} />
          <Slider label="带宽 h" value={bandwidth} min={0.5} max={5} step={0.1} onChange={setBandwidth} />
          <Slider label="操纵概率 (just-below 跳到 just-above)" value={manipulation} min={0} max={1} step={0.05} onChange={setManipulation} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <ResultRow label="局部线性 τ̂" value={data.tau} truth={jump} se={NaN} color={CHART_GOLD} />
          <ResultRow label="切点左极限" value={data.yL} color={CHART_TEAL} />
          <ResultRow label="切点右极限" value={data.yR} color={CHART_RED} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">公式：</span>τ = lim_{"{x→c⁺}"} E[Y|X=x] − lim_{"{x→c⁻}"} E[Y|X=x]</p>
            <p><span className="text-gold">假设：</span>个体无法精确操控 X 越过切点；E[Y(0)|X] 在 c 处连续。</p>
            <p>带宽 h 越小偏差越小但方差越大 (bias-variance trade-off)。</p>
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
            <Scatter name="控制组 (X<c)" data={data.pts.filter(p => p.treated === 0)} fill={CHART_TEAL} fillOpacity={0.45} />
            <Scatter name="处理组 (X≥c)" data={data.pts.filter(p => p.treated === 1)} fill={CHART_RED} fillOpacity={0.45} />
            <Line name="左侧拟合" data={data.lineL} dataKey="y" stroke={CHART_TEAL} strokeWidth={2.5} dot={false} />
            <Line name="右侧拟合" data={data.lineR} dataKey="y" stroke={CHART_RED} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

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
type ToolId = "olsiv" | "did" | "rdd" | "gmm";

const TOOLS: { id: ToolId; name: string; formula: string; component: React.FC }[] = [
  { id: "olsiv", name: "OLS / IV", formula: "y = α + βx + ε,  内生时用 IV: x̂ = π̂z → y", component: OLSvsIV },
  { id: "did",   name: "DID",      formula: "τ̂ = (Ȳ₁ₚₒₛₜ − Ȳ₁ₚᵣₑ) − (Ȳ₀ₚₒₛₜ − Ȳ₀ₚᵣₑ)", component: DIDTool },
  { id: "rdd",   name: "RDD",      formula: "τ = lim_{x→c⁺} E[Y|X=x] − lim_{x→c⁻} E[Y|X=x]", component: RDDTool },
  { id: "gmm",   name: "GMM",      formula: "μ̂ = argmin g(μ)' W g(μ)", component: GMMTool },
];

const EconometricsTools = () => {
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
            Econometrics Lab
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            计量经济学交互工具
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
          <div className="flex justify-end mb-4">
            <ShareExportToolbar
              storageKey="econ"
              anchorId="econometrics"
              state={{ tool }}
              captureRef={captureRef}
              filename={`econ-${tool}`}
            />
          </div>

          {/* Formula bar */}
          <div className="text-center mb-8 py-4 px-6 rounded-xl bg-secondary/50 border border-border">
            <p className="text-base md:text-lg font-mono text-gold tracking-wide">
              {Active.formula}
            </p>
          </div>

          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default EconometricsTools;
