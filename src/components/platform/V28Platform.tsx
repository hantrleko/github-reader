import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Cell,
} from "recharts";
import {
  NotebookPen, Database, GitCompareArrows, Printer, Plus, Trash2,
  ArrowUp, ArrowDown, Download, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { useFredSeries, useMarketQuotes } from "@/lib/marketData";
import { toast } from "@/hooks/use-toast";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ───────── PRNG ───────── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ═══════════════════════════════════════════════
 * TAB 1 — Notebook 模式
 * ═══════════════════════════════════════════════ */
type CellKind = "markdown" | "formula" | "table" | "code";
type Cell = {
  id: string;
  kind: CellKind;
  title: string;
  content: string;
};

const getDEFAULT_CELLS = (t: TFunction): Cell[] => ([
  {
    id: "c1",
    kind: "markdown",
    title: t("labs.platform.v28.text001", { defaultValue: "研究背景" }),
    content:
      t("labs.platform.v28.text002", { defaultValue: "本笔记本汇总最低工资政策对失业率影响的实证研究。我们使用 2010-2024 年州级面板数据,结合 DID 与 IV 两套识别策略,并对比 OLS 朴素回归。" }),
  },
  {
    id: "c2",
    kind: "formula",
    title: t("labs.platform.v28.text003", { defaultValue: "识别假设" }),
    content: "Y_{it} = \\alpha_i + \\lambda_t + \\tau \\cdot D_{it} + X_{it}'\\beta + \\varepsilon_{it}",
  },
  {
    id: "c3",
    kind: "table",
    title: t("labs.platform.v28.text004", { defaultValue: "主要估计结果" }),
    content:
      t("labs.platform.v28.text005", { defaultValue: "模型 | τ 估计 | SE | p\nOLS | 0.482 | 0.041 | < 0.001\nIV-2SLS | 0.213 | 0.089 | 0.017\nTWFE-DID | 0.176 | 0.074 | 0.018\nCallaway-SantAnna | 0.158 | 0.082 | 0.054" }),
  },
  {
    id: "c4",
    kind: "markdown",
    title: t("labs.platform.v28.text006", { defaultValue: "结论" }),
    content:
      t("labs.platform.v28.text007", { defaultValue: "去除选择性偏差与平行趋势违背后,真实效应规模约为 OLS 估计的 1/3。建议政策评估优先采用现代 DID 估计量。" }),
  },
]);

const NotebookTab = () => {
  const { t } = useTranslation();
  const DEFAULT_CELLS = getDEFAULT_CELLS(t);
  const [cells, setCells] = useState<Cell[]>(DEFAULT_CELLS);
  const [title, setTitle] = useState(t("labs.platform.v28.text008", { defaultValue: "最低工资 → 失业 · 政策评估笔记" }));
  const [author, setAuthor] = useState("EF LAB");

  const addCell = (kind: CellKind) => {
    const id = `c${Date.now()}`;
    const template: Record<CellKind, Cell> = {
      markdown: { id, kind, title: t("labs.platform.v28.text009", { defaultValue: "新文本块" }), content: t("labs.platform.v28.text010", { defaultValue: "在此输入说明…" }) },
      formula:  { id, kind, title: t("labs.platform.v28.text011", { defaultValue: "新公式" }), content: "y = \\beta_0 + \\beta_1 x + \\varepsilon" },
      table:    { id, kind, title: t("labs.platform.v28.text012", { defaultValue: "新表格" }), content: t("labs.platform.v28.text013", { defaultValue: "列A | 列B\n1 | 2\n3 | 4" }) },
      code:     { id, kind, title: t("labs.platform.v28.text014", { defaultValue: "新代码" }), content: "import statsmodels.api as sm\nmodel = sm.OLS(y, X).fit()" },
    };
    setCells((cs) => [...cs, template[kind]]);
  };
  const move = (i: number, dir: -1 | 1) => {
    setCells((cs) => {
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const remove = (i: number) => setCells((cs) => cs.filter((_, k) => k !== i));
  const update = (i: number, patch: Partial<Cell>) =>
    setCells((cs) => cs.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const exportPDF = useCallback(() => {
    // Generate a standalone print window with embedded styles.
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) {
      toast({ title: t("labs.platform.v28.text015", { defaultValue: "导出失败" }), description: t("labs.platform.v28.text016", { defaultValue: "请允许弹出窗口后重试" }), variant: "destructive" });
      return;
    }
    const renderCell = (c: Cell) => {
      if (c.kind === "table") {
        const rows = c.content.split("\n").filter((r) => r.trim());
        if (!rows.length) return "";
        const cells = rows.map((r) => r.split("|").map((s) => s.trim()));
        const head = cells[0]
          .map((h) => `<th style="border:1px solid #999;padding:6px 10px;background:#f5f1e6;text-align:left">${h}</th>`)
          .join("");
        const body = cells.slice(1)
          .map((r) => `<tr>${r.map((x) => `<td style="border:1px solid #ccc;padding:6px 10px">${x}</td>`).join("")}</tr>`)
          .join("");
        return `<table style="border-collapse:collapse;margin:8px 0;font-size:13px">${`<thead><tr>${head}</tr></thead>`}<tbody>${body}</tbody></table>`;
      }
      if (c.kind === "code") {
        return `<pre style="background:#1a1a1a;color:#d4af37;padding:12px;border-radius:6px;font-size:12px;overflow:auto">${c.content.replace(/</g, "&lt;")}</pre>`;
      }
      if (c.kind === "formula") {
        return `<div style="font-family:'Times New Roman',serif;font-style:italic;padding:10px 16px;border-left:3px solid #c9a84c;background:#fdfaf0;margin:8px 0">$$ ${c.content} $$</div>`;
      }
      return `<p style="line-height:1.7;color:#222">${c.content.replace(/\n/g, "<br/>")}</p>`;
    };
    const body = cells.map((c) => `
      <section style="margin:18px 0;break-inside:avoid">
        <h3 style="font-family:'Playfair Display',serif;color:#1a1a1a;border-bottom:1px solid #c9a84c;padding-bottom:4px;margin:0 0 8px">${c.title}</h3>
        ${renderCell(c)}
      </section>
    `).join("");
    w.document.write(`
      <!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page { margin: 18mm 16mm; }
        body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color:#1a1a1a; max-width: 780px; margin: 0 auto; padding: 12px; }
        h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; margin: 0; }
        .meta { color:#666; font-size: 12px; margin: 4px 0 18px; border-bottom: 2px solid #c9a84c; padding-bottom: 10px; }
      </style>
      </head><body>
      <h1>${title}</h1>
      <div class="meta">${author} · ${new Date().toLocaleString("zh-CN")} · EF LAB Notebook</div>
      ${body}
      <script>setTimeout(()=>{window.print();}, 250);</script>
      </body></html>
    `);
    w.document.close();
  }, [cells, title, author, t]);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm font-display"
          placeholder={t("labs.platform.v28.text017", { defaultValue: "报告标题" })}
        />
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm font-mono"
          placeholder={t("labs.platform.v28.text018", { defaultValue: "作者" })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["markdown", "formula", "table", "code"] as CellKind[]).map((k) => (
          <button
            key={k}
            onClick={() => addCell(k)}
            className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-md border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors"
          >
            <Plus className="w-3 h-3" /> {k}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={exportPDF}
          className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-md bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />{t("labs.platform.v28.text019", { defaultValue: "导出 PDF" })}
        </button>
      </div>

      <div className="space-y-3">
        {cells.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border rounded-lg bg-card/50 p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gold/80 px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                {c.kind}
              </span>
              <input
                value={c.title}
                onChange={(e) => update(i, { title: e.target.value })}
                className="flex-1 bg-transparent text-sm font-display font-medium focus:outline-none focus:ring-1 focus:ring-gold/40 rounded px-1"
              />
              <button onClick={() => move(i, -1)} className="p-1 text-muted-foreground hover:text-gold" title={t("labs.platform.v28.text020", { defaultValue: "上移" })}><ArrowUp className="w-3.5 h-3.5" /></button>
              <button onClick={() => move(i, 1)} className="p-1 text-muted-foreground hover:text-gold" title={t("labs.platform.v28.text021", { defaultValue: "下移" })}><ArrowDown className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(i)} className="p-1 text-muted-foreground hover:text-destructive" title={t("labs.platform.v28.text022", { defaultValue: "删除" })}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <textarea
              value={c.content}
              onChange={(e) => update(i, { content: e.target.value })}
              rows={c.kind === "markdown" ? 3 : 4}
              className={`w-full bg-background/60 border border-border/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gold/40 ${
                c.kind === "code" ? "font-mono text-xs" : c.kind === "formula" ? "font-mono text-xs" : ""
              }`}
            />
            {c.kind === "formula" && (
              <div className="mt-2 px-3 py-2 bg-background/40 rounded border border-border/40 text-center overflow-x-auto">
                <BlockMath math={c.content} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
 * TAB 2 — 真实数据基准库
 * ═══════════════════════════════════════════════ */
const getFRED_CATALOG = (t: TFunction) => ([
  { id: "GDPC1", label: t("labs.platform.v28.text023", { defaultValue: "美国实际 GDP (季度链式)" }), cat: t("labs.platform.v28.text024", { defaultValue: "宏观" }) },
  { id: "CPIAUCSL", label: t("labs.platform.v28.text025", { defaultValue: "美国 CPI" }), cat: t("labs.platform.v28.text024", { defaultValue: "宏观" }) },
  { id: "UNRATE", label: t("labs.platform.v28.text026", { defaultValue: "美国失业率" }), cat: t("labs.platform.v28.text024", { defaultValue: "宏观" }) },
  { id: "DGS10", label: t("labs.platform.v28.text027", { defaultValue: "10Y 美债收益率" }), cat: t("labs.platform.v28.text028", { defaultValue: "利率" }) },
  { id: "DGS2", label: t("labs.platform.v28.text029", { defaultValue: "2Y 美债收益率" }), cat: t("labs.platform.v28.text028", { defaultValue: "利率" }) },
  { id: "T10Y2Y", label: t("labs.platform.v28.text030", { defaultValue: "10Y-2Y 期限利差" }), cat: t("labs.platform.v28.text028", { defaultValue: "利率" }) },
  { id: "FEDFUNDS", label: t("labs.platform.v28.text031", { defaultValue: "联邦基金利率" }), cat: t("labs.platform.v28.text028", { defaultValue: "利率" }) },
  { id: "DEXUSEU", label: t("labs.platform.v28.text032", { defaultValue: "USD/EUR 汇率" }), cat: t("labs.platform.v28.text033", { defaultValue: "外汇" }) },
  { id: "VIXCLS", label: t("labs.platform.v28.text034", { defaultValue: "VIX 恐慌指数" }), cat: t("labs.platform.v28.text035", { defaultValue: "波动率" }) },
]);

const getYAHOO_CATALOG = (t: TFunction) => ([
  { id: "SPY", label: t("labs.platform.v28.text036", { defaultValue: "标普 500 ETF" }), cat: t("labs.platform.v28.text037", { defaultValue: "股票" }) },
  { id: "QQQ", label: t("labs.platform.v28.text038", { defaultValue: "纳斯达克 100 ETF" }), cat: t("labs.platform.v28.text037", { defaultValue: "股票" }) },
  { id: "AAPL", label: "Apple Inc", cat: t("labs.platform.v28.text039", { defaultValue: "个股" }) },
  { id: "MSFT", label: "Microsoft", cat: t("labs.platform.v28.text039", { defaultValue: "个股" }) },
  { id: "NVDA", label: "NVIDIA", cat: t("labs.platform.v28.text039", { defaultValue: "个股" }) },
  { id: "TLT", label: t("labs.platform.v28.text040", { defaultValue: "20+ 年期美债 ETF" }), cat: t("labs.platform.v28.text041", { defaultValue: "债券" }) },
  { id: "GLD", label: t("labs.platform.v28.text042", { defaultValue: "黄金 ETF" }), cat: t("labs.platform.v28.text043", { defaultValue: "商品" }) },
  { id: "BTC-USD", label: t("labs.platform.v28.text044", { defaultValue: "比特币" }), cat: t("labs.platform.v28.text045", { defaultValue: "数字资产" }) },
]);

const FredCard = ({ id, label }: { id: string; label: string }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const { data, isFetching, error } = useFredSeries(id, "2015-01-01", active);
  const chart = useMemo(() => {
    if (!data) return [];
    return data.dates.map((d, i) => ({ t: d, v: data.values[i] })).slice(-180);
  }, [data]);
  return (
    <div className="border border-border rounded-lg bg-card/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-display">{label}</div>
          <div className="text-[10px] font-mono text-muted-foreground">FRED · {id}</div>
        </div>
        <button
          onClick={() => setActive(true)}
          disabled={isFetching}
          className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded border border-gold/30 text-gold hover:bg-gold/10 disabled:opacity-50"
        >
          {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : data ? <RefreshCw className="w-3 h-3" /> : <Download className="w-3 h-3" />}
          {data ? t("labs.platform.v28.text046", { defaultValue: "已加载" }) : t("labs.platform.v28.text047", { defaultValue: "拉取" })}
        </button>
      </div>
      {error && <div className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t("labs.platform.v28.text048", { defaultValue: "加载失败" })}</div>}
      {data && (
        <>
          <div className="flex gap-3 text-[11px] font-mono text-muted-foreground">
            <span>n = <span className="text-foreground">{data.n}</span></span>
            <span>latest = <span className="text-gold">{data.latest?.toFixed(2) ?? "—"}</span></span>
            <span className="truncate">@ {data.latestDate ?? "—"}</span>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <LineChart data={chart} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
              <Line type="monotone" dataKey="v" stroke={CHART_GOLD} strokeWidth={1.4} dot={false} />
              <XAxis dataKey="t" hide />
              <YAxis hide domain={["auto", "auto"]} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

const YahooCard = ({ id, label }: { id: string; label: string }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const { data, isFetching, error } = useMarketQuotes(id, "2y", active);
  const chart = useMemo(() => {
    if (!data) return [];
    return data.dates.map((d, i) => ({ t: d, v: data.closes[i] })).slice(-180);
  }, [data]);
  return (
    <div className="border border-border rounded-lg bg-card/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-display">{label}</div>
          <div className="text-[10px] font-mono text-muted-foreground">Yahoo · {id}</div>
        </div>
        <button
          onClick={() => setActive(true)}
          disabled={isFetching}
          className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded border border-gold/30 text-gold hover:bg-gold/10 disabled:opacity-50"
        >
          {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : data ? <RefreshCw className="w-3 h-3" /> : <Download className="w-3 h-3" />}
          {data ? t("labs.platform.v28.text046", { defaultValue: "已加载" }) : t("labs.platform.v28.text047", { defaultValue: "拉取" })}
        </button>
      </div>
      {error && <div className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t("labs.platform.v28.text048", { defaultValue: "加载失败" })}</div>}
      {data && (
        <>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-mono text-muted-foreground">
            <span>close = <span className="text-gold">{data.lastPrice?.toFixed(2) ?? "—"}</span></span>
            <span>σ̂ = <span className="text-foreground">{(data.annualVol * 100).toFixed(1)}%</span></span>
            <span>μ̂ = <span className="text-foreground">{(data.annualReturn * 100).toFixed(1)}%</span></span>
            <span>n = {data.n}</span>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <LineChart data={chart} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
              <Line type="monotone" dataKey="v" stroke={CHART_TEAL} strokeWidth={1.4} dot={false} />
              <XAxis dataKey="t" hide />
              <YAxis hide domain={["auto", "auto"]} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

const DataLibraryTab = () => {
  const { t } = useTranslation();
  const FRED_CATALOG = getFRED_CATALOG(t);
  const YAHOO_CATALOG = getYAHOO_CATALOG(t);
  const [tab, setTab] = useState<"fred" | "yahoo">("fred");
  const list = tab === "fred" ? FRED_CATALOG : YAHOO_CATALOG;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["fred", "yahoo"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`text-xs font-mono px-3 py-1.5 rounded-md border transition-colors ${
              tab === item ? "bg-gold/10 border-gold/40 text-gold" : "bg-card border-border hover:border-gold/40"
            }`}
          >
            {item.toUpperCase()} {item === "fred" ? t("labs.platform.v28.text049", { defaultValue: "宏观/利率" }) : t("labs.platform.v28.text050", { defaultValue: "股票/商品" })}
          </button>
        ))}
        <div className="flex-1" />
        <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-gold" />{t("labs.platform.v28.text051", { defaultValue: "点击「拉取」即可加载,数据可一键发送到任意计量/期权工具" })}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((s) =>
          tab === "fred"
            ? <FredCard key={s.id} id={s.id} label={s.label} />
            : <YahooCard key={s.id} id={s.id} label={s.label} />
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
 * TAB 3 — 跨工具对比仪表盘
 * ═══════════════════════════════════════════════ */
/** Multi-variable OLS for Y = X β + ε via normal equations (gaussian elimination). */
function olsMulti(X: number[][], y: number[]): { beta: number[]; se: number[]; r2: number } {
  const n = X.length, k = X[0].length;
  // X'X and X'y
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  // Invert XtX via Gauss-Jordan
  const M: number[][] = XtX.map((row, i) => [...row, ...Array(k).fill(0).map((_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < k; i++) {
    let piv = M[i][i];
    if (Math.abs(piv) < 1e-12) {
      // find swap
      for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > 1e-12) { [M[i], M[r]] = [M[r], M[i]]; piv = M[i][i]; break; }
    }
    if (Math.abs(piv) < 1e-12) piv = 1e-12;
    for (let j = 0; j < 2 * k; j++) M[i][j] /= piv;
    for (let r = 0; r < k; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let j = 0; j < 2 * k; j++) M[r][j] -= f * M[i][j];
    }
  }
  const inv = M.map((row) => row.slice(k));
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  // residuals & SE
  let ssr = 0, sst = 0;
  const my = y.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i++) {
    const yhat = beta.reduce((s, b, j) => s + b * X[i][j], 0);
    ssr += (y[i] - yhat) ** 2;
    sst += (y[i] - my) ** 2;
  }
  const sigma2 = ssr / Math.max(n - k, 1);
  const se = inv.map((row, i) => Math.sqrt(Math.max(sigma2 * row[i], 0)));
  const r2 = 1 - ssr / Math.max(sst, 1e-12);
  return { beta, se, r2 };
}

function generateDataset(seed: number, n: number, trueTau: number, endogeneity: number) {
  const rng = mulberry32(seed);
  // Panel: 40 units × T periods, treatment at T/2 for half the units
  const units = 40;
  const T = Math.max(2, Math.floor(n / units));
  type Row = {
    i: number; t: number; Y: number; D: number; Z: number; X: number;
    treated: boolean; post: number; alpha: number;
  };
  const rows: Row[] = [];
  for (let i = 0; i < units; i++) {
    const alpha = randn(rng) * 0.6 + (i < units / 2 ? -0.2 : 0.2);
    const treated = i < units / 2;
    for (let t = 0; t < T; t++) {
      const lambda_t = 0.05 * t;
      const post = t >= Math.floor(T / 2) ? 1 : 0;
      // Instrument Z (exogenous), confounder U
      const Z = randn(rng);
      const U = randn(rng);
      const X = 0.5 * Z + 0.3 * U + randn(rng) * 0.5; // endogenous regressor base
      const D_did = treated && post ? 1 : 0;
      // Continuous D for OLS/IV: depends on Z (instrument) + U (endogeneity source)
      const D = 0.7 * Z + endogeneity * U + 0.4 * D_did + randn(rng) * 0.3;
      const Y = alpha + lambda_t + trueTau * D + 0.3 * X + 0.8 * U + randn(rng) * 0.5;
      rows.push({ i, t, Y, D, Z, X, treated, post, alpha });
    }
  }
  return rows;
}

const CrossToolDashboard = () => {
  const { t } = useTranslation();
  const [seed, setSeed] = useState(7);
  const [n, setN] = useState(800);
  const [tau, setTau] = useState(0.5);
  const [endog, setEndog] = useState(0.8);

  const result = useMemo(() => {
    const rows = generateDataset(seed, n, tau, endog);
    const N = rows.length;
    const y = rows.map((r) => r.Y);
    // 1) Naive OLS:  Y = β0 + β1·D + β2·X
    const Xols = rows.map((r) => [1, r.D, r.X]);
    const ols_ = olsMulti(Xols, y);
    // 2) IV-2SLS:  first stage  D = π0 + π1·Z + π2·X  → D̂  ;  second stage  Y = β0 + β1·D̂ + β2·X
    const Zmat = rows.map((r) => [1, r.Z, r.X]);
    const Dvec = rows.map((r) => r.D);
    const fs = olsMulti(Zmat, Dvec);
    const Dhat = rows.map((_, i) => Zmat[i].reduce((s, v, j) => s + v * fs.beta[j], 0));
    const Xiv = rows.map((r, i) => [1, Dhat[i], r.X]);
    const iv_ = olsMulti(Xiv, y);
    // 3) DID (TWFE):  Y = α_i + λ_t + τ · (treated × post) + X (we encode FE with dummies for unit & time)
    const units = [...new Set(rows.map((r) => r.i))].sort((a, b) => a - b);
    const times = [...new Set(rows.map((r) => r.t))].sort((a, b) => a - b);
    // Drop one unit and one time to avoid collinearity with intercept
    const uDrop = units[0], tDrop = times[0];
    const Xdid: number[][] = rows.map((r) => {
      const row: number[] = [1]; // intercept
      // unit dummies
      for (const u of units) if (u !== uDrop) row.push(r.i === u ? 1 : 0);
      // time dummies
      for (const tt of times) if (tt !== tDrop) row.push(r.t === tt ? 1 : 0);
      // treatment indicator (treated*post)
      row.push(r.treated && r.post ? 1 : 0);
      // covariate
      row.push(r.X);
      return row;
    });
    const did_ = olsMulti(Xdid, y);
    const tauIdxDid = did_.beta.length - 2;
    // 4) FE-only (no DID) — just unit FE
    const Xfe: number[][] = rows.map((r) => {
      const row: number[] = [1];
      for (const u of units) if (u !== uDrop) row.push(r.i === u ? 1 : 0);
      row.push(r.D);
      row.push(r.X);
      return row;
    });
    const fe_ = olsMulti(Xfe, y);
    const tauIdxFe = fe_.beta.length - 2;

    return {
      N,
      truth: tau,
      models: [
        { name: "OLS",      tau: ols_.beta[1], se: ols_.se[1], r2: ols_.r2, note: t("labs.platform.v28.text052", { defaultValue: "未处理内生性" }) },
        { name: "IV-2SLS",  tau: iv_.beta[1],  se: iv_.se[1],  r2: iv_.r2,  note: t("labs.platform.v28.text053", { defaultValue: "Z 为工具变量" }) },
        { name: "FE",       tau: fe_.beta[tauIdxFe],  se: fe_.se[tauIdxFe],  r2: fe_.r2,  note: t("labs.platform.v28.text054", { defaultValue: "单位固定效应" }) },
        { name: "TWFE-DID", tau: did_.beta[tauIdxDid], se: did_.se[tauIdxDid], r2: did_.r2, note: t("labs.platform.v28.text055", { defaultValue: "单位 × 时间双向 FE" }) },
      ],
    };
  }, [seed, n, tau, endog, t]);

  const forest = result.models.map((m) => ({
    name: m.name,
    tau: m.tau,
    lo: m.tau - 1.96 * m.se,
    hi: m.tau + 1.96 * m.se,
    bias: m.tau - tau,
  }));

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3 text-xs font-mono">
        <label className="space-y-1">
          <span className="text-muted-foreground">{t("labs.platform.v28.text056", { defaultValue: "真实 τ" })}</span>
          <input type="range" min={-1} max={2} step={0.1} value={tau} onChange={(e) => setTau(+e.target.value)} className="w-full accent-gold" />
          <span className="text-gold">{tau.toFixed(2)}</span>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">{t("labs.platform.v28.text057", { defaultValue: "内生性强度 ρ(D,U)" })}</span>
          <input type="range" min={0} max={2} step={0.1} value={endog} onChange={(e) => setEndog(+e.target.value)} className="w-full accent-gold" />
          <span className="text-gold">{endog.toFixed(2)}</span>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">{t("labs.platform.v28.text058", { defaultValue: "样本量 ≈" })}</span>
          <input type="range" min={200} max={2000} step={100} value={n} onChange={(e) => setN(+e.target.value)} className="w-full accent-gold" />
          <span className="text-gold">N = {result.N}</span>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">{t("labs.platform.v28.text059", { defaultValue: "随机种子" })}</span>
          <input type="range" min={1} max={50} step={1} value={seed} onChange={(e) => setSeed(+e.target.value)} className="w-full accent-gold" />
          <span className="text-gold">{seed}</span>
        </label>
      </div>

      <div className="text-[11px] font-mono text-muted-foreground bg-card/40 border border-border/60 rounded p-2">
        DGP:  <InlineMath math="Y_{it} = \alpha_i + \lambda_t + \tau D_{it} + 0.3 X_{it} + 0.8 U_{it} + \varepsilon_{it}" />{t("labs.platform.v28.text060", { defaultValue: ",\n        其中" })} <InlineMath math="D = 0.7Z + \rho U + 0.4(\text{treated} \times \text{post}) + \eta" />{t("labs.platform.v28.text061", { defaultValue: ",U 同时影响 D 与 Y(内生性)。\n        同一份数据并行估计四种模型,观察哪类识别策略最接近" })} <span className="text-gold">τ = {tau.toFixed(2)}</span>。
      </div>

      {/* Coefficient table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left py-2">{t("labs.platform.v28.text062", { defaultValue: "模型" })}</th>
              <th className="text-right py-2">τ̂</th>
              <th className="text-right py-2">SE</th>
              <th className="text-right py-2">95% CI</th>
              <th className="text-right py-2">{t("labs.platform.v28.text063", { defaultValue: "偏差" })}</th>
              <th className="text-right py-2">R²</th>
              <th className="text-left py-2 pl-4">{t("labs.platform.v28.text064", { defaultValue: "说明" })}</th>
            </tr>
          </thead>
          <tbody>
            {result.models.map((m) => {
              const bias = m.tau - tau;
              const lo = m.tau - 1.96 * m.se;
              const hi = m.tau + 1.96 * m.se;
              return (
                <tr key={m.name} className="border-b border-border/40">
                  <td className="py-2 font-display text-foreground">{m.name}</td>
                  <td className="text-right text-gold">{m.tau.toFixed(3)}</td>
                  <td className="text-right text-muted-foreground">{m.se.toFixed(3)}</td>
                  <td className="text-right text-muted-foreground">[{lo.toFixed(2)}, {hi.toFixed(2)}]</td>
                  <td className={`text-right ${Math.abs(bias) < 0.1 ? "text-emerald-500" : Math.abs(bias) < 0.25 ? "text-amber-500" : "text-destructive"}`}>
                    {bias >= 0 ? "+" : ""}{bias.toFixed(3)}
                  </td>
                  <td className="text-right text-muted-foreground">{(m.r2 * 100).toFixed(1)}%</td>
                  <td className="pl-4 text-xs text-muted-foreground">{m.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Forest plot */}
      <div className="border border-border/60 rounded-lg bg-card/40 p-3">
        <div className="text-xs font-mono text-muted-foreground mb-2">{t("labs.platform.v28.text065", { defaultValue: "Forest Plot · τ̂ ± 1.96·SE  ·  红线 = 真实 τ" })}</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={forest} layout="vertical" margin={{ left: 30, right: 30 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis type="number" stroke={CHART_TEXT} domain={["auto", "auto"]} />
            <YAxis type="category" dataKey="name" stroke={CHART_TEXT} width={80} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
              formatter={(v: number, k: string) => [v.toFixed(3), k]}
            />
            <ReferenceLine x={tau} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: t("labs.platform.v28.text056", { defaultValue: "真实 τ" }), fill: CHART_RED, fontSize: 10 }} />
            <Bar dataKey="tau" fill={CHART_GOLD}>
              {forest.map((f, i) => (
                <Cell key={i} fill={Math.abs(f.bias) < 0.1 ? CHART_TEAL : Math.abs(f.bias) < 0.25 ? CHART_GOLD : CHART_RED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
 * Main wrapper
 * ═══════════════════════════════════════════════ */
type Tab = "notebook" | "data" | "compare";

const getTABS = (t: TFunction): { id: Tab; label: string; icon: typeof NotebookPen; desc: string }[] => ([
  { id: "notebook", label: t("labs.platform.v28.text066", { defaultValue: "Notebook 模式" }),       icon: NotebookPen,     desc: t("labs.platform.v28.text067", { defaultValue: "自由组合文本 / 公式 / 表格 / 代码,一键导出 PDF 研究报告" }) },
  { id: "data",     label: t("labs.platform.v28.text068", { defaultValue: "真实数据基准库" }),       icon: Database,        desc: t("labs.platform.v28.text069", { defaultValue: "FRED 宏观利率 + Yahoo 股票商品,内置 17 个常用序列一键拉取" }) },
  { id: "compare",  label: t("labs.platform.v28.text070", { defaultValue: "跨工具对比仪表盘" }),     icon: GitCompareArrows, desc: t("labs.platform.v28.text071", { defaultValue: "同一份合成数据并行跑 OLS / IV / FE / DID,森林图直观看偏差" }) },
]);

const V28Platform = () => {
  const { t } = useTranslation();
  const TABS = getTABS(t);
  const [tab, setTab] = useState<Tab>("notebook");
  const active = TABS.find((x) => x.id === tab)!;

  return (
    <section className="py-16 px-6">
      <div className="container max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold">V2.8 · Platform</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-2">{t("labs.platform.v28.text072", { defaultValue: "平台与体验增强" })}
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl mb-6">{t("labs.platform.v28.text073", { defaultValue: "36 个模型工具之上的横向能力层:把零散的计算固化为可分享的报告、把课件公式接入真实市场、把识别策略并排压力测试。" })}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {TABS.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-md border transition-colors ${
                    isActive ? "bg-gold/10 border-gold/40 text-gold" : "bg-card border-border hover:border-gold/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground mb-4 border-l-2 border-gold/40 pl-3">{active.desc}</div>

          <div className="border border-border rounded-xl bg-card/30 p-4 md:p-5">
            {tab === "notebook" && <NotebookTab />}
            {tab === "data" && <DataLibraryTab />}
            {tab === "compare" && <CrossToolDashboard />}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default V28Platform;