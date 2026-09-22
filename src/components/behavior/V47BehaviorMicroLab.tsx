import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToolTab } from "@/lib/useToolTab";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Area, ComposedChart, ScatterChart, Scatter,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  hyperbolicDiscount,
  dsswNoiseTraderIRF,
  overconfidenceOutcome,
  dispositionSim,
  kyleEquilibrium,
  glostenMilgromSpread,
  rollSpread,
  almgrenChriss,
  amihudIlliq,
} from "@/lib/quant/behaviorMicro";

type Tab = "behavior" | "micro";

const TABS: { id: Tab; title: string; kicker: string; desc: string }[] = [
  { id: "behavior", title: "行为金融", kicker: "Behavioral", desc: "双曲贴现 · DSSW · 过度自信 · 处置效应" },
  { id: "micro",    title: "市场微观结构", kicker: "Microstructure", desc: "Kyle · Glosten-Milgrom · Roll · Almgren-Chriss · Amihud" },
];

export default function V47BehaviorMicroLab() {
  const { t } = useTranslation();
  const [tab, setTab] = useToolTab<Tab>(["behavior", "micro"], "behavior");
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V4.7 · Behavior &amp; Microstructure Lab</p>
        <h2 className="text-2xl font-serif text-foreground">{t("labs.behaviorMicro.title")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          {t("labs.behaviorMicro.subtitle")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                tab === tb.id ? "bg-gold/15 border-gold/60 text-gold"
                             : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{tb.kicker}</span>{t(`labs.behaviorMicro.tab.${tb.id}`)}
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "behavior" ? <BehaviorPanels /> : <MicrostructurePanels />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">{t("labs.behaviorMicro.references")}</p>
        <p>
          Laibson (1997) Golden Eggs and Hyperbolic Discounting · De Long, Shleifer, Summers, Waldmann (1990)
          Noise Trader Risk · Odean (1998), Barber-Odean (2001) Trading is Hazardous to Your Wealth ·
          Kyle (1985) Continuous Auctions and Insider Trading · Glosten-Milgrom (1985) Bid, Ask and Transaction Prices ·
          Roll (1984) A Simple Implicit Measure of the Bid-Ask Spread · Almgren-Chriss (2000) Optimal Execution of
          Portfolio Transactions · Amihud (2002) Illiquidity and Stock Returns.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════ Behavior tab ═══════════════════════ */
function BehaviorPanels() {
  return (
    <div className="space-y-6">
      <HyperbolicPanel />
      <DsswPanel />
      <OverconfidencePanel />
      <DispositionPanel />
    </div>
  );
}

/* ─── 1. Hyperbolic discounting ─── */
function HyperbolicPanel() {
  const { t } = useTranslation();
  const [beta, setBeta] = useState(0.7);
  const [delta, setDelta] = useState(0.96);
  const [T, setT] = useState(20);
  const o = useMemo(() => hyperbolicDiscount(beta, delta, T), [beta, delta, T]);
  const data = o.years.map((y, i) => ({
    t: y,
    hyp: +o.hyperbolic[i].toFixed(4),
    exp: +o.exponential[i].toFixed(4),
  }));
  return (
    <ToolCard title={t("labs.behaviorMicro.hyperbolic.title")} kicker="Quasi-hyperbolic β-δ (Laibson 1997)"
      formula="D(t) = β · δᵗ  (t≥1),  D(0)=1">
      <PresetButtons presets={[
        { name: t("labs.behaviorMicro.hyperbolic.preset.laibsonName"), description: t("labs.behaviorMicro.hyperbolic.preset.laibsonDesc"), apply: () => { setBeta(0.7); setDelta(0.96); } },
        { name: t("labs.behaviorMicro.hyperbolic.preset.presentBiasName"), description: t("labs.behaviorMicro.hyperbolic.preset.presentBiasDesc"), apply: () => { setBeta(0.5); setDelta(0.95); } },
        { name: t("labs.behaviorMicro.hyperbolic.preset.exponentialName"), description: t("labs.behaviorMicro.hyperbolic.preset.exponentialDesc"), apply: () => { setBeta(1); setDelta(0.95); } },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label={t("labs.behaviorMicro.hyperbolic.betaLabel")} value={beta} min={0.3} max={1} step={0.01} onChange={setBeta}/>
          <Slider label={t("labs.behaviorMicro.hyperbolic.deltaLabel")} value={delta} min={0.85} max={0.99} step={0.005} onChange={setDelta}/>
          <Slider label={t("labs.behaviorMicro.hyperbolic.windowLabel")} value={T} min={5} max={40} step={1} onChange={setT} fmt={(v)=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label={t("labs.behaviorMicro.hyperbolic.d1HypLabel")} value={o.hyperbolic[1].toFixed(3)} color={C.gold}/>
            <Stat label={t("labs.behaviorMicro.hyperbolic.d1ExpLabel")} value={o.exponential[1].toFixed(3)} color={C.blue}/>
            <Stat label={t("labs.behaviorMicro.hyperbolic.reversalLabel")} value={o.preferenceReversal ? t("labs.behaviorMicro.hyperbolic.exists") : t("labs.behaviorMicro.hyperbolic.none")} color={o.preferenceReversal ? C.red : C.green}/>
            <Stat label={t("labs.behaviorMicro.hyperbolic.dtHypLabel")} value={o.hyperbolic[T].toFixed(3)} color={C.text}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="t" stroke={C.text} tick={{fontSize:10}} label={{value:t("labs.behaviorMicro.hyperbolic.yearAxis"), position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}} domain={[0,1]}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Line type="monotone" dataKey="hyp" name={t("labs.behaviorMicro.hyperbolic.hypLineName")} stroke={C.gold} strokeWidth={2.5} dot={false}/>
              <Line type="monotone" dataKey="exp" name={t("labs.behaviorMicro.hyperbolic.expLineName")} stroke={C.blue} strokeWidth={2} strokeDasharray="4 3" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 2. DSSW noise trader IRF ─── */
function DsswPanel() {
  const { t } = useTranslation();
  const [rho, setRho] = useState(0.75);
  const [shock, setShock] = useState(1);
  const [arb, setArb] = useState(0.4);
  const o = useMemo(() => dsswNoiseTraderIRF({ rho, shock, arbShare: arb, horizon: 24 }), [rho, shock, arb]);
  const data = o.t.map((t, i) => ({ t, mp: +o.mispricing[i].toFixed(4), sent: +o.sentiment[i].toFixed(4) }));
  return (
    <ToolCard title={t("labs.behaviorMicro.dssw.title")} kicker="DSSW (1990) Noise Trader Risk"
      formula="mispricing(t) = (1 − σ_arb) · sentiment(t),  sentiment ~ AR(1)">
      <PresetButtons presets={[
        { name: t("labs.behaviorMicro.dssw.preset.persistentName"), description: t("labs.behaviorMicro.dssw.preset.persistentDesc"), apply: () => setRho(0.9) },
        { name: t("labs.behaviorMicro.dssw.preset.fastRevertName"), description: t("labs.behaviorMicro.dssw.preset.fastRevertDesc"), apply: () => setRho(0.3) },
        { name: t("labs.behaviorMicro.dssw.preset.deepPocketName"), description: t("labs.behaviorMicro.dssw.preset.deepPocketDesc"), apply: () => setArb(0.8) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label={t("labs.behaviorMicro.dssw.rhoLabel")} value={rho} min={0} max={0.98} step={0.01} onChange={setRho}/>
          <Slider label={t("labs.behaviorMicro.dssw.shockLabel")} value={shock} min={-2} max={2} step={0.1} onChange={setShock}/>
          <Slider label={t("labs.behaviorMicro.dssw.arbShareLabel")} value={arb} min={0} max={1} step={0.05} onChange={setArb}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label={t("labs.behaviorMicro.dssw.t0Label")} value={o.mispricing[0].toFixed(3)} color={C.red}/>
            <Stat label={t("labs.behaviorMicro.dssw.t12Label")} value={o.mispricing[12].toFixed(3)} color={C.gold}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="t" stroke={C.text} tick={{fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <ReferenceLine y={0} stroke={C.text}/>
              <Area type="monotone" dataKey="mp" name={t("labs.behaviorMicro.dssw.mispricingName")} fill={C.red} stroke={C.red} fillOpacity={0.15}/>
              <Line type="monotone" dataKey="sent" name={t("labs.behaviorMicro.dssw.sentimentName")} stroke={C.blue} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 3. Overconfidence outcome ─── */
function OverconfidencePanel() {
  const { t } = useTranslation();
  const [k, setK] = useState(2.5);
  const [alpha, setAlpha] = useState(0.04);
  const [cost, setCost] = useState(0.002);
  const [turnover0, setTurnover0] = useState(1);
  const o = useMemo(() => overconfidenceOutcome({ k, baseAlpha: alpha, costPerTrade: cost, turnoverBase: turnover0 }),
    [k, alpha, cost, turnover0]);
  // Sweep k for chart
  const curve = useMemo(() => {
    const arr: { k:number; net:number; drag:number }[] = [];
    for (let kk = 1; kk <= 5; kk += 0.1) {
      const r = overconfidenceOutcome({ k: kk, baseAlpha: alpha, costPerTrade: cost, turnoverBase: turnover0 });
      arr.push({ k: +kk.toFixed(2), net: +(r.netAlpha*100).toFixed(3), drag: +(r.costDrag*100).toFixed(3) });
    }
    return arr;
  }, [alpha, cost, turnover0]);
  return (
    <ToolCard title={t("labs.behaviorMicro.overconfidence.title")} kicker="Barber & Odean (2001)"
      formula="turnover = k · turnover₀,   net α = α − k · turnover₀ · cost">
      <PresetButtons presets={[
        { name: t("labs.behaviorMicro.overconfidence.preset.barberOdeanName"), description: t("labs.behaviorMicro.overconfidence.preset.barberOdeanDesc"), apply: () => setK(2.5) },
        { name: t("labs.behaviorMicro.overconfidence.preset.extremeName"), description: t("labs.behaviorMicro.overconfidence.preset.extremeDesc"), apply: () => setK(4) },
        { name: t("labs.behaviorMicro.overconfidence.preset.wellCalibratedName"), description: t("labs.behaviorMicro.overconfidence.preset.wellCalibratedDesc"), apply: () => setK(1) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label={t("labs.behaviorMicro.overconfidence.kLabel")} value={k} min={1} max={5} step={0.05} onChange={setK}/>
          <Slider label={t("labs.behaviorMicro.overconfidence.baseTurnoverLabel")} value={turnover0} min={0.2} max={3} step={0.1} onChange={setTurnover0}/>
          <Slider label={t("labs.behaviorMicro.overconfidence.grossAlphaLabel")} value={alpha} min={0} max={0.15} step={0.005} onChange={setAlpha} fmt={v=>(v*100).toFixed(2)+"%"}/>
          <Slider label={t("labs.behaviorMicro.overconfidence.perTradeCostLabel")} value={cost} min={0.0005} max={0.01} step={0.0005} onChange={setCost} fmt={v=>(v*10000).toFixed(0)+"bps"}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label={t("labs.behaviorMicro.overconfidence.actualTurnoverLabel")} value={o.turnover.toFixed(2)+"x"} color={C.blue}/>
            <Stat label={t("labs.behaviorMicro.overconfidence.costDragLabel")} value={(o.costDrag*100).toFixed(2)+"%"} color={C.red}/>
            <Stat label={t("labs.behaviorMicro.overconfidence.grossAlphaStatLabel")} value={(o.grossAlpha*100).toFixed(2)+"%"} color={C.text}/>
            <Stat label={t("labs.behaviorMicro.overconfidence.netAlphaLabel")} value={(o.netAlpha*100).toFixed(2)+"%"} color={o.netAlpha>=0?C.green:C.red}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <LineChart data={curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="k" stroke={C.text} tick={{fontSize:10}} label={{value:"k", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}} label={{value:"%", angle:-90, position:"insideLeft", fill:C.text, fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <ReferenceLine y={0} stroke={C.text}/>
              <ReferenceLine x={k} stroke={C.gold} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="net" name={t("labs.behaviorMicro.overconfidence.netAlphaChartName")} stroke={C.green} strokeWidth={2.5} dot={false}/>
              <Line type="monotone" dataKey="drag" name={t("labs.behaviorMicro.overconfidence.costDragChartName")} stroke={C.red} strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 4. Disposition effect MC ─── */
function DispositionPanel() {
  const { t } = useTranslation();
  const [gainP, setGainP] = useState(0.15);
  const [lossP, setLossP] = useState(0.05);
  const [sigma, setSigma] = useState(0.25);
  const [drift, setDrift] = useState(0.05);
  const [N, setN] = useState(200);
  const sim = useMemo(() => dispositionSim({ N, drift, sigma, gainSellProb: gainP, lossSellProb: lossP, seed: 7 }),
    [N, drift, sigma, gainP, lossP]);
  const scatter = sim.paths.slice(0, 200).map((p, i) => {
    const t = p.sold >= 0 ? p.sold : p.pnl.length - 1;
    return { i, t, pnl: +(p.pnl[t]*100).toFixed(2), sold: p.sold >= 0 };
  });
  return (
    <ToolCard title={t("labs.behaviorMicro.disposition.title")} kicker="Odean (1998) PGR vs PLR"
      formula="P(卖出 | 盈利) > P(卖出 | 亏损)  ⇒  PGR / PLR > 1">
      <PresetButtons presets={[
        { name: t("labs.behaviorMicro.disposition.preset.typicalName"), description: t("labs.behaviorMicro.disposition.preset.typicalDesc"), apply: () => { setGainP(0.15); setLossP(0.05); } },
        { name: t("labs.behaviorMicro.disposition.preset.symmetricName"), description: t("labs.behaviorMicro.disposition.preset.symmetricDesc"), apply: () => { setGainP(0.1); setLossP(0.1); } },
        { name: t("labs.behaviorMicro.disposition.preset.reverseName"), description: t("labs.behaviorMicro.disposition.preset.reverseDesc"), apply: () => { setGainP(0.05); setLossP(0.15); } },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label={t("labs.behaviorMicro.disposition.gainProbLabel")} value={gainP} min={0.01} max={0.3} step={0.01} onChange={setGainP}/>
          <Slider label={t("labs.behaviorMicro.disposition.lossProbLabel")} value={lossP} min={0.01} max={0.3} step={0.01} onChange={setLossP}/>
          <Slider label={t("labs.behaviorMicro.disposition.driftLabel")} value={drift} min={-0.2} max={0.2} step={0.01} onChange={setDrift} fmt={v=>(v*100).toFixed(0)+"%"}/>
          <Slider label={t("labs.behaviorMicro.disposition.sigmaLabel")} value={sigma} min={0.05} max={0.6} step={0.01} onChange={setSigma} fmt={v=>(v*100).toFixed(0)+"%"}/>
          <Slider label={t("labs.behaviorMicro.disposition.nSimLabel")} value={N} min={50} max={500} step={50} onChange={setN} fmt={v=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label={t("labs.behaviorMicro.disposition.pgrLabel")} value={sim.pgr.toFixed(3)} color={C.green}/>
            <Stat label={t("labs.behaviorMicro.disposition.plrLabel")} value={sim.plr.toFixed(3)} color={C.red}/>
            <Stat label={t("labs.behaviorMicro.disposition.pgrPlrLabel")} value={isFinite(sim.ratio) ? sim.ratio.toFixed(2) : "∞"} color={C.gold} sub={sim.ratio>1?t("labs.behaviorMicro.disposition.dispositionSub"):t("labs.behaviorMicro.disposition.noneSub")}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis type="number" dataKey="t" name={t("labs.behaviorMicro.disposition.holdDaysAxis")} stroke={C.text} tick={{fontSize:10}}/>
              <YAxis type="number" dataKey="pnl" name={t("labs.behaviorMicro.disposition.cumReturnAxis")} stroke={C.text} tick={{fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }}/>
              <ReferenceLine y={0} stroke={C.text}/>
              <Scatter name={t("labs.behaviorMicro.disposition.soldName")} data={scatter.filter(s=>s.sold)} fill={C.gold}/>
              <Scatter name={t("labs.behaviorMicro.disposition.heldName")} data={scatter.filter(s=>!s.sold)} fill={C.blue}/>
              <Legend wrapperStyle={{fontSize:11}}/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ═══════════════════════ Microstructure tab ═══════════════════════ */
function MicrostructurePanels() {
  return (
    <div className="space-y-6">
      <KylePanel />
      <GMPanel />
      <RollPanel />
      <AlmgrenPanel />
    </div>
  );
}

/* ─── 5. Kyle 1985 ─── */
function KylePanel() {
  const { t } = useTranslation();
  const [sigmaV, setSigmaV] = useState(1);
  const [sigmaU, setSigmaU] = useState(2);
  const [v, setV] = useState(105);
  const [p0, setP0] = useState(100);
  const eq = useMemo(() => kyleEquilibrium({ sigmaV, sigmaU, v, p0 }), [sigmaV, sigmaU, v, p0]);
  // depth vs σ_u
  const curve = useMemo(() => {
    const arr: { su:number; depth:number; profit:number }[] = [];
    for (let su = 0.2; su <= 5; su += 0.1) {
      const e = kyleEquilibrium({ sigmaV, sigmaU: su, v, p0 });
      arr.push({ su: +su.toFixed(2), depth: +e.depth.toFixed(3), profit: +e.expectedProfit.toFixed(3) });
    }
    return arr;
  }, [sigmaV, v, p0]);
  return (
    <ToolCard title={t("labs.behaviorMicro.kyle.title")} kicker="Insider Trading & Price Impact"
      formula={t("labs.behaviorMicro.kyle.formula")}>
      <PresetButtons presets={[
        { name: t("labs.behaviorMicro.kyle.preset.stealthyName"), description: t("labs.behaviorMicro.kyle.preset.stealthyDesc"), apply: () => setSigmaU(5) },
        { name: t("labs.behaviorMicro.kyle.preset.extremeAsymName"), description: t("labs.behaviorMicro.kyle.preset.extremeAsymDesc"), apply: () => setSigmaV(3) },
        { name: t("labs.behaviorMicro.kyle.preset.smallEdgeName"), description: t("labs.behaviorMicro.kyle.preset.smallEdgeDesc"), apply: () => setV(101) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label={t("labs.behaviorMicro.kyle.sigmaVLabel")} value={sigmaV} min={0.2} max={4} step={0.1} onChange={setSigmaV}/>
          <Slider label={t("labs.behaviorMicro.kyle.sigmaULabel")} value={sigmaU} min={0.2} max={5} step={0.1} onChange={setSigmaU}/>
          <Slider label={t("labs.behaviorMicro.kyle.vLabel")} value={v} min={90} max={120} step={0.5} onChange={setV}/>
          <Slider label={t("labs.behaviorMicro.kyle.p0Label")} value={p0} min={90} max={120} step={0.5} onChange={setP0}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label={t("labs.behaviorMicro.kyle.lambdaLabel")} value={eq.lambda.toFixed(4)} color={C.red}/>
            <Stat label={t("labs.behaviorMicro.kyle.depthLabel")} value={eq.depth.toFixed(2)} color={C.green}/>
            <Stat label={t("labs.behaviorMicro.kyle.xStarLabel")} value={eq.xStar.toFixed(2)} color={C.gold}/>
            <Stat label={t("labs.behaviorMicro.kyle.expProfitLabel")} value={eq.expectedProfit.toFixed(2)} color={C.blue}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <ComposedChart data={curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="su" stroke={C.text} tick={{fontSize:10}} label={{value:"σ_u", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
              <YAxis yAxisId="L" stroke={C.text} tick={{fontSize:10}}/>
              <YAxis yAxisId="R" orientation="right" stroke={C.text} tick={{fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <ReferenceLine x={sigmaU} stroke={C.gold} strokeDasharray="3 3"/>
              <Line yAxisId="L" type="monotone" dataKey="depth" name={t("labs.behaviorMicro.kyle.depthChartName")} stroke={C.green} strokeWidth={2.5} dot={false}/>
              <Line yAxisId="R" type="monotone" dataKey="profit" name={t("labs.behaviorMicro.kyle.profitChartName")} stroke={C.blue} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 6. Glosten-Milgrom ─── */
function GMPanel() {
  const { t } = useTranslation();
  const [alpha, setAlpha] = useState(0.3);
  const [vH, setVH] = useState(110);
  const [vL, setVL] = useState(90);
  const [pi, setPi] = useState(0.5);
  const gm = useMemo(() => glostenMilgromSpread({ alpha, vH, vL, pi }), [alpha, vH, vL, pi]);
  const curve = useMemo(() => {
    const arr: { a:number; spread:number }[] = [];
    for (let a = 0; a <= 1; a += 0.02) {
      const s = glostenMilgromSpread({ alpha: a, vH, vL, pi });
      arr.push({ a: +a.toFixed(2), spread: +s.spread.toFixed(3) });
    }
    return arr;
  }, [vH, vL, pi]);
  return (
    <ToolCard title={t("labs.behaviorMicro.glostenMilgrom.title")} kicker="Adverse Selection Spread"
      formula={t("labs.behaviorMicro.glostenMilgrom.formula")}>
      <PresetButtons presets={[
        { name: t("labs.behaviorMicro.glostenMilgrom.preset.lowInformedName"), description: t("labs.behaviorMicro.glostenMilgrom.preset.lowInformedDesc"), apply: () => setAlpha(0.1) },
        { name: t("labs.behaviorMicro.glostenMilgrom.preset.highInformedName"), description: t("labs.behaviorMicro.glostenMilgrom.preset.highInformedDesc"), apply: () => setAlpha(0.6) },
        { name: t("labs.behaviorMicro.glostenMilgrom.preset.pessimisticName"), description: t("labs.behaviorMicro.glostenMilgrom.preset.pessimisticDesc"), apply: () => setPi(0.3) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label={t("labs.behaviorMicro.glostenMilgrom.alphaLabel")} value={alpha} min={0} max={0.95} step={0.01} onChange={setAlpha}/>
          <Slider label={t("labs.behaviorMicro.glostenMilgrom.piLabel")} value={pi} min={0.05} max={0.95} step={0.01} onChange={setPi}/>
          <Slider label="vH" value={vH} min={100} max={130} step={1} onChange={setVH} fmt={v=>v.toFixed(0)}/>
          <Slider label="vL" value={vL} min={70} max={100} step={1} onChange={setVL} fmt={v=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label={t("labs.behaviorMicro.glostenMilgrom.askLabel")} value={gm.ask.toFixed(3)} color={C.red}/>
            <Stat label={t("labs.behaviorMicro.glostenMilgrom.bidLabel")} value={gm.bid.toFixed(3)} color={C.green}/>
            <Stat label={t("labs.behaviorMicro.glostenMilgrom.spreadLabel")} value={gm.spread.toFixed(3)} color={C.gold}/>
            <Stat label={t("labs.behaviorMicro.glostenMilgrom.midLabel")} value={((gm.ask+gm.bid)/2).toFixed(3)} color={C.text}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <LineChart data={curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="a" stroke={C.text} tick={{fontSize:10}} label={{value:"α", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <ReferenceLine x={alpha} stroke={C.gold} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="spread" name={t("labs.behaviorMicro.glostenMilgrom.spreadChartName")} stroke={C.gold} strokeWidth={2.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 7. Roll spread from synthetic ticks ─── */
function RollPanel() {
  const { t } = useTranslation();
  const [trueSpread, setTrueSpread] = useState(0.4);
  const [flip, setFlip] = useState(0.5);
  const [n, setN] = useState(400);
  const [seed, setSeed] = useState(3);

  const { series, est } = useMemo(() => {
    let s = (seed >>> 0) || 1;
    const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    let q = 1;
    const prices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (rng() < flip) q = -q;
      prices.push(100 + (trueSpread / 2) * q);
    }
    const est = rollSpread(prices);
    const series = prices.slice(0, 120).map((p, i) => ({ i, p: +p.toFixed(3) }));
    return { series, est };
  }, [trueSpread, flip, n, seed]);

  return (
    <ToolCard title={t("labs.behaviorMicro.roll.title")} kicker="Serial-covariance estimator"
      formula="ŝ = 2 · √(−cov(Δpₜ, Δpₜ₋₁))">
      <PresetButtons presets={[
        { name: t("labs.behaviorMicro.roll.preset.wideSpreadName"), description: t("labs.behaviorMicro.roll.preset.wideSpreadDesc"), apply: () => setTrueSpread(0.8) },
        { name: t("labs.behaviorMicro.roll.preset.tightSpreadName"), description: t("labs.behaviorMicro.roll.preset.tightSpreadDesc"), apply: () => setTrueSpread(0.05) },
        { name: t("labs.behaviorMicro.roll.preset.trendingName"), description: t("labs.behaviorMicro.roll.preset.trendingDesc"), apply: () => setFlip(0.2) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label={t("labs.behaviorMicro.roll.trueSpreadLabel")} value={trueSpread} min={0.01} max={1.5} step={0.01} onChange={setTrueSpread}/>
          <Slider label={t("labs.behaviorMicro.roll.flipRateLabel")} value={flip} min={0.1} max={0.9} step={0.05} onChange={setFlip}/>
          <Slider label={t("labs.behaviorMicro.roll.sampleSizeLabel")} value={n} min={100} max={2000} step={100} onChange={setN} fmt={v=>v.toFixed(0)}/>
          <Slider label={t("labs.behaviorMicro.roll.seedLabel")} value={seed} min={1} max={99} step={1} onChange={setSeed} fmt={v=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label={t("labs.behaviorMicro.roll.trueSLabel")} value={trueSpread.toFixed(3)} color={C.text}/>
            <Stat label={t("labs.behaviorMicro.roll.rollEstLabel")} value={est.spread.toFixed(3)} color={C.gold}/>
            <Stat label={t("labs.behaviorMicro.roll.covLabel")} value={est.covariance.toFixed(4)} color={est.covariance<0?C.red:C.green} sub={t("labs.behaviorMicro.roll.covSub")}/>
            <Stat label={t("labs.behaviorMicro.roll.errorLabel")} value={((est.spread-trueSpread)*100).toFixed(1)+"bp"} color={C.blue}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="i" stroke={C.text} tick={{fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}} domain={["auto","auto"]}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Line type="stepAfter" dataKey="p" name="tick price" stroke={C.gold} strokeWidth={1.5} dot={{r:1.5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 8. Almgren-Chriss + Amihud ─── */
function AlmgrenPanel() {
  const { t } = useTranslation();
  const [X, setX] = useState(100000);
  const [T, setT] = useState(1);
  const [N, setN] = useState(20);
  const [eta, setEta] = useState(0.1);
  const [gamma, setGamma] = useState(0.02);
  const [sigma, setSigma] = useState(0.3);
  const [lam, setLam] = useState(5);

  const sol = useMemo(() => almgrenChriss({ X, T, N, eta, gamma, sigma, lambda: lam }), [X, T, N, eta, gamma, sigma, lam]);
  const chart = sol.times.map((t, i) => ({
    t: +t.toFixed(3),
    optimal: +sol.holdings[i].toFixed(1),
    vwap: +sol.linearVWAP[i].toFixed(1),
  }));

  // Efficient frontier: sweep λ
  const frontier = useMemo(() => {
    const arr: { cost:number; std:number; lam:number }[] = [];
    const ls = [0, 0.5, 1, 2, 5, 10, 25, 50, 100, 200];
    for (const l of ls) {
      const r = almgrenChriss({ X, T, N, eta, gamma, sigma, lambda: l });
      arr.push({ cost: +r.expectedCost.toFixed(1), std: +Math.sqrt(r.variance).toFixed(1), lam: l });
    }
    return arr;
  }, [X, T, N, eta, gamma, sigma]);

  // Amihud illustrative
  const amihud = useMemo(() => amihudIlliq(
    [0.012, -0.018, 0.007, -0.02, 0.011],
    [8e7, 8e7, 8e7, 8e7, 8e7],
  ), []);

  return (
    <ToolCard title={t("labs.behaviorMicro.almgrenChriss.title")} kicker="Optimal Liquidation Frontier"
      formula={t("labs.behaviorMicro.almgrenChriss.formula")}>
      <PresetButtons presets={[
        { name: t("labs.behaviorMicro.almgrenChriss.preset.riskNeutralName"), description: t("labs.behaviorMicro.almgrenChriss.preset.riskNeutralDesc"), apply: () => setLam(0) },
        { name: t("labs.behaviorMicro.almgrenChriss.preset.aggressiveName"), description: t("labs.behaviorMicro.almgrenChriss.preset.aggressiveDesc"), apply: () => setLam(50) },
        { name: t("labs.behaviorMicro.almgrenChriss.preset.highImpactName"), description: t("labs.behaviorMicro.almgrenChriss.preset.highImpactDesc"), apply: () => setEta(0.3) },
        { name: t("labs.behaviorMicro.almgrenChriss.preset.lowVolName"), description: t("labs.behaviorMicro.almgrenChriss.preset.lowVolDesc"), apply: () => setSigma(0.1) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label={t("labs.behaviorMicro.almgrenChriss.xLabel")} value={X} min={10000} max={500000} step={10000} onChange={setX} fmt={v=>(v/1000).toFixed(0)+"k"}/>
          <Slider label={t("labs.behaviorMicro.almgrenChriss.tLabel")} value={T} min={0.25} max={5} step={0.25} onChange={setT}/>
          <Slider label={t("labs.behaviorMicro.almgrenChriss.nLabel")} value={N} min={5} max={60} step={1} onChange={setN} fmt={v=>v.toFixed(0)}/>
          <Slider label={t("labs.behaviorMicro.almgrenChriss.etaLabel")} value={eta} min={0.01} max={0.5} step={0.01} onChange={setEta}/>
          <Slider label={t("labs.behaviorMicro.almgrenChriss.gammaLabel")} value={gamma} min={0} max={0.1} step={0.005} onChange={setGamma}/>
          <Slider label={t("labs.behaviorMicro.almgrenChriss.sigmaLabel")} value={sigma} min={0.05} max={0.8} step={0.01} onChange={setSigma}/>
          <Slider label={t("labs.behaviorMicro.almgrenChriss.lambdaLabel")} value={lam} min={0} max={200} step={1} onChange={setLam} fmt={v=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label={t("labs.behaviorMicro.almgrenChriss.kappaLabel")} value={sol.kappa.toFixed(3)} color={C.red}/>
            <Stat label={t("labs.behaviorMicro.almgrenChriss.expCostLabel")} value={sol.expectedCost.toFixed(0)} color={C.gold}/>
            <Stat label={t("labs.behaviorMicro.almgrenChriss.stdCostLabel")} value={Math.sqrt(sol.variance).toFixed(0)} color={C.blue}/>
            <Stat label={t("labs.behaviorMicro.amihud.illiqLabel")} value={(amihud*1e9).toFixed(2)} color={C.text} sub={t("labs.behaviorMicro.amihud.illiqSub")}/>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-3">
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
                <XAxis dataKey="t" stroke={C.text} tick={{fontSize:10}} label={{value:"t", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
                <YAxis stroke={C.text} tick={{fontSize:10}}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="optimal" name={t("labs.behaviorMicro.almgrenChriss.optimalChartName")} stroke={C.gold} strokeWidth={2.5} dot={false}/>
                <Line type="monotone" dataKey="vwap" name={t("labs.behaviorMicro.almgrenChriss.vwapChartName")} stroke={C.blue} strokeWidth={1.5} strokeDasharray="4 3" dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
                <XAxis type="number" dataKey="std" name={t("labs.behaviorMicro.almgrenChriss.stdCostAxisName")} stroke={C.text} tick={{fontSize:10}}
                  label={{value:t("labs.behaviorMicro.almgrenChriss.stdCostAxisLabel"), position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
                <YAxis type="number" dataKey="cost" name={t("labs.behaviorMicro.almgrenChriss.expCostAxisName")} stroke={C.text} tick={{fontSize:10}}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Scatter name={t("labs.behaviorMicro.almgrenChriss.frontierChartName")} data={frontier} fill={C.gold} line={{ stroke: C.gold }} lineType="joint"/>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

/* ═══════════════════════ shared card shell ═══════════════════════ */
function ToolCard({ title, kicker, formula, children }: {
  title: string; kicker: string; formula: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80">{kicker}</p>
        <h3 className="text-lg font-serif text-foreground mt-0.5">{title}</h3>
        <p className="mt-2 text-[11px] font-mono text-muted-foreground bg-secondary/30 border border-border rounded px-3 py-2 inline-block">
          {formula}
        </p>
      </div>
      {children}
    </div>
  );
}