import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Flame, Zap, X, Mic, Square } from "lucide-react";
import {
  MAX_HEARTS, XP_PER_CORRECT, endSession, isCorrect, loadUser, loseHeart, missingWords, saveUser, type Lesson, type User,
} from "@/lib/lesson";
import { canRecognize, listen, stopSpeaking, type ListenError } from "@/lib/speech";
import { SpeakButton } from "@/components/SpeakButton";

type Status = "idle" | "pending" | "correct" | "wrong";

const INSTRUCTION: Record<string, string> = {
  MCQ: "Choix unique", REORDER: "Remets les mots dans l'ordre", LISTEN: "Écoute", TYPE: "Écoute et écris", SPEAK: "Parle",
};
const PRAISE = ["Excellent !", "Bravo !", "Parfait !", "Bien joué !", "Super !"];
const MIC_ERRORS: Record<ListenError, string> = {
  denied: "Accès au micro refusé. Autorise le micro dans ton navigateur, ou écris ta réponse ci-dessous.",
  "no-speech": "Je n'ai rien entendu. Réessaie en parlant plus près du micro.",
  network: "La reconnaissance vocale a besoin d'internet sur ce navigateur. Écris ta réponse ci-dessous.",
  unsupported: "La reconnaissance vocale n'est pas disponible sur ce navigateur. Écris ta réponse ci-dessous.",
  other: "La reconnaissance vocale a échoué. Réessaie ou écris ta réponse ci-dessous.",
};

