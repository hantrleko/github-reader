import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { checkBuildVersion } from "./lib/buildVersion";
import { setupServiceWorker } from "./lib/registerSW";
import { prewarmSearchIndex } from "./lib/searchIndex";

const rootEl = document.getElementById("root");

function showBootError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err ?? "boot failure");
  console.error("[boot]", err);
  if (!rootEl) return;
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#064e3b;color:#f5f0e0;font-family:system-ui,sans-serif">
      <div style="max-width:28rem">
        <p style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.7;margin:0 0 8px">Boot Error</p>
        <h1 style="font-size:1.5rem;margin:0 0 12px">应用启动失败</h1>
        <p style="font-size:14px;opacity:.8;line-height:1.5;margin:0 0 16px">请刷新页面。若持续出现，请清除本站缓存后重试。</p>
        <pre style="font-size:11px;white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,.25);padding:12px;border-radius:8px;margin:0 0 16px">${msg.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string))}</pre>
        <button onclick="location.reload()" style="background:#c9a227;color:#064e3b;border:0;padding:10px 16px;font-weight:700;cursor:pointer;font-size:12px;letter-spacing:.08em;text-transform:uppercase">刷新页面</button>
      </div>
    </div>
  `;
}

// Fire-and-forget boot helpers — never let these block or crash first paint.
try {
  void checkBuildVersion();
} catch (e) {
  console.warn("[boot] checkBuildVersion", e);
}
try {
  void setupServiceWorker();
} catch (e) {
  console.warn("[boot] setupServiceWorker", e);
}
try {
  prewarmSearchIndex();
} catch (e) {
  console.warn("[boot] prewarmSearchIndex", e);
}

try {
  if (!rootEl) throw new Error("#root element missing from index.html");
  createRoot(rootEl).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} catch (e) {
  showBootError(e);
}
