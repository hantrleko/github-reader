import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const BUILD_VERSION = process.env.BUILD_VERSION || String(Date.now());

// Auto-derive app version from package.json so Navbar / Footer / Hero / Changelog
// stay in sync without manual edits. "4.9.0" -> tag "V4.9".
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version?: string };
const APP_VERSION = pkg.version || "0.0.0";
const [major = "0", minor = "0"] = APP_VERSION.split(".");
const APP_VERSION_TAG = `V${major}.${minor}`;
const BUILD_TIME = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_VERSION_TAG__: JSON.stringify(APP_VERSION_TAG),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // we register manually with iframe/preview guard
      devOptions: { enabled: false },
      manifest: false, // we ship our own /public/manifest.json
      workbox: {
        // Page visits always ask the network for index.html, so a new deploy is
        // seen on the very next visit even while an older worker still controls
        // the tab. No NavigationRoute (navigateFallback) and no directory-index
        // mapping: both answered navigations from the precached, possibly old
        // index.html before the runtime rule below could run. The precached
        // shell is only the offline fallback, and it always matches the assets
        // precached by the same worker.
        navigateFallback: null,
        directoryIndex: "",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // New workers still take over at once (visitors on older workers depend
        // on it); the page never reloads by itself — src/lib/registerSW.ts asks.
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" && !/^\/(~oauth|auth|api)(\/|$)/.test(url.pathname),
            handler: "NetworkOnly",
            options: {
              precacheFallback: { fallbackURL: "/index.html" },
            },
          },
          {
            // Google Fonts CSS
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "gfonts-css" },
          },
          {
            // Google Fonts files
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "gfonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // App images
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
    {
      name: "inject-build-version",
      transformIndexHtml(html: string) {
        return html
          .replace("%BUILD_VERSION%", BUILD_VERSION)
          .replace("%BUILD_VERSION%", BUILD_VERSION);
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  // Let Rollup split the dependency graph automatically. Forced vendor groups
  // can create circular initialization paths through React's CommonJS helpers
  // (notably react-i18next's top-level createContext call). Dynamic imports still
  // keep route-only tools and their heavy dependencies lazy-loaded.
}));
