import { describe, expect, it } from "vitest";
import { ALL_LESSONS, DEFAULT_USER, UNITS, endSession, isCorrect, lessonState, normalize } from "./lesson";

describe("expanded English curriculum", () => {
  it("contains the complete pathway across 25 units and 98 lessons", () => {
    expect(UNITS).toHaveLength(25);
    expect(ALL_LESSONS).toHaveLength(98);
  });

  it("uses unique lesson ids so progression unlocks in the right order", () => {
    const ids = ALL_LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("l1");
    expect(ids[1]).toBe("l2");
    expect(ids[2]).toBe("l3");
  });

  it("gives every lesson complete exercises with explanations", () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.title.length, lesson.id).toBeGreaterThan(0);
      expect(lesson.exercises, lesson.id).toHaveLength(lesson.id === "l2" ? 6 : 5);
      for (const exercise of lesson.exercises) {
        expect(exercise.question.length, `${lesson.id} exercise ${exercise.id}`).toBeGreaterThan(0);
        expect(exercise.explanation?.length, `${lesson.id} exercise ${exercise.id}`).toBeGreaterThan(0);
        if (exercise.type === "MCQ" || exercise.type === "LISTEN") {
          expect(exercise.options, `${lesson.id} exercise ${exercise.id}`).toContain(exercise.correct_answer);
        }
        if (exercise.type === "TYPE") {
          expect(exercise.prompt).toContain("___");
          expect(exercise.audio.toLowerCase()).toContain(exercise.correct_answer.toLowerCase());
          expect(normalize(exercise.prompt.replace("___", exercise.correct_answer))).toBe(normalize(exercise.audio));
        }
        if (exercise.type === "SPEAK") {
          expect(exercise.phrase.toLowerCase()).toBe(exercise.correct_answer.toLowerCase());
        }
        if (exercise.type === "REORDER") {
          expect(isCorrect(exercise, exercise.correct_answer)).toBe(true);
        }
      }
    }
  });

  it("includes listening, typing, speaking, vocabulary and word-order practice", () => {
    const types = new Set(ALL_LESSONS.flatMap((lesson) => lesson.exercises.map((exercise) => exercise.type)));
    expect(types).toEqual(new Set(["MCQ", "REORDER", "LISTEN", "TYPE", "SPEAK"]));
  });

  it("unlocks lessons strictly in sequence while preserving completed lessons", () => {
    expect(lessonState(DEFAULT_USER, "l1")).toBe("available");
    expect(lessonState(DEFAULT_USER, "l2")).toBe("locked");
    const afterFirst = endSession(DEFAULT_USER, 5, "2026-10-22", "l1");
    expect(lessonState(afterFirst, "l1")).toBe("completed");
    expect(lessonState(afterFirst, "l2")).toBe("available");
    expect(lessonState(afterFirst, "l3")).toBe("locked");
    const afterSecond = endSession(afterFirst, 5, "2026-10-22", "l2");
    expect(lessonState(afterSecond, "l2")).toBe("completed");
    expect(lessonState(afterSecond, "l3")).toBe("available");
  });
});
