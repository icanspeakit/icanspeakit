// Sources gender, plural and verb forms for one profession deck from de.wiktionary.org, by the
// same parsing rules as the lexicon (scripts/lib/wiktionary.mjs, docs/lexicon-enrichment-v1.md).
//
//   node scripts/berufe-morph.mjs gastronomie           # audit: report gaps and disagreements
//   node scripts/berufe-morph.mjs gastronomie --fill    # write sourced values into null fields
//
// Like fetch-wiktionary.mjs it never overwrites a value a human wrote: `--fill` writes only
// fields that are explicitly `null` (gender, plural, forms, aux), and stamps morphSource
// ("wiktionary", or "wiktionary-compound-head" when the compound's last element had to stand
// in). A noun or verb with no page and no head is reported — swap the word, don't hand-write it.
// Refs are skipped: their morphology lives in their source.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wikitextFor, resolveViaHead, germanSection, uebersicht, param, plurals, toGender } from "./lib/wiktionary.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
const FILL = process.argv.includes("--fill");
if (!slug || slug.startsWith("--")) {
  console.error("usage: node scripts/berufe-morph.mjs <beruf> [--fill]");
  process.exit(2);
}
const file = path.join(ROOT, "src/data/berufe", `${slug}.json`);
const deck = JSON.parse(readFileSync(file, "utf8"));
const words = deck.groups.flatMap((g) => g.words).filter((w) => !w.ref && (w.pos === "noun" || w.pos === "verb"));
const awaiting = (w, f) => f in w && w[f] === null;

const pages = await wikitextFor([...new Set(words.map((w) => w.lemma))]);
const report = [];
let filled = 0;

for (const w of words) {
  const section = germanSection(pages.get(w.lemma) ?? "");
  const kind = w.pos === "noun" ? "Substantiv" : "Verb";
  const block = section ? uebersicht(section, kind) : null;

  if (!block) {
    if (w.pos === "noun" && !w.pluralOnly) {
      const head = await resolveViaHead(w.lemma);
      if (head) {
        const vals = { gender: head.gender, plural: head.plural };
        for (const [f, v] of Object.entries(vals)) {
          if (awaiting(w, f) && FILL) { w[f] = v; filled++; }
          else if (awaiting(w, f)) report.push(`${w.lemma}: ${f} gap → ${v} (über Kopf „${head.head}“)`);
          else if (w[f] !== v) report.push(`${w.lemma}: ${f} ist „${w[f]}“, Kopf „${head.head}“ sagt „${v}“`);
        }
        if (FILL) w.morphSource = "wiktionary-compound-head";
        report.push(`${w.lemma}: keine eigene Seite — vom Kopf „${head.head}“ abgeleitet, bitte prüfen`);
        continue;
      }
    }
    report.push(`${w.lemma}: keine Seite und kein Kopf — Wort tauschen`);
    continue;
  }

  const sourced =
    w.pos === "noun"
      ? { gender: w.pluralOnly ? undefined : toGender(param(block, "Genus") ?? param(block, "Genus 1")), plural: plurals(block)[0] ?? null }
      : {
          forms: [param(block, "Präsens_er, sie, es"), param(block, "Präteritum_ich"), param(block, "Partizip II")],
          aux: param(block, "Hilfsverb") ?? param(block, "Hilfsverb 1"),
        };
  if (sourced.forms && !sourced.forms.every(Boolean)) {
    report.push(`${w.lemma}: Verbformen auf Wiktionary unvollständig (${sourced.forms.map((v) => v ?? "?").join(", ")})`);
    delete sourced.forms;
  }
  for (const [f, v] of Object.entries(sourced)) {
    if (v === undefined || (v === null && f !== "plural")) continue;
    const same = JSON.stringify(w[f]) === JSON.stringify(v);
    if (awaiting(w, f)) {
      if (FILL) { w[f] = v; filled++; } else report.push(`${w.lemma}: ${f} gap → ${JSON.stringify(v)}`);
    } else if (!same) report.push(`${w.lemma}: ${f} ist ${JSON.stringify(w[f])}, Wiktionary sagt ${JSON.stringify(v)}`);
  }
  if (FILL && !w.morphSource) w.morphSource = "wiktionary";
}

if (FILL) writeFileSync(file, JSON.stringify(deck, null, 2) + "\n");
console.log(`${slug}: ${words.length} nouns/verbs · ${filled} filled${FILL ? "" : " (audit only, --fill writes)"} · ${report.length} notes`);
for (const r of report) console.log(`  ${r}`);
