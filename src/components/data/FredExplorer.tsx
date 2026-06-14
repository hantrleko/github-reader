import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Database, ExternalLink, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { useFredSeries } from "@/lib/marketData";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip, CHART_COLORS } from "@/components/common/ChartTheme";
import SectionHeader from "@/components/common/SectionHeader";

/** A curated FRED series, grouped by macro theme. */
type Series = {
  id: string;
  name: string;
  nameEn: string;
  unit: string;
  note: string;
};

type Group = { label: string; series: Series[] };

const GROUPS: Group[] = [
  {
    label: "利率 · 国债收益率",
    series: [
      { id: "DGS10", name: "10 年期美债收益率", nameEn: "10-Year Treasury", unit: "%", note: "无风险利率基准、贴现与估值核心输入。" },
      { id: "DGS2", name: "2 年期美债收益率", nameEn: "2-Year Treasury", unit: "%", note: "对货币政策预期最敏感的短端利率。" },
      { id: "DGS30", name: "30 年期美债收益率", nameEn: "30-Year Treasury", unit: "%", note: "长端利率,反映长期增长与通胀预期。" },
      { id: "T10Y2Y", name: "10Y-2Y 期限利差", nameEn: "10Y-2Y Spread", unit: "%", note: "收益率曲线斜率,倒挂常被视为衰退前兆。" },
      { id: "FEDFUNDS", name: "联邦基金有效利率", nameEn: "Fed Funds Rate", unit: "%", note: "美联储政策利率,货币政策立场的直接体现。" },
    ],
  },
  {
    label: "通胀 · 物价",
    series: [
      { id: "CPIAUCSL", name: "CPI 消费者物价指数", nameEn: "CPI (All Urban)", unit: "Index", note: "整体通胀的核心度量(1982-84=100)。" },
      { id: "CPILFESL", name: "核心 CPI(除食品能源)", nameEn: "Core CPI", unit: "Index", note: "剔除波动项,更能反映通胀趋势。" },
      { id: "PCEPI", name: "PCE 价格指数", nameEn: "PCE Price Index", unit: "Index", note: "美联储 2% 目标所盯住的通胀指标。" },
      { id: "T10YIE", name: "10 年盈亏平衡通胀率", nameEn: "10Y Breakeven Inflation", unit: "%", note: "市场隐含的长期通胀预期(名义-TIPS)。" },
    ],
  },
  {
    label: "增长 · 就业",
    series: [
      { id: "GDPC1", name: "实际 GDP", nameEn: "Real GDP", unit: "Bil. $", note: "经通胀调整的产出总量,经济增长基准。" },
      { id: "UNRATE", name: "失业率", nameEn: "Unemployment Rate", unit: "%", note: "劳动力市场松紧度的核心指标。" },
      { id: "PAYEMS", name: "非农就业人数", nameEn: "Nonfarm Payrolls", unit: "Thousands", note: "每月最受关注的就业数据。" },
      { id: "INDPRO", name: "工业生产指数", nameEn: "Industrial Production", unit: "Index", note: "制造、矿业与公用事业的实际产出。" },
    ],
  },
  {
    label: "货币 · 信用 · 市场",
    series: [
      { id: "M2SL", name: "M2 货币供应量", nameEn: "M2 Money Stock", unit: "Bil. $", note: "广义货币,反映流动性与货币政策传导。" },
      { id: "BAMLH0A0HYM2", name: "高收益债信用利差", nameEn: "HY Credit Spread", unit: "%", note: "风险溢价与信用市场压力的晴雨表。" },
      { id: "VIXCLS", name: "VIX 波动率指数", nameEn: "CBOE VIX", unit: "Index", note: "市场对未来 30 天波动的隐含预期。" },
      { id: "DTWEXBGS", name: "美元广义指数", nameEn: "Broad Dollar Index", unit: "Index", note: "美元相对一篮子货币的贸易加权汇率。" },
    ],
  },
];

const FRED_BASE = "https://fred.stlouisfed.org";

const RANGES = [
  { v: "2015-01-01", label: "10Y" },
  { v: "2020-01-01", label: "5Y" },
  { v: "2023-01-01", label: "2Y" },
  { v: "2024-06-01", label: "1Y" },
];

const fmtNum = (n: number | null) =>
  n == null ? "—" : Math.abs(n) >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toFixed(2);

