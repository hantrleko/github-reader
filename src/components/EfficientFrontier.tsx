import { useState, useMemo } from "react";
import PresetButtons, { Preset } from "./PresetButtons";
import { motion } from "framer-motion";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Plus, Trash2 } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  ret: number; // expected return %
  vol: number; // volatility %
}

const defaultAssets: Asset[] = [
  { id: "1", name: "股票 A", ret: 12, vol: 20 },
  { id: "2", name: "债券 B", ret: 5, vol: 8 },
  { id: "3", name: "商品 C", ret: 8, vol: 18 },
  { id: "4", name: "REITs D", ret: 9, vol: 15 },
];

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(220, 12%, 18%)";
const CHART_TEXT = "hsl(220, 10%, 50%)";

// Build covariance matrix from vols and uniform correlation
function buildCovMatrix(vols: number[], rho: number): number[][] {
  const n = vols.length;
  const cov: number[][] = [];
  for (let i = 0; i < n; i++) {
    cov[i] = [];
    for (let j = 0; j < n; j++) {
      cov[i][j] = i === j ? vols[i] * vols[i] : rho * vols[i] * vols[j];
    }
  }
  return cov;
}

// Matrix operations for small matrices
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < p; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

function matVecMul(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
}

function vecDot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

// Invert a small matrix using Gauss-Jordan
function matInv(M: number[][]): number[][] | null {
  const n = M.length;
  const aug: number[][] = M.map((row, i) => {
    const r = [...row];
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
    return r;
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) return null;
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}

// Compute efficient frontier points
function computeEfficientFrontier(
  assets: Asset[],
  rho: number,
  nPoints: number = 80,
  includeShort: boolean
): { frontier: { vol: number; ret: number }[]; gmv: { vol: number; ret: number }; tangent: { vol: number; ret: number; sharpe: number } | null; weights: number[][] } {
  const n = assets.length;
  if (n < 2) return { frontier: [], gmv: { vol: 0, ret: 0 }, tangent: null, weights: [] };

  const mu = assets.map(a => a.ret / 100);
  const vols = assets.map(a => a.vol / 100);
  const Sigma = buildCovMatrix(vols, rho);
  const SigmaInv = matInv(Sigma);
  if (!SigmaInv) return { frontier: [], gmv: { vol: 0, ret: 0 }, tangent: null, weights: [] };

  const ones = new Array(n).fill(1);
  const SigmaInvMu = matVecMul(SigmaInv, mu);
  const SigmaInvOnes = matVecMul(SigmaInv, ones);

  const A = vecDot(ones, SigmaInvMu);
  const B = vecDot(mu, SigmaInvMu);
  const C = vecDot(ones, SigmaInvOnes);
  const D = B * C - A * A;

  if (Math.abs(D) < 1e-14) return { frontier: [], gmv: { vol: 0, ret: 0 }, tangent: null, weights: [] };

  // GMV portfolio
  const wGMV = SigmaInvOnes.map(v => v / C);
  const retGMV = vecDot(wGMV, mu);
  const volGMV = Math.sqrt(vecDot(wGMV, matVecMul(Sigma, wGMV)));

  // Generate frontier
  const minRet = includeShort ? retGMV - 0.15 : retGMV;
  const maxRet = includeShort ? Math.max(...mu) + 0.1 : Math.max(...mu) + 0.05;
  const frontier: { vol: number; ret: number }[] = [];
  const allWeights: number[][] = [];

  for (let i = 0; i <= nPoints; i++) {
    const targetRet = minRet + (maxRet - minRet) * i / nPoints;
    // w* = (1/D)[B(Σ⁻¹1) - A(Σ⁻¹μ)] + (targetRet/D)[C(Σ⁻¹μ) - A(Σ⁻¹1)]
    const w = SigmaInvOnes.map((si, j) =>
      (1 / D) * (B * si - A * SigmaInvMu[j]) + (targetRet / D) * (C * SigmaInvMu[j] - A * si)
    );

    // Check no-short constraint
    if (!includeShort && w.some(wi => wi < -0.001)) continue;

    const portVol = Math.sqrt(vecDot(w, matVecMul(Sigma, w)));
    const portRet = vecDot(w, mu);

    // Only upper part of frontier (above GMV)
    if (portRet >= retGMV - 0.001) {
      frontier.push({ vol: portVol * 100, ret: portRet * 100 });
      allWeights.push(w);
    }
  }

  // Tangent portfolio (max Sharpe, assume Rf = 2%)
  const rf = 0.02;
  const excessMu = mu.map(m => m - rf);
  const SigmaInvExcess = matVecMul(SigmaInv, excessMu);
  const sumSIE = SigmaInvExcess.reduce((s, v) => s + v, 0);

  let tangent: { vol: number; ret: number; sharpe: number } | null = null;
  if (Math.abs(sumSIE) > 1e-10) {
    const wT = SigmaInvExcess.map(v => v / sumSIE);
    if (includeShort || wT.every(w => w >= -0.001)) {
      const tRet = vecDot(wT, mu);
      const tVol = Math.sqrt(vecDot(wT, matVecMul(Sigma, wT)));
      const sharpe = (tRet - rf) / tVol;
      tangent = { vol: tVol * 100, ret: tRet * 100, sharpe };
    }
  }

  return {
    frontier,
    gmv: { vol: volGMV * 100, ret: retGMV * 100 },
    tangent,
    weights: allWeights,
  };
}

const FrontierTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg bg-card border border-border px-3 py-2 shadow-lg">
      {d?.name && (
        <p className="text-xs font-mono text-gold mb-1">{d.name}</p>
      )}
      <p className="text-xs font-mono text-muted-foreground">
        收益: {d?.ret?.toFixed(2)}%
      </p>
      <p className="text-xs font-mono text-muted-foreground">
        波动率: {d?.vol?.toFixed(2)}%
      </p>
      {d?.sharpe !== undefined && (
        <p className="text-xs font-mono text-gold">
          Sharpe: {d.sharpe.toFixed(3)}
        </p>
      )}
    </div>
  );
};

