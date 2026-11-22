// Writes grammatik.<id>.name keys (the grammar topic titles on the hub cards) into a site's
// public/i18n/<lang>.json. The source name (src/data/grammatik/*.json, grammatik.json) is the
// site's own language and goes to the file of that language; the other languages come from a
// translations file { "<id>": { "<lang>": "<name>" } }.
//   node scripts/add-topic-name-keys.mjs <site-dir> <translations.json> <source-lang>
// In a translation, {} stands for the part after ": " of the source name (the examples, kept as is; the whole name if it has no colon).
// Existing keys are kept. Prints topics that lack a translation for a language.
import fs from "node:fs";
import path from "node:path";

const [site, trFile, srcLang] = process.argv.slice(2);
if (!site || !trFile || !srcLang) { console.error("usage: <site-dir> <translations.json> <source-lang>"); process.exit(1); }
const tr = JSON.parse(fs.readFileSync(trFile, "utf8"));
const names = {};
const gdir = path.join(site, "src/data/grammatik");
for (const f of fs.readdirSync(gdir)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(fs.readFileSync(path.join(gdir, f), "utf8"));
  if (j.id && j.name) names[j.id] = j.name;
}
for (const t of JSON.parse(fs.readFileSync(path.join(site, "src/data/grammatik.json"), "utf8"))) names[t.id] ??= t.name;

const idir = path.join(site, "public/i18n");
let missing = 0;
for (const f of fs.readdirSync(idir).filter((x) => x.endsWith(".json"))) {
  const lang = f.replace(".json", "");
  const p = path.join(idir, f);
  const dict = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const [id, src] of Object.entries(names)) {
    const key = `grammatik.${id}.name`;
    const tail = src.includes(": ") ? src.slice(src.indexOf(": ") + 2) : src;
    const val = lang === srcLang ? src : tr[id]?.[lang]?.replace("{}", tail);
    if (!val) { missing++; console.warn(`missing ${lang} ${id}`); continue; }
    dict[key] ??= val;
  }
  fs.writeFileSync(p, JSON.stringify(dict, null, 2) + "\n");
}
console.log(`${Object.keys(names).length} topics, ${missing} missing`);
