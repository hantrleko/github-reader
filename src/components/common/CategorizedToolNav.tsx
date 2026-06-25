import { useMemo, useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export interface ToolMeta {
  id: string;
  name: string;
  /** optional secondary label (e.g. English name) used for search matching */
  nameEn?: string;
}

export interface ToolCategory {
  id: string;
  label: string;
  /** ordered tool ids belonging to this category */
  toolIds: string[];
}

interface Props {
  tools: ToolMeta[];
  categories?: ToolCategory[];
  activeId: string;
  onSelect: (id: string) => void;
  /** show the inline search box (default: auto — on when > 8 tools) */
  enableSearch?: boolean;
  /** below this tool count the nav collapses to a single flat row (default 7) */
  flatThreshold?: number;
}

const tabBase =
  "px-4 py-2 rounded-lg text-sm font-mono transition-all duration-300";
const tabActive = "bg-primary text-primary-foreground shadow-lg";
const tabIdle = "bg-secondary text-secondary-foreground hover:bg-secondary/80";

/**
 * Two-level tool navigation: category chips → tools within the active category,
 * plus an instant search filter. Falls back to a single flat row when there are
 * few tools or no categories are provided.
 */
export default function CategorizedToolNav({
  tools,
  categories,
  activeId,
  onSelect,
  enableSearch,
  flatThreshold = 7,
}: Props) {
  const byId = useMemo(() => {
    const m = new Map<string, ToolMeta>();
    for (const t of tools) m.set(t.id, t);
    return m;
  }, [tools]);

  const useCategories =
    !!categories && categories.length > 1 && tools.length >= flatThreshold;

  const showSearch = enableSearch ?? tools.length > 8;
  const [query, setQuery] = useState("");

  // Which category does the active tool belong to?
  const activeCat = useMemo(() => {
    if (!useCategories) return null;
    return (
      categories!.find((c) => c.toolIds.includes(activeId))?.id ??
      categories![0].id
    );
  }, [categories, activeId, useCategories]);

  const [selectedCat, setSelectedCat] = useState<string | null>(activeCat);
  // Keep the highlighted category in sync when the active tool changes
  // (e.g. via deep-link / shared state / history restore).
  useEffect(() => {
    if (activeCat) setSelectedCat(activeCat);
  }, [activeCat]);

  const q = query.trim().toLowerCase();
  const searching = showSearch && q.length > 0;

  const searchResults = useMemo(() => {
    if (!searching) return [];
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.nameEn ?? "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    );
  }, [searching, q, tools]);

  const renderTab = (t: ToolMeta) => (
    <button
      key={t.id}
      onClick={() => onSelect(t.id)}
      aria-current={activeId === t.id ? "true" : undefined}
      className={`${tabBase} ${activeId === t.id ? tabActive : tabIdle}`}
    >
      {t.name}
    </button>
  );

  return (
    <div className="mb-8 space-y-4">
      {showSearch && (
        <div className="relative max-w-md mx-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索工具…"
            aria-label="搜索工具"
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-secondary/60 border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-shadow"
          />
          {q.length > 0 && (
            <button
              onClick={() => setQuery("")}
              aria-label="清空搜索"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {searching ? (
        searchResults.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {searchResults.map(renderTab)}
          </div>
        ) : (
          <p className="text-center text-sm font-mono text-muted-foreground py-2">
            未找到匹配「{query}」的工具
          </p>
        )
      ) : useCategories ? (
        <>
          {/* Level 1 — category chips */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {categories!.map((c) => {
              const isActive = selectedCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCat(c.id);
                    // jump to the first tool of the category for instant feedback
                    const first = c.toolIds[0];
                    if (first && first !== activeId) onSelect(first);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                    isActive
                      ? "border-gold/70 bg-gold/10 text-gold"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  }`}
                >
                  {c.label}
                  <span className="ml-1.5 opacity-60">{c.toolIds.length}</span>
                </button>
              );
            })}
          </div>
          {/* Level 2 — tools within the selected category */}
          <div className="flex flex-wrap justify-center gap-2">
            {(categories!.find((c) => c.id === selectedCat)?.toolIds ?? [])
              .map((id) => byId.get(id))
              .filter((t): t is ToolMeta => !!t)
              .map(renderTab)}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {tools.map(renderTab)}
        </div>
      )}
    </div>
  );
}