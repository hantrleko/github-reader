import { useState, type ReactNode } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Sigma, Code2, CheckCircle2, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type TabId = "formula" | "code" | "result";

interface Props {
  /** KaTeX formula string (no $ delimiters) */
  formula: string;
  /** Python reference implementation. Plain string, monospace, light syntax tint. */
  python: string;
  /** Result block — usually a small key-value summary or any JSX */
  result: ReactNode;
  /** Optional caption shown above the formula */
  title?: string;
}

/**
 * 教学三联视图: 公式 (LaTeX) | Python 参考实现 | 当前结果
 * 让学生能在同一卡片里串联「数学 → 代码 → 数值」三层心智模型。
 * 故意不引 react-syntax-highlighter (节省 ~80KB)，用极简手写 token 着色。
 */
export const FormulaCodeView = ({ formula, python, result, title }: Props) => {
  const [tab, setTab] = useState<TabId>("formula");
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(python);
      setCopied(true);
      toast({ title: "已复制 Python 代码" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "复制失败", variant: "destructive" });
    }
  };

  const tabs: { id: TabId; icon: typeof Sigma; label: string }[] = [
    { id: "formula", icon: Sigma, label: "公式" },
    { id: "code", icon: Code2, label: "Python" },
    { id: "result", icon: CheckCircle2, label: "结果" },
  ];

  return (
    <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-secondary/30 to-transparent overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 bg-card/40">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  active
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>
        {title && (
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground hidden sm:inline">
            {title}
          </span>
        )}
      </div>

      <div className="p-4 min-h-[120px]">
        {tab === "formula" && (
          <div className="text-foreground katex-display-gold text-center py-2">
            <BlockMath math={formula} />
          </div>
        )}
        {tab === "code" && (
          <div className="relative">
            <button
              onClick={copyCode}
              className="absolute top-1 right-1 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-gold hover:bg-accent transition-colors"
              title="复制代码"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "已复制" : "复制"}
            </button>
            <pre className="text-[11.5px] leading-relaxed font-mono text-foreground/90 overflow-x-auto pr-12 whitespace-pre">
              <code>{python}</code>
            </pre>
          </div>
        )}
        {tab === "result" && (
          <div className="font-mono text-sm text-foreground tabular-nums">
            {result}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormulaCodeView;