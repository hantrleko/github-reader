import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SectionHeader from "@/components/common/SectionHeader";
import { PAPERS, PAPER_TOPICS, type PaperTopic } from "@/data/papers";
import { cn } from "@/lib/utils";
import { ExternalLink, Search } from "lucide-react";

const Papers = () => {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<PaperTopic | "All">("All");
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      el.classList.add("ring-1", "ring-gold");
      setTimeout(() => el.classList.remove("ring-1", "ring-gold"), 2400);
    }
  }, [hash]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return PAPERS.filter((p) => {
      if (topic !== "All" && !p.topics.includes(topic)) return false;
      if (!term) return true;
      return (
        p.title.toLowerCase().includes(term) ||
        p.authors.toLowerCase().includes(term) ||
        p.contribution.toLowerCase().includes(term) ||
        String(p.year).includes(term)
      );
    }).sort((a, b) => b.year - a.year);
  }, [q, topic]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-14">
        <SectionHeader
          chapter="Chapter P"
          kicker="PAPER INDEX"
          title="经典论文索引"
          subtitle="可检索的学术参考库 · 每篇仅一句关键贡献,附 DOI / 链接,供计算器与策略库交叉引用。"
        />

        <section className="container max-w-5xl px-6 pb-16">
          <div className="flex flex-col md:flex-row md:items-center gap-3 border-b border-accent/30 pb-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索作者 / 标题 / 年份..."
                className="w-full bg-background border border-border/60 rounded-md pl-9 pr-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:border-gold"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["All", ...PAPER_TOPICS] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t as any)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors",
                    topic === t
                      ? "bg-gold text-background border-gold"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-gold/60"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-4">
            {filtered.length} / {PAPERS.length} papers
          </p>

          <ol className="space-y-3">
            {filtered.map((p) => {
              const link = p.doi ? `https://doi.org/${p.doi}` : p.url;
              return (
                <li
                  key={p.slug}
                  id={p.slug}
                  className="border border-border/60 bg-card/30 hover:border-gold/40 transition-colors p-4 scroll-mt-24"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <h3 className="font-display text-base text-foreground leading-snug">
                      {p.title}
                    </h3>
                    <span className="text-gold font-mono text-sm shrink-0 tabular-nums">
                      {p.year}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground mb-1.5">
                    {p.authors} · <em className="text-foreground/70 not-italic">{p.journal}</em>
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed mb-2">
                    {p.contribution}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.topics.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-accent/30 text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 ml-auto text-[10px] font-mono uppercase tracking-wider text-gold hover:text-gold/80"
                      >
                        {p.doi ? "DOI" : "Link"} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              没有匹配的论文 · No matches.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Papers;