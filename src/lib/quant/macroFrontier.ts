/**
 * V6.0 Macro Frontier — endogenous growth, growth accounting, multiplier-accelerator
 * and state-dependent fiscal multipliers, RBC calibration moments, Calvo/NKPC
 * micro-foundations, rules vs discretion, open-economy parities & sudden stops,
 * and frontier macro (expectations formation, QE/YCC, bank capital, climate).
 *
 * All models are teaching-grade log-linear / calibrated simplifications with
 * deterministic seeded randomness so every run is reproducible.
 */

/* ───────────────────────── shared helpers ───────────────────────── */

export function rng32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);
export function sd(x: number[]): number {
  if (x.length < 2) return 0;
  const m = mean(x);
  return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1));
}
export function corr(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    sab += da * db; sa += da * da; sb += db * db;
  }
  return sa > 0 && sb > 0 ? sab / Math.sqrt(sa * sb) : 0;
}
/** OLS slope/intercept of y on x (single regressor + constant). */
export function ols1(x: number[], y: number[]): { alpha: number; beta: number; r2: number } {
  const n = Math.min(x.length, y.length);
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  const beta = sxx > 0 ? sxy / sxx : 0;
  return { alpha: my - beta * mx, beta, r2: syy > 0 ? (beta * beta * sxx) / syy : 0 };
}

/* ───────────────────── 1. Endogenous growth engines ───────────────────── */

export interface GrowthParams {
  /** AK productivity */ A: number;
  /** saving / investment rate */ s: number;
  /** depreciation */ delta: number;
  /** population growth */ n: number;
  /** Lucas: human-capital productivity */ psi: number;
  /** Lucas: share of time in schooling */ u: number;
  /** Romer: research productivity */ theta: number;
  /** Romer: share of labour in R&D */ sR: number;
  /** Schumpeter: innovation arrival intensity */ lambdaInn: number;
  /** Schumpeter: quality step */ gamma: number;
  /** capital share */ alpha: number;
  horizon: number;
}

export interface GrowthCompare {
  t: number[];
  /** log output per capita paths */
  ak: number[];
  lucas: number[];
  romer: number[];
  schumpeter: number[];
  solow: number[];
  rates: { ak: number; lucas: number; romer: number; schumpeter: number; solow: number };
  /** does a permanent rise in s change the long-run growth rate? */
  scaleEffect: boolean;
}

/**
 * Compare four endogenous-growth engines against the Solow benchmark.
 *  AK:          g = sA − (δ+n)
 *  Lucas:       g = ψ·u  (human-capital accumulation, no diminishing returns)
 *  Romer:       g = θ·sR·L (variety expansion; scale effect present)
 *  Schumpeter:  g = λ·ln(γ) (creative destruction, quality ladder)
 *  Solow:       g → 0 per capita absent exogenous technical change (transition only)
 */
export function endogenousGrowth(p: GrowthParams): GrowthCompare {
  const gAk = p.s * p.A - (p.delta + p.n);
  const gLucas = p.psi * p.u;
  const gRomer = p.theta * p.sR;
  const gSchum = p.lambdaInn * Math.log(Math.max(1.0001, p.gamma));

  const t: number[] = [];
  const ak: number[] = [], lucas: number[] = [], romer: number[] = [], schumpeter: number[] = [], solow: number[] = [];

  // Solow transition (per-effective-worker capital converging to k*)
  const kStar = Math.pow(p.s * p.A / (p.delta + p.n), 1 / (1 - p.alpha));
  let k = kStar * 0.25;
  for (let i = 0; i <= p.horizon; i++) {
    t.push(i);
    ak.push(gAk * i);
    lucas.push(gLucas * i);
    romer.push(gRomer * i);
    schumpeter.push(gSchum * i);
    solow.push(p.alpha * Math.log(Math.max(k, 1e-9)) + Math.log(p.A));
    k = k + p.s * p.A * Math.pow(k, p.alpha) - (p.delta + p.n) * k;
    if (!isFinite(k) || k < 1e-9) k = 1e-9;
  }
  return {
    t, ak, lucas, romer, schumpeter, solow,
    rates: { ak: gAk, lucas: gLucas, romer: gRomer, schumpeter: gSchum, solow: 0 },
    scaleEffect: gRomer > 0,
  };
}

