/**
 * Round-3 econometric correctness:
 *  - MacKinnon (1996) ADF finite-sample critical values vs statsmodels
 *  - MacKinnon p-value monotonicity, KPSS interpolated p-values
 *  - ADF AIC/BIC automatic lag selection
 *  - Quantile-regression pairs bootstrap: reproducibility + async==sync
 *  - Backtest: Sharpe with risk-free, standard Sortino, leverage financing cost
 */
import { describe, it, expect } from "vitest";
import {
  adfTest, adfCriticalValues, mackinnonP, kpssPValue, adfAutoLag, makeSeries,
} from "../tsFrontier";
import { bootstrapQuantileReg, bootstrapQuantileRegAsync, quantileRegMulti } from "../panelEcon";
import { runBacktest } from "../backtest";

describe("MacKinnon ADF critical values (response surface)", () => {
  it("matches statsmodels mackinnoncrit for T=100, constant only", () => {
    // statsmodels: adfuller critical values at nobs≈100 → 5% ≈ -2.891, 1% ≈ -3.498
    const cv = adfCriticalValues(100, false);
    expect(cv.c5).toBeCloseTo(-2.8909, 3);
    expect(cv.c1).toBeCloseTo(-3.4977, 3);
    expect(cv.c10).toBeCloseTo(-2.5825, 3);
  });

  it("matches statsmodels for T=100, constant + trend", () => {
    const cv = adfCriticalValues(100, true);
    expect(cv.c5).toBeCloseTo(-3.4552, 3);
    expect(cv.c1).toBeCloseTo(-4.0521, 3);
  });

  it("converges to asymptotic values as T grows", () => {
    const cv = adfCriticalValues(100000, false);
    expect(cv.c1).toBeCloseTo(-3.43035, 3);
    expect(cv.c5).toBeCloseTo(-2.86154, 3);
    expect(cv.c10).toBeCloseTo(-2.56677, 3);
  });
});

describe("MacKinnon approximate p-values", () => {
  it("is monotonically increasing in the t-statistic", () => {
    const stats = [-5, -4, -3.6, -3.2, -2.9, -2.5, -2, -1.5, -1, -0.5];
    const ps = stats.map((s) => mackinnonP(s, false));
    for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeGreaterThan(ps[i - 1]);
    const psT = stats.map((s) => mackinnonP(s, true));
    for (let i = 1; i < psT.length; i++) expect(psT[i]).toBeGreaterThan(psT[i - 1]);
  });

  it("hits the tabulated knots", () => {
    expect(mackinnonP(-3.6, false)).toBeCloseTo(0.05, 6);
    expect(mackinnonP(-3.24, false)).toBeCloseTo(0.1, 6);
    expect(mackinnonP(-4.03, true)).toBeCloseTo(0.05, 6);
  });

  it("clamps outside the table", () => {
    expect(mackinnonP(-10, false)).toBe(0.001);
    expect(mackinnonP(2, false)).toBe(0.999);
  });

  it("adfTest exposes a p-value consistent with the 5% decision", () => {
    const rw = makeSeries("rw", 300, 7);
    const ar = makeSeries("ar", 300, 7, 0.5);
    const pRw = adfTest(rw, 2).pValue!;
    const pAr = adfTest(ar, 2).pValue!;
    expect(pRw).toBeGreaterThan(0.05); // unit root: fail to reject
    expect(pAr).toBeLessThan(0.05);    // stationary AR: reject
  });
});

describe("KPSS interpolated p-values", () => {
  it("is monotonically decreasing in the statistic", () => {
    const stats = [0.1, 0.2, 0.35, 0.46, 0.6, 0.74];
    const ps = stats.map((s) => kpssPValue(s, false));
    for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeLessThanOrEqual(ps[i - 1]);
  });

  it("hits the Kwiatkowski knots", () => {
    expect(kpssPValue(0.463, false)).toBeCloseTo(0.05, 6);
    expect(kpssPValue(0.146, true)).toBeCloseTo(0.05, 6);
  });
});

describe("ADF automatic lag selection", () => {
  it("returns a table for p = 0..pmax and selects within range", () => {
    const y = makeSeries("ar", 250, 11, 0.6);
    const sel = adfAutoLag(y, false, 8, "aic");
    expect(sel.table).toHaveLength(9);
    expect(sel.p).toBeGreaterThanOrEqual(0);
    expect(sel.p).toBeLessThanOrEqual(8);
    // selected p must minimise the chosen criterion
    const aics = sel.table.map((r) => r.aic);
    expect(sel.table[sel.p].aic).toBe(Math.min(...aics));
  });

  it("BIC never selects more lags than AIC on the same data", () => {
    const y = makeSeries("ar", 250, 11, 0.6);
    const a = adfAutoLag(y, false, 8, "aic");
    const b = adfAutoLag(y, false, 8, "bic");
    expect(b.p).toBeLessThanOrEqual(a.p);
  });
});

