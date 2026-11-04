// „Vokabeln vom Foto“, step 3 of 3: parsed entries → saved words, lexicon first.
//
// A word our lexicon knows takes everything from there (article, plural, part of speech, and
// at play time audio, picture and every translation via lexId), so it looks exactly like our
// own cards and counts as checked. A word it doesn't know keeps what the page said and is
// marked checked: false („nicht geprüft“) until the teacher confirms it.
//
// Saved word shape (docs/vokabel-foto-tier0-v1.md §3):
//   { lemma, pos?, article?, plural?, translation?, lexId?, checked, reflexive?, separable? }
import { all } from "../lexicon.js";

/** Lowercase, umlauts spelled out, no punctuation: "Fühlen" and "fuehlen" meet. */
export function key(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  INDEX = new Map();
  for (const w of all()) {
    const k = key(w.lemma);
    if (!INDEX.has(k)) INDEX.set(k, []);
    INDEX.get(k).push(w);
  }
  return INDEX;
}

/** The lexicon entry for a parsed entry, or null. Article and part of speech break ties. */
export function lookup(entry) {
  const found = index().get(key(entry.lemma)) ?? [];
  if (!found.length) return null;
  const score = (w) =>
    (w.lemma === entry.lemma ? 4 : 0) +
    (entry.article && w.gender === entry.article ? 2 : 0) +
    (entry.pos && w.pos === entry.pos ? 1 : 0);
  return [...found].sort((a, b) => score(b) - score(a))[0];
}

export const MAX_WORDS = 80;

/** Entries from one or more photos → the deduplicated word list the review table shows. */
export function toWords(entries) {
  const seen = new Set();
  const words = [];
  for (const e of entries) {
    const lex = lookup(e);
    const word = lex
      ? {
          lemma: lex.lemma,
          pos: lex.pos,
          ...(lex.gender ? { article: lex.gender } : {}),
          ...(lex.plural ? { plural: lex.plural } : {}),
          ...(e.translation ? { translation: e.translation } : {}),
          lexId: lex.id,
          checked: true,
          // The page's „sich“ counts too: „sich waschen“ is listed under waschen.
          ...(lex.reflexive || e.reflexive ? { reflexive: true } : {}),
          ...(lex.separable ? { separable: true } : {}),
        }
      : {
          lemma: e.lemma,
          ...(e.pos ? { pos: e.pos } : {}),
          ...(e.article ? { article: e.article } : {}),
          ...(e.plural ? { plural: e.plural } : {}),
          ...(e.translation ? { translation: e.translation } : {}),
          checked: false,
          ...(e.reflexive ? { reflexive: true } : {}),
          ...(e.separable ? { separable: true } : {}),
        };
    const id = `${word.article ?? ""} ${key(word.lemma)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    words.push(word);
    if (words.length >= MAX_WORDS) break;
  }
  return words;
}

/** Share of words found in the lexicon, 0–1 (for the test script and the saved-set event). */
export const matchRate = (words) => (words.length ? words.filter((w) => w.lexId).length / words.length : 0);
