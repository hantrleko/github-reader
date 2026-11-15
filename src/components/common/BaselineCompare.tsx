import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pin, X } from "lucide-react";
import { FLOAT_AVOID_ATTR } from "@/hooks/useAvoidOverlap";
import { PATH_RESET_EVENT } from "@/components/common/TeachingPath";
import type { PathLabId } from "@/lib/teachingPath";
import {
  COMPARE_METRICS, COMPARE_PARAMS, changedParams, compareRow, fmtParam, type Snapshot, type Values,
} from "@/lib/baselineCompare";

/**
 * "Baseline vs current" panel for a teaching-path lab. The lab passes its
 * current inputs and the results it already computed; the visitor pins them,
 * changes inputs, and reads baseline / current / difference per result.
 * Reset (either teaching-path Reset button) clears the baseline.
 */
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const BTN = `inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-mono ${FOCUS}`;

const Missing = ({ label }: { label: string }) => (
  <><span aria-hidden>—</span><span className="sr-only">{label}</span></>
);

export const BaselineCompare = ({ lab, params, metrics }: { lab: PathLabId; params: Record<string, number>; metrics: Values }) => {
  const { t } = useTranslation();
  const headingId = useId();
  const [baseline, setBaseline] = useState<Snapshot | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const onReset = (e: Event) => {
      if ((e as CustomEvent<PathLabId>).detail === lab) { setBaseline(null); setAnnounce(""); }
    };
    window.addEventListener(PATH_RESET_EVENT, onReset);
    return () => window.removeEventListener(PATH_RESET_EVENT, onReset);
  }, [lab]);

  const pin = () => { setBaseline({ params: { ...params }, metrics: { ...metrics } }); setAnnounce("compare.announcePinned"); };
  const clear = () => { setBaseline(null); setAnnounce("compare.announceCleared"); };

  const paramSpecs = COMPARE_PARAMS[lab];
  const changed = useMemo(() => (baseline ? changedParams(baseline.params, params) : []), [baseline, params]);
  const changedText = changed
    .map((id) => {
      const spec = paramSpecs.find((p) => p.id === id);
      if (!spec || !baseline) return id;
      return `${t(spec.labelKey)} ${fmtParam(spec, baseline.params[id])} → ${fmtParam(spec, params[id])}`;
    })
    .join(t("compare.listSep", { defaultValue: "; " }));
  const ppUnit = t("compare.ppUnit");
  const missing = t("compare.missing");

  return (
    <section aria-labelledby={headingId} data-testid={`compare-${lab}`} data-baseline={baseline ? "pinned" : "none"} {...{ [FLOAT_AVOID_ATTR]: "" }}
      className={`min-w-0 rounded-xl border p-4 md:p-5 space-y-3 break-words ${baseline ? "border-gold/40 bg-gold/5" : "border-border bg-card/60"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={headingId} className="text-sm font-semibold text-foreground">{t("compare.title")}</h4>
        <span data-testid="compare-status"
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono ${baseline ? "border-gold/50 text-gold" : "border-border text-muted-foreground"}`}>
          {baseline ? t("compare.statusPinned") : t("compare.statusNone")}
        </span>
      </div>
      {!baseline && <p className="text-[13px] sm:text-xs text-muted-foreground leading-relaxed">{t("compare.hintNone")}</p>}

      {baseline && (
        <>
          <div aria-live="polite" data-testid="compare-changed" className="text-[13px] sm:text-xs leading-relaxed text-foreground/85">
            {changed.length === 0 ? (
              <p>{t("compare.same")}</p>
            ) : (
              <>
                <p>{changed.length === 1 ? t("compare.changedOne", { list: changedText }) : t("compare.changedMany", { count: changed.length, list: changedText })}</p>
                {changed.length > 1 && <p data-testid="compare-joint" className="mt-1 text-gold">{t("compare.jointNote")}</p>}
              </>
            )}
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px] sm:text-xs" data-testid="compare-table">
              <caption className="sr-only">{t("compare.caption")}</caption>
              <thead>
                <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2 pr-2 font-normal">{t("compare.colMetric")}</th>
                  <th scope="col" className="py-2 px-2 font-normal text-right">{t("compare.colBaseline")}</th>
                  <th scope="col" className="py-2 px-2 font-normal text-right text-gold">{t("compare.colCurrent")}</th>
                  <th scope="col" className="py-2 pl-2 font-normal text-right">{t("compare.colDiff")}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_METRICS[lab].map((spec) => {
                  const row = compareRow(spec, baseline.metrics[spec.id], metrics[spec.id], ppUnit);
                  return (
                    <tr key={spec.id} data-testid={`compare-row-${spec.id}`} className="border-b border-border/50 align-top">
                      <th scope="row" className="py-2 pr-2 font-normal text-foreground/85">{t(spec.labelKey)}</th>
                      <td data-testid="cell-base" className="py-2 px-2 text-right font-mono tabular-nums text-muted-foreground whitespace-nowrap">{row.base ?? <Missing label={missing} />}</td>
                      <td data-testid="cell-cur" className="py-2 px-2 text-right font-mono tabular-nums text-foreground whitespace-nowrap">{row.cur ?? <Missing label={missing} />}</td>
                      <td className="py-2 pl-2 text-right">
                        <span data-testid="cell-diff" className="block font-mono tabular-nums text-foreground">
                          {row.diff === null ? <Missing label={missing} /> : row.kind === "pp" ? (
                            // keep the number and the unit each unbroken on narrow screens
                            <><span className="whitespace-nowrap">{row.diff.slice(0, -ppUnit.length - 1)}</span> <span className="whitespace-nowrap">{ppUnit}</span></>
                          ) : <span className="whitespace-nowrap">{row.diff}</span>}
                        </span>
                        <span data-testid="cell-kind" className="block text-[10px] font-mono text-muted-foreground">{t(`compare.kind.${row.kind}`)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{t("compare.legend")}</p>
        </>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-1">
        <button type="button" onClick={pin} data-testid="compare-pin"
          className={`${BTN} border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20`}>
          <Pin className="w-3.5 h-3.5 shrink-0" aria-hidden /> {baseline ? t("compare.repin") : t("compare.pin")}
        </button>
        {baseline && (
          <button type="button" onClick={clear} data-testid="compare-clear"
            className={`${BTN} border border-border text-muted-foreground hover:text-gold hover:border-gold/40`}>
            <X className="w-3.5 h-3.5 shrink-0" aria-hidden /> {t("compare.clear")}
          </button>
        )}
        <p className="text-[11px] text-muted-foreground leading-relaxed sm:ml-auto">{t("compare.resetRule")}</p>
      </div>
      <p className="sr-only" aria-live="polite">{announce ? t(announce) : ""}</p>
    </section>
  );
};

export default BaselineCompare;
