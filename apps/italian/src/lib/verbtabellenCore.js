// The Italian conjugation generator behind the verb tables (docs/content-plan.md §4.1).
//
// Plain ESM with no Vite imports, so scripts/check-verbtabellen.mjs and the conjugation trainer
// run the same code as the page. Data lives in src/data/verbtabellen.json; the page reads it
// through src/lib/verbtabellen.js.
//
// A verb stores only the tenses it cannot derive. Everything else follows from:
//   praes, praet, rem, fut, ger, p2   the regular endings of -are / -ere / -ire (and -ire with
//                                     -isc-), with the spelling rules (cerchi, mangi, comincerò)
//   cond                              the stem of a stored `fut` (andrò → andrei)
//   subj                              the io form of a stored `praes` (vengo → venga); noi/voi
//                                     from the noi form of the presente (veniamo, veniate)
//   subjImpf                          the imperfetto (parlavo → parlassi, facevo → facessi)
//   imp                               tu from the presente (parla / vendi), Lei and loro from the
//                                     congiuntivo, noi and voi from the presente
//   impNeg                            tu: non + infinitive; the others: non + the affirmative
//   compound tenses                   avere or essere (field `aux`) + participio passato; with
//                                     essere the participle agrees: sono andato/a, siamo andati/e
// A reflexive or pronominal verb (alzarsi, andarsene) adds its pronoun to the forms of the plain
// verb (mi alzo, me ne vado), always takes essere, and inherits the stored tenses of its plain
// verb when that verb is in the file (andarsene → andare).
//
// Each form carries `x`: it differs from what the bare pattern would give, spelling changes
// included (cerchi, mangi), so the table highlights what a learner has to notice.
// The passato remoto is stored under `rem`.

export const PERSONS = ["io", "tu", "lui/lei/Lei", "noi", "voi", "loro/Loro"];
/** The index of "voi". Italian has no variety that drops it; the trainer keeps the name. */
export const VOSOTROS = 4;
export const DASH = "–";

/** Tenses a verb may store as a comma list of six forms. */
export const STORED_TENSES = ["praes", "praet", "rem", "fut", "cond", "subj", "subjImpf", "imp"];
/** Every tense in a table row, in the order the page lists them. */
export const ROW_TENSES = [
  "praes", "praet", "perf", "rem", "fut", "cond", "subj", "subjImpf", "imp", "impNeg",
  "plusc", "futPerf", "condPerf", "subjPerf", "subjPlusc",
];
const COMPOUND = ["perf", "plusc", "futPerf", "condPerf", "subjPerf", "subjPlusc"];

const CLITICS = ["mi", "ti", "si", "ci", "vi", "si"];
const CLITICS_NE = ["me ne", "te ne", "se ne", "ce ne", "ve ne", "se ne"];
// The auxiliaries in the tenses that have a compound form: avere / essere.
const AUX = {
  avere: {
    perf: ["ho", "hai", "ha", "abbiamo", "avete", "hanno"],
    plusc: ["avevo", "avevi", "aveva", "avevamo", "avevate", "avevano"],
    futPerf: ["avrò", "avrai", "avrà", "avremo", "avrete", "avranno"],
    condPerf: ["avrei", "avresti", "avrebbe", "avremmo", "avreste", "avrebbero"],
    subjPerf: ["abbia", "abbia", "abbia", "abbiamo", "abbiate", "abbiano"],
    subjPlusc: ["avessi", "avessi", "avesse", "avessimo", "aveste", "avessero"],
  },
  essere: {
    perf: ["sono", "sei", "è", "siamo", "siete", "sono"],
    plusc: ["ero", "eri", "era", "eravamo", "eravate", "erano"],
    futPerf: ["sarò", "sarai", "sarà", "saremo", "sarete", "saranno"],
    condPerf: ["sarei", "saresti", "sarebbe", "saremmo", "sareste", "sarebbero"],
    subjPerf: ["sia", "sia", "sia", "siamo", "siate", "siano"],
    subjPlusc: ["fossi", "fossi", "fosse", "fossimo", "foste", "fossero"],
  },
};
const COND = ["ei", "esti", "ebbe", "emmo", "este", "ebbero"];
const FUT = ["ò", "ai", "à", "emo", "ete", "anno"]; // after the -er- / -ir- stem: parler + ò
const IMPF = ["vo", "vi", "va", "vamo", "vate", "vano"];
const ENDINGS = {
  are: {
    praes: ["o", "i", "a", "iamo", "ate", "ano"],
    rem: ["ai", "asti", "ò", "ammo", "aste", "arono"],
    subj: ["i", "i", "i", "iamo", "iate", "ino"],
    impf: "a", ger: "ando", p2: "ato", fut: "e",
  },
  ere: {
    praes: ["o", "i", "e", "iamo", "ete", "ono"],
    rem: ["ei", "esti", "é", "emmo", "este", "erono"],
    subj: ["a", "a", "a", "iamo", "iate", "ano"],
    impf: "e", ger: "endo", p2: "uto", fut: "e",
  },
  ire: {
    praes: ["o", "i", "e", "iamo", "ite", "ono"],
    rem: ["ii", "isti", "ì", "immo", "iste", "irono"],
    subj: ["a", "a", "a", "iamo", "iate", "ano"],
    impf: "i", ger: "endo", p2: "ito", fut: "i",
  },
};
// -isc- verbs: the stem takes -isc- in io, tu, lui and loro (finisco, finisci, finisce, finiscono).
const ISC_PERSONS = new Set([0, 1, 2, 5]);