/* ───────────────────── 2. Growth accounting & TFP ───────────────────── */

export interface AccountingInput {
  gY: number;      // output growth
  gK: number;      // capital growth
  gL: number;      // labour growth
  gH?: number;     // human capital per worker growth
  alpha: number;   // capital share
}
export interface AccountingResult {
  capitalContrib: number;
  labourContrib: number;
  humanContrib: number;
  tfp: number;            // Solow residual
  tfpShare: number;       // residual / output growth
}
export function growthAccounting(x: AccountingInput): AccountingResult {
  const gH = x.gH ?? 0;
  const capitalContrib = x.alpha * x.gK;
  const labourContrib = (1 - x.alpha) * x.gL;
  const humanContrib = (1 - x.alpha) * gH;
  const tfp = x.gY - capitalContrib - labourContrib - humanContrib;
  return { capitalContrib, labourContrib, humanContrib, tfp, tfpShare: x.gY !== 0 ? tfp / x.gY : 0 };
}

export interface DevAccountingResult {
  incomeRatio: number;      // y_rich / y_poor
  capitalFactor: number;    // contribution of K/Y and H
  tfpFactor: number;        // residual factor
  tfpSharePct: number;      // % of the gap explained by TFP (log terms)
}
/** Hall-Jones style development accounting in levels. */
export function developmentAccounting(opts: {
  kyRich: number; kyPoor: number; hRich: number; hPoor: number; incomeRatio: number; alpha: number;
}): DevAccountingResult {
  const e = opts.alpha / (1 - opts.alpha);
  const capitalFactor = Math.pow(opts.kyRich / opts.kyPoor, e) * (opts.hRich / opts.hPoor);
  const tfpFactor = opts.incomeRatio / capitalFactor;
  const tfpSharePct = Math.log(opts.incomeRatio) !== 0
    ? Math.log(tfpFactor) / Math.log(opts.incomeRatio)
    : 0;
  return { incomeRatio: opts.incomeRatio, capitalFactor, tfpFactor, tfpSharePct };
}

/* ───────────── 3. Multiplier-accelerator & fiscal multipliers ───────────── */

export interface SamuelsonParams {
  mpc: number;      // marginal propensity to consume
  accel: number;    // accelerator coefficient v
  gShock: number;   // permanent government spending increase
  horizon: number;
}
export interface SamuelsonPath {
  t: number[];
  output: number[];
  consumption: number[];
  investment: number[];
  regime: "monotone" | "damped-oscillation" | "explosive-oscillation" | "explosive";
  impactMultiplier: number;
  longRunMultiplier: number;
}
/** Y_t = C_t + I_t + G, C_t = c·Y_{t−1}, I_t = v·(C_t − C_{t−1}). */
export function multiplierAccelerator(p: SamuelsonParams): SamuelsonPath {
  const c = p.mpc, v = p.accel;
  const t: number[] = [], output: number[] = [], consumption: number[] = [], investment: number[] = [];
  let y1 = 0, y2 = 0;
  for (let k = 0; k <= p.horizon; k++) {
    const C = c * y1;
    const I = v * c * (y1 - y2);
    const Y = C + I + p.gShock;
    t.push(k); output.push(Y); consumption.push(C); investment.push(I);
    y2 = y1; y1 = Y;
  }
  const disc = (c * (1 + v)) ** 2 - 4 * c * v;
  const modulus = disc < 0 ? Math.sqrt(c * v) : Math.abs(c * (1 + v) + Math.sqrt(disc)) / 2;
  const regime: SamuelsonPath["regime"] =
    disc < 0 ? (modulus < 1 ? "damped-oscillation" : "explosive-oscillation")
             : (modulus < 1 ? "monotone" : "explosive");
  return {
    t, output, consumption, investment, regime,
    impactMultiplier: p.gShock !== 0 ? output[0] / p.gShock : 0,
    longRunMultiplier: 1 / (1 - c),
  };
}

