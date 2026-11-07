// Artikel-Flitzer: short WebAudio beeps, no files. The context is created on the first
// sound after a tap or key press (browsers keep audio locked until then).

let ctx = null;
let muted = false;

export function setMuted(m) {
  muted = !!m;
}
export function isMuted() {
  return muted;
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** The shared AudioContext (music.js plays through it too), or null before a gesture. */
export function audio() {
  return ac();
}

/** Call from a user gesture so later sounds are allowed. */
export function unlock() {
  ac();
}

function tone(freq, start, dur, { type = "sine", gain = 0.12, to = null } = {}) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  coin: () => tone(1320, 0, 0.08, { type: "square", gain: 0.05, to: 1760 }),
  correct: () => {
    tone(660, 0, 0.1, { type: "triangle" });
    tone(880, 0.08, 0.1, { type: "triangle" });
    tone(1320, 0.16, 0.16, { type: "triangle" });
  },
  wrong: () => tone(220, 0, 0.35, { type: "sawtooth", gain: 0.08, to: 110 }),
  hit: () => tone(140, 0, 0.25, { type: "square", gain: 0.08, to: 70 }),
  jump: () => tone(400, 0, 0.12, { type: "sine", gain: 0.06, to: 700 }),
  lane: () => tone(520, 0, 0.04, { type: "sine", gain: 0.03 }),
  smash: () => tone(180, 0, 0.12, { type: "square", gain: 0.06, to: 520 }),
  power: () => {
    tone(523, 0, 0.09, { type: "square", gain: 0.05 });
    tone(784, 0.07, 0.09, { type: "square", gain: 0.05 });
    tone(1047, 0.14, 0.18, { type: "square", gain: 0.05 });
  },
  warp: () => tone(300, 0, 0.45, { type: "sawtooth", gain: 0.06, to: 1500 }),
  over: () => {
    tone(440, 0, 0.18, { type: "triangle" });
    tone(330, 0.18, 0.18, { type: "triangle" });
    tone(220, 0.36, 0.4, { type: "triangle" });
  },
};
