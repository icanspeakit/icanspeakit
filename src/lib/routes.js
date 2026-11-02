// The flat URL structure (2026-09-24) and the way from the old one to it.
//
// Before: /uebungen/grammatik/artikel, /uebungen/hoeren/<id>, /pruefungen/telc …
// After:  /artikel, /hoeren/<id>, /telc …
//
// Grammar topics sit at the top level because every one of their names is unique and is
// what a learner would type. Everything with generic ids (Hören, Lesen, Kultur, Sprechen,
// Schreiben, the ~500 Wortschatz sets) keeps one level of section, so "/a1-supermarkt" can
// never collide with a topic added later. The hubs /uebungen and /pruefungen stay.
//
// One table, used twice: astro.config.mjs turns it into 301 redirects, and progress.js
// rewrites "where I was" entries saved in a browser before the move.

export const SECTIONS = [
  "wortschatz", "hoeren", "kultur", "lesen-schreiben", "lesen", "schreiben", "sprechen-b1b2", "sprechen",
  "aussprache-check", "aussprache", "fertigkeiten", "praepositionen",
];
export const EXAMS = ["telc", "goethe", "testdaf", "dtz", "leben-in-deutschland", "start-deutsch-1"];

/** An old path → its new path (unchanged when it was not moved). */
export function flattenPath(path) {
  if (typeof path !== "string") return path;
  let m;
  if ((m = path.match(/^\/uebungen\/grammatik\/(quiz|lauf)(\/.*)?$/))) return `/grammatik/${m[1]}${m[2] ?? ""}`;
  if ((m = path.match(/^\/uebungen\/grammatik\/(.+)$/))) return `/${m[1]}`;
  if (path === "/uebungen/grammatik") return "/grammatik";
  if (path === "/uebungen/artikel-trainer") return "/artikel";
  if ((m = path.match(/^\/uebungen\/([a-z0-9-]+)(\/.*)?$/)) && SECTIONS.includes(m[1])) return `/${m[1]}${m[2] ?? ""}`;
  if ((m = path.match(/^\/pruefungen\/([a-z0-9-]+)(\/.*)?$/)) && EXAMS.includes(m[1])) return `/${m[1]}${m[2] ?? ""}`;
  return path;
}

/** Pages that are hubs or overviews — places you pass through, not places you resume. */
export const NOT_RESUMABLE = new Set(["/", "/exercises", "/exams", "/progress", "/grammar", "/knowledge", "/teachers", "/game",
  "/anmelden", "/passwort-neu", "/legal-notice", "/privacy", "/terms", "/placement-test", "/account",
  "/listening", "/reading", "/writing", "/speaking", "/culture", "/vocabulary", "/skills"]);

/**
 * The redirects, in the shape astro.config.mjs wants. Dynamic entries keep their params
 * (Astro and the Vercel adapter both support that for static output); the fixed ones
 * cover pages without an [id]. A #hash (e.g. #aktiv) survives a redirect in every browser.
 */
export function legacyRedirects() {
  const r = {
    "/uebungen/grammatik": "/grammatik",
    "/uebungen/grammatik/quiz": "/grammatik/quiz",
    "/uebungen/grammatik/lauf": "/grammatik/lauf",
    "/uebungen/grammatik/akkusativ": "/akkusativ",
    "/uebungen/grammatik/[id]": "/[id]",
    "/uebungen/wortschatz/[deck]": "/wortschatz/[deck]",
    "/uebungen/kultur/quiz": "/kultur/quiz",
    // The old DTZ trainer: its three pictures live in the Bildserien now, two of them here.
    "/uebungen/sprechen/dtz-bildbeschreibung": "/sprechen/set/a2-unterwegs",
    "/sprechen/dtz-bildbeschreibung": "/sprechen/set/a2-unterwegs",
    "/uebungen/sprechen/set/[id]": "/sprechen/set/[id]",
    "/uebungen/artikel-trainer": "/artikel",
  };
  for (const s of SECTIONS) r[`/uebungen/${s}`] = `/${s}`;
  for (const s of ["hoeren", "kultur", "lesen", "schreiben", "sprechen"]) r[`/uebungen/${s}/[id]`] = `/${s}/[id]`;
  for (const e of EXAMS) r[`/pruefungen/${e}`] = `/${e}`;
  r["/pruefungen/telc/sprachbausteine"] = "/telc/sprachbausteine";
  r["/pruefungen/testdaf/uebungssatz"] = "/testdaf/uebungssatz";
  r["/pruefungen/dtz/mock-test"] = "/dtz/mock-test";
  r["/pruefungen/dtz/uebungssatz"] = "/dtz/uebungssatz";
  r["/pruefungen/leben-in-deutschland/fakten"] = "/leben-in-deutschland/fakten";
  r["/pruefungen/leben-in-deutschland/test"] = "/leben-in-deutschland/test";
  // Straight to the English page, not through a second redirect.
  for (const k of Object.keys(r)) r[k] = englishPath(r[k]);
  return r;
}

