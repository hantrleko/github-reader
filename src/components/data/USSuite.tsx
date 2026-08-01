/**
 * V5.2 US Suite — 美股全栈数据工作台.
 * 五个页签: 行情与技术面 / 基本面 / SEC 披露流 / 期权链 / 全市场筛选.
 * 数据经 Lovable Cloud Edge Function 代理: Yahoo (tier C) + SEC EDGAR (tier S).
 */
import { useMemo, useState } from "react";
import {
  ComposedChart, LineChart, Line, Bar, BarChart, ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Brush, Legend,
} from "recharts";
import {
  Loader2, AlertTriangle, RefreshCcw, ExternalLink, TrendingUp, TrendingDown,
  Search, Download,
} from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import SendToTool from "@/components/common/SendToTool";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip, CHART_COLORS } from "@/components/common/ChartTheme";
import { cn } from "@/lib/utils";
import {
  useUsQuote, useUsFundamentals, useUsFilings, useEdgarFullText, useUsOptions,
  useUsScreener, SCREENER_TAGS, fmtUsd,
  type OptionLeg,
} from "@/lib/usData";

const PRESETS = ["AAPL", "NVDA", "MSFT", "TSLA", "SPY", "GOOGL", "AMZN", "META"];
type Tab = "quote" | "fundamentals" | "filings" | "options" | "screener";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "quote", label: "行情 · 技术面", sub: "Quote & Indicators" },
  { id: "fundamentals", label: "基本面", sub: "SEC XBRL & Metrics" },
  { id: "filings", label: "SEC 披露流", sub: "EDGAR Filings" },
  { id: "options", label: "期权链", sub: "Chain & Greeks" },
  { id: "screener", label: "全市场筛选", sub: "XBRL Frames" },
];

