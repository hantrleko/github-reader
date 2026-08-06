# 统一站点信息架构：首页 / 顶栏 / 板块目录使用同一套分类

## 现状问题（已核对代码）

站内目前存在**三套互不相同的分类**：

1. `src/lib/sections.ts` 中每个板块的 `group` 字段：基础、基础定价、衍生品、固收与组合、资产定价、计量经济、风险管理、宏观、理论、量化与学习、数据源、前沿 —— 首页「功能板块目录」按它分组。
2. `src/components/Navbar.tsx` 里手写的 `GROUPS`：导览、理论、基础、衍生品、固收、计量、数据、量化 —— 与上面对不上。例如「资产定价 / 资产定价导读」被放进顶栏的“固收”组，「风险管理」「投资组合导读」被放进“计量”组，两篇前沿长文被放进“量化”组。
3. `src/components/HeroToolStrip.tsx` 里的 `UNIT_01…UNIT_08`：第三套八宫格命名（Pricing Engine / Derivatives Lab / …），且锚点指向首页上已不存在的 `#derivatives`、`#risk` 等 hash。

结果：顶栏看到的版块名、首页八宫格的名字、首页目录里的分组三处都不一样，用户无法建立稳定的心智地图。

## 目标

一套分类，三处复用；顶栏、首页快捷入口、首页目录完全一致，新增板块时只改一个地方。

## 统一后的一级域

```text
01 导览 Overview        首页 / 主题图谱 / 模型速览 / 学习路径 / 测验
02 基础 Foundations     微观经济学 / 宏观经济学 / 宏观高阶实验室
03 定价 Pricing         基础定价 / 隐含波动率 / 蒙特卡洛 / 衍生品高阶
04 固收 Fixed Income    债券 / 短率模型 / 固收高阶 / 期限结构
05 资产定价与组合       CAPM 与多因子 / 有效前沿 / 量化策略 / 资产定价导读 / 投资组合导读
06 计量与时序           计量经济学 / 计量导读 / 时间序列导读 / 行为与微观结构
07 风险 Risk            风险管理
08 数据 Data            美股 / A 股 / FRED / World Bank / ECB-BIS / CoinGecko / Alpha Vantage / CBOE / 经济日历 / ETF / 板块热力图 / 市值 / 另类数据 / 外部工作台
09 前沿 Frontier        万亿美元的方程 / AI 量化实录 / 前沿概念 / 可视化工作台 / 平台
```

导读类长文归到它所讲的学科域，不再散落在“量化”里；前沿只放长文与实验性模块。

## 改动内容

**1. 分类成为唯一数据源** — 在 `src/lib/sections.ts` 定义 `NAV_GROUPS`（id、中文名、英文 kicker、排序），把每个 `SectionDef.group` 改为引用这些 id，并导出 `sectionsByGroup()`。逐条按上表重新归类现有板块。

**2. 顶栏由数据驱动** — `Navbar.tsx` 删除手写 `GROUPS`，改为从 `sectionsByGroup()` 生成下拉菜单；组名与项名取自 sections 定义（i18n 键缺失时回落到中文 label），确保顶栏与目录逐字一致。“More” 里的独立页面（Tools / Data / Review / …）保持不变，仅整理顺序。

**3. 首页八宫格与目录对齐** — `HeroToolStrip.tsx` 改为渲染上表的一级域，链接指向该域的入口板块路由（不再用失效的 `#hash`）；首页 `SectionDirectory` 沿用同一 `NAV_GROUPS` 顺序与命名，于是三处标题完全相同。

**4. 首页区块顺序梳理** — `Index.tsx` 保持 Hero → 一级域入口 → 编辑导读 → 今日推荐 → 主题 / 模型 / Notebook → 工作流 → 完整目录，并统一域标题样式与 01–09 编号体系。

## 技术说明

- 纯前端信息架构调整：不改计算库、边缘函数或路由 id，所有 `/s/:id` 链接保持有效，不影响书签与滚动恢复逻辑。
- i18n：新增 `nav.groups.*` 中英文键，缺失时回落到 `sections.ts` 的 label。
- 需同步检查引用旧分组名的位置：`src/pages/Index.tsx`、`src/pages/ToolsCatalog.tsx`、`src/components/CommandPalette.tsx`。