import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "./ui";

/**
 * Cumulative Prospect Theory (Tversky & Kahneman 1992).
 *   value:  v(x) = x^α (x≥0);  −λ(−x)^β (x<0)
 *   weight: w(p) = p^γ / (p^γ + (1−p)^γ)^(1/γ)
 * Demo gamble: win G with prob p, else lose L.
 *   Prospect value = w(p)·v(G) + w(1−p)·v(−L)
 *   Certainty equivalent solves v(CE) = prospect value.
 */
function vfun(x: number, alpha: number, beta: number, lambda: number) {
  return x >= 0 ? Math.pow(x, alpha) : -lambda * Math.pow(-x, beta);
}
function wfun(p: number, g: number) {
  const a = Math.pow(p, g);
  return a / Math.pow(a + Math.pow(1 - p, g), 1 / g);
}

export const ProspectTheoryTool = () => {
  const [alpha, setAlpha] = useState(0.88);
  const [beta, setBeta] = useState(0.88);
  const [lambda, setLambda] = useState(2.25);
  const [gamma, setGamma] = useState(0.61);
  const [gain, setGain] = useState(100);
  const [loss, setLoss] = useState(100);
  const [p, setP] = useState(0.5);

  const valueCurve = useMemo(() => {
    const out: { x: number; v: number }[] = [];
    for (let i = -100; i <= 100; i += 4) out.push({ x: i, v: +vfun(i, alpha, beta, lambda).toFixed(3) });
    return out;
  }, [alpha, beta, lambda]);

  const weightCurve = useMemo(() => {
    const out: { p: number; w: number; lin: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const pp = i / 100;
      out.push({ p: +pp.toFixed(2), w: +wfun(Math.min(0.9999, Math.max(0.0001, pp)), gamma).toFixed(4), lin: +pp.toFixed(4) });
    }
    return out;
  }, [gamma]);

  const gamble = useMemo(() => {
    const pv = wfun(p, gamma) * vfun(gain, alpha, beta, lambda) + wfun(1 - p, gamma) * vfun(-loss, alpha, beta, lambda);
    const ev = p * gain - (1 - p) * loss;
    // certainty equivalent: invert v
    let ce: number;
    if (pv >= 0) ce = Math.pow(pv, 1 / alpha);
    else ce = -Math.pow(-pv / lambda, 1 / beta);
    return { pv, ev, ce };
  }, [p, gamma, gain, loss, alpha, beta, lambda]);

  return (
    <div className="space-y-5">
      <PresetButtons
        presets={[
          { name: "TK 1992 标定", description: "α=β=.88,λ=2.25,γ=.61", apply: () => { setAlpha(0.88); setBeta(0.88); setLambda(2.25); setGamma(0.61); } },
          { name: "强损失厌恶", description: "λ=3.5", apply: () => { setLambda(3.5); } },
          { name: "风险中性", description: "α=β=1,λ=1,γ=1", apply: () => { setAlpha(1); setBeta(1); setLambda(1); setGamma(1); } },
          { name: "对称赌局", description: "p=.5, ±100", apply: () => { setGain(100); setLoss(100); setP(0.5); } },
          { name: "小概率大奖", description: "p=.05 高估", apply: () => { setP(0.05); setGain(1000); setLoss(50); } },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">价值函数与权重参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="α (收益凹性)" value={alpha} min={0.3} max={1} step={0.01} onChange={setAlpha} />
            <Slider label="β (损失凸性)" value={beta} min={0.3} max={1} step={0.01} onChange={setBeta} />
            <Slider label="λ (损失厌恶)" value={lambda} min={1} max={4} step={0.05} onChange={setLambda} />
            <Slider label="γ (概率加权)" value={gamma} min={0.3} max={1} step={0.01} onChange={setGamma} />
          </div>
          <p className="text-xs font-mono text-gold uppercase tracking-wider pt-2">示例赌局</p>
          <div className="grid grid-cols-3 gap-3">
            <Slider label="赢 G" value={gain} min={10} max={1000} step={10} fmt={(v) => v.toFixed(0)} onChange={setGain} />
            <Slider label="输 L" value={loss} min={10} max={1000} step={10} fmt={(v) => v.toFixed(0)} onChange={setLoss} />
            <Slider label="p(赢)" value={p} min={0.01} max={0.99} step={0.01} onChange={setP} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="前景价值 V" value={gamble.pv.toFixed(2)} color={gamble.pv >= 0 ? C.green : C.red} />
          <Stat label="期望值 EV" value={gamble.ev.toFixed(2)} color={C.blue} sub="客观期望" />
          <Stat label="确定性等值 CE" value={gamble.ce.toFixed(2)} color={C.gold} sub="v(CE)=V" />
          <Stat label="风险溢价" value={(gamble.ev - gamble.ce).toFixed(2)} color={C.red} sub="EV − CE" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">价值函数 v(x) — S 形 + 损失更陡</h4>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={valueCurve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine x={0} stroke={C.text} />
                <ReferenceLine y={0} stroke={C.text} />
                <Line type="monotone" dataKey="v" name="v(x)" stroke={C.gold} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">概率权重 w(p) — 小概率高估</h4>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightCurve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="p" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={[0, 1]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="w" name="w(p)" stroke={C.blue} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="lin" name="45°" stroke={C.text} strokeWidth={1} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">前景理论 (Kahneman & Tversky 1979)：</span>相对参考点的收益/损失，损失厌恶 λ&gt;1 使曲线在亏损侧更陡。</p>
        <p><span className="text-gold">概率加权：</span>w(p) 高估小概率、低估中高概率，解释彩票与保险并存。</p>
      </div>
    </div>
  );
};

export default ProspectTheoryTool;