# 模块 01「导览 / Overview」升级方案

按学科主线逐个模块过一遍，第一个是 `01 导览 · Overview`，包含 Hero、主题图谱（topics）、模型速览（models）、学习路径（learning）、自测（quiz），加上域中枢页 `/d/overview`。

## 现状（已核对代码）

- `LearningPath.tsx`：6 个阶段全部硬编码中文，`target` 只指向 `topics / models / calculator / mc-pricer` 四个旧锚点，和现在 56 个板块、10 条学科主线没有对应关系；进度只存 localStorage（`learning-progress-v1`），换设备即丢。
- `TopicCards.tsx`：卡片数据来自 `topicsData`，但栏目导语那段仍是硬编码中文；已读进度条依赖 `topicProgress`。
- `QuizSection.tsx`：题库 `QUESTIONS` 内联在组件里（468 行），题面、选项、解析全中文硬编码；站点已有 `src/lib/srs.ts` 与 `/review` 复习页，但自测与 SRS 之间没有打通。
- `DomainPage.tsx`：`LEVEL_META`、「返回首页」「建议先看」「按下面的顺序推进…」等字符串硬编码中文，与 V6.6 已双语化的首页/页脚不一致。
- `ModelShowcase.tsx`、`HeroToolStrip.tsx`、`DomainStrip.tsx` 在 V6.6 后基本可用，本轮不动结构。

## 建议改动（按优先级）

### 1. 学习路径重做为「主线导航」（收益最大）
把 6 个阶段与真实板块绑定：每个阶段列出 2–4 个具体板块链接（取自 `NAV_GROUPS` / `SECTION_MAP`），并显示该阶段所属学科主线。点「继续」时跳到该阶段第一个未读板块，而不是固定锚点。

### 2. 进度上云
登录用户的学习路径进度与主题已读进度写入后端（新表 `user_progress`，按 `user_id + kind + key` 存），未登录仍走 localStorage；登录后做一次本地→云端合并。

### 3. 自测与复习打通
- 把 `QUESTIONS` 抽到 `src/data/quizQuestions.ts`，加 `sectionId` 字段。
- 答错的题自动进入 SRS 队列（复用 `src/lib/srs.ts`），`/review` 页可直接复习。
- 每题解析下方给出「去对应实验室验证」链接。

### 4. 双语补齐
`LearningPath`、`TopicCards` 导语、`DomainPage`（层级标签、导航文案、SEO 描述）迁进 `en.json` / `zh.json`，沿用 V6.6 的 key 规范；题库文案用 `zh` / `en` 双字段而非 i18n key。

### 5. `/d/overview` 中枢页补内容
导览域目前只有 hero/topics/models/learning/quiz 五项，页面偏空。补一段「三分钟看懂本站」的路径卡片：主题图谱 → 学习路径 → 任选一个实验室 → 存成 Notebook。

## 技术说明

- 学习路径阶段定义抽到 `src/lib/learningPath.ts`，字段 `{ id, i18nKey, group, sections: string[] }`，构建时用 `SECTION_MAP` 校验 id 有效性（补一条 vitest 断言，防止板块改名后断链）。
- `user_progress` 表：启用 RLS，策略限定 `auth.uid() = user_id`，并对 `authenticated` 授予 CRUD、`service_role` 授予 ALL。
- 题库迁移不改题目内容，只搬位置 + 加 `sectionId`，`QuizSection` 逻辑保持不变。
- `scripts/check-copy-consistency.ts` 会校验新增 zh/en 键一致。
- 版本号走 V6.7，同步 `CHANGELOG.md` 与首页最新更新卡片。

## 执行顺序

先做 1 + 4（纯前端、见效快），再做 3，最后做 2（涉及后端表与登录合并）。第 5 项可与 1 一起做。

确认后我按这个顺序落地；也可以只先做其中某几条。
