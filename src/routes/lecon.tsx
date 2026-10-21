import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LessonSession } from "@/components/LessonSession";
import { getLesson, lessonState, loadUser, type User } from "@/lib/lesson";

export const Route = createFileRoute("/lecon")({
  validateSearch: (s: Record<string, unknown>): { l?: string } => (typeof s["l"] === "string" ? { l: s["l"] } : {}),
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
  const { l } = Route.useSearch();
  const lessonId = l === "l2" ? "l2" : "l1";
  const lesson = getLesson(lessonId);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => setUser(loadUser()), []);

  if (!user) return <div className="min-h-screen" />;

  if (lessonState(user, lesson.id) === "locked") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl" aria-hidden="true">🔒</div>
        <h1 className="text-2xl font-black">Leçon verrouillée</h1>
        <p className="text-muted-foreground">Termine la leçon précédente pour débloquer « {lesson.title} ».</p>
        <Link to="/" className="btn-3d border-primary-shade bg-primary px-8 py-3 uppercase text-primary-foreground">
          Retour au parcours
        </Link>
      </main>
    );
  }

  return <LessonSession key={lesson.id} lesson={lesson} />;
}
