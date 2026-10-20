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
});
