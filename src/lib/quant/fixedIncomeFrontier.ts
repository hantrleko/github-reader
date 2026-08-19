/**
 * V6.2 Fixed Income Frontier — pure, unit-tested models.
 *
 * Curve construction (bootstrap, interpolation, forwards/roll-down, day count),
 * spread taxonomy (nominal / Z / ASW / OAS option cost),
 * risk measures (effective duration & convexity, DV01, key-rate hedging, immunization),
 * embedded options (putable tree, convertible decomposition),
 * term-structure model glue (Hull-White theta, expectations vs term premium),
 * credit (spread decomposition, rating migration, CDS-bond basis),
 * structured products (waterfall, one-factor Gaussian copula tranches, MBS negative convexity),
 * leverage (repo carry, haircut margin spiral),
 * frontier (RFR compounding & fallback, negative-rate shifted lognormal, greenium, liquidity premium).
 *
 * Deterministic; randomness only via explicit seeds.
 */

/* ─────────── shared helpers ─────────── */
export function lcg(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}
export function normInv(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-7.78489400243029e-3, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [7.78469570904146e-3, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  let q: number, r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
/** Solve A x = b by Gaussian elimination with partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let k = 0; k < n; k++) {
    let piv = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
    [M[k], M[piv]] = [M[piv], M[k]];
    const d = M[k][k] || 1e-12;
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / d;
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / (M[i][i] || 1e-12);
  }
  return x;
}
function bisect(f: (x: number) => number, lo: number, hi: number, iters = 200): number {
  let a = lo, b = hi, fa = f(a);
  for (let i = 0; i < iters; i++) {
    const m = 0.5 * (a + b), fm = f(m);
    if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
  }
  return 0.5 * (a + b);
}

/* ═══════════ 1. Curve construction & conventions ═══════════ */

export interface ParInstrument { maturity: number; parRate: number; freq?: number }
export interface BootstrapPoint { maturity: number; discount: number; zero: number; parRate: number }

/**
 * Bootstrap discount factors from par (coupon) rates by coupon stripping.
 * Assumes each instrument pays `freq` coupons per year on a regular grid and
 * that earlier maturities are already solved.
 */
export function bootstrapCurve(instruments: ParInstrument[]): BootstrapPoint[] {
  const sorted = [...instruments].sort((a, b) => a.maturity - b.maturity);
  const known = new Map<number, number>();
  const out: BootstrapPoint[] = [];
  const dfAt = (t: number): number => {
    if (known.has(t)) return known.get(t)!;
    // log-linear interpolation on known nodes
    const ts = [...known.keys()].sort((a, b) => a - b);
    if (!ts.length) return 1;
    if (t <= ts[0]) return Math.pow(known.get(ts[0])!, t / ts[0]);
    if (t >= ts[ts.length - 1]) {
      const tl = ts[ts.length - 1];
      return Math.pow(known.get(tl)!, t / tl);
    }
    let i = 0;
    while (ts[i + 1] < t) i++;
    const t0 = ts[i], t1 = ts[i + 1];
    const l0 = Math.log(known.get(t0)!), l1 = Math.log(known.get(t1)!);
    return Math.exp(l0 + ((t - t0) / (t1 - t0)) * (l1 - l0));
  };
  for (const ins of sorted) {
    const freq = ins.freq ?? 2;
    const c = ins.parRate / freq;
    const n = Math.max(1, Math.round(ins.maturity * freq));
    let annuity = 0;
    for (let k = 1; k < n; k++) annuity += c * dfAt(k / freq);
    const df = (1 - annuity) / (1 + c);
    known.set(ins.maturity, df);
    out.push({
      maturity: ins.maturity,
      discount: df,
      zero: -Math.log(df) / ins.maturity,
      parRate: ins.parRate,
    });
  }
  return out;
}

export type InterpMethod = "linearZero" | "flatForward" | "cubicZero";

/**
 * Interpolate a zero curve and report the roughness of the implied instantaneous
 * forward curve (sum of squared second differences) — the classic diagnostic for
 * choosing an interpolation scheme.
 */
export function interpolateCurve(
  nodes: { maturity: number; zero: number }[],
  method: InterpMethod,
  grid = 60,
  maxT?: number,
) {
  const ns = [...nodes].sort((a, b) => a.maturity - b.maturity);
  const T = maxT ?? ns[ns.length - 1].maturity;
  const zeroAt = (t: number): number => {
    if (t <= ns[0].maturity) return ns[0].zero;
    if (t >= ns[ns.length - 1].maturity) return ns[ns.length - 1].zero;
    let i = 0;
    while (ns[i + 1].maturity < t) i++;
    const a = ns[i], b = ns[i + 1];
    const w = (t - a.maturity) / (b.maturity - a.maturity);
    if (method === "linearZero") return a.zero + w * (b.zero - a.zero);
    if (method === "flatForward") {
      // piecewise-constant forward ⇒ linear in t·z(t)
      const ya = a.zero * a.maturity, yb = b.zero * b.maturity;
      return (ya + w * (yb - ya)) / t;
    }
    // monotone-ish cubic (Catmull-Rom) on zeros
    const p0 = ns[Math.max(0, i - 1)].zero, p1 = a.zero, p2 = b.zero, p3 = ns[Math.min(ns.length - 1, i + 2)].zero;
    const w2 = w * w, w3 = w2 * w;
    return 0.5 * ((2 * p1) + (-p0 + p2) * w + (2 * p0 - 5 * p1 + 4 * p2 - p3) * w2 + (-p0 + 3 * p1 - 3 * p2 + p3) * w3);
  };
  const dt = T / grid;
  const curve: { t: number; zero: number; forward: number }[] = [];
  for (let k = 1; k <= grid; k++) {
    const t = k * dt;
    const z = zeroAt(t);
    const zPrev = zeroAt(Math.max(1e-6, t - dt));
    const forward = (z * t - zPrev * (t - dt)) / dt;
    curve.push({ t, zero: z, forward });
  }
  let roughness = 0;
  for (let k = 2; k < curve.length; k++) {
    const d2 = curve[k].forward - 2 * curve[k - 1].forward + curve[k - 2].forward;
    roughness += d2 * d2;
  }
  return { method, curve, roughness };
}

/** Forward rate implied between t1 and t2 from continuously compounded zeros. */
export function forwardRate(z1: number, t1: number, z2: number, t2: number): number {
  return (z2 * t2 - z1 * t1) / (t2 - t1);
}

/**
 * Carry + roll-down decomposition over horizon h for a bond whose maturity
 * shortens along an unchanged curve.
 */
export function rollDownReturn(o: {
  zeroNow: number; maturity: number; horizon: number; zeroRolled: number; fundingRate: number;
}) {
  const { zeroNow, maturity, horizon, zeroRolled, fundingRate } = o;
  const p0 = Math.exp(-zeroNow * maturity);
  const p1 = Math.exp(-zeroRolled * (maturity - horizon));
  const total = p1 / p0 - 1;
  const carry = (zeroNow - fundingRate) * horizon;
  return { total, carry, rolldown: total - carry, priceStart: p0, priceEnd: p1 };
}

/** Accrued interest and clean/dirty conversion (simple actual/actual within period). */
export function accruedInterest(o: { coupon: number; freq: number; daysSinceCoupon: number; daysInPeriod: number; face?: number }) {
  const face = o.face ?? 100;
  const periodCoupon = (face * o.coupon) / o.freq;
  const accrued = periodCoupon * (o.daysSinceCoupon / o.daysInPeriod);
  return { accrued, periodCoupon, toDirty: (clean: number) => clean + accrued, toClean: (dirty: number) => dirty - accrued };
}

/* ═══════════ 2. Spread taxonomy ═══════════ */

export interface Cashflow { t: number; amount: number }

export function pvCashflows(cfs: Cashflow[], zeroAt: (t: number) => number, spread = 0): number {
  return cfs.reduce((s, cf) => s + cf.amount * Math.exp(-(zeroAt(cf.t) + spread) * cf.t), 0);
}

/** Z-spread: the parallel add-on to the zero curve that reprices the bond. */
export function zSpread(cfs: Cashflow[], zeroAt: (t: number) => number, price: number): number {
  return bisect((s) => pvCashflows(cfs, zeroAt, s) - price, -0.2, 1.0);
}

/**
 * Full spread taxonomy for one bond: nominal spread vs a benchmark yield,
 * Z-spread against the whole curve, asset-swap spread, and — when an
 * option-adjusted price is supplied — the option cost = Z − OAS.
 */
export function spreadTaxonomy(o: {
  cfs: Cashflow[];
  zeroAt: (t: number) => number;
  price: number;
  benchmarkYield: number;
  maturity: number;
  coupon: number;
  oas?: number;
}) {
  const { cfs, zeroAt, price, benchmarkYield, maturity, coupon } = o;
  const ytm = bisect((y) => cfs.reduce((s, cf) => s + cf.amount * Math.exp(-y * cf.t), 0) - price, -0.2, 1.0);
  const z = zSpread(cfs, zeroAt, price);
  const nominal = ytm - benchmarkYield;
  // asset swap: (par - price) amortised over the swap annuity, plus coupon vs curve
  let annuity = 0;
  const freq = 2;
  for (let k = 1; k <= Math.round(maturity * freq); k++) {
    const t = k / freq;
    annuity += Math.exp(-zeroAt(t) * t) / freq;
  }
  const parSwapRate = (1 - Math.exp(-zeroAt(maturity) * maturity)) / annuity;
  const asw = coupon - parSwapRate + (100 - price) / (100 * annuity);
  const oas = o.oas;
  return {
    ytm, nominal, zSpread: z, asw, oas: oas ?? null,
    optionCost: oas === undefined ? null : z - oas,
  };
}

/* ═══════════ 3. Risk measures ═══════════ */

/** Effective duration / convexity by curve bump — valid for optionful bonds. */
export function effectiveRisk(priceFn: (shift: number) => number, bump = 0.0001) {
  const p0 = priceFn(0), pUp = priceFn(bump), pDn = priceFn(-bump);
  const effDuration = (pDn - pUp) / (2 * p0 * bump);
  const effConvexity = (pUp + pDn - 2 * p0) / (p0 * bump * bump);
  const dv01 = (pDn - pUp) / 2 * (0.0001 / bump);
  return { price: p0, effDuration, effConvexity, dv01, dollarDuration: effDuration * p0 };
}

/**
 * Key-rate duration hedge: solve for hedge notionals so the portfolio's
 * key-rate exposures are neutralised bucket by bucket.
 */
export function keyRateHedge(o: {
  portfolioKrd: number[];
  portfolioValue: number;
  hedgeKrd: number[][]; // [instrument][bucket]
  hedgeValues: number[];
}) {
  const buckets = o.portfolioKrd.length;
  const n = o.hedgeKrd.length;
  const A: number[][] = [];
  const b: number[] = [];
  for (let k = 0; k < buckets; k++) {
    A.push(o.hedgeKrd.map((h, i) => h[k] * o.hedgeValues[i]));
    b.push(-o.portfolioKrd[k] * o.portfolioValue);
  }
  // square the system when over/under-determined (normal equations)
  const At: number[][] = Array.from({ length: n }, (_, i) => A.map((row) => row[i]));
  const AtA = At.map((r) => At.map((c) => r.reduce((s, v, k) => s + v * c[k], 0)));
  const Atb = At.map((r) => r.reduce((s, v, k) => s + v * b[k], 0));
  const notional = solveLinear(AtA, Atb);
  const residual = A.map((row, k) => row.reduce((s, v, i) => s + v * notional[i], 0) - b[k]);
  return { notional, residual, maxResidual: Math.max(...residual.map(Math.abs)) };
}

/**
 * Redington immunization: duration match plus asset convexity dominance.
 * Returns the surplus sensitivity to a parallel shift.
 */
export function redingtonImmunization(o: {
  assetPv: number; assetDuration: number; assetConvexity: number;
  liabPv: number; liabDuration: number; liabConvexity: number;
}) {
  const durationGap = o.assetDuration - (o.liabPv / o.assetPv) * o.liabDuration;
  const dollarGap = o.assetPv * o.assetDuration - o.liabPv * o.liabDuration;
  const convexityGap = o.assetPv * o.assetConvexity - o.liabPv * o.liabConvexity;
  const immunized = Math.abs(dollarGap) < 1e-8 * Math.max(1, o.assetPv) && convexityGap >= 0;
  const surplus = (dy: number) =>
    (o.assetPv - o.liabPv)
    - dollarGap * dy
    + 0.5 * convexityGap * dy * dy;
  return { durationGap, dollarGap, convexityGap, immunized, surplus };
}

/* ═══════════ 4. Embedded options & convertibles ═══════════ */

/**
 * Binomial (Black-Derman-Toy style lognormal short rate) tree pricing of a
 * bullet, callable or putable bond. `strike` is the exercise price.
 */
export function optionEmbeddedBond(o: {
  face?: number; coupon: number; maturity: number; steps?: number;
  r0: number; sigma: number; type: "bullet" | "call" | "put"; strike?: number; spread?: number;
}) {
  const face = o.face ?? 100;
  const N = o.steps ?? Math.max(2, Math.round(o.maturity * 2));
  const dt = o.maturity / N;
  const strike = o.strike ?? face;
  const spread = o.spread ?? 0;
  const rate = (i: number, j: number) => o.r0 * Math.exp(o.sigma * (2 * j - i) * Math.sqrt(dt)) + spread;
  const cpn = (face * o.coupon) * dt;
  let v: number[] = new Array(N + 1).fill(face + cpn);
  for (let i = N - 1; i >= 0; i--) {
    const nv: number[] = [];
    for (let j = 0; j <= i; j++) {
      const disc = Math.exp(-rate(i, j) * dt);
      let val = disc * (0.5 * v[j] + 0.5 * v[j + 1]) + (i > 0 ? cpn : 0);
      if (o.type === "call") val = Math.min(val, strike + (i > 0 ? cpn : 0));
      if (o.type === "put") val = Math.max(val, strike + (i > 0 ? cpn : 0));
      nv.push(val);
    }
    v = nv;
  }
  const price = v[0];
  const bullet = o.type === "bullet" ? price : optionEmbeddedBond({ ...o, type: "bullet" }).price;
  return { price, straightValue: bullet, optionValue: Math.abs(bullet - price), steps: N };
}

/** Convertible bond decomposition: bond floor + conversion option (BS). */
export function convertibleBond(o: {
  face?: number; coupon: number; maturity: number; creditYield: number; riskFree: number;
  stock: number; ratio: number; sigma: number; dividendYield?: number;
}) {
  const face = o.face ?? 100;
  const q = o.dividendYield ?? 0;
  const freq = 2;
  let floor = 0;
  for (let k = 1; k <= Math.round(o.maturity * freq); k++) {
    const t = k / freq;
    floor += (face * o.coupon / freq) * Math.exp(-o.creditYield * t);
  }
  floor += face * Math.exp(-o.creditYield * o.maturity);
  const K = face / o.ratio; // per-share strike
  const S = o.stock, T = o.maturity, sig = o.sigma;
  const d1 = (Math.log(S / K) + (o.riskFree - q + 0.5 * sig * sig) * T) / (sig * Math.sqrt(T));
  const d2 = d1 - sig * Math.sqrt(T);
  const call = S * Math.exp(-q * T) * normCdf(d1) - K * Math.exp(-o.riskFree * T) * normCdf(d2);
  const optionValue = o.ratio * call;
  const parity = o.ratio * S;
  const value = floor + optionValue;
  const delta = o.ratio * Math.exp(-q * T) * normCdf(d1);
  const premium = value / parity - 1;
  const regime = parity > 1.2 * floor ? "equity" : parity < 0.6 * floor ? "bond" : "hybrid";
  return { value, bondFloor: floor, optionValue, parity, delta, premium, regime };
}

/* ═══════════ 5. Term-structure model glue ═══════════ */

/**
 * Hull-White theta(t) implied by an initial instantaneous forward curve:
 * θ(t) = ∂f/∂t + a f(t) + σ²(1 − e^{−2at}) / (2a).
 */
export function hullWhiteTheta(o: {
  forward: (t: number) => number; a: number; sigma: number; horizon: number; steps?: number;
}) {
  const n = o.steps ?? 40;
  const dt = o.horizon / n;
  const path: { t: number; forward: number; theta: number }[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i * dt;
    const f = o.forward(t);
    const dfdt = (o.forward(t + dt / 2) - o.forward(Math.max(1e-6, t - dt / 2))) / dt;
    const theta = dfdt + o.a * f + (o.sigma * o.sigma * (1 - Math.exp(-2 * o.a * t))) / (2 * o.a);
    path.push({ t, forward: f, theta });
  }
  return { path, fitsInitialCurve: true };
}

/**
 * Expectations hypothesis vs term premium: split a long yield into the average
 * expected short rate and the residual premium (Campbell-Shiller form).
 */
export function termPremiumDecomposition(o: {
  longYield: number; expectedShorts: number[]; maturity: number;
}) {
  const avgExpected = o.expectedShorts.reduce((a, b) => a + b, 0) / o.expectedShorts.length;
  const termPremium = o.longYield - avgExpected;
  // Campbell-Shiller regression coefficient under pure expectations is 1
  const csSlope = avgExpected === 0 ? 0 : o.longYield / avgExpected;
  return { avgExpected, termPremium, csSlope, expectationsHolds: Math.abs(termPremium) < 1e-10 };
}

/* ═══════════ 6. Credit ═══════════ */

/** Decompose an observed credit spread into expected loss, risk premium, liquidity and tax. */
export function creditSpreadDecomposition(o: {
  observedSpread: number; pd: number; lgd: number; riskPremiumMultiple: number;
  liquidityPremium: number; taxRate?: number; couponYield?: number;
}) {
  const expectedLoss = o.pd * o.lgd;
  const riskPremium = expectedLoss * Math.max(0, o.riskPremiumMultiple - 1);
  const tax = (o.taxRate ?? 0) * (o.couponYield ?? 0);
  const explained = expectedLoss + riskPremium + o.liquidityPremium + tax;
  const residual = o.observedSpread - explained;
  const share = (x: number) => (o.observedSpread === 0 ? 0 : x / o.observedSpread);
  return {
    expectedLoss, riskPremium, liquidityPremium: o.liquidityPremium, tax, explained, residual,
    shares: {
      expectedLoss: share(expectedLoss), riskPremium: share(riskPremium),
      liquidity: share(o.liquidityPremium), tax: share(tax), residual: share(residual),
    },
    creditSpreadPuzzle: share(expectedLoss) < 0.5,
  };
}

/** Multi-period rating migration: matrix powers plus a migration-risk VaR. */
export function ratingMigration(o: {
  matrix: number[][]; startRating: number; horizons: number[];
  spreadsByRating: number[]; duration: number; confidence?: number;
}) {
  const n = o.matrix.length;
  const mul = (A: number[][], B: number[][]) =>
    A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  let P = o.matrix.map((r) => [...r]);
  const results = [] as { horizon: number; distribution: number[]; defaultProb: number; expectedSpread: number; var: number }[];
  const maxH = Math.max(...o.horizons);
  for (let h = 1; h <= maxH; h++) {
    if (h > 1) P = mul(P, o.matrix);
    if (!o.horizons.includes(h)) continue;
    const dist = P[o.startRating];
    const defaultProb = dist[n - 1];
    const s0 = o.spreadsByRating[o.startRating];
    const losses = o.spreadsByRating.map((s, i) => (i === n - 1 ? 1 : (s - s0) * o.duration));
    const expectedSpread = dist.reduce((s, p, i) => s + p * o.spreadsByRating[i], 0);
    // VaR: worst loss not exceeded with `confidence` probability, ordering states best→worst
    const conf = o.confidence ?? 0.99;
    const idx = losses.map((l, i) => ({ l, p: dist[i] })).sort((a, b) => a.l - b.l);
    let cum = 0, v = 0;
    for (const s of idx) { cum += s.p; v = s.l; if (cum >= conf) break; }
    results.push({ horizon: h, distribution: [...dist], defaultProb, expectedSpread, var: v });
  }
  return { results };
}

/** CDS-bond basis: negative basis means the cash bond is cheap to the CDS. */
export function cdsBondBasis(o: { cdsSpread: number; bondZSpread: number; repoCost: number; fundingSpread: number }) {
  const syntheticSpread = o.cdsSpread;
  const cashSpread = o.bondZSpread - o.fundingSpread - o.repoCost;
  const basis = syntheticSpread - cashSpread;
  return {
    basis, cashSpread, syntheticSpread,
    sign: basis < 0 ? "negative" : basis > 0 ? "positive" : "flat",
    arbitrage: Math.abs(basis) > 0.002,
    trade: basis < 0 ? "buy bond + buy protection" : "sell bond + sell protection",
  };
}

/* ═══════════ 7. Structured products ═══════════ */

/** Sequential-pay waterfall with an overcollateralisation trigger. */
export function waterfall(o: {
  poolPrincipal: number; poolInterest: number; lossRate: number;
  tranches: { name: string; size: number; coupon: number }[]; ocTrigger?: number;
}) {
  const loss = o.poolPrincipal * o.lossRate;
  let availPrincipal = o.poolPrincipal - loss;
  let availInterest = o.poolInterest;
  const totalSize = o.tranches.reduce((s, t) => s + t.size, 0);
  const oc = totalSize === 0 ? Infinity : (o.poolPrincipal - loss) / totalSize;
  const trigger = o.ocTrigger ?? 0;
  const triggered = oc < trigger;
  const out = o.tranches.map((t) => {
    const interestDue = t.size * t.coupon;
    const interestPaid = triggered ? 0 : Math.min(availInterest, interestDue);
    availInterest -= interestPaid;
    return { ...t, interestDue, interestPaid, principalPaid: 0, writedown: 0 };
  });
  if (triggered) {
    // divert all interest to senior principal
    availPrincipal += o.poolInterest;
  }
  for (const t of out) {
    const paid = Math.min(availPrincipal, t.size);
    t.principalPaid = paid;
    t.writedown = t.size - paid;
    availPrincipal -= paid;
  }
  const equityResidual = Math.max(0, availPrincipal) + Math.max(0, availInterest);
  return { tranches: out, loss, ocRatio: oc, triggered, equityResidual };
}

/**
 * One-factor Gaussian copula tranche loss via Gauss-Legendre quadrature on the
 * systematic factor — the standard large-pool CDO pricing kernel.
 */
export function gaussianCopulaTranche(o: {
  pd: number; rho: number; lgd?: number; attach: number; detach: number; nodes?: number;
}) {
  const lgd = o.lgd ?? 0.6;
  const K = normInv(o.pd);
  const sq = Math.sqrt(Math.max(1e-9, o.rho));
  const nodes = o.nodes ?? 200;
  const lo = -6, hi = 6, dm = (hi - lo) / nodes;
  let expLoss = 0, expPool = 0;
  const profile: { factor: number; poolLoss: number; trancheLoss: number }[] = [];
  for (let i = 0; i < nodes; i++) {
    const m = lo + (i + 0.5) * dm;
    const w = Math.exp(-m * m / 2) / Math.sqrt(2 * Math.PI) * dm;
    const pCond = normCdf((K - sq * m) / Math.sqrt(Math.max(1e-9, 1 - o.rho)));
    const poolLoss = lgd * pCond;
    const tl = Math.min(Math.max(poolLoss - o.attach, 0), o.detach - o.attach) / (o.detach - o.attach);
    expLoss += w * tl;
    expPool += w * poolLoss;
    if (i % Math.max(1, Math.floor(nodes / 60)) === 0) profile.push({ factor: m, poolLoss, trancheLoss: tl });
  }
  return {
    expectedTrancheLoss: expLoss,
    expectedPoolLoss: expPool,
    fairSpread: expLoss, // per unit notional, undiscounted proxy
    leverage: expPool === 0 ? 0 : expLoss / expPool,
    profile,
  };
}

/** MBS negative convexity: prepayments accelerate as rates fall, shortening duration. */
export function mbsNegativeConvexity(o: {
  wac: number; baseCpr: number; refiSensitivity: number; maturity: number; shifts?: number[];
}) {
  const shifts = o.shifts ?? [-0.02, -0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015, 0.02];
  const priceAt = (dy: number) => {
    const rate = o.wac + dy;
    const cpr = Math.min(0.9, Math.max(0.01, o.baseCpr + o.refiSensitivity * (o.wac - rate)));
    const smm = 1 - Math.pow(1 - cpr, 1 / 12);
    let bal = 100, pv = 0;
    const months = Math.round(o.maturity * 12);
    const disc = rate + 0.005;
    for (let m = 1; m <= months && bal > 1e-6; m++) {
      const interest = bal * o.wac / 12;
      const sched = bal / (months - m + 1);
      const prepay = (bal - sched) * smm;
      const cf = interest + sched + prepay;
      pv += cf / Math.pow(1 + disc / 12, m);
      bal -= sched + prepay;
    }
    return pv;
  };
  const curve = shifts.map((s) => ({ shift: s, price: priceAt(s) }));
  const p0 = priceAt(0), h = 0.0025;
  const eff = effectiveRisk(priceAt, h);
  const durLow = effectiveRisk((s) => priceAt(s - 0.015), h).effDuration;
  const durHigh = effectiveRisk((s) => priceAt(s + 0.015), h).effDuration;
  return {
    price: p0, curve,
    effDuration: eff.effDuration, effConvexity: eff.effConvexity,
    durationLowRates: durLow, durationHighRates: durHigh,
    negativeConvexity: eff.effConvexity < 0 || durLow < durHigh,
  };
}

/* ═══════════ 8. Leverage & funding ═══════════ */

/** Repo-financed carry: leverage multiplies both spread income and rate risk. */
export function repoLeverage(o: {
  equity: number; haircut: number; assetYield: number; repoRate: number; duration: number; yieldShock?: number;
}) {
  const leverage = o.haircut <= 0 ? Infinity : 1 / o.haircut;
  const assets = o.equity * leverage;
  const borrowed = assets - o.equity;
  const carry = assets * o.assetYield - borrowed * o.repoRate;
  const roe = carry / o.equity;
  const shock = o.yieldShock ?? 0.01;
  const mtm = -assets * o.duration * shock;
  const equityAfter = o.equity + mtm;
  const wipeoutShock = (o.equity / (assets * o.duration));
  return { leverage, assets, borrowed, carry, roe, mtm, equityAfter, insolvent: equityAfter <= 0, wipeoutShock };
}

/** Haircut spiral: rising haircuts force deleveraging, which pushes prices down further. */
export function marginSpiral(o: {
  equity: number; assets: number; haircut0: number; haircutShock: number;
  priceImpact: number; rounds?: number;
}) {
  const rounds = o.rounds ?? 12;
  let assets = o.assets, equity = o.equity, price = 1;
  const haircut = Math.min(0.95, o.haircut0 + o.haircutShock);
  const path: { round: number; assets: number; equity: number; price: number; forcedSale: number }[] = [];
  for (let k = 1; k <= rounds; k++) {
    const maxAssets = equity / haircut;
    const forced = Math.max(0, assets - maxAssets);
    if (forced <= 1e-9) { path.push({ round: k, assets, equity, price, forcedSale: 0 }); break; }
    const drop = o.priceImpact * (forced / Math.max(1e-9, o.assets));
    price *= 1 - drop;
    assets -= forced;
    equity -= assets * drop;
    path.push({ round: k, assets, equity, price, forcedSale: forced });
    if (equity <= 0) { equity = 0; break; }
  }
  return {
    path, finalAssets: assets, finalEquity: equity, finalPrice: price,
    totalSold: o.assets - assets, failed: equity <= 0,
    deleveragingMultiplier: (o.assets - assets) / Math.max(1e-9, o.assets * o.haircutShock),
  };
}

/* ═══════════ 9. Frontier ═══════════ */

/**
 * RFR reform: backward-looking compounded overnight rate vs a forward-looking
 * term fixing, plus the ISDA-style median fallback spread adjustment.
 */
export function rfrCompounding(o: {
  overnightPath: number[]; dayCount?: number; termFixing: number; historicalBasis?: number[];
}) {
  const dc = o.dayCount ?? 360;
  let comp = 1;
  for (const r of o.overnightPath) comp *= 1 + r / dc;
  const days = o.overnightPath.length;
  const compounded = (comp - 1) * (dc / days);
  const simpleAverage = o.overnightPath.reduce((a, b) => a + b, 0) / days;
  const basis = o.termFixing - compounded;
  const hb = o.historicalBasis ?? [];
  const sorted = [...hb].sort((a, b) => a - b);
  const fallbackSpread = sorted.length
    ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : 0.5 * (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]))
    : 0;
  return { compounded, simpleAverage, termFixing: o.termFixing, basis, fallbackSpread, convexityGain: compounded - simpleAverage };
}

