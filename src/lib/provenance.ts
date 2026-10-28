export type Provenance = "simulated" | "market" | "public" | "essay";

const MARKET = new Set(["backtest", "calibration", "qlib-lab"]);
const PUBLIC = new Set([
  "fred", "worldbank", "ecb-bis", "coingecko", "alphavantage", "cboe-sentiment", "econ-calendar",
  "etf-lookup", "sector-heatmap", "market-cap", "quiver-signals", "external-workbench",
  "ashare-suite", "us-suite", "tv-screener",
]);
const ESSAY = /(-theory|-guide|-equation|ai-quant-strategy|frontier-concepts|^learning$|^quiz$|^platform$)/;

/** Data provenance for a /s/:id section header. */
export function provenanceFor(id: string): Provenance {
  if (MARKET.has(id)) return "market";
  if (PUBLIC.has(id)) return "public";
  if (ESSAY.test(id)) return "essay";
  return "simulated";
}
