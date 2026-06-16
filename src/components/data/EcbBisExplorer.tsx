import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Landmark, ExternalLink, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { useEcbBisSeries } from "@/lib/marketData";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip, CHART_COLORS } from "@/components/common/ChartTheme";
import SectionHeader from "@/components/common/SectionHeader";

/** A curated ECB / BIS series. */
type Series = {
  provider: "ecb" | "bis";
  flow: string;
  key: string;
  version?: string;
  name: string;
  nameEn: string;
  unit: string;
  note: string;
  url: string;
};
type Group = { label: string; series: Series[] };

const ecbUrl = (flow: string, key: string) =>
  `https://data.ecb.europa.eu/data/datasets/${flow}/${flow}.${key}`;

const GROUPS: Group[] = [
  {
    label: "ECB · 政策利率",
    series: [
      { provider: "ecb", flow: "FM", key: "D.U2.EUR.4F.KR.MRR_FR.LEV", name: "主要再融资利率 (MRO)", nameEn: "Main Refinancing Rate", unit: "%", note: "欧央行向银行提供一周期限流动性的核心政策利率。", url: ecbUrl("FM", "D.U2.EUR.4F.KR.MRR_FR.LEV") },
      { provider: "ecb", flow: "FM", key: "D.U2.EUR.4F.KR.DFR.LEV", name: "存款便利利率 (DFR)", nameEn: "Deposit Facility Rate", unit: "%", note: "银行隔夜存放在欧央行的利率,当前货币政策的有效下限。", url: ecbUrl("FM", "D.U2.EUR.4F.KR.DFR.LEV") },
      { provider: "ecb", flow: "FM", key: "D.U2.EUR.4F.KR.MLFR.LEV", name: "边际贷款利率 (MLF)", nameEn: "Marginal Lending Rate", unit: "%", note: "银行隔夜向欧央行借款的利率,走廊体系的有效上限。", url: ecbUrl("FM", "D.U2.EUR.4F.KR.MLFR.LEV") },
    ],
  },
  {
    label: "ECB · 欧元参考汇率",
    series: [
      { provider: "ecb", flow: "EXR", key: "D.USD.EUR.SP00.A", name: "欧元/美元", nameEn: "EUR/USD", unit: "USD per EUR", note: "欧央行每日发布的欧元兑美元参考汇率。", url: ecbUrl("EXR", "D.USD.EUR.SP00.A") },
      { provider: "ecb", flow: "EXR", key: "D.GBP.EUR.SP00.A", name: "欧元/英镑", nameEn: "EUR/GBP", unit: "GBP per EUR", note: "欧元兑英镑参考汇率。", url: ecbUrl("EXR", "D.GBP.EUR.SP00.A") },
      { provider: "ecb", flow: "EXR", key: "D.JPY.EUR.SP00.A", name: "欧元/日元", nameEn: "EUR/JPY", unit: "JPY per EUR", note: "欧元兑日元参考汇率。", url: ecbUrl("EXR", "D.JPY.EUR.SP00.A") },
      { provider: "ecb", flow: "EXR", key: "D.CNY.EUR.SP00.A", name: "欧元/人民币", nameEn: "EUR/CNY", unit: "CNY per EUR", note: "欧元兑离岸人民币参考汇率。", url: ecbUrl("EXR", "D.CNY.EUR.SP00.A") },
    ],
  },
  {
    label: "ECB · 通胀 (HICP)",
    series: [
      { provider: "ecb", flow: "ICP", key: "M.U2.N.000000.4.ANR", name: "HICP 总体通胀", nameEn: "HICP All-items", unit: "% YoY", note: "欧元区调和消费者物价指数同比,欧央行 2% 目标的盯住口径。", url: ecbUrl("ICP", "M.U2.N.000000.4.ANR") },
      { provider: "ecb", flow: "ICP", key: "M.U2.N.XEF000.4.ANR", name: "HICP 核心通胀", nameEn: "HICP ex Energy & Food", unit: "% YoY", note: "剔除能源与食品的核心通胀,更能反映趋势性价格压力。", url: ecbUrl("ICP", "M.U2.N.XEF000.4.ANR") },
    ],
  },
  {
    label: "BIS · 各国政策利率",
    series: [
      { provider: "bis", flow: "WS_CBPOL", key: "M.US", version: "1.0", name: "美国联邦基金利率", nameEn: "US Policy Rate", unit: "%", note: "BIS 汇编的各国央行政策利率,口径统一、跨国可比。", url: "https://data.bis.org/topics/CBPOL" },
      { provider: "bis", flow: "WS_CBPOL", key: "M.XM", version: "1.0", name: "欧元区政策利率", nameEn: "Euro Area Policy Rate", unit: "%", note: "欧元区央行政策利率(BIS 口径)。", url: "https://data.bis.org/topics/CBPOL" },
      { provider: "bis", flow: "WS_CBPOL", key: "M.GB", version: "1.0", name: "英国政策利率", nameEn: "UK Policy Rate", unit: "%", note: "英格兰银行政策利率(BIS 口径)。", url: "https://data.bis.org/topics/CBPOL" },
      { provider: "bis", flow: "WS_CBPOL", key: "M.JP", version: "1.0", name: "日本政策利率", nameEn: "Japan Policy Rate", unit: "%", note: "日本银行政策利率(BIS 口径)。", url: "https://data.bis.org/topics/CBPOL" },
      { provider: "bis", flow: "WS_CBPOL", key: "M.CN", version: "1.0", name: "中国政策利率", nameEn: "China Policy Rate", unit: "%", note: "中国人民银行政策利率(BIS 口径)。", url: "https://data.bis.org/topics/CBPOL" },
    ],
  },
  {
    label: "BIS · 金融周期",
    series: [
      { provider: "bis", flow: "WS_CREDIT_GAP", key: "Q.US.P.A.C", version: "1.0", name: "美国 信贷/GDP 缺口", nameEn: "US Credit-to-GDP Gap", unit: "pp", note: "私人非金融部门信贷/GDP 偏离长期趋势的缺口,系统性风险预警指标。", url: "https://data.bis.org/topics/CREDIT_GAP" },
      { provider: "bis", flow: "WS_CREDIT_GAP", key: "Q.XM.P.A.C", version: "1.0", name: "欧元区 信贷/GDP 缺口", nameEn: "Euro Area Credit Gap", unit: "pp", note: "欧元区私人部门信贷/GDP 缺口。", url: "https://data.bis.org/topics/CREDIT_GAP" },
      { provider: "bis", flow: "WS_SPP", key: "Q.US.N.628", version: "1.0", name: "美国 房地产价格指数", nameEn: "US Property Prices", unit: "Index", note: "BIS 住宅地产价格指数(名义),跨国房价比较口径。", url: "https://data.bis.org/topics/RPP" },
      { provider: "bis", flow: "WS_SPP", key: "Q.XM.N.628", version: "1.0", name: "欧元区 房地产价格指数", nameEn: "Euro Area Property Prices", unit: "Index", note: "欧元区住宅地产价格指数(名义)。", url: "https://data.bis.org/topics/RPP" },
      { provider: "bis", flow: "WS_EER", key: "M.N.B.US", version: "1.0", name: "美元 名义有效汇率", nameEn: "US Nominal EER", unit: "Index", note: "BIS 广义名义有效汇率,衡量美元对一篮子货币的整体强弱。", url: "https://data.bis.org/topics/EER" },
    ],
  },
];

