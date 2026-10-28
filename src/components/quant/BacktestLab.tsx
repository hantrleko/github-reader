import FlagshipSummary from "@/components/common/FlagshipSummary";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity, Grid3x3, CalendarDays, Trophy, Umbrella } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import { useToolTab } from "@/lib/useToolTab";
import { Slider, Stat, C } from "@/components/frontier/ui";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "@/components/common/ChartTheme";
import SendToTool from "@/components/common/SendToTool";
import HeatmapGrid from "@/components/quant/HeatmapGrid";
import PortfolioBacktest from "@/components/quant/PortfolioBacktest";
import {
  usePriceSeries, syntheticSeries, type PriceSource, type PriceSeries,
} from "@/lib/priceSeries";
import PriceSourceBar from "@/components/quant/PriceSourceBar";
import {
  runBacktest, gridScan, monthlyReturns, bootstrapCone,
  type StrategyId, type BacktestParams, type ScanMetric, type GridScanResult,
} from "@/lib/quant/backtest";

const STRATEGY_IDS: StrategyId[] = ["buyhold", "sma", "momentum", "meanrev", "voltarget"];
const SCAN_METRIC_IDS: ScanMetric[] = ["sharpe", "cagr", "calmar", "maxDrawdown"];

const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const pct = (x: number) => (x * 100).toFixed(1) + "%";
const num = (x: number) => x.toFixed(2);

type View = "single" | "scan" | "portfolio";
const VIEW_IDS = ["single", "scan", "portfolio"] as const;

