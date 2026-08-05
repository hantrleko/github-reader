import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, ScatterChart, Scatter, ReferenceLine, ComposedChart, Area, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "../frontier/ui";
import {
  frontierGeometry, singleIndexLab, estimationErrorLab, constraintRebalanceLab,
  activeManagementLab, downsideRiskLab, dynamicAllocationLab, regularizationLab,
} from "@/lib/quant/portfolioFrontier";

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
    {children}
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
    {children}
  </div>
);

const Choice = <T extends string>({ value, options, onChange }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button key={o.id} onClick={() => onChange(o.id)}
        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
          value === o.id ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground hover:text-foreground"
        }`}>{o.label}</button>
    ))}
  </div>
);

/* ═══════════ 1. 有效前沿几何与两基金分离 ═══════════ */

export const FrontierGeometryTool = () => {
  const [rf, setRf] = useState(0.02);
  const [lev, setLev] = useState(1.6);
  const [mu3, setMu3] = useState(0.14);
  const [rho, setRho] = useState(0.2);
  const [longOnly, setLongOnly] = useState(false);

  const g = useMemo(() => {
    const mu = [0.06, 0.10, mu3];
    const sig = [0.12, 0.18, 0.28];
    const cov = sig.map((si, i) => sig.map((sj, j) => (i === j ? si * si : rho * si * sj)));
    return frontierGeometry(mu, cov, rf, lev);
  }, [rf, lev, mu3, rho]);

  const data = g.curve.map((p) => ({ vol: +(p.vol * 100).toFixed(2), ret: +(p.ret * 100).toFixed(2), eff: p.efficient ? +(p.ret * 100).toFixed(2) : null }));
  const cal = g.cal.map((p) => ({ vol: +(p.vol * 100).toFixed(2), cal: +(p.ret * 100).toFixed(2) }));
  const lo = g.constrained.map((p) => ({ vol: +(p.vol * 100).toFixed(2), lo: +(p.ret * 100).toFixed(2) }));
  const assets = g.assets.map((a, i) => ({ vol: +(a.vol * 100).toFixed(2), ret: +(a.ret * 100).toFixed(2), name: `资产 ${i + 1}` }));
  const sml = g.assets.map((a, i) => ({ beta: +a.beta.toFixed(3), ret: +(a.ret * 100).toFixed(2), name: `A${i + 1}` }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "标准 CAL", description: "无风险利率 2%，可借贷", apply: () => { setRf(0.02); setLev(1.6); setRho(0.2); } },
        { name: "禁止借款", description: "杠杆上限 = 1，切点不可超越", apply: () => { setLev(1); } },
        { name: "高相关市场", description: "ρ=0.8，分散化收益萎缩", apply: () => { setRho(0.8); } },
        { name: "负相关对冲", description: "ρ=−0.3，前沿显著左移", apply: () => { setRho(-0.3); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Slider label="无风险利率 r_f" value={rf} min={0} max={0.06} step={0.002} fmt={(v) => pct(v, 1)} onChange={setRf} />
        <Slider label="杠杆上限" sub="=1 表示禁止借款" value={lev} min={1} max={2.5} step={0.1} onChange={setLev} />
        <Slider label="资产 3 预期收益" value={mu3} min={0.06} max={0.22} step={0.005} fmt={(v) => pct(v, 1)} onChange={setMu3} />
        <Slider label="资产间相关系数 ρ" value={rho} min={-0.4} max={0.9} step={0.05} onChange={setRho} />
        <div className="lg:col-span-2 flex items-end">
          <Choice value={longOnly ? "lo" : "un"} onChange={(v) => setLongOnly(v === "lo")} options={[
            { id: "un", label: "无约束前沿" }, { id: "lo", label: "叠加长仓约束前沿" },
          ]} />
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={[...data, ...cal, ...(longOnly ? lo : []), ...assets]}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="vol" stroke={C.text} tick={{ fontSize: 10 }} name="波动率 %" label={{ value: "年化波动率 (%)", position: "insideBottom", offset: -4, fontSize: 10, fill: C.text }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "预期收益 (%)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.text }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="ret" name="最小方差前沿" stroke={C.text} strokeWidth={1.2} dot={false} connectNulls />
            <Line type="monotone" dataKey="eff" name="有效边界" stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="cal" name="资本配置线 CAL" stroke={C.teal} strokeWidth={1.6} strokeDasharray="5 3" dot={false} connectNulls />
            {longOnly && <Line type="monotone" dataKey="lo" name="长仓约束前沿" stroke={C.blue} strokeWidth={1.6} dot={false} connectNulls />}
            <Scatter dataKey="ret" data={assets} name="单个资产" fill={C.red} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="GMV 波动率" value={pct(g.gmv.vol)} sub={`收益 ${pct(g.gmv.ret)}`} />
        <Stat label="切点组合 Sharpe" value={g.tangency ? g.tangency.sharpe.toFixed(3) : "—"} color={C.teal} sub={g.tangency ? `σ ${pct(g.tangency.vol)}` : ""} />
        <Stat label="零贝塔组合收益" value={g.zeroBeta ? pct(g.zeroBeta.ret) : "—"} color={C.blue} sub="Black (1972) 受限借贷下的截距" />
        <Stat label="双曲线常数 D" value={g.D.toFixed(2)} sub={`A=${g.A.toFixed(1)} B=${g.B.toFixed(2)} C=${g.C.toFixed(3)}`} />
      </div>

      <Panel title="证券市场线 — 以切点组合为参照">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="beta" stroke={C.text} tick={{ fontSize: 10 }} name="β" />
              <YAxis type="number" dataKey="ret" stroke={C.text} tick={{ fontSize: 10 }} name="E[R] %" />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={(g.zeroBeta ? g.zeroBeta.ret : rf) * 100} stroke={C.blue} strokeDasharray="4 3"
                label={{ value: "零贝塔收益", fontSize: 9, fill: C.blue, position: "insideTopLeft" }} />
              <ReferenceLine y={rf * 100} stroke={C.teal} strokeDasharray="4 3" label={{ value: "r_f", fontSize: 9, fill: C.teal }} />
              <Scatter data={sml} fill={C.gold} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p>· <span className="text-gold">两基金分离</span>：任意前沿组合都是 GMV 与另一前沿组合的线性组合；引入无风险资产后，所有投资者只需持有 r_f 与切点组合两只基金，风险偏好只决定 CAL 上的位置。</p>
        <p>· 把杠杆上限设为 1（禁止借款），CAL 在切点处截断，此时均衡定价的参照不再是 r_f，而是<span className="text-gold"> 零贝塔组合</span>——Black (1972) 零贝塔 CAPM，SML 截距抬升、斜率变平。</p>
        <p>· 长仓约束前沿始终位于无约束前沿的右下方：约束是投资主张的一部分，也是估计误差的隐性正则化。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 2. 单指数模型降维 ═══════════ */

export const SingleIndexTool = () => {
  const [n, setN] = useState(15);
  const [T, setT] = useState(60);
  const [disp, setDisp] = useState(0.35);
  const [seed, setSeed] = useState(7);

  const s = useMemo(() => singleIndexLab({ n, T, betaDisp: disp, seed }), [n, T, disp, seed]);
  const betas = s.betas.map((b, i) => ({ name: `A${i + 1}`, beta: +b.toFixed(2), r2: +(s.r2[i] * 100).toFixed(1) }));
  const cmp = [
    { name: "真实协方差", vol: +(s.oosVolTrue * 100).toFixed(2) },
    { name: "单指数结构", vol: +(s.oosVolIndex * 100).toFixed(2) },
    { name: "样本协方差", vol: +(s.oosVolSample * 100).toFixed(2) },
    { name: "等权 1/N", vol: +(s.oosVolEqual * 100).toFixed(2) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "短样本高维", description: "N=25, T=48 → 样本协方差崩溃", apply: () => { setN(25); setT(48); } },
        { name: "长样本", description: "N=10, T=240 → 样本协方差可用", apply: () => { setN(10); setT(240); } },
        { name: "β 分散度高", description: "跨资产系统性暴露差异大", apply: () => setDisp(0.7) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label="资产数 N" value={n} min={5} max={40} step={1} fmt={(v) => v.toFixed(0)} onChange={setN} />
        <Slider label="样本长度 T (月)" value={T} min={24} max={360} step={12} fmt={(v) => v.toFixed(0)} onChange={setT} />
        <Slider label="β 离散度" value={disp} min={0.05} max={0.9} step={0.05} onChange={setDisp} />
        <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="样本协方差参数个数" value={s.paramsSample.toFixed(0)} color={C.red} sub="N(N+1)/2" />
        <Stat label="单指数参数个数" value={s.paramsIndex.toFixed(0)} color={C.teal} sub="2N+1 (β, σ²ε, σ²m)" />
        <Stat label="T / 参数比" value={(T / s.paramsSample).toFixed(2)} sub="< 1 即病态估计" />
        <Stat label="平均 R²" value={pct(s.r2.reduce((a, b) => a + b, 0) / s.r2.length)} sub="系统性风险占比" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="估计的 β 与 R²">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={betas}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="beta" name="β̂" fill={C.gold} />
                <Bar dataKey="r2" name="R² (%)" fill={C.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="样本外真实波动率 — 用各协方差估计构造最小方差组合">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cmp} layout="vertical">
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} width={92} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="vol" name="真实波动率 (%)" fill={C.gold}>
                  {cmp.map((d, i) => <Cell key={i} fill={i === 1 ? C.teal : i === 2 ? C.red : C.gold} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        <p>· 平均协方差绝对误差：样本 {s.meanAbsCovError.sample.toExponential(2)} vs 单指数 {s.meanAbsCovError.index.toExponential(2)}。</p>
        <p>· Sharpe (1963) 单指数模型把 N(N+1)/2 个自由参数压缩到 2N+1 个：<span className="text-gold">σᵢⱼ = βᵢβⱼσ²ₘ</span>，代价是假设残差互不相关。多指数/因子模型则在偏误与方差之间再取一个折中。</p>
        <p>· 结构化估计的价值只在 T 相对 N 不足时显现；样本足够长时，样本协方差的偏误优势会反超。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 3. 估计误差与滚动优化 ═══════════ */

export const EstimationErrorTool = () => {
  const [n, setN] = useState(8);
  const [T, setT] = useState(60);
  const [sims, setSims] = useState(80);
  const [seed, setSeed] = useState(11);

  const e = useMemo(() => estimationErrorLab({ n, T, sims, seed }), [n, T, sims, seed]);
  const chart = e.bySample.map((p) => ({
    T: p.T, 均值方差: +p.mv.toFixed(3), 最小方差: +p.minvar.toFixed(3), 等权: +p.equal.toFixed(3), 上帝视角: +p.oracle.toFixed(3),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "DeMiguel 场景", description: "N=8, T=60 → 1/N 难以被战胜", apply: () => { setN(8); setT(60); } },
        { name: "极短样本", description: "T=24，插件式优化彻底失效", apply: () => setT(24) },
        { name: "大样本", description: "T=480，估计误差被稀释", apply: () => setT(480) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label="资产数 N" value={n} min={4} max={20} step={1} fmt={(v) => v.toFixed(0)} onChange={setN} />
        <Slider label="估计窗口 T (月)" value={T} min={24} max={480} step={12} fmt={(v) => v.toFixed(0)} onChange={setT} />
        <Slider label="模拟次数" value={sims} min={30} max={300} step={10} fmt={(v) => v.toFixed(0)} onChange={setSims} />
        <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
      </div>

      <Panel title="样本外（真实参数下）年化 Sharpe — 蒙特卡洛均值">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">配置规则</th>
                <th className="text-right">真实 Sharpe</th>
                <th className="text-right">年化波动</th>
                <th className="text-right">权重 L1 误差</th>
                <th className="text-right">最大单一权重</th>
                <th className="text-right">重估换手</th>
              </tr>
            </thead>
            <tbody>
              {e.rows.map((r) => (
                <tr key={r.method} className="border-b border-border/40">
                  <td className="py-2 text-foreground">{r.method}</td>
                  <td className="text-right text-gold">{r.trueSharpe.toFixed(3)}</td>
                  <td className="text-right">{pct(r.vol)}</td>
                  <td className="text-right">{r.weightError.toFixed(3)}</td>
                  <td className="text-right">{pct(r.maxWeight, 0)}</td>
                  <td className="text-right">{r.turnoverProxy.toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 text-teal-400">上帝视角（已知真实 μ, Σ）</td>
                <td className="text-right text-teal-400">{e.oracleSharpe.toFixed(3)}</td>
                <td className="text-right" colSpan={4}>理论上限：任何估计规则都不可能超过它</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="T" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "估计窗口 T (月)", position: "insideBottom", offset: -4, fontSize: 10, fill: C.text }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="上帝视角" stroke={C.text} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="均值方差" stroke={C.red} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="最小方差" stroke={C.teal} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="等权" stroke={C.gold} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Note>
        <p>· 均值向量的估计误差远大于协方差：这就是最小方差组合常常比切点组合更稳的原因，也是 <span className="text-gold">1/N 成为强基准</span>（DeMiguel, Garlappi &amp; Uppal 2009）的原因。</p>
        <p>· 插件式（plug-in）优化把噪声当信号：估计误差最大的资产往往获得最极端的权重——「误差最大化器」。</p>
        <p>· 解决方向有三条：收缩估计（Ledoit-Wolf）、贝叶斯先验（Black-Litterman）、以及直接施加约束/正则化，本版块均有对应工具。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 4. 约束与再平衡成本 ═══════════ */

export const RebalanceCostTool = () => {
  const [cost, setCost] = useState(20);
  const [thr, setThr] = useState(0.05);
  const [vol, setVol] = useState(0.2);
  const [corr, setCorr] = useState(0.3);

  const r = useMemo(() => constraintRebalanceLab({ n: 6, days: 1260, costBps: cost, threshold: thr, vol, corr, seed: 5 }), [cost, thr, vol, corr]);
  const fr = r.frontier.map((p) => ({ te: +(p.te * 100).toFixed(2), cost: +(p.cost * 100).toFixed(2), thr: `${(p.threshold * 100).toFixed(1)}%`, turnover: +(p.turnover * 100).toFixed(0) }));
  const drift = r.driftPath.map((p) => ({ t: p.t, drift: +(p.drift * 100).toFixed(2), band: +(p.band * 100).toFixed(2) }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "低成本流动市场", description: "5bp 交易成本", apply: () => setCost(5) },
        { name: "高成本另类资产", description: "80bp 成本，宽带更优", apply: () => { setCost(80); setThr(0.1); } },
        { name: "高波动区间", description: "σ=35%，偏离更快触发", apply: () => setVol(0.35) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label="单边成本 (bp)" value={cost} min={0} max={100} step={5} fmt={(v) => v.toFixed(0)} onChange={setCost} />
        <Slider label="阈值带宽" value={thr} min={0.01} max={0.2} step={0.01} fmt={(v) => pct(v, 0)} onChange={setThr} />
        <Slider label="资产波动率" value={vol} min={0.08} max={0.4} step={0.02} fmt={(v) => pct(v, 0)} onChange={setVol} />
        <Slider label="平均相关系数" value={corr} min={0} max={0.85} step={0.05} onChange={setCorr} />
      </div>

      <Panel title="再平衡规则对照 (5 年模拟, 6 资产等权目标)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">规则</th>
                <th className="text-right">交易次数</th>
                <th className="text-right">年化换手</th>
                <th className="text-right">累计成本</th>
                <th className="text-right">跟踪误差</th>
                <th className="text-right">最大权重偏离</th>
                <th className="text-right">净 CAGR</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={row.rule} className="border-b border-border/40">
                  <td className="py-2 text-foreground">{row.rule}</td>
                  <td className="text-right">{row.trades}</td>
                  <td className="text-right">{pct(row.turnover, 0)}</td>
                  <td className="text-right text-red-400">{pct(row.cost, 2)}</td>
                  <td className="text-right">{pct(row.trackingError, 2)}</td>
                  <td className="text-right">{pct(row.maxDrift, 1)}</td>
                  <td className="text-right text-gold">{pct(row.netCagr, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="成本 — 跟踪误差权衡曲线（阈值带宽）">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="te" name="跟踪误差 %" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="cost" name="累计成本 %" stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter data={fr} fill={C.gold} line stroke={C.gold} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="权重偏离路径与触发带">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={drift}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="drift" name="偏离度 (%)" stroke={C.teal} fill={C.teal} fillOpacity={0.18} />
                <Line type="monotone" dataKey="band" name="触发带" stroke={C.red} strokeDasharray="4 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="权重上限约束对最小方差解的影响">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {r.capEffect.map((c) => (
            <Stat key={c.cap} label={`上限 ${pct(c.cap, 0)}`} value={pct(c.vol)} sub={`有效资产数 ${c.effN.toFixed(2)}`} />
          ))}
        </div>
      </Panel>

      <Note>
        <p>· 再平衡不是「回到目标权重」，而是<span className="text-gold">用交易成本换取风险敞口的控制</span>：日历规则简单可审计，阈值规则在高波动期自动加密、在平静期自然节流。</p>
        <p>· 不再平衡会让组合逐步漂向近期涨得最多的资产，事实上是被动的动量暴露，其风险画像与目标组合越走越远。</p>
        <p>· 权重上限既是合规约束，也是隐性正则化：它提高了有效资产数，代价是最小方差解的样本内波动上升。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 5. 主动管理与信息比率 ═══════════ */

export const ActiveManagementTool = () => {
  const [ic, setIc] = useState(0.05);
  const [breadth, setBreadth] = useState(200);
  const [tc, setTc] = useState(0.6);
  const [lambda, setLambda] = useState(0.1);
  const [targetIR, setTargetIR] = useState(0.5);

  const a = useMemo(() => activeManagementLab({ ic, breadth, tc, lambda, targetIR }), [ic, breadth, tc, lambda, targetIR]);
  const grid = a.grid.map((g) => ({ breadth: g.breadth, "IC=0.03": +g.ic03.toFixed(2), "IC=0.05": +g.ic05.toFixed(2), "IC=0.10": +g.ic10.toFixed(2) }));
  const tb = a.treynorBlack;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "选股经理", description: "IC=0.05, 广度 200", apply: () => { setIc(0.05); setBreadth(200); } },
        { name: "宏观择时", description: "IC=0.15 但广度仅 12", apply: () => { setIc(0.15); setBreadth(12); } },
        { name: "高频统计套利", description: "IC=0.02, 广度 5000", apply: () => { setIc(0.02); setBreadth(5000); } },
        { name: "约束侵蚀", description: "转换系数 TC=0.3", apply: () => setTc(0.3) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Slider label="信息系数 IC" value={ic} min={0.005} max={0.2} step={0.005} onChange={setIc} />
        <Slider label="广度 BR (独立决策/年)" value={breadth} min={5} max={5000} step={5} fmt={(v) => v.toFixed(0)} onChange={setBreadth} />
        <Slider label="转换系数 TC" sub="约束造成的实现损耗" value={tc} min={0.1} max={1} step={0.05} onChange={setTc} />
        <Slider label="风险厌恶 λ_A" value={lambda} min={0.02} max={0.4} step={0.02} onChange={setLambda} />
        <Slider label="目标 IR" value={targetIR} min={0.2} max={1.5} step={0.1} onChange={setTargetIR} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="理论 IR = IC·√BR" value={a.ir.toFixed(3)} />
        <Stat label="实现 IR (含 TC)" value={a.irWithTC.toFixed(3)} color={C.teal} />
        <Stat label="最优跟踪误差" value={pct(a.optimalTE)} sub="IR/(2λ)" />
        <Stat label="附加价值 IR²/4λ" value={pct(a.valueAdded, 2)} color={C.gold} />
        <Stat label={`达到 IR=${targetIR.toFixed(1)} 所需 IC`} value={a.breakEvenIC.toFixed(4)} color={a.breakEvenIC > ic ? C.red : C.green} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="基本法则：IR 随广度的平方根增长">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={grid}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="breadth" scale="log" domain={["dataMin", "dataMax"]} stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="IC=0.03" stroke={C.blue} dot={false} strokeWidth={1.6} />
                <Line type="monotone" dataKey="IC=0.05" stroke={C.gold} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="IC=0.10" stroke={C.teal} dot={false} strokeWidth={1.6} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Treynor-Black 主动组合">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Stat label="主动组合 α" value={pct(tb.activeAlpha, 2)} />
            <Stat label="评价比率 α/σ(ε)" value={tb.appraisal.toFixed(3)} color={C.teal} />
            <Stat label="主动仓位 w*" value={pct(tb.wActive, 1)} />
            <Stat label="组合 Sharpe" value={tb.sharpeCombined.toFixed(3)} color={C.gold} sub={`市场 ${tb.sharpeMarket.toFixed(3)}`} />
          </div>
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border"><th className="text-left py-1.5">头寸</th><th className="text-right">α</th><th className="text-right">σ(ε)</th><th className="text-right">主动权重</th></tr>
            </thead>
            <tbody>
              {tb.positions.map((p) => (
                <tr key={p.name} className="border-b border-border/40">
                  <td className="py-1.5 text-foreground">{p.name}</td>
                  <td className="text-right">{pct(p.alpha, 1)}</td>
                  <td className="text-right">{pct(p.resid, 0)}</td>
                  <td className={`text-right ${p.weight < 0 ? "text-red-400" : "text-gold"}`}>{pct(p.weight, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Note>
        <p>· Grinold 基本法则：<span className="text-gold">IR ≈ TC · IC · √BR</span>。提高广度通常比提高预测精度更现实，但「独立」二字是关键——高度相关的 500 只股票并不等于 500 个独立决策。</p>
        <p>· 附加价值 IR²/(4λ) 与最优跟踪误差 IR/(2λ) 说明：没有能力就不该承担主动风险，主动风险预算应当由能力而非野心决定。</p>
        <p>· Treynor-Black 把 α 与残差风险的比值（评价比率）作为唯一的头寸依据，组合 Sharpe² = 市场 Sharpe² + 评价比率²。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 6. 下行风险与随机占优 ═══════════ */

export const DownsideDominanceTool = () => {
  const [gamma, setGamma] = useState(4);
  const [jumpProb, setJumpProb] = useState(0.03);
  const [jumpSize, setJumpSize] = useState(0.25);
  const [muB, setMuB] = useState(0.09);

  const d = useMemo(() => downsideRiskLab({ gamma, jumpProb, jumpSize, muB, n: 4000, seed: 9 }), [gamma, jumpProb, jumpSize, muB]);
  const cdf = d.cdf.filter((_, i) => i % 2 === 0).map((p) => ({ x: +(p.x * 100).toFixed(1), A: +p.A.toFixed(3), B: +p.B.toFixed(3), intA: +p.intA.toFixed(3), intB: +p.intB.toFixed(3) }));
  const util = d.utility.map((p) => ({ w: +(p.w * 100).toFixed(0), ceq: +(p.ceq * 100).toFixed(2), mv: +(p.meanVarCeq * 100).toFixed(2) }));

  const Row = ({ k, a, b, better }: { k: string; a: string; b: string; better?: "a" | "b" }) => (
    <tr className="border-b border-border/40">
      <td className="py-1.5 text-muted-foreground">{k}</td>
      <td className={`text-right ${better === "a" ? "text-gold" : "text-foreground"}`}>{a}</td>
      <td className={`text-right ${better === "b" ? "text-gold" : "text-foreground"}`}>{b}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "对称 vs 卖权式", description: "B 收益更高但有左尾跳跃", apply: () => { setJumpProb(0.03); setJumpSize(0.25); } },
        { name: "灾难尾部", description: "6% 概率、40% 跌幅", apply: () => { setJumpProb(0.06); setJumpSize(0.4); } },
        { name: "极度厌恶风险", description: "γ=10", apply: () => setGamma(10) },
        { name: "近似风险中性", description: "γ=1 (对数效用)", apply: () => setGamma(1) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label="风险厌恶 γ (CRRA)" value={gamma} min={1} max={12} step={0.5} onChange={setGamma} />
        <Slider label="B 的跳跃概率" value={jumpProb} min={0} max={0.15} step={0.005} fmt={(v) => pct(v, 1)} onChange={setJumpProb} />
        <Slider label="B 的跳跃幅度" value={jumpSize} min={0.05} max={0.6} step={0.05} fmt={(v) => pct(v, 0)} onChange={setJumpSize} />
        <Slider label="B 的预期收益" value={muB} min={0.04} max={0.16} step={0.005} fmt={(v) => pct(v, 1)} onChange={setMuB} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="下行风险度量对照">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border"><th className="text-left py-1.5">指标</th><th className="text-right">组合 A 对称</th><th className="text-right">组合 B 左尾</th></tr>
            </thead>
            <tbody>
              <Row k="预期收益" a={pct(d.a.meanRet, 2)} b={pct(d.b.meanRet, 2)} better={d.b.meanRet > d.a.meanRet ? "b" : "a"} />
              <Row k="波动率" a={pct(d.a.vol, 2)} b={pct(d.b.vol, 2)} better={d.b.vol < d.a.vol ? "b" : "a"} />
              <Row k="Sharpe" a={d.a.sharpe.toFixed(3)} b={d.b.sharpe.toFixed(3)} better={d.b.sharpe > d.a.sharpe ? "b" : "a"} />
              <Row k="半标准差" a={pct(d.a.semiDev, 2)} b={pct(d.b.semiDev, 2)} better={d.b.semiDev < d.a.semiDev ? "b" : "a"} />
              <Row k="Sortino" a={d.a.sortino.toFixed(3)} b={d.b.sortino.toFixed(3)} better={d.b.sortino > d.a.sortino ? "b" : "a"} />
              <Row k="Omega (τ=0)" a={d.a.omega.toFixed(2)} b={d.b.omega.toFixed(2)} better={d.b.omega > d.a.omega ? "b" : "a"} />
              <Row k="LPM₂ 下偏矩" a={d.a.lpm2.toExponential(2)} b={d.b.lpm2.toExponential(2)} better={d.b.lpm2 < d.a.lpm2 ? "b" : "a"} />
              <Row k="VaR 95%" a={pct(d.a.var95, 2)} b={pct(d.b.var95, 2)} better={d.b.var95 < d.a.var95 ? "b" : "a"} />
              <Row k="CVaR 95%" a={pct(d.a.cvar95, 2)} b={pct(d.b.cvar95, 2)} better={d.b.cvar95 < d.a.cvar95 ? "b" : "a"} />
              <Row k="偏度 / 峰度" a={`${d.a.skew.toFixed(2)} / ${d.a.kurt.toFixed(1)}`} b={`${d.b.skew.toFixed(2)} / ${d.b.kurt.toFixed(1)}`} />
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="一阶随机占优 FSD" value={d.fsd.dominates === "none" ? "无占优" : `${d.fsd.dominates} 占优`} color={d.fsd.dominates === "none" ? C.text : C.gold} />
            <Stat label="二阶随机占优 SSD" value={d.ssd.dominates === "none" ? "无占优" : `${d.ssd.dominates} 占优`} color={d.ssd.dominates === "none" ? C.text : C.teal} />
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="累积分布与其积分 (SSD 判据)">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cdf}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 10 }} />
                  <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="A" name="F_A" stroke={C.gold} dot={false} />
                  <Line type="monotone" dataKey="B" name="F_B" stroke={C.red} dot={false} />
                  <Line type="monotone" dataKey="intA" name="∫F_A" stroke={C.gold} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="intB" name="∫F_B" stroke={C.red} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title={`CRRA 确定性等价 — 最优 A 权重 ${pct(d.bestWeight, 0)}`}>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={util}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="w" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "A 的权重 (%)", position: "insideBottom", offset: -4, fontSize: 9, fill: C.text }} />
                  <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="ceq" name="CRRA 确定性等价 (%)" stroke={C.teal} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mv" name="均值-方差近似 (%)" stroke={C.gold} strokeDasharray="4 3" dot={false} />
                  <ReferenceLine x={+(d.bestWeight * 100).toFixed(0)} stroke={C.red} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <Note>
        <p>· 方差同等对待上行与下行；<span className="text-gold">LPM(n, τ)</span> 只惩罚低于目标 τ 的结果，n=0/1/2 分别对应损失概率、期望缺口与半方差。</p>
        <p>· 二阶随机占优不依赖任何特定效用函数，只要求投资者风险厌恶——比 Sharpe 排序稳健得多，但常常给出「无法排序」的诚实结论。</p>
        <p>· 均值-方差近似 μ − ½γσ² 在收益分布接近正态时与 CRRA 确定性等价几乎重合；一旦引入左尾跳跃，两条曲线的最优点会明显分离。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 7. 多期与动态配置 ═══════════ */

export const DynamicAllocationTool = () => {
  const [gamma, setGamma] = useState(4);
  const [horizon, setHorizon] = useState(20);
  const [mu, setMu] = useState(0.07);
  const [sigma, setSigma] = useState(0.16);
  const [phi, setPhi] = useState(0.15);

  const d = useMemo(() => dynamicAllocationLab({ gamma, horizon, mu, sigma, phi, sims: 3000, seed: 13 }), [gamma, horizon, mu, sigma, phi]);
  const glide = d.glide.map((g) => ({ age: g.age, 人力资本占比: +(g.humanRatio * 100).toFixed(1), 金融资产权益仓位: +(g.financialEquity * 100).toFixed(1), 总财富权益: +(g.totalEquity * 100).toFixed(1) }));
  const hz = d.horizonCurve.map((h) => ({ horizon: h.horizon, 总仓位: +(h.weight * 100).toFixed(1), 对冲需求: +(h.hedging * 100).toFixed(1) }));
  const paths = d.paths.map((p) => ({ q: p.q, 年度再平衡: +p.rebalanced.toFixed(2), 买入持有: +p.buyHold.toFixed(2) }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "长期投资者", description: "30 年期限，对冲需求显著", apply: () => { setHorizon(30); setPhi(0.2); } },
        { name: "短期资金", description: "3 年期限，接近短视解", apply: () => setHorizon(3) },
        { name: "保守配置", description: "γ=8", apply: () => setGamma(8) },
        { name: "无均值回复", description: "φ→0，对冲需求消失", apply: () => setPhi(0.01) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Slider label="风险厌恶 γ" value={gamma} min={1.5} max={12} step={0.5} onChange={setGamma} />
        <Slider label="投资期限 (年)" value={horizon} min={1} max={40} step={1} fmt={(v) => v.toFixed(0)} onChange={setHorizon} />
        <Slider label="风险溢价 μ − r" value={mu} min={0.03} max={0.12} step={0.005} fmt={(v) => pct(v, 1)} onChange={setMu} />
        <Slider label="波动率 σ" value={sigma} min={0.08} max={0.35} step={0.01} fmt={(v) => pct(v, 0)} onChange={setSigma} />
        <Slider label="溢价均值回复速度 φ" value={phi} min={0.01} max={0.5} step={0.01} onChange={setPhi} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="短视需求 (μ−r)/γσ²" value={pct(d.myopic, 0)} />
        <Stat label="跨期对冲需求" value={pct(d.hedgingDemand, 1)} color={d.hedgingDemand >= 0 ? C.teal : C.red} />
        <Stat label="总权益仓位 (受杠杆上限)" value={pct(d.totalWeight, 0)} color={C.gold} />
        <Stat label="再平衡收益 (均值差)" value={d.volDragBonus.toFixed(3)} sub="年度再平衡 − 买入持有" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="期限结构：短视需求 + 对冲需求">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hz}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="horizon" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "剩余期限 (年)", position: "insideBottom", offset: -4, fontSize: 9, fill: C.text }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="对冲需求" stroke={C.teal} fill={C.teal} fillOpacity={0.2} />
                <Line type="monotone" dataKey="总仓位" stroke={C.gold} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="生命周期下滑轨道（人力资本视角）">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={glide}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="age" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="金融资产权益仓位" stroke={C.gold} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="总财富权益" stroke={C.teal} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="人力资本占比" stroke={C.blue} strokeWidth={1.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="路径依赖：年度再平衡 vs 买入持有（终值分位数）">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paths}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="q" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="年度再平衡" fill={C.gold} />
              <Bar dataKey="买入持有" fill={C.teal} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p>· Merton (1969, 1971)：在 iid 收益与 CRRA 效用下，最优比例 <span className="text-gold">w* = (μ−r)/(γσ²)</span> 与期限无关——「年轻人就该多配股票」需要额外假设才能成立。</p>
        <p>· 一旦风险溢价可预测（均值回复），最优解多出<span className="text-gold">跨期对冲需求</span>；负相关（溢价上升伴随价格下跌）会让长期投资者持有更多风险资产。</p>
        <p>· 生命周期下滑轨道的严肃依据是人力资本：债券性质的人力资本占比越高，金融资产就应当越激进，随年龄增长自然去风险化。</p>
        <p>· 再平衡与买入持有在同一路径上产生不同的终值分布：前者压缩尾部分散、控制风险漂移，后者放大赢家、终值分布右偏。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 8. 高维正则化与最大分散化 ═══════════ */

export const RegularizationTool = () => {
  const [n, setN] = useState(20);
  const [T, setT] = useState(60);
  const [l1, setL1] = useState(0.02);
  const [l2, setL2] = useState(0.05);

  const r = useMemo(() => regularizationLab({ n, T, l1, l2, seed: 17 }), [n, T, l1, l2]);
  const path = r.path.map((p) => ({ lambda: +p.lambda.toFixed(3), 有效资产数: +p.effN.toFixed(2), 总敞口: +p.gross.toFixed(2), 样本外波动: +(p.vol * 100).toFixed(2) }));
  const wc = r.weightsChart.map((w) => ({ asset: w.asset, 无约束: +w.minvar.toFixed(3), L2: +w.l2.toFixed(3), L1: +w.l1.toFixed(3), MDP: +w.mdp.toFixed(3) }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "高维困境", description: "N=40, T=48 → 无约束解爆炸", apply: () => { setN(40); setT(48); } },
        { name: "强稀疏", description: "λ₁=0.05，只留少数头寸", apply: () => { setL1(0.05); setL2(0); } },
        { name: "岭收缩", description: "λ₂=0.15，权重趋向等权", apply: () => { setL2(0.15); setL1(0); } },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label="资产数 N" value={n} min={8} max={50} step={1} fmt={(v) => v.toFixed(0)} onChange={setN} />
        <Slider label="样本长度 T" value={T} min={24} max={240} step={12} fmt={(v) => v.toFixed(0)} onChange={setT} />
        <Slider label="L1 惩罚 λ₁" value={l1} min={0} max={0.06} step={0.002} fmt={(v) => v.toFixed(3)} onChange={setL1} />
        <Slider label="L2 惩罚 λ₂" value={l2} min={0} max={0.2} step={0.005} fmt={(v) => v.toFixed(3)} onChange={setL2} />
      </div>

      <Panel title="不同正则化方案的样本外表现（真实参数评估）">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">方案</th>
                <th className="text-right">年化波动</th>
                <th className="text-right">年化收益</th>
                <th className="text-right">Sharpe</th>
                <th className="text-right">有效资产数</th>
                <th className="text-right">总敞口 ‖w‖₁</th>
                <th className="text-right">空头占比</th>
                <th className="text-right">分散化比率</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={row.name} className="border-b border-border/40">
                  <td className="py-2 text-foreground">{row.name}</td>
                  <td className="text-right">{pct(row.vol, 2)}</td>
                  <td className="text-right">{pct(row.ret, 2)}</td>
                  <td className="text-right text-gold">{row.sharpe.toFixed(3)}</td>
                  <td className="text-right">{row.effN.toFixed(2)}</td>
                  <td className={`text-right ${row.gross > 2 ? "text-red-400" : ""}`}>{row.gross.toFixed(2)}</td>
                  <td className="text-right">{pct(row.shortShare, 1)}</td>
                  <td className="text-right text-teal-400">{row.divRatio.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="L1 正则化路径：总敞口与有效资产数">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={path}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="lambda" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="总敞口" stroke={C.red} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="有效资产数" stroke={C.teal} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="样本外波动" stroke={C.gold} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="权重分布对照">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wc}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="asset" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={0} stroke={C.text} />
                <Bar dataKey="无约束" fill={C.red} />
                <Bar dataKey="L1" fill={C.gold} />
                <Bar dataKey="MDP" fill={C.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        <p>· DeMiguel 等 (2009) 证明：对权重施加范数约束等价于对协方差矩阵做收缩——<span className="text-gold">约束就是正则化</span>，长仓约束是最粗糙但也最稳健的一种。</p>
        <p>· L1 产生稀疏解（可执行、可解释、交易成本低），L2 把权重推向等权（稳定但摊薄），二者结合即弹性网。</p>
        <p>· 最大分散化组合 (Choueifaty-Coignard 2008) 最大化 <span className="text-gold">Σwᵢσᵢ / σ_p</span>，等价于在相关系数矩阵上求最小方差再按波动率还原，天然规避高相关拥挤交易。</p>
      </Note>
    </div>
  );
};