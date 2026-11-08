// The conjugation trainer behind /grammar/conjugation (docs/content-plan.md §4.2).
//
// Plain ESM with no Vite imports, so scripts/check-conjugation-trainer.mjs runs the same code as
// the page. It turns verbtabellen.json (forms, through verbtabellenCore.js) and
// conjugation-trainer.json (what can be drilled, hand-written sets) into questions in the shape
// mountPracticeWorkspace takes: { id, prompt, options, answer, explain, change }.
// Typed answers add `accepted` (every right form) and are judged by judge() below.
//
// French specifics:
// - The learner types the verb form only; the subject stands in the prompt. In the je row the
//   prompt says "je / j'", so elision gives nothing away (j'ai parlé or je suis allé?). A typed
//   subject is forgiven when it is the right one (j'aime, que tu viennes).
// - The subjunctive is asked after que: que je, qu'il.
// - Compound tenses with être show the agreement as the tables do, allé(e), allé(e)s; typed,
//   any agreed form counts (allé, allée; vous also takes the singular, the polite vous).
// - The negative imperative is the whole form, ne parle pas; typed without ne … pas it gets
//   its own hint, as a pronominal form without its pronoun does.
import { accepts, accentOnly } from "./answerMatch.js";
import { skippedFor } from "./variety.js";
import { buildVerb, buildAll, DASH, PERSONS, elides, parseInf, patternForms } from "./verbtabellenCore.js";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const LEVEL_RANK = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };
// An imperative addresses tu, nous or vous; no subject is written.
const IMP_PERSONS = ["", "(tu)", "", "(nous)", "(vous)", ""];
// The subjects a learner may type before the form, per person.
const SUBJECTS = [["je ", "j'"], ["tu "], ["il ", "elle ", "on "], ["nous "], ["vous "], ["ils ", "elles "]];
const SIMPLE = new Set(["praes", "praet", "imperf", "fut", "cond", "subj", "subjImpf", "imp"]);
const COMPOUND = new Set(["perf", "plusc", "futPerf", "condPerf", "subjPerf", "subjPlusc"]);
const WITH_QUE = new Set(["subj", "subjPerf", "subjImpf", "subjPlusc"]);
// The forms a learner mixes a tense up with, closest first: same person, other tense.
const SIBLINGS = {
  praes: ["subj", "imperf"],
  praet: ["imperf", "praes"],
  perf: ["plusc", "praes"],
  imperf: ["cond", "praes"],
  fut: ["cond", "praes"],
  cond: ["fut", "imperf"],
  subj: ["praes", "imperf"],
  subjImpf: ["praet", "subj"],
  imp: ["praes", "subj"],
  impNeg: ["imp", "praes"],
  plusc: ["perf", "condPerf"],
  futPerf: ["condPerf", "perf"],
  condPerf: ["futPerf", "plusc"],
  subjPerf: ["perf", "plusc"],
  subjPlusc: ["plusc", "subjPerf"],
};
// Verbs whose bare -er/-ir/-re pattern gives no believable wrong form (être → êts, pouvoir →
// pouvs): no pattern guess is offered for them.
const NO_GUESS_PLAIN = new Set(["être", "avoir", "aller"]);
const OPTION_COUNT = 4;

const shuffled = (list, rng) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fallback = (_key, text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m));
const reflexiveOf = (i, word) => {
  const c = ["me", "te", "se", "nous", "vous", "se"][i];
  return i !== 3 && i !== 4 && elides(word) ? `${c[0]}'${word}` : `${c} ${word}`;
};
const negate = (f) => (elides(f) ? `n'${f} pas` : `ne ${f} pas`);

