// Quaki springt: the sounds, synthesised with WebAudio on the games' shared context
// (artikelSprint/sound.js) – no files. The charge is one tone that rises while the button is
// held and stops on release; the rest are one-shots.

import { audio, isMuted } from "../artikelSprint/sound.js";

function tone(freq, start, dur, { type = "sine", gain = 0.1, to = null, curve = "exp" } = {}) {
  const c = audio();
  if (!c || isMuted()) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) curve === "lin" ? o.frequency.linearRampToValueAtTime(to, t + dur) : o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise(start, dur, { gain = 0.08, freq = 800, q = 1, type = "lowpass" } = {}) {
  const c = audio();
  if (!c || isMuted()) return;
  const t = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.02);
}

let charge = null;

export const qsfx = {
  /** The charge tone: starts low, climbs over the 0.9 s. */
  chargeStart() {
    const c = audio();
    if (!c || isMuted() || charge) return;
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime;
    o.type = "triangle";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(720, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.05);
    o.connect(g).connect(c.destination);
    o.start(t);
    charge = { o, g };
  },
  chargeStop() {
    const c = audio();
    if (!charge || !c) return;
    const { o, g } = charge;
    charge = null;
    const t = c.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.stop(t + 0.06);
  },
  jump(c = 0.5) {
    tone(260 + 200 * c, 0, 0.16, { type: "sine", gain: 0.09, to: 620 + 500 * c });
    tone(130, 0, 0.08, { type: "square", gain: 0.03, to: 90 });
  },
  land(drop = 0) {
    noise(0, drop > 200 ? 0.16 : 0.07, { gain: drop > 200 ? 0.22 : 0.08, freq: drop > 200 ? 500 : 1200 });
    if (drop > 200) tone(110, 0, 0.18, { type: "sine", gain: 0.12, to: 55 });
  },
  bonk() {
    tone(520, 0, 0.09, { type: "square", gain: 0.05, to: 260 });
    noise(0, 0.05, { gain: 0.07, freq: 2500, type: "bandpass", q: 3 });
  },
  blubb() {
    for (let i = 0; i < 3; i++) tone(300 + i * 90, i * 0.08, 0.1, { type: "sine", gain: 0.07, to: 700 + i * 120 });
    noise(0.05, 0.3, { gain: 0.05, freq: 600 });
  },
  right() {
    tone(660, 0, 0.09, { type: "triangle", gain: 0.08 });
    tone(990, 0.07, 0.14, { type: "triangle", gain: 0.08 });
  },
  wrong() {
    tone(240, 0, 0.3, { type: "sawtooth", gain: 0.05, to: 120 });
  },
  /** The long-fall scream: a frog croak that drops with him. */
  quaak() {
    const c = audio();
    if (!c || isMuted()) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const lfo = c.createOscillator();
    const lg = c.createGain();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 1.1);
    lfo.frequency.value = 26;
    lg.gain.value = 40;
    lfo.connect(lg).connect(o.frequency);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
    g.gain.setValueAtTime(0.12, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    o.connect(f).connect(g).connect(c.destination);
    o.start(t); lfo.start(t);
    o.stop(t + 1.2); lfo.stop(t + 1.2);
  },
  flag() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.12, { type: "square", gain: 0.035 }));
  },
  win() {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, { type: "triangle", gain: 0.08 }));
  },
};