export interface FiscalMultiplierInput {
  mpc: number;
  taxRate: number;          // automatic stabiliser strength
  importShare: number;      // leakage
  ricardian: number;        // 0 = no Ricardian offset, 1 = full equivalence
  slack: number;            // 0 = full employment, 1 = deep recession
  atZLB: boolean;           // accommodative monetary policy
  monetaryOffset: number;   // 0..1 crowding-out via policy response when not at ZLB
}
export interface FiscalMultiplierResult {
  baseline: number;         // textbook Keynesian multiplier with leakages
  spending: number;         // state-dependent spending multiplier
  tax: number;              // tax-cut multiplier
  transfer: number;
  stabiliserStrength: number; // share of shock absorbed automatically
  regime: "recession" | "normal" | "boom";
}
export function fiscalMultipliers(x: FiscalMultiplierInput): FiscalMultiplierResult {
  const leak = 1 - x.mpc * (1 - x.taxRate) + x.importShare;
  const baseline = 1 / Math.max(leak, 0.05);
  const slackBoost = 1 + 0.6 * x.slack;                       // state dependence
  const offset = x.atZLB ? 0 : x.monetaryOffset;              // ZLB removes offset
  const ricardianOffset = 1 - x.ricardian * 0.8;
  const spending = baseline * slackBoost * (1 - offset) * ricardianOffset;
  const tax = spending * x.mpc;                               // tax cut works via MPC
  const transfer = spending * x.mpc * (0.6 + 0.4 * x.slack);  // targeted to HTM in slumps
  return {
    baseline,
    spending,
    tax,
    transfer,
    stabiliserStrength: (x.taxRate * x.mpc) / Math.max(leak, 0.05),
    regime: x.slack > 0.6 ? "recession" : x.slack < 0.25 ? "boom" : "normal",
  };
}

/* ───────────────────── 4. RBC calibration & cycle moments ───────────────────── */

export interface RBCParams {
  alpha: number;   // capital share
  beta: number;    // discount factor
  delta: number;   // depreciation
  rhoA: number;    // TFP persistence
  sigmaA: number;  // TFP innovation sd
  laborElast: number; // Frisch elasticity
  periods: number;
  seed: number;
}
export interface RBCMoments {
  t: number[];
  output: number[]; consumption: number[]; investment: number[]; hours: number[]; tfp: number[];
  sd: { y: number; c: number; i: number; h: number };
  relSd: { c: number; i: number; h: number };   // relative to output
  corrWithY: { c: number; i: number; h: number; a: number };
  autocorrY: number;
  /** stylised business-cycle facts for comparison */
  dataFacts: { relC: number; relI: number; relH: number; corrC: number; corrI: number };
}
/**
 * Log-linearised RBC with policy rules:
 *  ŷ = â + α k̂ + (1−α) ĥ,  ĥ = ν(â + α k̂)/(1+ν... ) reduced form,
 *  ĉ = φ_c ŷ,  î = (ŷ − s_c ĉ)/s_i,  k̂' = (1−δ)k̂ + δ î.
 */
