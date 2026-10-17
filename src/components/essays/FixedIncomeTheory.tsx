import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  { y: "1938–1971", s: { zh: "久期革命", en: "The Duration Revolution" }, core: { zh: "Macaulay 久期、Redington 免疫、Fisher-Weil 与现金流匹配", en: "Macaulay duration, Redington immunization, Fisher-Weil and cash-flow matching" }, legacy: { zh: "利率风险第一次有了单一数字与对冲条件", en: "Interest-rate risk gained a single number and a hedging condition for the first time" } },
  { y: "1977–1992", s: { zh: "无套利模型", en: "No-Arbitrage Models" }, core: { zh: "Vasicek、CIR、Ho-Lee、Hull-White、HJM 漂移条件", en: "Vasicek, CIR, Ho-Lee, Hull-White, and the HJM drift condition" }, legacy: { zh: "从「预测利率」转向「与初始曲线一致地定价衍生品」", en: "Shifted from “forecasting rates” to “pricing derivatives consistently with the initial curve”" } },
  { y: "1994–2004", s: { zh: "信用与结构化", en: "Credit & Structuring" }, core: { zh: "Merton 结构化模型、简约强度模型、CDS 标准化、Li 的高斯 copula", en: "Merton structural model, reduced-form intensity models, CDS standardization, Li's Gaussian copula" }, legacy: { zh: "违约成为可交易、可分层的风险", en: "Default became a tradable, tranchable risk" } },
  { y: "2007–2012", s: { zh: "危机与重定价", en: "Crisis & Repricing" }, core: { zh: "相关性假设崩塌、AAA 分层减记、基差爆裂、抵押与融资流动性", en: "Correlation assumptions collapsed, AAA tranches were written down, bases blew out, collateral and funding liquidity" }, legacy: { zh: "模型风险与融资风险被写进定价", en: "Model risk and funding risk were written into pricing" } },
  { y: "2014–", s: { zh: "后危机改革", en: "Post-Crisis Reform" }, core: { zh: "多曲线折现 (OIS/CSA)、LIBOR→SOFR 后视复利、负利率位移模型、ESG 与气候利差", en: "Multi-curve discounting (OIS/CSA), LIBOR→SOFR backward-looking compounding, shifted models for negative rates, ESG and climate spreads" }, legacy: { zh: "定价框架的基准与折现口径被重建", en: "The benchmarks and discounting conventions of the pricing framework were rebuilt" } },
];

const spreads = [
  { k: { zh: "名义利差", en: "Nominal spread" }, d: { zh: "债券 YTM − 同期限基准 YTM", en: "Bond YTM − benchmark YTM of the same maturity" }, pit: { zh: "只在两者现金流形态相近时可比, 忽略曲线形状", en: "Comparable only when cash-flow shapes are similar; ignores curve shape" } },
  { k: { zh: "Z-spread", en: "Z-spread" }, d: { zh: "平行加到零息曲线上使 PV = 市价的常数", en: "Constant added in parallel to the zero curve so that PV = market price" }, pit: { zh: "对整条曲线一致, 但不含期权价值", en: "Consistent across the whole curve, but contains no option value" } },
  { k: { zh: "ASW", en: "ASW" }, d: { zh: "资产互换结构下换出的浮息利差", en: "Floating spread swapped out in an asset-swap structure" }, pit: { zh: "混入互换基差与前端折现口径", en: "Contaminated by swap basis and front-end discounting conventions" } },
  { k: { zh: "OAS", en: "OAS" }, d: { zh: "在利率树/蒙特卡洛上剥离期权后的利差", en: "Spread after stripping the option on a rate tree / Monte Carlo" }, pit: { zh: "强依赖波动率假设, 波动率越高 OAS 越低", en: "Highly dependent on the volatility assumption; higher vol means lower OAS" } },
  { k: { zh: "期权成本", en: "Option cost" }, d: { zh: "Z-spread − OAS", en: "Z-spread − OAS" }, pit: { zh: "为负通常意味着模型或波动率设定有误", en: "A negative value usually signals a misspecified model or volatility" } },
];

