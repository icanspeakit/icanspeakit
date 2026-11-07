// Hör-Safari background music: a soft Brazilian groove (samba-funk / bossa) made with
// WebAudio, no files. Surdo, ganzá shaker, a bossa clave, a funky bass and Rhodes-like chord
// stabs over Dm9 – G13 – Cmaj9 – A7. It stays far below the word voices, which are the game,
// and ducks further while a word is spoken. The sound switch turns it off with the effects.

const BPM = 100;
const STEP = 60 / BPM / 4; // one 16th
const VOL = 0.07; // the whole groove, against the voice at full volume
const DUCK = 0.3; // share of VOL while a word is spoken
const SWING = 0.1; // off-16ths a little late: the samba "suingue"

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// one bar each: bass root (midi) and the chord voicing
const CHORDS = [
  { root: 38, notes: [53, 57, 60, 64] }, // Dm9
  { root: 43, notes: [53, 57, 59, 64] }, // G13
  { root: 36, notes: [52, 55, 59, 62] }, // Cmaj9
  { root: 45, notes: [55, 61, 65, 67] }, // A7(b13)
];
// [step, semitones above the root]
const BASS = [[0, 0], [3, 0], [6, 12], [8, 0], [11, 7], [14, 10]];
const STABS = [3, 6, 10, 14];
const CLAVE = [0, 3, 6, 10, 13];
const SHAKE = [0.55, 0.25, 0.35, 0.85]; // accent on the last 16th of each beat
const AGOGO = [[0, 1], [2, 1], [4, 0], [7, 0], [10, 1]]; // [step, high?] in bars 1 and 3

export function makeMusic() {
  let ac = null;
  let master = null;
  let noiseBuf = null;
  let timer = null;
  let step = 0;
  let nextAt = 0;
  let muted = false;
  let want = false; // the game is in play
  let ducked = false;

  function ctx() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
      master = ac.createGain();
      master.gain.value = 0;
      const soften = ac.createBiquadFilter();
      soften.type = "lowpass";
      soften.frequency.value = 5000;
      master.connect(soften).connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }

  function env(t, gain, attack, decay) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(master);
    return g;
  }

  function osc(t, type, freq, out, dur, slide = null) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    o.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function surdo(t, strong) {
    osc(t, "sine", strong ? 72 : 80, env(t, strong ? 0.9 : 0.4, 0.005, strong ? 0.45 : 0.18), 0.5, 48);
  }

  function shaker(t, gain) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6500;
    src.connect(f).connect(env(t, gain * 0.35, 0.004, 0.05));
    src.start(t);
    src.stop(t + 0.1);
  }

  function wood(t, freq, gain) {
    osc(t, "sine", freq, env(t, gain, 0.002, 0.05), 0.08);
  }

  function bass(t, midi) {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 520;
    lp.connect(env(t, 0.75, 0.008, 0.2));
    osc(t, "triangle", hz(midi), lp, 0.25);
    osc(t, "sine", hz(midi), lp, 0.25);
  }

  function stab(t, notes) {
    const out = env(t, 0.16, 0.006, 0.32);
    for (const n of notes) {
      osc(t, "sine", hz(n), out, 0.4);
      osc(t, "sine", hz(n + 12) * 1.002, out, 0.4); // a touch of shimmer, like a Rhodes tine
    }
  }

  function playStep(s, t) {
    const i = s % 16;
    const bar = Math.floor(s / 16) % CHORDS.length;
    const chord = CHORDS[bar];
    if (i === 4 || i === 12) surdo(t, true);
    else if (i === 0 || i === 8) surdo(t, false);
    shaker(t, SHAKE[i % 4]);
    if (CLAVE.includes(i)) wood(t, 1750, 0.18);
    if (bar % 2 === 0) for (const [at, high] of AGOGO) if (at === i) wood(t, high ? 1320 : 880, 0.12);
    for (const [at, up] of BASS) if (at === i) bass(t, chord.root + up);
    if (STABS.includes(i)) stab(t, chord.notes);
  }

  function schedule() {
    while (nextAt < ac.currentTime + 0.15) {
      playStep(step, nextAt + (step % 2 ? SWING * STEP : 0));
      step++;
      nextAt += STEP;
    }
  }

  function level() {
    return want && !muted ? VOL * (ducked ? DUCK : 1) : 0;
  }

  function update(fade) {
    if (!ac) return;
    master.gain.setTargetAtTime(level(), ac.currentTime, fade);
    const on = want && !muted;
    if (on && !timer) {
      nextAt = ac.currentTime + 0.05;
      timer = setInterval(schedule, 25);
    } else if (!on && timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    /** Play while the game runs; call from a tap the first time (autoplay rules). */
    setPlaying(on) {
      if (on === want) return;
      want = on;
      if (on && !ctx()) return;
      update(on ? 0.6 : 0.1);
    },
    setMuted(m) {
      muted = m;
      update(0.1);
    },
    /** Lower the groove while a word is spoken (cheap to call every frame). */
    duck(on) {
      if (on === ducked) return;
      ducked = on;
      if (ac && timer) master.gain.setTargetAtTime(level(), ac.currentTime, on ? 0.05 : 0.4);
    },
  };
}
