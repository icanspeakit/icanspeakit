// Hamstis Nussnacht: the minute bosses, the famous le / la traps. One per minute from 1 to 9,
// three at once in the final wave at minute 10. A boss is a big creature with more HP; when it
// falls, its rule card shows ("la plage – Most nouns in -age are masculine, but …").
//
// Kinds of trap: an ending that points the wrong way (la plage, le musée, la peau, le silence,
// le camion, la maison), a short form that keeps the gender of the long word (la photo, la météo),
// an -s that is not a plural (le pays, la souris), an h aspiré that blocks the elision (la honte),
// and words with nothing to go on (la main, la mer). Only le / la nouns: a boss that elides to l'
// would need the un / une shots, which a run may not have (main.js). Nouns with two possible
// articles stay out (generoDrill.js AMBIGUOUS, lexicon genderAlt): the game accepts one answer.
//
// `lv` is the first level that may meet the boss. Every boss is checked against the lexicon at
// build time (bosseFuer): article and level must match, and the voice clip comes from there.
// A boss with `lex: false` skips that check. The build names any boss that does not match, and
// the page leaves it out.
//
// Variety (src/lib/variety.js, content-plan §1.5): standard French of France. A boss whose gender
// differs in Québec would carry a `frCA` note { note, gender }; none of these does. Neither note
// is shown until a Canada mode exists; the rule text states the standard only.
import { select } from "../lexicon.js";
import { ARTS } from "./woerter.js";

export const VARIETY = "fr-FR";

export const BOSSE = [
  { w: "plage", g: "la", lv: "A1", regel: "Most nouns in -age are masculine (le garage, le voyage), but la plage is feminine, like la page and la cage." },
  { w: "musée", g: "le", lv: "A1", regel: "Most nouns in -ée are feminine (la journée, l'idée), but le musée is masculine, like le lycée." },
  { w: "peau", g: "la", lv: "A1", regel: "Nouns in -eau are masculine (le bureau, le gâteau), but la peau is feminine, and so is l'eau." },
  { w: "problème", g: "le", lv: "A1", regel: "A word from Greek in -ème, and masculine in spite of the -e: le problème, le système." },
  { w: "photo", g: "la", lv: "A1", regel: "Short for la photographie, so it stays feminine in spite of the -o: la photo, like la météo." },
  { w: "météo", g: "la", lv: "A1", regel: "Short for la météorologie, so it stays feminine in spite of the -o: la météo, like la photo." },
  { w: "maison", g: "la", lv: "A1", regel: "Many nouns in -on are masculine (le garçon, le salon), but la maison is feminine, like la leçon." },
  { w: "leçon", g: "la", lv: "A1", regel: "Many nouns in -on are masculine (le garçon, le salon), but la leçon is feminine, like la chanson." },
  { w: "chanson", g: "la", lv: "A1", regel: "Many nouns in -on are masculine (le garçon, le salon), but la chanson is feminine, like la maison." },
  { w: "forêt", g: "la", lv: "A1", regel: "Nouns in -et are usually masculine (le billet, le jouet), but la forêt is feminine." },
  { w: "dent", g: "la", lv: "A1", regel: "Nouns in -ent are usually masculine (le moment, le vent), but la dent is feminine." },
  { w: "cœur", g: "le", lv: "A1", regel: "Many nouns in -eur are feminine (la fleur, la couleur), but le cœur is masculine." },
  { w: "main", g: "la", lv: "A1", regel: "Nothing in the word tells you: la main, but le pain. Learn the article with the word." },
  { w: "mer", g: "la", lv: "A1", regel: "Nothing in the word tells you: la mer. It sounds like la mère (mother) and le maire (mayor)." },
  { w: "pays", g: "le", lv: "A1", regel: "It ends in -s, but it is one country: le pays, les pays." },
  { w: "dimanche", g: "le", lv: "A1", regel: "The days of the week are masculine, -e or not: le dimanche, le samedi." },
  { w: "fin", g: "la", lv: "A2", regel: "Nouns in -in are usually masculine (le vin, le jardin, le matin), but la fin is feminine." },
  { w: "bonheur", g: "le", lv: "A2", regel: "Feelings in -eur are usually feminine (la peur, la douleur), but le bonheur is masculine, like le malheur." },
  { w: "souris", g: "la", lv: "A2", regel: "It ends in -s, but it is one mouse, and feminine: la souris, les souris." },
  { w: "honte", g: "la", lv: "A2", regel: "The h is aspiré, so there is no elision: la honte, never l'honte. Same with le haricot, le héros." },
  { w: "stade", g: "le", lv: "A2", regel: "Nouns in -ade are usually feminine (la salade, la promenade), but le stade is masculine." },
  { w: "lave-vaisselle", g: "le", lv: "A2", regel: "Verb + noun: lave + vaisselle. These compounds are masculine, even though la vaisselle is feminine." },
  { w: "porte-monnaie", g: "le", lv: "A2", regel: "Verb + noun: porte + monnaie. These compounds are masculine, even though la monnaie is feminine." },
  { w: "lycée", g: "le", lv: "B1", regel: "Most nouns in -ée are feminine (la journée, l'idée), but le lycée is masculine, like le musée." },
  { w: "silence", g: "le", lv: "B1", regel: "Nouns in -ence are almost all feminine (la science, la patience), but le silence is masculine." },
  { w: "camion", g: "le", lv: "B1", regel: "Nouns in -ion are usually feminine (la région, la station), but le camion is masculine, like le million." },
  { w: "programme", g: "le", lv: "B1", regel: "From Greek, like le problème, and masculine in spite of the -e: le programme, le système." },
  { w: "paix", g: "la", lv: "B1", regel: "A final -x tells you nothing: la paix, but le prix. Learn the article with the word." },
  { w: "gratte-ciel", g: "le", lv: "B1", regel: "Verb + noun: gratte + ciel. These compounds are masculine: le gratte-ciel, like le sèche-cheveux." },
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
