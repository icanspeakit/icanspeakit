// Hamstis Nussnacht, build time only: the word creatures' pools from the lexicon.
//
//   woerterFuer(level)  { words, low } for the page: the level's nouns and the level below
//
// A word is { id, w, g, a, pl, h }: lemma, article (0 der, 1 die, 2 das), audio slug, plural
// (for the Plural-Platzer) and, for a compound, where its head starts (Haus|tür → h = 4).
// Only nouns with exactly one article (`genderAlt` words are left out: a „wrong" hit that
// counts after all teaches nothing) and a lemma that fits on a creature's belly in one line.
import { select } from "../lexicon.js";

export const LEVELS = ["A1", "A2", "B1"];
export const ARTS = ["der", "die", "das"];
// The level below, mixed in at a third of the weight (sim.js), so A2 and B1 start with words
// the learner has seen. A1 has none.
const BELOW = { A1: null, A2: "A1", B1: "A2" };

const fits = (e) => ARTS.includes(e.gender) && !e.genderAlt && !e.pluralOnly
  && /^[A-ZÄÖÜ][a-zäöüß]{1,15}$/.test(e.lemma);

// Compounds for the Kompositum-Kracher: the word ends in another lexicon noun with the same
// article (the head decides), and what is left in front is itself a word – a noun, an
// adjective or a verb stem, with or without a linking -s/-n/-en/-er/-e. That rules out the
// false splits a plain "ends with" finds (Verkä|ufer, Ant|wort, Mon|tag, Vor|name).
let HEADS = null;
let STEMS = null;
function compoundHead(e) {
  if (!HEADS) {
    const rows = select({ level: ["A1", "A2", "B1"] });
    HEADS = rows.filter((r) => r.pos === "noun" && ARTS.includes(r.gender) && r.lemma.length >= 3 && /^[A-ZÄÖÜ][a-zäöüß]+$/.test(r.lemma));
    STEMS = new Set();
    for (const r of rows) {
      const l = String(r.lemma).toLowerCase();
      if (!/^[a-zäöüß]+$/.test(l)) continue;
      STEMS.add(l);
      if (r.pos === "verb") STEMS.add(l.replace(/e?n$/, ""));
    }
  }
  const lw = e.lemma.toLowerCase();
  let best = null;
  for (const h of HEADS) {
    const hl = h.lemma.toLowerCase();
    if (h.lemma === e.lemma || !lw.endsWith(hl) || lw.length - hl.length < 3 || h.gender !== e.gender) continue;
    const first = lw.slice(0, lw.length - hl.length);
    const ok = [first, first.replace(/(s|n|en|er|e)$/, "")].some((f) => f.length >= 3 && STEMS.has(f));
    if (ok && (!best || h.lemma.length > best.lemma.length)) best = h;
  }
  return best ? e.lemma.length - best.lemma.length : 0;
}

// False splits the rule above lets through (Antrag|steller is not Antrags|teller).
const NOT_COMPOUND = new Set(["Antragsteller"]);

const row = (e) => {
  const out = { id: e.id, w: e.lemma, g: ARTS.indexOf(e.gender) };
  if (e.audio) out.a = e.audio;
  if (e.plural && /^[A-ZÄÖÜ][a-zäöüß]{1,16}$/.test(e.plural) && e.plural !== e.lemma) out.pl = e.plural;
  const h = NOT_COMPOUND.has(e.lemma) ? 0 : compoundHead(e);
  if (h) out.h = h;
  return out;
};

export function woerterFuer(level) {
  const nouns = (lv) => select({ level: lv, pos: "noun" }).filter(fits).map(row);
  return { words: nouns(level), low: BELOW[level] ? nouns(BELOW[level]) : [] };
}
