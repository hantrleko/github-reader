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

type Item = { id: string; labelKey: string };
type Group = { labelKey: string; items: Item[] };

const GROUPS: Group[] = [
  { labelKey: "nav.groups.guide", items: [
    { id: "hero", labelKey: "nav.items.hero" },
    { id: "topics", labelKey: "nav.items.topics" },
    { id: "models", labelKey: "nav.items.models" },
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
    { id: "frontier", labelKey: "nav.items.frontier" },
  ]},
  { labelKey: "nav.groups.econ", items: [
    { id: "econometrics", labelKey: "nav.items.econometrics" },
    { id: "risk", labelKey: "nav.items.risk" },
  ]},
  { labelKey: "nav.groups.data", items: [
    { id: "fred", labelKey: "nav.items.fred" },
    { id: "worldbank", labelKey: "nav.items.worldbank" },
    { id: "ecb-bis", labelKey: "nav.items.ecb-bis" },
    { id: "coingecko", labelKey: "nav.items.coingecko" },
    { id: "alphavantage", labelKey: "nav.items.alphavantage" },
  ]},
  { labelKey: "nav.groups.quant", items: [
    { id: "quant", labelKey: "nav.items.quant" },
    { id: "quiz", labelKey: "nav.items.quiz" },
    { id: "learning", labelKey: "nav.items.learning" },
  ]},
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
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const groupBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  /* ─── Global Esc closes any open menu and returns focus ─── */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && openGroup) {
        const btn = groupBtnRefs.current[openGroup];
        setOpenGroup(null);
        btn?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openGroup]);

  /* ─── Auto-focus first item when dropdown opens ─── */
  useEffect(() => {
    if (!openGroup) return;
    const group = GROUPS.find((g) => g.labelKey === openGroup);
    if (!group) return;
    const first = itemRefs.current[group.items[0].id];
    // small delay so the menu is rendered
    requestAnimationFrame(() => first?.focus());
  }, [openGroup]);

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
        <ul className="hidden md:flex items-center gap-0.5" role="menubar">
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
                    "px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
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

        <div className="flex items-center gap-1">
          <span className="hidden lg:inline-flex text-[9px] font-mono px-1.5 py-0.5 border border-gold/60 text-gold tracking-wider mr-1">
            {t("nav.version")}
          </span>
          <Link
            to="/tools"
            className={cn(
              "hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              location.pathname === "/tools"
                ? "text-gold border-b border-gold"
                : "text-foreground/70 hover:text-gold"
            )}
          >
            Tools
          </Link>
          <Link
            to="/glossary"
            className={cn(
              "hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              location.pathname === "/glossary"
                ? "text-gold border-b border-gold"
                : "text-foreground/70 hover:text-gold"
            )}
          >
            Glossary
          </Link>
          <Link
            to="/strategies"
            className={cn(
              "hidden md:inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              location.pathname === "/strategies"
                ? "text-gold border-b border-gold"
                : "text-foreground/70 hover:text-gold"
            )}
          >
            Strategies
          </Link>
          <Link
            to="/papers"
            className={cn(
              "hidden md:inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              location.pathname === "/papers"
                ? "text-gold border-b border-gold"
                : "text-foreground/70 hover:text-gold"
            )}
          >
            Papers
          </Link>
          <Link
            to="/notebook"
            className={cn(
              "hidden md:inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              location.pathname === "/notebook" && !location.search.includes("template")
                ? "text-gold border-b border-gold"
                : "text-foreground/70 hover:text-gold"
            )}
          >
            Notebook
          </Link>
          <Link
            to="/notebook/templates"
            className={cn(
              "hidden md:inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              location.pathname === "/notebook/templates"
                ? "text-gold border-b border-gold"
                : "text-foreground/70 hover:text-gold"
            )}
          >
            Templates
          </Link>
          <Link
            to="/github"
            className={cn(
              "hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              location.pathname === "/github"
                ? "text-gold border-b border-gold"
                : "text-foreground/70 hover:text-gold"
            )}
          >
            GitHub
          </Link>
          <Link
            to="/changelog"
            className={cn(
              "hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              location.pathname === "/changelog"
                ? "text-gold border-b border-gold"
                : "text-foreground/70 hover:text-gold"
            )}
          >
            {t("nav.items.changelog")}
          </Link>
          <LanguageToggle />
          <ReadingModeToggle />
          <SmoothScrollToggle />
          <ThemeToggle />
          <UserMenu />
          <button
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg max-h-[70vh] overflow-y-auto">
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
                {t("nav.items.changelog")}
              </p>
              <Link
                to="/changelog"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-md text-xs font-mono transition-colors",
                  location.pathname === "/changelog"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {t("nav.items.changelog")}
              </Link>
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
