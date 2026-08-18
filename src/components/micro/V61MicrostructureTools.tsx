import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, Area, AreaChart,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import {
  garmanInventory, stollDecomposition, hoStollQuotes,
  estimatePIN, simulatePinDays, pinValue, vpin,
  makeOrTake, queueFillProbability, zeroIntelligenceLOB, hawkesTrades,
  spreadDecomposition, corwinSchultzSpread, classifyTrades,
  squareRootImpact, priceDiscovery,
  tickSizeEffect, callAuctionVsContinuous, circuitBreakerSim,
  darkPoolSplit, liquidityEvaporation, amihudMendelson,
  lcg, gauss,
} from "@/lib/quant/microstructure";

type Cat = "inventory" | "info" | "lob" | "cost" | "design";
type Tab =
  | "garman" | "stoll" | "hostoll"
  | "pin" | "vpin"
  | "maketake" | "zilob" | "hawkes"
  | "spread" | "impact" | "discovery"
  | "tick" | "auction" | "breaker" | "dark" | "resilience" | "premium";

const CATS: { id: Cat; label: string; kicker: string }[] = [
  { id: "inventory", label: "做市与库存", kicker: "Inventory" },
  { id: "info",      label: "信息与毒性", kicker: "Information" },
  { id: "lob",       label: "限价订单簿", kicker: "Order Book" },
  { id: "cost",      label: "成本与价格发现", kicker: "Cost & Discovery" },
  { id: "design",    label: "市场设计与韧性", kicker: "Market Design" },
];

const TABS: { id: Tab; cat: Cat; title: string; desc: string }[] = [
  { id: "garman",     cat: "inventory", title: "Garman 存货流",     desc: "做市商作为排队系统，流量失衡即破产" },
  { id: "stoll",      cat: "inventory", title: "Stoll 价差分解",    desc: "订单处理 / 库存 / 逆向选择三成分" },
  { id: "hostoll",    cat: "inventory", title: "Ho-Stoll 报价偏移", desc: "库存偏离 → 保留价与双边报价歪斜" },
  { id: "pin",        cat: "info",      title: "PIN 知情交易概率",  desc: "EHO 混合泊松似然的数值估计" },
  { id: "vpin",       cat: "info",      title: "VPIN 订单流毒性",   desc: "等量成交桶 + 滚动买卖失衡" },
  { id: "maketake",   cat: "lob",       title: "Make-or-Take 决策", desc: "限价单期权价值 vs 市价单即时成本 + 排队" },
  { id: "zilob",      cat: "lob",       title: "零智能订单簿仿真",  desc: "限价 / 市价 / 撤单三泊松流 → 价差与深度" },
  { id: "hawkes",     cat: "lob",       title: "Hawkes 成交自激",   desc: "分支比、聚集强度与稳态成交率" },
  { id: "spread",     cat: "cost",      title: "价差口径与成交标注", desc: "有效 = 已实现 + 冲击；Corwin-Schultz；Lee-Ready" },
  { id: "impact",     cat: "cost",      title: "平方根冲击定律",    desc: "ΔP/P = Yσ(Q/V)^δ 与永久/临时拆分" },
  { id: "discovery",  cat: "cost",      title: "价格发现与信息份额", desc: "Hasbrouck IS 上下界 + Gonzalo-Granger" },
  { id: "tick",       cat: "design",    title: "最小报价单位",      desc: "tick 约束、排队租金与深度堆积" },
  { id: "auction",    cat: "design",    title: "集合竞价 vs 连续",  desc: "批量撮合对噪声的合并效应" },
  { id: "breaker",    cat: "design",    title: "熔断与波动中断",    desc: "触发次数、冷却效应与磁吸代理" },
  { id: "dark",       cat: "design",    title: "暗池分流",          desc: "撇脂效应 → 显示流动性与价差恶化" },
  { id: "resilience", cat: "design",    title: "流动性蒸发与韧性",  desc: "价差冲击半衰期与反馈螺旋" },
  { id: "premium",    cat: "design",    title: "流动性溢价",        desc: "Amihud-Mendelson 摊销价差与持有期客群" },
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
const Controls = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-4">{children}</div>
);
const Stats = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">{children}</div>
);
const f = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "∞");

