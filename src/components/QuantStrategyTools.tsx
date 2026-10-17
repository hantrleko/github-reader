import type { TFunction } from "i18next";
import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useToolTab } from "@/lib/useToolTab";

import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { HistoryDrawer } from "@/components/common/HistoryDrawer";
import { BacktestTool, BlackLittermanTool, FamaFrenchTool } from "./quant/Sprint4Tools";
import { RiskParityTool } from "./quant/RiskParityTool";
import { WalkForwardTool } from "./quant/WalkForwardTool";
import { EquationBlock } from "@/components/common/EquationBlock";
import CategorizedToolNav, { type ToolCategory } from "@/components/common/CategorizedToolNav";
import {
  BlackLittermanFullTool, MeanCVaRTool, ShrinkageTool,
  ResampledFrontierTool, FactorBudgetTool, KellyRuinTool,
} from "./quant/V41PortfolioTools";
import {
  FrontierGeometryTool, SingleIndexTool, EstimationErrorTool, RebalanceCostTool,
  ActiveManagementTool, DownsideDominanceTool, DynamicAllocationTool, RegularizationTool,
} from "./quant/V56PortfolioTools";

type ToolId =
  | "backtest" | "walkforward" | "bl" | "rp" | "ff5"
  | "bl-full" | "cvar" | "shrinkage" | "resampled" | "factor-budget" | "kelly"
  | "frontier-geo" | "single-index" | "est-error" | "rebal-cost"
  | "active-ir" | "downside-sd" | "dynamic-alloc" | "regularise";

