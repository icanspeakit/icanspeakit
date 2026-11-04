// node --test tests/unterricht/  (npm run test:unterricht)
// The learner's Stunde (src/lib/unterricht/lernen.js): goals, step completion, skip, merge,
// resume after reload, clock without overrun, and teacher/learner key isolation.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  about, emptyExtra, finish, firstOpen, goalOf, lernKeyFromParams, mergeExtra, progressOf, record, skip, statusOf, stundeHref, LERN_KEY,
  fromServer, keyFromRef, mergeLern, naechsteStunde, startNiveau, stundeRef, stundenStand, toServer,
} from "../../src/lib/unterricht/lernen.js";
import { readLocal, writeLocal, clearLocal, LOCAL_KEY } from "../../src/lib/unterricht/speichern.js";
import * as T from "../../src/lib/unterricht/timer.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test("plan key from /stunde's URL: stunden and min default to 3 × 90", () => {
  const k = lernKeyFromParams(new URLSearchParams("niveau=a1-1&block=2"));
  assert.deepEqual(k, { niveau: "a1-1", block: 2, stunden: 3, stunde: 1, minuten: 90 });
  assert.equal(lernKeyFromParams(new URLSearchParams("niveau=a1-1&block=2&stunde=4")), null);
  assert.equal(stundeHref(k), "/stunde?niveau=a1-1&block=2&stunden=3&stunde=1&min=90");
});

test("goals per phase, with „Fertig“ when there is nothing to count", () => {
  const ctx = { topics: ["/dativ", "/leer"], totals: { "/dativ": 12, "/leer": 0 }, blockTopics: ["/dativ"], words: true, exams: false };
  assert.deepEqual(goalOf("uebung", ctx), { kind: "aufgaben", topics: { "/dativ": 12 } });
  assert.deepEqual(goalOf("grammatik", ctx), { kind: "decks", topics: ["/dativ", "/leer"] });
  assert.equal(goalOf("wortschatz", ctx).kind, "karten");
  assert.equal(goalOf("wortschatz", { ...ctx, words: false }).kind, "fertig");
  assert.equal(goalOf("einstieg", ctx).kind, "fertig");
  assert.equal(goalOf("pruefung", ctx).kind, "fertig");
  assert.equal(goalOf("test", ctx).kind, "anzahl");
});

test("Üben is done when every task was answered once, right or wrong", () => {
  let x = emptyExtra({ 3: { kind: "aufgaben", topics: { "/dativ": 3 } } });
  x = record(x, 3, { type: "answer", topic: "/dativ", key: "0/0", ok: true });
  x = record(x, 3, { type: "answer", topic: "/dativ", key: "0/0", ok: false }); // the same item again
  x = record(x, 3, { type: "answer", topic: "/akkusativ", key: "0/1", ok: true }); // another page: not this step
  assert.equal(statusOf(x, 3), "offen");
  assert.deepEqual(progressOf(x.goals[3], x.seen[3]), { right: 0, answered: 1, have: 1, need: 3, done: false });
  x = record(x, 3, { type: "answer", topic: "/dativ", key: "0/1", ok: true });
  x = record(x, 3, { type: "answer", topic: "/dativ", key: "1/0", ok: false });
  assert.equal(statusOf(x, 3), "fertig");
  // once done, it stays done
  x = record(x, 3, { type: "answer", topic: "/dativ", key: "1/0", ok: true });
  assert.equal(statusOf(x, 3), "fertig");
});

test("decks, cards and exam parts finish their steps; events of other kinds do not", () => {
  let x = emptyExtra({ 1: { kind: "karten" }, 2: { kind: "decks", topics: ["/a", "/b"] }, 4: { kind: "set" } });
  x = record(x, 1, { type: "deck", topic: "/a" });
  assert.equal(statusOf(x, 1), "offen");
  x = record(x, 1, { type: "karten" });
  assert.equal(statusOf(x, 1), "fertig");
  x = record(x, 2, { type: "deck", topic: "/a" });
  assert.equal(statusOf(x, 2), "offen");
  x = record(x, 2, { type: "deck", topic: "/b" });
  assert.equal(statusOf(x, 2), "fertig");
  x = record(x, 4, { type: "set" });
  assert.equal(statusOf(x, 4), "fertig");
  const same = record(x, 0, { type: "karten" }); // step 0 has no goal
  assert.equal(same, x);
});