// ── English routes (content-plan §6, `routes` run, 2026-11-02) ─────────────────────────────
//
// The German section and page names of the deutschacademy fork became English ones. One
// table of path prefixes, old → new:
//   - astro.config.mjs turns it into 301 redirects (every page under a renamed prefix, with
//     its [params]: englishRedirects() there),
//   - progress.js runs saved "where I was" paths through englishPath(),
//   - scripts/rename-routes.mjs used it once to move src/pages and rewrite the internal links.
// Only the URL changed. Data ids, file names under src/data, localStorage keys and the JSON
// endpoints' file names (woerter-a1.json …) stayed German, because code and saved progress
// key on them.
export const ROUTE_RENAMES = [
  // Grammar
  ["/grammatik/lauf", "/grammar/path"],
  ["/grammatik/verben", "/grammar/verbs"],
  ["/grammatik/wortarten", "/grammar/parts-of-speech"],
  ["/grammatik/typische-fehler", "/grammar/common-mistakes"],
  ["/grammatik/starke-schwache-verben", "/grammar/irregular-verbs"],
  ["/grammatik/trennbare-verben", "/grammar/phrasal-verbs-list"],
  ["/grammatik/verben-mit-praepositionen", "/grammar/verbs-with-prepositions"],
  ["/grammatik", "/grammar"],
  ["/akkusativ", "/object-pronouns"],
  ["/praepositionen", "/prepositions"],
  // Vocabulary and skills
  ["/wortschatz/redemittel", "/vocabulary/phrases"],
  ["/wortschatz/drucken", "/vocabulary/print"],
  ["/wortschatz/glossen", "/vocabulary/glosses"],
  ["/wortschatz", "/vocabulary"],
  ["/hoeren", "/listening"],
  ["/lesen-schreiben", "/reading-writing"],
  ["/lesen", "/reading"],
  ["/schreiben", "/writing"],
  ["/sprechen-b1b2", "/speaking-b1-b2"],
  ["/sprechen", "/speaking"],
  ["/aussprache-check", "/pronunciation-check"],
  ["/aussprache", "/pronunciation"],
  ["/satzmelodie/pruefen", "/intonation/check"],
  ["/satzmelodie", "/intonation"],
  ["/zungenbrecher", "/tongue-twisters"],
  // Start, progress, course
  ["/einstufungstest", "/placement-test"],
  ["/einfach", "/step-by-step"],
  ["/start-neu", "/start"],
  ["/fortschritt", "/progress"],
  ["/meine-fehler", "/my-mistakes"],
  ["/kursinhalte", "/syllabus"],
  ["/nachschlagewerk", "/reference"],
  ["/fertigkeiten", "/skills"],
  ["/uebungen", "/exercises"],
  ["/spiel", "/game"],
  ["/stunde", "/lesson"],
  ["/kartenset", "/card-set"],
  ["/umfrage", "/survey"],
  // Games
  ["/spiele/artikel-sprint", "/games/countable-sprint"],
  ["/spiele/buergeramt", "/games/front-desk"],
  ["/spiele/hochstapler", "/games/impostor"],
  ["/spiele/hoer-safari", "/games/listening-safari"],
  ["/spiele/knigge", "/games/manners"],
  ["/spiele/lindenau", "/games/brambleford"],
  ["/spiele/nussnacht", "/games/nut-night"],
  ["/spiele/quaki-springt", "/games/quaki-jumps"],
  ["/spiele/satzregen", "/games/sentence-rain"],
  ["/spiele", "/games"],
  // Exams
  ["/pruefungen/fallen", "/exams/traps"],
  ["/pruefungen", "/exams"],
  ["/pruefungsplan", "/exam-plan"],
  ["/goethe", "/cambridge"],
  ["/telc/sprachbausteine", "/cambridge/use-of-english"],
  ["/telc", "/trinity"],
  ["/dtz/uebungssatz", "/trinity/ise-1/practice-set"],
  ["/dtz", "/trinity/ise-1"],
  ["/testdaf/uebungssatz", "/ielts/practice-set"],
  ["/testdaf", "/ielts"],
  ["/start-deutsch-1", "/a1-test"],
  ["/leben-in-deutschland/fakten", "/life-in-the-uk/facts"],
  ["/leben-in-deutschland", "/life-in-the-uk"],
  // Culture and knowledge
  ["/kultur/fehler", "/culture/mistakes"],
  ["/kultur", "/culture"],
  ["/wissen/bildwoerterbuch", "/knowledge/picture-dictionary"],
  ["/wissen/dialekte", "/knowledge/accents"],
  ["/wissen/land-und-kultur", "/knowledge/country-and-culture"],
  ["/wissen/lernen", "/knowledge/learning"],
  ["/wissen/redewendungen", "/knowledge/idioms"],
  ["/wissen/sprachen", "/knowledge/languages"],
  ["/wissen/umgangssprache", "/knowledge/slang"],
  ["/wissen/wortfallen", "/knowledge/false-friends"],
  ["/wissen/wortgeschichte/pruefen", "/knowledge/word-stories/review"],
  ["/wissen/wortgeschichte/umstellen", "/knowledge/word-stories/weekly"],
  ["/wissen/wortgeschichte", "/knowledge/word-stories"],
  ["/wissen/zitate/karte", "/knowledge/quotes/card"],
  ["/wissen/zitate", "/knowledge/quotes"],
  ["/wissen", "/knowledge"],
  ["/entdecken/filme", "/explore/films"],
  ["/entdecken", "/explore"],
  // Teachers
  ["/lehrkraefte/arbeitsblaetter/grammatik", "/teachers/worksheets/grammar"],
  ["/lehrkraefte/arbeitsblaetter/wortschatz", "/teachers/worksheets/vocabulary"],
  ["/lehrkraefte/arbeitsblaetter/mappe", "/teachers/worksheets/folder"],
  ["/lehrkraefte/arbeitsblaetter", "/teachers/worksheets"],
  ["/lehrkraefte/karten/foto", "/teachers/cards/photo"],
  ["/lehrkraefte/karten/lernen", "/teachers/cards/learn"],
  ["/lehrkraefte/karten", "/teachers/cards"],
  ["/lehrkraefte/klassen/klasse", "/teachers/classes/class"],
  ["/lehrkraefte/klassen", "/teachers/classes"],
  ["/lehrkraefte/quiz-kapitel", "/teachers/quiz-chapters"],
  ["/lehrkraefte/quiz/erstellen", "/teachers/quiz/create"],
  ["/lehrkraefte/spiele/erklaeren", "/teachers/games/explain"],
  ["/lehrkraefte/spiele", "/teachers/games"],
  ["/lehrkraefte/stundenplan", "/teachers/timetable"],
  ["/lehrkraefte/tests/ergebnis", "/teachers/tests/result"],
  ["/lehrkraefte/umfragen/ergebnis", "/teachers/surveys/result"],
  ["/lehrkraefte/umfragen", "/teachers/surveys"],
  ["/lehrkraefte/unterricht", "/teachers/lesson"],
  ["/lehrkraefte", "/teachers"],
  // Work, about, legal
  ["/berufe", "/english-for-work"],
  ["/maskottchen", "/mascots"],
  ["/ueber-mich", "/about"],
  ["/beitreten", "/join"],
  ["/datenschutz", "/privacy"],
  ["/nutzungsbedingungen", "/terms"],
  ["/impressum", "/legal-notice"],
];

