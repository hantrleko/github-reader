import { useState, useEffect, useRef } from "react";
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
    items: [
      { id: "derivatives", label: "SVI / Heston / LSM" },
    ],
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

const Navbar = () => {
  const [active, setActive] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActive(top.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    ALL_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

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

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-lg border-b border-border/50"
    >
      <div className="container flex items-center justify-between h-12">
        <button
          onClick={() => scrollTo("hero")}
          className="text-xs font-mono font-semibold text-foreground tracking-wider flex items-center gap-2 hover:text-gold transition-colors"
        >
          Econ &amp; Finance Lab
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/15 text-gold font-normal tracking-wider">
            V1.1
          </span>
        </button>

        {/* Desktop grouped */}
        <div className="hidden md:flex items-center gap-0.5">
          {GROUPS.map((g) => {
            const active1 = isGroupActive(g);
            const open = openGroup === g.label;
            return (
              <div key={g.label} className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenGroup(open ? null : g.label);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors flex items-center gap-1",
                    active1
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {g.label}
                  <ChevronDown
                    className={cn("w-3 h-3 transition-transform", open && "rotate-180")}
                  />
                </button>
                {open && (
                  <div className="absolute right-0 top-full mt-1 min-w-[200px] rounded-md border border-border/70 bg-popover/95 backdrop-blur-lg shadow-lg overflow-hidden">
                    {g.items.map((i) => (
                      <button
                        key={i.id}
                        onClick={() => scrollTo(i.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[11px] font-mono transition-colors block",
                          active === i.id
                            ? "bg-gold/10 text-gold"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
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
                  {g.items.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => scrollTo(i.id)}
                      className={cn(
                        "px-3 py-2 rounded-md text-xs font-mono text-left transition-colors",
                        active === i.id
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {i.label}
                    </button>
                  ))}
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
