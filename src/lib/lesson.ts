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



// Progressive A1–C2 pathway: foundational language through advanced independent use.
const ADVANCED_UNITS: Unit[] = [
  {
    id: "u7", title: "A1 · Les nombres et les dates", goal: "Compter, donner la date et parler des quantités.",
    vocabulary: ["one","two","three","today"],
    lessons: [
      buildTopicLesson({"id":"l23","title":"Les nombres","skills":["A1","Les nombres"],"words":[{"en":"one","fr":"un"},{"en":"two","fr":"deux"},{"en":"three","fr":"trois"},{"en":"today","fr":"aujourd'hui"}],"phrase":"I have two books","translation":"J'ai deux livres","gap":"I have three books","gapAnswer":"two","speaking":"I have three books","speakingFr":"J'ai trois livres"}, 0),
      buildTopicLesson({"id":"l24","title":"Les jours","skills":["A1","Les jours"],"words":[{"en":"one","fr":"un"},{"en":"two","fr":"deux"},{"en":"three","fr":"trois"},{"en":"today","fr":"aujourd'hui"}],"phrase":"Today is Monday","translation":"Nous sommes lundi","gap":"Today is Friday","gapAnswer":"Monday","speaking":"Today is Friday","speakingFr":"Nous sommes vendredi"}, 1),
      buildTopicLesson({"id":"l25","title":"Les mois et les dates","skills":["A1","Les mois et les dates"],"words":[{"en":"one","fr":"un"},{"en":"two","fr":"deux"},{"en":"three","fr":"trois"},{"en":"today","fr":"aujourd'hui"}],"phrase":"My birthday is in May","translation":"Mon anniversaire est en mai","gap":"My birthday is in June","gapAnswer":"May","speaking":"My birthday is in June","speakingFr":"Mon anniversaire est en juin"}, 2),
      buildTopicLesson({"id":"l26","title":"Les quantités","skills":["A1","Les quantités"],"words":[{"en":"one","fr":"un"},{"en":"two","fr":"deux"},{"en":"three","fr":"trois"},{"en":"today","fr":"aujourd'hui"}],"phrase":"I need some water","translation":"J'ai besoin d'eau","gap":"I need two tickets","gapAnswer":"water","speaking":"I need two tickets","speakingFr":"J'ai besoin de deux billets"}, 3)
    ],
  },
  {
    id: "u8", title: "A1 · Les vêtements et les couleurs", goal: "Décrire des objets et parler de ce que l'on porte.",
    vocabulary: ["shirt","shoes","blue","black"],
    lessons: [
      buildTopicLesson({"id":"l27","title":"Les couleurs","skills":["A1","Les couleurs"],"words":[{"en":"shirt","fr":"chemise"},{"en":"shoes","fr":"chaussures"},{"en":"blue","fr":"bleu"},{"en":"black","fr":"noir"}],"phrase":"My bag is blue","translation":"Mon sac est bleu","gap":"My shirt is black","gapAnswer":"blue","speaking":"My shirt is black","speakingFr":"Ma chemise est noire"}, 0),
      buildTopicLesson({"id":"l28","title":"Les vêtements","skills":["A1","Les vêtements"],"words":[{"en":"shirt","fr":"chemise"},{"en":"shoes","fr":"chaussures"},{"en":"blue","fr":"bleu"},{"en":"black","fr":"noir"}],"phrase":"I wear a shirt","translation":"Je porte une chemise","gap":"I wear black shoes","gapAnswer":"shirt","speaking":"I wear black shoes","speakingFr":"Je porte des chaussures noires"}, 1),
      buildTopicLesson({"id":"l29","title":"Décrire un objet","skills":["A1","Décrire un objet"],"words":[{"en":"shirt","fr":"chemise"},{"en":"shoes","fr":"chaussures"},{"en":"blue","fr":"bleu"},{"en":"black","fr":"noir"}],"phrase":"This bag is small","translation":"Ce sac est petit","gap":"This shirt is new","gapAnswer":"small","speaking":"This shirt is new","speakingFr":"Cette chemise est neuve"}, 2),
      buildTopicLesson({"id":"l30","title":"Acheter des vêtements","skills":["A1","Acheter des vêtements"],"words":[{"en":"shirt","fr":"chemise"},{"en":"shoes","fr":"chaussures"},{"en":"blue","fr":"bleu"},{"en":"black","fr":"noir"}],"phrase":"How much is this shirt?","translation":"Combien coûte cette chemise ?","gap":"I need new shoes","gapAnswer":"shirt","speaking":"I need new shoes","speakingFr":"J'ai besoin de nouvelles chaussures"}, 3)
    ],
  },
  {
    id: "u9", title: "A1 · Les animaux et la nature", goal: "Nommer les animaux, les paysages et décrire la nature.",
    vocabulary: ["dog","bird","tree","river"],
    lessons: [
      buildTopicLesson({"id":"l31","title":"Les animaux domestiques","skills":["A1","Les animaux domestiques"],"words":[{"en":"dog","fr":"chien"},{"en":"bird","fr":"oiseau"},{"en":"tree","fr":"arbre"},{"en":"river","fr":"rivière"}],"phrase":"My dog is friendly","translation":"Mon chien est amical","gap":"The cat is sleeping","gapAnswer":"dog","speaking":"The cat is sleeping","speakingFr":"Le chat dort"}, 0),
      buildTopicLesson({"id":"l32","title":"Les animaux sauvages","skills":["A1","Les animaux sauvages"],"words":[{"en":"dog","fr":"chien"},{"en":"bird","fr":"oiseau"},{"en":"tree","fr":"arbre"},{"en":"river","fr":"rivière"}],"phrase":"A bird can fly","translation":"Un oiseau peut voler","gap":"The horse is running","gapAnswer":"bird","speaking":"The horse is running","speakingFr":"Le cheval court"}, 1),
      buildTopicLesson({"id":"l33","title":"La nature","skills":["A1","La nature"],"words":[{"en":"dog","fr":"chien"},{"en":"bird","fr":"oiseau"},{"en":"tree","fr":"arbre"},{"en":"river","fr":"rivière"}],"phrase":"The tree is tall","translation":"L'arbre est grand","gap":"The river is long","gapAnswer":"tree","speaking":"The river is long","speakingFr":"La rivière est longue"}, 2),
      buildTopicLesson({"id":"l34","title":"Protéger la nature","skills":["A1","Protéger la nature"],"words":[{"en":"dog","fr":"chien"},{"en":"bird","fr":"oiseau"},{"en":"tree","fr":"arbre"},{"en":"river","fr":"rivière"}],"phrase":"We must protect nature","translation":"Nous devons protéger la nature","gap":"Do not leave rubbish","gapAnswer":"nature","speaking":"Do not leave rubbish","speakingFr":"Ne laisse pas de déchets"}, 3)
    ],
  },
  {
    id: "u10", title: "A2 · Les habitudes et le présent", goal: "Décrire les routines et utiliser le présent simple et continu.",
    vocabulary: ["usually","often","sometimes","now"],
    lessons: [
      buildTopicLesson({"id":"l35","title":"Ma routine","skills":["A2","Ma routine"],"words":[{"en":"usually","fr":"habituellement"},{"en":"often","fr":"souvent"},{"en":"sometimes","fr":"parfois"},{"en":"now","fr":"maintenant"}],"phrase":"I usually walk to school","translation":"Je vais habituellement à l'école à pied","gap":"I often read at night","gapAnswer":"usually","speaking":"I often read at night","speakingFr":"Je lis souvent le soir"}, 0),
      buildTopicLesson({"id":"l36","title":"Fréquence","skills":["A2","Fréquence"],"words":[{"en":"usually","fr":"habituellement"},{"en":"often","fr":"souvent"},{"en":"sometimes","fr":"parfois"},{"en":"now","fr":"maintenant"}],"phrase":"She sometimes plays tennis","translation":"Elle joue parfois au tennis","gap":"We never eat late","gapAnswer":"sometimes","speaking":"We never eat late","speakingFr":"Nous ne mangeons jamais tard"}, 1),
      buildTopicLesson({"id":"l37","title":"Ce qui se passe maintenant","skills":["A2","Ce qui se passe maintenant"],"words":[{"en":"usually","fr":"habituellement"},{"en":"often","fr":"souvent"},{"en":"sometimes","fr":"parfois"},{"en":"now","fr":"maintenant"}],"phrase":"I am studying now","translation":"J'étudie en ce moment","gap":"They are playing outside","gapAnswer":"studying","speaking":"They are playing outside","speakingFr":"Ils jouent dehors"}, 2),
      buildTopicLesson({"id":"l38","title":"Présent simple ou continu","skills":["A2","Présent simple ou continu"],"words":[{"en":"usually","fr":"habituellement"},{"en":"often","fr":"souvent"},{"en":"sometimes","fr":"parfois"},{"en":"now","fr":"maintenant"}],"phrase":"He works every day","translation":"Il travaille tous les jours","gap":"He is working now","gapAnswer":"works","speaking":"He is working now","speakingFr":"Il travaille en ce moment"}, 3)
    ],
  },
  {
    id: "u11", title: "A2 · Le passé et les souvenirs", goal: "Raconter des événements passés et parler d'expériences.",
    vocabulary: ["yesterday","last week","went","saw"],
    lessons: [
      buildTopicLesson({"id":"l39","title":"Hier","skills":["A2","Hier"],"words":[{"en":"yesterday","fr":"hier"},{"en":"last week","fr":"la semaine dernière"},{"en":"went","fr":"est allé"},{"en":"saw","fr":"a vu"}],"phrase":"I watched a film yesterday","translation":"J'ai regardé un film hier","gap":"We played outside yesterday","gapAnswer":"watched","speaking":"We played outside yesterday","speakingFr":"Nous avons joué dehors hier"}, 0),
      buildTopicLesson({"id":"l40","title":"Le week-end dernier","skills":["A2","Le week-end dernier"],"words":[{"en":"yesterday","fr":"hier"},{"en":"last week","fr":"la semaine dernière"},{"en":"went","fr":"est allé"},{"en":"saw","fr":"a vu"}],"phrase":"I went to the park","translation":"Je suis allé au parc","gap":"We visited our friends","gapAnswer":"went","speaking":"We visited our friends","speakingFr":"Nous avons rendu visite à nos amis"}, 1),
      buildTopicLesson({"id":"l41","title":"Raconter une histoire","skills":["A2","Raconter une histoire"],"words":[{"en":"yesterday","fr":"hier"},{"en":"last week","fr":"la semaine dernière"},{"en":"went","fr":"est allé"},{"en":"saw","fr":"a vu"}],"phrase":"She saw a strange bird","translation":"Elle a vu un oiseau étrange","gap":"He found an old key","gapAnswer":"saw","speaking":"He found an old key","speakingFr":"Il a trouvé une vieille clé"}, 2),
      buildTopicLesson({"id":"l42","title":"Questions au passé","skills":["A2","Questions au passé"],"words":[{"en":"yesterday","fr":"hier"},{"en":"last week","fr":"la semaine dernière"},{"en":"went","fr":"est allé"},{"en":"saw","fr":"a vu"}],"phrase":"Did you enjoy the trip?","translation":"As-tu aimé le voyage ?","gap":"Where did they go?","gapAnswer":"enjoy","speaking":"Where did they go?","speakingFr":"Où sont-ils allés ?"}, 3)
    ],
  },
  {
    id: "u12", title: "A2 · Le futur et les projets", goal: "Parler de ses intentions, prédictions et projets.",
    vocabulary: ["tomorrow","next week","will","plan"],
    lessons: [
      buildTopicLesson({"id":"l43","title":"Demain","skills":["A2","Demain"],"words":[{"en":"tomorrow","fr":"demain"},{"en":"next week","fr":"la semaine prochaine"},{"en":"will","fr":"fera"},{"en":"plan","fr":"prévoir"}],"phrase":"I will call you tomorrow","translation":"Je t'appellerai demain","gap":"We will meet at six","gapAnswer":"tomorrow","speaking":"We will meet at six","speakingFr":"Nous nous retrouverons à six heures"}, 0),
      buildTopicLesson({"id":"l44","title":"Mes projets","skills":["A2","Mes projets"],"words":[{"en":"tomorrow","fr":"demain"},{"en":"next week","fr":"la semaine prochaine"},{"en":"will","fr":"fera"},{"en":"plan","fr":"prévoir"}],"phrase":"I am going to learn English","translation":"Je vais apprendre l'anglais","gap":"She is going to travel","gapAnswer":"learn","speaking":"She is going to travel","speakingFr":"Elle va voyager"}, 1),
      buildTopicLesson({"id":"l45","title":"Faire des projets","skills":["A2","Faire des projets"],"words":[{"en":"tomorrow","fr":"demain"},{"en":"next week","fr":"la semaine prochaine"},{"en":"will","fr":"fera"},{"en":"plan","fr":"prévoir"}],"phrase":"We are meeting on Friday","translation":"Nous nous retrouvons vendredi","gap":"I plan to visit London","gapAnswer":"Friday","speaking":"I plan to visit London","speakingFr":"Je prévois de visiter Londres"}, 2),
      buildTopicLesson({"id":"l46","title":"Prédictions","skills":["A2","Prédictions"],"words":[{"en":"tomorrow","fr":"demain"},{"en":"next week","fr":"la semaine prochaine"},{"en":"will","fr":"fera"},{"en":"plan","fr":"prévoir"}],"phrase":"It will probably rain","translation":"Il va probablement pleuvoir","gap":"I think you will enjoy it","gapAnswer":"rain","speaking":"I think you will enjoy it","speakingFr":"Je pense que cela te plaira"}, 3)
    ],
  },
  {
    id: "u13", title: "A2 · La nourriture et la santé", goal: "Commander un repas, décrire des habitudes et parler de son bien-être.",
    vocabulary: ["vegetables","breakfast","healthy","pain"],
    lessons: [
      buildTopicLesson({"id":"l47","title":"Les aliments","skills":["A2","Les aliments"],"words":[{"en":"vegetables","fr":"légumes"},{"en":"breakfast","fr":"petit-déjeuner"},{"en":"healthy","fr":"sain"},{"en":"pain","fr":"douleur"}],"phrase":"I eat vegetables every day","translation":"Je mange des légumes tous les jours","gap":"Would you like some fruit?","gapAnswer":"vegetables","speaking":"Would you like some fruit?","speakingFr":"Veux-tu des fruits ?"}, 0),
      buildTopicLesson({"id":"l48","title":"Au restaurant","skills":["A2","Au restaurant"],"words":[{"en":"vegetables","fr":"légumes"},{"en":"breakfast","fr":"petit-déjeuner"},{"en":"healthy","fr":"sain"},{"en":"pain","fr":"douleur"}],"phrase":"Could I have the menu, please?","translation":"Pourrais-je avoir le menu, s'il vous plaît ?","gap":"The bill, please","gapAnswer":"menu","speaking":"The bill, please","speakingFr":"L'addition, s'il vous plaît"}, 1),
      buildTopicLesson({"id":"l49","title":"Habitudes saines","skills":["A2","Habitudes saines"],"words":[{"en":"vegetables","fr":"légumes"},{"en":"breakfast","fr":"petit-déjeuner"},{"en":"healthy","fr":"sain"},{"en":"pain","fr":"douleur"}],"phrase":"Sleep is important for health","translation":"Le sommeil est important pour la santé","gap":"I try to drink enough water","gapAnswer":"health","speaking":"I try to drink enough water","speakingFr":"J'essaie de boire assez d'eau"}, 2),
      buildTopicLesson({"id":"l50","title":"Décrire un symptôme","skills":["A2","Décrire un symptôme"],"words":[{"en":"vegetables","fr":"légumes"},{"en":"breakfast","fr":"petit-déjeuner"},{"en":"healthy","fr":"sain"},{"en":"pain","fr":"douleur"}],"phrase":"I have a headache","translation":"J'ai mal à la tête","gap":"My throat hurts","gapAnswer":"headache","speaking":"My throat hurts","speakingFr":"J'ai mal à la gorge"}, 3)
    ],
  },
  {
    id: "u14", title: "A2 · Voyager et se débrouiller", goal: "Gérer les situations courantes en voyage.",
    vocabulary: ["reservation","platform","luggage","passport"],
    lessons: [
      buildTopicLesson({"id":"l51","title":"À l'hôtel","skills":["A2","À l'hôtel"],"words":[{"en":"reservation","fr":"réservation"},{"en":"platform","fr":"quai"},{"en":"luggage","fr":"bagages"},{"en":"passport","fr":"passeport"}],"phrase":"I have a reservation","translation":"J'ai une réservation","gap":"What time is breakfast?","gapAnswer":"reservation","speaking":"What time is breakfast?","speakingFr":"À quelle heure est le petit-déjeuner ?"}, 0),
      buildTopicLesson({"id":"l52","title":"À la gare","skills":["A2","À la gare"],"words":[{"en":"reservation","fr":"réservation"},{"en":"platform","fr":"quai"},{"en":"luggage","fr":"bagages"},{"en":"passport","fr":"passeport"}],"phrase":"Which platform is it?","translation":"De quel quai s'agit-il ?","gap":"The train is delayed","gapAnswer":"platform","speaking":"The train is delayed","speakingFr":"Le train est retardé"}, 1),
      buildTopicLesson({"id":"l53","title":"À l'aéroport","skills":["A2","À l'aéroport"],"words":[{"en":"reservation","fr":"réservation"},{"en":"platform","fr":"quai"},{"en":"luggage","fr":"bagages"},{"en":"passport","fr":"passeport"}],"phrase":"Where is baggage claim?","translation":"Où est la livraison des bagages ?","gap":"Here is my passport","gapAnswer":"baggage","speaking":"Here is my passport","speakingFr":"Voici mon passeport"}, 2),
      buildTopicLesson({"id":"l54","title":"Gérer un problème","skills":["A2","Gérer un problème"],"words":[{"en":"reservation","fr":"réservation"},{"en":"platform","fr":"quai"},{"en":"luggage","fr":"bagages"},{"en":"passport","fr":"passeport"}],"phrase":"I have lost my ticket","translation":"J'ai perdu mon billet","gap":"Could you help me, please?","gapAnswer":"ticket","speaking":"Could you help me, please?","speakingFr":"Pourriez-vous m'aider, s'il vous plaît ?"}, 3)
    ],
  },
  {
    id: "u15", title: "B1 · Donner son opinion", goal: "Exprimer, justifier et nuancer son point de vue.",
    vocabulary: ["although","however","because","opinion"],
    lessons: [
      buildTopicLesson({"id":"l55","title":"Exprimer une opinion","skills":["B1","Exprimer une opinion"],"words":[{"en":"although","fr":"bien que"},{"en":"however","fr":"cependant"},{"en":"because","fr":"parce que"},{"en":"opinion","fr":"opinion"}],"phrase":"In my opinion, this is useful","translation":"À mon avis, c'est utile","gap":"I believe we should try","gapAnswer":"opinion","speaking":"I believe we should try","speakingFr":"Je crois que nous devrions essayer"}, 0),
      buildTopicLesson({"id":"l56","title":"Justifier ses idées","skills":["B1","Justifier ses idées"],"words":[{"en":"although","fr":"bien que"},{"en":"however","fr":"cependant"},{"en":"because","fr":"parce que"},{"en":"opinion","fr":"opinion"}],"phrase":"I agree because it is fair","translation":"Je suis d'accord parce que c'est juste","gap":"This matters ___ everyone is affected","gapAnswer":"because","speaking":"This matters because everyone is affected","speakingFr":"C'est important car tout le monde est concerné"}, 1),
      buildTopicLesson({"id":"l57","title":"Nuancer","skills":["B1","Nuancer"],"words":[{"en":"although","fr":"bien que"},{"en":"however","fr":"cependant"},{"en":"because","fr":"parce que"},{"en":"opinion","fr":"opinion"}],"phrase":"Although it is difficult, it is possible","translation":"Bien que ce soit difficile, c'est possible","gap":"The plan is good; however, it is expensive","gapAnswer":"Although","speaking":"The plan is good; however, it is expensive","speakingFr":"Le plan est bon ; cependant, il est coûteux"}, 2),
      buildTopicLesson({"id":"l58","title":"Comparer des options","skills":["B1","Comparer des options"],"words":[{"en":"although","fr":"bien que"},{"en":"however","fr":"cependant"},{"en":"because","fr":"parce que"},{"en":"opinion","fr":"opinion"}],"phrase":"This option is more reliable","translation":"Cette option est plus fiable","gap":"The second choice is less expensive","gapAnswer":"reliable","speaking":"The second choice is less expensive","speakingFr":"Le deuxième choix est moins cher"}, 3)
    ],
  },
  {
    id: "u16", title: "B1 · Raconter et décrire", goal: "Relier les événements et raconter des expériences avec précision.",
    vocabulary: ["while","suddenly","already","yet"],
    lessons: [
      buildTopicLesson({"id":"l59","title":"Actions simultanées","skills":["B1","Actions simultanées"],"words":[{"en":"while","fr":"pendant que"},{"en":"suddenly","fr":"soudain"},{"en":"already","fr":"déjà"},{"en":"yet","fr":"encore"}],"phrase":"I was reading while she cooked","translation":"Je lisais pendant qu'elle cuisinait","gap":"They were talking when I arrived","gapAnswer":"while","speaking":"They were talking when I arrived","speakingFr":"Ils parlaient quand je suis arrivé"}, 0),
      buildTopicLesson({"id":"l60","title":"Un événement inattendu","skills":["B1","Un événement inattendu"],"words":[{"en":"while","fr":"pendant que"},{"en":"suddenly","fr":"soudain"},{"en":"already","fr":"déjà"},{"en":"yet","fr":"encore"}],"phrase":"Suddenly, the lights went out","translation":"Soudain, les lumières se sont éteintes","gap":"We were walking when it started raining","gapAnswer":"Suddenly","speaking":"We were walking when it started raining","speakingFr":"Nous marchions quand il s'est mis à pleuvoir"}, 1),
      buildTopicLesson({"id":"l61","title":"Expériences vécues","skills":["B1","Expériences vécues"],"words":[{"en":"while","fr":"pendant que"},{"en":"suddenly","fr":"soudain"},{"en":"already","fr":"déjà"},{"en":"yet","fr":"encore"}],"phrase":"I have already visited Scotland","translation":"J'ai déjà visité l'Écosse","gap":"Have you ever tried surfing?","gapAnswer":"already","speaking":"Have you ever tried surfing?","speakingFr":"As-tu déjà essayé le surf ?"}, 2),
      buildTopicLesson({"id":"l62","title":"Depuis et pendant","skills":["B1","Depuis et pendant"],"words":[{"en":"while","fr":"pendant que"},{"en":"suddenly","fr":"soudain"},{"en":"already","fr":"déjà"},{"en":"yet","fr":"encore"}],"phrase":"I have lived here for two years","translation":"J'habite ici depuis deux ans","gap":"She has known him since childhood","gapAnswer":"for","speaking":"She has known him since childhood","speakingFr":"Elle le connaît depuis l'enfance"}, 3)
    ],
  },
  {
    id: "u17", title: "B1 · Anglais scolaire et professionnel", goal: "Écrire des messages, expliquer un processus et participer à une réunion.",
    vocabulary: ["deadline","meeting","apply","experience"],
    lessons: [
      buildTopicLesson({"id":"l63","title":"Écrire un courriel","skills":["B1","Écrire un courriel"],"words":[{"en":"deadline","fr":"date limite"},{"en":"meeting","fr":"réunion"},{"en":"apply","fr":"postuler"},{"en":"experience","fr":"expérience"}],"phrase":"I am writing to ask for information","translation":"Je vous écris pour demander des informations","gap":"Thank you for your reply","gapAnswer":"information","speaking":"Thank you for your reply","speakingFr":"Merci pour votre réponse"}, 0),
      buildTopicLesson({"id":"l64","title":"Présenter un projet","skills":["B1","Présenter un projet"],"words":[{"en":"deadline","fr":"date limite"},{"en":"meeting","fr":"réunion"},{"en":"apply","fr":"postuler"},{"en":"experience","fr":"expérience"}],"phrase":"Our goal is to improve access","translation":"Notre objectif est d'améliorer l'accès","gap":"The project has three stages","gapAnswer":"goal","speaking":"The project has three stages","speakingFr":"Le projet comporte trois étapes"}, 1),
      buildTopicLesson({"id":"l65","title":"Candidature et entretien","skills":["B1","Candidature et entretien"],"words":[{"en":"deadline","fr":"date limite"},{"en":"meeting","fr":"réunion"},{"en":"apply","fr":"postuler"},{"en":"experience","fr":"expérience"}],"phrase":"I would like to apply for this role","translation":"Je souhaiterais postuler à ce poste","gap":"I have experience working in a team","gapAnswer":"apply","speaking":"I have experience working in a team","speakingFr":"J'ai de l'expérience dans le travail en équipe"}, 2),
      buildTopicLesson({"id":"l66","title":"Réunion et délais","skills":["B1","Réunion et délais"],"words":[{"en":"deadline","fr":"date limite"},{"en":"meeting","fr":"réunion"},{"en":"apply","fr":"postuler"},{"en":"experience","fr":"expérience"}],"phrase":"Could we move the meeting to Friday?","translation":"Pourrions-nous déplacer la réunion à vendredi ?","gap":"The deadline is next Monday","gapAnswer":"meeting","speaking":"The deadline is next Monday","speakingFr":"La date limite est lundi prochain"}, 3)
    ],
  },
  {
    id: "u18", title: "B2 · Argumenter et débattre", goal: "Développer un argument, répondre aux objections et synthétiser.",
    vocabulary: ["evidence","claim","whereas","nevertheless"],
    lessons: [
      buildTopicLesson({"id":"l67","title":"Construire un argument","skills":["B2","Construire un argument"],"words":[{"en":"evidence","fr":"preuve"},{"en":"claim","fr":"affirmation"},{"en":"whereas","fr":"tandis que"},{"en":"nevertheless","fr":"néanmoins"}],"phrase":"The evidence supports this conclusion","translation":"Les preuves étayent cette conclusion","gap":"This claim needs further investigation","gapAnswer":"evidence","speaking":"This claim needs further investigation","speakingFr":"Cette affirmation nécessite une enquête plus approfondie"}, 0),
      buildTopicLesson({"id":"l68","title":"Répondre à une objection","skills":["B2","Répondre à une objection"],"words":[{"en":"evidence","fr":"preuve"},{"en":"claim","fr":"affirmation"},{"en":"whereas","fr":"tandis que"},{"en":"nevertheless","fr":"néanmoins"}],"phrase":"I understand your concern; nevertheless, the risks remain","translation":"Je comprends votre inquiétude ; néanmoins, les risques demeurent","gap":"That is a valid point, but it overlooks the cost","gapAnswer":"nevertheless","speaking":"That is a valid point, but it overlooks the cost","speakingFr":"C'est un argument valable, mais il néglige le coût"}, 1),
      buildTopicLesson({"id":"l69","title":"Comparer des perspectives","skills":["B2","Comparer des perspectives"],"words":[{"en":"evidence","fr":"preuve"},{"en":"claim","fr":"affirmation"},{"en":"whereas","fr":"tandis que"},{"en":"nevertheless","fr":"néanmoins"}],"phrase":"Some prefer speed, whereas others value accuracy","translation":"Certains préfèrent la rapidité, tandis que d'autres privilégient la précision","gap":"Both approaches have distinct advantages","gapAnswer":"whereas","speaking":"Both approaches have distinct advantages","speakingFr":"Les deux approches ont des avantages distincts"}, 2),
      buildTopicLesson({"id":"l70","title":"Synthétiser une discussion","skills":["B2","Synthétiser une discussion"],"words":[{"en":"evidence","fr":"preuve"},{"en":"claim","fr":"affirmation"},{"en":"whereas","fr":"tandis que"},{"en":"nevertheless","fr":"néanmoins"}],"phrase":"Overall, the benefits outweigh the drawbacks","translation":"Dans l'ensemble, les avantages l'emportent sur les inconvénients","gap":"The available evidence remains inconclusive","gapAnswer":"Overall","speaking":"The available evidence remains inconclusive","speakingFr":"Les preuves disponibles ne permettent pas encore de conclure"}, 3)
    ],
  },
  {
    id: "u19", title: "B2 · Médias, société et environnement", goal: "Analyser des sujets de société et distinguer faits, opinions et sources.",
    vocabulary: ["source","bias","sustainable","impact"],
    lessons: [
      buildTopicLesson({"id":"l71","title":"Lire les médias avec recul","skills":["B2","Lire les médias avec recul"],"words":[{"en":"source","fr":"source"},{"en":"bias","fr":"biais"},{"en":"sustainable","fr":"durable"},{"en":"impact","fr":"impact"}],"phrase":"Check the source before sharing the story","translation":"Vérifie la source avant de partager l'information","gap":"The headline may be misleading","gapAnswer":"source","speaking":"The headline may be misleading","speakingFr":"Le titre peut être trompeur"}, 0),
      buildTopicLesson({"id":"l72","title":"Faits et opinions","skills":["B2","Faits et opinions"],"words":[{"en":"source","fr":"source"},{"en":"bias","fr":"biais"},{"en":"sustainable","fr":"durable"},{"en":"impact","fr":"impact"}],"phrase":"This is an opinion rather than a verified fact","translation":"Il s'agit d'une opinion plutôt que d'un fait vérifié","gap":"We need reliable evidence","gapAnswer":"opinion","speaking":"We need reliable evidence","speakingFr":"Nous avons besoin de preuves fiables"}, 1),
      buildTopicLesson({"id":"l73","title":"Environnement","skills":["B2","Environnement"],"words":[{"en":"source","fr":"source"},{"en":"bias","fr":"biais"},{"en":"sustainable","fr":"durable"},{"en":"impact","fr":"impact"}],"phrase":"Renewable energy can reduce emissions","translation":"Les énergies renouvelables peuvent réduire les émissions","gap":"Sustainable choices have a long-term impact","gapAnswer":"emissions","speaking":"Sustainable choices have a long-term impact","speakingFr":"Les choix durables ont un impact à long terme"}, 2),
      buildTopicLesson({"id":"l74","title":"Technologie et société","skills":["B2","Technologie et société"],"words":[{"en":"source","fr":"source"},{"en":"bias","fr":"biais"},{"en":"sustainable","fr":"durable"},{"en":"impact","fr":"impact"}],"phrase":"Technology changes how people communicate","translation":"La technologie transforme la façon dont les gens communiquent","gap":"Privacy should be considered from the start","gapAnswer":"communicate","speaking":"Privacy should be considered from the start","speakingFr":"La vie privée doit être prise en compte dès le départ"}, 3)
    ],
  },
  {
    id: "u20", title: "B2 · Anglais naturel et expressions", goal: "Comprendre les expressions courantes et le langage conversationnel.",
    vocabulary: ["figure out","turn out","get along","run out"],
    lessons: [
      buildTopicLesson({"id":"l75","title":"Phrasal verbs du quotidien","skills":["B2","Phrasal verbs du quotidien"],"words":[{"en":"figure out","fr":"comprendre / trouver"},{"en":"turn out","fr":"se révéler"},{"en":"get along","fr":"bien s'entendre"},{"en":"run out","fr":"manquer de"}],"phrase":"We need to figure out what happened","translation":"Nous devons comprendre ce qui s'est passé","gap":"I cannot figure out this problem","gapAnswer":"figure out","speaking":"I cannot figure out this problem","speakingFr":"Je n'arrive pas à résoudre ce problème"}, 0),
      buildTopicLesson({"id":"l76","title":"Résultats inattendus","skills":["B2","Résultats inattendus"],"words":[{"en":"figure out","fr":"comprendre / trouver"},{"en":"turn out","fr":"se révéler"},{"en":"get along","fr":"bien s'entendre"},{"en":"run out","fr":"manquer de"}],"phrase":"It turned out better than expected","translation":"Cela s'est révélé meilleur que prévu","gap":"The meeting turned out to be useful","gapAnswer":"turned out","speaking":"The meeting turned out to be useful","speakingFr":"La réunion s'est révélée utile"}, 1),
      buildTopicLesson({"id":"l77","title":"Relations et coopération","skills":["B2","Relations et coopération"],"words":[{"en":"figure out","fr":"comprendre / trouver"},{"en":"turn out","fr":"se révéler"},{"en":"get along","fr":"bien s'entendre"},{"en":"run out","fr":"manquer de"}],"phrase":"I get along well with my colleagues","translation":"Je m'entends bien avec mes collègues","gap":"They do not always get along","gapAnswer":"get along","speaking":"They do not always get along","speakingFr":"Ils ne s'entendent pas toujours"}, 2),
      buildTopicLesson({"id":"l78","title":"Manque et imprévus","skills":["B2","Manque et imprévus"],"words":[{"en":"figure out","fr":"comprendre / trouver"},{"en":"turn out","fr":"se révéler"},{"en":"get along","fr":"bien s'entendre"},{"en":"run out","fr":"manquer de"}],"phrase":"We have run out of time","translation":"Nous n'avons plus de temps","gap":"The car ran out of fuel","gapAnswer":"run out","speaking":"The car ran out of fuel","speakingFr":"La voiture est tombée en panne de carburant"}, 3)
    ],
  },
  {
    id: "u21", title: "C1 · Nuance et précision", goal: "Maîtriser le registre, la nuance et les formulations précises.",
    vocabulary: ["subtle","compelling","ambiguous","assumption"],
    lessons: [
      buildTopicLesson({"id":"l79","title":"Nuancer une affirmation","skills":["C1","Nuancer une affirmation"],"words":[{"en":"subtle","fr":"subtil"},{"en":"compelling","fr":"convaincant"},{"en":"ambiguous","fr":"ambigu"},{"en":"assumption","fr":"supposition"}],"phrase":"The findings suggest a subtle shift in attitudes","translation":"Les résultats suggèrent une évolution subtile des attitudes","gap":"The distinction is more complex than it first appears","gapAnswer":"subtle","speaking":"The distinction is more complex than it first appears","speakingFr":"La distinction est plus complexe qu'il n'y paraît"}, 0),
      buildTopicLesson({"id":"l80","title":"Évaluer un argument","skills":["C1","Évaluer un argument"],"words":[{"en":"subtle","fr":"subtil"},{"en":"compelling","fr":"convaincant"},{"en":"ambiguous","fr":"ambigu"},{"en":"assumption","fr":"supposition"}],"phrase":"She presented a compelling case for reform","translation":"Elle a présenté un argument convaincant en faveur de la réforme","gap":"The evidence is persuasive but not definitive","gapAnswer":"compelling","speaking":"The evidence is persuasive but not definitive","speakingFr":"Les preuves sont convaincantes, mais pas définitives"}, 1),
      buildTopicLesson({"id":"l81","title":"Lever une ambiguïté","skills":["C1","Lever une ambiguïté"],"words":[{"en":"subtle","fr":"subtil"},{"en":"compelling","fr":"convaincant"},{"en":"ambiguous","fr":"ambigu"},{"en":"assumption","fr":"supposition"}],"phrase":"The wording is ambiguous and open to interpretation","translation":"La formulation est ambiguë et sujette à interprétation","gap":"We should clarify what the term means","gapAnswer":"ambiguous","speaking":"We should clarify what the term means","speakingFr":"Nous devrions préciser le sens de ce terme"}, 2),
      buildTopicLesson({"id":"l82","title":"Examiner les présupposés","skills":["C1","Examiner les présupposés"],"words":[{"en":"subtle","fr":"subtil"},{"en":"compelling","fr":"convaincant"},{"en":"ambiguous","fr":"ambigu"},{"en":"assumption","fr":"supposition"}],"phrase":"The argument rests on an untested assumption","translation":"L'argument repose sur une supposition non vérifiée","gap":"That conclusion does not necessarily follow","gapAnswer":"assumption","speaking":"That conclusion does not necessarily follow","speakingFr":"Cette conclusion ne découle pas nécessairement de ce qui précède"}, 3)
    ],
  },
  {
    id: "u22", title: "C1 · Écriture et synthèse avancées", goal: "Structurer des textes complexes et synthétiser plusieurs sources.",
    vocabulary: ["whereby","thereby","notwithstanding","comprehensive"],
    lessons: [
      buildTopicLesson({"id":"l83","title":"Connecteurs avancés","skills":["C1","Connecteurs avancés"],"words":[{"en":"whereby","fr":"par lequel"},{"en":"thereby","fr":"de ce fait"},{"en":"notwithstanding","fr":"nonobstant"},{"en":"comprehensive","fr":"exhaustif"}],"phrase":"The system was redesigned, thereby improving reliability","translation":"Le système a été repensé, améliorant ainsi sa fiabilité","gap":"The policy establishes a framework whereby teams can cooperate","gapAnswer":"thereby","speaking":"The policy establishes a framework whereby teams can cooperate","speakingFr":"La politique établit un cadre permettant aux équipes de coopérer"}, 0),
      buildTopicLesson({"id":"l84","title":"Synthèse de sources","skills":["C1","Synthèse de sources"],"words":[{"en":"whereby","fr":"par lequel"},{"en":"thereby","fr":"de ce fait"},{"en":"notwithstanding","fr":"nonobstant"},{"en":"comprehensive","fr":"exhaustif"}],"phrase":"Taken together, the studies point to a broader trend","translation":"Prises ensemble, les études indiquent une tendance plus large","gap":"The sources differ in scope and methodology","gapAnswer":"Taken","speaking":"The sources differ in scope and methodology","speakingFr":"Les sources diffèrent par leur portée et leur méthodologie"}, 1),
      buildTopicLesson({"id":"l85","title":"Registre formel","skills":["C1","Registre formel"],"words":[{"en":"whereby","fr":"par lequel"},{"en":"thereby","fr":"de ce fait"},{"en":"notwithstanding","fr":"nonobstant"},{"en":"comprehensive","fr":"exhaustif"}],"phrase":"Notwithstanding these limitations, the results are significant","translation":"Nonobstant ces limites, les résultats sont significatifs","gap":"The proposal warrants further consideration","gapAnswer":"Notwithstanding","speaking":"The proposal warrants further consideration","speakingFr":"La proposition mérite un examen plus approfondi"}, 2),
      buildTopicLesson({"id":"l86","title":"Rédiger une conclusion","skills":["C1","Rédiger une conclusion"],"words":[{"en":"whereby","fr":"par lequel"},{"en":"thereby","fr":"de ce fait"},{"en":"notwithstanding","fr":"nonobstant"},{"en":"comprehensive","fr":"exhaustif"}],"phrase":"A comprehensive assessment requires more evidence","translation":"Une évaluation exhaustive nécessite davantage de preuves","gap":"The findings should be interpreted with caution","gapAnswer":"comprehensive","speaking":"The findings should be interpreted with caution","speakingFr":"Les résultats doivent être interprétés avec prudence"}, 3)
    ],
  },
  {
    id: "u23", title: "C1 · Débats complexes et négociation", goal: "Négocier, reformuler et gérer les désaccords avec tact.",
    vocabulary: ["concession","trade-off","feasible","consensus"],
    lessons: [
      buildTopicLesson({"id":"l87","title":"Faire une concession","skills":["C1","Faire une concession"],"words":[{"en":"concession","fr":"concession"},{"en":"trade-off","fr":"compromis"},{"en":"feasible","fr":"réalisable"},{"en":"consensus","fr":"consensus"}],"phrase":"I accept that point, although the wider issue remains","translation":"J'accepte ce point, bien que la question générale demeure","gap":"That is a reasonable concession","gapAnswer":"although","speaking":"That is a reasonable concession","speakingFr":"C'est une concession raisonnable"}, 0),
      buildTopicLesson({"id":"l88","title":"Évaluer un compromis","skills":["C1","Évaluer un compromis"],"words":[{"en":"concession","fr":"concession"},{"en":"trade-off","fr":"compromis"},{"en":"feasible","fr":"réalisable"},{"en":"consensus","fr":"consensus"}],"phrase":"Every solution involves a trade-off","translation":"Toute solution implique un compromis","gap":"We must balance cost against reliability","gapAnswer":"trade-off","speaking":"We must balance cost against reliability","speakingFr":"Nous devons équilibrer le coût et la fiabilité"}, 1),
      buildTopicLesson({"id":"l89","title":"Tester la faisabilité","skills":["C1","Tester la faisabilité"],"words":[{"en":"concession","fr":"concession"},{"en":"trade-off","fr":"compromis"},{"en":"feasible","fr":"réalisable"},{"en":"consensus","fr":"consensus"}],"phrase":"The proposal is feasible within the current budget","translation":"La proposition est réalisable dans le budget actuel","gap":"We need a realistic implementation plan","gapAnswer":"feasible","speaking":"We need a realistic implementation plan","speakingFr":"Nous avons besoin d'un plan de mise en œuvre réaliste"}, 2),
      buildTopicLesson({"id":"l90","title":"Trouver un accord","skills":["C1","Trouver un accord"],"words":[{"en":"concession","fr":"concession"},{"en":"trade-off","fr":"compromis"},{"en":"feasible","fr":"réalisable"},{"en":"consensus","fr":"consensus"}],"phrase":"We have reached a broad consensus","translation":"Nous sommes parvenus à un large consensus","gap":"Let us identify the points we agree on","gapAnswer":"consensus","speaking":"Let us identify the points we agree on","speakingFr":"Identifions les points sur lesquels nous sommes d'accord"}, 3)
    ],
  },
  {
    id: "u24", title: "C2 · Maîtrise et interprétation", goal: "Interpréter l'implicite, l'ironie et les nuances culturelles.",
    vocabulary: ["understatement","irony","connotation","ambiguity"],
    lessons: [
      buildTopicLesson({"id":"l91","title":"Comprendre l'implicite","skills":["C2","Comprendre l'implicite"],"words":[{"en":"understatement","fr":"litote"},{"en":"irony","fr":"ironie"},{"en":"connotation","fr":"connotation"},{"en":"ambiguity","fr":"ambiguïté"}],"phrase":"The understatement makes the criticism more pointed","translation":"La litote rend la critique plus incisive","gap":"The speaker implies more than they explicitly state","gapAnswer":"understatement","speaking":"The speaker implies more than they explicitly state","speakingFr":"Le locuteur suggère davantage qu'il ne dit explicitement"}, 0),
      buildTopicLesson({"id":"l92","title":"Ironie et contexte","skills":["C2","Ironie et contexte"],"words":[{"en":"understatement","fr":"litote"},{"en":"irony","fr":"ironie"},{"en":"connotation","fr":"connotation"},{"en":"ambiguity","fr":"ambiguïté"}],"phrase":"Whether the remark is ironic depends on the context","translation":"Le caractère ironique de la remarque dépend du contexte","gap":"Tone can reverse the literal meaning","gapAnswer":"ironic","speaking":"Tone can reverse the literal meaning","speakingFr":"Le ton peut inverser le sens littéral"}, 1),
      buildTopicLesson({"id":"l93","title":"Connotations","skills":["C2","Connotations"],"words":[{"en":"understatement","fr":"litote"},{"en":"irony","fr":"ironie"},{"en":"connotation","fr":"connotation"},{"en":"ambiguity","fr":"ambiguïté"}],"phrase":"The word carries a negative connotation in this context","translation":"Dans ce contexte, le mot a une connotation négative","gap":"The two terms are similar but not interchangeable","gapAnswer":"connotation","speaking":"The two terms are similar but not interchangeable","speakingFr":"Les deux termes sont proches, mais pas interchangeables"}, 2),
      buildTopicLesson({"id":"l94","title":"Ambiguïté maîtrisée","skills":["C2","Ambiguïté maîtrisée"],"words":[{"en":"understatement","fr":"litote"},{"en":"irony","fr":"ironie"},{"en":"connotation","fr":"connotation"},{"en":"ambiguity","fr":"ambiguïté"}],"phrase":"The ambiguity appears deliberate rather than accidental","translation":"L'ambiguïté semble délibérée plutôt qu'accidentelle","gap":"The passage invites more than one interpretation","gapAnswer":"ambiguity","speaking":"The passage invites more than one interpretation","speakingFr":"Le passage se prête à plusieurs interprétations"}, 3)
    ],
  },
  {
    id: "u25", title: "C2 · Anglais authentique et autonomie", goal: "Travailler avec des documents authentiques, reformuler et affiner son style.",
    vocabulary: ["idiomatic","register","paraphrase","eloquent"],
    lessons: [
      buildTopicLesson({"id":"l95","title":"Expressions idiomatiques","skills":["C2","Expressions idiomatiques"],"words":[{"en":"idiomatic","fr":"idiomatique"},{"en":"register","fr":"registre"},{"en":"paraphrase","fr":"paraphrase"},{"en":"eloquent","fr":"éloquent"}],"phrase":"A literal translation may miss the idiomatic meaning","translation":"Une traduction littérale peut manquer le sens idiomatique","gap":"The expression is common in informal speech","gapAnswer":"idiomatic","speaking":"The expression is common in informal speech","speakingFr":"L'expression est courante dans le langage familier"}, 0),
      buildTopicLesson({"id":"l96","title":"Adapter son registre","skills":["C2","Adapter son registre"],"words":[{"en":"idiomatic","fr":"idiomatique"},{"en":"register","fr":"registre"},{"en":"paraphrase","fr":"paraphrase"},{"en":"eloquent","fr":"éloquent"}],"phrase":"The register should match the audience","translation":"Le registre doit correspondre au public","gap":"This phrasing is too informal for a formal report","gapAnswer":"register","speaking":"This phrasing is too informal for a formal report","speakingFr":"Cette formulation est trop familière pour un rapport formel"}, 1),
      buildTopicLesson({"id":"l97","title":"Reformuler sans déformer","skills":["C2","Reformuler sans déformer"],"words":[{"en":"idiomatic","fr":"idiomatique"},{"en":"register","fr":"registre"},{"en":"paraphrase","fr":"paraphrase"},{"en":"eloquent","fr":"éloquent"}],"phrase":"Paraphrase the argument without changing its meaning","translation":"Reformule l'argument sans en changer le sens","gap":"A concise summary preserves the central claim","gapAnswer":"Paraphrase","speaking":"A concise summary preserves the central claim","speakingFr":"Un résumé concis préserve l'idée centrale"}, 2),
      buildTopicLesson({"id":"l98","title":"Style et éloquence","skills":["C2","Style et éloquence"],"words":[{"en":"idiomatic","fr":"idiomatique"},{"en":"register","fr":"registre"},{"en":"paraphrase","fr":"paraphrase"},{"en":"eloquent","fr":"éloquent"}],"phrase":"The conclusion is concise, precise, and eloquent","translation":"La conclusion est concise, précise et éloquente","gap":"Read widely and revise your own writing","gapAnswer":"eloquent","speaking":"Read widely and revise your own writing","speakingFr":"Lis beaucoup et révise tes propres textes"}, 3)
    ],
  }
];

UNITS.push(...ADVANCED_UNITS);

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
