/**
 * Plain-vanilla bond math: price, yield-to-maturity, Macaulay/modified
 * duration and convexity for an annual-coupon bond with m payments per year.
 */

export interface BondInputs {
  face: number;
  coupon: number; // annual coupon rate, e.g. 0.05
  years: number; // time to maturity in years
  freq: number; // payments per year (1 = annual, 2 = semi)
  ytm: number; // annual YTM, compounded `freq` times per year
}

export function bondPrice({ face, coupon, years, freq, ytm }: BondInputs): number {
  const n = Math.round(years * freq);
  const c = (coupon * face) / freq;
  const y = ytm / freq;
  let pv = 0;
  for (let t = 1; t <= n; t++) pv += c / Math.pow(1 + y, t);
  pv += face / Math.pow(1 + y, n);
  return pv;
}

/** Solve YTM via bisection — always converges for plain bonds. */
export function ytmBisect(
  inputs: Omit<BondInputs, "ytm"> & { price: number },
  lo = -0.5,
  hi = 2,
  tol = 1e-10,
  maxIter = 200
): number {
  const f = (y: number) => bondPrice({ ...inputs, ytm: y }) - inputs.price;
  let a = lo, b = hi, fa = f(a), fb = f(b);
  if (fa * fb > 0) return NaN;
  for (let i = 0; i < maxIter; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) return m;
    if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return 0.5 * (a + b);
}

export interface DurationResult {
  macaulay: number;
  modified: number;
  convexity: number;
}

export function bondDuration({ face, coupon, years, freq, ytm }: BondInputs): DurationResult {
  const n = Math.round(years * freq);
  const c = (coupon * face) / freq;
  const y = ytm / freq;
  const price = bondPrice({ face, coupon, years, freq, ytm });
  let wTimes = 0;
  let convex = 0;
  for (let t = 1; t <= n; t++) {
    const cf = t === n ? c + face : c;
    const pv = cf / Math.pow(1 + y, t);
    wTimes += (t / freq) * pv;
    convex += pv * (t / freq) * ((t + 1) / freq);
  }
  const macaulay = wTimes / price;
  const modified = macaulay / (1 + y);
  const convexity = convex / (price * Math.pow(1 + y, 2));
  return { macaulay, modified, convexity };
}