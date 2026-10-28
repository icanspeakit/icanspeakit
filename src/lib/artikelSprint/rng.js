// Artikel-Flitzer: seeded randomness. A run is built from one seed, so a challenge link and a
// race room hand every player the same track and the same words in the same order. Two
// streams per seed: the track (obstacles, coins, extras) and the deck (word order, option
// order), so taking a different lane never shifts which word comes next.

/** mulberry32: small, fast and the same on every device. Returns floats in [0, 1). */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new seed for a solo run or a race round: short enough for a link. */
export const newSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

/** The deck's stream: same seed, different numbers than the track's. */
export const deckSeed = (seed) => (seed ^ 0x9e3779b9) >>> 0;
