/**
 * /gallery — public notebook gallery. Lists all `is_public` notebooks with
 * cell composition, so visitors can open / fork community work.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SectionHeader from "@/components/common/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Loader2, NotebookPen, Search, SlidersHorizontal, Sigma, BarChart3, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicNotebook {
  id: string;
  title: string;
  cells: unknown;
  updated_at: string;
  user_id: string;
}

function cellSummary(cells: unknown): { total: number; params: number; formulas: number; charts: number; code: number } {
  const arr = Array.isArray(cells) ? (cells as { kind?: string }[]) : [];
  return {
    total: arr.length,
    params: arr.filter((c) => c.kind === "param").length,
    formulas: arr.filter((c) => c.kind === "formula").length,
    charts: arr.filter((c) => c.kind === "chart").length,
    code: arr.filter((c) => c.kind === "js" || c.kind === "python").length,
  };
}

const Gallery = () => {
  const [items, setItems] = useState<PublicNotebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("user_notebooks")
        .select("id,title,cells,updated_at,user_id")
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(60);
      if (!error && data) setItems(data as PublicNotebook[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((n) => n.title.toLowerCase().includes(term));
  }, [items, q]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Notebook 画廊 · EF Lab"
        description="社区公开的反应式金融 Notebook 画廊:浏览他人分享的定价推导、回测实验与计量分析,一键 Fork 到自己的工作区继续研究。"
        path="/gallery"
      />
      <Navbar />
      <main id="main-content" className="pt-14">
        <SectionHeader
          chapter="Community"
          kicker="PUBLIC GALLERY"
          title="Notebook 画廊"
          subtitle="社区公开的研究笔记本 — 打开即可交互,登录后可 Fork 到自己的工作区继续修改。"
        />

        <section className="container max-w-5xl px-6 pb-16 space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索标题…"
              className="w-full bg-background border border-border/60 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中…
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-border/60 bg-card/40 p-10 text-center space-y-3">
              <Globe className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {q ? "没有匹配的 Notebook" : "还没有公开的 Notebook — 在 Notebook 编辑器把开关设为 Public 即可出现在这里。"}
              </p>
              <Link to="/notebook" className="inline-flex items-center gap-1 text-gold text-xs font-mono underline">
                <NotebookPen className="w-3.5 h-3.5" /> 去创建我的 Notebook
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((n) => {
                const s = cellSummary(n.cells);
                return (
                  <Link
                    key={n.id}
                    to={`/notebook?id=${n.id}`}
                    className={cn(
                      "group border border-border/60 bg-card/40 p-4 flex flex-col gap-3",
                      "hover:border-gold/50 transition-colors"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base text-foreground group-hover:text-gold transition-colors line-clamp-2">
                        {n.title}
                      </h3>
                      <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-1" />
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><SlidersHorizontal className="w-3 h-3" />{s.params} 参数</span>
                      <span className="inline-flex items-center gap-1"><Sigma className="w-3 h-3" />{s.formulas} 公式</span>
                      <span className="inline-flex items-center gap-1"><BarChart3 className="w-3 h-3" />{s.charts} 图表</span>
                      <span className="inline-flex items-center gap-1"><Code2 className="w-3 h-3" />{s.code} 代码</span>
                    </div>
                    <p className="mt-auto text-[10px] font-mono text-muted-foreground">
                      {s.total} cells · 更新于 {new Date(n.updated_at).toLocaleDateString()}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Gallery;
