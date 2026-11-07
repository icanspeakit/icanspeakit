// Checks the language-trap data of the idioms-mistakes pages: /knowledge/false-friends
// (wortfallen.json and its en.json rows), /grammar/common-mistakes (typische-fehler.json and the
// `fehler` links of wortarten.json), /knowledge/slang (umgangssprache.json), the live quiz's
// synonyms (synonyme.json) and /culture/mistakes (fehler-nach-sprache.json).
// Shape only, plus the things a typo would break quietly: a gap with no blank, an answer that
// isn't an option, a picture that isn't on disk, a dead link, a Spanish question without ¿.
// Runs in the content gate; exit 1 on any problem.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
const problems = [];
const bad = (where, msg) => problems.push(`${where}: ${msg}`);

// The file name OpenMoji gives an emoji: its code points, without the variation selector.
const emojiFile = (e) => [...e].map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16).toUpperCase()).join("-");
const hasEmoji = (e) => existsSync(path.join(ROOT, "public/img/openmoji", `${emojiFile(e)}.svg`));

// A Spanish sentence with ? or ! needs its opening mark.
const marks = (where, s) => {
  for (const part of String(s).split(/(?<=[.:;])\s+/)) {
    if (part.includes("?") && !part.includes("¿")) bad(where, `? without ¿: “${s}”`);
    if (part.includes("!") && !part.includes("¡")) bad(where, `! without ¡: “${s}”`);
  }
};
const unique = (where, ids) => {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) bad(where, `id “${id}” twice`);
    seen.add(id);
  }
};

/* ---- false friends ---- */
const WHO = new Set(["bruno", "regi", "hamsti", "quaki"]);
const wf = read("src/data/wortfallen.json");
const en = read("public/i18n/en.json");
unique("wortfallen", wf.groups.map((g) => g.id));
for (const g of wf.groups) {
  const at = `wortfallen ${g.id}`;
  if (!WHO.has(g.who)) bad(at, `who “${g.who}” unknown`);
  if (g.words?.length !== 2) bad(at, "needs two words");
  for (const w of g.words ?? []) {
    if (!w.w || !w.meaning) bad(at, "a word without w or meaning");
    if (!hasEmoji(w.emoji)) bad(at, `no picture for ${w.w} (${w.emoji})`);
  }
  for (const f of ["oops", "right"]) {
    if (!/\*[^*]+\*/.test(g[f] ?? "")) bad(at, `${f} marks no word with *…*`);
    marks(at, g[f]);
  }
  if (g.oops === g.right) bad(at, "oops and right are the same");
  if (!g.quiz?.length) bad(at, "no quiz");
  for (const q of g.quiz ?? []) {
    if (!q.s.includes("___")) bad(at, `quiz without a gap: “${q.s}”`);
    if (!q.o.includes(q.a)) bad(at, `quiz answer “${q.a}” isn't an option`);
    marks(at, q.s);
  }
  // The build renders en.json over the HTML, so a stale row would replace the data.
  g.words?.forEach((w, i) => { if (en[`wortfallen.${g.id}.m${i + 1}`] !== w.meaning) bad(at, `en.json m${i + 1} differs from the data`); });
  for (const f of ["react", "tip"]) if (en[`wortfallen.${g.id}.${f}`] !== g[f]) bad(at, `en.json ${f} differs from the data`);
}
const wfIds = new Set(wf.groups.map((g) => g.id));
for (const k of Object.keys(en)) {
  const m = k.match(/^wortfallen\.([^.]+)\.(m\d|react|tip)$/);
  if (m && !wfIds.has(m[1])) bad("en.json", `${k} has no group`);
}

