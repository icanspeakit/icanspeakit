// The conjugation trainer behind /grammar/conjugation (docs/content-plan.md §4.2).
//
// Plain ESM with no Vite imports, so scripts/check-conjugation-trainer.mjs runs the same code as
// the page. It turns verbtabellen.json (forms, through verbtabellenCore.js) and
// conjugation-trainer.json (what can be drilled, hand-written sets) into questions in the shape
// mountPracticeWorkspace takes: { id, prompt, options, answer, explain, change }.
// Typed answers add `accepted` (every right form) and are judged by judge() below.
import { accepts, accentOnly } from "./answerMatch.js";
import { showsVosotros, skippedFor } from "./variety.js";
import { buildAll, buildVerb, DASH, PERSONS, parseInf, patternForms, VOSOTROS } from "./verbtabellenCore.js";

export const LEVELS = ["A1", "A2", "B1", "B2"];
const LEVEL_RANK = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };
// An imperative addresses someone: its third-person rows are usted and ustedes only.
const IMP_PERSONS = ["", "tú", "usted", "nosotros/as", "vosotros/as", "ustedes"];
const CLITICS = ["me", "te", "se", "nos", "os", "se"];
const SIMPLE = new Set(["praes", "praet", "imperf", "fut", "cond", "subj", "subjImpf", "imp"]);
// The forms a learner mixes a tense up with, closest first: same person, other tense.
const SIBLINGS = {
  praes: ["subj", "praet"],
  praet: ["imperf", "praes"],
  perf: ["praet", "plusc"],
  imperf: ["praet", "cond"],
  fut: ["cond", "praes"],
  cond: ["fut", "imperf"],
  subj: ["praes", "subjImpf"],
  subjImpf: ["praet", "subj"],
  imp: ["praes", "subj"],
  impNeg: ["praes", "imp"],
  plusc: ["perf", "condPerf"],
  futPerf: ["condPerf", "perf"],
  condPerf: ["futPerf", "plusc"],
  subjPerf: ["perf", "subjPlusc"],
  subjPlusc: ["plusc", "subjPerf"],
};
const OPTION_COUNT = 4;

const unaccent = (s) => s.normalize("NFD").replace(/[́̈]/g, "").normalize("NFC");
const shuffled = (list, rng) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fallback = (_key, text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m));

// `no hables` is asked as `no ___`: the form is what is being practised.
const stripNo = (f) => f.replace(/^no /, "");

/**
 * @param {{ verbs: object[] }} verbData     src/data/verbtabellen.json
 * @param {object} trainer                   src/data/conjugation-trainer.json
 * @param {{ rng?: () => number, tr?: Function }} [opts]
 *   `tr(key, fallback, vars)` is the interface language's t(); without it the English text stands.
 */
