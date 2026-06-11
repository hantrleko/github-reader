import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ReferenceDot, ComposedChart, BarChart, Bar, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: { label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">{label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}</label>
      <span className="text-xs font-mono text-gold tabular-nums">{value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = CHART_GOLD, sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">{children}</div>
);

const ChartCard = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    <div className="h-[280px]">{children}</div>
    {hint && <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{hint}</p>}
  </div>
);

/* ════════════════════════════════════════════════════════════
   1. Supply & Demand — equilibrium, tax incidence, deadweight loss
   Qd = a − b·P ;  Qs = c + d·P
   ════════════════════════════════════════════════════════════ */
export const SupplyDemandTool = () => {
  const [a, setA] = useState(100);
  const [b, setB] = useState(2);
  const [c, setC] = useState(10);
  const [d, setD] = useState(3);
  const [tax, setTax] = useState(0);

  const r = useMemo(() => {
    // No-tax equilibrium
    const P0 = (a - c) / (b + d);
    const Q0 = a - b * P0;
    // Per-unit tax on producers: Qd(Pc) = Qs(Pc − t)
    const Pc = (a - c + d * tax) / (b + d); // consumer price
    const Pp = Pc - tax;                     // producer price
    const Qt = a - b * Pc;
    const revenue = tax * Qt;
    const dwl = 0.5 * tax * (Q0 - Qt);
    // Incidence split
    const consumerBurden = (Pc - P0) / (tax || 1);
    // Surpluses (no tax)
    const Pmax = a / b;          // choke price (Qd=0)
    const Pmin = -c / d;         // supply intercept price (Qs=0) — can be negative
    const CS = 0.5 * Q0 * (Pmax - P0);
    const PS = 0.5 * Q0 * (P0 - Math.max(Pmin, 0));
    return { P0, Q0, Pc, Pp, Qt, revenue, dwl, consumerBurden, CS, PS, Pmax };
  }, [a, b, c, d, tax]);

  const curve = useMemo(() => {
    const out: { P: number; Qd: number; Qs: number; Qst: number }[] = [];
    const Pmax = Math.max(r.Pmax, r.Pc) * 1.05;
    for (let i = 0; i <= 60; i++) {
      const P = (i / 60) * Pmax;
      out.push({
        P: +P.toFixed(2),
        Qd: +Math.max(a - b * P, 0).toFixed(2),
        Qs: +Math.max(c + d * P, 0).toFixed(2),
        Qst: +Math.max(c + d * (P - tax), 0).toFixed(2),
      });
    }
    return out;
  }, [a, b, c, d, tax, r]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "基准市场", description: "无税收", apply: () => { setA(100); setB(2); setC(10); setD(3); setTax(0); } },
        { name: "征收消费税", description: "t=10/单位", apply: () => { setA(100); setB(2); setC(10); setD(3); setTax(10); } },
        { name: "需求缺乏弹性", description: "b 很小,税负落买方", apply: () => { setA(100); setB(0.6); setC(10); setD(3); setTax(10); } },
        { name: "供给缺乏弹性", description: "d 很小,税负落卖方", apply: () => { setA(100); setB(3); setC(10); setD(0.6); setTax(10); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">需求 Qd = a − b·P</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="a (需求截距)" value={a} min={40} max={160} step={1} onChange={setA} />
            <Slider label="b (需求斜率)" sub="弹性↑" value={b} min={0.3} max={5} step={0.1} onChange={setB} />
          </div>
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-2">供给 Qs = c + d·P</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="c (供给截距)" value={c} min={-20} max={40} step={1} onChange={setC} />
            <Slider label="d (供给斜率)" value={d} min={0.3} max={5} step={0.1} onChange={setD} />
          </div>
          <Slider label="单位税 t" sub="向生产者征收" value={tax} min={0} max={30} step={1} onChange={setTax} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="均衡价格 P*" value={r.P0.toFixed(2)} />
            <Stat label="均衡数量 Q*" value={r.Q0.toFixed(2)} color={CHART_TEAL} />
            {tax > 0 && <>
              <Stat label="买方支付 Pᶜ" value={r.Pc.toFixed(2)} color={CHART_RED} sub={`+${(r.Pc - r.P0).toFixed(2)}`} />
              <Stat label="卖方实得 Pᵖ" value={r.Pp.toFixed(2)} color={CHART_BLUE} sub={`−${(r.P0 - r.Pp).toFixed(2)}`} />
              <Stat label="税收收入" value={r.revenue.toFixed(1)} color={CHART_GOLD} />
              <Stat label="无谓损失 DWL" value={r.dwl.toFixed(1)} color={CHART_RED} sub={`买方承担 ${(r.consumerBurden * 100).toFixed(0)}%`} />
            </>}
            {tax === 0 && <>
              <Stat label="消费者剩余 CS" value={r.CS.toFixed(1)} color={CHART_RED} />
              <Stat label="生产者剩余 PS" value={r.PS.toFixed(1)} color={CHART_BLUE} />
            </>}
          </div>
          <Note>
            <p><span className="text-gold">均衡：</span>Qd(P*) = Qs(P*) ⟹ P* = (a−c)/(b+d)。</p>
            <p><span className="text-gold">税收归宿：</span>弹性越低的一方承担越多税负；DWL = ½·t·ΔQ。</p>
            <p>需求弹性 / 供给弹性决定价格如何在买卖双方间分摊。</p>
          </Note>
        </div>
      </div>

      <ChartCard title="供需曲线与均衡" hint="横轴为价格 P，纵轴为数量。需求向下、供给向上，交点即均衡。征税使供给曲线左移 (Qst)，买卖价格出现楔形。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="P" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "价格 P", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "数量 Q", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Qd" name="需求 Qd" stroke={CHART_RED} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Qs" name="供给 Qs" stroke={CHART_BLUE} strokeWidth={2.5} dot={false} />
            {tax > 0 && <Line type="monotone" dataKey="Qst" name="含税供给" stroke={CHART_GOLD} strokeWidth={2} strokeDasharray="5 3" dot={false} />}
            <ReferenceLine x={+r.P0.toFixed(2)} stroke={CHART_TEAL} strokeDasharray="3 3" label={{ value: "P*", fill: CHART_TEAL, fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. Consumer Choice — Cobb-Douglas, budget line, Hicks decomposition
   U = x^α · y^(1−α) ;  optimum x* = αI/Px, y* = (1−α)I/Py
   ════════════════════════════════════════════════════════════ */
export const ConsumerChoiceTool = () => {
  const [alpha, setAlpha] = useState(0.5);
  const [I, setI] = useState(100);
  const [Py, setPy] = useState(1);
  const [Px0, setPx0] = useState(1);   // base price
  const [Px1, setPx1] = useState(2);   // new price

  const r = useMemo(() => {
    const x0 = (alpha * I) / Px0;
    const y0 = ((1 - alpha) * I) / Py;
    const U0 = Math.pow(x0, alpha) * Math.pow(y0, 1 - alpha);
    const x1 = (alpha * I) / Px1;
    const y1 = ((1 - alpha) * I) / Py;
    // Hicks: expenditure to keep U0 at new prices
    const e = U0 * Math.pow(Px1 / alpha, alpha) * Math.pow(Py / (1 - alpha), 1 - alpha);
    const xh = (alpha * e) / Px1;       // compensated demand
    const SE = xh - x0;                 // substitution effect
    const IE = x1 - xh;                 // income effect
    const TE = x1 - x0;                 // total effect
    return { x0, y0, U0, x1, y1, xh, e, SE, IE, TE };
  }, [alpha, I, Py, Px0, Px1]);

  const chart = useMemo(() => {
    const xMax = (I / Px1) * 1.1;
    const out: { x: number; budget0: number; budget1: number; ind: number }[] = [];
    for (let i = 0; i <= 60; i++) {
      const x = Math.max((i / 60) * xMax, 1e-3);
      // indifference curve through base optimum: U0 = x^α y^(1−α)
      const y = Math.pow(r.U0 / Math.pow(x, alpha), 1 / (1 - alpha));
      out.push({
        x: +x.toFixed(2),
        budget0: +Math.max((I - Px0 * x) / Py, 0).toFixed(2),
        budget1: +Math.max((I - Px1 * x) / Py, 0).toFixed(2),
        ind: +Math.min(y, I / Py * 1.4).toFixed(2),
      });
    }
    return out;
  }, [alpha, I, Py, Px0, Px1, r]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "对称偏好", description: "α=0.5", apply: () => { setAlpha(0.5); setI(100); setPy(1); setPx0(1); setPx1(2); } },
        { name: "偏好 X", description: "α=0.7", apply: () => { setAlpha(0.7); setI(100); setPy(1); setPx0(1); setPx1(2); } },
        { name: "X 涨价", description: "Px:1→3", apply: () => { setPx0(1); setPx1(3); } },
        { name: "X 降价", description: "Px:2→1", apply: () => { setPx0(2); setPx1(1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="α (X 的偏好权重)" value={alpha} min={0.1} max={0.9} step={0.05} onChange={setAlpha} />
          <Slider label="收入 I" value={I} min={40} max={200} step={5} onChange={setI} />
          <Slider label="Py (Y 价格)" value={Py} min={0.5} max={4} step={0.1} onChange={setPy} />
          <Slider label="Px₀ (X 原价)" value={Px0} min={0.5} max={4} step={0.1} onChange={setPx0} />
          <Slider label="Px₁ (X 新价)" value={Px1} min={0.5} max={5} step={0.1} onChange={setPx1} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="原最优 x₀*" value={r.x0.toFixed(2)} sub={`y₀*=${r.y0.toFixed(2)}`} />
            <Stat label="新最优 x₁*" value={r.x1.toFixed(2)} color={CHART_TEAL} sub={`y₁*=${r.y1.toFixed(2)}`} />
            <Stat label="替代效应 SE" value={r.SE.toFixed(2)} color={CHART_BLUE} sub="Hicks 补偿" />
            <Stat label="收入效应 IE" value={r.IE.toFixed(2)} color={CHART_RED} />
            <Stat label="总效应 TE" value={r.TE.toFixed(2)} color={CHART_GOLD} sub="SE + IE" />
            <Stat label="原效用 U₀" value={r.U0.toFixed(2)} />
          </div>
          <Note>
            <p><span className="text-gold">最优条件：</span>MRS = MUx/MUy = Px/Py，即预算线与无差异曲线相切。</p>
            <p>Cobb-Douglas 解：x* = αI/Px，支出份额恒为 α（与价格无关）。</p>
            <p><span className="text-gold">Slutsky/Hicks 分解：</span>价格变化 = 替代效应 (沿原效用) + 收入效应 (实际购买力变化)。</p>
          </Note>
        </div>
      </div>

      <ChartCard title="预算线 & 无差异曲线" hint="横轴 X、纵轴 Y。金线为原预算线，蓝虚线为新预算线，红线为通过原最优点的无差异曲线 U₀；切点即最优消费。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "商品 X", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, +(I / Py * 1.2).toFixed(0)]} label={{ value: "商品 Y", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="budget0" name="原预算线" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="budget1" name="新预算线" stroke={CHART_BLUE} strokeWidth={2} strokeDasharray="5 3" dot={false} />
            <Line type="monotone" dataKey="ind" name="无差异曲线 U₀" stroke={CHART_RED} strokeWidth={2} dot={false} />
            <ReferenceDot x={+r.x0.toFixed(2)} y={+r.y0.toFixed(2)} r={5} fill={CHART_GOLD} stroke="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Producer Theory — isoquant / isocost + short-run cost curves
   q = K^α · L^(1−α) ;  cost-min: MPL/MPK = w/r
   ════════════════════════════════════════════════════════════ */
export const ProducerTheoryTool = () => {
  const [alpha, setAlpha] = useState(0.5);
  const [q0, setQ0] = useState(10);
  const [w, setW] = useState(1);
  const [rr, setRr] = useState(1);

  const r = useMemo(() => {
    // Cost-min K/L ratio: MPL/MPK = w/r ⟹ ((1−α)/α)(K/L) = w/r
    const ratio = (alpha / (1 - alpha)) * (w / rr); // K/L
    // q0 = K^α L^(1−α) = (ratio·L)^α L^(1−α) = ratio^α · L ⟹ L = q0 / ratio^α
    const L = q0 / Math.pow(ratio, alpha);
    const K = ratio * L;
    const cost = w * L + rr * K;
    return { ratio, L, K, cost };
  }, [alpha, q0, w, rr]);

  const iso = useMemo(() => {
    const Lmax = r.L * 2.4;
    const out: { L: number; isoq: number; isoc: number }[] = [];
    for (let i = 1; i <= 60; i++) {
      const L = (i / 60) * Lmax;
      const Kq = Math.pow(q0 / Math.pow(L, 1 - alpha), 1 / alpha); // isoquant
      const Kc = (r.cost - w * L) / rr;                            // isocost
      out.push({ L: +L.toFixed(2), isoq: +Math.min(Kq, r.K * 4).toFixed(2), isoc: +Math.max(Kc, 0).toFixed(2) });
    }
    return out;
  }, [alpha, q0, w, rr, r]);

  // Short-run cost curves from a cubic total cost: C(q) = FC + 6q − 0.8q² + 0.05q³
  const costCurves = useMemo(() => {
    const FC = 50;
    const out: { q: number; MC: number; AVC: number; AC: number }[] = [];
    for (let q = 1; q <= 30; q++) {
      const VC = 6 * q - 0.8 * q * q + 0.05 * q * q * q;
      const C = FC + VC;
      const MC = 6 - 1.6 * q + 0.15 * q * q;
      out.push({ q, MC: +MC.toFixed(2), AVC: +(VC / q).toFixed(2), AC: +(C / q).toFixed(2) });
    }
    return out;
  }, []);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "对称技术", description: "α=0.5,w=r", apply: () => { setAlpha(0.5); setQ0(10); setW(1); setRr(1); } },
        { name: "资本密集", description: "α=0.7", apply: () => { setAlpha(0.7); setW(1); setRr(1); } },
        { name: "工资上涨", description: "w=3 → 用更多 K", apply: () => { setW(3); setRr(1); } },
        { name: "提高产量", description: "q₀=20", apply: () => { setQ0(20); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="α (资本份额)" value={alpha} min={0.2} max={0.8} step={0.05} onChange={setAlpha} />
          <Slider label="目标产量 q₀" value={q0} min={4} max={30} step={1} onChange={setQ0} />
          <Slider label="工资 w (劳动价格)" value={w} min={0.5} max={4} step={0.1} onChange={setW} />
          <Slider label="r (资本价格)" value={rr} min={0.5} max={4} step={0.1} onChange={setRr} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="最优 L*" value={r.L.toFixed(2)} />
            <Stat label="最优 K*" value={r.K.toFixed(2)} color={CHART_TEAL} />
            <Stat label="K/L 比" value={r.ratio.toFixed(2)} color={CHART_BLUE} />
            <Stat label="最小成本 C*" value={r.cost.toFixed(2)} color={CHART_GOLD} />
          </div>
          <Note>
            <p><span className="text-gold">成本最小化：</span>MPL/MPK = w/r，等成本线与等产量线相切。</p>
            <p>要素价格变化 → 替代使用相对便宜的要素 (工资↑ ⟹ 资本/劳动比 K/L↑)。</p>
            <p><span className="text-gold">利润最大化：</span>另需 MR = MC（短期成本曲线见下图）。</p>
          </Note>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="等产量线 vs 等成本线" hint="切点 = 成本最小要素组合 (L*, K*)。">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={iso}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="L" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "劳动 L", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, +(r.K * 3).toFixed(0)]} label={{ value: "资本 K", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="isoq" name={`等产量 q=${q0}`} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="isoc" name="等成本线" stroke={CHART_BLUE} strokeWidth={2} dot={false} />
              <ReferenceDot x={+r.L.toFixed(2)} y={+r.K.toFixed(2)} r={5} fill={CHART_RED} stroke="none" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="短期成本曲线 MC / AVC / AC" hint="MC 自下而上穿过 AVC 与 AC 的最低点（包络性质）。">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={costCurves}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="q" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "产量 q", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, 20]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="MC" name="MC" stroke={CHART_RED} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="AVC" name="AVC" stroke={CHART_TEAL} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="AC" name="AC" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   4. Market Structure — Cournot / Bertrand / Stackelberg / Monopoly
   Linear demand P = A − B·Q, constant MC = c
   ════════════════════════════════════════════════════════════ */
export const MarketStructureTool = () => {
  const [A, setA] = useState(100);
  const [B, setB] = useState(1);
  const [c, setC] = useState(20);
  const [n, setN] = useState(2);

  const r = useMemo(() => {
    const base = A - c;
    const mk = (Q: number) => {
      const P = A - B * Q;
      const profit = (P - c) * Q;
      const CS = 0.5 * B * Q * Q;
      return { Q: +Q.toFixed(2), P: +P.toFixed(2), profit: +profit.toFixed(1), CS: +CS.toFixed(1) };
    };
    const mono = mk(base / (2 * B));
    const cournot = mk((n * base) / ((n + 1) * B));
    const bertrand = mk(base / B); // P = c
    const stack = mk((3 * base) / (4 * B));
    return [
      { name: "垄断", ...mono, color: CHART_RED },
      { name: `古诺 (n=${n})`, ...cournot, color: CHART_GOLD },
      { name: "斯塔克尔伯格", ...stack, color: CHART_BLUE },
      { name: "伯特兰", ...bertrand, color: CHART_TEAL },
    ];
  }, [A, B, c, n]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "双寡头", description: "n=2", apply: () => { setA(100); setB(1); setC(20); setN(2); } },
        { name: "趋向竞争", description: "n=8", apply: () => { setN(8); } },
        { name: "高成本", description: "c=50", apply: () => { setC(50); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="A (需求截距)" value={A} min={60} max={160} step={5} onChange={setA} />
          <Slider label="B (需求斜率)" value={B} min={0.5} max={3} step={0.1} onChange={setB} />
          <Slider label="边际成本 c" value={c} min={0} max={60} step={5} onChange={setC} />
          <Slider label="古诺企业数 n" value={n} min={1} max={12} step={1} onChange={setN} />
        </div>
        <div className="space-y-3">
          <Note>
            <p><span className="text-gold">垄断：</span>Q=(A−c)/2B，价格最高、产量最低，福利损失最大。</p>
            <p><span className="text-gold">古诺：</span>n 家同时定产量；n→∞ 时趋向完全竞争 (P→c)。</p>
            <p><span className="text-gold">斯塔克尔伯格：</span>领导者先动获更高利润 (产量=垄断量)。</p>
            <p><span className="text-gold">伯特兰：</span>同质产品价格竞争 ⟹ P=MC，利润=0（伯特兰悖论）。</p>
          </Note>
          <div className="grid grid-cols-2 gap-2">
            {r.map(s => (
              <Stat key={s.name} label={s.name} value={`P=${s.P}`} color={s.color} sub={`Q=${s.Q} π=${s.profit}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="均衡产量与价格对比">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Q" name="总产量 Q" fill={CHART_TEAL} />
              <Bar dataKey="P" name="价格 P" fill={CHART_GOLD} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="利润与消费者剩余对比">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="profit" name="行业利润 π" fill={CHART_RED} />
              <Bar dataKey="CS" name="消费者剩余" fill={CHART_BLUE} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   5. Information Economics — Akerlof lemons + concept table
   ════════════════════════════════════════════════════════════ */
export const InfoEconomicsTool = () => {
  const [k, setK] = useState(1.5);   // buyer valuation multiplier on quality
  const [qmax, setQmax] = useState(100);

  const r = useMemo(() => {
    // Quality uniform on [0, qmax]. Sellers with q ≤ P sell. Avg quality sold = P/2.
    // Buyer WTP = k · avg = k·P/2. Market sustains trade only if k·P/2 ≥ P ⟺ k ≥ 2.
    const works = k >= 2;
    // Traded share: if works, all (P can clear up to qmax). Approximate equilibrium price.
    const eqP = works ? qmax : 0;       // full unraveling when k<2 for uniform [0,qmax]
    const avgSold = works ? qmax / 2 : 0;
    const out: { P: number; supplyAvg: number; buyerWTP: number }[] = [];
    for (let i = 0; i <= 50; i++) {
      const P = (i / 50) * qmax;
      const avg = P / 2;          // avg quality of cars with q ≤ P
      out.push({ P: +P.toFixed(1), supplyAvg: +avg.toFixed(1), buyerWTP: +(k * avg).toFixed(1) });
    }
    return { works, eqP, avgSold, curve: out };
  }, [k, qmax]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "市场崩溃", description: "k=1.5 < 2", apply: () => { setK(1.5); setQmax(100); } },
        { name: "临界点", description: "k=2", apply: () => { setK(2); } },
        { name: "市场存活", description: "k=2.5 ≥ 2", apply: () => { setK(2.5); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="买方估值系数 k" sub="买方对质量的乘数" value={k} min={1} max={3} step={0.1} onChange={setK} />
          <Slider label="最高质量 q_max" value={qmax} min={50} max={150} step={10} onChange={setQmax} />
          <div className={`rounded-lg border p-3 ${r.works ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
            <p className="text-sm font-mono" style={{ color: r.works ? CHART_TEAL : CHART_RED }}>
              {r.works ? "✓ 市场存活：高质量车愿意成交" : "✗ 柠檬市场：逆向选择致市场崩溃"}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground mt-1">
              条件 k ≥ 2（买方愿付 ≥ 卖方保留价）{r.works ? "满足" : "不满足"}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <Note>
            <p><span className="text-gold">逆向选择 (Akerlof 1970)：</span>买方只知平均质量。价格 P 下只有 q≤P 的车出售，平均质量=P/2。</p>
            <p>买方愿付 k·(P/2)。若 k&lt;2，愿付 &lt; P，高质量退出 → 质量螺旋下降 → 市场瓦解。</p>
            <p><span className="text-gold">缓解：</span>保修、第三方认证、强制披露、品牌声誉、信号传递。</p>
          </Note>
        </div>
      </div>

      <ChartCard title="柠檬市场：买方愿付 vs 价格" hint="当买方愿付曲线 (金) 始终低于 45° 价格线 (红虚) 时，没有价格能让交易持续，市场崩溃。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={r.curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="P" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "价格 P", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="P" name="价格 P (45°)" stroke={CHART_RED} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="buyerWTP" name="买方愿付 k·P/2" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="supplyAvg" name="售出平均质量 P/2" stroke={CHART_BLUE} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-xl border border-border bg-secondary/20 p-4 overflow-x-auto">
        <h4 className="text-sm font-semibold text-foreground mb-3">信息不对称三大模型</h4>
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="text-gold text-left">
              <th className="p-2 border-b border-border">模型</th>
              <th className="p-2 border-b border-border">时点</th>
              <th className="p-2 border-b border-border">机制</th>
              <th className="p-2 border-b border-border">缓解</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr><td className="p-2 border-b border-border/40 text-foreground">逆向选择</td><td className="p-2 border-b border-border/40">事前</td><td className="p-2 border-b border-border/40">柠檬市场，高质量退出</td><td className="p-2 border-b border-border/40">认证、保修、披露</td></tr>
            <tr><td className="p-2 border-b border-border/40 text-foreground">道德风险</td><td className="p-2 border-b border-border/40">事后</td><td className="p-2 border-b border-border/40">有保障后更冒险</td><td className="p-2 border-b border-border/40">免赔额、共保、激励合同</td></tr>
            <tr><td className="p-2 text-foreground">信号传递</td><td className="p-2">事前</td><td className="p-2">高质量者发可信信号</td><td className="p-2">信号成本须与类型负相关</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};