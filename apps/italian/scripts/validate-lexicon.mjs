// Validates src/content/lexicon/*.json against the rules in docs/wortschatz-programm-v1.md.
// Plain JS, no schema library — package.json deliberately carries only `astro` at runtime.
//   node scripts/validate-lexicon.mjs
// Exits non-zero on any error, so it can gate a build or a commit hook.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { slugify } from "../src/lib/audioSlug.js";
import { VARIETIES, varietyProblems } from "../src/lib/variety.js";
import { articleFits } from "../src/lib/articles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];
const POS = ["noun", "verb", "adj", "adv", "prep", "conj", "pron", "num", "phrase"];

// Two rule sets while the levels are converted one by one (docs/content-plan.md §1.4, §1.5):
// a word whose `variety` is Italian (it-IT / it-CH) is checked by the Italian rules, any other
// word by the Spanish course's rules. `vocab-c1-c2` drops the Spanish set.
//
// Italian: the singular definite article as the learner says it; il/la, lo/la for common-gender
// person nouns (the masculine article; `fem` gives the feminine). The plural article is derived,
// never stored. Whether the article fits the lemma's first sound is vocab-a1's rule (articles.js).
const IT_GENDERS = ["il", "lo", "la", "l'", "il/la", "lo/la"];
// genus: "m" or "f", required with l' (the article hides the gender: l'amico m, l'ora f).
const IT_GENUS = ["m", "f"];
// pluralGender: "f" for the -a plurals of masculine nouns (l'uovo → le uova, il braccio → le braccia).
const IT_PLURAL_GENDER = ["f"];
// The auxiliary of the passato prossimo.
const IT_AUX = ["avere", "essere", "avere/essere"];
// Spanish course: el / la, el/la; genus only "f" on el + stressed a- (el agua).
const ES_GENDERS = ["el", "la", "el/la"];
const ES_GENUS = ["f"];
const CASES = ["akk", "dat", "gen", "akk/dat"];
const ES_AUX = ["haben", "sein"];

// §4 taxonomy. A word may only carry topics listed here, so a typo can't silently create
// a topic that no deck will ever select.
const TOPICS = new Set([
  "person", "familie", "gefuehle", "wohnen", "stadt", "essen", "einkaufen", "kleidung",
  "koerper", "gesundheit", "arbeit", "bildung", "freizeit", "reisen", "verkehr", "zeit",
  "wetter", "natur", "geld", "aemter", "medien", "kommunikation", "sprache",
  "umwelt", "politik", "wirtschaft", "recht", "wissenschaft", "technik", "kultur",
  "psychologie", "gesellschaft", "migration",
  "nominalstil", "idiomatik", "kollokation", "konnektoren", "fachsprache", "stilebene",
  "wortbildung",
]);

// Provenance values scripts/fetch-wiktionary.mjs is allowed to stamp. A sourced field has to say
// where it came from, so a later pass can find the rows that were never sourced instead of
// guessing which of them to re-check. See docs/lexicon-enrichment-v1.md §2.1.
// "authored": British IPA written by hand for the English levels (content-plan §1.4).
const IPA_SOURCES = ["wiktionary", "authored"];

