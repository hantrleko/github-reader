/**
 * Topic reading progress — remembers which knowledge points a reader has
 * seen (scroll-based, via TopicDetail's IntersectionObserver) so that
 * TopicCards and TopicDetail can render per-topic completion.
 *
 * Storage shape: { [topicId]: number[] }  — indices of KPs seen.
 * Kept intentionally tiny and dependency-free (localStorage + a
 * subscription so multiple components stay in sync within one tab).
 */

const KEY = "ef:topic-progress:v1";

type ProgressMap = Record<string, number[]>;

const listeners = new Set<() => void>();

const read = (): ProgressMap => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as ProgressMap;
  } catch {
    return {};
  }
};

const write = (map: ProgressMap) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota — progress is a nicety, not critical */
  }
  listeners.forEach((fn) => fn());
};

export const subscribeProgress = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** mark a knowledge point (by index) as seen for a topic */
export const markKpSeen = (topicId: string, kpIndex: number) => {
  const map = read();
  const seen = new Set(map[topicId] ?? []);
  if (seen.has(kpIndex)) return;
  seen.add(kpIndex);
  map[topicId] = [...seen].sort((a, b) => a - b);
  write(map);
};

export const getSeenCount = (topicId: string): number =>
  (read()[topicId] ?? []).length;

export const getSeenSet = (topicId: string): Set<number> =>
  new Set(read()[topicId] ?? []);

export const resetTopicProgress = (topicId: string) => {
  const map = read();
  delete map[topicId];
  write(map);
};
