// The order a class meets the grammar topics in, not the order of the files on disk: gender
// and articles before ser and estar, the present before the past tenses, the imperfect
// subjunctive before unreal conditions.
// The Grammatik books print their chapters in this order (scripts/generate-grammatik-pdf.mjs),
// and /conhecimentos names a book's first chapter from it, so the two agree on "Chapter 1".
// It is src/data/grammatik-lehrplan.json flattened (ids, not slugs: verben-praepositionen is
// `id: "praepositionen"`); keep the two in step when the syllabus changes.
export const GRAMMATIK_ORDER = [
  // A1
  "personalpronomen", "nomen", "artikel", "plural", "verb-position-2", "adjektive-nach-sein",
  "zahlen", "praesens", "konjugation", "praeteritum-sein-haben", "ja-nein-fragen", "w-fragen",
  "berufe-mit-in", "possessivartikel", "welcher-dieser", "gern", "temporale-praepositionen",
  "aduso",
  // A2
  "reflexive-verben", "positionsadverbien", "trennbare-verben", "komposita", "perfekt",
  "zusammengesetzte-verben", "n-deklination", "modalverben", "akkusativ", "dativ",
  "konjunktiv2-hoeflich", "komparativ-superlativ", "lokale-praepositionen",
  "wechselpraepositionen", "indefinitpronomen", "satzstellung", "negation", "artikel-oder-nicht",
  "adjektivdeklination-a2", "ordinalzahlen", "nebensaetze-weil-dass",
  // B1
  "zustandspassiv", "praeteritum-plusquamperfekt", "passiv-b1", "partizip-als-adjektiv",
  "temporale-praepositionen-b1", "lassen", "futur", "funktionen-von-werden", "imperativ",
  "infinitiv-mit-zu", "verben-als-nomen", "infinitiv-ohne-zu", "finalsaetze",
  "temporale-nebensaetze", "konditionalsaetze", "relativpronomen", "indirekte-fragen",
  "clitic-placement", "konnektoren-grund-gegengrund", "als-oder-wenn", "praepositionen",
  "da-wo-woerter", "positionsverben", "nutzen-benutzen", "genitiv", "adjektivdeklination",
  "adjektive-als-nomen",
  // B2
  "konjunktiv2", "modalsaetze", "zweiteilige-konnektoren", "konsekutivsaetze", "negationswoerter",
  "irgend", "relativsaetze-was-wo", "zumal-wohingegen", "passiv", "fokuspartikeln",
  "nomen-verb-verbindungen", "adjektive-mit-praepositionen", "modalpartikeln",
  // C1
  "konjunktiv-1", "irreale-vergleiche", "passiversatz", "es-korrelat", "subjektive-modalverben",
  "futur-2", "mesoclise", "mais-que-perfeito-simples", "partizipialattribute",
  "nominale-praepositionen", "nominalisierung", "textkohaerenz", "verbpraefixe",
];

/** A topic's place in that order; unlisted topics go last. */
export const orderOf = (t) => (GRAMMATIK_ORDER.includes(t.id) ? GRAMMATIK_ORDER.indexOf(t.id) : GRAMMATIK_ORDER.length);
