import { useState } from "react";

const models = [
  {
    id: "capm",
    name: "CAPM",
    fullName: "资本资产定价模型",
    formula: "E(Rᵢ) = Rᶠ + βᵢ [E(Rₘ) − Rᶠ]",
    description:
      "Sharpe (1964)、Lintner (1965) 提出。描述资产预期收益与系统性风险（β）的线性关系，是现代金融学的基石。",
    variables: [
      { sym: "E(Rᵢ)", meaning: "资产 i 的预期收益率" },
      { sym: "Rᶠ", meaning: "无风险利率" },
      { sym: "βᵢ", meaning: "资产的系统性风险系数" },
      { sym: "E(Rₘ)", meaning: "市场组合预期收益率" },
    ],
    keyInsight: "只有系统性风险（不可分散风险）才能获得风险溢价",
  },
  {
    id: "ff3",
    name: "Fama-French 三因子",
    fullName: "Fama-French Three-Factor Model",
    formula: "Rᵢ − Rᶠ = αᵢ + βᵢ(Rₘ − Rᶠ) + sᵢSMB + hᵢHML + εᵢ",
    description:
      "Fama & French (1993) 在 CAPM 基础上加入规模因子 (SMB) 和价值因子 (HML)，显著提高了对横截面收益差异的解释力。",
    variables: [
      { sym: "SMB", meaning: "小盘股减大盘股收益 (Size)" },
      { sym: "HML", meaning: "高 B/M 减低 B/M 收益 (Value)" },
      { sym: "αᵢ", meaning: "截距项（定价误差）" },
      { sym: "εᵢ", meaning: "残差项" },
    ],
    keyInsight: "规模效应和价值效应是独立于市场风险的系统性定价因子",
  },
  {
    id: "bs",
    name: "Black-Scholes",
    fullName: "Black-Scholes 期权定价公式",
    formula: "C = S₀N(d₁) − Ke⁻ʳᵀN(d₂)",
    description:
      "Black & Scholes (1973) 推导出欧式期权的封闭解，开创了衍生品定价的新纪元，获 1997 年诺贝尔经济学奖。",
    variables: [
      { sym: "C", meaning: "欧式看涨期权价格" },
      { sym: "S₀", meaning: "标的资产当前价格" },
      { sym: "K", meaning: "行权价格" },
      { sym: "N(·)", meaning: "标准正态累积分布函数" },
    ],
    keyInsight: "通过连续对冲构造无风险组合，推导出不依赖风险偏好的定价公式",
  },
  {
    id: "garch",
    name: "GARCH(1,1)",
    fullName: "广义自回归条件异方差模型",
    formula: "σ²ₜ = ω + α ε²ₜ₋₁ + β σ²ₜ₋₁",
    description:
      "Bollerslev (1986) 提出，捕捉金融时间序列的波动聚集效应，是风险管理和期权定价中最常用的波动率模型。",
    variables: [
      { sym: "σ²ₜ", meaning: "t 期条件方差" },
      { sym: "ω", meaning: "常数项（长期方差相关）" },
      { sym: "α", meaning: "ARCH 项系数（冲击反应）" },
      { sym: "β", meaning: "GARCH 项系数（波动持续性）" },
    ],
    keyInsight: "α + β 接近 1 表明波动率具有高度持续性（integrated GARCH）",
  },
  {
    id: "markowitz",
    name: "Markowitz",
    fullName: "均值-方差投资组合理论",
    formula: "min ½w'Σw   s.t.  w'μ = μ₀,  w'𝟏 = 1",
    description:
      "Markowitz (1952) 现代投资组合理论的奠基之作。通过求解二次规划，在给定收益下最小化方差，绘制有效前沿。获 1990 年诺贝尔经济学奖。",
    variables: [
      { sym: "w", meaning: "资产权重向量" },
      { sym: "Σ", meaning: "资产收益协方差矩阵" },
      { sym: "μ", meaning: "预期收益向量" },
      { sym: "μ₀", meaning: "目标组合收益率" },
    ],
    keyInsight: "分散化能在不降低预期收益的前提下显著降低组合风险",
  },
  {
    id: "vasicek",
    name: "Vasicek",
    fullName: "Vasicek 短期利率模型",
    formula: "drₜ = κ(θ − rₜ)dt + σ dWₜ",
    description:
      "Vasicek (1977) 首个均值回复短期利率模型。利率以速度 κ 向长期均值 θ 回归，但允许出现负利率，适合解析定价。",
    variables: [
      { sym: "κ", meaning: "均值回复速度" },
      { sym: "θ", meaning: "长期利率均值" },
      { sym: "σ", meaning: "瞬时波动率" },
      { sym: "Wₜ", meaning: "标准布朗运动" },
    ],
    keyInsight: "利率呈正态分布，零息债券价格有 affine 解析解",
  },
  {
    id: "cir",
    name: "CIR",
    fullName: "Cox-Ingersoll-Ross 利率模型",
    formula: "drₜ = κ(θ − rₜ)dt + σ √rₜ dWₜ",
    description:
      "Cox, Ingersoll & Ross (1985) 在 Vasicek 基础上引入 √r 扩散项，确保利率非负（Feller 条件 2κθ ≥ σ²）。",
    variables: [
      { sym: "κ, θ", meaning: "均值回复速度与长期均值" },
      { sym: "σ √rₜ", meaning: "状态相关波动率" },
      { sym: "2κθ ≥ σ²", meaning: "Feller 条件，保证 r > 0" },
    ],
    keyInsight: "利率服从非中心卡方分布，永不为负，仍保留 affine 结构",
  },
  {
    id: "mc",
    name: "Monte Carlo",
    fullName: "蒙特卡洛期权定价",
    formula: "Ĉ = e⁻ʳᵀ · (1/N) Σ payoff(Sᵢᵀ)",
    description:
      "Boyle (1977) 提出。在风险中性测度下模拟资产路径并贴现期望收益，适用于路径依赖、多资产、高维等解析定价无法处理的衍生品。",
    variables: [
      { sym: "N", meaning: "模拟路径数" },
      { sym: "Sᵢᵀ", meaning: "第 i 条路径在 T 时刻的价格" },
      { sym: "payoff", meaning: "期权到期收益函数" },
      { sym: "e⁻ʳᵀ", meaning: "无风险贴现因子" },
    ],
    keyInsight: "收敛速度 O(1/√N)，与维度无关——这是 MC 优于网格法的根本原因",
  },
];

