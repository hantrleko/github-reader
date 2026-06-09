import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Copy,
  FileStack,
  FileText,
  FlaskConical,
  Gauge,
  ListChecks,
  Rocket,
  Send,
  ShieldCheck,
  Target,
} from "lucide-react";

interface Playbook {
  id: string;
  label: string;
  title: string;
  audience: string;
  promise: string;
  workflow: string[];
  anchors: Array<{ label: string; href: string }>;
  deliverables: string[];
  qualityGates: string[];
  decisionQuestions: string[];
}

const PERSONAS = ["研究者", "授课教师", "量化分析师"];
const SPRINT_LENGTHS = [3, 5, 10];
const PACK_MODES = [
  { id: "replication", label: "复现优先", tone: "强调数据口径、识别设定与可复验图表" },
  { id: "teaching", label: "教学优先", tone: "强调概念脚手架、课堂提问与学生产出" },
  { id: "decision", label: "决策优先", tone: "强调风险假设、行动建议与汇报口径" },
];

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
    qualityGates: ["样本口径与幸存者偏差已说明", "因子构建公式可复现", "回归标准误与分组检验匹配研究问题"],
    decisionQuestions: ["这个因子是否仍有经济含义？", "异常收益能否穿透交易成本？", "结果对样本期和行业中性化是否敏感？"],
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
    qualityGates: ["市场报价、期限与 moneyness 口径一致", "校准误差按期限和执行价分层展示", "模型参数边界与无套利约束已记录"],
    decisionQuestions: ["哪类模型最适合当前 smile 形态？", "Greeks 对冲误差来自波动率还是跳跃风险？", "校准结果是否稳定到可用于教学或交易解释？"],
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
    qualityGates: ["收益分布假设与尾部样本已标注", "VaR/ES、信用风险与相关冲击口径一致", "缓释建议可映射到仓位、限额或对冲动作"],
    decisionQuestions: ["哪个风险因子主导尾部损失？", "压力情景是否覆盖流动性与相关性断裂？", "委员会需要批准监控、降仓还是对冲？"],
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
    qualityGates: ["课程只围绕一个核心研究问题展开", "公式、参数实验与测验问题形成闭环", "课后 Notebook 任务有明确评分口径"],
    decisionQuestions: ["学生需要先理解哪一个假设？", "哪个参数变化最能制造直觉冲突？", "课后任务如何证明学生完成了迁移应用？"],
  },
];

