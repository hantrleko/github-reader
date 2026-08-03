# V5.4 计量经济学补全 · 从识别到可信推断

对照上传的《计量经济学理论与方法框架报告》，现有计量版块已有 45+ 工具（因果推断、时间序列、波动率、离散选择/面板、机器学习计量、诊断六大类）。报告中真正的缺口集中在**识别逻辑、推断严谨性与方法论叙事**三处。本次分四阶段补齐，并新增一篇理论导读专题，与资产定价版块的结构保持一致。

## 已覆盖（不重复建设）
OLS/IV、DID/事件研究/交错 DID/合成对照、RDD（含 ROT/CCT 带宽）、PSM、GMM、动态面板、SVAR/IRF/FEVD、协整/VECM、单位根与面板单位根、GARCH 家族、分位数回归、Logit/Probit/Tobit、LASSO、DML、因果森林、核回归、一键诊断报告。

## 阶段一：识别与推断内核（新增 4 个工具）
- **弱工具变量诊断台**：第一阶段 F / Cragg-Donald 统计量、Stock-Yogo 临界值、Anderson-Rubin 弱识别稳健置信区间、2SLS 偏误随工具强度的可视化。
- **Heckman 样本选择模型**：两步法与逆米尔斯比率、选择方程与结果方程分离、缺乏排除性约束时的识别脆弱性演示。
- **检验三兄弟 (Wald / LR / LM)**：同一约束下三统计量的几何对照与有限样本差异，配卡方分布图示。
- **标准误实验室**：同方差 / 稳健 HC / 聚类（少簇偏误）/ Wild bootstrap 的覆盖率蒙特卡洛对比。

## 阶段二：面板设定与回归几何（新增 2 个工具）
- **FE vs RE 与 Hausman 检验**：组内、组间、随机效应三种估计对照，并给出 Mundlak 相关随机效应写法。
- **FWL 与共线性几何台**：Frisch-Waugh-Lovell 分步残差化演示、VIF 与方差膨胀的几何解释。

## 阶段三：现代前沿（新增 2 个工具）
- **高维 IV 与后选择推断**：Post-double-selection LASSO 与朴素后选择的置信区间覆盖率失效对比。
- **异质性处理效应诊断**：CATE 排序、GATES 与 BLP 校准检验，复用既有因果森林输出。

## 阶段四：理论导读专题
新增路由 `/s/econometrics-theory`（分组「计量经济学」），结构对齐资产定价导读：
- 主线知识地图：DGP → 识别 → 估计 → 推断 → 解释与外推
- 三类问题分栏：描述 / 预测 / 因果，附常见误用卡片
- 发展史时间轴：概率革命 → 联立方程与时间序列革命 → 可信度革命 → 高维与机器学习
- 「方法—问题」决策表与论文最低报告清单
- 每个知识块带「到实验室复现」按钮，跳转到对应工具

## 技术说明
- 新增 `src/lib/quant/econAdvanced.ts` 承载全部新算法（弱 IV/AR 区间、Heckman、三检验、bootstrap SE、Hausman、PDS-LASSO、GATES），配套 `src/lib/quant/__tests__/econAdvanced.test.ts` 单元测试。
- 交互层新增 `src/components/econ/V54Tools.tsx`（阶段一至三共 8 个工具），沿用现有 `Slider / ResultRow / PresetButtons` 与统一图表主题。
- 在 `EconometricsTools.tsx` 的 TOOLS 与分类中登记：新增「识别与推断」分类，其余归入既有「离散选择 / 面板」与「机器学习计量」。
- 专题页 `src/components/essays/EconometricsTheory.tsx`，在 `src/lib/sections.ts` 注册；`src/data/toolsCatalog.ts` 同步登记 8 个新工具。
- 版本号升至 **V5.4**：`package.json`、更新日志（`Changelog.tsx` / `ChangelogPage.tsx`）、首页「最新更新」zh/en 文案、启动加载页版本号全部同步。