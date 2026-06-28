import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  PlayCircle,
  Workflow as WorkflowIcon,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SiteFooter from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { WORKFLOWS, WORKFLOW_MAP, type Workflow } from "@/data/workflows";
import { TOOLS_CATALOG, DIFFICULTY_LABEL } from "@/data/toolsCatalog";
import { sectionHref } from "@/lib/sections";
import { BUS_META, type BusKey } from "@/lib/toolBus";

const toolName = (id: string) => TOOLS_CATALOG.find((t) => t.id === id)?.name ?? id;
const toolAnchor = (id: string) => TOOLS_CATALOG.find((t) => t.id === id)?.anchor ?? "/tools";
const toolBlurb = (id: string) => TOOLS_CATALOG.find((t) => t.id === id)?.blurb ?? "";

const BusBadge = ({ k }: { k: BusKey }) => (
  <span
    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-gold/10 border border-gold/30 text-gold"
    title={BUS_META[k].zh}
  >
    {BUS_META[k].symbol}
  </span>
);

const WorkflowsPage = () => {
  const [params, setParams] = useSearchParams();
  const activeId = params.get("w");
  const active = activeId ? WORKFLOW_MAP[activeId] : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="研究工作流 · EF Lab"
        description="把隐含波动率、曲面拟合、Greeks、组合优化与信用风险等工具串成可逐步走查的研究工作流剧本。"
        path="/workflows"
      />
      <Navbar />
      <main className="flex-1 container max-w-5xl px-6 pt-20 pb-20">
        {active ? (
          <WorkflowDetail workflow={active} onBack={() => setParams({})} />
        ) : (
          <WorkflowList onSelect={(id) => setParams({ w: id })} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

const WorkflowList = ({ onSelect }: { onSelect: (id: string) => void }) => (
  <>
    <header className="mb-10">
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-gold transition-colors mb-6"
      >
        <ArrowLeft className="w-3 h-3" /> 工具目录
      </Link>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono text-gold tracking-[0.3em] uppercase">
          Workflows · V3.4
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
      </div>
      <h1 className="text-3xl md:text-4xl font-display text-foreground mb-3 flex items-center gap-3">
        <WorkflowIcon className="w-7 h-7 text-gold" /> 研究工作流
      </h1>
      <p className="text-sm text-muted-foreground max-w-2xl">
        把零散工具按教学 / 实务顺序串成「剧本」，逐步走查；步骤之间用工具总线（Tool Bus）自动传递关键参数。
      </p>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {WORKFLOWS.map((w) => {
        const diff = DIFFICULTY_LABEL[w.difficulty];
        return (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className="group text-left rounded-xl border border-border/60 bg-card/30 p-5 hover:border-gold/50 hover:bg-card/60 transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h2 className="text-base font-display text-foreground group-hover:text-gold transition-colors">
                  {w.title}
                </h2>
                <p className="text-[10px] font-mono text-muted-foreground/80 mt-0.5">
                  {w.titleEn}
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-gold shrink-0" />
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed mb-4 line-clamp-3">
              {w.blurb}
            </p>
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
              {w.steps.map((s, i) => (
                <span key={s.toolId} className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-foreground/80">{toolName(s.toolId)}</span>
                  {i < w.steps.length - 1 && <ChevronRight className="w-3 h-3 text-gold/60" />}
                </span>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
              <span className={cn("uppercase tracking-wider", diff.tone)}>{diff.zh}</span>
              <span className="text-muted-foreground/60">{w.steps.length} 步</span>
            </div>
          </button>
        );
      })}
    </div>
  </>
);

const WorkflowDetail = ({ workflow, onBack }: { workflow: Workflow; onBack: () => void }) => {
  const navigate = useNavigate();
  const diff = DIFFICULTY_LABEL[workflow.difficulty];
  const start = () => navigate(sectionHref(toolAnchor(workflow.steps[0].toolId)));

  return (
    <>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-gold transition-colors mb-6"
      >
        <ArrowLeft className="w-3 h-3" /> 全部工作流
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono text-gold tracking-[0.3em] uppercase">
          {workflow.titleEn}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
        <span className={cn("text-[10px] font-mono uppercase tracking-wider", diff.tone)}>
          {diff.zh}
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-display text-foreground mb-3">{workflow.title}</h1>
      <p className="text-sm text-muted-foreground max-w-2xl mb-6">{workflow.blurb}</p>

      <button
        onClick={start}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-mono mb-10"
      >
        <PlayCircle className="w-4 h-4" /> 从第一步开始
      </button>

      <ol className="relative border-l border-border/60 ml-3 space-y-6">
        {workflow.steps.map((step, i) => (
          <li key={step.toolId} className="ml-6">
            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-gold/15 border border-gold/40 text-gold text-[11px] font-mono">
              {i + 1}
            </span>
            <div className="rounded-xl border border-border/60 bg-card/30 p-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <h3 className="text-sm font-display text-foreground">{toolName(step.toolId)}</h3>
                <Link
                  to={sectionHref(toolAnchor(step.toolId))}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-gold transition-colors shrink-0"
                >
                  打开 <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed mb-2">{step.note}</p>
              <p className="text-[10px] font-mono text-muted-foreground/70 italic line-clamp-1 mb-2">
                {toolBlurb(step.toolId)}
              </p>
              {step.passes && step.passes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-muted-foreground">
                  <ArrowRight className="w-3 h-3 text-gold/60" />
                  <span>传递</span>
                  {step.passes.map((k) => (
                    <BusBadge key={k} k={k} />
                  ))}
                  <span>给下一步</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
};

export default WorkflowsPage;
