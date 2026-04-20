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
        <div className="container text-center">
          <p className="text-xs font-mono text-muted-foreground tracking-wider">
            Economics & Finance Lab — 系统学习经济金融实证方法
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
