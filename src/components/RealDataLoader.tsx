import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Database, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useMarketQuotes } from "@/lib/marketData";
import { toast } from "@/hooks/use-toast";

type Props = {
  defaultSymbol?: string;
  /**
   * Called when fetch succeeds. Receives the latest spot price (S0) and
   * the annualised volatility (sigma) computed from log returns. Calculators
   * can plug these into their parameters.
   */
  onApply: (params: { S0: number; sigma: number; symbol: string; annualReturn: number }) => void;
  className?: string;
};

/** Compact toolbar that lets the user pull real Yahoo Finance data into a calculator. */
const RealDataLoader = ({ defaultSymbol = "AAPL", onApply, className }: Props) => {
  const { t } = useTranslation();
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [range, setRange] = useState("2y");
  const [active, setActive] = useState(false);
  const { data, isFetching, error, refetch } = useMarketQuotes(symbol, range, active);

  const handleFetch = async () => {
    setActive(true);
    try {
      const res = await refetch();
      if (res.error || !res.data) throw res.error || new Error("no data");
      const d = res.data;
      if (d.lastPrice == null) throw new Error("no price");
      onApply({
        S0: d.lastPrice,
        sigma: d.annualVol,
        symbol: d.symbol,
        annualReturn: d.annualReturn,
      });
      toast({
        title: t("realData.title"),
        description: t("realData.success", { n: d.n }) + " · " + t("realData.applyToParams"),
      });
    } catch (e) {
      toast({
        title: t("common.error"),
        description: t("realData.fail"),
        variant: "destructive",
      });
    }
  };

  const ok = data && !error && active;

  return (
    <div
      className={
        "flex flex-wrap items-center gap-2 p-2.5 rounded-md border border-border/60 bg-muted/30 text-[11px] font-mono " +
        (className || "")
      }
    >
      <span className="flex items-center gap-1.5 text-gold">
        <Database className="w-3.5 h-3.5" />
        {t("realData.load")}
      </span>
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 10))}
        placeholder={t("realData.symbol")}
        className="w-20 px-2 py-1 rounded bg-background border border-border focus:border-gold/60 outline-none uppercase"
      />
      <select
        value={range}
        onChange={(e) => setRange(e.target.value)}
        className="px-2 py-1 rounded bg-background border border-border focus:border-gold/60 outline-none"
      >
        <option value="6mo">6M</option>
        <option value="1y">1Y</option>
        <option value="2y">2Y</option>
        <option value="5y">5Y</option>
        <option value="10y">10Y</option>
      </select>
      <button
        onClick={handleFetch}
        disabled={isFetching}
        className="px-2.5 py-1 rounded bg-primary/90 text-primary-foreground hover:bg-primary disabled:opacity-50 flex items-center gap-1"
      >
        {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {isFetching ? t("realData.fetching") : t("realData.fetch")}
      </button>
      {ok && data && (
        <span className="flex items-center gap-1 text-emerald-500">
          <CheckCircle2 className="w-3 h-3" />
          {data.symbol} ${data.lastPrice?.toFixed(2)} · σ={(data.annualVol * 100).toFixed(1)}%
        </span>
      )}
      {active && error && (
        <span className="flex items-center gap-1 text-destructive">
          <AlertTriangle className="w-3 h-3" />
          {t("realData.fail")}
        </span>
      )}
      <span className="ml-auto text-[9px] text-muted-foreground/70 hidden md:inline">
        {t("realData.tip")}
      </span>
    </div>
  );
};

export default RealDataLoader;