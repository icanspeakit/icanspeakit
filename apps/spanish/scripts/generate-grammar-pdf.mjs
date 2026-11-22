// Builds the free Spanish grammar books from the course's own grammar data:
// src/data/grammatik/*.json (the topic workspaces) plus src/data/grammatik.json (the
// quiz-only topics). One book per level (A1–C1) and one complete edition.
//
//   pnpm generate:grammar-pdf            all books
//   node scripts/generate-grammar-pdf.mjs b1     only the files whose name contains "b1"
//
// → public/downloads/gramatica-espanola-<level>.pdf and gramatica-espanola-a1-c1-completa.pdf,
//   with their size and page count in public/downloads/manifest.json (read by /conocimientos).
//
// Each chapter runs in teaching order: what it is about, a link and QR code to the topic's
// online exercises, the rule, the sentence pattern, the reference tables, Remember, then the
// exercises as a worksheet with blank answer lines; the answers go to a key at the back.
// Only reviewed topics are printed (src/lib/topicStatus.js), like everywhere else.
//
// Everything a reader sees that is not course data is in scripts/lib/pdf-copy.mjs, so the
// Spanish and French courses can reuse this file as it is. It replaces the German course's
// generate-grammatik-pdf.mjs, which printed German book copy around these topics.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import QRCode from "qrcode";
import { createDoc, plain, MUTED, TEAL, TEAL_DARK, TEAL_SOFT, INK, BORDER, MARGIN } from "./lib/pdf-brand.mjs";
import { loadArt } from "./lib/pdf-art.mjs";
import { COURSE, GRAMMAR as T, FILES, footerLine } from "./lib/pdf-copy.mjs";
import { isReviewed } from "../src/lib/topicStatus.js";
import { orderOf } from "../src/lib/grammatikOrder.js";
import { topicPath } from "../src/lib/routes.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "downloads");
const LOGO = readFileSync(path.join(root, "public", "logos", "icanspeak-wordmark-1200.png"));
const ALL_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// --- Load -------------------------------------------------------------------

const wsDir = path.join(root, "src", "data", "grammatik");
const allWorkspaces = readdirSync(wsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(wsDir, f), "utf8")));
const workspaces = allWorkspaces.filter(isReviewed);
const quizTopics = JSON.parse(readFileSync(path.join(root, "src", "data", "grammatik.json"), "utf8")).filter(isReviewed);
// Same rule as src/lib/catalog.js: a quiz topic whose workspace is still a draft is printed
// in its quiz form, so the book and the site list the same topics.
const wsIds = new Set(workspaces.map((w) => w.id));
const topics = [
  ...workspaces.map((w) => ({ kind: "workspace", ...w })),
  ...quizTopics.filter((t) => !wsIds.has(t.id)).map((t) => ({ kind: "quiz", ...t })),
];
// The levels the data has, in order: the complete edition's range follows the data.
const LEVELS = ALL_LEVELS.filter((lv) => topics.some((t) => t.level === lv));
const RANGE = `${LEVELS[0]}–${LEVELS.at(-1)}`;

// --- Small helpers ------------------------------------------------------------

const firstAnswer = (a) => plain(Array.isArray(a) ? a[0] : a);

/** A rule bullet: "tag — text", unless the text already starts with its tag. */
function ruleLine(item) {
  const text = plain(item.html ?? item.text);
  const tag = plain(item.tag ?? "");
  if (!tag || !/\p{L}/u.test(tag) || text.toLowerCase().startsWith(tag.toLowerCase())) return text;
  return `${tag}: ${text}`;
}

/** A gap sentence for paper: the gap as a line, the hint and the choices after it. */
function gapLine(item) {
  let s = plain(item.prompt).replace(/_{2,}/g, "________");
  if (item.hint && !s.includes(`(${plain(item.hint)})`)) s += ` (${plain(item.hint)})`;
  if (Array.isArray(item.choices) && item.choices.length > 1) s += `   [${item.choices.map(plain).join(" / ")}]`;
  return s;
}

