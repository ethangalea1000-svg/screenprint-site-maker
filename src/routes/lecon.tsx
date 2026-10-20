import { createFileRoute } from "@tanstack/react-router";
import { LessonSession } from "@/components/LessonSession";

export const Route = createFileRoute("/lecon")({
  head: () => ({
    meta: [
      { title: "Leçon 1 — Langue" },
      { name: "description", content: "Leçons courtes avec QCM et phrases à reconstruire, cœurs, XP et série de jours." },
      { property: "og:title", content: "Leçon 1 — Langue" },
      { property: "og:description", content: "Leçons courtes avec QCM et phrases à reconstruire, cœurs, XP et série de jours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LessonSession,
});
