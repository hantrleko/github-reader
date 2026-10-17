import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight, Route } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import { WORKFLOWS } from "@/data/workflows";
import { DIFFICULTY_LABEL } from "@/data/toolsCatalog";
import { cn } from "@/lib/utils";

/**
 * Landing strip that surfaces a few curated research workflows ("playbooks"),
 * each chaining several tools into a teaching / practitioner sequence.
 * Links through to the full /workflows page.
 */
const FEATURED = WORKFLOWS.slice(0, 4);

const WorkflowStrip = () => {
  const { t } = useTranslation();
  return (
  <section id="workflows-preview" className="scroll-mt-16 px-6 py-14 border-t border-border/40">
    <div className="container max-w-6xl">
      <SectionHeader
        chapter="Playbooks"
        kicker="Research Workflows"
        title={t("labs.workflowStrip.text1", { defaultValue: "研究工作流速览" })}
        subtitle={t("labs.workflowStrip.text2", { defaultValue: "每条工作流把多个工具串成端到端链路——从数据、校准到定价与回测，照着做即可完成一次实证复现。" })}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {FEATURED.map((w, i) => {
          const diff = DIFFICULTY_LABEL[w.difficulty];
          return (
            <Reveal key={w.id} delay={(i % 2) * 0.08}>
              <Link
                to="/workflows"
                aria-label={t("labs.workflowStrip.open", { defaultValue: "打开研究工作流：{{title}}（{{count}} 步）", title: w.title, count: w.steps.length })}
                className="group flex h-full flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-card hover:shadow-[0_16px_40px_-20px_hsl(var(--gold)/0.35)]"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5" />
                    {w.steps.length} steps
                  </span>
                  <span className={cn("tracking-wider", diff.tone)}>{diff.zh}</span>
                </div>
                <h3 className="font-display text-lg leading-snug text-foreground transition-colors group-hover:text-gold">
                  {w.title}
                  <span className="ml-2 text-[11px] font-mono italic text-muted-foreground/70">
                    {w.titleEn}
                  </span>
                </h3>
                <p className="text-xs leading-relaxed text-foreground/65 line-clamp-3">
                  {w.blurb}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                  {w.steps.map((s, si) => (
                    <span
                      key={`${w.id}-${si}`}
                      className="rounded border border-accent/40 px-1.5 py-0.5 text-[9px] font-mono text-foreground/55"
                    >
                      {s.toolId}
                    </span>
                  ))}
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
      <div className="mt-6 flex justify-end">
        <Link
          to="/workflows"
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.18em] text-gold hover:underline"
        >
          {t("labs.workflowStrip.text3", { defaultValue: "浏览全部研究工作流" })}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  </section>
  );
};

export default WorkflowStrip;