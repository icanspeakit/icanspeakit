// The order a class meets the grammar topics in, not the order of the files on disk: be and
// nouns before the present simple, the present simple before questions, the past simple
// before the present perfect, the passive before have something done.
// The Grammatik books print their chapters in this order (scripts/generate-grammatik-pdf.mjs),
// and /wissen names a book's first chapter from it, so the two agree on "Chapter 1".
// It is src/data/grammatik-lehrplan.json flattened (ids, not slugs: verben-praepositionen is
// `id: "praepositionen"`); keep the two in step when the syllabus changes.
export const GRAMMATIK_ORDER = [
  "personalpronomen", "nomen", "artikel", "plural", "welcher-dieser", "possessivartikel",
  "adjektive-nach-sein", "berufe-mit-in", "zahlen", "praesens", "verb-position-2",
  "ja-nein-fragen", "w-fragen", "akkusativ", "gern", "imperativ", "temporale-praepositionen",
  "aduso", "praeteritum-sein-haben", "positionsadverbien", "konjugation", "perfekt", "negation",
  "satzstellung", "indefinitpronomen", "artikel-oder-nicht", "komparativ-superlativ",
  "adjektivdeklination-a2", "modalverben", "konjunktiv2-hoeflich", "lokale-praepositionen",
  "wechselpraepositionen", "ordinalzahlen", "dativ", "reflexive-verben", "nebensaetze-weil-dass",
  "trennbare-verben", "zusammengesetzte-verben", "temporale-praepositionen-b1", "zustandspassiv",
  "praeteritum-plusquamperfekt", "n-deklination", "futur", "temporale-nebensaetze",
  "als-oder-wenn", "konditionalsaetze", "infinitiv-mit-zu", "verben-als-nomen", "finalsaetze",
  "infinitiv-ohne-zu", "relativpronomen", "passiv-b1", "lassen", "funktionen-von-werden",
  "indirekte-fragen", "konnektoren-grund-gegengrund", "praepositionen", "da-wo-woerter",
  "partizip-als-adjektiv", "adjektivdeklination", "adjektive-als-nomen", "genitiv",
  "nutzen-benutzen", "positionsverben", "konjunktiv2", "modalsaetze", "passiv",
  "relativsaetze-was-wo", "konsekutivsaetze", "zweiteilige-konnektoren", "zumal-wohingegen",
  "adjektive-mit-praepositionen", "nomen-verb-verbindungen", "negationswoerter", "irgend",
  "fokuspartikeln", "modalpartikeln", "subjektive-modalverben", "futur-2", "irreale-vergleiche",
  "konjunktiv-1", "passiversatz", "es-korrelat", "partizipialattribute", "nominalisierung",
  "nominale-praepositionen", "textkohaerenz", "verbpraefixe",
];

/** A topic's place in that order; unlisted topics go last. */
export const orderOf = (t) => (GRAMMATIK_ORDER.includes(t.id) ? GRAMMATIK_ORDER.indexOf(t.id) : GRAMMATIK_ORDER.length);
