import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { checkBuildVersion } from "./lib/buildVersion";
import { setupServiceWorker } from "./lib/registerSW";

// Fire-and-forget: if a new deploy is detected, this clears caches and reloads.
checkBuildVersion();
// Register service worker (skipped automatically in iframe/preview).
setupServiceWorker();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
