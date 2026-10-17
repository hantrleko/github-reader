import { useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { getBus } from "@/lib/toolBus";
import { VolSurfaceTool, AmericanOptionTool, RatesDerivativesTool } from "./deriv/Sprint3Tools";
import { HestonTool } from "./deriv/HestonTool";
import { SABRTool } from "./deriv/SABRTool";
import { LocalVolTool } from "./deriv/LocalVolTool";
import { GreeksDeskTool } from "./deriv/GreeksDeskTool";
import { SABRvsHestonTool } from "./deriv/SABRvsHestonTool";
import { LMMSwaptionTool, ExoticOptionsTool } from "./deriv/V26Tools";
import { BinomialTreeTool } from "./deriv/BinomialTreeTool";
import {
  JumpDiffusionTool, BatesVarSwapTool, PdeTool,
  HedgePnLTool, AutocallableTool, XvaTool,
} from "./deriv/V42Tools";
import {
  StatePriceBoundsTool, LSMCTool, CarryFuturesTool, SviSurfaceTool,
  ShortRateCurveTool, CreditCurveTool, NumericsLabTool, RoughVolHedgeTool,
} from "./deriv/V57Tools";
import { EquationBlock } from "@/components/common/EquationBlock";
import CategorizedToolNav, { type ToolCategory } from "@/components/common/CategorizedToolNav";
import { useToolTab } from "@/lib/useToolTab";

type ToolId = "vol" | "heston" | "sabr" | "sabr_heston" | "localvol" | "greeks" | "binomial" | "amer" | "rates" | "lmm" | "exotic"
  | "jump" | "bates_var" | "pde" | "hedge_pnl" | "autocall" | "xva"
  | "state_price" | "lsmc" | "carry" | "svi_arb" | "shortrate" | "credit" | "numerics" | "rough";

const DerivativesTools = () => {
  const { t } = useTranslation();
const DERIV_CATEGORIES: ToolCategory[] = [
  { id: "foundation", label: t("labs.deriv.Derivatives.text350", { defaultValue: "无套利与复制" }), labelEn: "No-Arbitrage & Replication", toolIds: ["state_price", "carry"] },
  { id: "surface", label: t("labs.deriv.Derivatives.text351", { defaultValue: "波动率曲面" }), labelEn: "Volatility Surface", toolIds: ["vol", "svi_arb", "heston", "sabr", "sabr_heston", "localvol"] },
  { id: "greeks", label: t("labs.deriv.Derivatives.text352", { defaultValue: "希腊字母与格点" }), labelEn: "Greeks & Lattices", toolIds: ["greeks", "binomial", "amer", "lsmc"] },
  { id: "rates", label: t("labs.deriv.Derivatives.text353", { defaultValue: "利率与奇异" }), labelEn: "Rates & Exotics", toolIds: ["rates", "lmm", "exotic"] },
  { id: "curve_credit", label: t("labs.deriv.Derivatives.text354", { defaultValue: "曲线与信用" }), labelEn: "Curves & Credit", toolIds: ["shortrate", "credit"] },
  { id: "jumps", label: t("labs.deriv.Derivatives.text355", { defaultValue: "跳跃与方差" }), labelEn: "Jumps & Variance", toolIds: ["jump", "bates_var"] },
  { id: "numerics", label: t("labs.deriv.Derivatives.text356", { defaultValue: "数值方法" }), labelEn: "Numerical Methods", toolIds: ["pde", "numerics"] },
  { id: "frontier", label: t("labs.deriv.Derivatives.text357", { defaultValue: "前沿与不完全市场" }), labelEn: "Frontier & Incomplete Markets", toolIds: ["rough"] },
  { id: "structured", label: t("labs.deriv.Derivatives.text358", { defaultValue: "交易与结构" }), labelEn: "Trading & Structured", toolIds: ["hedge_pnl", "autocall", "xva"] },
];

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "vol", name: t("labs.deriv.Derivatives.text359", { defaultValue: "波动率曲面 (SVI 3D)" }), nameEn: "Implied Volatility Surface — SVI Parametrization",
    formula: String.raw`w(k) \;=\; a + b\bigl\{\rho(k - m) + \sqrt{(k-m)^2 + \sigma^2}\bigr\},\qquad \sigma_{\mathrm{IV}}(k,T) = \sqrt{w(k)/T}`,
    component: VolSurfaceTool,
  },
  {
    id: "heston", name: t("labs.deriv.Derivatives.text360", { defaultValue: "Heston 随机波动率" }), nameEn: "Heston Stochastic Volatility — Smile/Skew Generator",
    formula: String.raw`dS_t = r\,S_t\,dt + \sqrt{v_t}\,S_t\,dW_1,\qquad dv_t = \kappa(\theta - v_t)\,dt + \xi\sqrt{v_t}\,dW_2,\qquad \mathrm{Corr}(dW_1,dW_2)=\rho`,
    component: HestonTool,
  },
  {
    id: "sabr", name: t("labs.deriv.Derivatives.text361", { defaultValue: "SABR 模型" }), nameEn: "SABR Stochastic-α-β-ρ — Hagan (2002) Implied Vol",
    formula: t("labs.deriv.Derivatives.text362", { defaultValue: "dF_t = \\alpha_t\\, F_t^{\\beta}\\, dW_1,\\quad d\\alpha_t = \\nu\\,\\alpha_t\\, dW_2,\\quad \\mathrm{Corr}(dW_1,dW_2)=\\rho \\;\\Rightarrow\\; \\sigma_B(K,F,T) \\;\\text{(Hagan 近似)}" }),
    component: SABRTool,
  },
  {
    id: "sabr_heston", name: t("labs.deriv.Derivatives.text363", { defaultValue: "SABR vs Heston 对比" }), nameEn: "SABR vs Heston — Smile, Key Points & Error Heatmap",
    formula: String.raw`\Delta\sigma(k,T) \;=\; \sigma^{\text{SABR}}_{B}(k,T) \;-\; \sigma^{\text{Heston}}_{\text{MC}}(k,T)`,
    component: SABRvsHestonTool,
  },
  {
    id: "localvol", name: "Local Volatility (Dupire)", nameEn: "Dupire Local Volatility — Inversion from IV Surface",
    formula: String.raw`\sigma_{\text{loc}}^{2}(K,T) \;=\; \dfrac{\partial C/\partial T \;+\; r\,K\,\partial C/\partial K}{\tfrac12 K^{2}\, \partial^{2} C/\partial K^{2}}`,
    component: LocalVolTool,
  },
  {
    id: "greeks", name: t("labs.deriv.Derivatives.text364", { defaultValue: "Greeks 完整工作台" }), nameEn: "Black-Scholes Greeks Desk — Δ Γ Vega Θ ρ Vanna Volga",
    formula: String.raw`\Delta = e^{-qT} N(d_1),\quad \Gamma = \dfrac{e^{-qT} n(d_1)}{S\sigma\sqrt{T}},\quad \mathrm{Vega} = S e^{-qT} n(d_1)\sqrt{T},\quad \mathrm{Vanna} = -\dfrac{e^{-qT} n(d_1)\, d_2}{\sigma}`,
    component: GreeksDeskTool,
  },
  {
    id: "binomial", name: t("labs.deriv.Derivatives.text365", { defaultValue: "二叉树 (CRR 收敛)" }), nameEn: "Cox-Ross-Rubinstein Binomial Tree — Convergence to Black-Scholes",
    formula: String.raw`u = e^{\sigma\sqrt{\Delta t}},\; d = 1/u,\; p = \dfrac{e^{(r-q)\Delta t} - d}{u - d},\qquad V_t = e^{-r\Delta t}\bigl[p\,V_{t+1}^{u} + (1-p)\,V_{t+1}^{d}\bigr]`,
    component: BinomialTreeTool,
  },
  {
    id: "amer", name: t("labs.deriv.Derivatives.text366", { defaultValue: "美式期权 (LSM)" }), nameEn: "American Option — Longstaff-Schwartz Least-Squares Monte Carlo",
    formula: String.raw`\hat C_{\text{cont}}(S_t) = \beta_0 + \beta_1 S_t + \beta_2 S_t^2,\qquad \tau^* = \min\{t:\; \text{Payoff}(S_t) > \hat C_{\text{cont}}(S_t)\}`,
    component: AmericanOptionTool,
  },
  {
    id: "rates", name: t("labs.deriv.Derivatives.text367", { defaultValue: "利率衍生品 (Cap/Floor/Swaption)" }), nameEn: "Interest Rate Derivatives — Black-76 Pricing",
    formula: String.raw`\text{Caplet} = \tau\,P(0,T_{i+1})\bigl[F_i\Phi(d_1) - K\Phi(d_2)\bigr],\qquad \text{Swaption} = A_{\text{ann}}\bigl[S_0\Phi(d_1) - K\Phi(d_2)\bigr]`,
    component: RatesDerivativesTool,
  },
  {
    id: "lmm", name: "LMM Bermudan Swaption", nameEn: "Libor Market Model — Bermudan Swaption (Longstaff-Schwartz MC)",
    formula: String.raw`dF_i(t) = \sigma_i\,F_i(t)\,dW_i^{T_{i+1}},\qquad V_0 = \sup_{\tau \in \mathcal{T}}\;\mathbb{E}^{Q}\!\Bigl[\tfrac{(\text{Swap}_\tau)^+}{B_\tau}\Bigr]`,
    component: LMMSwaptionTool,
  },
  {
    id: "exotic", name: t("labs.deriv.Derivatives.text368", { defaultValue: "路径依赖期权 (亚式/障碍/回望)" }), nameEn: "Path-Dependent Exotics — Asian / Barrier / Lookback with Control Variate",
    formula: String.raw`\hat C_{\text{CV}} = \bar Y - \hat\beta\bigl(\bar C - \mathbb{E}[C]\bigr),\qquad \hat\beta = \tfrac{\mathrm{Cov}(Y,C)}{\mathrm{Var}(C)},\quad \mathbb{E}[C] = e^{rT}\,C^{\text{BS}}`,
    component: ExoticOptionsTool,
  },
  {
    id: "jump", name: t("labs.deriv.Derivatives.text369", { defaultValue: "跳跃扩散 (Merton & Kou)" }), nameEn: "Jump-Diffusion — Merton (1976) & Kou (2002)",
    formula: String.raw`dS_t/S_t = (r - \lambda m)\,dt + \sigma\,dW_t + (e^{J}-1)\,dN_t,\qquad C^{\text{Merton}} = \sum_{n=0}^{\infty} \dfrac{e^{-\lambda' T}(\lambda' T)^n}{n!}\,C^{\text{BS}}(S,K,T,r_n,\sigma_n)`,
    component: JumpDiffusionTool,
  },
  {
    id: "bates_var", name: t("labs.deriv.Derivatives.text370", { defaultValue: "Bates + 方差互换" }), nameEn: "Bates SVJ Monte Carlo & Variance Swap Replication",
    formula: String.raw`\text{Bates}:\; dS_t/S_t = r\,dt + \sqrt{v_t}\,dW_1 + (e^{J}-1)\,dN,\quad K_{\text{var}} = \dfrac{2}{T}\!\int \dfrac{P(K)\,\mathbf 1_{K\le S^*} + C(K)\,\mathbf 1_{K\ge S^*}}{K^2}\,dK`,
    component: BatesVarSwapTool,
  },
  {
    id: "pde", name: "Crank-Nicolson PDE", nameEn: "Crank-Nicolson Finite Difference (Euro / American PSOR / Barrier)",
    formula: String.raw`\dfrac{\partial V}{\partial t} + \tfrac12 \sigma^2 S^2 \dfrac{\partial^2 V}{\partial S^2} + (r-q)S\dfrac{\partial V}{\partial S} - rV = 0,\qquad V_i^{n} = \max\!\bigl(V_i^{\text{CN}},\; \text{Payoff}(S_i)\bigr)\;\text{(PSOR)}`,
    component: PdeTool,
  },
  {
    id: "hedge_pnl", name: t("labs.deriv.Derivatives.text371", { defaultValue: "Delta 对冲 P&L 归因" }), nameEn: "Dynamic Delta-Hedge P&L Attribution",
    formula: String.raw`\Pi_T \approx \tfrac12 \Gamma (\Delta S)^2 + \Theta\,\Delta t + \mathrm{Vega}\cdot (\sigma_{\text{real}} - \sigma_{\text{price}}) - \text{cost}`,
    component: HedgePnLTool,
  },
  {
    id: "autocall", name: t("labs.deriv.Derivatives.text372", { defaultValue: "Autocallable 结构化票据" }), nameEn: "Autocallable / Phoenix Note — Monte Carlo",
    formula: String.raw`\text{Payoff}_k = N(1 + k\cdot c)\;\text{if}\; S_{t_k} \ge B_{AC};\quad \text{else at }T:\; N\min(S_T/S_0, 1)\;\text{if KI hit},\; N(1+n c)\;\text{otherwise}`,
    component: AutocallableTool,
  },
  {
    id: "xva", name: "XVA (CVA / DVA / FVA)", nameEn: "Counterparty Credit XVA — Exposure, PFE & Adjustments",
    formula: String.raw`\text{CVA} = (1-R)\!\int_0^T\! D(0,t)\,\mathrm{EE}(t)\,dPD_C(t),\quad \text{DVA} = (1-R)\!\int_0^T\! D(0,t)\,\mathrm{NE}(t)\,dPD_B(t),\quad \text{FVA} = s_F\!\int_0^T\! D(0,t)\,\mathrm{EE}(t)\,dt`,
    component: XvaTool,
  },
  {
    id: "state_price", name: t("labs.deriv.Derivatives.text373", { defaultValue: "状态价格与无套利区间" }), nameEn: "Arrow-Debreu State Prices & Super/Sub-Replication Bounds",
    formula: String.raw`V_0 = \sum_i \psi_i H_i,\quad \sum_i \psi_i = e^{-rT},\ \sum_i \psi_i S_T^{(i)} = S_0 \;\Longrightarrow\; \bigl[\inf_{Q\in\mathcal M} \mathbb E^Q[e^{-rT}H],\; \sup_{Q\in\mathcal M} \mathbb E^Q[e^{-rT}H]\bigr]`,
    component: StatePriceBoundsTool,
  },
  {
    id: "lsmc", name: t("labs.deriv.Derivatives.text374", { defaultValue: "美式/百慕大 LSMC 定价台" }), nameEn: "Longstaff-Schwartz Least-Squares Monte Carlo — Exercise Boundary",
    formula: String.raw`V_t = \max\Bigl(\text{Payoff}(S_t),\; \mathbb E^{Q}\bigl[e^{-r\Delta t}V_{t+\Delta t}\mid S_t\bigr]\Bigr),\qquad \widehat{\mathbb E}[\cdot\mid S_t] = \sum_{j=0}^{J}\beta_j\,\phi_j(S_t)`,
    component: LSMCTool,
  },
  {
    id: "carry", name: t("labs.deriv.Derivatives.text375", { defaultValue: "期货—远期与持有成本" }), nameEn: "Cost of Carry, Convenience Yield & Futures-Forward Convexity",
    formula: String.raw`F(0,T) = S_0 e^{(r+u-y-q)T},\qquad \frac{\text{Futures}}{\text{Forward}} \approx \exp\Bigl(\tfrac12\rho\,\sigma_S\sigma_r T^2\Bigr)`,
    component: CarryFuturesTool,
  },
  {
    id: "svi_arb", name: t("labs.deriv.Derivatives.text376", { defaultValue: "SVI 曲面与静态无套利检查" }), nameEn: "SVI Calibration, Butterfly/Calendar Arbitrage & Dupire Inversion",
    formula: String.raw`g(k) = \Bigl(1-\tfrac{k w'}{2w}\Bigr)^{2} - \tfrac{w'^{2}}{4}\Bigl(\tfrac1w+\tfrac14\Bigr) + \tfrac{w''}{2} \ge 0,\qquad \sigma^2_{\text{loc}} = \dfrac{\partial_T w}{1-\tfrac{k}{w}\partial_k w + \tfrac14\bigl(-\tfrac14-\tfrac1w+\tfrac{k^2}{w^2}\bigr)(\partial_k w)^2 + \tfrac12 \partial^2_k w}`,
    component: SviSurfaceTool,
  },
  {
    id: "shortrate", name: t("labs.deriv.Derivatives.text377", { defaultValue: "短期利率 / HJM / LMM 曲线台" }), nameEn: "Vasicek, CIR, Hull-White Bond Options, HJM Drift & Black-76 Caplet",
    formula: String.raw`P(t,T) = A(t,T)e^{-B(t,T)r_t},\qquad \mu^{\text{HJM}}(t,T) = \sigma(t,T)\!\int_t^T\!\sigma(t,u)\,du,\qquad \text{Caplet} = \tau P\bigl[F\Phi(d_1)-K\Phi(d_2)\bigr]`,
    component: ShortRateCurveTool,
  },
  {
    id: "credit", name: t("labs.deriv.Derivatives.text378", { defaultValue: "信用曲线自举与 CDS 定价" }), nameEn: "Reduced-Form Hazard Bootstrap & CDS Par Spread",
    formula: String.raw`Q(t) = e^{-\int_0^t \lambda(u)du},\qquad s^{\text{par}} = \dfrac{(1-R)\int_0^T D(t)\,(-dQ(t))}{\sum_i \Delta_i D(t_i)\,\bar Q(t_i)} \;\approx\; \lambda(1-R)`,
    component: CreditCurveTool,
  },
  {
    id: "numerics", name: t("labs.deriv.Derivatives.text379", { defaultValue: "数值方法实验室 (FFT / MC / 方差缩减)" }), nameEn: "Carr-Madan Fourier vs Monte Carlo with Variance Reduction",
    formula: String.raw`C(k) = \dfrac{e^{-\alpha k}}{\pi}\int_0^{\infty}\! e^{-iuk}\,\dfrac{e^{-rT}\varphi_T\bigl(u-(\alpha+1)i\bigr)}{\alpha^2+\alpha-u^2+i(2\alpha+1)u}\,du,\qquad \hat C_{\text{CV}} = \bar Y - \hat\beta(\bar X - \mathbb E X)`,
    component: NumericsLabTool,
  },
  {
    id: "rough", name: t("labs.deriv.Derivatives.text380", { defaultValue: "粗糙波动率与最优对冲" }), nameEn: "rBergomi Rough Volatility & Mean-Variance / Utility Indifference Hedging",
    formula: String.raw`v_t = \xi\exp\Bigl(\eta W^H_t - \tfrac{\eta^2}{2}t^{2H}\Bigr),\quad \psi(T)\sim T^{H-1/2};\qquad \theta^\star = \arg\min_\theta \mathrm{Var}\bigl(H-\theta\Delta S\bigr),\quad p^{\gamma} = \tfrac1\gamma\log\mathbb E\bigl[e^{\gamma(H-\theta^\star\Delta S)}\bigr]`,
    component: RoughVolHedgeTool,
  },
];

