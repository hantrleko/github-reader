import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { motion } from "framer-motion";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { GLOSSARY, CATEGORY_LABELS, type GlossaryTerm } from "@/data/glossary";
import { TOOLS_BY_ID } from "@/data/toolsCatalog";
import { REFS } from "@/lib/citations";
import { formatAPA } from "@/lib/citationFormat";

const CATS = ["all", ...Object.keys(CATEGORY_LABELS)] as const;
type CatKey = typeof CATS[number];

const Glossary = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CatKey>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GLOSSARY.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!needle) return true;
      return (
        t.zh.toLowerCase().includes(needle) ||
        t.en.toLowerCase().includes(needle) ||
        t.slug.includes(needle) ||
        t.def.toLowerCase().includes(needle)
      );
    });
  }, [q, cat]);

  return (
    <div className="min-h-screen bg-background">
      <Seo title="术语表 · EF Lab" description="量化金融与计量经济学术语速查：含公式、相关工具与参考文献。" path="/glossary" />
      <Navbar />
      <main id="main-content" className="container max-w-5xl pt-20 pb-24 px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 返回首页
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 border-b border-border pb-8"
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-2">
            Glossary · 术语词典
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3">
            金融与计量术语表
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            汇集平台所有工具中的核心概念。每条词条附定义、关键公式、相关工具与原始文献,便于在公式与代码之间往返。
          </p>
        </motion.header>

        {/* Search + filters */}
        <div className="mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索术语、中文、英文、定义……"
              className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  cat === c
                    ? "bg-gold/15 text-gold border border-gold/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {c === "all" ? "全部" : CATEGORY_LABELS[c as GlossaryTerm["category"]]}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-mono text-muted-foreground self-center">
              {filtered.length} / {GLOSSARY.length}
            </span>
          </div>
        </div>

        {/* Terms */}
        <div className="grid gap-4">
          {filtered.map((t, i) => (
            <motion.article
              key={t.slug}
              id={t.slug}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
              className="rounded-lg border border-border bg-card p-5 hover:border-gold/40 transition-colors"
            >
              <header className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                <div>
                  <h2 className="text-lg md:text-xl font-display font-semibold text-foreground">
                    {t.zh}
                  </h2>
                  <p className="text-xs font-mono text-muted-foreground">{t.en}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                  {CATEGORY_LABELS[t.category]}
                </span>
              </header>

              <p className="text-sm text-foreground/90 leading-relaxed mb-3">{t.def}</p>

              {t.formula && (
                <div className="mb-3 rounded bg-secondary/50 border border-border px-4 py-2 overflow-x-auto">
                  <BlockMath math={t.formula} />
                </div>
              )}

              {(t.tools?.length || t.refs?.length) ? (
                <footer className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                  {t.tools?.map((tid) => {
                    const tool = TOOLS_BY_ID[tid];
                    if (!tool) return null;
                    return (
                      <a
                        key={tid}
                        href={tool.anchor}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
                      >
                        → {tool.name}
                      </a>
                    );
                  })}
                  {t.refs?.map((rid) => {
                    const r = REFS[rid];
                    if (!r) return null;
                    return (
                      <span
                        key={rid}
                        title={formatAPA(r)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border cursor-help"
                      >
                        {r.authors.split(",")[0].split(" ")[0]} ({r.year})
                      </span>
                    );
                  })}
                </footer>
              ) : null}
            </motion.article>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">无匹配术语</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Glossary;