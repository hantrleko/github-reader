import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, ComposedChart, Scatter, ScatterChart, ReferenceLine, Bar, BarChart, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import {
  selectVARLag, grangerCausality, todaYamamoto,
  periodogram, structuralBreak, cusumTest, mcLeodLi, keenanTest,
  holtWinters, thetaMethod, classicalDecompose, rollingBacktest,
  gphEstimator, hurstRS, simulateARFIMA, acfLags,
} from "@/lib/quant/tsAdvanced";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ───────── PRNG ───────── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function randn(rng: () => number) {
  let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng();
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

const TestBadge = ({ reject, labels }: { reject: boolean; labels?: [string, string] }) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${reject ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"}`}>
    {reject ? (labels?.[0] ?? "拒绝 H₀") : (labels?.[1] ?? "不拒绝 H₀")}
  </span>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">{children}</div>
);

const chartTooltip = { background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11, borderRadius: 8 };
const gridProps = { strokeDasharray: "3 3", stroke: CHART_GRID, opacity: 0.4 };
const axisProps = { stroke: CHART_TEXT, tick: { fontSize: 10, fill: CHART_TEXT } };

/* ══════════════════════════════════════════════════════════════════
   1. Granger causality / Toda-Yamamoto
   ══════════════════════════════════════════════════════════════════ */
type GMode = "xy" | "none" | "bi";

export const GrangerTYTool = () => {
  const [n, setN] = useState(300);
  const [strength, setStrength] = useState(0.6);
  const [lag, setLag] = useState(2);
  const [dmax, setDmax] = useState(1);
  const [persist, setPersist] = useState(0.6);
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState<GMode>("xy");

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const x: number[] = [], y: number[] = [];
    for (let t = 0; t < n; t++) {
      const xv = t > 0 ? persist * x[t - 1] + randn(rng) : randn(rng);
      x.push(xv);
    }
    for (let t = 0; t < n; t++) {
      let yv = t > 0 ? persist * y[t - 1] + 0.4 * randn(rng) : randn(rng);
      if ((mode === "xy" || mode === "bi") && t > 0) yv += strength * x[t - 1];
      y.push(yv);
    }
    if (mode === "bi") {
      // add feedback y->x
      for (let t = 1; t < n; t++) x[t] += 0.4 * strength * y[t - 1];
    }
    const sel = selectVARLag(y, x, 8);
    const gXY = grangerCausality(y, x, lag);
    const gYX = grangerCausality(x, y, lag);
    const tyXY = todaYamamoto(y, x, lag, dmax);
    const tyYX = todaYamamoto(x, y, lag, dmax);
    const series = x.map((xv, i) => ({ t: i, x: +xv.toFixed(3), y: +y[i].toFixed(3) }));
    return { sel, gXY, gYX, tyXY, tyYX, series };
  }, [n, strength, lag, dmax, persist, seed, mode]);

  const Row = ({ dir, g, ty }: { dir: string; g: ReturnType<typeof grangerCausality>; ty: ReturnType<typeof todaYamamoto> }) => (
    <tr className="border-t border-border/50">
      <td className="py-1.5 pr-3 font-medium text-foreground">{dir}</td>
      <td className="py-1.5 pr-3 tabular-nums">{g.fStat.toFixed(3)}</td>
      <td className="py-1.5 pr-3 tabular-nums">{g.fPValue < 1e-4 ? "<0.0001" : g.fPValue.toFixed(4)}</td>
      <td className="py-1.5 pr-3 tabular-nums">{ty.wald.toFixed(3)}</td>
      <td className="py-1.5 pr-3 tabular-nums">{ty.pValue < 1e-4 ? "<0.0001" : ty.pValue.toFixed(4)}</td>
      <td className="py-1.5"><TestBadge reject={ty.reject} labels={["存在因果", "无因果"]} /></td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { id: "xy", label: "X → Y 单向", onClick: () => { setMode("xy"); setStrength(0.6); setPersist(0.6); } },
        { id: "bi", label: "双向反馈", onClick: () => { setMode("bi"); setStrength(0.6); } },
        { id: "none", label: "无因果", onClick: () => { setMode("none"); } },
        { id: "unit", label: "近单位根 (TY 稳健)", onClick: () => { setMode("xy"); setPersist(0.98); setDmax(1); } },
      ]} />
      <div className="grid md:grid-cols-2 gap-4">
        <Slider label="样本量 n" value={n} min={80} max={600} step={20} onChange={setN} />
        <Slider label="因果强度 β" value={strength} min={0} max={1.2} step={0.05} onChange={setStrength} fmt={(v) => v.toFixed(2)} />
        <Slider label="检验滞后阶 p" value={lag} min={1} max={6} step={1} onChange={setLag} />
        <Slider label="TY 增广阶 d_max" sub="≈ 积分阶" value={dmax} min={0} max={2} step={1} onChange={setDmax} />
        <Slider label="持续性 ρ" sub="→1 近单位根" value={persist} min={0} max={0.99} step={0.01} onChange={setPersist} fmt={(v) => v.toFixed(2)} />
        <Slider label="随机种子" value={seed} min={1} max={99} step={1} onChange={setSeed} />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="AIC 最优滞后" value={String(res.sel.aicBest)} />
        <Stat label="BIC 最优滞后" value={String(res.sel.bicBest)} color={CHART_TEAL} />
        <Stat label="当前检验滞后" value={String(lag)} color={CHART_BLUE} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs font-mono">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="py-2 px-3 text-left">方向</th>
              <th className="py-2 px-3 text-left">Granger F</th>
              <th className="py-2 px-3 text-left">Granger p</th>
              <th className="py-2 px-3 text-left">TY Wald χ²</th>
              <th className="py-2 px-3 text-left">TY p</th>
              <th className="py-2 px-3 text-left">结论</th>
            </tr>
          </thead>
          <tbody>
            <Row dir="X → Y" g={res.gXY} ty={res.tyXY} />
            <Row dir="Y → X" g={res.gYX} ty={res.tyYX} />
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2">两序列 (X 蓝 · Y 金)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={res.series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={chartTooltip} />
            <Line type="monotone" dataKey="x" stroke={CHART_BLUE} dot={false} strokeWidth={1} />
            <Line type="monotone" dataKey="y" stroke={CHART_GOLD} dot={false} strokeWidth={1.4} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Note>
        <p>· <b>Granger</b>：F 检验 causing 变量的滞后项在被解释方程中是否联合显著。仅对<b>平稳</b>序列有效。</p>
        <p>· <b>Toda-Yamamoto</b>：拟合 VAR(p+d_max)，仅对前 p 阶做 Wald，对单位根/协整序列稳健——无需先做单位根与协整检验。</p>
        <p>· 近单位根预设 (ρ=0.98) 下，标准 Granger 可能过度拒绝，而 TY 的 χ² 检验保持正确水平。</p>
      </Note>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   2. Spectral analysis + structural break + non-linearity
   ══════════════════════════════════════════════════════════════════ */
