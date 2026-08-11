import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Structured reading guide for behavioral finance (V5.9).
 * Chain: framing question → two pillars → prospect theory → bias atlas →
 * emotion & herding → limits of arbitrage → anomalies → corporate → frontier.
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

const LAB = "/s/behavior-lab";
const MICRO = "/s/behavior-microstructure";

const biasAtlas = [
  { n: "B1", t: "过度自信", d: "高估信号精度与控制力，叠加自我归因后自我强化", out: "换手率上升、分散化不足、净 alpha 被交易成本吞噬" },
  { n: "B2", t: "代表性", d: "以相似性替代基准率，忽略样本量与均值回归", out: "外推近期增长 → 成长股高估 → 长期反转" },
  { n: "B3", t: "保守主义", d: "对抽象统计信息更新过慢", out: "盈余公告后漂移 PEAD、分析师预测粘性" },
  { n: "B4", t: "锚定与调整", d: "以任意起点为锚，调整幅度不足", out: "52 周高点效应、目标价粘着" },
  { n: "B5", t: "有限注意", d: "注意力是稀缺资源，显著性决定信息进入价格的顺序", out: "周五公告反应弱、分心日漂移更长" },
  { n: "B6", t: "心理账户", d: "资金按来源与用途分账，违反可替代性", out: "股利偏好、持有亏损仓位同时融资消费" },
  { n: "B7", t: "处置效应", d: "参照点依赖 + 敏感性递减", out: "过早止盈、过久持亏，放大 PEAD" },
];

const anomalies = [
  { a: "动量", beh: "信息缓慢扩散 + 趋势追随（HS）、自我归因（DHS）", rival: "风险载荷时变、拥挤交易溢价" },
  { a: "长期反转", beh: "代表性外推后的均值回归（BSV）", rival: "价值因子、困境风险" },
  { a: "PEAD", beh: "保守主义 + 有限注意", rival: "流动性与信息成本" },
  { a: "彩票型股票低收益", beh: "概率权重高估小概率大奖", rival: "杠杆约束下的 beta 套利" },
  { a: "封闭式基金折价", beh: "散户情绪的直接代理", rival: "费率、税负与流动性" },
  { a: "IPO 长期跑输", beh: "情绪窗口发行 + 择时", rival: "样本与基准设定敏感" },
];