/* ---- common mistakes ---- */
const GROUP_IDS = ["gleich", "gross", "aehnlich", "wendung", "hinten"]; // CSS: .tf-grp--<id>
const tf = read("src/data/typische-fehler.json");
if (tf.groups.map((g) => g.id).join() !== GROUP_IDS.join()) bad("typische-fehler", `groups must be ${GROUP_IDS.join(", ")}`);
const pairs = tf.groups.flatMap((g) => g.pairs);
unique("typische-fehler", pairs.map((p) => p.id));
for (const p of pairs) {
  const at = `typische-fehler ${p.id}`;
  if (!/^[a-z0-9-]+$/.test(p.id)) bad(at, "id isn't a plain slug");
  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(p.level)) bad(at, `level “${p.level}”`);
  if (p.variety !== "es-ES") bad(at, "no variety");
  for (const s of [p.a, p.b]) if (!s?.w || !s?.pos || !s?.ex) bad(at, "a side without w, pos or ex");
  if (p.a.wrong) bad(at, "only side b can be wrong (the page shows a first)");
  if (!p.why) bad(at, "no why");
  if (!p.check?.gap?.includes("___")) bad(at, "gap without ___");
  if (!["a", "b"].includes(p.check?.answer)) bad(at, `answer “${p.check?.answer}”`);
  if (p.check?.options && p.check.options.length !== 2) bad(at, "options must be two");
  if (p.b.wrong && !p.check?.options) bad(at, "a wrong side needs explicit options");
  marks(at, p.check?.gap);
}
const ids = new Set(pairs.map((p) => p.id));
for (const c of read("src/data/wortarten.json").classes) if (c.fehler && !ids.has(c.fehler)) bad(`wortarten ${c.id}`, `fehler “${c.fehler}” doesn't exist`);

/* ---- slang ---- */
const us = read("src/data/umgangssprache.json");
for (const id of ["kurzformen", "alltag", "zahlen", "jugend", "vulgaer"]) if (!us.gruppen.some((g) => g.id === id)) bad("umgangssprache", `group ${id} is missing (the page's mascots are keyed by it)`);
for (const g of us.gruppen) {
  for (const e of g.eintraege) {
    const at = `umgangssprache ${g.id} ${e.w}`;
    if (!e.w || !e.std) bad(at, "no w or std");
    if (e.variety !== "es-ES") bad(at, "no variety");
    if (g.reg === "vulgaer" && ![1, 2, 3].includes(e.stufe)) bad(at, "rude entry without stufe 1–3");
    if (e.bsp) marks(at, e.bsp);
  }
}
for (const h of us.hoeflich) { marks("umgangssprache hoeflich", h.von); marks("umgangssprache hoeflich", h.zu); }

/* ---- synonyms ---- */
const LEVELS = new Set(["A1", "A2", "B1", "B2"]);
const POS = new Set(["verb", "adj", "adv", "noun"]);
for (const g of read("src/data/synonyme.json").groups) {
  const at = `synonyme ${g.words?.join("/")}`;
  if (!LEVELS.has(g.level)) bad(at, `level “${g.level}”`);
  if (!POS.has(g.pos)) bad(at, `pos “${g.pos}”`);
  if (!(g.words?.length >= 2) || new Set(g.words).size !== g.words.length) bad(at, "needs two different words");
  if (g.variety !== "es-ES") bad(at, "no variety");
  if (g.emoji && !hasEmoji(g.emoji)) bad(at, `no picture ${g.emoji}`);
}

/* ---- mistakes by first language ---- */
const fs = read("src/data/fehler-nach-sprache.json");
const AREAS = new Set(Object.keys(fs.areas));
unique("fehler-nach-sprache", fs.languages.map((l) => l.id));
for (const l of fs.languages) {
  const at = `fehler-nach-sprache ${l.id}`;
  if (!l.strengths?.length) bad(at, "no strengths");
  for (const m of l.mistakes ?? []) {
    if (!AREAS.has(m.area)) bad(at, `area “${m.area}”`);
    if (!m.wrong || !m.right || !m.why) bad(at, `mistake without wrong, right or why: ${m.wrong}`);
    if (m.wrong === m.right) bad(at, `wrong and right are the same: ${m.wrong}`);
    if (m.area !== "aussprache") marks(at, m.right);
  }
}
for (const q of fs.quiz) if (!q.options.includes(q.answer)) bad("fehler-nach-sprache quiz", `answer isn't an option: ${q.prompt}`);

if (problems.length) {
  console.error(`check:sprachfallen — ${problems.length} problem(s):`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`check:sprachfallen ok: ${wf.groups.length} traps, ${pairs.length} pairs, ${fs.languages.length} first languages.`);
