import { describe, it, expect } from "vitest";
import { newCard, review, buildQueue, deckStats, type CardState } from "@/lib/srs";

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe("SM-2 srs", () => {
  it("new card starts due immediately with EF 2.5", () => {
    const c = newCard("iv", NOW);
    expect(c.ef).toBe(2.5);
    expect(c.due).toBe(NOW);
    expect(c.reps).toBe(0);
  });

  it("first correct review schedules 1 day out", () => {
    const c = review(newCard("iv", NOW), 4, NOW);
    expect(c.reps).toBe(1);
    expect(c.interval).toBe(1);
    expect(c.due).toBe(NOW + DAY);
  });

  it("second correct review schedules 6 days out", () => {
    let c = review(newCard("iv", NOW), 4, NOW);
    c = review(c, 4, NOW + DAY);
    expect(c.reps).toBe(2);
    expect(c.interval).toBe(6);
  });

  it("third review multiplies interval by updated EF", () => {
    let c = review(newCard("iv", NOW), 5, NOW);
    c = review(c, 5, NOW);
    c = review(c, 5, NOW);
    // EF updates before interval: 2.5 → 2.6 → 2.7 → 2.8, so interval = round(6 × 2.8)
    expect(c.interval).toBe(Math.round(6 * c.ef));
    expect(c.interval).toBeGreaterThan(6);
  });

  it("lapse (grade 1) resets reps and reschedules in 10 minutes", () => {
    let c = review(newCard("iv", NOW), 5, NOW);
    c = review(c, 5, NOW);
    c = review(c, 1, NOW);
    expect(c.reps).toBe(0);
    expect(c.lapses).toBe(1);
    expect(c.due).toBe(NOW + 10 * 60 * 1000);
  });

  it("EF never drops below 1.3", () => {
    let c = newCard("iv", NOW);
    for (let i = 0; i < 20; i++) c = review(c, 1, NOW);
    expect(c.ef).toBeGreaterThanOrEqual(1.3);
  });

  it("grade 5 raises EF, grade 3 lowers it", () => {
    const up = review(newCard("a", NOW), 5, NOW);
    const down = review(newCard("b", NOW), 3, NOW);
    expect(up.ef).toBeGreaterThan(2.5);
    expect(down.ef).toBeLessThan(2.5);
  });

  it("buildQueue separates due / fresh / later", () => {
    const states: Record<string, CardState> = {
      due1: { ...newCard("due1", NOW), seen: 1, due: NOW - DAY },
      later1: { ...newCard("later1", NOW), seen: 2, due: NOW + DAY },
    };
    const q = buildQueue(["due1", "later1", "fresh1", "fresh2"], states, NOW, 1);
    expect(q.due).toEqual(["due1"]);
    expect(q.later).toEqual(["later1"]);
    expect(q.fresh).toEqual(["fresh1"]); // capped by newPerSession=1
  });

  it("deckStats counts mastery buckets", () => {
    const states: Record<string, CardState> = {
      m: { ...newCard("m", NOW), seen: 5, reps: 3, due: NOW + DAY },
      l: { ...newCard("l", NOW), seen: 2, reps: 1, due: NOW - 1 },
    };
    const s = deckStats(["m", "l", "f"], states, NOW);
    expect(s.mastered).toBe(1);
    expect(s.learning).toBe(1);
    expect(s.fresh).toBe(1);
    expect(s.dueNow).toBe(1);
  });
});
