/**
 * V5.7 — Derivatives pricing frontier library.
 *
 * Pure, dependency-free functions covering the gaps identified in the
 * "衍生品定价理论框架报告": state prices & no-arbitrage bounds, LSMC for
 * American/Bermudan claims, futures-vs-forward, SVI surface engineering with
 * arbitrage checks and Dupire inversion, short-rate / HJM / LMM curve models,
 * credit curve bootstrapping, Fourier pricing and variance reduction, rough
 * volatility and optimal hedging in incomplete markets.
 */
import { blackScholes, normCdf } from "./blackScholes";

/* ── shared numerics ───────────────────────────────────────────── */

export function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function randn(rng: () => number) {
  const u = Math.max(rng(), 1e-12), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Van der Corput low-discrepancy sequence (radical inverse). */
export function vanDerCorput(n: number, base: number): number {
  let q = 0, bk = 1 / base;
  while (n > 0) { q += (n % base) * bk; n = Math.floor(n / base); bk /= base; }
  return q;
}
/** Solve a dense linear system by Gaussian elimination with partial pivoting. */
export function solveLin(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) continue;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-14 ? 0 : row[n] / row[i]));
}
/** Minimal Nelder-Mead simplex optimiser for low-dimensional calibration. */
export function nelderMead(
  f: (x: number[]) => number, x0: number[], step = 0.1, iters = 400,
): { x: number[]; fx: number } {
  const n = x0.length;
  let simplex = [x0.slice(), ...x0.map((_, i) => { const p = x0.slice(); p[i] += step * (Math.abs(p[i]) + 1); return p; })];
  let fs = simplex.map(f);
  for (let it = 0; it < iters; it++) {
    const order = fs.map((v, i) => i).sort((a, b) => fs[a] - fs[b]);
    simplex = order.map((i) => simplex[i]); fs = order.map((i) => fs[i]);
    const centroid = Array.from({ length: n }, (_, j) =>
      simplex.slice(0, n).reduce((s, p) => s + p[j], 0) / n);
    const worst = simplex[n];
    const refl = centroid.map((c, j) => c + (c - worst[j]));
    const fr = f(refl);
    if (fr < fs[0]) {
      const exp2 = centroid.map((c, j) => c + 2 * (c - worst[j]));
      const fe = f(exp2);
      if (fe < fr) { simplex[n] = exp2; fs[n] = fe; } else { simplex[n] = refl; fs[n] = fr; }
    } else if (fr < fs[n - 1]) { simplex[n] = refl; fs[n] = fr; }
    else {
      const con = centroid.map((c, j) => c + 0.5 * (worst[j] - c));
      const fc = f(con);
      if (fc < fs[n]) { simplex[n] = con; fs[n] = fc; }
      else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          fs[i] = f(simplex[i]);
        }
      }
    }
  }
  const best = fs.indexOf(Math.min(...fs));
  return { x: simplex[best], fx: fs[best] };
}

/* ═══════════════ 1. State prices & no-arbitrage bounds ═══════════ */

export interface StatePriceResult {
  /** Arrow-Debreu price of each terminal node, indexed by number of up moves. */
  nodes: { j: number; ST: number; prob: number; statePrice: number }[];
  p: number;
  u: number; d: number;
  /** Σ state prices should equal the discount factor e^{-rT}. */
  sumStatePrices: number;
  discount: number;
}

export function statePricesFromTree(o: {
  S0: number; sigma: number; r: number; T: number; n: number; q?: number;
}): StatePriceResult {
  const { S0, sigma, r, T, n, q = 0 } = o;
  const dt = T / n;
  const u = Math.exp(sigma * Math.sqrt(dt)), d = 1 / u;
  const p = (Math.exp((r - q) * dt) - d) / (u - d);
  const disc = Math.exp(-r * T);
  const nodes: StatePriceResult["nodes"] = [];
  let comb = 1;
  for (let j = 0; j <= n; j++) {
    if (j > 0) comb = (comb * (n - j + 1)) / j;
    const prob = comb * Math.pow(p, j) * Math.pow(1 - p, n - j);
    nodes.push({ j, ST: S0 * Math.pow(u, j) * Math.pow(d, n - j), prob, statePrice: disc * prob });
  }
  return { nodes, p, u, d, discount: disc, sumStatePrices: nodes.reduce((s, x) => s + x.statePrice, 0) };
}

export interface BoundsResult {
  lower: number; upper: number;
  /** price under the "complete market" projection ignoring the middle state */
  completePrice: number;
  measures: { qUp: number; qMid: number; qDown: number; price: number }[];
  spread: number;
}

/**
 * One-period trinomial (incomplete) market: the set of equivalent martingale
 * measures is a segment, so a claim only has a price interval [sub, super].
 */
