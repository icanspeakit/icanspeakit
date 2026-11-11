// Bruno Kart: reads the right answer out after a miss ("an apple"). Where a question carries a
// recording (/audio/wortschatz/<audio>.mp3) it plays that; for everything else (questions.js sets no
// clip at the moment, a clip that does not load) the browser's British English voice reads the
// text. Silent while the game is muted.

import { isMuted } from "./sound.js";
import { BASE_PATH } from "../paths.js";

let clip = null;

function voice(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 0.9;
    const v = synth.getVoices().find((x) => /^en(-|_)GB/i.test(x.lang)) ?? synth.getVoices().find((x) => /^en(-|_)/i.test(x.lang));
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
  const a = new Audio(`${BASE_PATH}/audio/wortschatz/${audio}.mp3`);
  clip = a;
  a.addEventListener("error", fallback);
  a.play().catch(fallback);
}
