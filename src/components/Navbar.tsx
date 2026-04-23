import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronDown } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

type Item = { id: string; label: string };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "导览",
    items: [
      { id: "hero", label: "首页" },
      { id: "topics", label: "主题概览" },
      { id: "models", label: "模型展示" },
    ],
  },
  {
    label: "基础定价",
    items: [
      { id: "calculator", label: "Black-Scholes" },
      { id: "implied-vol", label: "隐含波动率" },
      { id: "mc-pricer", label: "MC 期权定价" },
    ],
  },
  {
    label: "衍生品 · 高阶",
    items: [{ id: "derivatives", label: "SVI / Heston / LSM" }],
  },
  {
    label: "固收 & 组合",
    items: [
      { id: "bond", label: "债券计算" },
      { id: "rate-model", label: "利率模型" },
      { id: "frontier", label: "有效前沿" },
    ],
  },
  {
    label: "计量 & 风险",
    items: [
      { id: "econometrics", label: "OLS / GARCH / Kalman" },
      { id: "risk", label: "Merton / Copula / 压力测试" },
    ],
  },
  {
    label: "量化 & 学习",
    items: [
      { id: "quant", label: "量化策略实验室" },
      { id: "quiz", label: "互动测验" },
      { id: "learning", label: "学习路径" },
      { id: "changelog", label: "更新日志" },
    ],
  },
];

const ALL_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id));
const NAV_OFFSET = 80; // sticky-nav height + breathing room

const Navbar = () => {
  const [active, setActive] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const groupBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* ─── Scroll-position based active detection (fires on scroll & resize) ───
     Picks the section whose top is closest above the offset line — robust for
     short sections where IntersectionObserver flips between neighbours. */
  const recomputeActive = useCallback(() => {
    let bestId = ALL_IDS[0];
    let bestTop = -Infinity;
    const line = NAV_OFFSET + 1;
    for (const id of ALL_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= line && top > bestTop) {
        bestTop = top;
        bestId = id;
      }
    }
    // Bottom of page — force-mark last section
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
      bestId = ALL_IDS[ALL_IDS.length - 1];
    }
    setActive((prev) => (prev === bestId ? prev : bestId));
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        recomputeActive();
        ticking = false;
      });
    };
    recomputeActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [recomputeActive]);

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
    const group = GROUPS.find((g) => g.label === openGroup);
    if (!group) return;
    const first = itemRefs.current[group.items[0].id];
    // small delay so the menu is rendered
    requestAnimationFrame(() => first?.focus());
  }, [openGroup]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
      setMobileOpen(false);
      setOpenGroup(null);
    }
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
      setOpenGroup(group.label);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = GROUPS[(gIdx + 1) % GROUPS.length];
      groupBtnRefs.current[next.label]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = GROUPS[(gIdx - 1 + GROUPS.length) % GROUPS.length];
      groupBtnRefs.current[prev.label]?.focus();
    }
  };

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-lg border-b border-border/50"
      aria-label="Primary"
    >
      <div className="container flex items-center justify-between h-12">
        <button
          onClick={() => scrollTo("hero")}
          className="text-xs font-mono font-semibold text-foreground tracking-wider flex items-center gap-2 hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded"
        >
          Econ &amp; Finance Lab
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/15 text-gold font-normal tracking-wider">
            V1.1
          </span>
        </button>

        {/* Desktop grouped */}
        <ul className="hidden md:flex items-center gap-0.5" role="menubar">
          {GROUPS.map((g, gIdx) => {
            const groupActive = isGroupActive(g);
            const open = openGroup === g.label;
            const menuId = `menu-${gIdx}`;
            return (
              <li key={g.label} className="relative" role="none">
                <button
                  ref={(el) => (groupBtnRefs.current[g.label] = el)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenGroup(open ? null : g.label);
                  }}
                  onKeyDown={(e) => handleTriggerKey(e, g, gIdx)}
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={open}
                  aria-controls={menuId}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
                    groupActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {g.label}
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
                    aria-label={g.label}
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
                            <span>{i.label}</span>
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
          <ThemeToggle />
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
              <div key={g.label}>
                <p className="text-[10px] font-mono text-gold/80 tracking-wider uppercase mb-1.5 px-1">
                  {g.label}
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
                        {i.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
