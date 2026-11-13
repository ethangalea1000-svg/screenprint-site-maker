// Free, browser-native speech helpers (Web Speech API). Call only from effects/handlers.

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.slice(0, 2);
  return voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(base));
}

export function speak(text: string, opts: { lang?: string; slow?: boolean } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!canSpeak()) return reject(new Error("unsupported"));
    const lang = opts.lang ?? "en-US";
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = opts.slow ? 0.6 : 0.95;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(new Error(e.error)));
    synth.speak(u);
  });
}

type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  start(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canRecognize(): boolean { return getRecognitionCtor() !== null; }

export type ListenError = "denied" | "no-speech" | "network" | "unsupported" | "other";

/** Starts one recognition pass; resolves with transcript alternatives. Returns a stop function. */
export function listen(onDone: (alts: string[]) => void, onError: (e: ListenError) => void, lang = "en-US"): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) { onError("unsupported"); return () => {}; }
  const r = new Ctor();
  r.lang = lang; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
  // One attempt produces at most one outcome. Intentional stops are silent,
  // including browser callbacks that arrive after leaving an exercise.
  let settled = false;
  const fail = (error: ListenError) => {
    if (settled) return;
    settled = true;
    onError(error);
  };
  r.onresult = (e) => {
    if (settled) return;
    const first = e.results[0];
    const alts: string[] = [];
    if (first) for (let i = 0; i < first.length; i++) {
      const transcript = first[i]!.transcript.trim();
      if (transcript) alts.push(transcript);
    }
    if (!alts.length) { fail("no-speech"); return; }
    settled = true;
    onDone(alts);
  };
  r.onerror = (e) => {
    fail(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied"
      : e.error === "no-speech" ? "no-speech" : e.error === "network" ? "network" : "other");
  };
  r.onend = () => fail("no-speech");
  try { r.start(); } catch { fail("other"); }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    settled = true;
    r.onresult = null; r.onerror = null; r.onend = null;
    try { r.abort(); } catch { /* Already stopped by the browser. */ }
  };
}
