import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart, Area } from "recharts";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

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
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/**
 * Solow-Swan growth model with Cobb-Douglas Y = A K^α (Lh)^(1−α).
 * In per-effective-worker terms (k̃ = K/(AL)):
 *    k̃̇ = s·k̃^α − (n + g + δ)·k̃
 * Steady state: k̃* = (s/(n+g+δ))^(1/(1−α))
 * Golden-rule savings: s_gr = α (consumption-maximising).
 */
function simulateSolow(opts: {
  alpha: number; s: number; n: number; g: number; delta: number;
  k0: number; T: number;
}) {
  const { alpha, s, n, g, delta, k0, T } = opts;
  const series: { t: number; k: number; y: number; c: number; i: number; sy: number; brk: number }[] = [];
  let k = k0;
  for (let t = 0; t <= T; t++) {
    const y = Math.pow(Math.max(k, 1e-9), alpha);
    const i = s * y;
    const c = (1 - s) * y;
    const brk = (n + g + delta) * k;
    series.push({ t, k: +k.toFixed(4), y: +y.toFixed(4), c: +c.toFixed(4), i: +i.toFixed(4), sy: +i.toFixed(4), brk: +brk.toFixed(4) });
    // Discrete-time update of k̃
    k = k + (i - brk);
    if (!isFinite(k) || k < 0) k = 1e-6;
  }
  const kStar = Math.pow(s / (n + g + delta), 1 / (1 - alpha));
  const yStar = Math.pow(kStar, alpha);
  const cStar = (1 - s) * yStar;
  const sGold = alpha;
  const kGold = Math.pow(sGold / (n + g + delta), 1 / (1 - alpha));
  const yGold = Math.pow(kGold, alpha);
  const cGold = (1 - sGold) * yGold;
  return { series, kStar, yStar, cStar, sGold, kGold, cGold };
}

