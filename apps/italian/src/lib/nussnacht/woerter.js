// Hamsti's Nut Night, build time only: the word creatures' pools from the lexicon.
//
//   woerterFuer(level)  { words, low } for the page: the level's nouns and the level below
//
// A word is { id, w, g, a, pl, pa, h }: lemma, article (0 il, 1 lo, 2 la, 3 l'), audio slug, plural
// (for the Plural popper), the plural's article (4 i, 5 gli, 6 le) and, for a compound, where its
// second word starts (cavatappi → h = 4). Only nouns a drill may ask (generoDrill.js: one right
// article, a singular) and a lemma that fits on a creature's belly in one line: lower case, at most
// one space or hyphen. No lemma carries an apostrophe (l' is the article, not part of the word).
import { select } from "../lexicon.js";
import { isDrillNoun, pluralArticle } from "../generoDrill.js";

export const LEVELS = ["A1", "A2", "B1"];
export const ARTS = ["il", "lo", "la", "l'", "i", "gli", "le"];
// The level below, mixed in at a third of the weight (sim.js), so A2 and B1 start with words
// the learner has seen. A1 has none.
const BELOW = { A1: null, A2: "A1", B1: "A2" };

const WORD = /^[a-zàèéìòù]+(?:[ -][a-zàèéìòù]+)?$/;
const fits = (e) => isDrillNoun(e) && WORD.test(e.lemma) && e.lemma.length <= 16;

// The compound cracker: verb + noun compounds are written as one word, so nothing marks the seam
// and it has to be listed: lemma → length of the verb part. The lesson: they take il, lo or l' by
// their first sound (il cavatappi, l'apriscatole, lo schiaccianoci) and the plural does not change
// (i cavatappi). Only masculine ones are listed (la lavastoviglie, la lavatrice are out).
const COMPOUNDS = {
  cavatappi: 4, apriscatole: 4, schiaccianoci: 9, portafogli: 5, portachiavi: 5,
  tagliacarte: 6, lavapiatti: 4, fermacarte: 5, portacenere: 5,
};
// Their article (index into ARTS). Those the lexicon does not have at A1 to B1 join at B1, where
// the cracker can be picked.
const COMPOUND_ART = {
  cavatappi: 0, apriscatole: 3, schiaccianoci: 1, portafogli: 0, portachiavi: 0,
  tagliacarte: 0, lavapiatti: 0, fermacarte: 0, portacenere: 0,
};

const row = (e) => {
  const out = { id: e.id, w: e.lemma, g: ARTS.indexOf(e.gender) };
  if (e.audio) out.a = e.audio;
  // A plural only where it differs from the singular and fits (il lunedì / i lunedì has nothing to
  // show). Its article comes from the article and genus: l'amico → gli amici, l'amica → le amiche.
  if (e.plural && WORD.test(e.plural) && e.plural.length <= 16 && e.plural !== e.lemma) {
    out.pl = e.plural;
    out.pa = ARTS.indexOf(pluralArticle(e));
  }
  if (COMPOUNDS[e.lemma]) out.h = COMPOUNDS[e.lemma];
  return out;
};

export function woerterFuer(level) {
  const nouns = (lv) => select({ level: lv, pos: "noun" }).filter(fits).map(row);
  const words = nouns(level);
  if (level === "B1") {
    const have = new Set(select({ level: LEVELS, pos: "noun" }).map((e) => e.lemma));
    for (const w of Object.keys(COMPOUNDS)) {
      if (!have.has(w)) words.push({ id: `comp-${w}`, w, g: COMPOUND_ART[w], h: COMPOUNDS[w] });
    }
  }
  return { words, low: BELOW[level] ? nouns(BELOW[level]) : [] };
}