const RANGES = [
  { v: "2005-01-01", label: "20Y" },
  { v: "2015-01-01", label: "10Y" },
  { v: "2020-01-01", label: "5Y" },
  { v: "2023-01-01", label: "2Y" },
];

const fmtNum = (n: number | null) =>
  n == null ? "—" : Math.abs(n) >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toFixed(2);

const EcbBisExplorer = () => {
  const [active, setActive] = useState<Series>(GROUPS[0].series[0]);
  const [start, setStart] = useState(RANGES[1].v);
  const { data, isFetching, error } = useEcbBisSeries(
    active.provider, active.flow, active.key, start, active.version ?? "1.0", true
  );

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

  const badge = active.provider === "ecb" ? "ECB" : "BIS";

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Data"
        kicker="ECB · BIS · Open Data"
        title="欧央行与国际清算银行数据浏览器"
        subtitle="接入欧洲央行(政策利率、欧元参考汇率、HICP 通胀)与国际清算银行(各国政策利率、信贷/GDP 缺口、房价与有效汇率)的官方开放数据,完全免费、无需 API Key,每个序列附原始页面链接。"
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
                    const isActive = s.key === active.key && s.flow === active.flow;
                    return (
                      <button
                        key={`${s.flow}-${s.key}`}
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
                          <span className="font-mono text-[9px] text-muted-foreground shrink-0 uppercase">
                            {s.provider}
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
                  <Landmark className="w-4 h-4 text-gold" />
                  <h3 className="font-display text-xl text-foreground">{active.name}</h3>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/40 text-gold">
                    {badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{active.nameEn} · 单位 {active.unit}</p>
                <p className="text-xs text-foreground/70 mt-1.5 max-w-xl leading-relaxed">{active.note}</p>
              </div>
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gold/50 bg-gold/10 text-gold text-xs font-mono hover:bg-gold/20 transition-colors shrink-0"
              >
                在 {badge} 查看 <ExternalLink className="w-3.5 h-3.5" />
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
                  <Loader2 className="w-4 h-4 animate-spin" /> 正在从 {badge} 拉取数据…
                </div>
              )}
              {!isFetching && error && (
                <div className="h-full flex flex-col items-center justify-center text-destructive text-sm gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  数据拉取失败,请稍后重试或直接前往 {badge} 查看。
                  <a href={active.url} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                    打开 {badge} 页面
                  </a>
                </div>
              )}
              {!isFetching && !error && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ecbFill" x1="0" y1="0" x2="0" y2="1">
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
                      name={active.name}
                      stroke={CHART_COLORS.gold}
                      strokeWidth={1.8}
                      fill="url(#ecbFill)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {!isFetching && !error && chartData.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  该序列在所选区间内无可用数据。
                </div>
              )}
            </div>

            <footer className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground">
              <span>
                数据来源:European Central Bank · Bank for International Settlements · 经 Lovable Cloud 代理
              </span>
              <a
                href={active.provider === "ecb" ? "https://data.ecb.europa.eu" : "https://data.bis.org"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold hover:underline"
              >
                {active.provider === "ecb" ? "data.ecb.europa.eu" : "data.bis.org"} <ExternalLink className="w-3 h-3" />
              </a>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EcbBisExplorer;
