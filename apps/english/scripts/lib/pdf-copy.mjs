// Everything the downloadable PDFs say in their own voice, for this course.
//
// The generators (generate-grammar-pdf.mjs, generate-reference-pdf.mjs,
// generate-wordlist-pdf.mjs, generate-life-in-the-uk-pdf.mjs) hold layout and logic only;
// every sentence a reader sees that does not come from the course data is here. The Spanish
// and French courses copy the generators unchanged and write their own version of this file
// (same keys, their language, their site path, their file prefix).
//
// British English, as the rest of the English course.

export const COURSE = {
  name: "icanspeak English",
  // Printed on every page and behind the QR codes. No protocol: it is read off paper.
  site: "icanspeak.it/english",
  siteUrl: "https://icanspeak.it/english",
  // Every file name starts with this, so a file saved on a phone still says what it is.
  filePrefix: "english",
  // The language being taught, in the titles: "English grammar A1".
  subject: "English",
  rights:
    "Written by icanspeak English from the course's own material. Nothing in it is copied from a coursebook " +
    "or an exam board. Free to download, print and share in class. No account, no cost.",
};

/** The footer line of every page but the cover: where the reader finds the matching page. */
export const footerLine = (path) => `${COURSE.site}${path} · © ${COURSE.name}`;

export const GRAMMAR = {
  title: (range) => `${COURSE.subject} grammar ${range}`,
  runningHead: (range) => `${COURSE.name.toUpperCase()} · GRAMMAR ${range}`,
  eyebrow: `${COURSE.name.toUpperCase()} · FREE GRAMMAR BOOK`,
  levelBlurb: {
    A1: "Your first sentences",
    A2: "English for everyday life",
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
    "British English, with an example sentence for most entries",
    `The same list online, with exercises: ${COURSE.site}`,
  ],
  level: "Level",
  example: "Example",
  practiceTitle: "Practise online",
  practiceLead: "These pages practise the forms in this list, with instant feedback:",
};

export const WORDLIST = {
  title: (level) => `${COURSE.subject} word list ${level}`,
  runningHead: (level) => `${COURSE.name.toUpperCase()} · WORD LIST ${level}`,
  eyebrow: `${COURSE.name.toUpperCase()} · FREE WORD LIST`,
  subtitle: (level, words, sets) => `All ${words} words of level ${level} in ${sets} learning sets: part of speech, forms, a simple definition and an example sentence.`,
  coverMeta: ({ words, sets }) => [
    `${words} words in ${sets} learning sets, in the order the course teaches them`,
    "Each word with its pronunciation (IPA), forms, a definition in simple English and an example",
    `The same sets as flashcards with audio: ${COURSE.site}/vocabulary`,
  ],
  head: ["Word", "Meaning and example"],
  set: (n, title) => `Set ${n}: ${title}`,
  pos: { noun: "noun", verb: "verb", adj: "adjective", adjective: "adjective", adv: "adverb", adverb: "adverb", prep: "preposition", preposition: "preposition", conj: "conjunction", pron: "pronoun", phrase: "phrase", other: "" },
  plural: "plural",
};

export const LIFE_UK = {
  title: "Life in the UK test: the facts",
  titleSimple: "Life in the UK test: the facts in simple English",
  titleNation: (name) => `Life in the UK: ${name}`,
  runningHead: "ICANSPEAK ENGLISH · LIFE IN THE UK",
  eyebrow: `${COURSE.name.toUpperCase()} · LIFE IN THE UK TEST`,
  subtitle: "The facts for the Life in the UK test, by topic, plus the basic data for the four nations of the UK.",
  subtitleSimple: "The same facts in simple English: short sentences, few difficult words.",
  subtitleNation: (name) => `A practice sheet for ${name}: a short profile, practice questions and the answers.`,
  meta: (topics, facts) => [
    `${facts} facts in ${topics} chapters`,
    "Written by icanspeak English from public sources; not the official handbook, not the real test questions",
    `Practise online with the free test: ${COURSE.site}/life-in-the-uk/test`,
  ],
  metaNation: (q) => [
    `${q} practice questions with answers at the end`,
    "Extra practice: the real test has no questions about one nation only",
    `Practise online with the free test: ${COURSE.site}/life-in-the-uk/test`,
  ],
  glossary: "Words to know",
  nations: "The four nations",
  profile: "Profile",
  questions: "Practice questions",
  questionsUk: "Practice questions: the whole UK",
  wordHead: ["Word", "Meaning"],
  answerHead: ["No.", "", "Correct answer"],
  answers: "Answers",
  sources: "Sources",
  capital: "Capital",
  population: "Population",
  parliament: "Parliament",
};
