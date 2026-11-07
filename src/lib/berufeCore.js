// Spanish for work: the sector decks (docs/content-plan.md §5.12).
//
// Plain ESM with no Vite imports, so the build check (scripts/check-berufe.mjs) and the pages
// share one set of rules. The pages load the files through src/lib/berufeWortschatz.js.
//
// One file per profession, src/data/berufe/<slug>.json, so one session per profession can fill
// its deck without touching anyone else's file. A word is either defined in the file
// ({ id, lemma, pos, … }) or a pointer to a word that already exists elsewhere ({ ref }):
// the lexicon (lexicon id), the DGT deck or another sector (both bv-…).
// Ids are learners' progress keys, so they are derived once and never renamed.
import { slugify } from "./audioSlug.js";
import { langsFor } from "./languages.js";
import { varietyProblems } from "./variety.js";

/** The ten sectors, in hub order: where newcomers to Spain most often start work first. The slugs
 *  are history (progress keys): kita is cleaning and domestic work, elektro-technik is farm work.
 *  `emoji` is the OpenMoji on the hub card. */
export const BERUFE = [
  { slug: "pflege", emoji: "🩺" },
  { slug: "gastronomie", emoji: "🍽️" },
  { slug: "kita", emoji: "🧹" },
  { slug: "elektro-technik", emoji: "🍅" },
  { slug: "bau-handwerk", emoji: "🔨" },
  { slug: "einzelhandel", emoji: "🛒" },
  { slug: "lager-logistik", emoji: "📦" },
  { slug: "kraftfahrer", emoji: "🚚" },
  { slug: "hotel", emoji: "🏨" },
  { slug: "buero", emoji: "💼" },
];
export const SLUGS = BERUFE.map((b) => b.slug);

/** The DGT driving deck (src/data/dgt/vocabulario.json, content-plan §4.4): same format and word
 *  ids (bv-dgt-…), so sector decks can point at its words, but its own page, not a sector. */
export const DGT = { slug: "dgt", emoji: "🚗" };

/** Translation languages of a deck (registry surface "berufe"); LANGS adds "de", the German
 *  tab: an own word's deHint holds its German translation (docs/content-plan.md §5.12). */
export const TRANSLATIONS = langsFor("berufe");
export const LANGS = ["de", ...TRANSLATIONS];
export const POS = ["noun", "verb", "adj", "adverb", "phrase"];
/** The article as the learner says it: el/la, el/la for common-gender person nouns (content-plan §1.4). */
export const GENDERS = ["el", "la", "el/la"];

/** `bv-gastronomie-schneidebrett` */
export const idFor = (slug, lemma) => `bv-${slug}-${slugify(lemma)}`;

/** Where a ref points: the lexicon or a profession deck. */
export const refKind = (ref) => (ref.startsWith("bv-") ? "berufe" : "lexicon");

/** Every word a deck defines itself (not the refs), with its group. */
export const ownWords = (deck) =>
  (deck.groups ?? []).flatMap((g) => (g.words ?? []).filter((w) => !w.ref).map((w) => ({ ...w, group: g.id })));

/** Entries in a deck, refs included: what the hub counts and the trainer shows. */
export const entryCount = (deck) => (deck.groups ?? []).reduce((n, g) => n + (g.words ?? []).length, 0);

/**
 * Every rule of the data format, in one place. `files` is [{ file, deck, slug? }]; `slug` is set
 * for a deck that is not a sector and so has no file named after it (DGT). `known` holds the ids
 * that exist outside the berufe files: { lexicon: Map<id, lemma> }.
 * Returns { errors, warnings }, never throws.
 */
