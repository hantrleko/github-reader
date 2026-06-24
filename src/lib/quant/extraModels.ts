/**
 * Pure, unit-tested implementations for the model-gap-fill tools.
 * UI components import these so the "verified" catalog flag is backed by tests.
 */

/* ── Cox-Ross-Rubinstein binomial option pricing ── */
export interface CRRInputs {
  S: number; K: number; r: number; q?: number; sigma: number; T: number; N: number;
  isCall: boolean; american: boolean;
}
export interface CRROutput { price: number; u: number; d: number; p: number; }

export function crrBinomial(opts: CRRInputs): CRROutput {
  const { S, K, r, q = 0, sigma, T, N, isCall, american } = opts;
  const dt = T / N;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const disc = Math.exp(-r * dt);
  const p = (Math.exp((r - q) * dt) - d) / (u - d);
  const payoff = (s: number) => (isCall ? Math.max(s - K, 0) : Math.max(K - s, 0));
  const v: number[] = [];
  for (let i = 0; i <= N; i++) v[i] = payoff(S * u ** i * d ** (N - i));
  for (let step = N - 1; step >= 0; step--) {
    for (let i = 0; i <= step; i++) {
      const cont = disc * (p * v[i + 1] + (1 - p) * v[i]);
      if (american) {
        const s = S * u ** i * d ** (step - i);
        v[i] = Math.max(cont, payoff(s));
      } else v[i] = cont;
    }
  }
  return { price: v[0], u, d, p };
}

/* ── Constant-product AMM ── */
/** Impermanent loss vs HODL for price ratio r = p₁/p₀. Returns a value ≤ 0. */
export function ammImpermanentLoss(r: number): number {
  return (2 * Math.sqrt(r)) / (1 + r) - 1;
}

/** Amount of token B received when selling dx of token A into pool (x,y). */
export function ammSwapOut(x: number, y: number, dx: number): number {
  return (y * dx) / (x + dx);
}

/* ── Prospect theory (Tversky & Kahneman 1992) ── */
export function prospectValue(x: number, alpha: number, beta: number, lambda: number): number {
  return x >= 0 ? Math.pow(x, alpha) : -lambda * Math.pow(-x, beta);
}
export function prospectWeight(p: number, gamma: number): number {
  const a = Math.pow(p, gamma);
  return a / Math.pow(a + Math.pow(1 - p, gamma), 1 / gamma);
}

/* ── Generalized Pareto fit (method of moments) for EVT/POT ── */
export interface GPDFit { xi: number; beta: number; }
export function fitGPD(exceedances: number[]): GPDFit {
  const n = exceedances.length;
  const m = exceedances.reduce((s, v) => s + v, 0) / n;
  const s2 = exceedances.reduce((s, v) => s + (v - m) ** 2, 0) / n;
  let xi = 0.5 * (1 - (m * m) / s2);
  let beta = 0.5 * m * (1 + (m * m) / s2);
  if (!isFinite(xi)) xi = 0.1;
  if (!isFinite(beta) || beta <= 0) beta = m;
  return { xi, beta };
}

/** POT VaR from a fitted GPD tail. */
export function potVaR(opts: {
  u: number; xi: number; beta: number; n: number; Nu: number; alpha: number;
}): number {
  const { u, xi, beta, n, Nu, alpha } = opts;
  const ratio = (n / Nu) * (1 - alpha);
  if (Math.abs(xi) < 1e-9) return u - beta * Math.log(ratio);
  return u + (beta / xi) * (Math.pow(ratio, -xi) - 1);
}