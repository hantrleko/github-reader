import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { VolSurfaceTool, AmericanOptionTool, RatesDerivativesTool } from "./deriv/Sprint3Tools";

type ToolId = "vol" | "amer" | "rates";

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "vol", name: "波动率曲面 (SVI 3D)", nameEn: "Implied Volatility Surface — SVI Parametrization",
    formula: String.raw`w(k) \;=\; a + b\bigl\{\rho(k - m) + \sqrt{(k-m)^2 + \sigma^2}\bigr\},\qquad \sigma_{\mathrm{IV}}(k,T) = \sqrt{w(k)/T}`,
    component: VolSurfaceTool,
  },
  {
    id: "amer", name: "美式期权 (LSM)", nameEn: "American Option — Longstaff-Schwartz Least-Squares Monte Carlo",
    formula: String.raw`\hat C_{\text{cont}}(S_t) = \beta_0 + \beta_1 S_t + \beta_2 S_t^2,\qquad \tau^* = \min\{t:\; \text{Payoff}(S_t) > \hat C_{\text{cont}}(S_t)\}`,
    component: AmericanOptionTool,
  },
  {
    id: "rates", name: "利率衍生品 (Cap/Floor/Swaption)", nameEn: "Interest Rate Derivatives — Black-76 Pricing",
    formula: String.raw`\text{Caplet} = \tau\,P(0,T_{i+1})\bigl[F_i\Phi(d_1) - K\Phi(d_2)\bigr],\qquad \text{Swaption} = A_{\text{ann}}\bigl[S_0\Phi(d_1) - K\Phi(d_2)\bigr]`,
    component: RatesDerivativesTool,
  },
];

const DerivativesTools = () => {
  const { t } = useTranslation();
  const [tool, setTool] = useState<ToolId>("vol");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("deriv", apply);
  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">{t("sections.deriv.tag")}</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">{t("sections.deriv.title")}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">{t("sections.deriv.subtitle")}</p>
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
            <ShareExportToolbar storageKey="deriv" anchorId="derivatives" state={{ tool }} captureRef={captureRef} filename={`deriv-${tool}`} />
          </div>
          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">{Active.nameEn}</p>
            <div className="text-foreground katex-display-gold">
              <BlockMath math={Active.formula} />
            </div>
          </div>
          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default DerivativesTools;
