/**
 * Notebook template gallery. Each template is a curated, public starter
 * notebook users can Fork (signed-in) or preview (cells are loaded into
 * the editor locally if not signed in).
 *
 * Cell IDs are stable strings here; the editor re-uses them.
 */
export type TemplateCell =
  | { id: string; kind: "markdown"; text: string }
  | { id: string; kind: "param"; name: string; value: number; min: number; max: number; step: number }
  | { id: string; kind: "formula"; latex: string; expression: string }
  | { id: string; kind: "chart"; xVar: string; xMin: number; xMax: number; n: number; expression: string };

export type TemplateCategory = "Options" | "Risk" | "Fixed Income" | "Portfolio" | "Macro" | "Econometrics";

export interface NotebookTemplate {
  slug: string;
  title: string;
  tagline: string;
  category: TemplateCategory;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  citation: string;
  cells: TemplateCell[];
}

/* helper: short id */
const _id = (s: string) => s;

export const NOTEBOOK_TEMPLATES: NotebookTemplate[] = [
  {
    slug: "black-scholes",
    title: "Black-Scholes 期权定价",
    tagline: "欧式 Call / Put 闭式解,Vega 与 IV 直觉。",
    category: "Options",
    difficulty: "Beginner",
    citation: "Black & Scholes (1973)",
    cells: [
      { id: _id("bs-md"), kind: "markdown", text: "# Black-Scholes 期权定价\n\n经典 1973 年闭式解,假设股价服从几何布朗运动、波动率与无风险利率为常数。\n\n滑动 `sigma` 观察期权价格的凸性。" },
      { id: _id("bs-S"),     kind: "param", name: "S",     value: 100, min: 50,   max: 200, step: 1 },
      { id: _id("bs-K"),     kind: "param", name: "K",     value: 100, min: 50,   max: 200, step: 1 },
      { id: _id("bs-T"),     kind: "param", name: "T",     value: 1,   min: 0.05, max: 3,   step: 0.05 },
      { id: _id("bs-sigma"), kind: "param", name: "sigma", value: 0.2, min: 0.05, max: 1,   step: 0.01 },
      { id: _id("bs-r"),     kind: "param", name: "r",     value: 0.05, min: 0,   max: 0.2, step: 0.005 },
      { id: _id("bs-fc"), kind: "formula", latex: "C = S\\,N(d_1) - Ke^{-rT}N(d_2)", expression: "bsCall(p.S,p.K,p.T,p.r,p.sigma)" },
      { id: _id("bs-fp"), kind: "formula", latex: "P = Ke^{-rT}N(-d_2) - S\\,N(-d_1)", expression: "bsPut(p.S,p.K,p.T,p.r,p.sigma)" },
      { id: _id("bs-ch"), kind: "chart", xVar: "S", xMin: 50, xMax: 200, n: 80, expression: "bsCall(x,p.K,p.T,p.r,p.sigma)" },
    ],
  },
  {
    slug: "capm",
    title: "CAPM 资本资产定价",
    tagline: "Beta、风险溢价与证券市场线 (SML)。",
    category: "Portfolio",
    difficulty: "Beginner",
    citation: "Sharpe (1964), Lintner (1965)",
    cells: [
      { id: _id("capm-md"), kind: "markdown", text: "# CAPM\n\n$$E(R_i)=R_f+\\beta_i\\,(E(R_m)-R_f)$$\n\n移动 `beta` 看证券市场线 (SML) 上的期望收益。" },
      { id: _id("capm-Rf"),   kind: "param", name: "Rf",   value: 0.04, min: 0,    max: 0.1,  step: 0.005 },
      { id: _id("capm-ERm"),  kind: "param", name: "ERm",  value: 0.09, min: 0.02, max: 0.2,  step: 0.005 },
      { id: _id("capm-beta"), kind: "param", name: "beta", value: 1.0,  min: -1,   max: 3,    step: 0.05 },
      { id: _id("capm-f"), kind: "formula", latex: "E(R_i)=R_f+\\beta_i(E(R_m)-R_f)", expression: "p.Rf + p.beta*(p.ERm - p.Rf)" },
      { id: _id("capm-ch"), kind: "chart", xVar: "beta", xMin: -1, xMax: 3, n: 60, expression: "p.Rf + x*(p.ERm - p.Rf)" },
    ],
  },
  {
    slug: "var-parametric",
    title: "参数法 VaR (Variance-Covariance)",
    tagline: "正态假设下的 1 日 / N 日 VaR 与置信度灵敏度。",
    category: "Risk",
    difficulty: "Intermediate",
    citation: "Jorion (2007), Value at Risk 3e",
    cells: [
      { id: _id("var-md"), kind: "markdown", text: "# 参数法 VaR\n\n$$\\text{VaR}_\\alpha = z_\\alpha\\,\\sigma\\,\\sqrt{h}\\,\\cdot V$$\n\n假设组合收益正态。改变 `alpha` (置信度尾分位)、`h` (持有期天数) 观察 VaR。" },
      { id: _id("var-V"),     kind: "param", name: "V",     value: 1e6,  min: 1e5,  max: 1e7, step: 1e4 },
      { id: _id("var-sigma"), kind: "param", name: "sigma", value: 0.015, min: 0.002, max: 0.05, step: 0.001 },
      { id: _id("var-h"),     kind: "param", name: "h",     value: 1,    min: 1,    max: 60,  step: 1 },
      { id: _id("var-z"),     kind: "param", name: "z",     value: 2.33, min: 1.28, max: 3.5, step: 0.01 },
      { id: _id("var-f"), kind: "formula", latex: "\\text{VaR} = z\\,\\sigma\\,\\sqrt{h}\\,V", expression: "p.z * p.sigma * Math.sqrt(p.h) * p.V" },
      { id: _id("var-ch"), kind: "chart", xVar: "h", xMin: 1, xMax: 60, n: 60, expression: "p.z * p.sigma * Math.sqrt(x) * p.V" },
    ],
  },
  {
    slug: "bond-duration",
    title: "债券久期与凸性",
    tagline: "价格-收益率关系,Macaulay 久期近似。",
    category: "Fixed Income",
    difficulty: "Intermediate",
    citation: "Fabozzi, Fixed Income Analysis",
    cells: [
      { id: _id("bd-md"), kind: "markdown", text: "# 债券久期\n\n零息债券价格 $P = F e^{-yT}$,修正久期等于到期期限 $T$。\n\n改 `y` (YTM) 看价格曲线的凸性。" },
      { id: _id("bd-F"), kind: "param", name: "F", value: 100, min: 50,  max: 1000, step: 10 },
      { id: _id("bd-T"), kind: "param", name: "T", value: 10,  min: 0.5, max: 30,   step: 0.5 },
      { id: _id("bd-y"), kind: "param", name: "y", value: 0.05, min: 0.001, max: 0.2, step: 0.001 },
      { id: _id("bd-fP"), kind: "formula", latex: "P = F\\,e^{-yT}", expression: "p.F * Math.exp(-p.y * p.T)" },
      { id: _id("bd-fD"), kind: "formula", latex: "D_{mod} \\approx T", expression: "p.T" },
      { id: _id("bd-ch"), kind: "chart", xVar: "y", xMin: 0.001, xMax: 0.2, n: 80, expression: "p.F * Math.exp(-x * p.T)" },
    ],
  },
  {
    slug: "merton-jump",
    title: "Merton 跳跃扩散",
    tagline: "在 BSM 上叠加 Poisson 跳跃,捕获肥尾。",
    category: "Options",
    difficulty: "Advanced",
    citation: "Merton (1976)",
    cells: [
      { id: _id("mj-md"), kind: "markdown", text: "# Merton (1976) 跳跃扩散\n\n$$dS/S = (r-\\lambda k)\\,dt + \\sigma\\,dW + (J-1)\\,dN$$\n\n用前 5 阶 Poisson 项近似的级数解。调 `lambda` (跳跃强度)、`muJ`、`sigmaJ` 观察对 ATM call 的影响。" },
      { id: _id("mj-S"),      kind: "param", name: "S",      value: 100, min: 50,  max: 200, step: 1 },
      { id: _id("mj-K"),      kind: "param", name: "K",      value: 100, min: 50,  max: 200, step: 1 },
      { id: _id("mj-T"),      kind: "param", name: "T",      value: 1,   min: 0.1, max: 2,   step: 0.05 },
      { id: _id("mj-sigma"),  kind: "param", name: "sigma",  value: 0.2, min: 0.05, max: 0.6, step: 0.01 },
      { id: _id("mj-r"),      kind: "param", name: "r",      value: 0.05, min: 0,   max: 0.15, step: 0.005 },
      { id: _id("mj-lambda"), kind: "param", name: "lambda", value: 0.5, min: 0,    max: 3,   step: 0.05 },
      { id: _id("mj-muJ"),    kind: "param", name: "muJ",    value: -0.1, min: -0.5, max: 0.3, step: 0.01 },
      { id: _id("mj-sigJ"),   kind: "param", name: "sigmaJ", value: 0.15, min: 0.01, max: 0.5, step: 0.01 },
      {
        id: _id("mj-f"),
        kind: "formula",
        latex: "C_{Merton} = \\sum_{n=0}^{\\infty} \\frac{e^{-\\lambda' T}(\\lambda' T)^n}{n!} C_{BSM}(\\sigma_n,r_n)",
        expression: "(function(){const k=Math.exp(p.muJ+0.5*p.sigmaJ*p.sigmaJ)-1; const lp=p.lambda*(1+k); let s=0; let fact=1; for(let n=0;n<10;n++){ if(n>0) fact*=n; const sn=Math.sqrt(p.sigma*p.sigma + n*p.sigmaJ*p.sigmaJ/p.T); const rn=p.r - p.lambda*k + n*Math.log(1+k)/p.T; s += Math.exp(-lp*p.T)*Math.pow(lp*p.T,n)/fact * bsCall(p.S,p.K,p.T,rn,sn);} return s;})()",
      },
      { id: _id("mj-ch"), kind: "chart", xVar: "K", xMin: 60, xMax: 160, n: 50, expression: "bsCall(p.S,x,p.T,p.r,p.sigma)" },
    ],
  },
  {
    slug: "garch-vol",
    title: "GARCH(1,1) 波动率聚集",
    tagline: "ω + α·ε² + β·σ² 的递推与长期均值。",
    category: "Econometrics",
    difficulty: "Intermediate",
    citation: "Bollerslev (1986)",
    cells: [
      { id: _id("g-md"), kind: "markdown", text: "# GARCH(1,1)\n\n$$\\sigma_t^2 = \\omega + \\alpha\\,\\varepsilon_{t-1}^2 + \\beta\\,\\sigma_{t-1}^2$$\n\n长期方差 $\\sigma_\\infty^2 = \\omega / (1-\\alpha-\\beta)$。" },
      { id: _id("g-omega"), kind: "param", name: "omega", value: 1e-5, min: 1e-6, max: 5e-4, step: 1e-6 },
      { id: _id("g-alpha"), kind: "param", name: "alpha", value: 0.08, min: 0.01,  max: 0.3,  step: 0.005 },
      { id: _id("g-beta"),  kind: "param", name: "beta",  value: 0.9,  min: 0.5,   max: 0.99, step: 0.005 },
      { id: _id("g-f"), kind: "formula", latex: "\\sigma_\\infty = \\sqrt{\\omega/(1-\\alpha-\\beta)}", expression: "Math.sqrt(p.omega/Math.max(1e-9, 1 - p.alpha - p.beta))" },
      { id: _id("g-ch"), kind: "chart", xVar: "t", xMin: 1, xMax: 250, n: 80, expression: "Math.sqrt(p.omega/Math.max(1e-9, 1 - p.alpha - p.beta)) * (1 + 0.3*Math.sin(x/12))" },
    ],
  },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Options", "Risk", "Fixed Income", "Portfolio", "Macro", "Econometrics",
];