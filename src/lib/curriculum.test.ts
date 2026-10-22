import { describe, expect, it } from "vitest";
import { ALL_LESSONS, UNITS, isCorrect } from "./lesson";

describe("expanded English curriculum", () => {
  it("contains six units and at least twenty lessons", () => {
    expect(UNITS.length).toBeGreaterThanOrEqual(20);
    expect(ALL_LESSONS.length).toBeGreaterThanOrEqual(90);
  });

  it("uses unique lesson ids so progression unlocks in the right order", () => {
    const ids = ALL_LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("l1");
    expect(ids[1]).toBe("l2");
    expect(ids[2]).toBe("l3");
  });

  it("gives every lesson five complete exercises with explanations", () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.title.length, lesson.id).toBeGreaterThan(0);
      expect(lesson.exercises, lesson.id).toHaveLength(5);
      for (const exercise of lesson.exercises) {
        expect(exercise.question.length, `${lesson.id} exercise ${exercise.id}`).toBeGreaterThan(0);
        expect(exercise.explanation?.length, `${lesson.id} exercise ${exercise.id}`).toBeGreaterThan(0);
        if (exercise.type === "MCQ" || exercise.type === "LISTEN") {
          expect(exercise.options, `${lesson.id} exercise ${exercise.id}`).toContain(exercise.correct_answer);
        }
        if (exercise.type === "TYPE") {
          expect(exercise.prompt).toContain("___");
          expect(exercise.audio.toLowerCase()).toContain(exercise.correct_answer.toLowerCase());
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
});
