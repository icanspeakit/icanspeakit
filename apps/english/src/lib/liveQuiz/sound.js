import { withBase } from "../paths.js";
// The live quiz's sound: game-show music on the projector and short effects on both
// screens. The music is CC0 loops from OpenGameArt in public/audio/quiz/ (see
// TRACKS below); the effects are synthesised with the Web Audio API. If a loop can't be
// loaded, the old synthesised songs play instead. The projector plays the music; the
// phones only click, cheer and groan, because thirty phones playing music at once is noise.
//
//   music("lobby" | "question" | "board" | null)   one loop at a time, null stops it
//   sfx("click" | "join" | "tick" | "tickLast" | "gong" | "flip" | "correct" | "wrong" |
//       "drumroll" | "step" | "fanfare")
//   victory() / stopVictory()   the winner's tune after the fanfare, about 16 s
//   unlock()   from a click: browsers start audio only after a gesture
//
// Muted is remembered per browser ("lq.sound" = "off"); every [data-sound-toggle] on the
// page shows and flips it.
//
// The music style is remembered too ("lq.music"): "lofi" (calm study loops, the default),
// "show" (game-show loops), "retro" (the synthesised songs) or "off" (effects only). It is chosen where the music plays —
// the projector, or the phone in a solo game — via [name=music] radios and
// [data-music-cycle] buttons. A phone in a class game plays no music and shows no choice.

const KEY = "lq.sound";
let on = true;
try { on = localStorage.getItem(KEY) !== "off"; } catch {}

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let noiseBuf = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = on ? 1 : 0;
  // A gentle limiter, so stacked notes never clip on a classroom speaker.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.55;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function unlock() {
  const c = ensure();
  if (c?.state === "suspended") c.resume();
}

export const isOn = () => on;

const MUSIC_KEY = "lq.music";
const STYLES = ["lofi", "show", "retro", "off"];
let style = "lofi";
try { const v = localStorage.getItem(MUSIC_KEY); if (STYLES.includes(v)) style = v; } catch {}
let wanted = null; // the screen's song, kept while the style is "off" so a switch can resume it

export const musicStyle = () => style;

export function setMusicStyle(value) {
  if (!STYLES.includes(value) || value === style) return;
  style = value;
  try { localStorage.setItem(MUSIC_KEY, style); } catch {}
  // Restart the current screen's song in the new style (or stop it for "off").
  if (ctx) {
    stopSong();
    music(wanted);
  }
  syncMusicPickers();
}

function syncMusicPickers() {
  document.querySelectorAll("input[name=music]").forEach((r) => (r.checked = r.value === style));
  document.querySelectorAll("[data-music-cycle]").forEach((b) => (b.dataset.style = style));
}

/** Wires the music choice: [name=music] radios and [data-music-cycle] buttons (next style). */
export function mountMusicPickers(root = document) {
  root.querySelectorAll("input[name=music]").forEach((r) => r.addEventListener("change", () => r.checked && setMusicStyle(r.value)));
  root.querySelectorAll("[data-music-cycle]").forEach((b) => b.addEventListener("click", () => {
    unlock();
    setMusicStyle(STYLES[(STYLES.indexOf(style) + 1) % STYLES.length]);
  }));
  syncMusicPickers();
}

export function setOn(value) {
  on = value;
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
  if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
  if (on) unlock();
  syncToggles();
}

function syncToggles() {
  document.querySelectorAll("[data-sound-toggle]").forEach((b) => {
    b.setAttribute("aria-pressed", String(on));
    b.dataset.on = on ? "1" : "0";
  });
}

/** Wires every [data-sound-toggle] on the page. */
export function mountSoundToggles(root = document) {
  root.querySelectorAll("[data-sound-toggle]").forEach((b) => b.addEventListener("click", () => setOn(!on)));
  syncToggles();
}

/* ---- Voices ----------------------------------------------------------------------- */
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function tone(out, freq, t, dur, { type = "triangle", vol = 0.2, attack = 0.005, glide = null, lp = null } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o.connect(g);
  if (lp) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = lp;
    node = node.connect(f);
  }
  node.connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(out, t, dur, { vol = 0.1, type = "highpass", freq = 6000, sweep = null } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

function kick(out, t, vol = 0.5) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.25);
}

