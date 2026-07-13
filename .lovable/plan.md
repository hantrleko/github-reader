# V4.0 时间序列升级扩充 · 四线并进（深广 3/5）

按你选的四个方向各补一个高价值工具，深度居中：每个工具都配可复现的纯函数、合成/真实数据双入口与 Tool Bus 联动，并统一登记到目录、命令面板、两级导航与版本日志。全部前端 + 数学实现，无后端/RLS 改动。

---

## 线 1 · 因果与滞后关系 —— 「Granger 因果 / Toda-Yamamoto」(`granger`)

- 双变量（可扩展至多变量）VAR，按 AIC/BIC 自动选滞后阶。
- 标准 Granger 因果 F/χ² 检验（双向：X→Y 与 Y→X）。
- **Toda-Yamamoto** 滞后增广法（VAR(p+d)，对前 p 阶做 Wald），对非平稳/协整序列稳健，规避先做单位根/协整的陷阱。
- 输出：双向因果判定表（统计量 + p 值 + 结论）、滞后阶选择曲线、两序列叠加图。

## 线 2 · 频谱与非线性 —— 「频谱分析与非线性检验」(`spectral`)

- 周期图（periodogram）与平滑谱密度（Bartlett/Parzen 窗），自动标注主导周期（如年度/季度节律）。
- 结构突变：Bai-Perron 型单断点搜索 + CUSUM 稳定性图。
- 非线性检验徽章：Tsay 门限非线性检验 / McLeod-Li（残差平方 ACF）。
- 输出：谱密度曲线（含峰值周期标注）、CUSUM 边界图、非线性检验结论摘要。

## 线 3 · 预测与评估 —— 「指数平滑预测实验室」(`expsmooth`)

- Holt-Winters / ETS（含加法/乘法季节）与 Theta 方法，季节周期可调。
- STL 型趋势-季节-残差分解可视化。
- **滚动样本外回测**：与季节朴素基准对比，输出 RMSE/MAE/MASE，并画预测区间。
- 输出：拟合+外推预测带图、分解三面板、滚动回测精度对比表。

## 线 4 · 长记忆与分数积分 —— 「长记忆 / ARFIMA」(`longmem`)

- 长记忆估计：GPH（log-periodogram 回归估 d）与 R/S 重标极差（Hurst 指数）。
- ARFIMA(0,d,0) 分数差分示范，展示 d∈(0,0.5) 长记忆、d≥0.5 非平稳。
- 合成数据生成器可造纯短记忆 vs 长记忆序列，直观对比 ACF 缓慢衰减。
- 输出：d 与 Hurst 估计（含置信区间）、log-periodogram 回归散点、ACF 衰减对比图。

---

## 共享逻辑与联动

- 新纯函数库 `src/lib/quant/tsAdvanced.ts`：集中放 VAR 拟合与滞后选择、Granger/Toda-Yamamoto Wald、周期图/平滑谱、Bai-Perron 单断点 + CUSUM、Holt-Winters/ETS/Theta 与滚动回测指标、GPH/R-S/分数差分。复用 `econometrics.ts` 的矩阵/OLS/p 值工具（`matInvert`、`olsDetail`、卡方/F/正态 CDF），避免重复实现。
- 配 `src/lib/quant/__tests__/tsAdvanced.test.ts`：用已知构造的 DGP 回收结论方向（Granger 有向↔无向、主导周期定位、季节序列 Holt-Winters 优于朴素、长记忆 d 显著>0）。
- Tool Bus：`granger`/`spectral`/`longmem` 可接收其他时间序列工具（ARIMA、单位根、GARCH）的序列输入；`expsmooth` 可把预测序列/分解结果发送到下游工具。
- 新增一条 Workflow 剧本：`真实序列 → 单位根 → Toda-Yamamoto 因果 → 指数平滑预测回测`，与既有剧本风格一致。

## 集成与登记

- 组件：新增 `src/components/econ/V40Tools.tsx`（四个工具集中实现，沿用现有 Slider/Chart 配色、PresetButtons 与 TestBadge 风格）。
- `EconometricsTools.tsx`：在 `TOOLS` 注册四个新工具，并全部归入 `ECON_CATEGORIES` 的 `timeseries` 类。
- `src/data/toolsCatalog.ts`：新增四个条目，并把全站版本升到 **V4.0**（含 version 联合类型）。
- 可发现性：登记进 `CommandPalette.tsx` 搜索索引与 `src/lib/sections.ts`（如涉及），确保 ⌘K 与 `/tools` 可搜到。
- 版本与日志：更新 `HeroSection.tsx` / i18n `en.json`·`zh.json` 的 `hero.latestUpdate`、`CHANGELOG.md` 与 `Changelog.tsx` 写入 V4.0 条目、V3.9 标记 Stable。

## 校验

`tsgo` 类型检查 + `vitest` 跑新 `tsAdvanced` 单测 + `check-copy-consistency` 文案一致性 + Playwright 截图核对四个新页签渲染与时间序列两级导航分类。

## 范围说明

本轮四条线各补一个工具、共用一个纯函数库，深广居中。如果你想把某条线做重（例如线 4 一次补 GPH+ARFIMA 全流程+TVP-VAR+BVAR），告诉我我再调整配比。