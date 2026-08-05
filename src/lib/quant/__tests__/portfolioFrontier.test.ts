import { describe, it, expect } from "vitest";
import {
  frontierGeometry, longOnlyTargetReturn, singleIndexLab, estimationErrorLab,
  constraintRebalanceLab, projectCapped, cappedMinVar, activeManagementLab,
  downsideMetrics, downsideRiskLab, dynamicAllocationLab,
  regularizationLab, regularizedMinVar, maxDiversification, diversificationRatio,
  portSigma, tangencyLongOnly, minVarLongOnly, sampleCovRows,
} from "../portfolioFrontier";

const mu = [0.08, 0.11, 0.14];
const cov = [
  [0.04, 0.008, 0.006],
  [0.008, 0.09, 0.012],
  [0.006, 0.012, 0.16],
];
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

describe("frontier geometry", () => {
  const g = frontierGeometry(mu, cov, 0.02);

  it("hyperbola constants satisfy D = AC − B² > 0", () => {
    expect(g.D).toBeCloseTo(g.A * g.C - g.B * g.B, 8);
    expect(g.D).toBeGreaterThan(0);
  });

  it("GMV has the lowest volatility on the analytic frontier", () => {
    for (const p of g.curve) expect(p.vol).toBeGreaterThanOrEqual(g.gmv.vol - 1e-9);
    expect(sum(g.gmv.weights)).toBeCloseTo(1, 8);
  });

  it("analytic frontier volatility matches the explicit weight variance", () => {
    const target = g.gmv.ret + 0.03;
    const k1 = (g.C - g.B * target) / g.D;
    expect(Number.isFinite(k1)).toBe(true);
    const analytic = Math.sqrt((g.A * target * target - 2 * g.B * target + g.C) / g.D);
    const nearest = g.curve.reduce((b, p) => (Math.abs(p.ret - target) < Math.abs(b.ret - target) ? p : b), g.curve[0]);
    expect(Math.abs(nearest.vol - analytic)).toBeLessThan(0.02);
  });

  it("tangency maximises the Sharpe ratio among frontier points", () => {
    expect(g.tangency).not.toBeNull();
    const st = g.tangency!.sharpe;
    for (const p of g.curve.filter((x) => x.efficient && x.vol > 1e-6)) {
      expect((p.ret - 0.02) / p.vol).toBeLessThanOrEqual(st + 1e-6);
    }
  });

  it("zero-beta portfolio has (near) zero covariance with the tangency", () => {
    const z = g.zeroBeta!.weights, t = g.tangency!.weights;
    const Sz = cov.map((row) => row.reduce((s, x, j) => s + x * z[j], 0));
    const c = t.reduce((s, w, i) => s + w * Sz[i], 0);
    expect(Math.abs(c)).toBeLessThan(1e-8);
    expect(sum(z)).toBeCloseTo(1, 6);
  });

  it("betas relative to the tangency portfolio average to ~1 under its weights", () => {
    const wb = g.tangency!.weights.reduce((s, w, i) => s + w * g.assets[i].beta, 0);
    expect(wb).toBeCloseTo(1, 6);
  });

  it("long-only target-return solver stays on the simplex", () => {
    const w = longOnlyTargetReturn(mu, cov, 0.11);
    expect(sum(w)).toBeCloseTo(1, 5);
    expect(w.every((x) => x >= -1e-9)).toBe(true);
  });
});

describe("single-index model", () => {
  const s = singleIndexLab({ n: 10, T: 48, seed: 4 });
  it("uses far fewer parameters than the sample covariance", () => {
    expect(s.paramsIndex).toBeLessThan(s.paramsSample);
  });
  it("estimated betas are centred near the true mean beta", () => {
    const avg = s.betas.reduce((a, b) => a + b, 0) / s.betas.length;
    expect(avg).toBeGreaterThan(0.5);
    expect(avg).toBeLessThan(1.6);
  });
  it("structured covariance beats the raw sample cov out of sample when T < 5N", () => {
    expect(s.oosVolIndex).toBeLessThan(s.oosVolSample);
  });
});

