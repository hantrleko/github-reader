import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { SolowTool } from "./macro/SolowTool";
import { EquationBlock } from "@/components/common/EquationBlock";

type ToolId = "solow";

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "solow", name: "Solow 增长模型", nameEn: "Solow-Swan Growth Model — Capital Accumulation & Golden Rule",
    formula: String.raw`\dot{\tilde k} \;=\; s\,\tilde k^{\alpha} \;-\; (n + g + \delta)\,\tilde k,\qquad \tilde k^{*} = \left(\dfrac{s}{n+g+\delta}\right)^{\!1/(1-\alpha)},\qquad s_{\text{gold}} = \alpha`,
    component: SolowTool,
  },
];

const MacroTools = () => {
  const [tool, setTool] = useState<ToolId>("solow");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("macro", apply);
  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">Macroeconomics</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">宏观经济学</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            从增长理论起步：交互式数值动力学,可视化稳态收敛与黄金率消费最大化
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