export const SolowTool = () => {
  const { t } = useTranslation();
  const [alpha, setAlpha] = useState(0.33);
  const [s, setS] = useState(0.25);
  const [n, setN] = useState(0.01);
  const [g, setG] = useState(0.02);
  const [delta, setDelta] = useState(0.05);
  const [k0, setK0] = useState(1.0);
  const [T, setT] = useState(150);

  const sim = useMemo(() => simulateSolow({ alpha, s, n, g, delta, k0, T }), [alpha, s, n, g, delta, k0, T]);

  // Phase diagram: sf(k) and break-even (n+g+δ)k as functions of k
  const phase = useMemo(() => {
    const kMax = Math.max(sim.kStar, sim.kGold) * 1.8;
    const out: { k: number; sf: number; brk: number; goldF: number }[] = [];
    for (let i = 0; i <= 80; i++) {
      const kk = (i / 80) * kMax + 1e-3;
      out.push({
        k: +kk.toFixed(4),
        sf: +(s * Math.pow(kk, alpha)).toFixed(4),
        brk: +((n + g + delta) * kk).toFixed(4),
        goldF: +(sim.sGold * Math.pow(kk, alpha)).toFixed(4),
      });
    }
    return out;
  }, [sim, s, alpha, n, g, delta]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroClassic.solow.presets.us.name"), description: t("labs.macroClassic.solow.presets.us.desc"), apply: () => { setAlpha(0.33); setS(0.20); setN(0.01); setG(0.02); setDelta(0.05); setK0(1); setT(150); } },
        { name: t("labs.macroClassic.solow.presets.china.name"), description: t("labs.macroClassic.solow.presets.china.desc"), apply: () => { setS(0.40); setAlpha(0.4); setN(0.005); setG(0.04); setDelta(0.06); } },
        { name: t("labs.macroClassic.solow.presets.gold.name"), description: t("labs.macroClassic.solow.presets.gold.desc"), apply: () => { setS(0.33); setAlpha(0.33); setN(0.01); setG(0.02); setDelta(0.05); } },
        { name: t("labs.macroClassic.solow.presets.trap.name"), description: t("labs.macroClassic.solow.presets.trap.desc"), apply: () => { setK0(0.05); setT(200); } },
        { name: t("labs.macroClassic.solow.presets.over.name"), description: t("labs.macroClassic.solow.presets.over.desc"), apply: () => { setS(0.6); setAlpha(0.33); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroClassic.solow.labels.tech")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroClassic.solow.sliders.alpha")} value={alpha} min={0.1} max={0.6} step={0.01} onChange={setAlpha} />
            <Slider label={t("labs.macroClassic.solow.sliders.s")} sub="∈[0,1]" value={s} min={0.01} max={0.7} step={0.01} onChange={setS} />
            <Slider label={t("labs.macroClassic.solow.sliders.delta")} value={delta} min={0.01} max={0.15} step={0.005} onChange={setDelta} />
            <Slider label={t("labs.macroClassic.solow.sliders.n")} value={n} min={-0.01} max={0.05} step={0.001} onChange={setN} />
            <Slider label={t("labs.macroClassic.solow.sliders.g")} value={g} min={0} max={0.05} step={0.001} onChange={setG} />
            <Slider label={t("labs.macroClassic.solow.sliders.k0")} value={k0} min={0.01} max={10} step={0.05} onChange={setK0} />
          </div>
          <Slider label={t("labs.macroClassic.solow.sliders.t")} value={T} min={20} max={400} step={10} onChange={setT} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroClassic.solow.stats.kstar")} value={sim.kStar.toFixed(3)} sub="(s/(n+g+δ))^(1/(1-α))" />
            <Stat label={t("labs.macroClassic.solow.stats.ystar")} value={sim.yStar.toFixed(3)} color={CHART_TEAL} />
            <Stat label={t("labs.macroClassic.solow.stats.cstar")} value={sim.cStar.toFixed(3)} color={CHART_BLUE} />
            <Stat label={t("labs.macroClassic.solow.stats.sgold")} value={sim.sGold.toFixed(3)} color={CHART_RED} sub={s > sim.sGold ? t("labs.macroClassic.solow.stats.sgoldSubOver") : s < sim.sGold ? t("labs.macroClassic.solow.stats.sgoldSubUnder") : t("labs.macroClassic.solow.stats.sgoldSubGold")} />
            <Stat label={t("labs.macroClassic.solow.stats.kgold")} value={sim.kGold.toFixed(3)} color={CHART_RED} />
            <Stat label={t("labs.macroClassic.solow.stats.cgold")} value={sim.cGold.toFixed(3)} color={CHART_RED} sub={t("labs.macroClassic.solow.stats.deltaC", { val: (sim.cGold - sim.cStar).toFixed(3) })} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">Solow-Swan (1956)：</span>{t("labs.macroClassic.solow.notes.intro")}</p>
            <p>{t("labs.macroClassic.solow.notes.dynamics")}</p>
            <p><span className="text-gold">{t("labs.macroClassic.solow.notes.convergenceTitle", "收敛性")}：</span>{t("labs.macroClassic.solow.notes.convergence")}</p>
            <p><span className="text-gold">{t("labs.macroClassic.solow.notes.goldTitle", "黄金率")}：</span>{t("labs.macroClassic.solow.notes.gold")}</p>
          </div>
        </div>
      </div>

      {/* Convergence chart */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.macroClassic.solow.chart.conv.title", { val: sim.kStar.toFixed(3) })}</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sim.series}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroClassic.solow.chart.conv.xAxis"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="k" name={t("labs.macroClassic.solow.chart.conv.kLine")} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="y" name={t("labs.macroClassic.solow.chart.conv.yLine")} stroke={CHART_TEAL} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="c" name={t("labs.macroClassic.solow.chart.conv.cLine")} stroke={CHART_BLUE} strokeWidth={2} dot={false} strokeDasharray="4 3" />
              <ReferenceLine y={sim.kStar} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: "k̃*", fill: CHART_RED, fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Phase diagram */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.macroClassic.solow.chart.phase.title")}</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={phase}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroClassic.solow.chart.phase.xAxis"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="sf" name={t("labs.macroClassic.solow.chart.phase.invLine", { s: s.toFixed(2) })} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="brk" name={t("labs.macroClassic.solow.chart.phase.brkLine")} stroke={CHART_RED} strokeWidth={2} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="goldF" name={t("labs.macroClassic.solow.chart.phase.goldLine")} stroke={CHART_BLUE} strokeWidth={1.5} dot={false} strokeDasharray="2 2" />
              <ReferenceLine x={sim.kStar} stroke={CHART_GOLD} strokeDasharray="2 2" label={{ value: "k̃*", fill: CHART_GOLD, fontSize: 10 }} />
              <ReferenceLine x={sim.kGold} stroke={CHART_BLUE} strokeDasharray="2 2" label={{ value: "k̃_gr", fill: CHART_BLUE, fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{t("labs.macroClassic.solow.chart.phase.hint")}</p>
      </div>
    </div>
  );
};

export default SolowTool;
