import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Scatter, ComposedChart, BarChart, Bar, Cell,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ── PRNG / stats ── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Student-t draw via z/√(χ²/df). Uses Box-Muller for z and gamma sum for χ². */
function randt(rng: () => number, df: number) {
  const z = randn(rng);
  // χ² with df DOF ≈ sum of squared normals
  let chi = 0;
  for (let i = 0; i < df; i++) { const x = randn(rng); chi += x * x; }
  return z / Math.sqrt(chi / df);
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
function normInv(p: number): number {
  // Beasley-Springer-Moro
  const a = [-3.969683028665376e+1, 2.209460984245205e+2, -2.759285104469687e+2,
             1.383577518672690e+2, -3.066479806614716e+1, 2.506628277459239];
  const b = [-5.447609879822406e+1, 1.615858368580409e+2, -1.556989798598866e+2,
             6.680131188771972e+1, -1.328068155288572e+1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
             -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425, ph = 1 - pl;
  let q: number, r: number;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if (p <= ph) { q = p - 0.5; r = q*q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}
/** Lower regularized incomplete gamma P(a,x), Numerical Recipes (Lentz/series). */
function gammp(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0;
  if (x < a + 1) {
    // Series
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 1; n < 200; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  } else {
    // Continued fraction (return 1 - Q(a,x))
    let b = x + 1 - a, c = 1e30, d = 1 / b, h = d;
    for (let i = 1; i < 200; i++) {
      const an = -i * (i - a);
      b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-10) break;
    }
    return 1 - h * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
}
function lnGamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function chi2cdf(x: number, k: number) { return gammp(k / 2, x / 2); }

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
  </div>
);

const Stat = ({ label, value, color = "hsl(var(--gold))", sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-base font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

export const ESBacktestTool = () => {
  const [N, setN] = useState(500);
  const [alpha, setAlpha] = useState(0.99);
  const [trueDF, setTrueDF] = useState(4); // actual P&L is t-distributed (heavy tails)
  const [muTrue, setMuTrue] = useState(0);
  const [sigmaTrue, setSigmaTrue] = useState(1);
  const [sigmaForecast, setSigmaForecast] = useState(1.0); // forecast σ used for VaR
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const z = normInv(1 - alpha); // negative tail z (e.g. -2.326 at 99%)
    // Forecast assuming Normal: VaR_t = -(μ + σ·z)  on a loss basis (positive loss = bad)
    // Use loss L_t = -PnL_t.
    const pnl: number[] = [];
    const loss: number[] = [];
    const varSeries: number[] = [];
    const esSeries: number[] = [];
    // ES under normal: ES_α = -(μ - σ·φ(z)/(1-α))
    const phi = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const esNormal = -(0 - sigmaForecast * phi(z) / (1 - alpha));
    const varNormal = -(0 + sigmaForecast * z); // z<0 ⇒ varNormal>0
    for (let i = 0; i < N; i++) {
      // Real P&L generated from Student-t (heavy tails)
      // Standardize so var = df/(df-2) for df>2; rescale to sigmaTrue
      const tRaw = randt(rng, trueDF);
      const stdT = Math.sqrt(trueDF / (trueDF - 2));
      const r = muTrue + sigmaTrue * (tRaw / stdT);
      pnl.push(r); loss.push(-r);
      varSeries.push(varNormal); esSeries.push(esNormal);
    }

    // Exceedances
    const ex: boolean[] = loss.map((L, i) => L > varSeries[i]);
    const x = ex.filter(Boolean).length;
    const p = 1 - alpha;
    const expN = N * p;

    // Kupiec POF: LR_uc = -2 * [ x*ln(p) + (N-x)*ln(1-p) - x*ln(x/N) - (N-x)*ln(1 - x/N) ]
    let LRuc: number;
    if (x === 0 || x === N) {
      LRuc = -2 * (x * Math.log(p) + (N - x) * Math.log(1 - p));
    } else {
      const phat = x / N;
      LRuc = -2 * (x * Math.log(p) + (N - x) * Math.log(1 - p)
                  - x * Math.log(phat) - (N - x) * Math.log(1 - phat));
    }
    const pVal_uc = 1 - chi2cdf(LRuc, 1);

    // Christoffersen independence: 2x2 transition n_ij where i,j ∈ {0,1} (no exceed / exceed)
    let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
    for (let i = 1; i < N; i++) {
      const a = ex[i - 1] ? 1 : 0, b = ex[i] ? 1 : 0;
      if (a === 0 && b === 0) n00++; else if (a === 0 && b === 1) n01++;
      else if (a === 1 && b === 0) n10++; else n11++;
    }
    const pi01 = n01 / Math.max(n00 + n01, 1);
    const pi11 = n11 / Math.max(n10 + n11, 1);
    const piHat = (n01 + n11) / Math.max(n00 + n01 + n10 + n11, 1);
    const safeLog = (v: number) => (v > 0 ? Math.log(v) : 0);
    const logL_ind = (n00 + n10) * safeLog(1 - piHat) + (n01 + n11) * safeLog(piHat);
    const logL_dep = n00 * safeLog(1 - pi01) + n01 * safeLog(pi01) +
                     n10 * safeLog(1 - pi11) + n11 * safeLog(pi11);
    const LRind = -2 * (logL_ind - logL_dep);
    const pVal_ind = 1 - chi2cdf(Math.max(LRind, 0), 1);
    const LRcc = LRuc + Math.max(LRind, 0);
    const pVal_cc = 1 - chi2cdf(LRcc, 2);

    // Empirical ES (mean of losses exceeding the realized VaR)
    const exceedances = loss.filter((L, i) => L > varSeries[i]);
    const empES = exceedances.length > 0 ? exceedances.reduce((a, b) => a + b, 0) / exceedances.length : NaN;

    // Loss histogram with VaR & ES lines
    const lo = Math.min(...loss), hi = Math.max(...loss);
    const nb = 30;
    const w = (hi - lo) / nb;
    const bins = Array.from({ length: nb }, (_, k) => ({
      mid: +(lo + (k + 0.5) * w).toFixed(3),
      count: 0, exceed: 0,
    }));
    for (let i = 0; i < N; i++) {
      const k = Math.min(nb - 1, Math.max(0, Math.floor((loss[i] - lo) / w)));
      bins[k].count++;
      if (ex[i]) bins[k].exceed++;
    }

    const series = pnl.map((y, i) => ({ t: i + 1, pnl: +y.toFixed(3), loss: +loss[i].toFixed(3),
      var: +varSeries[i].toFixed(3), es: +esSeries[i].toFixed(3),
      breach: ex[i] ? +loss[i].toFixed(3) : null }));

    return {
      series, bins, x, expN, varNormal, esNormal, empES,
      LRuc, pVal_uc, LRind, pVal_ind, LRcc, pVal_cc,
    };
  }, [N, alpha, trueDF, muTrue, sigmaTrue, sigmaForecast, seed]);

  const verdict = (p: number) => p > 0.05
    ? { ok: true, msg: `不拒绝 H₀ (p=${p.toFixed(3)})`, color: CHART_TEAL }
    : { ok: false, msg: `拒绝 H₀ (p=${p.toFixed(3)})`, color: CHART_RED };

  const vUC = verdict(data.pVal_uc);
  const vIND = verdict(data.pVal_ind);
  const vCC = verdict(data.pVal_cc);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "正常市场 (df=30)", description: "近高斯, 模型应通过", apply: () => { setTrueDF(30); setSigmaTrue(1); setSigmaForecast(1); setAlpha(0.99); } },
        { name: "肥尾真实 (df=4)", description: "Kupiec 拒绝", apply: () => { setTrueDF(4); setSigmaTrue(1); setSigmaForecast(1); setAlpha(0.99); } },
        { name: "波动低估", description: "σ̂=0.7·真实", apply: () => { setTrueDF(8); setSigmaTrue(1); setSigmaForecast(0.7); setAlpha(0.99); } },
        { name: "VaR 95% 视图", description: "α=0.95", apply: () => { setAlpha(0.95); setTrueDF(5); setSigmaForecast(1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">回测窗口与置信水平</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="样本期 N" value={N} min={100} max={2000} step={50} onChange={setN} />
            <Slider label="VaR 置信水平 α" value={alpha} min={0.9} max={0.995} step={0.005} onChange={setAlpha} />
          </div>
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-2">真实 P&L 分布 (Student-t)</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="自由度 df (真实)" sub="↓ → 肥尾" value={trueDF} min={3} max={30} step={1} onChange={setTrueDF} />
            <Slider label="μ 真实" value={muTrue} min={-0.5} max={0.5} step={0.05} onChange={setMuTrue} />
            <Slider label="σ 真实" value={sigmaTrue} min={0.5} max={2.5} step={0.1} onChange={setSigmaTrue} />
            <Slider label="σ̂ 模型预测" sub="假设 Normal" value={sigmaForecast} min={0.4} max={2.5} step={0.1} onChange={setSigmaForecast} />
          </div>
          <Slider label="种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={`VaR_${(alpha*100).toFixed(0)} (Normal)`} value={data.varNormal.toFixed(3)} color={CHART_GOLD} />
            <Stat label={`ES_${(alpha*100).toFixed(0)} (Normal)`} value={data.esNormal.toFixed(3)} color={CHART_RED} sub="ES = E[L | L>VaR]" />
            <Stat label="实际穿越次数 x" value={`${data.x} / ${N}`} sub={`期望 ≈ ${data.expN.toFixed(1)}`} />
            <Stat label="经验 ES" value={isFinite(data.empES) ? data.empES.toFixed(3) : "—"} color={CHART_TEAL}
              sub="实测尾部均值" />
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-[11px] font-mono space-y-1.5">
            <p className="text-gold uppercase tracking-wider text-[10px]">Kupiec / Christoffersen 检验</p>
            <p>POF (无条件覆盖) LR={data.LRuc.toFixed(2)} <span style={{ color: vUC.color }}>· {vUC.msg}</span></p>
            <p>独立性 LR={data.LRind.toFixed(2)} <span style={{ color: vIND.color }}>· {vIND.msg}</span></p>
            <p>条件覆盖 LR={data.LRcc.toFixed(2)} <span style={{ color: vCC.color }}>· {vCC.msg}</span></p>
          </div>
        </div>
      </div>

      {/* Time series with VaR line and exceedances */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">损失时序 — VaR 线 / ES 线 / 穿越点</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.series}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="loss" name="损失 L_t" stroke={CHART_BLUE} strokeOpacity={0.55} strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="var" name="VaR" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="es" name="ES" stroke={CHART_RED} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              <Scatter dataKey="breach" name="穿越事件" fill={CHART_RED} />
              <ReferenceLine y={0} stroke={CHART_TEXT} strokeOpacity={0.3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Loss histogram */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">损失分布与尾部 — 红色 bin 含穿越事件</h4>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.bins}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="mid" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Bar dataKey="count">
                {data.bins.map((b, i) => (
                  <Cell key={i} fill={b.exceed > 0 ? CHART_RED : CHART_TEAL} fillOpacity={0.7} />
                ))}
              </Bar>
              <ReferenceLine x={data.varNormal} stroke={CHART_GOLD} strokeWidth={2}
                label={{ value: `VaR=${data.varNormal.toFixed(2)}`, fill: CHART_GOLD, fontSize: 10, position: "top" }} />
              <ReferenceLine x={data.esNormal} stroke={CHART_RED} strokeWidth={2} strokeDasharray="4 3"
                label={{ value: `ES=${data.esNormal.toFixed(2)}`, fill: CHART_RED, fontSize: 10, position: "top" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">教学要点：</span>FRTB 用 ES (97.5%) 代替 VaR (99%) 作为资本计量基准，因为 VaR 不次可加且忽略尾部形状。</p>
        <p>当真实 P&L 为肥尾 (df↓)，假设 Normal 的 VaR 被系统性低估 → Kupiec POF 拒绝 H₀。</p>
        <p>Christoffersen 独立性检验通过 2×2 转移矩阵识别穿越聚集（聚集 = 模型对波动变化反应过慢）。</p>
      </div>
    </div>
  );
};

export default ESBacktestTool;