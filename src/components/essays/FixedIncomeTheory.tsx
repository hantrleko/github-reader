import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Structured reading guide for fixed income (V6.2).
 * Chain: core questions & rate concepts → classic pricing, duration, convexity →
 * spread language → term structure theories & curve construction → dynamic model
 * lineage → credit & structured products → portfolio management & leverage →
 * history → frontier & research workflow.
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

const LAB = "/s/fixed-income-frontier";
const CLASSIC = "/s/fixed-income-lab";
const BOND = "/s/bond";
const RATES = "/s/rate-model";

const eras = [
  { y: "1938–1971", s: "久期革命", core: "Macaulay 久期、Redington 免疫、Fisher-Weil 与现金流匹配", legacy: "利率风险第一次有了单一数字与对冲条件" },
  { y: "1977–1992", s: "无套利模型", core: "Vasicek、CIR、Ho-Lee、Hull-White、HJM 漂移条件", legacy: "从「预测利率」转向「与初始曲线一致地定价衍生品」" },
  { y: "1994–2004", s: "信用与结构化", core: "Merton 结构化模型、简约强度模型、CDS 标准化、Li 的高斯 copula", legacy: "违约成为可交易、可分层的风险" },
  { y: "2007–2012", s: "危机与重定价", core: "相关性假设崩塌、AAA 分层减记、基差爆裂、抵押与融资流动性", legacy: "模型风险与融资风险被写进定价" },
  { y: "2014–", s: "后危机改革", core: "多曲线折现 (OIS/CSA)、LIBOR→SOFR 后视复利、负利率位移模型、ESG 与气候利差", legacy: "定价框架的基准与折现口径被重建" },
];

const spreads = [
  { k: "名义利差", d: "债券 YTM − 同期限基准 YTM", pit: "只在两者现金流形态相近时可比, 忽略曲线形状" },
  { k: "Z-spread", d: "平行加到零息曲线上使 PV = 市价的常数", pit: "对整条曲线一致, 但不含期权价值" },
  { k: "ASW", d: "资产互换结构下换出的浮息利差", pit: "混入互换基差与前端折现口径" },
  { k: "OAS", d: "在利率树/蒙特卡洛上剥离期权后的利差", pit: "强依赖波动率假设, 波动率越高 OAS 越低" },
  { k: "期权成本", d: "Z-spread − OAS", pit: "为负通常意味着模型或波动率设定有误" },
];

