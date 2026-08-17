import { describe, it, expect } from "vitest";
import {
  garmanInventory, stollDecomposition, hoStollQuotes,
  estimatePIN, simulatePinDays, pinValue, pinLogLik, vpin,
  makeOrTake, queueFillProbability, zeroIntelligenceLOB, hawkesTrades,
  spreadDecomposition, corwinSchultzSpread, classifyTrades,
  squareRootImpact, priceDiscovery,
  tickSizeEffect, callAuctionVsContinuous, circuitBreakerSim,
  darkPoolSplit, liquidityEvaporation, amihudMendelson,
} from "../microstructure";

describe("Garman inventory", () => {
  it("balanced flows have zero drift and never fail", () => {
    const g = garmanInventory({ lambdaBuy: 5, lambdaSell: 5, inventory0: 100, cash0: 0, price: 100, halfSpread: 0.05, horizon: 100 });
    expect(g.balanced).toBe(true);
    expect(g.failureTime).toBeNull();
    expect(g.cashDrift).toBeCloseTo(5 * 0.05 * 2, 10);
  });
  it("net selling pressure from the dealer drains inventory to failure", () => {
    const g = garmanInventory({ lambdaBuy: 8, lambdaSell: 4, inventory0: 40, cash0: 0, price: 100, halfSpread: 0.05, horizon: 100 });
    expect(g.inventoryDrift).toBeLessThan(0);
    expect(g.failureTime).toBeCloseTo(10, 10);
  });
});

describe("Stoll decomposition", () => {
  it("component shares sum to one and covariance is negative", () => {
    const s = stollDecomposition({ orderProcessing: 0.02, inventoryCost: 0.01, adverseSelection: 0.03 });
    const sum = s.shares.orderProcessing + s.shares.inventory + s.shares.adverseSelection;
    expect(sum).toBeCloseTo(1, 12);
    expect(s.spread).toBeCloseTo(0.12, 12);
    expect(s.impliedCovariance).toBeLessThan(0);
  });
  it("pure adverse selection leaves no transitory component", () => {
    const s = stollDecomposition({ orderProcessing: 0, inventoryCost: 0, adverseSelection: 0.05 });
    expect(s.transitoryShare).toBeCloseTo(0, 12);
    expect(s.impliedCovariance).toBeCloseTo(0, 12);
  });
});

describe("Ho-Stoll quotes", () => {
  it("long inventory skews quotes down, flat inventory does not", () => {
    const long = hoStollQuotes({ mid: 100, inventory: 10, gamma: 0.1, sigma: 0.02, timeLeft: 1, k: 1.5 });
    const flat = hoStollQuotes({ mid: 100, inventory: 0, gamma: 0.1, sigma: 0.02, timeLeft: 1, k: 1.5 });
    expect(long.skew).toBeLessThan(0);
    expect(flat.skew).toBeCloseTo(0, 12);
    expect(long.ask - long.bid).toBeCloseTo(long.optimalSpread, 12);
  });
});

describe("PIN", () => {
  it("pinValue is monotone in informed intensity", () => {
    const lo = pinValue({ alpha: 0.3, delta: 0.5, mu: 10, epsB: 50, epsS: 50 });
    const hi = pinValue({ alpha: 0.3, delta: 0.5, mu: 60, epsB: 50, epsS: 50 });
    expect(hi).toBeGreaterThan(lo);
  });
  it("log-likelihood is finite and higher at the true parameters than at a distorted one", () => {
    const truth = { alpha: 0.4, delta: 0.5, mu: 40, epsB: 60, epsS: 60 };
    const { buys, sells } = simulatePinDays(truth, 120, 42);
    const llAt = (p: typeof truth) => buys.reduce((s, b, i) => s + pinLogLik(b, sells[i], p), 0);
    expect(Number.isFinite(llAt(truth))).toBe(true);
    expect(llAt(truth)).toBeGreaterThan(llAt({ ...truth, mu: 400 }));
  });
  it("estimated PIN is in (0,1) and close to the simulated truth", () => {
    const truth = { alpha: 0.4, delta: 0.5, mu: 40, epsB: 60, epsS: 60 };
    const { buys, sells } = simulatePinDays(truth, 150, 9);
    const fit = estimatePIN(buys, sells);
    expect(fit.pin).toBeGreaterThan(0);
    expect(fit.pin).toBeLessThan(1);
    expect(Math.abs(fit.pin - pinValue(truth))).toBeLessThan(0.25);
  });
});

