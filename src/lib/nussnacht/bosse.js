// Hamstis Nussnacht: the minute bosses, the famous a / an / some traps. One per minute from
// 1 to 9, three at once in the final wave at minute 10. A boss is a big creature with more HP;
// when it falls, its rule card shows ("Silent h: an hour").
//
// Two kinds of trap: the first *sound* is not the first letter (an hour, a university, an
// uncle, a year), and nouns you cannot count take some (advice, information, luggage).
// Nouns that are both (a coffee = a cup of coffee, a paper = a newspaper) are left out: the
// game can accept only one answer.
//
// `lv` is the first level that may meet the boss. Every boss is checked against the lexicon at
// build time (bosseFuer): article and level must match, and the voice clip comes from there.
// A boss with `lex: false` would skip that check (none at the moment). The build check names
// any boss that does not match, and the page leaves it out.
import { select } from "../lexicon.js";
import { ARTS } from "./woerter.js";

export const BOSSE = [
  { w: "hour", g: "an", lv: "A1", regel: "Silent h: you say “our”, so it’s an hour (and an honest man)." },
  { w: "hotel", g: "a", lv: "A1", regel: "You hear the h in hotel, so it’s a hotel – but an hour." },
  { w: "university", g: "a", lv: "A1", regel: "This u sounds like “you”, a consonant sound: a university, a uniform." },
  { w: "uncle", g: "an", lv: "A1", regel: "This u sounds like “uh”, a vowel sound: an uncle, an umbrella." },
  { w: "year", g: "a", lv: "A1", regel: "Y at the start is a consonant sound: a year, a yoghurt." },
  { w: "island", g: "an", lv: "A1", regel: "The s is silent, but i is a vowel sound: an island." },
  { w: "advice", g: "some", lv: "A1", regel: "You can’t count advice: some advice or a piece of advice – never an advice." },
  { w: "information", g: "some", lv: "A1", regel: "Information is uncountable: some information, not an information or informations." },
  { w: "luggage", g: "some", lv: "A1", regel: "Luggage is uncountable: some luggage – but a bag, a suitcase." },
  { w: "homework", g: "some", lv: "A1", regel: "Homework has no plural: some homework, not a homework." },
  { w: "money", g: "some", lv: "A1", regel: "Money is uncountable: some money – but a coin, a note." },
  { w: "bread", g: "some", lv: "A1", regel: "Some bread, or a loaf of bread – not a bread." },
  { w: "work", g: "some", lv: "A1", regel: "Work is uncountable: some work – but a job." },
  { w: "rubbish", g: "some", lv: "A1", regel: "Rubbish is uncountable: some rubbish – but a bin, a bag of rubbish." },
  { w: "uniform", g: "a", lv: "A2", regel: "Uni- sounds like “you-ni”: a uniform, a university." },
  { w: "onion", g: "an", lv: "A2", regel: "Onion starts with an “uh” sound: an onion (but a one-way ticket: one starts with “w”)." },
  { w: "furniture", g: "some", lv: "A2", regel: "Furniture is uncountable: some furniture – but a chair, a table." },
  { w: "accommodation", g: "some", lv: "A2", regel: "In British English accommodation is uncountable: some accommodation – but a room, a flat." },
  { w: "equipment", g: "some", lv: "A2", regel: "Equipment is uncountable: some equipment, a piece of equipment." },
  { w: "knowledge", g: "some", lv: "A2", regel: "Knowledge has no plural: some knowledge of English." },
  { w: "progress", g: "some", lv: "A2", regel: "Progress is uncountable: you make some progress, not a progress." },
  { w: "news", g: "some", lv: "B1", regel: "News ends in -s but is uncountable: some news, and the news is good." },
  { w: "research", g: "some", lv: "B1", regel: "Research is uncountable: some research, not a research or researches." },
  { w: "evidence", g: "some", lv: "B1", regel: "Evidence is uncountable: some evidence, a piece of evidence." },
  { w: "software", g: "some", lv: "B1", regel: "Software is uncountable: some software – but an app, a program." },
];

const ORDER = ["A1", "A2", "B1"];

/** The bosses a level may meet, resolved against the lexicon: { w, g, regel, id, a? }.
 *  `misses` lists every boss (other than the `lex: false` ones) the lexicon does not confirm. */
export function bosseFuer(level) {
  const nouns = select({ level: ORDER, pos: "noun" });
  const out = [];
  const misses = [];
  for (const b of BOSSE) {
    if (ORDER.indexOf(b.lv) > ORDER.indexOf(level)) continue;
    const e = nouns.find((n) => n.lemma === b.w);
    if (b.lex === false) {
      out.push({ w: b.w, g: ARTS.indexOf(b.g), regel: b.regel, id: `boss-${b.w.toLowerCase()}` });
      continue;
    }
    if (!e || e.gender !== b.g || e.genderAlt || ORDER.indexOf(e.level) > ORDER.indexOf(level)) {
      misses.push(b.w);
      continue;
    }
    out.push({ w: b.w, g: ARTS.indexOf(b.g), regel: b.regel, id: e.id, ...(e.audio ? { a: e.audio } : {}) });
  }
  return { bosse: out, misses };
}
