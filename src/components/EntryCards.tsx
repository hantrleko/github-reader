import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TEACHING_PATH } from "@/lib/teachingPath";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Question-led primary entry shown right after the hero: three teaching
 * questions, each opening the exact lab tab that answers it, in path order.
 */
const EntryCards = () => {
  const { t } = useTranslation();
  return (
    <section id="start" aria-labelledby="entry-title" className="scroll-mt-16 px-6 py-10">
      <div className="container max-w-6xl">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80">{t("home.questions.kicker")}</p>
        <h2 id="entry-title" className="mt-1 font-display text-2xl md:text-3xl text-foreground">{t("home.questions.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.questions.subtitle")}</p>
        <ol className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEACHING_PATH.map((step, i) => (
            <li key={step.id}>
              <Link to={step.to} data-testid={`home-question-${step.id}`}
                className={`group flex h-full min-w-0 flex-col break-words rounded-xl border border-border/60 bg-card/45 p-5 hover:border-gold/50 hover:bg-card/70 transition-colors ${FOCUS}`}>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">
                  {String(i + 1).padStart(2, "0")} · {t(`path.${step.id}.short`)}
                </span>
                <h3 className="mt-3 font-display text-lg text-foreground leading-snug group-hover:text-gold transition-colors">
                  {t(`home.questions.${step.id}.q`)}
                </h3>
                <p className="mt-2 flex-1 text-sm text-foreground/70 leading-relaxed">{t(`home.questions.${step.id}.desc`)}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-gold">
                  {t(`home.questions.${step.id}.cta`)} <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-muted-foreground">
          <span className="mr-1">{t("home.questions.more")}</span>
          <Link to="/workflows" className={`inline-flex min-h-11 items-center rounded px-2 hover:text-gold ${FOCUS}`}>{t("home.entry.playbooks.cta")} →</Link>
          <Link to="/s/backtest" className={`inline-flex min-h-11 items-center rounded px-2 hover:text-gold ${FOCUS}`}>{t("home.entry.homework.secondary")} →</Link>
        </p>
      </div>
    </section>
  );
};

export default EntryCards;
