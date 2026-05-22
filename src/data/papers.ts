/**
 * Searchable academic paper index. Linked from /strategies and from each
 * calculator's CitationFooter. Keep deliberately concise — one-sentence
 * contribution + DOI/URL is more useful than long abstracts.
 */
export type PaperTopic =
  | "Asset Pricing"
  | "Derivatives"
  | "Volatility"
  | "Fixed Income"
  | "Risk"
  | "Portfolio"
  | "Econometrics"
  | "Behavioral"
  | "Microstructure";

export type Paper = {
  slug: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  topics: PaperTopic[];
  contribution: string;   // one-line "why it matters"
  doi?: string;
  url?: string;
  bibtex?: string;
};

export const PAPERS: Paper[] = [
  {
    slug: "black-scholes-1973",
    title: "The Pricing of Options and Corporate Liabilities",
    authors: "Black, F. & Scholes, M.",
    year: 1973,
    journal: "Journal of Political Economy",
    topics: ["Derivatives"],
    contribution: "闭式期权定价公式,奠定现代衍生品理论基础。",
    doi: "10.1086/260062",
  },
  {
    slug: "merton-1973",
    title: "Theory of Rational Option Pricing",
    authors: "Merton, R. C.",
    year: 1973,
    journal: "Bell Journal of Economics",
    topics: ["Derivatives"],
    contribution: "把 BS 推广到连续派息、随机利率与美式期权。",
    doi: "10.2307/3003143",
  },
  {
    slug: "heston-1993",
    title: "A Closed-Form Solution for Options with Stochastic Volatility",
    authors: "Heston, S. L.",
    year: 1993,
    journal: "Review of Financial Studies",
    topics: ["Derivatives", "Volatility"],
    contribution: "随机波动率半解析期权定价,业界标准 SV 模型。",
    doi: "10.1093/rfs/6.2.327",
  },
  {
    slug: "hagan-2002",
    title: "Managing Smile Risk (SABR)",
    authors: "Hagan, Kumar, Lesniewski, Woodward",
    year: 2002,
    journal: "Wilmott Magazine",
    topics: ["Derivatives", "Volatility"],
    contribution: "SABR 模型 + 渐近隐含波动率公式,利率期权曲面拟合标准。",
    url: "https://www.next-finance.net/IMG/pdf/pdf_SABR.pdf",
  },
  {
    slug: "dupire-1994",
    title: "Pricing with a Smile",
    authors: "Dupire, B.",
    year: 1994,
    journal: "Risk",
    topics: ["Derivatives", "Volatility"],
    contribution: "局部波动率模型—从期权价格反推 σ(S,t)。",
  },
  {
    slug: "fama-1992",
    title: "The Cross-Section of Expected Stock Returns",
    authors: "Fama, E. F. & French, K. R.",
    year: 1992,
    journal: "Journal of Finance",
    topics: ["Asset Pricing"],
    contribution: "Size + Value 因子击穿 CAPM,催生多因子模型时代。",
    doi: "10.1111/j.1540-6261.1992.tb04398.x",
  },
  {
    slug: "jegadeesh-1993",
    title: "Returns to Buying Winners and Selling Losers",
    authors: "Jegadeesh, N. & Titman, S.",
    year: 1993,
    journal: "Journal of Finance",
    topics: ["Asset Pricing", "Behavioral"],
    contribution: "动量异象的奠基性文献,3-12 月持有显著超额收益。",
    doi: "10.1111/j.1540-6261.1993.tb04702.x",
  },
  {
    slug: "jegadeesh-1990",
    title: "Evidence of Predictable Behavior of Security Returns",
    authors: "Jegadeesh, N.",
    year: 1990,
    journal: "Journal of Finance",
    topics: ["Asset Pricing", "Microstructure"],
    contribution: "短期(1 周)收益负自相关,流动性供给溢价的早期证据。",
  },
  {
    slug: "moskowitz-2012",
    title: "Time Series Momentum",
    authors: "Moskowitz, T., Ooi, Y. H. & Pedersen, L. H.",
    year: 2012,
    journal: "Journal of Financial Economics",
    topics: ["Asset Pricing"],
    contribution: "58 种期货资产 25 年正 Sharpe,trend-following 的学术化。",
    doi: "10.1016/j.jfineco.2011.11.003",
  },
  {
    slug: "asness-2013",
    title: "Value and Momentum Everywhere",
    authors: "Asness, C. S., Moskowitz, T. & Pedersen, L. H.",
    year: 2013,
    journal: "Journal of Finance",
    topics: ["Asset Pricing"],
    contribution: "跨 8 类市场系统性确认 Value/Momentum,且两者负相关。",
    doi: "10.1111/jofi.12021",
  },
  {
    slug: "lustig-2007",
    title: "The Cross Section of Foreign Currency Risk Premia",
    authors: "Lustig, H. & Verdelhan, A.",
    year: 2007,
    journal: "American Economic Review",
    topics: ["Asset Pricing"],
    contribution: "FX Carry 风险溢价的消费 CAPM 解释。",
  },
  {
    slug: "menkhoff-2012",
    title: "Carry Trades and Global Foreign Exchange Volatility",
    authors: "Menkhoff, Sarno, Schmeling, Schrimpf",
    year: 2012,
    journal: "Journal of Finance",
    topics: ["Asset Pricing", "Volatility"],
    contribution: "全球 FX 波动率是 Carry 收益的定价因子。",
  },
  {
    slug: "bollerslev-2009",
    title: "Expected Stock Returns and Variance Risk Premia",
    authors: "Bollerslev, T., Tauchen, G. & Zhou, H.",
    year: 2009,
    journal: "Review of Financial Studies",
    topics: ["Volatility"],
    contribution: "VRP = IV² − RV² 显著预测短期股权超额收益。",
  },
  {
    slug: "carr-2009",
    title: "Variance Risk Premiums",
    authors: "Carr, P. & Wu, L.",
    year: 2009,
    journal: "Review of Financial Studies",
    topics: ["Volatility", "Derivatives"],
    contribution: "用合成方差互换严格度量 VRP,跨指数显著为负。",
  },
  {
    slug: "frazzini-2014",
    title: "Betting Against Beta",
    authors: "Frazzini, A. & Pedersen, L. H.",
    year: 2014,
    journal: "Journal of Financial Economics",
    topics: ["Asset Pricing"],
    contribution: "BAB 因子—杠杆约束解释低 β 异象,跨 20 国稳健。",
  },
  {
    slug: "asness-quality-2019",
    title: "Quality Minus Junk",
    authors: "Asness, C., Frazzini, A. & Pedersen, L. H.",
    year: 2019,
    journal: "Review of Accounting Studies",
    topics: ["Asset Pricing"],
    contribution: "把 Quality 多维打分系统化,与 Value 互补。",
  },
  {
    slug: "bernard-1989",
    title: "Post-Earnings-Announcement Drift",
    authors: "Bernard, V. L. & Thomas, J. K.",
    year: 1989,
    journal: "Journal of Accounting Research",
    topics: ["Behavioral"],
    contribution: "SUE 排序后 60 天显著漂移,有效市场异象。",
  },
  {
    slug: "gatev-2006",
    title: "Pairs Trading: Performance of a Relative-Value Arbitrage Rule",
    authors: "Gatev, E., Goetzmann, W. N. & Rouwenhorst, K. G.",
    year: 2006,
    journal: "Review of Financial Studies",
    topics: ["Asset Pricing"],
    contribution: "距离法配对交易 1962-2002 年化 11%,后逐步衰减。",
  },
  {
    slug: "maillard-2010",
    title: "The Properties of Equally Weighted Risk Contribution Portfolios",
    authors: "Maillard, S., Roncalli, T. & Teïletche, J.",
    year: 2010,
    journal: "Journal of Portfolio Management",
    topics: ["Portfolio", "Risk"],
    contribution: "ERC/Risk Parity 的严格表述与一阶条件。",
  },
  {
    slug: "lopez-prado-2016",
    title: "Building Diversified Portfolios that Outperform Out-of-Sample",
    authors: "López de Prado, M.",
    year: 2016,
    journal: "Journal of Portfolio Management",
    topics: ["Portfolio"],
    contribution: "HRP 用聚类替代协方差求逆,小样本下显著优于 MVO。",
  },
  {
    slug: "vasicek-1977",
    title: "An Equilibrium Characterization of the Term Structure",
    authors: "Vasicek, O.",
    year: 1977,
    journal: "Journal of Financial Economics",
    topics: ["Fixed Income"],
    contribution: "首个均值回归短利率模型,闭式债券价格。",
  },
  {
    slug: "cir-1985",
    title: "A Theory of the Term Structure of Interest Rates",
    authors: "Cox, J. C., Ingersoll, J. E. & Ross, S. A.",
    year: 1985,
    journal: "Econometrica",
    topics: ["Fixed Income"],
    contribution: "CIR 平方根扩散,确保利率非负。",
  },
  {
    slug: "markowitz-1952",
    title: "Portfolio Selection",
    authors: "Markowitz, H.",
    year: 1952,
    journal: "Journal of Finance",
    topics: ["Portfolio"],
    contribution: "均值-方差框架,现代投资组合理论的起点。",
  },
  {
    slug: "engle-1982",
    title: "Autoregressive Conditional Heteroskedasticity",
    authors: "Engle, R. F.",
    year: 1982,
    journal: "Econometrica",
    topics: ["Econometrics", "Volatility"],
    contribution: "ARCH 模型,2003 年诺奖,GARCH 族的起点。",
  },
  {
    slug: "bollerslev-1986",
    title: "Generalized Autoregressive Conditional Heteroskedasticity",
    authors: "Bollerslev, T.",
    year: 1986,
    journal: "Journal of Econometrics",
    topics: ["Econometrics", "Volatility"],
    contribution: "GARCH(p,q),实证波动率建模事实标准。",
  },
];

export const PAPER_TOPICS: PaperTopic[] = [
  "Asset Pricing",
  "Derivatives",
  "Volatility",
  "Fixed Income",
  "Risk",
  "Portfolio",
  "Econometrics",
  "Behavioral",
  "Microstructure",
];