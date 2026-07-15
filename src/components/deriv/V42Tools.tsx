import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, ReferenceLine, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import {
  mertonJumpPrice, kouJumpPrice, batesMCPrice, varianceSwapFairStrike,
  crankNicolsonBS, hedgePnLSimulate, autocallablePrice, xvaCompute,
} from "@/lib/quant/derivAdvanced";
import { blackScholes } from "@/lib/quant/blackScholes";

/* ═════════════════════════════════════════════════════════════
   1. Merton & Kou Jump-Diffusion
   ═════════════════════════════════════════════════════════════ */
export const JumpDiffusionTool = () => {
  const [lambda, setLambda] = useState(1.0);
  const [muJ, setMuJ] = useState(-0.05);
  const [sigmaJ, setSigmaJ] = useState(0.15);
  const [sigma, setSigma] = useState(0.2);
  const [T, setT] = useState(0.5);

  const smile = useMemo(() => {
    const out: { K: number; bs: number; merton: number; kou: number }[] = [];
    for (let k = 70; k <= 130; k += 2) {
      const bs = blackScholes({ S: 100, K: k, T, r: 0.03, sigma }).call;
      const m = mertonJumpPrice({ S: 100, K: k, T, r: 0.03, sigma, lambda, muJ, sigmaJ });
      const ko = kouJumpPrice({
        S: 100, K: k, T, r: 0.03, sigma,
        lambda, p: 0.4, etaUp: 10, etaDown: 5, nPaths: 4000, seed: 21,
      });
      out.push({ K: k, bs: +bs.toFixed(3), merton: +m.toFixed(3), kou: +ko.toFixed(3) });
    }
    return out;
  }, [lambda, muJ, sigmaJ, sigma, T]);

  const atm = smile[Math.floor(smile.length / 2)];

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "崩盘保护", description: "λ=2, muJ=-0.1", apply: () => { setLambda(2); setMuJ(-0.1); setSigmaJ(0.2); } },
        { name: "对称跳跃", description: "muJ=0", apply: () => { setLambda(1); setMuJ(0); setSigmaJ(0.15); } },
        { name: "无跳跃", description: "退化到 BS", apply: () => setLambda(0) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">扩散 + 跳跃参数</p>
          <Slider label="σ (扩散波动率)" value={sigma} min={0.05} max={0.5} step={0.01} onChange={setSigma} />
          <Slider label="λ (跳跃强度, /年)" value={lambda} min={0} max={5} step={0.1} onChange={setLambda} />
          <Slider label="μ_J (跳跃均值, Merton log)" value={muJ} min={-0.3} max={0.2} step={0.01} onChange={setMuJ} />
          <Slider label="σ_J (跳跃标准差)" value={sigmaJ} min={0.01} max={0.4} step={0.01} onChange={setSigmaJ} />
          <Slider label="T (期限, 年)" value={T} min={0.05} max={2} step={0.05} onChange={setT} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="BS (ATM Call)" value={atm.bs.toFixed(3)} />
          <Stat label="Merton (级数)" value={atm.merton.toFixed(3)} color={C.blue} />
          <Stat label="Kou (MC)" value={atm.kou.toFixed(3)} color={C.teal} />
          <Stat label="跳跃溢价" value={(atm.merton - atm.bs).toFixed(3)} color={C.red} sub="Merton − BS" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">跳跃扩散 vs Black-Scholes: 看涨期权价格</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smile}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="K" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "行权价 K", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="bs" name="Black-Scholes" stroke={C.gold} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="merton" name="Merton (对数正态跳)" stroke={C.blue} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="kou" name="Kou (双指数跳)" stroke={C.teal} strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border">
        <span className="text-gold">要点：</span>加入跳跃后，OTM 期权与短期限期权价格显著抬升——这解释了 BS 无法生成的经验波动率微笑与偏度。Merton 假设对数正态跳跃，Kou 用双指数分布，右尾更薄、左尾更厚，更贴近股票崩盘经验。
      </p>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   2. Bates + Variance Swap
   ═════════════════════════════════════════════════════════════ */
export const BatesVarSwapTool = () => {
  const [v0, setV0] = useState(0.04);
  const [kappa, setKappa] = useState(2);
  const [theta, setTheta] = useState(0.04);
  const [xi, setXi] = useState(0.4);
  const [rho, setRho] = useState(-0.6);
  const [lambda, setLambda] = useState(0.5);
  const [T, setT] = useState(1);

  const res = useMemo(() => {
    const bates = batesMCPrice({
      S: 100, K: 100, T, r: 0.03, v0, kappa, theta, xi, rho,
      lambda, muJ: -0.1, sigmaJ: 0.2, nPaths: 4000, nSteps: 100,
    });
    // build a fake smile: sqrt(v0) * K-dependent skew via linear in log-moneyness
    const strikes: number[] = [], ivs: number[] = [];
    for (let K = 50; K <= 160; K += 5) {
      const k = Math.log(K / 100);
      const iv = Math.sqrt(v0) * (1 - 0.5 * rho * k) + 0.05 * Math.sqrt(lambda);
      strikes.push(K); ivs.push(Math.max(0.05, iv));
    }
    const K_var = varianceSwapFairStrike({ S0: 100, T, r: 0.03, strikes, ivs });
    const VIX = 100 * Math.sqrt(Math.max(K_var, 0));
    const RV = 100 * Math.sqrt(bates.realizedVar);
    return { ...bates, K_var, VIX, RV, strikes, ivs };
  }, [v0, kappa, theta, xi, rho, lambda, T]);

  const smileData = res.strikes.map((K, i) => ({ K, iv: +(res.ivs[i] * 100).toFixed(2) }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "低波+跳跃", description: "崩盘保护", apply: () => { setV0(0.03); setKappa(3); setTheta(0.04); setXi(0.3); setRho(-0.7); setLambda(1); } },
        { name: "高波", description: "危机", apply: () => { setV0(0.09); setKappa(1); setTheta(0.09); setXi(0.5); setRho(-0.5); setLambda(2); } },
        { name: "无跳跃 (纯 Heston)", description: "λ=0", apply: () => setLambda(0) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Bates 参数</p>
          <Slider label="v₀ (瞬时方差)" value={v0} min={0.01} max={0.15} step={0.005} onChange={setV0} />
          <Slider label="κ (方差均值回复)" value={kappa} min={0.1} max={5} step={0.1} onChange={setKappa} />
          <Slider label="θ (长期方差)" value={theta} min={0.01} max={0.15} step={0.005} onChange={setTheta} />
          <Slider label="ξ (波动率的波动率)" value={xi} min={0.05} max={1} step={0.05} onChange={setXi} />
          <Slider label="ρ (S-v 相关)" value={rho} min={-0.95} max={0.5} step={0.05} onChange={setRho} />
          <Slider label="λ (跳跃强度)" value={lambda} min={0} max={3} step={0.1} onChange={setLambda} />
          <Slider label="T (年)" value={T} min={0.25} max={3} step={0.25} onChange={setT} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="ATM Call (Bates MC)" value={res.price.toFixed(3)} />
          <Stat label="Var Swap 公允方差" value={res.K_var.toFixed(4)} color={C.blue} />
          <Stat label="隐含 VIX (%)" value={res.VIX.toFixed(2)} color={C.gold} sub="模型自由复制" />
          <Stat label="Realized Vol (%)" value={res.RV.toFixed(2)} color={C.teal} sub="路径二阶变差" />
          <Stat label="方差风险溢价 (bp)" value={((res.K_var - res.realizedVar) * 10000).toFixed(1)} color={C.red} sub="K_var − RV²" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">静态复制的隐含波动率微笑</h4>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smileData}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="K" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="iv" name="IV (%)" stroke={C.gold} strokeWidth={2.5} dot={false} />
              <ReferenceLine x={100} stroke={C.text} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   3. Crank-Nicolson PDE
   ═════════════════════════════════════════════════════════════ */
export const PdeTool = () => {
  const [K, setK] = useState(100);
  const [sigma, setSigma] = useState(0.25);
  const [T, setT] = useState(1);
  const [american, setAmerican] = useState(true);
  const [isCall, setIsCall] = useState(false);
  const [barrier, setBarrier] = useState(0);

  const res = useMemo(() => {
    const bar = barrier > 0 ? { level: barrier, type: "down-out" as const } : undefined;
    const pde = crankNicolsonBS({
      S: 100, K, T, r: 0.05, sigma, isCall, american, NS: 200, NT: 200, barrier: bar,
    });
    const bs = blackScholes({ S: 100, K, T, r: 0.05, sigma });
    return { pde, bs: isCall ? bs.call : bs.put };
  }, [K, sigma, T, american, isCall, barrier]);

  const chart = res.pde.grid
    .map((s, i) => ({ S: s, V: +res.pde.values[i].toFixed(3), payoff: isCall ? Math.max(s - K, 0) : Math.max(K - s, 0) }))
    .filter((_, i) => i % 3 === 0 && res.pde.grid[i * 3 - res.pde.grid.length + res.pde.grid.length] <= 250);
  const chartTrim = chart.filter((d) => d.S <= 250);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "美式看跌", description: "早行权溢价", apply: () => { setAmerican(true); setIsCall(false); setBarrier(0); } },
        { name: "欧式看涨", description: "对齐 BS", apply: () => { setAmerican(false); setIsCall(true); setBarrier(0); } },
        { name: "Down-and-Out 障碍", description: "K=100, B=80", apply: () => { setBarrier(80); setIsCall(true); setAmerican(false); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">PDE 参数 (S₀=100, r=5%)</p>
          <Slider label="K (行权价)" value={K} min={60} max={140} step={1} onChange={setK} />
          <Slider label="σ" value={sigma} min={0.05} max={0.6} step={0.01} onChange={setSigma} />
          <Slider label="T" value={T} min={0.1} max={3} step={0.05} onChange={setT} />
          <Slider label="下障碍 B (0 = 关闭)" value={barrier} min={0} max={95} step={5} onChange={setBarrier} />
          <div className="flex gap-2 pt-2 text-xs">
            <button onClick={() => setIsCall(!isCall)} className="px-3 py-1.5 rounded-md border border-border bg-secondary/50 hover:border-gold/40">
              {isCall ? "看涨 Call" : "看跌 Put"}
            </button>
            <button onClick={() => setAmerican(!american)} className="px-3 py-1.5 rounded-md border border-border bg-secondary/50 hover:border-gold/40">
              {american ? "美式 American (PSOR)" : "欧式 European"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="Crank-Nicolson 价格" value={res.pde.price.toFixed(4)} />
          <Stat label="Black-Scholes 参考" value={res.bs.toFixed(4)} color={C.blue} />
          <Stat label="早行权/障碍溢价" value={(res.pde.price - res.bs).toFixed(4)} color={C.gold} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">价值函数 V(S, 0) — 相对回报</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartTrim}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="S" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="V" name="V(S,0)" stroke={C.gold} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="payoff" name="到期回报" stroke={C.teal} strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
              {barrier > 0 && <ReferenceLine x={barrier} stroke={C.red} strokeDasharray="3 3" label={{ value: "障碍 B", fill: C.red, fontSize: 10 }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   4. Delta-Hedge P&L Attribution
   ═════════════════════════════════════════════════════════════ */
export const HedgePnLTool = () => {
  const [sigmaPricing, setSigmaPricing] = useState(0.2);
  const [sigmaReal, setSigmaReal] = useState(0.28);
  const [nSteps, setNSteps] = useState(50);
  const [cost, setCost] = useState(0.001);

  const res = useMemo(() =>
    hedgePnLSimulate({
      S: 100, K: 100, T: 0.5, r: 0.02, sigmaPricing, sigmaReal,
      nSteps, nPaths: 1500, cost, seed: 42, isCall: true,
    }),
  [sigmaPricing, sigmaReal, nSteps, cost]);

  const attrData = [
    { name: "Γ·Θ 平衡", value: +res.attribution.gammaTheta.toFixed(4) },
    { name: "Vega × Δσ", value: +res.attribution.vega.toFixed(4) },
    { name: "离散误差", value: +res.attribution.discreteError.toFixed(4) },
    { name: "交易成本", value: +res.attribution.transactionCost.toFixed(4) },
  ];

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "被卖出 σ", description: "σ_real > σ_price → 亏", apply: () => { setSigmaPricing(0.2); setSigmaReal(0.35); } },
        { name: "买对 σ", description: "σ_real < σ_price → 赚", apply: () => { setSigmaPricing(0.3); setSigmaReal(0.18); } },
        { name: "高频对冲", description: "steps=200", apply: () => setNSteps(200) },
        { name: "日度对冲", description: "steps=25", apply: () => setNSteps(25) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">对冲设定 (卖出 ATM Call, T=0.5)</p>
          <Slider label="σ_定价 (卖出时的隐波)" value={sigmaPricing} min={0.05} max={0.5} step={0.01} onChange={setSigmaPricing} />
          <Slider label="σ_真实 (标的实际波动率)" value={sigmaReal} min={0.05} max={0.6} step={0.01} onChange={setSigmaReal} />
          <Slider label="对冲频率 (每年步数)" value={nSteps} min={5} max={250} step={5} onChange={setNSteps} />
          <Slider label="单边交易成本" value={cost} min={0} max={0.005} step={0.0005} fmt={(v) => (v * 10000).toFixed(1) + " bp"} onChange={setCost} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="P&L 均值" value={res.meanPnL.toFixed(3)} color={res.meanPnL >= 0 ? C.green : C.red} />
          <Stat label="P&L 标准差" value={res.stdPnL.toFixed(3)} color={C.blue} />
          <Stat label="Vega 主导" value={res.attribution.vega.toFixed(3)} color={C.gold} sub="≈ Vega·Δσ" />
          <Stat label="平均成本" value={res.attribution.transactionCost.toFixed(3)} color={C.red} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">P&L 分布</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={res.hist}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="bucket" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={C.gold} />
                <ReferenceLine x={0} stroke={C.red} strokeDasharray="3 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">归因瀑布</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attrData}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value">
                  {attrData.map((d, i) => (
                    <Cell key={i} fill={d.value >= 0 ? C.green : C.red} />
                  ))}
                </Bar>
                <ReferenceLine y={0} stroke={C.text} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   5. Autocallable
   ═════════════════════════════════════════════════════════════ */
export const AutocallableTool = () => {
  const [autocall, setAutocall] = useState(1.0);
  const [ki, setKi] = useState(0.65);
  const [coupon, setCoupon] = useState(0.03);
  const [obs, setObs] = useState(6);
  const [T, setT] = useState(3);
  const [sigma, setSigma] = useState(0.25);

  const res = useMemo(() =>
    autocallablePrice({
      S0: 100, T, r: 0.03, sigma, observations: obs,
      autocallBarrier: autocall, kiBarrier: ki, couponPerObs: coupon,
      notional: 100, nPaths: 6000, seed: 17,
    }),
  [autocall, ki, coupon, obs, T, sigma]);

  const callChart = res.callProb.map((p, i) => ({ obs: `Obs ${i + 1}`, prob: +(p * 100).toFixed(2) }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "标准 Phoenix", description: "AC=1.0, KI=0.65", apply: () => { setAutocall(1.0); setKi(0.65); setCoupon(0.03); setObs(6); } },
        { name: "激进高票息", description: "coupon 5%", apply: () => { setCoupon(0.05); setKi(0.5); } },
        { name: "深度保护", description: "KI=0.5", apply: () => setKi(0.5) },
        { name: "高频观察", description: "12 次", apply: () => setObs(12) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">结构化票据条款</p>
          <Slider label="自动赎回障碍 (×S₀)" value={autocall} min={0.8} max={1.3} step={0.01} onChange={setAutocall} />
          <Slider label="敲入障碍 KI (×S₀)" value={ki} min={0.3} max={0.9} step={0.01} onChange={setKi} />
          <Slider label="每期票息" value={coupon} min={0.005} max={0.08} step={0.005} fmt={(v) => (v * 100).toFixed(2) + "%"} onChange={setCoupon} />
          <Slider label="观察次数" value={obs} min={2} max={24} step={1} fmt={(v) => v.toFixed(0)} onChange={setObs} />
          <Slider label="期限 T (年)" value={T} min={0.5} max={5} step={0.5} onChange={setT} />
          <Slider label="标的 σ" value={sigma} min={0.1} max={0.5} step={0.01} onChange={setSigma} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="票据公允价格" value={res.price.toFixed(2)} sub="面值 100" />
          <Stat label="期望存续期 (年)" value={res.expectedLife.toFixed(2)} color={C.blue} />
          <Stat label="敲入命中概率" value={(res.kiHitProb * 100).toFixed(1) + "%"} color={C.red} />
          <Stat label="总赎回概率" value={(res.callProb.reduce((s, x) => s + x, 0) * 100).toFixed(1) + "%"} color={C.green} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">每次观察日的自动赎回概率</h4>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={callChart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="obs" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="prob" name="赎回概率 %" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   6. XVA
   ═════════════════════════════════════════════════════════════ */
export const XvaTool = () => {
  const [cpty, setCpty] = useState(0.02);
  const [own, setOwn] = useState(0.01);
  const [rec, setRec] = useState(0.4);
  const [fund, setFund] = useState(0.005);
  const [sigmaR, setSigmaR] = useState(0.008);
  const [T, setT] = useState(5);

  const res = useMemo(() =>
    xvaCompute({
      notional: 1_000_000, T, steps: 40, r: 0.03, sigma: sigmaR,
      fixedRate: 0.03, floatRate0: 0.03,
      cptyHazard: cpty, ownHazard: own, recovery: rec, fundingSpread: fund,
      nPaths: 1500, seed: 33,
    }),
  [cpty, own, rec, fund, sigmaR, T]);

  const expChart = res.times.map((t, i) => ({
    t: +t.toFixed(2),
    EE: +res.ee[i].toFixed(0),
    NE: +res.ne[i].toFixed(0),
    PFE95: +res.pfe95[i].toFixed(0),
  }));
  const xvaChart = [
    { name: "CVA", value: +res.cva.toFixed(0) },
    { name: "DVA", value: +res.dva.toFixed(0) },
    { name: "FVA", value: +res.fva.toFixed(0) },
    { name: "净 XVA", value: +(res.cva - res.dva + res.fva).toFixed(0) },
  ];

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "投资级对手", description: "λ_C=1%", apply: () => setCpty(0.01) },
        { name: "高收益对手", description: "λ_C=5%", apply: () => setCpty(0.05) },
        { name: "自己信用差", description: "λ_B=3%", apply: () => setOwn(0.03) },
        { name: "高融资利差", description: "s_F=1%", apply: () => setFund(0.01) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">对手 & 融资信用 (Notional=1M)</p>
          <Slider label="对手违约强度 λ_C" value={cpty} min={0.001} max={0.1} step={0.001} fmt={(v) => (v * 100).toFixed(2) + "%"} onChange={setCpty} />
          <Slider label="自身违约强度 λ_B" value={own} min={0.001} max={0.1} step={0.001} fmt={(v) => (v * 100).toFixed(2) + "%"} onChange={setOwn} />
          <Slider label="回收率 R" value={rec} min={0} max={0.9} step={0.05} onChange={setRec} />
          <Slider label="融资利差 s_F" value={fund} min={0} max={0.02} step={0.001} fmt={(v) => (v * 10000).toFixed(0) + " bp"} onChange={setFund} />
          <Slider label="利率波动率 σ_r" value={sigmaR} min={0.001} max={0.02} step={0.001} onChange={setSigmaR} />
          <Slider label="到期 T (年)" value={T} min={1} max={10} step={1} onChange={setT} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="CVA" value={res.cva.toFixed(0)} color={C.red} />
          <Stat label="DVA" value={res.dva.toFixed(0)} color={C.green} />
          <Stat label="FVA" value={res.fva.toFixed(0)} color={C.gold} />
          <Stat label="净 XVA" value={(res.cva - res.dva + res.fva).toFixed(0)} color={C.blue} sub="CVA − DVA + FVA" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">暴露曲线：EE / NE / PFE 95%</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expChart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="EE" name="EE" stroke={C.red} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="NE" name="NE" stroke={C.green} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="PFE95" name="PFE 95%" stroke={C.gold} strokeWidth={2} strokeDasharray="4 3" dot={false} />
                <ReferenceLine y={0} stroke={C.text} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">XVA 分解</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={xvaChart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value">
                  {xvaChart.map((d, i) => (
                    <Cell key={i} fill={d.value >= 0 ? C.red : C.green} />
                  ))}
                </Bar>
                <ReferenceLine y={0} stroke={C.text} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
