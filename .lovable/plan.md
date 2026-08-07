# V5.7 衍生品定价补全

按《衍生品定价理论框架报告》补齐衍生品板块，沿用 V5.3–V5.6 的做法：新增计算库 + 交互工具组 + 理论导读专题 + 版本同步。

## 现状与缺口

已有：二叉树、BSM/Greeks、局部波动率、Heston、SABR、Merton/Kou 跳跃、Bates、方差互换、Crank–Nicolson PDE、Delta 对冲归因、自动赎回结构化票据、XVA。

报告中尚未覆盖的主线：
- 一价定律与状态价格：状态价格 / 等价鞅测度 / 完全 vs 不完全市场价格区间（超复制—次复制）
- 美式与百慕大：Longstaff–Schwartz 最小二乘蒙特卡洛（现仅有树与 PSOR）
- 远期期货与持有成本：便利收益、期货—远期差异（随机利率下）
- 波动率曲面工程：Dupire 从曲面反解、无套利曲面检查（蝶式/日历套利）、SVI 拟合
- 短期利率与曲线模型：Vasicek / CIR / Hull–White 债券与期权闭式解、HJM 漂移条件演示、LMM Caplet
- 信用：约化式违约强度、CDS 平价利差与信用曲线自举
- 数值方法：方差缩减（对偶、控制变量）、准蒙特卡洛、Fourier/Carr–Madan（COS/FFT）定价
- 校准与模型风险：曲面校准目标函数、参数不确定性下的价格区间
- 前沿：粗糙波动率（rBergomi）、不完全市场下的最优对冲（均方对冲/效用无差别价格）

## 实施内容

### 1. 计算库 `src/lib/quant/derivFrontier.ts`
新增纯函数模块（附单元测试）：
- `statePricesFromTree` / `arbitrageBounds`（超复制—次复制区间）
- `longstaffSchwartz`（美式/百慕大 LSMC，含 Laguerre 基）
- `futuresVsForward`、`convenienceYieldImplied`
- `sviFit` + `surfaceArbitrageCheck`（蝶式、日历）+ `dupireLocalVolFromSurface`
- `vasicekBond` / `cirBond` / `hullWhiteBondOption` / `hjmDriftCheck` / `lmmCapletBlack`
- `hazardRateBootstrap` / `cdsParSpread`
- `carrMadanFFT`（Heston 特征函数）、`mcVarianceReduction`（对偶+控制变量+Sobol 拟随机）
- `rBergomiPaths`（粗糙波动率）、`meanVarianceHedge`（不完全市场最优对冲/效用无差别价格）

### 2. 工具组 `src/components/deriv/V57Tools.tsx`
8 个交互实验室，风格与 V4.2/V5.6 一致（参数面板 + Recharts 图 + 结论摘要 + Tool Bus 接入）：
1. 状态价格与无套利区间实验室
2. 美式/百慕大 LSMC 定价台
3. 期货—远期与持有成本实验室
4. SVI 曲面拟合与无套利检查（含 Dupire 反解）
5. 短期利率模型台（Vasicek/CIR/Hull–White + HJM 漂移条件）
6. 信用曲线自举与 CDS 定价台
7. 数值方法实验室（FFT vs MC vs 方差缩减，收敛/误差对比）
8. 粗糙波动率与最优对冲实验室

### 3. 理论导读 `src/components/essays/DerivativesTheory.tsx`
路由 `/s/derivatives-theory`，与其他四篇导读同结构：核心问题五问、模型谱系图（ASCII）、历史脉络、前沿方向、每节「到实验室复现」跳转链接。

### 4. 集成与版本
- `src/lib/sections.ts`：注册 `derivatives-theory`，并入定价类 NAV_GROUPS；V57 工具挂入衍生品板块的二级分类（新增「曲线与信用」「数值与前沿」两组）
- `package.json`、`Changelog.tsx`、首页加载页版本号、i18n（zh/en）文案统一升至 **5.7.0**
- 首页「最新更新」卡片改写为 V5.7 要点

## 技术说明
纯前端 TypeScript 计算，无后端改动；新增函数配 `src/lib/quant/__tests__/derivFrontier.test.ts`（对 Vasicek/CIR 闭式解、LSMC 与二叉树美式价、FFT 与 Heston 半解析价、CDS 平价利差做交叉验证）。完成后跑单测与 Playwright 渲染检查。
