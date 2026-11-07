// Content check for every exercise and quiz data file (PROBLEM-MELDEN-QA-TIERED-PROMPT.md, Tier 3).
//
//   pnpm check:inhalte              → writes docs/inhalte-qa/befunde.json + bericht.md, prints a summary
//   node scripts/check-inhalte.mjs --prebuild
//                                   → prints one line, writes nothing, exits 1 only on errors
//
// Deterministic, no network. Findings have the shape of a public.meldungen row
// (quelle 'skript', status 'offen') plus `datei`, `check`, `schwere` (error | warn | info) and
// `herkunft: "skript"`. Refs and fingerprints come from src/lib/meldungRef.js, the same module the
// "Problem melden" buttons use, so a finding and a learner's report on one item share a ref.
// Entries with `herkunft: "review"` in befunde.json (Tier 4, written by hand) are kept on every run.
//
// What counts as an error (fails prebuild): something an engine can't render or grade: no
// answer, an answer that isn't one of the options, duplicate options, a build sentence whose
// tokens don't rebuild it, a broken index. Everything else is a warning or a hint for a person.
import fs from "node:fs";
import path from "node:path";
import { cleanRef, fingerprint, grammarItems, itemFingerprint, makeRef } from "../src/lib/meldungRef.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DATA = path.join(ROOT, "src", "data");
const OUT = path.join(ROOT, "docs", "inhalte-qa");
const PREBUILD = process.argv.includes("--prebuild");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(DATA, rel), "utf8"));
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const norm = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const low = (s) => norm(s).toLowerCase().replace(/[„“"‚‘'»«]/g, "").replace(/[.?!:,;]+$/g, "");
const words = (s) => norm(s).split(/\s+/).filter(Boolean);

const findings = [];
function add({ datei, ref, fp = null, check, schwere, grund, text, snapshot = {} }) {
  findings.push({ ref: cleanRef(ref) ?? ref, fingerprint: fp, quelle: "skript", grund, text, snapshot, status: "offen", datei, check, schwere, herkunft: "skript" });
}

/* ------------------------------------------------------------ helpers --- */

// Austrian / Swiss forms the site doesn't mark (Germany standard). `sein`-perfect of
// stehen/sitzen/liegen is southern; the rest are lexical variants.
const VARIANTS = [
  [/\b(bin|bist|ist|sind|seid|war|warst|waren|wäre|wären)\b[^.?!]{0,60}\b(gestanden|gesessen|gelegen)\b/i, "Perfekt mit „sein“ bei stehen/sitzen/liegen (süddeutsch/österreichisch)"],
  [/\bdaheim\b/i, "„daheim“ (süddeutsch/österreichisch; Standard: „zu Hause“)"],
  [/\bheuer\b/i, "„heuer“ (österreichisch; Standard: „dieses Jahr“)"],
  [/\bJänner\b/, "„Jänner“ (österreichisch)"],
  [/\b(Paradeiser|Erdäpfel|Topfen|Sackerl|Marille|Matura|Spital|Trottoir|Velo|parkieren|allfällig|zuwarten)\b/i, "österreichische/schweizerische Variante"],
];
// "du" in a Sie area: the imperative of address verbs in titles and hints.
const DU_IMPERATIVE = /\b(Klicke|Tippe|Ordne|Wähle|Ergänze|Bilde|Setze|Schreib|Schreibe|Bau|Baue|Lies|Hör|Höre|Finde|Verbinde|Achte)\b(?! Sie)/;
const SIE_IMPERATIVE = /\b(Klicken|Tippen|Ordnen|Wählen|Ergänzen|Bilden|Setzen|Schreiben|Bauen|Lesen|Hören|Finden|Verbinden|Achten) Sie\b/;
const STALE = /\b(20[2-3]\d)\b|\b(aktuell|derzeit|zurzeit|momentan|im Moment|neueste[nrs]?)\b|\bgewonnen\b.*\bWahl|\bWahl\b.*\bgewonnen\b|\d+(?:[.,]\d+)?\s?(?:€|Euro)\b|\b(Bundeskanzler(in)?|Bundespräsident(in)?)\b/i;
const ALL_OF = /\b(alle (oben )?genannten|alle Antworten|keine der (oben )?genannten|beides ist richtig|alles davon)\b/i;
const NEBENSATZ = /,\s*(dass|weil|obwohl|damit|ob|wenn|als|nachdem|bevor|während|der|die|das|den|dem|deren|dessen)\b/;
const STRAIGHT_QUOTES = /"[^"]+"/;

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const ratio = (a, b) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

/* -------------------------------------------------- quiz-shaped items --- */

const positionsByFile = new Map();
const filePositions = (datei) => (positionsByFile.has(datei) ? positionsByFile.get(datei) : positionsByFile.set(datei, []).get(datei));

// Every multiple-choice item from every quiz file, for the per-item and the cross-file checks.
const quizPool = []; // { datei, ref, q, area, level, stand }

/**
 * @param {string} datei
 * @param {string} setRef - ref without the item part, e.g. "k:pfand"
 * @param {Array} qs - [{ prompt, options, answer, explain?, stand? }]
 * @param {{ area: string, level?: string, stand?: string, optionsFrom?: string, shuffled?: boolean }} ctx
 */
function checkQuizSet(datei, setRef, qs, ctx) {
  const positions = [];
  qs.forEach((q, i) => {
    const ref = `${setRef}/q${i + 1}`;
    const fp = itemFingerprint(q);
    const snap = { frage: norm(q.prompt), optionen: q.options, loesung: q.answer };
    const opts = (q.options ?? []).map(norm);
    const answer = norm(q.answer);
    if (!norm(q.prompt)) add({ datei, ref, fp, check: "struktur.frage", schwere: "error", grund: "technisch", text: "Die Frage hat keinen Text.", snapshot: snap });
    if (!answer) add({ datei, ref, fp, check: "struktur.antwort", schwere: "error", grund: "antwort_falsch", text: "Die Frage hat keine Lösung.", snapshot: snap });
    if (ctx.optionsFrom !== "set") {
      if (!opts.length) add({ datei, ref, fp, check: "struktur.optionen", schwere: "error", grund: "technisch", text: "Keine Antwortmöglichkeiten.", snapshot: snap });
      else if (answer && !opts.includes(answer)) add({ datei, ref, fp, check: "struktur.loesung-nicht-in-optionen", schwere: "error", grund: "antwort_falsch", text: `Die Lösung „${answer}“ steht nicht unter den Antworten.`, snapshot: snap });
      if (opts.some((o) => !o)) add({ datei, ref, fp, check: "struktur.leere-option", schwere: "error", grund: "technisch", text: "Eine Antwortmöglichkeit ist leer.", snapshot: snap });
      const lows = opts.map(low);
      if (new Set(lows).size !== lows.length) add({ datei, ref, fp, check: "struktur.doppelte-option", schwere: "error", grund: "technisch", text: "Zwei Antwortmöglichkeiten sind gleich.", snapshot: snap });
      positions.push(opts.indexOf(answer));
      // Guessability: the right answer is clearly the longest.
      const others = opts.filter((o) => o !== answer);
      const longest = Math.max(0, ...others.map((o) => o.length));
      if (answer.length >= 20 && others.length && answer.length >= 1.6 * longest && answer.length - longest >= 12) {
        add({ datei, ref, fp, check: "raten.laengste-antwort", schwere: "warn", grund: "unklar", text: `Die richtige Antwort ist viel länger als die anderen (${answer.length} gegen höchstens ${longest} Zeichen) und lässt sich ohne Wissen erraten.`, snapshot: snap });
      }
      if (opts.some((o) => ALL_OF.test(o))) add({ datei, ref, fp, check: "raten.alle-genannten", schwere: "warn", grund: "unklar", text: "Eine Option wie „alle genannten“ / „keine davon“.", snapshot: snap });
      // The single-word answer already stands in the question, and no distractor does.
      if (answer && !/\s/.test(answer) && answer.length >= 4 && new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(norm(q.prompt)) && !others.some((o) => new RegExp(`\\b${o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(norm(q.prompt)))) {
        add({ datei, ref, fp, check: "raten.antwort-in-frage", schwere: "warn", grund: "unklar", text: `Das Lösungswort „${answer}“ steht schon in der Frage.`, snapshot: snap });
      }
    }
    checkText(datei, ref, fp, [q.prompt, ...(q.options ?? []), q.explain].filter(Boolean).join(" \n "), ctx, snap, q.stand ?? ctx.stand);
    checkLevel(datei, ref, fp, q.prompt, ctx.level, snap);
    quizPool.push({ datei, ref, fp, q, area: ctx.area });
  });
  // Position bias. quiz.js and the LiD test show options in a fixed per-question shuffle
  // (src/lib/seededShuffle.js), so data order no longer matters there; a set that is shown in
  // data order passes `shuffled: false`.
  // Flag a set when every answer sits in one position (4+ questions), or 70 % of 6+.
  // 3 of 4 in one spot happens by chance too often to mean anything.
  if (ctx.shuffled === false) for (const p of positions) if (p >= 0) filePositions(datei).push(p);
  if (ctx.shuffled === false && positions.length >= 4) {
    const counts = {};
    for (const p of positions) if (p >= 0) counts[p] = (counts[p] ?? 0) + 1;
    const [pos, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (n && (n === positions.length || (positions.length >= 6 && n / positions.length >= 0.7))) {
      add({ datei, ref: setRef, check: "raten.immer-gleiche-position", schwere: "warn", grund: "unklar", text: `In ${n} von ${positions.length} Fragen ist die richtige Antwort die ${"ABCDEFGH"[pos]}. Die Reihenfolge wird nicht gemischt; wer das merkt, kann raten.`, snapshot: { positionen: positions } });
    }
  }
}

/** Language consistency, variants, staleness, quotes: for any text of one item. */
function checkText(datei, ref, fp, text, ctx, snap, stand) {
  const t = norm(text);
  for (const [re, what] of VARIANTS) {
    if (re.test(t)) add({ datei, ref, fp, check: "deutsch.variante", schwere: "warn", grund: "fehler_deutsch", text: `${what}: „${t.match(re)[0]}“. Die Seite lehrt das Deutsch in Deutschland; markieren oder ersetzen.`, snapshot: snap });
  }
  if (STRAIGHT_QUOTES.test(String(text))) add({ datei, ref, fp, check: "deutsch.anfuehrungszeichen", schwere: "info", grund: "fehler_deutsch", text: `Gerade Anführungszeichen ${String(text).match(STRAIGHT_QUOTES)[0]}; deutsch: „…“.`, snapshot: snap });
  if (ctx.area === "kultur" && SIE_IMPERATIVE.test(t)) add({ datei, ref, fp, check: "deutsch.du-sie", schwere: "warn", grund: "fehler_deutsch", text: `Sie-Form („${t.match(SIE_IMPERATIVE)[0]}“) in einem du-Bereich.`, snapshot: snap });
  if (!stand && STALE.test(t)) add({ datei, ref, fp, check: "aktualitaet.ohne-stand", schwere: "warn", grund: "sonstiges", text: `Kann veralten („${t.match(STALE)[0]}“), aber kein „stand“-Feld.`, snapshot: snap });
}

function checkLevel(datei, ref, fp, prompt, level, snap) {
  if (level !== "A1") return;
  const n = words(prompt).length;
  if (n > 14) add({ datei, ref, fp, check: "niveau.satzlaenge", schwere: "info", grund: "unklar", text: `A1-Frage mit ${n} Wörtern.`, snapshot: snap });
  if (NEBENSATZ.test(norm(prompt))) add({ datei, ref, fp, check: "niveau.nebensatz", schwere: "info", grund: "unklar", text: `A1-Frage mit Nebensatz („${norm(prompt).match(NEBENSATZ)[0].trim()}“).`, snapshot: snap });
}

/* ------------------------------------------------------------ grammar --- */

function checkGrammarTopic(file, data, refBase) {
  const datei = rel(file);
  (data.exercises ?? []).forEach((ex, ei) => {
    const exRef = `${refBase}/${ei + 1}`;
    const items = grammarItems(ex);
    const snapEx = { typ: ex.type, titel: ex.title };
    const itemRef = (it) => `${exRef}/${it.part}`;
    const fpOf = (it) => fingerprint(it.prompt, it.answer);
    const head = `${ex.title ?? ""} ${ex.hint ?? ""}`;
    if (DU_IMPERATIVE.test(head)) {
      // Grammar exercises address the learner with Sie (docs/grammatik-qa/batch6.md).
      const mixed = /\b[A-Za-zäöüß]+en Sie\b/.test(head);
      add({ datei, ref: exRef, check: "deutsch.du-sie", schwere: "warn", grund: "fehler_deutsch", text: `${mixed ? "du und Sie gemischt" : "du-Form"}: „${head.match(DU_IMPERATIVE)[0]}“ in einer Grammatik-Übung; Grammatik-Übungen siezen.`, snapshot: { titel: ex.title, hinweis: ex.hint } });
    }
    for (const it of items) {
      const snap = { ...snapEx, satz: it.prompt, loesung: it.answer };
      const ans = Array.isArray(it.answer) ? it.answer : [it.answer];
      if (!ans.length || ans.some((a) => !norm(a))) add({ datei, ref: itemRef(it), fp: fpOf(it), check: "struktur.antwort", schwere: "error", grund: "antwort_falsch", text: "Keine Lösung.", snapshot: snap });
      if (Array.isArray(it.options) && it.options.length && !ans.some((a) => it.options.map(norm).includes(norm(a)))) {
        add({ datei, ref: itemRef(it), fp: fpOf(it), check: "struktur.loesung-nicht-in-optionen", schwere: "error", grund: "antwort_falsch", text: `Die Lösung steht nicht unter den Auswahlmöglichkeiten (${it.options.join(", ")}).`, snapshot: snap });
      }
      checkText(datei, itemRef(it), fpOf(it), `${it.prompt} ${ans.join(" ")}`, { area: "grammatik" }, snap, true);
      if (ex.type === "fill") {
        const src = ex.items[it.key];
        const gaps = (String(src.prompt).match(/_{3,}/g) ?? []).length;
        if (gaps > 1 && !Array.isArray(src.answer)) add({ datei, ref: itemRef(it), fp: fpOf(it), check: "struktur.luecken", schwere: "warn", grund: "unklar", text: `${gaps} Lücken, aber eine einzige Lösung.`, snapshot: snap });
        if (src.hint && low(src.hint) === low(ans[0])) add({ datei, ref: itemRef(it), fp: fpOf(it), check: "hinweis.verraet-loesung", schwere: "warn", grund: "unklar", text: "Der Hinweis ist die Lösung.", snapshot: snap });
      }
    }
    // Coin flip: two possible answers for a whole table / fill / story.
    if (["table", "fill", "story"].includes(ex.type) && items.length >= 4) {
      const perRowChoices = ex.type === "table" && (ex.rows ?? []).every((r) => Array.isArray(r.choices) && r.choices.length >= 3);
      const distinct = new Set(items.map((it) => low(Array.isArray(it.answer) ? it.answer[0] : it.answer)));
      const choices = Array.isArray(ex.choices) ? ex.choices.length : null;
      if (!perRowChoices && distinct.size <= 2 && (choices == null || choices <= 2)) {
        add({ datei, ref: exRef, fp: null, check: "raten.nur-zwei-antworten", schwere: "warn", grund: "unklar", text: `Nur ${distinct.size} mögliche Antworten (${[...distinct].join(" / ")}) für ${items.length} Zeilen: Raten trifft jede zweite.`, snapshot: snapEx });
      }
    }
    if (ex.type === "match") {
      const qs = (ex.pairs ?? []).map((p) => low(p.q)), as = (ex.pairs ?? []).map((p) => low(p.a));
      if (new Set(qs).size !== qs.length || new Set(as).size !== as.length) add({ datei, ref: exRef, check: "struktur.match-doppelt", schwere: "error", grund: "technisch", text: "Zwei Paare haben dieselbe linke oder rechte Seite.", snapshot: snapEx });
    }
    if (ex.type === "build") {
      for (const s of ex.sentences ?? []) {
        if ([...(s.correct ?? [])].sort().join("\u0001") !== [...(s.shuffled ?? [])].sort().join("\u0001")) {
          add({ datei, ref: `${exRef}/${s.id}`, fp: fingerprint(s.hint ?? "", (s.correct ?? []).join(" ")), check: "struktur.build-token", schwere: "error", grund: "technisch", text: "Die gemischten Bausteine ergeben nicht den richtigen Satz.", snapshot: { correct: s.correct, shuffled: s.shuffled } });
        }
      }
    }
    if (ex.type === "story" || ex.type === "wordbank") {
      const blanks = (ex.segments ?? []).filter((s) => s.blank !== undefined).map((s) => s.blank);
      if (new Set(blanks).size !== blanks.length) add({ datei, ref: exRef, check: "struktur.luecken-nummern", schwere: "error", grund: "technisch", text: "Zwei Lücken haben dieselbe Nummer.", snapshot: snapEx });
      if (ex.type === "wordbank") for (const s of (ex.segments ?? []).filter((x) => x.blank !== undefined)) {
        if (!ex.letters?.[s.answer]) add({ datei, ref: `${exRef}/${s.blank + 1}`, check: "struktur.wortbank", schwere: "error", grund: "antwort_falsch", text: `Lösung „${s.answer}“ ist kein Buchstabe der Wortliste.`, snapshot: snapEx });
      }
    }
    if (ex.type === "mcgap") (ex.items ?? []).forEach((it, i) => {
      if (!(it.correct >= 0 && it.correct < (it.options ?? []).length)) add({ datei, ref: `${exRef}/${i + 1}`, check: "struktur.index", schwere: "error", grund: "antwort_falsch", text: "Der Lösungs-Index zeigt auf keine Option.", snapshot: snapEx });
    });
  });
}

/* ---------------------------------------------------------- all files --- */

// C1 topics keep their items in src/paid/grammatik/ (src/paid/README.md); the page merges
// them over the free file's titles at runtime, so do the same here. Findings point at the
// paid file, where the items live.
const gdir = path.join(DATA, "grammatik");
const PAID = path.join(ROOT, "src", "paid");
for (const f of fs.readdirSync(gdir).filter((x) => x.endsWith(".json")).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(gdir, f), "utf8"));
  const paidFile = path.join(PAID, "grammatik", f);
  if (fs.existsSync(paidFile)) {
    const paid = JSON.parse(fs.readFileSync(paidFile, "utf8"));
    data.exercises = (data.exercises ?? []).map((ex, i) => ({ ...ex, ...(paid.exercises?.[i] ?? {}) }));
  }
  checkGrammarTopic(fs.existsSync(paidFile) ? paidFile : path.join(gdir, f), data, `g:${(data.slug ?? data.id ?? f.replace(/\.json$/, "")).toLowerCase()}`);
}
const sbdir = path.join(DATA, "pruefungen", "sprachbausteine");
for (const f of fs.readdirSync(sbdir).filter((x) => x.endsWith(".json")).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(sbdir, f), "utf8"));
  checkGrammarTopic(path.join(sbdir, f), data, `x:telc/sprachbausteine/${data.setId ?? f.replace(/\.json$/, "")}`);
}

for (const g of read("grammatik.json")) {
  // Legacy quiz: options are the set's own distinct answers (withChoices), so no per-item options.
  checkQuizSet("src/data/grammatik.json", `g:quiz/${g.id}`, g.questions, { area: "grammatik", optionsFrom: "set", shuffled: true });
}
for (const t of read("kultur.json").topics) checkQuizSet("src/data/kultur.json", `k:${t.id}`, t.quiz ?? [], { area: "kultur", level: t.level });
for (const t of read("kultur-insider.json").topics) checkQuizSet("src/data/kultur-insider.json", `k:insider/${t.id}`, t.quiz ?? [], { area: "kultur", level: t.level });
checkQuizSet("src/data/fehler-nach-sprache.json", "k:fehler", read("fehler-nach-sprache.json").quiz ?? [], { area: "kultur" });
for (const t of read("hoeren.json").texts) checkQuizSet("src/data/hoeren.json", `h:${t.id}`, t.questions ?? [], { area: "hoeren", level: t.level });
for (const t of read("fertigkeiten/lesen.json").texts) checkQuizSet("src/data/fertigkeiten/lesen.json", `l:${t.id}`, t.questions ?? [], { area: "lesen", level: t.level });
for (const g of read("lesen.json").groups) checkQuizSet("src/data/lesen.json", `l:ls/${g.id}`, g.questions ?? [], { area: "lesen" });
const lid = read("leben-in-deutschland.json");
checkQuizSet("src/data/leben-in-deutschland.json", "x:lid", lid.questions, { area: "lid" });
for (const l of lid.bundeslaender ?? []) checkQuizSet("src/data/leben-in-deutschland.json", `x:lid/${l.id}`, l.stateQuestions ?? [], { area: "lid" });
for (const [level, qs] of Object.entries(read("einstufung.json").levels)) checkQuizSet("src/data/einstufung.json", `x:einstufung/${level.toLowerCase()}`, qs, { area: "einstufung", level, shuffled: true });

// Practice trainers: stable ids; options are shuffled by practiceWorkspace, so no position check.
function checkIdSet(datei, prefix, qs, ctx) {
  for (const q of qs) {
    const before = findings.length;
    checkQuizSet(datei, `${prefix}/${q.id}`, [q], { ...ctx, shuffled: true });
    // checkQuizSet appends /q1; these items are named by id.
    for (const f of findings.slice(before)) f.ref = cleanRef(f.ref.replace(/\/q1$/, "")) ?? f.ref;
    quizPool.at(-1).ref = cleanRef(`${prefix}/${q.id}`);
  }
}
checkIdSet("src/data/akkusativ.json", "g:akkusativ", read("akkusativ.json"), { area: "grammatik" });
for (const p of read("praepositionen-trainer.json").packs) checkIdSet("src/data/praepositionen-trainer.json", "g:praepositionen", p.questions ?? [], { area: "grammatik", level: p.level });
// Typed sets have no options to check; scripts/check-conjugation-trainer.mjs covers them.
for (const s of read("conjugation-trainer.json").sets) if (s.kind === "choice") checkIdSet("src/data/conjugation-trainer.json", "g:conjugation", s.items, { area: "grammatik", level: s.level });

// Exam sets: indices and labels.
const examFiles = [path.join(DATA, "pruefungen", "saetze"), path.join(PAID, "pruefungen", "saetze")]
  .filter((d) => fs.existsSync(d))
  .flatMap((d) => fs.readdirSync(d).filter((x) => x.endsWith(".json")).sort().map((x) => path.join(d, x)));
for (const file of examFiles) {
  const set = JSON.parse(fs.readFileSync(file, "utf8"));
  const datei = rel(file);
  for (const m of set.modules ?? []) for (const part of m.parts ?? []) for (const it of part.items ?? []) {
    const type = it.type ?? part.type;
    const ref = `x:${set.exam}/${set.id}/${it.id}`;
    if (type === "mc" || type === "gap-mc") {
      const fp = fingerprint(it.question ?? "", it.options?.[it.correct] ?? "");
      if (!(it.correct >= 0 && it.correct < (it.options ?? []).length)) add({ datei, ref, fp, check: "struktur.index", schwere: "error", grund: "antwort_falsch", text: "Der Lösungs-Index zeigt auf keine Option.", snapshot: { frage: it.question } });
      else {
        const ans = norm(it.options[it.correct]);
        const longest = Math.max(0, ...it.options.filter((_, i) => i !== it.correct).map((o) => norm(o).length));
        if (ans.length >= 20 && ans.length >= 1.6 * longest && ans.length - longest >= 12) add({ datei, ref, fp, check: "raten.laengste-antwort", schwere: "warn", grund: "unklar", text: `Die richtige Antwort ist viel länger als die anderen (${ans.length} gegen ${longest} Zeichen).`, snapshot: { frage: it.question, optionen: it.options } });
      }
    }
    const tfLabels = (it.labels ?? part.labels ?? ["richtig", "falsch"]).map((l) => String(l).toLowerCase());
    if (type === "tf" && !tfLabels.includes(String(it.correct).toLowerCase())) add({ datei, ref, check: "struktur.tf", schwere: "error", grund: "antwort_falsch", text: `Lösung „${it.correct}“ ist keine der Antworten dieses Teils (${tfLabels.join(" / ")}).`, snapshot: { aussage: it.statement } });
    if ((type === "match" || type === "gap-bank") && it.correct !== "x" && !(part.pool ?? part.bank ?? {})[it.correct]) add({ datei, ref, check: "struktur.zuordnung", schwere: "error", grund: "antwort_falsch", text: `Lösung „${it.correct}“ fehlt in der Auswahl.`, snapshot: { frage: it.prompt } });
  }
}

/* ------------------------------------------------------- cross-file ---- */

// Whole files: where does the right answer sit across all their questions?
const FILE_REF = { "src/data/kultur.json": "k:quiz/alle", "src/data/kultur-insider.json": "k:insider", "src/data/leben-in-deutschland.json": "x:lid", "src/data/hoeren.json": "h:alle", "src/data/fertigkeiten/lesen.json": "l:alle", "src/data/lesen.json": "l:ls", "src/data/fehler-nach-sprache.json": "k:fehler" };
for (const [datei, ps] of positionsByFile) {
  if (ps.length < 12) continue;
  const counts = {};
  for (const p of ps) counts[p] = (counts[p] ?? 0) + 1;
  const [pos, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (n / ps.length >= 0.5) {
    const verteilung = Object.entries(counts).sort().map(([k, v]) => `${"ABCDEFGH"[k]} ${v}`).join(", ");
    add({ datei, ref: FILE_REF[datei] ?? "k:quiz/alle", check: "raten.position-datei", schwere: "warn", grund: "unklar", text: `In ${Math.round((n / ps.length) * 100)} % aller ${ps.length} Fragen dieser Datei ist die richtige Antwort die ${"ABCDEFGH"[pos]} (${verteilung}). Die Optionen werden nicht gemischt.`, snapshot: { verteilung: counts } });
  }
}

// Same or near-same question in two places; same question, different answer = contradiction.
// Not compared: questions that depend on their own text (Hören, Lesen) and the LiD state
// questions among themselves ("Wie heißt das Landesparlament?" has 16 right answers).
const TEXT_BOUND = new Set(["hoeren", "lesen"]);
const pool = quizPool.map((p) => ({ ...p, key: low(p.q.prompt) })).filter((p) => p.key.length >= 15 && !TEXT_BOUND.has(p.area));
const isState = (ref) => /^x:lid\/[a-z-]+\/q\d+$/.test(ref);
for (let i = 0; i < pool.length; i++) {
  for (let j = i + 1; j < pool.length; j++) {
    const a = pool[i], b = pool[j];
    if (Math.abs(a.key.length - b.key.length) > a.key.length * 0.15) continue;
    if (isState(a.ref) && isState(b.ref)) continue;
    const r = a.key === b.key ? 1 : ratio(a.key, b.key);
    if (r < 0.9) continue;
    // A contradiction only for the very same question with the same options; otherwise a duplicate.
    const sameOptions = (a.q.options ?? []).map(low).sort().join("|") === (b.q.options ?? []).map(low).sort().join("|");
    const sameAnswer = low(a.q.answer) === low(b.q.answer) || !(a.key === b.key && sameOptions);
    add({
      datei: a.datei, ref: a.ref, fp: a.fp,
      check: sameAnswer ? "doppelt.frage" : "doppelt.widerspruch",
      schwere: sameAnswer ? "warn" : "error",
      grund: sameAnswer ? "sonstiges" : "antwort_falsch",
      text: sameAnswer
        ? `Fast dieselbe Frage auch unter ${b.ref} (${b.datei}, Ähnlichkeit ${Math.round(r * 100)} %).`
        : `Dieselbe Frage hat unter ${b.ref} eine andere Lösung („${norm(a.q.answer)}“ gegen „${norm(b.q.answer)}“).`,
      snapshot: { frage: norm(a.q.prompt), andere: b.ref, andereFrage: norm(b.q.prompt) },
    });
  }
}

/* ------------------------------------------------------------ output --- */

const errors = findings.filter((f) => f.schwere === "error");
const warns = findings.filter((f) => f.schwere === "warn");
const infos = findings.filter((f) => f.schwere === "info");
// Hard breaks only fail the build when they are "error"; a contradiction across files is a
// content error a person must look at, not a crash, so it doesn't block the build.
const blocking = errors.filter((f) => f.check !== "doppelt.widerspruch");

if (PREBUILD) {
  console.log(`check:inhalte: ${errors.length} Fehler, ${warns.length} Warnungen, ${infos.length} Hinweise (Bericht: pnpm check:inhalte)`);
  for (const f of blocking) console.error(`  ✗ ${f.datei} ${f.ref}: ${f.text}`);
  process.exit(blocking.length ? 1 : 0);
}

fs.mkdirSync(OUT, { recursive: true });
const befundePath = path.join(OUT, "befunde.json");
let previous = [];
try { previous = JSON.parse(fs.readFileSync(befundePath, "utf8")); } catch {}
const review = previous.filter((f) => f.herkunft === "review");
// A finding closed by scripts/meldungen-schliessen.mjs ("kein_fehler", "doppelt", "erledigt")
// keeps that status by ref + check, so the next run doesn't reopen it.
const closed = new Map(previous.filter((f) => f.herkunft === "skript" && (f.status ?? "offen") !== "offen").map((f) => [`${f.ref}|${f.check}`, f]));
for (const f of findings) {
  const c = closed.get(`${f.ref}|${f.check}`);
  if (c) Object.assign(f, { status: c.status, ...(c.erledigt_commit ? { erledigt_commit: c.erledigt_commit } : {}) });
}
const all = [...review, ...findings];
fs.writeFileSync(befundePath, JSON.stringify(all, null, 2) + "\n");

const SEV = { error: "Fehler", warn: "Warnung", info: "Hinweis" };
const open = all.filter((f) => (f.status ?? "offen") === "offen");
const byFile = {};
for (const f of open) (byFile[f.datei] ??= []).push(f);
const counts = (list) => Object.entries(list.reduce((m, f) => ((m[f.check] = (m[f.check] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
let md = `# Inhalts-Prüfung: Bericht\n\nErzeugt von \`pnpm check:inhalte\` (scripts/check-inhalte.mjs)${review.length ? ` plus ${review.length} Befunde aus der inhaltlichen Durchsicht (Tier 4)` : ""}. Nicht von Hand bearbeiten; die Daten stehen in \`befunde.json\`.\n\n`;
md += `| Offen | Anzahl |\n|---|---|\n| Fehler | ${open.filter((f) => f.schwere === "error").length} |\n| Warnungen | ${open.filter((f) => f.schwere === "warn").length} |\n| Hinweise | ${open.filter((f) => f.schwere === "info").length} |\n| geschlossen (erledigt, kein Fehler, doppelt) | ${all.length - open.length} |\n\n`;
md += `## Nach Prüfung (offen)\n\n| Prüfung | Anzahl |\n|---|---|\n${counts(open).map(([c, n]) => `| \`${c}\` | ${n} |`).join("\n")}\n\n`;
md += `## Nach Datei\n`;
for (const datei of Object.keys(byFile).sort()) {
  const list = byFile[datei];
  md += `\n### ${datei} (${list.length})\n`;
  for (const sev of ["error", "warn", "info"]) {
    const items = list.filter((f) => f.schwere === sev);
    if (!items.length) continue;
    md += `\n**${SEV[sev]}** (${items.length})\n\n`;
    for (const f of items) md += `- \`${f.ref}\` · ${f.check}: ${f.text}${f.vorschlag ? `\n  - **Vorschlag:** ${f.vorschlag}` : ""}\n`;
  }
}
fs.writeFileSync(path.join(OUT, "bericht.md"), md);

console.log(`check:inhalte: ${errors.length} Fehler, ${warns.length} Warnungen, ${infos.length} Hinweise → ${rel(befundePath)}, ${rel(path.join(OUT, "bericht.md"))}`);
for (const [c, n] of counts(findings)) console.log(`  ${String(n).padStart(4)}  ${c}`);
