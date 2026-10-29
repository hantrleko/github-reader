// Exercise the actual edge wrapper with in-memory cache and upstream substitutes.
import { webcrypto } from "node:crypto";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cache: new Map<string, string>(),
  fetchAny: vi.fn(),
  allowed: true,
}));

vi.mock("../../../supabase/functions/_shared/security.ts", () => ({
  corsHeadersFor: () => ({ "Access-Control-Allow-Origin": "http://localhost:8080" }),
  getClientIp: () => "127.0.0.1",
  checkRateLimit: async () => ({ allowed: state.allowed, retryAfter: 60 }),
  rateLimitResponse: (headers: HeadersInit) => new Response(null, { status: 429, headers }),
  getCached: async (key: string) => state.cache.get(key) ?? null,
  setCached: async (key: string, body: string) => { state.cache.set(key, body); },
}));

vi.mock("../../../supabase/functions/_shared/us.ts", () => ({
  fetchAny: state.fetchAny,
  json: (headers: HeadersInit, body: unknown) => Response.json(body, { headers }),
  fail: (headers: HeadersInit) => Response.json({ error: "Upstream failed" }, { status: 500, headers }),
}));

let serve: (request: Request) => Promise<Response>;
const payload = {
  market: "america", columns: ["name", "close"],
  filters: [{ left: "close", operation: "egreater", right: 10 }],
  sortBy: "close", sortOrder: "desc", range: [0, 10], search: "AAPL",
};
const request = (body: unknown) => new Request("http://localhost:8080/tv-screener", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeAll(async () => {
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("Deno", { serve: (handler: typeof serve) => { serve = handler; } });
  await import("../../../supabase/functions/tv-screener/index.ts");
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  state.cache.clear();
  state.allowed = true;
  state.fetchAny.mockReset();
  state.fetchAny.mockImplementation(async (endpoints: string[], options: RequestInit) =>
    Response.json({ totalCount: 1, data: [{ s: `${endpoints[0]}:${options.body}`, d: ["AAPL", 100] }] }));
});

describe("TradingView screener request cache", () => {
  it.each([
    ["market", { market: "china" }],
    ["columns", { columns: ["close", "name"] }],
    ["filters", { filters: [{ left: "close", operation: "egreater", right: 200 }] }],
    ["sort field", { sortBy: "name" }],
    ["sort order", { sortOrder: "asc" }],
    ["range", { range: [10, 20] }],
    ["search", { search: "MSFT" }],
  ])("does not reuse results when %s changes", async (_label, change) => {
    const first = await serve(request(payload));
    const second = await serve(request({ ...payload, ...change }));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const a = await first.json();
    const b = await second.json();
    expect(b.rows[0].symbol).not.toBe(a.rows[0].symbol);
    expect(state.fetchAny).toHaveBeenCalledTimes(2);
    expect(state.cache.size).toBe(2);
  });

  it("reuses identical requests and preserves body parsing on misses", async () => {
    const first = await serve(request(payload));
    const second = await serve(request(payload));
    expect(await second.json()).toEqual(await first.json());
    expect(second.headers.get("X-Cache")).toBe("HIT");
    expect(state.fetchAny).toHaveBeenCalledTimes(1);
    expect(state.fetchAny.mock.calls[0][0]).toEqual(["https://scanner.tradingview.com/america/scan"]);
  });

  it("never reads the legacy shared POST cache entry", async () => {
    state.cache.set("cache:tv-screener:", JSON.stringify({ market: "china" }));
    expect((await (await serve(request(payload))).json()).market).toBe("america");
    expect(state.fetchAny).toHaveBeenCalledTimes(1);
  });

  it("keeps GET query requests isolated", async () => {
    const a = await serve(new Request("http://localhost:8080/tv-screener?market=america"));
    const b = await serve(new Request("http://localhost:8080/tv-screener?market=china"));
    expect((await a.json()).market).toBe("america");
    expect((await b.json()).market).toBe("china");
    expect(state.fetchAny).toHaveBeenCalledTimes(2);
  });

  it("does not cache unsuccessful upstream responses", async () => {
    state.fetchAny.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    expect((await serve(request(payload))).status).toBe(500);
    expect(state.cache.size).toBe(0);
    expect((await serve(request(payload))).status).toBe(200);
  });

  it("checks rate limits even for cached results", async () => {
    await serve(request(payload));
    state.allowed = false;
    expect((await serve(request(payload))).status).toBe(429);
    expect(state.fetchAny).toHaveBeenCalledTimes(1);
  });
});