/*
# Add market_quotes_cache and watchlist tables

## Summary
Two new tables to support the free-data investment workflow:

1. **market_quotes_cache** — shared server-side cache for Yahoo Finance quote responses,
   keyed by (symbol, range). The market-quotes Edge Function writes to this table using the
   service role key (which bypasses RLS). All users transparently share the cache, cutting
   duplicate Yahoo Finance requests and reducing rate-limit exposure.

2. **watchlist** — per-user list of ticker symbols to track. Owner-scoped: each authenticated
   user can only see and manage their own entries.

## New Tables

### market_quotes_cache
- `symbol` text NOT NULL — uppercase ticker, e.g. "AAPL", "^GSPC", "BTC-USD"
- `range` text NOT NULL — Yahoo Finance range string, e.g. "1y", "5d"
- `payload` jsonb NOT NULL — full JSON response body to return on a cache hit
- `cached_at` timestamptz DEFAULT now() — timestamp of last cache write
- PRIMARY KEY (symbol, range) — composite key enables upsert by symbol+range pair

### watchlist
- `id` uuid PRIMARY KEY
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner (authenticated user); default ensures
  `.insert({ symbol })` works without the client passing user_id explicitly
- `symbol` text NOT NULL — uppercase ticker symbol
- `label` text — optional user-supplied display label
- `created_at` timestamptz DEFAULT now()
- UNIQUE (user_id, symbol) — prevents duplicate entries per user

## Security

### market_quotes_cache
- RLS enabled.
- SELECT: anon + authenticated (any visitor can read cached data).
- INSERT/UPDATE/DELETE: **no** client-facing policies — only the service role
  (used by the Edge Function) can write. This prevents clients from polluting the cache.

### watchlist
- RLS enabled.
- Owner-scoped for authenticated users: SELECT / INSERT / DELETE.
- No UPDATE policy — entries are created and deleted, never edited.
- `user_id DEFAULT auth.uid()` ensures the INSERT policy `WITH CHECK (auth.uid() = user_id)`
  is satisfied even when the client omits user_id.
*/

-- ─────────────────────────────────────────────
-- market_quotes_cache
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_quotes_cache (
  symbol     text NOT NULL,
  range      text NOT NULL,
  payload    jsonb NOT NULL,
  cached_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, range)
);

ALTER TABLE market_quotes_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cache_select_anon" ON market_quotes_cache;
CREATE POLICY "cache_select_anon" ON market_quotes_cache
  FOR SELECT TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────
-- watchlist
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol     text NOT NULL,
  label      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "watchlist_select_own" ON watchlist;
CREATE POLICY "watchlist_select_own" ON watchlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "watchlist_insert_own" ON watchlist;
CREATE POLICY "watchlist_insert_own" ON watchlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "watchlist_delete_own" ON watchlist;
CREATE POLICY "watchlist_delete_own" ON watchlist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
