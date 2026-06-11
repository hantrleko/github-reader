import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ReferenceDot, ComposedChart,
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
    <div className="h-[300px]">{children}</div>
    {hint && <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{hint}</p>}
  </div>
);

/* ════════════════════════════════════════════════════════════
   1. IS-LM — goods & money market equilibrium + crowding out
   IS: R = (A − (1−mpc)Y)/b ;  LM: R = (kY − M)/h
   ════════════════════════════════════════════════════════════ */
export const ISLMTool = () => {
  const [mpc, setMpc] = useState(0.6);
  const [G, setG] = useState(30);
  const [M, setM] = useState(120);
  const [b, setB] = useState(4);    // investment sensitivity to R
  const [k, setK] = useState(0.5);  // money demand income sensitivity
  const [h, setH] = useState(4);    // money demand interest sensitivity

  const r = useMemo(() => {
    const C0 = 20, I0 = 30;
    const A = C0 + I0 + G;
    // Y* = (A·h + b·M) / (h(1−mpc) + b·k)
    const Ystar = (A * h + b * M) / (h * (1 - mpc) + b * k);
    const Rstar = (k * Ystar - M) / h;
    const simpleMult = 1 / (1 - mpc);            // pure Keynesian multiplier
    const actualMultG = h / (h * (1 - mpc) + b * k); // dY/dG with LM
    const crowdOut = 1 - actualMultG / simpleMult;
    return { A, Ystar, Rstar, simpleMult, actualMultG, crowdOut };
  }, [mpc, G, M, b, k, h]);

  const curve = useMemo(() => {
    const out: { Y: number; IS: number; LM: number }[] = [];
    const Ymax = r.Ystar * 1.8;
    for (let i = 0; i <= 60; i++) {
      const Y = (i / 60) * Ymax + 1;
      out.push({
        Y: +Y.toFixed(1),
        IS: +((r.A - (1 - mpc) * Y) / b).toFixed(3),
        LM: +((k * Y - M) / h).toFixed(3),
      });
    }
    return out;
  }, [r, mpc, b, k, h, M]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "基准", description: "标准参数", apply: () => { setMpc(0.6); setG(30); setM(120); setB(4); setK(0.5); setH(4); } },
        { name: "财政扩张", description: "G:30→60", apply: () => { setG(60); } },
        { name: "货币扩张", description: "M:120→180", apply: () => { setM(180); } },
        { name: "流动性陷阱", description: "h 极大,货币失效", apply: () => { setH(40); } },
        { name: "古典区间", description: "h 极小,挤出严重", apply: () => { setH(0.6); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="边际消费倾向 mpc" value={mpc} min={0.3} max={0.9} step={0.05} onChange={setMpc} />
            <Slider label="政府支出 G" value={G} min={0} max={100} step={5} onChange={setG} />
            <Slider label="实际货币供给 M/P" value={M} min={40} max={240} step={10} onChange={setM} />
            <Slider label="投资利率敏感 b" value={b} min={1} max={10} step={0.5} onChange={setB} />
            <Slider label="货币需求 k (收入)" value={k} min={0.2} max={1.2} step={0.05} onChange={setK} />
            <Slider label="货币需求 h (利率)" value={h} min={0.5} max={40} step={0.5} onChange={setH} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="均衡产出 Y*" value={r.Ystar.toFixed(1)} />
            <Stat label="均衡利率 R*" value={r.Rstar.toFixed(2)} color={CHART_TEAL} />
            <Stat label="简单乘数" value={r.simpleMult.toFixed(2)} color={CHART_BLUE} sub="1/(1−mpc)" />
            <Stat label="实际财政乘数" value={r.actualMultG.toFixed(2)} color={CHART_GOLD} sub="dY/dG (含 LM)" />
            <Stat label="挤出比例" value={`${(r.crowdOut * 100).toFixed(0)}%`} color={CHART_RED} sub="利率上升挤占投资" />
          </div>
          <Note>
            <p><span className="text-gold">IS：</span>产品市场均衡，财政政策 (G↑) 右移 IS。</p>
            <p><span className="text-gold">LM：</span>货币市场均衡，货币政策 (M↑) 右移 LM。</p>
            <p><span className="text-gold">挤出效应：</span>财政扩张推高利率 → 挤占私人投资；h 越小挤出越强；h→∞ 为流动性陷阱（货币政策失效）。</p>
          </Note>
        </div>
      </div>

      <ChartCard title="IS-LM 均衡" hint="横轴产出 Y、纵轴利率 R。IS 向下、LM 向上，交点决定均衡 (Y*, R*)。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="Y" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "产出 Y", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, "auto"]} label={{ value: "利率 R", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="IS" name="IS 曲线" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="LM" name="LM 曲线" stroke={CHART_BLUE} strokeWidth={2.5} dot={false} />
            <ReferenceDot x={+r.Ystar.toFixed(1)} y={+r.Rstar.toFixed(2)} r={5} fill={CHART_RED} stroke="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. AD-AS — short/long run, demand & supply shocks
   ════════════════════════════════════════════════════════════ */
export const ADASTool = () => {
  const [Yn, setYn] = useState(100);     // potential output
  const [adShift, setAdShift] = useState(0);   // demand shock
  const [asShift, setAsShift] = useState(0);   // supply shock (cost-push)
  const [lambda, setLambda] = useState(0.5);   // SRAS slope
  const [Pe, setPe] = useState(100);     // expected price

  const r = useMemo(() => {
    // AD: P = (200 + adShift) − Y   (downward)
    // SRAS: P = Pe + asShift + λ(Y − Yn)
    // Solve: (200+adShift) − Y = Pe + asShift + λ(Y − Yn)
    const Ystar = (200 + adShift - Pe - asShift + lambda * Yn) / (1 + lambda);
    const Pstar = 200 + adShift - Ystar;
    const gap = Ystar - Yn;
    return { Ystar, Pstar, gap };
  }, [Yn, adShift, asShift, lambda, Pe]);

  const curve = useMemo(() => {
    const out: { Y: number; AD: number; SRAS: number }[] = [];
    for (let Y = 60; Y <= 140; Y += 2) {
      out.push({
        Y,
        AD: +(200 + adShift - Y).toFixed(2),
        SRAS: +(Pe + asShift + lambda * (Y - Yn)).toFixed(2),
      });
    }
    return out;
  }, [adShift, asShift, lambda, Pe, Yn]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "长期均衡", description: "无冲击", apply: () => { setAdShift(0); setAsShift(0); setPe(100); setYn(100); setLambda(0.5); } },
        { name: "需求扩张", description: "AD 右移", apply: () => { setAdShift(20); setAsShift(0); } },
        { name: "负向供给冲击", description: "石油危机→滞胀", apply: () => { setAdShift(0); setAsShift(25); } },
        { name: "需求衰退", description: "信心下降", apply: () => { setAdShift(-20); setAsShift(0); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="潜在产出 Yⁿ (LRAS)" value={Yn} min={80} max={120} step={1} onChange={setYn} />
          <Slider label="需求冲击 (移动 AD)" value={adShift} min={-40} max={40} step={2} onChange={setAdShift} />
          <Slider label="供给冲击 (移动 SRAS)" value={asShift} min={-30} max={40} step={2} onChange={setAsShift} />
          <Slider label="SRAS 斜率 λ" sub="价格粘性" value={lambda} min={0.1} max={2} step={0.1} onChange={setLambda} />
          <Slider label="预期价格 Pᵉ" value={Pe} min={80} max={130} step={1} onChange={setPe} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="短期产出 Y*" value={r.Ystar.toFixed(1)} />
            <Stat label="短期价格 P*" value={r.Pstar.toFixed(1)} color={CHART_TEAL} />
            <Stat label="产出缺口" value={r.gap.toFixed(1)} color={r.gap >= 0 ? CHART_RED : CHART_BLUE} sub={r.gap >= 0 ? "过热 (通胀压力)" : "衰退 (失业压力)"} />
            <Stat label="潜在产出 Yⁿ" value={Yn.toFixed(0)} color={CHART_GOLD} />
          </div>
          <Note>
            <p><span className="text-gold">AD：</span>价格-产出负相关（财富/利率/汇率效应）。</p>
            <p><span className="text-gold">SRAS：</span>短期向上倾斜（工资价格粘性）；LRAS 垂直于 Yⁿ。</p>
            <p><span className="text-gold">长期调整：</span>产出缺口 → 预期与工资调整使 SRAS 移动，经济回到 Yⁿ。负供给冲击同时推高价格、压低产出 = 滞胀。</p>
          </Note>
        </div>
      </div>

      <ChartCard title="AD-AS 模型" hint="红虚线为 LRAS（潜在产出 Yⁿ）。AD 与 SRAS 交点为短期均衡；长期收敛到 LRAS。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="Y" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "产出 Y", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={["auto", "auto"]} label={{ value: "价格 P", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="AD" name="AD 总需求" stroke={CHART_RED} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="SRAS" name="SRAS 短期总供给" stroke={CHART_BLUE} strokeWidth={2.5} dot={false} />
            <ReferenceLine x={Yn} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "LRAS", fill: CHART_GOLD, fontSize: 10 }} />
            <ReferenceDot x={+r.Ystar.toFixed(0)} y={+r.Pstar.toFixed(1)} r={5} fill={CHART_GOLD} stroke="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Phillips Curve — expectations-augmented + long-run vertical
   π = πe − β(u − un) + shock
   ════════════════════════════════════════════════════════════ */
export const PhillipsTool = () => {
  const [pe, setPe] = useState(2);
  const [beta, setBeta] = useState(0.5);
  const [un, setUn] = useState(5);
  const [shock, setShock] = useState(0);

  const curve = useMemo(() => {
    const out: { u: number; SRPC: number }[] = [];
    for (let u = 1; u <= 10; u += 0.25) {
      out.push({ u: +u.toFixed(2), SRPC: +(pe - beta * (u - un) + shock).toFixed(2) });
    }
    return out;
  }, [pe, beta, un, shock]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "原始版", description: "稳定权衡", apply: () => { setPe(2); setBeta(0.8); setUn(5); setShock(0); } },
        { name: "高通胀预期", description: "πᵉ=6 上移曲线", apply: () => { setPe(6); setBeta(0.6); } },
        { name: "曲线平坦化", description: "β 很小 (2008后)", apply: () => { setBeta(0.1); setPe(2); } },
        { name: "供给冲击", description: "滞胀: shock=4", apply: () => { setShock(4); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="通胀预期 πᵉ (%)" value={pe} min={0} max={10} step={0.5} onChange={setPe} />
          <Slider label="斜率 β" sub="权衡强度" value={beta} min={0.05} max={1.5} step={0.05} onChange={setBeta} />
          <Slider label="自然失业率 uⁿ (%)" value={un} min={3} max={7} step={0.25} onChange={setUn} />
          <Slider label="供给冲击 (%)" value={shock} min={-4} max={6} step={0.5} onChange={setShock} />
        </div>
        <div className="space-y-3">
          <Note>
            <p><span className="text-gold">附加预期 PC：</span>π = πᵉ − β(u − uⁿ) + 供给冲击。</p>
            <p><span className="text-gold">长期垂直：</span>当 u = uⁿ 时 π = πᵉ，无长期权衡（自然失业率假说，Friedman-Phelps 1968）。</p>
            <p><span className="text-gold">平坦化：</span>β 趋近 0 → 失业对通胀影响微弱，是 2008 后的重要谜题。</p>
            <p>提高 πᵉ 整体上移短期 PC；供给冲击造成滞胀（高失业+高通胀）。</p>
          </Note>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="自然失业率 uⁿ" value={`${un.toFixed(2)}%`} />
            <Stat label="uⁿ 处通胀" value={`${(pe + shock).toFixed(2)}%`} color={CHART_TEAL} sub="= πᵉ + 冲击" />
          </div>
        </div>
      </div>

      <ChartCard title="菲利普斯曲线 (u-π 空间)" hint="金线为短期 PC，红虚线为长期垂直 PC（位于自然失业率 uⁿ）。两者交点处 π = πᵉ。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="u" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "失业率 u (%)", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "通胀 π (%)", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="SRPC" name="短期 PC" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
            <ReferenceLine x={un} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: "长期 PC (uⁿ)", fill: CHART_RED, fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   4. Mundell-Fleming — impossible trinity & policy effectiveness
   ════════════════════════════════════════════════════════════ */
type Regime = "fixed" | "floating";
type Policy = "fiscal" | "monetary";

export const MundellFlemingTool = () => {
  const [regime, setRegime] = useState<Regime>("floating");
  const [policy, setPolicy] = useState<Policy>("fiscal");

  const result = useMemo(() => {
    // Perfect capital mobility (BP horizontal). Classic Mundell-Fleming conclusions:
    if (regime === "floating") {
      if (policy === "fiscal")
        return { eff: "无效", color: CHART_RED, why: "财政扩张推高利率→资本流入→本币升值→净出口下降，完全抵消产出效应。" };
      return { eff: "有效", color: CHART_TEAL, why: "货币扩张压低利率→资本流出→本币贬值→净出口上升，强化产出扩张。" };
    } else {
      if (policy === "fiscal")
        return { eff: "有效", color: CHART_TEAL, why: "央行须买入外汇维持汇率→货币供给被动增加→强化财政扩张效果。" };
      return { eff: "无效", color: CHART_RED, why: "货币扩张引发资本流出与贬值压力→央行被迫卖出外汇收回货币→货币供给回到原点。" };
    }
  }, [regime, policy]);

  const Toggle = <T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) => (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${value === o.id ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">汇率制度</p>
            <Toggle value={regime} options={[{ id: "floating", label: "浮动汇率" }, { id: "fixed", label: "固定汇率" }]} onChange={setRegime} />
          </div>
          <div>
            <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">政策类型</p>
            <Toggle value={policy} options={[{ id: "fiscal", label: "财政政策" }, { id: "monetary", label: "货币政策" }]} onChange={setPolicy} />
          </div>
          <div className={`rounded-xl border p-4 ${result.eff === "有效" ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">政策有效性（完美资本流动）</p>
            <p className="text-2xl font-display font-bold mt-1" style={{ color: result.color }}>{result.eff}</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{result.why}</p>
          </div>
        </div>

        <div className="space-y-3">
          <ImpossibleTriangle />
          <Note>
            <p><span className="text-gold">不可能三角 (Mundell-Fleming)：</span>固定汇率、资本自由流动、独立货币政策三者最多兼得其二。</p>
            <p>浮动汇率：货币政策有效，财政政策被汇率抵消。</p>
            <p>固定汇率：财政政策有效，货币政策被外汇干预抵消。</p>
          </Note>
        </div>
      </div>
    </div>
  );
};

const ImpossibleTriangle = () => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">蒙代尔不可能三角</h4>
    <svg viewBox="0 0 300 220" className="w-full h-[200px]">
      <polygon points="150,20 30,190 270,190" fill="hsl(var(--gold) / 0.06)" stroke={CHART_GOLD} strokeWidth="1.5" />
      <line x1="150" y1="20" x2="150" y2="190" stroke={CHART_GRID} strokeDasharray="3 3" />
      <line x1="30" y1="190" x2="210" y2="105" stroke={CHART_GRID} strokeDasharray="3 3" />
      <line x1="270" y1="190" x2="90" y2="105" stroke={CHART_GRID} strokeDasharray="3 3" />
      <circle cx="150" cy="20" r="4" fill={CHART_GOLD} />
      <circle cx="30" cy="190" r="4" fill={CHART_TEAL} />
      <circle cx="270" cy="190" r="4" fill={CHART_BLUE} />
      <text x="150" y="12" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontFamily="monospace">独立货币政策</text>
      <text x="22" y="205" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontFamily="monospace">固定汇率</text>
      <text x="270" y="205" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontFamily="monospace">资本自由流动</text>
      <text x="150" y="120" textAnchor="middle" fontSize="9" fill={CHART_TEXT} fontFamily="monospace">仅能选两条边</text>
    </svg>
  </div>
);

/* ════════════════════════════════════════════════════════════
   5. Ramsey-Cass-Koopmans — phase diagram & saddle path
   ċ/c = (f'(k) − ρ − θg)/θ ;  k̇ = f(k) − c − (n+δ)k
   ════════════════════════════════════════════════════════════ */
export const RamseyTool = () => {
  const [alpha, setAlpha] = useState(0.33);
  const [rho, setRho] = useState(0.03);
  const [theta, setTheta] = useState(2);
  const [n, setN] = useState(0.01);
  const [delta, setDelta] = useState(0.05);
  const [g, setG] = useState(0.02);

  const r = useMemo(() => {
    // f(k) = k^α, f'(k) = α k^(α−1). Euler steady state: f'(k*) = ρ + θg + δ
    const target = rho + theta * g + delta;
    const kStar = Math.pow(alpha / target, 1 / (1 - alpha));
    const cStar = Math.pow(kStar, alpha) - (n + delta + g) * kStar;
    const kGold = Math.pow(alpha / (n + delta + g), 1 / (1 - alpha)); // golden rule
    return { kStar, cStar, kGold, target };
  }, [alpha, rho, theta, n, delta, g]);

  const curve = useMemo(() => {
    const out: { k: number; kdot0: number }[] = [];
    const kMax = r.kGold * 1.3;
    for (let i = 1; i <= 60; i++) {
      const k = (i / 60) * kMax;
      // k̇ = 0 locus: c = f(k) − (n+δ+g)k
      out.push({ k: +k.toFixed(3), kdot0: +Math.max(Math.pow(k, alpha) - (n + delta + g) * k, 0).toFixed(3) });
    }
    return out;
  }, [alpha, n, delta, g, r]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "基准", description: "标准校准", apply: () => { setAlpha(0.33); setRho(0.03); setTheta(2); setN(0.01); setDelta(0.05); setG(0.02); } },
        { name: "更耐心", description: "ρ↓ → k*↑", apply: () => { setRho(0.01); } },
        { name: "高风险厌恶", description: "θ=4", apply: () => { setTheta(4); } },
        { name: "高折旧", description: "δ=0.1", apply: () => { setDelta(0.1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="α (资本弹性)" value={alpha} min={0.2} max={0.5} step={0.01} onChange={setAlpha} />
            <Slider label="ρ (时间偏好)" value={rho} min={0.01} max={0.1} step={0.005} onChange={setRho} />
            <Slider label="θ (相对风险厌恶)" value={theta} min={0.5} max={5} step={0.5} onChange={setTheta} />
            <Slider label="n (人口增长)" value={n} min={0} max={0.04} step={0.005} onChange={setN} />
            <Slider label="δ (折旧)" value={delta} min={0.02} max={0.12} step={0.005} onChange={setDelta} />
            <Slider label="g (技术进步)" value={g} min={0} max={0.04} step={0.005} onChange={setG} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="稳态资本 k*" value={r.kStar.toFixed(3)} sub="f'(k*)=ρ+θg+δ" />
            <Stat label="稳态消费 c*" value={r.cStar.toFixed(3)} color={CHART_TEAL} />
            <Stat label="黄金率 k_gold" value={r.kGold.toFixed(3)} color={CHART_BLUE} sub="k* < k_gold (动态有效)" />
            <Stat label="f'(k*)" value={r.target.toFixed(3)} color={CHART_GOLD} />
          </div>
          <Note>
            <p><span className="text-gold">Ramsey (1928)：</span>储蓄率内生于家庭跨期最优（Euler 方程），为 Solow 提供微观基础。</p>
            <p><span className="text-gold">Euler：</span>ċ/c = (f'(k) − ρ − θg)/θ；利率高于时间偏好时消费增长为正。</p>
            <p>稳态 k* &lt; 黄金率 k_gold ⟹ 动态有效（不过度储蓄），区别于 Solow 可能过度储蓄。</p>
          </Note>
        </div>
      </div>

      <ChartCard title="Ramsey 相图 — 两条零变化线" hint="蓝线为 k̇=0（资源约束），金竖线为 ċ=0（位于 k*）。两线交点为鞍点稳态，唯一收敛路径为鞍路径。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "资本 k", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "消费 c", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="kdot0" name="k̇=0 (c=f(k)−(n+δ+g)k)" stroke={CHART_BLUE} strokeWidth={2.5} dot={false} />
            <ReferenceLine x={+r.kStar.toFixed(3)} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "ċ=0 (k*)", fill: CHART_GOLD, fontSize: 10 }} />
            <ReferenceDot x={+r.kStar.toFixed(3)} y={+r.cStar.toFixed(3)} r={5} fill={CHART_RED} stroke="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};