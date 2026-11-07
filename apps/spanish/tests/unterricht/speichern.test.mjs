// node --test tests/unterricht/  (npm run test:unterricht)
// Saving and restoring a lesson session: the saver's queue, the local copy, the plan key
// and the progress per group.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../../src/lib/unterricht/timer.js";
import {
  createSaver, readLocal, writeLocal, clearLocal, LOCAL_KEY, keyFromParams, fortschrittJeGruppe,
} from "../../src/lib/unterricht/speichern.js";

/** Timers by hand: tick(ms) runs whatever is due. */
function fakeTimers() {
  let now = 0;
  let id = 0;
  const due = new Map();
  return {
    setTimeout: (fn, ms) => { due.set(++id, { fn, at: now + ms }); return id; },
    clearTimeout: (i) => due.delete(i),
    async tick(ms) {
      now += ms;
      // Fired, not awaited: a real timer does not wait for its callback either.
      for (const [i, t] of [...due]) if (t.at <= now) { due.delete(i); t.fn(); }
      await new Promise((r) => setImmediate(r));
    },
  };
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test("saver: quick pushes become one request with the latest row", async () => {
  const timers = fakeTimers();
  const sent = [];
  const locals = [];
  const saver = createSaver({ send: async (r) => sent.push(r), local: (r) => locals.push(r), ...timers });
  saver.push({ current_step: 1 });
  saver.push({ current_step: 2 });
  saver.push({ current_step: 3 });
  assert.equal(locals.length, 3, "the local copy is written on every push");
  assert.equal(sent.length, 0);
  await timers.tick(400);
  assert.deepEqual(sent, [{ current_step: 3 }]);
});

test("saver: flush sends at once; a push during a request goes out after it", async () => {
  const timers = fakeTimers();
  const sent = [];
  let release;
  const saver = createSaver({
    send: (r) => { sent.push(r); return sent.length === 1 ? new Promise((ok) => (release = ok)) : Promise.resolve(); },
    ...timers,
  });
  saver.push({ n: 1 }, 0);
  const first = saver.flush();
  saver.push({ n: 2 }, 0);
  await timers.tick(0);
  assert.deepEqual(sent, [{ n: 1 }], "waits for the request on its way");
  release();
  await first;
  await timers.tick(0);
  assert.deepEqual(sent, [{ n: 1 }, { n: 2 }]);
});

test("saver: a failed save is kept and goes out with the next flush", async () => {
  const timers = fakeTimers();
  const sent = [];
  let fail = true;
  const saver = createSaver({ send: async (r) => { if (fail) throw new Error("offline"); sent.push(r); }, ...timers });
  saver.push({ n: 1 }, 0);
  await timers.tick(0);
  assert.equal(saver.failed, true);
  assert.equal(saver.waiting, true);
  fail = false;
  await saver.flush();
  assert.deepEqual(sent, [{ n: 1 }]);
  assert.equal(saver.failed, false);
  assert.equal(saver.waiting, false);
});

test("local copy: round trip, and junk or a missing copy reads as null", () => {
  const st = memoryStorage();
  assert.equal(readLocal(st), null);
  const v = { id: "11111111-2222-3333-4444-555555555555", key: { niveau: "a1-1" }, gruppe: "Test A", steps: [{ id: "einstieg", name: "Einstieg", minutes: 10 }], row: { current_step: 0 } };
  writeLocal(v, st);
  assert.deepEqual(readLocal(st), v);
  st.setItem(LOCAL_KEY, "{kaputt");
  assert.equal(readLocal(st), null);
  st.setItem(LOCAL_KEY, JSON.stringify({ ...v, id: "x" }));
  assert.equal(readLocal(st), null);
  clearLocal(st);
  assert.equal(st.getItem(LOCAL_KEY), null);
  assert.equal(readLocal(null), null, "no storage at all (private mode)");
});

test("save and restore: a session survives the trip through the local copy and the database", () => {
  const steps = [{ id: "einstieg", minutes: 10 }, { id: "wortschatz", minutes: 20 }];
  const t0 = Date.parse("2026-10-26T09:00:00Z");
  let s = T.start(T.create(steps, t0), t0);
  for (let t = t0 + 15_000; t <= t0 + 12 * 60_000; t += 15_000) s = T.heartbeat(s, t);
  s = T.next(s, t0 + 12 * 60_000);
  const server = JSON.parse(JSON.stringify(T.toRow(s)));
  // The tab kept going for 30 s and wrote only the local copy before it closed.
  for (let t = t0 + 12 * 60_000 + 15_000; t <= t0 + 12.5 * 60_000; t += 15_000) s = T.heartbeat(s, t);
  const st = memoryStorage();
  writeLocal({ id: "11111111-2222-3333-4444-555555555555", key: {}, gruppe: "A", steps, row: T.toRow(s) }, st);

  const best = T.newer(readLocal(st).row, server);
  const back = T.restore(best, steps, t0 + 12.5 * 60_000 + 2000);
  assert.equal(back.current, 1);
  assert.equal(back.status, "active");
  assert.equal(T.elapsed(back, t0 + 12.5 * 60_000 + 2000, 0), 12 * 60_000);
  assert.equal(T.elapsed(back, t0 + 12.5 * 60_000 + 2000), 32_000);
});

test("keyFromParams: valid plan keys only", () => {
  const q = (s) => new URLSearchParams(s);
  assert.deepEqual(keyFromParams(q("niveau=a1-1&block=1&stunden=3&stunde=2&min=90")), { niveau: "a1-1", block: 1, stunden: 3, stunde: 2, minuten: 90 });
  assert.deepEqual(keyFromParams(q("niveau=c1&block=8&stunden=1&stunde=1&min=45")).niveau, "c1");
  assert.equal(keyFromParams(q("niveau=a1-1&block=1&stunden=3&stunde=4&min=90")), null, "Stunde beyond the plan");
  assert.equal(keyFromParams(q("niveau=x&block=1&stunden=3&stunde=1&min=90")), null);
  assert.equal(keyFromParams(q("niveau=a1-1&block=1&stunden=3&stunde=1")), null, "no minutes");
});

test("progress per group: done, the step it stopped at, newest group first", () => {
  const rows = [
    { id: "s3", klasse_id: "B", gruppe: "Gruppe B", stunde: 1, status: "active", current_step: 2, updated_at: "2026-10-26T10:00:00Z" },
    { id: "s2", klasse_id: "A", gruppe: "Gruppe A", stunde: 2, status: "paused", current_step: 2, updated_at: "2026-10-25T10:00:00Z" },
    { id: "s1", klasse_id: "A", gruppe: "Gruppe A", stunde: 1, status: "completed", current_step: 5, updated_at: "2026-10-24T10:00:00Z" },
    { id: "s0", klasse_id: "A", gruppe: "Gruppe A", stunde: 1, status: "completed", current_step: 5, updated_at: "2026-10-20T10:00:00Z" },
  ];
  const names = ["Einstieg", "Wortschatz", "Grammatik"];
  const p = fortschrittJeGruppe(rows, (_stunde, i) => names[i] ?? "?");
  assert.deepEqual(p.map((g) => g.gruppe), ["Gruppe B", "Gruppe A"]);
  assert.deepEqual(p[1].stunden, { 1: { done: true }, 2: { step: "Grammatik", status: "paused", id: "s2" } });
  assert.deepEqual(p[0].stunden[1], { step: "Grammatik", status: "active", id: "s3" });
});
