import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ComposedChart, Scatter,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { AssetChrome, CHART } from "./AssetChrome";

const { GOLD, TEAL, RED, BLUE, GRID, TEXT } = CHART;
const { Slider, Stat, Note, ChartCard } = AssetChrome;

/* ════════════════════════════════════════════════════════════
   8. Zero-Beta (Black) CAPM — no risk-free asset
   E(Ri) = E(Rz) + βi·[E(Rm) − E(Rz)]
   ════════════════════════════════════════════════════════════ */
export const ZeroBetaTool = () => {
  const { t } = useTranslation();
  const [rf, setRf] = useState(3);
  const [rz, setRz] = useState(5);
  const [erm, setErm] = useState(9);
  const [beta, setBeta] = useState(1.2);

  const r = useMemo(() => {
    const stdReq = rf + beta * (erm - rf); // standard CAPM
    const zbReq = rz + beta * (erm - rz); // zero-beta CAPM
    return { stdReq, zbReq, gap: zbReq - stdReq };
  }, [rf, rz, erm, beta]);

  const lines = useMemo(() => {
    const out: { beta: number; std: number; zb: number }[] = [];
    for (let b = 0; b <= 2.5; b += 0.1) {
      out.push({
        beta: +b.toFixed(2),
        std: +(rf + b * (erm - rf)).toFixed(2),
        zb: +(rz + b * (erm - rz)).toFixed(2),
      });
    }
    return out;
  }, [rf, rz, erm]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.ap.zerobeta.p1"), description: t("labs.ap.zerobeta.p1d"), apply: () => { setRf(3); setRz(5); setErm(9); setBeta(1.2); } },
        { name: t("labs.ap.zerobeta.p2"), description: t("labs.ap.zerobeta.p2d"), apply: () => { setRz(6.5); setErm(9); } },
        { name: t("labs.ap.zerobeta.p3"), description: t("labs.ap.zerobeta.p3d"), apply: () => { setRz(3.2); } },
        { name: t("labs.ap.zerobeta.p4"), description: t("labs.ap.zerobeta.p4d"), apply: () => { setBeta(1.8); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.ap.zerobeta.rf")} value={rf} min={0} max={6} step={0.25} onChange={setRf} />
          <Slider label={t("labs.ap.zerobeta.rz")} sub={t("labs.ap.zerobeta.rzSub")} value={rz} min={0} max={9} step={0.25} onChange={setRz} />
          <Slider label={t("labs.ap.zerobeta.erm")} value={erm} min={5} max={16} step={0.5} onChange={setErm} />
          <Slider label={t("labs.ap.zerobeta.beta")} value={beta} min={0} max={2.5} step={0.05} onChange={setBeta} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.ap.zerobeta.stdReq")} value={`${r.stdReq.toFixed(2)}%`} color={BLUE} sub="Rf + β(ERm−Rf)" />
          <Stat label={t("labs.ap.zerobeta.zbReq")} value={`${r.zbReq.toFixed(2)}%`} color={GOLD} sub="Rz + β(ERm−Rz)" />
          <Stat label={t("labs.ap.zerobeta.lowBetaGap")} value={`+${(rz - rf).toFixed(2)}%`} color={TEAL} sub={t("labs.ap.zerobeta.lowBetaGapSub")} />
          <Stat label={t("labs.ap.zerobeta.slopeChg")} value={`${(erm - rz - (erm - rf)).toFixed(2)}%`} color={RED} sub={t("labs.ap.zerobeta.slopeChgSub")} />
        </div>
      </div>

      <ChartCard title={t("labs.ap.zerobeta.chart")} hint={t("labs.ap.zerobeta.chartHint")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={lines}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="beta" stroke={TEXT} tick={{ fontSize: 10 }} label={{ value: "β", position: "insideBottom", offset: -2, fill: TEXT, fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="std" name={t("labs.ap.zerobeta.stdSml")} stroke={BLUE} strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="zb" name={t("labs.ap.zerobeta.zbSml")} stroke={GOLD} strokeWidth={2} dot={false} />
            <Scatter data={[{ beta, std: r.stdReq, zb: r.zbReq }]} dataKey="zb" fill={RED} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p><span className="text-gold">{t("labs.ap.zerobeta.n1t")}</span>{t("labs.ap.zerobeta.n1")}</p>
        <p><span className="text-gold">{t("labs.ap.zerobeta.n2t")}</span>{t("labs.ap.zerobeta.n2")}</p>
        <p><span className="text-gold">{t("labs.ap.zerobeta.n3t")}</span>{t("labs.ap.zerobeta.n3")}</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   9. Intertemporal CAPM (Merton 1973) — two-factor pricing
   E(Ri)−Rf = βim·λm + βih·λh   (h = state-variable / hedge factor)
   ════════════════════════════════════════════════════════════ */
export const ICAPMTool = () => {
  const { t } = useTranslation();
  const [rf, setRf] = useState(3);
  const [lambdaM, setLambdaM] = useState(6);
  const [lambdaH, setLambdaH] = useState(2.5);
  const [betaM, setBetaM] = useState(1.1);
  const [betaH, setBetaH] = useState(0.6);

  const r = useMemo(() => {
    const capmReq = rf + betaM * lambdaM;
    const icapmReq = rf + betaM * lambdaM + betaH * lambdaH;
    const hedgeContribution = betaH * lambdaH;
    return { capmReq, icapmReq, hedgeContribution };
  }, [rf, lambdaM, lambdaH, betaM, betaH]);

  const decomp = useMemo(() => ([
    { name: "Rf", value: +rf.toFixed(2), fill: TEAL },
    { name: t("labs.ap.icapm.mktFactor"), value: +(betaM * lambdaM).toFixed(2), fill: BLUE },
    { name: t("labs.ap.icapm.hedgeFactor"), value: +(betaH * lambdaH).toFixed(2), fill: GOLD },
  ]), [rf, lambdaM, lambdaH, betaM, betaH, t]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.ap.icapm.p1"), description: t("labs.ap.icapm.p1d"), apply: () => { setRf(3); setLambdaM(6); setLambdaH(2.5); setBetaM(1.1); setBetaH(0.6); } },
        { name: t("labs.ap.icapm.p2"), description: t("labs.ap.icapm.p2d"), apply: () => { setLambdaH(0); } },
        { name: t("labs.ap.icapm.p3"), description: t("labs.ap.icapm.p3d"), apply: () => { setLambdaH(5); setBetaH(0.9); } },
        { name: t("labs.ap.icapm.p4"), description: t("labs.ap.icapm.p4d"), apply: () => { setBetaH(-0.5); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.ap.icapm.premiaHead")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Rf (%)" value={rf} min={0} max={6} step={0.25} onChange={setRf} />
            <Slider label={t("labs.ap.icapm.lamM")} value={lambdaM} min={2} max={10} step={0.5} onChange={setLambdaM} />
            <Slider label={t("labs.ap.icapm.lamH")} value={lambdaH} min={-2} max={6} step={0.25} onChange={setLambdaH} />
            <Slider label={t("labs.ap.icapm.betaM")} value={betaM} min={0} max={2} step={0.05} onChange={setBetaM} />
            <Slider label={t("labs.ap.icapm.betaH")} value={betaH} min={-1} max={1.5} step={0.05} onChange={setBetaH} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.ap.icapm.capmReq")} value={`${r.capmReq.toFixed(2)}%`} color={BLUE} sub={t("labs.ap.icapm.capmReqSub")} />
          <Stat label={t("labs.ap.icapm.icapmReq")} value={`${r.icapmReq.toFixed(2)}%`} color={GOLD} sub={t("labs.ap.icapm.icapmReqSub")} />
          <Stat label={t("labs.ap.icapm.hedge")} value={`${r.hedgeContribution >= 0 ? "+" : ""}${r.hedgeContribution.toFixed(2)}%`} color={r.hedgeContribution >= 0 ? TEAL : RED} sub="βh·λh" />
          <Stat label={t("labs.ap.icapm.share")} value={`${((r.hedgeContribution / (r.icapmReq - rf || 1)) * 100).toFixed(0)}%`} color={GOLD} sub={t("labs.ap.icapm.shareSub")} />
        </div>
      </div>

      <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.ap.icapm.decompHead")}</p>
      <div className="grid grid-cols-3 gap-3">
        {decomp.map((d) => (
          <div key={d.name} className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
            <div className="h-2 rounded-full mb-3" style={{ background: d.fill }} />
            <p className="text-[11px] font-mono text-muted-foreground mb-1">{d.name}</p>
            <p className="text-xl font-mono tabular-nums" style={{ color: d.fill }}>{d.value}%</p>
          </div>
        ))}
      </div>

      <Note>
        <p><span className="text-gold">{t("labs.ap.icapm.n1t")}</span>{t("labs.ap.icapm.n1")}</p>
        <p><span className="text-gold">{t("labs.ap.icapm.n2t")}</span>{t("labs.ap.icapm.n2")}</p>
        <p><span className="text-gold">{t("labs.ap.icapm.n3t")}</span>{t("labs.ap.icapm.n3")}</p>
      </Note>
    </div>
  );
};