describe("Quantile regression bootstrap", () => {
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 80; i++) {
    const x = -2 + 4 * (i / 79);
    X.push([x]);
    y.push(1 + 2 * x + 0.3 * Math.sin(i * 1.7) * (1 + 0.4 * Math.abs(x)));
  }
  const taus = [0.25, 0.5, 0.75];

  it("is reproducible under the same seed", () => {
    const a = bootstrapQuantileReg(X, y, taus, 100, 0.05, 42);
    const b = bootstrapQuantileReg(X, y, taus, 100, 0.05, 42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("changes under a different seed", () => {
    const a = bootstrapQuantileReg(X, y, taus, 100, 0.05, 42);
    const b = bootstrapQuantileReg(X, y, taus, 100, 0.05, 43);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("async batched version matches the sync version exactly", async () => {
    const sync = bootstrapQuantileReg(X, y, taus, 60, 0.05, 7);
    const asy = await bootstrapQuantileRegAsync(X, y, taus, 60, 0.05, 7);
    expect(JSON.stringify(asy)).toBe(JSON.stringify(sync));
  });

  it("CI brackets the point estimate and SE is positive", () => {
    const res = bootstrapQuantileReg(X, y, taus, 200, 0.05, 42);
    for (const p of res) {
      for (let j = 0; j < p.coef.length; j++) {
        expect(p.ciLo[j]).toBeLessThanOrEqual(p.coef[j] + 1e-9);
        expect(p.ciHi[j]).toBeGreaterThanOrEqual(p.coef[j] - 1e-9);
        expect(p.se[j]).toBeGreaterThan(0);
      }
    }
  });

  it("median fit on symmetric data recovers the slope", () => {
    const beta = quantileRegMulti(X, y, 0.5);
    expect(beta[1]).toBeCloseTo(2, 0);
  });
});

describe("Backtest: risk-free, Sortino, financing", () => {
  // steadily rising market → SMA strategy stays long (position = 1)
  const up = Array.from({ length: 400 }, (_, i) => 100 * Math.exp(0.0005 * i));
  // noisy two-sided market
  const noisy = Array.from({ length: 400 }, (_, i) =>
    100 * Math.exp(0.0002 * i + 0.01 * Math.sin(i * 0.7) + 0.005 * Math.cos(i * 2.3)));

  it("Sharpe subtracts the annualised risk-free rate", () => {
    const base = runBacktest(up, undefined, "buyhold", {});
    const withRf = runBacktest(up, undefined, "buyhold", { riskFreeRate: 0.04 });
    const expected = base.metrics.annVol > 1e-9
      ? (base.metrics.annReturn - 0.04) / base.metrics.annVol
      : 0;
    expect(withRf.metrics.sharpe).toBeCloseTo(expected, 10);
    expect(withRf.metrics.sharpe).toBeCloseTo(base.metrics.sharpe - 0.04 / base.metrics.annVol, 10);
  });

  it("Sortino uses sqrt(mean(min(r−MAR,0)²)) over the FULL sample", () => {
    const res = runBacktest(noisy, undefined, "buyhold", {});
    // reconstruct daily strategy returns for buyhold (position 1, no costs)
    const rets: number[] = [];
    for (let i = 1; i < noisy.length; i++) rets.push(noisy[i] / noisy[i - 1] - 1);
    const downVar = rets.reduce((s, x) => s + Math.min(x, 0) ** 2, 0) / rets.length;
    const downStd = Math.sqrt(downVar) * Math.sqrt(252);
    const annReturn = (rets.reduce((s, x) => s + x, 0) / rets.length) * 252;
    expect(res.metrics.sortino).toBeCloseTo(annReturn / downStd, 8);
    // full-sample denominator: must differ from the old "std of negatives" formula
    const neg = rets.filter((x) => x < 0);
    const m = neg.reduce((s, x) => s + x, 0) / neg.length;
    const oldStd = Math.sqrt(neg.reduce((s, x) => s + (x - m) ** 2, 0) / (neg.length - 1)) * Math.sqrt(252);
    expect(Math.abs(downStd - oldStd)).toBeGreaterThan(1e-6);
  });

  it("Sortino MAR follows the risk-free rate", () => {
    const rf = 0.05;
    const res = runBacktest(noisy, undefined, "buyhold", { riskFreeRate: rf });
    const rets: number[] = [];
    for (let i = 1; i < noisy.length; i++) rets.push(noisy[i] / noisy[i - 1] - 1);
    const rfD = rf / 252;
    const downVar = rets.reduce((s, x) => s + Math.min(x - rfD, 0) ** 2, 0) / rets.length;
    const downStd = Math.sqrt(downVar) * Math.sqrt(252);
    const annReturn = (rets.reduce((s, x) => s + x, 0) / rets.length) * 252;
    expect(res.metrics.sortino).toBeCloseTo((annReturn - rf) / downStd, 8);
  });

  it("leverage financing cost is deducted daily on the borrowed part", () => {
    // low-vol uptrend → voltarget pins at maxLeverage 3
    const calm = Array.from({ length: 300 }, (_, i) => 100 * Math.exp(0.0004 * i));
    const fin = 0.12;
    const noFin = runBacktest(calm, undefined, "voltarget", { targetVol: 0.5, volWindow: 20, maxLeverage: 3 });
    const withFin = runBacktest(calm, undefined, "voltarget", { targetVol: 0.5, volWindow: 20, maxLeverage: 3, financingRate: fin });
    // reconstruct exactly from positions: sr = used·r − max(used−1,0)·fin/252
    const pos = withFin.position;
    let eq = 1;
    for (let t = 1; t < calm.length; t++) {
      const used = pos[t - 1] ?? 0;
      const r = calm[t] / calm[t - 1] - 1;
      eq *= 1 + used * r - Math.max(used - 1, 0) * (fin / 252);
    }
    expect(withFin.equity[withFin.equity.length - 1]).toBeCloseTo(eq, 10);
    // financing strictly reduces the final equity when leverage > 1
    expect(Math.max(...pos)).toBeGreaterThan(1);
    expect(withFin.equity[withFin.equity.length - 1]).toBeLessThan(noFin.equity[noFin.equity.length - 1]);
  });

  it("no financing cost when leverage ≤ 1", () => {
    const res = runBacktest(up, undefined, "buyhold", { financingRate: 0.5 });
    const base = runBacktest(up, undefined, "buyhold", {});
    expect(res.equity[res.equity.length - 1]).toBeCloseTo(base.equity[base.equity.length - 1], 12);
  });
});
