import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { id: "hero", label: "首页" },
  { id: "topics", label: "主题" },
  { id: "models", label: "模型展示" },
  { id: "calculator", label: "BS计算器" },
  { id: "implied-vol", label: "隐含波动率" },
  { id: "mc-pricer", label: "MC定价" },
  { id: "frontier", label: "有效前沿" },
  { id: "bond", label: "债券计算" },
  { id: "rate-model", label: "利率模型" },
  { id: "learning", label: "学习路径" },
];

const Navbar = () => {
  const [active, setActive] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);

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

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
      setMobileOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container flex items-center justify-between h-12">
        <span className="text-xs font-mono font-semibold text-foreground tracking-wider">
          Econ & Finance Lab
        </span>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors",
                active === id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg">
          <div className="container py-2 grid grid-cols-2 gap-1">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={cn(
                  "px-3 py-2 rounded-md text-xs font-mono text-left transition-colors",
                  active === id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
