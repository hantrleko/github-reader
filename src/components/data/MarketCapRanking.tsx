import { TOP_MARKET_CAP } from "@/data/topMarketCap";
import SectionHeader from "@/components/common/SectionHeader";
import { ExternalLink } from "lucide-react";

const MarketCapRanking = () => (
  <section className="pb-12">
    <SectionHeader chapter="Data" kicker="Companies Market Cap" title="全球公司市值排行 Top 50"
      subtitle="季度快照,直观对比全球最大公司的行业与国别分布。点击代码跳转 stockanalysis 详情。" />
    <div className="container max-w-5xl px-6">
      <div className="rounded-xl border border-border bg-card/40 p-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-mono uppercase text-muted-foreground border-b border-border/60">
            <tr><th className="text-left py-2 px-2">#</th><th className="text-left px-2">代码</th><th className="text-left px-2">公司</th><th className="text-left px-2">国家</th><th className="text-left px-2">行业</th><th className="text-right px-2">市值 (B USD)</th></tr>
          </thead>
          <tbody>
            {TOP_MARKET_CAP.map((r) => (
              <tr key={r.ticker} className="border-b border-border/30 hover:bg-secondary/30">
                <td className="py-1.5 px-2 text-muted-foreground">{r.rank}</td>
                <td className="px-2 font-mono text-gold">
                  <a href={`https://stockanalysis.com/stocks/${r.ticker.split(".")[0].toLowerCase()}/`} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                    {r.ticker}<ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </td>
                <td className="px-2">{r.name}</td>
                <td className="px-2 text-muted-foreground">{r.country}</td>
                <td className="px-2 text-muted-foreground">{r.sector}</td>
                <td className="px-2 text-right font-mono tabular-nums">{r.marketCapB.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Q3 2026 快照 · 实时数据请前往
        <a href="https://companiesmarketcap.com/" target="_blank" rel="noopener noreferrer" className="text-gold ml-1 hover:underline">companiesmarketcap.com</a>
      </p>
    </div>
  </section>
);
export default MarketCapRanking;