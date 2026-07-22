/**
 * V4.7 Behavioral Finance & Market Microstructure — pure, unit-tested models.
 *
 * Covers: quasi-hyperbolic discounting (Laibson), DSSW noise-trader IRF,
 * overconfidence / disposition-effect Monte-Carlo, Kyle (1985) equilibrium,
 * Glosten-Milgrom sequential-trade spread, Roll (1984) spread estimator,
 * Almgren-Chriss optimal execution, and Amihud illiquidity.
 *
 * Simplified log-linear / closed-form versions suited for teaching UIs.
 */

/* ─────────────────────────── 1. Quasi-hyperbolic (β-δ) discounting ─────────────────────────── */

export interface HyperbolicOut {
  years: number[];
  hyperbolic: number[];   // β·δᵗ (t≥1), 1 at t=0
  exponential: number[];  // δᵗ_e where δ_e chosen to match long-run
  preferenceReversal: boolean;
}

/** β-δ discount factors vs a comparable exponential baseline (δ_e = δ for fair comparison). */
export function hyperbolicDiscount(beta: number, delta: number, T: number): HyperbolicOut {
  const years: number[] = [];
  const hyperbolic: number[] = [];
  const exponential: number[] = [];
  for (let t = 0; t <= T; t++) {
    years.push(t);
    hyperbolic.push(t === 0 ? 1 : beta * Math.pow(delta, t));
    exponential.push(Math.pow(delta, t));
  }
  // Present-biased iff β < 1 => hyperbolic below exponential at t=1
  const preferenceReversal = beta < 1 && hyperbolic[1] < exponential[1] - 1e-12;
  return { years, hyperbolic, exponential, preferenceReversal };
}

/* ─────────────────────────── 2. DSSW noise-trader IRF ─────────────────────────── */

export interface DsswParams {
  rho: number;        // AR(1) persistence of sentiment
  shock: number;      // one-off sentiment shock at t=0
  arbShare: number;   // arbitrageur share σ ∈ (0,1); higher → tighter mispricing
  horizon: number;
}
export interface DsswOut { t: number[]; mispricing: number[]; sentiment: number[]; }

/** Simplified DSSW: mispricing(t) = (1−σ) · sentiment(t), sentiment AR(1). */
export function dsswNoiseTraderIRF(p: DsswParams): DsswOut {
  const t: number[] = [];
  const sent: number[] = [];
  const mp: number[] = [];
  let s = p.shock;
  for (let i = 0; i <= p.horizon; i++) {
    t.push(i);
    sent.push(s);
    mp.push((1 - p.arbShare) * s);
    s = p.rho * s;
  }
  return { t, mispricing: mp, sentiment: sent };
}

/* ─────────────────────────── 3. Overconfidence & disposition effect ─────────────────────────── */

export interface OverconfidenceParams {
  k: number;          // signal-precision inflation factor (>1 = overconfident)
  baseAlpha: number;  // gross alpha per unit exposure
  costPerTrade: number; // e.g. 0.001 = 10 bps
  turnoverBase: number; // baseline annual turnover
}
export interface OverconfidenceOut {
  turnover: number;
  grossAlpha: number;
  netAlpha: number;
  costDrag: number;
}

/** Barber-Odean style: overconfidence → turnover inflated by k, gross α unchanged, costs scale. */
export function overconfidenceOutcome(p: OverconfidenceParams): OverconfidenceOut {
  const turnover = p.turnoverBase * p.k;
  const grossAlpha = p.baseAlpha;
  const costDrag = turnover * p.costPerTrade;
  return { turnover, grossAlpha, netAlpha: grossAlpha - costDrag, costDrag };
}

export interface DispositionParams {
  N: number;
  drift: number;
  sigma: number;
  gainSellProb: number; // e.g. 0.15
  lossSellProb: number; // e.g. 0.05 → PGR/PLR ratio ~ 3
  seed?: number;
}
export interface DispositionSim {
  paths: { pnl: number[]; sold: number }[];
  pgr: number; // realized gains / (realized + unrealized gains)
  plr: number;
  ratio: number;
}

