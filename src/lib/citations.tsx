import { ReactNode } from "react";
import { ExternalLink, BookOpen } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export interface Citation {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal?: string;
  doi?: string;
  url?: string;
  note?: string;
}

/* ──────────── Reference library ──────────── */
export const REFS: Record<string, Citation> = {
  bs73: {
    id: "bs73", authors: "Black, F. & Scholes, M.", year: 1973,
    title: "The Pricing of Options and Corporate Liabilities",
    journal: "Journal of Political Economy 81(3), 637–654",
    doi: "10.1086/260062",
    note: "BS 公式起源 — 推导无套利偏微分方程并给出欧式期权解析解",
  },
  merton73: {
    id: "merton73", authors: "Merton, R. C.", year: 1973,
    title: "Theory of Rational Option Pricing",
    journal: "Bell Journal of Economics and Management Science 4(1), 141–183",
    doi: "10.2307/3003143",
    note: "美式认购无早行使定理；BS 框架的扩展",
  },
  merton74: {
    id: "merton74", authors: "Merton, R. C.", year: 1974,
    title: "On the Pricing of Corporate Debt: The Risk Structure of Interest Rates",
    journal: "Journal of Finance 29(2), 449–470",
    doi: "10.1111/j.1540-6261.1974.tb03058.x",
    note: "结构化信用风险模型奠基 — 股权 = call on assets",
  },
  vasicek77: {
    id: "vasicek77", authors: "Vasicek, O.", year: 1977,
    title: "An Equilibrium Characterization of the Term Structure",
    journal: "Journal of Financial Economics 5(2), 177–188",
    doi: "10.1016/0304-405X(77)90016-2",
  },
  cir85: {
    id: "cir85", authors: "Cox, J. C., Ingersoll, J. E. & Ross, S. A.", year: 1985,
    title: "A Theory of the Term Structure of Interest Rates",
    journal: "Econometrica 53(2), 385–407",
    doi: "10.2307/1911242",
  },
  black76: {
    id: "black76", authors: "Black, F.", year: 1976,
    title: "The Pricing of Commodity Contracts",
    journal: "Journal of Financial Economics 3(1–2), 167–179",
    doi: "10.1016/0304-405X(76)90024-6",
    note: "Cap/Floor/Swaption 业界标准定价框架",
  },
  markowitz52: {
    id: "markowitz52", authors: "Markowitz, H.", year: 1952,
    title: "Portfolio Selection",
    journal: "Journal of Finance 7(1), 77–91",
    doi: "10.1111/j.1540-6261.1952.tb01525.x",
    note: "现代投资组合理论起源 — 均值-方差有效前沿",
  },
  sharpe64: {
    id: "sharpe64", authors: "Sharpe, W. F.", year: 1964,
    title: "Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk",
    journal: "Journal of Finance 19(3), 425–442",
    doi: "10.1111/j.1540-6261.1964.tb02865.x",
  },
  bl92: {
    id: "bl92", authors: "Black, F. & Litterman, R.", year: 1992,
    title: "Global Portfolio Optimization",
    journal: "Financial Analysts Journal 48(5), 28–43",
    doi: "10.2469/faj.v48.n5.28",
    note: "贝叶斯组合构建 — 隐含均衡 + 投资观点融合",
  },
  ff15: {
    id: "ff15", authors: "Fama, E. F. & French, K. R.", year: 2015,
    title: "A Five-Factor Asset Pricing Model",
    journal: "Journal of Financial Economics 116(1), 1–22",
    doi: "10.1016/j.jfineco.2014.10.010",
    note: "在三因子基础上加入 RMW (盈利) 和 CMA (投资)",
  },
  longstaff01: {
    id: "longstaff01", authors: "Longstaff, F. A. & Schwartz, E. S.", year: 2001,
    title: "Valuing American Options by Simulation: A Simple Least-Squares Approach",
    journal: "Review of Financial Studies 14(1), 113–147",
    doi: "10.1093/rfs/14.1.113",
    note: "LSM 算法 — 最小二乘蒙特卡罗解决早行使决策",
  },
  gatheral04: {
    id: "gatheral04", authors: "Gatheral, J.", year: 2004,
    title: "A Parsimonious Arbitrage-Free Implied Volatility Parameterization",
    journal: "Presentation at Global Derivatives & Risk Management",
    url: "https://faculty.baruch.cuny.edu/jgatheral/madrid2004.pdf",
    note: "SVI 模型 — 业界事实标准的波动率曲面参数化",
  },
  engle82: {
    id: "engle82", authors: "Engle, R. F.", year: 1982,
    title: "Autoregressive Conditional Heteroscedasticity with Estimates of the Variance of UK Inflation",
    journal: "Econometrica 50(4), 987–1007",
    doi: "10.2307/1912773",
    note: "ARCH 模型 — 2003 年诺贝尔经济学奖",
  },
  bollerslev86: {
    id: "bollerslev86", authors: "Bollerslev, T.", year: 1986,
    title: "Generalized Autoregressive Conditional Heteroskedasticity",
    journal: "Journal of Econometrics 31(3), 307–327",
    doi: "10.1016/0304-4076(86)90063-1",
  },
  nelson91: {
    id: "nelson91", authors: "Nelson, D. B.", year: 1991,
    title: "Conditional Heteroskedasticity in Asset Returns: A New Approach",
    journal: "Econometrica 59(2), 347–370",
    doi: "10.2307/2938260",
    note: "EGARCH — 捕捉杠杆效应（不对称波动）",
  },
  engle87: {
    id: "engle87", authors: "Engle, R. F. & Granger, C. W. J.", year: 1987,
    title: "Co-integration and Error Correction: Representation, Estimation, and Testing",
    journal: "Econometrica 55(2), 251–276",
    doi: "10.2307/1913236",
    note: "协整与误差修正模型 — 2003 年诺贝尔经济学奖",
  },
  granger69: {
    id: "granger69", authors: "Granger, C. W. J.", year: 1969,
    title: "Investigating Causal Relations by Econometric Models and Cross-spectral Methods",
    journal: "Econometrica 37(3), 424–438",
    doi: "10.2307/1912791",
  },
  kalman60: {
    id: "kalman60", authors: "Kalman, R. E.", year: 1960,
    title: "A New Approach to Linear Filtering and Prediction Problems",
    journal: "Journal of Basic Engineering 82(1), 35–45",
    doi: "10.1115/1.3662552",
  },
  hp97: {
    id: "hp97", authors: "Hodrick, R. J. & Prescott, E. C.", year: 1997,
    title: "Postwar U.S. Business Cycles: An Empirical Investigation",
    journal: "Journal of Money, Credit and Banking 29(1), 1–16",
    doi: "10.2307/2953682",
  },
  sims80: {
    id: "sims80", authors: "Sims, C. A.", year: 1980,
    title: "Macroeconomics and Reality",
    journal: "Econometrica 48(1), 1–48",
    doi: "10.2307/1912017",
    note: "VAR / SVAR 创立 — 2011 年诺贝尔经济学奖",
  },
  hansen82: {
    id: "hansen82", authors: "Hansen, L. P.", year: 1982,
    title: "Large Sample Properties of Generalized Method of Moments Estimators",
    journal: "Econometrica 50(4), 1029–1054",
    doi: "10.2307/1912775",
    note: "GMM — 2013 年诺贝尔经济学奖",
  },
  sklar59: {
    id: "sklar59", authors: "Sklar, A.", year: 1959,
    title: "Fonctions de répartition à n dimensions et leurs marges",
    journal: "Publications de l'Institut Statistique de l'Université de Paris 8, 229–231",
    note: "Copula 理论奠基 — 边际与相依结构的解耦定理",
  },
  basel19: {
    id: "basel19", authors: "Basel Committee on Banking Supervision", year: 2019,
    title: "Minimum Capital Requirements for Market Risk (FRTB)",
    journal: "BIS Standards",
    url: "https://www.bis.org/bcbs/publ/d457.htm",
    note: "压力测试与资本要求的国际监管标准",
  },
};

