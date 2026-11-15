import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { renderMsg, type Explanation, type Msg } from "@/lib/baselineExplain";

/**
 * Compact, foldable explanation under the baseline-vs-current table. The
 * summary is always visible; observed numbers, the conditional theory note and
 * the "do not conclude" list stay collapsed until the reader opens them.
 */
const List = ({ title, items, id, t }: { title: string; items: Msg[]; id: string; t: (k: string, o?: Record<string, unknown>) => string }) =>
  items.length === 0 ? null : (
    <div data-testid={`explain-${id}`}>
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {items.map((m, i) => <li key={`${m.key}-${i}`}>{renderMsg(t, m)}</li>)}
      </ul>
    </div>
  );

export const BaselineExplain = ({ explanation }: { explanation: Explanation }) => {
  const { t } = useTranslation();
  const e = explanation;
  const hasDetails = e.observed.length + e.theory.length + e.limits.length > 0;
  return (
    <div data-testid="compare-explain" data-kind={e.kind}
      className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-[13px] sm:text-xs leading-relaxed text-foreground/85">
      <p data-testid="explain-summary">{renderMsg(t, e.summary)}</p>
      {hasDetails && (
        <details data-testid="explain-details" className="group mt-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-mono text-[12px] text-gold rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            {t("compare.explain.toggle")}
          </summary>
          <div className="space-y-3 pb-1 pt-1">
            <List id="observed" title={t("compare.explain.observedTitle")} items={e.observed} t={t} />
            <List id="theory" title={t("compare.explain.theoryTitle")} items={e.theory} t={t} />
            <List id="limits" title={t("compare.explain.limitsTitle")} items={e.limits} t={t} />
          </div>
        </details>
      )}
    </div>
  );
};

export default BaselineExplain;
