import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWatchlistQuotes } from "@/lib/marketData";
import { pushBus } from "@/lib/toolBus";
import { sectionHref } from "@/lib/sections";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import MacroPanel from "@/components/MacroPanel";
import { cn } from "@/lib/utils";
import { Plus, Trash2, TrendingUp, LogIn, RefreshCw } from "lucide-react";

type WatchlistRow = { id: string; symbol: string; label: string | null };

function formatPrice(p: number | null): string {
  if (p == null || !isFinite(p)) return "—";
  if (p >= 10000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(4);
}

function fmtPct(v: number | null, decimals = 2): string {
  if (v == null || !isFinite(v)) return "—";
  return (v >= 0 ? "+" : "") + (v * 100).toFixed(decimals) + "%";
}

function pctClass(v: number | null) {
  if (v == null) return "text-muted-foreground";
  return v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-muted-foreground";
}

const Watchlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // ── Watchlist items from Supabase ────────────────────────────────
  const { data: items = [], isLoading: listLoading } = useQuery<WatchlistRow[]>({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("id, symbol, label")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WatchlistRow[];
    },
    enabled: !!user,
  });

  const symbols = items.map((r) => r.symbol);

  // ── Live quotes for all symbols ──────────────────────────────────
  const quotes = useWatchlistQuotes(symbols);

  // ── Add symbol ───────────────────────────────────────────────────
  const addSymbol = async () => {
    const raw = inputRef.current?.value.trim().toUpperCase();
    if (!raw) return;
    if (symbols.includes(raw)) {
      toast({ title: `${raw} 已在自选股中`, variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("watchlist").insert({ symbol: raw });
    setAdding(false);
    if (error) {
      toast({ title: "添加失败", description: error.message, variant: "destructive" });
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    qc.invalidateQueries({ queryKey: ["watchlist", user?.id] });
  };

  // ── Remove symbol ────────────────────────────────────────────────
  const removeSymbol = async (id: string) => {
    setRemoving(id);
    const { error } = await supabase.from("watchlist").delete().eq("id", id);
    setRemoving(null);
    if (error) {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["watchlist", user?.id] });
  };

  // ── Send symbol data to backtest tool ────────────────────────────
  const openBacktest = (symbol: string, idx: number) => {
    const q = quotes[idx]?.data;
    if (q) {
      pushBus(
        { S0: q.lastPrice ?? undefined, sigma: q.annualVol, mu: q.annualReturn },
        `Watchlist · ${symbol}`
      );
    }
    navigate(sectionHref("quant"));
  };

  // ── Unauthenticated state ─────────────────────────────────────────
  if (!user) {
    return (
      <>
        <Navbar />
        <main className="container py-20 flex flex-col items-center gap-6 text-center">
          <LogIn className="w-10 h-10 text-gold/60" />
          <h1 className="text-2xl font-display font-bold">自选股 · Watchlist</h1>
          <p className="text-muted-foreground max-w-md text-sm">
            登录后即可保存自选标的，实时查看行情统计并快速接入量化分析工具。
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-background text-[11px] font-mono uppercase tracking-widest hover:bg-gold/85 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            登录 / 注册
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-8 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              自选股 <span className="text-gold">· Watchlist</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              实时追踪关注的标的，一键接入回测与风险分析工具
            </p>
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["watchlist", user?.id] })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-accent transition-colors"
            aria-label="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        {/* Add symbol */}
        <section className="flex flex-col sm:flex-row gap-2 max-w-lg">
          <input
            ref={inputRef}
            placeholder="输入代码，如 AAPL、^GSPC、BTC-USD"
            onKeyDown={(e) => e.key === "Enter" && addSymbol()}
            className="flex-1 bg-background border border-border/60 px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold placeholder:text-muted-foreground/50"
          />
          <button
            onClick={addSymbol}
            disabled={adding}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold text-background text-[11px] font-mono uppercase tracking-widest hover:bg-gold/85 disabled:opacity-50 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {adding ? "添加中…" : "添加"}
          </button>
        </section>

        {/* Quotes table */}
        <section>
          {listLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-accent/20 animate-pulse rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="border border-dashed border-accent/40 py-12 text-center">
              <p className="text-muted-foreground text-sm">还没有自选标的</p>
              <p className="text-muted-foreground/60 text-xs mt-1">在上方输入股票代码开始追踪</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/40">
                    {["代码", "最新价", "日涨跌", "年化收益", "年化波动率", ""].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 text-left pr-4 last:pr-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const q = quotes[idx];
                    const data = q?.data;
                    const loading = q?.isLoading ?? true;
                    const dayReturn = data?.returns?.[data.returns.length - 1] ?? null;
                    const cell = "py-2.5 pr-4 last:pr-0 align-middle";
                    return (
                      <tr key={item.id} className="border-b border-accent/20 hover:bg-accent/10 transition-colors">
                        <td className={cell}>
                          <span className="font-mono font-semibold text-gold">{item.symbol}</span>
                        </td>
                        <td className={cn(cell, "tabular-nums font-mono")}>
                          {loading ? (
                            <span className="inline-block h-3 w-14 bg-accent/30 animate-pulse rounded" />
                          ) : (
                            formatPrice(data?.lastPrice ?? null)
                          )}
                        </td>
                        <td className={cn(cell, "tabular-nums font-mono", pctClass(dayReturn))}>
                          {loading ? (
                            <span className="inline-block h-3 w-14 bg-accent/30 animate-pulse rounded" />
                          ) : (
                            fmtPct(dayReturn)
                          )}
                        </td>
                        <td className={cn(cell, "tabular-nums font-mono", pctClass(data?.annualReturn ?? null))}>
                          {loading ? (
                            <span className="inline-block h-3 w-14 bg-accent/30 animate-pulse rounded" />
                          ) : (
                            fmtPct(data?.annualReturn ?? null, 1)
                          )}
                        </td>
                        <td className={cn(cell, "tabular-nums font-mono text-muted-foreground")}>
                          {loading ? (
                            <span className="inline-block h-3 w-12 bg-accent/30 animate-pulse rounded" />
                          ) : data?.annualVol != null ? (
                            (data.annualVol * 100).toFixed(1) + "%"
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={cell}>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openBacktest(item.symbol, idx)}
                              title="接入回测工具"
                              className="inline-flex items-center gap-1 px-2 py-1 border border-gold/40 text-gold text-[9px] font-mono uppercase tracking-wider hover:bg-gold/10 transition-colors"
                            >
                              <TrendingUp className="w-3 h-3" />
                              回测
                            </button>
                            <button
                              onClick={() => removeSymbol(item.id)}
                              disabled={removing === item.id}
                              aria-label={`移除 ${item.symbol}`}
                              className="p-1 text-muted-foreground/50 hover:text-rose-400 disabled:opacity-40 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[9px] font-mono text-muted-foreground/50">
            数据来源：Yahoo Finance（有延迟）· 服务端缓存 20 分钟 · 年化指标基于近一年日收益率
          </p>
        </section>

        {/* Macro indicators */}
        <MacroPanel />
      </main>
      <SiteFooter />
    </>
  );
};

export default Watchlist;
