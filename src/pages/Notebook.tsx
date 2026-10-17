import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SectionHeader from "@/components/common/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Plus, Trash2, Save, FolderOpen, GitFork, Globe, Lock, Download, FileText, Sigma, SlidersHorizontal, BarChart3, Sparkles, Loader2, Code2, Table as TableIcon, GripVertical, History, AlertTriangle } from "lucide-react";
import DiscussionPanel from "@/components/DiscussionPanel";
import PythonCell, { PY_PLACEHOLDER } from "@/components/notebook/PythonCell";
import { awardBadge, checkNotebookCount } from "@/lib/achievements";
import { NOTEBOOK_TEMPLATES } from "@/data/notebookTemplates";
import { decodeCalcSeed, seedToCells } from "@/lib/calcToNotebook";
import { evalDag, buildScope, type DagCellInput, type CellResult } from "@/lib/notebook/dag";
import { compileExpr } from "@/lib/notebook/sandbox";
import { exportIpynb } from "@/lib/notebook/exportIpynb";
import { importIpynb } from "@/lib/notebook/importIpynb";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── Cell model ─────────────────────────────────────────── */
type ParamCell  = { id: string; kind: "param"; name: string; value: number; min: number; max: number; step: number };
type MdCell     = { id: string; kind: "markdown"; text: string };
type FormulaCell= { id: string; kind: "formula"; name?: string; latex: string; expression: string };
type ChartCell  = { id: string; kind: "chart"; xVar: string; xMin: number; xMax: number; n: number; expression: string };
type JsCell     = { id: string; kind: "js"; name: string; body: string };
type TableCell  = { id: string; kind: "table"; name?: string; body: string };
type PyCell     = { id: string; kind: "python"; body: string };
type Cell = ParamCell | MdCell | FormulaCell | ChartCell | JsCell | TableCell | PyCell;

const uid = () => Math.random().toString(36).slice(2, 10);



/* ─── DAG bridge ─────────────────────────────────────────── */
function cellToDag(c: Cell): DagCellInput {
  switch (c.kind) {
    case "param":   return { id: c.id, name: c.name, source: "", mode: "value", rawValue: c.value };
    case "formula": return { id: c.id, name: c.name, source: c.expression || "0", mode: "expr" };
    case "js":      return { id: c.id, name: c.name, source: c.body || "return null;", mode: "js" };
    case "table":   return { id: c.id, name: c.name, source: c.body || "[]", mode: "expr" };
    case "chart":   return { id: c.id, source: c.expression || "0", mode: "expr" };
    default:        return { id: c.id, source: "", mode: "value", rawValue: null }; // markdown / python — not in DAG
  }
}

