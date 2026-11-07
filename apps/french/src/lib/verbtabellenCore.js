// The Spanish conjugation generator behind the verb tables (docs/content-plan.md §4.1).
//
// Plain ESM with no Vite imports, so scripts/check-verbtabellen.mjs and later the conjugation
// trainer run the same code as the page. Data lives in src/data/verbtabellen.json; the page
// reads it through src/lib/verbtabellen.js.
//
// A verb stores only the tenses it cannot derive. Everything else follows from:
//   imperf, fut, praet, ger, p2   the regular endings, with spelling rules (busqué, leyó, leído)
//   cond                          the stem of a stored `fut` (tendré → tendría)
//   subj                          the yo form of a stored `praes` (tengo → tenga)
//   subjImpf                      the ellos form of the indefinido (tuvieron → tuviera)
//   imp                           tú from the present, usted/nosotros/ustedes from subj, vosotros from the infinitive
//   impNeg                        no + subj (no hables, no habléis)
//   compound tenses               haber + p2
// A pronominal verb (levantarse) adds its pronoun to the forms of the plain verb, and takes the
// stored tenses of that verb when it is in the file (irse → ir, ponerse → poner).
//
// Each form carries `x`: it differs from what the bare pattern would give, spelling changes
// included (busqué, leíste), so the table highlights what a learner has to notice.

export const PERSONS = ["yo", "tú", "él/ella/usted", "nosotros/as", "vosotros/as", "ellos/ellas/ustedes"];
export const VOSOTROS = 4;
export const DASH = "–";

/** Tenses a verb may store as a comma list of six forms. */
export const STORED_TENSES = ["praes", "praet", "imperf", "fut", "cond", "subj", "subjImpf", "imp"];
/** Every tense in a table row, in the order the page lists them. */
export const ROW_TENSES = [
  "praes", "praet", "perf", "imperf", "fut", "cond", "subj", "subjImpf", "imp", "impNeg",
  "plusc", "futPerf", "condPerf", "subjPerf", "subjPlusc",
];

const CLITICS = ["me", "te", "se", "nos", "os", "se"];
const AUX = {
  perf: ["he", "has", "ha", "hemos", "habéis", "han"],
  plusc: ["había", "habías", "había", "habíamos", "habíais", "habían"],
  futPerf: ["habré", "habrás", "habrá", "habremos", "habréis", "habrán"],
  condPerf: ["habría", "habrías", "habría", "habríamos", "habríais", "habrían"],
  subjPerf: ["haya", "hayas", "haya", "hayamos", "hayáis", "hayan"],
  subjPlusc: ["hubiera", "hubieras", "hubiera", "hubiéramos", "hubierais", "hubieran"],
};
const FUT = ["é", "ás", "á", "emos", "éis", "án"];
const COND = ["ía", "ías", "ía", "íamos", "íais", "ían"];
const ENDINGS = {
  ar: {
    praes: ["o", "as", "a", "amos", "áis", "an"],
    praet: ["é", "aste", "ó", "amos", "asteis", "aron"],
    imperf: ["aba", "abas", "aba", "ábamos", "abais", "aban"],
    subj: ["e", "es", "e", "emos", "éis", "en"],
    ger: "ando", p2: "ado",
  },
  er: {
    praes: ["o", "es", "e", "emos", "éis", "en"],
    praet: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    imperf: COND,
    subj: ["a", "as", "a", "amos", "áis", "an"],
    ger: "iendo", p2: "ido",
  },
  ir: {
    praes: ["o", "es", "e", "imos", "ís", "en"],
    praet: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    imperf: COND,
    subj: ["a", "as", "a", "amos", "áis", "an"],
    ger: "iendo", p2: "ido",
  },
};

const isDash = (f) => f === DASH;
const dashes = () => Array(6).fill(DASH);
const split = (s) => s.split(",").map((f) => f.trim());
const unaccent = (s) => s.replace(/[áéíóú]/g, (c) => "aeiou"["áéíóú".indexOf(c)]);

