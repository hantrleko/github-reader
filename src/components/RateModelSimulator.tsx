import { useState, useMemo } from "react";
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

type ModelId = "vasicek" | "cir";

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
  const [model, setModel] = useState<ModelId>("vasicek");
  const [r0, setR0] = useState(3);       // %
  const [kappa, setKappa] = useState(0.5);
  const [theta, setTheta] = useState(4);  // %
  const [sigma, setSigma] = useState(1.5);// %
  const [T, setT] = useState(10);
  const [nPaths, setNPaths] = useState(10);
  const [seed, setSeed] = useState(42);

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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold"
        >
          {/* Formula */}
          <div className="text-center mb-8 py-4 px-6 rounded-xl bg-secondary/50 border border-border">
            <p className="text-xl md:text-2xl font-mono text-gold tracking-wide">
              {model === "vasicek" ? "dr = κ(θ − r)dt + σ dW" : "dr = κ(θ − r)dt + σ√r dW"}
            </p>
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
        </motion.div>
      </div>
    </section>
  );
};

export default RateModelSimulator;
