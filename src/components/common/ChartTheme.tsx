import { useCallback, useRef, type ReactNode } from "react";
import { Download, FileSpreadsheet, Maximize2 } from "lucide-react";

/**
 * 统一的 Recharts 主题 token —— 所有图表共用以保证视觉一致性。
 * 使用 hsl(var(--token)) 形式以同时支持深/浅模式。
 * V4.8: 新增 palette 家族 / ChartToolbar / useChartExport / 升级版 ChartFrame。
 */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  gold: "hsl(var(--gold))",
  teal: "hsl(var(--teal))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  series: [
    "hsl(var(--gold))",
    "hsl(var(--primary))",
    "hsl(var(--teal))",
    "hsl(var(--destructive))",
    "hsl(var(--muted-foreground))",
  ],
};

/**
 * 四套调色板 —— 由 <html class="cb-safe"> 决定是否切换到色觉友好模式。
 * 所有值仍走 HSL token，不硬编码。
 */
export const CHART_PALETTES = {
  categorical: [
    "hsl(var(--gold))",
    "hsl(var(--teal))",
    "hsl(var(--primary))",
    "hsl(var(--destructive))",
    "hsl(var(--muted-foreground))",
  ],
  sequential: [
    "hsl(var(--gold) / 0.25)",
    "hsl(var(--gold) / 0.5)",
    "hsl(var(--gold) / 0.75)",
    "hsl(var(--gold))",
  ],
  diverging: {
    negative: "hsl(0 65% 50%)",
    neutral: "hsl(var(--muted-foreground) / 0.5)",
    positive: "hsl(150 55% 45%)",
  },
  /** Okabe-Ito 8 色, 对红/绿色盲友好, 全部 WCAG AA */
  colorblindSafe: [
    "hsl(202 100% 35%)", // blue
    "hsl(30 90% 55%)",   // orange
    "hsl(160 70% 42%)",  // bluish green
    "hsl(56 90% 55%)",   // yellow
    "hsl(210 60% 55%)",  // sky
    "hsl(15 80% 55%)",   // vermilion
    "hsl(320 55% 55%)",  // reddish purple
    "hsl(0 0% 30%)",     // black
  ],
};

export const GRID_PROPS = {
  stroke: "hsl(var(--border) / 0.4)",
  strokeDasharray: "3 3",
};

export const AXIS_PROPS = {
  stroke: "hsl(var(--muted-foreground))",
  tick: { fontSize: 11, fontFamily: "ui-monospace, monospace", fill: "hsl(var(--muted-foreground))" },
  tickLine: { stroke: "hsl(var(--border))" },
  axisLine: { stroke: "hsl(var(--border))" },
};

