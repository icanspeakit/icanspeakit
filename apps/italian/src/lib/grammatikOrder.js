// The order a class meets the grammar topics in, not the order of the files on disk: gender
// and articles before essere and stare, the present before the past tenses, the congiuntivo
// imperfetto before the periodo ipotetico.
// The Grammatik books print their chapters in this order (scripts/generate-grammatik-pdf.mjs),
// and /conoscenze names a book's first chapter from it, so the two agree on "Chapter 1".
// It is src/data/grammatik-lehrplan.json flattened (ids, not slugs: verben-praepositionen is
// `id: "praepositionen"`); keep the two in step when the syllabus changes.
export const GRAMMATIK_ORDER = [
  // A1
  "personalpronomen", "nomen", "artikel", "plural", "adjektive-nach-sein", "zahlen",
  "praeteritum-sein-haben", "verb-position-2", "berufe-mit-in", "praesens", "konjugation",
  "ja-nein-fragen", "w-fragen", "aduso", "possessivartikel", "welcher-dieser", "gern",
  "temporale-praepositionen",
  // A2
  "positionsadverbien", "negation", "lokale-praepositionen", "wechselpraepositionen",
  "artikel-oder-nicht", "ordinalzahlen", "modalverben", "konjunktiv2-hoeflich", "trennbare-verben",
  "komposita", "satzstellung", "indefinitpronomen", "komparativ-superlativ",
  "adjektivdeklination-a2", "nebensaetze-weil-dass", "perfekt", "zusammengesetzte-verben",
  "reflexive-verben", "n-deklination", "akkusativ", "dativ",
  // B1
  "zustandspassiv", "praeteritum-plusquamperfekt", "futur", "funktionen-von-werden",
  "konditionalsaetze", "imperativ", "passiv-b1", "als-oder-wenn", "da-wo-woerter",
  "infinitiv-mit-zu", "verben-als-nomen", "infinitiv-ohne-zu", "finalsaetze",
  "temporale-nebensaetze", "temporale-praepositionen-b1", "relativpronomen", "indirekte-fragen",
  "konnektoren-grund-gegengrund", "lassen", "genitiv", "partizip-als-adjektiv",
  "adjektivdeklination", "praepositionen", "positionsverben", "nutzen-benutzen",
  "adjektive-als-nomen",
  // B2
  "konjunktiv2", "modalsaetze", "zweiteilige-konnektoren", "konsekutivsaetze", "passiv",
  "relativsaetze-was-wo", "zumal-wohingegen", "negationswoerter", "irgend", "fokuspartikeln",
  "modalpartikeln", "adjektive-mit-praepositionen", "nomen-verb-verbindungen",
  // C1
  "konjunktiv-1", "irreale-vergleiche", "passiversatz", "subjektive-modalverben", "es-korrelat",
  "futur-2", "partizipialattribute", "nominale-praepositionen", "nominalisierung", "textkohaerenz",
  "verbpraefixe",
];

/** A topic's place in that order; unlisted topics go last. */
export const orderOf = (t) => (GRAMMATIK_ORDER.includes(t.id) ? GRAMMATIK_ORDER.indexOf(t.id) : GRAMMATIK_ORDER.length);