const pct = (v: number | null | undefined, d = 2) =>
  v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`;

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      {(error as Error)?.message || "load failed"}
    </div>
  );
}

function Refresh({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 border border-border/60 hover:border-gold text-muted-foreground hover:text-gold"
      aria-label="Refresh"
    >
      <RefreshCcw className={cn("w-3.5 h-3.5", busy && "animate-spin")} />
    </button>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="border border-border/40 bg-background/40 px-2 py-1.5">
      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{k}</p>
      <p
        className={cn(
          "text-sm font-mono tabular-nums",
          tone === "up" && "text-emerald-400",
          tone === "down" && "text-rose-400",
          !tone && "text-foreground",
        )}
      >
        {v}
      </p>
    </div>
  );
}

function Source({ text }: { text: string }) {
  return <p className="text-[10px] font-mono text-muted-foreground">Source: {text}</p>;
}

/* ═══════════════ Tab 1 · Quote & technicals ═══════════════ */
function QuoteTab({ symbol }: { symbol: string }) {
  const [range, setRange] = useState("1y");
  const { data, isFetching, error, refetch } = useUsQuote(symbol, range);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.dates.map((d, i) => ({
      date: d,
      close: data.closes[i],
      ma20: data.indicators.ma20[i],
      ma60: data.indicators.ma60[i],
      bollUpper: data.indicators.bollUpper[i],
      bollLower: data.indicators.bollLower[i],
      macd: data.indicators.macd[i],
      signal: data.indicators.signal[i],
      hist: data.indicators.hist[i],
      rsi: data.indicators.rsi14[i],
      volume: data.volumes[i],
    }));
  }, [data]);

  const up = (data?.changePct ?? 0) >= 0;
  const lastRsi = rows.length ? rows[rows.length - 1].rsi : null;
  const lastHist = rows.length ? rows[rows.length - 1].hist : null;

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-foreground">
            {data?.name || symbol}
            <span className="text-sm font-mono text-muted-foreground ml-2">
              {data?.symbol || symbol}
              {data?.exchange ? ` · ${data.exchange}` : ""}
            </span>
          </h3>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-mono text-3xl tabular-nums text-gold">
              {data?.price != null ? data.price.toFixed(2) : "—"}
            </span>
            <span className={cn("font-mono text-sm tabular-nums", up ? "text-emerald-400" : "text-rose-400")}>
              {up ? <TrendingUp className="inline w-3.5 h-3.5 mr-1" /> : <TrendingDown className="inline w-3.5 h-3.5 mr-1" />}
              {pct(data?.changePct)}{" "}
              {data?.changeAmt != null ? `(${data.changeAmt > 0 ? "+" : ""}${data.changeAmt.toFixed(2)})` : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
          >
            {["6mo", "1y", "2y", "5y", "10y", "max"].map((r) => (
              <option key={r} value={r}>{r.toUpperCase()}</option>
            ))}
          </select>
          <Refresh onClick={() => refetch()} busy={isFetching} />
        </div>
      </div>

      <ErrorNote error={error} />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat k="52W High" v={data?.fiftyTwoWeekHigh?.toFixed(2) ?? "—"} />
        <Stat k="52W Low" v={data?.fiftyTwoWeekLow?.toFixed(2) ?? "—"} />
        <Stat k="Volume" v={data?.volume ? (data.volume / 1e6).toFixed(2) + "M" : "—"} />
        <Stat k="σ annual" v={data ? (data.annualVol * 100).toFixed(1) + "%" : "—"} />
        <Stat
          k="RSI(14)"
          v={lastRsi != null ? lastRsi.toFixed(1) : "—"}
          tone={lastRsi == null ? undefined : lastRsi > 70 ? "down" : lastRsi < 30 ? "up" : undefined}
        />
        <Stat
          k="MACD Hist"
          v={lastHist != null ? lastHist.toFixed(3) : "—"}
          tone={lastHist == null ? undefined : lastHist >= 0 ? "up" : "down"}
        />
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-2">
          <SendToTool
            fromId="us-suite"
            label="US Suite 行情"
            outputs={{ S0: data.price, sigma: data.annualVol }}
            targets={["bs", "iv", "mc", "backtest"]}
          />
          <span className="text-[10px] font-mono text-muted-foreground">
            S₀ = {data.price.toFixed(2)} · σ = {(data.annualVol * 100).toFixed(1)}% 可直接送入定价与回测工具
          </span>
        </div>
      )}

      <div className="h-80 border border-border/40 bg-background/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} syncId="us-quote" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
            <YAxis {...AXIS_PROPS} domain={["auto", "auto"]} />
            <Tooltip content={<ThemedTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="bollUpper" name="Boll Upper" stroke="hsl(var(--muted-foreground))" strokeWidth={0.8} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="bollLower" name="Boll Lower" stroke="hsl(var(--muted-foreground))" strokeWidth={0.8} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="close" name="Close" stroke={CHART_COLORS.primary} strokeWidth={1.6} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="ma20" name="MA20" stroke={CHART_COLORS.gold} strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="ma60" name="MA60" stroke={CHART_COLORS.teal} strokeWidth={1} dot={false} isAnimationActive={false} />
            <Brush dataKey="date" height={18} travellerWidth={8} stroke="hsl(var(--border))" fill="hsl(var(--background))" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="h-56 border border-border/40 bg-background/40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} syncId="us-quote" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={60} />
              <YAxis {...AXIS_PROPS} />
              <Tooltip content={<ThemedTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="hist" name="MACD Hist" fill={CHART_COLORS.primary} isAnimationActive={false} />
              <Line type="monotone" dataKey="macd" name="DIF" stroke={CHART_COLORS.gold} strokeWidth={1} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="signal" name="DEA" stroke={CHART_COLORS.teal} strokeWidth={1} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="h-56 border border-border/40 bg-background/40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} syncId="us-quote" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={60} />
              <YAxis {...AXIS_PROPS} domain={[0, 100]} />
              <Tooltip content={<ThemedTooltip />} />
              <ReferenceLine y={70} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <ReferenceLine y={30} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="rsi" name="RSI(14)" stroke={CHART_COLORS.primary} strokeWidth={1.2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <Source text={data?.source || "Yahoo Finance chart v8 · 指标本地计算 (MA / EMA / MACD / RSI / KDJ / Bollinger)"} />
    </Panel>
  );
}

/* ═══════════════ Tab 2 · Fundamentals ═══════════════ */
const METRIC_LABELS: Record<string, { label: string; kind: "usd" | "x" | "pct" }> = {
  marketCap: { label: "市值 Market Cap", kind: "usd" },
  trailingPE: { label: "PE (TTM)", kind: "x" },
  forwardPE: { label: "Forward PE", kind: "x" },
  priceToBook: { label: "PB", kind: "x" },
  beta: { label: "Beta", kind: "x" },
  dividendYield: { label: "股息率", kind: "pct" },
  grossMargins: { label: "毛利率", kind: "pct" },
  profitMargins: { label: "净利率", kind: "pct" },
  returnOnEquity: { label: "ROE", kind: "pct" },
  revenueGrowth: { label: "营收增速", kind: "pct" },
  debtToEquity: { label: "D/E", kind: "x" },
  targetMeanPrice: { label: "目标价均值", kind: "x" },
};

function FundamentalsTab({ symbol }: { symbol: string }) {
  const { data, isFetching, error, refetch } = useUsFundamentals(symbol);
  const [statement, setStatement] = useState<"income" | "balance" | "cash">("income");

  const series = useMemo(
    () => (data?.statements || []).filter((s) => s.statement === statement),
    [data, statement],
  );

  const chartRows = useMemo(() => {
    const ends = new Set<string>();
    series.forEach((s) => s.points.forEach((p) => ends.add(p.end)));
    return [...ends].sort().map((end) => {
      const row: Record<string, string | number> = { end };
      series.forEach((s) => {
        const p = s.points.find((x) => x.end === end);
        if (p) row[s.label] = p.val / 1e9;
      });
      return row;
    });
  }, [series]);

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">
          {data?.company || symbol}
          {data?.cik && <span className="text-xs font-mono text-muted-foreground ml-2">CIK {data.cik}</span>}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex border border-border/60">
            {(["income", "balance", "cash"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatement(s)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider",
                  statement === s ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "income" ? "利润表" : s === "balance" ? "资产负债" : "现金流"}
              </button>
            ))}
          </div>
          <Refresh onClick={() => refetch()} busy={isFetching} />
        </div>
      </div>

      <ErrorNote error={error} />
      {isFetching && !data && (
        <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> 正在读取 SEC XBRL…
        </p>
      )}

      {data?.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {Object.entries(METRIC_LABELS).map(([k, meta]) => {
            const raw = data.metrics?.[k];
            const v = typeof raw === "number" ? raw : null;
            const text =
              v == null
                ? "—"
                : meta.kind === "usd"
                  ? fmtUsd(v)
                  : meta.kind === "pct"
                    ? (v * 100).toFixed(2) + "%"
                    : v.toFixed(2);
            return <Stat key={k} k={meta.label} v={text} />;
          })}
        </div>
      )}

      {chartRows.length > 0 && (
        <div className="h-72 border border-border/40 bg-background/40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="end" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} label={{ value: "USD bn", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
              <Tooltip content={<ThemedTooltip />} formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(2) + " bn" : String(v))} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              {series.map((s, i) => (
                <Bar
                  key={s.tag}
                  dataKey={s.label}
                  fill={[CHART_COLORS.primary, CHART_COLORS.gold, CHART_COLORS.teal, CHART_COLORS.destructive][i % 4]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="border border-border/40 bg-background/40 overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead className="border-b border-border/40">
            <tr className="text-[10px] uppercase text-muted-foreground">
              <th className="text-left px-2 py-2">GAAP Tag</th>
              {(series[0]?.points || []).map((p) => (
                <th key={p.end} className="text-right px-2 py-2">{p.end}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.tag} className="border-b border-border/20 hover:bg-gold/5">
                <td className="px-2 py-1.5 text-foreground">{s.label}</td>
                {(series[0]?.points || []).map((ref) => {
                  const p = s.points.find((x) => x.end === ref.end);
                  return (
                    <td key={ref.end} className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {p ? fmtUsd(p.val) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!series.length && !isFetching && (
              <tr><td className="px-4 py-8 text-center text-muted-foreground text-xs">该标的暂无对应 XBRL 年度数据 (非美国注册发行人通常不适用)</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Source text={data?.source || "SEC XBRL companyconcept (tier S) + Yahoo quoteSummary (tier C)"} />
    </Panel>
  );
}

/* ═══════════════ Tab 3 · SEC filings ═══════════════ */
const FORMS = ["", "10-K", "10-Q", "8-K", "4", "13F", "S-1"];

function FilingsTab({ symbol }: { symbol: string }) {
  const [form, setForm] = useState("");
  const [q, setQ] = useState("");
  const [ftsOn, setFtsOn] = useState(false);
  const issuer = useUsFilings(symbol, form);
  const fts = useEdgarFullText(q, "", ftsOn);

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">
          {issuer.data?.company || symbol}
          {issuer.data?.sic && <span className="text-xs font-mono text-muted-foreground ml-2">{issuer.data.sic}</span>}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={form}
            onChange={(e) => setForm(e.target.value)}
            className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
          >
            {FORMS.map((f) => (
              <option key={f || "all"} value={f}>{f || "全部表单"}</option>
            ))}
          </select>
          <Refresh onClick={() => issuer.refetch()} busy={issuer.isFetching} />
        </div>
      </div>

      <ErrorNote error={issuer.error} />

      <div className="border border-border/40 bg-background/40 overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/40">
            <tr className="text-[10px] uppercase text-muted-foreground">
              <th className="text-left px-2 py-2">Filed</th>
              <th className="text-left px-2 py-2">Form</th>
              <th className="text-left px-2 py-2">Period</th>
              <th className="text-left px-2 py-2">Document</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {issuer.data?.rows.map((r) => (
              <tr key={r.accession + (r.primaryDoc || "")} className="border-b border-border/20 hover:bg-gold/5">
                <td className="px-2 py-1.5 text-muted-foreground">{r.filedAt}</td>
                <td className="px-2 py-1.5 text-gold">{r.form}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{r.reportDate || "—"}</td>
                <td className="px-2 py-1.5 text-foreground truncate max-w-[260px]">{r.primaryDoc || r.description || "—"}</td>
                <td className="px-2 py-1.5 text-right">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-gold" aria-label="Open filing on SEC EDGAR">
                      <ExternalLink className="w-3.5 h-3.5 inline" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {!issuer.isFetching && !issuer.data?.rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border border-border/40 bg-background/40 p-3 space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-wider text-gold">EDGAR Full-Text Search · 2001 至今全库检索</p>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); setFtsOn(true); fts.refetch(); }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='例如 "HBM4" 或 "going concern"'
            className="flex-1 min-w-[220px] bg-background border border-border/60 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
          />
          <button type="submit" className="inline-flex items-center gap-1.5 border border-gold/50 text-gold px-3 py-1.5 text-xs font-mono hover:bg-gold/10">
            <Search className="w-3.5 h-3.5" /> 检索
          </button>
        </form>
        <ErrorNote error={fts.error} />
        {fts.data && (
          <div className="max-h-64 overflow-y-auto border border-border/30">
            <table className="w-full text-xs font-mono">
              <tbody>
                {fts.data.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-gold/5">
                    <td className="px-2 py-1.5 text-muted-foreground w-24">{r.filedAt}</td>
                    <td className="px-2 py-1.5 text-gold w-16">{r.form}</td>
                    <td className="px-2 py-1.5 text-foreground truncate max-w-[320px]">{r.company}</td>
                    <td className="px-2 py-1.5 text-right w-8">
                      {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-gold"><ExternalLink className="w-3.5 h-3.5 inline" /></a>}
                    </td>
                  </tr>
                ))}
                {!fts.data.rows.length && (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground text-xs">无匹配结果</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Source text="SEC EDGAR submissions + full-text search · tier S (可商用/可再分发, 需声明 User-Agent, ≤10 req/s)" />
    </Panel>
  );
}

/* ═══════════════ Tab 4 · Options ═══════════════ */
function OptionsTab({ symbol }: { symbol: string }) {
  const [expiry, setExpiry] = useState<number | undefined>(undefined);
  const { data, isFetching, error, refetch } = useUsOptions(symbol, expiry);

  const smile = useMemo(() => {
    if (!data?.spot) return [];
    const near = (o: OptionLeg) => Math.abs(o.strike / (data.spot as number) - 1) < 0.35;
    return [
      ...data.calls.filter(near).map((o) => ({ strike: o.strike, iv: o.iv * 100, type: "Call" })),
      ...data.puts.filter(near).map((o) => ({ strike: o.strike, iv: o.iv * 100, type: "Put" })),
    ];
  }, [data]);

  const table = useMemo(() => {
    if (!data?.spot) return [];
    const all = [...data.calls, ...data.puts];
    return all
      .filter((o) => Math.abs(o.strike / (data.spot as number) - 1) < 0.2)
      .sort((a, b) => (a.strike - b.strike) || (a.type < b.type ? -1 : 1));
  }, [data]);

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">
          {symbol} 期权链
          {data?.expiryDate && <span className="text-xs font-mono text-muted-foreground ml-2">到期 {data.expiryDate}</span>}
          {data?.isZeroDte && <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 border border-gold/60 text-gold">0DTE</span>}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={expiry ?? data?.expiry ?? ""}
            onChange={(e) => setExpiry(Number(e.target.value))}
            className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
          >
            {(data?.expirationDates || []).map((e) => (
              <option key={e.ts} value={e.ts}>{e.date}</option>
            ))}
          </select>
          <Refresh onClick={() => refetch()} busy={isFetching} />
        </div>
      </div>

      <ErrorNote error={error} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat k="Spot" v={data?.spot?.toFixed(2) ?? "—"} />
        <Stat k="Put/Call Vol" v={data?.putCallVol != null ? data.putCallVol.toFixed(2) : "—"} tone={data?.putCallVol != null && data.putCallVol > 1 ? "down" : "up"} />
        <Stat k="Put/Call OI" v={data?.putCallOi != null ? data.putCallOi.toFixed(2) : "—"} />
        <Stat k="异动合约" v={data?.unusualCount != null ? String(data.unusualCount) : "—"} />
        <Stat k="T (yrs)" v={data?.T != null ? data.T.toFixed(4) : "—"} />
      </div>

      <div className="h-64 border border-border/40 bg-background/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis type="number" dataKey="strike" {...AXIS_PROPS} domain={["auto", "auto"]} name="Strike" />
            <YAxis type="number" dataKey="iv" {...AXIS_PROPS} name="IV %" />
            <Tooltip content={<ThemedTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {data?.spot && <ReferenceLine x={data.spot} stroke="hsl(var(--border))" strokeDasharray="4 4" />}
            <Scatter name="Call IV" data={smile.filter((s) => s.type === "Call")} fill={CHART_COLORS.primary} isAnimationActive={false} />
            <Scatter name="Put IV" data={smile.filter((s) => s.type === "Put")} fill={CHART_COLORS.gold} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-border/40 bg-background/40 overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/40">
            <tr className="text-[10px] uppercase text-muted-foreground">
              <th className="text-left px-2 py-2">Type</th>
              <th className="text-right px-2 py-2">Strike</th>
              <th className="text-right px-2 py-2">Last</th>
              <th className="text-right px-2 py-2">IV</th>
              <th className="text-right px-2 py-2">Δ</th>
              <th className="text-right px-2 py-2">Γ</th>
              <th className="text-right px-2 py-2">Vega</th>
              <th className="text-right px-2 py-2">Θ</th>
              <th className="text-right px-2 py-2">Vol</th>
              <th className="text-right px-2 py-2">OI</th>
              <th className="text-right px-2 py-2">V/OI</th>
            </tr>
          </thead>
          <tbody>
            {table.map((o, i) => (
              <tr key={i} className={cn("border-b border-border/20 hover:bg-gold/5", o.unusual && "bg-gold/[0.07]")}>
                <td className={cn("px-2 py-1.5", o.type === "call" ? "text-emerald-400" : "text-rose-400")}>{o.type}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">{o.strike}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{o.last?.toFixed(2) ?? "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-gold">{(o.iv * 100).toFixed(1)}%</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{o.delta?.toFixed(3) ?? "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{o.gamma != null ? o.gamma.toExponential(2) : "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{o.vega?.toFixed(4) ?? "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{o.theta?.toFixed(4) ?? "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{o.volume}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{o.openInterest}</td>
                <td className={cn("px-2 py-1.5 text-right tabular-nums", o.unusual && "text-gold")}>
                  {o.volOiRatio != null ? o.volOiRatio.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
            {!isFetching && !table.length && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-xs">暂无合约数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">
        高亮行 = Vol/OI &gt; 1 且成交 ≥ 200 的新增持仓异动。Greeks 由 Black–Scholes 在浏览器外的边缘函数内实时计算 (r = {data?.r ?? 0.042})。
      </p>
      <Source text={data?.source || "Yahoo options v7 (tier C, 个人研究) · Greeks 本地计算"} />
    </Panel>
  );
}

/* ═══════════════ Tab 5 · Screener ═══════════════ */
function ScreenerTab() {
  const [tag, setTag] = useState("Assets");
  const [year, setYear] = useState(2025);
  const [quarter, setQuarter] = useState(1);
  const meta = SCREENER_TAGS.find((t) => t.tag === tag);
  const period = `CY${year}Q${quarter}${meta?.instant ? "I" : ""}`;
  const { data, isFetching, error, refetch } = useUsScreener(tag, period);

  const exportCsv = () => {
    if (!data) return;
    const head = "rank,cik,entity,value,end\n";
    const body = data.rows
      .map((r) => [r.rank, r.cik, `"${r.entity.replace(/"/g, '""')}"`, r.value, r.end].join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `edgar-frames-${tag}-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">
          全市场筛选器 · <span className="text-sm font-mono text-muted-foreground">{data?.label || tag} · {period}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold">
            {SCREENER_TAGS.map((t) => <option key={t.tag} value={t.tag}>{t.label}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(+e.target.value)} className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold">
            {[2021, 2022, 2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>CY{y}</option>)}
          </select>
          <select value={quarter} onChange={(e) => setQuarter(+e.target.value)} className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold">
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
          </select>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 border border-border/60 px-2 py-1 text-xs font-mono text-muted-foreground hover:text-gold hover:border-gold">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <Refresh onClick={() => refetch()} busy={isFetching} />
        </div>
      </div>

      <ErrorNote error={error} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat k="报送公司数" v={data?.universe != null ? data.universe.toLocaleString() : "—"} />
        <Stat k="合计" v={fmtUsd(data?.total)} />
        <Stat k="中位数" v={fmtUsd(data?.median)} />
        <Stat k="展示条数" v={data?.n != null ? String(data.n) : "—"} />
      </div>

      <div className="border border-border/40 bg-background/40 overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/40">
            <tr className="text-[10px] uppercase text-muted-foreground">
              <th className="text-left px-2 py-2">#</th>
              <th className="text-left px-2 py-2">Entity</th>
              <th className="text-right px-2 py-2">Value</th>
              <th className="text-left px-2 py-2">Period end</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.cik + r.end} className="border-b border-border/20 hover:bg-gold/5">
                <td className="px-2 py-1.5 text-muted-foreground">{r.rank}</td>
                <td className="px-2 py-1.5 text-foreground truncate max-w-[320px]">{r.entity}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-gold">{fmtUsd(r.value)}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{r.end}</td>
                <td className="px-2 py-1.5 text-right">
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-gold" aria-label="Open on SEC EDGAR">
                    <ExternalLink className="w-3.5 h-3.5 inline" />
                  </a>
                </td>
              </tr>
            ))}
            {!isFetching && !data?.rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">该标签在此期间无数据 — 试试相邻季度或换一个标签</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data?.description && <p className="text-[10px] text-muted-foreground leading-relaxed">{data.description}</p>}
      <Source text={data?.source || "SEC EDGAR XBRL frames (tier S · 免费全市场横截面)"} />
    </Panel>
  );
}

