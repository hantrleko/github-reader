# EF Lab 版本日志

## V7.0 — 固收模块升级：22 个固收工具进目录、深链与双语化

### 新增

- **固收工具补全目录**: 固收实验室（信用债 & CDS、短率模型、OAS & 含权债、通胀与曲线策略）与固收前沿实验室的 18 个工具，共 22 条补入 `TOOLS_CATALOG`，工具目录、全站搜索与命令面板均可检索。
- **固收工具级深链**: 债券计算器、利率模型模拟器、固收实验室、固收前沿实验室全部支持 `?t=<toolId>`，目录卡片可直达具体工具。

### 改进

- **固收模块双语化**: 债券计算器与利率模型模拟器的标题、参数、预设、图表标签与解读说明迁入 `en.json` / `zh.json`；两个固收实验室的标题、导语、分类与工具名支持中英文。

## V6.9 — 定价模块升级：衍生品工具全进目录、三大计算器双语化

### 新增

- **衍生品工具补全目录**: 美式期权、利率结构、SABR–Heston、状态价格、LSMC、SVI 无套利、短率、信用、数值方法、粗糙波动率等 11 个实验补入 `TOOLS_CATALOG`，工具目录、搜索与命令面板均可检索。
- **衍生品工具级深链**: 衍生品实验室支持 `?t=<toolId>`，目录卡片可直达 25 个实验中的任意一个。

### 改进

- **定价模块双语化**: 模型计算器、隐含波动率工具、蒙特卡洛定价器的标题、参数、预设、图表标签与解读说明全部迁入 `en.json` / `zh.json`。
- **工具导航双语化**: 分类工具导航的搜索框、清空、无结果提示与分类名支持中英文。

## V6.8 — 基础模块升级：工具目录直达实验室、高阶宏观进目录

### 修复

- **工具目录跳转**: `/tools` 卡片此前直接使用旧的首页锚点（如 `/#micro`），点击只会回到首页顶部；现在统一经 `sectionHref` 解析，86 条工具卡片全部落到对应板块页。
- **衍生品坏链**: 6 条工具的锚点写成不存在的 `/s/deriv`，已更正为 `/s/derivatives`。

### 新增

- **高阶宏观工具进目录**: 宏观高阶实验室（Blanchard 债务动态、Dornbusch 超调 / BOP 三缺口、BGG 金融加速器、ZLB 与前瞻指引）与宏观前沿实验室的 12 个实验，共 16 条工具补入 `TOOLS_CATALOG`，工具目录、全站搜索与命令面板均可检索。
- **工具级深链**: 微观、宏观、宏观高阶与宏观前沿四个实验室支持 `?t=<toolId>`，目录卡片可直达具体工具，分享链接保真。

### 改进

- **基础模块双语化**: 微观 / 宏观板块标题、导语迁入 `en.json` / `zh.json`，英文界面下工具按钮显示英文短名。

### 工程

- 新增 `src/lib/useToolTab.ts`（URL 同步的工具页签 hook）与 `src/lib/__tests__/toolsCatalogLinks.test.ts`（校验每条工具锚点都能解析成真实路由）。
- `sectionHref` 支持保留查询串。
- 版本号统一至 V6.8。

## V6.7 — 导览模块升级：学习路线绑定真实板块、错题进入间隔重复

### 新增

- **学习路线直达板块**: 六个阶段不再是抽象锚点，每阶段列出 2–4 个真实板块（`/s/:id`）与所属学科主线，已读板块自动打勾，「继续」按钮直接跳到当前阶段第一个未读板块。
- **跨设备进度同步**: 登录后学习阶段与已读板块写入云端 `user_progress`，未登录时保留在本地；登录时两侧取并集，进度不会丢。
- **测验错题进入间隔重复**: 答题结果按 SM-2 排期，`/review` 新增「测验错题」牌组，与术语卡分开存储；解析下方直接给出对应实验室链接。
- **概览主线「三分钟看懂本站」**: `/d/overview` 顶部新增六阶段速览卡片，每段一个入口页。

### 改进

- **导览模块双语化**: 学习路线、主题卡导语与进度、学科主线页的层级标签、「建议先看」「其他学科主线」全部迁入 `en.json` / `zh.json`。
- **题库外置**: 17 道题移入 `src/data/quizQuestions.ts`，新增 `sectionId` 与英文主题标签，主题筛选在英文界面下显示英文。

### 工程

- 新增 `src/lib/learningPath.ts`（阶段定义 + 板块 ID 校验）、`src/lib/userProgress.ts`（本地优先 + 云端合并）、`src/data/quizQuestions.ts`。
- `srs.ts` 支持按牌组（glossary / quiz）分开持久化。
- 新增 `src/lib/__tests__/learningPath.test.ts`：校验路线引用的板块与学科主线均真实存在。
- 版本号统一至 V6.7。

## V6.6 — 双语一致性与首屏结构：为第一次到访的人优化落地体验

### 新增

- **学科主线入口带**: Hero 下方新增 `DomainStrip`，一屏展示十条一级域入口，直达 `/d/:groupId`，不必滚过整页才看到全站范围。
- **板块页定位信息**: 每个 `/s/:id` 页顶部补充难度徽章（导读 / 基础 / 进阶 / 前沿 / 数据）与「同域相关」链接，与既有「建议先看」前置链共同构成统一定位条。

### 改进

- **双语一致性**: 首页编辑导读（三段 Concept / Experiment / Research）、板块目录标题与副标题、页脚品牌简介与导航列全部迁入 `en.json` / `zh.json`，英文访客不再在首屏之下遇到中文硬编码文案。
- **页脚导航改为学科主线**: 原先六个中文板块锚点改为按一级域链接到学科主线页，与导航栏、首页目录同一套信息架构。

### 工程

- 新增 `src/components/DomainStrip.tsx`；`Index.tsx`、`SiteFooter.tsx`、`SectionPage.tsx` 改用 i18n 词条。
- 新增 `home.*`、`footer.*`、`section.*` 三组词条，中英键完全对齐。
- 版本号统一至 V6.6。

