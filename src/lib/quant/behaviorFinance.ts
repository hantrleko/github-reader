/**
 * V5.9 Behavioral Finance — pure, unit-tested models.
 *
 * 1. Cumulative Prospect Theory (Tversky-Kahneman 1992)
 * 2. Myopic loss aversion / implied equity premium (Benartzi-Thaler 1995)
 * 3. BSV regime-switching beliefs (Barberis-Shleifer-Vishny 1998)
 * 4. DHS overconfidence + self-attribution (Daniel-Hirshleifer-Subrahmanyam 1998)
 * 5. HS gradual information diffusion (Hong-Stein 1999)
 * 6. Limits to arbitrage under margin / redemption constraints (Shleifer-Vishny 1997)
 * 7. Investor sentiment and the cross-section (Baker-Wurgler 2006)
 * 8. Behavioral corporate finance: managerial overconfidence + market timing
 */

/* ───────────────── 1. Cumulative Prospect Theory ───────────────── */

export interface CptParams {
  alpha: number;  // gain curvature
  beta: number;   // loss curvature
  lambda: number; // loss aversion
  gamma: number;  // probability weighting (gains)
  delta?: number; // probability weighting (losses); defaults to gamma
}

export function cptValue(x: number, p: CptParams): number {
  return x >= 0 ? Math.pow(x, p.alpha) : -p.lambda * Math.pow(-x, p.beta);
}

export function cptWeight(prob: number, g: number): number {
  const pp = Math.min(1 - 1e-12, Math.max(1e-12, prob));
  const a = Math.pow(pp, g);
  return a / Math.pow(a + Math.pow(1 - pp, g), 1 / g);
}

export interface CptGambleOut {
  prospectValue: number;
  expectedValue: number;
  certaintyEquivalent: number;
  riskPremium: number;      // EV − CE
  euCertaintyEquivalent: number; // expected-utility benchmark (linear utility → EV)
  wGain: number;
  wLoss: number;
}

/** Two-outcome gamble: win `gain` w.p. p, else lose `loss` (loss entered positive). */
export function cptGamble(gain: number, loss: number, p: number, par: CptParams): CptGambleOut {
  const dl = par.delta ?? par.gamma;
  const wGain = cptWeight(p, par.gamma);
  const wLoss = cptWeight(1 - p, dl);
  const prospectValue = wGain * cptValue(gain, par) + wLoss * cptValue(-loss, par);
  const expectedValue = p * gain - (1 - p) * loss;
  const certaintyEquivalent =
    prospectValue >= 0
      ? Math.pow(prospectValue, 1 / par.alpha)
      : -Math.pow(-prospectValue / par.lambda, 1 / par.beta);
  return {
    prospectValue,
    expectedValue,
    certaintyEquivalent,
    riskPremium: expectedValue - certaintyEquivalent,
    euCertaintyEquivalent: expectedValue,
    wGain,
    wLoss,
  };
}

export interface FourfoldCell {
  domain: "gain" | "loss";
  probability: number;
  ce: number;
  ev: number;
  attitude: "risk-averse" | "risk-seeking" | "neutral";
}

/** Fourfold pattern: {low, high} probability × {gain, loss}. */
export function fourfoldPattern(stake: number, par: CptParams, lowP = 0.05, highP = 0.95): FourfoldCell[] {
  const cells: FourfoldCell[] = [];
  for (const domain of ["gain", "loss"] as const) {
    for (const probability of [lowP, highP]) {
      const g = domain === "gain" ? cptGamble(stake, 0, probability, par)
                                  : cptGamble(0, stake, 1 - probability, par);
      const ce = g.certaintyEquivalent;
      const ev = domain === "gain" ? probability * stake : -probability * stake;
      const diff = ce - ev;
      const attitude: FourfoldCell["attitude"] =
        Math.abs(diff) < 1e-9 ? "neutral" : diff > 0 ? "risk-seeking" : "risk-averse";
      cells.push({ domain, probability, ce, ev, attitude });
    }
  }
  return cells;
}

/* ───────────────── 2. Myopic loss aversion (Benartzi-Thaler) ───────────────── */

export interface MlaParams {
  lambda: number;        // loss aversion
  sigmaAnnual: number;   // equity volatility p.a.
  evaluationsPerYear: number; // evaluation frequency n
  riskFree: number;      // annual risk-free rate
  equityShare?: number;  // portfolio weight used in utility scan
}
export interface MlaOut {
  impliedEquityPremium: number; // annual premium making prospective utility = 0
  lossProbability: number;      // P(period return < 0) at the implied premium
  periodSigma: number;
  utilityCurve: { premium: number; utility: number }[];
}

