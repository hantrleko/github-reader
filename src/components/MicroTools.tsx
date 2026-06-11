import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { EquationBlock } from "@/components/common/EquationBlock";
import {
  SupplyDemandTool, ConsumerChoiceTool, ProducerTheoryTool,
  MarketStructureTool, InfoEconomicsTool,
} from "./micro/V31MicroTools";

type ToolId = "supply-demand" | "consumer" | "producer" | "market-structure" | "info";

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "supply-demand", name: "供需均衡", nameEn: "Supply & Demand — Equilibrium, Tax Incidence & Deadweight Loss",
    formula: String.raw`Q_d(P^{*}) = Q_s(P^{*}) \;\Rightarrow\; P^{*} = \dfrac{a-c}{b+d},\qquad \mathrm{DWL} = \tfrac{1}{2}\,t\,\Delta Q`,
    component: SupplyDemandTool,
  },
  {
    id: "consumer", name: "消费者选择", nameEn: "Consumer Choice — Cobb-Douglas Utility & Slutsky Decomposition",
    formula: String.raw`\max_{x,y} \; x^{\alpha} y^{1-\alpha}\;\;\text{s.t.}\;\; P_x x + P_y y = I,\qquad \mathrm{MRS} = \dfrac{MU_x}{MU_y} = \dfrac{P_x}{P_y}`,
    component: ConsumerChoiceTool,
  },
  {
    id: "producer", name: "生产者理论", nameEn: "Producer Theory — Isoquant / Isocost & Short-run Cost Curves",
    formula: String.raw`\min_{K,L} \; wL + rK \;\;\text{s.t.}\;\; K^{\alpha} L^{1-\alpha} = q_0,\qquad \dfrac{MP_L}{MP_K} = \dfrac{w}{r}`,
    component: ProducerTheoryTool,
  },
  {
    id: "market-structure", name: "市场结构博弈", nameEn: "Market Structure — Cournot / Bertrand / Stackelberg / Monopoly",
    formula: String.raw`P = A - B\,Q,\;\; MC = c:\quad Q^{\text{mono}} = \tfrac{A-c}{2B},\;\; Q^{\text{cournot}}_n = \tfrac{n(A-c)}{(n+1)B},\;\; P^{\text{bertrand}} = c`,
    component: MarketStructureTool,
  },
  {
    id: "info", name: "信息经济学", nameEn: "Information Economics — Akerlof Lemons, Moral Hazard & Signaling",
    formula: String.raw`\text{买方愿付} = k\cdot\mathbb{E}[q\mid q\le P] = \tfrac{k}{2}P;\quad \text{市场存活} \iff k \ge 2`,
    component: InfoEconomicsTool,
  },
];

const MicroTools = () => {
  const [tool, setTool] = useState<ToolId>("supply-demand");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("micro", apply);
  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">Microeconomics</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">微观经济学</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            供需均衡 · 消费者选择 · 生产者理论 · 市场结构博弈 · 信息经济学 — 经济分析的微观基石
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
            <ShareExportToolbar storageKey="micro" anchorId="micro" state={{ tool }} captureRef={captureRef} filename={`micro-${tool}`} />
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

export default MicroTools;