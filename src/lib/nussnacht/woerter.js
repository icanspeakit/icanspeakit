// Hamstis Nussnacht, build time only: the word creatures' pools from the lexicon.
//
//   woerterFuer(level)  { words, low } for the page: the level's nouns and the level below
//
// A word is { id, w, g, a, pl, h }: lemma, article (0 a, 1 an, 2 some), audio slug, plural
// (for the Plural popper) and, for a two-word noun, where its second word starts
// (bus stop → h = 4). Only nouns with an a / an / some article (plural-only nouns have none)
// and a lemma that fits on a creature's belly in one line: lower case, at most one space or
// hyphen (proper nouns like Monday and abbreviations like TV stay out).
import { select } from "../lexicon.js";

export const LEVELS = ["A1", "A2", "B1"];
export const ARTS = ["a", "an", "some"];
// The level below, mixed in at a third of the weight (sim.js), so A2 and B1 start with words
// the learner has seen. A1 has none.
const BELOW = { A1: null, A2: "A1", B1: "A2" };

const WORD = /^[a-z]+(?:[ -][a-z]+)?$/;
const fits = (e) => ARTS.includes(e.gender) && !e.pluralOnly && WORD.test(e.lemma) && e.lemma.length <= 16;

// Two-word nouns for the two-word cracker (the German game's compound upgrade): an open
// compound like "bus stop" or "email address". English writes them apart, so there is nothing
// to split by guessing – the space is the seam. The lesson is the article: it goes with the
// sound of the *first* word (a shop assistant, but an assistant). Only a / an nouns: with
// some the first word changes nothing.
const head = (e) => (e.gender !== "some" && / /.test(e.lemma) ? e.lemma.indexOf(" ") + 1 : 0);

const row = (e) => {
  const out = { id: e.id, w: e.lemma, g: ARTS.indexOf(e.gender) };
  if (e.audio) out.a = e.audio;
  // A plural only for countable nouns: uncountables (some) have none, and the plural creature
  // takes some (some apples).
  if (e.gender !== "some" && e.plural && WORD.test(e.plural) && e.plural.length <= 16 && e.plural !== e.lemma) out.pl = e.plural;
  const h = head(e);
  if (h) out.h = h;
  return out;
};

export function woerterFuer(level) {
  const nouns = (lv) => select({ level: lv, pos: "noun" }).filter(fits).map(row);
  return { words: nouns(level), low: BELOW[level] ? nouns(BELOW[level]) : [] };
}
