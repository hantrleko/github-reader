/**
 * Advanced derivatives library — V4.2.
 * Six research-grade tools: Merton/Kou jump-diffusion, Bates + variance swap,
 * Crank-Nicolson PDE (European, PSOR American, barrier), dynamic delta-hedge
 * P&L attribution, autocallable structured notes, and XVA (CVA/DVA/FVA).
 *
 * Pure, framework-free, and covered by src/lib/quant/__tests__/derivAdvanced.test.ts.
 */
import { blackScholes } from "./blackScholes";

/* ── deterministic RNG ── */
export function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x9e3779b9) >>> 0;
    return (s >>> 0) / 4294967296;
  };
}
export function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ══════════════════════════════════════════════════════════════
   1. Merton (1976) jump-diffusion — closed-form series
   ══════════════════════════════════════════════════════════════ */
export interface MertonInputs {
  S: number; K: number; T: number; r: number; sigma: number;
  lambda: number; muJ: number; sigmaJ: number;
  isCall?: boolean; nTerms?: number;
}
export function mertonJumpPrice(o: MertonInputs): number {
  const { S, K, T, r, sigma, lambda, muJ, sigmaJ, isCall = true, nTerms = 40 } = o;
  const m = Math.exp(muJ + 0.5 * sigmaJ * sigmaJ) - 1; // E[e^J]-1
  const lambdaP = lambda * (1 + m);
  let price = 0;
  let factorial = 1;
  for (let n = 0; n < nTerms; n++) {
    if (n > 0) factorial *= n;
    const sigmaN = Math.sqrt(sigma * sigma + (n * sigmaJ * sigmaJ) / T);
    const rN = r - lambda * m + (n * Math.log(1 + m)) / T;
    const bs = blackScholes({ S, K, T, r: rN, sigma: sigmaN });
    const w = Math.exp(-lambdaP * T) * Math.pow(lambdaP * T, n) / factorial;
    price += w * (isCall ? bs.call : bs.put);
  }
  return price;
}

/* ══════════════════════════════════════════════════════════════
   2. Kou (2002) double-exponential jump — Monte Carlo
   ══════════════════════════════════════════════════════════════ */
export interface KouInputs {
  S: number; K: number; T: number; r: number; sigma: number;
  lambda: number; p: number; etaUp: number; etaDown: number;
  isCall?: boolean; nPaths?: number; seed?: number;
}
/** E[e^J]-1 under Kou */
function kouJumpMean(p: number, etaUp: number, etaDown: number): number {
  return (p * etaUp) / (etaUp - 1) + ((1 - p) * etaDown) / (etaDown + 1) - 1;
}
export function kouJumpPrice(o: KouInputs): number {
  const { S, K, T, r, sigma, lambda, p, etaUp, etaDown, isCall = true, nPaths = 20000, seed = 7 } = o;
  const rng = makeRng(seed);
  const drift = r - 0.5 * sigma * sigma - lambda * kouJumpMean(p, etaUp, etaDown);
  let sum = 0;
  for (let i = 0; i < nPaths; i++) {
    let logS = Math.log(S) + drift * T + sigma * Math.sqrt(T) * randn(rng);
    // Poisson number of jumps
    const L = Math.exp(-lambda * T);
    let k = 0, prod = rng();
    while (prod > L) { k++; prod *= rng(); }
    for (let j = 0; j < k; j++) {
      const u = rng();
      const jump = u < p
        ? -Math.log(1 - rng()) / etaUp
        : Math.log(1 - rng()) / etaDown;
      logS += jump;
    }
    const ST = Math.exp(logS);
    sum += isCall ? Math.max(ST - K, 0) : Math.max(K - ST, 0);
  }
  return Math.exp(-r * T) * (sum / nPaths);
}

/* ══════════════════════════════════════════════════════════════
   3. Bates (Heston + jumps) Monte Carlo & variance swap replication
   ══════════════════════════════════════════════════════════════ */
