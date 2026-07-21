/**
 * V4.6 Macro Advanced — fiscal sustainability, FX overshooting, external balance,
 * financial accelerator, and ZLB / forward-guidance solvers.
 *
 * All models are simplified log-linear or accounting-identity forms suitable for
 * teaching / interactive UI; not calibrated general-equilibrium production code.
 */

/* ─────────────────────────── 1. Debt sustainability ─────────────────────────── */

export interface DebtParams {
  b0: number;         // initial debt/GDP (e.g. 1.0 = 100%)
  r: number;          // real interest rate (decimal)
  g: number;          // real growth rate (decimal)
  primarySurplus: number; // constant primary surplus / GDP (positive = surplus)
  horizon: number;    // years
}

export interface DebtPath {
  years: number[];
  debt: number[];         // b_t / GDP path
  interestBurden: number[]; // (r-g)/(1+g) * b_{t-1}
  stabilizingSurplus: number; // s* = (r-g)/(1+g) * b0
  explosive: boolean;     // r > g
  finalDebt: number;
}

/** Iterate b_{t+1} = ((1+r)/(1+g)) * b_t - s. */
export function debtDynamics(p: DebtParams): DebtPath {
  const factor = (1 + p.r) / (1 + p.g);
  const years: number[] = [0];
  const debt: number[] = [p.b0];
  const interestBurden: number[] = [0];
  let b = p.b0;
  for (let t = 1; t <= p.horizon; t++) {
    const prev = b;
    b = factor * b - p.primarySurplus;
    years.push(t);
    debt.push(b);
    interestBurden.push(((p.r - p.g) / (1 + p.g)) * prev);
  }
  const stabilizingSurplus = ((p.r - p.g) / (1 + p.g)) * p.b0;
  return {
    years,
    debt,
    interestBurden,
    stabilizingSurplus,
    explosive: p.r > p.g,
    finalDebt: b,
  };
}

/** Blanchard (r-g) fiscal-space score. Positive = pressure; negative = safe. */
export function fiscalSpaceScore(r: number, g: number): {
  rMinusG: number;
  regime: "safe" | "watch" | "danger";
  message: string;
} {
  const diff = r - g;
  if (diff < -0.005) return { rMinusG: diff, regime: "safe", message: "r<g: 债务在无盈余下自然消化" };
  if (diff < 0.01) return { rMinusG: diff, regime: "watch", message: "r≈g: 债务动态临界, 需监控" };
  return { rMinusG: diff, regime: "danger", message: "r>g: 未来需要正基本盈余以稳定债务" };
}

/* ─────────────────────────── 2. Dornbusch overshooting ─────────────────────────── */

export interface DornbuschParams {
  moneyShock: number; // Δm (log points, e.g. 0.05 = 5%)
  theta: number;      // price adjustment speed (>0)
  phi: number;        // money-demand income elasticity (unused in closed form; kept for slider)
  lambda: number;     // money-demand interest semi-elasticity (>0)
  horizon: number;    // periods (quarters)
}

export interface DornbuschPath {
  t: number[];
  price: number[];      // log price deviation
  exchange: number[];   // log nominal exchange rate deviation (+ = depreciation)
  interest: number[];   // domestic interest rate deviation
  longRunE: number;     // long-run exchange rate = Δm
  overshoot: number;    // e(0) - longRunE > 0
}

/**
 * Closed-form: after a permanent Δm shock, PPP long-run gives e*=Δm.
 * Sticky-price short-run: price adjusts p'(t)=θ(e - e*),  UIP: i = i* - Ė.
 * Solution:  p(t) = Δm (1 - e^{-θ t}),  e(t) = Δm + (e0 - Δm) e^{-θ t},
 * with initial overshoot e0 = Δm * (1 + 1/(λ θ)).
 */
export function dornbuschIRF(p: DornbuschParams): DornbuschPath {
  const eLong = p.moneyShock;
  const overshootFactor = 1 + 1 / Math.max(p.lambda * p.theta, 1e-6);
  const e0 = eLong * overshootFactor;
  const t: number[] = [];
  const price: number[] = [];
  const exchange: number[] = [];
  const interest: number[] = [];
  for (let k = 0; k <= p.horizon; k++) {
    const decay = Math.exp(-p.theta * k);
    const et = eLong + (e0 - eLong) * decay;
    const pt = eLong * (1 - decay);
    // Ė ≈ derivative → i - i* = -Ė = θ(e0 - eLong) e^{-θ t}
    const it = -p.theta * (e0 - eLong) * decay;
    t.push(k);
    price.push(pt);
    exchange.push(et);
    interest.push(it);
  }
  return { t, price, exchange, interest, longRunE: eLong, overshoot: e0 - eLong };
}

/* ─────────────────────────── 3. BOP three-gap identity ─────────────────────────── */

export interface BopInput {
  privateSaving: number;    // S/GDP
  investment: number;       // I/GDP
  taxes: number;            // T/GDP
  govSpending: number;      // G/GDP
}
export interface BopResult {
  privateGap: number;       // S - I
  fiscalGap: number;        // T - G  (positive = surplus)
  currentAccount: number;   // CA = (S-I) + (T-G)
  regime: "surplus" | "deficit" | "balanced";
}
/** Accounting identity: CA ≡ (S − I) + (T − G). */
export function bopGaps(x: BopInput): BopResult {
  const priv = x.privateSaving - x.investment;
  const fisc = x.taxes - x.govSpending;
  const ca = priv + fisc;
  const regime = Math.abs(ca) < 0.001 ? "balanced" : ca > 0 ? "surplus" : "deficit";
  return { privateGap: priv, fiscalGap: fisc, currentAccount: ca, regime };
}

