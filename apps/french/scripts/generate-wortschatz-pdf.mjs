// Builds the downloadable word lists from the lexicon: one PDF per level, grouped by word set,
// with the article and plural folded into the word (l'école, les écoles), an English gloss and an
// example sentence beside each entry; editions in de/es/pt/it swap the gloss column.
//
//   pnpm generate:wortschatz-pdf
//
// Every word, translation and example comes from src/content/lexicon/*.json — the same data
// the flashcard trainer loads, so the list and the trainer can never disagree.
//
// IPA is deliberately left out. The lexicon has it for most words, but pdfkit's built-in
// fonts cannot draw ˈ ː ɐ̯ and would silently swallow them; a transcription with holes in it
// is worse than none. The pronunciation lives on the site, with audio.
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { select, withArticle, pluralArticle } from "../src/lib/lexicon.js";
import { lernsets } from "../src/lib/lernsets.js";
import { createDoc, MUTED, TEAL_DARK, MARGIN } from "./lib/pdf-brand.mjs";
import { langsFor, languageOf } from "../src/lib/languages.js";
import { glossTable } from "../src/lib/glossen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "downloads");

const LEVELS = ["A1", "A2", "B1", "B2"];
// English is the language of the course's explanations (content-plan §1.1); the words are French.
// Every level is French since vocab-c1-c2; rebuild the books after a change to a level
// (pnpm generate:wortschatz-pdf).
const LEVEL_BLURB = {
  A1: "First sentences",
  A2: "Everyday French",
  B1: "Speaking on your own",
  B2: "Arguing with confidence",
};

const POS_LABEL = {
  noun: "noun",
  verb: "verb",
  adj: "adjective",
  adv: "adverb",
  prep: "preposition",
  conj: "conjunction",
  pron: "pronoun",
  num: "number",
  phrase: "phrase",
};

/* The translated editions. The main file is French with English (word, word class, gloss,
   example); each edition swaps the English column for the learner's own language. The cover line
   is written in that language so the file says what it is to the person it is for; the labels
   stay English, the language of the course's explanations.

   A level only gets an edition in a language that covers EVERY word in it: a list with
   holes in the translation column reads as a broken file — the same rule langsOf()
   applies to the trainer's language tabs. */
const EDITIONS = {
  de: {
    column: "German",
    cover: (level) => `Französische Wortliste, Niveau ${level}, mit deutscher Übersetzung`,
  },
  es: {
    column: "Spanish",
    cover: (level) => `Lista de palabras en francés, nivel ${level}, con traducción al español`,
  },
  pt: {
    column: "Portuguese",
    cover: (level) => `Lista de palavras em francês, nível ${level}, com tradução para o português`,
  },
  it: {
    column: "Italian",
    cover: (level) => `Elenco di parole in francese, livello ${level}, con traduzione in italiano`,
  },
};
// The editions built: the flashcard languages of the registry (fetched ones included) that
// have a cover line above. `--lang=es,pt` builds only those editions (no English book), so a
// new language does not rewrite every existing PDF.
const ONLY = process.argv.find((a) => a.startsWith("--lang="))?.slice(7).split(",") ?? null;
const EDITION_LANGS = langsFor("cards", { fetched: true }).filter((c) => EDITIONS[c] && (!ONLY || ONLY.includes(c)));
/** A word's gloss: inline in the lexicon, or in the sidecar of a fetched language. */
const gloss = (w, lang) => w[lang] ?? glossTable(lang)[w.id] ?? "";

/** "l'école, les écoles" for a noun (content-plan §1.4: no space after l'; les lunettes for a
 *  plural-only noun); the bare lemma for everything else. */
function headword(w) {
  if (w.pos === "noun") {
    const base = w.gender ? withArticle(w) : w.lemma;
    return w.plural && !w.pluralOnly ? `${base}, ${pluralArticle(w)} ${w.plural}` : base;
  }
  return w.lemma;
}

/** One level (`level: "B1"`), or with `level: null` the whole A1–B2 in one book — levels in
 *  order, each opened by its own heading, the Lernsets under it as in the single books. */
