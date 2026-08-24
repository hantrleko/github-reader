import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Reading guide for quantitative strategy: signal → construction → costs →
 * backtest biases → evaluation → live slippage.
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

const Eq = ({ children, note }: { children: React.ReactNode; note?: string }) => (
  <div className="my-5 rounded-xl border border-border bg-secondary/25 px-5 py-4">
    <p className="font-mono text-[15px] text-gold text-center">{children}</p>
    {note && <p className="text-[11px] font-mono text-muted-foreground text-center mt-2">{note}</p>}
  </div>
);

const Caution = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="my-5 rounded-xl border border-border/70 bg-card/40 px-4 py-3">
    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold mb-1.5">{title}</p>
    <p className="text-[13px] leading-[1.75] text-foreground/70">{children}</p>
  </div>
);

const ToolLink = ({ label, note, to }: { label: string; note: string; to: string }) => (
  <Link
    to={to}
    className="group inline-flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 mr-2 mb-2 hover:border-gold/50 hover:bg-card/60 transition-all"
  >
    <span>
      <span className="block text-sm text-foreground group-hover:text-gold transition-colors">{label}</span>
      <span className="block text-[11px] text-foreground/55">{note}</span>
    </span>
    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors mt-0.5 shrink-0" />
  </Link>
);

const QUANT = "/s/quant";
const BACKTEST = "/s/backtest";
const CALIB = "/s/calibration";
const FRONTIER = "/s/frontier";

const biases = [
  { k: "前视偏误", d: "使用了当时不可得的信息", f: "所有特征加上发布滞后（财报按 filing date 对齐）" },
  { k: "幸存者偏误", d: "样本只含今天仍存活的标的", f: "使用含退市/并购的全历史成分股" },
  { k: "过拟合", d: "在同一份数据上反复搜索参数", f: "样本外、Walk-Forward、Deflated Sharpe" },
  { k: "成本忽略", d: "按收盘价无摩擦成交", f: "价差 + 冲击 + 融券费的显式建模" },
  { k: "容量幻觉", d: "小市值上的高换手信号", f: "按 ADV 限仓，做容量-收益曲线" },
];

