import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Globe, ExternalLink, Loader2, AlertTriangle, Check,
} from "lucide-react";
import { useWorldBank } from "@/lib/marketData";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip, CHART_COLORS } from "@/components/common/ChartTheme";
import SectionHeader from "@/components/common/SectionHeader";

/** A curated World Bank indicator, grouped by theme. */
type Indicator = {
  id: string;
  name: string;
  nameEn: string;
  unit: string;
  note: string;
};
type Group = { label: string; items: Indicator[] };

const getGROUPS = (t: TFunction): Group[] => ([
  {
    label: t("labs.data.worldBankExplorer.text001", { defaultValue: "增长 · 产出" }),
    items: [
      { id: "NY.GDP.MKTP.KD.ZG", name: t("labs.data.worldBankExplorer.text002", { defaultValue: "实际 GDP 增长率" }), nameEn: "Real GDP Growth", unit: "%", note: t("labs.data.worldBankExplorer.text003", { defaultValue: "经通胀调整的年度 GDP 增速,衡量经济扩张/收缩。" }) },
      { id: "NY.GDP.PCAP.CD", name: t("labs.data.worldBankExplorer.text004", { defaultValue: "人均 GDP" }), nameEn: "GDP per Capita", unit: "current US$", note: t("labs.data.worldBankExplorer.text005", { defaultValue: "经济发展水平的核心横向可比指标。" }) },
      { id: "NY.GDP.MKTP.CD", name: t("labs.data.worldBankExplorer.text006", { defaultValue: "GDP 总量" }), nameEn: "GDP (current)", unit: "current US$", note: t("labs.data.worldBankExplorer.text007", { defaultValue: "以当期美元计的经济体量。" }) },
      { id: "NV.IND.MANF.ZS", name: t("labs.data.worldBankExplorer.text008", { defaultValue: "制造业占 GDP" }), nameEn: "Manufacturing % GDP", unit: "% of GDP", note: t("labs.data.worldBankExplorer.text009", { defaultValue: "工业化与产业结构的代理变量。" }) },
    ],
  },
  {
    label: t("labs.data.worldBankExplorer.text010", { defaultValue: "通胀 · 货币" }),
    items: [
      { id: "FP.CPI.TOTL.ZG", name: t("labs.data.worldBankExplorer.text011", { defaultValue: "通胀率 (CPI)" }), nameEn: "Inflation, CPI", unit: "%", note: t("labs.data.worldBankExplorer.text012", { defaultValue: "消费者物价年度同比变化。" }) },
      { id: "FR.INR.RINR", name: t("labs.data.worldBankExplorer.text013", { defaultValue: "实际利率" }), nameEn: "Real Interest Rate", unit: "%", note: t("labs.data.worldBankExplorer.text014", { defaultValue: "经 GDP 平减指数调整后的贷款利率。" }) },
      { id: "PA.NUS.FCRF", name: t("labs.data.worldBankExplorer.text015", { defaultValue: "官方汇率" }), nameEn: "Official Exchange Rate", unit: "LCU/US$", note: t("labs.data.worldBankExplorer.text016", { defaultValue: "本币兑美元的年度平均汇率。" }) },
    ],
  },
  {
    label: t("labs.data.worldBankExplorer.text017", { defaultValue: "贸易 · 外部" }),
    items: [
      { id: "NE.EXP.GNFS.ZS", name: t("labs.data.worldBankExplorer.text018", { defaultValue: "出口占 GDP" }), nameEn: "Exports % GDP", unit: "% of GDP", note: t("labs.data.worldBankExplorer.text019", { defaultValue: "经济体的对外开放与出口依存度。" }) },
      { id: "NE.IMP.GNFS.ZS", name: t("labs.data.worldBankExplorer.text020", { defaultValue: "进口占 GDP" }), nameEn: "Imports % GDP", unit: "% of GDP", note: t("labs.data.worldBankExplorer.text021", { defaultValue: "进口在总需求中的占比。" }) },
      { id: "BN.CAB.XOKA.GD.ZS", name: t("labs.data.worldBankExplorer.text022", { defaultValue: "经常账户余额" }), nameEn: "Current Account % GDP", unit: "% of GDP", note: t("labs.data.worldBankExplorer.text023", { defaultValue: "外部失衡的关键度量,正为盈余。" }) },
      { id: "BX.KLT.DINV.WD.GD.ZS", name: t("labs.data.worldBankExplorer.text024", { defaultValue: "外商直接投资流入" }), nameEn: "FDI Inflows % GDP", unit: "% of GDP", note: t("labs.data.worldBankExplorer.text025", { defaultValue: "跨境资本配置与投资信心信号。" }) },
    ],
  },
  {
    label: t("labs.data.worldBankExplorer.text026", { defaultValue: "人口 · 社会" }),
    items: [
      { id: "SL.UEM.TOTL.ZS", name: t("labs.data.worldBankExplorer.text027", { defaultValue: "失业率" }), nameEn: "Unemployment", unit: "% labor force", note: t("labs.data.worldBankExplorer.text028", { defaultValue: "劳动力市场松紧的国际可比口径(ILO)。" }) },
      { id: "SP.POP.TOTL", name: t("labs.data.worldBankExplorer.text029", { defaultValue: "总人口" }), nameEn: "Population", unit: "people", note: t("labs.data.worldBankExplorer.text030", { defaultValue: "国家规模与市场体量的基础变量。" }) },
      { id: "SP.DYN.LE00.IN", name: t("labs.data.worldBankExplorer.text031", { defaultValue: "预期寿命" }), nameEn: "Life Expectancy", unit: "years", note: t("labs.data.worldBankExplorer.text032", { defaultValue: "综合健康与发展水平的核心指标。" }) },
      { id: "GC.DOD.TOTL.GD.ZS", name: t("labs.data.worldBankExplorer.text033", { defaultValue: "政府债务占 GDP" }), nameEn: "Govt Debt % GDP", unit: "% of GDP", note: t("labs.data.worldBankExplorer.text034", { defaultValue: "财政可持续性与主权风险的代理。" }) },
    ],
  },
]);

