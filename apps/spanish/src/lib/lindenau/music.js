// Lindenau's music and sound effects, made in the browser with Web Audio – no audio files.
// The tunes are written here as notes (our own melodies), one token per eighth note:
//   "C5"  a new note        "-"  the note before keeps sounding        "."  rest
// Drums: k = kick, s = snare, h = hi-hat, "." = nothing.
//
// The AudioContext starts on the first play(), which always follows a tap (Los geht's, Weiter),
// so the autoplay rule never blocks it. One switch for music and effects, remembered in
// One sound switch for all learner games (src/lib/spieleEinstellungen.js, key da.spiele.muted);
// until that exists the old localStorage "da-lindenau-sound" ("off" = quiet) counts. Storage
// may fail, then it is simply on.

const SONGS = {
  // The town: F major, easy walking pace.
  town: {
    bpm: 112,
    lead: { wave: "triangle", vol: 0.16, notes:
      "A4 - C5 - F5 - C5 - D5 - C5 A4 G4 - . . Bb4 - D5 - G5 - F5 E5 F5 - - - . . . . " +
      "A4 - C5 - F5 - A5 - G5 - F5 D5 C5 - . A4 Bb4 - A4 - G4 - E4 G4 F4 - - - . . . ." },
    bass: { wave: "sine", vol: 0.22, notes:
      "F2 . C3 . F2 . C3 . Bb2 . F3 . Bb2 . F3 . G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . " +
      "F2 . C3 . F2 . C3 . C3 . G3 . C3 . G3 . Bb2 . F3 . C3 . G3 . F2 . C3 . F2 . . . ." },
    drums: "k . h . s . h . k . h . s . h h",
    drumVol: 0.5,
  },
  // A level: A minor, running.
  action: {
    bpm: 144,
    lead: { wave: "square", vol: 0.07, notes:
      "A4 . A4 C5 E5 - D5 C5 D5 - B4 - G4 - . . C5 . C5 E5 G5 - F5 E5 E5 - - - . . E5 F5 " +
      "G5 - E5 - C5 - A4 C5 D5 - F5 - A5 - G5 F5 E5 - C5 - B4 - G#4 B4 A4 - - - . . . ." },
    bass: { wave: "triangle", vol: 0.24, notes:
      "A2 A3 A2 A3 A2 A3 A2 A3 G2 G3 G2 G3 G2 G3 G2 G3 C3 C4 C3 C4 C3 C4 C3 C4 E2 E3 E2 E3 E2 E3 E2 E3 " +
      "C3 C4 C3 C4 C3 C4 C3 C4 D3 D4 D3 D4 D3 D4 D3 D4 E2 E3 E2 E3 E2 E3 E2 E3 A2 A3 A2 A3 A2 . A2 ." },
    drums: "k . h . s . h h k . h k s . h h",
    drumVol: 0.6,
  },
  // The boss: D minor, faster.
  boss: {
    bpm: 160,
    lead: { wave: "square", vol: 0.07, notes:
      "D5 D5 . D5 F5 - E5 D5 C#5 - A4 - E5 - . . D5 D5 . D5 G5 - F5 E5 F5 - E5 - C#5 - A4 -" },
    bass: { wave: "triangle", vol: 0.26, notes:
      "D2 D3 D2 D3 D2 D3 D2 D3 A2 A3 A2 A3 A2 A3 A2 A3 G2 G3 G2 G3 G2 G3 G2 G3 A2 A3 A2 A3 A2 A3 C#3 A2" },
    drums: "k h s h k k s h",
    drumVol: 0.65,
  },
};
// Played once: a level or the day is done.
const JINGLES = {
  win: { bpm: 200, lead: { wave: "square", vol: 0.09, notes: "C5 E5 G5 C6 - . G5 C6 - - -" }, bass: { wave: "triangle", vol: 0.22, notes: "C3 . . C3 - . G2 C3 - - -" } },
};

import { GAME_MUTE_EVENT, gameMuted, setGameMuted } from "../spieleEinstellungen.js";

const KEY = "da-lindenau-sound"; // the old, Lindenau-only switch
let on = !gameMuted((() => { try { return localStorage.getItem(KEY) === "off"; } catch { return false; } })());
const watchers = new Set();

let ac = null, master, musicBus, sfxBus, noise;
let song = null, songName = null, step = 0, nextT = 0, timer = 0, events = null;
let duck = 1;

