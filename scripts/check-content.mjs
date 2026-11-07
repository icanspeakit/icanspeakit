// The content validators that gate the build (prebuild) and `pnpm check:content`.
//
// In the fork they were opt-in while the data was German placeholder content; the `cleanup`
// run (2026-11-02, content-plan §7) put them back into prebuild once every module was English.
// Each one runs in its own process, in this order; the first that fails stops the build.
//
// Not in the gate, and why:
//   check-karten      card-quality report, thousands of findings, still tuned to German cards
//   check-downloads   fetches every external link (network)
//   check-inhalte     a QA report (docs/inhalte-qa/), not a gate; writes files
// Run those by hand: pnpm check:karten, check:downloads, check:inhalte.
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
