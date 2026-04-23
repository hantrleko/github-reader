import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TopicCards from "@/components/TopicCards";
import ModelShowcase from "@/components/ModelShowcase";

// Heavy interactive sections — code-split to relieve homepage bundle & scroll lag
const CalculatorSection = lazy(() => import("@/components/CalculatorSection"));
const ImpliedVolTool = lazy(() => import("@/components/ImpliedVolTool"));
const MCOptionPricer = lazy(() => import("@/components/MCOptionPricer"));
const DerivativesTools = lazy(() => import("@/components/DerivativesTools"));
const BondCalculator = lazy(() => import("@/components/BondCalculator"));
const RateModelSimulator = lazy(() => import("@/components/RateModelSimulator"));
const EfficientFrontier = lazy(() => import("@/components/EfficientFrontier"));
const EconometricsTools = lazy(() => import("@/components/EconometricsTools"));
const RiskTools = lazy(() => import("@/components/RiskTools"));
const QuantStrategyTools = lazy(() => import("@/components/QuantStrategyTools"));
const QuizSection = lazy(() => import("@/components/QuizSection"));
const LearningPath = lazy(() => import("@/components/LearningPath"));
const Changelog = lazy(() => import("@/components/Changelog"));

const SectionFallback = () => (
  <div className="py-20 px-6">
    <div className="container max-w-4xl">
      <div className="h-6 w-48 bg-muted/50 rounded animate-pulse mb-4" />
      <div className="h-4 w-full bg-muted/30 rounded animate-pulse mb-2" />
      <div className="h-4 w-3/4 bg-muted/30 rounded animate-pulse" />
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
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : <SectionFallback />}
    </div>
  );
};

const SectionDivider = ({ label, kicker }: { label: string; kicker: string }) => (
  <div className="container max-w-6xl pt-16 pb-2 px-6">
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-gold tracking-[0.3em] uppercase">
        {kicker}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
    </div>
    <h2 className="text-xl md:text-2xl font-display text-foreground mt-2">{label}</h2>
  </div>
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
      <Navbar />

      {/* ─── 0. 导览 ─── */}
      <div id="hero" className="scroll-mt-12"><HeroSection /></div>
      <div id="topics" className="scroll-mt-12"><TopicCards /></div>
      <div id="models" className="scroll-mt-12"><ModelShowcase /></div>

      {/* ─── 1. 基础定价 ─── */}
      <SectionDivider kicker="Chapter 1" label="基础定价 · 期权与隐含波动率" />
      <Suspense fallback={<SectionFallback />}>
        <div id="calculator" className="scroll-mt-12"><DeferMount><CalculatorSection /></DeferMount></div>
        <div id="implied-vol" className="scroll-mt-12"><DeferMount><ImpliedVolTool /></DeferMount></div>
        <div id="mc-pricer" className="scroll-mt-12"><DeferMount><MCOptionPricer /></DeferMount></div>
      </Suspense>

      {/* ─── 2. 衍生品高阶 ─── */}
      <SectionDivider kicker="Chapter 2" label="衍生品高阶 · 波动率曲面与路径依赖" />
      <Suspense fallback={<SectionFallback />}>
        <div id="derivatives" className="scroll-mt-12"><DeferMount><DerivativesTools /></DeferMount></div>
      </Suspense>

      {/* ─── 3. 固收与组合 ─── */}
      <SectionDivider kicker="Chapter 3" label="固定收益 & 资产配置" />
      <Suspense fallback={<SectionFallback />}>
        <div id="bond" className="scroll-mt-12"><DeferMount><BondCalculator /></DeferMount></div>
        <div id="rate-model" className="scroll-mt-12"><DeferMount><RateModelSimulator /></DeferMount></div>
        <div id="frontier" className="scroll-mt-12"><DeferMount><EfficientFrontier /></DeferMount></div>
      </Suspense>

      {/* ─── 4. 计量经济 ─── */}
      <SectionDivider kicker="Chapter 4" label="计量经济学 · 估计与状态空间" />
      <Suspense fallback={<SectionFallback />}>
        <div id="econometrics" className="scroll-mt-12"><DeferMount><EconometricsTools /></DeferMount></div>
      </Suspense>

      {/* ─── 5. 风险管理 ─── */}
      <SectionDivider kicker="Chapter 5" label="风险管理 · 信用、相依结构与压力测试" />
      <Suspense fallback={<SectionFallback />}>
        <div id="risk" className="scroll-mt-12"><DeferMount><RiskTools /></DeferMount></div>
      </Suspense>

      {/* ─── 6. 量化策略 ─── */}
      <SectionDivider kicker="Chapter 6" label="量化策略 · 回测与因子归因" />
      <Suspense fallback={<SectionFallback />}>
        <div id="quant" className="scroll-mt-12"><DeferMount><QuantStrategyTools /></DeferMount></div>
      </Suspense>

      {/* ─── 7. 测验与路径 ─── */}
      <SectionDivider kicker="Capstone" label="知识检验与学习路径" />
      <Suspense fallback={<SectionFallback />}>
        <div id="quiz" className="scroll-mt-12"><DeferMount><QuizSection /></DeferMount></div>
        <div id="learning" className="scroll-mt-12"><DeferMount><LearningPath /></DeferMount></div>
      </Suspense>

      {/* ─── 8. 更新日志 ─── */}
      <Suspense fallback={<SectionFallback />}>
        <div id="changelog" className="scroll-mt-12"><DeferMount><Changelog /></DeferMount></div>
      </Suspense>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container text-center space-y-2">
          <p className="text-xs font-mono text-muted-foreground tracking-wider">
            Economics &amp; Finance Lab — A systematic approach to empirical methods in economics and finance
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/70 tracking-wider">
            经济金融实验室 · 系统化的实证方法学习平台
          </p>
          <p className="text-[10px] font-mono text-gold/70 tracking-[0.2em] uppercase pt-2">
            Version 1.1  ·  © 2026
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
