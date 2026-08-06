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
    subtitle: "V4.5 · Merton 与 CDS 反推、Vasicek/CIR/HW 期限结构、OAS 与 PSA MBS、TIPS 蝶式。",
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
    id: "macro-lab",
    chapter: "Chapter 7",
    kicker: "Macro Lab",
    label: "宏观高阶实验室 · 债务/汇率/BGG/ZLB",
    subtitle: "V4.6 · Blanchard r−g 债务动态、Dornbusch 汇率超调、BOP 三缺口、BGG 金融加速器、ZLB 与前瞻指引 puzzle。",
    group: "宏观",
    Component: lazy(() => import("@/components/macro/V46MacroLab")),
  },
  {
    id: "behavior-microstructure",
    chapter: "Chapter 8",
    kicker: "Behavior & Microstructure",
    label: "行为金融 & 市场微观结构实验室",
    subtitle: "V4.7 · 双曲贴现 / DSSW / 处置效应 + Kyle / Glosten-Milgrom / Roll / Almgren-Chriss。",
    group: "理论",
    Component: lazy(() => import("@/components/behavior/V47BehaviorMicroLab")),
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
    kicker: "Cboe Sentiment",
    label: "CBOE 市场情绪 · VIX / SKEW / PCR",
    subtitle: "VIX 期限结构、VVIX、SKEW 与 Equity Put/Call Ratio，判断恐慌与贪婪。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/CboeSentimentExplorer")),
  },
  {
    id: "econ-calendar",
    chapter: "Data",
    kicker: "Econ Calendar",
    label: "经济日历 · CPI / NFP / FOMC",
    subtitle: "未来两周高影响宏观数据，Trading Economics 叠加精选静态时间表。",
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
    subtitle: "用 SPDR 行业 ETF 一月涨跌可视化板块轮动，自采数据、Finviz 风格。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/SectorHeatmap")),
  },
  {
    id: "market-cap",
    chapter: "Data",
    kicker: "Market Cap",
    label: "全球市值排行 · Top 50",
    subtitle: "季度快照全球最大公司，直观对比行业与国家分布。",
    group: "数据源",
    Component: lazy(() => import("@/components/data/MarketCapRanking")),
  },
  {
    id: "quiver-signals",
    chapter: "Data",
    kicker: "Quiver Alt Data",
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
    subtitle: "StockAnalysis / Finviz / Koyfin / Seeking Alpha 等 10 个研究站点的 ticker-aware 深链。",
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

SECTIONS.push({
  id: "visualization-guide",
  chapter: "V4.8",
  kicker: "Visualization Toolkit",
  label: "可视化组件工作台",
  subtitle: "Brush 联动缩放 · 事件标注 · Fan Chart 置信带 · 直方图 + KDE · 时间轴 Scrubber · PNG / CSV 一键导出 · 色觉友好模式。",
  group: "量化与学习",
  Component: lazy(() => import("@/components/VisualizationGuide")),
});

SECTIONS.push({
  id: "ashare-suite",
  chapter: "V5.0",
  kicker: "A-Share Suite",
  label: "A 股全栈接入 · 行情 / 资金 / 龙虎榜 / 公告",
  subtitle: "V5.0 · 腾讯行情 + 东方财富 push2 + 交易所龙虎榜 + 巨潮公告，一站覆盖沪深北 A 股实时报价、日 K 线、资金流向与官方披露。",
  group: "数据源",
  Component: lazy(() => import("@/components/data/AShareSuite")),
});

SECTIONS.push({
  id: "us-suite",
  chapter: "V5.2",
  kicker: "US Full-Stack Data",
  label: "美股全栈数据 · 行情 / 基本面 / SEC / 期权 / 筛选",
  subtitle: "V5.2 · Yahoo 行情与本地技术指标、SEC XBRL 三表与关键指标、EDGAR 披露流与全库检索、期权链 Greeks 与异动、全市场 XBRL 横截面筛选。",
  group: "数据源",
  Component: lazy(() => import("@/components/data/USSuite")),
});

SECTIONS.push({
  id: "trillion-dollar-equation",
  chapter: "Frontier Essay",
  kicker: "Black–Scholes",
  label: "万亿美元的方程 · Black–Scholes 论证全景",
  subtitle: "五章长文精读:让方向消失的复制组合、离散再平衡的 Gamma 税、卖方拿到的波动率风险溢价,以及行业为何不推翻而是延伸这个方程。",
  group: "前沿",
  Component: lazy(() => import("@/components/essays/TrillionDollarEquation")),
});

SECTIONS.push({
  id: "ai-quant-strategy",
  chapter: "Frontier Essay",
  kicker: "AI Quant Case Study",
  label: "当 AI 告诉我你的想法是反的 · 一次量化策略实录",
  subtitle: "五章复盘：一句话生成的因子组合为何四年亏损、状态依赖如何逆转符号，以及 +1047% 回测背后的 40% 回撤。",
  group: "前沿",
  Component: lazy(() => import("@/components/essays/AiQuantStrategyEssay")),
});

SECTIONS.push({
  id: "asset-pricing-theory",
  chapter: "Reading Guide",
  kicker: "Asset Pricing Theory",
  label: "资产定价理论导读 · 从状态价格到现代前沿",
  subtitle: "V5.3 · p=E[mx] 的四层骨架：无套利与状态价格、偏好与三大谜题、实证检验 (GRS/HJ 距离)、可预测性与因子动物园，每一块都可跳到实验室复现。",
  group: "资产定价",
  Component: lazy(() => import("@/components/essays/AssetPricingTheory")),
});

SECTIONS.push({
  id: "econometrics-theory",
  chapter: "Reading Guide",
  kicker: "Econometrics Theory",
  label: "计量经济学导读 · 从数据生成过程到可信推断",
  subtitle: "V5.4 · 五步推理链：DGP → 识别 → 估计 → 推断 → 解释，七条识别策略、五级标准误与高维异质性方法，每一块都可跳到实验室复现。",
  group: "计量经济",
  Component: lazy(() => import("@/components/essays/EconometricsTheory")),
});

SECTIONS.push({
  id: "time-series-theory",
  chapter: "Reading Guide",
  kicker: "Time Series Theory",
  label: "时间序列导读 · 从平稳性到密度预测评价",
  subtitle: "V5.5 · 六层结构：平稳性与预处理 → 线性表示 → 多变量动态 → 非线性与制度 → 波动率与状态空间 → 预测评价，每一块都可跳到实验室复现。",
  group: "计量经济",
  Component: lazy(() => import("@/components/essays/TimeSeriesTheory")),
});

SECTIONS.push({
  id: "portfolio-theory",
  chapter: "Reading Guide",
  kicker: "Portfolio Theory",
  label: "投资组合导读 · 从均值—方差到稳健与动态配置",
  subtitle: "V5.6 · 六层结构：选择与几何 → 均衡定价 → 估计与稳健 → 风险与约束 → 主动与增长 → 动态与高维，每一块都可跳到实验室复现。",
  group: "量化与学习",
  Component: lazy(() => import("@/components/essays/PortfolioTheory")),
});

export const SECTION_MAP: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s])
);