const isDash = (f) => f === DASH;
const dashes = () => Array(6).fill(DASH);
const split = (s) => s.split(",").map((f) => f.trim());

/** Infinitive → its parts. alzarsi: plain alzare, type are, stem alz. andarsene: plain andare, ne. */
export function parseInf(inf) {
  const ne = /sene$/.test(inf);
  const pronominal = ne || /si$/.test(inf);
  const plain = ne ? `${inf.slice(0, -4)}e` : pronominal ? `${inf.slice(0, -2)}e` : inf;
  const type = plain.endsWith("are") ? "are" : plain.endsWith("ire") ? "ire" : "ere";
  // porre, condurre, trarre: the stem keeps its r (the generator is only a fallback for these).
  const stem = /[aei]re$/.test(plain) ? plain.slice(0, -3) : plain.slice(0, -2);
  return { inf, pronominal, ne, plain, type, stem };
}

// Spelling keeps the sound of the stem's last consonant: cerc-i → cerchi, mangi-iamo → mangiamo.
function join(stem, ending, type) {
  if (type !== "are") return stem + ending;
  const first = ending[0];
  if (/[ie]/.test(first)) {
    if (/[cg]$/.test(stem)) return `${stem}h${ending}`; // cercare, pagare
    if (/[cg]i$/.test(stem) || /[^aeiou]i$/.test(stem)) {
      return stem.slice(0, -1) + ending; // mangiare, cominciare, studiare
    }
  }
  return stem + ending;
}

/**
 * The forms of the plain verb from its ending alone: every stored tense plus `ger` and `p2`.
 * `spelled: false` gives the bare pattern, which is what `x` compares against and what a learner
 * wrongly guesses (cerco → cerci, mangii); `spelled: true` applies the spelling rules.
 * `isc`: an -ire verb with -isc-.
 */
export function patternForms(plainInf, spelled = true, isc = false) {
  const { stem, type } = parseInf(plainInf);
  const E = ENDINGS[type];
  const j = (ending) => (spelled ? join(stem, ending, type) : stem + ending);
  // -isc-: io, tu, lui and loro take stem + isc (finisco); noi and voi do not (finiamo, finite).
  const build = (endings) => endings.map((e, i) => (isc && ISC_PERSONS.has(i) ? `${stem}isc${e}` : j(e)));
  const praes = build(E.praes);
  const subj = build(E.subj);
  const praet = IMPF.map((e) => stem + E.impf + e);
  const futStem = j(`${E.fut}r`);
  return {
    praes,
    praet,
    rem: E.rem.map(j),
    fut: FUT.map((e) => futStem + e),
    cond: COND.map((e) => futStem + e),
    subj,
    subjImpf: subjImpfFrom(praet),
    imp: [DASH, type === "are" ? praes[2] : praes[1], subj[2], praes[3], praes[4], subj[5]],
    ger: stem + E.ger,
    p2: stem + E.p2,
  };
}

