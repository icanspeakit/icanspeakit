// Bruno sucht den Hochstapler: the rules (src/lib/hochstapler/game.js).
// node --test tests/hochstapler/game.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { hash32, pickHochstapler, rescueOptions, seeded, settle, tally, turnOrder } from "../../src/lib/hochstapler/game.js";

const ids = ["a", "b", "c", "d", "e"];

test("Hochstapler: seeded, never twice in a row, everyone in turn", () => {
  for (let game = 0; game < 200; game++) {
    const counts = {};
    let last = [];
    const seen = [];
    for (let r = 1; r <= 10; r++) {
      const [imp] = pickHochstapler(ids, counts, last, seeded(hash32(`${game}|${r}`)));
      assert.notEqual(imp, last[0], `game ${game} round ${r}: same Hochstapler twice`);
      counts[imp] = (counts[imp] ?? 0) + 1;
      last = [imp];
      seen.push(imp);
    }
    // Fair: after 10 rounds of 5 players everybody has been it exactly twice.
    for (const id of ids) assert.equal(counts[id], 2, `game ${game}: ${id} ${counts[id]}×`);
    // Seeded: the same game replays the same.
    const again = [];
    const c2 = {};
    let l2 = [];
    for (let r = 1; r <= 10; r++) {
      const [imp] = pickHochstapler(ids, c2, l2, seeded(hash32(`${game}|${r}`)));
      c2[imp] = (c2[imp] ?? 0) + 1;
      l2 = [imp];
      again.push(imp);
    }
    assert.deepEqual(again, seen);
  }
});

test("two Hochstapler are two different people", () => {
  for (let s = 0; s < 100; s++) {
    const two = pickHochstapler([...ids, "f", "g", "h", "i"], {}, [], seeded(s), 2);
    assert.equal(new Set(two).size, 2);
  }
});

test("turn order: everyone once, never a Hochstapler first", () => {
  for (let s = 0; s < 200; s++) {
    const order = turnOrder(ids, ["c"], seeded(s));
    assert.deepEqual([...order].sort(), [...ids].sort());
    assert.notEqual(order[0], "c");
  }
});

test("tally: a tie at the top catches nobody", () => {
  assert.deepEqual(tally({ a: "b", b: "a", c: "b", d: "a" }, ["b"]).caught, []);
  assert.deepEqual(tally({ a: "b", c: "b", d: "a" }, ["b"]).caught, ["b"]);
  assert.deepEqual(tally({ a: "c", c: "a", d: "a" }, ["b"]).caught, []);
});

test("settle: points", () => {
  const votes = { a: "b", c: "b", d: "a", e: "b", b: "a" };
  const caughtFail = settle({ ids, impostors: ["b"], votes, caught: ["b"], guessedRight: false });
  assert.equal(caughtFail.winner, "gruppe");
  assert.deepEqual(caughtFail.points, { a: 2, b: 0, c: 2, d: 1, e: 2 });
  const steal = settle({ ids, impostors: ["b"], votes, caught: ["b"], guessedRight: true });
  assert.equal(steal.winner, "hochstapler");
  assert.equal(steal.points.b, 2);
  const escape = settle({ ids, impostors: ["b"], votes: { a: "c" }, caught: [], guessedRight: false });
  assert.deepEqual(escape.points, { a: 0, b: 3, c: 0, d: 0, e: 0 });
});

test("rescue: six options, the word among them, no doubles", () => {
  const mk = (n, p) => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, de: `das ${p}${i}` }));
  const small = { id: "s", words: mk(3, "s") };
  const themes = [small, { id: "t", words: mk(10, "t") }];
  for (let s = 0; s < 50; s++) {
    const opts = rescueOptions(small.words[1], small, themes, seeded(s));
    assert.equal(opts.length, 6);
    assert.ok(opts.some((o) => o.id === "s1"));
    assert.equal(new Set(opts.map((o) => o.id)).size, 6);
  }
});
