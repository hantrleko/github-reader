
# Reactive Notebook v2 实施方案

目标：把现有 Notebook 从「参数→公式/图」线性结构，升级到 **Observable 级反应式 DAG**：任意 cell 可声明变量、依赖任意上游变量、上游变化只重算受影响的下游；同时补齐 cell 类型、导出、AI 与协作能力。

---

## 一、核心：反应式依赖图（runtime 重写）

### 1. Cell 模型扩展
现有：`param / markdown / formula / chart`。新增：

- `js`：受限 JS 代码 cell，可 `return` 任意值（数字/数组/对象），声明 `name` 暴露给下游
- `table`：表格 cell，渲染数组对象（自动列推断 + 排序 + CSV 复制）
- `data`：数据源 cell，封装 `fetch` 受限白名单（FRED / market-quotes / Fama-French，复用现有 edge functions），返回数组
- `slider` / `select` / `checkbox` / `text`：把 `param` 拆成多种输入控件
- `view`：声明性图表 DSL（折线/散点/直方图/热力图），底层仍 recharts

### 2. 依赖收集
- 每个 cell 都有一个**变量名 `name`** 与一个**表达式/代码**
- 通过解析表达式抓取 `p.X` 与 **全局命名 `name` 引用**（用正则 + 标识符白名单，足够 v2）
- 构建 DAG，拓扑排序计算；任意 cell 输入变化只重算其传递闭包，结果用 `Map<cellId, value>` 缓存
- 检测循环依赖 → cell 上红条提示

### 3. 沙箱执行
- 复用现有 `new Function` + 白名单 helpers，扩展：
  - `bs*`、`bond*`、`ols*`（从 `src/lib/quant/*` 注入）
  - `d3-array` 风格 helpers：`mean / std / quantile / linspace`
  - `fetch` **禁用**；数据只能通过 `data` cell 注入
- 单 cell 执行 `try/catch` + 软超时（同步预算 50ms，超出标灰显示 timeout）
- 异步 `data` cell 用 React Query，结果以 promise 解析后注入 DAG

### 4. UI
- 左侧 cell 列表加 **依赖侧栏**：点 cell 高亮其上下游、显示「依赖：S, K, sigma → 被引用 3 次」
- cell 顶部 chip：`name` 重命名、kind 切换、运行状态（fresh / stale / error）
- 拖拽排序（dnd-kit）取代上下箭头

---

## 二、导出 / 导入

- **`.ipynb` 导出**：把 markdown / formula / js / chart 转为 Jupyter cell（公式用 Markdown $$，js 用 `code` cell 注释「JS sandbox」），下载即可在 Jupyter 中打开（视觉一致，不可执行）
- **`.md` 导出**：已存在，补 table / js cell 渲染
- **`.json` 导入/导出**：原始 cells 数组，便于版本管理
- **Import .ipynb**：解析 markdown cell，code cell 转 `js`（标 unsafe，需用户手动启用）

---

## 三、AI 助手（复用 `ai-explain` edge function 扩展）

- cell 右上角 `✨ Explain`：把当前 cell + 上游变量名快照发给 `ai-explain`
- 新增 `ai-suggest` 路由（同一 edge function，参数化 mode）：
  - "generate cell from prompt"：用户输入"画 S vs Call price"，返回一个 chart cell JSON
  - "fix this cell"：发送报错 + cell 内容，返回修正建议
- 全部走 Lovable AI Gateway（gemini-2.5-flash），无需 API key

---

## 四、协作 / 分享

- 公开 notebook 已支持，新增：
  - **Embed snippet**：`/notebook/embed?id=…` 仅渲染单 cell 或全 notebook，给 iframe 用
  - **永久链接 + 参数覆盖**：`?id=…&p.S=120&p.K=110` 进入只读模式并应用覆盖参数
  - **版本快照**：每次保存写入 `notebook_versions` 表，可在右侧抽屉中查看 diff/恢复

---

## 五、文件结构

```text
src/
  pages/Notebook.tsx                  // 顶层布局,委托给下面模块
  components/notebook/
    CellList.tsx                      // dnd-kit 排序
    cells/
      MarkdownCell.tsx / ParamCell.tsx / FormulaCell.tsx
      ChartCell.tsx / JsCell.tsx / TableCell.tsx / DataCell.tsx
    DependencyPanel.tsx               // 侧栏 DAG 视图
    AiAssistantDrawer.tsx
    VersionHistoryDrawer.tsx
  lib/notebook/
    types.ts                          // Cell / Value / Graph 类型
    sandbox.ts                        // new Function + helpers + timeout
    dag.ts                            // 依赖收集 + 拓扑排序 + 增量重算
    exportIpynb.ts / exportMd.ts / importIpynb.ts
supabase/
  functions/ai-explain/index.ts       // 增加 mode: explain | generate | fix
  migrations/...                      // notebook_versions 表 + RLS
```

---

## 六、数据库变更

```sql
create table public.notebook_versions (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid references public.user_notebooks(id) on delete cascade not null,
  user_id uuid not null,
  cells jsonb not null,
  title text not null,
  created_at timestamptz not null default now()
);
alter table public.notebook_versions enable row level security;
-- 仅 notebook 所有者可读写自己的版本
create policy "own versions" on public.notebook_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## 七、分阶段交付

- **Step 1（本轮，可落地）**
  1. 新 Cell 模型 + DAG runtime（替换现有 `useMemo p` 全量重算）
  2. 新增 `js` / `table` cell + dnd-kit 排序
  3. `.ipynb` 导出
  4. AI Explain 接入 cell 级别
  5. `notebook_versions` 表 + 版本抽屉
- **Step 2（下轮，按需）**
  - `data` cell + 数据源白名单
  - AI Generate / Fix
  - Embed iframe + 参数覆盖只读视图
  - DependencyPanel 可视化（force-directed mini-graph）

---

## 八、风险与边界

- 沙箱仍是 `new Function`，**禁止 `import` / `fetch` / `this`**；用 `with({})` 与白名单显式作用域；不要尝试做真沙箱（不在浏览器可行范围）
- DAG 增量重算先实现简化版：任何上游变化即重算闭包内全部，不做 memo 细化（足够 60fps）
- `.ipynb` 仅导出，不保证可重新导入执行（JS cell 在 Jupyter 中只是注释）
- 版本表会快速膨胀，加 `保留最近 20 个` 的清理触发器
