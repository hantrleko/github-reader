# V5.8 风险管理补全 — 从计量指标到资本、监管与韧性

对照《金融风险管理理论与方法框架报告》，现有风险版块已有 15 个工具（VaR 三法、Merton、Copula、EVT、ES 回测、压力测试、CVA/XVA、信用组合 Copula、系统性风险、LVaR、FRTB、OpVaR、反向压力、集中度）。缺口集中在：风险度量公理与可引出性、波动率建模与过滤式历史模拟、信用组合的 PD/LGD/EAD 与评级迁移、Basel 资本栈与流动性监管比率、模型风险与稳健（模糊厌恶）决策、融资流动性螺旋。本次补齐这 6 类共 8 个实验室，并新增一篇理论导读。

## 新增工具（风险版块 15 → 23）

新增三个子分类：**度量与建模**、**信用组合与资本**、**监管与韧性**。

1. **风险度量公理台** — 一致性四公理检验（VaR 次可加性反例）、谱风险测度、扭曲测度、ES 的可引出性与联合可引出（Fissler-Ziegel 打分函数对比）。
2. **波动率与过滤式历史模拟** — EWMA / GARCH(1,1) / HAR 波动率预测对比，标准化残差 + FHS 生成条件 VaR/ES，与静态历史法并列回测。
3. **PD / LGD / EAD 与 IRB 资本台** — 预期损失分解、Vasicek 单因子非预期损失、Basel IRB 风险权重公式（相关性函数、期限调整）、PD 顺周期性与 through-the-cycle 对比。
4. **评级迁移与 CreditMetrics** — 迁移矩阵（生成元、n 期外推）、阈值法组合估值分布、信用 VaR/ES 与集中度、迁移 vs 违约损失分解。
5. **融资流动性与螺旋** — 保证金/回购折扣、去杠杆循环（Brunnermeier-Pedersen 式反馈）、抛售价格冲击、生存天数与现金缺口图。
6. **Basel 资本栈与 LCR/NSFR** — CET1/AT1/T2、缓冲（CCB、CCyB、G-SIB）、杠杆率、RWA 与流动性比率的一体化计算与达标检查。
7. **模型风险与稳健决策** — 参数/模型不确定性区间（VaR 的模型分歧带）、最坏情形与 ε-污染稳健风险、模型平均、SR 3-11 三道防线检查表。
8. **韧性与恢复计划实验室** — 多期资本轨道压力路径、损失吸收顺序、逆周期缓冲释放、恢复触发点与管理层行动效果模拟。

## 新增专题

`/s/risk-theory` **《金融风险管理导读 (V5.8)》**：按报告结构分十节（风险本质与闭环、风险分类与相互作用、市场风险计量、信用风险框架、流动性/操作/模型风险、Basel 与 FRTB、危机史与范式转变、系统性与前沿、稳健性判断框架、学习路线图），每节配公式块与"在实验室复现"跳转链接，沿用 `AssetPricingTheory` / `PortfolioTheory` 的排版组件。

## 技术实现

- 计算层：新建 `src/lib/quant/riskFrontier.ts`（谱/扭曲测度、打分函数、EWMA/GARCH/FHS、IRB 公式、迁移矩阵与生成元、CreditMetrics 蒙特卡洛、去杠杆循环、Basel 资本栈、稳健区间、多期资本路径），复用 `riskAdvanced.ts` 中的 `makeRng` / `normCdf` / `normInv` / `quantile`。
- 单测：新建 `src/lib/quant/__tests__/riskFrontier.test.ts`，覆盖次可加性反例、ES ≥ VaR、IRB 权重单调性、迁移矩阵行和为 1 与 Chapman-Kolmogorov、FHS 收敛、资本栈守恒等约 30 项。
- UI 层：新建 `src/components/risk/V58Tools.tsx`（8 个实验室，沿用 `frontier/ui` 的 `Slider` / `Stat` / `C` / `tooltipStyle` 与 `PresetButtons`），在 `src/components/RiskTools.tsx` 的 `TOOLS` 中注册并加入三个子分类。
- 专题：新建 `src/components/essays/RiskTheory.tsx`，在 `src/lib/sections.ts` 注册 `risk-theory` 并归入 Frontier 域，同步 `NAV_GROUPS`。
- 版本：`package.json`、`src/lib/appVersion.ts`、`Changelog.tsx`、`src/i18n/locales/zh.json` 与 `en.json`（含首页最新更新卡片与加载页版本号）统一升至 **5.8.0**。
- 验证：`vitest run` 全绿 + Playwright 打开 `/s/risk` 与 `/s/risk-theory` 截图确认渲染。
