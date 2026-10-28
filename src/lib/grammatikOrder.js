// The order a class meets the grammar topics in, not the order of the files on disk: nouns
// and the present tense before questions, Akkusativ before the Possessivartikel tables that
// already use "meinen", Dativ before Wechselpräpositionen, Passiv before the Partizip.
// The Grammatik books print their chapters in this order (scripts/generate-grammatik-pdf.mjs),
// and /wissen names a book's first chapter from it, so the two agree on "Kapitel 1".
export const GRAMMATIK_ORDER = [
  "artikel", "plural", "praesens", "w-fragen", "ja-nein-fragen", "imperativ", "akkusativ", "possessivartikel",
  "trennbare-verben", "modalverben", "negation", "perfekt", "dativ", "wechselpraepositionen", "satzstellung", "konjugation",
  "adjektivdeklination", "n-deklination", "praeteritum-plusquamperfekt", "als-oder-wenn", "indirekte-fragen", "relativpronomen", "praepositionen", "infinitiv-mit-zu",
  "passiv", "partizip-als-adjektiv", "konjunktiv2", "zweiteilige-konnektoren", "negationswoerter", "fokuspartikeln", "irgend", "nomen-verb-verbindungen",
];

/** A topic's place in that order; unlisted topics go last. */
export const orderOf = (t) => (GRAMMATIK_ORDER.includes(t.id) ? GRAMMATIK_ORDER.indexOf(t.id) : GRAMMATIK_ORDER.length);
