export type User = {
  user_id: string;
  current_hearts: number;
  total_xp: number;
  streak_days: number;
  last_active?: string;
  lessons_completed?: number;
  completed_lessons?: string[];
};

type Base = { id: number; question: string; explanation?: string; /** English text read aloud as a prompt */ audio?: string; /** English text offered for listening after the answer is checked */ answer_audio?: string };

export type Exercise =
  | (Base & { type: "MCQ"; options: string[]; correct_answer: string })
  | (Base & { type: "REORDER"; options: string[]; correct_answer: string[] })
  /** Hear English audio, pick the matching option (prompt text hidden). */
  | (Base & { type: "LISTEN"; audio: string; options: string[]; correct_answer: string })
  /** Type the missing word / what was heard. */
  | (Base & { type: "TYPE"; audio: string; prompt: string; correct_answer: string })
  /** Say the English phrase aloud; checked against speech recognition transcript (or typed fallback). */
  | (Base & { type: "SPEAK"; phrase: string; correct_answer: string });

export type Lesson = { id: string; title: string; skills: string[]; exercises: Exercise[] };
export type Unit = { id: string; title: string; goal: string; vocabulary: string[]; lessons: Lesson[] };

export const MAX_HEARTS = 5;
export const XP_PER_CORRECT = 10;
const KEY = "duo_user";

export const DEFAULT_USER: User = { user_id: "u_1", current_hearts: MAX_HEARTS, total_xp: 0, streak_days: 1 };

export const EXERCISE_TEMPLATES: Exercise[] = [
  { id: 1, type: "MCQ", question: "Comment dit-on « pomme » en anglais ?", options: ["Apple", "Orange", "Bread", "Water"], correct_answer: "Apple", answer_audio: "Apple", explanation: "« Apple » = pomme. « Bread » = pain, « Water » = eau." },
  { id: 2, type: "REORDER", question: "Traduis : « Je mange du pain »", options: ["bread", "I", "water", "eat", "the"], correct_answer: ["I", "eat", "bread"], answer_audio: "I eat bread", explanation: "Ordre anglais : sujet + verbe + complément. « du pain » se traduit simplement par « bread »." },
  { id: 3, type: "MCQ", question: "Que signifie « Good night » ?", options: ["Bonjour", "Bonne nuit", "Merci", "Au revoir"], correct_answer: "Bonne nuit", audio: "Good night", explanation: "« Good night » s'utilise au moment de se quitter le soir ou d'aller dormir." },
  { id: 4, type: "REORDER", question: "Traduis : « Elle boit de l'eau »", options: ["drinks", "water", "She", "eats", "he"], correct_answer: ["She", "drinks", "water"], answer_audio: "She drinks water", explanation: "Avec « She » (elle), le verbe prend un -s : « drinks »." },
  { id: 5, type: "MCQ", question: "Choisis la traduction de « chat »", options: ["Dog", "Bird", "Cat", "Fish"], correct_answer: "Cat", answer_audio: "Cat", explanation: "« Cat » = chat. « Dog » = chien, « Bird » = oiseau." },
];

const LISTEN_SPEAK: Exercise[] = [
  { id: 1, type: "LISTEN", question: "Écoute et choisis la traduction", audio: "water", options: ["eau", "pain", "pomme", "chat"], correct_answer: "eau", explanation: "« Water » = eau." },
  { id: 2, type: "SPEAK", question: "Dis « Bonjour » (le matin) en anglais", phrase: "Good morning", correct_answer: "good morning", explanation: "« Good morning » s'emploie jusqu'à midi environ." },
  { id: 3, type: "LISTEN", question: "Écoute et choisis la phrase entendue", audio: "I drink water", options: ["I drink water", "I eat bread", "She drinks water"], correct_answer: "I drink water", explanation: "Avec « I », le verbe ne prend pas de -s : « I drink »." },
  { id: 4, type: "TYPE", question: "Écoute puis complète la phrase", audio: "She eats an apple", prompt: "She eats an ___", correct_answer: "apple", explanation: "« an » s'utilise devant un son voyelle : « an apple »." },
  { id: 5, type: "SPEAK", question: "Dis « Merci » en anglais", phrase: "Thank you", correct_answer: "thank you", explanation: "Le « th » se prononce la langue entre les dents." },
  { id: 6, type: "LISTEN", question: "Écoute et choisis la traduction", audio: "cat", options: ["chien", "chat", "oiseau", "poisson"], correct_answer: "chat", explanation: "« Cat » = chat ; « dog » = chien." },
];

export const UNITS: Unit[] = [
  {
    id: "u1",
    title: "Premiers mots en anglais",
    goal: "Reconnaître, écrire et dire des mots et phrases simples du quotidien.",
    vocabulary: ["apple", "bread", "water", "cat", "good night", "good morning", "thank you"],
    lessons: [
      { id: "l1", title: "Mots du quotidien", skills: ["Vocabulaire", "Ordre des mots"], exercises: EXERCISE_TEMPLATES },
      { id: "l2", title: "Écouter et parler", skills: ["Compréhension orale", "Expression orale"], exercises: LISTEN_SPEAK },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);
export function getLesson(id: string): Lesson { return ALL_LESSONS.find((l) => l.id === id) ?? ALL_LESSONS[0]!; }

export function completedLessons(u: User): string[] {
  const list = new Set(u.completed_lessons ?? []);
  // Progress saved before lesson ids existed only counted completions; those were all lesson 1.
  if ((u.lessons_completed ?? 0) > 0) list.add("l1");
  return [...list];
}

export type LessonState = "completed" | "available" | "locked";
/** A lesson unlocks once the previous lesson in the path has been completed. */
export function lessonState(u: User, lessonId: string): LessonState {
  const done = completedLessons(u);
  if (done.includes(lessonId)) return "completed";
  const i = ALL_LESSONS.findIndex((l) => l.id === lessonId);
  if (i <= 0) return "available";
  return done.includes(ALL_LESSONS[i - 1]!.id) ? "available" : "locked";
}

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Words of the expected phrase missing from what was said/typed — feedback on recognised words, not phonetics. */
export function missingWords(expected: string, said: string): string[] {
  const got = new Set(normalize(said).split(" "));
  return normalize(expected).split(" ").filter((w) => w && !got.has(w));
}

export function isCorrect(ex: Exercise, answer: string | string[]): boolean {
  if (ex.type === "REORDER") return Array.isArray(answer) && answer.join(" ") === ex.correct_answer.join(" ");
  if (ex.type === "TYPE" || ex.type === "SPEAK") {
    const alts = Array.isArray(answer) ? answer : [answer];
    return alts.some((a) => normalize(a) === normalize(ex.correct_answer));
  }
  return answer === ex.correct_answer;
}

export function loseHeart(u: User): User {
  return { ...u, current_hearts: Math.max(0, u.current_hearts - 1) };
}

export function endSession(u: User, correctCount: number, today = new Date().toISOString().slice(0, 10), lessonId = "l1"): User {
  let streak = u.streak_days;
  if (u.last_active && u.last_active !== today) {
    const diff = (Date.parse(today) - Date.parse(u.last_active)) / 86400000;
    streak = diff === 1 ? streak + 1 : 1;
  }
  const completed = Array.from(new Set([...completedLessons(u), lessonId]));
  return {
    ...u,
    total_xp: u.total_xp + correctCount * XP_PER_CORRECT,
    streak_days: streak,
    last_active: today,
    lessons_completed: (u.lessons_completed ?? 0) + 1,
    completed_lessons: completed,
  };
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
