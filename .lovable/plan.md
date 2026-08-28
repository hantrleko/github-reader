# V6.5 新建「量化交易」一级域：以 Microsoft Qlib 为第一块内容

新增一个独立的一级域 **量化交易 Quant Trading**，把现有量化页面迁入，并以 Qlib（微软开源 AI 量化平台）作为该域的第一组新内容：一篇导读长文 + 一个可复现实验室。

## 一、域结构

新建 `quant-trading` 一级域，编号排在现有域之后。域内页面按学习层级排列：

```text
量化交易 Quant Trading
├─ 导读  量化策略导读        quant-theory        （迁入）
├─ 导读  Qlib 平台导读        qlib-guide          （新建）
├─ 进阶  Qlib 流水线实验室    qlib-lab            （新建）
├─ 进阶  量化策略实验室        quant               （迁入）
├─ 进阶  策略回测实验室        backtest            （迁入）
└─ 进阶  模型校准实验室        calibration         （迁入）
```

迁入只改 `group` 归属，路由 `/s/:id` 全部不变，书签与 sitemap 不受影响。

## 二、Qlib 导读页（qlib-guide）

按站内导读体例（分节 + 公式块 + 概念卡 + 延伸阅读）写，覆盖：

1. **它解决什么问题** — 从「手工拼因子脚本」到「端到端 AI 量化研究流水线」；Qlib 的定位与 RD-Agent 方向。
2. **分层架构** — 数据层（Calendar/Instrument/Expression Engine、二进制存储）→ 特征层（Alpha158 / Alpha360）→ 模型层（LightGBM、LSTM/GRU、Transformer、TFT）→ 组合层（TopK-Dropout）→ 执行与回测层（Nested Decision Execution）。
3. **Workflow 与 qrun** — YAML 声明式实验、Recorder / MLflow 实验管理、可复现性契约。
4. **核心指标口径** — IC、RankIC、ICIR、换手率、超额年化与信息比率的定义与公式。
5. **常见误用** — 前视偏误、标签泄漏、复权处理、样本内调参、交易成本缺省。
6. **与本站工具的对应关系** — 每一层链接到站内已有工具（回测、校准、组合、因子归因）。

页面顶部给出仓库出处链接（github.com/microsoft/qlib），说明本页是概念导读与可复现实现，不是 Qlib 的运行环境。

## 三、Qlib 流水线实验室（qlib-lab）

纯前端、可交互，用站内已有的计算库复现 Qlib 的研究闭环，共五个面板：

1. **Alpha158 风格因子构建器** — 从价量序列生成 ROC / MA 比值 / STD / RSV / 量比 / Beta 等一组表达式因子，展示因子矩阵与相关性热力图。
2. **标签与横截面标准化** — 未来 N 日收益标签、CSZScore / CSRank 处理，展示处理前后分布。
3. **IC / RankIC 评估** — 逐期 IC 序列、累计 IC、ICIR，以及分位数分层收益柱状图。
4. **TopK-Dropout 组合构建** — 参数 topk / n_drop / 调仓频率 / 双边成本，输出持仓演化与换手率。
5. **回测与归因** — 净值曲线、超额收益、年化 / 波动 / 夏普 / 最大回撤，以及成本前后对比。

数据源沿用站内已有价格通道（真实数据可拉取，失败回退合成数据），并接入 Tool Bus，可把结果参数发送到回测 / 组合工具。

## 四、配套更新

- 首页目录、顶栏下拉、命令面板、域主页 `/d/quant-trading` 自动跟随 `NAV_GROUPS` 更新。
- 术语表补充 IC、RankIC、ICIR、TopK-Dropout、Alpha158 词条；工具目录新增两条。
- 中英文案、SEO 文案、更新日志、版本号升至 **6.5.0**。

## 技术说明

- 新增 `src/lib/quant/qlibPipeline.ts`（因子生成、横截面处理、IC/RankIC/ICIR、TopK-Dropout 组合、绩效指标）并配 Vitest 单测。
- 新增 `src/components/quant/QlibLab.tsx` 与 `src/components/essays/QlibGuide.tsx`，在 `src/lib/sections.ts` 注册两个 section 及 `level` / `prereq`。
- `NAV_GROUPS` 新增 `quant-trading` 组，并把 `quant` / `backtest` / `calibration` / `quant-theory` 从原组移入；`sections.test.ts` 的唯一归属校验会自动覆盖。
- 同步 `zh.json` / `en.json`、`seoCopy.ts`（`check-copy-consistency.ts` 校验），并重跑 `generate-sitemap.ts`。
- 不新增后端函数，不引入新依赖。
