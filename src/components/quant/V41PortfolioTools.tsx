import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ScatterChart, Scatter, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import {
  blackLittermanFull, idzorekOmega, meanCVaROptimize,
  ledoitWolfShrink, oasShrink, resampledFrontier,
  factorRiskDecomp, factorBudgetWeights, kellyWeights, kellySimulate,
  sampleCov,
} from "@/lib/quant/portfolioAdvanced";

/* ── shared RNG ── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(r: () => number) {
  let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const ASSET_NAMES = ["US Eq", "EU Eq", "EM Eq", "Bonds", "Gold"];
const ASSET_COLORS = [C.gold, C.teal, C.blue, C.green, C.red];

/* ═════════════════════════════════════════════════════════════
   1. Black-Litterman Full
   ═════════════════════════════════════════════════════════════ */
export const BlackLittermanFullTool = () => {
  const [delta, setDelta] = useState(2.5);
  const [tau, setTau] = useState(0.05);
  const [confidence, setConfidence] = useState(0.5);
  const [viewValue, setViewValue] = useState(0.04); // US Eq - EU Eq
  const [viewAbs, setViewAbs] = useState(0.10);     // EM Eq absolute

  const Sigma = [
    [0.0400, 0.0180, 0.0220, 0.0010, 0.0000],
    [0.0180, 0.0625, 0.0200, 0.0015, 0.0010],
    [0.0220, 0.0200, 0.0900, 0.0020, 0.0015],
    [0.0010, 0.0015, 0.0020, 0.0064, -0.0005],
    [0.0000, 0.0010, 0.0015, -0.0005, 0.0324],
  ];
  const wMkt = [0.45, 0.15, 0.10, 0.25, 0.05];

  const res = useMemo(() => {
    const P = [
      [1, -1, 0, 0, 0], // relative: US - EU
      [0, 0, 1, 0, 0],  // absolute: EM
    ];
    const Q = [viewValue, viewAbs];
    const Omega = idzorekOmega(P, Sigma, tau, [confidence, confidence]);
    return blackLittermanFull({ Sigma, wMkt, delta, tau, P, Q, Omega });
  }, [delta, tau, confidence, viewValue, viewAbs]);

  const chart = ASSET_NAMES.map((n, i) => ({
    name: n,
    prior: +(res.pi[i] * 100).toFixed(2),
    post: +(res.muPost[i] * 100).toFixed(2),
    wPrior: +(res.weightsPrior[i] * 100).toFixed(1),
    wPost: +(res.weightsPost[i] * 100).toFixed(1),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "低信心 c=0.2", description: "观点弱化", apply: () => setConfidence(0.2) },
        { name: "高信心 c=0.8", description: "观点强化", apply: () => setConfidence(0.8) },
        { name: "看多 EM", description: "EM ↑15%", apply: () => setViewAbs(0.15) },
        { name: "重置", description: "默认参数", apply: () => { setDelta(2.5); setTau(0.05); setConfidence(0.5); setViewValue(0.04); setViewAbs(0.10); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">先验参数</p>
          <Slider label="风险厌恶 δ" value={delta} min={1} max={5} step={0.1} onChange={setDelta} />
          <Slider label="先验不确定 τ" value={tau} min={0.01} max={0.20} step={0.01} onChange={setTau} />
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-4">观点</p>
          <Slider label="US − EU (相对)" value={viewValue} min={-0.10} max={0.15} step={0.005} onChange={setViewValue} fmt={(v) => `${(v*100).toFixed(1)}%`} />
          <Slider label="EM 绝对预期收益" value={viewAbs} min={-0.05} max={0.25} step={0.005} onChange={setViewAbs} fmt={(v) => `${(v*100).toFixed(1)}%`} />
          <Slider label="观点信心 c" value={confidence} min={0.05} max={0.95} step={0.05} onChange={setConfidence} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="π US" value={`${(res.pi[0]*100).toFixed(2)}%`} />
          <Stat label="μ̃ US" value={`${(res.muPost[0]*100).toFixed(2)}%`} color={C.gold} />
          <Stat label="π EM" value={`${(res.pi[2]*100).toFixed(2)}%`} />
          <Stat label="μ̃ EM" value={`${(res.muPost[2]*100).toFixed(2)}%`} color={C.gold} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">先验 vs 后验 期望收益 (%)</h4>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="prior" name="先验 π" fill={C.teal} />
              <Bar dataKey="post" name="后验 μ̃" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">先验 vs 后验 组合权重 (%)</h4>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="wPrior" name="先验权重" fill={C.blue} />
              <Bar dataKey="wPost" name="后验权重" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">Idzorek 信心：</span>c→0 观点消失回到 π；c→1 观点完全嵌入。</p>
        <p><span className="text-gold">τ：</span>先验不确定越大，观点权重越高，后验偏离越强。</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   2. Mean-CVaR Optimisation
   ═════════════════════════════════════════════════════════════ */
export const MeanCVaRTool = () => {
  const [alpha, setAlpha] = useState(0.95);
  const [tailFactor, setTailFactor] = useState(1.0); // pumps left-tail draws
  const [seed, setSeed] = useState(11);

  const res = useMemo(() => {
    const r = mulberry32(seed);
    const S = 500, N = 4;
    const mu = [0.10, 0.08, 0.05, 0.02];
    const vol = [0.22, 0.18, 0.12, 0.04];
    const scenarios: number[][] = [];
    for (let s = 0; s < S; s++) {
      // occasional heavy left-tail draw
      const heavy = r() < 0.05 ? -Math.abs(randn(r)) * tailFactor * 2 : 0;
      scenarios.push(mu.map((m, i) => m/252 + vol[i]/Math.sqrt(252) * (randn(r) + heavy)));
    }
    const cvar = meanCVaROptimize(scenarios, alpha);
    // MV benchmark: min-var long only via projection of ones
    const cov = sampleCov(scenarios.map((_, __) => []).length ? [] as number[][] : [] as number[][]); void cov;
    const emp = new Array(N).fill(0);
    scenarios.forEach((row) => row.forEach((v, i) => (emp[i] += v/S)));
    // equal-weight comparison
    const eq = new Array(N).fill(1/N);
    const eqLosses = scenarios.map((row) => -row.reduce((s, r, i) => s + r * eq[i], 0));
    const eqSorted = [...eqLosses].sort((a,b)=>a-b);
    const eqVar = eqSorted[Math.floor(alpha*eqSorted.length)];
    const eqCvar = eqLosses.filter((l)=>l>=eqVar).reduce((s,v)=>s+v,0) / Math.max(eqLosses.filter((l)=>l>=eqVar).length, 1);
    // loss histogram bins
    const bins = 30;
    const lo = Math.min(...cvar.scenarioLosses);
    const hi = Math.max(...cvar.scenarioLosses);
    const step = (hi - lo) / bins;
    const hist = Array.from({ length: bins }, (_, i) => ({ x: +(lo + step*i).toFixed(4), y: 0 }));
    cvar.scenarioLosses.forEach((l) => {
      const idx = Math.min(bins - 1, Math.max(0, Math.floor((l - lo) / step)));
      hist[idx].y++;
    });
    return { cvar, eqCvar, eqVar, hist };
  }, [alpha, tailFactor, seed]);

  const wChart = ASSET_NAMES.slice(0, 4).map((n, i) => ({
    name: n, w: +(res.cvar.weights[i] * 100).toFixed(1),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "α=0.95", description: "标准尾部", apply: () => setAlpha(0.95) },
        { name: "α=0.99", description: "极端尾部", apply: () => setAlpha(0.99) },
        { name: "厚尾情景", description: "加倍尾部冲击", apply: () => setTailFactor(2.0) },
        { name: "重置", description: "默认", apply: () => { setAlpha(0.95); setTailFactor(1.0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="尾部置信 α" value={alpha} min={0.80} max={0.995} step={0.005} onChange={setAlpha} />
          <Slider label="尾部厚度 (乘数)" value={tailFactor} min={0.5} max={3.0} step={0.1} onChange={setTailFactor} />
          <Slider label="种子" value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="CVaR α (最优)" value={`${(res.cvar.cvar * 100).toFixed(2)}%`} color={C.red} sub="日损失" />
          <Stat label="CVaR α (等权)" value={`${(res.eqCvar * 100).toFixed(2)}%`} color={C.red} />
          <Stat label="VaR α" value={`${(res.cvar.var * 100).toFixed(2)}%`} color={C.gold} />
          <Stat label="预期日收益" value={`${(res.cvar.expRet * 100).toFixed(3)}%`} color={C.teal} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">最优 Mean-CVaR 权重 (%)</h4>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={wChart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="w" name="权重" fill={C.gold} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">损失分布 (直方图)</h4>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={res.hist}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine x={+res.cvar.var.toFixed(4)} stroke={C.red} strokeDasharray="3 3" label={{ value: "VaR", fill: C.red, fontSize: 9 }} />
                <Bar dataKey="y" fill={C.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">R-U 表述：</span>min ζ + 1/((1-α)S) Σ (−rᵀw − ζ)⁺，投影次梯度长仓求解。</p>
        <p><span className="text-gold">直觉：</span>厚尾情景下 CVaR 优化会更明显地降低高波动/高尾风险资产的权重。</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   3. Ledoit-Wolf / OAS Shrinkage
   ═════════════════════════════════════════════════════════════ */
export const ShrinkageTool = () => {
  const [T, setT] = useState(60);
  const [N, setN] = useState(8);
  const [seed, setSeed] = useState(3);
  const [method, setMethod] = useState<"lw"|"oas">("lw");

  const res = useMemo(() => {
    const r = mulberry32(seed);
    const rets: number[][] = Array.from({ length: N }, () =>
      Array.from({ length: T }, () => 0.012 * randn(r)));
    return method === "lw" ? ledoitWolfShrink(rets) : oasShrink(rets);
  }, [T, N, seed, method]);

  const heatSample = res.sample.map((row, i) => row.map((v, j) => ({ i, j, v })));
  const heatShrunk = res.cov.map((row, i) => row.map((v, j) => ({ i, j, v })));
  void heatSample; void heatShrunk;

  const diagData = res.sample.map((r, i) => ({
    idx: i,
    sample: +(r[i] * 10000).toFixed(2),
    shrunk: +(res.cov[i][i] * 10000).toFixed(2),
  }));

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {(["lw","oas"] as const).map((m) => (
          <button key={m} onClick={() => setMethod(m)}
            className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " +
              (method === m ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
            {m === "lw" ? "Ledoit-Wolf (常相关)" : "OAS (Oracle 近似)"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="观测 T" value={T} min={20} max={252} step={5} onChange={setT} />
          <Slider label="资产 N" value={N} min={3} max={15} step={1} onChange={setN} />
          <Slider label="种子" value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="收缩强度 λ" value={res.lambda.toFixed(3)} color={C.gold} />
          <Stat label="T/N 比" value={(T/N).toFixed(1)} sub="<2 高噪声" />
          <Stat label="样本 cond" value={isFinite(res.condSample) ? res.condSample.toExponential(1) : "∞"} color={C.red} />
          <Stat label="收缩后 cond" value={isFinite(res.condShrunk) ? res.condShrunk.toExponential(1) : "∞"} color={C.teal} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">对角方差比较 (×10⁴)</h4>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={diagData}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="idx" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sample" name="样本方差" fill={C.red} />
              <Bar dataKey="shrunk" name="收缩后" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">Schäfer-Strimmer λ：</span>Σ̂ = λF + (1−λ)S；T/N 越小 λ 越大。</p>
        <p><span className="text-gold">效果：</span>条件数下降，min-var / MV / RP 的样本外方差预测误差同步下降。</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   4. Michaud Resampled Frontier
   ═════════════════════════════════════════════════════════════ */
export const ResampledFrontierTool = () => {
  const [B, setB] = useState(30);
  const [Twin, setTwin] = useState(120);

  const mu = [0.10, 0.08, 0.05, 0.03];
  const Sigma = [
    [0.04, 0.015, 0.010, 0.001],
    [0.015, 0.06, 0.012, 0.001],
    [0.010, 0.012, 0.09, 0.002],
    [0.001, 0.001, 0.002, 0.01],
  ];

  const res = useMemo(() => resampledFrontier(mu, Sigma, Twin, B, 10, 7), [B, Twin]);

  const chart = res.classic.map((c, i) => ({
    vol: +(c.vol * 100).toFixed(3), classic: +(c.ret * 100).toFixed(3),
    volR: +(res.resampled[i].vol * 100).toFixed(3), resampled: +(res.resampled[i].ret * 100).toFixed(3),
  }));

  const heat = res.weightsGrid.map((grid, g) => {
    const bars = ASSET_NAMES.slice(0, 4).map((n, i) => {
      const arr = grid.map((w) => w[i]);
      const m = arr.reduce((s, v) => s + v, 0) / arr.length;
      const sd = Math.sqrt(arr.reduce((s, v) => s + (v - m)**2, 0) / arr.length);
      return { name: n, mean: +(m * 100).toFixed(1), sd: +(sd * 100).toFixed(1) };
    });
    return { g, bars };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="Bootstrap 次数 B" value={B} min={10} max={80} step={5} onChange={setB} />
          <Slider label="每次样本长度 T" value={Twin} min={60} max={360} step={20} onChange={setTwin} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="经典最高 Sharpe*" value={Math.max(...res.classic.map((p) => p.vol > 1e-6 ? p.ret/p.vol : 0)).toFixed(2)} color={C.red} />
          <Stat label="重采样最高 Sharpe*" value={Math.max(...res.resampled.map((p) => p.vol > 1e-6 ? p.ret/p.vol : 0)).toFixed(2)} color={C.teal} sub="更稳健" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">经典 vs 重采样有效前沿 (%)</h4>
        <div className="h-[280px]">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="vol" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "σ (%)", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis type="number" dataKey="classic" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "E[R] (%)", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter name="经典 MV" data={chart} fill={C.red} line={{ stroke: C.red, strokeWidth: 2 }} shape="circle" />
              <Scatter name="重采样" data={chart.map((c) => ({ vol: c.volR, classic: c.resampled }))} fill={C.gold} line={{ stroke: C.gold, strokeWidth: 2 }} shape="triangle" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">中位目标点权重均值 ± 波动 (%)</h4>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={heat[Math.floor(heat.length/2)].bars}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="mean" name="均值权重" fill={C.gold} />
              <Bar dataKey="sd" name="标准差 (稳定性)" fill={C.red} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">Michaud (1998)：</span>抽样 (μ̂,Σ̂)→前沿→按分位对齐求平均，消解"角解"过度集中。</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   5. Factor Risk Budget
   ═════════════════════════════════════════════════════════════ */
const FACTOR_NAMES = ["MKT", "SMB", "HML", "RMW", "CMA"];
const FACTOR_COV = [
  [0.0400, 0.005, 0.006, -0.002, 0.001],
  [0.0050, 0.020, 0.003, -0.001, 0.000],
  [0.0060, 0.003, 0.025, -0.001, 0.002],
  [-0.002, -0.001, -0.001, 0.015, 0.001],
  [0.0010, 0.000, 0.002, 0.001, 0.012],
];
const B_MATRIX = [
  [1.10, 0.20, -0.10, 0.05, -0.05], // Growth
  [1.05, -0.10, 0.60, 0.20, 0.10],  // Value
  [0.95, 0.80, 0.10, -0.05, 0.05],  // Small
  [0.90, 0.05, 0.00, 0.50, 0.10],   // Quality
  [1.00, 0.00, 0.10, 0.05, 0.50],   // Defensive
];
const B_ASSET_NAMES = ["Growth", "Value", "Small", "Quality", "Defensive"];
const SPECIFIC_VAR = [0.010, 0.015, 0.025, 0.012, 0.008];

export const FactorBudgetTool = () => {
  const [mktTgt, setMktTgt] = useState(0.5);
  const [valueTgt, setValueTgt] = useState(0.2);
  const [qualityTgt, setQualityTgt] = useState(0.2);

  const res = useMemo(() => {
    const targets = [mktTgt, 0.05, valueTgt, qualityTgt, 0.05];
    return factorBudgetWeights(B_MATRIX, FACTOR_COV, SPECIFIC_VAR, targets, 2500, 0.02);
  }, [mktTgt, valueTgt, qualityTgt]);

  const wChart = B_ASSET_NAMES.map((n, i) => ({ name: n, w: +(res.weights[i] * 100).toFixed(1) }));
  const rcChart = res.decomp.factorContribs.map((c) => ({
    name: c.name, pct: +(c.pct * 100).toFixed(1), exp: +c.exposure.toFixed(2),
  }));
  rcChart.push({ name: "Specific", pct: +(res.decomp.specificPct * 100).toFixed(1), exp: 0 });

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "60/20/20", description: "MKT/HML/RMW", apply: () => { setMktTgt(0.6); setValueTgt(0.2); setQualityTgt(0.15); } },
        { name: "价值倾斜", description: "HML 主导", apply: () => { setMktTgt(0.3); setValueTgt(0.5); setQualityTgt(0.1); } },
        { name: "质量防御", description: "RMW 主导", apply: () => { setMktTgt(0.3); setValueTgt(0.1); setQualityTgt(0.5); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="MKT 风险预算" value={mktTgt} min={0.1} max={0.8} step={0.05} onChange={setMktTgt} />
          <Slider label="HML (价值) 预算" value={valueTgt} min={0.0} max={0.6} step={0.05} onChange={setValueTgt} />
          <Slider label="RMW (质量) 预算" value={qualityTgt} min={0.0} max={0.6} step={0.05} onChange={setQualityTgt} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="组合波动 σ" value={`${(res.decomp.totalVol * 100).toFixed(2)}%`} color={C.gold} />
          <Stat label="特异性占比" value={`${(res.decomp.specificPct * 100).toFixed(1)}%`} color={C.teal} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">权重分配 (%)</h4>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={wChart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="w" fill={C.gold} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">风险贡献分解 (%)</h4>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={rcChart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="pct" fill={C.teal}>
                  {rcChart.map((_, i) => <Cell key={i} fill={i === rcChart.length - 1 ? C.blue : C.teal} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">Var(w) = wᵀ B F Bᵀ w + wᵀ D w</span>；投影次梯度求解使因子风险贡献匹配目标预算。</p>
        <p>因子暴露 β_p = Bᵀw；用于因子中性化或主动因子倾斜。</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   6. Kelly & Ruin Lab
   ═════════════════════════════════════════════════════════════ */
export const KellyRuinTool = () => {
  const [years, setYears] = useState(20);
  const [rf, setRf] = useState(0.02);
  const [threshold, setThreshold] = useState(0.5);
  const [seed, setSeed] = useState(11);

  const mu = [0.10, 0.07];
  const cov = [[0.04, 0.008], [0.008, 0.09]];

  const k = kellyWeights(mu, cov, rf);
  const kSum = k.reduce((s, x) => s + x, 0);

  const sim = useMemo(() => kellySimulate(mu, cov, rf, years, 2500, threshold, seed),
    [years, rf, threshold, seed]);

  const chart = sim.fractions.map((f, i) => ({
    f, median: +sim.medianTerminal[i].toFixed(2),
    q05: +sim.q05Terminal[i].toFixed(2),
    q95: +sim.q95Terminal[i].toFixed(2),
    ruin: +(sim.ruinProb[i] * 100).toFixed(1),
    g: +(sim.growthRate[i] * 100).toFixed(2),
  }));

  const bestGrowthIdx = sim.growthRate.indexOf(Math.max(...sim.growthRate));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "半 Kelly", description: "工程实务默认", apply: () => setThreshold(0.5) },
        { name: "保守 30%", description: "破产阈=0.3", apply: () => setThreshold(0.3) },
        { name: "10 年", description: "短期实验", apply: () => setYears(10) },
        { name: "重置", description: "默认", apply: () => { setYears(20); setRf(0.02); setThreshold(0.5); setSeed(11); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="投资期 (年)" value={years} min={5} max={40} step={1} onChange={setYears} />
          <Slider label="无风险利率 rf" value={rf} min={0.0} max={0.06} step={0.005} onChange={setRf} />
          <Slider label="破产阈 (相对起始财富)" value={threshold} min={0.1} max={0.9} step={0.05} onChange={setThreshold} />
          <Slider label="种子" value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="Kelly 总杠杆" value={kSum.toFixed(2)} color={C.gold} sub={`w = Σ⁻¹(μ−rf)`} />
          <Stat label="最优 f (增长率)" value={sim.fractions[bestGrowthIdx].toFixed(2)} color={C.teal} />
          <Stat label="全 Kelly 破产率" value={`${(sim.ruinProb[sim.fractions.indexOf(1)] * 100).toFixed(1)}%`} color={C.red} />
          <Stat label="半 Kelly 破产率" value={`${(sim.ruinProb[sim.fractions.indexOf(0.5)] * 100).toFixed(1)}%`} color={C.teal} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">终值分布：中位数与 5%/95% 分位</h4>
        <div className="h-[260px]">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="f" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "f (× Kelly)", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="median" name="中位终值" stroke={C.gold} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="q05" name="5% 分位" stroke={C.red} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <Line type="monotone" dataKey="q95" name="95% 分位" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <ReferenceLine y={1} stroke={C.text} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">破产概率 (%) vs f</h4>
        <div className="h-[200px]">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="f" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="ruin" fill={C.red} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">分数 Kelly：</span>g(f) = f·(μ_p − r_f) + r_f − ½ f²σ_p²。全 Kelly 长期增长率最大，但短期回撤和破产概率显著。</p>
        <p><span className="text-gold">实务：</span>半 Kelly 通常在增长率仅牺牲少许、破产率大幅下降。</p>
      </div>
    </div>
  );
};