/* ═══════════════ Shell ═══════════════ */
export default function USSuite() {
  const [tab, setTab] = useState<Tab>("quote");
  const [symbol, setSymbol] = useState("AAPL");
  const [draft, setDraft] = useState("AAPL");

  return (
    <section className="px-6 pb-16">
      <SectionHeader
        chapter="V5.2"
        kicker="US Full-Stack Data"
        title="美股全栈数据工作台"
        subtitle="行情与本地技术指标 · SEC XBRL 三表与关键指标 · EDGAR 披露流与全库检索 · 期权链与 Greeks · 全市场 XBRL 筛选器。"
      />

      <div className="container max-w-6xl mt-6 space-y-5">
        {/* Ticker bar */}
        <div className="flex flex-wrap items-center gap-2 border border-border/50 bg-card/30 p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); setSymbol(draft.trim().toUpperCase() || "AAPL"); }}
            className="flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              placeholder="Ticker"
              aria-label="US ticker"
              className="w-32 bg-background border border-border/60 px-2 py-1.5 text-sm font-mono uppercase focus:outline-none focus:border-gold"
            />
            <button type="submit" className="border border-gold/50 text-gold px-3 py-1.5 text-xs font-mono hover:bg-gold/10">
              载入
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setDraft(p); setSymbol(p); }}
                className={cn(
                  "px-2 py-1 text-[10px] font-mono border",
                  symbol === p ? "border-gold/60 text-gold bg-gold/10" : "border-border/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <a
            href={`https://stockanalysis.com/stocks/${symbol.toLowerCase()}/`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[10px] font-mono text-muted-foreground hover:text-gold inline-flex items-center gap-1"
          >
            外部核对 StockAnalysis <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-border/40 pb-2" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-mono border transition-colors",
                tab === t.id
                  ? "border-gold/60 text-gold bg-gold/10"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {t.label}
              <span className="ml-2 text-[9px] uppercase tracking-wider opacity-60">{t.sub}</span>
            </button>
          ))}
        </div>

        {tab === "quote" && <QuoteTab symbol={symbol} />}
        {tab === "fundamentals" && <FundamentalsTab symbol={symbol} />}
        {tab === "filings" && <FilingsTab symbol={symbol} />}
        {tab === "options" && <OptionsTab symbol={symbol} />}
        {tab === "screener" && <ScreenerTab />}

        <div className="border border-border/40 bg-muted/20 p-3 text-[10px] font-mono text-muted-foreground leading-relaxed">
          合规分级 — <span className="text-gold">Tier S</span> (SEC EDGAR / Treasury / CFTC): 政府公开数据, 可商用可再分发, 需声明 User-Agent 并限速。
          <span className="text-gold"> Tier C</span> (Yahoo / Nasdaq / Eastmoney): 需事前授权或条款未经核实, 本站仅作个人研究与教学演示。
          本板块分发的是代码而非数据, 数据由用户在各来源自身条款下获取。
        </div>
      </div>
    </section>
  );
}