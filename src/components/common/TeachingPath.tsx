import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, HelpCircle, RotateCcw } from "lucide-react";
import { TEACHING_PATH, PATH_HOME, nextStep, pathIndex, type CheckItem, type PathLabId } from "@/lib/teachingPath";

/**
 * Teaching-path chrome shared by the three path labs: an intro block (question,
 * default scenario, assumptions/limits) above the controls, and a check block
 * (comprehension questions with scenario-specific reasons, reset, next step)
 * below the charts.
 */
export const PathIntro = ({ lab, onReset }: { lab: PathLabId; onReset: () => void }) => {
  const { t } = useTranslation();
  const idx = pathIndex(lab);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-testid={`path-intro-${lab}`}
      className="rounded-xl border border-gold/30 bg-gold/5 p-4 md:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">
          {t("path.stepOf", { n: idx + 1, total: TEACHING_PATH.length })}
        </p>
        <ol className="flex items-center gap-1.5" aria-label={t("path.stepsAria")}>
          {TEACHING_PATH.map((s, i) => (
            <li key={s.id}>
              <Link to={s.to} aria-current={i === idx ? "step" : undefined}
                className={`block rounded-full px-2 py-0.5 text-[10px] font-mono border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${i === idx ? "border-gold text-gold" : "border-border text-muted-foreground hover:text-gold"}`}>
                {i + 1}. {t(`path.${s.id}.short`)}
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <h3 id={headingId} className="font-display text-lg md:text-xl text-foreground leading-snug">
        {t(`path.${lab}.question`)}
      </h3>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
        <div>
          <dt className="font-mono uppercase tracking-wider text-[10px] text-gold/80">{t("path.defaultLabel")}</dt>
          <dd className="mt-1 text-foreground/80">{t(`path.${lab}.default`)}</dd>
        </div>
        <div>
          <dt className="font-mono uppercase tracking-wider text-[10px] text-gold/80">{t("path.limitsLabel")}</dt>
          <dd className="mt-1 text-foreground/80">{t(`path.${lab}.limits`)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-mono text-muted-foreground">{t("path.simulated")}</p>
        <button type="button" onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-gold hover:border-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          <RotateCcw className="w-3.5 h-3.5" aria-hidden /> {t("path.reset")}
        </button>
      </div>
    </section>
  );
};

const CheckQuestion = ({ lab, item, index }: { lab: PathLabId; item: CheckItem; index: number }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const answerId = useId();
  return (
    <li className="rounded-lg border border-border bg-secondary/30 p-3">
      <p className="text-sm text-foreground">
        <span className="font-mono text-gold mr-1.5">Q{index + 1}.</span>
        {t(`path.${lab}.q.${item.id}`)}
      </p>
      <button type="button" aria-expanded={open} aria-controls={answerId} onClick={() => setOpen((o) => !o)}
        className="mt-2 text-xs font-mono text-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded">
        {open ? t("path.hideAnswer") : t("path.showAnswer")}
      </button>
      <p id={answerId} hidden={!open} aria-live="polite" className="mt-2 text-xs text-foreground/80 leading-relaxed">
        {t(item.answerKey, item.vars)}
      </p>
    </li>
  );
};

export const PathCheck = ({ lab, items, onReset }: { lab: PathLabId; items: CheckItem[]; onReset: () => void }) => {
  const { t } = useTranslation();
  const next = nextStep(lab);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-testid={`path-check-${lab}`}
      className="rounded-xl border border-border bg-card/60 p-4 md:p-5 space-y-3">
      <h4 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <HelpCircle className="w-4 h-4 text-gold" aria-hidden /> {t("path.checkTitle")}
      </h4>
      <p className="text-[11px] text-muted-foreground">{t("path.checkHint")}</p>
      <ol className="space-y-2">
        {items.map((it, i) => <CheckQuestion key={it.id} lab={lab} item={it} index={i} />)}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button type="button" onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-gold hover:border-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          <RotateCcw className="w-3.5 h-3.5" aria-hidden /> {t("path.reset")}
        </button>
        {next ? (
          <Link to={next.to} data-testid="path-next"
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-mono uppercase tracking-wider text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2">
            {t("path.next", { name: t(`path.${next.id}.short`) })} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Link to={TEACHING_PATH[0].to} className="text-xs font-mono text-muted-foreground hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded">
              {t("path.restart")}
            </Link>
            <Link to={PATH_HOME} data-testid="path-next"
              className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-mono uppercase tracking-wider text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2">
              {t("path.review")} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
