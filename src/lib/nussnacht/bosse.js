// Hamstis Nussnacht: the minute bosses, the famous article traps. One per minute from 1 to 9,
// three at once in the Endgegner wave at minute 10. A boss is a big creature with more HP;
// when it falls, its rule card shows („-chen ist immer das").
//
// `lv` is the first level that may meet the boss. Every boss is checked against the lexicon at
// build time (bosseFuer): article and level must match, and the voice clip comes from there.
// „das Mädchen" is not in the lexicon (2026-10-28) and stays anyway – it is *the* example for
// -chen with a person – so it carries `lex: false` and has no voice. The build check names any
// other boss that does not match, and the page leaves it out.
import { select } from "../lexicon.js";

export const BOSSE = [
  { w: "Mädchen", g: "das", lv: "A1", lex: false, regel: "-chen ist immer das – auch bei Menschen: das Mädchen, das Brötchen." },
  { w: "Messer", g: "das", lv: "A1", regel: "Besteck hat alle drei: der Löffel, die Gabel, das Messer." },
  { w: "Butter", g: "die", lv: "A1", regel: "Keine Regel, einfach merken: die Butter (aber der Käse)." },
  { w: "Käse", g: "der", lv: "A1", regel: "-e ist oft die – aber nicht immer: der Käse, der Name." },
  { w: "Gehalt", g: "das", lv: "A1", regel: "Geld für die Arbeit: das Gehalt." },
  { w: "Brötchen", g: "das", lv: "A1", regel: "-chen ist immer das: das Brötchen." },
  { w: "Kind", g: "das", lv: "A1", regel: "Menschen haben nicht immer der oder die: das Kind." },
  { w: "Auge", g: "das", lv: "A1", regel: "Körperteile haben alle drei: der Arm, die Nase, das Auge." },
  { w: "Kaffee", g: "der", lv: "A1", regel: "Viele Getränke sind der: der Kaffee, der Tee – aber das Bier, das Wasser." },
  { w: "Bier", g: "das", lv: "A1", regel: "Getränke: der Wein, der Saft – aber das Bier." },
  { w: "Zentrum", g: "das", lv: "A1", regel: "-um ist meist das: das Zentrum, das Museum." },
  { w: "Universität", g: "die", lv: "A1", regel: "-tät ist immer die." },
  { w: "Wohnung", g: "die", lv: "A1", regel: "-ung ist immer die." },
  { w: "Dokument", g: "das", lv: "A1", regel: "-ment ist das: das Dokument." },
  { w: "Frühling", g: "der", lv: "A1", regel: "-ling ist der: der Frühling." },
  { w: "Fenster", g: "das", lv: "A1", regel: "-er ist oft der (der Computer) – aber das Fenster, das Zimmer." },
  { w: "Problem", g: "das", lv: "A1", regel: "Aus dem Griechischen auf -em: das Problem, das System." },
  { w: "Firma", g: "die", lv: "A1", regel: "-a ist oft die: die Firma – aber das Sofa." },
  { w: "Sofa", g: "das", lv: "A1", regel: "Möbel haben alle drei: der Tisch, die Lampe, das Sofa." },
  { w: "Gemüse", g: "das", lv: "A1", regel: "Ge- … -e ist oft das: das Gemüse." },
  { w: "Monat", g: "der", lv: "A1", regel: "Zeiten: der Tag, der Monat – aber die Woche, das Jahr." },
  { w: "Thema", g: "das", lv: "A2", regel: "-ma aus dem Griechischen: das Thema." },
  { w: "Zeugnis", g: "das", lv: "A2", regel: "-nis ist meist das: das Zeugnis." },
  { w: "Kenntnis", g: "die", lv: "A2", regel: "-nis ist meist das – aber die Kenntnis, die Erlaubnis." },
  { w: "Schokolade", g: "die", lv: "A2", regel: "-e ist oft die: die Schokolade." },
  { w: "Computer", g: "der", lv: "A2", regel: "Geräte auf -er sind meist der: der Computer." },
  { w: "Handy", g: "das", lv: "A2", regel: "Englische Wörter bekommen oft das: das Handy, das Ticket." },
  { w: "Erlaubnis", g: "die", lv: "B1", regel: "-nis ist meist das – aber die Erlaubnis." },
  { w: "Ergebnis", g: "das", lv: "B1", regel: "-nis ist meist das: das Ergebnis." },
  { w: "Brille", g: "die", lv: "B1", regel: "-e ist oft die: die Brille." },
  { w: "Knie", g: "das", lv: "B1", regel: "Körperteile: das Knie, das Bein – aber der Fuß." },
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
      out.push({ w: b.w, g: ["der", "die", "das"].indexOf(b.g), regel: b.regel, id: `boss-${b.w.toLowerCase()}` });
      continue;
    }
    if (!e || e.gender !== b.g || e.genderAlt || ORDER.indexOf(e.level) > ORDER.indexOf(level)) {
      misses.push(b.w);
      continue;
    }
    out.push({ w: b.w, g: ["der", "die", "das"].indexOf(b.g), regel: b.regel, id: e.id, ...(e.audio ? { a: e.audio } : {}) });
  }
  return { bosse: out, misses };
}
