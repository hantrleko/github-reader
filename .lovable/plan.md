## 目标

把这篇「用一句话让 AI 写出量化策略，然后它证明我错了」的实录，作为**第二篇前沿长文**加入站点——与已有的《万亿美元的方程》并列，沿用同一套编辑体例（章节标号、导语、Callout、复现入口）。

关键立场：本站是研究平台，不做产品推广。因此这篇内容以**方法论案例研究**呈现，而不是软文：正文保留完整叙事与全部数字（含 -21.17%、-33.83%、-42% 回撤），但把落点放在「为什么价值+质量因子在 2022–2026 的大盘科技宇宙里结构性失效」「为什么 +1047% 的回测不是预测」这两个可以在本站工具里亲手复现的命题。外部工具只作为案例来源提及一次，不放推荐/返利链接。

## 呈现方式

新建 `src/components/essays/AiQuantStrategyEssay.tsx`，结构：

1. **报头（masthead）**——栏目标签 `FRONTIER ESSAY / AI × QUANT`、中英标题、一句导语、阅读时长。
2. **成绩单条（Scorecard strip）**——四张并排卡片，展示策略演进的四个版本：
   ```text
   V1 价值+质量  V2 反转信号   V3 +趋势过滤   基准
   -21.17%       +829.20%      +1047.39%      买入持有
   Sharpe -0.22  Sharpe 1.53   Sharpe 1.74    —
   MDD -33.83%   MDD -42%      MDD -40.53%    —
   ```
   回报为金色、回撤强制以红色同等字号显示，呼应原文「measured honestly」的要点。
3. **五章正文**（沿用 `H` 章节头 + `P` 段落 + `Callout` 体例）：
   - 01 一句话进，一个策略出——工作流拆解（读市场状态 → 选因子 → 写 Python → 回测）
   - 02 四笔交易的样本量陷阱——+3.47% / Sharpe 3.51 为何不是业绩记录
   - 03 结构性失效——价值+质量在大盘科技动量市里等于做空赢家
   - 04 反转与去掉空头腿——Sharpe 从 0.17 到 1.53 的来源分解
   - 05 冷水：回测不是预测——单一牛市窗口、40% 回撤、费用/滑点/资金费率
4. **两个方法论 Callout**：`SAMPLE SIZE`（4 笔交易的 Sharpe 置信区间近乎无意义）、`REGIME DEPENDENCE`（因子收益的条件性）。
5. **「在实验室里复现」入口网格**——链到站内既有工具：
   - `/s/backtest` 真实数据回测引擎（复现 V1/V3）
   - `/s/quant`（Walk-Forward 样本外检验 → 过拟合缺口；Fama-French 5 因子归因 → 拆解 V3 的收益来源；Kelly & 破产风险 → 40% 回撤下的仓位上限；Michaud 重采样前沿 → 参数不确定性）
   - `/s/calibration` 模型校准实验室
6. **免责声明条**——底部固定一行 “Backtest ≠ forecast. Not financial advice.”，与文中论点一致。

## 注册与导航

- `src/lib/sections.ts`：新增 section `id: "ai-quant-strategy"`，`chapter: "Frontier Essay"`、`kicker: "AI × Quant"`、`group: "前沿"`，lazy 引入新组件。首页「前沿」组目录卡与 `/s/ai-quant-strategy` 路由自动生效。
- `src/i18n/locales/zh.json` / `en.json`：补 `nav.items.ai-quant-strategy` 文案。
- 若 Navbar「前沿」下拉是硬编码列表，则同步加入该条目。
- 在《万亿美元的方程》页尾增加一张「下一篇长文」卡片，指向本文，形成长文序列。

## 技术细节

- 纯前端展示组件，无后端、无新依赖；沿用 `Reveal`、`framer-motion`、`EquationBlock`（仅在归因小节用一次 Fama-French 回归式）。
- 全部配色走语义 token（`text-gold`、`text-foreground/80`、`border-border/60`），回撤红色使用现有 destructive/rose token，不硬编码颜色。
- 数字表格用 `tabular-nums` + `font-mono`，与站内其它结果面板一致。
- 页面加 `Seo` 标题与描述（如与其它 section 页一致由 `SectionPage.tsx` 统一处理，则改在 `seoCopy.ts` 补一条，并确保 `scripts/check-copy-consistency.ts` 通过）。
- 版本号与 Changelog：作为 V5.1 内容更新，写入 `Changelog.tsx` 与 `CHANGELOG.md`，`package.json` 同步。
