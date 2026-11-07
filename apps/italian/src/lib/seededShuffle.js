// A shuffle that gives the same order for the same seed, every time (PROBLEM-MELDEN Tier 5).
//
// The quiz data lists the right answer first in most questions (Insider and LiD: always), and
// the engines showed options in data order, so "always A" won. Shuffling at random would fix
// that but make a reported question look different to every learner and to Edgar. Seeding by
// the question text keeps one fixed order per question, mixed across questions.
import { checksum } from "./einfach-content.js";

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new array with `list` in an order fixed by `seed` (any string). */
export function seededShuffle(list, seed) {
  const rnd = mulberry32(parseInt(checksum(String(seed)), 16));
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
