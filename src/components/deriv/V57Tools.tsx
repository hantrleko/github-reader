import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, ReferenceLine, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import {
  statePricesFromTree, arbitrageBounds, longstaffSchwartz, futuresVsForward,
  sviFit, sviTotalVar, surfaceArbitrageCheck, dupireLocalVolFromSurface,
  vasicekBond, cirBond, hullWhiteBondOption, hjmDriftCheck, lmmCapletBlack,
  hazardRateBootstrap, carrMadanFFT, mcVarianceReduction,
  rBergomiSmile, roughSkewTermStructure, meanVarianceHedge, type SVIParams,
} from "@/lib/quant/derivFrontier";

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
    <p className="text-[13px] leading-relaxed text-foreground/80">{children}</p>
  </div>
);
const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    {children}
  </div>
);

/* ═════════ 1. 状态价格与无套利区间 ═════════ */
export const StatePriceBoundsTool = () => {
  const [sigma, setSigma] = useState(0.2);
  const [n, setN] = useState(12);
  const [K, setK] = useState(100);
  const [midMove, setMidMove] = useState(0.0);

  const sp = useMemo(() => statePricesFromTree({ S0: 100, sigma, r: 0.03, T: 1, n }), [sigma, n]);
  const bounds = useMemo(() => arbitrageBounds({
    S0: 100, r: 0.03, T: 1,
    states: [100 * Math.exp(sigma), 100 * Math.exp(midMove), 100 * Math.exp(-sigma)],
    payoffs: [Math.max(100 * Math.exp(sigma) - K, 0), Math.max(100 * Math.exp(midMove) - K, 0), Math.max(100 * Math.exp(-sigma) - K, 0)],
  }), [sigma, midMove, K]);

  const callPrice = sp.nodes.reduce((s, x) => s + x.statePrice * Math.max(x.ST - K, 0), 0);
  const digital = sp.nodes.reduce((s, x) => s + x.statePrice * (x.ST > K ? 1 : 0), 0);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "完备近似", description: "n=30 细化", apply: () => { setN(30); setSigma(0.2); } },
        { name: "强不完全", description: "中间态偏离大", apply: () => { setMidMove(0.12); setSigma(0.3); } },
        { name: "深度虚值", description: "K=120", apply: () => setK(120) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">树参数与索取权</p>
          <Slider label="σ (年化波动率)" value={sigma} min={0.05} max={0.6} step={0.01} onChange={setSigma} />
          <Slider label="n (树的步数)" value={n} min={2} max={40} step={1} onChange={setN} />
          <Slider label="K (行权价)" value={K} min={70} max={130} step={1} onChange={setK} />
          <Slider label="中间态 log 收益 (三叉树)" value={midMove} min={-0.15} max={0.15} step={0.01} onChange={setMidMove} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="Σ 状态价格" value={sp.sumStatePrices.toFixed(5)} sub={`e^{-rT} = ${sp.discount.toFixed(5)}`} />
          <Stat label="风险中性概率 p" value={sp.p.toFixed(4)} color={C.blue} />
          <Stat label="看涨期权 (状态价格加总)" value={callPrice.toFixed(4)} color={C.teal} />
          <Stat label="数字期权 = Q(S_T>K)·DF" value={digital.toFixed(4)} color={C.green} />
        </div>
      </div>

      <Panel title="Arrow-Debreu 状态价格分布 (每一元「只在该状态支付」的今日价值)">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sp.nodes.map((x) => ({ ST: +x.ST.toFixed(1), sp: +x.statePrice.toFixed(5), payoff: Math.max(x.ST - K, 0) }))}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="ST" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={K} stroke={C.red} strokeDasharray="4 3" />
              <Bar dataKey="sp" name="状态价格 ψ(S_T)">
                {sp.nodes.map((x, i) => <Cell key={i} fill={x.ST > K ? C.gold : C.blue} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="不完全市场：等价鞅测度集合与价格区间">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat label="次复制下界" value={bounds.lower.toFixed(4)} color={C.blue} />
          <Stat label="超复制上界" value={bounds.upper.toFixed(4)} color={C.red} />
          <Stat label="二叉树 (完备) 价格" value={bounds.completePrice.toFixed(4)} color={C.gold} />
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bounds.measures.map((m) => ({ qMid: +m.qMid.toFixed(3), price: +m.price.toFixed(4) }))}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="qMid" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "中间状态的风险中性概率 q_m", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="price" name="该测度下的价格" stroke={C.gold} strokeWidth={2} dot={false} />
              <ReferenceLine y={bounds.completePrice} stroke={C.teal} strokeDasharray="4 3" label={{ value: "完备市场价", fontSize: 10, fill: C.teal }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        状态价格把定价拆成两步：<strong>先问每一元的状态支付值多少钱</strong>，再对支付函数加权求和。
        Σψ = e^{-rT} 与 Σψ·S_T = S₀ 是无套利的两条硬约束。一旦状态数超过可交易资产数（这里是三态两资产），
        鞅测度不再唯一，价格塌缩成区间 [{bounds.lower.toFixed(3)}, {bounds.upper.toFixed(3)}]，
        宽度 {bounds.spread.toFixed(3)} 就是模型无法消除的不完全性成本——它必须由买卖价差、资本或效用假设来填补。
      </Note>
    </div>
  );
};

