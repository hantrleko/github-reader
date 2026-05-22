/**
 * Build version reconciliation.
 * - `__BUILD_VERSION__` is injected by Vite at build time (see vite.config.ts).
 * - On boot we compare it with the version stored in localStorage.
 * - If it changed (new deploy), we clear Cache Storage + unregister service
 *   workers and reload once so the user is never stuck on stale assets.
 */
declare const __BUILD_VERSION__: string;

const STORAGE_KEY = "app-build-version";
const RELOAD_FLAG = "__app_version_reloaded__";

export const BUILD_VERSION: string =
  typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev";

export async function checkBuildVersion(): Promise<void> {
  if (typeof window === "undefined") return;

  // Always expose for debugging.
  (window as unknown as { __BUILD_VERSION__: string }).__BUILD_VERSION__ =
    BUILD_VERSION;

  const previous = localStorage.getItem(STORAGE_KEY);

  if (!previous) {
    localStorage.setItem(STORAGE_KEY, BUILD_VERSION);
    return;
  }

  if (previous === BUILD_VERSION) return;

  // Guard against reload loops if the cache clear didn't take effect.
  if (sessionStorage.getItem(RELOAD_FLAG) === BUILD_VERSION) {
    localStorage.setItem(STORAGE_KEY, BUILD_VERSION);
    return;
  }
  sessionStorage.setItem(RELOAD_FLAG, BUILD_VERSION);

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // Ignore — proceed to reload anyway.
  }

  localStorage.setItem(STORAGE_KEY, BUILD_VERSION);
  // Bypass HTTP cache.
  window.location.reload();
}