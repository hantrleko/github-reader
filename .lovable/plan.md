# V4.6 宏观经济学强化实验室

当前 `MacroTools.tsx` 已有 9 个经典模型（IS-LM / AD-AS / Phillips / Mundell-Fleming / Ramsey / Solow / 3-Eq NK DSGE / HANK / Real Options）。本次强化聚焦**政策分析、财政可持续性、汇率与外部平衡、金融加速器**四大现代宏观前沿领域，与已有模块形成互补而非重叠。

## 交付形态

新建 `/s/macro-lab` 路由（顶部导航「宏观」下拉新增「宏观高阶实验室」入口），四个 Tab 承载 6 个新工具，风格与 V4.5 固收实验室、V4.3 风险实验室完全一致（Recharts + Framer Motion + Tool Bus + Compare 模式）。原 `/s/macro` 页面保持不变。

## 新增工具（6 项）

### Tab 1 — 财政与债务动态
1. **政府债务可持续性 (Debt Sustainability Analysis)**
   - 核心方程：`b_{t+1} = ((1+r)/(1+g)) · b_t − s_t`
   - 交互：r、g、初始 b/GDP、基本盈余路径 → 输出 30 年债务/GDP 轨迹 + 稳定所需基本盈余 s\* = (r−g)·b
   - 情景：低利率陷阱 / r>g 债务螺旋 / 财政整顿

2. **Blanchard (r−g) 财政空间温度计**
   - 滚动计算 r−g，红/黄/绿三档；叠加 FRED 实时 10Y 名义利率与潜在增长率

### Tab 2 — 汇率与外部平衡
3. **Dornbusch 汇率超调模型**
   - 粘性价格 + 利率平价：货币冲击后名义汇率瞬间超调至 e\* > 长期均衡，随价格调整回归
   - 交互：货币扩张幅度、价格调整速度 θ → 汇率 / 价格 / 利率三面板 IRF

4. **BOP-IS-LM 三缺口分析**
   - S−I、T−G、CA 三缺口恒等式动态平衡；输入储蓄率/财政赤字/投资率 → 计算隐含经常账户

### Tab 3 — 金融加速器 & 非线性
5. **Bernanke-Gertler-Gilchrist 金融加速器**
   - 外部融资溢价 EFP = f(净值/资产)；负向净值冲击 → 投资放大衰退
   - 交互：杠杆、监督成本 μ、破产概率 → 投资-净值-产出 IRF 对比"无摩擦 RBC"基线

### Tab 4 — 政策规则与流动性陷阱
6. **零利率下限 (ZLB) & 前瞻指引 Puzzle**
   - NK 模型在 i_t = max(0, φ_π π_t + φ_x x_t) 约束下的求解
   - 展示：不同 ZLB 持续期对当前产出的非线性放大（"forward guidance puzzle"）
   - 反事实：QE / 财政乘数在 ZLB 下 vs 正常期

## 技术方案

**数学层** — 新建 `src/lib/quant/macroAdvanced.ts`：
- `debtDynamics(params, horizon)` — 差分方程迭代
- `dornbuschIRF(params)` — 闭式解 + 时间路径
- `bopGaps(s, i, tg)` — 三缺口恒等式
- `bggAccelerator(params)` — 简化 log-linear IRF
- `zlbNKSolve(params, zlbPeriods)` — 后向归纳求解 NK + ZLB
- 12+ Vitest 单元测试（`__tests__/macroAdvanced.test.ts`）

**UI 层** — 新建 `src/components/macro/V46MacroLab.tsx`：
- 四 Tab 布局 + 参数滑块 + Recharts 图（LineChart / AreaChart / ComposedChart）
- 接入 `ShareExportToolbar`、`useSharedState("macro-lab")`、`CompareToggle`
- Debt/Blanchard 工具可选接入 `fred-series` 拉取实时 GS10 / GDP 潜在增长

**接入点**：
- `src/lib/sections.ts` — 注册 `macro-lab` section
- `src/components/Navbar.tsx` — 宏观下拉新增入口
- `src/i18n/locales/{zh,en}.json` — 标题/描述
- `src/data/toolsCatalog.ts` — 6 个新工具登记（用于全局搜索）
- `CHANGELOG.md` + `Changelog.tsx` + `HeroSection.tsx` — V4.6 版本号 & 文案

## 不做

- 不重写现有 `MacroTools.tsx` 的 9 个经典模型
- 不新增边缘 Edge Function（复用现有 `fred-series`）
- 不改动全局主题/路由结构

预计交付：`macroAdvanced.ts`（~350 行）+ 测试 + `V46MacroLab.tsx`（~500 行）+ 6 处小改动文件。
