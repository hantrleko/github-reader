import { useState, useMemo, useRef, useCallback } from "react";

import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { useToolTab } from "@/lib/useToolTab";
import { useBusConsume } from "@/lib/toolBus";
import { HistoryDrawer } from "./common/HistoryDrawer";
import PresetButtons, { Preset } from "./PresetButtons";
import { FormulaCodeView } from "./common/FormulaCodeView";
import { motion } from "framer-motion";
import { useFredSeries } from "@/lib/marketData";
import { Database, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
  AreaChart,
  Area,
} from "recharts";
import { EquationBlock } from "@/components/common/EquationBlock";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const PATH_COLORS = [
  CHART_GOLD, CHART_TEAL, CHART_BLUE, CHART_RED,
  "hsl(280,60%,55%)", "hsl(150,60%,45%)", "hsl(30,80%,50%)",
  "hsl(340,60%,50%)", "hsl(60,70%,50%)", "hsl(200,60%,50%)",
];

type ModelId = "vasicek" | "cir";
const MODEL_IDS: ModelId[] = ["vasicek", "cir"];

// Seeded PRNG
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

interface SimResult {
  paths: number[][]; // [pathIdx][stepIdx]
  mean: number[];
  upper: number[];  // mean + 2*std
  lower: number[];  // mean - 2*std
  times: number[];
  terminalDist: { bin: number; count: number }[];
  terminalMean: number;
  terminalStd: number;
}

function simulate(
  model: ModelId,
  r0: number, kappa: number, theta: number, sigma: number,
  T: number, nSteps: number, nPaths: number, seed: number
): SimResult {
  const dt = T / nSteps;
  const sqrtDt = Math.sqrt(dt);
  const rand = mulberry32(seed);

  const paths: number[][] = [];
  const allR: number[][] = Array.from({ length: nSteps + 1 }, () => []);

  for (let p = 0; p < nPaths; p++) {
    const path: number[] = [r0];
    let r = r0;
    for (let i = 0; i < nSteps; i++) {
      const z = boxMuller(rand);
      if (model === "vasicek") {
        r = r + kappa * (theta - r) * dt + sigma * sqrtDt * z;
      } else {
        // CIR: Euler with reflection to keep r >= 0
        const vol = sigma * Math.sqrt(Math.max(r, 0));
        r = r + kappa * (theta - r) * dt + vol * sqrtDt * z;
        r = Math.max(r, 0);
      }
      path.push(r);
      allR[i + 1].push(r);
    }
    allR[0].push(r0);
    paths.push(path);
  }

  const times = Array.from({ length: nSteps + 1 }, (_, i) => parseFloat((i * dt).toFixed(3)));

  // Statistics
  const mean: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i <= nSteps; i++) {
    const vals = allR[i];
    const m = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length);
    mean.push(m);
    upper.push(m + 2 * std);
    lower.push(m - 2 * std);
  }

  // Terminal distribution histogram
  const terminalRates = paths.map(p => p[p.length - 1]);
  const terminalMean = terminalRates.reduce((s, v) => s + v, 0) / terminalRates.length;
  const terminalStd = Math.sqrt(terminalRates.reduce((s, v) => s + (v - terminalMean) ** 2, 0) / terminalRates.length);

  const nBins = 40;
  const minR = Math.min(...terminalRates);
  const maxR = Math.max(...terminalRates);
  const binWidth = (maxR - minR) / nBins || 0.001;
  const terminalDist: { bin: number; count: number }[] = [];
  for (let i = 0; i < nBins; i++) {
    const lo = minR + i * binWidth;
    const hi = lo + binWidth;
    const mid = (lo + hi) / 2;
    const count = terminalRates.filter(r => r >= lo && r < hi).length;
    terminalDist.push({ bin: parseFloat((mid * 100).toFixed(2)), count });
  }

  return { paths, mean, upper, lower, times, terminalDist, terminalMean, terminalStd };
}