/* ---- Music -------------------------------------------------------------------------
   A tiny step sequencer: sixteenth notes scheduled a little ahead of the clock. Each song
   is four bars of chords with bass, a plucked arpeggio and drums. */
const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];

const SONGS = {
  // Lobby and ranking: relaxed and bright, I–vi–IV–V in C.
  lobby: {
    bpm: 104,
    bars: [[48, MAJ], [45, MIN], [41, MAJ], [43, MAJ]],
    play(out, s, t, d, [root, chord]) {
      if (s === 0 || s === 8) kick(out, t, 0.32);
      if (s % 4 === 2) noise(out, t, 0.04, { vol: 0.035 });
      if (s === 4 || s === 12) noise(out, t, 0.12, { vol: 0.05, type: "bandpass", freq: 1800 });
      if ([0, 6, 8, 14].includes(s)) tone(out, hz(root - 12), t, d * 1.8, { vol: 0.32 });
      if (s === 4 || s === 12) chord.forEach((i) => tone(out, hz(root + 12 + i), t, d * 2.5, { type: "square", vol: 0.035, lp: 1800 }));
      const mel = [0, null, 2, null, 1, null, 2, 1, 0, null, 2, null, 1, 2, null, null][s];
      if (mel != null) tone(out, hz(root + 24 + chord[mel]), t, d * 1.4, { type: "sine", vol: 0.11 });
    },
  },
  // A question: driving and a little tense, Am–F–C–G at 132.
  question: {
    bpm: 132,
    bars: [[45, MIN], [41, MAJ], [48, MAJ], [43, MAJ]],
    play(out, s, t, d, [root, chord]) {
      if (s % 4 === 0) kick(out, t, 0.42);
      if (s % 2 === 1) noise(out, t, 0.03, { vol: 0.03 });
      if (s === 4 || s === 12) noise(out, t, 0.14, { vol: 0.07, type: "bandpass", freq: 1500 });
      if (s % 2 === 0) tone(out, hz(root - 12 + (s % 4 === 2 ? 12 : 0)), t, d * 1.2, { vol: 0.3 });
      tone(out, hz(root + 24 + chord[s % 3] + (s >= 8 ? 12 : 0)), t, d * 0.8, { type: "square", vol: 0.028, lp: 2600 });
    },
  },
};
SONGS.board = SONGS.lobby;

/* Recorded loops per style, all CC0 (public domain, no credit needed), normalised to -18 LUFS.
   lofi, all by omfgdude:
     lobby     "Lofi Hip Hop Loop", opengameart.org/content/lofi-hip-hop-loop
     question  "lofi again", opengameart.org/content/lofi-again
     board     "Chill lofi inspired", opengameart.org/content/chill-lofi-inspired
   show:
     lobby     "bgm_menu_title_1_relaxed", SubspaceAudio, opengameart.org/content/12-music-loops
     question  "bgm_stage_3" (Retro Sports), SubspaceAudio, same pack
     board     "Happy Clappy Loop", OwlishMedia, opengameart.org/content/happy-clappy-loop */
const TRACKS = {
  lofi: {
    lobby: "/audio/quiz/lofi-lobby.mp3",
    question: "/audio/quiz/lofi-question.mp3",
    board: "/audio/quiz/lofi-board.mp3",
  },
  show: {
    lobby: "/audio/quiz/lobby.mp3",
    question: "/audio/quiz/question.mp3",
    board: "/audio/quiz/board.mp3",
  },
};
const buffers = {}; // url → Promise<AudioBuffer | null>

function loadTrack(name) {
  const url = TRACKS[style]?.[name];
  if (!url) return Promise.resolve(null);
  buffers[url] ??= fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
    .catch(() => null);
  return buffers[url];
}

let song = null; // { name, out, timer?, src? }

function stopSong() {
  if (!song) return;
  const { out, timer, src } = song;
  if (timer) clearInterval(timer);
  out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
  setTimeout(() => { try { src?.stop(); } catch {} out.disconnect(); }, 1500);
  song = null;
}