export interface BatesInputs {
  S: number; K: number; T: number; r: number;
  v0: number; kappa: number; theta: number; xi: number; rho: number;
  lambda: number; muJ: number; sigmaJ: number;
  isCall?: boolean; nPaths?: number; nSteps?: number; seed?: number;
}
export interface BatesResult { price: number; realizedVar: number; }
export function batesMCPrice(o: BatesInputs): BatesResult {
  const {
    S, K, T, r, v0, kappa, theta, xi, rho,
    lambda, muJ, sigmaJ, isCall = true, nPaths = 5000, nSteps = 100, seed = 11,
  } = o;
  const dt = T / nSteps;
  const m = Math.exp(muJ + 0.5 * sigmaJ * sigmaJ) - 1;
  const rng = makeRng(seed);
  let payoff = 0, varSum = 0;
  for (let p = 0; p < nPaths; p++) {
    let St = S, vt = v0, logRetSq = 0;
    for (let s = 0; s < nSteps; s++) {
      const z1 = randn(rng);
      const z2 = rho * z1 + Math.sqrt(1 - rho * rho) * randn(rng);
      const vPos = Math.max(vt, 0);
      const sqrtV = Math.sqrt(vPos);
      const prevLog = Math.log(St);
      // asset step (log-Euler)
      St = St * Math.exp((r - lambda * m - 0.5 * vPos) * dt + sqrtV * Math.sqrt(dt) * z1);
      // jump
      if (rng() < lambda * dt) {
        const jump = muJ + sigmaJ * randn(rng);
        St = St * Math.exp(jump);
      }
      // variance step (full truncation Euler)
      vt = vt + kappa * (theta - vPos) * dt + xi * sqrtV * Math.sqrt(dt) * z2;
      const d = Math.log(St) - prevLog;
      logRetSq += d * d;
    }
    payoff += isCall ? Math.max(St - K, 0) : Math.max(K - St, 0);
    varSum += logRetSq / T;
  }
  return { price: Math.exp(-r * T) * (payoff / nPaths), realizedVar: varSum / nPaths };
}

/**
 * Model-free variance swap fair strike via static replication of
 * log-contract using OTM puts (K <= S*) and OTM calls (K >= S*),
 * trapezoidal integration on the given strike grid.
 */
export interface VarSwapInputs {
  S0: number; T: number; r: number;
  strikes: number[]; ivs: number[]; // per-strike implied vols
}
export function varianceSwapFairStrike(o: VarSwapInputs): number {
  const { S0, T, r, strikes, ivs } = o;
  if (strikes.length !== ivs.length || strikes.length < 3) return NaN;
  const Sstar = S0; // ATM cutoff
  // integrand: put(K)/K^2 for K <= S*, call(K)/K^2 for K >= S*
  let integral = 0;
  for (let i = 0; i < strikes.length - 1; i++) {
    const K1 = strikes[i], K2 = strikes[i + 1];
    const useCall1 = K1 >= Sstar;
    const useCall2 = K2 >= Sstar;
    const bs1 = blackScholes({ S: S0, K: K1, T, r, sigma: ivs[i] });
    const bs2 = blackScholes({ S: S0, K: K2, T, r, sigma: ivs[i + 1] });
    const p1 = useCall1 ? bs1.call : bs1.put;
    const p2 = useCall2 ? bs2.call : bs2.put;
    integral += 0.5 * (p1 / (K1 * K1) + p2 / (K2 * K2)) * (K2 - K1);
  }
  const term = r * T
    - (S0 / Sstar - 1)
    - Math.log(Sstar / S0)
    + Math.exp(r * T) * integral;
  return (2 / T) * term;
}

/* ══════════════════════════════════════════════════════════════
   4. Crank-Nicolson PDE (European + PSOR American + barrier)
   ══════════════════════════════════════════════════════════════ */
function thomasSolve(a: number[], b: number[], c: number[], d: number[]): number[] {
  const n = d.length;
  const cp = new Array(n), dp = new Array(n), x = new Array(n);
  cp[0] = c[0] / b[0]; dp[0] = d[0] / b[0];
  for (let i = 1; i < n; i++) {
    const denom = b[i] - a[i] * cp[i - 1];
    cp[i] = c[i] / denom;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / denom;
  }
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
  return x;
}

export interface PdeInputs {
  S: number; K: number; T: number; r: number; sigma: number; q?: number;
  isCall?: boolean; american?: boolean;
  NS?: number; NT?: number; Smax?: number;
  barrier?: { level: number; type: "down-out" | "up-out" };
}
export interface PdeResult { price: number; grid: number[]; values: number[]; }

