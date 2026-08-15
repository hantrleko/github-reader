import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Structured reading guide for macroeconomics (V6.0).
 * Chain: object & method → long-run growth → short-run fluctuations →
 * monetary policy → fiscal policy → open economy → history of thought →
 * frontier → a practical judgement framework.
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

const FRONTIER = "/s/macro-frontier";
const CLASSIC = "/s/macro";
const LAB = "/s/macro-lab";

const schools = [
  { y: "1776–1930", s: "古典与货币数量论", core: "萨伊定律、MV=PY、价格灵活、货币中性", legacy: "长期二分法与通胀的货币根源" },
  { y: "1936–1960s", s: "凯恩斯革命与新古典综合", core: "有效需求、流动性偏好、乘数、IS-LM", legacy: "需求管理与稳定政策的合法性" },
  { y: "1968–1979", s: "货币主义与理性预期革命", core: "自然率假说、卢卡斯批判、政策无效命题", legacy: "微观基础与预期成为硬约束" },
  { y: "1982–1990s", s: "RBC 与新凯恩斯主义", core: "随机动态一般均衡、校准、名义刚性微观基础", legacy: "DSGE 成为共同语言" },
  { y: "1993–2007", s: "新共识与大缓和", core: "泰勒规则、通胀目标制、3 方程 NK", legacy: "货币政策科学化，金融被忽略" },
  { y: "2008–", s: "危机后反思", core: "金融摩擦、ZLB、异质性、财政重估", legacy: "HANK、宏观金融、宏观审慎" },
];

const shocks = [
  { k: "需求冲击", sign: "产出与通胀同向", ex: "投资信心崩塌、财政扩张、金融条件收紧", rx: "货币/财政可同时改善两者" },
  { k: "供给冲击", sign: "产出与通胀反向", ex: "能源价格、供应链断裂、劳动供给收缩", rx: "存在稳定权衡，需判断是否影响预期" },
  { k: "金融冲击", sign: "利差与净值主导", ex: "银行资本损失、抵押品价值崩跌", rx: "流动性/资本工具优于单纯降息" },
  { k: "预期冲击", sign: "自我实现", ex: "通胀预期脱锚、恐慌与挤兑", rx: "承诺与沟通是主要工具" },
];

