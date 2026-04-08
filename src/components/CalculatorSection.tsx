import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface ParamConfig {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const capmParams: ParamConfig[] = [
  { key: "rf", label: "无风险利率 Rᶠ", unit: "%", min: 0, max: 15, step: 0.1, defaultValue: 3 },
  { key: "beta", label: "Beta 系数 βᵢ", unit: "", min: -1, max: 3, step: 0.05, defaultValue: 1.2 },
  { key: "rm", label: "市场预期收益率 E(Rₘ)", unit: "%", min: 0, max: 30, step: 0.1, defaultValue: 10 },
];

function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normCdf(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.SQRT2));
}

const bsParams: ParamConfig[] = [
  { key: "s", label: "标的价格 S₀", unit: "", min: 1, max: 500, step: 1, defaultValue: 100 },
  { key: "k", label: "行权价格 K", unit: "", min: 1, max: 500, step: 1, defaultValue: 100 },
  { key: "r", label: "无风险利率 r", unit: "%", min: 0, max: 15, step: 0.1, defaultValue: 5 },
  { key: "sigma", label: "波动率 σ", unit: "%", min: 1, max: 100, step: 0.5, defaultValue: 20 },
  { key: "t", label: "到期时间 T", unit: "年", min: 0.01, max: 5, step: 0.01, defaultValue: 1 },
];

const sharpeParams: ParamConfig[] = [
  { key: "rp", label: "组合收益率 Rₚ", unit: "%", min: -20, max: 50, step: 0.1, defaultValue: 12 },
  { key: "rf", label: "无风险利率 Rᶠ", unit: "%", min: 0, max: 15, step: 0.1, defaultValue: 3 },
  { key: "sigmap", label: "组合标准差 σₚ", unit: "%", min: 0.1, max: 60, step: 0.1, defaultValue: 15 },
];

type CalcId = "capm" | "bs" | "sharpe";

const calculators: { id: CalcId; name: string; formula: string }[] = [
  { id: "capm", name: "CAPM", formula: "E(Rᵢ) = Rᶠ + βᵢ[E(Rₘ) − Rᶠ]" },
  { id: "bs", name: "Black-Scholes", formula: "C = S₀N(d₁) − Ke⁻ʳᵀN(d₂)" },
  { id: "sharpe", name: "Sharpe Ratio", formula: "SR = (Rₚ − Rᶠ) / σₚ" },
];

const CalculatorSection = () => {
  const [active, setActive] = useState<CalcId>("capm");
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    [...capmParams, ...bsParams, ...sharpeParams].forEach((p) => {
      init[p.key] = p.defaultValue;
    });
    return init;
  });

  const setVal = (key: string, v: number) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const params =
    active === "capm" ? capmParams : active === "bs" ? bsParams : sharpeParams;

  const result = useMemo(() => {
    if (active === "capm") {
      const er = values.rf + values.beta * (values.rm - values.rf);
      return {
        label: "预期收益率 E(Rᵢ)",
        value: `${er.toFixed(2)}%`,
        detail: `风险溢价 = ${(values.beta * (values.rm - values.rf)).toFixed(2)}%`,
      };
    }
    if (active === "bs") {
      const { s, k, r: rPct, sigma: sigmaPct, t } = values;
      const r = rPct / 100;
      const sigma = sigmaPct / 100;
      const d1 =
        (Math.log(s / k) + (r + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
      const d2 = d1 - sigma * Math.sqrt(t);
      const call = s * normCdf(d1) - k * Math.exp(-r * t) * normCdf(d2);
      const put = k * Math.exp(-r * t) * normCdf(-d2) - s * normCdf(-d1);
      return {
        label: "期权价格",
        value: `Call = ${call.toFixed(4)}  |  Put = ${put.toFixed(4)}`,
        detail: `d₁ = ${d1.toFixed(4)},  d₂ = ${d2.toFixed(4)}`,
      };
    }
    const sr = (values.rp - values.rf) / values.sigmap;
    return {
      label: "夏普比率",
      value: sr.toFixed(4),
      detail: `超额收益 = ${(values.rp - values.rf).toFixed(2)}%`,
    };
  }, [active, values]);

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-4xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            Interactive Tools
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            模型计算器
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {calculators.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 ${
                active === c.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold"
        >
          {/* Formula */}
          <div className="text-center mb-8 py-4 px-6 rounded-xl bg-secondary/50 border border-border">
            <p className="text-xl md:text-2xl font-mono text-gold tracking-wide">
              {calculators.find((c) => c.id === active)!.formula}
            </p>
          </div>

          {/* Params */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {params.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm text-secondary-foreground font-medium">
                    {p.label}
                  </label>
                  <span className="text-sm font-mono text-gold">
                    {values[p.key]}
                    {p.unit && ` ${p.unit}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={values[p.key]}
                  onChange={(e) => setVal(p.key, parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>{p.min}</span>
                  <span>{p.max}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Result */}
          <div className="rounded-xl border border-gold/20 bg-gold/[0.03] p-6 text-center">
            <p className="text-xs font-mono text-gold mb-2 uppercase tracking-wider">
              {result.label}
            </p>
            <p className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-2">
              {result.value}
            </p>
            <p className="text-sm text-muted-foreground font-mono">
              {result.detail}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CalculatorSection;
