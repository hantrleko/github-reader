/**
 * V5.0 A-Share Suite — Chinese equities data workbench.
 * Four tabs: Quote+Kline · Fund flow · 龙虎榜 · 巨潮公告.
 * All backed by public, zero-auth CN endpoints (Tencent qt, Eastmoney push2, Cninfo).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { Loader2, AlertTriangle, RefreshCcw, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip, CHART_COLORS } from "@/components/common/ChartTheme";
import { cn } from "@/lib/utils";

const FUNCTIONS_URL = "https://oshfqmmhxaaevucfdunk.supabase.co/functions/v1";

const PRESETS = [
  { code: "sh600519", label: "600519 贵州茅台" },
  { code: "sh601318", label: "601318 中国平安" },
  { code: "sz000858", label: "000858 五粮液" },
  { code: "sz300750", label: "300750 宁德时代" },
  { code: "sh688981", label: "688981 中芯国际" },
  { code: "sh600036", label: "600036 招商银行" },
];

type Tab = "quote" | "flow" | "longhu" | "news";

const fmtRmb = (v: number | null | undefined, digits = 2) => {
  if (v == null || !isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e8) return (v / 1e8).toFixed(digits) + " 亿";
  if (abs >= 1e4) return (v / 1e4).toFixed(digits) + " 万";
  return v.toFixed(digits);
};
const fmtPct = (v: number | null | undefined) => (v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : "") + v.toFixed(2) + "%");

/* ─────────────── Quote + Kline ─────────────── */
function QuoteTab({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${FUNCTIONS_URL}/ashare-quote?symbol=${encodeURIComponent(symbol)}&lmt=250`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e) { setErr((e as Error)?.message || "load failed"); }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => { load(); }, [load]);

  const chartData = useMemo(() => {
    if (!data?.dates) return [];
    return data.dates.map((d: string, i: number) => ({ date: d, close: data.closes[i] }));
  }, [data]);

  const up = (data?.changePct ?? 0) >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-foreground">
            {data?.name || "—"} <span className="text-sm font-mono text-muted-foreground ml-2">{data?.code || symbol}</span>
          </h3>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-mono text-3xl tabular-nums text-gold">{data?.price?.toFixed(2) ?? "—"}</span>
            <span className={cn("font-mono text-sm tabular-nums", up ? "text-emerald-400" : "text-rose-400")}>
              {up ? <TrendingUp className="inline w-3.5 h-3.5 mr-1" /> : <TrendingDown className="inline w-3.5 h-3.5 mr-1" />}
              {fmtPct(data?.changePct)} {data?.changeAmt != null ? `(${data.changeAmt > 0 ? "+" : ""}${data.changeAmt.toFixed(2)})` : ""}
            </span>
          </div>
        </div>
        <button onClick={load} className="p-1.5 border border-border/60 hover:border-gold text-muted-foreground hover:text-gold" title="Refresh">
          <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {err && (
        <div className="border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {err}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          ["Open", data?.open?.toFixed(2)],
          ["Prev", data?.prevClose?.toFixed(2)],
          ["High", data?.high?.toFixed(2)],
          ["Low", data?.low?.toFixed(2)],
          ["Vol(手)", data?.volume ? (data.volume / 1e4).toFixed(1) + " 万" : "—"],
          ["Amt", data?.turnover ? (data.turnover / 1e4).toFixed(2) + " 亿" : "—"],
        ].map(([k, v]) => (
          <div key={k} className="border border-border/40 bg-background/40 px-2 py-1.5">
            <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{k}</p>
            <p className="text-sm font-mono text-foreground tabular-nums">{v ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="h-72 border border-border/40 bg-background/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={40} />
            <YAxis {...AXIS_PROPS} domain={["auto", "auto"]} />
            <Tooltip content={<ThemedTooltip />} />
            <Line type="monotone" dataKey="close" stroke={CHART_COLORS.primary} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">
        Realtime: 腾讯行情 qt.gtimg.cn · K-line: 东方财富 push2his.eastmoney.com · 前复权 · 日线。
      </p>
    </div>
  );
}

/* ─────────────── Fund Flow ─────────────── */
function FlowTab({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${FUNCTIONS_URL}/ashare-fundflow?symbol=${encodeURIComponent(symbol)}&lmt=90`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e) { setErr((e as Error)?.message || "load failed"); }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => { load(); }, [load]);

  const chartData = useMemo(() => {
    if (!data?.dates) return [];
    return data.dates.map((d: string, i: number) => ({
      date: d,
      main: data.mainNet[i] / 1e8,
      super: data.superNet[i] / 1e8,
      large: data.largeNet[i] / 1e8,
    }));
  }, [data]);

  const totals = useMemo(() => {
    if (!data?.mainNet) return null;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    return {
      main: sum(data.mainNet), super: sum(data.superNet),
      large: sum(data.largeNet), mid: sum(data.midNet), small: sum(data.smallNet),
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">
          资金流向 · <span className="text-muted-foreground text-sm font-mono">{data?.name || symbol}</span>
        </h3>
        <button onClick={load} className="p-1.5 border border-border/60 hover:border-gold text-muted-foreground hover:text-gold">
          <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>
      {err && (
        <div className="border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {err}
        </div>
      )}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            ["Main 主力", totals.main],
            ["Super 超大单", totals.super],
            ["Large 大单", totals.large],
            ["Mid 中单", totals.mid],
            ["Small 小单", totals.small],
          ].map(([k, v]) => (
            <div key={k as string} className="border border-border/40 bg-background/40 px-2 py-1.5">
              <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{k as string} · 累计</p>
              <p className={cn("text-sm font-mono tabular-nums", (v as number) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {fmtRmb(v as number, 2)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="h-72 border border-border/40 bg-background/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={40} />
            <YAxis {...AXIS_PROPS} label={{ value: "亿元", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
            <Tooltip content={<ThemedTooltip />} formatter={(v: any) => (typeof v === "number" ? v.toFixed(3) + " 亿" : v)} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar dataKey="main" fill={CHART_COLORS.primary} name="主力净流入" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">
        Source: 东方财富 push2his fflow · 主力 = 大单 + 超大单净流入 · 日线。
      </p>
    </div>
  );
}

/* ─────────────── 龙虎榜 ─────────────── */
function LongHuTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${FUNCTIONS_URL}/ashare-longhu?days=${days}&pageSize=80`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e) { setErr((e as Error)?.message || "load failed"); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">龙虎榜 · Long-Hu Bang</h3>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(+e.target.value)} className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold">
            <option value={3}>近 3 日</option>
            <option value={7}>近 7 日</option>
            <option value={15}>近 15 日</option>
            <option value={30}>近 30 日</option>
          </select>
          <button onClick={load} className="p-1.5 border border-border/60 hover:border-gold text-muted-foreground hover:text-gold">
            <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>
      {err && (
        <div className="border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {err}
        </div>
      )}
      <div className="border border-border/40 bg-background/40 overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/40">
            <tr className="text-[10px] uppercase text-muted-foreground">
              <th className="text-left px-2 py-2">Date</th>
              <th className="text-left px-2 py-2">Code</th>
              <th className="text-left px-2 py-2">Name</th>
              <th className="text-right px-2 py-2">Δ%</th>
              <th className="text-right px-2 py-2">Net Amt</th>
              <th className="text-left px-2 py-2 max-w-[240px]">Reason</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows?.map((r: any, i: number) => (
              <tr key={i} className="border-b border-border/20 hover:bg-gold/5">
                <td className="px-2 py-1.5 text-muted-foreground">{r.date}</td>
                <td className="px-2 py-1.5 text-gold">{r.code}</td>
                <td className="px-2 py-1.5 text-foreground">{r.name}</td>
                <td className={cn("px-2 py-1.5 text-right tabular-nums", (r.changePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {fmtPct(r.changePct)}
                </td>
                <td className={cn("px-2 py-1.5 text-right tabular-nums", (r.netAmt ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {fmtRmb(r.netAmt)}
                </td>
                <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[240px]" title={r.reason}>{r.reason}</td>
              </tr>
            ))}
            {!loading && !data?.rows?.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">
        Source: 东方财富 datacenter-web · RPT_DAILYBILLBOARD_DETAILS · 沪深交易所每日龙虎榜公告聚合。
      </p>
    </div>
  );
}

/* ─────────────── 巨潮公告 ─────────────── */
function NewsTab({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scoped, setScoped] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const q = scoped ? `?code=${encodeURIComponent(symbol.replace(/\D/g, ""))}&pageSize=40&days=90` : `?pageSize=40&days=7`;
      const r = await fetch(`${FUNCTIONS_URL}/ashare-news${q}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e) { setErr((e as Error)?.message || "load failed"); }
    finally { setLoading(false); }
  }, [scoped, symbol]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">巨潮公告 · Cninfo Announcements</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScoped((s) => !s)}
            className={cn(
              "px-2 py-1 border text-[10px] font-mono uppercase tracking-wider",
              scoped ? "border-gold text-gold" : "border-border/60 text-muted-foreground hover:border-gold/60",
            )}
          >
            {scoped ? `仅 ${symbol}` : "全市场"}
          </button>
          <button onClick={load} className="p-1.5 border border-border/60 hover:border-gold text-muted-foreground hover:text-gold">
            <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>
      {err && (
        <div className="border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {err}
        </div>
      )}
      <div className="border border-border/40 bg-background/40 divide-y divide-border/20 max-h-[520px] overflow-y-auto">
        {data?.rows?.map((r: any, i: number) => (
          <div key={i} className="px-3 py-2 hover:bg-gold/5">
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span>{r.date}</span>
              <span className="text-gold">{r.code}</span>
              <span>{r.name}</span>
            </div>
            <a
              href={r.url || "#"} target="_blank" rel="noopener noreferrer"
              className={cn("block text-sm mt-1", r.url ? "text-foreground hover:text-gold" : "text-muted-foreground")}
            >
              {r.title}
              {r.url && <ExternalLink className="inline w-3 h-3 ml-1 opacity-60" />}
            </a>
          </div>
        ))}
        {!loading && !data?.rows?.length && (
          <div className="px-4 py-8 text-center text-muted-foreground text-xs">暂无公告</div>
        )}
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">
        Source: 巨潮资讯网 cninfo.com.cn · 官方定期公告披露 · PDF 链接可直接下载原件。
      </p>
    </div>
  );
}

/* ─────────────── Suite Shell ─────────────── */
const AShareSuite = () => {
  const [symbol, setSymbol] = useState("sh600519");
  const [draft, setDraft] = useState("sh600519");
  const [tab, setTab] = useState<Tab>("quote");

  const commit = () => {
    const s = draft.trim().toLowerCase();
    if (s) setSymbol(s);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "quote", label: "行情 / K 线" },
    { id: "flow", label: "资金流向" },
    { id: "longhu", label: "龙虎榜" },
    { id: "news", label: "巨潮公告" },
  ];

  return (
    <section className="py-10 md:py-14">
      <SectionHeader
        chapter="V5.0"
        kicker="A-Share Suite"
        title="A 股全栈接入"
        subtitle="腾讯行情 + 东方财富 push2 + 交易所龙虎榜 + 巨潮公告，一站式覆盖沪深北 A 股实时报价、日 K 线、资金流向、龙虎榜与官方公告披露。"
      />
      <div className="container max-w-6xl px-6 space-y-6">
        {/* Symbol picker */}
        <div className="border border-border/60 bg-card/40 p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-gold">Symbol</label>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commit()}
                placeholder="sh600519 / 000858 / 300750"
                className="flex-1 min-w-0 bg-background border border-border/60 px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-gold"
              />
              <button onClick={commit} className="px-3 py-1.5 border border-gold/60 text-gold text-xs font-mono hover:bg-gold/10">
                Load
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.code}
                onClick={() => { setDraft(p.code); setSymbol(p.code); }}
                className={cn(
                  "px-2 py-1 border text-[10px] font-mono transition-colors",
                  symbol === p.code ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground hover:border-gold/60 hover:text-gold",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border/40">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-mono uppercase tracking-wider border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="border border-border/60 bg-card/40 p-5 min-h-[420px]">
          {tab === "quote" && <QuoteTab symbol={symbol} />}
          {tab === "flow" && <FlowTab symbol={symbol} />}
          {tab === "longhu" && <LongHuTab />}
          {tab === "news" && <NewsTab symbol={symbol} />}
        </div>
      </div>
    </section>
  );
};

export default AShareSuite;