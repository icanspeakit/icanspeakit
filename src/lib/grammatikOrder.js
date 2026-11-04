// The order a class meets the grammar topics in, not the order of the files on disk: gender
// and articles before ser and estar, the present before the past tenses, the imperfect
// subjunctive before unreal conditions.
// The Grammatik books print their chapters in this order (scripts/generate-grammatik-pdf.mjs),
// and /knowledge names a book's first chapter from it, so the two agree on "Chapter 1".
// It is src/data/grammatik-lehrplan.json flattened (ids, not slugs: verben-praepositionen is
// `id: "praepositionen"`); keep the two in step when the syllabus changes.
export const GRAMMATIK_ORDER = [
  // A1
  "personalpronomen", "nomen", "artikel", "plural", "verb-position-2", "adjektive-nach-sein",
  "zahlen", "ja-nein-fragen", "w-fragen", "praesens", "konjugation", "praeteritum-sein-haben",
  "berufe-mit-in", "possessivartikel", "welcher-dieser", "gern", "temporale-praepositionen", "aduso",
  // A2
  "reflexive-verben", "positionsadverbien", "trennbare-verben", "komposita", "perfekt",
  "zusammengesetzte-verben", "n-deklination", "akkusativ", "dativ", "modalverben",
  "konjunktiv2-hoeflich", "komparativ-superlativ", "satzstellung", "indefinitpronomen", "negation",
  "artikel-oder-nicht", "adjektivdeklination-a2", "lokale-praepositionen", "wechselpraepositionen",
  "ordinalzahlen", "nebensaetze-weil-dass",
  // B1
  "zustandspassiv", "praeteritum-plusquamperfekt", "passiv-b1", "temporale-praepositionen-b1",
  "lassen", "futur", "funktionen-von-werden", "konditionalsaetze", "imperativ", "infinitiv-mit-zu",
  "verben-als-nomen", "infinitiv-ohne-zu", "finalsaetze", "temporale-nebensaetze", "relativpronomen",
  "indirekte-fragen", "konnektoren-grund-gegengrund", "als-oder-wenn", "praepositionen", "da-wo-woerter",
  "positionsverben", "nutzen-benutzen", "partizip-als-adjektiv", "genitiv", "adjektivdeklination",
  "adjektive-als-nomen",
  // B2
  "konjunktiv2", "modalsaetze", "zweiteilige-konnektoren", "konsekutivsaetze", "relativsaetze-was-wo",
  "zumal-wohingegen", "passiv", "irgend", "negationswoerter", "fokuspartikeln",
  "adjektive-mit-praepositionen", "nomen-verb-verbindungen", "modalpartikeln",
  // C1
  "konjunktiv-1", "irreale-vergleiche", "passiversatz", "subjektive-modalverben", "futur-2",
  "es-korrelat", "partizipialattribute", "nominale-praepositionen", "nominalisierung",
  "textkohaerenz", "verbpraefixe",
];

/** A topic's place in that order; unlisted topics go last. */
export const orderOf = (t) => (GRAMMATIK_ORDER.includes(t.id) ? GRAMMATIK_ORDER.indexOf(t.id) : GRAMMATIK_ORDER.length);
