/**
 * Topic knowledge network — explicit cross-links from each /topic page to
 * the platform's other content silos (glossary terms, papers, workflows,
 * strategies). Rendered as a "延伸阅读 · Related" rail on TopicDetail so a
 * reader can pivot from theory to definitions, primary sources and
 * executable research chains without going through search.
 *
 * All slugs reference:
 *   glossary  → GLOSSARY[].slug        (src/data/glossary.ts)
 *   papers    → PAPERS[].slug          (src/data/papers.ts)
 *   workflows → WORKFLOWS[].id         (src/data/workflows.ts)
 *   strategies→ STRATEGIES[].slug      (src/data/strategies.ts)
 */

export interface TopicConnections {
  glossary?: string[];
  papers?: string[];
  workflows?: string[];
  strategies?: string[];
}

export const TOPIC_CONNECTIONS: Record<string, TopicConnections> = {
  "asset-pricing": {
    glossary: ["beta", "alpha", "sdf", "factor-model", "sharpe"],
    papers: ["sharpe-1964", "fama-macbeth-1973", "ross-1976", "fama-1992", "fama-french-2015", "hansen-jagannathan-1991", "mehra-prescott-1985"],
    workflows: ["portfolio-build"],
    strategies: ["value-hml", "quality-qmj", "betting-against-beta", "low-vol-anomaly"],
  },
  econometrics: {
    glossary: ["ols", "iv-instr", "did", "gmm", "stationarity"],
    papers: ["hansen-1982", "engle-granger-1987", "sims-1980", "fama-macbeth-1973"],
    workflows: ["causal-inference"],
  },
  "time-series": {
    glossary: ["garch", "rv", "unit-root", "cointegration", "kalman-filter", "var-model"],
    papers: ["engle-1982", "bollerslev-1986", "engle-granger-1987", "sims-1980"],
    workflows: ["vol-research"],
    strategies: ["pairs-trading"],
  },
  portfolio: {
    glossary: ["sharpe", "max-drawdown", "information-ratio", "risk-parity", "factor-model"],
    papers: ["markowitz-1952", "black-litterman-1992", "maillard-2010", "lopez-prado-2016"],
    workflows: ["portfolio-build", "calib-to-portfolio"],
    strategies: ["risk-parity", "hrp-portfolio", "vol-targeting", "trend-carry-combo"],
  },
  derivatives: {
    glossary: ["iv", "greeks", "risk-neutral", "put-call-parity", "vol-smile"],
    papers: ["black-scholes-1973", "merton-1973", "heston-1993", "hagan-2002", "dupire-1994", "carr-2009"],
    workflows: ["option-desk", "vol-research"],
    strategies: ["variance-risk-premium", "index-vol-selling"],
  },
  "risk-management": {
    glossary: ["var", "es", "cva", "dd", "copula", "credit-spread"],
    papers: ["artzner-1999", "merton-1973"],
    workflows: ["credit-chain"],
    strategies: ["vol-targeting"],
  },
  "fixed-income": {
    glossary: ["ytm", "duration", "convexity", "term-structure", "credit-spread"],
    papers: ["vasicek-1977", "cir-1985", "hull-white-1990", "hjm-1992", "nelson-siegel-1987"],
    workflows: ["rates-to-bond"],
    strategies: ["carry-cross-asset"],
  },
  macroeconomics: {
    glossary: ["irf", "taylor", "mpc", "var-model", "solow-residual", "output-gap"],
    papers: ["sims-1980", "hansen-1982"],
    workflows: ["macro-policy-lab"],
  },
  "behavioral-micro": {
    glossary: ["loss-aversion", "pin", "kyle-lambda", "hawkes", "amihud"],
    papers: ["kahneman-tversky-1979", "debondt-thaler-1985", "shleifer-vishny-1997", "barber-odean-2000", "kyle-1985", "glosten-milgrom-1985", "easley-1996", "amihud-2002"],
    strategies: ["cross-sectional-momentum", "short-term-reversal", "post-earnings-drift"],
  },
};
