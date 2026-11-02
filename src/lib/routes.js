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

// Item pages under a section (content-plan §1.3: "kebab-case of the English title, keep any
// level prefix"). Keyed by the section's English path, then by the item's id, which stays
// the key in the data, in progress and in class-task refs (h:<id>, l:<id>, k:<id> …).
export const ITEM_SLUGS = {
  "/listening": {
    "a1-ansage-bahnhof": "a1-station-announcement", "a1-anruf-arzt": "a1-doctors-voicemail",
    "a1-supermarkt": "a1-supermarket", "a1-verabredung": "a1-arranging-to-meet",
    "a2-amt-termin": "a2-council-appointment", "a2-wohnungsbesichtigung": "a2-flat-viewing",
    "a2-radio-wetter-verkehr": "a2-radio-weather-traffic", "a2-paketdienst": "a2-parcel-voicemails",
    "b1-krankmeldung": "b1-calling-in-sick", "b1-elterngespraech": "b1-parents-evening",
    "b1-radio-muelltrennung": "b1-radio-recycling", "b1-durchsage-ersatzverkehr": "b1-replacement-buses",
    "b2-diskussion-homeoffice": "b2-working-from-home-meeting", "b2-interview-anerkennung": "b2-qualifications-interview",
    "b2-beschwerde-versicherung": "b2-insurance-complaint", "b2-vortrag-ehrenamt": "b2-volunteering-talk",
  },
  "/reading": {
    "a1-schilder-im-haus": "a1-notices-in-flats", "a1-nachricht-einladung": "a1-text-invitation",
    "a2-wohnungsanzeigen": "a2-flat-adverts", "a2-email-kurs-absage": "a2-language-school-email",
    "b1-digitales-buero": "b1-paperless-office", "b1-anzeigen": "b1-matching-adverts",
    "b1-zeitungsartikel": "b1-newspaper-article", "b1-forumsbeitraege": "b1-forum-posts",
    "b2-artikel-homeoffice": "b2-working-from-home-article", "b2-kommentare-innenstadt": "b2-car-free-town-centre",
  },
  "/writing": {
    "a1-formular-anmeldung": "a1-leisure-centre-form", "a1-nachricht-absage": "a1-cant-come",
    "a2-email-nachbarn": "a2-email-to-neighbour", "a2-formular-arztpraxis": "a2-gp-appointment-form",
    "b1-formular-vhs": "b1-completing-a-form", "b1-brief-david": "b1-reply-to-david",
    "b1-fehlerjagd": "b1-error-hunt", "b2-beschwerde-reiseveranstalter": "b2-holiday-complaint",
  },
  "/speaking": {
    "a1-sich-vorstellen": "a1-introducing-yourself", "a1-bild-bahnhof": "a1-picture-station",
    "a1-bild-kueche": "a1-picture-kitchen", "a1-bild-supermarkt": "a1-picture-supermarket",
    "a1-bild-spielplatz": "a1-picture-park", "a2-bild-gartenarbeit": "a2-picture-outdoor-work",
    "a2-bild-bus": "a2-picture-bus", "a2-bild-nachbarschaftsfest": "a2-picture-garden-meal",
    "a2-bild-wartezimmer": "a2-picture-doctors", "b1-bild-rolltreppe": "b1-picture-park",
    "b1-bild-bewerbungsgespraech": "b1-picture-job-interview", "b1-bild-werkstatt": "b1-picture-workshop",
    "b1-bild-buergeramt": "b1-picture-front-desk", "b2-vortrag-ehrenamt": "b2-talk-volunteering",
    "b2-diskussion-ehrenamt-schule": "b2-discussion-volunteering-school", "b2-planen-abschiedsfeier": "b2-planning-leaving-party",
    "b2-bild-wochenmarkt": "b2-picture-market", "b2-bild-videokonferenz": "b2-picture-video-call",
    "b2-bild-baustelle-innenstadt": "b2-picture-building-work", "b2-bild-wertstoffhof": "b2-picture-recycling-centre",
  },
  "/speaking/set": {
    "a1-zuhause": "a1-at-home", "a2-unterwegs": "a2-out-and-about", "b1-arbeit": "b1-work", "b2-gesellschaft": "b2-society",
  },
  "/culture": {
    "duzen-siezen": "names-and-titles", pfand: "queuing", sonntagsruhe: "sunday-trading", trinkgeld: "tipping",
    bundeslaender: "four-nations", feiertage: "bank-holidays", muelltrennung: "recycling", termine: "appointments",
    anmeldung: "first-steps", krankenversicherung: "nhs", mieten: "renting", schulsystem: "school-system",
    "arbeit-finden": "finding-a-job", ausbildung: "apprenticeships-and-university", kuendigung: "resigning-and-notice",
    "oeffentlich-rechtlicher-rundfunk": "bbc-and-tv-licence", vereine: "clubs-and-volunteering",
    foederalismus: "devolution", sozialversicherung: "national-insurance", wahlen: "general-elections",
    erinnerungskultur: "remembrance", grundgesetz: "constitution", mitbestimmung: "trade-unions",
  },
  "/culture/insider": {
    "hallo-sagen": "saying-hello", "naehe-abstand": "personal-space", "hoefliche-notluegen": "sorry-please-thank-you",
    puenktlichkeit: "being-on-time", "zusammen-oder-getrennt": "paying-the-bill", "leute-kennenlernen": "small-talk",
    "freunde-finden": "making-friends", "arbeit-finden": "how-hiring-works", "deutschland-und-das-auto": "cars-and-driving",
    gleichberechtigung: "women-and-men-at-work", "erstes-date": "dating", direktheit: "understatement",
    vertrauen: "banter-and-humour",
  },
  "/vocabulary/phrases": {
    zustimmen: "agreeing", widersprechen: "disagreeing", zweifeln: "doubt", troesten: "comforting",
    meinung: "opinions", nachfragen: "checking-understanding", bitten: "asking-for-help", entschuldigen: "apologising",
    danken: "thanking", vorschlagen: "suggestions", gratulieren: "congratulating", begruessen: "greetings",
    bildbeschreibung: "describing-pictures", "wo-ist-der-ball": "wheres-the-ball",
  },
  // English for work: the sectors; their word groups are WORK_GROUP_SLUGS (one table for
  // all sectors, because the group ids repeat: taetigkeiten, ablaeufe, kunden-team …).
  "/english-for-work": {
    "bau-handwerk": "construction", buero: "office", einzelhandel: "retail", "elektro-technik": "electrical-and-plumbing",
    gastronomie: "restaurants", hotel: "hotels", kita: "childcare", kraftfahrer: "driving",
    "lager-logistik": "warehouse", pflege: "care-work",
  },
};
export const WORK_GROUP_SLUGS = {
  "baustelle-werkzeug": "site-and-tools", taetigkeiten: "tasks", ablaeufe: "workflow", sicherheit: "safety",
  "kunden-team": "customers-and-team", "buero-geraete": "office-and-equipment", datenschutz: "data-protection",
  "kasse-laden": "till-and-shop-floor", "bauteile-geraete": "parts-and-equipment", "kueche-geraete": "kitchen-and-equipment",
  "hygiene-sicherheit": "hygiene-and-safety", "gaeste-team": "guests-and-team", "rezeption-zimmer": "reception-and-rooms",
  "sicherheit-hygiene": "safety-and-cleaning", "kita-material": "nursery-and-materials", tagesablauf: "nursery-day",
  "sicherheit-gesundheit": "safety-and-health", "eltern-team": "parents-and-team", fahrzeug: "vehicle",
  "sicherheit-regeln": "safety-and-rules", "lager-geraete": "warehouse-and-equipment", team: "team",
  "pflege-kurz": "first-words",
};
const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const ITEM_KEYS = Object.fromEntries(Object.entries(ITEM_SLUGS).map(([s, m]) => [s, invert(m)]));
const WORK_GROUP_KEYS = invert(WORK_GROUP_SLUGS);
const ITEM_SECTIONS = Object.keys(ITEM_SLUGS).sort((a, b) => b.length - a.length);

