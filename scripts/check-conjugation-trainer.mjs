// Checks the conjugation trainer (docs/content-plan.md §4.2):
//
//   node scripts/check-conjugation-trainer.mjs
//
// 1. Sets: shape, unique ids, exactly one blank, one right option, the answer among the options,
//    English explanations, inverted marks in Spanish questions.
// 2. Drills: every verb in exactly one drill group or on notDrilled; presets and limits name real
//    verbs, groups and tenses; every topic link points at a real topic and a real drill or set.
// 3. Generated questions, every form of every drilled verb: the right form is among the options
//    exactly once, 3–4 distinct options, no dash, no wrong option that is also right (-se forms),
//    the answer passes judge() and a wrong option doesn't. A vosotros-free pool has no vosotros.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTrainer, judge, LEVELS } from "../src/lib/conjugationTrainer.js";
import { DASH, VOSOTROS } from "../src/lib/verbtabellenCore.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(readFileSync(path.join(ROOT, f), "utf8"));
const data = read("src/data/conjugation-trainer.json");
const verbData = read("src/data/verbtabellen.json");
const errors = [];
const err = (m) => errors.push(m);

// --- 1. sets ---------------------------------------------------------------------------------
const ids = new Set();
const once = (id) => { if (ids.has(id)) err(`${id}: id used twice`); ids.add(id); };
for (const set of data.sets) {
  once(set.id);
  for (const k of ["title", "lead"]) if (!set[k]) err(`${set.id}: needs ${k}`);
  if (!set.rule?.text) err(`${set.id}: needs rule.text`);
  if (!LEVELS.includes(set.level)) err(`${set.id}: level ${set.level}`);
  if (set.variety !== "es-ES") err(`${set.id}: variety must be es-ES`);
  if (!["choice", "form"].includes(set.kind)) err(`${set.id}: kind ${set.kind}`);
  if (set.items.length < 8) err(`${set.id}: only ${set.items.length} items`);
  const prompts = new Set();
  for (const it of set.items) {
    const at = `${set.id}/${it.id}`;
    once(it.id);
    if (!it.id.startsWith(`${set.id}-`)) err(`${at}: id doesn't start with the set's`);
    if (prompts.has(it.prompt)) err(`${at}: same prompt twice in the set`);
    prompts.add(it.prompt);
    if ((it.prompt.match(/___/g) ?? []).length !== 1) err(`${at}: needs exactly one ___`);
    if (!it.explain || it.explain.length < 8) err(`${at}: needs explain`);
    // ¿ ¡ open what ? ! close (a sentence may hold both kinds, so count them).
    for (const [open, close] of [["¿", "?"], ["¡", "!"]]) {
      if (it.prompt.split(open).length !== it.prompt.split(close).length) err(`${at}: ${open} and ${close} don't pair`);
    }
    if (set.kind === "choice") {
      if (!Array.isArray(it.options) || it.options.length < 2) err(`${at}: needs options`);
      else {
        if (typeof it.answer !== "string" || !it.options.includes(it.answer)) err(`${at}: answer not among the options`);
        if (new Set(it.options).size !== it.options.length) err(`${at}: repeated option`);
      }
    } else {
      if (it.options) err(`${at}: a form item has no options`);
      if (!it.answer || (Array.isArray(it.answer) && !it.answer.length)) err(`${at}: needs answer`);
      if (!/\(\S/.test(it.prompt)) err(`${at}: a form item names its verb in brackets`);
    }
  }
}

// --- 2. drills -------------------------------------------------------------------------------
const { tenses, groups, presets, limits, notDrilled } = data.drills;
const tenseKeys = new Set(tenses.map((t) => t.key));
const groupIds = new Set(groups.map((g) => g.id));
const infs = new Set(verbData.verbs.map((v) => v.inf));
const placed = new Map();
for (const g of groups) {
  for (const inf of g.verbs) {
    if (!infs.has(inf)) err(`group ${g.id}: ${inf} isn't in verbtabellen.json`);
    if (placed.has(inf)) err(`${inf}: in groups ${placed.get(inf)} and ${g.id}`);
    placed.set(inf, g.id);
  }
}
for (const inf of Object.keys(notDrilled)) {
  if (!infs.has(inf)) err(`notDrilled: ${inf} isn't in verbtabellen.json`);
  if (placed.has(inf)) err(`${inf}: both drilled and on notDrilled`);
}
for (const inf of infs) if (!placed.has(inf) && !(inf in notDrilled)) err(`${inf}: in no drill group`);
for (const [inf, lim] of Object.entries(limits)) {
  if (!infs.has(inf)) err(`limits: ${inf} isn't in verbtabellen.json`);
  for (const k of [...(lim.only ?? []), ...(lim.skip ?? [])]) if (!tenseKeys.has(k)) err(`limits ${inf}: tense ${k}`);
}
for (const t of tenses) {
  for (const k of ["name", "tip", "mood", "level"]) if (!t[k]) err(`tense ${t.key}: needs ${k}`);
  if (!t.rule?.text) err(`tense ${t.key}: needs rule.text`);
}
const presetIds = new Set();
for (const p of presets) {
  if (presetIds.has(p.id)) err(`preset ${p.id}: id used twice`);
  presetIds.add(p.id);
  if (!LEVELS.includes(p.level)) err(`preset ${p.id}: level ${p.level}`);
  for (const k of p.tenses) if (!tenseKeys.has(k)) err(`preset ${p.id}: tense ${k}`);
  for (const g of p.groups ?? []) if (!groupIds.has(g)) err(`preset ${p.id}: group ${g}`);
  for (const inf of p.verbs ?? []) if (!placed.has(inf)) err(`preset ${p.id}: verb ${inf} isn't drilled`);
}
for (const [topic, link] of Object.entries(data.topicLinks)) {
  if (!existsSync(path.join(ROOT, "src/data/grammatik", `${topic}.json`))) err(`topicLinks: no grammar topic ${topic}`);
  const [kind, id] = link.split(":");
  const ok = kind === "drill" ? presetIds.has(id) : kind === "set" && data.sets.some((s) => s.id === id);
  if (!ok) err(`topicLinks ${topic}: ${link} doesn't exist`);
}

// --- 3. every generated question -------------------------------------------------------------
// A fixed seed: a failure here reproduces.
let seed = 42;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const trainer = createTrainer(verbData, data, { rng });
const pool = trainer.poolFor();
const seen = new Set();
for (const stub of pool) {
  if (seen.has(stub.id)) err(`${stub.id}: asked twice`);
  seen.add(stub.id);
  const q = trainer.question(stub);
  const at = q.id;
  if (q.answer === DASH || q.answer.includes(DASH)) err(`${at}: asks a form not in use`);
  if (q.options.filter((o) => o === q.answer).length !== 1) err(`${at}: the answer isn't among the options once`);
  if (q.options.length < 3 || q.options.length > 4) err(`${at}: ${q.options.length} options (${q.options.join(", ")})`);
  if (new Set(q.options).size !== q.options.length) err(`${at}: repeated option (${q.options.join(", ")})`);
  for (const o of q.options) {
    if (!o || o.includes(DASH)) err(`${at}: bad option "${o}"`);
    if (o !== q.answer && q.accepted.includes(o)) err(`${at}: wrong option ${o} is also right`);
    if (o !== q.answer && judge(q, o).ok) err(`${at}: wrong option ${o} passes the check`);
  }
  if (!judge(q, q.answer).ok) err(`${at}: its own answer fails the check`);
  if (!q.prompt.includes("___")) err(`${at}: no blank in the prompt`);
  if (q.negative && !q.change.includes(" no ")) err(`${at}: a negative command without no`);
  if (/undefined|null/.test(q.explain + q.prompt + q.change)) err(`${at}: undefined text`);
}
if (trainer.poolFor({ vosotros: false }).some((s) => s.person === VOSOTROS)) err("a pool without vosotros still has vosotros forms");
for (const p of presets) if (!trainer.presetCount(p.id, true)) err(`preset ${p.id}: asks nothing`);
for (const set of data.sets) {
  for (const q of trainer.setQuestions(set.id)) {
    if (!judge(q, q.answer).ok) err(`${q.id}: its own answer fails the check`);
    if (q.options) for (const o of q.options) if (o !== q.answer && judge(q, o).ok) err(`${q.id}: wrong option ${o} passes the check`);
  }
}

// The accent rule itself, on forms that differ by nothing else (content-plan §1.2).
const ask = (verb, tense, person) => trainer.question({ id: "x", verb, tense, person });
const cases = [
  [ask("hablar", "praet", 2), "hablo", "accent"],
  [ask("saber", "praes", 0), "se", "accent"],
  [ask("hablar", "praes", 4), "hablais", "accent"],
  [ask("levantarse", "praes", 0), "levanto", "pronoun"],
  [ask("tener", "praet", 0), "tení", "wrong"],
];
for (const [q, typed, why] of cases) {
  const got = judge(q, typed);
  if (got.ok || got.why !== why) err(`judge: "${typed}" for ${q.change} gives ${JSON.stringify(got)}, wanted ${why}`);
}
for (const [q, typed] of [[ask("tener", "subjImpf", 0), "tuviese"], [ask("hablar", "impNeg", 1), "no hables"], [ask("hablar", "impNeg", 1), "hables"], [ask("tener", "praes", 0), "  Tengo "]]) {
  if (!judge(q, typed).ok) err(`judge: "${typed}" for ${q.change} should pass`);
}

for (const e of errors.slice(0, 60)) console.error(`  ERROR ${e}`);
if (errors.length > 60) console.error(`  … and ${errors.length - 60} more`);
const items = data.sets.reduce((n, s) => n + s.items.length, 0);
console.log(`conjugation-trainer: ${data.sets.length} sets, ${items} items · ${presets.length} presets, ${pool.length} generated forms · ${errors.length} errors`);
if (errors.length) process.exit(1);