/* ═══ Page ═══════════════════════════════════════════════ */
const Notebook = () => {
  const { t } = useTranslation();
const DEFAULT_CELLS: Cell[] = [
  { id: uid(), kind: "markdown", text: t("pages.notebook.copy1", { defaultValue: "# Black-Scholes 反应式 Notebook\n\n修改下方滑块,公式与图表自动重算。" }) },
  { id: uid(), kind: "param", name: "S",     value: 100, min: 50,  max: 200, step: 1 },
  { id: uid(), kind: "param", name: "K",     value: 100, min: 50,  max: 200, step: 1 },
  { id: uid(), kind: "param", name: "T",     value: 1,   min: 0.05, max: 3, step: 0.05 },
  { id: uid(), kind: "param", name: "sigma", value: 0.2, min: 0.05, max: 1, step: 0.01 },
  { id: uid(), kind: "param", name: "r",     value: 0.05, min: 0,   max: 0.2, step: 0.005 },
  { id: uid(), kind: "formula", latex: "C = S\\,N(d_1) - K e^{-rT} N(d_2)", expression: "bsCall(p.S,p.K,p.T,p.r,p.sigma)" },
  { id: uid(), kind: "chart", xVar: "S", xMin: 50, xMax: 200, n: 60, expression: "bsCall(x,p.K,p.T,p.r,p.sigma)" },
];
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [title, setTitle] = useState("Black-Scholes Reactive");
  const [cells, setCells] = useState<Cell[]>(DEFAULT_CELLS);
  const [isPublic, setIsPublic] = useState(false);
  const [forkedFrom, setForkedFrom] = useState<string | null>(null);
  const [myList, setMyList] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [showList, setShowList] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<{ id: string; title: string; cells: any; created_at: string }[]>([]);

  /* Build params dict + DAG results */
  const p = useMemo(() => {
    const out: Record<string, number> = {};
    cells.forEach((c) => { if (c.kind === "param") out[c.name] = c.value; });
    return out;
  }, [cells]);

  const dagResults = useMemo<Map<string, CellResult>>(
    () => evalDag(cells.map(cellToDag)),
    [cells]
  );
  const dagScope = useMemo(
    () => buildScope(cells.map(cellToDag), dagResults),
    [cells, dagResults]
  );

  /* Load by ?id=… */
  useEffect(() => {
  
    const id = params.get("id");
    const tplSlug = params.get("template");
    const seedRaw = params.get("seed");
    if (seedRaw && !id) {
      const seed = decodeCalcSeed(seedRaw);
      if (seed) {
        setNotebookId(null);
        setTitle(seed.title);
        setCells(seedToCells(seed) as any);
        setIsPublic(false);
        setForkedFrom(null);
        toast({ title: t("pages.notebook.copy2", { defaultValue: "已从计算器导入:{{value1}}", value1: seed.title }), description: t("pages.notebook.copy3", { defaultValue: "保存到我的 Notebook 以便后续编辑。" }) });
      }
      return;
    }
    if (tplSlug && !id) {
      const tpl = NOTEBOOK_TEMPLATES.find((item) => item.slug === tplSlug);
      if (tpl) {
        setNotebookId(null);
        setTitle(tpl.title);
        setCells(tpl.cells as any);
        setIsPublic(false);
        setForkedFrom(null);
        toast({ title: t("pages.notebook.copy4", { defaultValue: "已加载模板:{{value1}}", value1: tpl.title }), description: t("pages.notebook.copy5", { defaultValue: "保存即可入库到我的 Notebook。" }) });
      }
      return;
    }
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("user_notebooks").select("*").eq("id", id).maybeSingle();
      if (data) {
        setNotebookId(data.id);
        setTitle(data.title);
        setCells((data.cells as any) || []);
        setIsPublic(!!data.is_public);
        setForkedFrom(data.forked_from);
      }
    })();
  }, [params]);

  /* Load own notebook list */
  useEffect(() => {
    if (!user) { setMyList([]); return; }
    (async () => {
      const { data } = await supabase
        .from("user_notebooks")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(25);
      setMyList(data || []);
    })();
  }, [user, notebookId]);

  /* ─── Cell ops ─── */
  const update = (id: string, patch: Partial<Cell>) =>
    setCells((cs) => cs.map((c) => (c.id === id ? ({ ...c, ...patch } as Cell) : c)));
  const remove = (id: string) => setCells((cs) => cs.filter((c) => c.id !== id));
  const addCell = (kind: Cell["kind"]) => {
  
    const blank: Record<Cell["kind"], Cell> = {
      markdown: { id: uid(), kind: "markdown", text: t("pages.notebook.copy6", { defaultValue: "新段落..." }) },
      param:    { id: uid(), kind: "param", name: `x${cells.filter(c=>c.kind==="param").length+1}`, value: 1, min: 0, max: 10, step: 0.1 },
      formula:  { id: uid(), kind: "formula", name: "", latex: "y = p.x_1", expression: "p.x1" },
      chart:    { id: uid(), kind: "chart", xVar: "x", xMin: 0, xMax: 10, n: 50, expression: "Math.sin(x)*p.x1" },
      js:       { id: uid(), kind: "js",     name: `j${cells.filter(c=>c.kind==="js").length+1}`, body: "// 可用上游变量名 & p.*\nconst arr = linspace(0, 10, 50).map(x => Math.sin(x));\nreturn { mean: mean(arr), std: std(arr) };" },
      table:    { id: uid(), kind: "table",  name: "", body: "linspace(0, 10, 11).map(x => ({ x, sin: Math.sin(x), cos: Math.cos(x) }))" },
      python:   { id: uid(), kind: "python", body: PY_PLACEHOLDER },
    };
    setCells((cs) => [...cs, blank[kind]]);
  };

  /* ─── dnd sorting ─── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setCells((cs) => {
      const oldIndex = cs.findIndex((c) => c.id === active.id);
      const newIndex = cs.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return cs;
      return arrayMove(cs, oldIndex, newIndex);
    });
  };

  /* ─── Cloud ops ─── */
  const save = async () => {
  
    if (!user) { toast({ title: t("pages.notebook.copy7", { defaultValue: "请先登录" }), variant: "destructive" }); return; }
    if (notebookId) {
      const { error } = await supabase.from("user_notebooks").update({
        title, cells: cells as any, is_public: isPublic,
      }).eq("id", notebookId);
      if (error) { toast({ title: t("pages.notebook.copy8", { defaultValue: "保存失败" }), description: error.message, variant: "destructive" }); return; }
      // snapshot version (best-effort, ignore failures)
      await supabase.from("notebook_versions").insert({
        notebook_id: notebookId, user_id: user.id, title, cells: cells as any,
      });
      toast({ title: t("pages.notebook.copy9", { defaultValue: "已保存" }) });
      if (isPublic) awardBadge("notebook-published");
    } else {
      const { data, error } = await supabase.from("user_notebooks").insert({
        user_id: user.id, title, cells: cells as any, is_public: isPublic,
      }).select().single();
      if (error) { toast({ title: t("pages.notebook.copy10", { defaultValue: "创建失败" }), description: error.message, variant: "destructive" }); return; }
      setNotebookId(data.id);
      await supabase.from("notebook_versions").insert({
        notebook_id: data.id, user_id: user.id, title, cells: cells as any,
      });
      toast({ title: t("pages.notebook.copy11", { defaultValue: "已创建" }) });
      // First save + milestone badges
      awardBadge("first-notebook");
      if (isPublic) awardBadge("notebook-published");
      checkNotebookCount().then((n) => { if (n >= 5) awardBadge("notebook-explorer"); });
    }
  };
  const fork = async () => {
  
    if (!user) { toast({ title: t("pages.notebook.copy7", { defaultValue: "请先登录" }), variant: "destructive" }); return; }
    const { data, error } = await supabase.from("user_notebooks").insert({
      user_id: user.id,
      title: `${title} (fork)`,
      cells: cells as any,
      is_public: false,
      forked_from: notebookId,
    }).select().single();
    if (error) { toast({ title: t("pages.notebook.copy12", { defaultValue: "Fork 失败" }), description: error.message, variant: "destructive" }); return; }
    setNotebookId(data.id);
    setForkedFrom(notebookId);
    setIsPublic(false);
    setTitle(`${title} (fork)`);
    toast({ title: t("pages.notebook.copy13", { defaultValue: "已 Fork 到我的 Notebook" }) });
    awardBadge("notebook-forked");
  };
  const load = async (id: string) => {
    const { data } = await supabase.from("user_notebooks").select("*").eq("id", id).maybeSingle();
    if (data) {
      setNotebookId(data.id); setTitle(data.title);
      setCells((data.cells as any) || []); setIsPublic(!!data.is_public);
      setForkedFrom(data.forked_from); setShowList(false);
    }
  };
  const exportMd = () => {
    const lines: string[] = [`# ${title}\n`];
    cells.forEach((c) => {
      if (c.kind === "markdown") lines.push(c.text + "\n");
      else if (c.kind === "param") lines.push(`- **${c.name}** = ${c.value}  *(range ${c.min}–${c.max})*`);
      else if (c.kind === "formula") {
        const r = dagResults.get(c.id);
        const v = typeof r?.value === "number" ? (r.value as number).toFixed(4) : String(r?.value ?? "");
        lines.push(`$$${c.latex}$$\n\n→ \`${c.expression}\` = **${v}**\n`);
      }
      else if (c.kind === "chart") lines.push(`*Chart:* \`${c.expression}\` over ${c.xVar} ∈ [${c.xMin}, ${c.xMax}]\n`);
      else if (c.kind === "js") lines.push(`\`\`\`js\n// js cell — ${c.name}\n${c.body}\n\`\`\`\n`);
      else if (c.kind === "table") lines.push(`*Table:* \`${c.body}\`\n`);
      else if (c.kind === "python") lines.push(`\`\`\`python\n${c.body}\n\`\`\`\n`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${title}.md`; a.click();
  };
  const exportNotebook = () => {
    const json = exportIpynb(title, cells as any);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${title}.ipynb`; a.click();
  };
  const importNotebook = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ipynb,application/json";
    input.onchange = async () => {
  
      const f = input.files?.[0];
      if (!f) return;
      try {
        const { title: importedTitle, cells: imported } = importIpynb(await f.text());
        setNotebookId(null);
        setTitle(importedTitle);
        setCells(imported as any);
        setIsPublic(false);
        setForkedFrom(null);
        toast({ title: t("pages.notebook.copy14", { defaultValue: "已导入 {{value1}}", value1: importedTitle }), description: t("pages.notebook.copy15", { defaultValue: "{{value1}} 个单元 · 代码单元可直接用 Python 内核运行", value1: imported.length }) });
      } catch (e) {
        toast({ title: t("pages.notebook.copy16", { defaultValue: "导入失败" }), description: String((e as Error)?.message || e), variant: "destructive" });
      }
    };
    input.click();
  };

  /* ─── Versions ─── */
  const openVersions = async () => {
  
    if (!notebookId || !user) { toast({ title: t("pages.notebook.copy17", { defaultValue: "保存后才有版本历史" }) }); return; }
    const { data } = await supabase
      .from("notebook_versions")
      .select("id,title,cells,created_at")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false });
    setVersions((data || []) as any);
    setShowVersions(true);
  };
  const restoreVersion = (v: { title: string; cells: any }) => {
    setTitle(v.title);
    setCells(v.cells || []);
    setShowVersions(false);
    toast({ title: t("pages.notebook.copy18", { defaultValue: "已恢复到所选版本,记得 Save 以覆盖当前内容。" }) });
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={notebookId && isPublic ? `${title} · EF Lab Notebook` : "Reactive Notebook · EF Lab"}
        description={
          notebookId && isPublic
            ? t("pages.notebook.copy19", { defaultValue: "{{value1}} — 反应式金融笔记本,{{value2}} 个 cell。一键 Fork 到你的工作区,继续推导与回测。", value1: title, value2: cells.length })
            : t("pages.notebook.copy20", { defaultValue: "Observable 风格的反应式金融笔记本：参数滑块驱动 LaTeX 公式与图表自动重算,支持云端保存与分享。" })
        }
        path={notebookId ? `/notebook?id=${notebookId}` : "/notebook"}
        type={notebookId && isPublic ? "article" : "website"}
        noindex={!!notebookId && !isPublic}
        jsonLd={
          notebookId && isPublic
            ? {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: title,
                url: `https://eugenefinance.tech/notebook?id=${notebookId}`,
                articleSection: "Quantitative Finance Notebook",
              }
            : undefined
        }
      />
      <Navbar />
      <main id="main-content" className="pt-14">
        <SectionHeader
          chapter="Chapter N"
          kicker="REACTIVE NOTEBOOK"
          title="Reactive Notebook"
          subtitle={t("pages.notebook.copy21", { defaultValue: "对标 Observable · 参数即依赖,改一处全表重算。Markdown + LaTeX + 沙箱表达式 + 自动图表 + 云端保存。" })}
        />

        <section className="container max-w-5xl px-6 pb-16">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-y border-accent/30 py-3 mb-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-[200px] bg-transparent font-display text-lg text-foreground border-b border-transparent focus:border-gold focus:outline-none px-1"
            />
            <button onClick={save} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gold text-background text-[10px] font-mono uppercase tracking-wider hover:bg-gold/85">
              <Save className="w-3 h-3" /> Save
            </button>
            <button onClick={fork} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-[10px] font-mono uppercase tracking-wider hover:border-gold/60 text-foreground">
              <GitFork className="w-3 h-3" /> Fork
            </button>
            <button onClick={() => setShowList((s) => !s)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-[10px] font-mono uppercase tracking-wider hover:border-gold/60 text-foreground">
              <FolderOpen className="w-3 h-3" /> Open
            </button>
            <button onClick={openVersions} disabled={!notebookId} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-[10px] font-mono uppercase tracking-wider hover:border-gold/60 text-foreground disabled:opacity-40">
              <History className="w-3 h-3" /> Versions
            </button>
            <button onClick={exportMd} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-[10px] font-mono uppercase tracking-wider hover:border-gold/60 text-foreground">
              <Download className="w-3 h-3" /> .md
            </button>
            <button onClick={exportNotebook} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-[10px] font-mono uppercase tracking-wider hover:border-gold/60 text-foreground">
              <Download className="w-3 h-3" /> .ipynb
            </button>
            <button onClick={importNotebook} title={t("pages.notebook.copy22", { defaultValue: "导入 Jupyter Notebook — 代码单元将可用 Pyodide 内核运行" })} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-[10px] font-mono uppercase tracking-wider hover:border-gold/60 text-foreground">
              <FolderOpen className="w-3 h-3" /> Import .ipynb
            </button>
            <button
              onClick={() => setIsPublic((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 border text-[10px] font-mono uppercase tracking-wider",
                isPublic ? "border-emerald-500/60 text-emerald-400" : "border-border/60 text-muted-foreground"
              )}
            >
              {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isPublic ? "Public" : "Private"}
            </button>
            {forkedFrom && (
              <span className="text-[10px] font-mono text-muted-foreground">
                forked from <code className="text-gold">{forkedFrom.slice(0,8)}</code>
              </span>
            )}
          </div>

          {showList && (
            <div className="mb-6 border border-border/60 bg-card/40 p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gold mb-2">My Notebooks</p>
              {!user && <p className="text-xs text-muted-foreground">{t("pages.notebook.copy23", { defaultValue: "请先" })} <Link to="/auth" className="text-gold underline">{t("pages.notebook.copy24", { defaultValue: "登录" })}</Link></p>}
              {user && myList.length === 0 && <p className="text-xs text-muted-foreground">{t("pages.notebook.copy25", { defaultValue: "尚无 Notebook" })}</p>}
              <ul className="divide-y divide-border/40">
                {myList.map((n) => (
                  <li key={n.id} className="flex items-center justify-between py-2">
                    <button onClick={() => load(n.id)} className="text-left text-sm text-foreground hover:text-gold">{n.title}</button>
                    <span className="text-[10px] font-mono text-muted-foreground">{new Date(n.updated_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showVersions && (
            <div className="mb-6 border border-border/60 bg-card/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-gold">{t("pages.notebook.copy26", { defaultValue: "Version history (最近 20 个)" })}</p>
                <button onClick={() => setShowVersions(false)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground">{t("pages.notebook.copy27", { defaultValue: "关闭" })}</button>
              </div>
              {versions.length === 0 && <p className="text-xs text-muted-foreground">{t("pages.notebook.copy28", { defaultValue: "暂无历史版本" })}</p>}
              <ul className="divide-y divide-border/40">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-foreground">{v.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()} · {Array.isArray(v.cells) ? v.cells.length : 0} cells
                      </span>
                    </div>
                    <button onClick={() => restoreVersion(v)} className="px-2 py-1 border border-gold/60 text-gold text-[10px] font-mono uppercase tracking-wider hover:bg-gold/10">
                      {t("pages.notebook.copy29", { defaultValue: "恢复" })}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cells */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={cells.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-3">
                {cells.map((c, idx) => (
                  <SortableCellRow
                    key={c.id}
                    cell={c}
                    idx={idx}
                    result={dagResults.get(c.id)}
                    scope={dagScope}
                    p={p}
                    update={update}
                    remove={remove}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>

          {/* Add cell */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-accent/30 pt-4">
            {(["markdown","param","formula","chart","js","table","python"] as const).map((k) => (
              <button
                key={k}
                onClick={() => addCell(k)}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-[10px] font-mono uppercase tracking-wider hover:border-gold/60 text-foreground"
              >
                <Plus className="w-3 h-3" /> {k}
              </button>
            ))}
          </div>

          {notebookId && <DiscussionPanel resourceType="notebook" resourceId={notebookId} />}
        </section>
      </main>
    </div>
  );
};

const IconBtn = ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...rest} className="p-1 rounded hover:bg-accent/40 text-muted-foreground">{children}</button>
);

/* ─── Sortable wrapper ────────────────────────────────────── */
const SortableCellRow = ({
  cell, idx, result, scope, p, update, remove,
}: {
  cell: Cell; idx: number; result: CellResult | undefined;
  scope: Record<string, unknown>; p: Record<string, number>;
  update: (id: string, patch: Partial<Cell>) => void;
  remove: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cell.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const Icon =
    cell.kind === "markdown" ? FileText :
    cell.kind === "param"    ? SlidersHorizontal :
    cell.kind === "formula"  ? Sigma :
    cell.kind === "chart"    ? BarChart3 :
    cell.kind === "js"       ? Code2 :
    cell.kind === "python"   ? Code2 :
    TableIcon;
  const cellName = (cell as any).name as string | undefined;
  return (
    <li ref={setNodeRef} style={style} className="group border border-border/60 bg-card/30 hover:border-gold/40 transition-colors">
      <div className="flex items-center justify-between border-b border-accent/20 px-3 py-1.5 bg-background/60">
        <span className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-gold/80">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 hover:text-gold" aria-label="drag">
            <GripVertical className="w-3 h-3" />
          </button>
          <Icon className="w-3 h-3" />
          [{idx + 1}] {cell.kind}
          {cellName ? <span className="text-gold/60">· {cellName}</span> : null}
          {result?.error && (
            <span className="inline-flex items-center gap-1 text-rose-400 normal-case tracking-normal">
              <AlertTriangle className="w-3 h-3" /> {result.error}
            </span>
          )}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconBtn onClick={() => remove(cell.id)} title={t("pages.notebook.copy30", { defaultValue: "删除" })}><Trash2 className="w-3 h-3 text-rose-400" /></IconBtn>
        </div>
      </div>
      <div className="p-4">
        <CellBody cell={cell} result={result} scope={scope} p={p} update={update} />
      </div>
    </li>
  );
};

/* ─── AI Explain (Lovable AI Gateway) ─────────────────────── */
const AiExplain = ({ latex, expression, params, context }: { latex?: string; expression?: string; params: Record<string, number>; context?: string }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string>("");
  const [open, setOpen] = useState(false);

  const ask = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-explain", {
        body: { latex, expression, params, context },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setText((data as any)?.explanation || t("pages.notebook.copy31", { defaultValue: "(无返回)" }));
    } catch (e: any) {
      const msg = String(e?.message || e);
      setText(`❌ ${msg}`);
      toast({ title: t("pages.notebook.copy32", { defaultValue: "AI 解释失败" }), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1">
      <button
        onClick={ask}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2 py-1 border border-gold/40 text-gold text-[10px] font-mono uppercase tracking-wider hover:bg-gold/10 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {t("pages.notebook.copy33", { defaultValue: "AI 解释" })}
      </button>
      {open && (text || loading) && (
        <div className="mt-2 border-l-2 border-gold/60 bg-accent/20 px-3 py-2 text-xs text-foreground/85 font-body leading-relaxed whitespace-pre-wrap">
          {loading ? t("pages.notebook.copy34", { defaultValue: "正在思考…" }) : text}
        </div>
      )}
    </div>
  );
};

/* ─── Cell body renderers ─────────────────────────────────── */
const CellBody = ({ cell, result, scope, p, update }: {
  cell: Cell;
  result: CellResult | undefined;
  scope: Record<string, unknown>;
  p: Record<string,number>;
  update: (id: string, patch: Partial<Cell>) => void;
}) => {
  const { t } = useTranslation();
  if (cell.kind === "python") {
    return (
      <PythonCell
        body={cell.body}
        params={p}
        onChange={(body) => update(cell.id, { body } as Partial<Cell>)}
      />
    );
  }
  if (cell.kind === "markdown") {
    return (
      <textarea
        value={cell.text}
        onChange={(e) => update(cell.id, { text: e.target.value })}
        className="w-full bg-transparent text-sm text-foreground/85 font-body resize-y min-h-[60px] focus:outline-none whitespace-pre-wrap leading-relaxed"
      />
    );
  }
  if (cell.kind === "param") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={cell.name}
          onChange={(e) => update(cell.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
          className="w-20 bg-background border border-border/60 px-2 py-1 text-xs font-mono text-gold focus:outline-none focus:border-gold"
        />
        <input
          type="range" min={cell.min} max={cell.max} step={cell.step} value={cell.value}
          onChange={(e) => update(cell.id, { value: parseFloat(e.target.value) })}
          className="flex-1 min-w-[160px] accent-gold"
        />
        <input
          type="number" value={cell.value} step={cell.step}
          onChange={(e) => update(cell.id, { value: parseFloat(e.target.value) || 0 })}
          className="w-24 bg-background border border-border/60 px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:border-gold"
        />
        <span className="text-[10px] font-mono text-muted-foreground">
          [{cell.min} … {cell.max}]
        </span>
      </div>
    );
  }
  if (cell.kind === "formula") {
    const value = typeof result?.value === "number" ? (result!.value as number) : NaN;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">name</span>
          <input
            value={cell.name || ""}
            onChange={(e) => update(cell.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
            placeholder="(optional)"
            className="w-28 bg-background border border-border/60 px-2 py-1 text-xs font-mono text-gold focus:outline-none focus:border-gold"
          />
          {result?.deps && result.deps.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">deps: {result.deps.join(", ")}</span>
          )}
        </div>
        <input
          value={cell.latex}
          onChange={(e) => update(cell.id, { latex: e.target.value })}
          placeholder="LaTeX..."
          className="w-full bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
        />
        <div className="py-2 text-center text-foreground">
          <InlineMath math={cell.latex || "y"} />
        </div>
        <input
          value={cell.expression}
          onChange={(e) => update(cell.id, { expression: e.target.value })}
          placeholder="JS expression — use p.S, p.K, bsCall(...), exp(), ncdf(), ..."
          className="w-full bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
        />
        <div className="flex items-center justify-between gap-2">
          <AiExplain latex={cell.latex} expression={cell.expression} params={p} />
          <div className="text-right text-sm font-mono text-gold tabular-nums">
            = {isFinite(value) ? value.toFixed(6) : (result?.error ? "—" : String(result?.value ?? "NaN"))}
          </div>
        </div>
      </div>
    );
  }
  if (cell.kind === "js") {
    const value = result?.value;
    const display = result?.error
      ? null
      : (() => {
          try { return JSON.stringify(value, null, 2); } catch { return String(value); }
        })();
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">name</span>
          <input
            value={cell.name}
            onChange={(e) => update(cell.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
            className="w-28 bg-background border border-border/60 px-2 py-1 text-xs font-mono text-gold focus:outline-none focus:border-gold"
          />
          {result?.deps && result.deps.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">deps: {result.deps.join(", ")}</span>
          )}
        </div>
        <textarea
          value={cell.body}
          onChange={(e) => update(cell.id, { body: e.target.value })}
          spellCheck={false}
          className="w-full bg-background border border-border/60 px-2 py-1 text-xs font-mono min-h-[120px] resize-y focus:outline-none focus:border-gold"
        />
        {display !== null && (
          <pre className="bg-background/60 border border-border/40 px-3 py-2 text-[11px] font-mono text-foreground/85 overflow-auto max-h-48">
{display}
          </pre>
        )}
        <AiExplain expression={cell.body} params={p} context={`JS cell named "${cell.name}"`} />
      </div>
    );
  }
  if (cell.kind === "table") {
    const value = result?.value;
    const rows: Record<string, unknown>[] = Array.isArray(value)
      ? (value as any[]).map((v) => (typeof v === "object" && v !== null ? v : { value: v }))
      : [];
    const cols = rows.length ? Object.keys(rows[0]) : [];
    return (
      <div className="space-y-2">
        <input
          value={cell.body}
          onChange={(e) => update(cell.id, { body: e.target.value })}
          placeholder="JS expression returning an array of objects"
          className="w-full bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
        />
        {rows.length === 0 ? (
          <p className="text-[11px] font-mono text-muted-foreground">{result?.error || t("pages.notebook.copy35", { defaultValue: "返回非数组,无法渲染表格" })}</p>
        ) : (
          <div className="overflow-auto max-h-72 border border-border/40">
            <table className="w-full text-[11px] font-mono">
              <thead className="bg-background/60 text-gold/80">
                <tr>{cols.map((c) => <th key={c} className="text-left px-2 py-1 border-b border-border/40">{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="odd:bg-background/30">
                    {cols.map((c) => (
                      <td key={c} className="px-2 py-1 tabular-nums text-foreground/85 border-b border-border/20">
                        {typeof r[c] === "number" ? (r[c] as number).toFixed(4) : String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && <p className="text-[10px] font-mono text-muted-foreground px-2 py-1">{t("pages.notebook.copy36", { defaultValue: "… 仅显示前 200 行 (共" })} {rows.length})</p>}
          </div>
        )}
      </div>
    );
  }
  // chart — use compiled expression with scope (named cells available)
  const data: { x: number; y: number }[] = [];
  let chartFn: ((s: Record<string, unknown>, x?: number) => unknown) | null = null;
  let chartErr = "";
  try { chartFn = compileExpr(cell.expression || "0"); }
  catch (e) { chartErr = String((e as Error)?.message ?? e); }
  if (chartFn) {
    const step = (cell.xMax - cell.xMin) / Math.max(cell.n - 1, 1);
    for (let i = 0; i < cell.n; i++) {
      const x = cell.xMin + i * step;
      let y: number = NaN;
      try {
        const v = chartFn({ ...scope, [cell.xVar || "x"]: x }, x);
        y = typeof v === "number" && isFinite(v) ? v : NaN;
      } catch { /* per-point error: leave NaN */ }
      data.push({ x, y });
    }
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <LblInput label="x var"   value={cell.xVar}  onChange={(v) => update(cell.id, { xVar: v })} />
        <LblNum   label="x min"   value={cell.xMin}  onChange={(v) => update(cell.id, { xMin: v })} />
        <LblNum   label="x max"   value={cell.xMax}  onChange={(v) => update(cell.id, { xMax: v })} />
        <LblNum   label="N"       value={cell.n}     onChange={(v) => update(cell.id, { n: Math.max(2, Math.min(500, Math.round(v))) })} />
      </div>
      <input
        value={cell.expression}
        onChange={(e) => update(cell.id, { expression: e.target.value })}
        placeholder="JS expression of x and p — e.g. bsCall(x,p.K,p.T,p.r,p.sigma)"
        className="w-full bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
      />
      {chartErr && <p className="text-[11px] font-mono text-rose-400">{chartErr}</p>}
      <div className="h-64 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
              formatter={(v: any) => (typeof v === "number" ? v.toFixed(4) : v)}
            />
            <Line type="monotone" dataKey="y" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <AiExplain expression={cell.expression} params={p} context={`chart over ${cell.xVar} ∈ [${cell.xMin}, ${cell.xMax}]`} />
    </div>
  );
};

const LblInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex flex-col gap-0.5">
    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold" />
  </label>
);
const LblNum = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <label className="flex flex-col gap-0.5">
    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
    <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="bg-background border border-border/60 px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:border-gold" />
  </label>
);

export default Notebook;