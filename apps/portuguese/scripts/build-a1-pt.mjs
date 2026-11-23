// Builds src/content/lexicon/a1.json (European Portuguese, A1) and the de/es/fr/it gloss sidecars
// from the authoring files in scripts/a1-pt-data/*.txt (item `vocab-a1`).
//   node scripts/build-a1-pt.mjs
//
// Row format, one word per line, columns separated by "|":
//   pos|lemma|extra|en|example|ipa|de|es|fr|it|ptBR[|ptBR gender]
// extra  noun: gender,plural[,fem|P]   gender o / a / o/a; plural "-" = none; P = plural-only noun
//        verb: [*][forms: eu present, ele perfeito simples, particípio]   * = irregular
//        adj:  [*]fem[,comparative,superlative]   * = irregular comparative
//        phrase/adv/prep/...: anything (ignored)
// ptBR   "note>>form" (note = plain English, max 160 characters), optional.
// "@a1-01" starts a unit (unit ids, titles and topics are kept from the existing a1.json).
// Lines starting with # are comments.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../src/lib/audioSlug.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "scripts/a1-pt-data");
const LEX = path.join(ROOT, "src/content/lexicon");
const SIDE = ["de", "es", "fr", "it"];
const POS = ["noun", "verb", "adj", "adv", "prep", "conj", "pron", "num", "phrase"];

const a1 = JSON.parse(fs.readFileSync(path.join(LEX, "a1.json"), "utf8"));

// The Spanish A1 ids, remembered on the first run so a re-run still knows which sidecar entries are stale.
const oldFile = path.join(DATA, "old-a1-ids.json");
if (!fs.existsSync(oldFile)) {
  const ids = a1.units.flatMap((u) => u.words.map((w) => w.id ?? slugify(w.lemma)));
  fs.writeFileSync(oldFile, JSON.stringify(ids));
}
const oldIds = JSON.parse(fs.readFileSync(oldFile, "utf8"));

// Ids of the other levels (still Spanish): a Portuguese slug that collides gets "-pt".
const otherIds = new Set();
for (const lv of ["a2", "b1", "b2", "c1", "c2"]) {
  const d = JSON.parse(fs.readFileSync(path.join(LEX, `${lv}.json`), "utf8"));
  for (const u of d.units) for (const w of u.words) otherIds.add(w.id ?? slugify(w.lemma));
}

const unitMeta = new Map(a1.units.map((u) => [u.id, u]));
const units = new Map();
const errors = [];
let cur = null;

for (const file of fs.readdirSync(DATA).filter((f) => f.endsWith(".txt")).sort()) {
  const lines = fs.readFileSync(path.join(DATA, file), "utf8").split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const where = `${file}:${i + 1}`;
    if (!line || line.startsWith("#")) return;
    if (line.startsWith("@")) {
      cur = line.slice(1).trim();
      if (!unitMeta.has(cur)) errors.push(`${where}: unknown unit ${cur}`);
      if (!units.has(cur)) units.set(cur, []);
      return;
    }
    const c = line.split("|");
    if (c.length !== 11 && c.length !== 12) return errors.push(`${where}: ${c.length} columns (${c[1]})`);
    const [pos, lemmaRaw, extra, en, example, ipa, de, es, fr, it, ptbr, ptgender] = c.map((s) => s.trim());
    if (!POS.includes(pos)) return errors.push(`${where}: pos ${pos}`);
    const [lemma, explicitId] = lemmaRaw.split("#"); // "pôr#por-verb": explicit id where the slug is taken
    const w = { lemma, pos };
    const parts = extra.split(",").map((s) => s.trim());
    if (pos === "noun") {
      const [g, plural, third] = parts;
      if (!["o", "a", "o/a"].includes(g)) errors.push(`${where}: gender ${g}`);
      w.gender = g;
      if (plural && plural !== "-") w.plural = plural;
      if (third === "P") w.pluralOnly = true;
      else if (third) w.fem = third;
    } else if (pos === "verb") {
      let f = parts;
      if (f[0].startsWith("*")) {
        w.irregular = true;
        f = [f[0].slice(1), ...f.slice(1)];
      }
      if (f.length !== 3) errors.push(`${where}: verb forms ${f.length}`);
      w.forms = f;
      if (lemma.endsWith("-se")) w.reflexive = true;
    } else if (pos === "adj") {
      let f = parts;
      if (f[0].startsWith("*")) {
        w.irregular = true;
        f = [f[0].slice(1), ...f.slice(1)];
      }
      w.fem = f[0];
      if (f[1]) w.comparative = f[1];
      if (f[2]) w.superlative = f[2];
    }
    w.en = en;
    w.example = example;
    w.rank = null;
    if (ipa && ipa !== "-") {
      w.ipa = ipa;
      w.ipaSource = "authored";
    }
    let id = explicitId || slugify(lemma);
    if (!explicitId && otherIds.has(id)) id = `${id}-pt`;
    if (id !== slugify(lemma)) w.id = id;
    w.audio = id;
    w.variety = "pt-PT";
    if (ptbr) {
      const [note, form] = ptbr.split(">>");
      if (note.length > 160) errors.push(`${where}: ptBR note ${note.length} chars`);
      const o = { note };
      if (form) o.form = form;
      if (ptgender) o.gender = ptgender;
      w.ptBR = o;
    }
    for (const [k, v] of Object.entries({ de, es, fr, it })) if (!v || v === "-") errors.push(`${where}: no ${k} gloss for ${lemma}`);
    w._gloss = { de, es, fr, it };
    units.get(cur).push(w);
  });
}

