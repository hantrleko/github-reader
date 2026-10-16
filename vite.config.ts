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
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/, /^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true, // new deploy takes over immediately
        runtimeCaching: [
          {
            // HTML — NetworkFirst so a new deploy is picked up immediately
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
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
  build: {
    rollupOptions: {
      output: {
        // Only the listed packages go into vendor chunks — their internal
        // dependencies stay with their real importers. Without this, Rollup
        // merges shared deps (d3, zustand, …) into the vendor chunk, which
        // makes the entry statically import 1.4MB of three/recharts code.
        onlyExplicitManualChunks: true,
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-recharts": ["recharts"],
          "vendor-framer": ["framer-motion"],
          "vendor-katex": ["katex", "react-katex"],
          "vendor-html2img": ["html-to-image"],
          "vendor-three": ["three", "@react-three/fiber", "@react-three/drei"],
          "vendor-jspdf": ["jspdf"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "vendor-query": ["@tanstack/react-query", "@tanstack/query-core"],
          "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
          ],
        },
      },
    },
  },
}));
