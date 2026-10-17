import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToolTab } from "@/lib/useToolTab";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, AreaChart, Area,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import {
  bootstrapCurve, interpolateCurve, rollDownReturn,
  pvCashflows, spreadTaxonomy, effectiveRisk, keyRateHedge, redingtonImmunization,
  optionEmbeddedBond, convertibleBond,
  creditSpreadDecomposition, ratingMigration, cdsBondBasis,
  waterfall, gaussianCopulaTranche, mbsNegativeConvexity,
  repoLeverage, marginSpiral, rfrCompounding, shiftedLognormalCaplet,
  greeniumSpread, bondLiquidityPremium,
} from "@/lib/quant/fixedIncomeFrontier";

type Cat = "curve" | "spread" | "option" | "credit" | "book";
type Tab =
  | "bootstrap" | "interp" | "roll"
  | "taxonomy" | "effrisk" | "krd" | "immunize"
  | "embedded" | "convertible"
  | "creditdec" | "migration" | "waterfall" | "copula" | "basis"
  | "mbs" | "repo" | "rfr" | "green";

const CATS: { id: Cat; label: string; labelEn: string; kicker: string }[] = [
  { id: "curve",  label: "曲线与口径",   labelEn: "Curve Building",       kicker: "Curve" },
  { id: "spread", label: "利差与风险",   labelEn: "Spread & Risk",        kicker: "Spread & Risk" },
  { id: "option", label: "含权与可转债", labelEn: "Optionality",          kicker: "Optionality" },
  { id: "credit", label: "信用与结构化", labelEn: "Credit & Structured",  kicker: "Credit" },
  { id: "book",   label: "组合与制度",   labelEn: "Portfolio & Regime",   kicker: "Portfolio & Regime" },
];

const TABS: { id: Tab; cat: Cat; title: string; titleEn: string; desc: string; descEn: string }[] = [
  { id: "bootstrap",   cat: "curve",  title: "票息剥离自举",     titleEn: "Par-Curve Bootstrapping",   desc: "par 曲线 → 贴现因子 → 零息与远期", descEn: "Par curve to discount factors, zeros and forwards" },
  { id: "interp",      cat: "curve",  title: "插值方法对比",     titleEn: "Interpolation Methods",     desc: "线性零率 / 分段常数远期 / 三次样条的远期平滑性", descEn: "Linear zero vs piecewise-constant forward vs cubic spline smoothness" },
  { id: "roll",        cat: "curve",  title: "Carry 与滚动收益", titleEn: "Carry & Roll-Down",         desc: "曲线不变假设下的持有期收益分解", descEn: "Holding-period return decomposition under an unchanged curve" },
  { id: "taxonomy",    cat: "spread", title: "利差四口径",       titleEn: "Spread Taxonomy",           desc: "名义 / Z-spread / ASW / OAS 与期权成本", descEn: "Nominal / Z-spread / ASW / OAS and the cost of optionality" },
  { id: "effrisk",     cat: "spread", title: "有效久期与凸性",   titleEn: "Effective Duration & Convexity", desc: "曲线扰动法：含权债的正确风险口径", descEn: "Curve-shock approach: the right risk metric for embedded options" },
  { id: "krd",         cat: "spread", title: "关键利率久期对冲", titleEn: "Key-Rate Duration Hedging", desc: "逐桶中性化的对冲名义求解", descEn: "Solving hedge notionals that neutralise each key-rate bucket" },
  { id: "immunize",    cat: "spread", title: "免疫与久期缺口",   titleEn: "Immunization & Duration Gap", desc: "Redington 条件下盈余对平行移动的敏感性", descEn: "Surplus sensitivity to parallel shifts under Redington conditions" },
  { id: "embedded",    cat: "option", title: "可赎回 / 可回售债", titleEn: "Callable & Putable Bonds",  desc: "对数正态短率树：期权价值与不对称性", descEn: "Lognormal short-rate tree: option value and asymmetry" },
  { id: "convertible", cat: "option", title: "可转债分解",       titleEn: "Convertible Decomposition", desc: "债底 + 转换期权、转换平价与债性/股性区间", descEn: "Bond floor plus conversion option, parity, debt vs equity regions" },
  { id: "creditdec",   cat: "credit", title: "信用利差分解",     titleEn: "Credit Spread Decomposition", desc: "预期损失 / 风险溢价 / 流动性 / 税收与信用利差之谜", descEn: "Expected loss / risk premium / liquidity / tax and the credit spread puzzle" },
  { id: "migration",   cat: "credit", title: "评级迁移矩阵",     titleEn: "Rating Migration Matrix",   desc: "多期演化、违约累积与迁移风险 VaR", descEn: "Multi-period evolution, cumulative default and migration VaR" },
  { id: "waterfall",   cat: "credit", title: "分层瀑布与 OC 触发", titleEn: "Waterfall & OC Triggers", desc: "顺序偿付、超额抵押触发与减记顺位", descEn: "Sequential pay, overcollateralisation triggers and write-down order" },
  { id: "copula",      cat: "credit", title: "高斯 copula 分层",  titleEn: "Gaussian Copula Tranches", desc: "单因子相关性对股权/夹层/优先层的再分配", descEn: "One-factor correlation reshaping equity / mezzanine / senior tranches" },
  { id: "basis",       cat: "credit", title: "CDS-债券基差",     titleEn: "CDS-Bond Basis",            desc: "现券 vs 合成的融资口径与套利方向", descEn: "Cash vs synthetic funding and the direction of the arbitrage" },
  { id: "mbs",         cat: "book",   title: "MBS 负凸性",       titleEn: "MBS Negative Convexity",    desc: "提前还款加速 → 利率下行时久期反而缩短", descEn: "Prepayment speed-up: duration shortens as rates fall" },
  { id: "repo",        cat: "book",   title: "回购杠杆与螺旋",   titleEn: "Repo Leverage & Spiral",    desc: "杠杆放大 carry 与风险；折扣率上升的追缴螺旋", descEn: "Leverage amplifies carry and risk; haircut spirals into margin calls" },
  { id: "rfr",         cat: "book",   title: "RFR 改革与负利率", titleEn: "RFR Reform & Negative Rates", desc: "后视复利 vs 定盘、fallback 利差、位移对数正态 caplet", descEn: "Backward compounding vs fixings, fallback spreads, shifted-lognormal caplets" },
  { id: "green",       cat: "book",   title: "气候与流动性利差", titleEn: "Climate & Liquidity Spreads", desc: "绿色溢价、转型贴水与债券流动性溢价", descEn: "Greenium, transition discount and the bond liquidity premium" },
];
const TAB_IDS: Tab[] = [
  "bootstrap", "interp", "roll",
  "taxonomy", "effrisk", "krd", "immunize",
  "embedded", "convertible",
  "creditdec", "migration", "waterfall", "copula", "basis",
  "mbs", "repo", "rfr", "green",
];

const Panel = ({ title, note, children }: { title: string; note: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
    <h3 className="font-serif text-xl text-foreground">{title}</h3>
    <p className="text-xs text-muted-foreground mt-1 mb-5">{note}</p>
    {children}
  </div>
);
const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid md:grid-cols-[280px_1fr] gap-6">{children}</div>
);
const Controls = ({ children }: { children: React.ReactNode }) => <div className="space-y-4">{children}</div>;
const Stats = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">{children}</div>
);
const f = (x: number | null, d = 3) => (x === null || !Number.isFinite(x) ? "—" : x.toFixed(d));
const bp = (x: number | null, d = 1) => (x === null || !Number.isFinite(x) ? "—" : (x * 1e4).toFixed(d) + " bp");
const pct = (x: number, d = 2) => (Number.isFinite(x) ? (x * 100).toFixed(d) + "%" : "—");

