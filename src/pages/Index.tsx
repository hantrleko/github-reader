import HeroSection from "@/components/HeroSection";
import TopicCards from "@/components/TopicCards";
import ModelShowcase from "@/components/ModelShowcase";
import CalculatorSection from "@/components/CalculatorSection";
import EfficientFrontier from "@/components/EfficientFrontier";
import BondCalculator from "@/components/BondCalculator";
import RateModelSimulator from "@/components/RateModelSimulator";
import ImpliedVolTool from "@/components/ImpliedVolTool";
import LearningPath from "@/components/LearningPath";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <TopicCards />
      <ModelShowcase />
      <CalculatorSection />
      <ImpliedVolTool />
      <EfficientFrontier />
      <BondCalculator />
      <RateModelSimulator />
      <LearningPath />

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
