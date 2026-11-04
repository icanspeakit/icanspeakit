// Fails the build when a Wortgeschichte entry breaks the rules (WORTGESCHICHTE-TIERED-PROMPT.md,
// Tier 0): lemma not in the lexicon · no sources · no checkedBy/checkedAt · two entries on
// the same publishOn · and the shape checks in validate() (src/lib/wortgeschichteCore.js).
//
//   node scripts/validate-wortgeschichte.mjs        (also runs in `prebuild`)
//
// Warnings (drafts, missing audio) are printed and do not fail.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { validate, berlinDate, bufferAhead, DAILY_BUFFER } from "../src/lib/wortgeschichteCore.js";

const DIR = "src/content/wortgeschichte";
const files = (await readdir(DIR).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
const items = [];
for (const f of files) {
  try {
    items.push({ file: f, entry: JSON.parse(await readFile(path.join(DIR, f), "utf8")) });
  } catch (err) {
    items.push({ file: f, entry: null });
    console.error(`${f}: invalid JSON — ${err.message}`);
    process.exitCode = 1;
  }
}

const { errors, warnings } = validate(items);
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

const today = berlinDate();
const ahead = bufferAhead(items.map((i) => i.entry).filter(Boolean), today);
console.log(
  `wortgeschichte: ${items.length} entries, ${errors.length} errors, ${warnings.length} warnings · ` +
    `${ahead}/${DAILY_BUFFER} checked entries scheduled ahead (daily mail needs ${DAILY_BUFFER})`
);
if (errors.length) process.exit(1);
