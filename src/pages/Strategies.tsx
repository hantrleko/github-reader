import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SectionHeader from "@/components/common/SectionHeader";
import { STRATEGIES, STRATEGY_CATEGORIES, type StrategyCategory } from "@/data/strategies";
import { PAPERS } from "@/data/papers";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Search } from "lucide-react";

const fmtPct = (x: number) => `${(x * 100).toFixed(0)}%`;

const Strategies = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<StrategyCategory | "All">("All");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return STRATEGIES.filter((s) => {
      if (cat !== "All" && s.category !== cat) return false;
      if (!term) return true;
      return (
        s.name.includes(term) ||
        s.nameEn.toLowerCase().includes(term) ||
        s.oneLiner.toLowerCase().includes(term) ||
        s.edge.toLowerCase().includes(term)
      );
    });
  }, [q, cat]);

  const paperBySlug = useMemo(
    () => Object.fromEntries(PAPERS.map((p) => [p.slug, p])),
    []
  );

  return (
    <div className="min-h-screen bg-background">
      <Seo title="量化策略库 · EF Lab" description="经典量化策略卡片库：动量、价值、低波、配对、统计套利等，含夏普、回撤、数据频率与参考论文。" path="/strategies" />
      <Navbar />
      <main id="main-content" className="pt-14">
        <SectionHeader
          chapter="Chapter R"
          kicker="STRATEGY LIBRARY"
          title="经典量化策略库"
          subtitle="对标 QuantPedia · 12 个学术验证的因子与套利策略,附论文索引与历史 Sharpe / 回撤参考。"
        />

        <section className="container max-w-6xl px-6 pb-16">
          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 border-b border-accent/30 pb-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索策略 / Search..."
                className="w-full bg-background border border-border/60 rounded-md pl-9 pr-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:border-gold"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["All", ...STRATEGY_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c as any)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors",
                    cat === c
                      ? "bg-gold text-background border-gold"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-gold/60"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-4">
            {filtered.length} / {STRATEGIES.length} strategies
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const refs = s.papers.map((slug) => paperBySlug[slug]).filter(Boolean);
              return (
                <article
                  key={s.slug}
                  className="group border border-border/60 bg-card/40 hover:border-gold/50 transition-colors p-5 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold border-l-2 border-gold pl-2">
                      {s.category}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {s.assetClass.join(" · ")}
                    </span>
                  </div>

                  <h3 className="font-display text-lg leading-tight text-foreground mb-1">
                    {s.name}
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-3">
                    {s.nameEn}
                  </p>

                  <p className="text-xs text-foreground/80 leading-relaxed mb-3">
                    {s.oneLiner}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 flex-1">
                    {s.edge}
                  </p>

                  {/* metrics row */}
                  <div className="grid grid-cols-3 gap-2 border-y border-accent/30 py-2 mb-3">
                    <Metric label="Sharpe" value={s.sharpe.toFixed(2)} accent />
                    <Metric label="Max DD" value={fmtPct(s.drawdown)} />
                    <Metric label="Capacity" value={s.capacity} />
                  </div>

                  {/* parameters */}
                  <div className="space-y-1 mb-3">
                    {s.parameters.map((p) => (
                      <div key={p.name} className="flex justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="text-foreground">
                          {p.default}
                          <span className="text-muted-foreground/60 ml-1">[{p.range}]</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* papers */}
                  {refs.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-1.5">
                        Source Papers
                      </p>
                      <ul className="space-y-1">
                        {refs.map((p) => (
                          <li key={p.slug} className="text-[10px] text-muted-foreground leading-snug">
                            <Link
                              to={`/papers#${p.slug}`}
                              className="hover:text-gold transition-colors"
                            >
                              {p.authors} ({p.year}) — {p.journal}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {s.toolHash && (
                    <Link
                      to={`/${s.toolHash}`}
                      className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-gold hover:text-gold/80 mt-auto pt-2 border-t border-accent/20"
                    >
                      Open Related Tool <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              没有匹配的策略 · No matching strategies.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const Metric = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <span
      className={cn(
        "text-sm font-mono tabular-nums",
        accent ? "text-gold" : "text-foreground"
      )}
    >
      {value}
    </span>
  </div>
);

export default Strategies;