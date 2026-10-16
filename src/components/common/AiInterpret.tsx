/**
 * AiInterpret — "AI 解读结果" button + inline answer panel.
 * Drop next to any calculator: pass the tool name, current params and the
 * computed results; the ai-explain Edge Function (mode: "interpret") returns
 * a research-mentor style reading of the numbers.
 */
import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  /** human-readable tool name, e.g. "Black-Scholes 定价器" */
  tool: string;
  /** current input parameters */
  params: Record<string, unknown>;
  /** computed outputs to interpret (keep it small — key metrics only) */
  results: Record<string, unknown>;
  /** optional extra context for the model */
  context?: string;
  className?: string;
}

const AiInterpret = ({ tool, params, results, context, className }: Props) => {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const ask = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-explain", {
        body: { mode: "interpret", tool, params, results, context },
      });
      const status = (error as { context?: Response } | null)?.context?.status
        ?? (data as any)?.status;
      const code = (data as any)?.code;
      if (status === 401 || code === "auth_required") {
        const msg = "请先登录后使用 AI 解读 / Please sign in to use AI interpretation.";
        setText(`🔒 ${msg}`);
        toast({ title: "需要登录 / Sign in required", description: msg });
        return;
      }
      if (status === 429) {
        const msg = "请求过于频繁，请稍后再试 / Too many requests, please try again later.";
        setText(`⏳ ${msg}`);
        toast({ title: "请求过于频繁 / Rate limited", description: msg });
        return;
      }
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setText((data as any)?.explanation || "(无返回)");
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      setText(`❌ ${msg}`);
      toast({ title: "AI 解读失败", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={ask}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-gold/40 text-gold bg-card hover:bg-gold/10 transition-colors disabled:opacity-50"
        title="让 AI 解读当前参数下的计算结果"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        AI 解读结果
      </button>
      {open && (text || loading) && (
        <div className="relative mt-2 border-l-2 border-gold/60 bg-accent/20 px-3 py-2 pr-8 text-xs text-foreground/85 font-body leading-relaxed whitespace-pre-wrap rounded-r">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-1.5 right-1.5 p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="关闭"
          >
            <X className="w-3 h-3" />
          </button>
          {loading ? "正在解读当前结果…" : text}
        </div>
      )}
    </div>
  );
};

export default AiInterpret;
