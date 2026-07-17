import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity, ExternalLink, Loader2 } from "lucide-react";
import { useMarketQuotes, useFredSeries } from "@/lib/marketData";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip, CHART_COLORS } from "@/components/common/ChartTheme";
import SectionHeader from "@/components/common/SectionHeader";

const SYMBOLS = [
  { s: "^VIX", name: "VIX (30D)", color: CHART_COLORS.gold },
  { s: "^VIX9D", name: "VIX9D (9D)", color: CHART_COLORS.teal },
  { s: "^VVIX", name: "VVIX (Vol of VIX)", color: CHART_COLORS.series[0] },
  { s: "^SKEW", name: "SKEW", color: CHART_COLORS.series[1] },
];

const fmt = (n: number | null | undefined, d = 2) =>
  n == null || !Number.isFinite(n) ? "—" : n.toFixed(d);

const CboeSentimentExplorer = () => {
  const vix = useMarketQuotes("^VIX", "1y");
  const vix9d = useMarketQuotes("^VIX9D", "1y");
  const vvix = useMarketQuotes("^VVIX", "1y");
  const skew = useMarketQuotes("^SKEW", "1y");
  const pcr = useFredSeries("CPCE", "2023-01-01", true); // Equity Put/Call Ratio

  const series = [vix, vix9d, vvix, skew];
  const loading = series.some((q) => q.isFetching);

  const merged = useMemo(() => {
    if (!vix.data) return [];
    const map = new Map<string, Record<string, number | string>>();
    SYMBOLS.forEach((cfg, idx) => {
      const d = series[idx].data;
      if (!d) return;
      d.dates.forEach((dt, i) => {
        if (!map.has(dt)) map.set(dt, { date: dt });
        map.get(dt)![cfg.s] = d.closes[i];
      });
    });
    return Array.from(map.values()).sort((a, b) => (a.date as string).localeCompare(b.date as string));
  }, [vix.data, vix9d.data, vvix.data, skew.data]);

  const termStructure = useMemo(() => {
    const v30 = vix.data?.lastPrice;
    const v9 = vix9d.data?.lastPrice;
    if (v30 == null || v9 == null) return null;
    const ratio = v9 / v30;
    return {
      v9, v30, ratio,
      regime: ratio < 0.95 ? "Contango (低压)" : ratio > 1.05 ? "Backwardation (高压)" : "平坦",
    };
  }, [vix.data, vix9d.data]);

  const pcrLatest = pcr.data?.latest ?? null;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Data"
        kicker="Cboe · Volatility & Sentiment"
        title="CBOE 市场情绪温度计"
        subtitle="用 VIX 期限结构、VVIX、SKEW 和 FRED 代理的 Put/Call Ratio 一起判断市场是恐慌还是贪婪。数据来自 Yahoo 官方 Cboe 指数与 FRED CPCE 序列。"
      />
      <div className="container max-w-6xl px-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SYMBOLS.map((cfg, i) => {
            const q = series[i];
            return (
              <div key={cfg.s} className="rounded-lg border border-border/60 bg-card/40 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{cfg.name}</p>
                <p className="text-lg font-display tabular-nums text-foreground mt-1">
                  {fmt(q.data?.lastPrice, cfg.s === "^SKEW" ? 1 : 2)}
                </p>
              </div>
            );
          })}
        </div>

        {termStructure && (
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 flex flex-wrap items-center gap-4 text-xs">
            <Activity className="w-4 h-4 text-gold" />
            <span className="font-mono">
              VIX9D / VIX30 = <span className="text-gold">{termStructure.ratio.toFixed(3)}</span>
            </span>
            <span className="text-foreground">状态: <b>{termStructure.regime}</b></span>
            {pcrLatest != null && (
              <span className="font-mono ml-auto">
                Equity Put/Call Ratio (FRED CPCE): <span className="text-gold">{pcrLatest.toFixed(2)}</span>
              </span>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg text-foreground">1 年时间序列</h3>
            <a
              href="https://www.cboe.com/us/options/market_statistics/"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
            >
              在 Cboe 查看官方 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="h-[340px]">
            {loading && !merged.length ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> 拉取 Cboe 指数…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={merged} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} tickFormatter={(d) => (d as string).slice(0, 7)} />
                  <YAxis {...AXIS_PROPS} width={48} />
                  <Tooltip content={<ThemedTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {SYMBOLS.map((cfg) => (
                    <Line key={cfg.s} type="monotone" dataKey={cfg.s} name={cfg.name} stroke={cfg.color} strokeWidth={1.4} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CboeSentimentExplorer;