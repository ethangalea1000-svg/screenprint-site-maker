import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_USER, endSession, getLesson, isCorrect, lessonState, loadUser, saveUser, missingWords, type Exercise } from "./lesson";

describe("lesson path and progress", () => {
  beforeEach(() => localStorage.clear());
  it("lesson 2 is locked until lesson 1 is done", () => {
    expect(lessonState(DEFAULT_USER, "l1")).toBe("available");
    expect(lessonState(DEFAULT_USER, "l2")).toBe("locked");
  });
  it("finishing lesson 1 unlocks lesson 2", () => {
    const u = endSession(DEFAULT_USER, 5, "2026-10-22", "l1");
    expect(lessonState(u, "l1")).toBe("completed");
    expect(lessonState(u, "l2")).toBe("available");
  });
  it("progress survives a reload", () => {
    saveUser(endSession(DEFAULT_USER, 2, "2026-10-22", "l1"));
    const u = loadUser();
    expect(u.total_xp).toBe(20);
    expect(lessonState(u, "l2")).toBe("available");
  });
  it("getLesson opens the requested lesson", () => {
    expect(getLesson("l2").id).toBe("l2");
    expect(getLesson("nope").id).toBe("l1");
  });
  it("listening exercises check the chosen option", () => {
    const ex = getLesson("l2").exercises.find((e) => e.type === "LISTEN")!;
    expect(isCorrect(ex, ex.correct_answer as string)).toBe(true);
    expect(isCorrect(ex, "pain")).toBe(false);
  });
  it("typed fallback for speaking ignores case and punctuation", () => {
    const ex = getLesson("l2").exercises.find((e) => e.type === "SPEAK") as Exercise;
    expect(isCorrect(ex, "Good morning!")).toBe(true);
    expect(isCorrect(ex, ["good evening", "Good Morning"])).toBe(true);
    expect(isCorrect(ex, "good")).toBe(false);
    expect(missingWords("Good morning", "good")).toEqual(["morning"]);
  });
});
