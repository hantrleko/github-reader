## 下一步方案 — V2.0 路线图

V1.9 已落地 5 大模型（Heston / Hull-White+Bootstrap / ES-Backtest / Risk Parity-HRP / Logit-Probit）。下一阶段建议从"完整学科覆盖"角度补齐三大模块缺口，并首次开辟**宏观经济学**板块。

---

### 推荐 5 个新模型（按优先级）

#### 1. SABR 模型（衍生品）— ⭐最高优先级
- **缺口**：Heston 解决股指 smile，但 IR/Swaption 行业用 SABR
- **实现**：Hagan 隐含波动率近似公式（封闭解，无需 MC）
- **可视化**：β、ρ、ν 三参数对 smile 形状的影响 + 与 Heston 对比
- **公式**：`dF = σF^β dW₁, dσ = νσ dW₂, Corr=ρ`

#### 2. Local Volatility (Dupire)（衍生品）
- **缺口**：与已有 SVI 曲面工具天然衔接，从 IV 反推 σ(S,t)
- **实现**：Dupire 公式数值微分 + 局部波动率热图
- **公式**：`σ²_loc(K,T) = (∂C/∂T) / (½K² ∂²C/∂K²)`

#### 3. Solow 增长模型（宏观 — 新模块）
- **缺口**：完全未覆盖宏观经济学
- **实现**：资本动力学迭代 `k̇ = sf(k) − (n+δ)k`，黄金率求解
- **可视化**：稳态收敛路径、储蓄率对比、跨国收敛
- **新建**：`src/components/MacroTools.tsx` + Index.tsx 新增 Chapter 7

#### 4. Quantile Regression（计量）
- **缺口**：OLS 只看条件均值，分位数回归看尾部
- **实现**：线性规划（单纯形）求解多个分位数 τ ∈ {0.1, 0.25, 0.5, 0.75, 0.9}
- **可视化**：分位数路径图 + 与 OLS 对比异方差识别

#### 5. Greeks 完整工作台（衍生品）
- **缺口**：分散在各工具，缺统一 Δ/Γ/Vega/Θ/ρ/Vanna/Volga 视图
- **实现**：BS 解析 + 数值检验，热图覆盖 (S,T) 平面
- **价值**：交易台日常工具，教学直观

---

### 技术细节

| 模型 | 主要算法 | 文件 |
|------|---------|------|
| SABR | Hagan 2002 公式 | `deriv/SABRTool.tsx` |
| Local Vol | Dupire 数值差分 | `deriv/LocalVolTool.tsx` |
| Solow | RK4/Euler + 黄金率求解 | `macro/SolowTool.tsx` + `MacroTools.tsx` |
| Quantile | 内点法/Frisch-Newton | `econ/QuantileRegTool.tsx` |
| Greeks | BS 解析 + 有限差分 | `deriv/GreeksDeskTool.tsx` |

每个工具沿用现有标准：preset 系统 / LaTeX 公式 / 中文教学卡 / 可视化 + 稳健性检验。

宏观板块完成后，学科覆盖将达到：**衍生品 / 固收 / 风险 / 量化 / 利率 / 计量 / 宏观** 共 7 大模块。

---

### 请确认

- **批准全部 5 个**，还是只挑其中几个（回复编号 e.g. "1, 3, 5"）？
- 宏观模块是否**单独建 Chapter 7**（推荐），还是先暂缓只做衍生品+计量？
- 完成后是否直接发布 **V2.0**（含宏观开新板块作为里程碑）？
