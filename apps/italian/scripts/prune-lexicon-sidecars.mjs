// Removes sidecar entries (de, es, fr, pt) whose id is no longer a word in any lexicon level.
//   node scripts/prune-lexicon-sidecars.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../src/lib/audioSlug.js";

const L = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/content/lexicon");
const ids = new Set();
for (const l of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
  const d = JSON.parse(readFileSync(path.join(L, `${l}.json`), "utf8"));
  for (const u of d.units) for (const w of u.words) ids.add(w.id ?? slugify(w.lemma));
}
for (const lang of ["de", "es", "fr", "pt"]) {
  const f = path.join(L, "i18n", `${lang}.json`);
  const o = JSON.parse(readFileSync(f, "utf8"));
  let n = 0;
  for (const k of Object.keys(o)) if (!ids.has(k)) { delete o[k]; n++; }
  writeFileSync(f, JSON.stringify(o, null, 2) + "\n");
  console.log(lang, "removed", n, "left", Object.keys(o).length);
}
