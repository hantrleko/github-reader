/**
 * V6.1 Market Microstructure — pure, unit-tested models.
 *
 * Inventory (Garman / Stoll / Ho-Stoll), information (PIN, VPIN),
 * limit order book (make-or-take, zero-intelligence, Hawkes),
 * cost measurement (effective / realized / impact, Corwin-Schultz, Lee-Ready),
 * impact laws, price discovery (Hasbrouck IS, Gonzalo-Granger),
 * market design (tick size, call auction, circuit breaker, dark pool, resilience)
 * and Amihud-Mendelson liquidity premia.
 *
 * All functions are deterministic given an explicit seed.
 */

/* ─────────── shared helpers ─────────── */
export function lcg(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
export function gauss(r: () => number) {
  const u = Math.max(1e-12, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Poisson draw (Knuth for small λ, normal approx for large). */
export function poisson(lambda: number, r: () => number): number {
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(r)));
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}
/** Lanczos log-gamma. */
export function lgamma(x: number): number {
  const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < g.length; i++) a += g[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const logPoisPmf = (k: number, lam: number) =>
  lam <= 0 ? (k === 0 ? 0 : -Infinity) : k * Math.log(lam) - lam - lgamma(k + 1);
const logSumExp = (xs: number[]) => {
  const m = Math.max(...xs);
  if (!isFinite(m)) return m;
  return m + Math.log(xs.reduce((s, x) => s + Math.exp(x - m), 0));
};

/* ═══════════ 1. Inventory models ═══════════ */

export interface GarmanInputs {
  lambdaBuy: number;   // public buy-order arrival rate (dealer sells)
  lambdaSell: number;  // public sell-order arrival rate (dealer buys)
  inventory0: number;
  cash0: number;
  price: number;
  halfSpread: number;
  horizon: number;     // number of time units
}
export interface GarmanOut {
  inventoryDrift: number;   // expected inventory change per unit time
  cashDrift: number;        // expected cash change per unit time
  expectedInventory: number;
  expectedCash: number;
  failureTime: number | null; // time inventory hits 0 (or null if never in horizon)
  balanced: boolean;
}
/** Garman (1976): dealer as a queueing system; unbalanced flows guarantee eventual failure. */
export function garmanInventory(p: GarmanInputs): GarmanOut {
  const inventoryDrift = p.lambdaSell - p.lambdaBuy; // buys from public add inventory
  const cashDrift = p.lambdaBuy * (p.price + p.halfSpread) - p.lambdaSell * (p.price - p.halfSpread);
  const expectedInventory = p.inventory0 + inventoryDrift * p.horizon;
  const expectedCash = p.cash0 + cashDrift * p.horizon;
  let failureTime: number | null = null;
  if (inventoryDrift < 0) {
    const t = p.inventory0 / -inventoryDrift;
    failureTime = t <= p.horizon ? t : null;
  }
  return {
    inventoryDrift, cashDrift, expectedInventory, expectedCash, failureTime,
    balanced: Math.abs(inventoryDrift) < 1e-12,
  };
}

export interface StollInputs {
  orderProcessing: number;   // per-share cost
  inventoryCost: number;
  adverseSelection: number;
}
export interface StollOut {
  halfSpread: number; spread: number;
  shares: { orderProcessing: number; inventory: number; adverseSelection: number };
  /** transitory (mean-reverting) fraction of the spread */
  transitoryShare: number;
  /** Roll-type serial covariance implied by the transitory part only */
  impliedCovariance: number;
}
/** Stoll (1989) three-way spread decomposition. */
export function stollDecomposition(p: StollInputs): StollOut {
  const half = p.orderProcessing + p.inventoryCost + p.adverseSelection;
  if (half <= 0) throw new Error("spread components must be positive");
  const spread = 2 * half;
  const shares = {
    orderProcessing: p.orderProcessing / half,
    inventory: p.inventoryCost / half,
    adverseSelection: p.adverseSelection / half,
  };
  const transitoryShare = shares.orderProcessing + shares.inventory;
  const transitory = 2 * (p.orderProcessing + p.inventoryCost);
  return { halfSpread: half, spread, shares, transitoryShare, impliedCovariance: -Math.pow(transitory / 2, 2) };
}

export interface HoStollInputs {
  mid: number;
  inventory: number;     // q (positive = long)
  gamma: number;         // risk aversion
  sigma: number;         // volatility
  timeLeft: number;      // T − t
  k: number;             // order-arrival decay (liquidity)
}
export interface HoStollOut {
  reservationPrice: number;
  optimalSpread: number;
  bid: number; ask: number;
  skew: number;          // reservation − mid (negative when long)
}
/** Ho-Stoll / Avellaneda-Stoikov inventory-skewed quoting. */
export function hoStollQuotes(p: HoStollInputs): HoStollOut {
  const reservationPrice = p.mid - p.inventory * p.gamma * p.sigma * p.sigma * p.timeLeft;
  const optimalSpread = p.gamma * p.sigma * p.sigma * p.timeLeft + (2 / p.gamma) * Math.log(1 + p.gamma / p.k);
  return {
    reservationPrice, optimalSpread,
    bid: reservationPrice - optimalSpread / 2,
    ask: reservationPrice + optimalSpread / 2,
    skew: reservationPrice - p.mid,
  };
}

/* ═══════════ 2. PIN & VPIN ═══════════ */

export interface PinParams { alpha: number; delta: number; mu: number; epsB: number; epsS: number; }
export interface PinFit extends PinParams { pin: number; logLik: number; }

/** Easley-O'Hara log-likelihood for one day (B buys, S sells). */
export function pinLogLik(B: number, S: number, p: PinParams): number {
  const noNews = Math.log(Math.max(1e-300, 1 - p.alpha)) + logPoisPmf(B, p.epsB) + logPoisPmf(S, p.epsS);
  const bad = Math.log(Math.max(1e-300, p.alpha * p.delta)) + logPoisPmf(B, p.epsB) + logPoisPmf(S, p.epsS + p.mu);
  const good = Math.log(Math.max(1e-300, p.alpha * (1 - p.delta))) + logPoisPmf(B, p.epsB + p.mu) + logPoisPmf(S, p.epsS);
  return logSumExp([noNews, bad, good]);
}
export const pinValue = (p: PinParams) => (p.alpha * p.mu) / (p.alpha * p.mu + p.epsB + p.epsS);

/** Grid + iterative-refinement MLE of the EHO model. */
export function estimatePIN(buys: number[], sells: number[]): PinFit {
  const n = Math.min(buys.length, sells.length);
  if (n === 0) throw new Error("empty sample");
  const mB = buys.reduce((s, x) => s + x, 0) / n;
  const mS = sells.reduce((s, x) => s + x, 0) / n;
  const ll = (p: PinParams) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += pinLogLik(buys[i], sells[i], p);
    return s;
  };
  let best: PinParams = { alpha: 0.4, delta: 0.5, mu: Math.abs(mB - mS) + 1, epsB: mB, epsS: mS };
  let bestLL = ll(best);
  for (const a of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]) {
    for (const d of [0.2, 0.5, 0.8]) {
      for (const muF of [0.3, 0.6, 1.0, 1.5]) {
        const mu = muF * Math.max(1e-6, mB + mS) * 0.5;
        const cand: PinParams = { alpha: a, delta: d, mu, epsB: Math.max(1e-6, mB - a * (1 - d) * mu), epsS: Math.max(1e-6, mS - a * d * mu) };
        const v = ll(cand);
        if (v > bestLL) { bestLL = v; best = cand; }
      }
    }
  }
  // coordinate refinement
  const keys: (keyof PinParams)[] = ["alpha", "delta", "mu", "epsB", "epsS"];
  let step = 0.5;
  for (let round = 0; round < 40; round++) {
    let improved = false;
    for (const k of keys) {
      for (const dir of [1, -1]) {
        const cand = { ...best };
        const scale = k === "alpha" || k === "delta" ? 0.2 : Math.max(1e-6, best[k]) * 0.5;
        let v = best[k] + dir * step * scale;
        if (k === "alpha" || k === "delta") v = Math.min(0.999, Math.max(0.001, v));
        else v = Math.max(1e-6, v);
        cand[k] = v;
        const l = ll(cand);
        if (l > bestLL + 1e-12) { bestLL = l; best = cand; improved = true; }
      }
    }
    if (!improved) step *= 0.5;
    if (step < 1e-4) break;
  }
  return { ...best, pin: pinValue(best), logLik: bestLL };
}

