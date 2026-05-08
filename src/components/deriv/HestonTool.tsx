import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Area,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ─── PRNG / normal ─── */
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
function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}
function bsCall(S: number, K: number, r: number, sigma: number, T: number) {
  if (T <= 0 || sigma <= 0) return Math.max(S - K, 0);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
}
/** Brent-style bisection on σ ∈ [1e-4, 5] */
function impliedVol(price: number, S: number, K: number, r: number, T: number) {
  let lo = 1e-4, hi = 5.0;
  const fLo = bsCall(S, K, r, lo, T) - price;
  const fHi = bsCall(S, K, r, hi, T) - price;
  if (fLo * fHi > 0) return NaN;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const f = bsCall(S, K, r, mid, T) - price;
    if (Math.abs(f) < 1e-6) return mid;
    if (f * fLo > 0) { lo = mid; } else { hi = mid; }
  }
  return 0.5 * (lo + hi);
}

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md";

const Slider = ({ label, sub, unit, value, min, max, step, onChange }: {
  label: string; sub?: string; unit?: string;
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}{unit && ` ${unit}`}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
      <span>{min}</span><span>{max}</span>
    </div>
  </div>
);

const Stat = ({ label, value, color = "hsl(var(--gold))", sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/**
 * Heston full-truncation Euler MC.
 * Returns terminal S array and a few sample paths for plotting.
 * dS = r S dt + sqrt(v) S dW1
 * dv = kappa(theta - v) dt + xi sqrt(v) dW2,  corr(dW1, dW2) = rho
 */
function simulateHeston(params: {
  S0: number; r: number; v0: number; kappa: number; theta: number; xi: number; rho: number;
  T: number; nPaths: number; nSteps: number; seed: number;
}) {
  const { S0, r, v0, kappa, theta, xi, rho, T, nPaths, nSteps, seed } = params;
  const rng = mulberry32(seed);
  const dt = T / nSteps;
  const sqrtDt = Math.sqrt(dt);
  const ST = new Float64Array(nPaths);
  const sampleN = 30;
  const samples: { t: number; [k: string]: number }[] = [];
  const sampleIdx = Array.from({ length: sampleN }, (_, i) => Math.floor(i * nPaths / sampleN));
  // Track sample paths
  const Spaths: number[][] = sampleIdx.map(() => [S0]);
  const vPaths: number[][] = sampleIdx.map(() => [v0]);

  const Scur = new Float64Array(nPaths).fill(S0);
  const vCur = new Float64Array(nPaths).fill(v0);

  for (let step = 0; step < nSteps; step++) {
    for (let i = 0; i < nPaths; i++) {
      const z1 = randn(rng);
      const z2 = rho * z1 + Math.sqrt(1 - rho * rho) * randn(rng);
      const vPos = Math.max(vCur[i], 0);
      const sqv = Math.sqrt(vPos);
      // log-Euler for S (more stable)
      const lnS = Math.log(Scur[i]) + (r - 0.5 * vPos) * dt + sqv * sqrtDt * z1;
      Scur[i] = Math.exp(lnS);
      vCur[i] = vCur[i] + kappa * (theta - vPos) * dt + xi * sqv * sqrtDt * z2;
    }
    if (step % Math.max(1, Math.floor(nSteps / 50)) === 0 || step === nSteps - 1) {
      const tNow = (step + 1) * dt;
      const row: any = { t: +tNow.toFixed(3) };
      sampleIdx.forEach((idx, k) => {
        Spaths[k].push(Scur[idx]);
        vPaths[k].push(vCur[idx]);
        row[`p${k}`] = +Scur[idx].toFixed(3);
      });
      samples.push(row);
    }
  }
  for (let i = 0; i < nPaths; i++) ST[i] = Scur[i];
  return { ST, samples, Spaths, vPaths };
}

export const HestonTool = () => {
  const [S0, setS0] = useState(100);
  const [r, setR] = useState(0.03);
  const [T, setT] = useState(1.0);
  const [v0, setV0] = useState(0.04);
  const [theta, setTheta] = useState(0.04);
  const [kappa, setKappa] = useState(2.0);
  const [xi, setXi] = useState(0.5);
  const [rho, setRho] = useState(-0.7);
  const [nPaths, setNPaths] = useState(4000);
  const [seed, setSeed] = useState(7);

  const sim = useMemo(() => simulateHeston({
    S0, r, v0, kappa, theta, xi, rho, T, nPaths, nSteps: 100, seed,
  }), [S0, r, v0, kappa, theta, xi, rho, T, nPaths, seed]);

  // Build implied-vol smile by pricing calls on a grid of strikes
  const smile = useMemo(() => {
    const ks: number[] = [];
    for (let i = -10; i <= 10; i++) ks.push(0.05 * i); // log-moneyness grid
    const disc = Math.exp(-r * T);
    const out: { k: number; iv: number; ivBs: number }[] = [];
    for (const k of ks) {
      const K = S0 * Math.exp(k);
      let s = 0;
      for (let i = 0; i < sim.ST.length; i++) {
        const pay = sim.ST[i] - K;
        if (pay > 0) s += pay;
      }
      const price = (s / sim.ST.length) * disc;
      const iv = impliedVol(price, S0, K, r, T);
      // BS reference: flat vol = sqrt((v0+theta)/2) — what BS would assume
      out.push({ k: +k.toFixed(3), iv: isFinite(iv) ? +(iv * 100).toFixed(2) : 0, ivBs: +(Math.sqrt((v0 + theta) / 2) * 100).toFixed(2) });
    }
    return out;
  }, [sim, S0, r, T, v0, theta]);

  // ATM Heston call (k=0) — for the stat panel
  const atmStats = useMemo(() => {
    const K = S0;
    let s = 0; let s2 = 0;
    for (let i = 0; i < sim.ST.length; i++) {
      const pay = Math.max(sim.ST[i] - K, 0);
      s += pay; s2 += pay * pay;
    }
    const m = s / sim.ST.length;
    const v = s2 / sim.ST.length - m * m;
    const price = m * Math.exp(-r * T);
    const se = Math.sqrt(v / sim.ST.length) * Math.exp(-r * T);
    const sigBs = Math.sqrt((v0 + theta) / 2);
    return { price, se, bsRef: bsCall(S0, K, r, sigBs, T) };
  }, [sim, S0, r, T, v0, theta]);

  // Sample-path chart data
  const pathChart = sim.samples;
  const feller = 2 * kappa * theta - xi * xi;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "股指基线 (ρ=-0.7)", description: "典型左偏 skew", apply: () => { setKappa(2); setTheta(0.04); setXi(0.5); setRho(-0.7); setV0(0.04); } },
        { name: "FX 对称微笑", description: "ρ=0, 高 ξ", apply: () => { setKappa(1.5); setTheta(0.025); setXi(0.6); setRho(0); setV0(0.025); } },
        { name: "危机左尾", description: "高 v₀, 强 ρ<0", apply: () => { setKappa(3); setTheta(0.06); setXi(0.8); setRho(-0.85); setV0(0.10); } },
        { name: "近 BS 极限", description: "ξ→0, 退化", apply: () => { setKappa(5); setTheta(0.04); setXi(0.05); setRho(0); setV0(0.04); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">市场参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="S₀" value={S0} min={50} max={200} step={5} onChange={setS0} />
            <Slider label="r" unit="" value={r} min={0} max={0.1} step={0.005} onChange={setR} />
            <Slider label="T (年)" value={T} min={0.1} max={3} step={0.05} onChange={setT} />
            <Slider label="v₀ (初始方差)" sub="≈σ²" value={v0} min={0.005} max={0.2} step={0.005} onChange={setV0} />
          </div>
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-4">Heston 五参数</p>
          <Slider label="κ (回复速度)" value={kappa} min={0.1} max={6} step={0.1} onChange={setKappa} />
          <Slider label="θ (长期方差)" sub="均值回复目标" value={theta} min={0.005} max={0.2} step={0.005} onChange={setTheta} />
          <Slider label="ξ (vol-of-vol)" sub="决定 smile 曲度" value={xi} min={0.05} max={1.5} step={0.05} onChange={setXi} />
          <Slider label="ρ (相关系数)" sub="决定 skew 方向" value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="路径数" value={nPaths} min={1000} max={10000} step={500} onChange={setNPaths} />
            <Slider label="种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Heston ATM 价格" value={atmStats.price.toFixed(3)} sub={`MC SE ≈ ${atmStats.se.toFixed(4)}`} />
            <Stat label="BS 参考 (σ=√((v₀+θ)/2))" value={atmStats.bsRef.toFixed(3)} color={CHART_TEAL} />
            <Stat label="ATM IV (Heston)" value={`${(smile.find(s => s.k === 0)?.iv ?? 0).toFixed(2)}%`} />
            <Stat label="Feller 2κθ−ξ²" value={feller.toFixed(3)} color={feller >= 0 ? CHART_TEAL : CHART_RED}
              sub={feller >= 0 ? "v 严格非负" : "v 可触零，需 full-truncation"} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">Heston (1993)：</span>方差自身服从 CIR 过程，弥补了 BS 常数 σ 的根本缺陷。</p>
            <p>ρ &lt; 0 → 左偏 skew（股票指数典型）；|ξ| 增大 → smile 曲度上升。</p>
            <p>BS 平直 IV 对应水平线 — 与 Heston 曲线对比可直观看出"BS 错在哪里"。</p>
          </div>
        </div>
      </div>

      {/* Smile chart */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">隐含波动率微笑 — Heston vs BS 平直 IV @ T={T.toFixed(2)}</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smile}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "log-moneyness k = ln(K/S₀)", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={["auto", "auto"]}
                label={{ value: "IV %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="iv" name="Heston IV (MC)" stroke={CHART_GOLD} strokeWidth={2.5} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="ivBs" name="BS 平直 IV (常数 σ)" stroke={CHART_TEAL} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <ReferenceLine x={0} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: "ATM", fill: CHART_RED, fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sample paths */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">样本路径 S(t) — 随机方差驱动下的 30 条</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pathChart}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              {Array.from({ length: 30 }, (_, k) => (
                <Line key={k} type="monotone" dataKey={`p${k}`} stroke={k % 3 === 0 ? CHART_GOLD : k % 3 === 1 ? CHART_TEAL : CHART_BLUE}
                  strokeOpacity={0.35} strokeWidth={1} dot={false} isAnimationActive={false} />
              ))}
              <ReferenceLine y={S0} stroke={CHART_RED} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default HestonTool;