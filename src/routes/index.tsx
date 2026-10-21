import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Flame, Heart, Lock, Star, Zap } from "lucide-react";
import { EXERCISE_TEMPLATES, lessonState, loadUser, type User } from "@/lib/lesson";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Langue — Apprends l'anglais en jouant" },
      { name: "description", content: "Ton parcours d'anglais : leçons courtes, cœurs, XP et série de jours." },
      { property: "og:title", content: "Langue — Apprends l'anglais en jouant" },
      { property: "og:description", content: "Ton parcours d'anglais : leçons courtes, cœurs, XP et série de jours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => setUser(loadUser()), []);
  const firstLessonState = user ? lessonState(user, "l1") : "available";
  const secondLessonState = user ? lessonState(user, "l2") : "locked";
  const firstDone = firstLessonState === "completed";
  const secondDone = secondLessonState === "completed";
  const secondLocked = secondLessonState === "locked";

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4">
      <header className="flex items-center justify-between gap-3 py-5">
        <span className="text-2xl font-black text-primary">Langue</span>
        {user && (
          <div className="flex shrink-0 items-center gap-4">
            <span aria-label={`Série : ${user.streak_days} jours`} className="flex items-center gap-1 font-black text-flame"><Flame aria-hidden className="size-5 fill-current" />{user.streak_days}</span>
            <span aria-label={`${user.total_xp} XP`} className="flex items-center gap-1 font-black text-xp"><Zap aria-hidden className="size-5 fill-current" />{user.total_xp}</span>
            <span aria-label={`${user.current_hearts} cœurs`} className="flex items-center gap-1 font-black text-heart"><Heart aria-hidden className="size-5 fill-current" />{user.current_hearts}</span>
          </div>
        )}
      </header>

      <main className="flex-1 pb-12">
        <section className="btn-3d mb-10 border-primary-shade bg-primary p-5 text-primary-foreground">
          <p className="text-sm font-extrabold uppercase opacity-90">Unité 1 · Les bases</p>
          <h1 className="mt-1 text-2xl font-black">Premiers mots en anglais</h1>
          <p className="mt-1 font-bold opacity-90">Objectif du jour : terminer une leçon ({EXERCISE_TEMPLATES.length} exercices).</p>
        </section>

        <ol className="flex flex-col items-center gap-8" aria-label="Parcours de l'unité 1">
          <li className="flex flex-col items-center gap-3">
            <Link to="/lecon" aria-label={firstDone ? "Leçon 1, terminée — refaire" : "Leçon 1, disponible — commencer"}
              className={`btn-3d grid size-20 place-items-center rounded-full ${firstDone ? "border-xp bg-xp text-foreground" : "border-primary-shade bg-primary text-primary-foreground"}`}>
              {firstDone ? <Check aria-hidden className="size-9" strokeWidth={4} /> : <Star aria-hidden className="size-9 fill-current" />}
            </Link>
            <span className="font-black">Leçon 1 · Mots du quotidien</span>
            <Link to="/lecon" className="btn-3d border-primary-shade bg-primary px-8 py-3 uppercase text-primary-foreground">
              {firstDone ? "Refaire la leçon" : "Commencer"}
            </Link>
          </li>
          <li className="flex flex-col items-center gap-3" aria-label={secondLocked ? "Leçon 2 verrouillée : termine la leçon 1 pour la débloquer" : secondDone ? "Leçon 2 terminée — refaire" : "Leçon 2 disponible"}>
            {secondLocked ? (
              <div className="grid size-20 place-items-center rounded-full border-2 border-b-4 border-border bg-muted text-muted-foreground" aria-hidden="true">
                <Lock className="size-8" />
              </div>
            ) : (
              <Link to="/lecon" search={{ l: "l2" }} aria-label={secondDone ? "Leçon 2, terminée — refaire" : "Leçon 2, disponible — commencer"}
                className={`btn-3d grid size-20 place-items-center rounded-full ${secondDone ? "border-xp bg-xp text-foreground" : "border-primary-shade bg-primary text-primary-foreground"}`}>
                {secondDone ? <Check aria-hidden className="size-9" strokeWidth={4} /> : <Star aria-hidden className="size-9 fill-current" />}
              </Link>
            )}
            <span className={`font-black ${secondLocked ? "text-muted-foreground" : ""}`}>Leçon 2 · Écouter et parler</span>
            {secondLocked ? (
              <span className="text-sm font-bold text-muted-foreground">Termine la leçon 1 pour débloquer</span>
            ) : (
              <Link to="/lecon" search={{ l: "l2" }} className="btn-3d border-primary-shade bg-primary px-8 py-3 uppercase text-primary-foreground">
                {secondDone ? "Refaire la leçon" : "Commencer"}
              </Link>
            )}
          </li>
        </ol>
      </main>
    </div>
  );
}