/** Every right spelling of a form with an agreement in brackets: allé(e)s → allés, allées, allé(e)s. */
export function agreementVariants(f, person) {
  if (!/\((e|es)\)/.test(f)) return [f];
  const masc = f.replace("(e)s", "s").replace("(es)", "").replace("(e)", "");
  const fem = f.replace("(e)s", "es").replace("(es)", "es").replace("(e)", "e");
  const out = [f, masc, fem];
  // vous for one person (Madame, vous êtes arrivée ?): the singular agreement is right too.
  if (person === 4) out.push(f.replace(/\(e\)s|\(es\)/, ""), f.replace(/\(e\)s|\(es\)/, "e"));
  return [...new Set(out)];
}

// A pronominal form without its pronoun: lève for me lève, lève for lève-toi.
const barePronominal = (f) => f.replace(/^(me |te |se |nous |vous |m'|t'|s')(en )?/, "").replace(/-(toi|nous|vous|t'en|nous-en|vous-en)$/, "");

/**
 * @param {{ verbs: object[] }} verbData     src/data/verbtabellen.json
 * @param {object} trainer                   src/data/conjugation-trainer.json
 * @param {{ rng?: () => number, tr?: Function }} [opts]
 *   `tr(key, fallback, vars)` is the interface language's t(); without it the English text stands.
 */
