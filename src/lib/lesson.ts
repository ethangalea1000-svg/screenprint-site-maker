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


type VocabularyItem = { en: string; fr: string };
type LessonTopic = { id: string; title: string; skills: string[]; words: VocabularyItem[]; phrase: string; translation: string; gap: string; gapAnswer: string; speaking: string; speakingFr: string };

/** Creates a complete, varied lesson from hand-authored vocabulary and example sentences. */
function buildTopicLesson(topic: LessonTopic, seed: number): Lesson {
  const words = topic.words;
  const word = words[seed % words.length]!;
  const distractors = words.filter((w) => w.en !== word.en).slice(0, 3);
  const choices = [word, ...distractors].map((w) => w.fr).sort((a, b) => a.localeCompare(b, "fr"));
  const answerWord = words[(seed + 1) % words.length]!;
  const sentenceWords = topic.phrase.replace(/[.!?]/g, "").split(" ");
  const reorderOptions = [...sentenceWords].sort((a, b) => a.localeCompare(b));
  if (!reorderOptions.includes("please") && reorderOptions.length < 7) reorderOptions.push("please");
  return {
    id: topic.id,
    title: topic.title,
    skills: topic.skills,
    exercises: [
      { id: 1, type: "MCQ", question: `Que signifie « ${word.en} » ?`, options: choices, correct_answer: word.fr, answer_audio: word.en, explanation: `« ${word.en} » signifie « ${word.fr} ».` },
      { id: 2, type: "REORDER", question: `Remets les mots dans l'ordre : « ${topic.translation} »`, options: reorderOptions, correct_answer: sentenceWords, answer_audio: topic.phrase, explanation: `En anglais : « ${topic.phrase} ».` },
      { id: 3, type: "LISTEN", question: "Écoute le mot et choisis sa traduction", audio: answerWord.en, options: [answerWord.fr, ...words.filter((w) => w.en !== answerWord.en).slice(0, 3).map((w) => w.fr)], correct_answer: answerWord.fr, explanation: `« ${answerWord.en} » signifie « ${answerWord.fr} ».` },
      { id: 4, type: "TYPE", question: "Écoute puis complète la phrase", audio: topic.gap.replace("___", topic.gapAnswer), prompt: topic.gap, correct_answer: topic.gapAnswer.toLowerCase(), explanation: `La phrase complète est : « ${topic.gap.replace("___", topic.gapAnswer)} ».` },
      { id: 5, type: "SPEAK", question: `Dis « ${topic.speakingFr} » en anglais`, phrase: topic.speaking, correct_answer: topic.speaking.toLowerCase(), explanation: `Répète : « ${topic.speaking} ».` },
    ],
  };
}

