/**
 * Classic quant strategy library — inspired by QuantPedia / Hudson & Thames.
 * Each entry pairs a one-line edge with primary academic sources and an
 * approximate historical Sharpe so users have a numeric anchor.
 */
export type StrategyCategory =
  | "Momentum"
  | "Value"
  | "Carry"
  | "Volatility"
  | "Mean-Reversion"
  | "Quality"
  | "Risk-Allocation";

export type Strategy = {
  slug: string;
  name: string;
  nameEn: string;
  category: StrategyCategory;
  assetClass: ("Equity" | "Rates" | "FX" | "Commodity" | "Cross-Asset")[];
  oneLiner: string;
  edge: string;
  parameters: { name: string; default: string; range: string }[];
  sharpe: number;          // approximate, out-of-sample, gross
  drawdown: number;        // approximate worst, decimal
  capacity: "Low" | "Medium" | "High";
  papers: string[];        // refs into papers.ts slugs
  toolHash?: string;       // optional anchor link into a calculator on /
};

export const STRATEGIES: Strategy[] = [
  {
    slug: "cross-sectional-momentum",
    name: "横截面动量",
    nameEn: "Cross-Sectional Momentum",
    category: "Momentum",
    assetClass: ["Equity"],
    oneLiner: "买过去 12-1 个月赢家、卖输家",
    edge: "形成期 12 月、跳过最近 1 月、持有 1-6 月,经典 Jegadeesh-Titman 残差。",
    parameters: [
      { name: "Formation", default: "12M", range: "3-12M" },
      { name: "Skip", default: "1M", range: "0-1M" },
      { name: "Holding", default: "1M", range: "1-12M" },
    ],
    sharpe: 0.65,
    drawdown: -0.35,
    capacity: "High",
    papers: ["jegadeesh-1993", "asness-2013"],
  },
  {
    slug: "time-series-momentum",
    name: "时间序列动量",
    nameEn: "Time-Series Momentum (Trend)",
    category: "Momentum",
    assetClass: ["Cross-Asset"],
    oneLiner: "做多近 12 个月正收益资产,做空负收益资产",
    edge: "跨资产 trend-following,Moskowitz-Ooi-Pedersen 给出 58 类资产 25 年正 Sharpe。",
    parameters: [
      { name: "Lookback", default: "12M", range: "1-24M" },
      { name: "Vol-Target", default: "10%", range: "5-20%" },
    ],
    sharpe: 1.0,
    drawdown: -0.25,
    capacity: "High",
    papers: ["moskowitz-2012"],
  },
  {
    slug: "value-hml",
    name: "价值 (HML)",
    nameEn: "Value (Book-to-Market)",
    category: "Value",
    assetClass: ["Equity"],
    oneLiner: "做多高 B/M、做空低 B/M",
    edge: "Fama-French 三因子中的 HML,跨国稳健但近 10 年承压。",
    parameters: [
      { name: "Sort", default: "B/M Quintile", range: "Tercile-Decile" },
      { name: "Rebalance", default: "Annual", range: "M-A" },
    ],
    sharpe: 0.4,
    drawdown: -0.55,
    capacity: "High",
    papers: ["fama-1992", "asness-2013"],
  },
  {
    slug: "carry-fx",
    name: "外汇 Carry",
    nameEn: "FX Carry Trade",
    category: "Carry",
    assetClass: ["FX"],
    oneLiner: "借低息货币、买高息货币",
    edge: "违反 UIP 的最稳定异象,但崩溃风险显著(2008、2015 瑞郎)。",
    parameters: [
      { name: "Universe", default: "G10", range: "G10-EM" },
      { name: "Rebalance", default: "Monthly", range: "W-M" },
    ],
    sharpe: 0.55,
    drawdown: -0.30,
    capacity: "High",
    papers: ["lustig-2007", "menkhoff-2012"],
  },
  {
    slug: "variance-risk-premium",
    name: "方差风险溢价",
    nameEn: "Variance Risk Premium (VRP)",
    category: "Volatility",
    assetClass: ["Equity"],
    oneLiner: "卖隐含波动率、买已实现波动率",
    edge: "IV 长期高于 RV ~3-4 vol pts,短 VIX 期货/卖 straddle 收割 carry。",
    parameters: [
      { name: "Tenor", default: "30D", range: "7-90D" },
      { name: "Delta-Hedge", default: "Daily", range: "D-W" },
    ],
    sharpe: 0.9,
    drawdown: -0.50,
    capacity: "Medium",
    papers: ["bollerslev-2009", "carr-2009"],
    toolHash: "#mc-pricer",
  },
  {
    slug: "low-vol-anomaly",
    name: "低波异象",
    nameEn: "Low-Volatility Anomaly",
    category: "Volatility",
    assetClass: ["Equity"],
    oneLiner: "做多低 β / 低波股票,空高 β",
    edge: "BAB 因子—风险调整后高波股票回报反而更低,Frazzini-Pedersen 解释为杠杆约束。",
    parameters: [
      { name: "Risk-Metric", default: "Beta", range: "Beta/Vol/Idio" },
      { name: "Rebalance", default: "Monthly", range: "M-Q" },
    ],
    sharpe: 0.7,
    drawdown: -0.20,
    capacity: "High",
    papers: ["frazzini-2014"],
  },
  {
    slug: "quality-qmj",
    name: "质量因子 (QMJ)",
    nameEn: "Quality Minus Junk",
    category: "Quality",
    assetClass: ["Equity"],
    oneLiner: "做多盈利稳定、成长、安全、派息高的股票",
    edge: "AQR 提出—多维质量打分长期跑赢、且与 Value 负相关,适合搭配。",
    parameters: [
      { name: "Components", default: "Profit+Growth+Safe", range: "1-4" },
      { name: "Rebalance", default: "Quarterly", range: "M-A" },
    ],
    sharpe: 0.6,
    drawdown: -0.25,
    capacity: "High",
    papers: ["asness-quality-2019"],
  },
  {
    slug: "post-earnings-drift",
    name: "盈余公告漂移",
    nameEn: "Post-Earnings Announcement Drift",
    category: "Momentum",
    assetClass: ["Equity"],
    oneLiner: "买正向 SUE 公告股、卖负向",
    edge: "Ball-Brown 1968 起持续存在的 60 天后市漂移,机构注意力分散是主因。",
    parameters: [
      { name: "Sort", default: "SUE Decile", range: "Quintile-Decile" },
      { name: "Holding", default: "60D", range: "20-90D" },
    ],
    sharpe: 0.8,
    drawdown: -0.18,
    capacity: "Medium",
    papers: ["bernard-1989"],
  },
  {
    slug: "pairs-trading",
    name: "配对交易",
    nameEn: "Pairs Trading (Cointegration)",
    category: "Mean-Reversion",
    assetClass: ["Equity"],
    oneLiner: "做多便宜腿、做空贵腿,等价差回归",
    edge: "Gatev-Goetzmann-Rouwenhorst 距离法 5-10% 年化,2003 后衰减但仍是教学经典。",
    parameters: [
      { name: "Formation", default: "12M", range: "6-24M" },
      { name: "Entry", default: "2σ", range: "1-3σ" },
      { name: "Stop", default: "4σ", range: "3-6σ" },
    ],
    sharpe: 0.5,
    drawdown: -0.15,
    capacity: "Low",
    papers: ["gatev-2006"],
    toolHash: "#econometrics",
  },
  {
    slug: "risk-parity",
    name: "风险平价",
    nameEn: "Risk Parity",
    category: "Risk-Allocation",
    assetClass: ["Cross-Asset"],
    oneLiner: "等风险贡献分配资本,杠杆至目标波动",
    edge: "Bridgewater All Weather 框架,长期 Sharpe 0.6-0.8、对利率敏感。",
    parameters: [
      { name: "Vol-Target", default: "10%", range: "5-15%" },
      { name: "Lookback", default: "63D", range: "21-252D" },
    ],
    sharpe: 0.75,
    drawdown: -0.22,
    capacity: "High",
    papers: ["maillard-2010"],
    toolHash: "#frontier",
  },
  {
    slug: "hrp-portfolio",
    name: "层次风险平价",
    nameEn: "Hierarchical Risk Parity (HRP)",
    category: "Risk-Allocation",
    assetClass: ["Cross-Asset"],
    oneLiner: "用聚类替代协方差求逆,稳健于 MVO",
    edge: "López de Prado 2016—无需估计协方差逆矩阵,小样本下显著优于 Markowitz。",
    parameters: [
      { name: "Linkage", default: "Single", range: "Single/Ward" },
      { name: "Lookback", default: "252D", range: "126-756D" },
    ],
    sharpe: 0.85,
    drawdown: -0.18,
    capacity: "High",
    papers: ["lopez-prado-2016"],
    toolHash: "#frontier",
  },
  {
    slug: "short-term-reversal",
    name: "短期反转",
    nameEn: "Short-Term Reversal",
    category: "Mean-Reversion",
    assetClass: ["Equity"],
    oneLiner: "买上周输家、卖上周赢家,持有 1 周",
    edge: "Jegadeesh 1990—1 周-1 月反转源于流动性供给溢价,扣费后边际可行。",
    parameters: [
      { name: "Lookback", default: "5D", range: "1-21D" },
      { name: "Holding", default: "5D", range: "1-21D" },
    ],
    sharpe: 0.6,
    drawdown: -0.25,
    capacity: "Low",
    papers: ["jegadeesh-1990"],
  },
];

export const STRATEGY_CATEGORIES: StrategyCategory[] = [
  "Momentum",
  "Value",
  "Carry",
  "Volatility",
  "Mean-Reversion",
  "Quality",
  "Risk-Allocation",
];