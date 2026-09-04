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

const TOOLS: { id: ToolId; name: string; shortEn: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "islm", name: "IS-LM", shortEn: "IS-LM", nameEn: "IS-LM — Goods & Money Market Equilibrium, Crowding-out",
    formula: String.raw`\text{IS}:\; R = \dfrac{A - (1-\text{mpc})Y}{b},\qquad \text{LM}:\; R = \dfrac{kY - M/P}{h}`,
    component: ISLMTool,
  },
  {
    id: "adas", name: "AD-AS", shortEn: "AD-AS", nameEn: "Aggregate Demand & Supply — Demand / Supply Shocks",
    formula: String.raw`\text{AD}:\; P = \bar A - Y,\qquad \text{SRAS}:\; P = P^{e} + \lambda(Y - Y^{n}),\qquad \text{LRAS}:\; Y = Y^{n}`,
    component: ADASTool,
  },
  {
    id: "phillips", name: "菲利普斯曲线", shortEn: "Phillips Curve", nameEn: "Expectations-Augmented Phillips Curve — Friedman-Phelps",
    formula: String.raw`\pi = \pi^{e} - \beta\,(u - u^{n}) + \varepsilon^{s},\qquad \text{长期}: u = u^{n} \Rightarrow \pi = \pi^{e}`,
    component: PhillipsTool,
  },
  {
    id: "mundell", name: "蒙代尔-弗莱明", shortEn: "Mundell-Fleming", nameEn: "Mundell-Fleming — Impossible Trinity & Policy Effectiveness",
    formula: String.raw`\text{IS-LM-BP}:\;\; \text{固定汇率} + \text{资本自由流动} + \text{独立货币政策} \;\Rightarrow\; \text{三选二}`,
    component: MundellFlemingTool,
  },
  {
    id: "ramsey", name: "拉姆齐模型", shortEn: "Ramsey Model", nameEn: "Ramsey-Cass-Koopmans — Optimal Growth & Saddle Path",
    formula: String.raw`\dfrac{\dot c}{c} = \dfrac{f'(k) - \rho - \theta g}{\theta},\qquad \dot k = f(k) - c - (n+\delta+g)\,k`,
    component: RamseyTool,
  },
  {
    id: "solow", name: "Solow 增长模型", shortEn: "Solow Growth", nameEn: "Solow-Swan Growth Model — Capital Accumulation & Golden Rule",
    formula: String.raw`\dot{\tilde k} \;=\; s\,\tilde k^{\alpha} \;-\; (n + g + \delta)\,\tilde k,\qquad \tilde k^{*} = \left(\dfrac{s}{n+g+\delta}\right)^{\!1/(1-\alpha)},\qquad s_{\text{gold}} = \alpha`,
    component: SolowTool,
  },
  {
    id: "dsge", name: "3 方程 NK DSGE", shortEn: "NK DSGE", nameEn: "3-Equation New Keynesian DSGE — Clarida-Galí-Gertler IRF",
    formula: String.raw`x_t = \mathbb{E}_t x_{t+1} - \tfrac{1}{\sigma}(i_t - \mathbb{E}_t \pi_{t+1}),\quad \pi_t = \beta\,\mathbb{E}_t \pi_{t+1} + \kappa\, x_t,\quad i_t = \phi_\pi \pi_t + \phi_x x_t`,
    component: DSGENKTool,
  },
  {
    id: "hank", name: "HANK / TANK 教学版", shortEn: "HANK / TANK", nameEn: "Heterogeneous Agent NK — HTM Share & Aggregate MPC",
    formula: String.raw`x_t = \mathbb{E}_t x_{t+1} - \tfrac{1-\lambda}{\sigma}(i_t - \mathbb{E}_t \pi_{t+1}),\qquad \mathrm{MPC}^{\mathrm{agg}} = \lambda + (1-\lambda)\,\mathrm{MPC}^{R}`,
    component: HANKTool,
  },
  {
    id: "realopt", name: "实物期权 (投资递延)", shortEn: "Real Options", nameEn: "Real Options — Investment Deferral à la Dixit-Pindyck",
    formula: String.raw`F(V) = \max\!\bigl\{V - I,\; e^{-r\,dt}\,\mathbb{E}[F(V_{t+dt})]\bigr\},\qquad V^{*} = \tfrac{\beta}{\beta-1}\,I,\quad \beta>1`,
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
              {en ? x.shortEn : x.name}
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
              <EquationBlock math={Active.formula} />
            </div>
          </div>
          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default MacroTools;