export function arbitrageBounds(o: {
  S0: number; r: number; T: number;
  states: [number, number, number];   // S_up, S_mid, S_down
  payoffs: [number, number, number];
  grid?: number;
}): BoundsResult {
  const { S0, r, T, states, payoffs, grid = 201 } = o;
  const [su, sm, sd] = states;
  const disc = Math.exp(-r * T), fwd = S0 / disc;
  const measures: BoundsResult["measures"] = [];
  for (let i = 0; i < grid; i++) {
    const qm = i / (grid - 1);
    // qu*su + qm*sm + qd*sd = fwd, qu + qd = 1 - qm
    const rest = 1 - qm;
    const qu = (fwd - qm * sm - rest * sd) / (su - sd);
    const qd = rest - qu;
    if (qu < -1e-12 || qd < -1e-12) continue;
    measures.push({ qUp: qu, qMid: qm, qDown: qd, price: disc * (qu * payoffs[0] + qm * payoffs[1] + qd * payoffs[2]) });
  }
  const prices = measures.map((m) => m.price);
  const lower = prices.length ? Math.min(...prices) : NaN;
  const upper = prices.length ? Math.max(...prices) : NaN;
  const q2 = (fwd - sd) / (su - sd);
  const completePrice = disc * (q2 * payoffs[0] + (1 - q2) * payoffs[2]);
  return { lower, upper, completePrice, measures, spread: upper - lower };
}

/* ═══════════════ 2. Longstaff–Schwartz (American / Bermudan) ═════ */

export interface LSMCResult {
  price: number; stderr: number; european: number; earlyPremium: number;
  boundary: { t: number; S: number | null }[];
  paths: number; exerciseDates: number;
}

export function longstaffSchwartz(o: {
  S0: number; K: number; r: number; q?: number; sigma: number; T: number;
  steps: number; nPaths: number; seed?: number;
  type?: "put" | "call"; exerciseDates?: number; basis?: number;
}): LSMCResult {
  const { S0, K, r, q = 0, sigma, T, steps, nPaths, seed = 7, type = "put", basis = 3 } = o;
  const nEx = Math.min(o.exerciseDates ?? steps, steps);
  const dt = T / steps;
  const rng = makeRng(seed);
  const disc = Math.exp(-r * dt);
  const drift = (r - q - 0.5 * sigma * sigma) * dt, vol = sigma * Math.sqrt(dt);
  // simulate with antithetic pairs
  const S: number[][] = [];
  for (let i = 0; i < nPaths; i += 2) {
    const a: number[] = [S0], b: number[] = [S0];
    for (let t = 1; t <= steps; t++) {
      const z = randn(rng);
      a.push(a[t - 1] * Math.exp(drift + vol * z));
      b.push(b[t - 1] * Math.exp(drift - vol * z));
    }
    S.push(a); if (S.length < nPaths) S.push(b);
  }
  const M = S.length;
  const payoff = (s: number) => (type === "put" ? Math.max(K - s, 0) : Math.max(s - K, 0));
  const exSteps = new Set<number>();
  for (let i = 1; i <= nEx; i++) exSteps.add(Math.max(1, Math.round((i * steps) / nEx)));
  const cash = S.map((p) => payoff(p[steps]));
  const boundary: { t: number; S: number | null }[] = [{ t: T, S: K }];
  for (let t = steps - 1; t >= 1; t--) {
    for (let i = 0; i < M; i++) cash[i] *= disc;
    if (!exSteps.has(t)) continue;
    const itm: number[] = [];
    for (let i = 0; i < M; i++) if (payoff(S[i][t]) > 0) itm.push(i);
    if (itm.length > basis + 2) {
      const X = itm.map((i) => {
        const x = S[i][t] / K; const row = [1];
        for (let k = 1; k <= basis; k++) row.push(Math.pow(x, k));
        return row;
      });
      const n = basis + 1;
      const A: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
      const bvec = Array(n).fill(0);
      X.forEach((row, idx) => {
        const y = cash[itm[idx]];
        for (let a2 = 0; a2 < n; a2++) {
          bvec[a2] += row[a2] * y;
          for (let b2 = 0; b2 < n; b2++) A[a2][b2] += row[a2] * row[b2];
        }
      });
      const beta = solveLin(A, bvec);
      let bnd: number | null = null;
      itm.forEach((i, idx) => {
        const cont = X[idx].reduce((s, v, k) => s + v * beta[k], 0);
        const ex = payoff(S[i][t]);
        if (ex > cont) {
          cash[i] = ex;
          bnd = type === "put" ? Math.max(bnd ?? -Infinity, S[i][t]) : Math.min(bnd ?? Infinity, S[i][t]);
        }
      });
      boundary.push({ t: +(t * dt).toFixed(4), S: bnd });
    }
  }
  const vals = cash.map((c) => c * disc);
  const price = vals.reduce((s, v) => s + v, 0) / M;
  const variance = vals.reduce((s, v) => s + (v - price) ** 2, 0) / Math.max(1, M - 1);
  const bs = blackScholes({ S: S0, K, T, r, sigma, q });
  const european = type === "put" ? bs.put : bs.call;
  return {
    price, stderr: Math.sqrt(variance / M), european,
    earlyPremium: price - european,
    boundary: boundary.sort((a, b) => a.t - b.t),
    paths: M, exerciseDates: nEx,
  };
}

