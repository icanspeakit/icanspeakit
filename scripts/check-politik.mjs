// /politik: the checks POLITISCHE-BILDUNG-PROMPT.md (section 5) asks for. `npm run check:politik`.
//
//   1. Quiz scoring: all neutral → centre; full agreement with the balanced set → centre;
//      known patterns → the expected corner; the set is balanced (5 + 5 per axis).
//   2. Both German registers: every text block has `de` and `leicht`, every glossary term
//      both, every [[id|…]] points to a glossary entry. Translations: every block has every
//      help language (reported, not failed, while they are machine drafts).
//   3. Every number traces to a data file with a source: CHES parties have wave + values,
//      parliaments have source + date, seats add up, ESS shares sum to ~100.
import fs from "node:fs";
import assert from "node:assert/strict";
import { score, match, nearest, balanced, encodePos, decodePos } from "../src/lib/politik/quiz.js";

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../src/data/politik/${f}`, import.meta.url), "utf8"));
const quiz = read("quiz.json");
const texte = read("texte.json");
const glossar = read("glossar.json");
const debatten = read("debatten.json");
const ches = read("ches.json");
const parl = fs.existsSync(new URL("../src/data/politik/parlamente.json", import.meta.url)) ? read("parlamente.json") : null;
const ess = read("selbsteinstufung.json");
const material = fs.existsSync(new URL("../src/data/politik/material.json", import.meta.url)) ? read("material.json") : null;

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log(`  ok  ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};
const all = (v) => Object.fromEntries(quiz.items.map((it) => [it.id, typeof v === "function" ? v(it) : v]));

console.log("Quiz");
test("20 statements, balanced 5 + 5 per axis", () => {
  assert.equal(quiz.items.length, 20);
  assert.ok(balanced(quiz.items));
  for (const ax of ["x", "y"]) for (const d of [1, -1]) assert.equal(quiz.items.filter((i) => i.axis === ax && i.dir === d).length, 5, `${ax}${d}`);
});
test("all neutral → centre (5/5)", () => assert.deepEqual(score(quiz.items, all(0)), { x: 5, y: 5 }));
test("„stimme voll zu“ on everything → centre", () => assert.deepEqual(score(quiz.items, all(2)), { x: 5, y: 5 }));
test("„gar nicht“ on everything → centre", () => assert.deepEqual(score(quiz.items, all(-2)), { x: 5, y: 5 }));
test("agree with every right/TAN item, reject the others → (10, 10)", () => assert.deepEqual(score(quiz.items, all((it) => 2 * it.dir)), { x: 10, y: 10 }));
test("the opposite → (0, 0)", () => assert.deepEqual(score(quiz.items, all((it) => -2 * it.dir)), { x: 0, y: 0 }));
test("economic left + GAL → (0, 0); economic right + GAL → (10, 0)", () => {
  assert.deepEqual(score(quiz.items, all((it) => -2 * it.dir)), { x: 0, y: 0 });
  assert.deepEqual(score(quiz.items, all((it) => (it.axis === "x" ? 2 : -2) * it.dir)), { x: 10, y: 0 });
});
test("skipped items do not count; too few answers → null", () => {
  const some = Object.fromEntries(quiz.items.filter((i) => i.axis === "x").slice(0, 2).map((i) => [i.id, 2 * i.dir]));
  assert.deepEqual(score(quiz.items, some), { x: null, y: null });
  const half = all((it) => (it.axis === "x" && it.dir === 1 ? 2 : null));
  assert.deepEqual(score(quiz.items, half), { x: 10, y: null });
});
test("match: same point 100 %, opposite corners 0 %", () => {
  assert.equal(match({ x: 3, y: 3 }, { x: 3, y: 3 }), 100);
  assert.equal(match({ x: 0, y: 0 }, { x: 10, y: 10 }), 0);
});
test("nearest orders by distance", () => {
  const n = nearest({ x: 2, y: 2 }, [{ name: "B", x: 9, y: 9 }, { name: "A", x: 2.5, y: 2 }, { name: "C", x: 5, y: 5 }], 2);
  assert.deepEqual(n.map((p) => p.name), ["A", "C"]);
});
test("shared link holds the point only and round-trips", () => {
  assert.equal(encodePos({ x: 4.25, y: 6 }), "4.3,6.0");
  assert.deepEqual(decodePos("4.3,6.0"), { x: 4.3, y: 6 });
  assert.equal(decodePos("11,2"), null);
  assert.equal(decodePos("<script>"), null);
});