/* ── 1. Garman ── */
function GarmanPanel() {
  const [lb, setLb] = useState(6);
  const [ls, setLs] = useState(5);
  const [inv, setInv] = useState(60);
  const [hs, setHs] = useState(0.05);
  const out = useMemo(() => garmanInventory({ lambdaBuy: lb, lambdaSell: ls, inventory0: inv, cash0: 0, price: 100, halfSpread: hs, horizon: 100 }), [lb, ls, inv, hs]);
  const data = useMemo(() => Array.from({ length: 101 }, (_, t) => ({
    t, inventory: inv + out.inventoryDrift * t, cash: out.cashDrift * t,
  })), [inv, out]);
  return (
    <Panel title="Garman (1976) 存货流模型" note="做市商是一个双边排队系统：报价决定两侧到达率，库存与现金各自漂移；只要买卖流量不平衡，破产（存货或现金耗尽）在有限时间内几乎必然发生。">
      <Grid>
        <Controls>
          <Slider label="公众买单到达率 λ_b" value={lb} min={1} max={12} step={0.1} onChange={setLb} />
          <Slider label="公众卖单到达率 λ_s" value={ls} min={1} max={12} step={0.1} onChange={setLs} />
          <Slider label="初始库存 I₀" value={inv} min={0} max={200} step={5} onChange={setInv} />
          <Slider label="半价差" value={hs} min={0} max={0.3} step={0.005} onChange={setHs} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} fontSize={11} />
              <YAxis yAxisId="l" stroke={C.text} fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine yAxisId="l" y={0} stroke={C.red} strokeDasharray="4 4" />
              <Line yAxisId="l" dataKey="inventory" name="期望库存" stroke={C.gold} dot={false} />
              <Line yAxisId="r" dataKey="cash" name="期望现金" stroke={C.teal} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="库存漂移 / 单位时间" value={f(out.inventoryDrift)} color={out.inventoryDrift < 0 ? C.red : C.green} />
            <Stat label="现金漂移" value={f(out.cashDrift)} color={C.teal} />
            <Stat label="破产时点" value={out.failureTime === null ? "视界内未发生" : f(out.failureTime, 1)} color={C.red} />
            <Stat label="流量平衡" value={out.balanced ? "是" : "否"} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 2. Stoll ── */
function StollPanel() {
  const [op, setOp] = useState(0.02);
  const [ic, setIc] = useState(0.015);
  const [as_, setAs] = useState(0.03);
  const out = useMemo(() => stollDecomposition({ orderProcessing: op, inventoryCost: ic, adverseSelection: as_ }), [op, ic, as_]);
  const data = [
    { name: "订单处理", v: out.shares.orderProcessing * 100 },
    { name: "库存持有", v: out.shares.inventory * 100 },
    { name: "逆向选择", v: out.shares.adverseSelection * 100 },
  ];
  return (
    <Panel title="Stoll (1989) 三成分价差分解" note="报价价差 = 订单处理成本 + 库存持有成本 + 逆向选择成本。前两者是暂时的（价格会回摆，形成 Roll 型负自协方差），逆向选择是永久的（中间价被真正修正）。">
      <Grid>
        <Controls>
          <Slider label="订单处理成本" value={op} min={0} max={0.05} step={0.001} onChange={setOp} />
          <Slider label="库存持有成本" value={ic} min={0} max={0.05} step={0.001} onChange={setIc} />
          <Slider label="逆向选择成本" value={as_} min={0.001} max={0.08} step={0.001} onChange={setAs} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="v" name="占半价差比重 (%)" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="半价差" value={f(out.halfSpread, 4)} />
            <Stat label="报价价差" value={f(out.spread, 4)} color={C.teal} />
            <Stat label="暂时性占比" value={`${(out.transitoryShare * 100).toFixed(1)}%`} />
            <Stat label="隐含 Roll 自协方差" value={f(out.impliedCovariance, 6)} color={C.red} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 3. Ho-Stoll ── */
function HoStollPanel() {
  const [q, setQ] = useState(20);
  const [gamma, setGamma] = useState(0.08);
  const [sigma, setSigma] = useState(0.5);
  const [k, setK] = useState(1.5);
  const [T, setT] = useState(1);
  const out = useMemo(() => hoStollQuotes({ mid: 100, inventory: q, gamma, sigma, timeLeft: T, k }), [q, gamma, sigma, T, k]);
  const data = useMemo(() => Array.from({ length: 41 }, (_, i) => {
    const inv = -50 + i * 2.5;
    const o = hoStollQuotes({ mid: 100, inventory: inv, gamma, sigma, timeLeft: T, k });
    return { inv, bid: o.bid, ask: o.ask, res: o.reservationPrice };
  }), [gamma, sigma, T, k]);
  return (
    <Panel title="Ho-Stoll / Avellaneda-Stoikov 库存偏移报价" note="做市商不围绕中间价对称报价，而是围绕保留价 r = S − q·γσ²(T−t) 报价：库存越多，报价整体下移以吸引买盘、抑制卖盘。价差宽度由风险厌恶与订单流强度 k 共同决定。">
      <Grid>
        <Controls>
          <Slider label="当前库存 q" value={q} min={-50} max={50} step={1} onChange={setQ} />
          <Slider label="风险厌恶 γ" value={gamma} min={0.01} max={0.3} step={0.01} onChange={setGamma} />
          <Slider label="波动率 σ" value={sigma} min={0.1} max={2} step={0.05} onChange={setSigma} />
          <Slider label="剩余时间 T−t" value={T} min={0.05} max={2} step={0.05} onChange={setT} />
          <Slider label="订单流强度 k" value={k} min={0.3} max={5} step={0.1} onChange={setK} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="inv" stroke={C.text} fontSize={11} label={{ value: "库存 q", position: "insideBottom", offset: -3, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} fontSize={11} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={100} stroke={C.grid} strokeDasharray="4 4" label={{ value: "中间价", fill: C.text, fontSize: 10 }} />
              <Line dataKey="ask" name="卖价" stroke={C.red} dot={false} />
              <Line dataKey="res" name="保留价" stroke={C.gold} dot={false} />
              <Line dataKey="bid" name="买价" stroke={C.teal} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="保留价" value={f(out.reservationPrice, 4)} />
            <Stat label="最优价差" value={f(out.optimalSpread, 4)} color={C.teal} />
            <Stat label="报价偏移 (skew)" value={f(out.skew, 4)} color={out.skew < 0 ? C.red : C.green} />
            <Stat label="双边报价" value={`${f(out.bid, 2)} / ${f(out.ask, 2)}`} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 4. PIN ── */
function PinPanel() {
  const [alpha, setAlpha] = useState(0.4);
  const [delta, setDelta] = useState(0.5);
  const [mu, setMu] = useState(40);
  const [eps, setEps] = useState(60);
  const [days, setDays] = useState(120);
  const sim = useMemo(() => simulatePinDays({ alpha, delta, mu, epsB: eps, epsS: eps }, days, 42), [alpha, delta, mu, eps, days]);
  const fit = useMemo(() => estimatePIN(sim.buys, sim.sells), [sim]);
  const truePin = pinValue({ alpha, delta, mu, epsB: eps, epsS: eps });
  const data = sim.buys.map((b, i) => ({ d: i, buys: b, sells: sim.sells[i], imb: b - sim.sells[i] }));
  return (
    <Panel title="Easley-O'Hara 知情交易概率 (PIN)" note="每日买卖笔数由三态混合泊松生成：无消息 / 利好 / 利空。用对数似然（稳定化 log-sum-exp）反解 α、δ、μ、ε，得到 PIN = αμ / (αμ + ε_b + ε_s)。">
      <Grid>
        <Controls>
          <Slider label="消息到达概率 α" value={alpha} min={0.05} max={0.95} step={0.05} onChange={setAlpha} />
          <Slider label="坏消息概率 δ" value={delta} min={0.05} max={0.95} step={0.05} onChange={setDelta} />
          <Slider label="知情交易强度 μ" value={mu} min={5} max={150} step={5} onChange={setMu} />
          <Slider label="非知情强度 ε" value={eps} min={10} max={200} step={5} onChange={setEps} />
          <Slider label="样本天数" value={days} min={40} max={300} step={10} onChange={setDays} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="d" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line dataKey="buys" name="买单笔数" stroke={C.green} dot={false} strokeWidth={1} />
              <Line dataKey="sells" name="卖单笔数" stroke={C.red} dot={false} strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="真实 PIN" value={f(truePin)} />
            <Stat label="估计 PIN" value={f(fit.pin)} color={C.teal} />
            <Stat label="估计 α̂ / μ̂" value={`${f(fit.alpha, 2)} / ${f(fit.mu, 1)}`} />
            <Stat label="对数似然" value={f(fit.logLik, 1)} />
          </Stats>
          <p className="text-[11px] font-mono text-muted-foreground mt-3">
            有消息天数：{sim.informedDays} / {days}。样本越短、α 越极端，PIN 的识别越脆弱——这正是文献中 PIN 估计不稳定的根源。
          </p>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 5. VPIN ── */
function VpinPanel() {
  const [drift, setDrift] = useState(0.6);
  const [vol, setVol] = useState(0.01);
  const [bucket, setBucket] = useState(500);
  const [win, setWin] = useState(5);
  const out = useMemo(() => {
    const r = lcg(31);
    const n = 400;
    const rets: number[] = [], vols: number[] = [];
    for (let i = 0; i < n; i++) {
      const toxic = i > n * 0.4 && i < n * 0.6 ? drift : 0;
      rets.push(vol * gauss(r) + toxic * vol);
      vols.push(80 + 40 * r());
    }
    return vpin(rets, vols, bucket, win);
  }, [drift, vol, bucket, win]);
  const data = out.vpin.map((v, i) => ({ i, vpin: v }));
  return (
    <Panel title="VPIN 订单流毒性" note="按等量成交量分桶（成交量时钟），用批量分类近似买卖占比，滚动计算 |V_buy − V_sell| / V。中段注入单向毒性流，观察 VPIN 如何在价格尚未崩塌前先行抬升。">
      <Grid>
        <Controls>
          <Slider label="毒性段单向漂移" value={drift} min={0} max={2} step={0.1} onChange={setDrift} />
          <Slider label="收益波动 σ" value={vol} min={0.002} max={0.03} step={0.001} onChange={setVol} />
          <Slider label="桶容量" value={bucket} min={200} max={2000} step={100} onChange={setBucket} />
          <Slider label="滚动窗口" value={win} min={2} max={20} step={1} onChange={setWin} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke={C.text} fontSize={11} label={{ value: "成交量桶", position: "insideBottom", offset: -3, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} fontSize={11} domain={[0, 1]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area dataKey="vpin" name="VPIN" stroke={C.gold} fill={C.gold} fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="平均 VPIN" value={f(out.mean)} />
            <Stat label="峰值 VPIN" value={f(Math.max(...out.vpin))} color={C.red} />
            <Stat label="桶数" value={String(out.vpin.length)} />
            <Stat label="毒性预警阈值" value="0.4 (惯例)" color={C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 6. Make-or-take + queue ── */
function MakeTakePanel() {
  const [half, setHalf] = useState(0.02);
  const [fill, setFill] = useState(0.6);
  const [adv, setAdv] = useState(0.01);
  const [delay, setDelay] = useState(0.008);
  const [rebate, setRebate] = useState(0.002);
  const [ahead, setAhead] = useState(400);
  const out = useMemo(() => makeOrTake({ halfSpread: half, fillProb: fill, adverseSelection: adv, delayCost: delay, rebate, takerFee: 0.003 }), [half, fill, adv, delay, rebate]);
  const q = useMemo(() => queueFillProbability({ queueAhead: ahead, ownSize: 50, tradeRate: 60, cancelRate: 40, horizon: 5 }), [ahead]);
  const data = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const p = i / 20;
    const o = makeOrTake({ halfSpread: half, fillProb: p, adverseSelection: adv, delayCost: delay, rebate, takerFee: 0.003 });
    return { p, limit: o.limitEV, market: o.marketEV };
  }), [half, adv, delay, rebate]);
  return (
    <Panel title="Make-or-Take：限价单的期权价值" note="挂限价单等价于卖出一个免费的交易期权：被成交时赚取半价差与返佣，但成交往往发生在不利方向（逆向选择）；不成交则承担 alpha 衰减的机会成本。排队位置决定成交概率。">
      <Grid>
        <Controls>
          <Slider label="半价差" value={half} min={0.005} max={0.06} step={0.001} onChange={setHalf} />
          <Slider label="成交概率" value={fill} min={0.05} max={0.95} step={0.05} onChange={setFill} />
          <Slider label="逆向选择损失" value={adv} min={0} max={0.05} step={0.001} onChange={setAdv} />
          <Slider label="延迟机会成本" value={delay} min={0} max={0.05} step={0.001} onChange={setDelay} />
          <Slider label="做市返佣" value={rebate} min={0} max={0.01} step={0.0005} onChange={setRebate} />
          <Slider label="队列前方量" value={ahead} min={0} max={2000} step={50} onChange={setAhead} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="p" stroke={C.text} fontSize={11} tickFormatter={(v) => v.toFixed(1)} label={{ value: "成交概率", position: "insideBottom", offset: -3, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={0} stroke={C.grid} />
              <Line dataKey="limit" name="限价单 EV" stroke={C.gold} dot={false} />
              <Line dataKey="market" name="市价单 EV" stroke={C.red} dot={false} strokeDasharray="5 4" />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="决策" value={out.decision === "limit" ? "挂单 (Make)" : "吃单 (Take)"} color={out.decision === "limit" ? C.green : C.red} />
            <Stat label="EV 优势" value={f(out.edge, 4)} />
            <Stat label="盈亏平衡成交概率" value={f(out.breakevenFillProb)} color={C.teal} />
            <Stat label="队列成交概率" value={f(q.fillProb)} sub={`期望等待 ${f(q.expectedWait, 2)}`} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 7. ZI LOB ── */
function ZilobPanel() {
  const [lim, setLim] = useState(1.2);
  const [mkt, setMkt] = useState(0.5);
  const [can, setCan] = useState(0.4);
  const [tick, setTick] = useState(0.01);
  const out = useMemo(() => zeroIntelligenceLOB({ limitRate: lim, marketRate: mkt, cancelRate: can, levels: 8, events: 3000, tick, seed: 21 }), [lim, mkt, can, tick]);
  const path = out.spreadPath.filter((_, i) => i % 15 === 0).map((s, i) => ({ i: i * 15, spread: s, mid: out.midPath[i * 15] }));
  const depth = out.bidDepth.map((b, i) => ({ lvl: `L${i + 1}`, bid: b, ask: out.askDepth[i] }));
  return (
    <Panel title="零智能限价订单簿仿真" note="Farmer-Patelli-Zovko 式的三泊松流模型：限价、市价、撤单全部随机。即便没有任何策略性，价差与深度的统计规律（价差随市价流上升、深度随限价流堆积）已经浮现——市场结构本身在解释相当一部分流动性。">
      <Grid>
        <Controls>
          <Slider label="限价单到达率" value={lim} min={0.2} max={3} step={0.1} onChange={setLim} />
          <Slider label="市价单到达率" value={mkt} min={0.1} max={3} step={0.1} onChange={setMkt} />
          <Slider label="撤单率" value={can} min={0} max={2} step={0.1} onChange={setCan} />
          <Slider label="最小报价单位" value={tick} min={0.001} max={0.05} step={0.001} onChange={setTick} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={path}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line dataKey="spread" name="价差" stroke={C.gold} dot={false} strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={depth}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="lvl" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="bid" name="买侧深度" fill={C.teal} />
              <Bar dataKey="ask" name="卖侧深度" fill={C.red} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="平均价差" value={f(out.meanSpread, 4)} />
            <Stat label="平均深度" value={f(out.meanDepth, 2)} color={C.teal} />
            <Stat label="中间价波动" value={f(out.volatility, 5)} />
            <Stat label="事件数" value={String(out.spreadPath.length)} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 8. Hawkes ── */
function HawkesPanel() {
  const [mu, setMu] = useState(1);
  const [alpha, setAlpha] = useState(0.8);
  const [beta, setBeta] = useState(1.5);
  const out = useMemo(() => hawkesTrades({ mu, alpha, beta, T: 200, seed: 3 }), [mu, alpha, beta]);
  return (
    <Panel title="Hawkes 自激成交强度" note="成交触发成交：λ(t) = μ + Σ α e^{−β(t−t_i)}。分支比 n = α/β 度量内生性——n 接近 1 时市场几乎完全自我驱动，这正是闪崩与成交聚集的机制解释。">
      <Grid>
        <Controls>
          <Slider label="外生强度 μ" value={mu} min={0.1} max={3} step={0.1} onChange={setMu} />
          <Slider label="自激幅度 α" value={alpha} min={0} max={1.6} step={0.05} onChange={setAlpha} />
          <Slider label="衰减速度 β" value={beta} min={0.3} max={4} step={0.1} onChange={setBeta} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={out.intensity}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} fontSize={11} tickFormatter={(v) => v.toFixed(0)} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={mu} stroke={C.teal} strokeDasharray="4 4" label={{ value: "外生 μ", fill: C.text, fontSize: 10 }} />
              <Area dataKey="lambda" name="强度 λ(t)" stroke={C.gold} fill={C.gold} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="分支比 n = α/β" value={f(out.branchingRatio)} color={out.stationary ? C.green : C.red} />
            <Stat label="稳态" value={out.stationary ? "平稳" : "爆炸" } />
            <Stat label="期望成交率" value={f(out.expectedRate, 2)} color={C.teal} />
            <Stat label="聚集指数 (Fano)" value={f(out.clusteringIndex, 2)} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 9. Spread measures ── */
function SpreadPanel() {
  const [impactShare, setImpactShare] = useState(0.4);
  const [halfSpread, setHalfSpread] = useState(0.03);
  const [noise, setNoise] = useState(0.01);
  const built = useMemo(() => {
    const r = lcg(77);
    const trades = [], highs: number[] = [], lows: number[] = [], prices: number[] = [], mids: number[] = [];
    const truth: (1 | -1)[] = [];
    let mid = 100;
    for (let i = 0; i < 250; i++) {
      const d: 1 | -1 = r() < 0.5 ? 1 : -1;
      const price = mid + d * halfSpread;
      const after = mid + d * halfSpread * impactShare;
      trades.push({ price, midBefore: mid, midAfter: after, direction: d });
      truth.push(d); prices.push(price); mids.push(mid);
      highs.push(mid + halfSpread + noise * 100 * Math.abs(gauss(r)) * 0.01);
      lows.push(mid - halfSpread - noise * 100 * Math.abs(gauss(r)) * 0.01);
      mid = after + noise * gauss(r);
    }
    return {
      measures: spreadDecomposition(trades),
      cs: corwinSchultzSpread(highs, lows),
      cls: classifyTrades(prices, mids, truth),
    };
  }, [impactShare, halfSpread, noise]);
  const m = built.measures;
  const data = [
    { name: "有效价差", v: m.effectiveBps },
    { name: "已实现价差", v: m.realizedBps },
    { name: "价格冲击", v: m.impactBps },
  ];
  return (
    <Panel title="价差口径、高低价估计与成交方向标注" note="有效价差 = 已实现价差 + 价格冲击：前者是做市商真正落袋的补偿，后者是被信息拿走的部分。没有逐笔数据时用 Corwin-Schultz 高低价估计；没有报价时用 tick / Lee-Ready 规则标注方向，误判会系统性稀释所有度量。">
      <Grid>
        <Controls>
          <Slider label="永久冲击占比" value={impactShare} min={0} max={1} step={0.05} onChange={setImpactShare} />
          <Slider label="真实半价差" value={halfSpread} min={0.005} max={0.1} step={0.005} onChange={setHalfSpread} />
          <Slider label="中间价噪声" value={noise} min={0} max={0.05} step={0.005} onChange={setNoise} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} unit="bp" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="v" name="基点" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="恒等式残差" value={f(m.identityGap, 10)} />
            <Stat label="Corwin-Schultz 估计" value={f(built.cs.spread, 4)} color={C.teal} />
            <Stat label="Tick 规则准确率" value={`${(built.cls.tickAccuracy * 100).toFixed(1)}%`} />
            <Stat label="Lee-Ready 准确率" value={`${(built.cls.leeReadyAccuracy * 100).toFixed(1)}%`} color={C.green} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 10. Impact ── */
function ImpactPanel() {
  const [sigma, setSigma] = useState(0.02);
  const [Q, setQ] = useState(200000);
  const [V, setV] = useState(2000000);
  const [Y, setY] = useState(1);
  const [delta, setDelta] = useState(0.5);
  const [ps, setPs] = useState(1 / 3);
  const out = useMemo(() => squareRootImpact({ sigma, Q, V, Y, delta, permanentShare: ps }), [sigma, Q, V, Y, delta, ps]);
  return (
    <Panel title="平方根冲击定律与永久/临时拆分" note="跨市场、跨资产的稳健经验规律：ΔP/P ≈ Y·σ·(Q/V)^δ，δ ≈ 0.5。凹性意味着拆单有效但边际收益递减；只有永久部分反映信息，临时部分随时间回摆，是执行算法真正可以省下的成本。">
      <Grid>
        <Controls>
          <Slider label="日波动率 σ" value={sigma} min={0.005} max={0.06} step={0.001} onChange={setSigma} />
          <Slider label="订单规模 Q" value={Q} min={10000} max={1500000} step={10000} fmt={(v) => `${(v / 1000).toFixed(0)}k`} onChange={setQ} />
          <Slider label="日成交量 V" value={V} min={200000} max={8000000} step={100000} fmt={(v) => `${(v / 1e6).toFixed(1)}M`} onChange={setV} />
          <Slider label="系数 Y" value={Y} min={0.2} max={2.5} step={0.1} onChange={setY} />
          <Slider label="指数 δ" value={delta} min={0.2} max={1} step={0.05} onChange={setDelta} />
          <Slider label="永久占比" value={ps} min={0} max={1} step={0.05} onChange={setPs} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={out.curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="rate" stroke={C.text} fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} label={{ value: "参与率 Q/V", position: "insideBottom", offset: -3, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} fontSize={11} tickFormatter={(v) => `${(v * 1e4).toFixed(0)}bp`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => `${(v * 1e4).toFixed(1)} bp`} />
              <ReferenceLine x={out.participation} stroke={C.red} strokeDasharray="4 4" />
              <Line dataKey="impact" name="冲击" stroke={C.gold} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="参与率" value={`${(out.participation * 100).toFixed(1)}%`} />
            <Stat label="总冲击" value={`${(out.total * 1e4).toFixed(1)} bp`} color={C.gold} />
            <Stat label="永久冲击" value={`${(out.permanent * 1e4).toFixed(1)} bp`} color={C.red} />
            <Stat label="临时冲击" value={`${(out.temporary * 1e4).toFixed(1)} bp`} color={C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 11. Price discovery ── */
function DiscoveryPanel() {
  const [a1, setA1] = useState(-0.5);
  const [a2, setA2] = useState(0.15);
  const [s1, setS1] = useState(0.01);
  const [s2, setS2] = useState(0.012);
  const [rho, setRho] = useState(0.4);
  const out = useMemo(() => priceDiscovery({ alpha1: a1, alpha2: a2, sigma1: s1, sigma2: s2, rho }), [a1, a2, s1, s2, rho]);
  const data = [
    { name: "市场 1", lower: out.isLower[0], mid: out.isMid[0], upper: out.isUpper[0], gg: out.ggWeights[0] },
    { name: "市场 2", lower: out.isLower[1], mid: out.isMid[1], upper: out.isUpper[1], gg: out.ggWeights[1] },
  ];
  return (
    <Panel title="价格发现：Hasbrouck 信息份额与 Gonzalo-Granger 权重" note="同一资产在两个市场交易时，谁在领跑？VECM 的误差修正载荷决定共同因子权重（GG），而创新协方差的 Cholesky 排序给出信息份额的上下界（IS）。相关性越高，上下界越宽，结论越不可识别。">
      <Grid>
        <Controls>
          <Slider label="市场 1 修正载荷 α₁" value={a1} min={-1} max={0} step={0.05} onChange={setA1} />
          <Slider label="市场 2 修正载荷 α₂" value={a2} min={0} max={1} step={0.05} onChange={setA2} />
          <Slider label="市场 1 创新 σ₁" value={s1} min={0.002} max={0.03} step={0.001} onChange={setS1} />
          <Slider label="市场 2 创新 σ₂" value={s2} min={0.002} max={0.03} step={0.001} onChange={setS2} />
          <Slider label="创新相关 ρ" value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} domain={[0, 1]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="lower" name="IS 下界" fill={C.teal} />
              <Bar dataKey="upper" name="IS 上界" fill={C.gold} />
              <Bar dataKey="gg" name="GG 权重" fill={C.blue} />
            </BarChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="主导市场" value={`市场 ${out.dominantVenue}`} color={C.gold} />
            <Stat label="GG 权重 1 / 2" value={`${f(out.ggWeights[0], 2)} / ${f(out.ggWeights[1], 2)}`} />
            <Stat label="IS 中值 (市场 1)" value={f(out.isMid[0])} color={C.teal} />
            <Stat label="上下界宽度" value={f(out.isUpper[0] - out.isLower[0])} color={C.red} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 12. Tick size ── */
function TickPanel() {
  const [tick, setTick] = useState(0.01);
  const [price, setPrice] = useState(20);
  const [fric, setFric] = useState(0.006);
  const out = useMemo(() => tickSizeEffect({ tick, price, frictionlessSpread: fric, dailyVolume: 1e6, queuePriorityValue: 0.5 }), [tick, price, fric]);
  const data = useMemo(() => Array.from({ length: 25 }, (_, i) => {
    const tk = 0.001 + i * 0.002;
    const o = tickSizeEffect({ tick: tk, price, frictionlessSpread: fric, dailyVolume: 1e6, queuePriorityValue: 0.5 });
    return { tk, spread: o.quotedSpreadBps, queue: o.expectedQueueLength / 1000 };
  }), [price, fric]);
  return (
    <Panel title="最小报价单位（Tick Size）的机制效应" note="当 tick 大于无摩擦价差时，价差被人为托高，价格优先失效、时间优先主导，做市商赚取排队租金并堆积深度。tick 太小则价差灵敏但深度稀薄、抢先报价盛行——这是 SEC Tick Size Pilot 的核心权衡。">
      <Grid>
        <Controls>
          <Slider label="最小报价单位" value={tick} min={0.001} max={0.05} step={0.001} onChange={setTick} />
          <Slider label="股价" value={price} min={2} max={300} step={1} onChange={setPrice} />
          <Slider label="无摩擦价差" value={fric} min={0.001} max={0.05} step={0.001} onChange={setFric} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="tk" stroke={C.text} fontSize={11} tickFormatter={(v) => v.toFixed(3)} />
              <YAxis yAxisId="l" stroke={C.text} fontSize={11} unit="bp" />
              <YAxis yAxisId="r" orientation="right" stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine yAxisId="l" x={fric} stroke={C.red} strokeDasharray="4 4" label={{ value: "约束临界", fill: C.text, fontSize: 10 }} />
              <Line yAxisId="l" dataKey="spread" name="报价价差 (bp)" stroke={C.gold} dot={false} />
              <Line yAxisId="r" dataKey="queue" name="期望队列 (k)" stroke={C.teal} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="相对 tick" value={`${(out.relativeTick * 1e4).toFixed(1)} bp`} />
            <Stat label="tick 是否约束" value={out.binding ? "约束（价差被托高）" : "不约束"} color={out.binding ? C.red : C.green} />
            <Stat label="报价价差" value={`${out.quotedSpreadBps.toFixed(1)} bp`} />
            <Stat label="做市租金" value={f(out.makerRent, 0)} color={C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 13. Auction ── */
function AuctionPanel() {
  const [noise, setNoise] = useState(100);
  const [informed, setInformed] = useState(0.2);
  const [batch, setBatch] = useState(20);
  const out = useMemo(() => callAuctionVsContinuous({ noiseTraders: noise, informedShare: informed, sigmaValue: 0.02, sigmaNoise: 0.05, batchSize: batch }), [noise, informed, batch]);
  const data = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const b = 1 + i * 2;
    const o = callAuctionVsContinuous({ noiseTraders: noise, informedShare: informed, sigmaValue: 0.02, sigmaNoise: 0.05, batchSize: b });
    return { b, call: o.callPriceError, cont: o.continuousPriceError };
  }), [noise, informed]);
  return (
    <Panel title="集合竞价 vs 连续交易" note="批量撮合把分散的噪声合并在一个价格上，定价误差按 √批量 收敛——这解释了开盘/收盘集合竞价、流动性差的品种采用竞价制，以及频繁批量拍卖（FBA）作为对抗延迟套利的市场设计提案。">
      <Grid>
        <Controls>
          <Slider label="噪声交易者数量" value={noise} min={10} max={500} step={10} onChange={setNoise} />
          <Slider label="知情者占比" value={informed} min={0} max={0.8} step={0.05} onChange={setInformed} />
          <Slider label="批量规模" value={batch} min={1} max={60} step={1} onChange={setBatch} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="b" stroke={C.text} fontSize={11} label={{ value: "批量规模", position: "insideBottom", offset: -3, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line dataKey="cont" name="连续交易定价误差" stroke={C.red} dot={false} strokeDasharray="5 4" />
              <Line dataKey="call" name="集合竞价定价误差" stroke={C.gold} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="竞价定价误差" value={f(out.callPriceError, 4)} color={C.gold} />
            <Stat label="连续定价误差" value={f(out.continuousPriceError, 4)} color={C.red} />
            <Stat label="效率提升" value={`${(out.efficiencyGain * 100).toFixed(1)}%`} color={C.green} />
            <Stat label="噪声合并倍数" value={f(out.consolidationRatio, 2)} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 14. Circuit breaker ── */
function BreakerPanel() {
  const [sigma, setSigma] = useState(0.02);
  const [thr, setThr] = useState(0.07);
  const [halt, setHalt] = useState(10);
  const [cool, setCool] = useState(0.4);
  const out = useMemo(() => circuitBreakerSim({ sigma, threshold: thr, steps: 400, drift: 0, haltMinutes: halt, coolingFactor: cool, seed: 17 }), [sigma, thr, halt, cool]);
  return (
    <Panel title="熔断与波动中断" note="熔断给市场时间重新聚集流动性（冷却效应），但也可能产生磁吸效应：价格接近阈值时交易者抢先成交，反而加速触发。阈值、停牌时长与冷却强度共同决定净效果。">
      <Grid>
        <Controls>
          <Slider label="每步波动 σ" value={sigma} min={0.002} max={0.05} step={0.002} onChange={setSigma} />
          <Slider label="熔断阈值" value={thr} min={0.01} max={0.25} step={0.01} onChange={setThr} />
          <Slider label="停牌步数" value={halt} min={1} max={40} step={1} onChange={setHalt} />
          <Slider label="冷却系数" value={cool} min={0.1} max={1} step={0.05} onChange={setCool} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={out.path.filter((_, i) => i % 2 === 0)}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line dataKey="price" name="价格" stroke={C.gold} dot={false} strokeWidth={1.2} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="熔断次数" value={String(out.halts)} color={out.halts > 0 ? C.red : C.green} />
            <Stat label="磁吸代理（贴带时间）" value={`${(out.magnetEffect * 100).toFixed(1)}%`} />
            <Stat label="最大回撤" value={`${(out.maxDrawdown * 100).toFixed(1)}%`} color={C.red} />
            <Stat label="终值" value={f(out.finalPrice, 2)} color={C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 15. Dark pool ── */
function DarkPanel() {
  const [share, setShare] = useState(0.35);
  const [informed, setInformed] = useState(0.2);
  const out = useMemo(() => darkPoolSplit({ totalFlow: 1e6, darkShare: share, informedShare: informed, litSpread: 0.02, litDepth: 5000 }), [share, informed]);
  const data = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const s = i / 20 * 0.95;
    const o = darkPoolSplit({ totalFlow: 1e6, darkShare: s, informedShare: informed, litSpread: 0.02, litDepth: 5000 });
    return { s, spread: o.newLitSpread, depth: o.displayedDepth / 5000 };
  }), [informed]);
  return (
    <Panel title="暗池分流与撇脂效应" note="暗池以中间价成交、无执行确定性，吸引的是对成交速度不敏感的非知情流。显示市场因此留下更高比例的知情流，逆向选择上升、价差走阔、深度变薄——这是暗池份额监管上限的理论依据。">
      <Grid>
        <Controls>
          <Slider label="暗池分流比例" value={share} min={0} max={0.9} step={0.05} onChange={setShare} />
          <Slider label="总体知情占比" value={informed} min={0.02} max={0.6} step={0.02} onChange={setInformed} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="s" stroke={C.text} fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis yAxisId="l" stroke={C.text} fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine yAxisId="l" x={share} stroke={C.red} strokeDasharray="4 4" />
              <Line yAxisId="l" dataKey="spread" name="显示市场价差" stroke={C.gold} dot={false} />
              <Line yAxisId="r" dataKey="depth" name="显示深度（相对）" stroke={C.teal} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="暗池成交量" value={`${(out.darkFlow / 1e3).toFixed(0)}k`} />
            <Stat label="显示市场知情占比" value={`${(out.litInformedShare * 100).toFixed(1)}%`} color={C.red} />
            <Stat label="价差变化" value={`${out.spreadChange >= 0 ? "+" : ""}${f(out.spreadChange, 4)}`} color={out.creamSkimming ? C.red : C.green} />
            <Stat label="显示深度" value={f(out.displayedDepth, 0)} color={C.teal} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 16. Resilience ── */
function ResiliencePanel() {
  const [shock, setShock] = useState(2);
  const [res, setRes] = useState(0.3);
  const [exit, setExit] = useState(0.25);
  const [fb, setFb] = useState(0.2);
  const out = useMemo(() => liquidityEvaporation({ shock, resilienceRate: res, horizon: 40, marketMakerExit: exit, feedbackLoop: fb }), [shock, res, exit, fb]);
  return (
    <Panel title="流动性蒸发与韧性半衰期" note="流动性的第三个维度不是价差或深度，而是韧性：冲击后多快恢复。做市商退出会让深度塌陷，深度塌陷又推高价差，形成反馈螺旋——超过临界值时流动性不再回归，而是消失。">
      <Grid>
        <Controls>
          <Slider label="初始价差冲击" value={shock} min={0.2} max={6} step={0.2} onChange={setShock} />
          <Slider label="韧性恢复率" value={res} min={0.02} max={0.9} step={0.02} onChange={setRes} />
          <Slider label="做市商退出敏感度" value={exit} min={0} max={0.6} step={0.05} onChange={setExit} />
          <Slider label="反馈螺旋强度" value={fb} min={0} max={0.8} step={0.05} onChange={setFb} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={out.path}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} fontSize={11} />
              <YAxis stroke={C.text} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={1} stroke={C.grid} strokeDasharray="4 4" />
              <Line dataKey="spread" name="价差（相对常态）" stroke={C.red} dot={false} />
              <Line dataKey="depth" name="深度（相对常态）" stroke={C.teal} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="半衰期（步）" value={f(out.halfLife, 2)} color={C.gold} />
            <Stat label="深度最低点" value={f(out.troughDepth)} color={C.red} />
            <Stat label="是否蒸发" value={out.evaporated ? "是（深度腰斩）" : "否"} color={out.evaporated ? C.red : C.green} />
            <Stat label="终态价差" value={f(out.path[out.path.length - 1].spread, 3)} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

/* ── 17. Liquidity premium ── */
function PremiumPanel() {
  const [gross, setGross] = useState(0.08);
  const [spread, setSpread] = useState(0.02);
  const periods = [0.1, 0.25, 0.5, 1, 2, 3, 5, 10];
  const out = useMemo(() => amihudMendelson({ grossReturn: gross, spread, holdingPeriods: periods }), [gross, spread]);
  return (
    <Panel title="Amihud-Mendelson 流动性溢价与持有期客群" note="交易成本按持有期摊销：短线客群只能持有低价差资产，长线客群愿意承接高价差资产并索取补偿。均衡结果是价差与预期毛收益之间的凹形关系——微观结构成本由此进入资产定价。">
      <Grid>
        <Controls>
          <Slider label="毛预期收益" value={gross} min={0.02} max={0.2} step={0.005} fmt={(v) => `${(v * 100).toFixed(1)}%`} onChange={setGross} />
          <Slider label="买卖价差（相对）" value={spread} min={0.001} max={0.08} step={0.001} fmt={(v) => `${(v * 100).toFixed(1)}%`} onChange={setSpread} />
        </Controls>
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={out.clientele}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="holdingPeriod" stroke={C.text} fontSize={11} label={{ value: "持有期（年）", position: "insideBottom", offset: -3, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => `${(v * 100).toFixed(2)}%`} />
              <Legend />
              <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 4" />
              <Line dataKey="netReturn" name="净收益" stroke={C.gold} dot={false} />
              <Line dataKey="amortizedCost" name="摊销成本" stroke={C.red} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Stats>
            <Stat label="最短持有期净收益" value={`${(out.clientele[0].netReturn * 100).toFixed(2)}%`} color={out.clientele[0].netReturn < 0 ? C.red : C.green} />
            <Stat label="十年期净收益" value={`${(out.clientele[out.clientele.length - 1].netReturn * 100).toFixed(2)}%`} color={C.teal} />
            <Stat label="边际投资者要求回报" value={`${(out.requiredReturn * 100).toFixed(2)}%`} />
            <Stat label="客群层级数" value={String(out.clientele.length)} />
          </Stats>
        </div>
      </Grid>
    </Panel>
  );
}

export default function V61MicrostructureTools() {
  const [cat, setCat] = useState<Cat>("inventory");
  const [tab, setTab] = useState<Tab>("garman");
  const inCat = TABS.filter((t) => t.cat === cat);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V6.1 · Market Microstructure Lab</p>
        <h2 className="text-2xl font-serif text-foreground">市场微观结构实验室</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          价格是如何被"造"出来的：从做市商的库存约束与信息劣势，到限价订单簿的排队博弈、成本口径的正确度量、
          多市场价格发现，直至 tick size、集合竞价、熔断与暗池等市场设计选择。与
          {" "}<Link to="/s/behavior-microstructure" className="text-gold hover:underline">/s/behavior-microstructure</Link>{" "}
          的 Kyle / Glosten-Milgrom / Roll / Almgren-Chriss 基础模型互为补充。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c.id}
              onClick={() => { setCat(c.id); setTab(TABS.find((t) => t.cat === c.id)!.id); }}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                cat === c.id ? "bg-gold/15 border-gold/60 text-gold"
                             : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{c.kicker}</span>{c.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {inCat.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md border text-[11px] transition-colors ${
                tab === t.id ? "bg-secondary border-gold/40 text-foreground"
                             : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground"
              }`}>
              {t.title}
              <span className="ml-2 text-[10px] text-muted-foreground/70 hidden md:inline">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "garman" && <GarmanPanel />}
        {tab === "stoll" && <StollPanel />}
        {tab === "hostoll" && <HoStollPanel />}
        {tab === "pin" && <PinPanel />}
        {tab === "vpin" && <VpinPanel />}
        {tab === "maketake" && <MakeTakePanel />}
        {tab === "zilob" && <ZilobPanel />}
        {tab === "hawkes" && <HawkesPanel />}
        {tab === "spread" && <SpreadPanel />}
        {tab === "impact" && <ImpactPanel />}
        {tab === "discovery" && <DiscoveryPanel />}
        {tab === "tick" && <TickPanel />}
        {tab === "auction" && <AuctionPanel />}
        {tab === "breaker" && <BreakerPanel />}
        {tab === "dark" && <DarkPanel />}
        {tab === "resilience" && <ResiliencePanel />}
        {tab === "premium" && <PremiumPanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">参考文献</p>
        <p>
          Garman (1976) Market Microstructure · Stoll (1989) Inferring the Components of the Bid-Ask Spread ·
          Ho-Stoll (1981) Optimal Dealer Pricing · Avellaneda-Stoikov (2008) High-Frequency Trading in a Limit Order Book ·
          Easley-Kiefer-O'Hara-Paperman (1996) Liquidity, Information and Infrequently Traded Stocks ·
          Easley-López de Prado-O'Hara (2012) Flow Toxicity and Liquidity · Farmer-Patelli-Zovko (2005) The Predictive Power of Zero Intelligence ·
          Bacry-Muzy (2015) Hawkes Processes in Finance · Corwin-Schultz (2012) A Simple Way to Estimate Bid-Ask Spreads ·
          Lee-Ready (1991) Inferring Trade Direction · Almgren et al. (2005) Direct Estimation of Equity Market Impact ·
          Hasbrouck (1995) One Security, Many Markets · Gonzalo-Granger (1995) Estimation of Common Long-Memory Components ·
          Budish-Cramton-Shim (2015) The High-Frequency Trading Arms Race · Zhu (2014) Do Dark Pools Harm Price Discovery ·
          Amihud-Mendelson (1986) Asset Pricing and the Bid-Ask Spread.
        </p>
        <p className="mt-2">全部为教学级简写模型：随机部分使用确定性种子以保证可复现，仿真规模限制在浏览器内即时响应的量级，不作为实盘执行或做市参数使用。</p>
      </div>
    </section>
  );
}
