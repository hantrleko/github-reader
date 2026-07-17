import { useState } from "react";
import { useQuiverSignals } from "@/lib/marketData";
import SectionHeader from "@/components/common/SectionHeader";
import { ExternalLink, Loader2, Info } from "lucide-react";

const QuiverSignalsCard = () => {
  const [kind, setKind] = useState<"congress" | "wsb">("congress");
  const { data, isFetching } = useQuiverSignals(kind);
  const configured = data && (data as { configured?: boolean }).configured;
  const items = configured ? ((data as { items?: unknown[] }).items ?? []) : [];

  return (
    <section className="pb-12">
      <SectionHeader chapter="Data" kicker="Quiver · Alt Data" title="另类数据信号"
        subtitle="议员交易、WSB 散户热度等另类数据线索。免费概览需配置 QUIVER_API_KEY;未配置时提供直达 Quiver 网站的入口。" />
      <div className="container max-w-4xl px-6 space-y-3">
        <div className="flex gap-2">
          {(["congress", "wsb"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className={"px-3 py-1 text-xs rounded border " + (kind === k ? "border-gold/60 bg-gold/10 text-gold" : "border-border/60 text-muted-foreground")}>
              {k === "congress" ? "议员交易" : "WSB 热度"}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4 min-h-[160px]">
          {isFetching ? (
            <div className="py-8 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
            </div>
          ) : !configured ? (
            <div className="text-sm text-foreground space-y-2">
              <p className="inline-flex items-center gap-2"><Info className="w-4 h-4 text-gold" /> 未配置 <code className="text-gold">QUIVER_API_KEY</code>。</p>
              <p className="text-muted-foreground text-xs">在 Lovable Cloud → Secrets 中添加 QUIVER_API_KEY 后即可开启议员交易 / WSB 热度概览。</p>
              <a href="https://www.quiverquant.com/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gold hover:underline">
                前往 Quiver Quantitative <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : items.length ? (
            <ul className="text-xs divide-y divide-border/40">
              {items.slice(0, 15).map((it, i) => (
                <li key={i} className="py-1.5 font-mono text-foreground/80 truncate">{JSON.stringify(it).slice(0, 220)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">暂无数据。</p>
          )}
        </div>
      </div>
    </section>
  );
};
export default QuiverSignalsCard;