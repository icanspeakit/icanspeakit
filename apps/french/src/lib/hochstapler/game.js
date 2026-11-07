// Bruno sucht den Hochstapler: the rules, without any screen. Party mode (party.js) and the
// projector (host.js) both play by these, so a round is decided the same way in both.
//
// A round: everyone but the Hochstapler gets the same word; the Hochstapler only the theme.
// Players give one spoken sentence each, discuss, vote. The Hochstapler is caught when they
// alone have the most votes (a tie at the top lets them slip away). Caught, they get one guess
// at the word from six pictures (the Rettungsversuch).
//
// Points (docs/hochstapler-tier0-v1.md, open question 2):
//   every vote for the Hochstapler                        +1 to the voter
//   caught and the guess fails: the group wins            +1 to everyone but the Hochstapler
//   not caught                                            +3 to the Hochstapler
//   caught, but the word guessed: the Hochstapler steals  +2 to the Hochstapler
import { seeded } from "../artikelSprint/rng.js";

export { seeded };

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const RESCUE_OPTIONS = 6;
export const POINTS = { vote: 1, group: 1, escape: 3, steal: 2 };

/** uint32 hash of a string (FNV-1a), for seeds made from words. */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (const c of String(str)) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Fisher–Yates with the given random source. */
export function shuffle(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Who is the Hochstapler this round. Fair: only among those who have been it least often,
 * never the one from the round before (when anyone else is left), seeded per game and round
 * so a test can replay it.
 * @param {string[]} ids        players in seat order
 * @param {Record<string, number>} counts  how often each has been the Hochstapler
 * @param {string[]} last       last round's Hochstapler(s)
 * @param {number} how          1, or 2 for the "2 Hochstapler" variant
 */
export function pickHochstapler(ids, counts, last, rnd, how = 1) {
  const picked = [];
  for (let k = 0; k < how; k++) {
    let pool = ids.filter((id) => !picked.includes(id));
    const fresh = pool.filter((id) => !last.includes(id));
    if (fresh.length) pool = fresh;
    const least = Math.min(...pool.map((id) => counts[id] ?? 0));
    pool = pool.filter((id) => (counts[id] ?? 0) === least);
    picked.push(pool[Math.floor(rnd() * pool.length)]);
  }
  return picked;
}

/**
 * The speaking order: seats in a circle from a random start, never starting with a
 * Hochstapler — they would have to bluff with nothing heard yet (decided in Tier 1).
 */
export function turnOrder(ids, impostors, rnd) {
  const starts = ids.map((_, i) => i).filter((i) => !impostors.includes(ids[i]));
  const s = starts[Math.floor(rnd() * starts.length)] ?? 0;
  return [...ids.slice(s), ...ids.slice(0, s)];
}

/** A word from the theme that this game has not had yet (all used: any). */
export function pickWord(theme, used, rnd) {
  const fresh = theme.words.filter((w) => !used.includes(w.id));
  const pool = fresh.length ? fresh : theme.words;
  return pool[Math.floor(rnd() * pool.length)];
}

/** A theme: the chosen one, or one this game has played least, at random. */
export function pickTheme(themes, chosenId, playedCount, rnd) {
  const chosen = themes.find((t) => t.id === chosenId);
  if (chosen) return chosen;
  const least = Math.min(...themes.map((t) => playedCount[t.id] ?? 0));
  const pool = themes.filter((t) => (playedCount[t.id] ?? 0) === least);
  return pool[Math.floor(rnd() * pool.length)];
}

/**
 * The six pictures for the Rettungsversuch: the word and five others from its theme,
 * topped up from the other themes when the theme is small. Shuffled.
 */
export function rescueOptions(word, theme, themes, rnd, n = RESCUE_OPTIONS) {
  const others = shuffle(theme.words.filter((w) => w.id !== word.id && w.de !== word.de), rnd);
  const extra = shuffle(themes.flatMap((t) => (t.id === theme.id ? [] : t.words)), rnd);
  const out = [word];
  for (const w of [...others, ...extra]) {
    if (out.length >= n) break;
    if (!out.some((o) => o.id === w.id || o.de === w.de)) out.push(w);
  }
  return shuffle(out, rnd);
}

/**
 * Counts the votes. `votes` maps voter → suspect.
 * @returns {{ count: Record<string, number>, top: string[], caught: string[] }}
 *   top: everyone with the most votes; caught: the Hochstapler(s) among them when top is a
 *   single person (a tie at the top catches nobody).
 */
export function tally(votes, impostors) {
  const count = {};
  for (const target of Object.values(votes)) if (target) count[target] = (count[target] ?? 0) + 1;
  const max = Math.max(0, ...Object.values(count));
  const top = max ? Object.keys(count).filter((id) => count[id] === max) : [];
  const caught = top.length === 1 && impostors.includes(top[0]) ? [top[0]] : [];
  return { count, top, caught };
}

/**
 * The round's outcome and points.
 * @param {{ ids: string[], impostors: string[], votes: Record<string,string>, caught: string[], guessedRight: boolean }} r
 * @returns {{ winner: "gruppe" | "hochstapler", points: Record<string, number> }}
 */
export function settle({ ids, impostors, votes, caught, guessedRight }) {
  const points = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const [voter, target] of Object.entries(votes)) {
    if (impostors.includes(target) && !impostors.includes(voter) && voter in points) points[voter] += POINTS.vote;
  }
  // With two Hochstapler, the group wins only if it caught one and that one's guess failed.
  const groupWins = caught.length > 0 && !guessedRight;
  if (groupWins) {
    for (const id of ids) if (!impostors.includes(id)) points[id] += POINTS.group;
  } else {
    for (const id of impostors) points[id] += caught.includes(id) ? POINTS.steal : POINTS.escape;
  }
  return { winner: groupWins ? "gruppe" : "hochstapler", points };
}

/** Sentence starters for the clue round and the discussion, by level (src/data/hochstapler/redemittel.json). */
export function redemittelFor(data, kind, level) {
  const order = ["A1", "A2", "B1", "B2", "C1"];
  const upto = order.slice(0, order.indexOf(level) + 1 || 1);
  // The level's own first, then two from just below, so A2 still sees the A1 basics.
  const own = data[kind]?.[level] ?? [];
  const below = upto.slice(0, -1).reverse().flatMap((l) => data[kind]?.[l] ?? []);
  return [...own, ...below.slice(0, Math.max(0, 6 - own.length))];
}
