import { motion } from "framer-motion";
import { Brain, Network, Users, Leaf, Activity, Coins, Landmark } from "lucide-react";

interface Concept {
  icon: React.FC<{ className?: string }>;
  tag: string;
  title: string;
  idea: string;
  finding: string;
  refs: string[];
}

const CONCEPTS: Concept[] = [
  {
    icon: Brain,
    tag: "6.1 AI / ML",
    title: "AI 驱动的资产定价",
    idea: "深度神经网络以无套利条件为准则估计随机贴现因子 (SDF)；大语言模型 (LLM) 用于经济预测与概念测量。",
    finding: "深度 SDF 在夏普比率、解释变异、定价误差上全面超越传统线性因子模型。",
    refs: ["Chen, Pelger & Zhu (2024), Management Science", "Rambachan et al. (2024), arXiv:2412.07031"],
  },
  {
    icon: Users,
    tag: "6.2 ABM",
    title: "基于智能体的模型",
    idea: "自底向上从微观个体行为涌现宏观现象，无需代表性代理人假设；LLM 智能体 (EconAgent / TradingAgents) 再现经典宏观与交易行为。",
    finding: "多智能体交易者行为可数学聚合推导出 GARCH 波动聚集；CBDC 仿真揭示对银行中介的重塑。",
    refs: ["Li et al. (2024), ACL Outstanding", "Nakagawa et al. (2025), Springer PRIMA"],
  },
  {
    icon: Network,
    tag: "6.3 复杂网络",
    title: "网络与 GNN 系统性风险",
    idea: "金融系统是复杂网络（银行间借贷、供应链、贸易）；图神经网络 (GNN) 将系统性风险度量扩展到图结构数据。",
    finding: "动态 GNN 捕捉网络结构的时间演化，量化系统性风险的传播路径与放大机制。",
    refs: ["GNN 系统性风险 (2024), arXiv:2410.07222", "动态 GNN 金融危机 (2025), SAGE"],
  },
  {
    icon: Leaf,
    tag: "6.4 气候金融",
    title: "气候风险定价",
    idea: "将物理风险与转型风险整合进资产定价；Climate VaR 用 NGFS/IPCC 情景评估政策、技术、物理三支柱冲击。",
    finding: "当碳税低于社会碳成本时，棕色资产反而可能成为对冲工具——挑战传统 ESG 直觉。",
    refs: ["Gârleanu & Pedersen (2025), NBER", "MSCI Climate VaR (2024)"],
  },
  {
    icon: Activity,
    tag: "6.5 神经经济学",
    title: "行为与神经金融新模型",
    idea: "行为金融从描述走向量化建模；神经经济学将脑成像数据直接融入金融决策预测 (MCoRNN-MCD 等)。",
    finding: "'神经金融'从实验室走向应用，预示决策机制可被直接测量与建模。",
    refs: ["神经经济学新模型 (2024-2025)"],
  },
  {
    icon: Coins,
    tag: "6.6 DeFi",
    title: "去中心化金融模型",
    idea: "自动做市商 (AMM) 取代订单簿，流动性池取代做市商；DeFi 模型从描述走向严谨经济学分析。",
    finding: "网络概率传染模型量化双边负债金融网络上的系统性风险传播。",
    refs: ["网络概率系统性风险 (2024), QREF"],
  },
  {
    icon: Landmark,
    tag: "6.7 宏观金融",
    title: "CBDC 与宏观审慎新框架",
    idea: "将 CBDC、银行摩擦与多种政策工具纳入统一新凯恩斯框架；宏观审慎 DSGE 评估 LTV/DSTI 等工具交互。",
    finding: "CBDC 利率政策效果取决于货币锚定制度；高替代性下 CBDC 经济近似无 CBDC 经济。",
    refs: ["Bhattarai et al. (2024-25), Bank of Canada", "宏观审慎 DSGE (2024-25), Oxford Bulletin"],
  },
];

const FrontierConcepts = () => {
  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-6xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">Frontier Paradigms · 2024–2026</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">前沿模型与新兴范式</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            AI/ML · 多智能体仿真 · 复杂网络 · 气候金融 · 神经经济学 · DeFi · 宏观金融 — 概念地图（持续追踪最新文献）
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONCEPTS.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.tag}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card/40 p-5 hover:border-gold/40 transition-colors flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gold/10 text-gold">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">{c.tag}</span>
                </div>
                <h3 className="text-base font-display text-foreground mb-2 leading-snug">{c.title}</h3>
                <p className="text-xs text-foreground/70 leading-relaxed mb-3">{c.idea}</p>
                <div className="rounded-lg border border-gold/15 bg-gold/[0.03] p-2.5 mb-3">
                  <p className="text-[10px] font-mono text-gold mb-1">关键发现</p>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{c.finding}</p>
                </div>
                <div className="mt-auto pt-2 border-t border-border/40 space-y-0.5">
                  {c.refs.map(ref => (
                    <p key={ref} className="text-[10px] font-mono text-muted-foreground/60 italic leading-snug">{ref}</p>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-[11px] font-mono text-muted-foreground/60 mt-8">
          概念卡片为研究导航；交互式实现将在后续版本逐步上线。
        </p>
      </div>
    </section>
  );
};

export default FrontierConcepts;