const TOOL_IDS = TOOLS.map((x) => x.id) as ToolId[];

  // If another tool handed off option parameters via the Tool Bus, land on the
  // Greeks Desk so it can consume them; otherwise default to the vol surface.
  // Tool Bus handoff decides the default landing tab; an explicit ?t= wins.
  const busDefault = useMemo<ToolId>(() => {
    const bus = getBus();
    return bus.sigma || bus.S0 || bus.K ? "greeks" : "vol";
  }, []);
  const [tool, setTool] = useToolTab<ToolId>(TOOL_IDS, busDefault);
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("deriv", apply);
  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">{t("sections.deriv.tag")}</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">{t("sections.deriv.title")}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">{t("sections.deriv.subtitle")}</p>
        </motion.div>

        <CategorizedToolNav
          tools={TOOLS.map(({ id, name, nameEn }) => ({ id, name, nameEn }))}
          categories={DERIV_CATEGORIES}
          activeId={tool}
          onSelect={(id) => setTool(id as ToolId)}
        />

        <motion.div key={tool} ref={captureRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 md:p-10 glow-gold">
          <div className="flex justify-end mb-4">
            <ShareExportToolbar storageKey="deriv" anchorId="derivatives" state={{ tool }} captureRef={captureRef} filename={`deriv-${tool}`} />
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

export default DerivativesTools;
