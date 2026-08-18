import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Structured reading guide for market microstructure (V6.1).
 * Chain: object & core questions → market organisation → inventory vs information →
 * limit order book → liquidity measurement → price discovery → HFT & market design →
 * history & frontier → research design checklist.
 */

const H = ({ n, en, zh }: { n: string; en: string; zh: string }) => (
  <div className="flex items-baseline gap-3 mt-14 mb-5 border-b border-border/50 pb-3">
    <span className="text-[10px] font-mono tracking-[0.3em] text-gold">PART {n}</span>
    <h3 className="font-display text-2xl md:text-[26px] text-foreground leading-tight">{zh}</h3>
    <span className="ml-auto text-[11px] font-mono text-muted-foreground hidden md:inline">{en}</span>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] leading-[1.85] text-foreground/80 mb-4">{children}</p>
);

const Eq = ({ children, note }: { children: React.ReactNode; note?: string }) => (
  <div className="my-5 rounded-xl border border-border bg-secondary/25 px-5 py-4">
    <p className="font-mono text-[15px] text-gold text-center">{children}</p>
    {note && <p className="text-[11px] font-mono text-muted-foreground text-center mt-2">{note}</p>}
  </div>
);

const Caution = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="my-5 rounded-xl border border-border/70 bg-card/40 px-4 py-3">
    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold mb-1.5">{title}</p>
    <p className="text-[13px] leading-[1.75] text-foreground/70">{children}</p>
  </div>
);

const ToolLink = ({ label, note, to }: { label: string; note: string; to: string }) => (
  <Link
    to={to}
    className="group inline-flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 mr-2 mb-2 hover:border-gold/50 hover:bg-card/60 transition-all"
  >
    <span>
      <span className="block text-sm text-foreground group-hover:text-gold transition-colors">{label}</span>
      <span className="block text-[11px] text-foreground/55">{note}</span>
    </span>
    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors mt-0.5 shrink-0" />
  </Link>
);

const LAB = "/s/microstructure-lab";
const CLASSIC = "/s/behavior-microstructure";

const eras = [
  { y: "1968–1980", s: "存货范式", core: "Demsetz 即时性价格、Garman 存货流、Stoll / Ho-Stoll 最优报价", legacy: "价差是做市商承担库存风险的补偿" },
  { y: "1985–1996", s: "信息范式", core: "Kyle 连续拍卖、Glosten-Milgrom 序贯交易、Easley-O'Hara PIN", legacy: "价差是对逆向选择的定价, 交易本身携带信息" },
  { y: "1993–2005", s: "度量与实证", core: "Roll 隐含价差、有效/已实现价差分解、Hasbrouck 信息份额、Amihud 非流动性", legacy: "流动性成为可测量、可比较的变量" },
  { y: "2000–2010", s: "限价订单簿", core: "make-or-take 决策、排队价值、零智能仿真、Hawkes 自激", legacy: "报价驱动 → 订单驱动市场的建模语言" },
  { y: "2010–", s: "高频与市场设计", core: "VPIN 与闪崩、tick size 试点、熔断、暗池分流、批量拍卖", legacy: "微观规则如何塑造宏观流动性与韧性" },
];

const measures = [
  { k: "报价价差", d: "Ask − Bid", pit: "只反映挂牌意愿, 大单实际成交往往更差" },
  { k: "有效价差", d: "2·D·(P − M)", pit: "捕捉真实成交位置, 但需要正确的成交方向标注" },
  { k: "已实现价差", d: "2·D·(P − M₊τ)", pit: "做市商的事后毛利, 对 τ 的选择敏感" },
  { k: "价格冲击", d: "2·D·(M₊τ − M)", pit: "逆向选择成分; 有效 = 已实现 + 冲击 是恒等式" },
  { k: "Amihud", d: "|r| / 成交额", pit: "低频可得但混杂波动率, 跨市场不可直接比较" },
];

