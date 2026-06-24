import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "./ui";

/**
 * Constant-product AMM (Uniswap v2 style):  x · y = k
 *   spot price (B per A)        = y / x
 *   selling Δx of A:  out_B     = y·Δx / (x + Δx)
 *   execution price             = out_B / Δx = y / (x + Δx)
 *   slippage                    = 1 − exec/spot = Δx / (x + Δx)
 * Impermanent loss vs HODL for price ratio r = p₁/p₀:
 *   IL(r) = 2·√r / (1 + r) − 1   (≤ 0)
 */
function ilForRatio(r: number) {
  return (2 * Math.sqrt(r)) / (1 + r) - 1;
}

export const AmmTool = () => {
  const [x, setX] = useState(1000); // reserve of token A
  const [y, setY] = useState(1_000_000); // reserve of token B (e.g. USDC)
  const [dx, setDx] = useState(50); // trade size in A
  const [ratio, setRatio] = useState(2); // price ratio p1/p0 for IL

  const trade = useMemo(() => {
    const k = x * y;
    const spot = y / x;
    const outB = (y * dx) / (x + dx);
    const exec = outB / dx;
    const slippage = dx / (x + dx);
    const priceImpact = 1 - (k / (x + dx) ** 2) / (y / x); // marginal price move
    return { k, spot, outB, exec, slippage, priceImpact };
  }, [x, y, dx]);

  const slipCurve = useMemo(() => {
    const out: { size: number; slippage: number }[] = [];
    const maxSize = x * 0.6;
    for (let i = 1; i <= 60; i++) {
      const s = (i / 60) * maxSize;
      out.push({ size: +s.toFixed(2), slippage: +((s / (x + s)) * 100).toFixed(3) });
    }
    return out;
  }, [x]);

  const ilCurve = useMemo(() => {
    const out: { r: number; il: number }[] = [];
    for (let i = 0; i <= 80; i++) {
      const r = 0.2 + (i / 80) * 4.8; // 0.2x .. 5x
      out.push({ r: +r.toFixed(3), il: +(ilForRatio(r) * 100).toFixed(3) });
    }
    return out;
  }, []);

  const il = ilForRatio(ratio);

  return (
    <div className="space-y-5">
      <PresetButtons
        presets={[
          { name: "深度池 (低滑点)", description: "大储备", apply: () => { setX(5000); setY(5_000_000); setDx(50); setRatio(1.5); } },
          { name: "浅池 (高滑点)", description: "小储备 / 大单", apply: () => { setX(300); setY(300_000); setDx(80); setRatio(2); } },
          { name: "鲸鱼冲击", description: "交易≈池一半", apply: () => { setX(1000); setY(1_000_000); setDx(400); setRatio(3); } },
          { name: "价格翻倍 (IL)", description: "r=2 → IL≈-5.7%", apply: () => { setRatio(2); } },
          { name: "价格×4 (IL)", description: "r=4 → IL≈-20%", apply: () => { setRatio(4); } },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">流动性池与交易</p>
          <Slider label="x (代币 A 储备)" value={x} min={100} max={8000} step={50} fmt={(v) => v.toFixed(0)} onChange={setX} />
          <Slider label="y (代币 B 储备)" value={y} min={100000} max={8_000_000} step={50000} fmt={(v) => (v / 1e6).toFixed(2) + "M"} onChange={setY} />
          <Slider label="Δx (卖出 A 的数量)" value={dx} min={1} max={x * 0.6} step={1} fmt={(v) => v.toFixed(0)} onChange={setDx} />
          <Slider label="r = p₁/p₀ (价格比变化, 用于 IL)" value={ratio} min={0.2} max={5} step={0.05} onChange={setRatio} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="现价 y/x" value={trade.spot.toFixed(2)} />
          <Stat label="成交均价" value={trade.exec.toFixed(2)} color={C.teal} />
          <Stat label="获得 B" value={trade.outB.toFixed(1)} color={C.blue} />
          <Stat label="滑点" value={(trade.slippage * 100).toFixed(2) + "%"} color={C.red} sub="Δx/(x+Δx)" />
          <Stat label={`无常损失 (r=${ratio.toFixed(2)})`} value={(il * 100).toFixed(2) + "%"} color={C.red} sub="相对持币" />
          <Stat label="恒积 k" value={(trade.k / 1e6).toFixed(1) + "M"} color={C.green} sub="x·y 守恒" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">滑点 vs 交易规模</h4>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={slipCurve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="size" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "Δx", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="slippage" name="滑点 %" stroke={C.red} strokeWidth={2.5} dot={false} />
                <ReferenceLine x={+dx.toFixed(2)} stroke={C.gold} strokeDasharray="3 3" label={{ value: "当前", fill: C.gold, fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">无常损失 vs 价格比 r</h4>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ilCurve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="r" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "r = p₁/p₀", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="il" name="IL %" stroke={C.blue} strokeWidth={2.5} dot={false} />
                <ReferenceLine x={+ratio.toFixed(3)} stroke={C.gold} strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke={C.text} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">恒积做市商 (CFMM)：</span>储备乘积 x·y=k 守恒；边际价格 = y/x，大单沿曲线移动产生滑点。</p>
        <p><span className="text-gold">无常损失：</span>价格偏离越大，LP 相对持币损失越大；IL(r)=2√r/(1+r)−1，r=1 时为 0。</p>
      </div>
    </div>
  );
};

export default AmmTool;