/* ═══════════════ 3. Forwards, futures & cost of carry ═══════════ */

export interface CarryResult {
  forward: number; futures: number; convexity: number;
  basis: number; impliedConvenience: number;
  curve: { T: number; forward: number; futures: number }[];
}

export function futuresVsForward(o: {
  S0: number; r: number; storage?: number; convenience?: number; q?: number;
  T: number; sigmaS?: number; sigmaR?: number; rho?: number; marketFutures?: number;
}): CarryResult {
  const { S0, r, storage = 0, convenience = 0, q = 0, T, sigmaS = 0.25, sigmaR = 0.01, rho = 0 } = o;
  const carry = r + storage - convenience - q;
  const fwd = (t: number) => S0 * Math.exp(carry * t);
  // Cox-Ingersoll-Ross (1981) style convexity: futures ≠ forward when rates are
  // stochastic and correlated with the spot.
  const adj = (t: number) => Math.exp(rho * sigmaS * sigmaR * t * t * 0.5);
  const curve: CarryResult["curve"] = [];
  for (let i = 1; i <= 24; i++) {
    const t = (i / 24) * Math.max(T, 0.25);
    curve.push({ T: +t.toFixed(3), forward: fwd(t), futures: fwd(t) * adj(t) });
  }
  const forward = fwd(T), futures = forward * adj(T);
  const mkt = o.marketFutures ?? futures;
  return {
    forward, futures, convexity: futures - forward, basis: mkt - S0,
    impliedConvenience: r + storage - q - Math.log(mkt / S0) / T,
    curve,
  };
}

/* ═══════════════ 4. SVI surface, arbitrage checks & Dupire ══════ */

export interface SVIParams { a: number; b: number; rho: number; m: number; sigma: number }

export const sviTotalVar = (p: SVIParams, k: number) =>
  p.a + p.b * (p.rho * (k - p.m) + Math.sqrt((k - p.m) ** 2 + p.sigma ** 2));

export function sviFit(quotes: { k: number; iv: number }[], T: number): { params: SVIParams; rmse: number } {
  const w = quotes.map((q) => q.iv * q.iv * T);
  const wbar = w.reduce((s, x) => s + x, 0) / w.length;
  const obj = (x: number[]): number => {
    const p: SVIParams = { a: x[0], b: Math.abs(x[1]), rho: Math.tanh(x[2]), m: x[3], sigma: Math.abs(x[4]) + 1e-4 };
    let e = 0;
    quotes.forEach((qq, i) => { const d = sviTotalVar(p, qq.k) - w[i]; e += d * d; });
    return e / quotes.length;
  };
  const { x, fx } = nelderMead(obj, [wbar * 0.5, 0.1, -0.3, 0, 0.1], 0.2, 800);
  return {
    params: { a: x[0], b: Math.abs(x[1]), rho: Math.tanh(x[2]), m: x[3], sigma: Math.abs(x[4]) + 1e-4 },
    rmse: Math.sqrt(fx),
  };
}

export interface ArbCheck {
  butterfly: { k: number; g: number; ok: boolean }[];
  calendar: { k: number; wShort: number; wLong: number; ok: boolean }[];
  butterflyViolations: number; calendarViolations: number; arbitrageFree: boolean;
}

/** Gatheral's g(k) density condition + calendar monotonicity of total variance. */
export function surfaceArbitrageCheck(short: SVIParams, long: SVIParams, kMin = -0.6, kMax = 0.6, n = 41): ArbCheck {
  const butterfly: ArbCheck["butterfly"] = [];
  const calendar: ArbCheck["calendar"] = [];
  const h = 1e-3;
  for (let i = 0; i < n; i++) {
    const k = kMin + ((kMax - kMin) * i) / (n - 1);
    const w = sviTotalVar(short, k);
    const w1 = (sviTotalVar(short, k + h) - sviTotalVar(short, k - h)) / (2 * h);
    const w2 = (sviTotalVar(short, k + h) - 2 * w + sviTotalVar(short, k - h)) / (h * h);
    const g = (1 - (k * w1) / (2 * w)) ** 2 - (w1 * w1 / 4) * (1 / w + 0.25) + w2 / 2;
    butterfly.push({ k: +k.toFixed(3), g, ok: g >= -1e-6 });
    const wl = sviTotalVar(long, k);
    calendar.push({ k: +k.toFixed(3), wShort: w, wLong: wl, ok: wl >= w - 1e-9 });
  }
  const bv = butterfly.filter((x) => !x.ok).length, cv = calendar.filter((x) => !x.ok).length;
  return { butterfly, calendar, butterflyViolations: bv, calendarViolations: cv, arbitrageFree: bv === 0 && cv === 0 };
}

