import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Database, Loader2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
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
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
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
      setFetchedAt(Date.now());
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

  /** 离线兜底:用合成示例数据避免阻塞使用 */
  const handleUseSample = () => {
    onApply({ S0: 180, sigma: 0.25, symbol: `${symbol || "DEMO"}*`, annualReturn: 0.12 });
    setFetchedAt(Date.now());
    toast({ title: t("labs.realDataLoader.text1", { defaultValue: "已加载示例数据" }), description: t("labs.realDataLoader.text2", { defaultValue: "S₀=180, σ=25%, μ=12% · 仅供演示" }) });
  };

  const fmtTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return t("labs.realDataLoader.secondsAgo", { defaultValue: "{{count}}s 前", count: diff });
    if (diff < 3600) return t("labs.realDataLoader.minutesAgo", { defaultValue: "{{count}}m 前", count: Math.floor(diff / 60) });
    return new Date(ts).toLocaleTimeString();
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
      {/* 数据来源徽章 */}
      <span
        className="px-1.5 py-0.5 rounded border border-border/60 text-[9px] uppercase tracking-wider text-muted-foreground"
        title={t("labs.realDataLoader.text3", { defaultValue: "数据来源:Yahoo Finance,经 Lovable Cloud Edge Function 代理" })}
      >
        Yahoo
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
        <span className="flex items-center gap-1 text-gold">
          <CheckCircle2 className="w-3 h-3" />
          {data.symbol} ${data.lastPrice?.toFixed(2)} · σ={(data.annualVol * 100).toFixed(1)}%
          {fetchedAt && (
            <span className="text-muted-foreground ml-1">· {fmtTime(fetchedAt)}</span>
          )}
        </span>
      )}
      {active && error && (
        <>
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="w-3 h-3" />
            {t("realData.fail")}
          </span>
          <button
            onClick={handleUseSample}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
            title={t("labs.realDataLoader.text4", { defaultValue: "使用合成示例数据,确保功能不被网络阻塞" })}
          >
            <Sparkles className="w-3 h-3" /> {t("labs.realDataLoader.text5", { defaultValue: "使用示例数据" })}
          </button>
        </>
      )}
      <span className="ml-auto text-[9px] text-muted-foreground/70 hidden md:inline">
        {t("realData.tip")}
      </span>
    </div>
  );
};

export default RealDataLoader;