## V6.5 — 新增「量化交易」一级域：以 Microsoft Qlib 为第一块内容

### 新增

- **量化交易学科主线**: 新建一级域 `quant-trading`，收纳 Qlib 导读、Qlib 流水线实验室、量化策略导读、量化策略实验室、真实数据回测引擎与模型校准实验室；域编号重排为 01–10。
- **Qlib 导读** (`/s/qlib-guide`): 七节精读 Microsoft Qlib 的七层结构（数据层、表达式引擎、预处理、模型层、策略层、回测执行、qrun 工作流），含 Alpha158 / Alpha360 对比、标签对齐与 IC 评估协议。
- **Qlib 流水线实验室** (`/s/qlib-lab`): 交互复现 Qlib 研究闭环——Alpha158 式表达式因子、CSZScoreNorm 截面标准化、Ridge / 等权 / 单因子模型、IC·RankIC·ICIR 与五分组单调性、TopK-Dropout 组合回测。

### 工程

- 新增 `src/lib/quant/qlibPipeline.ts`：合成面板生成、表达式因子、截面归一化、Ridge 正规方程求解、IC/RankIC 评估与 TopK-Dropout 回测，训练/测试按时间硬切分。
- 新增 `src/lib/quant/__tests__/qlibPipeline.test.ts`（7 项，含 oracle 信号 IC=1 与系数回收校验）。
- 新增 `src/components/essays/QlibGuide.tsx`、`src/components/quant/QlibLab.tsx`；`sections.ts` 登记新板块与新一级域，i18n 与站点地图同步更新。
- 版本号统一至 V6.5。

## V6.4 — TradingView 跨市场筛选器：无需 API key 的实时扫描

### 新增

- **TradingView 筛选器** (`/s/tv-screener`): 通过 Lovable Cloud Edge Function 代理 TradingView 公共 Scanner，覆盖股票、外汇、加密货币、债券与期货。
- **9 组快速筛选**: 市值龙头、涨幅榜、跌幅榜、成交量领袖、高波动、价值、成长、加密货币 Top 100、外汇主要货币对。
- **字段自由组合**: 支持 13000+ TradingView 字段，内置常用列（价格、成交量、市值、P/E、股息率、波动率、板块等）点选开关。
- **CSV 导出与分页**: 每页 50 条，支持上一页/下一页与一键下载当前结果。
- **跨市场切换**: 内置 11 个市场（America / UK / Germany / France / Japan / HK / China 等）快速切换。

### 工程

- 新增 `supabase/functions/tv-screener/index.ts` 边缘函数代理公共 Scanner 请求。
- 新增 `src/lib/tvScreener.ts` 类型、hooks、预设与格式化工具。
- 新增 `src/components/data/TvScreenerSuite.tsx` 数据工作台 UI。
- `sections.ts` 登记 `tv-screener` 并归入「数据」学科主线；站点地图、i18n 同步更新。
- 版本号统一至 V6.4。

## V6.3 — 学科主线与结构升级：从「板块清单」到「学科主线」

### 新增

- **学科主线页** (`/d/:groupId`): 为九个一级域各建主线页, 按「导读 → 基础 → 进阶 → 前沿 → 数据」分层展示该域全部板块, 首页分组标题可直接进入。
- **前置知识链**: `SectionDef` 增加 `level` / `prereq` 字段; 板块页顶部渲染所属学科入口与「建议先看」chips。
- **《微观经济学导读》** (`/s/micro-theory`): 六节结构 — 偏好与效用 → 生产与成本 → 市场结构 → 博弈与信息 → 机制设计 → 研究流程。
- **《量化策略导读》** (`/s/quant-theory`): 六节结构 — 信号构建 → 组合构建 → 交易成本 → 回测偏误清单 → 评价指标 → 实盘落差。

### 改进

- 全站用户可见文案 (板块副标题、顶栏与目录标签、i18n items) 移除内部版本号前缀, 改为能力描述。
- 站点地图新增 9 个 `/d/*` 条目。
- 版本号统一至 V6.3。

## V6.2 — 固定收益补全：从曲线构建到结构化产品与制度前沿

### 新增

- **曲线与口径** (`/s/fixed-income-frontier`): par 曲线自举剥离贴现因子、三种插值 (线性零率 / 分段常数远期 / 三次样条) 的远期粗糙度对比、远期利率与 carry / roll-down 分解、应计利息与净价脏价换算。
- **利差与风险**: 名义 / Z-spread / ASW / OAS 四口径同券对照与期权成本、有效久期与有效凸性 (数值扰动)、美元久期与 DV01、关键利率久期对冲求解、Redington 免疫条件与盈余曲线。
- **含权与可转债**: 二叉树可赎回 / 可回售债定价与期权价值、可转债债底 + 转换期权分解、转换平价、Delta 与债性 / 混合 / 股性区间判定。
- **信用与结构化**: 信用利差四成分分解 (预期损失 / 风险溢价 / 流动性 / 税收) 与信用利差之谜判定、评级迁移矩阵多期演化与迁移 VaR、CDS-债券基差与交易方向、分层瀑布与超额抵押触发、单因子高斯 copula 分层损失、MBS 提前还款与负凸性。
- **组合、杠杆与前沿**: 回购杠杆 ROE 与击穿冲击、haircut 保证金螺旋迭代路径、Hull-White θ(t) 校准与期限溢价分解、RFR 后视复利 vs 前瞻定盘与 fallback 利差、位移对数正态 caplet (负利率)、绿色溢价与转型贴水、债券流动性溢价。
- **理论导读专题** (`/s/fixed-income-theory`): 九节结构 — 利率概念体系 → 久期凸性 → 利差语言 → 期限结构与曲线构建 → 动态模型谱系 → 信用与结构化 → 组合免疫与杠杆 → 历史脉络 → 制度前沿与八步研究流程。

### 工程

