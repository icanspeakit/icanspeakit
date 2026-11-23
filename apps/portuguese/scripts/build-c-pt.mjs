// Builds src/content/lexicon/c1.json and c2.json (European Portuguese, C1 and C2) and the de/es/fr/it gloss
// sidecars from the authoring files in scripts/c1-pt-data/*.txt and scripts/c2-pt-data/*.txt (item `vocab-c1-c2`).
//   node scripts/build-c-pt.mjs
//
// Row format, one word per line, columns separated by "|" (same as build-b2-pt.mjs):
//   pos|lemma|extra|en|example|ipa|de|es|fr|it|ptBR[|ptBR gender]
// extra  noun: gender,plural[,fem|P]   gender o / a / o/a; plural "-" = none; P = plural-only noun
//        verb: [*][forms: eu present, ele perfeito simples, particípio]   * = irregular
//        adj:  [*]fem[,comparative,superlative]
// ipa    "-" = none (C1/C2 are written without IPA: a wrong transcription is worse than none).
// ptBR   "note>>form" (note = plain English, max 160 characters), optional.
// "@c1-01" starts a unit (ids and topics kept from the existing file; "@c1-01|Title" retitles).
// A row whose lemma already exists in an earlier level (or earlier in C1/C2) is skipped and reported.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../src/lib/audioSlug.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEX = path.join(ROOT, "src/content/lexicon");
const SIDE = ["de", "es", "fr", "it"];
const POS = ["noun", "verb", "adj", "adv", "prep", "conj", "pron", "num", "phrase"];
const errors = [];
const skipped = [];

const idOf = (w) => w.id ?? slugify(w.lemma);
const taken = new Set();
for (const lv of ["a1", "a2", "b1", "b2"]) {
  const d = JSON.parse(fs.readFileSync(path.join(LEX, `${lv}.json`), "utf8"));
  for (const u of d.units) for (const w of u.words) taken.add(idOf(w));
}

const earlier = new Set(taken);
const gloss = { de: {}, es: {}, fr: {}, it: {} };
const staleIds = [];

for (const level of ["c1", "c2"]) {
  const DATA = path.join(ROOT, `scripts/${level}-pt-data`);
  const file0 = path.join(LEX, `${level}.json`);
  const lvl = JSON.parse(fs.readFileSync(file0, "utf8"));
  const oldFile = path.join(DATA, `old-${level}-ids.json`);
  if (!fs.existsSync(oldFile)) fs.writeFileSync(oldFile, JSON.stringify(lvl.units.flatMap((u) => u.words.map(idOf))));
  staleIds.push(...JSON.parse(fs.readFileSync(oldFile, "utf8")));

  const unitMeta = new Map(lvl.units.map((u) => [u.id, u]));
  const units = new Map();
  const titles = new Map();
  let cur = null;
  for (const file of fs.readdirSync(DATA).filter((f) => f.endsWith(".txt")).sort()) {
    fs.readFileSync(path.join(DATA, file), "utf8").split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      const where = `${level}/${file}:${i + 1}`;
      if (!line || line.startsWith("#")) return;
      if (line.startsWith("@")) {
        let t;
        [cur, t] = line.slice(1).split("|").map((x) => x.trim());
        if (t) titles.set(cur, t);
        if (!unitMeta.has(cur)) errors.push(`${where}: unknown unit ${cur}`);
        if (!units.has(cur)) units.set(cur, []);
        return;
      }
      const c = line.split("|");
      if (c.length !== 11 && c.length !== 12) return errors.push(`${where}: ${c.length} columns (${c[1]})`);
      const [pos, lemma, extra, en, example, ipa, de, es, fr, it, ptbr, ptgender] = c.map((s) => s.trim());
      if (!POS.includes(pos)) return errors.push(`${where}: pos ${pos}`);
      const id = slugify(lemma);
      if (taken.has(id)) return skipped.push(`${where}: ${lemma} (already in the lexicon)`);
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
      taken.add(id);
      units.get(cur).push(w);
    });
  }

  const newUnits = [];
  let n = 0;
  for (const meta of lvl.units) {
    const words = units.get(meta.id);
    if (!words?.length) {
      errors.push(`unit ${meta.id} has no words`);
      continue;
    }
    for (const w of words) {
      for (const l of SIDE) gloss[l][idOf(w)] = w._gloss[l];
      delete w._gloss;
      n++;
    }
    newUnits.push({ id: meta.id, title: titles.get(meta.id) ?? meta.title, topics: meta.topics, words });
  }
  lvl.source = {
    rank: `Not filled yet: rank is null until \`node scripts/attach-ranks.mjs ${level}\` attaches a Portuguese OpenSubtitles 2018 list (hermitdave/FrequencyWords pt_50k, licence to verify; the list is Brazil-heavy). Until then these words stay out of the frequency rounds.`,
    lemmas: `Authored for icanspeak Portuguese in European Portuguese (variety pt-PT; ptBR notes where Brazil differs), chosen by topic for CEFR ${level.toUpperCase()}, with what a resident of Portugal needs first. Level banding is our own, not the Referencial of any institution or CAPLE: the UI must not claim otherwise. gender = singular definite article: o / a / o/a (common-gender person nouns). No IPA yet at this level.`,
    generated: "2026-11-18",
  };
  lvl.units = newUnits;
  if (!errors.length) fs.writeFileSync(file0, JSON.stringify(lvl, null, 2) + "\n");
  console.log(`${level}.json: ${newUnits.length} units, ${n} words`);
}
if (skipped.length) console.log("skipped:\n" + skipped.join("\n"));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

for (const f of fs.readdirSync(path.join(LEX, "i18n")).filter((f) => f.endsWith(".json"))) {
  const code = f.replace(".json", "");
  const file = path.join(LEX, "i18n", f);
  let t = JSON.parse(fs.readFileSync(file, "utf8"));
  if (code === "pt") t = {};
  for (const id of staleIds) if (!earlier.has(id)) delete t[id];
  if (gloss[code]) Object.assign(t, gloss[code]);
  const sorted = Object.fromEntries(Object.entries(t).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}
