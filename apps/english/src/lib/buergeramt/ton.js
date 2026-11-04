// Bruno’s Front Desk sounds, made with WebAudio like Hamstis Wachtelhuhn (src/lib/hoerSafari/
// sound.js): the number display's ding-dong, paper sliding, the stamp's thunk, a low murmur of
// the queue. No files. One mute switch for all games (src/lib/spieleEinstellungen.js).

export function makeTon() {
  let ac = null;
  let muted = false;
  let noiseBuf = null;
  let murmel = null;

  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }

  function buf(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function noise(at, dur, gain, freq, type = "bandpass") {
    const c = ctx();
    if (!c || muted) return;
    const src = c.createBufferSource();
    src.buffer = buf(c);
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    const t = c.currentTime + at;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
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

  function stopMurmel() {
    if (!murmel) return;
    try { murmel.g.gain.setTargetAtTime(0.0001, murmel.c.currentTime, 0.3); murmel.src.stop(murmel.c.currentTime + 1); } catch {}
    murmel = null;
  }

  return {
    unlock: () => ctx(),
    setMuted(m) { muted = m; if (m) stopMurmel(); },
    /** The number display: ding-dong. */
    ding() { tone(0, 1046, 0.6, "sine", 0.16); tone(0.32, 784, 0.8, "sine", 0.16); },
    papier() { noise(0, 0.28, 0.12, 2600, "highpass"); },
    stempel() { tone(0, 120, 0.18, "sine", 0.4, 50); noise(0, 0.08, 0.35, 500, "lowpass"); },
    passt() { tone(0, 660, 0.1, "triangle", 0.08); },
    fund() { tone(0, 523, 0.1, "triangle", 0.12); tone(0.09, 784, 0.16, "triangle", 0.12); },
    falsch() { tone(0, 300, 0.25, "sawtooth", 0.06, 170); },
    verwarnung() { tone(0, 440, 0.18, "square", 0.06); tone(0.2, 330, 0.3, "square", 0.06); },
    tick() { tone(0, 1500, 0.03, "square", 0.04); },
    ende() { [784, 988, 1175, 1568].forEach((f, i) => tone(i * 0.1, f, 0.2, "triangle", 0.12)); },
    /** The queue, low and steady; level 0..1 follows how full the room is. */
    murmeln(level) {
      const c = ctx();
      if (!c || muted) { stopMurmel(); return; }
      if (!murmel) {
        const src = c.createBufferSource();
        src.buffer = buf(c);
        src.loop = true;
        const f = c.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 380;
        const g = c.createGain();
        g.gain.value = 0.0001;
        src.connect(f).connect(g).connect(c.destination);
        src.start();
        murmel = { c, src, g };
      }
      murmel.g.gain.setTargetAtTime(0.004 + 0.02 * Math.max(0, Math.min(1, level)), c.currentTime, 0.8);
    },
    still: () => stopMurmel(),
  };
}