- 新增 `src/lib/quant/fixedIncomeFrontier.ts` 纯函数计算层与 30 项单元测试 (恒等式 / 极限 / 单调性断言)。
- 新增 `src/components/bond/V62FixedIncomeTools.tsx` (五分类 / 十八面板) 与 `src/components/essays/FixedIncomeTheory.tsx`。
- `sections.ts` 登记 `fixed-income-frontier` / `fixed-income-theory`, 顶栏 / 首页目录 / 搜索自动同步。
- 版本号统一至 V6.2。

## V6.1 — 市场微观结构补全：从做市商库存到订单簿与市场设计

### 新增

- **做市与库存** (`/s/microstructure-lab`): Garman 存货流、Stoll 三成分价差分解、Ho-Stoll 库存偏离下的最优报价偏移。
- **信息与毒性**: Easley-O'Hara PIN 似然估计 (α / μ / ε) 与 VPIN 成交量桶订单流毒性时序。
- **限价订单簿**: make-or-take 决策、排队价值与成交概率、零智能三泊松流订单簿仿真、Hawkes 自激成交强度。
- **成本与价格发现**: 报价/有效/已实现价差与冲击分解恒等式、Corwin-Schultz 与 Roll 低频代理、Lee-Ready 方向标注误判率、平方根冲击定律、Hasbrouck 信息份额与 Gonzalo-Granger 权重。
- **市场设计与韧性**: tick size 机制效应、集合竞价 vs 连续交易、熔断触发仿真、暗池分流、流动性蒸发半衰期、Amihud-Mendelson 流动性溢价。
- **理论导读专题** (`/s/microstructure-theory`): 九节结构 — 核心问题 → 市场组织 → 库存与信息 → 订单簿 → 流动性度量陷阱 → 价格发现 → 市场设计 → 历史与前沿 → 研究设计清单。

### 工程

- 新增 `src/lib/quant/microstructure.ts` 纯函数计算层与 28 项单元测试 (种子化随机, 结果可复现)。
- 新增 `src/components/micro/V61MicrostructureTools.tsx` (五分类 / 十七面板) 与 `src/components/essays/MicrostructureTheory.tsx`。
- `sections.ts` 登记 `microstructure-lab` / `microstructure-theory`, 顶栏 / 首页目录 / 搜索自动同步。
- 版本号统一至 V6.1。

## V6.0 — 宏观经济学补全：从增长引擎到政策规则与前沿

### 新增

- **长期增长** (`/s/macro-frontier`): 内生增长引擎 (AK / Lucas / Romer / Schumpeter vs Solow 过渡动态)、增长核算与 TFP 残差分解 + Hall-Jones 发展核算。
- **周期与名义刚性**: Samuelson 乘数—加速数区制判定、状态依赖财政乘数 (松弛度 / ZLB / 货币抵消 / 李嘉图程度)、RBC 校准与周期矩对照、Calvo 定价与 NKPC 微观基础 (θ→κ、指数化、牺牲率)。
- **政策规则**: Barro-Gordon 通胀偏差与可信度曲线、泰勒 / 通胀目标 / 价格水平 / 名义 GDP 四种规则在成本推动冲击下的对比。
- **开放经济**: PPP / UIP / CIP 平价条件与 Fama 回归远期溢价之谜、突然停止与外部调整 (储备覆盖、货币错配的资产负债表效应)。
- **当代前沿**: 预期形成 (理性 / 适应性 / 黏性 / 诊断性 + CG 系数)、QE 组合再平衡与 YCC、银行资本与去杠杆螺旋、气候转型宏观路径。
- **理论导读专题** (`/s/macro-theory`): 九节结构 — 对象与微观基础 → 长期增长 → 短期波动 → 货币政策 → 财政政策 → 开放经济 → 思想史主线 → 当代前沿 → 宏观判断力四步框架。

### 工程

- 新增 `src/lib/quant/macroFrontier.ts` 纯函数计算层与 23 项单元测试 (种子化随机, 结果可复现)。
- 新增 `src/components/macro/V60MacroTools.tsx` (五分类 / 十二实验) 与 `src/components/essays/MacroTheory.tsx`。
- `sections.ts` 统一登记 `macro-frontier` / `macro-theory` 至「基础」导航分组, 顶栏 / 首页目录 / HeroToolStrip 自动同步。
- 版本号统一至 V6.0 (Navbar 徽章 / SplashIntro / 首页最新更新 / 更新日志页脚)。

## V5.3 — 资产定价补全：从状态价格到现代前沿

### 新增

- **无套利基础** (`/s/asset-pricing`): 状态价格与风险中性测度 (反解 q / π / m / Q, 无套利与完备性判定, 不完备市场价格上下界)、SDF–因子对偶 (m=a−b'f ↔ E[R]=Rf+β'λ)、HJ 距离与 CAPM/FF3/FF5 模型比较。
- **谜题与结构模型**: 长期风险 (Epstein-Zin / Bansal-Yaron, 分离 γ 与 ψ)、习惯形成 (Campbell-Cochrane 盈余消费比与时变风险厌恶)、罕见灾难 (Rietz-Barro)、三大谜题对照面板。
- **实证前沿**: Campbell-Shiller 对数线性分解与长期收益预测回归、因子动物园 (PCA / Ridge / LASSO + Harvey-Liu-Zhu t>3 多重检验门槛)、货币 Carry 与 UIP 偏离。
- **理论导读专题** (`/s/asset-pricing-theory`): p=E[mx] 四层知识地图、1952–2026 模型演进时间轴、三大谜题卡片, 每块配「到实验室复现」入口。

### 工程

- 新增 `src/lib/quant/assetPricingAdvanced.ts` 纯函数计算层与 18 项单元测试。
- 新增 `src/components/asset/NoArbitrageTools.tsx` / `PuzzleTools.tsx` / `FrontierAssetTools.tsx`, 复用 `AssetChrome` 与统一图表配色。
- `AssetPricingTools` 两级导航新增三个分类, 资产定价版块由 11 个工具扩至 21 个; 工具目录与 `sections.ts` 同步登记。
- 版本号统一至 V5.3 (Navbar 徽章 / SplashIntro / 首页最新更新 / 更新日志页脚)。

## V5.2 — 美股全栈数据工作台

### 新增

