import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LineChart as LineChartIcon, ExternalLink, Loader2, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Search,
} from "lucide-react";
import { useAlphaVantage } from "@/lib/marketData";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip, CHART_COLORS } from "@/components/common/ChartTheme";
import SectionHeader from "@/components/common/SectionHeader";

type Kind = "equity" | "fx";
type Item = {
  kind: Kind;
  symbol?: string;
  from?: string;
  to?: string;
  name: string;
  nameEn: string;
  note: string;
};
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "美股科技 · US Tech",
    items: [
      { kind: "equity", symbol: "AAPL", name: "苹果", nameEn: "Apple", note: "全球市值最大科技公司之一,消费电子与服务生态龙头。" },
      { kind: "equity", symbol: "MSFT", name: "微软", nameEn: "Microsoft", note: "云计算(Azure)、生产力软件与 AI 布局的核心标的。" },
      { kind: "equity", symbol: "NVDA", name: "英伟达", nameEn: "NVIDIA", note: "AI 算力与 GPU 龙头,半导体景气度的风向标。" },
      { kind: "equity", symbol: "GOOGL", name: "谷歌", nameEn: "Alphabet", note: "搜索广告与云计算巨头,DeepMind 驱动 AI 研究。" },
    ],
  },
  {
    label: "宽基与蓝筹 · Broad / Blue Chip",
    items: [
      { kind: "equity", symbol: "SPY", name: "标普 500 ETF", nameEn: "SPDR S&P 500", note: "跟踪标普 500 指数,衡量美股大盘整体表现的基准。" },
      { kind: "equity", symbol: "QQQ", name: "纳指 100 ETF", nameEn: "Invesco QQQ", note: "跟踪纳斯达克 100,偏成长与科技权重。" },
      { kind: "equity", symbol: "JPM", name: "摩根大通", nameEn: "JPMorgan", note: "美国最大银行,金融周期与利率敏感度高。" },
      { kind: "equity", symbol: "BRK.A", name: "伯克希尔", nameEn: "Berkshire", note: "巴菲特控股的多元化集团,价值投资代表。" },
    ],
  },
  {
    label: "外汇 · FX (USD)",
    items: [
      { kind: "fx", from: "EUR", to: "USD", name: "欧元/美元", nameEn: "EUR/USD", note: "全球交易量最大的货币对,反映欧美利差与风险偏好。" },
      { kind: "fx", from: "GBP", to: "USD", name: "英镑/美元", nameEn: "GBP/USD", note: "受英国央行政策与脱欧后贸易格局影响显著。" },
      { kind: "fx", from: "USD", to: "JPY", name: "美元/日元", nameEn: "USD/JPY", note: "套息交易核心货币对,对美日利差高度敏感。" },
      { kind: "fx", from: "USD", to: "CNY", name: "美元/人民币", nameEn: "USD/CNY", note: "反映中美利差、贸易与资本流动的关键汇率。" },
    ],
  },
];

const keyOf = (it: Item) =>
  it.kind === "fx" ? `fx:${it.from}${it.to}` : `eq:${it.symbol}`;

const RANGES = [
  { v: 60, label: "3M" },
  { v: 120, label: "6M" },
  { v: 250, label: "1Y" },
  { v: 0, label: "MAX" },
];

const fmtPrice = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(3);
  return n.toPrecision(4);
};

