/**
 * Black-Scholes (1973) European option pricing in closed form.
 * Pure functions, framework-free, fully unit-tested in __tests__.
 */

/** Standard normal CDF using Abramowitz & Stegun 7.1.26 (max err ~7.5e-8). */
export function normCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface BSInputs {
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
  q?: number; // continuous dividend yield
}

export interface BSOutput {
  call: number;
  put: number;
  d1: number;
  d2: number;
  /** Δ for call */
  deltaCall: number;
  deltaPut: number;
  gamma: number;
  vega: number;
  thetaCall: number;
  thetaPut: number;
  rhoCall: number;
  rhoPut: number;
}

export function blackScholes({ S, K, T, r, sigma, q = 0 }: BSInputs): BSOutput {
  if (T <= 0 || sigma <= 0) {
    const intrinsicCall = Math.max(S - K, 0);
    const intrinsicPut = Math.max(K - S, 0);
    return {
      call: intrinsicCall,
      put: intrinsicPut,
      d1: 0,
      d2: 0,
      deltaCall: S > K ? 1 : 0,
      deltaPut: S < K ? -1 : 0,
      gamma: 0,
      vega: 0,
      thetaCall: 0,
      thetaPut: 0,
      rhoCall: 0,
      rhoPut: 0,
    };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normCdf(d1);
  const Nd2 = normCdf(d2);
  const nd1 = normPdf(d1);

  const eqT = Math.exp(-q * T);
  const erT = Math.exp(-r * T);

  const call = S * eqT * Nd1 - K * erT * Nd2;
  const put = K * erT * normCdf(-d2) - S * eqT * normCdf(-d1);

  return {
    call,
    put,
    d1,
    d2,
    deltaCall: eqT * Nd1,
    deltaPut: eqT * (Nd1 - 1),
    gamma: (eqT * nd1) / (S * sigma * sqrtT),
    vega: S * eqT * nd1 * sqrtT, // per 1.0 vol (divide by 100 for "per 1%")
    thetaCall:
      -(S * eqT * nd1 * sigma) / (2 * sqrtT) - r * K * erT * Nd2 + q * S * eqT * Nd1,
    thetaPut:
      -(S * eqT * nd1 * sigma) / (2 * sqrtT) +
      r * K * erT * normCdf(-d2) -
      q * S * eqT * normCdf(-d1),
    rhoCall: K * T * erT * Nd2,
    rhoPut: -K * T * erT * normCdf(-d2),
  };
}

/**
 * Newton-Raphson implied vol with Manaster-Koehler initial guess.
 * Returns NaN if iteration fails to converge.
 */
export function impliedVolatility(opts: {
  price: number;
  S: number;
  K: number;
  T: number;
  r: number;
  q?: number;
  type?: "call" | "put";
  tol?: number;
  maxIter?: number;
}): number {
  const { price, S, K, T, r, q = 0, type = "call", tol = 1e-8, maxIter = 100 } = opts;

  // Manaster-Koehler seed
  let sigma = Math.sqrt((2 * Math.abs(Math.log(S / K) + (r - q) * T)) / T) || 0.2;
  if (!isFinite(sigma) || sigma < 0.005) sigma = 0.2;

  for (let i = 0; i < maxIter; i++) {
    const bs = blackScholes({ S, K, T, r, sigma, q });
    const modelPrice = type === "call" ? bs.call : bs.put;
    const diff = modelPrice - price;
    if (Math.abs(diff) < tol) return sigma;
    if (bs.vega < 1e-10) return NaN;
    sigma -= diff / bs.vega;
    if (sigma <= 0) sigma = 1e-4;
  }
  return NaN;
}