/** Selectable economies (ISO3). */
const getCOUNTRIES = (t: TFunction) => ([
  { iso3: "USA", name: t("labs.data.worldBankExplorer.text035", { defaultValue: "美国" }), flag: "🇺🇸" },
  { iso3: "CHN", name: t("labs.data.worldBankExplorer.text036", { defaultValue: "中国" }), flag: "🇨🇳" },
  { iso3: "JPN", name: t("labs.data.worldBankExplorer.text037", { defaultValue: "日本" }), flag: "🇯🇵" },
  { iso3: "DEU", name: t("labs.data.worldBankExplorer.text038", { defaultValue: "德国" }), flag: "🇩🇪" },
  { iso3: "GBR", name: t("labs.data.worldBankExplorer.text039", { defaultValue: "英国" }), flag: "🇬🇧" },
  { iso3: "FRA", name: t("labs.data.worldBankExplorer.text040", { defaultValue: "法国" }), flag: "🇫🇷" },
  { iso3: "IND", name: t("labs.data.worldBankExplorer.text041", { defaultValue: "印度" }), flag: "🇮🇳" },
  { iso3: "BRA", name: t("labs.data.worldBankExplorer.text042", { defaultValue: "巴西" }), flag: "🇧🇷" },
  { iso3: "KOR", name: t("labs.data.worldBankExplorer.text043", { defaultValue: "韩国" }), flag: "🇰🇷" },
  { iso3: "RUS", name: t("labs.data.worldBankExplorer.text044", { defaultValue: "俄罗斯" }), flag: "🇷🇺" },
  { iso3: "CAN", name: t("labs.data.worldBankExplorer.text045", { defaultValue: "加拿大" }), flag: "🇨🇦" },
  { iso3: "AUS", name: t("labs.data.worldBankExplorer.text046", { defaultValue: "澳大利亚" }), flag: "🇦🇺" },
  { iso3: "SGP", name: t("labs.data.worldBankExplorer.text047", { defaultValue: "新加坡" }), flag: "🇸🇬" },
  { iso3: "ZAF", name: t("labs.data.worldBankExplorer.text048", { defaultValue: "南非" }), flag: "🇿🇦" },
]);

const WB_BASE = "https://data.worldbank.org";

