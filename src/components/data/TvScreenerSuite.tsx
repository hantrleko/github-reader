/**
 * V6.4 · TradingView Screener Suite
 * Cross-market scanner for stocks, FX, crypto, bonds and futures.
 * Data source: TradingView public scanner endpoints via Lovable Cloud edge function.
 */
import { useMemo, useState } from "react";
import {
  Loader2, AlertTriangle, RefreshCcw, Search, Download, ExternalLink,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import { cn } from "@/lib/utils";
import {
  useTvScreener,
  TV_MARKETS,
  TV_PRESETS,
  TV_COMMON_COLUMNS,
  fmtCell,
  downloadCsv,
  type TvFilter,
} from "@/lib/tvScreener";

const PAGE_SIZE = 50;

function Badge({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded text-[10px] font-mono border transition-colors",
        active
          ? "border-gold/60 bg-gold/10 text-gold"
          : "border-border/60 text-muted-foreground hover:text-foreground hover:border-gold/40"
      )}
    >
      {children}
    </button>
  );
}

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

export default function TvScreenerSuite() {
  const [market, setMarket] = useState("america");
  const [presetKey, setPresetKey] = useState<string>("market-cap");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [customColumns, setCustomColumns] = useState<string[] | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const preset = TV_PRESETS[presetKey] || TV_PRESETS["market-cap"];
  const columns = customColumns ?? preset.columns;

  const filters: TvFilter[] = useMemo(() => {
    const base = [...preset.filters];
    if (presetKey === "crypto" && market !== "crypto") setMarket("crypto");
    if (presetKey === "forex" && market !== "forex") setMarket("forex");
    if (search.trim()) {
      base.push({ left: "name", operation: "match", right: search.trim().toUpperCase() });
    }
    return base;
  }, [preset, presetKey, search]);

  const req = useMemo(
    () => ({
      market,
      columns,
      filters,
      sortBy: preset.sortBy,
      sortOrder,
      range: [page * PAGE_SIZE, (page + 1) * PAGE_SIZE] as [number, number],
    }),
    [market, columns, filters, preset.sortBy, sortOrder, page]
  );

  const { data, isFetching, error, refetch } = useTvScreener(req);

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const handlePreset = (key: string) => {
    setPresetKey(key);
    setCustomColumns(null);
    setPage(0);
    const p = TV_PRESETS[key];
    if (key === "crypto") setMarket("crypto");
    if (key === "forex") setMarket("forex");
    if (p && !columns.includes(p.sortBy)) {
      setSortOrder("desc");
    }
  };

  const toggleColumn = (col: string) => {
    setCustomColumns((prev) => {
      const base = prev ?? preset.columns;
      const set = new Set(base);
      if (set.has(col)) set.delete(col);
      else set.add(col);
      return Array.from(set);
    });
  };

  const sortIcon = sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Data"
        kicker="TradingView Screener"
        title="跨市场实时筛选器"
        subtitle="无需 API key，直接查询 TradingView 公共 Scanner：覆盖股票、外汇、加密货币、债券与期货，支持 13000+ 字段自由组合。"
      />

      <div className="container max-w-7xl px-6 space-y-5">
        {/* Market selector */}
        <div className="flex flex-wrap gap-2">
          {TV_MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMarket(m.id);
                setPage(0);
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-mono border transition-colors",
                m.id === market
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-gold/40"
              )}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Presets */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quick screens</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TV_PRESETS).map(([key, p]) => (
              <Badge key={key} active={presetKey === key && !customColumns} onClick={() => handlePreset(key)}>
                {p.label}
              </Badge>
            ))}
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">
            {preset.desc} · 排序: {preset.sortBy} · {sortOrder === "asc" ? "升序" : "降序"}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search symbol / name"
              className="pl-8 pr-3 py-1.5 w-56 rounded-md bg-secondary/50 border border-border text-sm font-mono focus:outline-none focus:border-gold/40"
            />
          </div>

          <button
            onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === "asc" ? "升序" : "降序"}
            {sortIcon}
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50"
          >
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
            刷新
          </button>

          <button
            onClick={() => downloadCsv(rows, `tv-screener-${market}-${presetKey}-${new Date().toISOString().slice(0, 10)}.csv`)}
            disabled={!rows.length}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>

          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            {isFetching ? "Loading…" : `${rows.length} / ${total} results`}
          </span>
        </div>

        {/* Column picker */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Columns</p>
            {customColumns && (
              <button
                onClick={() => setCustomColumns(null)}
                className="text-[10px] font-mono text-gold hover:underline"
              >
                重置为预设
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {TV_COMMON_COLUMNS.map((col) => (
              <Badge key={col} active={columns.includes(col)} onClick={() => toggleColumn(col)}>
                {col}
              </Badge>
            ))}
          </div>
        </div>

        <ErrorNote error={error} />

        {/* Results table */}
        <Panel>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground font-mono uppercase tracking-wider">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 whitespace-nowrap border-b border-border/60">
                      {col}
                    </th>
                  ))}
                  <th className="px-3 py-2 border-b border-border/60">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                    {columns.map((col) => {
                      const v = row[col];
                      const isChange = String(col).toLowerCase().includes("change");
                      const num = typeof v === "number" ? v : null;
                      return (
                        <td
                          key={col}
                          className={cn(
                            "px-3 py-2 font-mono tabular-nums whitespace-nowrap",
                            isChange && num != null && num > 0 && "text-emerald-400",
                            isChange && num != null && num < 0 && "text-rose-400"
                          )}
                        >
                          {fmtCell(v)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      <a
                        href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(String(row.symbol))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-gold hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Chart
                      </a>
                    </td>
                  </tr>
                ))}
                {!isFetching && rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted-foreground font-mono">
                      无结果 · 尝试切换市场或放宽筛选条件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isFetching}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> 上一页
            </button>
            <span className="text-[10px] font-mono text-muted-foreground">
              Page {page + 1} · rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || isFetching}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50"
            >
              下一页 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Panel>

        <p className="text-[10px] font-mono text-muted-foreground">
          Source: {data?.source || "TradingView Screener (public scanner endpoint)"} · {data?.ts || "—"}
        </p>
      </div>
    </section>
  );
}
