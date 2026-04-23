import { useState, useMemo, useRef, useCallback } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import PresetButtons, { Preset } from "./PresetButtons";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(220, 12%, 18%)";
const CHART_TEXT = "hsl(220, 10%, 50%)";

const PATH_COLORS = [
  CHART_GOLD, CHART_TEAL, CHART_BLUE, CHART_RED,
  "hsl(280,60%,55%)", "hsl(150,60%,45%)", "hsl(30,80%,50%)",
  "hsl(340,60%,50%)", "hsl(60,70%,50%)", "hsl(200,60%,50%)",
];

type OptionType = "european" | "asian" | "barrier";
type PutCall = "call" | "put";
type BarrierType = "up-out" | "up-in" | "down-out" | "down-in";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMuller(rand: () => number): number {
  const u1 = rand();
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// BS analytical for comparison
function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}

function bsPrice(s: number, k: number, r: number, sigma: number, t: number, isCall: boolean) {
  if (t <= 0 || sigma <= 0) {
    return isCall ? Math.max(s - k, 0) : Math.max(k - s, 0);
  }
  const d1 = (Math.log(s / k) + (r + sigma * sigma / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  if (isCall) return s * normCdf(d1) - k * Math.exp(-r * t) * normCdf(d2);
  return k * Math.exp(-r * t) * normCdf(-d2) - s * normCdf(-d1);
}

interface MCResult {
  price: number;
  stdErr: number;
  ci95: [number, number];
  bsAnalytical: number | null;
  samplePaths: number[][]; // first N paths for display
  times: number[];
  payoffDist: { bin: number; count: number }[];
  convergence: { n: number; price: number; upper: number; lower: number }[];
  barrierHits?: number; // for barrier options
}

function runMC(
  optionType: OptionType,
  putCall: PutCall,
  s0: number, k: number, r: number, sigma: number, T: number,
  nPaths: number, nSteps: number, seed: number,
  barrierType: BarrierType, barrierLevel: number,
): MCResult {
  const dt = T / nSteps;
  const sqrtDt = Math.sqrt(dt);
  const drift = (r - 0.5 * sigma * sigma) * dt;
  const vol = sigma * sqrtDt;
  const rand = mulberry32(seed);
  const discount = Math.exp(-r * T);

  const payoffs: number[] = [];
  const samplePaths: number[][] = [];
  const showPaths = Math.min(nPaths, 10);
  let barrierHits = 0;

  // Convergence tracking
  const convergencePoints = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000].filter(n => n <= nPaths);

  let cumSum = 0;
  let cumSumSq = 0;
  const convergence: { n: number; price: number; upper: number; lower: number }[] = [];

  for (let p = 0; p < nPaths; p++) {
    let s = s0;
    const path: number[] = [s0];
    let sumS = s0;
    let hitBarrier = false;

    for (let i = 0; i < nSteps; i++) {
      const z = boxMuller(rand);
      s = s * Math.exp(drift + vol * z);
      path.push(s);
      sumS += s;

      // Check barrier
      if (optionType === "barrier") {
        if ((barrierType === "up-out" || barrierType === "up-in") && s >= barrierLevel) {
          hitBarrier = true;
        }
        if ((barrierType === "down-out" || barrierType === "down-in") && s <= barrierLevel) {
          hitBarrier = true;
        }
      }
    }

    if (p < showPaths) samplePaths.push(path);

    // Compute payoff
    let payoff = 0;
    const isCall = putCall === "call";

    if (optionType === "european") {
      payoff = isCall ? Math.max(s - k, 0) : Math.max(k - s, 0);
    } else if (optionType === "asian") {
      const avgS = sumS / (nSteps + 1);
      payoff = isCall ? Math.max(avgS - k, 0) : Math.max(k - avgS, 0);
    } else if (optionType === "barrier") {
      const vanillaPayoff = isCall ? Math.max(s - k, 0) : Math.max(k - s, 0);
      if (barrierType === "up-out" || barrierType === "down-out") {
        payoff = hitBarrier ? 0 : vanillaPayoff;
      } else {
        payoff = hitBarrier ? vanillaPayoff : 0;
      }
      if (hitBarrier) barrierHits++;
    }

    const discPayoff = discount * payoff;
    payoffs.push(discPayoff);
    cumSum += discPayoff;
    cumSumSq += discPayoff * discPayoff;

    // Convergence
    const n = p + 1;
    if (convergencePoints.includes(n) || n === nPaths) {
      const mean = cumSum / n;
      const variance = cumSumSq / n - mean * mean;
      const se = Math.sqrt(Math.max(0, variance) / n);
      convergence.push({
        n,
        price: parseFloat(mean.toFixed(4)),
        upper: parseFloat((mean + 1.96 * se).toFixed(4)),
        lower: parseFloat((mean - 1.96 * se).toFixed(4)),
      });
    }
  }

  const price = cumSum / nPaths;
  const variance = cumSumSq / nPaths - price * price;
  const stdErr = Math.sqrt(Math.max(0, variance) / nPaths);

  // Payoff distribution histogram
  const nBins = 40;
  const nonZeroPayoffs = payoffs.filter(p => p > 0);
  const allPayoffs = payoffs;
  const minP = Math.min(...allPayoffs);
  const maxP = Math.max(...allPayoffs);
  const binWidth = (maxP - minP) / nBins || 0.01;
  const payoffDist: { bin: number; count: number }[] = [];
  for (let i = 0; i < nBins; i++) {
    const lo = minP + i * binWidth;
    const hi = lo + binWidth;
    const mid = (lo + hi) / 2;
    payoffDist.push({
      bin: parseFloat(mid.toFixed(3)),
      count: allPayoffs.filter(p => p >= lo && p < hi).length,
    });
  }

  // BS analytical (only for European)
  const bsAnalytical = optionType === "european"
    ? bsPrice(s0, k, r, sigma, T, putCall === "call")
    : null;

  const times = Array.from({ length: nSteps + 1 }, (_, i) => parseFloat((i * dt).toFixed(4)));

  return {
    price, stdErr,
    ci95: [price - 1.96 * stdErr, price + 1.96 * stdErr],
    bsAnalytical,
    samplePaths, times, payoffDist, convergence,
    barrierHits,
  };
}

const MCOptionPricer = () => {
  const [optionType, setOptionType] = useState<OptionType>("european");
  const [putCall, setPutCall] = useState<PutCall>("call");
  const [s0, setS0] = useState(100);
  const [k, setK] = useState(100);
  const [r, setR] = useState(5);
  const [sigma, setSigma] = useState(20);
  const [T, setT] = useState(1);
  const [nPaths, setNPaths] = useState(10000);
  const [seed, setSeed] = useState(42);
  const [barrierType, setBarrierType] = useState<BarrierType>("up-out");
  const [barrierLevel, setBarrierLevel] = useState(120);

  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: any) => {
    if (s.optionType) setOptionType(s.optionType);
    if (s.putCall) setPutCall(s.putCall);
    if (s.s0 != null) setS0(s.s0);
    if (s.k != null) setK(s.k);
    if (s.r != null) setR(s.r);
    if (s.sigma != null) setSigma(s.sigma);
    if (s.T != null) setT(s.T);
    if (s.nPaths != null) setNPaths(s.nPaths);
    if (s.seed != null) setSeed(s.seed);
    if (s.barrierType) setBarrierType(s.barrierType);
    if (s.barrierLevel != null) setBarrierLevel(s.barrierLevel);
  }, []);
  useSharedState("mc", apply);

  const nSteps = 252;

  const result = useMemo(() => {
    return runMC(
      optionType, putCall,
      s0, k, r / 100, sigma / 100, T,
      nPaths, nSteps, seed,
      barrierType, barrierLevel,
    );
  }, [optionType, putCall, s0, k, r, sigma, T, nPaths, seed, barrierType, barrierLevel]);

  // Chart data for sample paths
  const pathData = useMemo(() => {
    const skip = Math.max(1, Math.floor(nSteps / 80));
    const data: Record<string, number>[] = [];
    for (let i = 0; i <= nSteps; i += skip) {
      const point: Record<string, number> = { t: result.times[i] };
      for (let p = 0; p < result.samplePaths.length; p++) {
        point[`p${p}`] = parseFloat(result.samplePaths[p][i].toFixed(2));
      }
      data.push(point);
    }
    return data;
  }, [result]);

  const sliderClass = "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md";

  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit = "") => (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm text-secondary-foreground font-medium">{label}</label>
        <span className="text-sm font-mono text-gold">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );

  const optionNames: Record<OptionType, string> = { european: "欧式期权", asian: "亚式期权", barrier: "障碍期权" };
  const formulas: Record<OptionType, string> = {
    european: String.raw`V = e^{-rT}\,\mathbb{E}^{\mathbb{Q}}\!\bigl[\max(S_T - K,\,0)\bigr]`,
    asian:    String.raw`V = e^{-rT}\,\mathbb{E}^{\mathbb{Q}}\!\bigl[\max(\bar{S} - K,\,0)\bigr],\quad \bar{S}=\tfrac{1}{n}\sum_{i=1}^{n}S_{t_i}`,
    barrier:  String.raw`V = e^{-rT}\,\mathbb{E}^{\mathbb{Q}}\!\bigl[\max(S_T - K,\,0)\,\cdot\,\mathbf{1}_{\{\text{barrier condition}\}}\bigr]`,
  };
  const formulaLabels: Record<OptionType, string> = {
    european: "European Option — Risk-Neutral Expectation",
    asian:    "Asian (Average-Price) Option",
    barrier:  "Barrier Option (Knock-In / Knock-Out)",
  };

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            Monte Carlo Pricing
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            蒙特卡洛期权定价器
          </h2>
        </motion.div>

        <motion.div
          ref={captureRef}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold"
        >
          <div className="flex justify-end mb-4">
            <ShareExportToolbar
              storageKey="mc"
              anchorId="mc-pricer"
              state={{ optionType, putCall, s0, k, r, sigma, T, nPaths, seed, barrierType, barrierLevel }}
              captureRef={captureRef}
              filename={`mc-${optionType}`}
            />
          </div>
          {/* Option type tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {(["european", "asian", "barrier"] as OptionType[]).map((t) => (
              <button key={t} onClick={() => setOptionType(t)}
                className={`px-5 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 ${
                  optionType === t ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >{optionNames[t]}</button>
            ))}
          </div>

          {/* Formula */}
          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">
              {formulaLabels[optionType]}
            </p>
            <div className="text-foreground katex-display-gold">
              <BlockMath math={formulas[optionType]} />
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              Underlying dynamics:&nbsp;
              <span className="text-foreground/80">
                <BlockMath math={String.raw`dS_t = r\,S_t\,dt + \sigma\,S_t\,dW_t \quad (\text{GBM under } \mathbb{Q})`} />
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Parameters */}
            <div className="space-y-3">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">参数设置</p>
              <PresetButtons presets={[
                { name: "欧式标准", description: "Hull教材: S=K=100, σ=20%", apply: () => { setOptionType("european"); setPutCall("call"); setS0(100); setK(100); setR(5); setSigma(20); setT(1); setNPaths(10000); } },
                { name: "亚式均价", description: "S=100, K=100, σ=25%", apply: () => { setOptionType("asian"); setPutCall("call"); setS0(100); setK(100); setR(5); setSigma(25); setT(1); setNPaths(10000); } },
                { name: "上敲出障碍", description: "S=100, K=100, H=120", apply: () => { setOptionType("barrier"); setPutCall("call"); setS0(100); setK(100); setR(5); setSigma(20); setT(1); setBarrierType("up-out"); setBarrierLevel(120); setNPaths(10000); } },
                { name: "下敲入看跌", description: "S=100, K=100, H=85", apply: () => { setOptionType("barrier"); setPutCall("put"); setS0(100); setK(100); setR(5); setSigma(20); setT(1); setBarrierType("down-in"); setBarrierLevel(85); setNPaths(10000); } },
              ]} />

              {/* Put/Call */}
              <div className="flex gap-2 mb-2">
                {([{ v: "call" as PutCall, l: "看涨 Call" }, { v: "put" as PutCall, l: "看跌 Put" }]).map((o) => (
                  <button key={o.v} onClick={() => setPutCall(o.v)}
                    className={`px-4 py-1.5 text-xs font-mono rounded-lg transition-all ${putCall === o.v ? "bg-gold/20 text-gold border border-gold/30" : "bg-secondary text-muted-foreground"}`}
                  >{o.l}</button>
                ))}
              </div>

              {renderSlider("标的价格 S₀", s0, 50, 200, 1, setS0)}
              {renderSlider("行权价格 K", k, 50, 200, 1, setK)}
              {renderSlider("无风险利率 r", r, 0, 15, 0.1, setR, "%")}
              {renderSlider("波动率 σ", sigma, 5, 80, 0.5, setSigma, "%")}
              {renderSlider("到期时间 T", T, 0.1, 3, 0.1, setT, " 年")}

              {/* Paths selector */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm text-secondary-foreground font-medium">模拟路径数</label>
                  <span className="text-sm font-mono text-gold">{nPaths.toLocaleString()}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[1000, 5000, 10000, 50000].map((n) => (
                    <button key={n} onClick={() => setNPaths(n)}
                      className={`px-3 py-1.5 text-[11px] font-mono rounded-lg transition-all ${nPaths === n ? "bg-gold/20 text-gold border border-gold/30" : "bg-secondary text-muted-foreground"}`}
                    >{(n / 1000).toFixed(0)}K</button>
                  ))}
                </div>
              </div>

              {/* Barrier options */}
              {optionType === "barrier" && (
                <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                  <p className="text-xs font-mono text-gold uppercase tracking-wider">障碍参数</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(["up-out", "up-in", "down-out", "down-in"] as BarrierType[]).map((bt) => (
                      <button key={bt} onClick={() => {
                        setBarrierType(bt);
                        if (bt.startsWith("up")) setBarrierLevel(Math.max(barrierLevel, s0 + 10));
                        else setBarrierLevel(Math.min(barrierLevel, s0 - 10));
                      }}
                        className={`px-3 py-1.5 text-[11px] font-mono rounded-lg transition-all ${barrierType === bt ? "bg-gold/20 text-gold border border-gold/30" : "bg-secondary text-muted-foreground"}`}
                      >{bt}</button>
                    ))}
                  </div>
                  {renderSlider("障碍水平 H", barrierLevel, 50, 200, 1, setBarrierLevel)}
                </div>
              )}

              <button onClick={() => setSeed(s => s + 1)}
                className="w-full py-2 text-xs font-mono rounded-lg border border-gold/20 text-gold hover:bg-gold/10 transition-all"
              >
                {"🎲 重新模拟 (Seed: " + seed + ")"}
              </button>
            </div>

            {/* Sample paths chart */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                {"样本路径 (" + result.samplePaths.length + " 条)"}
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={pathData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      label={{ value: "时间 (年)", position: "insideBottom", offset: -2, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={45}
                      label={{ value: "S(t)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />

                    {/* Strike line */}
                    <ReferenceLine y={k} stroke={CHART_TEXT} strokeDasharray="4 6" strokeOpacity={0.4}
                      label={{ value: "K", position: "right", style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />

                    {/* Barrier line */}
                    {optionType === "barrier" && (
                      <ReferenceLine y={barrierLevel} stroke={CHART_RED} strokeDasharray="6 3" strokeWidth={2}
                        label={{ value: "H", position: "right", style: { fontSize: 10, fill: CHART_RED, fontFamily: "var(--font-mono)", fontWeight: 600 } }}
                      />
                    )}

                    {result.samplePaths.map((_, i) => (
                      <Line key={`path-${i}`} type="monotone" dataKey={`p${i}`}
                        stroke={PATH_COLORS[i % PATH_COLORS.length]}
                        strokeWidth={1.2} strokeOpacity={0.7} dot={false} activeDot={false}
                        name={`路径 ${i + 1}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                {optionType === "barrier"
                  ? "灰色虚线 = K · 红色虚线 = 障碍水平 H"
                  : "灰色虚线 = 行权价 K · 彩色线 = GBM 样本路径"}
              </p>
            </div>
          </div>

          {/* Results cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="rounded-xl border border-gold/20 bg-gold/[0.03] p-4 text-center">
              <p className="text-[10px] font-mono text-gold mb-1 uppercase tracking-wider">MC 价格</p>
              <p className="text-2xl font-mono font-bold text-foreground">{result.price.toFixed(4)}</p>
            </div>
            <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.03] p-4 text-center">
              <p className="text-[10px] font-mono text-teal-400 mb-1 uppercase tracking-wider">标准误差</p>
              <p className="text-lg font-mono font-bold text-foreground">{result.stdErr.toFixed(4)}</p>
              <p className="text-[10px] font-mono text-muted-foreground">
                {"95% CI: [" + result.ci95[0].toFixed(3) + ", " + result.ci95[1].toFixed(3) + "]"}
              </p>
            </div>
            {result.bsAnalytical !== null ? (
              <div className="rounded-xl border border-blue-400/20 bg-blue-400/[0.03] p-4 text-center">
                <p className="text-[10px] font-mono text-blue-400 mb-1 uppercase tracking-wider">BS 解析解</p>
                <p className="text-lg font-mono font-bold text-foreground">{result.bsAnalytical.toFixed(4)}</p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {"误差: " + ((result.price - result.bsAnalytical) / result.bsAnalytical * 100).toFixed(3) + "%"}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-purple-400/20 bg-purple-400/[0.03] p-4 text-center">
                <p className="text-[10px] font-mono text-purple-400 mb-1 uppercase tracking-wider">
                  {optionType === "asian" ? "路径依赖" : "障碍条件"}
                </p>
                <p className="text-sm font-mono text-foreground">
                  {optionType === "asian" ? "无解析解" : barrierType}
                </p>
                {optionType === "barrier" && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {"触碰率: " + ((result.barrierHits! / nPaths) * 100).toFixed(1) + "%"}
                  </p>
                )}
              </div>
            )}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
              <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">模拟配置</p>
              <p className="text-sm font-mono text-foreground">{(nPaths / 1000).toFixed(0)}K 路径</p>
              <p className="text-[10px] font-mono text-muted-foreground">{nSteps} 步/路径</p>
            </div>
          </div>

          {/* Bottom row: Payoff distribution + Convergence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payoff distribution */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                折现收益分布
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={result.payoffDist} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="bin" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      label={{ value: "折现收益", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                    <ReferenceLine x={parseFloat(result.price.toFixed(3))} stroke={CHART_GOLD} strokeDasharray="4 4"
                      label={{ value: "E[V]", position: "top", style: { fontSize: 9, fill: CHART_GOLD, fontFamily: "var(--font-mono)" } }}
                    />
                    <Bar dataKey="count" name="频次">
                      {result.payoffDist.map((entry, i) => (
                        <Cell key={i} fill={entry.bin > 0 ? CHART_TEAL : CHART_RED} fillOpacity={entry.bin > 0 ? 0.6 : 0.4} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                青色 = 正收益 · 金线 = MC 期望值 · 零处尖峰 = OTM 到期无价值
              </p>
            </div>

            {/* Convergence */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                价格收敛 · 95% 置信区间
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={result.convergence} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="n" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      label={{ value: "路径数", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={50} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                    {result.bsAnalytical !== null && (
                      <ReferenceLine y={result.bsAnalytical} stroke={CHART_BLUE} strokeDasharray="4 4" strokeOpacity={0.6}
                        label={{ value: "BS", position: "right", style: { fontSize: 9, fill: CHART_BLUE, fontFamily: "var(--font-mono)" } }}
                      />
                    )}
                    <Line type="monotone" dataKey="upper" name="+1.96σ" stroke={CHART_GOLD} strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="lower" name="-1.96σ" stroke={CHART_GOLD} strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="price" name="MC价格" stroke="white" strokeWidth={2} dot={{ r: 3, fill: "white" }} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                {"白色 = MC 估计 · 金色虚线 = 95% CI · " + (result.bsAnalytical !== null ? "蓝色 = BS 解析解" : "收敛速度 ∝ 1/√N")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MCOptionPricer;
