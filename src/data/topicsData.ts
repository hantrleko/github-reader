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
    desc: "从效用理论到多因子模型，系统覆盖资产定价的理论基础与前沿发展",
    tags: ["CAPM", "FF5", "APT", "SDF", "Anomalies"],
    heroDesc:
      "资产定价是金融学的核心领域，回答"资产的合理价格是什么"这一根本问题。从期望效用理论出发，经由均值-方差分析、CAPM、APT，到随机折现因子统一框架和实证异象研究，理论与实证不断交织演进。",
    knowledgePoints: [
      // ===== 第一部分：微观基础 =====
      {
        title: "期望效用理论",
        content:
          "von Neumann & Morgenstern (1944) 建立了理性决策的公理化基础。在完备性、传递性、连续性、独立性四大公理下，决策者的偏好可以用效用函数的期望来表示。这是所有资产定价理论的逻辑起点。",
        formula: "V = E[U(W)] = Σ pᵢ U(Wᵢ)",
        formulaExplain:
          "U(·) 为效用函数，满足 U' > 0（非餍足）、U'' < 0（风险厌恶）。常用 CRRA 效用：U(W) = W¹⁻ᵞ/(1−γ)。",
      },
      {
        title: "风险厌恶与风险度量",
        content:
          "Arrow (1965) 和 Pratt (1964) 提出绝对风险厌恶系数 (ARA) 和相对风险厌恶系数 (RRA) 来量化投资者对风险的态度。风险厌恶是理解风险溢价存在的关键。",
        formula: "ARA(W) = −U''(W)/U'(W),  RRA(W) = −W·U''(W)/U'(W)",
        formulaExplain:
          "ARA 衡量对绝对财富变动的厌恶程度，RRA 衡量对比例变动的厌恶程度。CRRA 效用的 RRA = γ（常数）。",
        derivation: [
          "1. 考虑一个公平赌博 ε̃，E(ε̃) = 0",
          "2. 风险溢价 π 定义为：U(W − π) = E[U(W + ε̃)]",
          "3. 二阶 Taylor 展开：U(W) + U'(W)(−π) ≈ U(W) + ½U''(W)σ²",
          "4. 整理得：π ≈ ½ · ARA(W) · σ²",
          "5. 因此 ARA 直接决定了投资者愿意支付多少来规避风险",
        ],
      },
      {
        title: "确定性等价与风险溢价",
        content:
          "确定性等价 (CE) 是使投资者与不确定收益无差异的确定金额。风险溢价 = E(W̃) − CE，衡量投资者为消除风险愿意放弃的收益。这些概念将微观偏好与资产价格联系起来。",
        formula: "U(CE) = E[U(W̃)],  π = E(W̃) − CE",
        formulaExplain:
          "CE 越低于 E(W̃)，说明投资者越厌恶风险，要求的风险溢价越高。",
      },
      // ===== 第二部分：均值-方差框架 =====
      {
        title: "均值-方差分析框架",
        content:
          "Markowitz (1952) 开创了现代投资组合理论。核心思想：投资者仅关心收益的前两阶矩（均值和方差）。当收益服从正态分布或效用为二次函数时，均值-方差分析是最优决策框架的精确表述。",
        formula: "min_w  w'Σw   s.t.  w'μ = μ₀,  w'𝟏 = 1",
        formulaExplain:
          "w 为 N×1 权重向量，Σ 为 N×N 协方差矩阵，μ 为预期收益向量。该二次规划问题有解析解。",
        derivation: [
          "1. Lagrangian: L = ½w'Σw − λ(w'μ − μ₀) − γ(w'𝟏 − 1)",
          "2. FOC: Σw = λμ + γ𝟏 → w* = Σ⁻¹(λμ + γ𝟏)",
          "3. 代入约束解 λ 和 γ，需要计算 A = 𝟏'Σ⁻¹μ，B = μ'Σ⁻¹μ，C = 𝟏'Σ⁻¹𝟏",
          "4. 有效前沿方程：σ² = (C·μ₀² − 2A·μ₀ + B) / (BC − A²)",
          "5. 这是 μ₀-σ² 平面上的抛物线（μ₀-σ 平面上的双曲线）",
        ],
      },
      {
        title: "两基金分离定理",
        content:
          "Tobin (1958) 证明在存在无风险资产时，所有有效组合都可以表示为无风险资产与切线组合（市场组合）的线性组合。这意味着资产配置可以分为两步：选择切线组合（投资决策）和决定风险暴露水平（融资决策）。",
        formula: "w* = (1−α)wᶠ + α·wₜ",
        formulaExplain:
          "α 为投入切线组合的比例，wₜ 为切线组合权重。所有投资者持有相同的风险资产组合，仅在 α 上不同。",
      },
      {
        title: "资本市场线 (CML)",
        content:
          "CML 描述了有效组合的预期收益与总风险（标准差）之间的线性关系。它连接无风险资产和切线组合（市场组合），其斜率就是市场的 Sharpe Ratio。",
        formula: "E(Rₚ) = Rᶠ + [(E(Rₘ) − Rᶠ) / σₘ] × σₚ",
        formulaExplain:
          "CML 仅适用于有效组合。单个资产一般不在 CML 上，因为它们包含非系统性风险。",
      },
      // ===== 第三部分：CAPM =====
      {
        title: "资本资产定价模型 (CAPM)",
        content:
          "Sharpe (1964)、Lintner (1965)、Mossin (1966) 独立提出。CAPM 是第一个均衡资产定价模型，建立了单个资产预期收益与其系统性风险之间的线性关系。核心假设：同质预期、无摩擦市场、存在无风险资产、单期模型。",
        formula: "E(Rᵢ) = Rᶠ + βᵢ [E(Rₘ) − Rᶠ]",
        formulaExplain:
          "βᵢ = Cov(Rᵢ, Rₘ) / Var(Rₘ)，衡量资产对市场系统性风险的敏感度。Security Market Line (SML) 是 β-E(R) 平面上的直线。",
        derivation: [
          "1. 所有投资者均持有市场组合 M 与无风险资产的组合（两基金分离）",
          "2. 考虑将资产 i 的权重从 0 微增 δ，新组合收益：R = (1−δ)Rₘ + δRᵢ",
          "3. ∂E(R)/∂δ|₀ = E(Rᵢ) − E(Rₘ)，∂σ(R)/∂δ|₀ = [Cov(Rᵢ,Rₘ) − σ²ₘ]/σₘ",
          "4. 均衡中市场组合已是切线组合，边际 Sharpe Ratio = CML 斜率",
          "5. [E(Rᵢ)−E(Rₘ)] / [(Cov(Rᵢ,Rₘ)−σ²ₘ)/σₘ] = [E(Rₘ)−Rᶠ] / σₘ",
          "6. 整理得 E(Rᵢ) − Rᶠ = [Cov(Rᵢ,Rₘ)/Var(Rₘ)] × [E(Rₘ) − Rᶠ]",
        ],
      },
      {
        title: "CAPM 的实证检验",
        content:
          "Fama & MacBeth (1973) 提出经典的两步回归检验法：第一步时间序列回归估计 β，第二步截面回归检验 β 与平均收益的关系。实证发现 SML 比理论预测更平坦（低 β 资产收益偏高，高 β 偏低），且存在 CAPM 无法解释的异象。",
        formula: "R̄ᵢ = γ₀ + γ₁β̂ᵢ + ηᵢ  (Fama-MacBeth 截面回归)",
        formulaExplain:
          "CAPM 预测 γ₀ = Rᶠ，γ₁ = E(Rₘ) − Rᶠ > 0。实证中 γ₀ > Rᶠ 且 γ₁ 偏小，拒绝 CAPM。",
        derivation: [
          "1. 第一步（时间序列）：对每只股票 i，回归 Rᵢₜ − Rᶠₜ = αᵢ + βᵢ(Rₘₜ − Rᶠₜ) + εᵢₜ",
          "2. 得到每只股票的 β̂ᵢ 估计值",
          "3. 第二步（截面）：每月回归 Rᵢₜ = γ₀ₜ + γ₁ₜβ̂ᵢ + ηᵢₜ",
          "4. 对 γ₀ₜ 和 γ₁ₜ 的时间序列取均值，用 t 统计量检验显著性",
          "5. 还可加入 β² 和残差方差检验非线性和非系统风险定价",
        ],
      },
      // ===== 第四部分：CAPM 扩展 =====
      {
        title: "零 Beta CAPM (Black CAPM)",
        content:
          "Black (1972) 放松了无风险资产存在的假设。当不存在无风险借贷时，CAPM 中的 Rᶠ 被零 Beta 组合的收益率 E(Rz) 替代。零 Beta 组合是与市场组合不相关的最小方差组合。",
        formula: "E(Rᵢ) = E(Rz) + βᵢ [E(Rₘ) − E(Rz)]",
        formulaExplain:
          "E(Rz) 为零 Beta 组合收益，一般 E(Rz) > Rᶠ，这解释了为什么实证中 SML 截距偏高。",
      },
      {
        title: "跨期 CAPM (ICAPM)",
        content:
          "Merton (1973) 将 CAPM 扩展到多期设定。投资者不仅对冲市场风险，还对冲投资机会集的不利变化。这引入了额外的状态变量风险因子，为多因子模型提供了理论基础。",
        formula: "E(Rᵢ) − Rᶠ = βᵢₘλₘ + Σⱼ βᵢⱼλⱼ",
        formulaExplain:
          "βᵢⱼ 为资产对状态变量 j 的暴露，λⱼ 为对冲需求产生的风险溢价。状态变量可以是利率、波动率、消费增长率等。",
      },
      {
        title: "消费 CAPM (CCAPM)",
        content:
          "Breeden (1979) 和 Lucas (1978) 从消费者最优化出发推导。在均衡中，资产的风险溢价由其收益与总消费增长的协方差决定。CCAPM 将资产定价与宏观经济直接联系，但面临"股权溢价之谜"的实证挑战。",
        formula: "E(Rᵢ) − Rᶠ = γ · Cov(Rᵢ, Δc)",
        formulaExplain:
          "γ 为相对风险厌恶系数，Δc 为消费增长率。βᶜ = Cov(Rᵢ,Δc)/Var(Δc) 为消费 Beta。",
        derivation: [
          "1. 代表性投资者最大化 E[Σ δᵗU(Cₜ)]",
          "2. 欧拉方程：1 = E[δ · U'(Cₜ₊₁)/U'(Cₜ) · Rᵢₜ₊₁]",
          "3. 定义随机折现因子 M = δ · U'(Cₜ₊₁)/U'(Cₜ)",
          "4. 对数线性化，假设联合正态分布",
          "5. 得到 E(Rᵢ) − Rᶠ ≈ γ · Cov(Rᵢ, Δc)",
        ],
      },
      // ===== 第五部分：APT 与因子模型 =====
      {
        title: "套利定价理论 (APT)",
        content:
          "Ross (1976) 提出，放弃了 CAPM 对效用函数的假设，仅要求无套利条件。APT 允许多个系统性因子影响资产收益。优势在于假设更少、更灵活；劣势是不指定因子的身份和数量。",
        formula: "E(Rᵢ) = Rᶠ + β₁λ₁ + β₂λ₂ + ⋯ + βₖλₖ",
        formulaExplain:
          "λⱼ 为因子 j 的风险溢价，βⱼ 为资产对因子 j 的暴露（factor loading）。",
        derivation: [
          "1. 假设因子模型：Rᵢ = aᵢ + Σ βᵢⱼFⱼ + εᵢ，其中 E(εᵢ) = 0，Cov(εᵢ, Fⱼ) = 0",
          "2. 构造套利组合 w：w'𝟏 = 0（零投资），w'βⱼ = 0（零因子暴露），w'a > 0",
          "3. 该组合几乎无风险但有正收益，违反无套利",
          "4. 因此 a 必须是 β 的线性函数：aᵢ = Rᶠ + Σ βᵢⱼλⱼ",
          "5. 即 E(Rᵢ) − Rᶠ = Σ βᵢⱼλⱼ（精确对大量资产近似成立）",
        ],
      },
      {
        title: "Fama-French 三因子模型",
        content:
          "Fama & French (1993) 构建了市场因子 (MKT)、规模因子 (SMB)、价值因子 (HML) 三因子模型。实证发现该模型能解释大部分横截面收益差异，R² 通常在 90% 以上。因子构建基于 2×3 排序法。",
        formula: "Rᵢ − Rᶠ = αᵢ + βᵢ(Rₘ − Rᶠ) + sᵢSMB + hᵢHML + εᵢ",
        formulaExplain:
          "SMB (Small Minus Big)：按市值分组的多空组合。HML (High Minus Low)：按账面市值比分组的多空组合。α 应统计上不显著。",
        derivation: [
          "1. 每年 6 月按市值中位数分为 Small/Big 两组",
          "2. 独立地按 B/M 30%/40%/30% 分为 Value/Neutral/Growth 三组",
          "3. 交叉得到 6 个组合（SV, SN, SG, BV, BN, BG）",
          "4. SMB = (SV+SN+SG)/3 − (BV+BN+BG)/3",
          "5. HML = (SV+BV)/2 − (SG+BG)/2",
          "6. 月度调仓，等权或市值加权",
        ],
      },
      {
        title: "Carhart 四因子模型",
        content:
          "Carhart (1997) 在 FF3 基础上加入动量因子 (MOM/UMD)。Jegadeesh & Titman (1993) 发现过去 3-12 个月表现好的股票未来继续表现好（动量效应）。该模型广泛用于基金业绩归因。",
        formula: "Rᵢ − Rᶠ = αᵢ + βᵢMKT + sᵢSMB + hᵢHML + mᵢMOM + εᵢ",
        formulaExplain:
          "MOM (Momentum) = 过去 12 个月（跳过最近 1 个月）赢家组合 − 输家组合。也称 UMD (Up Minus Down)。",
      },
      {
        title: "Fama-French 五因子模型",
        content:
          "Fama & French (2015) 受 Novy-Marx (2013) 和 Titman et al. (2004) 启发，加入盈利因子 (RMW) 和投资因子 (CMA)。理论基础来自股利贴现模型：给定账面价值，高盈利或低投资意味着高预期收益。",
        formula: "Rᵢ − Rᶠ = αᵢ + βᵢMKT + sᵢSMB + hᵢHML + rᵢRMW + cᵢCMA + εᵢ",
        formulaExplain:
          "RMW (Robust Minus Weak) = 高盈利 − 低盈利；CMA (Conservative Minus Aggressive) = 低投资 − 高投资。五因子模型中 HML 变得冗余。",
      },
      // ===== 第六部分：SDF 统一框架 =====
      {
        title: "随机折现因子 (SDF) 框架",
        content:
          "Cochrane (2005) 系统阐述的统一定价框架。所有资产定价模型都可以表示为 p = E(MX) 的形式，其中 M 是随机折现因子。CAPM、CCAPM、APT 都是 SDF 的特殊情况。这是现代资产定价理论的核心语言。",
        formula: "1 = E[M · Rᵢ],  即  E(Rᵢ) − Rᶠ = −Rᶠ · Cov(M, Rᵢ)",
        formulaExplain:
          "M = 随机折现因子（定价核）。资产风险溢价取决于其收益与 M 的负协方差：与"坏时期"（M 高）正相关的资产风险低。",
        derivation: [
          "1. 无套利 ⟺ 存在正的线性定价规则 p(X) = E(MX)",
          "2. 对于收益率：p = 1/Rᵢ，故 1 = E(M·Rᵢ)",
          "3. 展开：1 = E(M)·E(Rᵢ) + Cov(M, Rᵢ)",
          "4. 无风险资产：1 = E(M)·Rᶠ → E(M) = 1/Rᶠ",
          "5. 代入得：E(Rᵢ) − Rᶠ = −Rᶠ · Cov(M, Rᵢ)",
          "6. CAPM 对应 M = a − b·Rₘ；CCAPM 对应 M = δ·U'(Cₜ₊₁)/U'(Cₜ)",
        ],
      },
      {
        title: "Hansen-Jagannathan 界",
        content:
          "Hansen & Jagannathan (1991) 推导出 SDF 波动率的下界。任何合法定价核必须具有足够大的波动率来匹配观察到的 Sharpe Ratio。股权溢价之谜等价于：标准消费模型的 SDF 波动率太低。",
        formula: "σ(M)/E(M) ≥ |E(Rᵢ) − Rᶠ| / σ(Rᵢ) = |SRᵢ|",
        formulaExplain:
          "SDF 的变异系数（σ(M)/E(M)）必须至少等于所有资产中最大的 Sharpe Ratio。",
      },
      // ===== 第七部分：异象与行为金融 =====
      {
        title: "股权溢价之谜",
        content:
          "Mehra & Prescott (1985) 发现标准消费模型无法解释美国股票约 6% 的历史超额收益。要匹配数据需要 γ > 30 的风险厌恶系数，远超合理范围。这一谜题催生了习惯形成、长期风险、灾难风险等新理论。",
        formula: "E(Rₘ) − Rᶠ ≈ γ · σ²(Δc) ≈ 0.24%  ≪  6%（实际观测）",
        formulaExplain:
          "消费增长标准差约 2%，γ = 6 时理论溢价仅 0.24%，远低于 6% 的实际溢价。",
      },
      {
        title: "经典市场异象",
        content:
          "实证研究发现多种 CAPM 无法解释的收益模式：规模效应 (Banz, 1981)、价值效应 (Fama & French, 1992)、动量效应 (Jegadeesh & Titman, 1993)、低波动异象 (Ang et al., 2006)、应计异象 (Sloan, 1996)、投资效应 (Titman et al., 2004)。这些异象既是因子模型的构建基础，也是市场效率争论的焦点。",
        formula: "αᵢ ≠ 0（相对于 CAPM 或多因子模型的定价误差）",
        formulaExplain:
          "异象 = 在控制已知风险因子后仍存在的显著超额收益。关键争论：风险补偿 vs. 行为偏差 vs. 数据挖掘。",
      },
      {
        title: "行为资产定价",
        content:
          "Shleifer & Vishny (1997) 指出套利的局限性；Barberis & Thaler (2003) 综述了行为金融对资产定价的贡献。投资者过度自信、损失厌恶、代表性启发式等心理偏差可能导致系统性的错误定价。前景理论 (Kahneman & Tversky, 1979) 替代期望效用理论成为描述性框架。",
        formula: "V(x) = { x^α,  x ≥ 0  |  −λ(−x)^β,  x < 0 }  (前景理论价值函数)",
        formulaExplain:
          "λ ≈ 2.25 表示损失厌恶（损失的痛苦约为等量收益快乐的 2.25 倍）。α ≈ β ≈ 0.88 表示递减敏感性。",
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