export default function BehaviorTheory() {
  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · V5.9</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          行为金融导读：有限理性与有限套利
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          行为金融的核心不是宣布「投资者不理性」，而是把有限认知、情绪与社会互动放进定价、交易、公司决策与制度之中。
          它的两根支柱是心理学意义的<strong className="text-foreground">有限理性</strong>与金融制度意义的
          <strong className="text-foreground">有限套利</strong>：前者说明偏差为何有方向，后者说明错价为何能持续。
        </p>
        <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
          <p className="text-[13px] font-mono text-foreground/80 leading-[1.9]">
            可检验的因果链条：心理机制 → 信念 / 偏好 / 注意力的扭曲 → 交易与公司决策 →
            在特定套利约束下的价格与配置后果 → 与风险、数据挖掘和制度解释的竞争性检验。
          </p>
        </div>
      </header>

      <H n="01" en="The Framing Question" zh="行为金融究竟在问什么" />
      <P>
        传统基准由三层假设构成：偏好稳定连贯、按贝叶斯更新；约束下最大化期望效用；竞争性套利把价格推向基本面均衡。
        行为金融不要求这些假设处处错误，它问的是：当它们作为<strong className="text-foreground">描述性前提</strong>系统性失效时，价格、资源配置与公司政策会发生什么。
      </P>
      <Eq note="把「行为」翻译成可观察变量，是全部实证工作的起点">
        行为主体（偏好·信念·注意力） + 市场摩擦（风险·约束·制度） + 反馈机制 = 可检验的金融结果
      </Eq>
      <Caution title="联合假设问题">
        发现「异常收益」时，被同时检验的是市场效率与资产定价模型是否正确。Fama 对长期收益异常的回应指出，
        过度反应与反应不足的证据大致并存，且结论对基准模型与统计方法高度敏感——单个异象不构成对效率市场的决定性证伪。
      </Caution>

      <H n="02" en="Two Pillars" zh="两大支柱：有限理性与有限套利" />
      <P>
        有限理性的关键不是「人会犯错」，而是错误具有<strong className="text-foreground">方向性、稳定性与情境依赖性</strong>：
        信念偏差（过度自信、代表性、锚定、可得性）、偏好偏离（损失厌恶、概率加权、现时偏好、心理账户）、
        注意力与社会机制（有限注意、显著性、从众、信息瀑布）。
      </P>
      <P>
        但偏差要影响价格，还须满足三个条件：偏差在主体间相关、影响足够大的边际交易者、反向交易受到约束。
        第三条正是有限套利：专业套利者使用外部资金，面临赎回、保证金、业绩排名与职业声誉约束；当错价扩大而非收敛时，长期判断正确也可能被迫平仓。
      </P>
      <div className="mt-4">
        <ToolLink label="有限套利与被迫平仓" note="保证金 / 赎回敏感度 / 错价半衰期" to={`${LAB}#limits`} />
        <ToolLink label="DSSW 噪声交易者 IRF" note="噪声交易者风险的持续性" to={MICRO} />
      </div>

      <H n="03" en="Prospect Theory" zh="前景理论：行为金融的偏好基础" />
      <Eq note="r 是参照点，v(·) 为价值函数，π(·) 为决策权重">
        V = Σᵢ π(pᵢ) · v(xᵢ − r)
      </Eq>
      <P>
        价值函数在收益域凹（敏感性递减、倾向锁定收益）、损失域凸（为避免确定损失而冒险）、损失侧更陡（损失厌恶 λ&gt;1）。
        概率权重则高估小概率、低估高概率但非确定的结果，产生「四重风险态度」：
        高概率收益风险厌恶、高概率损失风险寻求、低概率收益风险寻求、低概率损失风险厌恶。
      </P>
      <P>
        市场含义：以买入价、历史高点或账户盈亏为参照点，会产生处置效应；
        损失厌恶叠加频繁评估形成「短视损失厌恶」，可为股权溢价之谜提供一种行为解释；
        小概率高收益被过度加权，则连接彩票型股票需求与保险需求。
      </P>
      <div className="mt-4">
        <ToolLink label="累积前景理论 CPT" note="价值函数 / 概率权重 / 四重态度矩阵" to={`${LAB}#cpt`} />
        <ToolLink label="短视损失厌恶" note="评估频率 → 隐含股权溢价" to={`${LAB}#mla`} />
        <ToolLink label="处置效应模拟" note="PGR / PLR 比率" to={MICRO} />
      </div>
      <Caution title="局限">
        参照点既非外生也不可直接观察，不同参照点导出不同预测；概率加权函数的形状与参数在不同实验、资产与时间尺度上并不稳定。
        从实验室的单次选择外推到长期组合投资，需要额外论证。
      </Caution>

      <H n="04" en="Bias Atlas" zh="认知偏差图谱：从心理机制到交易后果" />
      <div className="space-y-2 mt-2">
        {biasAtlas.map((b) => (
          <div key={b.n} className="rounded-xl border border-border bg-card/40 px-4 py-3">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] font-mono text-gold">{b.n}</span>
              <span className="text-[15px] text-foreground">{b.t}</span>
            </div>
            <p className="text-[13px] text-foreground/70 mt-1 leading-[1.75]">{b.d}</p>
            <p className="text-[12px] font-mono text-muted-foreground mt-1">市场后果：{b.out}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ToolLink label="过度自信换手率" note="k 膨胀 → 净 alpha 下降" to={MICRO} />
        <ToolLink label="DHS 过度自信模型" note="自我归因 → 动量后反转" to={`${LAB}#dhs`} />
      </div>

      <H n="05" en="Emotion, Herding, Contagion" zh="情绪、羊群与社会传染" />
      <P>
        情绪不是认知偏差的附属品：恐惧与兴奋改变风险感知本身，而非只是改变计算精度。
        群体层面上，理性的信息瀑布（后来者忽略私有信号、跟随公开行动）与委托代理下的声誉性从众，
        都能在无人「非理性」的情况下产生羊群行为。社交媒体与零售投资者的注意力共振，则把这一机制的时间尺度压缩到了以小时计。
      </P>

      <H n="06" en="Limits of Arbitrage & Noise Trading" zh="有限套利、噪声交易与错价的持续性" />
      <P>
        纠偏的速度与规模是内生的：错价越难界定、替代证券越不匹配、卖空越受限、资金越短期化，偏差越可能成为均衡的一部分。
        DSSW 进一步说明，噪声交易者风险本身就是一种风险——套利者担心错价在收敛前先扩大，因此不会以无限规模下注，噪声交易者反而可能获得更高的期望回报。
      </P>
      <div className="mt-4">
        <ToolLink label="有限套利实验" note="资本路径 / 被迫平仓临界点" to={`${LAB}#limits`} />
        <ToolLink label="Kyle & Glosten-Milgrom" note="信息如何通过订单流进入价格" to={MICRO} />
      </div>

      <H n="07" en="Anomalies" zh="经典异象与竞争性解释" />
      <div className="overflow-x-auto mt-2 rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">异象</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">行为机制</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">竞争性解释</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((r) => (
              <tr key={r.a} className="border-t border-border/60">
                <td className="px-4 py-2.5 text-foreground">{r.a}</td>
                <td className="px-4 py-2.5 text-foreground/70">{r.beh}</td>
                <td className="px-4 py-2.5 text-foreground/55">{r.rival}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <ToolLink label="BSV 信念模型" note="反应不足 → 过度反应 → 反转" to={`${LAB}#bsv`} />
        <ToolLink label="Hong-Stein 缓慢扩散" note="无需个体偏差的动量" to={`${LAB}#hs`} />
        <ToolLink label="投资者情绪截面" note="难估值 / 难套利腿的后续收益" to={`${LAB}#sentiment`} />
      </div>

      <H n="08" en="Behavioral Corporate Finance" zh="行为公司金融：双向框架" />
      <P>
        一个方向是「非理性管理者 + 理性市场」：过度自信的 CEO 高估自身项目、认为外部融资被低估，
        表现为投资对内部现金流高度敏感、并购溢价过高、推迟行使自身期权。
        另一个方向是「理性管理者 + 非理性市场」：管理者在市场高估时发行、低估时回购，
        资本结构因此成为历史市值的累积产物，而非静态权衡的解。
      </P>
      <div className="mt-4">
        <ToolLink label="管理者过度自信与市场时机" note="投资—现金流敏感性 / 杠杆演化" to={`${LAB}#corporate`} />
      </div>
      <Caution title="识别难点">
        投资—现金流敏感性同样可由融资约束解释；过度自信的代理变量可能捕捉的是私有信息而非偏差。
        可信设计需要外生冲击、制度变化或高质量的管理者层面面板数据。
      </Caution>

      <H n="09" en="Frontier & Research Design" zh="前沿方向与研究设计守则" />
      <P>
        当前的活跃边界包括：机构投资者是否真的更理性（委托代理可能把偏差放大而非消解）、
        社交媒体与注意力驱动的零售交易、用机器学习识别行为模式并评估异象的可持续性（发表后衰减）、
        行为宏观金融与信念外推驱动的信用周期，以及监管与投资者保护中的规范性问题（默认选项、助推与信息披露格式）。
      </P>
      <div className="space-y-2 mt-4">
        {[
          ["明确反事实与竞争机制", "先写下「如果是风险解释，会看到什么」，再检验哪一个被数据拒绝"],
          ["测度不能只靠单一代理", "情绪、注意力、过度自信都应有多个独立代理交叉验证"],
          ["把有限套利作为异质性检验", "效应应在套利更难的截面更强，这是最有力的机制证据"],
          ["区分统计、经济与可交易显著", "扣除交易成本、容量约束与做空成本后是否还存在"],
          ["追踪学习与制度变化", "机制被削弱后效应应当减弱，否则更像数据挖掘"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border border-border/60 bg-card/30 px-4 py-2.5">
            <p className="text-[14px] text-foreground">{t}</p>
            <p className="text-[12px] text-foreground/60 mt-0.5 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border border-border bg-card/40 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-2">学习路线图</p>
        <p className="text-[13px] text-foreground/70 leading-[1.9]">
          阶段一（2—4 周）建立规范基准：EMH、CAPM/多因子、联合假设问题。
          阶段二（3—5 周）心理学微观基础：前景理论、启发式与偏差、实验方法。
          阶段三（4—6 周）有限套利与均衡行为模型：DSSW、Shleifer-Vishny、BSV / DHS / HS。
          阶段四（4—8 周）把理论映射到数据：事件研究、截面回归、情绪代理与机制检验。
          阶段五（持续）行为公司金融与前沿：管理者偏差、市场时机、行为宏观金融。
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">参考文献</p>
        <p>
          Fama (1998) Market Efficiency, Long-Term Returns, and Behavioral Finance · Shleifer &amp; Vishny (1997)
          The Limits of Arbitrage · Barberis, Shleifer &amp; Vishny (1998) · Hong &amp; Stein (1999) ·
          Kahneman &amp; Tversky (1979); Tversky &amp; Kahneman (1992) · Benartzi &amp; Thaler (1995) ·
          Odean (1998); Barber &amp; Odean (2001) · De Long, Shleifer, Summers &amp; Waldmann (1990) ·
          Baker &amp; Wurgler (2006, 2002) · Malmendier &amp; Tate (2005) · Barberis (2018) Psychology-Based Models of Asset Prices.
        </p>
      </div>
    </article>
  );
}