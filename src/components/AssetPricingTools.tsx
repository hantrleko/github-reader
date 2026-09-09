import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "katex/dist/katex.min.css";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { EquationBlock } from "@/components/common/EquationBlock";
import CategorizedToolNav, { type ToolCategory } from "@/components/common/CategorizedToolNav";
import { useToolTab } from "@/lib/useToolTab";
import { CAPMTool, APTTool, FamaFrenchTool, FamaMacBethTool } from "./asset/V31AssetTools";
import { SDFTool, CCAPMTool, HJBoundTool } from "./asset/SDFTools";
import { ZeroBetaTool, ICAPMTool } from "./asset/CapmFamilyTools";
import { AnomalySortTool, GRSTool } from "./asset/AnomalyTools";
import { StatePriceTool, SdfFactorDualityTool, HJDistanceTool } from "./asset/NoArbitrageTools";
import { LongRunRiskTool, HabitTool, DisasterTool, PuzzleScoreboardTool } from "./asset/PuzzleTools";
import { CampbellShillerTool, FactorZooTool, CarryTool } from "./asset/FrontierAssetTools";

type ToolId =
  | "capm" | "zerobeta" | "icapm"
  | "apt" | "famafrench" | "famamacbeth" | "anomaly" | "grs"
  | "sdf" | "ccapm" | "hj"
  | "stateprice" | "duality" | "hjdist"
  | "lrr" | "habit" | "disaster" | "scoreboard"
  | "cs" | "zoo" | "carry";

