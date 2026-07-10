import { Link } from "react-router-dom";
import { BookMarked, Library, Route, TrendingUp, ArrowUpRight } from "lucide-react";
import { TOPIC_CONNECTIONS } from "@/data/topicConnections";
import { GLOSSARY } from "@/data/glossary";
import { PAPERS } from "@/data/papers";
import { WORKFLOWS } from "@/data/workflows";
import { STRATEGIES } from "@/data/strategies";

const glossaryBySlug = Object.fromEntries(GLOSSARY.map((g) => [g.slug, g]));
const papersBySlug = Object.fromEntries(PAPERS.map((p) => [p.slug, p]));
const workflowsById = Object.fromEntries(WORKFLOWS.map((w) => [w.id, w]));
const strategiesBySlug = Object.fromEntries(STRATEGIES.map((s) => [s.slug, s]));

/**
 * "延伸阅读" rail on TopicDetail — surfaces the knowledge network around a
 * topic: glossary definitions, primary-source papers, executable workflows
 * and related strategies, each deep-linking into its own page.
 */
const TopicRelated = ({ topicId }: { topicId: string }) => {
  const conn = TOPIC_CONNECTIONS[topicId];
  if (!conn) return null;

  const glossary = (conn.glossary ?? []).map((s) => glossaryBySlug[s]).filter(Boolean);
  const papers = (conn.papers ?? []).map((s) => papersBySlug[s]).filter(Boolean);
  const workflows = (conn.workflows ?? []).map((s) => workflowsById[s]).filter(Boolean);
  const strategies = (conn.strategies ?? []).map((s) => strategiesBySlug[s]).filter(Boolean);

  if (!glossary.length && !papers.length && !workflows.length && !strategies.length) return null;

  return (
    <section className="px-6 pb-16" aria-label="延伸阅读">
      <div className="container max-w-6xl">
        <div className="rounded-2xl border border-border/60 bg-card/35 p-6 md:p-8">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-1">
            Knowledge Network
          </p>
          <h2 className="font-display text-2xl text-foreground mb-6">延伸阅读 · 关联内容</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {glossary.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  <BookMarked className="w-3.5 h-3.5 text-gold" /> 核心术语
                </p>
                <div className="flex flex-wrap gap-2">
                  {glossary.map((g) => (
                    <Link
                      key={g.slug}
                      to={`/glossary#${g.slug}`}
                      className="px-2.5 py-1 rounded-md text-xs font-mono bg-secondary text-foreground/80 border border-border hover:border-gold/40 hover:text-gold transition-colors"
                    >
                      {g.zh}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {workflows.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  <Route className="w-3.5 h-3.5 text-gold" /> 研究工作流
                </p>
                <div className="space-y-2">
                  {workflows.map((w) => (
                    <Link
                      key={w.id}
                      to={`/workflows?w=${w.id}`}
                      className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 hover:border-gold/40 transition-colors"
                    >
                      <span className="text-sm text-foreground/85 group-hover:text-gold transition-colors">
                        {w.title}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {papers.length > 0 && (
              <div className={strategies.length === 0 ? "md:col-span-2" : ""}>
                <p className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  <Library className="w-3.5 h-3.5 text-gold" /> 奠基文献
                </p>
                <ul className="space-y-1.5">
                  {papers.slice(0, 6).map((p) => (
                    <li key={p.slug}>
                      <Link
                        to={`/papers#${p.slug}`}
                        className="group block text-sm leading-snug"
                      >
                        <span className="text-foreground/85 group-hover:text-gold transition-colors">
                          {p.title}
                        </span>
                        <span className="ml-2 text-[11px] font-mono text-muted-foreground">
                          {p.authors.split(",")[0].split("&")[0].trim()} ({p.year})
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {strategies.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  <TrendingUp className="w-3.5 h-3.5 text-gold" /> 相关策略
                </p>
                <div className="space-y-2">
                  {strategies.slice(0, 4).map((s) => (
                    <Link
                      key={s.slug}
                      to={`/strategies#${s.slug}`}
                      className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 hover:border-gold/40 transition-colors"
                    >
                      <span className="text-sm text-foreground/85 group-hover:text-gold transition-colors truncate">
                        {s.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        SR≈{s.sharpe.toFixed(2)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopicRelated;
