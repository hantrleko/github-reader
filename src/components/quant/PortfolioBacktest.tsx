import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart, Area, Line, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, RefreshCw, Layers, PieChart } from "lucide-react";
import { Slider, Stat, C } from "@/components/frontier/ui";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "@/components/common/ChartTheme";
import SendToTool from "@/components/common/SendToTool";
import HeatmapGrid from "@/components/quant/HeatmapGrid";
import { usePriceSeries, type PriceSource } from "@/lib/priceSeries";
import { PRICE_SOURCES } from "@/lib/priceSeries";
import {
  alignSeries, runPortfolioBacktest, covMatrix, correlationFromCov, returnsFromPrices,
  riskContributions, type AllocMethod, type RebalanceFreq,
} from "@/lib/quant/portfolio";

const METHOD_IDS: AllocMethod[] = ["equal", "riskparity", "minvar", "meanvar"];
const FREQ_IDS: RebalanceFreq[] = ["none", "monthly", "quarterly", "yearly"];

const SERIES_COLORS = [C.gold, C.blue, C.teal, C.green, C.red, "hsl(280,60%,60%)"];
const MAX_SLOTS = 6;
const pct = (x: number) => (x * 100).toFixed(1) + "%";
const num = (x: number) => x.toFixed(2);

export default function PortfolioBacktest() {
  const { t } = useTranslation();
  const METHODS: { id: AllocMethod; label: string; desc: string }[] = METHOD_IDS.map((id) => ({
    id, label: t(`labs.quant.portfolioBacktest.method.${id}.label`), desc: t(`labs.quant.portfolioBacktest.method.${id}.desc`),
  }));
  const FREQS: { id: RebalanceFreq; label: string }[] = FREQ_IDS.map((id) => ({
    id, label: t(`labs.quant.portfolioBacktest.freq.${id}`),
  }));
  const [source, setSource] = useState<PriceSource>("yahoo");
  const [range, setRange] = useState("5y");
  const [raw, setRaw] = useState("AAPL, MSFT, GOOGL, AMZN");
  const [loadKey, setLoadKey] = useState(0);
  const [method, setMethod] = useState<AllocMethod>("riskparity");
  const [rebalance, setRebalance] = useState<RebalanceFreq>("quarterly");
  const [costBps, setCostBps] = useState(10);
  const [estWindow, setEstWindow] = useState(252);

  // committed symbol list (only updates on "load")
  const [symbols, setSymbols] = useState<string[]>(["AAPL", "MSFT", "GOOGL", "AMZN"]);

  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => symbols[i] ?? "");
  // fixed number of hook calls
  const s0 = usePriceSeries(source, slots[0], range, !!slots[0]);
  const s1 = usePriceSeries(source, slots[1], range, !!slots[1]);
  const s2 = usePriceSeries(source, slots[2], range, !!slots[2]);
  const s3 = usePriceSeries(source, slots[3], range, !!slots[3]);
  const s4 = usePriceSeries(source, slots[4], range, !!slots[4]);
  const s5 = usePriceSeries(source, slots[5], range, !!slots[5]);
  const all = [s0, s1, s2, s3, s4, s5];

  const isFetching = all.some((s, i) => slots[i] && s.isFetching);
  const loaded = all
    .map((s, i) => (slots[i] && s.series ? { symbol: slots[i], dates: s.series.dates, prices: s.series.prices } : null))
    .filter((x): x is { symbol: string; dates: string[]; prices: number[] } => !!x);

  const aligned = useMemo(() => alignSeries(loaded), [loaded]);

  const result = useMemo(() => {
    if (aligned.pricesByAsset.length < 2 || aligned.dates.length < 30) return null;
    return runPortfolioBacktest(aligned, { method, rebalance, costBps, estWindow });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aligned, method, rebalance, costBps, estWindow]);

  const riskDecomp = useMemo(() => {
    if (!result || aligned.pricesByAsset.length < 2) return null;
    const cov = covMatrix(returnsFromPrices(aligned.pricesByAsset));
    return { rc: riskContributions(cov, result.targetWeights), corr: correlationFromCov(cov) };
  }, [result, aligned]);

  const equityChart = useMemo(() => {
    if (!result) return [];
    const step = Math.max(1, Math.floor(result.equity.length / 400));
    const out: { date: string; portfolio: number; benchmark: number }[] = [];
    for (let i = 0; i < result.equity.length; i += step) {
      out.push({ date: result.dates[i], portfolio: result.equity[i], benchmark: result.benchmark[i] });
    }
    return out;
  }, [result]);

  const weightChart = useMemo(() => {
    if (!result) return [];
    const step = Math.max(1, Math.floor(result.weightHistory.length / 250));
    const out: Record<string, number | string>[] = [];
    for (let i = 0; i < result.weightHistory.length; i += step) {
      const row: Record<string, number | string> = { date: result.dates[i + 1] ?? result.dates[i] };
      aligned.symbols.forEach((sym, k) => (row[sym] = (result.weightHistory[i][k] ?? 0) * 100));
      out.push(row);
    }
    return out;
  }, [result, aligned]);

  const m = result?.metrics;
  const loadSymbols = () => {
    const list = raw.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean).slice(0, MAX_SLOTS);
    setSymbols(list);
    setLoadKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      {/* loader */}
      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRICE_SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={"px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors " +
                (s.id === source ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}
            >{s.label}</button>
          ))}
          <div className="flex gap-1 ml-auto">
            {(PRICE_SOURCES.find((s) => s.id === source)?.ranges ?? []).map((r) => (
              <button key={r.v} onClick={() => setRange(r.v)}
                className={"px-2 py-1 rounded text-[11px] font-mono border transition-colors " +
                  (r.v === range ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}
              >{r.label}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={t("labs.quant.portfolioBacktest.symbolsPlaceholder")}
            className="flex-1 min-w-[240px] px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-sm font-mono focus:outline-none focus:border-gold/40"
          />
          <button onClick={loadSymbols} disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50">
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {t("labs.quant.portfolioBacktest.loadPortfolio")}
          </button>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground">
          {symbols.length ? t("labs.quant.portfolioBacktest.selectedSymbols", { list: symbols.join(" · ") }) : t("labs.quant.portfolioBacktest.needTwoSymbols")}
          {aligned.dates.length ? t("labs.quant.portfolioBacktest.commonDays", { n: aligned.dates.length }) : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("labs.quant.portfolioBacktest.allocMethod")}</p>
            {METHODS.map((mt) => (
              <button key={mt.id} onClick={() => setMethod(mt.id)}
                className={"w-full text-left px-3 py-2 rounded-md border transition-colors " +
                  (mt.id === method ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30")}>
                <p className="text-xs font-medium">{mt.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{mt.desc}</p>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("labs.quant.portfolioBacktest.rebalanceCost")}</p>
            <div className="flex flex-wrap gap-1">
              {FREQS.map((f) => (
                <button key={f.id} onClick={() => setRebalance(f.id)}
                  className={"px-2 py-1 rounded text-[11px] font-mono border transition-colors " +
                    (f.id === rebalance ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
                  {f.label}
                </button>
              ))}
            </div>
            <Slider label={t("labs.quant.portfolioBacktest.costSlippage")} sub={t("labs.quant.portfolioBacktest.perSideBps")} value={costBps} min={0} max={50} step={1} fmt={(v) => v + "bps"} onChange={setCostBps} />
            <Slider label={t("labs.quant.portfolioBacktest.estWindow")} sub={t("labs.quant.portfolioBacktest.tradingDays")} value={estWindow} min={60} max={756} step={21} onChange={setEstWindow} />
          </div>
        </aside>

        <div className="space-y-5">
          {!result ? (
            <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
              {isFetching ? t("labs.quant.portfolioBacktest.fetchingReal") : t("labs.quant.portfolioBacktest.needPortfolio")}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label={t("labs.quant.portfolioBacktest.metric.totalReturn")} value={pct(m!.totalReturn)} color={m!.totalReturn >= 0 ? C.green : C.red} />
                <Stat label={t("labs.quant.portfolioBacktest.metric.cagr")} value={pct(m!.cagr)} color={m!.cagr >= 0 ? C.green : C.red} />
                <Stat label={t("labs.quant.portfolioBacktest.metric.annVol")} value={pct(m!.annVol)} color={C.blue} />
                <Stat label={t("labs.quant.portfolioBacktest.metric.sharpe")} value={num(m!.sharpe)} color={C.gold} />
                <Stat label={t("labs.quant.portfolioBacktest.metric.maxDrawdown")} value={pct(m!.maxDrawdown)} color={C.red} />
                <Stat label={t("labs.quant.portfolioBacktest.metric.calmar")} value={num(m!.calmar)} color={C.teal} />
                <Stat label={t("labs.quant.portfolioBacktest.metric.turnover")} value={num(m!.turnover) + "x"} color={C.text} />
                <Stat label={t("labs.quant.portfolioBacktest.metric.costDrag")} value={pct(m!.costDrag)} color={C.red} sub={t("labs.quant.portfolioBacktest.grossNetCagr")} />
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.portfolioBacktest.equityChartTitle")}
                  </p>
                  <SendToTool fromId="backtest" label={t("labs.quant.portfolioBacktest.sendToToolLabel")} outputs={{ sigma: m!.annVol, mu: m!.annReturn }} targets={["bs", "mc", "greeks-desk"]} />
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={equityChart}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                    <YAxis {...AXIS_PROPS} width={48} />
                    <Tooltip content={<ThemedTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="portfolio" name={t("labs.quant.portfolioBacktest.portfolio")} stroke={C.gold} dot={false} strokeWidth={1.8} />
                    <Line type="monotone" dataKey="benchmark" name={t("labs.quant.portfolioBacktest.equalWeightBenchmark")} stroke={C.text} dot={false} strokeWidth={1.2} strokeDasharray="4 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-4">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">{t("labs.quant.portfolioBacktest.weightEvolution")}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weightChart} stackOffset="expand">
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                    <YAxis {...AXIS_PROPS} width={40} tickFormatter={(v) => (v * 100).toFixed(0)} />
                    <Tooltip content={<ThemedTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {aligned.symbols.map((sym, k) => (
                      <Area key={sym} type="monotone" dataKey={sym} stackId="w" stroke={SERIES_COLORS[k % 6]} fill={SERIES_COLORS[k % 6]} fillOpacity={0.5} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {riskDecomp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-border bg-card/60 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <PieChart className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.portfolioBacktest.targetWeightsRisk")}
                    </p>
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-[10px] uppercase text-muted-foreground">
                          <th className="text-left py-1">{t("labs.quant.portfolioBacktest.table.symbol")}</th>
                          <th className="text-right">{t("labs.quant.portfolioBacktest.table.weight")}</th>
                          <th className="text-right">{t("labs.quant.portfolioBacktest.table.riskContribution")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aligned.symbols.map((sym, k) => (
                          <tr key={sym} className="border-t border-border/40">
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ background: SERIES_COLORS[k % 6] }} />{sym}
                            </td>
                            <td className="text-right tabular-nums" style={{ color: C.gold }}>{pct(riskDecomp.rc.rows[k].weight)}</td>
                            <td className="text-right tabular-nums" style={{ color: C.teal }}>{pct(riskDecomp.rc.rows[k].pcr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[10px] text-muted-foreground mt-2">{t("labs.quant.portfolioBacktest.portfolioAnnVol", { v: pct(riskDecomp.rc.sigma) })}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">{t("labs.quant.portfolioBacktest.corrMatrix")}</p>
                    <HeatmapGrid
                      matrix={riskDecomp.corr}
                      rowLabels={aligned.symbols}
                      colLabels={aligned.symbols}
                      diverging
                      fmt={(v) => v.toFixed(2)}
                    />
                  </div>
                </div>
              )}

              <p className="text-[10px] font-mono text-muted-foreground">
                {t("labs.quant.portfolioBacktest.footnote", { source, n: aligned.symbols.length, win: estWindow, rebal: rebalance === "none" ? t("labs.quant.portfolioBacktest.freq.none") : t("labs.quant.portfolioBacktest.periodicRebalance"), cost: costBps })}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
