/**
 * Unified reader progress (learning-path stages + visited sections).
 *
 * Local-first: everything lives in localStorage so anonymous readers keep
 * their progress. When a user is signed in, `syncProgress` merges the local
 * set with the `user_progress` table (union — progress is never lost) and
 * pushes anything the cloud is missing.
 */
import { supabase } from "@/integrations/supabase/client";

export type ProgressKind = "learning" | "section";

type Store = Record<ProgressKind, Record<string, boolean>>;

const KEY = "ef:progress:v1";
/** legacy learning-path key (V6.6 and earlier) */
const LEGACY_LEARNING_KEY = "learning-progress-v1";

const empty = (): Store => ({ learning: {}, section: {} });

const listeners = new Set<() => void>();

const read = (): Store => {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      return { ...empty(), ...parsed, learning: { ...parsed.learning }, section: { ...parsed.section } };
    }
  } catch {
    /* malformed — fall through to legacy import */
  }
  // one-time migration of the old learning-path key
  try {
    const legacy = localStorage.getItem(LEGACY_LEARNING_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, boolean>;
      return { learning: parsed ?? {}, section: {} };
    }
  } catch {
    /* ignore */
  }
  return empty();
};

const write = (store: Store) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota — progress is a nicety, not critical */
  }
  listeners.forEach((fn) => fn());
};

export const subscribeUserProgress = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getProgress = (kind: ProgressKind): Record<string, boolean> => read()[kind] ?? {};

export const isDone = (kind: ProgressKind, key: string): boolean => !!read()[kind]?.[key];

export const setProgress = (kind: ProgressKind, key: string, done: boolean) => {
  const store = read();
  if (!!store[kind][key] === done) return;
  if (done) store[kind][key] = true;
  else delete store[kind][key];
  write(store);
  void pushOne(kind, key, done);
};

export const toggleProgress = (kind: ProgressKind, key: string) =>
  setProgress(kind, key, !isDone(kind, key));

/** Mark a section as visited (idempotent, cheap enough to call on mount). */
export const markSectionVisited = (sectionId: string) => {
  if (isDone("section", sectionId)) return;
  setProgress("section", sectionId, true);
};

export const resetProgress = (kind: ProgressKind) => {
  const store = read();
  const keys = Object.keys(store[kind]);
  store[kind] = {};
  write(store);
  void (async () => {
    const userId = await currentUserId();
    if (!userId || keys.length === 0) return;
    await supabase.from("user_progress").delete().eq("user_id", userId).eq("kind", kind);
  })();
};

/* ── cloud sync ───────────────────────────────────────────── */

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

async function pushOne(kind: ProgressKind, key: string, done: boolean) {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    if (done) {
      await supabase
        .from("user_progress")
        .upsert(
          { user_id: userId, kind, key, done: true, updated_at: new Date().toISOString() },
          { onConflict: "user_id,kind,key" }
        );
    } else {
      await supabase
        .from("user_progress")
        .delete()
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("key", key);
    }
  } catch {
    /* offline — local copy still holds the truth */
  }
}

/**
 * Merge cloud rows into the local store and push local-only entries up.
 * Safe to call repeatedly; a no-op when signed out.
 */
export async function syncProgress(userId: string): Promise<void> {
  const local = read();
  let rows: { kind: string; key: string }[] = [];
  try {
    const { data } = await supabase
      .from("user_progress")
      .select("kind,key")
      .eq("user_id", userId)
      .eq("done", true);
    rows = data ?? [];
  } catch {
    return;
  }

  const merged = read();
  const cloudSet = new Set(rows.map((r) => `${r.kind}::${r.key}`));
  for (const r of rows) {
    if (r.kind === "learning" || r.kind === "section") merged[r.kind][r.key] = true;
  }
  write(merged);

  const missing: { user_id: string; kind: string; key: string; done: boolean }[] = [];
  (["learning", "section"] as const).forEach((kind) => {
    Object.keys(local[kind] ?? {}).forEach((key) => {
      if (!cloudSet.has(`${kind}::${key}`)) missing.push({ user_id: userId, kind, key, done: true });
    });
  });
  if (missing.length) {
    try {
      await supabase.from("user_progress").upsert(missing, { onConflict: "user_id,kind,key" });
    } catch {
      /* ignore */
    }
  }
}