/** Dupire local variance expressed directly in SVI total-variance coordinates. */
export function dupireLocalVolFromSurface(short: SVIParams, long: SVIParams, T1: number, T2: number, kMin = -0.6, kMax = 0.6, n = 41) {
  const out: { k: number; impliedVol: number; localVol: number }[] = [];
  const h = 1e-3, dT = T2 - T1;
  for (let i = 0; i < n; i++) {
    const k = kMin + ((kMax - kMin) * i) / (n - 1);
    const w = sviTotalVar(short, k);
    const wT = (sviTotalVar(long, k) - w) / dT;
    const w1 = (sviTotalVar(short, k + h) - sviTotalVar(short, k - h)) / (2 * h);
    const w2 = (sviTotalVar(short, k + h) - 2 * w + sviTotalVar(short, k - h)) / (h * h);
    const denom = 1 - (k / w) * w1 + 0.25 * (-0.25 - 1 / w + (k * k) / (w * w)) * w1 * w1 + 0.5 * w2;
    const lv2 = wT / Math.max(denom, 1e-6);
    out.push({ k: +k.toFixed(3), impliedVol: Math.sqrt(Math.max(w / T1, 0)), localVol: Math.sqrt(Math.max(lv2, 0)) });
  }
  return out;
}

/* ═══════════════ 5. Short-rate, HJM & market models ═════════════ */

export function vasicekBond(o: { r0: number; a: number; b: number; sigma: number; T: number }) {
  const { r0, a, b, sigma, T } = o;
  const B = a === 0 ? T : (1 - Math.exp(-a * T)) / a;
  const A = a === 0
    ? Math.exp((sigma * sigma * T ** 3) / 6)
    : Math.exp(((B - T) * (a * a * b - 0.5 * sigma * sigma)) / (a * a) - (sigma * sigma * B * B) / (4 * a));
  const P = A * Math.exp(-B * r0);
  return { P, A, B, yield: T > 0 ? -Math.log(P) / T : r0 };
}

export function cirBond(o: { r0: number; a: number; b: number; sigma: number; T: number }) {
  const { r0, a, b, sigma, T } = o;
  const g = Math.sqrt(a * a + 2 * sigma * sigma);
  const den = (g + a) * (Math.exp(g * T) - 1) + 2 * g;
  const A = Math.pow((2 * g * Math.exp(((a + g) * T) / 2)) / den, (2 * a * b) / (sigma * sigma));
  const B = (2 * (Math.exp(g * T) - 1)) / den;
  const P = A * Math.exp(-B * r0);
  return { P, A, B, yield: T > 0 ? -Math.log(P) / T : r0 };
}

/** Hull-White (extended Vasicek) European option on a zero-coupon bond. */
export function hullWhiteBondOption(o: {
  a: number; sigma: number; T: number; S: number; K: number;
  PT: number; PS: number; type?: "call" | "put";
}) {
  const { a, sigma, T, S, K, PT, PS, type = "call" } = o;
  const sp = (sigma / a) * (1 - Math.exp(-a * (S - T))) * Math.sqrt((1 - Math.exp(-2 * a * T)) / (2 * a));
  const h = Math.log(PS / (PT * K)) / sp + sp / 2;
  const call = PS * normCdf(h) - K * PT * normCdf(h - sp);
  const put = K * PT * normCdf(-h + sp) - PS * normCdf(-h);
  return { price: type === "call" ? call : put, call, put, sigmaP: sp, h };
}

/** HJM no-arbitrage drift for an exponentially damped volatility structure. */
export function hjmDriftCheck(o: { sigma: number; a: number; horizon: number; n?: number }) {
  const { sigma, a, horizon, n = 30 } = o;
  const out: { tau: number; vol: number; drift: number; cumDrift: number }[] = [];
  let cum = 0;
  for (let i = 1; i <= n; i++) {
    const tau = (i / n) * horizon;
    const vol = sigma * Math.exp(-a * tau);
    const integral = a === 0 ? sigma * tau : (sigma * (1 - Math.exp(-a * tau))) / a;
    const drift = vol * integral;
    cum += drift * (horizon / n);
    out.push({ tau: +tau.toFixed(3), vol, drift, cumDrift: cum });
  }
  return out;
}

