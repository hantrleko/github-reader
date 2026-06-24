import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ScatterChart, Scatter, ZAxis,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { blackScholes } from "@/lib/quant/blackScholes";
import { C, Slider, Stat, tooltipStyle } from "../frontier/ui";

/**
 * Cox-Ross-Rubinstein binomial tree.
 *   u = e^{σ√Δt},  d = 1/u,  p = (e^{(r−q)Δt} − d)/(u − d)
 * Backward induction; American allows early exercise at each node.
 */
function crrPrice(opts: {
  S: number; K: number; r: number; q: number; sigma: number; T: number; N: number;
  isCall: boolean; american: boolean;
}) {
  const { S, K, r, q, sigma, T, N, isCall, american } = opts;
  const dt = T / N;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const disc = Math.exp(-r * dt);
  const p = (Math.exp((r - q) * dt) - d) / (u - d);
  const payoff = (s: number) => (isCall ? Math.max(s - K, 0) : Math.max(K - s, 0));

  // terminal values
  const v: number[] = [];
  for (let i = 0; i <= N; i++) v[i] = payoff(S * u ** i * d ** (N - i));
  for (let step = N - 1; step >= 0; step--) {
    for (let i = 0; i <= step; i++) {
      const cont = disc * (p * v[i + 1] + (1 - p) * v[i]);
      if (american) {
        const s = S * u ** i * d ** (step - i);
        v[i] = Math.max(cont, payoff(s));
      } else {
        v[i] = cont;
      }
    }
  }
  return { price: v[0], u, d, p };
}

export const BinomialTreeTool = () => {
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [r, setR] = useState(5);
  const [q, setQ] = useState(0);
  const [sigma, setSigma] = useState(20);
  const [T, setT] = useState(1);
  const [N, setN] = useState(50);
  const [isCall, setIsCall] = useState(true);

  const params = { S, K, r: r / 100, q: q / 100, sigma: sigma / 100, T };

  const res = useMemo(() => {
    const euro = crrPrice({ ...params, N, isCall, american: false });
    const amer = crrPrice({ ...params, N, isCall, american: true });
    const bs = blackScholes({ S, K, T, r: r / 100, sigma: sigma / 100, q: q / 100 });
    const bsPrice = isCall ? bs.call : bs.put;
    return { euro, amer, bsPrice };
  }, [params, N, isCall, S, K, T, r, sigma, q]);

  const convergence = useMemo(() => {
    const out: { n: number; euro: number; amer: number; bs: number }[] = [];
    const bs = blackScholes({ S, K, T, r: r / 100, sigma: sigma / 100, q: q / 100 });
    const bsPrice = isCall ? bs.call : bs.put;
    for (let n = 2; n <= 120; n += 2) {
      out.push({
        n,
        euro: +crrPrice({ ...params, N: n, isCall, american: false }).price.toFixed(4),
        amer: +crrPrice({ ...params, N: n, isCall, american: true }).price.toFixed(4),
        bs: +bsPrice.toFixed(4),
      });
    }
    return out;
  }, [params, isCall, S, K, T, r, sigma, q]);

  // small lattice for visualization (cap at 6 steps)
  const lattice = useMemo(() => {
    const steps = Math.min(6, N);
    const dt = T / steps;
    const u = Math.exp((sigma / 100) * Math.sqrt(dt));
    const d = 1 / u;
    const pts: { x: number; y: number; v: number }[] = [];
    for (let step = 0; step <= steps; step++) {
      for (let i = 0; i <= step; i++) {
        pts.push({ x: step, y: +(S * u ** i * d ** (step - i)).toFixed(2), v: 1 });
      }
    }
    return { pts, steps };
  }, [S, sigma, T, N]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "平价看涨", description: "ATM call", apply: () => { setS(100); setK(100); setSigma(20); setT(1); setIsCall(true); setN(50); } },
        { name: "美式看跌 (溢价)", description: "early-exercise", apply: () => { setS(100); setK(110); setSigma(30); setT(1); setIsCall(false); setQ(0); setN(80); } },
        { name: "高股息看涨", description: "q>0 提前行权价值", apply: () => { setQ(6); setIsCall(true); setS(100); setK(95); } },
        { name: "粗网格 (振荡)", description: "N=8 收敛差", apply: () => { setN(8); } },
        { name: "细网格 (收敛)", description: "N=120", apply: () => { setN(120); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">期权与树参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="S (现价)" value={S} min={50} max={150} step={1} onChange={setS} />
            <Slider label="K (行权价)" value={K} min={50} max={150} step={1} onChange={setK} />
            <Slider label="σ (波动率%)" value={sigma} min={5} max={60} step={1} onChange={setSigma} />
            <Slider label="T (年)" value={T} min={0.1} max={3} step={0.1} onChange={setT} />
            <Slider label="r (无风险%)" value={r} min={0} max={10} step={0.5} onChange={setR} />
            <Slider label="q (股息%)" value={q} min={0} max={8} step={0.5} onChange={setQ} />
          </div>
          <Slider label="N (步数)" value={N} min={2} max={200} step={1} onChange={setN} />
          <div className="flex gap-2">
            <button onClick={() => setIsCall(true)} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${isCall ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-secondary/50 text-muted-foreground"}`}>看涨 Call</button>
            <button onClick={() => setIsCall(false)} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${!isCall ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-secondary/50 text-muted-foreground"}`}>看跌 Put</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="欧式 (CRR)" value={res.euro.price.toFixed(4)} />
          <Stat label="Black-Scholes" value={res.bsPrice.toFixed(4)} color={C.teal} sub="闭式解基准" />
          <Stat label="误差 |CRR−BS|" value={Math.abs(res.euro.price - res.bsPrice).toFixed(4)} color={C.red} sub={`N=${N}`} />
          <Stat label="美式 (CRR)" value={res.amer.price.toFixed(4)} color={C.blue} />
          <Stat label="提前行权溢价" value={(res.amer.price - res.euro.price).toFixed(4)} color={C.gold} sub="American − European" />
          <Stat label="风险中性 p" value={res.euro.p.toFixed(3)} color={C.green} sub={`u=${res.euro.u.toFixed(3)}`} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">收敛性 — CRR 欧式价格随步数 N 收敛到 BS</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={convergence}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="n" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "步数 N", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="euro" name="CRR 欧式" stroke={C.gold} strokeWidth={1.8} dot={false} />
              <Line type="monotone" dataKey="amer" name="CRR 美式" stroke={C.blue} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              <Line type="monotone" dataKey="bs" name="BS 闭式解" stroke={C.red} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">CRR 价格随 N 增大以 O(1/N) 收敛到 BS，并呈现 even/odd 锯齿振荡——这是二叉树定价的典型特征。</p>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">价格格点 (前 {lattice.steps} 步)</h4>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" stroke={C.text} tick={{ fontSize: 10 }} domain={[0, lattice.steps]} label={{ value: "步", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis type="number" dataKey="y" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "标的价", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
              <ZAxis range={[40, 40]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={lattice.pts} fill={C.gold} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">CRR (1979)：</span>离散二叉树在 N→∞ 时收敛到 Black-Scholes；u·d=1 保证重组格点。</p>
        <p><span className="text-gold">美式期权：</span>每个节点取 max(继续持有, 立即行权)，溢价主要来自美式看跌或高股息看涨。</p>
      </div>
    </div>
  );
};

export default BinomialTreeTool;