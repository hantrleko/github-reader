import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronDown } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import ReadingModeToggle from "./ReadingModeToggle";
import SmoothScrollToggle from "./SmoothScrollToggle";
import LanguageToggle from "./LanguageToggle";
import UserMenu from "./UserMenu";
import TopTicker from "./TopTicker";
import { useTranslation } from "react-i18next";
import { sectionHref } from "@/lib/sections";
import { VersionBadge } from "./VersionBadge";

type Item = { id: string; labelKey: string };
type Group = { labelKey: string; items: Item[] };

const GROUPS: Group[] = [
  { labelKey: "nav.groups.guide", items: [
    { id: "hero", labelKey: "nav.items.hero" },
    { id: "topics", labelKey: "nav.items.topics" },
    { id: "models", labelKey: "nav.items.models" },
  ]},
  { labelKey: "nav.groups.theory", items: [
    { id: "micro", labelKey: "nav.items.micro" },
    { id: "macro", labelKey: "nav.items.macro" },
    { id: "macro-lab", labelKey: "nav.items.macro-lab" },
    { id: "behavior-microstructure", labelKey: "nav.items.behavior-microstructure" },
    { id: "visualization-guide", labelKey: "nav.items.visualization-guide" },
  ]},
  { labelKey: "nav.groups.basics", items: [
    { id: "calculator", labelKey: "nav.items.calculator" },
    { id: "implied-vol", labelKey: "nav.items.implied-vol" },
    { id: "mc-pricer", labelKey: "nav.items.mc-pricer" },
  ]},
  { labelKey: "nav.groups.deriv", items: [
    { id: "derivatives", labelKey: "nav.items.derivatives" },
  ]},
  { labelKey: "nav.groups.fixed", items: [
    { id: "bond", labelKey: "nav.items.bond" },
    { id: "rate-model", labelKey: "nav.items.rate-model" },
    { id: "fixed-income-lab", labelKey: "nav.items.fixed-income-lab" },
    { id: "frontier", labelKey: "nav.items.frontier" },
    { id: "asset-pricing", labelKey: "nav.items.asset-pricing" },
    { id: "asset-pricing-theory", labelKey: "nav.items.asset-pricing-theory" },
  ]},
  { labelKey: "nav.groups.econ", items: [
    { id: "econometrics", labelKey: "nav.items.econometrics" },
    { id: "risk", labelKey: "nav.items.risk" },
  ]},
  { labelKey: "nav.groups.data", items: [
    { id: "us-suite", labelKey: "nav.items.us-suite" },
    { id: "ashare-suite", labelKey: "nav.items.ashare-suite" },
    { id: "fred", labelKey: "nav.items.fred" },
    { id: "worldbank", labelKey: "nav.items.worldbank" },
    { id: "ecb-bis", labelKey: "nav.items.ecb-bis" },
    { id: "coingecko", labelKey: "nav.items.coingecko" },
    { id: "alphavantage", labelKey: "nav.items.alphavantage" },
    { id: "cboe-sentiment", labelKey: "nav.items.cboe-sentiment" },
    { id: "econ-calendar", labelKey: "nav.items.econ-calendar" },
    { id: "etf-lookup", labelKey: "nav.items.etf-lookup" },
    { id: "sector-heatmap", labelKey: "nav.items.sector-heatmap" },
    { id: "market-cap", labelKey: "nav.items.market-cap" },
    { id: "quiver-signals", labelKey: "nav.items.quiver-signals" },
    { id: "external-workbench", labelKey: "nav.items.external-workbench" },
  ]},
  { labelKey: "nav.groups.quant", items: [
    { id: "quant", labelKey: "nav.items.quant" },
    { id: "platform", labelKey: "nav.items.platform" },
    { id: "frontier-concepts", labelKey: "nav.items.frontier-concepts" },
    { id: "trillion-dollar-equation", labelKey: "nav.items.trillion-dollar-equation" },
    { id: "ai-quant-strategy", labelKey: "nav.items.ai-quant-strategy" },
    { id: "quiz", labelKey: "nav.items.quiz" },
    { id: "learning", labelKey: "nav.items.learning" },
  ]},
];

/** Standalone page links (their own routes) — consolidated into a "More" menu */
type PageLink = { to: string; label: string; match: (path: string, search: string) => boolean };
const PAGE_LINKS: PageLink[] = [
  { to: "/tools", label: "Tools", match: (p) => p === "/tools" },
  { to: "/data", label: "Data", match: (p) => p === "/data" },
  { to: "/review", label: "Review", match: (p) => p === "/review" },
  { to: "/gallery", label: "Gallery", match: (p) => p === "/gallery" },
  { to: "/workflows", label: "Workflows", match: (p) => p === "/workflows" },
  { to: "/glossary", label: "Glossary", match: (p) => p === "/glossary" },
  { to: "/strategies", label: "Strategies", match: (p) => p === "/strategies" },
  { to: "/papers", label: "Papers", match: (p) => p === "/papers" },
  { to: "/notebook", label: "Notebook", match: (p, s) => p === "/notebook" && !s.includes("template") },
  { to: "/notebook/templates", label: "Templates", match: (p) => p === "/notebook/templates" },
  { to: "/github", label: "GitHub", match: (p) => p === "/github" },
  { to: "/changelog", label: "Changelog", match: (p) => p === "/changelog" },
];