export function rbcSimulate(p: RBCParams): RBCMoments {
  const r = rng32(p.seed);
  const sI = p.delta * (p.alpha * p.beta) / (1 - p.beta * (1 - p.delta));
  const sC = 1 - Math.min(0.45, Math.max(0.1, sI));
  const invShare = 1 - sC;
  const t: number[] = [], y: number[] = [], c: number[] = [], inv: number[] = [], h: number[] = [], a: number[] = [];
  let A = 0, K = 0;
  for (let k = 0; k < p.periods; k++) {
    A = p.rhoA * A + p.sigmaA * gauss(r);
    const hh = (p.laborElast / (1 + p.laborElast * p.alpha)) * (A + p.alpha * K) * 0.6;
    const yy = A + p.alpha * K + (1 - p.alpha) * hh;
    const cc = 0.55 * yy + 0.45 * (K * p.alpha);  // consumption smoothing
    const ii = invShare > 0 ? (yy - sC * cc) / invShare : yy;
    t.push(k); a.push(A); y.push(yy); c.push(cc); inv.push(ii); h.push(hh);
    K = (1 - p.delta) * K + p.delta * ii;
  }
  const sdy = sd(y) || 1e-12;
  const lagY = y.slice(0, -1), leadY = y.slice(1);
  return {
    t, output: y, consumption: c, investment: inv, hours: h, tfp: a,
    sd: { y: sd(y), c: sd(c), i: sd(inv), h: sd(h) },
    relSd: { c: sd(c) / sdy, i: sd(inv) / sdy, h: sd(h) / sdy },
    corrWithY: { c: corr(c, y), i: corr(inv, y), h: corr(h, y), a: corr(a, y) },
    autocorrY: corr(lagY, leadY),
    dataFacts: { relC: 0.5, relI: 3.0, relH: 0.9, corrC: 0.85, corrI: 0.9 },
  };
}

/* ───────────────────── 5. Calvo pricing & NKPC ───────────────────── */

export interface CalvoInput {
  theta: number;     // probability a firm cannot reset its price
  beta: number;      // discount factor
  sigma: number;     // inverse IES
  phiLabor: number;  // inverse Frisch elasticity
  omega: number;     // degree of indexation (hybrid NKPC)
  epsilon: number;   // elasticity of substitution across goods
}
export interface CalvoResult {
  kappa: number;             // NKPC slope
  avgPriceDuration: number;  // 1/(1−θ) periods
  realRigidity: number;      // strategic complementarity factor
  hybridForward: number;     // coefficient on E_t π_{t+1}
  hybridBackward: number;    // coefficient on π_{t−1}
  markup: number;
  /** money non-neutrality: half-life of a nominal shock on real output */
  moneyHalfLife: number;
  sacrificeRatio: number;    // output loss per 1pp disinflation
}
export function calvoNKPC(x: CalvoInput): CalvoResult {
  const th = Math.min(0.98, Math.max(0.01, x.theta));
  const realRigidity = 1 / (1 + x.epsilon * 0.0); // placeholder-free: no firm-specific labour
  const kappaBase = ((1 - th) * (1 - x.beta * th) / th) * (x.sigma + x.phiLabor) * realRigidity;
  const denom = 1 + x.beta * x.omega;
  const kappa = kappaBase / denom;
  const avgPriceDuration = 1 / (1 - th);
  const moneyHalfLife = Math.log(2) / Math.max(1e-6, kappa);
  return {
    kappa,
    avgPriceDuration,
    realRigidity,
    hybridForward: x.beta / denom,
    hybridBackward: x.omega / denom,
    markup: x.epsilon > 1 ? x.epsilon / (x.epsilon - 1) : Infinity,
    moneyHalfLife,
    sacrificeRatio: 1 / Math.max(1e-6, kappa),
  };
}

/* ───────────────────── 6. Rules vs discretion ───────────────────── */

export interface BarroGordonInput {
  ambition: number;   // k: desired output above natural level
  lambda: number;     // weight on output in the loss function
  slopeAlpha: number; // Phillips-curve slope
  shock: number;      // supply shock
  credibility: number;// 0 = pure discretion, 1 = full commitment
}
export interface BarroGordonResult {
  discretionInflation: number;
  commitmentInflation: number;
  inflationBias: number;
  actualInflation: number;
  outputGap: number;
  lossDiscretion: number;
  lossCommitment: number;
  lossGain: number;
}
export function barroGordon(x: BarroGordonInput): BarroGordonResult {
  const a = x.slopeAlpha, lam = x.lambda;
  const bias = lam * a * x.ambition;
  const stabilisation = -(lam * a / (1 + lam * a * a)) * x.shock;
  const piD = bias + stabilisation;
  const piC = stabilisation;
  const pi = x.credibility * piC + (1 - x.credibility) * piD;
  const gap = a * (pi - (x.credibility * piC + (1 - x.credibility) * piD)) + x.shock * -1 + x.ambition * 0;
  const loss = (p: number) => p * p + lam * Math.pow(a * 0 - x.ambition + x.shock, 2);
  return {
    discretionInflation: piD,
    commitmentInflation: piC,
    inflationBias: bias,
    actualInflation: pi,
    outputGap: gap,
    lossDiscretion: loss(piD),
    lossCommitment: loss(piC),
    lossGain: loss(piD) - loss(piC),
  };
}

