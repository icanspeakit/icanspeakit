// postbuild: fails the build if anything from a Lehrwerk reaches the site.
//
// data/partneruebungen/menschen-a1-katalog.json is an internal idea list (see its README):
// our partner sheets only take level, grammar target and Übungsform from it. Three checks:
//
// 1. Everywhere in the build output (.html, .js, .json, .txt, .xml): no catalogue id
//    (mA1-kb-…) and no Lehrwerk title („Menschen A1“, „Menschen Kursbuch“ …). The plain word
//    „Menschen“ is everyday German and stays allowed.
// 2. On the partner sheet pages (/teachers/worksheets/partner/…) and in the sheet data
//    (src/data/partneruebungen): also no „Hueber“, „Kursbuch“, „Lektion <n>“, page numbers
//    („Seite 141“) or the book's characters. Elsewhere „Kursbuch“ and „Hueber“ appear in
//    their own right (a Hören text, the copyright note), so the strict list is scoped.
// 3. No file under src/ refers to the catalogue.
//
//   node scripts/check-lehrwerk-leak.mjs [outDir]     (default: dist, else .vercel/output/static)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2]
  ? path.resolve(process.argv[2])
  : [path.join(ROOT, "dist"), path.join(ROOT, ".vercel/output/static")].find(existsSync);
if (!out) {
  console.error("check-lehrwerk-leak: no build output found (dist/ or .vercel/output/static/)");
  process.exit(1);
}

const walk = (dir, exts) =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (f === "node_modules" || f === ".git") return [];
    return statSync(p).isDirectory() ? walk(p, exts) : exts.some((e) => p.endsWith(e)) ? [p] : [];
  });

const GLOBAL = [
  [/\bmA1-kb-/, "Katalog-Id"],
  [/\bMenschen\s+(?:A1|A2|B1)\b/, "Lehrwerkname"],
  [/\bMenschen\s+(?:Kursbuch|Arbeitsbuch)\b/, "Lehrwerkname"],
];
const STRICT = [
  ...GLOBAL,
  [/\bHueber\b/, "Verlag"],
  [/Kursbuch/, "Kursbuch"],
  [/\bLektion\s+\d/, "Lektionsnummer"],
  [/\bSeite\s+1\d\d\b/, "Buchseite"],
  [/\b(?:Paco|Nicole|Marc|Anja)\b/, "Figur aus dem Lehrwerk"],
];

const hits = [];
const scan = (file, text, rules, base) => {
  for (const [re, what] of rules) {
    const m = text.match(re);
    if (m) hits.push(`${path.relative(base, file)}: ${what} „${m[0]}“`);
  }
};

const isPartnerPage = (f) => f.split(path.sep).join("/").includes("/arbeitsblaetter/partner/");
for (const f of walk(out, [".html", ".js", ".mjs", ".json", ".txt", ".xml"])) {
  scan(f, readFileSync(f, "utf8"), isPartnerPage(f) ? STRICT : GLOBAL, out);
}

// The sheet data itself, minus quelle.intern (the one field allowed to name the catalogue id).
const SHEETS = path.join(ROOT, "src/data/partneruebungen");
for (const f of walk(SHEETS, [".json"])) {
  const spec = JSON.parse(readFileSync(f, "utf8"));
  if (spec.quelle) delete spec.quelle.intern;
  scan(f, JSON.stringify(spec), STRICT, ROOT);
}

for (const f of walk(path.join(ROOT, "src"), [".js", ".mjs", ".ts", ".astro", ".json", ".md"])) {
  if (/menschen-a1-katalog/.test(readFileSync(f, "utf8"))) hits.push(`${path.relative(ROOT, f)}: verweist auf den internen Katalog`);
}

if (hits.length) {
  console.error(`check-lehrwerk-leak: ${hits.length} Treffer:\n  ` + hits.slice(0, 30).join("\n  "));
  process.exit(1);
}
console.log("check-lehrwerk-leak ok: keine Lehrwerk-Spuren im Build, in den Blättern oder in src/.");
