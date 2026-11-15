// Builds the free reference lists as PDFs from the same files the /grammar/<ref> pages
// render (src/data/nachschlagen/*.json): irregular verbs, phrasal verbs, verbs with
// prepositions. One PDF per file, named after its English URL:
//
//   pnpm generate:reference-pdf
//
// → public/downloads/english-irregular-verbs.pdf, english-phrasal-verbs-list.pdf,
//   english-verbs-with-prepositions.pdf (+ manifest.json).
//
// Layout: each section's explanation and rules, then its table (word · forms or what
// follows · example · level). Sub-headings inside a section ("# i – a – u: sing, sang, sung")
// become rows of their own. Copy in scripts/lib/pdf-copy.mjs.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createDoc, plain, MUTED, TEAL_DARK, MARGIN } from "./lib/pdf-brand.mjs";
import { loadArt } from "./lib/pdf-art.mjs";
import { COURSE, REFERENCE as T, footerLine } from "./lib/pdf-copy.mjs";
import { REF_SLUGS } from "../src/lib/routes.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data", "nachschlagen");
const outDir = path.join(root, "public", "downloads");
const LOGO = readFileSync(path.join(root, "public", "logos", "icanspeak-wordmark-1200.png"));

/** *word* → word: the data marks examples with asterisks for the site's italics. */
const text = (s) => plain(String(s ?? "")).replace(/\*([^*]+)\*/g, "$1");

async function build(file) {
  const data = JSON.parse(readFileSync(path.join(dataDir, `${file}.json`), "utf8"));
  const slug = REF_SLUGS[file];
  if (!slug) return;
  const fileName = `${COURSE.filePrefix}-${slug}.pdf`;
  const outPath = path.join(outDir, fileName);
  const pagePath = `/grammar/${slug}`;
  const art = await loadArt();
  const pdf = createDoc({ outPath, title: `${COURSE.name} · ${data.title}`, runningHead: T.runningHead(data.title), footerText: footerLine(pagePath), unicode: true });
  const entries = data.sections.flatMap((s) => s.items.filter((i) => Array.isArray(i)));

  pdf.cover({
    eyebrow: T.eyebrow,
    title: data.title,
    subtitle: text(data.description),
    art: art.mascot.read ?? art.mascot.wave,
    logo: LOGO,
    meta: T.coverMeta({ items: entries.length, sections: data.sections.length }),
    footer: COURSE.rights,
  });

  pdf.chapter(data.title, null);
  if (data.lead) pdf.paragraph(text(data.lead), { size: 10.5 });
  for (const r of [data.regel ?? []].flat().filter(Boolean)) pdf.bullet(text(r));
  if (data.stress) pdf.paragraph(text(data.stress), { color: MUTED, size: 9.5 });

  const w = pdf.contentWidth();
  // Word · forms (or what follows) · example · level. The level column stays narrow.
  const head = ["", text(data.cols), T.example, T.level];
  const widths = [w * 0.2, w * 0.3, w * 0.42, w * 0.08];
  for (const s of data.sections) {
    pdf.section(text(s.name), null);
    if (s.what) pdf.paragraph(text(s.what), { size: 10 });
    for (const r of s.regel ?? []) pdf.bullet(text(r), { size: 9.75 });
    // Rows; a "# heading" string closes the running table and opens a new one under it.
    const flush = (rows, caption) => {
      if (!rows.length) return;
      // A group without a single example drops the column rather than print it empty.
      const withEx = rows.some((r) => r[2]);
      const h = [caption ?? text(s.name), ...head.slice(1)].filter((_, i) => withEx || i !== 2);
      const body = withEx ? rows : rows.map((r) => [r[0], r[1], r[3]]);
      const ws = withEx ? widths : [w * 0.3, w * 0.58, w * 0.12];
      pdf.ensureSpace(pdf.tableHeight(h, body, { widths: ws }, Math.min(3, body.length)) + 6);
      pdf.table(h, body, { widths: ws, fontSize: 8.75 });
    };
    let rows = [];
    let caption = null;
    for (const it of s.items) {
      if (typeof it === "string") {
        flush(rows, caption);
        rows = [];
        caption = text(it.replace(/^#\s*/, ""));
        continue;
      }
      const [word, forms, example, level] = it;
      rows.push([text(word), text(forms), text(example ?? ""), level ?? ""]);
    }
    flush(rows, caption);
  }

  if (data.practice?.length) {
    pdf.h2(T.practiceTitle, { icon: art.icon.pencil, keep: 60 });
    pdf.paragraph(T.practiceLead, { size: 10 });
    for (const [href, label] of data.practice) pdf.bullet(`${label}: ${COURSE.site}${href}`);
  }

  await pdf.finish();
  console.log(`${fileName.padEnd(40)} ${String(entries.length).padStart(3)} entries  ${Math.round(statSync(outPath).size / 1024)} KB`);
}

const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
for (const f of readdirSync(dataDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))) {
  if (!only || f.includes(only) || REF_SLUGS[f]?.includes(only)) await build(f);
}