describe("estimation error", () => {
  const e = estimationErrorLab({ n: 8, T: 36, sims: 40, seed: 2 });
  it("no estimated rule beats the oracle", () => {
    for (const row of e.rows) expect(row.trueSharpe).toBeLessThanOrEqual(e.oracleSharpe + 1e-9);
  });
  it("plug-in mean-variance carries larger weight error than 1/N", () => {
    const mv = e.rows.find((r) => r.method.includes("切点"))!;
    const eq = e.rows.find((r) => r.method.includes("等权"))!;
    expect(mv.maxWeight).toBeGreaterThan(eq.maxWeight);
  });
  it("plug-in Sharpe improves as the sample grows", () => {
    const first = e.bySample[0].mv, last = e.bySample[e.bySample.length - 1].mv;
    expect(last).toBeGreaterThan(first - 1e-9);
  });
});

describe("constraints & rebalancing", () => {
  const r = constraintRebalanceLab({ n: 5, days: 504, seed: 6, costBps: 20, threshold: 0.05 });
  it("buy & hold pays no cost and has the largest drift", () => {
    const bh = r.rows[0];
    expect(bh.cost).toBeCloseTo(0, 12);
    const monthly = r.rows[1];
    expect(bh.maxDrift).toBeGreaterThan(monthly.maxDrift);
  });
  it("wider bands trade less and cost less", () => {
    const tight = r.frontier[0], wide = r.frontier[r.frontier.length - 1];
    expect(wide.turnover).toBeLessThanOrEqual(tight.turnover);
    expect(wide.cost).toBeLessThanOrEqual(tight.cost);
  });
  it("capped projection respects the box and sums to one", () => {
    const w = projectCapped([0.9, 0.05, 0.3, -0.2], 0.4);
    expect(sum(w)).toBeCloseTo(1, 6);
    expect(Math.max(...w)).toBeLessThanOrEqual(0.4 + 1e-6);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(-1e-9);
  });
  it("a tighter cap cannot lower the min-variance volatility", () => {
    const free = cappedMinVar(cov, 1), capped = cappedMinVar(cov, 0.4);
    expect(portSigma(capped, cov)).toBeGreaterThanOrEqual(portSigma(free, cov) - 1e-8);
  });
});

describe("active management", () => {
  it("fundamental law: IR = IC·√breadth, scaled by the transfer coefficient", () => {
    const a = activeManagementLab({ ic: 0.05, breadth: 400, tc: 0.5 });
    expect(a.ir).toBeCloseTo(0.05 * 20, 10);
    expect(a.irWithTC).toBeCloseTo(0.5 * a.ir, 10);
    expect(a.valueAdded).toBeCloseTo((a.irWithTC ** 2) / (4 * 0.1), 10);
  });
  it("Treynor-Black: combined Sharpe² = market Sharpe² + appraisal²", () => {
    const a = activeManagementLab({});
    const tb = a.treynorBlack;
    expect(tb.sharpeCombined ** 2).toBeCloseTo(tb.sharpeMarket ** 2 + tb.appraisal ** 2, 10);
    expect(sum(tb.positions.map((p) => p.weight))).toBeCloseTo(1, 8);
  });
});

describe("downside risk & stochastic dominance", () => {
  it("semi-deviation never exceeds total volatility for a symmetric sample", () => {
    const x = Array.from({ length: 500 }, (_, i) => Math.sin(i) * 0.05);
    const m = downsideMetrics(x, 0);
    expect(m.semiDev).toBeLessThanOrEqual(m.vol + 1e-9);
  });
  it("a left-tail jump distribution shows negative skew and a larger CVaR", () => {
    const d = downsideRiskLab({ seed: 8, n: 3000, jumpProb: 0.06, jumpSize: 0.4 });
    expect(d.b.skew).toBeLessThan(d.a.skew);
    expect(d.b.cvar95).toBeGreaterThan(d.a.cvar95);
  });
  it("CRRA certainty equivalent is maximised at the reported weight", () => {
    const d = downsideRiskLab({ seed: 8, n: 2000 });
    const best = d.utility.find((p) => Math.abs(p.w - d.bestWeight) < 1e-9)!;
    for (const p of d.utility) expect(p.ceq).toBeLessThanOrEqual(best.ceq + 1e-12);
  });
});

