import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToolTab } from "@/lib/useToolTab";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, ComposedChart, Area,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  cptGamble, cptValue, cptWeight, fourfoldPattern,
  myopicLossAversion, bsvBeliefs, dhsOverconfidence, hongSteinDiffusion,
  limitsToArbitrage, sentimentCrossSection, behavioralCorporate,
} from "@/lib/quant/behaviorFinance";

/* ─────────── shared shell ─────────── */

const Panel = ({ id, title, en, desc, children }: {
  id: string; title: string; en: string; desc: string; children: React.ReactNode;
}) => (
  <section id={id} className="rounded-2xl border border-border bg-card/40 p-5 space-y-5 scroll-mt-24">
    <header>
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold">{en}</p>
      <h3 className="font-display text-xl text-foreground mt-1">{title}</h3>
      <p className="text-xs text-foreground/60 mt-1.5 leading-relaxed max-w-3xl">{desc}</p>
    </header>
    {children}
  </section>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
    {children}
  </div>
);

const Chart = ({ title, height = 240, children }: { title: string; height?: number; children: React.ReactElement }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  </div>
);

type Group = "beliefs" | "preferences" | "arbitrage" | "corporate";

const GROUPS: { id: Group; label: string; en: string; desc: string }[] = [
  { id: "preferences", label: "偏好偏离", en: "Preferences", desc: "累积前景理论 · 短视损失厌恶" },
  { id: "beliefs", label: "信念偏差", en: "Beliefs", desc: "BSV · DHS · Hong-Stein" },
  { id: "arbitrage", label: "有限套利与异象", en: "Limits & Anomalies", desc: "套利约束 · 投资者情绪截面" },
  { id: "corporate", label: "行为公司金融", en: "Behavioral Corporate", desc: "管理者过度自信 · 市场时机" },
];

type PanelId = "cpt" | "mla" | "bsv" | "dhs" | "hs" | "limits" | "sentiment" | "corporate";

const PANEL_GROUP: Record<PanelId, Group> = {
  cpt: "preferences", mla: "preferences",
  bsv: "beliefs", dhs: "beliefs", hs: "beliefs",
  limits: "arbitrage", sentiment: "arbitrage",
  corporate: "corporate",
};

const PANEL_IDS = Object.keys(PANEL_GROUP) as PanelId[];

