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
      "资产定价是金融学的核心领域，回答「资产的合理价格是什么」这一根本问题。从期望效用理论出发，经由均值-方差分析、CAPM、APT，到随机折现因子统一框架和实证异象研究，理论与实证不断交织演进。",
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
          "Breeden (1979) 和 Lucas (1978) 从消费者最优化出发推导。在均衡中，资产的风险溢价由其收益与总消费增长的协方差决定。CCAPM 将资产定价与宏观经济直接联系，但面临「股权溢价之谜」的实证挑战。",
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
          "M = 随机折现因子（定价核）。资产风险溢价取决于其收益与 M 的负协方差：与「坏时期」（M 高）正相关的资产风险低。",
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
    desc: "概率统计基础、OLS 回归、面板数据、工具变量、GMM 及因果推断",
    tags: ["概率论", "OLS", "IV", "GMM", "MLE", "因果推断"],
    heroDesc:
      "计量经济学是经济学与统计学的交叉学科，提供了从数据中识别因果关系和估计经济参数的系统方法论。从概率论与数理统计的基础出发，经由经典线性回归、极大似然估计，到工具变量、GMM、面板数据和现代因果推断方法，构建完整的实证分析工具箱。",
    knowledgePoints: [
      // ===== 第一部分：概率论基础 =====
      {
        title: "随机变量与概率分布",
        content:
          "随机变量是将样本空间映射到实数的函数，是概率论的核心对象。离散型随机变量用概率质量函数 (PMF) 描述，连续型用概率密度函数 (PDF) 描述。累积分布函数 (CDF) F(x) = P(X ≤ x) 统一了两种情形。常见分布包括正态分布、t 分布、χ² 分布和 F 分布，它们在统计推断中扮演关键角色。",
        formula: "f(x) = (1/√(2πσ²)) exp(−(x−μ)²/(2σ²))",
        formulaExplain:
          "正态分布 N(μ, σ²) 的概率密度函数，由均值 μ 和方差 σ² 完全刻画。中心极限定理保证了它在统计推断中的核心地位。",
      },
      {
        title: "期望、方差与矩",
        content:
          "期望 E(X) 是随机变量的加权平均，方差 Var(X) = E[(X−μ)²] 度量离散程度。高阶矩包括偏度（分布对称性）和峰度（尾部厚度）。矩母函数 M(t) = E(eᵗˣ) 若存在，则唯一确定分布。条件期望 E(Y|X) 是回归分析的理论基础——它给出了给定 X 时 Y 的最优预测。",
        formula: "Var(X) = E(X²) − [E(X)]²",
        formulaExplain:
          "方差的计算公式。等价于 E[(X−μ)²]，度量随机变量偏离均值的平均平方距离。",
      },
      {
        title: "联合分布与协方差",
        content:
          "多个随机变量的联合行为由联合分布描述。协方差 Cov(X,Y) = E[(X−μₓ)(Y−μᵧ)] 度量线性关联方向，相关系数 ρ = Cov(X,Y)/(σₓσᵧ) 将其标准化到 [-1,1]。独立性意味着零相关，但反之不成立（非线性关联可能存在）。多元正态分布中，零相关等价于独立——这是经典回归理论的重要前提。",
        formula: "ρ(X,Y) = Cov(X,Y) / (σₓ · σᵧ)",
        formulaExplain:
          "Pearson 相关系数，度量两个变量间线性关联的强度与方向，取值范围 [-1, 1]。",
      },
      {
        title: "大数定律与中心极限定理",
        content:
          "大数定律 (LLN) 说明样本均值依概率收敛于总体均值，保证了估计的一致性。中心极限定理 (CLT) 表明，无论总体分布如何，样本均值的标准化量在大样本下趋向正态分布。这两个定理是渐近统计理论和大样本推断的基石，直接支撑了 OLS 的一致性和渐近正态性。",
        formula: "√n (X̄ₙ − μ) / σ →ᵈ N(0, 1)",
        formulaExplain:
          "中心极限定理：样本均值的标准化量渐近服从标准正态分布，n 为样本量。",
        derivation: [
          "1. 设 X₁, X₂, ..., Xₙ 独立同分布，E(Xᵢ) = μ, Var(Xᵢ) = σ²",
          "2. 样本均值 X̄ₙ = (1/n) Σ Xᵢ，则 E(X̄ₙ) = μ, Var(X̄ₙ) = σ²/n",
          "3. 标准化：Zₙ = √n(X̄ₙ − μ)/σ，则 E(Zₙ) = 0, Var(Zₙ) = 1",
          "4. 由特征函数方法或 Lindeberg 条件可证 Zₙ →ᵈ N(0,1)",
        ],
      },
      // ===== 第二部分：统计推断基础 =====
      {
        title: "参数估计：点估计与区间估计",
        content:
          "点估计用单一数值估计未知参数，良好的估计量应具备无偏性 E(θ̂) = θ、有效性（最小方差）和一致性（大样本收敛）。Cramér-Rao 下界给出了无偏估计量方差的理论下限。区间估计构造置信区间 [θ̂ − z·SE, θ̂ + z·SE]，量化估计的不确定性。95% 置信区间的频率论含义是：重复抽样中约 95% 的区间包含真值。",
        formula: "Var(θ̂) ≥ 1 / I(θ)",
        formulaExplain:
          "Cramér-Rao 不等式：无偏估计量的方差不低于 Fisher 信息量 I(θ) 的倒数。达到下界的估计量称为有效估计量。",
      },
      {
        title: "假设检验与 p 值",
        content:
          "假设检验的核心框架：设定原假设 H₀ 和备择假设 H₁，构造检验统计量，确定拒绝域。第一类错误 (α) 是错误拒绝真实的 H₀，第二类错误 (β) 是未能拒绝虚假的 H₀。p 值是在 H₀ 为真时观测到当前或更极端结果的概率。常用检验包括 t 检验（单个或多个系数）、F 检验（联合假设）和 Wald 检验。",
        formula: "t = (β̂ − β₀) / SE(β̂)",
        formulaExplain:
          "t 统计量：估计值与假设值之差除以标准误。在 H₀: β = β₀ 下服从 t(n−k) 分布。",
      },
      {
        title: "极大似然估计 (MLE)",
        content:
          "MLE 选择使观测数据出现概率最大的参数值。似然函数 L(θ) = Π f(xᵢ|θ) 衡量参数对数据的解释力。对数似然 ℓ(θ) = Σ ln f(xᵢ|θ) 便于求解。MLE 在正则条件下具有一致性、渐近正态性和渐近有效性（达到 Cramér-Rao 下界）。在非线性模型（Logit、Probit、Tobit）中，MLE 是主要估计方法。",
        formula: "θ̂ₘₗₑ = argmax_θ Σ ln f(xᵢ | θ)",
        formulaExplain:
          "最大化对数似然函数求解参数估计值。一阶条件（Score 方程）：∂ℓ/∂θ = 0。",
        derivation: [
          "1. 写出似然函数 L(θ) = Π f(xᵢ|θ)（假设独立同分布）",
          "2. 取对数：ℓ(θ) = Σ ln f(xᵢ|θ)",
          "3. 一阶条件（Score）：S(θ) = ∂ℓ/∂θ = 0",
          "4. 二阶条件确认为极大值：∂²ℓ/∂θ² < 0",
          "5. 渐近分布：√n(θ̂ − θ₀) →ᵈ N(0, I(θ₀)⁻¹)",
        ],
      },
      // ===== 第三部分：经典线性回归 =====
      {
        title: "普通最小二乘法 (OLS)",
        content:
          "最基础的估计方法。在 Gauss-Markov 假设下（线性、严格外生、同方差、无自相关、无完全多重共线性），OLS 是最佳线性无偏估计量 (BLUE)。R² 度量模型的拟合优度，调整 R² 惩罚过多变量。OLS 的几何解释是将 Y 投影到 X 的列空间，残差 e 与列空间正交。",
        formula: "β̂ = (X'X)⁻¹X'Y",
        formulaExplain: "最小化残差平方和 min Σ(Yᵢ − Xᵢβ)² 的解析解。",
        derivation: [
          "1. 模型设定：Y = Xβ + ε，其中 E(ε|X) = 0",
          "2. 目标函数：min_β (Y − Xβ)'(Y − Xβ)",
          "3. 展开：Y'Y − 2β'X'Y + β'X'Xβ",
          "4. 一阶条件：−2X'Y + 2X'Xβ̂ = 0",
          "5. 整理：X'Xβ̂ = X'Y → β̂ = (X'X)⁻¹X'Y",
          "6. 方差：Var(β̂|X) = σ²(X'X)⁻¹",
        ],
      },
      {
        title: "Gauss-Markov 定理",
        content:
          "在经典线性回归假设（GM.1-GM.5）下，OLS 估计量在所有线性无偏估计量中方差最小，即 BLUE。该定理不要求正态性假设。当误差项进一步满足正态分布时，OLS 在所有无偏估计量（不限于线性）中都是最有效的。违反 Gauss-Markov 条件（如异方差、自相关）时，OLS 仍无偏但不再最优。",
        formula: "Var(β̃) − Var(β̂ₒₗₛ) ≥ 0  (半正定)",
        formulaExplain:
          "对于任意其他线性无偏估计量 β̃，其方差矩阵不小于 OLS 方差矩阵。",
        derivation: [
          "1. 设 β̃ = CY 为任意线性无偏估计量，则 C = (X'X)⁻¹X' + D",
          "2. 无偏性要求 DX = 0",
          "3. Var(β̃) = σ²CC' = σ²[(X'X)⁻¹ + DD']",
          "4. 因此 Var(β̃) − Var(β̂) = σ²DD' ≥ 0（半正定）",
        ],
      },
      {
        title: "异方差与稳健推断",
        content:
          "当误差项方差不恒定 Var(εᵢ|Xᵢ) = σᵢ² 时，OLS 估计仍无偏一致，但标准误有偏，导致 t/F 检验失效。White (1980) 提出的异方差稳健标准误（HC 标准误）无需指定异方差形式即可修正推断。BP 检验和 White 检验可诊断异方差。加权最小二乘 (WLS) 在已知异方差形式时比 OLS 更有效。",
        formula: "V̂ₕc = (X'X)⁻¹ (Σ ê²ᵢ xᵢxᵢ') (X'X)⁻¹",
        formulaExplain:
          "White 异方差一致协方差矩阵估计（三明治估计量），êᵢ 为 OLS 残差。",
      },
      {
        title: "多重共线性",
        content:
          "当解释变量之间高度相关时，(X'X) 接近奇异，OLS 估计量方差膨胀，系数估计不稳定。方差膨胀因子 VIF = 1/(1−Rⱼ²) 可诊断共线性程度，VIF > 10 通常被视为严重共线性。解决方法包括：删除冗余变量、主成分回归、岭回归（Ridge，引入 L₂ 惩罚）等。",
        formula: "VIFⱼ = 1 / (1 − Rⱼ²)",
        formulaExplain:
          "Rⱼ² 是以 Xⱼ 为因变量对其余解释变量回归的 R²。VIF 越大说明共线性越严重。",
      },
      // ===== 第四部分：内生性与工具变量 =====
      {
        title: "内生性问题",
        content:
          "当 Cov(X, ε) ≠ 0 时，OLS 估计有偏且不一致，这称为内生性。内生性的来源包括：遗漏变量偏误（相关变量未纳入模型）、测量误差（解释变量含噪声）和联立方程偏误（双向因果）。内生性的方向可通过遗漏变量偏差公式分析。解决方法包括工具变量法、面板固定效应、自然实验等。",
        formula: "plim β̂ₒₗₛ = β + Cov(X,ε)/Var(X)",
        formulaExplain:
          "OLS 不一致性的来源：当 Cov(X,ε) ≠ 0 时，β̂ 的概率极限偏离真值 β。",
      },
      {
        title: "工具变量法 (IV/2SLS)",
        content:
          "工具变量法通过找到与内生变量相关（相关性条件）、但与误差项无关（排除性约束）的变量来解决内生性。两阶段最小二乘法 (2SLS) 先将内生变量对工具回归得到拟合值，再用拟合值替代内生变量进行第二阶段回归。弱工具变量（第一阶段 F < 10）会导致偏误和推断扭曲。过度识别时 Sargan/Hansen J 检验检验工具外生性。",
        formula: "β̂₂ₛₗₛ = (X̂'X̂)⁻¹X̂'Y",
        formulaExplain:
          "X̂ = Pz·X 为第一阶段拟合值，Pz = Z(Z'Z)⁻¹Z' 为投影矩阵。",
        derivation: [
          "1. 第一阶段：X = Zπ + v，OLS 得 π̂ = (Z'Z)⁻¹Z'X",
          "2. 拟合值：X̂ = Zπ̂ = Z(Z'Z)⁻¹Z'X = PzX",
          "3. 第二阶段：Y = X̂β + u，OLS 估计",
          "4. β̂₂ₛₗₛ = (X̂'X̂)⁻¹X̂'Y = (X'PzX)⁻¹X'PzY",
          "5. 渐近分布：√n(β̂ − β) →ᵈ N(0, σ²(Q'ₓᵤQ⁻¹ᵤᵤQₓᵤ)⁻¹)",
        ],
      },
      {
        title: "广义矩估计 (GMM)",
        content:
          "Hansen (1982) 提出的统一估计框架，OLS、IV、MLE 都是其特殊情况。GMM 仅需指定矩条件 E[m(xᵢ, θ₀)] = 0，无需完整的分布假设，因此具有半参数的灵活性。两步 GMM 先用单位矩阵作权重矩阵，再用第一步残差更新最优权重矩阵。J 统计量用于过度识别检验。",
        formula: "θ̂ₘₘ = argmin_θ [gₙ(θ)]' Wₙ [gₙ(θ)]",
        formulaExplain:
          "gₙ(θ) = (1/n) Σ m(xᵢ, θ) 为样本矩条件，Wₙ 为权重矩阵。最优权重矩阵 W* = S⁻¹，S 为矩条件的长期方差。",
        derivation: [
          "1. 总体矩条件：E[m(xᵢ, θ₀)] = 0（q 个方程，p 个参数）",
          "2. 样本类比：gₙ(θ) = (1/n) Σ m(xᵢ, θ)",
          "3. 恰好识别 (q=p)：直接解 gₙ(θ̂) = 0",
          "4. 过度识别 (q>p)：最小化二次型 Qₙ(θ) = gₙ(θ)'Wₙgₙ(θ)",
          "5. 最优权重：W* = [Var(√n·gₙ)]⁻¹ = S⁻¹",
          "6. J 检验：nQₙ(θ̂) →ᵈ χ²(q−p) 用于过度识别检验",
        ],
      },
      // ===== 第五部分：面板数据 =====
      {
        title: "面板数据：固定效应与随机效应",
        content:
          "面板数据同时包含截面 (i) 和时间 (t) 维度，能控制不可观测的个体异质性。固定效应 (FE) 模型通过组内去均值消除个体效应 αᵢ，允许 αᵢ 与 X 相关。随机效应 (RE) 模型假设 αᵢ 与 X 不相关，用 GLS 提高效率。Hausman 检验比较 FE 与 RE：若 RE 一致则两者系数应接近，差异显著则选 FE。",
        formula: "Yᵢₜ − Ȳᵢ = (Xᵢₜ − X̄ᵢ)β + (εᵢₜ − ε̄ᵢ)",
        formulaExplain:
          "固定效应组内变换（Within Transformation）：去均值消除个体效应 αᵢ。",
        derivation: [
          "1. 原始模型：Yᵢₜ = αᵢ + Xᵢₜβ + εᵢₜ",
          "2. 个体均值：Ȳᵢ = αᵢ + X̄ᵢβ + ε̄ᵢ",
          "3. 相减：(Yᵢₜ − Ȳᵢ) = (Xᵢₜ − X̄ᵢ)β + (εᵢₜ − ε̄ᵢ)",
          "4. αᵢ 被消除，对变换后的方程做 OLS 即得 FE 估计",
          "5. Hausman 统计量：H = (β̂ₑ − β̂ᵣₑ)' [V̂ₑ − V̂ᵣₑ]⁻¹ (β̂ₑ − β̂ᵣₑ) ~ χ²(k)",
        ],
      },
      {
        title: "聚类标准误与面板稳健推断",
        content:
          "面板数据中同一个体的误差通常存在序列相关，同一时期不同个体间也可能存在截面相关。使用聚类稳健标准误 (Clustered SE) 允许组内（如个体层面）误差任意相关。双向聚类同时允许个体和时间维度的相关性。Cameron-Gelbach-Miller (2011) 提供了多维聚类的推断方法。",
        formula: "V̂ᶜˡ = (X'X)⁻¹ (Σ_g X'g ê_g ê'_g X_g) (X'X)⁻¹",
        formulaExplain:
          "聚类稳健协方差矩阵，g 索引聚类组，允许组内误差任意相关。",
      },
      // ===== 第六部分：离散选择与受限因变量 =====
      {
        title: "Logit 与 Probit 模型",
        content:
          "当因变量为二元 (0/1) 时，线性概率模型 (LPM) 有预测值越界和异方差问题。Logit 模型用 logistic 函数 Λ(·) 将线性指标映射到 (0,1)，Probit 用标准正态 CDF Φ(·)。两者通过 MLE 估计，系数需通过边际效应 ∂P/∂x 解读。Logit 系数可转化为优势比 (Odds Ratio)。",
        formula: "P(Y=1|X) = Λ(X'β) = exp(X'β) / (1 + exp(X'β))",
        formulaExplain:
          "Logit 模型：logistic 函数将线性组合映射为概率。边际效应 = β · Λ'(X'β)。",
      },
      {
        title: "Tobit 与样本选择模型",
        content:
          "Tobit 模型处理因变量在某个值（通常为 0）被截断的情形，如家庭投资额、消费支出。Heckman (1979) 选择模型处理样本选择偏差：首先用 Probit 估计选择方程得到逆米尔斯比率 λ，然后将 λ 纳入结果方程修正偏差。Heckman 因此获得 2000 年诺贝尔经济学奖。",
        formula: "E(Y|Y>0, X) = X'β + σ · λ(X'γ/σ)",
        formulaExplain:
          "λ(·) = φ(·)/Φ(·) 为逆米尔斯比率，修正截断/选择带来的偏差。",
      },
      // ===== 第七部分：因果推断 =====
      {
        title: "潜在结果框架与平均处理效应",
        content:
          "Rubin 因果模型定义因果效应为潜在结果之差：τᵢ = Y₁ᵢ − Y₀ᵢ，其中 Y₁ᵢ 和 Y₀ᵢ 分别是个体接受/未接受处理的结果。因果推断的根本问题是我们只能观察到一个潜在结果。在随机化实验 (RCT) 中，处理分配独立于潜在结果，样本均值之差即为 ATE 的无偏估计。观测数据中需要额外假设来识别因果效应。",
        formula: "ATE = E[Y₁ − Y₀] = E[Y|D=1] − E[Y|D=0]  (under RCT)",
        formulaExplain:
          "平均处理效应。随机化保证 (Y₀,Y₁) ⊥ D，消除选择偏差。",
      },
      {
        title: "双重差分法 (DID)",
        content:
          "DID 利用处理组和对照组在政策实施前后的变化之差来识别因果效应。核心假设是平行趋势：若无处理，两组的变化趋势相同。DID 可消除时间不变的不可观测异质性和共同时间趋势。现代 DID 方法扩展到多期交错处理 (Staggered DID)，Callaway-Sant'Anna (2021) 和 Sun-Abraham (2021) 等方法处理处理效应异质性问题。",
        formula: "τ̂ᴰᴵᴰ = (Ȳ₁₁ − Ȳ₁₀) − (Ȳ₀₁ − Ȳ₀₀)",
        formulaExplain:
          "下标：第一位为组别 (1=处理, 0=对照)，第二位为时期 (1=后, 0=前)。差中之差消除组别和时间固定效应。",
      },
      {
        title: "断点回归 (RDD)",
        content:
          "断点回归利用处理分配在某个运行变量阈值处的跳跃来识别局部因果效应。在阈值处，处于阈值两侧的个体近似随机分配。精确断点 (Sharp RDD) 中处理概率从 0 跳到 1；模糊断点 (Fuzzy RDD) 中处理概率有跳跃但不完全，等价于以阈值为工具变量的 IV 估计。带宽选择和核函数选取影响估计的偏差-方差权衡。",
        formula: "τᴿᴰᴰ = lim_{x→c⁺} E[Y|X=x] − lim_{x→c⁻} E[Y|X=x]",
        formulaExplain:
          "在阈值 c 处条件期望的跳跃即为局部平均处理效应 (LATE)。",
      },
    ],
  },
  {
    id: "time-series",
    icon: Activity,
    title: "时间序列",
    subtitle: "Time Series",
    desc: "平稳性、ARIMA、GARCH 波动率建模、协整、VAR、状态空间模型",
    tags: ["ARIMA", "GARCH", "VAR", "协整", "状态空间"],
    heroDesc:
      "时间序列分析研究数据随时间演变的规律，在宏观经济预测、金融波动率建模和风险管理中有广泛应用。本模块从平稳性基础出发，覆盖经典与现代时间序列方法。",
    knowledgePoints: [
      // ── 一、平稳性基础 ──
      {
        title: "严平稳与弱平稳",
        content:
          "严平稳（强平稳）要求序列的联合分布对时间平移不变；弱平稳（宽平稳/协方差平稳）仅要求一阶矩和二阶矩不随时间变化。实践中通常使用弱平稳概念，因为它只涉及均值和自协方差函数。",
        formula: "E(Yₜ) = μ（常数），Cov(Yₜ, Yₜ₊ₕ) = γ(h)（仅依赖 h）",
        formulaExplain:
          "弱平稳的两个核心条件：均值恒定，自协方差仅取决于滞后阶数 h，与时间 t 无关。",
      },
      {
        title: "白噪声与 Wold 分解",
        content:
          "白噪声是最基本的平稳过程：均值为零、方差恒定、无自相关。Wold 分解定理表明，任何协方差平稳过程都可以唯一分解为一个确定性部分和一个无穷阶移动平均过程。",
        formula: "Yₜ = Σ∞ⱼ₌₀ ψⱼεₜ₋ⱼ + ηₜ，其中 Σψ²ⱼ < ∞",
        formulaExplain:
          "εₜ 为白噪声，ψ₀ = 1，ηₜ 为确定性线性可预测部分。这是 ARMA 建模的理论基础。",
      },
      {
        title: "自相关函数 (ACF) 与偏自相关函数 (PACF)",
        content:
          "ACF ρ(h) 度量 Yₜ 与 Yₜ₊ₕ 的线性相关；PACF φₕₕ 控制中间变量后的净相关。ACF/PACF 的截尾与拖尾模式是识别 AR/MA 阶数的关键工具。",
        formula: "ρ(h) = γ(h)/γ(0)；φₕₕ = Corr(Yₜ, Yₜ₊ₕ | Yₜ₊₁,…,Yₜ₊ₕ₋₁)",
        formulaExplain:
          "AR(p)：PACF 在 p 阶后截尾；MA(q)：ACF 在 q 阶后截尾；ARMA：两者均拖尾。",
        derivation: [
          "1. 计算样本自协方差：γ̂(h) = (1/T) Σₜ (Yₜ − Ȳ)(Yₜ₊ₕ − Ȳ)",
          "2. 样本 ACF：ρ̂(h) = γ̂(h) / γ̂(0)",
          "3. PACF 通过 Durbin-Levinson 递推或对 Yₜ 关于 Yₜ₋₁,…,Yₜ₋ₕ 回归取最后系数",
          "4. Bartlett 公式给出 ρ̂(h) 在白噪声下的渐近方差 ≈ 1/T",
        ],
      },
      // ── 二、单位根与非平稳 ──
      {
        title: "随机游走与单位根",
        content:
          "随机游走 Yₜ = Yₜ₋₁ + εₜ 是最简单的单位根过程，其方差随时间线性增长。单位根的存在导致传统的 t 统计量和 F 统计量失效（伪回归问题），必须使用专门的单位根检验。",
        formula: "Yₜ = Yₜ₋₁ + εₜ  ⟹  Var(Yₜ) = tσ²",
        formulaExplain:
          "方差随时间 t 发散，不满足平稳性。对随机游走取一阶差分 ΔYₜ = εₜ 即为白噪声。",
      },
      {
        title: "ADF 检验（增广 Dickey-Fuller）",
        content:
          "ADF 检验在 DF 检验基础上加入 ΔYₜ 的滞后项以消除残差自相关。原假设为存在单位根（非平稳），备择假设为平稳。检验统计量服从 Dickey-Fuller 分布（非标准正态）。",
        formula: "ΔYₜ = α + γYₜ₋₁ + Σᵖᵢ₌₁ δᵢΔYₜ₋ᵢ + εₜ",
        formulaExplain:
          "H₀: γ = 0（单位根）；H₁: γ < 0（平稳）。滞后阶数 p 可用 AIC/BIC 选择。",
        derivation: [
          "1. 原模型 Yₜ = ρYₜ₋₁ + εₜ，令 γ = ρ − 1，两边减 Yₜ₋₁",
          "2. 得到 ΔYₜ = γYₜ₋₁ + εₜ，检验 γ = 0 即等价于 ρ = 1",
          "3. 加入截距项 α 和趋势项 βt 得到三种模型规格",
          "4. 加入 ΔYₜ₋ᵢ 滞后项控制高阶自相关，即为 ADF",
          "5. 临界值来自 Monte Carlo 模拟的 Dickey-Fuller 分布表",
        ],
      },
      {
        title: "PP 检验与 KPSS 检验",
        content:
          "Phillips-Perron 检验通过 Newey-West 核估计修正序列相关，无需选择滞后阶数。KPSS 检验反转假设：H₀ 为平稳，H₁ 为单位根。两者结合使用可增强判断可靠性。",
        formula: "KPSS: ηₜ = Σₛ₌₁ᵗ eₛ（残差累积和），统计量 = Σ η²ₜ / (T²σ̂²ₗ)",
        formulaExplain:
          "ADF/PP 不拒绝 + KPSS 拒绝 → 单位根；ADF/PP 拒绝 + KPSS 不拒绝 → 平稳。",
      },
      // ── 三、ARMA / ARIMA ──
      {
        title: "AR(p) 模型",
        content:
          "自回归模型将当前值表示为自身过去 p 期值的线性组合。平稳性条件是特征方程 1 − φ₁z − ⋯ − φₚzᵖ = 0 的所有根在单位圆外。Yule-Walker 方程将自相关与参数联系起来。",
        formula: "Yₜ = c + φ₁Yₜ₋₁ + φ₂Yₜ₋₂ + ⋯ + φₚYₜ₋ₚ + εₜ",
        formulaExplain:
          "AR(1)：|φ₁| < 1 时平稳，ACF 指数衰减，PACF 1 阶后截尾。",
        derivation: [
          "1. AR(1) 递推展开：Yₜ = Σ∞ⱼ₌₀ φ₁ʲεₜ₋ⱼ（|φ₁| < 1 时收敛）",
          "2. 均值：E(Yₜ) = c / (1 − φ₁)",
          "3. 方差：γ(0) = σ² / (1 − φ₁²)",
          "4. 自协方差：γ(h) = φ₁ʰγ(0)，ACF ρ(h) = φ₁ʰ",
          "5. Yule-Walker 方程组：γ(h) = φ₁γ(h−1) + ⋯ + φₚγ(h−p)",
        ],
      },
      {
        title: "MA(q) 模型",
        content:
          "移动平均模型将当前值表示为白噪声当期和过去 q 期冲击的线性组合。MA 模型始终弱平稳，但需要可逆性条件以保证唯一参数化。",
        formula: "Yₜ = μ + εₜ + θ₁εₜ₋₁ + θ₂εₜ₋₂ + ⋯ + θqεₜ₋q",
        formulaExplain:
          "MA(q) 的 ACF 在 q 阶后严格截尾（ρ(h) = 0, h > q），PACF 拖尾。",
      },
      {
        title: "ARIMA(p,d,q) 与 Box-Jenkins 方法",
        content:
          "ARIMA 通过 d 次差分将非平稳序列转化为平稳序列，再用 ARMA(p,q) 拟合。Box-Jenkins 方法是一套系统的建模流程：识别、估计、诊断、预测。",
        formula: "Φ(L)(1−L)ᵈYₜ = Θ(L)εₜ",
        formulaExplain:
          "L 为滞后算子，Φ(L) = 1 − φ₁L − ⋯ − φₚLᵖ，Θ(L) = 1 + θ₁L + ⋯ + θqLq。",
        derivation: [
          "1. 识别：绘制 ACF/PACF 图，确定差分阶数 d 和 ARMA 阶数 p, q",
          "2. 估计：条件/精确最大似然法或 CSS（条件平方和）",
          "3. 诊断：Ljung-Box Q 统计量检验残差是否为白噪声，Q = T(T+2)Σ ρ̂²(h)/(T−h)",
          "4. 模型选择：AIC = −2ln(L) + 2k，BIC = −2ln(L) + k·ln(T)",
          "5. 预测：线性最小均方误差预测，置信区间随预测步数扩大",
        ],
      },
      {
        title: "季节性 ARIMA (SARIMA)",
        content:
          "SARIMA(p,d,q)(P,D,Q)ₛ 同时处理常规和季节性自相关。季节差分 (1−Lˢ)ᴰ 去除季节性趋势，季节 AR/MA 多项式捕捉季节周期模式。",
        formula: "Φ(L)Φₛ(Lˢ)(1−L)ᵈ(1−Lˢ)ᴰYₜ = Θ(L)Θₛ(Lˢ)εₜ",
        formulaExplain:
          "s 为季节周期（月度 s=12，季度 s=4）。Φₛ 和 Θₛ 为季节 AR/MA 多项式。",
      },
      // ── 四、波动率模型 ──
      {
        title: "ARCH 模型",
        content:
          "Engle (1982) 提出 ARCH 模型，捕捉金融收益率的波动聚集现象：大波动后往往跟随大波动。条件方差是过去残差平方的函数。ARCH-LM 检验用于检测条件异方差的存在。",
        formula: "σ²ₜ = ω + α₁ε²ₜ₋₁ + α₂ε²ₜ₋₂ + ⋯ + αqε²ₜ₋q",
        formulaExplain:
          "ω > 0, αᵢ ≥ 0。ARCH 效应检验：对残差平方 ε̂²ₜ 关于其滞后值回归，检验 R²。",
      },
      {
        title: "GARCH(1,1) 模型",
        content:
          "Bollerslev (1986) 提出，用一个 ARCH 项和一个 GARCH 项替代高阶 ARCH。GARCH(1,1) 是实证中最常用的波动率模型，持久性参数 α + β 接近 1 意味着波动率冲击衰减缓慢。",
        formula: "σ²ₜ = ω + αε²ₜ₋₁ + βσ²ₜ₋₁",
        formulaExplain:
          "ω > 0, α ≥ 0, β ≥ 0, α + β < 1（协方差平稳）。无条件方差 σ̄² = ω/(1−α−β)。",
        derivation: [
          "1. 均值方程：rₜ = μ + εₜ，εₜ = σₜzₜ，zₜ ~ i.i.d. N(0,1)",
          "2. 方差方程：σ²ₜ = ω + αε²ₜ₋₁ + βσ²ₜ₋₁",
          "3. 对数似然：l = −(1/2)Σ[ln(2π) + ln(σ²ₜ) + ε²ₜ/σ²ₜ]",
          "4. 数值优化（BHHH 算法）求最大似然估计",
          "5. 波动率半衰期：h = ln(0.5) / ln(α + β)",
        ],
      },
      {
        title: "GARCH 扩展：EGARCH、GJR-GARCH、IGARCH",
        content:
          "标准 GARCH 无法捕捉杠杆效应（负冲击比正冲击引起更大波动）。EGARCH（Nelson 1991）对 ln(σ²) 建模，天然保证正性；GJR-GARCH 加入非对称项。IGARCH（α+β=1）允许波动率冲击永久存在。",
        formula: "GJR: σ²ₜ = ω + (α + γIₜ₋₁)ε²ₜ₋₁ + βσ²ₜ₋₁",
        formulaExplain:
          "Iₜ₋₁ = 1 当 εₜ₋₁ < 0（坏消息）。γ > 0 表示杠杆效应：负冲击对波动率影响更大。",
      },
      // ── 五、多元时间序列 ──
      {
        title: "向量自回归 (VAR)",
        content:
          "VAR(p) 将多个变量的当前值表示为所有变量过去 p 期值的线性函数。无需区分内生/外生变量，适合分析变量间的动态互动。滞后阶数用信息准则选择。",
        formula: "Yₜ = c + A₁Yₜ₋₁ + A₂Yₜ₋₂ + ⋯ + AₚYₜ₋ₚ + εₜ",
        formulaExplain:
          "Yₜ 为 K×1 向量，Aᵢ 为 K×K 系数矩阵，εₜ ~ WN(0, Σ)。参数总数 = K²p + K。",
        derivation: [
          "1. 每个方程用 OLS 逐方程估计（等价于 SUR，因回归元相同）",
          "2. 平稳性：det(Iₖ − A₁z − ⋯ − Aₚzᵖ) = 0 的根全在单位圆外",
          "3. 脉冲响应函数 (IRF)：VMA(∞) 表示 Yₜ = Σ Φᵢεₜ₋ᵢ",
          "4. 方差分解 (FEVD)：各变量冲击对预测误差方差的贡献比例",
        ],
      },
      {
        title: "Granger 因果检验",
        content:
          "Granger (1969) 因果：如果加入 X 的滞后值能改善对 Y 的预测，则称 X Granger-cause Y。本质是信息增量检验，不等同于真因果关系。通过 F 检验或 Wald 检验实现。",
        formula: "Yₜ = c + Σ αᵢYₜ₋ᵢ + Σ βᵢXₜ₋ᵢ + εₜ；H₀: β₁ = β₂ = ⋯ = βₚ = 0",
        formulaExplain:
          "拒绝 H₀ 意味着 X 的滞后值对预测 Y 有显著增量贡献。双向 Granger 因果是可能的。",
      },
      {
        title: "协整与 VECM",
        content:
          "两个 I(1) 序列的某个线性组合可能是 I(0)，即存在长期均衡关系。Engle-Granger 两步法和 Johansen 迹/最大特征值检验是主要检验方法。协整关系通过向量误差修正模型 (VECM) 建模。",
        formula: "ΔYₜ = αβ'Yₜ₋₁ + Σ ΓᵢΔYₜ₋ᵢ + εₜ",
        formulaExplain:
          "β'Yₜ₋₁ 为误差修正项（协整向量），α 为调整速度系数。长期均衡偏离后系统将向均衡回归。",
        derivation: [
          "1. Engle-Granger：OLS 估计协整方程 Y₁ₜ = a + bY₂ₜ + uₜ，对 ûₜ 做 ADF 检验",
          "2. Johansen：将 VAR 改写为 VECM，Π = αβ'，rank(Π) = 协整向量个数 r",
          "3. 迹检验：H₀: rank ≤ r vs H₁: rank > r",
          "4. 最大特征值检验：H₀: rank = r vs H₁: rank = r+1",
          "5. 确定 r 后，估计 α 和 β，β 的列即为协整向量",
        ],
      },
      // ── 六、结构化与前沿方法 ──
      {
        title: "结构 VAR (SVAR)",
        content:
          "标准 VAR 的简化式残差是相关的，无法做因果解读。SVAR 施加经济理论约束（短期约束用 Cholesky 分解，长期约束用 Blanchard-Quah 方法）来识别结构冲击。",
        formula: "B₀Yₜ = c* + B₁Yₜ₋₁ + ⋯ + BₚYₜ₋ₚ + uₜ，uₜ ~ WN(0, D)",
        formulaExplain:
          "B₀ 为同期关系矩阵，uₜ 为不相关的结构冲击。需 K(K−1)/2 个约束条件实现恰好识别。",
      },
      {
        title: "状态空间模型与卡尔曼滤波",
        content:
          "状态空间模型将观测方程和状态转移方程分离，统一框架下可表示 ARIMA、时变参数、随机波动率等模型。卡尔曼滤波递推地估计不可观测的状态变量。",
        formula: "观测：Yₜ = ZₜXₜ + εₜ；状态：Xₜ = TₜXₜ₋₁ + Rₜηₜ",
        formulaExplain:
          "Xₜ 为状态向量，Zₜ 为观测矩阵，Tₜ 为转移矩阵。卡尔曼滤波输出最优线性预测和滤波。",
        derivation: [
          "1. 预测步：X̂ₜ|ₜ₋₁ = TₜX̂ₜ₋₁|ₜ₋₁，Pₜ|ₜ₋₁ = TₜPₜ₋₁|ₜ₋₁T'ₜ + RₜQₜR'ₜ",
          "2. 更新步：Kₜ = Pₜ|ₜ₋₁Z'ₜ(ZₜPₜ|ₜ₋₁Z'ₜ + Hₜ)⁻¹（卡尔曼增益）",
          "3. X̂ₜ|ₜ = X̂ₜ|ₜ₋₁ + Kₜ(Yₜ − ZₜX̂ₜ|ₜ₋₁)",
          "4. Pₜ|ₜ = (I − KₜZₜ)Pₜ|ₜ₋₁",
          "5. 似然函数通过预测误差分解计算，可用 MLE 估计参数",
        ],
      },
      {
        title: "长记忆过程与 ARFIMA",
        content:
          "标准 ARIMA 的差分阶数 d 为整数，但许多金融和宏观序列的记忆介于短记忆 I(0) 和单位根 I(1) 之间。ARFIMA 允许分数差分 0 < d < 0.5，ACF 以双曲线速率缓慢衰减。",
        formula: "Φ(L)(1−L)ᵈYₜ = Θ(L)εₜ，d ∈ ℝ",
        formulaExplain:
          "0 < d < 0.5：长记忆平稳过程；0.5 ≤ d < 1：长记忆非平稳但均值回复。GPH 和 ELW 方法可估计 d。",
      },
      {
        title: "随机波动率 (SV) 模型",
        content:
          "与 GARCH 不同，SV 模型将对数波动率建模为隐状态过程，更灵活但估计更复杂。常用贝叶斯 MCMC 或粒子滤波方法。在期权定价和风险管理中应用广泛。",
        formula: "rₜ = exp(hₜ/2)εₜ，hₜ = μ + φ(hₜ₋₁ − μ) + σᵥηₜ",
        formulaExplain:
          "hₜ 为对数波动率状态，|φ| < 1 保证平稳。εₜ 和 ηₜ 独立或允许相关（杠杆 SV）。",
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
