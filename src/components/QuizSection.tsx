import { useState, useEffect, useMemo } from 「react「;
import { motion, AnimatePresence } from 「framer-motion「;
import { CheckCircle2, XCircle, Trophy, RotateCcw, ChevronRight, Sparkles } from 「lucide-react「;
import { BlockMath, InlineMath } from 「react-katex「;
import 「katex/dist/katex.min.css「;
import { Cite } from 「@/lib/citations「;

interface QuizQuestion {
  id: string;
  question: string;
  formula?: string;
  options: string[];
  answer: number;       // index of correct option
  explanation: string;
  citeId?: string;
  topic: string;
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 「bs1「, topic: 「BS 期权「,
    question: 「在 Black-Scholes 模型中，当波动率 σ 上升时，欧式认购期权价格如何变化？「,
    options: [「下降「, 「不变「, 「上升「, 「取决于 S 与 K 的相对位置「],
    answer: 2,
    explanation: 「Vega = ∂C/∂σ > 0 对所有标准期权成立。波动率越大，到期日 S 的分布更分散，期权「凸性「使得上行收益增加更多而下行损失被锁定（payoff = max(S-K, 0)）。「,
    formula: String.raw`\mathcal{V} = S\,\phi(d_1)\sqrt{T} > 0`,
    citeId: 「bs73「,
  },
  {
    id: 「bs2「, topic: 「BS 期权「,
    question: 「若无风险利率 r 上升 1%，下列说法正确的是：「,
    options: [「认购价格上升，认沽价格下降「, 「认购下降，认沽上升「, 「两者都上升「, 「两者都下降「],
    answer: 0,
    explanation: 「Rho_call = K·T·e^{-rT}·N(d2) > 0；Rho_put = -K·T·e^{-rT}·N(-d2) < 0。直观：r 上升降低 K 的现值（行权时支付），对认购方有利、对认沽方不利。「,
    citeId: 「bs73「,
  },
  {
    id: 「merton1「, topic: 「信用风险「,
    question: 「在 Merton (1974) 结构化模型中，公司股权可以视为：「,
    options: [
      「以资产 V 为标的、行权价 D 的看跌期权「,
      「以资产 V 为标的、行权价 D 的看涨期权「,
      「无风险债券「,
      「以债务 D 为标的的远期合约「,
    ],
    answer: 1,
    explanation: 「到期时股东获得 max(V_T - D, 0)，等价于以 V 为标的、K=D 的欧式看涨期权。债权人 = 持有 D 同时卖出 put on V。这是把 BS 框架延伸到信用领域的关键洞察。「,
    formula: String.raw`E_0 = V_0\,\Phi(d_1) - D\,e^{-rT}\Phi(d_2)`,
    citeId: 「merton74「,
  },
  {
    id: 「merton2「, topic: 「信用风险「,
    question: 「违约距离 DD 越大意味着：「,
    options: [「违约概率越高「, 「违约概率越低「, 「信用利差越大「, 「杠杆越高「],
    answer: 1,
    explanation: 「DD = (ln(V/D) + (μ - σ²/2)T) / (σ√T)，PD = N(-DD)。DD ↑ → -DD ↓ → N(-DD) ↓ → PD ↓。KMV 公司的经典风险度量。「,
    citeId: 「merton74「,
  },
  {
    id: 「lsm1「, topic: 「美式期权「,
    question: 「Longstaff-Schwartz (LSM) 算法用来估计什么？「,
    options: [
      「欧式期权的 BS 解析价格「,
      「标的资产的隐含波动率「,
      「美式期权在每个节点的延续价值 E[V_{t+1}|S_t]「,
      「二叉树的上下移幅 u, d「,
    ],
    answer: 2,
    explanation: 「LSM 用 ITM 路径上的最小二乘回归 (1, S, S²) 拟合延续价值，将其与立即行使的内在价值比较以决定 τ*。这是处理高维美式衍生品的工业标准。「,
    formula: String.raw`\hat{C}_{cont}(S_t) = \beta_0 + \beta_1 S_t + \beta_2 S_t^2`,
    citeId: 「longstaff01「,
  },
  {
    id: 「svi1「, topic: 「波动率曲面「,
    question: 「SVI 参数 ρ 的金融含义是：「,
    options: [「平价 ATM 隐含波动率「, 「微笑曲线的斜率/偏度「, 「曲率（凸性）「, 「整体水平「],
    answer: 1,
    explanation: 「Raw SVI: w(k) = a + b{ρ(k-m) + √((k-m)² + σ²)}。ρ ∈ (-1, 1) 控制 skew：股指 ρ < 0 复现典型左偏（OTM put 比 OTM call 贵）。「,
    citeId: 「gatheral04「,
  },
  {
    id: 「vasicek1「, topic: 「利率模型「,
    question: 「Vasicek 模型相比 CIR 模型的主要「缺陷「是：「,
    options: [
      「无法解析定价「,
      「利率可能为负「,
      「波动率结构过于复杂「,
      「不允许均值回归「,
    ],
    answer: 1,
    explanation: 「Vasicek: dr = κ(θ-r)dt + σ·dW，σ 为常数 → r 为正态分布，可取负。CIR: dr = κ(θ-r)dt + σ√r·dW，扩散系数随 r 收缩到 0，确保 r ≥ 0（Feller 条件 2κθ ≥ σ² 时严格 > 0）。「,
    citeId: 「vasicek77「,
  },
  {
    id: 「garch1「, topic: 「GARCH「,
    question: 「GARCH(1,1) 中 α + β 接近 1 表示：「,
    options: [
      「波动率过程完全独立「,
      「高波动率持续性 (volatility clustering)「,
      「残差服从正态分布「,
      「模型错误设定「,
    ],
    answer: 1,
    explanation: 「α + β 是波动率的「半衰期「决定因素。接近 1 → 持续性极强，冲击衰减缓慢。金融数据典型估计 α+β ≈ 0.97 ~ 0.99。若 α+β ≥ 1 则 GARCH(1,1) 退化为 IGARCH（无条件方差不存在）。「,
    formula: String.raw`\sigma_t^2 = \omega + \alpha\,r_{t-1}^2 + \beta\,\sigma_{t-1}^2`,
    citeId: 「bollerslev86「,
  },
  {
    id: 「egarch1「, topic: 「GARCH「,
    question: 「EGARCH 相比标准 GARCH 的关键改进是：「,
    options: [
      「估计速度更快「,
      「捕捉负面冲击对波动率的不对称放大（杠杆效应）「,
      「不需要数据平稳「,
      「可以处理跳跃过程「,
    ],
    answer: 1,
    explanation: 「EGARCH: ln σ²_t = ω + β·ln σ²_{t-1} + α(|z_{t-1}| - E|z|) + γ·z_{t-1}。γ < 0 时负冲击 (z<0) 放大波动率超过同等正冲击 → Black 1976 的杠杆效应。「,
    citeId: 「nelson91「,
  },
  {
    id: 「coint1「, topic: 「协整「,
    question: 「两个 I(1) 序列协整的含义是：「,
    options: [
      「它们的相关系数高「,
      「它们的差分序列协整「,
      「存在线性组合 y - β·x 是 I(0)「,
      「它们都服从单位根过程「,
    ],
    answer: 2,
    explanation: 「协整 (Engle-Granger 1987) 要求 y_t, x_t 都是 I(1) 但存在 β 使 u_t = y_t - β·x_t ~ I(0)。这是「长期均衡关系「的统计表述，VECM 用 u_{t-1} 作为误差修正项。「,
    formula: String.raw`\Delta y_t = \alpha_{ec}\,u_{t-1} + \gamma\,\Delta x_t + \varepsilon_t`,
    citeId: 「engle87「,
  },
  {
    id: 「kalman1「, topic: 「Kalman 滤波「,
    question: 「Kalman 增益 K_t 在更新方程中扮演什么角色？「,
    options: [
      「决定状态噪声的方差「,
      「在先验预测和新观测之间做最优加权「,
      「强制状态保持稳定「,
      「测试模型显著性「,
    ],
    answer: 1,
    explanation: 「K_t = P_{t|t-1}·x_t / (x_t²·P_{t|t-1} + R)。若观测噪声 R 很小 → K → 1 → 完全信任新观测；若 R 大 → K → 0 → 保持先验。是贝叶斯更新在线性高斯系统中的最优解。「,
    formula: String.raw`\hat\beta_{t|t} = \hat\beta_{t|t-1} + K_t\bigl(y_t - x_t\hat\beta_{t|t-1}\bigr)`,
    citeId: 「kalman60「,
  },
  {
    id: 「copula1「, topic: 「Copula「,
    question: 「高斯 Copula 与 t-Copula 的本质区别在于：「,
    options: [
      「高斯只能处理对称分布「,
      「t-Copula 表现出非零的尾相依 λ「,
      「高斯无法处理高维「,
      「两者完全等价「,
    ],
    answer: 1,
    explanation: 「高斯 Copula λ_U = λ_L = 0 (除非 ρ=1)；t-Copula λ ≈ 2·t_{ν+1}(-√((ν+1)(1-ρ)/(1+ρ))) > 0。即「在极端事件下相依性增强「。2008 危机经典教训：信用衍生品建模过度依赖高斯导致系统性低估尾部风险。「,
    citeId: 「sklar59「,
  },
  {
    id: 「bl1「, topic: 「Black-Litterman「,
    question: 「BL 模型中「隐含均衡收益「 π 是如何获得的？「,
    options: [
      「从历史收益均值估计「,
      「由分析师预测「,
      「从 CAPM 反推：π = δ·Σ·w_market「,
      「等于无风险利率「,
    ],
    answer: 2,
    explanation: 「BL 假设市值权重 w_market 在均值-方差框架下最优 → 反向求解隐含收益 π = δΣw。这个先验「贝叶斯地「表达了「市场总是对的「假设；观点 (P, Q, Ω) 提供新信息进行后验更新。「,
    formula: String.raw`\pi = \delta\,\Sigma\, w_{\text{mkt}}`,
    citeId: 「bl92「,
  },
  {
    id: 「ff1「, topic: 「Fama-French「,
    question: 「在 FF5 模型中，α 显著为正且 |t| > 2 意味着：「,
    options: [
      「模型设定错误「,
      「经过五因子风险调整后仍存在选股能力「,
      「组合等同于市场「,
      「因子载荷不显著「,
    ],
    answer: 1,
    explanation: 「α (Jensen alpha) 是模型不能解释的超额收益。t-stat > 2 → 在 95% 置信下与零显著不同。但需警惕 data mining：测试 N 个策略中 5% 会自然出现 α 显著（多重检验问题）。「,
    formula: String.raw`R_{p,t} - R_f = \alpha + \sum \beta_k F_{k,t} + \varepsilon_t`,
    citeId: 「ff15「,
  },
  {
    id: 「frontier1「, topic: 「投资组合「,
    question: 「马科维茨有效前沿上每个点代表的是：「,
    options: [
      「等风险组合「,
      「给定风险下收益最大（或给定收益下风险最小）的组合「,
      「市场组合「,
      「无风险资产「,
    ],
    answer: 1,
    explanation: 「有效前沿 = Pareto 最优集，由二次规划 min ½w'Σw s.t. w'μ=μ_target, w'1=1 解出。引入无风险资产后切线组合即为唯一的市场组合（Tobin 分离定理）。「,
    citeId: 「markowitz52「,
  },
  {
    id: 「swaption1「, topic: 「利率衍生品「,
    question: 「Payer swaption 的持有者在到期时获得的权利是：「,
    options: [
      「以行权利率 K 接收浮动利率「,
      「以行权利率 K 支付固定、收浮动的互换「,
      「无条件支付固定利率「,
      「锁定即期汇率「,
    ],
    answer: 1,
    explanation: 「Payer = 支付方期权：在 T 时若远期互换利率 S_T > K，行使后以 K 支付固定，收浮动 → 净现金流 (S_T - K)·年金 A。等价于 call on swap rate，Black-76 解析定价。「,
    formula: String.raw`V_0 = A\bigl[F\,\Phi(d_1) - K\,\Phi(d_2)\bigr]`,
    citeId: 「black76「,
  },
  {
    id: 「stress1「, topic: 「压力测试「,
    question: 「Basel III FRTB 要求银行使用历史 + 假设情景压力测试，主要原因是：「,
    options: [
      「VaR 已被淘汰「,
      「历史样本不足以覆盖所有可能的尾部事件「,
      「假设情景比历史更准确「,
      「便于会计处理「,
    ],
    answer: 1,
    explanation: 「纯历史 VaR 受 lookback window 限制，无法捕捉前所未见的危机（如 2008 复杂衍生品爆雷）。假设情景（如利率 +400bp、股票 -50%）作为补充，提供前瞻性风险视角。FRTB 同时要求 Expected Shortfall 替代 VaR。「,
    citeId: 「basel19「,
  },
];