/* ═════════ 2. LSMC 美式/百慕大定价台 ═════════ */
export const LSMCTool = () => {
  const [sigma, setSigma] = useState(0.25);
  const [K, setK] = useState(100);
  const [T, setT] = useState(1);
  const [nEx, setNEx] = useState(25);
  const [paths, setPaths] = useState(6000);
  const [type, setType] = useState<"put" | "call">("put");

  const res = useMemo(() => longstaffSchwartz({
    S0: 100, K, r: 0.05, sigma, T, steps: 25, nPaths: paths, exerciseDates: nEx, type, seed: 42,
  }), [K, sigma, T, nEx, paths, type]);

  const ladder = useMemo(() =>
    [1, 2, 4, 6, 12, 25].map((m) => {
      const r = longstaffSchwartz({ S0: 100, K, r: 0.05, sigma, T, steps: 25, nPaths: 3000, exerciseDates: m, type, seed: 11 });
      return { dates: m, price: +r.price.toFixed(4), european: +r.european.toFixed(4) };
    }), [K, sigma, T, type]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "经典美式看跌", description: "K=100, σ=25%", apply: () => { setType("put"); setK(100); setSigma(0.25); } },
        { name: "高波动百慕大", description: "4 个行权日", apply: () => { setNEx(4); setSigma(0.45); } },
        { name: "无股息看涨", description: "早行权应≈0", apply: () => { setType("call"); setNEx(25); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">合约与模拟</p>
          <div className="flex gap-2">
            {(["put", "call"] as const).map((tp) => (
              <button key={tp} onClick={() => setType(tp)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${type === tp ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground"}`}>
                {tp === "put" ? "美式看跌" : "美式看涨"}
              </button>
            ))}
          </div>
          <Slider label="K (行权价)" value={K} min={70} max={130} step={1} onChange={setK} />
          <Slider label="σ" value={sigma} min={0.05} max={0.8} step={0.01} onChange={setSigma} />
          <Slider label="T (年)" value={T} min={0.25} max={3} step={0.25} onChange={setT} />
          <Slider label="可行权日数 (1 = 欧式)" value={nEx} min={1} max={25} step={1} onChange={setNEx} />
          <Slider label="路径数" value={paths} min={2000} max={20000} step={1000} onChange={setPaths} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="LSMC 价格" value={res.price.toFixed(4)} sub={`± ${(1.96 * res.stderr).toFixed(4)} (95%)`} />
          <Stat label="欧式 (Black-Scholes)" value={res.european.toFixed(4)} color={C.blue} />
          <Stat label="早行权溢价" value={res.earlyPremium.toFixed(4)} color={res.earlyPremium > 0 ? C.green : C.red} />
          <Stat label="有效路径 / 行权日" value={`${res.paths} / ${res.exerciseDates}`} color={C.teal} />
        </div>
      </div>

      <Panel title="行权边界：连续价值回归给出的最优停止阈值">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={res.boundary.filter((b) => b.S !== null)}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "时间 t (年)", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={K} stroke={C.red} strokeDasharray="4 3" label={{ value: "K", fontSize: 10, fill: C.red }} />
              <Line type="monotone" dataKey="S" name="行权边界 S*(t)" stroke={C.gold} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="百慕大 → 美式：价格随可行权日数单调上升">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ladder}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="dates" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="price" name="百慕大 LSMC" stroke={C.gold} strokeWidth={2} />
              <Line type="monotone" dataKey="european" name="欧式" stroke={C.blue} strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        美式价值 = 欧式价值 + 最优停止的期权价值。LSMC 用<strong>横截面回归</strong>估计「继续持有」的条件期望，
        只在实值路径上回归以降低噪声。注意两个实务要点：回归系数用的是<em>同一批</em>路径，因此存在向上偏误（前视偏差），
        严格做法是用第二批路径按已估边界重估；而无股息美式看涨的早行权溢价应当接近 0——这是检验实现正确性的标准回归测试。
      </Note>
    </div>
  );
};

/* ═════════ 3. 期货—远期与持有成本 ═════════ */
export const CarryFuturesTool = () => {
  const [r, setR] = useState(0.05);
  const [storage, setStorage] = useState(0.02);
  const [convenience, setConvenience] = useState(0.03);
  const [rho, setRho] = useState(0.4);
  const [sigmaR, setSigmaR] = useState(0.015);
  const [T, setT] = useState(2);

  const res = useMemo(() => futuresVsForward({
    S0: 100, r, storage, convenience, T, sigmaS: 0.3, sigmaR, rho,
  }), [r, storage, convenience, T, sigmaR, rho]);
  const shape = r + storage - convenience >= 0 ? "Contango (升水)" : "Backwardation (贴水)";

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "金融资产", description: "无仓储/便利", apply: () => { setStorage(0); setConvenience(0); setRho(0.2); } },
        { name: "原油贴水", description: "便利收益高", apply: () => { setConvenience(0.12); setStorage(0.03); } },
        { name: "强凸性调整", description: "ρ=0.8, σ_r=3%", apply: () => { setRho(0.8); setSigmaR(0.03); setT(5); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">持有成本分解</p>
          <Slider label="r (无风险利率)" value={r} min={0} max={0.12} step={0.005} onChange={setR} />
          <Slider label="u (仓储成本率)" value={storage} min={0} max={0.15} step={0.005} onChange={setStorage} />
          <Slider label="y (便利收益)" value={convenience} min={0} max={0.2} step={0.005} onChange={setConvenience} />
          <Slider label="ρ (标的—利率相关性)" value={rho} min={-1} max={1} step={0.05} onChange={setRho} />
          <Slider label="σ_r (短率波动)" value={sigmaR} min={0} max={0.05} step={0.002} onChange={setSigmaR} />
          <Slider label="T (年)" value={T} min={0.25} max={5} step={0.25} onChange={setT} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="远期价格 F(0,T)" value={res.forward.toFixed(3)} />
          <Stat label="期货价格" value={res.futures.toFixed(3)} color={C.blue} />
          <Stat label="凸性差异" value={res.convexity.toFixed(4)} color={C.red} sub="期货 − 远期" />
          <Stat label="曲线形态" value={shape} color={C.teal} />
        </div>
      </div>

      <Panel title="期限结构：远期曲线与期货曲线">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={res.curve.map((c) => ({ ...c, forward: +c.forward.toFixed(3), futures: +c.futures.toFixed(3) }))}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="T" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "到期 T (年)", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={100} stroke={C.red} strokeDasharray="3 3" label={{ value: "现货 S₀", fontSize: 10, fill: C.red }} />
              <Line type="monotone" dataKey="forward" name="远期 (OTC, 到期结算)" stroke={C.gold} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="futures" name="期货 (每日盯市)" stroke={C.blue} strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        F = S·e^{"{(r+u−y−q)T}"} 不是对未来现货的预测，而是<strong>现在就能锁定的可交易价格</strong>。
        便利收益 y 是唯一无法直接观测的项，实务上由市场报价反解：当前隐含便利收益 {(res.impliedConvenience * 100).toFixed(2)}%。
        期货与远期的差别来自盯市：保证金现金流与利率相关时，二者不再相等（这里凸性差 {res.convexity.toFixed(4)}），
        利率确定或 ρ=0 时差异消失。
      </Note>
    </div>
  );
};

/* ═════════ 4. SVI 曲面拟合与无套利检查 ═════════ */
const baseQuotes = (skew: number, curv: number, level: number, T: number) =>
  Array.from({ length: 15 }, (_, i) => {
    const k = -0.5 + i * (1 / 14);
    return { k: +k.toFixed(4), iv: Math.max(0.05, level + skew * k + curv * k * k) };
  });

export const SviSurfaceTool = () => {
  const [level, setLevel] = useState(0.22);
  const [skew, setSkew] = useState(-0.12);
  const [curv, setCurv] = useState(0.35);
  const [longLevel, setLongLevel] = useState(0.24);

  const T1 = 0.25, T2 = 1.0;
  const fitShort = useMemo(() => sviFit(baseQuotes(skew, curv, level, T1), T1), [skew, curv, level]);
  const fitLong = useMemo(() => sviFit(baseQuotes(skew * 0.6, curv * 0.8, longLevel, T2), T2), [skew, curv, longLevel]);
  const arb = useMemo(() => surfaceArbitrageCheck(fitShort.params, fitLong.params), [fitShort, fitLong]);
  const localVol = useMemo(() => dupireLocalVolFromSurface(fitShort.params, fitLong.params, T1, T2), [fitShort, fitLong]);

  const fitChart = useMemo(() => {
    const q = baseQuotes(skew, curv, level, T1);
    return q.map((x) => ({
      k: x.k, market: +x.iv.toFixed(4),
      svi: +Math.sqrt(Math.max(sviTotalVar(fitShort.params, x.k), 0) / T1).toFixed(4),
    }));
  }, [skew, curv, level, fitShort]);

  const p = (o: SVIParams) => `a=${o.a.toFixed(4)}, b=${o.b.toFixed(4)}, ρ=${o.rho.toFixed(3)}, m=${o.m.toFixed(3)}, σ=${o.sigma.toFixed(3)}`;

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "股指典型", description: "负偏 + 上凸", apply: () => { setSkew(-0.15); setCurv(0.4); setLevel(0.2); setLongLevel(0.22); } },
        { name: "日历套利", description: "长端方差更低", apply: () => { setLevel(0.3); setLongLevel(0.14); } },
        { name: "极端蝶式", description: "曲率过大", apply: () => { setCurv(1.6); setSkew(-0.05); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">市场报价 (合成微笑)</p>
          <Slider label="ATM 水平 (3M)" value={level} min={0.08} max={0.5} step={0.01} onChange={setLevel} />
          <Slider label="偏斜 ∂σ/∂k" value={skew} min={-0.5} max={0.3} step={0.01} onChange={setSkew} />
          <Slider label="曲率 (蝶式)" value={curv} min={0} max={2} step={0.05} onChange={setCurv} />
          <Slider label="ATM 水平 (1Y)" value={longLevel} min={0.08} max={0.5} step={0.01} onChange={setLongLevel} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="拟合 RMSE (总方差)" value={fitShort.rmse.toExponential(2)} />
          <Stat label="蝶式违约点数" value={String(arb.butterflyViolations)} color={arb.butterflyViolations ? C.red : C.green} />
          <Stat label="日历违约点数" value={String(arb.calendarViolations)} color={arb.calendarViolations ? C.red : C.green} />
          <Stat label="曲面状态" value={arb.arbitrageFree ? "无静态套利" : "存在套利"} color={arb.arbitrageFree ? C.green : C.red} />
        </div>
      </div>

      <Panel title="SVI 拟合 (3M 切片)">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fitChart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "log-moneyness k", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="market" name="市场 IV" stroke={C.gold} strokeWidth={0} dot={{ r: 3, fill: C.gold }} />
              <Line type="monotone" dataKey="svi" name="SVI 拟合" stroke={C.blue} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground mt-2">3M: {p(fitShort.params)}</p>
        <p className="text-[11px] font-mono text-muted-foreground">1Y: {p(fitLong.params)}</p>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="蝶式条件 g(k) ≥ 0 (风险中性密度非负)">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={arb.butterfly.map((x) => ({ k: x.k, g: +x.g.toFixed(4) }))}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="k" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={0} stroke={C.red} />
                <Area type="monotone" dataKey="g" stroke={C.teal} fill={C.teal} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Dupire 局部波动率 vs 隐含波动率">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={localVol.map((x) => ({ k: x.k, iv: +x.impliedVol.toFixed(4), lv: +x.localVol.toFixed(4) }))}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="k" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="iv" name="隐含波动率" stroke={C.gold} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lv" name="局部波动率" stroke={C.red} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        曲面工程有三道关：<strong>拟合</strong>（SVI 五参数刻画单个切片）、<strong>无套利</strong>
        （蝶式 g(k)≥0 保证密度非负，日历要求总方差 w(k,T) 对 T 单调不减）、<strong>反解</strong>
        （Dupire 把曲面翻译成唯一的局部波动率函数）。局部波动率能完美贴合今天的曲面，但它对未来微笑动态的预测通常过平，
        这正是随机波动率与跳跃模型存在的理由：同样的今天，不同的明天。
      </Note>
    </div>
  );
};

/* ═════════ 5. 短期利率 / HJM / LMM ═════════ */
export const ShortRateCurveTool = () => {
  const [r0, setR0] = useState(0.03);
  const [a, setA] = useState(0.2);
  const [b, setB] = useState(0.05);
  const [sigma, setSigma] = useState(0.015);

  const curve = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const T = (i + 1) / 2;
    return {
      T, vasicek: +(vasicekBond({ r0, a, b, sigma, T }).yield * 100).toFixed(3),
      cir: +(cirBond({ r0, a, b, sigma, T }).yield * 100).toFixed(3),
    };
  }), [r0, a, b, sigma]);

  const hjm = useMemo(() => hjmDriftCheck({ sigma, a, horizon: 15 }), [sigma, a]);
  const opt = useMemo(() => {
    const PT = vasicekBond({ r0, a, b, sigma, T: 1 }).P;
    const PS = vasicekBond({ r0, a, b, sigma, T: 5 }).P;
    return hullWhiteBondOption({ a, sigma, T: 1, S: 5, K: PS / PT, PT, PS });
  }, [r0, a, b, sigma]);
  const caplet = useMemo(() => lmmCapletBlack({ F: r0 + 0.005, K: r0, sigma: 0.3, T: 1, tau: 0.25, P: vasicekBond({ r0, a, b, sigma, T: 1.25 }).P }), [r0, a, b, sigma]);
  const feller = 2 * a * b > sigma * sigma;

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "正常曲线", description: "r0<b, 中等回复", apply: () => { setR0(0.02); setB(0.05); setA(0.2); } },
        { name: "倒挂曲线", description: "r0>b", apply: () => { setR0(0.07); setB(0.03); } },
        { name: "违反 Feller", description: "σ 过大, CIR 可触 0", apply: () => { setSigma(0.09); setA(0.1); setB(0.03); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">短期利率参数</p>
          <Slider label="r₀ (当前短率)" value={r0} min={0} max={0.1} step={0.002} onChange={setR0} />
          <Slider label="a (均值回复速度)" value={a} min={0.02} max={1} step={0.02} onChange={setA} />
          <Slider label="b (长期均值)" value={b} min={0} max={0.1} step={0.002} onChange={setB} />
          <Slider label="σ (短率波动)" value={sigma} min={0.002} max={0.1} step={0.002} onChange={setSigma} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="10Y Vasicek 收益率" value={`${curve[19].vasicek.toFixed(3)}%`} />
          <Stat label="10Y CIR 收益率" value={`${curve[19].cir.toFixed(3)}%`} color={C.blue} />
          <Stat label="Feller 条件 2ab>σ²" value={feller ? "满足" : "违反"} color={feller ? C.green : C.red} sub="CIR 是否严格为正" />
          <Stat label="HW 债券期权 (1Y→5Y ATM)" value={opt.price.toFixed(5)} color={C.teal} sub={`σ_P = ${opt.sigmaP.toFixed(4)}`} />
          <Stat label="Black-76 Caplet" value={caplet.caplet.toFixed(5)} color={C.gold} sub="LMM 的基本构件" />
          <Stat label="Vasicek 可为负" value={r0 - 3 * sigma < 0 ? "是" : "否" } color={C.text} sub="高斯模型的代价" />
        </div>
      </div>

      <Panel title="零息收益率曲线：Vasicek (高斯) vs CIR (平方根扩散)">
        <div className="h-[270px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="T" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "期限 (年)", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="vasicek" name="Vasicek" stroke={C.gold} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cir" name="CIR" stroke={C.blue} strokeWidth={2} strokeDasharray="4 3" dot={false} />
              <ReferenceLine y={b * 100} stroke={C.teal} strokeDasharray="2 2" label={{ value: "长期均值 b", fontSize: 10, fill: C.teal }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="HJM 无套利漂移条件 μ(t,T) = σ(t,T)∫σ(t,u)du">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hjm.map((x) => ({ tau: x.tau, vol: +(x.vol * 1e4).toFixed(3), drift: +(x.drift * 1e6).toFixed(3) }))}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="tau" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "剩余期限 τ = T−t", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="r" orientation="right" stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="l" type="monotone" dataKey="vol" name="远期利率波动 (bp)" stroke={C.gold} strokeWidth={2} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="drift" name="被迫的漂移 (×10⁻⁶)" stroke={C.red} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        利率世界的定价对象不是一个价格而是<strong>一整条曲线</strong>。短期利率模型用一个状态变量生成全曲线，
        代价是曲线形状受限；HJM 直接建模远期利率，并证明只要给定波动率结构，漂移就<em>被无套利唯一决定</em>；
        市场模型（LMM/SMM）再退一步，直接对可报价的 LIBOR/掉期利率建模，使 Black-76 公式在相应计价单位下严格成立。
        选择哪一层，取决于要定价的是曲线的水平、斜率，还是路径依赖的百慕大条款。
      </Note>
    </div>
  );
};

