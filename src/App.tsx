import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CommandPalette from "@/components/CommandPalette";
import Onboarding from "@/components/Onboarding";
import OfflineBanner from "@/components/OfflineBanner";
import { AuthProvider } from "@/hooks/useAuth";
import { toast } from "sonner";
import { reportClientError } from "@/lib/errorReport";

/**
 * Reload-once recovery for stale chunk hashes after a new deploy.
 * When the browser holds an old index.html, dynamic imports point at
 * filenames that no longer exist and throw "error loading dynamically
 * imported module". A single reload fetches fresh hashes.
 */
const CHUNK_ERR_RE =
  /error loading dynamically imported module|dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i;

let chunkToastShown = false;
const notifyChunkError = () => {
  if (chunkToastShown || typeof window === "undefined") return;
  chunkToastShown = true;
  toast.error("检测到新版本", {
    description: "页面资源已更新，请刷新以加载最新内容。",
    duration: Infinity,
    action: {
      label: "立即刷新",
      onClick: () => window.location.reload(),
    },
    onDismiss: () => {
      chunkToastShown = false;
    },
  });
};

const lazyWithRetry = <T,>(factory: () => Promise<T>) =>
  lazy(() =>
    (factory() as Promise<any>).catch((err) => {
      const msg = String(err?.message ?? err ?? "");
      if (CHUNK_ERR_RE.test(msg)) {
        reportClientError({
          type: "chunk-load",
          message: msg,
          stack: (err as Error)?.stack,
          failedAsset: (err as { url?: string })?.url,
        });
        notifyChunkError();
        // Hold Suspense indefinitely so the broken route doesn't flash an
        // error boundary — the user controls when to reload.
        return new Promise(() => {});
      }
      reportClientError({
        type: "manual",
        message: msg,
        stack: (err as Error)?.stack,
        extra: { source: "lazyWithRetry" },
      });
      throw err;
    })
  );

if (typeof window !== "undefined") {
  // Catch chunk errors that surface outside of React.lazy (e.g. prefetch).
  window.addEventListener("error", (e) => {
    const msg = String(e?.message ?? "");
    const failedAsset =
      (e?.target as HTMLScriptElement | HTMLLinkElement | undefined)?.tagName
        ? ((e.target as HTMLScriptElement).src ||
            (e.target as HTMLLinkElement).href ||
            "")
        : "";
    if (CHUNK_ERR_RE.test(msg) || /\.(js|css|mjs)(\?|$)/.test(failedAsset)) {
      reportClientError({
        type: "chunk-load",
        message: msg || "asset load error",
        stack: (e?.error as Error)?.stack,
        failedAsset,
      });
      notifyChunkError();
    } else if (msg) {
      reportClientError({
        type: "window-error",
        message: msg,
        stack: (e?.error as Error)?.stack,
      });
    }
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent)?.reason;
    const msg = String(reason?.message ?? reason ?? "");
    if (CHUNK_ERR_RE.test(msg)) {
      reportClientError({
        type: "chunk-load",
        message: msg,
        stack: (reason as Error)?.stack,
      });
      notifyChunkError();
    } else if (msg) {
      reportClientError({
        type: "unhandled-rejection",
        message: msg,
        stack: (reason as Error)?.stack,
      });
    }
  });
}

const Index = lazyWithRetry(() => import("./pages/Index.tsx"));
const TopicDetail = lazyWithRetry(() => import("./pages/TopicDetail.tsx"));
const ChangelogPage = lazyWithRetry(() => import("./pages/ChangelogPage.tsx"));
const ToolsCatalog = lazyWithRetry(() => import("./pages/ToolsCatalog.tsx"));
const Glossary = lazyWithRetry(() => import("./pages/Glossary.tsx"));
const GithubExplorer = lazyWithRetry(() => import("./pages/GithubExplorer.tsx"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth.tsx"));
const Strategies = lazyWithRetry(() => import("./pages/Strategies.tsx"));
const Papers = lazyWithRetry(() => import("./pages/Papers.tsx"));
const Notebook = lazyWithRetry(() => import("./pages/Notebook.tsx"));
const NotebookTemplates = lazyWithRetry(() => import("./pages/NotebookTemplates.tsx"));
const PublicProfile = lazyWithRetry(() => import("./pages/PublicProfile.tsx"));
const Account = lazyWithRetry(() => import("./pages/Account.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/topic/:topicId" element={<TopicDetail />} />
                <Route path="/changelog" element={<ChangelogPage />} />
                <Route path="/tools" element={<ToolsCatalog />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="/github" element={<GithubExplorer />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/strategies" element={<Strategies />} />
                <Route path="/papers" element={<Papers />} />
                <Route path="/notebook" element={<Notebook />} />
                <Route path="/notebook/templates" element={<NotebookTemplates />} />
                <Route path="/u/:username" element={<PublicProfile />} />
                <Route path="/account" element={<Account />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <CommandPalette />
            <Onboarding />
            <OfflineBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