const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
function freq(name) {
  const m = /^([A-G][#b]?)(\d)$/.exec(name);
  if (!m) return 0;
  return 440 * 2 ** ((NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
}
/** "C5 - . E5" → [{ at, len, f }] in eighths. */
function parse(notes) {
  const toks = notes.trim().split(/\s+/), out = [];
  toks.forEach((tok, i) => {
    if (tok === "-" || tok === ".") { return; }
    let len = 1;
    while (toks[i + len] === "-") len++;
    out.push({ at: i, len, f: freq(tok) });
  });
  return { events: out, steps: toks.length };
}
function compile(s) {
  const lead = parse(s.lead.notes), bass = parse(s.bass.notes);
  const drums = s.drums ? s.drums.trim().split(/\s+/) : [];
  return { ...s, leadEv: lead.events, bassEv: bass.events, steps: Math.max(lead.steps, bass.steps), drumToks: drums };
}

function ensure() {
  if (ac) return ac.state === "suspended" && !held ? (ac.resume().catch(() => {}), true) : true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ac = new AC();
  master = ac.createGain(); master.gain.value = on ? 1 : 0; master.connect(ac.destination);
  musicBus = ac.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
  noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

function tone(bus, wave, f, t, dur, vol, slideTo) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(f, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}
function hiss(bus, t, dur, vol, type, hz) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise;
  f.type = type; f.frequency.value = hz;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t); s.stop(t + dur + 0.02);
}
function drum(k, t, vol) {
  if (k === "k") tone(musicBus, "sine", 140, t, 0.16, 0.5 * vol, 45);
  else if (k === "s") hiss(musicBus, t, 0.12, 0.22 * vol, "bandpass", 1800);
  else if (k === "h") hiss(musicBus, t, 0.035, 0.08 * vol, "highpass", 7000);
}

function schedule() {
  if (!song) return;
  const eighth = 60 / song.bpm / 2;
  while (nextT < ac.currentTime + 0.15) {
    const s = step % song.steps;
    for (const e of song.leadEv) if (e.at === s) tone(musicBus, song.lead.wave, e.f, nextT, e.len * eighth * 0.95, song.lead.vol);
    for (const e of song.bassEv) if (e.at === s) tone(musicBus, song.bass.wave, e.f, nextT, e.len * eighth * 0.9, song.bass.vol);
    if (song.drumToks.length) drum(song.drumToks[s % song.drumToks.length], nextT, song.drumVol);
    step++;
    nextT += eighth;
    if (song.once && step >= song.steps) { song = null; songName = null; return; }
  }
}

/** Music: "town" | "action" | "boss" loop; "win" plays once; null stops. */
export function play(name) {
  if (name === songName) return;
  if (!name) { stop(); return; }
  if (!ensure()) return;
  events ||= Object.fromEntries([...Object.entries(SONGS), ...Object.entries(JINGLES)].map(([k, s]) => [k, compile(s)]));
  song = { ...events[name], once: !!JINGLES[name] };
  songName = name;
  step = 0;
  nextT = ac.currentTime + 0.06;
  clearInterval(timer);
  timer = setInterval(schedule, 30);
  schedule();
}
export function stop() {
  song = null; songName = null;
  clearInterval(timer);
}
/** Quieter under a dialogue, so the voices stay clear. */
export function setDuck(d) {
  duck = d;
  if (ac) musicBus.gain.setTargetAtTime(0.55 * duck, ac.currentTime, 0.15);
}

export function soundOn() { return on; }
export function setSound(v) {
  applySound(v);
  setGameMuted(!v); // every other game, and this one's listener, hear it
}
function applySound(v) {
  on = v;
  if (ac) master.gain.setTargetAtTime(v ? 1 : 0, ac.currentTime, 0.05);
  watchers.forEach((fn) => fn(v));
}
/** Calls fn(on) when the sound is switched here or in another game / tab. */
export function onSoundChange(fn) { watchers.add(fn); }
if (typeof window !== "undefined") {
  window.addEventListener(GAME_MUTE_EVENT, (e) => applySound(!e.detail.muted));
  window.addEventListener("storage", (e) => { if (e.key === "da.spiele.muted") applySound(!gameMuted()); });
}

/** Holds the sound while the game is paused (the clock stops, so the music does too). */
let held = false;
export function hold(v) {
  held = v;
  if (!ac) return;
  if (v) ac.suspend().catch(() => {}); else ac.resume().catch(() => {});
}

/** A short effect. */
export function sfx(name) {
  if (!on || !ensure()) return;
  const t = ac.currentTime + 0.005;
  switch (name) {
    case "shoot": tone(sfxBus, "sine", 520, t, 0.12, 0.18, 1100); break;
    case "trap": tone(sfxBus, "triangle", 300, t, 0.18, 0.2, 700); break;
    case "pop": tone(sfxBus, "sine", 900, t, 0.08, 0.22, 1800); hiss(sfxBus, t, 0.06, 0.12, "highpass", 3000); break;
    case "jump": tone(sfxBus, "square", 260, t, 0.14, 0.07, 620); break;
    case "hit": tone(sfxBus, "sawtooth", 220, t, 0.25, 0.1, 70); hiss(sfxBus, t, 0.15, 0.12, "lowpass", 600); break;
    case "splash": hiss(sfxBus, t, 0.4, 0.25, "lowpass", 900); tone(sfxBus, "sine", 180, t, 0.3, 0.15, 60); break;
    case "throw": tone(sfxBus, "triangle", 160, t, 0.2, 0.14, 90); break;
    case "boss": tone(sfxBus, "sawtooth", 110, t, 0.5, 0.1, 55); break;
    case "coin": tone(sfxBus, "square", 988, t, 0.07, 0.07); tone(sfxBus, "square", 1319, t + 0.07, 0.14, 0.07); break;
    case "power": [523, 659, 784, 1047].forEach((f, i) => tone(sfxBus, "square", f, t + i * 0.07, 0.1, 0.07)); break;
    case "shrink": [784, 587, 440].forEach((f, i) => tone(sfxBus, "square", f, t + i * 0.08, 0.1, 0.07)); break;
    case "bump": tone(sfxBus, "square", 180, t, 0.08, 0.1, 120); break;
  }
}
