import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TopicCards from "@/components/TopicCards";
import ModelShowcase from "@/components/ModelShowcase";
import ScrollUtilities from "@/components/ScrollUtilities";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import KeyboardHelp from "@/components/KeyboardHelp";

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
      <ScrollUtilities />
      <KeyboardHelp />

      {/* ─── 0. 导览 ─── */}
      <div id="hero" className="scroll-mt-12"><HeroSection /></div>
      <div id="topics" className="scroll-mt-12"><TopicCards /></div>
      <div id="models" className="scroll-mt-12"><ModelShowcase /></div>

      {/* ─── 1. 基础定价 ─── */}
      <SectionDivider kicker="Chapter 1" label="基础定价 · 期权与隐含波动率" />
      <SectionErrorBoundary name="基础定价">
      <Suspense fallback={<SectionFallback />}>
        <div id="calculator" className="scroll-mt-12"><DeferMount><CalculatorSection /></DeferMount></div>
        <div id="implied-vol" className="scroll-mt-12"><DeferMount><ImpliedVolTool /></DeferMount></div>
        <div id="mc-pricer" className="scroll-mt-12"><DeferMount><MCOptionPricer /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 2. 衍生品高阶 ─── */}
      <SectionDivider kicker="Chapter 2" label="衍生品高阶 · 波动率曲面与路径依赖" />
      <SectionErrorBoundary name="衍生品高阶">
      <Suspense fallback={<SectionFallback />}>
        <div id="derivatives" className="scroll-mt-12"><DeferMount><DerivativesTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 3. 固收与组合 ─── */}
      <SectionDivider kicker="Chapter 3" label="固定收益 & 资产配置" />
      <SectionErrorBoundary name="固收与组合">
      <Suspense fallback={<SectionFallback />}>
        <div id="bond" className="scroll-mt-12"><DeferMount><BondCalculator /></DeferMount></div>
        <div id="rate-model" className="scroll-mt-12"><DeferMount><RateModelSimulator /></DeferMount></div>
        <div id="frontier" className="scroll-mt-12"><DeferMount><EfficientFrontier /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 4. 计量经济 ─── */}
      <SectionDivider kicker="Chapter 4" label="计量经济学 · 估计与状态空间" />
      <SectionErrorBoundary name="计量经济">
      <Suspense fallback={<SectionFallback />}>
        <div id="econometrics" className="scroll-mt-12"><DeferMount><EconometricsTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 5. 风险管理 ─── */}
      <SectionDivider kicker="Chapter 5" label="风险管理 · 信用、相依结构与压力测试" />
      <SectionErrorBoundary name="风险管理">
      <Suspense fallback={<SectionFallback />}>
        <div id="risk" className="scroll-mt-12"><DeferMount><RiskTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 6. 量化策略 ─── */}
      <SectionDivider kicker="Chapter 6" label="量化策略 · 回测与因子归因" />
      <SectionErrorBoundary name="量化策略">
      <Suspense fallback={<SectionFallback />}>
        <div id="quant" className="scroll-mt-12"><DeferMount><QuantStrategyTools /></DeferMount></div>
      </Suspense>
      </SectionErrorBoundary>

      {/* ─── 7. 测验与路径 ─── */}
      <SectionDivider kicker="Capstone" label="知识检验与学习路径" />
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
                系统化的实证方法学习平台 · 12 个交互式金融计算器,把教材公式跑成可调参数的真实计算。
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/70 mt-3 tracking-wider">
                A systematic approach to empirical methods in economics and finance.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">导航</p>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#calculator" className="text-muted-foreground hover:text-gold transition-colors">期权与隐含波动率</a></li>
                <li><a href="#bond" className="text-muted-foreground hover:text-gold transition-colors">固收 & 组合</a></li>
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
              Version 1.8
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
