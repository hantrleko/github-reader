# V6.1 市场微观结构补全 — 从做市商库存到订单簿与市场设计

依据上传的《市场微观结构理论与方法框架报告》，当前站点仅在 `/s/behavior-microstructure` 覆盖了 Kyle、Glosten-Milgrom、Roll、Almgren-Chriss、Amihud 五个模型，报告中的库存模型、PIN/VPIN、限价订单簿动力学、价差与信息份额度量、市场设计与韧性均缺失。本次补齐为一个完整版块。

## 一、新增模型层（`src/lib/quant/microstructure.ts` + 单测）

1. **库存模型**：Garman 存货流、Stoll 价差分解（订单处理/库存/逆向选择三成分）、Ho-Stoll 最优报价偏移（库存偏离 → 报价"歪斜"）。
2. **信息交易概率**：Easley-O'Hara PIN（EHO 似然，α、μ、ε 网格/数值优化）与 Easley 等 VPIN（成交量桶 + 订单流毒性时间序列）。
3. **限价订单簿**：make-or-take 决策（限价单的自由交易期权价值 vs 市价单即时成本）、排队价值与成交概率、零智能订单簿仿真（限价/市价/撤单三泊松流 → 价差与深度分布）、Hawkes 自激成交强度。
4. **价差与成本口径**：报价价差、有效价差、已实现价差、价格冲击分解（effective = realized + impact）、Corwin-Schultz 高低价估计、Lee-Ready / tick rule 成交方向标注及误判率。
5. **市场冲击**：临时 vs 永久冲击分解、平方根冲击定律（impact ∝ σ√(Q/V)）与 Almgren 校准形式对比。
6. **价格发现**：Hasbrouck VAR/VECM 信息份额上下界与 Gonzalo-Granger 共同因子权重（两市场同一资产），加上交易信息含量（永久冲击占比）。
7. **市场设计与韧性**：最小报价单位（tick size）对价差/排队/深度的机制影响、集合竞价 vs 连续交易的价格发现对比、熔断/波动中断触发仿真、暗池分流对显示流动性的影响、流动性蒸发（韧性半衰期）情景。
8. **成本进入定价**：Amihud-Mendelson 流动性溢价与换手率-持有期均衡（交易成本如何折进预期收益）。

每个函数配 Vitest 断言（极限行为、恒等式、单调性），与现有 `behaviorMicro.test.ts` 风格一致。

## 二、新增实验室 `/s/microstructure-lab`（`src/components/micro/V61MicrostructureTools.tsx`）

沿用现有两层分类导航 + Recharts 的实验室模式，分五组共 12 个交互面板：
- 做市与库存（Stoll 分解、Ho-Stoll 报价偏移）
- 信息与毒性（PIN 估计、VPIN 时序、GM/Kyle 对照）
- 订单簿（make-or-take、零智能仿真、Hawkes 聚集）
- 成本与价格发现（有效/已实现价差瀑布图、平方根冲击、信息份额）
- 市场设计（tick size、集合竞价、熔断、暗池、流动性蒸发）

保留现有 `/s/behavior-microstructure` 不动，新实验室在页面顶部互链。

## 三、新增导读 `/s/microstructure-theory`（`src/components/essays/MicrostructureTheory.tsx`）

按报告结构写九节：学科对象与四个核心问题、市场组织形式、库存 vs 信息两条经典线、限价订单簿语言、流动性与成本度量陷阱、价格发现与信息份额、HFT 与市场设计、历史脉络与前沿（ML、加密/DeFi、韧性、新兴市场特殊性）、研究设计与实证陷阱清单 + 四阶段学习路线。每节配"到实验室复现"跳转。

## 四、集成与版本

- `src/lib/sections.ts` 注册两个新 section，归入现有分组（实验室入"前沿/理论"组，与宏观补全一致）。
- `src/i18n/locales/zh.json` / `en.json` 增加导航标签，并更新首页 Latest Update 文案为 V6.1。
- `package.json`、`src/components/Changelog.tsx`、`CHANGELOG.md` 升至 **6.1.0** 并写发布说明。
- 运行单测与类型检查，并用浏览器验证两个新路由渲染无报错。

## 技术说明

模型层保持纯函数、无外部依赖，随机部分使用现有 LCG 确定性种子以保证测试可复现；PIN 使用对数似然稳定化（避免阶乘溢出），信息份额使用 Cholesky 上下界；订单簿仿真限制在教学规模（数千事件）以保证浏览器内即时响应。
