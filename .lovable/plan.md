# 主页美观升级方案

在不改变已锁定的 Bloomberg 编辑风格(Emerald Prestige 配色、Libre Baskerville × IBM Plex 字体)前提下,为首页四个维度做精致化升级。动效强度按你选择的「3 / 适中」执行,并全程尊重系统的「减少动态效果」偏好。

## 1. 进场与滚动动效(新增可复用组件)

新增 `src/components/common/Reveal.tsx`:基于 framer-motion 的轻量包装组件,元素进入视口时做「淡入 + 轻微上移」,支持 `delay` 与 `stagger`。自动读取 `prefers-reduced-motion`,开启时直接静态显示(无动画),保证可访问性与现有 ScrollManager 不冲突。

应用到首页各区块:
- Hero 标题、副标题、CTA 按钮做交错进场(masthead → 大标题 → 副文 → 按钮 → 侧栏指标依次淡入)。
- HeroToolStrip 的 8 个单元格按索引轻微交错浮现。
- EditorialBriefing / TodaysPick / TopicCards / ModelShowcase / FeaturedNotebooks / SectionDirectory 各自在滚动到视口时整体淡入。

## 2. Hero 区域强化(`HeroSection.tsx`)

- 顶部金色光晕改为极缓慢的呼吸式明暗动画(低振幅,减少动态时关闭)。
- 三个覆盖指标(Domains / Formulas / Concepts)加入「数字滚动计数」进场效果,并强化 hover:数值放大发光、加下划线扫光。
- 两个 CTA 按钮增加 hover 微交互:主按钮箭头位移、描边按钮金色描边渐显。
- 底部 masthead 规则线加入细微的从左到右描线动画。

## 3. 卡片与网格精修(统一视觉语言)

统一以下区块卡片的边框 / 圆角 / 阴影 / 间距 / hover 态,消除当前深浅不一:
- `EditorialBriefing` 的三张 pillar 卡片
- `TopicCards`、`SectionDirectory`、`FeaturedNotebooks`、`HeroToolStrip`

统一规范:
- hover 时轻微上浮(`-translate-y-0.5`)+ 金色边框渐显 + 柔和阴影(用现有语义 token,不硬编码颜色)。
- 统一圆角与内边距节奏,箭头图标 hover 位移一致。
- HeroToolStrip 单元格 hover 增加顶部金色指示线。

## 4. 节奏与留白

- 统一各 section 的纵向间距(收敛当前忽大忽小的 padding),让首页从 Hero 到 Footer 的呼吸更均匀。
- 优化章节分隔:SectionHeader 的 kicker 规则线与目录分组标题对齐,分组之间留白一致。

## 技术要点

- 仅前端/展示层改动,不触碰业务逻辑、数据或路由。
- 动效统一走新 `Reveal` 组件 + 少量 Tailwind `animate-*` 工具类;framer-motion(v12,已安装)负责交错与计数。
- 所有颜色继续使用语义 token(gold / border / card / foreground 等),不新增硬编码颜色。
- 尊重 `prefers-reduced-motion`;不影响滚动位置恢复(ScrollManager)。
- 完成后用 Playwright 截图核对首页各区块进场与 hover 表现。

范围内文件:`Index.tsx`、`HeroSection.tsx`、`HeroToolStrip.tsx`、`TopicCards.tsx`、`SectionDirectory`(在 Index 内)、`FeaturedNotebooks.tsx`、`common/SectionHeader.tsx`,以及新增 `common/Reveal.tsx`。