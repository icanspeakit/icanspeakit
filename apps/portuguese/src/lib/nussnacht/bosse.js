// Hamstis Nussnacht: the minute bosses, the famous o / a traps. One per minute from 1 to 9,
// three at once in the final wave at minute 10. A boss is a big creature with more HP; when it
// falls, its rule card shows ("o mapa – It ends in -a but …").
//
// Three kinds of trap: the ending points the wrong way (o mapa, o dia, a mão, a foto, a cor,
// o coração), a Greek -ma word that is masculine (o problema, o clima), and an ending that says
// nothing (o leite but a noite, o nariz but a voz). Several are also false friends for learners
// who know Spanish (a dor / el dolor, o leite / la leche, a viagem / el viaje). Nouns with two
// possible articles stay out (generoDrill.js AMBIGUOUS): the game can accept only one answer.
//
// `lv` is the first level that may meet the boss. Every boss is checked against the lexicon at
// build time (bosseFuer): article and level must match, and the voice clip comes from there.
// A boss with `lex: false` skips that check (a foto, o idioma …: not in the lexicon yet). The
// build names any boss that does not match, and the page leaves it out.
//
// European Portuguese: where Brazil differs, `ptBR` holds the note (src/lib/variety.js). None of
// these genders differs in Brazil, so no boss carries one; the rule text states the pt-PT standard.
import { select } from "../lexicon.js";
import { ARTS } from "./woerter.js";

export const VARIETY = "pt-PT";

export const BOSSE = [
  { w: "mapa", g: "o", lv: "A1", regel: "It ends in -a but it is masculine: o mapa, os mapas." },
  { w: "dia", g: "o", lv: "A1", regel: "It ends in -a but it is masculine: o dia, bom dia, os dias." },
  { w: "mão", g: "a", lv: "A1", regel: "Most nouns in -ão are masculine (o pão, o cão), but it is a mão, as mãos." },
  { w: "foto", g: "a", lv: "A1", lex: false, regel: "Short for a fotografia, so it stays feminine in spite of the -o: a foto, as fotos." },
  { w: "idioma", g: "o", lv: "A1", lex: false, regel: "A word from Greek in -ma, and masculine: o idioma, o problema." },
  { w: "cinema", g: "o", lv: "A1", regel: "A word from Greek in -ma, and masculine: o cinema, o problema." },
  { w: "cor", g: "a", lv: "A1", regel: "Most nouns in -or are masculine (o amor, o calor), but it is a cor, as cores." },
  { w: "dor", g: "a", lv: "A1", regel: "Most nouns in -or are masculine (o amor, o calor), but it is a dor: tenho uma dor de cabeça." },
  { w: "flor", g: "a", lv: "A1", regel: "Most nouns in -or are masculine (o amor, o calor), but it is a flor, as flores." },
  { w: "coração", g: "o", lv: "A1", regel: "Nouns in -ção are feminine (a estação, a lição), but o coração is masculine. Learn it as the exception: o coração, os corações." },
  { w: "leite", g: "o", lv: "A1", regel: "An -e tells you nothing: o leite, but a noite. Learn the article with the word." },
  { w: "noite", g: "a", lv: "A1", regel: "An -e tells you nothing: a noite, but o leite. Learn the article with the word." },
  { w: "ponte", g: "a", lv: "A1", regel: "An -e tells you nothing: a ponte, but o dente. Learn the article with the word." },
  { w: "nariz", g: "o", lv: "A1", regel: "A -z tells you nothing: o nariz, but a voz and a luz." },
  { w: "voz", g: "a", lv: "A1", regel: "A -z tells you nothing: a voz, but o nariz and o arroz." },
  { w: "árvore", g: "a", lv: "A1", regel: "An -e tells you nothing, and this one is feminine: a árvore, as árvores." },
  { w: "viagem", g: "a", lv: "A1", regel: "Nouns in -gem are feminine: a viagem, a garagem, a mensagem." },
  { w: "problema", g: "o", lv: "A2", regel: "A word from Greek in -ma, and masculine: o problema, o sistema. Sem problema!" },
  { w: "programa", g: "o", lv: "A2", lex: false, regel: "A word from Greek in -ma, and masculine: o programa, o problema." },
  { w: "planeta", g: "o", lv: "A2", lex: false, regel: "It ends in -a but it is masculine: o planeta, like o mapa." },
  { w: "sangue", g: "o", lv: "A2", lex: false, regel: "An -e tells you nothing, so learn this one with its article: o sangue, as análises ao sangue." },
  { w: "sal", g: "o", lv: "A2", lex: false, regel: "A consonant at the end tells you little: o sal and o mar, but a flor and a cor." },
  { w: "chave", g: "a", lv: "A2", regel: "An -e tells you nothing: a chave, but o pente. Learn the article with the word." },
  { w: "clima", g: "o", lv: "B1", regel: "A word from Greek in -ma, and masculine: o clima, o problema." },
  { w: "diploma", g: "o", lv: "B1", regel: "A word from Greek in -ma, and masculine: o diploma, o clima." },
  { w: "tema", g: "o", lv: "B1", lex: false, regel: "A word from Greek in -ma, and masculine: o tema, o sistema." },
  { w: "sistema", g: "o", lv: "B1", lex: false, regel: "A word from Greek in -ma, and masculine: o sistema, o Sistema Nacional de Saúde." },
  { w: "costume", g: "o", lv: "B1", regel: "An -e tells you nothing, and this one is masculine: o costume, como de costume." },
  { w: "paisagem", g: "a", lv: "B1", regel: "Nouns in -gem are feminine: a paisagem, a viagem, a garagem." },
  { w: "luz", g: "a", lv: "B1", regel: "A -z tells you nothing: a luz, a conta da luz, but o nariz." },
  { w: "guarda-chuva", g: "o", lv: "B1", lex: false, regel: "Verb + noun: guarda + chuva. These compounds are masculine, even with a feminine noun: o guarda-chuva, os guarda-chuvas." },
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
