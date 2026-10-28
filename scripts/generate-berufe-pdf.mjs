// Builds the downloadable word lists for Deutsch für den Beruf (FACHVOKABULAR Tier 2/3):
// one PDF per profession deck that has words, grouped like the deck, with article and plural
// folded into the word, the German hint and the example sentence.
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
import { byId } from "../src/lib/lexicon.js";
import { createDoc, MUTED } from "./lib/pdf-brand.mjs";
import { langsFor, languageOf } from "../src/lib/languages.js";
import { glossTable, FETCHED_GLOSS_LANGS as FETCHED } from "../src/lib/glossen.js";
import { loadArt } from "./lib/pdf-art.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const outDir = path.join(ROOT, "public", "downloads");
const DIR = path.join(ROOT, "src", "data", "berufe");

const POS_LABEL = { noun: "Nomen", verb: "Verb", adj: "Adjektiv", adv: "Adverb", adverb: "Adverb", phrase: "Wendung", prep: "Präposition" };
const EDITIONS = {
  en: { column: "Englisch", cover: (t) => `German for work: ${t} — word list with English translations` },
  ar: { column: "Arabisch", rtl: true, cover: () => "الألمانية للعمل: قائمة المفردات مع الترجمة إلى العربية" },
  uk: { column: "Ukrainisch", cover: () => "Німецька для роботи: список слів з перекладом українською" },
  tr: { column: "Türkisch", cover: () => "İş için Almanca: Türkçe çevirili kelime listesi" },
  es: { column: "Spanisch", cover: () => "Alemán para el trabajo: lista de palabras con traducción al español" },
  pt: { column: "Portugiesisch", cover: () => "Alemão para o trabalho: lista de palavras com tradução para o português" },
  vi: { column: "Vietnamesisch", cover: () => "Tiếng Đức cho công việc: danh sách từ vựng có dịch sang tiếng Việt" },
  hi: { column: "Hindi", cover: () => "काम के लिए जर्मन: हिन्दी अनुवाद के साथ शब्द-सूची" },
  id: { column: "Indonesisch", cover: () => "Bahasa Jerman untuk bekerja: daftar kosakata dengan terjemahan bahasa Indonesia" },
  tl: { column: "Tagalog", cover: () => "German para sa trabaho: listahan ng mga salita na may salin sa Tagalog" },
};
// The editions built: the profession languages of the registry that have a cover line above.
// `--lang=es,pt` builds only those editions (no German book).
const ONLY = process.argv.find((a) => a.startsWith("--lang="))?.slice(7).split(",") ?? null;
const EDITION_LANGS = langsFor("berufe").filter((c) => EDITIONS[c] && (!ONLY || ONLY.includes(c)));

const decks = readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")));
const own = new Map(decks.flatMap((d) => (d.groups ?? []).flatMap((g) => g.words.filter((w) => !w.ref).map((w) => [w.id, w]))));
const fs = JSON.parse(readFileSync(path.join(ROOT, "src/data/fuehrerschein/wortschatz.json"), "utf8"));
const fsWords = new Map(fs.groups.flatMap((g) => g.words.map((w) => [w.id, w])));

/** Any entry → one flat row: lemma, pos, gender, plural, hint, example, translations. */
function row(w) {
  if (!w.ref) return { ...w, tr: w.translations ?? {} };
  // A ref's own job-specific deHint/example win over its source's (berufeWortschatz.js does the same).
  const r = refRow(w);
  return { ...r, ...(w.deHint ? { deHint: w.deHint } : {}), ...(w.example ? { example: w.example } : {}) };
}
function refRow(w) {
  if (w.ref.startsWith("bv-")) { const o = own.get(w.ref); return { ...o, tr: o.translations ?? {} }; }
  if (w.ref.startsWith("fs-")) { const o = fsWords.get(w.ref); return { ...o, tr: o.translations ?? {} }; }
  const r = byId(w.ref);
  // A lexicon word: the inline glosses, plus the sidecars of the fetched card languages.
  return { ...r, tr: { en: r.en, ar: r.ar, uk: r.uk, tr: r.tr, ...Object.fromEntries(FETCHED.map((c) => [c, glossTable(c)[r.id]])) } };
}
const headword = (w) => {
  if (w.pos !== "noun") return w.lemma;
  const base = w.gender ? `${w.gender} ${w.lemma}` : w.lemma;
  return w.plural ? `${base}, die ${w.plural}` : base;
};