// parlavo → parlassi, facevo → facessi: the imperfetto without -vo, plus -ssi …
function subjImpfFrom(praet) {
  if (isDash(praet[0])) return dashes();
  const st = praet[0].slice(0, -2);
  return [`${st}ssi`, `${st}ssi`, `${st}sse`, `${st}ssimo`, `${st}ste`, `${st}ssero`];
}

// The participle with its agreement: andato/a (singular), andati/e (plural). Forms in -o only.
const agree = (p2, person) => {
  if (!p2.endsWith("o")) return p2;
  return person === 3 || person === 4 || person === 5 ? `${p2.slice(0, -1)}i/e` : `${p2}/a`;
};

// --- one verb, all tenses --------------------------------------------------------------------

// The finished tenses from plain-verb forms: pronouns added, compound and negative forms built.
function assemble(p, base, aux, ownImp) {
  const clitics = p.ne ? CLITICS_NE : CLITICS;
  const pr = (i) => (p.pronominal ? `${clitics[i]} ` : "");
  const wrap = (list) => list.map((f, i) => (isDash(f) ? f : pr(i) + f));
  // avere / essere: the first is the form shown, the second the alternative (`alt`).
  const auxes = aux === "avere/essere" ? ["avere", "essere"] : [aux];
  const compound = (k, which = auxes[0]) =>
    AUX[which][k].map((a, i) => `${pr(i)}${a} ${which === "essere" ? agree(base.p2, i) : base.p2}`);
  const compoundAlt = (k) => (auxes.length > 1 ? compound(k, "essere") : null);
  const imp = ownImp ?? (p.pronominal ? encliticImp(base.imp) : base.imp);
  // Negative tu: non + infinitive (non parlare, non alzarti); the others: non + the affirmative.
  const tuNeg = p.pronominal ? `${p.plain.slice(0, -1)}${p.ne ? "tene" : "ti"}` : p.plain;
  const impNeg = imp.map((f, i) => (i === 0 || isDash(f) ? DASH : i === 1 ? `non ${tuNeg}` : `non ${f}`));
  const out = {
    praes: wrap(base.praes),
    praet: wrap(base.praet),
    rem: wrap(base.rem),
    fut: wrap(base.fut),
    cond: wrap(base.cond),
    subj: wrap(base.subj),
    subjImpf: wrap(base.subjImpf),
    imp,
    impNeg,
    ger: p.pronominal ? `${base.ger}${p.ne ? "sene" : "si"}` : base.ger,
    p2: base.p2,
    alt: {},
  };
  for (const k of COMPOUND) {
    out[k] = compound(k);
    const alt = compoundAlt(k);
    if (alt) out.alt[k] = alt;
  }
  return out;
}

// alzati, si alzi, alziamoci, alzatevi, si alzino. A verb with ne (andarsene) stores its own.
function encliticImp(imp) {
  return imp.map((f, i) => {
    if (isDash(f)) return f;
    if (i === 1) return `${f}ti`;
    if (i === 2 || i === 5) return `si ${f}`;
    return `${f}${i === 3 ? "ci" : "vi"}`;
  });
}

