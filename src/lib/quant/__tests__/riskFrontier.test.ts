import { describe, it, expect } from "vitest";
import {
  subadditivityDemo, spectralRisk, distortionRisk, pinballLoss, varOf, esOf,
  ewmaVol, garch11Filter, garch11Fit, harVol, filteredHistoricalSim,
  irbCapital, vasicekLossQuantile, pitPd,
  matPow, generatorFromP, SP_MIGRATION, creditMetrics,
  deleveragingSpiral, survivalHorizon,
  baselCapitalStack, modelRiskBand, capitalTrajectory,
  makeRng, randn,
} from "../riskFrontier";

const sample = (n = 2000, seed = 3) => {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => randn(rng) * 0.02);
};

describe("riskFrontier — V5.8 risk measures", () => {
  it("ES ≥ VaR for any sample", () => {
    const losses = sample().map((r) => -r);
    expect(esOf(losses, 0.99)).toBeGreaterThanOrEqual(varOf(losses, 0.99));
  });

  it("VaR violates sub-additivity on the defaultable-bond example", () => {
    const d = subadditivityDemo();
    expect(d.violatesVaR).toBe(true);
    expect(d.violatesES).toBe(false);
  });

  it("spectral risk increases with risk aversion", () => {
    const losses = sample();
    expect(spectralRisk(losses, 20).value).toBeGreaterThan(spectralRisk(losses, 2).value);
  });

  it("distortion measure with g(u)=u/(1-α) reproduces ES", () => {
    const losses = sample(4000, 9).map((r) => -r);
    const es = esOf(losses, 0.95);
    expect(distortionRisk(losses, "es", 0.95)).toBeCloseTo(es, 2);
  });

  it("Wang transform is monotone in the market price of risk", () => {
    const losses = sample();
    expect(distortionRisk(losses, "wang", 0.6)).toBeGreaterThan(distortionRisk(losses, "wang", 0.1));
  });

  it("pinball loss is minimised at the true quantile", () => {
    const y = sample(3000, 5);
    const q = varOf(y, 0.9);
    expect(pinballLoss(y, q, 0.9)).toBeLessThan(pinballLoss(y, q * 1.5, 0.9));
    expect(pinballLoss(y, q, 0.9)).toBeLessThan(pinballLoss(y, q * 0.5, 0.9));
  });
});

describe("riskFrontier — volatility & FHS", () => {
  it("EWMA and HAR both jump after a volatility burst; EWMA decays slower", () => {
    const rets = [...Array(200).fill(0.001), ...Array(20).fill(0.06), ...Array(30).fill(0.001)];
    const e = ewmaVol(rets, 0.94);
    const h = harVol(rets);
    expect(e[215]).toBeGreaterThan(e[195] * 5);
    expect(h[215]).toBeGreaterThan(h[195] * 5);
    // EWMA carries the shock forward far longer than the rolling HAR windows
    expect(e[245]).toBeGreaterThan(h[245]);
  });

  it("GARCH filter log-likelihood is finite and fit is stationary", () => {
    const rets = sample(800, 21);
    const fit = garch11Fit(rets);
    expect(Number.isFinite(fit.logLik)).toBe(true);
    expect(fit.persistence).toBeLessThan(1);
    const f = garch11Filter(rets, fit.omega, fit.alpha, fit.beta);
    expect(f.sigma.length).toBe(rets.length);
    expect(f.logLik).toBeCloseTo(fit.logLik, 6);
  });

  it("FHS VaR scales with the conditional vol forecast", () => {
    const rets = sample(1000, 33);
    const sig = ewmaVol(rets);
    const lo = filteredHistoricalSim(rets, sig, 0.01, 0.99, 1, 4000, 1);
    const hi = filteredHistoricalSim(rets, sig, 0.04, 0.99, 1, 4000, 1);
    expect(hi.var).toBeGreaterThan(lo.var * 3);
    expect(hi.es).toBeGreaterThanOrEqual(hi.var);
  });

  it("FHS multi-day VaR grows roughly with sqrt(h)", () => {
    const rets = sample(1500, 44);
    const sig = ewmaVol(rets);
    const d1 = filteredHistoricalSim(rets, sig, 0.02, 0.99, 1, 8000, 2).var;
    const d10 = filteredHistoricalSim(rets, sig, 0.02, 0.99, 10, 8000, 2).var;
    expect(d10 / d1).toBeGreaterThan(2);
    expect(d10 / d1).toBeLessThan(5);
  });
});

