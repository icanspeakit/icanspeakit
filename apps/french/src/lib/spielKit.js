// Shared pieces of the dialogue games (Lindenau, Knigge-Simulator).
//
// Speech: a line's own clip (Azure, made by a scripts/generate-*-audio.mjs); the browser voice
// when the clip is missing or cannot play; quiet if there is neither. `npc`: a person's line –
// the game's onTalk(true/false) lets their head talk along.
import { applyVolume, speechVolume } from "./spieleEinstellungen.js";
import { audioUrl } from "./audioSource.js";
import { withBase } from "./paths.js";

// The browser voice: French of France first, then any French voice, never another language
// (an English voice reading French teaches the wrong sounds). Name kept from the German original.
let deVoice;
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => { deVoice = undefined; });
}
const isFr = (v, exact) => {
  const l = (v.lang ?? "").toLowerCase().replace("_", "-");
  return exact ? l.startsWith("fr-fr") : l === "fr" || l.startsWith("fr-");
};

/** A French line for the screen: the no-break space French print puts before ? ! : ; and
 *  inside « ». The data keeps plain spaces (tiles, matching); English never has a space there. */
export const frSpace = (s) => String(s ?? "").replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");

/** @param {(clip: string) => string} clipPath where a clip id's mp3 lives */
export function createVoice(clipPath) {
  let current = null;
  let onTalk = () => {};

  function speak(text, npc = false) {
    const s = window.speechSynthesis;
    if (!s) return;
    const all = s.getVoices();
    if (deVoice === undefined && all.length) deVoice = all.find((v) => isFr(v, true)) || all.find((v) => isFr(v, false)) || null;
    s.cancel();
    // Voices listed, none French: stay quiet rather than read French with another language's sounds.
    if (all.length && !deVoice) { if (npc) onTalk(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    if (deVoice) u.voice = deVoice;
    u.rate = 0.9;
    u.volume = speechVolume();
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
    const a = applyVolume(new Audio(withBase(audioUrl(clipPath(clip)))));
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