const ModelShowcase = () => {
  const [active, setActive] = useState(0);
  const model = models[active];

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background pointer-events-none" />
      <div className="container relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            Classic Models
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            经典模型详解
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-foreground/65 leading-relaxed">
            用一张模型卡片同时呈现公式、变量解释、历史脉络与核心洞见，帮助你快速判断模型适用场景和边界条件。
          </p>
        </div>

        {/* Model tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {models.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActive(i)}
              className={`px-5 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 ${
                active === i
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Model detail */}
        <div key={model.id} className="max-w-4xl mx-auto animate-fade-in-up">
          <div className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <p className="text-xs font-mono text-muted-foreground">
                {model.fullName}
              </p>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80 border border-gold/25 rounded-full px-2 py-0.5">
                Model Card
              </span>
            </div>

            {/* Formula */}
            <div className="my-8 py-6 px-8 rounded-xl bg-secondary/50 border border-border text-center">
              <p className="text-2xl md:text-3xl font-mono text-gold tracking-wide">
                {model.formula}
              </p>
            </div>

            <p className="text-secondary-foreground leading-relaxed mb-8">
              {model.description}
            </p>

            {/* Variables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {model.variables.map((v) => (
                <div
                  key={v.sym}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40"
                >
                  <span className="font-mono text-sm text-gold whitespace-nowrap min-w-[60px]">
                    {v.sym}
                  </span>
                  <span className="text-sm text-secondary-foreground">
                    {v.meaning}
                  </span>
                </div>
              ))}
            </div>

            {/* Key insight */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-gold/20 bg-gold/[0.03]">
              <span className="text-gold text-lg mt-0.5">💡</span>
              <div>
                <p className="text-xs font-mono text-gold mb-1">核心洞见</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {model.keyInsight}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModelShowcase;