const FredExplorer = () => {
  const [active, setActive] = useState<Series>(GROUPS[0].series[0]);
  const [start, setStart] = useState(RANGES[0].v);
  const { data, isFetching, error } = useFredSeries(active.id, start, true);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.dates.map((d, i) => ({ date: d, value: data.values[i] }));
  }, [data]);

  const change = useMemo(() => {
    if (!data || data.values.length < 2) return null;
    const first = data.values[0];
    const last = data.values[data.values.length - 1];
    return { abs: last - first, pct: first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0 };
  }, [data]);

  const trendIcon =
    change == null ? <Minus className="w-3.5 h-3.5" /> :
    change.abs > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
    change.abs < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />;

  const trendColor =
    change == null ? "text-muted-foreground" :
    change.abs > 0 ? "text-teal" : change.abs < 0 ? "text-destructive" : "text-muted-foreground";

  const seriesUrl = `${FRED_BASE}/series/${active.id}`;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Data"
        kicker="FRED · St. Louis Fed"
        title="宏观经济数据浏览器"
        subtitle="直接接入美联储 FRED 官方数据库:利率、通胀、增长、就业与市场指标。每个序列都附带原始页面链接,可一键跳转查看完整定义、口径与下载选项。"
      />

      <div className="container max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Series picker */}
          <aside className="space-y-4">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-2">{g.label}</p>
                <div className="space-y-1">
                  {g.series.map((s) => {
                    const isActive = s.id === active.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActive(s)}
                        className={
                          "w-full text-left px-2.5 py-1.5 rounded-md border text-xs transition-colors " +
                          (isActive
                            ? "border-gold/60 bg-gold/10 text-foreground"
                            : "border-border/50 bg-card/30 text-muted-foreground hover:border-gold/40 hover:text-foreground")
                        }
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{s.name}</span>
                          <span className="font-mono text-[9px] text-muted-foreground shrink-0">{s.id}</span>
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
                  <Database className="w-4 h-4 text-gold" />
                  <h3 className="font-display text-xl text-foreground">{active.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{active.nameEn} · 单位 {active.unit}</p>
                <p className="text-xs text-foreground/70 mt-1.5 max-w-xl leading-relaxed">{active.note}</p>
              </div>
              <a
                href={seriesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gold/50 bg-gold/10 text-gold text-xs font-mono hover:bg-gold/20 transition-colors shrink-0"
              >
                在 FRED 查看 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </header>

            {/* Controls + stats */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.v}
                    onClick={() => setStart(r.v)}
                    className={
                      "px-2.5 py-1 rounded text-[11px] font-mono border transition-colors " +
                      (start === r.v
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
                    <span className="text-sm font-mono tabular-nums text-foreground">{fmtNum(data.latest)}</span>
                    {data.latestDate && (
                      <span className="text-[9px] font-mono text-muted-foreground ml-2">{data.latestDate}</span>
                    )}
                  </div>
                  {change && (
                    <div className={"flex items-center gap-1 text-xs font-mono tabular-nums " + trendColor}>
                      {trendIcon}
                      {change.abs > 0 ? "+" : ""}{fmtNum(change.abs)}
                      <span className="opacity-70">({change.pct > 0 ? "+" : ""}{change.pct.toFixed(1)}%)</span>
                      <span className="text-[9px] text-muted-foreground">区间内</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Chart */}
            <div className="h-[320px] w-full">
              {isFetching && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> 正在从 FRED 拉取数据…
                </div>
              )}
              {!isFetching && error && (
                <div className="h-full flex flex-col items-center justify-center text-destructive text-sm gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  数据拉取失败,请稍后重试或直接前往 FRED 查看。
                  <a href={seriesUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                    打开 FRED 页面
                  </a>
                </div>
              )}
              {!isFetching && !error && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fredFill" x1="0" y1="0" x2="0" y2="1">
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
                    <YAxis {...AXIS_PROPS} width={56} domain={["auto", "auto"]} />
                    <Tooltip content={<ThemedTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={active.id}
                      stroke={CHART_COLORS.gold}
                      strokeWidth={1.8}
                      fill="url(#fredFill)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <footer className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground">
              <span>
                数据来源:Federal Reserve Bank of St. Louis (FRED) · 经 Lovable Cloud 代理
              </span>
              <a
                href={FRED_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold hover:underline"
              >
                fred.stlouisfed.org <ExternalLink className="w-3 h-3" />
              </a>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FredExplorer;