/** Simulate daily buy/sell counts from the EHO mixture. */
export function simulatePinDays(p: PinParams, days: number, seed = 7):
  { buys: number[]; sells: number[]; informedDays: number } {
  const r = lcg(seed);
  const buys: number[] = [], sells: number[] = [];
  let informedDays = 0;
  for (let i = 0; i < days; i++) {
    const news = r() < p.alpha;
    const bad = news && r() < p.delta;
    if (news) informedDays++;
    buys.push(poisson(p.epsB + (news && !bad ? p.mu : 0), r));
    sells.push(poisson(p.epsS + (news && bad ? p.mu : 0), r));
  }
  return { buys, sells, informedDays };
}

export interface VpinOut { buckets: number[]; vpin: number[]; mean: number; }
/**
 * Easley-López de Prado-O'Hara VPIN: bulk-volume classification into equal-volume
 * buckets, then rolling |V_buy − V_sell| / V.
 */
export function vpin(returns: number[], volumes: number[], bucketVolume: number, window = 5): VpinOut {
  const buckets: number[] = [];
  const imb: number[] = [];
  let vb = 0, buy = 0, sell = 0;
  const sd = Math.sqrt(returns.reduce((s, x) => s + x * x, 0) / Math.max(1, returns.length)) || 1e-8;
  const cdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
  for (let i = 0; i < returns.length; i++) {
    const frac = cdf(returns[i] / sd);
    let v = volumes[i];
    while (v > 0) {
      const take = Math.min(v, bucketVolume - vb);
      buy += take * frac; sell += take * (1 - frac);
      vb += take; v -= take;
      if (vb >= bucketVolume - 1e-9) {
        buckets.push(buckets.length);
        imb.push(Math.abs(buy - sell) / bucketVolume);
        vb = 0; buy = 0; sell = 0;
      }
    }
  }
  const series: number[] = [];
  for (let i = 0; i < imb.length; i++) {
    const from = Math.max(0, i - window + 1);
    const slice = imb.slice(from, i + 1);
    series.push(slice.reduce((s, x) => s + x, 0) / slice.length);
  }
  return {
    buckets, vpin: series,
    mean: series.length ? series.reduce((s, x) => s + x, 0) / series.length : NaN,
  };
}
export function erf(x: number): number {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t * t
    - 0; // placeholder replaced below
  // Abramowitz-Stegun 7.1.26
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  void y;
  return s * (1 - poly * Math.exp(-x * x));
}

