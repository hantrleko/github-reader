import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useToolTab } from "@/lib/useToolTab";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Area, ComposedChart, Bar,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  debtDynamics, fiscalSpaceScore,
  dornbuschIRF,
  bopGaps,
  bggAccelerator,
  zlbNKSolve, forwardGuidanceAmplification,
} from "@/lib/quant/macroAdvanced";

type Tab = "debt" | "fx" | "bgg" | "zlb";

const TABS: { id: Tab; titleKey: string; kicker: string; descKey: string }[] = [
  { id: "debt", titleKey: "labs.macroLab.debtTitle", kicker: "Debt/Blanchard", descKey: "labs.macroLab.debtDescShort" },
  { id: "fx",   titleKey: "labs.macroLab.fxTitle", kicker: "Dornbusch/BOP", descKey: "labs.macroLab.fxDescShort" },
  { id: "bgg",  titleKey: "labs.macroLab.bggTitle",   kicker: "BGG",             descKey: "labs.macroLab.bggDescShort" },
  { id: "zlb",  titleKey: "labs.macroLab.zlbTitle", kicker: "ZLB/FG",         descKey: "labs.macroLab.zlbDescShort" },
];

export default function V46MacroLab() {
  const { t } = useTranslation();
  const [tab, setTab] = useToolTab<Tab>(TABS.map((x) => x.id), "debt");
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V4.6 · Macro Lab</p>
        <h2 className="text-2xl font-serif text-foreground">{t("labs.macroLab.labHeader")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          {t("labs.macroLab.labDesc")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                tab === item.id ? "bg-gold/15 border-gold/60 text-gold"
                             : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{item.kicker}</span>{t(item.titleKey)}
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "debt" && <DebtPanel />}
        {tab === "fx"   && <FxPanel />}
        {tab === "bgg"  && <BGGPanel />}
        {tab === "zlb"  && <ZLBPanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">{t("labs.macroLab.refTitle")}</p>
        <p>Blanchard (2019) Public Debt and Low Interest Rates · Dornbusch (1976) Expectations and Exchange Rate Dynamics · {t("labs.macroLab.bggTitle")} (1999) The Financial Accelerator in a Quantitative Business Cycle Framework · Eggertsson-Woodford (2003) The Zero Bound on Interest Rates · Del Negro-Giannoni-Patterson (2015) The Forward Guidance Puzzle.</p>
      </div>
    </section>
  );
}

/* ─── Panel 1: Debt sustainability & Blanchard ─── */
function DebtPanel() {
  const { t } = useTranslation();
  const [b0, setB0] = useState(1.0);
  const [r, setR] = useState(0.04);
  const [g, setG] = useState(0.02);
  const [s, setS] = useState(0.005);
  const [H, setH] = useState(30);

  const path = useMemo(() => debtDynamics({ b0, r, g, primarySurplus: s, horizon: H }), [b0, r, g, s, H]);
  const chart = path.years.map((y, i) => ({ y, debt: +(path.debt[i] * 100).toFixed(2), interest: +(path.interestBurden[i] * 100).toFixed(2) }));
  const score = fiscalSpaceScore(r, g);
  const regimeColor = score.regime === "safe" ? C.green : score.regime === "watch" ? C.gold : C.red;

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroLab.lowIntTrap"), description: t("labs.macroLab.lowIntTrapDesc"), apply: () => { setR(0.01); setG(0.025); setS(0); } },
        { name: t("labs.macroLab.debtSpiral"), description: t("labs.macroLab.debtSpiralDesc"), apply: () => { setR(0.05); setG(0.015); setS(0); } },
        { name: t("labs.macroLab.fiscalConsolidation"), description: t("labs.macroLab.fiscalConsolidationDesc"), apply: () => { setR(0.04); setG(0.02); setS(0.015); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroLab.debtParams")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroLab.initialDebt")} value={b0} min={0.2} max={2.5} step={0.05} onChange={setB0} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label={t("labs.macroLab.realIntRate")} value={r} min={-0.02} max={0.1} step={0.005} onChange={setR} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroLab.potentialGrowth")} value={g} min={-0.01} max={0.08} step={0.005} onChange={setG} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroLab.primarySurplus")} value={s} min={-0.03} max={0.05} step={0.0025} onChange={setS} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label={t("labs.macroLab.simHorizon")} value={H} min={5} max={60} step={5} onChange={setH} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="r − g" value={`${(score.rMinusG * 100).toFixed(2)}%`} color={regimeColor} sub={score.message} />
            <Stat label={t("labs.macroLab.stabilizingSurplus")} value={`${(path.stabilizingSurplus * 100).toFixed(2)}%`} color={C.gold} sub="(r−g)/(1+g)·b₀" />
            <Stat label={t("labs.macroLab.finalDebt")} value={`${(path.finalDebt * 100).toFixed(1)}%`} color={path.finalDebt > b0 ? C.red : C.green} />
            <Stat label={t("labs.macroLab.fiscalSpace")} value={score.regime === "safe" ? "SAFE" : score.regime === "watch" ? "WATCH" : "DANGER"} color={regimeColor} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t("labs.macroLab.debtTraj")}</p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="y" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroLab.year"), position:"insideBottom", offset:-4, fill:C.text, fontSize:10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: t("labs.macroLab.debtGdpPercent"), angle:-90, position:"insideLeft", fill:C.gold, fontSize:10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: t("labs.macroLab.interestBurdenPercent"), angle:90, position:"insideRight", fill:C.red, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="debt" stroke={C.gold} strokeWidth={2} dot={false} name="Debt/GDP" />
                <Bar yAxisId="r" dataKey="interest" fill={C.red} fillOpacity={0.35} name="(r−g)b_{t−1}" />
                <ReferenceLine yAxisId="l" y={b0 * 100} stroke={C.text} strokeDasharray="4 4" label={{ value: "b₀", fill: C.text, fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            金条 = 债务/GDP;红色柱 = 每期利息-增长差价负担。s &lt; s* 则轨迹上行。
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel 2: FX Overshooting + BOP gaps ─── */
function FxPanel() {
  const { t } = useTranslation();
  const [dm, setDm] = useState(0.05);
  const [theta, setTheta] = useState(0.3);
  const [lambda, setLambda] = useState(2);
  const [H, setH] = useState(24);
  const out = useMemo(() => dornbuschIRF({ moneyShock: dm, theta, phi: 1, lambda, horizon: H }), [dm, theta, lambda, H]);
  const chart = out.t.map((t, i) => ({
    t,
    price: +(out.price[i] * 100).toFixed(3),
    exchange: +(out.exchange[i] * 100).toFixed(3),
    interest: +(out.interest[i] * 100).toFixed(3),
  }));

  // BOP
  const [S, setS] = useState(0.22);
  const [I, setI] = useState(0.20);
  const [T, setT] = useState(0.18);
  const [G, setG] = useState(0.19);
  const bop = useMemo(() => bopGaps({ privateSaving: S, investment: I, taxes: T, govSpending: G }), [S, I, T, G]);
  const caColor = bop.currentAccount > 0 ? C.green : bop.currentAccount < 0 ? C.red : C.gold;

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroLab.usDeficit"), description: t("labs.macroLab.usDeficitDesc"), apply: () => { setS(0.18); setI(0.22); setT(0.17); setG(0.22); } },
        { name: t("labs.macroLab.germanSurplus"), description: t("labs.macroLab.germanSurplusDesc"), apply: () => { setS(0.28); setI(0.22); setT(0.20); setG(0.20); } },
        { name: t("labs.macroLab.strongOvershoot"), description: t("labs.macroLab.strongOvershootDesc"), apply: () => { setDm(0.05); setTheta(0.15); setLambda(1.5); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroLab.fxOvershootingTitle")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroLab.moneyShock")} value={dm} min={-0.1} max={0.1} step={0.005} onChange={setDm} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroLab.priceAdjustment")} value={theta} min={0.05} max={1} step={0.05} onChange={setTheta} />
            <Slider label={t("labs.macroLab.intSemiElasticity")} value={lambda} min={0.5} max={6} step={0.25} onChange={setLambda} />
            <Slider label={t("labs.macroLab.horizonQuarters")} value={H} min={8} max={60} step={2} onChange={setH} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroLab.longRunE")} value={`${(out.longRunE * 100).toFixed(2)}%`} color={C.gold} />
            <Stat label={t("labs.macroLab.initOvershoot")} value={`${(out.overshoot * 100).toFixed(2)}%`} color={C.red} sub="e(0)−e*" />
            <Stat label={t("labs.macroLab.overshootMult")} value={`${(1 + 1 / (lambda * theta)).toFixed(2)}×`} color={C.teal} sub="1+1/(λθ)" />
            <Stat label={t("labs.macroLab.convHalfLife")} value={`${(Math.log(2) / theta).toFixed(1)} ${t("labs.macroLab.periodUnit")}`} color={C.blue} sub={t("labs.macroLab.periods")} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t("labs.macroLab.epiIRF")}</p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="exchange" stroke={C.gold} strokeWidth={2} dot={false} name={t("labs.macroLab.exchangeLabel")} />
                <Line type="monotone" dataKey="price" stroke={C.teal} strokeWidth={2} dot={false} name={t("labs.macroLab.priceLabel")} />
                <Line type="monotone" dataKey="interest" stroke={C.red} strokeWidth={2} dot={false} name={t("labs.macroLab.intDevLabel")} />
                <ReferenceLine y={out.longRunE * 100} stroke={C.text} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            {t("labs.macroLab.fxLegend")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <p className="text-xs font-mono text-gold uppercase tracking-wider mb-3">{t("labs.macroLab.bopTitle")}</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroLab.privateSaving")} value={S} min={0.05} max={0.4} step={0.005} onChange={setS} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroLab.investment")}   value={I} min={0.05} max={0.4} step={0.005} onChange={setI} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroLab.taxes")}   value={T} min={0.05} max={0.4} step={0.005} onChange={setT} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroLab.govSpending")} value={G} min={0.05} max={0.4} step={0.005} onChange={setG} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="S − I" value={`${(bop.privateGap * 100).toFixed(2)}%`} color={bop.privateGap >= 0 ? C.green : C.red} />
            <Stat label="T − G" value={`${(bop.fiscalGap * 100).toFixed(2)}%`} color={bop.fiscalGap >= 0 ? C.green : C.red} />
            <Stat label={t("labs.macroLab.currentAccount")} value={`${(bop.currentAccount * 100).toFixed(2)}%`} color={caColor} sub={bop.regime.toUpperCase()} />
            <Stat label={t("labs.macroLab.netExtFinance")} value={`${(-bop.currentAccount * 100).toFixed(2)}%`} color={C.blue} sub="= −CA" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel 3: BGG accelerator ─── */