/** `short` = compact English label used in the tool nav; `nameEn` = full title above the formula. */
const TOOLS: { id: ToolId; name: string; short: string; nameEn: string; formula: string; component: React.FC }[] = [
  {
    id: "capm", name: "CAPM / SML", short: "CAPM / SML", nameEn: "Capital Asset Pricing Model — Security Market Line & Jensen's Alpha",
    formula: String.raw`E(R_i) = R_f + \beta_i\,[E(R_m) - R_f],\qquad \alpha_i = R_i - [R_f + \beta_i(E(R_m)-R_f)]`,
    component: CAPMTool,
  },
  {
    id: "zerobeta", name: "Zero-Beta CAPM", short: "Zero-Beta CAPM", nameEn: "Black (1972) Zero-Beta CAPM — No Risk-Free Asset",
    formula: String.raw`E(R_i) = E(R_z) + \beta_i\,[E(R_m) - E(R_z)],\qquad \mathrm{cov}(R_z, R_m) = 0`,
    component: ZeroBetaTool,
  },
  {
    id: "icapm", name: "ICAPM 跨期", short: "ICAPM", nameEn: "Merton (1973) Intertemporal CAPM — State-Variable Hedging",
    formula: String.raw`E(R_i) - R_f = \beta_{i,m}\,\lambda_m + \sum_{h}\beta_{i,h}\,\lambda_h`,
    component: ICAPMTool,
  },
  {
    id: "apt", name: "APT 多因子", short: "APT Multi-Factor", nameEn: "Arbitrage Pricing Theory — Multi-Factor Linear Pricing",
    formula: String.raw`E(R_i) = R_f + \beta_{i1}F_1 + \beta_{i2}F_2 + \cdots + \beta_{ik}F_k`,
    component: APTTool,
  },
  {
    id: "famafrench", name: "Fama-French 回归", short: "Fama-French", nameEn: "Fama-French 3 / 5-Factor Regression — Performance Attribution",
    formula: String.raw`R_i - R_f = \alpha + \beta_1(R_m - R_f) + \beta_2\,\mathrm{SMB} + \beta_3\,\mathrm{HML} + \beta_4\,\mathrm{RMW} + \beta_5\,\mathrm{CMA} + \varepsilon`,
    component: FamaFrenchTool,
  },
  {
    id: "famamacbeth", name: "Fama-MacBeth", short: "Fama-MacBeth", nameEn: "Fama-MacBeth Two-Pass Cross-Sectional Regression (Shanken-corrected)",
    formula: String.raw`\text{Pass 1: } R_{it}-R_f=\alpha_i+\beta_i F_t+\varepsilon_{it};\quad \text{Pass 2: } R_{it}=\gamma_0+\lambda_t\beta_i+u_{it},\ \hat\lambda=\tfrac1T\textstyle\sum_t\lambda_t`,
    component: FamaMacBethTool,
  },
  {
    id: "anomaly", name: "异象排序组合", short: "Anomaly Sorts", nameEn: "Anomaly Quantile-Sort Long-Short Portfolio — Size / Value / Momentum / Low-Vol",
    formula: String.raw`R_{LS} = \bar R_{Q_{\text{high}}} - \bar R_{Q_{\text{low}}},\qquad t = \dfrac{\bar R_{LS}}{\sigma(R_{LS})/\sqrt{T}}`,
    component: AnomalySortTool,
  },
  {
    id: "grs", name: "GRS 联合检验", short: "GRS Test", nameEn: "Gibbons-Ross-Shanken (1989) Joint α = 0 Test",
    formula: String.raw`\mathrm{GRS} = \dfrac{T}{N}\cdot\dfrac{T-N-K}{T-K-1}\cdot\dfrac{\alpha'\Sigma^{-1}\alpha}{1+\mu_f'\Omega^{-1}\mu_f}\ \sim\ F(N,\,T-N-K)`,
    component: GRSTool,
  },
  {
    id: "sdf", name: "随机折现因子 SDF", short: "SDF", nameEn: "Stochastic Discount Factor — p = E[M X], Beta Representation",
    formula: String.raw`p = E[M\,X],\qquad E(R_i) - R_f = -\,(1+R_f)\,\mathrm{cov}(M, R_i),\qquad M = a - b\,R_m`,
    component: SDFTool,
  },
  {
    id: "ccapm", name: "CCAPM + 股权溢价之谜", short: "CCAPM & Equity Premium", nameEn: "Consumption CAPM & the Equity Premium Puzzle",
    formula: String.raw`M = \delta\left(\tfrac{C_{t+1}}{C_t}\right)^{-\gamma},\qquad R_f = -\ln\delta + \gamma\mu_c - \tfrac12\gamma^2\sigma_c^2,\qquad \text{ERP} \approx \gamma\,\rho\,\sigma_c\,\sigma_m`,
    component: CCAPMTool,
  },
  {
    id: "hj", name: "Hansen-Jagannathan 边界", short: "HJ Bound", nameEn: "Hansen-Jagannathan Volatility Bound on the SDF",
    formula: String.raw`\dfrac{\sigma(M)}{E(M)} \ \geq\ \dfrac{|E(R^e)|}{\sigma(R^e)} = \max\text{ Sharpe},\qquad E(M) = \dfrac{1}{1+R_f}`,
    component: HJBoundTool,
  },
  {
    id: "stateprice", name: "状态价格 / 风险中性测度", short: "State Prices", nameEn: "State Prices, SDF & Risk-Neutral Measure — Arrow-Debreu Foundations",
    formula: String.raw`p_j = \sum_s q_s\,x_{js},\quad q_s = \pi_s m_s,\quad \pi^*_s = \dfrac{q_s}{\sum_k q_k},\qquad p = \dfrac{E^{*}[x]}{1+R_f}`,
    component: StatePriceTool,
  },
  {
    id: "duality", name: "SDF–因子对偶", short: "SDF–Factor Duality", nameEn: "SDF ↔ Beta-Pricing Duality — Risk Prices vs Factor Loadings",
    formula: String.raw`m = 1 - b'(f - E f)\ \Longleftrightarrow\ E(R^e_i) = \beta_i'\lambda,\qquad b = \Sigma_f^{-1}\lambda`,
    component: SdfFactorDualityTool,
  },
  {
    id: "hjdist", name: "HJ 距离与模型比较", short: "HJ Distance", nameEn: "Hansen-Jagannathan Distance — Model Misspecification Diagnostics",
    formula: String.raw`\delta_{HJ} = \sqrt{\alpha'\,E[R R']^{-1}\,\alpha},\qquad \alpha = E(R^e) - \beta\lambda`,
    component: HJDistanceTool,
  },
  {
    id: "lrr", name: "长期风险 (Epstein-Zin)", short: "Long-Run Risk", nameEn: "Bansal-Yaron Long-Run Risk under Epstein-Zin Recursive Preferences",
    formula: String.raw`\theta = \dfrac{1-\gamma}{1-1/\psi},\quad m_{t+1} = \theta\ln\delta - \tfrac{\theta}{\psi}\Delta c_{t+1} + (\theta-1) r_{c,t+1}`,
    component: LongRunRiskTool,
  },
  {
    id: "habit", name: "习惯形成 (Campbell-Cochrane)", short: "Habit Formation", nameEn: "Campbell-Cochrane External Habit — Time-Varying Risk Aversion",
    formula: String.raw`S_t = \dfrac{C_t - X_t}{C_t},\qquad \gamma^{\text{eff}}_t = \dfrac{\gamma}{S_t},\qquad \bar S = \sigma\sqrt{\dfrac{\gamma}{1-\phi}}`,
    component: HabitTool,
  },
  {
    id: "disaster", name: "罕见灾难 (Rietz-Barro)", short: "Rare Disasters", nameEn: "Rietz-Barro Rare Disasters — Tail Risk and the Equity Premium",
    formula: String.raw`R_f = \dfrac{\delta^{-1} e^{\gamma g - \gamma^2\sigma^2/2}}{(1-p) + p\,(1-b)^{-\gamma}},\qquad \text{ERP} \approx \gamma\sigma^2\phi + p\,[(1-b)^{-\gamma}-1]\,[1-(1-b)^{\phi}]`,
    component: DisasterTool,
  },
  {
    id: "scoreboard", name: "三大谜题对照", short: "Puzzle Scoreboard", nameEn: "Puzzle Scoreboard — CRRA vs Long-Run Risk vs Habit vs Disasters",
    formula: String.raw`\dfrac{\sigma(m)}{E(m)} \ \geq\ \max\ \text{Sharpe} \approx 0.4,\qquad \text{ERP} \approx 6\%,\qquad R_f \approx 1\%`,
    component: PuzzleScoreboardTool,
  },
  {
    id: "cs", name: "Campbell-Shiller 分解", short: "Campbell-Shiller", nameEn: "Campbell-Shiller Decomposition & Long-Horizon Return Predictability",
    formula: String.raw`dp_t \approx \sum_{j\geq0}\rho^{j}\big(r_{t+1+j} - \Delta d_{t+1+j}\big),\qquad b_r - b_d + \rho\phi = 1`,
    component: CampbellShillerTool,
  },
  {
    id: "zoo", name: "因子动物园与高维筛选", short: "Factor Zoo", nameEn: "The Factor Zoo — PCA, Ridge / LASSO Shrinkage and Multiple-Testing Thresholds",
    formula: String.raw`\hat b^{\text{lasso}} = \arg\min_b \|R^e - Fb\|^2 + \lambda\|b\|_1,\qquad \text{HLZ: } |t| > 3.0`,
    component: FactorZooTool,
  },
  {
    id: "carry", name: "国际定价与货币 Carry", short: "Currency Carry", nameEn: "International Asset Pricing — UIP, Fama Regression & the Carry Trade",
    formula: String.raw`\Delta s_{t+1} = a + \beta\,(i^{*}_t - i_t) + \varepsilon,\qquad \text{UIP: }\beta = 1,\qquad \Delta s_{t+1} = \ln m^{*}_{t+1} - \ln m_{t+1}`,
    component: CarryTool,
  },
];

