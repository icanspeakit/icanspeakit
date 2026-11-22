// The /conocimientos catalogue, joined to what is actually on disk.
//
// src/data/downloads.json says what a file IS — title, level, category, who wrote it. The
// generators say how BIG it is and how many pages it has, in public/downloads/manifest.json.
// Keeping those apart is the point: the size of a PDF is not something anyone should be
// hand-maintaining in a catalogue, and it goes stale the first time a generator runs.
//
// A catalogue entry whose file is missing is dropped rather than rendered as a dead link —
// someone cloning the repo before running the generators (pnpm generate:pdfs) would otherwise
// get a page full of 404s.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import catalogue from "../data/downloads.json";
import { grammarTopics } from "./catalog.js";
import { lernsets } from "./lernsets.js";
import themenTr from "../data/uebersetzungen/grammatik-themen.json";
import { langsFor, languageOf } from "./languages.js";
import startBook from "../data/grammatik-start/en.json";
import { orderOf } from "./grammatikOrder.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

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

/** "1.2 MB" / "214 KB". */
export function formatSize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function fileInfo(file) {
  const abs = path.join(DIR, file);
  if (!existsSync(abs)) return null;
  const meta = manifest[file] ?? {};
  const bytes = meta.bytes ?? statSync(abs).size;
  return { file, href: `/downloads/${file}`, pages: meta.pages ?? null, bytes, size: formatSize(bytes) };
}

/* The editions of a book with the explanations in another language (Grammar Start:
   gramatica-espanola-inicio-<code>.pdf, generate-grammatik-start-pdf.mjs). Listed in the
   catalogue (`editions`), found on disk by name: the generator only writes a language whose
   translation file is written. Labels are each language's own name. */
const edition = (l) => ({ lang: l.code, hreflang: l.hreflang ?? l.code, label: l.native, ...(l.dir === "rtl" ? { rtl: true } : {}) });
function editionsOf(entry) {
  if (!entry.editions) return [];
  const base = entry.file.replace(/\.pdf$/, "");
  const list = entry.editions.map((c) => languageOf(c)).filter(Boolean).map(edition);
  return list.map((e) => {
    const info = fileInfo(`${base}-${e.lang}.pdf`);
    return info && { ...e, ...info };
  }).filter(Boolean);
}

function hydrate(entry) {
  const info = fileInfo(entry.file);
  if (!info) return null;
  return { ...entry, ...info, editions: editionsOf(entry) };
}

/* The contents lines in the learner's language. A line is what the book prints (English
   topic names), and can carry its translations; the page shows the one for the interface
   language under it (CSS only, see .wi-toc-tr in wissen.css).
   Sources: grammar topic names (uebersetzungen/grammatik-themen.json), set names (the same
   ws.set.* strings the vocabulary picker uses). */
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

// What is actually inside a PDF, read from the same data the generator used — not
// typed into the catalogue, where it would drift the first time a topic is added.
// The download page shows this before the file is fetched: a 210 KB PDF that turns
// out to be the wrong level is a wasted download on a phone plan.
// Grammar Start's chapter titles in the help languages, from the book's own translations.
const startTr = Object.fromEntries(TR_LANGS.map((l) => {
  try {
    const book = JSON.parse(readFileSync(path.join(process.cwd(), "src", "data", "grammatik-start", `${l}.json`), "utf8"));
    return [l, book.status === "skeleton" ? null : book]; // a skeleton still holds the English titles
  } catch {
    return [l, null];
  }
}));

/** The levels a range like "A1–C1" spans; a single level gives itself. */
function levelsOf(range) {
  const [x, y = x] = String(range).split(/[–-]/);
  const i = LEVELS.indexOf(x);
  const j = LEVELS.indexOf(y);
  return i < 0 || j < 0 ? [] : LEVELS.slice(i, j + 1);
}