async function buildLevel(level, lang = null) {
  const all = !level;
  const label = all ? "A1–B2" : level;
  const levels = all ? LEVELS : [level];
  const words = select({ level: levels });
  const ed = lang ? EDITIONS[lang] : null;
  const slug = all ? "a1-b2-komplett" : level.toLowerCase(); // file names kept: downloads.json
  if (ed && !words.every((w) => gloss(w, lang))) {
    const have = words.filter((w) => gloss(w, lang)).length;
    console.log(`wortschatz-${slug}-${lang}.pdf  skipped: ${have}/${words.length} translated`);
    return;
  }
  const sets = levels.flatMap((l) => lernsets({ level: l, status: "built" }).map((s) => ({ ...s, level: l })));
  const fileName = `wortschatz-${slug}${lang ? `-${lang}` : ""}.pdf`;
  const outPath = path.join(outDir, fileName);
  const pdf = createDoc({
    outPath,
    runningHead: `ICANSPEAK FRENCH · WORD LIST ${label}${ed ? ` · FRENCH–${ed.column.toUpperCase()}` : ""}`,
    unicode: Boolean(ed),
    script: lang ? languageOf(lang)?.script : null,
  });

  const withExample = words.filter((w) => w.example).length;

  pdf.cover({
    eyebrow: "ICANSPEAK FRENCH · VOCABULARY",
    title: ed ? `Word list ${label} · French–${ed.column}` : `Word list ${label}${all ? " (complete)" : ""}`,
    subtitle: all
      ? "All the vocabulary from A1 to B2 in one book, by level and word set."
      : `${LEVEL_BLURB[level]}: all the vocabulary of this level, by word set.`,
    subtitleRtl: ed?.rtl,
    subtitleTranslated: ed?.cover(label),
    meta: [
      `${words.length} words in ${sets.length} word sets`,
      `${withExample} example sentences`,
      "As flashcards: icanspeak.it/francais/vocabulary",
    ],
    footer:
      "Written by icanspeak French, by teachers who really teach. You may download this PDF, print it " +
      "and share it in class for free. No account, no cost.",
  });

  pdf.doc.addPage();
  pdf.h2("Contents");
  pdf.table(
    ["Set", "Topic", "Words"],
    sets.map((s) => [s.id.toUpperCase(), s.title, String(s.words)]),
    { widths: [70, pdf.contentWidth() - 140, 70] }
  );

  const w = pdf.contentWidth();
  let current = null;
  for (const set of sets) {
    const items = words.filter((x) => x.unit === set.id);
    if (!items.length) continue;
    // The whole book: each level starts on a page of its own, under its own heading.
    if (all && set.level !== current) {
      current = set.level;
      pdf.doc.addPage();
      pdf.h2(`Level ${current} · ${LEVEL_BLURB[current]}`);
    }
    pdf.section(set.title, set.id.toUpperCase());
    // The set's own page on the site, as a link: the list is what gets printed and kept,
    // and the flashcards with audio are one tap (or one typed address) away.
    const url = `icanspeak.it/francais/vocabulary/${set.id}`;
    const href = `https://${url}?utm_source=pdf&utm_medium=wortschatz&utm_campaign=${fileName.replace(/\.pdf$/, "")}`;
    pdf.doc.fillColor(MUTED).font(pdf.F.regular).fontSize(9.5)
      .text(pdf.S(`${items.length} words · As flashcards: `), MARGIN, pdf.doc.y, { continued: true })
      .fillColor(TEAL_DARK).font(pdf.F.bold).text(url, { link: href, underline: false });
    pdf.doc.x = MARGIN;
    pdf.doc.moveDown(0.4);
    // The main book glosses in English (inline `en`); an edition in the learner's language.
    pdf.table(
      ["Word", "Class", ed ? ed.column : "English", "Example"],
      items.map((x) => [headword(x), POS_LABEL[x.pos] ?? x.pos ?? "", ed ? gloss(x, lang) : x.en ?? "", x.example ?? ""]),
      {
        widths: [w * 0.27, w * 0.11, w * 0.2, w * 0.42],
        // The learner's own language is what they read the list by, so it is drawn in ink.
        inkCols: [2],
        ...(ed?.rtl && { rtl: [2] }),
      }
    );
  }

  await pdf.finish();
  const kb = Math.round(statSync(outPath).size / 1024);
  console.log(`${fileName.padEnd(26)} ${String(words.length).padStart(4)} words  ${sets.length} sets  ${kb} KB`);
}

// null = the whole A1–B2 in one book, like grammatik-a1-b2-komplett.pdf.
for (const level of [...LEVELS, null]) {
  if (!ONLY) await buildLevel(level);
  for (const lang of EDITION_LANGS) await buildLevel(level, lang);
}