/* ───────────────────────────────────────────────────────────────
   Unified information architecture — single source of truth for
   the navbar, the homepage domain strip and the section directory.
   ─────────────────────────────────────────────────────────────── */

export type NavGroup = {
  /** stable id, also used as i18n key suffix */
  id: string;
  /** display order code, e.g. "01" */
  code: string;
  /** Chinese display name */
  label: string;
  /** English kicker */
  kicker: string;
  /** one-line description shown in the homepage strip */
  desc: string;
  /** ordered member ids (home ids or section ids) */
  items: string[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    code: "01",
    label: "导览",
    kicker: "Overview",
    desc: "主题图谱 · 模型速览 · 学习路径",
    items: ["hero", "topics", "models", "learning", "quiz"],
  },
  {
    id: "foundations",
    code: "02",
    label: "基础",
    kicker: "Foundations",
    desc: "微观 · 宏观 · 宏观高阶实验室",
    items: ["micro", "macro", "macro-lab"],
  },
  {
    id: "pricing",
    code: "03",
    label: "定价",
    kicker: "Pricing",
    desc: "Black-Scholes · IV · 蒙特卡洛 · 曲面",
    items: ["calculator", "implied-vol", "mc-pricer", "derivatives"],
  },
  {
    id: "fixed-income",
    code: "04",
    label: "固收",
    kicker: "Fixed Income",
    desc: "债券 · 短率模型 · 信用与曲线",
    items: ["bond", "rate-model", "fixed-income-lab"],
  },
  {
    id: "asset-portfolio",
    code: "05",
    label: "资产定价与组合",
    kicker: "Asset Pricing & Portfolio",
    desc: "CAPM · 有效前沿 · 量化策略 · 导读",
    items: [
      "asset-pricing",
      "frontier",
      "quant",
      "backtest",
      "calibration",
      "asset-pricing-theory",
      "portfolio-theory",
    ],
  },
  {
    id: "econometrics",
    code: "06",
    label: "计量与时序",
    kicker: "Econometrics & Time Series",
    desc: "OLS · 面板 · 时间序列 · 行为与微观结构",
    items: [
      "econometrics",
      "econometrics-theory",
      "time-series-theory",
      "behavior-microstructure",
    ],
  },
  {
    id: "risk",
    code: "07",
    label: "风险",
    kicker: "Risk",
    desc: "VaR / ES · 信用 · Copula · 压力测试",
    items: ["risk"],
  },
  {
    id: "data",
    code: "08",
    label: "数据",
    kicker: "Data",
    desc: "美股 / A 股 · 宏观 · 情绪 · 外部工作台",
    items: [
      "us-suite",
      "ashare-suite",
      "fred",
      "worldbank",
      "ecb-bis",
      "coingecko",
      "alphavantage",
      "cboe-sentiment",
      "econ-calendar",
      "etf-lookup",
      "sector-heatmap",
      "market-cap",
      "quiver-signals",
      "external-workbench",
    ],
  },
  {
    id: "frontier",
    code: "09",
    label: "前沿",
    kicker: "Frontier",
    desc: "长文精读 · 新兴范式 · 平台与可视化",
    items: [
      "trillion-dollar-equation",
      "ai-quant-strategy",
      "frontier-concepts",
      "visualization-guide",
      "platform",
    ],
  },
];

/** Re-label every section with its unified domain so all surfaces agree. */
for (const g of NAV_GROUPS) {
  for (const id of g.items) {
    const s = SECTION_MAP[id];
    if (s) s.group = `${g.code} ${g.label} · ${g.kicker}`;
  }
}

/** Ordered [group, sections] pairs — sections only (home ids excluded). */
export const sectionsByGroup = (): { group: NavGroup; sections: SectionDef[] }[] =>
  NAV_GROUPS.map((group) => ({
    group,
    sections: group.items
      .map((id) => SECTION_MAP[id])
      .filter((s): s is SectionDef => Boolean(s)),
  })).filter((entry) => entry.sections.length > 0);

/** Route a domain card should link to (its first real section, else home). */
export const groupEntryHref = (g: NavGroup): string => {
  const first = g.items.find((id) => SECTION_MAP[id]);
  return first ? `/s/${first}` : "/";
};

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
