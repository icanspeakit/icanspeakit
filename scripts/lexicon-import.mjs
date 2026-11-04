// Writes Spanish words from a compact source file into a lexicon level, its i18n sidecars and the
// pictures keyed by word id (docs/content-plan.md §1.4, §5.2). For the vocab-* items: one tool, so
// every level gets the same field order, IPA and id rules. After a level is imported, its JSON is
// the source of truth: fix a word there, don't keep a source file around.
//
//   node scripts/lexicon-import.mjs a1 <source.txt> [more.txt …]
//
// Source: `## a1-01` starts a unit (its title and topics stay as they are); then one word a line,
//
//   old|lemma|pos|gram|en|example|de|fr|pt|it[|id=…][|ipa=…][|img=…][|lat=note~form~gender]
//
//   old    the id this word replaces ("-" for none): its picture carries over to the new id, and
//          the map is printed so that bildkarten.json and other id lists can follow
//   pos    n v a adv prep conj pron num phrase
//   gram   n: `la,casas`, `el/la,estudiantes`, no plural `la,`; plural-only `el*,padres`;
//             article hides a feminine `el!f,aguas`
//          v: `hablo,habló,hablado`, plus `!irr` and/or `+en` (dependent preposition)
//          a: feminine form `alta`, plus `!mejor;el mejor` for irregular comparative;superlative
//   lat    the es419 note (§1.5): note, then optionally ~form and ~gender
//
// A slug taken by a word of another level gets `-es` (§1.3).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { slugify } from "../src/lib/audioSlug.js";
import { ipaOf } from "./es-ipa.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [level, ...sources] = process.argv.slice(2);
if (!level || !sources.length) {
  console.error("usage: node scripts/lexicon-import.mjs <level> <source.txt> [more.txt …]");
  process.exit(1);
}

const LEXICON = (l) => path.join(ROOT, "src/content/lexicon", `${l}.json`);
const SIDECAR = (l) => path.join(ROOT, "src/content/lexicon/i18n", `${l}.json`);
const PICTURES = path.join(ROOT, "src/data/wort-bilder.json");
const POS = { n: "noun", v: "verb", a: "adj", adv: "adv", prep: "prep", conj: "conj", pron: "pron", num: "num", phrase: "phrase" };
const LANGS = ["de", "fr", "pt", "it"];

const wordId = (w) => w.id ?? slugify(w.lemma);
const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const file = readJson(LEXICON(level));

// Ids other levels already use: an id collision would merge two words' progress.
const taken = new Set();
for (const other of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
  if (other === level) continue;
  for (const u of readJson(LEXICON(other)).units ?? []) for (const w of u.words ?? []) taken.add(wordId(w));
}

function gramFields(pos, gram, where) {
  const out = {};
  if (pos === "noun") {
    const m = /^(el\/la|el|la)(\*|!f)?,(.*)$/.exec(gram);
    if (!m) throw new Error(`${where}: bad noun grammar "${gram}"`);
    out.gender = m[1];
    if (m[2] === "!f") out.genus = "f";
    if (m[3]) out.plural = m[3];
    if (m[2] === "*") out.pluralOnly = true;
  } else if (pos === "verb") {
    const m = /^([^!+]+)(!irr)?(?:\+(.+))?$/.exec(gram);
    if (!m) throw new Error(`${where}: bad verb grammar "${gram}"`);
    out.forms = m[1].split(",").map((f) => f.trim());
    if (out.forms.length !== 3) throw new Error(`${where}: forms must be three: yo present, él indefinido, participle`);
    if (m[2]) out.irregular = true;
    if (m[3]) out.prep = m[3];
  } else if (pos === "adj") {
    const [fem, irr] = gram.split("!");
    if (!fem) throw new Error(`${where}: an adjective needs its feminine form`);
    out.fem = fem;
    if (irr) {
      const [comparative, superlative] = irr.split(";");
      Object.assign(out, { irregular: true, comparative, superlative });
    }
  } else if (gram) {
    throw new Error(`${where}: grammar "${gram}" on a ${pos}`);
  }
  return out;
}

function parseLine(line, unitId) {
  const [old, lemma, posKey, gram, en, example, de, fr, pt, it, ...opts] = line.split("|").map((s) => s.trim());
  const where = `${unitId}/${lemma}`;
  const pos = POS[posKey];
  if (!pos) throw new Error(`${where}: unknown pos "${posKey}"`);
  if (!en || !example || !de || !fr || !pt || !it) throw new Error(`${where}: a field is empty`);
  const opt = Object.fromEntries(opts.map((o) => [o.slice(0, o.indexOf("=")), o.slice(o.indexOf("=") + 1)]));
  let id = opt.id ?? slugify(lemma);
  if (taken.has(id)) id = `${id}-es`;

  const fields = gramFields(pos, gram, where);
  const word = {
    ...(id === slugify(lemma) ? {} : { id }),
    lemma,
    pos,
    ...fields,
    ...(pos === "verb" && lemma.endsWith("se") ? { reflexive: true } : {}),
    en,
    example,
    rank: null,
    ipa: opt.ipa ?? ipaOf(lemma),
    ipaSource: "authored",
    audio: id,
    variety: "es-ES",
  };
  if (opt.lat) {
    const [note, form, gender] = opt.lat.split("~");
    word.es419 = { note, ...(form ? { form } : {}), ...(gender ? { gender } : {}) };
  }
  return { id, word, old, img: opt.img, gloss: { de, fr, pt, it } };
}

