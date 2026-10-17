import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { sectionHref } from "@/lib/sections";
import { Sparkles, ArrowRight, BadgeCheck, LayoutGrid } from "lucide-react";
import Reveal from "@/components/common/Reveal";
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

  const intro = TOOLS_CATALOG.filter((tool) => tool.difficulty === "intro");
  const mid = TOOLS_CATALOG.filter(
    (tool) => tool.difficulty === "core" || tool.difficulty === "advanced"
  );
  const top = TOOLS_CATALOG.filter(
    (tool) => tool.difficulty === "research" || tool.difficulty === "advanced"
  );

  const a = pick(intro, 0);
  const b = pick(mid, 7);
  let c = pick(top, 13);
  if (c.id === b.id) c = top[(top.indexOf(c) + 1) % top.length];
  return [a, b, c];
}

const TodaysPick = () => {
  const { t } = useTranslation();
  const picks = useMemo(pickToday, []);

  return (
    <section className="py-16 px-6">
      <div className="container max-w-6xl">
        <Reveal className="rounded-2xl border border-gold/25 bg-gradient-to-br from-card/60 via-card/40 to-card/20 p-6 md:p-8 shadow-[var(--shadow-gold)]">
          <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold">
                  {t("labs.todaysPick.text1", { defaultValue: "Today's Pick · 每日精选" })}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-display text-foreground">
                {t("labs.todaysPick.text2", { defaultValue: "每日三选 · 一件入门、一件核心、一件前沿" })}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t("labs.todaysPick.text3", { defaultValue: "按入门 → 核心 → 研究 三档自动轮换，每日 UTC 00:00 刷新。" })}
              </p>
            </div>
            <Link
              to="/tools"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors"
            >
              <LayoutGrid className="w-3 h-3" />
              {t("labs.todaysPick.text4", { defaultValue: "全部" })} {TOOLS_CATALOG.length} {t("labs.todaysPick.text5", { defaultValue: "个工具" })}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {picks.map((tool, idx) => {
              const diff = DIFFICULTY_LABEL[tool.difficulty];
              return (
                <Link
                  key={tool.id}
                  to={sectionHref(tool.anchor)}
                  aria-label={t("labs.todaysPick.openTool", { defaultValue: "打开工具：{{name}}（{{difficulty}}）", name: tool.name, difficulty: diff.zh })}
                  className="group block rounded-xl border border-border/60 bg-background/40 hover:bg-background/80 hover:border-gold/50 p-4 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-gold/70 tracking-wider">
                      #{idx + 1} · {CATEGORY_LABEL[tool.category].zh}
                    </span>
                    {tool.verified && (
                      <BadgeCheck
                        className="w-3.5 h-3.5 text-emerald-500"
                        aria-label={t("labs.todaysPick.text6", { defaultValue: "已验证" })}
                      />
                    )}
                  </div>
                  <h3 className="text-base font-display text-foreground group-hover:text-gold transition-colors leading-tight mb-1">
                    {tool.name}
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground/70 mb-2">
                    {tool.nameEn}
                  </p>
                  <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2 mb-3">
                    {tool.blurb}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-tool border-border/40">
                    <span className={cn("text-[10px] font-mono uppercase tracking-wider", diff.tone)}>
                      {diff.zh}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 group-hover:text-gold transition-colors inline-flex items-center gap-0.5">
                      {t("labs.todaysPick.text7", { defaultValue: "打开" })} <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default TodaysPick;