/** Shifted lognormal (displaced diffusion) caplet — prices negative strikes/forwards. */
export function shiftedLognormalCaplet(o: {
  forward: number; strike: number; sigma: number; T: number; shift: number; tau: number; discount: number;
}) {
  const F = o.forward + o.shift, K = o.strike + o.shift;
  if (F <= 0 || K <= 0) return { price: NaN, valid: false, d1: NaN, d2: NaN };
  const v = o.sigma * Math.sqrt(o.T);
  const d1 = (Math.log(F / K) + 0.5 * v * v) / v;
  const d2 = d1 - v;
  const price = o.discount * o.tau * (F * normCdf(d1) - K * normCdf(d2));
  return { price, valid: true, d1, d2 };
}

/** Green bond premium ("greenium") and transition-risk discount on credit spreads. */
export function greeniumSpread(o: {
  baselineSpread: number; greenLabel: boolean; investorDemand: number;
  carbonIntensity: number; transitionBeta: number; carbonPrice: number; duration: number;
}) {
  const greenium = o.greenLabel ? -0.0005 * o.investorDemand : 0;
  const transitionPremium = o.transitionBeta * o.carbonIntensity * o.carbonPrice;
  const spread = o.baselineSpread + greenium + transitionPremium;
  const priceEffect = -o.duration * (spread - o.baselineSpread);
  return { spread, greenium, transitionPremium, priceEffect, netCheaper: spread < o.baselineSpread };
}

/** Bond liquidity premium from turnover, trade sparsity and the Amihud illiquidity ratio. */
export function bondLiquidityPremium(o: {
  turnover: number; tradesPerDay: number; quotedSpread: number; volatility: number; holdingPeriod: number;
}) {
  const amihud = o.tradesPerDay <= 0 ? Infinity : o.volatility / Math.sqrt(o.tradesPerDay);
  const searchCost = 1 / (1 + o.tradesPerDay);
  const amortized = o.quotedSpread / Math.max(0.01, o.holdingPeriod);
  const premium = amortized + 0.5 * searchCost * o.quotedSpread + 0.1 * amihud;
  return { amihud, searchCost, amortizedSpread: amortized, liquidityPremium: premium, illiquid: o.turnover < 0.5 };
}
