/**
 * Quiz bank for the Knowledge Check section.
 *
 * Each question carries a `sectionId` so a wrong answer can point the reader
 * straight at the lab that teaches it, and a `topicEn` label so the topic
 * chips work in both languages.
 */
export interface QuizQuestion {
  id: string;
  question: string;
  formula?: string;
  options: string[];
  answer: number;       // index of correct option
  explanation: string;
  citeId?: string;
  topic: string;
  /** English label for the topic chip */
  topicEn: string;
  /** the lab/section page that teaches this question */
  sectionId: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "bs1", topic: "BS 期权", topicEn: "Black–Scholes", sectionId: "calculator",
    question: "在 Black-Scholes 模型中，当波动率 σ 上升时，欧式认购期权价格如何变化？",
    options: ["下降", "不变", "上升", "取决于 S 与 K 的相对位置"],
    answer: 2,
    explanation: "Vega = ∂C/∂σ > 0 对所有标准期权成立。波动率越大，到期日 S 的分布更分散，期权\"凸性\"使得上行收益增加更多而下行损失被锁定（payoff = max(S-K, 0)）。",
    formula: String.raw`\mathcal{V} = S\,\phi(d_1)\sqrt{T} > 0`,
    citeId: "bs73",
  },
  {
    id: "bs2", topic: "BS 期权", topicEn: "Black–Scholes", sectionId: "calculator",
    question: "若无风险利率 r 上升 1%，下列说法正确的是：",
    options: ["认购价格上升，认沽价格下降", "认购下降，认沽上升", "两者都上升", "两者都下降"],
    answer: 0,
    explanation: "Rho_call = K·T·e^{-rT}·N(d2) > 0；Rho_put = -K·T·e^{-rT}·N(-d2) < 0。直观：r 上升降低 K 的现值（行权时支付），对认购方有利、对认沽方不利。",
    citeId: "bs73",
  },
  {
    id: "merton1", topic: "信用风险", topicEn: "Credit Risk", sectionId: "risk",
    question: "在 Merton (1974) 结构化模型中，公司股权可以视为：",
    options: [
      "以资产 V 为标的、行权价 D 的看跌期权",
      "以资产 V 为标的、行权价 D 的看涨期权",
      "无风险债券",
      "以债务 D 为标的的远期合约",
    ],
    answer: 1,
    explanation: "到期时股东获得 max(V_T - D, 0)，等价于以 V 为标的、K=D 的欧式看涨期权。债权人 = 持有 D 同时卖出 put on V。这是把 BS 框架延伸到信用领域的关键洞察。",
    formula: String.raw`E_0 = V_0\,\Phi(d_1) - D\,e^{-rT}\Phi(d_2)`,
    citeId: "merton74",
  },
  {
    id: "merton2", topic: "信用风险", topicEn: "Credit Risk", sectionId: "risk",
    question: "违约距离 DD 越大意味着：",
    options: ["违约概率越高", "违约概率越低", "信用利差越大", "杠杆越高"],
    answer: 1,
    explanation: "DD = (ln(V/D) + (μ - σ²/2)T) / (σ√T)，PD = N(-DD)。DD ↑ → -DD ↓ → N(-DD) ↓ → PD ↓。KMV 公司的经典风险度量。",
    citeId: "merton74",
  },
  {
    id: "lsm1", topic: "美式期权", topicEn: "American Options", sectionId: "mc-pricer",
    question: "Longstaff-Schwartz (LSM) 算法用来估计什么？",
    options: [
      "欧式期权的 BS 解析价格",
      "标的资产的隐含波动率",
      "美式期权在每个节点的延续价值 E[V_{t+1}|S_t]",
      "二叉树的上下移幅 u, d",
    ],
    answer: 2,
    explanation: "LSM 用 ITM 路径上的最小二乘回归 (1, S, S²) 拟合延续价值，将其与立即行使的内在价值比较以决定 τ*。这是处理高维美式衍生品的工业标准。",
    formula: String.raw`\hat{C}_{cont}(S_t) = \beta_0 + \beta_1 S_t + \beta_2 S_t^2`,
    citeId: "longstaff01",
  },
  {
    id: "svi1", topic: "波动率曲面", topicEn: "Vol Surface", sectionId: "implied-vol",
    question: "SVI 参数 ρ 的金融含义是：",
    options: ["平价 ATM 隐含波动率", "微笑曲线的斜率/偏度", "曲率（凸性）", "整体水平"],
    answer: 1,
    explanation: "Raw SVI: w(k) = a + b{ρ(k-m) + √((k-m)² + σ²)}。ρ ∈ (-1, 1) 控制 skew：股指 ρ < 0 复现典型左偏（OTM put 比 OTM call 贵）。",
    citeId: "gatheral04",
  },
  {
    id: "vasicek1", topic: "利率模型", topicEn: "Rate Models", sectionId: "rate-model",
    question: "Vasicek 模型相比 CIR 模型的主要\"缺陷\"是：",
    options: [
      "无法解析定价",
      "利率可能为负",
      "波动率结构过于复杂",
      "不允许均值回归",
    ],
    answer: 1,
    explanation: "Vasicek: dr = κ(θ-r)dt + σ·dW，σ 为常数 → r 为正态分布，可取负。CIR: dr = κ(θ-r)dt + σ√r·dW，扩散系数随 r 收缩到 0，确保 r ≥ 0（Feller 条件 2κθ ≥ σ² 时严格 > 0）。",
    citeId: "vasicek77",
  },
  {
    id: "garch1", topic: "GARCH", topicEn: "GARCH", sectionId: "calibration",
    question: "GARCH(1,1) 中 α + β 接近 1 表示：",
    options: [
      "波动率过程完全独立",
      "高波动率持续性 (volatility clustering)",
      "残差服从正态分布",
      "模型错误设定",
    ],
    answer: 1,
    explanation: "α + β 是波动率的\"半衰期\"决定因素。接近 1 → 持续性极强，冲击衰减缓慢。金融数据典型估计 α+β ≈ 0.97 ~ 0.99。若 α+β ≥ 1 则 GARCH(1,1) 退化为 IGARCH（无条件方差不存在）。",
    formula: String.raw`\sigma_t^2 = \omega + \alpha\,r_{t-1}^2 + \beta\,\sigma_{t-1}^2`,
    citeId: "bollerslev86",
  },
  {
    id: "egarch1", topic: "GARCH", topicEn: "GARCH", sectionId: "calibration",
    question: "EGARCH 相比标准 GARCH 的关键改进是：",
    options: [
      "估计速度更快",
      "捕捉负面冲击对波动率的不对称放大（杠杆效应）",
      "不需要数据平稳",
      "可以处理跳跃过程",
    ],
    answer: 1,
    explanation: "EGARCH: ln σ²_t = ω + β·ln σ²_{t-1} + α(|z_{t-1}| - E|z|) + γ·z_{t-1}。γ < 0 时负冲击 (z<0) 放大波动率超过同等正冲击 → Black 1976 的杠杆效应。",
    citeId: "nelson91",
  },
  {
    id: "coint1", topic: "协整", topicEn: "Cointegration", sectionId: "econometrics",
    question: "两个 I(1) 序列协整的含义是：",
    options: [
      "它们的相关系数高",
      "它们的差分序列协整",
      "存在线性组合 y - β·x 是 I(0)",
      "它们都服从单位根过程",
    ],
    answer: 2,
    explanation: "协整 (Engle-Granger 1987) 要求 y_t, x_t 都是 I(1) 但存在 β 使 u_t = y_t - β·x_t ~ I(0)。这是\"长期均衡关系\"的统计表述，VECM 用 u_{t-1} 作为误差修正项。",
    formula: String.raw`\Delta y_t = \alpha_{ec}\,u_{t-1} + \gamma\,\Delta x_t + \varepsilon_t`,
    citeId: "engle87",
  },
  {
    id: "kalman1", topic: "Kalman 滤波", topicEn: "Kalman Filter", sectionId: "econometrics",
    question: "Kalman 增益 K_t 在更新方程中扮演什么角色？",
    options: [
      "决定状态噪声的方差",
      "在先验预测和新观测之间做最优加权",
      "强制状态保持稳定",
      "测试模型显著性",
    ],
    answer: 1,
    explanation: "K_t = P_{t|t-1}·x_t / (x_t²·P_{t|t-1} + R)。若观测噪声 R 很小 → K → 1 → 完全信任新观测；若 R 大 → K → 0 → 保持先验。是贝叶斯更新在线性高斯系统中的最优解。",
    formula: String.raw`\hat\beta_{t|t} = \hat\beta_{t|t-1} + K_t\bigl(y_t - x_t\hat\beta_{t|t-1}\bigr)`,
    citeId: "kalman60",
  },
  {
    id: "copula1", topic: "Copula", topicEn: "Copula", sectionId: "risk",
    question: "高斯 Copula 与 t-Copula 的本质区别在于：",
    options: [
      "高斯只能处理对称分布",
      "t-Copula 表现出非零的尾相依 λ",
      "高斯无法处理高维",
      "两者完全等价",
    ],
    answer: 1,
    explanation: "高斯 Copula λ_U = λ_L = 0 (除非 ρ=1)；t-Copula λ ≈ 2·t_{ν+1}(-√((ν+1)(1-ρ)/(1+ρ))) > 0。即\"在极端事件下相依性增强\"。2008 危机经典教训：信用衍生品建模过度依赖高斯导致系统性低估尾部风险。",
    citeId: "sklar59",
  },
  {
    id: "bl1", topic: "Black-Litterman", topicEn: "Black–Litterman", sectionId: "frontier",
    question: "BL 模型中\"隐含均衡收益\" π 是如何获得的？",
    options: [
      "从历史收益均值估计",
      "由分析师预测",
      "从 CAPM 反推：π = δ·Σ·w_market",
      "等于无风险利率",
    ],
    answer: 2,
    explanation: "BL 假设市值权重 w_market 在均值-方差框架下最优 → 反向求解隐含收益 π = δΣw。这个先验\"贝叶斯地\"表达了\"市场总是对的\"假设；观点 (P, Q, Ω) 提供新信息进行后验更新。",
    formula: String.raw`\pi = \delta\,\Sigma\, w_{\text{mkt}}`,
    citeId: "bl92",
  },
  {
    id: "ff1", topic: "Fama-French", topicEn: "Fama–French", sectionId: "asset-pricing",
    question: "在 FF5 模型中，α 显著为正且 |t| > 2 意味着：",
    options: [
      "模型设定错误",
      "经过五因子风险调整后仍存在选股能力",
      "组合等同于市场",
      "因子载荷不显著",
    ],
    answer: 1,
    explanation: "α (Jensen alpha) 是模型不能解释的超额收益。t-stat > 2 → 在 95% 置信下与零显著不同。但需警惕 data mining：测试 N 个策略中 5% 会自然出现 α 显著（多重检验问题）。",
    formula: String.raw`R_{p,t} - R_f = \alpha + \sum \beta_k F_{k,t} + \varepsilon_t`,
    citeId: "ff15",
  },
  {
    id: "frontier1", topic: "投资组合", topicEn: "Portfolio", sectionId: "frontier",
    question: "马科维茨有效前沿上每个点代表的是：",
    options: [
      "等风险组合",
      "给定风险下收益最大（或给定收益下风险最小）的组合",
      "市场组合",
      "无风险资产",
    ],
    answer: 1,
    explanation: "有效前沿 = Pareto 最优集，由二次规划 min ½w'Σw s.t. w'μ=μ_target, w'1=1 解出。引入无风险资产后切线组合即为唯一的市场组合（Tobin 分离定理）。",
    citeId: "markowitz52",
  },
  {
    id: "swaption1", topic: "利率衍生品", topicEn: "Rate Derivatives", sectionId: "derivatives",
    question: "Payer swaption 的持有者在到期时获得的权利是：",
    options: [
      "以行权利率 K 接收浮动利率",
      "以行权利率 K 支付固定、收浮动的互换",
      "无条件支付固定利率",
      "锁定即期汇率",
    ],
    answer: 1,
    explanation: "Payer = 支付方期权：在 T 时若远期互换利率 S_T > K，行使后以 K 支付固定，收浮动 → 净现金流 (S_T - K)·年金 A。等价于 call on swap rate，Black-76 解析定价。",
    formula: String.raw`V_0 = A\bigl[F\,\Phi(d_1) - K\,\Phi(d_2)\bigr]`,
    citeId: "black76",
  },
  {
    id: "stress1", topic: "压力测试", topicEn: "Stress Testing", sectionId: "risk",
    question: "Basel III FRTB 要求银行使用历史 + 假设情景压力测试，主要原因是：",
    options: [
      "VaR 已被淘汰",
      "历史样本不足以覆盖所有可能的尾部事件",
      "假设情景比历史更准确",
      "便于会计处理",
    ],
    answer: 1,
    explanation: "纯历史 VaR 受 lookback window 限制，无法捕捉前所未见的危机（如 2008 复杂衍生品爆雷）。假设情景（如利率 +400bp、股票 -50%）作为补充，提供前瞻性风险视角。FRTB 同时要求 Expected Shortfall 替代 VaR。",
    citeId: "basel19",
  },
];