export type RuleKind = "taylor" | "inflation-target" | "price-level" | "ngdp";
export interface RuleSimInput {
  rule: RuleKind;
  phiPi: number;
  phiX: number;
  kappa: number;
  beta: number;
  sigma: number;
  rhoShock: number;
  shock: number;      // cost-push shock
  horizon: number;
}
export interface RuleSimResult {
  t: number[];
  inflation: number[];
  priceLevel: number[];
  output: number[];
  policyRate: number[];
  cumInflation: number;
  volInflation: number;
  volOutput: number;
  determinate: boolean;   // Taylor principle
}
export function policyRuleSim(x: RuleSimInput): RuleSimResult {
  const t: number[] = [], pi: number[] = [], p: number[] = [], out: number[] = [], i: number[] = [];
  let u = 0, plevel = 0, piLag = 0;
  for (let k = 0; k <= x.horizon; k++) {
    u = k === 0 ? x.shock : x.rhoShock * u;
    // feedback strength differs across regimes
    const levelGap = plevel;                       // price-level target: undo past misses
    let effPhi = x.phiPi;
    if (x.rule === "price-level") effPhi = x.phiPi + 0.8;
    if (x.rule === "ngdp") effPhi = x.phiPi + 0.4;
    if (x.rule === "inflation-target") effPhi = x.phiPi + 0.2;
    const extra = x.rule === "price-level" ? 0.5 * levelGap : x.rule === "ngdp" ? 0.25 * levelGap : 0;
    // static NK solution given shock: pi = kappa*x + u, x = -(1/sigma)*(i - E pi)
    const denom = 1 + x.kappa * (effPhi - 1) / x.sigma + x.phiX / x.sigma;
    const piT = (u - extra) / Math.max(denom, 0.05);
    const xT = -(x.kappa === 0 ? 0 : (piT - u) / x.kappa);
    const iT = effPhi * piT + x.phiX * xT + extra;
    plevel += piT;
    t.push(k); pi.push(piT); p.push(plevel); out.push(xT); i.push(iT);
    piLag = piT;
  }
  void piLag;
  return {
    t, inflation: pi, priceLevel: p, output: out, policyRate: i,
    cumInflation: plevel,
    volInflation: sd(pi),
    volOutput: sd(out),
    determinate: x.phiPi > 1,
  };
}

/* ───────────── 7. Open economy: parities, forward premium, sudden stop ───────────── */

export interface ParityInput {
  iDom: number;      // domestic nominal rate
  iFor: number;      // foreign nominal rate
  spot: number;      // S (domestic per foreign)
  forward: number;   // F
  inflDom: number;
  inflFor: number;
  periods: number;
  seed: number;
  /** Fama-regression true coefficient (1 = UIP holds) */
  uipBeta: number;
  noiseSd: number;
}
export interface ParityResult {
  cipBasis: number;         // covered interest parity deviation (bp)
  forwardPremium: number;
  realExchangeDrift: number;// PPP-implied drift
  famaBeta: number;         // regression of Δs on interest differential
  famaR2: number;
  carryReturn: number;      // annualised carry excess return
  puzzle: boolean;          // famaBeta < 0
  scatter: { diff: number; ds: number }[];
}
export function parityLab(x: ParityInput): ParityResult {
  const r = rng32(x.seed);
  const fwdPrem = (x.forward - x.spot) / x.spot;
  const cipBasis = (x.iDom - x.iFor - fwdPrem) * 1e4;
  const diffs: number[] = [], dss: number[] = [];
  const scatter: { diff: number; ds: number }[] = [];
  for (let k = 0; k < x.periods; k++) {
    const diff = (x.iDom - x.iFor) + 0.01 * gauss(r);
    const ds = x.uipBeta * diff + x.noiseSd * gauss(r);
    diffs.push(diff); dss.push(ds);
    scatter.push({ diff: +(diff * 100).toFixed(3), ds: +(ds * 100).toFixed(3) });
  }
  const reg = ols1(diffs, dss);
  const carry = (x.iDom - x.iFor) - mean(dss);
  return {
    cipBasis,
    forwardPremium: fwdPrem,
    realExchangeDrift: x.inflDom - x.inflFor,
    famaBeta: reg.beta,
    famaR2: reg.r2,
    carryReturn: carry,
    puzzle: reg.beta < 0,
    scatter,
  };
}