test("skip shows as skipped, never as done; a later finish wins", () => {
  let x = emptyExtra({});
  x = skip(x, 0);
  assert.equal(statusOf(x, 0), "uebersprungen");
  x = finish(x, 0);
  assert.equal(statusOf(x, 0), "fertig");
  assert.equal(statusOf(skip(x, 0), 0), "fertig");
  assert.equal(firstOpen(skip(emptyExtra({}), 0), 5), 1);
});

test("merge: the stronger status wins, events join, nothing finished is lost", () => {
  const a = { status: { 0: "fertig", 1: "uebersprungen" }, seen: { 3: { "a:/x|0/0": true } }, texte: { 0: "Hallo" }, goals: {} };
  const b = { status: { 0: "uebersprungen", 1: "fertig", 2: "uebersprungen" }, seen: { 3: { "a:/x|0/1": false } }, texte: {}, goals: {} };
  const m = mergeExtra(a, b);
  assert.deepEqual(m.status, { 0: "fertig", 1: "fertig", 2: "uebersprungen" });
  assert.deepEqual(Object.keys(m.seen[3]).sort(), ["a:/x|0/0", "a:/x|0/1"]);
  assert.equal(m.texte[0], "Hallo");
});

test("resume after reload: the local copy brings back step, status and time", () => {
  const store = memory();
  const steps = [{ id: "einstieg", minutes: 10 }, { id: "uebung", minutes: 20 }];
  const t0 = Date.parse("2026-10-26T10:00:00Z");
  let s = T.start(T.create(steps, t0), t0);
  for (let m = 1; m <= 5; m++) s = T.heartbeat(s, t0 + m * 60_000); // a page is open
  s = T.goTo(s, 1, t0 + 5 * 60_000);
  const extra = finish(emptyExtra({ 1: { kind: "fertig" } }), 0);
  writeLocal({ id: "00000000-0000-4000-8000-000000000001", key: {}, gruppe: "A1.1", steps, row: T.toRow(s), extra }, store, LERN_KEY);
  const back = readLocal(store, LERN_KEY);
  const r = T.restore(back.row, steps, t0 + 6 * 60_000);
  assert.equal(r.current, 1);
  assert.equal(statusOf(back.extra, 0), "fertig");
  assert.equal(Math.round(T.elapsed(r, t0 + 6 * 60_000, 0) / 60_000), 5);
});

test("teacher and learner copies never touch each other", () => {
  const store = memory();
  const row = { current_step: 0, step_ms: {}, running_since: null, last_active_at: new Date().toISOString(), status: "paused" };
  writeLocal({ id: "00000000-0000-4000-8000-000000000001", steps: [], row }, store);
  writeLocal({ id: "00000000-0000-4000-8000-000000000002", steps: [], row }, store, LERN_KEY);
  assert.equal(readLocal(store).id.at(-1), "1");
  assert.equal(readLocal(store, LERN_KEY).id.at(-1), "2");
  clearLocal(store, LERN_KEY);
  assert.ok(readLocal(store));
  assert.equal(readLocal(store, LERN_KEY), null);
  assert.equal(LOCAL_KEY === LERN_KEY, false);
});

test("the learner's clock text has no overrun: always “about N min”", () => {
  assert.equal(about(10), "about 10 min");
  assert.equal(about(13), "about 15 min");
  assert.equal(about(2), "about 5 min");
});

test("learner texts: placeholders filled, unreviewed marked, missing → neutral fallback", async () => {
  const { lernText, FALLBACK } = await import("../../src/lib/unterricht/lernen.js");
  const texte = { "uebung.einzelarbeit": { text: "Do the exercises on {grammatik}.", bruno: "Go!", geprueft: false } };
  const ctx = { grammatik: ["Articles", "Plurals"] };
  assert.deepEqual(lernText({ id: "uebung", variant: "uebung.einzelarbeit" }, ctx, texte),
    { text: "Do the exercises on “Articles” and “Plurals”.", bruno: "Go!", entwurf: true });
  assert.equal(lernText({ id: "test", variant: "test" }, ctx, texte).text, FALLBACK.test);
});

