import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Network, Users, Leaf, Activity, Coins, Landmark,
  ChevronDown, Sigma, Wrench, AlertTriangle, FlaskConical,
} from "lucide-react";

const AmmTool = lazy(() => import("./frontier/AmmTool"));
const ContagionTool = lazy(() => import("./frontier/ContagionTool"));
const ClimateVaRTool = lazy(() => import("./frontier/ClimateVaRTool"));
const ProspectTheoryTool = lazy(() => import("./frontier/ProspectTheoryTool"));

const LAB_TOOLS = [
  { id: "amm", icon: Coins, name: "DeFi · AMM", desc: "恒积做市商滑点与无常损失", Tool: AmmTool },
  { id: "contagion", icon: Network, name: "网络 · 传染", desc: "DebtRank 违约级联", Tool: ContagionTool },
  { id: "climate", icon: Leaf, name: "气候 · Climate VaR", desc: "NGFS 情景重估损失", Tool: ClimateVaRTool },
  { id: "prospect", icon: Activity, name: "神经 · 前景理论", desc: "价值函数与概率加权", Tool: ProspectTheoryTool },
] as const;

interface Concept {
  icon: React.FC<{ className?: string }>;
  tag: string;
  title: string;
  idea: string;
  finding: string;
  method: string;
  formula: string;
  formulaNote: string;
  application: string;
  limitation: string;
  refs: string[];
}