/** An item's URL slug in a section (English path, e.g. "/listening"). Unknown ids pass through. */
export const itemSlug = (section, id) => ITEM_SLUGS[section]?.[id] ?? id;
/** An item's id from its URL slug. Unknown slugs pass through. */
export const itemKey = (section, slug) => ITEM_KEYS[section]?.[slug] ?? slug;
/** The page of an item. */
export const itemPath = (section, id) => `${section}/${itemSlug(section, id)}`;
/** A work sector, or one word group of it. */
export const workPath = (sector, group) =>
  `/english-for-work/${itemSlug("/english-for-work", sector)}${group ? `/${WORK_GROUP_SLUGS[group] ?? group}` : ""}`;
/** A work group's id from its URL slug. */
export const workGroupKey = (slug) => WORK_GROUP_KEYS[slug] ?? slug;

// "/listening/a1-ansage-bahnhof/x" ⇄ "/listening/a1-station-announcement/x" (English section paths).
function mapItem(path, toSlug) {
  for (const section of ITEM_SECTIONS) {
    if (!path.startsWith(section + "/")) continue;
    const [seg, ...rest] = path.slice(section.length + 1).split("/");
    const [id, tail = ""] = seg.split(/(?=[?#])/);
    const table = toSlug ? ITEM_SLUGS[section] : ITEM_KEYS[section];
    if (!table[id]) continue;
    let more = rest;
    if (section === "/english-for-work" && rest.length) {
      const [g, ...r2] = rest;
      const [gid, gtail = ""] = g.split(/(?=[?#])/);
      more = [((toSlug ? WORK_GROUP_SLUGS : WORK_GROUP_KEYS)[gid] ?? gid) + gtail, ...r2];
    }
    return [section, table[id] + tail, ...more].join("/");
  }
  return path;
}

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
 * section renames and item slugs (/hoeren/a1-ansage-bahnhof → /listening/a1-station-announcement),
 * then a grammar topic at the top level (/praesens → /present-simple).
 * Paths that did not move come back unchanged.
 */
export function englishPath(path) {
  if (typeof path !== "string" || !path.startsWith("/")) return path;
  const p = flattenPath(path);
  const renamed = renameOf(p, BY_OLD);
  if (renamed) return mapItem(renamed, true);
  const m = p.match(/^\/([a-z0-9-]+)([?#].*)?$/);
  if (m && TOPIC_SLUGS[m[1]] && m[1] !== TOPIC_SLUGS[m[1]]) return `/${TOPIC_SLUGS[m[1]]}${m[2] ?? ""}`;
  return mapItem(p, true);
}

/**
 * An English path → the German path it replaced (for the redirects, and for the refs that
 * stayed German: versuche.js). Unchanged when nothing matched.
 */
export function germanPath(path) {
  const p = mapItem(path, false);
  return renameOf(p, BY_NEW) ?? p;
}