export default function V59BehaviorTools() {
  const { t, i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const [panel, setPanel] = useToolTab<PanelId>(PANEL_IDS, "cpt");
  const group = PANEL_GROUP[panel];

  useEffect(() => {
    const el = document.getElementById(panel);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [panel]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V5.9 · Behavioral Finance Lab</p>
        <h2 className="text-2xl font-display text-foreground">{t("labs.behavior.title")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          {t("labs.behavior.subtitle")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button key={g.id} onClick={() => setPanel(PANEL_IDS.find((p) => PANEL_GROUP[p] === g.id)!)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono text-left transition-colors ${
                group === g.id ? "bg-gold/15 border-gold/60 text-gold"
                               : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{g.en}</span>{en ? "" : g.label}
              <span className="block text-[10px] opacity-70 mt-0.5">{t(`labs.behavior.group.${g.id}`)}</span>
            </button>
          ))}
        </div>
      </div>


      <motion.div key={group} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {group === "preferences" && <><CptPanel /><MlaPanel /></>}
        {group === "beliefs" && <><BsvPanel /><DhsPanel /><HsPanel /></>}
        {group === "arbitrage" && <><LimitsPanel /><SentimentPanel /></>}
        {group === "corporate" && <CorporatePanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">{t("labs.behavior.references")}</p>
        <p>
          Kahneman &amp; Tversky (1979); Tversky &amp; Kahneman (1992) Cumulative Prospect Theory ·
          Benartzi &amp; Thaler (1995) Myopic Loss Aversion and the Equity Premium Puzzle ·
          Barberis, Shleifer &amp; Vishny (1998) A Model of Investor Sentiment ·
          Daniel, Hirshleifer &amp; Subrahmanyam (1998) Investor Psychology and Security Market Under- and Overreactions ·
          Hong &amp; Stein (1999) A Unified Theory of Underreaction, Momentum Trading and Overreaction ·
          Shleifer &amp; Vishny (1997) The Limits of Arbitrage · Baker &amp; Wurgler (2006) Investor Sentiment and the
          Cross-Section of Stock Returns · Malmendier &amp; Tate (2005); Baker &amp; Wurgler (2002) Market Timing and Capital Structure.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════ 1. Cumulative Prospect Theory ═══════════════ */
function CptPanel() {
  const { t } = useTranslation();
  const [alpha, setAlpha] = useState(0.88);
  const [beta, setBeta] = useState(0.88);
  const [lambda, setLambda] = useState(2.25);
  const [gamma, setGamma] = useState(0.61);
  const [gain, setGain] = useState(100);
  const [loss, setLoss] = useState(100);
  const [p, setP] = useState(0.5);

  const par = { alpha, beta, lambda, gamma };
  const g = useMemo(() => cptGamble(gain, loss, p, par), [gain, loss, p, alpha, beta, lambda, gamma]);
  const cells = useMemo(() => fourfoldPattern(1000, par), [alpha, beta, lambda, gamma]);
  const valueCurve = useMemo(() => {
    const out: { x: number; v: number; eu: number }[] = [];
    for (let x = -100; x <= 100; x += 4) out.push({ x, v: +cptValue(x, par).toFixed(3), eu: x });
    return out;
  }, [alpha, beta, lambda]);
  const weightCurve = useMemo(() => {
    const out: { p: number; w: number; lin: number }[] = [];
    for (let i = 0; i <= 100; i++) out.push({ p: i / 100, w: +cptWeight(i / 100, gamma).toFixed(4), lin: i / 100 });
    return out;
  }, [gamma]);

  return (
    <Panel id="cpt" en="Cumulative Prospect Theory" title={t("labs.behavior.cpt.title")}
      desc={t("labs.behavior.cpt.desc")}>
      <PresetButtons presets={[
        { name: t("labs.behavior.cpt.preset1.name"), description: t("labs.behavior.cpt.preset1.desc"), apply: () => { setAlpha(0.88); setBeta(0.88); setLambda(2.25); setGamma(0.61); } },
        { name: t("labs.behavior.cpt.preset2.name"), description: t("labs.behavior.cpt.preset2.desc"), apply: () => { setAlpha(1); setBeta(1); setLambda(1); setGamma(1); } },
        { name: t("labs.behavior.cpt.preset3.name"), description: t("labs.behavior.cpt.preset3.desc"), apply: () => setLambda(3.5) },
        { name: t("labs.behavior.cpt.preset4.name"), description: t("labs.behavior.cpt.preset4.desc"), apply: () => { setP(0.02); setGain(5000); setLoss(100); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.behavior.cpt.alpha")} value={alpha} min={0.3} max={1} step={0.01} onChange={setAlpha} />
            <Slider label={t("labs.behavior.cpt.beta")} value={beta} min={0.3} max={1} step={0.01} onChange={setBeta} />
            <Slider label={t("labs.behavior.cpt.lambda")} value={lambda} min={1} max={4} step={0.05} onChange={setLambda} />
            <Slider label={t("labs.behavior.cpt.gamma")} value={gamma} min={0.3} max={1} step={0.01} onChange={setGamma} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Slider label={t("labs.behavior.cpt.gain")} value={gain} min={10} max={5000} step={10} fmt={(v) => v.toFixed(0)} onChange={setGain} />
            <Slider label={t("labs.behavior.cpt.loss")} value={loss} min={10} max={5000} step={10} fmt={(v) => v.toFixed(0)} onChange={setLoss} />
            <Slider label={t("labs.behavior.cpt.pWin")} value={p} min={0.01} max={0.99} step={0.01} onChange={setP} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.behavior.cpt.stat.prospectValue")} value={g.prospectValue.toFixed(2)} color={g.prospectValue >= 0 ? C.green : C.red} />
          <Stat label={t("labs.behavior.cpt.stat.ev")} value={g.expectedValue.toFixed(2)} color={C.blue} sub={t("labs.behavior.cpt.stat.evSub")} />
          <Stat label={t("labs.behavior.cpt.stat.ce")} value={g.certaintyEquivalent.toFixed(2)} color={C.gold} sub={t("labs.behavior.cpt.stat.ceSub")} />
          <Stat label={t("labs.behavior.cpt.stat.riskPremium")} value={g.riskPremium.toFixed(2)} color={C.red} sub={t("labs.behavior.cpt.stat.riskPremiumSub")} />
          <Stat label={t("labs.behavior.cpt.stat.wGain")} value={g.wGain.toFixed(3)} color={C.teal} sub={t("labs.behavior.cpt.stat.wGainSub", { p: p.toFixed(2) })} />
          <Stat label={t("labs.behavior.cpt.stat.wLoss")} value={g.wLoss.toFixed(3)} color={C.teal} sub={t("labs.behavior.cpt.stat.wLossSub", { p: (1 - p).toFixed(2) })} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Chart title={t("labs.behavior.cpt.chart.value")}>
          <LineChart data={valueCurve}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={0} stroke={C.text} /><ReferenceLine y={0} stroke={C.text} />
            <Line type="monotone" dataKey="v" name={t("labs.behavior.cpt.legend.vx")} stroke={C.gold} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="eu" name={t("labs.behavior.cpt.legend.linear")} stroke={C.text} strokeWidth={1} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </Chart>
        <Chart title={t("labs.behavior.cpt.chart.weight")}>
          <LineChart data={weightCurve}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="p" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={[0, 1]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="w" name={t("labs.behavior.cpt.legend.wp")} stroke={C.blue} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="lin" name={t("labs.behavior.cpt.legend.diag")} stroke={C.text} strokeWidth={1} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </Chart>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cells.map((c, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {c.domain === "gain" ? t("labs.behavior.cpt.domain.gain") : t("labs.behavior.cpt.domain.loss")} · p={c.probability.toFixed(2)}
            </p>
            <p className="text-sm font-mono mt-1" style={{ color: c.attitude === "risk-seeking" ? C.red : C.green }}>
              {c.attitude === "risk-seeking" ? t("labs.behavior.cpt.attitude.seeking") : c.attitude === "risk-averse" ? t("labs.behavior.cpt.attitude.averse") : t("labs.behavior.cpt.attitude.neutral")}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">CE {c.ce.toFixed(1)} vs EV {c.ev.toFixed(1)}</p>
          </div>
        ))}
      </div>
      <Note>
        <p><span className="text-gold">{t("labs.behavior.cpt.note.label")}</span>{t("labs.behavior.cpt.note.text")}</p>
      </Note>
    </Panel>
  );
}

/* ═══════════════ 2. Myopic loss aversion ═══════════════ */
function MlaPanel() {
  const { t } = useTranslation();
  const [lambda, setLambda] = useState(2.25);
  const [sigma, setSigma] = useState(0.2);
  const [freq, setFreq] = useState(12);
  const o = useMemo(() => myopicLossAversion({ lambda, sigmaAnnual: sigma, evaluationsPerYear: freq, riskFree: 0.02 }), [lambda, sigma, freq]);
  const sweep = useMemo(() => [1, 2, 4, 12, 52, 252].map((n) => ({
    n: n === 1 ? t("labs.behavior.mla.freq.year") : n === 2 ? t("labs.behavior.mla.freq.half") : n === 4 ? t("labs.behavior.mla.freq.quarter") : n === 12 ? t("labs.behavior.mla.freq.month") : n === 52 ? t("labs.behavior.mla.freq.week") : t("labs.behavior.mla.freq.day"),
    premium: +(myopicLossAversion({ lambda, sigmaAnnual: sigma, evaluationsPerYear: n, riskFree: 0.02 }).impliedEquityPremium * 100).toFixed(2),
  })), [lambda, sigma, t]);

  return (
    <Panel id="mla" en="Myopic Loss Aversion" title={t("labs.behavior.mla.title")}
      desc={t("labs.behavior.mla.desc")}>
      <PresetButtons presets={[
        { name: t("labs.behavior.mla.preset1.name"), description: t("labs.behavior.mla.preset1.desc"), apply: () => { setLambda(2.25); setFreq(1); setSigma(0.2); } },
        { name: t("labs.behavior.mla.preset2.name"), description: t("labs.behavior.mla.preset2.desc"), apply: () => setFreq(252) },
        { name: t("labs.behavior.mla.preset3.name"), description: t("labs.behavior.mla.preset3.desc"), apply: () => setLambda(1) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.behavior.mla.lambda")} value={lambda} min={1} max={4} step={0.05} onChange={setLambda} />
          <Slider label={t("labs.behavior.mla.sigma")} value={sigma} min={0.05} max={0.5} step={0.01} fmt={(v) => `${(v * 100).toFixed(0)}%`} onChange={setSigma} />
          <Slider label={t("labs.behavior.mla.freqLabel")} value={freq} min={1} max={252} step={1} fmt={(v) => v.toFixed(0)} onChange={setFreq} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.behavior.mla.stat.premium")} value={`${(o.impliedEquityPremium * 100).toFixed(2)}%`} color={C.gold} sub={t("labs.behavior.mla.stat.premiumSub")} />
          <Stat label={t("labs.behavior.mla.stat.lossProb")} value={`${(o.lossProbability * 100).toFixed(1)}%`} color={C.red} />
          <Stat label={t("labs.behavior.mla.stat.periodVol")} value={`${(o.periodSigma * 100).toFixed(2)}%`} color={C.blue} sub="σ/√n" />
          <Stat label={t("labs.behavior.mla.stat.rationalPremium")} value="0%" color={C.text} sub={t("labs.behavior.mla.stat.rationalPremiumSub")} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Chart title={t("labs.behavior.mla.chart.premium")}>
          <BarChart data={sweep}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="n" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="premium" name={t("labs.behavior.mla.legend.premium")} fill={C.gold} />
          </BarChart>
        </Chart>
        <Chart title={t("labs.behavior.mla.chart.utility")}>
          <LineChart data={o.utilityCurve}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="premium" stroke={C.text} tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="utility" name={t("labs.behavior.mla.legend.utility")} stroke={C.blue} strokeWidth={2.5} dot={false} />
          </LineChart>
        </Chart>
      </div>
      <Note><p><span className="text-gold">{t("labs.behavior.mla.note.label")}</span>{t("labs.behavior.mla.note.text")}</p></Note>
    </Panel>
  );
}

/* ═══════════════ 3. BSV ═══════════════ */
function BsvPanel() {
  const { t } = useTranslation();
  const [piL, setPiL] = useState(0.8);
  const [piH, setPiH] = useState(0.7);
  const [lambda1, setLambda1] = useState(0.6);
  const o = useMemo(() => bsvBeliefs({ piL, piH, lambda1, shock: 1, horizon: 48 }), [piL, piH, lambda1]);
  const data = o.t.map((tt, i) => ({ t: tt, car: +o.car[i].toFixed(4), rational: o.rationalCar[i] }));
  return (
    <Panel id="bsv" en="Barberis-Shleifer-Vishny (1998)" title={t("labs.behavior.bsv.title")}
      desc={t("labs.behavior.bsv.desc")}>
      <PresetButtons presets={[
        { name: t("labs.behavior.bsv.preset1.name"), description: t("labs.behavior.bsv.preset1.desc"), apply: () => { setPiL(0.8); setPiH(0.7); setLambda1(0.6); } },
        { name: t("labs.behavior.bsv.preset2.name"), description: t("labs.behavior.bsv.preset2.desc"), apply: () => setLambda1(1) },
        { name: t("labs.behavior.bsv.preset3.name"), description: t("labs.behavior.bsv.preset3.desc"), apply: () => setLambda1(0) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.behavior.bsv.piL")} value={piL} min={0.5} max={0.99} step={0.01} onChange={setPiL} />
          <Slider label={t("labs.behavior.bsv.piH")} value={piH} min={0.5} max={0.99} step={0.01} onChange={setPiH} />
          <Slider label={t("labs.behavior.bsv.lambda1")} value={lambda1} min={0} max={1} step={0.01} onChange={setLambda1} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.behavior.bsv.stat.underreaction")} value={o.underreaction.toFixed(3)} color={C.blue} sub={t("labs.behavior.bsv.stat.underreactionSub")} />
          <Stat label={t("labs.behavior.bsv.stat.overreaction")} value={o.overreaction.toFixed(3)} color={C.red} sub={t("labs.behavior.bsv.stat.overreactionSub")} />
          <Stat label={t("labs.behavior.bsv.stat.reversal")} value={o.reversal ? t("labs.behavior.common.yes") : t("labs.behavior.common.no")} color={o.reversal ? C.gold : C.text} />
          <Stat label={t("labs.behavior.bsv.stat.finalCar")} value={o.car[o.car.length - 1].toFixed(3)} color={C.green} />
        </div>
      </div>
      <Chart title={t("labs.behavior.bsv.chart.car")} height={280}>
        <LineChart data={data}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
          <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="car" name={t("labs.behavior.bsv.legend.car")} stroke={C.gold} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="rational" name={t("labs.behavior.bsv.legend.rational")} stroke={C.text} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        </LineChart>
      </Chart>
      <Note><p><span className="text-gold">{t("labs.behavior.bsv.note.label")}</span>{t("labs.behavior.bsv.note.text")}</p></Note>
    </Panel>
  );
}

/* ═══════════════ 4. DHS ═══════════════ */
function DhsPanel() {
  const { t } = useTranslation();
  const [k, setK] = useState(2);
  const [psi, setPsi] = useState(0.6);
  const [corr, setCorr] = useState(0.15);
  const o = useMemo(() => dhsOverconfidence({ overconfidence: k, selfAttribution: psi, signal: 1, horizon: 48, correctionRate: corr }), [k, psi, corr]);
  const data = o.t.map((tt, i) => ({ t: tt, price: +o.price[i].toFixed(4), fundamental: o.fundamental[i] }));
  return (
    <Panel id="dhs" en="Daniel-Hirshleifer-Subrahmanyam (1998)" title={t("labs.behavior.dhs.title")}
      desc={t("labs.behavior.dhs.desc")}>
      <PresetButtons presets={[
        { name: t("labs.behavior.dhs.preset1.name"), description: t("labs.behavior.dhs.preset1.desc"), apply: () => { setK(2); setPsi(0.6); setCorr(0.15); } },
        { name: t("labs.behavior.dhs.preset2.name"), description: t("labs.behavior.dhs.preset2.desc"), apply: () => { setK(1); setPsi(0); } },
        { name: t("labs.behavior.dhs.preset3.name"), description: t("labs.behavior.dhs.preset3.desc"), apply: () => setPsi(0.95) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.behavior.dhs.k")} value={k} min={1} max={4} step={0.05} onChange={setK} />
          <Slider label={t("labs.behavior.dhs.psi")} value={psi} min={0} max={0.95} step={0.01} onChange={setPsi} />
          <Slider label={t("labs.behavior.dhs.corr")} value={corr} min={0.02} max={0.6} step={0.01} onChange={setCorr} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.behavior.dhs.stat.momentumPhase")} value={t("labs.behavior.dhs.stat.periods", { n: o.momentumPhase })} color={C.blue} />
          <Stat label={t("labs.behavior.dhs.stat.peakOvershoot")} value={o.peakOvershoot.toFixed(3)} color={C.red} />
          <Stat label={t("labs.behavior.dhs.stat.longRunReversal")} value={o.longRunReversal.toFixed(3)} color={C.gold} />
          <Stat label={t("labs.behavior.dhs.stat.finalVsFundamental")} value={o.price[o.price.length - 1].toFixed(3)} color={C.green} sub={t("labs.behavior.dhs.stat.finalVsFundamentalSub")} />
        </div>
      </div>
      <Chart title={t("labs.behavior.dhs.chart.price")} height={280}>
        <ComposedChart data={data}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
          <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="price" name={t("labs.behavior.dhs.legend.price")} stroke={C.gold} fill={C.gold} fillOpacity={0.12} strokeWidth={2.5} />
          <Line type="monotone" dataKey="fundamental" name={t("labs.behavior.dhs.legend.fundamental")} stroke={C.text} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        </ComposedChart>
      </Chart>
    </Panel>
  );
}

/* ═══════════════ 5. Hong-Stein ═══════════════ */
function HsPanel() {
  const { t } = useTranslation();
  const [z, setZ] = useState(6);
  const [mu, setMu] = useState(0.6);
  const [j, setJ] = useState(3);
  const o = useMemo(() => hongSteinDiffusion({ diffusionPeriods: z, momentumShare: mu, momentumLookback: j, shock: 1, horizon: 48 }), [z, mu, j]);
  const data = o.t.map((tt, i) => ({ t: tt, price: +o.price[i].toFixed(4), fundamental: o.fundamental[i] }));
  return (
    <Panel id="hs" en="Hong-Stein (1999)" title={t("labs.behavior.hs.title")}
      desc={t("labs.behavior.hs.desc")}>
      <PresetButtons presets={[
        { name: t("labs.behavior.hs.preset1.name"), description: t("labs.behavior.hs.preset1.desc"), apply: () => { setZ(6); setMu(0.6); setJ(3); } },
        { name: t("labs.behavior.hs.preset2.name"), description: t("labs.behavior.hs.preset2.desc"), apply: () => setMu(0) },
        { name: t("labs.behavior.hs.preset3.name"), description: t("labs.behavior.hs.preset3.desc"), apply: () => setZ(1) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.behavior.hs.z")} value={z} min={1} max={20} step={1} fmt={(v) => v.toFixed(0)} onChange={setZ} />
          <Slider label={t("labs.behavior.hs.mu")} value={mu} min={0} max={0.95} step={0.01} onChange={setMu} />
          <Slider label={t("labs.behavior.hs.j")} value={j} min={1} max={12} step={1} fmt={(v) => v.toFixed(0)} onChange={setJ} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.behavior.hs.stat.overshoot")} value={o.momentumStrength.toFixed(3)} color={o.overshoot ? C.red : C.text} />
          <Stat label={t("labs.behavior.hs.stat.isOvershoot")} value={o.overshoot ? t("labs.behavior.common.yes") : t("labs.behavior.common.no")} color={o.overshoot ? C.gold : C.text} />
          <Stat label={t("labs.behavior.hs.stat.diffusionEnd")} value={t("labs.behavior.dhs.stat.periods", { n: z })} color={C.blue} />
          <Stat label={t("labs.behavior.hs.stat.final")} value={o.price[o.price.length - 1].toFixed(3)} color={C.green} sub={t("labs.behavior.dhs.stat.finalVsFundamentalSub")} />
        </div>
      </div>
      <Chart title={t("labs.behavior.hs.chart.price")} height={280}>
        <LineChart data={data}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
          <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="price" name={t("labs.behavior.hs.legend.price")} stroke={C.blue} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="fundamental" name={t("labs.behavior.dhs.legend.fundamental")} stroke={C.text} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        </LineChart>
      </Chart>
    </Panel>
  );
}

/* ═══════════════ 6. Limits to arbitrage ═══════════════ */
function LimitsPanel() {
  const { t } = useTranslation();
  const [noise, setNoise] = useState(0.12);
  const [kappa, setKappa] = useState(0.2);
  const [margin, setMargin] = useState(0.4);
  const [beta, setBeta] = useState(0.5);
  const o = useMemo(() => limitsToArbitrage({
    mispricing: 1, noiseVol: noise, convergenceRate: kappa, capital: 100,
    marginRequirement: margin, redemptionSensitivity: beta, horizon: 40,
  }), [noise, kappa, margin, beta]);
  const data = o.t.map((tt, i) => ({
    t: tt, mis: +o.mispricing[i].toFixed(4), unc: +o.unconstrained[i].toFixed(4), cap: +o.capitalPath[i].toFixed(2),
  }));
  return (
    <Panel id="limits" en="Limits of Arbitrage" title={t("labs.behavior.limits.title")}
      desc={t("labs.behavior.limits.desc")}>
      <PresetButtons presets={[
        { name: t("labs.behavior.limits.preset1.name"), description: t("labs.behavior.limits.preset1.desc"), apply: () => { setNoise(0.05); setMargin(0.25); setBeta(0.2); } },
        { name: t("labs.behavior.limits.preset2.name"), description: t("labs.behavior.limits.preset2.desc"), apply: () => { setNoise(0.28); setMargin(0.8); setBeta(1.2); } },
        { name: t("labs.behavior.limits.preset3.name"), description: t("labs.behavior.limits.preset3.desc"), apply: () => { setNoise(0); setBeta(0); setMargin(0.2); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3 grid grid-cols-2 gap-3">
          <Slider label={t("labs.behavior.limits.noise")} value={noise} min={0} max={0.4} step={0.01} onChange={setNoise} />
          <Slider label={t("labs.behavior.limits.kappa")} value={kappa} min={0.02} max={0.6} step={0.01} onChange={setKappa} />
          <Slider label={t("labs.behavior.limits.margin")} value={margin} min={0.05} max={1} step={0.01} onChange={setMargin} />
          <Slider label={t("labs.behavior.limits.beta")} value={beta} min={0} max={2} step={0.05} onChange={setBeta} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.behavior.limits.stat.halfLife")} value={Number.isFinite(o.halfLife) ? t("labs.behavior.dhs.stat.periods", { n: o.halfLife }) : t("labs.behavior.limits.stat.noConv")} color={Number.isFinite(o.halfLife) ? C.green : C.red} />
          <Stat label={t("labs.behavior.limits.stat.forced")} value={o.forcedLiquidation ? t("labs.behavior.limits.stat.yesAt", { t: o.liquidationPeriod }) : t("labs.behavior.common.no")} color={o.forcedLiquidation ? C.red : C.green} />
          <Stat label={t("labs.behavior.limits.stat.maxPos")} value={o.maxPosition.toFixed(1)} color={C.blue} sub={t("labs.behavior.limits.stat.maxPosSub")} />
          <Stat label={t("labs.behavior.limits.stat.finalCap")} value={o.capitalPath[o.capitalPath.length - 1].toFixed(1)} color={C.gold} sub={t("labs.behavior.limits.stat.finalCapSub")} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Chart title={t("labs.behavior.limits.chart.mis")}>
          <LineChart data={data}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="mis" name={t("labs.behavior.limits.legend.mis")} stroke={C.red} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="unc" name={t("labs.behavior.limits.legend.unc")} stroke={C.text} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </Chart>
        <Chart title={t("labs.behavior.limits.chart.cap")}>
          <ComposedChart data={data}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="cap" name={t("labs.behavior.limits.legend.cap")} stroke={C.gold} fill={C.gold} fillOpacity={0.15} strokeWidth={2} />
          </ComposedChart>
        </Chart>
      </div>
      <Note><p><span className="text-gold">{t("labs.behavior.limits.note.head")}</span>{t("labs.behavior.limits.note.body")}</p></Note>
    </Panel>
  );
}

/* ═══════════════ 7. Sentiment cross-section ═══════════════ */
function SentimentPanel() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(1.2);
  const [b, setB] = useState(0.05);
  const [cost, setCost] = useState(0.3);
  const o = useMemo(() => sentimentCrossSection({ sentiment: sent, sensitivity: b, arbitrageCost: cost, baseReturn: 0.08, horizon: 12 }), [sent, b, cost]);
  const data = o.path.map((r) => ({ t: r.t, hard: +(r.hard * 100).toFixed(2), easy: +(r.easy * 100).toFixed(2) }));
  return (
    <Panel id="sentiment" en="Baker-Wurgler Sentiment" title={t("labs.behavior.sentiment.title")}
      desc={t("labs.behavior.sentiment.desc")}>
      <PresetButtons presets={[
        { name: t("labs.behavior.sentiment.preset1.name"), description: t("labs.behavior.sentiment.preset1.desc"), apply: () => setSent(1.5) },
        { name: t("labs.behavior.sentiment.preset2.name"), description: t("labs.behavior.sentiment.preset2.desc"), apply: () => setSent(-1.5) },
        { name: t("labs.behavior.sentiment.preset3.name"), description: t("labs.behavior.sentiment.preset3.desc"), apply: () => setSent(0) },
        { name: t("labs.behavior.sentiment.preset4.name"), description: t("labs.behavior.sentiment.preset4.desc"), apply: () => setCost(0.8) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.behavior.sentiment.sent")} value={sent} min={-2} max={2} step={0.05} onChange={setSent} />
          <Slider label={t("labs.behavior.sentiment.b")} value={b} min={0} max={0.15} step={0.005} onChange={setB} />
          <Slider label={t("labs.behavior.sentiment.cost")} value={cost} min={0} max={1} step={0.01} onChange={setCost} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.behavior.sentiment.stat.hard")} value={`${(o.hardToValueReturn * 100).toFixed(2)}%`} color={o.hardToValueReturn < 0.08 ? C.red : C.green} />
          <Stat label={t("labs.behavior.sentiment.stat.easy")} value={`${(o.easyToValueReturn * 100).toFixed(2)}%`} color={C.blue} />
          <Stat label={t("labs.behavior.sentiment.stat.spread")} value={`${(o.spread * 100).toFixed(2)}%`} color={C.gold} sub={t("labs.behavior.sentiment.stat.spreadSub")} />
          <Stat label={t("labs.behavior.sentiment.stat.regime")} value={o.regime === "high" ? t("labs.behavior.sentiment.regime.high") : o.regime === "low" ? t("labs.behavior.sentiment.regime.low") : t("labs.behavior.sentiment.regime.neutral")} color={C.teal} />
        </div>
      </div>
      <Chart title={t("labs.behavior.sentiment.chart")} height={260}>
        <LineChart data={data}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
          <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke={C.text} />
          <Line type="monotone" dataKey="hard" name={t("labs.behavior.sentiment.legend.hard")} stroke={C.red} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="easy" name={t("labs.behavior.sentiment.legend.easy")} stroke={C.blue} strokeWidth={2.5} dot={false} />
        </LineChart>
      </Chart>
      <Note><p><span className="text-gold">{t("labs.behavior.sentiment.note.head")}</span>{t("labs.behavior.sentiment.note.body")}</p></Note>
    </Panel>
  );
}

/* ═══════════════ 8. Behavioral corporate ═══════════════ */
function CorporatePanel() {
  const { t } = useTranslation();
  const [kappa, setKappa] = useState(1.2);
  const [wedge, setWedge] = useState(0.25);
  const [timing, setTiming] = useState(0.5);
  const [sentAmp, setSentAmp] = useState(1);

  const cashFlow = useMemo(() => Array.from({ length: 20 }, (_, i) => Math.sin(i / 3) * 1.2), []);
  const sentiment = useMemo(() => cashFlow.map((_, i) => sentAmp * Math.sin(i / 4 + 1)), [cashFlow, sentAmp]);
  const o = useMemo(() => behavioralCorporate({
    overconfidence: kappa, cashFlow, externalFinanceCost: wedge, sentiment, timingIntensity: timing,
  }), [kappa, wedge, timing, sentiment, cashFlow]);

  const data = o.investment.map((v, i) => ({
    t: i,
    inv: +v.toFixed(3),
    rat: +o.rationalInvestment[i].toFixed(3),
    cf: +cashFlow[i].toFixed(3),
    issue: +o.equityIssuance[i].toFixed(3),
    lev: +o.leverage[i].toFixed(3),
  }));

  return (
    <Panel id="corporate" en="Behavioral Corporate Finance" title={t("labs.behavior.corporate.title")}
      desc={t("labs.behavior.corporate.desc")}>
      <PresetButtons presets={[
        { name: "Malmendier-Tate", description: t("labs.behavior.corporate.preset1.desc"), apply: () => { setKappa(2); setTiming(0); } },
        { name: t("labs.behavior.corporate.preset2.name"), description: t("labs.behavior.corporate.preset2.desc"), apply: () => { setKappa(0); setTiming(1); } },
        { name: t("labs.behavior.corporate.preset3.name"), description: t("labs.behavior.corporate.preset3.desc"), apply: () => { setKappa(0); setTiming(0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Slider label={t("labs.behavior.corporate.kappa")} value={kappa} min={0} max={3} step={0.05} onChange={setKappa} />
          <Slider label={t("labs.behavior.corporate.wedge")} value={wedge} min={0} max={1} step={0.01} onChange={setWedge} />
          <Slider label={t("labs.behavior.corporate.timing")} value={timing} min={0} max={1.5} step={0.05} onChange={setTiming} />
          <Slider label={t("labs.behavior.corporate.sentAmp")} value={sentAmp} min={0} max={2} step={0.05} onChange={setSentAmp} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.behavior.corporate.stat.icf")} value={o.investmentCashFlowSensitivity.toFixed(3)} color={C.gold} />
          <Stat label={t("labs.behavior.corporate.stat.rational")} value={o.rationalSensitivity.toFixed(3)} color={C.text} />
          <Stat label={t("labs.behavior.corporate.stat.issue")} value={o.equityIssuance.reduce((s, v) => s + v, 0).toFixed(2)} color={C.blue} sub={t("labs.behavior.corporate.stat.issueSub")} />
          <Stat label={t("labs.behavior.corporate.stat.lev")} value={o.leverage[o.leverage.length - 1].toFixed(3)} color={C.teal} sub={t("labs.behavior.corporate.stat.levSub")} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Chart title={t("labs.behavior.corporate.chart.inv")}>
          <ComposedChart data={data}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="inv" name={t("labs.behavior.corporate.legend.inv")} stroke={C.gold} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="rat" name={t("labs.behavior.corporate.legend.rat")} stroke={C.blue} strokeWidth={2} dot={false} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="cf" name={t("labs.behavior.corporate.legend.cf")} stroke={C.text} strokeWidth={1} dot={false} />
          </ComposedChart>
        </Chart>
        <Chart title={t("labs.behavior.corporate.chart.timing")}>
          <ComposedChart data={data}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="issue" name={t("labs.behavior.corporate.legend.issue")} fill={C.green} />
            <Line type="monotone" dataKey="lev" name={t("labs.behavior.corporate.legend.lev")} stroke={C.red} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </Chart>
      </div>
      <Note>
        <p><span className="text-gold">{t("labs.behavior.corporate.note.head")}</span>{t("labs.behavior.corporate.note.body")}</p>
      </Note>
    </Panel>
  );
}