// What build() (src/lib/stundenplan.js) needs besides the course plan: for every level its
// Wortliste and game, and for every block the topic pages each grammar line links to.
// Build time only (it reads the catalogs); the pages serialise the result for the browser,
// so /teachers/timetable and /teachers/lesson build the very same Stunde.
import data from "../data/kursinhalte.json";
import { grammarByKey } from "./grammarCatalog.js";
import { lexiconCounts } from "./catalog.js";
import { grammarKeys, cefrOf } from "./stundenplan.js";

const GAME_LEVELS = ["A1", "A2", "B1", "B2"]; // what the printable games accept (src/lib/spiele/common.js)

// Free video series for the level, shown in Stunde 1's Einstieg. Hand-picked and checked
// (2026-10-26): the DW pages state their level themselves; Easy German is street
// interviews with subtitles, from B1 on. External, so the page opens them in a new tab.
const DW = "https://learngerman.dw.com/de";
const NICO = { name: "Nicos Weg (DW, Videokurs)", href: `${DW}/nicos-weg/c-36519687`, ext: true };
const EASY = { name: "Easy German (YouTube)", href: "https://www.youtube.com/@EasyGerman", ext: true };
const VIDEO_THEMA = { name: "Video-Thema (DW)", href: `${DW}/video-thema/s-55861568`, ext: true };
const NACHRICHTEN = { name: "Langsam gesprochene Nachrichten (DW)", href: `${DW}/langsam-gesprochene-nachrichten/s-60040332`, ext: true };
// /object-pronouns is a page of its own, not in grammarCatalog ([id] route): the plan links it too.
const AKKUSATIV = { key: "akkusativ", name: "Akkusativ", href: "/object-pronouns", level: "A1" };
const topicByKey = (k) => grammarByKey(k) ?? (k === AKKUSATIV.key ? AKKUSATIV : null);

const VIDEOS = { A1: [NICO], A2: [NICO], B1: [NICO, EASY], B2: [VIDEO_THEMA, EASY], C1: [VIDEO_THEMA, NACHRICHTEN] };

export function planLevels() {
  return data.niveaus.map((l) => {
    const cefr = cefrOf(l.label);
    return {
      id: l.id,
      label: l.label,
      titel: l.titel,
      // The series this level goes with, by name only (kursinhalte.json: no levels, no lessons).
      books: data.lehrwerke[l.lehrwerke] ?? [],
      words: lexiconCounts[cefr]?.words ? { name: `Wortliste ${cefr}`, href: `/vocabulary/${cefr.toLowerCase()}` } : null,
      videos: VIDEOS[cefr] ?? [],
      game: GAME_LEVELS.includes(cefr) ? { name: `Wortschatz-Bingo ${cefr}`, href: `/teachers/games/bingo?level=${cefr}` } : null,
      blocks: l.bloecke.map((b) => ({
        ...b,
        grammar: b.grammatik.map((g) => grammarKeys(g, cefr, topicByKey).map((k) => {
          const t = topicByKey(k);
          return { name: t.name, href: t.href };
        })),
      })),
    };
  });
}

