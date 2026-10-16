// Shared security helpers for edge functions:
// CORS origin whitelist, IP/user rate limiting (DB-backed), and response cache.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS: RegExp[] = [
  /^https:\/\/(www\.)?eugenefinance\.tech$/,
  /^https:\/\/[a-z0-9-]+(--[a-z0-9-]+)?\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.some((r) => r.test(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://eugenefinance.tech",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0].trim() || "unknown";
}

// deno-lint-ignore no-explicit-any
let _admin: any = null;
export function adminClient() {
  if (!_admin) {
    _admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _admin;
}

/**
 * DB-backed fixed-window rate limit. Fails open if the counter is unavailable
 * so an outage of the limiter never takes the data API down.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  try {
    const { data, error } = await adminClient().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_sec: windowSec,
    });
    if (error || !data) return { allowed: true, retryAfter: 0 };
    return { allowed: !!data.allowed, retryAfter: Number(data.retry_after) || 0 };
  } catch {
    return { allowed: true, retryAfter: 0 };
  }
}

export function rateLimitResponse(
  cors: Record<string, string>,
  retryAfter: number,
): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests", retryAfter }),
    {
      status: 429,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    },
  );
}

/** Cache read: returns the stored payload string, or null on miss/expiry/error. */
export async function getCached(key: string): Promise<string | null> {
  try {
    const { data, error } = await adminClient()
      .from("edge_cache")
      .select("payload, expires_at")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() <= Date.now()) return null;
    return typeof data.payload === "string" ? data.payload : JSON.stringify(data.payload);
  } catch {
    return null;
  }
}

/** Cache write (fire-and-forget safe). */
export async function setCached(
  key: string,
  payload: string,
  ttlSec: number,
): Promise<void> {
  try {
    await adminClient().from("edge_cache").upsert({
      key,
      payload,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    });
  } catch {
    /* cache write failures are non-fatal */
  }
}
