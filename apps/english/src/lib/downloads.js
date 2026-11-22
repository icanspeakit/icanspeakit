// The /knowledge catalogue, joined to what is actually on disk.
//
// src/data/downloads.json says what a file IS: title, level, category, who wrote it. The
// generators say how BIG it is and how many pages it has, in public/downloads/manifest.json.
// Keeping those apart is the point: the size of a PDF goes stale the first time a generator
// runs, so nobody types it into the catalogue.
//
// A catalogue entry whose file is missing is dropped rather than rendered as a dead link.
//
// The generators (pnpm generate:pdfs): generate-grammar-pdf.mjs, generate-grammatik-start-pdf.mjs,
// generate-reference-pdf.mjs, generate-wordlist-pdf.mjs, generate-life-in-the-uk-pdf.mjs.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import catalogue from "../data/downloads.json";
import { grammarTopics } from "./catalog.js";
import { lernsets } from "./lernsets.js";
import lid from "../data/leben-in-deutschland.json";
import { languageOf } from "./languages.js";
import startBook from "../data/grammatik-start/en.json";
import { orderOf } from "./grammatikOrder.js";

const DIR = path.join(process.cwd(), "public", "downloads");
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

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
   english-grammar-start-<code>.pdf, generate-grammatik-start-pdf.mjs). Listed in the
   catalogue (`editions`), found on disk by name: the generator only writes a language whose
   translation file passes its check. Labels are each language's own name. */
const edition = (l) => ({ lang: l.code, hreflang: l.hreflang ?? l.code, label: l.native, ...(l.dir === "rtl" ? { rtl: true } : {}) });
function editionsOf(entry) {
  if (!entry.editions) return [];
  const base = entry.file.replace(/\.pdf$/, "");
  return entry.editions.map((c) => languageOf(c)).filter(Boolean).map(edition).map((e) => {
    const info = fileInfo(`${base}-${e.lang}.pdf`);
    return info && { ...e, ...info };
  }).filter(Boolean);
}

/* The nation sheets (generate-life-in-the-uk-pdf.mjs): one file per nation, offered in a
   single card with a dropdown rather than as four cards. */
function statesOf() {
  return lid.bundeslaender
    .map((l) => {
      const info = fileInfo(`life-in-the-uk-${l.id}.pdf`);
      return info && { id: l.id, name: l.name, ...info };
    })
    .filter(Boolean);
}

function hydrate(entry) {
  const info = fileInfo(entry.file);
  if (!info) return null;
  return { ...entry, ...info, editions: editionsOf(entry), states: entry.states ? statesOf() : null };
}

/** The levels a range like "A1–C1" spans; a single level gives itself. */
function levelsOf(range) {
  const [a, b = a] = String(range).split(/[–-]/);
  const i = LEVELS.indexOf(a);
  const j = LEVELS.indexOf(b);
  return i < 0 || j < 0 ? [] : LEVELS.slice(i, j + 1);
}

const REF_FILES = {
  "irregular-verbs": "starke-schwache-verben",
  "phrasal-verbs": "trennbare-verben",
  "verbs-prepositions": "verben-mit-praepositionen",
};
const refData = Object.fromEntries(Object.entries(REF_FILES).map(([id, f]) => {
  try {
    return [id, JSON.parse(readFileSync(path.join(process.cwd(), "src", "data", "nachschlagen", `${f}.json`), "utf8"))];
  } catch {
    return [id, null];
  }
}));

// What is actually inside a PDF, read from the same data the generator used, not typed into
// the catalogue, where it would drift the first time a topic is added. The sheet shows it
// before the file is fetched: a wrong-level download is a waste on a phone plan.
function contentsOf(entry) {
  if (entry.id === "grammatik-start") {
    return {
      label: `${startBook.chapters.length} chapters`,
      labelKey: "wissen.toc.chapters", labelVars: { n: startBook.chapters.length },
      items: startBook.chapters.map((c) => `${c.level} · ${c.titleDe}`),
    };
  }
  if (entry.category === "grammatik") {
    const levels = levelsOf(entry.level);
    const many = levels.length > 1;
    const topics = grammarTopics
      .filter((t) => levels.includes(t.level))
      .sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level) || orderOf(a) - orderOf(b));
    return {
      label: many ? `All ${topics.length} topics, by level` : `${topics.length} topics in this book`,
      labelKey: many ? "wissen.toc.allTopics" : "wissen.toc.topicsInBand", labelVars: { n: topics.length },
      items: topics.map((t) => (many ? `${t.level} · ${t.name}` : t.name)),
    };
  }
  if (entry.category === "wortschatz") {
    const sets = lernsets({ level: entry.level, status: "built" });
    return {
      label: `${sets.length} learning sets`,
      labelKey: "wissen.toc.sets", labelVars: { n: sets.length },
      items: sets.map((s) => `${s.title} · ${s.words} words`),
      itemKeys: sets.map((s) => ({ key: "wissen.toc.setRow", vars: { title: s.title, n: s.words } })),
    };
  }
  if (entry.category === "listen") {
    const data = refData[entry.id];
    if (!data) return null;
    return {
      label: `${data.sections.length} groups`,
      labelKey: "wissen.toc.groups", labelVars: { n: data.sections.length },
      items: data.sections.map((s) => `${s.name} · ${s.items.filter(Array.isArray).length}`),
    };
  }
  if (entry.category === "pruefungen") {
    if (entry.states) {
      return {
        label: "In each practice sheet", labelKey: "wissen.toc.land",
        items: ["A short profile of the nation", "Questions on the nation", `${lid.questions.length} questions on the whole UK`, "The answers at the end"],
        itemKeys: [{ key: "wissen.toc.land.profile" }, { key: "wissen.toc.land.q" }, { key: "wissen.toc.land.fed", vars: { n: lid.questions.length } }, { key: "wissen.toc.land.key" }],
      };
    }
    return { label: `${lid.topics.length} chapters`, labelKey: "wissen.toc.chapters", labelVars: { n: lid.topics.length }, items: lid.topics.map((t) => t.title) };
  }
  return null;
}

const all = catalogue.files.map(hydrate).filter(Boolean).map((f) => ({ ...f, contents: contentsOf(f) }));

/** The cards. A file with a `parent` is listed inside that card's sheet instead. */
export const files = all
  .filter((f) => !f.parent)
  .map((f) => ({ ...f, extras: all.filter((x) => x.parent === f.id) }));

export const featured = files.filter((f) => f.featured);

/* Publisher PDFs downloaded straight from the exam board (none at the moment): not ours to
   host (see rightsNote), so not in `files` and not in the totals. */
export const external = (catalogue.external ?? []).map((e) => ({ ...e, size: formatSize(e.bytes) }));

/** Categories in catalogue order, each carrying only the files that exist. The featured
 *  ones are left out: they already lead the page. */
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

// Every file on offer: each nation's sheet and each language edition counts, not just the card.
const everyFile = all.flatMap((f) => [...(f.states ?? [f]), ...f.editions]);
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
