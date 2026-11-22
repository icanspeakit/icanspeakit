// Writes Italian words from a compact source file into units of a lexicon level, its i18n
// sidecars and the pictures keyed by word id (docs/content-plan.md §1.4, §1.5, §5.2). Use it to
// replace or fill single units; scripts/build-lexicon-it.mjs rebuilds a whole level from
// scripts/data/<level>-it/. After a unit is imported, the level's JSON is the source of truth:
// fix a word there, don't keep a source file around.
//
//   node scripts/lexicon-import.mjs a2 <source.txt> [more.txt …]
//
// Source: `## a2-01` starts a unit (its title and topics stay as they are); then one word a line,
//
//   old|lemma|pos|gram|en|example|de|es|fr|pt|ipa=…[|id=…][|img=…][|reg=note~area~form~gender]
//
//   old    the id this word replaces ("-" for none): its picture carries over to the new id, and
//          the map is printed so that bildkarten.json and other id lists can follow
//   pos    n v a adv prep conj pron num phrase
//   gram   n: `la,case`, `il/la,colleghi`, no plural `la,`; plural-only `il*,pantaloni`;
//             `l'` needs the gender: `l'!m,amici`, `l'!f,ore`; -a plural of a masculine
//             noun: `il!pf,braccia` (pluralGender f)
//          v: `parlo,parlato,parlavo,avere` (io presente, participio, io imperfetto, auxiliary
//             avere | essere | avere/essere), plus `!irr` and/or `+a` (dependent preposition)
//          a: feminine form `alta` (empty for -e adjectives), plus `!migliore;il migliore` for an
//             irregular comparative;superlative
//   ipa    required: broad standard Italian IPA, authored (no generator for Italian)
//   reg    the regional note (§1.5): note, then optionally ~area ~form ~gender
//
// The article must fit the lemma (src/lib/articles.js); validate-lexicon.mjs checks it again.
// A slug taken by a word of another level gets `-it` (§1.3), as in build-lexicon-it.mjs.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { slugify } from "../src/lib/audioSlug.js";
import { articleFits } from "../src/lib/articles.js";
import { REGIONAL_AREAS, REGIONAL_GENDERS, REGIONAL_NOTE_MAX } from "../src/lib/variety.js";

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
const LANGS = ["de", "es", "fr", "pt"];
const AUX = ["avere", "essere", "avere/essere"];

const wordId = (w) => w.id ?? slugify(w.lemma);
const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const file = readJson(LEXICON(level));

// Ids other levels already use: an id collision would merge two words' progress.
const taken = new Set();
for (const other of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
  if (other === level) continue;
  for (const u of readJson(LEXICON(other)).units ?? []) for (const w of u.words ?? []) taken.add(wordId(w));
}

function gramFields(pos, gram, lemma, where) {
  const out = {};
  if (pos === "noun") {
    const m = /^(il\/la|lo\/la|il|lo|la|l')(\*|!m|!f|!pf)?,(.*)$/.exec(gram);
    if (!m) throw new Error(`${where}: bad noun grammar "${gram}"`);
    out.gender = m[1];
    if (m[2] === "!m" || m[2] === "!f") out.genus = m[2].slice(1);
    if (out.gender === "l'" && !out.genus) throw new Error(`${where}: l' needs !m or !f`);
    if (m[3]) out.plural = m[3];
    if (m[2] === "*") out.pluralOnly = true;
    if (m[2] === "!pf") out.pluralGender = "f";
    if (!articleFits(lemma, out.gender, out.genus)) throw new Error(`${where}: "${out.gender}" does not fit "${lemma}"`);
  } else if (pos === "verb") {
    const m = /^([^!+]+)(!irr)?(?:\+(.+))?$/.exec(gram);
    if (!m) throw new Error(`${where}: bad verb grammar "${gram}"`);
    const parts = m[1].split(",").map((f) => f.trim());
    if (parts.length !== 4) throw new Error(`${where}: io presente, participio, io imperfetto, auxiliary`);
    if (!AUX.includes(parts[3])) throw new Error(`${where}: auxiliary "${parts[3]}"`);
    out.forms = parts.slice(0, 3);
    out.aux = parts[3];
    if (m[2]) out.irregular = true;
    if (m[3]) out.prep = m[3];
  } else if (pos === "adj") {
    const [fem, irr] = gram.split("!");
    if (fem) out.fem = fem;
    if (irr) {
      const [comparative, superlative] = irr.split(";");
      Object.assign(out, { irregular: true, comparative, superlative });
    }
  } else if (gram) {
    throw new Error(`${where}: grammar "${gram}" on a ${pos}`);
  }
  return out;
}

function regionalOf(spec, where) {
  const [note, area, form, gender] = spec.split("~").map((s) => s.trim());
  if (!note || note.length > REGIONAL_NOTE_MAX) throw new Error(`${where}: regional note missing or over ${REGIONAL_NOTE_MAX} characters`);
  if (area && !REGIONAL_AREAS.includes(area)) throw new Error(`${where}: regional area "${area}"`);
  if (gender && !REGIONAL_GENDERS.includes(gender)) throw new Error(`${where}: regional gender "${gender}"`);
  return { note, ...(area ? { area } : {}), ...(form ? { form } : {}), ...(gender ? { gender } : {}) };
}

function parseLine(line, unitId) {
  const [old, lemma, posKey, gram, en, example, de, es, fr, pt, ...opts] = line.split("|").map((s) => s.trim());
  const where = `${unitId}/${lemma}`;
  const pos = POS[posKey];
  if (!pos) throw new Error(`${where}: unknown pos "${posKey}"`);
  if (!en || !example || !de || !es || !fr || !pt) throw new Error(`${where}: a field is empty`);
  const opt = Object.fromEntries(opts.map((o) => [o.slice(0, o.indexOf("=")), o.slice(o.indexOf("=") + 1)]));
  if (!opt.ipa) throw new Error(`${where}: ipa= is required`);
  let id = opt.id ?? slugify(lemma);
  if (taken.has(id)) id = `${id}-it`;
  // Windows cannot store con.mp3, aux.mp3 … (check-parity): such slugs get the part of speech.
  const audio = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(id) ? `${id}-${pos}` : id;

  const fields = gramFields(pos, gram, lemma, where);
  const word = {
    ...(id === slugify(lemma) ? {} : { id }),
    lemma,
    pos,
    ...fields,
    ...(pos === "verb" && /si$/.test(lemma.split(" ")[0]) ? { reflexive: true } : {}),
    en,
    example,
    rank: null,
    ipa: opt.ipa,
    ipaSource: "authored",
    audio,
    variety: "it-IT",
  };
  if (opt.reg) word.regional = regionalOf(opt.reg, where);
  return { id, word, old, img: opt.img, gloss: { de, es, fr, pt } };
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

// The level's source note stays as build-lexicon-it.mjs wrote it (standard Italian, it-IT); only
// the date moves.
file.source = { ...(file.source ?? {}), generated: new Date().toISOString().slice(0, 10) };

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
console.log(`${level}: ${parsed.length} words imported, ${parsed.filter((p) => p.word.regional).length} regional notes, ${[...seen.keys()].filter((i) => i.endsWith("-it")).join(", ") || "no"} -it ids`);
