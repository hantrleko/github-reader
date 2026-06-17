import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Bitcoin, ExternalLink, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { useCoinGecko } from "@/lib/marketData";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip, CHART_COLORS } from "@/components/common/ChartTheme";
import SectionHeader from "@/components/common/SectionHeader";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  nameEn: string;
  note: string;
};
type Group = { label: string; coins: Coin[] };

const GROUPS: Group[] = [
  {
    label: "主流币 · Majors",
    coins: [
      { id: "bitcoin", symbol: "BTC", name: "比特币", nameEn: "Bitcoin", note: "首个去中心化加密资产,常被视为数字黄金与风险偏好的晴雨表。" },
      { id: "ethereum", symbol: "ETH", name: "以太坊", nameEn: "Ethereum", note: "最大的智能合约平台,支撑 DeFi、NFT 与 Layer-2 生态。" },
      { id: "binancecoin", symbol: "BNB", name: "币安币", nameEn: "BNB", note: "BNB Chain 的原生代币,兼具交易费抵扣与生态治理功能。" },
      { id: "solana", symbol: "SOL", name: "Solana", nameEn: "Solana", note: "高吞吐 Layer-1,主打低费率与高性能应用。" },
    ],
  },
  {
    label: "稳定币 · Stablecoins",
    coins: [
      { id: "tether", symbol: "USDT", name: "泰达币", nameEn: "Tether", note: "市值最大的美元稳定币,加密市场的核心流动性媒介。" },
      { id: "usd-coin", symbol: "USDC", name: "USD Coin", nameEn: "USD Coin", note: "受监管的美元稳定币,广泛用于 DeFi 与机构结算。" },
    ],
  },
  {
    label: "生态与应用 · Ecosystem",
    coins: [
      { id: "ripple", symbol: "XRP", name: "瑞波币", nameEn: "XRP", note: "面向跨境支付与清算的资产,与 Ripple 网络深度绑定。" },
      { id: "cardano", symbol: "ADA", name: "卡尔达诺", nameEn: "Cardano", note: "学术驱动的权益证明 Layer-1 公链。" },
      { id: "dogecoin", symbol: "DOGE", name: "狗狗币", nameEn: "Dogecoin", note: "起源于 meme 的支付型代币,情绪与社群驱动显著。" },
      { id: "chainlink", symbol: "LINK", name: "Chainlink", nameEn: "Chainlink", note: "去中心化预言机网络,为合约提供链下数据喂价。" },
    ],
  },
];

const RANGES = [
  { v: "30", label: "1M" },
  { v: "90", label: "3M" },
  { v: "180", label: "6M" },
  { v: "365", label: "1Y" },
  { v: "max", label: "MAX" },
];

const fmtPrice = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + n.toPrecision(4);
};

const fmtBig = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toFixed(0);
};

const CoinGeckoExplorer = () => {
  const [active, setActive] = useState<Coin>(GROUPS[0].coins[0]);
  const [days, setDays] = useState("365");
  const { data, isFetching, error } = useCoinGecko(active.id, "usd", days, true);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.dates.map((d, i) => ({ date: d, value: data.prices[i] }));
  }, [data]);

  const change = useMemo(() => {
    if (!data || data.prices.length < 2) return null;
    const first = data.prices[0];
    const last = data.prices[data.prices.length - 1];
    return { abs: last - first, pct: first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0 };
  }, [data]);

  const trendIcon =
    change == null ? <Minus className="w-3.5 h-3.5" /> :
    change.abs > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
    change.abs < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />;

  const trendColor =
    change == null ? "text-muted-foreground" :
    change.abs > 0 ? "text-teal" : change.abs < 0 ? "text-destructive" : "text-muted-foreground";

  const coinUrl = `https://www.coingecko.com/en/coins/${active.id}`;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Data"
        kicker="CoinGecko · Crypto Markets"
        title="加密资产市场数据浏览器"
        subtitle="接入 CoinGecko 公共 API 的加密货币历史价格、市值与成交量,覆盖主流币、稳定币与生态代币,完全免费、无需 API Key,自动计算年化波动率与区间涨跌,每个币种附 CoinGecko 原始页面链接。"
      />

      <div className="container max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Coin picker */}
          <aside className="space-y-4">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-2">{g.label}</p>
                <div className="space-y-1">
                  {g.coins.map((c) => {
                    const isActive = c.id === active.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActive(c)}
                        className={
                          "w-full text-left px-2.5 py-1.5 rounded-md border text-xs transition-colors " +
                          (isActive
                            ? "border-gold/60 bg-gold/10 text-foreground"
                            : "border-border/50 bg-card/30 text-muted-foreground hover:border-gold/40 hover:text-foreground")
                        }
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{c.name}</span>
                          <span className="font-mono text-[9px] text-muted-foreground shrink-0 uppercase">
                            {c.symbol}
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
                  <Bitcoin className="w-4 h-4 text-gold" />
                  <h3 className="font-display text-xl text-foreground">{active.name}</h3>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/40 text-gold">
                    {active.symbol}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{active.nameEn} · 计价货币 USD</p>
                <p className="text-xs text-foreground/70 mt-1.5 max-w-xl leading-relaxed">{active.note}</p>
              </div>
              <a
                href={coinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gold/50 bg-gold/10 text-gold text-xs font-mono hover:bg-gold/20 transition-colors shrink-0"
              >
                在 CoinGecko 查看 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </header>

            {/* Controls + stats */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.v}
                    onClick={() => setDays(r.v)}
                    className={
                      "px-2.5 py-1 rounded text-[11px] font-mono border transition-colors " +
                      (days === r.v
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
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mr-2">价格</span>
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
                  <div className="rounded-md bg-secondary/40 border border-border px-3 py-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mr-2">市值</span>
                    <span className="text-sm font-mono tabular-nums text-foreground">{fmtBig(data.marketCap)}</span>
                  </div>
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
                  <Loader2 className="w-4 h-4 animate-spin" /> 正在从 CoinGecko 拉取数据…
                </div>
              )}
              {!isFetching && error && (
                <div className="h-full flex flex-col items-center justify-center text-destructive text-sm gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  数据拉取失败,请稍后重试或直接前往 CoinGecko 查看。
                  <a href={coinUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                    打开 CoinGecko 页面
                  </a>
                </div>
              )}
              {!isFetching && !error && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cgFill" x1="0" y1="0" x2="0" y2="1">
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
                      name={active.symbol}
                      stroke={CHART_COLORS.gold}
                      strokeWidth={1.8}
                      fill="url(#cgFill)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {!isFetching && !error && chartData.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  该币种在所选区间内无可用数据。
                </div>
              )}
            </div>

            <footer className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground">
              <span>数据来源:CoinGecko Public API · 经 Lovable Cloud 代理</span>
              <a
                href="https://www.coingecko.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold hover:underline"
              >
                coingecko.com <ExternalLink className="w-3 h-3" />
              </a>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoinGeckoExplorer;