export default function FixedIncomeTheory() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const L = (o: { zh: string; en: string }) => (isEn ? o.en : o.zh);

  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · V6.2</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          {isEn
            ? "Fixed Income Reading Guide: From Discount Factors to Spread Language, Embedded Options and Institutional Frontiers"
            : "固定收益导读：从贴现因子，到利差语言、含权结构与制度前沿"}
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          {isEn ? (
            <>
              Equity research asks “how much can the company earn”; fixed income research asks
              <strong className="text-foreground">“when does this cash flow arrive, how certain is it, which curve discounts it, and who holds the right to terminate early”</strong>.
              It is a discipline about the structure of discount rates and contractual terms: almost all complexity comes from two facts — the curve is not a flat line, and cash flows are not fixed.
            </>
          ) : (
            <>
              股票研究关心「公司能赚多少」，固定收益研究关心
              <strong className="text-foreground">「这笔现金流何时到、有多确定、用什么曲线折现、谁握着提前终止的权利」</strong>。
              它是一门关于折现率结构与合约条款的学科：几乎所有复杂度，都来自曲线不是一根平线、现金流不是固定的这两件事。
            </>
          )}
        </p>
        <div className="mt-6">
          <ToolLink label={isEn ? "Fixed Income Frontier Lab" : "固定收益前沿实验室"} note={isEn ? "Curve / spreads / embedded options / credit structuring / portfolio & institutions" : "曲线 / 利差 / 含权 / 信用结构化 / 组合与制度"} to={LAB} />
          <ToolLink label={isEn ? "Fixed Income Classic Lab" : "固定收益经典实验室"} note="Merton · CDS · Vasicek/CIR · OAS · MBS" to={CLASSIC} />
        </div>
      </header>

      <H n="1" en="Core Questions" zh={isEn ? "Core Questions and the Interest-Rate Concept System" : "核心问题与利率概念体系"} />
      <P>
        {isEn
          ? "All of fixed income compresses into three questions: what are the future cash flows (contract terms); what do we discount with (curve and spreads); and what is the valuation sensitive to (risk measures). The matching concept system is a set of mutually convertible rate languages: spot (zero) rates, forward rates, yield to maturity, par rates, and discount factors."
          : "固定收益的全部工作可以压缩成三个问题：未来现金流是什么（合约条款）；用什么折现（曲线与利差）；这个估值对什么敏感（风险度量）。与之对应的概念体系是一组彼此可换算的利率语言：即期（零息）利率、远期利率、到期收益率、par 利率、贴现因子。"}
      </P>
      <Eq note={isEn ? "Every rate language ultimately reduces to the same set of discount factors D(t)" : "所有利率语言最终都落回同一组贴现因子 D(t)"}>
        P = Σ CFₜ · D(t)，D(t) = e^(−z(t)·t)，f(t₁,t₂) = [z₂t₂ − z₁t₁] / (t₂ − t₁)
      </Eq>
      <P>
        {isEn ? (
          <>
            YTM is the most convenient and the most misused: it is the solution that discounts all cash flows at <strong className="text-foreground">one single</strong> rate, so it implicitly assumes “the curve is flat” and “coupons are reinvested at the YTM.” For cross-bond or cross-maturity comparisons, go back to the zero curve.
          </>
        ) : (
          <>
            YTM 是最方便也最容易误用的一个：它是让所有现金流用<strong className="text-foreground">同一个</strong>利率折现的解，因此隐含了「曲线是平的」与「票息按 YTM 再投资」两个假设。跨券比较、跨期限比较时，请回到零息曲线。
          </>
        )}
      </P>
      <ToolLink label={isEn ? "Bootstrapping vs Interpolation" : "自举与插值对比"} note={isEn ? "Strip discount factors from the par curve and compare forward smoothness across three interpolations" : "从 par 曲线剥离贴现因子, 比较三种插值的远期平滑性"} to={LAB} />

      <H n="2" en="Pricing, Duration, Convexity" zh={isEn ? "Classic Pricing, Duration and Convexity: The Division of Labor Between First and Second Order" : "经典定价与久期凸性：一阶与二阶的分工"} />
      <P>
        {isEn
          ? "Price sensitivity to yield is captured by duration, curvature by convexity. They are not two independent metrics but the first- and second-order expansions of the same price–yield curve."
          : "价格对收益率的敏感度用久期刻画，曲率用凸性刻画。它们不是两个独立指标，而是同一条价格—收益率曲线的一阶与二阶展开。"}
      </P>
      <Eq note={isEn ? "The convexity term only shows up in large moves; convexity is always the investor's friend — which is why it has a price" : "大幅波动时凸性项才显形; 凸性总是投资者的朋友——所以它有价格"}>
        ΔP/P ≈ −D_mod · Δy + ½ · C · (Δy)²
      </Eq>
      <P>
        {isEn
          ? "In practice, distinguish three conventions: Macaulay duration (weighted average time to cash flows), modified duration (price elasticity), and effective duration (numerical re-pricing for bonds with embedded options). Only effective duration works for option-embedded bonds; dollar duration and DV01 are the quantities that add up at portfolio level."
          : "实务上要分清三套口径：Macaulay 久期（现金流的加权平均到期时间）、修正久期（价格弹性）、有效久期（对含权债做数值扰动重算）。含权债只能用有效久期；美元久期与 DV01 才是组合层面能相加的量。"}
      </P>
      <Caution title={isEn ? "Common mistake" : "常见错误"}>
        {isEn
          ? "Applying analytical duration directly to a bond with embedded options severely overestimates the price gain when rates fall — the issuer's call right truncates the upside, which is exactly the source of negative convexity."
          : "对含权债直接套用解析久期，会在利率下行时严重高估价格上涨幅度——因为发行人的赎回权把上涨截断了，这正是负凸性的来源。"}
      </Caution>
      <div>
        <ToolLink label={isEn ? "Effective Duration & Convexity" : "有效久期与凸性"} note={isEn ? "Numerical perturbation, works for any pricing function" : "数值扰动法, 对任意定价函数适用"} to={LAB} />
        <ToolLink label={isEn ? "Bond Calculator" : "债券计算器"} note={isEn ? "Price / YTM / duration / convexity basics" : "价格 / YTM / 久期 / 凸性基础"} to={BOND} />
      </div>

      <H n="3" en="Spread Taxonomy" zh={isEn ? "Spread Language: Four Conventions That Do Not Say the Same Thing" : "利差语言：四种口径说的不是同一件事"} />
      <P>
        {isEn
          ? "“This bond is cheap” is a statement that needs a convention. Nominal spread, Z-spread, ASW and OAS each net out different things; mixing them leads directly to opposite conclusions."
          : "「这只债便宜」是一句需要指定口径的话。名义利差、Z-spread、ASW、OAS 各自扣掉的东西不同，混用会直接得出相反结论。"}
      </P>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{isEn ? "Convention" : "口径"}</th>
              <th className="px-4 py-3">{isEn ? "Definition" : "定义"}</th>
              <th className="px-4 py-3">{isEn ? "Pitfall" : "陷阱"}</th>
            </tr>
          </thead>
          <tbody>
            {spreads.map((s) => (
              <tr key={s.k.zh} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{L(s.k)}</td>
                <td className="px-4 py-3 text-foreground/80">{L(s.d)}</td>
                <td className="px-4 py-3 text-foreground/60">{L(s.pit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ToolLink label={isEn ? "Four-Convention Spread Comparison" : "四口径利差对照"} note={isEn ? "Compute nominal / Z / ASW / OAS and option cost on the same bond" : "同一只债上同时算 名义 / Z / ASW / OAS 与期权成本"} to={LAB} />

      <H n="4" en="Term Structure & Curve Building" zh={isEn ? "Term Structure Theories and Curve Construction" : "期限结构理论与曲线构建"} />
      <P>
        {isEn
          ? "Why does the curve usually slope up? Three classic explanations: pure expectations (long rates average expected future short rates), liquidity preference (the long end demands extra term premium), and market segmentation / preferred habitat (different maturities have different natural buyers). Empirically, pure expectations is repeatedly rejected; the term premium varies over time and can be negative."
          : "为什么曲线通常向上？三种经典解释：纯预期理论（长率是未来短率的平均）、流动性偏好（长端要额外的期限溢价）、市场分割/优先栖息地（不同期限有不同的自然买家）。实证上纯预期理论被反复拒绝，期限溢价随时间变化且可为负。"}
      </P>
      <Eq note={isEn ? "The Campbell-Shiller regression test: a coefficient significantly different from 1 rejects pure expectations" : "Campbell-Shiller 回归的检验形式: 系数显著偏离 1 即拒绝纯预期"}>
        y(n) = (1/n) Σ E[{isEn ? "short rates" : "短率"}] + {isEn ? "term premium(n)" : "期限溢价(n)"}
      </Eq>
      <P>
        {isEn
          ? "Building a curve inverts observable prices into discount factors: bootstrap first (coupon stripping), then choose an interpolation. Interpolation is not a technical detail — linear zero-rate interpolation makes the forward curve jagged, piecewise-constant forwards give stairs, and splines are smoothest but may overshoot. The shape of the forward curve directly determines the pricing of every forward-starting product."
          : "构建曲线是把可观测价格反解成贴现因子的过程：先自举（票息剥离），再选插值方案。插值不是技术细节——线性零率插值会让远期曲线出现锯齿，分段常数远期给出阶梯，样条最平滑但可能过冲。远期曲线的形状直接决定了所有远期起始产品的定价。"}
      </P>
      <div>
        <ToolLink label={isEn ? "Curve Bootstrapping" : "曲线自举"} note={isEn ? "par → zero → discount factors" : "par → 零息 → 贴现因子"} to={LAB} />
        <ToolLink label={isEn ? "Nelson-Siegel / Svensson Fit" : "Nelson-Siegel / Svensson 拟合"} note={isEn ? "Parametric curves with real CMT data" : "参数化曲线与真实 CMT 数据"} to={RATES} />
      </div>

      <H n="5" en="Dynamic Models" zh={isEn ? "The Dynamic Model Lineage: Vasicek → CIR → HW → HJM → LMM" : "动态模型谱系：Vasicek → CIR → HW → HJM → LMM"} />
      <P>
        {isEn ? (
          <>
            A static curve cannot price options; rates must evolve stochastically. The lineage has two branches:
            <strong className="text-foreground">equilibrium models</strong> (Vasicek, CIR) start from preferences and the economy — few parameters, clear economic meaning, but they usually cannot fit today's curve;
            <strong className="text-foreground">no-arbitrage models</strong> (Ho-Lee, Hull-White, HJM, LMM) take the initial curve as input and guarantee consistency with the market, at the cost of weakening the economic interpretation of parameters.
          </>
        ) : (
          <>
            静态曲线不能给期权定价，必须让利率随机演化。谱系上有两条线：
            <strong className="text-foreground">均衡模型</strong>（Vasicek、CIR）从偏好与经济出发，参数少、经济含义清楚，但通常拟合不上今天的曲线；
            <strong className="text-foreground">无套利模型</strong>（Ho-Lee、Hull-White、HJM、LMM）以初始曲线为输入，保证与市场一致，代价是参数的经济解释被削弱。
          </>
        )}
      </P>
      <Eq note={isEn ? "Hull-White inverts a time-varying θ(t) so the drift matches the initial forward curve exactly" : "Hull-White 用时变 θ(t) 反解出与初始远期曲线完全一致的漂移"}>
        dr = [θ(t) − a·r] dt + σ dW，θ(t) = ∂f/∂t + a·f + σ²(1 − e^(−2at))/(2a)
      </Eq>
      <P>
        {isEn
          ? "HJM changes the modeling object from the short rate to the entire forward curve and gives the drift condition required by no-arbitrage; LMM models observable forward LIBOR/SOFR directly, naturally matching market quoting conventions for caplets and swaptions. Selection principle: whatever product you price, use the model that consistently reproduces that product's market quotes."
          : "HJM 把建模对象从短率换成整条远期曲线，并给出无套利要求的漂移条件；LMM 直接对可观测的远期 LIBOR/SOFR 建模，天然匹配 caplet/swaption 的市场报价惯例。选型原则：定价什么产品，就用能一致复现该产品市场报价的模型。"}
      </P>
      <div>
        <ToolLink label={isEn ? "Hull-White θ(t) Inversion" : "Hull-White θ(t) 反解"} note={isEn ? "Drift path calibrated to the initial curve" : "校准到初始曲线的漂移路径"} to={LAB} />
        <ToolLink label={isEn ? "Short-Rate Model Simulation" : "短率模型模拟"} note={isEn ? "Vasicek / CIR paths and distributions" : "Vasicek / CIR 路径与分布"} to={RATES} />
      </div>

      <H n="6" en="Credit & Structured" zh={isEn ? "Credit and Structuring: From Default Probability to Tranching" : "信用与结构化：从违约概率到分层"} />
      <P>
        {isEn
          ? "Credit has two modeling routes: structural models (Merton: equity is a call option on firm assets; default is assets falling below the debt face value) and reduced-form models (default as the first jump of an exogenous intensity process λ, calibrated directly to CDS quotes). The former explains “why default happens”; the latter is better for “pricing to market quotes.”"
          : "信用有两条建模路线：结构化模型（Merton：股权是公司资产上的看涨期权，违约是资产跌破债务面值）与简约模型（把违约看成外生强度过程 λ 的首次跳跃，直接从 CDS 报价校准）。前者解释「为什么违约」，后者更适合「按市场报价定价」。"}
      </P>
      <Eq note={isEn ? "Credit spreads far exceed expected loss — the so-called credit spread puzzle" : "信用利差远大于预期损失, 即所谓信用利差之谜"}>
        {isEn
          ? "credit spread ≈ expected loss (PD×LGD) + risk premium + liquidity premium + tax + residual"
          : "信用利差 ≈ 预期损失(PD×LGD) + 风险溢价 + 流动性溢价 + 税收 + 残差"}
      </Eq>
      <P>
        {isEn ? (
          <>
            Structured products redistribute pool losses by seniority. The key is not expected loss (correlation does not change the pool's expected loss) but <strong className="text-foreground">the shape of the loss distribution</strong>: as correlation rises, the probability of joint tail defaults rises, senior tranches are significantly hurt, and the equity tranche actually benefits. The lesson of 2007 was treating correlation as a stable parameter.
          </>
        ) : (
          <>
            结构化产品把资产池的损失按优先级重新分配。关键不是期望损失（相关性不改变池子的期望损失），而是<strong className="text-foreground">损失的分布形状</strong>：相关性上升时，尾部同时违约的概率上升，优先层被显著损害，股权层反而受益。2007 年的教训正在于把相关性当作稳定参数。
          </>
        )}
      </P>
      <Caution title={isEn ? "Model risk" : "模型风险"}>
        {isEn
          ? "The correlation smile of the one-factor Gaussian copula (different tranches imply different correlations) is itself evidence of model misspecification — just like the Black-Scholes volatility smile."
          : "单因子高斯 copula 的相关性微笑（不同分层反解出不同的隐含相关性）本身就是模型被误设的证据——就像 Black-Scholes 的波动率微笑。"}
      </Caution>
      <div>
        <ToolLink label={isEn ? "Credit Spread Decomposition" : "信用利差分解"} note={isEn ? "Four-component shares and the credit-spread-puzzle test" : "四成分占比与信用利差之谜判定"} to={LAB} />
        <ToolLink label={isEn ? "Rating Migration Matrix" : "评级迁移矩阵"} note={isEn ? "Multi-period evolution and migration-risk VaR" : "多期演化与迁移风险 VaR"} to={LAB} />
        <ToolLink label={isEn ? "Tranche Waterfall & OC Triggers" : "分层瀑布与 OC 触发"} note={isEn ? "Losses bottom-up, interest diverted" : "损失自下而上、利息改道"} to={LAB} />
        <ToolLink label={isEn ? "Gaussian Copula Tranching" : "高斯 copula 分层"} note={isEn ? "How correlation redistributes tail losses" : "相关性如何重分配尾部损失"} to={LAB} />
      </div>

      <H n="7" en="Portfolio & Leverage" zh={isEn ? "Portfolio Management, Immunization and Leverage" : "组合管理、免疫与杠杆"} />
      <P>
        {isEn
          ? "Liability-driven portfolios (insurers, pension funds) pursue immunization: the Redington conditions require equal dollar duration of assets and liabilities, with assets having greater convexity, so surplus is always non-negative under small parallel shifts. But the parallel-shift assumption is fragile; in practice, key-rate durations bucket-hedge non-parallel curve moves."
          : "负债驱动的组合（保险、养老金）追求免疫：Redington 条件要求资产与负债的美元久期相等、且资产凸性更大，这样在小幅平行移动下盈余永远非负。但平行移动假设很脆弱，实务上要用关键利率久期分桶对冲曲线的非平行变化。"}
      </P>
      <Eq note={isEn ? "The two Redington immunization conditions" : "Redington 免疫的两个条件"}>
        D$_assets = D$_liabilities {isEn ? "and C_assets > C_liabilities" : "且 C_资产 > C_负债"}
      </Eq>
      <P>
        {isEn
          ? "Leverage is the amplifier of fixed income returns: under repo financing, ROE ≈ asset return + leverage × (asset return − repo rate). The real risk is not the rate itself but the haircut — a rising haircut triggers margin calls, forced selling depresses prices, which raises haircuts further, forming a spiral. LTCM in 1998, and the Treasury basis-trade unwinds of 2008 and March 2020, are all the same script."
          : "杠杆是固定收益回报的放大器：回购融资下，ROE ≈ 资产收益 + 杠杆×(资产收益 − 回购利率)。真正的风险不在利率本身，而在折扣率（haircut）——haircut 上升会触发追加保证金，被迫抛售压低价格，进一步抬高 haircut，形成螺旋。1998 年 LTCM 与 2008 年、2020 年 3 月的美债基差交易平仓，都是同一部剧本。"}
      </P>
      <div>
        <ToolLink label={isEn ? "Repo Leverage & Breakdown Shocks" : "回购杠杆与击穿冲击"} note={isEn ? "ROE amplification and the margin-breakdown threshold" : "ROE 放大与保证金击穿阈值"} to={LAB} />
        <ToolLink label={isEn ? "Margin Spiral" : "保证金螺旋"} note={isEn ? "Iterative path: haircut shock → fire sales → price decline" : "haircut 冲击 → 抛售 → 价格下跌的迭代路径"} to={LAB} />
        <ToolLink label={isEn ? "Redington Immunization" : "Redington 免疫"} note={isEn ? "Surplus curve under duration matching and convexity advantage" : "久期匹配与凸性优势下的盈余曲线"} to={LAB} />
      </div>

      <H n="8" en="History" zh={isEn ? "Historical Arc: Five Stages" : "历史脉络：五个阶段"} />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{isEn ? "Period" : "时期"}</th>
              <th className="px-4 py-3">{isEn ? "Stage" : "阶段"}</th>
              <th className="px-4 py-3">{isEn ? "Core contributions" : "核心贡献"}</th>
              <th className="px-4 py-3">{isEn ? "Legacy" : "遗产"}</th>
            </tr>
          </thead>
          <tbody>
            {eras.map((e) => (
              <tr key={e.y} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{e.y}</td>
                <td className="px-4 py-3 text-foreground">{L(e.s)}</td>
                <td className="px-4 py-3 text-foreground/70">{L(e.core)}</td>
                <td className="px-4 py-3 text-foreground/60">{L(e.legacy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H n="9" en="Frontier & Workflow" zh={isEn ? "Institutional Frontiers and the Research Workflow" : "制度前沿与研究流程"} />
      <P>
        {isEn ? (
          <>
            The four most active frontiers today:
            <strong className="text-foreground">benchmark reform</strong> (LIBOR's forward-looking fixing replaced by SOFR's backward-looking compounding; compounding convexity makes it slightly higher than a simple average, and fallbacks need a historical median spread adjustment);
            <strong className="text-foreground">negative rates</strong> (lognormal models fail; shifted-lognormal or normal models are needed to price negative forwards);
            <strong className="text-foreground">climate & ESG</strong> (the greenium of green bonds coexists with transition-risk discounts for high-carbon issuers);
            <strong className="text-foreground">bond liquidity</strong> (sparse trading makes spreads hard to observe directly, so liquidity premia must be inferred from turnover and volatility).
          </>
        ) : (
          <>
            当下最活跃的四条前沿：
            <strong className="text-foreground">基准利率改革</strong>（LIBOR 的前瞻定盘换成 SOFR 的后视复利，复利的凸性使其略高于简单平均，fallback 需要历史中位数利差调整）；
            <strong className="text-foreground">负利率</strong>（对数正态模型失效，位移对数正态或正态模型才能给负远期定价）；
            <strong className="text-foreground">气候与 ESG</strong>（绿色债券的 greenium 与高碳发行人的转型风险贴水同时存在）；
            <strong className="text-foreground">债券流动性</strong>（成交稀疏使价差难以直接观测，需要用换手率与波动率反推流动性溢价）。
          </>
        )}
      </P>
      <div>
        <ToolLink label={isEn ? "RFR Backward Compounding & Fallback" : "RFR 后视复利与 fallback"} note={isEn ? "Compounding convexity, basis and the median spread adjustment" : "复利凸性、基差与中位数利差调整"} to={LAB} />
        <ToolLink label={isEn ? "Shifted-Lognormal Caplet" : "位移对数正态 caplet"} note={isEn ? "Pricing that still works under negative rates" : "负利率下仍然有效的定价"} to={LAB} />
        <ToolLink label={isEn ? "Greenium & Transition Discount" : "绿色溢价与转型贴水"} note={isEn ? "Net effect of ESG labels and carbon intensity on spreads" : "ESG 标签与碳强度对利差的净效应"} to={LAB} />
        <ToolLink label={isEn ? "Bond Liquidity Premium" : "债券流动性溢价"} note={isEn ? "Turnover / trading frequency / holding period" : "换手率 / 成交频率 / 持有期"} to={LAB} />
      </div>
      <P>
        {isEn
          ? "A recommended eight-step research workflow: ① pin down cash flows and contract terms; ② build and test the curve (bootstrapping + interpolation sensitivity); ③ choose a spread convention and state what it nets out; ④ compute effective duration/convexity and key-rate durations; ⑤ if options are embedded, choose a dynamic model consistent with market quotes and calibrate it; ⑥ decompose the credit spread and check for liquidity mismatch; ⑦ stress-test with financing and haircut scenarios; ⑧ report results together with sensitivity ranges over model assumptions."
          : "研究流程建议按八步走：① 明确现金流与条款；② 构建并检验曲线（自举 + 插值敏感性）；③ 选定利差口径并说明扣掉了什么；④ 计算有效久期/凸性与关键利率久期；⑤ 若含权，选择与市场报价一致的动态模型并校准；⑥ 分解信用利差、检查是否存在流动性错配；⑦ 加上融资与 haircut 情景做压力测试；⑧ 报告结果时同时给出模型假设的敏感性区间。"}
      </P>
      <P>
        {isEn
          ? "A four-stage learning path: ① do discounting and duration/convexity until you can do them blindfolded; ② master curve construction and the four spread conventions; ③ move into dynamic models and embedded-option / convertible bonds; ④ finish with credit structuring, portfolio immunization and leverage–funding risk."
          : "学习路线四阶段：① 贴现与久期凸性算到闭眼能做；② 掌握曲线构建与四种利差口径；③ 进入动态模型与含权/可转债；④ 最后做信用结构化、组合免疫与杠杆—融资风险。"}
      </P>
      <div className="mt-6">
        <ToolLink label={isEn ? "Enter the Fixed Income Frontier Lab" : "进入固定收益前沿实验室"} note={isEn ? "Reproduce each stage in the four-stage order" : "按四阶段顺序逐个复现"} to={LAB} />
      </div>
    </article>
  );
}
