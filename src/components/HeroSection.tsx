import { motion } from "framer-motion";
import { TrendingUp, BookOpen, BarChart3, ArrowDown } from "lucide-react";
import { topicsData } from "@/data/topicsData";

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const HeroSection = () => {
  const topicCount = topicsData.length;
  const knowledgeCount = topicsData.reduce((s, t) => s + t.knowledgePoints.length, 0);
  const formulaCount = topicsData.reduce(
    (s, t) => s + t.knowledgePoints.filter((k) => k.formula).length,
    0
  );

  const stats = [
    { icon: BookOpen, label: "学科领域", count: `${topicCount}`, target: "topics" },
    { icon: BarChart3, label: "核心公式", count: `${formulaCount}`, target: "models" },
    { icon: TrendingUp, label: "知识点", count: `${knowledgeCount}`, target: "topics" },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-grid-pattern">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full bg-teal/5 blur-[100px] pointer-events-none" />

      <div className="container relative z-10 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="text-sm font-mono uppercase tracking-[0.3em] text-gold mb-6">
            Economics & Finance Lab
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.05] mb-6">
            <span className="text-foreground">掌握经济金融</span>
            <br />
            <span className="text-gold-gradient">实证方法与模型</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground font-light leading-relaxed mb-10">
            从经典资产定价到现代计量经济学，系统学习金融实证研究的核心模型、方法论与数据分析技术
          </p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <button
            onClick={() => scrollTo("calculator")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-transform hover:scale-105 shadow-lg"
          >
            探索交互工具
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollTo("topics")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card/60 backdrop-blur-sm text-foreground font-medium text-sm transition-colors hover:border-gold/40 hover:text-gold"
          >
            浏览学科
          </button>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
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
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