type SMode = "seasonal" | "break" | "nonlinear" | "noise";

export const SpectralTool = () => {
  const [n, setN] = useState(240);
  const [period, setPeriod] = useState(12);
  const [amp, setAmp] = useState(1.0);
  const [win, setWin] = useState(2);
  const [noise, setNoise] = useState(0.4);
  const [seed, setSeed] = useState(3);
  const [mode, setMode] = useState<SMode>("seasonal");

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const s: number[] = [];
    for (let t = 0; t < n; t++) {
      let v = 0;
      if (mode === "seasonal") v = amp * Math.sin(2 * Math.PI * t / period) + noise * randn(rng);
      else if (mode === "break") v = (t < n / 2 ? 0 : 4) + 0.03 * t + noise * randn(rng);
      else if (mode === "nonlinear") { const prev = s[t - 1] ?? 0; v = Math.sqrt(0.2 + 0.7 * prev * prev) * randn(rng); }
      else v = noise * randn(rng);
      s.push(v);
    }
    const spec = periodogram(s, win);
    const brk = structuralBreak(s);
    const cus = cusumTest(s);
    const ml = mcLeodLi(s, 12);
    const kn = keenanTest(s, 2);
    const specData = spec.points.filter((p) => p.period <= n / 2).map((p) => ({ period: +p.period.toFixed(2), power: p.power, smooth: p.smooth }));
    const series = s.map((v, i) => ({ t: i, y: +v.toFixed(3) }));
    const cusData = cus.points.map((p) => ({ t: p.t, cusum: +p.cusum.toFixed(3), upper: +p.upper.toFixed(3), lower: +p.lower.toFixed(3) }));
    return { spec, brk, cus, ml, kn, specData, series, cusData };
  }, [n, period, amp, win, noise, seed, mode]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { id: "seasonal", label: "季节周期", onClick: () => { setMode("seasonal"); setAmp(1); } },
        { id: "break", label: "结构突变", onClick: () => { setMode("break"); } },
        { id: "nonlinear", label: "非线性 (ARCH)", onClick: () => { setMode("nonlinear"); } },
        { id: "noise", label: "纯白噪声", onClick: () => { setMode("noise"); } },
      ]} />
      <div className="grid md:grid-cols-2 gap-4">
        <Slider label="样本量 n" value={n} min={80} max={480} step={20} onChange={setN} />
        <Slider label="真实周期" sub="季节模式" value={period} min={4} max={48} step={1} onChange={setPeriod} />
        <Slider label="振幅" value={amp} min={0} max={3} step={0.1} onChange={setAmp} fmt={(v) => v.toFixed(1)} />
        <Slider label="平滑窗半宽" value={win} min={0} max={8} step={1} onChange={setWin} />
        <Slider label="噪声 σ" value={noise} min={0.1} max={1.5} step={0.05} onChange={setNoise} fmt={(v) => v.toFixed(2)} />
        <Slider label="随机种子" value={seed} min={1} max={99} step={1} onChange={setSeed} />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="主导周期" value={res.spec.dominantPeriod.toFixed(2)} sub={mode === "seasonal" ? `真实 ${period}` : "—"} />
        <Stat label="Bai-Perron 断点" value={String(res.brk.breakIndex)} color={CHART_TEAL} sub={`supF=${res.brk.supF.toFixed(1)}`} />
        <Stat label="CUSUM 稳定性" value={res.cus.crossed ? "越界 (不稳定)" : "稳定"} color={res.cus.crossed ? CHART_RED : CHART_TEAL} />
      </div>

      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2">谱密度（金=周期图，蓝=平滑）</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={res.specData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="period" type="number" scale="log" domain={["auto", "auto"]} {...axisProps} label={{ value: "周期", position: "insideBottom", offset: -2, fontSize: 10, fill: CHART_TEXT }} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={chartTooltip} />
            <Line type="monotone" dataKey="power" stroke={CHART_GOLD} dot={false} strokeWidth={1} opacity={0.5} />
            <Line type="monotone" dataKey="smooth" stroke={CHART_BLUE} dot={false} strokeWidth={1.6} />
            <ReferenceLine x={+res.spec.dominantPeriod.toFixed(2)} stroke={CHART_RED} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-2">序列（红线=断点）</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={res.series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="t" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={chartTooltip} />
              <Line type="monotone" dataKey="y" stroke={CHART_GOLD} dot={false} strokeWidth={1} />
              <ReferenceLine x={res.brk.breakIndex} stroke={CHART_RED} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-2">OLS-CUSUM（5% 边界）</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={res.cusData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="t" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={chartTooltip} />
              <Line type="monotone" dataKey="cusum" stroke={CHART_BLUE} dot={false} strokeWidth={1.4} />
              <Line type="monotone" dataKey="upper" stroke={CHART_RED} dot={false} strokeWidth={1} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="lower" stroke={CHART_RED} dot={false} strokeWidth={1} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-lg bg-secondary/40 border border-border p-3 flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">McLeod-Li (p={res.ml.pValue.toFixed(3)})</span>
          <TestBadge reject={res.ml.reject} labels={["非线性/ARCH", "线性"]} />
        </div>
        <div className="rounded-lg bg-secondary/40 border border-border p-3 flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">Keenan (p={res.kn.pValue.toFixed(3)})</span>
          <TestBadge reject={res.kn.reject} labels={["非线性", "线性"]} />
        </div>
      </div>

      <Note>
        <p>· <b>周期图/谱密度</b>：把序列分解到频域，峰值对应主导周期。Daniell 平滑降低方差、更易辨识节律。</p>
        <p>· <b>Bai-Perron</b> sup-F 搜索单一结构断点；<b>CUSUM</b> 累积标准化残差越界即参数不稳定。</p>
        <p>· <b>McLeod-Li</b>（残差平方 ACF）与 <b>Keenan</b> 检验（Tsay 族）识别 ARCH/门限型非线性结构。</p>
      </Note>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   3. Exponential smoothing forecasting lab
   ══════════════════════════════════════════════════════════════════ */
