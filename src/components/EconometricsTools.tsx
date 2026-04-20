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
const DIDTool = () => {
  const [trend, setTrend] = useState(2);
  const [treatLevel, setTreatLevel] = useState(3);
  const [effect, setEffect] = useState(4);
  const [noise, setNoise] = useState(0.5);
  const [seed, setSeed] = useState(7);
  const [preTrendBias, setPreTrendBias] = useState(0); // differential pre-trend (violates parallel trends)
  const [nUnits, setNUnits] = useState(40);            // units per group (for event-study CI)

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
        // pre-trend bias: linearly differential trend before treatment as well
        const bias = preTrendBias * t;
        const tau_t = k >= 0 ? effect : 0;
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
      if (t === baseT) {
        eventRows.push({ k, tau: 0, lo: 0, hi: 0 });
        continue;
      }
      const dT = diffsPerK(treatPanel, t);
      const dC = diffsPerK(ctrlPanel, t);
      const mT = avg(dT), mC = avg(dC);
      const tau_k = mT - mC;
      // var of difference of means (independent groups)
      const varOf = (arr: number[], m: number) =>
        arr.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(arr.length - 1, 1);
      const seK = Math.sqrt(varOf(dT, mT) / nUnits + varOf(dC, mC) / nUnits);
      eventRows.push({
        k,
        tau: +tau_k.toFixed(4),
        lo: +(tau_k - 1.96 * seK).toFixed(4),
        hi: +(tau_k + 1.96 * seK).toFixed(4),
        ci: [+(tau_k - 1.96 * seK).toFixed(4), +(tau_k + 1.96 * seK).toFixed(4)] as [number, number],
      });
    }

    return { series: merged, att, treatStart, eventRows, baseT };
  }, [trend, treatLevel, effect, noise, seed, preTrendBias, nUnits]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "经典案例", description: "正向干预 ATT=4，无预趋势", apply: () => { setTrend(2); setTreatLevel(3); setEffect(4); setNoise(0.5); setPreTrendBias(0); } },
        { name: "零效应", description: "ATT=0, 检验假阳性", apply: () => { setEffect(0); setNoise(1); setPreTrendBias(0); } },
        { name: "违反平行趋势", description: "处理组预期已偏离", apply: () => { setEffect(4); setPreTrendBias(0.6); setNoise(0.4); } },
      ]} />
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
              <ReferenceLine y={effect} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: `真实 ATT=${effect.toFixed(2)}`, fill: CHART_RED, fontSize: 10, position: "right" }} />
              <Area dataKey="ci" stroke="none" fill={CHART_GOLD} fillOpacity={0.18} name="95% CI" />
              <Line dataKey="tau" name="τ̂_k" stroke={CHART_GOLD} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground font-mono">
          k&lt;0 处置信区间应包含 0 → 平行趋势成立；k≥0 处 τ̂_k 反映动态效应（首期、滞后、衰减等）。
        </p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. RDD — Sharp Regression Discontinuity
   ════════════════════════════════════════════════════════════ */