const getTOOLS = (t: TFunction) => {
const TOOLS: { id: ToolId; name: string; nameEn: string; navEn: string; formula: string; component: React.FC }[] = [
  {
    id: "backtest", name: t("labs.quant.ui.text1", { defaultValue: "策略回测引擎" }), nameEn: "Strategy Backtester — Momentum / Mean-Reversion / Pairs",
    navEn: "Strategy Backtester",
    formula: String.raw`\mathrm{PnL}_t = w_t \cdot r_t - |w_t - w_{t-1}|\cdot c,\qquad \text{Sharpe} = \dfrac{\bar r_p \cdot 252}{\sigma_p \sqrt{252}},\qquad \text{Calmar} = \dfrac{R_{\text{ann}}}{\mathrm{MaxDD}}`,
    component: BacktestTool,
  },
  {
    id: "walkforward", name: t("labs.quant.ui.text2", { defaultValue: "Walk-Forward 样本外检验" }), nameEn: "Walk-Forward Analysis — Rolling Out-of-Sample Validation & Overfitting",
    navEn: "Walk-Forward",
    formula: String.raw`\text{IS: } k^*=\arg\max_k \mathrm{Sharpe}_{\text{train}}(k),\qquad \text{OOS: apply } k^* \text{ on next window},\qquad \text{Gap}=\mathrm{Sharpe}_{\text{IS}}-\mathrm{Sharpe}_{\text{OOS}}`,
    component: WalkForwardTool,
  },
  {
    id: "bl", name: t("labs.quant.ui.text3", { defaultValue: "Black-Litterman 贝叶斯组合" }), nameEn: "Black-Litterman Bayesian Portfolio Construction",
    navEn: "Black-Litterman",
    formula: String.raw`\pi = \delta\,\Sigma\, w_{\text{mkt}},\qquad \tilde\mu = \pi + \tau\Sigma P^{\!\top}\!\bigl(P\,\tau\Sigma\,P^{\!\top}+\Omega\bigr)^{\!-1}\!\bigl(Q - P\pi\bigr)`,
    component: BlackLittermanTool,
  },
  {
    id: "rp", name: "Risk Parity / HRP", nameEn: "Risk Parity (ERC) & Hierarchical Risk Parity — Maillard 2010 / Lopez de Prado 2016",
    navEn: "Risk Parity / HRP",
    formula: String.raw`\text{ERC: } w_i\,(\Sigma w)_i = w_j\,(\Sigma w)_j\;\;\forall\,i,j,\qquad \text{HRP: } d_{ij}=\sqrt{(1-\rho_{ij})/2}\;\to\;\text{cluster}\;\to\;\text{recursive bisection}`,
    component: RiskParityTool,
  },
  {
    id: "ff5", name: t("labs.quant.ui.text4", { defaultValue: "Fama-French 5 因子归因" }), nameEn: "Fama-French 5-Factor Performance Attribution",
    navEn: "Fama-French 5F",
    formula: String.raw`R_{p,t} - R_{f,t} = \alpha + \beta_{\mathrm{MKT}}\,\mathrm{MKT}_t + \beta_{\mathrm{SMB}}\,\mathrm{SMB}_t + \beta_{\mathrm{HML}}\,\mathrm{HML}_t + \beta_{\mathrm{RMW}}\,\mathrm{RMW}_t + \beta_{\mathrm{CMA}}\,\mathrm{CMA}_t + \varepsilon_t`,
    component: FamaFrenchTool,
  },
  {
    id: "bl-full", name: t("labs.quant.ui.text5", { defaultValue: "Black-Litterman 完整版" }), nameEn: "Black-Litterman (Full) with Idzorek Confidence → Ω",
    navEn: "Black-Litterman (Full)",
    formula: String.raw`\pi = \delta\,\Sigma\,w_{\text{mkt}},\quad \tilde\mu = \pi + \tau\Sigma P^{\!\top}(P\tau\Sigma P^{\!\top}+\Omega)^{-1}(Q-P\pi),\quad \omega_k = \tfrac{1-c_k}{c_k}\,p_k\tau\Sigma p_k^{\!\top}`,
    component: BlackLittermanFullTool,
  },
  {
    id: "cvar", name: t("labs.quant.ui.text6", { defaultValue: "Mean-CVaR 尾部优化" }), nameEn: "Mean-CVaR Optimisation — Rockafellar-Uryasev",
    navEn: "Mean-CVaR",
    formula: String.raw`\min_{w,\zeta}\ \zeta + \tfrac{1}{(1-\alpha)S}\sum_{s=1}^{S}\bigl(-r_s^{\!\top}w-\zeta\bigr)^{\!+},\quad \text{s.t. } \mathbf{1}^{\!\top}w=1,\ w\geq 0`,
    component: MeanCVaRTool,
  },
  {
    id: "shrinkage", name: t("labs.quant.ui.text7", { defaultValue: "稳健协方差收缩" }), nameEn: "Ledoit-Wolf & OAS Covariance Shrinkage",
    navEn: "Covariance Shrinkage",
    formula: String.raw`\hat\Sigma = \lambda F + (1-\lambda) S,\quad \lambda^{*} = \dfrac{\sum_{i,j}\widehat{\mathrm{Var}}(s_{ij})}{T\sum_{i,j}(s_{ij}-f_{ij})^{2}}`,
    component: ShrinkageTool,
  },
  {
    id: "resampled", name: t("labs.quant.ui.text8", { defaultValue: "Michaud 重采样前沿" }), nameEn: "Michaud Resampled Efficient Frontier",
    navEn: "Resampled Frontier",
    formula: String.raw`\bar w(\text{target}_g) = \tfrac{1}{B}\sum_{b=1}^{B} w^{(b)}\!\bigl(\hat\mu^{(b)},\hat\Sigma^{(b)};\text{target}_g\bigr)`,
    component: ResampledFrontierTool,
  },
  {
    id: "factor-budget", name: t("labs.quant.ui.text9", { defaultValue: "因子风险预算" }), nameEn: "Factor Risk Budgeting — B F Bᵀ + Specific",
    navEn: "Factor Risk Budget",
    formula: String.raw`\mathrm{Var}(w) = w^{\!\top} B\,F\,B^{\!\top} w + w^{\!\top} D\,w,\quad \dfrac{(\!B^{\!\top}w)_k\,(F B^{\!\top}w)_k}{\mathrm{Var}(w)} = \text{target}_k`,
    component: FactorBudgetTool,
  },
  {
    id: "kelly", name: t("labs.quant.ui.text10", { defaultValue: "Kelly & 破产风险" }), nameEn: "Kelly Criterion & Ruin Probability Lab",
    navEn: "Kelly & Ruin",
    formula: String.raw`k^{*} = \Sigma^{-1}(\mu-r_f),\quad g(f) = f\,(\mu_p - r_f) + r_f - \tfrac{1}{2}f^{2}\sigma_p^{2},\quad \Pr\!\bigl(\min_t W_t < \theta\bigr)`,
    component: KellyRuinTool,
  },
  {
    id: "frontier-geo", name: t("labs.quant.ui.text11", { defaultValue: "有效前沿几何与两基金分离" }), nameEn: "Frontier Geometry, CAL & Two-Fund Separation (Zero-Beta CAPM)",
    navEn: "Frontier Geometry",
    formula: String.raw`\sigma_p^{2}(m) = \dfrac{A m^{2} - 2Bm + C}{D},\quad A=\mathbf 1^{\!\top}\Sigma^{-1}\mathbf 1,\; B=\mathbf 1^{\!\top}\Sigma^{-1}\mu,\; C=\mu^{\!\top}\Sigma^{-1}\mu,\; D=AC-B^{2}`,
    component: FrontierGeometryTool,
  },
  {
    id: "single-index", name: t("labs.quant.ui.text12", { defaultValue: "单指数模型降维台" }), nameEn: "Sharpe Single-Index Model — Structured Covariance",
    navEn: "Single-Index Model",
    formula: String.raw`r_i = \alpha_i + \beta_i r_m + \varepsilon_i,\qquad \sigma_{ij} = \beta_i\beta_j\sigma_m^{2} + \delta_{ij}\sigma_{\varepsilon_i}^{2},\qquad \tfrac{N(N+1)}{2}\ \longrightarrow\ 2N+1`,
    component: SingleIndexTool,
  },
  {
    id: "est-error", name: t("labs.quant.ui.text13", { defaultValue: "估计误差与滚动优化" }), nameEn: "Estimation Error & the 1/N Benchmark — DeMiguel et al. (2009)",
    navEn: "Estimation Error",
    formula: String.raw`\hat w = f(\hat\mu, \hat\Sigma),\qquad \mathbb E\bigl[\mathrm{SR}(\hat w)\bigr] < \mathrm{SR}(w^{*}),\qquad \mathrm{SE}(\hat\mu)=\sigma/\sqrt{T}`,
    component: EstimationErrorTool,
  },
  {
    id: "rebal-cost", name: t("labs.quant.ui.text14", { defaultValue: "约束与再平衡成本" }), nameEn: "Constraints, Rebalancing Rules & Turnover Cost",
    navEn: "Rebalancing Cost",
    formula: t("labs.quant.ui.text15", { defaultValue: String.raw`\text{Cost} = c\sum_i |w_i^{\text{new}} - w_i^{\text{old}}|,\qquad \text{触发条件: } \tfrac12\!\sum_i |w_{i,t}-w_i^{\ast}| > b,\qquad \mathrm{TE}=\sigma(r_p - r_b)` }),
    component: RebalanceCostTool,
  },
  {
    id: "active-ir", name: t("labs.quant.ui.text16", { defaultValue: "主动管理与信息比率" }), nameEn: "Fundamental Law of Active Management & Treynor-Black",
    navEn: "Active Management",
    formula: String.raw`\mathrm{IR} \approx \mathrm{TC}\cdot \mathrm{IC}\sqrt{\mathrm{BR}},\qquad \mathrm{VA}^{*} = \dfrac{\mathrm{IR}^{2}}{4\lambda},\qquad w_i^{A} \propto \dfrac{\alpha_i}{\sigma^{2}(\varepsilon_i)},\qquad S_P^{2}=S_M^{2}+\Bigl(\tfrac{\alpha_A}{\sigma_A}\Bigr)^{2}`,
    component: ActiveManagementTool,
  },
  {
    id: "downside-sd", name: t("labs.quant.ui.text17", { defaultValue: "下行风险与随机占优" }), nameEn: "Downside Risk, Stochastic Dominance & CRRA Utility",
    navEn: "Downside & SD",
    formula: String.raw`\mathrm{LPM}_n(\tau) = \mathbb E\bigl[(\tau - r)^{+n}\bigr],\quad \text{SSD: } \int_{-\infty}^{x}\!\!F_A \le \int_{-\infty}^{x}\!\!F_B\ \forall x,\quad \mathrm{CE} = U^{-1}\bigl(\mathbb E[U(W)]\bigr)`,
    component: DownsideDominanceTool,
  },
  {
    id: "dynamic-alloc", name: t("labs.quant.ui.text18", { defaultValue: "多期与动态配置" }), nameEn: "Merton Dynamic Allocation, Hedging Demand & Glide Path",
    navEn: "Dynamic Allocation",
    formula: t("labs.quant.ui.text19", { defaultValue: String.raw`w^{*} = \underbrace{\dfrac{\mu-r}{\gamma\sigma^{2}}}_{\text{短视需求}} + \underbrace{\Bigl(1-\tfrac1\gamma\Bigr)\dfrac{-\rho\,\sigma_x}{\sigma}\,h(\phi,T)}_{\text{跨期对冲需求}}` }),
    component: DynamicAllocationTool,
  },
  {
    id: "regularise", name: t("labs.quant.ui.text20", { defaultValue: "高维正则化与最大分散化" }), nameEn: "Norm-Constrained Portfolios & Maximum Diversification",
    navEn: "Regularisation",
    formula: String.raw`\min_w\ w^{\!\top}\Sigma w + \lambda_1\|w\|_1 + \lambda_2\|w\|_2^{2}\ \ \text{s.t.}\ \mathbf 1^{\!\top}w=1,\qquad \mathrm{DR}(w)=\dfrac{\sum_i w_i\sigma_i}{\sqrt{w^{\!\top}\Sigma w}}`,
    component: RegularizationTool,
  },
];
return TOOLS;
};

