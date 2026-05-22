import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  n == null || !isFinite(n) ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

const TopTicker = () => {
  const [quotes, setQuotes] = useState<Quote[]>(
    SYMBOLS.map((s) => ({ symbol: s.sym, label: s.label, price: null, change: null }))
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOne = async (sym: string, label: string): Promise<Quote> => {
      try {
        const { data, error } = await supabase.functions.invoke("market-quotes", {
          body: undefined,
          headers: {},
          // The function accepts query params via URL; invoke doesn't expose
          // them directly, so fall back to a direct fetch.
        });
        // Direct fetch path:
        void data; void error;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-quotes?symbol=${encodeURIComponent(
          sym
        )}&range=5d&interval=1d`;
        const resp = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}`,
          },
        });
        if (!resp.ok) throw new Error(String(resp.status));
        const j = await resp.json();
        const closes: number[] = j.closes || [];
        const last = closes[closes.length - 1] ?? null;
        const prev = closes[closes.length - 2] ?? null;
        const chg = last != null && prev != null ? Math.log(last / prev) : null;
        return { symbol: sym, label, price: last, change: chg };
      } catch {
        return { symbol: sym, label, price: null, change: null };
      }
    };

    (async () => {
      const results = await Promise.all(SYMBOLS.map((s) => loadOne(s.sym, s.label)));
      if (!cancelled) {
        setQuotes(results);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const items = [...quotes, ...quotes]; // duplicate for seamless loop

  return (
    <div
      className="fixed top-14 left-0 right-0 z-40 h-7 bg-background/95 backdrop-blur border-b border-accent/40 overflow-hidden"
      aria-label="Market ticker"
      role="region"
    >
      <div
        className={cn(
          "flex items-center gap-8 h-full whitespace-nowrap will-change-transform",
          ready ? "animate-[ticker_60s_linear_infinite]" : "opacity-60"
        )}
        style={{ animationName: "ticker" }}
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