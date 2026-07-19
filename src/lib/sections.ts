import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type SectionDef = {
  id: string;
  /** e.g. "Chapter 1" or "Foundations" */
  chapter: string;
  /** short uppercase-ish kicker, e.g. "DERIVATIVES" */
  kicker: string;
  /** display title (zh) */
  label: string;
  subtitle?: string;
  /** nav group this section belongs to (for landing directory grouping) */
  group: string;
  Component: LazyExoticComponent<ComponentType<unknown>>;
};

/** ids that live on the landing page (not their own route) */
export const HOME_IDS = ["hero", "topics", "models"];

export const SECTIONS: SectionDef[] = [
  {
    id: "micro",
    chapter: "Foundations",
    kicker: "Microeconomics",
    label: "微观经济学 · 个体决策与市场",
    subtitle: "从供需均衡、消费者与生产者最优，到市场结构博弈与信息不对称，搭建所有经济分析的微观基石。",
    group: "基础",
    Component: lazy(() => import("@/components/MicroTools")),
  },
  {
    id: "calculator",
    chapter: "Chapter 1",
    kicker: "Option Pricing",
    label: "基础定价 · 期权与隐含波动率",
    subtitle: "从闭式解、隐含波动率反推到蒙特卡洛模拟，理解定价公式背后的复制组合与风险中性逻辑。",
    group: "基础定价",
    Component: lazy(() => import("@/components/CalculatorSection")),
  },
  {
    id: "implied-vol",
    chapter: "Chapter 1",
    kicker: "Implied Vol",
    label: "隐含波动率求解器",
    subtitle: "用 Newton-Raphson 从市场价格反推隐含波动率，观察波动率微笑与期限结构。",
    group: "基础定价",
    Component: lazy(() => import("@/components/ImpliedVolTool")),
  },
  {
    id: "mc-pricer",
    chapter: "Chapter 1",
    kicker: "Monte Carlo",
    label: "蒙特卡洛期权定价",
    subtitle: "用路径模拟为欧式与路径依赖期权定价，对比闭式解并观察收敛与方差。",
    group: "基础定价",
    Component: lazy(() => import("@/components/MCOptionPricer")),
  },
  {
    id: "derivatives",
    chapter: "Chapter 2",
    kicker: "Derivatives",
    label: "衍生品高阶 · 波动率曲面与路径依赖",
    subtitle: "围绕 SVI、Heston、SABR、Local Vol 与 LSM，将市场微笑、随机波动和美式行权放进同一套实验框架。",
    group: "衍生品",
    Component: lazy(() => import("@/components/DerivativesTools")),
  },
  {
    id: "bond",
    chapter: "Chapter 3",
    kicker: "Fixed Income",
    label: "固定收益 · 债券与现金流",
    subtitle: "从债券现金流、到期收益率到久期凸性，理解利率变动对价格的传导。",
    group: "固收与组合",
    Component: lazy(() => import("@/components/BondCalculator")),
  },
  {
    id: "rate-model",
    chapter: "Chapter 3",
    kicker: "Rate Models",
    label: "短率模型模拟",
    subtitle: "用 Vasicek / CIR 等短率模型模拟利率路径与期限结构。",
    group: "固收与组合",
    Component: lazy(() => import("@/components/RateModelSimulator")),
  },
  {
    id: "fixed-income-lab",
    chapter: "Chapter 3",
    kicker: "Fixed Income Lab",
    label: "固定收益高阶 · 信用/短率/OAS/曲线",
    subtitle: "V4.5 · Merton & CDS 反推、Vasicek/CIR/HW 期限结构、Ho-Lee 树 OAS 与 PSA MBS、TIPS 与 2-5-10 蝶式。",
    group: "固收与组合",
    Component: lazy(() => import("@/components/bond/V45FixedIncomeLab")),
  },
  {
    id: "frontier",
    chapter: "Chapter 3",
    kicker: "Efficient Frontier",
    label: "均值-方差有效前沿",
    subtitle: "构建有效前沿、切线组合与资本市场线，理解分散化与最优配置。",
    group: "固收与组合",
    Component: lazy(() => import("@/components/EfficientFrontier")),
  },
  {
    id: "asset-pricing",
    chapter: "Asset Pricing",
    kicker: "CAPM & Factors",
    label: "资产定价 · CAPM 与多因子",
    subtitle: "从 CAPM 证券市场线到 APT 与 Fama-French 多因子归因，理解系统性风险如何被定价。",
    group: "资产定价",
    Component: lazy(() => import("@/components/AssetPricingTools")),
  },
  {
    id: "econometrics",
    chapter: "Chapter 4",
    kicker: "Econometrics",
    label: "计量经济学 · 估计与状态空间",
    subtitle: "覆盖 OLS、IV、GMM、GARCH、Kalman 与因果推断，强调估计假设、诊断检验和稳健推断。",
    group: "计量经济",
    Component: lazy(() => import("@/components/EconometricsTools")),
  },
  {
    id: "risk",
    chapter: "Chapter 5",
    kicker: "Risk",
    label: "风险管理 · 信用、相依结构与压力测试",
    subtitle: "从 VaR/ES 到 Merton 违约距离、Copula 相依和情景冲击，建立可解释的尾部风险监控语言。",
    group: "风险管理",
    Component: lazy(() => import("@/components/RiskTools")),
  },
  {
    id: "quant",
    chapter: "Chapter 6",
    kicker: "Quant Strategy",
    label: "量化策略 · 回测与因子归因",
    subtitle: "用可审计的回测、风险预算和多因子归因，把策略想法拆成信号、组合构建与风险约束。",
    group: "量化与学习",
    Component: lazy(() => import("@/components/QuantStrategyTools")),
  },
  {
    id: "macro",
    chapter: "Chapter 7",
    kicker: "Macroeconomics",
    label: "宏观经济学 · 增长与动态均衡",
    subtitle: "用 Solow、RBC/DSGE 与政策冲击模拟，观察长期增长、技术进步和动态均衡的传导机制。",
    group: "宏观",
    Component: lazy(() => import("@/components/MacroTools")),
  },
  {
    id: "fred",
    chapter: "Data",
    kicker: "FRED",
    label: "FRED · 宏观时间序列",
    subtitle: "加载美联储 FRED 的真实宏观经济时间序列并进行可视化分析。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/FredExplorer")),
  },
  {
    id: "worldbank",
    chapter: "Data",
    kicker: "World Bank",
    label: "World Bank · 发展指标",
    subtitle: "对比各国 GDP 增长、通胀等世界银行发展指标。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/WorldBankExplorer")),
  },
  {
    id: "ecb-bis",
    chapter: "Data",
    kicker: "ECB / BIS",
    label: "ECB / BIS · 欧央行与国际清算银行",
    subtitle: "加载欧洲央行与国际清算银行的利率、汇率等官方数据。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/EcbBisExplorer")),
  },
  {
    id: "coingecko",
    chapter: "Data",
    kicker: "CoinGecko",
    label: "CoinGecko · 加密资产",
    subtitle: "加载加密货币历史价格、市值与波动率指标。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/CoinGeckoExplorer")),
  },
  {
    id: "alphavantage",
    chapter: "Data",
    kicker: "Alpha Vantage",
    label: "Alpha Vantage · 股票与外汇",
    subtitle: "加载全球股票与外汇的日线历史，并计算年化波动率与收益。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/AlphaVantageExplorer")),
  },
  {
    id: "cboe-sentiment",
    chapter: "Data",
    kicker: "Cboe · Sentiment",
    label: "CBOE 市场情绪 · VIX / SKEW / PCR",
    subtitle: "VIX 期限结构、VVIX、SKEW 与 Equity Put/Call Ratio,判断恐慌/贪婪。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/CboeSentimentExplorer")),
  },
  {
    id: "econ-calendar",
    chapter: "Data",
    kicker: "Econ Calendar",
    label: "经济日历 · CPI / NFP / FOMC",
    subtitle: "未来两周高影响宏观数据,Trading Economics + 精选静态时间表。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/EconCalendarPanel")),
  },
  {
    id: "etf-lookup",
    chapter: "Data",
    kicker: "ETF Database",
    label: "ETF 查询 · 费率与规模",
    subtitle: "输入代码即时抓取 etfdb.com 上的费率、AUM、类别与 YTD。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/EtfLookupCard")),
  },
  {
    id: "sector-heatmap",
    chapter: "Data",
    kicker: "Sector Heatmap",
    label: "板块热力图 · 11 大行业",
    subtitle: "用 SPDR 行业 ETF 一月涨跌可视化板块轮动 (自采数据,Finviz 风格)。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/SectorHeatmap")),
  },
  {
    id: "market-cap",
    chapter: "Data",
    kicker: "Market Cap",
    label: "全球市值排行 · Top 50",
    subtitle: "季度快照全球最大公司,直观对比行业与国家分布。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/MarketCapRanking")),
  },
  {
    id: "quiver-signals",
    chapter: "Data",
    kicker: "Quiver · Alt Data",
    label: "另类数据信号 · 议员交易 / WSB",
    subtitle: "议员交易、WSB 散户热度等另类数据 (需配置 QUIVER_API_KEY)。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/QuiverSignalsCard")),
  },
  {
    id: "external-workbench",
    chapter: "Data",
    kicker: "External Workbench",
    label: "外部分析工作台 · 一键跨站研究",
    subtitle: "StockAnalysis / Finviz / Koyfin / Seeking Alpha 等 10 个研究站点,ticker-aware 深链。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/ExternalWorkbench")),
  },
  {
    id: "platform",
    chapter: "Chapter 8",
    kicker: "Platform",
    label: "平台增强 · Notebook、真实数据与跨工具对比",
    subtitle: "围绕复现、分享和比较构建平台能力：真实数据加载、模型基准、历史记录与公开 Notebook。",
    group: "量化与学习",
    Component: lazy(() => import("@/components/platform/V28Platform")),
  },
  {
    id: "frontier-concepts",
    chapter: "Frontier",
    kicker: "New Paradigms",
    label: "前沿模型与新兴范式 · 2024–2026",
    subtitle: "AI/ML 资产定价、多智能体仿真、复杂网络、气候金融、神经经济学、DeFi 与宏观金融的概念地图。",
    group: "前沿",
    Component: lazy(() => import("@/components/FrontierConcepts")),
  },
  {
    id: "quiz",
    chapter: "Capstone",
    kicker: "Quiz",
    label: "知识检验",
    subtitle: "通过测验检测对核心模型与方法的掌握程度。",
    group: "量化与学习",
    Component: lazy(() => import("@/components/QuizSection")),
  },
  {
    id: "learning",
    chapter: "Capstone",
    kicker: "Learning Path",
    label: "学习路径",
    subtitle: "用阶段化路线把碎片化知识整理成可持续迭代的研究能力。",
    group: "量化与学习",
    Component: lazy(() => import("@/components/LearningPath")),
  },
  {
    id: "backtest",
    chapter: "Lab",
    kicker: "Backtest Engine",
    label: "真实数据回测引擎",
    subtitle: "用真实历史价格回测单标的策略，输出净值、回撤与完整绩效指标，信号 T+1 执行规避前视偏差。",
    group: "量化与学习",
    Component: lazy(() => import("@/components/quant/BacktestLab")),
  },
  {
    id: "calibration",
    chapter: "Lab",
    kicker: "Model Calibration",
    label: "模型校准实验室",
    subtitle: "把 GARCH / EWMA / Merton 跳跃扩散拟合到真实行情，校准波动率并一键发送到定价工具。",
    group: "量化与学习",
    Component: lazy(() => import("@/components/quant/CalibrationLab")),
  },
];

export const SECTION_MAP: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s])
);

export const isSectionId = (id: string): boolean =>
  Object.prototype.hasOwnProperty.call(SECTION_MAP, id);

/**
 * Resolve an id or legacy "/#id" anchor into the correct route.
 * - home ids (hero/topics/models) -> "/#id" (or "/" for hero)
 * - registered section ids        -> "/s/id"
 * - anything else                 -> returned as-is (already a path)
 */
export const sectionHref = (idOrAnchor: string): string => {
  let id = idOrAnchor;
  if (id.startsWith("/#")) id = id.slice(2);
  else if (id.startsWith("#")) id = id.slice(1);
  else if (id.startsWith("/")) return idOrAnchor; // already a real path

  if (id === "hero") return "/";
  if (HOME_IDS.includes(id)) return `/#${id}`;
  if (isSectionId(id)) return `/s/${id}`;
  // unknown anchor (e.g. research-playbooks lives on home)
  return `/#${id}`;
};
