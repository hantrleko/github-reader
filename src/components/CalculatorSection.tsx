import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface ParamConfig {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const capmParams: ParamConfig[] = [
  { key: "rf", label: "无风险利率 Rᶠ", shortLabel: "Rᶠ", unit: "%", min: 0, max: 15, step: 0.1, defaultValue: 3 },
  { key: "beta", label: "Beta 系数 βᵢ", shortLabel: "β", unit: "", min: -1, max: 3, step: 0.05, defaultValue: 1.2 },
  { key: "rm", label: "市场预期收益率 E(Rₘ)", shortLabel: "E(Rₘ)", unit: "%", min: 0, max: 30, step: 0.1, defaultValue: 10 },
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

function bsCall(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return Math.max(s - k * Math.exp(-r * t), 0);
  const d1 = (Math.log(s / k) + (r + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  return s * normCdf(d1) - k * Math.exp(-r * t) * normCdf(d2);
}

function bsPut(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return Math.max(k * Math.exp(-r * t) - s, 0);
  const d1 = (Math.log(s / k) + (r + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  return k * Math.exp(-r * t) * normCdf(-d2) - s * normCdf(-d1);
}

const bsParams: ParamConfig[] = [
  { key: "s", label: "标的价格 S₀", shortLabel: "S₀", unit: "", min: 1, max: 500, step: 1, defaultValue: 100 },
  { key: "k", label: "行权价格 K", shortLabel: "K", unit: "", min: 1, max: 500, step: 1, defaultValue: 100 },
  { key: "r", label: "无风险利率 r", shortLabel: "r", unit: "%", min: 0, max: 15, step: 0.1, defaultValue: 5 },
  { key: "sigma", label: "波动率 σ", shortLabel: "σ", unit: "%", min: 1, max: 100, step: 0.5, defaultValue: 20 },
  { key: "t", label: "到期时间 T", shortLabel: "T", unit: "年", min: 0.01, max: 5, step: 0.01, defaultValue: 1 },
];

const sharpeParams: ParamConfig[] = [
  { key: "rp", label: "组合收益率 Rₚ", shortLabel: "Rₚ", unit: "%", min: -20, max: 50, step: 0.1, defaultValue: 12 },
  { key: "rf", label: "无风险利率 Rᶠ", shortLabel: "Rᶠ", unit: "%", min: 0, max: 15, step: 0.1, defaultValue: 3 },
  { key: "sigmap", label: "组合标准差 σₚ", shortLabel: "σₚ", unit: "%", min: 0.1, max: 60, step: 0.1, defaultValue: 15 },
];

type CalcId = "capm" | "bs" | "sharpe";

const calculators: { id: CalcId; name: string; formula: string }[] = [
  { id: "capm", name: "CAPM", formula: "E(Rᵢ) = Rᶠ + βᵢ[E(Rₘ) − Rᶠ]" },
  { id: "bs", name: "Black-Scholes", formula: "C = S₀N(d₁) − Ke⁻ʳᵀN(d₂)" },
  { id: "sharpe", name: "Sharpe Ratio", formula: "SR = (Rₚ − Rᶠ) / σₚ" },
];

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_GRID = "hsl(220, 12%, 18%)";
const CHART_TEXT = "hsl(220, 10%, 50%)";

function generateSensitivityData(
  active: CalcId,
  values: Record<string, number>,
  sweepKey: string,
  params: ParamConfig[]
) {
  const param = params.find((p) => p.key === sweepKey)!;
  const steps = 60;
  const range = param.max - param.min;
  const data: Record<string, number>[] = [];

  for (let i = 0; i <= steps; i++) {
    const xVal = param.min + (range * i) / steps;
    const v = { ...values, [sweepKey]: xVal };
    const point: Record<string, number> = { x: parseFloat(xVal.toFixed(4)) };

    if (active === "capm") {
      point.result = v.rf + v.beta * (v.rm - v.rf);
    } else if (active === "bs") {
      const r = v.r / 100, sigma = v.sigma / 100;
      point.call = bsCall(v.s, v.k, r, sigma, v.t);
      point.put = bsPut(v.s, v.k, r, sigma, v.t);
    } else {
      point.result = (v.rp - v.rf) / v.sigmap;
    }
    data.push(point);
  }
  return data;
}

const CustomTooltip = ({ active: isActive, payload, label, unit }: any) => {
  if (!isActive || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-card border border-border px-3 py-2 shadow-lg">
      <p className="text-xs font-mono text-muted-foreground mb-1">
        {label}{unit ? ` ${unit}` : ""}
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(4) : p.value}
        </p>
      ))}
    </div>
  );
};

const CalculatorSection = () => {
  const [active, setActive] = useState<CalcId>("capm");
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    [...capmParams, ...bsParams, ...sharpeParams].forEach((p) => {
      init[p.key] = p.defaultValue;
    });
    return init;
  });

  const params =
    active === "capm" ? capmParams : active === "bs" ? bsParams : sharpeParams;

  const [sweepKey, setSweepKey] = useState<string>(params[0].key);
  const currentSweepValid = params.some((p) => p.key === sweepKey);
  const effectiveSweep = currentSweepValid ? sweepKey : params[0].key;

  const setVal = (key: string, v: number) =>
    setValues((prev) => ({ ...prev, [key]: v }));

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
      const r = values.r / 100, sigma = values.sigma / 100;
      const call = bsCall(values.s, values.k, r, sigma, values.t);
      const put = bsPut(values.s, values.k, r, sigma, values.t);
      const d1 = (Math.log(values.s / values.k) + (r + (sigma * sigma) / 2) * values.t) / (sigma * Math.sqrt(values.t));
      const d2 = d1 - sigma * Math.sqrt(values.t);
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

  const chartData = useMemo(
    () => generateSensitivityData(active, values, effectiveSweep, params),
    [active, values, effectiveSweep, params]
  );

  const sweepParam = params.find((p) => p.key === effectiveSweep)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
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
              onClick={() => {
                setActive(c.id);
                const p = c.id === "capm" ? capmParams : c.id === "bs" ? bsParams : sharpeParams;
                setSweepKey(p[0].key);
              }}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Params */}
            <div className="space-y-5">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">参数设置</p>
              {params.map((p) => (
                <div key={p.key}>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-sm text-secondary-foreground font-medium">
                      {p.label}
                    </label>
                    <span className="text-sm font-mono text-gold">
                      {values[p.key]}{p.unit && ` ${p.unit}`}
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

            {/* Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">敏感性分析</p>
                <div className="flex gap-1.5">
                  {params.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setSweepKey(p.key)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all ${
                        effectiveSweep === p.key
                          ? "bg-gold/20 text-gold border border-gold/30"
                          : "bg-secondary text-muted-foreground hover:text-secondary-foreground"
                      }`}
                    >
                      {p.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis
                      dataKey="x"
                      stroke={CHART_TEXT}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      label={{
                        value: `${sweepParam.shortLabel}${sweepParam.unit ? ` (${sweepParam.unit})` : ""}`,
                        position: "insideBottom",
                        offset: -2,
                        style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" },
                      }}
                    />
                    <YAxis
                      stroke={CHART_TEXT}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip unit={sweepParam.unit} />} />
                    <ReferenceLine
                      x={parseFloat(values[effectiveSweep].toFixed(4))}
                      stroke={CHART_GOLD}
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                    {active === "bs" ? (
                      <>
                        <Line
                          type="monotone"
                          dataKey="call"
                          name="Call"
                          stroke={CHART_GOLD}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: CHART_GOLD }}
                        />
                        <Line
                          type="monotone"
                          dataKey="put"
                          name="Put"
                          stroke={CHART_TEAL}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: CHART_TEAL }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                        />
                      </>
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="result"
                        name={active === "capm" ? "E(Rᵢ) %" : "Sharpe Ratio"}
                        stroke={CHART_GOLD}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: CHART_GOLD }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                虚线标注当前参数值 · 拖动滑块实时更新
              </p>
            </div>
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