export default function MacroTheory() {
  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · V6.0</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          宏观经济学导读：从增长与波动，到政策、开放经济与前沿
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          宏观经济学不是「微观的加总」。即使每个家庭与企业都在理性选择，整体仍可能陷入需求不足、失业持续、金融恐慌或通胀失控。
          它真正处理的是<strong className="text-foreground">总量结果、协调问题与系统性波动</strong>。
        </p>
        <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
          <p className="text-[13px] font-mono text-foreground/80 leading-[1.9]">
            一条主线：长期看，宏观解释生产能力为何增长；短期看，它解释实际产出为何偏离潜在产出；
            政策层面，它讨论货币、财政与制度安排能否、以及应当如何缩小这些偏离，并在效率、稳定、分配与风险之间权衡。
          </p>
        </div>
      </header>

      <H n="01" en="Object & Micro-foundations" zh="研究对象、总量思维与微观基础" />
      <P>
        四类根本问题构成整门学科的骨架：长期增长（为何持续富裕）、短期波动（为何有繁荣与衰退）、
        政策效果（政府能否稳定经济）、协调失败（人人理性为何仍导致整体低效）。
      </P>
      <P>
        卢卡斯批判之后，总量关系必须能追溯到偏好、技术与约束，否则政策一变，估计出来的关系就会失效。
        代表性代理人模型以简洁换取一致性，但抹去了收入与财富分布；异质性代理人转向（HANK/TANK）恢复了分布，
        代价是求解与识别难度显著上升。
      </P>
      <Eq note="古典二分法：长期由实际因素决定，货币只定价格水平">
        长期：Y = F(K, H, A)　│　短期：Y − Y<sup>n</sup> = f(需求、名义刚性、金融摩擦、预期)
      </Eq>
      <div className="mt-4">
        <ToolLink label="Solow 与经典模型" note="IS-LM / AD-AS / 拉姆齐 / NK DSGE" to={CLASSIC} />
        <ToolLink label="HANK / TANK 教学版" note="HTM 份额与总量 MPC" to={CLASSIC} />
      </div>

      <H n="02" en="Long-run Growth" zh="长期增长：从索洛到内生增长与制度" />
      <P>
        索洛模型给出基准：资本边际报酬递减意味着储蓄率只改变收入<em>水平</em>而非长期<em>增速</em>，
        长期人均增长完全由外生技术进步决定 —— 这既是它的清晰之处，也是它最大的不满足之处。
      </P>
      <P>
        内生增长把技术拉进模型：AK 消除递减报酬；Lucas 让人力资本承担增长引擎；Romer 用品种扩张与知识非竞争性
        解释研发的规模报酬；Aghion-Howitt 用创造性破坏刻画质量阶梯与在位者阻挠。制度学派则追问更上一层：
        产权、约束权力与包容性制度决定了这些引擎能否被点燃。
      </P>
      <Eq note="AK / Lucas / Romer / Schumpeter 的长期增速">
        g<sub>AK</sub> = sA − (δ+n)　│　g<sub>Lucas</sub> = ψu　│　g<sub>Romer</sub> = θ·s<sub>R</sub>·L　│　g<sub>Schum</sub> = λ·ln γ
      </Eq>
      <div className="mt-4">
        <ToolLink label="内生增长引擎对比" note="四条路径 vs Solow 过渡动态" to={FRONTIER} />
        <ToolLink label="增长核算与发展核算" note="Solow 残差 / Hall-Jones 分解" to={FRONTIER} />
      </div>
      <Caution title="TFP 是「无知的度量」">
        残差同时吸收技术进步、要素利用率、配置效率与测量误差。东亚增长是投入驱动还是效率驱动的争论
        （Krugman-Young vs 后续研究）之所以久未平息，正是因为残差本身依赖份额假设与要素质量调整。
      </Caution>

      <H n="03" en="Short-run Fluctuations" zh="短期波动：从有效需求到 RBC 与新凯恩斯" />
      <P>
        凯恩斯的核心洞见是：产出可以由需求决定，而失业可以是均衡的一部分；乘数与加速数的互动足以内生出周期，
        无须外生冲击。RBC 的贡献主要是方法论——把周期放进随机动态一般均衡、用校准与矩匹配检验模型；
        其争议在于把衰退解释为技术倒退、需要过高的劳动供给弹性，并且没有货币与金融。
      </P>
      <P>
        新凯恩斯主义把名义刚性建立在微观基础上：Calvo 交错定价、菜单成本与工资合同。
        θ（不调价概率）越高，NKPC 越平坦，通胀对缺口越不敏感，反通胀的牺牲率越高，货币非中性越持久。
      </P>
      <Eq note="Calvo 交错定价推出的 NKPC 斜率">
        π<sub>t</sub> = β E<sub>t</sub>π<sub>t+1</sub> + κ x<sub>t</sub>,　κ = (1−θ)(1−βθ)/θ · (σ + φ)
      </Eq>
      <div className="mt-4">
        <ToolLink label="乘数—加速数与财政乘数" note="Samuelson 周期 + 状态依赖" to={FRONTIER} />
        <ToolLink label="RBC 校准与周期矩" note="模型矩 vs 典型事实" to={FRONTIER} />
        <ToolLink label="Calvo 定价与 NKPC" note="θ → κ、指数化、牺牲率" to={FRONTIER} />
      </div>

      <H n="04" en="Monetary Policy" zh="货币政策：传导、规则与非常规工具" />
      <P>
        传导不止利率一条渠道：信贷与资产负债表渠道（净值 → 外部融资溢价）、资产价格与财富渠道、汇率渠道，
        以及预期与信号渠道。金融摩擦越强，后几条越重要——这正是 BGG 金融加速器的用武之地。
      </P>
      <P>
        规则 vs 相机抉择的经典结论来自时间不一致：若央行想把产出推到自然率之上，公众会预期到这一动机，
        均衡结果是更高的通胀而产出不变（通胀偏差 λαk）。独立央行、通胀目标制与承诺技术因此不是形式主义，
        而是降低偏差的制度手段。价格水平目标与名义 GDP 目标通过「补偿过去偏离」获得额外的预期渠道。
      </P>
      <Eq note="Barro-Gordon 的相机抉择均衡">
        π<sup>D</sup> = λαk + 稳定项　vs　π<sup>C</sup> = 稳定项　⟹　通胀偏差 = λαk
      </Eq>
      <div className="mt-4">
        <ToolLink label="规则 vs 相机抉择" note="通胀偏差 + 四种规则对比" to={FRONTIER} />
        <ToolLink label="非常规政策 QE / YCC" note="组合再平衡与信号渠道分解" to={FRONTIER} />
        <ToolLink label="ZLB 与前瞻指引" note="零下界与 FG puzzle" to={LAB} />
      </div>
      <Caution title="前瞻指引之谜">
        标准 NK 模型中，越远期的利率承诺对今天的影响越大，量级明显超出实证——这是模型对完全理性与完全信息假设过度依赖的信号，
        也是黏性信息、有限深度思考与异质性代理人被引入的原因。
      </Caution>

      <H n="05" en="Fiscal Policy" zh="财政政策：乘数、等价、稳定器与债务" />
      <P>
        财政乘数不是常数。它随经济松弛度、货币政策是否抵消、家庭的流动性约束程度、进口漏出与税制自动稳定器
        而系统性变化：深度衰退且处于 ZLB 时可显著大于 1；过热且央行强力抵消时可能小于 1。
      </P>
      <P>
        李嘉图等价成立需要无限期界、完美资本市场、总量税与前瞻理性——现实中流动性约束家庭与扭曲性税收让等价只是部分成立。
        债务可持续性的关键则是 (r−g)：r&lt;g 时债务可被增长稀释，r&gt;g 时必须靠基本盈余稳定。
      </P>
      <Eq note="债务动态与稳定所需盈余">
        b<sub>t+1</sub> = (1+r)/(1+g) · b<sub>t</sub> − s,　s* = (r−g)/(1+g) · b
      </Eq>
      <div className="mt-4">
        <ToolLink label="财政乘数实验" note="松弛度 / ZLB / 李嘉图程度" to={FRONTIER} />
        <ToolLink label="债务动态与财政空间" note="Blanchard r−g 情景" to={LAB} />
      </div>

      <H n="06" en="Open Economy" zh="开放经济：三元悖论、平价与危机" />
      <P>
        蒙代尔—弗莱明给出政策效力的分类学：资本自由流动下，固定汇率使货币政策失效而财政政策有效，浮动汇率则相反。
        三元悖论的现代版本（Rey 的「二元悖论」）指出：在全球金融周期下，即便浮动汇率也未必带来完全的货币独立，
        资本流动管理与宏观审慎因此重新进入工具箱。
      </P>
      <P>
        平价条件是纪律而非事实：PPP 只在长期与高通胀差下大致成立；UIP 的 Fama 回归系数常显著为负（远期溢价之谜），
        高息货币的 Carry 收益不能被简单归为免费午餐；连 CIP 在 2008 年后也长期存在基差，说明套利受资产负债表约束。
      </P>
      <div className="mt-4">
        <ToolLink label="平价条件与 Carry" note="PPP / UIP / CIP 与 Fama 回归" to={FRONTIER} />
        <ToolLink label="突然停止与外部调整" note="储备覆盖、贬值的两面性" to={FRONTIER} />
        <ToolLink label="Dornbusch 汇率超调" note="粘性价格下的即时超调" to={LAB} />
      </div>
      <Caution title="贬值未必扩张">
        存在货币错配（外币负债、本币资产）时，贬值同时带来支出转换（扩张）与资产负债表损失（紧缩）。
        后者占优时，贬值是收缩性的——这是新兴市场「原罪」与储备自我保险的核心逻辑。
      </Caution>

      <H n="07" en="History of Thought" zh="思想史主线：争论如何塑造今天的共识" />
      <div className="overflow-x-auto mt-2 rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">时期</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">学派</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">核心主张</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">留下的遗产</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((r) => (
              <tr key={r.y} className="border-t border-border/60">
                <td className="px-4 py-2.5 font-mono text-[11px] text-gold whitespace-nowrap">{r.y}</td>
                <td className="px-4 py-2.5 text-foreground">{r.s}</td>
                <td className="px-4 py-2.5 text-foreground/70">{r.core}</td>
                <td className="px-4 py-2.5 text-foreground/55">{r.legacy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H n="08" en="Frontier" zh="当代前沿：异质性、行为、金融、气候与数据" />
      <P>
        <strong className="text-foreground">HANK</strong> 让货币政策的传导更多经由收入与再分配渠道，而非单纯的跨期替代；
        <strong className="text-foreground">行为宏观</strong>用黏性信息、适应性学习与诊断性预期解释预测误差的可预测性（CG 系数≠0）；
        <strong className="text-foreground">宏观金融</strong>把银行资本、抵押品与去杠杆螺旋写进周期；
        <strong className="text-foreground">气候宏观</strong>把碳定价、绿色通胀与物理损害同时放进跨期权衡；
        <strong className="text-foreground">机器学习与大数据</strong>则改造了 nowcasting 与政策评估的实证工具箱。
      </P>
      <div className="mt-4">
        <ToolLink label="预期形成实验" note="理性 / 适应性 / 黏性 / 诊断性" to={FRONTIER} />
        <ToolLink label="银行资本与去杠杆" note="资本 → 信贷 → 产出的放大" to={FRONTIER} />
        <ToolLink label="气候转型宏观路径" note="有序 vs 无序转型" to={FRONTIER} />
        <ToolLink label="BGG 金融加速器" note="净值 → EFP → 投资" to={LAB} />
      </div>
      <Caution title="后疫情与高通胀时代的挑战">
        2021–2023 的通胀既非纯需求也非纯供给：财政转移、供应链断裂、劳动供给变化与预期共同作用。
        它同时暴露了两类风险——过度依赖「通胀是暂时的」这一供给判断，以及忽略财政—货币互动对价格水平的影响。
      </Caution>

      <H n="09" en="A Judgement Framework" zh="建立宏观判断力：四步分析框架" />
      <P>面对任何宏观新闻或政策讨论，按固定顺序推进，可以避免把结论前置：</P>
      <div className="overflow-x-auto mt-2 rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">冲击类型</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">识别标志</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">典型来源</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">政策含义</th>
            </tr>
          </thead>
          <tbody>
            {shocks.map((r) => (
              <tr key={r.k} className="border-t border-border/60">
                <td className="px-4 py-2.5 text-foreground whitespace-nowrap">{r.k}</td>
                <td className="px-4 py-2.5 text-foreground/70">{r.sign}</td>
                <td className="px-4 py-2.5 text-foreground/55">{r.ex}</td>
                <td className="px-4 py-2.5 text-foreground/70">{r.rx}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        第二步识别经济状态：产出缺口的符号、劳动市场紧张度、通胀预期是否锚定、是否处于 ZLB 或财政受限。
        第三步判断关键摩擦：是名义刚性、金融摩擦、流动性约束家庭，还是预期形成本身出了问题。
        第四步才讨论政策组合 —— 货币、财政、宏观审慎与结构性政策的相对优势取决于前三步的答案，
        而非取决于对某个学派的偏好。
      </P>
      <Caution title="判断力的三条守则">
        一、先问冲击来自需求还是供给，再问政策；二、任何「乘数」「传导系数」都是状态依赖的参数，不是常数；
        三、对模型保持可证伪的态度：DSGE、HANK 与叙事型分析各有盲区，交叉验证比押注单一框架更稳健。
      </Caution>

      <div className="mt-12 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold mb-2">动手复现</p>
        <div>
          <ToolLink label="宏观前沿实验室" note="12 个交互实验：增长 / 周期 / 政策 / 开放 / 前沿" to={FRONTIER} />
          <ToolLink label="经典宏观模型" note="IS-LM · AD-AS · Solow · NK DSGE · HANK" to={CLASSIC} />
          <ToolLink label="宏观高阶实验室" note="债务 · 汇率超调 · BGG · ZLB" to={LAB} />
        </div>
      </div>
    </article>
  );
}
