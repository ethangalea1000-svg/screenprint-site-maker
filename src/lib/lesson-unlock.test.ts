import { describe, expect, it } from "vitest";
import { DEFAULT_USER, endSession, lessonState } from "./lesson";

describe("lesson unlock progression", () => {
  it("locks lesson 2 for a new user", () => {
    expect(lessonState(DEFAULT_USER, "l2")).toBe("locked");
  });

  it("unlocks lesson 2 after lesson 1 is completed", () => {
    const afterLessonOne = endSession(DEFAULT_USER, 1, "2026-10-20", "l1");
    expect(lessonState(afterLessonOne, "l2")).toBe("available");
  });

  it("allows replaying a completed lesson", () => {
    const afterLessonOne = endSession(DEFAULT_USER, 1, "2026-10-20", "l1");
    expect(lessonState(afterLessonOne, "l1")).toBe("completed");
  });
});