- **美股全栈** (`/s/us-suite`): 五页签工作台 — 行情与技术面 / 基本面 / SEC 披露流 / 期权链 / 全市场筛选。
- **行情**: Yahoo chart v8 日 K 线, 本地计算 MA / EMA / MACD / RSI / KDJ / Bollinger, Brush 联动缩放。
- **基本面**: SEC XBRL companyconcept 三表与 Yahoo quoteSummary 关键指标 (PE / PB / ROE / 毛利率…)。
- **SEC 披露流**: submissions 表单过滤 (10-K / 10-Q / 8-K / 4 / 13F / S-1) + 2001 至今 EDGAR 全文检索。
- **期权链**: 到期日切换、IV 微笑、Black–Scholes Greeks、Vol/OI 异动高亮与 Put/Call 比率。
- **全市场筛选**: EDGAR XBRL frames 横截面排名与 CSV 导出。

### 工程

- 新增 5 个 edge functions: `us-quote` / `us-fundamentals` / `us-filings` / `us-options` / `us-screener`, 共享 `_shared/us.ts` (Yahoo cookie+crumb、host fallback、指标数学)。
- 新增 `src/lib/usData.ts` 与 `src/components/data/USSuite.tsx`; 行情可经 Tool Bus 发送 S₀ / σ 至定价与回测实验室。
- `SplashIntro` 版本号改为读取 `APP_VERSION_TAG`; 版本号统一至 V5.2。

## V5.1 — 前沿长文 II：当 AI 告诉我你的想法是反的

### 新增

- **前沿长文** (`/s/ai-quant-strategy`): 一次 AI 生成量化策略会话的完整方法论复盘, 五章正文 + Scorecard + 复现入口。
- **Scorecard**: V1 价值+质量 −21.17% (Sharpe −0.22, MDD −33.83%) → V2 反转去空头 +829.20% → V3 叠加 200 日趋势过滤 +1047.39% (MDD −40.53%), 回报与回撤同等字号并列。
- **方法论 Callout**: Sample Size (四笔交易下的夏普标准误) 与 Regime Dependence (因子收益的条件性与符号反转)。
- **在实验室里复现**: 链接到回测引擎 / Walk-Forward 样本外检验 / Fama-French 归因 / Kelly 与破产风险 / Michaud 重采样 / 模型校准。
- 底部固定风险声明条 `Backtest ≠ forecast`, 全文不含任何产品推广或返利链接。

### 工程

- 新增 `src/components/essays/AiQuantStrategyEssay.tsx`, 沿用《万亿美元的方程》的编辑体例。
- `sections.ts` 注册「前沿」组第二篇长文; 前作页尾新增 Next Essay 跳转卡, 形成长文序列。
- Navbar 前沿分组补齐两篇长文入口, zh/en i18n 同步; 版本号统一至 V5.1。

## V4.9 — 品牌级开场动画 SplashIntro

### 新增

- **SplashIntro** (`src/components/SplashIntro.tsx`): 首页首访展示全屏循环视频背景 + 金色 vignette + 大字标题「Theory, measured.」。
- 三按钮控制: **Enter** 进入实验室 · **Skip** 跳过 · 右上角静音切换; 键盘 Enter/Space 进入, Esc 跳过。
- `sessionStorage` 记忆首访状态, 后续访问直接进入主页, 不打扰工作流。
- 循环静音自动播放, 兼容移动端 autoplay 限制; 视频加载失败自动降级为静态渐变背景。

### 工程

- `Index.tsx` 挂载 SplashIntro, 与 Hero / Onboarding 层级隔离, 首屏 CLS 无回归。
- Navbar 版本徽章 / Hero 最新更新 / ChangelogPage Footer / 更新日志统一同步至 V4.9, V4.8 标记为 Stable。

## V4.8 — 可视化组件工作台 (统一图表基础设施)

### 新增

- **可视化组件工作台** (`/s/visualization-guide`): 一页展示 V4.8 所有新组件的用法示例。
- **Brush + syncId 联动缩放**: 净值与回撤面板共享 x 轴游标，可局部放大长时序数据。
- **事件标注层**: `<ReferenceArea>` 高亮衰退/政策/事件窗口, `<ReferenceLine>` 标记 QE / 加息 / DID 处理时点。
- **Fan Chart**: 蒙特卡洛/bootstrap 输出 50% / 90% 分位数带 + 中位数线, 支持 `samples[]` 或预算 `quantiles`。
- **直方图 + 高斯 KDE**: Silverman 带宽自动估计, 可标注 VaR / ES / 均值等临界值。
- **TimeScrubber**: 播放/暂停/拖拽的动态过程回放, 适用于 IRF / Solow 收敛 / Kyle 均衡。
- **四套调色板**: `categorical` / `sequential` / `diverging` / Okabe-Ito `colorblindSafe`, 全部走 HSL token, 不硬编码色值。
- **一键导出**: PNG / SVG / CSV, 原生 `XMLSerializer` + `<canvas>` 实现, 零新增依赖。
- **色觉友好模式**: `<ColorblindToggle>` 切换 `<html class="cb-safe">`, 图表自动使用 Okabe-Ito 8 色。
- **打印/PDF 友好**: `@media print` 图表白底 + 边框, 工具条自动隐藏, 一键报告导出可读。

### 工程

- 升级 `src/components/common/ChartTheme.tsx`: `CHART_PALETTES` · `ThemedTooltip` (formatter/sort/delta) · `ChartToolbar` · `useChartExport` hook · 五段式 `ChartFrame` (标题/副标题/工具条/图表/脚注)。
- 新增 `FanChart.tsx` / `HistoKde.tsx` / `TimeScrubber.tsx` / `ColorblindToggle.tsx` 通用组件。
- 新增 `VisualizationGuide.tsx` 展示页, `SECTIONS` 注册 `/s/visualization-guide`, Navbar「理论」组新增入口, zh/en i18n 同步。
- 全局 CSS: `html.cb-safe` 色觉友好覆盖, `@media print` 图表样式, 复用 shimmer 骨架态。

## V4.7 — 行为金融 & 市场微观结构实验室 (8 个研究级工具)

