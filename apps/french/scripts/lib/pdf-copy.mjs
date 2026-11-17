// Everything the downloadable PDFs say in their own voice, for this course.
//
// The generators (generate-grammar-pdf.mjs, generate-reference-pdf.mjs,
// generate-wordlist-pdf.mjs) hold layout and logic only; every sentence a reader sees that
// does not come from the course data is here. Same keys as apps/english/scripts/lib/pdf-copy.mjs.
//
// Two languages on purpose: titles, running heads and file names are French (the subject, and
// what a learner or teacher searches for), the instructions are English, because that is the
// language the course explains in (the topic data, the tables' captions and the example
// glosses are English; the examples themselves are French of France).

export const COURSE = {
  name: "icanspeak French",
  // Printed on every page and behind the QR codes. No protocol: it is read off paper.
  site: "icanspeak.it/francais",
  siteUrl: "https://icanspeak.it/francais",
  // Every file name starts with this, so a file saved on a phone still says what it is.
  filePrefix: "grammaire-francaise",
  filePrefixWords: "vocabulaire-francais",
  // The language being taught, in the titles: "Grammaire française A1".
  subject: "Grammaire française",
  rights:
    "Written by icanspeak French from the course's own material. Nothing in it is copied from a coursebook " +
    "or an exam body. Free to download, print and share in class. No account, no cost.",
};

/** The footer line of every page but the cover: where the reader finds the matching page. */
export const footerLine = (path) => `${COURSE.site}${path} · © ${COURSE.name}`;

export const GRAMMAR = {
  title: (range) => `${COURSE.subject} ${range}`,
  // File properties (a search engine reads them): the French title with the English words people search with.
  docTitle: (range) => `${COURSE.subject} ${range} · French grammar ${range}`,
  runningHead: (range) => `${COURSE.name.toUpperCase()} · GRAMMAIRE ${range}`,
  eyebrow: `${COURSE.name.toUpperCase()} · FREE GRAMMAR BOOK`,
  levelBlurb: {
    A1: "Your first sentences in French",
    A2: "French for everyday life",
    B1: "Getting by on your own",
    B2: "Discussing and explaining",
    C1: "Precise, formal and natural",
  },
  subtitleLevel: (level, blurb) => `${blurb}: every grammar topic of level ${level}, explained in English, with the rule, tables and exercises, answers at the back.`,
  subtitleAll: (range) => `Every grammar topic from ${range} in one book, explained in English: the rule, tables and exercises, answers at the back.`,
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
  exercise: "Exercice",
  sentence: "Sentence",
  answer: "Your answer",
  fill: "Complete the sentences.",
  solutions: "Answers (corrigé)",
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
    "French of France, with an example sentence for most entries",
    `The same list online, with exercises: ${COURSE.site}`,
  ],
  level: "Level",
  example: "Example",
  practiceTitle: "Practise online",
  practiceLead: "These pages practise the forms in this list, with instant feedback:",
};

export const WORDLIST = {
  title: (level) => `Vocabulaire français ${level}`,
  docTitle: (level) => `Vocabulaire français ${level} · French word list ${level}`,
  runningHead: (level) => `${COURSE.name.toUpperCase()} · VOCABULAIRE ${level}`,
  eyebrow: `${COURSE.name.toUpperCase()} · FREE WORD LIST`,
  subtitle: (level, words, sets) => `French word list ${level}: all ${words} words of the level in ${sets} learning sets, with the article and gender, plural, an English meaning and an example sentence.`,
  coverMeta: ({ words, sets }) => [
    `${words} words in ${sets} learning sets, in the order the course teaches them`,
    "Each word with its pronunciation (IPA), le / la / l' and the plural, an English meaning and an example",
    `The same sets as flashcards with audio: ${COURSE.site}/vocabulaire`,
  ],
  head: ["Word", "Meaning and example"],
  set: (n, title) => `Set ${n}: ${title}`,
  pos: { noun: "noun", verb: "verb", adj: "adjective", adjective: "adjective", adv: "adverb", adverb: "adverb", prep: "preposition", preposition: "preposition", conj: "conjunction", pron: "pronoun", num: "number", phrase: "phrase", other: "" },
  plural: "plural",
};

// The reference lists' titles in French (the data's own titles are English: they head the web pages).
REFERENCE.titles = {
  "verbes-irreguliers": { title: "Verbes irréguliers", doc: "Verbes irréguliers · French irregular verbs list" },
  "liste-verbes-pronominaux": { title: "Verbes pronominaux", doc: "Verbes pronominaux · French reflexive and pronominal verbs" },
  "verbes-avec-prepositions": { title: "Verbes et prépositions", doc: "Verbes et prépositions · French verbs with prepositions" },
};
