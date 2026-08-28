/**
 * Qlib-style research pipeline, re-implemented in TypeScript.
 *
 * Mirrors the loop Microsoft Qlib formalises:
 *   panel data -> Alpha158-style expression factors -> cross-sectional
 *   normalisation -> model fit (ridge / equal-weight) -> signal evaluation
 *   (IC / RankIC / ICIR) -> TopK-Dropout portfolio backtest.
 *
 * Everything is deterministic and dependency-free so the lab can run with a
 * synthetic universe offline and still reproduce the same numbers.
 */

export interface Panel {
  /** ISO dates, length T */
  dates: string[];
  /** instrument codes, length N */
  symbols: string[];
  /** close prices, [N][T] */
  close: number[][];
  /** traded volume, [N][T] */
  volume: number[][];
}

/* ───────────────────────── synthetic universe ───────────────────────── */

function lcg(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function gaussFrom(rand: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Deterministic panel with a market factor, per-name momentum persistence and
 * mild mean reversion — enough structure that a fitted model beats noise.
 */
export function syntheticPanel(nAssets = 30, nDays = 750, seed = 42): Panel {
  const rand = lcg(seed);
  const g = () => gaussFrom(rand);
  const symbols = Array.from({ length: nAssets }, (_, i) => `SIM${String(i + 1).padStart(3, "0")}`);
  const dates: string[] = [];
  const start = new Date();
  start.setDate(start.getDate() - nDays);
  for (let t = 0; t < nDays; t++) {
    const d = new Date(start);
    d.setDate(start.getDate() + t);
    dates.push(d.toISOString().slice(0, 10));
  }

  const beta = symbols.map(() => 0.6 + rand() * 0.9);
  const idioVol = symbols.map(() => 0.008 + rand() * 0.012);
  const trend = symbols.map(() => (rand() - 0.5) * 0.0006);

  const close: number[][] = symbols.map(() => [100]);
  const volume: number[][] = symbols.map(() => [1e6]);
  const prevRet = symbols.map(() => 0);

  for (let t = 1; t < nDays; t++) {
    const mkt = 0.0003 + 0.009 * g();
    for (let i = 0; i < nAssets; i++) {
      // momentum persistence + weak reversion => a learnable signal
      const carry = 0.12 * prevRet[i] - 0.05 * (close[i][t - 1] / close[i][Math.max(0, t - 20)] - 1);
      const r = trend[i] + beta[i] * mkt + carry + idioVol[i] * g();
      prevRet[i] = r;
      close[i].push(Math.max(1, close[i][t - 1] * (1 + r)));
      volume[i].push(1e6 * (0.6 + 0.8 * rand()) * (1 + 4 * Math.abs(r)));
    }
  }
  return { dates, symbols, close, volume };
}

/** Build a panel from already-loaded per-symbol close series (dates aligned). */
export function panelFromSeries(
  series: { symbol: string; dates: string[]; prices: number[] }[]
): Panel | null {
  const valid = series.filter((s) => s.prices.length > 60);
  if (valid.length < 5) return null;
  const common = valid
    .map((s) => new Set(s.dates))
    .reduce((acc, set) => new Set([...acc].filter((d) => set.has(d))), new Set(valid[0].dates));
  const dates = [...common].sort();
  if (dates.length < 60) return null;
  const close = valid.map((s) => {
    const map = new Map(s.dates.map((d, i) => [d, s.prices[i]]));
    return dates.map((d) => map.get(d) as number);
  });
  return { dates, symbols: valid.map((s) => s.symbol), close, volume: close.map((c) => c.map(() => 1)) };
}

/* ───────────────────────── Alpha158-style factors ───────────────────────── */

export const FACTOR_IDS = [
  "ROC5",
  "ROC20",
  "ROC60",
  "MA20",
  "STD20",
  "RSV20",
  "MAX20",
  "VSTD20",
] as const;
export type FactorId = (typeof FACTOR_IDS)[number];

export const FACTOR_META: Record<FactorId, { label: string; expr: string; note: string }> = {
  ROC5: { label: "5 日动量", expr: "Ref($close,-5)/$close - 1", note: "短期反转常为负 IC。" },
  ROC20: { label: "20 日动量", expr: "$close/Ref($close,20) - 1", note: "中期趋势延续。" },
  ROC60: { label: "60 日动量", expr: "$close/Ref($close,60) - 1", note: "经典横截面动量。" },
  MA20: { label: "均线偏离", expr: "Mean($close,20)/$close", note: "价格相对均线的位置。" },
  STD20: { label: "20 日波动", expr: "Std($close/Ref($close,1)-1,20)", note: "低波动异象代理。" },
  RSV20: { label: "区间位置", expr: "($close-Min($low,20))/(Max($high,20)-Min($low,20))", note: "价格在区间中的分位。" },
  MAX20: { label: "极值占比", expr: "Max($close,20)/$close", note: "距 20 日高点的距离。" },
  VSTD20: { label: "成交量波动", expr: "Std($volume,20)/Mean($volume,20)", note: "交易活跃度的不稳定性。" },
};

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const std = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

/** Factor values for one asset at time t (null when the window is incomplete). */
function factorRow(p: Panel, i: number, t: number): number[] | null {
  if (t < 60) return null;
  const c = p.close[i];
  const v = p.volume[i];
  const w20 = c.slice(t - 19, t + 1);
  const rets20 = w20.slice(1).map((x, k) => x / w20[k] - 1);
  const vol20 = v.slice(t - 19, t + 1);
  const hi = Math.max(...w20);
  const lo = Math.min(...w20);
  const vals = [
    c[t] / c[t - 5] - 1,
    c[t] / c[t - 20] - 1,
    c[t] / c[t - 60] - 1,
    mean(w20) / c[t],
    std(rets20),
    hi > lo ? (c[t] - lo) / (hi - lo) : 0.5,
    hi / c[t],
    mean(vol20) > 0 ? std(vol20) / mean(vol20) : 0,
  ];
  return vals.every(Number.isFinite) ? vals : null;
}

export interface CrossSection {
  t: number;
  date: string;
  /** asset index within the panel */
  idx: number[];
  /** normalised factor matrix [asset][factor] */
  X: number[][];
  /** forward return label, already cross-sectionally normalised */
  y: number[];
  /** raw forward returns, used by the backtest */
  fwd: number[];
}

const zscore = (col: number[]) => {
  const m = mean(col);
  const s = std(col) || 1;
  return col.map((x) => Math.max(-3, Math.min(3, (x - m) / s)));
};

/**
 * Build the per-date cross-sections: factors are z-scored (winsorised at ±3σ)
 * across instruments, exactly as Qlib's `CSZScoreNorm` processor does.
 */
export function buildCrossSections(
  p: Panel,
  factors: FactorId[],
  horizon = 5
): CrossSection[] {
  const cols = factors.map((f) => FACTOR_IDS.indexOf(f));
  const out: CrossSection[] = [];
  for (let t = 60; t + horizon < p.dates.length; t++) {
    const idx: number[] = [];
    const rows: number[][] = [];
    const fwd: number[] = [];
    for (let i = 0; i < p.symbols.length; i++) {
      const r = factorRow(p, i, t);
      if (!r) continue;
      const f = p.close[i][t + horizon] / p.close[i][t] - 1;
      if (!Number.isFinite(f)) continue;
      idx.push(i);
      rows.push(cols.map((c) => r[c]));
      fwd.push(f);
    }
    if (idx.length < 5) continue;
    const X = cols.map((_, j) => zscore(rows.map((r) => r[j])));
    out.push({
      t,
      date: p.dates[t],
      idx,
      X: rows.map((_, a) => X.map((col) => col[a])),
      y: zscore(fwd),
      fwd,
    });
  }
  return out;
}

/* ───────────────────────── model layer ───────────────────────── */

export type ModelId = "ridge" | "equal" | "single";

/** Ridge regression via normal equations with Gaussian elimination. */
export function ridgeFit(X: number[][], y: number[], lambda = 1): number[] {
  const k = X[0]?.length ?? 0;
  if (!k) return [];
  const A: number[][] = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      let s = 0;
      for (let n = 0; n < X.length; n++) s += X[n][a] * X[n][b];
      A[a][b] = s + (a === b ? lambda : 0);
    }
    let s = 0;
    for (let n = 0; n < X.length; n++) s += X[n][a] * y[n];
    A[a][k] = s;
  }
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    const d = A[c][c] || 1e-12;
    for (let j = c; j <= k; j++) A[c][j] /= d;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r][c];
      if (!f) continue;
      for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j];
    }
  }
  return A.map((row) => (Number.isFinite(row[k]) ? row[k] : 0));
}

