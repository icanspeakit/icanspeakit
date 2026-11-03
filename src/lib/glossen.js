// Flashcard glosses that are fetched, not inlined (SPRACHEN-NESTED-TIERED-PROMPT.md, Tier 3).
//
// The deck pages put every card's translations into the HTML (VokabelTrainer.astro, fc-data).
// That is right for the five languages that were there first, and wrong for twelve more: an
// A1 deck would carry seventeen glosses per word for a learner who reads one. So a language
// whose cards entry in the registry says `fetch: true` stays out of the page, and its
// glosses are one static file, /vocabulary/glosses/<code>.json (src/pages/wortschatz/glossen/),
// `{ "<word id>": "<gloss>" }`, which the trainer loads the first time the language is
// chosen (wortschatz-app.js, ensureGlosses).
//
// Build time only (node:fs): the deck page asks which fetched languages cover every card,
// so a tab is never offered that would show "Übersetzung folgt" — the langsIn() rule.
import fs from "node:fs";
import path from "node:path";
import { languagesFor } from "./languages.js";

/** The flashcard languages that are fetched on demand, in registry order. */
export const FETCHED_GLOSS_LANGS = languagesFor("cards", { fetched: true })
  .filter((l) => l.surfaces.cards.fetch)
  .map((l) => l.code);

const cache = new Map();

/** The sidecar src/content/lexicon/i18n/<code>.json as an object (empty when missing). */
export function glossTable(code) {
  if (!cache.has(code)) {
    const file = path.join(process.cwd(), "src", "content", "lexicon", "i18n", `${code}.json`);
    cache.set(code, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {});
  }
  return cache.get(code);
}

/** The fetched languages in which every one of these cards (lexicon ids) has a gloss. */
export function fetchedLangsFor(cards) {
  if (!cards.length) return [];
  return FETCHED_GLOSS_LANGS.filter((code) => {
    const table = glossTable(code);
    return cards.every((c) => c.id && table[c.id]);
  });
}