const art = await loadArt();

async function build(deck, lang = null) {
  const groups = deck.groups.filter((g) => g.words.length).map((g) => ({ ...g, rows: g.words.map(row) }));
  const rows = groups.flatMap((g) => g.rows);
  const ed = lang ? EDITIONS[lang] : null;
  if (ed && !rows.every((r) => r.tr?.[lang])) {
    console.log(`berufe-${deck.beruf}-${lang}.pdf  übersprungen: ${rows.filter((r) => r.tr?.[lang]).length}/${rows.length} übersetzt`);
    return;
  }
  const fileName = `berufe-${deck.beruf}${lang ? `-${lang}` : ""}.pdf`;
  const outPath = path.join(outDir, fileName);
  const pdf = createDoc({
    outPath,
    runningHead: `DEUTSCHACADEMY · DEUTSCH FÜR DEN BERUF${ed ? ` · DEUTSCH–${ed.column.toUpperCase()}` : ""}`,
    unicode: true,
    script: lang ? languageOf(lang)?.script : null,
  });
  pdf.cover({
    eyebrow: ed ? `DEUTSCH FÜR DEN BERUF · DEUTSCH–${ed.column.toUpperCase()}` : "DEUTSCHACADEMY · DEUTSCH FÜR DEN BERUF",
    art: art.mascot.words,
    title: deck.title,
    // No subtitle: the cover band is a fixed 210pt, and a two-line profession title next to
    // the mascot fills it. The deck's easy intro leads the list under the band instead.
    subtitleRtl: ed?.rtl,
    subtitleTranslated: ed?.cover(deck.title),
    meta: [
      deck.introEasy ?? deck.intro,
      `${rows.length} Wörter in ${groups.length} ${groups.length === 1 ? "Gruppe" : "Gruppen"} · ${deck.level}`,
      `${rows.filter((r) => r.example).length} Beispielsätze`,
      `Als Karteikarten mit Audio: englishacademy.com/berufe/${deck.beruf}`,
    ],
    footer:
      "Von EnglishAcademy geschrieben — von Lehrkräften, die wirklich unterrichten. Dieses PDF darfst du frei " +
      "herunterladen, ausdrucken und im Unterricht oder am Arbeitsplatz weitergeben. Kein Konto, keine Kosten." +
      (deck.reviewed ? "" : " Die Übersetzungen sind ein Entwurf und werden noch geprüft."),
  });

  const w = pdf.contentWidth();
  pdf.doc.addPage();
  // The tips in Regi's box, the one place a learner should not skip.
  if (deck.tipps?.length) {
    pdf.h2("Tipps für Deutsch bei der Arbeit", { icon: art.icon.note, keep: 60 });
    for (const t of deck.tipps) pdf.tip(t, { art: art.mascot.idea });
  }
  for (const g of groups) {
    pdf.section(g.title);
    pdf.paragraph(`${g.rows.length} Wörter`, { color: MUTED, size: 9.5 });
    if (!ed) {
      pdf.table(
        ["Wort", "Wortart", "Erklärung", "Beispiel"],
        g.rows.map((x) => [headword(x), POS_LABEL[x.pos] ?? x.pos ?? "", x.deHint ?? "", x.example ?? ""]),
        { widths: [w * 0.26, w * 0.11, w * 0.27, w * 0.36] }
      );
      continue;
    }
    pdf.table(
      ["Wort", "Wortart", ed.column, "Beispiel"],
      g.rows.map((x) => [headword(x), POS_LABEL[x.pos] ?? x.pos ?? "", x.tr[lang] ?? "", x.example ?? ""]),
      { widths: [w * 0.27, w * 0.11, w * 0.2, w * 0.42], inkCols: [2], ...(ed.rtl && { rtl: [2] }) }
    );
  }
  pdf.tip(`Alle Wörter als Karteikarten mit Audio: englishacademy.com/berufe/${deck.beruf}`, {
    art: art.mascot.wordsCheer,
    title: "Weiter üben",
  });
  await pdf.finish();
  console.log(`${fileName.padEnd(30)} ${String(rows.length).padStart(4)} Wörter  ${Math.round(statSync(outPath).size / 1024)} KB`);
}

for (const deck of decks) {
  if (!(deck.groups ?? []).some((g) => g.words.length)) continue;
  if (!ONLY) await build(deck);
  for (const lang of EDITION_LANGS) await build(deck, lang);
}
