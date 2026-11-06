// Checks src/data/satzmelodie.json, the content of /intonation.
//   pnpm check:satzmelodie
// Exits non-zero on any problem.
import data, { allLines } from "../src/lib/satzmelodieData.js";

const problems = [];
// A question word (with its accent), maybe after a preposition: ¿Cuándo…? ¿De cuándo…? ¿Por qué…?
const W = /^¿((a|de|desde|en|con|para|por|hasta|sobre|sin|hacia) )?(qué|quién|quiénes|cuál|cuáles|cómo|cuándo|dónde|adónde|cuánto|cuánta|cuántos|cuántas)(\s|\?)/i;
const TYPES = Object.keys(data.types);

for (const f of data.families) {
  if (/^[¿¡]|[.?!]$/.test(f.base)) problems.push(`${f.topic}: base "${f.base}" must not have punctuation marks (the page adds ¿ ¡ . ? !)`);
  if (!f.jn?.startsWith("¿") || !f.jn.endsWith("?")) problems.push(`${f.topic}: yes/no question must be written ¿…?`);
  if (W.test(f.jn ?? "")) problems.push(`${f.topic}: yes/no question starts with a question word`);
  if (!f.w?.endsWith("?") || !W.test(f.w)) problems.push(`${f.topic}: question "${f.w}" must be written ¿…? and start with a question word`);
}
for (const [i, s] of data.stress.entries()) {
  if (!Number.isInteger(s.k) || s.k < 0 || s.k >= s.words.length) problems.push(`stress ${i}: index ${s.k} out of range`);
  if (!s.q?.startsWith("¿") || !s.q.includes("?")) problems.push(`stress ${i}: question is not written ¿…?`);
}
for (const r of data.rules) {
  for (const p of r.parts) if (p.type !== "weiter" && !TYPES.includes(p.type)) problems.push(`rule ${r.id}: unknown type ${p.type}`);
}
const seen = new Set();
for (const l of allLines()) {
  if (seen.has(l.src)) problems.push(`duplicate audio file ${l.src}`);
  seen.add(l.src);
}

if (problems.length) {
  console.error(`check:satzmelodie — ${problems.length} problem(s):\n  ` + problems.join("\n  "));
  process.exit(1);
}
console.log(`check:satzmelodie — ok (${data.families.length} families, ${data.stress.length} stress items, ${data.rules.length} rules, ${seen.size} audio lines).`);
