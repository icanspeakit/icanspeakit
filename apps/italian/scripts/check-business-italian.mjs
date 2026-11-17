// Checks the Business Italian units before every build (scripts/check-content.mjs):
//
//   node scripts/check-business-italian.mjs
//
// The rules live in validateUnits() in src/lib/businessItalian.js: unit schema, register, variety,
// exercises with one gap and the answer among the options, every unit of UNIT_IDS present. The
// words are deck entries and are checked by check-berufe.mjs with the other decks. Reports every
// problem at once, then exits 1 if there was any.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateUnits } from "../src/lib/businessItalian.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "src/data/business-italian");

const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort().map((file) => {
  try { return { file, unit: JSON.parse(readFileSync(path.join(DIR, file), "utf8")) }; }
  catch (err) { console.error(`  ERROR ${file}: invalid JSON — ${err.message}`); return { file, unit: null }; }
});

const errors = validateUnits(files);
for (const e of errors) console.error(`  ERROR ${e}`);
const total = (k) => files.reduce((n, { unit }) => n + (unit?.[k]?.length ?? 0), 0);
console.log(`business-italian: ${files.length} units, ${total("phrases")} phrases, ${total("models")} model texts, ${total("words")} words, ${total("exercises")} exercises, ${errors.length} errors`);
if (errors.length) process.exit(1);