export default function BacktestLab() {
  const { t } = useTranslation();
  const STRATEGIES: { id: StrategyId; label: string; desc: string }[] = STRATEGY_IDS.map((id) => ({
    id, label: t(`labs.quant.backtestLab.strategy.${id}.label`), desc: t(`labs.quant.backtestLab.strategy.${id}.desc`),
  }));
  const SCAN_METRICS: { id: ScanMetric; label: string }[] = SCAN_METRIC_IDS.map((id) => ({
    id, label: t(`labs.quant.backtestLab.scanMetric.${id}`),
  }));
  const [view, setView] = useToolTab<View>(VIEW_IDS, "single");
  const [source, setSource] = useState<PriceSource>("yahoo");
  const [symbol, setSymbol] = useState("AAPL");
  const [range, setRange] = useState("5y");
  const [demo, setDemo] = useState<PriceSeries | null>(null);
  const [strategy, setStrategy] = useState<StrategyId>("sma");

  // strategy params
  const [fast, setFast] = useState(20);
  const [slow, setSlow] = useState(60);
  const [lookback, setLookback] = useState(120);
  const [window, setWindow] = useState(20);
  const [entryZ, setEntryZ] = useState(1.5);
  const [targetVol, setTargetVol] = useState(0.15);
  const [volWindow, setVolWindow] = useState(20);
  const [allowShort, setAllowShort] = useState(false);
  const [costBps, setCostBps] = useState(5);
  const [slippageBps, setSlippageBps] = useState(5);
  const [riskFreeRate, setRiskFreeRate] = useState(0);
  const [financingRate, setFinancingRate] = useState(0);
  const [scanMetric, setScanMetric] = useState<ScanMetric>("sharpe");

  const { series: live, isFetching, error, refetch } = usePriceSeries(source, symbol, range, !demo && view !== "portfolio");
  const series = demo ?? live;

  const params: BacktestParams = {
    fast, slow, lookback, window, entryZ, exitZ: Math.max(0.2, entryZ - 1),
    targetVol, volWindow, maxLeverage: 3, allowShort, costBps, slippageBps,
    riskFreeRate, financingRate,
  };

  const result = useMemo(() => {
    if (!series || series.prices.length < 30) return null;
    return runBacktest(series.prices, series.dates, strategy, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, strategy, fast, slow, lookback, window, entryZ, targetVol, volWindow, allowShort, costBps, slippageBps, riskFreeRate, financingRate]);

  // multi-strategy comparison on the same data / costs
  const compareRows = useMemo(() => {
    if (!series || series.prices.length < 30) return [];
    return STRATEGIES.map((s) => {
      const r = runBacktest(series.prices, series.dates, s.id, params);
      return { id: s.id, label: s.label, m: r.metrics };
    }).sort((a, b) => b.m.sharpe - a.m.sharpe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, fast, slow, lookback, window, entryZ, targetVol, volWindow, allowShort, costBps, slippageBps, riskFreeRate, financingRate]);

  const chartData = useMemo(() => {
    if (!result) return [];
    const step = Math.max(1, Math.floor(result.equity.length / 400));
    const out: { date: string; strategy: number; gross: number; benchmark: number; dd: number }[] = [];
    for (let i = 0; i < result.equity.length; i += step) {
      out.push({
        date: result.dates[i],
        strategy: result.equity[i],
        gross: result.equityGross[i],
        benchmark: result.benchmark[i],
        dd: result.drawdown[i] * 100,
      });
    }
    return out;
  }, [result]);

  const monthly = useMemo(() => {
    if (!result) return null;
    return monthlyReturns(result.dates, result.equity);
  }, [result]);

  // bootstrap forward risk cone from the strategy's net daily returns
  const cone = useMemo(() => {
    if (!result || result.equity.length < 60) return null;
    const rets: number[] = [];
    for (let i = 1; i < result.equity.length; i++) rets.push(result.equity[i] / result.equity[i - 1] - 1);
    return bootstrapCone(rets, { horizon: 252, nSims: 400, blockSize: 10, seed: 7 });
  }, [result]);

  const coneChart = useMemo(() => {
    if (!cone) return [];
    return cone.horizon.map((h, i) => ({
      day: h,
      p5: cone.p5[i], p25: cone.p25[i], p50: cone.p50[i], p75: cone.p75[i], p95: cone.p95[i],
      band90: [cone.p5[i], cone.p95[i]],
      band50: [cone.p25[i], cone.p75[i]],
    }));
  }, [cone]);

  // parameter scan
  const scanConfig = useMemo(() => {
    switch (strategy) {
      case "sma":
        return { xParam: "fast" as const, xValues: [5, 10, 15, 20, 30, 40, 50], yParam: "slow" as const, yValues: [50, 80, 100, 120, 150, 200, 250] };
      case "meanrev":
        return { xParam: "window" as const, xValues: [10, 15, 20, 30, 40, 60], yParam: "entryZ" as const, yValues: [1.0, 1.5, 2.0, 2.5, 3.0] };
      case "voltarget":
        return { xParam: "targetVol" as const, xValues: [0.1, 0.15, 0.2, 0.25, 0.3], yParam: "volWindow" as const, yValues: [10, 20, 30, 60, 90] };
      case "momentum":
        return { xParam: "lookback" as const, xValues: [20, 40, 60, 90, 120, 150, 200, 250], yParam: "costBps" as const, yValues: [0, 5, 10, 20, 40] };
      default:
        return null;
    }
  }, [strategy]);

  const scan: GridScanResult | null = useMemo(() => {
    if (view !== "scan" || !series || !scanConfig || series.prices.length < 30) return null;
    return gridScan(series.prices, series.dates, strategy, { ...scanConfig, metric: scanMetric, base: params });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, series, strategy, scanConfig, scanMetric, allowShort, costBps, slippageBps, riskFreeRate, financingRate]);

  const applyScanCell = (row: number, col: number) => {
    if (!scan) return;
    const xv = scan.xValues[col];
    const yv = scan.yValues[row];
    const set = (p: keyof BacktestParams, v: number) => {
      if (p === "fast") setFast(v); else if (p === "slow") setSlow(v);
      else if (p === "window") setWindow(v); else if (p === "entryZ") setEntryZ(v);
      else if (p === "targetVol") setTargetVol(v); else if (p === "volWindow") setVolWindow(v);
      else if (p === "lookback") setLookback(v); else if (p === "costBps") setCostBps(v);
    };
    set(scan.xParam, xv);
    set(scan.yParam, yv);
    setView("single");
  };

  const m = result?.metrics;
  const fmtScan = (v: number) => (scanMetric === "cagr" || scanMetric === "maxDrawdown" ? pct(v) : num(v));

  // Last real price → S0 for pricing tools; annualised vol/return as σ/μ handoff.
  const lastPrice = series && series.prices.length ? series.prices[series.prices.length - 1] : undefined;
  const bench = (() => {
    const b = result?.benchmark as number[] | undefined;
    if (!b || b.length < 2) return null;
    let peak = b[0], dd = 0;
    for (const v of b) { peak = Math.max(peak, v); dd = Math.min(dd, v / peak - 1); }
    const rets = b.slice(1).map((v, i) => v / b[i] - 1);
    const mu = rets.reduce((a, x) => a + x, 0) / rets.length;
    const sd = Math.sqrt(rets.reduce((a, x) => a + (x - mu) ** 2, 0) / Math.max(1, rets.length - 1));
    return { sharpe: sd > 0 ? ((mu - riskFreeRate / 252) / sd) * Math.sqrt(252) : 0, maxDD: dd };
  })();
  const applyPreset = (p: { strategy: StrategyId; fast?: number; slow?: number; lookback?: number; costBps: number; allowShort: boolean }) => {
    setStrategy(p.strategy); if (p.fast) setFast(p.fast); if (p.slow) setSlow(p.slow); if (p.lookback) setLookback(p.lookback);
    setCostBps(p.costBps); setSlippageBps(p.costBps); setAllowShort(p.allowShort);
  };
  const busOutputs = {
    ...(lastPrice != null && Number.isFinite(lastPrice) ? { S0: lastPrice } : {}),
    ...(m ? { sigma: m.annVol, mu: m.annReturn } : {}),
  };

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Lab"
        kicker="Backtest · Portfolio & Strategy Engine"
        title={t("labs.quant.backtestLab.title")}
        subtitle={t("labs.quant.backtestLab.subtitle")}
      />

      <div className="container max-w-6xl px-6 space-y-5">
        {/* view tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card/60 p-1 w-fit">
          {([["single", t("labs.quant.backtestLab.tab.single")], ["scan", t("labs.quant.backtestLab.tab.scan")], ["portfolio", t("labs.quant.backtestLab.tab.portfolio")]] as [View, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={"px-3.5 py-1.5 rounded-md text-xs font-mono transition-colors " +
                (view === v ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground")}>
              {label}
            </button>
          ))}
        </div>

        {view === "portfolio" ? (
          <PortfolioBacktest />
        ) : (
          <>
            <PriceSourceBar
              source={source} symbol={symbol} range={range}
              isFetching={isFetching} error={demo ? null : error}
              n={series?.prices.length}
              onSource={(s) => { setSource(s); setDemo(null); }}
              onSymbol={(s) => { setSymbol(s); setDemo(null); }}
              onRange={(r) => { setRange(r); setDemo(null); }}
              onRefetch={() => { setDemo(null); refetch(); }}
              onUseDemo={() => setDemo(syntheticSeries(756, 0.1, 0.28, 11))}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
              {/* Controls */}
              <aside className="space-y-4">
                <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("flagship.presets")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      ["bt.classic", { strategy: "sma", fast: 50, slow: 200, costBps: 5, allowShort: false }],
                      ["bt.fastTrend", { strategy: "sma", fast: 10, slow: 30, costBps: 10, allowShort: true }],
                      ["bt.momentum", { strategy: "momentum", lookback: 252, costBps: 5, allowShort: false }],
                    ] as [string, Parameters<typeof applyPreset>[0]][]).map(([k, p]) => (
                      <button key={k} type="button" onClick={() => applyPreset(p)}
                        className="px-2.5 py-1 rounded-md border border-border text-[11px] hover:border-gold/40 hover:text-gold">
                        {t(`flagship.${k}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("labs.quant.backtestLab.strategyLabel")}</p>
                  {STRATEGIES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStrategy(s.id)}
                      className={
                        "w-full text-left px-3 py-2 rounded-md border transition-colors " +
                        (s.id === strategy ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30")
                      }
                    >
                      <p className="text-xs font-medium">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("labs.quant.backtestLab.paramsLabel")}</p>
                  {strategy === "sma" && (
                    <>
                      <Slider label={t("labs.quant.backtestLab.param.fast")} value={fast} min={3} max={60} step={1} onChange={(v) => setFast(Math.min(v, slow - 1))} />
                      <Slider label={t("labs.quant.backtestLab.param.slow")} value={slow} min={10} max={250} step={1} onChange={(v) => setSlow(Math.max(v, fast + 1))} />
                    </>
                  )}
                  {strategy === "momentum" && (
                    <Slider label={t("labs.quant.backtestLab.param.lookback")} value={lookback} min={10} max={250} step={5} onChange={setLookback} />
                  )}
                  {strategy === "meanrev" && (
                    <>
                      <Slider label={t("labs.quant.backtestLab.param.window")} value={window} min={5} max={120} step={1} onChange={setWindow} />
                      <Slider label={t("labs.quant.backtestLab.param.entryZ")} value={entryZ} min={0.5} max={3} step={0.1} onChange={setEntryZ} />
                    </>
                  )}
                  {strategy === "voltarget" && (
                    <>
                      <Slider label={t("labs.quant.backtestLab.param.targetVol")} value={targetVol} min={0.05} max={0.5} step={0.01} fmt={pct} onChange={setTargetVol} />
                      <Slider label={t("labs.quant.backtestLab.param.volWindow")} value={volWindow} min={10} max={120} step={1} onChange={setVolWindow} />
                    </>
                  )}
                  {strategy === "buyhold" && (
                    <p className="text-[11px] text-muted-foreground">{t("labs.quant.backtestLab.buyholdNoParams")}</p>
                  )}
                  {(strategy === "sma" || strategy === "momentum" || strategy === "meanrev") && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} className="accent-gold" />
                      {t("labs.quant.backtestLab.allowShort")}
                    </label>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">{t("labs.quant.backtestLab.tradingCost")}</p>
                  <Slider label={t("labs.quant.backtestLab.fee")} sub={t("labs.quant.backtestLab.perSideBps")} value={costBps} min={0} max={50} step={1} fmt={(v) => v + "bps"} onChange={setCostBps} />
                  <Slider label={t("labs.quant.backtestLab.slippage")} sub={t("labs.quant.backtestLab.perSideBps")} value={slippageBps} min={0} max={50} step={1} fmt={(v) => v + "bps"} onChange={setSlippageBps} />
                  <Slider label={t("labs.quant.backtestLab.riskFree")} sub={t("labs.quant.backtestLab.annualised")} value={riskFreeRate} min={0} max={0.1} step={0.005} fmt={pct} onChange={setRiskFreeRate} />
                  <Slider label={t("labs.quant.backtestLab.financing")} sub={t("labs.quant.backtestLab.financingSub")} value={financingRate} min={0} max={0.15} step={0.005} fmt={pct} onChange={setFinancingRate} />
                </div>
              </aside>

              {/* Results */}
              <div className="space-y-5">
                {!result ? (
                  <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
                    {isFetching ? t("labs.quant.backtestLab.fetchingReal") : t("labs.quant.backtestLab.needData")}
                  </div>
                ) : view === "scan" ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Grid3x3 className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.backtestLab.gridScanTitle")}
                        </p>
                        <div className="flex gap-1">
                          {SCAN_METRICS.map((sm) => (
                            <button key={sm.id} onClick={() => setScanMetric(sm.id)}
                              className={"px-2 py-1 rounded text-[11px] font-mono border transition-colors " +
                                (sm.id === scanMetric ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
                              {sm.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {!scan || !scanConfig ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">{t("labs.quant.backtestLab.buyholdNoScan")}</p>
                      ) : (
                        <>
                          <HeatmapGrid
                            matrix={scan.grid}
                            rowLabels={scan.yValues.map((v) => (scan.yParam === "targetVol" ? pct(v) : String(v)))}
                            colLabels={scan.xValues.map((v) => (scan.xParam === "targetVol" ? pct(v) : String(v)))}
                            rowTitle={String(scan.yParam)}
                            colTitle={String(scan.xParam)}
                            diverging={scanMetric === "maxDrawdown"}
                            fmt={fmtScan}
                            onCell={applyScanCell}
                            highlight={{
                              row: scan.yValues.indexOf(scan.best.y),
                              col: scan.xValues.indexOf(scan.best.x),
                            }}
                          />
                          <p className="text-[11px] font-mono text-muted-foreground mt-3">
                            {t("labs.quant.backtestLab.bestScan", { metric: SCAN_METRICS.find((s) => s.id === scanMetric)?.label, value: fmtScan(scan.best.value), xParam: String(scan.xParam), xVal: scan.xParam === "targetVol" ? pct(scan.best.x) : scan.best.x, yParam: String(scan.yParam), yVal: scan.yParam === "targetVol" ? pct(scan.best.y) : scan.best.y })}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {bench && (
                      <FlagshipSummary
                        title={`Backtest · ${demo ? "synthetic" : symbol} · ${strategy}`}
                        params={{ symbol: demo ? "synthetic" : symbol, range, strategy, fast, slow, lookback, costBps, slippageBps, allowShort, riskFreeRate, financingRate, Sharpe: num(m!.sharpe), maxDD: pct(m!.maxDrawdown), "B&H Sharpe": num(bench.sharpe), "B&H maxDD": pct(bench.maxDD) }}
                        conclusion={t(m!.sharpe >= bench.sharpe ? "flagship.bt.beat" : "flagship.bt.lag", {
                          s: num(m!.sharpe), b: num(bench.sharpe), dd: pct(m!.maxDrawdown), bdd: pct(bench.maxDD),
                          ddWord: t(m!.maxDrawdown > bench.maxDD ? "flagship.bt.shallower" : "flagship.bt.deeper"),
                        })}
                      />
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Stat label={t("labs.quant.backtestLab.metric.totalReturnNet")} value={pct(m!.totalReturn)} color={m!.totalReturn >= 0 ? C.green : C.red} />
                      <Stat label={t("labs.quant.backtestLab.metric.cagr")} value={pct(m!.cagr)} color={m!.cagr >= 0 ? C.green : C.red} />
                      <Stat label={t("labs.quant.backtestLab.metric.annVol")} value={pct(m!.annVol)} color={C.blue} />
                      <Stat label={t("labs.quant.backtestLab.metric.sharpe")} value={num(m!.sharpe)} color={C.gold} />
                      <Stat label={t("labs.quant.backtestLab.metric.sortino")} value={num(m!.sortino)} color={C.gold} />
                      <Stat label={t("labs.quant.backtestLab.metric.maxDrawdown")} value={pct(m!.maxDrawdown)} color={C.red} />
                      <Stat label={t("labs.quant.backtestLab.metric.calmarCostDrag")} value={`${num(m!.calmar)} / ${pct(m!.costDrag)}`} color={C.teal} />
                      <Stat label={t("labs.quant.backtestLab.metric.winRateExposure")} value={`${pct(m!.winRate)} / ${pct(m!.exposure)}`} color={C.text} sub={t("labs.quant.backtestLab.annTurnover", { v: num(m!.turnover) })} />
                    </div>

                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.backtestLab.equityChartTitle")}
                        </p>
                        <SendToTool
                          fromId="backtest"
                          label={t("labs.quant.backtestLab.sendToToolLabel")}
                          outputs={busOutputs}
                          targets={["bs", "mc", "greeks-desk"]}
                        />
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                          <YAxis {...AXIS_PROPS} width={52} domain={["auto", "auto"]} tickCount={6} interval="preserveStartEnd" minTickGap={14} tickFormatter={(v: number) => (Number.isFinite(v) ? v.toFixed(Math.abs(v) < 10 ? 2 : 1) : "")} />
                          <Tooltip content={<ThemedTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="strategy" name={t("labs.quant.backtestLab.strategyNet")} stroke={C.gold} dot={false} strokeWidth={1.8} />
                          <Line type="monotone" dataKey="gross" name={t("labs.quant.backtestLab.strategyGross")} stroke={C.teal} dot={false} strokeWidth={1} strokeDasharray="2 2" />
                          <Line type="monotone" dataKey="benchmark" name={t("labs.quant.backtestLab.buyhold")} stroke={C.text} dot={false} strokeWidth={1.2} strokeDasharray="4 3" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">{t("labs.quant.backtestLab.drawdownPct")}</p>
                      <ResponsiveContainer width="100%" height={150}>
                        <ComposedChart data={chartData}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                          <YAxis {...AXIS_PROPS} width={48} />
                          <Tooltip content={<ThemedTooltip />} />
                          <Area type="monotone" dataKey="dd" name={t("labs.quant.backtestLab.drawdown")} stroke={C.red} fill={C.red} fillOpacity={0.18} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.backtestLab.compareTitle")}
                        </p>
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="text-[10px] uppercase text-muted-foreground">
                              <th className="text-left py-1">{t("labs.quant.backtestLab.table.strategy")}</th>
                              <th className="text-right">CAGR</th>
                              <th className="text-right">{t("labs.quant.backtestLab.table.sharpe")}</th>
                              <th className="text-right">{t("labs.quant.backtestLab.table.drawdown")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compareRows.map((r) => (
                              <tr key={r.id}
                                onClick={() => setStrategy(r.id)}
                                className={"border-t border-border/40 cursor-pointer hover:bg-secondary/30 " + (r.id === strategy ? "bg-gold/5" : "")}>
                                <td className="py-1.5">{r.label}{r.id === strategy ? " ◂" : ""}</td>
                                <td className="text-right tabular-nums" style={{ color: r.m.cagr >= 0 ? C.green : C.red }}>{pct(r.m.cagr)}</td>
                                <td className="text-right tabular-nums" style={{ color: C.gold }}>{num(r.m.sharpe)}</td>
                                <td className="text-right tabular-nums" style={{ color: C.red }}>{pct(r.m.maxDrawdown)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.backtestLab.monthlyReturns")}
                        </p>
                        {monthly && monthly.years.length > 0 ? (
                          <HeatmapGrid
                            matrix={monthly.matrix}
                            rowLabels={monthly.years.map(String)}
                            colLabels={MONTHS}
                            diverging
                            cellLabel={false}
                            fmt={(v) => (v * 100).toFixed(1) + "%"}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground py-6 text-center">{t("labs.quant.backtestLab.insufficientMonthly")}</p>
                        )}
                      </div>
                    </div>

                    {cone && (
                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Umbrella className="w-3.5 h-3.5 text-gold" /> {t("labs.quant.backtestLab.riskConeTitle", { n: cone.nSims })}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground mb-3">
                          {t("labs.quant.backtestLab.riskConeStats", { p50: cone.terminal.p50.toFixed(2), p5: cone.terminal.p5.toFixed(2), p95: cone.terminal.p95.toFixed(2), probLoss: (cone.terminal.probLoss * 100).toFixed(1) })}
                        </p>
                        <ResponsiveContainer width="100%" height={220}>
                          <ComposedChart data={coneChart}>
                            <CartesianGrid {...GRID_PROPS} />
                            <XAxis dataKey="day" {...AXIS_PROPS} label={{ value: t("labs.quant.backtestLab.tradingDaysAxis"), position: "insideBottomRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis {...AXIS_PROPS} width={48} domain={["auto", "auto"]} />
                            <Tooltip content={<ThemedTooltip />} />
                            <Area type="monotone" dataKey="band90" name="P5–P95" stroke="none" fill={C.blue} fillOpacity={0.12} isAnimationActive={false} />
                            <Area type="monotone" dataKey="band50" name="P25–P75" stroke="none" fill={C.blue} fillOpacity={0.22} isAnimationActive={false} />
                            <Line type="monotone" dataKey="p50" name={t("labs.quant.backtestLab.median")} stroke={C.gold} dot={false} strokeWidth={1.8} isAnimationActive={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                        <p className="text-[10px] font-mono text-muted-foreground mt-2">
                          {t("labs.quant.backtestLab.riskConeFootnote")}
                        </p>
                      </div>
                    )}

                    <p className="text-[10px] font-mono text-muted-foreground">
                      {t("labs.quant.backtestLab.footnote", { symbol: series?.symbol, source, cost: costBps + slippageBps })}
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
