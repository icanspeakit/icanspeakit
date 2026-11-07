// Validates the Einfach-lernen path (src/data/einfach-pfad.json) against the site's data.
//   node scripts/check-einfach-pfad.mjs          check; exits non-zero on any problem
//   node scripts/check-einfach-pfad.mjs --sign   also add the "@checksum" to refs that have
//                                               none yet (authoring a new unit). It never
//                                               touches a ref whose checksum is wrong —
//                                               that means the source changed, and a
//                                               person has to look at it.
// The same checks run when /step-by-step is built (src/pages/step-by-step.astro), so a broken path
// cannot ship even if nobody runs this.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePath, checkUnits, lookup } from "../src/lib/einfach-content.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));

const grammatik = {};
for (const f of readdirSync(path.join(ROOT, "src/data/grammatik"))) {
  if (f.endsWith(".json")) grammatik[f.replace(/\.json$/, "")] = read(`src/data/grammatik/${f}`);
}
const sources = {
  lexicon: { a1: read("src/content/lexicon/a1.json"), a2: read("src/content/lexicon/a2.json"), b1: read("src/content/lexicon/b1.json") },
  grammatik,
  akkusativ: read("src/data/akkusativ.json"),
  kultur: read("src/data/kultur.json"),
  kulturInsider: read("src/data/kultur-insider.json"),
  hoeren: read("src/data/hoeren.json"),
  aussprache: read("src/data/aussprache-check.json"),
  redemittel: read("src/data/redemittel.json"),
};

const PFAD = "src/data/einfach-pfad.json";
const pfad = read(PFAD);

if (process.argv.includes("--sign")) {
  // On the raw text, so the file keeps its hand-made layout (one task per line).
  let signed = 0;
  const raw = readFileSync(path.join(ROOT, PFAD), "utf8").replace(/"((?:gram|kultur|hoeren|redemittel):[^"@]+)"/g, (whole, ref) => {
    try {
      lookup(ref + "@", sources);
    } catch (e) {
      const m = /checksum is (\w+)/.exec(e.message);
      if (m) {
        signed++;
        return `"${ref}@${m[1]}"`;
      }
      console.error(`  cannot sign ${ref}: ${e.message}`);
    }
    return whole;
  });
  writeFileSync(path.join(ROOT, PFAD), raw);
  Object.assign(pfad, JSON.parse(raw));
  console.log(`signed ${signed} ref(s)`);
}

const { units, outline, errors } = resolvePath(pfad, sources);
errors.push(...checkUnits(units));
// No 404s: every clip a task plays has to be on disk.
for (const u of units) {
  for (const t of u.tasks) {
    // A word card has no play button (einfach-view.js), so only tasks that play need the file.
    if (t.audio && t.type !== "wort" && !existsSync(path.join(ROOT, "public", t.audio))) errors.push(`${u.id}: ${t.ref} plays ${t.audio}, which does not exist`);
  }
}

if (errors.length) {
  console.error(`einfach-pfad: ${errors.length} problem(s)`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
const neu = units.filter((u) => u.postcard?.source === "neu").map((u) => `${u.id} (${u.postcard.city})`);
console.log(`einfach-pfad ok: ${units.length} units, ${units.reduce((n, u) => n + u.tasks.length, 0)} tasks, ${outline.length} draft outline(s).`);
if (neu.length) console.log(`  postcards still marked "neu" (to check): ${neu.join(", ")}`);
