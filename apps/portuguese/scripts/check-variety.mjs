// Checks the `variety` field, the `ptBR` note and Brazilian forms in pt-PT text
// (docs/content-plan.md §1.5, §10.2):
//
//   node scripts/check-variety.mjs          (summary, first warnings)
//   node scripts/check-variety.mjs --all    (every Brazilian-form warning)
//
// 1. Shape, everywhere: every `variety` / `ptBR` key in any JSON under src/data, src/content and
//    src/paid is checked by varietyProblems() in src/lib/variety.js (allowed values, ptBR.note
//    present and ≤ 160 characters, ptBR.gender only o/a, no unknown keys). A wrong shape is an
//    error. The Spanish course's `variety: "es-ES"` and `es419` notes are still accepted (the
//    "legacy" count) in modules whose Portuguese item hasn't run yet; in a STRICT module they are
//    errors.
// 2. Coverage, per module (the table in §1.5): items that should carry `variety` but don't. In a
//    module that is not strict yet this is one summary line; in a STRICT module every missing
//    `variety` is an error.
// 3. Brazilian forms in pt-PT text: the patterns in scripts/data/brazilianisms.json, run over the
//    Portuguese-text fields of every item whose own or inherited variety is "pt-PT". Warnings
//    only: a deliberate pt-BR example can be right in context. The patterns test themselves
//    against their own `hits` / `clean` examples first; a pattern that fails its examples is an
//    error.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRAZIL_MODE, LEGACY_NOTE_KEY, isLegacy, varietyProblems } from "../src/lib/variety.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => path.relative(ROOT, p).replaceAll("\\", "/");
const SHOW_ALL = process.argv.includes("--all");
const WARN_LINES = 40;

// Modules whose Portuguese item has run: a missing `variety`, a legacy es-ES value or an es419
// note is an error there. The Portuguese content items add their module id here in the same
// commit that converts the module (e.g. vocab-a1 adds "lexicon-a1"). placement-test made einstufung the first.
const STRICT = new Set(["einstufung", "grammatik-a1", "grammatik-start", "lexicon-a1", "wortschatz"]);

const arr = (v) => (Array.isArray(v) ? v : []);
const jsonFiles = (dir) =>
  existsSync(path.join(ROOT, dir))
    ? readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".json")).sort().map((f) => `${dir}/${f}`)
    : [];
const one = (file) => (existsSync(path.join(ROOT, file)) ? [file] : []);

// Each module: its files and the items that must carry `variety` themselves (§1.5). Items below
// them (a grammar topic's exercises, a pack's questions) inherit; read them with varietyOf().
// Ids follow the data file names (they are history); the content item that converts a module
// is named in content-plan §10.
const deckWords = (d) => arr(d.groups).flatMap((g) => arr(g.words).filter((w) => !w.ref).map((item) => ({ item })));
const lexiconWords = (d) => arr(d.units).flatMap((u) => arr(u.words).map((item) => ({ item })));
const MODULES = [
  { id: "lexicon-a1", files: one("src/content/lexicon/a1.json"), items: lexiconWords },
  { id: "lexicon-a2", files: one("src/content/lexicon/a2.json"), items: lexiconWords },
  { id: "lexicon-b1", files: one("src/content/lexicon/b1.json"), items: lexiconWords },
  { id: "lexicon-b2", files: one("src/content/lexicon/b2.json"), items: lexiconWords },
  { id: "lexicon-c1", files: one("src/content/lexicon/c1.json"), items: lexiconWords },
  { id: "lexicon-c2", files: one("src/content/lexicon/c2.json"), items: lexiconWords },
  { id: "berufe", files: jsonFiles("src/data/berufe"), items: deckWords },
  // The driving deck: src/data/dgt until imt-vocab moves it to src/data/imt.
  { id: "imt", files: [...jsonFiles("src/data/dgt"), ...jsonFiles("src/data/imt")], items: deckWords },
  // A unit: its phrases and its own words (refs inherit); exercises inherit from the unit.
  { id: "business", files: [...jsonFiles("src/data/business-spanish"), ...jsonFiles("src/data/business-portuguese")],
    items: (d) => [...arr(d.phrases), ...arr(d.words).filter((w) => !w.ref)].map((item) => ({ item })) },
  { id: "wortschatz", files: one("src/data/wortschatz.json"), items: (d) => arr(d).map((item) => ({ item })) },
  { id: "redemittel", files: one("src/data/redemittel.json"),
    items: (d) => arr(d.sets).flatMap((s) => arr(s.phrases).map((item) => ({ item }))) },
  // A grammar topic carries `variety` at the top level; its exercises inherit.
  { id: "grammatik", files: [...jsonFiles("src/data/grammatik"), ...jsonFiles("src/paid/grammatik")],
    items: (d) => [{ item: d }] },
  // The A1 slots, converted by grammar-a1: strict while the other levels still hold Spanish text.
  // grammar-c1 (or cleanup) makes "grammatik" strict and drops this entry.
  { id: "grammatik-a1", files: ["nomen", "artikel", "personalpronomen", "praesens", "konjugation",
      "praeteritum-sein-haben", "verb-position-2", "berufe-mit-in", "w-fragen", "ja-nein-fragen", "plural",
      "adjektive-nach-sein", "possessivartikel", "welcher-dieser", "gern", "temporale-praepositionen", "aduso",
      "zahlen", "wortarten"].flatMap((id) => one(`src/data/grammatik/${id}.json`)),
    items: (d) => [{ item: d }] },
  { id: "grammatik-quiz", files: one("src/data/grammatik.json"), items: (d) => arr(d).map((item) => ({ item })) },
  // The starter book carries `variety` at the top level; its translations hold no Portuguese of their own.
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
  // Teacher material carries `variety` at the top level of each file.
  { id: "arbeitsblatt", files: jsonFiles("src/data/arbeitsblatt"), items: (d) => [{ item: d }] },
  { id: "partneruebungen", files: jsonFiles("src/data/partneruebungen"), items: (d) => [{ item: d }] },
  { id: "unterricht-wortschatz", files: one("src/data/unterricht-wortschatz.json"), items: (d) => [{ item: d }] },
];
for (const id of STRICT) if (!MODULES.some((m) => m.id === id)) throw new Error(`STRICT names unknown module "${id}"`);

