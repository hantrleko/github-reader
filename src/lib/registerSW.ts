/**
 * Service Worker registration with strict guards.
 *
 * NEVER registers when:
 *  - running in an iframe (Lovable preview)
 *  - on *.lovableproject.com / id-preview--*.lovable.app / preview--*.lovable.app
 *  - hostname is localhost / 127.0.0.1
 *
 * In those environments we proactively unregister any pre-existing SW so a
 * stale worker from a prior visit can't lock the preview to old assets.
 */
import { toast } from "sonner";

const isPreviewHost = () => {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("preview--") ||
    h.endsWith("lovableproject.com") ||
    h.endsWith("lovableproject-dev.com") ||
    h.endsWith("lovable.app") || // Lovable preview / project domains
    h === "localhost" ||
    h === "127.0.0.1"
  );
};

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export async function setupServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Unregister any SW in preview / iframe contexts.
  if (isPreviewHost() || isInIframe()) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* noop */
    }
    return;
  }

  // Dynamic import so vite-plugin-pwa's virtual module is only loaded in prod.
  try {
    const { registerSW } = await import("virtual:pwa-register");
    const updateSW = registerSW({
      onNeedRefresh() {
        toast.message("新版本就绪", {
          description: "已在后台下载,刷新页面以使用最新版本。",
          duration: Infinity,
          action: {
            label: "立即刷新",
            onClick: () => updateSW(true),
          },
        });
      },
      onOfflineReady() {
        toast.success("离线模式就绪", {
          description: "核心计算器已缓存,无网络时仍可使用。",
          duration: 4000,
        });
      },
    });
  } catch {
    /* PWA module unavailable (dev build) — ignore */
  }
}