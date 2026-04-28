# V1.6 — 一致性、深度、可用性

承接 V1.5，本次不引入大型新功能，专注把已有的优秀基础设施铺满全站，并对公式渲染、移动端、图表交互做精细打磨。

---

## 1. FormulaCodeView 推广（公式 | Python | 结果 三联视图）

目前只有 `BondCalculator` 接入。本次扩展到全部主力计算器：

| 计算器 | 公式 | Python 片段要点 |
|---|---|---|
| `CalculatorSection`（Black-Scholes） | BS call/put 闭式解 | `scipy.stats.norm.cdf`、d1/d2 |
| `ImpliedVolTool` | Newton-Raphson 求 σ | 迭代循环 + vega 导数 |
| `MCOptionPricer` | GBM 终值期望 | `np.random.normal` 路径 + 折现 |
| `EfficientFrontier` | μ-σ 二次规划 | 协方差矩阵 + `np.linalg.solve` |
| `RateModelSimulator` | Vasicek/CIR Euler 离散 | `dr = κ(θ-r)dt + σ √r dW` |
| `RiskTools`（VaR/ES） | 历史/参数法 VaR | `np.percentile` / `norm.ppf` |
| `EconometricsTools`（OLS/GARCH 任选 1-2 个） | OLS β=(X'X)⁻¹X'y | `np.linalg.lstsq` |

每个 Python 片段都用当前参数做模板插值，与 Bond 风格保持一致。

## 2. CompareToggle 真正落地（A/B 对比）

`useCompareState` hook 已就绪。本次给 3 个最适合对比的计算器接入：

- **Black-Scholes**：A vs B 的 Greeks 表 + 价格曲线叠加（不同颜色）
- **Bond**：两套 (coupon, ytm, maturity) 的现金流图与 duration/convexity 并排
- **EfficientFrontier**：两条前沿曲线叠加（如不同风险厌恶系数 / 是否允许做空）

UI 模式：在 `ShareExportToolbar` 旁加 `CompareToolbar`，B 参数面板折叠在 A 下方，结果区双列对比。

## 3. useCalcHistory 可视化（历史 / 收藏抽屉）

新建 `src/components/common/HistoryDrawer.tsx`：

- 触发按钮放在每个计算器工具栏（图标 `History`）
- 用 shadcn `Sheet` 从右侧滑出
- 列出最近 10 条 + 收藏，每条显示 label、时间、参数摘要
- 操作：⭐ 收藏 / 应用 / 删除
- 在所有接入 ShareExportToolbar 的计算器（8 个）中加入"保存当前参数"按钮 + 抽屉入口

## 4. KaTeX 公式美化

- 在 `index.css` 增加 `.katex` 全局样式：统一字号 (`1.05em`)、行距、色值随 theme 自适应（暗色 `text-foreground/95`，金色公式编号）
- 修复暗色模式下分式横线偏灰的问题（`color: currentColor`）
- 给 `BlockMath` 包装一个工具组件 `EquationBlock`：长公式自动横向滚动、点击复制 LaTeX 源码、可选编号
- 全站所有 `BlockMath` 替换为 `EquationBlock`（grep 出来批量改）

## 5. 移动端 375px 复查

走查并修复：

- Navbar：确认折叠菜单关闭时不溢出，版本徽章在窄屏隐藏
- 计算器输入：网格强制 `grid-cols-1` < 480px
- KaTeX 长公式：外层 `overflow-x-auto` 兜底
- Footer 4 列：< 640px 改为 2 列，<400px 改为 1 列
- HeroSection：标题字号梯度（`text-4xl sm:text-5xl md:text-7xl`）
- CommandPalette：底部安全区适配
- Onboarding 卡片：宽度 `max-w-[92vw]`

## 6. 版本号同步到 V1.6

- `src/i18n/locales/{en,zh}.json` Navbar badge
- `src/pages/Index.tsx` Footer
- `src/components/Changelog.tsx` 新增 V1.6 条目，V1.5 转为 Stable

---

## 技术细节

**新增文件**
- `src/components/common/HistoryDrawer.tsx`（Sheet + 列表 + 操作）
- `src/components/common/EquationBlock.tsx`（KaTeX 包装 + 复制 + 滚动）

**修改文件**
- `src/index.css`：`.katex` 全局样式 + 移动端工具类
- 8 个计算器：接入 FormulaCodeView（按表）、HistoryDrawer 触发按钮
- 3 个计算器：额外接入 CompareToggle（BS / Bond / Frontier）
- 全站 `BlockMath` → `EquationBlock`（约 30+ 处，用 ripgrep 批量定位）
- `Navbar.tsx`、`HeroSection.tsx`、`Index.tsx` Footer：移动端 className 调整
- 版本号 4 处同步

**不做**（留给后续版本）
- 真实数据缓存层、AI 助教、PDF 笔记导出、知识图谱 — 工作量大，独立立项
- 图表交互升级（十字光标 / SVG 导出）— 放到 V1.7，避免本次范围爆炸

**预期效果**
- 教学闭环：每个计算器都能看到「数学 → 代码 → 结果」
- 探索闭环：保存 → 收藏 → 重新加载 → A/B 对比
- 视觉一致：公式在暗/亮模式下都精致，移动端不破版

确认无误请回复"开始"，我切到默认模式开工。