// The reference lists: catalogue id → file in src/data/nachschlagen (the page /gramatica/<slug>).
const REF_FILES = {
  "verbos-irregulares": "starke-schwache-verben",
  "lista-de-verbos-reflexivos": "trennbare-verben",
  "verbos-con-preposiciones": "verben-mit-praepositionen",
};
const refData = Object.fromEntries(Object.entries(REF_FILES).map(([id, f]) => {
  try {
    return [id, JSON.parse(readFileSync(path.join(process.cwd(), "src", "data", "nachschlagen", `${f}.json`), "utf8"))];
  } catch {
    return [id, null];
  }
}));
const conjugation = (() => {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "src", "data", "verbtabellen.json"), "utf8"));
  } catch {
    return null;
  }
})();

function contentsOf(entry) {
  if (entry.id === "gramatica-inicio") {
    return {
      label: `${startBook.chapters.length} chapters`,
      labelKey: "wissen.toc.chapters", labelVars: { n: startBook.chapters.length },
      items: startBook.chapters.map((c) => `${c.level} · ${c.titleDe}`),
      itemTr: startBook.chapters.map((c) => pick((l) => startTr[l]?.chapters?.[c.id]?.title)),
    };
  }
  if (entry.category === "gramatica") {
    const levels = levelsOf(entry.level);
    const many = levels.length > 1;
    const topics = grammarTopics
      .filter((t) => levels.includes(t.level))
      .sort((x, y) => levels.indexOf(x.level) - levels.indexOf(y.level) || orderOf(x) - orderOf(y));
    return {
      label: many ? `All ${topics.length} topics, by level` : `${topics.length} topics in this book`,
      labelKey: many ? "wissen.toc.allTopics" : "wissen.toc.topicsInBand", labelVars: { n: topics.length },
      items: topics.map((t) => (many ? `${t.level} · ${t.name}` : t.name)),
      itemTr: topics.map((t) => topicTr(t.id)),
    };
  }
  if (entry.category === "vocabulario") {
    const sets = lernsets({ level: entry.level, status: "built" });
    return {
      label: `${sets.length} learning sets`,
      labelKey: "wissen.toc.sets", labelVars: { n: sets.length },
      items: sets.map((s) => `${s.title} · ${s.words} words`),
      itemKeys: sets.map((s) => ({ key: "wissen.toc.setRow", vars: { title: s.title, n: s.words } })),
      itemTr: sets.map((s) => setTr(s.id)),
    };
  }
  if (entry.id === "conjugacion" && conjugation) {
    const n = conjugation.groups.length;
    return {
      label: `${n} groups`,
      labelKey: "wissen.toc.groups", labelVars: { n },
      items: conjugation.groups.map((g) => `${g.name} · ${conjugation.verbs.filter((v) => v.group === g.id).length}`),
    };
  }
  if (entry.category === "listas") {
    const data = refData[entry.id];
    if (!data) return null;
    return {
      label: `${data.sections.length} groups`,
      labelKey: "wissen.toc.groups", labelVars: { n: data.sections.length },
      items: data.sections.map((s) => `${s.name} · ${s.items.filter(Array.isArray).length}`),
    };
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
export const faq = catalogue.faq ?? [];
export const rightsNote = catalogue.rightsNote;
export const rights = catalogue.rights;

// Every file on offer: each language edition counts, not just the card.
const everyFile = all.flatMap((f) => [f, ...f.editions]);
export const totals = {
  files: everyFile.length,
  pages: everyFile.reduce((n, f) => n + (f.pages ?? 0), 0),
  bytes: everyFile.reduce((n, f) => n + f.bytes, 0),
};

/** The level range the files cover, from the files themselves: "A1–C2". */
export const levelRange = (() => {
  const ls = all.flatMap((f) => levelsOf(f.level));
  const sorted = LEVELS.filter((l) => ls.includes(l));
  return sorted.length ? `${sorted[0]}–${sorted.at(-1)}` : "";
})();