/* ═════════ 6. 信用曲线与 CDS ═════════ */
export const CreditCurveTool = () => {
  const [s1, setS1] = useState(0.008);
  const [s5, setS5] = useState(0.014);
  const [s10, setS10] = useState(0.017);
  const [recovery, setRecovery] = useState(0.4);
  const [r, setR] = useState(0.03);

  const boot = useMemo(() => hazardRateBootstrap({
    quotes: [{ tenor: 1, spread: s1 }, { tenor: 3, spread: (s1 + s5) / 2 }, { tenor: 5, spread: s5 }, { tenor: 7, spread: (s5 + s10) / 2 }, { tenor: 10, spread: s10 }],
    r, recovery,
  }), [s1, s5, s10, r, recovery]);

  const chart = boot.curve.map((c, i) => ({
    tenor: c.tenor,
    hazard: +(c.hazard * 1e4).toFixed(1),
    survival: +(c.survival * 100).toFixed(2),
    pd: +(c.impliedPD * 100).toFixed(2),
    triangle: +((boot.creditTriangle[i]?.approxHazard ?? 0) * 1e4).toFixed(1),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "投资级", description: "平坦低利差", apply: () => { setS1(0.004); setS5(0.008); setS10(0.011); setRecovery(0.4); } },
        { name: "高收益", description: "陡峭高利差", apply: () => { setS1(0.03); setS5(0.05); setS10(0.055); setRecovery(0.3); } },
        { name: "困境倒挂", description: "近端利差最高", apply: () => { setS1(0.09); setS5(0.06); setS10(0.05); setRecovery(0.2); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">CDS 市场报价</p>
          <Slider label="1Y 利差" value={s1} min={0.001} max={0.12} step={0.001} fmt={(v) => `${(v * 1e4).toFixed(0)} bp`} onChange={setS1} />
          <Slider label="5Y 利差" value={s5} min={0.001} max={0.12} step={0.001} fmt={(v) => `${(v * 1e4).toFixed(0)} bp`} onChange={setS5} />
          <Slider label="10Y 利差" value={s10} min={0.001} max={0.12} step={0.001} fmt={(v) => `${(v * 1e4).toFixed(0)} bp`} onChange={setS10} />
          <Slider label="回收率 R" value={recovery} min={0} max={0.8} step={0.05} onChange={setRecovery} />
          <Slider label="无风险利率 r" value={r} min={0} max={0.08} step={0.005} onChange={setR} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="1Y 危险率 λ₁" value={`${(boot.curve[0].hazard * 1e4).toFixed(0)} bp`} />
          <Stat label="10Y 累计违约概率" value={`${(boot.curve[4].impliedPD * 100).toFixed(2)}%`} color={C.red} />
          <Stat label="5Y 存活概率" value={`${(boot.curve[2].survival * 100).toFixed(2)}%`} color={C.green} />
          <Stat label="信用三角 s/(1−R)" value={`${(s5 / (1 - recovery) * 1e4).toFixed(0)} bp`} color={C.teal} sub="平坦曲线近似" />
        </div>
      </div>

      <Panel title="自举出的分段常数危险率与信用三角近似">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="tenor" stroke={C.text} tick={{ fontSize: 10 }} unit="Y" />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="bp" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="hazard" name="自举危险率 λ" fill={C.gold} />
              <Bar dataKey="triangle" name="s/(1−R) 近似" fill={C.blue} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="存活曲线与累计违约概率">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="tenor" stroke={C.text} tick={{ fontSize: 10 }} unit="Y" />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="survival" name="存活概率 Q(t)" stroke={C.green} fill={C.green} fillOpacity={0.15} />
              <Area type="monotone" dataKey="pd" name="累计违约概率" stroke={C.red} fill={C.red} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        约化式模型不解释「为什么违约」，而是把违约时间刻画成一个强度为 λ(t) 的首次跳跃时间，
        再由 CDS 的两条腿（保费腿 = s·RPV01，保护腿 = (1−R)·∫DF·dQ）在 <strong>par spread 处相等</strong>反解出整条危险率曲线。
        关键提醒：这里得到的是<em>风险中性</em>违约概率，包含违约风险溢价，通常显著高于历史违约率；
        且 λ 与 R 只能联合识别——回收率假设改变 40%，危险率几乎同比例改变。
      </Note>
    </div>
  );
};

/* ═════════ 7. 数值方法实验室 ═════════ */
export const NumericsLabTool = () => {
  const [paths, setPaths] = useState(4000);
  const [sigma, setSigma] = useState(0.2);
  const [xi, setXi] = useState(0.5);
  const [rho, setRho] = useState(-0.7);
  const [alpha, setAlpha] = useState(1.5);

  const vr = useMemo(() => mcVarianceReduction({ S: 100, K: 100, r: 0.03, sigma, T: 1, nPaths: paths }), [paths, sigma]);
  const fourier = useMemo(() => {
    const out: { K: number; call: number; iv: number }[] = [];
    for (let K = 70; K <= 130; K += 5) {
      const p = carrMadanFFT({ S: 100, K, r: 0.03, T: 1, v0: sigma * sigma, theta: sigma * sigma, kappa: 2, xi, rho, alpha });
      let lo = 0.01, hi = 3;
      for (let it = 0; it < 50; it++) {
        const mid = (lo + hi) / 2;
        const bsc = 100 * Math.exp(0) - 0; // placeholder, replaced below
        void bsc;
        const d1 = (Math.log(100 / K) + (0.03 + 0.5 * mid * mid)) / mid;
        const d2 = d1 - mid;
        const cdf = (x: number) => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp((-2 / Math.PI) * x * x)));
        const c = 100 * cdf(d1) - K * Math.exp(-0.03) * cdf(d2);
        if (c < p.call) lo = mid; else hi = mid;
      }
      out.push({ K, call: +p.call.toFixed(4), iv: +(((lo + hi) / 2) * 100).toFixed(2) });
    }
    return out;
  }, [sigma, xi, rho, alpha]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "低效基准", description: "1000 条路径", apply: () => setPaths(1000) },
        { name: "高精度", description: "20000 条路径", apply: () => setPaths(20000) },
        { name: "强杠杆效应", description: "ρ=-0.9, ξ=0.8", apply: () => { setRho(-0.9); setXi(0.8); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">蒙特卡洛与傅里叶参数</p>
          <Slider label="路径数" value={paths} min={500} max={20000} step={500} onChange={setPaths} />
          <Slider label="σ (√v₀ = √θ)" value={sigma} min={0.05} max={0.6} step={0.01} onChange={setSigma} />
          <Slider label="ξ (波动率的波动率)" value={xi} min={0.05} max={1.2} step={0.05} onChange={setXi} />
          <Slider label="ρ (杠杆相关性)" value={rho} min={-0.95} max={0.5} step={0.05} onChange={setRho} />
          <Slider label="α (Carr-Madan 阻尼)" value={alpha} min={0.4} max={3} step={0.1} onChange={setAlpha} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          {vr.results.map((r) => (
            <Stat key={r.method} label={r.method} value={r.price.toFixed(4)}
              color={r.efficiency > 3 ? C.green : r.efficiency > 1.2 ? C.teal : C.gold}
              sub={`SE ${r.stderr.toFixed(4)} · 效率 ×${r.efficiency.toFixed(1)}`} />
          ))}
        </div>
      </div>

      <Panel title={`收敛速度：|估计值 − 解析解| (解析解 = ${vr.exact.toFixed(4)})`}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vr.convergence.map((c) => ({ ...c, plain: +c.plain.toFixed(5), anti: +c.anti.toFixed(5), cv: +c.cv.toFixed(5), qmc: +c.qmc.toFixed(5) }))}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="n" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "路径数", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="plain" name="朴素 MC" stroke={C.text} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="anti" name="对偶变量" stroke={C.blue} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cv" name="控制变量" stroke={C.green} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="qmc" name="拟蒙特卡洛" stroke={C.gold} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Carr–Madan 傅里叶定价：Heston 微笑 (一次积分给出全条链)">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fourier}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="K" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="r" orientation="right" stroke={C.text} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="l" type="monotone" dataKey="call" name="看涨价格" stroke={C.blue} strokeWidth={2} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="iv" name="隐含波动率 (近似)" stroke={C.gold} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        数值方法的选择由<strong>维度与合约结构</strong>决定：低维欧式且有特征函数时，傅里叶方法几毫秒给出整条链，是校准的主力；
        低维且带早行权用 PDE；高维或强路径依赖只能靠蒙特卡洛，此时收敛速度 O(N^(−1/2)) 必须靠方差缩减和低差异序列来补。
        本页显示控制变量的效率提升为 ×{vr.results[2].efficiency.toFixed(1)}——同样精度下所需路径数可降到 1/{vr.results[2].efficiency.toFixed(1)}。
      </Note>
    </div>
  );
};

