/**
 * Service Worker registration with strict guards + automatic forced update.
 *
 * Never registers in dev, iframes, Lovable preview hosts, localhost, or with ?sw=off.
 * In those contexts any existing SW is unregistered.
 *
 * In production: checks for a new deploy on load, every 30 min and whenever the
 * tab becomes visible; a new SW activates immediately (skipWaiting) and the page
 * reloads once so visitors never stay on an old version.
 */
const isBlockedHost = () => {
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
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

async function unregisterAll() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* noop */
  }
}

export async function setupServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const swOff = new URLSearchParams(window.location.search).get("sw") === "off";
  if (!import.meta.env.PROD || isBlockedHost() || isInIframe() || swOff) {
    await unregisterAll();
    return;
  }

  // Reload once when a new SW takes control.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  try {
    const { registerSW } = await import("virtual:pwa-register");
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true);
      },
      onRegistered(reg) {
        if (!reg) return;
        const check = () => reg.update().catch(() => {});
        check();
        setInterval(check, 30 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
      },
    });
  } catch {
    /* PWA module unavailable — ignore */
  }
}
