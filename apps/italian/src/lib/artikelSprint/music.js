// Artikel-Flitzer: the background track, synthesised with WebAudio like the sound effects —
// no files, nothing to license. A four-chord chiptune loop (Am F C G) with drums, bass,
// arpeggio and lead, scheduled a little ahead of time on the audio clock so it doesn't
// stutter when a frame is late.
//
// It runs during play only. The tempo follows the run: 128 BPM at the start, up to 156 at
// top speed; Turbo lifts the arpeggio an octave and doubles the hi-hat.
//
// createMusic(track) plays another tune on the same engine (Vorfahrt-Flitzer has its own).

import { audio, isMuted } from "./sound.js";

const LOOK = 0.12; // seconds scheduled ahead
const TICK = 25; // ms between scheduler runs
const VOLUME = 0.55; // music under the sound effects

// One bar per chord, 16 sixteenths a bar. Notes are MIDI numbers.
const CHORDS = [
  { root: 45, tones: [57, 60, 64] }, // Am
  { root: 41, tones: [53, 57, 60] }, // F
  { root: 48, tones: [55, 60, 64] }, // C
  { root: 43, tones: [55, 59, 62] }, // G
];
// Lead in eighths (8 a bar), 0 = rest. Two phrases; the loop plays A B A B, then four bars
// without lead so the tune breathes.
const LEAD_A = [
  [69, 0, 72, 74, 76, 0, 74, 72],
  [72, 0, 69, 0, 72, 74, 72, 0],
  [67, 0, 72, 0, 76, 0, 79, 76],
  [74, 0, 71, 67, 71, 0, 74, 0],
];
const LEAD_B = [
  [76, 0, 76, 74, 72, 0, 69, 0],
  [72, 74, 76, 0, 77, 76, 74, 72],
  [72, 0, 76, 79, 84, 0, 79, 76],
  [74, 76, 74, 71, 67, 0, 0, 0],
];
const SONG = [LEAD_A, LEAD_B, LEAD_A, LEAD_B, null];
const ARP = [0, 1, 2, 1];

/** Artikel-Flitzer's tune. A track: four chords, lead phrases (null = a lead-less round),
 *  the arpeggio pattern and the tempo range from start to top speed. */
export const SPRINT_TRACK = { chords: CHORDS, song: SONG, arp: ARP, bpm: [128, 156] };

const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export function createMusic(track) {
  let master = null;
  let noise = null;
  let timer = 0;
  let step = 0; // sixteenths since the start
  let next = 0; // audio time of the next sixteenth
  let bpm = track.bpm[0];
  let turbo = false;
  let calm = false;

  function setup(c) {
    if (master) return;
    master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function note(c, t, freq, dur, { type = "square", gain = 0.04, cutoff = 0 } = {}) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = o.connect(g);
    if (cutoff) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff;
      out = out.connect(f);
    }
    out.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function kick(c, t) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.18);
  }

  function hiss(c, t, dur, { gain, freq, type }) {
    const s = c.createBufferSource();
    s.buffer = noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  function play16(c, n, t, len) {
    const bar = Math.floor(n / 16);
    const pos = n % 16;
    const chord = track.chords[bar % 4];
    const phrase = calm ? null : track.song[Math.floor(bar / 4) % track.song.length];

    // Drums: four on the floor, snare on 2 and 4, hats on the off-beats (every 16th in Turbo).
    // Calm (standing at the line) keeps only the hats ticking.
    if (pos % 4 === 0 && !calm) kick(c, t);
    if ((pos === 4 || pos === 12) && !calm) hiss(c, t, 0.14, { gain: 0.09, freq: 1800, type: "bandpass" });
    if (pos % 4 === 2 || (turbo && pos % 2 === 1)) hiss(c, t, 0.04, { gain: 0.035, freq: 7000, type: "highpass" });

    // Bass: octave bounce on the eighths.
    if (pos % 2 === 0) note(c, t, hz(chord.root + (pos % 4 === 2 ? 12 : 0)), len * 1.8, { gain: 0.06, cutoff: 900 });

    // Arpeggio over the chord, every sixteenth.
    const tone = chord.tones[track.arp[pos % 4]] + (pos >= 8 ? 12 : 0) + (turbo ? 12 : 0);
    note(c, t, hz(tone), len * 0.9, { type: "triangle", gain: 0.03 });

    // Lead on the eighths, held a little.
    if (phrase && pos % 2 === 0) {
      const m = phrase[bar % 4][pos / 2];
      if (m) note(c, t, hz(m), len * 1.7, { gain: 0.035, cutoff: 2600 });
    }
  }

  function schedule() {
    const c = audio();
    if (!c || !master) return;
    const len = 60 / bpm / 4;
    if (next < c.currentTime) next = c.currentTime + 0.05; // after a stall, don't play catch-up
    while (next < c.currentTime + LOOK) {
      play16(c, step, next, len);
      step += 1;
      next += len;
    }
  }

  function fade(to, secs) {
    const c = audio();
    if (!c || !master) return;
    const g = master.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(to, c.currentTime + secs);
  }

  return {
    /** Starts the loop, or carries on where a pause left it. */
    play({ restart = false } = {}) {
      const c = audio();
      if (!c) return;
      setup(c);
      if (restart) step = 0;
      next = c.currentTime + 0.05;
      clearInterval(timer);
      timer = setInterval(schedule, TICK);
      schedule();
      fade(isMuted() ? 0 : VOLUME, 0.15);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = 0;
      fade(0, 0.25);
    },
    /** Speed of the run (0 at the start, 1 at top speed), whether Turbo is on, and calm:
     *  drums and lead drop out (the car stands still). */
    drive(level, warp, still = false) {
      bpm = track.bpm[0] + (track.bpm[1] - track.bpm[0]) * Math.min(1, Math.max(0, level));
      turbo = !!warp;
      calm = !!still;
    },
    /** After the mute button: follow it at once. */
    syncMute() {
      if (timer) fade(isMuted() ? 0 : VOLUME, 0.1);
    },
  };
}

export const music = createMusic(SPRINT_TRACK);