### 新增

- **行为金融 & 微观结构实验室** (`/s/behavior-microstructure`): 两 Tab × 8 工具。
  - 行为: Laibson β-δ 双曲贴现 · DSSW 噪声交易者 IRF · Barber-Odean 过度自信换手-α 侵蚀 · 处置效应 MC。
  - 微观结构: Kyle (1985) 均衡 · Glosten-Milgrom 序贯交易价差 · Roll (1984) 有效价差反推 · Almgren-Chriss 最优执行有效前沿 + Amihud ILLIQ。
- 新增纯函数库 `src/lib/quant/behaviorMicro.ts` (8 个模型) 与 10 项单元测试。
- Navbar「理论」组新增入口, zh/en i18n 同步。

## V4.6 — 宏观经济学高阶实验室 (6 个研究级工具)

### 新增

- **宏观高阶实验室** (`/s/macro-lab`): 6 个研究级工具，四 Tab 布局。
  - 财政与债务动态: `b_{t+1}=(1+r)/(1+g)·b_t−s` 迭代 + Blanchard (r−g) 财政空间温度计。
  - Dornbusch 汇率超调: 粘性价格 + UIP 闭式解, 展示短期超调后向 PPP 回归。
  - BOP 三缺口: 会计恒等 `CA ≡ (S−I)+(T−G)`。
  - Bernanke-Gertler-Gilchrist 金融加速器: 对比 RBC 无摩擦基线。
  - ZLB + 前瞻指引 puzzle: 后向归纳求解 NK 3 方程在 `i_t=0` 约束下的路径。
- 新增纯函数库 `src/lib/quant/macroAdvanced.ts` 及 11 项单元测试。
- Navbar「理论」组新增「宏观高阶实验室」入口, zh/en i18n 同步。

## V4.4 — 外部数据生态整合 (7 个新数据入口 · 3 个 Edge Function · 10 站深链工作台)

### 新增

- **CBOE 市场情绪温度计** (`/s/cboe-sentiment`): VIX / VIX9D / VVIX / SKEW 一年时间序列, VIX 期限结构判定 (contango / backwardation), 叠加 FRED CPCE 股票 Put/Call Ratio。
- **经济日历** (`/s/econ-calendar`): 未来 14 天 CPI / NFP / GDP / FOMC 等高影响宏观事件, Trading Economics guest API 优先, 失败回退到精选静态时间表。
- **ETF 查询** (`/s/etf-lookup`): 输入代码抓取 etfdb.com 的费率 / AUM / 类别 / YTD / 股息率, 结果 4 小时缓存并直达 ETFdb 详情。
- **板块热力图** (`/s/sector-heatmap`): 11 只 SPDR 行业 ETF 一月涨跌可视化, Finviz 风格。
- **全球市值 Top 50** (`/s/market-cap`): 季度快照, 行业与国别分布, 每行直达 StockAnalysis。
- **Quiver 另类数据** (`/s/quiver-signals`): 议员交易 + WSB 散户热度 (需要在项目 Secrets 配置 `QUIVER_API_KEY`, 未配置时会展示引导卡)。
- **外部研究工作台** (`/s/external-workbench`): StockAnalysis / Finviz / Koyfin / Seeking Alpha / Cboe / Trading Economics / ETFdb / Quiver / FRED / CompaniesMarketCap 十个研究站的 ticker-aware 深链, 输入代码后所有链接同步更新。

### 工程

- 新增 3 个 Edge Function: `econ-calendar` / `etf-lookup` / `quiver-signals` (CORS + in-memory 缓存 + 上游失败降级)。
- 新增数据模块 `src/data/topMarketCap.ts`, `src/data/externalWorkbenchLinks.ts`。
- `src/lib/marketData.ts` 补 `useEconCalendar` / `useEtfLookup` / `useQuiverSignals` 三个 React Query hook。
- Navbar「数据源」下拉与 zh/en i18n 同步扩至 12 项。

### 变更

- 全站版本号同步至 **V4.4**, V4.3 标记为 Stable。

## V3.8 — 计量经济学强化 (回归诊断 · 动态面板 GMM · 预测检验 · 非参数)

### 新增

- **回归诊断台**(`/s/econometrics` → 诊断/非参数):一站式诊断 OLS 回归——异方差 (Breusch-Pagan / White)、自相关 (Durbin-Watson / Breusch-Godfrey)、多重共线 (VIF / 条件数)、设定 (Ramsey RESET),并并排对比 OLS / HC3 / Newey-West (HAC) 稳健标准误,配残差图与 ACF 图。
- **动态面板 GMM**:含滞后被解释变量的动态面板下,可视化 Pooled OLS 高估、固定效应的 Nickell 偏误与 Arellano-Bond 差分 GMM 纠偏;含 Hansen J 过度识别与 AR(2) 检验,N/T 滑杆调节。
- **Diebold-Mariano 预测精度检验**:对随机游走 / AR(1) / EMA 的样本外预测做损失差分显著性检验,含 HAC 方差修正与 Harvey (1997) 小样本修正。
- **核回归 / 局部多项式 (LOESS)**:Nadaraya-Watson 与局部线性平滑,带宽提供 Silverman 经验法则与留一交叉验证 (LOOCV) 最优 h,可视化偏差-方差权衡与 95% 置信带。
- **工程**:新增纯函数库 `src/lib/quant/econometrics.ts`(OLS 诊断、稳健/HAC 标准误、动态面板 GMM、DM 检验、核回归)配 17 项通过单测;稳健分布 (erf、正态、卡方、t、F 的 p 值) 采用 Numerical Recipes 连分数实现;工具目录补 4 条卡片,计量导航新增「诊断 / 非参数」分类。

### 变更

- 全站版本号同步至 **V3.8**,V3.7 标记为 Stable。

## V3.7 — 期限结构建模 (Nelson-Siegel / Svensson 收益率曲线拟合)

### 新增

- **收益率曲线拟合器**(`/s/bond` → 曲线拟合器 tab):Nelson-Siegel(3 因子)与 Svensson(4 因子)期限结构拟合。给定衰减 λ 时曲线对 β 线性,由 OLS 求 β,λ 用一维(NS)/二维(NSS)网格搜索取残差最小者。
- **真实数据穿透**:一键从 FRED 美国国债 CMT(DGS1MO–DGS30, 1M–30Y)拉取当日曲线并拟合;内置正常/倒挂/驼峰示例与可编辑「期限,收益率」表。
- **输出**:即期曲线、瞬时远期曲线(闭式解)、逐点拟合残差(bp)、RMSE 与 R²,以及水平/斜率/曲率因子解读。
- **跨工具联动**:把 3M 短端 r 经「发送到…」传给短率模型(自动填入 r₀,新增 Tool Bus 消费)与债券工具;新增工作流剧本「真实利率 → 曲线拟合 → 短率 → 债券」。
- **工程**:新增纯函数库 `src/lib/quant/termStructure.ts`(NS/NSS 载荷、拟合、即期/远期采样)配 7 项通过单测;`marketData.ts` 新增 `useFredYieldCurve` 批量拉取 hook;工具目录补 1 条卡片,命令面板 ⌘K 自动可发现。

### 变更

- 全站版本号同步至 **V3.7**,V3.6 标记为 Stable。

## V3.6 — 资产定价模块深化 (SDF 统一框架 · CAPM 家族 · 实证异象)

### 新增

- **资产定价从 4 个工具扩展到 11 个**(`/s/asset-pricing`),顶部升级为两级分类导航:均衡定价 / 因子与实证 / 现代 SDF 框架。
- **现代 SDF 统一框架**:随机折现因子 `p=E[MX]`(线性定价核 `M=a−b·Rm` + beta 表示 + CAPM/CCAPM 特例)、CCAPM + 股权溢价之谜(幂效用,演示合理 γ 下溢价过小、需 γ≈50 才能匹配历史 6%)、Hansen-Jagannathan 波动率下界(`σ(M)/E(M) ≥ 最大 Sharpe`,叠加 CCAPM 校准点诊断)。
- **CAPM 家族扩展**:零β/Black CAPM(放松无风险资产,双 SML 对比解释平坦 SML)、Merton 跨期 ICAPM(状态变量对冲因子,要求收益分解)。
- **实证异象与因子检验**:规模/价值/动量/低波动分位排序多空组合(价差 + t 值 + 单调性)、GRS(1989)联合 α=0 检验(F 统计量 + p 值 + α 散点)。
- **现有工具深化**:CAPM 新增滚动 β 估计演示(时变 β 与估计不确定性)。
- **工程**:新增纯函数库 `src/lib/quant/assetPricing.ts`(SDF/CCAPM/HJ/异象排序/GRS/滚动β/F 分布),配 11 项通过的单元测试;工具目录补 7 条卡片;知识库理论知识点链接到对应交互工具。

### 变更

- 全站版本号同步至 **V3.6**,V3.5 标记为 Stable。

## V3.5 — 组合回测与优化引擎(旗舰深化)

### 新增

- **组合回测与优化引擎**(`/s/backtest`):单标的回测进阶——计入交易成本与滑点(毛/净双净值曲线 + 成本拖累),同数据多策略对比表,参数网格扫描热力图(点选即应用该参数组合),年×月收益热力图。
- **多资产组合回测**(`src/lib/quant/portfolio.ts`):等权 / 风险平价(ERC,阻尼乘性不动点)/ 最小方差(投影梯度)/ 均值方差(切点投影)四种长仓配置,支持月/季/年再平衡与交易成本,输出组合净值 vs 等权基准、权重演化堆叠图、风险贡献分解(MCR/PCR)与相关系数矩阵(含单元测试)。
- **校准实验室扩展**(`/s/calibration`):新增 Vasicek / CIR 短率校准,对 FRED 真实国债收益率离散 OLS/MLE 估计 κ/θ/σ 与半衰期(含 SDE LaTeX 公式);GARCH/EWMA 新增标准化残差 Q-Q 图与残差平方 ACF 诊断(带 ±1.96/√n 置信带)。
- 新增工作流剧本「真实数据 → 校准 → 定价 → 组合回测」;组合 σ/μ 与短率 r 均可经「发送到…」传入定价 / 债券工具。

### 变更

- 全站版本号同步至 **V3.5**,V3.4 标记为 Stable。Phase 2『功能深度』续作:回测从『单标的』升级为『可审计、可对比、可优化的组合引擎』。

## V3.4 — 回测与校准实验室 (Backtest & Calibration Lab)

### 新增

- **真实数据回测引擎** (`/s/backtest`, `src/lib/quant/backtest.ts`):用 Yahoo / CoinGecko / Alpha Vantage 真实历史价格回测单标的策略(买入持有 / 双均线 / 时序动量 / 均值回归 / 波动率目标),信号 T+1 执行规避前视偏差,输出净值曲线、回撤序列与 CAGR/年化波动/夏普/索提诺/卡玛/胜率/换手/暴露等完整指标(含单元测试)。
- **模型校准实验室** (`/s/calibration`, `src/lib/quant/calibration.ts`):GARCH(1,1) 高斯极大似然(自研 Nelder-Mead 优化)、EWMA/RiskMetrics 衰减因子网格搜索、Merton 跳跃扩散阈值分解,输出条件波动率、持续性、最优 λ、跳跃强度/幅度等参数(含模拟数据回收测试)。
- **统一价格数据层** (`src/lib/priceSeries.ts`):三大免费数据源一键切换并归一化为 `{dates, prices}`,支持示例数据离线演示。
- 两个实验室的拟合波动率 σ 与收益 μ 均可经「发送到…」一键传入 Black-Scholes / 蒙特卡洛 / Greeks / 隐含波动率工具。

### 变更

- 全站版本号同步至 **V3.4**,V3.3 标记为 Stable。Phase 2『功能深度』开篇:工具从『算单点』升级为『测策略 / 拟合真实数据』。

## V3.3 — 互联层收尾 (对比模式 + 工作流)

### 新增

- **A/B 对比模式**:模型计算器 (Black-Scholes / VaR·ES / CAPM / Sharpe) 新增对比面板,A 为实时参数、B 可独立编辑,差异表用 ↑↓ 与色标标注变化;通用组件 `CompareDiff` / `CompareToolbar` (`src/components/common/CompareToggle.tsx`),默认折叠零影响。
- **研究工作流页** (`/workflows`, `src/data/workflows.ts`):4 条剧本——期权做市台 (IV→SVI→Greeks→MC)、利率到债券、组合构建、信用风险链;每步含工具说明与 Tool Bus 变量徽章,支持「打开」直达与「从第一步开始」。
- 工具目录页、导航 More 菜单与 sitemap 同步收录工作流入口。

### 变更

- 全站版本号同步至 **V3.3**,V3.2 标记为 Stable。至此 Phase 1『工具互联』完成。

## V3.2 — 工具互联层 (Tool Bus)

### 新增

- **Tool Bus 跨工具参数直传** (`src/lib/toolBus.ts`):依赖无关的全局总线,以 `useSyncExternalStore` 维护 S₀/σ/r/T/K/μ 等规范变量,并镜像到 sessionStorage。
- **「发送到…」下拉** (`src/components/common/SendToTool.tsx`):把当前工具输出推上总线并跳转到相关工具自动预填,接收端落地后弹出确认 toast。
- 已打通 **隐含波动率 ↔ Black-Scholes ↔ 蒙特卡洛 ↔ Greeks Desk** 四工具回路;打开衍生品页若总线携带期权参数会自动定位到 Greeks 工作台。
- **Markdown 报告导出**:`ShareExportToolbar` 新增「复制 MD」,把工具输入与关键输出整理为可直接粘贴的 Markdown 片段(隐含波动率工具率先接入)。

## V3.1 — 分类导航 · 模型补足 · 安全加固

### 新增

- **两级分类导航** (`CategorizedToolNav`):计量经济学 29 个工具分 5 类,衍生品 11 个工具分 3 类,内嵌搜索;首页导航子菜单同步更新。
- **模型补足**:Fama-MacBeth(Shanken 修正)、CRR 二叉树收敛、极值理论 EVT/POT、关键利率久期 KRD、单位根检验 (ADF/KPSS)、Walk-Forward 样本外检验;前沿实验室四张概念卡升级为互动工具。
- 核心算法抽取至 `src/lib/quant/extraModels.ts` 并配套单元测试,新增 10 个工具标记 `verified`。

### 变更

- 升级 `@supabase/supabase-js`、`react-router-dom`;`recharts` 升至 v3(移除 lodash);`package.json` overrides 锁定 ws/lodash,依赖扫描归零高危项。
- 精简研究运营类冗余板块 (Research Ops Board / Playbooks / Decision Memo)。

## 0.10.0 — 多页面架构重构

### 变更

- **每个功能板块独立成页**:原本的"单一超长页面 + 锚点滚动"改为按路由分页。点击导航直接进入该功能的专属页面(`/s/:sectionId`),只渲染单一板块,不再定位到长页面的某个位置。
  - 新增板块注册表 `src/lib/sections.ts`(板块元数据 + `sectionHref` 路由解析工具)。
  - 新增单板块页面 `src/pages/SectionPage.tsx`:含返回首页链接、章节标题头、上一/下一板块导航与独立 SEO。
  - 新增可复用页脚 `src/components/SiteFooter.tsx`。
  - 着陆页(`/`)精简为 Hero / 简介 / 主题 / 模型 / 精选 Notebook,并新增"功能板块目录"网格。
  - 导航栏改为路由跳转,active 高亮基于当前路由(移除滚动监听 scrollspy)。
  - 同步更新 HeroToolStrip、ResearchPlaybooks、TodaysPick、HeroSection、LearningPath、CommandPalette、TopicDetail 的入口链接,统一指向新页面路由。

## 0.9.0 — Alpha Vantage 个股与外汇数据源

### 新增

- **Alpha Vantage 数据浏览器** (`src/components/data/AlphaVantageExplorer.tsx`)
  - 接入 Alpha Vantage API,覆盖美股日线行情与外汇汇率两大维度。
  - 精选标的按主题分组:美股科技(AAPL/MSFT/NVDA/GOOGL)、宽基与蓝筹(SPY/QQQ/JPM/BRK.A)、外汇货币对(EUR/USD、GBP/USD、USD/JPY、USD/CNY)。
  - 支持自定义股票代码查询(回车或搜索按钮)。
  - 区间窗口切换(3M/6M/1Y/MAX),自动计算年化波动率与区间涨跌。
  - 每个序列附直达 Alpha Vantage 官方文档的外部链接。
  - 新增边缘函数 `supabase/functions/alphavantage-series`,统一代理并清洗 `TIME_SERIES_DAILY`(个股)与 `FX_DAILY`(外汇),并显式处理免费版限流(5 次/分钟、25 次/天)与错误响应。
  - API Key 经 `ALPHAVANTAGE_API_KEY` 密钥安全存储,仅在后端边缘函数中使用,不暴露给前端。
  - 「数据源」导航分组新增 Alpha Vantage 入口及中英文本地化词条。

## 0.8.0 — CoinGecko 加密资产数据源

### 新增

- **CoinGecko 加密市场浏览器** (`src/components/data/CoinGeckoExplorer.tsx`)
  - 接入 CoinGecko 公共 API,免费、无需 API Key,提供历史价格、市值与成交量。
  - 精选币种按主题分组:主流币(BTC/ETH/BNB/SOL)、稳定币(USDT/USDC)、生态与应用(XRP/ADA/DOGE/LINK)。
  - 区间窗口切换(1M/3M/6M/1Y/MAX),自动计算年化波动率与区间涨跌。
  - 每个币种附直达 CoinGecko 官方详情页的外部链接。
  - 新增边缘函数 `supabase/functions/coingecko-series`,代理并清洗 CoinGecko market_chart 数据。
  - 「数据源」导航分组新增 CoinGecko 入口及中英文本地化词条。

## 0.7.0 — ECB / BIS 央行数据源

### 新增

