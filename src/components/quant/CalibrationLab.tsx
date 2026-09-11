import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, Line, ComposedChart,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Gauge, Activity, Loader2, RefreshCw } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import { useToolTab } from "@/lib/useToolTab";
import EquationBlock from "@/components/common/EquationBlock";
import { Stat, C } from "@/components/frontier/ui";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "@/components/common/ChartTheme";
import SendToTool from "@/components/common/SendToTool";
import {
  usePriceSeries, syntheticSeries, logReturns, type PriceSource, type PriceSeries,
} from "@/lib/priceSeries";
import { useFredSeries } from "@/lib/marketData";
import PriceSourceBar from "@/components/quant/PriceSourceBar";
import {
  fitGarch11, fitEwmaLambda, fitMertonJump, fitShortRate,
  standardizedResiduals, acf, qqNormal,
} from "@/lib/quant/calibration";

type ModelId = "garch" | "ewma" | "merton" | "vasicek" | "cir";
const VOL_MODEL_IDS: ModelId[] = ["garch", "ewma", "merton"];
const RATE_MODEL_IDS: ModelId[] = ["vasicek", "cir"];
const FRED_RATE_IDS = ["DGS3MO", "DGS1", "DGS2", "DGS5"] as const;

const MODEL_IDS = ["garch", "ewma", "merton", "vasicek", "cir"] as const;

const pct = (x: number) => (x * 100).toFixed(1) + "%";
const isRate = (m: ModelId) => m === "vasicek" || m === "cir";

