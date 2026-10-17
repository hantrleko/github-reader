import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToolTab } from "@/lib/useToolTab";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Bar, ScatterChart, Scatter, Area,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  endogenousGrowth, growthAccounting, developmentAccounting,
  multiplierAccelerator, fiscalMultipliers,
  rbcSimulate, calvoNKPC, barroGordon, policyRuleSim,
  parityLab, suddenStop,
  expectationsLab, unconventionalPolicy, bankCapitalAmplification, climateMacroPath,
  type RuleKind, type ExpectationKind,
} from "@/lib/quant/macroFrontier";

type Cat = "growth" | "cycle" | "policy" | "open" | "frontier";
type Tab =
  | "endo" | "accounting"
  | "multiplier" | "rbc" | "calvo"
  | "rules"
  | "parity" | "sudden"
  | "expect" | "uncon" | "bank" | "climate";

const CATS: { id: Cat; label: string; kicker: string }[] = [
  { id: "growth",   label: "Long-run Growth",   kicker: "Growth" },
  { id: "cycle",    label: "Cycles & Rigidity", kicker: "Cycles" },
  { id: "policy",   label: "Policy Rules",   kicker: "Policy" },
  { id: "open",     label: "Open Economy",   kicker: "Open Economy" },
  { id: "frontier", label: "Frontier",   kicker: "Frontier" },
];

const TABS: { id: Tab; cat: Cat; title: string; desc: string }[] = [
  { id: "endo", cat: "growth", title: "Endogenous Growth Engines", desc: "AK / Lucas / Romer / Schumpeter vs Solow" },
  { id: "accounting", cat: "growth", title: "Growth Accounting & TFP", desc: "Solow residual + Hall-Jones development accounting" },
  { id: "multiplier", cat: "cycle", title: "Multiplier–Accelerator & Fiscal Multipliers", desc: "Samuelson cycle + state-dependent multipliers" },
  { id: "rbc", cat: "cycle", title: "RBC Calibration & Cycle Moments", desc: "Volatility and correlations driven by technology shocks" },
  { id: "calvo", cat: "cycle", title: "Calvo Pricing & the NKPC", desc: "θ → κ, indexation, and monetary non-neutrality" },
  { id: "rules", cat: "policy", title: "Rules vs. Discretion", desc: "Barro-Gordon inflation bias + comparison of four rules" },
  { id: "parity", cat: "open", title: "Parity Conditions & Carry", desc: "PPP / UIP / CIP and the forward premium puzzle" },
  { id: "sudden", cat: "open", title: "Sudden Stops & External Adjustment", desc: "Capital flow reversals, reserve coverage, and balance-sheet effects" },
  { id: "expect", cat: "frontier", title: "Behavioral Macro: Expectation Formation", desc: "Rational / adaptive / sticky / diagnostic" },
  { id: "uncon", cat: "frontier", title: "Unconventional Monetary Policy", desc: "QE portfolio rebalancing + YCC yield-curve control" },
  { id: "bank", cat: "frontier", title: "Macrofinance: Bank Capital", desc: "Capital shock → deleveraging → credit and output" },
  { id: "climate", cat: "frontier", title: "The Macro Path of Climate Transition", desc: "Trade-offs among carbon prices, green inflation, and physical damage" },
];

