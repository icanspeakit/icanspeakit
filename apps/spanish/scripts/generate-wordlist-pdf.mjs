// Builds the free word lists from the course lexicon: one PDF per level, grouped by
// learning set (the same sets as the flashcards at /vocabulario/<set>).
//
//   pnpm generate:wordlist-pdf          every level
//   node scripts/generate-wordlist-pdf.mjs b1
//
// → public/downloads/vocabulario-espanol-<level>.pdf (+ manifest.json).
//
// Every word, IPA, definition and example comes from src/content/lexicon/*.json via
// src/lib/lexicon.js and src/lib/lernsets.js, the data the flashcard trainer loads, so the
// list and the trainer cannot disagree. The embedded Noto face draws IPA. Copy in
// scripts/lib/pdf-copy.mjs. Replaces the German course's generate-wortschatz-pdf.mjs.
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { all, LEVELS } from "../src/lib/lexicon.js";
import { lernsets } from "../src/lib/lernsets.js";
import { createDoc, MUTED, INK, TEAL_DARK, MARGIN } from "./lib/pdf-brand.mjs";
import { loadArt } from "./lib/pdf-art.mjs";
import { COURSE, WORDLIST as T, FILES, footerLine } from "./lib/pdf-copy.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "downloads");
const LOGO = readFileSync(path.join(root, "public", "logos", "icanspeak-wordmark-1200.png"));
const words = all();

/** The headword as the course prints it: "el nombre", with a verb's reflexive pronoun as stored. */
const headword = (w) => (w.pos === "noun" && w.gender ? `${w.gender} ${w.lemma}` : w.lemma);

/** "noun · pl. nombres · /ˈnom.bɾe/": what the word is and how it changes, in one line. */
function grammarLine(w) {
  const bits = [T.pos[w.pos] ?? ""];
  if (w.pos === "noun") {
    if (w.pluralOnly) bits.push(T.pluralOnly);
    else if (w.plural) bits.push(`${T.plural} ${w.plural}`);
  }
  if (w.pos === "verb" && w.forms?.length) bits.push(w.forms.join(" · "));
  if (w.pos === "adj" && w.fem && w.fem !== w.lemma) bits.push(`${T.feminine} ${w.fem}`);
  if (w.pos === "adj" && w.comparative) bits.push([w.comparative, w.superlative].filter(Boolean).join(", "));
  if (w.ipa) bits.push(`/${w.ipa}/`);
  return bits.filter(Boolean).join(" · ");
}

/** The right-hand cell: the English meaning, the Spanish example, and a Latin American note. */
const meaning = (w) => [w.en ?? "", w.example ?? "", w.es419?.note ?? ""].filter(Boolean).join("\n");

async function build(level) {
  const sets = lernsets({ level, status: "built" });
  const inLevel = words.filter((w) => w.level === level);
  if (!sets.length || !inLevel.length) return;
  const fileName = FILES.wordlist(level.toLowerCase());
  const outPath = path.join(outDir, fileName);
  const art = await loadArt();
  const pdf = createDoc({ outPath, title: `${COURSE.name} · ${T.title(level)}`, runningHead: T.runningHead(level), footerText: footerLine(`/vocabulario/${level.toLowerCase()}`), unicode: true });
  const listed = sets.map((s) => ({ ...s, items: inLevel.filter((w) => w.unit === s.id) })).filter((s) => s.items.length);
  const count = listed.reduce((n, s) => n + s.items.length, 0);

  pdf.cover({
    eyebrow: T.eyebrow,
    title: T.title(level),
    subtitle: T.subtitle(level, count, listed.length),
    art: art.mascot.read ?? art.mascot.wave,
    logo: LOGO,
    meta: T.coverMeta({ words: count, sets: listed.length }),
    footer: COURSE.rights,
  });

  const w = pdf.contentWidth();
  const widths = [w * 0.42, w * 0.58];
  let first = true;
  listed.forEach((s, i) => {
    if (first) { pdf.chapter(T.set(i + 1, s.title), level); first = false; }
    else pdf.section(T.set(i + 1, s.title), null);
    pdf.paragraph(`${COURSE.site}/vocabulario/${s.id}`, { color: MUTED, size: 8.5 });
    // Two lines per cell: the word over its grammar line, the meaning over its example.
    const rows = s.items.map((x) => [`${headword(x)}\n${grammarLine(x)}`, meaning(x)]);
    pdf.table(T.head, rows, { widths, fontSize: 8.75, rowPadding: 5 });
  });

  await pdf.finish();
  console.log(`${fileName.padEnd(40)} ${String(count).padStart(4)} words  ${String(listed.length).padStart(2)} sets  ${Math.round(statSync(outPath).size / 1024)} KB`);
}

const only = process.argv.slice(2).find((a) => !a.startsWith("--"))?.toUpperCase();
for (const level of LEVELS) if (!only || level === only) await build(level);
