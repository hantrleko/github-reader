/**
 * V4.5 Fixed Income Lab — credit, rate models, OAS/callable/MBS, inflation & curve.
 * Compact reference implementations optimised for interactive UI, not production risk.
 */

const SQRT2PI = Math.sqrt(2 * Math.PI);
function ndf(x: number) { return Math.exp(-0.5 * x * x) / SQRT2PI; }
function ncdf(x: number) {
  // Abramowitz-Stegun 7.1.26
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = ndf(x);
  const p = d * (0.319381530 * t - 0.356563782 * t ** 2 + 1.781477937 * t ** 3
    - 1.821255978 * t ** 4 + 1.330274429 * t ** 5);
  return x >= 0 ? 1 - p : p;
}

// ─── Credit: Merton structural model ─────────────────────────────
export interface MertonInput { V: number; sigmaV: number; D: number; r: number; T: number; }
export interface MertonOutput {
  equity: number; debt: number; d1: number; d2: number;
  PD: number; survival: number; spread: number; // continuous, decimal
  recovery: number; expectedLoss: number;
}
export function mertonCredit({ V, sigmaV, D, r, T }: MertonInput): MertonOutput {
  const s = Math.max(sigmaV * Math.sqrt(T), 1e-8);
  const d1 = (Math.log(V / D) + (r + 0.5 * sigmaV * sigmaV) * T) / s;
  const d2 = d1 - s;
  const equity = V * ncdf(d1) - D * Math.exp(-r * T) * ncdf(d2);
  const debt = V - equity;
  const PD = ncdf(-d2);
  const survival = 1 - PD;
  const B0 = D * Math.exp(-r * T); // risk-free bond
  const spread = -Math.log(Math.max(debt / B0, 1e-8)) / T;
  const recovery = PD > 1e-8 ? (V * ncdf(-d1)) / (D * PD) : 1;
  const expectedLoss = PD * (1 - recovery);
  return { equity, debt, d1, d2, PD, survival, spread, recovery, expectedLoss };
}

// ─── CDS: hazard bootstrap & par spread ──────────────────────────
/** Par CDS spread under flat hazard λ, recovery R, quarterly premium. */
export function cdsParSpread(lambda: number, R: number, T: number, r: number, freq = 4): number {
  const dt = 1 / freq;
  const n = Math.round(T * freq);
  let premLeg = 0, protLeg = 0, accrual = 0;
  for (let i = 1; i <= n; i++) {
    const t = i * dt, tPrev = (i - 1) * dt;
    const disc = Math.exp(-r * t);
    const survT = Math.exp(-lambda * t);
    const survPrev = Math.exp(-lambda * tPrev);
    premLeg += disc * survT * dt;
    const dPD = survPrev - survT;
    // integrate default over interval, mid-point disc
    const discMid = Math.exp(-r * (t - dt / 2));
    protLeg += discMid * (1 - R) * dPD;
    accrual += 0.5 * dt * discMid * dPD;
  }
  return protLeg / (premLeg + accrual);
}

/** Solve flat hazard λ from a market CDS spread via bisection. */
export function bootstrapHazard(sMkt: number, R: number, T: number, r: number, freq = 4): number {
  let lo = 1e-6, hi = 5;
  for (let i = 0; i < 80; i++) {
    const m = 0.5 * (lo + hi);
    const s = cdsParSpread(m, R, T, r, freq);
    if (s < sMkt) lo = m; else hi = m;
  }
  return 0.5 * (lo + hi);
}

// ─── Short-rate models (Vasicek / CIR / Hull-White) ──────────────
export interface VasicekParams { kappa: number; theta: number; sigma: number; r0: number; }
/** Vasicek zero-coupon bond price P(0,T). */
export function vasicekZCB(T: number, p: VasicekParams): number {
  const { kappa, theta, sigma, r0 } = p;
  const B = kappa < 1e-8 ? T : (1 - Math.exp(-kappa * T)) / kappa;
  const A = Math.exp((theta - (sigma * sigma) / (2 * kappa * kappa)) * (B - T)
    - (sigma * sigma * B * B) / (4 * kappa));
  return A * Math.exp(-B * r0);
}
export function vasicekYield(T: number, p: VasicekParams): number {
  if (T < 1e-8) return p.r0;
  return -Math.log(vasicekZCB(T, p)) / T;
}

