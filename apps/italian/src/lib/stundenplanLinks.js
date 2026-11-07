// What build() (src/lib/stundenplan.js) needs besides the course plan: for every level its
// Wortliste and game, and for every block the topic pages each grammar line links to.
// Build time only (it reads the catalogs); the pages serialise the result for the browser,
// so /teachers/timetable and /teachers/lesson build the very same Stunde.
import data from "../data/kursinhalte.json";
import { grammarByKey } from "./grammarCatalog.js";
import { lexiconCounts } from "./catalog.js";
import { grammarKeys, cefrOf } from "./stundenplan.js";

const GAME_LEVELS = ["A1", "A2", "B1", "B2"]; // what the printable games accept (src/lib/spiele/common.js)

// Video for the level, shown in Stunde 1's Einstieg: a YouTube search, not a fixed series, so
// it never goes dead and Edgar can swap in hand-picked channels later (none are checked yet).
const videoSearch = (name, q) => ({ name, href: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, ext: true });
// /object-pronouns is a page of its own, not in grammarCatalog ([id] route): the plan links it too.
const AKKUSATIV = { key: "akkusativ", name: "Direct object pronouns", href: "/object-pronouns", level: "A2" };
const topicByKey = (k) => grammarByKey(k) ?? (k === AKKUSATIV.key ? AKKUSATIV : null);

const VIDEOS = Object.fromEntries(["A1", "A2", "B1", "B2", "C1"].map((l) => [l, [videoSearch(`Videos in Spanish for ${l} (YouTube search)`, `learn Spanish from Spain ${l} with subtitles`)]]));

export function planLevels() {
  return data.niveaus.map((l) => {
    const cefr = cefrOf(l.label);
    return {
      id: l.id,
      label: l.label,
      titel: l.titel,
      // The series this level goes with, by name only (kursinhalte.json: no levels, no lessons).
      books: data.lehrwerke[l.lehrwerke] ?? [],
      words: lexiconCounts[cefr]?.words ? { name: `Word list ${cefr}`, href: `/vocabulary/${cefr.toLowerCase()}` } : null,
      videos: VIDEOS[cefr] ?? [],
      game: GAME_LEVELS.includes(cefr) ? { name: `Vocabulary bingo ${cefr}`, href: `/teachers/games/bingo?level=${cefr}` } : null,
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

