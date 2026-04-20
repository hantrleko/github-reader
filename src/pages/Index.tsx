import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TopicCards from "@/components/TopicCards";
import ModelShowcase from "@/components/ModelShowcase";
import CalculatorSection from "@/components/CalculatorSection";
import EfficientFrontier from "@/components/EfficientFrontier";
import BondCalculator from "@/components/BondCalculator";
import RateModelSimulator from "@/components/RateModelSimulator";
import ImpliedVolTool from "@/components/ImpliedVolTool";
import MCOptionPricer from "@/components/MCOptionPricer";
import LearningPath from "@/components/LearningPath";
import EconometricsTools from "@/components/EconometricsTools";

const Index = () => {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(t);
  }, [hash]);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div id="hero" className="scroll-mt-12"><HeroSection /></div>
      <div id="topics" className="scroll-mt-12"><TopicCards /></div>
      <div id="models" className="scroll-mt-12"><ModelShowcase /></div>
      <div id="calculator" className="scroll-mt-12"><CalculatorSection /></div>
      <div id="implied-vol" className="scroll-mt-12"><ImpliedVolTool /></div>
      <div id="mc-pricer" className="scroll-mt-12"><MCOptionPricer /></div>
      <div id="frontier" className="scroll-mt-12"><EfficientFrontier /></div>
      <div id="bond" className="scroll-mt-12"><BondCalculator /></div>
      <div id="rate-model" className="scroll-mt-12"><RateModelSimulator /></div>
      <div id="econometrics" className="scroll-mt-12"><EconometricsTools /></div>
      <div id="learning" className="scroll-mt-12"><LearningPath /></div>

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
            Version 1.0  ·  © 2026
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
