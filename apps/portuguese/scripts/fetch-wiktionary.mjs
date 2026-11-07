// Attaches curated IPA to src/content/lexicon/*.json and audits the stored morphology
// against de.wiktionary.org.
//
//   node scripts/fetch-wiktionary.mjs                    # all levels
//   node scripts/fetch-wiktionary.mjs a1                 # one level
//   node scripts/fetch-wiktionary.mjs a1 --unit a1-01    # one unit (start here)
//   node scripts/fetch-wiktionary.mjs a1 --dry           # fetch + audit, write nothing
//
// Same shape as attach-ranks.mjs: plain Node, no dependencies, downloads once and caches, then
// merges in place. Rationale, the rejected espeak-ng alternative and every parser rule below:
// docs/lexicon-enrichment-v1.md.
//
// WRITES  ipa, ipaVariants, ipaSource   (only these — see below)
// AUDITS  gender, plural, comparative, superlative   -> docs/lexicon-audit-v1.md
//
// It deliberately does NOT overwrite morphology. A disagreement between this repo and Wiktionary
// is often a deliberate pedagogical simplification (one plural where Wiktionary lists two), so
// the script reports and a human decides. `ipa` is different: the repo has no prior value to
// defend, so sourcing it outright is safe.
//
// Requires network access to de.wiktionary.org. Reachable locally and from Claude Code; blocked
// by the egress proxy in the Cowork cloud sandbox, so run this on the workstation.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { wikitextFor, resolveViaHead, germanSection, extractIpa, uebersicht, param, plurals, toGender, bare } from "./lib/wiktionary.mjs";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ALL_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");

// --fill writes sourced morphology into fields that are null or absent. It never touches a field
// that already holds a value — filling a gap is not the same as overruling a human, and only the
// first is safe to automate. Generated rows arrive with gender/plural/forms explicitly null for
// exactly this pass to find; curated A1/A2 rows have values, so they stay audit-only either way.
const FILL = argv.includes("--fill");

// An explicit `null` means "awaiting sourcing" — generated rows arrive that way on purpose.
// An ABSENT field means a curator left it out, which is often deliberate (Alter has no plural in
// the "age" sense even though Wiktionary lists one). --fill writes the first and never the second.
// Proven necessary: the naive `== null` check filled Alter's plural on curated A1 data.
const awaiting = (w, field) => field in w && w[field] === null;
const unitFilter = argv.includes("--unit") ? argv[argv.indexOf("--unit") + 1] : null;
const levels = argv.filter((a) => ALL_LEVELS.includes(a.toLowerCase())).map((a) => a.toLowerCase());
const targetLevels = levels.length ? levels : ALL_LEVELS;

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const audit = [];
const stats = { words: 0, ipa: 0, noGerman: 0, noIpa: 0, checked: 0, mismatch: 0, filled: 0, gaps: 0, viaHead: 0, unresolved: 0 };

