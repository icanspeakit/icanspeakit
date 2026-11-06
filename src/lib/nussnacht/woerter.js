// Hamstis Nussnacht, build time only: the word creatures' pools from the lexicon.
//
//   woerterFuer(level)  { words, low } for the page: the level's nouns and the level below
//
// A word is { id, w, g, a, pl, pa, h }: lemma, article (0 el, 1 la), audio slug, plural (for the
// Plural popper), the plural's article (2 los, 3 las) and, for a compound, where its second word
// starts (sacacorchos → h = 4). Only nouns a drill may ask (generoDrill.js: one right article, a
// singular) and a lemma that fits on a creature's belly in one line: lower case, at most one space
// or hyphen (so no acronyms like el DNI).
import { select } from "../lexicon.js";
import { isDrillNoun, pluralArticle } from "../generoDrill.js";

export const LEVELS = ["A1", "A2", "B1"];
export const ARTS = ["el", "la", "los", "las"];
// The level below, mixed in at a third of the weight (sim.js), so A2 and B1 start with words
// the learner has seen. A1 has none.
const BELOW = { A1: null, A2: "A1", B1: "A2" };

const WORD = /^[a-záéíóúüñ]+(?:[ -][a-záéíóúüñ]+)?$/;
const fits = (e) => isDrillNoun(e) && WORD.test(e.lemma) && e.lemma.length <= 16;

// The compound cracker: Spanish verb + plural noun compounds are written as one word, so nothing
// marks the seam and it has to be listed: lemma → length of the verb part. The lesson is that they
// end in -s and are still masculine and singular: el abrelatas, los abrelatas. Only clean seams
// and only masculine ones: el paraguas (para + aguas) loses a letter at the seam, so it is a boss
// instead (bosse.js), el pararrayos (para + rayos) gains one, and el lavaplatos, el cortacésped are
// out because they can also be feminine.
const COMPOUNDS = {
  cumpleaños: 6, lavavajillas: 4, pintalabios: 5, rascacielos: 5, trabalenguas: 5,
  sacacorchos: 4, abrelatas: 4, sacapuntas: 4, abrecartas: 4, rompecabezas: 5, parabrisas: 4,
  salvavidas: 5, cuentagotas: 6, portaaviones: 5, tocadiscos: 4, matasellos: 4,
  portaequipajes: 5,
};
// The ones the lexicon does not have at A1 to B1: the cracker needs more than the three it would
// find at A2 and B1, and these are everyday things. They join at B1, where the cracker can be picked.
const EXTRA_AT_B1 = [
  "sacacorchos", "abrelatas", "sacapuntas", "abrecartas", "rompecabezas", "parabrisas", "salvavidas",
  "cuentagotas", "portaaviones", "tocadiscos", "matasellos", "portaequipajes", "trabalenguas",
];

const row = (e) => {
  const out = { id: e.id, w: e.lemma, g: ARTS.indexOf(e.gender) };
  if (e.audio) out.a = e.audio;
  // A plural only where it differs from the singular and fits: el lunes / los lunes has nothing to
  // show. Its article comes from the gender, not the singular: el agua → las aguas.
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
    for (const w of EXTRA_AT_B1) if (!have.has(w)) words.push({ id: `comp-${w}`, w, g: 0, h: COMPOUNDS[w] });
  }
  return { words, low: BELOW[level] ? nouns(BELOW[level]) : [] };
}
