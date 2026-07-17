import { Calendar, ExternalLink, Loader2 } from "lucide-react";
import { useEconCalendar } from "@/lib/marketData";
import SectionHeader from "@/components/common/SectionHeader";

const Star = ({ n }: { n: number }) => (
  <span className="text-gold text-[10px]">{"★".repeat(n)}<span className="text-muted-foreground">{"★".repeat(3 - n)}</span></span>
);

const EconCalendarPanel = () => {
  const { data, isFetching } = useEconCalendar();
  const events = data?.events ?? [];
  return (
    <section className="pb-12">
      <SectionHeader chapter="Data" kicker="Trading Economics · Calendar" title="经济日历 · 高影响事件"
        subtitle="CPI、非农、GDP、FOMC 决议 — 未来两周的重要美国宏观数据。数据来源:Trading Economics guest API + 精选静态时间表 (作为回退)。" />
      <div className="container max-w-5xl px-6">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />未来 14 天</span>
            <a href="https://tradingeconomics.com/calendar" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gold inline-flex items-center gap-1 hover:underline">
              打开完整日历 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {isFetching && !events.length ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] font-mono uppercase text-muted-foreground border-b border-border/60">
                  <tr><th className="text-left py-2 px-2">日期</th><th className="text-left px-2">事件</th><th className="text-left px-2">分类</th><th className="text-left px-2">重要性</th><th className="text-right px-2">来源</th></tr>
                </thead>
                <tbody>
                  {events.slice(0, 30).map((e, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="py-1.5 px-2 font-mono tabular-nums">{e.date.slice(0, 10)}</td>
                      <td className="px-2 text-foreground">{e.event}</td>
                      <td className="px-2 text-muted-foreground">{e.category}</td>
                      <td className="px-2"><Star n={e.importance} /></td>
                      <td className="px-2 text-right text-[10px] text-muted-foreground">{e.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default EconCalendarPanel;