// The plain verb's forms: stored tenses first, then what follows from them.
function plainForms(p, stored, isc) {
  const reg = patternForms(p.plain, true, isc);
  const get = (k) => (stored[k] ? split(stored[k]) : null);
  const praes = get("praes") ?? reg.praes;
  const praet = get("praet") ?? reg.praet;
  const fut = get("fut");
  // vengo → venga … veniamo → veniate. Only an io form in -o can carry the congiuntivo.
  let fromIo = null;
  if (get("praes") && praes[0].endsWith("o")) {
    const st = praes[0].slice(0, -1);
    // The -are verbs that store their presente (andare, fare, dare, stare) store their congiuntivo too.
    const e = ENDINGS.ere.subj;
    fromIo = [st + e[0], st + e[1], st + e[2], praes[3], `${praes[3].slice(0, -2)}te`, st + e[5]];
  }
  const subj = get("subj") ?? fromIo ?? reg.subj;
  const cond = get("cond") ?? (fut ? fut.map((_, i) => `${fut[0].slice(0, -1)}${COND[i]}`) : reg.cond);
  const tu = get("praes") ? (p.type === "are" ? praes[2] : praes[1]) : reg.imp[1];
  return {
    praes,
    praet,
    rem: get("rem") ?? reg.rem,
    fut: fut ?? reg.fut,
    cond,
    subj,
    subjImpf: get("subjImpf") ?? subjImpfFrom(praet),
    imp: get("imp") ?? [DASH, tu, subj[2], praes[3], praes[4], subj[5]],
    ger: stored.ger ?? reg.ger,
    p2: stored.p2 ?? reg.p2,
  };
}

const unaccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
const safeId = (inf) => unaccent(inf.toLowerCase()).replace(/\s+/g, "-");

/** The auxiliary of a table entry: stored, else essere for pronominal verbs, else avere. */
export const auxOf = (v) => v.aux ?? (parseInf(v.inf).pronominal ? "essere" : "avere");
const iscOf = (v) => v.isc ?? v.group === "isc";

/** One entry of verbtabellen.json → its rows. `byInf`: the file's verbs, for pronominal verbs. */
export function buildVerb(v, byInf = new Map()) {
  const p = parseInf(v.inf);
  const parent = p.pronominal ? byInf.get(p.plain) : null;
  const stored = {};
  for (const k of [...STORED_TENSES, "ger", "p2"]) {
    if (parent?.[k] !== undefined && k !== "imp") stored[k] = parent[k];
    if (v[k] !== undefined) stored[k] = v[k];
  }
  const isc = iscOf(v) || (parent ? iscOf(parent) : false);
  const aux = auxOf(v);
  const ownImp = p.pronominal && v.imp ? split(v.imp) : null;
  const forms = assemble(p, plainForms(p, stored, isc), aux, ownImp);
  const pattern = assemble(p, patternForms(p.plain, false, isc), aux === "avere/essere" ? "avere" : aux);
  const rows = PERSONS.map((pron, i) => {
    const row = { pron, person: i };
    for (const k of ROW_TENSES) {
      const f = forms[k][i];
      row[k] = { f, x: !isDash(f) && f !== pattern[k][i] };
      if (forms.alt[k]) row[k].alt = forms.alt[k][i];
    }
    return row;
  });
  const every = rows.flatMap((r) => ROW_TENSES.filter((k) => !COMPOUND.slice(1).includes(k)).flatMap((k) => [r[k].f, r[k].alt]));
  const list = [...every, forms.ger, forms.p2].filter((f) => f && !isDash(f));
  return {
    ...v,
    id: safeId(v.inf),
    plain: p.plain,
    pronominal: p.pronominal,
    aux,
    isc,
    ger: forms.ger,
    p2: forms.p2,
    gerX: forms.ger !== pattern.ger,
    p2X: forms.p2 !== pattern.p2,
    // A verb without a full set of forms (potere, volere and dovere have no imperative).
    defective: rows.some((r) => ROW_TENSES.some((k) => r.person > 0 && isDash(r[k].f))),
    rows,
    // What the search lens looks a verb up by (the simple tenses, passato prossimo, gerund, participle).
    forms: [...new Set(list)],
  };
}

export function buildAll(list) {
  const byInf = new Map(list.map((v) => [v.inf, v]));
  return list.map((v) => buildVerb(v, byInf));
}

// The bare pattern, as a learner would guess it: the wrong options in quizzes (cerco → cerci).
const wrapPattern = (inf, forms) => {
  const p = parseInf(inf);
  const c = p.ne ? CLITICS_NE : CLITICS;
  return p.pronominal ? forms.map((f, i) => `${c[i]} ${f}`) : forms;
};
export const regularPraes = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).praes);
export const regularPraet = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).praet);
export const regularP2 = (inf) => patternForms(parseInf(inf).plain, false).p2;
