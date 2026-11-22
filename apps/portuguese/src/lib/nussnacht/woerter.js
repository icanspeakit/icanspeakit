// Hamstis Nussnacht, build time only: the word creatures' pools from the lexicon.
//
//   woerterFuer(level)  { words, low } for the page: the level's nouns and the level below
//
// A word is { id, w, g, a, pl, pa, h }: lemma, article (0 o, 1 a), audio slug, plural (for the
// Plural popper), the plural's article (2 os, 3 as) and, for a compound, where its second word
// starts (abre-latas → h = 5, after the hyphen). Only nouns a drill may ask (generoDrill.js: one
// right article, a singular) and a lemma that fits on a creature's belly in one line: lower case,
// at most one space or hyphen (so no acronyms like o NIF, and no rés-do-chão).
import { select } from "../lexicon.js";
import { isDrillNoun, pluralArticle } from "../generoDrill.js";

export const LEVELS = ["A1", "A2", "B1"];
export const ARTS = ["o", "a", "os", "as"];
// The level below, mixed in at a third of the weight (sim.js), so A2 and B1 start with words
// the learner has seen. A1 has none.
const BELOW = { A1: null, A2: "A1", B1: "A2" };

const WORD = /^[a-záàâãéêíóôõúüç]+(?:[ -][a-záàâãéêíóôõúüç]+)?$/;
const fits = (e) => isDrillNoun(e) && WORD.test(e.lemma) && e.lemma.length <= 16;

// The compound cracker: a verb + a noun, written with a hyphen in Portugal (1990 spelling keeps
// it here: o guarda-chuva, o abre-latas). The lesson is that they are masculine whatever the
// noun is: o guarda-chuva although a chuva, o beija-flor although a flor, and that those with a
// plural noun stay the same in the plural: o abre-latas, os abre-latas. The hyphen is the seam,
// so `h` is the index after it. Only verb + noun compounds: o pequeno-almoço or a segunda-feira
// follow their head noun and teach nothing here. The lexicon has none at A1 to B1, so they all
// join at B1, where the cracker can be picked.
const COMPOUNDS = [
  "guarda-chuva", "guarda-roupa", "guarda-sol", "abre-latas", "saca-rolhas", "quebra-nozes",
  "quebra-cabeças", "porta-moedas", "porta-chaves", "arranha-céus", "conta-gotas", "corta-unhas",
  "tira-nódoas", "beija-flor", "porta-aviões", "salva-vidas",
];
const seam = (w) => w.indexOf("-") + 1;

const row = (e) => {
  const out = { id: e.id, w: e.lemma, g: ARTS.indexOf(e.gender) };
  if (e.audio) out.a = e.audio;
  // A plural only where it differs from the singular and fits: o lápis / os lápis has nothing to
  // show. Its article comes from the gender: o dia → os dias, a mão → as mãos.
  if (e.plural && WORD.test(e.plural) && e.plural.length <= 16 && e.plural !== e.lemma) {
    out.pl = e.plural;
    out.pa = ARTS.indexOf(pluralArticle(e));
  }
  if (COMPOUNDS.includes(e.lemma)) out.h = seam(e.lemma);
  return out;
};

export function woerterFuer(level) {
  const nouns = (lv) => select({ level: lv, pos: "noun" }).filter(fits).map(row);
  const words = nouns(level);
  if (level === "B1") {
    const have = new Set(select({ level: LEVELS, pos: "noun" }).map((e) => e.lemma));
    for (const w of COMPOUNDS) if (!have.has(w)) words.push({ id: `comp-${w}`, w, g: 0, h: seam(w) });
  }
  return { words, low: BELOW[level] ? nouns(BELOW[level]) : [] };
}