const AlphaVantageExplorer = () => {
  const [active, setActive] = useState<Item>(GROUPS[0].items[0]);
  const [span, setSpan] = useState(250);
  const [custom, setCustom] = useState("");

  // MAX needs full output; otherwise compact (100 points) is enough for ≤1Y.
  const output: "compact" | "full" = span === 0 || span > 100 ? "full" : "compact";

  const { data, isFetching, error } = useAlphaVantage(
    active.kind,
    active.kind === "fx"
      ? { from: active.from, to: active.to, output }
      : { symbol: active.symbol, output },
    true
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    const rows = data.dates.map((d, i) => ({ date: d, value: data.closes[i] }));
    return span === 0 ? rows : rows.slice(-span);
  }, [data, span]);

  const change = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    return { abs: last - first, pct: first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0 };
  }, [chartData]);

  const trendIcon =
    change == null ? <Minus className="w-3.5 h-3.5" /> :
    change.abs > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
    change.abs < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />;

  const trendColor =
    change == null ? "text-muted-foreground" :
    change.abs > 0 ? "text-teal" : change.abs < 0 ? "text-destructive" : "text-muted-foreground";

  const avUrl =
    active.kind === "fx"
      ? `https://www.alphavantage.co/documentation/#fx-daily`
      : `https://www.alphavantage.co/documentation/#daily`;

  const submitCustom = () => {
    const sym = custom.trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{1,12}$/.test(sym)) return;
    setActive({ kind: "equity", symbol: sym, name: sym, nameEn: sym, note: "自定义股票代码查询。" });
  };

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Data"
        kicker="Alpha Vantage · Equities & FX"
        title="Alpha Vantage 个股与外汇数据浏览器"
        subtitle="接入 Alpha Vantage API 的美股日线行情与外汇汇率,覆盖科技龙头、宽基 ETF、蓝筹与主要货币对,支持自定义股票代码查询,自动计算年化波动率与区间涨跌,每个序列附 Alpha Vantage 官方文档链接。免费版有 5 次/分钟、25 次/天的请求上限。"
      />

      <div className="container max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Picker */}
          <aside className="space-y-4">
            {/* Custom symbol */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-2">自定义代码 · Custom</p>
              <div className="flex gap-1">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.toUpperCase().slice(0, 12))}
                  onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                  placeholder="如 TSLA / IBM"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-background border border-border focus:border-gold/60 outline-none text-xs font-mono uppercase"
                />
                <button
                  onClick={submitCustom}
                  className="px-2.5 py-1.5 rounded-md border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors shrink-0"
                  aria-label="查询"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {GROUPS.map((g) => (
              <div key={g.label}>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-2">{g.label}</p>
                <div className="space-y-1">
                  {g.items.map((it) => {
                    const isActive = keyOf(it) === keyOf(active);
                    return (
                      <button
                        key={keyOf(it)}
                        onClick={() => setActive(it)}
                        className={
                          "w-full text-left px-2.5 py-1.5 rounded-md border text-xs transition-colors " +
                          (isActive
                            ? "border-gold/60 bg-gold/10 text-foreground"
                            : "border-border/50 bg-card/30 text-muted-foreground hover:border-gold/40 hover:text-foreground")
                        }
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{it.name}</span>
                          <span className="font-mono text-[9px] text-muted-foreground shrink-0 uppercase">
                            {it.kind === "fx" ? `${it.from}${it.to}` : it.symbol}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Chart panel */}
          <div className="rounded-xl border border-border bg-card/40 p-4 md:p-5">
            <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-gold" />
                  <h3 className="font-display text-xl text-foreground">{active.name}</h3>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/40 text-gold">
                    {active.kind === "fx" ? `${active.from}/${active.to}` : active.symbol}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">
                    {active.kind === "fx" ? "FX" : "EQ"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {active.nameEn}{active.kind === "fx" ? " · 汇率" : " · 日线收盘价 (USD)"}
                </p>
                <p className="text-xs text-foreground/70 mt-1.5 max-w-xl leading-relaxed">{active.note}</p>
              </div>
              <a
                href={avUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gold/50 bg-gold/10 text-gold text-xs font-mono hover:bg-gold/20 transition-colors shrink-0"
              >
                Alpha Vantage 文档 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </header>

            {/* Controls + stats */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setSpan(r.v)}
                    className={
                      "px-2.5 py-1 rounded text-[11px] font-mono border transition-colors " +
                      (span === r.v
                        ? "border-gold/60 bg-gold/10 text-gold"
                        : "border-border/50 text-muted-foreground hover:text-foreground")
                    }
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {data && (
                <>
                  <div className="rounded-md bg-secondary/40 border border-border px-3 py-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mr-2">最新</span>
                    <span className="text-sm font-mono tabular-nums text-foreground">{fmtPrice(data.lastPrice)}</span>
                    {data.latestDate && (
                      <span className="text-[9px] font-mono text-muted-foreground ml-2">{data.latestDate}</span>
                    )}
                  </div>
                  {change && (
                    <div className={"flex items-center gap-1 text-xs font-mono tabular-nums " + trendColor}>
                      {trendIcon}
                      <span>{change.pct > 0 ? "+" : ""}{change.pct.toFixed(1)}%</span>
                      <span className="text-[9px] text-muted-foreground">区间内</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-muted-foreground">
                    <span className="text-[9px] uppercase tracking-wider">年化σ</span>
                    {(data.annualVol * 100).toFixed(0)}%
                  </div>
                </>
              )}
            </div>

            {/* Chart */}
            <div className="h-[320px] w-full">
              {isFetching && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> 正在从 Alpha Vantage 拉取数据…
                </div>
              )}
              {!isFetching && error && (
                <div className="h-full flex flex-col items-center justify-center text-destructive text-sm gap-2 text-center px-4">
                  <AlertTriangle className="w-5 h-5" />
                  数据拉取失败,可能触发了免费版请求上限(5 次/分钟),请稍后重试。
                  <a href={avUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                    查看 Alpha Vantage 文档
                  </a>
                </div>
              )}
              {!isFetching && !error && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="avFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="date"
                      {...AXIS_PROPS}
                      minTickGap={48}
                      tickFormatter={(d: string) => d.slice(0, 7)}
                    />
                    <YAxis {...AXIS_PROPS} width={64} domain={["auto", "auto"]} tickFormatter={(v: number) => fmtPrice(v)} />
                    <Tooltip content={<ThemedTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={active.kind === "fx" ? `${active.from}/${active.to}` : active.symbol}
                      stroke={CHART_COLORS.gold}
                      strokeWidth={1.8}
                      fill="url(#avFill)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {!isFetching && !error && chartData.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  该标的在所选区间内无可用数据。
                </div>
              )}
            </div>

            <footer className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground">
              <span>数据来源:Alpha Vantage · 经 Lovable Cloud 代理</span>
              <a
                href="https://www.alphavantage.co"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold hover:underline"
              >
                alphavantage.co <ExternalLink className="w-3 h-3" />
              </a>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AlphaVantageExplorer;