const RDDTool = () => {
  const [n, setN] = useState(300);
  const [cutoff, setCutoff] = useState(0);
  const [jump, setJump] = useState(3);     // true treatment effect
  const [slopeL, setSlopeL] = useState(1);
  const [slopeR, setSlopeR] = useState(1);
  const [noise, setNoise] = useState(0.8);
  const [seed, setSeed] = useState(11);
  const [bandwidth, setBandwidth] = useState(2);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const pts: { x: number; y: number; treated: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = (rng() - 0.5) * 10;       // running variable in [-5, 5]
      const treated = x >= cutoff ? 1 : 0;
      const slope = treated ? slopeR : slopeL;
      const y = slope * (x - cutoff) + treated * jump + randn(rng) * noise;
      pts.push({ x, y, treated });
    }
    // local-linear within bandwidth
    const left = pts.filter(p => p.x >= cutoff - bandwidth && p.x < cutoff).map(p => [p.x, p.y]);
    const right = pts.filter(p => p.x <= cutoff + bandwidth && p.x >= cutoff).map(p => [p.x, p.y]);
    const olsL = left.length > 5 ? ols(left.map(p => p[0]), left.map(p => p[1])) : null;
    const olsR = right.length > 5 ? ols(right.map(p => p[0]), right.map(p => p[1])) : null;
    const yL = olsL ? olsL.alpha + olsL.beta * cutoff : NaN;
    const yR = olsR ? olsR.alpha + olsR.beta * cutoff : NaN;
    const tau = yR - yL;
    const lineL = olsL ? [{ x: cutoff - bandwidth, y: olsL.alpha + olsL.beta * (cutoff - bandwidth) }, { x: cutoff, y: yL }] : [];
    const lineR = olsR ? [{ x: cutoff, y: yR }, { x: cutoff + bandwidth, y: olsR.alpha + olsR.beta * (cutoff + bandwidth) }] : [];
    return { pts, tau, lineL, lineR, yL, yR };
  }, [n, cutoff, jump, slopeL, slopeR, noise, seed, bandwidth]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "清晰跳跃", description: "强政策效应 τ=3", apply: () => { setJump(3); setNoise(0.5); setBandwidth(2); } },
        { name: "弱效应高噪声", description: "τ=1, 检验功效", apply: () => { setJump(1); setNoise(1.5); setBandwidth(2); } },
        { name: "斜率不连续", description: "左右斜率不同", apply: () => { setJump(2); setSlopeL(0.5); setSlopeR(2); setNoise(0.5); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="样本量 n" value={n} min={50} max={1000} step={50} onChange={setN} />
          <Slider label="切点 c" value={cutoff} min={-3} max={3} step={0.1} onChange={setCutoff} />
          <Slider label="真实跳跃 τ" value={jump} min={-5} max={8} step={0.1} onChange={setJump} />
          <Slider label="左侧斜率" value={slopeL} min={-2} max={3} step={0.1} onChange={setSlopeL} />
          <Slider label="右侧斜率" value={slopeR} min={-2} max={3} step={0.1} onChange={setSlopeR} />
          <Slider label="噪声 σ" value={noise} min={0.1} max={3} step={0.05} onChange={setNoise} />
          <Slider label="带宽 h" value={bandwidth} min={0.5} max={5} step={0.1} onChange={setBandwidth} />
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

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const xs: number[] = [];
    for (let i = 0; i < n; i++) xs.push(trueMu + trueSigma * randn(rng));
    const m1 = xs.reduce((a, b) => a + b, 0) / n;                        // E[x] = μ
    const m2 = xs.reduce((a, b) => a + b * b, 0) / n;                    // E[x²] = μ² + σ²

    // Two moment conditions:
    //   g1(μ) = m1 - μ
    //   g2(μ) = m2 - (μ² + σ²)  (treat σ as nuisance, use sample σ)
    // Weighted GMM: μ̂ = arg min  W·g(μ)'g(μ)
    // Use weight w1 on g1, (1-w1) on g2
    const sampleVar = m2 - m1 * m1;
    // grid search over μ
    let bestMu = m1, bestQ = Infinity;
    for (let mu = -5; mu <= 10; mu += 0.001) {
      const g1 = m1 - mu;
      const g2 = m2 - (mu * mu + sampleVar);
      const Q = w1 * g1 * g1 + (1 - w1) * g2 * g2;
      if (Q < bestQ) { bestQ = Q; bestMu = mu; }
    }

    // build objective curve for plot
    const curve: any[] = [];
    for (let mu = trueMu - 2; mu <= trueMu + 2; mu += 0.05) {
      const g1 = m1 - mu;
      const g2 = m2 - (mu * mu + sampleVar);
      curve.push({ mu: +mu.toFixed(3), Q: +(w1 * g1 * g1 + (1 - w1) * g2 * g2).toFixed(4) });
    }

    return { m1, m2, bestMu, bestQ, curve, sampleVar };
  }, [trueMu, trueSigma, n, w1, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "等权重", description: "w₁=0.5, 标准 GMM", apply: () => { setW1(0.5); setTrueMu(2); setTrueSigma(1.5); } },
        { name: "仅一阶矩", description: "w₁=1, 退化为样本均值", apply: () => { setW1(1); } },
        { name: "仅二阶矩", description: "w₁=0, 用方差识别 μ", apply: () => { setW1(0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="真实 μ" value={trueMu} min={-3} max={5} step={0.1} onChange={setTrueMu} />
          <Slider label="真实 σ" value={trueSigma} min={0.2} max={3} step={0.1} onChange={setTrueSigma} />
          <Slider label="样本量 n" value={n} min={30} max={2000} step={10} onChange={setN} />
          <Slider label="一阶矩权重 w₁" value={w1} min={0} max={1} step={0.05} onChange={setW1} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <ResultRow label="GMM μ̂" value={data.bestMu} truth={trueMu} color={CHART_GOLD} />
          <ResultRow label="样本一阶矩 m₁" value={data.m1} color={CHART_TEAL} />
          <ResultRow label="样本二阶矩 m₂" value={data.m2} color={CHART_BLUE} />
          <ResultRow label="目标函数 Q(μ̂)" value={data.bestQ} color={CHART_RED} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">矩条件：</span>g₁ = m₁ − μ， g₂ = m₂ − (μ² + σ²)</p>
            <p><span className="text-gold">GMM：</span>μ̂ = argmin g(μ)' W g(μ)，权重矩阵 W 由 w₁ 控制。</p>
            <p>当模型正确设定时，过度识别 J 检验可用于检验矩条件有效性。</p>
          </div>
        </div>
      </div>
      <div className="h-[300px] mt-4 rounded-xl border border-border p-4 bg-secondary/20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="mu" stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "μ", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 11 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} label={{ value: "Q(μ)", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <ReferenceLine x={trueMu} stroke={CHART_TEAL} strokeDasharray="4 4" label={{ value: "真实 μ", fill: CHART_TEAL, fontSize: 10 }} />
            <ReferenceLine x={data.bestMu} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "μ̂", fill: CHART_GOLD, fontSize: 10, position: "top" }} />
            <Line dataKey="Q" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
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