test("every template of the plan has a learner text, solo and in du-form", async () => {
  const fs = await import("node:fs");
  const texte = JSON.parse(fs.readFileSync("src/data/lernstunde-texte.json", "utf8"));
  const src = fs.readFileSync("src/lib/stundenplan.js", "utf8");
  const ids = [...src.matchAll(/\["((?:einstieg|wortschatz|grammatik|uebung|anwendung|abschluss)\.[a-z]+|pruefung|test)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 20);
  for (const id of ids) {
    assert.ok(texte[id]?.text, `no learner text for ${id}`);
    assert.doesNotMatch(texte[id].text, /\b(Paar|Plenum|Tafel|euch|ihr)\b/, id);
  }
});

test("Üben asks for no more tasks than fit the step: 2 per planned minute, shared by the pages", async () => {
  const { goalOf } = await import("../../src/lib/unterricht/lernen.js");
  const g = goalOf("uebung", { topics: ["/a", "/b"], totals: { "/a": 83, "/b": 83 }, minutes: 20 });
  assert.deepEqual(g.topics, { "/a": 20, "/b": 20 });
  const small = goalOf("uebung", { topics: ["/a"], totals: { "/a": 12 }, minutes: 20 });
  assert.deepEqual(small.topics, { "/a": 12 });
});

/* ------------------------------------------------------------- Tier 2: server ---- */

const K = { niveau: "a1-1", block: 1, stunden: 3, stunde: 2, minuten: 90 };
const snapOf = (row, extra, more = {}) => ({ id: "11111111-1111-4111-8111-111111111111", key: K, row, extra, ...more });
const t = (min) => new Date(Date.UTC(2026, 9, 27, 10, min)).toISOString();

test("device ↔ server: toServer and fromServer keep the Stunde, but not what the learner typed", () => {
  const extra = { status: { 0: "fertig" }, seen: { 1: { k: true } }, texte: { 0: "Mein Satz." }, goals: { 1: { kind: "karten" } }, parked: true };
  const snap = snapOf({ current_step: 1, step_ms: { einstieg: 60000 }, running_since: null, last_active_at: t(5), status: "paused" }, extra);
  const row = toServer(snap, "22222222-2222-4222-8222-222222222222");
  assert.equal(row.niveau, "a1-1");
  assert.equal(row.klasse_id, "22222222-2222-4222-8222-222222222222");
  assert.deepEqual(row.step_status, { 0: "fertig" });
  assert.deepEqual(row.fortschritt, { seen: { 1: { k: true } }, goals: { 1: { kind: "karten" } } });
  assert.ok(!JSON.stringify(row).includes("Mein Satz"), "texts stay on the device");
  const back = fromServer({ ...row, block: "1", stunden: "3", stunde: "2", minuten: "90" });
  assert.deepEqual(back.key, K);
  assert.equal(back.row.current_step, 1);
  assert.deepEqual(back.extra.status, { 0: "fertig" });
  assert.deepEqual(back.extra.texte, {});
});

test("merge after login: the furthest step wins and no „fertig“ is lost", () => {
  const local = snapOf({ current_step: 3, step_ms: { einstieg: 300000, wortschatz: 60000 }, running_since: null, last_active_at: t(10), status: "paused" },
    { status: { 0: "fertig", 1: "uebersprungen" }, seen: { 2: { "a:/dativ|0/1": true } }, texte: { 0: "Hallo." }, goals: {}, parked: true });
  const server = snapOf({ current_step: 2, step_ms: { einstieg: 400000, grammatik: 90000 }, running_since: null, last_active_at: t(20), status: "paused" },
    { status: { 1: "fertig", 2: "uebersprungen" }, seen: { 2: { "a:/dativ|0/2": false } }, texte: {}, goals: {} },
    { id: "33333333-3333-4333-8333-333333333333" });
  const m = mergeLern(local, server);
  assert.equal(m.id, server.id, "the server's row names the result");
  assert.equal(m.row.current_step, 3);
  assert.deepEqual(m.row.step_ms, { einstieg: 400000, wortschatz: 60000, grammatik: 90000 });
  assert.deepEqual(m.extra.status, { 0: "fertig", 1: "fertig", 2: "uebersprungen" });
  assert.deepEqual(m.extra.seen[2], { "a:/dativ|0/1": true, "a:/dativ|0/2": false });
  assert.equal(m.extra.texte[0], "Hallo.", "the device's texts are kept");
  assert.equal(m.extra.parked, true);
  assert.equal(m.row.last_active_at, t(20));
});

test("merge: a Stunde completed on one side is completed", () => {
  const open = snapOf({ current_step: 1, step_ms: {}, running_since: t(1), last_active_at: t(30), status: "active" }, emptyExtra());
  const doneRow = snapOf({ current_step: 4, step_ms: {}, running_since: null, last_active_at: t(5), status: "completed", completed_at: t(5) }, emptyExtra());
  for (const m of [mergeLern(open, doneRow), mergeLern(doneRow, open)]) {
    assert.equal(m.row.status, "completed");
    assert.equal(m.row.running_since, null);
    assert.equal(m.row.current_step, 4);
  }
  assert.equal(mergeLern(open, null), open);
  assert.equal(mergeLern(null, doneRow), doneRow);
});

test("a Stunde's Aufgabe ref fits aufgaben.uebung_ref and reads back", () => {
  assert.equal(stundeRef(K), "st:a1-1/1/3/2/90");
  assert.match(stundeRef(K), /^[a-z]{1,2}:[a-z0-9][a-z0-9._/+:-]{0,77}$/);
  assert.deepEqual(keyFromRef("st:a1-1/1/3/2/90"), K);
  assert.equal(keyFromRef("st:a1-1/1/3/4/90"), null);
  assert.equal(keyFromRef("g:dativ"), null);
});

test("the teacher's table: newest row per member, steps by name, score per step, others not started", () => {
  const base = { niveau: "a1-1", block: 1, stunden: 3, stunde: 2, minuten: 90 };
  const steps = [{ id: "einstieg", name: "Einstieg" }, { id: "uebung", name: "Üben" }];
  const rows = [
    { ...base, user_id: "u1", status: "active", current_step: 1, step_status: { 0: "fertig" },
      fortschritt: { steps, seen: { 1: { "a:/dativ|0/1": true, "a:/dativ|0/2": false, "a:/dativ|0/3": true } } } },
    { ...base, user_id: "u1", status: "completed", current_step: 1, step_status: { 0: "fertig", 1: "fertig" }, fortschritt: { steps } },
    { ...base, stunde: 3, user_id: "u2", status: "active", current_step: 0, step_status: {}, fortschritt: { steps } },
    { ...base, user_id: "u3", status: "completed", current_step: 1, step_status: { 0: "uebersprungen", 1: "fertig" }, fortschritt: { steps } },
  ];
  const members = [{ user_id: "u2", anzeigename: "Ben" }, { user_id: "u1", anzeigename: "Ana" }, { user_id: "u3", anzeigename: "Cem" }];
  const t = stundenStand(rows, members, base);
  assert.deepEqual(t.steps.map((x) => x.name), ["Einstieg", "Üben"]);
  assert.deepEqual(t.people.map((p) => p.name), ["Ana", "Cem", "Ben"], "started first, then by name");
  const ana = t.people[0];
  assert.equal(ana.done, false, "the newest row counts");
  assert.equal(ana.reached, 1);
  assert.deepEqual(ana.cells[1], { status: "offen", right: 2, answered: 3 });
  assert.equal(t.people[1].cells[0].status, "uebersprungen");
  assert.equal(t.people[2].started, false, "a row of another Stunde does not count");
});

test("/fortschritt card: continue, next, or the first Stunde of the learner's level", () => {
  const order = [{ niveau: "a1-1", blocks: 2 }, { niveau: "a1-2", blocks: 3 }];
  const k = (block, stunde) => ({ niveau: "a1-1", block, stunden: 3, stunde, minuten: 90 });
  const s = (key, status, min, step = 0) => ({ key, row: { status, current_step: step, last_active_at: t(min) } });
  assert.deepEqual(naechsteStunde([], order, "B1"), { kind: "start", key: { niveau: "b1-1", block: 1, stunden: 3, minuten: 90, stunde: 1 } });
  assert.equal(naechsteStunde([], order, null).key.niveau, "a1-1");
  assert.equal(startNiveau("C1"), "c1");
  assert.deepEqual(naechsteStunde([s(k(1, 1), "completed", 1), s(k(1, 2), "paused", 5, 3)], order, "A1"), { kind: "weiter", key: k(1, 2), step: 3 });
  assert.deepEqual(naechsteStunde([s(k(1, 2), "paused", 1), s(k(1, 1), "completed", 9)], order, "A1"), { kind: "naechste", key: k(1, 2) }, "the most recent one decides");
  assert.deepEqual(naechsteStunde([s(k(1, 3), "completed", 1)], order, "A1").key, k(2, 1));
  assert.deepEqual(naechsteStunde([s(k(2, 3), "completed", 1)], order, "A1").key, { niveau: "a1-2", block: 1, stunden: 3, stunde: 1, minuten: 90 });
  assert.equal(naechsteStunde([s({ niveau: "a1-2", block: 3, stunden: 3, stunde: 3, minuten: 90 }, "completed", 1)], order, "A1"), null);
});