// Grammar topics live at the top level (/<slug>). Their key (the workspace's `slug ?? id`,
// what progress, lehrplan and verwandt use) stayed German; only the URL is English
// (content-plan §3 "New slug"). topicPath(key) is the one way from a key to its URL.
export const TOPIC_SLUGS = {
  // A1
  nomen: "nouns", artikel: "articles", personalpronomen: "pronouns-and-be", akkusativ: "object-pronouns",
  praesens: "present-simple", "verb-position-2": "word-order", "w-fragen": "wh-questions",
  "ja-nein-fragen": "yes-no-questions", plural: "plurals", possessivartikel: "possessives",
  imperativ: "imperatives", "temporale-praepositionen": "prepositions-of-time", aduso: "and-but-or-so",
  "adjektive-nach-sein": "adjectives", "berufe-mit-in": "there-is-there-are", gern: "like-doing",
  "praeteritum-sein-haben": "was-were", wortarten: "parts-of-speech", zahlen: "numbers",
  // A2
  konjugation: "present-continuous", perfekt: "past-simple", "welcher-dieser": "this-that",
  modalverben: "modal-verbs", "komparativ-superlativ": "comparatives-superlatives",
  "lokale-praepositionen": "prepositions-of-place", wechselpraepositionen: "prepositions-of-movement",
  dativ: "two-objects", indefinitpronomen: "some-any", satzstellung: "much-many", negation: "negatives",
  "nebensaetze-weil-dass": "because-so-that", "konjunktiv2-hoeflich": "polite-requests",
  positionsadverbien: "adverbs-of-frequency", "adjektivdeklination-a2": "adverbs-of-manner",
  "artikel-oder-nicht": "the-or-no-article", "reflexive-verben": "reflexive-pronouns",
  "trennbare-verben": "phrasal-verbs", komposita: "compound-nouns", ordinalzahlen: "ordinal-numbers-dates",
  // B1
  futur: "future-forms", "zusammengesetzte-verben": "present-perfect", zustandspassiv: "present-perfect-continuous",
  "praeteritum-plusquamperfekt": "narrative-tenses", "n-deklination": "used-to", konditionalsaetze: "conditionals",
  "passiv-b1": "passive-basics", relativpronomen: "relative-clauses", "funktionen-von-werden": "reported-speech",
  "indirekte-fragen": "indirect-questions", "infinitiv-mit-zu": "verb-ing-or-to", "verben-als-nomen": "gerunds",
  "infinitiv-ohne-zu": "make-let-help", lassen: "have-something-done", finalsaetze: "purpose",
  "temporale-nebensaetze": "time-clauses", "als-oder-wenn": "when-or-if",
  "temporale-praepositionen-b1": "for-since-ago", "konnektoren-grund-gegengrund": "contrast-linkers",
  genitiv: "s-or-of", adjektivdeklination: "adjective-order", "partizip-als-adjektiv": "ed-ing-adjectives",
  "verben-praepositionen": "verbs-prepositions", "da-wo-woerter": "prepositions-at-the-end",
  "nutzen-benutzen": "make-or-do", positionsverben: "confusing-verbs", "wortbildung-nomen": "noun-suffixes",
  "adjektive-als-nomen": "the-adjective-one",
  // B2
  konjunktiv2: "third-conditional-wish", passiv: "passive", "relativsaetze-was-wo": "non-defining-relatives",
  modalsaetze: "modals-of-deduction", konsekutivsaetze: "so-such-too-enough",
  "zweiteilige-konnektoren": "paired-conjunctions", "zumal-wohingegen": "formal-linkers",
  negationswoerter: "negative-words", irgend: "ever-words", fokuspartikeln: "focus-adverbs",
  modalpartikeln: "discourse-markers", "adjektive-mit-praepositionen": "adjectives-prepositions",
  "nomen-verb-verbindungen": "collocations",
  // C1
  "konjunktiv-1": "distancing", "es-korrelat": "cleft-sentences", passiversatz: "inversion",
  "futur-2": "future-perfect", "irreale-vergleiche": "unreal-past", "subjektive-modalverben": "modal-perfects",
  "nominale-praepositionen": "formal-prepositions", nominalisierung: "nominalisation",
  partizipialattribute: "participle-clauses", textkohaerenz: "cohesion", verbpraefixe: "verb-prefixes",
};
const TOPIC_KEYS = Object.fromEntries(Object.entries(TOPIC_SLUGS).map(([k, v]) => [v, k]));