describe("dynamic allocation", () => {
  it("Merton myopic weight matches (μ − r)/(γσ²)", () => {
    const d = dynamicAllocationLab({ mu: 0.08, sigma: 0.2, rf: 0.02, gamma: 3, sims: 200, horizon: 10 });
    expect(d.myopic).toBeCloseTo(0.06 / (3 * 0.04), 10);
  });
  it("higher risk aversion lowers the equity weight", () => {
    const lo = dynamicAllocationLab({ gamma: 2, sims: 200 });
    const hi = dynamicAllocationLab({ gamma: 8, sims: 200 });
    expect(hi.myopic).toBeLessThan(lo.myopic);
  });
  it("the glide path de-risks as human capital shrinks", () => {
    const d = dynamicAllocationLab({ sims: 200 });
    const young = d.glide[0], old = d.glide[d.glide.length - 1];
    expect(young.humanRatio).toBeGreaterThan(old.humanRatio);
    expect(young.financialEquity).toBeGreaterThanOrEqual(old.financialEquity - 1e-9);
  });
});

describe("regularisation & maximum diversification", () => {
  it("diversification ratio is ≥ 1 and equals 1 for a single asset", () => {
    expect(diversificationRatio([1, 0, 0], cov)).toBeCloseTo(1, 8);
    expect(diversificationRatio([1 / 3, 1 / 3, 1 / 3], cov)).toBeGreaterThan(1);
  });
  it("MDP maximises the diversification ratio versus min-variance and 1/N", () => {
    const w = maxDiversification(cov);
    expect(sum(w)).toBeCloseTo(1, 5);
    const dr = diversificationRatio(w, cov);
    expect(dr).toBeGreaterThanOrEqual(diversificationRatio(minVarLongOnly(cov), cov) - 1e-6);
    expect(dr).toBeGreaterThanOrEqual(diversificationRatio([1 / 3, 1 / 3, 1 / 3], cov) - 1e-6);
  });
  it("L1 regularisation shrinks gross exposure", () => {
    const r = makeSample();
    const none = regularizedMinVar(r, 0, 0);
    const l1 = regularizedMinVar(r, 0.05, 0);
    expect(sum(l1)).toBeCloseTo(1, 4);
    expect(l1.reduce((s, x) => s + Math.abs(x), 0)).toBeLessThanOrEqual(none.reduce((s, x) => s + Math.abs(x), 0) + 1e-6);
  });
  it("lab returns one row per method and a monotone-ish shrinkage path", () => {
    const lab = regularizationLab({ n: 15, T: 40, seed: 3 });
    expect(lab.rows.length).toBe(6);
    lab.rows.forEach((row) => expect(sum(row.weights)).toBeCloseTo(1, 3));
    expect(lab.path[lab.path.length - 1].gross).toBeLessThanOrEqual(lab.path[0].gross + 1e-6);
  });
  it("tangency and min-variance helpers stay long-only", () => {
    expect(tangencyLongOnly(mu, cov).every((x) => x >= -1e-9)).toBe(true);
    expect(minVarLongOnly(cov).every((x) => x >= -1e-9)).toBe(true);
  });
});

function makeSample(): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < 10; i++) {
    rows.push(Array.from({ length: 30 }, (_, t) => Math.sin(0.7 * t + i) * 0.02 + Math.cos(1.3 * t) * 0.015));
  }
  return sampleCovRows(rows);
}