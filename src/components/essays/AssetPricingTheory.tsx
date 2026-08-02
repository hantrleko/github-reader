import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Structured reading guide for the asset pricing section (V5.3).
 * Maps the theory backbone — price → state prices → SDF → equilibrium —
 * onto the 21 tools that live in /s/asset-pricing.
 */

const H = ({ n, en, zh }: { n: string; en: string; zh: string }) => (
  <div className="flex items-baseline gap-3 mt-14 mb-5 border-b border-border/50 pb-3">
    <span className="text-[10px] font-mono tracking-[0.3em] text-gold">PART {n}</span>
    <h3 className="font-display text-2xl md:text-[26px] text-foreground leading-tight">{zh}</h3>
    <span className="ml-auto text-[11px] font-mono text-muted-foreground hidden md:inline">{en}</span>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] leading-[1.85] text-foreground/80 mb-4">{children}</p>
);

const ToolLink = ({ label, note }: { label: string; note: string }) => (
  <Link
    to="/s/asset-pricing"
    className="group inline-flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 mr-2 mb-2 hover:border-gold/50 hover:bg-card/60 transition-all"
  >
    <span>
      <span className="block text-sm text-foreground group-hover:text-gold transition-colors">{label}</span>
      <span className="block text-[11px] text-foreground/55">{note}</span>
    </span>
    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors mt-0.5 shrink-0" />
  </Link>
);

const backbone = [
  { k: "价格", v: "p = E[m x]", note: "任何资产的价格都是未来支付的加权期望" },
  { k: "状态价格", v: "q(s)", note: "在状态 s 支付 1 单位的今日价格；无套利 ⇔ q > 0" },
  { k: "定价核", v: "m = q / π", note: "状态价格除以真实概率，即随机折现因子" },
  { k: "风险中性测度", v: "Q = q / Σq", note: "折现期望定价：p = e^{-rf} E^Q[x]" },
  { k: "β 表示", v: "E[R] = Rf + β λ", note: "线性因子模型只是 m = a − b'f 的另一种写法" },
];

const timeline = [
  { y: "1952–64", t: "均值-方差与 CAPM", d: "Markowitz 前沿 → Sharpe-Lintner 单因子均衡" },
  { y: "1972–76", t: "放松与推广", d: "Black 零β、Merton ICAPM、Ross APT" },
  { y: "1978–85", t: "消费与谜题", d: "Lucas 树、Breeden CCAPM、Mehra-Prescott 股权溢价之谜" },
  { y: "1991–93", t: "诊断与实证", d: "Hansen-Jagannathan 边界、Fama-French 三因子" },
  { y: "1989–99", t: "偏好重构", d: "Epstein-Zin 递归效用、Campbell-Cochrane 习惯" },
  { y: "2004–08", t: "长期风险与灾难", d: "Bansal-Yaron 长期风险、Barro 罕见灾难" },
  { y: "2013–今", t: "因子动物园与机器学习", d: "Harvey-Liu-Zhu t>3、Gu-Kelly-Xiu 高维定价" },
];

const puzzles = [
  {
    name: "股权溢价之谜",
    fact: "美股实际超额收益约 6%/年，消费增长波动仅约 1%",
    need: "CRRA 下需要 γ ≈ 25–50",
    fix: "长期风险 / 习惯 / 灾难均可把所需 γ 压回个位数",
  },
  {
    name: "无风险利率之谜",
    fact: "实际无风险利率约 1%，却要求高 γ 与正的消费增长共存",
    need: "高 γ 推高预防性储蓄之外的跨期替代动机，利率被推到两位数",
    fix: "Epstein-Zin 分离 γ 与 ψ；灾难风险提供避险需求",
  },
  {
    name: "超额波动之谜",
    fact: "价格波动远超股利现值波动 (Shiller 1981)",
    need: "常数折现率模型无法解释",
    fix: "Campbell-Shiller 分解显示大部分方差来自折现率新闻",
  },
];

const layers = [
  { n: "L1", t: "无套利骨架", d: "状态价格、完备性、风险中性测度、SDF 存在性", tools: "状态价格与风险中性测度 · SDF–因子对偶" },
  { n: "L2", t: "均衡与偏好", d: "CRRA / Epstein-Zin / 习惯 / 灾难如何生成 m", tools: "CCAPM · 长期风险 · 习惯形成 · 罕见灾难" },
  { n: "L3", t: "实证检验", d: "横截面回归、联合检验、SDF 距离与模型比较", tools: "Fama-MacBeth · GRS · HJ 距离" },
  { n: "L4", t: "前沿扩展", d: "可预测性、高维因子筛选、国际与货币定价", tools: "Campbell-Shiller · 因子动物园 · 货币 Carry" },
];