export default function MicrostructureTheory() {
  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · V6.1</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          市场微观结构导读：从做市商库存，到订单簿、价格发现与市场设计
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          资产定价告诉你「价格应该是多少」，微观结构回答的是
          <strong className="text-foreground">「价格如何被造出来、由谁承担成本、以多快的速度反映信息」</strong>。
          它把交易机制本身当作研究对象：撮合规则、报价单位、订单类型与交易者构成，都会改变你在屏幕上看到的价格。
        </p>
        <div className="mt-6">
          <ToolLink label="微观结构实验室" note="17 个交互面板 · 库存 / 信息 / 订单簿 / 成本 / 市场设计" to={LAB} />
          <ToolLink label="行为 & 微观结构 (经典)" note="Kyle · Glosten-Milgrom · Roll · Almgren-Chriss · Amihud" to={CLASSIC} />
        </div>
      </header>

      <H n="1" en="Object & Four Core Questions" zh="学科对象：四个绕不开的问题" />
      <P>
        微观结构研究「在给定交易机制下，价格与交易量如何形成」。它反复回答四个问题：流动性从哪里来并如何定价；
        私人信息以多快的速度进入价格；交易成本由谁承担、如何拆解；交易规则的设计如何改变前三者。
      </P>
      <Eq note="任何一笔成交的价格偏离都可以拆成这三块">
        价差 = 订单处理成本 + 库存风险补偿 + 逆向选择成本
      </Eq>
      <P>
        这条分解是全学科的骨架：存货范式解释第二项，信息范式解释第三项，市场设计研究如何压低第一项而不放大后两项。
      </P>
      <ToolLink label="Stoll 三成分分解" note="用序列协方差把价差拆成三块" to={LAB} />

      <H n="2" en="Market Organisation" zh="市场是怎么组织的：报价驱动 vs 订单驱动" />
      <P>
        报价驱动市场（做市商制）由指定做市商双边报价、以自有库存承接订单流；订单驱动市场（限价订单簿）由所有参与者提交限价单
        构成价格—数量阶梯，价格优先、时间优先撮合。今天多数市场是混合体：连续限价簿 + 做市义务 + 开收盘集合竞价 + 场外暗池。
      </P>
      <Caution title="机制决定可观测量">
        同一只股票在做市商市场与订单簿市场的「价差」并不是同一个东西：前者是做市商的报价意愿，后者是队列深度的函数。
        跨市场比较流动性前，先确认撮合机制与数据口径。
      </Caution>

      <H n="3" en="Inventory vs Information" zh="两条经典线：库存与信息" />
      <P>
        <strong className="text-foreground">库存线</strong>（Garman、Stoll、Ho-Stoll）把做市商看成风险厌恶的存货管理者：
        库存偏离目标时，他把报价整体「歪斜」以吸引反向订单，价差补偿的是持仓期的价格风险。
      </P>
      <Eq note="Ho-Stoll：库存 I 越偏离目标, 报价中枢偏移越大">
        中枢偏移 ≈ −γ σ² T · (I − I*)，价差 ≈ c + γ σ² T q
      </Eq>
      <P>
        <strong className="text-foreground">信息线</strong>（Kyle、Glosten-Milgrom）把做市商看成贝叶斯学习者：他无法区分知情与噪声交易者，
        只能对「被买走」这一事件更新信念。价差是在竞争性零利润条件下对逆向选择的定价，价格冲击 λ 是信息的价格。
      </P>
      <Eq note="Kyle λ：知情交易者的最优下单量与市场深度互为倒数">
        λ = σᵥ / (2 σᵤ)，深度 1/λ 随噪声交易量上升
      </Eq>
      <div className="mt-2">
        <ToolLink label="Ho-Stoll 报价偏移" note="库存如何歪斜双边报价" to={LAB} />
        <ToolLink label="PIN 估计" note="EHO 似然反解 α, μ, ε" to={LAB} />
        <ToolLink label="VPIN 时序" note="成交量桶下的订单流毒性" to={LAB} />
      </div>

      <H n="4" en="Limit Order Book" zh="限价订单簿：现代市场的语言" />
      <P>
        在订单簿世界里，交易者的第一决策不是买或卖，而是 <strong className="text-foreground">make or take</strong>：
        提交限价单等于免费卖出一个「被成交」的期权——赚回价差与返佣，但承担不成交风险与被知情单打穿的风险；
        市价单支付即时性成本换确定执行。排队位置、撤单强度与成交聚集（Hawkes 自激）共同决定这个期权的价值。
      </P>
      <Caution title="零智能也能生成真实形状">
        限价单 / 市价单 / 撤单三条泊松流的纯随机订单簿，就能复现实证中价差分布与「驼峰形」深度曲线。
        这说明许多所谓「策略性」的形态其实来自机制约束本身，别把机制假设当成行为发现。
      </Caution>
      <div>
        <ToolLink label="make-or-take 决策" note="限价单期权价值 vs 市价单成本" to={LAB} />
        <ToolLink label="零智能订单簿仿真" note="价差与深度的机制生成" to={LAB} />
        <ToolLink label="Hawkes 自激强度" note="成交聚集与流动性枯竭" to={LAB} />
      </div>

      <H n="5" en="Measuring Liquidity" zh="流动性与成本：口径陷阱清单" />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/30">
            <tr className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">度量</th>
              <th className="px-4 py-3">定义</th>
              <th className="px-4 py-3">陷阱</th>
            </tr>
          </thead>
          <tbody>
            {measures.map((m) => (
              <tr key={m.k} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 text-foreground">{m.k}</td>
                <td className="px-4 py-3 font-mono text-foreground/70">{m.d}</td>
                <td className="px-4 py-3 text-foreground/60">{m.pit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        当只有日频数据时，Roll 用相邻收益的负自协方差反解价差，Corwin-Schultz 用高低价比推断价差；两者在趋势强或跳跃多时会失效
        （协方差为正 → Roll 无解）。成交方向标注（Lee-Ready、tick rule）本身有 5%–20% 误判率，会系统性压低估计的冲击成分。
      </P>
      <div>
        <ToolLink label="有效/已实现价差瀑布" note="有效 = 已实现 + 冲击 的恒等式检查" to={LAB} />
        <ToolLink label="Corwin-Schultz & Roll" note="低频代理与失效条件" to={LAB} />
        <ToolLink label="平方根冲击定律" note="impact ∝ σ√(Q/V) 与 Almgren 校准" to={LAB} />
      </div>

      <H n="6" en="Price Discovery" zh="价格发现：谁先知道价格" />
      <P>
        同一资产在多个场所交易时（现货与期货、多交易所、ADR 与本地股），共同有效价格是同一个随机游走，
        Hasbrouck 信息份额度量各市场对该随机游走创新方差的贡献，Gonzalo-Granger 共同因子权重度量各市场在长期均衡中的权重。
        两者答案不同：前者受同期相关污染只能给上下界，后者忽略噪声大小。报告结果时两个都给。
      </P>
      <Eq note="交易的信息含量 = 永久冲击占全部冲击的比例">
        永久冲击 / (永久 + 临时冲击) → 越高说明该笔流动越「知情」
      </Eq>
      <ToolLink label="Hasbrouck 信息份额" note="上下界 + Gonzalo-Granger 权重" to={LAB} />

      <H n="7" en="HFT & Market Design" zh="高频交易与市场设计：规则即变量" />
      <P>
        微观结构最实用的部分是把交易规则当成可调参数：最小报价单位（tick size）过大抬高价差、过小削弱时间优先带来的排队激励；
        集合竞价以牺牲即时性换取更集中的价格发现；熔断与波动中断在极端行情下切断反馈但可能引发「磁吸效应」；
        暗池分流未显示流动性，改善大单执行却削弱显示簿的深度与价格发现质量。
      </P>
      <Caution title="韧性比价差更重要">
        危机时决定损失的不是平时的价差，而是流动性被冲击后恢复的速度（韧性半衰期）。
        把「深度恢复到冲击前 50% 需要多久」纳入常规监控，比盯着日均价差更有信息量。
      </Caution>
      <div>
        <ToolLink label="Tick size 机制效应" note="价差 / 排队 / 深度权衡" to={LAB} />
        <ToolLink label="集合竞价 vs 连续交易" note="价格发现效率对比" to={LAB} />
        <ToolLink label="熔断与暗池分流" note="触发仿真与显示流动性影响" to={LAB} />
      </div>

      <H n="8" en="History & Frontier" zh="历史脉络与当代前沿" />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/30">
            <tr className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">时期</th>
              <th className="px-4 py-3">范式</th>
              <th className="px-4 py-3">核心贡献</th>
              <th className="px-4 py-3">遗产</th>
            </tr>
          </thead>
          <tbody>
            {eras.map((e) => (
              <tr key={e.y} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{e.y}</td>
                <td className="px-4 py-3 text-foreground">{e.s}</td>
                <td className="px-4 py-3 text-foreground/70">{e.core}</td>
                <td className="px-4 py-3 text-foreground/60">{e.legacy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        当前前沿有四条：用机器学习直接从订单簿状态预测短期价格与成交概率（但要警惕微观结构噪声的过拟合）；
        加密与 DeFi 市场把做市写进合约（AMM 的常数函数曲线是显式的价差—深度函数，无常损失是库存风险的另一种写法）；
        系统性韧性与闪崩机制；以及新兴市场特有的涨跌停、T+1 与散户主导结构对经典结论的修正。
      </P>

      <H n="9" en="Research Design" zh="研究设计与四阶段学习路线" />
      <P>
        做微观结构实证前先过一遍这份清单：时间戳精度与撮合延迟是否一致；成交方向标注误差如何影响结论；
        是否剔除开收盘与集合竞价样本；日内周期性（U 形价差）是否已去除；跨市场比较是否统一了 tick size 与费率结构；
        样本是否覆盖至少一次压力事件。缺任何一条，价差与冲击的估计都可能被系统性偏移。
      </P>
      <P>
        学习路线：① 先把价差三分解与四类流动性度量算清楚；② 再走库存与信息两条经典模型线（Ho-Stoll / Kyle / GM / PIN）；
        ③ 然后进入订单簿：make-or-take、排队价值、仿真与自激；④ 最后做市场设计与韧性：tick、拍卖、熔断、暗池、流动性蒸发。
      </P>
      <div className="mt-6">
        <ToolLink label="进入微观结构实验室" note="按上述四阶段顺序逐个复现" to={LAB} />
      </div>
    </article>
  );
}
