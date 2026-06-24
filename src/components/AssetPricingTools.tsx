import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { EquationBlock } from "@/components/common/EquationBlock";
import { CAPMTool, APTTool, FamaFrenchTool, FamaMacBethTool } from "./asset/V31AssetTools";

type ToolId = "capm" | "apt" | "famafrench" | "famamacbeth";

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "capm", name: "CAPM / SML", nameEn: "Capital Asset Pricing Model — Security Market Line & Jensen's Alpha",
    formula: String.raw`E(R_i) = R_f + \beta_i\,[E(R_m) - R_f],\qquad \alpha_i = R_i - [R_f + \beta_i(E(R_m)-R_f)]`,
    component: CAPMTool,
  },
  {
    id: "apt", name: "APT 多因子", nameEn: "Arbitrage Pricing Theory — Multi-Factor Linear Pricing",
    formula: String.raw`E(R_i) = R_f + \beta_{i1}F_1 + \beta_{i2}F_2 + \cdots + \beta_{ik}F_k`,
    component: APTTool,
  },
  {
    id: "famafrench", name: "Fama-French 回归", nameEn: "Fama-French 3 / 5-Factor Regression — Performance Attribution",
    formula: String.raw`R_i - R_f = \alpha + \beta_1(R_m - R_f) + \beta_2\,\mathrm{SMB} + \beta_3\,\mathrm{HML} + \beta_4\,\mathrm{RMW} + \beta_5\,\mathrm{CMA} + \varepsilon`,
    component: FamaFrenchTool,
  },
  {
    id: "famamacbeth", name: "Fama-MacBeth", nameEn: "Fama-MacBeth Two-Pass Cross-Sectional Regression (Shanken-corrected)",
    formula: String.raw`\text{Pass 1: } R_{it}-R_f=\alpha_i+\beta_i F_t+\varepsilon_{it};\quad \text{Pass 2: } R_{it}=\gamma_0+\lambda_t\beta_i+u_{it},\ \hat\lambda=\tfrac1T\textstyle\sum_t\lambda_t`,
    component: FamaMacBethTool,
  },
];

const AssetPricingTools = () => {
  const [tool, setTool] = useState<ToolId>("capm");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("asset", apply);
  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">Asset Pricing</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">资产定价</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            CAPM 证券市场线 · APT 多因子 · Fama-French 三/五因子归因 — 从单因子均衡到多因子横截面
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 ${
                tool === t.id ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}>
              {t.name}
            </button>
          ))}
        </div>

        <motion.div key={tool} ref={captureRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 md:p-10 glow-gold">
          <div className="flex justify-end mb-4">
            <ShareExportToolbar storageKey="asset" anchorId="asset-pricing" state={{ tool }} captureRef={captureRef} filename={`asset-${tool}`} />
          </div>
          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">{Active.nameEn}</p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock math={Active.formula} />
            </div>
          </div>
          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default AssetPricingTools;