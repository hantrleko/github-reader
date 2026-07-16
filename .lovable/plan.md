
# V4.3 风险管理模块强化

## 现状盘点

`src/components/risk/` 与 `RiskTools.tsx` 已实现：VaR (Hist/Param/MC)、Merton 结构违约、Copula 依赖、EVT-POT、ES Backtest、Stress、CVA/XVA、Credit Copula。

**缺口**：系统性风险、流动性风险、监管资本 (FRTB)、操作风险、反向压力测试、集中度/风险贡献。

## 目标：新增 6 个前沿工具

### 1. 系统性风险 (CoVaR / ΔCoVaR / MES / SRISK)
- Adrian & Brunnermeier CoVaR — 分位数回归求条件 VaR
- Acharya et al. MES (Marginal Expected Shortfall) 与 SRISK = k·Debt − (1−k)·(1−LRMES)·Equity
- 输入：机构与市场收益序列 (合成或用户上传)
- 输出：CoVaR / ΔCoVaR 柱状图、SRISK 排名、系统性重要性排序

### 2. 流动性调整 VaR (LVaR + Almgren-Chriss 最优清算)
- 外生流动性成本：LVaR = VaR + ½·|Position|·bid-ask spread
- 内生：Almgren-Chriss 最优清算轨迹，最小化 E[Cost] + λ·Var[Cost]
- 输出：清算路径曲线、成本-风险有效前沿、λ 敏感度

### 3. FRTB 监管资本 (IMA Expected Shortfall + DRC)
- 97.5% ES on stressed period，跨流动性区间 (10/20/40/60/120d) scaling
- IMCC = ρ·IMCC(全)  + (1−ρ)·Σ IMCC(bucket)
- P&L attribution test (Spearman + KS) 和 backtesting (Kupiec + Christoffersen 综合灯)
- 输出：ES 分解、Basel 交通灯、资本占用

### 4. 操作风险 LDA (Loss Distribution Approach)
- 频率：Poisson(λ)；严重度：Lognormal 或 GPD
- Monte Carlo 卷积得年度总损失分布 → 99.9% OpVaR (Basel III AMA)
- 输出：分布直方图、VaR/ES 分位、按业务线聚合

### 5. 反向压力测试 (Reverse Stress Testing)
- 给定目标损失 L*，求最不利但仍可信的因子冲击 (Mahalanobis 距离最小)
- 因子协方差 Σ，冲击 δ = argmin δᵀΣ⁻¹δ  s.t.  bᵀδ = L*
- 闭式解：δ* = (L*/bᵀΣb)·Σb；可信度得分 = δ*ᵀΣ⁻¹δ*
- 输出：因子冲击表 + 情景可信度

### 6. 集中度风险 & 风险贡献 (HHI + Component VaR + Euler)
- Herfindahl-Hirschman Index 与有效分散度 1/Σwᵢ²
- Component VaR：CVaRᵢ = wᵢ·∂VaR/∂wᵢ = wᵢ·(Σw)ᵢ/σₚ·zα
- Euler 分配：Σ CVaRᵢ = VaR
- 输出：贡献瀑布图、边际 VaR 热力图

## 落地结构

### 新数学库 `src/lib/quant/riskAdvanced.ts`
- `computeCoVaR(returnsMkt, returnsI, alpha)` — 分位数回归
- `computeMES_SRISK(retsMkt, retsI, marketCap, debt, k)`
- `almgrenChriss(X, T, N, sigma, eta, lambda)` — 最优清算轨迹
- `frtbES(pnl, alpha=0.975, liquidityBuckets)` + `basel Traffic Light`
- `ldaOpVaR(lambda, mu, sigma, nSims)` — 卷积模拟
- `reverseStressTest(Sigma, b, Lstar)`
- `componentVaR(weights, Sigma, alpha)` — Euler 分解

### 新 UI `src/components/risk/V43Tools.tsx`
六个 Tool 组件，复用 `Slider` / `Stat` / `PresetButtons` / `ShareExportToolbar`，Recharts + gold 主题。

### 挂载
- `RiskTools.tsx`：`ToolId` 追加 6 条；引入两级分类导航 (`CategorizedToolNav`)：
  ```
  信用风险：   merton, cva, credit_copula
  市场风险：   var, evt, esback, frtb
  依赖与尾部： copula
  流动性：     lvar
  系统性：     systemic
  操作风险：   opvar
  情景与集中： stress, reverse_stress, concentration
  ```
- `src/data/toolsCatalog.ts` 追加 6 条元数据 (zh/en, category="risk", version="V4.3")

### 测试 `src/lib/quant/__tests__/riskAdvanced.test.ts`
- CoVaR 随 ρ 单调
- MES ≥ Unconditional ES
- Almgren-Chriss：λ→0 退化为 TWAP；λ↑ 收敛于立即清算
- Reverse stress: δ*ᵀΣ⁻¹δ* 与 L*² 成正比
- Component VaR 求和等于总 VaR
- LDA 均值 ≈ λ·E[X]

### 版本与文档
- `package.json` bump → `4.3.0`；`src/lib/buildVersion.ts` 更新
- `CHANGELOG.md` + `src/components/Changelog.tsx` 新增 V4.3 条目
- `src/i18n/locales/{en,zh}.json`：
  - `hero.latestUpdate.label` → "Latest Update · V4.3"
  - `hero.latestUpdate.description` 改写为六大风险工具摘要
  - `nav.version` → "V4.3"
  - 6 个新工具 nav 键 (可选)

## 交付顺序（一次实现）

1. `riskAdvanced.ts` + 单元测试
2. `V43Tools.tsx` 六个 UI 组件
3. `RiskTools.tsx` 分类导航 & 注册
4. `toolsCatalog.ts` / i18n / changelog / buildVersion / package.json
5. `tsgo` + `vitest run` 通过

## 技术细节

- **CoVaR**：对 R_sys 关于 R_i 分位数回归，取 α=5% 分位截距+斜率·VaR_i(α)。ΔCoVaR = CoVaR|distress − CoVaR|median。
- **SRISK**：LRMES ≈ 1 − exp(−18·MES)（Brownlees-Engle 近似）。
- **Almgren-Chriss 闭式**：x_k = X·sinh(κ(T−t_k))/sinh(κT)，κ = √(λσ²/η)。
- **FRTB ES**：ES_{97.5} 用左尾 2.5% 均值；LH scaling: ES_liq = √(Σ (ES_j)²·(LH_j−LH_{j−1})/10)。
- **Reverse Stress 闭式**：拉格朗日 → δ* = (L*/bᵀΣb)·Σb。
- **Component VaR**：假设正态，VaR = z_α·√(wᵀΣw)；MCᵢ = z_α·(Σw)ᵢ/σₚ。
