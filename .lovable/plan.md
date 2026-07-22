# V4.7 行为金融与市场微观结构实验室

现有仅有 `ProspectTheoryTool`（价值函数 + 概率加权）一件"行为金融"工具，市场微观结构则完全缺席。本次新增一个独立路由 `/s/behavior-microstructure`，用两 Tab × 6 工具建立系统性覆盖，与既有 `FrontierConcepts` 展示型卡片互补（后者不动）。

## 交付形态

- 新 section `behavior-microstructure`，注册于 `src/lib/sections.ts`，`group: "理论"`；顶部导航「理论」下拉新增入口。
- 新组件 `src/components/behavior/V47BehaviorMicroLab.tsx`（约 550 行）：两 Tab、Recharts、Framer Motion、接入 `ShareExportToolbar` / `useSharedState("behavior-micro")` / `CompareToggle` / `PresetButtons`，风格与 `V45FixedIncomeLab` / `V46MacroLab` 完全一致。
- 新数学模块 `src/lib/quant/behaviorMicro.ts`（约 320 行）+ `__tests__/behaviorMicro.test.ts`（12+ 用例）。
- `toolsCatalog.ts`、i18n locales、`Changelog.tsx`、`CHANGELOG.md`、`HeroSection.tsx` 同步 V4.7。

## 新增工具（6 项）

### Tab 1 · 行为金融 (Behavioral Finance)

1. **心理账户 & 双曲贴现 (Mental Accounting & Hyperbolic Discounting)**
   - β-δ 准双曲贴现：`U = u₀ + β·Σ δᵗ uₜ`，与指数贴现对比展示"现时偏好"与偏好反转
   - 交互：β、δ、时间窗口 → 折现价值曲线 + 偏好反转点标记

2. **有限套利与噪声交易者风险 (DSSW 1990)**
   - `p = p* + (1+r)·μ·λ⁻¹ + noise`；噪声交易者情绪 ρ 冲击 → 均衡价格偏离与套利者持仓
   - 交互：ρ 波动率、套利者风险厌恶 → 定价误差 IRF、"聪明钱"份额演化

3. **过度自信 & 处置效应组合模拟 (Odean 1998 / Barber-Odean)**
   - 蒙特卡洛：过度自信信号精度膨胀因子 k > 1 → 换手率、alpha 净损失
   - 处置效应：`P(sell | gain) > P(sell | loss)`；绘制持有时间-收益散点

### Tab 2 · 市场微观结构 (Market Microstructure)

4. **Kyle (1985) 批量拍卖 & 信息知情度**
   - 均衡：`λ = σᵥ/(2σᵤ)`，知情交易量 `x* = (v−p₀)/(2λ)`，价格影响 `Δp = λ(x+u)`
   - 交互：私有信息方差 σᵥ、噪声流动性 σᵤ → λ、市场深度 1/λ、知情者利润

5. **Glosten-Milgrom & Roll (1984) 有效价差反推**
   - GM 序贯交易：知情者比例 α → 买卖价差 `S = 2α(V̄−V̲)/(1+α(2π−1))`
   - Roll 序列协方差估计：`ŝ = 2√(−cov(Δpₜ, Δpₜ₋₁))`；给定合成 tick 序列反推有效价差

6. **Almgren-Chriss 最优执行 & Amihud 非流动性**
   - 前沿：期望执行成本 vs 方差；闭式解 `xₜ = sinh(κ(T−t))/sinh(κT)·X`
   - 交互：永久/临时冲击 η、γ、风险厌恶 λ → 最优执行轨迹 + 有效前沿；同时展示 Amihud `ILLIQ = |r|/dollar_vol`

## 技术方案

**数学层** — `src/lib/quant/behaviorMicro.ts` 导出：
- `hyperbolicDiscount(beta, delta, T)` → 折现因子数组，含指数基线对比
- `dsswPriceIRF(params)` → 噪声交易者冲击下价格偏离时间路径
- `overconfidenceMC(params, N)` → 过度自信换手率与净 α 的 MC 分布
- `dispositionEffect(gains, losses, params)` → 卖出概率与持有分布
- `kyleEquilibrium({sigmaV, sigmaU, v, p0})` → { lambda, xStar, profit, depth }
- `glostenMilgromSpread({alpha, vH, vL, pi})` + `rollSpread(prices)`
- `almgrenChriss({X, T, N, eta, gamma, sigma, lambda})` → 轨迹 + 成本-方差前沿
- `amihudIlliq(returns, dollarVol)`

**测试**（`__tests__/behaviorMicro.test.ts`）：
- Kyle λ 在极限 σᵤ→∞ 时 →0（完全隐蔽）；恒等式 `λ·2·xStar = v−p₀`
- Almgren-Chriss 在 λ=0 时退化为线性 VWAP；κ 增大收缩执行窗口
- Roll 反推：对合成 bid-ask bounce 序列 recovery 误差 < 5%
- 双曲：β<1 时对 t=1 折扣 > 指数基线
- GM：α=0 时 spread=0

**UI 层** — `V47BehaviorMicroLab.tsx`：
- 两 Tab（行为 / 微观结构）+ 6 子工具卡片，参数滑块 + LineChart/ScatterChart/ComposedChart
- Almgren-Chriss 展示轨迹图 + 有效前沿双图；Kyle 展示深度-利润联动
- 每工具附 KaTeX 公式头部 + `PresetButtons` 3-5 个经典标定

**接入点**：
- `src/lib/sections.ts` — 注册 `behavior-microstructure`（`group: "理论"`, `chapter: "Chapter 8"`, `kicker: "Behavior & Microstructure"`）
- `src/components/Navbar.tsx` — 「理论」下拉新增「行为 & 微观结构实验室」
- `src/i18n/locales/{zh,en}.json` — 标题/描述
- `src/data/toolsCatalog.ts` — 6 个新工具登记（供全局搜索/Compare）
- `CHANGELOG.md` + `Changelog.tsx` + `HeroSection.tsx` — V4.7 版本号与"最新更新"文案

## 不做

- 不改动现有 `ProspectTheoryTool` / `FrontierConcepts`（前者作为"入门版"保留在 Frontier Concepts Lab）
- 不引入新的边缘 Edge Function（全部纯前端计算）
- 不改动主题、路由结构或既有模块

预计代码增量：`behaviorMicro.ts` ~320 行 + 测试 ~180 行 + `V47BehaviorMicroLab.tsx` ~550 行 + 6 处小改动。