function normCdf(z: number) {
  // Abramowitz-Stegun
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}
function normPdf(z: number) { return 0.3989422804014327 * Math.exp((-z * z) / 2); }

/**
 * Prospective utility of the excess return over one evaluation period,
 * with piecewise-linear value function (kink only, λ on losses):
 *   U(μ,σ) = E[x⁺] − λ·E[x⁻],  x ~ N(μ, σ²)
 * Implied premium solves U = 0 → the premium an MLA investor demands.
 */
export function myopicLossAversion(p: MlaParams): MlaOut {
  const n = Math.max(1, p.evaluationsPerYear);
  const periodSigma = p.sigmaAnnual / Math.sqrt(n);
  const utility = (annualPremium: number) => {
    const mu = annualPremium / n;
    const z = mu / periodSigma;
    const eplus = mu * normCdf(z) + periodSigma * normPdf(z);
    const eminus = -mu * normCdf(-z) + periodSigma * normPdf(z);
    return eplus - p.lambda * eminus;
  };
  // bisection on [0, 1]
  let lo = 0, hi = 1;
  if (utility(lo) >= 0) { /* λ ≤ 1 → no premium needed */ }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (utility(mid) < 0) lo = mid; else hi = mid;
  }
  const impliedEquityPremium = utility(0) >= 0 ? 0 : (lo + hi) / 2;
  const mu = impliedEquityPremium / n;
  const utilityCurve: { premium: number; utility: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const pr = (i / 40) * 0.2;
    utilityCurve.push({ premium: +pr.toFixed(4), utility: +utility(pr).toFixed(6) });
  }
  return {
    impliedEquityPremium,
    lossProbability: normCdf(-mu / periodSigma),
    periodSigma,
    utilityCurve,
  };
}

/* ───────────────── 3. BSV regime-switching beliefs ───────────────── */

export interface BsvParams {
  piL: number;   // P(stay in mean-reverting regime)
  piH: number;   // P(stay in trending regime)
  lambda1: number; // prior weight on mean-reverting regime
  shock: number;   // earnings surprise magnitude
  horizon: number; // periods
}
export interface BsvOut {
  t: number[];
  car: number[];             // cumulative abnormal return (behavioral)
  rationalCar: number[];     // rational benchmark (immediate full response)
  underreaction: number;     // short-horizon CAR shortfall vs rational
  overreaction: number;      // long-horizon CAR overshoot vs rational
  reversal: boolean;
}

/**
 * Reduced-form BSV: conservatism makes the price respond only partially at t=0
 * and drift upward (underreaction), while representativeness extrapolates the
 * streak and pushes the price beyond fundamentals, later reversing.
 */
export function bsvBeliefs(p: BsvParams): BsvOut {
  const t: number[] = [];
  const car: number[] = [];
  const rationalCar: number[] = [];
  const conserv = Math.max(0, Math.min(1, p.lambda1 * p.piL)); // conservatism strength
  const repres = Math.max(0, Math.min(1, (1 - p.lambda1) * p.piH)); // extrapolation strength
  const peak = Math.max(1, Math.round(2 + 6 * repres));
  for (let i = 0; i <= p.horizon; i++) {
    t.push(i);
    rationalCar.push(p.shock);
    const drift = 1 - Math.exp(-i / Math.max(0.5, 3 * conserv + 0.5));
    const initial = p.shock * (1 - conserv);
    const underDrift = initial + (p.shock - initial) * drift;
    // extrapolative overshoot rises to `peak` then mean-reverts
    const over = p.shock * repres * (i / peak) * Math.exp(1 - i / peak);
    car.push(underDrift + over);
  }
  const shortIdx = Math.min(1, p.horizon);
  const longIdx = p.horizon;
  return {
    t,
    car,
    rationalCar,
    underreaction: rationalCar[shortIdx] - car[shortIdx],
    overreaction: Math.max(...car) - p.shock,
    reversal: car[longIdx] < Math.max(...car) - 1e-12,
  };
}

/* ───────────────── 4. DHS overconfidence + self-attribution ───────────────── */

export interface DhsParams {
  overconfidence: number;   // k ≥ 1, inflation of private-signal precision
  selfAttribution: number;  // ψ ∈ [0,1), strength of biased updating
  signal: number;           // private signal about value
  horizon: number;
  correctionRate: number;   // λ, speed public info corrects the price
}
export interface DhsOut {
  t: number[];
  price: number[];
  fundamental: number[];
  momentumPhase: number;   // periods of continued drift
  peakOvershoot: number;
  longRunReversal: number; // peak − terminal
}

