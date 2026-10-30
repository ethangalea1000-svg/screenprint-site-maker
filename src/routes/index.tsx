import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Flame, Heart, Lock, Star, Zap } from "lucide-react";
import { ALL_LESSONS, UNITS, completedLessons, lessonState, loadUser, type User } from "@/lib/lesson";

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
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  useEffect(() => {
    const hasProfile = localStorage.getItem("duo_user") !== null;
    setUser(loadUser());
    setIsFirstVisit(!hasProfile);
  }, []);
  const completedCount = user ? completedLessons(user).filter((id) => ALL_LESSONS.some((lesson) => lesson.id === id)).length : 0;
  const progress = Math.round((completedCount / ALL_LESSONS.length) * 100);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4">
      <header className="flex items-center justify-between gap-3 py-5">
        <div className="min-w-0">
          <span className="text-2xl font-black text-primary">Langue</span>
          {isFirstVisit && (
            <p className="mt-1 max-w-md text-xs font-semibold leading-relaxed text-muted-foreground sm:text-sm">
              Apprends l’anglais avec des leçons courtes : gagne de l’XP à chaque bonne réponse et préserve tes cœurs en évitant les erreurs.
            </p>
          )}
        </div>
        {user && (
          <div className="flex shrink-0 items-center gap-4">
            <span aria-label={`Série : ${user.streak_days} jours`} className="flex items-center gap-1 font-black text-flame"><Flame aria-hidden className="size-5 fill-current" />{user.streak_days}</span>
            <span aria-label={`${user.total_xp} XP`} className="flex items-center gap-1 font-black text-xp"><Zap aria-hidden className="size-5 fill-current" />{user.total_xp}</span>
            <span aria-label={`${user.current_hearts} cœurs`} className="flex items-center gap-1 font-black text-heart"><Heart aria-hidden className="size-5 fill-current" />{user.current_hearts}</span>
          </div>
        )}
      </header>

      <main className="flex-1 pb-12">
        <section aria-label="Progression générale" className="mb-10 rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h1 className="text-lg font-black">Ton parcours d’anglais</h1>
            <span className="shrink-0 text-sm font-extrabold text-primary">{progress} %</span>
          </div>
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progression du parcours" aria-valuemin={0} aria-valuemax={ALL_LESSONS.length} aria-valuenow={completedCount}>
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm font-bold text-muted-foreground">{completedCount} / {ALL_LESSONS.length} leçons terminées · {UNITS.length} {UNITS.length === 1 ? "unité" : "unités"} · du niveau A1 aux notions avancées (C2)</p>
        </section>
        {UNITS.map((unit, ui) => (
          <section key={unit.id} className="mb-12">
            <div className="btn-3d mb-10 border-primary-shade bg-primary p-5 text-primary-foreground">
              <p className="text-sm font-extrabold uppercase opacity-90">Unité {ui + 1}</p>
              <h2 className="mt-1 text-2xl font-black">{unit.title}</h2>
              <p className="mt-1 font-bold opacity-90">{unit.goal}</p>
            </div>
            <ol className="flex flex-col items-center gap-4" aria-label={`Parcours de l'unité ${ui + 1}`}>
              {unit.lessons.map((lesson, li) => {
                const st = user ? lessonState(user, lesson.id) : "locked";
                const globalIndex = UNITS.slice(0, ui).reduce((total, previous) => total + previous.lessons.length, li + 1);
                const name = `Leçon ${globalIndex} · ${lesson.title}`;
                return (
                  <li key={lesson.id} className="flex flex-col items-center gap-3">
                    {li > 0 && <span aria-hidden className={`h-8 w-1.5 rounded-full ${st === "locked" ? "bg-muted" : "bg-primary"}`} />}
                    {st === "locked" ? (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground" aria-label={`${name}, verrouillée : termine la leçon précédente`}>
                        <div className="grid size-20 place-items-center rounded-full border-2 border-b-4 border-border bg-muted"><Lock aria-hidden className="size-8" /></div>
                        <span className="font-black">{name}</span>
                        <span className="text-sm font-bold">Termine la leçon précédente pour la débloquer</span>
                      </div>
                    ) : (
                      <>
                        <Link to="/lecon" search={{ l: lesson.id }} aria-label={st === "completed" ? `${name}, terminée — refaire` : `${name}, disponible — commencer`}
                          className={`btn-3d grid size-20 place-items-center rounded-full ${st === "completed" ? "border-xp bg-xp text-foreground" : "border-primary-shade bg-primary text-primary-foreground"}`}>
                          {st === "completed" ? <Check aria-hidden className="size-9" strokeWidth={4} /> : <Star aria-hidden className="size-9 fill-current" />}
                        </Link>
                        <span className="font-black">{name}</span>
                        <span className="text-center text-sm font-bold text-muted-foreground">{lesson.skills.join(" · ")} · {lesson.exercises.length} {lesson.exercises.length === 1 ? "exercice" : "exercices"}</span>
                        <Link to="/lecon" search={{ l: lesson.id }} className="btn-3d border-primary-shade bg-primary px-8 py-3 uppercase text-primary-foreground">
                          {st === "completed" ? "Refaire la leçon" : "Commencer"}
                        </Link>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </main>
    </div>
  );
}
