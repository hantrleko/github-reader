import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles, Command, Compass } from "lucide-react";
import {
  safeLocalStorage,
  getStorageItem,
  setStorageItem,
} from "@/lib/storage";

const STORAGE_KEY = "lov.onboarded.v1";

const STEPS = [
  {
    icon: Sparkles,
    title: "欢迎来到 Econ & Finance Lab",
    body: "12 个交互式金融计算器 + 7 个核心章节,把教材公式跑成可调参数的真实计算。",
  },
  {
    icon: Command,
    title: "随时按 ⌘K / Ctrl+K",
    body: "全局命令面板:模糊搜索任意计算器或章节,一键跳转,跨页也能用。",
  },
  {
    icon: Compass,
    title: "右上角切换语言 / 主题",
    body: "中英双语 · 深浅主题 · 公式与代码一起展示。点开始探索吧。",
  },
];

const Onboarding = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!getStorageItem(safeLocalStorage, STORAGE_KEY)) {
        // 延后一拍,等首屏渲染稳定再弹
        const t = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const close = () => {
    setOpen(false);
    setStorageItem(safeLocalStorage, STORAGE_KEY, String(Date.now()));
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  if (!open) return null;
  const S = STEPS[step];
  const Icon = S.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        role="dialog"
        aria-modal="true"
        aria-label="新手引导"
      >
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          className="relative w-full max-w-md max-w-[92vw] rounded-2xl border border-gold/30 bg-card shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={close}
            className="absolute top-3 right-3 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="关闭引导"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-gold" />
          </div>

          <h3 className="text-xl font-display font-semibold text-foreground mb-2">
            {S.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {S.body}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-6 bg-gold" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  上一步
                </button>
              )}
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-semibold hover:scale-105 transition-transform"
              >
                {step === STEPS.length - 1 ? "开始探索" : "下一步"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Onboarding;