export default function QuantTheory() {
  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · Quant Strategy</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          量化策略导读：从一个信号，到组合、成本、回测偏误与实盘落差
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          量化策略不是「找到一个能预测的指标」，而是
          <strong className="text-foreground">把一个微弱的统计优势，在成本、容量与风险约束下稳定地重复很多次</strong>。
          这篇导读按研究流水线的真实顺序展开，每一节都指向站内可复现的实验。
        </p>
        <div className="mt-6">
          <ToolLink label="量化策略实验室" note="因子构建 · 分组回测 · 信号评估" to={QUANT} />
        </div>
      </header>

      <H n="1" en="Signal Construction" zh="信号构建：从假设出发，而不是从数据出发" />
      <P>
        先写下经济学理由（风险补偿、行为偏差还是结构性摩擦），再去数据里检验。反过来做——先扫描再编故事——
        几乎必然得到一个只存在于样本内的信号。原始特征要经过去极值、行业与市值中性化、截面标准化，
        才能变成可比的 z-score。
      </P>
      <Eq note="信息系数：预测值与未来收益的截面相关；IC_IR = mean(IC)/std(IC)">
        IC_t = corr( z_{"{i,t}"} , r_{"{i,t+1}"} )
      </Eq>
      <P>
        用「基本面法则」判断一个信号值不值得做：IR ≈ IC × √Breadth。IC 只有 0.03 并不致命，
        前提是你能在足够多的独立标的上重复它。
      </P>
      <ToolLink label="因子分组与 IC 检验" note="分位数分组、多空组合、IC 衰减" to={QUANT} />

      <H n="2" en="Portfolio Construction" zh="组合构建：从预测到权重" />
      <P>
        预测值不是权重。把 α 变成持仓要经过风险模型与约束：行业/风格暴露上限、单票权重上限、换手预算。
        均值-方差是骨架，但对 μ 的估计误差极其敏感，实盘更常用收缩协方差、风险平价或带换手惩罚的目标函数。
      </P>
      <Eq note="加入换手惩罚后的组合目标；λ 控制风险厌恶，γ 控制交易摩擦">
        max<sub>w</sub> wᵀμ − (λ/2)·wᵀΣw − γ·‖w − w₋‖₁
      </Eq>
      <div>
        <ToolLink label="有效前沿与稳健优化" note="收缩估计、风险平价、Black-Litterman" to={FRONTIER} />
      </div>

      <H n="3" en="Transaction Costs" zh="交易成本：策略死亡的第一现场" />
      <P>
        成本由三部分构成：显性费用、买卖价差、以及随成交量非线性上升的冲击成本。经验上冲击近似平方根律，
        这意味着规模翻倍时单位成本上升，容量天花板由此产生。
      </P>
      <Eq note="平方根冲击模型：Q 为订单量，ADV 为日均成交量">
        Impact ≈ η · σ · √(Q / ADV)
      </Eq>
      <Caution title="经验法则">
        把毛收益减去成本后再看排名。很多「高换手高 Sharpe」的信号在 10bp 双边成本下净收益即归零——
        先算成本盈亏平衡换手率，再决定要不要继续研究。
      </Caution>

      <H n="4" en="Backtest Pitfalls" zh="回测偏误清单：默认自己错了" />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">偏误</th>
              <th className="px-4 py-3">表现</th>
              <th className="px-4 py-3">对策</th>
            </tr>
          </thead>
          <tbody>
            {biases.map((b) => (
              <tr key={b.k} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{b.k}</td>
                <td className="px-4 py-3 text-foreground/80">{b.d}</td>
                <td className="px-4 py-3 text-foreground/60">{b.f}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Eq note="多重检验修正：N 次独立尝试后，最优 Sharpe 的期望本身就是正的">
        Deflated SR = SR<sub>obs</sub> 经 N 次试验与偏度峰度调整后的显著性
      </Eq>
      <ToolLink label="回测实验室" note="Walk-Forward、样本外切分、参数热力图" to={BACKTEST} />

      <H n="5" en="Evaluation" zh="评价指标：不要只看 Sharpe" />
      <P>
        Sharpe 假设收益近似正态且独立，但策略收益常有负偏与厚尾。至少同时看：最大回撤与回撤持续期、
        Sortino、Calmar、换手与容量、收益的集中度（是否由少数几天贡献）、以及与主流因子的回归 α。
      </P>
      <Eq note="剥离已知因子后的真实增量；t(α) 才是判断标准">
        r<sub>p,t</sub> − r<sub>f</sub> = α + Σ βₖ·Fₖ,t + ε
      </Eq>
      <ToolLink label="参数标定与稳健性" note="似然/矩估计、参数敏感性" to={CALIB} />

      <H n="6" en="Live Implementation" zh="实盘落差：回测与现实之间的那 30%" />
      <P>
        落差来自四处：成交假设（收盘价 vs VWAP vs 实际排队）、数据修订（宏观与财报会被回溯修改）、
        制度变化（涨跌停、融券可得性、监管窗口），以及策略拥挤（同类资金同时进出把 α 提前吃掉）。
      </P>
      <Caution title="上线检查清单">
        ① 纸上交易跑满一个完整市场周期；② 设定信号衰减监控与自动降杠杆阈值；
        ③ 记录每笔实际成交与回测假设的差异，形成 slippage 归因；④ 事先写好停用条件，而不是亏损后再讨论。
      </Caution>
      <div className="mt-6">
        <ToolLink label="进入量化策略实验室" note="把上面每一步都跑一遍" to={QUANT} />
        <ToolLink label="回测与稳健性检验" note="Walk-Forward 与偏误诊断" to={BACKTEST} />
      </div>
    </article>
  );
}
