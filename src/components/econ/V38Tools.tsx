import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, ComposedChart, BarChart, Bar, ScatterChart, Scatter, ReferenceLine,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";
import {
  olsDetail, breuschPagan, whiteTest, durbinWatson, breuschGodfrey,
  vif, conditionNumber, ramseyReset, robustSE, neweyWestSE, tTwoTail,
  fitDynamicPanel, dieboldMariano,
  kernelRegression, optimalBandwidth, silvermanBandwidth, loocvScore,
  type KernelName,
} from "@/lib/quant/econometrics";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ───────── PRNG ───────── */
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

/* ───────── shared UI ───────── */
const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md";

const Slider = ({ label, sub, value, min, max, step, onChange, fmt }: {
  label: string; sub?: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">{fmt ? fmt(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = CHART_GOLD, sub }: {
  label: string; value: string; color?: string; sub?: string;
}) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-base font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const TestBadge = ({ reject }: { reject: boolean }) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${reject ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"}`}>
    {reject ? "拒绝 H₀" : "不拒绝 H₀"}
  </span>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">{children}</div>
);

const axis = { stroke: CHART_TEXT, fontSize: 11 };
const grid = { stroke: CHART_GRID, strokeDasharray: "3 3" };
const tip = {
  contentStyle: { background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, borderRadius: 8, fontSize: 12 },
  labelStyle: { color: CHART_TEXT },
};

/* ═══════════════════ 1 · Regression Diagnostics ═══════════════════ */
type Scenario = "clean" | "hetero" | "autocorr" | "collinear" | "nonlinear";

