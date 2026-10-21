import { createFileRoute } from "@tanstack/react-router";
import { LessonSession } from "@/components/LessonSession";
import { getLesson } from "@/lib/lesson";

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
  const lesson = getLesson(l ?? "l1");
  return <LessonSession key={lesson.id} lesson={lesson} />;
}
