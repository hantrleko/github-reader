/** External research destinations that don't have public APIs — we link out
 *  with ticker-aware deep links so the user can jump between sites quickly. */
export type Workbench = {
  id: string;
  name: string;
  host: string;
  desc: string;
  tags: string[];
  /** Function that returns URL for given ticker (may ignore ticker). */
  link: (ticker: string) => string;
};

export const WORKBENCHES: Workbench[] = [
  {
    id: "stockanalysis",
    name: "StockAnalysis",
    host: "stockanalysis.com",
    desc: "财报、估值与筛选器齐全，适合快速做基本面初筛。",
    tags: ["基本面", "财报", "筛选"],
    link: (t) => `https://stockanalysis.com/stocks/${t.toLowerCase()}/financials/`,
  },
  {
    id: "finviz",
    name: "Finviz",
    host: "finviz.com",
    desc: "热力图 + 板块强弱 + 技术形态，一眼看市场温度。",
    tags: ["扫盘", "热力图", "技术"],
    link: (t) => `https://finviz.com/quote.ashx?t=${t.toUpperCase()}`,
  },
  {
    id: "koyfin",
    name: "Koyfin",
    host: "koyfin.com",
    desc: "系统分析和横向对比强，历史数据、板块与多公司对比。",
    tags: ["宏观", "对比", "机构级"],
    link: (t) => `https://app.koyfin.com/share/security/${t.toUpperCase()}-US`,
  },
  {
    id: "seekingalpha",
    name: "Seeking Alpha",
    host: "seekingalpha.com",
    desc: "多空观点、财报拆解，需要自己过滤信息噪声。",
    tags: ["多空", "观点", "财报"],
    link: (t) => `https://seekingalpha.com/symbol/${t.toUpperCase()}`,
  },
  {
    id: "companiesmarketcap",
    name: "CompaniesMarketCap",
    host: "companiesmarketcap.com",
    desc: "看市值、营收、利润排名，判断行业地位很直观。",
    tags: ["排行", "横向对比"],
    link: () => "https://companiesmarketcap.com/",
  },
  {
    id: "tradingeconomics",
    name: "Trading Economics",
    host: "tradingeconomics.com",
    desc: "CPI、非农、GDP、利率决议，经济日历一目了然。",
    tags: ["日历", "宏观", "官方"],
    link: () => "https://tradingeconomics.com/calendar",
  },
  {
    id: "cboe",
    name: "Cboe",
    host: "cboe.com",
    desc: "VIX、Put/Call、期权链，衡量市场情绪的官方源头。",
    tags: ["情绪", "波动率", "期权"],
    link: () => "https://www.cboe.com/us/options/market_statistics/",
  },
  {
    id: "etfdb",
    name: "ETF Database",
    host: "etfdb.com",
    desc: "费率、规模、收益、资金流，ETF 对比首选。",
    tags: ["ETF", "费率", "对比"],
    link: (t) => `https://etfdb.com/etf/${t.toUpperCase()}/`,
  },
  {
    id: "quiverquant",
    name: "Quiver Quantitative",
    host: "quiverquant.com",
    desc: "散户热度、议员交易、内部人动向等另类数据。",
    tags: ["另类数据", "议员", "散户"],
    link: (t) => `https://www.quiverquant.com/stock/${t.toUpperCase()}`,
  },
  {
    id: "fred",
    name: "FRED",
    host: "fred.stlouisfed.org",
    desc: "利率、通胀、就业、M2，宏观数据宝库。",
    tags: ["宏观", "官方", "美联储"],
    link: () => "https://fred.stlouisfed.org/",
  },
];