/** The sentence-pattern strip as chips, the way the site draws it. */
function flowStrip(pdf, items) {
  const { doc } = pdf;
  const chipH = 20;
  const lineH = chipH + 8;
  pdf.ensureSpace(lineH * 2 + 8);
  let x = MARGIN;
  let y = doc.y;
  const parts = [];
  for (const raw of items.map(plain)) {
    const m = raw.match(/^([+=→,])\s*(.*)$/);
    if (raw === "," || raw === "→" || raw === "+") parts.push({ conn: raw });
    else if (m) parts.push({ conn: m[1] }, { chip: m[2] });
    else {
      if (parts.length && parts.at(-1).chip !== undefined) parts.push({ conn: "→" });
      parts.push({ chip: raw });
    }
  }
  for (const p of parts) {
    if (p.conn) {
      const cw = doc.font(pdf.F.bold).fontSize(12).widthOfString(p.conn) + 10;
      doc.fillColor(TEAL).text(p.conn, x + 5, y + 3.5, { lineBreak: false });
      x += cw;
      continue;
    }
    const tw = doc.font(pdf.F.bold).fontSize(9.5).widthOfString(pdf.S(p.chip));
    const cw = Math.min(tw + 18, pdf.contentWidth());
    if (x + cw > MARGIN + pdf.contentWidth()) { x = MARGIN; y += lineH; }
    doc.roundedRect(x, y, cw, chipH, 10).fill(TEAL_SOFT);
    doc.fillColor(TEAL_DARK).font(pdf.F.bold).fontSize(9.5).text(pdf.S(p.chip), x + 9, y + 5.5, { width: cw - 12, lineBreak: false, ellipsis: true });
    x += cw;
  }
  doc.x = MARGIN;
  doc.y = y + lineH;
  doc.moveDown(0.2);
}

/** A bullet whose answer part is bold: a finished model sentence. */
function exampleLine(pdf, before, answer, after) {
  const { doc } = pdf;
  pdf.ensureSpace(16);
  const y = doc.y;
  doc.fillColor(TEAL).font(pdf.F.bold).fontSize(10.25).text("•", MARGIN, y, { width: 12 });
  doc.fillColor(INK).font(pdf.F.regular).fontSize(10.25)
    .text(pdf.S(before), MARGIN + 12, y, { width: pdf.contentWidth() - 12, continued: true, lineGap: 2 })
    .font(pdf.F.bold).fillColor(TEAL_DARK).text(pdf.S(answer), { continued: true })
    .font(pdf.F.regular).fillColor(INK).text(pdf.S(after));
  doc.x = MARGIN;
  doc.moveDown(0.3);
}

// --- One chapter --------------------------------------------------------------