export default function V60MacroTools() {
  const { t } = useTranslation();
  const [tab, setTab] = useToolTab<Tab>(TABS.map((x) => x.id), "endo");
  const [cat, setCat] = useState<Cat>(TABS.find((x) => x.id === tab)?.cat ?? "growth");
  // Keep the category strip in sync when the tab arrives from the URL.
  useEffect(() => {
    const owner = TABS.find((x) => x.id === tab)?.cat;
    if (owner) setCat(owner);
  }, [tab]);
  const inCat = TABS.filter((tb) => tb.cat === cat);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V6.0 · Macro Frontier Lab</p>
        <h2 className="text-2xl font-serif text-foreground">{t("labs.macroFrontier.header.heading")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          {t("labs.macroFrontier.header.intro")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c.id}
              onClick={() => { setCat(c.id); setTab(TABS.find((tb) => tb.cat === c.id)!.id); }}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                cat === c.id ? "bg-gold/15 border-gold/60 text-gold"
                             : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{c.kicker}</span>{t(`labs.macroFrontier.cats.${c.id}`)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {inCat.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-3 py-1.5 rounded-md border text-[11px] transition-colors ${
                tab === tb.id ? "bg-secondary border-gold/40 text-foreground"
                             : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground"
              }`}>
              {t(`labs.macroFrontier.tabs.${tb.id}.title`)}
              <span className="ml-2 text-[10px] text-muted-foreground/70 hidden md:inline">{t(`labs.macroFrontier.tabs.${tb.id}.desc`)}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "endo" && <EndoPanel />}
        {tab === "accounting" && <AccountingPanel />}
        {tab === "multiplier" && <MultiplierPanel />}
        {tab === "rbc" && <RBCPanel />}
        {tab === "calvo" && <CalvoPanel />}
        {tab === "rules" && <RulesPanel />}
        {tab === "parity" && <ParityPanel />}
        {tab === "sudden" && <SuddenPanel />}
        {tab === "expect" && <ExpectPanel />}
        {tab === "uncon" && <UnconPanel />}
        {tab === "bank" && <BankPanel />}
        {tab === "climate" && <ClimatePanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">{t("labs.macroFrontier.header.references")}</p>
        <p>
          Romer (1990) Endogenous Technological Change · Aghion-Howitt (1992) Creative Destruction · Lucas (1988) On the Mechanics of Development ·
          Hall-Jones (1999) Why Do Some Countries Produce So Much More Output per Worker · Samuelson (1939) Interactions between the Multiplier and the Accelerator ·
          Kydland-Prescott (1982) Time to Build · Calvo (1983) Staggered Prices · Barro-Gordon (1983) Rules, Discretion and Reputation ·
          Fama (1984) Forward and Spot Exchange Rates · Calvo (1998) Capital Flows and Capital-Market Crises ·
          Mankiw-Reis (2002) Sticky Information · Bordalo-Gennaioli-Shleifer (2018) Diagnostic Expectations ·
          Vayanos-Vila (2021) Preferred-Habitat · Gertler-Kiyotaki (2010) Financial Intermediation · Golosov-Hassler-Krusell-Tsyvinski (2014) Optimal Taxes on Fossil Fuel.
        </p>
        <p className="mt-2">{t("labs.macroFrontier.header.footerNote")}</p>
      </div>
    </section>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{title}</p>
    {children}
  </div>
);
const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{children}</p>
);

/* ── 1. Endogenous growth ── */
function EndoPanel() {
  const { t } = useTranslation();
  const [s, setS] = useState(0.25);
  const [A, setA] = useState(0.5);
  const [psi, setPsi] = useState(0.06);
  const [u, setU] = useState(0.3);
  const [theta, setTheta] = useState(0.05);
  const [sR, setSR] = useState(0.4);
  const [lam, setLam] = useState(0.3);
  const [gamma, setGamma] = useState(1.15);
  const g = useMemo(() => endogenousGrowth({
    A, s, delta: 0.05, n: 0.01, psi, u, theta, sR, lambdaInn: lam, gamma, alpha: 0.35, horizon: 50,
  }), [A, s, psi, u, theta, sR, lam, gamma]);
  const chart = g.t.map((t, i) => ({
    t,
    AK: +(g.ak[i] * 100).toFixed(2),
    Lucas: +(g.lucas[i] * 100).toFixed(2),
    Romer: +(g.romer[i] * 100).toFixed(2),
    Schumpeter: +(g.schumpeter[i] * 100).toFixed(2),
    Solow: +((g.solow[i] - g.solow[0]) * 100).toFixed(2),
  }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.endo.presets.0.name"), description: t("labs.macroFrontier.endo.presets.0.desc"), apply: () => { setTheta(0.09); setSR(0.55); } },
        { name: t("labs.macroFrontier.endo.presets.1.name"), description: t("labs.macroFrontier.endo.presets.1.desc"), apply: () => { setPsi(0.1); setU(0.4); } },
        { name: t("labs.macroFrontier.endo.presets.2.name"), description: t("labs.macroFrontier.endo.presets.2.desc"), apply: () => { setS(0.4); setA(0.6); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.endo.paramsTitle")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.endo.sliders.0")} value={s} min={0.05} max={0.5} step={0.01} onChange={setS} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label={t("labs.macroFrontier.endo.sliders.1")} value={A} min={0.1} max={1} step={0.05} onChange={setA} />
            <Slider label={t("labs.macroFrontier.endo.sliders.2")} value={psi} min={0.01} max={0.15} step={0.005} onChange={setPsi} />
            <Slider label={t("labs.macroFrontier.endo.sliders.3")} value={u} min={0.05} max={0.6} step={0.05} onChange={setU} />
            <Slider label={t("labs.macroFrontier.endo.sliders.4")} value={theta} min={0.01} max={0.15} step={0.005} onChange={setTheta} />
            <Slider label={t("labs.macroFrontier.endo.sliders.5")} value={sR} min={0.05} max={0.8} step={0.05} onChange={setSR} />
            <Slider label={t("labs.macroFrontier.endo.sliders.6")} value={lam} min={0.05} max={1} step={0.05} onChange={setLam} />
            <Slider label={t("labs.macroFrontier.endo.sliders.7")} value={gamma} min={1.02} max={1.5} step={0.01} onChange={setGamma} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.endo.stats.ak")} value={`${(g.rates.ak*100).toFixed(2)}%`} color={C.gold} />
            <Stat label={t("labs.macroFrontier.endo.stats.lucas")} value={`${(g.rates.lucas*100).toFixed(2)}%`} color={C.teal} />
            <Stat label={t("labs.macroFrontier.endo.stats.romer")} value={`${(g.rates.romer*100).toFixed(2)}%`} color={C.blue} sub={g.scaleEffect ? t("labs.macroFrontier.endo.scaleEffectYes") : t("labs.macroFrontier.endo.scaleEffectNo")} />
            <Stat label={t("labs.macroFrontier.endo.stats.schumpeter")} value={`${(g.rates.schumpeter*100).toFixed(2)}%`} color={C.green} />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.endo.chartTitle")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.endo.axis.year"), position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.endo.axis.logY"), angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="AK" stroke={C.gold} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Lucas" stroke={C.teal} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Romer" stroke={C.blue} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Schumpeter" stroke={C.green} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Solow" stroke={C.red} dot={false} strokeWidth={1.5} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Note>{t("labs.macroFrontier.endo.note")}</Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 2. Growth accounting ── */
function AccountingPanel() {
  const { t } = useTranslation();
  const [gY, setGY] = useState(0.07);
  const [gK, setGK] = useState(0.1);
  const [gL, setGL] = useState(0.012);
  const [gH, setGH] = useState(0.006);
  const [alpha, setAlpha] = useState(0.4);
  const acc = useMemo(() => growthAccounting({ gY, gK, gL, gH, alpha }), [gY, gK, gL, gH, alpha]);
  const [ratio, setRatio] = useState(20);
  const [kyR, setKyR] = useState(3), [kyP, setKyP] = useState(2.2);
  const [hR, setHR] = useState(3.2), [hP, setHP] = useState(1.6);
  const dev = useMemo(() => developmentAccounting({ kyRich: kyR, kyPoor: kyP, hRich: hR, hPoor: hP, incomeRatio: ratio, alpha: 1/3 }), [kyR, kyP, hR, hP, ratio]);
  const bars = [
    { k: t("labs.macroFrontier.r7.capital", { defaultValue: "资本" }), v: +(acc.capitalContrib * 100).toFixed(2) },
    { k: t("labs.macroFrontier.r7.labour", { defaultValue: "劳动" }), v: +(acc.labourContrib * 100).toFixed(2) },
    { k: t("labs.macroFrontier.r7.humanCapital", { defaultValue: "人力资本" }), v: +(acc.humanContrib * 100).toFixed(2) },
    { k: t("labs.macroFrontier.r7.tfpResidual", { defaultValue: "TFP 残差" }), v: +(acc.tfp * 100).toFixed(2) },
  ];
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.misc.k0"), description: t("labs.macroFrontier.misc.k1"), apply: () => { setGY(0.08); setGK(0.14); setGL(0.03); setGH(0.01); } },
        { name: t("labs.macroFrontier.misc.k2"), description: t("labs.macroFrontier.misc.k3"), apply: () => { setGY(0.038); setGK(0.045); setGL(0.012); setGH(0.004); } },
        { name: t("labs.macroFrontier.misc.k4"), description: t("labs.macroFrontier.misc.k5"), apply: () => { setGY(0.02); setGK(0.025); setGL(0.008); setGH(0.003); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k6")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k7")} value={gY} min={-0.02} max={0.15} step={0.002} onChange={setGY} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k8")} value={gK} min={-0.02} max={0.2} step={0.002} onChange={setGK} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k9")} value={gL} min={-0.02} max={0.05} step={0.002} onChange={setGL} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k10")} value={gH} min={0} max={0.03} step={0.001} onChange={setGH} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k11")} value={alpha} min={0.2} max={0.6} step={0.01} onChange={setAlpha} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k12")} value={`${(acc.tfp*100).toFixed(2)}%`} color={acc.tfp >= 0 ? C.green : C.red} />
            <Stat label={t("labs.macroFrontier.misc.k13")} value={`${(acc.tfpShare*100).toFixed(0)}%`} color={C.gold} sub={t("labs.macroFrontier.misc.k14")} />
          </div>
          <Note>
            {t("labs.macroFrontier.misc.k15")}
          </Note>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k16")}>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={bars}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="k" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={0} stroke={C.text} />
                <Bar dataKey="v" fill={C.gold} fillOpacity={0.6} name={t("labs.macroFrontier.misc.k21")} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title={t("labs.macroFrontier.misc.k22")}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k23")} value={ratio} min={2} max={40} step={1} onChange={setRatio} fmt={(v)=>`${v.toFixed(0)}×`} />
            <Slider label={t("labs.macroFrontier.misc.k24")} value={kyR} min={1} max={5} step={0.1} onChange={setKyR} />
            <Slider label={t("labs.macroFrontier.misc.k25")} value={kyP} min={0.5} max={5} step={0.1} onChange={setKyP} />
            <Slider label={t("labs.macroFrontier.misc.k26")} value={hR} min={1} max={4} step={0.1} onChange={setHR} />
            <Slider label={t("labs.macroFrontier.misc.k27")} value={hP} min={0.8} max={4} step={0.1} onChange={setHP} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k28")} value={`${dev.capitalFactor.toFixed(2)}×`} color={C.teal} sub="(K/Y)^{α/(1−α)}·h" />
            <Stat label={t("labs.macroFrontier.misc.k29")} value={`${dev.tfpFactor.toFixed(2)}×`} color={C.gold} />
            <Stat label={t("labs.macroFrontier.misc.k30")} value={`${(dev.tfpSharePct*100).toFixed(0)}%`} color={C.red} sub={t("labs.macroFrontier.misc.k31")} />
            <Stat label={t("labs.macroFrontier.misc.k32")} value={`${((1-dev.tfpSharePct)*100).toFixed(0)}%`} color={C.blue} />
          </div>
        </div>
        <Note>{t("labs.macroFrontier.misc.k33")}</Note>
      </Panel>
    </div>
  );
}

/* ── 3. Multiplier-accelerator & fiscal ── */
function MultiplierPanel() {
  const { t } = useTranslation();
  const [mpc, setMpc] = useState(0.6);
  const [v, setV] = useState(0.8);
  const path = useMemo(() => multiplierAccelerator({ mpc, accel: v, gShock: 1, horizon: 50 }), [mpc, v]);
  const chart = path.t.map((t, i) => ({ t, Y: +path.output[i].toFixed(3), C: +path.consumption[i].toFixed(3), I: +path.investment[i].toFixed(3) }));

  const [taxRate, setTaxRate] = useState(0.25);
  const [imp, setImp] = useState(0.2);
  const [ric, setRic] = useState(0.2);
  const [slack, setSlack] = useState(0.6);
  const [zlb, setZlb] = useState(false);
  const [off, setOff] = useState(0.4);
  const fm = useMemo(() => fiscalMultipliers({ mpc, taxRate, importShare: imp, ricardian: ric, slack, atZLB: zlb, monetaryOffset: off }), [mpc, taxRate, imp, ric, slack, zlb, off]);
  const mBars = [
    { k: t("labs.macroFrontier.r7.textbook", { defaultValue: "教科书基准" }), v: +fm.baseline.toFixed(2) },
    { k: t("labs.macroFrontier.r7.spending", { defaultValue: "政府支出" }), v: +fm.spending.toFixed(2) },
    { k: t("labs.macroFrontier.r7.taxCuts", { defaultValue: "减税" }), v: +fm.tax.toFixed(2) },
    { k: t("labs.macroFrontier.r7.transfers", { defaultValue: "转移支付" }), v: +fm.transfer.toFixed(2) },
  ];
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.misc.k34"), description: t("labs.macroFrontier.misc.k35"), apply: () => { setSlack(0.9); setZlb(true); setRic(0.1); } },
        { name: t("labs.macroFrontier.misc.k36"), description: t("labs.macroFrontier.misc.k37"), apply: () => { setSlack(0.1); setZlb(false); setOff(0.8); } },
        { name: t("labs.macroFrontier.misc.k38"), description: t("labs.macroFrontier.misc.k39"), apply: () => { setRic(1); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k40")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k41")} value={mpc} min={0.3} max={0.95} step={0.01} onChange={setMpc} />
            <Slider label={t("labs.macroFrontier.misc.k42")} value={v} min={0} max={3} step={0.05} onChange={setV} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k43")} value={
              path.regime === "monotone" ? t("labs.macroFrontier.r7.monotone", { defaultValue: "单调收敛" })
              : path.regime === "damped-oscillation" ? t("labs.macroFrontier.r7.damped", { defaultValue: "阻尼振荡" })
              : path.regime === "explosive-oscillation" ? t("labs.macroFrontier.r7.explosive", { defaultValue: "发散振荡" }) : t("labs.macroFrontier.r7.divergent", { defaultValue: "发散" })
            } color={path.regime.startsWith("explosive") ? C.red : C.green} />
            <Stat label={t("labs.macroFrontier.misc.k48")} value={`${path.longRunMultiplier.toFixed(2)}×`} color={C.gold} />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k49")}>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Y" stroke={C.gold} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="C" stroke={C.teal} dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="I" stroke={C.red} dot={false} strokeWidth={1.5} />
                <ReferenceLine y={path.longRunMultiplier} stroke={C.text} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Note>{t("labs.macroFrontier.misc.k50")}</Note>
        </Panel>
      </div>

      <Panel title={t("labs.macroFrontier.misc.k51")}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k52")} value={taxRate} min={0} max={0.5} step={0.01} onChange={setTaxRate} />
            <Slider label={t("labs.macroFrontier.misc.k53")} value={imp} min={0} max={0.5} step={0.01} onChange={setImp} />
            <Slider label={t("labs.macroFrontier.misc.k54")} value={ric} min={0} max={1} step={0.05} onChange={setRic} />
            <Slider label={t("labs.macroFrontier.misc.k55")} value={slack} min={0} max={1} step={0.05} onChange={setSlack} />
            <Slider label={t("labs.macroFrontier.misc.k56")} value={off} min={0} max={1} step={0.05} onChange={setOff} />
            <label className="flex items-center gap-2 text-xs text-secondary-foreground mt-2">
              <input type="checkbox" checked={zlb} onChange={(e) => setZlb(e.target.checked)} className="accent-gold" />
              {t("labs.macroFrontier.misc.k57")}
            </label>
          </div>
          <div>
            <div className="h-[200px]">
              <ResponsiveContainer>
                <ComposedChart data={mBars}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="k" stroke={C.text} tick={{ fontSize: 10 }} />
                  <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={1} stroke={C.red} strokeDasharray="4 4" />
                  <Bar dataKey="v" fill={C.gold} fillOpacity={0.65} name={t("labs.macroFrontier.misc.k62")} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Stat label={t("labs.macroFrontier.misc.k63")} value={fm.regime === "recession" ? t("labs.macroFrontier.r7.recession", { defaultValue: "衰退" }) : fm.regime === "boom" ? t("labs.macroFrontier.r7.boom", { defaultValue: "过热" }) : t("labs.macroFrontier.r7.normal", { defaultValue: "常态" })} color={fm.regime === "recession" ? C.red : C.gold} />
              <Stat label={t("labs.macroFrontier.misc.k67")} value={`${(fm.stabiliserStrength*100).toFixed(0)}%`} color={C.teal} />
            </div>
          </div>
        </div>
        <Note>{t("labs.macroFrontier.misc.k68")}</Note>
      </Panel>
    </div>
  );
}

/* ── 4. RBC ── */
function RBCPanel() {
  const { t } = useTranslation();
  const [rho, setRho] = useState(0.95);
  const [sig, setSig] = useState(0.007);
  const [fr, setFr] = useState(2);
  const [alpha, setAlpha] = useState(0.36);
  const m = useMemo(() => rbcSimulate({ alpha, beta: 0.99, delta: 0.025, rhoA: rho, sigmaA: sig, laborElast: fr, periods: 400, seed: 42 }), [alpha, rho, sig, fr]);
  const chart = m.t.slice(0, 120).map((t, i) => ({
    t,
    y: +(m.output[i] * 100).toFixed(3),
    c: +(m.consumption[i] * 100).toFixed(3),
    i: +(m.investment[i] * 100).toFixed(3),
    a: +(m.tfp[i] * 100).toFixed(3),
  }));
  const rows = [
    { k: "σ(c)/σ(y)", model: m.relSd.c, data: m.dataFacts.relC },
    { k: "σ(i)/σ(y)", model: m.relSd.i, data: m.dataFacts.relI },
    { k: "σ(h)/σ(y)", model: m.relSd.h, data: m.dataFacts.relH },
    { k: "corr(c,y)", model: m.corrWithY.c, data: m.dataFacts.corrC },
    { k: "corr(i,y)", model: m.corrWithY.i, data: m.dataFacts.corrI },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k69")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k70")} value={rho} min={0.5} max={0.99} step={0.01} onChange={setRho} />
            <Slider label={t("labs.macroFrontier.misc.k71")} value={sig} min={0.002} max={0.02} step={0.001} onChange={setSig} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k72")} value={fr} min={0.2} max={5} step={0.1} onChange={setFr} />
            <Slider label={t("labs.macroFrontier.misc.k11")} value={alpha} min={0.25} max={0.45} step={0.01} onChange={setAlpha} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="σ(y)" value={`${(m.sd.y*100).toFixed(2)}%`} color={C.gold} />
            <Stat label="corr(TFP, y)" value={m.corrWithY.a.toFixed(2)} color={C.teal} />
            <Stat label={t("labs.macroFrontier.misc.k73")} value={m.autocorrY.toFixed(2)} color={C.blue} />
            <Stat label="σ(i)/σ(y)" value={m.relSd.i.toFixed(2)} color={m.relSd.i > 1 ? C.green : C.red} />
          </div>
          <div className="rounded-lg border border-border bg-card/40 p-3">
            <p className="text-[11px] font-mono text-gold mb-2">{t("labs.macroFrontier.misc.k74")}</p>
            <table className="w-full text-[11px] font-mono">
              <thead><tr className="text-muted-foreground"><th className="text-left">{t("labs.macroFrontier.misc.k75")}</th><th className="text-right">{t("labs.macroFrontier.misc.k76")}</th><th className="text-right">{t("labs.macroFrontier.misc.k77")}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.k} className="text-foreground/80">
                    <td className="text-left py-0.5">{r.k}</td>
                    <td className="text-right tabular-nums">{r.model.toFixed(2)}</td>
                    <td className="text-right tabular-nums text-muted-foreground">{r.data.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k78")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="y" stroke={C.gold} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k79")} />
                <Line type="monotone" dataKey="c" stroke={C.teal} dot={false} strokeWidth={1.2} name={t("labs.macroFrontier.misc.k80")} />
                <Line type="monotone" dataKey="i" stroke={C.red} dot={false} strokeWidth={1.2} name={t("labs.macroFrontier.misc.k81")} />
                <Line type="monotone" dataKey="a" stroke={C.blue} dot={false} strokeWidth={1} strokeDasharray="3 3" name="TFP" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Note>
            {t("labs.macroFrontier.misc.k82")}
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 5. Calvo ── */
function CalvoPanel() {
  const { t } = useTranslation();
  const [theta, setTheta] = useState(0.75);
  const [omega, setOmega] = useState(0.3);
  const [sigma, setSigma] = useState(1);
  const [phi, setPhi] = useState(1);
  const [eps, setEps] = useState(6);
  const r = useMemo(() => calvoNKPC({ theta, beta: 0.99, sigma, phiLabor: phi, omega, epsilon: eps }), [theta, omega, sigma, phi, eps]);
  const curve = useMemo(() => {
    const pts: { theta: number; kappa: number; dur: number }[] = [];
    for (let th = 0.05; th <= 0.95; th += 0.025) {
      const c = calvoNKPC({ theta: th, beta: 0.99, sigma, phiLabor: phi, omega, epsilon: eps });
      pts.push({ theta: +th.toFixed(3), kappa: +c.kappa.toFixed(4), dur: +c.avgPriceDuration.toFixed(2) });
    }
    return pts;
  }, [omega, sigma, phi, eps]);
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.misc.k83"), description: t("labs.macroFrontier.misc.k84"), apply: () => { setTheta(0.75); setOmega(0.3); } },
        { name: t("labs.macroFrontier.misc.k85"), description: t("labs.macroFrontier.misc.k86"), apply: () => { setTheta(0.35); setOmega(0.6); } },
        { name: t("labs.macroFrontier.misc.k87"), description: t("labs.macroFrontier.misc.k88"), apply: () => { setOmega(0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k89")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k90")} value={theta} min={0.05} max={0.95} step={0.01} onChange={setTheta} />
            <Slider label={t("labs.macroFrontier.misc.k91")} value={omega} min={0} max={1} step={0.05} onChange={setOmega} />
            <Slider label={t("labs.macroFrontier.misc.k92")} value={sigma} min={0.5} max={4} step={0.1} onChange={setSigma} />
            <Slider label={t("labs.macroFrontier.misc.k93")} value={phi} min={0.2} max={4} step={0.1} onChange={setPhi} />
            <Slider label={t("labs.macroFrontier.misc.k94")} value={eps} min={2} max={15} step={0.5} onChange={setEps} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k95")} value={r.kappa.toFixed(4)} color={C.gold} />
            <Stat label={t("labs.macroFrontier.misc.k96")} value={t("labs.macroFrontier.r7.pricePeriods", { defaultValue: "{{periods}} 期", periods: r.avgPriceDuration.toFixed(1) })} color={C.teal} />
            <Stat label={t("labs.macroFrontier.misc.k97")} value={`${r.hybridForward.toFixed(2)} / ${r.hybridBackward.toFixed(2)}`} color={C.blue} />
            <Stat label={t("labs.macroFrontier.misc.k98")} value={`${r.markup.toFixed(2)}×`} color={C.green} />
            <Stat label={t("labs.macroFrontier.misc.k99")} value={`${r.sacrificeRatio.toFixed(1)}`} color={C.red} sub={t("labs.macroFrontier.misc.k100")} />
            <Stat label={t("labs.macroFrontier.misc.k101")} value={t("labs.macroFrontier.r7.moneyPeriods", { defaultValue: "{{periods}} 期", periods: r.moneyHalfLife.toFixed(1) })} color={C.gold} />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k102")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={curve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="theta" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "θ", position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: "κ", angle: -90, position: "insideLeft", fill: C.gold, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.teal} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.r7.duration", { defaultValue: "期限" }), angle: 90, position: "insideRight", fill: C.teal, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area yAxisId="l" type="monotone" dataKey="kappa" stroke={C.gold} fill={C.gold} fillOpacity={0.15} name={t("labs.macroFrontier.misc.k103")} />
                <Line yAxisId="r" type="monotone" dataKey="dur" stroke={C.teal} dot={false} strokeWidth={1.5} name={t("labs.macroFrontier.misc.k105")} />
                <ReferenceLine yAxisId="l" x={theta} stroke={C.red} strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>
            {t("labs.macroFrontier.r7.calvoNote", { defaultValue: "θ 上升 → 曲线变平 → 通胀对产出缺口不敏感 → 反通胀的牺牲率上升、货币非中性更持久。\n            指数化 ω 把权重推向 π_{t−1}，产生通胀惯性。" })}
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 6. Rules vs discretion ── */
function RulesPanel() {
  const { t } = useTranslation();
  const [k, setK] = useState(0.02);
  const [lam, setLam] = useState(1);
  const [a, setA] = useState(0.5);
  const [shock, setShock] = useState(0.01);
  const [cred, setCred] = useState(0.3);
  const bg = useMemo(() => barroGordon({ ambition: k, lambda: lam, slopeAlpha: a, shock, credibility: cred }), [k, lam, a, shock, cred]);
  const credCurve = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const c = i / 20;
    const r = barroGordon({ ambition: k, lambda: lam, slopeAlpha: a, shock, credibility: c });
    return { c: +(c * 100).toFixed(0), pi: +(r.actualInflation * 100).toFixed(2), loss: +r.lossDiscretion.toFixed(4) };
  }), [k, lam, a, shock]);

  const [rule, setRule] = useState<RuleKind>("taylor");
  const [phiPi, setPhiPi] = useState(1.5);
  const [phiX, setPhiX] = useState(0.5);
  const sims = useMemo(() => {
    const base = { phiPi, phiX, kappa: 0.1, beta: 0.99, sigma: 1, rhoShock: 0.8, shock: 0.01, horizon: 24 };
    const kinds: RuleKind[] = ["taylor", "inflation-target", "price-level", "ngdp"];
    return kinds.map((kk) => ({ kind: kk, sim: policyRuleSim({ ...base, rule: kk }) }));
  }, [phiPi, phiX]);
  const active = sims.find((s) => s.kind === rule)!.sim;
  const cmp = active.t.map((t, i) => {
    const row: Record<string, number> = { t };
    sims.forEach((s) => { row[s.kind] = +(s.sim.inflation[i] * 100).toFixed(3); });
    return row;
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k106")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k107")} value={k} min={0} max={0.06} step={0.002} onChange={setK} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k108")} value={lam} min={0} max={4} step={0.1} onChange={setLam} />
            <Slider label={t("labs.macroFrontier.misc.k109")} value={a} min={0.1} max={1.5} step={0.05} onChange={setA} />
            <Slider label={t("labs.macroFrontier.misc.k110")} value={shock} min={-0.03} max={0.05} step={0.002} onChange={setShock} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k111")} value={cred} min={0} max={1} step={0.05} onChange={setCred} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k112")} value={`${(bg.inflationBias*100).toFixed(2)}%`} color={C.red} />
            <Stat label={t("labs.macroFrontier.misc.k113")} value={`${(bg.discretionInflation*100).toFixed(2)}%`} color={C.gold} />
            <Stat label={t("labs.macroFrontier.misc.k114")} value={`${(bg.commitmentInflation*100).toFixed(2)}%`} color={C.green} />
            <Stat label={t("labs.macroFrontier.misc.k115")} value={`${(bg.actualInflation*100).toFixed(2)}%`} color={C.teal} />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k116")}>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={credCurve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="c" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.r7.credibility", { defaultValue: "可信度 %" }), position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="pi" stroke={C.gold} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k118")} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>{t("labs.macroFrontier.misc.k119")}</Note>
        </Panel>
      </div>

      <Panel title={t("labs.macroFrontier.misc.k120")}>
        <div className="flex flex-wrap gap-2 mb-3">
          {(["taylor", "inflation-target", "price-level", "ngdp"] as RuleKind[]).map((kk) => (
            <button key={kk} onClick={() => setRule(kk)}
              className={`px-3 py-1.5 rounded-md border text-[11px] font-mono ${rule === kk ? "bg-gold/15 border-gold/50 text-gold" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {kk === "taylor" ? t("labs.macroFrontier.r7.taylor", { defaultValue: "泰勒规则" }) : kk === "inflation-target" ? t("labs.macroFrontier.r7.inflationTarget", { defaultValue: "通胀目标制" }) : kk === "price-level" ? t("labs.macroFrontier.r7.priceTarget", { defaultValue: "价格水平目标" }) : t("labs.macroFrontier.r7.ngdpTarget", { defaultValue: "名义 GDP 目标" })}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Slider label="φ_π" value={phiPi} min={0.5} max={3} step={0.05} onChange={setPhiPi} />
              <Slider label="φ_x" value={phiX} min={0} max={2} step={0.05} onChange={setPhiX} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={t("labs.macroFrontier.misc.k125")} value={active.determinate ? t("labs.macroFrontier.r7.determinate", { defaultValue: "满足 (φ_π>1)" }) : t("labs.macroFrontier.r7.indeterminate", { defaultValue: "不满足 → 不确定性" })} color={active.determinate ? C.green : C.red} />
              <Stat label={t("labs.macroFrontier.misc.k128")} value={`${(active.volInflation*100).toFixed(2)}%`} color={C.gold} />
              <Stat label={t("labs.macroFrontier.misc.k129")} value={`${(active.volOutput*100).toFixed(2)}%`} color={C.teal} />
              <Stat label={t("labs.macroFrontier.misc.k130")} value={`${(active.cumInflation*100).toFixed(2)}%`} color={Math.abs(active.cumInflation) < 0.01 ? C.green : C.red} />
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <LineChart data={cmp}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "π %", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="taylor" stroke={C.gold} dot={false} strokeWidth={rule === "taylor" ? 2.5 : 1} name={t("labs.macroFrontier.misc.k131")} />
                <Line type="monotone" dataKey="inflation-target" stroke={C.teal} dot={false} strokeWidth={rule === "inflation-target" ? 2.5 : 1} name={t("labs.macroFrontier.misc.k132")} />
                <Line type="monotone" dataKey="price-level" stroke={C.blue} dot={false} strokeWidth={rule === "price-level" ? 2.5 : 1} name={t("labs.macroFrontier.misc.k133")} />
                <Line type="monotone" dataKey="ngdp" stroke={C.green} dot={false} strokeWidth={rule === "ngdp" ? 2.5 : 1} name={t("labs.macroFrontier.misc.k134")} />
                <ReferenceLine y={0} stroke={C.text} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <Note>{t("labs.macroFrontier.misc.k135")}</Note>
      </Panel>
    </div>
  );
}

/* ── 7. Parity ── */
function ParityPanel() {
  const { t } = useTranslation();
  const [iD, setID] = useState(0.05);
  const [iF, setIF] = useState(0.01);
  const [spot, setSpot] = useState(7);
  const [fwd, setFwd] = useState(7.2);
  const [beta, setBeta] = useState(-0.8);
  const [noise, setNoise] = useState(0.02);
  const r = useMemo(() => parityLab({
    iDom: iD, iFor: iF, spot, forward: fwd, inflDom: 0.03, inflFor: 0.02,
    periods: 400, seed: 21, uipBeta: beta, noiseSd: noise,
  }), [iD, iF, spot, fwd, beta, noise]);
  const fit = [
    { diff: Math.min(...r.scatter.map(s => s.diff)), ds: 0 },
    { diff: Math.max(...r.scatter.map(s => s.diff)), ds: 0 },
  ].map((p) => ({ diff: p.diff, fitted: +(r.famaBeta * p.diff).toFixed(3), uip: p.diff }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.misc.k136"), description: t("labs.macroFrontier.misc.k137"), apply: () => { setBeta(-0.8); setNoise(0.02); } },
        { name: t("labs.macroFrontier.misc.k138"), description: t("labs.macroFrontier.misc.k139"), apply: () => { setBeta(1); setNoise(0.005); } },
        { name: t("labs.macroFrontier.misc.k140"), description: t("labs.macroFrontier.misc.k141"), apply: () => { setFwd(7.45); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k142")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k143")} value={iD} min={0} max={0.15} step={0.0025} onChange={setID} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k144")} value={iF} min={0} max={0.15} step={0.0025} onChange={setIF} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k145")} value={spot} min={1} max={12} step={0.1} onChange={setSpot} />
            <Slider label={t("labs.macroFrontier.misc.k146")} value={fwd} min={1} max={12} step={0.01} onChange={setFwd} />
            <Slider label={t("labs.macroFrontier.misc.k147")} value={beta} min={-2} max={2} step={0.1} onChange={setBeta} />
            <Slider label={t("labs.macroFrontier.misc.k148")} value={noise} min={0.002} max={0.06} step={0.002} onChange={setNoise} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k149")} value={`${r.cipBasis.toFixed(0)} bp`} color={Math.abs(r.cipBasis) > 50 ? C.red : C.green} />
            <Stat label={t("labs.macroFrontier.misc.k150")} value={`${(r.forwardPremium*100).toFixed(2)}%`} color={C.gold} />
            <Stat label={t("labs.macroFrontier.misc.k151")} value={r.famaBeta.toFixed(2)} color={r.puzzle ? C.red : C.green} sub={r.puzzle ? t("labs.macroFrontier.r7.puzzle", { defaultValue: "远期溢价之谜" }) : t("labs.macroFrontier.r7.uip", { defaultValue: "UIP 方向一致" })} />
            <Stat label={t("labs.macroFrontier.misc.k154")} value={r.famaR2.toFixed(3)} color={C.blue} />
            <Stat label={t("labs.macroFrontier.misc.k155")} value={`${(r.carryReturn*100).toFixed(2)}%`} color={r.carryReturn > 0 ? C.green : C.red} />
            <Stat label={t("labs.macroFrontier.misc.k156")} value={`${(r.realExchangeDrift*100).toFixed(2)}%`} color={C.teal} sub="π − π*" />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k157")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="diff" stroke={C.text} tick={{ fontSize: 10 }} name="i−i* (%)" />
                <YAxis type="number" dataKey="ds" stroke={C.text} tick={{ fontSize: 10 }} name="Δs (%)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={r.scatter} fill={C.gold} fillOpacity={0.45} name={t("labs.macroFrontier.misc.k158")} />
                <Scatter data={fit} line={{ stroke: C.red, strokeWidth: 2 }} dataKey="fitted" fill="transparent" name={t("labs.macroFrontier.misc.k159")} />
                <Scatter data={fit} line={{ stroke: C.teal, strokeWidth: 1.5, strokeDasharray: "4 4" }} dataKey="uip" fill="transparent" name={t("labs.macroFrontier.misc.k160")} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <Note>
            {t("labs.macroFrontier.misc.k161")}
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 8. Sudden stop ── */
function SuddenPanel() {
  const { t } = useTranslation();
  const [ca, setCa] = useState(0.06);
  const [debt, setDebt] = useState(0.6);
  const [res, setRes] = useState(0.12);
  const [stShare, setStShare] = useState(0.4);
  const [rev, setRev] = useState(0.7);
  const [pass, setPass] = useState(0.5);
  const s = useMemo(() => suddenStop({
    caDeficit: ca, externalDebt: debt, reserves: res, shortTermShare: stShare,
    flowReversal: rev, fxPassthrough: pass, horizon: 24,
  }), [ca, debt, res, stShare, rev, pass]);
  const chart = s.t.map((t, i) => ({
    t,
    ca: +(s.currentAccount[i] * 100).toFixed(2),
    fx: +(s.depreciation[i] * 100).toFixed(2),
    y: +(s.output[i] * 100).toFixed(2),
  }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.misc.k162"), description: t("labs.macroFrontier.misc.k163"), apply: () => { setStShare(0.6); setRes(0.08); setRev(0.9); } },
        { name: t("labs.macroFrontier.misc.k164"), description: t("labs.macroFrontier.misc.k165"), apply: () => { setRes(0.3); setStShare(0.3); } },
        { name: t("labs.macroFrontier.misc.k166"), description: t("labs.macroFrontier.misc.k167"), apply: () => { setRev(0.3); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k168")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k169")} value={ca} min={0} max={0.15} step={0.005} onChange={setCa} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k170")} value={debt} min={0.1} max={1.5} step={0.05} onChange={setDebt} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k171")} value={res} min={0.01} max={0.5} step={0.01} onChange={setRes} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k172")} value={stShare} min={0.05} max={0.8} step={0.05} onChange={setStShare} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k173")} value={rev} min={0} max={1} step={0.05} onChange={setRev} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k174")} value={pass} min={0} max={1} step={0.05} onChange={setPass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k175")} value={`${s.reserveCover.toFixed(2)}×`} color={s.reserveCover >= 1 ? C.green : C.red} sub={t("labs.macroFrontier.misc.k176")} />
            <Stat label={t("labs.macroFrontier.misc.k177")} value={`${(s.requiredAdjustment*100).toFixed(2)}%`} color={C.gold} />
            <Stat label={t("labs.macroFrontier.misc.k178")} value={`${(s.balanceSheetLoss*100).toFixed(2)}%`} color={C.red} sub={t("labs.macroFrontier.misc.k179")} />
            <Stat label={t("labs.macroFrontier.misc.k180")} value={s.crisis ? t("labs.macroFrontier.r7.crisis", { defaultValue: "危机风险" }) : t("labs.macroFrontier.r7.manageable", { defaultValue: "可控" })} color={s.crisis ? C.red : C.green} />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k183")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.r7.quarter", { defaultValue: "季度" }), position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="ca" stroke={C.gold} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k185")} />
                <Line type="monotone" dataKey="fx" stroke={C.red} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k186")} />
                <Line type="monotone" dataKey="y" stroke={C.teal} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k187")} />
                <ReferenceLine y={0} stroke={C.text} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Note>
            {t("labs.macroFrontier.misc.k188")}
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 9. Expectations ── */
function ExpectPanel() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ExpectationKind>("sticky");
  const [gain, setGain] = useState(0.25);
  const [stick, setStick] = useState(0.6);
  const [diag, setDiag] = useState(0.5);
  const [rho, setRho] = useState(0.85);
  const kinds: ExpectationKind[] = ["rational", "adaptive", "sticky", "diagnostic"];
  const all = useMemo(() => kinds.map((k) => ({
    k,
    r: expectationsLab({ kind: k, gain, stickiness: stick, diagnostic: diag, rhoShock: rho, shock: 0.02, kappa: 0.1, horizon: 30 }),
  })), [gain, stick, diag, rho]);
  const active = all.find((a) => a.k === kind)!.r;
  const chart = active.t.map((t, i) => {
    const row: Record<string, number> = { t, actual: +(active.actual[i] * 100).toFixed(3) };
    all.forEach((a) => { row[a.k] = +(a.r.expected[i] * 100).toFixed(3); });
    return row;
  });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-md border text-[11px] font-mono ${kind === k ? "bg-gold/15 border-gold/50 text-gold" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {k === "rational" ? t("labs.macroFrontier.r7.rational", { defaultValue: "理性预期" }) : k === "adaptive" ? t("labs.macroFrontier.r7.adaptive", { defaultValue: "适应性学习" }) : k === "sticky" ? t("labs.macroFrontier.r7.sticky", { defaultValue: "黏性信息" }) : t("labs.macroFrontier.r7.diagnostic", { defaultValue: "诊断性预期" })}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{active.label}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k193")} value={gain} min={0.02} max={0.8} step={0.02} onChange={setGain} />
            <Slider label={t("labs.macroFrontier.misc.k194")} value={stick} min={0} max={0.95} step={0.05} onChange={setStick} />
            <Slider label={t("labs.macroFrontier.misc.k195")} value={diag} min={0} max={1.5} step={0.05} onChange={setDiag} />
            <Slider label={t("labs.macroFrontier.misc.k196")} value={rho} min={0.3} max={0.98} step={0.02} onChange={setRho} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k197")} value={active.cgCoefficient.toFixed(3)} color={Math.abs(active.cgCoefficient) < 1e-8 ? C.green : C.gold}
              sub={t("labs.macroFrontier.misc.k198")} />
            <Stat label={t("labs.macroFrontier.misc.k199")} value={`${(Math.max(...active.forecastError.map(Math.abs)) * 100).toFixed(2)}%`} color={C.red} />
          </div>
          <Note>
            {t("labs.macroFrontier.misc.k200")}
          </Note>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k201")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="actual" stroke={C.text} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k202")} />
                <Line type="monotone" dataKey="rational" stroke={C.green} dot={false} strokeWidth={kind === "rational" ? 2.5 : 1} name={t("labs.macroFrontier.misc.k203")} />
                <Line type="monotone" dataKey="adaptive" stroke={C.blue} dot={false} strokeWidth={kind === "adaptive" ? 2.5 : 1} name={t("labs.macroFrontier.misc.k204")} />
                <Line type="monotone" dataKey="sticky" stroke={C.gold} dot={false} strokeWidth={kind === "sticky" ? 2.5 : 1} name={t("labs.macroFrontier.misc.k205")} />
                <Line type="monotone" dataKey="diagnostic" stroke={C.red} dot={false} strokeWidth={kind === "diagnostic" ? 2.5 : 1} name={t("labs.macroFrontier.misc.k206")} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ── 10. Unconventional policy ── */