/** Black-76 caplet — the LMM building block. */
export function lmmCapletBlack(o: { F: number; K: number; sigma: number; T: number; tau: number; P: number }) {
  const { F, K, sigma, T, tau, P } = o;
  if (T <= 0 || sigma <= 0) return { caplet: tau * P * Math.max(F - K, 0), floorlet: tau * P * Math.max(K - F, 0), d1: 0, d2: 0 };
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return {
    caplet: tau * P * (F * normCdf(d1) - K * normCdf(d2)),
    floorlet: tau * P * (K * normCdf(-d2) - F * normCdf(-d1)),
    d1, d2,
  };
}

/* ═══════════════ 6. Credit: hazard bootstrap & CDS ══════════════ */

export interface CdsLeg { premium: number; protection: number; par: number; rpv01: number }

export function cdsLegs(o: {
  tenor: number; hazards: { t: number; h: number }[]; r: number; recovery: number; freq?: number; spread?: number;
}): CdsLeg {
  const { tenor, hazards, r, recovery, freq = 4, spread = 0.01 } = o;
  const dt = 1 / freq;
  const survivalAt = (t: number) => {
    let acc = 0, prev = 0;
    for (const seg of hazards) {
      const upper = Math.min(seg.t, t);
      if (upper > prev) acc += seg.h * (upper - prev);
      prev = Math.max(prev, upper);
      if (prev >= t) break;
    }
    if (prev < t) acc += (hazards[hazards.length - 1]?.h ?? 0) * (t - prev);
    return Math.exp(-acc);
  };
  let rpv01 = 0, prot = 0, prevQ = 1;
  for (let i = 1; i <= Math.round(tenor * freq); i++) {
    const t = i * dt, df = Math.exp(-r * t), Q = survivalAt(t);
    rpv01 += df * dt * (Q + prevQ) / 2;             // accrual-adjusted
    prot += (1 - recovery) * df * (prevQ - Q);
    prevQ = Q;
  }
  return { premium: spread * rpv01, protection: prot, par: prot / Math.max(rpv01, 1e-12), rpv01 };
}

export function cdsParSpread(o: { tenor: number; hazards: { t: number; h: number }[]; r: number; recovery: number; freq?: number }) {
  return cdsLegs({ ...o, spread: 0 }).par;
}

/** Piecewise-constant hazard bootstrap from a CDS term structure. */
export function hazardRateBootstrap(o: {
  quotes: { tenor: number; spread: number }[]; r: number; recovery: number; freq?: number;
}) {
  const { quotes, r, recovery, freq = 4 } = o;
  const hazards: { t: number; h: number }[] = [];
  const curve: { tenor: number; spread: number; hazard: number; survival: number; impliedPD: number }[] = [];
  for (const q of [...quotes].sort((a, b) => a.tenor - b.tenor)) {
    let lo = 1e-6, hi = 5;
    for (let it = 0; it < 80; it++) {
      const mid = (lo + hi) / 2;
      const trial = [...hazards, { t: q.tenor, h: mid }];
      const par = cdsParSpread({ tenor: q.tenor, hazards: trial, r, recovery, freq });
      if (par < q.spread) lo = mid; else hi = mid;
    }
    const h = (lo + hi) / 2;
    hazards.push({ t: q.tenor, h });
    const surv = Math.exp(-hazards.reduce((s, seg, i) => {
      const t0 = i === 0 ? 0 : hazards[i - 1].t;
      return s + seg.h * (Math.min(seg.t, q.tenor) - t0);
    }, 0));
    curve.push({ tenor: q.tenor, spread: q.spread, hazard: h, survival: surv, impliedPD: 1 - surv });
  }
  return { hazards, curve, creditTriangle: quotes.map((q) => ({ tenor: q.tenor, approxHazard: q.spread / (1 - recovery) })) };
}

/* ═══════════════ 7. Fourier pricing & variance reduction ════════ */

type Cx = { re: number; im: number };
const cAdd = (a: Cx, b: Cx): Cx => ({ re: a.re + b.re, im: a.im + b.im });
const cSub = (a: Cx, b: Cx): Cx => ({ re: a.re - b.re, im: a.im - b.im });
const cMul = (a: Cx, b: Cx): Cx => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cDiv = (a: Cx, b: Cx): Cx => {
  const den = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / den, im: (a.im * b.re - a.re * b.im) / den };
};
const cExp = (a: Cx): Cx => ({ re: Math.exp(a.re) * Math.cos(a.im), im: Math.exp(a.re) * Math.sin(a.im) });
const cLog = (a: Cx): Cx => ({ re: 0.5 * Math.log(a.re * a.re + a.im * a.im), im: Math.atan2(a.im, a.re) });
const cSqrt = (a: Cx): Cx => {
  const m = Math.sqrt(Math.hypot(a.re, a.im)), th = Math.atan2(a.im, a.re) / 2;
  return { re: m * Math.cos(th), im: m * Math.sin(th) };
};