function renderTopic(pdf, topic, { num, withBadge, art, key, online }) {
  pdf.chapter(`${num}. ${topic.name}`, withBadge ? topic.level : null);
  const exercises = [];

  if (topic.subtitle) pdf.paragraph(plain(topic.subtitle), { color: MUTED, size: 10.5 });

  // The way back to the site, under every chapter heading: the short address and a QR code
  // on paper, the whole box as a link in a PDF viewer.
  const o = online.get(topic.id);
  pdf.tip(`${T.online}\n${o.url}`, { art: o.qr, artW: 46, tone: "online", link: o.href, title: T.onlineTitle });

  if (topic.kind === "quiz") {
    // A quiz-only topic: the rule in one paragraph, three finished models, the rest to do.
    if (topic.intro) {
      pdf.h2(T.rule, { icon: art.icon.rule, keep: 40 });
      pdf.callout(plain(topic.intro), { fill: TEAL_SOFT });
    }
    const qs = topic.questions ?? [];
    const [models, practice] = [qs.slice(0, 3), qs.slice(3)];
    if (models.length) {
      pdf.h2(T.examples, { icon: art.icon.example, keep: 50 });
      for (const q of models) {
        const [before, after = ""] = plain(q.prompt.replace(/<em>\(.*?\)<\/em>/g, "")).split(/_{2,}/);
        exampleLine(pdf, before, firstAnswer(q.answer), after);
      }
    }
    if (practice.length) {
      exercises.push({ title: T.fill, hint: "", columns: [T.sentence, T.answer], rows: practice.map((q) => [gapLine(q), firstAnswer(q.answer)]), sentences: true });
    }
  } else {
    const c = topic.concept ?? {};
    if (c.qa?.length) {
      pdf.h2(T.rule, { icon: art.icon.rule, keep: 40 });
      for (const item of c.qa) pdf.bullet(ruleLine(item));
    }
    if (c.flow?.length) {
      pdf.h2(T.shape, { icon: art.icon.flow, keep: 48 });
      flowStrip(pdf, c.flow.map((f) => f.text));
      if (c.exampleHtml) pdf.paragraph(`${T.example}: ${plain(c.exampleHtml)}`, { italic: true, color: TEAL_DARK, size: 10.5 });
    }
    for (const t of c.reference?.tables ?? []) {
      const head = t.head.map(plain);
      const rows = t.rows.map((r) => r.map((cell) => plain(cell).replace(/[{}]/g, "")));
      pdf.h2(plain(t.caption) || T.overview, { icon: art.icon.table, keep: pdf.tableHeight(head, rows, {}, 3) });
      pdf.table(head, rows);
    }
    for (const box of c.reference?.boxes ?? []) {
      const items = (box.items ?? []).map((item) => (typeof item === "string" ? plain(item) : plain(item.html ?? item.text ?? "")));
      if (box.badge) pdf.h2(plain(box.badge), { icon: art.icon.example, keep: Math.min(3, items.length) * 18 });
      for (const it of items) pdf.bullet(it);
    }
    if (c.noteHtml) pdf.tip(plain(c.noteHtml), { art: art.mascot.idea, title: T.remember });

    // What survives paper: the table exercises (term → answer) and the gap sentences.
    // Matching, story and sentence-building are interactions and stay online.
    for (const ex of topic.exercises ?? []) {
      if (ex.type === "table" && ex.rows?.length) {
        exercises.push({ title: plain(ex.title), hint: plain(ex.hintPrint ?? ex.hint ?? ""), columns: (ex.columns ?? ["", T.answer]).map(plain), rows: ex.rows.map((r) => [plain(r.term), firstAnswer(r.answer)]) });
      } else if (ex.type === "fill" && ex.items?.length) {
        exercises.push({ title: plain(ex.title) || T.fill, hint: plain(ex.hintPrint ?? ex.hint ?? ""), columns: [T.sentence, T.answer], rows: ex.items.map((it) => [gapLine(it), firstAnswer(it.answer)]), sentences: true });
      }
    }
  }

  if (exercises.length) pdf.tip(T.practice, { art: art.mascot.write, title: T.practiceTitle });
  exercises.forEach((ex, k) => {
    const label = `${T.exercise} ${num}.${k + 1}`;
    const head = ex.columns;
    const rows = ex.rows.map(([term]) => [term, ""]);
    const w = pdf.contentWidth();
    const opts = { writeCols: [1], rowPadding: 8, squeeze: 4, minRowHeight: 12, widths: ex.sentences ? [w * 0.72, w * 0.28] : [w * 0.55, w * 0.45] };
    const hintH = ex.hint ? pdf.paragraphHeight(ex.hint, { size: 9.5 }) : 0;
    pdf.h2(`${label}: ${ex.title}`, { icon: art.icon.pencil, keep: hintH + pdf.tableHeight(head, rows, opts, 3) });
    if (ex.hint) pdf.paragraph(ex.hint, { color: MUTED, size: 9.5 });
    pdf.table(head, rows, opts);
    key.push({ label, chapter: `${num}. ${topic.name}`, rows: ex.rows });
  });
  return exercises.length;
}

