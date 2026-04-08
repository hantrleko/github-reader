import {
  TrendingUp,
  BarChart3,
  Activity,
  PieChart,
  GitBranch,
  Layers,
} from "lucide-react";

export interface KnowledgePoint {
  title: string;
  content: string;
  formula?: string;
  formulaExplain?: string;
  derivation?: string[];
}

export interface TopicData {
  id: string;
  icon: typeof TrendingUp;
  title: string;
  subtitle: string;
  desc: string;
  tags: string[];
  heroDesc: string;
  knowledgePoints: KnowledgePoint[];
}

export const topicsData: TopicData[] = [
  {
    id: "asset-pricing",
    icon: TrendingUp,
    title: "资产定价",
    subtitle: "Asset Pricing",
    desc: "CAPM、Fama-French 三因子/五因子、APT 套利定价理论",
    tags: ["CAPM", "FF3", "APT"],
    heroDesc:
      "资产定价是金融学的核心领域，研究金融资产价格如何由风险与收益的权衡关系决定。从 CAPM 到多因子模型，理论不断演进。",
    knowledgePoints: [
      {
        title: "资本资产定价模型 (CAPM)",
        content:
          "由 Sharpe (1964)、Lintner (1965)、Mossin (1966) 独立提出。CAPM 建立在 Markowitz 均值-方差框架之上，假设投资者同质预期、存在无风险资产、市场无摩擦。",
        formula: "E(Rᵢ) = Rᶠ + βᵢ [E(Rₘ) − Rᶠ]",
        formulaExplain:
          "βᵢ = Cov(Rᵢ, Rₘ) / Var(Rₘ)，衡量资产对市场系统性风险的敏感度。",
        derivation: [
          "1. 假设所有投资者均持有市场组合 M 与无风险资产的组合",
          "2. 在均衡中，市场组合即为切线组合（Capital Market Line）",
          "3. 对于单个资产 i，其对组合风险的边际贡献为 Cov(Rᵢ, Rₘ)",
          "4. 均衡条件：边际风险贡献的报酬等于市场风险溢价",
          "5. 整理得：E(Rᵢ) − Rᶠ = [Cov(Rᵢ, Rₘ)/Var(Rₘ)] × [E(Rₘ) − Rᶠ]",
        ],
      },
      {
        title: "套利定价理论 (APT)",
        content:
          "Ross (1976) 提出，放弃了 CAPM 对投资者效用函数的假设，仅要求无套利条件。APT 允许多个系统性风险因子影响资产收益。",
        formula: "E(Rᵢ) = Rᶠ + β₁λ₁ + β₂λ₂ + ⋯ + βₖλₖ",
        formulaExplain:
          "λⱼ 为因子 j 的风险溢价，βⱼ 为资产对因子 j 的暴露（factor loading）。",
        derivation: [
          "1. 假设资产收益由 K 个公共因子驱动：Rᵢ = aᵢ + Σ βᵢⱼFⱼ + εᵢ",
          "2. 构造套利组合：零投资、零系统风险、正期望收益",
          "3. 无套利条件要求：不存在这样的组合",
          "4. 线性代数推导得：预期超额收益是因子暴露的线性函数",
        ],
      },
      {
        title: "Fama-French 三因子模型",
        content:
          "Fama & French (1993) 发现 CAPM 无法解释小盘股效应和价值效应，加入 SMB（规模因子）和 HML（价值因子），显著提高了解释力。",
        formula: "Rᵢ − Rᶠ = αᵢ + βᵢ(Rₘ − Rᶠ) + sᵢSMB + hᵢHML + εᵢ",
        formulaExplain:
          "SMB = 小盘股组合收益 − 大盘股组合收益；HML = 高 B/M 组合收益 − 低 B/M 组合收益。",
      },
      {
        title: "Fama-French 五因子模型",
        content:
          "Fama & French (2015) 进一步加入盈利因子 (RMW) 和投资因子 (CMA)，发现价值因子在五因子模型中变得冗余。",
        formula:
          "Rᵢ − Rᶠ = αᵢ + βᵢMKT + sᵢSMB + hᵢHML + rᵢRMW + cᵢCMA + εᵢ",
        formulaExplain:
          "RMW = 高盈利 − 低盈利；CMA = 保守投资 − 激进投资。",
      },
    ],
  },
  {
    id: "econometrics",
    icon: BarChart3,
    title: "计量经济学",
    subtitle: "Econometrics",
    desc: "OLS 回归、面板数据、工具变量、GMM 估计方法",
    tags: ["OLS", "IV", "GMM"],
    heroDesc:
      "计量经济学是经济学与统计学的交叉学科，提供了从数据中识别因果关系和估计经济参数的系统方法论。",
    knowledgePoints: [
      {
        title: "普通最小二乘法 (OLS)",
        content:
          "最基础的估计方法。在 Gauss-Markov 假设下（线性、严格外生、同方差、无自相关），OLS 是最佳线性无偏估计量 (BLUE)。",
        formula: "β̂ = (X'X)⁻¹X'Y",
        formulaExplain: "最小化残差平方和 min Σ(Yᵢ − Xᵢβ)² 的解析解。",
        derivation: [
          "1. 模型设定：Y = Xβ + ε，其中 E(ε|X) = 0",
          "2. 目标函数：min_β (Y − Xβ)'(Y − Xβ)",
          "3. 一阶条件：−2X'(Y − Xβ̂) = 0",
          "4. 整理得：X'Xβ̂ = X'Y",
          "5. 求解：β̂ = (X'X)⁻¹X'Y（要求 X'X 可逆）",
        ],
      },
      {
        title: "工具变量法 (IV/2SLS)",
        content:
          "当解释变量与误差项相关（内生性问题）时，OLS 估计有偏。工具变量法通过找到与内生变量相关、但与误差项无关的工具来解决。",
        formula: "β̂ᵢᵥ = (Z'X)⁻¹Z'Y",
        formulaExplain:
          "Z 为工具变量矩阵，需满足：相关性 Cov(Z,X) ≠ 0，外生性 Cov(Z,ε) = 0。",
        derivation: [
          "1. 第一阶段：X = Zπ + v，得到 X̂ = Z(Z'Z)⁻¹Z'X",
          "2. 第二阶段：Y = X̂β + u，用 OLS 估计",
          "3. 等价地：β̂₂ₛₗₛ = (X̂'X̂)⁻¹X̂'Y",
        ],
      },
      {
        title: "广义矩估计 (GMM)",
        content:
          "Hansen (1982) 提出的统一估计框架，OLS 和 IV 都是其特殊情况。GMM 利用矩条件（总体矩的样本对应物）进行估计。",
        formula: "β̂ₘₘ = argmin_β [gₙ(β)]' W [gₙ(β)]",
        formulaExplain:
          "gₙ(β) = (1/n) Σ m(xᵢ, β) 为样本矩条件，W 为权重矩阵。",
      },
      {
        title: "面板数据模型",
        content:
          "面板数据同时包含截面和时间维度，能控制不可观测的个体异质性。固定效应模型通过组内变换消除个体效应。",
        formula: "Yᵢₜ = αᵢ + Xᵢₜβ + εᵢₜ",
        formulaExplain:
          "αᵢ 为个体固定效应。Hausman 检验用于选择固定效应或随机效应模型。",
      },
    ],
  },
  {
    id: "time-series",
    icon: Activity,
    title: "时间序列",
    subtitle: "Time Series",
    desc: "ARIMA、GARCH 波动率建模、协整与向量自回归",
    tags: ["ARIMA", "GARCH", "VAR"],
    heroDesc:
      "时间序列分析研究数据随时间演变的规律，在宏观经济预测、金融波动率建模和风险管理中有广泛应用。",
    knowledgePoints: [
      {
        title: "平稳性与单位根检验",
        content:
          "弱平稳要求均值、方差不随时间变化，自协方差仅依赖于滞后阶数。ADF 检验是最常用的单位根检验方法。",
        formula: "ΔYₜ = α + γYₜ₋₁ + Σ δᵢΔYₜ₋ᵢ + εₜ",
        formulaExplain:
          "H₀: γ = 0（有单位根/非平稳）；H₁: γ < 0（平稳）。注意 ADF 统计量服从非标准分布。",
      },
      {
        title: "ARIMA 模型",
        content:
          "Box-Jenkins 方法的核心。ARIMA(p,d,q) 表示差分 d 次后，用 AR(p) 和 MA(q) 拟合平稳序列。",
        formula: "Φ(L)(1−L)ᵈYₜ = Θ(L)εₜ",
        formulaExplain:
          "L 为滞后算子，Φ(L) = 1 − φ₁L − ⋯ − φₚLᵖ，Θ(L) = 1 + θ₁L + ⋯ + θqLq。",
        derivation: [
          "1. 识别：通过 ACF/PACF 图确定 p, d, q",
          "2. 估计：最大似然法估计参数",
          "3. 诊断：检查残差是否为白噪声（Ljung-Box 检验）",
          "4. 预测：递推多步向前预测",
        ],
      },
      {
        title: "GARCH(1,1) 波动率模型",
        content:
          "Bollerslev (1986) 提出，捕捉金融收益率的波动聚集现象。条件方差是过去冲击和过去方差的函数。",
        formula: "σ²ₜ = ω + α ε²ₜ₋₁ + β σ²ₜ₋₁",
        formulaExplain:
          "ω > 0, α ≥ 0, β ≥ 0, α + β < 1（保证协方差平稳）。无条件方差 = ω/(1 − α − β)。",
      },
      {
        title: "向量自回归 (VAR) 与协整",
        content:
          "VAR 模型同时对多个时间序列建模，捕捉变量间的动态相互作用。Johansen 协整检验用于发现非平稳变量间的长期均衡关系。",
        formula: "Yₜ = c + A₁Yₜ₋₁ + A₂Yₜ₋₂ + ⋯ + AₚYₜ₋ₚ + εₜ",
        formulaExplain:
          "Yₜ 为 K×1 向量，Aᵢ 为 K×K 系数矩阵。Granger 因果检验基于 VAR 进行。",
      },
    ],
  },
  {
    id: "portfolio",
    icon: PieChart,
    title: "投资组合理论",
    subtitle: "Portfolio Theory",
    desc: "均值-方差优化、有效前沿、Black-Litterman 模型",
    tags: ["MVO", "EF", "BL"],
    heroDesc:
      "投资组合理论研究如何在给定风险下最大化收益，或给定收益下最小化风险，是资产配置的理论基础。",
    knowledgePoints: [
      {
        title: "均值-方差优化 (MVO)",
        content:
          "Markowitz (1952) 开创的现代投资组合理论。投资者根据资产的期望收益和协方差矩阵，选择最优权重组合。",
        formula: "min w'Σw  s.t.  w'μ = μ₀,  w'1 = 1",
        formulaExplain:
          "w 为权重向量，Σ 为协方差矩阵，μ 为预期收益向量，μ₀ 为目标收益。",
        derivation: [
          "1. 构造 Lagrangian：L = w'Σw − λ₁(w'μ − μ₀) − λ₂(w'1 − 1)",
          "2. 一阶条件：2Σw − λ₁μ − λ₂1 = 0",
          "3. 求解：w* = Σ⁻¹(λ₁μ + λ₂1) / 2",
          "4. 代入约束求解 λ₁, λ₂，得到有效前沿上的点",
        ],
      },
      {
        title: "有效前沿",
        content:
          "所有最优组合在均值-标准差平面上形成一条抛物线（双曲线），其上半部分即为有效前沿。加入无风险资产后，有效前沿变为一条直线（资本市场线 CML）。",
        formula: "E(Rₚ) = Rᶠ + [(E(Rₘ) − Rᶠ) / σₘ] × σₚ",
        formulaExplain: "CML 的斜率 = Sharpe Ratio of Market = (E(Rₘ) − Rᶠ) / σₘ。",
      },
      {
        title: "Black-Litterman 模型",
        content:
          "Black & Litterman (1992) 结合市场均衡收益与投资者主观观点，通过贝叶斯方法生成更稳定的预期收益估计，克服了传统 MVO 对输入极度敏感的问题。",
        formula: "E(R) = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ [(τΣ)⁻¹Π + P'Ω⁻¹Q]",
        formulaExplain:
          "Π = 均衡隐含收益，P = 观点矩阵，Q = 观点收益，Ω = 观点不确定性，τ = 标量。",
      },
    ],
  },
  {
    id: "derivatives",
    icon: GitBranch,
    title: "衍生品定价",
    subtitle: "Derivatives",
    desc: "Black-Scholes、二叉树模型、蒙特卡洛模拟",
    tags: ["BS", "Binomial", "MC"],
    heroDesc:
      "衍生品定价理论基于无套利原理和风险中性定价，为期权、期货等衍生工具提供精确的估值方法。",
    knowledgePoints: [
      {
        title: "Black-Scholes 模型",
        content:
          "Black & Scholes (1973) 假设标的资产价格服从几何布朗运动，通过构造 Delta 对冲组合推导出期权定价的偏微分方程。",
        formula: "C = S₀N(d₁) − Ke⁻ʳᵀN(d₂)",
        formulaExplain:
          "d₁ = [ln(S₀/K) + (r + σ²/2)T] / (σ√T)，d₂ = d₁ − σ√T。",
        derivation: [
          "1. 假设：dS = μSdt + σSdW（几何布朗运动）",
          "2. 构造组合 Π = V − ΔS，选择 Δ = ∂V/∂S 使组合无风险",
          "3. 无套利条件：dΠ = rΠdt",
          "4. 代入 Itô 引理得 BS PDE：∂V/∂t + ½σ²S²∂²V/∂S² + rS∂V/∂S − rV = 0",
          "5. 配合边界条件 C(S,T) = max(S−K, 0) 求解得封闭解",
        ],
      },
      {
        title: "二叉树模型 (CRR)",
        content:
          "Cox, Ross & Rubinstein (1979) 的离散时间模型，将期权到期日分为 n 步，每步价格上涨 u 或下跌 d，通过风险中性概率后向归纳定价。",
        formula: "C = e⁻ʳᐩᵀ Σ C(n,j) pʲ(1−p)ⁿ⁻ʲ max(Sujdn-j−K, 0)",
        formulaExplain:
          "p = (eʳᐩᵀ − d)/(u − d) 为风险中性概率，u = eσ√Δt，d = 1/u。",
      },
      {
        title: "希腊字母 (Greeks)",
        content:
          "衡量期权价格对各参数的敏感度。Delta (Δ) 对标的价格、Gamma (Γ) 对 Delta 变化、Theta (Θ) 对时间、Vega (ν) 对波动率、Rho (ρ) 对利率。",
        formula: "Δ = ∂C/∂S,  Γ = ∂²C/∂S²,  Θ = ∂C/∂t,  ν = ∂C/∂σ",
        formulaExplain:
          "对于 BS 模型中的欧式看涨期权：Δ = N(d₁)，Γ = N'(d₁)/(Sσ√T)。",
      },
      {
        title: "蒙特卡洛模拟",
        content:
          "利用随机模拟估计期权价格，特别适用于路径依赖型期权（亚式、障碍期权等）和高维问题。",
        formula: "Ĉ = e⁻ʳᵀ (1/N) Σ payoff(Sᵢ_T)",
        formulaExplain:
          "模拟 N 条路径，对贴现后的期望收益取平均。方差缩减技术（对偶变量、控制变量）可提高效率。",
      },
    ],
  },
  {
    id: "risk-management",
    icon: Layers,
    title: "风险管理",
    subtitle: "Risk Management",
    desc: "VaR、CVaR、信用风险模型、压力测试方法论",
    tags: ["VaR", "CVaR", "Stress"],
    heroDesc:
      "风险管理量化和控制金融风险，VaR 和 CVaR 是市场风险度量的核心指标，Basel 协议为银行风控提供了监管框架。",
    knowledgePoints: [
      {
        title: "在险价值 (VaR)",
        content:
          "在给定置信水平和持有期下，投资组合可能遭受的最大损失。三种计算方法：参数法（方差-协方差法）、历史模拟法、蒙特卡洛模拟法。",
        formula: "P(L > VaRα) = 1 − α",
        formulaExplain:
          "正态假设下 VaR = μ − zα × σ。如 95% VaR 表示 95% 的概率损失不超过该值。",
        derivation: [
          "1. 参数法：假设收益正态分布，VaR = |μ − z₀.₉₅σ| × Portfolio Value",
          "2. 历史模拟法：将历史收益率排序，取第 (1−α) 分位数",
          "3. 蒙特卡洛法：模拟大量组合收益路径，取分位数",
        ],
      },
      {
        title: "条件在险价值 (CVaR / ES)",
        content:
          "VaR 的改进指标，衡量损失超过 VaR 时的期望损失。CVaR 是一致性风险度量（coherent risk measure），满足次可加性。",
        formula: "CVaRα = E[L | L > VaRα]",
        formulaExplain:
          "正态假设下 CVaR = μ + σ × φ(zα) / (1−α)，其中 φ 为标准正态密度函数。",
      },
      {
        title: "信用风险模型",
        content:
          "Merton (1974) 结构化模型将公司股权视为以公司资产为标的的看涨期权。KMV 模型据此估算违约概率 (PD)。",
        formula: "PD = N(−DD),  DD = (ln(V/D) + (μ − σ²/2)T) / (σ√T)",
        formulaExplain:
          "DD = 违约距离，V = 资产价值，D = 债务面值，σ = 资产波动率。",
      },
      {
        title: "压力测试",
        content:
          "评估极端但可能的情景对组合价值的影响。包括历史情景法（如 2008 金融危机）和假设情景法（利率骤升 300bp）。Basel III 要求系统重要性银行定期进行压力测试。",
        formula: "ΔP = Σ (∂P/∂fⱼ) × Δfⱼ + ½ Σ (∂²P/∂fⱼ²) × (Δfⱼ)²",
        formulaExplain:
          "二阶 Taylor 展开近似组合价值变动，fⱼ 为风险因子（利率、汇率、股指等）。",
      },
    ],
  },
];
