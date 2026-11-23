// One-off for `vocab-a2`: drop deck entries that point at deleted Spanish A2 lexicon ids, and own words
// whose lemma is now a lexicon word. The decks are refilled by their own items. Re-runnable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../src/lib/audioSlug.js";

const R = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lex = new Set();
for (const lv of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
  const d = JSON.parse(fs.readFileSync(`${R}/src/content/lexicon/${lv}.json`, "utf8"));
  for (const u of d.units) for (const w of u.words) lex.add(w.id ?? slugify(w.lemma));
}
const files = [];
for (const dir of ["berufe", "business-spanish", "imt"]) {
  for (const f of fs.readdirSync(`${R}/src/data/${dir}`)) if (f.endsWith(".json") && !f.includes("manifest")) files.push(`${R}/src/data/${dir}/${f}`);
}
const decks = files.map((f) => {
  const raw = fs.readFileSync(f, "utf8");
  return { f, raw, d: JSON.parse(raw) };
});
const lists = (o, out = []) => {
  if (Array.isArray(o)) o.forEach((v) => lists(v, out));
  else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      if (k === "words" && Array.isArray(v)) out.push(v);
      lists(v, out);
    }
  }
  return out;
};
let removed = 0;
let changed;
do {
  changed = false;
  const own = new Set(decks.flatMap(({ d }) => lists(d).flat().filter((w) => w.id).map((w) => w.id)));
  for (const { d } of decks) {
    for (const arr of lists(d)) {
      const keep = arr.filter((w) => (w.ref ? lex.has(w.ref) || own.has(w.ref) : !lex.has(slugify(w.lemma))));
      if (keep.length !== arr.length) {
        removed += arr.length - keep.length;
        arr.length = 0;
        arr.push(...keep);
        changed = true;
      }
    }
  }
} while (changed);
for (const { f, raw, d } of decks) {
  const indent = raw.startsWith('{\n  "') || raw.startsWith("[\n  ") ? 2 : 0;
  const out = JSON.stringify(d, null, indent) + (raw.endsWith("\n") ? "\n" : "");
  if (out !== raw) fs.writeFileSync(f, out);
}
console.log("removed", removed);