export interface CIRParams extends VasicekParams {}
export function cirZCB(T: number, p: CIRParams): number {
  const { kappa, theta, sigma, r0 } = p;
  const g = Math.sqrt(kappa * kappa + 2 * sigma * sigma);
  const eg = Math.exp(g * T);
  const denom = (g + kappa) * (eg - 1) + 2 * g;
  const A = Math.pow((2 * g * Math.exp(0.5 * (kappa + g) * T)) / denom, (2 * kappa * theta) / (sigma * sigma));
  const B = (2 * (eg - 1)) / denom;
  return A * Math.exp(-B * r0);
}
export function cirYield(T: number, p: CIRParams): number {
  if (T < 1e-8) return p.r0;
  return -Math.log(cirZCB(T, p)) / T;
}

/** Simulate short-rate paths (Euler-Maruyama). model: "vasicek" | "cir". */
export function simulateShortRate(
  model: "vasicek" | "cir",
  p: VasicekParams,
  T: number,
  steps: number,
  paths: number,
  seed = 42,
): number[][] {
  const dt = T / steps;
  const sqDt = Math.sqrt(dt);
  let s = (seed >>> 0) || 1;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  // Box-Muller
  const gauss = () => {
    const u = Math.max(rand(), 1e-12), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const out: number[][] = [];
  for (let k = 0; k < paths; k++) {
    const path = new Array<number>(steps + 1);
    path[0] = p.r0;
    for (let i = 1; i <= steps; i++) {
      const r = path[i - 1];
      const drift = p.kappa * (p.theta - r) * dt;
      const diff = model === "vasicek"
        ? p.sigma * sqDt * gauss()
        : p.sigma * Math.sqrt(Math.max(r, 0)) * sqDt * gauss();
      path[i] = Math.max(r + drift + diff, model === "cir" ? 0 : -Infinity);
    }
    out.push(path);
  }
  return out;
}

// ─── OAS via Hull-White binomial tree (Ho-Lee style) ─────────────
/**
 * Compact Ho-Lee binomial tree calibrated to a flat short rate `r`, then price
 * a callable bond by backward induction with call feature. Compute OAS as the
 * parallel spread added to node rates such that model price = market price.
 */
export interface CallableBond {
  face: number; coupon: number; years: number; freq: number;
  rateVol: number; // annualised σ of short rate (abs, decimal)
  r0: number;      // flat short rate anchor
  callPrice?: number; // constant call strike (default 100)
  callFromYear?: number; // callable after this year (default 2)
}

function buildRateTree(r0: number, sigma: number, steps: number, dt: number, spread = 0): number[][] {
  // Ho-Lee: r_{i,j} = r0 + j * σ√dt (symmetric-ish); use r_{i,j} = r0 + (2j-i)*σ√dt/2
  const s = sigma * Math.sqrt(dt);
  const tree: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const row: number[] = [];
    for (let j = 0; j <= i; j++) row.push(r0 + (2 * j - i) * s + spread);
    tree.push(row);
  }
  return tree;
}

export function priceCallableBond(b: CallableBond, spread = 0): number {
  const steps = Math.round(b.years * b.freq);
  const dt = 1 / b.freq;
  const cpn = (b.coupon * b.face) / b.freq;
  const tree = buildRateTree(b.r0, b.rateVol, steps, dt, spread);
  const callK = b.callPrice ?? b.face;
  const callFromStep = Math.ceil((b.callFromYear ?? 2) * b.freq);
  // Terminal: receive face + last coupon
  let V: number[] = new Array(steps + 1).fill(b.face + cpn);
  for (let i = steps - 1; i >= 0; i--) {
    const next: number[] = [];
    for (let j = 0; j <= i; j++) {
      const disc = Math.exp(-tree[i][j] * dt);
      const cont = disc * 0.5 * (V[j] + V[j + 1]) + (i > 0 ? cpn : 0);
      let price = cont;
      // Issuer call — cap price at callK (issuer calls when price > callK)
      if (i >= callFromStep) price = Math.min(price, callK + (i > 0 ? cpn : 0));
      next.push(price);
    }
    V = next;
  }
  return V[0];
}