describe("riskFrontier — credit capital", () => {
  it("IRB capital increases with PD and LGD", () => {
    const base = irbCapital({ pd: 0.01, lgd: 0.45, ead: 100, maturity: 2.5 });
    const worse = irbCapital({ pd: 0.05, lgd: 0.45, ead: 100, maturity: 2.5 });
    const lossier = irbCapital({ pd: 0.01, lgd: 0.9, ead: 100, maturity: 2.5 });
    expect(worse.k).toBeGreaterThan(base.k);
    expect(lossier.k).toBeCloseTo(base.k * 2, 4);
  });

  it("IRB correlation falls as PD rises (corporate)", () => {
    const a = irbCapital({ pd: 0.001, lgd: 0.45, ead: 100, maturity: 2.5 }).correlation;
    const b = irbCapital({ pd: 0.1, lgd: 0.45, ead: 100, maturity: 2.5 }).correlation;
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThanOrEqual(0.12 - 1e-9);
  });

  it("maturity adjustment increases with M", () => {
    const m1 = irbCapital({ pd: 0.02, lgd: 0.45, ead: 1, maturity: 1 }).maturityAdj;
    const m5 = irbCapital({ pd: 0.02, lgd: 0.45, ead: 1, maturity: 5 }).maturityAdj;
    expect(m5).toBeGreaterThan(m1);
    expect(m1).toBeGreaterThan(0);
    // retail exposures carry no maturity adjustment
    expect(irbCapital({ pd: 0.02, lgd: 0.45, ead: 1, maturity: 5, kind: "retail_mortgage" }).maturityAdj).toBe(1);
  });

  it("RWA = 12.5 × K × EAD and EL = PD·LGD·EAD", () => {
    const r = irbCapital({ pd: 0.02, lgd: 0.4, ead: 250, maturity: 3 });
    expect(r.rwa).toBeCloseTo(r.k * 12.5 * 250, 8);
    expect(r.el).toBeCloseTo(0.02 * 0.4 * 250, 10);
  });

  it("Vasicek quantile exceeds the mean loss and rises with rho", () => {
    const q = vasicekLossQuantile(0.02, 0.15, 0.999);
    expect(q).toBeGreaterThan(0.02);
    expect(vasicekLossQuantile(0.02, 0.35, 0.999)).toBeGreaterThan(q);
  });

  it("PIT PD is monotone decreasing in the macro state z", () => {
    const bad = pitPd(0.02, 0.2, -2), mid = pitPd(0.02, 0.2, 0), good = pitPd(0.02, 0.2, 2);
    expect(bad).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(good);
    expect(bad).toBeGreaterThan(0.02);
  });
});

describe("riskFrontier — migration & CreditMetrics", () => {
  it("matrix powers keep rows summing to one (Chapman-Kolmogorov)", () => {
    const P5 = matPow(SP_MIGRATION, 5);
    for (const row of P5) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    const P2 = matPow(SP_MIGRATION, 2);
    const P4 = matPow(P2, 2);
    const direct = matPow(SP_MIGRATION, 4);
    expect(P4[3][7]).toBeCloseTo(direct[3][7], 10);
  });

  it("default probability is monotone in horizon and worsens down the scale", () => {
    expect(matPow(SP_MIGRATION, 5)[3][7]).toBeGreaterThan(SP_MIGRATION[3][7]);
    expect(SP_MIGRATION[6][7]).toBeGreaterThan(SP_MIGRATION[3][7]);
  });

  it("generator has zero row sums and non-negative off-diagonals", () => {
    const Q = generatorFromP(SP_MIGRATION);
    for (const row of Q) {
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 8);
    }
    for (let i = 0; i < Q.length; i++)
      for (let j = 0; j < Q.length; j++)
        if (i !== j) expect(Q[i][j]).toBeGreaterThanOrEqual(-1e-12);
  });

  it("CreditMetrics: credit VaR grows with correlation", () => {
    const cfg = { ratingIdx: 4, n: 40, lgd: 0.6, horizonYears: 1, maturity: 5, notional: 1, nSims: 1500, seed: 5 };
    const lo = creditMetrics({ ...cfg, rho: 0.05 });
    const hi = creditMetrics({ ...cfg, rho: 0.5 });
    expect(hi.creditVar).toBeGreaterThan(lo.creditVar);
    expect(hi.es99).toBeGreaterThanOrEqual(hi.var99);
  });

  it("CreditMetrics decomposes loss into migration + default", () => {
    const r = creditMetrics({ ratingIdx: 3, n: 30, rho: 0.2, lgd: 0.6, horizonYears: 1, maturity: 5, notional: 1, nSims: 1200, seed: 8 });
    expect(r.migrationLoss + r.defaultLoss).toBeCloseTo(r.mean, 6);
  });
});

