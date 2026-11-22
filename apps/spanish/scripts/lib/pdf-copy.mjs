// Everything the downloadable PDFs say in their own voice, for this course.
//
// The generators (generate-grammar-pdf.mjs, generate-reference-pdf.mjs,
// generate-wordlist-pdf.mjs, generate-conjugation-pdf.mjs) hold layout and logic only; every
// sentence a reader sees that does not come from the course data is here. It is the Spanish
// twin of apps/english/scripts/lib/pdf-copy.mjs (same keys).
//
// Which language the shell speaks: the one the explanations are in. The course's rules,
// hints and word meanings are written in English (English is the base interface language, the
// other interface languages come as editions where a translation exists), and everything the
// book teaches, every example, table and exercise, is Spanish. So the labels around the
// teaching ("The rule", "Exercise") are English, and the Spanish shows where it is the subject:
// in the file names, the running heads and the cover eyebrow. Castilian Spanish (es-ES), with
// Latin American notes where the data has them.

export const COURSE = {
  name: "icanspeak Spanish",
  // Printed on every page and behind the QR codes. No protocol: it is read off paper.
  site: "icanspeak.it/espanol",
  siteUrl: "https://icanspeak.it/espanol",
  // The course's own name for itself, on the cover next to the English one.
  nameEs: "Español",
  // The language being taught, in the titles: "Spanish grammar A1".
  subject: "Spanish",
  rights:
    "Written by icanspeak Spanish from the course's own material. Nothing in it is copied from a coursebook " +
    "or an exam body. Free to download, print and share in class. No account, no cost.",
};

/** The footer line of every page but the cover: where the reader finds the matching page. */
export const footerLine = (path) => `${COURSE.site}${path} · © ${COURSE.name}`;

/** The file names (Spanish, like the URLs). `level` is "a1" … "c1". */
export const FILES = {
  grammar: (level) => `gramatica-espanola-${level}.pdf`,
  grammarAll: (range) => `gramatica-espanola-${range}-completa.pdf`,
  wordlist: (level) => `vocabulario-espanol-${level}.pdf`,
  // A reference list is named after its page: /gramatica/verbos-irregulares.
  reference: (slug) => `${slug}-espanol.pdf`,
  conjugation: "conjugacion-verbos-espanoles.pdf",
  start: (lang) => (lang ? `gramatica-espanola-inicio-${lang}.pdf` : "gramatica-espanola-inicio.pdf"),
};

export const GRAMMAR = {
  title: (range) => `${COURSE.subject} grammar ${range}`,
  runningHead: (range) => `${COURSE.name.toUpperCase()} · GRAMÁTICA ${range}`,
  eyebrow: `${COURSE.name.toUpperCase()} · GRAMÁTICA ESPAÑOLA · FREE GRAMMAR BOOK`,
  levelBlurb: {
    A1: "Your first sentences",
    A2: "Spanish for everyday life",
    B1: "Getting by on your own",
    B2: "Discussing and explaining",
    C1: "Precise, formal and natural",
  },
  subtitleLevel: (level, blurb) => `${blurb}: every grammar topic of level ${level} with the rule, tables and exercises, answers at the back.`,
  subtitleAll: (range) => `Every grammar topic from ${range} in one book: the rule, tables and exercises, answers at the back.`,
  coverMeta: ({ topics, levels, tables, exercises }) => [
    `${topics} topics${levels ? ` on ${levels.length} levels (${levels.join(", ")})` : ""}, in the order you learn them`,
    `${tables} reference tables`,
    `${exercises} exercises to write in, with the answers at the back`,
    `Every chapter links to its free online exercises at ${COURSE.site}`,
  ],
  contents: "Contents",
  levelTopics: (n) => `${n} chapter${n === 1 ? "" : "s"} at this level`,
  rule: "The rule",
  shape: "Sentence pattern",
  example: "Example",
  examples: "Examples",
  overview: "Overview",
  remember: "Remember",
  practiceTitle: "Your turn",
  practice: "Write your answers on the lines. The answers are at the back of the book.",
  exercise: "Exercise",
  sentence: "Sentence",
  answer: "Your answer",
  fill: "Complete the sentences.",
  solutions: "Answers",
  solutionsLead: "The answers to every exercise, chapter by chapter. Try first, then check.",
  onlineTitle: "Practise online",
  online: "More exercises for this chapter, and your phone checks your answers right away. Free, no account.",
  // utm_medium of the chapter links, so analytics can tell a book visit from others.
  utmMedium: "grammar",
};

export const REFERENCE = {
  eyebrow: `${COURSE.name.toUpperCase()} · FREE REFERENCE LIST`,
  runningHead: (title) => `${COURSE.name.toUpperCase()} · ${title.toUpperCase()}`,
  coverMeta: ({ items, sections }) => [
    `${items} entries in ${sections} groups, each with the level at which the course teaches it`,
    "Castilian Spanish (Spain), with an example sentence for most entries",
    `The same list online, with exercises: ${COURSE.site}`,
  ],
  level: "Level",
  example: "Example",
  practiceTitle: "Practise online",
  practiceLead: "These pages practise the forms in this list, with instant feedback:",
};

export const WORDLIST = {
  title: (level) => `${COURSE.subject} word list ${level}`,
  runningHead: (level) => `${COURSE.name.toUpperCase()} · VOCABULARIO ${level}`,
  eyebrow: `${COURSE.name.toUpperCase()} · VOCABULARIO · FREE WORD LIST`,
  subtitle: (level, words, sets) => `All ${words} words of level ${level} in ${sets} learning sets: el or la, plural, an English meaning and an example sentence.`,
  coverMeta: ({ words, sets }) => [
    `${words} words in ${sets} learning sets, in the order the course teaches them`,
    "Each word with its pronunciation (IPA, Castilian), el or la, the plural and an example in Spanish",
    "Verbs show: yo form · él/ella form of the indefinido · participle. Latin American alternatives are noted where the course has them",
    `The same sets as flashcards with audio: ${COURSE.site}/vocabulario`,
  ],
  head: ["Word", "Meaning and example"],
  set: (n, title) => `Set ${n}: ${title}`,
  pos: { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", prep: "preposition", conj: "conjunction", pron: "pronoun", num: "number", phrase: "phrase" },
  plural: "plural",
  feminine: "fem.",
  // The three forms the course prints for a verb, in this order.
  verbForms: "yo · él/ella (indefinido) · participle",
  pluralOnly: "plural only",
};

export const CONJUGATION = {
  title: "Spanish verb conjugation",
  runningHead: `${COURSE.name.toUpperCase()} · CONJUGACIÓN`,
  eyebrow: `${COURSE.name.toUpperCase()} · CONJUGACIÓN · FREE VERB TABLES`,
};