export interface SuddenStopInput {
  caDeficit: number;      // % of GDP before the stop
  externalDebt: number;   // % of GDP
  reserves: number;       // % of GDP
  shortTermShare: number; // share of debt maturing within a year
  flowReversal: number;   // fraction of inflows that vanish
  fxPassthrough: number;  // pass-through to domestic prices
  horizon: number;
}
export interface SuddenStopResult {
  t: number[];
  currentAccount: number[];
  depreciation: number[];  // cumulative %
  output: number[];        // % deviation
  reserveCover: number;    // Greenspan-Guidotti ratio
  requiredAdjustment: number;
  balanceSheetLoss: number;// valuation effect of FX debt
  crisis: boolean;
}
export function suddenStop(x: SuddenStopInput): SuddenStopResult {
  const reserveCover = x.reserves / Math.max(1e-6, x.externalDebt * x.shortTermShare);
  const requiredAdjustment = x.caDeficit * x.flowReversal;
  const crisis = reserveCover < 1 && x.flowReversal > 0.4;
  const t: number[] = [], ca: number[] = [], dep: number[] = [], y: number[] = [];
  let cum = 0;
  for (let k = 0; k <= x.horizon; k++) {
    const decay = Math.exp(-0.35 * k);
    const caK = -x.caDeficit + requiredAdjustment * (1 - decay);
    const depK = (requiredAdjustment * 4) * (1 - decay) * (crisis ? 1.6 : 1);
    cum = depK;
    const yK = -(requiredAdjustment * 1.5) * (1 - decay) * (crisis ? 1.8 : 1)
             + 0.4 * requiredAdjustment * (1 - Math.exp(-0.12 * k)); // expenditure switching recovery
    t.push(k); ca.push(caK); dep.push(depK); y.push(yK);
  }
  return {
    t, currentAccount: ca, depreciation: dep, output: y,
    reserveCover, requiredAdjustment,
    balanceSheetLoss: cum * x.externalDebt * x.fxPassthrough,
    crisis,
  };
}

/* ───────────────────── 8. Frontier macro ───────────────────── */

