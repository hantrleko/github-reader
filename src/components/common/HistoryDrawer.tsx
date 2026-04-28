import { useState } from "react";
import { History, Star, RotateCcw, Trash2, Save, Inbox } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCalcHistory, type HistoryEntry } from "@/lib/calcHistory";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props<T> {
  /** Unique storage key per calculator (matches ShareExportToolbar.storageKey) */
  storageKey: string;
  /** Current parameter snapshot — saved when user clicks 保存 */
  currentState: T;
  /** Callback to restore a saved snapshot back into the calculator */
  onApply: (state: T) => void;
  /** Optional label hint for newly saved entries */
  defaultLabel?: string;
  /** Render a short one-line summary of the saved state */
  summarize?: (state: T) => string;
}

function relativeTime(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}秒前`;
  if (sec < 3600) return `${Math.floor(sec / 60)}分钟前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}小时前`;
  return `${Math.floor(sec / 86400)}天前`;
}

/**
 * HistoryDrawer — 计算器参数历史 / 收藏抽屉。
 * Self-contained: includes a small trigger button + slide-out Sheet.
 * Backed by useCalcHistory (localStorage, 10 most-recent + unlimited starred).
 */
export function HistoryDrawer<T>({
  storageKey,
  currentState,
  onApply,
  defaultLabel,
  summarize,
}: Props<T>) {
  const { items, save, toggleStar, remove, clear } = useCalcHistory<T>(storageKey);
  const [open, setOpen] = useState(false);

  const onSave = () => {
    const label =
      defaultLabel ??
      `${storageKey} · ${new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    save(currentState, label);
    toast({ title: "已保存当前参数", description: label });
  };

  const starred = items.filter((i) => i.starred);
  const recent = items.filter((i) => !i.starred);

  const renderEntry = (entry: HistoryEntry<T>) => (
    <li
      key={entry.id}
      className="group rounded-md border border-border bg-card/60 hover:border-gold/30 transition-colors p-3"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono text-foreground truncate">{entry.label}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
            {relativeTime(entry.ts)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleStar(entry.id)}
          aria-label={entry.starred ? "取消收藏" : "收藏"}
          className={cn(
            "p-1 rounded transition-colors shrink-0",
            entry.starred
              ? "text-gold"
              : "text-muted-foreground/50 hover:text-gold"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", entry.starred && "fill-current")} />
        </button>
      </div>

      {summarize && (
        <p className="text-[10px] font-mono text-muted-foreground/80 truncate mb-2">
          {summarize(entry.state)}
        </p>
      )}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            onApply(entry.state);
            setOpen(false);
            toast({ title: "已应用历史参数" });
          }}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> 应用
        </button>
        <button
          type="button"
          onClick={() => remove(entry.id)}
          aria-label="删除"
          className="px-2 py-1 rounded text-[10px] font-mono border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </li>
  );

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSave}
        title="保存当前参数到历史"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors"
      >
        <Save className="w-3.5 h-3.5" />
        保存
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            title="历史与收藏"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors relative"
          >
            <History className="w-3.5 h-3.5" />
            历史
            {items.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-gold/20 text-gold text-[9px] font-mono">
                {items.length}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(92vw,380px)] flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-mono text-sm tracking-wider uppercase text-gold">
              {storageKey} · 历史与收藏
            </SheetTitle>
            <SheetDescription className="text-[11px] font-mono">
              本工具最多保留 10 条最近记录,收藏不被裁剪。数据仅存在本地浏览器。
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto mt-4 -mx-2 px-2 space-y-5">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Inbox className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-xs font-mono">暂无历史记录</p>
                <p className="text-[10px] font-mono mt-1 opacity-70">
                  点击「保存」按钮记录当前参数
                </p>
              </div>
            ) : (
              <>
                {starred.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-2 flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-current" />
                      收藏 ({starred.length})
                    </p>
                    <ul className="space-y-2">{starred.map(renderEntry)}</ul>
                  </div>
                )}
                {recent.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      最近 ({recent.length})
                    </p>
                    <ul className="space-y-2">{recent.map(renderEntry)}</ul>
                  </div>
                )}
              </>
            )}
          </div>

          {items.length > 0 && (
            <div className="pt-3 border-t border-border mt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm("确认清空全部历史(包括收藏)?")) {
                    clear();
                    toast({ title: "已清空历史" });
                  }
                }}
                className="w-full text-[10px] font-mono text-muted-foreground hover:text-destructive transition-colors py-2"
              >
                清空全部
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default HistoryDrawer;