console.log("Texte (Deutsch B1/B2 und Einfaches Deutsch)");
const blocks = [];
const walk = (o, path) => {
  if (!o || typeof o !== "object") return;
  if (typeof o.de === "string" || typeof o.leicht === "string") return blocks.push([path, o]);
  for (const [k, v] of Object.entries(o)) if (!k.startsWith("_")) walk(v, `${path}.${k}`);
};
walk(texte, "texte");
walk(debatten.items, "debatten");
walk(quiz.items, "quiz");
test("every block has both registers", () => {
  const missing = blocks.filter(([, b]) => !b.de?.trim() || !b.leicht?.trim()).map(([p]) => p);
  assert.deepEqual(missing, []);
});
test("placeholders match between registers", () => {
  const tok = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
  const bad = blocks.filter(([, b]) => tok(b.de) !== tok(b.leicht)).map(([p]) => p);
  assert.deepEqual(bad, []);
});
test("every [[term]] is in the glossary, with both registers", () => {
  const ids = new Set(blocks.flatMap(([, b]) => [...`${b.de} ${b.leicht}`.matchAll(/\[\[([a-z0-9-]+)\|/g)].map((m) => m[1])));
  const missing = [...ids].filter((id) => !glossar.terms[id]);
  assert.deepEqual(missing, []);
  for (const [id, t] of Object.entries(glossar.terms)) assert.ok(t.de && t.leicht && t.term, id);
});
test("debates: 3 pro, 3 contra, lengths within 35 % of each other", () => {
  for (const d of debatten.items) {
    assert.equal(d.pro.length, 3, d.id);
    assert.equal(d.contra.length, 3, d.id);
    for (const reg of ["de", "leicht"]) {
      const len = (a) => a.reduce((n, x) => n + x[reg].length, 0);
      const [p, c] = [len(d.pro), len(d.contra)];
      assert.ok(Math.abs(p - c) / Math.max(p, c) <= 0.35, `${d.id} ${reg}: pro ${p} / contra ${c} Zeichen`);
    }
  }
});

test("translations: every help language for every block the page asks for", () => {
  const tx = JSON.parse(fs.readFileSync(new URL("../src/data/uebersetzungen/politik.json", import.meta.url), "utf8"));
  const langs = ["en", "ar", "uk", "tr", "id", "es", "vi", "pt", "hi", "tl"];
  const ids = [
    ...debatten.items.flatMap((d) => [`debatten.${d.id}.frage`, ...d.pro.map((_, i) => `debatten.${d.id}.pro.${i}`), ...d.contra.map((_, i) => `debatten.${d.id}.contra.${i}`)]),
    ...quiz.items.map((q) => `quiz.${q.id}`),
    ...Object.keys(glossar.terms).map((g) => `glossar.${g}`),
    ...(material?.items ?? []).map((m) => `material.${m.id}`),
  ];
  const missing = ids.flatMap((id) => langs.filter((l) => !tx.entries[id]?.[l]).map((l) => `${id}:${l}`));
  assert.deepEqual(missing, []);
});

console.log("Daten und Quellen");
test("CHES: wave with citation, every party with lrecon and galtan in 0…10", () => {
  assert.ok(ches.waves?.[0]?.citation && ches.waves[0].url);
  for (const p of ches.parties) {
    assert.ok(["DE", "AT", "CH"].includes(p.country), p.ches_abbrev);
    for (const v of ["lrecon", "galtan"]) assert.ok(p[v] >= 0 && p[v] <= 10, `${p.ches_abbrev} ${v}`);
  }
});
test("debate heatmap variables exist in the CHES data", () => {
  for (const d of debatten.items) if (d.ches) assert.ok(d.ches.var in ches.variables, d.ches.var);
});
test("ESS: source, and shares per country sum to 100 ± 0.5", () => {
  assert.ok(ess.source?.url && ess.source.citation);
  for (const c of ess.countries) {
    assert.equal(c.shares.length, 11, c.country);
    const s = c.shares.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(s - 100) <= 0.5, `${c.country}: ${s}`);
  }
});
test("parliaments: source, date, seats add up, majority = floor(total/2)+1", () => {
  assert.ok(parl, "parlamente.json fehlt");
  for (const p of parl.parliaments) {
    assert.ok(p.source?.url && p.data_as_of, p.country);
    const sum = p.parties.reduce((n, x) => n + x.seats, 0);
    assert.equal(sum, p.total_seats, `${p.country}: ${sum} ≠ ${p.total_seats}`);
    assert.equal(p.majority, Math.floor(p.total_seats / 2) + 1, p.country);
  }
});
test("material: every item has publisher, url and a check date", () => {
  assert.ok(material, "material.json fehlt");
  assert.ok(material.checked);
  for (const m of material.items) assert.ok(m.publisher && m.url && m.title, m.id);
});

console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen.` : "\nAlles in Ordnung.");
process.exit(failed ? 1 : 0);