export type ExpectationKind = "rational" | "adaptive" | "sticky" | "diagnostic";
export interface ExpectationInput {
  kind: ExpectationKind;
  gain: number;        // adaptive learning gain
  stickiness: number;  // Mankiw-Reis share not updating
  diagnostic: number;  // Bordalo-Gennaioli-Shleifer overreaction θ
  rhoShock: number;
  shock: number;
  kappa: number;
  horizon: number;
}
export interface ExpectationResult {
  t: number[];
  actual: number[];
  expected: number[];
  forecastError: number[];
  cgCoefficient: number;   // Coibion-Gorodnichenko error-on-revision coefficient
  persistence: number;
  label: string;
}
export function expectationsLab(x: ExpectationInput): ExpectationResult {
  const t: number[] = [], actual: number[] = [], expected: number[] = [], err: number[] = [];
  const revisions: number[] = [], errs: number[] = [];
  let fund = 0, exp = 0, expPrev = 0;
  for (let k = 0; k <= x.horizon; k++) {
    fund = k === 0 ? x.shock : x.rhoShock * fund;
    const rationalExp = x.rhoShock * fund;
    let e = rationalExp;
    if (x.kind === "adaptive") e = exp + x.gain * (fund - exp);
    else if (x.kind === "sticky") e = x.stickiness * exp + (1 - x.stickiness) * rationalExp;
    else if (x.kind === "diagnostic") e = rationalExp * (1 + x.diagnostic);
    const realised = x.rhoShock * fund + x.kappa * 0;
    t.push(k); actual.push(fund); expected.push(e); err.push(realised - e);
    revisions.push(e - expPrev); errs.push(realised - e);
    expPrev = exp; exp = e;
  }
  const reg = ols1(revisions.slice(1), errs.slice(1));
  const label = x.kind === "rational" ? "理性预期 (FIRE)"
    : x.kind === "adaptive" ? "适应性学习 (constant gain)"
    : x.kind === "sticky" ? "黏性信息 (Mankiw-Reis)"
    : "诊断性预期 (BGS 过度反应)";
  return {
    t, actual, expected, forecastError: err,
    cgCoefficient: reg.beta,
    persistence: x.rhoShock,
    label,
  };
}

export interface UnconventionalInput {
  qeSize: number;          // purchases as % of GDP
  durationRemoved: number; // 10y-equivalent duration removed
  preferredHabitat: number;// elasticity of term premium to duration
  yccTarget: number | null;// yield cap in decimals (null = no YCC)
  signalling: number;      // expectations channel strength
  marketDepth: number;     // higher = smaller price impact
  horizon: number;
}
export interface UnconventionalResult {
  t: number[];
  termPremium: number[];   // bp
  yield10y: number[];      // %
  expectedShortRate: number[];
  balanceSheet: number[];  // % of GDP
  totalYieldDrop: number;  // bp
  channelSplit: { portfolio: number; signalling: number };
  yccDefends: boolean;
  yccPurchasesNeeded: number;
}
export function unconventionalPolicy(x: UnconventionalInput): UnconventionalResult {
  const portfolioBp = (x.durationRemoved * x.preferredHabitat * 100) / Math.max(0.2, x.marketDepth);
  const signallingBp = x.signalling * 60;
  const totalBp = portfolioBp + signallingBp;
  const t: number[] = [], tp: number[] = [], y10: number[] = [], exp: number[] = [], bs: number[] = [];
  const base = 0.03;
  for (let k = 0; k <= x.horizon; k++) {
    const ramp = 1 - Math.exp(-0.4 * k);
    const tpK = -portfolioBp * ramp;
    const expK = base - (signallingBp / 1e4) * ramp;
    let yK = expK + tpK / 1e4;
    if (x.yccTarget != null) yK = Math.min(yK, x.yccTarget);
    t.push(k); tp.push(tpK); y10.push(yK * 100); exp.push(expK * 100);
    bs.push(x.qeSize * ramp);
  }
  const unconstrained = base - totalBp / 1e4;
  const gap = x.yccTarget != null ? Math.max(0, unconstrained - x.yccTarget) : 0;
  return {
    t, termPremium: tp, yield10y: y10, expectedShortRate: exp, balanceSheet: bs,
    totalYieldDrop: totalBp,
    channelSplit: { portfolio: portfolioBp, signalling: signallingBp },
    yccDefends: x.yccTarget != null && gap <= 0,
    yccPurchasesNeeded: gap * 1e4 * 0.35 * Math.max(0.2, 1 / Math.max(0.2, x.marketDepth)),
  };
}