const getCATEGORIES = (t: TFunction) => {
const CATEGORIES: ToolCategory[] = [
  { id: "classic", label: t("labs.quant.ui.text21", { defaultValue: "经典与均衡" }), labelEn: "Classic & Equilibrium", toolIds: ["frontier-geo", "single-index", "backtest", "walkforward"] },
  { id: "estimation", label: t("labs.quant.ui.text22", { defaultValue: "估计与执行" }), labelEn: "Estimation & Execution", toolIds: ["est-error", "shrinkage", "resampled", "rebal-cost"] },
  { id: "bayes", label: t("labs.quant.ui.text23", { defaultValue: "贝叶斯与因子" }), labelEn: "Bayes & Factors", toolIds: ["bl", "bl-full", "ff5", "factor-budget"] },
  { id: "downside", label: t("labs.quant.ui.text24", { defaultValue: "主动与下行" }), labelEn: "Active & Downside", toolIds: ["active-ir", "downside-sd", "rp", "cvar"] },
  { id: "dynamic", label: t("labs.quant.ui.text25", { defaultValue: "动态与高维" }), labelEn: "Dynamic & High-Dimensional", toolIds: ["dynamic-alloc", "regularise", "kelly"] },
];
return CATEGORIES;
};

const TOOL_IDS = ["backtest","walkforward","bl","rp","ff5","bl-full","cvar","shrinkage","resampled","factor-budget","kelly","frontier-geo","single-index","est-error","rebal-cost","active-ir","downside-sd","dynamic-alloc","regularise"] as readonly ToolId[];

