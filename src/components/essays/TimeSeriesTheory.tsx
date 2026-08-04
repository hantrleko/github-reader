import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Structured reading guide for the time-series toolkit (V5.5).
 * Chain: data features → stationarity → identification → estimation →
 * dynamics & regimes → forecasting → evaluation.
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
  { k: "看数据", v: "趋势 / 季节 / 断点", note: "先画图：单位根检验解决不了肉眼可见的结构变化" },
  { k: "平稳性", v: "I(0) 还是 I(1)?", note: "决定用水平、差分还是协整框架，也决定推断的分布" },
  { k: "识别阶数", v: "ACF / PACF / 信息准则", note: "Wold 定理保证线性表示存在，但不保证它就是机制" },
  { k: "估计", v: "MLE / 条件 LS / 滤波", note: "潜在状态模型要么卡尔曼滤波，要么粒子滤波" },
  { k: "评价", v: "PIT / CRPS / MCS", note: "样本内拟合与样本外密度校准是两回事" },
];

const stationarity = [
  { name: "ADF", h0: "有单位根", note: "最常用，但在 ρ→1 与存在断点时功效很低", tool: "单位根检验全家桶" },
  { name: "Phillips-Perron", h0: "有单位根", note: "用 Newey-West 非参数修正自相关，不加差分滞后项", tool: "单位根检验全家桶" },
  { name: "DF-GLS", h0: "有单位根", note: "先 GLS 去趋势，近单位根区域功效明显优于 ADF", tool: "单位根检验全家桶" },
  { name: "KPSS", h0: "平稳", note: "原假设反过来，与 ADF 组合才能读出「证据不足」", tool: "单位根检验全家桶" },
  { name: "Zivot-Andrews", h0: "有单位根（含内生断点）", note: "断点会让常规 ADF 系统性不拒绝单位根", tool: "单位根检验全家桶" },
  { name: "HEGY", h0: "季节单位根", note: "季度/月度数据在 π、±π/2 等频率上也可能有单位根", tool: "单位根检验全家桶" },
];

const layers = [
  { n: "L1", t: "平稳性与预处理", d: "单位根、季节单位根、断点、差分与去趋势的取舍", tools: "单位根全家桶 · 差分决策实验室" },
  { n: "L2", t: "线性表示与识别", d: "Wold 分解、ARMA 阶数、特征根与可逆性", tools: "Wold / ARMA 识别台 · ARIMA" },
  { n: "L3", t: "多变量动态", d: "VAR/SVAR、Granger 因果、协整与误差修正、局部投影", tools: "SVAR · 协整/VECM · Granger · 局部投影" },
  { n: "L4", t: "非线性与制度", d: "门限、平滑转换、马尔可夫切换、多重断点", tools: "SETAR/LSTAR · Bai-Perron · 马尔可夫切换" },
  { n: "L5", t: "波动率与状态空间", d: "GARCH 家族、随机波动率、卡尔曼与粒子滤波", tools: "GARCH/DCC · SV vs GARCH · 卡尔曼滤波 · HAR-RV" },
  { n: "L6", t: "预测与评价", d: "点预测、密度预测、组合与模型置信集", tools: "指数平滑 · 密度预测评价 · 模型置信集 · DM 检验" },
];

const timeline = [
  { y: "1927", t: "Yule 与 Slutsky", d: "自回归与移动平均：随机冲击的累积就能造出周期，不需要「真实的周期机制」" },
  { y: "1938", t: "Wold 分解定理", d: "任何协方差平稳、纯非确定性过程都有 MA(∞) 表示——线性时间序列建模的基石" },
  { y: "1960s", t: "卡尔曼滤波与状态空间", d: "把不可观测状态与观测方程分离，递归更新最优线性预测" },
  { y: "1970", t: "Box-Jenkins 方法论", d: "识别—估计—诊断的迭代循环，把 ARIMA 变成工业标准" },
  { y: "1974", t: "Granger-Newbold 伪回归", d: "两条独立随机游走互相回归会得到高 R² 与发散的 t——非平稳数据的警钟" },
  { y: "1979–81", t: "Dickey-Fuller 与 Sims VAR", d: "单位根检验的非标准分布；VAR 取代大型联立方程系统" },
  { y: "1982–86", t: "ARCH / GARCH", d: "Engle 与 Bollerslev：条件方差本身可以被建模、被预测" },
  { y: "1987", t: "Engle-Granger 协整", d: "非平稳变量之间可以存在平稳的长期关系，误差修正机制随之而来" },
  { y: "1993–98", t: "非线性与断点", d: "Hansen 门限模型的自助推断、Bai-Perron 多重断点的动态规划" },
  { y: "1995–2011", t: "预测评价的规范化", d: "Diebold-Mariano 检验、PIT 与严格适当评分规则、Hansen 模型置信集" },
  { y: "2000s–今", t: "高维与机器学习", d: "因子增广 VAR、大维协方差、MIDAS 混频、状态空间与深度学习的融合" },
];

