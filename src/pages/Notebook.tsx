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
import { Plus, Trash2, ArrowUp, ArrowDown, Save, FolderOpen, GitFork, Globe, Lock, Download, FileText, Sigma, SlidersHorizontal, BarChart3 } from "lucide-react";
import DiscussionPanel from "@/components/DiscussionPanel";
import { awardBadge, checkNotebookCount } from "@/lib/achievements";
import { NOTEBOOK_TEMPLATES } from "@/data/notebookTemplates";
import { decodeCalcSeed, seedToCells } from "@/lib/calcToNotebook";

/* ─── Cell model ─────────────────────────────────────────── */
type ParamCell  = { id: string; kind: "param"; name: string; value: number; min: number; max: number; step: number };
type MdCell     = { id: string; kind: "markdown"; text: string };
type FormulaCell= { id: string; kind: "formula"; latex: string; expression: string }; // expression: JS using `p` (params)
type ChartCell  = { id: string; kind: "chart"; xVar: string; xMin: number; xMax: number; n: number; expression: string };
type Cell = ParamCell | MdCell | FormulaCell | ChartCell;

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_CELLS: Cell[] = [
  { id: uid(), kind: "markdown", text: "# Black-Scholes 反应式 Notebook\n\n修改下方滑块,公式与图表自动重算。" },
  { id: uid(), kind: "param", name: "S",     value: 100, min: 50,  max: 200, step: 1 },
  { id: uid(), kind: "param", name: "K",     value: 100, min: 50,  max: 200, step: 1 },
  { id: uid(), kind: "param", name: "T",     value: 1,   min: 0.05, max: 3, step: 0.05 },
  { id: uid(), kind: "param", name: "sigma", value: 0.2, min: 0.05, max: 1, step: 0.01 },
  { id: uid(), kind: "param", name: "r",     value: 0.05, min: 0,   max: 0.2, step: 0.005 },
  { id: uid(), kind: "formula", latex: "C = S\\,N(d_1) - K e^{-rT} N(d_2)", expression: "bsCall(p.S,p.K,p.T,p.r,p.sigma)" },
  { id: uid(), kind: "chart", xVar: "S", xMin: 50, xMax: 200, n: 60, expression: "bsCall(x,p.K,p.T,p.r,p.sigma)" },
];

/* ─── Safe expression evaluator ──────────────────────────── */
// Only allow whitelisted names. Compile once, recompute on changes.
const SAFE_HELPERS = `
const exp = Math.exp, log = Math.log, sqrt = Math.sqrt, pow = Math.pow,
      sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, min = Math.min, PI = Math.PI;
function ndf(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
function ncdf(x){
  // Abramowitz-Stegun 7.1.26
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,P=0.3275911;
  const sgn = x<0?-1:1; x = Math.abs(x)/Math.SQRT2;
  const t = 1/(1+P*x);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return 0.5*(1+sgn*y);
}
function bsCall(S,K,T,r,s){
  if (T<=0||s<=0) return Math.max(S-K,0);
  const d1 = (Math.log(S/K)+(r+0.5*s*s)*T)/(s*Math.sqrt(T));
  const d2 = d1 - s*Math.sqrt(T);
  return S*ncdf(d1) - K*Math.exp(-r*T)*ncdf(d2);
}
function bsPut(S,K,T,r,s){
  return bsCall(S,K,T,r,s) - S + K*Math.exp(-r*T);
}
`;

