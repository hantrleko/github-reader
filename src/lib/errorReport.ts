/**
 * Best-effort client-error reporter. Sends structured payloads to the
 * `client-error-log` edge function so they show up in the Lovable Cloud
 * function logs alongside the build version.
 *
 * - Uses `navigator.sendBeacon` when available (fire-and-forget, survives
 *   page unloads) and falls back to `fetch(..., { keepalive: true })`.
 * - De-duplicates identical errors within a 10s window so a runaway loop
 *   cannot flood the log.
 * - Never throws — reporting failures are silently swallowed.
 */
import { BUILD_VERSION } from "./buildVersion";

type ReportInput = {
  type: "chunk-load" | "window-error" | "unhandled-rejection" | "manual";
  message?: string;
  stack?: string;
  failedAsset?: string;
  extra?: Record<string, unknown>;
};

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-error-log`;
const APIKEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const recent = new Map<string, number>();
const DEDUP_MS = 10_000;

// Pull the index.html hash out of the bootstrap script so we can correlate
// a stale tab with a specific deploy. Vite emits `/assets/index-<hash>.js`.
let cachedIndexHash: string | null = null;
const getIndexHtmlHash = (): string => {
  if (cachedIndexHash) return cachedIndexHash;
  if (typeof document === "undefined") return "";
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  for (const s of scripts) {
    const src = (s as HTMLScriptElement).src;
    const m = src.match(/index-([A-Za-z0-9_-]+)\.js/);
    if (m) {
      cachedIndexHash = m[1];
      return cachedIndexHash;
    }
  }
  return "";
};

export function reportClientError(input: ReportInput): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${input.type}::${input.message ?? ""}::${input.failedAsset ?? ""}`;
    const now = Date.now();
    const last = recent.get(key) ?? 0;
    if (now - last < DEDUP_MS) return;
    recent.set(key, now);

    const payload = {
      type: input.type,
      message: input.message ?? "",
      stack: input.stack ?? "",
      failedAsset: input.failedAsset ?? "",
      url: window.location.href,
      route: window.location.pathname + window.location.search,
      buildVersion: BUILD_VERSION,
      indexHtmlHash: getIndexHtmlHash(),
      extra: input.extra ?? null,
    };
    const body = JSON.stringify(payload);

    // sendBeacon ignores custom headers, so the function must allow anon.
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }

    void fetch(ENDPOINT, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: APIKEY,
        Authorization: `Bearer ${APIKEY}`,
      },
      body,
    }).catch(() => {});
  } catch {
    // Swallow — reporting must never break the app.
  }
}