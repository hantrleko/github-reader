import { Suspense } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import ScrollUtilities from "@/components/ScrollUtilities";
import KeyboardHelp from "@/components/KeyboardHelp";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import SectionHeader from "@/components/common/SectionHeader";
import SiteFooter from "@/components/SiteFooter";
import { SECTION_MAP, SECTIONS } from "@/lib/sections";
import { sectionSeo } from "@/lib/seoCopy";

const SectionFallback = () => (
  <div className="py-20 px-6">
    <div className="container max-w-5xl">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-8 md:p-10 overflow-hidden relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--gold) / 0.06) 50%, transparent 100%)",
            animation: "shimmer 1.6s ease-in-out infinite",
          }}
        />
        <div className="flex items-center gap-2 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
          <div className="h-3 w-32 rounded bg-muted/50 animate-pulse" />
        </div>
        <div className="h-7 w-2/3 max-w-md rounded bg-muted/60 animate-pulse mb-3" />
        <div className="h-4 w-full max-w-lg rounded bg-muted/30 animate-pulse mb-2" />
        <div className="h-4 w-1/2 rounded bg-muted/30 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                <div className="h-7 w-32 rounded bg-muted/40 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

const SectionPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const def = sectionId ? SECTION_MAP[sectionId] : undefined;

  if (!def) return <Navigate to="/" replace />;

  const { Component } = def;
  const seo = sectionSeo(def);
  const idx = SECTIONS.findIndex((s) => s.id === def.id);
  const prev = idx > 0 ? SECTIONS[idx - 1] : null;
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title={seo.title}
        description={seo.description}
        path={`/s/${def.id}`}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
      />
      <Navbar />
      <ScrollUtilities />
      <KeyboardHelp />

      <main id="main-content" className="flex-1 pt-14">
        <div className="container max-w-6xl px-6 pt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-gold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回首页
          </Link>
          {domain && (
            <Link
              to={`/d/${domain.id}`}
              className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-gold transition-colors"
            >
              {domain.code} {domain.label} · {domain.kicker} 主线 →
            </Link>
          )}
        </div>

        <SectionHeader
          chapter={def.chapter}
          kicker={def.kicker}
          title={def.label}
          subtitle={def.subtitle}
        />

        {prereqs.length > 0 && (
          <div className="container max-w-6xl px-6 -mt-2 mb-6 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">
              建议先看
            </span>
            {prereqs.map((p) => (
              <Link
                key={p.id}
                to={`/s/${p.id}`}
                className="rounded-full border border-border/60 bg-card/35 px-3 py-1 text-xs text-foreground/75 hover:border-gold/40 hover:text-gold transition-colors"
              >
                {p.label}
              </Link>
            ))}
          </div>
        )}

        <SectionErrorBoundary name={def.label}>
          <Suspense fallback={<SectionFallback />}>
            <div id={def.id}>
              <Component />
            </div>
          </Suspense>
        </SectionErrorBoundary>

        {/* Prev / Next navigation between section pages */}
        <nav className="container max-w-6xl px-6 mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prev ? (
            <Link
              to={`/s/${prev.id}`}
              className="group rounded-xl border border-border/60 bg-card/35 p-4 hover:border-gold/40 transition-colors"
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">
                ← {prev.chapter}
              </span>
              <p className="mt-1.5 text-sm font-display text-foreground group-hover:text-gold transition-colors">
                {prev.label}
              </p>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/s/${next.id}`}
              className="group rounded-xl border border-border/60 bg-card/35 p-4 hover:border-gold/40 transition-colors text-right sm:col-start-2"
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">
                {next.chapter} →
              </span>
              <p className="mt-1.5 text-sm font-display text-foreground group-hover:text-gold transition-colors">
                {next.label}
              </p>
            </Link>
          )}
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
};

export default SectionPage;
