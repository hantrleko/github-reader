import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { HistoryDrawer } from "@/components/common/HistoryDrawer";
import { BacktestTool, BlackLittermanTool, FamaFrenchTool } from "./quant/Sprint4Tools";
import { RiskParityTool } from "./quant/RiskParityTool";
import { WalkForwardTool } from "./quant/WalkForwardTool";
import { EquationBlock } from "@/components/common/EquationBlock";

type ToolId = "backtest" | "walkforward" | "bl" | "rp" | "ff5";

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "backtest", name: "策略回测引擎", nameEn: "Strategy Backtester — Momentum / Mean-Reversion / Pairs",
    formula: String.raw`\mathrm{PnL}_t = w_t \cdot r_t - |w_t - w_{t-1}|\cdot c,\qquad \text{Sharpe} = \dfrac{\bar r_p \cdot 252}{\sigma_p \sqrt{252}},\qquad \text{Calmar} = \dfrac{R_{\text{ann}}}{\mathrm{MaxDD}}`,
    component: BacktestTool,
  },
  {
    id: "walkforward", name: "Walk-Forward 样本外检验", nameEn: "Walk-Forward Analysis — Rolling Out-of-Sample Validation & Overfitting",
    formula: String.raw`\text{IS: } k^*=\arg\max_k \mathrm{Sharpe}_{\text{train}}(k),\qquad \text{OOS: apply } k^* \text{ on next window},\qquad \text{Gap}=\mathrm{Sharpe}_{\text{IS}}-\mathrm{Sharpe}_{\text{OOS}}`,
    component: WalkForwardTool,
  },
  {
    id: "bl", name: "Black-Litterman 贝叶斯组合", nameEn: "Black-Litterman Bayesian Portfolio Construction",
    formula: String.raw`\pi = \delta\,\Sigma\, w_{\text{mkt}},\qquad \tilde\mu = \pi + \tau\Sigma P^{\!\top}\!\bigl(P\,\tau\Sigma\,P^{\!\top}+\Omega\bigr)^{\!-1}\!\bigl(Q - P\pi\bigr)`,
    component: BlackLittermanTool,
  },
  {
    id: "rp", name: "Risk Parity / HRP", nameEn: "Risk Parity (ERC) & Hierarchical Risk Parity — Maillard 2010 / Lopez de Prado 2016",
    formula: String.raw`\text{ERC: } w_i\,(\Sigma w)_i = w_j\,(\Sigma w)_j\;\;\forall\,i,j,\qquad \text{HRP: } d_{ij}=\sqrt{(1-\rho_{ij})/2}\;\to\;\text{cluster}\;\to\;\text{recursive bisection}`,
    component: RiskParityTool,
  },
  {
    id: "ff5", name: "Fama-French 5 因子归因", nameEn: "Fama-French 5-Factor Performance Attribution",
    formula: String.raw`R_{p,t} - R_{f,t} = \alpha + \beta_{\mathrm{MKT}}\,\mathrm{MKT}_t + \beta_{\mathrm{SMB}}\,\mathrm{SMB}_t + \beta_{\mathrm{HML}}\,\mathrm{HML}_t + \beta_{\mathrm{RMW}}\,\mathrm{RMW}_t + \beta_{\mathrm{CMA}}\,\mathrm{CMA}_t + \varepsilon_t`,
    component: FamaFrenchTool,
  },
];

const QuantStrategyTools = () => {
  const { t } = useTranslation();
  const [tool, setTool] = useState<ToolId>("backtest");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("quant", apply);
  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">{t("sections.quant.tag")}</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">{t("sections.quant.title")}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">{t("sections.quant.subtitle")}</p>
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
          <div className="flex flex-wrap justify-end gap-2 mb-4">
            <HistoryDrawer
              storageKey="quant"
              currentState={{ tool }}
              onApply={(s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }}
              summarize={(s: any) => `工具: ${s.tool}`}
            />
            <ShareExportToolbar storageKey="quant" anchorId="quant" state={{ tool }} captureRef={captureRef} filename={`quant-${tool}`} />
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

export default QuantStrategyTools;