const seen = new Map();
const newUnits = [];
const gloss = { de: {}, es: {}, fr: {}, it: {} };
for (const meta of a1.units) {
  const words = units.get(meta.id);
  if (!words?.length) {
    errors.push(`unit ${meta.id} has no words`);
    continue;
  }
  for (const w of words) {
    const id = w.id ?? slugify(w.lemma);
    if (seen.has(id)) errors.push(`duplicate id ${id}: ${w.lemma} / ${seen.get(id)}`);
    seen.set(id, w.lemma);
    for (const l of SIDE) gloss[l][id] = w._gloss[l];
    delete w._gloss;
  }
  newUnits.push({ id: meta.id, title: meta.title, topics: meta.topics, words });
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

a1.source = {
  rank: "Not filled yet: rank is null until `node scripts/attach-ranks.mjs a1` attaches a Portuguese OpenSubtitles 2018 list (hermitdave/FrequencyWords pt_50k, licence to verify; the list is Brazil-heavy). Until then these words stay out of the frequency rounds.",
  lemmas: "Authored for icanspeak Portuguese in European Portuguese (variety pt-PT; ptBR notes where Brazil differs), chosen by topic for CEFR A1, with what a resident of Portugal needs first. Level banding is our own, not the Referencial of any institution or CAPLE: the UI must not claim otherwise. gender = singular definite article: o / a / o/a (common-gender person nouns). IPA is hand-written, broad European Portuguese; ipaSource authored.",
  generated: "2026-11-17",
};
a1.units = newUnits;
fs.writeFileSync(path.join(LEX, "a1.json"), JSON.stringify(a1, null, 2) + "\n");

// Sidecars: drop every stale A1 (Spanish) id from all of them, then add the Portuguese glosses.
for (const f of fs.readdirSync(path.join(LEX, "i18n")).filter((f) => f.endsWith(".json"))) {
  const code = f.replace(".json", "");
  const file = path.join(LEX, "i18n", f);
  let t = JSON.parse(fs.readFileSync(file, "utf8"));
  if (code === "pt") t = {}; // Portuguese -> Portuguese is meaningless (content-plan §1.4)
  for (const id of oldIds) delete t[id];
  if (gloss[code]) Object.assign(t, gloss[code]);
  const sorted = Object.fromEntries(Object.entries(t).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}
if (!fs.existsSync(path.join(LEX, "i18n", "es.json"))) throw new Error("es.json not written");
console.log(`a1.json: ${newUnits.length} units, ${seen.size} words`);
