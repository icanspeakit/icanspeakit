// Builds the free Life in the UK PDFs from src/data/leben-in-deutschland.json (the file the
// /life-in-the-uk pages read; the name is the German course's, the content is the UK's):
//
//   pnpm generate:life-in-the-uk-pdf
//
// → public/downloads/life-in-the-uk-facts.pdf         the facts by chapter, words to know, the four nations
//   public/downloads/life-in-the-uk-facts-simple.pdf  the same in simple English (the *Easy fields)
//   public/downloads/life-in-the-uk-<nation>.pdf      a practice sheet per nation: profile, the
//                                                      nation's questions and the UK-wide ones, answers at the end
//
// Replaces generate-fakten-pdf.mjs and generate-bundesland-pdf.mjs, which printed German
// headings and German test rules around the UK data. Copy in scripts/lib/pdf-copy.mjs.
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createDoc, MUTED, INK, TEAL_DARK, MARGIN } from "./lib/pdf-brand.mjs";
import { loadArt } from "./lib/pdf-art.mjs";
import { COURSE, LIFE_UK as T, footerLine } from "./lib/pdf-copy.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "downloads");
const LOGO = readFileSync(path.join(root, "public", "logos", "icanspeak-wordmark-1200.png"));
const lid = JSON.parse(readFileSync(path.join(root, "src", "data", "leben-in-deutschland.json"), "utf8"));
const { meta, topics, glossary, bundeslaender: nations, questions } = lid;
const LETTERS = ["A", "B", "C", "D", "E"];
const log = (file) => console.log(`${file.padEnd(40)} ${Math.round(statSync(path.join(outDir, file)).size / 1024)} KB`);

// The site picks the right answer from a fixed option list; on paper every answer would be
// the first. So the options are shuffled, seeded by the question: same order in every file.
function shuffled(q) {
  let seed = [...q.prompt].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
  const opts = [...q.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, options: opts };
}

const nationRows = (n) => [
  [T.capital, n.capital],
  [T.population, n.population],
  [T.parliament, n.parliamentName],
];

async function facts({ simple }) {
  const file = simple ? "life-in-the-uk-facts-simple.pdf" : "life-in-the-uk-facts.pdf";
  const art = await loadArt();
  const pdf = createDoc({ outPath: path.join(outDir, file), title: `${COURSE.name} · ${simple ? T.titleSimple : T.title}`, runningHead: T.runningHead, footerText: footerLine("/life-in-the-uk/facts"), unicode: true });
  const list = (t) => (simple ? t.factsEasy ?? t.facts : t.facts);
  pdf.cover({
    eyebrow: T.eyebrow,
    title: simple ? T.titleSimple : T.title,
    subtitle: simple ? T.subtitleSimple : T.subtitle,
    art: art.mascot.read ?? art.mascot.wave,
    logo: LOGO,
    meta: T.meta(topics.length, topics.reduce((n, t) => n + list(t).length, 0)),
    footer: COURSE.rights,
  });
  pdf.doc.addPage();
  pdf.callout(simple ? meta.realTestNoteEasy : meta.realTestNote);
  pdf.paragraph(simple ? meta.sourceNoteEasy : meta.sourceNote, { color: MUTED, size: 8.5 });
  topics.forEach((t, i) => {
    pdf.section(`${i + 1}. ${t.title}`, null);
    for (const f of list(t)) pdf.bullet(f);
    // The chapter's words, explained simply (the "de" key holds the English term).
    if (t.words?.length) {
      pdf.h2(T.glossary, { keep: 50 });
      pdf.table(T.wordHead, t.words.map((w) => [w.de, w.easy]), { widths: [pdf.contentWidth() * 0.3, pdf.contentWidth() * 0.7], fontSize: 9 });
    }
  });
  pdf.section(T.nations, null);
  for (const n of nations) {
    pdf.table([n.name, ""], nationRows(n), { widths: [pdf.contentWidth() * 0.3, pdf.contentWidth() * 0.7], fontSize: 9 });
  }
  pdf.paragraph(simple ? meta.stateFactsNoteEasy : meta.stateFactsNote, { color: MUTED, size: 9 });
  if (glossary?.length) {
    pdf.section(T.glossary, null);
    pdf.table(T.wordHead, glossary.map((g) => [g.term, simple ? g.defEasy ?? g.def : g.def]), { widths: [pdf.contentWidth() * 0.3, pdf.contentWidth() * 0.7], fontSize: 9 });
  }
  await pdf.finish();
  log(file);
}

