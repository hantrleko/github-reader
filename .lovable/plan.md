# V4.8 可视化强化计划

围绕现有 60+ 工具的 Recharts / 自绘 SVG 图表，做一次系统性可视化升级。分为「基础设施」+「六大能力」+「六个示范工具」三层。

## 一、基础设施（统一图表体验）

1. **扩展 `src/components/common/ChartTheme.tsx`**
   - 新增 `ChartToolbar`：右上角操作条（PNG 下载 · CSV 导出 · 复位缩放 · 全屏）。
   - 新增 `useChartExport` hook：把任意 SVG/Canvas 节点转 PNG（`html-to-image` 或原生 `XMLSerializer + canvg`）。
   - `ThemedTooltip` 升级：支持自定义 formatter、多序列排序、Δ 变化列。
   - 增加 `CHART_PALETTES`：`sequential` / `diverging` / `categorical` / `colorblind-safe` 四套，全部走 HSL token。

2. **新增 `src/components/common/ChartFrame.tsx`（升级版）**
   - 统一标题 / 副标题 / 图例 / 工具条 / 脚注引用 五段式布局。
   - 内置 `<Reveal>` 入场动画 + 骨架态 + 空态。
   - 支持 `compareRef`：Compare Mode 下自动叠加基线序列。

## 二、六大可视化能力

| # | 能力 | 说明 | 主要文件 |
|---|------|------|----------|
| 1 | **Brush + 双 Y 轴同步缩放** | 长时序（利率、宏观、回测净值）加 Recharts `<Brush>`；跨图 `SyncId` 联动 | `ChartFrame` 参数化 |
| 2 | **交叉参考线 / Hover Crosshair** | 鼠标移动全图共享 x 轴指针，显示对应数值卡片 | 新 `CrosshairLayer.tsx` |
| 3 | **区间标注（RegimeBands / 事件线）** | 衰退期、政策事件、DID 处理时点竖线；接 FRED USREC | 新 `AnnotationLayer.tsx` |
| 4 | **置信带与分布图强化** | 蒙特卡洛/Bootstrap 输出的分位数带 `<Area>` 双边填充 + 中位数线；直方图叠 KDE 曲线 | 新 `FanChart.tsx` / `HistoKde.tsx` |
| 5 | **3D / 曲面视图** | 波动率曲面（Heston/SABR/Local Vol）、久期-凸度曲面：轻量 `three.js` + `@react-three/fiber`（已在依赖候选） | 新 `Surface3D.tsx` |
| 6 | **动画时间轴 Scrubber** | Solow 收敛、Kyle 均衡、DSSW IRF 支持"播放/暂停/拖拽 t"，展示动态过程 | 新 `TimeScrubber.tsx` |

## 三、六个示范工具接入

- **`BacktestLab`**：净值 + Drawdown 双面板 Brush 联动 + 回撤区间高亮 + PNG 导出。
- **`NelsonSiegelTool`**：曲线 FanChart 置信带 + 事件线（QE/加息日）+ CSV。
- **`HestonTool` / `SABRTool`**：新增 3D IV 曲面 Tab，可旋转/切片。
- **`V47 Almgren-Chriss`**：执行前沿加交互 Crosshair + 拖拽 λ 时间轴 Scrubber。
- **`V39 Event-Study DID`**：动态处理效应图加置信带 + 处理时点竖线注释。
- **`RatesTermStructure` / 宏观图**：Brush + NBER 衰退带（`AnnotationLayer`）。

## 四、辅助增强

- **色觉友好模式**：`ThemeToggle` 增加"Colorblind"开关，切换 `CHART_PALETTES.colorblindSafe`。
- **打印/PDF 优化**：`@media print` 下图表转纯白背景 + 黑色轴，保证一键报告导出可读。
- **全局 SR-only 数据表**：每张图旁挂 `<VisuallyHidden>` 数据表，提升 a11y & SEO。

## 五、发版与文档

- 版本升到 **V4.8 "可视化强化"**；更新 `CHANGELOG.md`、`Changelog.tsx`、`HeroSection` 最新更新卡、`zh/en.json`。
- 新增 `/s/visualization-guide`（可选）：一页展示所有新组件的用法示例。

## 技术细节

- 依赖新增：`html-to-image`（PNG 导出，~15KB gz）；3D 视图确认后再引入 `three` + `@react-three/fiber`（首屏懒加载，避免 bundle 膨胀）。
- 所有颜色走 `hsl(var(--token))`；禁止硬编码色值。
- 新组件全部提供 `data-testid`，并补 vitest 快照/单测（导出函数、注释解析）。
- Compare Mode 复用现有 `useToolBus`，图表订阅 `compareRef` 序列自动叠加虚线。

## 优先级建议

若想分两次发布：
- **V4.8a（基础设施 + 能力 1/2/3/4 + 4 个示范工具）**——投入约 60%，覆盖最痛的"看得清、导得出、能标注"。
- **V4.8b（3D 曲面 + 时间轴 Scrubber + 剩余工具接入 + a11y/打印）**。

请确认：全量一次做 V4.8，还是先做 V4.8a？是否要引入 3D（`three.js`，会加约 150KB gz，懒加载）？
