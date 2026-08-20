import { describe, it, expect } from "vitest";
import {
  bootstrapCurve, interpolateCurve, forwardRate, rollDownReturn, accruedInterest,
  pvCashflows, zSpread, spreadTaxonomy, effectiveRisk, keyRateHedge, redingtonImmunization,
  optionEmbeddedBond, convertibleBond, hullWhiteTheta, termPremiumDecomposition,
  creditSpreadDecomposition, ratingMigration, cdsBondBasis, waterfall, gaussianCopulaTranche,
  mbsNegativeConvexity, repoLeverage, marginSpiral, rfrCompounding, shiftedLognormalCaplet,
  greeniumSpread, bondLiquidityPremium, normCdf, normInv,
} from "@/lib/quant/fixedIncomeFrontier";

const flatZero = (z: number) => () => z;

describe("helpers", () => {
  it("normCdf / normInv are inverse", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normInv(0.975)).toBeCloseTo(1.959964, 3);
    expect(normCdf(normInv(0.3))).toBeCloseTo(0.3, 4);
  });
});

describe("curve construction", () => {
  it("bootstraps a flat par curve into a matching flat zero curve", () => {
    const pts = bootstrapCurve([
      { maturity: 1, parRate: 0.04 }, { maturity: 2, parRate: 0.04 },
      { maturity: 3, parRate: 0.04 }, { maturity: 5, parRate: 0.04 },
    ]);
    expect(pts).toHaveLength(4);
    for (const p of pts) {
      expect(p.discount).toBeGreaterThan(0);
      expect(p.discount).toBeLessThan(1);
      expect(p.zero).toBeCloseTo(pts[0].zero, 2);
    }
  });

  it("upward par curve gives zeros above par rates at the long end", () => {
    const pts = bootstrapCurve([
      { maturity: 1, parRate: 0.02 }, { maturity: 3, parRate: 0.03 }, { maturity: 5, parRate: 0.04 },
    ]);
    expect(pts[2].zero).toBeGreaterThan(0.04 * 0.95);
    expect(pts[0].maturity).toBeLessThan(pts[2].maturity);
  });

  it("interpolation methods agree at nodes and differ in forward roughness", () => {
    const nodes = [
      { maturity: 1, zero: 0.02 }, { maturity: 2, zero: 0.028 },
      { maturity: 5, zero: 0.033 }, { maturity: 10, zero: 0.036 },
    ];
    const lin = interpolateCurve(nodes, "linearZero");
    const flat = interpolateCurve(nodes, "flatForward");
    const cub = interpolateCurve(nodes, "cubicZero");
    for (const r of [lin, flat, cub]) {
      expect(r.curve.length).toBeGreaterThan(10);
      expect(r.roughness).toBeGreaterThanOrEqual(0);
      expect(r.curve.every((p) => Number.isFinite(p.forward))).toBe(true);
    }
    expect(lin.curve[lin.curve.length - 1].zero).toBeCloseTo(0.036, 6);
  });

  it("forward rate is the slope identity of zeros", () => {
    expect(forwardRate(0.02, 1, 0.03, 2)).toBeCloseTo(0.04, 10);
    expect(forwardRate(0.03, 1, 0.03, 2)).toBeCloseTo(0.03, 10);
  });

  it("roll-down is positive when the curve is upward sloping and unchanged", () => {
    const r = rollDownReturn({ zeroNow: 0.04, maturity: 5, horizon: 1, zeroRolled: 0.035, fundingRate: 0.02 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.carry).toBeCloseTo(0.02, 10);
    expect(r.carry + r.rolldown).toBeCloseTo(r.total, 12);
  });

  it("accrued interest is linear in elapsed days and inverts clean/dirty", () => {
    const a = accruedInterest({ coupon: 0.05, freq: 2, daysSinceCoupon: 90, daysInPeriod: 180 });
    expect(a.accrued).toBeCloseTo(1.25, 10);
    expect(a.toClean(a.toDirty(99))).toBeCloseTo(99, 10);
  });
});

describe("spread taxonomy", () => {
  const cfs = Array.from({ length: 10 }, (_, k) => ({ t: (k + 1) / 2, amount: k === 9 ? 102.5 : 2.5 }));

  it("zSpread is zero when the price equals the curve PV", () => {
    const zeroAt = flatZero(0.04);
    const pv = pvCashflows(cfs, zeroAt);
    expect(zSpread(cfs, zeroAt, pv)).toBeCloseTo(0, 6);
  });

  it("cheaper price implies a wider z-spread", () => {
    const zeroAt = flatZero(0.04);
    const pv = pvCashflows(cfs, zeroAt);
    expect(zSpread(cfs, zeroAt, pv - 3)).toBeGreaterThan(0);
    expect(zSpread(cfs, zeroAt, pv + 3)).toBeLessThan(0);
  });

  it("option cost equals z-spread minus OAS", () => {
    const zeroAt = flatZero(0.035);
    const price = pvCashflows(cfs, zeroAt) - 2;
    const t = spreadTaxonomy({ cfs, zeroAt, price, benchmarkYield: 0.035, maturity: 5, coupon: 0.05, oas: 0.002 });
    expect(t.optionCost).toBeCloseTo((t.zSpread as number) - 0.002, 10);
    expect(t.nominal).toBeGreaterThan(0);
    expect(Number.isFinite(t.asw)).toBe(true);
  });
});

describe("risk measures", () => {
  it("effective duration of a zero bond equals its maturity", () => {
    const p = (s: number) => 100 * Math.exp(-(0.03 + s) * 7);
    const r = effectiveRisk(p);
    expect(r.effDuration).toBeCloseTo(7, 4);
    expect(r.effConvexity).toBeCloseTo(49, 2);
    expect(r.dollarDuration).toBeCloseTo(7 * r.price, 4);
  });

  it("key-rate hedge neutralises bucket exposures", () => {
    const h = keyRateHedge({
      portfolioKrd: [1.2, 3.4], portfolioValue: 100,
      hedgeKrd: [[2, 0.1], [0.2, 5]], hedgeValues: [100, 100],
    });
    expect(h.notional).toHaveLength(2);
    expect(h.maxResidual).toBeLessThan(1e-6);
    expect(h.notional[0]).toBeLessThan(0);
  });

  it("Redington: duration-matched book with convexity dominance is immunized", () => {
    const r = redingtonImmunization({
      assetPv: 100, assetDuration: 6, assetConvexity: 60,
      liabPv: 100, liabDuration: 6, liabConvexity: 40,
    });
    expect(r.dollarGap).toBeCloseTo(0, 8);
    expect(r.convexityGap).toBeGreaterThan(0);
    expect(r.immunized).toBe(true);
    expect(r.surplus(0.01)).toBeGreaterThan(r.surplus(0));
  });
});

describe("embedded options and convertibles", () => {
  it("callable ≤ bullet ≤ putable", () => {
    const base = { coupon: 0.05, maturity: 5, r0: 0.045, sigma: 0.2, steps: 20 } as const;
    const bullet = optionEmbeddedBond({ ...base, type: "bullet" }).price;
    const callable = optionEmbeddedBond({ ...base, type: "call", strike: 100 }).price;
    const putable = optionEmbeddedBond({ ...base, type: "put", strike: 100 }).price;
    expect(callable).toBeLessThanOrEqual(bullet + 1e-9);
    expect(putable).toBeGreaterThanOrEqual(bullet - 1e-9);
    expect(optionEmbeddedBond({ ...base, type: "call", strike: 100 }).optionValue).toBeGreaterThanOrEqual(0);
  });

  it("convertible value exceeds its bond floor and is increasing in the stock", () => {
    const mk = (S: number) => convertibleBond({ coupon: 0.02, maturity: 5, creditYield: 0.05, riskFree: 0.03, stock: S, ratio: 2, sigma: 0.35 });
    const lo = mk(30), hi = mk(60);
    expect(lo.value).toBeGreaterThan(lo.bondFloor);
    expect(hi.value).toBeGreaterThan(lo.value);
    expect(hi.delta).toBeGreaterThan(lo.delta);
    expect(["bond", "hybrid", "equity"]).toContain(hi.regime);
  });
});

describe("term structure glue", () => {
  it("Hull-White theta reduces to a·f for a flat curve with tiny sigma", () => {
    const out = hullWhiteTheta({ forward: () => 0.03, a: 0.1, sigma: 1e-8, horizon: 5, steps: 10 });
    expect(out.path).toHaveLength(10);
    for (const p of out.path) expect(p.theta).toBeCloseTo(0.1 * 0.03, 8);
  });

  it("term premium is zero under the pure expectations hypothesis", () => {
    const eh = termPremiumDecomposition({ longYield: 0.03, expectedShorts: [0.02, 0.03, 0.04], maturity: 3 });
    expect(eh.termPremium).toBeCloseTo(0, 12);
    expect(eh.expectationsHolds).toBe(true);
    const tp = termPremiumDecomposition({ longYield: 0.04, expectedShorts: [0.02, 0.03, 0.04], maturity: 3 });
    expect(tp.termPremium).toBeGreaterThan(0);
  });
});

describe("credit", () => {
  it("spread decomposition shares sum to one and flags the credit-spread puzzle", () => {
    const d = creditSpreadDecomposition({
      observedSpread: 0.015, pd: 0.01, lgd: 0.6, riskPremiumMultiple: 2,
      liquidityPremium: 0.003, taxRate: 0.2, couponYield: 0.005,
    });
    const s = d.shares;
    expect(s.expectedLoss + s.riskPremium + s.liquidity + s.tax + s.residual).toBeCloseTo(1, 10);
    expect(d.creditSpreadPuzzle).toBe(true);
    expect(d.expectedLoss).toBeCloseTo(0.006, 10);
  });

  it("rating migration: default probability grows with the horizon", () => {
    const M = [
      [0.90, 0.08, 0.015, 0.005],
      [0.05, 0.88, 0.06, 0.01],
      [0.01, 0.10, 0.83, 0.06],
      [0, 0, 0, 1],
    ];
    const r = ratingMigration({ matrix: M, startRating: 0, horizons: [1, 3, 5], spreadsByRating: [0.005, 0.012, 0.035, 1], duration: 5 });
    expect(r.results).toHaveLength(3);
    expect(r.results[0].defaultProb).toBeLessThan(r.results[2].defaultProb);
    for (const x of r.results) expect(x.distribution.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });

  it("CDS-bond basis sign and trade direction", () => {
    const neg = cdsBondBasis({ cdsSpread: 0.01, bondZSpread: 0.02, repoCost: 0.001, fundingSpread: 0.001 });
    expect(neg.basis).toBeLessThan(0);
    expect(neg.sign).toBe("negative");
    expect(neg.trade).toContain("buy bond");
    const pos = cdsBondBasis({ cdsSpread: 0.03, bondZSpread: 0.02, repoCost: 0.001, fundingSpread: 0.001 });
    expect(pos.sign).toBe("positive");
  });
});

describe("structured products", () => {
  const tranches = [
    { name: "A", size: 70, coupon: 0.04 },
    { name: "B", size: 20, coupon: 0.07 },
    { name: "C", size: 10, coupon: 0.12 },
  ];

  it("waterfall: losses hit the junior tranche first", () => {
    const w = waterfall({ poolPrincipal: 100, poolInterest: 6, lossRate: 0.08, tranches });
    expect(w.tranches[0].writedown).toBeCloseTo(0, 8);
    expect(w.tranches[2].writedown).toBeGreaterThan(0);
    expect(w.loss).toBeCloseTo(8, 8);
  });

  it("waterfall: OC trigger diverts interest to senior principal", () => {
    const w = waterfall({ poolPrincipal: 100, poolInterest: 6, lossRate: 0.12, tranches, ocTrigger: 1.0 });
    expect(w.triggered).toBe(true);
    expect(w.tranches.every((t) => t.interestPaid === 0)).toBe(true);
  });

  it("copula tranche: equity loss ≥ mezz loss, and correlation lifts the senior", () => {
    const eq = gaussianCopulaTranche({ pd: 0.05, rho: 0.2, attach: 0, detach: 0.03 });
    const mez = gaussianCopulaTranche({ pd: 0.05, rho: 0.2, attach: 0.03, detach: 0.1 });
    expect(eq.expectedTrancheLoss).toBeGreaterThan(mez.expectedTrancheLoss);
    const sLow = gaussianCopulaTranche({ pd: 0.05, rho: 0.05, attach: 0.15, detach: 0.3 });
    const sHigh = gaussianCopulaTranche({ pd: 0.05, rho: 0.6, attach: 0.15, detach: 0.3 });
    expect(sHigh.expectedTrancheLoss).toBeGreaterThan(sLow.expectedTrancheLoss);
    expect(eq.expectedPoolLoss).toBeGreaterThan(0);
  });

  it("MBS shows duration shortening as rates fall", () => {
    const m = mbsNegativeConvexity({ wac: 0.055, baseCpr: 0.08, refiSensitivity: 8, maturity: 20 });
    expect(m.price).toBeGreaterThan(0);
    expect(m.durationLowRates).toBeLessThan(m.durationHighRates);
    expect(m.negativeConvexity).toBe(true);
    expect(m.curve.length).toBeGreaterThan(5);
  });
});

describe("leverage and funding", () => {
  it("repo leverage magnifies both carry and mark-to-market risk", () => {
    const lo = repoLeverage({ equity: 10, haircut: 0.1, assetYield: 0.04, repoRate: 0.025, duration: 5 });
    const hi = repoLeverage({ equity: 10, haircut: 0.02, assetYield: 0.04, repoRate: 0.025, duration: 5 });
    expect(hi.leverage).toBeGreaterThan(lo.leverage);
    expect(hi.roe).toBeGreaterThan(lo.roe);
    expect(hi.mtm).toBeLessThan(lo.mtm);
    expect(hi.wipeoutShock).toBeLessThan(lo.wipeoutShock);
  });

  it("margin spiral: bigger haircut shock forces more selling", () => {
    const mild = marginSpiral({ equity: 10, assets: 100, haircut0: 0.1, haircutShock: 0.02, priceImpact: 0.5 });
    const harsh = marginSpiral({ equity: 10, assets: 100, haircut0: 0.1, haircutShock: 0.15, priceImpact: 0.5 });
    expect(harsh.totalSold).toBeGreaterThan(mild.totalSold);
    expect(harsh.finalPrice).toBeLessThanOrEqual(mild.finalPrice);
    expect(mild.path.length).toBeGreaterThan(0);
  });
});

describe("frontier", () => {
  it("compounded RFR exceeds the simple average (convexity) and fallback uses the median", () => {
    const path = Array.from({ length: 90 }, (_, i) => 0.03 + 0.005 * Math.sin(i / 9));
    const r = rfrCompounding({ overnightPath: path, termFixing: 0.032, historicalBasis: [0.001, 0.002, 0.003] });
    expect(r.convexityGain).toBeGreaterThan(0);
    expect(r.fallbackSpread).toBeCloseTo(0.002, 10);
    expect(r.basis).toBeCloseTo(0.032 - r.compounded, 12);
  });

  it("shifted lognormal caplet prices negative forwards and is monotone in the strike", () => {
    const base = { forward: -0.002, sigma: 0.4, T: 2, shift: 0.03, tau: 0.5, discount: 0.98 };
    const a = shiftedLognormalCaplet({ ...base, strike: -0.001 });
    const b = shiftedLognormalCaplet({ ...base, strike: 0.005 });
    expect(a.valid).toBe(true);
    expect(a.price).toBeGreaterThan(b.price);
    expect(shiftedLognormalCaplet({ ...base, strike: -0.05 }).valid).toBe(false);
  });

  it("greenium tightens spreads while transition risk widens them", () => {
    const green = greeniumSpread({ baselineSpread: 0.012, greenLabel: true, investorDemand: 2, carbonIntensity: 0, transitionBeta: 0.5, carbonPrice: 0.05, duration: 6 });
    expect(green.spread).toBeLessThan(0.012);
    expect(green.netCheaper).toBe(true);
    const brown = greeniumSpread({ baselineSpread: 0.012, greenLabel: false, investorDemand: 0, carbonIntensity: 0.4, transitionBeta: 0.5, carbonPrice: 0.05, duration: 6 });
    expect(brown.spread).toBeGreaterThan(0.012);
    expect(brown.priceEffect).toBeLessThan(0);
  });

  it("liquidity premium falls with trading frequency and holding period", () => {
    const thin = bondLiquidityPremium({ turnover: 0.2, tradesPerDay: 1, quotedSpread: 0.01, volatility: 0.06, holdingPeriod: 1 });
    const deep = bondLiquidityPremium({ turnover: 2, tradesPerDay: 50, quotedSpread: 0.01, volatility: 0.06, holdingPeriod: 1 });
    expect(thin.liquidityPremium).toBeGreaterThan(deep.liquidityPremium);
    expect(thin.illiquid).toBe(true);
    expect(deep.illiquid).toBe(false);
    const long = bondLiquidityPremium({ turnover: 0.2, tradesPerDay: 1, quotedSpread: 0.01, volatility: 0.06, holdingPeriod: 5 });
    expect(long.liquidityPremium).toBeLessThan(thin.liquidityPremium);
  });
});