/* ═════════ 8. 粗糙波动率与最优对冲 ═════════ */
export const RoughVolHedgeTool = () => {
  const [H, setH] = useState(0.1);
  const [eta, setEta] = useState(1.5);
  const [rho, setRho] = useState(-0.8);
  const [lambda, setLambda] = useState(1);
  const [gamma, setGamma] = useState(1);

  const smile = useMemo(() => rBergomiSmile({
    S0: 100, xi: 0.04, eta, H, rho, T: 0.25, steps: 24, nPaths: 3000, seed: 9,
  }), [H, eta, rho]);
  const skewTs = useMemo(() => roughSkewTermStructure(H, eta, [1 / 52, 1 / 26, 1 / 12, 0.25, 0.5, 1, 2]), [H, eta]);
  const hedge = useMemo(() => meanVarianceHedge({
    S0: 100, K: 100, r: 0.02, sigma: 0.2, T: 0.5, lambda, muJ: -0.1, sigmaJ: 0.2, gamma, nPaths: 6000,
  }), [lambda, gamma]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "典型粗糙", description: "H=0.1", apply: () => { setH(0.1); setEta(1.5); setRho(-0.8); } },
        { name: "退化到扩散", description: "H=0.5", apply: () => setH(0.5) },
        { name: "跳跃主导", description: "λ=4, γ=4", apply: () => { setLambda(4); setGamma(4); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">rBergomi 与不完全市场</p>
          <Slider label="H (Hurst 指数)" value={H} min={0.03} max={0.5} step={0.01} onChange={setH} />
          <Slider label="η (波动率的波动)" value={eta} min={0.2} max={3} step={0.1} onChange={setEta} />
          <Slider label="ρ (杠杆相关性)" value={rho} min={-0.95} max={0.5} step={0.05} onChange={setRho} />
          <Slider label="λ (跳跃强度, 对冲实验)" value={lambda} min={0} max={6} step={0.25} onChange={setLambda} />
          <Slider label="γ (风险厌恶, 无差别定价)" value={gamma} min={0.05} max={8} step={0.05} onChange={setGamma} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="ATM 偏斜 ∂σ/∂k" value={smile.atmSkew.toFixed(3)} color={C.gold} sub={`H = ${H.toFixed(2)}`} />
          <Stat label="平均实现波动率" value={`${(smile.avgRealizedVol * 100).toFixed(1)}%`} color={C.blue} />
          <Stat label="均方最优对冲比 θ*" value={hedge.hedgeRatio.toFixed(4)} color={C.teal} />
          <Stat label="残余风险 σ(误差)" value={hedge.residualStd.toFixed(4)} color={C.red} sub="完备市场应为 0" />
          <Stat label="均方对冲价格" value={hedge.meanVariancePrice.toFixed(4)} />
          <Stat label="效用无差别价格" value={hedge.indifferencePrice.toFixed(4)} color={C.gold} sub={`风险溢价 +${hedge.riskPremium.toFixed(4)}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="rBergomi 微笑 (3M)">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={smile.smile.map((s) => ({ k: s.logMoneyness, iv: +(s.iv * 100).toFixed(2) }))}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="k" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "log-moneyness", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="iv" name="隐含波动率" stroke={C.gold} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="ATM 偏斜期限结构：T^(H−1/2) 幂律 vs 扩散模型">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={skewTs.map((s) => ({ T: +s.T.toFixed(3), rough: +s.rough.toFixed(3), diffusive: +s.diffusive.toFixed(3) }))}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="T" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="rough" name="粗糙波动率" stroke={C.red} strokeWidth={2} />
                <Line type="monotone" dataKey="diffusive" name="经典扩散" stroke={C.blue} strokeWidth={2} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="跳跃市场中的对冲误差：Δ 对冲无法清零">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="dS" name="ΔS (贴现)" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis type="number" dataKey="hedged" name="对冲后损益" stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              <ReferenceLine y={hedge.meanVariancePrice} stroke={C.gold} strokeDasharray="4 3" />
              <Scatter data={hedge.scatter} fill={C.teal} fillOpacity={0.55} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="风险厌恶与无差别价格：γ→0 收敛到均方对冲价格">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hedge.utilityCurve.map((u) => ({ gamma: u.gamma, price: +u.price.toFixed(4) }))}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="gamma" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "风险厌恶 γ", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={hedge.meanVariancePrice} stroke={C.blue} strokeDasharray="4 3" label={{ value: "均方对冲价", fontSize: 10, fill: C.blue }} />
              <Line type="monotone" dataKey="price" name="无差别卖价" stroke={C.gold} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        前沿的共同主题是<strong>承认不完美</strong>：波动率路径比布朗运动更粗糙（H≈0.1），使短期偏斜按 T^(H−1/2) 爆炸，
        经典扩散模型无论怎么校准都拟合不了；而一旦存在跳跃、离散再平衡或交易成本，市场就不完全，
        「唯一无套利价格」退化为一个区间 [{hedge.subPrice.toFixed(2)}, {hedge.superPrice.toFixed(2)}]。
        实务解法不是找到那个不存在的完美复制，而是选定一个准则——最小化对冲误差方差，或用效用无差别定价把残余风险明码标价。
      </Note>
    </div>
  );
};
