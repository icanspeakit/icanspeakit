// Fetches the OpenMoji SVGs that src/data/wort-bilder.json, kultur-bilder.json, hub-emoji.json
// and GRAMMAR_ICON use into public/img/openmoji/,
// named by the emoji's code points without FE0F (see iconFile() in src/lib/wortBild.js).
// Idempotent: files already there are skipped. OpenMoji is CC BY-SA 4.0 — the credit
// line is on /teachers/quiz.
//
//   node scripts/fetch-openmoji.mjs
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { iconFile } from "../src/lib/wortBild.js";
// The live quiz's player pictures: one animal per default name (src/lib/liveQuiz/names.js).
import { ANIMAL_EMOJI } from "../src/lib/liveQuiz/names.js";
// And the synonym groups' pictures (src/data/synonyme.json, "emoji").
const synonyme = JSON.parse(await readFile(new URL("../src/data/synonyme.json", import.meta.url), "utf8"));
// And the confusable words on /knowledge/false-friends (src/data/wortfallen.json).
const wortfallen = JSON.parse(await readFile(new URL("../src/data/wortfallen.json", import.meta.url), "utf8"));

const VERSION = "15.1.0";
const OUT = new URL("../public/img/openmoji/", import.meta.url);
const bilder = JSON.parse(await readFile(new URL("../src/data/wort-bilder.json", import.meta.url), "utf8"));
// The Landeskunde topic pictures on /culture use the same folder (src/data/kultur-bilder.json).
const kultur = JSON.parse(await readFile(new URL("../src/data/kultur-bilder.json", import.meta.url), "utf8"));
// The hub pictures: /exercises's cards (hub-emoji.json) and the grammar topics, whose
// emoji live in GRAMMAR_ICON in catalog.js — read from the source, since catalog.js pulls
// in JSON without import attributes and so cannot be imported here.
const hub = JSON.parse(await readFile(new URL("../src/data/hub-emoji.json", import.meta.url), "utf8"));
const catalogSrc = await readFile(new URL("../src/lib/catalog.js", import.meta.url), "utf8");
const grammarBlock = catalogSrc.match(/GRAMMAR_ICON = \{([\s\S]*?)\n\};/)[1];
const grammar = Object.fromEntries([...grammarBlock.matchAll(/^\s*"?([\w-]+)"?:\s*"([^"]+)"/gm)].map((m) => ["g:" + m[1], m[2]]));
const words = { ...bilder.words, ...kultur.topics, ...kultur.extras, ...kultur.insider, ...hub.tools, ...hub.exams, ...hub.extras, ...grammar, ...Object.fromEntries(Object.entries(ANIMAL_EMOJI).map(([k, v]) => ["tier:" + k, v])), ...Object.fromEntries(synonyme.groups.filter((g) => g.emoji).map((g, i) => ["syn:" + i, g.emoji])), ...Object.fromEntries(wortfallen.groups.flatMap((g) => g.words).map((w, i) => ["wf:" + i, w.emoji])) };

await mkdir(OUT, { recursive: true });
const codes = [...new Set(Object.values(words).map((e) => iconFile(e)))];
let fetched = 0;
const missing = [];
for (const code of codes) {
  const target = new URL(`${code}.svg`, OUT);
  try { await access(target); continue; } catch {}
  // OpenMoji names most files without FE0F, a few with it: try both.
  const tries = [code];
  const emoji = Object.values(words).find((e) => iconFile(e) === code);
  const withFe0f = [...emoji].map((c) => c.codePointAt(0).toString(16).toUpperCase()).join("-");
  if (withFe0f !== code) tries.push(withFe0f);
  let svg = null;
  for (const name of tries) {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/openmoji@${VERSION}/color/svg/${name}.svg`);
    if (res.ok) { svg = await res.text(); break; }
  }
  if (!svg) { missing.push(`${emoji} ${code}`); continue; }
  await writeFile(target, svg);
  fetched++;
}
console.log(`${codes.length} icons, ${fetched} fetched${missing.length ? `, missing: ${missing.join(", ")}` : ""}`);
if (missing.length) process.exitCode = 1;