/* ── 1. Bootstrap ── */
function BootstrapPanel() {
  const { t: tr } = useTranslation();
  const [level, setLevel] = useState(0.03);
  const [slope, setSlope] = useState(0.015);
  const [hump, setHump] = useState(0.004);
  const mats = [0.5, 1, 2, 3, 5, 7, 10, 20, 30];
  const out = useMemo(() => {
    const ins = mats.map((m) => ({
      maturity: m,
      parRate: level + slope * (1 - Math.exp(-m / 3)) + hump * (m / 3) * Math.exp(-m / 3),
    }));
    const pts = bootstrapCurve(ins);
    const data = pts.map((p, i) => {
      const prev = i === 0 ? null : pts[i - 1];
      const fwd = prev ? (p.zero * p.maturity - prev.zero * prev.maturity) / (p.maturity - prev.maturity) : p.zero;
      return { tau: p.maturity, par: p.parRate * 100, zero: p.zero * 100, forward: fwd * 100, df: p.discount };
    });
    return { pts, data };
  }, [level, slope, hump]);
  return (
    <Panel title={tr("labs.fiV62.s42", { defaultValue: "票息剥离自举 (Bootstrapping)" })} note={tr("labs.fiV62.s43", { defaultValue: "市场直接可观测的是附息债的 par 收益率，而定价需要的是贴现因子。自举按期限从短到长依次剥离票息，把 par 曲线翻译成零息曲线与瞬时远期曲线：上斜的 par 曲线一定对应更陡的零息曲线，远期曲线又比零息曲线更陡。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s44", { defaultValue: "水平 (level)" })} value={level} min={0} max={0.08} step={0.001} onChange={setLevel} />
          <Slider label={tr("labs.fiV62.s45", { defaultValue: "斜率 (slope)" })} value={slope} min={-0.03} max={0.04} step={0.001} onChange={setSlope} />
          <Slider label={tr("labs.fiV62.s46", { defaultValue: "曲率 (hump)" })} value={hump} min={-0.02} max={0.02} step={0.001} onChange={setHump} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={out.data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="tau" stroke={C.text} fontSize={11} label={{ value: tr("labs.fiV62.s47", { defaultValue: "年" }), position: "insideBottomRight", fontSize: 10 }} />
              <YAxis stroke={C.text} fontSize={11} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line dataKey="par" name={tr("labs.fiV62.s48", { defaultValue: "par 收益率" })} stroke={C.text} dot={false} />
              <Line dataKey="zero" name={tr("labs.fiV62.s49", { defaultValue: "零息利率" })} stroke={C.gold} dot={false} strokeWidth={2} />
              <Line dataKey="forward" name={tr("labs.fiV62.s50", { defaultValue: "远期利率" })} stroke={C.teal} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s51", { defaultValue: "10Y 贴现因子" })} value={f(out.data[6].df, 4)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s52", { defaultValue: "10Y 零息" })} value={f(out.data[6].zero, 3) + "%"} />
            <Stat label={tr("labs.fiV62.s53", { defaultValue: "30Y 零息" })} value={f(out.data[8].zero, 3) + "%"} />
            <Stat label={tr("labs.fiV62.s54", { defaultValue: "2s10s 斜率" })} value={f(out.data[6].zero - out.data[2].zero, 3) + "%"} color={C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 2. Interpolation ── */
function InterpPanel() {
  const { t: tr } = useTranslation();
  const [tenYear, setTenYear] = useState(0.036);
  const [kink, setKink] = useState(0.031);
  const nodes = useMemo(() => [
    { maturity: 0.5, zero: 0.02 }, { maturity: 2, zero: 0.028 },
    { maturity: 5, zero: kink }, { maturity: 10, zero: tenYear }, { maturity: 30, zero: tenYear + 0.002 },
  ], [tenYear, kink]);
  const res = useMemo(() => (["linearZero", "flatForward", "cubicZero"] as const).map((m) => interpolateCurve(nodes, m, 90)), [nodes]);
  const data = useMemo(() => res[0].curve.map((p, i) => ({
    t: +p.t.toFixed(2),
    linear: res[0].curve[i].forward * 100,
    flat: res[1].curve[i].forward * 100,
    cubic: res[2].curve[i].forward * 100,
  })), [res]);
  return (
    <Panel title={tr("labs.fiV62.s55", { defaultValue: "插值方法与远期曲线平滑性" })} note={tr("labs.fiV62.s56", { defaultValue: "插值不是无害的技术细节：同一组节点在不同插值下会给出完全不同的远期曲线。零率线性插值会在节点处制造远期跳跃，分段常数远期给出阶梯，样条最平滑但可能出现震荡。远期曲线的粗糙度（二阶差分平方和）是选择插值方案的标准诊断。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s57", { defaultValue: "5Y 零息" })} value={kink} min={0.01} max={0.06} step={0.0005} onChange={setKink} />
          <Slider label={tr("labs.fiV62.s52", { defaultValue: "10Y 零息" })} value={tenYear} min={0.01} max={0.06} step={0.0005} onChange={setTenYear} />
          <p className="text-[11px] text-muted-foreground leading-relaxed">把 5Y 拉离邻近节点，可以看到线性插值的远期折线如何被放大成尖峰。</p>
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line dataKey="linear" name={tr("labs.fiV62.s58", { defaultValue: "线性零率" })} stroke={C.gold} dot={false} />
              <Line dataKey="flat" name={tr("labs.fiV62.s59", { defaultValue: "分段常数远期" })} stroke={C.teal} dot={false} />
              <Line dataKey="cubic" name={tr("labs.fiV62.s60", { defaultValue: "三次样条" })} stroke={C.red} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s61", { defaultValue: "线性零率粗糙度" })} value={f(res[0].roughness * 1e6, 2)} />
            <Stat label={tr("labs.fiV62.s62", { defaultValue: "常数远期粗糙度" })} value={f(res[1].roughness * 1e6, 2)} />
            <Stat label={tr("labs.fiV62.s63", { defaultValue: "样条粗糙度" })} value={f(res[2].roughness * 1e6, 2)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s64", { defaultValue: "单位" })} value="×10⁻⁶" />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 3. Roll-down ── */
function RollPanel() {
  const { t: tr } = useTranslation();
  const [mat, setMat] = useState(5);
  const [slope, setSlope] = useState(0.006);
  const [funding, setFunding] = useState(0.02);
  const zeroAt = (t: number) => 0.02 + slope * Math.min(t, 10);
  const data = useMemo(() => Array.from({ length: 20 }, (_, i) => {
    const m = 1 + i * 1.5;
    const r = rollDownReturn({ zeroNow: zeroAt(m), maturity: m, horizon: 1, zeroRolled: zeroAt(m - 1), fundingRate: funding });
    return { maturity: m, total: r.total * 100, carry: r.carry * 100, rolldown: r.rolldown * 100 };
  }), [slope, funding]);
  const cur = useMemo(() => rollDownReturn({ zeroNow: zeroAt(mat), maturity: mat, horizon: 1, zeroRolled: zeroAt(mat - 1), fundingRate: funding }), [mat, slope, funding]);
  return (
    <Panel title={tr("labs.fiV62.s65", { defaultValue: "Carry 与滚动收益分解" })} note={tr("labs.fiV62.s66", { defaultValue: "若曲线一年后完全不变，持有一只债券的收益来自两块：carry（票息/收益率减去融资成本）与 roll-down（债券沿曲线向短端滚动带来的资本利得）。曲线越陡，roll-down 越大，这正是曲线交易与套息组合的收益来源，也是它在曲线走平时最脆弱的地方。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s67", { defaultValue: "持仓期限 (年)" })} value={mat} min={2} max={30} step={1} onChange={setMat} />
          <Slider label={tr("labs.fiV62.s68", { defaultValue: "曲线斜率 / 年" })} value={slope} min={-0.004} max={0.012} step={0.0005} onChange={setSlope} />
          <Slider label={tr("labs.fiV62.s69", { defaultValue: "融资利率" })} value={funding} min={0} max={0.06} step={0.001} onChange={setFunding} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="maturity" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={0} stroke={C.text} />
              <Bar dataKey="carry" name="carry" stackId="a" fill={C.teal} />
              <Bar dataKey="rolldown" name="roll-down" stackId="a" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s70", { defaultValue: "一年期总收益" })} value={pct(cur.total)} color={cur.total > 0 ? C.green : C.red} />
            <Stat label="carry" value={pct(cur.carry)} color={C.teal} />
            <Stat label="roll-down" value={pct(cur.rolldown)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s71", { defaultValue: "期初价格" })} value={f(cur.priceStart * 100, 2)} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 4. Spread taxonomy ── */
function TaxonomyPanel() {
  const { t: tr } = useTranslation();
  const [coupon, setCoupon] = useState(0.05);
  const [price, setPrice] = useState(98);
  const [curve, setCurve] = useState(0.035);
  const [oas, setOas] = useState(0.002);
  const maturity = 5;
  const cfs = useMemo(() => Array.from({ length: maturity * 2 }, (_, k) => ({
    t: (k + 1) / 2, amount: k === maturity * 2 - 1 ? 100 + (coupon * 100) / 2 : (coupon * 100) / 2,
  })), [coupon]);
  const zeroAt = (t: number) => curve + 0.0008 * t;
  const out = useMemo(() => spreadTaxonomy({ cfs, zeroAt, price, benchmarkYield: curve, maturity, coupon, oas }), [cfs, price, curve, coupon, oas]);
  const data = [
    { name: tr("labs.fiV62.s72", { defaultValue: "名义利差" }), v: out.nominal * 1e4 },
    { name: "Z-spread", v: out.zSpread * 1e4 },
    { name: "ASW", v: out.asw * 1e4 },
    { name: "OAS", v: (out.oas ?? 0) * 1e4 },
    { name: tr("labs.fiV62.s73", { defaultValue: "期权成本" }), v: (out.optionCost ?? 0) * 1e4 },
  ];
  return (
    <Panel title={tr("labs.fiV62.s74", { defaultValue: "利差四口径：名义 / Z / ASW / OAS" })} note={tr("labs.fiV62.s75", { defaultValue: "四种利差回答四个不同的问题：名义利差只对一个基准点，Z-spread 对整条曲线，ASW 把债券换成浮息现金流后对互换曲线报价，OAS 再进一步剥掉内含期权。恒等式 Z − OAS = 期权成本，是判断含权债券是否被正确定价的第一道检查。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s76", { defaultValue: "票息" })} value={coupon} min={0} max={0.1} step={0.0025} onChange={setCoupon} />
          <Slider label={tr("labs.fiV62.s77", { defaultValue: "市场净价" })} value={price} min={80} max={120} step={0.5} onChange={setPrice} />
          <Slider label={tr("labs.fiV62.s78", { defaultValue: "基准曲线水平" })} value={curve} min={0} max={0.08} step={0.001} onChange={setCurve} />
          <Slider label={tr("labs.fiV62.s79", { defaultValue: "模型 OAS" })} value={oas} min={-0.005} max={0.02} step={0.0005} onChange={setOas} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} unit="bp" />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke={C.text} />
              <Bar dataKey="v" name={tr("labs.fiV62.s80", { defaultValue: "利差 (bp)" })} fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s81", { defaultValue: "到期收益率" })} value={pct(out.ytm)} />
            <Stat label="Z-spread" value={bp(out.zSpread)} color={C.gold} />
            <Stat label="ASW" value={bp(out.asw)} color={C.teal} />
            <Stat label={tr("labs.fiV62.s82", { defaultValue: "期权成本 (Z−OAS)" })} value={bp(out.optionCost)} color={C.red} />
          </Stats>
          <p className="text-[11px] text-muted-foreground mt-3">曲线 PV = {f(pvCashflows(cfs, zeroAt), 3)}；净价高于曲线 PV 时 Z-spread 转负，说明该券相对曲线偏贵。</p>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 5. Effective duration ── */
function EffRiskPanel() {
  const { t: tr } = useTranslation();
  const [coupon, setCoupon] = useState(0.05);
  const [sigma, setSigma] = useState(0.2);
  const [callable, setCallable] = useState(true);
  const priceFn = useMemo(() => (shift: number) =>
    optionEmbeddedBond({ coupon, maturity: 10, r0: 0.045 + shift, sigma, type: callable ? "call" : "bullet", strike: 100, steps: 30 }).price,
    [coupon, sigma, callable]);
  const out = useMemo(() => effectiveRisk(priceFn, 0.0025), [priceFn]);
  const data = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const s = -0.02 + i * 0.002;
    return { shift: +(s * 1e4).toFixed(0), price: priceFn(s) };
  }), [priceFn]);
  return (
    <Panel title={tr("labs.fiV62.s83", { defaultValue: "有效久期与有效凸性" })} note={tr("labs.fiV62.s84", { defaultValue: "解析久期只对无期权的固定现金流成立。含权债的现金流本身随利率变化，正确做法是对整条曲线上下扰动后重新定价：有效久期 =(P₋−P₊)/(2P₀Δy)，有效凸性 =(P₊+P₋−2P₀)/(P₀Δy²)。可赎回债在低利率区凸性转负，价格被赎回价压住。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s76", { defaultValue: "票息" })} value={coupon} min={0.01} max={0.1} step={0.0025} onChange={setCoupon} />
          <Slider label={tr("labs.fiV62.s85", { defaultValue: "利率波动率 σ" })} value={sigma} min={0.02} max={0.5} step={0.01} onChange={setSigma} />
          <button onClick={() => setCallable((v) => !v)} className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono bg-secondary/40 hover:text-foreground">
            {callable ? tr("labs.fiV62.s86", { defaultValue: "当前：可赎回债" }) : tr("labs.fiV62.s87", { defaultValue: "当前：普通债" })} · 点击切换
          </button>
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="shift" stroke={C.text} fontSize={11} unit="bp" />
              <YAxis stroke={C.text} fontSize={11} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={0} stroke={C.text} strokeDasharray="4 4" />
              <Line dataKey="price" name={tr("labs.fiV62.s88", { defaultValue: "价格" })} stroke={C.gold} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s88", { defaultValue: "价格" })} value={f(out.price, 3)} />
            <Stat label={tr("labs.fiV62.s89", { defaultValue: "有效久期" })} value={f(out.effDuration, 3)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s90", { defaultValue: "有效凸性" })} value={f(out.effConvexity, 2)} color={out.effConvexity < 0 ? C.red : C.teal} />
            <Stat label={tr("labs.fiV62.s91", { defaultValue: "DV01 (每 100 面值)" })} value={f(out.dv01, 4)} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 6. KRD hedge ── */
function KrdPanel() {
  const { t: tr } = useTranslation();
  const [k2, setK2] = useState(1.1);
  const [k5, setK5] = useState(2.2);
  const [k10, setK10] = useState(3.6);
  const out = useMemo(() => keyRateHedge({
    portfolioKrd: [k2, k5, k10], portfolioValue: 100,
    hedgeKrd: [[1.9, 0.05, 0], [0.1, 4.6, 0.1], [0, 0.15, 8.4]],
    hedgeValues: [100, 100, 100],
  }), [k2, k5, k10]);
  const data = [
    { bucket: "2Y", 组合: k2, 对冲后: k2 + out.notional[0] * 1.9 / 100 + out.notional[1] * 0.1 / 100 },
    { bucket: "5Y", 组合: k5, 对冲后: k5 + out.notional[0] * 0.05 / 100 + out.notional[1] * 4.6 / 100 + out.notional[2] * 0.15 / 100 },
    { bucket: "10Y", 组合: k10, 对冲后: k10 + out.notional[1] * 0.1 / 100 + out.notional[2] * 8.4 / 100 },
  ];
  return (
    <Panel title={tr("labs.fiV62.s16", { defaultValue: "关键利率久期对冲" })} note={tr("labs.fiV62.s92", { defaultValue: "平行移动只是曲线风险的一个维度。关键利率久期把总久期拆到各个期限桶上，对冲的任务是用一组基准券把每个桶分别打平——这也是曲线陡峭化/平坦化交易能够单独表达观点的技术前提。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s93", { defaultValue: "2Y 桶 KRD" })} value={k2} min={0} max={5} step={0.1} onChange={setK2} />
          <Slider label={tr("labs.fiV62.s94", { defaultValue: "5Y 桶 KRD" })} value={k5} min={0} max={5} step={0.1} onChange={setK5} />
          <Slider label={tr("labs.fiV62.s95", { defaultValue: "10Y 桶 KRD" })} value={k10} min={0} max={8} step={0.1} onChange={setK10} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="bucket" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={0} stroke={C.text} />
              <Bar dataKey=tr("labs.fiV62.s96", { defaultValue: "组合" }) fill={C.gold} />
              <Bar dataKey=tr("labs.fiV62.s97", { defaultValue: "对冲后" }) fill={C.teal} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s98", { defaultValue: "2Y 对冲名义" })} value={f(out.notional[0], 2)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s99", { defaultValue: "5Y 对冲名义" })} value={f(out.notional[1], 2)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s100", { defaultValue: "10Y 对冲名义" })} value={f(out.notional[2], 2)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s101", { defaultValue: "最大残差" })} value={f(out.maxResidual, 6)} color={C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 7. Immunization ── */
function ImmunizePanel() {
  const { t: tr } = useTranslation();
  const [aD, setAD] = useState(6);
  const [aC, setAC] = useState(60);
  const [lD, setLD] = useState(6);
  const [surplusPv, setSurplusPv] = useState(5);
  const out = useMemo(() => redingtonImmunization({
    assetPv: 100 + surplusPv, assetDuration: aD, assetConvexity: aC,
    liabPv: 100, liabDuration: lD, liabConvexity: 40,
  }), [aD, aC, lD, surplusPv]);
  const data = useMemo(() => Array.from({ length: 41 }, (_, i) => {
    const dy = -0.02 + i * 0.001;
    return { dy: +(dy * 1e4).toFixed(0), surplus: out.surplus(dy) };
  }), [out]);
  return (
    <Panel title={tr("labs.fiV62.s102", { defaultValue: "免疫与久期缺口 (Redington)" })} note={tr("labs.fiV62.s103", { defaultValue: "负债驱动投资的核心不是最大化收益，而是让盈余对利率免疫。Redington 条件要求美元久期匹配、资产凸性高于负债凸性：此时盈余对小幅平行移动一阶不敏感，二阶还是正的。缺口一旦为正，利率上行就直接吃掉资本。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s104", { defaultValue: "资产久期" })} value={aD} min={1} max={15} step={0.1} onChange={setAD} />
          <Slider label={tr("labs.fiV62.s105", { defaultValue: "资产凸性" })} value={aC} min={10} max={200} step={5} onChange={setAC} />
          <Slider label={tr("labs.fiV62.s106", { defaultValue: "负债久期" })} value={lD} min={1} max={15} step={0.1} onChange={setLD} />
          <Slider label={tr("labs.fiV62.s107", { defaultValue: "初始盈余" })} value={surplusPv} min={-20} max={40} step={1} onChange={setSurplusPv} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="dy" stroke={C.text} fontSize={11} unit="bp" />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 4" />
              <Area dataKey="surplus" name={tr("labs.fiV62.s108", { defaultValue: "盈余" })} stroke={C.gold} fill={C.gold} fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s109", { defaultValue: "美元久期缺口" })} value={f(out.dollarGap, 2)} color={Math.abs(out.dollarGap) < 1 ? C.green : C.red} />
            <Stat label={tr("labs.fiV62.s110", { defaultValue: "凸性缺口" })} value={f(out.convexityGap, 1)} color={out.convexityGap >= 0 ? C.teal : C.red} />
            <Stat label={tr("labs.fiV62.s111", { defaultValue: "久期缺口" })} value={f(out.durationGap, 3)} />
            <Stat label={tr("labs.fiV62.s112", { defaultValue: "是否免疫" })} value={out.immunized ? tr("labs.fiV62.s113", { defaultValue: "是" }) : tr("labs.fiV62.s114", { defaultValue: "否" })} color={out.immunized ? C.green : C.red} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 8. Embedded options ── */
function EmbeddedPanel() {
  const { t: tr } = useTranslation();
  const [r0, setR0] = useState(0.045);
  const [sigma, setSigma] = useState(0.2);
  const [strike, setStrike] = useState(100);
  const base = { coupon: 0.05, maturity: 8, r0, sigma, steps: 32 } as const;
  const out = useMemo(() => ({
    bullet: optionEmbeddedBond({ ...base, type: "bullet" }),
    call: optionEmbeddedBond({ ...base, type: "call", strike }),
    put: optionEmbeddedBond({ ...base, type: "put", strike }),
  }), [r0, sigma, strike]);
  const data = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const r = 0.01 + i * 0.005;
    const b = { coupon: 0.05, maturity: 8, r0: r, sigma, steps: 32 } as const;
    return {
      rate: +(r * 100).toFixed(2),
      普通债: optionEmbeddedBond({ ...b, type: "bullet" }).price,
      可赎回: optionEmbeddedBond({ ...b, type: "call", strike }).price,
      可回售: optionEmbeddedBond({ ...b, type: "put", strike }).price,
    };
  }), [sigma, strike]);
  return (
    <Panel title={tr("labs.fiV62.s115", { defaultValue: "可赎回债与可回售债" })} note={tr("labs.fiV62.s116", { defaultValue: "内含期权把债券的价格-利率曲线掰弯：赎回权归发行人，价格在低利率端被赎回价压平（负凸性）；回售权归投资者，价格在高利率端获得下方保护。期权价值 = 普通债价值与含权价值之差，随利率波动率单调上升。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s117", { defaultValue: "短率水平 r₀" })} value={r0} min={0.005} max={0.1} step={0.0025} onChange={setR0} />
          <Slider label={tr("labs.fiV62.s85", { defaultValue: "利率波动率 σ" })} value={sigma} min={0.02} max={0.6} step={0.01} onChange={setSigma} />
          <Slider label={tr("labs.fiV62.s118", { defaultValue: "行权价" })} value={strike} min={90} max={110} step={0.5} onChange={setStrike} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="rate" stroke={C.text} fontSize={11} unit="%" />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={strike} stroke={C.red} strokeDasharray="4 4" />
              <Line dataKey=tr("labs.fiV62.s119", { defaultValue: "普通债" }) stroke={C.text} dot={false} />
              <Line dataKey=tr("labs.fiV62.s120", { defaultValue: "可赎回" }) stroke={C.gold} dot={false} strokeWidth={2} />
              <Line dataKey=tr("labs.fiV62.s121", { defaultValue: "可回售" }) stroke={C.teal} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s119", { defaultValue: "普通债" })} value={f(out.bullet.price, 3)} />
            <Stat label={tr("labs.fiV62.s122", { defaultValue: "可赎回债" })} value={f(out.call.price, 3)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s123", { defaultValue: "赎回期权价值" })} value={f(out.call.optionValue, 3)} color={C.red} />
            <Stat label={tr("labs.fiV62.s124", { defaultValue: "回售期权价值" })} value={f(out.put.optionValue, 3)} color={C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 9. Convertible ── */
function ConvertiblePanel() {
  const { t: tr } = useTranslation();
  const [stock, setStock] = useState(45);
  const [sigma, setSigma] = useState(0.35);
  const [credit, setCredit] = useState(0.06);
  const out = useMemo(() => convertibleBond({ coupon: 0.02, maturity: 5, creditYield: credit, riskFree: 0.03, stock, ratio: 2, sigma }), [stock, sigma, credit]);
  const data = useMemo(() => Array.from({ length: 31 }, (_, i) => {
    const S = 10 + i * 3;
    const r = convertibleBond({ coupon: 0.02, maturity: 5, creditYield: credit, riskFree: 0.03, stock: S, ratio: 2, sigma });
    return { S, 可转债: r.value, 债底: r.bondFloor, 转换平价: r.parity };
  }), [sigma, credit]);
  return (
    <Panel title={tr("labs.fiV62.s125", { defaultValue: "可转债分解：债底 + 转换期权" })} note={tr("labs.fiV62.s126", { defaultValue: "可转债 = 债底 + 股票看涨期权。股价低时债底主导，行为像信用债；股价高时转换平价主导，delta 趋近转换比率；中间是混合区，波动率与信用利差同时定价。转股溢价率衡量你为可选性多付了多少。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s127", { defaultValue: "正股价格" })} value={stock} min={10} max={100} step={1} onChange={setStock} />
          <Slider label={tr("labs.fiV62.s128", { defaultValue: "股票波动率" })} value={sigma} min={0.1} max={0.9} step={0.01} onChange={setSigma} />
          <Slider label={tr("labs.fiV62.s129", { defaultValue: "信用收益率" })} value={credit} min={0.02} max={0.2} step={0.005} onChange={setCredit} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="S" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine x={stock} stroke={C.red} strokeDasharray="4 4" />
              <Line dataKey=tr("labs.fiV62.s130", { defaultValue: "可转债" }) stroke={C.gold} dot={false} strokeWidth={2} />
              <Line dataKey=tr("labs.fiV62.s131", { defaultValue: "债底" }) stroke={C.teal} dot={false} strokeDasharray="4 3" />
              <Line dataKey=tr("labs.fiV62.s132", { defaultValue: "转换平价" }) stroke={C.text} dot={false} strokeDasharray="2 3" />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s133", { defaultValue: "理论价值" })} value={f(out.value, 2)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s131", { defaultValue: "债底" })} value={f(out.bondFloor, 2)} color={C.teal} />
            <Stat label="Delta" value={f(out.delta, 3)} />
            <Stat label={tr("labs.fiV62.s134", { defaultValue: "所处区间" })} value={out.regime === "bond" ? tr("labs.fiV62.s135", { defaultValue: "债性" }) : out.regime === "equity" ? tr("labs.fiV62.s136", { defaultValue: "股性" }) : tr("labs.fiV62.s137", { defaultValue: "混合" })} color={C.red} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 10. Credit spread decomposition ── */
function CreditDecPanel() {
  const { t: tr } = useTranslation();
  const [obs, setObs] = useState(0.015);
  const [pd, setPd] = useState(0.01);
  const [lgd, setLgd] = useState(0.6);
  const [liq, setLiq] = useState(0.003);
  const out = useMemo(() => creditSpreadDecomposition({
    observedSpread: obs, pd, lgd, riskPremiumMultiple: 2, liquidityPremium: liq, taxRate: 0.2, couponYield: 0.005,
  }), [obs, pd, lgd, liq]);
  const data = [
    { name: tr("labs.fiV62.s138", { defaultValue: "预期损失" }), v: out.expectedLoss * 1e4 },
    { name: tr("labs.fiV62.s139", { defaultValue: "风险溢价" }), v: out.riskPremium * 1e4 },
    { name: tr("labs.fiV62.s140", { defaultValue: "流动性" }), v: out.liquidityPremium * 1e4 },
    { name: tr("labs.fiV62.s141", { defaultValue: "税收" }), v: out.tax * 1e4 },
    { name: tr("labs.fiV62.s142", { defaultValue: "残差" }), v: out.residual * 1e4 },
  ];
  return (
    <Panel title={tr("labs.fiV62.s143", { defaultValue: "信用利差分解与信用利差之谜" })} note={tr("labs.fiV62.s144", { defaultValue: "投资级债券的利差远高于历史违约损失所能解释的部分——这就是信用利差之谜。把观测利差拆成预期损失、承担违约风险的溢价、流动性补偿与税收效应后，通常仍有相当比例落在残差里，提示模型之外的定价因素。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s145", { defaultValue: "观测利差" })} value={obs} min={0.002} max={0.06} step={0.001} onChange={setObs} />
          <Slider label={tr("labs.fiV62.s146", { defaultValue: "年化违约概率" })} value={pd} min={0.0005} max={0.06} step={0.0005} onChange={setPd} />
          <Slider label={tr("labs.fiV62.s147", { defaultValue: "违约损失率 LGD" })} value={lgd} min={0.1} max={0.9} step={0.05} onChange={setLgd} />
          <Slider label={tr("labs.fiV62.s148", { defaultValue: "流动性溢价" })} value={liq} min={0} max={0.02} step={0.0005} onChange={setLiq} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} unit="bp" />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke={C.text} />
              <Bar dataKey="v" name={tr("labs.fiV62.s149", { defaultValue: "贡献 (bp)" })} fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s150", { defaultValue: "预期损失占比" })} value={pct(out.shares.expectedLoss)} color={C.teal} />
            <Stat label={tr("labs.fiV62.s151", { defaultValue: "流动性占比" })} value={pct(out.shares.liquidity)} />
            <Stat label={tr("labs.fiV62.s152", { defaultValue: "残差占比" })} value={pct(out.shares.residual)} color={C.red} />
            <Stat label={tr("labs.fiV62.s153", { defaultValue: "利差之谜" })} value={out.creditSpreadPuzzle ? tr("labs.fiV62.s154", { defaultValue: "成立" }) : tr("labs.fiV62.s155", { defaultValue: "不成立" })} color={out.creditSpreadPuzzle ? C.red : C.green} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 11. Rating migration ── */
function MigrationPanel() {
  const { t: tr } = useTranslation();
  const [downgrade, setDowngrade] = useState(0.08);
  const [start, setStart] = useState(0);
  const matrix = useMemo(() => {
    const d = downgrade;
    return [
      [1 - d - 0.005, d, 0.004, 0.001],
      [0.05, 1 - d - 0.06, d, 0.01],
      [0.01, 0.10, 1 - d - 0.15, d + 0.04],
      [0, 0, 0, 1],
    ];
  }, [downgrade]);
  const out = useMemo(() => ratingMigration({
    matrix, startRating: start, horizons: [1, 2, 3, 5, 7, 10],
    spreadsByRating: [0.005, 0.012, 0.035, 1], duration: 5,
  }), [matrix, start]);
  const data = out.results.map((r) => ({
    horizon: r.horizon, AAA: r.distribution[0] * 100, A: r.distribution[1] * 100,
    BB: r.distribution[2] * 100, 违约: r.defaultProb * 100, VaR: r.var,
  }));
  return (
    <Panel title={tr("labs.fiV62.s156", { defaultValue: "评级迁移矩阵与迁移风险 VaR" })} note={tr("labs.fiV62.s157", { defaultValue: "信用风险不止违约：评级下调本身就通过利差重估造成损失。把一年期迁移矩阵做矩阵幂即可得到多期分布，累积违约概率随期限凸性上升；把各状态的利差变化折算成损失后取分位数，就是 CreditMetrics 式的迁移风险 VaR。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s158", { defaultValue: "下调强度" })} value={downgrade} min={0.01} max={0.2} step={0.005} onChange={setDowngrade} />
          <Slider label={tr("labs.fiV62.s159", { defaultValue: "初始评级 (0=最高)" })} value={start} min={0} max={2} step={1} onChange={setStart} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="horizon" stroke={C.text} fontSize={11} unit="y" />
              <YAxis stroke={C.text} fontSize={11} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area dataKey="AAA" stackId="1" stroke={C.teal} fill={C.teal} fillOpacity={0.35} />
              <Area dataKey="A" stackId="1" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
              <Area dataKey="BB" stackId="1" stroke={C.text} fill={C.text} fillOpacity={0.25} />
              <Area dataKey=tr("labs.fiV62.s160", { defaultValue: "违约" }) stackId="1" stroke={C.red} fill={C.red} fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s161", { defaultValue: "1 年违约率" })} value={pct(out.results[0].defaultProb)} />
            <Stat label={tr("labs.fiV62.s162", { defaultValue: "10 年违约率" })} value={pct(out.results[5].defaultProb)} color={C.red} />
            <Stat label={tr("labs.fiV62.s163", { defaultValue: "10 年期望利差" })} value={bp(out.results[5].expectedSpread)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s164", { defaultValue: "迁移 VaR (99%)" })} value={f(out.results[5].var, 3)} color={C.red} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 12. Waterfall ── */
function WaterfallPanel() {
  const { t: tr } = useTranslation();
  const [lossRate, setLossRate] = useState(0.08);
  const [seniorSize, setSeniorSize] = useState(70);
  const [ocTrigger, setOcTrigger] = useState(1.0);
  const tranches = useMemo(() => [
    { name: tr("labs.fiV62.s165", { defaultValue: "A 优先" }), size: seniorSize, coupon: 0.04 },
    { name: tr("labs.fiV62.s166", { defaultValue: "B 夹层" }), size: (100 - seniorSize) * 0.65, coupon: 0.07 },
    { name: tr("labs.fiV62.s167", { defaultValue: "C 股权" }), size: (100 - seniorSize) * 0.35, coupon: 0.12 },
  ], [seniorSize]);
  const out = useMemo(() => waterfall({ poolPrincipal: 100, poolInterest: 6, lossRate, tranches, ocTrigger }), [lossRate, tranches, ocTrigger]);
  const data = out.tranches.map((item) => ({ name: item.name, 本金偿付: item.principalPaid, 减记: item.writedown, 利息: item.interestPaid }));
  return (
    <Panel title={tr("labs.fiV62.s168", { defaultValue: "分层瀑布与超额抵押触发" })} note={tr("labs.fiV62.s169", { defaultValue: "结构化产品的风险分配写在现金流瀑布里：本金按优先级顺序偿付，损失自下而上吞噬。超额抵押触发一旦被击穿，利息会被强制改道去偿还优先级本金——这正是危机中夹层持有人一夜之间断流的机制。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s170", { defaultValue: "资产池损失率" })} value={lossRate} min={0} max={0.5} step={0.01} onChange={setLossRate} />
          <Slider label={tr("labs.fiV62.s171", { defaultValue: "优先层厚度" })} value={seniorSize} min={40} max={90} step={1} onChange={setSeniorSize} />
          <Slider label={tr("labs.fiV62.s172", { defaultValue: "OC 触发水平" })} value={ocTrigger} min={0.8} max={1.1} step={0.01} onChange={setOcTrigger} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey=tr("labs.fiV62.s173", { defaultValue: "本金偿付" }) stackId="a" fill={C.teal} />
              <Bar dataKey=tr("labs.fiV62.s174", { defaultValue: "减记" }) stackId="a" fill={C.red} />
              <Bar dataKey=tr("labs.fiV62.s175", { defaultValue: "利息" }) fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s176", { defaultValue: "资产池损失" })} value={f(out.loss, 2)} color={C.red} />
            <Stat label={tr("labs.fiV62.s177", { defaultValue: "OC 比率" })} value={f(out.ocRatio, 4)} color={out.triggered ? C.red : C.teal} />
            <Stat label={tr("labs.fiV62.s178", { defaultValue: "触发状态" })} value={out.triggered ? tr("labs.fiV62.s179", { defaultValue: "已击穿" }) : tr("labs.fiV62.s180", { defaultValue: "正常" })} color={out.triggered ? C.red : C.green} />
            <Stat label={tr("labs.fiV62.s181", { defaultValue: "股权残值" })} value={f(out.equityResidual, 2)} color={C.gold} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 13. Copula tranche ── */
function CopulaPanel() {
  const { t: tr } = useTranslation();
  const [pd, setPd] = useState(0.05);
  const [rho, setRho] = useState(0.2);
  const [lgd, setLgd] = useState(0.6);
  const slices = [
    { name: tr("labs.fiV62.s182", { defaultValue: "0–3% 股权" }), attach: 0, detach: 0.03 },
    { name: tr("labs.fiV62.s183", { defaultValue: "3–7% 夹层" }), attach: 0.03, detach: 0.07 },
    { name: tr("labs.fiV62.s184", { defaultValue: "7–15% 高级夹层" }), attach: 0.07, detach: 0.15 },
    { name: tr("labs.fiV62.s185", { defaultValue: "15–30% 优先" }), attach: 0.15, detach: 0.30 },
  ];
  const out = useMemo(() => slices.map((s) => ({
    name: s.name,
    ...gaussianCopulaTranche({ pd, rho, lgd, attach: s.attach, detach: s.detach }),
  })), [pd, rho, lgd]);
  const rhoCurve = useMemo(() => Array.from({ length: 19 }, (_, i) => {
    const r = 0.02 + i * 0.05;
    return {
      rho: +r.toFixed(2),
      股权: gaussianCopulaTranche({ pd, rho: r, lgd, attach: 0, detach: 0.03 }).expectedTrancheLoss,
      夹层: gaussianCopulaTranche({ pd, rho: r, lgd, attach: 0.03, detach: 0.07 }).expectedTrancheLoss,
      优先: gaussianCopulaTranche({ pd, rho: r, lgd, attach: 0.15, detach: 0.30 }).expectedTrancheLoss,
    };
  }), [pd, lgd]);
  return (
    <Panel title={tr("labs.fiV62.s186", { defaultValue: "单因子高斯 copula 分层" })} note={tr("labs.fiV62.s187", { defaultValue: "相关性不改变资产池的期望损失，只改变损失在分层之间的分配：相关性上升时，全体一起违约与全体都不违约的概率同时上升，股权层反而受益，优先层被显著损害。这就是相关性微笑与 2007 年「AAA 也会破」的定价根源。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s188", { defaultValue: "单笔违约概率" })} value={pd} min={0.005} max={0.3} step={0.005} onChange={setPd} />
          <Slider label={tr("labs.fiV62.s189", { defaultValue: "资产相关性 ρ" })} value={rho} min={0.01} max={0.9} step={0.01} onChange={setRho} />
          <Slider label="LGD" value={lgd} min={0.2} max={0.9} step={0.05} onChange={setLgd} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rhoCurve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="rho" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine x={rho} stroke={C.red} strokeDasharray="4 4" />
              <Line dataKey=tr("labs.fiV62.s190", { defaultValue: "股权" }) stroke={C.red} dot={false} />
              <Line dataKey=tr("labs.fiV62.s191", { defaultValue: "夹层" }) stroke={C.gold} dot={false} />
              <Line dataKey=tr("labs.fiV62.s192", { defaultValue: "优先" }) stroke={C.teal} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            {out.map((item) => (
              <Stat key={item.name} label={item.name} value={pct(t.expectedTrancheLoss)} color={C.gold} />
            ))}
          </Stats>
          <p className="text-[11px] text-muted-foreground mt-3">资产池期望损失 {pct(out[0].expectedPoolLoss)}，与 ρ 无关；变化的只是它在各层之间的切分。</p>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 14. CDS-bond basis ── */
function BasisPanel() {
  const { t: tr } = useTranslation();
  const [cds, setCds] = useState(0.012);
  const [z, setZ] = useState(0.02);
  const [repo, setRepo] = useState(0.001);
  const [funding, setFunding] = useState(0.002);
  const out = useMemo(() => cdsBondBasis({ cdsSpread: cds, bondZSpread: z, repoCost: repo, fundingSpread: funding }), [cds, z, repo, funding]);
  const data = [
    { name: tr("labs.fiV62.s193", { defaultValue: "CDS (合成)" }), v: out.syntheticSpread * 1e4 },
    { name: tr("labs.fiV62.s194", { defaultValue: "现券 (净融资后)" }), v: out.cashSpread * 1e4 },
    { name: tr("labs.fiV62.s195", { defaultValue: "基差" }), v: out.basis * 1e4 },
  ];
  return (
    <Panel title={tr("labs.fiV62.s32", { defaultValue: "CDS-债券基差" })} note={tr("labs.fiV62.s196", { defaultValue: "同一个信用主体有两种表达：买现券 + 融资，或卖出保护。理论上两者利差应当相等，实际上融资成本、回购便利与资产负债表约束会撕开一个基差。负基差意味着现券便宜，但把它捞回来需要能持续融资——2008 年正是融资先断裂。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s197", { defaultValue: "CDS 利差" })} value={cds} min={0.001} max={0.06} step={0.0005} onChange={setCds} />
          <Slider label={tr("labs.fiV62.s198", { defaultValue: "债券 Z-spread" })} value={z} min={0.001} max={0.08} step={0.0005} onChange={setZ} />
          <Slider label={tr("labs.fiV62.s199", { defaultValue: "回购成本" })} value={repo} min={0} max={0.02} step={0.0005} onChange={setRepo} />
          <Slider label={tr("labs.fiV62.s200", { defaultValue: "融资利差" })} value={funding} min={0} max={0.02} step={0.0005} onChange={setFunding} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} unit="bp" />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke={C.text} />
              <Bar dataKey="v" name={tr("labs.fiV62.s80", { defaultValue: "利差 (bp)" })} fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s195", { defaultValue: "基差" })} value={bp(out.basis)} color={out.basis < 0 ? C.red : C.teal} />
            <Stat label={tr("labs.fiV62.s201", { defaultValue: "方向" })} value={out.sign === "negative" ? tr("labs.fiV62.s202", { defaultValue: "负基差" }) : out.sign === "positive" ? tr("labs.fiV62.s203", { defaultValue: "正基差" }) : tr("labs.fiV62.s204", { defaultValue: "持平" })} />
            <Stat label={tr("labs.fiV62.s205", { defaultValue: "是否可套" })} value={out.arbitrage ? tr("labs.fiV62.s206", { defaultValue: "超过 20bp" }) : tr("labs.fiV62.s207", { defaultValue: "在摩擦内" })} color={out.arbitrage ? C.gold : C.text} />
            <Stat label={tr("labs.fiV62.s208", { defaultValue: "交易方向" })} value={out.basis < 0 ? tr("labs.fiV62.s209", { defaultValue: "买券+买保护" }) : tr("labs.fiV62.s210", { defaultValue: "卖券+卖保护" })} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 15. MBS ── */
function MbsPanel() {
  const { t: tr } = useTranslation();
  const [wac, setWac] = useState(0.055);
  const [cpr, setCpr] = useState(0.08);
  const [refi, setRefi] = useState(8);
  const out = useMemo(() => mbsNegativeConvexity({ wac, baseCpr: cpr, refiSensitivity: refi, maturity: 20 }), [wac, cpr, refi]);
  const data = out.curve.map((p) => ({ shift: +(p.shift * 1e4).toFixed(0), price: p.price }));
  return (
    <Panel title={tr("labs.fiV62.s211", { defaultValue: "MBS 提前还款与负凸性" })} note={tr("labs.fiV62.s212", { defaultValue: "房贷借款人手里握着一份免费的再融资期权。利率下行时提前还款加速，MBS 久期反而缩短，投资者被迫在低利率再投资；利率上行时提前还款枯竭，久期拉长——这种「两头挨打」的久期漂移就是负凸性，也是对冲组合需要不断再平衡的原因。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s213", { defaultValue: "加权平均票息 WAC" })} value={wac} min={0.02} max={0.09} step={0.0025} onChange={setWac} />
          <Slider label={tr("labs.fiV62.s214", { defaultValue: "基准 CPR" })} value={cpr} min={0.02} max={0.3} step={0.01} onChange={setCpr} />
          <Slider label={tr("labs.fiV62.s215", { defaultValue: "再融资敏感度" })} value={refi} min={0} max={25} step={0.5} onChange={setRefi} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="shift" stroke={C.text} fontSize={11} unit="bp" />
              <YAxis stroke={C.text} fontSize={11} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={0} stroke={C.text} strokeDasharray="4 4" />
              <Line dataKey="price" name={tr("labs.fiV62.s216", { defaultValue: "MBS 价格" })} stroke={C.gold} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s88", { defaultValue: "价格" })} value={f(out.price, 2)} />
            <Stat label={tr("labs.fiV62.s89", { defaultValue: "有效久期" })} value={f(out.effDuration, 3)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s217", { defaultValue: "低利率久期" })} value={f(out.durationLowRates, 3)} color={C.teal} />
            <Stat label={tr("labs.fiV62.s218", { defaultValue: "高利率久期" })} value={f(out.durationHighRates, 3)} color={C.red} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 16. Repo leverage & spiral ── */
function RepoPanel() {
  const { t: tr } = useTranslation();
  const [haircut, setHaircut] = useState(0.05);
  const [assetYield, setAssetYield] = useState(0.04);
  const [repoRate, setRepoRate] = useState(0.025);
  const [shock, setShock] = useState(0.05);
  const lev = useMemo(() => repoLeverage({ equity: 10, haircut, assetYield, repoRate, duration: 5, yieldShock: 0.01 }), [haircut, assetYield, repoRate]);
  const spiral = useMemo(() => marginSpiral({ equity: 10, assets: lev.assets, haircut0: haircut, haircutShock: shock, priceImpact: 0.05 }), [lev.assets, haircut, shock]);
  const data = spiral.path.map((p) => ({ round: p.round, 资产: p.assets, 权益: p.equity, 价格: p.price * 100 }));
  return (
    <Panel title={tr("labs.fiV62.s219", { defaultValue: "回购杠杆与保证金螺旋" })} note={tr("labs.fiV62.s220", { defaultValue: "回购让固定收益组合可以用很薄的权益撑起很大的资产：杠杆同时放大 carry 与久期风险，击穿点往往只有几十个基点。当折扣率因市场压力上升，被迫抛售压低价格，价格下跌又进一步侵蚀权益——这就是 Brunnermeier-Pedersen 的融资流动性螺旋。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s221", { defaultValue: "折扣率 haircut" })} value={haircut} min={0.01} max={0.25} step={0.005} onChange={setHaircut} />
          <Slider label={tr("labs.fiV62.s222", { defaultValue: "资产收益率" })} value={assetYield} min={0} max={0.1} step={0.0025} onChange={setAssetYield} />
          <Slider label={tr("labs.fiV62.s223", { defaultValue: "回购利率" })} value={repoRate} min={0} max={0.08} step={0.0025} onChange={setRepoRate} />
          <Slider label={tr("labs.fiV62.s224", { defaultValue: "折扣率冲击" })} value={shock} min={0} max={0.2} step={0.005} onChange={setShock} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="round" stroke={C.text} fontSize={11} />
              <YAxis yAxisId="l" stroke={C.text} fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line yAxisId="l" dataKey=tr("labs.fiV62.s225", { defaultValue: "资产" }) stroke={C.gold} dot={false} />
              <Line yAxisId="l" dataKey=tr("labs.fiV62.s226", { defaultValue: "权益" }) stroke={C.red} dot={false} strokeWidth={2} />
              <Line yAxisId="r" dataKey=tr("labs.fiV62.s88", { defaultValue: "价格" }) stroke={C.teal} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s227", { defaultValue: "杠杆倍数" })} value={f(lev.leverage, 2) + "×"} color={C.gold} />
            <Stat label={tr("labs.fiV62.s228", { defaultValue: "权益回报 ROE" })} value={pct(lev.roe)} color={lev.roe > 0 ? C.green : C.red} />
            <Stat label={tr("labs.fiV62.s229", { defaultValue: "击穿冲击" })} value={bp(lev.wipeoutShock)} color={C.red} />
            <Stat label={tr("labs.fiV62.s230", { defaultValue: "被迫抛售" })} value={f(spiral.totalSold, 1)} color={C.red} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 17. RFR & negative rates ── */
function RfrPanel() {
  const { t: tr } = useTranslation();
  const [level, setLevel] = useState(0.03);
  const [vol, setVol] = useState(0.006);
  const [fwd, setFwd] = useState(-0.002);
  const [shift, setShift] = useState(0.03);
  const path = useMemo(() => Array.from({ length: 90 }, (_, i) => level + vol * Math.sin(i / 8)), [level, vol]);
  const out = useMemo(() => rfrCompounding({ overnightPath: path, termFixing: level + 0.002, historicalBasis: [0.0008, 0.0012, 0.0026] }), [path, level]);
  const caplets = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const K = -0.01 + i * 0.002;
    const r = shiftedLognormalCaplet({ forward: fwd, strike: K, sigma: 0.4, T: 2, shift, tau: 0.5, discount: 0.98 });
    return { strike: +(K * 100).toFixed(2), price: r.valid ? r.price * 1e4 : null };
  }), [fwd, shift]);
  const data = path.map((r, i) => ({ day: i + 1, overnight: r * 100 }));
  return (
    <Panel title={tr("labs.fiV62.s231", { defaultValue: "RFR 改革与负利率定价" })} note={tr("labs.fiV62.s232", { defaultValue: "LIBOR 是前瞻的定盘报价，SOFR 类无风险利率是后视的隔夜复利：期初你并不知道利息是多少。复利相对简单平均有正的凸性收益；转换旧合约需要 ISDA 式的历史中位数 fallback 利差。负利率则让对数正态失效，位移对数正态把远期和行权价整体平移回正区间。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s233", { defaultValue: "隔夜利率中枢" })} value={level} min={-0.01} max={0.08} step={0.0025} onChange={setLevel} />
          <Slider label={tr("labs.fiV62.s234", { defaultValue: "隔夜波动幅度" })} value={vol} min={0} max={0.02} step={0.0005} onChange={setVol} />
          <Slider label={tr("labs.fiV62.s235", { defaultValue: "caplet 远期" })} value={fwd} min={-0.02} max={0.04} step={0.001} onChange={setFwd} />
          <Slider label={tr("labs.fiV62.s236", { defaultValue: "位移参数 shift" })} value={shift} min={0.005} max={0.08} step={0.0025} onChange={setShift} />
        </Controls>
        <div>
          <div className="grid lg:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke={C.text} fontSize={11} />
                <YAxis stroke={C.text} fontSize={11} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line dataKey="overnight" name={tr("labs.fiV62.s237", { defaultValue: "隔夜路径" })} stroke={C.gold} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={caplets}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="strike" stroke={C.text} fontSize={11} unit="%" />
                <YAxis stroke={C.text} fontSize={11} unit="bp" />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine x={0} stroke={C.red} strokeDasharray="4 4" />
                <Line dataKey="price" name={tr("labs.fiV62.s238", { defaultValue: "位移对数正态 caplet" })} stroke={C.teal} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Stats>
            <Stat label={tr("labs.fiV62.s239", { defaultValue: "后视复利利率" })} value={pct(out.compounded, 3)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s240", { defaultValue: "简单平均" })} value={pct(out.simpleAverage, 3)} />
            <Stat label={tr("labs.fiV62.s241", { defaultValue: "复利凸性收益" })} value={bp(out.convexityGain, 2)} color={C.teal} />
            <Stat label={tr("labs.fiV62.s242", { defaultValue: "fallback 利差" })} value={bp(out.fallbackSpread)} color={C.red} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 18. Green & liquidity ── */
function GreenPanel() {
  const { t: tr } = useTranslation();
  const [demand, setDemand] = useState(2);
  const [carbon, setCarbon] = useState(0.3);
  const [carbonPrice, setCarbonPrice] = useState(0.04);
  const [trades, setTrades] = useState(5);
  const green = useMemo(() => greeniumSpread({ baselineSpread: 0.012, greenLabel: true, investorDemand: demand, carbonIntensity: 0, transitionBeta: 0.5, carbonPrice, duration: 6 }), [demand, carbonPrice]);
  const brown = useMemo(() => greeniumSpread({ baselineSpread: 0.012, greenLabel: false, investorDemand: 0, carbonIntensity: carbon, transitionBeta: 0.5, carbonPrice, duration: 6 }), [carbon, carbonPrice]);
  const liq = useMemo(() => bondLiquidityPremium({ turnover: trades / 10, tradesPerDay: trades, quotedSpread: 0.008, volatility: 0.06, holdingPeriod: 2 }), [trades]);
  const data = [
    { name: tr("labs.fiV62.s243", { defaultValue: "基准利差" }), v: 0.012 * 1e4 },
    { name: tr("labs.fiV62.s244", { defaultValue: "绿色债" }), v: green.spread * 1e4 },
    { name: tr("labs.fiV62.s245", { defaultValue: "高碳债" }), v: brown.spread * 1e4 },
    { name: tr("labs.fiV62.s148", { defaultValue: "流动性溢价" }), v: liq.liquidityPremium * 1e4 },
  ];
  return (
    <Panel title={tr("labs.fiV62.s246", { defaultValue: "气候利差与债券流动性溢价" })} note={tr("labs.fiV62.s247", { defaultValue: "两类难以进入传统模型的定价因素：一是气候，绿色标签带来需求驱动的负溢价，高碳排放暴露则要求转型风险补偿；二是流动性，公司债成交稀疏，报价价差要按持有期摊销，还要加上搜寻成本与 Amihud 式的价格冲击补偿。" })}>
      <Grid>
        <Controls>
          <Slider label={tr("labs.fiV62.s248", { defaultValue: "ESG 需求强度" })} value={demand} min={0} max={6} step={0.25} onChange={setDemand} />
          <Slider label={tr("labs.fiV62.s249", { defaultValue: "碳强度暴露" })} value={carbon} min={0} max={1} step={0.05} onChange={setCarbon} />
          <Slider label={tr("labs.fiV62.s250", { defaultValue: "碳价水平" })} value={carbonPrice} min={0} max={0.15} step={0.005} onChange={setCarbonPrice} />
          <Slider label={tr("labs.fiV62.s251", { defaultValue: "日均成交笔数" })} value={trades} min={0.5} max={60} step={0.5} onChange={setTrades} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} unit="bp" />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0.012 * 1e4} stroke={C.text} strokeDasharray="4 4" />
              <Bar dataKey="v" name={tr("labs.fiV62.s80", { defaultValue: "利差 (bp)" })} fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label={tr("labs.fiV62.s252", { defaultValue: "绿色溢价" })} value={bp(green.greenium)} color={C.green} />
            <Stat label={tr("labs.fiV62.s253", { defaultValue: "转型风险贴水" })} value={bp(brown.transitionPremium)} color={C.red} />
            <Stat label={tr("labs.fiV62.s148", { defaultValue: "流动性溢价" })} value={bp(liq.liquidityPremium)} color={C.gold} />
            <Stat label={tr("labs.fiV62.s254", { defaultValue: "流动性状态" })} value={liq.illiquid ? tr("labs.fiV62.s255", { defaultValue: "稀薄" }) : tr("labs.fiV62.s256", { defaultValue: "尚可" })} color={liq.illiquid ? C.red : C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

export default function V62FixedIncomeTools() {
  const { t: tr, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const [tab, setTab] = useToolTab<Tab>(TAB_IDS, "bootstrap");
  const cat: Cat = TABS.find((t) => t.id === tab)!.cat;
  const inCat = TABS.filter((t) => t.cat === cat);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V6.2 · Fixed Income Frontier</p>
        <h2 className="text-2xl font-serif text-foreground">{tr("labs.fiFrontier.title")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          {tr("labs.fiFrontier.intro")}{" "}
          <Link to="/s/fixed-income-lab" className="text-gold hover:underline">/s/fixed-income-lab</Link>{" "}
          {tr("labs.fiFrontier.introMid")}{" "}
          <Link to="/s/fixed-income-theory" className="text-gold hover:underline">{tr("labs.fiFrontier.theoryLink")}</Link>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c.id}
              onClick={() => setTab(TABS.find((t) => t.cat === c.id)!.id)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                cat === c.id ? "bg-gold/15 border-gold/60 text-gold"
                             : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{c.kicker}</span>{isEn ? c.labelEn : c.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {inCat.map((item) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md border text-[11px] transition-colors ${
                tab === t.id ? "bg-secondary border-gold/40 text-foreground"
                             : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground"
              }`}>
              {isEn ? t.titleEn : t.title}
              <span className="ml-2 text-[10px] text-muted-foreground/70 hidden md:inline">{isEn ? t.descEn : t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "bootstrap" && <BootstrapPanel />}
        {tab === "interp" && <InterpPanel />}
        {tab === "roll" && <RollPanel />}
        {tab === "taxonomy" && <TaxonomyPanel />}
        {tab === "effrisk" && <EffRiskPanel />}
        {tab === "krd" && <KrdPanel />}
        {tab === "immunize" && <ImmunizePanel />}
        {tab === "embedded" && <EmbeddedPanel />}
        {tab === "convertible" && <ConvertiblePanel />}
        {tab === "creditdec" && <CreditDecPanel />}
        {tab === "migration" && <MigrationPanel />}
        {tab === "waterfall" && <WaterfallPanel />}
        {tab === "copula" && <CopulaPanel />}
        {tab === "basis" && <BasisPanel />}
        {tab === "mbs" && <MbsPanel />}
        {tab === "repo" && <RepoPanel />}
        {tab === "rfr" && <RfrPanel />}
        {tab === "green" && <GreenPanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">{tr("labs.nav.references")}</p>
        <p>
          Macaulay (1938) Some Theoretical Problems Suggested by the Movements of Interest Rates ·
          Redington (1952) Review of the Principles of Life-Office Valuations · Fisher-Weil (1971) Coping with the Risk of Interest-Rate Fluctuations ·
          Ho (1992) Key Rate Durations · Nelson-Siegel (1987) / Svensson (1994) · Vasicek (1977) · Cox-Ingersoll-Ross (1985) ·
          Hull-White (1990) Pricing Interest-Rate Derivative Securities · Heath-Jarrow-Morton (1992) · Brace-Gatarek-Musiela (1997) ·
          Merton (1974) On the Pricing of Corporate Debt · Jarrow-Turnbull (1995) · Duffie-Singleton (1999) ·
          Longstaff-Mithal-Neis (2005) Corporate Yield Spreads · Collin-Dufresne et al. (2001) The Determinants of Credit Spread Changes ·
          Li (2000) On Default Correlation: A Copula Function Approach · Coval-Jurek-Stafford (2009) The Economics of Structured Finance ·
          Brunnermeier-Pedersen (2009) Market Liquidity and Funding Liquidity · Amihud-Mendelson (1986) ·
          Zerbib (2019) The Effect of Pro-Environmental Preferences on Bond Prices · ISDA (2020) IBOR Fallbacks Protocol.
        </p>
        <p className="mt-2">全部为教学级简写模型：树与求积规模限制在浏览器内即时响应的量级，插值、瀑布与螺旋均为确定性计算，不作为实盘定价或风控参数使用。</p>
      </div>
    </section>
  );
}
