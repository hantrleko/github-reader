import { useState } from "react";
import { WORKBENCHES } from "@/data/externalWorkbenchLinks";
import SectionHeader from "@/components/common/SectionHeader";
import { ExternalLink } from "lucide-react";

const ExternalWorkbench = () => {
  const [ticker, setTicker] = useState("AAPL");
  return (
    <section className="pb-12">
      <SectionHeader chapter="Data" kicker="External Workbench" title="外部分析工作台"
        subtitle="精选 10 个每天真正在用的研究站点。输入代码后所有卡片链接自动带上该 ticker,一键跨站研究。" />
      <div className="container max-w-6xl px-6 space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Ticker</label>
          <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-40 rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-sm font-mono uppercase" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {WORKBENCHES.map((w) => (
            <a key={w.id} href={w.link(ticker)} target="_blank" rel="noopener noreferrer"
              className="group rounded-xl border border-border/60 bg-card/40 p-4 hover:border-gold/40 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base text-foreground group-hover:text-gold transition-colors">{w.name}</h3>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-gold" />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{w.host}</p>
              <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{w.desc}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {w.tags.map((t) => (
                  <span key={t} className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">{t}</span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
export default ExternalWorkbench;