/** A grammar topic's URL slug (English) from its key (German id / slug). Unknown keys pass through. */
export const topicSlug = (key) => TOPIC_SLUGS[key] ?? key;
/** A grammar topic's key from its URL slug. Unknown slugs pass through. */
export const topicKeyFromSlug = (slug) => TOPIC_KEYS[slug] ?? slug;
/** The page of a grammar topic. */
export const topicPath = (key) => `/${topicSlug(key)}`;

// The reference tables under /grammar/<ref> (src/data/nachschlagen/<file>.json). The file
// names stayed; the URL is English. Same pairs as in ROUTE_RENAMES.
export const REF_SLUGS = {
  "starke-schwache-verben": "irregular-verbs",
  "trennbare-verben": "phrasal-verbs-list",
  "verben-mit-praepositionen": "verbs-with-prepositions",
};
/** A reference table's URL slug from its file name. */
export const refSlug = (file) => REF_SLUGS[file] ?? file;
/** The page of a reference table. */
export const refPath = (file) => `/grammar/${refSlug(file)}`;

// Teachers' worksheets and tandem sheets per topic: keyed like the topic (plus the
// reference sheets nachschlagen-<file>, verbtabellen, typische-fehler); the URL is English.
const SHEET_SLUGS = { verbtabellen: "verb-tables", "typische-fehler": "common-mistakes" };
/** A worksheet's URL slug from its key. */
export const sheetSlug = (key) =>
  String(key).startsWith("nachschlagen-") ? `reference-${refSlug(String(key).slice("nachschlagen-".length))}`
    : SHEET_SLUGS[key] ?? topicSlug(key);
