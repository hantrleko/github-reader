import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToolTab } from "@/lib/useToolTab";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { SolowTool } from "./macro/SolowTool";
import { DSGENKTool, HANKTool, RealOptionsTool } from "./macro/V27Tools";
import { ISLMTool, ADASTool, PhillipsTool, MundellFlemingTool, RamseyTool } from "./macro/ClassicMacroTools";
import { EquationBlock } from "@/components/common/EquationBlock";

type ToolId = "islm" | "adas" | "phillips" | "mundell" | "ramsey" | "solow" | "dsge" | "hank" | "realopt";

const TOOLS: { id: ToolId; name: string; shortEn: string; nameEn: string; formula: string | ((en: boolean) => string); component: React.FC }[] = [
  {
    id: "islm", name: "labs.macroClassic.tools.islm", shortEn: "IS-LM", nameEn: "IS-LM — Goods & Money Market Equilibrium, Crowding-out",
    formula: (en: boolean) => String.raw`\text{IS}:\; R = \dfrac{A - (1-\text{mpc})Y}{b},\qquad \text{LM}:\; R = \dfrac{kY - M/P}{h}`,
    component: ISLMTool,
  },
  {
    id: "adas", name: "labs.macroClassic.tools.adas", shortEn: "AD-AS", nameEn: "Aggregate Demand & Supply — Demand / Supply Shocks",
    formula: (en: boolean) => String.raw`\text{AD}:\; P = \bar A - Y,\qquad \text{SRAS}:\; P = P^{e} + \lambda(Y - Y^{n}),\qquad \text{LRAS}:\; Y = Y^{n}`,
    component: ADASTool,
  },
  {
    id: "phillips", name: "labs.macroClassic.tools.phillips", shortEn: "Phillips Curve", nameEn: "Expectations-Augmented Phillips Curve — Friedman-Phelps",
    formula: (en: boolean) => String.raw`\pi = \pi^{e} - \beta\,(u - u^{n}) + \varepsilon^{s},\qquad \text{${en ? "Long-run" : "长期"}}: u = u^{n} \Rightarrow \pi = \pi^{e}`,
    component: PhillipsTool,
  },
  {
    id: "mundell", name: "labs.macroClassic.tools.mundell", shortEn: "Mundell-Fleming", nameEn: "Mundell-Fleming — Impossible Trinity & Policy Effectiveness",
    formula: (en: boolean) => String.raw`\text{IS-LM-BP}:\;\; \text{${en ? "Fixed Rate" : "固定汇率"}} + \text{${en ? "Capital Mobility" : "资本自由流动"}} + \text{${en ? "Indep. Monetary Policy" : "独立货币政策"}} \;\Rightarrow\; \text{${en ? "Pick Two" : "三选二"}}`,
    component: MundellFlemingTool,
  },
  {
    id: "ramsey", name: "labs.macroClassic.tools.ramsey", shortEn: "Ramsey Model", nameEn: "Ramsey-Cass-Koopmans — Optimal Growth & Saddle Path",
    formula: (en: boolean) => String.raw`\dfrac{\dot c}{c} = \dfrac{f'(k) - \rho - \theta g}{\theta},\qquad \dot k = f(k) - c - (n+\delta+g)\,k`,
    component: RamseyTool,
  },
  {
    id: "solow", name: "labs.macroClassic.tools.solow", shortEn: "Solow Growth", nameEn: "Solow-Swan Growth Model — Capital Accumulation & Golden Rule",
    formula: (en: boolean) => String.raw`\dot{\tilde k} \;=\; s\,\tilde k^{\alpha} \;-\; (n + g + \delta)\,\tilde k,\qquad \tilde k^{*} = \left(\dfrac{s}{n+g+\delta}\right)^{\!1/(1-\alpha)},\qquad s_{\text{gold}} = \alpha`,
    component: SolowTool,
  },
  {
    id: "dsge", name: "labs.macroClassic.tools.dsge", shortEn: "NK DSGE", nameEn: "3-Equation New Keynesian DSGE — Clarida-Galí-Gertler IRF",
    formula: (en: boolean) => String.raw`x_t = \mathbb{E}_t x_{t+1} - \tfrac{1}{\sigma}(i_t - \mathbb{E}_t \pi_{t+1}),\quad \pi_t = \beta\,\mathbb{E}_t \pi_{t+1} + \kappa\, x_t,\quad i_t = \phi_\pi \pi_t + \phi_x x_t`,
    component: DSGENKTool,
  },
  {
    id: "hank", name: "labs.macroClassic.tools.hank", shortEn: "HANK / TANK", nameEn: "Heterogeneous Agent NK — HTM Share & Aggregate MPC",
    formula: (en: boolean) => String.raw`x_t = \mathbb{E}_t x_{t+1} - \tfrac{1-\lambda}{\sigma}(i_t - \mathbb{E}_t \pi_{t+1}),\qquad \mathrm{MPC}^{\mathrm{agg}} = \lambda + (1-\lambda)\,\mathrm{MPC}^{R}`,
    component: HANKTool,
  },
  {
    id: "realopt", name: "labs.macroClassic.tools.realopt", shortEn: "Real Options", nameEn: "Real Options — Investment Deferral à la Dixit-Pindyck",
    formula: (en: boolean) => String.raw`F(V) = \max\!\bigl\{V - I,\; e^{-r\,dt}\,\mathbb{E}[F(V_{t+dt})]\bigr\},\qquad V^{*} = \tfrac{\beta}{\beta-1}\,I,\quad \beta>1`,
    component: RealOptionsTool,
  },
];

const MacroTools = () => {
  const { t, i18n } = useTranslation();
  const en = i18n.language?.startsWith("en");
  const [tool, setTool] = useToolTab<ToolId>(TOOLS.map((x) => x.id), "solow");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("macro", apply);
  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">Macroeconomics &amp; Corporate Finance</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">{t("labs.macro.title")}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            {t("labs.macro.subtitle")}
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {TOOLS.map(x => (
            <button key={x.id} onClick={() => setTool(x.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 ${
                tool === x.id ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}>
              {en ? x.shortEn : t(x.name)}
            </button>
          ))}
        </div>

        <motion.div key={tool} ref={captureRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 md:p-10 glow-gold">
          <div className="flex justify-end mb-4">
            <ShareExportToolbar storageKey="macro" anchorId="macro" state={{ tool }} captureRef={captureRef} filename={`macro-${tool}`} />
          </div>
          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">{Active.nameEn}</p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock math={typeof Active.formula === "function" ? Active.formula(en) : Active.formula} />
            </div>
          </div>
          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default MacroTools;