const EXTRA_UNITS: Unit[] = [
  {
    id: "u2", title: "Saluer et se présenter", goal: "Faire connaissance, dire son nom et être poli.",
    vocabulary: ["hello", "goodbye", "please", "sorry", "name", "friend"],
    lessons: [
      buildTopicLesson({ id:"l3", title:"Bonjour et au revoir", skills:["Salutations","Écoute"], words:[{en:"hello",fr:"bonjour"},{en:"goodbye",fr:"au revoir"},{en:"good morning",fr:"bonjour (le matin)"},{en:"good evening",fr:"bonsoir"}], phrase:"Hello, how are you?", translation:"Bonjour, comment vas-tu ?", gap:"Good ___", gapAnswer:"morning", speaking:"Goodbye", speakingFr:"Au revoir" }, 0),
      buildTopicLesson({ id:"l4", title:"Se présenter", skills:["Présentation","Expression orale"], words:[{en:"name",fr:"nom"},{en:"friend",fr:"ami"},{en:"I",fr:"je"},{en:"you",fr:"tu"}], phrase:"My name is Alex", translation:"Je m'appelle Alex", gap:"My ___ is Sam", gapAnswer:"name", speaking:"My name is Alex", speakingFr:"Je m'appelle Alex" }, 1),
      buildTopicLesson({ id:"l5", title:"Être poli", skills:["Formules utiles","Vocabulaire"], words:[{en:"please",fr:"s'il te plaît"},{en:"thank you",fr:"merci"},{en:"sorry",fr:"désolé"},{en:"excuse me",fr:"excuse-moi"}], phrase:"Thank you very much", translation:"Merci beaucoup", gap:"___ me", gapAnswer:"Excuse", speaking:"Please", speakingFr:"S'il te plaît" }, 2),
      buildTopicLesson({ id:"l6", title:"Questions simples", skills:["Questions","Compréhension"], words:[{en:"what",fr:"quoi"},{en:"where",fr:"où"},{en:"who",fr:"qui"},{en:"how",fr:"comment"}], phrase:"What is your name?", translation:"Comment t'appelles-tu ?", gap:"___ are you?", gapAnswer:"Who", speaking:"How are you?", speakingFr:"Comment vas-tu ?" }, 3),
    ],
  },
  {
    id: "u3", title: "La famille et les personnes", goal: "Parler de ses proches et décrire les personnes.",
    vocabulary: ["mother", "father", "sister", "brother", "happy", "tall"],
    lessons: [
      buildTopicLesson({ id:"l7", title:"Ma famille", skills:["Famille","Vocabulaire"], words:[{en:"mother",fr:"mère"},{en:"father",fr:"père"},{en:"sister",fr:"sœur"},{en:"brother",fr:"frère"}], phrase:"I love my family", translation:"J'aime ma famille", gap:"My ___ is kind", gapAnswer:"mother", speaking:"This is my brother", speakingFr:"Voici mon frère" }, 0),
      buildTopicLesson({ id:"l8", title:"Décrire quelqu'un", skills:["Adjectifs","Phrases simples"], words:[{en:"tall",fr:"grand"},{en:"short",fr:"petit"},{en:"kind",fr:"gentil"},{en:"funny",fr:"drôle"}], phrase:"She is very kind", translation:"Elle est très gentille", gap:"He is ___", gapAnswer:"tall", speaking:"She is funny", speakingFr:"Elle est drôle" }, 1),
      buildTopicLesson({ id:"l9", title:"Les émotions", skills:["Émotions","Expression"], words:[{en:"happy",fr:"heureux"},{en:"sad",fr:"triste"},{en:"tired",fr:"fatigué"},{en:"hungry",fr:"affamé"}], phrase:"I am happy today", translation:"Je suis heureux aujourd'hui", gap:"I am ___", gapAnswer:"tired", speaking:"I am happy", speakingFr:"Je suis heureux" }, 2),
      buildTopicLesson({ id:"l10", title:"Les pronoms et être", skills:["Grammaire","Pronoms"], words:[{en:"I am",fr:"je suis"},{en:"you are",fr:"tu es"},{en:"he is",fr:"il est"},{en:"she is",fr:"elle est"}], phrase:"He is my friend", translation:"Il est mon ami", gap:"She ___ my sister", gapAnswer:"is", speaking:"You are kind", speakingFr:"Tu es gentil" }, 3),
    ],
  },
  {
    id: "u4", title: "L'école et les loisirs", goal: "Parler des cours, du matériel et de ses activités préférées.",
    vocabulary: ["school", "book", "teacher", "read", "play", "music"],
    lessons: [
      buildTopicLesson({ id:"l11", title:"Dans la classe", skills:["École","Objets"], words:[{en:"school",fr:"école"},{en:"book",fr:"livre"},{en:"pen",fr:"stylo"},{en:"teacher",fr:"professeur"}], phrase:"I have a blue pen", translation:"J'ai un stylo bleu", gap:"Open your ___", gapAnswer:"book", speaking:"I am at school", speakingFr:"Je suis à l'école" }, 0),
      buildTopicLesson({ id:"l12", title:"Les matières", skills:["Matières scolaires","Vocabulaire"], words:[{en:"English",fr:"anglais"},{en:"maths",fr:"mathématiques"},{en:"science",fr:"sciences"},{en:"history",fr:"histoire"}], phrase:"I like English class", translation:"J'aime le cours d'anglais", gap:"I study ___", gapAnswer:"maths", speaking:"I like science", speakingFr:"J'aime les sciences" }, 1),
      buildTopicLesson({ id:"l13", title:"Les loisirs", skills:["Loisirs","Verbes"], words:[{en:"read",fr:"lire"},{en:"play",fr:"jouer"},{en:"draw",fr:"dessiner"},{en:"swim",fr:"nager"}], phrase:"I like to read", translation:"J'aime lire", gap:"I ___ football", gapAnswer:"play", speaking:"I like to draw", speakingFr:"J'aime dessiner" }, 2),
      buildTopicLesson({ id:"l14", title:"Musique et sports", skills:["Activités","Goûts"], words:[{en:"music",fr:"musique"},{en:"football",fr:"football"},{en:"dance",fr:"danser"},{en:"sing",fr:"chanter"}], phrase:"I listen to music", translation:"J'écoute de la musique", gap:"I like ___", gapAnswer:"music", speaking:"I play football", speakingFr:"Je joue au football" }, 3),
    ],
  },
  {
    id: "u5", title: "La vie quotidienne", goal: "Parler des repas, de la maison, de l'heure et de la météo.",
    vocabulary: ["breakfast", "kitchen", "morning", "sunny", "water", "sleep"],
    lessons: [
      buildTopicLesson({ id:"l15", title:"Les repas", skills:["Nourriture","Habitudes"], words:[{en:"breakfast",fr:"petit-déjeuner"},{en:"lunch",fr:"déjeuner"},{en:"dinner",fr:"dîner"},{en:"milk",fr:"lait"}], phrase:"I eat breakfast at seven", translation:"Je prends mon petit-déjeuner à sept heures", gap:"I drink ___", gapAnswer:"milk", speaking:"I am hungry", speakingFr:"J'ai faim" }, 0),
      buildTopicLesson({ id:"l16", title:"La maison", skills:["Maison","Objets"], words:[{en:"kitchen",fr:"cuisine"},{en:"bedroom",fr:"chambre"},{en:"door",fr:"porte"},{en:"window",fr:"fenêtre"}], phrase:"My bedroom is small", translation:"Ma chambre est petite", gap:"Open the ___", gapAnswer:"door", speaking:"This is my home", speakingFr:"C'est ma maison" }, 1),
      buildTopicLesson({ id:"l17", title:"La journée et l'heure", skills:["Routine","Temps"], words:[{en:"morning",fr:"matin"},{en:"afternoon",fr:"après-midi"},{en:"evening",fr:"soir"},{en:"night",fr:"nuit"}], phrase:"I wake up early", translation:"Je me réveille tôt", gap:"Good ___", gapAnswer:"night", speaking:"See you tomorrow", speakingFr:"À demain" }, 2),
      buildTopicLesson({ id:"l18", title:"La météo", skills:["Météo","Descriptions"], words:[{en:"sunny",fr:"ensoleillé"},{en:"rainy",fr:"pluvieux"},{en:"cold",fr:"froid"},{en:"hot",fr:"chaud"}], phrase:"It is sunny today", translation:"Il fait soleil aujourd'hui", gap:"It is ___ today", gapAnswer:"rainy", speaking:"It is cold", speakingFr:"Il fait froid" }, 3),
    ],
  },
  {
    id: "u6", title: "La ville et les déplacements", goal: "Demander son chemin et utiliser des phrases utiles en déplacement.",
    vocabulary: ["street", "shop", "left", "right", "ticket", "train"],
    lessons: [
      buildTopicLesson({ id:"l19", title:"Les lieux en ville", skills:["Ville","Orientation"], words:[{en:"street",fr:"rue"},{en:"shop",fr:"magasin"},{en:"park",fr:"parc"},{en:"station",fr:"gare"}], phrase:"The park is near the school", translation:"Le parc est près de l'école", gap:"Where is the ___?", gapAnswer:"station", speaking:"Where is the station?", speakingFr:"Où est la gare ?" }, 0),
      buildTopicLesson({ id:"l20", title:"Demander son chemin", skills:["Directions","Questions"], words:[{en:"left",fr:"gauche"},{en:"right",fr:"droite"},{en:"straight",fr:"tout droit"},{en:"near",fr:"près"}], phrase:"Turn left at the street", translation:"Tourne à gauche dans la rue", gap:"Turn ___", gapAnswer:"right", speaking:"Go straight", speakingFr:"Va tout droit" }, 1),
      buildTopicLesson({ id:"l21", title:"Les transports", skills:["Transports","Voyage"], words:[{en:"train",fr:"train"},{en:"bus",fr:"bus"},{en:"ticket",fr:"billet"},{en:"airport",fr:"aéroport"}], phrase:"I need a train ticket", translation:"J'ai besoin d'un billet de train", gap:"The ___ is late", gapAnswer:"train", speaking:"Where is the bus?", speakingFr:"Où est le bus ?" }, 2),
      buildTopicLesson({ id:"l22", title:"Au magasin", skills:["Achats","Politesse"], words:[{en:"price",fr:"prix"},{en:"money",fr:"argent"},{en:"cheap",fr:"bon marché"},{en:"expensive",fr:"cher"}], phrase:"How much is this?", translation:"Combien ça coûte ?", gap:"How much is ___?", gapAnswer:"this", speaking:"Can I help you?", speakingFr:"Puis-je vous aider ?" }, 3),
    ],
  },
];

UNITS.push(...EXTRA_UNITS);

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