type FMethod = "hw" | "theta";

export const ExpSmoothTool = () => {
  const [n, setN] = useState(120);
  const [m, setM] = useState(12);
  const [slope, setSlope] = useState(0.5);
  const [seasAmp, setSeasAmp] = useState(10);
  const [noise, setNoise] = useState(1);
  const [h, setH] = useState(18);
  const [seed, setSeed] = useState(5);
  const [method, setMethod] = useState<FMethod>("hw");
  const [seasonal, setSeasonal] = useState<"additive" | "multiplicative">("additive");

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const y: number[] = [];
    for (let t = 0; t < n; t++) {
      const base = 50 + slope * t;
      const seas = seasonal === "multiplicative"
        ? (1 + (seasAmp / 50) * Math.sin(2 * Math.PI * t / m))
        : seasAmp * Math.sin(2 * Math.PI * t / m);
      const val = seasonal === "multiplicative" ? base * seas + noise * randn(rng) : base + seas + noise * randn(rng);
      y.push(val);
    }
    const fit = method === "hw" ? holtWinters(y, m, seasonal, h) : null;
    const theta = method === "theta" ? thetaMethod(y, h) : null;
    const fitted = fit ? fit.fitted : theta!.fitted;
    const forecast = fit ? fit.forecast : theta!.forecast;
    const resid = y.map((v, i) => v - fitted[i]);
    const sigma = Math.sqrt(resid.slice(m).reduce((s, e) => s + e * e, 0) / Math.max(resid.length - m, 1));
    const dec = classicalDecompose(y, m);
    const bt = rollingBacktest(y, m, seasonal);

    const chart = y.map((v, i) => ({ t: i, actual: +v.toFixed(2), fit: +fitted[i].toFixed(2) }));
    for (let k = 0; k < h; k++) {
      const f = forecast[k];
      chart.push({ t: n + k, actual: null as unknown as number, fit: +f.toFixed(2), lo: +(f - 1.96 * sigma).toFixed(2), hi: +(f + 1.96 * sigma).toFixed(2), band: +(2 * 1.96 * sigma).toFixed(2) } as never);
    }
    const decChart = y.map((v, i) => ({
      t: i, y: +v.toFixed(2),
      trend: dec.trend[i] == null ? null : +(dec.trend[i] as number).toFixed(2),
      seasonal: +dec.seasonal[i].toFixed(2),
      remainder: dec.remainder[i] == null ? null : +(dec.remainder[i] as number).toFixed(2),
    }));
    return { fit, theta, bt, chart, decChart, sigma };
  }, [n, m, slope, seasAmp, noise, h, seed, method, seasonal]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { id: "hwadd", label: "Holt-Winters 加法", onClick: () => { setMethod("hw"); setSeasonal("additive"); } },
        { id: "hwmul", label: "HW 乘法", onClick: () => { setMethod("hw"); setSeasonal("multiplicative"); } },
        { id: "theta", label: "Theta 方法", onClick: () => setMethod("theta") },
        { id: "quarter", label: "季度 (m=4)", onClick: () => setM(4) },
      ]} />
      <div className="grid md:grid-cols-2 gap-4">
        <Slider label="样本量 n" value={n} min={48} max={240} step={12} onChange={setN} />
        <Slider label="季节周期 m" value={m} min={2} max={24} step={1} onChange={setM} />
        <Slider label="趋势斜率" value={slope} min={0} max={2} step={0.1} onChange={setSlope} fmt={(v) => v.toFixed(1)} />
        <Slider label="季节振幅" value={seasAmp} min={0} max={30} step={1} onChange={setSeasAmp} />
        <Slider label="噪声 σ" value={noise} min={0.2} max={6} step={0.2} onChange={setNoise} fmt={(v) => v.toFixed(1)} />
        <Slider label="预测步数 h" value={h} min={4} max={36} step={2} onChange={setH} />
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="回测 RMSE" value={res.bt.rmse.toFixed(2)} />
        <Stat label="朴素 RMSE" value={res.bt.naiveRmse.toFixed(2)} color={CHART_TEXT} />
        <Stat label="MASE" value={res.bt.mase.toFixed(3)} color={res.bt.mase < 1 ? CHART_TEAL : CHART_RED} sub={res.bt.mase < 1 ? "优于朴素" : "劣于朴素"} />
        <Stat label="RMSSE" value={res.bt.rmsse.toFixed(3)} color={res.bt.rmsse < 1 ? CHART_TEAL : CHART_RED} />
      </div>

      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2">拟合 + {h} 步预测（金=实际，蓝=预测，阴影=95% 区间）</p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={res.chart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={chartTooltip} />
            <Area dataKey="lo" stackId="band" stroke="none" fill="transparent" />
            <Area dataKey="band" stackId="band" stroke="none" fill={CHART_BLUE} fillOpacity={0.15} />
            <Line type="monotone" dataKey="actual" stroke={CHART_GOLD} dot={false} strokeWidth={1.4} connectNulls={false} />
            <Line type="monotone" dataKey="fit" stroke={CHART_BLUE} dot={false} strokeWidth={1.2} strokeDasharray="4 2" />
            <ReferenceLine x={n - 1} stroke={CHART_TEXT} strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2">经典分解：趋势 / 季节 / 残差</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={res.decChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={chartTooltip} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="trend" name="趋势" stroke={CHART_GOLD} dot={false} strokeWidth={1.6} connectNulls />
            <Line type="monotone" dataKey="seasonal" name="季节" stroke={CHART_TEAL} dot={false} strokeWidth={1} />
            <Line type="monotone" dataKey="remainder" name="残差" stroke={CHART_RED} dot={false} strokeWidth={0.8} opacity={0.6} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Note>
        <p>· <b>Holt-Winters</b>：水平 + 趋势 + 季节三重指数平滑（α,β,γ 网格搜索最小化一步 SSE），支持加法/乘法季节。</p>
        <p>· <b>Theta 方法</b>：θ=0 线性趋势与 θ=2 平滑线的等权组合，M3 竞赛冠军级基准。</p>
        <p>· <b>滚动回测</b>：扩展窗口一步样本外预测；<b>MASE/RMSSE {"<"} 1</b> 表示优于季节朴素基准。</p>
      </Note>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   4. Long memory / ARFIMA
   ══════════════════════════════════════════════════════════════════ */