export function createTrainer(verbData, trainer, { rng = Math.random, tr = fallback } = {}) {
  const { tenses, groups, presets, limits, notDrilled } = trainer.drills;
  const verbs = buildAll(verbData.verbs);
  const rawByInf = new Map(verbData.verbs.map((v) => [v.inf, v]));
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
  function poolFor({ tenses: wanted = tenses.map((t) => t.key), groups: inGroups, verbs: only } = {}) {
    const pool = [];
    const list = only ? only.map((inf) => byInf.get(inf)).filter(Boolean) : verbs;
    for (const v of list) {
      if (!groupOfInf.has(v.inf)) continue;
      if (inGroups && !only && !inGroups.includes(groupOfInf.get(v.inf))) continue;
      for (const tense of wanted) {
        if (!allowed(v, tense)) continue;
        for (const row of v.rows) {
          if (row[tense].f === DASH) continue;
          // Common verbs first when a learner meets a drill for the first time; random inside a
          // level, so one verb's six forms don't fill the session (artikelVerlauf.buildSession).
          pool.push({ id: `d.${v.id}.${tense}.${row.person}`, verb: v.id, tense, person: row.person, freqPos: (LEVEL_RANK[v.level] ?? 4) + rng() });
        }
      }
    }
    return pool;
  }

  const poolForPreset = (id) => {
    const p = presetById.get(id);
    return p ? poolFor({ tenses: p.tenses, groups: p.groups, verbs: p.verbs }) : [];
  };

  // Built once per verb: the plain pattern (the wrong forms learners write: prendu, venirai) and
  // the other auxiliary (j'ai allé).
  const cache = new Map();
  const memo = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const regularVerb = (v) => memo(`reg:${v.inf}`, () => buildVerb({ inf: v.inf, ...(v.aux ? { aux: v.aux } : {}) }));
  // être verbs only: avoir with arriver, venir, partir is the classic slip. avoir verbs aren't
  // turned round, because être + participle is also the passive (je suis pris, c'est fini).
  const otherAuxVerb = (v) => memo(`aux:${v.inf}`, () => {
    if (v.pronominal || v.auxName !== "être" || v.aux === "both") return null;
    const { aux, ...raw } = rawByInf.get(v.inf);
    return buildVerb(raw);
  });
  const mayGuess = (v) => {
    const p = parseInf(v.inf);
    if (NO_GUESS_PLAIN.has(p.plain)) return false;
    return p.type === "er" || p.type === "ir" || (p.type === "re" && p.stem.endsWith("d"));
  };

  function guesses(v, tense, person) {
    if (!mayGuess(v)) return [];
    const p = parseInf(v.inf);
    const out = [regularVerb(v).rows[person][tense].f];
    if (SIMPLE.has(tense) && tense !== "imp") {
      const bare = patternForms(p.plain, false)[tense][person];
      if (bare !== DASH) out.unshift(v.pronominal ? (p.en ? `${["m'en", "t'en", "s'en", "nous en", "vous en", "s'en"][person]} ${bare}` : reflexiveOf(person, bare)) : bare);
    }
    return out.filter((f) => f && f !== DASH);
  }

  function optionsFor(v, tense, person, form, accepted) {
    const row = v.rows[person];
    const right = new Set(accepted);
    const usable = (f) => f && f !== DASH && !right.has(f);
    const first = [];
    // j'ai allé: the auxiliary is the point of a compound tense.
    if (COMPOUND.has(tense)) {
      const other = otherAuxVerb(v)?.rows[person][tense].f;
      if (other) first.push(other);
    }
    // ne parles pas: the tu form of the présent in a negative command.
    if (tense === "impNeg" && row.praes.f !== DASH) first.push(negate(row.praes.f));
    const guess = guesses(v, tense, person).filter((f) => f !== form);
    const sibling = SIBLINGS[tense].map((k) => {
      const f = row[k].f;
      return tense === "impNeg" && k === "praes" ? null : f;
    });
    const otherPersons = shuffled(v.rows.filter((r) => r.person !== person).map((r) => r[tense].f), rng);
    // One of each kind first, so a choice tests form, tense and person together.
    const ordered = [...first, guess[0], sibling[0], otherPersons[0], guess[1], sibling[1], ...otherPersons.slice(1)];
    const picked = [];
    for (const f of ordered) {
      if (!usable(f) || picked.includes(f)) continue;
      picked.push(f);
      if (picked.length === OPTION_COUNT - 1) break;
    }
    return shuffled([form, ...picked], rng);
  }

  function explainFor(v, tense, person, form, accepted) {
    const t = tenseOf.get(tense);
    let line = tr("conj.explain.tense", "{tense}: {tip}.", { tense: t.name, tip: tr(`conj.tip.${tense}`, t.tip) });
    if (COMPOUND.has(tense) && v.auxName === "être") {
      line += ` ${tr("conj.explain.etre", "{verb} takes être, so the participle agrees with the subject.", { verb: v.inf })}`;
    }
    const cell = v.rows[person][tense];
    if (!cell.x) return line;
    const plain = regularVerb(v).rows[person][tense].f;
    // A pattern form that is also right (ils payent beside ils paient) is no mistake to name.
    const guess = guesses(v, tense, person).filter((f) => !accepted.includes(f));
    const other = guess.find((f) => f !== form);
    if (plain === form || accepted.includes(plain)) {
      return other ? `${line} ${tr("conj.explain.spelling", "A spelling rule applies here: not {guess}.", { guess: other })}` : line;
    }
    if (COMPOUND.has(tense)) return `${line} ${tr("conj.explain.participle", "Irregular participle: {p2}.", { p2: v.p2 })}`;
    return guess.length
      ? `${line} ${tr("conj.explain.irregular", "This form doesn't follow the pattern: not {guess}.", { guess: plain })}`
      : `${line} ${tr("conj.explain.irregularPlain", "An irregular form: learn it as it is.")}`;
  }

  // The subject as the prompt shows it, and as the finished sentence writes it.
  function subjectOf(v, tense, person, form) {
    const imperative = tense === "imp" || tense === "impNeg";
    if (imperative) return { lead: IMP_PERSONS[person], said: "" };
    // falloir, pleuvoir: impersonal, il only.
    let who = v.defective && person === 2 ? "il" : v.defective && person === 5 ? "ils" : PERSONS[person];
    let said;
    if (person === 0) {
      said = elides(form) ? "j'" : "je ";
      if (!v.pronominal) who = "je / j'";
    } else said = `${who.split("/")[0]} `;
    if (WITH_QUE.has(tense)) {
      const que = /^[aeiouy]/i.test(who) ? "qu'" : "que ";
      who = `${que}${who}`;
      said = `${/^[aeiouy]/i.test(said) ? "qu'" : "que "}${said}`;
    }
    return { lead: who, said };
  }

  /** One pool stub → a full question. */
  function question(stub) {
    const v = verbById.get(stub.verb);
    const { tense, person } = stub;
    const cell = v.rows[person][tense];
    const form = cell.f;
    const t = tenseOf.get(tense);
    const { lead, said } = subjectOf(v, tense, person, form);
    const accepted = [...new Set([form, cell.alt].filter(Boolean).flatMap((f) => agreementVariants(f, person)))];
    const imperative = tense === "imp" || tense === "impNeg";
    const pronominalForm = v.pronominal && tense !== "impNeg";
    return {
      id: stub.id,
      prompt: `<span class="cj-cue"><b lang="fr">${v.inf}</b><span class="cj-cue-en">${v.en ?? ""}</span><span class="cj-cue-tense" lang="fr">${t.name}</span></span><span class="cj-line" lang="fr">${lead} ___</span>`,
      options: optionsFor(v, tense, person, form, accepted),
      answer: form,
      accepted,
      // Named after the answer as "Also right": a real variant, not the agreement spellings.
      also: cell.alt ?? null,
      // Typed without the pronoun (lève for me lève) or without ne … pas: a hint, not just "wrong".
      bare: pronominalForm ? accepted.map(barePronominal).filter((f) => !accepted.includes(f)) : [],
      unnegated: tense === "impNeg" ? [v.rows[person].imp.f, cell.alt && v.rows[person].imp.alt].filter((f) => f && f !== DASH) : [],
      subjects: imperative ? [] : SUBJECTS[person].flatMap((s) => (WITH_QUE.has(tense) ? [`que ${s}`, `qu'${s}`] : [s])),
      negative: tense === "impNeg",
      explain: explainFor(v, tense, person, form, accepted),
      // il est venu, ils sont venus: the finished sentence names il, so it agrees with il.
      change: imperative ? form : `${said}${person === 2 || person === 5 ? agreementVariants(form, person)[1] ?? form : form}`,
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
        prompt: `<span class="cj-line cj-line--sentence" lang="fr">${it.prompt}</span>`,
        options: it.options ? shuffled(it.options, rng) : null,
        answer: list[0],
        accepted: list,
        also: list[1] ?? null,
        bare: [],
        unnegated: [],
        subjects: [],
        negative: false,
        explain: it.explain,
        change: it.change ?? list[0],
      };
    });
  }

  const presetCount = (id) => poolForPreset(id).length;

  return {
    verbs, tenses, groups, presets, sets: trainer.sets,
    presetById, setById, tenseOf,
    poolFor, poolForPreset, presetCount, question, setQuestions,
  };
}