/** Infinitive → its parts. levantarse: plain levantar, type ar, stem levant. oír: type ir, stem o. */
export function parseInf(inf) {
  const pronominal = /(ar|er|ir|ír)se$/.test(inf);
  const plain = pronominal ? inf.slice(0, -2) : inf;
  const type = plain.endsWith("ar") ? "ar" : plain.endsWith("er") ? "er" : "ir";
  return { inf, pronominal, plain, type, stem: plain.slice(0, -2) };
}

// Spelling keeps the sound of the stem's last consonant: busc-é → busqué, cog-o → cojo.
function respell(stem, ending, type) {
  const v = unaccent(ending)[0];
  if (type === "ar" && v === "e") {
    if (stem.endsWith("c")) return `${stem.slice(0, -1)}qu`;
    if (stem.endsWith("g")) return `${stem}u`;
    if (stem.endsWith("gu")) return `${stem.slice(0, -1)}ü`;
    if (stem.endsWith("z")) return `${stem.slice(0, -1)}c`;
  }
  if (type !== "ar" && (v === "a" || v === "o")) {
    if (stem.endsWith("gu")) return stem.slice(0, -1);
    if (stem.endsWith("g")) return `${stem.slice(0, -1)}j`;
    if (/[^aeiou]c$/.test(stem)) return `${stem.slice(0, -1)}z`;
  }
  return stem;
}

// A vowel before the ending: leí, leíste, leyó, leyeron, leyendo, leído. -uir keeps the plain i
// (construiste, construido) and only takes the y.
function vowelEnding(stem, ending) {
  const uir = /[^gq]u$/.test(stem);
  if (!uir && !/[aeo]$/.test(stem)) return ending;
  if (ending === "ió") return "yó";
  if (ending === "ieron") return "yeron";
  if (ending === "iendo") return "yendo";
  if (uir) return ending;
  if (ending === "iste") return "íste";
  if (ending === "imos") return "ímos";
  if (ending === "isteis") return "ísteis";
  if (ending === "ido") return "ído";
  return ending;
}

/**
 * The forms of the plain verb from its ending alone, for every stored tense plus `ger` and `p2`.
 * `spelled: false` gives the bare pattern, which is what `x` compares against and what a learner
 * wrongly guesses (tenió, hacido); `spelled: true` applies the spelling rules and is what a verb
 * without a stored tense uses.
 */
export function patternForms(plainInf, spelled = true) {
  const { stem, type } = parseInf(plainInf);
  const E = ENDINGS[type];
  const join = (ending, tense) => {
    if (!spelled) return stem + ending;
    const st = respell(stem, ending, type);
    const usesVowelRule = type !== "ar" && (tense === "praet" || tense === "ger" || tense === "p2");
    return st + (usesVowelRule ? vowelEnding(stem, ending) : ending);
  };
  const toFut = plainInf.replace(/ír$/, "ir");
  const praes = E.praes.map((e) => join(e, "praes"));
  const praet = E.praet.map((e) => join(e, "praet"));
  const subj = E.subj.map((e) => join(e, "subj"));
  const tu = `${stem}${type === "ar" ? "a" : "e"}`;
  return {
    praes,
    praet,
    imperf: E.imperf.map((e) => stem + e),
    fut: FUT.map((e) => toFut + e),
    cond: COND.map((e) => toFut + e),
    subj,
    subjImpf: subjImpfFrom(praet[5]),
    imp: [DASH, tu, subj[2], subj[3], `${plainInf.slice(0, -1)}d`, subj[5]],
    ger: join(E.ger, "ger"),
    p2: join(E.p2, "p2"),
  };
}

// tuvieron → tuviera … tuviéramos … tuvieran: the nosotros form accents the vowel before -ramos.
function subjImpfFrom(ellos) {
  if (isDash(ellos)) return dashes();
  const st = ellos.slice(0, -3);
  const i = st.length - 1;
  const stressed = st.slice(0, i) + "áéíóú"["aeiou".indexOf(st[i])] + st.slice(i + 1);
  return [`${st}ra`, `${st}ras`, `${st}ra`, `${stressed}ramos`, `${st}rais`, `${st}ran`];
}

