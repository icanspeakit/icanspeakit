// postbuild: fails the build if paid questions or answers ended up in a page's HTML.
//
// Takes three distinctive passages from every file under src/paid/ (long text leaves,
// tags stripped) and looks for each in every .html file of the build output. The copies
// under /inhalt/ are expected and skipped — that is where paid data is meant to be
// (scripts/build-paid-manifest.mjs). Found anywhere else → exit 1, naming page and file.
//
//   node scripts/check-paid-leak.mjs [outDir]     (default: dist, else .vercel/output/static)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAID = path.join(ROOT, "src/paid");
const out = process.argv[2]
  ? path.resolve(process.argv[2])
  : [path.join(ROOT, "dist"), path.join(ROOT, ".vercel/output/static")].find(existsSync);
if (!out) {
  console.error("check-paid-leak: no build output found (dist/ or .vercel/output/static/)");
  process.exit(1);
}

const walk = (dir, ext) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
  });

// Long text leaves of a JSON value, as plain text.
function texts(v, acc = []) {
  if (typeof v === "string") {
    const plain = v.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (plain.length >= 40) acc.push(plain);
  } else if (Array.isArray(v)) v.forEach((x) => texts(x, acc));
  // `meta` (sourceNote, audioNote) is boilerplate the free set shares, not paid content.
  else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => k !== "meta" && texts(x, acc));
  return acc;
}

// A 36-character window of plain letters, spaces and punctuation that survives HTML and
// JSON escaping unchanged (no quotes, ampersands, angle brackets or backslashes).
function probe(s) {
  const runs = s.split(/["'&<>\\„“”‚‘’«»]/).map((r) => r.trim()).filter((r) => r.length >= 36);
  return runs.length ? runs[0].slice(0, 36) : null;
}

const probes = [];
for (const file of walk(PAID, ".json")) {
  const picked = [...new Set(texts(JSON.parse(readFileSync(file, "utf8"))))]
    .sort((a, b) => b.length - a.length)
    .map(probe)
    .filter(Boolean)
    .slice(0, 3);
  for (const p of picked) probes.push({ file: path.relative(ROOT, file), text: p });
}

const pages = walk(out, ".html").filter((f) => !f.split(path.sep).includes("inhalt"));
const leaks = [];
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const p of probes) if (html.includes(p.text)) leaks.push(`${path.relative(out, page)} enthält „${p.text}…“ aus ${p.file}`);
}

if (leaks.length) {
  console.error(`check-paid-leak: ${leaks.length} bezahlte Passage(n) im Seiten-HTML:\n  ` + leaks.slice(0, 30).join("\n  "));
  process.exit(1);
}
console.log(`check-paid-leak ok: ${probes.length} Stichproben aus src/paid/, ${pages.length} Seiten ohne Treffer.`);