/** Each topic's page and QR code; the link carries the book's name in utm tags. */
async function onlineLinks(list, book) {
  const pairs = await Promise.all(list.map(async (t) => {
    const url = `${COURSE.site}${topicPath(t.slug ?? t.id)}`;
    const href = `https://${url}?utm_source=pdf&utm_medium=${T.utmMedium}&utm_campaign=${book}`;
    const qr = await QRCode.toBuffer(`https://${url}?utm_source=pdf`, { margin: 1, width: 300, color: { dark: "#172A6E", light: "#ffffff" } });
    return [t.id, { url, href, qr }];
  }));
  return new Map(pairs);
}

// --- Front and back matter ----------------------------------------------------

function levelOpener(pdf, level, list, art) {
  const { doc } = pdf;
  doc.addPage();
  const w = pdf.contentWidth();
  doc.roundedRect(MARGIN, 90, w, 230, 16).fill(TEAL_SOFT);
  doc.image(pdf.pic(art.mascot.cheer), MARGIN + w - 190, 105, { width: 170 });
  doc.fillColor(TEAL_DARK).font(pdf.F.bold).fontSize(72).text(level, MARGIN + 28, 120, { lineBreak: false });
  doc.fillColor(INK).font(pdf.F.bold).fontSize(20).text(pdf.S(T.levelBlurb[level] ?? ""), MARGIN + 30, 215, { width: w - 240 });
  doc.fillColor(MUTED).font(pdf.F.regular).fontSize(10.5).text(T.levelTopics(list.length), MARGIN + 30, 250, { width: w - 240 });
  doc.y = 350;
  for (const { num, topic } of list) pdf.bullet(`${num}. ${topic.name}`);
}

function solutions(pdf, key, art) {
  pdf.chapter(T.solutions, null);
  pdf.tip(T.solutionsLead, { art: art.mascot.cheer });
  let chapter = null;
  for (const ex of key) {
    if (ex.chapter !== chapter) {
      chapter = ex.chapter;
      pdf.section(chapter, null);
    }
    const head = [ex.label, ""];
    const opts = { fontSize: 8, rowPadding: 3, headerHeight: 16, widths: [pdf.contentWidth() * 0.66, pdf.contentWidth() * 0.34], inkCols: [1] };
    pdf.ensureSpace(pdf.tableHeight(head, ex.rows, opts, 3) + 10);
    pdf.table(head, ex.rows, opts);
  }
}

const TOC_ROW = 15.5;
const TOC_ROWS_PER_PAGE = 44;
const tocPagesFor = (n) => Math.max(1, Math.ceil(n / TOC_ROWS_PER_PAGE));

/** The contents, drawn last onto the pages reserved for them, when the numbers are known. */
function contents(pdf, firstPage, entries) {
  const { doc } = pdf;
  const w = pdf.contentWidth();
  let page = firstPage;
  let rowsOnPage = 0;
  const startPage = (first) => {
    doc.switchToPage(page);
    doc.x = MARGIN;
    doc.y = 60;
    if (first) pdf.h2(T.contents);
    rowsOnPage = 0;
  };
  startPage(true);
  for (const e of entries) {
    if (rowsOnPage >= TOC_ROWS_PER_PAGE - (e.level ? 2 : 0)) { page++; startPage(false); }
    if (e.level) {
      doc.y += 5;
      doc.fillColor(TEAL_DARK).font(pdf.F.bold).fontSize(9).text(e.level, MARGIN, doc.y, { lineBreak: false, characterSpacing: 1 });
      doc.moveTo(MARGIN + 26, doc.y + 5).lineTo(MARGIN + w, doc.y + 5).strokeColor(BORDER).lineWidth(1).stroke();
      doc.y += TOC_ROW + 1;
      rowsOnPage += 1.4;
      continue;
    }
    const y = doc.y;
    doc.fillColor(INK).font(pdf.F.regular).fontSize(9.5).text(pdf.S(e.title), MARGIN + 8, y, { width: w - 60, lineBreak: false, ellipsis: true });
    doc.fillColor(TEAL_DARK).font(pdf.F.bold).fontSize(9.5).text(String(e.page), MARGIN + w - 40, y, { width: 40, align: "right", lineBreak: false });
    doc.moveTo(MARGIN + 8, y + TOC_ROW - 3).lineTo(MARGIN + w, y + TOC_ROW - 3).strokeColor(BORDER).lineWidth(0.4).stroke();
    doc.y = y + TOC_ROW;
    rowsOnPage += 1;
  }
}