for (const level of targetLevels) {
  const file = path.join(ROOT, "src/content/lexicon", `${level}.json`);
  if (!existsSync(file)) {
    console.warn(`skip ${level}: no such file`);
    continue;
  }
  const data = JSON.parse(readFileSync(file, "utf8"));
  const units = (data.units ?? []).filter((u) => !unitFilter || u.id === unitFilter);
  if (!units.length) {
    console.log(`${level}: no units match${unitFilter ? ` --unit ${unitFilter}` : ""}`);
    continue;
  }

  const titles = [...new Set(units.flatMap((u) => (u.words ?? []).map((w) => w.lemma)))];
  console.log(`${level}: ${titles.length} lemmas across ${units.length} unit(s)`);
  const pages = await wikitextFor(titles);

  for (const unit of units) {
    for (const w of unit.words ?? []) {
      stats.words++;
      const where = `${unit.id}/${w.lemma}`;
      const section = germanSection(pages.get(w.lemma) ?? "");

      if (!section) {
        stats.noGerman++;
        // A missing page is a coverage gap for compounds, not proof of invention. Try the head.
        // pluralOnly nouns (Heizkosten, Eltern) have no gender by design — the validator exempts
        // them, and filling one in is a regression, not a gap being closed.
        if (w.pos === "noun" && !w.pluralOnly && (awaiting(w, "gender") || awaiting(w, "plural"))) {
          const viaHead = await resolveViaHead(w.lemma);
          if (viaHead) {
            stats.viaHead++;
            if (FILL) {
              if (awaiting(w, "gender") && viaHead.gender) w.gender = viaHead.gender;
              if (awaiting(w, "plural")) w.plural = viaHead.plural; // may stay null — honest
              w.morphSource = "wiktionary-compound-head";
              stats.filled++;
            }
            audit.push({
              where,
              field: "gender/plural",
              repo: FILL ? `${viaHead.gender ?? "?"} / ${viaHead.plural ?? "(none)"}` : "(null)",
              wiktionary: `inherited from head "${viaHead.head}"`,
              note: FILL ? "INFERRED from the compound head, not sourced directly — verify" : "head resolvable — re-run with --fill",
            });
            continue;
          }
          audit.push({ where, field: "—", repo: "", wiktionary: "", note: "no page AND no resolvable head — verify this word exists" });
          stats.unresolved++;
          continue;
        }
        // A VERB with no page is as doubtful as a noun with no page — it just fails quieter,
        // because the validator does not require `forms` the way it requires `gender`.
        // `instandsetzen` shipped that way in b2-tranche-4 and was caught by hand, not by this
        // number: no page (the standard spelling is the separated *instand setzen*), so `forms`
        // stayed null and the Verbformen trainer would never have seen the row. There is no head
        // to inherit verb forms from, so it counts straight as unresolved.
        //
        // ADJECTIVES are deliberately NOT counted here, though the first version of this check
        // did count them. Measured across the whole lexicon it flagged exactly four —
        // berufsbegleitend, eigenverantwortlich, überparteilich, verkehrsberuhigt — every one of
        // them ordinary current German that de.wiktionary simply has no page for. An adjective
        // with no page loses only `ipa` and a comparative that most of these do not have anyway;
        // nothing required goes missing. That is a Wiktionary coverage gap, the same kind the
        // compound-head fallback exists for, not a reason to doubt the word.
        if (w.pos === "verb") {
          audit.push({ where, field: "—", repo: "", wiktionary: "", note: "no page for this verb — verify the lemma and its spelling" });
          stats.unresolved++;
          continue;
        }
        audit.push({ where, field: "—", repo: "", wiktionary: "", note: "no German section on page (or page missing)" });
        continue;
      }

      // --- IPA: sourced outright, since the repo holds no prior value ---
      const ipa = extractIpa(section);
      if (ipa.length) {
        w.ipa = ipa[0];
        if (ipa.length > 1) w.ipaVariants = ipa.slice(1);
        else delete w.ipaVariants;
        w.ipaSource = "wiktionary";
        stats.ipa++;
      } else {
        stats.noIpa++;
        audit.push({ where, field: "ipa", repo: "", wiktionary: "", note: "German section has no {{Lautschrift}}" });
      }

      // --- Morphology: audited, never overwritten ---
      const kind = w.pos === "noun" ? "Substantiv" : w.pos === "verb" ? "Verb" : w.pos === "adj" ? "Adjektiv" : null;
      if (!kind) continue;
      const block = uebersicht(section, kind);
      if (!block) {
        audit.push({ where, field: "—", repo: "", wiktionary: "", note: `no {{Deutsch ${kind} Übersicht}} block` });
        continue;
      }

      const cmp = (field, repoVal, wikiVal) => {
        if (wikiVal == null) return;
        stats.checked++;
        if (bare(repoVal) !== bare(wikiVal)) {
          stats.mismatch++;
          audit.push({ where, field, repo: repoVal ?? "(none)", wiktionary: wikiVal, note: "" });
        }
      };

      // Fill a gap, or audit a value. `null` and absent both count as a gap; anything else is a
      // human's answer and only gets compared.
      const fillOrCmp = (field, wikiVal, transform = (v) => v) => {
        if (wikiVal == null) return;
        if (w[field] == null) {
          if (!awaiting(w, field)) return; // absent by a curator's choice — leave it alone
          if (FILL) {
            w[field] = transform(wikiVal);
            stats.filled++;
          } else {
            stats.gaps++;
            audit.push({ where, field, repo: "(null)", wiktionary: String(wikiVal), note: "gap — re-run with --fill to write it" });
          }
          return;
        }
        cmp(field, w[field], wikiVal);
      };

      if (w.pos === "noun") {
        if (!w.pluralOnly) fillOrCmp("gender", toGender(param(block, "Genus") ?? param(block, "Genus 1")));

        const pl = plurals(block);
        if (pl.length && (w.plural != null || awaiting(w, "plural"))) {
          if (w.plural == null) {
            // Several valid plurals is normal (Mädchen/Mädchens). Take the first, which is
            // Wiktionary's primary, and record that a choice was made.
            if (FILL) {
              w.plural = pl[0];
              stats.filled++;
              if (pl.length > 1) audit.push({ where, field: "plural", repo: pl[0], wiktionary: pl.join(" / "), note: "filled with the first of several valid plurals" });
            } else {
              stats.gaps++;
              audit.push({ where, field: "plural", repo: "(null)", wiktionary: pl.join(" / "), note: "gap — re-run with --fill to write it" });
            }
          } else if (!pl.some((p) => bare(p) === bare(w.plural))) {
            stats.checked++;
            stats.mismatch++;
            audit.push({ where, field: "plural", repo: w.plural, wiktionary: pl.join(" / "), note: pl.length > 1 ? "several valid plurals" : "" });
          } else {
            stats.checked++;
            if (pl.length > 1) audit.push({ where, field: "plural", repo: w.plural, wiktionary: pl.join(" / "), note: "repo picks one of several valid plurals — fine, noted" });
          }
        }
      }

      if (w.pos === "adj") {
        fillOrCmp("comparative", param(block, "Komparativ"));
        // The repo stores the superlative with the `am ` prefix; Wiktionary does not.
        fillOrCmp("superlative", param(block, "Superlativ"), (v) => (/^am\s/.test(v) ? v : `am ${v}`));
      }

      // Verb forms. Parameter names confirmed 2026-09-17 against the live blocks for heißen,
      // kommen, wohnen, sprechen, sein and haben — all six expose exactly these three, which map
      // onto this repo's forms = [3rd sg present, Präteritum, Partizip II].
      if (w.pos === "verb") {
        const wiki = [
          param(block, "Präsens_er, sie, es"),
          param(block, "Präteritum_ich"),
          param(block, "Partizip II"),
        ];
        if (w.forms == null && !awaiting(w, "forms")) {
          // absent by a curator's choice (a verb they chose not to give forms for) — leave it
        } else if (w.forms == null) {
          // forms is all-or-nothing: the validator requires exactly 3, so a partial source is a
          // gap to report, never a two-element array written into the data.
          if (wiki.every((v) => v)) {
            if (FILL) {
              w.forms = wiki;
              stats.filled++;
            } else {
              stats.gaps++;
              audit.push({ where, field: "forms", repo: "(null)", wiktionary: wiki.join(", "), note: "gap — re-run with --fill to write it" });
            }
          } else {
            stats.gaps++;
            audit.push({ where, field: "forms", repo: "(null)", wiktionary: wiki.map((v) => v ?? "?").join(", "), note: "INCOMPLETE on Wiktionary — needs a human" });
          }
        } else {
          const labels = ["forms[0] 3.Sg", "forms[1] Präteritum", "forms[2] Partizip II"];
          wiki.forEach((v, i) => cmp(labels[i], w.forms[i], v));
        }
        const aux = param(block, "Hilfsverb");
        if (aux && !["haben", "sein"].includes(aux)) {
          audit.push({ where, field: "aux", repo: w.aux ?? "(null)", wiktionary: aux, note: "unexpected Hilfsverb value — not written" });
        } else {
          fillOrCmp("aux", aux);
        }
      }
    }
  }

  if (!DRY) {
    writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`${level}: written`);
  }
}