export const RegressionDiagnosticsTool = () => {
  const [scenario, setScenario] = useState<Scenario>("hetero");
  const [n, setN] = useState(200);
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x1 = (i / n) * 4 - 2 + 0.05 * randn(rng);
      let x2 = randn(rng);
      if (scenario === "collinear") x2 = x1 + 0.05 * randn(rng); // near-collinear
      X.push([x1, x2]);
    }
    let eLag = 0;
    for (let i = 0; i < n; i++) {
      const [x1, x2] = X[i];
      let e = randn(rng);
      if (scenario === "hetero") e = (0.2 + 1.2 * Math.abs(x1)) * randn(rng);
      if (scenario === "autocorr") { eLag = 0.8 * eLag + 0.5 * randn(rng); e = eLag; }
      let mu = 1 + 1.5 * x1 - 0.8 * x2;
      if (scenario === "nonlinear") mu += 0.9 * x1 * x1; // omitted quadratic
      y.push(mu + 0.5 * e);
    }
    const fit = olsDetail(X, y);
    const bp = breuschPagan(fit);
    const white = whiteTest(fit);
    const dw = durbinWatson(fit.resid);
    const bg = breuschGodfrey(fit, 2);
    const vifs = vif(X);
    const cond = conditionNumber(fit.Xd);
    const reset = ramseyReset(X, y, 3);
    const hc3 = robustSE(fit, "HC3");
    const nw = neweyWestSE(fit, 5);
    const names = ["截距", "x₁", "x₂"];
    const seTable = fit.beta.map((b, i) => ({
      name: names[i], beta: b,
      ols: fit.se[i], hc3: hc3[i], nw: nw[i],
      tOls: b / (fit.se[i] || 1e-9), tHc3: b / (hc3[i] || 1e-9),
      pOls: tTwoTail(b / (fit.se[i] || 1e-9), fit.n - fit.k),
      pHc3: tTwoTail(b / (hc3[i] || 1e-9), fit.n - fit.k),
    }));
    const scatter = fit.fitted.map((f, i) => ({ fitted: f, resid: fit.resid[i] }));
    // residual ACF
    const rMean = fit.resid.reduce((s, v) => s + v, 0) / fit.resid.length;
    let c0 = 0;
    for (const r of fit.resid) c0 += (r - rMean) ** 2;
    const acf = Array.from({ length: 12 }, (_, k) => {
      const lag = k + 1;
      let ck = 0;
      for (let t = lag; t < fit.resid.length; t++) ck += (fit.resid[t] - rMean) * (fit.resid[t - lag] - rMean);
      return { lag, acf: c0 > 0 ? ck / c0 : 0 };
    });
    const acfBound = 1.96 / Math.sqrt(fit.n);
    return { fit, bp, white, dw, bg, vifs, cond, reset, seTable, scatter, acf, acfBound };
  }, [scenario, n, seed]);

  const presets = [
    { name: "同方差干净", apply: () => setScenario("clean") },
    { name: "异方差", apply: () => setScenario("hetero") },
    { name: "自相关", apply: () => setScenario("autocorr") },
    { name: "多重共线", apply: () => setScenario("collinear") },
    { name: "遗漏非线性", apply: () => setScenario("nonlinear") },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />
      <div className="grid md:grid-cols-3 gap-4">
        <Slider label="样本量 n" value={n} min={60} max={500} step={20} onChange={setN} />
        <Slider label="随机种子" value={seed} min={1} max={200} step={1} onChange={setSeed} />
        <div className="flex items-end text-xs font-mono text-muted-foreground">
          <span>场景：<span className="text-gold">{scenario}</span></span>
        </div>
      </div>

      {/* Test summary */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">异方差检验</h4>
          <div className="flex justify-between text-xs font-mono"><span>Breusch-Pagan (χ²={data.bp.stat.toFixed(2)}, p={data.bp.pValue.toFixed(3)})</span><TestBadge reject={data.bp.reject} /></div>
          <div className="flex justify-between text-xs font-mono"><span>White (χ²={data.white.stat.toFixed(2)}, p={data.white.pValue.toFixed(3)})</span><TestBadge reject={data.white.reject} /></div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">自相关检验</h4>
          <div className="flex justify-between text-xs font-mono"><span>Durbin-Watson = {data.dw.toFixed(3)}</span><span className="text-muted-foreground">{data.dw < 1.5 ? "正自相关" : data.dw > 2.5 ? "负自相关" : "≈2 无"}</span></div>
          <div className="flex justify-between text-xs font-mono"><span>Breusch-Godfrey(2) (χ²={data.bg.stat.toFixed(2)}, p={data.bg.pValue.toFixed(3)})</span><TestBadge reject={data.bg.reject} /></div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">多重共线性</h4>
          <div className="flex justify-between text-xs font-mono"><span>VIF(x₁) = {data.vifs[0].toFixed(2)}</span><span className={data.vifs[0] > 10 ? "text-red-500" : "text-emerald-500"}>{data.vifs[0] > 10 ? "严重" : "可接受"}</span></div>
          <div className="flex justify-between text-xs font-mono"><span>VIF(x₂) = {data.vifs[1].toFixed(2)}</span><span className={data.vifs[1] > 10 ? "text-red-500" : "text-emerald-500"}>{data.vifs[1] > 10 ? "严重" : "可接受"}</span></div>
          <div className="flex justify-between text-xs font-mono"><span>条件数 κ = {data.cond.toFixed(1)}</span><span className="text-muted-foreground">{data.cond > 30 ? ">30 警示" : "健康"}</span></div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">设定检验 (Ramsey RESET)</h4>
          <div className="flex justify-between text-xs font-mono"><span>F={data.reset.stat.toFixed(2)}, p={data.reset.pValue.toFixed(3)}</span><TestBadge reject={data.reset.reject} /></div>
          <p className="text-[10px] text-muted-foreground">拒绝 → 存在遗漏的非线性/函数形式误设。</p>
        </div>
      </div>

      {/* Robust SE table */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4 overflow-x-auto">
        <h4 className="text-sm font-semibold text-foreground mb-3">标准误对比：OLS vs 稳健 HC3 vs Newey-West(HAC)</h4>
        <table className="w-full text-xs font-mono">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left py-1.5">参数</th><th className="text-right">β̂</th>
              <th className="text-right">SE(OLS)</th><th className="text-right">SE(HC3)</th><th className="text-right">SE(NW)</th>
              <th className="text-right">p(OLS)</th><th className="text-right">p(HC3)</th>
            </tr>
          </thead>
          <tbody>
            {data.seTable.map((r) => (
              <tr key={r.name} className="border-b border-border/40">
                <td className="py-1.5 text-foreground">{r.name}</td>
                <td className="text-right text-gold">{r.beta.toFixed(4)}</td>
                <td className="text-right">{r.ols.toFixed(4)}</td>
                <td className="text-right text-teal-400" style={{ color: CHART_TEAL }}>{r.hc3.toFixed(4)}</td>
                <td className="text-right" style={{ color: CHART_BLUE }}>{r.nw.toFixed(4)}</td>
                <td className="text-right">{r.pOls.toFixed(3)}</td>
                <td className="text-right">{r.pHc3.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-muted-foreground mt-2">当误差异方差/自相关时，OLS 标准误低估不确定性；稳健 SE 给出可靠推断。</p>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">残差 vs 拟合值</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid {...grid} />
                <XAxis type="number" dataKey="fitted" name="拟合" {...axis} />
                <YAxis type="number" dataKey="resid" name="残差" {...axis} />
                <ReferenceLine y={0} stroke={CHART_RED} />
                <Tooltip {...tip} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={data.scatter} fill={CHART_GOLD} fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">扇形展开 → 异方差；曲线弯曲 → 函数形式误设。</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">残差自相关 ACF</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.acf}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="lag" {...axis} />
                <YAxis {...axis} domain={[-1, 1]} />
                <ReferenceLine y={data.acfBound} stroke={CHART_RED} strokeDasharray="4 4" />
                <ReferenceLine y={-data.acfBound} stroke={CHART_RED} strokeDasharray="4 4" />
                <Tooltip {...tip} />
                <Bar dataKey="acf" fill={CHART_BLUE} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">条超出红色 ±1.96/√n 边界 → 残差自相关显著。</p>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════ 2 · Dynamic Panel GMM ═══════════════════ */
export const DynamicPanelTool = () => {
  const [rho, setRho] = useState(0.6);
  const [N, setN] = useState(100);
  const [T, setT] = useState(8);
  const [sigmaMu, setSigmaMu] = useState(0.8);
  const [seed, setSeed] = useState(123);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const y: number[][] = [];
    for (let i = 0; i < N; i++) {
      const mu = randn(rng) * sigmaMu;
      const row = [mu / (1 - rho) + randn(rng)];
      for (let t = 1; t < T; t++) row.push(rho * row[t - 1] + mu + 0.6 * randn(rng));
      y.push(row);
    }
    const fit = fitDynamicPanel({ y });
    const bars = [
      { name: "Pooled OLS", value: fit.pooledOLS, fill: CHART_RED },
      { name: "Within FE", value: fit.withinFE, fill: CHART_BLUE },
      { name: "Diff-GMM", value: fit.diffGMM, fill: CHART_GOLD },
      { name: "真值 ρ", value: rho, fill: CHART_TEAL },
    ];
    return { fit, bars };
  }, [rho, N, T, sigmaMu, seed]);

  const presets = [
    { name: "低持续性 ρ=0.3", apply: () => setRho(0.3) },
    { name: "高持续性 ρ=0.8", apply: () => setRho(0.8) },
    { name: "短面板 T=5", apply: () => setT(5) },
    { name: "长面板 T=15", apply: () => setT(15) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />
      <div className="grid md:grid-cols-3 gap-4">
        <Slider label="真值 ρ" value={rho} min={0.1} max={0.95} step={0.05} onChange={setRho} fmt={(v) => v.toFixed(2)} />
        <Slider label="个体数 N" value={N} min={30} max={300} step={10} onChange={setN} />
        <Slider label="期数 T" value={T} min={4} max={20} step={1} onChange={setT} />
        <Slider label="个体效应 σ_μ" value={sigmaMu} min={0} max={2} step={0.1} onChange={setSigmaMu} fmt={(v) => v.toFixed(1)} />
        <Slider label="随机种子" value={seed} min={1} max={300} step={1} onChange={setSeed} />
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Pooled OLS ρ̂" value={data.fit.pooledOLS.toFixed(3)} color={CHART_RED} sub="向上偏 (含个体效应)" />
        <Stat label="Within FE ρ̂" value={data.fit.withinFE.toFixed(3)} color={CHART_BLUE} sub="向下 Nickell 偏误" />
        <Stat label="Diff-GMM ρ̂" value={data.fit.diffGMM.toFixed(3)} color={CHART_GOLD} sub="Arellano-Bond 纠偏" />
        <Stat label="真值 ρ" value={rho.toFixed(3)} color={CHART_TEAL} />
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">估计量对比：Pooled OLS 高估、FE 低估、GMM 居中</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.bars}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="name" {...axis} />
              <YAxis {...axis} domain={[0, 1]} />
              <ReferenceLine y={rho} stroke={CHART_TEAL} strokeDasharray="4 4" label={{ value: "真值", fill: CHART_TEAL, fontSize: 10 }} />
              <Tooltip {...tip} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.bars.map((b) => <ReferenceLine key={b.name} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Hansen J 过度识别检验</h4>
          <div className="flex justify-between text-xs font-mono"><span>J = {data.fit.hansenJ.toFixed(2)}, p = {data.fit.hansenP.toFixed(3)}</span><TestBadge reject={data.fit.hansenP < 0.05} /></div>
          <p className="text-[10px] text-muted-foreground">不拒绝 → 工具变量有效 (矩条件成立)。</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">AR(2) 残差自相关</h4>
          <div className="flex justify-between text-xs font-mono"><span>z = {data.fit.arTest2.toFixed(3)}, p = {tTwoTail(data.fit.arTest2 * 3, 1000).toFixed(3)}</span></div>
          <p className="text-[10px] text-muted-foreground">差分残差 AR(2) 不显著 → 支持 GMM 矩条件设定。</p>
        </div>
      </div>

      <Note>
        <p>动态面板 y_it = ρ·y_i,t-1 + μ_i + ε_it 中，Pooled OLS 因忽略 μ_i 而高估 ρ，组内 FE 因去均值引入与滞后项的相关而产生向下 <b>Nickell 偏误</b>（短 T 尤甚）。</p>
        <p>Arellano-Bond 差分 GMM 用 <b>滞后水平 y_i,t-2, y_i,t-3, …</b> 作为差分方程 Δy 的工具变量，纠正偏误。拖动 T 观察短面板下 FE 偏误如何放大而 GMM 保持稳健。</p>
      </Note>
    </div>
  );
};

/* ═══════════════════ 3 · Diebold-Mariano ═══════════════════ */
type Forecaster = "rw" | "ar1" | "ema";
export const DieboldMarianoTool = () => {
  const [f1, setF1] = useState<Forecaster>("rw");
  const [f2, setF2] = useState<Forecaster>("ar1");
  const [phi, setPhi] = useState(0.6);
  const [noise, setNoise] = useState(1);
  const [power, setPower] = useState(2);
  const [seed, setSeed] = useState(7);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const n = 250;
    const series: number[] = [0];
    for (let t = 1; t < n; t++) series.push(phi * series[t - 1] + noise * randn(rng));
    // rolling one-step forecasts starting at t0
    const t0 = 30;
    const ema = (lambda: number) => {
      const out: number[] = [series[0]];
      for (let t = 1; t < n; t++) out.push(lambda * out[t - 1] + (1 - lambda) * series[t - 1]);
      return out;
    };
    const emaSeries = ema(0.7);
    const forecast = (kind: Forecaster, t: number) => {
      if (kind === "rw") return series[t - 1];
      if (kind === "ar1") return phi * series[t - 1];
      return emaSeries[t];
    };
    const e1: number[] = [];
    const e2: number[] = [];
    const chart: { t: number; actual: number; f1: number; f2: number }[] = [];
    for (let t = t0; t < n; t++) {
      const a = series[t];
      const p1 = forecast(f1, t);
      const p2 = forecast(f2, t);
      e1.push(a - p1);
      e2.push(a - p2);
      if (t < t0 + 80) chart.push({ t, actual: a, f1: p1, f2: p2 });
    }
    const dm = dieboldMariano(e1, e2, power === 2 ? 2 : 1, 1);
    const lossChart = dm.lossDiff.slice(0, 120).map((d, i) => ({ t: i, d }));
    return { dm, chart, lossChart };
  }, [f1, f2, phi, noise, power, seed]);

  const names: Record<Forecaster, string> = { rw: "随机游走", ar1: "AR(1)", ema: "指数平滑" };
  const presets = [
    { name: "RW vs AR(1)", apply: () => { setF1("rw"); setF2("ar1"); } },
    { name: "AR(1) vs EMA", apply: () => { setF1("ar1"); setF2("ema"); } },
    { name: "强持续 φ=0.85", apply: () => setPhi(0.85) },
    { name: "MAE 损失", apply: () => setPower(1) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-secondary-foreground font-medium block mb-1">预测器 1</label>
          <select value={f1} onChange={(e) => setF1(e.target.value as Forecaster)} className="w-full bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs font-mono">
            <option value="rw">随机游走</option><option value="ar1">AR(1)</option><option value="ema">指数平滑</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-secondary-foreground font-medium block mb-1">预测器 2</label>
          <select value={f2} onChange={(e) => setF2(e.target.value as Forecaster)} className="w-full bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs font-mono">
            <option value="rw">随机游走</option><option value="ar1">AR(1)</option><option value="ema">指数平滑</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-secondary-foreground font-medium block mb-1">损失函数</label>
          <select value={power} onChange={(e) => setPower(+e.target.value)} className="w-full bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs font-mono">
            <option value={2}>平方损失 (MSE)</option><option value={1}>绝对损失 (MAE)</option>
          </select>
        </div>
        <Slider label="AR 系数 φ" value={phi} min={0} max={0.95} step={0.05} onChange={setPhi} fmt={(v) => v.toFixed(2)} />
        <Slider label="噪声 σ" value={noise} min={0.2} max={3} step={0.1} onChange={setNoise} fmt={(v) => v.toFixed(1)} />
        <Slider label="随机种子" value={seed} min={1} max={200} step={1} onChange={setSeed} />
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label={`平均损失 · ${names[f1]}`} value={data.dm.meanLoss1.toFixed(4)} color={CHART_GOLD} />
        <Stat label={`平均损失 · ${names[f2]}`} value={data.dm.meanLoss2.toFixed(4)} color={CHART_BLUE} />
        <Stat label="DM 统计量" value={data.dm.dmStat.toFixed(3)} color={CHART_TEAL} sub={`p = ${data.dm.pValue.toFixed(3)}`} />
        <Stat label="Harvey 修正" value={data.dm.harveyStat.toFixed(3)} color={CHART_RED} sub={`p = ${data.dm.harveyP.toFixed(3)}`} />
      </div>

      <div className="rounded-xl border border-border p-4 text-sm text-center font-mono"
        style={{ borderColor: data.dm.better ? CHART_GOLD : CHART_GRID, background: "hsl(var(--secondary) / 0.2)" }}>
        {data.dm.better === 0
          ? "两套预测的样本外精度无显著差异 (p ≥ 0.05)。"
          : `${data.dm.better === 1 ? names[f1] : names[f2]} 显著更优 (Harvey p = ${data.dm.harveyP.toFixed(3)})。`}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">实际值 vs 两套预测</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chart}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="actual" name="实际" stroke={CHART_TEXT} dot={false} strokeWidth={1.5} />
                <Line dataKey="f1" name={names[f1]} stroke={CHART_GOLD} dot={false} strokeWidth={1.5} />
                <Line dataKey="f2" name={names[f2]} stroke={CHART_BLUE} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">损失差分 dₜ = L₁ − L₂</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.lossChart}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} />
                <YAxis {...axis} />
                <ReferenceLine y={0} stroke={CHART_TEXT} />
                <Tooltip {...tip} />
                <Bar dataKey="d" fill={CHART_TEAL} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">d̄ 系统偏离 0 → 一方损失持续更低。</p>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════ 4 · Kernel Regression ═══════════════════ */
type TruthFn = "sin" | "step" | "poly";
export const KernelRegressionTool = () => {
  const [truth, setTruth] = useState<TruthFn>("sin");
  const [n, setN] = useState(120);
  const [noise, setNoise] = useState(0.25);
  const [h, setH] = useState(0.5);
  const [kernelName, setKernelName] = useState<KernelName>("gaussian");
  const [local, setLocal] = useState(true);
  const [seed, setSeed] = useState(77);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const fn = (v: number) => truth === "sin" ? Math.sin(v) : truth === "step" ? (v > 0 ? 1 : -1) : 0.15 * v * v * v - v;
    const x = Array.from({ length: n }, () => (rng() * 6 - 3));
    x.sort((a, b) => a - b);
    const y = x.map((v) => fn(v) + noise * randn(rng));
    const query = Array.from({ length: 120 }, (_, i) => (i / 119) * 6 - 3);
    const fit = kernelRegression(x, y, h, { kernel: kernelName, local, query });
    const rot = silvermanBandwidth(x);
    const opt = optimalBandwidth(x, y, 0.05, 2.5, 30, kernelName);
    const chart = query.map((q, i) => ({
      x: q, truth: fn(q), yhat: fit[i].yhat,
      lo: fit[i].yhat - 1.96 * fit[i].se, hi: fit[i].yhat + 1.96 * fit[i].se,
    }));
    const points = x.map((v, i) => ({ x: v, y: y[i] }));
    const cvCurve = opt.curve.map((c) => ({ h: c.h, cv: c.cv }));
    return { chart, points, rot, opt, cvCurve, currentCv: loocvScore(x, y, h, kernelName) };
  }, [truth, n, noise, h, kernelName, local, seed]);

  const presets = [
    { name: "正弦", apply: () => setTruth("sin") },
    { name: "阶跃", apply: () => setTruth("step") },
    { name: "多项式", apply: () => setTruth("poly") },
    { name: "过平滑 h=1.5", apply: () => setH(1.5) },
    { name: "欠平滑 h=0.1", apply: () => setH(0.1) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />
      <div className="grid md:grid-cols-3 gap-4">
        <Slider label="带宽 h" value={h} min={0.05} max={2.5} step={0.05} onChange={setH} fmt={(v) => v.toFixed(2)} />
        <Slider label="样本量 n" value={n} min={40} max={300} step={10} onChange={setN} />
        <Slider label="噪声 σ" value={noise} min={0.05} max={1} step={0.05} onChange={setNoise} fmt={(v) => v.toFixed(2)} />
        <div>
          <label className="text-xs text-secondary-foreground font-medium block mb-1">核函数</label>
          <select value={kernelName} onChange={(e) => setKernelName(e.target.value as KernelName)} className="w-full bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs font-mono">
            <option value="gaussian">高斯</option><option value="epanechnikov">Epanechnikov</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-secondary-foreground font-medium block mb-1">估计量</label>
          <select value={local ? "1" : "0"} onChange={(e) => setLocal(e.target.value === "1")} className="w-full bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs font-mono">
            <option value="1">局部线性 (LOESS)</option><option value="0">Nadaraya-Watson</option>
          </select>
        </div>
        <Slider label="随机种子" value={seed} min={1} max={200} step={1} onChange={setSeed} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="当前带宽 h" value={h.toFixed(3)} color={CHART_GOLD} sub={`CV = ${data.currentCv.toFixed(4)}`} />
        <Stat label="ROT 带宽 (Silverman)" value={data.rot.toFixed(3)} color={CHART_BLUE} />
        <button onClick={() => setH(+data.opt.h.toFixed(3))}
          className="rounded-lg bg-gold/10 border border-gold/30 p-3 text-left hover:bg-gold/20 transition">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">CV 最优 h (点击应用)</p>
          <p className="text-base font-mono tabular-nums text-gold">{data.opt.h.toFixed(3)}</p>
          <p className="text-[10px] font-mono text-muted-foreground">CV = {data.opt.cv.toFixed(4)}</p>
        </button>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">拟合曲线 + 95% 置信带 vs 真实函数</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.chart}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="x" type="number" domain={[-3, 3]} {...axis} />
              <YAxis {...axis} />
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area dataKey="hi" stroke="none" fill={CHART_GOLD} fillOpacity={0.12} name="95% 带" />
              <Area dataKey="lo" stroke="none" fill="hsl(var(--card))" fillOpacity={1} name=" " legendType="none" />
              <Scatter data={data.points} dataKey="y" fill={CHART_TEXT} fillOpacity={0.35} name="观测" />
              <Line dataKey="truth" stroke={CHART_TEAL} dot={false} strokeWidth={1.5} strokeDasharray="5 3" name="真实" />
              <Line dataKey="yhat" stroke={CHART_GOLD} dot={false} strokeWidth={2} name="核回归拟合" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">留一交叉验证 CV(h)</h4>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.cvCurve}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="h" type="number" {...axis} tickFormatter={(v) => v.toFixed(1)} />
              <YAxis {...axis} />
              <ReferenceLine x={data.opt.h} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: "最优", fill: CHART_RED, fontSize: 10 }} />
              <Tooltip {...tip} />
              <Line dataKey="cv" stroke={CHART_BLUE} dot={false} strokeWidth={2} name="CV 误差" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">U 形曲线：h 太小 → 过拟合 (方差大)；h 太大 → 过平滑 (偏差大)。谷底即偏差-方差最优权衡。</p>
      </div>
    </div>
  );
};