// grammar_anchor keys to a grammar topic that must actually exist — same reasoning as the closed
// §4 topic taxonomy: an unchecked free-text field accumulates typos that no page ever selects,
// and the mistake only surfaces as a silently missing cross-link months later.
const GRAMMAR_IDS = new Set(
  readdirSync(path.join(ROOT, "src/data/grammatik"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
);

const errors = [];
const warnings = [];
const seenIds = new Map();
const seenUnits = new Set();
const sourced = { ipa: 0, anchor: 0 };
let total = 0;

function err(where, msg) {
  errors.push(`${where}: ${msg}`);
}

const nonEmpty = (s) => typeof s === "string" && s.trim() !== "";

// An Italian word (variety it-IT / it-CH), content-plan §1.4.
function checkItalian(w, where) {
  if (w.pos === "noun") {
    if (!w.gender) err(where, "noun without gender (il / lo / la / l', il/la; pluralOnly nouns keep the singular-equivalent article)");
    else if (!IT_GENDERS.includes(w.gender)) err(where, `bad gender "${w.gender}" (allowed: ${IT_GENDERS.join(", ")})`);
    // The article follows the first sound (src/lib/articles.js): il/lo/l' for masculine, la/l' for feminine.
    if (IT_GENDERS.includes(w.gender) && !articleFits(w.lemma, w.gender, w.genus)) {
      err(where, `article "${w.gender}" does not fit "${w.lemma}" (first sound decides: il / lo / l')`);
    }
    if (w.gender === "l'" && !IT_GENUS.includes(w.genus)) err(where, `gender "l'" needs genus "m" or "f" (the article hides the gender)`);
    if (!w.plural && !w.pluralOnly && !w.example) warnings.push(`${where}: no plural (uncountable?)`);
  }
  if (w.genus != null) {
    if (!IT_GENUS.includes(w.genus)) err(where, `bad genus "${w.genus}" (only "m" or "f")`);
    else if (w.pos !== "noun") err(where, "genus only on nouns");
  }
  if (w.pluralGender != null) {
    if (!IT_PLURAL_GENDER.includes(w.pluralGender)) err(where, `bad pluralGender "${w.pluralGender}" (only "f": l'uovo → le uova)`);
    else if (w.pos !== "noun") err(where, "pluralGender only on nouns");
    else if (!nonEmpty(w.plural)) err(where, "pluralGender without plural");
  }
  if (w.pos === "verb") {
    if (w.aux != null && !IT_AUX.includes(w.aux)) err(where, `bad aux "${w.aux}" (allowed: ${IT_AUX.join(", ")})`);
    if (w.forms && w.forms.length !== 3) {
      err(where, `forms must be [io presente, participio passato, io imperfetto], got ${w.forms.length}`);
    }
  } else if (w.aux != null) err(where, "aux only on verbs");
  if (w.separable != null) err(where, "separable is not used for Italian (omit the key)");
  if (w.case != null) err(where, "case is not used for Italian (omit the key)");
  if (w.fem != null) {
    if (w.pos !== "adj" && w.pos !== "noun") err(where, "fem (feminine singular) only on adjectives and mobile-gender nouns");
    else if (!nonEmpty(w.fem)) err(where, "empty fem — omit the field instead");
  }
}

// A word still holding the Spanish course's content (variety es-ES or none).
function checkSpanish(w, where) {
  if (w.pos === "noun") {
    if (!w.gender && !w.pluralOnly) err(where, "noun without gender (set pluralOnly for Eltern/Ferien)");
    if (w.gender && !ES_GENDERS.includes(w.gender)) err(where, `bad gender "${w.gender}"`);
    if (!w.plural && !w.pluralOnly && !w.example) warnings.push(`${where}: no plural (uncountable?)`);
  }
  if (w.pos === "verb") {
    if (w.aux && !ES_AUX.includes(w.aux)) err(where, `bad aux "${w.aux}"`);
    if (w.forms && w.forms.length !== 3) {
      err(where, `forms must be [3rd sg, past / Präteritum, past participle / Partizip II], got ${w.forms.length}`);
    }
    if (w.separable && w.forms && !w.forms[0].includes(" ")) {
      err(where, `separable verb but present form "${w.forms[0]}" has no split prefix`);
    }
  }
  if (w.genus != null) {
    if (!ES_GENUS.includes(w.genus)) err(where, `bad genus "${w.genus}" — only "f" (el agua, el aula)`);
    else if (w.pos !== "noun" || w.gender !== "el") err(where, `genus "f" only on nouns with gender "el" (stressed a-/ha-)`);
  }
  if (w.fem != null) {
    if (w.pos !== "adj") err(where, "fem (feminine form) only on adjectives");
    else if (typeof w.fem !== "string" || !w.fem.trim()) err(where, "empty fem — omit the field instead");
  }
  if (w.pluralGender != null) err(where, "pluralGender is an Italian field (set variety it-IT)");
}

for (const level of LEVELS) {
  const file = path.join(ROOT, "src/content/lexicon", `${level}.json`);
  const data = JSON.parse(readFileSync(file, "utf8"));

  if (data.level !== level.toUpperCase()) {
    err(`${level}.json`, `level field is "${data.level}", expected "${level.toUpperCase()}"`);
  }

  for (const unit of data.units ?? []) {
    if (!unit.id) err(`${level}.json`, "a unit has no id");
    if (seenUnits.has(unit.id)) err(`${level}.json`, `duplicate unit id "${unit.id}"`);
    seenUnits.add(unit.id);
    if (!unit.title) err(unit.id, "unit has no title");

    for (const t of unit.topics ?? []) {
      if (!TOPICS.has(t)) err(unit.id, `unknown topic "${t}" — add it to the §4 taxonomy or fix the typo`);
    }

    for (const w of unit.words ?? []) {
      total++;
      const id = w.id ?? slugify(w.lemma ?? "");
      const where = `${unit.id}/${w.lemma ?? "?"}`;

      if (!w.lemma) err(where, "missing lemma");
      if (!w.pos) err(where, "missing pos");
      else if (!POS.includes(w.pos)) err(where, `unknown pos "${w.pos}"`);

      // Progress keys are ids, so a collision would silently merge two words' histories.
      if (seenIds.has(id)) err(where, `duplicate id "${id}" — also in ${seenIds.get(id)}`);
      else seenIds.set(id, where);

      const italian = VARIETIES.includes(w.variety);
      if (italian) checkItalian(w, where);
      else checkSpanish(w, where);
      // variety / regional (§1.5): es419 is an error on an Italian word; check-variety.mjs checks coverage.
      for (const p of varietyProblems(w, { noun: w.pos === "noun" })) err(where, p);
      if (w.case && !CASES.includes(w.case)) err(where, `bad case "${w.case}"`);
      if (w.en == null) err(where, "missing English gloss");
      if (w.example != null && !w.example.trim()) err(where, "empty example");

      // --- sourced fields (scripts/fetch-wiktionary.mjs) ---
      if (w.ipa) sourced.ipa++;
      if (w.grammar_anchor) sourced.anchor++;
      if (w.ipa != null) {
        if (typeof w.ipa !== "string" || !w.ipa.trim()) err(where, "empty ipa — omit the field instead");
        if (!w.ipaSource) err(where, "ipa without ipaSource — a sourced field must record its provenance");
        else if (!IPA_SOURCES.includes(w.ipaSource)) err(where, `unknown ipaSource "${w.ipaSource}"`);
      } else {
        if (w.ipaSource) err(where, "ipaSource without ipa");
        if (w.ipaVariants) err(where, "ipaVariants without ipa");
      }
      if (w.ipaVariants != null) {
        if (!Array.isArray(w.ipaVariants) || !w.ipaVariants.length) {
          err(where, "ipaVariants must be a non-empty array — omit the field when there is one pronunciation");
        } else {
          if (w.ipaVariants.some((v) => typeof v !== "string" || !v.trim())) err(where, "ipaVariants contains an empty entry");
          if (w.ipaVariants.includes(w.ipa)) err(where, "ipaVariants repeats ipa");
        }
      }

      if (w.grammar_anchor != null) {
        if (!GRAMMAR_IDS.has(w.grammar_anchor)) {
          err(where, `grammar_anchor "${w.grammar_anchor}" is not a topic in src/data/grammatik/`);
        }
      }
    }
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

console.log(`\n${total} words, ${seenUnits.size} units, ${errors.length} errors, ${warnings.length} warnings`);
console.log(`${sourced.ipa} with sourced ipa (${total - sourced.ipa} still unsourced), ${sourced.anchor} with grammar_anchor`);
if (errors.length) process.exit(1);
