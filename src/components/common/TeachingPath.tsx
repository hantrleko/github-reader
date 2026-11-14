import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronDown, HelpCircle, RotateCcw } from "lucide-react";
import { TEACHING_PATH, PATH_HOME, nextStep, pathIndex, type CheckItem, type PathLabId } from "@/lib/teachingPath";

/**
 * Teaching-path chrome shared by the three path labs: an intro block (question,
 * default scenario, assumptions/limits) above the controls, and a check block
 * (comprehension questions with scenario-specific reasons, reset, next step)
 * below the charts.
 *
 * Layout rules (phones down to 360px): every control is at least 44px tall,
 * text wraps instead of overflowing, actions stack full-width below `sm`, and
 * focus rings are offset so they stay visible on the tinted backgrounds.
 */
const FOCUS = "scroll-my-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const SECONDARY_BTN = `inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs font-mono text-muted-foreground hover:text-gold hover:border-gold/40 ${FOCUS}`;
const PRIMARY_BTN = `inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-lg sm:rounded-full bg-gold px-5 py-2 text-center text-xs font-mono uppercase tracking-wide text-background hover:opacity-90 ${FOCUS}`;

export const PathIntro = ({ lab, onReset }: { lab: PathLabId; onReset: () => void }) => {
  const { t } = useTranslation();
  const idx = pathIndex(lab);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-testid={`path-intro-${lab}`}
      className="min-w-0 rounded-xl border border-gold/30 bg-gold/5 p-4 md:p-5 space-y-4 break-words">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">
          {t("path.stepOf", { n: idx + 1, total: TEACHING_PATH.length })}
        </p>
        <ol className="flex flex-wrap items-center gap-2" aria-label={t("path.stepsAria")}>
          {TEACHING_PATH.map((s, i) => (
            <li key={s.id}>
              <Link to={s.to} aria-current={i === idx ? "step" : undefined}
                className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-mono border ${FOCUS} ${i === idx ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground hover:text-gold"}`}>
                {i + 1}. {t(`path.${s.id}.short`)}
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <h3 id={headingId} className="font-display text-lg md:text-xl text-foreground leading-snug">
        {t(`path.${lab}.question`)}
      </h3>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] sm:text-xs leading-relaxed">
        <div className="min-w-0">
          <dt className="font-mono uppercase tracking-wider text-[10px] text-gold/80">{t("path.defaultLabel")}</dt>
          <dd className="mt-1 text-foreground/80">{t(`path.${lab}.default`)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono uppercase tracking-wider text-[10px] text-gold/80">{t("path.limitsLabel")}</dt>
          <dd className="mt-1 text-foreground/80">{t(`path.${lab}.limits`)}</dd>
        </div>
      </dl>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 border-t border-gold/20 pt-3">
        <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{t("path.simulated")}</p>
        <button type="button" onClick={onReset} data-testid="path-reset" className={SECONDARY_BTN}>
          <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden /> {t("path.reset")}
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
    <li className="min-w-0 rounded-lg border border-border bg-secondary/30 p-3 sm:p-4">
      <p className="text-sm text-foreground leading-relaxed">
        <span className="font-mono text-gold mr-1.5">Q{index + 1}.</span>
        {t(`path.${lab}.q.${item.id}`)}
      </p>
      <button type="button" aria-expanded={open} aria-controls={answerId} onClick={() => setOpen((o) => !o)}
        className={`mt-3 inline-flex min-h-11 w-full sm:w-auto items-center justify-center sm:justify-start gap-1.5 rounded-md border border-gold/30 bg-gold/5 px-4 py-2 text-xs font-mono text-gold hover:bg-gold/10 ${FOCUS}`}>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        {open ? t("path.hideAnswer") : t("path.showAnswer")}
      </button>
      <p id={answerId} hidden={!open} aria-live="polite"
        className="mt-3 border-l-2 border-gold/50 pl-3 text-[13px] sm:text-xs text-foreground/85 leading-relaxed">
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
      className="min-w-0 rounded-xl border border-border bg-card/60 p-4 md:p-5 space-y-4 break-words">
      <div className="space-y-1">
        <h4 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <HelpCircle className="w-4 h-4 shrink-0 text-gold" aria-hidden /> {t("path.checkTitle")}
        </h4>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{t("path.checkHint")}</p>
      </div>
      <ol className="space-y-3">
        {items.map((it, i) => <CheckQuestion key={it.id} lab={lab} item={it} index={i} />)}
      </ol>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 border-t border-border/60 pt-4">
        <button type="button" onClick={onReset} data-testid="path-reset" className={SECONDARY_BTN}>
          <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden /> {t("path.reset")}
        </button>
        {next ? (
          <Link to={next.to} data-testid="path-next" className={PRIMARY_BTN}>
            <span>{t("path.next", { name: t(`path.${next.id}.short`) })}</span> <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden />
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <Link to={TEACHING_PATH[0].to} data-testid="path-restart" className={SECONDARY_BTN}>
              {t("path.restart")}
            </Link>
            <Link to={PATH_HOME} data-testid="path-next" className={PRIMARY_BTN}>
              <span>{t("path.review")}</span> <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