export default function FixedIncomeTheory() {
  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · V6.2</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          固定收益导读：从贴现因子，到利差语言、含权结构与制度前沿
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          股票研究关心「公司能赚多少」，固定收益研究关心
          <strong className="text-foreground">「这笔现金流何时到、有多确定、用什么曲线折现、谁握着提前终止的权利」</strong>。
          它是一门关于折现率结构与合约条款的学科：几乎所有复杂度，都来自曲线不是一根平线、现金流不是固定的这两件事。
        </p>
        <div className="mt-6">
          <ToolLink label="固定收益前沿实验室" note="曲线 / 利差 / 含权 / 信用结构化 / 组合与制度" to={LAB} />
          <ToolLink label="固定收益经典实验室" note="Merton · CDS · Vasicek/CIR · OAS · MBS" to={CLASSIC} />
        </div>
      </header>

      <H n="1" en="Core Questions" zh="核心问题与利率概念体系" />
      <P>
        固定收益的全部工作可以压缩成三个问题：未来现金流是什么（合约条款）；用什么折现（曲线与利差）；这个估值对什么敏感（风险度量）。
        与之对应的概念体系是一组彼此可换算的利率语言：即期（零息）利率、远期利率、到期收益率、par 利率、贴现因子。
      </P>
      <Eq note="所有利率语言最终都落回同一组贴现因子 D(t)">
        P = Σ CFₜ · D(t)，D(t) = e^(−z(t)·t)，f(t₁,t₂) = [z₂t₂ − z₁t₁] / (t₂ − t₁)
      </Eq>
      <P>
        YTM 是最方便也最容易误用的一个：它是让所有现金流用<strong className="text-foreground">同一个</strong>利率折现的解，因此隐含了「曲线是平的」与「票息按 YTM 再投资」两个假设。
        跨券比较、跨期限比较时，请回到零息曲线。
      </P>
      <ToolLink label="自举与插值对比" note="从 par 曲线剥离贴现因子, 比较三种插值的远期平滑性" to={LAB} />

      <H n="2" en="Pricing, Duration, Convexity" zh="经典定价与久期凸性：一阶与二阶的分工" />
      <P>
        价格对收益率的敏感度用久期刻画，曲率用凸性刻画。它们不是两个独立指标，而是同一条价格—收益率曲线的一阶与二阶展开。
      </P>
      <Eq note="大幅波动时凸性项才显形; 凸性总是投资者的朋友——所以它有价格">
        ΔP/P ≈ −D_mod · Δy + ½ · C · (Δy)²
      </Eq>
      <P>
        实务上要分清三套口径：Macaulay 久期（现金流的加权平均到期时间）、修正久期（价格弹性）、有效久期（对含权债做数值扰动重算）。
        含权债只能用有效久期；美元久期与 DV01 才是组合层面能相加的量。
      </P>
      <Caution title="常见错误">
        对含权债直接套用解析久期，会在利率下行时严重高估价格上涨幅度——因为发行人的赎回权把上涨截断了，这正是负凸性的来源。
      </Caution>
      <div>
        <ToolLink label="有效久期与凸性" note="数值扰动法, 对任意定价函数适用" to={LAB} />
        <ToolLink label="债券计算器" note="价格 / YTM / 久期 / 凸性基础" to={BOND} />
      </div>

      <H n="3" en="Spread Taxonomy" zh="利差语言：四种口径说的不是同一件事" />
      <P>
        「这只债便宜」是一句需要指定口径的话。名义利差、Z-spread、ASW、OAS 各自扣掉的东西不同，混用会直接得出相反结论。
      </P>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">口径</th>
              <th className="px-4 py-3">定义</th>
              <th className="px-4 py-3">陷阱</th>
            </tr>
          </thead>
          <tbody>
            {spreads.map((s) => (
              <tr key={s.k} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{s.k}</td>
                <td className="px-4 py-3 text-foreground/80">{s.d}</td>
                <td className="px-4 py-3 text-foreground/60">{s.pit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ToolLink label="四口径利差对照" note="同一只债上同时算 名义 / Z / ASW / OAS 与期权成本" to={LAB} />

      <H n="4" en="Term Structure & Curve Building" zh="期限结构理论与曲线构建" />
      <P>
        为什么曲线通常向上？三种经典解释：纯预期理论（长率是未来短率的平均）、流动性偏好（长端要额外的期限溢价）、
        市场分割/优先栖息地（不同期限有不同的自然买家）。实证上纯预期理论被反复拒绝，期限溢价随时间变化且可为负。
      </P>
      <Eq note="Campbell-Shiller 回归的检验形式: 系数显著偏离 1 即拒绝纯预期">
        y(n) = (1/n) Σ E[短率] + 期限溢价(n)
      </Eq>
      <P>
        构建曲线是把可观测价格反解成贴现因子的过程：先自举（票息剥离），再选插值方案。
        插值不是技术细节——线性零率插值会让远期曲线出现锯齿，分段常数远期给出阶梯，样条最平滑但可能过冲。
        远期曲线的形状直接决定了所有远期起始产品的定价。
      </P>
      <div>
        <ToolLink label="曲线自举" note="par → 零息 → 贴现因子" to={LAB} />
        <ToolLink label="Nelson-Siegel / Svensson 拟合" note="参数化曲线与真实 CMT 数据" to={RATES} />
      </div>

      <H n="5" en="Dynamic Models" zh="动态模型谱系：Vasicek → CIR → HW → HJM → LMM" />
      <P>
        静态曲线不能给期权定价，必须让利率随机演化。谱系上有两条线：
        <strong className="text-foreground">均衡模型</strong>（Vasicek、CIR）从偏好与经济出发，参数少、经济含义清楚，但通常拟合不上今天的曲线；
        <strong className="text-foreground">无套利模型</strong>（Ho-Lee、Hull-White、HJM、LMM）以初始曲线为输入，保证与市场一致，代价是参数的经济解释被削弱。
      </P>
      <Eq note="Hull-White 用时变 θ(t) 反解出与初始远期曲线完全一致的漂移">
        dr = [θ(t) − a·r] dt + σ dW，θ(t) = ∂f/∂t + a·f + σ²(1 − e^(−2at))/(2a)
      </Eq>
      <P>
        HJM 把建模对象从短率换成整条远期曲线，并给出无套利要求的漂移条件；LMM 直接对可观测的远期 LIBOR/SOFR 建模，
        天然匹配 caplet/swaption 的市场报价惯例。选型原则：定价什么产品，就用能一致复现该产品市场报价的模型。
      </P>
      <div>
        <ToolLink label="Hull-White θ(t) 反解" note="校准到初始曲线的漂移路径" to={LAB} />
        <ToolLink label="短率模型模拟" note="Vasicek / CIR 路径与分布" to={RATES} />
      </div>

      <H n="6" en="Credit & Structured" zh="信用与结构化：从违约概率到分层" />
      <P>
        信用有两条建模路线：结构化模型（Merton：股权是公司资产上的看涨期权，违约是资产跌破债务面值）与
        简约模型（把违约看成外生强度过程 λ 的首次跳跃，直接从 CDS 报价校准）。前者解释「为什么违约」，后者更适合「按市场报价定价」。
      </P>
      <Eq note="信用利差远大于预期损失, 即所谓信用利差之谜">
        信用利差 ≈ 预期损失(PD×LGD) + 风险溢价 + 流动性溢价 + 税收 + 残差
      </Eq>
      <P>
        结构化产品把资产池的损失按优先级重新分配。关键不是期望损失（相关性不改变池子的期望损失），
        而是<strong className="text-foreground">损失的分布形状</strong>：相关性上升时，尾部同时违约的概率上升，优先层被显著损害，股权层反而受益。
        2007 年的教训正在于把相关性当作稳定参数。
      </P>
      <Caution title="模型风险">
        单因子高斯 copula 的相关性微笑（不同分层反解出不同的隐含相关性）本身就是模型被误设的证据——就像 Black-Scholes 的波动率微笑。
      </Caution>
      <div>
        <ToolLink label="信用利差分解" note="四成分占比与信用利差之谜判定" to={LAB} />
        <ToolLink label="评级迁移矩阵" note="多期演化与迁移风险 VaR" to={LAB} />
        <ToolLink label="分层瀑布与 OC 触发" note="损失自下而上、利息改道" to={LAB} />
        <ToolLink label="高斯 copula 分层" note="相关性如何重分配尾部损失" to={LAB} />
      </div>

      <H n="7" en="Portfolio & Leverage" zh="组合管理、免疫与杠杆" />
      <P>
        负债驱动的组合（保险、养老金）追求免疫：Redington 条件要求资产与负债的美元久期相等、且资产凸性更大，
        这样在小幅平行移动下盈余永远非负。但平行移动假设很脆弱，实务上要用关键利率久期分桶对冲曲线的非平行变化。
      </P>
      <Eq note="Redington 免疫的两个条件">
        D$_资产 = D$_负债 且 C_资产 &gt; C_负债
      </Eq>
      <P>
        杠杆是固定收益回报的放大器：回购融资下，ROE ≈ 资产收益 + 杠杆×(资产收益 − 回购利率)。
        真正的风险不在利率本身，而在折扣率（haircut）——haircut 上升会触发追加保证金，被迫抛售压低价格，进一步抬高 haircut，形成螺旋。
        1998 年 LTCM 与 2008 年、2020 年 3 月的美债基差交易平仓，都是同一部剧本。
      </P>
      <div>
        <ToolLink label="回购杠杆与击穿冲击" note="ROE 放大与保证金击穿阈值" to={LAB} />
        <ToolLink label="保证金螺旋" note="haircut 冲击 → 抛售 → 价格下跌的迭代路径" to={LAB} />
        <ToolLink label="Redington 免疫" note="久期匹配与凸性优势下的盈余曲线" to={LAB} />
      </div>

      <H n="8" en="History" zh="历史脉络：五个阶段" />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">时期</th>
              <th className="px-4 py-3">阶段</th>
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

      <H n="9" en="Frontier & Workflow" zh="制度前沿与研究流程" />
      <P>
        当下最活跃的四条前沿：
        <strong className="text-foreground">基准利率改革</strong>（LIBOR 的前瞻定盘换成 SOFR 的后视复利，复利的凸性使其略高于简单平均，fallback 需要历史中位数利差调整）；
        <strong className="text-foreground">负利率</strong>（对数正态模型失效，位移对数正态或正态模型才能给负远期定价）；
        <strong className="text-foreground">气候与 ESG</strong>（绿色债券的 greenium 与高碳发行人的转型风险贴水同时存在）；
        <strong className="text-foreground">债券流动性</strong>（成交稀疏使价差难以直接观测，需要用换手率与波动率反推流动性溢价）。
      </P>
      <div>
        <ToolLink label="RFR 后视复利与 fallback" note="复利凸性、基差与中位数利差调整" to={LAB} />
        <ToolLink label="位移对数正态 caplet" note="负利率下仍然有效的定价" to={LAB} />
        <ToolLink label="绿色溢价与转型贴水" note="ESG 标签与碳强度对利差的净效应" to={LAB} />
        <ToolLink label="债券流动性溢价" note="换手率 / 成交频率 / 持有期" to={LAB} />
      </div>
      <P>
        研究流程建议按八步走：① 明确现金流与条款；② 构建并检验曲线（自举 + 插值敏感性）；③ 选定利差口径并说明扣掉了什么；
        ④ 计算有效久期/凸性与关键利率久期；⑤ 若含权，选择与市场报价一致的动态模型并校准；⑥ 分解信用利差、检查是否存在流动性错配；
        ⑦ 加上融资与 haircut 情景做压力测试；⑧ 报告结果时同时给出模型假设的敏感性区间。
      </P>
      <P>
        学习路线四阶段：① 贴现与久期凸性算到闭眼能做；② 掌握曲线构建与四种利差口径；
        ③ 进入动态模型与含权/可转债；④ 最后做信用结构化、组合免疫与杠杆—融资风险。
      </P>
      <div className="mt-6">
        <ToolLink label="进入固定收益前沿实验室" note="按四阶段顺序逐个复现" to={LAB} />
      </div>
    </article>
  );
}
