// Builds src/content/lexicon/a1.json and the A1 entries of the i18n sidecars (de, es, fr, pt)
// from the authored source in scripts/data/a1-it/*.txt (content item `vocab-a1`).
//   node scripts/build-a1-it.mjs
//
// Source format, one word per line, fields separated by "|":
//   pos|lemma|morph|plural|en|example|ipa|de|es|fr|pt|extras(JSON, optional)
// A line "# a1-01 | Unit title | topic,topic" opens a unit. Lines starting with "//" are comments.
//   noun: morph = article (il lo la l' il/la); plural = plural without article
//         extras: {"genus":"m"} (required with l'), {"fem":"studentessa"}, {"pluralGender":"f"},
//                 {"pluralOnly":true}, {"regional":{...}}
//   verb: morph = "io-present,participio,io-imperfetto[,aux]" ; extras: {"reflexive":true,"irregular":true,"prep":"a"}
//   adj : morph = feminine singular (or empty) ; extras: {"irregular":true,"comparative":..}
//   others: morph and plural empty.
// The translations (de es fr pt) go to the sidecars, keyed by word id; nouns carry their article.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../src/lib/audioSlug.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "scripts/data/a1-it");
const LEX = path.join(ROOT, "src/content/lexicon");
const POS = { n: "noun", v: "verb", adj: "adj", adv: "adv", prep: "prep", conj: "conj", pron: "pron", num: "num", phrase: "phrase" };
const LANGS = ["de", "es", "fr", "pt"];

const old = JSON.parse(readFileSync(path.join(LEX, "a1.json"), "utf8"));
const others = new Set();
for (const l of ["a2", "b1", "b2", "c1", "c2"]) {
  const d = JSON.parse(readFileSync(path.join(LEX, `${l}.json`), "utf8"));
  for (const u of d.units) for (const w of u.words) others.add(w.id ?? slugify(w.lemma));
}
const oldIds = new Set(old.units.flatMap((u) => u.words.map((w) => w.id ?? slugify(w.lemma))));

const units = [];
const side = Object.fromEntries(LANGS.map((l) => [l, {}]));
const seen = new Set();
let cur = null;
const problems = [];

for (const f of readdirSync(SRC).filter((x) => x.endsWith(".txt")).sort()) {
  const lines = readFileSync(path.join(SRC, f), "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!line.trim() || line.startsWith("//")) return;
    if (line.startsWith("#")) {
      const [id, title, topics] = line.slice(1).split("|").map((s) => s.trim());
      cur = { id, title, topics: topics.split(",").map((s) => s.trim()), words: [] };
      units.push(cur);
      return;
    }
    const c = line.split("|");
    const where = `${f}:${i + 1} ${c[1]}`;
    if (c.length < 11) return problems.push(`${where}: ${c.length} fields`);
    const [p, lemma, morph, plural, en, example, ipa, de, es, fr, pt, extra] = c.map((s) => s.trim());
    if (!POS[p]) return problems.push(`${where}: pos ${p}`);
    const w = { lemma, pos: POS[p] };
    const ex = extra ? JSON.parse(extra) : {};
    if (p === "n") {
      w.gender = morph;
      if (plural) w.plural = plural;
      if (ex.genus) w.genus = ex.genus;
      if (ex.pluralOnly) w.pluralOnly = true;
      if (ex.pluralGender) w.pluralGender = ex.pluralGender;
      if (ex.fem) w.fem = ex.fem;
    } else if (p === "v") {
      const [a, b, d, aux] = morph.split(",");
      w.forms = [a, b, d];
      if (aux) w.aux = aux;
      if (ex.reflexive) w.reflexive = true;
      if (ex.irregular) w.irregular = true;
      if (ex.prep) w.prep = ex.prep;
    } else if (p === "adj") {
      if (morph) w.fem = morph;
      if (ex.irregular) w.irregular = true;
      if (ex.comparative) w.comparative = ex.comparative;
      if (ex.superlative) w.superlative = ex.superlative;
    }
    w.en = en;
    w.example = example;
    w.rank = null;
    w.ipa = ipa;
    w.ipaSource = "authored";
    w.audio = slugify(lemma);
    // Windows cannot store con.mp3, aux.mp3 … (check-parity): such slugs get the part of speech.
    if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(w.audio)) w.audio = `${w.audio}-${w.pos}`;
    w.variety = "it-IT";
    if (ex.regional) w.regional = ex.regional;
    let id = slugify(lemma);
    if (others.has(id)) { id = `${id}-it`; w.id = id; }
    if (seen.has(id)) return problems.push(`${where}: duplicate id ${id}`);
    seen.add(id);
    for (const [l, t] of [["de", de], ["es", es], ["fr", fr], ["pt", pt]]) {
      if (!t) problems.push(`${where}: no ${l}`);
      else side[l][id] = t;
    }
    cur.words.push(w);
  });
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }

const out = {
  level: "A1",
  source: {
    rank: "Not filled yet: rank is null until `node scripts/attach-ranks.mjs a1` attaches the Italian OpenSubtitles 2018 list (hermitdave/FrequencyWords it_50k, licence to verify). Until then these words stay out of the frequency rounds.",
    lemmas: "Authored for icanspeak Italian in standard Italian (variety it-IT; `regional` notes where daily life differs by region), chosen by topic for CEFR A1, with what a resident of Italy needs first. Level banding is our own, NOT the Nuovo Vocabolario di Base (De Mauro) and no exam list (CILS, CELI, PLIDA, CERT.IT): the UI must not claim otherwise. gender = singular definite article as the learner says it: il / lo / la / l' (il/la for common-gender person nouns; genus m|f with l'). The plural article is derived (src/lib/articles.js). IPA authored (broad standard Italian, open/closed e and o marked).",
    generated: "2026-11-14",
  },
  units,
};
writeFileSync(path.join(LEX, "a1.json"), JSON.stringify(out, null, 2) + "\n");

for (const l of LANGS) {
  const file = path.join(LEX, "i18n", `${l}.json`);
  const cur2 = JSON.parse(readFileSync(file, "utf8"));
  for (const id of oldIds) if (!others.has(id)) delete cur2[id];
  Object.assign(cur2, side[l]);
  const sorted = Object.fromEntries(Object.entries(cur2).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}
console.log(`${units.length} units, ${seen.size} words`);
