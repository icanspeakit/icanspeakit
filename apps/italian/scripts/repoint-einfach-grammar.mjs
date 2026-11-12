// Repoints the beginner path's grammar refs after a grammar topic was rewritten
// (content-plan §1.6 rule 4). Taken over by the Italian `grammar-a1` (2026-11-12) from the French queue's run; the later
// grammar items use it, and `beginner-path` deletes it once the path is Italian.
//
//   node scripts/repoint-einfach-grammar.mjs            every stale gram: ref in the path
//   node scripts/repoint-einfach-grammar.mjs nomen …    only refs into these topics
//   node scripts/repoint-einfach-grammar.mjs --dry      say what would change, write nothing
//
// A ref is stale when it no longer resolves (the item changed, moved or is gone). Each stale task
// is pointed at another item of the SAME topic that its task type can use (luecke: a fill item or
// table row with 2–3 choices; satz: a build sentence) and that resolves on its own. Preference:
// the same exercise first, then items used nowhere else in the path, and never an item already in
// the same unit or in the unit before or after it (checkUnits forbids both).
//
// The task's own "options", "hint" and "why" are dropped: they were written for the old item
// (in the old language) and would now contradict it. The source item supplies them instead.
// Unit titles, claims and postcards are not touched; that is the beginner-path item's job.
// The file keeps its layout (one task per line); the new refs carry their checksum, so
// `node scripts/check-einfach-pfad.mjs` should pass afterwards.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookup, resolveTask, checksum } from "../src/lib/einfach-content.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
const PFAD = "src/data/einfach-pfad.json";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = new Set(args.filter((a) => !a.startsWith("--")));

const grammatik = {};
for (const f of readdirSync(path.join(ROOT, "src/data/grammatik"))) {
  if (f.endsWith(".json")) grammatik[f.replace(/\.json$/, "")] = read(`src/data/grammatik/${f}`);
}
const sources = {
  lexicon: { a1: read("src/content/lexicon/a1.json"), a2: read("src/content/lexicon/a2.json"), b1: read("src/content/lexicon/b1.json") },
  grammatik,
  akkusativ: read("src/data/akkusativ.json"),
  kultur: read("src/data/kultur.json"),
  kulturInsider: read("src/data/kultur-insider.json"),
  hoeren: read("src/data/hoeren.json"),
  aussprache: read("src/data/aussprache-check.json"),
  redemittel: read("src/data/redemittel.json"),
};

// Same as itemText() in einfach-content.js (not exported there).
function itemText(ex, item) {
  if (ex.type === "fill") return `${item.prompt}|${[].concat(item.answer).join("/")}`;
  if (ex.type === "table") return `${item.term}|${item.answer}`;
  if (ex.type === "build") return item.correct.join(" ");
  return JSON.stringify(item);
}
const itemsOf = (ex) => (ex.type === "fill" ? ex.items : ex.type === "table" ? ex.rows : ex.type === "build" ? ex.sentences : null);
const USABLE = { luecke: ["fill", "table"], satz: ["build"] };

const resolves = (task) => {
  try { resolveTask(task, sources); return true; } catch { return false; }
};
const stale = (ref) => {
  try { lookup(ref, sources); return false; } catch { return true; }
};
const strip = ({ options, hint, why, ...rest }) => rest;
const refPath = (ref) => ref.split("@")[0];

const pfad = read(PFAD);
const units = pfad.levels.flatMap((l) => l.units);
const allTasks = units.flatMap((u) => u.tasks || []);
const usedAnywhere = new Map();
for (const t of allTasks) usedAnywhere.set(refPath(t.ref), (usedAnywhere.get(refPath(t.ref)) ?? 0) + 1);

const changes = [];
const failures = [];
units.forEach((u, ui) => {
  for (const t of u.tasks || []) {
    const m = /^gram:([^/]+)\/(\d+)\/(\d+)/.exec(t.ref || "");
    if (!m || (only.size && !only.has(m[1])) || !stale(t.ref)) continue;
    const [, topicId, exIdx] = m;
    const topic = grammatik[topicId];
    const near = new Set([u, units[ui - 1], units[ui + 1]].filter(Boolean).flatMap((x) => (x.tasks || []).map((y) => refPath(y.ref))));
    const candidates = [];
    (topic?.exercises || []).forEach((ex, ei) => {
      if (!(USABLE[t.type] || []).includes(ex.type)) return;
      (itemsOf(ex) || []).forEach((item, ii) => {
        const p = `gram:${topicId}/${ei}/${ii}`;
        if (near.has(p)) return;
        candidates.push({ p, ref: `${p}@${checksum(itemText(ex, item))}`, sameEx: ei === Number(exIdx), used: usedAnywhere.get(p) ?? 0, order: candidates.length });
      });
    });
    candidates.sort((a, b) => a.used - b.used || Number(b.sameEx) - Number(a.sameEx) || a.order - b.order);
    const pick = candidates.find((c) => resolves({ ...strip(t), ref: c.ref }));
    if (!pick) { failures.push(`${u.id}: ${t.ref} (${t.type}) — no usable item left in ${topicId}`); continue; }
    const before = JSON.stringify(t);
    const next = { ...strip(t), ref: pick.ref };
    usedAnywhere.set(refPath(t.ref), (usedAnywhere.get(refPath(t.ref)) ?? 1) - 1);
    usedAnywhere.set(pick.p, (usedAnywhere.get(pick.p) ?? 0) + 1);
    Object.keys(t).forEach((k) => delete t[k]);
    Object.assign(t, next);
    changes.push({ unit: u.id, before, after: next, task: t });
  }
});

for (const c of changes) console.log(`${c.unit}: ${JSON.parse(c.before).ref} → ${c.after.ref}`);
for (const f of failures) console.error(`  cannot repoint ${f}`);
console.log(`${changes.length} task(s) repointed, ${failures.length} left${dry ? " (dry run, nothing written)" : ""}`);

if (!dry && changes.length) {
  // Rewrite task lines in place: the k-th task line of the file is the k-th task of the path.
  const lines = readFileSync(path.join(ROOT, PFAD), "utf8").split("\n");
  const TASK_LINE = /^(\s*)(\{ "type".*\})(,?)\s*$/;
  const taskLines = lines.map((l, i) => (TASK_LINE.test(l) ? i : -1)).filter((i) => i !== -1);
  if (taskLines.length !== allTasks.length) {
    console.error(`layout changed: ${taskLines.length} task lines but ${allTasks.length} tasks; nothing written`);
    process.exit(1);
  }
  const fmt = (o) => `{ ${Object.entries(o).map(([k, v]) => `"${k}": ${JSON.stringify(v)}`).join(", ")} }`;
  const changed = new Set(changes.map((c) => c.task));
  allTasks.forEach((t, k) => {
    if (!changed.has(t)) return;
    const i = taskLines[k];
    const [, indent, , comma] = TASK_LINE.exec(lines[i]);
    lines[i] = `${indent}${fmt(t)}${comma}`;
  });
  writeFileSync(path.join(ROOT, PFAD), lines.join("\n"));
}
if (failures.length) process.exitCode = 1;
