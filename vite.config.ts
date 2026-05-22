import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const BUILD_VERSION = process.env.BUILD_VERSION || String(Date.now());

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
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
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
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-recharts": ["recharts"],
          "vendor-framer": ["framer-motion"],
          "vendor-katex": ["katex", "react-katex"],
          "vendor-html2img": ["html-to-image"],
          "vendor-query": ["@tanstack/react-query", "@tanstack/query-core"],
          "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
        },
      },
    },
  },
}));
