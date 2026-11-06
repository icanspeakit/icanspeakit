// Bruno Kart: reads the right answer out after a miss ("el agua"). Where a question carries a
// recording (/audio/wortschatz/<audio>.mp3) it plays that; for everything else (questions.js sets no
// clip at the moment, a clip that does not load) the browser's Spanish voice reads the text, a
// voice from Spain first. Silent while the game is muted.

import { isMuted } from "./sound.js";
import { withBase } from "../paths.js";

let clip = null;

function voice(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    u.rate = 0.9;
    const v = synth.getVoices().find((x) => /^es(-|_)ES/i.test(x.lang)) ?? synth.getVoices().find((x) => /^es(-|_)/i.test(x.lang));
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
  const a = new Audio(withBase(`/audio/wortschatz/${audio}.mp3`));
  clip = a;
  a.addEventListener("error", fallback);
  a.play().catch(fallback);
}
