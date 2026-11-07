// pnpm validate:partner — runs the partner-sheet validator (src/lib/partneruebungen/schema.js)
// over every src/data/partneruebungen/*.json and prints what is wrong, by file and field.
//
//   node scripts/validate-partner.mjs [file.json …]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSheet } from "../src/lib/partneruebungen/schema.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "src/data/partneruebungen");
const files = process.argv.slice(2).length
  ? process.argv.slice(2).map((f) => path.resolve(f))
  : existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => path.join(DIR, f)) : [];

let bad = 0;
for (const file of files) {
  const name = path.basename(file, ".json");
  let spec;
  try { spec = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`✗ ${name}: kein gültiges JSON (${e.message})`); bad++; continue; }
  const errs = validateSheet(spec);
  if (spec.id !== name) errs.push(`id: „${spec.id}“ passt nicht zum Dateinamen`);
  if (errs.length) { bad++; console.error(`✗ ${name}\n    ${errs.join("\n    ")}`); }
  else console.log(`✓ ${name}${spec.quelle.geprueft ? "" : "  (Entwurf)"}`);
}
if (!files.length) console.log("validate-partner: keine Blätter gefunden.");
if (bad) { console.error(`\n${bad} von ${files.length} Blättern ungültig.`); process.exit(1); }
console.log(`\nvalidate-partner ok: ${files.length} Blätter.`);