/** The synthesised fallback: the step sequencer above. */
function playSynth(current, def) {
  const d = 60 / def.bpm / 4;
  let step = 0;
  let next = ctx.currentTime + 0.06;
  current.timer = setInterval(() => {
    while (next < ctx.currentTime + 0.25) {
      const bar = def.bars[Math.floor(step / 16) % def.bars.length];
      def.play(current.out, step % 16, next, d, bar);
      step++;
      next += d;
    }
  }, 60);
}

export function music(name) {
  wanted = name;
  if (style === "off") name = null;
  if (song?.name === name) return;
  stopSong();
  if (!name || !(TRACKS[style]?.[name] || SONGS[name]) || !ensure()) return;
  const out = ctx.createGain();
  out.connect(musicBus);
  const current = { name, out };
  song = current;
  // "retro" has no loops and goes straight to the synthesised songs; "lofi" and "show" fall
  // back to them only when a loop can't be loaded.
  loadTrack(name).then((buf) => {
    if (song !== current) return; // another screen came first
    if (!buf) {
      out.gain.value = 1;
      if (SONGS[name]) playSynth(current, SONGS[name]);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(out);
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.6);
    src.start();
    current.src = withBase(src);
  });
}

/** Fetches and decodes the loops ahead of time, so the first screen doesn't wait. */
export function preloadMusic() {
  if (!TRACKS[style] || !ensure()) return;
  Object.keys(TRACKS[style]).forEach(loadTrack);
}

/* ---- Effects ------------------------------------------------------------------------ */
const FX = {
  click: (o, t) => { tone(o, 1050, t, 0.06, { type: "square", vol: 0.12, lp: 3000 }); tone(o, 1580, t + 0.015, 0.05, { type: "sine", vol: 0.18 }); },
  join: (o, t) => { tone(o, hz(76), t, 0.09, { type: "sine", vol: 0.18 }); tone(o, hz(83), t + 0.07, 0.14, { type: "sine", vol: 0.18 }); },
  tick: (o, t) => tone(o, 1200, t, 0.06, { type: "sine", vol: 0.22 }),
  tickLast: (o, t) => { tone(o, 1600, t, 0.08, { type: "sine", vol: 0.28 }); tone(o, 800, t, 0.08, { type: "square", vol: 0.04, lp: 2000 }); },
  gong: (o, t) => { [55, 110, 165.5, 221].forEach((f, i) => tone(o, f, t, 1.6, { type: "sine", vol: 0.22 / (i + 1), attack: 0.01 })); noise(o, t, 0.4, { vol: 0.08, type: "lowpass", freq: 900 }); },
  flip: (o, t) => noise(o, t, 0.12, { vol: 0.09, type: "bandpass", freq: 900, sweep: 4000 }),
  correct: (o, t) => [72, 76, 79, 84].forEach((n, i) => tone(o, hz(n), t + i * 0.075, i === 3 ? 0.45 : 0.14, { vol: 0.2 })),
  wrong: (o, t) => { tone(o, hz(52), t, 0.22, { type: "square", vol: 0.14, lp: 1200 }); tone(o, hz(47), t + 0.2, 0.42, { type: "square", vol: 0.14, lp: 1000, glide: hz(45) }); },
  drumroll: (o, t) => { for (let i = 0; i < 44; i++) noise(o, t + i * 0.04, 0.05, { vol: 0.05 + (i / 44) * 0.2, type: "bandpass", freq: 1400 }); },
  step: (o, t) => { kick(o, t, 0.5); noise(o, t, 0.25, { vol: 0.12, type: "highpass", freq: 3000 }); },
  fanfare: (o, t) => {
    const lead = [[67, 0, 0.14], [67, 0.15, 0.14], [67, 0.3, 0.14], [72, 0.45, 0.9]];
    lead.forEach(([n, at, len]) => { tone(o, hz(n), t + at, len, { type: "square", vol: 0.07, lp: 3200 }); tone(o, hz(n - 12), t + at, len, { vol: 0.14 }); });
    [60, 64, 67, 72].forEach((n) => tone(o, hz(n), t + 0.45, 1.3, { type: "sawtooth", vol: 0.035, lp: 2400, attack: 0.03 }));
    kick(o, t + 0.45, 0.5);
    noise(o, t + 0.45, 0.9, { vol: 0.07, type: "highpass", freq: 5000 });
  },
};