const CONCEPTS: Concept[] = [
  {
    icon: Brain,
    tag: "6.1 AI / ML",
    title: "AI 驱动的资产定价",
    idea: "深度神经网络以无套利条件为准则估计随机贴现因子 (SDF)；大语言模型 (LLM) 用于经济预测与概念测量。",
    finding: "深度 SDF 在夏普比率、解释变异、定价误差上全面超越传统线性因子模型。",
    method: "用前馈/循环网络从数百个公司特征中提取非线性因子载荷，并以 GMM 矩条件（定价误差最小化）作为损失函数训练 SDF；对抗式网络生成最难定价的资产组合，迫使 SDF 满足无套利。",
    formula: "E[ M · R^e ] = 0,  M = 1 − Σ wᵢ(x) Fᵢ",
    formulaNote: "SDF 权重 wᵢ(x) 由神经网络以特征 x 为输入估计；对所有可交易组合超额收益 Rᵉ 的定价误差应为零。",
    application: "因子投资、横截面收益预测、宏观情景下的资产配置；LLM 抽取财报/新闻情绪作为额外状态变量。",
    limitation: "黑箱可解释性弱、易过拟合、对宏观结构突变缺乏稳健性；样本外衰减与数据窥探仍是核心担忧。",
    refs: ["Chen, Pelger & Zhu (2024), Management Science", "Rambachan et al. (2024), arXiv:2412.07031"],
  },
  {
    icon: Users,
    tag: "6.2 ABM",
    title: "基于智能体的模型",
    idea: "自底向上从微观个体行为涌现宏观现象，无需代表性代理人假设；LLM 智能体 (EconAgent / TradingAgents) 再现经典宏观与交易行为。",
    finding: "多智能体交易者行为可数学聚合推导出 GARCH 波动聚集；CBDC 仿真揭示对银行中介的重塑。",
    method: "为异质智能体定义行为规则（基本面/趋势/噪声交易者），通过市场撮合机制反复迭代，观察价格、成交量等宏观统计量的涌现；近年用 LLM 赋予智能体语言推理能力。",
    formula: "pₜ₊₁ = pₜ + κ ( D(fundamentalists) + D(chartists) ) + εₜ",
    formulaNote: "价格调整正比于基本面派与趋势派的净需求 D，κ 为市场流动性深度；非线性切换产生肥尾与波动聚集。",
    application: "压力测试、政策实验（CBDC、交易税）、市场微观结构研究、闪崩与流动性枯竭情景模拟。",
    limitation: "参数校准困难、结果对行为假设敏感、缺乏统一的可证伪标准；计算成本随智能体数量快速上升。",
    refs: ["Li et al. (2024), ACL Outstanding", "Nakagawa et al. (2025), Springer PRIMA"],
  },
  {
    icon: Network,
    tag: "6.3 复杂网络",
    title: "网络与 GNN 系统性风险",
    idea: "金融系统是复杂网络（银行间借贷、供应链、贸易）；图神经网络 (GNN) 将系统性风险度量扩展到图结构数据。",
    finding: "动态 GNN 捕捉网络结构的时间演化，量化系统性风险的传播路径与放大机制。",
    method: "将机构建模为节点、敞口建模为带权有向边；用消息传递层聚合邻居风险状态，结合 DebtRank / 违约传染模型预测级联失效与系统重要性 (SIFI)。",
    formula: "hᵢ⁽ˡ⁺¹⁾ = σ( Σ_{j∈N(i)} αᵢⱼ W hⱼ⁽ˡ⁾ )",
    formulaNote: "节点表示 h 通过注意力权重 αᵢⱼ 聚合邻居信息；多层传播即模拟风险沿网络的逐级扩散。",
    application: "央行宏观审慎监管、SIFI 识别、传染路径预警、供应链脆弱性与贸易冲击评估。",
    limitation: "敞口数据稀缺且滞后、网络结构内生于危机本身、过度平滑使深层 GNN 难以训练。",
    refs: ["GNN 系统性风险 (2024), arXiv:2410.07222", "动态 GNN 金融危机 (2025), SAGE"],
  },
  {
    icon: Leaf,
    tag: "6.4 气候金融",
    title: "气候风险定价",
    idea: "将物理风险与转型风险整合进资产定价；Climate VaR 用 NGFS/IPCC 情景评估政策、技术、物理三支柱冲击。",
    finding: "当碳税低于社会碳成本时，棕色资产反而可能成为对冲工具——挑战传统 ESG 直觉。",
    method: "在贴现现金流/资产定价框架中引入碳价路径与气候情景；将物理损失与转型成本映射为现金流冲击，按 NGFS 情景重估资产价值并计算尾部损失。",
    formula: "Climate VaR = V₀ − E[ Σ CFₜ(s) / (1+r)ᵗ ]",
    formulaNote: "对每条气候情景 s（有序/无序转型、温室世界）重估贴现现金流，取分位损失即气候在险价值。",
    application: "ESG 投资组合压力测试、转型路径下的行业重定价、绿色溢价 / 棕色折价估计、监管气候情景披露。",
    limitation: "长期情景不确定性极高、缺乏历史数据校准、碳价与政策路径假设主导结果。",
    refs: ["Gârleanu & Pedersen (2025), NBER", "MSCI Climate VaR (2024)"],
  },
  {
    icon: Activity,
    tag: "6.5 神经经济学",
    title: "行为与神经金融新模型",
    idea: "行为金融从描述走向量化建模；神经经济学将脑成像数据直接融入金融决策预测 (MCoRNN-MCD 等)。",
    finding: "'神经金融'从实验室走向应用，预示决策机制可被直接测量与建模。",
    method: "在前景理论效用框架上叠加生理/神经信号（fMRI、皮电、眼动）作为状态变量，用深度序列模型预测风险决策与市场情绪转变。",
    formula: "V = Σ π(pᵢ) · v(xᵢ),  v(x) = x^α (x≥0); −λ(−x)^β (x<0)",
    formulaNote: "前景理论价值函数：损失厌恶系数 λ>1，概率经主观加权 π；神经数据用于估计个体化的 α、β、λ。",
    application: "个性化投顾、风险偏好测量、市场情绪指标、行为偏差的实时识别与干预。",
    limitation: "神经数据采集成本高、样本小、外部效度受限；伦理与隐私约束限制大规模应用。",
    refs: ["神经经济学新模型 (2024-2025)"],
  },
  {
    icon: Coins,
    tag: "6.6 DeFi",
    title: "去中心化金融模型",
    idea: "自动做市商 (AMM) 取代订单簿，流动性池取代做市商；DeFi 模型从描述走向严谨经济学分析。",
    finding: "网络概率传染模型量化双边负债金融网络上的系统性风险传播。",
    method: "用恒定函数做市商 (CFMM) 刻画流动性池定价，分析无常损失、套利与 MEV；以网络模型研究借贷协议清算的连锁传染。",
    formula: "x · y = k  ⇒  price = y / x",
    formulaNote: "恒积做市商：池中两资产储备乘积守恒，边际价格由储备比决定；大额交易产生滑点与无常损失。",
    application: "去中心化交易所设计、流动性挖矿激励、清算风险评估、稳定币与超额抵押借贷机制。",
    limitation: "智能合约风险、预言机操纵、监管不确定、极端行情下流动性与清算的反身性脆弱。",
    refs: ["网络概率系统性风险 (2024), QREF"],
  },
  {
    icon: Landmark,
    tag: "6.7 宏观金融",
    title: "CBDC 与宏观审慎新框架",
    idea: "将 CBDC、银行摩擦与多种政策工具纳入统一新凯恩斯框架；宏观审慎 DSGE 评估 LTV/DSTI 等工具交互。",
    finding: "CBDC 利率政策效果取决于货币锚定制度；高替代性下 CBDC 经济近似无 CBDC 经济。",
    method: "在 DSGE 中引入银行部门、抵押约束与 CBDC 作为另一种安全资产；通过脉冲响应与福利分析评估宏观审慎工具与货币政策的交互。",
    formula: "bₜ ≤ θ · Et[ qₜ₊₁ kₜ ] / Rₜ",
    formulaNote: "抵押约束：借款上限正比于贷款价值比 θ 与未来抵押品价值；LTV/DSTI 工具通过调节 θ 抑制顺周期杠杆。",
    application: "央行数字货币设计、宏观审慎政策搭配、银行脱媒风险评估、利率政策传导分析。",
    limitation: "线性化解法难捕捉危机非线性、行为基础受卢卡斯批判约束、参数对福利结论敏感。",
    refs: ["Bhattarai et al. (2024-25), Bank of Canada", "宏观审慎 DSGE (2024-25), Oxford Bulletin"],
  },
];