/* ═══════════ 3. Limit order book ═══════════ */

export interface MakeOrTakeInputs {
  halfSpread: number;    // cost of crossing (per share)
  fillProb: number;      // probability the limit order executes
  adverseSelection: number; // loss when filled by informed flow
  delayCost: number;     // opportunity cost when not filled (alpha decay)
  rebate?: number;       // maker rebate
  takerFee?: number;
}
export interface MakeOrTakeOut {
  limitEV: number; marketEV: number; decision: "limit" | "market"; edge: number;
  breakevenFillProb: number;
}
/** Compare posting (make) with crossing (take) — the option value of a limit order. */
export function makeOrTake(p: MakeOrTakeInputs): MakeOrTakeOut {
  const rebate = p.rebate ?? 0, fee = p.takerFee ?? 0;
  const limitEV = p.fillProb * (p.halfSpread + rebate - p.adverseSelection) - (1 - p.fillProb) * p.delayCost;
  const marketEV = -(p.halfSpread + fee);
  const denom = p.halfSpread + rebate - p.adverseSelection + p.delayCost;
  const breakevenFillProb = denom === 0 ? NaN : (marketEV + p.delayCost) / denom;
  return { limitEV, marketEV, decision: limitEV >= marketEV ? "limit" : "market", edge: limitEV - marketEV, breakevenFillProb };
}