/** Solve OAS such that model price = market price (bisection over spread). */
export function solveOAS(b: CallableBond, marketPrice: number): number {
  let lo = -0.05, hi = 0.10;
  for (let i = 0; i < 60; i++) {
    const m = 0.5 * (lo + hi);
    const px = priceCallableBond(b, m);
    if (px > marketPrice) lo = m; else hi = m;
  }
  return 0.5 * (lo + hi);
}

// ─── MBS with PSA prepayment ─────────────────────────────────────
export interface MbsInput {
  balance: number; wac: number; wam: number; // months
  psa: number; // 100 = 100% PSA
  discountRate: number; // annualised, used for pricing
}
export interface MbsOutput {
  months: number[]; balance: number[]; interest: number[]; principal: number[]; prepay: number[]; cf: number[];
  wal: number; price: number;
}
export function mbsCashflows(inp: MbsInput): MbsOutput {
  const { wac, wam, psa, discountRate } = inp;
  const r = wac / 12;
  let bal = inp.balance;
  const months: number[] = [], bals: number[] = [], ints: number[] = [], prins: number[] = [], preps: number[] = [], cfs: number[] = [];
  let walNum = 0, walDen = 0, pv = 0;
  const disc = discountRate / 12;
  for (let m = 1; m <= wam; m++) {
    // PSA CPR schedule: 0.2%*m until m=30, then 6% flat, scaled
    const cprBase = Math.min(m, 30) * 0.002;
    const cpr = cprBase * (psa / 100);
    const smm = 1 - Math.pow(1 - cpr, 1 / 12);
    const remaining = wam - m + 1;
    // Scheduled mortgage payment given current balance
    const pmt = r < 1e-10 ? bal / remaining : bal * (r / (1 - Math.pow(1 + r, -remaining)));
    const interest = bal * r;
    const schedPrin = pmt - interest;
    const prepayment = smm * (bal - schedPrin);
    const totalPrin = schedPrin + prepayment;
    const cf = interest + totalPrin;
    months.push(m); bals.push(bal); ints.push(interest); prins.push(schedPrin); preps.push(prepayment); cfs.push(cf);
    walNum += (m / 12) * totalPrin;
    walDen += totalPrin;
    pv += cf / Math.pow(1 + disc, m);
    bal = Math.max(bal - totalPrin, 0);
    if (bal < 1e-4) break;
  }
  return { months, balance: bals, interest: ints, principal: prins, prepay: preps, cf: cfs,
    wal: walDen > 0 ? walNum / walDen : 0, price: pv };
}

// ─── Inflation & curve strategies ────────────────────────────────
export function breakevenInflation(nominalY: number, realY: number): number {
  return nominalY - realY;
}

/** PV01-weighted 2-5-10 butterfly: long belly, short wings.
 *  Weights so wings' total PV01 = belly PV01 (barbell hedge). */
export interface ButterflyInput {
  y2: number; y5: number; y10: number; // yields in decimal
  d2: number; d5: number; d10: number; // modified durations
  shift2: number; shift5: number; shift10: number; // yield shifts (decimal)
}
export function butterflyPnl(i: ButterflyInput) {
  // Belly weight = 1 unit notional. Wing weights: choose w2, w10 s.t.
  // w2*d2 + w10*d10 = d5 (PV01 hedge) and w2*d2 = w10*d10 (symmetric).
  const w2 = (0.5 * i.d5) / i.d2;
  const w10 = (0.5 * i.d5) / i.d10;
  // P&L per unit notional: -D * Δy
  const pnlBelly = -i.d5 * i.shift5; // long belly
  const pnlWings = -(-w2 * i.d2 * i.shift2 - w10 * i.d10 * i.shift10); // short wings
  const netCurvature = pnlBelly + pnlWings;
  return { w2, w10, pnlBelly, pnlWings, net: netCurvature };
}

/** Carry & roll-down over horizon h (years) on a NS-flat curve given yields. */
export function carryRolldown(spotYield: number, fwdYieldSameMat: number, rolledYield: number, duration: number, h: number) {
  const carry = spotYield * h; // coupon-carry proxy
  const rolldown = -duration * (rolledYield - spotYield);
  return { carry, rolldown, total: carry + rolldown, forwardImplied: fwdYieldSameMat };
}
