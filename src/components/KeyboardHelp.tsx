import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

/**
 * Global keyboard-shortcuts cheat-sheet.
 * Trigger: press `?` (Shift+/) anywhere — but ignored when typing in an input.
 * Esc to close. Also openable via the floating button.
 */


const KeyboardHelp = () => {
  const { t } = useTranslation();
const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { group: t("labs.keyboardHelp.text1", { defaultValue: "导航" }), keys: ["⌘", "K"], label: t("labs.keyboardHelp.text2", { defaultValue: "打开命令面板（搜索全部计算器）" }) },
  { group: t("labs.keyboardHelp.text1", { defaultValue: "导航" }), keys: ["Ctrl", "K"], label: t("labs.keyboardHelp.text3", { defaultValue: "命令面板（Windows / Linux）" }) },
  { group: t("labs.keyboardHelp.text1", { defaultValue: "导航" }), keys: ["?"], label: t("labs.keyboardHelp.text4", { defaultValue: "打开 / 关闭本帮助" }) },
  { group: t("labs.keyboardHelp.text1", { defaultValue: "导航" }), keys: ["Esc"], label: t("labs.keyboardHelp.text5", { defaultValue: "关闭弹窗 / 抽屉" }) },
  { group: t("labs.keyboardHelp.text6", { defaultValue: "页面" }), keys: ["↑", "↓"], label: t("labs.keyboardHelp.text7", { defaultValue: "在命令面板中上下选择" }) },
  { group: t("labs.keyboardHelp.text6", { defaultValue: "页面" }), keys: ["↵"], label: t("labs.keyboardHelp.text8", { defaultValue: "命令面板中跳转选中项" }) },
  { group: t("labs.keyboardHelp.text9", { defaultValue: "计算器" }), keys: ["Tab"], label: t("labs.keyboardHelp.text10", { defaultValue: "在输入项之间切换" }) },
  { group: t("labs.keyboardHelp.text9", { defaultValue: "计算器" }), keys: ["↑", "↓"], label: t("labs.keyboardHelp.text11", { defaultValue: "在数字输入框中调整数值" }) },
];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // `?` triggers — ignore when typing in inputs / textareas / contentEditable
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          (target && (target as HTMLElement).isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Group items
  const groups = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
    (acc[s.group] = acc[s.group] || []).push(s);
    return acc;
  }, {});

  return (
    <>
      {/* Floating discoverability button (bottom-left, subtle) */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t("labs.keyboardHelp.text12", { defaultValue: "键盘快捷键 (?)" })}
        title={t("labs.keyboardHelp.text13", { defaultValue: "键盘快捷键 — 按 ? 打开" })}
        className="fixed bottom-4 left-4 z-40 hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-card/80 backdrop-blur-md text-muted-foreground hover:text-gold hover:border-gold/50 transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t("labs.keyboardHelp.text14", { defaultValue: "键盘快捷键" })}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="relative w-full max-w-lg max-w-[92vw] rounded-2xl border border-gold/30 bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-gradient-to-r from-gold/5 to-transparent">
                <div className="flex items-center gap-2.5">
                  <Keyboard className="w-4 h-4 text-gold" />
                  <h3 className="text-sm font-display font-semibold text-foreground">
                    {t("labs.keyboardHelp.text15", { defaultValue: "键盘快捷键 · Keyboard Shortcuts" })}
                  </h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label={t("labs.keyboardHelp.text16", { defaultValue: "关闭" })}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {Object.entries(groups).map(([g, items]) => (
                  <div key={g}>
                    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-3">
                      {g}
                    </p>
                    <div className="space-y-2">
                      {items.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-4 py-1.5 px-3 rounded-md hover:bg-secondary/40 transition-colors"
                        >
                          <span className="text-sm text-foreground">{s.label}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.keys.map((k, j) => (
                              <span key={j} className="flex items-center gap-1">
                                {j > 0 && (
                                  <span className="text-[10px] text-muted-foreground">+</span>
                                )}
                                <kbd className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 rounded border border-border bg-secondary text-[11px] font-mono text-foreground shadow-sm">
                                  {k}
                                </kbd>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-border/60 bg-secondary/30">
                <p className="text-[11px] font-mono text-muted-foreground text-center">
                  {t("labs.keyboardHelp.text17", { defaultValue: "按" })} <kbd className="px-1 py-0.5 rounded border border-border bg-card text-[10px]">?</kbd> {t("labs.keyboardHelp.text18", { defaultValue: "随时唤起本面板 · 按" })} <kbd className="px-1 py-0.5 rounded border border-border bg-card text-[10px]">Esc</kbd> {t("labs.keyboardHelp.text16", { defaultValue: "关闭" })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default KeyboardHelp;
