import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
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

const getLAB_TOOLS = (t: TFunction) => {
const LAB_TOOLS = [
  { id: "amm", icon: Coins, name: "DeFi · AMM", desc: t("labs.frontier.concepts.text1", { defaultValue: "恒积做市商滑点与无常损失" }), Tool: AmmTool },
  { id: "contagion", icon: Network, name: t("labs.frontier.concepts.text2", { defaultValue: "网络 · 传染" }), desc: t("labs.frontier.concepts.text3", { defaultValue: "DebtRank 违约级联" }), Tool: ContagionTool },
  { id: "climate", icon: Leaf, name: t("labs.frontier.concepts.text4", { defaultValue: "气候 · Climate VaR" }), desc: t("labs.frontier.concepts.text5", { defaultValue: "NGFS 情景重估损失" }), Tool: ClimateVaRTool },
  { id: "prospect", icon: Activity, name: t("labs.frontier.concepts.text6", { defaultValue: "神经 · 前景理论" }), desc: t("labs.frontier.concepts.text7", { defaultValue: "价值函数与概率加权" }), Tool: ProspectTheoryTool },
] as const;
return LAB_TOOLS;
};

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

const getCONCEPTS = (t: TFunction) => {
const CONCEPTS: Concept[] = [
  {
    icon: Brain,
    tag: "6.1 AI / ML",
    title: t("labs.frontier.concepts.text8", { defaultValue: "AI 驱动的资产定价" }),
    idea: t("labs.frontier.concepts.text9", { defaultValue: "深度神经网络以无套利条件为准则估计随机贴现因子 (SDF)；大语言模型 (LLM) 用于经济预测与概念测量。" }),
    finding: t("labs.frontier.concepts.text10", { defaultValue: "深度 SDF 在夏普比率、解释变异、定价误差上全面超越传统线性因子模型。" }),
    method: t("labs.frontier.concepts.text11", { defaultValue: "用前馈/循环网络从数百个公司特征中提取非线性因子载荷，并以 GMM 矩条件（定价误差最小化）作为损失函数训练 SDF；对抗式网络生成最难定价的资产组合，迫使 SDF 满足无套利。" }),
    formula: "E[ M · R^e ] = 0,  M = 1 − Σ wᵢ(x) Fᵢ",
    formulaNote: t("labs.frontier.concepts.text12", { defaultValue: "SDF 权重 wᵢ(x) 由神经网络以特征 x 为输入估计；对所有可交易组合超额收益 Rᵉ 的定价误差应为零。" }),
    application: t("labs.frontier.concepts.text13", { defaultValue: "因子投资、横截面收益预测、宏观情景下的资产配置；LLM 抽取财报/新闻情绪作为额外状态变量。" }),
    limitation: t("labs.frontier.concepts.text14", { defaultValue: "黑箱可解释性弱、易过拟合、对宏观结构突变缺乏稳健性；样本外衰减与数据窥探仍是核心担忧。" }),
    refs: ["Chen, Pelger & Zhu (2024), Management Science", "Rambachan et al. (2024), arXiv:2412.07031"],
  },
  {
    icon: Users,
    tag: "6.2 ABM",
    title: t("labs.frontier.concepts.text15", { defaultValue: "基于智能体的模型" }),
    idea: t("labs.frontier.concepts.text16", { defaultValue: "自底向上从微观个体行为涌现宏观现象，无需代表性代理人假设；LLM 智能体 (EconAgent / TradingAgents) 再现经典宏观与交易行为。" }),
    finding: t("labs.frontier.concepts.text17", { defaultValue: "多智能体交易者行为可数学聚合推导出 GARCH 波动聚集；CBDC 仿真揭示对银行中介的重塑。" }),
    method: t("labs.frontier.concepts.text18", { defaultValue: "为异质智能体定义行为规则（基本面/趋势/噪声交易者），通过市场撮合机制反复迭代，观察价格、成交量等宏观统计量的涌现；近年用 LLM 赋予智能体语言推理能力。" }),
    formula: "pₜ₊₁ = pₜ + κ ( D(fundamentalists) + D(chartists) ) + εₜ",
    formulaNote: t("labs.frontier.concepts.text19", { defaultValue: "价格调整正比于基本面派与趋势派的净需求 D，κ 为市场流动性深度；非线性切换产生肥尾与波动聚集。" }),
    application: t("labs.frontier.concepts.text20", { defaultValue: "压力测试、政策实验（CBDC、交易税）、市场微观结构研究、闪崩与流动性枯竭情景模拟。" }),
    limitation: t("labs.frontier.concepts.text21", { defaultValue: "参数校准困难、结果对行为假设敏感、缺乏统一的可证伪标准；计算成本随智能体数量快速上升。" }),
    refs: ["Li et al. (2024), ACL Outstanding", "Nakagawa et al. (2025), Springer PRIMA"],
  },
  {
    icon: Network,
    tag: t("labs.frontier.concepts.text22", { defaultValue: "6.3 复杂网络" }),
    title: t("labs.frontier.concepts.text23", { defaultValue: "网络与 GNN 系统性风险" }),
    idea: t("labs.frontier.concepts.text24", { defaultValue: "金融系统是复杂网络（银行间借贷、供应链、贸易）；图神经网络 (GNN) 将系统性风险度量扩展到图结构数据。" }),
    finding: t("labs.frontier.concepts.text25", { defaultValue: "动态 GNN 捕捉网络结构的时间演化，量化系统性风险的传播路径与放大机制。" }),
    method: t("labs.frontier.concepts.text26", { defaultValue: "将机构建模为节点、敞口建模为带权有向边；用消息传递层聚合邻居风险状态，结合 DebtRank / 违约传染模型预测级联失效与系统重要性 (SIFI)。" }),
    formula: "hᵢ⁽ˡ⁺¹⁾ = σ( Σ_{j∈N(i)} αᵢⱼ W hⱼ⁽ˡ⁾ )",
    formulaNote: t("labs.frontier.concepts.text27", { defaultValue: "节点表示 h 通过注意力权重 αᵢⱼ 聚合邻居信息；多层传播即模拟风险沿网络的逐级扩散。" }),
    application: t("labs.frontier.concepts.text28", { defaultValue: "央行宏观审慎监管、SIFI 识别、传染路径预警、供应链脆弱性与贸易冲击评估。" }),
    limitation: t("labs.frontier.concepts.text29", { defaultValue: "敞口数据稀缺且滞后、网络结构内生于危机本身、过度平滑使深层 GNN 难以训练。" }),
    refs: [t("labs.frontier.concepts.text30", { defaultValue: "GNN 系统性风险 (2024), arXiv:2410.07222" }), t("labs.frontier.concepts.text31", { defaultValue: "动态 GNN 金融危机 (2025), SAGE" })],
  },
  {
    icon: Leaf,
    tag: t("labs.frontier.concepts.text32", { defaultValue: "6.4 气候金融" }),
    title: t("labs.frontier.concepts.text33", { defaultValue: "气候风险定价" }),
    idea: t("labs.frontier.concepts.text34", { defaultValue: "将物理风险与转型风险整合进资产定价；Climate VaR 用 NGFS/IPCC 情景评估政策、技术、物理三支柱冲击。" }),
    finding: t("labs.frontier.concepts.text35", { defaultValue: "当碳税低于社会碳成本时，棕色资产反而可能成为对冲工具——挑战传统 ESG 直觉。" }),
    method: t("labs.frontier.concepts.text36", { defaultValue: "在贴现现金流/资产定价框架中引入碳价路径与气候情景；将物理损失与转型成本映射为现金流冲击，按 NGFS 情景重估资产价值并计算尾部损失。" }),
    formula: "Climate VaR = V₀ − E[ Σ CFₜ(s) / (1+r)ᵗ ]",
    formulaNote: t("labs.frontier.concepts.text37", { defaultValue: "对每条气候情景 s（有序/无序转型、温室世界）重估贴现现金流，取分位损失即气候在险价值。" }),
    application: t("labs.frontier.concepts.text38", { defaultValue: "ESG 投资组合压力测试、转型路径下的行业重定价、绿色溢价 / 棕色折价估计、监管气候情景披露。" }),
    limitation: t("labs.frontier.concepts.text39", { defaultValue: "长期情景不确定性极高、缺乏历史数据校准、碳价与政策路径假设主导结果。" }),
    refs: ["Gârleanu & Pedersen (2025), NBER", "MSCI Climate VaR (2024)"],
  },
  {
    icon: Activity,
    tag: t("labs.frontier.concepts.text40", { defaultValue: "6.5 神经经济学" }),
    title: t("labs.frontier.concepts.text41", { defaultValue: "行为与神经金融新模型" }),
    idea: t("labs.frontier.concepts.text42", { defaultValue: "行为金融从描述走向量化建模；神经经济学将脑成像数据直接融入金融决策预测 (MCoRNN-MCD 等)。" }),
    finding: t("labs.frontier.concepts.text43", { defaultValue: "'神经金融'从实验室走向应用，预示决策机制可被直接测量与建模。" }),
    method: t("labs.frontier.concepts.text44", { defaultValue: "在前景理论效用框架上叠加生理/神经信号（fMRI、皮电、眼动）作为状态变量，用深度序列模型预测风险决策与市场情绪转变。" }),
    formula: "V = Σ π(pᵢ) · v(xᵢ),  v(x) = x^α (x≥0); −λ(−x)^β (x<0)",
    formulaNote: t("labs.frontier.concepts.text45", { defaultValue: "前景理论价值函数：损失厌恶系数 λ>1，概率经主观加权 π；神经数据用于估计个体化的 α、β、λ。" }),
    application: t("labs.frontier.concepts.text46", { defaultValue: "个性化投顾、风险偏好测量、市场情绪指标、行为偏差的实时识别与干预。" }),
    limitation: t("labs.frontier.concepts.text47", { defaultValue: "神经数据采集成本高、样本小、外部效度受限；伦理与隐私约束限制大规模应用。" }),
    refs: [t("labs.frontier.concepts.text48", { defaultValue: "神经经济学新模型 (2024-2025)" })],
  },
  {
    icon: Coins,
    tag: "6.6 DeFi",
    title: t("labs.frontier.concepts.text49", { defaultValue: "去中心化金融模型" }),
    idea: t("labs.frontier.concepts.text50", { defaultValue: "自动做市商 (AMM) 取代订单簿，流动性池取代做市商；DeFi 模型从描述走向严谨经济学分析。" }),
    finding: t("labs.frontier.concepts.text51", { defaultValue: "网络概率传染模型量化双边负债金融网络上的系统性风险传播。" }),
    method: t("labs.frontier.concepts.text52", { defaultValue: "用恒定函数做市商 (CFMM) 刻画流动性池定价，分析无常损失、套利与 MEV；以网络模型研究借贷协议清算的连锁传染。" }),
    formula: "x · y = k  ⇒  price = y / x",
    formulaNote: t("labs.frontier.concepts.text53", { defaultValue: "恒积做市商：池中两资产储备乘积守恒，边际价格由储备比决定；大额交易产生滑点与无常损失。" }),
    application: t("labs.frontier.concepts.text54", { defaultValue: "去中心化交易所设计、流动性挖矿激励、清算风险评估、稳定币与超额抵押借贷机制。" }),
    limitation: t("labs.frontier.concepts.text55", { defaultValue: "智能合约风险、预言机操纵、监管不确定、极端行情下流动性与清算的反身性脆弱。" }),
    refs: [t("labs.frontier.concepts.text56", { defaultValue: "网络概率系统性风险 (2024), QREF" })],
  },
  {
    icon: Landmark,
    tag: t("labs.frontier.concepts.text57", { defaultValue: "6.7 宏观金融" }),
    title: t("labs.frontier.concepts.text58", { defaultValue: "CBDC 与宏观审慎新框架" }),
    idea: t("labs.frontier.concepts.text59", { defaultValue: "将 CBDC、银行摩擦与多种政策工具纳入统一新凯恩斯框架；宏观审慎 DSGE 评估 LTV/DSTI 等工具交互。" }),
    finding: t("labs.frontier.concepts.text60", { defaultValue: "CBDC 利率政策效果取决于货币锚定制度；高替代性下 CBDC 经济近似无 CBDC 经济。" }),
    method: t("labs.frontier.concepts.text61", { defaultValue: "在 DSGE 中引入银行部门、抵押约束与 CBDC 作为另一种安全资产；通过脉冲响应与福利分析评估宏观审慎工具与货币政策的交互。" }),
    formula: "bₜ ≤ θ · Et[ qₜ₊₁ kₜ ] / Rₜ",
    formulaNote: t("labs.frontier.concepts.text62", { defaultValue: "抵押约束：借款上限正比于贷款价值比 θ 与未来抵押品价值；LTV/DSTI 工具通过调节 θ 抑制顺周期杠杆。" }),
    application: t("labs.frontier.concepts.text63", { defaultValue: "央行数字货币设计、宏观审慎政策搭配、银行脱媒风险评估、利率政策传导分析。" }),
    limitation: t("labs.frontier.concepts.text64", { defaultValue: "线性化解法难捕捉危机非线性、行为基础受卢卡斯批判约束、参数对福利结论敏感。" }),
    refs: ["Bhattarai et al. (2024-25), Bank of Canada", t("labs.frontier.concepts.text65", { defaultValue: "宏观审慎 DSGE (2024-25), Oxford Bulletin" })],
  },
];
return CONCEPTS;
};

const FrontierConcepts = () => {
  const { t } = useTranslation();
  const CONCEPTS = getCONCEPTS(t);
  const LAB_TOOLS = getLAB_TOOLS(t);
  
  const [open, setOpen] = useState<string | null>(null);
  const [activeLab, setActiveLab] = useState<string>("amm");
  const ActiveTool = LAB_TOOLS.find((timeIndex) => timeIndex.id === activeLab)?.Tool ?? AmmTool;
  
};

export default FrontierConcepts;