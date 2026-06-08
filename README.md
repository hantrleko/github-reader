# EF Lab — 量化金融与计量经济学实验室

EF Lab 是一个面向经济金融实证研究、量化建模与课堂教学的交互式实验平台。项目将资产定价、衍生品、固定收益、风险管理、计量经济学、宏观模型与 Notebook 工作流整合到同一套网页体验中，帮助用户从理论推导走向参数实验与可复现研究。

## 内容定位

- **理论框架**：围绕 CAPM、SDF、Black-Scholes、Markowitz、GARCH、Vasicek/CIR、OLS 等经典模型组织知识点。
- **交互实验**：通过可调参数、图表反馈、真实数据加载和基准对比，把教材公式转化为可观察的模型输出。
- **研究闭环**：结合 Notebook、模板、策略库、论文索引和社区公开笔记，支持从课堂演示到研究原型的复现流程。

## 主要模块

1. **首页导览**：研究路径说明、每日精选工具、学科领域与经典模型卡片。
2. **基础定价**：Black-Scholes、隐含波动率、蒙特卡洛期权定价。
3. **衍生品高阶**：SVI、Heston、SABR、Local Vol、LSM 等工具。
4. **固定收益与组合**：债券现金流、期限结构、短率模型、有效前沿。
5. **计量经济学**：OLS、IV、GMM、GARCH、Kalman、因果推断相关工具。
6. **风险管理**：VaR/ES、Merton 信用风险、Copula、压力测试。
7. **量化策略与宏观**：回测、因子归因、风险平价、Solow 与动态均衡模型。
8. **平台增强**：Notebook、真实数据、跨工具对比、历史记录与公开模板。

## 本地开发

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run build
npm run lint
npm run test
```

## 技术栈

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Recharts / KaTeX / Framer Motion
- Supabase 集成
- Vitest / Playwright 配置

## 免责声明

本项目内容仅用于学习、教学与研究演示，不构成任何投资建议。