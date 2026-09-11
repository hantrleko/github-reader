import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { Layers, LineChart as LineChartIcon, Boxes } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import { useToolTab } from "@/lib/useToolTab";
import { Slider, Stat, C } from "@/components/frontier/ui";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "@/components/common/ChartTheme";
import {
  syntheticPanel, runQlibWorkflow, FACTOR_IDS, FACTOR_META,
  type FactorId, type ModelId,
} from "@/lib/quant/qlibPipeline";

const MODEL_LIST: ModelId[] = ["ridge", "equal", "single"];

const MODEL_IDS = ["ridge", "equal", "single"] as const;

const pct = (x: number) => (x * 100).toFixed(2) + "%";
const num = (x: number, d = 3) => x.toFixed(d);

export default function QlibLab() {
  const { t } = useTranslation();
  const MODELS: { id: ModelId; label: string; desc: string }[] = MODEL_LIST.map((id) => ({
    id, label: t(`labs.quant.qlibLab.model.${id}.label`), desc: t(`labs.quant.qlibLab.model.${id}.desc`),
  }));
  const [nAssets, setNAssets] = useState(30);
  const [nDays, setNDays] = useState(750);
  const [seed, setSeed] = useState(42);
  const [horizon, setHorizon] = useState(5);
  const [model, setModel] = useToolTab<ModelId>(MODEL_IDS, "ridge");
  const [lambda, setLambda] = useState(1);
  const [trainRatio, setTrainRatio] = useState(0.6);
  const [topk, setTopk] = useState(5);
  const [nDrop, setNDrop] = useState(2);
  const [freq, setFreq] = useState(5);
  const [costBps, setCostBps] = useState(5);
  const [active, setActive] = useState<FactorId[]>([...FACTOR_IDS]);

  const panel = useMemo(() => syntheticPanel(nAssets, nDays, seed), [nAssets, nDays, seed]);

  const res = useMemo(() => {
    if (!active.length) return null;
    return runQlibWorkflow(panel, {
      factors: active,
      horizon,
      model,
      lambda,
      trainRatio,
      topk: { topk, nDrop, freq, costBps },
    });
  }, [panel, active, horizon, model, lambda, trainRatio, topk, nDrop, freq, costBps]);

  const equityData = useMemo(() => {
    if (!res) return [];
    const step = Math.max(1, Math.floor(res.backtest.equity.length / 300));
    const out: { date: string; strategy: number; benchmark: number; dd: number }[] = [];
    for (let i = 0; i < res.backtest.equity.length; i += step) {
      out.push({
        date: res.backtest.dates[i],
        strategy: res.backtest.equity[i],
        benchmark: res.backtest.benchmark[i],
        dd: res.backtest.drawdown[i] * 100,
      });
    }
    return out;
  }, [res]);

  const icData = useMemo(() => {
    if (!res) return [];
    const step = Math.max(1, Math.floor(res.test.ic.length / 240));
    return res.test.ic
      .map((v, i) => ({ date: res.test.dates[i], ic: v, rank: res.test.rankIc[i] }))
      .filter((_, i) => i % step === 0);
  }, [res]);

  const quantData = useMemo(
    () => (res ? res.test.quantiles.map((v, i) => ({ g: `Q${i + 1}`, r: v * 100 })) : []),
    [res]
  );

  const toggle = (f: FactorId) =>
    setActive((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  return (
    <>
      <SectionHeader
        chapter="QUANT TRADING"
        kicker="Qlib Pipeline"
        title={t("labs.quant.qlibLab.title")}
        subtitle={t("labs.quant.qlibLab.subtitle")}
      />

      <div className="container max-w-6xl px-6 pb-24 space-y-6">
        {/* ── data + model config ── */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold flex items-center gap-2">
              <Boxes className="w-3.5 h-3.5" /> {t("labs.quant.qlibLab.dataLayer")}
            </p>
            <Slider label={t("labs.quant.qlibLab.nAssets")} value={nAssets} min={10} max={80} step={5} onChange={setNAssets} />
            <Slider label={t("labs.quant.qlibLab.nDays")} value={nDays} min={400} max={1500} step={50} onChange={setNDays} />
            <Slider label={t("labs.quant.qlibLab.seed")} value={seed} min={1} max={99} step={1} onChange={setSeed} />
            <Slider label={t("labs.quant.qlibLab.horizon")} value={horizon} min={1} max={20} step={1} onChange={setHorizon} />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("labs.quant.qlibLab.poolDesc")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold flex items-center gap-2">
              <LineChartIcon className="w-3.5 h-3.5" /> {t("labs.quant.qlibLab.modelLayer")}
            </p>
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    model === m.id
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border text-foreground/70 hover:border-gold/40"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {MODELS.find((m) => m.id === model)?.desc}
            </p>
            <Slider label={t("labs.quant.qlibLab.ridgeLambda")} value={lambda} min={0.01} max={50} step={0.01} onChange={setLambda} />
            <Slider
              label={t("labs.quant.qlibLab.trainRatio")}
              value={trainRatio}
              min={0.3}
              max={0.8}
              step={0.05}
              fmt={(v) => pct(v)}
              onChange={setTrainRatio}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> {t("labs.quant.qlibLab.topkStrategy")}
            </p>
            <Slider label={t("labs.quant.qlibLab.topk")} value={topk} min={2} max={20} step={1} onChange={setTopk} />
            <Slider label={t("labs.quant.qlibLab.nDrop")} value={nDrop} min={0} max={10} step={1} onChange={setNDrop} />
            <Slider label={t("labs.quant.qlibLab.freq")} value={freq} min={1} max={20} step={1} onChange={setFreq} />
            <Slider label={t("labs.quant.qlibLab.costBps")} value={costBps} min={0} max={50} step={1} onChange={setCostBps} />
          </div>
        </div>

        {/* ── factor selection ── */}
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold mb-3">
            {t("labs.quant.qlibLab.alphaFactors")}
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2">
            {FACTOR_IDS.map((f) => {
              const on = active.includes(f);
              const w = res && on ? res.weights[active.indexOf(f)] : null;
              return (
                <button
                  key={f}
                  onClick={() => toggle(f)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    on ? "border-gold/50 bg-gold/5" : "border-border bg-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-foreground">{FACTOR_META[f].label}</span>
                    <span className="text-[10px] font-mono text-gold tabular-nums">
                      {w != null ? w.toFixed(3) : "—"}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all">{FACTOR_META[f].expr}</p>
                  <p className="text-[10px] text-foreground/50 mt-1">{FACTOR_META[f].note}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            {t("labs.quant.qlibLab.factorWeightHint")}
          </p>
        </div>

        {!res ? (
          <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            {t("labs.quant.qlibLab.needFactor")}
          </div>
        ) : (
          <>
            {/* ── signal evaluation ── */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Stat label={t("labs.quant.qlibLab.metric.oosIc")} value={num(res.test.meanIc)} />
              <Stat label={t("labs.quant.qlibLab.metric.oosRankIc")} value={num(res.test.meanRankIc)} color={C.teal} />
              <Stat label="ICIR" value={num(res.test.icir, 2)} color={C.blue} />
              <Stat label={t("labs.quant.qlibLab.metric.icHitRate")} value={pct(res.test.hitRate)} color={C.green} />
              <Stat label={t("labs.quant.qlibLab.metric.trainIc")} value={num(res.train.meanIc)} sub={t("labs.quant.qlibLab.overfitCompare")} color={C.text} />
              <Stat label={t("labs.quant.qlibLab.metric.crossSectionSamples")} value={`${res.nTest} / ${res.nDates}`} sub={t("labs.quant.qlibLab.testAll")} color={C.text} />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card/40 p-5">
                <p className="text-sm text-foreground mb-3">{t("labs.quant.qlibLab.oosIcSeries")}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={icData}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={40} />
                    <YAxis {...AXIS_PROPS} />
                    <Tooltip content={<ThemedTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="ic" name="IC" fill={C.gold} opacity={0.55} />
                    <Line dataKey="rank" name="RankIC" stroke={C.teal} dot={false} strokeWidth={1.4} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-border bg-card/40 p-5">
                <p className="text-sm text-foreground mb-3">{t("labs.quant.qlibLab.quantileReturns")}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={quantData}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="g" {...AXIS_PROPS} />
                    <YAxis {...AXIS_PROPS} />
                    <Tooltip content={<ThemedTooltip />} />
                    <Bar dataKey="r" name={t("labs.quant.qlibLab.avgFutureReturn")}>
                      {quantData.map((d, i) => (
                        <Cell key={i} fill={d.r >= 0 ? C.green : C.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {t("labs.quant.qlibLab.monotonicHint")}
                </p>
              </div>
            </div>

            {/* ── backtest ── */}
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Stat label={t("labs.quant.qlibLab.metric.cagr")} value={pct(res.backtest.metrics.cagr)} />
              <Stat label={t("labs.quant.qlibLab.metric.annVol")} value={pct(res.backtest.metrics.vol)} color={C.text} />
              <Stat label={t("labs.quant.qlibLab.metric.sharpe")} value={num(res.backtest.metrics.sharpe, 2)} color={C.blue} />
              <Stat label={t("labs.quant.qlibLab.metric.maxDrawdown")} value={pct(res.backtest.metrics.maxDrawdown)} color={C.red} />
              <Stat label={t("labs.quant.qlibLab.metric.excess")} value={pct(res.backtest.metrics.excess)} color={C.green} />
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-sm text-foreground">{t("labs.quant.qlibLab.topkEquityTitle")}</p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {t("labs.quant.qlibLab.avgTurnover", { v: pct(res.backtest.turnover) })}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={equityData}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={40} />
                  <YAxis {...AXIS_PROPS} />
                  <Tooltip content={<ThemedTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="strategy" name="TopK-Dropout" stroke={C.gold} dot={false} strokeWidth={1.8} />
                  <Line dataKey="benchmark" name={t("labs.quant.qlibLab.equalWeightPool")} stroke={C.text} dot={false} strokeWidth={1.2} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                {t("labs.quant.qlibLab.howToRead")}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
