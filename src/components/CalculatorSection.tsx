import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import PresetButtons, { Preset } from "./PresetButtons";
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
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
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

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function normInv(p: number): number {
  // Rational approximation for the inverse normal CDF
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 0.5) return -normInv(1 - p);
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

function bsD1(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return 0;
  return (Math.log(s / k) + (r + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
}

function bsCall(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return Math.max(s - k * Math.exp(-r * t), 0);
  const d1 = bsD1(s, k, r, sigma, t);
  const d2 = d1 - sigma * Math.sqrt(t);
  return s * normCdf(d1) - k * Math.exp(-r * t) * normCdf(d2);
}

function bsPut(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return Math.max(k * Math.exp(-r * t) - s, 0);
  const d1 = bsD1(s, k, r, sigma, t);
  const d2 = d1 - sigma * Math.sqrt(t);
  return k * Math.exp(-r * t) * normCdf(-d2) - s * normCdf(-d1);
}

// Greeks calculations
function bsGreeks(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return { callDelta: s > k ? 1 : 0, putDelta: s > k ? 0 : -1, gamma: 0, callTheta: 0, putTheta: 0, vega: 0, callRho: 0, putRho: 0 };
  const d1 = bsD1(s, k, r, sigma, t);
  const d2 = d1 - sigma * Math.sqrt(t);
  const nd1 = normPdf(d1);

  const callDelta = normCdf(d1);
  const putDelta = callDelta - 1;
  const gamma = nd1 / (s * sigma * Math.sqrt(t));
  const callTheta = (-(s * nd1 * sigma) / (2 * Math.sqrt(t)) - r * k * Math.exp(-r * t) * normCdf(d2)) / 365;
  const putTheta = (-(s * nd1 * sigma) / (2 * Math.sqrt(t)) + r * k * Math.exp(-r * t) * normCdf(-d2)) / 365;
  const vega = s * nd1 * Math.sqrt(t) / 100; // per 1% move
  const callRho = k * t * Math.exp(-r * t) * normCdf(d2) / 100;
  const putRho = -k * t * Math.exp(-r * t) * normCdf(-d2) / 100;

  return { callDelta, putDelta, gamma, callTheta, putTheta, vega, callRho, putRho };
}

function generateGreeksData(values: Record<string, number>) {
  const k = values.k, r = values.r / 100, sigma = values.sigma / 100, t = values.t;
  const sMin = Math.max(1, k * 0.5);
  const sMax = k * 1.5;
  const steps = 80;
  const data: { s: number; callDelta: number; putDelta: number; gamma: number; callTheta: number; putTheta: number; vega: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const s = sMin + (sMax - sMin) * i / steps;
    const g = bsGreeks(s, k, r, sigma, t);
    data.push({
      s: parseFloat(s.toFixed(1)),
      callDelta: parseFloat(g.callDelta.toFixed(4)),
      putDelta: parseFloat(g.putDelta.toFixed(4)),
      gamma: parseFloat(g.gamma.toFixed(6)),
      callTheta: parseFloat(g.callTheta.toFixed(4)),
      putTheta: parseFloat(g.putTheta.toFixed(4)),
      vega: parseFloat(g.vega.toFixed(4)),
    });
  }
  return data;
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

const varParams: ParamConfig[] = [
  { key: "portfolio", label: "组合价值 W", shortLabel: "W", unit: "万", min: 100, max: 10000, step: 100, defaultValue: 1000 },
  { key: "mu", label: "日均收益率 μ", shortLabel: "μ", unit: "%", min: -1, max: 1, step: 0.01, defaultValue: 0.04 },
  { key: "dailySigma", label: "日波动率 σ", shortLabel: "σ", unit: "%", min: 0.1, max: 10, step: 0.1, defaultValue: 1.5 },
  { key: "confidence", label: "置信水平", shortLabel: "α", unit: "%", min: 90, max: 99.9, step: 0.1, defaultValue: 99 },
  { key: "holdingDays", label: "持有期", shortLabel: "T", unit: "天", min: 1, max: 30, step: 1, defaultValue: 10 },
];

type CalcId = "capm" | "bs" | "sharpe" | "var";

const calculators: { id: CalcId; name: string; formula: string }[] = [
  { id: "capm", name: "CAPM", formula: "E(Rᵢ) = Rᶠ + βᵢ[E(Rₘ) − Rᶠ]" },
  { id: "bs", name: "Black-Scholes", formula: "C = S₀N(d₁) − Ke⁻ʳᵀN(d₂)" },
  { id: "sharpe", name: "Sharpe Ratio", formula: "SR = (Rₚ − Rᶠ) / σₚ" },
  { id: "var", name: "VaR / ES", formula: "VaR_α = W × |μ − z_α · σ| × √T" },
];

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_GRID = "hsl(220, 12%, 18%)";
const CHART_TEXT = "hsl(220, 10%, 50%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";

// Seeded pseudo-random for reproducibility
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMuller(rand: () => number): number {
  const u1 = rand();
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

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
    } else if (active === "sharpe") {
      point.result = (v.rp - v.rf) / v.sigmap;
    } else if (active === "var") {
      const mu = v.mu / 100;
      const sigma = v.dailySigma / 100;
      const T = v.holdingDays;
      const z = normInv(v.confidence / 100);
      const varPct = Math.abs(mu * T - z * sigma * Math.sqrt(T));
      point.var = v.portfolio * varPct;
      const esPct = Math.abs(mu * T - sigma * Math.sqrt(T) * normPdf(z) / (1 - v.confidence / 100));
      point.es = v.portfolio * esPct;
    }
    data.push(point);
  }
  return data;
}

// Generate Monte Carlo loss distribution for VaR visualization
function generateMCDistribution(values: Record<string, number>) {
  const mu = values.mu / 100;
  const sigma = values.dailySigma / 100;
  const T = values.holdingDays;
  const W = values.portfolio;
  const nSim = 10000;
  const rand = mulberry32(42);

  const losses: number[] = [];
  for (let i = 0; i < nSim; i++) {
    let cumReturn = 0;
    for (let d = 0; d < T; d++) {
      cumReturn += mu + sigma * boxMuller(rand);
    }
    losses.push(-cumReturn * W); // positive = loss
  }
  losses.sort((a, b) => a - b);

  // Build histogram
  const nBins = 50;
  const minL = losses[0];
  const maxL = losses[losses.length - 1];
  const binWidth = (maxL - minL) / nBins;
  const bins: { x: number; count: number; isVaR: boolean }[] = [];

  const confidence = values.confidence / 100;
  const varIdx = Math.floor(nSim * confidence);
  const mcVaR = losses[varIdx];
  // ES = average of losses beyond VaR
  let esSum = 0, esCount = 0;
  for (let i = varIdx; i < nSim; i++) {
    esSum += losses[i];
    esCount++;
  }
  const mcES = esCount > 0 ? esSum / esCount : mcVaR;

  for (let i = 0; i < nBins; i++) {
    const lo = minL + i * binWidth;
    const hi = lo + binWidth;
    const mid = (lo + hi) / 2;
    let count = 0;
    for (const l of losses) {
      if (l >= lo && l < hi) count++;
    }
    bins.push({ x: parseFloat(mid.toFixed(2)), count, isVaR: mid >= mcVaR });
  }

  return { bins, mcVaR, mcES };
}

// Generate historical simulation data (synthetic daily returns)
function generateHistSimData(values: Record<string, number>) {
  const mu = values.mu / 100;
  const sigma = values.dailySigma / 100;
  const T = values.holdingDays;
  const W = values.portfolio;
  const nDays = 500;
  const rand = mulberry32(123);

  const dailyReturns: number[] = [];
  for (let i = 0; i < nDays; i++) {
    const z = boxMuller(rand);
    dailyReturns.push(mu + sigma * z * (1 + 0.1 * Math.abs(z)));
  }

  const holdingReturns: number[] = [];
  for (let i = 0; i <= nDays - T; i++) {
    let cum = 0;
    for (let d = 0; d < T; d++) {
      cum += dailyReturns[i + d];
    }
    holdingReturns.push(-cum * W);
  }
  holdingReturns.sort((a, b) => a - b);

  const confidence = values.confidence / 100;
  const varIdx = Math.floor(holdingReturns.length * confidence);
  const histVaR = holdingReturns[Math.min(varIdx, holdingReturns.length - 1)];

  let esSum = 0, esCount = 0;
  for (let i = varIdx; i < holdingReturns.length; i++) {
    esSum += holdingReturns[i];
    esCount++;
  }
  const histES = esCount > 0 ? esSum / esCount : histVaR;

  return { histVaR, histES, nObs: holdingReturns.length };
}

// Chi-squared CDF approximation (1 degree of freedom) for Kupiec test
function chi2Cdf1(x: number): number {
  if (x <= 0) return 0;
  return 2 * normCdf(Math.sqrt(x)) - 1;
}

// Backtesting: generate daily P&L series & compare against VaR
function generateBacktestData(values: Record<string, number>) {
  const mu = values.mu / 100;
  const sigma = values.dailySigma / 100;
  const W = values.portfolio;
  const confidence = values.confidence / 100;
  const z = normInv(confidence);
  const nDays = 250; // 1 trading year
  const rand = mulberry32(777);

  // Daily parametric VaR (1-day holding)
  const dailyVaR = W * Math.abs(mu - z * sigma);

  const timeline: { day: number; pnl: number; var: number; exception: boolean }[] = [];
  let exceptions = 0;

  for (let i = 0; i < nDays; i++) {
    const zr = boxMuller(rand);
    // Add occasional fat-tail shocks for realism
    const shock = Math.random() < 0.03 ? 1.8 : 1.0;
    const dailyReturn = mu + sigma * zr * shock;
    const pnl = dailyReturn * W; // positive = gain, negative = loss
    const loss = -pnl;
    const isException = loss > dailyVaR;
    if (isException) exceptions++;
    timeline.push({
      day: i + 1,
      pnl: parseFloat(pnl.toFixed(2)),
      var: parseFloat((-dailyVaR).toFixed(2)), // show as negative line
      exception: isException,
    });
  }

  // Kupiec POF test
  const T = nDays;
  const x = exceptions;
  const p = 1 - confidence;
  const pHat = x / T;

  let kupiecLR = 0;
  if (x > 0 && x < T) {
    kupiecLR = 2 * (x * Math.log(pHat / p) + (T - x) * Math.log((1 - pHat) / (1 - p)));
  } else if (x === 0) {
    kupiecLR = 2 * T * Math.log(1 / (1 - p));
  } else {
    kupiecLR = 2 * T * Math.log(1 / p);
  }
  kupiecLR = Math.max(0, kupiecLR);
  const kupiecPValue = 1 - chi2Cdf1(kupiecLR);
  const kupiecReject = kupiecPValue < 0.05;

  // Christoffersen Independence Test
  // Count transitions: n00, n01, n10, n11
  let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
  for (let i = 1; i < nDays; i++) {
    const prev = timeline[i - 1].exception ? 1 : 0;
    const curr = timeline[i].exception ? 1 : 0;
    if (prev === 0 && curr === 0) n00++;
    else if (prev === 0 && curr === 1) n01++;
    else if (prev === 1 && curr === 0) n10++;
    else n11++;
  }

  // π₀₁ = P(exception | no exception yesterday)
  // π₁₁ = P(exception | exception yesterday)
  // π = P(exception) unconditional
  const pi01 = (n00 + n01) > 0 ? n01 / (n00 + n01) : 0;
  const pi11 = (n10 + n11) > 0 ? n11 / (n10 + n11) : 0;
  const piHat = (n01 + n11) / (T - 1);

  // LR_ind = 2 * [log L(π₀₁, π₁₁) - log L(π̂)]
  let lnL1 = 0; // unrestricted
  if (n00 > 0) lnL1 += n00 * Math.log(1 - pi01);
  if (n01 > 0) lnL1 += n01 * Math.log(pi01);
  if (n10 > 0) lnL1 += n10 * Math.log(1 - pi11);
  if (n11 > 0) lnL1 += n11 * Math.log(pi11);

  let lnL0 = 0; // restricted (independent)
  const totalPairs = n00 + n01 + n10 + n11;
  const nExc = n01 + n11;
  const nNoExc = n00 + n10;
  if (nNoExc > 0) lnL0 += nNoExc * Math.log(1 - piHat);
  if (nExc > 0) lnL0 += nExc * Math.log(piHat);

  let indLR = 2 * (lnL1 - lnL0);
  indLR = Math.max(0, isFinite(indLR) ? indLR : 0);
  const indPValue = 1 - chi2Cdf1(indLR);
  const indReject = indPValue < 0.05;

  // Conditional Coverage (CC) = Kupiec + Independence, LR_cc ~ χ²(2)
  const ccLR = kupiecLR + indLR;
  // χ²(2) CDF: 1 - e^(-x/2)
  const chi2Cdf2 = (xv: number) => xv <= 0 ? 0 : 1 - Math.exp(-xv / 2);
  const ccPValue = 1 - chi2Cdf2(ccLR);
  const ccReject = ccPValue < 0.05;

  // Basel traffic light
  const expectedExceptions = T * (1 - confidence);
  let trafficLight: "green" | "yellow" | "red";
  if (x <= Math.ceil(expectedExceptions + 1.5 * Math.sqrt(expectedExceptions * confidence))) {
    trafficLight = "green";
  } else if (x <= Math.ceil(expectedExceptions + 3 * Math.sqrt(expectedExceptions * confidence))) {
    trafficLight = "yellow";
  } else {
    trafficLight = "red";
  }
  if (Math.abs(confidence - 0.99) < 0.001) {
    if (x <= 4) trafficLight = "green";
    else if (x <= 9) trafficLight = "yellow";
    else trafficLight = "red";
  }

  return {
    timeline,
    exceptions,
    expectedExceptions,
    dailyVaR,
    kupiecLR, kupiecPValue, kupiecReject,
    indLR, indPValue, indReject,
    pi01, pi11,
    ccLR, ccPValue, ccReject,
    n00, n01, n10, n11,
    trafficLight,
    nDays,
  };
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

const VaRTooltip = ({ active: isActive, payload, label }: any) => {
  if (!isActive || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-card border border-border px-3 py-2 shadow-lg">
      <p className="text-xs font-mono text-muted-foreground mb-1">
        损失: {label} 万
      </p>
      <p className="text-sm font-mono text-foreground">
        频次: {payload[0]?.value}
      </p>
    </div>
  );
};

const CalculatorSection = () => {
  const [active, setActive] = useState<CalcId>("capm");
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    [...capmParams, ...bsParams, ...sharpeParams, ...varParams].forEach((p) => {
      init[p.key] = p.defaultValue;
    });
    return init;
  });

  const params =
    active === "capm" ? capmParams : active === "bs" ? bsParams : active === "sharpe" ? sharpeParams : varParams;

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
    if (active === "sharpe") {
      const sr = (values.rp - values.rf) / values.sigmap;
      return {
        label: "夏普比率",
        value: sr.toFixed(4),
        detail: `超额收益 = ${(values.rp - values.rf).toFixed(2)}%`,
      };
    }
    // VaR
    const mu = values.mu / 100;
    const sigma = values.dailySigma / 100;
    const T = values.holdingDays;
    const W = values.portfolio;
    const z = normInv(values.confidence / 100);

    // Parametric
    const paramVaR = W * Math.abs(mu * T - z * sigma * Math.sqrt(T));
    const paramES = W * Math.abs(mu * T - sigma * Math.sqrt(T) * normPdf(z) / (1 - values.confidence / 100));

    return {
      label: `${values.confidence}% VaR（参数法）`,
      value: `${paramVaR.toFixed(2)} 万`,
      detail: `ES = ${paramES.toFixed(2)} 万 · 持有期 ${T} 天 · 组合 ${W} 万`,
    };
  }, [active, values]);

  const chartData = useMemo(
    () => generateSensitivityData(active, values, effectiveSweep, params),
    [active, values, effectiveSweep, params]
  );

  // Greeks data for BS
  const greeksData = useMemo(() => {
    if (active !== "bs") return null;
    return generateGreeksData(values);
  }, [active, values]);

  const currentGreeks = useMemo(() => {
    if (active !== "bs") return null;
    return bsGreeks(values.s, values.k, values.r / 100, values.sigma / 100, values.t);
  }, [active, values]);

  // VaR-specific data
  const mcData = useMemo(() => {
    if (active !== "var") return null;
    return generateMCDistribution(values);
  }, [active, values]);

  const histData = useMemo(() => {
    if (active !== "var") return null;
    return generateHistSimData(values);
  }, [active, values]);

  const backtestData = useMemo(() => {
    if (active !== "var") return null;
    return generateBacktestData(values);
  }, [active, values]);

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
                const p = c.id === "capm" ? capmParams : c.id === "bs" ? bsParams : c.id === "sharpe" ? sharpeParams : varParams;
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
              {active !== "var" ? (
                <>
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
                            <Line type="monotone" dataKey="call" name="Call" stroke={CHART_GOLD} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART_GOLD }} />
                            <Line type="monotone" dataKey="put" name="Put" stroke={CHART_TEAL} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART_TEAL }} />
                            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
                          </>
                        ) : (
                          <Line type="monotone" dataKey="result" name={active === "capm" ? "E(Rᵢ) %" : "Sharpe Ratio"} stroke={CHART_GOLD} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART_GOLD }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                    虚线标注当前参数值 · 拖动滑块实时更新
                  </p>
                </>
              ) : (
                /* VaR: Monte Carlo Loss Distribution Histogram */
                <>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                    蒙特卡洛损失分布（10,000 次模拟）
                  </p>
                  <div className="rounded-xl bg-secondary/30 border border-border p-4">
                    {mcData && (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={mcData.bins} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis
                            dataKey="x"
                            stroke={CHART_TEXT}
                            tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                            label={{
                              value: "损失 (万)",
                              position: "insideBottom",
                              offset: -2,
                              style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" },
                            }}
                          />
                          <YAxis
                            stroke={CHART_TEXT}
                            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                            width={40}
                          />
                          <Tooltip content={<VaRTooltip />} />
                          <ReferenceLine
                            x={parseFloat(mcData.mcVaR.toFixed(2))}
                            stroke={CHART_RED}
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            label={{
                              value: "VaR",
                              position: "top",
                              style: { fontSize: 10, fill: CHART_RED, fontFamily: "var(--font-mono)", fontWeight: 600 },
                            }}
                          />
                          <ReferenceLine
                            x={parseFloat(mcData.mcES.toFixed(2))}
                            stroke={CHART_GOLD}
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            label={{
                              value: "ES",
                              position: "top",
                              style: { fontSize: 10, fill: CHART_GOLD, fontFamily: "var(--font-mono)", fontWeight: 600 },
                            }}
                          />
                          <Bar dataKey="count" name="频次">
                            {mcData.bins.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.isVaR ? CHART_RED : CHART_TEAL}
                                fillOpacity={entry.isVaR ? 0.8 : 0.5}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                    红色区域为超过 VaR 的尾部损失 · 红线 = VaR · 金线 = ES
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Greeks Charts - BS only */}
          {active === "bs" && greeksData && currentGreeks && (
            <div className="mb-8">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
                Greeks 敏感性分析
              </p>

              {/* Current Greeks values */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Delta (Call)", value: currentGreeks.callDelta.toFixed(4), sub: `Put: ${currentGreeks.putDelta.toFixed(4)}`, color: "text-gold", border: "border-gold/20", bg: "bg-gold/[0.03]" },
                  { label: "Gamma", value: currentGreeks.gamma.toFixed(6), sub: "∂²C/∂S²", color: "text-teal-400", border: "border-teal-400/20", bg: "bg-teal-400/[0.03]" },
                  { label: "Theta (Call)", value: currentGreeks.callTheta.toFixed(4), sub: `Put: ${currentGreeks.putTheta.toFixed(4)}`, color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/[0.03]" },
                  { label: "Vega", value: currentGreeks.vega.toFixed(4), sub: "per 1% σ", color: "text-blue-400", border: "border-blue-400/20", bg: "bg-blue-400/[0.03]" },
                ].map((g) => (
                  <div key={g.label} className={`rounded-xl border ${g.border} ${g.bg} p-4 text-center`}>
                    <p className={`text-[10px] font-mono ${g.color} mb-1 uppercase tracking-wider`}>{g.label}</p>
                    <p className="text-lg font-mono font-bold text-foreground">{g.value}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{g.sub}</p>
                  </div>
                ))}
              </div>

              {/* 2x2 Greeks charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Delta */}
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <p className="text-[11px] font-mono text-gold mb-2">Delta (Δ) — ∂C/∂S</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={greeksData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="s" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                      <ReferenceLine x={values.s} stroke={CHART_GOLD} strokeDasharray="4 4" strokeOpacity={0.4} />
                      <ReferenceLine x={values.k} stroke={CHART_TEXT} strokeDasharray="2 4" strokeOpacity={0.3} />
                      <Line type="monotone" dataKey="callDelta" name="Call Δ" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="putDelta" name="Put Δ" stroke={CHART_TEAL} strokeWidth={2} dot={false} />
                      <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gamma */}
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <p className="text-[11px] font-mono text-teal-400 mb-2">Gamma (Γ) — ∂²C/∂S²</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={greeksData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="s" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                      <ReferenceLine x={values.s} stroke={CHART_GOLD} strokeDasharray="4 4" strokeOpacity={0.4} />
                      <ReferenceLine x={values.k} stroke={CHART_TEXT} strokeDasharray="2 4" strokeOpacity={0.3} />
                      <Area type="monotone" dataKey="gamma" name="Γ" stroke={CHART_TEAL} fill={CHART_TEAL} fillOpacity={0.15} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Theta */}
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <p className="text-[11px] font-mono text-red-400 mb-2">Theta (Θ) — ∂C/∂t（每日）</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={greeksData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="s" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                      <ReferenceLine x={values.s} stroke={CHART_GOLD} strokeDasharray="4 4" strokeOpacity={0.4} />
                      <ReferenceLine x={values.k} stroke={CHART_TEXT} strokeDasharray="2 4" strokeOpacity={0.3} />
                      <ReferenceLine y={0} stroke={CHART_TEXT} strokeOpacity={0.2} />
                      <Line type="monotone" dataKey="callTheta" name="Call Θ" stroke={CHART_RED} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="putTheta" name="Put Θ" stroke="hsl(30, 80%, 50%)" strokeWidth={2} dot={false} />
                      <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Vega */}
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <p className="text-[11px] font-mono text-blue-400 mb-2">Vega (ν) — ∂C/∂σ（per 1%）</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={greeksData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="s" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                      <ReferenceLine x={values.s} stroke={CHART_GOLD} strokeDasharray="4 4" strokeOpacity={0.4} />
                      <ReferenceLine x={values.k} stroke={CHART_TEXT} strokeDasharray="2 4" strokeOpacity={0.3} />
                      <Area type="monotone" dataKey="vega" name="Vega" stroke={CHART_BLUE} fill={CHART_BLUE} fillOpacity={0.15} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                金色虚线 = 当前 S₀ · 灰色虚线 = 行权价 K · 拖动滑块实时更新
              </p>
            </div>
          )}

          {active === "var" && mcData && histData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {(() => {
                const mu = values.mu / 100;
                const sigma = values.dailySigma / 100;
                const T = values.holdingDays;
                const W = values.portfolio;
                const z = normInv(values.confidence / 100);
                const paramVaR = W * Math.abs(mu * T - z * sigma * Math.sqrt(T));
                const paramES = W * Math.abs(mu * T - sigma * Math.sqrt(T) * normPdf(z) / (1 - values.confidence / 100));

                const methods = [
                  {
                    name: "参数法",
                    desc: "假设正态分布",
                    var: paramVaR,
                    es: paramES,
                    color: "text-gold",
                    borderColor: "border-gold/20",
                    bgColor: "bg-gold/[0.03]",
                  },
                  {
                    name: "历史模拟法",
                    desc: `${histData.nObs} 个滚动窗口`,
                    var: histData.histVaR,
                    es: histData.histES,
                    color: "text-teal-400",
                    borderColor: "border-teal-400/20",
                    bgColor: "bg-teal-400/[0.03]",
                  },
                  {
                    name: "蒙特卡洛法",
                    desc: "10,000 次模拟",
                    var: mcData.mcVaR,
                    es: mcData.mcES,
                    color: "text-red-400",
                    borderColor: "border-red-400/20",
                    bgColor: "bg-red-400/[0.03]",
                  },
                ];

                return methods.map((m) => (
                  <div
                    key={m.name}
                    className={`rounded-xl border ${m.borderColor} ${m.bgColor} p-5`}
                  >
                    <p className={`text-xs font-mono ${m.color} mb-1 uppercase tracking-wider`}>
                      {m.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mb-3">
                      {m.desc}
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-mono">VaR</p>
                        <p className="text-xl font-mono font-bold text-foreground">
                          {m.var.toFixed(2)} <span className="text-sm text-muted-foreground">万</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-mono">ES (CVaR)</p>
                        <p className="text-lg font-mono font-semibold text-foreground">
                          {m.es.toFixed(2)} <span className="text-sm text-muted-foreground">万</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Sensitivity chart for VaR */}
          {active === "var" && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  VaR / ES 敏感性分析
                </p>
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
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
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
                      width={55}
                    />
                    <Tooltip content={<CustomTooltip unit={sweepParam.unit} />} />
                    <ReferenceLine
                      x={parseFloat(values[effectiveSweep].toFixed(4))}
                      stroke={CHART_GOLD}
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                    <Area type="monotone" dataKey="es" name="ES (万)" stroke={CHART_RED} fill={CHART_RED} fillOpacity={0.1} strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="var" name="VaR (万)" stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.15} strokeWidth={2} dot={false} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Backtesting Section */}
          {active === "var" && backtestData && (
            <div className="mb-8">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
                回测检验 · Backtesting（250 交易日）
              </p>

              {/* Traffic Light + Kupiec Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Traffic Light */}
                <div className="rounded-xl border border-border bg-secondary/30 p-5 flex flex-col items-center justify-center">
                  <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
                    Basel 交通灯
                  </p>
                  <div className="flex gap-3 mb-3">
                    {(["green", "yellow", "red"] as const).map((color) => {
                      const isActive = backtestData.trafficLight === color;
                      const bgMap = { green: "bg-emerald-500", yellow: "bg-yellow-400", red: "bg-red-500" };
                      return (
                        <div
                          key={color}
                          className={`w-10 h-10 rounded-full transition-all duration-500 ${bgMap[color]} ${
                            isActive ? "opacity-100 shadow-lg scale-110" : "opacity-20"
                          }`}
                          style={isActive ? { boxShadow: `0 0 20px ${color === "green" ? "rgba(16,185,129,0.5)" : color === "yellow" ? "rgba(250,204,21,0.5)" : "rgba(239,68,68,0.5)"}` } : {}}
                        />
                      );
                    })}
                  </div>
                  <p className={`text-sm font-mono font-bold ${
                    backtestData.trafficLight === "green" ? "text-emerald-400" :
                    backtestData.trafficLight === "yellow" ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {backtestData.trafficLight === "green" ? "绿区 · 模型合格" :
                     backtestData.trafficLight === "yellow" ? "黄区 · 需关注" : "红区 · 模型失效"}
                  </p>
                </div>

                {/* Exception Count */}
                <div className="rounded-xl border border-border bg-secondary/30 p-5 text-center">
                  <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
                    突破次数
                  </p>
                  <p className="text-3xl font-mono font-bold text-foreground">
                    {backtestData.exceptions}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    预期: {backtestData.expectedExceptions.toFixed(1)} 次
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    突破率: {((backtestData.exceptions / backtestData.nDays) * 100).toFixed(2)}%
                  </p>
                </div>

                {/* Kupiec POF Test */}
                <div className={`rounded-xl border p-5 text-center ${
                  backtestData.kupiecReject ? "border-red-400/20 bg-red-400/[0.03]" : "border-emerald-400/20 bg-emerald-400/[0.03]"
                }`}>
                  <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
                    Kupiec POF 检验
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mb-1">H₀: p = p̂（覆盖率正确）</p>
                  <p className="text-lg font-mono font-bold text-foreground">
                    LR<sub>uc</sub> = {backtestData.kupiecLR.toFixed(3)}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground">
                    p = {backtestData.kupiecPValue.toFixed(4)} · χ²(1)
                  </p>
                  <p className={`text-xs font-mono mt-1 font-bold ${backtestData.kupiecReject ? "text-red-400" : "text-emerald-400"}`}>
                    {backtestData.kupiecReject ? "拒绝 · 覆盖率不准确" : "通过 · 覆盖率可接受"}
                  </p>
                </div>
              </div>

              {/* Christoffersen Tests Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Independence Test */}
                <div className={`rounded-xl border p-5 text-center ${
                  backtestData.indReject ? "border-red-400/20 bg-red-400/[0.03]" : "border-emerald-400/20 bg-emerald-400/[0.03]"
                }`}>
                  <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
                    独立性检验 (LR<sub>ind</sub>)
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mb-1">H₀: 突破间相互独立</p>
                  <p className="text-lg font-mono font-bold text-foreground">
                    LR<sub>ind</sub> = {backtestData.indLR.toFixed(3)}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground">
                    p = {backtestData.indPValue.toFixed(4)} · χ²(1)
                  </p>
                  <p className={`text-xs font-mono mt-1 font-bold ${backtestData.indReject ? "text-red-400" : "text-emerald-400"}`}>
                    {backtestData.indReject ? "拒绝 · 存在聚集效应" : "通过 · 突破独立"}
                  </p>
                </div>

                {/* Conditional Coverage Test */}
                <div className={`rounded-xl border p-5 text-center ${
                  backtestData.ccReject ? "border-red-400/20 bg-red-400/[0.03]" : "border-emerald-400/20 bg-emerald-400/[0.03]"
                }`}>
                  <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
                    条件覆盖检验 (LR<sub>cc</sub>)
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mb-1">LR<sub>cc</sub> = LR<sub>uc</sub> + LR<sub>ind</sub></p>
                  <p className="text-lg font-mono font-bold text-foreground">
                    LR<sub>cc</sub> = {backtestData.ccLR.toFixed(3)}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground">
                    p = {backtestData.ccPValue.toFixed(4)} · χ²(2)
                  </p>
                  <p className={`text-xs font-mono mt-1 font-bold ${backtestData.ccReject ? "text-red-400" : "text-emerald-400"}`}>
                    {backtestData.ccReject ? "拒绝 · 模型综合不合格" : "通过 · 模型综合合格"}
                  </p>
                </div>

                {/* Transition Matrix */}
                <div className="rounded-xl border border-border bg-secondary/30 p-5">
                  <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider text-center">
                    转移矩阵
                  </p>
                  <table className="w-full text-center font-mono text-sm">
                    <thead>
                      <tr>
                        <th className="text-[10px] text-muted-foreground p-1"></th>
                        <th className="text-[10px] text-muted-foreground p-1">→ 正常</th>
                        <th className="text-[10px] text-muted-foreground p-1">→ 突破</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-[10px] text-muted-foreground p-1">正常 →</td>
                        <td className="text-foreground p-1 font-bold">{backtestData.n00}</td>
                        <td className="text-gold p-1 font-bold">{backtestData.n01}</td>
                      </tr>
                      <tr>
                        <td className="text-[10px] text-muted-foreground p-1">突破 →</td>
                        <td className="text-foreground p-1 font-bold">{backtestData.n10}</td>
                        <td className="text-red-400 p-1 font-bold">{backtestData.n11}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-2 text-[10px] font-mono text-muted-foreground text-center space-y-0.5">
                    <p>π₀₁ = {backtestData.pi01.toFixed(4)} · π₁₁ = {backtestData.pi11.toFixed(4)}</p>
                  </div>
                </div>
              </div>

              {/* P&L Timeline Chart */}
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={backtestData.timeline} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis
                      dataKey="day"
                      stroke={CHART_TEXT}
                      tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      label={{
                        value: "交易日",
                        position: "insideBottom",
                        offset: -2,
                        style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" },
                      }}
                    />
                    <YAxis
                      stroke={CHART_TEXT}
                      tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      width={50}
                    />
                    <Tooltip
                      content={({ active: isActive, payload }) => {
                        if (!isActive || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="rounded-lg bg-card border border-border px-3 py-2 shadow-lg">
                            <p className="text-xs font-mono text-muted-foreground">第 {d?.day} 天</p>
                            <p className={`text-sm font-mono ${d?.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              P&L: {d?.pnl?.toFixed(2)} 万
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                              VaR线: {d?.var?.toFixed(2)} 万
                            </p>
                            {d?.exception && (
                              <p className="text-xs font-mono text-red-400 font-bold">⚠ VaR 突破</p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={0} stroke={CHART_TEXT} strokeOpacity={0.3} />
                    <Bar dataKey="pnl" name="P&L">
                      {backtestData.timeline.map((entry, index) => (
                        <Cell
                          key={`bt-${index}`}
                          fill={entry.exception ? CHART_RED : entry.pnl >= 0 ? "hsl(160, 50%, 40%)" : CHART_TEAL}
                          fillOpacity={entry.exception ? 0.9 : 0.5}
                        />
                      ))}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="var"
                      name="−VaR"
                      stroke={CHART_RED}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                红色柱 = 损失超过VaR的突破日 · 虚线 = −VaR 阈值 · Kupiec LR ~ χ²(1), 5%显著性水平
              </p>
            </div>
          )}

          {/* Result (non-VaR) */}
          {active !== "var" && (
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
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default CalculatorSection;