export default function CalibrationLab() {
  const { t } = useTranslation();
  const VOL_MODELS: { id: ModelId; label: string; desc: string }[] = VOL_MODEL_IDS.map((id) => ({
    id, label: t(`labs.quant.calibrationLab.model.${id}.label`), desc: t(`labs.quant.calibrationLab.model.${id}.desc`),
  }));
  const RATE_MODELS: { id: ModelId; label: string; desc: string }[] = RATE_MODEL_IDS.map((id) => ({
    id, label: t(`labs.quant.calibrationLab.model.${id}.label`), desc: t(`labs.quant.calibrationLab.model.${id}.desc`),
  }));
  const FRED_RATES: { id: string; label: string }[] = FRED_RATE_IDS.map((id) => ({
    id, label: t(`labs.quant.calibrationLab.fredRate.${id}`),
  }));
  const [model, setModel] = useToolTab<ModelId>(MODEL_IDS, "garch");

  // --- volatility (price) data
  const [source, setSource] = useState<PriceSource>("yahoo");
  const [symbol, setSymbol] = useState("AAPL");
  const [range, setRange] = useState("5y");
  const [demo, setDemo] = useState<PriceSeries | null>(null);

  // --- rate (FRED) data
  const [rateSeries, setRateSeries] = useState("DGS3MO");

  const priceEnabled = !demo && !isRate(model);
  const { series: live, isFetching, error, refetch } = usePriceSeries(source, symbol, range, priceEnabled);
  const series = demo ?? live;
  const fred = useFredSeries(rateSeries, "2010-01-01", isRate(model));

  const returns = useMemo(() => (series ? logReturns(series.prices) : []), [series]);

  const garch = useMemo(() => (model === "garch" && returns.length > 60 ? fitGarch11(returns) : null), [model, returns]);
  const ewma = useMemo(() => (model === "ewma" && returns.length > 60 ? fitEwmaLambda(returns) : null), [model, returns]);
  const merton = useMemo(() => (model === "merton" && returns.length > 60 ? fitMertonJump(returns) : null), [model, returns]);

  const rates = useMemo(() => (fred.data?.values ?? []).map((v) => v / 100).filter(Number.isFinite), [fred.data]);
  const shortRate = useMemo(
    () => (isRate(model) && rates.length > 60 ? fitShortRate(rates, model === "cir" ? "cir" : "vasicek") : null),
    [model, rates]
  );

  // diagnostics from GARCH / EWMA conditional vol
  const diag = useMemo(() => {
    const condVol = garch?.condVol ?? ewma?.condVol;
    if (!condVol || !returns.length) return null;
    const dailyVol = condVol.map((v) => v / Math.sqrt(252));
    const z = standardizedResiduals(returns, dailyVol);
    if (z.length < 30) return null;
    const qq = qqNormal(z).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 300)) === 0);
    const z2 = z.map((x) => x * x);
    const ac = acf(z2, 15);
    const conf = 1.96 / Math.sqrt(z.length);
    return { qq, ac, conf };
  }, [garch, ewma, returns]);

  const volChart = useMemo(() => {
    const condVol = garch?.condVol ?? ewma?.condVol;
    if (!condVol || !series) return [];
    const offset = series.dates.length - condVol.length;
    const step = Math.max(1, Math.floor(condVol.length / 400));
    const out: { date: string; vol: number }[] = [];
    for (let i = 0; i < condVol.length; i += step) {
      out.push({ date: series.dates[offset + i] ?? String(i), vol: condVol[i] * 100 });
    }
    return out;
  }, [garch, ewma, series]);

  const rateChart = useMemo(() => {
    if (!fred.data || !shortRate) return [];
    const dates = fred.data.dates;
    const step = Math.max(1, Math.floor(rates.length / 400));
    const out: { date: string; rate: number; theta: number }[] = [];
    for (let i = 0; i < rates.length; i += step) {
      out.push({ date: dates[i] ?? String(i), rate: rates[i] * 100, theta: shortRate.theta * 100 });
    }
    return out;
  }, [fred.data, shortRate, rates]);

  const busSigma =
    model === "garch" ? garch?.longRunVol :
    model === "ewma" ? ewma?.latestVol :
    model === "merton" ? merton?.sigmaDiffusion : undefined;
  const busR = isRate(model) ? shortRate?.theta : undefined;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Lab"
        kicker="Calibration · Fit to Real Data"
        title={t("labs.quant.calibrationLab.title")}
        subtitle={t("labs.quant.calibrationLab.subtitle")}
      />

      <div className="container max-w-6xl px-6 space-y-5">
        {isRate(model) ? (
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("labs.quant.calibrationLab.fredSeriesLabel")}</p>
            <div className="flex flex-wrap items-center gap-2">
              {FRED_RATES.map((r) => (
                <button key={r.id} onClick={() => setRateSeries(r.id)}
                  className={"px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors " +
                    (r.id === rateSeries ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
                  {r.label}
                </button>
              ))}
              <button onClick={() => fred.refetch()} disabled={fred.isFetching}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50">
                {fred.isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {t("labs.quant.priceSource.fetch")}
              </button>
              {rates.length > 0 && <span className="text-[10px] font-mono text-muted-foreground">{t("labs.quant.calibrationLab.observations", { n: rates.length })}</span>}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">{t("labs.quant.calibrationLab.fredHint")}</p>
          </div>
        ) : (
          <PriceSourceBar
            source={source} symbol={symbol} range={range}
            isFetching={isFetching} error={demo ? null : error}
            n={series?.prices.length}
            onSource={(s) => { setSource(s); setDemo(null); }}
            onSymbol={(s) => { setSymbol(s); setDemo(null); }}
            onRange={(r) => { setRange(r); setDemo(null); }}
            onRefetch={() => { setDemo(null); refetch(); }}
            onUseDemo={() => setDemo(syntheticSeries(756, 0.08, 0.3, 23))}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          <aside className="rounded-xl border border-border bg-card/60 p-4 space-y-3 h-fit">
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("labs.quant.calibrationLab.volModelLabel")}</p>
              {VOL_MODELS.map((mo) => (
                <button key={mo.id} onClick={() => setModel(mo.id)}
                  className={"w-full text-left px-3 py-2 rounded-md border transition-colors " +
                    (mo.id === model ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30")}>
                  <p className="text-xs font-medium">{mo.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{mo.desc}</p>
                </button>
              ))}
            </div>
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("labs.quant.calibrationLab.rateModelLabel")}</p>
              {RATE_MODELS.map((mo) => (
                <button key={mo.id} onClick={() => setModel(mo.id)}
                  className={"w-full text-left px-3 py-2 rounded-md border transition-colors " +
                    (mo.id === model ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30")}>
                  <p className="text-xs font-medium">{mo.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{mo.desc}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-5">
            {isRate(model) ? (
              rates.length <= 60 ? (
                <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
                  {fred.isFetching ? t("labs.quant.calibrationLab.fetchingFred") : t("labs.quant.calibrationLab.needRateObs")}
                </div>
              ) : shortRate && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label={t("labs.quant.calibrationLab.metric.kappa")} value={shortRate.kappa.toFixed(3)} color={C.blue} />
                    <Stat label={t("labs.quant.calibrationLab.metric.theta")} value={pct(shortRate.theta)} color={C.gold} />
                    <Stat label={t("labs.quant.calibrationLab.metric.sigma")} value={pct(shortRate.sigma)} color={C.teal} />
                    <Stat label={t("labs.quant.calibrationLab.metric.halfLife")} value={Number.isFinite(shortRate.halfLife) ? shortRate.halfLife.toFixed(2) : "∞"} color={C.text} />
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("labs.quant.calibrationLab.modelSde", { m: model === "cir" ? "CIR" : "Vasicek" })}</p>
                    <EquationBlock variant="gold" math={model === "cir"
                      ? "dr_t = \\kappa(\\theta - r_t)\\,dt + \\sigma\\sqrt{r_t}\\,dW_t"
                      : "dr_t = \\kappa(\\theta - r_t)\\,dt + \\sigma\\,dW_t"} />
                    <p className="text-[11px] text-muted-foreground">
                      {t("labs.quant.calibrationLab.discreteRegression")} {model === "cir" ? t("labs.quant.calibrationLab.cirResidual") : t("labs.quant.calibrationLab.vasicekResidual")}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <SendToTool fromId="calibration" label={model === "cir" ? t("labs.quant.calibrationLab.cirCalibration") : t("labs.quant.calibrationLab.vasicekCalibration")} outputs={{ r: busR }} targets={["bs", "mc", "greeks-desk", "bond"]} />
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.calibrationLab.shortRateChartTitle")}
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={rateChart}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                        <YAxis {...AXIS_PROPS} width={48} />
                        <Tooltip content={<ThemedTooltip />} />
                        <Area type="monotone" dataKey="rate" name={t("labs.quant.calibrationLab.shortRate")} stroke={C.gold} fill={C.gold} fillOpacity={0.12} />
                        <Line type="monotone" dataKey="theta" name="θ" stroke={C.text} dot={false} strokeDasharray="4 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">{t("labs.quant.calibrationLab.fredFootnote", { rateSeries, n: rates.length })}</p>
                </>
              )
            ) : returns.length <= 60 ? (
              <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
                {isFetching ? t("labs.quant.backtestLab.fetchingReal") : t("labs.quant.calibrationLab.needPriceObs")}
              </div>
            ) : (
              <>
                {garch && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="ω" value={garch.omega.toExponential(2)} color={C.text} />
                    <Stat label={t("labs.quant.calibrationLab.metric.alpha")} value={garch.alpha.toFixed(3)} color={C.blue} />
                    <Stat label={t("labs.quant.calibrationLab.metric.beta")} value={garch.beta.toFixed(3)} color={C.teal} />
                    <Stat label={t("labs.quant.calibrationLab.metric.persistence")} value={garch.persistence.toFixed(3)} color={garch.persistence < 1 ? C.green : C.red} />
                    <Stat label={t("labs.quant.calibrationLab.metric.longRunVol")} value={pct(garch.longRunVol)} color={C.gold} />
                    <Stat label={t("labs.quant.calibrationLab.metric.logLik")} value={garch.logLik.toFixed(1)} color={C.text} />
                    <Stat label={t("labs.quant.calibrationLab.metric.latestCondVol")} value={pct(garch.condVol[garch.condVol.length - 1])} color={C.gold} />
                    <Stat label={t("labs.quant.calibrationLab.metric.sampleMeanDaily")} value={pct(garch.mu)} color={C.text} />
                  </div>
                )}
                {ewma && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label={t("labs.quant.calibrationLab.metric.optimalLambda")} value={ewma.lambda.toFixed(3)} color={C.gold} />
                    <Stat label={t("labs.quant.calibrationLab.metric.latestVolFitted")} value={pct(ewma.latestVol)} color={C.blue} />
                    <Stat label="RiskMetrics (λ=0.94)" value={pct(ewma.riskMetricsVol)} color={C.teal} />
                    <Stat label={t("labs.quant.calibrationLab.metric.logLik")} value={ewma.logLik.toFixed(1)} color={C.text} />
                  </div>
                )}
                {merton && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label={t("labs.quant.calibrationLab.metric.diffusionVol")} value={pct(merton.sigmaDiffusion)} color={C.gold} />
                    <Stat label={t("labs.quant.calibrationLab.metric.jumpIntensity")} value={merton.lambda.toFixed(2)} color={C.blue} />
                    <Stat label={t("labs.quant.calibrationLab.metric.jumpMean")} value={pct(merton.jumpMean)} color={merton.jumpMean >= 0 ? C.green : C.red} />
                    <Stat label={t("labs.quant.calibrationLab.metric.jumpStd")} value={pct(merton.jumpStd)} color={C.teal} />
                    <Stat label={t("labs.quant.calibrationLab.metric.nJumps")} value={String(merton.nJumps)} color={C.text} sub={t("labs.quant.calibrationLab.thresholdSub", { v: pct(merton.threshold) })} />
                  </div>
                )}

                <div className="flex justify-end">
                  <SendToTool
                    fromId="calibration"
                    label={t("labs.quant.calibrationLab.modelCalibration")}
                    outputs={{ sigma: busSigma, mu: garch ? garch.mu * 252 : undefined }}
                    targets={["bs", "mc", "greeks-desk", "iv"]}
                  />
                </div>

                {volChart.length > 0 && (
                  <div className="rounded-xl border border-border bg-card/60 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.calibrationLab.condVolChartTitle")}
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={volChart}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                        <YAxis {...AXIS_PROPS} width={48} />
                        <Tooltip content={<ThemedTooltip />} />
                        {garch && <ReferenceLine y={garch.longRunVol * 100} stroke={C.text} strokeDasharray="4 3" />}
                        <Area type="monotone" dataKey="vol" name={t("labs.quant.calibrationLab.condVol")} stroke={C.gold} fill={C.gold} fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {diag && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.calibrationLab.qqTitle")}
                      </p>
                      <ResponsiveContainer width="100%" height={240}>
                        <ScatterChart>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis type="number" dataKey="theoretical" name={t("labs.quant.calibrationLab.theoreticalQuantile")} {...AXIS_PROPS} />
                          <YAxis type="number" dataKey="sample" name={t("labs.quant.calibrationLab.sampleQuantile")} {...AXIS_PROPS} width={40} />
                          <ZAxis range={[12, 12]} />
                          <Tooltip content={<ThemedTooltip />} />
                          <ReferenceLine segment={[{ x: -4, y: -4 }, { x: 4, y: 4 }]} stroke={C.text} strokeDasharray="4 3" />
                          <Scatter data={diag.qq} fill={C.gold} fillOpacity={0.6} />
                        </ScatterChart>
                      </ResponsiveContainer>
                      <p className="text-[10px] text-muted-foreground mt-1">{t("labs.quant.calibrationLab.qqFootnote")}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">{t("labs.quant.calibrationLab.acfTitle")}</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={diag.ac.map((v, i) => ({ lag: i + 1, acf: v }))}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="lag" {...AXIS_PROPS} />
                          <YAxis {...AXIS_PROPS} width={40} domain={[-0.2, 0.4]} />
                          <Tooltip content={<ThemedTooltip />} />
                          <ReferenceLine y={diag.conf} stroke={C.red} strokeDasharray="3 3" />
                          <ReferenceLine y={-diag.conf} stroke={C.red} strokeDasharray="3 3" />
                          <Bar dataKey="acf" fill={C.teal} />
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="text-[10px] text-muted-foreground mt-1">{t("labs.quant.calibrationLab.acfFootnote")}</p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] font-mono text-muted-foreground">
                  {t("labs.quant.calibrationLab.footnote", { symbol: series?.symbol, source, n: returns.length })}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
