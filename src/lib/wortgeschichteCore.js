// Wortgeschichte — the word of the day (WORTGESCHICHTE-TIERED-PROMPT.md).
//
// Pure functions over the entries in src/content/wortgeschichte/*.json, loadable from Astro
// pages, API routes and plain `node` scripts alike (scripts/validate-wortgeschichte.mjs).
// The Vite-only loader that finds the files is src/lib/wortgeschichte.js.
//
// The governing rule is docs/lexicon-enrichment-v1.md §1: source it, don't generate it.
// An entry carries its own `sources` and who compared it against them (`checkedBy`,
// `checkedAt`). What it does NOT carry is the word's grammar: gender, plural and verb forms
// are read from the lexicon here, so there is one source of truth for them.
//
// Two gates decide whether a learner sees an entry:
//   status    "entwurf" until Edgar has read it, then "geprueft". A model can compare an
//             entry with its sources, it cannot approve it: the validator refuses
//             "geprueft" while checkedBy still names Claude.
//   publishOn the day (Europe/Berlin) it becomes the word of the day. Production builds only
//             emit entries whose day has come; a daily deploy hook publishes the next one.
// In `astro dev`, or with WORTGESCHICHTE_VORSCHAU=1 at build time, both gates are lifted
// so entries can be reviewed on their real page (noindex, with a draft banner).
import { all as lexicon, spokenForm, TRANSLATION_LANGS } from "./lexicon.js";
import { slugify } from "./audioSlug.js";
import synonyme from "../data/synonyme.json" with { type: "json" };

export const STATUS = { DRAFT: "entwurf", REVIEWED: "geprueft" };
export const CERTAINTY = ["sicher", "wahrscheinlich", "umstritten", "unklar"];
/** How a word in another language is linked to the German one. „parallele" is not in the
 *  prompt's list of three: same picture, different word (window ‚Wind-Auge' / окно ‚Auge'),
 *  marked as unrelated so it cannot be read as a cognate. */
export const KINDS = ["verwandt", "entlehnt", "zufall", "parallele"];

/** Language names as the German page prints them. Content, not chrome: they stay German. */
export const LANG_NAMES = {
  de: "Deutsch", en: "Englisch", nl: "Niederländisch", sv: "Schwedisch", da: "Dänisch",
  got: "Gotisch", ang: "Altenglisch", non: "Altnordisch", ru: "Russisch", uk: "Ukrainisch",
  cs: "Tschechisch", pl: "Polnisch", ar: "Arabisch", tr: "Türkisch", fa: "Persisch",
  la: "Latein", grc: "Altgriechisch", el: "Griechisch", fr: "Französisch", it: "Italienisch",
  es: "Spanisch", pt: "Portugiesisch", ro: "Rumänisch", sa: "Sanskrit", hi: "Hindi",
  lt: "Litauisch", lv: "Lettisch", hu: "Ungarisch", fi: "Finnisch", he: "Hebräisch", ku: "Kurdisch",
  is: "Isländisch", no: "Norwegisch", ga: "Irisch", cy: "Walisisch", bg: "Bulgarisch", sr: "Serbisch",
  hr: "Kroatisch", sk: "Slowakisch", goh: "Althochdeutsch", ja: "Japanisch", zh: "Chinesisch",
};
export const RTL = new Set(["ar", "fa", "he"]);

/** The daily-mail launch rule from the prompt's content budget: daily only once this many
 *  checked entries are scheduled ahead (a two-month buffer). */
export const DAILY_BUFFER = 60;

