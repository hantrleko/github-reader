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
        { name: "清晰跳跃 (Sharp)", description: "确定性处理 τ=3", apply: () => { setMode("sharp"); setJump(3); setNoise(0.5); setBandwidth(2); setManipulation(0); } },
        { name: "Fuzzy 高顺从", description: "0.10 → 0.85, 强工具", apply: () => { setMode("fuzzy"); setPBelow(0.10); setPAbove(0.85); setJump(3); setNoise(0.5); setBandwidth(2); setManipulation(0); setN(800); } },
        { name: "Fuzzy 弱跳跃", description: "0.30 → 0.45, 弱工具", apply: () => { setMode("fuzzy"); setPBelow(0.30); setPAbove(0.45); setJump(3); setNoise(0.5); setBandwidth(2); setN(1200); } },
        { name: "存在操纵", description: "个体跳到切点之上", apply: () => { setMode("sharp"); setJump(3); setNoise(0.5); setManipulation(0.7); setN(600); } },
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="样本量 n" value={n} min={50} max={2000} step={50} onChange={setN} />
          <Slider label="切点 c" value={cutoff} min={-3} max={3} step={0.1} onChange={setCutoff} />
          <Slider label="真实跳跃 τ" value={jump} min={-5} max={8} step={0.1} onChange={setJump} />
          <Slider label="左侧斜率" value={slopeL} min={-2} max={3} step={0.1} onChange={setSlopeL} />
          <Slider label="右侧斜率" value={slopeR} min={-2} max={3} step={0.1} onChange={setSlopeR} />
          <Slider label="噪声 σ" value={noise} min={0.1} max={3} step={0.05} onChange={setNoise} />
          <Slider label="带宽 h" value={bandwidth} min={0.5} max={5} step={0.1} onChange={setBandwidth} />
          <Slider label="操纵概率 (just-below 跳到 just-above)" value={manipulation} min={0} max={1} step={0.05} onChange={setManipulation} />
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

    return { series: series2, A, L, Bbq, hd, fevd };
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
      <div className="p-3 rounded-lg border border-border bg-secondary/30 text-xs font-mono text-muted-foreground leading-relaxed space-y-1">
        <div><span className="text-gold">Cholesky：</span>
          B₀ 下三角 ⇒ ε₂ 同期不影响 y₁。短期排序假设。
        </div>
        <div><span style={{ color: CHART_TEAL }}>Blanchard-Quah：</span>
          长期累计影响 C(1)·B 下三角 ⇒ ε₂ <span className="underline">长期</span>累计对 y₁ 为 0
          (典型用法：ε₁=供给冲击有 LR 效果，ε₂=需求冲击仅短期)。
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
type ToolId = "olsiv" | "did" | "rdd" | "gmm" | "svar";

const TOOLS: { id: ToolId; name: string; formula: string; component: React.FC }[] = [
  { id: "olsiv", name: "OLS / IV", formula: "y = α + βx + ε,  内生时用 IV: x̂ = π̂z → y", component: OLSvsIV },
  { id: "did",   name: "DID",      formula: "τ̂ = (Ȳ₁ₚₒₛₜ − Ȳ₁ₚᵣₑ) − (Ȳ₀ₚₒₛₜ − Ȳ₀ₚᵣₑ)", component: DIDTool },
  { id: "rdd",   name: "RDD",      formula: "τ = lim_{x→c⁺} E[Y|X=x] − lim_{x→c⁻} E[Y|X=x]", component: RDDTool },
  { id: "gmm",   name: "GMM",      formula: "μ̂ = argmin g(μ)' W g(μ)", component: GMMTool },
  { id: "svar",  name: "SVAR / IRF", formula: "y_t = A y_{t-1} + B₀ ε_t,   IRF_h = A^h · L · e_j  (Cholesky)", component: SVARTool },
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
