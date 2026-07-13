import { useMemo } from "react";
import { useFredSeries } from "@/lib/marketData";
import { cn } from "@/lib/utils";

const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const oneYearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);

function fmt(v: number | null, decimals = 2, suffix = "%") {
  if (v == null || !isFinite(v)) return "—";
  return v.toFixed(decimals) + suffix;
}

type IndicatorCardProps = {
  label: string;
  sublabel: string;
  value: string;
  date: string | null;
  sentiment?: "positive" | "negative" | "neutral";
  loading: boolean;
};

const IndicatorCard = ({ label, sublabel, value, date, sentiment, loading }: IndicatorCardProps) => (
  <div className="border border-accent/40 bg-card/30 p-3 space-y-1">
    <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-gold/80">{label}</p>
    <p className="text-[10px] font-mono text-muted-foreground/70">{sublabel}</p>
    {loading ? (
      <div className="h-5 w-16 bg-accent/30 animate-pulse rounded" />
    ) : (
      <p
        className={cn(
          "text-lg font-mono font-bold tabular-nums",
          sentiment === "positive" && "text-emerald-400",
          sentiment === "negative" && "text-rose-400",
          (!sentiment || sentiment === "neutral") && "text-foreground"
        )}
      >
        {value}
      </p>
    )}
    {date && !loading && (
      <p className="text-[9px] font-mono text-muted-foreground/50">{date}</p>
    )}
  </div>
);

const MacroPanel = () => {
  const fedFunds = useFredSeries("FEDFUNDS", oneYearAgo);
  const cpi = useFredSeries("CPIAUCSL", twoYearsAgo);
  const unemployment = useFredSeries("UNRATE", oneYearAgo);
  const spread = useFredSeries("T10Y2Y", oneYearAgo);
  const t10y = useFredSeries("DGS10", oneYearAgo);

  const cpiYoy = useMemo(() => {
    const d = cpi.data;
    if (!d?.values?.length || d.values.length < 13) return null;
    const latest = d.values[d.values.length - 1];
    const yearAgo = d.values[d.values.length - 13];
    if (!yearAgo || !latest) return null;
    return ((latest / yearAgo) - 1) * 100;
  }, [cpi.data]);

  const spreadVal = spread.data?.latest ?? null;
  const spreadSentiment =
    spreadVal == null ? "neutral" : spreadVal > 0 ? "positive" : "negative";

  return (
    <section>
      <header className="mb-3 flex items-baseline gap-3">
        <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold">
          宏观背景 · Macro Context
        </h2>
        <span className="text-[9px] font-mono text-muted-foreground/60">via FRED · St. Louis Fed</span>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <IndicatorCard
          label="Fed Funds Rate"
          sublabel="FEDFUNDS"
          value={fmt(fedFunds.data?.latest ?? null)}
          date={fedFunds.data?.latestDate ?? null}
          sentiment={
            (fedFunds.data?.latest ?? 0) > 4 ? "negative" : "neutral"
          }
          loading={fedFunds.isLoading}
        />
        <IndicatorCard
          label="CPI YoY"
          sublabel="CPIAUCSL · 12-month"
          value={fmt(cpiYoy)}
          date={cpi.data?.latestDate ?? null}
          sentiment={
            cpiYoy == null ? "neutral" : cpiYoy > 3 ? "negative" : cpiYoy < 2 ? "positive" : "neutral"
          }
          loading={cpi.isLoading}
        />
        <IndicatorCard
          label="Unemployment"
          sublabel="UNRATE"
          value={fmt(unemployment.data?.latest ?? null)}
          date={unemployment.data?.latestDate ?? null}
          sentiment={
            (unemployment.data?.latest ?? 0) > 5 ? "negative" :
            (unemployment.data?.latest ?? 0) < 4 ? "positive" : "neutral"
          }
          loading={unemployment.isLoading}
        />
        <IndicatorCard
          label="10Y–2Y Spread"
          sublabel="T10Y2Y · Yield Curve"
          value={fmt(spreadVal, 2)}
          date={spread.data?.latestDate ?? null}
          sentiment={spreadSentiment}
          loading={spread.isLoading}
        />
        <IndicatorCard
          label="10Y Treasury"
          sublabel="DGS10"
          value={fmt(t10y.data?.latest ?? null)}
          date={t10y.data?.latestDate ?? null}
          sentiment="neutral"
          loading={t10y.isLoading}
        />
      </div>
    </section>
  );
};

export default MacroPanel;
