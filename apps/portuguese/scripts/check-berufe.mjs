// Checks the profession decks before every build (package.json → prebuild):
//
//   node scripts/check-berufe.mjs
//
// The rules live in validate() in src/lib/berufeCore.js: schema, ids unique across every
// berufe file + the lexicon + the Fahrschul-Wortschatz, id prefix matches the file, every
// `ref` resolves, no lemma defined twice, nouns have gender, verbs have forms, `reviewed`
// present, and every profession of v1 has its file. Reports every problem at once, then exits 1
// if there was any. Warnings (a word without morphSource) are printed and do not fail.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate, entryCount, ownWords } from "../src/lib/berufeCore.js";
import { businessDeck } from "../src/lib/businessSpanish.js";
import { slugify } from "../src/lib/audioSlug.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));

const lexicon = new Map();
for (const level of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
  let data;
  try { data = read(`src/content/lexicon/${level}.json`); } catch { continue; }
  for (const unit of data.units ?? []) for (const w of unit.words ?? []) lexicon.set(w.id ?? slugify(w.lemma), w.lemma);
}

const DIR = "src/data/berufe";
const files = [];
for (const file of readdirSync(path.join(ROOT, DIR)).filter((f) => f.endsWith(".json")).sort()) {
  try { files.push({ file, deck: read(`${DIR}/${file}`) }); }
  catch (err) { files.push({ file, deck: null }); console.error(`  ERROR ${file}: invalid JSON — ${err.message}`); process.exitCode = 1; }
}

// The DGT driving deck: the same format, under its own slug (content-plan §4.4).
const DGT_DIR = "src/data/dgt";
if (existsSync(path.join(ROOT, DGT_DIR))) {
  for (const file of readdirSync(path.join(ROOT, DGT_DIR)).filter((f) => f.endsWith(".json")).sort()) {
    try { files.push({ file: `dgt/${file}`, slug: "dgt", deck: read(`${DGT_DIR}/${file}`) }); }
    catch (err) { files.push({ file: `dgt/${file}`, slug: "dgt", deck: null }); console.error(`  ERROR dgt/${file}: invalid JSON — ${err.message}`); process.exitCode = 1; }
  }
}

// Business Spanish: each unit's words are one group of a single deck (content-plan §4.3).
const BUSINESS_DIR = "src/data/business-spanish";
if (existsSync(path.join(ROOT, BUSINESS_DIR))) {
  try {
    const units = readdirSync(path.join(ROOT, BUSINESS_DIR)).filter((f) => f.endsWith(".json")).map((f) => read(`${BUSINESS_DIR}/${f}`));
    files.push({ file: "business-spanish", slug: "business", deck: businessDeck(units) });
  } catch (err) { console.error(`  ERROR business-spanish: invalid JSON — ${err.message}`); process.exitCode = 1; }
}

const { errors, warnings } = validate(files, { lexicon });
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

const summary = files.map(({ file, deck }) => `${file.replace(".json", "")} ${deck ? `${entryCount(deck)} (${ownWords(deck).length} eigene)` : "?"}`);
console.log(`berufe: ${files.length} decks, ${errors.length} errors, ${warnings.length} warnings · ${summary.join(" · ")}`);
if (errors.length) process.exit(1);