const ResearchPlaybooks = () => {
  const [activeId, setActiveId] = useState(PLAYBOOKS[0].id);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [persona, setPersona] = useState(PERSONAS[0]);
  const [sprintLength, setSprintLength] = useState(5);
  const [packMode, setPackMode] = useState(PACK_MODES[0].id);
  const [copied, setCopied] = useState(false);
  const [packCopied, setPackCopied] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);

  const active = useMemo(
    () => PLAYBOOKS.find((item) => item.id === activeId) ?? PLAYBOOKS[0],
    [activeId]
  );

  const activeCompleted = active.workflow.filter((_, index) => completed[`${active.id}-${index}`]).length;
  const score = Math.round((activeCompleted / active.workflow.length) * 100);

  const selectedPackMode = PACK_MODES.find((item) => item.id === packMode) ?? PACK_MODES[0];

  const sprintPlan = useMemo(() => {
    const days = Array.from({ length: sprintLength }, (_, index) => {
      const workflow = active.workflow[index % active.workflow.length];
      const deliverable = active.deliverables[index % active.deliverables.length];
      return {
        day: index + 1,
        focus: workflow,
        output: deliverable,
      };
    });

    return {
      thesis: `${persona} · ${sprintLength} 日研究冲刺：围绕「${active.title}」完成从入口选择、模型实验到交付物封装的闭环。`,
      days,
      brief: [
        `目标：${active.title}`,
        `角色：${persona}`,
        `周期：${sprintLength} 日`,
        `核心承诺：${active.promise}`,
        `交付物：${active.deliverables.join(" / ")}`,
      ].join("\n"),
    };
  }, [active, persona, sprintLength]);

  const evidencePack = useMemo(() => {
    const gates = active.qualityGates.map((gate, index) => ({
      label: gate,
      status: index < activeCompleted ? "Ready" : "Needs evidence",
    }));

    return {
      title: `${selectedPackMode.label} · ${active.title}`,
      summary: `${selectedPackMode.tone}，并将 ${active.deliverables.slice(0, 2).join("、")} 作为第一批证据资产。`,
      gates,
      questions: active.decisionQuestions,
    };
  }, [active, activeCompleted, selectedPackMode]);

  const opsBoard = useMemo(() => {
    const readyGateCount = evidencePack.gates.filter((gate) => gate.status === "Ready").length;
    const evidenceScore = Math.round((readyGateCount / evidencePack.gates.length) * 100);
    const handoffScore = Math.min(
      100,
      Math.round(score * 0.45 + evidenceScore * 0.35 + sprintLength * 4 + (packMode === "decision" ? 8 : 0))
    );
    const nextOpenStep = active.workflow.find((_, index) => !completed[`${active.id}-${index}`]);
    const nextGate = evidencePack.gates.find((gate) => gate.status !== "Ready")?.label;

    return {
      stage: score >= 100 ? "Ready for handoff" : score >= 50 ? "Evidence building" : "Scoping",
      metrics: [
        { label: "Readiness", value: score, detail: `${activeCompleted}/${active.workflow.length} steps` },
        { label: "Evidence", value: evidenceScore, detail: `${readyGateCount}/${evidencePack.gates.length} gates` },
        { label: "Handoff", value: handoffScore, detail: `${sprintLength}-day ${selectedPackMode.label}` },
      ],
      nextActions: [
        nextOpenStep ? `推进下一步：${nextOpenStep}` : "所有执行步骤已完成，进入交付物封装。",
        nextGate ? `补齐证据：${nextGate}` : "质量门槛已满足，可以准备复盘或汇报。",
        `将「${evidencePack.questions[0]}」作为下一次讨论的开场问题。`,
      ],
    };
  }, [active, activeCompleted, completed, evidencePack, packMode, score, selectedPackMode.label, sprintLength]);

  const decisionMemo = useMemo(() => {
    const stance = score >= 100 ? "建议进入交付/汇报" : score >= 50 ? "建议补证后评审" : "建议先完成范围界定";
    const audience = selectedPackMode.id === "decision"
      ? "风险委员会 / 投资例会"
      : persona === "授课教师"
        ? "课程负责人 / 助教团队"
        : "研究小组 / 项目导师";
    const firstReadyGate = evidencePack.gates.find((gate) => gate.status === "Ready")?.label ?? "尚无已满足的质量门槛";
    const firstMissingGate = evidencePack.gates.find((gate) => gate.status !== "Ready")?.label ?? "质量门槛已全部满足";

    return {
      title: `决策备忘录 · ${active.title}`,
      audience,
      stance,
      narrative: `面向${audience}，当前项目处于 ${opsBoard.stage} 阶段，Readiness 为 ${score}%。建议采用「${selectedPackMode.label}」口径，在 ${sprintLength} 日冲刺内围绕证据、风险和交付物形成可复用汇报。`,
      sections: [
        { label: "Decision", content: stance },
        { label: "Evidence", content: `已确认：${firstReadyGate}；待补齐：${firstMissingGate}` },
        { label: "Action", content: opsBoard.nextActions[0] },
      ],
      exportLines: [
        `To: ${audience}`,
        `Subject: ${active.title}`,
        `Stance: ${stance}`,
        `Stage: ${opsBoard.stage}`,
        `Summary: ${selectedPackMode.tone}`,
        `Next action: ${opsBoard.nextActions[0]}`,
        `Opening question: ${evidencePack.questions[0]}`,
      ],
    };
  }, [active.title, evidencePack.gates, evidencePack.questions, opsBoard.nextActions, opsBoard.stage, persona, score, selectedPackMode.id, selectedPackMode.label, selectedPackMode.tone, sprintLength]);

  const selectPlaybook = (id: string) => {
    setActiveId(id);
  };

  const toggleStep = (index: number) => {
    const key = `${active.id}-${index}`;
    setCompleted((current) => ({ ...current, [key]: !current[key] }));
  };

  const copySprintBrief = async () => {
    const text = `${sprintPlan.brief}\n\n${sprintPlan.days
      .map((day) => `Day ${day.day}: ${day.focus} → ${day.output}`)
      .join("\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const copyEvidencePack = async () => {
    const text = [
      evidencePack.title,
      evidencePack.summary,
      "",
      "Quality Gates:",
      ...evidencePack.gates.map((gate) => `- [${gate.status}] ${gate.label}`),
      "",
      "Decision Questions:",
      ...evidencePack.questions.map((question) => `- ${question}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setPackCopied(true);
      window.setTimeout(() => setPackCopied(false), 1600);
    } catch {
      setPackCopied(false);
    }
  };

  const copyDecisionMemo = async () => {
    const text = [
      decisionMemo.title,
      decisionMemo.narrative,
      "",
      ...decisionMemo.exportLines,
      "",
      "Memo Sections:",
      ...decisionMemo.sections.map((section) => `- ${section.label}: ${section.content}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setMemoCopied(true);
      window.setTimeout(() => setMemoCopied(false), 1600);
    } catch {
      setMemoCopied(false);
    }
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

        <div className="mb-5 rounded-2xl border border-border/60 bg-card/35 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-gold" />
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold">
                  Research Ops Board
                </p>
              </div>
              <h3 className="font-display text-2xl text-foreground">实时判断研究项目是否可以交付</h3>
              <p className="mt-2 text-sm text-foreground/68 leading-relaxed">
                根据剧本完成度、证据门槛和冲刺周期自动生成运营面板，把下一步行动从「还要做什么」变成可执行队列。
              </p>
            </div>
            <div className="rounded-xl border border-gold/25 bg-gold/[0.04] px-4 py-3 min-w-[180px]">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">Current Stage</p>
              <p className="mt-1 font-display text-xl text-foreground">{opsBoard.stage}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.4fr] gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {opsBoard.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/50 bg-background/30 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-mono text-foreground">{metric.value}%</p>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${metric.value}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-foreground/55">{metric.detail}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/50 bg-background/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-gold" />
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  Next Best Actions
                </p>
              </div>
              <div className="space-y-2">
                {opsBoard.nextActions.map((action, index) => (
                  <div key={action} className="flex gap-3 rounded-lg border border-border/40 bg-card/30 p-3">
                    <Rocket className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground/72 leading-relaxed">
                      <span className="font-mono text-[10px] text-gold/80 mr-2">A{index + 1}</span>
                      {action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
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

        <div className="mt-5 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.06] via-card/45 to-card/25 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-gold" />
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold">
                  Sprint Composer
                </p>
              </div>
              <h3 className="font-display text-2xl text-foreground">把剧本压缩成可执行研究冲刺</h3>
              <p className="mt-2 text-sm text-foreground/68 leading-relaxed">
                选择角色与周期，自动生成一份可复制的行动简报，用于课堂任务、团队分工或个人研究计划。
              </p>
            </div>
            <button
              onClick={copySprintBrief}
              className="inline-flex items-center gap-2 rounded-lg border border-gold/35 bg-background/35 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-gold hover:bg-gold/10 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied" : "Copy brief"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.4fr] gap-5">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Research Role
                </p>
                <div className="flex flex-wrap gap-2">
                  {PERSONAS.map((item) => (
                    <button
                      key={item}
                      onClick={() => setPersona(item)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        persona === item
                          ? "border-gold/50 bg-gold/10 text-gold"
                          : "border-border/60 text-foreground/65 hover:border-gold/30"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Sprint Window
                </p>
                <div className="flex flex-wrap gap-2">
                  {SPRINT_LENGTHS.map((days) => (
                    <button
                      key={days}
                      onClick={() => setSprintLength(days)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        sprintLength === days
                          ? "border-gold/50 bg-gold/10 text-gold"
                          : "border-border/60 text-foreground/65 hover:border-gold/30"
                      }`}
                    >
                      <CalendarDays className="w-3 h-3" />
                      {days} days
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/30 p-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
                  Generated Thesis
                </p>
                <p className="text-sm text-foreground/75 leading-relaxed">{sprintPlan.thesis}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sprintPlan.days.map((day) => (
                <div key={day.day} className="rounded-xl border border-border/50 bg-background/30 p-4">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">
                    Day {day.day}
                  </span>
                  <p className="mt-2 text-sm text-foreground/75 leading-relaxed">{day.focus}</p>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Output: <span className="text-foreground/75">{day.output}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border/60 bg-card/40 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <FileStack className="w-4 h-4 text-gold" />
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold">
                  Evidence Pack
                </p>
              </div>
              <h3 className="font-display text-2xl text-foreground">把行动计划沉淀为可审计证据包</h3>
              <p className="mt-2 text-sm text-foreground/68 leading-relaxed">
                根据当前剧本和完成度生成质量门槛、决策问题与证据摘要，帮助团队在复现、教学和决策场景中保持同一套交付标准。
              </p>
            </div>
            <button
              onClick={copyEvidencePack}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/35 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-foreground/70 hover:border-gold/35 hover:text-gold transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {packCopied ? "Copied" : "Copy pack"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.4fr] gap-5">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Pack Mode
                </p>
                <div className="space-y-2">
                  {PACK_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setPackMode(mode.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${
                        packMode === mode.id
                          ? "border-gold/45 bg-gold/[0.07]"
                          : "border-border/50 bg-background/25 hover:border-gold/30"
                      }`}
                    >
                      <span className="text-xs font-medium text-foreground">{mode.label}</span>
                      <p className="mt-1 text-[11px] text-foreground/58 leading-relaxed">{mode.tone}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
                  Pack Summary
                </p>
                <h4 className="font-display text-lg text-foreground">{evidencePack.title}</h4>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{evidencePack.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-gold" />
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    Quality Gates
                  </p>
                </div>
                <div className="space-y-2">
                  {evidencePack.gates.map((gate) => (
                    <div key={gate.label} className="rounded-lg border border-border/40 bg-card/30 p-3">
                      <p className="text-sm text-foreground/75 leading-relaxed">{gate.label}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.12em] ${
                        gate.status === "Ready"
                          ? "bg-gold/10 text-gold"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {gate.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-gold" />
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    Decision Questions
                  </p>
                </div>
                <div className="space-y-2">
                  {evidencePack.questions.map((question, index) => (
                    <div key={question} className="flex gap-3 rounded-lg border border-border/40 bg-card/30 p-3">
                      <span className="text-[10px] font-mono text-gold mt-0.5">Q{index + 1}</span>
                      <p className="text-sm text-foreground/72 leading-relaxed">{question}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gold/25 bg-gradient-to-br from-card/55 via-background/35 to-gold/[0.05] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gold" />
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold">
                  Decision Memo Studio
                </p>
              </div>
              <h3 className="font-display text-2xl text-foreground">把研究进度转译为可汇报决策备忘录</h3>
              <p className="mt-2 text-sm text-foreground/68 leading-relaxed">
                自动读取运营看板、证据包和冲刺设定，生成面向导师、课堂负责人或风险委员会的摘要、立场和下一步行动。
              </p>
            </div>
            <button
              onClick={copyDecisionMemo}
              className="inline-flex items-center gap-2 rounded-lg border border-gold/35 bg-background/35 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-gold hover:bg-gold/10 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {memoCopied ? "Copied" : "Copy memo"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.35fr] gap-5">
            <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
                Memo Brief
              </p>
              <h4 className="font-display text-xl text-foreground">{decisionMemo.title}</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-border/50 bg-background/40 px-3 py-1 text-[11px] text-foreground/70">
                  To: {decisionMemo.audience}
                </span>
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] text-gold">
                  {decisionMemo.stance}
                </span>
              </div>
              <p className="mt-4 text-sm text-foreground/72 leading-relaxed">{decisionMemo.narrative}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {decisionMemo.sections.map((section) => (
                <div key={section.label} className="rounded-xl border border-border/50 bg-background/30 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    {section.label}
                  </p>
                  <p className="mt-3 text-sm text-foreground/74 leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResearchPlaybooks;
