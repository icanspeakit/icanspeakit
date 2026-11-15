// Checks the `variety` field and the `regional` note (docs/content-plan.md §1.5):
//
//   node scripts/check-variety.mjs        (pnpm check:variety; part of check:content)
//
// 1. Shape, everywhere: every `variety` / `regional` key in any JSON under src/data, src/content
//    and src/paid is checked by varietyProblems() in src/lib/variety.js (it-IT / it-CH,
//    regional.note present and ≤ 160 characters, regional.area and regional.gender values, no
//    unknown keys). A wrong shape is an error. The Spanish course's `variety: "es-ES"` and
//    `es419` notes are tolerated on Spanish items of modules that are not strict yet; `es419` on
//    an Italian item is an error.
// 2. Coverage, per module (the table in §1.5): items that should carry `variety` but don't.
//    While a module still holds Spanish content this is one summary line. Once the module's
//    content item has run, that item adds the module id to STRICT below: then every missing
//    `variety`, every es-ES and every `es419` in the module's files is an error.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VARIETIES, varietyProblems } from "../src/lib/variety.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => path.relative(ROOT, p).replaceAll("\\", "/");

// Modules whose content item has run (converted to Italian): there a missing `variety` is an
// error, and so are the Spanish course's leftovers (variety es-ES, an `es419` note anywhere in
// the file). Add the module id in the same commit that converts the module (its queue item).
// Empty since `variety-schema` (2026-11-12): every module still holds Spanish-course content, so
// the Spanish course's strict list was dropped; the items re-add their modules one by one.
// Re-added: einstufung (placement-test).
const STRICT = new Set(["einstufung", "grammatik", "grammatik-quiz", "praepositionen", "verbtabellen", "hoeren", "redemittel", "aussprache-check", "zungenbrecher", "satzmelodie", "ausspracheregeln", "umgangssprache", "synonyme", "fehler-nach-sprache", "typische-fehler", "wortfallen", "redewendungen", "patente", "artikel-sprint", "quaki-fragen", "hochstapler-redemittel"]);

const arr = (v) => (Array.isArray(v) ? v : []);
const jsonFiles = (dir) =>
  existsSync(path.join(ROOT, dir))
    ? readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".json")).sort().map((f) => `${dir}/${f}`)
    : [];
const one = (file) => (existsSync(path.join(ROOT, file)) ? [file] : []);

