import { useMemo, useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity, Grid3x3, CalendarDays, Trophy } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
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
  runBacktest, gridScan, monthlyReturns,
  type StrategyId, type BacktestParams, type ScanMetric, type GridScanResult,
} from "@/lib/quant/backtest";

const STRATEGIES: { id: StrategyId; label: string; desc: string }[] = [
  { id: "buyhold", label: "买入持有", desc: "始终满仓,作为基准对照。" },
  { id: "sma", label: "双均线交叉", desc: "快线上穿慢线做多,下穿离场/做空。" },
  { id: "momentum", label: "时序动量", desc: "回看期收益为正则持有,捕捉趋势延续。" },
  { id: "meanrev", label: "均值回归", desc: "价格偏离 z 分数过大时反向押注回归。" },
  { id: "voltarget", label: "波动率目标", desc: "按目标波动率反比调节仓位杠杆。" },
];

const SCAN_METRICS: { id: ScanMetric; label: string }[] = [
  { id: "sharpe", label: "夏普" },
  { id: "cagr", label: "CAGR" },
  { id: "calmar", label: "卡玛" },
  { id: "maxDrawdown", label: "最大回撤" },
];

const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const pct = (x: number) => (x * 100).toFixed(1) + "%";
const num = (x: number) => x.toFixed(2);

type View = "single" | "scan" | "portfolio";