describe("riskFrontier — liquidity & spirals", () => {
  it("deleveraging amplifies the direct loss", () => {
    const r = deleveragingSpiral({ assets: 100, equity: 10, haircut: 0.1, haircutShock: 0.03, priceImpact: 0.5, shock: 0.05, rounds: 8 });
    expect(r.amplification).toBeGreaterThan(1);
    expect(r.totalSales).toBeGreaterThan(0);
    expect(r.path.length).toBeGreaterThan(0);
  });

  it("higher price impact means deeper losses", () => {
    const base = { assets: 100, equity: 10, haircut: 0.1, haircutShock: 0.02, shock: 0.05, rounds: 8 };
    const soft = deleveragingSpiral({ ...base, priceImpact: 0.1 });
    const hard = deleveragingSpiral({ ...base, priceImpact: 1.2 });
    expect(hard.amplification).toBeGreaterThan(soft.amplification);
  });

  it("survival horizon shortens when outflows rise", () => {
    const a = survivalHorizon(10, 50, 0.1, 2, 5, 30);
    const b = survivalHorizon(10, 50, 0.1, 6, 5, 30);
    expect(b.survivalDays).toBeLessThan(a.survivalDays);
    expect(a.path.length).toBe(31);
  });
});

describe("riskFrontier — capital, model risk, resilience", () => {
  it("Basel stack ratios and requirements are consistent", () => {
    const r = baselCapitalStack({ cet1: 12, at1: 2, t2: 3, rwa: 100, exposure: 300, ccyb: 0.01, gsib: 0.01, hqla: 60, netOutflows: 50, asf: 110, rsf: 100 });
    expect(r.cet1Ratio).toBeCloseTo(0.12, 10);
    expect(r.tier1Ratio).toBeCloseTo(0.14, 10);
    expect(r.totalRatio).toBeCloseTo(0.17, 10);
    expect(r.cet1Required).toBeCloseTo(0.045 + 0.045, 10);
    expect(r.lcr).toBeCloseTo(1.2, 10);
    expect(r.nsfr).toBeCloseTo(1.1, 10);
    expect(r.mdaTrigger).toBe(false);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it("MDA caps payouts once the buffer is eaten into", () => {
    const r = baselCapitalStack({ cet1: 7, at1: 2, t2: 3, rwa: 100, exposure: 300, ccyb: 0.01, gsib: 0.01, hqla: 40, netOutflows: 50, asf: 90, rsf: 100 });
    expect(r.mdaTrigger).toBe(true);
    expect(r.mdaPayoutCap).toBeLessThan(1);
    expect(r.checks.find((c) => c.name === "LCR")!.pass).toBe(false);
  });

  it("model risk band widens with epsilon contamination", () => {
    const models = [
      { name: "Normal", var: 1.8, es: 2.1 },
      { name: "Hist", var: 2.4, es: 3.0 },
      { name: "EVT", var: 3.1, es: 4.2 },
    ];
    const lo = modelRiskBand(models, 0.05, 1.3);
    const hi = modelRiskBand(models, 0.4, 1.3);
    expect(lo.spread).toBeCloseTo(1.3, 10);
    expect(hi.contaminated).toBeGreaterThan(lo.contaminated);
    expect(lo.buffer).toBeGreaterThanOrEqual(0);
  });

  it("capital trajectory dips under stress and management actions help", () => {
    const cfg = {
      cet1: 12, rwa: 100, quarters: 9, ppnr: 0.4,
      lossPath: [1.2, 1.6, 1.8, 1.4, 1.0, 0.8, 0.6, 0.5, 0.4],
      rwaGrowth: 0.01, dividend: 0.4, buffer: 0.035,
    };
    const plain = capitalTrajectory(cfg);
    const managed = capitalTrajectory({ ...cfg, mgmtActions: true });
    expect(plain.trough).toBeLessThan(0.12);
    expect(plain.path.length).toBe(9);
    expect(managed.trough).toBeGreaterThanOrEqual(plain.trough);
    expect(plain.drawdownBps).toBeGreaterThan(0);
  });

  it("releasing the countercyclical buffer lowers the requirement", () => {
    const cfg = { cet1: 9, rwa: 100, quarters: 6, ppnr: 0.3, lossPath: [1.5], rwaGrowth: 0.01, dividend: 0.3, buffer: 0.045 };
    const strict = capitalTrajectory(cfg);
    const released = capitalTrajectory({ ...cfg, ccybRelease: 0.02 });
    expect(released.minRequirement).toBeLessThan(strict.minRequirement);
    expect(released.breaches).toBeLessThanOrEqual(strict.breaches);
  });
});