let nextId = 5;

const EfficientFrontier = () => {
  const [assets, setAssets] = useState<Asset[]>(defaultAssets);
  const [rho, setRho] = useState(0.3);
  const [allowShort, setAllowShort] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const addAsset = () => {
    if (assets.length >= 8) return;
    setAssets(prev => [
      ...prev,
      { id: String(nextId++), name: `资产 ${String.fromCharCode(65 + prev.length)}`, ret: 7, vol: 12 },
    ]);
  };

  const removeAsset = (id: string) => {
    if (assets.length <= 2) return;
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const updateAsset = (id: string, field: keyof Asset, value: string | number) => {
    setAssets(prev =>
      prev.map(a => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const { frontier, gmv, tangent, weights } = useMemo(
    () => computeEfficientFrontier(assets, rho, 100, allowShort),
    [assets, rho, allowShort]
  );

  const ASSET_COLORS = [CHART_GOLD, CHART_TEAL, CHART_RED, CHART_BLUE, "hsl(280,60%,55%)", "hsl(150,60%,45%)", "hsl(30,80%,50%)", "hsl(340,60%,50%)"];

  const selectedWeights = selectedIdx !== null && selectedIdx < weights.length
    ? weights[selectedIdx]
    : null;

  const pieData = selectedWeights
    ? assets.map((a, i) => ({
        name: a.name,
        value: Math.round(selectedWeights[i] * 10000) / 100,
        absValue: Math.abs(Math.round(selectedWeights[i] * 10000) / 100),
      }))
    : null;

  const assetPoints = assets.map(a => ({
    vol: a.vol,
    ret: a.ret,
    name: a.name,
  }));

  const gmvPoint = [{ ...gmv, name: "GMV (最小方差)" }];
  const tangentPoint = tangent ? [{ ...tangent, name: `切线组合 (SR=${tangent.sharpe.toFixed(2)})` }] : [];

  // CML line if tangent exists
  const cmlData = tangent
    ? Array.from({ length: 50 }, (_, i) => {
        const vol = (i / 49) * (Math.max(...assets.map(a => a.vol)) + 10);
        return { vol, ret: 2 + tangent.sharpe * vol };
      }).filter(p => p.ret <= Math.max(...assets.map(a => a.ret)) + 10)
    : [];

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            Portfolio Optimization
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            有效前沿可视化
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold"
        >
          {/* Formula bar */}
          <div className="text-center mb-8 py-4 px-6 rounded-xl bg-secondary/50 border border-border">
            <p className="text-lg md:text-xl font-mono text-gold tracking-wide">
              min w'Σw &nbsp; s.t. &nbsp; w'μ = μ₀, &nbsp; w'𝟏 = 1
            </p>
          </div>

          <PresetButtons presets={[
            { name: "经典双资产", description: "股票+债券, ρ=0.2", apply: () => { setAssets([{ id: "1", name: "股票", ret: 12, vol: 20 }, { id: "2", name: "债券", ret: 5, vol: 8 }]); setRho(0.2); setAllowShort(false); } },
            { name: "全球配置", description: "美股/国债/新兴/商品", apply: () => { setAssets([{ id: "1", name: "美股", ret: 10, vol: 16 }, { id: "2", name: "国债", ret: 4, vol: 5 }, { id: "3", name: "新兴市场", ret: 14, vol: 25 }, { id: "4", name: "商品", ret: 7, vol: 18 }]); setRho(0.3); setAllowShort(false); } },
            { name: "Markowitz示例", description: "允许卖空, ρ=0.5", apply: () => { setAssets([{ id: "1", name: "资产 A", ret: 15, vol: 22 }, { id: "2", name: "资产 B", ret: 8, vol: 12 }, { id: "3", name: "资产 C", ret: 11, vol: 18 }]); setRho(0.5); setAllowShort(true); } },
          ]} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Asset inputs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  资产配置（{assets.length}/8）
                </p>
                <button
                  onClick={addAsset}
                  disabled={assets.length >= 8}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3 h-3" /> 添加资产
                </button>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {assets.map((asset, idx) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: [CHART_GOLD, CHART_TEAL, CHART_RED, CHART_BLUE, "hsl(280,60%,55%)", "hsl(150,60%,45%)", "hsl(30,80%,50%)", "hsl(340,60%,50%)"][idx % 8],
                      }}
                    />
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => updateAsset(asset.id, "name", e.target.value)}
                      className="w-20 bg-transparent text-sm font-mono text-foreground border-b border-border/50 focus:border-gold outline-none px-1"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground">μ</span>
                      <input
                        type="number"
                        value={asset.ret}
                        onChange={(e) => updateAsset(asset.id, "ret", parseFloat(e.target.value) || 0)}
                        className="w-14 bg-secondary/50 text-sm font-mono text-foreground rounded px-2 py-1 border border-border/30 focus:border-gold outline-none text-center"
                        step={0.5}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground">σ</span>
                      <input
                        type="number"
                        value={asset.vol}
                        onChange={(e) => updateAsset(asset.id, "vol", Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                        className="w-14 bg-secondary/50 text-sm font-mono text-foreground rounded px-2 py-1 border border-border/30 focus:border-gold outline-none text-center"
                        step={0.5}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground">%</span>
                    </div>
                    <button
                      onClick={() => removeAsset(asset.id)}
                      disabled={assets.length <= 2}
                      className="ml-auto text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-sm text-secondary-foreground font-medium">
                      统一相关系数 ρ
                    </label>
                    <span className="text-sm font-mono text-gold">{rho.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-0.5}
                    max={0.95}
                    step={0.05}
                    value={rho}
                    onChange={(e) => setRho(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                    <span>-0.5</span>
                    <span>0.95</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowShort}
                    onChange={(e) => setAllowShort(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-gold"
                  />
                  <span className="text-sm text-secondary-foreground">允许卖空</span>
                </label>
              </div>
            </div>

            {/* Chart */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                均值-标准差空间
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={380}>
                  <ScatterChart margin={{ top: 10, right: 20, left: 5, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis
                      type="number"
                      dataKey="vol"
                      stroke={CHART_TEXT}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      label={{
                        value: "波动率 σ (%)",
                        position: "insideBottom",
                        offset: -5,
                        style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" },
                      }}
                      domain={["auto", "auto"]}
                    />
                    <YAxis
                      type="number"
                      dataKey="ret"
                      stroke={CHART_TEXT}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      width={45}
                      label={{
                        value: "收益 μ (%)",
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" },
                      }}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip content={<FrontierTooltip />} />

                    {/* CML */}
                    {cmlData.length > 0 && (
                      <Scatter
                        name="CML"
                        data={cmlData}
                        line={{ stroke: "hsl(220, 40%, 45%)", strokeWidth: 1, strokeDasharray: "6 3" }}
                        shape={() => <></>}
                        legendType="line"
                      />
                    )}

                    {/* Efficient Frontier - clickable dots */}
                    <Scatter
                      name="有效前沿"
                      data={frontier.map((p, i) => ({ ...p, idx: i }))}
                      line={{ stroke: CHART_GOLD, strokeWidth: 2.5 }}
                      shape={(props: any) => {
                        const { cx, cy, payload } = props;
                        const isSelected = selectedIdx === payload?.idx;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isSelected ? 6 : 3}
                            fill={isSelected ? CHART_GOLD : "transparent"}
                            stroke={CHART_GOLD}
                            strokeWidth={isSelected ? 2 : 0}
                            style={{ cursor: "pointer" }}
                            onClick={() => setSelectedIdx(payload?.idx ?? null)}
                          />
                        );
                      }}
                      legendType="line"
                    />

                    {/* Individual assets */}
                    <Scatter
                      name="资产"
                      data={assetPoints}
                      fill={CHART_TEAL}
                      shape="circle"
                      r={6}
                    />

                    {/* GMV */}
                    <Scatter
                      name="GMV"
                      data={gmvPoint}
                      fill={CHART_BLUE}
                      shape="diamond"
                      r={7}
                    />

                    {/* Tangent */}
                    {tangentPoint.length > 0 && (
                      <Scatter
                        name="切线组合"
                        data={tangentPoint}
                        fill={CHART_RED}
                        shape="star"
                        r={7}
                      />
                    )}

                    <Legend
                      wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                Rᶠ = 2% · 点击金色前沿上的点查看权重分配 · 菱形 = GMV · 星形 = 切线组合 · 虚线 = CML
              </p>
            </div>
          </div>

          {/* Weight Pie Chart */}
          {pieData && selectedIdx !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-xl border border-gold/20 bg-gold/[0.03] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-mono text-gold uppercase tracking-wider mb-1">
                    组合权重分配
                  </p>
                  <p className="text-sm font-mono text-muted-foreground">
                    目标收益 μ = {frontier[selectedIdx]?.ret?.toFixed(2)}% · 波动率 σ = {frontier[selectedIdx]?.vol?.toFixed(2)}%
                  </p>
                </div>
                <button
                  onClick={() => setSelectedIdx(null)}
                  className="text-xs font-mono px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all"
                >
                  关闭
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData.filter(d => d.absValue > 0.01)}
                      dataKey="absValue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={40}
                      strokeWidth={1}
                      stroke="hsl(var(--border))"
                      label={({ name, value }) => `${name}`}
                    >
                      {pieData.filter(d => d.absValue > 0.01).map((_, i) => (
                        <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number, name: string, props: any) => {
                        const original = pieData.find(d => d.name === name);
                        return [`${original?.value?.toFixed(2)}%`, name];
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-secondary/30">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length] }}
                      />
                      <span className="text-sm font-mono text-foreground flex-1">{d.name}</span>
                      <span className={`text-sm font-mono font-bold ${d.value < 0 ? 'text-red-400' : 'text-gold'}`}>
                        {d.value > 0 ? '+' : ''}{d.value.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-blue-400/20 bg-blue-400/[0.03] p-5 text-center">
              <p className="text-xs font-mono text-blue-400 mb-1 uppercase tracking-wider">
                最小方差组合 (GMV)
              </p>
              <p className="text-xl font-mono font-bold text-foreground">
                μ = {gmv.ret.toFixed(2)}%
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                σ = {gmv.vol.toFixed(2)}%
              </p>
            </div>

            {tangent && (
              <div className="rounded-xl border border-gold/20 bg-gold/[0.03] p-5 text-center">
                <p className="text-xs font-mono text-gold mb-1 uppercase tracking-wider">
                  切线组合 (Max Sharpe)
                </p>
                <p className="text-xl font-mono font-bold text-foreground">
                  SR = {tangent.sharpe.toFixed(3)}
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  μ = {tangent.ret.toFixed(2)}% · σ = {tangent.vol.toFixed(2)}%
                </p>
              </div>
            )}

            <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.03] p-5 text-center">
              <p className="text-xs font-mono text-teal-400 mb-1 uppercase tracking-wider">
                分散化效应
              </p>
              <p className="text-xl font-mono font-bold text-foreground">
                {((1 - gmv.vol / (assets.reduce((s, a) => s + a.vol, 0) / assets.length)) * 100).toFixed(1)}%
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                风险降低（GMV vs 等权平均波动率）
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EfficientFrontier;