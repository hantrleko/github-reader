import { motion } from "framer-motion";
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
];

const ModelShowcase = () => {
  const [active, setActive] = useState(0);
  const model = models[active];

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background pointer-events-none" />
      <div className="container relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            Classic Models
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            经典模型详解
          </h2>
        </motion.div>

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
        <motion.div
          key={model.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold">
            <p className="text-xs font-mono text-muted-foreground mb-2">
              {model.fullName}
            </p>

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
        </motion.div>
      </div>
    </section>
  );
};

export default ModelShowcase;
