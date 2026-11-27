// Every released game of this course in one place (port of deutschacademy's spieleKatalog.js,
// upstream e219f2c0 ff.). The games hub (src/pages/giochi/index.astro) and the site search
// (searchIndex.js) read this list; the Games column of both menus (catalog.js `spieleItems`)
// lists the same games and links here as "All games".
//
// Only released games belong here: the prototypes under /giochi (noindex, EXPERIMENTE.md)
// stay out until they are released, then they get an entry.
//
// Per game:
//   id                  stable key (the upstream id)
//   href                the route
//   titleKey/title      the name (game names are not translated; the key exists for the menu)
//   hintKey/hint        one line: what you do
//   mascot, extra       bruno | regi | hamsti | quaki and its accessory (src/lib/mascots.js)
//   practises[]         tag ids from GAME_TAGS, honest: what the game actually practises
//   levels[]            A1 … C1
//   minutes             one run, roughly
// Group games (the printable class games) have no `practises` and no `minutes`.

/** The hub page and what the hub calls the course. */
export const GAMES_HUB = { href: "/giochi", course: "Italian" };

/** The filter chips on the hub, in this order. Only tags some game has are shown. */
export const GAME_TAGS = [
  { id: "articles", key: "games.tag.articles", name: "Articles" },
  { id: "verbs", key: "games.tag.verbs", name: "Verbs" },
  { id: "vocabulary", key: "games.tag.vocabulary", name: "Vocabulary" },
  { id: "listening", key: "games.tag.listening", name: "Listening" },
  { id: "reading", key: "games.tag.reading", name: "Reading" },
  { id: "everyday", key: "games.tag.everyday", name: "Everyday situations" },
];

export const GAME_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

/** Games you play on your own: the grid with the filters, and the pool for the game of the day. */
export const soloGames = [
  { id: "lindenau", href: "/giochi/casalbruno",
    titleKey: "nav.spiele.lindenau", title: "The Legend of Casalbruno",
    hintKey: "nav.spiele.lindenauHint", hint: "Role-play in town, A1",
    mascot: "regi", extra: "bleistift",
    practises: ["reading", "vocabulary", "everyday"], levels: ["A1"], minutes: 15 },
  { id: "hoer-safari", href: "/giochi/safari-d-ascolto",
    titleKey: "nav.spiele.hoerSafari", title: "Hamsti’s Bird Safari",
    hintKey: "nav.spiele.hoerSafariHint", hint: "Hear the word, hit the bird, A1–B1",
    mascot: "hamsti", extra: "mikrofon",
    practises: ["listening", "articles", "vocabulary"], levels: ["A1", "A2", "B1"], minutes: 2 },
  { id: "artikel-sprint", href: "/giochi/sprint-degli-articoli",
    titleKey: "sprint.name", title: "Bruno Kart",
    hintKey: "games.hint.sprint", hint: "Race through the right gate, A1–B1",
    mascot: "bruno", extra: "pokal",
    practises: ["articles", "verbs", "vocabulary"], levels: ["A1", "A2", "B1"], minutes: 2 },
];

/** Games for a group: the printable class games (/insegnanti/giochi). */
export const groupGames = [
  { id: "bingo", href: "/insegnanti/giochi/bingo",
    titleKey: null, title: "Bingo",
    hintKey: "sp.index.bingo.what", hint: "Vocabulary bingo with a different card for every student, 4 × 4 or 5 × 5.",
    mascot: "hamsti", extra: "karten", levels: ["A1", "A2", "B1", "B2"] },
  { id: "domino", href: "/insegnanti/giochi/domino",
    titleKey: null, title: "Domino",
    hintKey: "sp.index.domino.what", hint: "A closed chain to cut out: il / lo / la, plural, or word ↔ meaning.",
    mascot: "quaki", extra: "pokal", levels: ["A1", "A2", "B1", "B2"] },
  { id: "erklaeren", href: "/insegnanti/giochi/spiega",
    titleKey: "sp.erklaeren.title", title: "Explain the word",
    hintKey: "sp.index.erklaeren.what", hint: "Taboo-style speaking cards, eight per page, with forbidden words where there are any.",
    mascot: "regi", extra: "megafon", levels: ["A1", "A2", "B1", "B2"] },
];

/** The chips that can match something. */
export const usedTags = GAME_TAGS.filter((t) => soloGames.some((g) => g.practises.includes(t.id)));
export const usedLevels = GAME_LEVELS.filter((l) => soloGames.some((g) => g.levels.includes(l)));

/** Today as YYYY-MM-DD in UTC: the same day for every visitor at the same moment. */
export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** The game of the day: one solo game, picked from the date, the same for everyone that day.
 *  FNV-1a over the date, so neighbouring days don't simply walk through the list. */
export function gameOfTheDay(d = new Date()) {
  if (!soloGames.length) return null;
  let h = 0x811c9dc5;
  for (const ch of `game-of-the-day:${dayKey(d)}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return soloGames[h % soloGames.length];
}