const CATEGORIES: ToolCategory[] = [
  { id: "noarb", label: "无套利基础", labelEn: "No-Arbitrage", toolIds: ["stateprice", "duality", "hjdist"] },
  { id: "equilibrium", label: "均衡定价", labelEn: "Equilibrium", toolIds: ["capm", "zerobeta", "icapm"] },
  { id: "factors", label: "因子与实证", labelEn: "Factors & Empirics", toolIds: ["apt", "famafrench", "famamacbeth", "anomaly", "grs"] },
  { id: "sdf", label: "现代框架 · SDF", labelEn: "Modern SDF", toolIds: ["sdf", "ccapm", "hj"] },
  { id: "puzzles", label: "谜题与结构模型", labelEn: "Puzzles & Structural", toolIds: ["lrr", "habit", "disaster", "scoreboard"] },
  { id: "frontier", label: "实证前沿", labelEn: "Empirical Frontier", toolIds: ["cs", "zoo", "carry"] },
];

const TOOL_IDS = TOOLS.map((t) => t.id);

const AssetPricingTools = () => {
  const { t: tr } = useTranslation();
  const [tool, setTool] = useToolTab<ToolId>(TOOL_IDS, "capm");
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
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">{tr("labs.assetPricing.title")}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            {tr("labs.assetPricing.intro")}
          </p>
        </motion.div>

        <CategorizedToolNav
          tools={TOOLS.map(t => ({ id: t.id, name: t.name, nameEn: t.short }))}
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