export function dhsOverconfidence(p: DhsParams): DhsOut {
  const t: number[] = [];
  const price: number[] = [];
  const fundamental: number[] = [];
  const k = Math.max(1, p.overconfidence);
  const psi = Math.max(0, Math.min(0.99, p.selfAttribution));
  const lam = Math.max(1e-6, Math.min(1, p.correctionRate));
  let x = k * p.signal; // initial overreaction
  let momentumPhase = 0;
  let peak = x;
  for (let i = 0; i <= p.horizon; i++) {
    t.push(i);
    price.push(x);
    fundamental.push(p.signal);
    if (i > 0 && x > price[i - 1] + 1e-12) momentumPhase = i;
    if (x > peak) peak = x;
    // self-attribution keeps pushing away early, then public info pulls back
    const push = psi * (k - 1) * p.signal * Math.exp(-i / 3);
    x = x + push - lam * (x - p.signal);
  }
  return {
    t,
    price,
    fundamental,
    momentumPhase,
    peakOvershoot: peak - p.signal,
    longRunReversal: peak - price[price.length - 1],
  };
}

/* ───────────────── 5. HS gradual information diffusion ───────────────── */

export interface HsParams {
  diffusionPeriods: number; // z: news reaches all watchers after z periods
  momentumShare: number;    // fraction of momentum traders μ ∈ [0,1)
  momentumLookback: number; // j periods
  shock: number;
  horizon: number;
}
export interface HsOut {
  t: number[];
  price: number[];
  fundamental: number[];
  momentumStrength: number; // max overshoot above fundamental
  overshoot: boolean;
}

export function hongSteinDiffusion(p: HsParams): HsOut {
  const z = Math.max(1, Math.round(p.diffusionPeriods));
  const mu = Math.max(0, Math.min(0.95, p.momentumShare));
  const j = Math.max(1, Math.round(p.momentumLookback));
  const t: number[] = [];
  const price: number[] = [];
  const fundamental: number[] = [];
  for (let i = 0; i <= p.horizon; i++) {
    t.push(i);
    fundamental.push(p.shock);
    const newsAbsorbed = p.shock * Math.min(1, (i + 1) / z);
    const prev = price[i - 1] ?? 0;
    const lag = price[Math.max(0, i - j)] ?? 0;
    const trend = mu * (prev - lag);
    // momentum traders extrapolate the past j-period move, decaying as news completes
    const decay = Math.exp(-Math.max(0, i - z) / Math.max(1, j * 2));
    price.push(newsAbsorbed + trend * decay);
  }
  const maxP = Math.max(...price);
  return {
    t,
    price,
    fundamental,
    momentumStrength: maxP - p.shock,
    overshoot: maxP > p.shock + 1e-9,
  };
}

/* ───────────────── 6. Limits to arbitrage ───────────────── */

export interface LimitsParams {
  mispricing: number;    // initial |price − fundamental|
  noiseVol: number;      // σ of noise-trader shocks
  convergenceRate: number; // κ, natural convergence speed per period
  capital: number;       // arbitrageur capital
  marginRequirement: number; // m ∈ (0,1]
  redemptionSensitivity: number; // β: outflow per unit of interim loss
  horizon: number;
}
export interface LimitsOut {
  t: number[];
  mispricing: number[];
  unconstrained: number[];
  position: number[];
  capitalPath: number[];
  halfLife: number;
  forcedLiquidation: boolean;
  liquidationPeriod: number | null;
  maxPosition: number;
}

/**
 * Shleifer-Vishny style: arbitrageur position is capped by capital/margin;
 * interim losses trigger redemptions, shrinking capital and slowing convergence.
 */
export function limitsToArbitrage(p: LimitsParams): LimitsOut {
  const t: number[] = [];
  const mis: number[] = [];
  const unc: number[] = [];
  const pos: number[] = [];
  const cap: number[] = [];
  const m = Math.max(0.01, Math.min(1, p.marginRequirement));
  const kappa = Math.max(0, Math.min(1, p.convergenceRate));
  let d = p.mispricing;
  let capital = p.capital;
  let forced = false;
  let liquidationPeriod: number | null = null;
  let maxPosition = 0;
  // deterministic adverse path first (mispricing widens), then converges
  for (let i = 0; i <= p.horizon; i++) {
    t.push(i);
    mis.push(d);
    unc.push(p.mispricing * Math.pow(1 - kappa, i));
    const capacity = capital / m;
    const position = Math.min(capacity, Math.abs(d) * capital / m / Math.max(1e-9, p.mispricing));
    pos.push(position);
    cap.push(capital);
    maxPosition = Math.max(maxPosition, position);
    // widening shock early on (noise-trader risk)
    const widening = p.noiseVol * Math.exp(-i / 2);
    const arbPressure = kappa * (position / Math.max(1e-9, p.capital / m));
    const next = d * (1 - arbPressure) + widening;
    const pnl = position * (d - next); // gain when mispricing narrows
    if (pnl < 0) {
      capital = Math.max(0, capital + pnl - p.redemptionSensitivity * Math.abs(pnl));
      if (capital <= 0.05 * p.capital && !forced) { forced = true; liquidationPeriod = i; }
    } else {
      capital = capital + pnl;
    }
    d = next;
  }
  const target = Math.abs(p.mispricing) / 2;
  let halfLife = Infinity;
  for (let i = 0; i < mis.length; i++) {
    if (Math.abs(mis[i]) <= target) { halfLife = i; break; }
  }
  return {
    t, mispricing: mis, unconstrained: unc, position: pos, capitalPath: cap,
    halfLife, forcedLiquidation: forced, liquidationPeriod, maxPosition,
  };
}

