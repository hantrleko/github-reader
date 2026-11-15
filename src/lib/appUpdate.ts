/**
 * Update detection without silent reloads.
 *
 * The page never reloads by itself: a reload throws away lab inputs and any
 * pinned baseline (both live in component state). When a newer deploy is
 * detected we announce it once; the visitor decides when to refresh.
 *
 * "Newer" is decided by comparing the running build id (__BUILD_VERSION__) with
 * the build id in the server's current index.html (<meta name="build-version">),
 * fetched with a cache-busting query so neither the HTTP cache nor the service
 * worker precache can answer it.
 */

export type ServerBuildStatus =
  | { status: "same"; server: string }
  | { status: "newer"; server: string }
  | { status: "unknown" };

export const UPDATE_EVENT = "app:update-available";

export function parseBuildVersion(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']build-version["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']build-version["']/i);
  const v = m?.[1]?.trim();
  if (!v || v.includes("%")) return null;
  return v;
}

export async function fetchServerBuild(
  running: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ServerBuildStatus> {
  try {
    const res = await fetchImpl(`/index.html?build-probe=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return { status: "unknown" };
    const server = parseBuildVersion(await res.text());
    if (!server) return { status: "unknown" };
    return server === running ? { status: "same", server } : { status: "newer", server };
  } catch {
    // Offline or blocked: we simply don't know. Never treat this as "new version".
    return { status: "unknown" };
  }
}

export interface UpdateControllerDeps {
  running: string;
  probe: () => Promise<ServerBuildStatus>;
  /** Show the refresh prompt (called at most once per detected build). */
  notify: (info: { server: string }) => void;
  /** Only ever called from accept(), i.e. after the visitor clicked Refresh. */
  reload: () => void;
}

export function createUpdateController(deps: UpdateControllerDeps) {
  let announced: string | null = null;
  let checking: Promise<ServerBuildStatus> | null = null;

  const check = async (): Promise<ServerBuildStatus> => {
    if (!checking) {
      checking = deps.probe().finally(() => {
        checking = null;
      });
    }
    const result = await checking;
    if (result.status === "newer" && announced !== result.server) {
      announced = result.server;
      deps.notify({ server: result.server });
    }
    return result;
  };

  return {
    check,
    /** A new service worker took control. Prompt only if this page is stale. */
    onWorkerUpdated: () => check(),
    accept: () => deps.reload(),
    get announced() {
      return announced;
    },
  };
}

export type UpdateController = ReturnType<typeof createUpdateController>;

let active: UpdateController | null = null;
export const setActiveUpdateController = (c: UpdateController | null) => {
  active = c;
};
export const acceptUpdate = () => {
  if (active) active.accept();
  else if (typeof window !== "undefined") window.location.reload();
};
