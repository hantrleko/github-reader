import { TrendingUp, BookOpen, BarChart3, ArrowDown } from "lucide-react";
import { topicsData } from "@/data/topicsData";
import { useTranslation } from "react-i18next";

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

  const stats = [
    { icon: BookOpen, label: t("hero.stats.topics"), count: `${topicCount}`, target: "topics" },
    { icon: BarChart3, label: t("hero.stats.formulas"), count: `${formulaCount}`, target: "models" },
    { icon: TrendingUp, label: t("hero.stats.knowledge"), count: `${knowledgeCount}`, target: "topics" },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-grid-pattern">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full bg-teal/5 blur-[100px] pointer-events-none" />

      {/* 抽象金融背景 — 收益率曲线 / K线 SVG, 极低透明度 */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07] dark:opacity-[0.09]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {/* 收益率曲线样式平滑 path */}
        <path
          d="M0 600 C 200 580, 300 500, 450 480 S 700 420, 850 360 S 1050 280, 1200 240"
          stroke="hsl(var(--gold))"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M0 680 C 200 660, 300 640, 450 600 S 700 520, 850 460 S 1050 400, 1200 340"
          stroke="hsl(var(--gold))"
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />
        {/* 抽象 K 线 */}
        {Array.from({ length: 20 }).map((_, i) => {
          const x = 60 + i * 56;
          const h = 20 + ((i * 37) % 60);
          const top = 700 - h - ((i * 13) % 80);
          return (
            <g key={i}>
              <line x1={x} y1={top - 10} x2={x} y2={top + h + 10} stroke="hsl(var(--gold))" strokeWidth="0.8" />
              <rect x={x - 4} y={top} width="8" height={h} fill="hsl(var(--gold))" opacity={i % 2 ? 0.8 : 0.4} />
            </g>
          );
        })}
      </svg>

      <div className="container relative z-10 px-6 text-center">
        <div className="animate-fade-in-up">
          <p className="text-sm font-mono uppercase tracking-[0.3em] text-gold mb-6">
            {t("hero.tagline")}
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.05] mb-6">
            <span className="text-foreground">{t("hero.title1")}</span>
            <br />
            <span className="text-gold-gradient">{t("hero.title2")}</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground font-light leading-relaxed mb-10">
            {t("hero.subtitle")}
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 animate-fade-in-up animate-delay-300">
          <button
            onClick={() => scrollTo("calculator")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-transform hover:scale-105 shadow-lg"
          >
            {t("hero.cta1")}
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollTo("topics")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card/60 backdrop-blur-sm text-foreground font-medium text-sm transition-colors hover:border-gold/40 hover:text-gold"
          >
            {t("hero.cta2")}
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up animate-delay-400">
          {stats.map((item, i) => (
            <button
              key={i}
              onClick={() => scrollTo(item.target)}
              className="flex items-center gap-3 px-5 py-3 rounded-lg bg-card/60 border border-border backdrop-blur-sm transition-colors hover:border-gold/40"
            >
              <item.icon className="w-5 h-5 text-gold" />
              <span className="text-sm text-foreground font-medium">{item.label}</span>
              <span className="text-xs text-gold font-mono">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