// The -se alternative of an imperfect subjunctive form: hablara → hablase, habláramos → hablásemos.
export const seForm = (f) => f.replace(/ra(s|mos|is|n)?$/, (_, end = "") => `se${end}`);

// --- pronouns attached to the end of a form, and the accent that follows --------------------

// The vowel groups of a word, one per syllable: strong + strong split, a weak vowel joins unless
// it carries the accent. The silent u of que/qui/gue/gui is not a vowel.
function nuclei(word) {
  const out = [];
  let cur = null;
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    const silentU = c === "u" && /[qg]/.test(word[i - 1] ?? "") && /[eéií]/.test(word[i + 1] ?? "");
    if (!/[aeiouáéíóú]/.test(c) || silentU) { cur = null; continue; }
    const strong = /[aeoáéó]/.test(c);
    const accWeak = /[íú]/.test(c);
    const prev = cur && word[cur[cur.length - 1]];
    const breaks = cur && ((strong && /[aeoáéó]/.test(prev)) || accWeak || /[íú]/.test(prev));
    if (!cur || breaks) { cur = [i]; out.push(cur); } else cur.push(i);
  }
  return out;
}

/** form + pronoun, accented where the stress now needs it: levanta + te → levántate, pon + te → ponte. */
export function enclitic(form, clitic, drop = 0) {
  const groups = nuclei(form);
  const written = groups.findIndex((g) => g.some((i) => /[áéíóú]/.test(form[i])));
  const defaultIdx = /[aeiouns]$/.test(form) ? Math.max(groups.length - 2, 0) : groups.length - 1;
  const stressed = written >= 0 ? written : defaultIdx;
  const bare = unaccent(form);
  const stem = drop ? bare.slice(0, -drop) : bare;
  if (groups.length - 1 - stressed < 1) return stem + clitic;
  const g = groups[stressed];
  const pos = g.find((i) => /[aeo]/.test(bare[i])) ?? g[g.length - 1];
  return stem.slice(0, pos) + "áéíóú"["aeiou".indexOf(bare[pos])] + stem.slice(pos + 1) + clitic;
}

function encliticImp(imp) {
  return imp.map((f, i) => {
    if (isDash(f)) return f;
    if (i === 1) return enclitic(f, "te");
    if (i === 2 || i === 5) return enclitic(f, "se");
    if (i === 3) return enclitic(f, "nos", 1);
    return f.endsWith("id") ? `${f.slice(0, -2)}íos` : `${f.slice(0, -1)}os`; // vestíos, levantaos
  });
}

// --- one verb, all tenses --------------------------------------------------------------------

// The finished tenses from plain-verb forms: pronouns added, compound and negative forms built.
function assemble(p, base, ownImp) {
  const pr = (i) => (p.pronominal ? `${CLITICS[i]} ` : "");
  const wrap = (list) => list.map((f, i) => (isDash(f) ? f : pr(i) + f));
  const compound = (aux, gone) => aux.map((a, i) => (gone ? DASH : `${pr(i)}${a} ${base.p2}`));
  const imp = ownImp ?? (p.pronominal ? encliticImp(base.imp) : base.imp);
  return {
    praes: wrap(base.praes),
    praet: wrap(base.praet),
    perf: compound(AUX.perf),
    imperf: wrap(base.imperf),
    fut: wrap(base.fut),
    cond: wrap(base.cond),
    subj: wrap(base.subj),
    subjImpf: wrap(base.subjImpf),
    imp,
    impNeg: base.subj.map((f, i) => (i === 0 || isDash(f) || isDash(imp[i]) ? DASH : `no ${pr(i)}${f}`)),
    plusc: compound(AUX.plusc),
    futPerf: compound(AUX.futPerf, base.fut.every(isDash)),
    condPerf: compound(AUX.condPerf, base.cond.every(isDash)),
    subjPerf: compound(AUX.subjPerf),
    subjPlusc: compound(AUX.subjPlusc),
    ger: p.pronominal ? enclitic(base.ger, "se") : base.ger,
    p2: base.p2,
  };
}

