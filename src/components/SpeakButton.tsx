import { useState } from "react";
import { Volume2, Snail } from "lucide-react";
import { canSpeak, speak } from "@/lib/speech";

export function SpeakButton({ text, lang = "en-US", slow = false, label, big = false }: { text: string; lang?: string; slow?: boolean; label?: string; big?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const play = async () => {
    setError(null);
    if (!canSpeak()) { setError("La lecture audio n'est pas disponible sur ce navigateur."); return; }
    setPlaying(true);
    try { await speak(text, { lang, slow }); }
    catch { setError("Impossible de lire l'audio. Vérifie le son de ton appareil."); }
    finally { setPlaying(false); }
  };
  const Icon = slow ? Snail : Volume2;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={play} aria-label={label ?? (slow ? `Écouter lentement : ${text}` : `Écouter : ${text}`)} aria-busy={playing}
        className={`btn-3d grid shrink-0 place-items-center border-primary-shade bg-primary text-primary-foreground ${big ? "size-20" : "size-11"} ${playing ? "animate-pulse" : ""}`}>
        <Icon aria-hidden className={big ? "size-10" : "size-5"} />
      </button>
      {error && <span role="alert" className="text-sm font-bold text-danger-shade">{error}</span>}
    </span>
  );
}