export interface HestonParams { v0: number; kappa: number; theta: number; xi: number; rho: number }

/** Heston characteristic function of log S_T (Albrecher "little trap" form). */
export function hestonCF(u: Cx, o: HestonParams & { S: number; r: number; q?: number; T: number }): Cx {
  const { v0, kappa, theta, xi, rho, S, r, q = 0, T } = o;
  const iu: Cx = { re: -u.im, im: u.re };
  const a = cSub({ re: kappa, im: 0 }, cMul({ re: rho * xi, im: 0 }, iu));
  // ξ²(u² + iu) with u complex: u² = −(iu)²
  const d = cSqrt(cAdd(cMul(a, a), cMul({ re: xi * xi, im: 0 }, cSub(iu, cMul(iu, iu)))));
  const g = cDiv(cSub(a, d), cAdd(a, d));
  const edT = cExp(cMul({ re: -T, im: 0 }, d));
  const one: Cx = { re: 1, im: 0 };
  const C1 = cMul(cSub(a, d), { re: T, im: 0 });
  const logTerm = cLog(cDiv(cSub(one, cMul(g, edT)), cSub(one, g)));
  const C = cAdd(
    cMul(iu, { re: (r - q) * T, im: 0 }),
    cMul({ re: (kappa * theta) / (xi * xi), im: 0 }, cSub(C1, cMul({ re: 2, im: 0 }, logTerm))),
  );
  const D = cMul(cDiv(cSub(a, d), { re: xi * xi, im: 0 }), cDiv(cSub(one, edT), cSub(one, cMul(g, edT))));
  return cExp(cAdd(cAdd(C, cMul(D, { re: v0, im: 0 })), cMul(iu, { re: Math.log(S), im: 0 })));
}

/** Carr–Madan damped Fourier transform, integrated on a Simpson grid. */
export function carrMadanFFT(o: HestonParams & {
  S: number; K: number; r: number; q?: number; T: number; alpha?: number; N?: number; uMax?: number;
}): { call: number; put: number; nodes: number } {
  const { S, K, r, q = 0, T, alpha = 1.5, N = 512, uMax = 100 } = o;
  const k = Math.log(K), du = uMax / N;
  let sum = 0;
  for (let j = 0; j <= N; j++) {
    const u = j * du;
    const uc: Cx = { re: u, im: -(alpha + 1) };
    const cf = hestonCF(uc, o);
    const num = cMul({ re: Math.exp(-r * T), im: 0 }, cf);
    const den = cAdd(
      cSub({ re: alpha * alpha + alpha - u * u, im: 0 }, { re: 0, im: 0 }),
      { re: 0, im: (2 * alpha + 1) * u },
    );
    const psi = cDiv(num, den);
    const term = cMul(cExp({ re: 0, im: -u * k }), psi).re;
    const wgt = j === 0 || j === N ? 1 : j % 2 === 1 ? 4 : 2;   // composite Simpson
    sum += wgt * term;
  }
  const integral = (du / 3) * sum;
  const call = Math.max((Math.exp(-alpha * k) / Math.PI) * integral, 0);
  const put = call - S * Math.exp(-q * T) + K * Math.exp(-r * T);
  return { call, put, nodes: N };
}

export interface VRResult {
  method: string; price: number; stderr: number; paths: number; efficiency: number;
}