const AssetPricingTheory = () => (
  <div className="container max-w-3xl px-6 pt-6 pb-24">
    <Reveal>
      <div className="border-t border-b border-border/60 py-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-10 bg-gold" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold font-bold">
            Reading Guide / Asset Pricing
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">≈ 15 min read</span>
        </div>
        <h2 className="font-display text-3xl md:text-[40px] leading-[1.15] text-foreground">
          资产定价理论导读：从状态价格到现代前沿
        </h2>
        <p className="mt-2 text-sm font-mono text-muted-foreground">
          One equation, four layers, twenty-one experiments.
        </p>
        <p className="mt-5 text-[15px] leading-[1.85] text-foreground/75">
          整个资产定价学科可以压缩成一行等式：p = E[m·x]。剩下的一切——CAPM、APT、Fama-French、消费模型、递归效用、灾难风险、因子动物园——都只是在回答同一个问题：这个 m 长什么样，它从哪里来，以及数据是否同意。这篇导读把主线拆成四层，每一层都给出实验室里可直接复现的工具。
        </p>
      </div>
    </Reveal>

    <H n="01" en="The No-Arbitrage Backbone" zh="骨架：从价格到定价核" />
    <P>
      先不谈偏好，也不谈均衡。只要市场里不存在套利机会，就一定存在一组严格为正的状态价格 q(s)，使任何资产的价格等于其状态支付的加权和。这就是资产定价第一基本定理。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`p_j=\sum_{s} q(s)\,x_j(s)=\sum_s \pi(s)\underbrace{\frac{q(s)}{\pi(s)}}_{m(s)}x_j(s)=E[m\,x_j]`} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
      {backbone.map((b) => (
        <div key={b.k} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">{b.k}</p>
          <p className="mt-1 font-mono text-sm text-foreground">{b.v}</p>
          <p className="mt-2 text-[11px] text-foreground/60 leading-relaxed">{b.note}</p>
        </div>
      ))}
    </div>
    <P>
      完备市场里 q 唯一，m 也唯一；不完备时 q 只落在一个凸集里，资产价格因此只有上下界而非单点。第二基本定理说的正是这件事：唯一性等价于完备性。
    </P>
    <div>
      <ToolLink label="状态价格与风险中性测度" note="反解 q、π、m 与 Q，判定无套利与完备性，输出价格区间" />
      <ToolLink label="SDF–因子对偶" note="m = a − b'f 与 E[R]=Rf+β'λ 的双向映射" />
    </div>

    <H n="02" en="Preferences & Equilibrium" zh="偏好：m 从哪里来" />
    <P>
      无套利只保证 m 存在，不告诉你它的形状。均衡模型补上这一步：代表性投资者的边际替代率就是定价核。CRRA 效用给出 m = β(C₍t+1₎/C₍t₎)^(−γ)，这就是 CCAPM。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`m_{t+1}=\beta\left(\frac{C_{t+1}}{C_t}\right)^{-\gamma},\qquad \frac{\sigma(m)}{E[m]}\ \ge\ \max_{\text{portfolios}} \left|\mathrm{SR}\right|`} />
    </div>
    <P>
      右边的 Hansen-Jagannathan 不等式是全部麻烦的来源：数据里的最大夏普比要求 σ(m)/E[m] 至少 0.4–0.5，而平滑的消费增长在合理 γ 下只能生成 0.02 量级的波动。三大谜题由此诞生。
    </P>
    <div className="space-y-3 my-6">
      {puzzles.map((p) => (
        <div key={p.name} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="font-display text-lg text-foreground">{p.name}</p>
          <p className="mt-2 text-[12px] text-foreground/70 leading-relaxed"><span className="text-gold/80 font-mono text-[10px] uppercase tracking-wider mr-2">Fact</span>{p.fact}</p>
          <p className="mt-1 text-[12px] text-foreground/70 leading-relaxed"><span className="text-gold/80 font-mono text-[10px] uppercase tracking-wider mr-2">Gap</span>{p.need}</p>
          <p className="mt-1 text-[12px] text-foreground/70 leading-relaxed"><span className="text-gold/80 font-mono text-[10px] uppercase tracking-wider mr-2">Fix</span>{p.fix}</p>
        </div>
      ))}
    </div>
    <P>
      三条修复路线各有代价：Epstein-Zin 把风险厌恶 γ 与跨期替代弹性 ψ 拆开，用长期增长风险放大溢价；Campbell-Cochrane 用外部习惯让风险厌恶随盈余消费比时变，从而生成时变风险溢价；Rietz-Barro 用小概率大灾难同时压低无风险利率与抬高溢价，但对灾难分布的校准极度敏感。
    </P>
    <div>
      <ToolLink label="长期风险 (Epstein-Zin)" note="分离 γ 与 ψ，可变增长与波动状态下的 ERP" />
      <ToolLink label="习惯形成 (Campbell-Cochrane)" note="盈余消费比动态与时变风险厌恶" />
      <ToolLink label="罕见灾难 (Rietz-Barro)" note="灾难概率与幅度对溢价与无风险利率的双重作用" />
      <ToolLink label="三大谜题对照面板" note="四条路线在同一张表上比较解释力" />
    </div>

    <H n="03" en="Taking It To The Data" zh="实证：模型如何被拒绝" />
    <P>
      检验一个定价模型有三种等价语言：横截面回归里的 α、GMM 里的定价误差 gᵀWg，以及 SDF 空间里到合法定价核集合的 Hansen-Jagannathan 距离。三者共享同一个零假设，只是加权矩阵不同。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\mathrm{HJ}=\sqrt{\;\min_{m\in\mathcal{M}}\;g'\,E[RR']^{-1}\,g\;},\qquad g=E[mR]-\mathbf{1}`} />
    </div>
    <P>
      HJ 距离的好处是与模型参数化无关，因此可以把 CAPM、FF3、FF5 放在同一个尺子上比较；GRS 的 F 检验则回答一组测试组合的 α 是否联合为零。两者结论不一致时，通常意味着模型在某一类特征组合上系统性失效。
    </P>
    <div>
      <ToolLink label="HJ 距离与模型比较" note="CAPM vs FF3 vs FF5 的定价误差同尺度排名" />
      <ToolLink label="GRS 联合检验" note="一组测试资产的 α 是否全为零" />
      <ToolLink label="Fama-MacBeth 两阶段回归" note="风险溢价估计与 Shanken 修正" />
    </div>

    <H n="04" en="Frontiers" zh="前沿：可预测性、高维与国际化" />
    <P>
      Campbell-Shiller 的对数线性分解说明：股利价格比的波动几乎全部来自未来收益（折现率）的变化，而非现金流预期。这把「超额波动」从异常改写成了折现率的时变。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`dp_t \approx E_t\sum_{j=1}^{\infty}\rho^{j-1}\big(r_{t+j}-\Delta d_{t+j}\big)`} />
    </div>
    <P>
      另一端是因子动物园：数百个已发表因子中，多数在多重检验校正 (Harvey-Liu-Zhu 的 t &gt; 3 门槛) 与主成分收缩后并不独立。国际维度上，UIP 偏离与 Carry 收益可以写成两国定价核之差，汇率波动直接约束了跨国 SDF 的相关性。
    </P>
    <div>
      <ToolLink label="Campbell-Shiller 分解" note="现金流新闻 vs 折现率新闻 + 长期收益预测回归" />
      <ToolLink label="因子动物园与高维筛选" note="PCA / Ridge / LASSO + 多重检验门槛" />
      <ToolLink label="货币 Carry 与国际定价" note="UIP 偏离、Carry 排序与两国定价核之差" />
    </div>

    <H n="05" en="Reading Map" zh="四层知识地图与阅读路线" />
    <div className="space-y-3 my-6">
      {layers.map((l) => (
        <div key={l.n} className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <span className="font-mono text-gold text-sm shrink-0">{l.n}</span>
          <div>
            <p className="font-display text-lg text-foreground">{l.t}</p>
            <p className="mt-1 text-[12px] text-foreground/65 leading-relaxed">{l.d}</p>
            <p className="mt-2 text-[11px] font-mono text-muted-foreground">{l.tools}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-10">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">Timeline</p>
      <div className="space-y-2">
        {timeline.map((t) => (
          <div key={t.y} className="flex gap-4 items-baseline border-b border-border/40 pb-2">
            <span className="font-mono text-[11px] text-gold w-24 shrink-0">{t.y}</span>
            <span className="text-sm text-foreground">{t.t}</span>
            <span className="ml-auto text-[11px] text-foreground/55 hidden md:inline">{t.d}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-16 pt-8 border-t border-border/60">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Coda</p>
      <p className="font-display text-xl md:text-2xl leading-snug text-foreground/85">
        所有定价模型都是关于 m 的猜测。数据不判定谁优雅，只判定谁的定价误差更小。
      </p>
    </div>

    <div className="mt-14">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">Enter The Lab</p>
      <Link
        to="/s/asset-pricing"
        className="group flex items-center justify-between rounded-xl border border-gold/40 bg-card/40 p-5 hover:border-gold hover:bg-card/60 transition-all"
      >
        <span>
          <span className="block font-display text-lg text-foreground group-hover:text-gold transition-colors">
            资产定价实验室 · 21 个工具
          </span>
          <span className="block mt-1 text-xs text-foreground/60">
            无套利基础 / CAPM 家族 / 因子与异象 / 谜题与结构模型 / 实证前沿
          </span>
        </span>
        <ArrowUpRight className="w-5 h-5 text-gold shrink-0" />
      </Link>
    </div>
  </div>
);

export default AssetPricingTheory;