const QuantStrategyTools = () => {
  const { t } = useTranslation();
  const CATEGORIES = getCATEGORIES(t);
  const TOOLS = getTOOLS(t);
  
  const [tool, setTool] = useToolTab<ToolId>(TOOL_IDS, "backtest");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("quant", apply);
  const Active = TOOLS.find(timeIndex => timeIndex.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">{t("sections.quant.tag")}</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">{t("sections.quant.title")}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">{t("sections.quant.subtitle")}</p>
        </motion.div>

        <CategorizedToolNav
          tools={TOOLS.map((tt) => ({ id: tt.id, name: tt.name, nameEn: tt.navEn }))}
          categories={CATEGORIES}
          activeId={tool}
          onSelect={(id) => setTool(id as ToolId)}
        />

        <motion.div key={tool} ref={captureRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 md:p-10 glow-gold">
          <div className="flex flex-wrap justify-end gap-2 mb-4">
            <HistoryDrawer
              storageKey="quant"
              currentState={{ tool }}
              onApply={(s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }}
              summarize={(s: any) => t("labs.quant.historySummary", { tool: s.tool })}
            />
            <ShareExportToolbar storageKey="quant" anchorId="quant" state={{ tool }} captureRef={captureRef} filename={`quant-${tool}`} />
          </div>
          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">{Active.nameEn}</p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock math={Active.formula} />
            </div>
          </div>
          <Active.component />
        </motion.div>
      </div>
    </section>
  );
};

export default QuantStrategyTools;