/* ───────────────────────── signal evaluation ───────────────────────── */

const pearson = (a: number[], b: number[]) => {
  const n = a.length;
  if (n < 3) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
};

const ranks = (a: number[]) => {
  const order = a.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]);
  const r = new Array(a.length).fill(0);
  order.forEach(([, i], k) => {
    r[i] = k + 1;
  });
  return r;
};

export const spearman = (a: number[], b: number[]) => pearson(ranks(a), ranks(b));

export interface SignalEval {
  dates: string[];
  ic: number[];
  rankIc: number[];
  meanIc: number;
  meanRankIc: number;
  icir: number;
  rankIcir: number;
  /** share of dates with positive IC */
  hitRate: number;
  /** mean forward return per signal quantile group (low → high) */
  quantiles: number[];
}

export function evaluateSignal(
  sections: CrossSection[],
  scores: number[][],
  nGroups = 5
): SignalEval {
  const ic: number[] = [];
  const rankIc: number[] = [];
  const dates: string[] = [];
  const bucketSum = new Array(nGroups).fill(0);
  const bucketN = new Array(nGroups).fill(0);

  sections.forEach((s, k) => {
    const sc = scores[k];
    if (!sc || sc.length !== s.fwd.length) return;
    dates.push(s.date);
    ic.push(pearson(sc, s.fwd));
    rankIc.push(spearman(sc, s.fwd));
    const order = sc.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    order.forEach(([, i], pos) => {
      const g = Math.min(nGroups - 1, Math.floor((pos / order.length) * nGroups));
      bucketSum[g] += s.fwd[i];
      bucketN[g] += 1;
    });
  });

  const mi = mean(ic);
  const mri = mean(rankIc);
  return {
    dates,
    ic,
    rankIc,
    meanIc: mi,
    meanRankIc: mri,
    icir: std(ic) > 0 ? mi / std(ic) : 0,
    rankIcir: std(rankIc) > 0 ? mri / std(rankIc) : 0,
    hitRate: ic.length ? ic.filter((x) => x > 0).length / ic.length : 0,
    quantiles: bucketSum.map((s, i) => (bucketN[i] ? s / bucketN[i] : 0)),
  };
}

