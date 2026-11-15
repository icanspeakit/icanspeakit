// The order a class meets the grammar topics in, not the order of the files on disk: être/avoir
// and gender before the present, the passé composé before the imparfait, the plus-que-parfait
// before the full si system.
// The Grammatik books print their chapters in this order (scripts/generate-grammatik-pdf.mjs),
// and /savoirs names a book's first chapter from it, so the two agree on "Chapter 1".
// It is src/data/grammatik-lehrplan.json flattened (ids, not slugs: verben-praepositionen is
// `id: "praepositionen"`); keep the two in step when the syllabus changes.
export const GRAMMATIK_ORDER = [
  // A1
  "personalpronomen", "praeteritum-sein-haben", "nomen", "artikel", "plural", "adjektive-nach-sein",
  "zahlen", "praesens", "negation", "ja-nein-fragen", "w-fragen", "berufe-mit-in", "konjugation",
  "verb-position-2", "possessivartikel", "welcher-dieser", "gern", "temporale-praepositionen",
  "aduso",
  // A2
  "reflexive-verben", "positionsadverbien", "satzstellung", "artikel-oder-nicht",
  "trennbare-verben", "komposita", "perfekt", "zusammengesetzte-verben", "n-deklination",
  "negationswoerter", "akkusativ", "dativ", "imperativ", "modalverben", "konjunktiv2-hoeflich",
  "komparativ-superlativ", "indefinitpronomen", "adjektivdeklination-a2", "lokale-praepositionen",
  "wechselpraepositionen", "ordinalzahlen", "nebensaetze-weil-dass",
  // B1
  "praeteritum-plusquamperfekt", "temporale-praepositionen-b1", "da-wo-woerter", "zustandspassiv",
  "relativpronomen", "adjektive-als-nomen", "indirekte-fragen", "futur", "temporale-nebensaetze",
  "konditionalsaetze", "als-oder-wenn", "funktionen-von-werden", "infinitiv-mit-zu",
  "verben-als-nomen", "infinitiv-ohne-zu", "finalsaetze", "lassen", "konnektoren-grund-gegengrund",
  "genitiv", "passiv-b1", "adjektivdeklination", "praepositionen", "positionsverben",
  "nutzen-benutzen",
  // B2
  "modalsaetze", "konjunktiv2", "zumal-wohingegen", "zweiteilige-konnektoren", "konsekutivsaetze",
  "relativsaetze-was-wo", "partizip-als-adjektiv", "passiv", "fokuspartikeln", "irgend",
  "adjektive-mit-praepositionen", "nomen-verb-verbindungen", "modalpartikeln",
  // C1
  "futur-2", "konjunktiv-1", "passiversatz", "irreale-vergleiche", "subjektive-modalverben",
  "es-korrelat", "partizipialattribute", "nominalisierung", "nominale-praepositionen",
  "textkohaerenz", "verbpraefixe",
];

/** A topic's place in that order; unlisted topics go last. */
export const orderOf = (t) => (GRAMMATIK_ORDER.includes(t.id) ? GRAMMATIK_ORDER.indexOf(t.id) : GRAMMATIK_ORDER.length);