export function validate(files, known) {
  const errors = [];
  const warnings = [];
  const berufeIds = new Map(); // id → file
  const lemmas = new Map(); // slugify(lemma) → "file id" — one definition across every source

  for (const [id, lemma] of known.lexicon) lemmas.set(slugify(lemma), `lexicon ${id}`);

  // Pass 1: own words, so a ref to a word defined later in another file still resolves.
  for (const { file, deck, slug: ownSlug } of files) {
    const at = (msg) => errors.push(`${file}: ${msg}`);
    const slug = ownSlug ?? file.replace(/\.json$/, "");
    if (!deck || typeof deck !== "object") { at("not a JSON object"); continue; }
    if (deck.beruf !== slug) at(`"beruf" must be "${slug}"${ownSlug ? "" : " (the file name)"}`);
    if (!ownSlug && !SLUGS.includes(slug)) at(`"${slug}" is not one of the professions in BERUFE (src/lib/berufeCore.js)`);
    if (!deck.title) at("no title");
    if (typeof deck.reviewed !== "boolean") at(`"reviewed" must be true or false`);
    if (!deck.intro) at("no intro");
    for (const k of ["jobs", "tipps"])
      if (deck[k] !== undefined && !(Array.isArray(deck[k]) && deck[k].every((s) => typeof s === "string" && s.trim())))
        at(`"${k}" must be a list of non-empty strings`);
    if (!Array.isArray(deck.groups)) { at("groups must be an array"); continue; }
    const groupIds = new Set();
    for (const g of deck.groups) {
      if (!g.id || !/^[a-z0-9-]+$/.test(g.id)) at(`group id „${g.id}" must be lowercase a–z, 0–9, -`);
      if (groupIds.has(g.id)) at(`group id „${g.id}" twice`);
      groupIds.add(g.id);
      if (!g.title) at(`group ${g.id}: no title`);
      if (!Array.isArray(g.words)) { at(`group ${g.id}: words must be an array`); continue; }
      for (const w of g.words) {
        if (w.ref) {
          // A ref carries at most its own job-specific deHint and example (see berufeWortschatz.js),
          // and `en` where the deck means another sense than the lexicon's (el volante: the wheel,
          // not the GP's referral slip).
          const extra = Object.keys(w).filter((k) => !["ref", "deHint", "example", "en"].includes(k));
          if (extra.length) at(`${g.id}: ref „${w.ref}" may only add deHint/example/en, not ${extra.join(", ")}`);
          continue;
        }
        const where = `${g.id}/${w.lemma ?? w.id ?? "?"}`;
        if (!w.lemma) { at(`${where}: no lemma`); continue; }
        const want = idFor(slug, w.lemma);
        if (w.id !== want) at(`${where}: id must be "${want}" (bv-<beruf>-<slugify(lemma)>)`);
        if (known.lexicon.has(w.id)) at(`${where}: id ${w.id} already exists outside the berufe files`);
        if (berufeIds.has(w.id)) at(`${where}: id ${w.id} also in ${berufeIds.get(w.id)}`);
        berufeIds.set(w.id, file);
        const key = slugify(w.lemma);
        if (lemmas.has(key)) at(`${where}: „${w.lemma}" is already defined (${lemmas.get(key)}) — use { "ref": "<id>" }`);
        else lemmas.set(key, `${file} ${w.id}`);
        if (!POS.includes(w.pos)) at(`${where}: pos must be one of ${POS.join(", ")}`);
        if (w.pos === "noun" && !GENDERS.includes(w.gender)) at(`${where}: a noun needs gender ${GENDERS.join("/")}`);
        if (w.genus != null && !(w.genus === "f" && w.pos === "noun" && w.gender === "el")) at(`${where}: genus "f" only on nouns with gender "el" (el agua)`);
        if (w.fem != null && !(w.pos === "adj" && typeof w.fem === "string" && w.fem.trim())) at(`${where}: fem must be the feminine form of an adjective`);
        // variety / es419 (§1.5). A ref inherits both from the word it points to (rule above).
        for (const p of varietyProblems(w, { noun: w.pos === "noun" })) at(`${where}: ${p}`);
        if (w.pos === "noun" && w.plural === undefined && !w.pluralOnly) at(`${where}: a noun needs "plural" (null when there is none)`);
        if (w.pos === "verb" && !(Array.isArray(w.forms) && w.forms.length === 3 && w.forms.every(Boolean))) at(`${where}: a verb needs forms [yo present, él indefinido, participio]`);
        if (!w.example) at(`${where}: no example sentence`);
        if (!w.deHint) at(`${where}: no deHint`);
        for (const l of TRANSLATIONS) if (!w.translations?.[l]) at(`${where}: no ${l} translation`);
        if (["noun", "verb"].includes(w.pos) && !w.morphSource) warnings.push(`${file} ${where}: no morphSource — gender/plural/forms not marked as sourced`);
      }
    }
  }

  // Pass 2: refs.
  for (const { file, deck } of files) {
    for (const g of deck?.groups ?? []) {
      const seen = new Set();
      for (const w of g.words ?? []) {
        const key = w.ref ?? w.id;
        if (seen.has(key)) errors.push(`${file}: ${g.id}: ${key} twice in one group`);
        seen.add(key);
        if (!w.ref) continue;
        const kind = refKind(w.ref);
        const ok = kind === "berufe" ? berufeIds.has(w.ref) : known.lexicon.has(w.ref);
        if (!ok) errors.push(`${file}: ${g.id}: ref „${w.ref}" does not resolve (${kind})`);
      }
    }
  }

  // Every profession of v1 has its file, so the parallel sessions only fill data.
  const have = new Set(files.filter((f) => !f.slug).map((f) => f.file.replace(/\.json$/, "")));
  for (const s of SLUGS) if (!have.has(s)) errors.push(`src/data/berufe/${s}.json is missing`);

  return { errors, warnings };
}
