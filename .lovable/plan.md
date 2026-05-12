## V2.2 路线图 — 计量经济学三大补缺

沿用 V2.1 的工程模式:单文件 `V22Tools.tsx` 导出三个组件,在 `EconometricsTools.tsx` 注册新 Tab,同步 Changelog 与 Navbar 版本号。

---

### 1. LASSO / Ridge / Elastic Net + 交叉验证

**算法**
- **坐标下降法 (Friedman-Hastie-Tibshirani 2010)** 求解
  L(β) = ½n⁻¹‖y − Xβ‖² + λ[α‖β‖₁ + ½(1−α)‖β‖²]
- α=1 → LASSO,α=0 → Ridge,0<α<1 → Elastic Net
- 标准化 X 后沿 λ 网格 (log 间隔 50 点) warm-start 计算系数路径
- **K-fold CV**(K=5)选最优 λ:λ_min 与 λ_1se 两个准则

**可视化**
- 系数路径图:每条线一个 β_j(λ),x 轴 log(λ),竖线标 λ_min / λ_1se
- CV MSE 曲线 ± 1 SE 误差带,标注最优点
- 稀疏度计数:非零系数 # vs λ
- 与 OLS 系数柱状图对比(同一组真值 β),展示 LASSO 变量选择能力

**预设**
- 稀疏真模型 (10 个特征只 3 个非零) / 多重共线性 (Ridge 优势) / 高维 p>n / 弱信号

---

### 2. Panel FE / RE + Hausman 检验

**算法**
- **Pooled OLS**:忽略个体效应
- **Fixed Effects (Within)**:对 (y_it, x_it) 按个体去均值后 OLS
- **Random Effects (GLS)**:Swamy-Arora 估计 σ_u² / σ_ε²,θ 加权变换 y* = y_it − θ ȳ_i 后 OLS
- **Hausman 检验**:H = (β̂_FE − β̂_RE)′ [V(β̂_FE) − V(β̂_RE)]⁻¹ (β̂_FE − β̂_RE) ~ χ²(k)
  - p < 0.05 拒绝 RE,选 FE

**可视化**
- 三方系数表:Pooled / FE / RE 同一行对比真值,带 SE
- 个体效应散点:N 个 α_i 的分布
- Hausman χ² 统计量与 p-value 卡片,自动给出"建议使用 FE/RE"标签
- 数据面板:N(个体)× T(时期)结构小图

**预设**
- 个体效应与 X 相关 (FE 适用) / 个体效应独立 (RE 高效) / 大 N 小 T / 平衡面板

---

### 3. Tobit / Heckman 两步法

**Tobit (Type-I)**
- 截断回归:y* = Xβ + ε,观测 y = max(0, y*)
- 对数似然:L = Σ_{y>0} log φ((y−Xβ)/σ)/σ + Σ_{y=0} log Φ(−Xβ/σ)
- BFGS / Newton-Raphson 数值最大化(50 次迭代)

**Heckman 两步法 (Heckit 1979)**
- 第一步:Probit 选择方程 P(d=1|Z) = Φ(Zγ),求 Inverse Mills Ratio λ̂ = φ(Zγ̂)/Φ(Zγ̂)
- 第二步:对样本 d=1 做 OLS y = Xβ + ρσ·λ̂ + η,β̂ 一致

**可视化**
- 三种估计对比:OLS(有偏)/ Tobit / Heckman 系数表
- 截断散点:y vs X 高亮被截断点(红)与观测点(金)
- Mills ratio 曲线:λ(Zγ̂) 与样本点叠加
- ρσ 的显著性 → 是否存在选择偏差

**预设**
- 强左截断 (40% y=0) / 工资方程经典示例 / 无选择偏差对照 / 强选择偏差

---

### 文件改动

```text
新建: src/components/econ/V22Tools.tsx          (~900 行,导出 3 个工具)
修改: src/components/EconometricsTools.tsx       (注册 lasso / panel / tobit 三个 tab)
修改: src/components/Changelog.tsx               (V2.2 条目,V2.1 转 Stable)
修改: src/pages/Index.tsx                        (footer 版本号 → 2.2)
修改: src/i18n/locales/{en,zh}.json              (nav.version → V2.2)
```

每个工具沿用现有标准:`PresetButtons` + `EquationBlock` LaTeX 公式 + 中文教学卡 + Recharts 主题 token + 稳健性检验。

---

### 完成后状态

- 计量经济学模块:**18 → 21 个工具**
- 学科覆盖完成度:面板因果 ✅ + 时序 ✅ + 离散选择 ✅ + 微观选择校正 ✅ + 机器学习计量 ✅
- 仅余 V2.3 收尾 3 项:State-Space DLM / Double ML / Causal Forest
