# 模块 09「行为金融 / Behavioral Finance」升级方案（V7.5）

## 现状审计

- **两个实验室共 17 个工具**
  - `behavior-lab`（V59BehaviorTools，8 个面板）：累积前景理论、短视损失厌恶、BSV、DHS、Hong-Stein、有限套利、Baker-Wurgler 情绪、行为公司金融。
  - `behavior-microstructure`（V47BehaviorMicroLab，9 个面板，分行为 / 微观结构两组）：双曲贴现、DSSW 噪声交易者、过度自信换手率、处置效应、Kyle、Glosten-Milgrom、Roll、Almgren-Chriss、Amihud。
- **工具目录完全缺失**：`toolsCatalog.ts` 中没有任何一条行为金融条目，用户无法在目录中搜索或跳转到这些工具。
- **无工具级深链**：两个实验室都用本地 `useState`，切换工具不改 URL，无法分享具体工具。
- **未双语化**：标题、副标题、分组名、面板标题与说明文字全部硬编码中文。

## 升级内容

1. **接入 `useToolTab` 深链**
   - `V59BehaviorTools`：`?t=cpt|mla|bsv|dhs|hs|limits|sentiment|corporate`。
   - `V47BehaviorMicroLab`：`?t=behavior|micro`（保持现有两组标签为一级切换）。
2. **补齐工具目录（17 条新条目）**
   - 分两类：`behavior`（行为偏差与有限套利）与微观结构类工具沿用既有分类。
   - anchor 统一为 `/#behavior-lab?t=<id>` 与 `/#behavior-microstructure?t=<tab>`。
   - `version` 联合类型加入 `"V7.5"`。
3. **分类导航双语化**：4 个分组（偏好偏离 / 信念偏差 / 有限套利与异象 / 行为公司金融）与 2 个标签补 `labelEn`，英文界面显示英文。
4. **面板文案中英双语化**：词条归入 `labs.behavior.*`（V59）与 `labs.behaviorMicro.*`（V47），迁移标题、说明、图表标题、参数标签与注释。
5. **版本 V7.5 与验证**：同步 `package.json`、`CHANGELOG.md`、`Changelog.tsx`、首页更新卡片；运行类型检查、文案一致性检查、Vitest、深链抽查。

## 技术说明

计算逻辑（`src/lib/quant/behaviorFinance.ts`、`behaviorMicro.ts`）与图表 dataKey 均不改动，只改展示层与路由参数。理论导读页 `behavior-theory` 本轮不动。