// Each module: its files and the items that must carry `variety` themselves (§1.5). Items below
// them (a grammar topic's exercises, a pack's questions) inherit; read them with varietyOf().
const deckWords = (d) => arr(d.groups).flatMap((g) => arr(g.words).filter((w) => !w.ref).map((item) => ({ item })));
const MODULES = [
  // One level at a time: each vocab-* item moves its file from "lexicon" to this strict list.
  { id: "lexicon-a1", files: one("src/content/lexicon/a1.json"),
    items: (d) => arr(d.units).flatMap((u) => arr(u.words).map((item) => ({ item }))) },
  { id: "lexicon-a2", files: one("src/content/lexicon/a2.json"),
    items: (d) => arr(d.units).flatMap((u) => arr(u.words).map((item) => ({ item }))) },
  { id: "lexicon-b1", files: one("src/content/lexicon/b1.json"),
    items: (d) => arr(d.units).flatMap((u) => arr(u.words).map((item) => ({ item }))) },
  { id: "lexicon-b2", files: one("src/content/lexicon/b2.json"),
    items: (d) => arr(d.units).flatMap((u) => arr(u.words).map((item) => ({ item }))) },
  { id: "lexicon-c1", files: one("src/content/lexicon/c1.json"),
    items: (d) => arr(d.units).flatMap((u) => arr(u.words).map((item) => ({ item }))) },
  { id: "lexicon-c2", files: one("src/content/lexicon/c2.json"),
    items: (d) => arr(d.units).flatMap((u) => arr(u.words).map((item) => ({ item }))) },
  { id: "berufe", files: jsonFiles("src/data/berufe"), items: deckWords },
  // src/data/dgt became src/data/patente in `patente-vocab` (content-plan §11); converted: strict.
  { id: "patente", files: jsonFiles("src/data/patente"), items: deckWords },
  // A unit: its phrases and its own words (refs inherit); exercises inherit from the unit.
  // `business-italian` renames the folder in one commit (content-plan §13); both ids are listed.
  { id: "business-spanish", files: jsonFiles("src/data/business-spanish"),
    items: (d) => [...arr(d.phrases), ...arr(d.words).filter((w) => !w.ref)].map((item) => ({ item })) },
  { id: "business-italian", files: jsonFiles("src/data/business-italian"),
    items: (d) => [...arr(d.phrases), ...arr(d.words).filter((w) => !w.ref)].map((item) => ({ item })) },
  { id: "wortschatz", files: one("src/data/wortschatz.json"), items: (d) => arr(d).map((item) => ({ item })) },
  { id: "redemittel", files: one("src/data/redemittel.json"),
    items: (d) => arr(d.sets).flatMap((s) => arr(s.phrases).map((item) => ({ item }))) },
  // A grammar topic carries `variety` at the top level; its exercises inherit.
  { id: "grammatik", files: [...jsonFiles("src/data/grammatik"), ...jsonFiles("src/paid/grammatik")],
    items: (d) => [{ item: d }] },
  { id: "grammatik-quiz", files: one("src/data/grammatik.json"), items: (d) => arr(d).map((item) => ({ item })) },
  // The starter book carries `variety` at the top level; its translations hold no Spanish of their own.
  { id: "grammatik-start", files: one("src/data/grammatik-start/en.json"), items: (d) => [{ item: d }] },
  { id: "praepositionen", files: one("src/data/praepositionen-trainer.json"),
    items: (d) => arr(d.packs).map((item) => ({ item })) },
  // The placement test's questions are grammar items; the file carries `variety` at the top level.
  { id: "einstufung", files: one("src/data/einstufung.json"), items: (d) => [{ item: d }] },
  { id: "verbtabellen", files: one("src/data/verbtabellen.json"), items: (d) => [{ item: d }] },
  { id: "conjugation-trainer", files: one("src/data/conjugation-trainer.json"),
    items: (d) => arr(d.sets ?? d).map((item) => ({ item })) },
  { id: "hoeren", files: one("src/data/hoeren.json"), items: (d) => arr(d.texts).map((item) => ({ item })) },
  { id: "aussprache-check", files: one("src/data/aussprache-check.json"),
    items: (d) => arr(d.levels).flatMap((l) => arr(l.sentences).map((item) => ({ item }))) },
  { id: "zungenbrecher", files: one("src/data/zungenbrecher.json"),
    items: (d) => arr(d.levels).flatMap((l) => arr(l.sentences).map((item) => ({ item }))) },
  { id: "satzmelodie", files: one("src/data/satzmelodie.json"),
    items: (d) => [...arr(d.families), ...arr(d.stress), ...arr(d.rules)].map((item) => ({ item })) },
  { id: "ausspracheregeln", files: one("src/data/ausspracheregeln.json"),
    items: (d) => arr(d.rules).map((item) => ({ item })) },
  { id: "umgangssprache", files: one("src/data/umgangssprache.json"), items: (d) => arr(d.gruppen).flatMap((g) => arr(g.eintraege).map((item) => ({ item }))) },
  { id: "synonyme", files: one("src/data/synonyme.json"), items: (d) => arr(d.groups).map((item) => ({ item })) },
  { id: "fehler-nach-sprache", files: one("src/data/fehler-nach-sprache.json"), items: (d) => [{ item: d }] },
  { id: "typische-fehler", files: one("src/data/typische-fehler.json"), items: (d) => arr(d.groups).flatMap((g) => arr(g.pairs).map((item) => ({ item }))) },
  { id: "wortfallen", files: one("src/data/wortfallen.json"), items: (d) => arr(d.groups).map((item) => ({ item })) },
  { id: "redewendungen", files: one("src/data/redewendungen.json"),
    items: (d) => arr(d.eintraege).map((item) => ({ item })) },
  // Game data (games item): one `variety` at the top level of each file.
  { id: "artikel-sprint", files: one("src/data/artikel-sprint/words.json"), items: (d) => [{ item: d }] },
  { id: "quaki-fragen", files: one("src/data/quakiSpringt/fragen.json"), items: (d) => [{ item: d }] },
  { id: "hochstapler-redemittel", files: one("src/data/hochstapler/redemittel.json"), items: (d) => [{ item: d }] },
  // Teacher material carries `variety` at the top level of each file.
  { id: "arbeitsblatt", files: jsonFiles("src/data/arbeitsblatt"), items: (d) => [{ item: d }] },
  { id: "partneruebungen", files: jsonFiles("src/data/partneruebungen"), items: (d) => [{ item: d }] },
  { id: "unterricht-wortschatz", files: one("src/data/unterricht-wortschatz.json"), items: (d) => [{ item: d }] },
];

