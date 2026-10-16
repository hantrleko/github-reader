import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Structured reading guide for macroeconomics (V6.0).
 * Chain: object & method → long-run growth → short-run fluctuations →
 * monetary policy → fiscal policy → open economy → history of thought →
 * frontier → a practical judgement framework.
 */

const H = ({ n, i18nKey, enDefault }: { n: string; i18nKey: string; enDefault: string }) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  return (
    <div className="flex items-baseline gap-3 mt-14 mb-5 border-b border-border/50 pb-3">
      <span className="text-[10px] font-mono tracking-[0.3em] text-gold">PART {n}</span>
      <h3 className="font-display text-2xl md:text-[26px] text-foreground leading-tight">
        {t(i18nKey)}
      </h3>
      {!isEn && (
        <span className="ml-auto text-[11px] font-mono text-muted-foreground hidden md:inline">{enDefault}</span>
      )}
    </div>
  );
};

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

const ToolLink = ({ i18nKey, to }: { i18nKey: string; to: string }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      className="group inline-flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 mr-2 mb-2 hover:border-gold/50 hover:bg-card/60 transition-all"
    >
      <span>
        <span className="block text-sm text-foreground group-hover:text-gold transition-colors">{t(`${i18nKey}.label`)}</span>
        <span className="block text-[11px] text-foreground/55">{t(`${i18nKey}.note`)}</span>
      </span>
      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors mt-0.5 shrink-0" />
    </Link>
  );
};

const FRONTIER = "/s/macro-frontier";
const CLASSIC = "/s/macro";
const LAB = "/s/macro-lab";

