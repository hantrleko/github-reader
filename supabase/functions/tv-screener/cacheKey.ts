/** Public scanner results may be shared only for identical requests. */
export async function screenerCacheKey(req: Request): Promise<string> {
  // Clone so the handler can still parse the original POST body on a cache miss.
  const body = req.method === "POST" ? await req.clone().text() : "";
  const input = JSON.stringify([req.method, new URL(req.url).search, body]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  // New namespace deliberately ignores entries written by the old query-only key.
  return `cache:tv-screener:v2:${hash}`;
}