import { useMemo, useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import { Slider, Stat, C } from "@/components/frontier/ui";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "@/components/common/ChartTheme";
import SendToTool from "@/components/common/SendToTool";
import {
  usePriceSeries, syntheticSeries, type PriceSource, type PriceSeries,
} from "@/lib/priceSeries";
import PriceSourceBar from "@/components/quant/PriceSourceBar";
import { runBacktest, type StrategyId, type BacktestParams } from "@/lib/quant/backtest";

const STRATEGIES: { id: StrategyId; label: string; desc: string }[] = [
  { id: "buyhold", label: "买入持有", desc: "始终满仓,作为基准对照。" },
  { id: "sma", label: "双均线交叉", desc: "快线上穿慢线做多,下穿离场/做空。" },
  { id: "momentum", label: "时序动量", desc: "回看期收益为正则持有,捕捉趋势延续。" },
  { id: "meanrev", label: "均值回归", desc: "价格偏离 z 分数过大时反向押注回归。" },
  { id: "voltarget", label: "波动率目标", desc: "按目标波动率反比调节仓位杠杆。" },
];

const pct = (x: number) => (x * 100).toFixed(1) + "%";
const num = (x: number) => x.toFixed(2);

export default function BacktestLab() {
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

  const { series: live, isFetching, error, refetch } = usePriceSeries(source, symbol, range, !demo);
  const series = demo ?? live;

  const params: BacktestParams = {
    fast, slow, lookback, window, entryZ, exitZ: Math.max(0.2, entryZ - 1),
    targetVol, volWindow, maxLeverage: 3, allowShort,
  };

  const result = useMemo(() => {
    if (!series || series.prices.length < 30) return null;
    return runBacktest(series.prices, series.dates, strategy, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, strategy, fast, slow, lookback, window, entryZ, targetVol, volWindow, allowShort]);

  const chartData = useMemo(() => {
    if (!result) return [];
    const step = Math.max(1, Math.floor(result.equity.length / 400));
    const out: { date: string; strategy: number; benchmark: number; dd: number }[] = [];
    for (let i = 0; i < result.equity.length; i += step) {
      out.push({
        date: result.dates[i],
        strategy: result.equity[i],
        benchmark: result.benchmark[i],
        dd: result.drawdown[i] * 100,
      });
    }
    return out;
  }, [result]);

  const m = result?.metrics;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Lab"
        kicker="Backtest · Strategy Engine"
        title="真实数据回测引擎"
        subtitle="用 Yahoo / CoinGecko / Alpha Vantage 的真实历史价格回测单标的策略(双均线、动量、均值回归、波动率目标),输出净值曲线、回撤、夏普/索提诺/卡玛等完整指标。所有信号采用 T+1 执行以规避前视偏差,回测得到的年化波动率与收益可一键发送到定价工具。"
      />

      <div className="container max-w-6xl px-6 space-y-5">
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
          </aside>

          {/* Results */}
          <div className="space-y-5">
            {!result ? (
              <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
                {isFetching ? "正在拉取真实数据…" : "请选择数据源并拉取至少 30 个交易日的价格数据。"}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="总收益" value={pct(m!.totalReturn)} color={m!.totalReturn >= 0 ? C.green : C.red} />
                  <Stat label="年化(CAGR)" value={pct(m!.cagr)} color={m!.cagr >= 0 ? C.green : C.red} />
                  <Stat label="年化波动" value={pct(m!.annVol)} color={C.blue} />
                  <Stat label="夏普" value={num(m!.sharpe)} color={C.gold} />
                  <Stat label="索提诺" value={num(m!.sortino)} color={C.gold} />
                  <Stat label="最大回撤" value={pct(m!.maxDrawdown)} color={C.red} />
                  <Stat label="卡玛" value={num(m!.calmar)} color={C.teal} />
                  <Stat label="胜率 / 暴露" value={`${pct(m!.winRate)} / ${pct(m!.exposure)}`} color={C.text} sub={`年换手 ${num(m!.turnover)}x`} />
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-gold" /> 净值曲线 vs 买入持有
                    </p>
                    <SendToTool
                      fromId="backtest"
                      label="回测引擎"
                      outputs={{ sigma: m!.annVol, mu: m!.annReturn }}
                      targets={["calculator", "mc-pricer", "calibration"]}
                    />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                      <YAxis {...AXIS_PROPS} width={48} />
                      <Tooltip content={<ThemedTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="strategy" name="策略" stroke={C.gold} dot={false} strokeWidth={1.8} />
                      <Line type="monotone" dataKey="benchmark" name="买入持有" stroke={C.text} dot={false} strokeWidth={1.2} strokeDasharray="4 3" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">回撤(%)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                      <YAxis {...AXIS_PROPS} width={48} />
                      <Tooltip content={<ThemedTooltip />} />
                      <Area type="monotone" dataKey="dd" name="回撤" stroke={C.red} fill={C.red} fillOpacity={0.18} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-[10px] font-mono text-muted-foreground">
                  标的 {series?.symbol} · 数据源 {source} · 教学用途,历史表现不代表未来收益,未计交易成本与滑点。
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}