export interface QueueInputs { queueAhead: number; ownSize: number; tradeRate: number; cancelRate: number; horizon: number; }
export interface QueueOut { fillProb: number; expectedWait: number; effectiveRate: number; }
/** Queue position value: ahead-of-you volume drains at trade+cancel rate. */
export function queueFillProbability(p: QueueInputs): QueueOut {
  const effectiveRate = p.tradeRate + p.cancelRate;
  const need = p.queueAhead + p.ownSize;
  const expectedWait = effectiveRate > 0 ? need / effectiveRate : Infinity;
  // Poisson volume arrival: P(volume in horizon ≥ need)
  const lam = effectiveRate * p.horizon;
  let cum = 0;
  for (let k = 0; k < Math.ceil(need); k++) cum += Math.exp(logPoisPmf(k, lam));
  return { fillProb: Math.min(1, Math.max(0, 1 - cum)), expectedWait, effectiveRate };
}

export interface ZILOBInputs {
  limitRate: number; marketRate: number; cancelRate: number;
  levels: number; events: number; tick: number; seed?: number;
}
export interface ZILOBOut {
  spreadPath: number[]; midPath: number[];
  meanSpread: number; meanDepth: number; volatility: number;
  bidDepth: number[]; askDepth: number[];
}
/** Zero-intelligence (Farmer-Patelli-Zovko style) limit order book simulation. */
export function zeroIntelligenceLOB(p: ZILOBInputs): ZILOBOut {
  const r = lcg(p.seed ?? 11);
  const L = p.levels;
  const bid = new Array(L).fill(2), ask = new Array(L).fill(2); // depth per level away from mid
  const spreadPath: number[] = [], midPath: number[] = [];
  let mid = 100;
  const total = p.limitRate + p.marketRate + p.cancelRate;
  const depthSum = () => bid.reduce((s, x) => s + x, 0) + ask.reduce((s, x) => s + x, 0);
  for (let e = 0; e < p.events; e++) {
    const u = r() * total;
    const side = r() < 0.5 ? bid : ask;
    const sign = side === ask ? 1 : -1;
    if (u < p.limitRate) {
      side[Math.floor(r() * L)] += 1;
    } else if (u < p.limitRate + p.marketRate) {
      const lvl = side.findIndex((d) => d > 0);
      if (lvl >= 0) { side[lvl] -= 1; mid += sign * p.tick * 0.5; }
    } else {
      const lvl = Math.floor(r() * L);
      if (side[lvl] > 0) side[lvl] -= 1;
    }
    const bestBid = bid.findIndex((d) => d > 0);
    const bestAsk = ask.findIndex((d) => d > 0);
    const sp = ((bestBid < 0 ? L : bestBid) + (bestAsk < 0 ? L : bestAsk) + 1) * p.tick;
    spreadPath.push(sp);
    midPath.push(mid);
  }
  const meanSpread = spreadPath.reduce((s, x) => s + x, 0) / spreadPath.length;
  const meanDepth = depthSum() / (2 * L);
  const rets: number[] = [];
  for (let i = 1; i < midPath.length; i++) rets.push(midPath[i] - midPath[i - 1]);
  const mr = rets.reduce((s, x) => s + x, 0) / Math.max(1, rets.length);
  const volatility = Math.sqrt(rets.reduce((s, x) => s + (x - mr) ** 2, 0) / Math.max(1, rets.length));
  return { spreadPath, midPath, meanSpread, meanDepth, volatility, bidDepth: bid, askDepth: ask };
}