// --- Build one book -------------------------------------------------------------

async function buildBook({ level, fileName }) {
  const art = await loadArt();
  const list = level ? topics.filter((t) => t.level === level) : topics;
  const ordered = LEVELS.flatMap((lv) => list.filter((t) => t.level === lv).sort((a, b) => orderOf(a) - orderOf(b)));
  const range = level ?? RANGE;
  const outPath = path.join(outDir, fileName);
  const pdf = createDoc({
    outPath,
    title: `${COURSE.name} · ${T.title(range)}`,
    runningHead: T.runningHead(range),
    footerText: footerLine(level ? `/gramatica#nivel-${level.toLowerCase()}` : "/gramatica"),
    unicode: true,
  });
  const tableCount = ordered.reduce((n, t) => n + (t.concept?.reference?.tables?.length ?? 0), 0);
  // The exercise count on the cover is the one the chapters will print; counted the same way.
  const exerciseCount = ordered.reduce((n, t) => n + (t.kind === "quiz"
    ? ((t.questions ?? []).length > 3 ? 1 : 0)
    : (t.exercises ?? []).filter((e) => (e.type === "table" && e.rows?.length) || (e.type === "fill" && e.items?.length)).length), 0);

  pdf.cover({
    eyebrow: T.eyebrow,
    title: T.title(range),
    subtitle: level ? T.subtitleLevel(level, T.levelBlurb[level] ?? "") : T.subtitleAll(RANGE),
    art: art.mascot.wave,
    logo: LOGO,
    meta: T.coverMeta({ topics: ordered.length, levels: level ? null : LEVELS, tables: tableCount, exercises: exerciseCount }),
    footer: COURSE.rights,
  });

  // Reserve the contents pages; drawn at the end, when the page numbers are known.
  const entryCount = ordered.length + (level ? 1 : LEVELS.length) * 1.4 + 3;
  const tocFirst = pdf.pageNumber();
  for (let i = 0; i < tocPagesFor(entryCount); i++) pdf.doc.addPage();
  const entries = [];
  const nextPage = () => pdf.pageNumber() + 1;

  const key = [];
  const online = await onlineLinks(ordered, fileName.replace(/\.pdf$/, ""));
  let num = 0;
  for (const lv of LEVELS) {
    const inLevel = ordered.filter((t) => t.level === lv);
    if (!inLevel.length) continue;
    const numbered = inLevel.map((topic) => ({ topic, num: ++num }));
    if (!level) levelOpener(pdf, lv, numbered, art);
    entries.push({ level: lv });
    for (const { topic, num: n } of numbered) {
      entries.push({ title: `${n}. ${topic.name}`, page: nextPage() });
      renderTopic(pdf, topic, { num: n, withBadge: !level, art, key, online });
    }
  }
  entries.push({ level: " " }, { title: T.solutions, page: nextPage() });
  solutions(pdf, key, art);
  contents(pdf, tocFirst, entries);

  await pdf.finish();
  const kb = Math.round(statSync(outPath).size / 1024);
  console.log(`${fileName.padEnd(40)} ${String(ordered.length).padStart(2)} topics  ${kb} KB`);
}

const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
const books = [
  ...LEVELS.filter((lv) => topics.some((t) => t.level === lv)).map((level) => ({ level, fileName: FILES.grammar(level.toLowerCase()) })),
  { level: null, fileName: FILES.grammarAll(RANGE.toLowerCase().replace("–", "-")) },
];
for (const b of books) if (!only || b.fileName.includes(only)) await buildBook(b);
