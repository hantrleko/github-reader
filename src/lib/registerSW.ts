/**
 * Service Worker registration with strict guards and a user-controlled update.
 *
 * Never registers in dev, iframes, Lovable preview hosts, localhost, or with
 * ?sw=off; there, this app's own worker (/sw.js) is unregistered.
 *
 * In production: checks for a new deploy on load, every 30 min and whenever the
 * tab becomes visible. A new worker may take over in the background, but the
 * page is never reloaded automatically — a reload would drop lab inputs and a
 * pinned baseline. If the running page is older than the server's build, the
 * visitor gets a refresh prompt (see src/lib/appUpdate.ts, UpdatePrompt).
 */
import { BUILD_VERSION } from "@/lib/buildVersion";
import {
  UPDATE_EVENT,
  createUpdateController,
  fetchServerBuild,
  setActiveUpdateController,
  type ServerBuildStatus,
  type UpdateController,
} from "@/lib/appUpdate";

const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const PREVIEW_DOMAINS = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];

export const isBlockedHost = (hostname: string): boolean => {
  const h = hostname.toLowerCase();
  const label = h.split(".")[0] ?? "";
  const onPreviewDomain = PREVIEW_DOMAINS.some((d) => h.endsWith(d));
  return (
    (onPreviewDomain && (PREVIEW_LABEL.test(label) || /^project--.+-dev$/.test(label))) ||
    h === "lovableproject.com" || h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev") ||
    h === "localhost" || h === "127.0.0.1"
  );
};

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/** Unregister only this app's worker, never unrelated (e.g. messaging) workers. */
async function unregisterAppWorker() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = (r.active ?? r.waiting ?? r.installing)?.scriptURL ?? "";
          return !url || /\/sw\.js(\?|$)/.test(url);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

/** Runtime cache from the pre-7.6.2 worker that could hold stale HTML. Ours. */
export const LEGACY_APP_CACHES = ["html"];

async function deleteLegacyAppCaches() {
  try {
    if (!("caches" in window)) return;
    await Promise.all(LEGACY_APP_CACHES.map((name) => caches.delete(name)));
  } catch {
    /* noop */
  }
}

type RegisterFn = (options: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onNeedReload?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
}) => (reloadPage?: boolean) => Promise<void>;

export interface SetupDeps {
  isProd?: boolean;
  location?: Pick<Location, "hostname" | "search" | "reload">;
  inIframe?: boolean;
  loadRegister?: () => Promise<{ registerSW: RegisterFn }>;
  probe?: () => Promise<ServerBuildStatus>;
  notify?: (info: { server: string }) => void;
}

export async function setupServiceWorker(deps: SetupDeps = {}): Promise<UpdateController | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  const loc = deps.location ?? window.location;
  const isProd = deps.isProd ?? import.meta.env.PROD;
  const swOff = new URLSearchParams(loc.search).get("sw") === "off";
  if (!isProd || isBlockedHost(loc.hostname) || (deps.inIframe ?? isInIframe()) || swOff) {
    await unregisterAppWorker();
    return null;
  }

  const controller = createUpdateController({
    running: BUILD_VERSION,
    probe: deps.probe ?? (() => fetchServerBuild(BUILD_VERSION)),
    notify:
      deps.notify ??
      ((info) => window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: info }))),
    reload: () => loc.reload(),
  });
  setActiveUpdateController(controller);
  void deleteLegacyAppCaches();

  // A new worker took control (this tab or another one). Never reload here:
  // ask only if this page is now older than the server.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    void controller.onWorkerUpdated();
  });

  try {
    const { registerSW } = await (deps.loadRegister ?? (() => import("virtual:pwa-register") as Promise<{ registerSW: RegisterFn }>))();
    registerSW({
      immediate: true,
      // Without this the plugin calls window.location.reload() itself.
      onNeedReload() {
        void controller.onWorkerUpdated();
      },
      onNeedRefresh() {
        void controller.onWorkerUpdated();
      },
      onRegistered(reg) {
        if (!reg) return;
        const check = () => {
          reg.update().catch(() => {});
          void controller.check();
        };
        check();
        setInterval(check, 30 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
      },
    });
  } catch {
    /* PWA module unavailable — still offer the version check */
    void controller.check();
  }
  return controller;
}
