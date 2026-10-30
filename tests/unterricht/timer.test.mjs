// node --test tests/unterricht/  (npm run test:unterricht)
// The lesson clock: elapsed, pause, step changes, overrun, and coming back to a saved state.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../../src/lib/unterricht/timer.js";

const STEPS = [
  { id: "einstieg", minutes: 10 },
  { id: "wortschatz", minutes: 20 },
  { id: "grammatik", minutes: 30 },
];
const MIN = 60_000;
const t0 = Date.parse("2026-10-26T09:00:00Z");
const at = (m, s = 0) => t0 + m * MIN + s * 1000;

/** Started at t0 and kept alive by heartbeats until `until`. */
function runUntil(s, until, from = s.lastActiveAt) {
  for (let t = from + T.HEARTBEAT_MS; t <= until; t += T.HEARTBEAT_MS) s = T.heartbeat(s, t);
  return T.heartbeat(s, until);
}

test("a new session is paused at step 0 with nothing spent", () => {
  const s = T.create(STEPS, t0);
  assert.equal(s.status, "paused");
  assert.equal(s.current, 0);
  assert.equal(T.elapsed(s, at(5)), 0);
  assert.equal(T.remaining(s, at(5)), 10 * MIN);
});

test("elapsed grows with the clock while running, from timestamps", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(4));
  assert.equal(T.elapsed(s, at(4)), 4 * MIN);
  // Between heartbeats it still reads off the clock, not off a counter.
  assert.equal(T.elapsed(s, at(4, 7)), 4 * MIN + 7000);
  assert.equal(T.lessonElapsed(s, at(4, 7)), 4 * MIN + 7000);
});

test("pause freezes the time, resume continues from there", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(3));
  s = T.pause(s, at(3));
  assert.equal(s.status, "paused");
  assert.equal(T.elapsed(s, at(30)), 3 * MIN, "paused: half an hour later still 3 min");
  s = T.resume(s, at(30));
  s = runUntil(s, at(32));
  assert.equal(T.elapsed(s, at(32)), 5 * MIN);
});

test("pausing twice or resuming a running clock changes nothing", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(2));
  const p1 = T.pause(s, at(2));
  const p2 = T.pause(p1, at(9));
  assert.equal(T.elapsed(p2, at(9)), 2 * MIN);
  const r1 = T.resume(s, at(2));
  assert.equal(r1.runningSince, t0, "resume on a running clock keeps its start");
});

test("a step change books the time to the old step and keeps running for the new one", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(8));
  s = T.next(s, at(8));
  assert.equal(s.current, 1);
  assert.equal(s.status, "active");
  assert.equal(T.elapsed(s, at(8), 0), 8 * MIN);
  s = runUntil(s, at(11));
  assert.equal(T.elapsed(s, at(11)), 3 * MIN);
  assert.equal(T.lessonElapsed(s, at(11)), 11 * MIN);
  // Back to step 0: its time adds up, nothing is lost.
  s = T.prev(s, at(11));
  s = runUntil(s, at(12));
  assert.equal(T.elapsed(s, at(12)), 9 * MIN);
  assert.equal(T.elapsed(s, at(12), 1), 3 * MIN);
});

test("a step change while paused stays paused", () => {
  let s = T.pause(runUntil(T.start(T.create(STEPS, t0), t0), at(2)), at(2));
  s = T.next(s, at(5));
  assert.equal(s.status, "paused");
  assert.equal(T.elapsed(s, at(9)), 0);
});

test("steps outside the lesson are ignored", () => {
  const s = T.start(T.create(STEPS, t0), t0);
  assert.equal(T.prev(s, at(1)), s);
  const last = T.goTo(s, 2, at(1));
  assert.equal(T.next(last, at(2)), last);
});

test("overrun: the current step past its planned time, and it never advances by itself", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(13));
  assert.equal(T.remaining(s, at(13)), -3 * MIN);
  assert.equal(T.overrun(s, at(13)), 3 * MIN);
  assert.equal(T.overText(T.overrun(s, at(13))), "+3 min");
  assert.equal(T.overText(1000), "+1 min");
  assert.equal(s.current, 0, "still Einstieg");
  assert.equal(T.overrun(s, at(9)), 0);
});

test("completing books the last running time and stops the clock", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(4));
  s = T.complete(s, at(4));
  assert.equal(s.status, "completed");
  assert.equal(T.lessonElapsed(s, at(50)), 4 * MIN);
  assert.equal(T.start(s, at(51)).status, "completed", "an ended lesson does not start again");
  assert.equal(T.next(s, at(51)), s);
});

