export type User = { user_id: string; current_hearts: number; total_xp: number; streak_days: number; last_active?: string; lessons_completed?: number };

export type Exercise =
  | { id: number; type: "MCQ"; question: string; options: string[]; correct_answer: string; explanation?: string }
  | { id: number; type: "REORDER"; question: string; options: string[]; correct_answer: string[]; explanation?: string };

export const MAX_HEARTS = 5;
export const XP_PER_CORRECT = 10;
const KEY = "duo_user";

export const DEFAULT_USER: User = { user_id: "u_1", current_hearts: MAX_HEARTS, total_xp: 0, streak_days: 1 };

export const EXERCISE_TEMPLATES: Exercise[] = [
  { id: 1, type: "MCQ", question: "Comment dit-on « pomme » en anglais ?", options: ["Apple", "Orange", "Bread", "Water"], correct_answer: "Apple", explanation: "« Apple » = pomme. « Bread » = pain, « Water » = eau." },
  { id: 2, type: "REORDER", question: "Traduis : « Je mange du pain »", options: ["bread", "I", "water", "eat", "the"], correct_answer: ["I", "eat", "bread"], explanation: "Ordre anglais : sujet + verbe + complément. « du pain » se traduit simplement par « bread »." },
  { id: 3, type: "MCQ", question: "Que signifie « Good night » ?", options: ["Bonjour", "Bonne nuit", "Merci", "Au revoir"], correct_answer: "Bonne nuit", explanation: "« Good night » s'utilise au moment de se quitter le soir ou d'aller dormir." },
  { id: 4, type: "REORDER", question: "Traduis : « Elle boit de l'eau »", options: ["drinks", "water", "She", "eats", "he"], correct_answer: ["She", "drinks", "water"], explanation: "Avec « She » (elle), le verbe prend un -s : « drinks »." },
  { id: 5, type: "MCQ", question: "Choisis la traduction de « chat »", options: ["Dog", "Bird", "Cat", "Fish"], correct_answer: "Cat", explanation: "« Cat » = chat. « Dog » = chien, « Bird » = oiseau." },
];

export function isCorrect(ex: Exercise, answer: string | string[]): boolean {
  if (ex.type === "MCQ") return answer === ex.correct_answer;
  return Array.isArray(answer) && answer.join(" ") === ex.correct_answer.join(" ");
}

export function loseHeart(u: User): User {
  return { ...u, current_hearts: Math.max(0, u.current_hearts - 1) };
}

export function endSession(u: User, correctCount: number, today = new Date().toISOString().slice(0, 10)): User {
  let streak = u.streak_days;
  if (u.last_active && u.last_active !== today) {
    const diff = (Date.parse(today) - Date.parse(u.last_active)) / 86400000;
    streak = diff === 1 ? streak + 1 : 1;
  }
  return { ...u, total_xp: u.total_xp + correctCount * XP_PER_CORRECT, streak_days: streak, last_active: today, lessons_completed: (u.lessons_completed ?? 0) + 1 };
}

export function loadUser(): User {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_USER, ...JSON.parse(raw) };
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(DEFAULT_USER));
  return DEFAULT_USER;
}
export function saveUser(u: User) {
  localStorage.setItem(KEY, JSON.stringify(u));
}