const STORAGE_KEY = 「quiz-progress-v1「;

interface Progress {
  answered: Record<string, { correct: boolean; chosen: number }>;
  totalAttempts: number;
}

const loadProgress = (): Progress => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { answered: {}, totalAttempts: 0 };
};
const saveProgress = (p: Progress) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
};

const QuizSection = () => {
  const [topic, setTopic] = useState<string>(「全部「);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const topics = useMemo(() => [「全部「, ...Array.from(new Set(QUESTIONS.map(q => q.topic)))], []);
  const filtered = useMemo(
    () => topic === 「全部「 ? QUESTIONS : QUESTIONS.filter(q => q.topic === topic),
    [topic]
  );

  // Reset when topic changes
  useEffect(() => { setIdx(0); setChosen(null); setRevealed(false); }, [topic]);

  const q = filtered[idx % Math.max(filtered.length, 1)];

  const stats = useMemo(() => {
    const total = QUESTIONS.length;
    const answered = Object.keys(progress.answered).length;
    const correct = Object.values(progress.answered).filter(a => a.correct).length;
    const accuracy = answered ? correct / answered : 0;
    return { total, answered, correct, accuracy };
  }, [progress]);

  const handleSelect = (i: number) => {
    if (revealed) return;
    setChosen(i);
    setRevealed(true);
    const isCorrect = i === q.answer;
    const next: Progress = {
      ...progress,
      totalAttempts: progress.totalAttempts + 1,
      answered: { ...progress.answered, [q.id]: { correct: isCorrect, chosen: i } },
    };
    setProgress(next);
    saveProgress(next);
  };

  const next = () => {
    setChosen(null);
    setRevealed(false);
    setIdx((i) => (i + 1) % filtered.length);
  };

  const reset = () => {
    const fresh = { answered: {}, totalAttempts: 0 };
    setProgress(fresh);
    saveProgress(fresh);
    setChosen(null);
    setRevealed(false);
    setIdx(0);
  };

  const optionStyle = (i: number) => {
    if (!revealed) return 「border-border hover:border-gold/60 hover:bg-gold/5「;
    if (i === q.answer) return 「border-emerald-500/60 bg-emerald-500/10「;
    if (i === chosen) return 「border-destructive/60 bg-destructive/10「;
    return 「border-border opacity-50「;
  };

  return (
    <section className=「py-24 px-6 relative「>
      <div className=「absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none「 />
      <div className=「container relative z-10 max-w-4xl「>
        <motion.div className=「text-center mb-12「 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className=「text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3「>Knowledge Check</p>
          <h2 className=「text-3xl md:text-5xl font-display font-bold text-foreground「>交互测验中心</h2>
          <p className=「text-sm text-muted-foreground mt-3 max-w-2xl mx-auto「>
            17 道核心金融与计量题 · 即时反馈 · 进度本地保存
          </p>
        </motion.div>

        {/* Progress dashboard */}
        <div className=「grid grid-cols-2 md:grid-cols-4 gap-3 mb-6「>
          <div className=「rounded-lg border border-border bg-card p-4「>
            <p className=「text-[10px] font-mono uppercase tracking-wider text-muted-foreground「>已答题</p>
            <p className=「text-2xl font-mono text-gold tabular-nums「>{stats.answered}<span className=「text-sm text-muted-foreground「>/{stats.total}</span></p>
          </div>
          <div className=「rounded-lg border border-border bg-card p-4「>
            <p className=「text-[10px] font-mono uppercase tracking-wider text-muted-foreground「>答对</p>
            <p className=「text-2xl font-mono text-emerald-400 tabular-nums「>{stats.correct}</p>
          </div>
          <div className=「rounded-lg border border-border bg-card p-4「>
            <p className=「text-[10px] font-mono uppercase tracking-wider text-muted-foreground「>准确率</p>
            <p className=「text-2xl font-mono text-gold tabular-nums「>{(stats.accuracy * 100).toFixed(0)}%</p>
          </div>
          <div className=「rounded-lg border border-border bg-card p-4 flex items-center justify-between「>
            <div>
              <p className=「text-[10px] font-mono uppercase tracking-wider text-muted-foreground「>总尝试</p>
              <p className=「text-2xl font-mono text-foreground tabular-nums「>{progress.totalAttempts}</p>
            </div>
            <button onClick={reset} title=「重置进度「
              className=「p-2 rounded border border-border hover:border-destructive hover:text-destructive transition-colors「>
              <RotateCcw className=「w-4 h-4「 />
            </button>
          </div>
        </div>

        {/* Topic filter */}
        <div className=「flex flex-wrap gap-2 mb-6 justify-center「>
          {topics.map(t => (
            <button key={t} onClick={() => setTopic(t)}
              className={「text-xs px-3 py-1.5 rounded border font-mono transition-colors 「 +
                (topic === t ? 「border-gold bg-gold/10 text-gold「 : 「border-border text-muted-foreground hover:text-foreground「)}>
              {t}
            </button>
          ))}
        </div>

        {/* Question card */}
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className=「rounded-2xl border border-border bg-card p-6 md:p-10 glow-gold「
        >
          <div className=「flex items-center justify-between mb-4「>
            <span className=「text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 border border-gold/30 px-2 py-0.5 rounded「>{q.topic}</span>
            <span className=「text-[10px] font-mono text-muted-foreground「>题 {idx + 1} / {filtered.length}</span>
          </div>
          <h3 className=「text-lg md:text-xl font-display font-semibold text-foreground leading-relaxed mb-4「>{q.question}</h3>
          {q.formula && (
            <div className=「my-4 py-3 px-4 rounded-lg bg-secondary/40 border border-gold/20 text-foreground katex-display-gold text-center「>
              <BlockMath math={q.formula} />
            </div>
          )}

          <div className=「space-y-2 mb-6「>
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={revealed}
                className={「w-full text-left p-3 md:p-4 rounded-lg border transition-all flex items-start gap-3 「 + optionStyle(i)}
              >
                <span className=「font-mono text-xs text-muted-foreground mt-0.5「>{String.fromCharCode(65 + i)}.</span>
                <span className=「flex-1 text-sm「>{opt}</span>
                {revealed && i === q.answer && <CheckCircle2 className=「w-5 h-5 text-emerald-500 shrink-0「 />}
                {revealed && i === chosen && i !== q.answer && <XCircle className=「w-5 h-5 text-destructive shrink-0「 />}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 「auto「 }}
                exit={{ opacity: 0, height: 0 }}
                className=「overflow-hidden「
              >
                <div className={「rounded-lg p-4 border 「 + (chosen === q.answer
                  ? 「border-emerald-500/40 bg-emerald-500/5「
                  : 「border-destructive/40 bg-destructive/5「)}>
                  <div className=「flex items-center gap-2 mb-2「>
                    {chosen === q.answer
                      ? <><Trophy className=「w-4 h-4 text-emerald-400「 /><span className=「text-sm font-semibold text-emerald-400「>回答正确</span></>
                      : <><Sparkles className=「w-4 h-4 text-gold「 /><span className=「text-sm font-semibold text-gold「>参考解析</span></>}
                  </div>
                  <p className=「text-sm text-secondary-foreground leading-relaxed「>{q.explanation}</p>
                  {q.citeId && (
                    <p className=「mt-3 text-xs text-muted-foreground「>
                      参考文献：<Cite id={q.citeId} />
                    </p>
                  )}
                </div>
                <div className=「flex justify-end mt-4「>
                  <button onClick={next}
                    className=「inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold text-background hover:bg-gold/90 font-mono text-sm transition-colors「>
                    下一题 <ChevronRight className=「w-4 h-4「 />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default QuizSection;
