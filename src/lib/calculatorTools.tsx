import { Share2, Download, Check, NotebookPen, ClipboardCopy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import { buildNotebookSeedUrl, type CalcSeed } from "@/lib/calcToNotebook";

/**
 * Read a per-calculator state object encoded in the URL hash query.
 * We use the hash so it doesn't trigger React Router navigation.
 * Format:  #/share?key=<urlEncodedJson>
 * `key` is the calculator's storage key (e.g. "bs", "frontier").
 */
export function readSharedState<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/[?&]([^=]+)=([^&]+)/g);
  if (!m) return null;
  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const raw = params.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(raw))) as T;
  } catch {
    return null;
  }
}

function encodeState<T>(state: T): string {
  return btoa(encodeURIComponent(JSON.stringify(state)));
}

function buildShareUrl(key: string, state: unknown, anchorId: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${anchorId}?${key}=${encodeState(state)}`;
}

interface Props {
  /** unique short key identifying this calculator's state */
  storageKey: string;
  /** anchor id of the calculator section (used in URL) */
  anchorId: string;
  /** current parameter state to encode */
  state: unknown;
  /** ref to the DOM node to capture as PNG */
  captureRef: React.RefObject<HTMLElement>;
  /** filename (without ext) for the PNG download */
  filename: string;
  /** if provided, shows an "Open in Notebook" button that seeds the Notebook editor */
  notebookSeed?: CalcSeed;
  /** if provided, shows a "复制 MD" button that copies a Markdown report */
  markdown?: () => string;
}

export const ShareExportToolbar = ({
  storageKey,
  anchorId,
  state,
  captureRef,
  filename,
  notebookSeed,
  markdown,
}: Props) => {
  const [copied, setCopied] = useState(false);
  const [mdCopied, setMdCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const onShare = async () => {
    const url = buildShareUrl(storageKey, state, anchorId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "已复制分享链接", description: "粘贴即可还原当前参数" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "复制失败", description: url, variant: "destructive" });
    }
  };

  const onCopyMarkdown = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown());
      setMdCopied(true);
      toast({ title: "已复制 Markdown", description: "可直接粘贴进报告 / Notebook" });
      setTimeout(() => setMdCopied(false), 1800);
    } catch {
      toast({ title: "复制失败", variant: "destructive" });
    }
  };

  const onExport = async () => {
    if (!captureRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue("--background") &&
          document.documentElement.classList.contains("dark")
            ? "#0a0a0a"
            : "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${filename}.png`;
      a.click();
      toast({ title: "已导出 PNG" });
    } catch (e) {
      toast({ title: "导出失败", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {notebookSeed && (
        <a
          href={buildNotebookSeedUrl(notebookSeed)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors"
          title="把当前参数导入到反应式 Notebook"
        >
          <NotebookPen className="w-3.5 h-3.5" />
          Open in Notebook
        </a>
      )}
      {markdown && (
        <button
          onClick={onCopyMarkdown}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors"
          title="复制结果为 Markdown(表格 + 公式)"
        >
          {mdCopied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
          {mdCopied ? "已复制" : "复制 MD"}
        </button>
      )}
      <button
        onClick={onShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors"
        title="复制带参数的分享链接"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
        {copied ? "已复制" : "分享链接"}
      </button>
      <button
        onClick={onExport}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50"
        title="导出当前结果为 PNG 图片"
      >
        <Download className="w-3.5 h-3.5" />
        {busy ? "导出中…" : "导出 PNG"}
      </button>
    </div>
  );
};

/** Hook helper: load shared state from URL on mount and apply via setter */
export function useSharedState<T>(
  storageKey: string,
  applyState: (s: T) => void
) {
  const did = useRef(false);
  useEffect(() => {
    if (did.current) return;
    did.current = true;
    const s = readSharedState<T>(storageKey);
    if (s) applyState(s);
  }, [storageKey, applyState]);
}
