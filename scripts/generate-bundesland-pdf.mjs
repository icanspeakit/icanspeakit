// One "Leben in Deutschland" practice booklet per Bundesland, from
// src/data/leben-in-deutschland.json — the same data the Übungstest loads:
//   node scripts/generate-bundesland-pdf.mjs
//
// Each booklet is what a learner in that state needs on paper: the state's profile, its
// Landesfragen, the 30 bundesweite Fragen, and the answers at the back (so the questions
// can be done first without the solution on the same page). Written to
// public/downloads/leben-in-deutschland-land-<id>.pdf; /knowledge offers them in one card
// with a Bundesland dropdown.
//
// Bayern also has its own classroom booklets (…-bayern-a2/-b1.pdf); this one is its
// generated counterpart, so every state gets the same format.
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import lid from "../src/data/leben-in-deutschland.json" with { type: "json" };
import { createDoc, MUTED, TEAL_DARK } from "./lib/pdf-brand.mjs";

const { meta, bundeslaender, questions } = lid;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "downloads");
const LETTERS = ["A", "B", "C", "D"];

// The data lists the right answer first — fine for the test page, which shuffles on load,
// but on paper every answer would be A. So the options are shuffled here, seeded by the
// question itself: the same question always prints in the same order, in every booklet.
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

for (const land of bundeslaender) await build(land);

async function build(land) {
  const fileName = `leben-in-deutschland-land-${land.id}.pdf`;
  const outPath = path.join(outDir, fileName);
  const pdf = createDoc({ outPath, runningHead: `ICANSPEAK SPANISH · LEBEN IN DEUTSCHLAND · ${land.name.toUpperCase()}` });
  const { doc, F, S } = pdf;

  pdf.cover({
    eyebrow: "ICANSPEAK SPANISH · EINBÜRGERUNGSTEST",
    title: `Leben in Deutschland: ${land.name}`,
    subtitle: `Übungsbogen für ${land.name}: Kurzprofil, Landesfragen und die bundesweiten Fragen, mit Lösungen.`,
    meta: [
      `${land.stateQuestions.length} Fragen zu ${land.name}, ${questions.length} bundesweite Fragen`,
      `Der echte Test: ${meta.totalQuestions} Fragen (${meta.stateQuestions} davon zum Bundesland), ${meta.minutes} Minuten, bestanden ab ${meta.passScore} richtigen Antworten`,
      "Lösungen am Ende — erst selbst ankreuzen, dann vergleichen",
      "Der Übungstest dazu steht kostenlos auf icanspeak.it/spanish/leben-in-deutschland/test",
    ],
    footer: "Von icanspeak Spanish geschrieben. Dieses PDF darfst du frei herunterladen, ausdrucken und im Unterricht weitergeben.",
  });

  doc.addPage();
  pdf.h2(`Kurzprofil: ${land.name}`, { keep: 120 });
  pdf.table(["Merkmal", "Angabe"], [
    ["Hauptstadt", land.capital],
    ["Typ", land.type],
    ["Einwohner", land.population],
    ["Grenzt an (Ausland)", land.borderCountries.length ? land.borderCountries.join(", ") : "keine Grenze zum Ausland"],
    ["Landesparlament", land.parliamentName],
    ["Regierungschef/in", land.executiveTitle],
  ], { widths: [pdf.contentWidth() * 0.35, pdf.contentWidth() * 0.65] });
  for (const f of land.sourceFacts ?? []) pdf.bullet(f);
  pdf.paragraph(
    land.sourced
      ? "Aus echtem icanspeak Spanish-Unterrichtsmaterial."
      : "Allgemein bekannte, öffentliche Fakten. Amtsinhaber und Wahltermine ändern sich — dafür gilt die offizielle Seite des Landes.",
    { size: 8.5, color: MUTED }
  );

  let n = 0;
  const key = [];
  const block = (title, list) => {
    pdf.h2(title, { keep: 90 });
    for (const raw of list) {
      const q = shuffled(raw);
      n += 1;
      key.push({ n, letter: LETTERS[q.options.indexOf(q.answer)], answer: q.answer });
      question(n, q);
    }
  };

  function question(num, q) {
    // Keep a question with its options: measure the whole block first.
    doc.font(F.bold).fontSize(10.25);
    const w = pdf.contentWidth() - 22;
    let h = doc.heightOfString(S(q.prompt), { width: w, lineGap: 2 }) + 6;
    doc.font(F.regular).fontSize(10);
    for (const o of q.options) h += doc.heightOfString(S(o), { width: w - 34, lineGap: 1 }) + 4;
    pdf.ensureSpace(h + 10);
    const y = doc.y;
    doc.fillColor(TEAL_DARK).font(F.bold).fontSize(10.25).text(`${num}.`, doc.page.margins.left, y, { width: 22 });
    doc.fillColor("#1a2230").font(F.bold).fontSize(10.25).text(S(q.prompt), doc.page.margins.left + 22, y, { width: w, lineGap: 2 });
    doc.moveDown(0.25);
    q.options.forEach((o, i) => {
      const oy = doc.y;
      const x = doc.page.margins.left + 22;
      doc.rect(x, oy + 1.5, 8, 8).strokeColor(MUTED).lineWidth(0.7).stroke();
      doc.fillColor(MUTED).font(F.bold).fontSize(9.5).text(LETTERS[i], x + 14, oy, { width: 14 });
      doc.fillColor("#1a2230").font(F.regular).fontSize(10).text(S(o), x + 30, oy, { width: w - 34, lineGap: 1 });
      doc.moveDown(0.15);
    });
    doc.x = doc.page.margins.left;
    doc.moveDown(0.6);
  }

  block(`Fragen zu ${land.name}`, land.stateQuestions);
  block("Bundesweite Fragen", questions);

  doc.addPage();
  pdf.h2("Lösungen", { keep: 120 });
  pdf.table(["Nr.", "", "Richtige Antwort"], key.map((k) => [String(k.n), k.letter, k.answer]), { fontSize: 9, rowPadding: 3, widths: [40, 30, pdf.contentWidth() - 70] });

  await pdf.finish();
  console.log(`${fileName.padEnd(52)} ${Math.round(statSync(outPath).size / 1024)} KB`);
}
