import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import HeroSection from "@/components/HeroSection";
import HeroToolStrip from "@/components/HeroToolStrip";
import DomainStrip from "@/components/DomainStrip";
import TopicCards from "@/components/TopicCards";
import ModelShowcase from "@/components/ModelShowcase";
import ScrollUtilities from "@/components/ScrollUtilities";
import KeyboardHelp from "@/components/KeyboardHelp";
import TodaysPick from "@/components/TodaysPick";
import FeaturedNotebooks from "@/components/FeaturedNotebooks";
import WorkflowStrip from "@/components/WorkflowStrip";
import SiteFooter from "@/components/SiteFooter";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import SplashIntro from "@/components/SplashIntro";
import { sectionsByGroup } from "@/lib/sections";
import { HOME_SEO } from "@/lib/seoCopy";

const PILLAR_KEYS = ["p1", "p2", "p3"] as const;

const EditorialBriefing = () => {
  const { t } = useTranslation();
  return (
    <section className="px-6 py-10" aria-label={t("home.briefing.aria")}>
      <div className="container max-w-6xl">
        <Reveal className="rounded-2xl border border-border/60 bg-card/35 p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.6fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">
                {t("home.briefing.eyebrow")}
              </p>
              <h2 className="font-display text-2xl md:text-3xl text-foreground leading-tight">
                {t("home.briefing.title")}
              </h2>
              <p className="mt-4 text-sm text-foreground/70 leading-relaxed">
                {t("home.briefing.lead")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PILLAR_KEYS.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border/50 bg-background/35 p-4 hover:border-gold/40 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-20px_hsl(var(--gold)/0.35)] transition-all duration-300"
                >
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/80">
                    {t(`home.briefing.${key}.label`)}
                  </span>
                  <h3 className="mt-3 font-display text-lg text-foreground leading-snug">
                    {t(`home.briefing.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-xs text-foreground/65 leading-relaxed">
                    {t(`home.briefing.${key}.text`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/** Directory of all section pages, grouped, each linking to its own route. */
const SectionDirectory = () => {
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  const groups = sectionsByGroup();

  return (
    <section id="directory" className="scroll-mt-16 px-6 pb-16">
      <SectionHeader
        chapter={t("home.directory.chapter")}
        kicker={t("home.directory.kicker")}
        title={t("home.directory.title")}
        subtitle={t("home.directory.subtitle")}
      />

      <div className="container max-w-6xl mt-4 space-y-8">
        {groups.map(({ group, sections: items }) => (
          <div key={group.id}>
            <Link
              to={`/d/${group.id}`}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-3 hover:text-gold transition-colors"
            >
              {group.code} / {t(`nav.groups.${group.id}`, { defaultValue: group.label })} · {group.kicker}
              <ArrowUpRight className="w-3 h-3" />
            </Link>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={reduce ? undefined : { opacity: 0, y: 14 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={`/s/${s.id}`}
                    aria-label={`${s.label}${s.subtitle ? ` — ${s.subtitle}` : ""}`}
                    className="group block h-full rounded-xl border border-border/60 bg-card/35 p-4 hover:border-gold/40 hover:bg-card/55 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-20px_hsl(var(--gold)/0.35)] transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/70">
                        {s.chapter}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
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
                </motion.div>
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
      <SplashIntro />
      <Seo
        title={HOME_SEO.title}
        description={HOME_SEO.description}
        path="/"
        ogTitle={HOME_SEO.ogTitle}
        ogDescription={HOME_SEO.ogDescription}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "EF Lab",
          url: "https://eugenefinance.tech/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://eugenefinance.tech/glossary?q={query}",
            "query-input": "required name=query",
          },
        }}
      />
      <Navbar />
      <ScrollUtilities />
      <KeyboardHelp />

      {/* ─── 导览 ─── */}
      <main id="main-content">
        <div id="hero" className="scroll-mt-12"><HeroSection /></div>
        <HeroToolStrip />
        <EditorialBriefing />
        <TodaysPick />
        <div id="topics" className="scroll-mt-12"><TopicCards /></div>
        <div id="models" className="scroll-mt-12"><ModelShowcase /></div>
        <div id="featured-notebooks" className="scroll-mt-12"><FeaturedNotebooks /></div>

        {/* ─── 研究工作流速览 ─── */}
        <WorkflowStrip />

        {/* ─── 板块目录 ─── */}
        <SectionDirectory />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
