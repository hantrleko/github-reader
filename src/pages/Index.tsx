import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import HeroSection from "@/components/HeroSection";
import HeroToolStrip from "@/components/HeroToolStrip";
import TopicCards from "@/components/TopicCards";
import ModelShowcase from "@/components/ModelShowcase";
import ScrollUtilities from "@/components/ScrollUtilities";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import KeyboardHelp from "@/components/KeyboardHelp";
import TodaysPick from "@/components/TodaysPick";
import FeaturedNotebooks from "@/components/FeaturedNotebooks";
import ResearchPlaybooks from "@/components/ResearchPlaybooks";

// Heavy interactive sections — code-split to relieve homepage bundle & scroll lag
const CalculatorSection = lazy(() => import("@/components/CalculatorSection"));
const MicroTools = lazy(() => import("@/components/MicroTools"));
const ImpliedVolTool = lazy(() => import("@/components/ImpliedVolTool"));
const MCOptionPricer = lazy(() => import("@/components/MCOptionPricer"));
const DerivativesTools = lazy(() => import("@/components/DerivativesTools"));
const BondCalculator = lazy(() => import("@/components/BondCalculator"));
const RateModelSimulator = lazy(() => import("@/components/RateModelSimulator"));
const EfficientFrontier = lazy(() => import("@/components/EfficientFrontier"));
const AssetPricingTools = lazy(() => import("@/components/AssetPricingTools"));
const EconometricsTools = lazy(() => import("@/components/EconometricsTools"));
const RiskTools = lazy(() => import("@/components/RiskTools"));
const QuantStrategyTools = lazy(() => import("@/components/QuantStrategyTools"));
const MacroTools = lazy(() => import("@/components/MacroTools"));
const FrontierConcepts = lazy(() => import("@/components/FrontierConcepts"));
const QuizSection = lazy(() => import("@/components/QuizSection"));
const LearningPath = lazy(() => import("@/components/LearningPath"));
const V28Platform = lazy(() => import("@/components/platform/V28Platform"));

const SectionFallback = () => (
  <div className="py-20 px-6">
    <div className="container max-w-5xl">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-8 md:p-10 overflow-hidden relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--gold) / 0.06) 50%, transparent 100%)",
            animation: "shimmer 1.6s ease-in-out infinite",
          }}
        />
        <div className="flex items-center gap-2 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
          <div className="h-3 w-32 rounded bg-muted/50 animate-pulse" />
        </div>
        <div className="h-7 w-2/3 max-w-md rounded bg-muted/60 animate-pulse mb-3" />
        <div className="h-4 w-full max-w-lg rounded bg-muted/30 animate-pulse mb-2" />
        <div className="h-4 w-1/2 rounded bg-muted/30 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                <div className="h-7 w-32 rounded bg-muted/40 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Defer mounting of a heavy section until the user scrolls near it.
 * Dramatically reduces initial DOM node count and first-paint script time.
 */
const DeferMount = ({
  children,
  minHeight = 480,
  rootMargin = "600px 0px",
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className="cv-auto" style={visible ? undefined : { minHeight }}>
      {visible ? children : <SectionFallback />}
    </div>
  );
};

import SectionHeader from "@/components/common/SectionHeader";

