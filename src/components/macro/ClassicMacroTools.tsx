import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ReferenceDot, ComposedChart,
} from "recharts";
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

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">{children}</div>
);

const ChartCard = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    <div className="h-[300px]">{children}</div>
    {hint && <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{hint}</p>}
  </div>
);

/* ════════════════════════════════════════════════════════════
   1. IS-LM — goods & money market equilibrium + crowding out
   IS: R = (A − (1−mpc)Y)/b ;  LM: R = (kY − M)/h
   ════════════════════════════════════════════════════════════ */
export const ISLMTool = () => {
  const { t } = useTranslation();
  const [mpc, setMpc] = useState(0.6);
  const [G, setG] = useState(30);
  const [M, setM] = useState(120);
  const [b, setB] = useState(4);    // investment sensitivity to R
  const [k, setK] = useState(0.5);  // money demand income sensitivity
  const [h, setH] = useState(4);    // money demand interest sensitivity

  const r = useMemo(() => {
    const C0 = 20, I0 = 30;
    const A = C0 + I0 + G;
    // Y* = (A·h + b·M) / (h(1−mpc) + b·k)
    const Ystar = (A * h + b * M) / (h * (1 - mpc) + b * k);
    const Rstar = (k * Ystar - M) / h;
    const simpleMult = 1 / (1 - mpc);            // pure Keynesian multiplier
    const actualMultG = h / (h * (1 - mpc) + b * k); // dY/dG with LM
    const crowdOut = 1 - actualMultG / simpleMult;
    return { A, Ystar, Rstar, simpleMult, actualMultG, crowdOut };
  }, [mpc, G, M, b, k, h]);

  const curve = useMemo(() => {
    const out: { Y: number; IS: number; LM: number }[] = [];
    const Ymax = r.Ystar * 1.8;
    for (let i = 0; i <= 60; i++) {
      const Y = (i / 60) * Ymax + 1;
      out.push({
        Y: +Y.toFixed(1),
        IS: +((r.A - (1 - mpc) * Y) / b).toFixed(3),
        LM: +((k * Y - M) / h).toFixed(3),
      });
    }
    return out;
  }, [r, mpc, b, k, h, M]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroClassic.islm.presets.base.name"), description: t("labs.macroClassic.islm.presets.base.desc"), apply: () => { setMpc(0.6); setG(30); setM(120); setB(4); setK(0.5); setH(4); } },
        { name: t("labs.macroClassic.islm.presets.fiscal.name"), description: t("labs.macroClassic.islm.presets.fiscal.desc"), apply: () => { setG(60); } },
        { name: t("labs.macroClassic.islm.presets.monetary.name"), description: t("labs.macroClassic.islm.presets.monetary.desc"), apply: () => { setM(180); } },
        { name: t("labs.macroClassic.islm.presets.liquidity.name"), description: t("labs.macroClassic.islm.presets.liquidity.desc"), apply: () => { setH(40); } },
        { name: t("labs.macroClassic.islm.presets.classical.name"), description: t("labs.macroClassic.islm.presets.classical.desc"), apply: () => { setH(0.6); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroClassic.islm.sliders.mpc")} value={mpc} min={0.3} max={0.9} step={0.05} onChange={setMpc} />
            <Slider label={t("labs.macroClassic.islm.sliders.g")} value={G} min={0} max={100} step={5} onChange={setG} />
            <Slider label={t("labs.macroClassic.islm.sliders.m")} value={M} min={40} max={240} step={10} onChange={setM} />
            <Slider label={t("labs.macroClassic.islm.sliders.b")} value={b} min={1} max={10} step={0.5} onChange={setB} />
            <Slider label={t("labs.macroClassic.islm.sliders.k")} value={k} min={0.2} max={1.2} step={0.05} onChange={setK} />
            <Slider label={t("labs.macroClassic.islm.sliders.h")} value={h} min={0.5} max={40} step={0.5} onChange={setH} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroClassic.islm.stats.ystar")} value={r.Ystar.toFixed(1)} />
            <Stat label={t("labs.macroClassic.islm.stats.rstar")} value={r.Rstar.toFixed(2)} color={CHART_TEAL} />
            <Stat label={t("labs.macroClassic.islm.stats.simpleMult")} value={r.simpleMult.toFixed(2)} color={CHART_BLUE} sub="1/(1−mpc)" />
            <Stat label={t("labs.macroClassic.islm.stats.actualMult")} value={r.actualMultG.toFixed(2)} color={CHART_GOLD} sub="dY/dG (含 LM)" />
            <Stat label={t("labs.macroClassic.islm.stats.crowdOut")} value={`${(r.crowdOut * 100).toFixed(0)}%`} color={CHART_RED} sub={t("labs.macroClassic.islm.stats.crowdOutSub")} />
          </div>
          <Note>
            <p><span className="text-gold">IS：</span>{t("labs.macroClassic.islm.notes.is")}</p>
            <p><span className="text-gold">LM：</span>{t("labs.macroClassic.islm.notes.lm")}</p>
            <p><span className="text-gold">{t("labs.macroClassic.islm.notes.crowdOutTitle", "Crowding-out")}：</span>{t("labs.macroClassic.islm.notes.crowdOut")}</p>
          </Note>
        </div>
      </div>

      <ChartCard title={t("labs.macroClassic.islm.chart.title")} hint={t("labs.macroClassic.islm.chart.hint")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="Y" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroClassic.islm.chart.xAxis"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, "auto"]} label={{ value: t("labs.macroClassic.islm.chart.yAxis"), angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="IS" name={t("labs.macroClassic.islm.chart.isLine")} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="LM" name={t("labs.macroClassic.islm.chart.lmLine")} stroke={CHART_BLUE} strokeWidth={2.5} dot={false} />
            <ReferenceDot x={+r.Ystar.toFixed(1)} y={+r.Rstar.toFixed(2)} r={5} fill={CHART_RED} stroke="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. AD-AS — short/long run, demand & supply shocks
   ════════════════════════════════════════════════════════════ */
export const ADASTool = () => {
  const { t } = useTranslation();
  const [Yn, setYn] = useState(100);     // potential output
  const [adShift, setAdShift] = useState(0);   // demand shock
  const [asShift, setAsShift] = useState(0);   // supply shock (cost-push)
  const [lambda, setLambda] = useState(0.5);   // SRAS slope
  const [Pe, setPe] = useState(100);     // expected price

  const r = useMemo(() => {
    // AD: P = (200 + adShift) − Y   (downward)
    // SRAS: P = Pe + asShift + λ(Y − Yn)
    // Solve: (200+adShift) − Y = Pe + asShift + λ(Y − Yn)
    const Ystar = (200 + adShift - Pe - asShift + lambda * Yn) / (1 + lambda);
    const Pstar = 200 + adShift - Ystar;
    const gap = Ystar - Yn;
    return { Ystar, Pstar, gap };
  }, [Yn, adShift, asShift, lambda, Pe]);

  const curve = useMemo(() => {
    const out: { Y: number; AD: number; SRAS: number }[] = [];
    for (let Y = 60; Y <= 140; Y += 2) {
      out.push({
        Y,
        AD: +(200 + adShift - Y).toFixed(2),
        SRAS: +(Pe + asShift + lambda * (Y - Yn)).toFixed(2),
      });
    }
    return out;
  }, [adShift, asShift, lambda, Pe, Yn]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroClassic.adas.presets.lrun.name"), description: t("labs.macroClassic.adas.presets.lrun.desc"), apply: () => { setAdShift(0); setAsShift(0); setPe(100); setYn(100); setLambda(0.5); } },
        { name: t("labs.macroClassic.adas.presets.demand.name"), description: t("labs.macroClassic.adas.presets.demand.desc"), apply: () => { setAdShift(20); setAsShift(0); } },
        { name: t("labs.macroClassic.adas.presets.supply.name"), description: t("labs.macroClassic.adas.presets.supply.desc"), apply: () => { setAdShift(0); setAsShift(25); } },
        { name: t("labs.macroClassic.adas.presets.recession.name"), description: t("labs.macroClassic.adas.presets.recession.desc"), apply: () => { setAdShift(-20); setAsShift(0); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.macroClassic.adas.sliders.yn")} value={Yn} min={80} max={120} step={1} onChange={setYn} />
          <Slider label={t("labs.macroClassic.adas.sliders.ad")} value={adShift} min={-40} max={40} step={2} onChange={setAdShift} />
          <Slider label={t("labs.macroClassic.adas.sliders.as")} value={asShift} min={-30} max={40} step={2} onChange={setAsShift} />
          <Slider label={t("labs.macroClassic.adas.sliders.lambda")} sub={t("labs.macroClassic.adas.sliders.lambdaSub")} value={lambda} min={0.1} max={2} step={0.1} onChange={setLambda} />
          <Slider label={t("labs.macroClassic.adas.sliders.pe")} value={Pe} min={80} max={130} step={1} onChange={setPe} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroClassic.adas.stats.ystar")} value={r.Ystar.toFixed(1)} />
            <Stat label={t("labs.macroClassic.adas.stats.pstar")} value={r.Pstar.toFixed(1)} color={CHART_TEAL} />
            <Stat label={t("labs.macroClassic.adas.stats.gap")} value={r.gap.toFixed(1)} color={r.gap >= 0 ? CHART_RED : CHART_BLUE} sub={r.gap >= 0 ? t("labs.macroClassic.adas.stats.gapOverheat") : t("labs.macroClassic.adas.stats.gapRecession")} />
            <Stat label={t("labs.macroClassic.adas.stats.yn")} value={Yn.toFixed(0)} color={CHART_GOLD} />
          </div>
          <Note>
            <p><span className="text-gold">AD：</span>{t("labs.macroClassic.adas.notes.ad")}</p>
            <p><span className="text-gold">SRAS：</span>{t("labs.macroClassic.adas.notes.sras")}</p>
            <p><span className="text-gold">{t("labs.macroClassic.adas.notes.longRunTitle", "Long-run Adjustment")}：</span>{t("labs.macroClassic.adas.notes.longRun")}</p>
          </Note>
        </div>
      </div>

      <ChartCard title={t("labs.macroClassic.adas.chart.title")} hint={t("labs.macroClassic.adas.chart.hint")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="Y" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroClassic.islm.chart.xAxis"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={["auto", "auto"]} label={{ value: t("labs.macroClassic.adas.chart.yAxis"), angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="AD" name={t("labs.macroClassic.adas.chart.adLine")} stroke={CHART_RED} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="SRAS" name={t("labs.macroClassic.adas.chart.srasLine")} stroke={CHART_BLUE} strokeWidth={2.5} dot={false} />
            <ReferenceLine x={Yn} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "LRAS", fill: CHART_GOLD, fontSize: 10 }} />
            <ReferenceDot x={+r.Ystar.toFixed(0)} y={+r.Pstar.toFixed(1)} r={5} fill={CHART_GOLD} stroke="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Phillips Curve — expectations-augmented + long-run vertical
   π = πe − β(u − un) + shock
   ════════════════════════════════════════════════════════════ */
export const PhillipsTool = () => {
  const { t } = useTranslation();
  const [pe, setPe] = useState(2);
  const [beta, setBeta] = useState(0.5);
  const [un, setUn] = useState(5);
  const [shock, setShock] = useState(0);

  const curve = useMemo(() => {
    const out: { u: number; SRPC: number }[] = [];
    for (let u = 1; u <= 10; u += 0.25) {
      out.push({ u: +u.toFixed(2), SRPC: +(pe - beta * (u - un) + shock).toFixed(2) });
    }
    return out;
  }, [pe, beta, un, shock]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroClassic.phillips.presets.original.name"), description: t("labs.macroClassic.phillips.presets.original.desc"), apply: () => { setPe(2); setBeta(0.8); setUn(5); setShock(0); } },
        { name: t("labs.macroClassic.phillips.presets.hiExp.name"), description: t("labs.macroClassic.phillips.presets.hiExp.desc"), apply: () => { setPe(6); setBeta(0.6); } },
        { name: t("labs.macroClassic.phillips.presets.flat.name"), description: t("labs.macroClassic.phillips.presets.flat.desc"), apply: () => { setBeta(0.1); setPe(2); } },
        { name: t("labs.macroClassic.phillips.presets.shock.name"), description: t("labs.macroClassic.phillips.presets.shock.desc"), apply: () => { setShock(4); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.macroClassic.phillips.sliders.pe")} value={pe} min={0} max={10} step={0.5} onChange={setPe} />
          <Slider label={t("labs.macroClassic.phillips.sliders.beta")} sub={t("labs.macroClassic.phillips.sliders.betaSub")} value={beta} min={0.05} max={1.5} step={0.05} onChange={setBeta} />
          <Slider label={t("labs.macroClassic.phillips.sliders.un")} value={un} min={3} max={7} step={0.25} onChange={setUn} />
          <Slider label={t("labs.macroClassic.phillips.sliders.shock")} value={shock} min={-4} max={6} step={0.5} onChange={setShock} />
        </div>
        <div className="space-y-3">
          <Note>
            <p><span className="text-gold">{t("labs.macroClassic.phillips.notes.formulaTitle", "Expectations-Augmented PC")}：</span>{t("labs.macroClassic.phillips.notes.formula")}</p>
            <p><span className="text-gold">{t("labs.macroClassic.phillips.notes.verticalTitle", "Long-run Vertical")}：</span>{t("labs.macroClassic.phillips.notes.vertical")}</p>
            <p><span className="text-gold">{t("labs.macroClassic.phillips.notes.flatTitle", "Flattening")}：</span>{t("labs.macroClassic.phillips.notes.flat")}</p>
            <p>{t("labs.macroClassic.phillips.notes.hiExp")}</p>
          </Note>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroClassic.phillips.stats.un")} value={`${un.toFixed(2)}%`} />
            <Stat label={t("labs.macroClassic.phillips.stats.piAtUn")} value={`${(pe + shock).toFixed(2)}%`} color={CHART_TEAL} sub={t("labs.macroClassic.phillips.stats.piAtUnSub")} />
          </div>
        </div>
      </div>

      <ChartCard title={t("labs.macroClassic.phillips.chart.title")} hint={t("labs.macroClassic.phillips.chart.hint")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="u" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroClassic.phillips.chart.xAxis"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroClassic.phillips.chart.yAxis"), angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="SRPC" name={t("labs.macroClassic.phillips.chart.srpcLine")} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
            <ReferenceLine x={un} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: t("labs.macroClassic.phillips.chart.lrpcLine"), fill: CHART_RED, fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   4. Mundell-Fleming — impossible trinity & policy effectiveness
   ════════════════════════════════════════════════════════════ */
type Regime = "fixed" | "floating";
type Policy = "fiscal" | "monetary";

export const MundellFlemingTool = () => {
  const { t } = useTranslation();
  const [regime, setRegime] = useState<Regime>("floating");
  const [policy, setPolicy] = useState<Policy>("fiscal");

  const result = useMemo(() => {
    // Perfect capital mobility (BP horizontal). Classic Mundell-Fleming conclusions:
    if (regime === "floating") {
      if (policy === "fiscal")
        return { eff: t("labs.macroClassic.mundell.eff.ineffective"), color: CHART_RED, why: t("labs.macroClassic.mundell.results.floatFisWhy") };
      return { eff: t("labs.macroClassic.mundell.eff.effective"), color: CHART_TEAL, why: t("labs.macroClassic.mundell.results.floatMonWhy") };
    } else {
      if (policy === "fiscal")
        return { eff: t("labs.macroClassic.mundell.eff.effective"), color: CHART_TEAL, why: t("labs.macroClassic.mundell.results.fixedFisWhy") };
      return { eff: t("labs.macroClassic.mundell.eff.ineffective"), color: CHART_RED, why: t("labs.macroClassic.mundell.results.fixedMonWhy") };
    }
  }, [regime, policy]);

  const Toggle = ({ value, options, onChange }: { value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) => (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${value === o.id ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroClassic.mundell.presets.floatMon.name"), description: t("labs.macroClassic.mundell.presets.floatMon.desc"), apply: () => { setRegime("floating"); setPolicy("monetary"); } },
        { name: t("labs.macroClassic.mundell.presets.floatFis.name"), description: t("labs.macroClassic.mundell.presets.floatFis.desc"), apply: () => { setRegime("floating"); setPolicy("fiscal"); } },
        { name: t("labs.macroClassic.mundell.presets.fixedFis.name"), description: t("labs.macroClassic.mundell.presets.fixedFis.desc"), apply: () => { setRegime("fixed"); setPolicy("fiscal"); } },
        { name: t("labs.macroClassic.mundell.presets.fixedMon.name"), description: t("labs.macroClassic.mundell.presets.fixedMon.desc"), apply: () => { setRegime("fixed"); setPolicy("monetary"); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t("labs.macroClassic.mundell.labels.regime")}</p>
            <Toggle value={regime} options={[{ id: "floating", label: t("labs.macroClassic.mundell.labels.regimeFloating") }, { id: "fixed", label: t("labs.macroClassic.mundell.labels.regimeFixed") }]} onChange={(v) => setRegime(v as Regime)} />
          </div>
          <div>
            <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t("labs.macroClassic.mundell.labels.policy")}</p>
            <Toggle value={policy} options={[{ id: "fiscal", label: t("labs.macroClassic.mundell.labels.policyFiscal") }, { id: "monetary", label: t("labs.macroClassic.mundell.labels.policyMonetary") }]} onChange={(v) => setPolicy(v as Policy)} />
          </div>
          <div className={`rounded-xl border p-4 ${result.eff === t("labs.macroClassic.mundell.eff.effective") ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("labs.macroClassic.mundell.labels.effTitle")}</p>
            <p className="text-2xl font-display font-bold mt-1" style={{ color: result.color }}>{result.eff}</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{result.why}</p>
          </div>
        </div>

        <div className="space-y-3">
          <ImpossibleTriangle />
          <Note>
            <p><span className="text-gold">{t("labs.macroClassic.mundell.notes.trilemmaTitle", "Impossible Trinity")}：</span>{t("labs.macroClassic.mundell.notes.trilemma")}</p>
            <p>{t("labs.macroClassic.mundell.notes.float")}</p>
            <p>{t("labs.macroClassic.mundell.notes.fixed")}</p>
          </Note>
        </div>
      </div>
    </div>
  );
};

const ImpossibleTriangle = () => {
  const { t } = useTranslation();
  return (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.macroClassic.mundell.triangle.title")}</h4>
    <svg viewBox="0 0 300 220" className="w-full h-[200px]">
      <polygon points="150,20 30,190 270,190" fill="hsl(var(--gold) / 0.06)" stroke={CHART_GOLD} strokeWidth="1.5" />
      <line x1="150" y1="20" x2="150" y2="190" stroke={CHART_GRID} strokeDasharray="3 3" />
      <line x1="30" y1="190" x2="210" y2="105" stroke={CHART_GRID} strokeDasharray="3 3" />
      <line x1="270" y1="190" x2="90" y2="105" stroke={CHART_GRID} strokeDasharray="3 3" />
      <circle cx="150" cy="20" r="4" fill={CHART_GOLD} />
      <circle cx="30" cy="190" r="4" fill={CHART_TEAL} />
      <circle cx="270" cy="190" r="4" fill={CHART_BLUE} />
      <text x="150" y="12" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontFamily="monospace">{t("labs.macroClassic.mundell.triangle.monetary")}</text>
      <text x="22" y="205" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontFamily="monospace">{t("labs.macroClassic.mundell.triangle.fixed")}</text>
      <text x="270" y="205" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontFamily="monospace">{t("labs.macroClassic.mundell.triangle.capital")}</text>
      <text x="150" y="120" textAnchor="middle" fontSize="9" fill={CHART_TEXT} fontFamily="monospace">{t("labs.macroClassic.mundell.triangle.pickTwo")}</text>
    </svg>
  </div>
  );
};

/* ════════════════════════════════════════════════════════════
   5. Ramsey-Cass-Koopmans — phase diagram & saddle path
   ċ/c = (f'(k) − ρ − θg)/θ ;  k̇ = f(k) − c − (n+δ)k
   ════════════════════════════════════════════════════════════ */
export const RamseyTool = () => {
  const { t } = useTranslation();
  const [alpha, setAlpha] = useState(0.33);
  const [rho, setRho] = useState(0.03);
  const [theta, setTheta] = useState(2);
  const [n, setN] = useState(0.01);
  const [delta, setDelta] = useState(0.05);
  const [g, setG] = useState(0.02);

  const r = useMemo(() => {
    // f(k) = k^α, f'(k) = α k^(α−1). Euler steady state: f'(k*) = ρ + θg + δ
    const target = rho + theta * g + delta;
    const kStar = Math.pow(alpha / target, 1 / (1 - alpha));
    const cStar = Math.pow(kStar, alpha) - (n + delta + g) * kStar;
    const kGold = Math.pow(alpha / (n + delta + g), 1 / (1 - alpha)); // golden rule
    return { kStar, cStar, kGold, target };
  }, [alpha, rho, theta, n, delta, g]);

  const curve = useMemo(() => {
    const out: { k: number; kdot0: number }[] = [];
    const kMax = r.kGold * 1.3;
    for (let i = 1; i <= 60; i++) {
      const k = (i / 60) * kMax;
      // k̇ = 0 locus: c = f(k) − (n+δ+g)k
      out.push({ k: +k.toFixed(3), kdot0: +Math.max(Math.pow(k, alpha) - (n + delta + g) * k, 0).toFixed(3) });
    }
    return out;
  }, [alpha, n, delta, g, r]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroClassic.ramsey.presets.base.name"), description: t("labs.macroClassic.ramsey.presets.base.desc"), apply: () => { setAlpha(0.33); setRho(0.03); setTheta(2); setN(0.01); setDelta(0.05); setG(0.02); } },
        { name: t("labs.macroClassic.ramsey.presets.patient.name"), description: t("labs.macroClassic.ramsey.presets.patient.desc"), apply: () => { setRho(0.01); } },
        { name: t("labs.macroClassic.ramsey.presets.risk.name"), description: t("labs.macroClassic.ramsey.presets.risk.desc"), apply: () => { setTheta(4); } },
        { name: t("labs.macroClassic.ramsey.presets.delta.name"), description: t("labs.macroClassic.ramsey.presets.delta.desc"), apply: () => { setDelta(0.1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroClassic.ramsey.sliders.alpha")} value={alpha} min={0.2} max={0.5} step={0.01} onChange={setAlpha} />
            <Slider label={t("labs.macroClassic.ramsey.sliders.rho")} value={rho} min={0.01} max={0.1} step={0.005} onChange={setRho} />
            <Slider label={t("labs.macroClassic.ramsey.sliders.theta")} value={theta} min={0.5} max={5} step={0.5} onChange={setTheta} />
            <Slider label={t("labs.macroClassic.ramsey.sliders.n")} value={n} min={0} max={0.04} step={0.005} onChange={setN} />
            <Slider label={t("labs.macroClassic.ramsey.sliders.delta")} value={delta} min={0.02} max={0.12} step={0.005} onChange={setDelta} />
            <Slider label={t("labs.macroClassic.ramsey.sliders.g")} value={g} min={0} max={0.04} step={0.005} onChange={setG} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroClassic.ramsey.stats.kstar")} value={r.kStar.toFixed(3)} sub="f'(k*)=ρ+θg+δ" />
            <Stat label={t("labs.macroClassic.ramsey.stats.cstar")} value={r.cStar.toFixed(3)} color={CHART_TEAL} />
            <Stat label={t("labs.macroClassic.ramsey.stats.kgold")} value={r.kGold.toFixed(3)} color={CHART_BLUE} sub={t("labs.macroClassic.ramsey.stats.kgoldSub")} />
            <Stat label="f'(k*)" value={r.target.toFixed(3)} color={CHART_GOLD} />
          </div>
          <Note>
            <p><span className="text-gold">Ramsey (1928)：</span>{t("labs.macroClassic.ramsey.notes.intro")}</p>
            <p><span className="text-gold">Euler：</span>{t("labs.macroClassic.ramsey.notes.euler")}</p>
            <p>稳态 k* &lt; 黄金率 k_gold ⟹ 动态有效（不过度储蓄），区别于 Solow 可能过度储蓄。</p>
          </Note>
        </div>
      </div>

      <ChartCard title={t("labs.macroClassic.ramsey.chart.title")} hint={t("labs.macroClassic.ramsey.chart.hint")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroClassic.ramsey.chart.xAxis"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroClassic.ramsey.chart.yAxis"), angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="kdot0" name={t("labs.macroClassic.ramsey.chart.kdotLine")} stroke={CHART_BLUE} strokeWidth={2.5} dot={false} />
            <ReferenceLine x={+r.kStar.toFixed(3)} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: t("labs.macroClassic.ramsey.chart.cdotLine"), fill: CHART_GOLD, fontSize: 10 }} />
            <ReferenceDot x={+r.kStar.toFixed(3)} y={+r.cStar.toFixed(3)} r={5} fill={CHART_RED} stroke="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};