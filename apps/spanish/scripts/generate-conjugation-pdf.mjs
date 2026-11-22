// Builds the free Spanish verb conjugation tables as one PDF, from the same data and the same
// generator as the page /gramatica/verbos (src/data/verbtabellen.json + src/lib/verbtabellenCore.js),
// so the book and the site cannot disagree.
//
//   pnpm generate:conjugation-pdf
//
// → public/downloads/conjugacion-verbos-espanoles.pdf (+ manifest.json).
//
// Castilian Spanish: the vosotros row is printed. Per verb: the infinitive with its meaning and
// level, the gerund and participle, then the six persons in eight tenses and the imperative.
// Verb groups open with their rules, as on the page. Copy in scripts/lib/pdf-copy.mjs.
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createDoc, plain, MUTED, MARGIN } from "./lib/pdf-brand.mjs";
import { loadArt } from "./lib/pdf-art.mjs";
import { COURSE, CONJUGATION as T, FILES, footerLine } from "./lib/pdf-copy.mjs";
import { buildAll } from "../src/lib/verbtabellenCore.js";
import { all } from "../src/lib/lexicon.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "downloads");
const LOGO = readFileSync(path.join(root, "public", "logos", "icanspeak-wordmark-1200.png"));
const data = JSON.parse(readFileSync(path.join(root, "src", "data", "verbtabellen.json"), "utf8"));
const levelOf = new Map(all().filter((w) => w.pos === "verb").map((w) => [w.lemma, w]));
const verbs = buildAll(data.verbs).map((v) => ({ ...v, level: v.level ?? levelOf.get(v.inf)?.level ?? "", en: v.en ?? levelOf.get(v.inf)?.en ?? "" }));

/** *word* → word: the data marks examples with asterisks for the site's italics. */
const text = (s) => plain(String(s ?? "")).replace(/\*([^*]+)\*/g, "$1");

const TABLE_A = [["praes", "Presente"], ["praet", "Indefinido"], ["imperf", "Imperfecto"], ["fut", "Futuro"]];
const TABLE_B = [["cond", "Condicional"], ["subj", "Subj. presente"], ["subjImpf", "Subj. imperfecto"], ["perf", "Pret. perfecto"]];

const cell = (c) => (c ? c.f : "");
// The persons, short: usted and ustedes take the third-person forms, as the cover says.
const PRON = ["yo", "tú", "él/ella", "nosotros", "vosotros", "ellos/ellas"];

async function build() {
  const fileName = FILES.conjugation;
  const outPath = path.join(outDir, fileName);
  const art = await loadArt();
  const pdf = createDoc({ outPath, title: `${COURSE.name} · ${T.title}`, runningHead: T.runningHead, footerText: footerLine("/gramatica/verbos"), unicode: true });

  pdf.cover({
    eyebrow: T.eyebrow,
    title: T.title,
    subtitle: `${verbs.length} verbs, from hablar to the irregular ones: presente, indefinido, imperfecto, futuro, condicional, both subjunctives, perfecto and the imperative, for all six persons.`,
    art: art.mascot.read ?? art.mascot.wave,
    logo: LOGO,
    meta: [
      `${verbs.length} verbs in ${data.groups.length} groups, with the forms that break the pattern`,
      "Castilian Spanish, with vosotros; usted and ustedes take the él/ella and ellos/ellas forms",
      "The imperfect subjunctive is shown with -ra; the -se forms (hablase, fuese) mean the same",
      `The same tables online: ${COURSE.site}/gramatica/verbos`,
    ],
    footer: COURSE.rights,
  });

  const w = pdf.contentWidth();
  const widths = [w * 0.15, w * 0.2125, w * 0.2125, w * 0.2125, w * 0.2125];
  for (const g of data.groups) {
    const list = verbs.filter((v) => v.group === g.id);
    if (!list.length) continue;
    pdf.chapter(g.name, null);
    if (g.what) pdf.paragraph(text(g.what), { size: 10.5 });
    for (const r of g.regel ?? []) pdf.bullet(text(r), { size: 9.75 });
    for (const v of list) {
      const head = text(`${v.inf}${v.en ? `: ${v.en}` : ""}`);
      pdf.ensureSpace(280);
      pdf.section(head, v.level || null);
      pdf.paragraph(`gerund ${v.ger} · participle ${v.p2}${v.note ? ` · ${text(v.note)}` : ""}`, { color: MUTED, size: 8.75 });
      const rowsFor = (cols) => v.rows.map((r) => [PRON[r.person], ...cols.map(([k]) => cell(r[k]))]);
      pdf.table(["", ...TABLE_A.map(([, n]) => n)], rowsFor(TABLE_A), { widths, fontSize: 8.75, rowPadding: 3 });
      pdf.table(["", ...TABLE_B.map(([, n]) => n)], rowsFor(TABLE_B), { widths, fontSize: 8.75, rowPadding: 3 });
      const imp = v.rows.filter((r) => r.imp?.f && r.imp.f !== "–").map((r) => `${PRON[r.person]}: ${r.imp.f}`).join(" · ");
      const neg = v.rows.filter((r) => r.impNeg?.f && r.impNeg.f !== "–").map((r) => r.impNeg.f).join(" · ");
      if (imp) pdf.paragraph(`Imperative: ${imp}${neg ? `\nNegative: ${neg}` : ""}`, { size: 8.75 });
    }
  }

  await pdf.finish();
  console.log(`${fileName.padEnd(40)} ${String(verbs.length).padStart(3)} verbs  ${Math.round(statSync(outPath).size / 1024)} KB`);
}

await build();
