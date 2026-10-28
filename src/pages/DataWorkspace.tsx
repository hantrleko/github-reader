import { useTranslation } from "react-i18next";
/**
 * /data — Data Workspace: cross-tool dataset store.
 * Upload CSVs, pull live series (FRED / market quotes), preview with
 * transforms, and reuse the same data in any tool or the Notebook.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SectionHeader from "@/components/common/SectionHeader";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Upload, Trash2, Database, RefreshCcw, Download, ClipboardCopy, HardDrive,
} from "lucide-react";
import {
  type Dataset, type TransformId, TRANSFORMS,
  listDatasets, saveDataset, deleteDataset, onDatasetsChange,
  parseCsv, applyTransform, seriesStats,
} from "@/lib/dataWorkspace";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = "https://oshfqmmhxaaevucfdunk.supabase.co/functions/v1";

const DataWorkspace = () => {
  const { t } = useTranslation();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selected, setSelected] = useState<Dataset | null>(null);
  const [column, setColumn] = useState<string>("");
  const [transform, setTransform] = useState<TransformId>("none");
  const [fredId, setFredId] = useState("CPIAUCSL");
  const [symbol, setSymbol] = useState("SPY");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const list = await listDatasets();
    setDatasets(list);
  }, []);

  useEffect(() => {
    refresh();
    return onDatasetsChange(refresh);
  }, [refresh]);

  /* ── CSV upload ── */
  const onUpload = async (f: File) => {
    try {
      const parsed = parseCsv(await f.text());
      const firstCol = Object.keys(parsed.columns)[0];
      const d = await saveDataset({
        name: f.name.replace(/\.csv$/i, ""),
        source: "csv",
        dates: parsed.dates,
        values: parsed.columns[firstCol],
        columns: parsed.columns,
      });
      setSelected(d);
      setColumn(firstCol);
      toast({ title: t("pages.dataWorkspace.copy1", { defaultValue: "已导入 {{value1}}", value1: f.name }), description: t("pages.dataWorkspace.copy2", { defaultValue: "{{value1}} 行 · {{value2}} 个数值列", value1: parsed.dates.length, value2: Object.keys(parsed.columns).length }) });
    } catch (e) {
      toast({ title: t("pages.dataWorkspace.copy3", { defaultValue: "CSV 解析失败" }), description: String((e as Error)?.message || e), variant: "destructive" });
    }
  };

  /* ── live fetchers ── */
  const fetchFred = async () => {
    setBusy(true);
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/fred-series?series_id=${encodeURIComponent(fredId)}`, {
        headers: { apikey: (supabase as any).supabaseKey ?? "" },
      });
      if (!resp.ok) throw new Error(`FRED ${resp.status}`);
      const data = await resp.json();
      if (!data?.dates?.length) throw new Error(t("pages.dataWorkspace.copy4", { defaultValue: "空序列" }));
      const d = await saveDataset({
        name: `FRED · ${data.series_id || fredId}`,
        source: "fred",
        dates: data.dates,
        values: data.values,
        meta: { series_id: fredId },
      });
      setSelected(d);
      setColumn("");
      toast({ title: t("pages.dataWorkspace.copy5", { defaultValue: "已保存 {{value1}}", value1: d.name }), description: t("pages.dataWorkspace.copy6", { defaultValue: "{{value1}} 个观测", value1: d.dates.length }) });
    } catch (e) {
      toast({ title: t("pages.dataWorkspace.copy7", { defaultValue: "FRED 拉取失败" }), description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const fetchQuotes = async () => {
    setBusy(true);
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/market-quotes?symbol=${encodeURIComponent(symbol)}`, {
        headers: { apikey: (supabase as any).supabaseKey ?? "" },
      });
      if (!resp.ok) throw new Error(`quotes ${resp.status}`);
      const data = await resp.json();
      if (!data?.dates?.length) throw new Error(t("pages.dataWorkspace.copy4", { defaultValue: "空序列" }));
      const d = await saveDataset({
        name: `${data.symbol || symbol} · close`,
        source: "market",
        dates: data.dates,
        values: data.closes,
        meta: { symbol, currency: data.currency },
      });
      setSelected(d);
      setColumn("");
      toast({ title: t("pages.dataWorkspace.copy5", { defaultValue: "已保存 {{value1}}", value1: d.name }), description: t("pages.dataWorkspace.copy8", { defaultValue: "{{value1}} 个交易日", value1: d.dates.length }) });
    } catch (e) {
      toast({ title: t("pages.dataWorkspace.copy9", { defaultValue: "行情拉取失败" }), description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ── preview data ── */
  const rawValues = useMemo(() => {
    if (!selected) return [];
    if (column && selected.columns?.[column]) return selected.columns[column];
    return selected.values;
  }, [selected, column]);

  const shown = useMemo(() => applyTransform(rawValues, transform), [rawValues, transform]);
  const stats = useMemo(() => seriesStats(shown), [shown]);
  const chartData = useMemo(() => {
    const offset = rawValues.length - shown.length;
    return shown.map((y, i) => ({
      x: selected?.dates[i + offset] ?? String(i),
      y: isFinite(y) ? y : null,
    }));
  }, [shown, rawValues.length, selected]);

  const copyJson = async () => {
  
    if (!selected) return;
    const payload = JSON.stringify({ name: selected.name, transform, dates: selected.dates.slice(rawValues.length - shown.length), values: shown });
    try {
      await navigator.clipboard.writeText(payload);
      toast({ title: t("pages.dataWorkspace.copy10", { defaultValue: "已复制 JSON" }), description: t("pages.dataWorkspace.copy11", { defaultValue: "可直接粘贴进 Notebook JS/Python 单元" }) });
    } catch {
      toast({ title: t("pages.dataWorkspace.copy12", { defaultValue: "复制失败" }), variant: "destructive" });
    }
  };

  const downloadCsv = () => {
    if (!selected) return;
    const offset = rawValues.length - shown.length;
    const lines = ["date,value", ...shown.map((v, i) => `${selected.dates[i + offset] ?? i},${v}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${selected.name}-${transform}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Data Workspace · EF LAB"
        description={t("pages.dataWorkspace.copy13", { defaultValue: "跨工具数据工作区:上传 CSV、缓存 FRED/行情序列到本地 IndexedDB,做收益率/差分/标准化变换,在任意工具与 Notebook 中复用。" })}
        path="/data"
      />
      <Navbar />
      <main id="main-content" className="pt-14">
        <SectionHeader
          chapter="Data"
          kicker="DATA WORKSPACE"
          title={t("pages.dataWorkspace.copy14", { defaultValue: "数据工作区" })}
          subtitle={t("pages.dataWorkspace.copy15", { defaultValue: "上传 CSV 或缓存在线序列到本地 (IndexedDB · 离线可用),配置变换管道,跨工具复用同一份数据。" })}
        />

        <section className="container max-w-6xl px-6 pb-16 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left: sources + list */}
          <div className="space-y-4">
            {/* Upload */}
            <div className="border border-border/60 bg-card/40 p-4 space-y-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gold">{t("pages.dataWorkspace.copy16", { defaultValue: "导入数据" })}</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gold/40 text-gold text-xs font-mono hover:bg-gold/10"
              >
                <Upload className="w-3.5 h-3.5" /> {t("pages.dataWorkspace.copy17", { defaultValue: "上传 CSV(首列日期,其余数值列)" })}
              </button>
              <div className="flex gap-2">
                <input
                  value={fredId}
                  onChange={(e) => setFredId(e.target.value.toUpperCase())}
                  placeholder="FRED series id"
                  className="flex-1 min-w-0 bg-background border border-border/60 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
                />
                <button onClick={fetchFred} disabled={busy} className="px-3 py-1.5 border border-border/60 text-xs font-mono hover:border-gold/60 disabled:opacity-50">
                  FRED
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Ticker e.g. SPY"
                  className="flex-1 min-w-0 bg-background border border-border/60 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
                />
                <button onClick={fetchQuotes} disabled={busy} className="px-3 py-1.5 border border-border/60 text-xs font-mono hover:border-gold/60 disabled:opacity-50">
                  {t("pages.dataWorkspace.copy18", { defaultValue: "行情" })}
                </button>
              </div>
            </div>

            {/* Dataset list */}
            <div className="border border-border/60 bg-card/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-gold inline-flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> {t("pages.dataWorkspace.copy19", { defaultValue: "本地数据集 (" })}{datasets.length})
                </p>
                <button onClick={refresh} className="p-1 text-muted-foreground hover:text-foreground" title={t("pages.dataWorkspace.copy20", { defaultValue: "刷新" })}>
                  <RefreshCcw className="w-3 h-3" />
                </button>
              </div>
              {datasets.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("pages.dataWorkspace.copy21", { defaultValue: "还没有数据集 — 上传 CSV 或拉取一条在线序列。" })}</p>
              )}
              <ul className="divide-y divide-border/40 max-h-[360px] overflow-auto">
                {datasets.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                    <button
                      onClick={() => {
                        setSelected(d);
                        setColumn(d.columns ? Object.keys(d.columns)[0] : "");
                        setTransform("none");
                      }}
                      className={cn(
                        "flex-1 text-left text-xs",
                        selected?.id === d.id ? "text-gold" : "text-foreground hover:text-gold"
                      )}
                    >
                      <span className="block truncate">{d.name}</span>
                      <span className="block text-[10px] font-mono text-muted-foreground">
                        {d.source} · {d.dates.length} obs · {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        await deleteDataset(d.id);
                        if (selected?.id === d.id) setSelected(null);
                      }}
                      className="p-1 text-muted-foreground hover:text-rose-400"
                      title={t("pages.dataWorkspace.copy22", { defaultValue: "删除" })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: preview */}
          <div className="border border-border/60 bg-card/40 p-4 min-h-[480px]">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-24">
                <Database className="w-8 h-8" />
                <p className="text-sm">{t("pages.dataWorkspace.copy23", { defaultValue: "选择左侧的数据集进行预览与变换" })}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-lg text-foreground">{selected.name}</h3>
                  {selected.columns && Object.keys(selected.columns).length > 1 && (
                    <select
                      value={column}
                      onChange={(e) => setColumn(e.target.value)}
                      className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
                    >
                      {Object.keys(selected.columns).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={transform}
                    onChange={(e) => setTransform(e.target.value as TransformId)}
                    className="bg-background border border-border/60 px-2 py-1 text-xs font-mono focus:outline-none focus:border-gold"
                  >
                    {TRANSFORMS.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <div className="ml-auto flex gap-2">
                    <button onClick={copyJson} className="inline-flex items-center gap-1 px-2 py-1 border border-border/60 text-[10px] font-mono hover:border-gold/60" title={t("pages.dataWorkspace.copy24", { defaultValue: "复制为 JSON(可粘贴到 Notebook)" })}>
                      <ClipboardCopy className="w-3 h-3" /> JSON
                    </button>
                    <button onClick={downloadCsv} className="inline-flex items-center gap-1 px-2 py-1 border border-border/60 text-[10px] font-mono hover:border-gold/60" title={t("pages.dataWorkspace.copy25", { defaultValue: "下载变换后的 CSV" })}>
                      <Download className="w-3 h-3" /> CSV
                    </button>
                  </div>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                  {[
                    ["N", String(stats.n)],
                    ["Mean", stats.mean.toFixed(4)],
                    ["Std", stats.std.toFixed(4)],
                    ["Min", stats.min.toFixed(4)],
                    ["Max", stats.max.toFixed(4)],
                  ].map(([k, v]) => (
                    <div key={k} className="border border-border/40 bg-background/40 px-2 py-1.5">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{k}</p>
                      <p className="text-sm font-mono text-gold tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="x" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} minTickGap={48} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                        formatter={(v: any) => (typeof v === "number" ? v.toFixed(6) : v)}
                      />
                      <Line type="monotone" dataKey="y" stroke="hsl(var(--gold))" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-[10px] font-mono text-muted-foreground">
                  {t("pages.dataWorkspace.copy26", { defaultValue: "数据保存在浏览器 IndexedDB,离线可用。「JSON」按钮复制的数据可直接粘贴到 Notebook 的 JS / Python 单元中继续分析。" })}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DataWorkspace;
