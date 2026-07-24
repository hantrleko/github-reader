import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

const KEY = "efl.cb-safe";

/**
 * 色觉友好模式开关 — 切换 <html class="cb-safe">。
 * 全局 CSS 与调色板会读取该 class 使用 Okabe-Ito 8 色。
 */
export default function ColorblindToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY) === "1";
    setOn(stored);
    document.documentElement.classList.toggle("cb-safe", stored);
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    localStorage.setItem(KEY, next ? "1" : "0");
    document.documentElement.classList.toggle("cb-safe", next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "关闭色觉友好模式" : "开启色觉友好模式"}
      title={on ? "色觉友好模式：开" : "色觉友好模式：关"}
      className={
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono border transition-colors " +
        (on
          ? "border-gold/60 text-gold bg-gold/10"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40")
      }
    >
      <Eye className="w-3.5 h-3.5" />
      CB
    </button>
  );
}