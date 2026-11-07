// Hör-Safari sound effects, made with WebAudio (no files): a shutter, an empty click,
// a film wind-on, right/wrong chimes, the birds' peeps, a level fanfare. Muting turns these off; the word voices stay on,
// they are the game.

export function makeSfx() {
  let ac = null;
  let muted = false;
  let noiseBuf = null;

  function ctx() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }

  function noise(at, dur, gain, freq) {
    const c = ctx();
    if (!c || muted) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = c.createGain();
    const t = c.currentTime + at;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function tone(at, freq, dur, type = "sine", gain = 0.15, slide = null) {
    const c = ctx();
    if (!c || muted) return;
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + at;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  return {
    unlock: () => ctx(),
    setMuted: (m) => { muted = m; },
    // the blaster: a soft "plopp", not a bang
    pop() {
      tone(0, 520, 0.08, "sine", 0.22, 160);
      noise(0, 0.04, 0.18, 900);
    },
    bonk() { tone(0, 700, 0.06, "square", 0.07, 300); tone(0.05, 1100, 0.12, "sine", 0.08, 1400); },
    empty() { tone(0, 180, 0.06, "square", 0.08); },
    reload() {
      for (let i = 0; i < 5; i++) noise(i * 0.07, 0.03, 0.3, 2400 - i * 200);
      tone(0.38, 990, 0.12, "triangle", 0.1);
    },
    quiz() { tone(0, 520, 0.1, "triangle", 0.1); tone(0.1, 660, 0.12, "triangle", 0.1); },
    squawk() {
      tone(0, 900, 0.12, "sawtooth", 0.07, 1500);
      tone(0.13, 1200, 0.16, "sawtooth", 0.07, 700);
    },
    // a hit Pieper: a happy "piep-piep" when it was the right one, a cross "kreck" when not.
    // p varies the pitch a little from bird to bird.
    peep(happy, p = 1) {
      if (happy) {
        tone(0, 2300 * p, 0.07, "sine", 0.12, 3100 * p);
        tone(0.09, 2600 * p, 0.09, "sine", 0.12, 3500 * p);
      } else {
        tone(0, 1500 * p, 0.09, "sawtooth", 0.06, 900 * p);
        tone(0.1, 1300 * p, 0.12, "sawtooth", 0.06, 700 * p);
      }
    },
    levelUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(i * 0.09, f, 0.18, "triangle", 0.13)); },
    whoosh() { noise(0, 0.5, 0.2, 600); },
    klatsch() {
      noise(0, 0.18, 0.6, 400);
      tone(0, 160, 0.25, "sine", 0.25, 60);
    },
    tick() { tone(0, 1500, 0.03, "square", 0.05); },
    item() { [784, 988, 1175, 1568].forEach((f, i) => tone(i * 0.05, f, 0.1, "sine", 0.12)); },
    right() { tone(0, 880, 0.12, "sine", 0.14); tone(0.09, 1320, 0.2, "sine", 0.12); },
    wrong() { tone(0, 320, 0.22, "sawtooth", 0.06, 180); },
    bonus() { [660, 880, 1100, 1320].forEach((f, i) => tone(i * 0.07, f, 0.14, "triangle", 0.12)); },
    end() { [880, 660, 520].forEach((f, i) => tone(i * 0.14, f, 0.2, "triangle", 0.12)); },
  };
}