describe("VPIN", () => {
  it("balanced two-sided flow gives lower toxicity than one-sided flow", () => {
    const n = 200;
    const vols = new Array(n).fill(100);
    const alt = Array.from({ length: n }, (_, i) => (i % 2 ? 0.01 : -0.01));
    const oneSided = new Array(n).fill(0.01);
    const a = vpin(alt, vols, 500).mean;
    const b = vpin(oneSided, vols, 500).mean;
    expect(b).toBeGreaterThan(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(1);
  });
});

describe("make-or-take", () => {
  it("high adverse selection pushes the decision to crossing", () => {
    const safe = makeOrTake({ halfSpread: 0.02, fillProb: 0.6, adverseSelection: 0.001, delayCost: 0.002 });
    const toxic = makeOrTake({ halfSpread: 0.02, fillProb: 0.6, adverseSelection: 0.09, delayCost: 0.02 });
    expect(safe.decision).toBe("limit");
    expect(toxic.decision).toBe("market");
    expect(safe.edge).toBeGreaterThan(toxic.edge);
  });
});

describe("queue fill probability", () => {
  it("more volume ahead lowers fill probability and raises expected wait", () => {
    const front = queueFillProbability({ queueAhead: 100, ownSize: 10, tradeRate: 50, cancelRate: 30, horizon: 5 });
    const back = queueFillProbability({ queueAhead: 900, ownSize: 10, tradeRate: 50, cancelRate: 30, horizon: 5 });
    expect(front.fillProb).toBeGreaterThan(back.fillProb);
    expect(back.expectedWait).toBeGreaterThan(front.expectedWait);
    expect(front.fillProb).toBeLessThanOrEqual(1);
  });
});

describe("zero-intelligence LOB", () => {
  it("is deterministic per seed and produces positive spread and depth", () => {
    const cfg = { limitRate: 1, marketRate: 0.4, cancelRate: 0.5, levels: 6, events: 2000, tick: 0.01, seed: 21 };
    const a = zeroIntelligenceLOB(cfg);
    const b = zeroIntelligenceLOB(cfg);
    expect(a.meanSpread).toBeCloseTo(b.meanSpread, 12);
    expect(a.meanSpread).toBeGreaterThan(0);
    expect(a.spreadPath.length).toBe(2000);
  });
  it("more market orders relative to limit orders widen the average spread", () => {
    const base = { levels: 6, events: 3000, tick: 0.01, seed: 5 };
    const patient = zeroIntelligenceLOB({ ...base, limitRate: 2, marketRate: 0.2, cancelRate: 0.3 });
    const aggressive = zeroIntelligenceLOB({ ...base, limitRate: 0.6, marketRate: 1.6, cancelRate: 0.3 });
    expect(aggressive.meanSpread).toBeGreaterThan(patient.meanSpread);
  });
});

describe("Hawkes trades", () => {
  it("branching ratio < 1 is stationary with finite expected rate", () => {
    const h = hawkesTrades({ mu: 1, alpha: 0.5, beta: 1.2, T: 200, seed: 3 });
    expect(h.stationary).toBe(true);
    expect(h.expectedRate).toBeCloseTo(1 / (1 - 0.5 / 1.2), 10);
    expect(h.times.length).toBeGreaterThan(0);
  });
  it("stronger self-excitation increases clustering", () => {
    const weak = hawkesTrades({ mu: 1, alpha: 0.05, beta: 1.5, T: 300, seed: 8 });
    const strong = hawkesTrades({ mu: 1, alpha: 1.3, beta: 1.5, T: 300, seed: 8 });
    expect(strong.times.length).toBeGreaterThan(weak.times.length);
    expect(strong.branchingRatio).toBeGreaterThan(weak.branchingRatio);
  });
});

describe("spread decomposition", () => {
  it("effective = realized + impact holds exactly", () => {
    const trades = [
      { price: 100.05, midBefore: 100.0, midAfter: 100.02, direction: 1 as const },
      { price: 99.94, midBefore: 100.0, midAfter: 99.97, direction: -1 as const },
      { price: 100.08, midBefore: 100.02, midAfter: 100.05, direction: 1 as const },
    ];
    const m = spreadDecomposition(trades);
    expect(m.identityGap).toBeCloseTo(0, 12);
    expect(m.effective).toBeGreaterThan(0);
    expect(m.priceImpact).toBeGreaterThan(0);
  });
});

describe("Corwin-Schultz", () => {
  it("returns a non-negative estimate that grows with the high-low range", () => {
    const tight = corwinSchultzSpread([100.1, 100.2, 100.15], [99.95, 100.0, 100.02]);
    const wide = corwinSchultzSpread([101.5, 102.0, 101.6], [98.5, 99.0, 98.7]);
    expect(tight.spread).toBeGreaterThanOrEqual(0);
    expect(wide.spread).toBeGreaterThan(tight.spread);
    expect(wide.series.length).toBe(2);
  });
});

describe("trade classification", () => {
  it("Lee-Ready beats the tick rule on midpoint-referenced data", () => {
    const truth: (1 | -1)[] = [];
    const prices: number[] = [], mids: number[] = [];
    let mid = 100;
    for (let i = 0; i < 200; i++) {
      const d: 1 | -1 = i % 3 === 0 ? -1 : 1;
      truth.push(d);
      mids.push(mid);
      prices.push(mid + d * 0.02);
      mid += d * 0.001;
    }
    const c = classifyTrades(prices, mids, truth);
    expect(c.leeReadyAccuracy).toBeCloseTo(1, 6);
    expect(c.leeReadyAccuracy).toBeGreaterThanOrEqual(c.tickAccuracy);
  });
});

describe("square-root impact", () => {
  it("scales as sqrt of participation and splits permanent/temporary", () => {
    const a = squareRootImpact({ sigma: 0.02, Q: 1e5, V: 1e6 });
    const b = squareRootImpact({ sigma: 0.02, Q: 4e5, V: 1e6 });
    expect(b.total / a.total).toBeCloseTo(2, 6);
    expect(a.permanent + a.temporary).toBeCloseTo(a.total, 12);
    expect(a.participation).toBeCloseTo(0.1, 12);
  });
});

describe("price discovery", () => {
  it("Gonzalo-Granger weights sum to one and bounds bracket the midpoint", () => {
    const d = priceDiscovery({ alpha1: -0.6, alpha2: 0.1, sigma1: 0.01, sigma2: 0.01, rho: 0.5 });
    expect(d.ggWeights[0] + d.ggWeights[1]).toBeCloseTo(1, 12);
    expect(d.isLower[0]).toBeLessThanOrEqual(d.isMid[0]);
    expect(d.isMid[0]).toBeLessThanOrEqual(d.isUpper[0]);
  });
  it("the venue that does not adjust dominates price discovery", () => {
    const d = priceDiscovery({ alpha1: -0.05, alpha2: 0.8, sigma1: 0.01, sigma2: 0.01, rho: 0.3 });
    expect(d.dominantVenue).toBe(1);
  });
});

describe("tick size", () => {
  it("a tick above the frictionless spread binds and creates maker rents", () => {
    const binding = tickSizeEffect({ tick: 0.05, price: 20, frictionlessSpread: 0.01, dailyVolume: 1e6, queuePriorityValue: 0.5 });
    const free = tickSizeEffect({ tick: 0.01, price: 200, frictionlessSpread: 0.06, dailyVolume: 1e6, queuePriorityValue: 0.5 });
    expect(binding.binding).toBe(true);
    expect(binding.makerRent).toBeGreaterThan(0);
    expect(free.binding).toBe(false);
    expect(free.makerRent).toBe(0);
    expect(binding.quotedSpreadBps).toBeGreaterThan(free.quotedSpreadBps);
  });
});

describe("call auction", () => {
  it("batching reduces pricing error relative to continuous trading", () => {
    const a = callAuctionVsContinuous({ noiseTraders: 100, informedShare: 0.2, sigmaValue: 0.02, sigmaNoise: 0.05, batchSize: 25 });
    expect(a.callBetter).toBe(true);
    expect(a.efficiencyGain).toBeGreaterThan(0);
    expect(a.consolidationRatio).toBeCloseTo(5, 10);
  });
  it("batch size 1 collapses to continuous trading", () => {
    const a = callAuctionVsContinuous({ noiseTraders: 100, informedShare: 0.2, sigmaValue: 0.02, sigmaNoise: 0.05, batchSize: 1 });
    expect(a.callPriceError).toBeCloseTo(a.continuousPriceError, 12);
    expect(a.efficiencyGain).toBeCloseTo(0, 12);
  });
});

describe("circuit breaker", () => {
  it("a tighter band triggers more halts", () => {
    const base = { sigma: 0.02, steps: 400, drift: 0, haltMinutes: 5, coolingFactor: 0.4, seed: 17 };
    const tight = circuitBreakerSim({ ...base, threshold: 0.02 });
    const loose = circuitBreakerSim({ ...base, threshold: 0.2 });
    expect(tight.halts).toBeGreaterThanOrEqual(loose.halts);
    expect(tight.path.length).toBe(400);
  });
});

describe("dark pool", () => {
  it("cream-skimming raises the lit spread; zero dark share is neutral", () => {
    const dark = darkPoolSplit({ totalFlow: 1e6, darkShare: 0.4, informedShare: 0.2, litSpread: 0.02, litDepth: 1000 });
    const none = darkPoolSplit({ totalFlow: 1e6, darkShare: 0, informedShare: 0.2, litSpread: 0.02, litDepth: 1000 });
    expect(dark.creamSkimming).toBe(true);
    expect(dark.litInformedShare).toBeGreaterThan(0.2);
    expect(dark.displayedDepth).toBeLessThan(none.displayedDepth);
    expect(none.spreadChange).toBeCloseTo(0, 12);
  });
});

describe("liquidity evaporation", () => {
  it("higher resilience shortens the half-life of the spread spike", () => {
    const slow = liquidityEvaporation({ shock: 2, resilienceRate: 0.1, horizon: 40, marketMakerExit: 0.2, feedbackLoop: 0.1 });
    const fast = liquidityEvaporation({ shock: 2, resilienceRate: 0.6, horizon: 40, marketMakerExit: 0.2, feedbackLoop: 0.1 });
    expect(fast.halfLife).toBeLessThan(slow.halfLife);
    expect(slow.path.length).toBe(41);
    expect(slow.troughDepth).toBeLessThanOrEqual(1);
  });
});

describe("Amihud-Mendelson", () => {
  it("longer horizons amortize the spread and required return exceeds gross", () => {
    const a = amihudMendelson({ grossReturn: 0.08, spread: 0.02, holdingPeriods: [0.25, 1, 5] });
    expect(a.clientele[0].amortizedCost).toBeGreaterThan(a.clientele[2].amortizedCost);
    expect(a.clientele[2].netReturn).toBeGreaterThan(a.clientele[0].netReturn);
    expect(a.requiredReturn).toBeGreaterThan(0.08);
  });
});
