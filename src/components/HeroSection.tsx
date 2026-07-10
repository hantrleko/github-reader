import { ArrowDown, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { topicsData } from "@/data/topicsData";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { sectionHref } from "@/lib/sections";
import { CountUp } from "@/components/common/Reveal";

const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const go = (id: string) => navigate(sectionHref(id));
  const topicCount = topicsData.length;
  const knowledgeCount = topicsData.reduce((s, t) => s + t.knowledgePoints.length, 0);
  const formulaCount = topicsData.reduce(
    (s, t) => s + t.knowledgePoints.filter((k) => k.formula).length,
    0
  );

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className="relative overflow-hidden bg-grid-pattern pt-20 pb-16 px-6">
      <motion.div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[420px] rounded-full bg-gold/[0.06] blur-[140px] pointer-events-none"
        animate={reduce ? undefined : { opacity: [0.5, 1, 0.5], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container max-w-7xl relative z-10">
        {/* Top masthead rule */}
        <motion.div
          className="relative flex items-center justify-between pb-3 mb-10 text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span>The Quantitative Report</span>
          <span className="hidden sm:inline opacity-60">
            Vol. II · Issue 09 · Empirical Methods
          </span>
          <span className="opacity-60">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
          </span>
          <span className="absolute bottom-0 left-0 h-px w-full bg-accent/40" />
          <motion.span
            aria-hidden
            className="absolute bottom-0 left-0 h-px bg-gold origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: reduce ? 0 : 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            style={{ width: "100%" }}
          />
        </motion.div>

        <div className="grid grid-cols-12 gap-8 lg:gap-10">
          {/* Left — Major headline */}
          <motion.div
            className="col-span-12 lg:col-span-8 flex flex-col justify-center"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item} className="flex items-center gap-3 mb-6">
              <span className="h-px w-12 bg-gold" />
              <span className="text-gold text-[11px] uppercase font-mono font-semibold tracking-[0.25em]">
                {t("hero.tagline")}
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="font-display font-bold leading-[1.05] text-5xl md:text-6xl lg:text-7xl text-foreground mb-8"
            >
              {t("hero.title1")}{" "}
              <span className="italic text-gold">&amp;</span>
              <br />
              <span className="text-gold">{t("hero.title2")}</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="max-w-xl text-base md:text-lg text-foreground/75 leading-relaxed mb-10"
            >
              {t("hero.subtitle")}
            </motion.p>

            <motion.div variants={item} className="flex flex-wrap gap-3">
              <button
                onClick={() => go("calculator")}
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-background font-mono uppercase text-[11px] tracking-[0.2em] font-bold hover:bg-gold/85 transition-colors shadow-sm hover:shadow-[0_8px_30px_-8px_hsl(var(--gold)/0.5)]"
              >
                {t("hero.cta1")}
                <ArrowDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
              </button>
              <button
                onClick={() => go("topics")}
                className="group inline-flex items-center gap-2 px-7 py-3.5 border border-foreground/25 text-foreground font-mono uppercase text-[11px] tracking-[0.2em] font-bold hover:bg-foreground/5 hover:border-gold/60 transition-colors"
              >
                {t("hero.cta2")}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-gold" />
              </button>
            </motion.div>
          </motion.div>

          {/* Right — Terminal sidebar */}
          <motion.aside
            className="col-span-12 lg:col-span-4 lg:border-l lg:border-accent/40 lg:pl-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="text-[10px] uppercase text-gold font-mono font-bold tracking-[0.2em] mb-4 border-b border-accent/40 pb-2">
              Research Coverage Metrics
            </h3>
            <div className="space-y-4 mb-8">
              <button
                onClick={() => go("topics")}
                className="w-full flex justify-between items-end group"
              >
                <span className="text-[11px] text-foreground/60 uppercase tracking-wider">Research Domains</span>
                <span className="text-2xl font-mono font-light leading-none tracking-tighter text-foreground group-hover:text-gold group-hover:drop-shadow-[0_0_8px_hsl(var(--gold)/0.5)] transition-all">
                  <CountUp value={topicCount} pad={2} />
                  <span className="text-[10px] opacity-50 ml-1">SEC</span>
                </span>
              </button>
              <button
                onClick={() => go("models")}
                className="w-full flex justify-between items-end group"
              >
                <span className="text-[11px] text-foreground/60 uppercase tracking-wider">Formula References</span>
                <span className="text-2xl font-mono font-light leading-none tracking-tighter text-foreground group-hover:text-gold group-hover:drop-shadow-[0_0_8px_hsl(var(--gold)/0.5)] transition-all">
                  <CountUp value={formulaCount} />
                  <span className="text-[10px] text-gold ml-1">▲</span>
                </span>
              </button>
              <button
                onClick={() => go("topics")}
                className="w-full flex justify-between items-end group"
              >
                <span className="text-[11px] text-foreground/60 uppercase tracking-wider">Concepts Indexed</span>
                <span className="text-2xl font-mono font-light leading-none tracking-tighter text-foreground group-hover:text-gold group-hover:drop-shadow-[0_0_8px_hsl(var(--gold)/0.5)] transition-all">
                  <CountUp value={knowledgeCount} />
                  <span className="text-[10px] opacity-50 ml-1">ALL</span>
                </span>
              </button>
            </div>

            <Link
              to="/changelog"
              className="group block bg-accent/20 hover:bg-accent/30 transition-all p-5 border-l-2 border-gold hover:shadow-[0_10px_30px_-12px_hsl(var(--gold)/0.4)] hover:-translate-y-0.5"
            >
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2 text-foreground">
                {t("hero.latestUpdate.label")}
              </h4>
              <p className="text-xs leading-relaxed text-foreground/75 mb-3">
                {t("hero.latestUpdate.description")}
              </p>
              <span className="text-[10px] text-gold uppercase font-mono font-bold inline-flex items-center gap-1">
                {t("hero.latestUpdate.cta")} <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.aside>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
