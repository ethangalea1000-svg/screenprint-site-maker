import { createFileRoute } from "@tanstack/react-router";
import { LessonSession } from "@/components/LessonSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lingo — Apprends l'anglais en jouant" },
      { name: "description", content: "Leçons courtes avec QCM et phrases à reconstruire, cœurs, XP et série de jours." },
      { property: "og:title", content: "Lingo — Apprends l'anglais en jouant" },
      { property: "og:description", content: "Leçons courtes avec QCM et phrases à reconstruire, cœurs, XP et série de jours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LessonSession,
});