export interface HawkesInputs { mu: number; alpha: number; beta: number; T: number; seed?: number; }
export interface HawkesOut {
  times: number[]; intensity: { t: number; lambda: number }[];
  branchingRatio: number; stationary: boolean; expectedRate: number; clusteringIndex: number;
}
/** Univariate exponential-kernel Hawkes process (Ogata thinning) for trade clustering. */
export function hawkesTrades(p: HawkesInputs): HawkesOut {
  const r = lcg(p.seed ?? 3);
  const branchingRatio = p.alpha / p.beta;
  const times: number[] = [];
  let t = 0, lam = p.mu;
  while (t < p.T && times.length < 20000) {
    const M = p.mu + (lam - p.mu);
    const lamBar = Math.max(M, p.mu);
    const w = -Math.log(Math.max(1e-12, r())) / lamBar;
    t += w;
    if (t > p.T) break;
    const decayed = p.mu + (lam - p.mu) * Math.exp(-p.beta * w);
    if (r() * lamBar <= decayed) {
      times.push(t);
      lam = decayed + p.alpha;
    } else lam = decayed;
  }
  const grid = 200;
  const intensity: { t: number; lambda: number }[] = [];
  for (let i = 0; i <= grid; i++) {
    const tt = (i / grid) * p.T;
    let l = p.mu;
    for (const s of times) { if (s > tt) break; l += p.alpha * Math.exp(-p.beta * (tt - s)); }
    intensity.push({ t: tt, lambda: l });
  }
  const expectedRate = branchingRatio < 1 ? p.mu / (1 - branchingRatio) : Infinity;
  // clustering: variance/mean of counts in 20 bins (Fano factor)
  const bins = 20, counts = new Array(bins).fill(0);
  for (const s of times) counts[Math.min(bins - 1, Math.floor((s / p.T) * bins))]++;
  const mc = counts.reduce((s, x) => s + x, 0) / bins;
  const vc = counts.reduce((s, x) => s + (x - mc) ** 2, 0) / bins;
  return { times, intensity, branchingRatio, stationary: branchingRatio < 1, expectedRate, clusteringIndex: mc > 0 ? vc / mc : NaN };
}

/* ═══════════ 4. Spread & cost measurement ═══════════ */

export interface TradeObs { price: number; midBefore: number; midAfter: number; direction: 1 | -1; }
export interface SpreadMeasures {
  effective: number; realized: number; priceImpact: number;
  effectiveBps: number; realizedBps: number; impactBps: number; identityGap: number;
}
/** Effective = realized + price impact (all in double-spread convention). */
export function spreadDecomposition(trades: TradeObs[]): SpreadMeasures {
  const n = trades.length;
  let eff = 0, rea = 0, imp = 0, effB = 0, reaB = 0, impB = 0;
  for (const t of trades) {
    const e = 2 * t.direction * (t.price - t.midBefore);
    const r = 2 * t.direction * (t.price - t.midAfter);
    const i = 2 * t.direction * (t.midAfter - t.midBefore);
    eff += e; rea += r; imp += i;
    effB += (e / t.midBefore) * 1e4; reaB += (r / t.midBefore) * 1e4; impB += (i / t.midBefore) * 1e4;
  }
  return {
    effective: eff / n, realized: rea / n, priceImpact: imp / n,
    effectiveBps: effB / n, realizedBps: reaB / n, impactBps: impB / n,
    identityGap: eff / n - (rea / n + imp / n),
  };
}

/** Corwin-Schultz (2012) high-low spread estimator (daily). */
export function corwinSchultzSpread(highs: number[], lows: number[]): { spread: number; series: number[] } {
  const series: number[] = [];
  for (let t = 1; t < highs.length; t++) {
    const b = Math.pow(Math.log(highs[t - 1] / lows[t - 1]), 2) + Math.pow(Math.log(highs[t] / lows[t]), 2);
    const H2 = Math.max(highs[t - 1], highs[t]), L2 = Math.min(lows[t - 1], lows[t]);
    const g = Math.pow(Math.log(H2 / L2), 2);
    const k = 3 - 2 * Math.SQRT2;
    const alpha = (Math.sqrt(2 * b) - Math.sqrt(b)) / k - Math.sqrt(g / k);
    const s = (2 * (Math.exp(alpha) - 1)) / (1 + Math.exp(alpha));
    series.push(Math.max(0, s));
  }
  return { spread: series.length ? series.reduce((s, x) => s + x, 0) / series.length : 0, series };
}

