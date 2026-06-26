import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";

const Changelog = lazy(() => import("@/components/Changelog"));

const ChangelogPage = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-16">
      <Suspense
        fallback={
          <div className="py-20 px-6">
            <div className="container max-w-4xl">
              <div className="h-6 w-48 bg-muted/50 rounded animate-pulse mb-4" />
              <div className="h-4 w-full bg-muted/30 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-muted/30 rounded animate-pulse" />
            </div>
          </div>
        }
      >
        <Changelog />
      </Suspense>
    </div>
    <footer className="py-12 px-6 border-t border-border">
      <div className="container text-center space-y-2">
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          Economics &amp; Finance Lab
        </p>
        <p className="text-[10px] font-mono text-gold/70 tracking-[0.2em] uppercase pt-2">
          Version 3.2 · © 2026
        </p>
      </div>
    </footer>
  </div>
);

export default ChangelogPage;
