// Every UI language must carry every key of the base dictionary (en.json), with the same
// {placeholders}, and no key the base does not have. Part of check:content.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, languagesFor } from "../src/lib/languages.js";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "i18n");
const read = (c) => JSON.parse(fs.readFileSync(path.join(DIR, `${c}.json`), "utf8"));
const tokens = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const base = read(BASE);
const problems = [];
for (const { code } of languagesFor("ui", { gated: false })) {
  if (code === BASE) continue;
  const dict = read(code);
  for (const k of Object.keys(base)) {
    if (!(k in dict)) problems.push(`${code}: missing key ${k}`);
    else if (typeof dict[k] !== "string" || dict[k].trim() === "") problems.push(`${code}: empty value ${k}`);
    else if (tokens(base[k]) !== tokens(dict[k])) problems.push(`${code}: placeholders differ in ${k}`);
  }
  for (const k of Object.keys(dict)) if (!(k in base)) problems.push(`${code}: key not in ${BASE}.json: ${k}`);
}
if (problems.length) {
  console.error(`check-i18n-keys: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 40)) console.error("  " + p);
  process.exit(1);
}
console.log(`check-i18n-keys ok — ${Object.keys(base).length} keys in every UI language`);
