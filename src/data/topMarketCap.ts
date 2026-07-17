/** Static Top-50 global companies by market cap (approx snapshot, Q3 2026).
 *  Refreshed manually each quarter — this is a seed for UX, not a live feed. */
export type TopCoRow = {
  rank: number;
  ticker: string;
  name: string;
  country: string;
  sector: string;
  marketCapB: number; // USD, billions
};

export const TOP_MARKET_CAP: TopCoRow[] = [
  { rank: 1, ticker: "NVDA", name: "NVIDIA", country: "US", sector: "Semiconductors", marketCapB: 4200 },
  { rank: 2, ticker: "AAPL", name: "Apple", country: "US", sector: "Consumer Electronics", marketCapB: 3600 },
  { rank: 3, ticker: "MSFT", name: "Microsoft", country: "US", sector: "Software", marketCapB: 3500 },
  { rank: 4, ticker: "GOOGL", name: "Alphabet", country: "US", sector: "Internet", marketCapB: 2450 },
  { rank: 5, ticker: "AMZN", name: "Amazon", country: "US", sector: "E-commerce", marketCapB: 2400 },
  { rank: 6, ticker: "META", name: "Meta Platforms", country: "US", sector: "Internet", marketCapB: 1750 },
  { rank: 7, ticker: "2222.SR", name: "Saudi Aramco", country: "SA", sector: "Oil & Gas", marketCapB: 1650 },
  { rank: 8, ticker: "AVGO", name: "Broadcom", country: "US", sector: "Semiconductors", marketCapB: 1400 },
  { rank: 9, ticker: "TSLA", name: "Tesla", country: "US", sector: "Autos", marketCapB: 1250 },
  { rank: 10, ticker: "BRK.B", name: "Berkshire Hathaway", country: "US", sector: "Conglomerate", marketCapB: 1050 },
  { rank: 11, ticker: "TSM", name: "TSMC", country: "TW", sector: "Semiconductors", marketCapB: 990 },
  { rank: 12, ticker: "WMT", name: "Walmart", country: "US", sector: "Retail", marketCapB: 810 },
  { rank: 13, ticker: "LLY", name: "Eli Lilly", country: "US", sector: "Pharma", marketCapB: 760 },
  { rank: 14, ticker: "JPM", name: "JPMorgan Chase", country: "US", sector: "Banks", marketCapB: 720 },
  { rank: 15, ticker: "V", name: "Visa", country: "US", sector: "Payments", marketCapB: 680 },
  { rank: 16, ticker: "XOM", name: "ExxonMobil", country: "US", sector: "Oil & Gas", marketCapB: 640 },
  { rank: 17, ticker: "MA", name: "Mastercard", country: "US", sector: "Payments", marketCapB: 540 },
  { rank: 18, ticker: "ORCL", name: "Oracle", country: "US", sector: "Software", marketCapB: 520 },
  { rank: 19, ticker: "NVO", name: "Novo Nordisk", country: "DK", sector: "Pharma", marketCapB: 500 },
  { rank: 20, ticker: "COST", name: "Costco", country: "US", sector: "Retail", marketCapB: 480 },
  { rank: 21, ticker: "PG", name: "Procter & Gamble", country: "US", sector: "Consumer", marketCapB: 460 },
  { rank: 22, ticker: "JNJ", name: "Johnson & Johnson", country: "US", sector: "Pharma", marketCapB: 440 },
  { rank: 23, ticker: "HD", name: "Home Depot", country: "US", sector: "Retail", marketCapB: 400 },
  { rank: 24, ticker: "NFLX", name: "Netflix", country: "US", sector: "Streaming", marketCapB: 390 },
  { rank: 25, ticker: "BAC", name: "Bank of America", country: "US", sector: "Banks", marketCapB: 360 },
  { rank: 26, ticker: "005930.KS", name: "Samsung Electronics", country: "KR", sector: "Electronics", marketCapB: 355 },
  { rank: 27, ticker: "9988.HK", name: "Alibaba", country: "CN", sector: "E-commerce", marketCapB: 350 },
  { rank: 28, ticker: "CVX", name: "Chevron", country: "US", sector: "Oil & Gas", marketCapB: 320 },
  { rank: 29, ticker: "ABBV", name: "AbbVie", country: "US", sector: "Pharma", marketCapB: 315 },
  { rank: 30, ticker: "KO", name: "Coca-Cola", country: "US", sector: "Beverages", marketCapB: 300 },
  { rank: 31, ticker: "MC.PA", name: "LVMH", country: "FR", sector: "Luxury", marketCapB: 295 },
  { rank: 32, ticker: "ASML", name: "ASML", country: "NL", sector: "Semiconductors", marketCapB: 290 },
  { rank: 33, ticker: "AMD", name: "AMD", country: "US", sector: "Semiconductors", marketCapB: 280 },
  { rank: 34, ticker: "PEP", name: "PepsiCo", country: "US", sector: "Beverages", marketCapB: 265 },
  { rank: 35, ticker: "MRK", name: "Merck", country: "US", sector: "Pharma", marketCapB: 260 },
  { rank: 36, ticker: "CRM", name: "Salesforce", country: "US", sector: "Software", marketCapB: 255 },
  { rank: 37, ticker: "TM", name: "Toyota Motor", country: "JP", sector: "Autos", marketCapB: 245 },
  { rank: 38, ticker: "TMO", name: "Thermo Fisher", country: "US", sector: "Life Sciences", marketCapB: 230 },
  { rank: 39, ticker: "ADBE", name: "Adobe", country: "US", sector: "Software", marketCapB: 225 },
  { rank: 40, ticker: "ACN", name: "Accenture", country: "IE", sector: "IT Services", marketCapB: 220 },
  { rank: 41, ticker: "LIN", name: "Linde", country: "GB", sector: "Chemicals", marketCapB: 215 },
  { rank: 42, ticker: "CSCO", name: "Cisco", country: "US", sector: "Networking", marketCapB: 210 },
  { rank: 43, ticker: "DIS", name: "Walt Disney", country: "US", sector: "Media", marketCapB: 205 },
  { rank: 44, ticker: "MCD", name: "McDonald's", country: "US", sector: "Restaurants", marketCapB: 200 },
  { rank: 45, ticker: "WFC", name: "Wells Fargo", country: "US", sector: "Banks", marketCapB: 195 },
  { rank: 46, ticker: "SHEL", name: "Shell", country: "GB", sector: "Oil & Gas", marketCapB: 190 },
  { rank: 47, ticker: "ABT", name: "Abbott Laboratories", country: "US", sector: "Medical Devices", marketCapB: 185 },
  { rank: 48, ticker: "SAP", name: "SAP", country: "DE", sector: "Software", marketCapB: 180 },
  { rank: 49, ticker: "IBM", name: "IBM", country: "US", sector: "IT Services", marketCapB: 175 },
  { rank: 50, ticker: "GE", name: "GE Aerospace", country: "US", sector: "Industrials", marketCapB: 170 },
];