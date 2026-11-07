// node --test tests/unterricht/  (npm run test:unterricht)
// Present-mode slides (src/lib/folien.js): at most 20 words, levels, layout, balanced html.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { splitUnits, formatUnit, slidesOfHtml, words, MAX_WORDS, overLimit } from "../../src/lib/folien.js";

const balanced = (h) => {
  const st = [];
  for (const [, c, n] of h.matchAll(/<(\/?)([a-z]+)\b[^>]*>/gi)) {
    if (!c) st.push(n);
    else if (st.pop() !== n) return false;
  }
  return !st.length;
};

test("words: marks are not words, a → b pair is one", () => {
  assert.equal(words("Im <strong>Dativ</strong> heißt es: <em>ich → mir, du → dir</em>."), 6);
  assert.equal(words("✗ Ich helfe dich. → ✓ Ich helfe dir."), 6);
});

test("sentences become units, tags stay balanced across a cut", () => {
  const u = splitUnits("<em>Ich gehe. Ich bin da. Ich komme.</em>");
  assert.deepEqual(u.map((x) => x.html), ["<em>Ich gehe.</em>", "<em>Ich bin da.</em>", "<em>Ich komme.</em>"]);
});

test("a level label holds for the sentences after it", () => {
  const u = splitUnits("Für alle. A1: mich, dich. A2: zwei Pronomen. Noch mehr dazu.");
  assert.deepEqual(u.map((x) => x.level), [null, "A1", "A2", "A2"]);
  assert.equal(u[1].html, "mich, dich.");
});

test("filler sentences are dropped, question words stay together", () => {
  const u = splitUnits("Woher? Wohin? Wo? Die Frage entscheidet. Diese kleinen Wörter brauchen Sie jeden Tag.");
  assert.deepEqual(u.map((x) => x.html), ["Woher? Wohin? Wo?", "Die Frage entscheidet."]);
});

test("layout: chips, example line, pairs table, corrections", () => {
  assert.match(formatUnit("Woher? Wohin? Wo?"), /pr-chips/);
  assert.match(formatUnit("<em>Ich gehe zu meiner Tante.</em>"), /^<p class="pr-ex">Ich gehe zu meiner Tante\.<\/p>$/);
  assert.match(formatUnit("Es heißt: <em>ich → mir, du → dir, er → ihm</em>."), /ex-pairs/);
  assert.match(formatUnit("✗ <em>Ich helfe dich.</em> → ✓ <em>Ich helfe dir.</em>"), /pr-fix/);
  const chips = formatUnit("Das Subjekt: <em>ich, du, er, sie</em>.");
  assert.match(chips, /<span><em>ich<\/em><\/span>/);
  assert.ok(balanced(chips));
});

test("every slide of every topic is balanced html, and almost all fit in 20 words", () => {
  let total = 0;
  const over = [];
  for (const f of fs.readdirSync("src/data/grammatik")) {
    const w = JSON.parse(fs.readFileSync(`src/data/grammatik/${f}`, "utf8"));
    for (const h of [w.briefHtml ?? w.subtitle ?? "", ...(w.concept?.qa ?? []).map((q) => q.html)]) {
      for (const s of slidesOfHtml(h)) {
        total++;
        assert.ok(balanced(s.html), `${f}: ${s.html.slice(0, 80)}`);
        if (overLimit(s)) over.push(f);
      }
    }
  }
  assert.ok(total > 500);
  // A handful of B1/B2 sentences cannot be cut; audit:praesentation lists them.
  assert.ok(over.length <= 5, `over the limit: ${over.join(", ")}`);
});
