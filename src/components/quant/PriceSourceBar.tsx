import { useTranslation } from "react-i18next";
import { Loader2, AlertTriangle, RefreshCw, Database } from "lucide-react";
import { PRICE_SOURCES, PRICE_SOURCE_MAP, type PriceSource } from "@/lib/priceSeries";

interface Props {
  source: PriceSource;
  symbol: string;
  range: string;
  isFetching: boolean;
  error: unknown;
  n?: number;
  onSource: (s: PriceSource) => void;
  onSymbol: (s: string) => void;
  onRange: (r: string) => void;
  onRefetch: () => void;
  onUseDemo?: () => void;
}

/** Shared data-source / symbol / range control bar for the quant labs. */
export default function PriceSourceBar({
  source, symbol, range, isFetching, error, n,
  onSource, onSymbol, onRange, onRefetch, onUseDemo,
}: Props) {
  const { t } = useTranslation();
  const meta = PRICE_SOURCE_MAP[source];
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Database className="w-3.5 h-3.5 text-gold" />
        {PRICE_SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              onSource(s.id);
              onSymbol(s.defaultSymbol);
              onRange(s.defaultRange);
            }}
            className={
              "px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors " +
              (s.id === source
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">{meta.hint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={symbol}
          onChange={(e) => onSymbol(e.target.value.trim())}
          placeholder={meta.placeholder}
          className="w-40 px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-sm font-mono focus:outline-none focus:border-gold/40"
        />
        <div className="flex gap-1">
          {meta.ranges.map((r) => (
            <button
              key={r.v}
              onClick={() => onRange(r.v)}
              className={
                "px-2 py-1 rounded text-[11px] font-mono border transition-colors " +
                (r.v === range
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={onRefetch}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {t("labs.quant.priceSource.fetch")}
        </button>
        {onUseDemo && (
          <button
            onClick={onUseDemo}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-mono border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("labs.quant.priceSource.useDemo")}
          </button>
        )}
        {n != null && n > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground">{t("labs.quant.priceSource.nDays", { n })}</span>
        )}
      </div>

      {error != null && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-destructive">
          <AlertTriangle className="w-3.5 h-3.5" />
          {t("labs.quant.priceSource.fetchError")}
        </div>
      )}
    </div>
  );
}
