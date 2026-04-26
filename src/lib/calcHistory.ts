import { useCallback, useEffect, useState } from "react";

const MAX_ITEMS = 10;

export interface HistoryEntry<T = unknown> {
  id: string;          // unique id (timestamp-based)
  ts: number;          // saved at
  label: string;       // user-visible short label
  state: T;            // calculator parameter snapshot
  starred?: boolean;
}

const storageKey = (toolKey: string) => `lov.history.${toolKey}`;

function read<T>(toolKey: string): HistoryEntry<T>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(toolKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write<T>(toolKey: string, items: HistoryEntry<T>[]) {
  try {
    localStorage.setItem(storageKey(toolKey), JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / private mode — silent */
  }
}

/**
 * useCalcHistory — localStorage 历史记录 + 收藏夹。
 * - save(state, label): 追加到顶部，最多保留 10 条（收藏不计入裁剪）
 * - toggleStar(id):     切换收藏
 * - remove(id):         删除单条
 * - clear():            全部清空（仅本工具）
 */
export function useCalcHistory<T>(toolKey: string) {
  const [items, setItems] = useState<HistoryEntry<T>[]>(() => read<T>(toolKey));

  useEffect(() => {
    write(toolKey, items);
  }, [toolKey, items]);

  const save = useCallback((state: T, label: string) => {
    setItems((prev) => {
      const entry: HistoryEntry<T> = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        label,
        state,
      };
      const starred = prev.filter((p) => p.starred);
      const recent = prev.filter((p) => !p.starred);
      const next = [entry, ...recent].slice(0, MAX_ITEMS);
      return [...starred, ...next];
    });
  }, []);

  const toggleStar = useCallback((id: string) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, save, toggleStar, remove, clear };
}