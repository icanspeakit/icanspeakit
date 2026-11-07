// The partner and group worksheets (src/data/partneruebungen/*.json), loaded and checked at
// build time. A sheet that fails validateSheet() stops the build with its messages: a
// broken sheet printed for a class is worse than no sheet.
//
//   allSheets()     every sheet, drafts included (their pages render with noindex)
//   publicSheets()  only those Edgar has checked (quelle.geprueft) — lists, PDFs, Mappe
//   sheetById(id)   one sheet, or null
//   groupTwin(id)   the ga-… sheet for a pa-… sheet (same slug), or null
import { publicSpec, validateSheet } from "./schema.js";

const files = import.meta.glob("../../data/partneruebungen/*.json", { eager: true, import: "default" });

let cache = null;
function load() {
  if (cache) return cache;
  const problems = [];
  const sheets = [];
  for (const [file, spec] of Object.entries(files)) {
    const name = file.split("/").pop().replace(/\.json$/, "");
    const errs = validateSheet(spec);
    if (spec.id !== name) errs.push(`id: „${spec.id}“ passt nicht zum Dateinamen ${name}.json`);
    if (errs.length) problems.push(`${name}.json\n    ${errs.join("\n    ")}`);
    else sheets.push(publicSpec(spec));
  }
  if (problems.length) throw new Error(`Partnerübungen ungültig:\n  ${problems.join("\n  ")}`);
  sheets.sort((a, b) => a.niveau.localeCompare(b.niveau) || a.titel.localeCompare(b.titel, "de"));
  cache = sheets;
  return cache;
}

export const allSheets = () => load();
export const publicSheets = () => load().filter((s) => s.quelle.geprueft);
export const sheetById = (id) => load().find((s) => s.id === id) ?? null;
export const groupTwin = (id) => (id.startsWith("pa-") ? sheetById(`ga-${id.slice(3)}`) : null);
export const pairTwin = (id) => (id.startsWith("ga-") ? sheetById(`pa-${id.slice(3)}`) : null);
