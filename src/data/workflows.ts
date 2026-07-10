/**
 * Workflows — curated "playbooks" that chain several tools into a teaching /
 * practitioner sequence. Each step references a tool id from TOOLS_CATALOG;
 * the page resolves the display name and route from the catalog.
 *
 * `passes` lists the canonical Tool-Bus variables a step typically hands to
 * the next one — surfaced as badges and, inside each tool, wired through the
 * existing "发送到…" (SendToTool) handoff.
 */
import type { BusKey } from "@/lib/toolBus";
import type { Difficulty } from "@/data/toolsCatalog";

export interface WorkflowStep {
  /** catalog id, e.g. "iv" */
  toolId: string;
  /** why this step matters in the chain */
  note: string;
  /** canonical variables handed to the next step */
  passes?: BusKey[];
}

export interface Workflow {
  id: string;
  title: string;
  titleEn: string;
  blurb: string;
  difficulty: Difficulty;
  steps: WorkflowStep[];
}

export const WORKFLOWS: Workflow[] = [
  {
    id: "option-desk",
    title: "期权做市台",
    titleEn: "Option Market-Making Desk",
    blurb: "从市场报价反推隐含波动率，拟合曲面，聚合组合 Greeks，再用蒙特卡洛校验定价——一条完整的做市定价链。",
    difficulty: "advanced",
    steps: [
      { toolId: "iv", note: "用 Newton-Raphson 从市场价反推隐含波动率 σ。", passes: ["sigma", "S0", "K"] },
      { toolId: "svi", note: "把多个行权价的 σ 拟合成无套利 SVI 波动率曲面。" },
      { toolId: "greeks-desk", note: "用拟合参数聚合多腿组合 Greeks 并设计对冲。", passes: ["sigma", "S0", "K", "r", "T"] },
      { toolId: "mc", note: "蒙特卡洛模拟校验闭式定价与路径依赖结构。" },
    ],
  },
  {
    id: "rates-to-bond",
    title: "利率到债券",
    titleEn: "Rates → Bond Pricing",
    blurb: "先用短率模型模拟利率路径与零息曲线，再把曲线喂给债券计算器，观察利率变动对价格与久期的传导。",
    difficulty: "core",
    steps: [
      { toolId: "rate-model", note: "Vasicek / CIR / Hull-White 模拟短率路径与期限结构。", passes: ["r"] },
      { toolId: "bond", note: "用得到的利率给债券定价，计算 YTM、久期与凸度。" },
    ],
  },
  {
    id: "portfolio-build",
    title: "组合构建",
    titleEn: "Portfolio Construction",
    blurb: "从均值-方差有效前沿出发，对比等风险贡献配置，再用回测检验样本外表现。",
    difficulty: "advanced",
    steps: [
      { toolId: "frontier", note: "构建有效前沿、切线组合与资本市场线。" },
      { toolId: "risk-parity", note: "用等风险贡献组合对比 MV / 等权配置。" },
      { toolId: "backtest", note: "回测策略，观察 Sharpe、最大回撤与滚动指标。" },
    ],
  },
  {
    id: "credit-chain",
    title: "信用风险链",
    titleEn: "Credit Risk Chain",
    blurb: "从单体违约距离到组合相依违约，再到情景压力测试——把信用风险从个体推到组合层面。",
    difficulty: "research",
    steps: [
      { toolId: "merton", note: "结构化模型估计单体违约距离 DD 与违约概率 PD。" },
      { toolId: "credit-copula", note: "用 Copula 把单体 PD 聚合成组合违约分布与 VaR/ES。" },
      { toolId: "stress", note: "施加宏观冲击情景，分解组合 PnL 与尾部损失。" },
    ],
  },
  {
    id: "calib-to-portfolio",
    title: "真实数据 → 校准 → 定价 → 组合回测",
    titleEn: "Real Data → Calibration → Pricing → Portfolio Backtest",
    blurb: "用真实行情校准波动率,把 σ 喂给定价工具,再到组合回测引擎用风险平价/最小方差构建并检验多资产组合——一条端到端的实证闭环。",
    difficulty: "advanced",
    steps: [
      { toolId: "calibration", note: "用 GARCH/EWMA 拟合真实收益,导出长期/条件波动率 σ。", passes: ["sigma", "mu"] },
      { toolId: "bs", note: "用校准的 σ 给期权定价并核对 Greeks。", passes: ["sigma", "S0", "K", "r", "T"] },
      { toolId: "backtest", note: "多资产组合回测:风险平价/最小方差配置,周期再平衡并计入交易成本。", passes: ["sigma", "mu"] },
    ],
  },
  {
    id: "causal-inference",
    title: "因果推断实证链",
    titleEn: "Causal Inference Pipeline",
    blurb: "从 OLS 基准出发,诊断内生性,再用 IV / DID / RDD 等识别策略估计因果效应——一条完整的实证论文工作流。",
    difficulty: "core",
    steps: [
      { toolId: "ols", note: "OLS 基准回归:检查系数符号、显著性与残差诊断,识别遗漏变量的可能方向。" },
      { toolId: "causal", note: "选择识别策略:IV 排除限制、DID 平行趋势或 RDD 局部随机化,估计因果参数。" },
      { toolId: "gmm", note: "GMM 稳健化:过度识别 J 检验、弱工具诊断,比较不同矩条件下估计的稳定性。" },
      { toolId: "compare", note: "把 OLS / IV / GMM 估计放进同一比较视图,评估内生性偏差的大小与方向。" },
    ],
  },
  {
    id: "macro-policy-lab",
    title: "宏观政策实验室",
    titleEn: "Macro Policy Laboratory",
    blurb: "从 IS-LM 静态直觉到 DSGE 动态传导,再用真实 FRED 数据检验泰勒规则——把政策分析从黑板推到数据。",
    difficulty: "core",
    steps: [
      { toolId: "islm", note: "IS-LM / AD-AS 静态比较:财政与货币冲击如何移动均衡,建立第一层直觉。" },
      { toolId: "dsge", note: "三方程 NK-DSGE:观察同样的政策冲击在动态一般均衡中的脉冲响应路径。" },
      { toolId: "hank", note: "切换到 HANK 异质性代理人:比较 MPC 分布如何放大财政转移的乘数。" },
      { toolId: "svar", note: "用结构 VAR 从数据中识别货币政策冲击,对照模型 IRF 与实证 IRF 的差异。" },
    ],
  },
  {
    id: "vol-research",
    title: "波动率研究全景",
    titleEn: "Volatility Research Panorama",
    blurb: "历史 GARCH → 高频 RV → 期权隐含,三个信息集下的波动率互相校验,最后用 DCC 推广到多资产相关。",
    difficulty: "advanced",
    steps: [
      { toolId: "garch", note: "GARCH 族拟合日度收益:波动率聚集、杠杆效应与长期方差。", passes: ["sigma"] },
      { toolId: "rv-har", note: "高频已实现波动率 + HAR 预测,对比 GARCH 的条件方差路径。" },
      { toolId: "iv", note: "从期权市场反推隐含波动率,检验 IV 对未来 RV 的预测溢价 (VRP)。", passes: ["sigma"] },
      { toolId: "dcc-garch", note: "DCC-GARCH 把单资产波动率推广到时变相关矩阵,服务组合风险。" },
    ],
  },
];

export const WORKFLOW_MAP: Record<string, Workflow> = Object.fromEntries(
  WORKFLOWS.map((w) => [w.id, w])
);
