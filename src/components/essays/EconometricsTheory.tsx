import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Structured reading guide for the econometrics section (V5.4).
 * Organises the whole toolkit along the chain
 * DGP → identification → estimation → inference → interpretation.
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
    to="/s/econometrics"
    className="group inline-flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 mr-2 mb-2 hover:border-gold/50 hover:bg-card/60 transition-all"
  >
    <span>
      <span className="block text-sm text-foreground group-hover:text-gold transition-colors">{label}</span>
      <span className="block text-[11px] text-foreground/55">{note}</span>
    </span>
    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors mt-0.5 shrink-0" />
  </Link>
);

const chain = [
  { k: "DGP", v: "y = f(x, u)", note: "先问数据是怎么生成的：谁决定了 x，谁进了误差项" },
  { k: "识别", v: "E[u | x] = 0 ?", note: "参数在总体层面能否被唯一确定——样本再大也救不了识别失败" },
  { k: "估计", v: "argmin Q_n(θ)", note: "OLS / GMM / MLE / 正则化，都是不同的目标函数" },
  { k: "推断", v: "V̂(θ̂)", note: "标准误的假设比点估计更容易出错" },
  { k: "解释", v: "对谁的效应？", note: "ATE / ATT / LATE / CATE 是不同的估计对象" },
];

const identification = [
  { name: "随机化", assume: "分配与潜在结果独立", risk: "外部有效性、依从性", tool: "GATES / BLP 异质性诊断" },
  { name: "条件独立 (选择可观测)", assume: "控制住全部混淆变量", risk: "高维、遗漏变量", tool: "倾向得分匹配 · 双重选择 LASSO · Double ML" },
  { name: "工具变量", assume: "相关性 + 排他性", risk: "弱工具、异质 LATE", tool: "弱工具变量诊断 (F / AR)" },
  { name: "面板固定效应", assume: "混淆不随时间变", risk: "时变冲击、动态面板偏误", tool: "FE vs RE · 动态面板 GMM" },
  { name: "平行趋势 (DID)", assume: "无处理时趋势相同", risk: "交错处理的负权重", tool: "事件研究式 DID · 合成 DID" },
  { name: "断点 (RD)", assume: "阈值附近连续", risk: "操纵、带宽选择", tool: "断点回归" },
  { name: "样本选择", assume: "存在排除约束", risk: "识别只靠函数形式", tool: "Heckman 两步法" },
];

const inference = [
  { n: "I1", t: "同方差 OLS 标准误", d: "只有在误差同方差且独立时才正确，实证中几乎不成立" },
  { n: "I2", t: "异方差稳健 HC1 / HC3", d: "修正方差异质，小样本用 HC3；不处理相关性" },
  { n: "I3", t: "聚类稳健", d: "处理变量在簇层面变动时的默认选择，需要足够多的簇" },
  { n: "I4", t: "Wild cluster bootstrap", d: "簇数少于约 30 时的救命稻草，施加原假设重抽样" },
  { n: "I5", t: "弱识别稳健", d: "Anderson-Rubin 等反转检验，在工具很弱时仍保持正确水平" },
];

const layers = [
  { n: "L1", t: "识别与推断内核", d: "工具强度、选择偏误、三大检验、方差估计的正确性", tools: "弱工具诊断 · Heckman · Wald/LR/LM · 标准误实验室" },
  { n: "L2", t: "面板与几何", d: "个体效应的处理方式与共线性的代价", tools: "FE vs RE (Hausman/Mundlak) · FWL 定理" },
  { n: "L3", t: "因果设计", d: "DID、RD、合成控制、匹配等准实验设计", tools: "事件研究 DID · 合成 DID · RDD · PSM" },
  { n: "L4", t: "时间序列与波动率", d: "平稳性、协整、VAR/SVAR、GARCH 家族、谱分析", tools: "单位根 · 协整 · SVAR · GARCH/DCC · 谱分析" },
  { n: "L5", t: "机器学习计量", d: "高维选择、正交化与异质性", tools: "双重选择 LASSO · Double ML · 因果森林 · GATES" },
];

const timeline = [
  { y: "1930s", t: "计量经济学会与联立方程", d: "Frisch、Haavelmo：概率论进入经济学，识别问题被正式提出" },
  { y: "1950s", t: "Cowles 委员会范式", d: "结构方程、两阶段最小二乘、工具变量" },
  { y: "1970s", t: "批判与时间序列转向", d: "Lucas 批判、Sims VAR、Box-Jenkins" },
  { y: "1980s", t: "GMM 与半参数", d: "Hansen GMM、White 稳健标准误、Engle ARCH、Granger 协整" },
  { y: "1990s", t: "可信性革命", d: "Angrist-Imbens LATE、自然实验、DID/RD 的普及" },
  { y: "2000s", t: "面板与稳健推断", d: "聚类标准误、动态面板 GMM、wild bootstrap" },
  { y: "2014–今", t: "高维与机器学习", d: "双重选择 LASSO、Double ML、因果森林、交错 DID 的重估" },
];

