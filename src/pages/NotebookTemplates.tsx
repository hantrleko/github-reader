import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SectionHeader from "@/components/common/SectionHeader";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { awardBadge } from "@/lib/achievements";
import { NOTEBOOK_TEMPLATES, TEMPLATE_CATEGORIES, type TemplateCategory } from "@/data/notebookTemplates";
import { cn } from "@/lib/utils";
import { ArrowUpRight, GitFork, Sparkles, BookOpen } from "lucide-react";

const DIFFICULTY_TINT: Record<string, string> = {
  Beginner:     "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  Intermediate: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  Advanced:     "text-rose-400 border-rose-500/30 bg-rose-500/5",
};

const NotebookTemplates = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cat, setCat] = useState<TemplateCategory | "All">("All");
  const [busy, setBusy] = useState<string | null>(null);

  const list = useMemo(
    () => (cat === "All" ? NOTEBOOK_TEMPLATES : NOTEBOOK_TEMPLATES.filter((item) => item.category === cat)),
    [cat]
  );

  const forkTemplate = async (slug: string) => {
  
    const tpl = NOTEBOOK_TEMPLATES.find((item) => item.slug === slug);
    if (!tpl) return;
    if (!user) {
      toast({ title: t("pages.notebookTemplates.copy1", { defaultValue: "请先登录后再 Fork" }), description: t("pages.notebookTemplates.copy2", { defaultValue: "登录后即可保存到云端并继续编辑。" }) });
      navigate(`/auth?redirect=/notebook/templates`);
      return;
    }
    setBusy(slug);
    const { data, error } = await supabase
      .from("user_notebooks")
      .insert({
        user_id: user.id,
        title: `${tpl.title} (template fork)`,
        cells: tpl.cells as any,
        is_public: false,
      })
      .select()
      .single();
    setBusy(null);
    if (error) {
      toast({ title: t("pages.notebookTemplates.copy3", { defaultValue: "Fork 失败" }), description: error.message, variant: "destructive" });
      return;
    }
    awardBadge("notebook-forked");
    toast({ title: t("pages.notebookTemplates.copy4", { defaultValue: "已 Fork 到我的 Notebook" }), description: tpl.title });
    navigate(`/notebook?id=${data.id}`);
  };

  const preview = (slug: string) => navigate(`/notebook?template=${slug}`);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={t("pages.notebookTemplates.copy5", { defaultValue: "Notebook 模板市场 · EF Lab" })}
        description={t("pages.notebookTemplates.copy6", { defaultValue: "Black-Scholes、CAPM、参数 VaR、债券久期、Merton 跳跃扩散、GARCH(1,1) 等经典量化金融模板,一键 Fork 即可在 Reactive Notebook 中改参运行。" })}
        path="/notebook/templates"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "EF Lab Notebook Templates",
          numberOfItems: NOTEBOOK_TEMPLATES.length,
        }}
      />
      <Navbar />
      <main id="main-content" className="pt-14">
        <SectionHeader
          chapter="Chapter T"
          kicker="TEMPLATE MARKETPLACE"
          title={t("pages.notebookTemplates.copy7", { defaultValue: "Notebook 模板市场" })}
          subtitle={t("pages.notebookTemplates.copy8", { defaultValue: "对标 Observable / Wolfram · 经典量化金融模型一键 Fork,改参即跑,直接进入 Reactive Notebook。" })}
        />
        <section className="container max-w-6xl px-6 pb-16">
          {/* category filter */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-accent/20 pb-4">
            {(["All", ...TEMPLATE_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c as any)}
                className={cn(
                  "px-3 py-1 text-[11px] font-mono uppercase tracking-[0.15em] border transition-colors",
                  cat === c
                    ? "border-gold text-gold bg-gold/5"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((term) => {
  
              const paramCount = t.cells.filter((c) => c.kind === "param").length;
              const chartCount = t.cells.filter((c) => c.kind === "chart").length;
              return (
                <li
                  key={t.slug}
                  className="group relative border border-border/60 bg-card/30 p-5 hover:border-gold/50 transition-colors flex flex-col"
                >
                  <header className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">
                      {t.category}
                    </p>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.12em] border",
                        DIFFICULTY_TINT[t.difficulty]
                      )}
                    >
                      {t.difficulty}
                    </span>
                  </header>

                  <h3 className="font-display text-lg text-foreground mb-1.5 leading-snug">
                    {t.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4 flex-1">{t.tagline}</p>

                  <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground/80 mb-4 border-t border-accent/20 pt-3">
                    <span>📐 {paramCount} params</span>
                    <span>📊 {chartCount} chart{chartCount === 1 ? "" : "s"}</span>
                  </div>

                  <p className="text-[10px] font-mono text-muted-foreground/60 mb-3 italic">
                    {t.citation}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => forkTemplate(t.slug)}
                      disabled={busy === t.slug}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono bg-gold text-emerald-950 hover:bg-gold/90 transition-colors disabled:opacity-50"
                    >
                      <GitFork className="w-3.5 h-3.5" />
                      {busy === t.slug ? "Forking…" : "Fork"}
                    </button>
                    <button
                      onClick={() => preview(t.slug)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono border border-border/60 text-foreground/80 hover:text-gold hover:border-gold/50 transition-colors"
                      title={t("pages.notebookTemplates.copy9", { defaultValue: "无需登录,在编辑器中预览" })}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Preview
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-10 text-[11px] font-mono text-muted-foreground border-t border-accent/20 pt-4 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-gold/70" />
            {t("pages.notebookTemplates.copy10", { defaultValue: "模板基于公开学术文献整理,Fork 后归你所有,可任意修改 / 发布 / 二次分享。" })}
            <a
              href="/notebook"
              className="ml-auto inline-flex items-center gap-1 text-gold hover:underline"
            >
              {t("pages.notebookTemplates.copy11", { defaultValue: "进入空白 Notebook" })} <ArrowUpRight className="w-3 h-3" />
            </a>
          </p>
        </section>
      </main>
    </div>
  );
};

export default NotebookTemplates;