import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  ListOrdered,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SiteFooter from "@/components/SiteFooter";
import TopicRelated from "@/components/TopicRelated";
import { topicsData } from "@/data/topicsData";
import { sectionHref } from "@/lib/sections";
import { markKpSeen, getSeenSet, subscribeProgress } from "@/lib/topicProgress";

/** slugify a knowledge point title into a stable anchor id */
const kpId = (i: number) => `kp-${i + 1}`;

const TopicDetail = () => {
  const { t } = useTranslation();
  const { topicId } = useParams<{ topicId: string }>();
  const idx = topicsData.findIndex((item) => item.id === topicId);
  const topic = idx >= 0 ? topicsData[idx] : undefined;
  const prev = idx > 0 ? topicsData[idx - 1] : undefined;
  const next = idx >= 0 && idx < topicsData.length - 1 ? topicsData[idx + 1] : undefined;

  const [activeKp, setActiveKp] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());
  const { hash } = useLocation();

  // Deep-link support: /topic/:id#kp-N (e.g. from global search).
  useEffect(() => {
    if (!topic || !hash) return;
    const t = setTimeout(() => {
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [topic, hash]);

  // Load + subscribe to reading progress for this topic.
  useEffect(() => {
    if (!topic) return;
    const refresh = () => setSeen(getSeenSet(topic.id));
    refresh();
    return subscribeProgress(refresh);
  }, [topic]);

  // Scroll-spy: highlight the TOC entry of the knowledge point in view and
  // mark it as read for the persistent progress tracker.
  useEffect(() => {
    if (!topic) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const n = Number(e.target.id.replace("kp-", "")) - 1;
            if (!Number.isNaN(n)) {
              setActiveKp(n);
              markKpSeen(topic.id, n);
            }
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    topic.knowledgePoints.forEach((_, i) => {
      const el = document.getElementById(kpId(i));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [topic]);

  const toolCount = useMemo(
    () => topic?.knowledgePoints.filter((kp) => kp.tool).length ?? 0,
    [topic]
  );

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("pages.topicDetail.copy1", { defaultValue: "未找到该学科" })}</p>
          <Link to="/" className="text-gold hover:underline text-sm font-mono">
            {t("pages.topicDetail.copy2", { defaultValue: "← 返回首页" })}
          </Link>
        </div>
      </div>
    );
  }

  const Icon = topic.icon;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${topic.title} · ${topic.subtitle} · EF Lab`}
        description={topic.desc}
        path={`/topic/${topic.id}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${topic.title} (${topic.subtitle})`,
          description: topic.desc,
          author: { "@type": "Organization", name: "EF Lab" },
        }}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-14 px-6 border-b border-border overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[300px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
        <div className="container relative z-10 max-w-6xl">
          <nav aria-label={t("pages.topicDetail.copy3", { defaultValue: "面包屑" })} className="mb-8 flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Link to="/" className="hover:text-gold transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> {t("pages.topicDetail.copy4", { defaultValue: "首页" })}
            </Link>
            <span aria-hidden>/</span>
            <Link to="/#topics" className="hover:text-gold transition-colors">
              {t("pages.topicDetail.copy5", { defaultValue: "学科领域" })}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-foreground/70">{topic.title}</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
                  {topic.title}
                </h1>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                  {topic.subtitle}
                </p>
              </div>
            </div>
            <p className="text-lg text-secondary-foreground leading-relaxed max-w-3xl">
              {topic.heroDesc}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {topic.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-mono rounded-md bg-secondary text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
              <span className="px-3 py-1 text-xs font-mono rounded-md bg-gold/10 text-gold border border-gold/25">
                {topic.knowledgePoints.length} {t("pages.topicDetail.copy6", { defaultValue: "个知识点" })}
              </span>
              {toolCount > 0 && (
                <span className="px-3 py-1 text-xs font-mono rounded-md bg-gold/10 text-gold border border-gold/25">
                  {toolCount} {t("pages.topicDetail.copy7", { defaultValue: "个关联工具" })}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Body: sticky TOC + knowledge points */}
      <section className="py-16 px-6">
        <div className="container max-w-6xl grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 items-start">
          {/* TOC — sticky on desktop */}
          <aside className="hidden lg:block sticky top-24" aria-label={t("pages.topicDetail.copy8", { defaultValue: "知识点目录" })}>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-2">
                <ListOrdered className="w-3.5 h-3.5" /> Contents
              </p>
              {/* reading progress */}
              <div className="mb-3">
                <div className="h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gold/70 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((seen.size / topic.knowledgePoints.length) * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] font-mono text-muted-foreground">
                  {t("pages.topicDetail.copy9", { defaultValue: "已阅读" })} {seen.size} / {topic.knowledgePoints.length}
                </p>
              </div>
              <ol className="space-y-1 max-h-[65vh] overflow-y-auto pr-1">
                {topic.knowledgePoints.map((kp, i) => (
                  <li key={i}>
                    <a
                      href={`#${kpId(i)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document
                          .getElementById(kpId(i))
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`block rounded px-2 py-1.5 text-xs leading-snug transition-colors ${
                        activeKp === i
                          ? "bg-gold/10 text-gold"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <span className="font-mono text-[10px] mr-1.5 opacity-70">
                        {seen.has(i) ? "✓" : String(i + 1).padStart(2, "0")}
                      </span>
                      {kp.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          {/* Knowledge points */}
          <div className="space-y-8 min-w-0">
            {topic.knowledgePoints.map((kp, i) => (
              <motion.article
                key={i}
                id={kpId(i)}
                className="scroll-mt-24 rounded-2xl border border-border bg-card p-8 md:p-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-5 h-5 text-gold shrink-0" />
                  <h3 className="text-xl font-display font-semibold text-foreground">
                    <span className="font-mono text-sm text-gold/70 mr-2">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {kp.title}
                  </h3>
                </div>

                <p className="text-secondary-foreground leading-relaxed mb-6">
                  {kp.content}
                </p>

                {/* Formula */}
                {kp.formula && (
                  <div className="my-6 py-5 px-6 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-xl md:text-2xl font-mono text-gold text-center tracking-wide mb-3">
                      {kp.formula}
                    </p>
                    {kp.formulaExplain && (
                      <p className="text-sm text-muted-foreground text-center">
                        {kp.formulaExplain}
                      </p>
                    )}
                  </div>
                )}

                {/* Derivation */}
                {kp.derivation && (
                  <div className="mt-6 p-5 rounded-xl border border-gold/15 bg-gold/[0.02]">
                    <p className="text-xs font-mono text-gold mb-3 uppercase tracking-wider">
                      {t("pages.topicDetail.copy10", { defaultValue: "推导过程" })}
                    </p>
                    <ol className="space-y-2">
                      {kp.derivation.map((step, j) => (
                        <li
                          key={j}
                          className="text-sm text-secondary-foreground leading-relaxed pl-1"
                        >
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Linked interactive tool */}
                {kp.tool && (
                  <Link
                    to={sectionHref(kp.tool.id)}
                    className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-sm font-mono hover:bg-gold/20 transition-colors"
                  >
                    <Calculator className="w-4 h-4" />
                    {t("pages.topicDetail.copy11", { defaultValue: "打开" })} {kp.tool.label}
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge network: related glossary / papers / workflows / strategies */}
      <TopicRelated topicId={topic.id} />

      {/* Prev / Next topic navigation */}
      <section className="px-6 pb-16">
        <div className="container max-w-6xl grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prev ? (
            <Link
              to={`/topic/${prev.id}`}
              className="group rounded-xl border border-border/60 bg-card/40 p-5 hover:border-gold/40 transition-colors"
            >
              <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                <ArrowLeft className="w-3 h-3" /> {t("pages.topicDetail.copy12", { defaultValue: "上一主题" })}
              </p>
              <p className="font-display text-lg text-foreground group-hover:text-gold transition-colors">
                {prev.title}
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{prev.subtitle}</p>
            </Link>
          ) : (
            <div />
          )}
          {next && (
            <Link
              to={`/topic/${next.id}`}
              className="group rounded-xl border border-border/60 bg-card/40 p-5 text-right hover:border-gold/40 transition-colors"
            >
              <p className="flex items-center justify-end gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                {t("pages.topicDetail.copy13", { defaultValue: "下一主题" })} <ArrowRight className="w-3 h-3" />
              </p>
              <p className="font-display text-lg text-foreground group-hover:text-gold transition-colors">
                {next.title}
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{next.subtitle}</p>
            </Link>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default TopicDetail;
