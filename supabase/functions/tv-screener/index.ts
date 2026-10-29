import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";
// V6.4 · TradingView Screener proxy
// Replicates the public HTTP calls performed by the Python `tvscreener`
// library so the browser can query TradingView's scanner without an API key.
// Docs reference: https://github.com/deepentropy/tvscreener
import { json, fail, fetchAny } from "../_shared/us.ts";
import { screenerCacheKey } from "./cacheKey.ts";

const TV_UA = "EF Lab research tool (contact: research@eugenefinance.tech)";

export type TvFilter = {
  left: string;
  operation: string;
  right?: string | number | string[] | number[];
};

export type TvScreenerRequest = {
  market: string;
  columns?: string[];
  filters?: TvFilter[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  range?: [number, number];
  search?: string;
};

const MARKETS = new Set([
  "america", "forex", "crypto", "bond", "futures",
  "uk", "germany", "france", "spain", "italy",
  "canada", "brazil", "argentina", "mexico",
  "india", "japan", "south_korea", "taiwan", "hongkong", "china",
  "australia", "new_zealand", "singapore", "malaysia", "thailand",
  "vietnam", "indonesia", "philippines", "turkey", "russia",
  "switzerland", "netherlands", "belgium", "austria", "poland",
  "israel", "saudi_arabia", "uae", "south_africa", "egypt",
]);

const DEFAULT_COLUMNS: Record<string, string[]> = {
  america: ["name", "close", "change", "volume", "market_cap_basic", "price_earnings_ttm", "number_of_employees"],
  forex: ["name", "close", "change", "bid", "ask", "volume", "recommendation"],
  crypto: ["name", "close", "change", "volume", "market_cap_basic", "relative_volume_10d_calc"],
  bond: ["name", "close", "change", "coupon", "yield", "maturity_date"],
  futures: ["name", "close", "change", "volume", "market_cap_basic"],
};

function sanitizeMarket(m?: string): string {
  const v = (m || "america").toLowerCase().replace(/[^a-z_]/g, "");
  return MARKETS.has(v) ? v : "america";
}

function sanitizeColumns(cols?: string[], market = "america"): string[] {
  if (!Array.isArray(cols) || cols.length === 0) return DEFAULT_COLUMNS[market] || DEFAULT_COLUMNS.america;
  return cols.map((c) => c.replace(/[^a-z0-9_.]/gi, "")).filter(Boolean);
}

function sanitizeFilters(filters?: TvFilter[]): TvFilter[] {
  if (!Array.isArray(filters)) return [];
  return filters
    .filter((f) => f && typeof f.left === "string" && typeof f.operation === "string")
    .map((f) => ({ left: f.left.replace(/[^a-z0-9_.]/gi, ""), operation: f.operation, right: f.right }));
}

function buildBody(req: TvScreenerRequest) {
  const market = sanitizeMarket(req.market);
  const columns = sanitizeColumns(req.columns, market);
  const filters = sanitizeFilters(req.filters);
  const sortBy = (req.sortBy || columns[0] || "market_cap_basic").replace(/[^a-z0-9_.]/gi, "");
  const sortOrder = req.sortOrder === "asc" ? "asc" : "desc";
  const range: [number, number] = [
    Math.max(0, Math.min(req.range?.[0] ?? 0, 5000)),
    Math.max(0, Math.min(req.range?.[1] ?? 150, 5000)),
  ];

  const body: Record<string, unknown> = {
    filter: filters,
    options: { lang: "en" },
    markets: market === "forex" ? ["forex"] : market === "crypto" ? ["crypto"] : [market],
    symbols: { query: { types: [] }, tickers: [] },
    columns,
    sort: { sortBy, sortOrder },
    range,
  };

  if (req.search?.trim()) {
    const q = req.search.trim().toUpperCase();
    (body.symbols as any).query.types = [];
    (body.symbols as any).tickers = [];
    body.filter = [
      ...filters,
      { left: "name", operation: "match", right: q },
    ];
  }

  return { market, columns, body };
}

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    let payload: TvScreenerRequest;
    if (req.method === "POST") {
      payload = await req.json();
    } else {
      const url = new URL(req.url);
      payload = {
        market: url.searchParams.get("market") || "america",
        columns: url.searchParams.get("columns")?.split(","),
        sortBy: url.searchParams.get("sortBy") || undefined,
        sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc") || "desc",
        search: url.searchParams.get("search") || undefined,
      };
    }

    const { market, columns, body } = buildBody(payload);
    const endpoint = `https://scanner.tradingview.com/${market}/scan`;

    const r = await fetchAny(
      [endpoint],
      {
        method: "POST",
        headers: {
          "User-Agent": TV_UA,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      },
      2,
    );

    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`TradingView scanner returned ${r.status}: ${txt.slice(0, 200)}`);
    }

    const j = await r.json();
    const rows = ((j?.data || []) as any[]).map((d) => {
      const symbol = d.s;
      const values = d.d || [];
      const row: Record<string, unknown> = { symbol };
      columns.forEach((col, i) => {
        row[col] = values[i] ?? null;
      });
      return row;
    });

    return json(corsHeaders, {
      market,
      columns,
      sort: body.sort,
      range: body.range,
      total: typeof j.totalCount === "number" ? j.totalCount : rows.length,
      n: rows.length,
      rows,
      source: "TradingView Screener (public scanner endpoint)",
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return fail(corsHeaders, e);
  }
}

const CACHE_TTL_SEC = 60;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:tv-screener:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = await screenerCacheKey(req);
  const cached = await getCached(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  const resp = await handler(req, corsHeaders);
  if (resp.ok) {
    const body = await resp.clone().text();
    setCached(cacheKey, body, CACHE_TTL_SEC).catch(() => {});
  }
  return resp;
});