const errors = [];
const read = (file) => {
  try { return JSON.parse(readFileSync(path.join(ROOT, file), "utf8")); }
  catch (e) { errors.push(`${file}: invalid JSON — ${e.message}`); return undefined; }
};
const strictFiles = new Set(MODULES.filter((m) => STRICT.has(m.id)).flatMap((m) => m.files));

// --- Brazilian-form patterns, and their self-test ---------------------------------------------
const L = "[\\p{L}\\p{M}]";
const WB = `(?:(?<!${L})(?=${L})|(?<=${L})(?!${L}))`;
const list = JSON.parse(readFileSync(path.join(ROOT, "scripts/data/brazilianisms.json"), "utf8"));
const TEXT_FIELDS = new Set(list.fields);
const patterns = [];
for (const e of list.entries) {
  let re;
  try { re = new RegExp(e.pattern.replaceAll("\\b", WB), "iu"); }
  catch (err) { errors.push(`brazilianisms.json ${e.id}: bad pattern — ${err.message}`); continue; }
  for (const s of arr(e.hits)) if (!re.test(s.normalize("NFC"))) errors.push(`brazilianisms.json ${e.id}: does not match its hit "${s}"`);
  for (const s of arr(e.clean)) if (re.test(s.normalize("NFC"))) errors.push(`brazilianisms.json ${e.id}: matches its clean example "${s}"`);
  patterns.push({ ...e, re });
}

// Keys whose content is not pt-PT text: never descended into for the Brazilian-form scan.
const NOT_PT = new Set(["ptBR", LEGACY_NOTE_KEY, "translations", "i18n", "uebersetzungen", "note", "en", "explain", "why"]);
const brWarnings = [];
function scanText(file, where, s) {
  const text = s.normalize("NFC");
  for (const p of patterns) {
    const m = p.re.exec(text);
    if (m) brWarnings.push(`${file} ${where}: "${m[0].trim()}" (${p.id}${p.heuristic ? ", heuristic" : ""}) → ${p.hint}`);
  }
}

// --- 1. shape, every JSON file; 3. Brazilian forms in pt-PT items -----------------------------
let legacyCount = 0;
function walk(node, file, where, inherited, scan) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, file, `${where}[${i}]`, inherited, scan)); return; }
  if (!node || typeof node !== "object") return;
  const strict = strictFiles.has(file);
  for (const p of varietyProblems(node, strict ? { legacy: false } : {})) errors.push(`${file} ${where || "(top)"}: ${p}`);
  if (isLegacy(node)) legacyCount++;
  const variety = typeof node.variety === "string" ? node.variety : inherited;
  for (const [k, v] of Object.entries(node)) {
    if (k === "ptBR" || k === LEGACY_NOTE_KEY) continue;
    const at = where ? `${where}.${k}` : k;
    const ptText = scan && variety === "pt-PT" && TEXT_FIELDS.has(k);
    if (ptText && typeof v === "string") scanText(file, at, v);
    else if (ptText && Array.isArray(v)) v.forEach((s, i) => typeof s === "string" && scanText(file, `${at}[${i}]`, s));
    walk(v, file, at, variety, scan && !NOT_PT.has(k));
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
  // Only an explicit pt-PT (own or inherited) opens the Brazilian-form scan: Spanish leftovers
  // without a variety key would only produce noise (celular, perspectiva, aspecto are Spanish too).
  walk(data, file, "", undefined, true);
}

// --- 2. coverage per module -------------------------------------------------------------------
const lines = [];
for (const m of MODULES) {
  let total = 0, missing = 0, notes = 0, legacy = 0;
  for (const file of m.files) {
    const data = cache.get(file) ?? read(file);
    if (data === undefined) continue;
    for (const { item } of m.items(data)) {
      if (!item || typeof item !== "object") continue;
      total++;
      if (item.ptBR) notes++;
      if (isLegacy(item)) legacy++;
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
  lines.push(`  ${m.id}: ${total - missing}/${total} with variety, ${notes} ptBR notes, ${legacy} still Spanish (${state})`);
}

for (const e of errors) console.error(`  ERROR ${e}`);
const pending = MODULES.filter((m) => m.files.length && !STRICT.has(m.id)).length;
console.log(`variety: ${scanned} JSON files scanned, ${errors.length} errors · ${STRICT.size} strict modules, ${pending} still warning-only · ${legacyCount} objects still carry Spanish es-ES/es419 values · Brazil mode ${BRAZIL_MODE ? "ON" : "off"}`);
for (const l of lines) console.log(l);
console.log(`Brazilian forms in pt-PT text: ${brWarnings.length} warning(s) (${patterns.length} patterns, scripts/data/brazilianisms.json)`);
for (const w of SHOW_ALL ? brWarnings : brWarnings.slice(0, WARN_LINES)) console.log(`  warn ${w}`);
if (!SHOW_ALL && brWarnings.length > WARN_LINES) console.log(`  … ${brWarnings.length - WARN_LINES} more: node scripts/check-variety.mjs --all`);
if (errors.length) process.exit(1);
