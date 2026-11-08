// Writes French words from a compact source file into a lexicon level, its i18n sidecars and the
// pictures keyed by word id (docs/content-plan.md §1.4, §1.5, §5.2). For the vocab-* items: one
// tool, so every level gets the same field order, article and id rules. After a level is imported,
// its JSON is the source of truth: fix a word there, don't keep a source file around.
//
//   node scripts/lexicon-import.mjs a1 <source.txt> [more.txt …]
//
// Source: `## a1-01` starts a unit (its title and topics stay as they are); `#!` lines are
// comments; then one word a line,
//
//   old|lemma|pos|gram|en|example|ipa[|de|es|pt|it][|key=value …]
//
//   old    the id this word replaces ("-" for none): its picture carries over to the new id, and
//          when the four glosses are left out they are taken from it (de/pt/it from the sidecars,
//          es = the old Spanish lemma with its article). Only for a word that means the same.
//   pos    n v a adv prep conj pron num phrase
//   gram   n: the article as the learner says it, then the plural without article:
//             `la,maisons` · `le,fils` (invariable) · `la,` (no plural) · `le/la,journalistes`
//             `l':f,écoles` (genus required after l') · `les*:f,vacances` (plural-only; lemma =
//             the plural) · `le!h,héros` (h aspiré)
//          v: je présent, il passé composé, participe passé: `parle,a parlé,parlé`; the auxiliary
//             is read from the second form (est / s'est → être), `@both` for monter, sortir,
//             passer; `!irr` irregular; `+à` dependent preposition. A lemma starting with `se ` or
//             `s'` is reflexive.
//          a: feminine `grande`, `^bel` the form before a vowel, `!meilleur;le meilleur`
//             irregular comparative;superlative
//   ipa    standard French IPA with syllable dots, authored (§1.4): `e.kɔl`
//   keys   id=… (homographs) · img=emoji, or img=old to keep the old id's picture when the glosses
//          are written out · ca=note~form~gender (the frCA note, §1.5) ·
//          reg=… (regional note) · rect=… (1990 spelling)
//
// A slug taken by a word of another level gets `-fr` (§1.3).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { slugify } from "../src/lib/audioSlug.js";

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
// French → these languages (§1.4). `fr` is emptied: a French gloss of a French word is meaningless.
const LANGS = ["de", "es", "pt", "it"];
const OPT = /^(id|img|ca|reg|rect)=/;

const wordId = (w) => w.id ?? slugify(w.lemma);
const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const file = readJson(LEXICON(level));
const sidecars = Object.fromEntries([...LANGS, "fr"].map((l) => [l, existsSync(SIDECAR(l)) ? readJson(SIDECAR(l)) : {}]));

// Ids other levels already use: an id collision would merge two words' progress.
const taken = new Set();
for (const other of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
  if (other === level) continue;
  for (const u of readJson(LEXICON(other)).units ?? []) for (const w of u.words ?? []) taken.add(wordId(w));
}

// The words this level holds before the run, by id: the source of glosses copied with `old`.
const before = new Map(file.units.flatMap((u) => u.words.map((w) => [wordId(w), w])));
function spanishWithArticle(w) {
  if (w.pos !== "noun" || !w.gender) return w.lemma;
  if (w.pluralOnly) return `${w.genus === "f" || w.gender === "la" ? "las" : "los"} ${w.plural ?? w.lemma}`;
  return `${w.gender === "el/la" ? "el/la" : w.gender} ${w.lemma}`;
}
function copiedGlosses(old, where) {
  const w = before.get(old);
  if (!w) throw new Error(`${where}: old id "${old}" is not in ${level}.json, so its glosses can't be copied`);
  const out = { es: spanishWithArticle(w) };
  for (const l of ["de", "pt", "it"]) {
    if (!sidecars[l][old]) throw new Error(`${where}: no ${l} gloss for old id "${old}"`);
    out[l] = sidecars[l][old];
  }
  return out;
}

