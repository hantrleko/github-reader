import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CommandPalette from "@/components/CommandPalette";
import Onboarding from "@/components/Onboarding";
import OfflineBanner from "@/components/OfflineBanner";
import ScrollManager from "@/components/ScrollManager";
import { AuthProvider } from "@/hooks/useAuth";
import { reportClientError } from "@/lib/errorReport";
import { CHUNK_ERR_RE, retryableLazy } from "@/lib/lazyLoad";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import LoadingHint from "@/components/LoadingHint";
import UpdatePrompt from "@/components/UpdatePrompt";

/**
 * Route-level lazy pages. A failed download is reported and shown by the
 * route error boundary below with an explanation and a Retry button; it never
 * hangs Suspense and never reloads the page on its own.
 */
const lazyWithRetry = <T extends Parameters<typeof retryableLazy>[0]>(factory: T) =>
  retryableLazy(factory, (err) => {
    const msg = String((err as Error)?.message ?? err ?? "");
    reportClientError({
      type: CHUNK_ERR_RE.test(msg) ? "chunk-load" : "manual",
      message: msg,
      stack: (err as Error)?.stack,
      failedAsset: (err as { url?: string })?.url,
      extra: { source: "lazyWithRetry", online: navigator.onLine },
    });
  });

if (typeof window !== "undefined") {
  // Report asset errors that surface outside of React.lazy (e.g. prefetch).
  // No "new version" toast here: a failed download is usually the network,
  // and real new versions are announced by UpdatePrompt after a version check.
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
    } else if (msg) {
      reportClientError({
        type: "window-error",
        message: msg,
        stack: (e?.error as Error)?.stack,
      });
    }
  }, true);
  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent)?.reason;
    const msg = String(reason?.message ?? reason ?? "");
    if (!msg) return;
    reportClientError({
      type: CHUNK_ERR_RE.test(msg) ? "chunk-load" : "unhandled-rejection",
      message: msg,
      stack: (reason as Error)?.stack,
    });
  });
}

const Index = lazyWithRetry(() => import("./pages/Index.tsx"));
const SectionPage = lazyWithRetry(() => import("./pages/SectionPage.tsx"));
const DomainPage = lazyWithRetry(() => import("./pages/DomainPage.tsx"));
const TopicDetail = lazyWithRetry(() => import("./pages/TopicDetail.tsx"));
const ChangelogPage = lazyWithRetry(() => import("./pages/ChangelogPage.tsx"));
const ToolsCatalog = lazyWithRetry(() => import("./pages/ToolsCatalog.tsx"));
const Workflows = lazyWithRetry(() => import("./pages/Workflows.tsx"));
const Glossary = lazyWithRetry(() => import("./pages/Glossary.tsx"));
const GithubExplorer = lazyWithRetry(() => import("./pages/GithubExplorer.tsx"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth.tsx"));
const Strategies = lazyWithRetry(() => import("./pages/Strategies.tsx"));
const Papers = lazyWithRetry(() => import("./pages/Papers.tsx"));
const Notebook = lazyWithRetry(() => import("./pages/Notebook.tsx"));
const NotebookTemplates = lazyWithRetry(() => import("./pages/NotebookTemplates.tsx"));
const PublicProfile = lazyWithRetry(() => import("./pages/PublicProfile.tsx"));
const Account = lazyWithRetry(() => import("./pages/Account.tsx"));
const DataWorkspace = lazyWithRetry(() => import("./pages/DataWorkspace.tsx"));
const Review = lazyWithRetry(() => import("./pages/Review.tsx"));
const Gallery = lazyWithRetry(() => import("./pages/Gallery.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
    <div aria-hidden className="h-8 w-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
    <LoadingHint what="page" />
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
            <ScrollManager />
            <SectionErrorBoundary variant="page">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/s/:sectionId" element={<SectionPage />} />
                <Route path="/d/:groupId" element={<DomainPage />} />
                <Route path="/topic/:topicId" element={<TopicDetail />} />
                <Route path="/changelog" element={<ChangelogPage />} />
                <Route path="/tools" element={<ToolsCatalog />} />
                <Route path="/workflows" element={<Workflows />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="/github" element={<GithubExplorer />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/strategies" element={<Strategies />} />
                <Route path="/papers" element={<Papers />} />
                <Route path="/notebook" element={<Notebook />} />
                <Route path="/notebook/templates" element={<NotebookTemplates />} />
                <Route path="/u/:username" element={<PublicProfile />} />
                <Route path="/account" element={<Account />} />
                <Route path="/data" element={<DataWorkspace />} />
                <Route path="/review" element={<Review />} />
                <Route path="/gallery" element={<Gallery />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </SectionErrorBoundary>
            <CommandPalette />
            <Onboarding />
            <OfflineBanner />
            <UpdatePrompt />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
