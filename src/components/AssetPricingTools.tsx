import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { EquationBlock } from "@/components/common/EquationBlock";
import CategorizedToolNav, { type ToolCategory } from "@/components/common/CategorizedToolNav";
import { CAPMTool, APTTool, FamaFrenchTool, FamaMacBethTool } from "./asset/V31AssetTools";
import { SDFTool, CCAPMTool, HJBoundTool } from "./asset/SDFTools";
import { ZeroBetaTool, ICAPMTool } from "./asset/CapmFamilyTools";
import { AnomalySortTool, GRSTool } from "./asset/AnomalyTools";

type ToolId =
  | "capm" | "zerobeta" | "icapm"
  | "apt" | "famafrench" | "famamacbeth" | "anomaly" | "grs"
  | "sdf" | "ccapm" | "hj";

const TOOLS: { id: ToolId; name: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "capm", name: "CAPM / SML", nameEn: "Capital Asset Pricing Model — Security Market Line & Jensen's Alpha",
    formula: String.raw`E(R_i) = R_f + \beta_i\,[E(R_m) - R_f],\qquad \alpha_i = R_i - [R_f + \beta_i(E(R_m)-R_f)]`,
    component: CAPMTool,
  },
  {
    id: "zerobeta", name: "Zero-Beta CAPM", nameEn: "Black (1972) Zero-Beta CAPM — No Risk-Free Asset",
    formula: String.raw`E(R_i) = E(R_z) + \beta_i\,[E(R_m) - E(R_z)],\qquad \mathrm{cov}(R_z, R_m) = 0`,
    component: ZeroBetaTool,
  },
  {
    id: "icapm", name: "ICAPM 跨期", nameEn: "Merton (1973) Intertemporal CAPM — State-Variable Hedging",
    formula: String.raw`E(R_i) - R_f = \beta_{i,m}\,\lambda_m + \sum_{h}\beta_{i,h}\,\lambda_h`,
    component: ICAPMTool,
  },
  {
    id: "apt", name: "APT 多因子", nameEn: "Arbitrage Pricing Theory — Multi-Factor Linear Pricing",
    formula: String.raw`E(R_i) = R_f + \beta_{i1}F_1 + \beta_{i2}F_2 + \cdots + \beta_{ik}F_k`,
    component: APTTool,
  },
  {
    id: "famafrench", name: "Fama-French 回归", nameEn: "Fama-French 3 / 5-Factor Regression — Performance Attribution",
    formula: String.raw`R_i - R_f = \alpha + \beta_1(R_m - R_f) + \beta_2\,\mathrm{SMB} + \beta_3\,\mathrm{HML} + \beta_4\,\mathrm{RMW} + \beta_5\,\mathrm{CMA} + \varepsilon`,
    component: FamaFrenchTool,
  },
  {
    id: "famamacbeth", name: "Fama-MacBeth", nameEn: "Fama-MacBeth Two-Pass Cross-Sectional Regression (Shanken-corrected)",
    formula: String.raw`\text{Pass 1: } R_{it}-R_f=\alpha_i+\beta_i F_t+\varepsilon_{it};\quad \text{Pass 2: } R_{it}=\gamma_0+\lambda_t\beta_i+u_{it},\ \hat\lambda=\tfrac1T\textstyle\sum_t\lambda_t`,
    component: FamaMacBethTool,
  },
  {
    id: "anomaly", name: "异象排序组合", nameEn: "Anomaly Quantile-Sort Long-Short Portfolio — Size / Value / Momentum / Low-Vol",
    formula: String.raw`R_{LS} = \bar R_{Q_{\text{high}}} - \bar R_{Q_{\text{low}}},\qquad t = \dfrac{\bar R_{LS}}{\sigma(R_{LS})/\sqrt{T}}`,
    component: AnomalySortTool,
  },
  {
    id: "grs", name: "GRS 联合检验", nameEn: "Gibbons-Ross-Shanken (1989) Joint α = 0 Test",
    formula: String.raw`\mathrm{GRS} = \dfrac{T}{N}\cdot\dfrac{T-N-K}{T-K-1}\cdot\dfrac{\alpha'\Sigma^{-1}\alpha}{1+\mu_f'\Omega^{-1}\mu_f}\ \sim\ F(N,\,T-N-K)`,
    component: GRSTool,
  },
  {
    id: "sdf", name: "随机折现因子 SDF", nameEn: "Stochastic Discount Factor — p = E[M X], Beta Representation",
    formula: String.raw`p = E[M\,X],\qquad E(R_i) - R_f = -\,(1+R_f)\,\mathrm{cov}(M, R_i),\qquad M = a - b\,R_m`,
    component: SDFTool,
  },
  {
    id: "ccapm", name: "CCAPM + 股权溢价之谜", nameEn: "Consumption CAPM & the Equity Premium Puzzle",
    formula: String.raw`M = \delta\left(\tfrac{C_{t+1}}{C_t}\right)^{-\gamma},\qquad R_f = -\ln\delta + \gamma\mu_c - \tfrac12\gamma^2\sigma_c^2,\qquad \text{ERP} \approx \gamma\,\rho\,\sigma_c\,\sigma_m`,
    component: CCAPMTool,
  },
  {
    id: "hj", name: "Hansen-Jagannathan 边界", nameEn: "Hansen-Jagannathan Volatility Bound on the SDF",
    formula: String.raw`\dfrac{\sigma(M)}{E(M)} \ \geq\ \dfrac{|E(R^e)|}{\sigma(R^e)} = \max\text{ Sharpe},\qquad E(M) = \dfrac{1}{1+R_f}`,
    component: HJBoundTool,
  },
];

const CATEGORIES: ToolCategory[] = [
  { id: "equilibrium", label: "均衡定价", toolIds: ["capm", "zerobeta", "icapm"] },
  { id: "factors", label: "因子与实证", toolIds: ["apt", "famafrench", "famamacbeth", "anomaly", "grs"] },
  { id: "sdf", label: "现代框架 · SDF", toolIds: ["sdf", "ccapm", "hj"] },
];

const AssetPricingTools = () => {
  const [tool, setTool] = useState<ToolId>("capm");
  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: { tool: ToolId }) => { if (s?.tool) setTool(s.tool); }, []);
  useSharedState<{ tool: ToolId }>("asset", apply);
  const Active = TOOLS.find(t => t.id === tool)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">Asset Pricing</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">资产定价</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            11 个交互工具，覆盖均衡定价 (CAPM · 零β · ICAPM)、因子与实证 (APT · Fama-French · Fama-MacBeth · 异象排序 · GRS) 与现代 SDF 框架 (随机折现因子 · CCAPM 股权溢价之谜 · Hansen-Jagannathan 边界)。
          </p>
        </motion.div>

        <CategorizedToolNav
          tools={TOOLS.map(t => ({ id: t.id, name: t.name, nameEn: t.nameEn }))}
          categories={CATEGORIES}
          activeId={tool}
          onSelect={(id) => setTool(id as ToolId)}
        />

        <motion.div key={tool} ref={captureRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 md:p-10 glow-gold">
          <div className="flex justify-end mb-4">
            <ShareExportToolbar storageKey="asset" anchorId="asset-pricing" state={{ tool }} captureRef={captureRef} filename={`asset-${tool}`} />
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

export default AssetPricingTools;