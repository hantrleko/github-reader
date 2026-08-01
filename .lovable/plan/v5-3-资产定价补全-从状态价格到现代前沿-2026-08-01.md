# V5.3 资产定价补全：从状态价格到现代前沿

现有资产定价版块有 11 个工具（CAPM / 零β / ICAPM / APT / Fama-French / Fama-MacBeth / 异象排序 / GRS / SDF / CCAPM / HJ 边界）。对照报告的知识地图，缺的是「无套利骨架的前半段」「谜题的解释机制」「实证评价与前沿方向」三块。计划补 10 个新工具 + 1 篇导读专题，把版块从 11 个扩到 21 个工具。

## 一、新增工具（按报告章节分四组）

**A. 无套利骨架（报告二、四）**
1. 状态价格与风险中性测度 — 有限状态市场：输入状态支付矩阵与资产价格，反解状态价格 q、真实概率 π、SDF m=q/π 与风险中性概率 Q；判定无套利与完备性，不完备时给出价格区间（上下界）。
2. SDF 与线性因子模型的等价 — 展示 m = a − b'f 与 β 表示互相转换，风险价格 λ 与 b 的映射关系。
3. HJ 距离与定价误差评价 — 在现有 HJ 边界之上加 Hansen-Jagannathan 距离、GMM 定价误差、模型横向比较（CAPM vs FF3 vs FF5）。

**B. 偏好与谜题机制（报告六、七）**
4. Epstein-Zin 与长期风险 (Bansal-Yaron) — 分离风险厌恶 γ 与跨期替代弹性 ψ，可变增长率与波动率状态，输出 ERP、无风险利率与 SDF 波动。
5. 习惯形成 (Campbell-Cochrane) — 外部习惯、盈余消费比 s 的动态，展示时变风险厌恶与时变风险溢价。
6. 罕见灾难 (Rietz-Barro) — 灾难概率与幅度对 ERP、无风险利率的影响，同时解释股权溢价与无风险利率之谜。
7. 三大谜题对照面板 — 并排比较 CRRA / 长期风险 / 习惯 / 灾难 四条路线对「股权溢价、无风险利率、波动率」三谜题的解释力（含所需 γ 与隐含 SDF 波动）。

**C. 时间序列维度（报告七.3、九）**
8. Campbell-Shiller 分解与收益可预测性 — 股利价格比的对数线性分解，分离现金流新闻与折现率新闻，并做长期收益预测回归（含 Hodrick 标准误）。

**D. 前沿方向（报告九）**
9. 因子动物园与高维筛选 — 主成分与收缩（Ridge、Lasso）在多因子集合上的降维，多重检验校正（Harvey-Liu-Zhu 的 t>3 门槛），展示因子冗余。
10. 国际定价与货币风险 — UIP 偏离、Carry 组合排序、汇率与两国定价核之差（Backus-Foresi-Telmer）。

## 二、理论导读专题

在 `/s/asset-pricing-theory` 新增一篇结构化导读页（沿用现有前沿专题页风格），把报告主线做成可导航内容：价格→状态价格→SDF→均衡的骨架图、经典模型演进时间轴、三大谜题卡片、四层知识地图与阅读路线。每个理论块配「到实验室复现」按钮，直接跳到对应工具。

## 三、技术方案

- 计算逻辑：新增 `src/lib/quant/assetPricingAdvanced.ts`（状态价格与完备性、Epstein-Zin、习惯、灾难、Campbell-Shiller、HJ 距离、Carry），配套单测 `src/lib/quant/__tests__/assetPricingAdvanced.test.ts`，与现有 `assetPricing.ts` 同为纯函数风格。
- UI：新增 `src/components/asset/NoArbitrageTools.tsx`、`PuzzleTools.tsx`、`FrontierAssetTools.tsx`，复用 `AssetChrome.tsx` 的 Slider / Stat / Note 与 CHART 配色。
- 导航：在 `AssetPricingTools.tsx` 的 `CATEGORIES` 中新增「无套利与状态价格」「谜题与偏好」「前沿扩展」三类；工具目录 `src/data/toolsCatalog.ts` 与 `src/lib/sections.ts` 同步登记，专题页在 `App.tsx` 注册路由。
- 版本：升级到 **V5.3**，同步 `package.json`、`CHANGELOG.md`、首页与 SplashIntro 版本号及「最新更新」文案（zh/en 两份 locale）。

## 四、不做的事

不接入新的外部数据源；灾难与长期风险等模型使用解析近似与校准参数，不做完整数值动态规划求解。