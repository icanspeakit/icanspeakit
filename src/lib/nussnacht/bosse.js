// Hamstis Nussnacht: the minute bosses, the famous el / la traps. One per minute from 1 to 9,
// three at once in the final wave at minute 10. A boss is a big creature with more HP; when it
// falls, its rule card shows ("el mapa – It ends in -a but …").
//
// Three kinds of trap: the ending points the wrong way (el mapa, la mano, el problema), a stressed
// a- takes el although the noun is feminine (el agua, el aula), and an ending that says nothing
// (el coche, la noche). Nouns with two possible articles stay out (generoDrill.js AMBIGUOUS): the
// game can accept only one answer.
//
// `lv` is the first level that may meet the boss. Every boss is checked against the lexicon at
// build time (bosseFuer): article and level must match, and the voice clip comes from there.
// A boss with `lex: false` skips that check (el paraguas: not in the lexicon yet). The build
// names any boss that does not match, and the page leaves it out.
//
// Castilian Spanish: where Latin America differs, `es419` holds the note (src/lib/variety.js).
// It is not shown until a LatAm mode exists; the rule text only states the Spanish standard.
import { select } from "../lexicon.js";
import { ARTS } from "./woerter.js";

export const VARIETY = "es-ES";

export const BOSSE = [
  { w: "mapa", g: "el", lv: "A1", regel: "It ends in -a but it is masculine: el mapa, los mapas." },
  { w: "foto", g: "la", lv: "A1", regel: "Short for la fotografía, so it stays feminine in spite of the -o: la foto, las fotos." },
  { w: "agua", g: "el", lv: "A1", regel: "Feminine, but a stressed a- takes el in the singular: el agua fría, las aguas." },
  { w: "problema", g: "el", lv: "A1", regel: "A word from Greek in -ma, and masculine: el problema, el idioma." },
  { w: "idioma", g: "el", lv: "A1", regel: "A word from Greek in -ma, and masculine: el idioma, el problema." },
  { w: "día", g: "el", lv: "A1", regel: "It ends in -a but it is masculine: el día, buenos días." },
  { w: "mano", g: "la", lv: "A1", regel: "One of the very few feminine nouns in -o: la mano derecha, las manos." },
  { w: "hambre", g: "el", lv: "A1", regel: "Feminine with a stressed a-: el hambre, but tengo mucha hambre." },
  { w: "tranvía", g: "el", lv: "A1", regel: "Most nouns in -ía are feminine (la cafetería), but it is el tranvía." },
  { w: "coche", g: "el", lv: "A1", regel: "An -e tells you nothing: el coche, but la noche. Learn the article with the word." },
  { w: "noche", g: "la", lv: "A1", regel: "An -e tells you nothing: la noche, but el coche. Learn the article with the word." },
  { w: "llave", g: "la", lv: "A1", regel: "An -e tells you nothing: la llave, but el viaje. Learn the article with the word." },
  { w: "flor", g: "la", lv: "A1", regel: "Nouns in -or are usually masculine (el color, el dolor), but it is la flor." },
  { w: "nariz", g: "la", lv: "A1", regel: "A -z tells you nothing: la nariz, but el lápiz." },
  { w: "cumpleaños", g: "el", lv: "A1", regel: "It ends in -s but it is one birthday: el cumpleaños, los cumpleaños." },
  { w: "sartén", g: "la", lv: "A1", regel: "A consonant at the end tells you little: la sartén, las sartenes.",
    es419: { note: "Parts of Latin America say el sartén.", gender: "el" } },
  { w: "planeta", g: "el", lv: "A2", regel: "It ends in -a but it is masculine: el planeta, like el mapa." },
  { w: "clima", g: "el", lv: "A2", regel: "A word from Greek in -ma, and masculine: el clima, el programa." },
  { w: "programa", g: "el", lv: "A2", regel: "A word from Greek in -ma, and masculine: el programa, el clima." },
  { w: "sal", g: "la", lv: "A2", regel: "A consonant at the end tells you little: la sal, but el sol." },
  { w: "sangre", g: "la", lv: "A2", regel: "An -e tells you nothing, so learn this one with its article: la sangre." },
  { w: "costumbre", g: "la", lv: "A2", regel: "Nouns in -umbre are feminine: la costumbre, la legumbre." },
  { w: "garaje", g: "el", lv: "A2", regel: "Nouns in -aje are masculine: el garaje, el viaje, el paisaje." },
  { w: "pintalabios", g: "el", lv: "A2", regel: "Verb + noun: pinta + labios. These compounds are masculine: el pintalabios, los pintalabios." },
  { w: "lavavajillas", g: "el", lv: "A2", regel: "Verb + noun: lava + vajillas. These compounds are masculine: el lavavajillas." },
  { w: "paraguas", g: "el", lv: "A2", lex: false, regel: "Verb + noun: para + aguas. It ends in -s, but it is one umbrella: el paraguas, los paraguas." },
  { w: "radio", g: "la", lv: "B1", regel: "Short for la radiodifusión, so in Spain it stays feminine in spite of the -o: la radio.",
    es419: { note: "Mexico, Central America, the Caribbean, Colombia, Venezuela and Peru usually say el radio.", gender: "el" } },
  { w: "tema", g: "el", lv: "B1", regel: "A word from Greek in -ma, and masculine: el tema, el problema." },
  { w: "diploma", g: "el", lv: "B1", regel: "A word from Greek in -ma, and masculine: el diploma, el clima." },
  { w: "aula", g: "el", lv: "B1", regel: "Feminine, but a stressed a- takes el in the singular: el aula, las aulas." },
  { w: "crisis", g: "la", lv: "B1", regel: "Many Greek nouns in -is are feminine (but el análisis). The plural looks the same: la crisis, las crisis." },
  { w: "rascacielos", g: "el", lv: "B1", regel: "Verb + noun: rasca + cielos. These compounds are masculine: el rascacielos, los rascacielos." },
  { w: "paisaje", g: "el", lv: "B1", regel: "Nouns in -aje are masculine: el paisaje, el viaje, el garaje." },
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
