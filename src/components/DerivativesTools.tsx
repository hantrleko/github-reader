import { useState, useRef, useCallback } from "react";
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
import { EquationBlock } from "@/components/common/EquationBlock";
import CategorizedToolNav, { type ToolCategory } from "@/components/common/CategorizedToolNav";

type ToolId = "vol" | "heston" | "sabr" | "sabr_heston" | "localvol" | "greeks" | "binomial" | "amer" | "rates" | "lmm" | "exotic";

const DERIV_CATEGORIES: ToolCategory[] = [
  { id: "surface", label: "波动率曲面", toolIds: ["vol", "heston", "sabr", "sabr_heston", "localvol"] },
  { id: "greeks", label: "希腊字母与格点", toolIds: ["greeks", "binomial", "amer"] },
  { id: "rates", label: "利率与奇异", toolIds: ["rates", "lmm", "exotic"] },
];

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "vol", name: "波动率曲面 (SVI 3D)", nameEn: "Implied Volatility Surface — SVI Parametrization",
    formula: String.raw`w(k) \;=\; a + b\bigl\{\rho(k - m) + \sqrt{(k-m)^2 + \sigma^2}\bigr\},\qquad \sigma_{\mathrm{IV}}(k,T) = \sqrt{w(k)/T}`,
    component: VolSurfaceTool,
  },
  {
    id: "heston", name: "Heston 随机波动率", nameEn: "Heston Stochastic Volatility — Smile/Skew Generator",
    formula: String.raw`dS_t = r\,S_t\,dt + \sqrt{v_t}\,S_t\,dW_1,\qquad dv_t = \kappa(\theta - v_t)\,dt + \xi\sqrt{v_t}\,dW_2,\qquad \mathrm{Corr}(dW_1,dW_2)=\rho`,
    component: HestonTool,
  },
  {
    id: "sabr", name: "SABR 模型", nameEn: "SABR Stochastic-α-β-ρ — Hagan (2002) Implied Vol",
    formula: String.raw`dF_t = \alpha_t\, F_t^{\beta}\, dW_1,\quad d\alpha_t = \nu\,\alpha_t\, dW_2,\quad \mathrm{Corr}(dW_1,dW_2)=\rho \;\Rightarrow\; \sigma_B(K,F,T) \;\text{(Hagan 近似)}`,
    component: SABRTool,
  },
  {
    id: "sabr_heston", name: "SABR vs Heston 对比", nameEn: "SABR vs Heston — Smile, Key Points & Error Heatmap",
    formula: String.raw`\Delta\sigma(k,T) \;=\; \sigma^{\text{SABR}}_{B}(k,T) \;-\; \sigma^{\text{Heston}}_{\text{MC}}(k,T)`,
    component: SABRvsHestonTool,
  },
  {
    id: "localvol", name: "Local Volatility (Dupire)", nameEn: "Dupire Local Volatility — Inversion from IV Surface",
    formula: String.raw`\sigma_{\text{loc}}^{2}(K,T) \;=\; \dfrac{\partial C/\partial T \;+\; r\,K\,\partial C/\partial K}{\tfrac12 K^{2}\, \partial^{2} C/\partial K^{2}}`,
    component: LocalVolTool,
  },
  {
    id: "greeks", name: "Greeks 完整工作台", nameEn: "Black-Scholes Greeks Desk — Δ Γ Vega Θ ρ Vanna Volga",
    formula: String.raw`\Delta = e^{-qT} N(d_1),\quad \Gamma = \dfrac{e^{-qT} n(d_1)}{S\sigma\sqrt{T}},\quad \mathrm{Vega} = S e^{-qT} n(d_1)\sqrt{T},\quad \mathrm{Vanna} = -\dfrac{e^{-qT} n(d_1)\, d_2}{\sigma}`,
    component: GreeksDeskTool,
  },
  {
    id: "binomial", name: "二叉树 (CRR 收敛)", nameEn: "Cox-Ross-Rubinstein Binomial Tree — Convergence to Black-Scholes",
    formula: String.raw`u = e^{\sigma\sqrt{\Delta t}},\; d = 1/u,\; p = \dfrac{e^{(r-q)\Delta t} - d}{u - d},\qquad V_t = e^{-r\Delta t}\bigl[p\,V_{t+1}^{u} + (1-p)\,V_{t+1}^{d}\bigr]`,
    component: BinomialTreeTool,
  },
  {
    id: "amer", name: "美式期权 (LSM)", nameEn: "American Option — Longstaff-Schwartz Least-Squares Monte Carlo",
    formula: String.raw`\hat C_{\text{cont}}(S_t) = \beta_0 + \beta_1 S_t + \beta_2 S_t^2,\qquad \tau^* = \min\{t:\; \text{Payoff}(S_t) > \hat C_{\text{cont}}(S_t)\}`,
    component: AmericanOptionTool,
  },
  {
    id: "rates", name: "利率衍生品 (Cap/Floor/Swaption)", nameEn: "Interest Rate Derivatives — Black-76 Pricing",
    formula: String.raw`\text{Caplet} = \tau\,P(0,T_{i+1})\bigl[F_i\Phi(d_1) - K\Phi(d_2)\bigr],\qquad \text{Swaption} = A_{\text{ann}}\bigl[S_0\Phi(d_1) - K\Phi(d_2)\bigr]`,
    component: RatesDerivativesTool,
  },
  {
    id: "lmm", name: "LMM Bermudan Swaption", nameEn: "Libor Market Model — Bermudan Swaption (Longstaff-Schwartz MC)",
    formula: String.raw`dF_i(t) = \sigma_i\,F_i(t)\,dW_i^{T_{i+1}},\qquad V_0 = \sup_{\tau \in \mathcal{T}}\;\mathbb{E}^{Q}\!\Bigl[\tfrac{(\text{Swap}_\tau)^+}{B_\tau}\Bigr]`,
    component: LMMSwaptionTool,
  },
  {
    id: "exotic", name: "路径依赖期权 (亚式/障碍/回望)", nameEn: "Path-Dependent Exotics — Asian / Barrier / Lookback with Control Variate",
    formula: String.raw`\hat C_{\text{CV}} = \bar Y - \hat\beta\bigl(\bar C - \mathbb{E}[C]\bigr),\qquad \hat\beta = \tfrac{\mathrm{Cov}(Y,C)}{\mathrm{Var}(C)},\quad \mathbb{E}[C] = e^{rT}\,C^{\text{BS}}`,
    component: ExoticOptionsTool,
  },
];

const DerivativesTools = () => {
  const { t } = useTranslation();
  // If another tool handed off option parameters via the Tool Bus, land on the
  // Greeks Desk so it can consume them; otherwise default to the vol surface.
  const [tool, setTool] = useState<ToolId>(() => {
    const bus = getBus();
    return bus.sigma || bus.S0 || bus.K ? "greeks" : "vol";
  });
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
