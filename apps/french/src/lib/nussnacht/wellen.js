// Hamstis Nussnacht: the wave director. Every minute the night gets busier: creatures come
// more often, faster, sturdier, and in bigger groups that all come from one side. Minute 10 is
// the Endgegner wave: three bosses and the densest crowd; survive it for 30 s and you win.
//
//   every   seconds between two spawns (a spawn is one group)
//   group   creatures per group
//   flank   chance that a group comes as a tight bunch from one direction
//   speed   creature speed factor
//   hp      creature HP factor
//
// Tier 6 tunes these against bot runs; the reasons are in docs/nussnacht-tier6-v1.md.
export const WELLEN = [
  { every: 1.15, group: 1, flank: 0.0, speed: 1.0, hp: 1.0 },  // 0:00
  { every: 0.95, group: 2, flank: 0.1, speed: 1.05, hp: 1.15 }, // 1:00
  { every: 0.85, group: 2, flank: 0.2, speed: 1.1, hp: 1.35 },  // 2:00
  { every: 0.8, group: 3, flank: 0.25, speed: 1.15, hp: 1.6 },  // 3:00
  { every: 0.7, group: 3, flank: 0.3, speed: 1.2, hp: 1.9 },    // 4:00
  { every: 0.62, group: 4, flank: 0.35, speed: 1.25, hp: 2.2 }, // 5:00
  { every: 0.55, group: 4, flank: 0.4, speed: 1.3, hp: 2.6 },   // 6:00
  { every: 0.5, group: 5, flank: 0.45, speed: 1.35, hp: 3.0 },  // 7:00
  { every: 0.45, group: 5, flank: 0.5, speed: 1.4, hp: 3.5 },   // 8:00
  { every: 0.4, group: 6, flank: 0.55, speed: 1.45, hp: 4.0 },  // 9:00
  { every: 0.3, group: 6, flank: 0.6, speed: 1.5, hp: 4.5 },    // 10:00 Endgegner
];

export const welleAt = (minute) => WELLEN[Math.max(0, Math.min(WELLEN.length - 1, minute))];
