import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { LessonSession } from "@/components/LessonSession";
import { ALL_LESSONS, buildUnitTestLesson, completeUnitWithTest, getLesson, getUnit, lessonState, loadUser, saveUser, type User } from "@/lib/lesson";
import { canRecognize } from "@/lib/speech";

export const Route = createFileRoute("/lecon")({
  validateSearch: (s: Record<string, unknown>): { l?: string; unit?: string } => ({
    ...(typeof s["l"] === "string" ? { l: s["l"] } : {}),
    ...(typeof s["unit"] === "string" ? { unit: s["unit"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Leçon — Langue" },
      { name: "description", content: "Leçon d'anglais : QCM, phrases à reconstruire, écoute et expression orale." },
      { property: "og:title", content: "Leçon — Langue" },
      { property: "og:description", content: "Leçon d'anglais : QCM, phrases à reconstruire, écoute et expression orale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { l, unit } = Route.useSearch();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => setUser(loadUser()), []);

  if (unit) {
    const selectedUnit = getUnit(unit);
    if (!selectedUnit) {
      return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-black">Unité introuvable</h1>
          <p className="text-muted-foreground">Cette unité n'existe pas ou son lien est incorrect.</p>
          <Link to="/" className="btn-3d border-primary-shade bg-primary px-6 py-3 font-bold text-primary-foreground">Retour au parcours</Link>
        </main>
      );
    }
    if (!user) {
      return <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4"><p role="status">Chargement de ta progression…</p></main>;
    }
    const testLesson = buildUnitTestLesson(selectedUnit, canRecognize());
    if (testLesson.exercises.length === 0) {
      return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-black">Test indisponible</h1>
          <p className="text-muted-foreground">Cette unité ne contient pas encore assez d'exercices pour créer un test.</p>
          <Link to="/" className="btn-3d border-primary-shade bg-primary px-6 py-3 font-bold text-primary-foreground">Retour au parcours</Link>
        </main>
      );
    }
    return (
      <LessonSession
        key={`unit-test-${unit}`}
        lesson={testLesson}
        onFinish={(correctCount, total) => {
          const current = loadUser();
          const updated = completeUnitWithTest(current, unit, correctCount, total);
          if (updated === current) return false;
          saveUser(updated);
          setUser(updated);
          return true;
        }}
      />
    );
  }

  const lessonExists = ALL_LESSONS.some((item) => item.id === (l ?? "l1"));
  if (!lessonExists) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-black">Leçon introuvable</h1>
        <p className="text-muted-foreground">Cette leçon n'existe pas ou son lien est incorrect.</p>
        <Link to="/" className="btn-3d border-primary-shade bg-primary px-6 py-3 font-bold text-primary-foreground">Retour au parcours</Link>
      </main>
    );
  }
  if (!user) {
    return <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4"><p role="status">Chargement de ta progression…</p></main>;
  }

  const lessonId = l ?? "l1";
  if (lessonState(user, lessonId) === "locked") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="grid size-20 place-items-center rounded-full border-2 border-b-4 border-border bg-muted"><Lock aria-hidden className="size-8" /></div>
        <h1 className="text-2xl font-black">Leçon verrouillée</h1>
        <p className="text-muted-foreground">Termine la leçon précédente pour débloquer celle-ci. Ta progression est conservée sur cet appareil.</p>
        <Link to="/" className="btn-3d border-primary-shade bg-primary px-6 py-3 font-bold text-primary-foreground">Revenir au parcours</Link>
      </main>
    );
  }

  return <LessonSession key={lessonId} lesson={getLesson(lessonId)} />;
}