// The plain verb's forms: stored tenses first, then what follows from them.
function plainForms(p, stored) {
  const reg = patternForms(p.plain);
  const get = (k) => (stored[k] ? split(stored[k]) : null);
  const praes = get("praes");
  const praet = get("praet") ?? reg.praet;
  const fut = get("fut");
  // tengo → tenga. Only a yo form in -o can carry the subjunctive; stem-changing verbs store theirs.
  const fromYo = praes?.[0].endsWith("o")
    ? ENDINGS[p.type].subj.map((e) => praes[0].slice(0, -1) + e)
    : null;
  const subj = get("subj") ?? fromYo ?? reg.subj;
  const cond = get("cond") ?? (fut ? (fut.every(isDash) ? dashes() : COND.map((e) => fut[0].slice(0, -1) + e)) : reg.cond);
  const tu = praes ? praes[1].replace(/s$/, "") : reg.imp[1];
  return {
    praes: praes ?? reg.praes,
    praet,
    imperf: get("imperf") ?? reg.imperf,
    fut: fut ?? reg.fut,
    cond,
    subj,
    subjImpf: get("subjImpf") ?? subjImpfFrom(praet[5]),
    imp: get("imp") ?? [DASH, tu, subj[2], subj[3], reg.imp[4], subj[5]],
    ger: stored.ger ?? reg.ger,
    p2: stored.p2 ?? reg.p2,
  };
}

const safeId = (inf) => unaccent(inf.toLowerCase()).replace(/\s+/g, "-");

/** One entry of verbtabellen.json → its rows. `byInf`: the file's verbs, for pronominal verbs. */
export function buildVerb(v, byInf = new Map()) {
  const p = parseInf(v.inf);
  const parent = p.pronominal ? byInf.get(p.plain) : null;
  const stored = {};
  for (const k of [...STORED_TENSES, "ger", "p2"]) {
    if (parent?.[k] !== undefined) stored[k] = parent[k];
    if (v[k] !== undefined) stored[k] = v[k];
  }
  const ownImp = p.pronominal && v.imp ? split(v.imp) : null;
  const forms = assemble(p, plainForms(p, stored), ownImp);
  const pattern = assemble(p, patternForms(p.plain, false));
  const rows = PERSONS.map((pron, i) => {
    const row = { pron, person: i };
    for (const k of ROW_TENSES) {
      const f = forms[k][i];
      row[k] = { f, x: !isDash(f) && f !== pattern[k][i] };
    }
    if (!isDash(row.subjImpf.f)) row.subjImpf.alt = seForm(row.subjImpf.f);
    row.subjPlusc.alt = row.subjPlusc.f.replace(AUX.subjPlusc[i], seForm(AUX.subjPlusc[i]));
    return row;
  });
  const every = rows.flatMap((r) => ROW_TENSES.filter((k) => !/^(plusc|futPerf|condPerf|subjPerf|subjPlusc)$/.test(k)).flatMap((k) => [r[k].f, r[k].alt]));
  const list = [...every, forms.ger, forms.p2].filter((f) => f && !isDash(f));
  return {
    ...v,
    id: safeId(v.inf),
    plain: p.plain,
    pronominal: p.pronominal,
    ger: forms.ger,
    p2: forms.p2,
    gerX: forms.ger !== pattern.ger,
    p2X: forms.p2 !== pattern.p2,
    // Tense without a full set of forms (haber has no imperative, soler no future).
    defective: rows.some((r) => ROW_TENSES.some((k) => r.person > 0 && isDash(r[k].f))),
    rows,
    // What the search lens looks a verb up by (the simple tenses, perfecto, gerund, participle).
    forms: [...new Set(list)],
  };
}

export function buildAll(list) {
  const byInf = new Map(list.map((v) => [v.inf, v]));
  return list.map((v) => buildVerb(v, byInf));
}

// The bare pattern, as a learner would guess it: the wrong options in quizzes (tenió, hacido).
const wrapPattern = (inf, forms) => (parseInf(inf).pronominal ? forms.map((f, i) => `${CLITICS[i]} ${f}`) : forms);
export const regularPraes = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).praes);
export const regularPraet = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).praet);
export const regularP2 = (inf) => patternForms(parseInf(inf).plain, false).p2;
