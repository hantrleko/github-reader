import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SectionHeader from "@/components/common/SectionHeader";
import { ExternalLink } from "lucide-react";

const SECTORS = [
  { s: "XLK", name: "Technology" }, { s: "XLF", name: "Financials" },
  { s: "XLE", name: "Energy" }, { s: "XLV", name: "Health Care" },
  { s: "XLY", name: "Cons. Disc." }, { s: "XLP", name: "Cons. Staples" },
  { s: "XLI", name: "Industrials" }, { s: "XLU", name: "Utilities" },
  { s: "XLB", name: "Materials" }, { s: "XLRE", name: "Real Estate" },
  { s: "XLC", name: "Comm. Svcs." },
];

async function fetchOne(symbol: string) {
  const url = `https://oshfqmmhxaaevucfdunk.supabase.co/functions/v1/market-quotes?symbol=${encodeURIComponent(symbol)}&range=1mo`;
  const r = await fetch(url, { headers: { apikey: (supabase as unknown as { supabaseKey?: string }).supabaseKey ?? "" } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<{ closes: number[]; lastPrice: number }>;
}

const SectorHeatmap = () => {
  const qs = useQueries({
    queries: SECTORS.map((s) => ({
      queryKey: ["sector-heatmap", s.s],
      queryFn: () => fetchOne(s.s),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const cells = SECTORS.map((s, i) => {
    const d = qs[i].data;
    const closes = d?.closes ?? [];
    const pct = closes.length > 1 ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 : null;
    return { ...s, pct };
  });

  return (
    <section className="pb-12">
      <SectionHeader chapter="Data" kicker="Sector Heatmap" title="板块热力图 (1M)"
        subtitle="用 11 只 SPDR 行业 ETF 的 1 个月涨跌可视化板块轮动。数据自采 (Yahoo),Finviz 风格。" />
      <div className="container max-w-4xl px-6 space-y-3">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {cells.map((c) => {
            const p = c.pct;
            const bg = p == null ? "hsl(var(--muted) / 0.3)"
              : p > 0 ? `hsl(160 60% ${Math.max(20, 45 - Math.abs(p) * 2)}%)`
              : `hsl(0 65% ${Math.max(25, 50 - Math.abs(p) * 2)}%)`;
            return (
              <div key={c.s} className="rounded-md p-3 text-center" style={{ background: bg }}>
                <p className="text-[10px] font-mono uppercase text-white/80">{c.s}</p>
                <p className="text-xs text-white font-display mt-0.5">{c.name}</p>
                <p className="text-sm font-mono tabular-nums text-white mt-1">
                  {p == null ? "—" : (p >= 0 ? "+" : "") + p.toFixed(2) + "%"}
                </p>
              </div>
            );
          })}
        </div>
        <a href="https://finviz.com/map.ashx" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-gold hover:underline">
          在 Finviz 打开完整热力图 <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </section>
  );
};
export default SectorHeatmap;