/* ──────────── <Cite> component ──────────── */
export const Cite = ({ id, label, children }: { id: string; label?: string; children?: ReactNode }) => {
  const r = REFS[id];
  if (!r) return <span className="text-muted-foreground">[?{id}]</span>;
  const url = r.doi ? `https://doi.org/${r.doi}` : r.url;
  const display = children ?? label ?? `${r.authors.split(",")[0].split(" ")[0].replace("&", "")} (${r.year})`;
  return (
    <HoverCard openDelay={150} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 px-1 py-0 -my-0.5 rounded text-gold underline decoration-dotted decoration-gold/60 underline-offset-2 hover:bg-gold/10 hover:decoration-solid transition-colors text-[0.95em] cursor-help"
        >
          <BookOpen className="w-3 h-3 opacity-70" />
          <span>{display}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-[360px] p-4 border-gold/30 bg-card shadow-xl"
      >
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">Reference</p>
          <p className="text-sm font-semibold text-foreground leading-snug">{r.title}</p>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            {r.authors} ({r.year})
            {r.journal && <><br />{r.journal}</>}
          </p>
          {r.note && (
            <p className="text-[11px] text-secondary-foreground bg-secondary/40 border border-border rounded p-2 leading-relaxed">
              {r.note}
            </p>
          )}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-gold hover:text-gold/80 transition-colors">
              <ExternalLink className="w-3 h-3" />
              {r.doi ? `DOI: ${r.doi}` : "原文链接"}
            </a>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
