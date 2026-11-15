// Hamsti's Nut Night: the minute bosses, the famous il / lo / la / l' traps. One per minute from 1
// to 9, three at once in the final wave at minute 10. A boss is a big creature with more HP; when
// it falls, its rule card shows ("il problema – It ends in -a but …").
//
// Three kinds of trap: the ending points the wrong way (il problema, la mano, il cinema), a
// sound at the start that asks for lo or l' (lo zaino, lo studente, l'amico, l'uovo is out: two
// plurals), and an ending that says nothing (il fiore, la notte; il bar, la città). Nouns with two
// possible articles stay out (generoDrill.js AMBIGUOUS): the game can accept only one answer.
//
// `lv` is the first level that may meet the boss. Every boss is checked against the lexicon at
// build time (bosseFuer): article and level must match, and the voice clip comes from there.
// A boss with `lex: false` skips that check. The build names any boss that does not match, and the
// page leaves it out.
//
// Standard Italian: every boss is standard-Italian usage (it-IT). Where a region says it
// differently, the lexicon's regional note holds it, not this file; the rule text only states the
// standard.
import { select } from "../lexicon.js";
import { ARTS } from "./woerter.js";

export const VARIETY = "it-IT";

export const BOSSE = [
  { w: "zaino", g: "lo", lv: "B1", regel: "Masculine nouns that start with z take lo, not il: lo zaino, lo zio, gli zaini." },
  { w: "mano", g: "la", lv: "A1", regel: "One of the very few feminine nouns in -o: la mano, and the plural is irregular too: le mani." },
  { w: "problema", g: "il", lv: "A2", regel: "A word from Greek in -ma, and masculine: il problema, il programma, i problemi." },
  { w: "foto", g: "la", lv: "A1", regel: "Short for la fotografia, so it stays feminine in spite of the -o, and it never changes: la foto, le foto." },
  { w: "città", g: "la", lv: "A1", regel: "Nouns in -à are feminine and do not change in the plural: la città, le città." },
  { w: "caffè", g: "il", lv: "A1", regel: "Nouns in a stressed -è are masculine and do not change: il caffè, i caffè." },
  { w: "studente", g: "lo", lv: "A1", regel: "Masculine nouns that start with s + consonant take lo: lo studente, lo sport, gli studenti." },
  { w: "amico", g: "l'", lv: "A1", regel: "Before a vowel il and la lose their vowel and become l': l'amico (m), l'amica (f). The plural tells them apart: gli amici, le amiche." },
  { w: "notte", g: "la", lv: "A1", regel: "An -e tells you nothing: la notte, but il fiore. Learn the article with the word." },
  { w: "fiore", g: "il", lv: "A1", regel: "An -e tells you nothing: il fiore, but la notte. Learn the article with the word." },
  { w: "sport", g: "lo", lv: "A2", regel: "A word that starts with s + consonant takes lo, even when it is borrowed from English: lo sport, gli sport." },
  { w: "chiave", g: "la", lv: "A1", regel: "An -e tells you nothing: la chiave, but il viaggio. Learn the article with the word." },
  { w: "zio", g: "lo", lv: "A1", regel: "Masculine nouns that start with z take lo: lo zio, lo zaino, gli zii." },
  { w: "scontrino", g: "lo", lv: "A1", regel: "Masculine nouns that start with s + consonant take lo: lo scontrino, lo sconto, gli scontrini." },
  { w: "estate", g: "l'", lv: "A1", regel: "A feminine noun that starts with a vowel takes l': l'estate, l'età, l'isola." },
  { w: "anguria", g: "l'", lv: "A1", regel: "A feminine noun that starts with a vowel takes l': l'anguria (in the centre and the south you will also hear il cocomero)." },
  { w: "stomaco", g: "lo", lv: "A2", regel: "Masculine nouns that start with s + consonant take lo: lo stomaco, lo specchio, gli stomaci." },
  { w: "cinema", g: "il", lv: "A2", regel: "It ends in -a but it is masculine (short for il cinematografo): il cinema, i cinema." },
  { w: "clima", g: "il", lv: "A2", regel: "A word from Greek in -ma, and masculine: il clima, il panorama." },
  { w: "università", g: "l'", lv: "A2", regel: "A feminine noun that starts with a vowel takes l': l'università, l'estate. The plural is le università." },
  { w: "ospedale", g: "l'", lv: "A2", regel: "A masculine noun that starts with a vowel takes l': l'ospedale, l'albergo; the plural is gli ospedali." },
  { w: "film", g: "il", lv: "A2", regel: "A word borrowed from English that ends in a consonant is usually masculine and does not change: il film, i film." },
  { w: "crisi", g: "la", lv: "B1", regel: "Nouns from Greek in -si are feminine and keep one form: la crisi, la tesi, le crisi." },
  { w: "scienziato", g: "lo", lv: "B1", regel: "Masculine nouns that start with s + consonant (sc-, sp-, st-) take lo: lo scienziato, lo sci, gli scienziati." },
  { w: "diploma", g: "il", lv: "B1", regel: "A word from Greek in -ma, and masculine: il diploma, il clima, i diplomi." },
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