function BGGPanel() {
  const { t } = useTranslation();
  const [lev, setLev] = useState(3);
  const [mu, setMu] = useState(0.12);
  const [sig, setSig] = useState(0.5);
  const [rho, setRho] = useState(0.9);
  const [shock, setShock] = useState(-0.02);
  const [H] = useState(20);
  const bgg = useMemo(() => bggAccelerator({ leverage: lev, mu, sigmaOmega: sig, rho, shock, horizon: H }), [lev, mu, sig, rho, shock, H]);
  const rbc = useMemo(() => bggAccelerator({ leverage: lev, mu, sigmaOmega: sig, rho, shock, horizon: H, frictionless: true }), [lev, mu, sig, rho, shock, H]);
  const chart = bgg.t.map((t, i) => ({
    t,
    n: +(bgg.netWorth[i] * 100).toFixed(3),
    efp: +(bgg.efp[i] * 1e4).toFixed(2),
    y_bgg: +(bgg.output[i] * 100).toFixed(3),
    y_rbc: +(rbc.output[i] * 100).toFixed(3),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroLab.healthyFirms"), description: t("labs.macroLab.healthyFirmsDesc"), apply: () => { setLev(2); setMu(0.08); setSig(0.35); } },
        { name: t("labs.macroLab.crisisMoment"), description: t("labs.macroLab.crisisMomentDesc"), apply: () => { setLev(5); setMu(0.18); setSig(0.7); setShock(-0.05); } },
        { name: t("labs.macroLab.posNetWorthShock"), description: t("labs.macroLab.posNetWorthShockDesc"), apply: () => { setShock(0.02); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroLab.bggTitle")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroLab.leverage")} value={lev} min={1.5} max={8} step={0.25} onChange={setLev} />
            <Slider label={t("labs.macroLab.monitoringCost")} value={mu} min={0.02} max={0.3} step={0.01} onChange={setMu} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label={t("labs.macroLab.projectRisk")} value={sig} min={0.1} max={1} step={0.05} onChange={setSig} />
            <Slider label={t("labs.macroLab.persistence")} value={rho} min={0} max={0.98} step={0.02} onChange={setRho} />
            <Slider label={t("labs.macroLab.netWorthShock")} value={shock} min={-0.1} max={0.05} step={0.005} onChange={setShock} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroLab.peakEfp")} value={`${(Math.max(...bgg.efp.map(Math.abs)) * 1e4).toFixed(0)} bp`} color={C.red} />
            <Stat label={t("labs.macroLab.peakOutput")} value={`${(Math.max(...bgg.output.map(Math.abs)) * 100).toFixed(2)}%`} color={C.gold} />
            <Stat label={t("labs.macroLab.ampFactor")} value={`${bgg.amplification.toFixed(2)}×`} color={C.teal} sub="peak ŷ / peak n̂" />
            <Stat label={t("labs.macroLab.vsRbcIncrease")} value={`${((Math.max(...bgg.output.map(Math.abs)) / Math.max(1e-9, Math.max(...rbc.output.map(Math.abs))) - 1) * 100).toFixed(0)}%`} color={C.blue} sub={t("labs.macroLab.periods")} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t("labs.macroLab.bggIrfTitle")}</p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroLab.periods"), position:"insideBottom", offset:-4, fill:C.text, fontSize:10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroLab.deviationPercent"), angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: t("labs.macroLab.efpBp"), angle:90, position:"insideRight", fill:C.red, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="n" stroke={C.teal} strokeWidth={2} dot={false} name={t("labs.macroLab.netWorthHat")} />
                <Line yAxisId="l" type="monotone" dataKey="y_bgg" stroke={C.gold} strokeWidth={2} dot={false} name={t("labs.macroLab.outputHat")} />
                <Line yAxisId="l" type="monotone" dataKey="y_rbc" stroke={C.blue} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={t("labs.macroLab.outputRbc")} />
                <Bar yAxisId="r" dataKey="efp" fill={C.red} fillOpacity={0.3} name={t("labs.macroLab.efpBp")} />
                <ReferenceLine yAxisId="l" y={0} stroke={C.text} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            {t("labs.macroLab.bggLegend")}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel 4: ZLB & Forward guidance ─── */
function ZLBPanel() {
  const { t } = useTranslation();
  const [rNat, setRNat] = useState(-0.01);
  const [zlbK, setZlbK] = useState(4);
  const [sigma, setSigma] = useState(1);
  const [kappa, setKappa] = useState(0.1);
  const [beta] = useState(0.99);
  const [H] = useState(20);

  const base = { sigma, kappa, beta, phiPi: 1.5, phiX: 0.5, rNatural: rNat, zlbPeriods: zlbK, horizon: H };
  const out = useMemo(() => zlbNKSolve(base), [rNat, zlbK, sigma, kappa]);
  const chart = out.t.map((t, i) => ({
    t,
    x: +(out.output[i] * 100).toFixed(3),
    pi: +(out.inflation[i] * 100).toFixed(3),
    i_pol: +(out.policyRate[i] * 100).toFixed(3),
    binding: out.binding[i] ? 100 : 0,
  }));

  const ampSweep = useMemo(() => {
    const arr: { extra: number; amp: number }[] = [];
    for (let k = 0; k <= 8; k++) arr.push({ extra: k, amp: +forwardGuidanceAmplification({ ...base, zlbPeriods: 1 }, k).toFixed(3) });
    return arr;
  }, [rNat, sigma, kappa]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.macroLab.gfcScenario"), description: t("labs.macroLab.gfcScenarioDesc"), apply: () => { setRNat(-0.02); setZlbK(6); } },
        { name: t("labs.macroLab.mildDeflation"), description: t("labs.macroLab.mildDeflationDesc"), apply: () => { setRNat(-0.03); setZlbK(4); } },
        { name: t("labs.macroLab.strongFg"), description: t("labs.macroLab.strongFgDesc"), apply: () => { setKappa(0.3); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroLab.zlbTitle")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroLab.naturalRate")} value={rNat} min={-0.05} max={0.02} step={0.005} onChange={setRNat} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.macroLab.zlbK")} value={zlbK} min={1} max={12} step={1} onChange={setZlbK} />
            <Slider label={t("labs.macroLab.sigmaInter")} value={sigma} min={0.5} max={3} step={0.1} onChange={setSigma} />
            <Slider label={t("labs.macroLab.kappaNKPC")} value={kappa} min={0.02} max={0.5} step={0.02} onChange={setKappa} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroLab.outputGap0")} value={`${(out.outputImpact * 100).toFixed(2)}%`} color={out.outputImpact < 0 ? C.red : C.green} />
            <Stat label={t("labs.macroLab.inflation0")} value={`${(out.inflation[0] * 100).toFixed(2)}%`} color={C.gold} />
            <Stat label={t("labs.macroLab.ampFactor")} value={`${forwardGuidanceAmplification(base, 2).toFixed(2)}×`} color={C.teal} sub={t("labs.macroLab.vsBaseline")} />
            <Stat label={t("labs.macroLab.ampFactor")} value={`${forwardGuidanceAmplification(base, 4).toFixed(2)}×`} color={C.blue} sub="Del Negro et al." />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t("labs.macroLab.zlbChartTitle")}</p>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area yAxisId="l" type="stepAfter" dataKey="binding" stroke="transparent" fill={C.red} fillOpacity={0.06} name={t("labs.macroLab.zlbBinding")} />
                <Line yAxisId="l" type="monotone" dataKey="x" stroke={C.gold} strokeWidth={2} dot={false} name={t("labs.macroLab.outputGap")} />
                <Line yAxisId="l" type="monotone" dataKey="pi" stroke={C.teal} strokeWidth={2} dot={false} name={t("labs.macroLab.inflation")} />
                <Line yAxisId="l" type="monotone" dataKey="i_pol" stroke={C.red} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={t("labs.macroLab.policyRateLabel")} />
                <ReferenceLine yAxisId="l" y={0} stroke={C.text} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t("labs.macroLab.fgAmpTitle")}</p>
        <div className="h-[200px]">
          <ResponsiveContainer>
            <LineChart data={ampSweep}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="extra" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroLab.extraFgPeriods"), position:"insideBottom", offset:-4, fill:C.text, fontSize:10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.macroLab.ampFactor"), angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="amp" stroke={C.gold} strokeWidth={2} dot={{ r: 3 }} name={t("labs.macroLab.x0Mult")} />
              <ReferenceLine y={1} stroke={C.text} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2">
          {t("labs.macroLab.fgProse")}
        </p>
      </div>
    </div>
  );
}