const SectionDivider = ({
  label,
  kicker,
  subtitle,
}: {
  label: string;
  kicker: string;
  subtitle?: string;
}) => {
  const [chapter, name] = kicker.includes(" ") ? kicker.split(/\s(.+)/) : [kicker, ""];
  return (
    <SectionHeader
      chapter={chapter}
      kicker={name || kicker}
      title={label}
      subtitle={subtitle}
    />
  );
};

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
              主页内容已按研究者的实际路径组织：先读懂模型假设，再用交互参数验证直觉，最后把结果整理成可复现的 Notebook 与策略框架。
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

      {/* ─── 0. 导览 ─── */}
      <div id="hero" className="scroll-mt-12"><HeroSection /></div>
      <HeroToolStrip />
      <EditorialBriefing />
      <ResearchPlaybooks />
      <TodaysPick />
      <div id="topics" className="scroll-mt-12"><TopicCards /></div>
      <div id="models" className="scroll-mt-12"><ModelShowcase /></div>
      <div id="featured-notebooks" className="scroll-mt-12"><FeaturedNotebooks /></div>

      {/* ─── 0. 微观经济学 ─── */}
      <SectionDivider
        kicker="Foundations"
        label="微观经济学 · 个体决策与市场"
        subtitle="从供需均衡、消费者与生产者最优，到市场结构博弈与信息不对称，搭建所有经济分析的微观基石。"
      />
      <SectionErrorBoundary name="微观经济学">
      <Suspense fallback={<SectionFallback />}>
        <div id="micro" className="scroll-mt-12"><DeferMount><MicroTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 1. 基础定价 ─── */}
      <SectionDivider
        kicker="Chapter 1"
        label="基础定价 · 期权与隐含波动率"
        subtitle="从闭式解、隐含波动率反推到蒙特卡洛模拟，理解定价公式背后的复制组合与风险中性逻辑。"
      />
      <SectionErrorBoundary name="基础定价">
      <Suspense fallback={<SectionFallback />}>
        <div id="calculator" className="scroll-mt-12"><DeferMount><CalculatorSection /></DeferMount></div>
        <div id="implied-vol" className="scroll-mt-12"><DeferMount><ImpliedVolTool /></DeferMount></div>
        <div id="mc-pricer" className="scroll-mt-12"><DeferMount><MCOptionPricer /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 2. 衍生品高阶 ─── */}
      <SectionDivider
        kicker="Chapter 2"
        label="衍生品高阶 · 波动率曲面与路径依赖"
        subtitle="围绕 SVI、Heston、SABR、Local Vol 与 LSM，将市场微笑、随机波动和美式行权放进同一套实验框架。"
      />
      <SectionErrorBoundary name="衍生品高阶">
      <Suspense fallback={<SectionFallback />}>
        <div id="derivatives" className="scroll-mt-12"><DeferMount><DerivativesTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 3. 固收与组合 ─── */}
      <SectionDivider
        kicker="Chapter 3"
        label="固定收益 & 资产配置"
        subtitle="连接债券现金流、期限结构、短率模型和均值-方差前沿，形成利率与组合风险的统一视角。"
      />
      <SectionErrorBoundary name="固收与组合">
      <Suspense fallback={<SectionFallback />}>
        <div id="bond" className="scroll-mt-12"><DeferMount><BondCalculator /></DeferMount></div>
        <div id="rate-model" className="scroll-mt-12"><DeferMount><RateModelSimulator /></DeferMount></div>
        <div id="frontier" className="scroll-mt-12"><DeferMount><EfficientFrontier /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 3b. 资产定价 ─── */}
      <SectionDivider
        kicker="Asset Pricing"
        label="资产定价 · CAPM 与多因子"
        subtitle="从 CAPM 证券市场线到 APT 与 Fama-French 多因子归因，理解系统性风险如何被定价。"
      />
      <SectionErrorBoundary name="资产定价">
      <Suspense fallback={<SectionFallback />}>
        <div id="asset-pricing" className="scroll-mt-12"><DeferMount><AssetPricingTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 4. 计量经济 ─── */}
      <SectionDivider
        kicker="Chapter 4"
        label="计量经济学 · 估计与状态空间"
        subtitle="覆盖 OLS、IV、GMM、GARCH、Kalman 与因果推断，强调估计假设、诊断检验和稳健推断。"
      />
      <SectionErrorBoundary name="计量经济">
      <Suspense fallback={<SectionFallback />}>
        <div id="econometrics" className="scroll-mt-12"><DeferMount><EconometricsTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 5. 风险管理 ─── */}
      <SectionDivider
        kicker="Chapter 5"
        label="风险管理 · 信用、相依结构与压力测试"
        subtitle="从 VaR/ES 到 Merton 违约距离、Copula 相依和情景冲击，建立可解释的尾部风险监控语言。"
      />
      <SectionErrorBoundary name="风险管理">
      <Suspense fallback={<SectionFallback />}>
        <div id="risk" className="scroll-mt-12"><DeferMount><RiskTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 6. 量化策略 ─── */}
      <SectionDivider
        kicker="Chapter 6"
        label="量化策略 · 回测与因子归因"
        subtitle="用可审计的回测、风险预算和多因子归因，把策略想法拆成信号、组合构建与风险约束。"
      />
      <SectionErrorBoundary name="量化策略">
      <Suspense fallback={<SectionFallback />}>
        <div id="quant" className="scroll-mt-12"><DeferMount><QuantStrategyTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 7. 宏观经济学 ─── */}
      <SectionDivider
        kicker="Chapter 7"
        label="宏观经济学 · 增长与动态均衡"
        subtitle="用 Solow、RBC/DSGE 与政策冲击模拟，观察长期增长、技术进步和动态均衡的传导机制。"
      />
      <SectionErrorBoundary name="宏观经济">
      <Suspense fallback={<SectionFallback />}>
        <div id="macro" className="scroll-mt-12"><DeferMount><MacroTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 8. 平台增强 ─── */}
      <SectionDivider
        kicker="Chapter 8"
        label="平台增强 · Notebook、真实数据与跨工具对比"
        subtitle="围绕复现、分享和比较构建平台能力：真实数据加载、模型基准、历史记录与公开 Notebook。"
      />
      <SectionErrorBoundary name="平台增强">
      <Suspense fallback={<SectionFallback />}>
        <div id="platform" className="scroll-mt-12"><DeferMount><V28Platform /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 9. 前沿范式 ─── */}
      <SectionDivider
        kicker="Frontier"
        label="前沿模型与新兴范式 · 2024–2026"
        subtitle="AI/ML 资产定价、多智能体仿真、复杂网络、气候金融、神经经济学、DeFi 与宏观金融的概念地图。"
      />
      <SectionErrorBoundary name="前沿范式">
      <Suspense fallback={<SectionFallback />}>
        <div id="frontier-concepts" className="scroll-mt-12"><DeferMount><FrontierConcepts /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 9. 测验与路径 ─── */}
      <SectionDivider
        kicker="Capstone"
        label="知识检验与学习路径"
        subtitle="通过测验、进度记录和阶段化路线，把碎片化知识整理成可持续迭代的个人研究能力。"
      />
      <SectionErrorBoundary name="测验与学习路径">
      <Suspense fallback={<SectionFallback />}>
        <div id="quiz" className="scroll-mt-12"><DeferMount><QuizSection /></DeferMount></div>
        <div id="learning" className="scroll-mt-12"><DeferMount><LearningPath /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* Footer */}
      <footer className="mt-16 px-6 border-t border-border bg-card/30">
        <div className="container max-w-6xl py-12">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="xs:col-span-2 md:col-span-2">
              <p className="text-sm font-display font-semibold text-foreground mb-2">
                Econ &amp; Finance Lab
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                系统化的实证方法学习平台 · 将资产定价、计量经济学与量化研究拆解为可推导、可实验、可复现的工作流。
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/70 mt-3 tracking-wider">
                A systematic approach to empirical methods in economics and finance.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">导航</p>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#micro" className="text-muted-foreground hover:text-gold transition-colors">微观经济学</a></li>
                <li><a href="#calculator" className="text-muted-foreground hover:text-gold transition-colors">期权与隐含波动率</a></li>
                <li><a href="#bond" className="text-muted-foreground hover:text-gold transition-colors">固收 & 组合</a></li>
                <li><a href="#asset-pricing" className="text-muted-foreground hover:text-gold transition-colors">资产定价</a></li>
                <li><a href="#risk" className="text-muted-foreground hover:text-gold transition-colors">风险管理</a></li>
                <li><a href="#quant" className="text-muted-foreground hover:text-gold transition-colors">量化策略</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">资源</p>
              <ul className="space-y-1.5 text-xs">
                <li><a href="/changelog" className="text-muted-foreground hover:text-gold transition-colors">更新日志</a></li>
                <li>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="text-muted-foreground hover:text-gold transition-colors"
                  >
                    回到顶部 ↑
                  </button>
                </li>
                <li><span className="text-muted-foreground/70">⌘K · 快速搜索</span></li>
                <li><span className="text-muted-foreground/70">? · 快捷键帮助</span></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border/60">
            <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider">
              © 2026 Econ &amp; Finance Lab · 仅供学习研究 · 不构成投资建议
            </p>
            <p className="text-[10px] font-mono text-gold/80 tracking-[0.2em] uppercase">
              Version 3.1
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
