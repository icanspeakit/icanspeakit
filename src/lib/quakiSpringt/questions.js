// Quaki springt: which question stands on which sign, and which lily pad carries which answer.
// The pads never move (the tower is the same for everyone); the seed only decides the
// questions and which pad is the right one, so nobody can learn "always the left one".
// A Tagesturm and a Duell link pass the same seed, so everyone gets the same questions.
//
// Pool: src/data/quakiSpringt/fragen.json, one list per level, a[0] is right.

import { seeded } from "../artikelSprint/rng.js";

function shuffle(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Room (global index) → { q: question, slots: [answer per pad slot], right: slot, level }. */
export function assignQuestions(world, fragen, seed) {
  const rnd = seeded(seed);
  const decks = {}; // level id → shuffled pool, drawn from the front
  const plan = new Map();
  for (const room of world.rooms) {
    const slots = [...new Set(world.pads.filter((p) => p.room === room.global).map((p) => p.slot))];
    if (!slots.length) continue;
    const lv = fragenLevel(world, room);
    const pool = fragen.levels[lv];
    if (!decks[lv] || !decks[lv].length) decks[lv] = shuffle(pool, rnd);
    // Three pads need a question with at least three answers.
    let i = decks[lv].findIndex((x) => x.a.length >= slots.length);
    if (i < 0) { decks[lv] = shuffle(pool, rnd); i = decks[lv].findIndex((x) => x.a.length >= slots.length); }
    const q = decks[lv].splice(i, 1)[0];
    // The right answer plus as many wrong ones as there are pads, in a random order.
    const wrong = shuffle(q.a.slice(1), rnd).slice(0, slots.length - 1);
    const answers = shuffle([q.a[0], ...wrong], rnd);
    plan.set(room.global, { q, level: lv, slots: answers, right: answers.indexOf(q.a[0]) });
  }
  return plan;
}

const LEVEL_IDS = ["A1", "A2", "B1", "B2", "C1"];
const fragenLevel = (world, room) => LEVEL_IDS[room.level] ?? "C1";

export const padIsRight = (plan, room, slot) => {
  const p = plan.get(room);
  return !p || p.right === slot;
};
