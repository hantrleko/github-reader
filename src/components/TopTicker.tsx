import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Bloomberg-style scrolling ticker. Pulls last close + last-day return for a
 * handful of bellwether symbols via the existing `market-quotes` edge function.
 * Falls back silently to static placeholders if the network is unavailable.
 */

type Quote = {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null; // last-day log return
};

const SYMBOLS: { sym: string; label: string }[] = [
  { sym: "^GSPC", label: "S&P 500" },
  { sym: "^NDX", label: "NASDAQ 100" },
  { sym: "^VIX", label: "VIX" },
  { sym: "^TNX", label: "UST 10Y" },
  { sym: "DX-Y.NYB", label: "DXY" },
  { sym: "GC=F", label: "Gold" },
  { sym: "CL=F", label: "WTI Crude" },
  { sym: "BTC-USD", label: "BTC" },
];

const fmt = (n: number | null, digits = 2) =>
  n == null || !isFinite(n)
    ? "—"
    : n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

const ENDPOINT =
  typeof import.meta.env.VITE_SUPABASE_URL === "string" && import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-quotes`
    : "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const CACHE_KEY = "top-ticker-quotes-v1";
const CACHE_TTL = 24 * 60 * 60 * 1000;

const readCache = (): Quote[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { at: number; quotes: Quote[] };
    if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL) return [];
    return Array.isArray(parsed.quotes) ? parsed.quotes.filter((q) => q && q.price != null) : [];
  } catch {
    return [];
  }
};

const TopTicker = () => {
  const [quotes, setQuotes] = useState<Quote[]>(() => readCache());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadOne = async (sym: string, label: string): Promise<Quote> => {
      if (!ENDPOINT) return { symbol: sym, label, price: null, change: null };
      try {
        // Yahoo v7/finance/quote is dead (401) — always use the v8 chart proxy.
        const url = `${ENDPOINT}?symbol=${encodeURIComponent(sym)}&range=5d&interval=1d`;
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: SUPABASE_KEY
            ? {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
              }
            : undefined,
        });
        if (!resp.ok) return { symbol: sym, label, price: null, change: null };
        const j = await resp.json();
        const closes: number[] = Array.isArray(j?.closes) ? j.closes : [];
        const last = closes[closes.length - 1] ?? null;
        const prev = closes[closes.length - 2] ?? null;
        const chg = last != null && prev != null && prev > 0 ? Math.log(last / prev) : null;
        return { symbol: sym, label, price: last, change: chg };
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") {
          return { symbol: sym, label, price: null, change: null };
        }
        return { symbol: sym, label, price: null, change: null };
      }
    };

    (async () => {
      const results = await Promise.all(SYMBOLS.map((s) => loadOne(s.sym, s.label)));
      if (cancelled) return;
      const fresh = results.filter((q) => q.price != null && isFinite(q.price as number));
      if (fresh.length) {
        setQuotes(fresh);
        setReady(true);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), quotes: fresh }));
        } catch {
          /* storage unavailable */
        }
      } else {
        // Keep whatever cache we already show; never render dashes.
        setReady(readCache().length > 0);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const items = useMemo(() => [...quotes, ...quotes], [quotes]); // duplicate for seamless loop

  if (!quotes.length) return null;

  return (
    <div
      className="fixed top-14 left-0 right-0 z-40 h-7 bg-background/95 backdrop-blur border-b border-accent/40 overflow-hidden"
      aria-label="Market ticker"
      role="region"
    >
      <div
        className={cn(
          "flex items-center gap-8 h-full whitespace-nowrap will-change-transform",
          !ready && "opacity-60"
        )}
        style={{ animation: quotes.length ? "ticker 60s linear infinite" : "none" }}
      >

        {items.map((q, i) => {
          const up = (q.change ?? 0) > 0;
          const dn = (q.change ?? 0) < 0;
          return (
            <span key={`${q.symbol}-${i}`} className="inline-flex items-center gap-2 text-[10px] font-mono">
              <span className="text-gold/80 tracking-wider uppercase">{q.label}</span>
              <span className="text-foreground tabular-nums">{fmt(q.price, q.symbol === "BTC-USD" ? 0 : 2)}</span>
              <span
                className={cn(
                  "tabular-nums",
                  up && "text-emerald-400",
                  dn && "text-rose-400",
                  !up && !dn && "text-muted-foreground"
                )}
              >
                {q.change == null ? "—" : `${up ? "▲" : dn ? "▼" : "·"} ${(q.change * 100).toFixed(2)}%`}
              </span>
              <span className="text-accent/50">·</span>
            </span>
          );
        })}
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default TopTicker;
