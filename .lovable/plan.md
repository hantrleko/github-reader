## 方案概览

把当前 Lab 接入 Lovable Cloud（已启用），新增邮箱+密码登录，并用 6 张数据表把用户在站内产生的所有「私有状态」从 localStorage 迁移到云端、按用户隔离。

未登录用户照常浏览、计算、查阅术语表；只有保存/收藏/历史/进度相关操作需要登录（弹出登录页）。

## 一、认证

- 启用邮箱+密码登录（默认不强制邮箱验证，开发期 `auto_confirm_email=true` 让你随时注册即用；如需正式上线再切回需要验证）。
- 新增 `/auth` 页面：登录 / 注册 两个 tab，使用 `supabase.auth.signInWithPassword` 与 `signUp({ emailRedirectTo: window.location.origin })`。
- 新增 `useAuth` hook：先 `onAuthStateChange` 监听，再 `getSession()` 同步当前 session。
- Navbar 右侧加用户按钮：未登录显示「Sign in」；已登录显示邮箱缩写 + 退出。

## 二、数据库 schema（6 张表，全部启 RLS：用户只能 CRUD 自己的行）

```text
profiles                 一行/用户，登录时自动创建（trigger on auth.users）
  id (uuid PK = auth.uid)、display_name、avatar_url、created_at、updated_at

github_history           GitHub Explorer 浏览历史
  user_id、owner、repo、branch、last_opened_at、open_count
  UNIQUE(user_id, owner, repo, branch)

github_starred           收藏的仓库 + 描述/星标数缓存
  user_id、owner、repo、default_branch、description、stars、starred_at
  UNIQUE(user_id, owner, repo)

github_file_notes        某个文件的中文笔记/标签
  user_id、owner、repo、branch、path、note (text)、tags (text[])、updated_at
  UNIQUE(user_id, owner, repo, branch, path)

calc_history             计算器运行历史（取代现有 localStorage 的 calcHistory）
  user_id、tool_id (text)、inputs (jsonb)、outputs (jsonb)、created_at
  + index(user_id, tool_id, created_at desc)

calc_favorites           收藏的某次计算结果或参数预设
  user_id、tool_id、label、inputs (jsonb)、created_at
  UNIQUE(user_id, tool_id, label)

glossary_bookmarks       术语表收藏
  user_id、slug (text)、created_at
  UNIQUE(user_id, slug)

learning_progress        学习进度（章节阅读/小测完成）
  user_id、topic_id (text)、section_id (text)、status ('reading'|'done')、score (int)、updated_at
  UNIQUE(user_id, topic_id, section_id)
```

每张表统一加：
- `id uuid PK default gen_random_uuid()`、`created_at`、`updated_at`
- `ENABLE ROW LEVEL SECURITY`
- 4 条策略：SELECT / INSERT / UPDATE / DELETE，全部 `using/with check (auth.uid() = user_id)`
- `updated_at` 自动更新 trigger（复用一个 `update_updated_at_column()` 函数）

`profiles` 用 `handle_new_user()` trigger 在 `auth.users` 插入时自动建一行。

## 三、前端接入点（按现有文件最小改动）

| 现有功能 | 现状 | 迁移后 |
|---|---|---|
| `src/pages/GithubExplorer.tsx` | 仅 fetch GitHub，不持久化 | 加载成功后 upsert `github_history`；加「Star」按钮写 `github_starred`；侧栏新增「最近浏览」「我收藏的仓库」两块 |
| 文件树每行 | 只能跳转 GitHub | 点击文件可展开「Note」抽屉，读写 `github_file_notes` |
| `src/lib/calcHistory.ts` + `HistoryDrawer.tsx` | localStorage | 改为 Supabase 客户端；未登录则继续用 localStorage 作为兜底，提示「登录后跨设备同步」 |
| `BondCalculator` 等计算器的「保存为预设」 | PresetButtons 内置 | 「⭐ Save as favorite」按钮写 `calc_favorites`，并在 PresetButtons 下方显示「我的收藏」 |
| `src/pages/Glossary.tsx` | 纯静态浏览 | 每个 term 行加 ⭐ 按钮，写 `glossary_bookmarks`；顶部加「只看我收藏的」筛选 |
| `src/components/LearningPath.tsx` | 当前进度无持久化 | 章节卡片加「标记已学」按钮，写 `learning_progress`；卡片显示已完成 ✓ |

新增页面：
- `/auth` — 登录/注册
- `/account` — 我的资料 + 一键导出所有数据 JSON（可选）

新增 hook/库文件：
- `src/hooks/useAuth.ts`
- `src/hooks/useRequireAuth.ts`（保护需要登录的动作，未登录时跳 `/auth?next=...`）
- `src/lib/cloudStore/*.ts` — 每张表一个薄封装（list/upsert/remove），统一处理错误 toast

## 四、不动的部分

- 现有计算器算法、`src/lib/quant/*`、所有教学内容、Bloomberg 编辑型布局、Emerald Prestige 主题、字体方案、`vitest` 测试全部不动。
- GitHub Explorer 的目录树渲染逻辑不动，只新增「收藏 / 历史 / 笔记」三层。

## 五、安全要点

- 全部表 user_id `NOT NULL` + RLS `auth.uid() = user_id`，杜绝越权读写。
- 计算结果 `inputs/outputs` 用 `jsonb` 存，不含 PII；不存 token、密码。
- 角色字段（如未来要分管理员）将单独建 `user_roles` + `has_role()` SECURITY DEFINER 函数，绝不放 `profiles`。

## 六、上线步骤

1. 创建 6 张表 + RLS + triggers（一个 migration）。
2. 启用邮箱+密码（开发期 auto-confirm 开）。
3. 实现 `/auth` 页面 + `useAuth` + Navbar 用户按钮。
4. GitHub Explorer 接入 history / starred / file notes。
5. 计算器接入 history / favorites（保留 localStorage 兜底）。
6. Glossary 加 bookmark；LearningPath 加 progress。
7. 跑 `vitest`，确保现有数学测试仍全绿。

确认后我会先生成数据库 migration 让你审批，然后再实现前端代码。
