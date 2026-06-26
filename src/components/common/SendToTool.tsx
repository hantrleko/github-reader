import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ArrowUpRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TOOLS_CATALOG } from "@/data/toolsCatalog";
import { sectionHref } from "@/lib/sections";
import { pushBus, BUS_META, formatBusValue, type BusKey } from "@/lib/toolBus";
import { toast } from "@/hooks/use-toast";

interface Props {
  /** catalog id of the producing tool (used to resolve `related` targets) */
  fromId: string;
  /** canonical outputs to hand off (sigma & r as decimals) */
  outputs: Partial<Record<BusKey, number>>;
  /** human label of this tool, shown in the receiver toast */
  label: string;
  /** explicit target catalog ids; defaults to the catalog `related` list */
  targets?: string[];
  className?: string;
}

/**
 * "发送到…" — pushes the current tool outputs onto the Tool Bus and routes
 * the user to a related tool, which pre-fills the matching parameters.
 */
export default function SendToTool({ fromId, outputs, label, targets, className }: Props) {
  const navigate = useNavigate();

  const keys = useMemo(
    () => (Object.keys(outputs) as BusKey[]).filter((k) => outputs[k] != null && Number.isFinite(outputs[k] as number)),
    [outputs]
  );

  const targetEntries = useMemo(() => {
    const ids = targets ?? TOOLS_CATALOG.find((t) => t.id === fromId)?.related ?? [];
    return ids
      .map((id) => TOOLS_CATALOG.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t && t.id !== fromId);
  }, [fromId, targets]);

  if (!targetEntries.length || !keys.length) return null;

  const summary = keys.map((k) => `${BUS_META[k].symbol}=${formatBusValue(k, outputs[k] as number)}`).join("  ");

  const handleSend = (toAnchor: string, toName: string) => {
    const payload: Partial<Record<BusKey, number>> = {};
    keys.forEach((k) => (payload[k] = outputs[k] as number));
    pushBus(payload, label);
    toast({ title: "已发送到 " + toName, description: summary });
    navigate(sectionHref(toAnchor));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors " +
            (className || "")
          }
          title={"把当前输出 (" + summary + ") 发送到相关工具"}
        >
          <Send className="w-3.5 h-3.5" />
          发送到…
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 font-mono">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          传递 {summary}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {targetEntries.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => handleSend(t.anchor, t.name)}
            className="flex items-center justify-between gap-2 cursor-pointer text-xs"
          >
            <span className="truncate">{t.name}</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}