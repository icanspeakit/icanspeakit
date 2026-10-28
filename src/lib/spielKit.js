// Shared pieces of the dialogue games (Lindenau, Knigge-Simulator).
//
// Speech: a line's own clip (Azure, made by a scripts/generate-*-audio.mjs); the browser voice
// when the clip is missing or cannot play; quiet if there is neither. `npc`: a person's line –
// the game's onTalk(true/false) lets their head talk along.
import { audioUrl } from "./audioSource.js";

let deVoice;
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => { deVoice = undefined; });
}

/** @param {(clip: string) => string} clipPath where a clip id's mp3 lives */
export function createVoice(clipPath) {
  let current = null;
  let onTalk = () => {};

  function speak(text, npc = false) {
    const s = window.speechSynthesis;
    if (!s) return;
    if (deVoice === undefined) deVoice = s.getVoices().find((v) => v.lang?.toLowerCase().startsWith("de")) || null;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    if (deVoice) u.voice = deVoice;
    u.rate = 0.9;
    if (npc) {
      u.onstart = () => onTalk(true);
      u.onend = u.onerror = () => onTalk(false);
    }
    s.speak(u);
  }

  function say(clip, text, npc = false) {
    current?.pause();
    current = null;
    window.speechSynthesis?.cancel();
    onTalk(false);
    if (!clip) return speak(text, npc);
    const a = new Audio(audioUrl(clipPath(clip)));
    current = a;
    let fell = false;
    const fallback = () => {
      if (fell || current !== a) return;
      fell = true;
      speak(text, npc);
    };
    if (npc) {
      a.addEventListener("playing", () => current === a && onTalk(true));
      for (const ev of ["ended", "pause"]) a.addEventListener(ev, () => onTalk(false));
    }
    a.addEventListener("error", fallback, { once: true });
    // NotAllowedError = no tap before it (autoplay rule): nothing to fall back to either.
    a.play().catch((e) => { if (e?.name !== "NotAllowedError") fallback(); });
  }

  return {
    say,
    speak,
    setOnTalk(fn) { onTalk = fn; },
    /** Holds the line (pause screen) … */
    pause() { current?.pause(); window.speechSynthesis?.pause?.(); },
    /** … and goes on with it. */
    resume() {
      if (current && !current.ended) current.play().catch(() => {});
      window.speechSynthesis?.resume?.();
    },
    stop() { current?.pause(); current = null; window.speechSynthesis?.cancel(); onTalk(false); },
  };
}