/** Today's date in Berlin as YYYY-MM-DD — the calendar the word changes on. */
export function berlinDate(at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** "2. November 2026" */
export function formatDe(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

/** Add days to an ISO date. */
export function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The lexicon row for a lemma (first match; `lexiconId` on the entry picks a homonym). */
export function lexiconRow(entry) {
  const rows = lexicon();
  if (entry.lexiconId) return rows.find((r) => r.id === entry.lexiconId) ?? null;
  return rows.find((r) => r.lemma === entry.lemma) ?? null;
}
const rowByLemma = (lemma) => lexicon().find((r) => r.lemma === lemma) ?? null;

/** URL slug: the lexicon id (Arbeit → arbeit, Straße → strasse). */
export const slugOf = (entry) => lexiconRow(entry)?.id ?? slugify(entry.lemma);
export const hrefOf = (entry) => `/wissen/wortgeschichte/${slugOf(entry)}`;

/** "die Arbeit" / "arbeiten" */
export function headword(entry) {
  const row = lexiconRow(entry);
  return row ? spokenForm(row) : entry.lemma;
}

/**
 * The inflections, read from the lexicon — never stored on the entry.
 * @returns {{ lemma: string, parts: string[] }[]} one line per word (the entry, then formsAlso)
 */
export function formsOf(entry) {
  const lines = [];
  for (const lemma of [entry.lemma, ...(entry.formsAlso ?? [])]) {
    const row = lemma === entry.lemma ? lexiconRow(entry) : rowByLemma(lemma);
    if (!row) continue;
    const parts = [];
    if (row.pos === "noun") {
      const g = row.gender ?? (row.pluralOnly ? "die" : null);
      parts.push(g ? `${g} ${row.lemma}` : row.lemma);
      if (row.plural) parts.push(`die ${row.plural}`);
      else if (!row.pluralOnly) parts.push("kein Plural");
    } else if (row.pos === "verb" && Array.isArray(row.forms) && row.forms.length === 3) {
      const [third, praet, partizip] = row.forms;
      parts.push(row.lemma, third, praet, `${row.aux === "sein" ? "ist" : "hat"} ${partizip}`);
    } else if (row.comparative) {
      parts.push(row.lemma, row.comparative, row.superlative);
    } else {
      parts.push(row.lemma);
    }
    lines.push({ lemma: row.lemma, parts });
  }
  return lines;
}

/** Audio file for the headword, when the lexicon has one. */
export function audioOf(entry) {
  const row = lexiconRow(entry);
  return row?.audio ? `/audio/wortschatz/${row.audio}.mp3` : null;
}

/** Translations of the headword from the lexicon (en inline, ar/uk/ru/tr sidecars). */
export function glossesOf(entry) {
  const row = lexiconRow(entry);
  if (!row) return {};
  return Object.fromEntries(TRANSLATION_LANGS.filter((l) => row[l]).map((l) => [l, row[l]]));
}

const bare = (w) => String(w).replace(/^(der|die|das)\s+/i, "");

/**
 * Synonyms: the entry's own list first (it may carry a note: „umgangssprachlich"), then
 * any group in src/data/synonyme.json that holds the word.
 * @returns {{ word: string, note?: string }[]}
 */
export function synonymsOf(entry) {
  const out = [...(entry.synonyms ?? [])].map((s) => (typeof s === "string" ? { word: s } : s));
  const seen = new Set([entry.lemma, ...out.map((s) => bare(s.word))]);
  for (const g of synonyme.groups ?? []) {
    if (!g.words.some((w) => bare(w) === entry.lemma)) continue;
    for (const w of g.words) {
      const b = bare(w);
      if (!seen.has(b)) { seen.add(b); out.push({ word: b }); }
    }
  }
  return out;
}

/**
 * The word family inside the lexicon. Listed on the entry when chosen by hand; otherwise
 * computed: lexicon compounds that begin or end with the lemma, easiest first, at most `max`.
 * @returns {{ lemma: string, level: string, word: string }[]}
 */
export function familyOf(entry, max = 6) {
  const rows = lexicon();
  const own = lexiconRow(entry);
  let picked;
  if (Array.isArray(entry.relatives?.family)) {
    // Chosen by hand — an empty list means "no family", not "compute one".
    picked = entry.relatives.family.map(rowByLemma).filter(Boolean);
  } else {
    // Compounds only: the lemma as first or last part, with at least three letters of
    // another word beside it. A bare substring match gave Reis → Preis, Reise; Bus → robust.
    const stem = entry.lemma.toLowerCase();
    const isPart = (w) =>
      (w.startsWith(stem) && w.length - stem.length >= 3) || (w.endsWith(stem) && w.length - stem.length >= 3);
    picked = rows
      .filter((r) => r !== own && isPart(r.lemma.toLowerCase()))
      .sort((a, b) => a.level.localeCompare(b.level) || a.lemma.length - b.lemma.length)
      .slice(0, max);
  }
  return picked.map((r) => ({ lemma: r.lemma, level: r.level, word: spokenForm(r) }));
}

/** Is the entry visible to learners on `today`? `preview` lifts both gates. */
export function isPublished(entry, today, preview = false) {
  if (preview) return true;
  return entry.status === STATUS.REVIEWED && entry.publishOn <= today;
}

/** Entries sorted by publishOn. */
export const byDate = (entries) => [...entries].sort((a, b) => a.publishOn.localeCompare(b.publishOn));

/**
 * The word of the day: the newest published entry whose day has come. In preview, the
 * first scheduled one if none has come yet, so the page can be reviewed before launch.
 */
export function wordOfTheDay(entries, today, preview = false) {
  const sorted = byDate(entries);
  const due = sorted.filter((e) => isPublished(e, today, false));
  if (due.length) return due[due.length - 1];
  if (!preview) return null;
  return sorted.filter((e) => e.publishOn <= today).pop() ?? sorted[0] ?? null;
}

/** The entries the archive emits a page for. */
export const archive = (entries, today, preview = false) =>
  byDate(entries).filter((e) => isPublished(e, today, preview));

/** Published entries of the seven days ending on `today` — the Sunday digest. */
export function week(entries, today) {
  const from = addDays(today, -6);
  return byDate(entries).filter((e) => isPublished(e, today) && e.publishOn >= from);
}

/** How many checked entries are scheduled from today on — the daily-mail buffer. */
export const bufferAhead = (entries, today) =>
  entries.filter((e) => e.status === STATUS.REVIEWED && e.publishOn >= today).length;

/** Words in a text (for the 80–140 word rule on `history`). */
export const wordCount = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;

/**
 * Everything the build refuses (scripts/validate-wortgeschichte.mjs).
 * @param {{ file: string, entry: any }[]} items
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validate(items) {
  const errors = [];
  const warnings = [];
  const days = new Map();
  const slugs = new Map();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  for (const { file, entry: e } of items) {
    const at = (msg) => errors.push(`${file}: ${msg}`);
    const warn = (msg) => warnings.push(`${file}: ${msg}`);
    if (!e || typeof e !== "object") { at("not a JSON object"); continue; }
    if (!e.lemma) at("no lemma");
    else if (!lexiconRow(e)) at(`lemma „${e.lemma}" is not in the lexicon`);
    if (!Array.isArray(e.sources) || e.sources.length === 0) at("no sources — every entry needs at least one");
    else for (const s of e.sources) if (!s?.work || !s?.entry) at("a source needs `work` and `entry`");
    if (!e.checkedBy) at("no checkedBy");
    if (!e.checkedAt || !iso.test(e.checkedAt)) at("no checkedAt (YYYY-MM-DD)");
    if (!Object.values(STATUS).includes(e.status)) at(`status must be "entwurf" or "geprueft"`);
    if (e.status === STATUS.REVIEWED && /claude/i.test(e.checkedBy ?? "")) {
      at(`status "geprueft" needs a human in checkedBy — a model cannot approve its own entry`);
    }
    if (!e.publishOn || !iso.test(e.publishOn)) at("no publishOn (YYYY-MM-DD)");
    else if (days.has(e.publishOn)) at(`publishOn ${e.publishOn} is also used by ${days.get(e.publishOn)}`);
    else days.set(e.publishOn, file);
    if (e.lemma) {
      const slug = slugOf(e);
      if (slugs.has(slug)) at(`same URL /wissen/wortgeschichte/${slug} as ${slugs.get(slug)}`);
      slugs.set(slug, file);
    }
    if (!e.root?.form || !e.root?.lang) at("root needs form and lang");
    if (e.root && !CERTAINTY.includes(e.root.certainty)) at(`root.certainty must be one of ${CERTAINTY.join(", ")}`);
    const n = wordCount(e.history);
    if (!e.history) at("no history");
    else if (n < 80 || n > 140) at(`history has ${n} words — the rule is 80–140`);
    for (const lemma of e.relatives?.family ?? []) if (!rowByLemma(lemma)) at(`family word „${lemma}" is not in the lexicon`);
    for (const lemma of e.formsAlso ?? []) if (!rowByLemma(lemma)) at(`formsAlso „${lemma}" is not in the lexicon`);
    for (const c of e.relatives?.cognates ?? []) {
      if (!c.lang || !c.form) at("a cognate needs lang and form");
      if (c.kind && !KINDS.includes(c.kind)) at(`cognate ${c.form}: kind must be one of ${KINDS.join(", ")}`);
      if (c.lang && !LANG_NAMES[c.lang]) at(`cognate ${c.form}: unknown language code ${c.lang}`);
      if (c.certainty && !CERTAINTY.includes(c.certainty)) at(`cognate ${c.form}: certainty must be one of ${CERTAINTY.join(", ")}`);
    }
    for (const b of e.elsewhere ?? []) {
      if (!b.lang || !b.word || !b.text) at("an elsewhere block needs lang, word and text");
      if (!KINDS.includes(b.kind)) at(`elsewhere ${b.word}: kind must be one of ${KINDS.join(", ")}`);
      if (b.lang && !LANG_NAMES[b.lang]) at(`elsewhere ${b.word}: unknown language code ${b.lang}`);
      if (b.certainty && !CERTAINTY.includes(b.certainty)) at(`elsewhere ${b.word}: certainty must be one of ${CERTAINTY.join(", ")}`);
    }
    if (e.status === STATUS.DRAFT) warn(`draft (status "entwurf") — not published until Edgar sets "geprueft"`);
    if (!audioOf(e)) warn("no audio file in the lexicon — the page shows no speaker button");
  }
  return { errors, warnings };
}

/** Split prose into sentences. Not after a number („im 8. Jahrhundert“) and only before a
 *  capital or an opening quote, so ordinals and abbreviations stay inside their sentence. */
export const sentences = (text) => String(text ?? "").split(/(?<=[^\d\s][.!?])\s+(?=[A-ZÄÖÜ„‚"])/);