const ALL_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id));
const NAV_OFFSET = 80; // sticky-nav height + breathing room

const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const onHome = location.pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [pagesOpen, setPagesOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const groupBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mobileBtnRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  /* ─── Active section derived from the current route ─── */
  const active = location.pathname.startsWith("/s/")
    ? location.pathname.slice(3)
    : location.hash
      ? location.hash.slice(1)
      : onHome
        ? "hero"
        : "";

  /* ─── Outside click closes dropdown ─── */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setPagesOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  /* ─── Global Esc closes any open menu and returns focus ─── */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openGroup) {
        const btn = groupBtnRefs.current[openGroup];
        setOpenGroup(null);
        btn?.focus();
      } else if (mobileOpen) {
        setMobileOpen(false);
        // return focus to the toggle button that opened the menu
        requestAnimationFrame(() => mobileBtnRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openGroup, mobileOpen]);

  /* ─── Move focus into the mobile menu when it opens ─── */
  useEffect(() => {
    if (!mobileOpen) return;
    const first = mobileMenuRef.current?.querySelector<HTMLElement>(
      "button, a[href]"
    );
    requestAnimationFrame(() => first?.focus());
  }, [mobileOpen]);

  /* ─── Focus trap: keep Tab cycling inside the open mobile menu ─── */
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = mobileMenuRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      // If focus somehow escaped the menu, pull it back in.
      if (activeEl && !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey) {
        if (activeEl === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  /* ─── Auto-focus first item when dropdown opens ─── */
  useEffect(() => {
    if (!openGroup) return;
    const group = GROUPS.find((g) => g.labelKey === openGroup);
    if (!group) return;
    const first = itemRefs.current[group.items[0].id];
    // small delay so the menu is rendered
    requestAnimationFrame(() => first?.focus());
  }, [openGroup]);

  /* ─── Lock background scroll while the mobile menu is open ─── */
  useEffect(() => {
    if (!mobileOpen) return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  /* ─── Auto-close the mobile menu when switching to desktop / on resize ─── */
  useEffect(() => {
    // xl breakpoint (1280px) is where the desktop nav takes over
    const mql = window.matchMedia("(min-width: 1280px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setMobileOpen(false);
        setOpenGroup(null);
        setPagesOpen(false);
      }
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    setOpenGroup(null);
    navigate(sectionHref(id));
  };

  const isGroupActive = (g: Group) => g.items.some((i) => i.id === active);

  /* ─── Keyboard nav inside an open dropdown ─── */
  const handleItemKey = (
    e: KeyboardEvent<HTMLButtonElement>,
    group: Group,
    idx: number
  ) => {
    const items = group.items;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[(idx + 1) % items.length];
      itemRefs.current[next.id]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = items[(idx - 1 + items.length) % items.length];
      itemRefs.current[prev.id]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itemRefs.current[items[0].id]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itemRefs.current[items[items.length - 1].id]?.focus();
    } else if (e.key === "Tab") {
      // Tabbing out closes the menu but lets focus move naturally
      setOpenGroup(null);
    }
  };

  /* ─── Keyboard nav between group triggers + open with arrows ─── */
  const handleTriggerKey = (
    e: KeyboardEvent<HTMLButtonElement>,
    group: Group,
    gIdx: number
  ) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpenGroup(group.labelKey);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = GROUPS[(gIdx + 1) % GROUPS.length];
      groupBtnRefs.current[next.labelKey]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = GROUPS[(gIdx - 1 + GROUPS.length) % GROUPS.length];
      groupBtnRefs.current[prev.labelKey]?.focus();
    }
  };

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-0 z-[100] -translate-y-full focus:translate-y-0 transition-transform duration-200 px-5 py-2.5 bg-gold text-primary-foreground font-mono text-[11px] uppercase tracking-wider font-bold rounded-b-md shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        跳到主要内容
      </a>
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-accent/40"
      aria-label="Primary"
    >
      <div className="container flex items-center justify-between h-14 gap-4">
        <button
          onClick={() => scrollTo("hero")}
          className="flex flex-col items-start leading-none hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded shrink-0 whitespace-nowrap"
        >
          <span className="hidden xl:block text-[8px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-0.5">
            The Quantitative Report
          </span>
          <span className="text-sm md:text-base font-display font-bold text-foreground tracking-tight">
            Econ&nbsp;&amp;&nbsp;Finance <em className="not-italic text-gold">Lab</em>
          </span>
        </button>

        {/* Desktop grouped */}
        <ul className="hidden xl:flex flex-nowrap items-center gap-0.5 min-w-0" role="menubar">
          {GROUPS.map((g, gIdx) => {
            const groupActive = isGroupActive(g);
            const open = openGroup === g.labelKey;
            const menuId = `menu-${gIdx}`;
            return (
              <li key={g.labelKey} className="relative" role="none">
                <button
                  ref={(el) => (groupBtnRefs.current[g.labelKey] = el)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenGroup(open ? null : g.labelKey);
                  }}
                  onKeyDown={(e) => handleTriggerKey(e, g, gIdx)}
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={open}
                  aria-controls={menuId}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-mono whitespace-nowrap shrink-0 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
                    groupActive
                      ? "text-gold font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {t(g.labelKey)}
                  {groupActive && (
                    <span className="w-1 h-1 rounded-full bg-gold" aria-hidden />
                  )}
                  <ChevronDown
                    className={cn("w-3 h-3 transition-transform", open && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {open && (
                  <ul
                    id={menuId}
                    role="menu"
                    aria-label={t(g.labelKey)}
                    className="absolute right-0 top-full mt-1 min-w-[220px] rounded-md border border-border/70 bg-popover/95 backdrop-blur-lg shadow-lg overflow-hidden py-1"
                  >
                    {g.items.map((i, idx) => {
                      const isActive = active === i.id;
                      return (
                        <li key={i.id} role="none">
                          <button
                            ref={(el) => (itemRefs.current[i.id] = el)}
                            onClick={() => scrollTo(i.id)}
                            onKeyDown={(e) => handleItemKey(e, g, idx)}
                            role="menuitem"
                            aria-current={isActive ? "location" : undefined}
                            className={cn(
                              "w-full text-left px-3 py-2 text-[11px] font-mono transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:bg-accent focus-visible:text-foreground",
                              isActive
                                ? "bg-gold/10 text-gold"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                          >
                            <span>{t(i.labelKey)}</span>
                            {isActive && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-gold shrink-0"
                                aria-hidden
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1 shrink-0">
          <VersionBadge className="hidden 2xl:inline-flex mr-1" />

          {/* Consolidated "More" pages dropdown (desktop) */}
          <div className="relative hidden xl:block">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPagesOpen((v) => !v);
              }}
              aria-haspopup="true"
              aria-expanded={pagesOpen}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
                PAGE_LINKS.some((l) => l.match(location.pathname, location.search))
                  ? "text-gold"
                  : "text-foreground/70 hover:text-gold"
              )}
            >
              More
              <ChevronDown className={cn("w-3 h-3 transition-transform", pagesOpen && "rotate-180")} aria-hidden />
            </button>
            {pagesOpen && (
              <ul
                role="menu"
                className="absolute right-0 top-full mt-1 min-w-[180px] rounded-md border border-border/70 bg-popover/95 backdrop-blur-lg shadow-lg overflow-hidden py-1"
              >
                {PAGE_LINKS.map((l) => {
                  const isActive = l.match(location.pathname, location.search);
                  return (
                    <li key={l.to} role="none">
                      <Link
                        to={l.to}
                        role="menuitem"
                        onClick={() => setPagesOpen(false)}
                        className={cn(
                          "block px-3 py-2 text-[11px] font-mono uppercase tracking-wider transition-colors",
                          isActive
                            ? "bg-gold/10 text-gold"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        {l.to === "/changelog" ? t("nav.items.changelog") : l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <LanguageToggle />
          <ReadingModeToggle />
          <SmoothScrollToggle />
          <ThemeToggle />
          <UserMenu />
          <button
            ref={mobileBtnRef}
            className="xl:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-haspopup="true"
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          role="menu"
          aria-label="Mobile navigation"
          className="xl:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg max-h-[70vh] overflow-y-auto"
        >
          <div className="container py-3 space-y-3">
            {GROUPS.map((g) => (
              <div key={g.labelKey}>
                <p className="text-[10px] font-mono text-gold/80 tracking-wider uppercase mb-1.5 px-1">
                  {t(g.labelKey)}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {g.items.map((i) => {
                    const isActive = active === i.id;
                    return (
                      <button
                        key={i.id}
                        onClick={() => scrollTo(i.id)}
                        aria-current={isActive ? "location" : undefined}
                        className={cn(
                          "px-3 py-2 rounded-md text-xs font-mono text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        {t(i.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-mono text-gold/80 tracking-wider uppercase mb-1.5 px-1">
                More
              </p>
              <div className="grid grid-cols-2 gap-1">
                {PAGE_LINKS.map((l) => {
                  const isActive = l.match(location.pathname, location.search);
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "block px-3 py-2 rounded-md text-xs font-mono transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {l.to === "/changelog" ? t("nav.items.changelog") : l.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
    <TopTicker />
    {/* Spacer so page content clears the 28px ticker below the 56px navbar */}
    <div aria-hidden className="h-7" />
    </>
  );
};

export default Navbar;
