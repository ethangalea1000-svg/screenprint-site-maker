import { useEffect, useState } from "react";
import { Heart, Flame, Zap, X } from "lucide-react";
import {
  EXERCISE_TEMPLATES, MAX_HEARTS, XP_PER_CORRECT, endSession, isCorrect, loadUser, loseHeart, saveUser, type User,
} from "@/lib/lesson";

type Status = "idle" | "pending" | "correct" | "wrong";

export function LessonSession() {
  const [user, setUser] = useState<User | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => setUser(loadUser()), []);

  const ex = EXERCISE_TEMPLATES[index]!;
  const total = EXERCISE_TEMPLATES.length;
  const progress = ((index + (status === "correct" || status === "wrong" ? 1 : 0)) / total) * 100;
  const hasAnswer = ex.type === "MCQ" ? choice !== null : selectedWords.length > 0;
  const outOfHearts = user !== null && user.current_hearts <= 0;
  const checked = status === "correct" || status === "wrong";

  const update = (u: User) => { setUser(u); saveUser(u); };

  const pick = (opt: string) => { if (checked) return; setChoice(opt); setStatus("pending"); };
  const addWord = (i: number) => { if (checked) return; setSelectedWords((s) => [...s, i]); setStatus("pending"); };
  const removeWord = (i: number) => {
    if (checked) return;
    setSelectedWords((s) => { const n = s.filter((x) => x !== i); if (!n.length) setStatus("idle"); return n; });
  };

  const check = () => {
    if (!user) return;
    const answer = ex.type === "MCQ" ? choice! : selectedWords.map((i) => ex.options[i]!);
    if (isCorrect(ex, answer)) { setStatus("correct"); setCorrectCount((c) => c + 1); }
    else { setStatus("wrong"); update(loseHeart(user)); }
  };

  const next = () => {
    if (index + 1 >= total) {
      update(endSession(user!, correctCount));
      setDone(true);
      return;
    }
    setIndex(index + 1); setChoice(null); setSelectedWords([]); setStatus("idle");
  };

  const restart = () => { setIndex(0); setChoice(null); setSelectedWords([]); setStatus("idle"); setCorrectCount(0); setDone(false); };

  if (!user) return <div className="min-h-screen" />;

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-black text-primary">Leçon terminée !</h1>
        <div className="flex gap-4">
          <Stat label="Score" value={`${correctCount}/${total}`} cls="border-success text-success" />
          <Stat label="XP gagnés" value={`+${correctCount * XP_PER_CORRECT}`} cls="border-xp text-xp" />
          <Stat label="XP total" value={`${user.total_xp}`} cls="border-flame text-flame" />
        </div>
        <button onClick={restart} className="btn-3d w-full max-w-xs border-primary-shade bg-primary py-3 uppercase text-primary-foreground">
          Recommencer
        </button>
      </div>
    );
  }

  const state = (active: boolean) =>
    !active ? "border-border bg-background hover:bg-muted"
    : status === "correct" ? "border-success-shade bg-success-soft text-success-shade"
    : status === "wrong" ? "border-danger-shade bg-danger-soft text-danger-shade"
    : "border-pending-shade bg-pending-soft text-pending-shade";

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4">
      <header className="flex items-center gap-4 py-6">
        <button onClick={restart} aria-label="Recommencer" className="text-muted-foreground"><X /></button>
        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <span className="flex items-center gap-1 font-black text-flame"><Flame className="size-5 fill-current" />{user.streak_days}</span>
        <span className="flex items-center gap-1 font-black text-xp"><Zap className="size-5 fill-current" />{user.total_xp}</span>
        <span className="flex items-center gap-1 font-black text-heart"><Heart className="size-5 fill-current" />{user.current_hearts}</span>
      </header>

      <main className="flex-1 py-6">
        <p className="mb-2 text-sm font-extrabold uppercase text-muted-foreground">
          {ex.type === "MCQ" ? "Choix unique" : "Remets les mots dans l'ordre"}
        </p>
        <h2 className="mb-8 text-2xl font-black">{ex.question}</h2>

        {ex.type === "MCQ" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {ex.options.map((opt) => (
              <button key={opt} aria-pressed={choice === opt} onClick={() => pick(opt)}
                className={`btn-3d px-4 py-4 text-left text-lg ${state(choice === opt)}`}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
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
        )}
      </main>

      <footer className={`-mx-4 border-t-2 px-4 py-6 ${status === "correct" ? "border-success bg-success-soft" : status === "wrong" ? "border-danger bg-danger-soft" : "border-border"}`}>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="font-black">
            {status === "correct" && <span className="text-success-shade text-xl">Excellent !</span>}
            {status === "wrong" && (
              <span className="text-danger-shade">
                Bonne réponse : {Array.isArray(ex.correct_answer) ? ex.correct_answer.join(" ") : ex.correct_answer}
              </span>
            )}
          </div>
          {checked ? (
            <button onClick={next} className={`btn-3d w-full px-10 py-3 uppercase text-primary-foreground sm:w-auto ${status === "correct" ? "border-success-shade bg-success" : "border-danger-shade bg-danger"}`}>
              Continuer
            </button>
          ) : (
            <button onClick={check} disabled={!hasAnswer}
              className="btn-3d w-full border-primary-shade bg-primary px-10 py-3 uppercase text-primary-foreground sm:w-auto">
              Vérifier
            </button>
          )}
        </div>
      </footer>

      {outOfHearts && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-background p-8 text-center">
            <Heart className="mx-auto mb-4 size-16 fill-heart text-heart" />
            <h3 className="mb-2 text-2xl font-black">Plus de cœurs !</h3>
            <p className="mb-6 text-muted-foreground">Recharge tes vies pour continuer la leçon.</p>
            <button onClick={() => update({ ...user, current_hearts: MAX_HEARTS })}
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