export function crankNicolsonBS(o: PdeInputs): PdeResult {
  const {
    S, K, T, r, sigma, q = 0, isCall = true, american = false,
    NS = 200, NT = 200, Smax = 4 * Math.max(S, K), barrier,
  } = o;
  const dS = Smax / NS;
  const dt = T / NT;
  const grid: number[] = Array.from({ length: NS + 1 }, (_, i) => i * dS);
  const payoff = (s: number) => isCall ? Math.max(s - K, 0) : Math.max(K - s, 0);
  let V = grid.map(payoff);

  // barrier: knock-out => value at/beyond barrier is 0
  const applyBarrier = (arr: number[]) => {
    if (!barrier) return;
    for (let i = 0; i <= NS; i++) {
      if (barrier.type === "down-out" && grid[i] <= barrier.level) arr[i] = 0;
      if (barrier.type === "up-out" && grid[i] >= barrier.level) arr[i] = 0;
    }
  };
  applyBarrier(V);

  // build tridiagonal coefficients (theta = 0.5)
  const alpha = new Array(NS + 1), beta = new Array(NS + 1), gamma = new Array(NS + 1);
  for (let i = 1; i < NS; i++) {
    const sig2 = sigma * sigma * i * i;
    alpha[i] = 0.25 * dt * (sig2 - (r - q) * i);
    beta[i]  = -0.5  * dt * (sig2 + r);
    gamma[i] = 0.25 * dt * (sig2 + (r - q) * i);
  }
  const omega = 1.2, tol = 1e-7;

  for (let n = NT - 1; n >= 0; n--) {
    const rhs = new Array(NS - 1);
    for (let i = 1; i < NS; i++) {
      rhs[i - 1] = alpha[i] * V[i - 1] + (1 + beta[i]) * V[i] + gamma[i] * V[i + 1];
    }
    // boundary at t = n*dt
    const tRem = T - n * dt;
    const V0 = isCall ? 0 : K * Math.exp(-r * tRem);
    const Vmax = isCall ? Smax - K * Math.exp(-r * tRem) : 0;
    rhs[0] += alpha[1] * V0;
    rhs[NS - 2] += gamma[NS - 1] * Vmax;

    // A matrix: (1-beta_i) center, -alpha diag-low, -gamma diag-up
    const a = new Array(NS - 1), b = new Array(NS - 1), c = new Array(NS - 1);
    for (let i = 1; i < NS; i++) {
      a[i - 1] = -alpha[i];
      b[i - 1] = 1 - beta[i];
      c[i - 1] = -gamma[i];
    }
    let newInterior: number[];
    if (!american) {
      newInterior = thomasSolve(a, b, c, rhs);
    } else {
      // Projected SOR
      newInterior = V.slice(1, NS);
      for (let iter = 0; iter < 5000; iter++) {
        let maxDiff = 0;
        for (let i = 0; i < NS - 1; i++) {
          const left = i > 0 ? newInterior[i - 1] : V0;
          const right = i < NS - 2 ? newInterior[i + 1] : Vmax;
          const gs = (rhs[i] - a[i] * left - c[i] * right) / b[i];
          let next = newInterior[i] + omega * (gs - newInterior[i]);
          const pv = payoff(grid[i + 1]);
          if (next < pv) next = pv;
          const diff = Math.abs(next - newInterior[i]);
          if (diff > maxDiff) maxDiff = diff;
          newInterior[i] = next;
        }
        if (maxDiff < tol) break;
      }
    }

    V = [V0, ...newInterior, Vmax];
    applyBarrier(V);
  }

  // interpolate at S
  const idx = Math.min(NS - 1, Math.max(0, Math.floor(S / dS)));
  const w = (S - grid[idx]) / dS;
  const price = (1 - w) * V[idx] + w * V[idx + 1];
  return { price, grid, values: V };
}

/* ══════════════════════════════════════════════════════════════
   5. Dynamic Delta-hedge P&L attribution
   ══════════════════════════════════════════════════════════════ */
