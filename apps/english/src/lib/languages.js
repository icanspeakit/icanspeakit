// Every learner language the site knows, in one place (SPRACHEN-NESTED-TIERED-PROMPT.md).
//
// Before this file the list was copied about twelve times — the UI menu, the flashcard tabs,
// the help texts, the legal pages, the worksheets, the Berufe and Fahrschul decks, the live
// quiz, the printable games — and adding one language meant finding all of them. Now each of
// those derives its list from here with `langsFor(surface)` and keeps its old export name.
//
// A language is offered on a surface only when its entry names that surface. `status` says
// whether the translation there is a machine draft or has been read by a native speaker.
//
// Plain ESM with a JSON import, like lexicon.js: the pages, the client bundles and the Node
// scripts (scripts/check-*.mjs, scripts/lang-coverage.mjs) all load it.
// Coverage per language and surface (% of the base keys), written by `pnpm lang:coverage`
// once a second language exists. englishacademy ships English only, so it starts empty.
const coverage = { langs: {} };

/** The surfaces a language can be offered on, and what each one is:
 *  ui            public/i18n/<code>.json — the interface and the header menu
 *  cards         lexicon glosses (src/content/lexicon/i18n/) — flashcards, live quiz, games
 *  help          help texts under the German (src/data/uebersetzungen/*, textHelp.js, grammarUi.js)
 *  legal         translations of the legal pages (src/data/uebersetzungen/rechtliches.json)
 *  sheets        meanings on the Wortschatz worksheets (src/lib/arbeitsblatt/wortschatz.js)
 *  berufe        the profession decks (src/data/berufe/*.json) */
export const SURFACES = ["ui", "cards", "help", "legal", "sheets", "berufe"];

/** Minimum coverage (% of the German keys or words) a language needs before `langsFor` offers
 *  it on a surface. Surfaces without a number here are gated elsewhere:
 *  cards / sheets  per deck by langsIn() in lexicon.js — a tab only when every card has it;
 *  help            per block: a help text only renders in a language that block carries.
 *                  The spec's page rule (100 % of a page's blocks) is reported by
 *                  `pnpm lang:coverage` but not yet enforced. */
export const GATES = { ui: 98 };

// A language added from here on starts as { status: "draft" } until a native speaker has
// read it. A flashcard language can carry `fetch: true` to load its glosses on demand.
const reviewed = { status: "reviewed" };

/* Order is the order lists come out in: English first, Ukrainian before Russian (Ukrainian
   learners are not sent to Russian). A surface whose list has always had a different order
   carries `order` on its entry, so nothing a learner sees moves in this tier.
   `region` is the group in „Alle Sprachen": europa · nahost · afrika · asien · amerika.
   `word` is "language" in that language: the header button's name adds it for a visitor
   whose browser asks for that language, so the button is findable without reading German.
   `script` (ISO 15924) picks the Noto face src/lib/scriptFonts.js loads once the language
   is chosen; `fontFamily` is the stack for text in it ("DA Script" is that face).
   `hreflang` and `urlPrefix` (SPRACHEN-REICHWEITE-TIERED-PROMPT.md): the languages whose
   entry pages get their own URL, /<urlPrefix>/…, server-rendered in that language and linked
   with <link rel="alternate" hreflang>. The others are switched in the browser only. */
export const LANGUAGE_REGISTRY = [
  {
    code: "en", native: "English", de: "Englisch", en: "English", word: "Language",
    dir: "ltr", script: "Latn", region: "europa", fontFamily: null,
    // The source language: the interface and every text exist in English first.
    surfaces: { ui: { ...reviewed, order: 0 }, cards: reviewed, help: reviewed, legal: { ...reviewed, order: 0 }, sheets: reviewed, berufe: reviewed },
  },
  // German UI (ui-lang-de): public/i18n/de.json carries every key of en.json (machine draft, du-form,
  // not yet read by a native speaker; scripts/check-i18n-keys.mjs enforces it). The header picker
  // stays hidden until coverage passes GATES.ui; /english/de/ entry pages are built and linked (hreflang).
  {
    code: "de", native: "Deutsch", de: "Deutsch", en: "German", word: "Sprache",
    dir: "ltr", script: "Latn", region: "europa", fontFamily: null,
    hreflang: "de", urlPrefix: "de",
    surfaces: { ui: { status: "draft" } },
  },
  // To add a language: copy the entry above, set code/native/dir/script (and fontFamily for
  // non-Latin scripts, hreflang/urlPrefix for its own entry-page URLs), start every surface
  // as { status: "draft" }, and add public/i18n/<code>.json. RTL (dir: "rtl") is already
  // handled site-wide by postcss-rtlcss (astro.config.mjs) and src/lib/i18n.js.
];

/** The base language: every key and every text exists in it first. */
export const BASE = "en";

const BY_CODE = new Map(LANGUAGE_REGISTRY.map((l) => [l.code, l]));

/** The registry entry for a code, or undefined. */
export const languageOf = (code) => BY_CODE.get(code);

/** Right-to-left? Unknown codes are left-to-right. */
export const isRtl = (code) => BY_CODE.get(code)?.dir === "rtl";

/** Coverage in % of one language on one surface, from docs/lang-coverage.json, or null when
 *  `pnpm lang:coverage` has not measured it. */
export const coverageOf = (code, surface) => coverage.langs?.[code]?.[surface] ?? null;

function passesGate(lang, surface) {
  const gate = GATES[surface];
  if (gate == null || lang.code === BASE) return true;
  const pct = coverageOf(lang.code, surface);
  return pct != null && pct >= gate;
}

/** The registry entries offered on `surface`, in that surface's order. `gated: false` also
 *  returns the ones registered there but below the gate (for the checks that measure them).
 *  `fetched: true` also returns the ones marked `fetch` (flashcard glosses loaded on demand,
 *  see src/lib/glossen.js). Off by default: everything that inlines glosses — the live quiz,
 *  the printable games, the worksheets, the downloads — keeps the languages it had. */
export function languagesFor(surface, { gated = true, fetched = false } = {}) {
  if (!SURFACES.includes(surface)) throw new Error(`languages.js: unknown surface "${surface}"`);
  return LANGUAGE_REGISTRY.map((l, i) => ({ l, i }))
    .filter(({ l }) => l.surfaces[surface] && (fetched || !l.surfaces[surface].fetch) && (!gated || passesGate(l, surface)))
    .sort((a, b) => (a.l.surfaces[surface].order ?? a.i) - (b.l.surfaces[surface].order ?? b.i))
    .map(({ l }) => l);
}

/** The languages with their own entry-page URLs (hreflang + urlPrefix), in registry order. */
export const entryLanguages = () => LANGUAGE_REGISTRY.filter((l) => l.urlPrefix);

/** The `lang` attribute for a code: its hreflang where it has one (pt → pt-BR), else the code. */
export const htmlLang = (code) => BY_CODE.get(code)?.hreflang ?? code;

/** The codes offered on `surface`, in that surface's order: `langsFor("cards")`. */
export const langsFor = (surface, opts) => languagesFor(surface, opts).map((l) => l.code);
