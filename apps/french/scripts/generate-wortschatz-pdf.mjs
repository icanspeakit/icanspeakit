// Builds the downloadable Wortlisten from the lexicon: one PDF per level, grouped by
// Lernset, with the article and plural folded into the word and an example sentence beside
// each entry.
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
import { select } from "../src/lib/lexicon.js";
import { lernsets } from "../src/lib/lernsets.js";
import { createDoc, MUTED, TEAL_DARK, MARGIN } from "./lib/pdf-brand.mjs";
import { langsFor, languageOf } from "../src/lib/languages.js";
import { glossTable } from "../src/lib/glossen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "downloads");

const LEVELS = ["A1", "A2", "B1", "B2"];
const LEVEL_BLURB = {
  A1: "Erste Sätze",
  A2: "Alltag auf Deutsch",
  B1: "Selbstständig sprechen",
  B2: "Sicher argumentieren",
};

const POS_LABEL = {
  noun: "Nomen",
  verb: "Verb",
  adj: "Adjektiv",
  adv: "Adverb",
  prep: "Präposition",
  konj: "Konjunktion",
  pron: "Pronomen",
  num: "Zahlwort",
  phrase: "Wendung",
};

/* The translated editions. The main file is German only (Wort, Wortart, Beispiel); each
   edition adds one column in the learner's own language. English is one of them rather
   than the default — a learner who does not read English was getting a German list glossed
   in a third language. The cover line is written in that language so the file says what it is
   to the person it is for; everything else stays German, because German is the subject.

   A level only gets an edition in a language that covers EVERY word in it: a list with
   holes in the translation column reads as a broken file — the same rule langsOf()
   applies to the trainer's language tabs. */
const EDITIONS = {
  en: {
    column: "Englisch",
    cover: (level) => `German word list, level ${level}, with English translations`,
  },
  ar: {
    column: "Arabisch",
    rtl: true,
    cover: (level) => `قائمة المفردات الألمانية للمستوى ${level} مع الترجمة إلى العربية`,
  },
  ru: {
    column: "Russisch",
    cover: (level) => `Немецкий словарь уровня ${level} с переводом на русский язык`,
  },
  tr: {
    column: "Türkisch",
    cover: (level) => `${level} seviyesi Almanca kelime listesi, Türkçe çevirisiyle`,
  },
  es: {
    column: "Spanisch",
    cover: (level) => `Lista de palabras en alemán, nivel ${level}, con traducción al español`,
  },
  pt: {
    column: "Portugiesisch",
    cover: (level) => `Lista de palavras em alemão, nível ${level}, com tradução para o português`,
  },
  vi: {
    column: "Vietnamesisch",
    cover: (level) => `Danh sách từ vựng tiếng Đức trình độ ${level}, có dịch sang tiếng Việt`,
  },
  hi: {
    column: "Hindi",
    cover: (level) => `जर्मन शब्द-सूची, स्तर ${level}, हिन्दी अनुवाद के साथ`,
  },
  id: {
    column: "Indonesisch",
    cover: (level) => `Daftar kosakata bahasa Jerman tingkat ${level}, dengan terjemahan bahasa Indonesia`,
  },
  tl: {
    column: "Tagalog",
    cover: (level) => `Listahan ng mga salitang German, antas ${level}, may salin sa Tagalog`,
  },
};
// The editions built: the flashcard languages of the registry (fetched ones included) that
// have a cover line above. `--lang=es,pt` builds only those editions (no German book), so a
// new language does not rewrite every existing PDF.
const ONLY = process.argv.find((a) => a.startsWith("--lang="))?.slice(7).split(",") ?? null;
const EDITION_LANGS = langsFor("cards", { fetched: true }).filter((c) => EDITIONS[c] && (!ONLY || ONLY.includes(c)));
/** A word's gloss: inline in the lexicon, or in the sidecar of a fetched language. */
const gloss = (w, lang) => w[lang] ?? glossTable(lang)[w.id] ?? "";

