import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAV_GROUPS } from "@/lib/sections";
import { VersionBadge } from "./VersionBadge";

/** Standalone pages — mirror the navbar's "More" dropdown. */
const pageLinks = [
  { to: "/tools", label: "Tools" },
  { to: "/workflows", label: "Workflows" },
  { to: "/glossary", label: "Glossary" },
  { to: "/strategies", label: "Strategies" },
  { to: "/papers", label: "Papers" },
  { to: "/notebook", label: "Notebook" },
  { to: "/github", label: "GitHub" },
  { to: "/changelog", label: "Changelog" },
];

const SiteFooter = () => {
  const { t } = useTranslation();
  const domains = NAV_GROUPS.filter((g) => g.id !== "ungrouped").slice(0, 8);

  return (
    <footer className="mt-16 px-6 border-t border-accent/40 bg-background/90 backdrop-blur-lg">
      <div className="container max-w-6xl py-12">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand — mirrors the navbar masthead */}
          <div className="xs:col-span-2">
            <span className="block text-[8px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-1">
              {t("footer.kicker")}
            </span>
            <p className="text-base font-display font-bold text-foreground tracking-tight mb-3">
              EF&nbsp;<em className="not-italic text-gold">LAB</em>
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              {t("footer.blurb")}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground/70 mt-3 tracking-wider">
              {t("footer.blurbAlt")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-3 max-w-sm leading-relaxed border-l-2 border-gold/40 pl-2">
              {t("footer.boundary")}
            </p>
          </div>

          {/* Domains */}
          <nav aria-label={t("footer.sections")}>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">
              {t("footer.sections")}
            </p>
            <ul className="space-y-1.5">
              {domains.map((g) => (
                <li key={g.id}>
                  <Link
                    to={`/d/${g.id}`}
                    className="text-[11px] font-mono text-muted-foreground hover:text-gold transition-colors"
                  >
                    {t(`nav.groups.${g.id}`, { defaultValue: g.label })}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick links — pages + resources */}
          <nav aria-label={t("footer.quickLinks")}>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">
              {t("footer.quickLinks")}
            </p>
            <ul className="space-y-1.5">
              {pageLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-gold transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-accent/40">
          <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider">
            {t("footer.rights")}
          </p>
          <div className="flex items-center gap-3">
            <VersionBadge showBuildDate />
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border/60 hover:text-gold hover:border-gold/50 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <ArrowUp className="w-3 h-3" />
              {t("footer.backToTop")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
