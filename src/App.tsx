import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CommandPalette from "@/components/CommandPalette";
import Onboarding from "@/components/Onboarding";

/**
 * Reload-once recovery for stale chunk hashes after a new deploy.
 * When the browser holds an old index.html, dynamic imports point at
 * filenames that no longer exist and throw "error loading dynamically
 * imported module". A single reload fetches fresh hashes.
 */
const lazyWithRetry = <T,>(factory: () => Promise<T>) =>
  lazy(() =>
    (factory() as Promise<any>).catch((err) => {
      const msg = String(err?.message ?? err ?? "");
      const isChunkErr =
        /dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
          msg
        );
      if (isChunkErr && typeof window !== "undefined") {
        const KEY = "__lov_chunk_reload__";
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, "1");
          window.location.reload();
          // Return a never-resolving promise so Suspense holds until reload.
          return new Promise(() => {});
        }
      }
      throw err;
    })
  );

const Index = lazyWithRetry(() => import("./pages/Index.tsx"));
const TopicDetail = lazyWithRetry(() => import("./pages/TopicDetail.tsx"));
const ChangelogPage = lazyWithRetry(() => import("./pages/ChangelogPage.tsx"));
const ToolsCatalog = lazyWithRetry(() => import("./pages/ToolsCatalog.tsx"));
const Glossary = lazyWithRetry(() => import("./pages/Glossary.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/topic/:topicId" element={<TopicDetail />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="/tools" element={<ToolsCatalog />} />
              <Route path="/glossary" element={<Glossary />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CommandPalette />
          <Onboarding />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