export default function BacktestLab() {
  const [view, setView] = useState<View>("single");
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
  const [scanMetric, setScanMetric] = useState<ScanMetric>("sharpe");

  const { series: live, isFetching, error, refetch } = usePriceSeries(source, symbol, range, !demo && view !== "portfolio");
  const series = demo ?? live;

  const params: BacktestParams = {
    fast, slow, lookback, window, entryZ, exitZ: Math.max(0.2, entryZ - 1),
    targetVol, volWindow, maxLeverage: 3, allowShort, costBps, slippageBps,
  };

  const result = useMemo(() => {
    if (!series || series.prices.length < 30) return null;
    return runBacktest(series.prices, series.dates, strategy, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, strategy, fast, slow, lookback, window, entryZ, targetVol, volWindow, allowShort, costBps, slippageBps]);

  // multi-strategy comparison on the same data / costs
  const compareRows = useMemo(() => {
    if (!series || series.prices.length < 30) return [];
    return STRATEGIES.map((s) => {
      const r = runBacktest(series.prices, series.dates, s.id, params);
      return { id: s.id, label: s.label, m: r.metrics };
    }).sort((a, b) => b.m.sharpe - a.m.sharpe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, fast, slow, lookback, window, entryZ, targetVol, volWindow, allowShort, costBps, slippageBps]);

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
  }, [view, series, strategy, scanConfig, scanMetric, allowShort, costBps, slippageBps]);

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
  const busOutputs = {
    ...(lastPrice != null && Number.isFinite(lastPrice) ? { S0: lastPrice } : {}),
    ...(m ? { sigma: m.annVol, mu: m.annReturn } : {}),
  };

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Lab"
        kicker="Backtest · Portfolio & Strategy Engine"
        title="组合回测与优化引擎"
        subtitle="用真实历史价格回测单标的策略或多资产组合:单标的支持双均线/动量/均值回归/波动率目标并计入交易成本与滑点,组合支持等权/风险平价/最小方差/均值方差并周期再平衡。信号 T+1 执行规避前视偏差,参数网格扫描可视化稳健区,结果可一键发送到定价工具。"
      />

      <div className="container max-w-6xl px-6 space-y-5">
        {/* view tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card/60 p-1 w-fit">
          {([["single", "单标的策略"], ["scan", "参数扫描"], ["portfolio", "组合回测"]] as [View, string][]).map(([v, label]) => (
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
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">策略</p>
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
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">参数</p>
                  {strategy === "sma" && (
                    <>
                      <Slider label="快线" value={fast} min={3} max={60} step={1} onChange={(v) => setFast(Math.min(v, slow - 1))} />
                      <Slider label="慢线" value={slow} min={10} max={250} step={1} onChange={(v) => setSlow(Math.max(v, fast + 1))} />
                    </>
                  )}
                  {strategy === "momentum" && (
                    <Slider label="回看期(交易日)" value={lookback} min={10} max={250} step={5} onChange={setLookback} />
                  )}
                  {strategy === "meanrev" && (
                    <>
                      <Slider label="窗口" value={window} min={5} max={120} step={1} onChange={setWindow} />
                      <Slider label="入场 z 分数" value={entryZ} min={0.5} max={3} step={0.1} onChange={setEntryZ} />
                    </>
                  )}
                  {strategy === "voltarget" && (
                    <>
                      <Slider label="目标年化波动率" value={targetVol} min={0.05} max={0.5} step={0.01} fmt={pct} onChange={setTargetVol} />
                      <Slider label="波动率窗口" value={volWindow} min={10} max={120} step={1} onChange={setVolWindow} />
                    </>
                  )}
                  {strategy === "buyhold" && (
                    <p className="text-[11px] text-muted-foreground">买入持有无可调参数。</p>
                  )}
                  {(strategy === "sma" || strategy === "momentum" || strategy === "meanrev") && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} className="accent-gold" />
                      允许做空(否则离场为空仓)
                    </label>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">交易成本</p>
                  <Slider label="手续费" sub="单边 bps" value={costBps} min={0} max={50} step={1} fmt={(v) => v + "bps"} onChange={setCostBps} />
                  <Slider label="滑点" sub="单边 bps" value={slippageBps} min={0} max={50} step={1} fmt={(v) => v + "bps"} onChange={setSlippageBps} />
                </div>
              </aside>

              {/* Results */}
              <div className="space-y-5">
                {!result ? (
                  <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
                    {isFetching ? "正在拉取真实数据…" : "请选择数据源并拉取至少 30 个交易日的价格数据。"}
                  </div>
                ) : view === "scan" ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Grid3x3 className="w-3.5 h-3.5 text-gold" /> 参数网格扫描
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
                        <p className="text-sm text-muted-foreground py-6 text-center">买入持有无参数可扫描,请切换到其它策略。</p>
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
                            最优 {SCAN_METRICS.find((s) => s.id === scanMetric)?.label} = {fmtScan(scan.best.value)} @ {String(scan.xParam)}={scan.xParam === "targetVol" ? pct(scan.best.x) : scan.best.x}, {String(scan.yParam)}={scan.yParam === "targetVol" ? pct(scan.best.y) : scan.best.y}。点击任意格子即应用该参数组合并回到单标的视图。
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Stat label="总收益(净)" value={pct(m!.totalReturn)} color={m!.totalReturn >= 0 ? C.green : C.red} />
                      <Stat label="年化(CAGR)" value={pct(m!.cagr)} color={m!.cagr >= 0 ? C.green : C.red} />
                      <Stat label="年化波动" value={pct(m!.annVol)} color={C.blue} />
                      <Stat label="夏普" value={num(m!.sharpe)} color={C.gold} />
                      <Stat label="索提诺" value={num(m!.sortino)} color={C.gold} />
                      <Stat label="最大回撤" value={pct(m!.maxDrawdown)} color={C.red} />
                      <Stat label="卡玛 / 成本拖累" value={`${num(m!.calmar)} / ${pct(m!.costDrag)}`} color={C.teal} />
                      <Stat label="胜率 / 暴露" value={`${pct(m!.winRate)} / ${pct(m!.exposure)}`} color={C.text} sub={`年换手 ${num(m!.turnover)}x`} />
                    </div>

                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-gold" /> 净值曲线(毛/净)vs 买入持有
                        </p>
                        <SendToTool
                          fromId="backtest"
                          label="回测引擎"
                          outputs={{ sigma: m!.annVol, mu: m!.annReturn }}
                          targets={["bs", "mc", "greeks-desk"]}
                        />
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                          <YAxis {...AXIS_PROPS} width={48} />
                          <Tooltip content={<ThemedTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="strategy" name="策略(净)" stroke={C.gold} dot={false} strokeWidth={1.8} />
                          <Line type="monotone" dataKey="gross" name="策略(毛)" stroke={C.teal} dot={false} strokeWidth={1} strokeDasharray="2 2" />
                          <Line type="monotone" dataKey="benchmark" name="买入持有" stroke={C.text} dot={false} strokeWidth={1.2} strokeDasharray="4 3" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">回撤(%)</p>
                      <ResponsiveContainer width="100%" height={150}>
                        <ComposedChart data={chartData}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                          <YAxis {...AXIS_PROPS} width={48} />
                          <Tooltip content={<ThemedTooltip />} />
                          <Area type="monotone" dataKey="dd" name="回撤" stroke={C.red} fill={C.red} fillOpacity={0.18} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-gold" /> 多策略对比(同数据/成本)
                        </p>
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="text-[10px] uppercase text-muted-foreground">
                              <th className="text-left py-1">策略</th>
                              <th className="text-right">CAGR</th>
                              <th className="text-right">夏普</th>
                              <th className="text-right">回撤</th>
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
                          <CalendarDays className="w-3.5 h-3.5 text-gold" /> 月度收益(%)
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
                          <p className="text-sm text-muted-foreground py-6 text-center">数据不足以聚合月度收益。</p>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] font-mono text-muted-foreground">
                      标的 {series?.symbol} · 数据源 {source} · 已计入 {costBps + slippageBps}bps 单边成本+滑点。教学用途,历史表现不代表未来收益。
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
