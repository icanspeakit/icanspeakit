// Downloads the Verkehrszeichen listed in src/data/fuehrerschein/fakten.research.json
// (bilder.zeichen) into public/img/verkehrszeichen/<key>.svg — once, by hand:
//
//   node scripts/fetch-verkehrszeichen.mjs
//
// Every file is a Wikimedia Commons drawing of an amtliches Werk (§ 5 Abs. 1 UrhG, Commons
// templates PD-GermanGov / PD-VzKat). The licence, author and Commons page of each file stay
// in the research file, which is where scripts/check-fuehrerschein.mjs looks them up: a sign
// on a page without an `ok` licence entry fails the build. § 5 Abs. 2 UrhG: the drawings are
// not changed, only saved, and the pages name the source.
//
// Combination entries (no single file, e.g. "306+1002-10/1002-20") are skipped: the page
// stacks the two signs instead.
import fs from "node:fs";
import path from "node:path";

const research = JSON.parse(fs.readFileSync("src/data/fuehrerschein/fakten.research.json", "utf8"));
const OUT = "public/img/verkehrszeichen";
fs.mkdirSync(OUT, { recursive: true });

const UA = "EnglishAcademy-build/1.0 (https://englishacademy.com; Verkehrszeichen fetch)";
let fetched = 0;
for (const [key, z] of Object.entries(research.bilder.zeichen)) {
  if (key.includes("+") || z.status !== "ok" || !z.url) continue;
  const file = path.join(OUT, `${key}.svg`);
  if (fs.existsSync(file) && !process.argv.includes("--force")) continue;
  const res = await fetch(z.url, { headers: { "User-Agent": UA } });
  if (!res.ok) { console.error(`✗ ${key}: HTTP ${res.status}`); process.exitCode = 1; continue; }
  const svg = await res.text();
  if (!svg.includes("<svg")) { console.error(`✗ ${key}: not an SVG`); process.exitCode = 1; continue; }
  fs.writeFileSync(file, svg);
  fetched++;
  console.log(`✓ ${key}  ${z.name}`);
  await new Promise((r) => setTimeout(r, 400));
}
console.log(`${fetched} Zeichen geladen → ${OUT}`);
