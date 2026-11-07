// Short feedback sounds for a self-check (the flashcards' Falsch / Richtig): WebAudio tones,
// no files. Quiet on purpose — it is heard on every card, often next to the word's audio.
// The context starts on the first tap (browsers keep audio locked until a gesture), which
// is always the case here: the sound only ever answers a button.

let ctx = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(c, freq, start, dur, { type = "sine", gain = 0.08, to = null } = {}) {
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Richtig: a bright rising pair. Falsch: a falling pair — a nudge, not a buzzer, and in
    the middle register, since laptop and phone speakers barely play anything low. */
export function judgeSound(ok) {
  try {
    const c = ac();
    if (!c) return;
    if (ok) {
      tone(c, 784, 0, 0.12, { type: "triangle" });
      tone(c, 1175, 0.09, 0.18, { type: "triangle" });
    } else {
      tone(c, 523, 0, 0.14, { type: "triangle", gain: 0.12 });
      tone(c, 392, 0.12, 0.24, { type: "triangle", gain: 0.12, to: 370 });
    }
  } catch {
    // No sound is never worth an error on the card.
  }
}