export function createTrainer(verbData, trainer, { rng = Math.random, tr = fallback } = {}) {
  const { tenses, groups, presets, limits, notDrilled } = trainer.drills;
  const verbs = buildAll(verbData.verbs);
  const byInf = new Map(verbs.map((v) => [v.inf, v]));
  const tenseOf = new Map(tenses.map((t) => [t.key, t]));
  const groupOfInf = new Map(groups.flatMap((g) => g.verbs.map((inf) => [inf, g.id])));
  const presetById = new Map(presets.map((p) => [p.id, p]));
  const setById = new Map(trainer.sets.map((s) => [s.id, s]));
  const verbById = new Map(verbs.map((v) => [v.id, v]));

  const allowed = (v, tense) => {
    if (v.inf in notDrilled) return false;
    const lim = limits[v.inf];
    if (lim?.only && !lim.only.includes(tense)) return false;
    return !lim?.skip?.includes(tense);
  };

  /** Every form a selection asks: stubs with `id`, enough for history and session building. */
  function poolFor({ tenses: wanted = tenses.map((t) => t.key), groups: inGroups, verbs: only, vosotros = true } = {}) {
    const pool = [];
    const list = only ? only.map((inf) => byInf.get(inf)).filter(Boolean) : verbs;
    const withVos = vosotros && showsVosotros();
    for (const v of list) {
      if (!groupOfInf.has(v.inf)) continue;
      if (inGroups && !only && !inGroups.includes(groupOfInf.get(v.inf))) continue;
      for (const tense of wanted) {
        if (!allowed(v, tense)) continue;
        for (const row of v.rows) {
          if (row[tense].f === DASH || (!withVos && row.person === VOSOTROS)) continue;
          // Common verbs first when a learner meets a drill for the first time; random inside a
          // level, so one verb's six forms don't fill the session (artikelVerlauf.buildSession).
          pool.push({ id: `d.${v.id}.${tense}.${row.person}`, verb: v.id, tense, person: row.person, freqPos: (LEVEL_RANK[v.level] ?? 4) + rng() });
        }
      }
    }
    return pool;
  }

  const poolForPreset = (id, vosotros = true) => {
    const p = presetById.get(id);
    return p ? poolFor({ tenses: p.tenses, groups: p.groups, verbs: p.verbs, vosotros }) : [];
  };

  // What the plain pattern would give: the wrong forms learners actually write (tenió, buscé, hacido).
  const guessCache = new Map();
  function regularVerb(v) {
    if (!guessCache.has(v.inf)) guessCache.set(v.inf, buildVerb({ inf: v.inf }));
    return guessCache.get(v.inf);
  }
  function guesses(v, tense, person) {
    // ir, ser, dar, ver, oír: too little stem left for a pattern to look like anything (o, so).
    if (parseInf(v.inf).stem.length < 2) return [];
    const out = [regularVerb(v).rows[person][tense].f];
    if (SIMPLE.has(tense) && !(tense === "imp" && v.pronominal)) {
      const bare = patternForms(parseInf(v.inf).plain, false)[tense][person];
      if (bare !== DASH) out.unshift(v.pronominal && tense !== "imp" ? `${CLITICS[person]} ${bare}` : bare);
    }
    return out.filter((f) => f !== DASH);
  }

  function optionsFor(v, tense, person, form) {
    const row = v.rows[person];
    const clean = (f) => (tense === "impNeg" ? stripNo(f) : f);
    const right = new Set([form, row[tense].alt && clean(row[tense].alt)].filter(Boolean));
    const usable = (f) => f && f !== DASH && !right.has(f);
    // hablo/habló: the same letters, one accent apart, is the trap worth setting.
    const twin = [];
    if (tense === "praes" && person === 0 && unaccent(v.rows[2].praet.f) === unaccent(form)) twin.push(v.rows[2].praet.f);
    if (tense === "praet" && person === 2 && unaccent(v.rows[0].praes.f) === unaccent(form)) twin.push(v.rows[0].praes.f);
    const guess = guesses(v, tense, person).filter((f) => f !== form);
    const sibling = SIBLINGS[tense].map((k) => row[k].f);
    const otherPersons = shuffled(v.rows.filter((r) => r.person !== person).map((r) => r[tense].f), rng);
    // One of each kind first, so a choice tests form, tense and person together.
    const ordered = [...twin, guess[0], sibling[0], otherPersons[0], guess[1], sibling[1], ...otherPersons.slice(1)];
    const picked = [];
    for (const raw of ordered) {
      const f = raw && clean(raw);
      if (!usable(f) || picked.includes(f)) continue;
      picked.push(f);
      if (picked.length === OPTION_COUNT - 1) break;
    }
    return shuffled([form, ...picked], rng);
  }

  function explainFor(v, tense, person, form) {
    const t = tenseOf.get(tense);
    const line = tr("conj.explain.tense", "{tense}: {tip}.", { tense: t.name, tip: tr(`conj.tip.${tense}`, t.tip) });
    const row = v.rows[person][tense];
    if (!row.x) return line;
    const guess = guesses(v, tense, person).map((f) => (tense === "impNeg" ? stripNo(f) : f));
    const spelled = regularVerb(v).rows[person][tense].f;
    const plain = tense === "impNeg" ? stripNo(spelled) : spelled;
    const other = guess.find((f) => f !== form);
    if (plain === form) {
      return other
        ? `${line} ${tr("conj.explain.spelling", "A spelling rule applies here: not {guess}.", { guess: other })}`
        : line;
    }
    if (!SIMPLE.has(tense) && tense !== "impNeg") return `${line} ${tr("conj.explain.participle", "Irregular participle: {p2}.", { p2: v.p2 })}`;
    return guess.length
      ? `${line} ${tr("conj.explain.irregular", "This form doesn't follow the pattern: not {guess}.", { guess: plain })}`
      : `${line} ${tr("conj.explain.irregularPlain", "An irregular form: learn it as it is.")}`;
  }

  /** One pool stub → a full question. */
  function question(stub) {
    const v = verbById.get(stub.verb);
    const { tense, person } = stub;
    const row = v.rows[person][tense];
    const form = tense === "impNeg" ? stripNo(row.f) : row.f;
    const t = tenseOf.get(tense);
    const imperative = tense === "imp" || tense === "impNeg";
    const who = imperative ? IMP_PERSONS[person] : PERSONS[person];
    const lead = tense === "impNeg" ? `${who} no` : who;
    const altForm = row.alt && (tense === "impNeg" ? stripNo(row.alt) : row.alt);
    return {
      id: stub.id,
      prompt: `<span class="cj-cue"><b lang="es">${v.inf}</b><span class="cj-cue-en">${v.en ?? ""}</span><span class="cj-cue-tense" lang="es">${t.name}</span></span><span class="cj-line" lang="es">${lead} ___</span>`,
      options: optionsFor(v, tense, person, form),
      answer: form,
      accepted: altForm ? [form, altForm] : [form],
      clitic: v.pronominal && tense !== "imp" ? CLITICS[person] : null,
      negative: tense === "impNeg",
      explain: explainFor(v, tense, person, form),
      change: `${lead} ${form}`,
    };
  }

  /** A hand-written set → its questions, in a new order each time. */
  function setQuestions(id) {
    const set = setById.get(id);
    if (!set) return [];
    const items = set.items.filter((it) => !skippedFor(it));
    return shuffled(items, rng).map((it) => {
      const list = Array.isArray(it.answer) ? it.answer : [it.answer];
      return {
        id: it.id,
        prompt: `<span class="cj-line cj-line--sentence" lang="es">${it.prompt}</span>`,
        options: it.options ? shuffled(it.options, rng) : null,
        answer: list[0],
        accepted: list,
        clitic: null,
        negative: false,
        explain: it.explain,
        change: it.change ?? list[0],
      };
    });
  }

  const presetCount = (id, vosotros) => poolForPreset(id, vosotros).length;

  return {
    verbs, tenses, groups, presets, sets: trainer.sets,
    presetById, setById, tenseOf,
    poolFor, poolForPreset, presetCount, question, setQuestions,
  };
}

/**
 * Judges a typed answer. `accepts` never folds accents (content-plan §1.2), so a form that is one
 * accent off comes back as `accent`, and a pronominal form without its pronoun as `pronoun`.
 * @returns {{ ok: boolean, why?: "accent" | "pronoun" | "wrong" }}
 */
export function judge(q, value) {
  let typed = String(value ?? "").trim().replace(/\s+/g, " ");
  if (q.negative) typed = typed.replace(/^no /i, "");
  if (accepts(q.accepted, typed)) return { ok: true };
  if (accentOnly(q.accepted, typed)) return { ok: false, why: "accent" };
  if (q.clitic && accepts(q.accepted, `${q.clitic} ${typed}`)) return { ok: false, why: "pronoun" };
  return { ok: false, why: "wrong" };
}
