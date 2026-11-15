import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { checkBuildVersion } from "./lib/buildVersion";
import { setupServiceWorker } from "./lib/registerSW";

// Records the running build id; never reloads or clears caches.
checkBuildVersion();
// Register service worker (skipped in dev/iframe/preview). New versions are
// offered through a refresh prompt, never applied by a silent reload.
void setupServiceWorker();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