/** Recharts <Tooltip content={...} /> 用的统一卡片样式。可传 formatter/sort/showDelta。 */
export const ThemedTooltip = ({
  active,
  payload,
  label,
  formatter,
  sort = false,
  showDelta = false,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; stroke?: string; payload?: Record<string, unknown> }>;
  label?: string | number;
  formatter?: (v: number | string, name?: string) => string;
  sort?: boolean;
  showDelta?: boolean;
}) => {
  if (!active || !payload?.length) return null;
  const rows = sort
    ? [...payload].sort((a, b) => Number(b?.value ?? 0) - Number(a?.value ?? 0))
    : payload;
  return (
    <div className="rounded-md border border-border/70 bg-popover/95 backdrop-blur-md shadow-lg px-3 py-2 text-xs font-mono">
      {label !== undefined && (
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          {String(label)}
        </div>
      )}
      {rows.map((p, i) => {
        const raw = p?.value;
        const val = typeof raw === "number" ? raw : Number(raw);
        const text = formatter && raw !== undefined
          ? formatter(raw as number | string, p?.name)
          : typeof raw === "number" ? raw.toFixed(4) : String(raw ?? "");
        const first = Number(rows[0]?.value ?? 0);
        const delta = showDelta && i > 0 && Number.isFinite(val) && Number.isFinite(first) ? val - first : null;
        return (
          <div key={i} className="flex items-center gap-2 tabular-nums">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p?.color || p?.stroke }} />
            <span className="text-muted-foreground">{p?.name}</span>
            <span className="text-foreground font-semibold ml-auto">{text}</span>
            {delta !== null && (
              <span className={"text-[10px] " + (delta >= 0 ? "text-emerald-500" : "text-red-500")}>
                {delta >= 0 ? "+" : ""}{delta.toFixed(3)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
 * useChartExport — 把包裹图表的 DOM 节点导出为 PNG / SVG / CSV。
 * 不引入额外依赖：SVG 序列化 + <canvas>.toBlob 手写。
 * ───────────────────────────────────────────── */

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function svgToPngBlob(svg: SVGElement, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const rect = svg.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * scale));
    const h = Math.max(1, Math.round(rect.height * scale));
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    if (!clone.getAttribute("width")) clone.setAttribute("width", String(rect.width));
    if (!clone.getAttribute("height")) clone.setAttribute("height", String(rect.height));
    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("2d context failed"));
      // fill with card background so PNG looks right in either theme
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--card") || "0 0% 100%";
      ctx.fillStyle = `hsl(${bg})`;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob null"))), "image/png");
    };
    img.onerror = () => reject(new Error("SVG image load failed"));
    img.src = svg64;
  });
}

export function useChartExport() {
  const ref = useRef<HTMLDivElement | null>(null);

  const exportPng = useCallback(async (name = "chart") => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    try {
      const blob = await svgToPngBlob(svg as SVGElement, 2);
      download(blob, `${name}.png`);
    } catch (e) {
      console.error("PNG export failed", e);
    }
  }, []);

  const exportSvg = useCallback((name = "chart") => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    download(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
  }, []);

  const exportCsv = useCallback((rows: Array<Record<string, unknown>>, name = "chart") => {
    if (!rows.length) return;
    const headers = Array.from(
      rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set<string>())
    );
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
  }, []);

  return { ref, exportPng, exportSvg, exportCsv };
}

/* ─────────────────────────────────────────────
 * ChartToolbar & ChartFrame
 * ───────────────────────────────────────────── */

export const ChartToolbar = ({
  onPng,
  onCsv,
  onFullscreen,
  extra,
}: {
  onPng?: () => void;
  onCsv?: () => void;
  onFullscreen?: () => void;
  extra?: ReactNode;
}) => (
  <div className="flex items-center gap-1 print:hidden">
    {extra}
    {onCsv && (
      <button
        type="button"
        onClick={onCsv}
        aria-label="Export CSV"
        title="导出 CSV"
        className="p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-secondary/60 transition-colors"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
      </button>
    )}
    {onPng && (
      <button
        type="button"
        onClick={onPng}
        aria-label="Export PNG"
        title="导出 PNG"
        className="p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-secondary/60 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
    )}
    {onFullscreen && (
      <button
        type="button"
        onClick={onFullscreen}
        aria-label="Fullscreen"
        title="全屏"
        className="p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-secondary/60 transition-colors"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

/** 升级版 ChartFrame — 支持标题/工具条/脚注/骨架/空态，接收 forwardRef 供导出。 */
export const ChartFrame = ({
  children,
  height = 280,
  title,
  subtitle,
  toolbar,
  footnote,
  frameRef,
  loading,
  empty,
}: {
  children: ReactNode;
  height?: number;
  title?: ReactNode;
  subtitle?: ReactNode;
  toolbar?: ReactNode;
  footnote?: ReactNode;
  frameRef?: React.Ref<HTMLDivElement>;
  loading?: boolean;
  empty?: boolean;
}) => (
  <div className="rounded-lg border border-border/50 bg-card/30 p-3 print:bg-white print:border-neutral-300">
    {(title || toolbar) && (
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          {title && <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>}
          {subtitle && (
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {toolbar && <div className="shrink-0">{toolbar}</div>}
      </div>
    )}
    <div ref={frameRef} style={{ height }} className="relative">
      {loading && (
        <div className="absolute inset-0 rounded-md bg-secondary/40 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent animate-[shimmer_1.6s_infinite]" />
        </div>
      )}
      {!loading && empty && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground">
          暂无数据
        </div>
      )}
      {!loading && !empty && children}
    </div>
    {footnote && (
      <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{footnote}</p>
    )}
  </div>
);