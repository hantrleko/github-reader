# 资产定价模块内容拓展方案

将「资产定价」板块从 4 个工具扩展到 11 个，覆盖你选中的全部四个方向，全部采用「完整」深度（LaTeX 公式 + 推导步骤 + 预设场景 + 交互图表 + 结论解读），与现有工具风格完全一致。工具变多后，把顶部平铺按钮升级为**两级分类导航**（复用 `CategorizedToolNav`，与计量/衍生品板块一致）。

纯前端与数学模拟工作，不涉及数据库或后端。新工具沿用现有 `V31AssetTools.tsx` 的组件基元（`Slider` / `Stat` / `Note` / `ChartCard` / `PresetButtons` / `mulberry32` 随机数）与 `@/lib/quant/ols`。

## 分类结构（两级导航）

```text
均衡定价 (Equilibrium)      因子与实证 (Factors & Empirics)
  · CAPM / SML                 · APT 多因子
  · Zero-Beta / Black CAPM     · Fama-French 3/5
  · ICAPM 跨期                  · Fama-MacBeth 两步法
                               · 异象排序组合
现代框架 (Modern / SDF)        · GRS 联合检验
  · 随机折现因子 SDF
  · CCAPM + 股权溢价之谜
  · Hansen-Jagannathan 边界
```

## 方向一：现代 SDF 统一框架（3 个新工具）

1. **随机折现因子 SDF** — `p = E[MX]`，以 `M = a − b·R_m` 参数化定价核；输入若干资产的收益/协方差，输出定价、隐含风险溢价 `−cov(M,R)/E[M]`、无风险利率 `1/E[M]`。图表展示定价核 M 随市场收益变化，并演示 CAPM / CCAPM 都是 SDF 的特例。
2. **CCAPM + 股权溢价之谜** — 幂效用 `M = δ(C_{t+1}/C_t)^{−γ}`；滑动风险厌恶 γ 与消费增长波动，输出模型隐含股权溢价与无风险利率，对比历史 ERP≈6%，直观呈现需要 γ≈50 才能匹配的「谜题」。
3. **Hansen-Jagannathan 边界** — 绘制 `σ(M)/E[M] ≥ max Sharpe` 的下界；用户拖动市场 Sharpe / 资产集，看合法定价核所需最小波动，叠加 CCAPM 校准点是否落在边界内。

## 方向二：CAPM 家族扩展（2 个新工具）

4. **Zero-Beta / Black CAPM** — 放松无风险资产假设，用零 β 组合收益 `E(R_z)` 替代 `R_f`；双 SML 对比图，展示实证中「更平坦的 SML」如何被零 β CAPM 解释。
5. **ICAPM 跨期** — Merton 多期设定，加入一个状态变量（投资机会集）风险因子；展示两因子定价线与对冲需求，说明多因子模型的理论来源。

## 方向三：实证异象与因子检验（2 个新工具）

6. **异象多空组合排序** — 模拟横截面股票池，按规模/价值/动量/低波动排序做 2×3 或十分位分组，构建多空组合，输出各分位平均收益、多空价差与 t 值（复现 SMB/HML/UMD 的构建逻辑）。
7. **GRS 联合检验** — 对一组测试组合回归因子模型，计算 Gibbons-Ross-Shanken F 统计量联合检验所有 α=0，输出 F 值、p 值与结论（因子模型是否被拒绝），配 α 散点图。

## 方向四：深化现有 4 个工具

- **CAPM**：增加**滚动 β 估计**演示（时变 β 的估计不确定性）与 β 的置信区间。
- **Fama-French / Fama-MacBeth**：为估计系数补上 95% 置信区间条形图；新增更多预设场景（弱因子、多重共线）。
- **APT**：增加因子数从 3 扩到最多 5 的可配置暴露，并显示无套利残差。
- 统一为所有工具补充 `EquationBlock` LaTeX 公式头与推导 `Note`（部分现有工具仅有纯文本公式）。

## 技术实现

- 新建 `src/components/asset/SDFTools.tsx`（SDF / CCAPM / HJ）、`src/components/asset/CapmFamilyTools.tsx`（Zero-Beta / ICAPM）、`src/components/asset/AnomalyTools.tsx`（异象排序 / GRS）；深化改动落在现有 `V31AssetTools.tsx`。
- 所需数学（GRS F 统计、幂效用矩、HJ 边界、多空分组）作为纯函数放入 `src/lib/quant/assetPricing.ts` 并加 `__tests__` 单测（沿用现有 vitest 约定）。
- 改造 `src/components/AssetPricingTools.tsx`：`TOOLS` 数组扩到 11 项并加 `category` 字段，用 `CategorizedToolNav` 渲染两级导航；保留 `ShareExportToolbar` / `useSharedState` 分享与状态同步。
- 更新 `src/data/toolsCatalog.ts` 补 7 条新工具卡片；`src/data/topicsData.ts` 里把已有理论知识点通过 `tool` 字段链接到对应新工具（SDF / CCAPM / HJ / 异象等目前无链接）。
- 版本号：升到 **V3.6**，同步更新 `HeroSection.tsx`、`i18n` 语言包、`Changelog.tsx` 与 `CHANGELOG.md`（条目：资产定价深化——SDF 统一框架 / CAPM 家族 / 实证异象）。
- 校验：`tsgo` 类型检查 + vitest 跑新单测；Playwright 截图核对新分类导航与各工具图表渲染。

## 范围说明

全部为模拟/理论交互工具（与现有 CAPM/FF/FM 一致，用可控 DGP 演示原理），不接入实时行情，保证数值可复现、教学结论清晰。