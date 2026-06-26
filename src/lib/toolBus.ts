/**
 * Tool Bus — a lightweight, dependency-free cross-tool data channel.
 *
 * Lets one calculator hand its key outputs (a fitted volatility, a spot
 * price, an implied rate, …) to another tool. The source pushes canonical
 * named values onto the bus and navigates to the target; the target consumes
 * the matching keys once on mount and pre-fills its inputs.
 *
 * State lives in a module-level store (survives SPA route changes) and is
 * mirrored to sessionStorage so a hard reload mid-handoff still works.
 */
import { useSyncExternalStore, useRef, useEffect } from "react";

/** Canonical, tool-agnostic variable names exchanged over the bus. */
export type BusKey = "S0" | "sigma" | "r" | "T" | "mu" | "K" | "price";

export interface BusEntry {
  /** numeric value in canonical units (sigma & r as decimals, e.g. 0.2 = 20%) */
  value: number;
  /** human label of the producing tool, e.g. "隐含波动率" */
  source: string;
  /** epoch ms when produced */
  ts: number;
}

export type BusState = Partial<Record<BusKey, BusEntry>>;

/** Display metadata for each canonical key (units are canonical → display). */
export const BUS_META: Record<BusKey, { symbol: string; zh: string; pct?: boolean }> = {
  S0: { symbol: "S₀", zh: "标的价格" },
  sigma: { symbol: "σ", zh: "波动率", pct: true },
  r: { symbol: "r", zh: "无风险利率", pct: true },
  T: { symbol: "T", zh: "到期时间" },
  mu: { symbol: "μ", zh: "漂移/预期收益", pct: true },
  K: { symbol: "K", zh: "行权价" },
  price: { symbol: "P", zh: "价格" },
};

const STORAGE_KEY = "lov.toolbus.v1";

function load(): BusState {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BusState) : {};
  } catch {
    return {};
  }
}

let state: BusState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore */
  }
}

function emit() {
  persist();
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Push one or more canonical values onto the bus, tagged with a source. */
export function pushBus(values: Partial<Record<BusKey, number>>, source: string) {
  const ts = Date.now();
  const next: BusState = { ...state };
  (Object.keys(values) as BusKey[]).forEach((k) => {
    const v = values[k];
    if (v == null || !Number.isFinite(v)) return;
    next[k] = { value: v, source, ts };
  });
  state = next;
  emit();
}

/** Remove the given keys from the bus (after a consumer reads them). */
export function clearBusKeys(keys: BusKey[]) {
  if (!keys.length) return;
  const next: BusState = { ...state };
  let changed = false;
  keys.forEach((k) => {
    if (next[k]) {
      delete next[k];
      changed = true;
    }
  });
  if (changed) {
    state = next;
    emit();
  }
}

export function getBus(): BusState {
  return state;
}

/** Reactive read of the whole bus. */
export function useBus(): BusState {
  return useSyncExternalStore(subscribe, getBus, getBus);
}

/**
 * Consume matching keys exactly once on mount. If any requested key is
 * present, `apply` is called with the decoded numeric values and the keys
 * are cleared so they aren't re-applied on a later visit. The producing
 * source label(s) are passed for an optional confirmation toast.
 */
export function useBusConsume(
  keys: BusKey[],
  apply: (values: Partial<Record<BusKey, number>>, source: string) => void
) {
  const did = useRef(false);
  useEffect(() => {
    if (did.current) return;
    did.current = true;
    const snap = getBus();
    const picked: Partial<Record<BusKey, number>> = {};
    let source = "";
    let any = false;
    keys.forEach((k) => {
      const e = snap[k];
      if (e) {
        picked[k] = e.value;
        source = e.source;
        any = true;
      }
    });
    if (any) {
      apply(picked, source);
      clearBusKeys(keys);
    }
    // run-once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Format a bus value for display (handles percent units). */
export function formatBusValue(key: BusKey, value: number): string {
  const m = BUS_META[key];
  if (m.pct) return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(2);
}