/**
 * Judges a typed answer. `accepts` never folds accents (content-plan §1.2), so a form that is one
 * accent off comes back as `accent`, a pronominal form without its pronoun as `pronoun`, and a
 * negative command without ne … pas as `negation`. The right subject typed in front is forgiven.
 * @returns {{ ok: boolean, why?: "accent" | "pronoun" | "negation" | "wrong" }}
 */
export function judge(q, value) {
  const raw = String(value ?? "").trim().replace(/\s+/g, " ").replace(/[’‘ʼ]/g, "'");
  const tries = [raw];
  // Longest subject first, so "que j'" goes before "j'"; only this person's subjects.
  for (const s of [...(q.subjects ?? [])].sort((a, b) => b.length - a.length)) {
    if (raw.toLowerCase().startsWith(s)) {
      tries.push(raw.slice(s.length).trim());
      break;
    }
  }
  if (tries.some((t) => accepts(q.accepted, t))) return { ok: true };
  if (tries.some((t) => accentOnly(q.accepted, t))) return { ok: false, why: "accent" };
  if (q.bare?.length && tries.some((t) => accepts(q.bare, t))) return { ok: false, why: "pronoun" };
  if (q.unnegated?.length && tries.some((t) => accepts(q.unnegated, t))) return { ok: false, why: "negation" };
  return { ok: false, why: "wrong" };
}

