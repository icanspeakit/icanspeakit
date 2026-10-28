// Bruno Kart: reads the right answer out after a miss ("der Tisch"). Where the lexicon has a
// recording of the word (/audio/wortschatz/<audio>.mp3, the clips every Wortschatz page plays) it
// plays that; for everything else (a plural, a verb form, a word without a clip, a clip that does
// not load) the browser's German voice reads the text. Silent while the game is muted.

import { isMuted } from "./sound.js";

let clip = null;

function voice(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 0.9;
    const v = synth.getVoices().find((x) => /^de(-|_)/i.test(x.lang));
    if (v) u.voice = v;
    synth.speak(u);
  } catch { /* no speech: the toast says it in writing */ }
}

/** Stops whatever is being read. */
export function stopSpeaking() {
  try { clip?.pause(); } catch {}
  clip = null;
  try { window.speechSynthesis?.cancel(); } catch {}
}

/** `{ audio, say }` of a question or a missed item. `force` plays even when muted (the listen button). */
export function speak({ audio, say } = {}, { force = false } = {}) {
  if (isMuted() && !force) return;
  stopSpeaking();
  if (!audio) return voice(say);
  let fell = false;
  const fallback = () => { if (!fell) { fell = true; voice(say); } };
  const a = new Audio(`/audio/wortschatz/${audio}.mp3`);
  clip = a;
  a.addEventListener("error", fallback);
  a.play().catch(fallback);
}