export interface BankCapitalInput {
  capitalRatio: number;    // equity / assets
  riskWeight: number;
  lossShock: number;       // asset loss as % of assets
  targetLeverage: number;  // assets / equity target
  creditElasticity: number;// output response to credit
  fireSaleImpact: number;  // price impact of deleveraging
  horizon: number;
}
export interface BankCapitalResult {
  t: number[];
  capital: number[];        // % of assets
  creditSupply: number[];   // % deviation
  output: number[];         // % deviation
  spread: number[];         // bp
  deleveragingMultiple: number;
  breachesMinimum: boolean;
  amplification: number;    // |Δoutput| / |lossShock|
}
export function bankCapitalAmplification(x: BankCapitalInput): BankCapitalResult {
  const t: number[] = [], cap: number[] = [], credit: number[] = [], out: number[] = [], spr: number[] = [];
  let capital = x.capitalRatio;
  let assetsDev = 0;
  for (let k = 0; k <= x.horizon; k++) {
    if (k === 0) capital = x.capitalRatio - x.lossShock;
    const shortfall = Math.max(0, x.capitalRatio - capital);
    const contraction = shortfall * x.targetLeverage;
    assetsDev = -contraction * (1 - Math.exp(-0.5 * (k + 1)));
    const fire = x.fireSaleImpact * Math.abs(assetsDev);
    capital = capital + 0.08 * shortfall - fire * 0.1;   // retained earnings vs mark-downs
    const spread = (shortfall * 800 + fire * 400) * Math.exp(-0.15 * k);
    t.push(k);
    cap.push(capital * 100);
    credit.push(assetsDev * 100);
    out.push(assetsDev * x.creditElasticity * 100);
    spr.push(spread);
  }
  const peakY = Math.max(...out.map(Math.abs)) / 100;
  return {
    t, capital: cap, creditSupply: credit, output: out, spread: spr,
    deleveragingMultiple: x.targetLeverage,
    breachesMinimum: x.capitalRatio - x.lossShock < 0.045 * x.riskWeight,
    amplification: x.lossShock > 0 ? peakY / x.lossShock : 0,
  };
}

export interface ClimateMacroInput {
  carbonPrice: number;     // USD / tCO2 at the end of the path
  energyShare: number;     // energy cost share of output
  transitionYears: number;
  greenInvestment: number; // % of GDP per year
  abatementElasticity: number;
  damageIntensity: number; // output loss per degree squared
  warmingBaseline: number; // degrees under no policy
}
export interface ClimateMacroResult {
  t: number[];
  emissions: number[];     // index, 100 = today
  outputCost: number[];    // % deviation (transition cost)
  inflation: number[];     // greenflation, pp
  physicalDamage: number[];// % of output
  netOutput: number[];
  warming: number;
  npvTransitionCost: number;
  crossover: number | null;// year when policy path dominates no-policy
}
export function climateMacroPath(x: ClimateMacroInput): ClimateMacroResult {
  const t: number[] = [], em: number[] = [], cost: number[] = [], infl: number[] = [], dam: number[] = [], net: number[] = [];
  const T = x.transitionYears;
  let npv = 0;
  let crossover: number | null = null;
  for (let k = 0; k <= T; k++) {
    const ramp = k / Math.max(1, T);
    const price = x.carbonPrice * ramp;
    const abate = 1 - Math.exp(-x.abatementElasticity * price / 100);
    const emissions = 100 * (1 - abate);
    const transCost = x.energyShare * (price / 100) * 100 * 0.5 + x.greenInvestment * 0.15;
    const greenflation = x.energyShare * (x.carbonPrice / Math.max(1, T)) / 100 * 100 * 0.6;
    const warmK = x.warmingBaseline * (0.4 + 0.6 * (emissions / 100));
    const damage = x.damageIntensity * warmK * warmK;
    const damageNoPolicy = x.damageIntensity * x.warmingBaseline * x.warmingBaseline;
    npv += transCost / Math.pow(1.03, k);
    if (crossover === null && k > 0 && transCost + damage < damageNoPolicy) crossover = k;
    t.push(k); em.push(emissions); cost.push(-transCost); infl.push(greenflation);
    dam.push(-damage); net.push(-(transCost + damage));
  }
  const finalEm = em[em.length - 1] / 100;
  return {
    t, emissions: em, outputCost: cost, inflation: infl, physicalDamage: dam, netOutput: net,
    warming: x.warmingBaseline * (0.4 + 0.6 * finalEm),
    npvTransitionCost: npv,
    crossover,
  };
}