function evalSafe(expr: string, p: Record<string, number>, x?: number): number {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("p", "x", `${SAFE_HELPERS}; return (${expr});`);
    const v = fn(p, x);
    return typeof v === "number" && isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

/* ═══ Page ═══════════════════════════════════════════════ */
const Notebook = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [title, setTitle] = useState("Black-Scholes Reactive");
  const [cells, setCells] = useState<Cell[]>(DEFAULT_CELLS);
  const [isPublic, setIsPublic] = useState(false);
  const [forkedFrom, setForkedFrom] = useState<string | null>(null);
  const [myList, setMyList] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [showList, setShowList] = useState(false);

  /* Build params dict from ParamCells */
  const p = useMemo(() => {
    const out: Record<string, number> = {};
    cells.forEach((c) => { if (c.kind === "param") out[c.name] = c.value; });
    return out;
  }, [cells]);

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
        toast({ title: `已从计算器导入:${seed.title}`, description: "保存到我的 Notebook 以便后续编辑。" });
      }
      return;
    }
    if (tplSlug && !id) {
      const tpl = NOTEBOOK_TEMPLATES.find((t) => t.slug === tplSlug);
      if (tpl) {
        setNotebookId(null);
        setTitle(tpl.title);
        setCells(tpl.cells as any);
        setIsPublic(false);
        setForkedFrom(null);
        toast({ title: `已加载模板:${tpl.title}`, description: "保存即可入库到我的 Notebook。" });
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
  const move = (id: string, dir: -1 | 1) =>
    setCells((cs) => {
      const i = cs.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const next = cs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const addCell = (kind: Cell["kind"]) => {
    const blank: Record<Cell["kind"], Cell> = {
      markdown: { id: uid(), kind: "markdown", text: "新段落..." },
      param:    { id: uid(), kind: "param", name: `x${cells.filter(c=>c.kind==="param").length+1}`, value: 1, min: 0, max: 10, step: 0.1 },
      formula:  { id: uid(), kind: "formula", latex: "y = p.x_1", expression: "p.x1" },
      chart:    { id: uid(), kind: "chart", xVar: "x", xMin: 0, xMax: 10, n: 50, expression: "Math.sin(x)*p.x1" },
    };
    setCells((cs) => [...cs, blank[kind]]);
  };

  /* ─── Cloud ops ─── */
  const save = async () => {
    if (!user) { toast({ title: "请先登录", variant: "destructive" }); return; }
    if (notebookId) {
      const { error } = await supabase.from("user_notebooks").update({
        title, cells: cells as any, is_public: isPublic,
      }).eq("id", notebookId);
      if (error) { toast({ title: "保存失败", description: error.message, variant: "destructive" }); return; }
      toast({ title: "已保存" });
      if (isPublic) awardBadge("notebook-published");
    } else {
      const { data, error } = await supabase.from("user_notebooks").insert({
        user_id: user.id, title, cells: cells as any, is_public: isPublic,
      }).select().single();
      if (error) { toast({ title: "创建失败", description: error.message, variant: "destructive" }); return; }
      setNotebookId(data.id);
      toast({ title: "已创建" });
      // First save + milestone badges
      awardBadge("first-notebook");
      if (isPublic) awardBadge("notebook-published");
      checkNotebookCount().then((n) => { if (n >= 5) awardBadge("notebook-explorer"); });
    }
  };
  const fork = async () => {
    if (!user) { toast({ title: "请先登录", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("user_notebooks").insert({
      user_id: user.id,
      title: `${title} (fork)`,
      cells: cells as any,
      is_public: false,
      forked_from: notebookId,
    }).select().single();
    if (error) { toast({ title: "Fork 失败", description: error.message, variant: "destructive" }); return; }
    setNotebookId(data.id);
    setForkedFrom(notebookId);
    setIsPublic(false);
    setTitle(`${title} (fork)`);
    toast({ title: "已 Fork 到我的 Notebook" });
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
      else if (c.kind === "formula") lines.push(`$$${c.latex}$$\n\n→ \`${c.expression}\` = **${evalSafe(c.expression, p).toFixed(4)}**\n`);
      else if (c.kind === "chart") lines.push(`*Chart:* \`${c.expression}\` over ${c.xVar} ∈ [${c.xMin}, ${c.xMax}]\n`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${title}.md`; a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={notebookId && isPublic ? `${title} · EF Lab Notebook` : "Reactive Notebook · EF Lab"}
        description={
          notebookId && isPublic
            ? `${title} — 反应式金融笔记本,${cells.length} 个 cell。一键 Fork 到你的工作区,继续推导与回测。`
            : "Observable 风格的反应式金融笔记本：参数滑块驱动 LaTeX 公式与图表自动重算,支持云端保存与分享。"
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
                url: `https://my-repo-mind.lovable.app/notebook?id=${notebookId}`,
                articleSection: "Quantitative Finance Notebook",
              }
            : undefined
        }
      />
      <Navbar />
      <main className="pt-14">
        <SectionHeader
          chapter="Chapter N"
          kicker="REACTIVE NOTEBOOK"
          title="Reactive Notebook"
          subtitle="对标 Observable · 参数即依赖,改一处全表重算。Markdown + LaTeX + 沙箱表达式 + 自动图表 + 云端保存。"
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
            <button onClick={exportMd} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-[10px] font-mono uppercase tracking-wider hover:border-gold/60 text-foreground">
              <Download className="w-3 h-3" /> .md
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
              {!user && <p className="text-xs text-muted-foreground">请先 <Link to="/auth" className="text-gold underline">登录</Link></p>}
              {user && myList.length === 0 && <p className="text-xs text-muted-foreground">尚无 Notebook</p>}
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

          {/* Cells */}
          <ol className="space-y-3">
            {cells.map((c, idx) => (
              <li key={c.id} className="group border border-border/60 bg-card/30 hover:border-gold/40 transition-colors">
                <div className="flex items-center justify-between border-b border-accent/20 px-3 py-1.5 bg-background/60">
                  <span className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-gold/80">
                    {c.kind === "markdown" && <FileText className="w-3 h-3" />}
                    {c.kind === "param"    && <SlidersHorizontal className="w-3 h-3" />}
                    {c.kind === "formula"  && <Sigma className="w-3 h-3" />}
                    {c.kind === "chart"    && <BarChart3 className="w-3 h-3" />}
                    [{idx + 1}] {c.kind}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconBtn onClick={() => move(c.id, -1)} title="上移"><ArrowUp className="w-3 h-3" /></IconBtn>
                    <IconBtn onClick={() => move(c.id, 1)}  title="下移"><ArrowDown className="w-3 h-3" /></IconBtn>
                    <IconBtn onClick={() => remove(c.id)}   title="删除"><Trash2 className="w-3 h-3 text-rose-400" /></IconBtn>
                  </div>
                </div>
                <div className="p-4">
                  <CellBody cell={c} p={p} update={update} />
                </div>
              </li>
            ))}
          </ol>

          {/* Add cell */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-accent/30 pt-4">
            {(["markdown","param","formula","chart"] as const).map((k) => (
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

/* ─── Cell body renderers ─────────────────────────────────── */
const CellBody = ({ cell, p, update }: { cell: Cell; p: Record<string,number>; update: (id: string, patch: Partial<Cell>) => void }) => {
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
    const value = evalSafe(cell.expression, p);
    return (
      <div className="space-y-2">
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
        <div className="text-right text-sm font-mono text-gold tabular-nums">
          = {isFinite(value) ? value.toFixed(6) : "NaN"}
        </div>
      </div>
    );
  }
  // chart
  const data: { x: number; y: number }[] = [];
  const step = (cell.xMax - cell.xMin) / Math.max(cell.n - 1, 1);
  for (let i = 0; i < cell.n; i++) {
    const x = cell.xMin + i * step;
    data.push({ x, y: evalSafe(cell.expression, p, x) });
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