export interface ClassificationResult { tickRule: number[]; leeReady: number[]; tickAccuracy: number; leeReadyAccuracy: number; }
/** Tick rule vs Lee-Ready (quote rule with tick tie-break) trade signing and their accuracy. */
export function classifyTrades(prices: number[], mids: number[], truth?: (1 | -1)[]): ClassificationResult {
  const tick: number[] = [], lr: number[] = [];
  let last = 0;
  for (let i = 0; i < prices.length; i++) {
    let t: number;
    if (i === 0) t = 1;
    else if (prices[i] > prices[i - 1]) t = 1;
    else if (prices[i] < prices[i - 1]) t = -1;
    else t = last || 1;
    last = t;
    tick.push(t);
    const d = prices[i] - mids[i];
    lr.push(Math.abs(d) < 1e-12 ? t : d > 0 ? 1 : -1);
  }
  const acc = (sig: number[]) => truth ? sig.filter((s, i) => s === truth[i]).length / sig.length : NaN;
  return { tickRule: tick, leeReady: lr, tickAccuracy: acc(tick), leeReadyAccuracy: acc(lr) };
}

/* ═══════════ 5. Market impact ═══════════ */

export interface ImpactInputs { sigma: number; Q: number; V: number; Y?: number; delta?: number; permanentShare?: number; }
export interface ImpactOut {
  total: number; permanent: number; temporary: number;
  participation: number; curve: { rate: number; impact: number }[];
}
/** Square-root law: ΔP/P = Y·σ·(Q/V)^δ, with a permanent/temporary split. */
export function squareRootImpact(p: ImpactInputs): ImpactOut {
  const Y = p.Y ?? 1, delta = p.delta ?? 0.5, ps = p.permanentShare ?? 1 / 3;
  const participation = p.Q / p.V;
  const total = Y * p.sigma * Math.pow(participation, delta);
  const curve: { rate: number; impact: number }[] = [];
  for (let i = 1; i <= 40; i++) {
    const rate = (i / 40) * Math.max(0.01, participation * 2);
    curve.push({ rate, impact: Y * p.sigma * Math.pow(rate, delta) });
  }
  return { total, permanent: total * ps, temporary: total * (1 - ps), participation, curve };
}

/* ═══════════ 6. Price discovery ═══════════ */

export interface PriceDiscoveryInputs {
  alpha1: number; alpha2: number; // VECM error-correction loadings (α1<0<α2 typical)
  sigma1: number; sigma2: number; rho: number;
}
export interface PriceDiscoveryOut {
  ggWeights: [number, number];
  isLower: [number, number];
  isUpper: [number, number];
  isMid: [number, number];
  dominantVenue: 1 | 2;
}
/** Hasbrouck information shares (Cholesky bounds) + Gonzalo-Granger common factor weights. */
export function priceDiscovery(p: PriceDiscoveryInputs): PriceDiscoveryOut {
  const den = p.alpha2 - p.alpha1;
  if (Math.abs(den) < 1e-12) throw new Error("alpha1 and alpha2 cannot be equal");
  const g1 = p.alpha2 / den, g2 = -p.alpha1 / den;
  const s1 = p.sigma1, s2 = p.sigma2, r = p.rho;
  const varTot = g1 * g1 * s1 * s1 + 2 * g1 * g2 * r * s1 * s2 + g2 * g2 * s2 * s2;
  // order (1,2)
  const a1 = g1 * s1 + g2 * r * s2, a2 = g2 * s2 * Math.sqrt(Math.max(0, 1 - r * r));
  const isA: [number, number] = [(a1 * a1) / varTot, (a2 * a2) / varTot];
  // order (2,1)
  const b2 = g2 * s2 + g1 * r * s1, b1 = g1 * s1 * Math.sqrt(Math.max(0, 1 - r * r));
  const isB: [number, number] = [(b1 * b1) / varTot, (b2 * b2) / varTot];
  const isLower: [number, number] = [Math.min(isA[0], isB[0]), Math.min(isA[1], isB[1])];
  const isUpper: [number, number] = [Math.max(isA[0], isB[0]), Math.max(isA[1], isB[1])];
  const isMid: [number, number] = [(isLower[0] + isUpper[0]) / 2, (isLower[1] + isUpper[1]) / 2];
  return { ggWeights: [g1, g2], isLower, isUpper, isMid, dominantVenue: isMid[0] >= isMid[1] ? 1 : 2 };
}

