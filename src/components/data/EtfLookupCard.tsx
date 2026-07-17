import { useState } from "react";
import { Search, ExternalLink, Loader2 } from "lucide-react";
import { useEtfLookup } from "@/lib/marketData";
import SectionHeader from "@/components/common/SectionHeader";

const EtfLookupCard = () => {
  const [ticker, setTicker] = useState("SPY");
  const [query, setQuery] = useState("SPY");
  const { data, isFetching } = useEtfLookup(query, !!query);

  return (
    <section className="pb-12">
      <SectionHeader chapter="Data" kicker="ETF Database" title="ETF 查询"
        subtitle="输入 ETF 代码,拉取 etfdb.com 上的费率、AUM、类别与 YTD 收益,并直达详情页。" />
      <div className="container max-w-4xl px-6 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); setQuery(ticker.toUpperCase()); }}
          className="flex gap-2">
          <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="e.g. SPY, QQQ, VOO"
            className="flex-1 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm font-mono uppercase" />
          <button type="submit" className="rounded-md border border-gold/60 bg-gold/10 text-gold px-4 py-2 text-sm inline-flex items-center gap-1.5">
            <Search className="w-4 h-4" /> 查询
          </button>
        </form>
        <div className="rounded-xl border border-border bg-card/40 p-4 min-h-[180px]">
          {isFetching ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> 抓取中…
            </div>
          ) : data ? (
            <div>
              <h3 className="font-display text-xl text-foreground">{data.name || data.ticker}</h3>
              <p className="text-xs text-muted-foreground mt-1">{data.issuer || "—"} · {data.category || "—"}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                {[
                  ["费率", data.expenseRatio],
                  ["AUM", data.aum],
                  ["YTD", data.ytd],
                  ["股息率", data.dividendYield],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md border border-border/60 p-2">
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">{k}</p>
                    <p className="text-sm font-mono tabular-nums text-foreground mt-1">{v || "—"}</p>
                  </div>
                ))}
              </div>
              <a href={data.url} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-gold hover:underline">
                在 ETF Database 打开 <ExternalLink className="w-3 h-3" />
              </a>
              {data.upstreamOk === false && (
                <p className="mt-2 text-[10px] text-destructive">上游抓取受限,建议直接前往 ETF Database。</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">输入 ETF 代码并查询。</p>
          )}
        </div>
      </div>
    </section>
  );
};
export default EtfLookupCard;