const units = new Map(file.units.map((u) => [u.id, u]));
// Every id the converted units held before this run: glosses and pictures of the words they replace go.
const previous = new Set();
const parsed = [];
for (const src of sources) {
  let unit = null;
  let inUnit = [];
  const flush = () => {
    if (!unit) return;
    unit.words = inUnit.map((p) => p.word);
    parsed.push(...inUnit);
  };
  for (const raw of readFileSync(src, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#!")) continue;
    if (line.startsWith("## ")) {
      flush();
      const id = line.slice(3).trim();
      unit = units.get(id);
      if (!unit) throw new Error(`unknown unit ${id}`);
      for (const w of unit.words ?? []) previous.add(wordId(w));
      inUnit = [];
      continue;
    }
    if (!unit) throw new Error(`word before the first unit: ${line}`);
    inUnit.push(parseLine(line, unit.id));
  }
  flush();
}

const seen = new Map();
for (const p of parsed) {
  if (seen.has(p.id)) throw new Error(`duplicate id ${p.id}: ${seen.get(p.id)} and ${p.word.lemma}`);
  seen.set(p.id, p.word.lemma);
}

file.source = {
  rank: `Not filled yet: rank is null until \`node scripts/attach-ranks.mjs ${level}\` attaches the Spanish OpenSubtitles 2018 list (hermitdave/FrequencyWords es_50k, licence to verify). Until then these words stay out of the frequency rounds.`,
  lemmas: `Authored for icanspeak Spanish in Castilian Spanish (variety es-ES; es419 notes where Latin America differs), chosen by topic for CEFR ${level.toUpperCase()}, with what a resident of Spain needs first. Level banding is our own, NOT the Instituto Cervantes Plan Curricular (PCIC): the UI must not claim otherwise. gender = singular definite article: el / la / el/la (common-gender person nouns). IPA generated by scripts/es-ipa.mjs (broad Castilian).`,
  generated: new Date().toISOString().slice(0, 10),
};

const compact = (obj) => JSON.stringify(obj, null, 2);
writeFileSync(LEXICON(level), compact(file) + "\n", "utf8");

// Sidecars: the new glosses in; ids of this level that no longer exist out.
const liveIds = new Set(file.units.flatMap((u) => u.words.map(wordId)));
const gone = [...previous].filter((id) => !liveIds.has(id) && !taken.has(id));
for (const lang of LANGS) {
  const table = existsSync(SIDECAR(lang)) ? readJson(SIDECAR(lang)) : {};
  for (const id of gone) delete table[id];
  for (const p of parsed) table[p.id] = p.gloss[lang];
  const sorted = Object.fromEntries(Object.entries(table).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  writeFileSync(SIDECAR(lang), compact(sorted) + "\n", "utf8");
}

// Pictures: an old id's picture moves to the new id unless the line names its own.
const pics = readJson(PICTURES);
const oldPics = { ...pics.words };
for (const id of gone) delete pics.words[id];
for (const p of parsed) {
  const img = p.img ?? (p.old !== "-" ? oldPics[p.old] : null) ?? oldPics[p.id];
  if (img) pics.words[p.id] = img;
  else delete pics.words[p.id];
}
writeFileSync(PICTURES, serialisePictures(pics), "utf8");

function serialisePictures(data) {
  const rows = [];
  const entries = Object.entries(data.words);
  for (let i = 0; i < entries.length; i += 9) {
    rows.push("    " + entries.slice(i, i + 9).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", "));
  }
  const { words, ...rest } = data;
  const head = Object.entries(rest).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");
  return `{\n${head}\n  "words": {\n${rows.join(",\n")}\n  }\n}\n`;
}

const map = Object.fromEntries(parsed.filter((p) => p.old && p.old !== "-").map((p) => [p.old, p.id]));
writeFileSync(path.join(ROOT, `_tmp_idmap_${level}.json`), JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`${level}: ${parsed.length} words imported, ${parsed.filter((p) => p.word.es419).length} es419 notes, ${[...seen.keys()].filter((i) => i.endsWith("-es")).join(", ") || "no"} -es ids`);
