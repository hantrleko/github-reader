# V3.8 计量经济学模块强化 · 四线并进（深广 3/5）

按你选的四个方向各补一个高价值工具，深度居中：每个工具都配可复现的纯函数、真实/合成数据双入口与 Tool Bus 联动，并统一登记到目录、命令面板、两级导航与版本日志。全部前端 + 数学实现，无后端/RLS 改动。

---

## 线 1 · 模型诊断与稳健推断 —— 「回归诊断台」

现有工具几乎没有"诊断层"。新增一个统一诊断工具 `diagnostics`：

- 输入一组 OLS 回归（可粘贴数据或用内置生成器造异方差/自相关/共线性场景）。
- 输出：
  - 异方差：Breusch-Pagan 与 White 检验（统计量 + p 值 + 判定）
  - 自相关：Durbin-Watson 与 Breusch-Godfrey（LM）
  - 多重共线性：各回归元 VIF + 条件数
  - 设定检验：Ramsey RESET
  - 稳健推断：普通 SE vs 稳健 HC0/HC3 vs Newey-West(HAC) SE 三列对比表
- 可视化：残差-拟合散点、残差 ACF 条图。

## 线 2 · 面板与动态 GMM 深化 —— 「动态面板 GMM (Arellano-Bond)」

新增 `dynpanel`：差分 GMM / 系统 GMM 估计含滞后被解释变量的动态面板。

- 合成面板生成器（N 个体 × T 期，可调 ρ、个体效应方差）演示 OLS/FE 在动态面板下的偏误。
- 输出：Pooled OLS、FE、差分 GMM 三种 ρ 估计对比（凸显 Nickell bias 与 GMM 纠偏）、Hansen J 过度识别检验、AR(1)/AR(2) 残差自相关检验。

## 线 3 · 时间序列预测与检验 —— 「预测精度对比 (Diebold-Mariano)」

新增 `dmtest`：对两套预测做样本外精度显著性检验。

- 内置两个竞争预测器（如随机游走 vs AR(1)/指数平滑）在合成或粘贴序列上滚动预测。
- 输出：MSE/MAE 损失、损失差分序列、Diebold-Mariano 统计量（HAC 修正）+ p 值、Harvey 小样本修正版，判定谁显著更优。

## 线 4 · 非参数与半参数 —— 「核回归 / 局部多项式」

新增 `kernelreg`：Nadaraya-Watson 与局部线性(LOESS)平滑。

- 可调带宽 h（含 Rule-of-Thumb 与留一交叉验证 CV 最优 h），核函数可选（高斯/Epanechnikov）。
- 输出：拟合曲线 + 逐点置信带、真实函数对比、CV(h) 曲线，直观展示欠/过平滑与偏差-方差权衡。

---

## 共享逻辑与联动

- 新纯函数库 `src/lib/quant/econometrics.ts`：集中放 BP/White/DW/BG/VIF/RESET、HC3 与 Newey-West SE、差分 GMM、Diebold-Mariano、NW/局部线性 + CV 带宽。配 `src/lib/quant/__tests__/econometrics.test.ts` 用已知构造回收参数/统计量。
- Tool Bus：诊断台可接收其他回归工具的 β/数据；核回归可把平滑序列/带宽发送到时间序列工具。
- 新增一条 Workflow 剧本：`真实数据 → OLS → 回归诊断 → 稳健 SE 重估`，与既有剧本风格一致。

## 集成与登记

- 组件：新增 `src/components/econ/V38Tools.tsx`（四个工具集中实现，沿用现有 Slider/Chart 配色与 PresetButtons 风格）。
- `EconometricsTools.tsx`：在 `TOOLS` 注册四个新工具，并在 `ECON_CATEGORIES` 归类（diagnostics→新增"诊断/稳健"类或并入现有；dynpanel→离散选择/面板；dmtest→时间序列；kernelreg→新增"非参数"类）。
- `src/data/toolsCatalog.ts`：新增四个条目并把全站版本升到 **V3.8**（含 version 联合类型）。
- 可发现性：登记进 `CommandPalette.tsx` 搜索索引与 `src/lib/sections.ts`（如涉及），确保 ⌘K 与 `/tools` 可搜到。
- 版本与日志：更新 `HeroSection.tsx` / i18n `en.json`·`zh.json` 的 `hero.latestUpdate`、`buildVersion.ts`，`CHANGELOG.md` 与 `Changelog.tsx` 写入 V3.8 条目、V3.7 标记 Stable。

## 校验

`tsgo` 类型检查 + `vitest` 跑新 `econometrics` 单测 + Playwright 截图核对四个新页签渲染与两级导航分类。

## 范围说明

本轮四条线各补一个工具、共用一个诊断/推断纯函数库，深广居中。如果你想把某条线做重（例如线 2 一次补差分 GMM+系统 GMM+Hausman 全套），告诉我我再调整配比。