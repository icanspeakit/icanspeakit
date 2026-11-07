// Builds the downloadable word lists for Spanish for work: one PDF per sector deck, grouped like
// the deck, with article and plural folded into the word, the English meaning and the example.
//
//   pnpm generate:berufe-pdf
//
// Everything comes from src/data/berufe/*.json — the files the trainer loads. A `{ ref }`
// is drawn as its source has it (lexicon, Fahrschul-Wortschatz or another profession), the
// same resolution src/lib/berufeWortschatz.js makes for the cards.
//
// Editions: berufe-<slug>-<lang>.pdf adds one column in the learner's language, like the
// Wortlisten (src/lib/downloads.js finds them on disk). A deck only gets an edition in a
// language that covers every entry — a list with holes in that column reads as broken.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { byId, pluralArticle } from "../src/lib/lexicon.js";
import { workPath } from "../src/lib/routes.js";
import { createDoc, MUTED } from "./lib/pdf-brand.mjs";
import { langsFor, languageOf } from "../src/lib/languages.js";
import { glossTable, FETCHED_GLOSS_LANGS as FETCHED } from "../src/lib/glossen.js";
import { loadArt } from "./lib/pdf-art.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const outDir = path.join(ROOT, "public", "downloads");
const DIR = path.join(ROOT, "src", "data", "berufe");

const POS_LABEL = { noun: "Noun", verb: "Verb", adj: "Adjective", adv: "Adverb", adverb: "Adverb", phrase: "Phrase", prep: "Preposition" };
// One line per extra language column, when a UI language brings full deck translations.
const EDITIONS = {};
// The editions built: the profession languages of the registry that have a cover line above.
// `--lang=es,pt` builds only those editions (no German book).
const ONLY = process.argv.find((a) => a.startsWith("--lang="))?.slice(7).split(",") ?? null;
const EDITION_LANGS = langsFor("berufe").filter((c) => EDITIONS[c] && (!ONLY || ONLY.includes(c)));

const decks = readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")));
const own = new Map(decks.flatMap((d) => (d.groups ?? []).flatMap((g) => g.words.filter((w) => !w.ref).map((w) => [w.id, w]))));

/** Any entry → one flat row: lemma, pos, gender, plural, hint, example, translations. */
function row(w) {
  if (!w.ref) return { ...w, tr: w.translations ?? {} };
  // A ref's own job-specific deHint/example win over its source's (berufeWortschatz.js does the same).
  const r = refRow(w);
  return { ...r, ...(w.deHint ? { deHint: w.deHint } : {}), ...(w.example ? { example: w.example } : {}), ...(w.en ? { tr: { ...r.tr, en: w.en } } : {}) };
}
function refRow(w) {
  if (w.ref.startsWith("bv-")) { const o = own.get(w.ref); return { ...o, tr: o.translations ?? {} }; }
  const r = byId(w.ref);
  // A lexicon word: the inline glosses, plus the sidecars of the fetched card languages.
  return { ...r, tr: { en: r.en, ar: r.ar, uk: r.uk, tr: r.tr, ...Object.fromEntries(FETCHED.map((c) => [c, glossTable(c)[r.id]])) } };
}
const headword = (w) => {
  if (w.pos !== "noun") return w.lemma;
  const base = w.gender ? `${w.gender} ${w.lemma}` : w.lemma;
  if (w.pluralOnly) return `${pluralArticle(w)} ${w.plural ?? w.lemma}`;
  return w.plural ? `${base}, ${pluralArticle(w)} ${w.plural}` : base;
};

const art = await loadArt();

async function build(deck, lang = null) {
  const groups = deck.groups.filter((g) => g.words.length).map((g) => ({ ...g, rows: g.words.map(row) }));
  const rows = groups.flatMap((g) => g.rows);
  const ed = lang ? EDITIONS[lang] : null;
  if (ed && !rows.every((r) => r.tr?.[lang])) {
    console.log(`berufe-${deck.beruf}-${lang}.pdf  skipped: ${rows.filter((r) => r.tr?.[lang]).length}/${rows.length} translated`);
    return;
  }
  const fileName = `berufe-${deck.beruf}${lang ? `-${lang}` : ""}.pdf`;
  const outPath = path.join(outDir, fileName);
  const pdf = createDoc({
    outPath,
    runningHead: `ICANSPEAK SPANISH · SPANISH FOR WORK${ed ? ` · SPANISH–${ed.column.toUpperCase()}` : ""}`,
    unicode: true,
    script: lang ? languageOf(lang)?.script : null,
  });
  pdf.cover({
    eyebrow: ed ? `SPANISH FOR WORK · SPANISH–${ed.column.toUpperCase()}` : "ICANSPEAK SPANISH · SPANISH FOR WORK",
    art: art.mascot.words,
    title: deck.title,
    // No subtitle: the cover band is a fixed 210pt, and a two-line profession title next to
    // the mascot fills it. The deck's easy intro leads the list under the band instead.
    subtitleRtl: ed?.rtl,
    subtitleTranslated: ed?.cover(deck.title),
    meta: [
      deck.introEasy ?? deck.intro,
      `${rows.length} words in ${groups.length} ${groups.length === 1 ? "group" : "groups"} · ${deck.level}`,
      `${rows.filter((r) => r.example).length} example sentences`,
      `As flashcards: icanspeak.it/spanish${workPath(deck.beruf)}`,
    ],
    footer:
      "Written by icanspeak Spanish. You may download this PDF, print it and share it in class or at work. No account, no cost." +
      (deck.reviewed ? "" : " The content is a draft and is still being checked."),
  });

  const w = pdf.contentWidth();
  pdf.doc.addPage();
  // The tips in Regi's box, the one place a learner should not skip.
  if (deck.tipps?.length) {
    pdf.h2("Tips for Spanish at work", { icon: art.icon.note, keep: 60 });
    for (const t of deck.tipps) pdf.tip(t, { art: art.mascot.idea });
  }
  for (const g of groups) {
    pdf.section(g.title);
    pdf.paragraph(`${g.rows.length} words`, { color: MUTED, size: 9.5 });
    if (!ed) {
      pdf.table(
        ["Word", "Type", "English", "Example"],
        g.rows.map((x) => [headword(x), POS_LABEL[x.pos] ?? x.pos ?? "", x.tr?.en ?? "", x.example ?? ""]),
        { widths: [w * 0.26, w * 0.11, w * 0.27, w * 0.36] }
      );
      continue;
    }
    pdf.table(
      ["Word", "Type", ed.column, "Example"],
      g.rows.map((x) => [headword(x), POS_LABEL[x.pos] ?? x.pos ?? "", x.tr[lang] ?? "", x.example ?? ""]),
      { widths: [w * 0.27, w * 0.11, w * 0.2, w * 0.42], inkCols: [2], ...(ed.rtl && { rtl: [2] }) }
    );
  }
  pdf.tip(`All the words as flashcards: icanspeak.it/spanish${workPath(deck.beruf)}`, {
    art: art.mascot.wordsCheer,
    title: "Keep practising",
  });
  await pdf.finish();
  console.log(`${fileName.padEnd(30)} ${String(rows.length).padStart(4)} words  ${Math.round(statSync(outPath).size / 1024)} KB`);
}

for (const deck of decks) {
  if (!(deck.groups ?? []).some((g) => g.words.length)) continue;
  if (!ONLY) await build(deck);
  for (const lang of EDITION_LANGS) await build(deck, lang);
}