/** Compare plain MC, antithetic, control variate and quasi-MC on a European call. */
export function mcVarianceReduction(o: {
  S: number; K: number; r: number; sigma: number; T: number; nPaths: number; seed?: number;
}): { results: VRResult[]; exact: number; convergence: { n: number; plain: number; anti: number; cv: number; qmc: number }[] } {
  const { S, K, r, sigma, T, nPaths, seed = 11 } = o;
  const exact = blackScholes({ S, K, T, r, sigma }).call;
  const disc = Math.exp(-r * T), drift = (r - 0.5 * sigma * sigma) * T, vol = sigma * Math.sqrt(T);
  const rng = makeRng(seed);
  const z: number[] = Array.from({ length: nPaths }, () => randn(rng));
  const zq: number[] = Array.from({ length: nPaths }, (_, i) => {
    const u1 = Math.max(vanDerCorput(i + 1, 2), 1e-12), u2 = vanDerCorput(i + 1, 3);
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  });
  const payoff = (zz: number) => disc * Math.max(S * Math.exp(drift + vol * zz) - K, 0);
  const stat = (arr: number[]) => {
    const m = arr.reduce((s, x) => s + x, 0) / arr.length;
    const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, arr.length - 1);
    return { m, se: Math.sqrt(v / arr.length) };
  };
  const plainArr = z.map(payoff);
  const antiArr = z.map((zz) => 0.5 * (payoff(zz) + payoff(-zz)));
  // control variate: discounted S_T has known mean S
  const st = z.map((zz) => disc * S * Math.exp(drift + vol * zz));
  const mSt = st.reduce((s, x) => s + x, 0) / st.length;
  const mP = plainArr.reduce((s, x) => s + x, 0) / plainArr.length;
  let cov = 0, varS = 0;
  st.forEach((x, i) => { cov += (x - mSt) * (plainArr[i] - mP); varS += (x - mSt) ** 2; });
  const beta = varS > 0 ? cov / varS : 0;
  const cvArr = plainArr.map((p, i) => p - beta * (st[i] - S));
  const qmcArr = zq.map(payoff);
  const s0 = stat(plainArr);
  const mk = (name: string, arr: number[]): VRResult => {
    const s = stat(arr);
    return { method: name, price: s.m, stderr: s.se, paths: arr.length, efficiency: s.se > 0 ? (s0.se / s.se) ** 2 : 1 };
  };
  const convergence: { n: number; plain: number; anti: number; cv: number; qmc: number }[] = [];
  const avg = (arr: number[], n: number) => arr.slice(0, n).reduce((s, x) => s + x, 0) / n;
  for (let i = 1; i <= 20; i++) {
    const n = Math.max(20, Math.round((i / 20) * nPaths));
    convergence.push({
      n,
      plain: Math.abs(avg(plainArr, n) - exact),
      anti: Math.abs(avg(antiArr, n) - exact),
      cv: Math.abs(avg(cvArr, n) - exact),
      qmc: Math.abs(avg(qmcArr, n) - exact),
    });
  }
  return {
    exact,
    results: [mk("Plain MC", plainArr), mk("Antithetic", antiArr), mk("Control Variate", cvArr), mk("Quasi-MC (VdC)", qmcArr)],
    convergence,
  };
}

/* ═══════════════ 8. Rough volatility & optimal hedging ══════════ */

/** rBergomi: fractional kernel via Cholesky of the Volterra covariance. */
export function rBergomiSmile(o: {
  S0: number; xi: number; eta: number; H: number; rho: number; r?: number;
  T: number; steps?: number; nPaths?: number; seed?: number; strikes?: number[];
}) {
  const { S0, xi, eta, H, rho, r = 0, T, steps = 32, nPaths = 2000, seed = 5 } = o;
  const strikes = o.strikes ?? [80, 90, 95, 100, 105, 110, 120];
  const dt = T / steps;
  const g = (a: number, b: number) => {
    // covariance of the Volterra process at times a,b (a<=b), Riemann-Liouville
    const [s, t] = a <= b ? [a, b] : [b, a];
    if (s <= 0) return 0;
    // numerical integral of (t-u)^{H-1/2}(s-u)^{H-1/2}
    const N = 60; let acc = 0;
    for (let i = 0; i < N; i++) {
      const u = ((i + 0.5) / N) * s;
      acc += Math.pow(t - u, H - 0.5) * Math.pow(s - u, H - 0.5);
    }
    return (acc * s) / N;
  };
  const times = Array.from({ length: steps }, (_, i) => (i + 1) * dt);
  const cov = times.map((a) => times.map((b) => g(a, b)));
  // Cholesky (with jitter)
  const L = times.map(() => Array(steps).fill(0));
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j <= i; j++) {
      let s = cov[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(Math.max(s, 1e-14));
      else L[i][j] = s / (L[j][j] || 1e-12);
    }
  }
  const rng = makeRng(seed);
  const payoffs = strikes.map(() => 0);
  let realizedVar = 0;
  for (let p = 0; p < nPaths; p++) {
    const zv = Array.from({ length: steps }, () => randn(rng));
    const zs = Array.from({ length: steps }, () => randn(rng));
    let logS = Math.log(S0), rv = 0;
    for (let i = 0; i < steps; i++) {
      let W = 0;
      for (let k = 0; k <= i; k++) W += L[i][k] * zv[k];
      const t = times[i];
      const v = xi * Math.exp(eta * W - 0.5 * eta * eta * Math.pow(t, 2 * H));
      const dB = Math.sqrt(dt) * (rho * zv[i] + Math.sqrt(1 - rho * rho) * zs[i]);
      logS += (r - 0.5 * v) * dt + Math.sqrt(Math.max(v, 0)) * dB;
      rv += v * dt;
    }
    realizedVar += rv;
    const ST = Math.exp(logS);
    strikes.forEach((K, i) => { payoffs[i] += Math.max(ST - K, 0); });
  }
  const disc = Math.exp(-r * T);
  const smile = strikes.map((K, i) => {
    const price = (disc * payoffs[i]) / nPaths;
    // invert BS implied vol by bisection
    let lo = 0.01, hi = 3;
    for (let it = 0; it < 60; it++) {
      const mid = (lo + hi) / 2;
      if (blackScholes({ S: S0, K, T, r, sigma: mid }).call < price) lo = mid; else hi = mid;
    }
    return { K, logMoneyness: +Math.log(K / S0).toFixed(4), price, iv: (lo + hi) / 2 };
  });
  const atmIdx = smile.findIndex((s) => s.K >= S0);
  const skew = atmIdx > 0 && atmIdx < smile.length - 1
    ? (smile[atmIdx + 1].iv - smile[atmIdx - 1].iv) / (smile[atmIdx + 1].logMoneyness - smile[atmIdx - 1].logMoneyness)
    : 0;
  return { smile, atmSkew: skew, avgRealizedVol: Math.sqrt(realizedVar / nPaths / T), H, T };
}