// ---------------------------------------------------------------------------
// Audit report
// ---------------------------------------------------------------------------

const lines = [
  `# Lexicon audit — stored morphology vs de.wiktionary.org`,
  ``,
  `Generated by \`scripts/fetch-wiktionary.mjs\` on ${new Date().toISOString().slice(0, 10)}.`,
  `Scope: ${targetLevels.join(", ")}${unitFilter ? ` — unit ${unitFilter}` : ""}.`,
  ``,
  `**This is a report, not a change.** Nothing in \`src/content/lexicon/\` was overwritten except`,
  `\`ipa\`/\`ipaVariants\`/\`ipaSource\`. A disagreement is not automatically an error — the repo may`,
  `be simplifying deliberately. Decide per row.`,
  ``,
  `| words | ipa attached | no German section | no IPA | morphology checks | disagreements | ${FILL ? "fields filled" : "gaps"} |`,
  `| ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
  `| ${stats.words} | ${stats.ipa} | ${stats.noGerman} | ${stats.noIpa} | ${stats.checked} | ${stats.mismatch} | ${FILL ? stats.filled : stats.gaps} |`,
  ``,
  `> **The quality signal for generated rows is \`unresolved\`, not \`no German section\`.**`,
  `> German Wiktionary covers long administrative compounds poorly, so a missing page usually means`,
  `> thin coverage, not an invented word. ${stats.noGerman} of ${stats.words} lemmas had no page;`,
  `> ${stats.viaHead} of those resolved through their compound head; **${stats.unresolved} resolved`,
  `> neither way and are the rows worth doubting** (${stats.words ? Math.round((stats.unresolved / stats.words) * 100) : 0}%).`,
  ``,
  `> Rows marked \`morphSource: "wiktionary-compound-head"\` are INFERRED from the head's gender and`,
  `> plural pattern (die Erlaubnis ⇒ die Niederlassungserlaubnis). Sound German morphology, but an`,
  `> inference — spot-check them.`,
  ``,
];

if (audit.length) {
  lines.push(`| where | field | repo | wiktionary | note |`, `| --- | --- | --- | --- | --- |`);
  for (const r of audit) {
    lines.push(`| ${r.where} | ${r.field} | ${r.repo} | ${r.wiktionary} | ${r.note} |`);
  }
} else {
  lines.push(`No disagreements and nothing missing.`);
}

const reportPath = path.join(ROOT, "docs", "lexicon-audit-v1.md");
writeFileSync(reportPath, lines.join("\n") + "\n", "utf8");

console.log(
  `\n${stats.words} words · ${stats.ipa} IPA attached · ${stats.noIpa} without IPA · ` +
    `${stats.noGerman} without a German section · ${stats.checked} morphology checks, ${stats.mismatch} disagreements` +
    (FILL ? ` · ${stats.filled} fields filled` : ` · ${stats.gaps} gaps (use --fill)`)
);
console.log(
  `${stats.noGerman} without a page: ${stats.viaHead} resolved via compound head, ${stats.unresolved} unresolved (these are the doubtful ones)`
);
console.log(`report: docs/lexicon-audit-v1.md${DRY ? "  (--dry: lexicon not written)" : ""}  [HEAD_FALLBACK_V4]`);