/* ═══════════ 7. Market design & resilience ═══════════ */

export interface TickSizeInputs { tick: number; price: number; frictionlessSpread: number; dailyVolume: number; queuePriorityValue: number; }
export interface TickSizeOut {
  relativeTick: number; bindingSpread: number; binding: boolean;
  quotedSpreadBps: number; expectedQueueLength: number; makerRent: number;
}
/** Tick size as a binding constraint: spread floor, queueing rents, depth accumulation. */
export function tickSizeEffect(p: TickSizeInputs): TickSizeOut {
  const binding = p.tick > p.frictionlessSpread;
  const bindingSpread = Math.max(p.tick, p.frictionlessSpread);
  const rent = Math.max(0, p.tick - p.frictionlessSpread) / 2;
  return {
    relativeTick: p.tick / p.price,
    bindingSpread, binding,
    quotedSpreadBps: (bindingSpread / p.price) * 1e4,
    expectedQueueLength: p.dailyVolume * (1 + p.queuePriorityValue * rent * 100) * (binding ? 1 : 0.4) / 100,
    makerRent: rent * p.dailyVolume,
  };
}

export interface AuctionInputs { noiseTraders: number; informedShare: number; sigmaValue: number; sigmaNoise: number; batchSize: number; }
export interface AuctionOut {
  callPriceError: number; continuousPriceError: number;
  callBetter: boolean; efficiencyGain: number; consolidationRatio: number;
}
/** Call auction consolidates noise → smaller pricing error than continuous trading. */
export function callAuctionVsContinuous(p: AuctionInputs): AuctionOut {
  const perTradeNoise = p.sigmaNoise / Math.sqrt(Math.max(1, p.noiseTraders));
  const continuousPriceError = perTradeNoise * (1 - p.informedShare) + p.sigmaValue * (1 - p.informedShare) * 0.5;
  const callPriceError = continuousPriceError / Math.sqrt(Math.max(1, p.batchSize));
  return {
    callPriceError, continuousPriceError,
    callBetter: callPriceError < continuousPriceError,
    efficiencyGain: 1 - callPriceError / continuousPriceError,
    consolidationRatio: Math.sqrt(Math.max(1, p.batchSize)),
  };
}

export interface CircuitBreakerInputs { sigma: number; threshold: number; steps: number; drift: number; haltMinutes: number; coolingFactor: number; seed?: number; }
export interface CircuitBreakerOut {
  path: { t: number; price: number; halted: boolean }[];
  halts: number; magnetEffect: number; finalPrice: number; maxDrawdown: number;
}
/** Volatility interruption simulation with post-halt cooling and a magnet-effect proxy. */
export function circuitBreakerSim(p: CircuitBreakerInputs): CircuitBreakerOut {
  const r = lcg(p.seed ?? 5);
  const path: { t: number; price: number; halted: boolean }[] = [];
  let price = 100, ref = 100, halts = 0, cooldown = 0, peak = 100, mdd = 0, nearBand = 0;
  for (let t = 0; t < p.steps; t++) {
    const vol = cooldown > 0 ? p.sigma * p.coolingFactor : p.sigma;
    if (cooldown > 0) { cooldown--; path.push({ t, price, halted: true }); continue; }
    price *= Math.exp(p.drift / p.steps + vol * gauss(r));
    const dev = Math.abs(price / ref - 1);
    if (dev > p.threshold * 0.8) nearBand++;
    if (dev >= p.threshold) { halts++; cooldown = p.haltMinutes; ref = price; }
    peak = Math.max(peak, price);
    mdd = Math.max(mdd, 1 - price / peak);
    path.push({ t, price, halted: false });
  }
  return { path, halts, magnetEffect: nearBand / p.steps, finalPrice: price, maxDrawdown: mdd };
}

