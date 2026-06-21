import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sectionHref } from "@/lib/sections";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Calculator, LineChart, Activity, TrendingUp, Layers, Coins,
  Waves, Target, Sigma, Shield, BarChart3, GraduationCap, BookOpen,
  Home, Sparkles, FileText,
} from "lucide-react";

type Item = {
  group: string;
  id: string;
  label: string;
  hint?: string;
  Icon: typeof Calculator;
  to?: string;       // full path (e.g. /changelog)
  hash?: string;     // anchor on home page
};

const ITEMS: Item[] = [
  // Pages
  { group: "页面 · Pages", id: "home",      label: "首页 · Home",          Icon: Home,     to: "/",          hint: "/" },
  { group: "页面 · Pages", id: "changelog", label: "更新日志 · Changelog", Icon: FileText, to: "/changelog", hint: "/changelog" },
  // Chapter 1
  { group: "基础定价 · Chapter 1", id: "calculator",  label: "Black-Scholes 期权定价", Icon: Calculator, hash: "calculator" },
  { group: "基础定价 · Chapter 1", id: "implied-vol", label: "隐含波动率求解器",        Icon: Activity,   hash: "implied-vol" },
  { group: "基础定价 · Chapter 1", id: "mc-pricer",   label: "Monte Carlo 期权定价",   Icon: Sparkles,   hash: "mc-pricer" },
  // Chapter 2
  { group: "衍生品 · Chapter 2", id: "derivatives", label: "波动率曲面 / Greeks 热力图", Icon: Layers, hash: "derivatives" },
  // Chapter 3
  { group: "固收与组合 · Chapter 3", id: "bond",       label: "债券定价 / 久期凸性",  Icon: Coins,      hash: "bond" },
  { group: "固收与组合 · Chapter 3", id: "rate-model", label: "利率模型 (Vasicek/CIR)", Icon: Waves,      hash: "rate-model" },
  { group: "固收与组合 · Chapter 3", id: "frontier",   label: "有效前沿 / 资产配置",   Icon: Target,     hash: "frontier" },
  // Chapter 4-6
  { group: "计量 & 风险 · Chapter 4-5", id: "econometrics", label: "计量经济学工具组",  Icon: Sigma,      hash: "econometrics" },
  { group: "计量 & 风险 · Chapter 4-5", id: "risk",         label: "VaR / 信用 / 压力测试", Icon: Shield, hash: "risk" },
  { group: "量化与学习 · Chapter 6+",  id: "quant",        label: "量化策略回测",       Icon: BarChart3,  hash: "quant" },
  { group: "量化与学习 · Chapter 6+",  id: "quiz",         label: "知识检验测验",       Icon: GraduationCap, hash: "quiz" },
  { group: "量化与学习 · Chapter 6+",  id: "learning",     label: "学习路径",           Icon: BookOpen,   hash: "learning" },
];

/**
 * Global ⌘K / Ctrl+K command palette for jumping to any tool or page.
 */
const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goto = (item: Item) => {
    setOpen(false);
    if (item.to) {
      navigate(item.to);
      return;
    }
    if (item.hash) {
      navigate(sectionHref(item.hash));
    }
  };

  // group items by group key, preserving order
  const groups = ITEMS.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.group] = acc[it.group] || []).push(it);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索工具或章节…  Search tools & chapters…" />
      <CommandList>
        <CommandEmpty>无匹配结果 · No results.</CommandEmpty>
        {Object.entries(groups).map(([g, items], i) => (
          <div key={g}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={g}>
              {items.map((it) => {
                const Icon = it.Icon;
                return (
                  <CommandItem
                    key={it.id}
                    value={`${it.label} ${it.id}`}
                    onSelect={() => goto(it)}
                  >
                    <Icon className="mr-2 h-4 w-4 text-gold" />
                    <span>{it.label}</span>
                    {it.hint && (
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground">{it.hint}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
      <div className="border-t border-border px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[10px] font-mono text-muted-foreground flex items-center justify-between">
        <span>↑↓ 导航 · ↵ 跳转 · esc 关闭</span>
        <span className="hidden sm:inline">⌘K / Ctrl+K 打开</span>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;