/* ───────────────────────── TopK-Dropout backtest ───────────────────────── */

export interface TopkParams {
  topk: number;
  nDrop: number;
  /** rebalance every N trading days */
  freq: number;
  costBps: number;
}

export interface TopkResult {
  dates: string[];
  equity: number[];
  benchmark: number[];
  drawdown: number[];
  turnover: number;
  metrics: {
    cagr: number;
    vol: number;
    sharpe: number;
    maxDrawdown: number;
    excess: number;
  };
}

/**
 * Qlib's `TopkDropoutStrategy`: hold `topk` names equally weighted; on each
 * rebalance drop the `nDrop` worst-ranked current holdings and replace them
 * with the best-ranked names not yet held. Costs charged on traded weight.
 */
export function topkDropoutBacktest(
  panel: Panel,
  sections: CrossSection[],
  scores: number[][],
  p: TopkParams
): TopkResult {
  const dates: string[] = [];
  const equity: number[] = [];
  const benchmark: number[] = [];
  let nav = 1;
  let bench = 1;
  let held: number[] = [];
  let traded = 0;
  let rebalances = 0;

  for (let k = 0; k < sections.length - 1; k++) {
    const s = sections[k];
    const sc = scores[k];
    if (!sc) continue;
    if (k % p.freq === 0) {
      const ranked = s.idx
        .map((asset, a) => ({ asset, score: sc[a] }))
        .sort((x, y) => y.score - x.score);
      const rankOf = new Map(ranked.map((r, i) => [r.asset, i]));
      const keep = held
        .filter((a) => rankOf.has(a))
        .sort((a, b) => (rankOf.get(a) as number) - (rankOf.get(b) as number));
      const kept = keep.slice(0, Math.max(0, keep.length - p.nDrop));
      const next = [...kept];
      for (const r of ranked) {
        if (next.length >= p.topk) break;
        if (!next.includes(r.asset)) next.push(r.asset);
      }
      const before = new Set(held);
      const changed = next.filter((a) => !before.has(a)).length + held.filter((a) => !next.includes(a)).length;
      const turn = held.length || next.length ? changed / (2 * Math.max(1, next.length)) : 0;
      traded += turn;
      rebalances += 1;
      nav *= 1 - (turn * 2 * p.costBps) / 10000;
      held = next;
    }

    const t0 = s.t;
    const t1 = sections[k + 1].t;
    const step = (a: number) => panel.close[a][t1] / panel.close[a][t0] - 1;
    const r = held.length ? mean(held.map(step)) : 0;
    const rb = mean(s.idx.map(step));
    nav *= 1 + r;
    bench *= 1 + rb;
    dates.push(sections[k + 1].date);
    equity.push(nav);
    benchmark.push(bench);
  }

  let peak = -Infinity;
  const drawdown = equity.map((e) => {
    peak = Math.max(peak, e);
    return e / peak - 1;
  });
  const rets = equity.slice(1).map((e, i) => e / equity[i] - 1);
  const perYear = 252 / Math.max(1, sections[1] ? sections[1].t - sections[0].t : 1);
  const vol = std(rets) * Math.sqrt(perYear);
  const years = Math.max(rets.length / perYear, 1e-6);
  const cagr = equity.length ? Math.pow(Math.max(equity[equity.length - 1], 1e-9), 1 / years) - 1 : 0;
  const benchCagr = benchmark.length
    ? Math.pow(Math.max(benchmark[benchmark.length - 1], 1e-9), 1 / years) - 1
    : 0;

  return {
    dates,
    equity,
    benchmark,
    drawdown,
    turnover: rebalances ? traded / rebalances : 0,
    metrics: {
      cagr,
      vol,
      sharpe: vol > 0 ? cagr / vol : 0,
      maxDrawdown: drawdown.length ? Math.min(...drawdown) : 0,
      excess: cagr - benchCagr,
    },
  };
}