// Vasicek analytical bond price
function vasicekBondPrice(r: number, kappa: number, theta: number, sigma: number, T: number) {
  if (T <= 0) return 1;
  const B = (1 - Math.exp(-kappa * T)) / kappa;
  const A = Math.exp(
    (theta - sigma * sigma / (2 * kappa * kappa)) * (B - T) -
    (sigma * sigma * B * B) / (4 * kappa)
  );
  return A * Math.exp(-B * r);
}

const RateModelSimulator = () => {
  const [model, setModel] = useToolTab<ModelId>(MODEL_IDS, "vasicek");
  const [r0, setR0] = useState(3);       // %
  const [kappa, setKappa] = useState(0.5);
  const [theta, setTheta] = useState(4);  // %
  const [sigma, setSigma] = useState(1.5);// %
  const [T, setT] = useState(10);
  const [nPaths, setNPaths] = useState(10);
  const [seed, setSeed] = useState(42);
  const [fredSeries, setFredSeries] = useState<"DGS10" | "DGS2" | "DGS5" | "DGS30" | "FEDFUNDS">("DGS10");
  const [fredActive, setFredActive] = useState(false);
  const fredQuery = useFredSeries(fredSeries, "2015-01-01", fredActive);

  const loadFredCalibration = async () => {
    setFredActive(true);
    try {
      const res = await fredQuery.refetch();
      if (res.error || !res.data) throw res.error || new Error("no data");
      const d = res.data;
      const vals = d.values.filter((v) => Number.isFinite(v));
      if (!vals.length || d.latest == null) throw new Error("empty series");
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      // monthly std → annualised vol of changes (rough), in % units
      const diffs = vals.slice(1).map((v, i) => v - vals[i]);
      const dMean = diffs.reduce((s, v) => s + v, 0) / Math.max(diffs.length, 1);
      const dVar = diffs.reduce((s, v) => s + (v - dMean) ** 2, 0) / Math.max(diffs.length - 1, 1);
      const sd = Math.sqrt(dVar) * Math.sqrt(252);
      setR0(parseFloat(d.latest.toFixed(2)));
      setTheta(parseFloat(mean.toFixed(2)));
      setSigma(Math.min(5, Math.max(0.1, parseFloat(sd.toFixed(2)))));
      toast({
        title: "FRED 校准",
        description: `${fredSeries} · 当前 ${d.latest.toFixed(2)}% · 长期均值 ${mean.toFixed(2)}%`,
      });
    } catch {
      toast({ title: "拉取失败", description: "回退到合成参数", variant: "destructive" });
    }
  };

  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: any) => {
    if (s.model) setModel(s.model);
    if (s.r0 != null) setR0(s.r0);
    if (s.kappa != null) setKappa(s.kappa);
    if (s.theta != null) setTheta(s.theta);
    if (s.sigma != null) setSigma(s.sigma);
    if (s.T != null) setT(s.T);
    if (s.nPaths != null) setNPaths(s.nPaths);
    if (s.seed != null) setSeed(s.seed);
  }, []);
  useSharedState("rate", apply);

  // Consume a short rate handed over the Tool Bus (e.g. from the curve fitter).
  useBusConsume(["r"], (vals, source) => {
    if (vals.r != null) {
      setR0(+(vals.r * 100).toFixed(3));
      toast({ title: "已接收短端利率", description: `r₀ = ${(vals.r * 100).toFixed(2)}% · 来自 ${source}` });
    }
  });

  const nSteps = 200;
  const displayPaths = Math.min(nPaths, 10); // show max 10 on chart

  const simResult = useMemo(() => {
    return simulate(
      model,
      r0 / 100, kappa, theta / 100, sigma / 100,
      T, nSteps, Math.max(nPaths, 100), // always simulate 100+ for stats
      seed
    );
  }, [model, r0, kappa, theta, sigma, T, nPaths, seed]);

  // Build chart data: time series with paths + confidence band
  const chartData = useMemo(() => {
    const skip = Math.max(1, Math.floor(nSteps / 100)); // downsample for performance
    const data: Record<string, number>[] = [];
    for (let i = 0; i <= nSteps; i += skip) {
      const point: Record<string, number> = {
        t: simResult.times[i],
        mean: parseFloat((simResult.mean[i] * 100).toFixed(3)),
        upper: parseFloat((simResult.upper[i] * 100).toFixed(3)),
        lower: parseFloat((simResult.lower[i] * 100).toFixed(3)),
        theta: theta,
      };
      for (let p = 0; p < displayPaths; p++) {
        point[`p${p}`] = parseFloat((simResult.paths[p][i] * 100).toFixed(3));
      }
      data.push(point);
    }
    return data;
  }, [simResult, displayPaths, theta]);

  // Analytical term structure (Vasicek only)
  const termStructure = useMemo(() => {
    if (model !== "vasicek") return null;
    const data: { tau: number; yield_analytical: number; yield_mc: number }[] = [];
    const r = r0 / 100;
    for (let i = 1; i <= 60; i++) {
      const tau = i * 0.5;
      const P = vasicekBondPrice(r, kappa, theta / 100, sigma / 100, tau);
      const y_a = -Math.log(P) / tau * 100;
      // MC estimate: average exp(-integral r dt) ... use mean path as approximation
      data.push({
        tau,
        yield_analytical: parseFloat(y_a.toFixed(3)),
        yield_mc: parseFloat(y_a.toFixed(3)), // simplified
      });
    }
    return data;
  }, [model, r0, kappa, theta, sigma]);

  const fellerCondition = model === "cir" ? 2 * kappa * (theta / 100) >= (sigma / 100) ** 2 : true;

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
            Interest Rate Models
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            利率模型模拟器
          </h2>
        </motion.div>

        {/* Model selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {([
            { id: "vasicek" as ModelId, name: "Vasicek", formula: "dr = κ(θ−r)dt + σdW" },
            { id: "cir" as ModelId, name: "CIR", formula: "dr = κ(θ−r)dt + σ√r dW" },
          ]).map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 ${
                model === m.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <motion.div
          key={model}
          ref={captureRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold"
        >
          <div className="flex justify-end mb-4">
            <div className="flex flex-wrap gap-2">
              <HistoryDrawer
                storageKey="rate"
                currentState={{ model, r0, kappa, theta, sigma, T, nPaths, seed }}
                onApply={(s: any) => {
                  if (s.model) setModel(s.model);
                  if (s.r0 !== undefined) setR0(s.r0);
                  if (s.kappa !== undefined) setKappa(s.kappa);
                  if (s.theta !== undefined) setTheta(s.theta);
                  if (s.sigma !== undefined) setSigma(s.sigma);
                  if (s.T !== undefined) setT(s.T);
                  if (s.nPaths !== undefined) setNPaths(s.nPaths);
                  if (s.seed !== undefined) setSeed(s.seed);
                }}
                summarize={(s: any) => `${s.model} r₀=${s.r0}% κ=${s.kappa} θ=${s.theta}%`}
              />
              <ShareExportToolbar
                storageKey="rate"
                anchorId="rate-model"
                state={{ model, r0, kappa, theta, sigma, T, nPaths, seed }}
                captureRef={captureRef}
                filename={`rate-model-${model}`}
              />
            </div>
          </div>
          {/* Formula */}
          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">
              {model === "vasicek"
                ? "Vasicek (1977) — Mean-Reverting Gaussian Short Rate"
                : "Cox-Ingersoll-Ross (1985) — Square-Root Diffusion"}
            </p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock
                math={
                  model === "vasicek"
                    ? String.raw`dr_t = \kappa\,(\theta - r_t)\,dt + \sigma\, dW_t`
                    : String.raw`dr_t = \kappa\,(\theta - r_t)\,dt + \sigma\,\sqrt{r_t}\, dW_t`
                }
              />
            </div>
            {model === "cir" && !fellerCondition && (
              <p className="text-xs font-mono text-red-400 mt-2">
                {"⚠ Feller 条件不满足 (2κθ < σ²)，利率可能触及零"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Parameters */}
            <div className="space-y-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">模型参数</p>
              {/* FRED real-data calibration */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-md border border-border/60 bg-muted/30 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-gold">
                  <Database className="w-3.5 h-3.5" />
                  FRED 实测利率校准
                </span>
                <select
                  value={fredSeries}
                  onChange={(e) => setFredSeries(e.target.value as any)}
                  className="px-2 py-1 rounded bg-background border border-border focus:border-gold/60 outline-none"
                >
                  <option value="DGS10">10Y 国债 (DGS10)</option>
                  <option value="DGS2">2Y 国债 (DGS2)</option>
                  <option value="DGS5">5Y 国债 (DGS5)</option>
                  <option value="DGS30">30Y 国债 (DGS30)</option>
                  <option value="FEDFUNDS">联邦基金利率</option>
                </select>
                <button
                  onClick={loadFredCalibration}
                  disabled={fredQuery.isFetching}
                  className="px-2.5 py-1 rounded bg-primary/90 text-primary-foreground hover:bg-primary disabled:opacity-50 flex items-center gap-1"
                >
                  {fredQuery.isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {fredQuery.isFetching ? "拉取中…" : "校准"}
                </button>
                {fredActive && fredQuery.data && !fredQuery.error && (
                  <span className="flex items-center gap-1 text-gold">
                    <CheckCircle2 className="w-3 h-3" />
                    {fredSeries} {fredQuery.data.latest?.toFixed(2)}%
                  </span>
                )}
              </div>
              <PresetButtons presets={[
                { name: "Vasicek经典", description: "r₀=5%, κ=0.3, θ=5%, σ=1%", apply: () => { setModel("vasicek"); setR0(5); setKappa(0.3); setTheta(5); setSigma(1); setT(10); } },
                { name: "CIR低利率", description: "r₀=1%, κ=0.5, θ=3%, σ=0.8%", apply: () => { setModel("cir"); setR0(1); setKappa(0.5); setTheta(3); setSigma(0.8); setT(10); } },
                { name: "高波动环境", description: "r₀=8%, κ=0.2, θ=6%, σ=3%", apply: () => { setModel("vasicek"); setR0(8); setKappa(0.2); setTheta(6); setSigma(3); setT(15); } },
              ]} />
              {renderSlider("初始利率 r₀", r0, 0.1, 15, 0.1, setR0, "%")}
              {renderSlider("均值回复速度 κ", kappa, 0.05, 3, 0.05, setKappa)}
              {renderSlider("长期均值 θ", theta, 0.5, 15, 0.1, setTheta, "%")}
              {renderSlider("波动率 σ", sigma, 0.1, 5, 0.1, setSigma, "%")}
              {renderSlider("模拟期限 T", T, 1, 30, 1, setT, " 年")}
              {renderSlider("展示路径数", nPaths, 1, 10, 1, setNPaths)}
              <button
                onClick={() => setSeed(s => s + 1)}
                className="w-full py-2 text-xs font-mono rounded-lg border border-gold/20 text-gold hover:bg-gold/10 transition-all"
              >
                🎲 重新模拟（Seed: {seed}）
              </button>
            </div>

            {/* Paths chart */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                利率路径 · Monte Carlo
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      label={{ value: "时间 (年)", position: "insideBottom", offset: -2, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={40}
                      label={{ value: "r (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                    
                    {/* Confidence band */}
                    <Area type="monotone" dataKey="upper" stroke="none" fill={CHART_GOLD} fillOpacity={0.05} />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" />

                    {/* θ reference */}
                    <ReferenceLine y={theta} stroke={CHART_TEXT} strokeDasharray="4 6" strokeOpacity={0.4}
                      label={{ value: "θ", position: "right", style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />

                    {/* Individual paths */}
                    {Array.from({ length: displayPaths }, (_, i) => (
                      <Line
                        key={`path-${i}`}
                        type="monotone"
                        dataKey={`p${i}`}
                        name={`路径 ${i + 1}`}
                        stroke={PATH_COLORS[i % PATH_COLORS.length]}
                        strokeWidth={1.2}
                        strokeOpacity={0.7}
                        dot={false}
                        activeDot={false}
                      />
                    ))}

                    {/* Mean path */}
                    <Line type="monotone" dataKey="mean" name="均值路径" stroke="white" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="upper" name="+2σ" stroke={CHART_GOLD} strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="lower" name="−2σ" stroke={CHART_GOLD} strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                白色 = 均值路径 · 金色虚线 = ±2σ 置信带 · 灰色虚线 = 长期均值 θ
              </p>
            </div>
          </div>

          {/* Stats + Terminal Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "终值均值 E[r(T)]", value: `${(simResult.terminalMean * 100).toFixed(2)}%`, color: "text-gold", border: "border-gold/20", bg: "bg-gold/[0.03]" },
                { label: "终值标准差", value: `${(simResult.terminalStd * 100).toFixed(2)}%`, color: "text-teal-400", border: "border-teal-400/20", bg: "bg-teal-400/[0.03]" },
                { label: "理论均值", value: `${(theta + (r0 - theta) * Math.exp(-kappa * T)).toFixed(2)}%`, color: "text-blue-400", border: "border-blue-400/20", bg: "bg-blue-400/[0.03]" },
                { label: model === "vasicek" ? "理论方差 σ²∞" : "Feller 条件", 
                  value: model === "vasicek" 
                    ? `${((sigma / 100) ** 2 / (2 * kappa) * 10000).toFixed(2)} bp²` 
                    : fellerCondition ? "✓ 满足" : "✗ 不满足",
                  color: model === "cir" ? (fellerCondition ? "text-emerald-400" : "text-red-400") : "text-purple-400",
                  border: model === "cir" ? (fellerCondition ? "border-emerald-400/20" : "border-red-400/20") : "border-purple-400/20",
                  bg: model === "cir" ? (fellerCondition ? "bg-emerald-400/[0.03]" : "bg-red-400/[0.03]") : "bg-purple-400/[0.03]",
                },
              ].map((m) => (
                <div key={m.label} className={`rounded-xl border ${m.border} ${m.bg} p-4 text-center`}>
                  <p className={`text-[10px] font-mono ${m.color} mb-1 uppercase tracking-wider`}>{m.label}</p>
                  <p className="text-base font-mono font-bold text-foreground">{m.value}</p>
                </div>
              ))}

              {/* Half-life */}
              <div className="col-span-2 rounded-xl border border-border bg-secondary/30 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground">半衰期</p>
                    <p className="text-sm font-mono font-bold text-foreground">{(Math.log(2) / kappa).toFixed(2)} 年</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground">稳态方差</p>
                    <p className="text-sm font-mono font-bold text-foreground">
                      {model === "vasicek"
                        ? `${((sigma / 100) ** 2 / (2 * kappa) * 10000).toFixed(1)} bp²`
                        : `${((sigma / 100) ** 2 * (theta / 100) / (2 * kappa) * 10000).toFixed(1)} bp²`
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground">模拟路径</p>
                    <p className="text-sm font-mono font-bold text-foreground">{Math.max(nPaths, 100)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal distribution */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                终端利率分布 r(T={T})
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={simResult.terminalDist} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="bin" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      label={{ value: "r(T) %", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                    <ReferenceLine x={parseFloat((simResult.terminalMean * 100).toFixed(2))} stroke={CHART_GOLD} strokeDasharray="4 4"
                      label={{ value: "E[r]", position: "top", style: { fontSize: 9, fill: CHART_GOLD, fontFamily: "var(--font-mono)" } }}
                    />
                    <Area type="monotone" dataKey="count" name="频次" stroke={CHART_TEAL} fill={CHART_TEAL} fillOpacity={0.3} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Vasicek term structure */}
          {model === "vasicek" && termStructure && (
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                Vasicek 解析收益率曲线
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={termStructure} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="tau" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      label={{ value: "期限 τ (年)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={40}
                      label={{ value: "y (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                    <ReferenceLine y={theta} stroke={CHART_TEXT} strokeDasharray="3 6" strokeOpacity={0.3} />
                    <Line type="monotone" dataKey="yield_analytical" name="解析收益率" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                {"P(0,T) = A(T)e^{-B(T)r₀} → y(T) = -ln P/T · 长端收趋于 θ − σ²/(2κ²)"}
              </p>
            </div>
          )}

          {/* 公式 / Python / 结果 三联视图 */}
          <div className="mt-8">
            <FormulaCodeView
              title={`${model.toUpperCase()} · Euler Discretization`}
              formula={
                model === "vasicek"
                  ? String.raw`dr_t = \kappa(\theta - r_t)\,dt + \sigma\, dW_t,\quad r_{t+\Delta t} \approx r_t + \kappa(\theta - r_t)\Delta t + \sigma\sqrt{\Delta t}\,Z`
                  : model === "cir"
                  ? String.raw`dr_t = \kappa(\theta - r_t)\,dt + \sigma\sqrt{r_t}\, dW_t,\quad r_{t+\Delta t} \approx r_t + \kappa(\theta - r_t)\Delta t + \sigma\sqrt{r_t\,\Delta t}\,Z`
                  : String.raw`dr_t = \mu\, dt + \sigma\, dW_t,\quad r_{t+\Delta t} = r_t + \mu\,\Delta t + \sigma\sqrt{\Delta t}\,Z`
              }
              python={`import numpy as np

def simulate_${model}(r0=${r0 / 100}, kappa=${kappa}, theta=${theta / 100},
                      sigma=${sigma / 100}, T=${T}, n_steps=${(T * 50) | 0},
                      n_paths=${nPaths}, seed=${seed}):
    rng = np.random.default_rng(seed)
    dt  = T / n_steps
    paths = np.zeros((n_paths, n_steps + 1))
    paths[:, 0] = r0
    for t in range(n_steps):
        Z = rng.standard_normal(n_paths)
        r = paths[:, t]
        ${
          model === "vasicek"
            ? "drift = kappa * (theta - r) * dt\n        diff  = sigma * np.sqrt(dt) * Z"
            : model === "cir"
            ? "drift = kappa * (theta - r) * dt\n        diff  = sigma * np.sqrt(np.maximum(r, 0) * dt) * Z"
            : "drift = kappa * dt  # interpret kappa as drift μ\n        diff  = sigma * np.sqrt(dt) * Z"
        }
        paths[:, t+1] = r + drift + diff
    return paths

# Terminal: E[r_T] ≈ ${(simResult.terminalMean * 100).toFixed(3)}%
#           σ[r_T] ≈ ${(simResult.terminalStd * 100).toFixed(3)}%`}
              result={
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-md border border-gold/20 bg-gold/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gold/80">E[r(T)]</div>
                    <div className="text-base text-gold font-bold">{(simResult.terminalMean * 100).toFixed(3)}%</div>
                  </div>
                  <div className="rounded-md border border-teal-400/30 bg-teal-400/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-teal-400">σ[r(T)]</div>
                    <div className="text-base text-foreground font-bold">{(simResult.terminalStd * 100).toFixed(3)}%</div>
                  </div>
                  <div className="rounded-md border border-border bg-card/50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">路径数 / 步数</div>
                    <div className="text-base text-foreground font-bold">{nPaths} × {(T * 50) | 0}</div>
                  </div>
                </div>
              }
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RateModelSimulator;