const checklist = [
  "画图先于检验：趋势、季节、断点、异常值一眼可见的东西不要交给统计量去发现。",
  "同时报告 ADF 与 KPSS，并接受「证据不足」这个诚实结论。",
  "差分之前问一句：研究对象是水平还是增速？过度差分会引入 −1 附近的 MA 根。",
  "季度/月度数据检查季节单位根，不要用季节虚拟变量掩盖 (1−L^s) 的问题。",
  "结构断点检验作为常规步骤，而不是审稿人质疑后才补。",
  "样本外评价用滚动或递归窗口，并明确区分伪样本外与真样本外。",
  "风险相关的应用报告密度预测的 PIT 与 CRPS，不要只报 RMSE。",
  "比较多个模型时用模型置信集控制多重比较，并同时报告等权组合的表现。",
];

const TimeSeriesTheory = () => (
  <div className="container max-w-3xl px-6 pt-6 pb-24">
    <Reveal>
      <div className="border-t border-b border-border/60 py-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-10 bg-gold" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold font-bold">
            Reading Guide / Time Series
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">≈ 16 min read</span>
        </div>
        <h2 className="font-display text-3xl md:text-[40px] leading-[1.15] text-foreground">
          时间序列导读：从平稳性到密度预测评价
        </h2>
        <p className="mt-2 text-sm font-mono text-muted-foreground">
          Plot first, test second, evaluate out of sample always.
        </p>
        <p className="mt-5 text-[15px] leading-[1.85] text-foreground/75">
          时间序列分析的困难来自一个事实：我们只观测到历史的一条实现路径，却要谈论这条路径背后的概率结构。平稳性是让「一条路径」能替代「多次重复」的桥梁；识别、估计与预测评价，都建立在这座桥是否稳固之上。这篇导读沿着「看数据 → 平稳性 → 识别 → 动态与制度 → 预测 → 评价」的链条，把版块中的时间序列工具串起来。
        </p>
      </div>
    </Reveal>

    <H n="01" en="The Chain" zh="推理链：一条路径，五个问题" />
    <P>
      横截面计量的核心焦虑是内生性，时间序列的核心焦虑是<span className="text-gold">遍历性与稳定性</span>：样本矩能否收敛到总体矩，以及这个「总体」在样本期内是否只有一个。
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
      Wold 分解是整个线性框架的出发点：任何零均值、协方差平稳、纯非确定性的过程都可以写成白噪声的无穷加权和。它保证了 ARMA 逼近的合法性，但也划定了边界——这是关于二阶矩与线性投影的定理，εₜ 是线性预测误差，不是结构冲击。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`y_t=\mu+\sum_{j=0}^{\infty}\psi_j\varepsilon_{t-j}+\kappa_t,\qquad \psi_0=1,\ \sum_{j}\psi_j^2<\infty`} />
    </div>
    <div>
      <ToolLink label="Wold 分解与 ARMA 识别台" note="理论 vs 样本 ACF/PACF、ψ 权重、特征根与单位圆" />
      <ToolLink label="ARIMA 建模" note="Box-Jenkins 循环与预测区间" />
    </div>

    <H n="02" en="Stationarity" zh="平稳性：六个检验、两个原假设" />
    <P>
      单位根不是一个统计细节，而是关于「冲击是否永久」的经济命题。若 GDP 含单位根，一次衰退会永久改变产出水平；若它是趋势平稳，经济终将回到趋势线。两种世界观对应完全不同的预测扇形与政策含义。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\Delta y_t=\alpha+\delta t+\gamma y_{t-1}+\sum_{i=1}^{p}\phi_i\Delta y_{t-i}+\varepsilon_t,\qquad H_0:\gamma=0`} />
    </div>
    <div className="overflow-x-auto my-6 rounded-xl border border-border/60">
      <table className="w-full text-[13px]">
        <thead className="bg-card/60 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left py-2.5 px-3">检验</th>
            <th className="text-left px-3">原假设</th>
            <th className="text-left px-3">要点</th>
          </tr>
        </thead>
        <tbody>
          {stationarity.map((s) => (
            <tr key={s.name} className="border-t border-border/40">
              <td className="py-2.5 px-3 text-foreground whitespace-nowrap">{s.name}</td>
              <td className="px-3 text-foreground/70 whitespace-nowrap">{s.h0}</td>
              <td className="px-3 text-foreground/70">{s.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <P>
      检验的功效在 ρ = 0.95 与 ρ = 1.00 之间几乎无法区分，这不是技术缺陷而是信息的真实限度。此时正确的做法不是反复更换确定项设定直到得到想要的结论，而是把两条路线（水平与差分）的结果都报告出来。
    </P>
    <div>
      <ToolLink label="单位根检验全家桶" note="ADF / PP / DF-GLS / KPSS / Zivot-Andrews / HEGY 一次跑完" />
      <ToolLink label="面板单位根与协整" note="LLC / IPS / Pedroni" />
    </div>

    <H n="03" en="Differencing" zh="差分：伪回归的代价与过度差分的代价" />
    <P>
      Granger 与 Newbold (1974) 的模拟是时间序列教学史上最著名的警告：两条完全独立的随机游走互相回归，t 统计量会随样本量发散，R² 可以高得离谱。原因是残差本身是 I(1)，OLS 的标准误公式彻底失效。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`x_t,y_t\ \text{独立 }I(1)\ \Rightarrow\ \hat t_\beta=O_p(\sqrt T)\ \nrightarrow\ N(0,1)`} />
    </div>
    <P>
      但反方向的错误同样常见：对本来就平稳的序列做差分，会引入接近 −1 的 MA 根（不可逆），放大高频噪声、恶化样本外预测，还会丢掉水平关系中的长期信息。协整框架的价值正在于此——它允许在保留长期关系的同时得到平稳的误差修正项。
    </P>
    <div>
      <ToolLink label="差分决策实验室" note="伪回归拒绝率蒙特卡洛、过度差分的 MA 根与 RMSE、两种预测扇形" />
      <ToolLink label="协整与 VECM" note="Engle-Granger / Johansen 与误差修正速度" />
    </div>

    <H n="04" en="Nonlinearity & Breaks" zh="非线性与断点：一个模型不够用的时候" />
    <P>
      线性 ARMA 假设动态在整个样本期是同一套参数。现实里，衰退期的持久性可能远高于扩张期，套利只在偏离超过交易成本时启动，货币政策框架会整体转换。门限模型与断点模型分别刻画这两类偏离：前者是<span className="text-gold">状态依赖</span>（由变量取值触发），后者是<span className="text-gold">时间依赖</span>（在某个日期发生）。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`y_t=\big[\phi_L'x_t\big]\mathbf 1\{z_{t-d}\le c\}+\big[\phi_H'x_t\big]\mathbf 1\{z_{t-d}>c\},\qquad G(z;\gamma,c)=\frac{1}{1+e^{-\gamma(z-c)}}`} />
    </div>
    <P>
      两者都有同一个技术难点：门限 c 或断点日期 T_j 在原假设下不被识别（Davies 问题），常规 F 分布不再适用。Hansen 的自助检验与 Bai-Perron 的动态规划分别给出了可操作的解法。
    </P>
    <div>
      <ToolLink label="门限自回归 SETAR / LSTAR" note="门限网格搜索、Hansen 自助 supF、平滑转换函数" />
      <ToolLink label="Bai-Perron 多重断点" note="动态规划、BIC/LWZ 与序贯 supF(l+1|l)" />
      <ToolLink label="马尔可夫制度切换" note="不可观测状态与转移概率" />
    </div>

    <H n="05" en="Volatility & State Space" zh="波动率：确定性递归还是潜在状态" />
    <P>
      GARCH 把条件方差写成过去可观测量的确定性函数，因此似然可以直接写出来、估计成本极低；随机波动率把对数波动当作一个潜在状态过程，似然需要对整条状态路径积分，必须借助粒子滤波或 MCMC。两条路线对应两种哲学，也对应两种与连续时间模型的衔接方式。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\sigma_t^2=\omega+\alpha\varepsilon_{t-1}^2+\beta\sigma_{t-1}^2\qquad\text{vs}\qquad h_t=\mu+\phi(h_{t-1}-\mu)+\sigma_\eta\eta_t,\ y_t=e^{h_t/2}\varepsilon_t`} />
    </div>
    <div>
      <ToolLink label="随机波动率 vs GARCH" note="自举粒子滤波、参数网格 MLE、滤波路径与对数得分对比" />
      <ToolLink label="GARCH 家族与 DCC" note="非对称、厚尾与动态相关" />
      <ToolLink label="卡尔曼滤波与状态空间" note="可观测方程与状态方程的分离" />
    </div>

    <H n="06" en="Forecast Evaluation" zh="预测评价：点预测之外" />
    <P>
      样本内 R² 与样本外表现几乎没有可靠联系。更进一步，风险管理关心的从来不是一个点，而是整条条件分布。概率积分变换 PIT 给出了检验密度校准的通用工具：若密度设定正确，uₜ = F̂ₜ(yₜ) 应服从均匀分布；U 型直方图说明区间过窄，系统性低估尾部风险。
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`u_t=\hat F_t(y_t)\sim U(0,1);\qquad \mathrm{CRPS}(\hat F,y)=\int_{-\infty}^{\infty}\big[\hat F(z)-\mathbf 1\{z\ge y\}\big]^2\,dz`} />
    </div>
    <P>
      比较多个模型时，成对 Diebold-Mariano 检验会带来严重的多重比较问题。Hansen、Lunde 与 Nason 的模型置信集通过序贯等价检验给出一个以 1−α 概率包含最优模型的集合；「无法选出唯一冠军」本身就是有价值的结论。与此同时，预测组合谜题依然成立：等权组合常常打败任何单一模型和「最优」估计权重。
    </P>
    <div>
      <ToolLink label="密度预测评价" note="PIT 直方图、对数得分、CRPS、pinball 与覆盖率" />
      <ToolLink label="模型置信集与预测组合" note="块自助 MCS、成对 DM 矩阵、逆 MSE 与最优权重" />
      <ToolLink label="Diebold-Mariano 检验" note="两模型预测精度的正式比较" />
    </div>

    <H n="07" en="Method Map" zh="方法地图：六层结构" />
    <div className="space-y-2 my-6">
      {layers.map((l) => (
        <div key={l.n} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] font-mono text-gold">{l.n}</span>
            <span className="text-sm text-foreground">{l.t}</span>
          </div>
          <p className="mt-1.5 text-[13px] text-foreground/70 leading-relaxed">{l.d}</p>
          <p className="mt-1.5 text-[11px] font-mono text-foreground/50">{l.tools}</p>
        </div>
      ))}
    </div>

    <H n="08" en="Timeline" zh="发展史：从 Yule 到严格适当评分规则" />
    <div className="space-y-3 my-6 border-l border-border/60 pl-5">
      {timeline.map((e) => (
        <div key={e.y} className="relative">
          <span className="absolute -left-[27px] top-2 h-1.5 w-1.5 rounded-full bg-gold" />
          <p className="text-[11px] font-mono text-gold">{e.y}</p>
          <p className="text-sm text-foreground">{e.t}</p>
          <p className="text-[13px] text-foreground/65 leading-relaxed">{e.d}</p>
        </div>
      ))}
    </div>

    <H n="09" en="Checklist" zh="最低报告清单" />
    <ol className="my-6 space-y-2 list-none">
      {checklist.map((c, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-[1.8] text-foreground/80">
          <span className="text-[11px] font-mono text-gold mt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
          <span>{c}</span>
        </li>
      ))}
    </ol>

    <div className="mt-10 rounded-xl border border-gold/30 bg-gold/5 p-5">
      <p className="text-[13px] leading-[1.85] text-foreground/80">
        一句话总结：时间序列建模的价值不在于把历史拟合得多好，而在于诚实地说明<span className="text-gold">哪些结构在样本期内是稳定的</span>、以及这种稳定性在预测期还能不能指望。平稳性检验、断点检验与样本外密度评价，分别在三个层面回答这个问题。
      </p>
    </div>
  </div>
);

export default TimeSeriesTheory;