async function nationSheet(n) {
  const file = `life-in-the-uk-${n.id}.pdf`;
  const art = await loadArt();
  const pdf = createDoc({ outPath: path.join(outDir, file), title: `${COURSE.name} · ${T.titleNation(n.name)}`, runningHead: `${T.runningHead} · ${n.name.toUpperCase()}`, footerText: footerLine("/life-in-the-uk/test"), unicode: true });
  const { doc, F, S } = pdf;
  pdf.cover({
    eyebrow: T.eyebrow,
    title: T.titleNation(n.name),
    subtitle: T.subtitleNation(n.name),
    art: art.mascot.wave,
    logo: LOGO,
    meta: [...T.metaNation(n.stateQuestions.length + questions.length), meta.realTestNoteEasy],
    footer: COURSE.rights,
  });
  doc.addPage();
  pdf.h2(`${T.profile}: ${n.name}`, { keep: 90 });
  pdf.table([n.name, ""], nationRows(n), { widths: [pdf.contentWidth() * 0.35, pdf.contentWidth() * 0.65] });
  pdf.paragraph(meta.stateFactsNoteEasy, { size: 8.5, color: MUTED });
  pdf.paragraph(meta.sourceNoteEasy, { size: 8.5, color: MUTED });

  let num = 0;
  const key = [];
  const question = (q) => {
    doc.font(F.bold).fontSize(10.25);
    const w = pdf.contentWidth() - 22;
    let h = doc.heightOfString(S(q.prompt), { width: w, lineGap: 2 }) + 6;
    doc.font(F.regular).fontSize(10);
    for (const o of q.options) h += doc.heightOfString(S(o), { width: w - 34, lineGap: 1 }) + 4;
    pdf.ensureSpace(h + 10);
    const y = doc.y;
    doc.fillColor(TEAL_DARK).font(F.bold).fontSize(10.25).text(`${num}.`, MARGIN, y, { width: 22 });
    doc.fillColor(INK).font(F.bold).fontSize(10.25).text(S(q.prompt), MARGIN + 22, y, { width: w, lineGap: 2 });
    doc.moveDown(0.25);
    q.options.forEach((o, i) => {
      const oy = doc.y;
      const x = MARGIN + 22;
      doc.rect(x, oy + 1.5, 8, 8).strokeColor(MUTED).lineWidth(0.7).stroke();
      doc.fillColor(MUTED).font(F.bold).fontSize(9.5).text(LETTERS[i], x + 14, oy, { width: 14 });
      doc.fillColor(INK).font(F.regular).fontSize(10).text(S(o), x + 30, oy, { width: w - 34, lineGap: 1 });
      doc.moveDown(0.15);
    });
    doc.x = MARGIN;
    doc.moveDown(0.6);
  };
  const block = (title, list) => {
    pdf.h2(title, { keep: 90 });
    for (const raw of list) {
      const q = shuffled(raw);
      num += 1;
      key.push([String(num), LETTERS[q.options.indexOf(q.answer)], q.answer]);
      question(q);
    }
  };
  block(`${T.questions}: ${n.name}`, n.stateQuestions);
  block(T.questionsUk, questions);
  doc.addPage();
  pdf.h2(T.answers, { keep: 120 });
  pdf.table(T.answerHead, key, { fontSize: 9, rowPadding: 3, widths: [40, 30, pdf.contentWidth() - 70] });
  await pdf.finish();
  log(file);
}

await facts({ simple: false });
await facts({ simple: true });
for (const n of nations) await nationSheet(n);