const EconometricsTheory = () => (
  <div className="container max-w-3xl px-6 pt-6 pb-24">
    <Reveal>
      <div className="border-t border-b border-border/60 py-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-10 bg-gold" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold font-bold">
            Reading Guide / Econometrics
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">≈ 15 min read</span>
        </div>
        <h2 className="font-display text-3xl md:text-[40px] leading-[1.15] text-foreground">
          计量经济学导读：从数据生成过程到可信推断
        </h2>
        <p className="mt-2 text-sm font-mono text-muted-foreground">
          Identification first, estimation second, standard errors always.
        </p>
        <p className="mt-5 text-[15px] leading-[1.85] text-foreground/75">
          计量经济学不是「跑回归」的技巧集合，而是一条推理链：先写下数据生成过程，再问参数是否可识别，然后才轮到估计量的选择，最后是标准误是否配得上这个设计。这篇导读按这条链把版块里五十余个工具串起来，每一节都能直接跳到实验室复现。
        </p>
      </div>
    </Reveal>

    <H n="01" en="The Chain" zh="推理链：五个必答问题" />
    <P>
      任何一篇实证论文的可信度，都可以用五个问题拆解。绝大多数争议不发生在「用哪个估计量」，而发生在第二步：识别假设成不成立。
    </P>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
      {chain.map((b) => (
        <div key={b.k} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">{b.k}</p>
          <p className="mt-1 font-mono text-sm text-foreground">{b.v}</p>
          <p className="mt-2 text-[11px] text-foreground/60 leading-relaxed">{b.note}</p>
        </div>
      ))}
    </div>
    <P>
      OLS 的全部内容其实就是一个投影：把 y 投到解释变量张成的空间上。FWL 定理告诉我们，多元回归的每个系数都等价于「先剔除其他变量，再做一元回归」——固定效应去均值、双向固定效应 DID、部分线性模型都是同一台机器的不同外壳。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\hat\beta_1=\frac{\tilde x_1'\tilde y}{\tilde x_1'\tilde x_1},\qquad \tilde x_1=M_{X_2}x_1=(I-X_2(X_2'X_2)^{-1}X_2')x_1`} />
    </div>
    <div>
      <ToolLink label="FWL 定理与共线性几何" note="残差化散点、VIF 与方差膨胀的可视化" />
      <ToolLink label="回归诊断套件" note="BP / White / DW / BG / RESET 一次跑完" />
    </div>

    <H n="02" en="Identification Strategies" zh="识别：七条主流策略与它们的软肋" />
    <P>
      识别是总体层面的性质：即使样本无限大，识别失败也无法修复。每一种设计都是在用一个可检验性较弱的假设，换取因果解释的权利。
    </P>
    <div className="space-y-2 my-6">
      {identification.map((s) => (
        <div key={s.name} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="font-display text-lg text-foreground">{s.name}</p>
          <p className="mt-2 text-[12px] text-foreground/70 leading-relaxed"><span className="text-gold/80 font-mono text-[10px] uppercase tracking-wider mr-2">Assume</span>{s.assume}</p>
          <p className="mt-1 text-[12px] text-foreground/70 leading-relaxed"><span className="text-gold/80 font-mono text-[10px] uppercase tracking-wider mr-2">Risk</span>{s.risk}</p>
          <p className="mt-1 text-[11px] font-mono text-muted-foreground">{s.tool}</p>
        </div>
      ))}
    </div>
    <P>
      工具变量是最容易被高估的一种。一阶段太弱时，2SLS 不但方差爆炸，还会被偏向 OLS：偏误近似 ρ·m/F，工具越多越糟。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\mathrm{Bias}(\hat\beta_{2SLS})\approx \frac{\rho\, m}{F},\qquad AR(\beta_0)=\frac{(y-\beta_0 d)'P_Z(y-\beta_0 d)/m}{(y-\beta_0 d)'M_Z(y-\beta_0 d)/(n-m)}`} />
    </div>
    <div>
      <ToolLink label="弱工具变量诊断" note="一阶段 F / Cragg-Donald / Stock-Yogo 与 AR 稳健置信集" />
      <ToolLink label="Heckman 样本选择" note="逆米尔斯比修正与排除约束的重要性" />
      <ToolLink label="事件研究式 DID" note="平行趋势检验与动态处理效应" />
    </div>

    <H n="03" en="Estimation" zh="估计：一个目标函数的不同外衣" />
    <P>
      OLS、GMM、MLE 与正则化方法的差别，本质上只是最小化的目标函数不同。OLS 是矩条件 E[xu]=0 的恰好识别 GMM；MLE 换成对数似然；LASSO 在平方损失上加 ℓ₁ 罚。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\hat\theta=\arg\min_{\theta}\;g_n(\theta)'W g_n(\theta),\qquad g_n(\theta)=\frac1n\sum_i z_i\,u_i(\theta)`} />
    </div>
    <P>
      面板数据里最经典的抉择是固定效应还是随机效应：RE 更有效但要求个体效应与解释变量无关，FE 牺牲效率换取一致性。Hausman 检验比较两者差异，Mundlak 的等价做法是把组均值加进回归——后者能配聚类稳健标准误，是现代更推荐的写法。
    </P>
    <div>
      <ToolLink label="固定效应 vs 随机效应" note="Hausman χ²、Mundlak CRE、θ 准去均值系数" />
      <ToolLink label="动态面板 GMM" note="Nickell 偏误与 Arellano-Bond / Blundell-Bond" />
      <ToolLink label="分位数回归实验室" note="分布不同位置上的边际效应" />
    </div>

    <H n="04" en="Inference" zh="推断：标准误比点估计更容易错" />
    <P>
      同一个 β̂ 配不同的方差估计，结论可以完全相反。误设的标准误是实证研究中最常见、也最难被审稿人发现的错误。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\hat V_{cl}=(X'X)^{-1}\Big(\sum_{g=1}^{G}X_g'\hat u_g\hat u_g'X_g\Big)(X'X)^{-1},\qquad W\ \ge\ LR\ \ge\ LM`} />
    </div>
    <div className="space-y-2 my-6">
      {inference.map((l) => (
        <div key={l.n} className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <span className="font-mono text-gold text-sm shrink-0">{l.n}</span>
          <div>
            <p className="font-display text-base text-foreground">{l.t}</p>
            <p className="mt-1 text-[12px] text-foreground/65 leading-relaxed">{l.d}</p>
          </div>
        </div>
      ))}
    </div>
    <P>
      Wald、LR 与 LM 是同一个原假设的三种几何视角：分别衡量「参数离约束多远」「拟合损失多少」「约束点上的得分是否为零」。渐近等价，但小样本会分歧，而且 Wald 不具参数化不变性。
    </P>
    <div>
      <ToolLink label="标准误实验室" note="蒙特卡洛覆盖率：iid / HC1 / HC3 / 聚类 / wild bootstrap" />
      <ToolLink label="Wald / LR / LM 三大检验" note="小样本分歧与经典排序 W ≥ LR ≥ LM" />
    </div>

    <H n="05" en="High Dimensions & Heterogeneity" zh="高维与异质性：机器学习计量" />
    <P>
      当控制变量数量与样本量同阶，变量选择本身会污染推断。Belloni-Chernozhukov-Hansen 的双重选择给出了修复：分别对结果方程和处理方程做 LASSO，取并集再回归，从而对选择错误免疫。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\hat S=\hat S_y\cup\hat S_d,\qquad y=\alpha d+X_{\hat S}'\beta+\varepsilon\ \Rightarrow\ \sqrt n(\hat\alpha-\alpha)\rightsquigarrow N(0,\sigma^2)`} />
    </div>
    <P>
      异质性的另一面是「效应对谁最大」。GATES 把人群按样本外 CATE 预测分位分组比较实际效应，BLP 校准回归则用一个系数回答学习器是否真的有预测力：β₂≈1 为良好校准，β₂≈0 说明只是噪声。
    </P>
    <div>
      <ToolLink label="双重选择 LASSO" note="高维控制下的 α 无偏推断与朴素选择的对比" />
      <ToolLink label="异质性处理效应诊断" note="GATES 分位组效应与 BLP 校准检验" />
      <ToolLink label="Double Machine Learning" note="Neyman 正交与交叉拟合" />
    </div>

    <H n="06" en="Reading Map" zh="五层知识地图与演进时间轴" />
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
            <span className="font-mono text-xs text-gold shrink-0 w-20">{t.y}</span>
            <span className="text-sm text-foreground">{t.t}</span>
            <span className="ml-auto text-[11px] text-foreground/55 text-right hidden sm:block">{t.d}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-16 pt-8 border-t border-border/60">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Coda</p>
      <p className="font-display text-xl md:text-2xl leading-snug text-foreground/85">
        没有识别假设的回归只是相关性的复杂写法；没有正确标准误的显著性只是精心包装的运气。
      </p>
    </div>

    <div className="mt-14">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">Enter The Lab</p>
      <Link
        to="/s/econometrics"
        className="group flex items-center justify-between rounded-xl border border-gold/40 bg-card/40 p-5 hover:border-gold hover:bg-card/60 transition-all"
      >
        <span>
          <span className="block font-display text-lg text-foreground group-hover:text-gold transition-colors">
            计量经济学实验室 · 49 个工具
          </span>
          <span className="block mt-1 text-xs text-foreground/60">
            识别与推断 / 因果推断 / 时间序列 / 波动率 / 离散选择与面板 / 机器学习计量 / 诊断
          </span>
        </span>
        <ArrowUpRight className="w-5 h-5 text-gold shrink-0" />
      </Link>
    </div>
  </div>
);

export default EconometricsTheory;