export const LongMemoryTool = () => {
  const [n, setN] = useState(600);
  const [d, setD] = useState(0.35);
  const [power, setPower] = useState(0.5);
  const [seed, setSeed] = useState(11);
  const [compareWN, setCompareWN] = useState(true);

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const lm = simulateARFIMA(n, d, rng);
    const rng2 = mulberry32(seed + 100);
    const wn: number[] = [];
    for (let t = 0; t < n; t++) wn.push(randn(rng2));
    const gph = gphEstimator(lm, power);
    const gphWN = gphEstimator(wn, power);
    const hurst = hurstRS(lm);
    const hurstWN = hurstRS(wn);
    const acfLM = acfLags(lm, 30);
    const acfWNv = acfLags(wn, 30);
    const acfData = acfLM.map((v, i) => ({ lag: i + 1, lm: +v.toFixed(3), wn: +acfWNv[i].toFixed(3) }));
    const gphData = gph.points.map((p) => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3), fit: +(gph.intercept + gph.slope * p.x).toFixed(3) }));
    const hurstData = hurst.points.map((p) => ({ x: +p.logN.toFixed(3), y: +p.logRS.toFixed(3) }));
    const ci = 1.96 * gph.se;
    const series = lm.map((v, i) => ({ t: i, y: +v.toFixed(3) }));
    return { gph, gphWN, hurst, hurstWN, acfData, gphData, hurstData, ci, series };
  }, [n, d, power, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { id: "short", label: "短记忆 (d≈0)", onClick: () => setD(0.02) },
        { id: "long", label: "长记忆 (d=0.35)", onClick: () => setD(0.35) },
        { id: "nonstat", label: "非平稳 (d=0.55)", onClick: () => setD(0.55) },
        { id: "neg", label: "反持续 (d=-0.3)", onClick: () => setD(-0.3) },
      ]} />
      <div className="grid md:grid-cols-2 gap-4">
        <Slider label="样本量 n" value={n} min={200} max={1200} step={100} onChange={setN} />
        <Slider label="真实分数阶 d" sub="ARFIMA(0,d,0)" value={d} min={-0.4} max={0.6} step={0.05} onChange={setD} fmt={(v) => v.toFixed(2)} />
        <Slider label="GPH 带宽幂 m=n^p" value={power} min={0.35} max={0.75} step={0.05} onChange={setPower} fmt={(v) => v.toFixed(2)} />
        <Slider label="随机种子" value={seed} min={1} max={99} step={1} onChange={setSeed} />
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="GPH d̂" value={res.gph.d.toFixed(3)} sub={`真实 ${d.toFixed(2)}`} />
        <Stat label="GPH 95% CI" value={`±${res.ci.toFixed(3)}`} color={CHART_TEXT} sub={res.gph.pValue < 0.05 ? "d≠0 显著" : "d≈0"} />
        <Stat label="Hurst H" value={res.hurst.hurst.toFixed(3)} color={CHART_TEAL} sub={`d≈${res.hurst.d.toFixed(2)}`} />
        <Stat label="白噪声 d̂" value={res.gphWN.d.toFixed(3)} color={CHART_TEXT} sub={`H=${res.hurstWN.hurst.toFixed(2)}`} />
      </div>

      <div className="flex items-center gap-2">
        <input id="cmpwn" type="checkbox" checked={compareWN} onChange={(e) => setCompareWN(e.target.checked)} className="accent-gold" />
        <label htmlFor="cmpwn" className="text-xs font-mono text-muted-foreground">ACF 图叠加白噪声对比</label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-2">ACF：长记忆缓慢衰减 vs 白噪声</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={res.acfData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="lag" {...axisProps} />
              <YAxis {...axisProps} domain={[-0.3, 1]} />
              <Tooltip contentStyle={chartTooltip} />
              <Bar dataKey="lm" name="长记忆" fill={CHART_GOLD} />
              {compareWN && <Bar dataKey="wn" name="白噪声" fill={CHART_BLUE} fillOpacity={0.5} />}
              <ReferenceLine y={0} stroke={CHART_TEXT} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-2">GPH log-周期图回归（斜率 = −d）</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={res.gphData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="x" type="number" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={chartTooltip} />
              <Scatter dataKey="y" fill={CHART_GOLD} />
              <Line type="monotone" dataKey="fit" stroke={CHART_RED} dot={false} strokeWidth={1.4} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2">模拟 ARFIMA 序列</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={res.series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={chartTooltip} />
            <Line type="monotone" dataKey="y" stroke={CHART_GOLD} dot={false} strokeWidth={0.9} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Note>
        <p>· <b>GPH</b>：对最低 m≈n^p 个傅里叶频率做 log-周期图回归，斜率 = −d，SE = π/√(6·Σ(x−x̄)²)。</p>
        <p>· <b>R/S Hurst</b>：重标极差随窗口增长的幂律指数 H，长记忆时 H{">"}0.5、d≈H−0.5。</p>
        <p>· d∈(0,0.5) 为平稳长记忆（ACF 双曲衰减），d≥0.5 非平稳，d{"<"}0 反持续。</p>
      </Note>
    </div>
  );
};