function lcg(seed: number) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function nrand(r: () => number) {
  // Box-Muller
  const u = Math.max(1e-12, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Simulate N one-year daily paths; agent sells with regime-dependent probability each day. */
export function dispositionSim(p: DispositionParams): DispositionSim {
  const rng = lcg(p.seed ?? 42);
  const days = 60;
  const dt = 1 / 252;
  let realizedGains = 0, unrealizedGains = 0, realizedLosses = 0, unrealizedLosses = 0;
  const paths: DispositionSim["paths"] = [];
  for (let i = 0; i < p.N; i++) {
    const pnl: number[] = [0];
    let x = 0;
    let sold = -1;
    for (let d = 1; d <= days; d++) {
      x += p.drift * dt + p.sigma * Math.sqrt(dt) * nrand(rng);
      pnl.push(x);
      if (sold < 0) {
        const prob = x > 0 ? p.gainSellProb : p.lossSellProb;
        if (rng() < prob) sold = d;
      }
    }
    if (sold >= 0) {
      if (pnl[sold] > 0) realizedGains++;
      else realizedLosses++;
    } else {
      if (pnl[days] > 0) unrealizedGains++;
      else unrealizedLosses++;
    }
    paths.push({ pnl, sold });
  }
  const pgr = realizedGains / Math.max(1, realizedGains + unrealizedGains);
  const plr = realizedLosses / Math.max(1, realizedLosses + unrealizedLosses);
  return { paths, pgr, plr, ratio: plr > 0 ? pgr / plr : Infinity };
}

/* ─────────────────────────── 4. Kyle (1985) batch auction ─────────────────────────── */

export interface KyleInputs { sigmaV: number; sigmaU: number; v: number; p0: number; }
export interface KyleOut {
  lambda: number; // price impact
  depth: number;  // 1/λ
  xStar: number;  // informed order
  expectedProfit: number; // (v−p0)²/(4λ)
  beta: number;   // trading intensity β = σ_u/σ_v (informed's coefficient on v)
}

/** Canonical Kyle single-period linear equilibrium. */
export function kyleEquilibrium({ sigmaV, sigmaU, v, p0 }: KyleInputs): KyleOut {
  if (sigmaV <= 0 || sigmaU <= 0) throw new Error("sigmas must be positive");
  const lambda = sigmaV / (2 * sigmaU);
  const beta = sigmaU / sigmaV;
  const xStar = (v - p0) / (2 * lambda);
  const expectedProfit = Math.pow(v - p0, 2) / (4 * lambda);
  return { lambda, depth: 1 / lambda, xStar, expectedProfit, beta };
}

/* ─────────────────────────── 5. Glosten-Milgrom & Roll spreads ─────────────────────────── */

export interface GMInputs { alpha: number; vH: number; vL: number; pi: number; }
export interface GMOut { ask: number; bid: number; spread: number; midToVH: number; }

/**
 * Sequential trade with informed fraction α and prior π = P(V=vH).
 * Uninformed buys/sells 50/50; informed always buys at vH, sells at vL.
 */
export function glostenMilgromSpread({ alpha, vH, vL, pi }: GMInputs): GMOut {
  const pBuyH = alpha + (1 - alpha) * 0.5;
  const pBuyL = (1 - alpha) * 0.5;
  const pSellH = (1 - alpha) * 0.5;
  const pSellL = alpha + (1 - alpha) * 0.5;
  const pBuy = pi * pBuyH + (1 - pi) * pBuyL;
  const pSell = pi * pSellH + (1 - pi) * pSellL;
  const postBuyH = (pi * pBuyH) / pBuy;
  const postSellH = (pi * pSellH) / pSell;
  const ask = postBuyH * vH + (1 - postBuyH) * vL;
  const bid = postSellH * vH + (1 - postSellH) * vL;
  return { ask, bid, spread: ask - bid, midToVH: (vH + vL) / 2 };
}

/** Roll (1984) implied effective spread: ŝ = 2·√(−cov(Δp_t, Δp_{t−1})). */
export function rollSpread(prices: number[]): { spread: number; covariance: number } {
  if (prices.length < 3) return { spread: 0, covariance: 0 };
  const dp: number[] = [];
  for (let i = 1; i < prices.length; i++) dp.push(prices[i] - prices[i - 1]);
  const n = dp.length - 1;
  const m1 = dp.slice(0, n).reduce((s, x) => s + x, 0) / n;
  const m2 = dp.slice(1).reduce((s, x) => s + x, 0) / n;
  let cov = 0;
  for (let i = 0; i < n; i++) cov += (dp[i] - m1) * (dp[i + 1] - m2);
  cov /= n;
  const spread = cov < 0 ? 2 * Math.sqrt(-cov) : 0;
  return { spread, covariance: cov };
}

/* ─────────────────────────── 6. Almgren-Chriss optimal execution ─────────────────────────── */

export interface ACInputs {
  X: number;      // total shares to liquidate
  T: number;      // horizon (years or arbitrary time unit)
  N: number;      // discretization steps
  eta: number;    // temporary impact (η)
  gamma: number;  // permanent impact (γ)
  sigma: number;  // price volatility
  lambda: number; // risk aversion (≥0)
  epsilon?: number; // fixed cost per trade
}
export interface ACOut {
  times: number[];
  holdings: number[];   // x_t (shares remaining)
  trades: number[];     // n_t (shares traded in interval)
  kappa: number;
  expectedCost: number;
  variance: number;
  linearVWAP: number[]; // baseline (λ=0) reference trajectory
}

/**
 * Almgren-Chriss closed-form solution:
 *   x_t = sinh(κ(T−t)) / sinh(κT) · X,   κ² = λσ²/η̃,  η̃ = η − γτ/2 (τ = T/N).
 * When λ→0 (or κ→0) the trajectory collapses to linear VWAP.
 */
export function almgrenChriss(p: ACInputs): ACOut {
  const { X, T, N, eta, gamma, sigma, lambda, epsilon = 0 } = p;
  const tau = T / N;
  const etaTilde = Math.max(eta - 0.5 * gamma * tau, 1e-12);
  const kappaSq = (lambda * sigma * sigma) / etaTilde;
  const kappa = Math.sqrt(Math.max(kappaSq, 0));
  const times: number[] = [];
  const holdings: number[] = [];
  const linearVWAP: number[] = [];
  const trades: number[] = [];
  const useLinear = kappa * T < 1e-6;
  const shx = Math.sinh(kappa * T);
  let prev = X;
  for (let k = 0; k <= N; k++) {
    const t = k * tau;
    const x = useLinear ? X * (1 - k / N) : (X * Math.sinh(kappa * (T - t))) / shx;
    times.push(t);
    holdings.push(x);
    linearVWAP.push(X * (1 - k / N));
    if (k > 0) trades.push(prev - x);
    prev = x;
  }
  // Expected cost: E[C] = 0.5·γ·X² + ε·|trades| + η̃·Σ n_t²/τ (permanent + fixed + temporary)
  let tempCost = 0;
  for (const n of trades) tempCost += (etaTilde * n * n) / tau;
  const expectedCost = 0.5 * gamma * X * X + epsilon * N + tempCost;
  // Variance: σ²·Σ τ·x_k² (using holdings at start of each interval)
  let variance = 0;
  for (let k = 0; k < N; k++) variance += sigma * sigma * tau * holdings[k] * holdings[k];
  return { times, holdings, trades, kappa, expectedCost, variance, linearVWAP };
}

/* ─────────────────────────── 7. Amihud illiquidity ─────────────────────────── */

/** ILLIQ = mean(|r_t| / dollarVolume_t). Returns NaN if any dollarVol ≤ 0. */
export function amihudIlliq(returns: number[], dollarVol: number[]): number {
  if (returns.length !== dollarVol.length || returns.length === 0) return NaN;
  let s = 0, n = 0;
  for (let i = 0; i < returns.length; i++) {
    if (dollarVol[i] <= 0) return NaN;
    s += Math.abs(returns[i]) / dollarVol[i];
    n++;
  }
  return s / n;
}