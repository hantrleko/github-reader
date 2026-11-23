// Bilingual long-form copy for the Terms and Privacy pages.
export const LEGAL_UPDATED = "2026-11-23";
/** Contact address for questions and data deletion requests. */
export const CONTACT_EMAIL = "eugenehan2025@gmail.com";

type Section = { h: string; p: string[] };
type Doc = { title: string; intro: string; sections: Section[] };

export const TERMS: Record<"zh" | "en", Doc> = {
  zh: {
    title: "服务条款",
    intro: "欢迎使用 EF LAB。注册或使用本网站，即表示你同意以下条款。",
    sections: [
      { h: "1. 服务内容", p: ["EF LAB 是面向学习与教学的经济金融实验平台，提供理论讲解、交互式工具与公开数据展示。", "网站内容仅用于学习与研究，不构成任何投资建议、证券推荐或交易邀约。"] },
      { h: "2. 账号", p: ["你需提供真实可用的邮箱完成注册，并妥善保管密码。通过你的账号进行的操作视为你本人行为。", "你可以随时在「账号设置」页面永久删除账号。"] },
      { h: "3. 使用规范", p: ["不得批量注册、自动化抓取、攻击或干扰网站运行，不得绕过访问频率限制。", "不得发布违法、侵权、骚扰或垃圾内容。我们可删除违规内容并暂停相关账号。"] },
      { h: "4. 你发布的内容", p: ["笔记本、评论等内容归你所有。你设为公开的内容，其他访客可以查看。", "你授予 EF LAB 为展示这些内容所必需的存储与显示许可。"] },
      { h: "5. 数据与计算结果", p: ["行情与宏观数据来自第三方公开来源，可能存在延迟、缺失或错误。", "模型与计算结果基于简化假设，我们不保证其准确性或适用于任何实际决策。"] },
      { h: "6. 免责与责任限制", p: ["网站按「现状」提供。在法律允许的范围内，我们不对因使用本网站而产生的任何直接或间接损失承担责任。"] },
      { h: "7. 条款变更", p: ["我们可能更新本条款，更新后会修改本页顶部日期。继续使用即视为接受更新后的条款。"] },
      { h: "8. 联系我们", p: [`如有疑问，请联系：${CONTACT_EMAIL}`] },
    ],
  },
  en: {
    title: "Terms of Service",
    intro: "Welcome to EF LAB. By signing up for or using this website you agree to these terms.",
    sections: [
      { h: "1. The service", p: ["EF LAB is a learning and teaching lab for economics and finance: theory guides, interactive tools and public data views.", "Everything on the site is for learning and research only. Nothing here is investment advice, a securities recommendation or an offer to trade."] },
      { h: "2. Your account", p: ["Sign up with a real email address you can access and keep your password safe. Actions taken through your account are treated as yours.", "You can permanently delete your account at any time from the Account page."] },
      { h: "3. Acceptable use", p: ["Do not mass-register accounts, scrape the site automatically, attack or disrupt it, or work around its rate limits.", "Do not post illegal, infringing, harassing or spam content. We may remove such content and suspend the accounts involved."] },
      { h: "4. Your content", p: ["Notebooks, comments and other content you create remain yours. Anything you make public can be viewed by other visitors.", "You grant EF LAB the permission needed to store and display that content."] },
      { h: "5. Data and results", p: ["Market and macro data come from third-party public sources and may be delayed, incomplete or wrong.", "Models and calculations rest on simplifying assumptions; we do not guarantee they are accurate or suitable for real decisions."] },
      { h: "6. Disclaimer and liability", p: ["The site is provided \"as is\". To the extent the law allows, we are not liable for any direct or indirect loss arising from its use."] },
      { h: "7. Changes", p: ["We may update these terms and will change the date at the top of this page when we do. Continuing to use the site means you accept the updated terms."] },
      { h: "8. Contact", p: [`Questions? Contact: ${CONTACT_EMAIL}`] },
    ],
  },
};

export const PRIVACY: Record<"zh" | "en", Doc> = {
  zh: {
    title: "隐私政策",
    intro: "本政策说明 EF LAB 收集哪些信息、如何使用，以及你如何删除它们。",
    sections: [
      { h: "1. 我们收集的信息", p: ["账号信息：邮箱、加密存储的密码；使用 Google 登录时，Google 提供的邮箱与基本资料。", "你主动填写的资料：用户名、显示名、简介、公开设置。", "你在网站上创建的内容：笔记本、评论、计算收藏、学习进度、徽章、GitHub 浏览记录。", "安全信息：为限制访问频率与防止滥用，服务器会短期记录请求的 IP 地址。"] },
      { h: "2. 不登录也能使用", p: ["游客浏览所有工具和数据页面不需要账号。未登录时，学习进度等只保存在你的浏览器本地。"] },
      { h: "3. 信息用途", p: ["仅用于提供登录、跨设备同步、公开主页与评论功能，以及保障网站安全。", "我们不出售你的个人信息，也不用于广告投放。"] },
      { h: "4. 第三方服务", p: ["网站托管与数据库服务商负责存储上述数据。", "使用 Google 登录时适用 Google 的隐私政策。", "使用「AI 解释」功能时，你输入的问题会发送给 AI 模型服务商以生成回答。"] },
      { h: "5. 本地存储", p: ["我们使用浏览器本地存储保存登录状态、语言、主题和学习进度等偏好，不使用第三方广告追踪。"] },
      { h: "6. 保存期限与删除", p: ["账号存在期间我们保存你的数据。你可在「账号设置 → 删除账号」中永久删除账号及其全部笔记本、评论、收藏和进度，删除后无法恢复。"] },
      { h: "7. 联系我们", p: [`如需查询或删除个人信息，请联系：${CONTACT_EMAIL}`] },
    ],
  },
  en: {
    title: "Privacy Policy",
    intro: "This policy explains what EF LAB collects, how it is used, and how you can delete it.",
    sections: [
      { h: "1. What we collect", p: ["Account details: your email and a securely hashed password; with Google sign-in, the email and basic profile Google shares.", "Profile details you enter: username, display name, bio and visibility setting.", "Content you create: notebooks, comments, saved calculations, learning progress, badges and GitHub browsing history.", "Security data: request IP addresses are kept briefly to enforce rate limits and prevent abuse."] },
      { h: "2. No account needed to browse", p: ["Visitors can use every tool and data page without an account. When signed out, progress stays only in your browser."] },
      { h: "3. How we use it", p: ["Only to provide sign-in, sync across devices, public profiles and comments, and to keep the site secure.", "We do not sell your personal information or use it for advertising."] },
      { h: "4. Third-party services", p: ["Our hosting and database provider stores the data above.", "Google's privacy policy applies when you sign in with Google.", "When you use the AI explainer, the question you type is sent to an AI model provider to generate the answer."] },
      { h: "5. Local storage", p: ["We use your browser's local storage for your session, language, theme and progress. We do not use third-party advertising trackers."] },
      { h: "6. Retention and deletion", p: ["We keep your data while your account exists. Under Account → Delete account you can permanently delete your account and all its notebooks, comments, favorites and progress. This cannot be undone."] },
      { h: "7. Contact", p: [`To access or delete your personal data, contact: ${CONTACT_EMAIL}`] },
    ],
  },
};