const FrontierConcepts = () => {
  const [open, setOpen] = useState<string | null>(null);
  const [activeLab, setActiveLab] = useState<string>("amm");
  const ActiveTool = LAB_TOOLS.find((t) => t.id === activeLab)?.Tool ?? AmmTool;
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {CONCEPTS.map((c, i) => {
            const Icon = c.icon;
            const isOpen = open === c.tag;
            return (
              <motion.div
                key={c.tag}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`rounded-2xl border bg-card/40 p-5 transition-colors flex flex-col ${isOpen ? "border-gold/50" : "border-border hover:border-gold/40"}`}
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

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pb-2">
                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] font-mono text-gold/80 mb-1">
                            <Wrench className="w-3 h-3" /> 方法论
                          </p>
                          <p className="text-[11px] text-foreground/75 leading-relaxed">{c.method}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                          <p className="flex items-center gap-1.5 text-[10px] font-mono text-gold/80 mb-1.5">
                            <Sigma className="w-3 h-3" /> 数学直觉
                          </p>
                          <code className="block text-[11px] font-mono text-foreground/90 leading-relaxed break-words">{c.formula}</code>
                          <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-1.5">{c.formulaNote}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <p className="text-[10px] font-mono text-emerald-400/80 mb-1">应用场景</p>
                            <p className="text-[11px] text-foreground/75 leading-relaxed">{c.application}</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1.5 text-[10px] font-mono text-destructive/70 mb-1">
                              <AlertTriangle className="w-3 h-3" /> 局限与争议
                            </p>
                            <p className="text-[11px] text-foreground/75 leading-relaxed">{c.limitation}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setOpen(isOpen ? null : c.tag)}
                  className="mt-3 flex items-center justify-between w-full text-[11px] font-mono text-gold/80 hover:text-gold transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{isOpen ? "收起" : "深入 · 方法 / 公式 / 局限"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                <div className="mt-auto pt-3 border-t border-border/40 space-y-0.5">
                  {c.refs.map(ref => (
                    <p key={ref} className="text-[10px] font-mono text-muted-foreground/60 italic leading-snug">{ref}</p>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-[11px] font-mono text-muted-foreground/60 mt-8">
          每张卡片可展开方法论、数学直觉与局限；下方互动实验室已上线 AMM、网络传染、Climate VaR 与前景理论四个可交互模型。
        </p>

        {/* Interactive lab */}
        <div className="mt-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <FlaskConical className="w-4 h-4 text-gold" />
            <h3 className="text-xl md:text-2xl font-display font-bold text-foreground">前沿模型 · 互动实验室</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {LAB_TOOLS.map((t) => {
              const Icon = t.icon;
              const active = activeLab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveLab(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
                    active
                      ? "bg-gold/15 border border-gold/40 text-gold"
                      : "bg-secondary/50 border border-border text-muted-foreground hover:text-gold hover:border-gold/30"
                  }`}
                  title={t.desc}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.name}
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-border bg-card/40 p-5 md:p-7">
            <Suspense fallback={<div className="text-center text-xs font-mono text-muted-foreground py-12">加载交互工具…</div>}>
              <ActiveTool />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FrontierConcepts;