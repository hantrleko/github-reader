import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, makeRng, tooltipStyle } from "../frontier/ui";

function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const CANDIDATE_K = [3, 5, 10, 15, 20, 30, 40, 60];

function sharpe(rets: number[]) {
  if (rets.length < 2) return 0;
  const m = rets.reduce((s, v) => s + v, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((s, v) => s + (v - m) ** 2, 0) / (rets.length - 1));
  return sd === 0 ? 0 : (m / sd) * Math.sqrt(252);
}

/** Momentum strategy: position = sign of trailing-k return; returns strat r_t. */
function stratReturns(rets: number[], k: number, cost: number) {
  const out: number[] = [];
  let prevPos = 0;
  for (let t = 0; t < rets.length; t++) {
    if (t < k) { out.push(0); continue; }
    let trailing = 0;
    for (let j = t - k; j < t; j++) trailing += rets[j];
    const pos = trailing > 0 ? 1 : -1;
    out.push(pos * rets[t] - Math.abs(pos - prevPos) * cost);
    prevPos = pos;
  }
  return out;
}

export const WalkForwardTool = () => {
  const [phi, setPhi] = useState(0.08); // momentum autocorrelation strength
  const [noise, setNoise] = useState(1.0);
  const [isWin, setIsWin] = useState(250);
  const [oosWin, setOosWin] = useState(60);
  const [cost, setCost] = useState(0.0005);
  const [seed, setSeed] = useState(5);

  const res = useMemo(() => {
    const rng = makeRng(seed);
    const n = 1500;
    // AR(1)-driven daily returns: r_t = phi·r_{t-1} + noise·ε  (scaled to ~1% daily)
    const rets: number[] = [];
    let prev = 0;
    for (let t = 0; t < n; t++) {
      const r = phi * prev + noise * randn(rng) * 0.01;
      rets.push(r);
      prev = r;
    }

    // 1) In-sample overfit: pick single k maximizing FULL-sample Sharpe
    let bestK = CANDIDATE_K[0], bestS = -Infinity;
    for (const k of CANDIDATE_K) {
      const s = sharpe(stratReturns(rets, k, cost));
      if (s > bestS) { bestS = s; bestK = k; }
    }
    const isSharpe = bestS;

    // 2) Walk-forward: roll [IS train -> OOS test]
    const oosRets: number[] = [];
    const folds: { fold: number; k: number; isS: number; oosS: number }[] = [];
    let start = 0;
    let f = 0;
    while (start + isWin + oosWin <= n) {
      const train = rets.slice(start, start + isWin);
      let kStar = CANDIDATE_K[0], sStar = -Infinity;
      for (const k of CANDIDATE_K) {
        const s = sharpe(stratReturns(train, k, cost));
        if (s > sStar) { sStar = s; kStar = k; }
      }
      // apply kStar on the OOS window (need k history -> include lead-in)
      const lead = Math.max(...CANDIDATE_K);
      const testSlice = rets.slice(start + isWin - lead, start + isWin + oosWin);
      const testStrat = stratReturns(testSlice, kStar, cost).slice(lead);
      const oosS = sharpe(testStrat);
      folds.push({ fold: ++f, k: kStar, isS: +sStar.toFixed(2), oosS: +oosS.toFixed(2) });
      oosRets.push(...testStrat);
      start += oosWin;
    }
    const wfSharpe = sharpe(oosRets);

    // equity curves
    let eqWf = 1, eqBh = 1;
    const bhSlice = rets.slice(isWin, isWin + oosRets.length);
    const equity = oosRets.map((r, i) => {
      eqWf *= 1 + r;
      eqBh *= 1 + (bhSlice[i] ?? 0);
      return { t: i, wf: +eqWf.toFixed(4), bh: +eqBh.toFixed(4) };
    });

    const overfitGap = isSharpe - wfSharpe;

    return { bestK, isSharpe, wfSharpe, folds, equity, overfitGap };
  }, [phi, noise, isWin, oosWin, cost, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "真实动量", description: "φ=0.08 适中", apply: () => { setPhi(0.08); setNoise(1); setIsWin(250); setOosWin(60); } },
        { name: "强信号", description: "φ=0.18", apply: () => { setPhi(0.18); setNoise(0.8); } },
        { name: "纯噪声 (无 alpha)", description: "φ=0 → OOS 崩塌", apply: () => { setPhi(0); setNoise(1.2); } },
        { name: "短训练窗", description: "IS=120 易过拟合", apply: () => { setIsWin(120); setOosWin(40); } },
        { name: "高交易成本", description: "cost=20bp", apply: () => { setCost(0.002); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">数据生成与窗口</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="φ 动量强度" sub="AR(1)" value={phi} min={0} max={0.25} step={0.01} onChange={setPhi} />
            <Slider label="噪声" value={noise} min={0.5} max={2} step={0.1} onChange={setNoise} />
            <Slider label="IS 训练窗" value={isWin} min={80} max={400} step={10} onChange={setIsWin} />
            <Slider label="OOS 测试窗" value={oosWin} min={20} max={120} step={10} onChange={setOosWin} />
            <Slider label="交易成本" sub="单边" value={cost} min={0} max={0.003} step={0.0001} fmt={(v) => (v * 10000).toFixed(0) + "bp"} onChange={setCost} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="全样本最优 Sharpe" value={res.isSharpe.toFixed(2)} color={C.gold} sub={`k*=${res.bestK} (过拟合)`} />
          <Stat label="Walk-forward OOS Sharpe" value={res.wfSharpe.toFixed(2)} color={res.wfSharpe > 0.5 ? C.green : C.red} sub="样本外真实表现" />
          <Stat label="过拟合落差" value={res.overfitGap.toFixed(2)} color={C.red} sub="IS − OOS" />
          <Stat label="折数" value={res.folds.length.toFixed(0)} color={C.blue} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">样本外净值 — Walk-forward 策略 vs 买入持有</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={res.equity}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="wf" name="Walk-forward" stroke={C.gold} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="bh" name="买入持有" stroke={C.blue} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              <ReferenceLine y={1} stroke={C.text} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">各折 IS vs OOS Sharpe — 样本外衰减</h4>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={res.folds}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="fold" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke={C.text} />
              <Bar dataKey="isS" name="IS Sharpe" fill={C.teal} />
              <Bar dataKey="oosS" name="OOS Sharpe" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">Walk-forward 分析：</span>滚动用 IS 窗口选参数，仅在紧随其后的 OOS 窗口评估，拼接所有 OOS 段得到无前视偏差的真实业绩。</p>
        <p><span className="text-gold">过拟合诊断：</span>全样本最优 Sharpe 远高于 OOS（落差大）即过拟合信号；纯噪声 (φ=0) 时 OOS 应回落到 0 附近。</p>
      </div>
    </div>
  );
};

export default WalkForwardTool;