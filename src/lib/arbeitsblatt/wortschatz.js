// A vocabulary worksheet for one Lernset (one lexicon unit, ~25 words), built at build
// time from src/content/lexicon via src/lib/lexicon.js — the same words the Wortschatz
// trainer uses, so the sheet and the site never disagree.
//
// Three parts, each with its own answer key:
//   A  Wort ↔ Bedeutung — up to 10 words against their meanings, shuffled by a seed.
//   B  der, die oder das? — up to 10 nouns with the article left out.
//   C  Lückensätze — the lexicon's example sentences with the word blanked (up to 6).
//
// Meanings exist in en/ar/ru/tr for (nearly) every word. The sheet carries all four and
// the page shows the one the teacher picks, so one static page serves every class.
// Ukrainian is not offered: the lexicon has no uk glosses yet (the few in
// src/data/uebersetzungen/woerter-uk.json cover the grammar tables, not whole Lernsets).
import { select, units } from "../lexicon.js";
import { shuffle, LETTERS } from "./seed.js";
import { languagesFor } from "../languages.js";

export const SHEET_LANGS = languagesFor("sheets").map((l) => l.code);
export const LANG_NAMES = Object.fromEntries(languagesFor("sheets").map((l) => [l.code, l.native]));

const MATCH_MAX = 10;
const NOUN_MAX = 10;
const SENTENCE_MAX = 6;

/** A word's meaning in German ("Auf Deutsch"): its explanation in simple German, as on the
 *  cards' German side (lexicon deHint), else its first synonym. A gap hint keeps its gap —
 *  the gap is the word being matched, so it is the clue, not a giveaway. */
export const deMeaningOf = (w) => w.deHint || w.syn?.[0] || null;

const clean = (s) => String(s).toLowerCase().replace(/[^a-zäöüß]/g, "");

/** The token of the example sentence that is this word (or one of its forms), if any. */
function findToken(word) {
  if (!word.example) return null;
  const targets = new Set(
    [word.lemma, word.plural, ...(word.forms ?? []).flatMap((f) => String(f).split(/\s+/))]
      .filter(Boolean)
      .map(clean),
  );
  const tokens = word.example.split(/(\s+)/);
  const i = tokens.findIndex((t) => targets.has(clean(t)));
  if (i < 0) return null;
  // Keep punctuation outside the gap: "Tisch." → gap "Tisch" + ".".
  const m = tokens[i].match(/^([„"(]*)(.*?)([.,!?;:“")]*)$/);
  return { before: tokens.slice(0, i).join("") + m[1], answer: m[2], after: m[3] + tokens.slice(i + 1).join("") };
}

/** `words` and `langs` let a deck outside the lexicon (a Berufe group, berufeWortschatz.rowsOf)
 *  use the same sheet: rows in the lexicon's shape, and the meaning languages that deck has. */
export function wortschatzSheet(unitId, { words = select({ unit: unitId }), langs = SHEET_LANGS } = {}) {
  const unit = units().find((u) => u.id === unitId);

  // A — the words that have a meaning in every offered language, in lexicon order; those
  // with a German explanation first, so a sheet can be done all in German where it exists.
  const glossed = words.filter((w) => langs.every((l) => w[l]));
  glossed.sort((a, b) => Number(!deMeaningOf(a)) - Number(!deMeaningOf(b)));
  const picked = glossed.slice(0, MATCH_MAX);
  const order = shuffle(picked.map((_, i) => i), `${unitId}:match`);
  const match = {
    left: picked.map((w, i) => ({ n: i + 1, de: w.lemma })),
    right: order.map((wi, k) => ({
      letter: LETTERS[k],
      // "de" falls back to English where a word has no German explanation (B1/B2 so far):
      // a Mappe in German that holds such a sheet shows a meaning, not a blank.
      meanings: { ...Object.fromEntries(langs.map((l) => [l, picked[wi][l]])), de: deMeaningOf(picked[wi]) ?? picked[wi].en ?? "" },
    })),
    // Left item i is answered by the letter at the position its word landed in.
    answers: picked.map((_, i) => LETTERS[order.indexOf(i)]),
  };

  // B — nouns with a known gender.
  const nouns = words
    .filter((w) => w.pos === "noun" && ["der", "die", "das"].includes(w.gender) && !w.pluralOnly)
    .slice(0, NOUN_MAX)
    .map((w) => ({ lemma: w.lemma, gender: w.gender, plural: w.plural ?? null }));

  // C — example sentences where the word itself can be found and blanked.
  const sentences = [];
  for (const w of words) {
    if (sentences.length >= SENTENCE_MAX) break;
    const t = findToken(w);
    if (t && t.answer) sentences.push({ ...t, lemma: w.lemma });
  }
  const box = shuffle(sentences.map((s) => s.answer), `${unitId}:box`);

  // Whether "Auf Deutsch" is offered (and the default): every matched word has German.
  const hasDe = picked.length > 0 && picked.every((w) => deMeaningOf(w));

  return { unit, count: words.length, match, nouns, sentences, box, hasDe };
}

/** The levels that get a mixed sheet of their own (id "a1" …). */
export const worksheetLevels = ["a1", "a2", "b1", "b2"];

/** A whole level's words in a seeded order, so its sheet is a mix of the level's topics
 *  rather than its first Lernset — and the same mix on every build (seed.js). */
export const levelWords = (id) => shuffle(select({ level: id.toUpperCase() }), `${id}:level`);

/** Every Lernset, for getStaticPaths and the index. */
export const worksheetUnits = () => units({ level: ["A1", "A2", "B1", "B2"] });
