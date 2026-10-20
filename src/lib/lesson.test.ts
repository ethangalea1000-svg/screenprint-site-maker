import { describe, it, expect } from "vitest";
import { DEFAULT_USER, endSession, isCorrect, loseHeart, EXERCISE_TEMPLATES } from "./lesson";

describe("lesson rules", () => {
  it("starts with 5 hearts", () => expect(DEFAULT_USER.current_hearts).toBe(5));
  it("wrong answer removes one heart, never below 0", () => {
    expect(loseHeart(DEFAULT_USER).current_hearts).toBe(4);
    expect(loseHeart({ ...DEFAULT_USER, current_hearts: 0 }).current_hearts).toBe(0);
  });
  it("session end adds 10 XP per correct answer", () => {
    expect(endSession(DEFAULT_USER, 3, "2026-10-20").total_xp).toBe(30);
  });
  it("reorder checks word order", () => {
    const ex = EXERCISE_TEMPLATES[1]!;
    expect(isCorrect(ex, ["I", "eat", "bread"])).toBe(true);
    expect(isCorrect(ex, ["eat", "I", "bread"])).toBe(false);
  });
  it("has 5 exercises", () => expect(EXERCISE_TEMPLATES).toHaveLength(5));
  it("every exercise explains its answer after a mistake", () => {
    for (const ex of EXERCISE_TEMPLATES) expect(ex.explanation?.length ?? 0).toBeGreaterThan(0);
  });
  it("streak +1 next day, reset after a gap", () => {
    const u = { ...DEFAULT_USER, streak_days: 3, last_active: "2026-10-19" };
    expect(endSession(u, 0, "2026-10-20").streak_days).toBe(4);
    expect(endSession(u, 0, "2026-10-25").streak_days).toBe(1);
  });
});
