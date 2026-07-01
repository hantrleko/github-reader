import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import SectionHeader from "@/components/common/SectionHeader";

interface FeaturedRow {
  id: string;
  title: string;
  updated_at: string;
  user_id: string;
  cells: unknown;
  profile?: { username: string | null; display_name: string | null } | null;
  comments?: number;
}

const FeaturedNotebooks = () => {
  const [rows, setRows] = useState<FeaturedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: nbs } = await supabase
        .from("user_notebooks")
        .select("id,title,updated_at,user_id,cells")
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(6);
      if (cancelled || !nbs) {
        setLoading(false);
        return;
      }
      const userIds = Array.from(new Set(nbs.map((n) => n.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username,display_name")
        .in("id", userIds);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      // Comment counts (Trending signal)
      const { data: discs } = await supabase
        .from("discussions")
        .select("resource_id")
        .eq("resource_type", "notebook")
        .in("resource_id", nbs.map((n) => n.id));
      const cmap = new Map<string, number>();
      (discs ?? []).forEach((d: { resource_id: string }) => {
        cmap.set(d.resource_id, (cmap.get(d.resource_id) ?? 0) + 1);
      });
      const enriched = nbs.map((n) => ({
        ...n,
        profile: map.get(n.user_id) ?? null,
        comments: cmap.get(n.id) ?? 0,
      }));
      // Sort: comments desc, then recency
      enriched.sort(
        (a, b) =>
          (b.comments ?? 0) - (a.comments ?? 0) ||
          +new Date(b.updated_at) - +new Date(a.updated_at)
      );
      setRows(enriched);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && rows.length === 0) return null;

  const cellCount = (cells: unknown) => (Array.isArray(cells) ? cells.length : 0);

  return (
    <section className="px-6 py-14 border-t border-border/40">
      <div className="container max-w-6xl">
        <SectionHeader
          chapter="Community"
          kicker="Featured Notebooks"
          title="社区精选 · 公开 Notebook"
          subtitle="从公开研究笔记中复用建模思路、参数设定与图表结构，把优秀案例 Fork 到自己的工作区继续迭代。"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl border border-border/60 bg-card/40 animate-pulse"
                />
              ))
            : rows.map((nb, i) => {
                const name =
                  nb.profile?.display_name ||
                  nb.profile?.username ||
                  "Anonymous";
                const handle = nb.profile?.username;
                return (
                  <motion.div
                    key={nb.id}
                    initial={reduce ? undefined : { opacity: 0, y: 16 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      to={`/notebook?id=${nb.id}`}
                      className="group h-full rounded-xl border border-border/60 bg-card/40 hover:bg-card hover:border-gold/40 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_hsl(var(--gold)/0.35)] transition-all duration-300 p-5 flex flex-col gap-3"
                    >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">
                      <span>Notebook</span>
                      <span className="text-muted-foreground/70 inline-flex items-center gap-2">
                        {(nb.comments ?? 0) >= 3 && (
                          <span className="text-gold">🔥 Trending</span>
                        )}
                        {cellCount(nb.cells)} cells
                      </span>
                    </div>
                    <h3 className="font-display text-lg leading-snug text-foreground group-hover:text-gold transition-colors line-clamp-2">
                      {nb.title || "Untitled Notebook"}
                    </h3>
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      {handle ? (
                        <span
                          className="hover:text-gold"
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = `/u/${handle}`;
                          }}
                        >
                          @{handle}
                        </span>
                      ) : (
                        <span>{name}</span>
                      )}
                      <span className="font-mono text-[10px]">
                        {nb.comments ? `💬 ${nb.comments} · ` : ""}
                        {new Date(nb.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    </Link>
                  </motion.div>
                );
              })}
        </div>
        <div className="mt-6 flex justify-end">
          <Link
            to="/notebook/templates"
            className="text-xs font-mono uppercase tracking-[0.18em] text-gold hover:underline"
          >
            浏览 Notebook 模板与研究脚手架 →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedNotebooks;