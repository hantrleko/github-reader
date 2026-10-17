import type { TFunction } from "i18next";
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
import { useToolTab } from "@/lib/useToolTab";
import CategorizedToolNav, { type ToolCategory } from "@/components/common/CategorizedToolNav";
import { ESBacktestTool } from "./risk/ESBacktestTool";
import { CVAXVATool, CreditCopulaTool } from "./risk/V26Tools";
import { VaRTool } from "./risk/VaRTool";
import { EvtPotTool } from "./risk/EvtPotTool";
import {
  SystemicRiskTool, LiquidityVaRTool, FRTBTool,
  OpRiskLDATool, ReverseStressTool, ConcentrationTool,
} from "./risk/V43Tools";
import {
  CoherenceTool, VolFhsTool, IrbCapitalTool, MigrationCreditMetricsTool,
  FundingSpiralTool, BaselStackTool, ModelRiskTool, ResilienceTool,
} from "./risk/V58Tools";

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
    let timeIndex = a;
    timeIndex = Math.imul(timeIndex ^ (timeIndex >>> 15), timeIndex | 1);
    timeIndex ^= timeIndex + Math.imul(timeIndex ^ (timeIndex >>> 7), timeIndex | 61);
    return ((timeIndex ^ (timeIndex >>> 14)) >>> 0) / 4294967296;
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
  const timeIndex = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * timeIndex + a4) * timeIndex) + a3) * timeIndex + a2) * timeIndex + a1) * timeIndex * Math.exp(-ax * ax);
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
  const { t } = useTranslation();
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
        { name: t("labs.risk.ui.text1", { defaultValue: "投资级" }), description: t("labs.risk.ui.text2", { defaultValue: "低杠杆 / 低 PD" }), apply: () => { setV(150); setD(80); setSigmaV(0.20); setMuV(0.08); setR(0.04); setT(1); } },
        { name: t("labs.risk.ui.text3", { defaultValue: "高收益债" }), description: t("labs.risk.ui.text4", { defaultValue: "BB / B 评级" }), apply: () => { setV(120); setD(100); setSigmaV(0.30); setMuV(0.07); } },
        { name: t("labs.risk.ui.text5", { defaultValue: "濒临违约" }), description: t("labs.risk.ui.text6", { defaultValue: "V≈D, 高波动" }), apply: () => { setV(105); setD(100); setSigmaV(0.45); setMuV(0.05); } },
        { name: t("labs.risk.ui.text7", { defaultValue: "已资不抵债" }), description: t("labs.risk.ui.text8", { defaultValue: "V<D, 极高 PD" }), apply: () => { setV(85); setD(100); setSigmaV(0.40); setMuV(0.05); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.risk.ui.text9", { defaultValue: "资产价值 V₀" })} sub="Asset value" value={V} min={50} max={250} step={1} onChange={setV} />
          <Slider label={t("labs.risk.ui.text10", { defaultValue: "债务面值 D" })} sub="Debt face value" value={D} min={20} max={200} step={1} onChange={setD} />
          <Slider label={t("labs.risk.ui.text11", { defaultValue: "资产波动率 σᵥ" })} sub="Asset volatility" value={sigmaV} min={0.05} max={0.8} step={0.01} onChange={setSigmaV} />
          <Slider label={t("labs.risk.ui.text12", { defaultValue: "无风险利率 r" })} sub="Risk-free rate" value={r} min={0} max={0.15} step={0.005} onChange={setR} />
          <Slider label={t("labs.risk.ui.text13", { defaultValue: "资产期望收益 μᵥ" })} sub={t("labs.risk.ui.text14", { defaultValue: "KMV 真实测度" })} value={muV} min={0} max={0.20} step={0.005} onChange={setMuV} />
          <Slider label={t("labs.risk.ui.text15", { defaultValue: "期限 T (年)" })} value={T} min={0.25} max={5} step={0.25} onChange={setT} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.risk.ui.text16", { defaultValue: "违约距离 DD" })} value={result.dd.toFixed(3)} sub={t("labs.risk.ui.text17", { defaultValue: "KMV (μ 测度)" })} />
            <Stat label={t("labs.risk.ui.text18", { defaultValue: "实测 PD" })} value={`${(result.pdReal * 100).toFixed(2)}%`} color={CHART_RED} sub="N(-DD)" />
            <Stat label={t("labs.risk.ui.text19", { defaultValue: "风险中性 PD" })} value={`${(result.pdRN * 100).toFixed(2)}%`} color={CHART_RED} sub="N(-d₂)" />
            <Stat label={t("labs.risk.ui.text20", { defaultValue: "股权价值 E" })} value={result.E.toFixed(2)} color={CHART_GOLD} sub={t("labs.risk.ui.text21", { defaultValue: "看涨期权价值" })} />
            <Stat label={t("labs.risk.ui.text22", { defaultValue: "信用利差" })} value={`${result.spread.toFixed(1)} bp`} color={CHART_GOLD} sub="y - r" />
            <Stat label={t("labs.risk.ui.text23", { defaultValue: "LGD (违约损失率)" })} value={`${(result.lgd * 100).toFixed(1)}%`} sub={t("labs.risk.ui.text24", { defaultValue: "回收率 {{value0}}%", value0: (result.rr * 100).toFixed(1) })} />
          </div>

          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.risk.ui.text25", { defaultValue: "解读：" })}</span>{t("labs.risk.ui.text26", { defaultValue: "股权可视为以资产 V 为标的、行权价 D 的欧式看涨期权 (Merton 1974)。" })}</p>
            <p>{t("labs.risk.ui.text27", { defaultValue: "违约 ↔ V_T &lt; D。DD 越大越安全；KMV 用真实漂移 μ 而非 r。" })}</p>
            <p>{t("labs.risk.ui.text28", { defaultValue: "风险中性 PD 用于债券/CDS 定价；实测 PD 用于风险管理与评级映射。" })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.ui.text29", { defaultValue: "资产价值分布 V_T (lognormal)" })}</h4>
          <p className="text-[10px] font-mono text-muted-foreground mb-2">{t("labs.risk.ui.text30", { defaultValue: "红色阴影 = 违约区域 V_T &lt; D" })}</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={distData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="Vt" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Area type="monotone" dataKey="pdf" stroke={CHART_GOLD} strokeWidth={2} fill={CHART_GOLD} fillOpacity={0.18} name={t("labs.risk.ui.text31", { defaultValue: "资产分布" })} />
                <Area type="monotone" dataKey="defaultZone" stroke="none" fill={CHART_RED} fillOpacity={0.45} name={t("labs.risk.ui.text32", { defaultValue: "违约区域" })} />
                <ReferenceLine x={D} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: `D=${D}`, fill: CHART_RED, fontSize: 10 }} />
                <ReferenceLine x={V} stroke={CHART_TEAL} strokeDasharray="4 4" label={{ value: `V₀=${V}`, fill: CHART_TEAL, fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.ui.text33", { defaultValue: "PD 与信用利差 vs 杠杆 D/V" })}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={leverageCurve}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="lev" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke={CHART_RED} tick={{ fontSize: 10 }} label={{ value: "PD %", angle: -90, position: "insideLeft", fill: CHART_RED, fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke={CHART_GOLD} tick={{ fontSize: 10 }} label={{ value: "Spread bp", angle: 90, position: "insideRight", fill: CHART_GOLD, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="pd" name={t("labs.risk.ui.text34", { defaultValue: "风险中性 PD %" })} stroke={CHART_RED} strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="spread" name={t("labs.risk.ui.text35", { defaultValue: "信用利差 bp" })} stroke={CHART_GOLD} strokeWidth={2} dot={false} />
                <ReferenceLine x={+(D / V).toFixed(2)} yAxisId="left" stroke={CHART_TEAL} strokeDasharray="3 3" label={{ value: t("labs.risk.ui.text36", { defaultValue: "当前" }), fill: CHART_TEAL, fontSize: 10 }} />
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
  const { t } = useTranslation();
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
        { name: t("labs.risk.ui.text37", { defaultValue: "高斯 ρ=0.7" }), description: t("labs.risk.ui.text38", { defaultValue: "无尾相依" }), apply: () => { setFamily("gaussian"); setRho(0.7); setW1(0.5); setVarAlpha(0.99); } },
        { name: "t-Copula df=4", description: t("labs.risk.ui.text39", { defaultValue: "强尾相依 (危机模式)" }), apply: () => { setFamily("t"); setRho(0.7); setDf(4); setVarAlpha(0.99); } },
        { name: t("labs.risk.ui.text40", { defaultValue: "极端 t df=2.5" }), description: t("labs.risk.ui.text41", { defaultValue: "肥尾极端" }), apply: () => { setFamily("t"); setRho(0.6); setDf(3); } },
        { name: t("labs.risk.ui.text42", { defaultValue: "几乎独立" }), description: t("labs.risk.ui.text43", { defaultValue: "ρ=0.1, 分散有效" }), apply: () => { setFamily("gaussian"); setRho(0.1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{t("labs.risk.ui.text44", { defaultValue: "Copula 族：" })}</span>
            {([
              { id: "gaussian", label: "Gaussian", desc: t("labs.risk.ui.text45", { defaultValue: "无尾相依" }) },
              { id: "t", label: "Student-t", desc: t("labs.risk.ui.text46", { defaultValue: "对称尾相依" }) },
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
          <Slider label={t("labs.risk.ui.text47", { defaultValue: "相关系数 ρ" })} value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} />
          {family === "t" && (
            <Slider label={t("labs.risk.ui.text48", { defaultValue: "自由度 ν" })} sub={t("labs.risk.ui.text49", { defaultValue: "越小尾相依越强" })} value={df} min={2.5} max={30} step={0.5} onChange={setDf} />
          )}
          <Slider label={t("labs.risk.ui.text50", { defaultValue: "样本量 n" })} value={n} min={500} max={5000} step={500} onChange={setN} />
          <Slider label={t("labs.risk.ui.text51", { defaultValue: "随机种子" })} value={seed} min={1} max={999} step={1} onChange={setSeed} />
          <Slider label={t("labs.risk.ui.text52", { defaultValue: "组合权重 w₁" })} sub={`w₂ = ${(1 - w1).toFixed(2)}`} value={w1} min={0} max={1} step={0.05} onChange={setW1} />
          <Slider label={t("labs.risk.ui.text53", { defaultValue: "VaR / ES 置信度" })} value={varAlpha} min={0.90} max={0.999} step={0.005} onChange={setVarAlpha} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.risk.ui.text54", { defaultValue: "Kendall τ̂ (经验)" })} value={sim.tau.toFixed(3)} />
            <Stat label={t("labs.risk.ui.text55", { defaultValue: "理论 τ" })} value={((2 / Math.PI) * Math.asin(rho)).toFixed(3)} sub="(2/π)·arcsin(ρ)" />
            <Stat label={t("labs.risk.ui.text56", { defaultValue: "上尾相依 λᵤ (经验)" })} value={sim.lambdaU.toFixed(3)} color={CHART_RED} sub="P(U>0.95|V>0.95)" />
            <Stat label={t("labs.risk.ui.text57", { defaultValue: "下尾相依 λₗ (经验)" })} value={sim.lambdaL.toFixed(3)} color={CHART_RED} sub="P(U<0.05|V<0.05)" />
            <Stat label={t("labs.risk.ui.text58", { defaultValue: "组合 VaR_{{{value0}}%}", value0: (varAlpha * 100).toFixed(1) })} value={sim.VaR.toFixed(3)} color={CHART_GOLD} />
            <Stat label={t("labs.risk.ui.text59", { defaultValue: "期望损失 ES" })} value={sim.ES.toFixed(3)} color={CHART_GOLD} sub={t("labs.risk.ui.text60", { defaultValue: "尾部均值" })} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.risk.ui.text61", { defaultValue: "Sklar 定理：" })}</span>{t("labs.risk.ui.text62", { defaultValue: "F(x,y) = C(F₁(x), F₂(y))。Copula 把" })}<strong>{t("labs.risk.ui.text63", { defaultValue: "边际分布" })}</strong>{t("labs.risk.ui.text64", { defaultValue: "与" })}<strong>{t("labs.risk.ui.text65", { defaultValue: "相依结构" })}</strong>{t("labs.risk.ui.text66", { defaultValue: "解耦。" })}</p>
            <p>{t("labs.risk.ui.text67", { defaultValue: "高斯 Copula 的 λᵤ = λₗ = 0；t-Copula 即使在 ρ 相同时也表现出强尾相依（2008 危机经典教训）。" })}</p>
            <p>{family === "t" && t("labs.risk.ui.text68", { defaultValue: "理论尾相依 λ ≈ {{value0}}（t-Copula 公式）", value0: sim.lambdaTheo.toFixed(3) })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.ui.text69", { defaultValue: "Copula 散点 (U, V) ∈ [0,1]²" })}</h4>
          <p className="text-[10px] font-mono text-muted-foreground mb-2">{t("labs.risk.ui.text70", { defaultValue: "边际已转为均匀分布；观察四角的聚集程度" })}</p>
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
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.ui.text71", { defaultValue: "组合损失分布 (金色 = 尾部超过 VaR)" })}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sim.hist}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="mid" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Bar dataKey="cnt" fill={CHART_TEAL} fillOpacity={0.6} name={t("labs.risk.ui.text72", { defaultValue: "损失频次" })} />
                <Bar dataKey="tail" fill={CHART_GOLD} name={t("labs.risk.ui.text73", { defaultValue: "尾部 ≥ VaR" })} />
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
const getHIST_SCENARIOS = (t: TFunction) => {
const HIST_SCENARIOS: Scenario[] = [
  { id: "blackmonday", name: t("labs.risk.ui.text74", { defaultValue: "1987 黑色星期一" }), nameEn: "Black Monday", eq: -22, rates: -50, credit: 200, fx: -3, oil: -5 },
  { id: "ltcm", name: t("labs.risk.ui.text75", { defaultValue: "1998 LTCM / 俄债危机" }), nameEn: "LTCM Crisis", eq: -15, rates: -75, credit: 350, fx: 5, oil: -10 },
  { id: "dotcom", name: t("labs.risk.ui.text76", { defaultValue: "2000 互联网泡沫" }), nameEn: "Dot-Com Burst", eq: -45, rates: -200, credit: 250, fx: -8, oil: 10 },
  { id: "lehman", name: t("labs.risk.ui.text77", { defaultValue: "2008 雷曼破产" }), nameEn: "Lehman 2008", eq: -38, rates: -300, credit: 600, fx: -12, oil: -50 },
  { id: "covid", name: t("labs.risk.ui.text78", { defaultValue: "2020 新冠冲击" }), nameEn: "COVID-19 March 2020", eq: -34, rates: -150, credit: 400, fx: -5, oil: -65 },
  { id: "ukraine", name: t("labs.risk.ui.text79", { defaultValue: "2022 俄乌冲突" }), nameEn: "Ukraine Invasion", eq: -12, rates: 200, credit: 180, fx: 8, oil: 35 },
];
return HIST_SCENARIOS;
};

export const StressTool = () => {
  const { t } = useTranslation();
  const HIST_SCENARIOS = getHIST_SCENARIOS(t);
  const [eqExp, setEqExp] = useState(40);     // 股票敞口 (M)
  const [bondExp, setBondExp] = useState(40); // 债券敞口
  const [creditExp, setCreditExp] = useState(15); // 信用债敞口
  const [fxExp, setFxExp] = useState(15);     // FX 敞口
  const [commoExp, setCommoExp] = useState(10); // 大宗商品

  const [bondDur, setBondDur] = useState(6);
  const [creditDur, setCreditDur] = useState(4);

  const [scenarioId, setScenarioId] = useState<string>("lehman");
  const [custom, setCustom] = useState<Scenario>({ id: "custom", name: t("labs.risk.ui.text80", { defaultValue: "自定义" }), nameEn: "Custom", eq: 0, rates: 0, credit: 0, fx: 0, oil: 0 });
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
        { name: t("labs.risk.ui.text81", { defaultValue: "股票" }), value: +eqPnl.toFixed(2), color: CHART_GOLD },
        { name: t("labs.risk.ui.text82", { defaultValue: "利率债" }), value: +bondPnl.toFixed(2), color: CHART_TEAL },
        { name: t("labs.risk.ui.text83", { defaultValue: "信用债" }), value: +creditPnl.toFixed(2), color: CHART_BLUE },
        { name: "FX", value: +fxPnl.toFixed(2), color: "hsl(280, 60%, 60%)" },
        { name: t("labs.risk.ui.text84", { defaultValue: "大宗商品" }), value: +commoPnl.toFixed(2), color: CHART_RED },
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
        { name: t("labs.risk.ui.text85", { defaultValue: "60/40 组合" }), description: t("labs.risk.ui.text86", { defaultValue: "股 60M / 债 40M" }), apply: () => { setEqExp(60); setBondExp(40); setCreditExp(0); setFxExp(0); setCommoExp(0); } },
        { name: t("labs.risk.ui.text87", { defaultValue: "全天候" }), description: t("labs.risk.ui.text88", { defaultValue: "Bridgewater 风格" }), apply: () => { setEqExp(30); setBondExp(40); setCreditExp(15); setFxExp(0); setCommoExp(15); } },
        { name: t("labs.risk.ui.text89", { defaultValue: "新兴市场债" }), description: t("labs.risk.ui.text90", { defaultValue: "高信用 / FX 敞口" }), apply: () => { setEqExp(10); setBondExp(20); setCreditExp(40); setFxExp(25); setCommoExp(5); setCreditDur(5); } },
        { name: t("labs.risk.ui.text91", { defaultValue: "对冲基金宏观" }), description: t("labs.risk.ui.text92", { defaultValue: "杠杆均衡" }), apply: () => { setEqExp(35); setBondExp(25); setCreditExp(15); setFxExp(15); setCommoExp(10); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.risk.ui.text93", { defaultValue: "组合敞口 (M)" })}</p>
          <Slider label={t("labs.risk.ui.text94", { defaultValue: "股票" })} value={eqExp} min={0} max={100} step={1} onChange={setEqExp} />
          <Slider label={t("labs.risk.ui.text95", { defaultValue: "利率债 (无信用)" })} value={bondExp} min={0} max={100} step={1} onChange={setBondExp} />
          <Slider label={t("labs.risk.ui.text96", { defaultValue: "信用债" })} value={creditExp} min={0} max={100} step={1} onChange={setCreditExp} />
          <Slider label={t("labs.risk.ui.text97", { defaultValue: "FX 敞口" })} value={fxExp} min={0} max={100} step={1} onChange={setFxExp} />
          <Slider label={t("labs.risk.ui.text98", { defaultValue: "大宗商品" })} value={commoExp} min={0} max={100} step={1} onChange={setCommoExp} />
          <Slider label={t("labs.risk.ui.text99", { defaultValue: "利率债久期" })} value={bondDur} min={0.5} max={15} step={0.5} onChange={setBondDur} />
          <Slider label={t("labs.risk.ui.text100", { defaultValue: "信用债久期" })} value={creditDur} min={0.5} max={15} step={0.5} onChange={setCreditDur} />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.risk.ui.text101", { defaultValue: "情景选择" })}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setUseCustom(false)}
              className={"text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
                (!useCustom ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground")}>
              {t("labs.risk.ui.text102", { defaultValue: "历史情景" })}
            </button>
            <button onClick={() => setUseCustom(true)}
              className={"text-xs px-3 py-1.5 rounded border transition-colors font-mono " +
                (useCustom ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground")}>
              {t("labs.risk.ui.text103", { defaultValue: "自定义假设" })}
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
                    {t("labs.risk.ui.text104", { defaultValue: "股" })} {s.eq}{t("labs.risk.ui.text105", { defaultValue: "% · 率" })} {s.rates >= 0 ? "+" : ""}{s.rates}{t("labs.risk.ui.text106", { defaultValue: "bp · 信用 +" })}{s.credit}bp
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Slider label={t("labs.risk.ui.text107", { defaultValue: "股票冲击 %" })} value={custom.eq} min={-60} max={30} step={1} onChange={(v) => setCustom({ ...custom, eq: v })} />
              <Slider label={t("labs.risk.ui.text108", { defaultValue: "利率平移 bp" })} value={custom.rates} min={-400} max={400} step={5} onChange={(v) => setCustom({ ...custom, rates: v })} />
              <Slider label={t("labs.risk.ui.text109", { defaultValue: "信用利差 bp" })} value={custom.credit} min={0} max={800} step={10} onChange={(v) => setCustom({ ...custom, credit: v })} />
              <Slider label={t("labs.risk.ui.text110", { defaultValue: "FX 冲击 %" })} value={custom.fx} min={-20} max={20} step={1} onChange={(v) => setCustom({ ...custom, fx: v })} />
              <Slider label={t("labs.risk.ui.text111", { defaultValue: "大宗商品 %" })} value={custom.oil} min={-80} max={80} step={1} onChange={(v) => setCustom({ ...custom, oil: v })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Stat label={t("labs.risk.ui.text112", { defaultValue: "总敞口" })} value={`${totalGross.toFixed(0)} M`} />
            <Stat label={t("labs.risk.ui.text113", { defaultValue: "情景 P&L" })} value={`${pnl.total >= 0 ? "+" : ""}${pnl.total.toFixed(2)} M`}
              color={pnl.total >= 0 ? CHART_TEAL : CHART_RED}
              sub={`${(pnl.total / Math.max(totalGross, 1) * 100).toFixed(1)}% of GMV`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.ui.text114", { defaultValue: "P&L 分解 —" })} {activeSc.name}</h4>
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
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.ui.text115", { defaultValue: "所有历史情景对比" })}</h4>
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
        <p><span className="text-gold">{t("labs.risk.ui.text116", { defaultValue: "方法学：" })}</span>{t("labs.risk.ui.text117", { defaultValue: "债券 P&L 用 ΔP/P ≈ -D·Δy（一阶久期近似）；信用债同时承受利率与信用利差冲击。" })}</p>
        <p>{t("labs.risk.ui.text118", { defaultValue: "Basel III FRTB 与 CCAR 监管均要求银行进行历史 + 假设双轨压力测试，本工具复现核心思路。" })}</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   Main module
   ════════════════════════════════════════════════════════════ */
type ToolId =
  | "var" | "merton" | "copula" | "evt" | "esback" | "stress" | "cva" | "credit_copula"
  | "systemic" | "lvar" | "frtb" | "opvar" | "reverse_stress" | "concentration"
  | "coherence" | "vol_fhs" | "irb" | "migration" | "spiral" | "basel" | "model_risk" | "resilience";

const getTOOLS = (t: TFunction) => {
  
const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; python: string; component: React.FC }[] = [
  {
    id: "var", name: t("labs.risk.ui.text119", { defaultValue: "VaR 三法对比" }), nameEn: "Value-at-Risk — Parametric vs Historical vs Monte Carlo",
    formula: String.raw`\mathrm{VaR}_\alpha^{\text{param}} = V(z_\alpha\sigma_h - \mu_h),\quad \mathrm{VaR}_\alpha^{\text{hist/MC}} = Q_\alpha(L),\quad \mathrm{ES}_\alpha = \mathbb{E}[L\mid L\ge \mathrm{VaR}_\alpha]`,
    python: `import numpy as np
from scipy.stats import norm

def var_parametric(V, mu_h, sig_h, alpha=0.99):
    z = norm.ppf(alpha)
    return V * (z * sig_h - mu_h)

def var_historical(losses, alpha=0.99):
    var = np.quantile(losses, alpha)
    es = losses[losses >= var].mean()
    return var, es

def var_monte_carlo(V, mu_h, sig_h, alpha=0.99, n=100000, seed=42):
    rng = np.random.default_rng(seed)
    losses = -V * (mu_h + sig_h * rng.standard_normal(n))
    var = np.quantile(losses, alpha)
    return var, losses[losses >= var].mean()`,
    component: VaRTool,
  },
  {
    id: "merton", name: t("labs.risk.ui.text120", { defaultValue: "Merton 信用风险" }), nameEn: "Merton Structural Credit Risk Model",
    formula: String.raw`E_0 = V_0\,\Phi(d_1) - D\,e^{-rT}\Phi(d_2),\qquad \mathrm{DD} = \dfrac{\ln(V_0/D) + (\mu - \tfrac{1}{2}\sigma_V^2)T}{\sigma_V\sqrt{T}},\qquad \mathrm{PD} = \Phi(-\mathrm{DD})`,
    python: `import numpy as np
from scipy.stats import norm

def merton_pd(V0, D, r, mu, sigma_V, T):
    """Merton structural model — equity as call on assets."""
    d1 = (np.log(V0 / D) + (r + 0.5 * sigma_V ** 2) * T) / (sigma_V * np.sqrt(T))
    d2 = d1 - sigma_V * np.sqrt(T)
    equity = V0 * norm.cdf(d1) - D * np.exp(-r * T) * norm.cdf(d2)
    DD = (np.log(V0 / D) + (mu - 0.5 * sigma_V ** 2) * T) / (sigma_V * np.sqrt(T))
    PD = norm.cdf(-DD)
    return equity, DD, PD`,
    component: MertonTool,
  },
  {
    id: "copula", name: t("labs.risk.ui.text121", { defaultValue: "Copula 相依结构" }), nameEn: "Gaussian & Student-t Copula Dependence",
    formula: String.raw`F(x,y) = C\bigl(F_1(x),\, F_2(y)\bigr),\qquad \lambda_U = \lim_{q\to 1^-}\!\Pr(U>q\mid V>q),\qquad \tau = \tfrac{2}{\pi}\arcsin\rho`,
    python: `import numpy as np
from scipy.stats import norm, t as student_t

def gaussian_copula_sample(rho, n=10000, seed=42):
    rng = np.random.default_rng(seed)
    L = np.linalg.cholesky([[1, rho], [rho, 1]])
    z = rng.standard_normal((n, 2)) @ L.T
    u = norm.cdf(z)            # uniform marginals
    return u

def t_copula_sample(rho, df=4, n=10000, seed=42):
    rng = np.random.default_rng(seed)
    L = np.linalg.cholesky([[1, rho], [rho, 1]])
    z = rng.standard_normal((n, 2)) @ L.T
    chi2 = rng.chisquare(df, size=n) / df
    t = z / np.sqrt(chi2)[:, None]
    return student_t.cdf(t, df)`,
    component: CopulaTool,
  },
  {
    id: "evt", name: t("labs.risk.ui.text122", { defaultValue: "极值理论 (EVT/POT)" }), nameEn: "Extreme Value Theory — Peaks-over-Threshold & Generalized Pareto Tail",
    formula: String.raw`P(X-u \le y \mid X>u) \to G_{\xi,\beta}(y) = 1 - \bigl(1+\tfrac{\xi y}{\beta}\bigr)^{-1/\xi},\quad \mathrm{VaR}_\alpha = u + \tfrac{\beta}{\xi}\Bigl[\bigl(\tfrac{n}{N_u}(1-\alpha)\bigr)^{-\xi}-1\Bigr]`,
    python: `import numpy as np
from scipy.stats import genpareto

def pot_var_es(losses, u_pct=0.95, alpha=0.999):
    """Peaks-over-threshold VaR/ES via GPD fit (MLE)."""
    losses = np.asarray(losses)
    u = np.quantile(losses, u_pct)
    exc = losses[losses > u] - u
    n, Nu = len(losses), len(exc)
    xi, _, beta = genpareto.fit(exc, floc=0)
    ratio = (n / Nu) * (1 - alpha)
    var = u + (beta / xi) * (ratio ** (-xi) - 1)
    es = (var + beta - xi * u) / (1 - xi)
    return xi, beta, var, es`,
    component: EvtPotTool,
  },
  {
    id: "esback", name: t("labs.risk.ui.text123", { defaultValue: "ES + VaR 回测" }), nameEn: "Expected Shortfall & VaR Backtesting (Kupiec / Christoffersen)",
    formula: String.raw`\mathrm{VaR}_\alpha = -F_{L}^{-1}(1-\alpha),\quad \mathrm{ES}_\alpha = \mathbb{E}[L\mid L>\mathrm{VaR}_\alpha],\qquad \mathrm{LR}_{\mathrm{uc}} = -2\ln\!\dfrac{p^{x}(1-p)^{N-x}}{\hat p^{x}(1-\hat p)^{N-x}} \sim \chi^{2}_{1}`,
    python: `import numpy as np
from scipy.stats import norm, chi2

def kupiec_pof(loss, var, alpha):
    """Unconditional coverage LR test."""
    N = len(loss); x = int(np.sum(loss > var))
    p = 1 - alpha
    if x in (0, N):
        LR = -2 * (x*np.log(p) + (N-x)*np.log(1-p))
    else:
        ph = x / N
        LR = -2 * (x*np.log(p) + (N-x)*np.log(1-p)
                  - x*np.log(ph) - (N-x)*np.log(1-ph))
    return LR, 1 - chi2.cdf(LR, 1)

def expected_shortfall(loss, alpha):
    var = np.quantile(loss, alpha)
    return loss[loss > var].mean()`,
    component: ESBacktestTool,
  },
  {
    id: "stress", name: t("labs.risk.ui.text124", { defaultValue: "压力测试" }), nameEn: "Stress Testing — Historical & Hypothetical Scenarios",
    formula: String.raw`\mathrm{P\&L} = \sum_i w_i \cdot \Delta_i,\qquad \Delta_{\text{bond}} \approx -D_i\,\Delta y_i,\qquad \Delta_{\text{equity}} = r_{\text{shock}}`,
    python: `import numpy as np

def stress_pnl(positions, scenario):
    """Apply a macro scenario to a portfolio of equity / bond / FX / oil."""
    pnl = 0.0
    for p in positions:
        if p["type"] == "equity":
            pnl += p["notional"] * scenario["eq"] / 100
        elif p["type"] == "bond":
            # First-order duration approximation
            pnl += -p["notional"] * p["duration"] * scenario["rates"] / 10000
            # Credit spread shock
            pnl += -p["notional"] * p["spread_dur"] * scenario["credit"] / 10000
        elif p["type"] == "fx":
            pnl += p["notional"] * scenario["fx"] / 100
        elif p["type"] == "oil":
            pnl += p["notional"] * scenario["oil"] / 100
    return pnl`,
    component: StressTool,
  },
  {
    id: "cva", name: "CVA / XVA + WWR", nameEn: "Credit Valuation Adjustment — Bilateral XVA & Wrong-Way Risk",
    formula: String.raw`\mathrm{CVA} = \mathrm{LGD}\!\int_0^T\! \mathrm{EPE}(t)\, d\mathrm{PD}_C(t)\, D(0,t),\qquad \mathrm{BCVA} = \mathrm{CVA} - \mathrm{DVA}`,
    python: `import numpy as np

def cva_swap(epe, dpd_c, disc, lgd=0.6):
    """Discrete CVA on a swap: ∑ LGD · EPE(t) · ΔPD_C(t) · D(0,t)."""
    return lgd * np.sum(epe * dpd_c * disc)

def bcva(epe, ene, dpd_c, dpd_b, disc, lgd=0.6):
    cva = lgd * np.sum(epe * dpd_c * disc)
    dva = lgd * np.sum(ene * dpd_b * disc)
    return cva - dva`,
    component: CVAXVATool,
  },
  {
    id: "credit_copula", name: t("labs.risk.ui.text125", { defaultValue: "信用组合 Copula (Vasicek/Li/t)" }), nameEn: "Credit Portfolio Copula — Vasicek / Li with Gaussian vs t Tail",
    formula: String.raw`X_i = \sqrt{\rho}\,M + \sqrt{1-\rho}\,\varepsilon_i,\qquad \mathrm{VaR}_\alpha^{\mathrm{Vasicek}} = n\cdot \mathrm{LGD}\cdot \Phi\!\Bigl(\tfrac{\Phi^{-1}(\mathrm{PD}) + \sqrt{\rho}\,\Phi^{-1}(\alpha)}{\sqrt{1-\rho}}\Bigr)`,
    python: `import numpy as np
from scipy.stats import norm

def vasicek_var(pd, rho, alpha=0.999, lgd=0.6):
    """Basel II IRB / Vasicek large-portfolio VaR (loss rate)."""
    return lgd * norm.cdf((norm.ppf(pd) + np.sqrt(rho)*norm.ppf(alpha)) / np.sqrt(1-rho))

def gaussian_copula_default(n=100, pd=0.03, rho=0.2, n_sim=10000, seed=42):
    rng = np.random.default_rng(seed)
    M = rng.standard_normal(n_sim)
    eps = rng.standard_normal((n_sim, n))
    X = np.sqrt(rho)*M[:,None] + np.sqrt(1-rho)*eps
    return (X <= norm.ppf(pd)).sum(axis=1)  # default count per scenario`,
    component: CreditCopulaTool,
  },
];

// ── V4.3 Risk Reinforcement ──
TOOLS.push(
  {
    id: "systemic", name: t("labs.risk.ui.text126", { defaultValue: "系统性风险 (CoVaR/MES/SRISK)" }),
    nameEn: "Systemic Risk — CoVaR, ΔCoVaR, MES & SRISK",
    formula: String.raw`\mathrm{CoVaR}^{\text{sys}|i}_{\alpha}=a+b\cdot\mathrm{VaR}^{i}_{\alpha},\quad \mathrm{MES}^{i}=\mathbb{E}[R_i\mid R_{\text{sys}}\le\mathrm{VaR}^{\text{sys}}_{\alpha}],\quad \mathrm{SRISK}=k\cdot D-(1-k)(1-\mathrm{LRMES})\cdot E`,
    python: `import numpy as np
from statsmodels.regression.quantile_regression import QuantReg

def covar(r_sys, r_i, alpha=0.05):
    q_i = np.quantile(r_i, alpha)
    mod = QuantReg(r_sys, np.c_[np.ones_like(r_i), r_i]).fit(q=alpha)
    a, b = mod.params
    co = a + b * q_i
    co_med = a + b * np.quantile(r_i, 0.5)
    return co, co - co_med  # CoVaR, ΔCoVaR

def mes_srisk(r_sys, r_i, mkt_cap, debt, k=0.08, alpha=0.05):
    q = np.quantile(r_sys, alpha)
    mes = r_i[r_sys <= q].mean()
    lrmes = 1 - np.exp(18 * mes)
    srisk = k * debt - (1 - k) * (1 - lrmes) * mkt_cap
    return mes, lrmes, srisk`,
    component: SystemicRiskTool,
  },
  {
    id: "lvar", name: t("labs.risk.ui.text127", { defaultValue: "流动性调整 VaR + 最优清算" }),
    nameEn: "Liquidity-Adjusted VaR + Almgren-Chriss Execution",
    formula: String.raw`\mathrm{LVaR}=\mathrm{VaR}+\tfrac12|V|\cdot s,\qquad x_k=X\,\dfrac{\sinh\bigl(\kappa(T-t_k)\bigr)}{\sinh(\kappa T)},\quad \kappa=\sqrt{\lambda\sigma^{2}/\bar{\eta}}`,
    python: `import numpy as np

def lvar(V, sigma, alpha=0.99, spread_bp=15):
    from scipy.stats import norm
    var = V * norm.ppf(alpha) * sigma
    return var + 0.5 * V * spread_bp / 10000

def almgren_chriss(X, T, N, sigma, eta, lam, gamma=0):
    tau = T / N
    eta_bar = eta - 0.5 * gamma * tau
    kappa = np.sqrt(lam * sigma**2 / eta_bar)
    t = np.linspace(0, T, N + 1)
    x = X * np.sinh(kappa * (T - t)) / np.sinh(kappa * T)
    return t, x`,
    component: LiquidityVaRTool,
  },
  {
    id: "frtb", name: t("labs.risk.ui.text128", { defaultValue: "FRTB IMA (ES97.5 + 交通灯)" }),
    nameEn: "FRTB IMA — 97.5% ES with Liquidity-Horizon Scaling & Basel Traffic Light",
    formula: String.raw`\mathrm{ES}_{97.5\%}=\mathbb{E}[L\mid L\ge \mathrm{VaR}_{97.5\%}],\quad \mathrm{ES}_{\text{liq}}=\sqrt{\sum_j \mathrm{ES}_j^{2}\cdot\tfrac{\mathrm{LH}_j-\mathrm{LH}_{j-1}}{10}},\quad \mathrm{K}=m\cdot\mathrm{ES}_{\text{liq}}`,
    python: `import numpy as np

def es_frtb(pnl, alpha=0.975):
    L = -np.asarray(pnl)
    var = np.quantile(L, alpha)
    return L[L >= var].mean()

def lh_scaling(es_by_bucket, lh=[10, 20, 40, 60, 120]):
    diffs = np.diff([10] + list(lh))
    return np.sqrt(sum(e**2 * d / 10 for e, d in zip(es_by_bucket, diffs)))

def traffic_light(exceptions):
    if exceptions <= 4: return "green", 1.5
    if exceptions <= 9: return "yellow", 1.5 + 0.1 * (exceptions - 4)
    return "red", 2.0`,
    component: FRTBTool,
  },
  {
    id: "opvar", name: t("labs.risk.ui.text129", { defaultValue: "操作风险 LDA (OpVaR)" }),
    nameEn: "Operational Risk — Loss Distribution Approach (Poisson × Lognormal)",
    formula: String.raw`L=\sum_{i=1}^{N}X_i,\; N\sim\mathrm{Poisson}(\lambda),\; X_i\sim\mathrm{LogN}(\mu,\sigma^{2}),\qquad \mathrm{OpVaR}_{99.9\%}=F_L^{-1}(0.999)`,
    python: `import numpy as np

def lda_opvar(lam, mu, sigma, n_sims=10000, seed=42):
    rng = np.random.default_rng(seed)
    N = rng.poisson(lam, size=n_sims)
    totals = np.array([np.exp(mu + sigma * rng.standard_normal(n)).sum() for n in N])
    return {
        "mean": totals.mean(),
        "var_999": np.quantile(totals, 0.999),
        "es_999": totals[totals >= np.quantile(totals, 0.999)].mean(),
    }`,
    component: OpRiskLDATool,
  },
  {
    id: "reverse_stress", name: t("labs.risk.ui.text130", { defaultValue: "反向压力测试" }),
    nameEn: "Reverse Stress Testing — Mahalanobis-Minimal Factor Shock",
    formula: String.raw`\min_{\delta}\;\delta^{\top}\Sigma^{-1}\delta \quad\text{s.t.}\quad b^{\top}\delta = L^{*}\;\Longrightarrow\; \delta^{*}=\dfrac{L^{*}}{b^{\top}\Sigma b}\,\Sigma\, b`,
    python: `import numpy as np

def reverse_stress(Sigma, b, L_star):
    Sb = Sigma @ b
    delta = (L_star / (b @ Sb)) * Sb
    plausibility = L_star**2 / (b @ Sb)   # δ' Σ⁻¹ δ
    return delta, plausibility`,
    component: ReverseStressTool,
  },
  {
    id: "concentration", name: t("labs.risk.ui.text131", { defaultValue: "集中度 & Component VaR" }),
    nameEn: "Concentration Risk & Component VaR (Euler Allocation)",
    formula: String.raw`\mathrm{VaR}_{\alpha}=z_{\alpha}\sqrt{w^{\top}\Sigma w},\quad \mathrm{CVaR}_i=w_i\cdot\dfrac{z_{\alpha}(\Sigma w)_i}{\sigma_p},\quad \sum_i \mathrm{CVaR}_i=\mathrm{VaR}_{\alpha},\quad \mathrm{HHI}=\sum_i w_i^{2}`,
    python: `import numpy as np
from scipy.stats import norm

def component_var(w, Sigma, alpha=0.99):
    w = np.asarray(w); Sw = Sigma @ w
    sigma_p = np.sqrt(w @ Sw); z = norm.ppf(alpha)
    var = z * sigma_p
    marginal = z * Sw / sigma_p
    component = w * marginal
    hhi = (w**2).sum()
    return var, component, component / var, hhi, 1 / hhi`,
    component: ConcentrationTool,
  },
);

// ── V5.8 Risk Completion ──
TOOLS.push(
  {
    id: "coherence", name: t("labs.risk.ui.text132", { defaultValue: "风险度量公理台" }),
    nameEn: "Coherence Axioms, Spectral & Distortion Measures, Elicitability",
    formula: String.raw`\rho(L_1+L_2)\le\rho(L_1)+\rho(L_2),\quad \rho_\phi(L)=\int_0^1\phi(u)Q_L(u)\,du,\quad S(q,y)=(\mathbf 1\{y\le q\}-\alpha)(q-y)`,
    python: `import numpy as np

def es(losses, a=0.99):
    L = np.sort(losses); k = max(1, round(len(L) * (1 - a)))
    return L[-k:].mean()

def spectral(losses, gamma):
    L = np.sort(losses); n = len(L)
    u = (np.arange(n) + 0.5) / n
    phi = gamma * np.exp(-gamma * (1 - u)) / (1 - np.exp(-gamma))
    return float((phi * L).sum() / phi.sum())

def pinball(y, q, a=0.99):
    y = np.asarray(y)
    return float((((y <= q).astype(float) - a) * (q - y)).mean())`,
    component: CoherenceTool,
  },
  {
    id: "vol_fhs", name: t("labs.risk.ui.text133", { defaultValue: "波动率建模与过滤式历史模拟" }),
    nameEn: "EWMA / GARCH(1,1) / HAR + Filtered Historical Simulation",
    formula: String.raw`\sigma_t^2=\omega+\alpha\varepsilon_{t-1}^2+\beta\sigma_{t-1}^2,\qquad z_t=\frac{r_t}{\sigma_t},\qquad r_{T+h}^{*}=\sigma_{T+h}\,z^{*}`,
    python: `import numpy as np

def ewma_vol(r, lam=0.94):
    v = np.var(r[:20]); out = []
    for x in r:
        v = lam * v + (1 - lam) * x * x
        out.append(np.sqrt(v))
    return np.array(out)

def fhs_var(r, sigma, sigma_fwd, a=0.99, n=10000, seed=1):
    z = r / sigma
    rng = np.random.default_rng(seed)
    draws = sigma_fwd * rng.choice(z, size=n)
    L = -draws
    return np.quantile(L, a)`,
    component: VolFhsTool,
  },
  {
    id: "irb", name: t("labs.risk.ui.text134", { defaultValue: "PD / LGD / EAD 与 IRB 资本" }),
    nameEn: "Expected Loss, Vasicek Unexpected Loss & Basel IRB Risk Weights",
    formula: String.raw`K=\mathrm{LGD}\left[\Phi\!\left(\frac{\Phi^{-1}(\mathrm{PD})+\sqrt{R}\,\Phi^{-1}(0.999)}{\sqrt{1-R}}\right)-\mathrm{PD}\right]\cdot\frac{1+(M-2.5)b}{1-1.5b},\quad \mathrm{RWA}=12.5\,K\,\mathrm{EAD}`,
    python: `import numpy as np
from scipy.stats import norm

def irb_capital(pd, lgd, ead, M=2.5):
    R = 0.12 * (1 - np.exp(-50 * pd)) / (1 - np.exp(-50)) \
        + 0.24 * (1 - (1 - np.exp(-50 * pd)) / (1 - np.exp(-50)))
    b = (0.11852 - 0.05478 * np.log(pd)) ** 2
    cond = norm.cdf((norm.ppf(pd) + np.sqrt(R) * norm.ppf(0.999)) / np.sqrt(1 - R))
    k = lgd * (cond - pd) * (1 + (M - 2.5) * b) / (1 - 1.5 * b)
    return k, 12.5 * k * ead, pd * lgd * ead`,
    component: IrbCapitalTool,
  },
  {
    id: "migration", name: t("labs.risk.ui.text135", { defaultValue: "评级迁移与 CreditMetrics" }),
    nameEn: "Rating Migration Matrices, Generators & CreditMetrics Portfolio Loss",
    formula: String.raw`P^{(n)}=P^{n},\quad Q=\log P,\qquad R_i=\sqrt{\rho}\,Z+\sqrt{1-\rho}\,\epsilon_i,\quad \text{rating}_i=k \iff z_{k}<R_i\le z_{k-1}`,
    python: `import numpy as np

def n_period(P, n):
    return np.linalg.matrix_power(np.asarray(P), n)

def credit_metrics(P, idx, n_obl, rho, lgd, n_sims=5000, seed=0):
    rng = np.random.default_rng(seed)
    row = P[idx]
    thr = np.concatenate([[np.inf], -np.sort(-np.cumsum(row[::-1]))])
    Z = rng.standard_normal(n_sims)
    losses = []
    for z in Z:
        R = np.sqrt(rho) * z + np.sqrt(1 - rho) * rng.standard_normal(n_obl)
        losses.append(lgd * (R < np.quantile(R, row[-1])).mean())
    return np.mean(losses), np.quantile(losses, 0.99)`,
    component: MigrationCreditMetricsTool,
  },
  {
    id: "spiral", name: t("labs.risk.ui.text136", { defaultValue: "融资流动性与去杠杆螺旋" }),
    nameEn: "Funding Liquidity, Margin Spirals & Survival Horizon",
    formula: String.raw`A_t\le\frac{E_t}{m_t},\qquad \Delta p=\lambda\,\frac{\text{sales}}{A_0},\qquad \text{Amplification}=\frac{\text{direct}+\text{spiral}}{\text{direct}}`,
    python: `def spiral(assets, equity, haircut, dh, impact, shock, rounds=8):
    loss = assets * shock
    a, e = assets - loss, equity - loss
    spiral_loss = 0.0
    for _ in range(rounds):
        haircut = min(0.95, haircut + dh)
        sales = max(0.0, a - e / haircut)
        drop = min(0.95, impact * sales / assets)
        mtm = a * drop
        spiral_loss += mtm
        a, e = max(0.0, (a - sales) * (1 - drop)), max(0.0, e - mtm)
        if e <= 0 or sales <= 0:
            break
    return (loss + spiral_loss) / loss`,
    component: FundingSpiralTool,
  },
  {
    id: "basel", name: t("labs.risk.ui.text137", { defaultValue: "Basel 资本栈与 LCR / NSFR" }),
    nameEn: "CET1 / AT1 / T2 Stack, Buffers, Leverage Ratio & Liquidity Ratios",
    formula: String.raw`\text{CET1 ratio}=\frac{\text{CET1}}{\mathrm{RWA}}\ge 4.5\%+\text{CCB}+\text{CCyB}+\text{G-SIB},\quad \mathrm{LCR}=\frac{\mathrm{HQLA}}{\text{30d net outflows}}\ge 100\%`,
    python: `def basel_stack(cet1, at1, t2, rwa, exposure, hqla, outflows, asf, rsf,
                ccyb=0.0, gsib=0.0):
    return {
        "cet1_ratio": cet1 / rwa,
        "tier1_ratio": (cet1 + at1) / rwa,
        "total_ratio": (cet1 + at1 + t2) / rwa,
        "leverage": (cet1 + at1) / exposure,
        "cet1_required": 0.045 + 0.025 + ccyb + gsib,
        "lcr": hqla / outflows,
        "nsfr": asf / rsf,
    }`,
    component: BaselStackTool,
  },
  {
    id: "model_risk", name: t("labs.risk.ui.text138", { defaultValue: "模型风险与稳健决策" }),
    nameEn: "Model Uncertainty Bands, ε-Contamination & SR 11-7 Governance",
    formula: String.raw`\rho^{\text{rob}}=(1-\varepsilon)\,\rho_{\text{base}}+\varepsilon\,\rho_{\text{worst}},\qquad \text{Buffer}=\rho^{\text{rob}}-\rho_{\text{base}}`,
    python: `import numpy as np

def model_band(vals, eps=0.1, mult=1.0):
    base, worst = float(np.mean(vals)), float(np.max(vals))
    robust = (1 - eps) * base + eps * worst
    return {"spread": float(np.ptp(vals)), "robust": robust * mult,
            "buffer": max(0.0, robust * mult - base)}`,
    component: ModelRiskTool,
  },
  {
    id: "resilience", name: t("labs.risk.ui.text139", { defaultValue: "韧性与恢复计划" }),
    nameEn: "Multi-Period Capital Trajectory, Buffer Release & Recovery Triggers",
    formula: String.raw`\mathrm{CET1}_{t+1}=\mathrm{CET1}_t+\mathrm{PPNR}_t-L_t-D_t,\qquad \mathrm{ratio}_t=\frac{\mathrm{CET1}_t}{\mathrm{RWA}_t},\quad \mathrm{RWA}_{t+1}=\mathrm{RWA}_t(1+g)`,
    python: `def trajectory(cet1, rwa, ppnr, losses, g=0.01, div=0.4):
    path = []
    for L in losses:
        cet1 = cet1 + ppnr - L - div
        rwa *= 1 + g
        path.append(cet1 / rwa)
    return path, min(path)`,
    component: ResilienceTool,
  },
);
return TOOLS;
};


/** Compact collapsible Python reference snippet — companion to the formula bar. */
const PythonReference = ({ code }: { code: string }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="mb-6 rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 hover:text-gold flex items-center gap-2"
        >
          <span>{open ? "▾" : "▸"}</span> {t("labs.risk.ui.text140", { defaultValue: "Python 参考实现" })}
        </button>
        {open && (
          <button
            onClick={onCopy}
            className="text-[10px] font-mono text-muted-foreground hover:text-gold transition-colors"
          >
            {copied ? t("labs.risk.ui.text141", { defaultValue: "已复制 ✓" }) : t("labs.risk.ui.text142", { defaultValue: "复制" })}
          </button>
        )}
      </div>
      {open && (
        <pre className="m-0 p-4 text-[11px] leading-relaxed font-mono text-foreground/90 overflow-x-auto bg-secondary/20">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};

/** Five learning tracks across the 22 risk tools. */
const getRISK_CATEGORIES = (t: TFunction) => {
const RISK_CATEGORIES: ToolCategory[] = [
  { id: "market", label: t("labs.risk.ui.text143", { defaultValue: "市场风险与极值" }), labelEn: "Market Risk & Extremes", toolIds: ["var", "evt", "esback", "vol_fhs", "coherence"] },
  { id: "credit", label: t("labs.risk.ui.text144", { defaultValue: "信用与对手方" }), labelEn: "Credit & Counterparty", toolIds: ["merton", "copula", "credit_copula", "cva", "migration", "irb"] },
  { id: "liquidity", label: t("labs.risk.ui.text145", { defaultValue: "流动性与系统性" }), labelEn: "Liquidity & Systemic", toolIds: ["lvar", "systemic", "spiral", "concentration"] },
  { id: "regcap", label: t("labs.risk.ui.text146", { defaultValue: "压力测试与监管资本" }), labelEn: "Stress & Regulatory Capital", toolIds: ["stress", "reverse_stress", "frtb", "opvar", "basel"] },
  { id: "governance", label: t("labs.risk.ui.text147", { defaultValue: "治理与韧性" }), labelEn: "Governance & Resilience", toolIds: ["model_risk", "resilience"] },
];
return RISK_CATEGORIES;
};

/** Short English nav labels (the formula bar still shows the full titles). */
const RISK_NAV_EN: Record<ToolId, string> = {
  var: "VaR (3 methods)",
  evt: "EVT / POT",
  esback: "ES Backtest",
  vol_fhs: "Vol & FHS",
  coherence: "Coherent Measures",
  merton: "Merton Structural",
  copula: "Gaussian Copula",
  credit_copula: "Credit Portfolio Copula",
  cva: "CVA / XVA",
  migration: "CreditMetrics Migration",
  irb: "A-IRB Capital",
  lvar: "Liquidity VaR",
  systemic: "CoVaR / MES / SRISK",
  spiral: "Deleveraging Spiral",
  concentration: "Concentration & CVaR",
  stress: "Stress Testing",
  reverse_stress: "Reverse Stress",
  frtb: "FRTB IMA",
  opvar: "Operational Risk LDA",
  basel: "Basel Stack & LCR",
  model_risk: "Model Risk",
  resilience: "Resilience & Recovery",
};

const RISK_TOOL_IDS = ["blackmonday","ltcm","dotcom","lehman","covid","ukraine","custom","var","merton","copula","evt","esback","stress","cva","credit_copula","systemic","lvar","frtb","opvar","reverse_stress","concentration","coherence","vol_fhs","irb","migration","spiral","basel","model_risk","resilience"] as readonly ToolId[];

const RiskTools = () => {
  const { t } = useTranslation();
  const RISK_CATEGORIES = getRISK_CATEGORIES(t);
  const TOOLS = getTOOLS(t);
  
  const [tool, setTool] = useToolTab<ToolId>(RISK_TOOL_IDS, "merton");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => {
    if (s?.tool) setTool(s.tool);
  }, [setTool]);
  useSharedState<{ tool: ToolId }>("risk", apply);

  const Active = TOOLS.find(timeIndex => timeIndex.id === tool)!;

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
            {t("labs.risk.subtitle")}
          </p>
        </motion.div>

        {/* Tool tabs — categorized + searchable */}
        <CategorizedToolNav
          tools={TOOLS.map(({ id, name }) => ({ id, name, nameEn: RISK_NAV_EN[id] }))}
          categories={RISK_CATEGORIES}
          activeId={tool}
          onSelect={(id) => setTool(id as ToolId)}
        />


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
              summarize={(s: any) => t("labs.risk.historySummary", { tool: s.tool })}
            />
            <ShareExportToolbar
              storageKey="risk"
              anchorId="risk"
              state={{ tool }}
              captureRef={captureRef}
              filename={`risk-${tool}`}
            />
          </div>

          <div className="text-center mb-3 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">
              {Active.nameEn}
            </p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock math={Active.formula} />
            </div>
          </div>

          <PythonReference code={Active.python} />

          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default RiskTools;