const fmtNum = (n: number | null) =>
  n == null
    ? "—"
    : Math.abs(n) >= 1e9
    ? (n / 1e9).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "B"
    : Math.abs(n) >= 1e6
    ? (n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "M"
    : Math.abs(n) >= 1000
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : n.toFixed(2);

const WorldBankExplorer = () => {
  const { t } = useTranslation();
  const GROUPS = getGROUPS(t);
  const COUNTRIES = getCOUNTRIES(t);
  const [active, setActive] = useState<Indicator>(GROUPS[0].items[0]);
  const [selected, setSelected] = useState<string[]>(["USA", "CHN", "JPN"]);

  const countriesParam = selected.join(";");
  const { data, isFetching, error } = useWorldBank(active.id, countriesParam, "1990", selected.length > 0);

  const toggleCountry = (iso3: string) => {
    setSelected((prev) =>
      prev.includes(iso3)
        ? prev.filter((c) => c !== iso3)
        : prev.length >= 5
        ? prev
        : [...prev, iso3]
    );
  };

  // Merge series into a single recharts dataset keyed by year.
  const { chartData, names } = useMemo(() => {
    if (!data?.series?.length) return { chartData: [], names: [] as string[] };
    const years = new Set<string>();
    data.series.forEach((s) => s.points.forEach((p) => years.add(p.date)));
    const sortedYears = Array.from(years).sort();
    const lookup: Record<string, Record<string, number>> = {};
    data.series.forEach((s) => {
      lookup[s.iso3] = {};
      s.points.forEach((p) => (lookup[s.iso3][p.date] = p.value));
    });
    const rows = sortedYears.map((y) => {
      const row: Record<string, string | number | null> = { date: y };
      data.series.forEach((s) => (row[s.iso3] = lookup[s.iso3][y] ?? null));
      return row;
    });
    return { chartData: rows, names: data.series.map((s) => s.iso3) };
  }, [data]);

  const activeDisplay = GROUPS.flatMap((group) => group.items).find((indicator) => indicator.id === active.id)!;
  const indicatorUrl = `${WB_BASE}/indicator/${active.id}`;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Data"
        kicker="World Bank · Open Data"
        title={t("labs.data.worldBankExplorer.text049", { defaultValue: "全球发展指标浏览器" })}
        subtitle={t("labs.data.worldBankExplorer.text050", { defaultValue: "接入世界银行公开数据库:增长、通胀、贸易、人口与财政指标,支持多国横向对比。完全免费、无需 API Key,每个指标都附带官方页面链接。" })}
      />

      <div className="container max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Indicator picker */}
          <aside className="space-y-4">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-2">{g.label}</p>
                <div className="space-y-1">
                  {g.items.map((s) => {
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
                        <span className="truncate block">{s.name}</span>
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
                  <Globe className="w-4 h-4 text-gold" />
                  <h3 className="font-display text-xl text-foreground">{activeDisplay.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{active.nameEn}{t("labs.data.worldBankExplorer.text051", { defaultValue: "· 单位" })} {active.unit}</p>
                <p className="text-xs text-foreground/70 mt-1.5 max-w-xl leading-relaxed">{activeDisplay.note}</p>
              </div>
              <a
                href={indicatorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gold/50 bg-gold/10 text-gold text-xs font-mono hover:bg-gold/20 transition-colors shrink-0"
              >{t("labs.data.worldBankExplorer.text052", { defaultValue: "在 World Bank 查看" })} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </header>

            {/* Country multi-select */}
            <div className="mb-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">{t("labs.data.worldBankExplorer.text053", { defaultValue: "选择经济体对比(最多 5 个)" })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRIES.map((c) => {
                  const on = selected.includes(c.iso3);
                  return (
                    <button
                      key={c.iso3}
                      onClick={() => toggleCountry(c.iso3)}
                      className={
                        "inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-mono transition-colors " +
                        (on
                          ? "border-gold/60 bg-gold/10 text-gold"
                          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-gold/40")
                      }
                    >
                      {on && <Check className="w-3 h-3" />}
                      <span>{c.flag}</span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart */}
            <div className="h-[340px] w-full">
              {selected.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{t("labs.data.worldBankExplorer.text054", { defaultValue: "请至少选择一个经济体。" })}
                </div>
              )}
              {selected.length > 0 && isFetching && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />{t("labs.data.worldBankExplorer.text055", { defaultValue: "正在从 World Bank 拉取数据…" })}
                </div>
              )}
              {selected.length > 0 && !isFetching && error && (
                <div className="h-full flex flex-col items-center justify-center text-destructive text-sm gap-2">
                  <AlertTriangle className="w-5 h-5" />{t("labs.data.worldBankExplorer.text056", { defaultValue: "数据拉取失败,请稍后重试或前往 World Bank 查看。" })}
                  <a href={indicatorUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">{t("labs.data.worldBankExplorer.text057", { defaultValue: "打开 World Bank 页面" })}
                  </a>
                </div>
              )}
              {selected.length > 0 && !isFetching && !error && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={32} />
                    <YAxis {...AXIS_PROPS} width={56} domain={["auto", "auto"]} tickFormatter={(v: number) => fmtNum(v)} />
                    <Tooltip content={<ThemedTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }} />
                    {names.map((iso, i) => (
                      <Line
                        key={iso}
                        type="monotone"
                        dataKey={iso}
                        name={COUNTRIES.find((c) => c.iso3 === iso)?.name || iso}
                        stroke={CHART_COLORS.series[i % CHART_COLORS.series.length]}
                        strokeWidth={1.8}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
              {selected.length > 0 && !isFetching && !error && chartData.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{t("labs.data.worldBankExplorer.text058", { defaultValue: "该指标在所选区间内无可用数据。" })}
                </div>
              )}
            </div>

            <footer className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground">
              <span>{t("labs.data.worldBankExplorer.text059", { defaultValue: "数据来源:World Bank Open Data · 经 Lovable Cloud 代理 · CC BY 4.0" })}</span>
              <a
                href={WB_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold hover:underline"
              >
                data.worldbank.org <ExternalLink className="w-3 h-3" />
              </a>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorldBankExplorer;