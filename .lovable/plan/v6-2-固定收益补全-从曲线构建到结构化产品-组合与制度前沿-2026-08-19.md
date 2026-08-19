# V6.2 固定收益补全 — 从曲线构建到结构化产品、组合与制度前沿

现有固定收益覆盖：`bond.ts`（价格/YTM/久期）、`termStructure.ts`（NS/NSS 拟合）、`fixedIncome.ts`（Merton、CDS、Vasicek/CIR、Ho-Lee 可赎回债 OAS、PSA MBS、breakeven、蝶式、carry-roll）、`derivFrontier.ts`（Hull-White 债券期权、HJM 漂移、LMM caplet），实验室 `/s/fixed-income-lab` 仅 4 组面板。对照报告，缺口集中在：曲线构建与利差口径、免疫与组合策略、含权/可转债、信用利差分解与评级迁移、ABS/CDO 分层、回购杠杆、RFR 改革与负利率、气候与流动性前沿。本次按报告结构补成完整版块。

## 一、新增模型层 `src/lib/quant/fixedIncomeFrontier.ts`（+ Vitest）

1. **曲线与口径**：自举贴现因子（票息剥离）、多种插值（线性零率 / 分段常数远期 / 三次样条）对远期曲线平滑性的对比、远期利率与滚动收益分解、日算惯例与净价脏价换算。
2. **利差体系**：名义利差、Z-spread 求解、ASW（资产互换利差）、OAS 与 Z-spread 之差即期权成本，四者在同一债券上的一致性对照。
3. **风险度量扩展**：有效久期/有效凸性（含权债数值扰动）、美元久期与 DV01、关键利率久期对冲组合求解、久期缺口与免疫（Redington 条件、现金流匹配 LP 近似）。
4. **含权与可转债**：可回售债二叉树定价、可转债分解（债底 + 转换期权 + 强赎条款）、转换平价、Delta 与债性/股性区间。
5. **期限结构模型补齐**：Hull-White 校准到初始曲线（θ(t) 反解）、均衡 vs 无套利模型对比、期限溢价的预期理论 vs 流动性偏好分解（Campbell-Shiller 检验形式）。
6. **信用**：信用利差分解（预期损失 / 风险溢价 / 流动性 / 税收）、评级迁移矩阵（多期演化、迁移风险 VaR）、CDS-债券基差、结构化 vs 简约模型对照。
7. **结构化产品**：ABS/CDO 现金流瀑布（顺序偿付 + 超额抵押触发）、Gaussian copula 单因子分层损失与相关性微笑、MBS 预付款对负凸性的影响（利率情景下的久期漂移）。
8. **杠杆与融资**：回购杠杆收益放大、折扣率（haircut）上升引发的追加保证金螺旋、融资流动性冲击下的强平情景。
9. **前沿**：RFR 改革（SOFR 后视复利 vs LIBOR 前瞻定盘、fallback 利差调整）、负利率下的位移对数正态 caplet、气候/ESG 利差（绿色溢价与转型风险贴水）、债券流动性度量（成交稀疏下的价差估计与流动性溢价）。

每个函数配断言式单测（恒等式、极限、单调性），与 `microstructure.test.ts` 风格一致。

## 二、新增实验室 `/s/fixed-income-frontier`（`src/components/bond/V62FixedIncomeTools.tsx`）

沿用现有两层分类导航 + Recharts 模式，五组共 16 个交互面板：
- 曲线与口径（自举、插值对比、远期与滚动）
- 利差与风险（Z/ASW/OAS 三口径、有效久期凸性、KRD 对冲、免疫）
- 含权与可转债（可回售树、可转债分解图）
- 信用与结构化（利差分解、迁移矩阵、瀑布、copula 分层、CDS-债基差）
- 组合与制度（杠铃/子弹/梯形、回购杠杆与保证金螺旋、RFR 与负利率、气候利差）

现有 `/s/fixed-income-lab` 保留不动，两页顶部互链。

## 三、新增导读 `/s/fixed-income-theory`（`src/components/essays/FixedIncomeTheory.tsx`）

按报告写九节：核心问题与利率概念体系、经典定价与久期凸性、利差语言、期限结构理论与曲线构建、动态模型谱系（Vasicek→CIR→HW→HJM→LMM）、信用与结构化、组合管理与杠杆、历史脉络（久期革命→模型繁荣→危机→后危机改革）、前沿与八步研究流程 + 四阶段学习路线。每节配"到实验室复现"跳转。

## 四、集成与版本

- `src/lib/sections.ts` 注册两个新 section，归入 `fixed-income` 分组。
- `zh.json` / `en.json` 增加导航标签，首页 Latest Update 文案更新为 V6.2。
- `package.json`、`CHANGELOG.md`、`src/components/Changelog.tsx` 升至 **6.2.0**。
- 运行全量单测 + 类型检查 + 文案规范校验，并用浏览器验证两个新路由渲染。

## 技术说明

模型层为纯函数、无外部依赖；随机部分（瀑布违约情景、保证金螺旋）使用现有 LCG 确定性种子保证测试可复现；copula 分层用高斯求积而非蒙特卡洛以保证浏览器内即时响应；样条插值与 KRD 对冲复用现有最小二乘/线性代数工具，避免新增依赖。
