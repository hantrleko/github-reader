import { ArrowDown, ArrowRight } from "lucide-react";
import { topicsData } from "@/data/topicsData";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const HeroSection = () => {
  const { t } = useTranslation();
  const topicCount = topicsData.length;
  const knowledgeCount = topicsData.reduce((s, t) => s + t.knowledgePoints.length, 0);
  const formulaCount = topicsData.reduce(
    (s, t) => s + t.knowledgePoints.filter((k) => k.formula).length,
    0
  );

  return (
    <section className="relative overflow-hidden bg-grid-pattern pt-20 pb-16 px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[420px] rounded-full bg-gold/[0.06] blur-[140px] pointer-events-none" />

      <div className="container max-w-7xl relative z-10">
        {/* Top masthead rule */}
        <div className="flex items-center justify-between border-b border-accent/40 pb-3 mb-10 text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80">
          <span>The Quantitative Report</span>
          <span className="hidden sm:inline opacity-60">
            Vol. II · Issue 09 · Empirical Methods
          </span>
          <span className="opacity-60">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
          </span>
        </div>

        <div className="grid grid-cols-12 gap-8 lg:gap-10">
          {/* Left — Major headline */}
          <div className="col-span-12 lg:col-span-8 flex flex-col justify-center animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-12 bg-gold" />
              <span className="text-gold text-[11px] uppercase font-mono font-semibold tracking-[0.25em]">
                {t("hero.tagline")}
              </span>
            </div>

            <h1 className="font-display font-bold leading-[1.05] text-5xl md:text-6xl lg:text-7xl text-foreground mb-8">
              {t("hero.title1")}{" "}
              <span className="italic text-gold">&amp;</span>
              <br />
              <span className="text-gold">{t("hero.title2")}</span>
            </h1>

            <p className="max-w-xl text-base md:text-lg text-foreground/75 leading-relaxed mb-10">
              {t("hero.subtitle")}
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo("calculator")}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-background font-mono uppercase text-[11px] tracking-[0.2em] font-bold hover:bg-gold/85 transition-colors"
              >
                {t("hero.cta1")}
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollTo("topics")}
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-foreground/25 text-foreground font-mono uppercase text-[11px] tracking-[0.2em] font-bold hover:bg-foreground/5 hover:border-gold/60 transition-colors"
              >
                {t("hero.cta2")}
              </button>
            </div>
          </div>

          {/* Right — Terminal sidebar */}
          <aside className="col-span-12 lg:col-span-4 lg:border-l lg:border-accent/40 lg:pl-8 animate-fade-in-up animate-delay-200">
            <h3 className="text-[10px] uppercase text-gold font-mono font-bold tracking-[0.2em] mb-4 border-b border-accent/40 pb-2">
              Research Coverage Metrics
            </h3>
            <div className="space-y-4 mb-8">
              <button
                onClick={() => scrollTo("topics")}
                className="w-full flex justify-between items-end group"
              >
                <span className="text-[11px] text-foreground/60 uppercase tracking-wider">Research Domains</span>
                <span className="text-2xl font-mono font-light leading-none tracking-tighter text-foreground group-hover:text-gold transition-colors">
                  {String(topicCount).padStart(2, "0")}
                  <span className="text-[10px] opacity-50 ml-1">SEC</span>
                </span>
              </button>
              <button
                onClick={() => scrollTo("models")}
                className="w-full flex justify-between items-end group"
              >
                <span className="text-[11px] text-foreground/60 uppercase tracking-wider">Formula References</span>
                <span className="text-2xl font-mono font-light leading-none tracking-tighter text-foreground group-hover:text-gold transition-colors">
                  {formulaCount}
                  <span className="text-[10px] text-gold ml-1">▲</span>
                </span>
              </button>
              <button
                onClick={() => scrollTo("topics")}
                className="w-full flex justify-between items-end group"
              >
                <span className="text-[11px] text-foreground/60 uppercase tracking-wider">Concepts Indexed</span>
                <span className="text-2xl font-mono font-light leading-none tracking-tighter text-foreground group-hover:text-gold transition-colors">
                  {knowledgeCount}
                  <span className="text-[10px] opacity-50 ml-1">ALL</span>
                </span>
              </button>
            </div>

            <Link
              to="/changelog"
              className="block bg-accent/20 hover:bg-accent/30 transition-colors p-5 border-l-2 border-gold"
            >
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2 text-foreground">
                Latest Update · V3.0
              </h4>
              <p className="text-xs leading-relaxed text-foreground/75 mb-3">
                Research Playbooks and Sprint Composer turn the lab into a scenario-driven workflow system for research replication, teaching and decision briefs.
              </p>
              <span className="text-[10px] text-gold uppercase font-mono font-bold inline-flex items-center gap-1">
                View Changelog <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
