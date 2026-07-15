
# V4.2 衍生品定价模块强化

## 现状盘点

`src/components/deriv/` 已覆盖：SVI 曲面、Heston、SABR、SABR-Heston 对比、Dupire 局部波动、Greeks Desk、CRR 二叉树、LSM 美式、Black-76 利率衍生品、LMM Bermudan、路径依赖奇异（亚式/障碍/回望）。

**缺口**：跳跃扩散 / 方差衍生品 / 有限差分 PDE / 对冲 P&L 归因 / 结构化票据 / 交易对手信用估值 (XVA)。

## 目标：新增 6 个前沿工具

### 1. Merton & Kou 跳跃扩散模型
- Merton 对数正态跳跃 + Kou 双指数跳跃闭式解（级数收敛）
- 与 BS 平滑对比：短期深度 OTM smile 显著抬升
- 输出：跳跃前后 IV smile 曲线、跳跃分量 λ、μ_J、σ_J 敏感度

### 2. Bates（Heston + Jumps）+ Variance/Volatility Swaps
- Bates SVJ Monte Carlo 定价
- Variance Swap 公允方差 K_var = 2·∫(1/K²)·[Put+Call] 的模型自由复制公式
- VIX 风格：30 天前瞻方差与 realized 方差对比
- 输出：波动率期限结构 + 方差风险溢价 (VRP)

### 3. 有限差分 PDE 求解器 (Crank-Nicolson)
- 求解 Black-Scholes PDE：∂V/∂t + ½σ²S²∂²V/∂S² + rS∂V/∂S − rV = 0
- 支持欧式/美式（PSOR 投影 SOR）与障碍期权 (Down-and-Out)
- 输出：价格网格热力图、与解析解误差收敛阶
- 验证：CN 二阶收敛，与 BS 闭式解对齐至 4 位小数

### 4. 动态 Delta-对冲 P&L 归因实验室
- 蒙特卡洛路径下按 Δt 重新对冲
- P&L 分解：Gamma-Theta 平衡 (½Γ(dS)² + Θdt)、Vega × dσ、离散对冲误差
- 交互：对冲频率、真实波动率 vs 定价隐波、交易成本
- 输出：P&L 分布直方图、归因瀑布图

### 5. Autocallable / 可赎回结构化票据
- 每次观察日：若 S ≥ 自动赎回障碍 → 提前赎回赔付
- 到期若 S < 敲入障碍 → 承担下行；否则票息
- Monte Carlo + 提前赎回概率曲线、期望存续期
- 敏感度：观察频率、票息水平、敲入/自动赎回位置

### 6. XVA 计算器 (CVA / DVA / FVA)
- 简化 Merton-based 违约强度 λ(t) = −ln(1−PD)/T
- CVA = (1−R)·∫ EE(t)·dPD(t)·D(0,t)
- 双边 DVA + 资金成本 FVA (借贷利差)
- 应用于利率互换/远期组合的暴露曲线
- 输出：EE / PFE (Potential Future Exposure 95%) 曲线 + CVA 分解条形图

## 落地结构

### 新增数学库 `src/lib/quant/derivAdvanced.ts`
- `mertonJumpPrice(...)` / `kouJumpPrice(...)` → 级数求和闭式
- `batesMCPrice(...)` / `varianceSwapFairStrike(...)`
- `crankNicolsonBS(...)` / `psorAmerican(...)` / `pdeBarrier(...)`
- `hedgePnLSimulate(...)` → { paths, attribution }
- `autocallablePrice(...)` → { price, callProb[], expectedLife }
- `cvaCompute(...)` / `dvaCompute(...)` / `fvaCompute(...)`

### 新增 UI `src/components/deriv/V42Tools.tsx`
六个 Tool 组件，复用 `PresetButtons` / `Slider` / `Stat` / `EquationBlock` / `ShareExportToolbar`，Recharts + gold 主题，遵循 Bloomberg-editorial 记忆规范。

### 挂载
- `src/components/DerivativesTools.tsx`：`TOOLS` 追加 6 条，`DERIV_CATEGORIES` 新增分类：
  ```
  跳跃与方差： jump, bates_var
  数值方法：   pde
  交易与结构： hedge_pnl, autocall, xva
  ```
- `src/data/toolsCatalog.ts` 追加 6 条元数据（zh/en, category = "derivatives"）
- Command palette / workflows 自动接入（读 catalog）

### 测试 `src/lib/quant/__tests__/derivAdvanced.test.ts`
- Merton 在 λ→0 时收敛到 BS
- Crank-Nicolson 欧式看涨与 BS 差异 < 1e-3
- PSOR 美式看跌 ≥ 欧式看跌（早行权溢价 ≥ 0）
- Variance swap 复制价 vs Heston 理论方差一致性
- Autocallable：提前赎回概率随敲出障碍下降而上升
- CVA 随违约概率单调增

### 版本与文档
- `package.json` bump → `4.2.0`
- `src/components/Changelog.tsx` + `CHANGELOG.md`：V4.2 条目
- `src/lib/buildVersion.ts` 更新
- i18n `en.json` / `zh.json` 新增 6 个工具名/描述键

## 技术细节

- **Merton 级数**：C = Σ e^{-λ'T}(λ'T)^n/n! · BS(S, K, T, r_n, σ_n)，其中 λ' = λ(1+m)，r_n = r − λm + n·ln(1+m)/T，σ_n² = σ² + n·δ²/T。截断至 n=40。
- **CN 稳定性**：θ = 0.5 无条件稳定；网格 S ∈ [0, 4S₀]，NS=200，NT=200。
- **PSOR**：ω = 1.2，容忍 1e-8，每步投影 V ≥ payoff。
- **Bates MC**：Milstein 方差正性截断 + 泊松跳跃复合，10⁴ 路径。
- **Autocallable**：反向遍历观察日，未赎回路径累积票息，敲入触发时到期按 min(S_T/S_0, 1) 结算。
- **CVA/DVA/FVA**：暴露从利率互换 MTM 蒙特卡洛得出，PD 通过 λ(t) hazard 模型指数化，折现使用 OIS 曲线。

## 交付顺序（一次实现）

1. `derivAdvanced.ts` + 测试
2. 六个 UI 工具组件 + `DerivativesTools.tsx` 分类导航更新
3. `toolsCatalog.ts` / i18n / changelog / buildVersion / package.json
4. `tsgo` 类型校验 + `vitest run` 通过
