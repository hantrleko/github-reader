import { useState, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ScatterChart, Scatter, BarChart, Bar, ComposedChart, Area, Cell,
} from "recharts";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import PresetButtons from "./PresetButtons";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { HistoryDrawer } from "@/components/common/HistoryDrawer";
import { EquationBlock } from "@/components/common/EquationBlock";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ──────────────── Shared helpers ──────────────── */
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
// Standard normal CDF (Abramowitz & Stegun)
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
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q: number, r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= ph) {
    q = p - 0.5;
    r = q*q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md";

interface SliderProps {
  label: string; sub?: string; unit?: string;
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}
const Slider = ({ label, sub, unit, value, min, max, step, onChange }: SliderProps) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}
        {sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 3)}{unit && ` ${unit}`}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={sliderClass}
    />
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

/* ════════════════════════════════════════════════════════════
   1. Merton Structural Credit Risk (DD + PD + Credit Spread)
   ════════════════════════════════════════════════════════════ */
export const MertonTool = () => {
  const [V, setV] = useState(120);    // asset value
  const [D, setD] = useState(100);    // debt face
  const [sigmaV, setSigmaV] = useState(0.25);
  const [r, setR] = useState(0.04);
  const [T, setT] = useState(1.0);
  const [muV, setMuV] = useState(0.08); // expected asset drift (KMV uses μ instead of r for DD)

  const result = useMemo(() => {
    // d1, d2 (risk-neutral, used for equity & risk-neutral PD)
    const d1 = (Math.log(V / D) + (r + 0.5 * sigmaV * sigmaV) * T) / (sigmaV * Math.sqrt(T));
    const d2 = d1 - sigmaV * Math.sqrt(T);

    // Equity = V·N(d1) - D·e^{-rT}·N(d2)
    const E = V * normCdf(d1) - D * Math.exp(-r * T) * normCdf(d2);
    // Risk-neutral PD = N(-d2)
    const pdRN = normCdf(-d2);
    // Real-world (KMV-style) DD uses μ instead of r
    const dd = (Math.log(V / D) + (muV - 0.5 * sigmaV * sigmaV) * T) / (sigmaV * Math.sqrt(T));
    const pdReal = normCdf(-dd);
    // Credit spread: y = -ln(B/D)/T - r, where B = D·e^{-rT}·N(d2) + V·N(-d1)
    const B = D * Math.exp(-r * T) * normCdf(d2) + V * normCdf(-d1);
    const y = -Math.log(B / D) / T;
    const spread = (y - r) * 10000; // bps
    // Recovery rate (expected recovery if default, risk-neutral)
    const rr = pdRN > 1e-9 ? (V * normCdf(-d1)) / (D * pdRN) : 0;
    const lgd = 1 - rr;
    return { d1, d2, E, pdRN, dd, pdReal, B, spread, rr, lgd };
  }, [V, D, sigmaV, r, T, muV]);

  // PD vs leverage curve
  const leverageCurve = useMemo(() => {
    const out: any[] = [];
    for (let lev = 0.3; lev <= 1.6; lev += 0.05) {
      const dCur = V * lev / 1.0;
      const d1c = (Math.log(V / dCur) + (r + 0.5 * sigmaV * sigmaV) * T) / (sigmaV * Math.sqrt(T));
      const d2c = d1c - sigmaV * Math.sqrt(T);
      const Bc = dCur * Math.exp(-r * T) * normCdf(d2c) + V * normCdf(-d1c);
      const yc = -Math.log(Bc / dCur) / T;
      out.push({
        lev: +lev.toFixed(2),
        pd: +(normCdf(-d2c) * 100).toFixed(3),
        spread: +Math.max((yc - r) * 10000, 0).toFixed(2),
      });
    }
    return out;
  }, [V, sigmaV, r, T]);

  // Asset-value distribution at T (lognormal) with default zone shaded
  const distData = useMemo(() => {
    const med = V * Math.exp((muV - 0.5 * sigmaV * sigmaV) * T);
    const sd = sigmaV * Math.sqrt(T);
    const out: any[] = [];
    for (let z = -3.5; z <= 3.5; z += 0.1) {
      const Vt = med * Math.exp(sd * z);
      const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
      out.push({
        Vt: +Vt.toFixed(2),
        pdf: +pdf.toFixed(4),
        defaultZone: Vt < D ? +pdf.toFixed(4) : 0,
      });
    }
    return out;
  }, [V, sigmaV, T, muV, D]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "投资级", description: "低杠杆 / 低 PD", apply: () => { setV(150); setD(80); setSigmaV(0.20); setMuV(0.08); setR(0.04); setT(1); } },
        { name: "高收益债", description: "BB / B 评级", apply: () => { setV(120); setD(100); setSigmaV(0.30); setMuV(0.07); } },
        { name: "濒临违约", description: "V≈D, 高波动", apply: () => { setV(105); setD(100); setSigmaV(0.45); setMuV(0.05); } },
        { name: "已资不抵债", description: "V<D, 极高 PD", apply: () => { setV(85); setD(100); setSigmaV(0.40); setMuV(0.05); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="资产价值 V₀" sub="Asset value" value={V} min={50} max={250} step={1} onChange={setV} />
          <Slider label="债务面值 D" sub="Debt face value" value={D} min={20} max={200} step={1} onChange={setD} />
          <Slider label="资产波动率 σᵥ" sub="Asset volatility" value={sigmaV} min={0.05} max={0.8} step={0.01} onChange={setSigmaV} />
          <Slider label="无风险利率 r" sub="Risk-free rate" value={r} min={0} max={0.15} step={0.005} onChange={setR} />
          <Slider label="资产期望收益 μᵥ" sub="KMV 真实测度" value={muV} min={0} max={0.20} step={0.005} onChange={setMuV} />
          <Slider label="期限 T (年)" value={T} min={0.25} max={5} step={0.25} onChange={setT} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="违约距离 DD" value={result.dd.toFixed(3)} sub="KMV (μ 测度)" />
            <Stat label="实测 PD" value={`${(result.pdReal * 100).toFixed(2)}%`} color={CHART_RED} sub="N(-DD)" />
            <Stat label="风险中性 PD" value={`${(result.pdRN * 100).toFixed(2)}%`} color={CHART_RED} sub="N(-d₂)" />
            <Stat label="股权价值 E" value={result.E.toFixed(2)} color={CHART_GOLD} sub="看涨期权价值" />
            <Stat label="信用利差" value={`${result.spread.toFixed(1)} bp`} color={CHART_GOLD} sub="y - r" />
            <Stat label="LGD (违约损失率)" value={`${(result.lgd * 100).toFixed(1)}%`} sub={`回收率 ${(result.rr * 100).toFixed(1)}%`} />
          </div>

          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">解读：</span>股权可视为以资产 V 为标的、行权价 D 的欧式看涨期权 (Merton 1974)。</p>
            <p>违约 ↔ V_T &lt; D。DD 越大越安全；KMV 用真实漂移 μ 而非 r。</p>
            <p>风险中性 PD 用于债券/CDS 定价；实测 PD 用于风险管理与评级映射。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">资产价值分布 V_T (lognormal)</h4>
          <p className="text-[10px] font-mono text-muted-foreground mb-2">红色阴影 = 违约区域 V_T &lt; D</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={distData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="Vt" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Area type="monotone" dataKey="pdf" stroke={CHART_GOLD} strokeWidth={2} fill={CHART_GOLD} fillOpacity={0.18} name="资产分布" />
                <Area type="monotone" dataKey="defaultZone" stroke="none" fill={CHART_RED} fillOpacity={0.45} name="违约区域" />
                <ReferenceLine x={D} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: `D=${D}`, fill: CHART_RED, fontSize: 10 }} />
                <ReferenceLine x={V} stroke={CHART_TEAL} strokeDasharray="4 4" label={{ value: `V₀=${V}`, fill: CHART_TEAL, fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">PD 与信用利差 vs 杠杆 D/V</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={leverageCurve}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="lev" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke={CHART_RED} tick={{ fontSize: 10 }} label={{ value: "PD %", angle: -90, position: "insideLeft", fill: CHART_RED, fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke={CHART_GOLD} tick={{ fontSize: 10 }} label={{ value: "Spread bp", angle: 90, position: "insideRight", fill: CHART_GOLD, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="pd" name="风险中性 PD %" stroke={CHART_RED} strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="spread" name="信用利差 bp" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
                <ReferenceLine x={+(D / V).toFixed(2)} yAxisId="left" stroke={CHART_TEAL} strokeDasharray="3 3" label={{ value: "当前", fill: CHART_TEAL, fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. Copula Dependence (Gaussian / t)
   ════════════════════════════════════════════════════════════ */
export const CopulaTool = () => {
  const [family, setFamily] = useState<"gaussian" | "t">("gaussian");
  const [rho, setRho] = useState(0.6);
  const [df, setDf] = useState(4);
  const [n, setN] = useState(2000);
  const [seed, setSeed] = useState(11);
  const [w1, setW1] = useState(0.5);
  const [varAlpha, setVarAlpha] = useState(0.99);

  // sample chi-squared with df via sum of squares of standard normals (small df ok)
  const chi2 = (rng: () => number, k: number) => {
    let s = 0;
    for (let i = 0; i < k; i++) { const z = randn(rng); s += z * z; }
    return s;
  };

  const sim = useMemo(() => {
    const rng = mulberry32(seed);
    const a = rho;
    const b = Math.sqrt(Math.max(1 - rho * rho, 0));
    const us: number[] = []; // copula uniforms 1
    const vs: number[] = []; // copula uniforms 2
    const x1: number[] = []; // marginal returns 1 (standard normal for clarity)
    const x2: number[] = [];
    for (let i = 0; i < n; i++) {
      const z1 = randn(rng);
      const z2n = randn(rng);
      let zz1 = z1;
      let zz2 = a * z1 + b * z2n;
      if (family === "t") {
        const W = chi2(rng, df) / df;
        const sc = 1 / Math.sqrt(W);
        zz1 *= sc; zz2 *= sc;
        // map to uniforms via Student-t CDF approximation -> use normCdf of standardised? For copula we need t-CDF.
        // Approximate t-CDF via Hill's approximation: use normCdf of zz/sqrt((df-2)/df) when df>2
        const adj = df > 2 ? Math.sqrt(df / (df - 2)) : 1;
        us.push(normCdf(zz1 / adj));
        vs.push(normCdf(zz2 / adj));
        x1.push(zz1 / adj);
        x2.push(zz2 / adj);
      } else {
        us.push(normCdf(zz1));
        vs.push(normCdf(zz2));
        x1.push(zz1);
        x2.push(zz2);
      }
    }
    // Empirical Kendall tau (subsample for speed)
    const M = Math.min(400, n);
    let conc = 0, disc = 0;
    for (let i = 0; i < M; i++) {
      for (let j = i + 1; j < M; j++) {
        const s1 = Math.sign(x1[i] - x1[j]);
        const s2 = Math.sign(x2[i] - x2[j]);
        if (s1 * s2 > 0) conc++;
        else if (s1 * s2 < 0) disc++;
      }
    }
    const tau = (conc - disc) / (conc + disc);
    // Tail dependence: P(U>q | V>q) for q close to 1; lower tail symmetric
    const qHi = 0.95, qLo = 0.05;
    let cntV_hi = 0, cntBoth_hi = 0, cntV_lo = 0, cntBoth_lo = 0;
    for (let i = 0; i < n; i++) {
      if (vs[i] > qHi) { cntV_hi++; if (us[i] > qHi) cntBoth_hi++; }
      if (vs[i] < qLo) { cntV_lo++; if (us[i] < qLo) cntBoth_lo++; }
    }
    const lambdaU = cntV_hi ? cntBoth_hi / cntV_hi : 0;
    const lambdaL = cntV_lo ? cntBoth_lo / cntV_lo : 0;
    // Theoretical t-copula tail dep: 2 * t_{df+1}( -sqrt((df+1)(1-rho)/(1+rho)) )
    let lambdaTheo = 0;
    if (family === "t") {
      const arg = -Math.sqrt((df + 1) * (1 - rho) / (1 + rho));
      // approximate t_{df+1} via normal-scaled
      const adj = (df + 1) > 2 ? Math.sqrt((df + 1) / (df - 1)) : 1;
      lambdaTheo = 2 * normCdf(arg / adj);
    }

    // Portfolio loss = -(w1 * x1 + w2 * x2)
    const w2 = 1 - w1;
    const losses: number[] = x1.map((v, i) => -(w1 * v + w2 * x2[i]));
    const sorted = [...losses].sort((p, q) => p - q);
    const idx99 = Math.min(Math.floor(varAlpha * n), n - 1);
    const VaR = sorted[idx99];
    const tailSlice = sorted.slice(idx99);
    const ES = tailSlice.reduce((s, v) => s + v, 0) / tailSlice.length;

    // Scatter sample for plot
    const scatter = us.slice(0, 1500).map((u, i) => ({ u: +u.toFixed(3), v: +vs[i].toFixed(3) }));
    // Loss histogram
    const bins = 40;
    const lo = Math.min(...losses), hi = Math.max(...losses);
    const w = (hi - lo) / bins;
    const hist = Array.from({ length: bins }, (_, k) => ({
      mid: +(lo + (k + 0.5) * w).toFixed(3),
      cnt: 0,
      tail: 0,
    }));
    losses.forEach(L => {
      const k = Math.min(Math.floor((L - lo) / w), bins - 1);
      hist[k].cnt++;
      if (L >= VaR) hist[k].tail++;
    });

    return { scatter, hist, tau, lambdaU, lambdaL, lambdaTheo, VaR, ES };
  }, [family, rho, df, n, seed, w1, varAlpha]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "高斯 ρ=0.7", description: "无尾相依", apply: () => { setFamily("gaussian"); setRho(0.7); setW1(0.5); setVarAlpha(0.99); } },
        { name: "t-Copula df=4", description: "强尾相依 (危机模式)", apply: () => { setFamily("t"); setRho(0.7); setDf(4); setVarAlpha(0.99); } },
        { name: "极端 t df=2.5", description: "肥尾极端", apply: () => { setFamily("t"); setRho(0.6); setDf(3); } },
        { name: "几乎独立", description: "ρ=0.1, 分散有效", apply: () => { setFamily("gaussian"); setRho(0.1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">Copula 族：</span>
            {([
              { id: "gaussian", label: "Gaussian", desc: "无尾相依" },
              { id: "t", label: "Student-t", desc: "对称尾相依" },
            ] as const).map(m => (
              <button key={m.id} onClick={() => setFamily(m.id)} title={m.desc}
                className={"text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
                  (family === m.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40")}>
                {m.label}
              </button>
            ))}
          </div>
          <Slider label="相关系数 ρ" value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} />
          {family === "t" && (
            <Slider label="自由度 ν" sub="越小尾相依越强" value={df} min={2.5} max={30} step={0.5} onChange={setDf} />
          )}
          <Slider label="样本量 n" value={n} min={500} max={5000} step={500} onChange={setN} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
          <Slider label="组合权重 w₁" sub={`w₂ = ${(1 - w1).toFixed(2)}`} value={w1} min={0} max={1} step={0.05} onChange={setW1} />
          <Slider label="VaR / ES 置信度" value={varAlpha} min={0.90} max={0.999} step={0.005} onChange={setVarAlpha} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Kendall τ̂ (经验)" value={sim.tau.toFixed(3)} />
            <Stat label="理论 τ" value={((2 / Math.PI) * Math.asin(rho)).toFixed(3)} sub="(2/π)·arcsin(ρ)" />
            <Stat label="上尾相依 λᵤ (经验)" value={sim.lambdaU.toFixed(3)} color={CHART_RED} sub="P(U>0.95|V>0.95)" />
            <Stat label="下尾相依 λₗ (经验)" value={sim.lambdaL.toFixed(3)} color={CHART_RED} sub="P(U<0.05|V<0.05)" />
            <Stat label={`组合 VaR_{${(varAlpha * 100).toFixed(1)}%}`} value={sim.VaR.toFixed(3)} color={CHART_GOLD} />
            <Stat label="期望损失 ES" value={sim.ES.toFixed(3)} color={CHART_GOLD} sub="尾部均值" />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">Sklar 定理：</span>F(x,y) = C(F₁(x), F₂(y))。Copula 把<strong>边际分布</strong>与<strong>相依结构</strong>解耦。</p>
            <p>高斯 Copula 的 λᵤ = λₗ = 0；t-Copula 即使在 ρ 相同时也表现出强尾相依（2008 危机经典教训）。</p>
            <p>{family === "t" && `理论尾相依 λ ≈ ${sim.lambdaTheo.toFixed(3)}（t-Copula 公式）`}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Copula 散点 (U, V) ∈ [0,1]²</h4>
          <p className="text-[10px] font-mono text-muted-foreground mb-2">边际已转为均匀分布；观察四角的聚集程度</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="u" stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, 1]} />
                <YAxis type="number" dataKey="v" stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, 1]} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Scatter data={sim.scatter} fill={family === "t" ? CHART_RED : CHART_TEAL} fillOpacity={0.45} />
                <ReferenceLine x={0.95} stroke={CHART_GOLD} strokeDasharray="3 3" />
                <ReferenceLine y={0.95} stroke={CHART_GOLD} strokeDasharray="3 3" />
                <ReferenceLine x={0.05} stroke={CHART_GOLD} strokeDasharray="3 3" />
                <ReferenceLine y={0.05} stroke={CHART_GOLD} strokeDasharray="3 3" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">组合损失分布 (金色 = 尾部超过 VaR)</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sim.hist}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="mid" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Bar dataKey="cnt" fill={CHART_TEAL} fillOpacity={0.6} name="损失频次" />
                <Bar dataKey="tail" fill={CHART_GOLD} name="尾部 ≥ VaR" />
                <ReferenceLine x={+sim.VaR.toFixed(3)} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: "VaR", fill: CHART_RED, fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Stress Testing (Historical + Hypothetical)
   ════════════════════════════════════════════════════════════ */
type Scenario = {
  id: string;
  name: string;
  nameEn: string;
  // shocks: equity %, ratesBp (parallel shift), creditSpreadBp, fxPct, oilPct
  eq: number; rates: number; credit: number; fx: number; oil: number;
};
const HIST_SCENARIOS: Scenario[] = [
  { id: "blackmonday", name: "1987 黑色星期一", nameEn: "Black Monday", eq: -22, rates: -50, credit: 200, fx: -3, oil: -5 },
  { id: "ltcm", name: "1998 LTCM / 俄债危机", nameEn: "LTCM Crisis", eq: -15, rates: -75, credit: 350, fx: 5, oil: -10 },
  { id: "dotcom", name: "2000 互联网泡沫", nameEn: "Dot-Com Burst", eq: -45, rates: -200, credit: 250, fx: -8, oil: 10 },
  { id: "lehman", name: "2008 雷曼破产", nameEn: "Lehman 2008", eq: -38, rates: -300, credit: 600, fx: -12, oil: -50 },
  { id: "covid", name: "2020 新冠冲击", nameEn: "COVID-19 March 2020", eq: -34, rates: -150, credit: 400, fx: -5, oil: -65 },
  { id: "ukraine", name: "2022 俄乌冲突", nameEn: "Ukraine Invasion", eq: -12, rates: 200, credit: 180, fx: 8, oil: 35 },
];

export const StressTool = () => {
  const [eqExp, setEqExp] = useState(40);     // 股票敞口 (M)
  const [bondExp, setBondExp] = useState(40); // 债券敞口
  const [creditExp, setCreditExp] = useState(15); // 信用债敞口
  const [fxExp, setFxExp] = useState(15);     // FX 敞口
  const [commoExp, setCommoExp] = useState(10); // 大宗商品

  const [bondDur, setBondDur] = useState(6);
  const [creditDur, setCreditDur] = useState(4);

  const [scenarioId, setScenarioId] = useState<string>("lehman");
  const [custom, setCustom] = useState<Scenario>({ id: "custom", name: "自定义", nameEn: "Custom", eq: 0, rates: 0, credit: 0, fx: 0, oil: 0 });
  const [useCustom, setUseCustom] = useState(false);

  const totalGross = eqExp + bondExp + creditExp + fxExp + commoExp;

  const activeSc = useCustom ? custom : (HIST_SCENARIOS.find(s => s.id === scenarioId) || HIST_SCENARIOS[3]);

  const pnl = useMemo(() => {
    const eqPnl = eqExp * (activeSc.eq / 100);
    const bondPnl = bondExp * (-bondDur * activeSc.rates / 10000); // ΔP/P ≈ -D·Δy
    const creditPnl = creditExp * (-creditDur * (activeSc.rates + activeSc.credit) / 10000);
    const fxPnl = fxExp * (activeSc.fx / 100);
    const commoPnl = commoExp * (activeSc.oil / 100);
    const total = eqPnl + bondPnl + creditPnl + fxPnl + commoPnl;
    return {
      total,
      breakdown: [
        { name: "股票", value: +eqPnl.toFixed(2), color: CHART_GOLD },
        { name: "利率债", value: +bondPnl.toFixed(2), color: CHART_TEAL },
        { name: "信用债", value: +creditPnl.toFixed(2), color: CHART_BLUE },
        { name: "FX", value: +fxPnl.toFixed(2), color: "hsl(280, 60%, 60%)" },
        { name: "大宗商品", value: +commoPnl.toFixed(2), color: CHART_RED },
      ],
    };
  }, [eqExp, bondExp, creditExp, fxExp, commoExp, bondDur, creditDur, activeSc]);

  // Run all scenarios for comparison chart
  const allScenarios = useMemo(() => {
    return HIST_SCENARIOS.map(s => {
      const eqPnl = eqExp * (s.eq / 100);
      const bondPnl = bondExp * (-bondDur * s.rates / 10000);
      const creditPnl = creditExp * (-creditDur * (s.rates + s.credit) / 10000);
      const fxPnl = fxExp * (s.fx / 100);
      const commoPnl = commoExp * (s.oil / 100);
      return {
        name: s.name,
        total: +(eqPnl + bondPnl + creditPnl + fxPnl + commoPnl).toFixed(2),
      };
    });
  }, [eqExp, bondExp, creditExp, fxExp, commoExp, bondDur, creditDur]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "60/40 组合", description: "股 60M / 债 40M", apply: () => { setEqExp(60); setBondExp(40); setCreditExp(0); setFxExp(0); setCommoExp(0); } },
        { name: "全天候", description: "Bridgewater 风格", apply: () => { setEqExp(30); setBondExp(40); setCreditExp(15); setFxExp(0); setCommoExp(15); } },
        { name: "新兴市场债", description: "高信用 / FX 敞口", apply: () => { setEqExp(10); setBondExp(20); setCreditExp(40); setFxExp(25); setCommoExp(5); setCreditDur(5); } },
        { name: "对冲基金宏观", description: "杠杆均衡", apply: () => { setEqExp(35); setBondExp(25); setCreditExp(15); setFxExp(15); setCommoExp(10); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">组合敞口 (M)</p>
          <Slider label="股票" value={eqExp} min={0} max={100} step={1} onChange={setEqExp} />
          <Slider label="利率债 (无信用)" value={bondExp} min={0} max={100} step={1} onChange={setBondExp} />
          <Slider label="信用债" value={creditExp} min={0} max={100} step={1} onChange={setCreditExp} />
          <Slider label="FX 敞口" value={fxExp} min={0} max={100} step={1} onChange={setFxExp} />
          <Slider label="大宗商品" value={commoExp} min={0} max={100} step={1} onChange={setCommoExp} />
          <Slider label="利率债久期" value={bondDur} min={0.5} max={15} step={0.5} onChange={setBondDur} />
          <Slider label="信用债久期" value={creditDur} min={0.5} max={15} step={0.5} onChange={setCreditDur} />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">情景选择</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setUseCustom(false)}
              className={"text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
                (!useCustom ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground")}>
              历史情景
            </button>
            <button onClick={() => setUseCustom(true)}
              className={"text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
                (useCustom ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground")}>
              自定义假设
            </button>
          </div>

          {!useCustom ? (
            <div className="grid grid-cols-2 gap-2">
              {HIST_SCENARIOS.map(s => (
                <button key={s.id} onClick={() => setScenarioId(s.id)}
                  className={"text-left text-xs px-3 py-2 rounded border transition-colors " +
                    (scenarioId === s.id ? "border-gold bg-gold/10" : "border-border hover:border-gold/40")}>
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{s.nameEn}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                    股 {s.eq}% · 率 {s.rates >= 0 ? "+" : ""}{s.rates}bp · 信用 +{s.credit}bp
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Slider label="股票冲击 %" value={custom.eq} min={-60} max={30} step={1} onChange={(v) => setCustom({ ...custom, eq: v })} />
              <Slider label="利率平移 bp" value={custom.rates} min={-400} max={400} step={5} onChange={(v) => setCustom({ ...custom, rates: v })} />
              <Slider label="信用利差 bp" value={custom.credit} min={0} max={800} step={10} onChange={(v) => setCustom({ ...custom, credit: v })} />
              <Slider label="FX 冲击 %" value={custom.fx} min={-20} max={20} step={1} onChange={(v) => setCustom({ ...custom, fx: v })} />
              <Slider label="大宗商品 %" value={custom.oil} min={-80} max={80} step={1} onChange={(v) => setCustom({ ...custom, oil: v })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Stat label="总敞口" value={`${totalGross.toFixed(0)} M`} />
            <Stat label="情景 P&L" value={`${pnl.total >= 0 ? "+" : ""}${pnl.total.toFixed(2)} M`}
              color={pnl.total >= 0 ? CHART_TEAL : CHART_RED}
              sub={`${(pnl.total / Math.max(totalGross, 1) * 100).toFixed(1)}% of GMV`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">P&L 分解 — {activeSc.name}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnl.breakdown} layout="vertical">
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis type="number" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <ReferenceLine x={0} stroke={CHART_TEXT} />
                <Bar dataKey="value" name="P&L (M)">
                  {pnl.breakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= 0 ? CHART_TEAL : CHART_RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">所有历史情景对比</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allScenarios} layout="vertical">
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis type="number" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <ReferenceLine x={0} stroke={CHART_TEXT} />
                <Bar dataKey="total" name="P&L (M)">
                  {allScenarios.map((entry, i) => (
                    <Cell key={i} fill={entry.total >= 0 ? CHART_TEAL : CHART_RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">方法学：</span>债券 P&L 用 ΔP/P ≈ -D·Δy（一阶久期近似）；信用债同时承受利率与信用利差冲击。</p>
        <p>Basel III FRTB 与 CCAR 监管均要求银行进行历史 + 假设双轨压力测试，本工具复现核心思路。</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   Main module
   ════════════════════════════════════════════════════════════ */
type ToolId = "merton" | "copula" | "stress";

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "merton", name: "Merton 信用风险", nameEn: "Merton Structural Credit Risk Model",
    formula: String.raw`E_0 = V_0\,\Phi(d_1) - D\,e^{-rT}\Phi(d_2),\qquad \mathrm{DD} = \dfrac{\ln(V_0/D) + (\mu - \tfrac{1}{2}\sigma_V^2)T}{\sigma_V\sqrt{T}},\qquad \mathrm{PD} = \Phi(-\mathrm{DD})`,
    component: MertonTool,
  },
  {
    id: "copula", name: "Copula 相依结构", nameEn: "Gaussian & Student-t Copula Dependence",
    formula: String.raw`F(x,y) = C\bigl(F_1(x),\, F_2(y)\bigr),\qquad \lambda_U = \lim_{q\to 1^-}\!\Pr(U>q\mid V>q),\qquad \tau = \tfrac{2}{\pi}\arcsin\rho`,
    component: CopulaTool,
  },
  {
    id: "stress", name: "压力测试", nameEn: "Stress Testing — Historical & Hypothetical Scenarios",
    formula: String.raw`\mathrm{P\&L} = \sum_i w_i \cdot \Delta_i,\qquad \Delta_{\text{bond}} \approx -D_i\,\Delta y_i,\qquad \Delta_{\text{equity}} = r_{\text{shock}}`,
    component: StressTool,
  },
];

const RiskTools = () => {
  const { t } = useTranslation();
  const [tool, setTool] = useState<ToolId>("merton");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => {
    if (s?.tool) setTool(s.tool);
  }, []);
  useSharedState<{ tool: ToolId }>("risk", apply);

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
            {t("sections.risk.tag")}
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            {t("sections.risk.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            Merton 信用违约 · Copula 尾相依 · Basel/CCAR 压力测试
          </p>
        </motion.div>

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
          <div className="flex flex-wrap justify-end gap-2 mb-4">
            <HistoryDrawer
              storageKey="risk"
              currentState={{ tool }}
              onApply={(s: any) => { if (s?.tool) setTool(s.tool); }}
              summarize={(s: any) => `工具: ${s.tool}`}
            />
            <ShareExportToolbar
              storageKey="risk"
              anchorId="risk"
              state={{ tool }}
              captureRef={captureRef}
              filename={`risk-${tool}`}
            />
          </div>

          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">
              {Active.nameEn}
            </p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock math={Active.formula} />
            </div>
          </div>

          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default RiskTools;
