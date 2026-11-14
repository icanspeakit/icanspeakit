// Checks src/data/satzmelodie.json, the content of /intonation.
//   pnpm check:satzmelodie
// Exits non-zero on any problem.
import data, { allLines } from "../src/lib/satzmelodieData.js";

const problems = [];
// A question word, maybe after a preposition: Quando…? Di dove…? Per quanto…? Che cosa…?
const W = /^((a|di|da|in|con|per|su|tra|fra|fino a) )?(che|chi|cosa|cos'|come|quando|dove|perché|quanto|quanta|quanti|quante|quale|quali)(\s|\?)/i;
const TYPES = Object.keys(data.types);

for (const f of data.families) {
  if (/[.?!]$/.test(f.base)) problems.push(`${f.topic}: base "${f.base}" must not have punctuation marks (the page adds . ? !)`);
  if (!f.jn?.endsWith("?")) problems.push(`${f.topic}: yes/no question must end in ?`);
  if (W.test(f.jn ?? "")) problems.push(`${f.topic}: yes/no question starts with a question word`);
  if (!f.w?.endsWith("?") || !W.test(f.w)) problems.push(`${f.topic}: question "${f.w}" must end in ? and start with a question word`);
}
for (const [i, s] of data.stress.entries()) {
  if (!Number.isInteger(s.k) || s.k < 0 || s.k >= s.words.length) problems.push(`stress ${i}: index ${s.k} out of range`);
  if (!s.q?.includes("?")) problems.push(`stress ${i}: question has no ?`);
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
