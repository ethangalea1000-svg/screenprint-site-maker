import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listen } from "./speech";

class FakeRecognition {
  static current: FakeRecognition;
  lang = ""; interimResults = true; maxAlternatives = 0; continuous = true;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn(() => { this.onerror?.({ error: "aborted" }); this.onend?.(); });
  constructor() { FakeRecognition.current = this; }
}

describe("speech recognition lifecycle", () => {
  beforeEach(() => vi.stubGlobal("SpeechRecognition", FakeRecognition));
  afterEach(() => vi.unstubAllGlobals());
  it("stops silently on intentional cancellation and ignores late callbacks", () => {
    const done = vi.fn(), error = vi.fn();
    const stop = listen(done, error);
    const r = FakeRecognition.current;
    const lateResult = r.onresult, lateError = r.onerror, lateEnd = r.onend;
    stop(); stop();
    lateResult?.({ results: [[{ transcript: "old answer" }]] });
    lateError?.({ error: "network" }); lateEnd?.();
    expect(done).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(r.abort).toHaveBeenCalledTimes(1);
  });
  it("reports one result only even if end or error follows it", () => {
    const done = vi.fn(), error = vi.fn();
    listen(done, error);
    const r = FakeRecognition.current;
    r.onresult?.({ results: [[{ transcript: "Good morning" }, { transcript: "good morning" }]] });
    r.onerror?.({ error: "network" }); r.onend?.();
    expect(done).toHaveBeenCalledExactlyOnceWith(["Good morning", "good morning"]);
    expect(error).not.toHaveBeenCalled();
    expect(r.lang).toBe("en-US");
    expect(r.maxAlternatives).toBe(3);
  });
  it("maps permission failure once without a second no-speech error", () => {
    const error = vi.fn(); listen(vi.fn(), error);
    const r = FakeRecognition.current;
    r.onerror?.({ error: "not-allowed" }); r.onend?.();
    expect(error).toHaveBeenCalledExactlyOnceWith("denied");
  });
  it("handles an empty result as no speech instead of accepting an empty answer", () => {
    const done = vi.fn(), error = vi.fn(); listen(done, error);
    const r = FakeRecognition.current;
    r.onresult?.({ results: [[{ transcript: "   " }]] }); r.onend?.();
    expect(done).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledExactlyOnceWith("no-speech");
  });
  it("reports a silent end once", () => {
    const error = vi.fn(); listen(vi.fn(), error);
    const r = FakeRecognition.current; r.onend?.(); r.onend?.();
    expect(error).toHaveBeenCalledExactlyOnceWith("no-speech");
  });
});
