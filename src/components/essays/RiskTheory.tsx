import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Structured reading guide for the risk-management toolkit (V5.8).
 * Chain: nature of risk → taxonomy → market risk → credit → liquidity/op/model
 * → Basel & FRTB → crisis history → systemic frontier → judgement → roadmap.
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

const ToolLink = ({ label, note, to = "/s/risk" }: { label: string; note: string; to?: string }) => (
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

const loop = [
  { k: "识别", v: "风险来自哪里", note: "敞口图谱、隐性杠杆、表外与或有负债" },
  { k: "计量", v: "分布而非点值", note: "VaR / ES / 谱测度，永远配一个置信水平与期限" },
  { k: "定价", v: "风险要收费", note: "资本成本、信用利差、XVA 与流动性溢价" },
  { k: "控制", v: "限额与对冲", note: "限额体系、抵押品、缓冲与恢复计划" },
  { k: "复盘", v: "回测与治理", note: "Kupiec / 交通灯 / FZ 打分、三道防线" },
];

const taxonomy = [
  { n: "R1", t: "市场风险", d: "价格、利率、汇率、波动率与基差；可高频观测，也最容易被低估尾部", tools: "VaR 三法 · 波动率与 FHS · EVT" },
  { n: "R2", t: "信用风险", d: "违约、迁移与交易对手风险；分布极度左偏，相关性由共同因子驱动", tools: "Merton · IRB 资本 · 评级迁移 CreditMetrics" },
  { n: "R3", t: "流动性风险", d: "市场流动性（卖不掉）与融资流动性（借不到）互相强化", tools: "LVaR · 融资流动性与去杠杆螺旋" },
  { n: "R4", t: "操作与模型风险", d: "低频高损的操作损失、以及「模型本身是错的」这一层风险", tools: "OpVaR LDA · 模型风险与稳健决策" },
  { n: "R5", t: "系统性风险", d: "个体稳健不等于系统稳健：网络传染、拥挤交易与顺周期性", tools: "CoVaR / MES / SRISK · 传染网络" },
];

const measures = [
  { name: "VaR", use: "监管沟通、限额设定、直观分位数", limit: "不满足次可加性，对尾形状完全不敏感" },
  { name: "ES / CVaR", use: "尾部均值，一致性风险测度，FRTB 采用", limit: "单独不可引出，回测需联合打分函数" },
  { name: "谱测度", use: "用风险厌恶权重函数刻画偏好", limit: "权重函数的选择本身是主观建模" },
  { name: "扭曲测度", use: "Wang 变换连接定价与风险度量", limit: "参数缺乏统一校准标准" },
  { name: "最大回撤 / 生存天数", use: "路径依赖、面向经营者的直觉指标", limit: "统计性质差，样本依赖极强" },
];

const timeline = [
  { y: "1952", t: "Markowitz 方差即风险", d: "第一次把风险量化为可优化的对象" },
  { y: "1988", t: "Basel I", d: "简单风险权重与 8% 资本底线，监管资本时代开始" },
  { y: "1994", t: "RiskMetrics 与 VaR", d: "一个数字概括交易账簿风险，也埋下尾部盲区" },
  { y: "1998", t: "LTCM", d: "杠杆 + 流动性 + 相关性同时失效，模型的自负第一次被清算" },
  { y: "1999", t: "一致性风险测度", d: "Artzner 等人给出四公理，VaR 的次可加性缺陷被写成定理" },
  { y: "2007-09", t: "全球金融危机", d: "证券化、影子银行与融资螺旋；顺周期性成为核心议题" },
  { y: "2010-", t: "Basel III", d: "CET1、缓冲、杠杆率、LCR / NSFR，从资本充足走向流动性与韧性" },
  { y: "2019-", t: "FRTB 与气候压力测试", d: "ES 取代 VaR，情景与前瞻性方法取代纯历史校准" },
];

const misuse = [
  "报告 VaR 却不写置信水平与持有期，或跨机构直接比较不同口径的数字。",
  "用正态分布拟合收益率并宣称尾部可控——实际尾部厚度往往被低估一个数量级。",
  "把历史模拟当作无假设方法，忽略它假设了「未来的分布等于样本窗口的分布」。",
  "在平静期用低波动率校准限额，导致风险预算在危机来临前恰好被用满（顺周期陷阱）。",
  "把相关性当作常数：危机中分散化恰恰在最需要的时候失效。",
  "压力测试只做单因子平移，而不检验历史一致的多因子联合冲击与反向情景。",
  "把资本充足等同于安全，忽略融资流动性与抵押品折扣的螺旋放大。",
];

const checklist = [
  "任何风险数字都带三件套：测度（VaR/ES）、置信水平、持有期与货币口径。",
  "尾部方法要说明：参数化 / 历史 / FHS / EVT，以及窗口长度与加权方案。",
  "回测必须报告：例外次数、Kupiec 与条件覆盖检验、ES 的联合打分结果。",
  "信用组合要区分预期损失（进拨备与定价）与非预期损失（进资本）。",
  "披露相关性与集中度假设，并给出 HHI、Component VaR 与最大单一敞口。",
  "对关键参数做模型不确定性区间，并把差异转化为明确的资本缓冲。",
  "流动性视角与资本视角并列：LCR / NSFR、生存天数、抵押品折扣冲击。",
  "压力测试给出反向情景（什么会让我们倒下）与恢复计划触发点。",
];

const roadmap = [
  { s: "第一阶段", t: "分布与度量", d: "收益率分布、分位数、VaR/ES 与一致性公理" },
  { s: "第二阶段", t: "波动率与尾部", d: "EWMA / GARCH、FHS、EVT 与 Copula 相依结构" },
  { s: "第三阶段", t: "信用与资本", d: "Merton、PD/LGD/EAD、Vasicek 与 IRB 公式" },
  { s: "第四阶段", t: "监管与韧性", d: "Basel 资本栈、LCR / NSFR、FRTB 与多期资本轨道" },
  { s: "第五阶段", t: "系统与前沿", d: "CoVaR / SRISK、网络传染、气候与模型风险治理" },
];

const RiskTheory = () => (
  <div className="container max-w-3xl px-6 pt-6 pb-24">
    <Reveal>
      <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase mb-3">Reading Guide · V5.8</p>
      <h1 className="font-display text-3xl md:text-[42px] leading-[1.15] text-foreground mb-4">
        金融风险管理导读 · 从计量指标到资本、监管与韧性
      </h1>
      <p className="text-[15px] leading-[1.85] text-foreground/70">
        风险管理不是「预测明天」，而是「在承认无法预测的前提下，仍然活下来」。本文按十节组织：
        风险本质与闭环、分类与相互作用、市场风险计量、信用框架、流动性/操作/模型风险、Basel 与 FRTB、
        危机史、系统性与前沿、稳健性判断框架、学习路线图——每一节都可以跳到风险版块的实验室里复现。
      </p>
    </Reveal>

    <Reveal>
      <H n="01" en="What Risk Is" zh="一、风险的本质与管理闭环" />
      <P>
        风险不是「坏事发生」，而是结果的分布本身。管理风险的第一步是承认我们处理的是概率对象：
        同一个头寸在不同分布假设下可以给出相差数倍的资本要求。可计量的是风险，不可赋概率的是不确定性，
        而真正击垮机构的往往是后者——这决定了缓冲与情景思维必须与模型并行。
      </P>
      <EquationBlock math={String.raw`\mathrm{VaR}_\alpha(L)=\inf\{\ell:\ \mathbb P(L\le \ell)\ge\alpha\},\qquad \mathrm{ES}_\alpha(L)=\frac{1}{1-\alpha}\int_\alpha^1 \mathrm{VaR}_u(L)\,du`} />
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 my-6">
        {loop.map((c) => (
          <div key={c.k} className="rounded-lg border border-border/60 bg-card/30 p-3">
            <p className="text-[10px] font-mono text-gold uppercase tracking-wider">{c.k}</p>
            <p className="text-sm text-foreground mt-1">{c.v}</p>
            <p className="text-[11px] text-foreground/55 mt-1 leading-relaxed">{c.note}</p>
          </div>
        ))}
      </div>
      <ToolLink label="风险度量公理台" note="次可加性反例、谱/扭曲测度、可引出性打分" />
    </Reveal>

    <Reveal>
      <H n="02" en="Taxonomy & Interaction" zh="二、风险分类与相互作用" />
      <P>
        分类的意义不在于贴标签，而在于提醒我们风险之间会互相转化：市场下跌抬高违约概率，违约传闻抽走融资，
        融资断裂逼出抛售，抛售又压低价格。危机就是这些「独立」类别在同一时刻高度相关。
      </P>
      <div className="space-y-2 my-5">
        {taxonomy.map((l) => (
          <div key={l.n} className="rounded-lg border border-border/60 bg-card/25 p-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono text-gold">{l.n}</span>
              <span className="text-sm text-foreground">{l.t}</span>
            </div>
            <p className="text-[12.5px] text-foreground/65 mt-1 leading-relaxed">{l.d}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-1">→ {l.tools}</p>
          </div>
        ))}
      </div>
    </Reveal>

    <Reveal>
      <H n="03" en="Market Risk Measurement" zh="三、市场风险：从分位数到条件分布" />
      <P>
        参数法快但假设正态；历史法无参数但假设历史可重复；蒙特卡洛灵活但依赖模型。三者的分歧本身就是信息。
        更好的做法是先过滤波动率再模拟：用 EWMA/GARCH 把收益标准化，抽取标准化残差再乘以条件波动率预测，
        这就是过滤式历史模拟（FHS），它同时保留了厚尾形状与波动率聚集。
      </P>
      <EquationBlock math={String.raw`\sigma_t^2=\omega+\alpha\varepsilon_{t-1}^2+\beta\sigma_{t-1}^2,\qquad z_t=\varepsilon_t/\sigma_t,\qquad r^{*}_{T+1}=\sigma_{T+1}\,z^{*},\ z^{*}\sim\widehat F_z`} />
      <ToolLink label="波动率与过滤式历史模拟" note="EWMA / GARCH / HAR 对比 + FHS 条件 VaR/ES" />
      <ToolLink label="VaR 三法对比" note="参数 / 历史 / 蒙特卡洛的口径差异" />
      <ToolLink label="EVT 峰值超阈法" note="GPD 拟合尾部，超越样本极值" />
    </Reveal>

    <Reveal>
      <H n="04" en="Credit Framework" zh="四、信用风险：从结构式到组合资本" />
      <P>
        结构式（Merton）把股权看作对资产的看涨期权，违约是资产价值跌破债务面值；约化式把违约看作强度为 λ 的跳跃。
        组合层面则必须回答相关性问题：Vasicek 单因子模型给出条件独立框架，Basel IRB 公式正是它在 99.9% 分位上的封闭解。
      </P>
      <EquationBlock math={String.raw`K=\mathrm{LGD}\left[\Phi\!\left(\frac{\Phi^{-1}(\mathrm{PD})+\sqrt{R}\,\Phi^{-1}(0.999)}{\sqrt{1-R}}\right)-\mathrm{PD}\right]\frac{1+(M-2.5)b}{1-1.5b}`} />
      <P>
        注意资本公式扣掉了 PD·LGD：预期损失应由拨备与定价覆盖，资本只承担非预期损失。
        评级迁移（CreditMetrics）进一步把「未违约但降级」的估值损失纳入分布，这在投资级组合中往往占损失的大头。
      </P>
      <ToolLink label="PD / LGD / EAD 与 IRB 资本台" note="EL/UL 分解、相关性函数、期限调整、顺周期性" />
      <ToolLink label="评级迁移与 CreditMetrics" note="迁移矩阵幂、生成元、信用 VaR 与损失分解" />
      <ToolLink label="信用组合 Copula" note="相依结构如何塑造组合尾部" />
    </Reveal>

    <Reveal>
      <H n="05" en="Liquidity, Operational & Model Risk" zh="五、流动性、操作与模型风险" />
      <P>
        流动性风险有两面：市场流动性决定你能以什么价格退出，融资流动性决定你是否被迫退出。二者通过保证金螺旋耦合——
        价格下跌抬高折扣率，折扣率抬高触发抛售，抛售再压低价格，放大倍数远超初始冲击。
      </P>
      <EquationBlock math={String.raw`A_t\le \frac{E_t}{m_t},\qquad \Delta p=\lambda\frac{\text{sales}}{A_0},\qquad \text{Amplification}=\frac{\text{direct}+\text{spiral}}{\text{direct}}`} />
      <P>
        操作风险用损失分布法建模（频率 × 强度），尾部由少数极端事件主导；而模型风险是最容易被忽视的一层：
        当多个合理模型给出显著不同的 VaR 时，差异本身就应转化为资本缓冲，而不是挑一个最低的数字上报。
      </P>
      <ToolLink label="融资流动性与螺旋" note="折扣冲击、去杠杆循环、生存天数" />
      <ToolLink label="流动性调整 VaR" note="点差成本与最优清算轨迹" />
      <ToolLink label="模型风险与稳健决策" note="模型分歧带、ε-污染稳健、三道防线检查表" />
    </Reveal>

    <Reveal>
      <H n="06" en="Basel & FRTB" zh="六、Basel 资本栈与 FRTB" />
      <P>
        监管框架的演进方向很清楚：从单一资本比率，走向资本 + 缓冲 + 杠杆率 + 流动性比率的多重约束。
        缓冲不是硬底线而是「可用区」——一旦侵蚀，分红与奖金按 MDA 阶梯受限，这正是缓冲设计的激励机制。
      </P>
      <EquationBlock math={String.raw`\frac{\mathrm{CET1}}{\mathrm{RWA}}\ge 4.5\%+\mathrm{CCB}+\mathrm{CCyB}+\mathrm{GSIB},\qquad \mathrm{LCR}=\frac{\mathrm{HQLA}}{\text{30d net outflows}}\ge 100\%,\qquad \mathrm{NSFR}=\frac{\mathrm{ASF}}{\mathrm{RSF}}\ge 100\%`} />
      <P>
        交易账簿方面，FRTB 用 97.5% ES 取代 99% VaR，并按流动性期限分桶缩放，同时对不可建模风险因子单独加罚。
        方向是一致的：让资本对尾部形状与变现难度敏感，而不只是对波动率敏感。
      </P>
      <ToolLink label="Basel 资本栈与 LCR / NSFR" note="CET1/AT1/T2、缓冲、MDA、杠杆率与流动性比率" />
      <ToolLink label="FRTB IMA" note="97.5% ES、流动性期限缩放、交通灯回测" />
    </Reveal>

    <Reveal>
      <H n="07" en="Crisis History" zh="七、危机史：范式如何被迫更新" />
      <div className="space-y-2 my-5">
        {timeline.map((e) => (
          <div key={e.y} className="flex gap-3 rounded-lg border border-border/50 bg-card/20 p-3">
            <span className="text-[11px] font-mono text-gold w-16 shrink-0 pt-0.5">{e.y}</span>
            <span>
              <span className="block text-sm text-foreground">{e.t}</span>
              <span className="block text-[12.5px] text-foreground/60 leading-relaxed mt-0.5">{e.d}</span>
            </span>
          </div>
        ))}
      </div>
      <P>
        每一次危机的共同结构惊人相似：低波动催生高杠杆，高杠杆放大微小冲击，流动性在最需要时消失。
        这也是为什么反向压力测试比正向情景更有价值——它逼你说出「什么会让我们倒下」。
      </P>
      <ToolLink label="反向压力测试" note="Mahalanobis 最小可信冲击" />
      <ToolLink label="压力测试与情景分析" note="历史一致的多因子联合冲击" />
    </Reveal>

    <Reveal>
      <H n="08" en="Systemic & Frontier" zh="八、系统性风险与前沿议题" />
      <P>
        微观审慎的加总不等于宏观审慎：当所有机构使用相似的风险模型与限额，它们会在同一时刻做同一件事，
        风险管理本身成为风险来源。度量上，CoVaR 关注「它出事时系统怎样」，MES/SRISK 关注「系统出事时它缺多少资本」。
      </P>
      <EquationBlock math={String.raw`\Delta\mathrm{CoVaR}^{\,\mathrm{sys}|i}_\alpha=\mathrm{CoVaR}^{\,\mathrm{sys}|L_i=\mathrm{VaR}_\alpha^i}-\mathrm{CoVaR}^{\,\mathrm{sys}|L_i=\mathrm{median}^i},\qquad \mathrm{SRISK}=kD-(1-k)(1-\mathrm{LRMES})E`} />
      <ToolLink label="系统性风险 (CoVaR / MES / SRISK)" note="外溢度量与资本缺口" />
      <ToolLink label="韧性与恢复计划" note="多期资本轨道、缓冲释放、恢复触发点" />
      <ToolLink label="气候 VaR" note="转型与物理风险的长期情景" to="/s/frontier" />
    </Reveal>

    <Reveal>
      <H n="09" en="Judgement Framework" zh="九、稳健性判断框架" />
      <P>下表是选择度量时最常用的取舍；再往下是常见误用与一份可直接照做的报告清单。</P>
      <div className="rounded-xl border border-border/60 overflow-hidden my-5">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-3 py-2">度量</th><th className="text-left px-3 py-2">适用</th><th className="text-left px-3 py-2">边界</th></tr>
          </thead>
          <tbody>
            {measures.map((m) => (
              <tr key={m.name} className="border-t border-border/40">
                <td className="px-3 py-2 text-foreground whitespace-nowrap">{m.name}</td>
                <td className="px-3 py-2 text-foreground/70">{m.use}</td>
                <td className="px-3 py-2 text-foreground/60">{m.limit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">常见误用</p>
      <ul className="space-y-2 mb-6">
        {misuse.map((m) => (
          <li key={m} className="text-[14px] leading-relaxed text-foreground/75 pl-4 border-l-2 border-destructive/40">{m}</li>
        ))}
      </ul>
      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">报告清单</p>
      <ul className="space-y-2">
        {checklist.map((c) => (
          <li key={c} className="text-[14px] leading-relaxed text-foreground/75 pl-4 border-l-2 border-gold/40">{c}</li>
        ))}
      </ul>
    </Reveal>

    <Reveal>
      <H n="10" en="Learning Roadmap" zh="十、学习路线图" />
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 my-5">
        {roadmap.map((r) => (
          <div key={r.s} className="rounded-lg border border-border/60 bg-card/30 p-3">
            <p className="text-[10px] font-mono text-gold uppercase tracking-wider">{r.s}</p>
            <p className="text-sm text-foreground mt-1">{r.t}</p>
            <p className="text-[11px] text-foreground/55 mt-1 leading-relaxed">{r.d}</p>
          </div>
        ))}
      </div>
      <P>
        最后一句提醒：风险模型的价值不在于给出精确数字，而在于逼迫我们把假设写下来。
        当数字与直觉冲突时，先怀疑假设，再怀疑市场。
      </P>
      <ToolLink label="进入风险实验室" note="23 个工具：从 VaR 到资本栈与恢复计划" />
    </Reveal>
  </div>
);

export default RiskTheory;