/* ───────────────────────── end-to-end workflow ───────────────────────── */

export interface WorkflowConfig {
  factors: FactorId[];
  horizon: number;
  model: ModelId;
  lambda: number;
  /** fraction of dates used for fitting; the rest is the out-of-sample test */
  trainRatio: number;
  topk: TopkParams;
}

export interface WorkflowResult {
  weights: number[];
  train: SignalEval;
  test: SignalEval;
  backtest: TopkResult;
  nDates: number;
  nTest: number;
}

/** Fit on the training slice, evaluate + backtest strictly out of sample. */
export function runQlibWorkflow(panel: Panel, cfg: WorkflowConfig): WorkflowResult | null {
  const sections = buildCrossSections(panel, cfg.factors, cfg.horizon);
  if (sections.length < 40) return null;
  const split = Math.floor(sections.length * cfg.trainRatio);
  const trainSecs = sections.slice(0, split);
  const testSecs = sections.slice(split);
  if (!trainSecs.length || testSecs.length < 10) return null;

  let weights: number[];
  if (cfg.model === "equal") {
    weights = cfg.factors.map(() => 1 / cfg.factors.length);
  } else if (cfg.model === "single") {
    weights = cfg.factors.map((_, i) => (i === 0 ? 1 : 0));
  } else {
    const X: number[][] = [];
    const y: number[] = [];
    for (const s of trainSecs) {
      s.X.forEach((row, a) => {
        X.push(row);
        y.push(s.y[a]);
      });
    }
    weights = ridgeFit(X, y, cfg.lambda);
  }

  const score = (secs: CrossSection[]) =>
    secs.map((s) => s.X.map((row) => row.reduce((acc, x, j) => acc + x * (weights[j] ?? 0), 0)));

  const trainScores = score(trainSecs);
  const testScores = score(testSecs);

  return {
    weights,
    train: evaluateSignal(trainSecs, trainScores),
    test: evaluateSignal(testSecs, testScores),
    backtest: topkDropoutBacktest(panel, testSecs, testScores, cfg.topk),
    nDates: sections.length,
    nTest: testSecs.length,
  };
}