export interface HedgeInputs {
  S: number; K: number; T: number; r: number;
  sigmaPricing: number; sigmaReal: number;
  nSteps?: number; nPaths?: number; cost?: number; seed?: number;
  isCall?: boolean;
}
export interface HedgeResult {
  meanPnL: number; stdPnL: number;
  hist: { bucket: number; count: number }[];
  attribution: { gammaTheta: number; vega: number; discreteError: number; transactionCost: number };
}
export function hedgePnLSimulate(o: HedgeInputs): HedgeResult {
  const {
    S, K, T, r, sigmaPricing, sigmaReal,
    nSteps = 50, nPaths = 2000, cost = 0.0005, seed = 3, isCall = true,
  } = o;
  const dt = T / nSteps;
  const rng = makeRng(seed);
  const initBS = blackScholes({ S, K, T, r, sigma: sigmaPricing });
  const price0 = isCall ? initBS.call : initBS.put;
  const pnls: number[] = new Array(nPaths);
  let gtSum = 0, vegaSum = 0, discSum = 0, costSum = 0;

  for (let p = 0; p < nPaths; p++) {
    let St = S;
    let deltaPrev = isCall ? initBS.deltaCall : initBS.deltaPut;
    let cash = price0 - deltaPrev * S;
    let gt = 0, disc = 0, txn = 0;
    for (let n = 1; n <= nSteps; n++) {
      const tRem = T - n * dt;
      const z = randn(rng);
      const Snew = St * Math.exp((r - 0.5 * sigmaReal * sigmaReal) * dt + sigmaReal * Math.sqrt(dt) * z);
      const dS = Snew - St;
      // Gamma-Theta + discretization error
      const bs = blackScholes({ S: St, K, T: T - (n - 1) * dt, r, sigma: sigmaPricing });
      const gtStep = 0.5 * bs.gamma * dS * dS + (isCall ? bs.thetaCall : bs.thetaPut) * dt;
      gt += gtStep;
      cash *= Math.exp(r * dt);
      let deltaNew: number;
      if (tRem > 1e-8) {
        const bsNew = blackScholes({ S: Snew, K, T: tRem, r, sigma: sigmaPricing });
        deltaNew = isCall ? bsNew.deltaCall : bsNew.deltaPut;
      } else {
        deltaNew = isCall ? (Snew > K ? 1 : 0) : (Snew < K ? -1 : 0);
      }
      const trade = deltaNew - deltaPrev;
      cash -= trade * Snew;
      const txnStep = cost * Math.abs(trade) * Snew;
      cash -= txnStep;
      txn += txnStep;
      deltaPrev = deltaNew;
      St = Snew;
    }
    const finalOpt = isCall ? Math.max(St - K, 0) : Math.max(K - St, 0);
    const pnl = cash + deltaPrev * St - finalOpt;
    pnls[p] = pnl;
    gtSum += gt;
    discSum += disc;
    costSum += txn;
  }
  const mean = pnls.reduce((s, x) => s + x, 0) / nPaths;
  const variance = pnls.reduce((s, x) => s + (x - mean) ** 2, 0) / nPaths;
  const std = Math.sqrt(variance);

  // Vega x (sigma_real - sigma_pricing) x price0 vega
  const vegaComp = initBS.vega * (sigmaReal - sigmaPricing);

  // histogram (30 buckets)
  const lo = Math.min(...pnls), hi = Math.max(...pnls);
  const B = 30;
  const w = (hi - lo) / B || 1;
  const hist = Array.from({ length: B }, (_, i) => ({ bucket: +(lo + (i + 0.5) * w).toFixed(3), count: 0 }));
  for (const v of pnls) {
    const i = Math.min(B - 1, Math.max(0, Math.floor((v - lo) / w)));
    hist[i].count++;
  }
  return {
    meanPnL: mean, stdPnL: std, hist,
    attribution: {
      gammaTheta: gtSum / nPaths,
      vega: vegaComp,
      discreteError: mean - vegaComp - gtSum / nPaths + costSum / nPaths,
      transactionCost: -costSum / nPaths,
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   6. Autocallable structured note (Monte Carlo)
   ══════════════════════════════════════════════════════════════ */
export interface AutocallInputs {
  S0: number; T: number; r: number; sigma: number; q?: number;
  observations: number;     // n equally spaced obs
  autocallBarrier: number;  // as multiple of S0 (e.g. 1.0)
  kiBarrier: number;        // e.g. 0.65
  couponPerObs: number;     // e.g. 0.02
  notional?: number;
  nPaths?: number; seed?: number;
}
export interface AutocallResult {
  price: number;
  callProb: number[];         // per-observation call probability
  expectedLife: number;
  kiHitProb: number;
}
export function autocallablePrice(o: AutocallInputs): AutocallResult {
  const {
    S0, T, r, sigma, q = 0, observations, autocallBarrier, kiBarrier,
    couponPerObs, notional = 100, nPaths = 8000, seed = 5,
  } = o;
  const dtObs = T / observations;
  const rng = makeRng(seed);
  const callCount = new Array(observations).fill(0);
  let payoffSum = 0, lifeSum = 0, kiHits = 0;

  for (let p = 0; p < nPaths; p++) {
    let St = S0;
    let called = false, ki = false;
    let payoff = 0, lifeT = T;
    for (let k = 1; k <= observations; k++) {
      const z = randn(rng);
      St = St * Math.exp((r - q - 0.5 * sigma * sigma) * dtObs + sigma * Math.sqrt(dtObs) * z);
      if (St <= kiBarrier * S0) ki = true;
      if (St >= autocallBarrier * S0) {
        // early redemption at k
        payoff = notional * (1 + k * couponPerObs);
        lifeT = k * dtObs;
        callCount[k - 1]++;
        payoff *= Math.exp(-r * lifeT);
        called = true;
        break;
      }
    }
    if (!called) {
      // maturity
      if (ki && St < S0) {
        payoff = notional * (St / S0);
      } else {
        payoff = notional * (1 + observations * couponPerObs);
      }
      payoff *= Math.exp(-r * T);
    }
    payoffSum += payoff;
    lifeSum += lifeT;
    if (ki) kiHits++;
  }
  return {
    price: payoffSum / nPaths,
    callProb: callCount.map((c) => c / nPaths),
    expectedLife: lifeSum / nPaths,
    kiHitProb: kiHits / nPaths,
  };
}

/* ══════════════════════════════════════════════════════════════
   7. XVA — CVA / DVA / FVA on a stylised swap exposure
   ══════════════════════════════════════════════════════════════ */
export interface XvaInputs {
  notional: number;
  T: number;
  steps: number;
  r: number;
  sigma: number;          // rate volatility (bp-vol proxy)
  fixedRate: number;
  floatRate0: number;
  cptyHazard: number;     // lambda_C
  ownHazard: number;      // lambda_B
  recovery: number;       // R
  fundingSpread: number;  // s_F
  nPaths?: number; seed?: number;
}
export interface XvaResult {
  ee: number[]; ne: number[]; pfe95: number[];
  cva: number; dva: number; fva: number;
  times: number[];
}
export function xvaCompute(o: XvaInputs): XvaResult {
  const {
    notional, T, steps, r, sigma, fixedRate, floatRate0,
    cptyHazard, ownHazard, recovery, fundingSpread,
    nPaths = 3000, seed = 9,
  } = o;
  const dt = T / steps;
  const rng = makeRng(seed);
  const times: number[] = Array.from({ length: steps + 1 }, (_, i) => i * dt);
  const mtms: number[][] = Array.from({ length: nPaths }, () => new Array(steps + 1).fill(0));
  for (let p = 0; p < nPaths; p++) {
    let rt = floatRate0;
    for (let k = 0; k <= steps; k++) {
      // stylised MTM of a payer swap: (rate - fixed) x remainingTenor x notional
      const remain = T - k * dt;
      mtms[p][k] = (rt - fixedRate) * remain * notional;
      if (k < steps) rt = rt + sigma * Math.sqrt(dt) * randn(rng); // Bachelier
    }
  }
  const ee = new Array(steps + 1).fill(0);
  const ne = new Array(steps + 1).fill(0);
  const pfe = new Array(steps + 1).fill(0);
  for (let k = 0; k <= steps; k++) {
    const col: number[] = [];
    let posSum = 0, negSum = 0;
    for (let p = 0; p < nPaths; p++) {
      const v = mtms[p][k];
      col.push(v);
      if (v > 0) posSum += v;
      if (v < 0) negSum += v;
    }
    ee[k] = posSum / nPaths;
    ne[k] = negSum / nPaths;
    col.sort((a, b) => a - b);
    pfe[k] = col[Math.floor(0.95 * (nPaths - 1))];
  }
  let cva = 0, dva = 0, fva = 0;
  for (let k = 0; k < steps; k++) {
    const tMid = 0.5 * (times[k] + times[k + 1]);
    const disc = Math.exp(-r * tMid);
    const survC = Math.exp(-cptyHazard * times[k]) - Math.exp(-cptyHazard * times[k + 1]);
    const survB = Math.exp(-ownHazard * times[k]) - Math.exp(-ownHazard * times[k + 1]);
    const eeMid = 0.5 * (ee[k] + ee[k + 1]);
    const neMid = 0.5 * (ne[k] + ne[k + 1]);
    cva += (1 - recovery) * disc * eeMid * survC;
    dva += (1 - recovery) * disc * (-neMid) * survB;
    fva += fundingSpread * disc * eeMid * dt;
  }
  return { ee, ne, pfe95: pfe, cva, dva, fva, times };
}