/** ATM skew term structure: rough vol gives T^{H-1/2}, diffusions give ~flat. */
export function roughSkewTermStructure(H: number, eta: number, maturities: number[]) {
  return maturities.map((T) => ({
    T,
    rough: -(eta / 2) * Math.pow(T, H - 0.5),
    diffusive: -(eta / 2) * Math.pow(T, 0),
  }));
}

export interface HedgeResult2 {
  hedgeRatio: number; residualStd: number; superPrice: number; subPrice: number;
  meanVariancePrice: number; indifferencePrice: number; riskPremium: number;
  scatter: { dS: number; payoff: number; hedged: number }[];
  utilityCurve: { gamma: number; price: number }[];
}

/**
 * One-period incomplete market (diffusion + jumps): perfect replication fails,
 * so we compute the mean-variance hedge and the exponential-utility
 * indifference price instead of a single arbitrage-free price.
 */
export function meanVarianceHedge(o: {
  S0: number; K: number; r: number; sigma: number; T: number;
  lambda: number; muJ: number; sigmaJ: number; gamma: number; nPaths?: number; seed?: number;
}): HedgeResult2 {
  const { S0, K, r, sigma, T, lambda, muJ, sigmaJ, gamma, nPaths = 6000, seed = 3 } = o;
  const rng = makeRng(seed);
  const m = Math.exp(muJ + 0.5 * sigmaJ * sigmaJ) - 1;
  const ST: number[] = [], H: number[] = [];
  for (let i = 0; i < nPaths; i++) {
    let jump = 0, n = 0;
    const u = rng(); let p = Math.exp(-lambda * T), cum = p;
    while (u > cum && n < 20) { n++; p *= (lambda * T) / n; cum += p; }
    for (let j = 0; j < n; j++) jump += muJ + sigmaJ * randn(rng);
    const s = S0 * Math.exp((r - lambda * m - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * randn(rng) + jump);
    ST.push(s); H.push(Math.max(s - K, 0));
  }
  const disc = Math.exp(-r * T);
  const dS = ST.map((s) => disc * s - S0);
  const mDS = dS.reduce((a, b) => a + b, 0) / nPaths;
  const mH = H.reduce((a, b) => a + b, 0) / nPaths;
  let cov = 0, varD = 0;
  dS.forEach((d, i) => { cov += (d - mDS) * (disc * H[i] - disc * mH); varD += (d - mDS) ** 2; });
  const theta = varD > 0 ? cov / varD : 0;
  const hedged = H.map((h, i) => disc * h - theta * dS[i]);
  const mHedged = hedged.reduce((a, b) => a + b, 0) / nPaths;
  const resid = Math.sqrt(hedged.reduce((s, x) => s + (x - mHedged) ** 2, 0) / nPaths);
  const indiff = (g: number) => {
    const vals = hedged.map((x) => Math.exp(g * x));
    return (1 / g) * Math.log(vals.reduce((a, b) => a + b, 0) / nPaths);
  };
  const scatter = ST.slice(0, 300).map((s, i) => ({
    dS: +(disc * s - S0).toFixed(3), payoff: +(disc * H[i]).toFixed(3), hedged: +hedged[i].toFixed(3),
  }));
  return {
    hedgeRatio: theta, residualStd: resid,
    superPrice: disc * Math.max(...H), subPrice: disc * Math.min(...H),
    meanVariancePrice: mHedged, indifferencePrice: indiff(gamma),
    riskPremium: indiff(gamma) - mHedged,
    scatter,
    utilityCurve: [0.05, 0.2, 0.5, 1, 2, 4, 8].map((g) => ({ gamma: g, price: indiff(g) })),
  };
}