test("a long gap (tab closed, laptop asleep) counts only up to the last heartbeat and pauses", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(5));
  // Nothing for 20 minutes, then the page looks again.
  assert.equal(T.elapsed(s, at(25)), 5 * MIN, "reading during the gap already stops at the heartbeat");
  s = T.heartbeat(s, at(25));
  assert.equal(s.status, "paused");
  assert.equal(s.interrupted, true);
  assert.equal(T.elapsed(s, at(26)), 5 * MIN);
  s = T.resume(s, at(26));
  assert.equal(s.interrupted, false);
  s = runUntil(s, at(27));
  assert.equal(T.elapsed(s, at(27)), 6 * MIN);
});

test("a short gap (hidden tab, page change) keeps counting", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(5));
  s = T.heartbeat(s, at(5) + T.GAP_MS - 1000);
  assert.equal(s.status, "active");
  assert.equal(T.elapsed(s, at(5) + T.GAP_MS - 1000), 5 * MIN + T.GAP_MS - 1000);
});

test("restore from a saved row: step and time come back", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = runUntil(s, at(10));
  s = T.next(s, at(10));
  s = runUntil(s, at(14));
  const row = JSON.parse(JSON.stringify(T.toRow(s))); // as it comes back from the database
  assert.deepEqual(row.step_ms, { einstieg: 10 * MIN });
  assert.equal(row.current_step, 1);

  // Reloaded 3 s later (same tab, page change): still running, nothing lost.
  const r = T.restore(row, STEPS, at(14, 3));
  assert.equal(r.current, 1);
  assert.equal(r.status, "active");
  assert.equal(T.elapsed(r, at(14, 3)), 4 * MIN + 3000);
  assert.equal(T.lessonElapsed(r, at(14, 3)), 14 * MIN + 3000);

  // Reopened the next morning: paused at the last heartbeat.
  const later = T.restore(row, STEPS, at(60 * 20));
  assert.equal(later.status, "paused");
  assert.equal(later.interrupted, true);
  assert.equal(T.elapsed(later, at(60 * 20)), 4 * MIN);
  // The pause is the newest news: it wins over the copy it came from.
  assert.equal(T.newer(T.toRow(later), row).status, "paused");
});

test("restore a paused row and a completed row", () => {
  let s = T.start(T.create(STEPS, t0), t0);
  s = T.pause(runUntil(s, at(7)), at(7));
  const p = T.restore(T.toRow(s), STEPS, at(100));
  assert.equal(p.status, "paused");
  assert.equal(p.interrupted, undefined);
  assert.equal(T.elapsed(p, at(100)), 7 * MIN);

  const done = T.toRow(T.complete(s, at(8)));
  assert.equal(done.completed_at, new Date(at(8)).toISOString());
  assert.equal(T.restore(done, STEPS, at(100)).status, "completed");
});

test("fromRow copes with rows that do not fit the steps", () => {
  const s = T.fromRow({ current_step: 9, step_ms: { einstieg: "60000", unbekannt: 5, grammatik: -4 }, status: "active", running_since: null, last_active_at: new Date(t0).toISOString() }, STEPS);
  assert.equal(s.current, 2, "clamped to the last step");
  assert.deepEqual(s.stepMs, { einstieg: 60000 });
  assert.equal(s.status, "paused", "active without running_since is paused");
});

test("newer: the later copy wins, a completed one always", () => {
  const a = { status: "active", last_active_at: new Date(at(5)).toISOString() };
  const b = { status: "active", last_active_at: new Date(at(6)).toISOString() };
  assert.equal(T.newer(a, b), b);
  assert.equal(T.newer(b, a), b);
  assert.equal(T.newer(null, a), a);
  assert.equal(T.newer(a, null), a);
  const done = { status: "completed", last_active_at: new Date(at(1)).toISOString() };
  assert.equal(T.newer(b, done), done);
  assert.equal(T.newer(done, b), done);
});

test("plannedStarts and mmss", () => {
  assert.deepEqual(T.plannedStarts(STEPS), [0, 10, 30]);
  assert.equal(T.mmss(754_000), "12:34");
  assert.equal(T.mmss(3_725_000), "62:05");
  assert.equal(T.mmss(500), "0:01");
  assert.equal(T.mmss(-5), "0:00");
});
