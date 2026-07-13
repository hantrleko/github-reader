import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { checkBuildVersion } from "./lib/buildVersion";
import { setupServiceWorker } from "./lib/registerSW";
import { prewarmSearchIndex } from "./lib/searchIndex";

// Fire-and-forget: if a new deploy is detected, this clears caches and reloads.
checkBuildVersion();
// Register service worker (skipped automatically in iframe/preview).
setupServiceWorker();
// Pre-build the search index during idle time so ⌘K opens instantly.
prewarmSearchIndex();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
