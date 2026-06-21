import { useMemo } from "react";
import { Link } from "react-router-dom";
import { sectionHref } from "@/lib/sections";
import { Sparkles, ArrowRight, BadgeCheck, LayoutGrid } from "lucide-react";
import {
  TOOLS_CATALOG,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  type ToolEntry,
} from "@/data/toolsCatalog";
import { cn } from "@/lib/utils";

/**
 * Picks 3 tools deterministically per UTC day, weighted to mix one Intro,
 * one Core/Advanced, and one Research-tier item.
 */
function pickToday(): ToolEntry[] {
  const dayKey = Math.floor(Date.now() / 86_400_000);
  const seed = (dayKey * 2654435761) >>> 0;

  const pick = (pool: ToolEntry[], offset: number) =>
    pool[(seed + offset) % pool.length];

  const intro = TOOLS_CATALOG.filter((t) => t.difficulty === "intro");
  const mid = TOOLS_CATALOG.filter(
    (t) => t.difficulty === "core" || t.difficulty === "advanced"
  );
  const top = TOOLS_CATALOG.filter(
    (t) => t.difficulty === "research" || t.difficulty === "advanced"
  );

  const a = pick(intro, 0);
  const b = pick(mid, 7);
  let c = pick(top, 13);
  if (c.id === b.id) c = top[(top.indexOf(c) + 1) % top.length];
  return [a, b, c];
}

const TodaysPick = () => {
  const picks = useMemo(pickToday, []);

  return (
    <section className="py-16 px-6">
      <div className="container max-w-6xl">
        <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-card/60 via-card/40 to-card/20 p-6 md:p-8 shadow-[var(--shadow-gold)]">
          <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold">
                  Today's Pick · 每日精选
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-display text-foreground">
                今天我们推荐三个工具
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                按入门 → 核心 → 研究 三档自动轮换 · 每天 UTC 0:00 刷新
              </p>
            </div>
            <Link
              to="/tools"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors"
            >
              <LayoutGrid className="w-3 h-3" />
              全部 {TOOLS_CATALOG.length} 个工具
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {picks.map((t, idx) => {
              const diff = DIFFICULTY_LABEL[t.difficulty];
              return (
                <Link
                  key={t.id}
                  to={sectionHref(t.anchor)}
                  className="group block rounded-xl border border-border/60 bg-background/40 hover:bg-background/80 hover:border-gold/50 p-4 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-gold/70 tracking-wider">
                      #{idx + 1} · {CATEGORY_LABEL[t.category].zh}
                    </span>
                    {t.verified && (
                      <BadgeCheck
                        className="w-3.5 h-3.5 text-emerald-500"
                        aria-label="已验证"
                      />
                    )}
                  </div>
                  <h3 className="text-base font-display text-foreground group-hover:text-gold transition-colors leading-tight mb-1">
                    {t.name}
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground/70 mb-2">
                    {t.nameEn}
                  </p>
                  <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2 mb-3">
                    {t.blurb}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className={cn("text-[10px] font-mono uppercase tracking-wider", diff.tone)}>
                      {diff.zh}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 group-hover:text-gold transition-colors inline-flex items-center gap-0.5">
                      打开 <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TodaysPick;