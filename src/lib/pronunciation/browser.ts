// The offline pronunciation provider (see src/lib/backend.js): no vendor, no network.
//
// - speak(): the browser's own speech synthesis (Web Speech API), picking a voice for the
//   requested language when the device has one.
// - assess(): not available without a scoring service — rejects with "config", which the
//   page already shows as "not set up". Plug a real adapter in here (same contract,
//   ./types.ts) to bring scoring back.
import { PronunciationError, type PronunciationProvider } from "./types";

const synth = () => (typeof window !== "undefined" ? window.speechSynthesis : undefined);

function voiceFor(lang: string): SpeechSynthesisVoice | undefined {
  const voices = synth()?.getVoices() ?? [];
  const base = lang.split("-")[0];
  return voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(base));
}

export const browserProvider: PronunciationProvider = {
  id: "browser",
  assess: () => Promise.reject(new PronunciationError("config")),
  canSpeak: () => Boolean(synth()),
  speak: (text, options) =>
    new Promise<void>((resolve) => {
      const s = synth();
      if (!s) return resolve();
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = options.language;
      const v = voiceFor(options.language);
      if (v) u.voice = v;
      u.rate = options.slow ? 0.7 : 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      s.speak(u);
    }),
};