export function LessonSession({
  lesson,
  onFinish,
}: {
  lesson: Lesson;
  /** When provided, the caller owns progression and returns whether the assessment passed. */
  onFinish?: (correctCount: number, total: number) => boolean;
}) {
  const exercises = lesson.exercises;
  const [user, setUser] = useState<User | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [heard, setHeard] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<ListenError | null>(null);
  const [srSupported, setSrSupported] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [testPassed, setTestPassed] = useState<boolean | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const finishedRef = useRef(false);
  useEffect(() => { setUser(loadUser()); setSrSupported(canRecognize()); }, []);
  // Leaving the lesson stops the mic and any audio still playing.
  useEffect(() => () => { stopRef.current(); stopSpeaking(); }, []);

  const ex = exercises[index]!;
  const total = exercises.length;
  const checked = status === "correct" || status === "wrong";
  const progress = ((index + (checked ? 1 : 0)) / total) * 100;
  const hasAnswer =
    ex.type === "MCQ" || ex.type === "LISTEN" ? choice !== null
    : ex.type === "REORDER" ? selectedWords.length > 0
    : ex.type === "SPEAK" ? heard.length > 0 || text.trim().length > 0
    : text.trim().length > 0;
  const outOfHearts = user !== null && user.current_hearts <= 0;

  const update = (u: User) => { setUser(u); saveUser(u); };

  const pick = (opt: string) => { if (checked) return; setChoice(opt); setStatus("pending"); };
  const addWord = (i: number) => { if (checked) return; setSelectedWords((s) => [...s, i]); setStatus("pending"); };
  const removeWord = (i: number) => {
    if (checked) return;
    setSelectedWords((s) => { const n = s.filter((x) => x !== i); if (!n.length) setStatus("idle"); return n; });
  };
  const typeText = (v: string) => { if (checked) return; setText(v); setStatus(v.trim() ? "pending" : "idle"); };

  const startMic = () => {
    if (checked) return;
    setMicError(null); setHeard([]); setRecording(true);
    stopRef.current = listen(
      (alts) => { setRecording(false); setHeard(alts); setStatus("pending"); },
      (err) => { setRecording(false); setMicError(err); if (err === "unsupported") setSrSupported(false); },
    );
  };
  const stopMic = () => { stopRef.current(); setRecording(false); };

  const answerFor = (): string | string[] => {
    if (ex.type === "MCQ" || ex.type === "LISTEN") return choice!;
    if (ex.type === "REORDER") return selectedWords.map((i) => ex.options[i]!);
    if (ex.type === "SPEAK") return heard.length ? heard : [text];
    return text;
  };

  const check = () => {
    if (!user) return;
    stopMic();
    if (isCorrect(ex, answerFor())) { setStatus("correct"); setCorrectCount((c) => c + 1); }
    else { setStatus("wrong"); update(loseHeart(user)); }
  };

  const reset = () => { setChoice(null); setSelectedWords([]); setText(""); setHeard([]); setMicError(null); setStatus("idle"); };

  const next = () => {
    if (index + 1 >= total) {
      // Guard: a double click on "Continuer" must not award XP twice.
      if (!finishedRef.current) {
        finishedRef.current = true;
        if (onFinish) {
          const passed = onFinish(correctCount, total);
          setTestPassed(passed);
          if (passed) setUser(loadUser());
        } else {
          update(endSession(loadUser(), correctCount, undefined, lesson.id));
        }
      }
      setDone(true);
      return;
    }
    setIndex(index + 1); reset();
  };

  const restart = () => { finishedRef.current = false; setIndex(0); reset(); setCorrectCount(0); setDone(false); };

  if (!user) return <div className="min-h-screen" />;

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-6xl motion-safe:animate-bounce" aria-hidden>🎉</div>
        <h1 className="text-3xl font-black text-primary">
          {onFinish ? (testPassed ? "Unité validée !" : "Test non réussi") : "Leçon terminée !"}
        </h1>
        <p className="font-bold">{lesson.title}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Stat label="Score" value={`${correctCount}/${total}`} cls={onFinish && !testPassed ? "border-danger text-danger" : "border-success text-success"} />
          <Stat label="XP gagnés" value={`+${onFinish && !testPassed ? 0 : correctCount * XP_PER_CORRECT}`} cls="border-xp text-xp" />
          <Stat label="XP total" value={`${user.total_xp}`} cls="border-flame text-flame" />
          <Stat label="Série" value={`${user.streak_days} j`} cls="border-flame text-flame" />
        </div>
        <p className="max-w-sm text-muted-foreground">
          {onFinish
            ? testPassed
              ? "Tu as validé cette unité. Tu peux toujours refaire ses leçons depuis le parcours."
              : "Il faut au moins 80 % de bonnes réponses. Ta progression et ton XP restent inchangés ; tu peux réessayer."
            : "Reviens demain pour prolonger ta série. Refaire la leçon renforce les mots que tu as manqués."}
        </p>
        <button onClick={restart} className="btn-3d w-full max-w-xs border-primary-shade bg-primary py-3 uppercase text-primary-foreground">
          {onFinish ? "Réessayer le test" : "Recommencer"}
        </button>
        <Link to="/" className="btn-3d w-full max-w-xs border-border bg-background py-3 uppercase text-foreground hover:bg-muted">
          Retour au parcours
        </Link>
      </div>
    );
  }

  const state = (active: boolean) =>
    !active ? "border-border bg-background hover:bg-muted"
    : status === "correct" ? "border-success-shade bg-success-soft text-success-shade"
    : status === "wrong" ? "border-danger-shade bg-danger-soft text-danger-shade"
    : "border-pending-shade bg-pending-soft text-pending-shade";

  const correctText = Array.isArray(ex.correct_answer) ? ex.correct_answer.join(" ")
    : ex.type === "SPEAK" ? ex.phrase : ex.type === "TYPE" ? ex.audio : ex.correct_answer;
  const reviewAudio = ex.type === "LISTEN" || ex.type === "TYPE" ? ex.audio : ex.type === "SPEAK" ? ex.phrase : ex.answer_audio ?? ex.audio;
  const spokenMissing = ex.type === "SPEAK" && status === "wrong" && heard.length ? missingWords(ex.phrase, heard[0]!) : [];

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4">
      <header className="flex items-center gap-3 py-6 sm:gap-4">
        <Link to="/" aria-label="Quitter la leçon et revenir au parcours" className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted"><X /></Link>
        <div className="relative h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progression de la leçon" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <span aria-label={`Série : ${user.streak_days} jours`} className="flex shrink-0 items-center gap-1 font-black text-flame"><Flame aria-hidden className="size-5 fill-current" />{user.streak_days}</span>
        <span aria-label={`${user.total_xp} XP`} className="flex shrink-0 items-center gap-1 font-black text-xp"><Zap aria-hidden className="size-5 fill-current" />{user.total_xp}</span>
        <span aria-label={`${user.current_hearts} cœurs`} className="flex shrink-0 items-center gap-1 font-black text-heart"><Heart aria-hidden className="size-5 fill-current" />{user.current_hearts}</span>
      </header>

      <main className="flex-1 py-6">
        <p className="mb-2 text-sm font-extrabold uppercase text-muted-foreground">{INSTRUCTION[ex.type]}</p>
        <div className="mb-8 flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-black">{ex.question}</h1>
          <SpeakButton text={ex.question} lang="fr-FR" label="Écouter la consigne" />
        </div>

        {(ex.type === "LISTEN" || ex.type === "TYPE" || (ex.type === "MCQ" && ex.audio)) && (
          <div className="mb-8 flex items-end gap-4">
            <SpeakButton text={ex.audio!} big label="Écouter l'audio" />
            <SpeakButton text={ex.audio!} slow label="Écouter l'audio lentement" />
            {ex.type === "MCQ" && <span className="pb-2 text-xl font-black">{ex.audio}</span>}
          </div>
        )}

        {ex.type === "MCQ" || ex.type === "LISTEN" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {ex.options.map((opt) => (
              <button key={opt} aria-pressed={choice === opt} onClick={() => pick(opt)}
                className={`btn-3d px-4 py-4 text-left text-lg ${state(choice === opt)}`}>
                {opt}
              </button>
            ))}
          </div>
        ) : ex.type === "REORDER" ? (
          <div className="space-y-8">
            <div aria-label="Zone cible" className={`flex min-h-16 flex-wrap gap-2 border-b-2 border-t-2 py-3 ${checked ? state(true).split(" ").slice(0, 2).join(" ") : "border-border"}`}>
              {selectedWords.map((i) => (
                <button key={i} onClick={() => removeWord(i)} className="btn-3d border-border bg-background px-4 py-2">{ex.options[i]}</button>
              ))}
            </div>
            <div aria-label="Banque de mots" className="flex flex-wrap justify-center gap-2">
              {ex.options.map((w, i) => !selectedWords.includes(i) && (
                <button key={i} onClick={() => addWord(i)} className="btn-3d border-border bg-background px-4 py-2 hover:bg-muted">{w}</button>
              ))}
            </div>
          </div>
        ) : ex.type === "TYPE" ? (
          <div className="space-y-3">
            <p className="text-xl font-black">{ex.prompt}</p>
            <label className="block">
              <span className="sr-only">Mot manquant</span>
              <input value={text} onChange={(e) => typeText(e.target.value)} disabled={checked} autoComplete="off" autoCapitalize="off" spellCheck={false}
                onKeyDown={(e) => { if (e.key === "Enter" && hasAnswer && !checked) check(); }}
                className={`w-full rounded-2xl border-2 px-4 py-3 text-lg font-bold ${state(checked || text.length > 0)}`} placeholder="Écris le mot manquant" />
            </label>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <SpeakButton text={ex.phrase} label="Écouter l'exemple" />
              <SpeakButton text={ex.phrase} slow label="Écouter l'exemple lentement" />
              <span className="text-2xl font-black">{ex.phrase}</span>
            </div>
            {srSupported && micError !== "denied" && micError !== "network" ? (
              <div className="flex flex-col items-center gap-2">
                <button type="button" onClick={recording ? stopMic : startMic} disabled={checked} aria-pressed={recording}
                  aria-label={recording ? "Arrêter l'écoute du micro" : "Appuyer pour parler"}
                  className={`btn-3d grid size-24 place-items-center rounded-full ${recording ? "border-danger-shade bg-danger text-primary-foreground motion-safe:animate-pulse" : "border-primary-shade bg-primary text-primary-foreground"}`}>
                  {recording ? <Square aria-hidden className="size-9 fill-current" /> : <Mic aria-hidden className="size-10" />}
                </button>
                <span className="font-bold text-muted-foreground" aria-live="polite">
                  {recording ? "J'écoute… parle maintenant." : heard.length ? <>J'ai entendu : « <span className="text-foreground">{heard[0]}</span> »</> : "Appuie sur le micro et dis la phrase."}
                </span>
                <span className="text-center text-xs text-muted-foreground">
                  La reconnaissance vocale est fournie par ton navigateur ; certains (comme Chrome) envoient l'audio à leur propre service. Langue n'enregistre pas ta voix.
                </span>
              </div>
            ) : null}
            {micError && <p role="alert" className="font-bold text-danger-shade">{MIC_ERRORS[micError]}</p>}
            {(!srSupported || micError === "denied" || micError === "network" || micError === "other") && (
              <label className="block">
                <span className="mb-1 block text-sm font-extrabold uppercase text-muted-foreground">Réponse écrite (solution de secours)</span>
                <input value={text} onChange={(e) => typeText(e.target.value)} disabled={checked} autoComplete="off" autoCapitalize="off" spellCheck={false}
                  onKeyDown={(e) => { if (e.key === "Enter" && hasAnswer && !checked) check(); }}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-lg font-bold ${state(checked || text.length > 0)}`} placeholder="Écris la phrase en anglais" />
              </label>
            )}
          </div>
        )}
      </main>

      <footer className={`-mx-4 border-t-2 px-4 py-6 ${status === "correct" ? "border-success bg-success-soft" : status === "wrong" ? "border-danger bg-danger-soft" : "border-border"}`}>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-start gap-3 font-black" role="status" aria-live="polite">
            {checked && reviewAudio && <SpeakButton text={reviewAudio} label="Écouter la bonne réponse" />}
            <div>
              {status === "correct" && <span className="text-xl text-success-shade">{PRAISE[(index + correctCount) % PRAISE.length]}</span>}
              {status === "wrong" && (
                <span className="text-danger-shade">
                  Bonne réponse : {correctText}
                  {spokenMissing.length > 0 && <span className="mt-1 block font-bold">Mots non reconnus : {spokenMissing.join(", ")}. Réessaie en articulant ces mots.</span>}
                  {ex.explanation && <span className="mt-1 block font-bold">{ex.explanation}</span>}
                </span>
              )}
            </div>
          </div>
          {checked ? (
            <button onClick={next} className={`btn-3d w-full px-10 py-3 uppercase text-primary-foreground sm:w-auto ${status === "correct" ? "border-success-shade bg-success" : "border-danger-shade bg-danger"}`}>
              Continuer
            </button>
          ) : (
            <button onClick={check} disabled={!hasAnswer || recording}
              className="btn-3d w-full border-primary-shade bg-primary px-10 py-3 uppercase text-primary-foreground sm:w-auto">
              Vérifier
            </button>
          )}
        </div>
      </footer>

      {outOfHearts && (
        <div role="dialog" aria-modal="true" aria-labelledby="no-hearts-title" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-background p-8 text-center">
            <Heart className="mx-auto mb-4 size-16 fill-heart text-heart" />
            <h2 id="no-hearts-title" className="mb-2 text-2xl font-black">Plus de cœurs !</h2>
            <p className="mb-6 text-muted-foreground">Recharge tes vies pour continuer la leçon.</p>
            <button autoFocus onClick={() => update({ ...user, current_hearts: MAX_HEARTS })}
              className="btn-3d w-full border-primary-shade bg-primary py-3 uppercase text-primary-foreground">
              Recharger ({MAX_HEARTS} cœurs)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className={`rounded-2xl border-2 px-5 py-3 ${cls}`}>
      <div className="text-xs font-extrabold uppercase">{label}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}
