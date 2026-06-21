import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import HeroSection from "@/components/HeroSection";
import HeroToolStrip from "@/components/HeroToolStrip";
import TopicCards from "@/components/TopicCards";
import ModelShowcase from "@/components/ModelShowcase";
import ScrollUtilities from "@/components/ScrollUtilities";
import KeyboardHelp from "@/components/KeyboardHelp";
import TodaysPick from "@/components/TodaysPick";
import FeaturedNotebooks from "@/components/FeaturedNotebooks";
import ResearchPlaybooks from "@/components/ResearchPlaybooks";
import SiteFooter from "@/components/SiteFooter";
import SectionHeader from "@/components/common/SectionHeader";
import { SECTIONS, type SectionDef } from "@/lib/sections";

const editorialPillars = [
  {
    label: "01 / Concept",
    title: "先建立理论语言",
    text: "用统一的符号、假设和推导把 CAPM、SDF、Black-Scholes、OLS 等核心模型串联起来，避免只会套公式。",
  },
  {
    label: "02 / Experiment",
    title: "再进入交互实验",
    text: "把参数、数据和情景压力测试放到同一个界面里，观察模型输出如何随假设变化，并快速识别敏感变量。",
  },
  {
    label: "03 / Research",
    title: "最后沉淀研究资产",
    text: "通过 Notebook、模板、论文索引和可复用图表，把课堂演示、策略原型和实证作业转化为可复现工作流。",
  },
];

const EditorialBriefing = () => (
  <section className="px-6 py-10">
    <div className="container max-w-6xl">
      <div className="rounded-2xl border border-border/60 bg-card/35 p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.6fr] gap-8 items-start">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">
              Editorial Briefing
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-foreground leading-tight">
              不只是工具集合，而是一条从理论到实证的学习链路
            </h2>
            <p className="mt-4 text-sm text-foreground/70 leading-relaxed">
              每个板块现在都是独立页面：点击导航直接进入对应功能，专注单一主题，无需在超长页面里上下查找定位。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {editorialPillars.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/50 bg-background/35 p-4 hover:border-gold/35 transition-colors"
              >
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/80">
                  {item.label}
                </span>
                <h3 className="mt-3 font-display text-lg text-foreground leading-snug">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-foreground/65 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

/** Directory of all section pages, grouped, each linking to its own route. */
const SectionDirectory = () => {
  const groups = SECTIONS.reduce<Record<string, SectionDef[]>>((acc, s) => {
    (acc[s.group] = acc[s.group] || []).push(s);
    return acc;
  }, {});

  return (
    <section id="directory" className="scroll-mt-16 px-6 pb-16">
      <SectionHeader
        chapter="Directory"
        kicker="All Sections"
        title="功能板块目录"
        subtitle="每个板块都是一个独立页面 — 选择一个主题进入专属工作区。"
      />
      <div className="container max-w-6xl mt-4 space-y-8">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-3">
              {group}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((s) => (
                <Link
                  key={s.id}
                  to={`/s/${s.id}`}
                  className="group rounded-xl border border-border/60 bg-card/35 p-4 hover:border-gold/40 hover:bg-card/55 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/70">
                      {s.chapter}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors shrink-0" />
                  </div>
                  <h3 className="mt-2 font-display text-base text-foreground leading-snug group-hover:text-gold transition-colors">
                    {s.label}
                  </h3>
                  {s.subtitle && (
                    <p className="mt-1.5 text-xs text-foreground/60 leading-relaxed line-clamp-2">
                      {s.subtitle}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Index = () => {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="EF Lab — 量化金融与计量经济学实验室"
        description="面向经济金融实证研究的交互式实验室，整合资产定价、衍生品、风险管理、固定收益、计量经济学、Notebook 与论文索引。"
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "EF Lab",
          url: "https://my-repo-mind.lovable.app/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://my-repo-mind.lovable.app/glossary?q={query}",
            "query-input": "required name=query",
          },
        }}
      />
      <Navbar />
      <ScrollUtilities />
      <KeyboardHelp />

      {/* ─── 导览 ─── */}
      <div id="hero" className="scroll-mt-12"><HeroSection /></div>
      <HeroToolStrip />
      <EditorialBriefing />
      <ResearchPlaybooks />
      <TodaysPick />
      <div id="topics" className="scroll-mt-12"><TopicCards /></div>
      <div id="models" className="scroll-mt-12"><ModelShowcase /></div>
      <div id="featured-notebooks" className="scroll-mt-12"><FeaturedNotebooks /></div>

      {/* ─── 板块目录 ─── */}
      <SectionDirectory />

      <SiteFooter />
    </div>
  );
};

export default Index;