export default function MacroTheory() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  const schools = [
    { 
      y: "1776–1930", 
      s: { zh: "古典与货币数量论", en: "Classical & Quantity Theory of Money" }, 
      core: { zh: "萨伊定律、MV=PY、价格灵活、货币中性", en: "Say's Law, MV=PY, Flexible Prices, Monetary Neutrality" }, 
      legacy: { zh: "长期二分法与通胀的货币根源", en: "Classical Dichotomy & Monetary Origins of Inflation" } 
    },
    { 
      y: "1936–1960s", 
      s: { zh: "凯恩斯革命与新古典综合", en: "Keynesian Revolution & Neoclassical Synthesis" }, 
      core: { zh: "有效需求、流动性偏好、乘数、IS-LM", en: "Effective Demand, Liquidity Preference, Multiplier, IS-LM" }, 
      legacy: { zh: "需求管理与稳定政策的合法性", en: "Legitimacy of Demand Management & Stabilization Policy" } 
    },
    { 
      y: "1968–1979", 
      s: { zh: "货币主义与理性预期革命", en: "Monetarism & Rational Expectations Revolution" }, 
      core: { zh: "自然率假说、卢卡斯批判、政策无效命题", en: "Natural Rate Hypothesis, Lucas Critique, Policy Ineffectiveness Proposition" }, 
      legacy: { zh: "微观基础与预期成为硬约束", en: "Micro-foundations & Expectations as Hard Constraints" } 
    },
    { 
      y: "1982–1990s", 
      s: { zh: "RBC 与新凯恩斯主义", en: "RBC & New Keynesianism" }, 
      core: { zh: "随机动态一般均衡、校准、名义刚性微观基础", en: "DSGE, Calibration, Micro-foundations of Nominal Rigidity" }, 
      legacy: { zh: "DSGE 成为共同语言", en: "DSGE as a Common Language" } 
    },
    { 
      y: "1993–2007", 
      s: { zh: "新共识与大缓和", en: "New Consensus & The Great Moderation" }, 
      core: { zh: "泰勒规则、通胀目标制、3 方程 NK", en: "Taylor Rule, Inflation Targeting, 3-equation NK" }, 
      legacy: { zh: "货币政策科学化，金融被忽略", en: "Science of Monetary Policy, Finance Overlooked" } 
    },
    { 
      y: "2008–", 
      s: { zh: "危机后反思", en: "Post-Crisis Reflection" }, 
      core: { zh: "金融摩擦、ZLB、异质性、财政重估", en: "Financial Frictions, ZLB, Heterogeneity, Fiscal Revaluation" }, 
      legacy: { zh: "HANK、宏观金融、宏观审慎", en: "HANK, Macro-Finance, Macroprudential Policy" } 
    },
  ];

  const shocks = [
    { 
      k: { zh: "需求冲击", en: "Demand Shock" }, 
      sign: { zh: "产出与通胀同向", en: "Output & Inflation in Same Direction" }, 
      ex: { zh: "投资信心崩塌、财政扩张、金融条件收紧", en: "Collapse in Investment Confidence, Fiscal Expansion, Tightening Financial Conditions" }, 
      rx: { zh: "货币/财政可同时改善两者", en: "Monetary/Fiscal Policy Can Improve Both Simultaneously" } 
    },
    { 
      k: { zh: "供给冲击", en: "Supply Shock" }, 
      sign: { zh: "产出与通胀反向", en: "Output & Inflation in Opposite Directions" }, 
      ex: { zh: "能源价格、供应链断裂、劳动供给收缩", en: "Energy Prices, Supply Chain Disruptions, Labor Supply Contraction" }, 
      rx: { zh: "存在稳定权衡，需判断是否影响预期", en: "Stability Trade-off Exists; Need to Judge Effect on Expectations" } 
    },
    { 
      k: { zh: "金融冲击", en: "Financial Shock" }, 
      sign: { zh: "利差与净值主导", en: "Spread & Net Worth Dominance" }, 
      ex: { zh: "银行资本损失、抵押品价值崩跌", en: "Bank Capital Losses, Collateral Value Collapse" }, 
      rx: { zh: "流动性/资本工具优于单纯降息", en: "Liquidity/Capital Tools Superior to Simple Rate Cuts" } 
    },
    { 
      k: { zh: "预期冲击", en: "Expectation Shock" }, 
      sign: { zh: "自我实现", en: "Self-fulfilling" }, 
      ex: { zh: "通胀预期脱锚、恐慌与挤兑", en: "De-anchoring of Inflation Expectations, Panic & Runs" }, 
      rx: { zh: "承诺与沟通是主要工具", en: "Commitment & Communication are Primary Tools" } 
    },
  ];

  const content = {
    intro: {
      zh: "宏观经济学不是「微观的加总」。即使每个家庭与企业都在理性选择，整体仍可能陷入需求不足、失业持续、金融恐慌或通胀失控。它真正处理的是总量结果、协调问题与系统性波动。",
      en: "Macroeconomics is not simply \"aggregated microeconomics.\" Even when every household and firm makes rational choices, the economy as a whole can still fall into insufficient demand, persistent unemployment, financial panic, or runaway inflation. It truly addresses aggregate outcomes, coordination problems, and systemic fluctuations."
    },
    section1: {
      p1: {
        zh: "四类根本问题构成整门学科的骨架：长期增长（为何持续富裕）、短期波动（为何有繁荣与衰退）、政策效果（政府能否稳定经济）、协调失败（人人理性为何仍导致整体低效）。",
        en: "Four fundamental questions form the skeleton of the discipline: long-term growth (why do we remain wealthy), short-term fluctuations (why are there booms and busts), policy effectiveness (can governments stabilize the economy), and coordination failures (why individual rationality can still lead to collective inefficiency)."
      },
      p2: {
        zh: "卢卡斯批判之后，总量关系必须能追溯到偏好、技术与约束，否则政策一变，估计出来的关系就会失效。代表性代理人模型以简洁换取一致性，但抹去了收入与财富分布；异质性代理人转向（HANK/TANK）恢复了分布，代价是求解与识别难度显著上升。",
        en: "After the Lucas Critique, aggregate relationships must be traceable to preferences, technology, and constraints; otherwise, once policies change, the estimated relationships become invalid. Representative agent models trade consistency for simplicity but erase income and wealth distributions; the shift toward heterogeneous agents (HANK/TANK) restores distribution at the cost of significantly increased difficulty in solution and identification."
      },
      eqNote: {
        zh: "古典二分法：长期由实际因素决定，货币只定价格水平",
        en: "Classical Dichotomy: Long-run determined by real factors; money only determines price level"
      },
      eq: {
        zh: "长期：Y = F(K, H, A)　│　短期：Y − Yⁿ = f(需求、名义刚性、金融摩擦、预期)",
        en: "Long-run: Y = F(K, H, A)　│　Short-run: Y − Yⁿ = f(Demand, Nominal Rigidity, Financial Frictions, Expectations)"
      }
    },
    section2: {
      p1: {
        zh: "索洛模型给出基准：资本边际报酬递减意味着储蓄率只改变收入水平而非长期增速，长期人均增长完全由外生技术进步决定 —— 这既是它的清晰之处，也是它最大的不满足之处。",
        en: "The Solow model provides the benchmark: diminishing marginal returns to capital mean that the savings rate only changes the income level rather than the long-run growth rate. Long-run per capita growth is determined entirely by exogenous technological progress—this is both its clarity and its greatest source of dissatisfaction."
      },
      p2: {
        zh: "内生增长把技术拉进模型：AK 消除递减报酬；Lucas 让人力资本承担增长引擎；Romer 用品种扩张与知识非竞争性解释研发的规模报酬；Aghion-Howitt 用创造性破坏刻画质量阶梯与在位者阻挠。制度学派则追问更上一层：产权、约束权力与包容性制度决定了这些引擎能否被点燃。",
        en: "Endogenous growth models bring technology into the model: AK eliminates diminishing returns; Lucas makes human capital the growth engine; Romer uses variety expansion and non-rivalry of knowledge to explain scale returns to R&D; Aghion-Howitt uses creative destruction to characterize quality ladders and incumbent obstruction. The institutional school asks a further question: whether property rights, constraints on power, and inclusive institutions determine if these engines can be ignited."
      },
      eqNote: {
        zh: "AK / Lucas / Romer / Schumpeter 的长期增速",
        en: "Long-run Growth Rates: AK / Lucas / Romer / Schumpeter"
      }
    },
    section3: {
      p1: {
        zh: "凯恩斯的核心洞见是：产出可以由需求决定，而失业可以是均衡的一部分；乘数与加速数的互动足以内生出周期，无须外生冲击。RBC 的贡献主要是方法论——把周期放进随机动态一般均衡、用校准与矩匹配检验模型；其争议在于把衰退解释为技术倒退、需要过高的劳动供给弹性，并且没有货币与金融。",
        en: "Keynes's core insight is that output can be demand-determined and unemployment can be part of an equilibrium; the interaction of the multiplier and accelerator is sufficient to generate endogenous cycles without exogenous shocks. The RBC contribution is mainly methodological—putting cycles into stochastic dynamic general equilibrium and testing models with calibration and moment matching; its controversy lies in explaining recessions as technological regress, requiring excessively high labor supply elasticity, and omitting money and finance."
      },
      p2: {
        zh: "新凯恩斯主义把名义刚性建立在微观基础上：Calvo 交错定价、菜单成本与工资合同。θ（不调价概率）越高，NKPC 越平坦，通胀对缺口越不敏感，反通胀的牺牲率越高，货币非中性越持久。",
        en: "New Keynesianism builds nominal rigidity on micro-foundations: Calvo staggered pricing, menu costs, and wage contracts. The higher θ (probability of not adjusting prices), the flatter the NKPC, the less sensitive inflation is to the gap, the higher the sacrifice ratio of disinflation, and the more persistent monetary non-neutrality becomes."
      },
      eqNote: {
        zh: "Calvo 交错定价推出的 NKPC 斜率",
        en: "NKPC Slope Derived from Calvo Staggered Pricing"
      }
    },
    section4: {
      p1: {
        zh: "传导不止利率一条渠道：信贷与资产负债表渠道（净值 → 外部融资溢价）、资产价格与财富渠道、汇率渠道，以及预期与信号渠道。金融摩擦越强，后几条越重要——这正是 BGG 金融加速器的用武之地。",
        en: "Transmission involves more than just the interest rate channel: credit and balance sheet channels (net worth → external finance premium), asset price and wealth channels, exchange rate channels, and expectation and signaling channels. The stronger the financial frictions, the more important the latter channels become—which is where the BGG financial accelerator comes in."
      },
      p2: {
        zh: "规则 vs 相机抉择的经典结论来自时间不一致：若央行想把产出推到自然率之上，公众会预期到这一动机，均衡结果是更高的通胀而产出不变（通胀偏差 λαk）。独立央行、通胀目标制与承诺技术因此不是形式主义，而是降低偏差的制度手段。价格水平目标与名义 GDP 目标通过「补偿过去偏离」获得额外的预期渠道。",
        en: "The classic conclusion of rules vs. discretion comes from time inconsistency: if a central bank wants to push output above its natural rate, the public will anticipate this motive, and the equilibrium result is higher inflation with no change in output (inflation bias λαk). Independent central banks, inflation targeting, and commitment technologies are therefore not formalisms but institutional means to reduce bias. Price-level targeting and nominal GDP targeting gain additional expectation channels by \"compensating for past deviations.\""
      },
      eqNote: {
        zh: "Barro-Gordon 的相机抉择均衡",
        en: "Discretionary Equilibrium in Barro-Gordon"
      },
      eq: {
        zh: "πᴰ = λαk + 稳定项　vs　πᶜ = 稳定项　⟹　通胀偏差 = λαk",
        en: "πᴰ = λαk + stabilization　vs　πᶜ = stabilization　⟹　inflation bias = λαk"
      }
    },
    section5: {
      p1: {
        zh: "财政乘数不是常数。它随经济松弛度、货币政策是否抵消、家庭的流动性约束程度、进口漏出与税制自动稳定器而系统性变化：深度衰退且处于 ZLB 时可显著大于 1；过热且央行强力抵消时可能小于 1。",
        en: "The fiscal multiplier is not a constant. It varies systematically with economic slack, whether monetary policy offsets it, the degree of household liquidity constraints, import leakage, and automatic tax stabilizers: it can be significantly greater than 1 in deep recessions at the ZLB, and less than 1 when the economy is overheating and the central bank strongly offsets it."
      },
      p2: {
        zh: "李嘉图等价成立需要无限期界、完美资本市场、总量税与前瞻理性——现实中流动性约束家庭与扭曲性税收让等价只是部分成立。债务可持续性的关键则是 (r−g)：r<g 时债务可被增长稀释，r>g 时必须靠基本盈余稳定。",
        en: "Ricardian equivalence requires infinite horizons, perfect capital markets, lump-sum taxes, and forward-looking rationality—in reality, liquidity-constrained households and distorting taxes make equivalence only partially hold. The key to debt sustainability is (r-g): when r < g, debt can be diluted by growth; when r > g, it must be stabilized by a primary surplus."
      },
      eqNote: {
        zh: "债务动态与稳定所需盈余",
        en: "Debt Dynamics and Surplus Required for Stability"
      }
    },
    section6: {
      p1: {
        zh: "蒙代尔—弗莱明给出政策效力的分类学：资本自由流动下，固定汇率使货币政策失效而财政政策有效，浮动汇率则相反。三元悖论的现代版本（Rey 的「二元悖论」）指出：在全球金融周期下，即便浮动汇率也未必带来完全的货币独立，资本流动管理与宏观审慎因此重新进入工具箱。",
        en: "Mundell-Fleming provides a taxonomy of policy effectiveness: under free capital mobility, fixed exchange rates make monetary policy ineffective and fiscal policy effective, while floating exchange rates do the opposite. The modern version of the trilemma (Rey's \"dilemma\") points out that under a global financial cycle, even a floating exchange rate may not bring complete monetary independence, bringing capital flow management and macroprudential policy back into the toolbox."
      },
      p2: {
        zh: "平价条件是纪律而非事实：PPP 只在长期与高通胀差下大致成立；UIP 的 Fama 回归系数常显著为负（远期溢价之谜），高息货币的 Carry 收益不能被简单归为免费午餐；连 CIP 在 2008 年后也长期存在基差，说明套利受资产负债表约束。",
        en: "Parity conditions are disciplines rather than facts: PPP only roughly holds in the long run and under high inflation differentials; the Fama regression coefficient for UIP is often significantly negative (forward premium puzzle), meaning carry gains from high-interest currencies cannot be simply classified as a free lunch; even CIP has had persistent bases since 2008, indicating that arbitrage is constrained by balance sheets."
      }
    },
    section8: {
      p1: {
        zh: "HANK 让货币政策的传导更多经由收入与再分配渠道，而非单纯的跨期替代；行为宏观用黏性信息、适应性学习与诊断性预期解释预测误差的可预测性（CG 系数≠0）；宏观金融把银行资本、抵押品与去杠杆螺旋写进周期；气候宏观把碳定价、绿色通胀与物理损害同时放进跨期权衡；机器学习与大数据则改造了 nowcasting 与政策评估的实证工具箱。",
        en: "HANK makes monetary policy transmission occur more through income and redistribution channels rather than simple intertemporal substitution; behavioral macro uses sticky information, adaptive learning, and diagnostic expectations to explain the predictability of forecast errors (CG coefficient ≠ 0); macro-finance writes bank capital, collateral, and deleveraging spirals into the cycle; climate macro puts carbon pricing, greenflation, and physical damage into intertemporal tradeoffs; machine learning and big data have transformed the empirical toolbox for nowcasting and policy evaluation."
      }
    },
    section9: {
      p1: {
        zh: "面对任何宏观新闻或政策讨论，按固定顺序推进，可以避免把结论前置：",
        en: "When facing any macro news or policy discussion, proceeding in a fixed order can avoid pre-empting conclusions:"
      },
      p2: {
        zh: "第二步识别经济状态：产出缺口的符号、劳动市场紧张度、通胀预期是否锚定、是否处于 ZLB 或财政受限。第三步判断关键摩擦：是名义刚性、金融摩擦、流动性约束家庭，还是预期形成本身出了问题。第四步才讨论政策组合 —— 货币、财政、宏观审慎与结构性政策的相对优势取决于前三步的答案，而非取决于对某个学派的偏好。",
        en: "Step two: Identify the economic state—the sign of the output gap, labor market tightness, whether inflation expectations are anchored, and whether the economy is at the ZLB or fiscally constrained. Step three: Judge key frictions—whether it is nominal rigidity, financial frictions, liquidity-constrained households, or problems with expectation formation itself. Step four: Only then discuss the policy mix—the relative advantages of monetary, fiscal, macroprudential, and structural policies depend on the answers to the first three steps, rather than preferences for a particular school."
      }
    }
  };

  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · V6.0</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          {t("essays.macroTheory.title")}
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          {isEn ? content.intro.en : content.intro.zh}
        </p>
        <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
          <p className="text-[13px] font-mono text-foreground/80 leading-[1.9]">
            {t("essays.macroTheory.mainLine")}
          </p>
        </div>
      </header>

      <H n="01" i18nKey="essays.macroTheory.sections.s1" enDefault="Object, Aggregate Thinking & Micro-foundations" />
      <P>{isEn ? content.section1.p1.en : content.section1.p1.zh}</P>
      <P>{isEn ? content.section1.p2.en : content.section1.p2.zh}</P>
      <Eq note={isEn ? content.section1.eqNote.en : content.section1.eqNote.zh}>
        {isEn ? content.section1.eq.en : content.section1.eq.zh}
      </Eq>
      <div className="mt-4">
        <ToolLink i18nKey="essays.macroTheory.tools.solow" to={CLASSIC} />
        <ToolLink i18nKey="essays.macroTheory.tools.hank" to={CLASSIC} />
      </div>

      <H n="02" i18nKey="essays.macroTheory.sections.s2" enDefault="Long-run Growth" />
      <P>{isEn ? content.section2.p1.en : content.section2.p1.zh}</P>
      <P>{isEn ? content.section2.p2.en : content.section2.p2.zh}</P>
      <Eq note={isEn ? content.section2.eqNote.en : content.section2.eqNote.zh}>
        g<sub>AK</sub> = sA − (δ+n)　│　g<sub>Lucas</sub> = ψu　│　g<sub>Romer</sub> = θ·s<sub>R</sub>·L　│　g<sub>Schum</sub> = λ·ln γ
      </Eq>
      <div className="mt-4">
        <ToolLink i18nKey="essays.macroTheory.tools.growthEngines" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.growthAccounting" to={FRONTIER} />
      </div>
      <Caution title={t("essays.macroTheory.caution.tfp.title")}>
        {t("essays.macroTheory.caution.tfp.content")}
      </Caution>

      <H n="03" i18nKey="essays.macroTheory.sections.s3" enDefault="Short-run Fluctuations" />
      <P>{isEn ? content.section3.p1.en : content.section3.p1.zh}</P>
      <P>{isEn ? content.section3.p2.en : content.section3.p2.zh}</P>
      <Eq note={isEn ? content.section3.eqNote.en : content.section3.eqNote.zh}>
        π<sub>t</sub> = β E<sub>t</sub>π<sub>t+1</sub> + κ x<sub>t</sub>,　κ = (1−θ)(1−βθ)/θ · (σ + φ)
      </Eq>
      <div className="mt-4">
        <ToolLink i18nKey="essays.macroTheory.tools.multiplier" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.rbc" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.calvo" to={FRONTIER} />
      </div>

      <H n="04" i18nKey="essays.macroTheory.sections.s4" enDefault="Monetary Policy" />
      <P>{isEn ? content.section4.p1.en : content.section4.p1.zh}</P>
      <P>{isEn ? content.section4.p2.en : content.section4.p2.zh}</P>
      <Eq note={isEn ? content.section4.eqNote.en : content.section4.eqNote.zh}>
        {isEn ? content.section4.eq.en : content.section4.eq.zh}
      </Eq>
      <div className="mt-4">
        <ToolLink i18nKey="essays.macroTheory.tools.rules" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.unconventional" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.zlb" to={LAB} />
      </div>
      <Caution title={t("essays.macroTheory.caution.forwardGuidance.title")}>
        {t("essays.macroTheory.caution.forwardGuidance.content")}
      </Caution>

      <H n="05" i18nKey="essays.macroTheory.sections.s5" enDefault="Fiscal Policy" />
      <P>{isEn ? content.section5.p1.en : content.section5.p1.zh}</P>
      <P>{isEn ? content.section5.p2.en : content.section5.p2.zh}</P>
      <Eq note={isEn ? content.section5.eqNote.en : content.section5.eqNote.zh}>
        b<sub>t+1</sub> = (1+r)/(1+g) · b<sub>t</sub> − s,　s* = (r−g)/(1+g) · b
      </Eq>
      <div className="mt-4">
        <ToolLink i18nKey="essays.macroTheory.tools.fiscalExp" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.debtSpace" to={LAB} />
      </div>

      <H n="06" i18nKey="essays.macroTheory.sections.s6" enDefault="Open Economy" />
      <P>{isEn ? content.section6.p1.en : content.section6.p1.zh}</P>
      <P>{isEn ? content.section6.p2.en : content.section6.p2.zh}</P>
      <div className="mt-4">
        <ToolLink i18nKey="essays.macroTheory.tools.parity" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.suddenStop" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.overshooting" to={LAB} />
      </div>
      <Caution title={t("essays.macroTheory.caution.devaluation.title")}>
        {t("essays.macroTheory.caution.devaluation.content")}
      </Caution>

      <H n="07" i18nKey="essays.macroTheory.sections.s7" enDefault="History of Thought" />
      <div className="overflow-x-auto mt-2 rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.macroTheory.history.period")}</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.macroTheory.history.school")}</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.macroTheory.history.core")}</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.macroTheory.history.legacy")}</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((r) => (
              <tr key={r.y} className="border-t border-border/60">
                <td className="px-4 py-2.5 font-mono text-[11px] text-gold whitespace-nowrap">{r.y}</td>
                <td className="px-4 py-2.5 text-foreground">{isEn ? r.s.en : r.s.zh}</td>
                <td className="px-4 py-2.5 text-foreground/70">{isEn ? r.core.en : r.core.zh}</td>
                <td className="px-4 py-2.5 text-foreground/55">{isEn ? r.legacy.en : r.legacy.zh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H n="08" i18nKey="essays.macroTheory.sections.s8" enDefault="Frontier" />
      <P>{isEn ? content.section8.p1.en : content.section8.p1.zh}</P>
      <div className="mt-4">
        <ToolLink i18nKey="essays.macroTheory.tools.expectation" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.bankCapital" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.climate" to={FRONTIER} />
        <ToolLink i18nKey="essays.macroTheory.tools.bgg" to={LAB} />
      </div>
      <Caution title={t("essays.macroTheory.caution.postPandemic.title")}>
        {t("essays.macroTheory.caution.postPandemic.content")}
      </Caution>

      <H n="09" i18nKey="essays.macroTheory.sections.s9" enDefault="A Judgement Framework" />
      <P>{isEn ? content.section9.p1.en : content.section9.p1.zh}</P>
      <div className="overflow-x-auto mt-2 rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.macroTheory.judgment.type")}</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.macroTheory.judgment.sign")}</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.macroTheory.judgment.source")}</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.macroTheory.judgment.implication")}</th>
            </tr>
          </thead>
          <tbody>
            {shocks.map((r) => (
              <tr key={isEn ? r.k.en : r.k.zh} className="border-t border-border/60">
                <td className="px-4 py-2.5 text-foreground whitespace-nowrap">{isEn ? r.k.en : r.k.zh}</td>
                <td className="px-4 py-2.5 text-foreground/70">{isEn ? r.sign.en : r.sign.zh}</td>
                <td className="px-4 py-2.5 text-foreground/55">{isEn ? r.ex.en : r.ex.zh}</td>
                <td className="px-4 py-2.5 text-foreground/70">{isEn ? r.rx.en : r.rx.zh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>{isEn ? content.section9.p2.en : content.section9.p2.zh}</P>
      <Caution title={t("essays.macroTheory.caution.judgmentRules.title")}>
        {t("essays.macroTheory.caution.judgmentRules.content")}
      </Caution>

      <div className="mt-12 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold mb-2">{t("essays.macroTheory.labTitle")}</p>
        <div>
          <ToolLink i18nKey="essays.macroTheory.tools.lab" to={FRONTIER} />
        </div>
      </div>
    </article>
  );
}