/* ─────────────────────────── 4. BGG financial accelerator ─────────────────────────── */

export interface BGGParams {
  leverage: number;      // assets / net worth (k = A/N)
  mu: number;            // monitoring/bankruptcy cost, 0<μ<1
  sigmaOmega: number;    // idiosyncratic project risk
  rho: number;           // AR(1) persistence of net-worth shock
  shock: number;         // one-period net-worth innovation (log)
  horizon: number;
  frictionless?: boolean;// if true, EFP≡0 (RBC baseline)
}
export interface BGGPath {
  t: number[];
  netWorth: number[];    // n̂_t
  efp: number[];         // external finance premium (spread over risk-free)
  investment: number[];  // î_t
  output: number[];      // ŷ_t
  amplification: number; // peak |ŷ| / peak |n̂|
}

/**
 * Log-linear BGG-lite: EFP = ψ · (leverage) · (-n̂), where ψ = μ·σ_ω is the
 * elasticity of the external finance premium wrt leverage.  Investment
 * responds to −EFP; output is a Cobb-Douglas share of investment.
 */
export function bggAccelerator(p: BGGParams): BGGPath {
  const psi = p.frictionless ? 0 : p.mu * p.sigmaOmega * (p.leverage - 1);
  const t: number[] = [];
  const netWorth: number[] = [];
  const efp: number[] = [];
  const investment: number[] = [];
  const output: number[] = [];
  let n = 0;
  let peakN = 0, peakY = 0;
  for (let k = 0; k <= p.horizon; k++) {
    const innov = k === 0 ? p.shock : 0;
    n = p.rho * n + innov;
    const s = -psi * n; // negative n → positive EFP
    // investment elasticity ~ -3 wrt EFP, plus mechanical boost from n̂
    const i = 0.5 * n - 3 * s;
    const y = 0.3 * i; // capital share
    t.push(k);
    netWorth.push(n);
    efp.push(s);
    investment.push(i);
    output.push(y);
    peakN = Math.max(peakN, Math.abs(n));
    peakY = Math.max(peakY, Math.abs(y));
  }
  return { t, netWorth, efp, investment, output, amplification: peakN > 1e-8 ? peakY / peakN : 0 };
}

/* ─────────────────────────── 5. ZLB / Forward-guidance NK solver ─────────────────────────── */

export interface ZLBParams {
  sigma: number;    // IES inverse (1/σ = intertemporal elasticity coefficient)
  kappa: number;    // NKPC slope
  beta: number;     // discount factor
  phiPi: number;    // Taylor coefficient on inflation
  phiX: number;     // Taylor coefficient on output gap
  rNatural: number; // natural real rate deviation; negative = ZLB shock
  zlbPeriods: number; // how many periods rates are pinned at ZLB (i_t = 0)
  horizon: number;    // total periods
}

export interface ZLBPath {
  t: number[];
  output: number[];      // x_t
  inflation: number[];   // π_t
  policyRate: number[];  // i_t (nominal)
  binding: boolean[];    // whether ZLB is binding period-by-period
  outputImpact: number;  // x_0
}

/**
 * Backward-induction solver for the canonical 3-eq NK model with ZLB.
 * After zlbPeriods the ZLB is lifted; from that point on x=π=0 (RE steady state).
 * During ZLB: i_t = 0 forced, x_t = E_t x_{t+1} - (1/σ)(0 - E_t π_{t+1} - rNatural),
 *            π_t = β E_t π_{t+1} + κ x_t.
 * Iterate backward from horizon → 0. Returns forward guidance amplification.
 */
export function zlbNKSolve(p: ZLBParams): ZLBPath {
  const H = p.horizon;
  const x = new Array(H + 1).fill(0);
  const pi = new Array(H + 1).fill(0);
  const i = new Array(H + 1).fill(0);
  const binding: boolean[] = new Array(H + 1).fill(false);

  for (let k = p.zlbPeriods - 1; k >= 0; k--) {
    const Ex = k + 1 <= H ? x[k + 1] : 0;
    const Epi = k + 1 <= H ? pi[k + 1] : 0;
    // i = 0 pinned
    // x_k = Ex + (1/σ)(Epi + rNatural)  (rNatural negative → contractionary shock)
    x[k] = Ex + (1 / p.sigma) * (Epi + p.rNatural);
    pi[k] = p.beta * Epi + p.kappa * x[k];
    i[k] = 0;
    binding[k] = true;
  }
  // post-ZLB periods: policy follows Taylor rule but shocks gone → x=π=0, i=rNatural(=0 after shock ends)
  for (let k = p.zlbPeriods; k <= H; k++) {
    x[k] = 0;
    pi[k] = 0;
    i[k] = 0;
  }

  const t = Array.from({ length: H + 1 }, (_, k) => k);
  return { t, output: x, inflation: pi, policyRate: i, binding, outputImpact: x[0] };
}

/** Convenience: forward-guidance puzzle amplification vs 1-period ZLB. */
export function forwardGuidanceAmplification(base: ZLBParams, extraPeriods: number): number {
  const one = zlbNKSolve({ ...base, zlbPeriods: 1 });
  const ext = zlbNKSolve({ ...base, zlbPeriods: Math.max(1, base.zlbPeriods + extraPeriods) });
  return one.outputImpact !== 0 ? ext.outputImpact / one.outputImpact : 0;
}