export function sfx(name) {
  if (!on || !FX[name] || !ensure()) return;
  if (ctx.state === "suspended") ctx.resume();
  FX[name](sfxBus, ctx.currentTime + 0.01);
}

/* ---- Victory --------------------------------------------------------------------------
   The winner's tune after the fanfare, about 16 seconds, as on a game show: a brass melody
   over C–F–G–C–Am–F–G–C, bass and drums, a snare roll into the last bar and a held final
   chord with a cymbal. Synthesised like the effects, on its own gain node so it can be faded
   out (stopVictory) when the host starts a new game. Muted with the other sounds. */
let victoryOut = null;

export function victory() {
  if (!on || !ensure()) return;
  if (ctx.state === "suspended") ctx.resume();
  stopVictory();
  const out = ctx.createGain();
  out.connect(sfxBus);
  victoryOut = out;
  const t0 = ctx.currentTime + 0.05;
  const beat = 0.5; // 120 bpm
  const at = (b) => t0 + b * beat;
  const brass = (n, b, len, vol = 0.075) => {
    tone(out, hz(n), at(b), len * beat, { type: "square", vol, lp: 3000, attack: 0.02 });
    tone(out, hz(n - 12), at(b), len * beat, { type: "triangle", vol: vol * 1.8, attack: 0.02 });
  };
  const bars = [[48, MAJ], [41, MAJ], [43, MAJ], [48, MAJ], [45, MIN], [41, MAJ], [43, MAJ], [48, MAJ]];
  bars.forEach(([root, chord], i) => {
    const b = i * 4;
    const last = i === bars.length - 1;
    chord.forEach((k) => tone(out, hz(root + 12 + k), at(b), (last ? 6 : 4) * beat, { type: "sawtooth", vol: 0.022, lp: 2000, attack: 0.08 }));
    [0, 1.5, 2, 3].forEach((s) => !(last && s > 0) && tone(out, hz(root - 12), at(b + s), (last ? 4 : 0.45) * beat, { vol: 0.26 }));
    if (!last) {
      [0, 2].forEach((s) => kick(out, at(b + s), 0.42));
      [1, 3].forEach((s) => noise(out, at(b + s), 0.14, { vol: 0.08, type: "bandpass", freq: 1700 }));
      for (let s = 0; s < 4; s += 0.5) noise(out, at(b + s), 0.03, { vol: 0.025 });
    }
  });
  // The melody: [midi, beat, length in beats].
  [
    [67, 0, 1], [72, 1, 1], [76, 2, 1.5], [74, 3.5, 0.5],
    [72, 4, 1], [69, 5, 1], [72, 6, 1], [77, 7, 1],
    [74, 8, 1.5], [71, 9.5, 0.5], [74, 10, 1], [79, 11, 1],
    [76, 12, 1.5], [74, 13.5, 0.5], [72, 14, 2],
    [76, 16, 1], [81, 17, 1], [79, 18, 1], [76, 19, 1],
    [77, 20, 1], [81, 21, 1], [84, 22, 2],
    [83, 24, 1], [81, 25, 0.5], [79, 25.5, 0.5], [77, 26, 1], [74, 27, 1],
    [84, 28, 5],
  ].forEach(([n, b, len]) => brass(n, b, len, b >= 28 ? 0.09 : 0.075));
  // Snare roll into the last bar, then kick, cymbal and the held chord.
  for (let i = 0; i < 16; i++) noise(out, at(27) + i * (beat / 8), 0.05, { vol: 0.04 + i * 0.008, type: "bandpass", freq: 1600 });
  kick(out, at(28), 0.6);
  noise(out, at(28), 3, { vol: 0.12, type: "highpass", freq: 5000 });
  [60, 64, 67, 72, 76].forEach((n) => tone(out, hz(n), at(28), 3.2, { type: "sawtooth", vol: 0.03, lp: 2600, attack: 0.03 }));
}

export function stopVictory() {
  if (!victoryOut || !ctx) return;
  const o = victoryOut;
  victoryOut = null;
  o.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
  setTimeout(() => o.disconnect(), 2000);
}