const errors = [];
const read = (file) => {
  try { return JSON.parse(readFileSync(path.join(ROOT, file), "utf8")); }
  catch (e) { errors.push(`${file}: invalid JSON — ${e.message}`); return undefined; }
};

// --- 1. shape, every JSON file --------------------------------------------------------------
// Files of a strict module: es-ES and es419 are errors anywhere in them.
const strictFiles = new Set(MODULES.filter((m) => STRICT.has(m.id)).flatMap((m) => m.files));
function walk(node, file, where, strict) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, file, `${where}[${i}]`, strict)); return; }
  if (!node || typeof node !== "object") return;
  for (const p of varietyProblems(node, { strict })) errors.push(`${file} ${where || "(top)"}: ${p}`);
  for (const [k, v] of Object.entries(node)) {
    if (k !== "es419" && k !== "regional") walk(v, file, where ? `${where}.${k}` : k, strict);
  }
}
function allJson(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const p = path.join(abs, name);
    if (statSync(p).isDirectory()) allJson(rel(p), out);
    else if (name.endsWith(".json")) out.push(rel(p));
  }
  return out;
}
let scanned = 0;
const cache = new Map();
for (const file of ["src/data", "src/content", "src/paid"].flatMap((d) => allJson(d))) {
  const data = read(file);
  if (data === undefined) continue;
  cache.set(file, data);
  scanned++;
  walk(data, file, "", strictFiles.has(file));
}

// --- 2. coverage per module -----------------------------------------------------------------
const lines = [];
for (const m of MODULES) {
  let total = 0, missing = 0, italian = 0, regional = 0, legacy = 0;
  for (const file of m.files) {
    const data = cache.get(file) ?? read(file);
    if (data === undefined) continue;
    for (const { item } of m.items(data)) {
      if (!item || typeof item !== "object") continue;
      total++;
      if (item.regional) regional++;
      if (item.es419) legacy++;
      if (VARIETIES.includes(item.variety)) italian++;
      if ("variety" in item) continue;
      missing++;
      if (STRICT.has(m.id)) {
        const label = item.id ?? item.lemma ?? item.front ?? item.de ?? item.inf ?? "?";
        errors.push(`${file} ${label}: no "variety" (module ${m.id} is strict)`);
      }
    }
  }
  if (!m.files.length) continue;
  const state = STRICT.has(m.id) ? "strict" : "not strict yet";
  lines.push(`  ${m.id}: ${total - missing}/${total} with variety (${italian} Italian), ${regional} regional notes, ${legacy} legacy es419 (${state})`);
}

for (const e of errors) console.error(`  ERROR ${e}`);
const pending = MODULES.filter((m) => m.files.length && !STRICT.has(m.id)).length;
console.log(`variety: ${scanned} JSON files scanned, ${errors.length} errors · ${STRICT.size} strict modules, ${pending} still warning-only`);
for (const l of lines) console.log(l);
if (errors.length) process.exit(1);