/** "der Name, die Namen" for a noun; the bare lemma for everything else. */
function headword(w) {
  if (w.pos === "noun") {
    const base = w.gender ? `${w.gender} ${w.lemma}` : w.lemma;
    return w.plural ? `${base}, die ${w.plural}` : base;
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
  const slug = all ? "a1-b2-komplett" : level.toLowerCase();
  if (ed && !words.every((w) => gloss(w, lang))) {
    const have = words.filter((w) => gloss(w, lang)).length;
    console.log(`wortschatz-${slug}-${lang}.pdf  übersprungen: ${have}/${words.length} übersetzt`);
    return;
  }
  const sets = levels.flatMap((l) => lernsets({ level: l, status: "built" }).map((s) => ({ ...s, level: l })));
  const fileName = `wortschatz-${slug}${lang ? `-${lang}` : ""}.pdf`;
  const outPath = path.join(outDir, fileName);
  const pdf = createDoc({
    outPath,
    runningHead: `ICANSPEAK SPANISH · WORTLISTE ${label}${ed ? ` · DEUTSCH–${ed.column.toUpperCase()}` : ""}`,
    unicode: Boolean(ed),
    script: lang ? languageOf(lang)?.script : null,
  });

  const withExample = words.filter((w) => w.example).length;

  pdf.cover({
    eyebrow: "ICANSPEAK SPANISH · WORTSCHATZ",
    title: ed ? `Wortliste ${label} · Deutsch–${ed.column}` : `Wortliste ${label}${all ? " (komplett)" : ""}`,
    subtitle: all
      ? "Der komplette Wortschatz von A1 bis B2 in einem Band — nach Niveau und Lernsets geordnet."
      : `${LEVEL_BLURB[level]} — der komplette Wortschatz dieses Niveaus, nach Lernsets geordnet.`,
    subtitleRtl: ed?.rtl,
    subtitleTranslated: ed?.cover(label),
    meta: [
      `${words.length} Wörter in ${sets.length} Lernsets`,
      `${withExample} Beispielsätze`,
      "Als Karteikarten mit Audio: icanspeak.it/spanish/wortschatz" + (all ? "" : "/" + level.toLowerCase()),
    ],
    footer:
      "Von icanspeak Spanish geschrieben — von Lehrkräften, die wirklich unterrichten. Dieses PDF darfst du frei " +
      "herunterladen, ausdrucken und im Unterricht weitergeben. Kein Konto, keine Kosten.",
  });

  pdf.doc.addPage();
  pdf.h2("Inhalt");
  pdf.table(
    ["Lernset", "Thema", "Wörter"],
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
      pdf.h2(`Niveau ${current} · ${LEVEL_BLURB[current]}`);
    }
    pdf.section(set.title, set.id.toUpperCase());
    // The set's own page on the site, as a link: the list is what gets printed and kept,
    // and the flashcards with audio are one tap (or one typed address) away.
    const url = `icanspeak.it/spanish/wortschatz/${set.id}`;
    const href = `https://${url}?utm_source=pdf&utm_medium=wortschatz&utm_campaign=${fileName.replace(/\.pdf$/, "")}`;
    pdf.doc.fillColor(MUTED).font(pdf.F.regular).fontSize(9.5)
      .text(pdf.S(`${items.length} Wörter · Als Karteikarten mit Audio: `), MARGIN, pdf.doc.y, { continued: true })
      .fillColor(TEAL_DARK).font(pdf.F.bold).text(url, { link: href, underline: false });
    pdf.doc.x = MARGIN;
    pdf.doc.moveDown(0.4);
    // German only: no translation column, and the example gets the room.
    if (!ed) {
      pdf.table(
        ["Wort", "Wortart", "Beispiel"],
        items.map((x) => [headword(x), POS_LABEL[x.pos] ?? x.pos ?? "", x.example ?? ""]),
        { widths: [w * 0.3, w * 0.12, w * 0.58] }
      );
      continue;
    }
    pdf.table(
      ["Wort", "Wortart", ed.column, "Beispiel"],
      items.map((x) => [headword(x), POS_LABEL[x.pos] ?? x.pos ?? "", gloss(x, lang), x.example ?? ""]),
      {
        widths: [w * 0.27, w * 0.11, w * 0.2, w * 0.42],
        // The learner's own language is what they read the list by, so it is drawn in ink.
        inkCols: [2],
        ...(ed.rtl && { rtl: [2] }),
      }
    );
  }

  await pdf.finish();
  const kb = Math.round(statSync(outPath).size / 1024);
  console.log(`${fileName.padEnd(26)} ${String(words.length).padStart(4)} Wörter  ${sets.length} Lernsets  ${kb} KB`);
}

// null = the whole A1–B2 in one book, like grammatik-a1-b2-komplett.pdf.
for (const level of [...LEVELS, null]) {
  if (!ONLY) await buildLevel(level);
  for (const lang of EDITION_LANGS) await buildLevel(level, lang);
}
