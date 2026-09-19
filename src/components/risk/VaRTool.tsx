import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

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
function normInv(p: number): number {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q: number, r: number;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  else if (p <= ph) { q = p - 0.5; r = q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
  else { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
}

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: { label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">{label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}</label>
      <span className="text-xs font-mono text-gold tabular-nums">{value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = CHART_GOLD, sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-base font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

function quantile(sorted: number[], p: number): number {
  const idx = Math.min(Math.max(Math.floor(p * sorted.length), 0), sorted.length - 1);
  return sorted[idx];
}

/**
 * Value-at-Risk — Parametric (normal) vs Historical simulation vs Monte Carlo.
 * Losses defined as L = −V·r. VaR_α = quantile of L at level α; ES = mean loss beyond VaR.
 */
export const VaRTool = () => {
  const { t } = useTranslation();
  const [V, setV] = useState(1_000_000);
  const [mu, setMu] = useState(8);       // annual drift %
  const [sigma, setSigma] = useState(20); // annual vol %
  const [horizon, setHorizon] = useState(1); // days
  const [alpha, setAlpha] = useState(0.99);
  const [df, setDf] = useState(5);       // t-dist dof for the "historical" fat-tailed sample
  const [seed, setSeed] = useState(42);

  const r = useMemo(() => {
    const h = horizon / 252;
    const muH = (mu / 100) * h;
    const sigH = (sigma / 100) * Math.sqrt(h);
    const z = normInv(alpha);

    // 1. Parametric normal VaR / ES
    const varParam = V * (z * sigH - muH);
    const esFactorN = Math.exp(-0.5 * z * z) / (Math.sqrt(2 * Math.PI) * (1 - alpha));
    const esParam = V * (esFactorN * sigH - muH);

    // Samples
    const N = 20000;
    const rngH = mulberry32(seed);
    const rngM = mulberry32(seed + 7);
    const histLoss: number[] = [];
    const mcLoss: number[] = [];
    // scale t so its variance matches sigH
    const tScale = df > 2 ? Math.sqrt((df - 2) / df) : 1;
    for (let i = 0; i < N; i++) {
      // Student-t via normal / sqrt(chi2/df) for fat tails (historical proxy)
      let chi = 0;
      for (let j = 0; j < df; j++) { const zz = randn(rngH); chi += zz * zz; }
      const tVar = randn(rngH) / Math.sqrt(chi / df);
      const rH = muH + sigH * tScale * tVar;
      histLoss.push(-V * rH);
      const rM = muH + sigH * randn(rngM);
      mcLoss.push(-V * rM);
    }
    const histSorted = [...histLoss].sort((a, b) => a - b);
    const mcSorted = [...mcLoss].sort((a, b) => a - b);
    const varHist = quantile(histSorted, alpha);
    const varMC = quantile(mcSorted, alpha);
    const tailH = histSorted.filter(l => l >= varHist);
    const tailM = mcSorted.filter(l => l >= varMC);
    const esHist = tailH.reduce((s, v) => s + v, 0) / Math.max(tailH.length, 1);
    const esMC = tailM.reduce((s, v) => s + v, 0) / Math.max(tailM.length, 1);

    // Histogram of MC losses
    const lo = mcSorted[Math.floor(0.005 * N)];
    const hi = mcSorted[Math.floor(0.995 * N)];
    const bins = 40;
    const w = (hi - lo) / bins;
    const hist = Array.from({ length: bins }, (_, i) => ({ x: +(lo + (i + 0.5) * w).toFixed(0), c: 0 }));
    for (const l of mcLoss) {
      if (l < lo || l > hi) continue;
      const bi = Math.min(Math.floor((l - lo) / w), bins - 1);
      hist[bi].c++;
    }
    return { varParam, esParam, varHist, esHist, varMC, esMC, hist };
  }, [V, mu, sigma, horizon, alpha, df, seed]);

  const fmt = (x: number) => `$${Math.round(x).toLocaleString()}`;
  const methods = [
    { name: t("labs.risk.var.method.parametric"), var: r.varParam, es: r.esParam, color: CHART_GOLD },
    { name: t("labs.risk.var.method.historical"), var: r.varHist, es: r.esHist, color: CHART_RED },
    { name: t("labs.risk.var.method.monteCarlo"), var: r.varMC, es: r.esMC, color: CHART_BLUE },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.risk.var.presets.standard1d.name"), description: t("labs.risk.var.presets.standard1d.description"), apply: () => { setMu(8); setSigma(20); setHorizon(1); setAlpha(0.99); setDf(5); } },
        { name: t("labs.risk.var.presets.reg10d.name"), description: t("labs.risk.var.presets.reg10d.description"), apply: () => { setHorizon(10); setAlpha(0.99); } },
        { name: t("labs.risk.var.presets.fatTail.name"), description: t("labs.risk.var.presets.fatTail.description"), apply: () => { setDf(3); setSigma(35); } },
        { name: t("labs.risk.var.presets.conf95.name"), description: t("labs.risk.var.presets.conf95.description"), apply: () => { setAlpha(0.95); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.risk.var.slider.portfolioValue")} value={V} min={100000} max={5000000} step={100000} onChange={setV} />
          <Slider label={t("labs.risk.var.slider.annualReturn")} value={mu} min={-10} max={20} step={1} onChange={setMu} />
          <Slider label={t("labs.risk.var.slider.annualVol")} value={sigma} min={5} max={60} step={1} onChange={setSigma} />
          <Slider label={t("labs.risk.var.slider.horizon")} value={horizon} min={1} max={20} step={1} onChange={setHorizon} />
          <Slider label={t("labs.risk.var.slider.confidence")} value={alpha} min={0.9} max={0.999} step={0.005} onChange={setAlpha} />
          <Slider label={t("labs.risk.var.slider.dof")} sub={t("labs.risk.var.slider.dofSub")} value={df} min={3} max={30} step={1} onChange={setDf} />
          <Slider label={t("labs.risk.var.slider.seed")} value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {methods.map(m => (
              <Stat key={m.name} label={m.name} value={fmt(m.var)} color={m.color} sub={t("labs.risk.var.stat.esSub", { value: fmt(m.es) })} />
            ))}
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.risk.var.explain.parametricLabel")}</span>{t("labs.risk.var.explain.parametricText")}</p>
            <p><span className="text-gold">{t("labs.risk.var.explain.historicalLabel")}</span>{t("labs.risk.var.explain.historicalText")}</p>
            <p><span className="text-gold">{t("labs.risk.var.explain.monteCarloLabel")}</span>{t("labs.risk.var.explain.monteCarloText")}</p>
            <p><span className="text-gold">{t("labs.risk.var.explain.esLabel")}</span>{t("labs.risk.var.explain.esText")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.var.chart.title")}</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.hist}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 9 }} label={{ value: t("labs.risk.var.chart.xAxisLabel"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="c" name={t("labs.risk.var.chart.frequency")}>
                {r.hist.map((b, i) => <Cell key={i} fill={b.x >= r.varMC ? CHART_RED : CHART_TEAL} fillOpacity={0.6} />)}
              </Bar>
              <ReferenceLine x={+r.varParam.toFixed(0)} stroke={CHART_GOLD} strokeDasharray="4 3" label={{ value: t("labs.risk.var.chart.parametricRef"), fill: CHART_GOLD, fontSize: 9 }} />
              <ReferenceLine x={+r.varMC.toFixed(0)} stroke={CHART_BLUE} strokeDasharray="4 3" label={{ value: t("labs.risk.var.chart.mcVarRef"), fill: CHART_BLUE, fontSize: 9 }} />
              <ReferenceLine x={+r.varHist.toFixed(0)} stroke={CHART_RED} strokeDasharray="4 3" label={{ value: t("labs.risk.var.chart.historicalRef"), fill: CHART_RED, fontSize: 9 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
          {t("labs.risk.var.chart.footnote")}
        </p>
      </div>
    </div>
  );
};

export default VaRTool;