function UnconPanel() {
  const { t } = useTranslation();
  const [qe, setQe] = useState(0.15);
  const [dur, setDur] = useState(2);
  const [hab, setHab] = useState(0.5);
  const [sig, setSig] = useState(0.5);
  const [depth, setDepth] = useState(1);
  const [ycc, setYcc] = useState(false);
  const [target, setTarget] = useState(0.0025);
  const r = useMemo(() => unconventionalPolicy({
    qeSize: qe, durationRemoved: dur, preferredHabitat: hab,
    yccTarget: ycc ? target : null, signalling: sig, marketDepth: depth, horizon: 20,
  }), [qe, dur, hab, sig, depth, ycc, target]);
  const chart = r.t.map((t, i) => ({
    t,
    y10: +r.yield10y[i].toFixed(3),
    exp: +r.expectedShortRate[i].toFixed(3),
    tp: +r.termPremium[i].toFixed(1),
    bs: +(r.balanceSheet[i] * 100).toFixed(1),
  }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.misc.k207"), description: t("labs.macroFrontier.misc.k208"), apply: () => { setQe(0.3); setDur(4); setYcc(false); } },
        { name: t("labs.macroFrontier.misc.k209"), description: t("labs.macroFrontier.misc.k210"), apply: () => { setYcc(true); setTarget(0.0025); } },
        { name: t("labs.macroFrontier.misc.k211"), description: t("labs.macroFrontier.misc.k212"), apply: () => { setDur(0.3); setSig(1); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k213")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k214")} value={qe} min={0.02} max={0.6} step={0.02} onChange={setQe} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k215")} value={dur} min={0.1} max={6} step={0.1} onChange={setDur} />
            <Slider label={t("labs.macroFrontier.misc.k216")} value={hab} min={0.1} max={1.5} step={0.05} onChange={setHab} />
            <Slider label={t("labs.macroFrontier.misc.k217")} value={sig} min={0} max={1.5} step={0.05} onChange={setSig} />
            <Slider label={t("labs.macroFrontier.misc.k218")} value={depth} min={0.3} max={3} step={0.1} onChange={setDepth} />
            <Slider label={t("labs.macroFrontier.misc.k219")} value={target} min={0} max={0.02} step={0.0005} onChange={setTarget} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
          </div>
          <label className="flex items-center gap-2 text-xs text-secondary-foreground">
            <input type="checkbox" checked={ycc} onChange={(e) => setYcc(e.target.checked)} className="accent-gold" />
            {t("labs.macroFrontier.misc.k220")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k221")} value={`${r.totalYieldDrop.toFixed(0)} bp`} color={C.gold} />
            <Stat label={t("labs.macroFrontier.misc.k222")} value={`${r.channelSplit.portfolio.toFixed(0)} bp`} color={C.teal} />
            <Stat label={t("labs.macroFrontier.misc.k223")} value={`${r.channelSplit.signalling.toFixed(0)} bp`} color={C.blue} />
            <Stat label={t("labs.macroFrontier.misc.k224")} value={ycc ? (r.yccDefends ? t("labs.macroFrontier.r7.defends", { defaultValue: "是 (无需大量购债)" }) : t("labs.macroFrontier.r7.purchases", { defaultValue: "需大量购债" })) : t("labs.macroFrontier.r7.disabled", { defaultValue: "未启用" })}
              color={!ycc ? C.text : r.yccDefends ? C.green : C.red}
              sub={ycc ? t("labs.macroFrontier.r7.extraPurchases", { defaultValue: "隐含额外购买 {{units}} 单位", units: (r.yccPurchasesNeeded).toFixed(0) }) : undefined} />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k228")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: "%", angle: -90, position: "insideLeft", fill: C.gold, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.teal} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.r7.balanceSheet", { defaultValue: "资产负债表 %GDP" }), angle: 90, position: "insideRight", fill: C.teal, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="y10" stroke={C.gold} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k229")} />
                <Line yAxisId="l" type="monotone" dataKey="exp" stroke={C.blue} dot={false} strokeWidth={1.5} strokeDasharray="4 4" name={t("labs.macroFrontier.misc.k230")} />
                <Bar yAxisId="r" dataKey="bs" fill={C.teal} fillOpacity={0.25} name={t("labs.macroFrontier.misc.k231")} />
                {ycc && <ReferenceLine yAxisId="l" y={target * 100} stroke={C.red} strokeDasharray="4 4" label={{ value: t("labs.macroFrontier.r7.yccCap", { defaultValue: "YCC 上限" }), fill: C.red, fontSize: 10 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>{t("labs.macroFrontier.misc.k233")}</Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 11. Bank capital ── */
function BankPanel() {
  const { t } = useTranslation();
  const [cap, setCap] = useState(0.08);
  const [loss, setLoss] = useState(0.02);
  const [lev, setLev] = useState(12);
  const [el, setEl] = useState(0.3);
  const [fire, setFire] = useState(0.2);
  const r = useMemo(() => bankCapitalAmplification({
    capitalRatio: cap, riskWeight: 1, lossShock: loss, targetLeverage: lev,
    creditElasticity: el, fireSaleImpact: fire, horizon: 20,
  }), [cap, loss, lev, el, fire]);
  const chart = r.t.map((t, i) => ({ t, cap: +r.capital[i].toFixed(2), credit: +r.creditSupply[i].toFixed(2), y: +r.output[i].toFixed(2), spread: +r.spread[i].toFixed(0) }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.misc.k234"), description: t("labs.macroFrontier.misc.k235"), apply: () => { setLev(25); setLoss(0.03); setFire(0.35); } },
        { name: t("labs.macroFrontier.misc.k236"), description: t("labs.macroFrontier.misc.k237"), apply: () => { setCap(0.14); setLev(12); } },
        { name: t("labs.macroFrontier.misc.k238"), description: t("labs.macroFrontier.misc.k239"), apply: () => { setLoss(0.005); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k240")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k241")} value={cap} min={0.03} max={0.2} step={0.005} onChange={setCap} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k242")} value={loss} min={0} max={0.06} step={0.0025} onChange={setLoss} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k243")} value={lev} min={5} max={35} step={1} onChange={setLev} />
            <Slider label={t("labs.macroFrontier.misc.k244")} value={el} min={0.05} max={0.8} step={0.05} onChange={setEl} />
            <Slider label={t("labs.macroFrontier.misc.k245")} value={fire} min={0} max={0.6} step={0.05} onChange={setFire} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k246")} value={`${Math.min(...r.creditSupply).toFixed(1)}%`} color={C.red} />
            <Stat label={t("labs.macroFrontier.misc.k247")} value={`${Math.min(...r.output).toFixed(2)}%`} color={C.gold} />
            <Stat label={t("labs.macroFrontier.misc.k248")} value={`${r.amplification.toFixed(1)}×`} color={C.teal} sub={t("labs.macroFrontier.r7.amplification", { defaultValue: "|Δy| / 损失冲击" })} />
            <Stat label={t("labs.macroFrontier.misc.k249")} value={r.breachesMinimum ? t("labs.macroFrontier.r7.minimum", { defaultValue: "触及最低资本" }) : t("labs.macroFrontier.r7.buffer", { defaultValue: "缓冲充足" })} color={r.breachesMinimum ? C.red : C.green} />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k252")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.r7.spread", { defaultValue: "利差 bp" }), angle: 90, position: "insideRight", fill: C.red, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="cap" stroke={C.teal} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k253")} />
                <Line yAxisId="l" type="monotone" dataKey="credit" stroke={C.gold} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k254")} />
                <Line yAxisId="l" type="monotone" dataKey="y" stroke={C.blue} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k79")} />
                <Bar yAxisId="r" dataKey="spread" fill={C.red} fillOpacity={0.25} name={t("labs.macroFrontier.misc.k255")} />
                <ReferenceLine yAxisId="l" y={0} stroke={C.text} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>{t("labs.macroFrontier.misc.k256")}</Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 12. Climate ── */
function ClimatePanel() {
  const { t } = useTranslation();
  const [price, setPrice] = useState(150);
  const [share, setShare] = useState(0.06);
  const [years, setYears] = useState(30);
  const [green, setGreen] = useState(2);
  const [ab, setAb] = useState(1.2);
  const [dmg, setDmg] = useState(1.5);
  const [warm, setWarm] = useState(3);
  const r = useMemo(() => climateMacroPath({
    carbonPrice: price, energyShare: share, transitionYears: years,
    greenInvestment: green, abatementElasticity: ab, damageIntensity: dmg, warmingBaseline: warm,
  }), [price, share, years, green, ab, dmg, warm]);
  const chart = r.t.map((t, i) => ({
    t, em: +r.emissions[i].toFixed(1), cost: +r.outputCost[i].toFixed(2),
    dam: +r.physicalDamage[i].toFixed(2), net: +r.netOutput[i].toFixed(2), infl: +r.inflation[i].toFixed(2),
  }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroFrontier.misc.k257"), description: t("labs.macroFrontier.misc.k258"), apply: () => { setPrice(180); setYears(30); setGreen(2.5); } },
        { name: t("labs.macroFrontier.misc.k259"), description: t("labs.macroFrontier.misc.k260"), apply: () => { setPrice(300); setYears(10); setGreen(1); } },
        { name: t("labs.macroFrontier.misc.k261"), description: t("labs.macroFrontier.misc.k262"), apply: () => { setPrice(10); setGreen(0.2); setWarm(4); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroFrontier.misc.k263")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroFrontier.misc.k264")} value={price} min={0} max={400} step={10} onChange={setPrice} />
            <Slider label={t("labs.macroFrontier.misc.k265")} value={share} min={0.02} max={0.15} step={0.005} onChange={setShare} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroFrontier.misc.k266")} value={years} min={5} max={40} step={1} onChange={setYears} />
            <Slider label={t("labs.macroFrontier.misc.k267")} value={green} min={0} max={5} step={0.1} onChange={setGreen} />
            <Slider label={t("labs.macroFrontier.misc.k268")} value={ab} min={0.2} max={3} step={0.1} onChange={setAb} />
            <Slider label={t("labs.macroFrontier.misc.k269")} value={dmg} min={0.2} max={4} step={0.1} onChange={setDmg} />
            <Slider label={t("labs.macroFrontier.misc.k270")} value={warm} min={1.5} max={5} step={0.1} onChange={setWarm} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroFrontier.misc.k271")} value={`${r.warming.toFixed(2)}°C`} color={r.warming < 2 ? C.green : r.warming < 3 ? C.gold : C.red} />
            <Stat label={t("labs.macroFrontier.misc.k272")} value={`${r.npvTransitionCost.toFixed(1)}%`} color={C.teal} sub={t("labs.macroFrontier.misc.k273")} />
            <Stat label={t("labs.macroFrontier.misc.k274")} value={`${Math.max(...r.inflation).toFixed(2)} pp`} color={C.gold} />
            <Stat label={t("labs.macroFrontier.misc.k275")} value={r.crossover != null ? t("labs.macroFrontier.r7.crossover", { defaultValue: "第 {{year}} 年起", year: r.crossover }) : t("labs.macroFrontier.r7.noCrossover", { defaultValue: "本情景下未跨越" })} color={r.crossover != null ? C.green : C.red} />
          </div>
        </div>
        <Panel title={t("labs.macroFrontier.misc.k277")}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.r7.year", { defaultValue: "年" }), position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.r7.emissions", { defaultValue: "排放指数" }), angle: -90, position: "insideLeft", fill: C.gold, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: t("labs.macroFrontier.r7.output", { defaultValue: "% 产出" }), angle: 90, position: "insideRight", fill: C.red, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area yAxisId="l" type="monotone" dataKey="em" stroke={C.gold} fill={C.gold} fillOpacity={0.15} name={t("labs.macroFrontier.misc.k280")} />
                <Line yAxisId="r" type="monotone" dataKey="cost" stroke={C.teal} dot={false} strokeWidth={1.5} name={t("labs.macroFrontier.misc.k281")} />
                <Line yAxisId="r" type="monotone" dataKey="dam" stroke={C.red} dot={false} strokeWidth={1.5} name={t("labs.macroFrontier.misc.k282")} />
                <Line yAxisId="r" type="monotone" dataKey="net" stroke={C.blue} dot={false} strokeWidth={2} name={t("labs.macroFrontier.misc.k283")} />
                <ReferenceLine yAxisId="r" y={0} stroke={C.text} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>
            {t("labs.macroFrontier.misc.k284")}
          </Note>
        </Panel>
      </div>
    </div>
  );
}