/* ───────────────── 7. Sentiment and the cross-section ───────────────── */

export interface SentimentParams {
  sentiment: number;        // standardized index, roughly [−2, 2]
  sensitivity: number;      // b: how strongly hard-to-value stocks load on sentiment
  arbitrageCost: number;    // c ∈ [0,1]: short-sale / arbitrage friction
  baseReturn: number;       // rational expected return for both legs
  horizon: number;          // months over which the mispricing corrects
}
export interface SentimentOut {
  hardToValueReturn: number;  // subsequent return of speculative leg
  easyToValueReturn: number;
  spread: number;             // hard − easy (negative after high sentiment)
  path: { t: number; hard: number; easy: number }[];
  regime: "high" | "neutral" | "low";
}

export function sentimentCrossSection(p: SentimentParams): SentimentOut {
  const distortion = p.sensitivity * p.sentiment * (1 + p.arbitrageCost);
  const hardToValueReturn = p.baseReturn - distortion;
  const easyToValueReturn = p.baseReturn - 0.15 * distortion;
  const path: SentimentOut["path"] = [];
  const n = Math.max(1, Math.round(p.horizon));
  let hard = 0, easy = 0;
  for (let i = 0; i <= n; i++) {
    path.push({ t: i, hard: +hard.toFixed(6), easy: +easy.toFixed(6) });
    hard += hardToValueReturn / n;
    easy += easyToValueReturn / n;
  }
  return {
    hardToValueReturn,
    easyToValueReturn,
    spread: hardToValueReturn - easyToValueReturn,
    path,
    regime: p.sentiment > 0.5 ? "high" : p.sentiment < -0.5 ? "low" : "neutral",
  };
}

/* ───────────────── 8. Behavioral corporate finance ───────────────── */

export interface BehavioralCorpParams {
  overconfidence: number;  // κ ≥ 0: manager overvalues own projects
  cashFlow: number[];      // internal cash flow per period
  externalFinanceCost: number; // wedge on external funds
  sentiment: number[];     // market misvaluation per period (market timing)
  timingIntensity: number; // how strongly the firm issues when overvalued
}
export interface BehavioralCorpOut {
  investment: number[];
  rationalInvestment: number[];
  equityIssuance: number[];
  leverage: number[];
  investmentCashFlowSensitivity: number; // OLS slope of ΔI on ΔCF
  rationalSensitivity: number;
}

function olsSlope(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); den += (x[i] - mx) ** 2; }
  return den === 0 ? 0 : num / den;
}

export function behavioralCorporate(p: BehavioralCorpParams): BehavioralCorpOut {
  const n = p.cashFlow.length;
  const investment: number[] = [];
  const rationalInvestment: number[] = [];
  const equityIssuance: number[] = [];
  const leverage: number[] = [];
  let lev = 0.4;
  for (let i = 0; i < n; i++) {
    const cf = p.cashFlow[i];
    const sent = p.sentiment[i] ?? 0;
    // overconfident manager: sees NPV inflated by κ but views external finance as costly
    const wedge = p.externalFinanceCost * (1 + p.overconfidence);
    const rational = 1 + 0.2 * cf;
    const behavioral = 1 + (0.2 + 0.6 * p.overconfidence / (1 + wedge)) * cf + 0.1 * p.overconfidence;
    // market timing: issue equity when the market overvalues the firm
    const issue = Math.max(0, p.timingIntensity * sent);
    lev = Math.max(0, Math.min(1, lev - 0.15 * issue + 0.05 * (behavioral - rational)));
    investment.push(behavioral);
    rationalInvestment.push(rational);
    equityIssuance.push(issue);
    leverage.push(lev);
  }
  return {
    investment,
    rationalInvestment,
    equityIssuance,
    leverage,
    investmentCashFlowSensitivity: olsSlope(p.cashFlow, investment),
    rationalSensitivity: olsSlope(p.cashFlow, rationalInvestment),
  };
}