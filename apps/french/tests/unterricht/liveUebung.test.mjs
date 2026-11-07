import { test } from "node:test";
import assert from "node:assert/strict";
import { band, cleanName, makePin, pickOf, PIN_RE, rowOf, summarize, totalOf } from "../../src/lib/liveUebung/protocol.js";

test("pickOf: sorted, unique, in range; empty or all → null", () => {
  assert.deepEqual(pickOf([3, 1, 1, 99, -1, "2"], 5), [1, 3]);
  assert.equal(pickOf([], 5), null);
  assert.equal(pickOf([0, 1, 2], 3), null);
  assert.equal(pickOf("x", 3), null);
});

test("rowOf with a pick counts only those exercises", () => {
  const r = rowOf({ 0: [2, 2], 2: [1, 3] }, [4, 3, 5], [0, 2]);
  assert.deepEqual(r.cells.map((c) => [c.right, c.answered, c.total]), [[2, 2, 4], [1, 3, 5]]);
  assert.equal(r.total, 9); assert.equal(r.right, 3);
});

test("PIN: six digits, no leading zero", () => {
  for (let i = 0; i < 200; i++) assert.match(makePin(), PIN_RE);
  assert.equal(PIN_RE.test("012345"), false);
});

test("cleanName trims and caps", () => {
  assert.equal(cleanName("  Ana   Maria "), "Ana Maria");
  assert.equal(cleanName("x".repeat(40)).length, 24);
});

test("totalOf counts the renderers slotsOf leaves out", () => {
  assert.equal(totalOf({ type: "fill", items: [1, 2, 3] }), 3);
  assert.equal(totalOf({ type: "mcgap", items: [1, 2] }), 2);
  assert.equal(totalOf({ type: "wordbank", segments: [{ blank: 0 }, { text: "a" }, { blank: 1 }] }), 2);
});

test("summarize keeps the last result per item, per exercise", () => {
  assert.deepEqual(summarize({ "0/a": true, "0/b": false, "2/x": true }), { 0: [1, 2], 2: [1, 1] });
});

test("rowOf caps at each exercise's total and sums", () => {
  const r = rowOf({ 0: [5, 9], 1: [1, 1] }, [4, 3]);
  assert.deepEqual(r.cells.map((c) => [c.right, c.answered, c.total]), [[4, 4, 4], [1, 1, 3]]);
  assert.equal(r.right, 5); assert.equal(r.answered, 5); assert.equal(r.total, 7);
});

test("band", () => {
  assert.equal(band(0, 0), "leer");
  assert.equal(band(4, 5), "gut");
  assert.equal(band(3, 5), "mittel");
  assert.equal(band(1, 5), "schwach");
});

test("auswertung: weakest first, mistakes counted across phones, payload capped and checked", async () => {
  const { auswertung, readWrong, wrongOf } = await import("../../src/lib/liveUebung/protocol.js");
  const phones = [
    { name: "Ana", ex: { 0: [2, 3], 1: [1, 1] }, f: { "0/2": { g: "dem", e: "der", p: "mit ___ Frau" } } },
    { name: "Ben", ex: { 0: [1, 3] }, f: { "0/2": { g: "dem", e: "der", p: "mit ___ Frau" }, "0/1": { g: "den", e: "dem", p: "" } } },
    { name: "Cem", ex: { 0: [3, 3], 1: [0, 0] }, f: {} },
  ];
  const a = auswertung(phones, [3, 2], null, ["Artikel", "Pronomen"]);
  assert.deepEqual(a.students.map((s) => s.name), ["Ben", "Ana", "Cem"]);
  assert.deepEqual(a.exercises.map((e) => [e.right, e.answered, e.possible]), [[6, 9, 9], [1, 1, 6]]);
  assert.equal(a.mistakes[0].key, "0/2");
  assert.equal(a.mistakes[0].n, 2);
  assert.deepEqual(a.mistakes[0].given, [["dem", 2]]);
  assert.equal(auswertung(phones, [3, 2], [1]).mistakes.length, 0);
  assert.deepEqual(Object.keys(readWrong({ "0/2": { g: "x" }, "bad": {}, "1/<b>": {} })), ["0/2"]);
  assert.equal(wrongOf({ "0/1": { g: "a".repeat(200) } })["0/1"].g.length, 60);
});