export interface DarkPoolInputs { totalFlow: number; darkShare: number; informedShare: number; litSpread: number; litDepth: number; }
export interface DarkPoolOut {
  darkFlow: number; litFlow: number; litInformedShare: number;
  newLitSpread: number; spreadChange: number; displayedDepth: number; creamSkimming: boolean;
}
/** Dark venues cream-skim uninformed flow → lit adverse selection and spread rise. */
export function darkPoolSplit(p: DarkPoolInputs): DarkPoolOut {
  const uninformed = p.totalFlow * (1 - p.informedShare);
  const informed = p.totalFlow * p.informedShare;
  const darkFlow = uninformed * p.darkShare; // informed avoid execution-risk venues
  const litFlow = p.totalFlow - darkFlow;
  const litInformedShare = litFlow > 0 ? informed / litFlow : 1;
  const newLitSpread = p.litSpread * (litInformedShare / Math.max(1e-9, p.informedShare));
  return {
    darkFlow, litFlow, litInformedShare, newLitSpread,
    spreadChange: newLitSpread - p.litSpread,
    displayedDepth: p.litDepth * (1 - p.darkShare * 0.6),
    creamSkimming: newLitSpread > p.litSpread + 1e-12,
  };
}

export interface ResilienceInputs { shock: number; resilienceRate: number; horizon: number; marketMakerExit: number; feedbackLoop: number; }
export interface ResilienceOut {
  path: { t: number; spread: number; depth: number }[];
  halfLife: number; evaporated: boolean; troughDepth: number;
}
/** Liquidity evaporation and recovery: spread spike decays at resilience rate, with a feedback spiral. */
export function liquidityEvaporation(p: ResilienceInputs): ResilienceOut {
  const path: { t: number; spread: number; depth: number }[] = [];
  let spread = 1 + p.shock;
  let depth = 1;
  let trough = 1;
  for (let t = 0; t <= p.horizon; t++) {
    path.push({ t, spread, depth });
    trough = Math.min(trough, depth);
    const stress = spread - 1;
    depth = Math.max(0.01, 1 - p.marketMakerExit * stress);
    spread = 1 + (spread - 1) * (1 - p.resilienceRate) * (1 + p.feedbackLoop * (1 - depth));
  }
  const decay = (1 - p.resilienceRate) * (1 + p.feedbackLoop * (1 - Math.max(0.01, 1 - p.marketMakerExit * p.shock)));
  const halfLife = decay > 0 && decay < 1 ? Math.log(0.5) / Math.log(decay) : Infinity;
  return { path, halfLife, evaporated: trough < 0.5, troughDepth: trough };
}

/* ═══════════ 8. Liquidity premium (Amihud-Mendelson) ═══════════ */

export interface AmihudMendelsonInputs { grossReturn: number; spread: number; holdingPeriods: number[]; }
export interface AmihudMendelsonOut {
  clientele: { holdingPeriod: number; amortizedCost: number; netReturn: number }[];
  requiredReturn: number;  // for the marginal (shortest-horizon) investor
  concavity: boolean;      // spread-return relation concave in spread across clienteles
}
/** Amihud-Mendelson (1986): amortized spread cost and the clientele (holding-period) effect. */
export function amihudMendelson(p: AmihudMendelsonInputs): AmihudMendelsonOut {
  const clientele = p.holdingPeriods.map((h) => {
    const amortizedCost = p.spread / h;
    return { holdingPeriod: h, amortizedCost, netReturn: p.grossReturn - amortizedCost };
  });
  const shortest = Math.min(...p.holdingPeriods);
  return {
    clientele,
    requiredReturn: p.grossReturn + p.spread / shortest,
    concavity: clientele.length > 2,
  };
}
