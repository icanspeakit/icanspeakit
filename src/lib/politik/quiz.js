// Scoring for „Wo stehe ich?“ on /politik (POLITISCHE-BILDUNG-PROMPT.md, 3.7). Pure, so
// scripts/check-politik.mjs can test it in Node.
//
// An answer is −2 (gar nicht) … +2 (voll), or null for skipped. Each statement belongs to
// one axis and points one way (dir +1 = agreeing moves towards 10). Per axis: the mean of
// answer × dir over the answered statements, −2…+2, rescaled to 0…10, the CHES scale
// (x = lrecon, y = galtan). With five statements per direction per axis, agreeing with
// everything averages to 0 and lands in the centre.

/** Answers needed on an axis before it gets a value. */
export const MIN_PER_AXIS = 3;

/** { x, y } on 0…10 (null for an axis with too few answers). */
export function score(items, answers) {
  const sum = { x: 0, y: 0 };
  const n = { x: 0, y: 0 };
  for (const it of items) {
    const a = answers[it.id];
    if (a == null) continue;
    sum[it.axis] += Math.max(-2, Math.min(2, a)) * it.dir;
    n[it.axis]++;
  }
  const axis = (k) => (n[k] >= MIN_PER_AXIS ? round(((sum[k] / n[k] + 2) / 4) * 10) : null);
  return { x: axis("x"), y: axis("y") };
}

const round = (v) => Math.round(v * 100) / 100;

/** The largest possible distance on the 0…10 square. */
const MAX_D = Math.hypot(10, 10);

/** Nearness of two points as 0…100 %: 100 = same point, 0 = opposite corners. */
export function match(a, b) {
  return Math.round(100 * (1 - Math.hypot(a.x - b.x, a.y - b.y) / MAX_D));
}

/** The `k` parties nearest to `pos`, each with `match`, nearest first. */
export function nearest(pos, parties, k = 3) {
  return parties
    .map((p) => ({ ...p, match: match(pos, { x: p.x, y: p.y }) }))
    .sort((a, b) => b.match - a.match || a.name.localeCompare(b.name, "de"))
    .slice(0, k);
}

/** Whether every axis has as many statements pointing each way (the balance rule). */
export function balanced(items) {
  const c = {};
  for (const it of items) c[`${it.axis}${it.dir}`] = (c[`${it.axis}${it.dir}`] ?? 0) + 1;
  return ["x", "y"].every((ax) => c[`${ax}1`] > 0 && c[`${ax}1`] === c[`${ax}-1`]);
}

/** "4.2,6.1" ↔ { x, y } for a shared result link: the point only, never the answers. */
export const encodePos = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
export function decodePos(s) {
  const m = /^(\d{1,2}(?:\.\d)?),(\d{1,2}(?:\.\d)?)$/.exec(String(s ?? ""));
  if (!m) return null;
  const x = +m[1], y = +m[2];
  return x <= 10 && y <= 10 ? { x, y } : null;
}
