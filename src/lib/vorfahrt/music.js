// Vorfahrt-Flitzer: its own background track on Artikel-Flitzer's music engine (WebAudio, no
// files). A sunnier loop in F major (F C Dm B♭) for cruising through town, a bit slower than
// the Artikel-Flitzer tune: 112 BPM at the start, up to 132 as the cruise speed grows. While
// the car stands at the line the drums and lead drop out, so waiting feels like waiting.

import { createMusic } from "../artikelSprint/music.js";

const CHORDS = [
  { root: 41, tones: [57, 60, 65] }, // F
  { root: 36, tones: [55, 60, 64] }, // C
  { root: 38, tones: [57, 62, 65] }, // Dm
  { root: 46, tones: [58, 62, 65] }, // B♭
];
// Lead in eighths (8 a bar), 0 = rest.
const LEAD_A = [
  [72, 0, 69, 72, 77, 0, 76, 72],
  [76, 0, 72, 0, 67, 0, 72, 0],
  [74, 0, 77, 0, 81, 79, 77, 74],
  [70, 0, 74, 77, 74, 0, 0, 0],
];
const LEAD_B = [
  [77, 76, 77, 0, 81, 0, 77, 0],
  [79, 0, 76, 72, 76, 0, 79, 0],
  [77, 0, 74, 0, 69, 72, 74, 77],
  [74, 0, 70, 0, 72, 0, 0, 0],
];

export const music = createMusic({
  chords: CHORDS,
  song: [LEAD_A, LEAD_A, LEAD_B, LEAD_A, null],
  arp: [0, 2, 1, 2],
  bpm: [112, 132],
});
