// The content validators that gate the build (prebuild) and `pnpm check:content`.
//
// In the fork they were opt-in while the data was placeholder content; the Spanish course's
// `cleanup` run (2026-11-07, content-plan §1.6 and §7) confirmed that none is paused and added
// the ones that had never been in the gate. Each one runs in its own process, in this order; the
// first that fails stops the build.
//
// Not in the gate, and why:
//   check-karten       card-quality report, thousands of findings, still tuned to German cards
//   check-downloads    fetches every external link (network)
//   check-inhalte      a QA report (docs/inhalte-qa/), not a gate; writes files
//   check-grammatik-ui counts help-language gaps of an old language list; only a baseline
//   check-jsonld       reads dist/, so it can't run before a build; a report for now
//   check-lemmas, check-free  lookup tools for lexicon imports, they take arguments
// Paused in part: check-conjugation-trainer's verb checks (drill groups, presets and limits against
//   verbtabellen.json, every generated question, the judge cases), turned off by `conjugation-data`
//   because the verb tables are French and the trainer's drills still name Spanish verbs;
//   `conjugation-trainer` turns them back on (TRAINER_VERBS_FRENCH in that script).
//   (check-verbtabellen's comparison with the reference list, paused by `grammar-structure`, was
//   turned back on by `conjugation-data`.)
// Run those by hand: pnpm check:karten, check:downloads, check:inhalte, check:grammatik-ui, seo:jsonld.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CHECKS = [
  "check-einfach-pfad.mjs",
  "check-pruefungen.mjs",
  "check-berufe.mjs",
  "check-business-spanish.mjs",
  "validate-wortgeschichte.mjs",
  "check-premium.mjs",
  "check-pruefungsplan.mjs",
  "check-lindenau.mjs",
  "check-knigge.mjs",
  "check-redewendungen.mjs",
  "validate-lexicon.mjs",
  "check-variety.mjs",
  "check-verbtabellen.mjs",
  "check-conjugation-trainer.mjs",
  "check-aussprache.mjs",
  "check-satzmelodie.mjs",
  "check-sprachfallen.mjs",
  "check-arbeitsblatt.mjs",
  "validate-partner.mjs",
  "check-pillen.mjs",
  "check-grammatik-start.mjs",
  "check-extranjeria.mjs",
  "validate-i18n.mjs",
  "check-reichweite.mjs",
  "check-i18n-luecken.mjs",
  "check-links.mjs",
];

for (const file of CHECKS) {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", file)], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\ncheck:content — ${file} failed (exit ${r.status ?? r.signal}). Fix the data or run it alone: node scripts/${file}`);
    process.exit(r.status || 1);
  }
}
console.log(`check:content ok — ${CHECKS.length} validators`);
