// The Wissensdatenbank's catalogue, joined to what is actually on disk.
//
// src/data/downloads.json says what a file IS — title, level, category, who wrote it. The
// generators say how BIG it is and how many pages it has, in public/downloads/manifest.json.
// Keeping those apart is the point: the size of a PDF is not something anyone should be
// hand-maintaining in a catalogue, and it goes stale the first time a generator runs.
//
// A catalogue entry whose file is missing is dropped rather than rendered as a dead link —
// the Fakten PDFs are committed, but someone cloning the repo before running the generators
// would otherwise get a page full of 404s.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import catalogue from "../data/downloads.json";
import { grammarTopics } from "./catalog.js";
import { lernsets } from "./lernsets.js";
import lid from "../data/leben-in-deutschland.json";
import lidTr from "../data/uebersetzungen/leben-in-deutschland.json";
import themenTr from "../data/uebersetzungen/grammatik-themen.json";
import { langsFor, languagesFor, languageOf } from "./languages.js";
import startBook from "../data/grammatik-start/en.json";

const DIR = path.join(process.cwd(), "public", "downloads");

const manifest = (() => {
  const file = path.join(DIR, "manifest.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
})();

/** "1,2 MB" / "214 KB" — German decimal comma, because the whole page is German. */
export function formatSize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function fileInfo(file) {
  const abs = path.join(DIR, file);
  if (!existsSync(abs)) return null;
  const meta = manifest[file] ?? {};
  const bytes = meta.bytes ?? statSync(abs).size;
  return { href: `/downloads/${file}`, pages: meta.pages ?? null, bytes, size: formatSize(bytes) };
}

/* The translated editions of a file: a Wortliste with the learner's own language in place
   of the English column (generate-wortschatz-pdf.mjs), a Grammatik book with every rule
   explained in it as well (generate-grammatik-pdf.mjs). Found on disk by
   name rather than listed in the catalogue — the generator skips a level whose
   translations are incomplete, and a catalogue entry would promise that file anyway.
   Labels are each language's own name: the reader looking for it reads that language. */
const edition = (l) => ({ lang: l.code, label: l.native, ...(l.dir === "rtl" ? { rtl: true } : {}) });
const EDITIONS = languagesFor("cards", { fetched: true }).map(edition);
/* A book with its own list (`editions` in the catalogue: Grammatik-Start comes in eleven
   languages, more than the flashcards have) is looked up in that list instead. */
function editionsOf(entry) {
  const base = entry.file.replace(/\.pdf$/, "");
  const list = entry.editions ? entry.editions.map((c) => languageOf(c)).filter(Boolean).map(edition) : EDITIONS;
  return list.map((e) => {
    const info = fileInfo(`${base}-${e.lang}.pdf`);
    return info && { ...e, ...info };
  }).filter(Boolean);
}

function hydrate(entry) {
  const info = fileInfo(entry.file);
  if (!info) return null;
  return { ...entry, ...info, editions: editionsOf(entry), states: entry.states ? statesOf() : null };
}

/* The Bundesland booklets (generate-bundesland-pdf.mjs): one file per state, offered in a
   single card with a dropdown rather than as sixteen cards. A state's classroom booklets
   (Bayern's A2/B1) are catalogue entries with `parent` and ride along under it. */
function statesOf() {
  return lid.bundeslaender
    .map((l) => {
      const info = fileInfo(`leben-in-deutschland-land-${l.id}.pdf`);
      return info && { id: l.id, name: l.name, ...info };
    })
    .filter(Boolean);
}

/* The contents lines in the learner's language. The books are German and so is every line
   of their contents — that is what the reader will find printed — but a learner choosing
   between "Adjektivdeklination" and "Konjugation" cannot pick the book that does not read
   German yet. So each line can carry its translations, and the page shows the one for the
   interface language under the German (CSS only, see .wi-toc-tr in wissen.css).
   Sources: grammar topic names (uebersetzungen/grammatik-themen.json), set names (the same
   ws.set.* strings the Wortschatz picker uses), Leben-in-Deutschland chapter titles. */
const TR_LANGS = langsFor("help");
const uiDicts = Object.fromEntries(TR_LANGS.map((l) => {
  try {
    return [l, JSON.parse(readFileSync(path.join(process.cwd(), "public", "i18n", `${l}.json`), "utf8"))];
  } catch {
    return [l, {}];
  }
}));
const pick = (get) => {
  const out = {};
  for (const l of TR_LANGS) {
    const v = get(l);
    if (v) out[l] = v;
  }
  return Object.keys(out).length ? out : null;
};
const topicTr = (id) => pick((l) => themenTr.topics?.[id]?.[l]);
const setTr = (id) => pick((l) => uiDicts[l][`ws.set.${id}`]);
const chapterTr = (id) => pick((l) => lidTr.topics?.[id]?.title?.[l]);

// What is actually inside a PDF, read from the same data the generator used — not
// typed into the catalogue, where it would drift the first time a topic is added.
// The download page shows this before the file is fetched: a 210 KB PDF that turns
// out to be the wrong level is a wasted download on a phone plan.
// Grammatik-Start's chapter titles in the help languages, from the book's own translations.
const startTr = Object.fromEntries(TR_LANGS.map((l) => {
  try {
    const book = JSON.parse(readFileSync(path.join(process.cwd(), "src", "data", "grammatik-start", `${l}.json`), "utf8"));
    return [l, book.status === "skeleton" ? null : book]; // a skeleton still holds the English titles
  } catch {
    return [l, null];
  }
}));

function contentsOf(entry) {
  if (entry.id === "grammatik-start") {
    return {
      label: "10 Kapitel",
      labelKey: "wissen.toc.chapters", labelVars: { n: startBook.chapters.length },
      items: startBook.chapters.map((c) => `${c.level} · ${c.titleDe}`),
      itemTr: startBook.chapters.map((c) => pick((l) => startTr[l]?.chapters?.[c.id]?.title)),
    };
  }
  if (entry.category === "grammatik") {
    const level = entry.level === "A1–B2" ? null : entry.level;
    const topics = grammarTopics.filter((t) => !level || t.level === level);
    return {
      label: level ? "Themen in diesem Band" : "Alle 27 Themen, nach Niveau",
      labelKey: level ? "wissen.toc.topicsInBand" : "wissen.toc.allTopics",
      items: topics.map((t) => (level ? t.name : `${t.level} · ${t.name}`)),
      itemTr: topics.map((t) => topicTr(t.id)),
    };
  }
  if (entry.category === "wortschatz") {
    // The A1–B2 book holds every level's sets; name the level in front of each.
    if (entry.level === "A1–B2") {
      const sets = ["A1", "A2", "B1", "B2"].flatMap((l) => lernsets({ level: l, status: "built" }).map((s) => ({ ...s, l })));
      return {
        label: `${sets.length} Lernsets`,
        labelKey: "wissen.toc.sets", labelVars: { n: sets.length },
        items: sets.map((s) => `${s.l} · ${s.title} · ${s.words} Wörter`),
        itemTr: sets.map((s) => setTr(s.id)),
      };
    }
    const sets = lernsets({ level: entry.level, status: "built" });
    return {
      label: `${sets.length} Lernsets`,
      labelKey: "wissen.toc.sets", labelVars: { n: sets.length },
      items: sets.map((s) => `${s.title} · ${s.words} Wörter`),
      // The set's name stays German (it is what the PDF prints); the count follows the UI.
      itemKeys: sets.map((s) => ({ key: "wissen.toc.setRow", vars: { title: s.title, n: s.words } })),
      itemTr: sets.map((s) => setTr(s.id)),
    };
  }
  if (entry.category === "pruefungen") {
    // The Bayern booklets are the Landesfragen; the two Fakten bands are the topic
    // chapters. Both are answered by what the file's own name says it is.
    if (entry.states) {
      return {
        label: "In jedem Übungsbogen", labelKey: "wissen.toc.land",
        items: ["Kurzprofil des Bundeslands", "Fragen zum Bundesland", `${lid.questions.length} bundesweite Fragen`, "Lösungen am Ende"],
        itemKeys: [{ key: "wissen.toc.land.profile" }, { key: "wissen.toc.land.q" }, { key: "wissen.toc.land.fed", vars: { n: lid.questions.length } }, { key: "wissen.toc.land.key" }],
      };
    }
    if (entry.file.includes("bayern")) {
      return {
        label: "Landesteil Bayern", labelKey: "wissen.toc.bayern",
        items: ["10 Landesfragen mit Lösungen", "Karte und Kurzprofil des Bundeslands"],
        itemKeys: [{ key: "wissen.toc.bayern.q" }, { key: "wissen.toc.bayern.map" }],
      };
    }
    return { label: `${lid.topics.length} Kapitel`, labelKey: "wissen.toc.chapters", labelVars: { n: lid.topics.length }, items: lid.topics.map((t) => t.title), itemTr: lid.topics.map((t) => chapterTr(t.id)) };
  }
  return null;
}

const all = catalogue.files.map(hydrate).filter(Boolean).map((f) => ({ ...f, contents: contentsOf(f) }));

/** The cards. A file with a `parent` is listed inside that card's sheet instead. */
export const files = all
  .filter((f) => !f.parent)
  .map((f) => ({ ...f, extras: all.filter((x) => x.parent === f.id) }));

export const featured = files.filter((f) => f.featured);

/** Categories in catalogue order, each carrying only the files that exist.
 *  The featured ones are left out: they already lead the page, and listing them
 *  twice made "14 PDFs" look like sixteen rows. */
/* The exam boards' own Modellsätze, downloaded straight from the publisher's PDF URL rather
   than via their landing pages. Not ours to host (see rightsNote), so they are
   not in `files` and do not count towards the totals. The sizes are typed in by hand, since there is no
   local file to stat. */
export const external = (catalogue.external ?? []).map((e) => ({ ...e, size: formatSize(e.bytes) }));

export const categories = catalogue.categories
  .map((c) => ({
    ...c,
    items: files.filter((f) => f.category === c.id && !f.featured),
    external: c.id === "pruefungen" ? external : [],
  }))
  .filter((c) => c.items.length || c.external.length);

export const links = catalogue.links;
export const rightsNote = catalogue.rightsNote;
export const rights = catalogue.rights;

// Every file on offer: each state's booklet counts, not just the card's default one.
const everyFile = all.flatMap((f) => (f.states ? f.states : [f]));
export const totals = {
  files: everyFile.length,
  pages: everyFile.reduce((n, f) => n + (f.pages ?? 0), 0),
  bytes: everyFile.reduce((n, f) => n + f.bytes, 0),
};
