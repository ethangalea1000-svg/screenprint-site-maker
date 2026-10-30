import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_USER,
  UNITS,
  buildUnitTestLesson,
  completeUnitWithTest,
  isUnitCompleted,
  isUnitTestPassed,
  lessonState,
} from "./lesson";

describe("unit skip assessments", () => {
  beforeEach(() => localStorage.clear());

  it("samples every available exercise type from each lesson", () => {
    const unit = UNITS.find((item) => item.id === "u2")!;
    const test = buildUnitTestLesson(unit, true);

    expect(test.exercises).toHaveLength(unit.lessons.length * 5);
    expect(new Set(test.exercises.map((exercise) => exercise.type))).toEqual(
      new Set(["MCQ", "REORDER", "LISTEN", "TYPE", "SPEAK"]),
    );
    expect(new Set(test.exercises.map((exercise) => exercise.id)).size).toBe(test.exercises.length);
  });

  it("omits speaking only when speech recognition is unavailable", () => {
    const unit = UNITS.find((item) => item.id === "u2")!;
    const test = buildUnitTestLesson(unit, false);

    expect(test.exercises.some((exercise) => exercise.type === "SPEAK")).toBe(false);
    expect(new Set(test.exercises.map((exercise) => exercise.type))).toEqual(
      new Set(["MCQ", "REORDER", "LISTEN", "TYPE"]),
    );
  });

  it("uses an 80 percent pass threshold", () => {
    expect(isUnitTestPassed(16, 20)).toBe(true);
    expect(isUnitTestPassed(15, 20)).toBe(false);
    expect(isUnitTestPassed(0, 0)).toBe(false);
  });

  it("marks every lesson in a passed unit and awards existing XP only", () => {
    const unit = UNITS.find((item) => item.id === "u2")!;
    const updated = completeUnitWithTest(DEFAULT_USER, unit.id, 16, 20, "2026-10-30");

    expect(isUnitCompleted(updated, unit.id)).toBe(true);
    expect(updated.completed_lessons).toEqual(expect.arrayContaining(unit.lessons.map((lesson) => lesson.id)));
    expect(lessonState(updated, unit.lessons[0]!.id)).toBe("completed");
    expect(updated.lessons_completed).toBe(unit.lessons.length);
    expect(updated.total_xp).toBe(160);
    expect(lessonState(updated, "l7")).toBe("available");
  });

  it("leaves progression and XP untouched after a failed test", () => {
    const original = { ...DEFAULT_USER, completed_lessons: ["l1"], total_xp: 70 };
    const updated = completeUnitWithTest(original, "u2", 15, 20, "2026-10-30");

    expect(updated).toBe(original);
    expect(updated.completed_lessons).toEqual(["l1"]);
    expect(updated.total_xp).toBe(70);
    expect(isUnitCompleted(updated, "u2")).toBe(false);
  });

  it("does not award the same unit twice and keeps earlier completions", () => {
    const unit = UNITS.find((item) => item.id === "u2")!;
    const first = completeUnitWithTest({ ...DEFAULT_USER, completed_lessons: ["l1"] }, unit.id, 16, 20, "2026-10-30");
    const second = completeUnitWithTest(first, unit.id, 20, 20, "2026-10-31");

    expect(second).toBe(first);
    expect(second.completed_lessons).toContain("l1");
    expect(second.total_xp).toBe(160);
    expect(second.lessons_completed).toBe(unit.lessons.length);
  });
});
