/**
 * Build version bookkeeping.
 * - `__BUILD_VERSION__` is injected by Vite at build time (see vite.config.ts)
 *   and also written into index.html as <meta name="build-version">.
 * - We only record the version that is running. Detecting a newer deploy and
 *   offering a refresh is src/lib/appUpdate.ts' job; this module never reloads
 *   the page and never deletes caches (a silent reload loses lab inputs and a
 *   pinned baseline; a blanket cache wipe would hit data the app doesn't own).
 */
import { safeLocalStorage, getStorageItem, setStorageItem } from "@/lib/storage";

declare const __BUILD_VERSION__: string;

const STORAGE_KEY = "app-build-version";

export const BUILD_VERSION: string =
  typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev";

/** Returns the previously recorded build id (null on first visit). */
export function checkBuildVersion(): string | null {
  if (typeof window === "undefined") return null;
  (window as unknown as { __BUILD_VERSION__: string }).__BUILD_VERSION__ = BUILD_VERSION;
  const previous = getStorageItem(safeLocalStorage, STORAGE_KEY, null);
  if (previous !== BUILD_VERSION) setStorageItem(safeLocalStorage, STORAGE_KEY, BUILD_VERSION);
  try {
    // Leftover flag from the old silent-reload logic.
    sessionStorage.removeItem("__app_version_reloaded__");
  } catch {
    /* noop */
  }
  return previous;
}