/** The worksheet page of a topic key. */
export const sheetPath = (key) => `/teachers/worksheets/grammar/${sheetSlug(key)}`;
/** The tandem (pair work) sheet of a topic key. */
export const tandemPath = (key) => `/teachers/worksheets/tandem/${sheetSlug(key)}`;
/** Every worksheet key whose URL changed (for the redirects). */
export const sheetKeys = () => [
  ...Object.keys(TOPIC_SLUGS), ...Object.keys(SHEET_SLUGS), ...Object.keys(REF_SLUGS).map((f) => `nachschlagen-${f}`),
].filter((k) => sheetSlug(k) !== k);

// The exam families: registry ids (localStorage keys, set.exam) stayed; their pages moved.
export const EXAM_PATHS = {
  goethe: "/cambridge", telc: "/trinity", dtz: "/trinity/ise-1", testdaf: "/ielts",
  "leben-in-deutschland": "/life-in-the-uk", "start-deutsch-1": "/a1-test",
};
/** The overview page of an exam family (registry id → path). */
export const examPath = (exam) => EXAM_PATHS[exam] ?? `/${exam}`;
/** The exam family (registry id) a path belongs to, or null. Longest path first (/trinity/ise-1 is dtz). */
export function examOfPath(path) {
  const hit = Object.entries(EXAM_PATHS).sort((a, b) => b[1].length - a[1].length)
    .find(([, p]) => path === p || path.startsWith(p + "/"));
  return hit ? hit[0] : null;
}

function renameOf(path, pairs) {
  for (const [from, to] of pairs) {
    if (path === from || ["/", "?", "#"].includes(path[from.length]) && path.startsWith(from)) {
      return to + path.slice(from.length);
    }
  }
  return null;
}
const BY_OLD = [...ROUTE_RENAMES].sort((a, b) => b[0].length - a[0].length);
const BY_NEW = ROUTE_RENAMES.map(([a, b]) => [b, a]).sort((a, b) => b[0].length - a[0].length);

/**
 * Any old (German) path → its English path: the older flat-URL moves (flattenPath), the
 * section renames, then a grammar topic at the top level (/praesens → /present-simple).
 * Paths that did not move come back unchanged.
 */
export function englishPath(path) {
  if (typeof path !== "string" || !path.startsWith("/")) return path;
  const p = flattenPath(path);
  const renamed = renameOf(p, BY_OLD);
  if (renamed) return renamed;
  const m = p.match(/^\/([a-z0-9-]+)([?#].*)?$/);
  if (m && TOPIC_SLUGS[m[1]] && m[1] !== TOPIC_SLUGS[m[1]]) return `/${TOPIC_SLUGS[m[1]]}${m[2] ?? ""}`;
  return p;
}

/** An English path → the German path it replaced (for the redirects). Unchanged when nothing matched. */
export function germanPath(path) {
  return renameOf(path, BY_NEW) ?? path;
}
