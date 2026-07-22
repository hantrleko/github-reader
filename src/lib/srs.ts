/**
 * SRS — SuperMemo-2 spaced repetition scheduler over the glossary deck.
 * Card states persist in localStorage; pure functions are unit-testable.
 */

export interface CardState {
  /** glossary slug */
  slug: string;
  /** easiness factor (SM-2, min 1.3) */
  ef: number;
  /** consecutive correct repetitions */
  reps: number;
  /** current interval in days */
  interval: number;
  /** epoch ms when the card is due */
  due: number;
  /** total reviews */
  seen: number;
  /** total lapses (grade < 3) */
  lapses: number;
}

/** SM-2 quality grades we expose: 1 = 忘了, 3 = 模糊, 4 = 想起来了, 5 = 秒答 */
export type Grade = 1 | 3 | 4 | 5;

const DAY = 24 * 60 * 60 * 1000;
const KEY = "eflab.srs.v1";

export function newCard(slug: string, now = Date.now()): CardState {
  return { slug, ef: 2.5, reps: 0, interval: 0, due: now, seen: 0, lapses: 0 };
}

/**
 * Pure SM-2 update.
 * grade < 3 → lapse: reps reset, card due again in 10 minutes.
 * grade ≥ 3 → interval 1d, 6d, then round(interval × EF).
 */
export function review(card: CardState, grade: Grade, now = Date.now()): CardState {
  const q = grade;
  let { ef, reps, interval, lapses } = card;

  ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (q < 3) {
    reps = 0;
    interval = 0;
    lapses += 1;
    return { ...card, ef, reps, interval, lapses, seen: card.seen + 1, due: now + 10 * 60 * 1000 };
  }

  reps += 1;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.round(interval * ef);

  return { ...card, ef, reps, interval, lapses, seen: card.seen + 1, due: now + interval * DAY };
}

/* ── persistence ───────────────────────────────────────────── */
export function loadStates(): Record<string, CardState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStates(states: Record<string, CardState>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(states));
  } catch {
    /* quota */
  }
}

/* ── queue building ────────────────────────────────────────── */
export interface QueueInfo {
  due: string[];      // slugs due for review now
  fresh: string[];    // never-seen slugs
  later: string[];    // scheduled in the future
}

export function buildQueue(
  allSlugs: string[],
  states: Record<string, CardState>,
  now = Date.now(),
  newPerSession = 8
): QueueInfo {
  const due: string[] = [];
  const fresh: string[] = [];
  const later: string[] = [];
  for (const slug of allSlugs) {
    const st = states[slug];
    if (!st || st.seen === 0) fresh.push(slug);
    else if (st.due <= now) due.push(slug);
    else later.push(slug);
  }
  // oldest due first
  due.sort((a, b) => (states[a]?.due ?? 0) - (states[b]?.due ?? 0));
  return { due, fresh: fresh.slice(0, newPerSession), later };
}

/** Simple mastery metric for the dashboard: reps>=3 → mastered. */
export function deckStats(allSlugs: string[], states: Record<string, CardState>, now = Date.now()) {
  let mastered = 0, learning = 0, fresh = 0, dueNow = 0;
  for (const slug of allSlugs) {
    const st = states[slug];
    if (!st || st.seen === 0) { fresh++; continue; }
    if (st.reps >= 3) mastered++;
    else learning++;
    if (st.due <= now) dueNow++;
  }
  return { total: allSlugs.length, mastered, learning, fresh, dueNow };
}
