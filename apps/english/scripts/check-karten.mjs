// Check of the Wortschatz flashcards as the learner sees them: every card the lexicon makes
// (lexicon.js → toVokabelCards), grouped by Lernset, looking for what shows up as a gap or a
// mishap on the card rather than as a data error.
//
//   node scripts/check-karten.mjs              every card, A1–B2
//   … --level A1                               one level (repeatable)
//   … --only satz-versteckt                    one kind of finding (repeatable)
//   … --all                                    every finding, not only the first 15 of each kind
//
// Kinds:
//   satz-versteckt   the example sentence does not contain the word in a form exampleGap.js
//                    finds, so before the flip the strip under the card shows no sentence
//   kein-satz        the card has no example sentence at all
//   keine-erklaerung the „Auf Deutsch“ tab has no German explanation (shows „fehlt“)
//   kein-artikel     a noun without article or plural on the card
//   audio-fehlt      the card's word audio points at a file that is not on disk
//
// Deterministic, no network; exits 1 on any finding outside the --only filter.
import fs from "node:fs";
import { all, toVokabelCards } from "../src/lib/lexicon.js";
import { gapTokens } from "../src/lib/exampleGap.js";

const argv = process.argv.slice(2);
const opt = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []));
const LEVELS = opt("--level").length ? opt("--level").map((l) => l.toUpperCase()) : ["A1", "A2", "B1", "B2"];
const ONLY = new Set(opt("--only"));
const ALL = argv.includes("--all");

const rows = all().filter((e) => LEVELS.includes(e.level));
const cards = toVokabelCards(rows);
const unitOf = new Map(rows.map((e) => [e.id, e.unit ?? e.level]));
// Phrases („Könnten Sie mir bitte helfen?“) are their own example.
const isPhrase = (c) => /\s/.test(c.front) && /[.?!…]$/.test(c.front);

const findings = new Map();
const add = (kind, card, detail = "") => {
  if (ONLY.size && !ONLY.has(kind)) return;
  if (!findings.has(kind)) findings.set(kind, []);
  findings.get(kind).push(`${unitOf.get(card.id)} · ${card.gender ? card.gender + " " : ""}${card.front}${detail ? ` — ${detail}` : ""}`);
};

for (const c of cards) {
  if (!c.example) { if (!isPhrase(c)) add("kein-satz", c); }
  else if (!gapTokens(c).hit) add("satz-versteckt", c, c.example);
  if (!c.translations?.de) add("keine-erklaerung", c);
  if (c.pos === "noun" && !c.pluralOnly && (!c.gender || c.plural === undefined)) add("kein-artikel", c);
  if (c.audioSrc && !fs.existsSync(`public${c.audioSrc}`)) add("audio-fehlt", c, c.audioSrc);
}

let total = 0;
for (const [kind, list] of findings) {
  total += list.length;
  console.log(`\n${kind}: ${list.length}`);
  for (const line of ALL ? list : list.slice(0, 15)) console.log(`  ${line}`);
  if (!ALL && list.length > 15) console.log(`  … und ${list.length - 15} weitere (--all)`);
}
console.log(`\n${cards.length} Karten geprüft (${LEVELS.join(", ")}), ${total} Befunde.`);
process.exit(total ? 1 : 0);