function gramFields(pos, gram, lemma, where) {
  const out = {};
  if (pos === "noun") {
    const m = /^(le\/la|le|la|l'|les)(!h)?(\*)?(?::(m|f|mf))?,(.*)$/.exec(gram);
    if (!m) throw new Error(`${where}: bad noun grammar "${gram}"`);
    out.gender = m[1];
    if (m[4]) out.genus = m[4];
    if (m[2]) out.hAspire = true;
    if (m[5]) out.plural = m[5];
    if (m[3]) out.pluralOnly = true;
  } else if (pos === "verb") {
    const m = /^([^!+@]+)(!irr)?(@both)?(?:\+(.+))?$/.exec(gram);
    if (!m) throw new Error(`${where}: bad verb grammar "${gram}"`);
    out.forms = m[1].split(",").map((f) => f.trim());
    if (out.forms.length !== 3) throw new Error(`${where}: forms must be three: je présent, il passé composé, participe passé`);
    out.aux = m[3] ? "both" : /(^|\s|')(est|sont)\s/.test(out.forms[1]) ? "être" : "avoir";
    if (/^(se |s')/.test(lemma)) out.reflexive = true;
    if (m[2]) out.irregular = true;
    if (m[4]) out.prep = m[4];
  } else if (pos === "adj") {
    const m = /^([^!^]+)(?:\^([^!]+))?(?:!(.+))?$/.exec(gram);
    if (!m) throw new Error(`${where}: an adjective needs its feminine form`);
    out.fem = m[1].trim();
    if (m[2]) out.mascVowel = m[2].trim();
    if (m[3]) {
      const [comparative, superlative] = m[3].split(";");
      Object.assign(out, { irregular: true, comparative, superlative });
    }
  } else if (gram) {
    throw new Error(`${where}: grammar "${gram}" on a ${pos}`);
  }
  return out;
}

function parseLine(line, unitId) {
  const parts = line.split("|").map((s) => s.trim());
  const [old, lemma, posKey, gram, en, example, ipa] = parts;
  const rest = parts.slice(7);
  const opts = rest.filter((p) => OPT.test(p));
  const glossParts = rest.filter((p) => !OPT.test(p));
  const where = `${unitId}/${lemma}`;
  const pos = POS[posKey];
  if (!pos) throw new Error(`${where}: unknown pos "${posKey}"`);
  if (!en || !example || !ipa) throw new Error(`${where}: en, example and ipa are required`);
  if (/[ˈˌ]/.test(ipa)) throw new Error(`${where}: French IPA has no stress marks: ${ipa}`);
  let gloss;
  if (glossParts.length === 4) {
    if (glossParts.some((g) => !g)) throw new Error(`${where}: a gloss is empty`);
    gloss = Object.fromEntries(LANGS.map((l, i) => [l, glossParts[i]]));
  } else if (glossParts.length === 0) {
    if (old === "-") throw new Error(`${where}: no glosses and no old id to copy them from`);
    gloss = copiedGlosses(old, where);
  } else {
    throw new Error(`${where}: give all four glosses (de|es|pt|it) or none, got ${glossParts.length}`);
  }
  const opt = Object.fromEntries(opts.map((o) => [o.slice(0, o.indexOf("=")), o.slice(o.indexOf("=") + 1)]));
  let id = opt.id ?? slugify(lemma);
  if (taken.has(id)) id = `${id}-fr`;

  const fields = gramFields(pos, gram, lemma, where);
  const word = {
    ...(id === slugify(lemma) ? {} : { id }),
    lemma,
    pos,
    ...fields,
    ...(opt.rect ? { rectified: opt.rect } : {}),
    en,
    example,
    rank: null,
    ipa,
    ipaSource: "authored",
    audio: id,
    variety: "fr-FR",
  };
  if (opt.ca) {
    const [note, form, gender] = opt.ca.split("~");
    word.frCA = { note, ...(form ? { form } : {}), ...(gender ? { gender } : {}) };
  }
  if (opt.reg) word.regional = opt.reg;
  return { id, word, old, img: opt.img, copied: glossParts.length === 0, gloss };
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
  rank: `Not filled yet: rank is null until \`node scripts/attach-ranks.mjs ${level}\` attaches the French OpenSubtitles 2018 list (hermitdave/FrequencyWords fr_50k, licence to verify). Until then these words stay out of the frequency rounds.`,
  lemmas: `Authored for icanspeak French in the standard French of France (variety fr-FR; frCA notes where Québec usage differs), chosen by topic for CEFR ${level.toUpperCase()}, with what a resident of France needs first. Level banding is our own, NOT an official reference list (no Référentiel / DELF word list): the UI must not claim otherwise. gender = the singular article as the learner says it: le / la / l' / les (plural-only) / le/la (common gender); genus where l' or les hides the gender; hAspire on h aspiré nouns. IPA authored per word (standard French, syllable dots, no liaison).`,
  generated: new Date().toISOString().slice(0, 10),
};

const compact = (obj) => JSON.stringify(obj, null, 2);
writeFileSync(LEXICON(level), compact(file) + "\n", "utf8");

// Sidecars: the new glosses in; ids of this level that no longer exist out. fr: emptied.
const liveIds = new Set(file.units.flatMap((u) => u.words.map(wordId)));
const gone = [...previous].filter((id) => !liveIds.has(id) && !taken.has(id));
for (const lang of LANGS) {
  const table = sidecars[lang];
  for (const id of gone) delete table[id];
  for (const p of parsed) table[p.id] = p.gloss[lang];
  const sorted = Object.fromEntries(Object.entries(table).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  writeFileSync(SIDECAR(lang), compact(sorted) + "\n", "utf8");
}
if (existsSync(SIDECAR("fr"))) writeFileSync(SIDECAR("fr"), "{}\n", "utf8");

// Pictures: an old id's picture moves to the new id unless the line names its own.
const pics = readJson(PICTURES);
const oldPics = { ...pics.words };
for (const id of gone) delete pics.words[id];
// The old picture carries over only when the word means the same: its glosses were copied, or the
// line says `img=old`. A slot reused for another word (agricultor → salaire) must not keep 👨‍🌾.
const notCarried = [];
for (const p of parsed) {
  const oldImg = p.old !== "-" ? oldPics[p.old] : null;
  const img = p.img === "old" ? oldImg : p.img ?? (p.copied ? oldImg : null);
  if (img) pics.words[p.id] = img;
  else delete pics.words[p.id];
  if (oldImg && !img) notCarried.push(`${p.old} ${oldImg} → ${p.id}`);
}
if (notCarried.length) console.log(`pictures not carried over (add img=old if the meaning is the same):\n  ${notCarried.join("\n  ")}`);
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
console.log(`${level}: ${parsed.length} words imported, ${parsed.filter((p) => p.word.frCA).length} frCA notes, ${[...seen.keys()].filter((i) => i.endsWith("-fr")).join(", ") || "no"} -fr ids`);
