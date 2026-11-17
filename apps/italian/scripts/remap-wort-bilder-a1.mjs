// One-off for `vocab-a1`: the old A1 words were Spanish, their pictures in src/data/wort-bilder.json
// are keyed by those ids. Re-key the pictures to the Italian A1 words with the same English gloss.
//   node scripts/remap-wort-bilder-a1.mjs <old a1.json from git>
// Old entries stay when the id is still a word in another level (A2-C2 still hold Spanish).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../src/lib/audioSlug.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const L = path.join(ROOT, "src/content/lexicon");
const oldA1 = JSON.parse(readFileSync(process.argv[2], "utf8"));
const newA1 = JSON.parse(readFileSync(path.join(L, "a1.json"), "utf8"));
const wbFile = path.join(ROOT, "src/data/wort-bilder.json");
const wb = JSON.parse(readFileSync(wbFile, "utf8"));
const idOf = (w) => w.id ?? slugify(w.lemma);
const first = (en) => en.split(/[,;(]/)[0].trim().toLowerCase();

const live = new Set();
for (const l of ["a2", "b1", "b2", "c1", "c2"]) {
  for (const u of JSON.parse(readFileSync(path.join(L, `${l}.json`), "utf8")).units) for (const w of u.words) live.add(idOf(w));
}
const byEn = new Map();
for (const u of newA1.units) for (const w of u.words) if (w.pos === "noun") if (!byEn.has(first(w.en))) byEn.set(first(w.en), idOf(w));

let moved = 0;
for (const u of oldA1.units) {
  for (const w of u.words) {
    const id = idOf(w);
    if (!(id in wb.words)) continue;
    const target = byEn.get(first(w.en));
    if (target && !(target in wb.words)) { wb.words[target] = wb.words[id]; moved++; }
    if (!live.has(id)) delete wb.words[id];
  }
}
writeFileSync(wbFile, JSON.stringify(wb, null, 2) + "\n");
console.log("pictures re-keyed:", moved, "total now", Object.keys(wb.words).length);
