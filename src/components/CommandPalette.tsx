import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sectionHref } from "@/lib/sections";
import { KIND_LABELS, type SearchDoc, type SearchKind } from "@/lib/searchIndexTypes";
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
  Calculator, Activity, Layers, Coins, Waves, Target, Sigma, Shield,
  BarChart3, GraduationCap, BookOpen, Home, Sparkles, FileText,
  BookMarked, FlaskConical, Route, TrendingUp, Library, Compass,
} from "lucide-react";

const KIND_ICONS: Record<SearchKind, typeof Calculator> = {
  page: FileText,
  tool: FlaskConical,
  topic: Compass,
  knowledge: BookOpen,
  glossary: BookMarked,
  paper: Library,
  strategy: TrendingUp,
  workflow: Route,
};

/** Curated quick-jump items shown before the user types anything. */
type QuickItem = { group: string; id: string; label: string; hint?: string; Icon: typeof Calculator; to?: string; hash?: string };

const QUICK_ITEMS: QuickItem[] = [
  { group: "页面 · Pages", id: "home",      label: "首页 · Home",          Icon: Home,     to: "/",          hint: "/" },
  { group: "页面 · Pages", id: "tools",     label: "工具目录 · Tools",     Icon: FlaskConical, to: "/tools", hint: "/tools" },
  { group: "页面 · Pages", id: "glossary",  label: "术语表 · Glossary",    Icon: BookMarked, to: "/glossary", hint: "/glossary" },
  { group: "页面 · Pages", id: "papers",    label: "论文索引 · Papers",    Icon: Library,  to: "/papers",    hint: "/papers" },
  { group: "页面 · Pages", id: "changelog", label: "更新日志 · Changelog", Icon: FileText, to: "/changelog", hint: "/changelog" },
  { group: "基础定价 · Chapter 1", id: "calculator",  label: "Black-Scholes 期权定价", Icon: Calculator, hash: "calculator" },
  { group: "基础定价 · Chapter 1", id: "implied-vol", label: "隐含波动率求解器",        Icon: Activity,   hash: "implied-vol" },
  { group: "基础定价 · Chapter 1", id: "mc-pricer",   label: "Monte Carlo 期权定价",   Icon: Sparkles,   hash: "mc-pricer" },
  { group: "衍生品 · Chapter 2", id: "derivatives", label: "波动率曲面 / Greeks 热力图", Icon: Layers, hash: "derivatives" },
  { group: "固收与组合 · Chapter 3", id: "bond",       label: "债券定价 / 久期凸性",  Icon: Coins,  hash: "bond" },
  { group: "固收与组合 · Chapter 3", id: "rate-model", label: "利率模型 (Vasicek/CIR)", Icon: Waves,  hash: "rate-model" },
  { group: "固收与组合 · Chapter 3", id: "frontier",   label: "有效前沿 / 资产配置",   Icon: Target, hash: "frontier" },
  { group: "计量 & 风险 · Chapter 4-5", id: "econometrics", label: "计量经济学工具组",  Icon: Sigma,  hash: "econometrics" },
  { group: "计量 & 风险 · Chapter 4-5", id: "risk",         label: "VaR / 信用 / 压力测试", Icon: Shield, hash: "risk" },
  { group: "量化与学习 · Chapter 6+",  id: "quant",        label: "量化策略回测",       Icon: BarChart3,  hash: "quant" },
  { group: "量化与学习 · Chapter 6+",  id: "quiz",         label: "知识检验测验",       Icon: GraduationCap, hash: "quiz" },
  { group: "量化与学习 · Chapter 6+",  id: "learning",     label: "学习路径",           Icon: BookOpen,   hash: "learning" },
];

/**
 * Global ⌘K / Ctrl+K palette.
 *
 * Empty query → curated quick-jump list (tools & pages).
 * Typed query → unified full-content search across tools, topics,
 * knowledge points, glossary terms, papers, strategies and workflows —
 * one entry point into the platform's whole knowledge network.
 */
const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

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

  // Warm the index once the palette is first opened (all-static, cheap).
  useEffect(() => {
    if (open) buildSearchIndex();
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => (query.trim() ? searchDocs(query, 36) : []), [query]);

  const resultGroups = useMemo(() => {
    const map = new Map<string, SearchDoc[]>();
    for (const doc of results) {
      const arr = map.get(doc.group) ?? [];
      arr.push(doc);
      map.set(doc.group, arr);
    }
    // Cap each group so no single kind floods the list.
    return Array.from(map.entries()).map(([g, docs]) => [g, docs.slice(0, 6)] as const);
  }, [results]);

  const quickGroups = useMemo(() => {
    const map = new Map<string, QuickItem[]>();
    for (const it of QUICK_ITEMS) {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  const gotoQuick = (item: QuickItem) => {
    setOpen(false);
    if (item.to) navigate(item.to);
    else if (item.hash) navigate(sectionHref(item.hash));
  };

  const gotoDoc = (doc: SearchDoc) => {
    setOpen(false);
    navigate(doc.href);
  };

  const searching = query.trim().length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={!searching}>
      <CommandInput
        placeholder="搜索工具、知识点、术语、论文、策略…  Search everything…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>无匹配结果 · No results.</CommandEmpty>

        {searching
          ? resultGroups.map(([g, docs], i) => (
              <div key={g}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={g}>
                  {docs.map((doc) => {
                    const Icon = KIND_ICONS[doc.kind];
                    return (
                      <CommandItem key={doc.id} value={doc.id} onSelect={() => gotoDoc(doc)}>
                        <Icon className="mr-2 h-4 w-4 text-gold shrink-0" />
                        <span className="truncate">{doc.title}</span>
                        {doc.subtitle && (
                          <span className="ml-auto pl-3 text-[10px] font-mono text-muted-foreground truncate max-w-[45%]">
                            {doc.subtitle}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </div>
            ))
          : quickGroups.map(([g, items], i) => (
              <div key={g}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={g}>
                  {items.map((it) => {
                    const Icon = it.Icon;
                    return (
                      <CommandItem
                        key={it.id}
                        value={`${it.label} ${it.id}`}
                        onSelect={() => gotoQuick(it)}
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
        <span className="hidden sm:inline">
          {searching ? `${results.length} 条结果 · 全库检索` : "⌘K / Ctrl+K 打开 · 输入即全库搜索"}
        </span>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;