- **ECB / BIS 数据浏览器** (`src/components/data/EcbBisExplorer.tsx`)
  - 接入欧洲央行(ECB Data Portal)与国际清算银行(BIS Stats)开放数据,免费、无需 API Key。
  - ECB:主要再融资/存款便利/边际贷款政策利率、欧元参考汇率(USD/GBP/JPY/CNY)、HICP 总体与核心通胀。
  - BIS:美/欧/英/日/中各国政策利率、信贷/GDP 缺口、住宅地产价格指数、美元名义有效汇率。
  - 区间窗口切换(2Y/5Y/10Y/20Y),实时显示最新值与区间涨跌。
  - 每个序列附直达 ECB / BIS 官方页面的外部链接。
  - 新增边缘函数 `supabase/functions/ecb-bis-series`,统一解析 ECB(SDMX-JSON v1)与 BIS(SDMX-JSON v2)。
  - 「数据源」导航分组新增 ECB / BIS 入口及中英文本地化词条。

## 0.6.0 — 全球数据源拓展

### 新增

- **World Bank 全球发展指标浏览器** (`src/components/data/WorldBankExplorer.tsx`)
  - 接入世界银行公开数据库（World Bank Open Data，免费、无需 API Key）。
  - 15+ 精选指标按主题分组：增长产出、通胀货币、贸易外部、人口社会。
  - 支持最多 5 个经济体的横向时间序列对比（14 个主要经济体可选）。
  - 使用 Recharts 多线图可视化，自动对齐年份并连接缺失值。
  - 每个指标提供直达 World Bank 官网详情页的外部链接。
  - 新增边缘函数 `supabase/functions/worldbank-series`,代理并清洗 World Bank API 数据。
  - 「数据源」导航分组新增 World Bank 入口及中英文本地化词条。

## 0.5.0 — 数据源与前沿拓展

### 新增

- **FRED 宏观数据浏览器** (`src/components/data/FredExplorer.tsx`)
  - 集成圣路易斯联储 FRED API，支持 20+ 精选宏观指标（10Y 国债收益率、CPI、失业率、VIX 等）。
  - 按宏观主题分组（利率、通胀、就业、市场波动、货币、增长）。
  - 使用 Recharts 可视化历史走势，支持 1Y / 3Y / 5Y / 10Y 时间窗口切换。
  - 实时计算最新值、日期、区间涨跌幅（绝对值 + 百分比）。
  - 每个指标提供直达 FRED 官网详情页的外部链接。
  - 新增导航栏「数据源」分组及对应中英文本地化词条。

- **前沿章节深度拓展** (`src/components/FrontierConcepts.tsx`)
  - 7 大前沿方向（AI/ML 量化、ABM 多主体、GNN 网络、气候金融、神经 SDE、DeFi、CBDC）均新增可展开的交互式详情卡片。
  - 每张卡片包含：方法论、数学直觉（含 LaTeX 公式与推导说明）、应用场景、局限与争议。
  - 使用 Framer Motion `AnimatePresence` 实现平滑展开/收起动画。

### 改进

- **工具目录补全**
  - 资产定价、微观经济学、宏观经济学、风险管理四大板块新增多款交互式计算器与教学组件。
  - 所有计算器均内置「教材场景 / 市场场景」参数预设系统。

### 安全

- **数据库权限收紧**
  - 撤销 `PUBLIC`、`anon`、`authenticated` 对触发器专用 `SECURITY DEFINER` 函数的 `EXECUTE` 权限，消除 linter 0029 误报。
  - 文档化 `award_badge` RPC 的安全设计意图（基于 `auth.uid()` 的身份验证、严格的 slug 白名单、服务端资格校验）。

---

## 0.4.0 — 风险管理与计量工具

### 新增

- **VaR / ES 计算工具** (`src/components/risk/VaRTool.tsx`)
  - 支持参数法（方差-协方差）、历史模拟法、蒙特卡洛法三种计算路径。
  - 可视化收益率分布与风险阈值线。
- **计量经济学交互组件**
  - OLS、IV、GMM、GARCH、Kalman 滤波等模型的参数实验界面。

---

## 0.3.0 — 衍生品与固收工具

### 新增

- **Black-Scholes 期权定价计算器**
  - 实时希腊值（Greeks）计算与图表展示。
  - 隐含波动率反解（Newton-Raphson 迭代）。
- **蒙特卡洛期权定价**
  - 支持路径依赖型奇异期权（亚式、回望、障碍）。
- **固定收益工具集**
  - 债券现金流分析、收益率曲线构建、Vasicek / CIR 短率模型模拟。

---

## 0.2.0 — 平台框架与 Notebook

### 新增

- **Research Playbooks**
  - 论文复现、期权校准、风险简报、互动课程四大场景剧本。
  - 步骤化执行、交付物追踪与完成度仪表盘。
- **Sprint Composer**
  - 按研究者 / 授课教师 / 量化分析师角色自动生成 3/5/10 日行动简报。
- **Evidence Pack Builder**
  - 基于当前剧本与完成度生成可审计交付包。
- **Research Ops Board**
  - Readiness / Evidence / Handoff 三类评分与下一步行动队列。
- **Decision Memo Studio**
  - 一键生成导师评审、课堂复盘、风险委员会汇报用的决策备忘录。

### 基础设施

- Supabase 后端集成（Auth、RLS、Edge Functions）。
- 多语言 i18n 框架（中英文）。
- Playwright E2E 与 Vitest 单元测试套件。

---

## 0.1.0 — 项目启动

### 初始功能

- 首页导览与学科领域卡片（资产定价、衍生品、固定收益、风险管理、计量经济学、宏观模型）。
- Bloomberg Terminal 风格视觉系统（深翠绿 + 金色 + 奶油色）。
- 响应式布局与暗/亮模式支持。

---

## 版本号规则

本项目遵循 **语义化版本**（SemVer）：

- `MAJOR`：不兼容的 API 或数据结构变更。
- `MINOR`：向后兼容的新功能、新模块、新工具。
- `PATCH`：向后兼容的问题修复、性能优化、文案调整。
