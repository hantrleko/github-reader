# V2.9 — 整体优化路线图

经过 V2.0 → V2.8 的快速横向扩张，平台已有 **36 个工具 + Notebook + 数据层**。当前瓶颈不再是"缺工具"，而是 **可发现性、性能、教学闭环、可信度**。下面是从整体出发的优化方案，分四个维度。

---

## 一、信息架构 & 可发现性（最高优先级）

**问题**：首页是一条 ~3000px 的长滚动，36 个工具靠 ⌘K 才找得到；新用户在第 5 个 section 就会迷失。

1. **首页改为 Hub 模式**
   - 保留 Hero + TopicCards + 一个"Today's Pick"轮播（随机推荐 3 个工具 + 学习路径入口）
   - 把 Chapter 1–8 改为 **路由式子页面** `/lab/:chapter`，而不是 lazy section
   - 当前 SPA 滚动模式留作"Print View / 全景模式"开关
2. **全局工具索引页 `/tools`**
   - 36 个工具按 *维度 × 难度 × 引用文献* 矩阵排列
   - 支持按"教材章节 / 研究主题 / 输入数据类型"三种视图切换
3. **面包屑 + 上下文导航**
   - 每个工具页右侧加"相关工具"卡片（如 Heston → SABR、Local Vol、IV Surface）
   - 工具底部加"下一步推荐"（学习路径接续）

---

## 二、教学闭环（把工具变成课程）

**问题**：当前每个工具是"独立计算器"，缺少"读 → 算 → 测 → 应用"的完整闭环。

1. **每个工具补齐 4-Pane 结构**（统一模板）
   ```text
   ┌─────────────┬─────────────┐
   │  Theory     │  Interactive│
   │  (公式推导)  │  (参数面板)  │
   ├─────────────┼─────────────┤
   │  Reference  │  Mini-Quiz  │
   │  (论文/教材) │  (3 题自测)  │
   └─────────────┴─────────────┘
   ```
2. **学习路径升级为"课程"**
   - 现有 LearningPath 只是链接列表 → 升级成进度跟踪 + 解锁机制（localStorage）
   - 三条路径：*Quant 入门 / 风险管理师 / 学术研究*
3. **统一术语词典 `/glossary`**
   - 所有工具中的关键词（如 IV、PnL、CVaR）做成 hover 词条 + 跳转词典页

---

## 三、性能 & 工程质量

**问题**：V28Platform.tsx 等单文件 > 1000 行；首页 lazy chunk 仍有 ~10 个；很多手写算法没有单元测试。

1. **代码拆分**
   - 把 V2x 巨型聚合组件拆成 `tools/{id}/index.tsx + math.ts + Panel.tsx`
   - 数学纯函数全部抽到 `src/lib/quant/` 下，便于复用 + 测试
2. **算法测试覆盖**
   - 为关键定价 / 估计函数加 vitest 单元测试，对照已知闭式解（BS、Vasicek 债券、OLS β）
   - 在 CI 标注"已验证"徽章，提升可信度
3. **首屏性能**
   - 移除首页的 36 个 DeferMount 占位，改为只在 hub 出现 8 张卡 + 1 张推荐
   - 全局字体子集化（Playfair Display 仅保留 latin + 数字）
4. **可访问性**
   - 所有计算结果加 `aria-live="polite"`
   - 颜色对比度复核（gold on warm white 在浅色模式下偏低）

---

## 四、可信度 & 数据真实性

**问题**：工具产出大多是合成数据；引用了论文却没有"原文 vs 本实现"的对照。

1. **Benchmark 抽屉**
   - 每个工具加 "📐 Benchmark" 按钮，弹出对照表：
     *本实现结果 / 论文表格值 / 闭式解 / 误差%*
2. **真实数据深度集成**
   - V2.8 的 FRED/Yahoo loader 接入到所有工具的输入面板（"Load from market"按钮）
   - 增加 Fama-French、CRSP 样本片段、BIS 利率曲线
3. **导出 & 复现**
   - 每次计算生成 *可分享的 URL*（参数编码到 querystring）
   - "Export to Python / R" 按钮：把当前参数输出为可运行脚本（教学用途）
4. **引用规范化**
   - 把 `lib/citations.tsx` 升级为 BibTeX 数据库，每个工具底部生成 APA 引用块

---

## 实施建议（建议作为 V2.9 三个 Sprint）

- **Sprint A（IA & 性能）**：路由化 + `/tools` 索引 + 代码拆分 + 字体子集化
- **Sprint B（教学闭环）**：4-Pane 模板 + 学习路径进度 + 术语词典
- **Sprint C（可信度）**：Benchmark 抽屉 + 真实数据深集成 + 导出 Python/R + BibTeX

---

## 技术细节

- 路由：在 `App.tsx` 增 `/lab/:chapter`、`/tools`、`/glossary`，保留 `/` 作为营销页
- 进度跟踪：`useLocalStorage('lp-progress', {...})`，无需后端
- URL 状态：用 `nuqs` 或自写 `useSearchParams` 序列化数字参数
- 测试：`vitest` + 已有 `playwright-fixture.ts`，新增 `src/lib/quant/__tests__/`
- BibTeX：保留现有 citations 数据，新增 `formatAPA()`、`formatBibTeX()` 辅助函数

请选择想先做哪个 Sprint，或挑出最关心的 3-4 项，我按选择实现。
