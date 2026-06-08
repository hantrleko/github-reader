import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, ClipboardCheck, FlaskConical } from "lucide-react";

interface Playbook {
  id: string;
  label: string;
  title: string;
  audience: string;
  promise: string;
  workflow: string[];
  anchors: Array<{ label: string; href: string }>;
  deliverables: string[];
}

const PLAYBOOKS: Playbook[] = [
  {
    id: "asset-pricing-replication",
    label: "Empirical Finance",
    title: "复现实证资产定价论文",
    audience: "适合课程论文、因子研究与资产定价入门项目",
    promise: "从文献问题出发，完成因子构建、横截面检验、稳健性检查和 Notebook 沉淀。",
    workflow: [
      "明确被解释收益、样本区间、调仓频率与可投资约束",
      "在知识地图中复习 CAPM、FF3/FF5、SDF 与异象定义",
      "用计量工具检查回归设定、标准误、显著性与稳健性",
      "将核心图表、参数和结论整理为可复现 Notebook",
    ],
    anchors: [
      { label: "资产定价主题", href: "/topic/asset-pricing" },
      { label: "计量工具", href: "/#econometrics" },
      { label: "Notebook 模板", href: "/notebook/templates" },
    ],
    deliverables: ["因子定义表", "Fama-MacBeth 回归表", "稳健性清单", "可复现 Notebook"],
  },
  {
    id: "options-calibration",
    label: "Derivatives Desk",
    title: "搭建期权定价与波动率校准流程",
    audience: "适合衍生品课程、交易台演示与模型风险比较",
    promise: "把 Black-Scholes、隐含波动率、随机波动和波动率曲面放进同一个校准叙事。",
    workflow: [
      "先用 Black-Scholes 建立无套利定价与 Greeks 直觉",
      "用隐含波动率反推市场预期，并观察期限结构与微笑形态",
      "比较 SVI、SABR、Heston 与 Local Vol 的拟合差异和约束条件",
      "记录校准参数、误差指标和模型适用边界",
    ],
    anchors: [
      { label: "Black-Scholes", href: "/#calculator" },
      { label: "隐含波动率", href: "/#implied-vol" },
      { label: "衍生品高阶", href: "/#derivatives" },
    ],
    deliverables: ["Greeks 敏感性图", "IV Smile 截面", "模型误差对比", "校准假设说明"],
  },
  {
    id: "risk-committee",
    label: "Risk Committee",
    title: "构建组合风险与压力测试简报",
    audience: "适合风控汇报、组合复盘与尾部风险教学",
    promise: "从组合配置到尾部损失，把 VaR/ES、信用风险、Copula 与情景冲击串成决策简报。",
    workflow: [
      "在有效前沿中确定收益、波动和权重的基准组合",
      "计算 VaR/ES 并检查分布假设对尾部损失的影响",
      "加入信用风险、相关结构和极端情景冲击",
      "用图表解释风险来源、缓释方案和监控指标",
    ],
    anchors: [
      { label: "有效前沿", href: "/#frontier" },
      { label: "风险工具", href: "/#risk" },
      { label: "量化策略", href: "/#quant" },
    ],
    deliverables: ["组合基准", "尾部损失表", "压力情景矩阵", "风险缓释建议"],
  },
  {
    id: "teaching-sprint",
    label: "Teaching Sprint",
    title: "设计一节模型驱动的互动课程",
    audience: "适合课堂讲授、助教演示与学生自学路线",
    promise: "把抽象公式拆成概念导入、参数实验、即时测验和课后 Notebook 任务。",
    workflow: [
      "从主题卡片选择核心概念，限定本节课只解决一个研究问题",
      "用模型卡片解释公式、变量和假设，再切换到交互工具演示",
      "通过测验检查学生对假设、参数和结论的理解",
      "布置 Notebook 模板作为课后复现实验",
    ],
    anchors: [
      { label: "主题概览", href: "/#topics" },
      { label: "经典模型", href: "/#models" },
      { label: "知识测验", href: "/#quiz" },
    ],
    deliverables: ["课程问题", "模型演示脚本", "测验结果", "课后复现任务"],
  },
];

const ResearchPlaybooks = () => {
  const [activeId, setActiveId] = useState(PLAYBOOKS[0].id);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const active = useMemo(
    () => PLAYBOOKS.find((item) => item.id === activeId) ?? PLAYBOOKS[0],
    [activeId]
  );

  const activeCompleted = active.workflow.filter((_, index) => completed[`${active.id}-${index}`]).length;
  const score = Math.round((activeCompleted / active.workflow.length) * 100);

  const selectPlaybook = (id: string) => {
    setActiveId(id);
  };

  const toggleStep = (index: number) => {
    const key = `${active.id}-${index}`;
    setCompleted((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section id="research-playbooks" className="px-6 py-14">
      <div className="container max-w-6xl">
        <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-gold" />
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold">
                Research Playbooks
              </p>
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight">
              选择一个研究场景，自动组织工具链与交付物
            </h2>
            <p className="mt-3 text-sm md:text-base text-foreground/68 leading-relaxed">
              不是简单罗列功能，而是把平台能力封装成可执行的研究剧本：每个剧本都包含推荐入口、操作步骤、检查清单和最终产出。
            </p>
          </div>
          <div className="rounded-xl border border-gold/25 bg-gold/[0.04] px-4 py-3 min-w-[160px]">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">Readiness</p>
            <p className="mt-1 text-3xl font-mono text-foreground">{score}%</p>
            <p className="text-[11px] text-muted-foreground">{activeCompleted} / {active.workflow.length} steps checked</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.5fr] gap-5">
          <div className="rounded-2xl border border-border/60 bg-card/35 p-3 space-y-2">
            {PLAYBOOKS.map((item) => {
              const selected = item.id === active.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectPlaybook(item.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    selected
                      ? "border-gold/45 bg-gold/[0.07]"
                      : "border-transparent hover:border-border/70 hover:bg-background/35"
                  }`}
                >
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/75">
                    {item.label}
                  </span>
                  <h3 className="mt-2 font-display text-lg text-foreground leading-snug">{item.title}</h3>
                  <p className="mt-1 text-xs text-foreground/60 leading-relaxed">{item.audience}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/45 p-5 md:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-2">
                  Active Playbook
                </p>
                <h3 className="font-display text-2xl md:text-3xl text-foreground">{active.title}</h3>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed max-w-2xl">{active.promise}</p>
              </div>
              <ClipboardCheck className="w-6 h-6 text-gold/80" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Execution Steps
                </p>
                <div className="space-y-2">
                  {active.workflow.map((step, index) => {
                    const checked = !!completed[`${active.id}-${index}`];
                    return (
                      <button
                        key={step}
                        onClick={() => toggleStep(index)}
                        className="w-full flex items-start gap-3 rounded-xl border border-border/50 bg-background/30 hover:border-gold/35 p-3 text-left transition-colors"
                      >
                        {checked ? (
                          <CheckCircle2 className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        )}
                        <span className={`text-sm leading-relaxed ${checked ? "text-foreground" : "text-foreground/72"}`}>
                          {step}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    Suggested Entrypoints
                  </p>
                  <div className="space-y-2">
                    {active.anchors.map((anchor) => (
                      <Link
                        key={anchor.href}
                        to={anchor.href}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-xs text-foreground/75 hover:text-gold hover:border-gold/35 transition-colors"
                      >
                        <span>{anchor.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    Expected Deliverables
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {active.deliverables.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-gold/25 bg-gold/[0.04] px-3 py-1 text-[11px] text-foreground/75"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResearchPlaybooks;
