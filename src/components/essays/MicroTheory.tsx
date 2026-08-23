import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Reading guide for microeconomics: preferences → production → market
 * structure → games → information → mechanism design.
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

const LAB = "/s/micro";
const BEHAVIOR = "/s/behavior-theory";
const MICROSTRUCTURE = "/s/microstructure-theory";

const structures = [
  { k: "完全竞争", d: "无穷多个体、同质产品、自由进出", p: "P = MC，长期经济利润为零" },
  { k: "垄断", d: "单一卖方与向下倾斜的需求曲线", p: "MR = MC，加成由需求弹性决定" },
  { k: "垄断竞争", d: "差异化产品 + 自由进入", p: "P > MC 但长期利润仍被进入抹平" },
  { k: "寡头", d: "少数厂商、策略互动", p: "Cournot 产量竞争 / Bertrand 价格竞争结果迥异" },
];

export default function MicroTheory() {
  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · Microeconomics</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          微观经济学导读：从偏好排序，到价格信号、策略互动与机制设计
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          微观经济学只研究一件事：
          <strong className="text-foreground">在约束下做选择，以及这些选择如何在互动中汇总成价格与配置</strong>。
          金融里的每一个模型——效用最大化、风险溢价、做市商报价、信息不对称——都在这套语言里有原型。
        </p>
        <div className="mt-6">
          <ToolLink label="微观经济学实验室" note="供需均衡 · 消费者与生产者最优 · 市场结构" to={LAB} />
        </div>
      </header>

      <H n="1" en="Preferences & Utility" zh="偏好与效用：选择的公理化基础" />
      <P>
        效用函数不是「幸福感的度量」，它只是对一组满足完备性、传递性、连续性的偏好排序的数值表示。
        这一点非常重要：效用是序数的，任何单调变换都表示同一个偏好，因此「效用翻倍」本身没有意义。
      </P>
      <Eq note="边际替代率等于价格比 —— 消费者最优的一阶条件">
        MRS₁₂ = MU₁ / MU₂ = p₁ / p₂，s.t. p·x = m
      </Eq>
      <P>
        由此得到需求函数，并可将价格变化分解为替代效应（相对价格改变）与收入效应（实际购买力改变）。
        Slutsky 分解正是后来资产定价里跨期替代与财富效应分离的原型。
      </P>
      <Caution title="到金融的桥">
        把商品换成「不同状态下的消费」，消费者最优条件就变成了随机贴现因子 m = δ·u′(c₁)/u′(c₀)——
        资产定价方程 p = E[mx] 只是微观最优化的状态空间版本。
      </Caution>
      <ToolLink label="消费者最优与需求" note="预算约束下的无差异曲线切点" to={LAB} />

      <H n="2" en="Production & Cost" zh="生产、成本与供给" />
      <P>
        厂商问题是同一套最优化的对偶面：给定技术（生产函数）与要素价格，先解成本最小化得到成本函数，
        再解利润最大化得到供给。规模报酬决定长期成本曲线形状，也决定行业能否被少数厂商主导。
      </P>
      <Eq note="竞争性厂商的供给条件；边际成本曲线在平均可变成本之上的部分即供给曲线">
        max π = p·q − C(q) ⟹ p = MC(q)
      </Eq>
      <P>
        沉没成本与固定成本的区别决定了短期停产点与长期退出点不同——这也是理解产能过剩与价格战的关键。
      </P>

      <H n="3" en="Market Structure" zh="市场结构：从完全竞争到寡头" />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">结构</th>
              <th className="px-4 py-3">条件</th>
              <th className="px-4 py-3">定价结果</th>
            </tr>
          </thead>
          <tbody>
            {structures.map((s) => (
              <tr key={s.k} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{s.k}</td>
                <td className="px-4 py-3 text-foreground/80">{s.d}</td>
                <td className="px-4 py-3 text-foreground/60">{s.p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Eq note="Lerner 指数：加成幅度由需求弹性倒数决定">
        (P − MC) / P = 1 / |ε|
      </Eq>
      <ToolLink label="市场结构对比" note="Cournot / Bertrand 与垄断加成" to={LAB} />

      <H n="4" en="Games & Strategy" zh="博弈与策略互动" />
      <P>
        当参与者足够少，价格不再是外生的：每个人的最优反应依赖别人的选择。纳什均衡是「没有人愿意单方面偏离」的状态，
        而非「集体最优」——囚徒困境正是二者背离的最小例子。
      </P>
      <P>
        动态博弈要用子博弈完美均衡（逆向归纳）剔除不可置信威胁；重复博弈则说明为何长期关系能支撑合作，
        这正是做市商声誉、清算所违约管理与承销关系的理论基础。
      </P>

      <H n="5" en="Information Asymmetry" zh="信息不对称：逆向选择与道德风险" />
      <P>
        信息经济学是微观与金融交叉最密的地带。
        <strong className="text-foreground">逆向选择</strong>发生在签约之前（柠檬市场：低质量把高质量挤出去），
        <strong className="text-foreground">道德风险</strong>发生在签约之后（行为不可观测导致努力不足或过度冒险）。
      </P>
      <Eq note="信号传递要求成本单交叉：高类型付出的信号成本更低">
        分离均衡存在 ⟺ ∂²c(s,θ)/∂s∂θ &lt; 0
      </Eq>
      <P>
        对应的三条解法：信号传递（教育、股利、抵押）、筛选（保险自付额、贷款条款菜单）、激励合约（股权、递延奖金）。
        市场微观结构里的买卖价差，本质就是做市商对逆向选择的定价。
      </P>
      <div>
        <ToolLink label="做市商与信息不对称" note="Glosten-Milgrom 的价差即逆向选择成本" to={MICROSTRUCTURE} />
        <ToolLink label="行为金融导读" note="当理性假设被放松后会发生什么" to={BEHAVIOR} />
      </div>

      <H n="6" en="Welfare & Mechanism Design" zh="福利与机制设计" />
      <P>
        两条福利定理界定了市场的能力边界：竞争均衡是帕累托有效的（第一定理），任何帕累托有效配置都能通过初始禀赋再分配加市场实现（第二定理）。
        它们的前提——完全竞争、无外部性、无公共品、信息完全——恰好列出了所有市场失灵的清单。
      </P>
      <P>
        机制设计把问题反过来问：给定人们会策略性谎报，如何设计规则让说真话成为最优？
        Vickrey 二价拍卖、双边拍卖的开盘集合竞价、频谱拍卖都是这一思想的落地。
      </P>
      <Caution title="研究流程">
        分析任何微观问题按五步走：① 谁是参与者、行动集是什么；② 目标函数与约束；③ 均衡概念（竞争 / 纳什 / 贝叶斯纳什）；
        ④ 比较静态（参数变动的方向）；⑤ 福利评价与政策含义。
      </Caution>
      <div className="mt-6">
        <ToolLink label="进入微观经济学实验室" note="把上面每一节的比较静态调一遍" to={LAB} />
      </div>
    </article>
  );
}
