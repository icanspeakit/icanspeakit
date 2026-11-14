// The European Portuguese conjugation generator behind the verb tables (docs/content-plan.md §4.1).
//
// Plain ESM with no Vite imports, so scripts/check-verbtabellen.mjs and the conjugation trainer
// run the same code as the page. Data lives in src/data/verbtabellen.json; the page reads it
// through src/lib/verbtabellen.js.
//
// A verb stores only the tenses it cannot derive. Everything else follows from:
//   imperf, fut, praet, ger, p2   the regular endings, with spelling rules (fiquei, cheguei, comecei)
//   cond                          the stem of `fut` (farei → faria)
//   subj                          the eu form of `praes` (tenho → tenha)
//   subjImpf, plusSimp, subjFut   the eles form of the perfeito (tiveram → tivesse, tivera, tiver)
//   infPers                       the infinitive (falar, falares, falar, falarmos, falardes, falarem)
//   imp                           tu from the present, você/nós/eles from subj, vós from the present
//   impNeg                        não + subj (não fales, não fale)
//   compound tenses               ter + p2 (pt-PT: tenho falado, tinha falado, terei falado …)
// A pronominal verb (levantar-se) adds its pronoun to the forms of the plain verb the way pt-PT
// does it: enclisis in the main clause (levanto-me), mesoclisis in future and conditional
// (levantar-me-ei), proclisis in the subjunctive (me levante) and after não (não me levanto).
// It takes the stored tenses of the plain verb when that is in the file (ir-se → ir).
//
// Each form carries `x`: it differs from what the bare pattern would give, spelling changes
// included (fiquei, saí), so the table highlights what a learner has to notice.

export const PERSONS = ["eu", "tu", "ele/ela/você", "nós", "vós", "eles/elas/vocês"];
/** Index of the vós row: old or formal, only read, never drilled by default (content-plan §4.1). */
export const VOSOTROS = 4;
export const VOS = VOSOTROS;
export const DASH = "–";

/** Tenses a verb may store as a comma list of six forms. */
export const STORED_TENSES = ["praes", "praet", "imperf", "fut", "cond", "subj", "subjImpf", "subjFut", "infPers", "imp"];
/** Every tense in a table row, in the order the page lists them. */
export const ROW_TENSES = [
  "praes", "praet", "perf", "imperf", "fut", "cond", "subj", "subjImpf", "subjFut", "imp", "impNeg", "infPers",
  "plusc", "plusSimp", "futPerf", "condPerf", "subjPerf", "subjPlusc", "subjFutPerf",
];
/** Tenses that exist only as compound (ter + participle). */
export const COMPOUND_TENSES = ["perf", "plusc", "futPerf", "condPerf", "subjPerf", "subjPlusc", "subjFutPerf"];

const CLITICS = ["me", "te", "se", "nos", "vos", "se"];
const AUX = {
  perf: ["tenho", "tens", "tem", "temos", "tendes", "têm"],
  plusc: ["tinha", "tinhas", "tinha", "tínhamos", "tínheis", "tinham"],
  subjPerf: ["tenha", "tenhas", "tenha", "tenhamos", "tenhais", "tenham"],
  subjPlusc: ["tivesse", "tivesses", "tivesse", "tivéssemos", "tivésseis", "tivessem"],
  subjFutPerf: ["tiver", "tiveres", "tiver", "tivermos", "tiverdes", "tiverem"],
};
const FUT = ["ei", "ás", "á", "emos", "eis", "ão"];
const COND = ["ia", "ias", "ia", "íamos", "íeis", "iam"];
const ENDINGS = {
  ar: {
    praes: ["o", "as", "a", "amos", "ais", "am"],
    praet: ["ei", "aste", "ou", "ámos", "astes", "aram"],
    imperf: ["ava", "avas", "ava", "ávamos", "áveis", "avam"],
    subj: ["e", "es", "e", "emos", "eis", "em"],
    ger: "ando", p2: "ado",
  },
  er: {
    praes: ["o", "es", "e", "emos", "eis", "em"],
    praet: ["i", "este", "eu", "emos", "estes", "eram"],
    imperf: COND,
    subj: ["a", "as", "a", "amos", "ais", "am"],
    ger: "endo", p2: "ido",
  },
  ir: {
    praes: ["o", "es", "e", "imos", "is", "em"],
    praet: ["i", "iste", "iu", "imos", "istes", "iram"],
    imperf: COND,
    subj: ["a", "as", "a", "amos", "ais", "am"],
    ger: "indo", p2: "ido",
  },
};

const isDash = (f) => f === DASH;
const dashes = () => Array(6).fill(DASH);
const split = (s) => s.split(",").map((f) => f.trim());
const VOWEL_ACUTE = { a: "á", e: "é", i: "í", o: "ó", u: "ú" };
const unaccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
// Accents that only mark stress; the cedilla and tilde stay (unaccent would strip them).
const stripStress = (s) => s.replace(/[áàâ]/g, "a").replace(/[éêè]/g, "e").replace(/[íì]/g, "i").replace(/[óôò]/g, "o").replace(/[úù]/g, "u");

/** Infinitive → its parts. levantar-se: plain levantar, type ar, stem levant. pôr: type ir, stem p. */
export function parseInf(inf) {
  const pronominal = /-se$/.test(inf);
  const plain = pronominal ? inf.slice(0, -3) : inf;
  const type = plain.endsWith("ar") ? "ar" : plain.endsWith("er") ? "er" : "ir";
  return { inf, pronominal, plain, type, stem: plain.slice(0, -2) };
}

// Verbs with a vowel just before -er/-ir (sair, cair, construir): hiatus, so the i is stressed.
const isHiatus = (stem, type) => type !== "ar" && /[aeou]$/.test(stem) && !/[gq]u$/.test(stem);

// Spelling keeps the sound of the stem's last consonant: fic-ei → fiquei, cheg-ei → cheguei,
// começ-ei → comecei, esqueç-o, fuj-o.
function respell(stem, ending, type) {
  const v = stripStress(ending)[0];
  if (type === "ar" && v === "e") {
    if (stem.endsWith("c")) return `${stem.slice(0, -1)}qu`;
    if (stem.endsWith("g")) return `${stem}u`;
    if (stem.endsWith("ç")) return `${stem.slice(0, -1)}c`;
  }
  if (type !== "ar" && (v === "a" || v === "o")) {
    if (stem.endsWith("gu")) return stem.slice(0, -1);
    if (stem.endsWith("g")) return `${stem.slice(0, -1)}j`;
    if (stem.endsWith("c")) return `${stem.slice(0, -1)}ç`;
  }
  return stem;
}

// The vowel-before-the-ending rule: saí, saíste, saiu, saímos, saístes, saíram, saía, saído; saindo.
function hiatusEnding(ending, tense) {
  if (tense === "praet") return { i: "í", iste: "íste", iu: "iu", imos: "ímos", istes: "ístes", iram: "íram" }[ending] ?? ending;
  if (tense === "imperf") return ending.replace(/^i/, "í");
  if (tense === "p2") return "ído";
  if (tense === "praes") return { imos: "ímos", is: "ís" }[ending] ?? ending;
  return ending;
}

/**
 * The forms of the plain verb from its ending alone, for every stored tense plus `ger` and `p2`.
 * `spelled: false` gives the bare pattern, which is what `x` compares against and what a learner
 * wrongly guesses (fazi, fazido); `spelled: true` applies the spelling rules and is what a verb
 * without a stored tense uses.
 */
export function patternForms(plainInf, spelled = true) {
  const { stem, type } = parseInf(plainInf);
  const E = ENDINGS[type];
  const hiatus = spelled && isHiatus(stem, type);
  const join = (ending, tense) => {
    if (!spelled) return stem + ending;
    const st = respell(stem, ending, type);
    return st + (hiatus ? hiatusEnding(ending, tense) : ending);
  };
  const praes = E.praes.map((e) => join(e, "praes"));
  const praet = E.praet.map((e) => join(e, "praet"));
  const subj = E.subj.map((e) => join(e, "subj"));
  const tu = praes[2];
  return {
    praes,
    praet,
    imperf: E.imperf.map((e) => (hiatus ? hiatusEnding(e, "imperf") : e)).map((e) => stem + e),
    fut: FUT.map((e) => plainInf + e),
    cond: COND.map((e) => plainInf + e),
    subj,
    subjImpf: subjImpfFrom(praet),
    subjFut: subjFutFrom(praet),
    infPers: infPersFrom(plainInf),
    plusSimp: plusSimpFrom(praet),
    imp: [DASH, tu, subj[2], subj[3], `${praes[4].slice(0, -1)}`, subj[5]],
    ger: join(E.ger, "ger"),
    p2: join(E.p2, "p2"),
  };
}

// The eles form of the perfeito, without -ram: tiveram → tive, falaram → fala, saíram → saí.
const perfStem = (praet) => (isDash(praet[5]) ? null : praet[5].replace(/ram$/, ""));

// The last vowel of the stem takes the accent before -ssemos / -ramos: faláramos, comêssemos,
// tivéssemos, fôssemos. A stem that already carries one keeps it (saíssemos).
function accentStem(st, closedE) {
  const i = st.length - 1;
  if (/[áéíóúâêô]/.test(st[i])) return st;
  const c = st[i];
  const acc = c === "e" && closedE ? "ê" : c === "o" ? "ô" : VOWEL_ACUTE[c];
  return acc ? st.slice(0, i) + acc + st.slice(i + 1) : st;
}

// -er verbs with a regular perfeito in -i (comi, li, cri) close the e: comêssemos; the strong ones
// (tive, fiz, deu → dei) open it: tivéssemos, fizéssemos, déssemos. Decided from the eu form.
const closedE = (euPraet) => /[^aeiou]i$/.test(euPraet);

function subjImpfFrom(praet) {
  const st = perfStem(praet);
  if (!st) return dashes();
  const a = accentStem(st, closedE(praet[0]));
  return [`${st}sse`, `${st}sses`, `${st}sse`, `${a}ssemos`, `${a}sseis`, `${st}ssem`];
}

function plusSimpFrom(praet) {
  const st = perfStem(praet);
  if (!st) return dashes();
  const a = accentStem(st, closedE(praet[0]));
  return [`${st}ra`, `${st}ras`, `${st}ra`, `${a}ramos`, `${a}reis`, `${st}ram`];
}

// Hiatus verbs write the stressed i only where it is stressed: sair, saíres, sair, sairmos, sairdes, saírem.
function futSubjShape(st, accented) {
  const plain = stripStress(st);
  const acc = accented ?? plain;
  return [`${plain}r`, `${acc}res`, `${plain}r`, `${plain}rmos`, `${plain}rdes`, `${acc}rem`];
}

function subjFutFrom(praet) {
  const st = perfStem(praet);
  if (!st) return dashes();
  if (/[aeou]í$/.test(st)) return futSubjShape(st, st);
  return [`${st}r`, `${st}res`, `${st}r`, `${st}rmos`, `${st}rdes`, `${st}rem`];
}

function infPersFrom(inf) {
  const { stem, type } = parseInf(inf);
  if (isHiatus(stem, type)) return futSubjShape(`${stem}í`, `${stem}í`);
  return [inf, `${inf}es`, inf, `${inf}mos`, `${inf}des`, `${inf}em`];
}

// --- pronouns attached to a form, the pt-PT way ------------------------------------------------

/** form + clitic with the hyphen; before nos the final -s drops: levantamos + nos → levantamo-nos. */
export function enclitic(form, clitic) {
  const f = clitic === "nos" && form.endsWith("s") ? form.slice(0, -1) : form;
  return `${f}-${clitic}`;
}

// Future and conditional take the pronoun inside: levantar-me-ei, levantar-nos-iam.
function mesoclitic(stem, ending, clitic) {
  return `${stem}-${clitic}-${ending}`;
}

function wrapEncl(list) {
  return list.map((f, i) => (isDash(f) ? f : enclitic(f, CLITICS[i])));
}
function wrapProcl(list) {
  return list.map((f, i) => (isDash(f) ? f : `${CLITICS[i]} ${f}`));
}

// --- one verb, all tenses --------------------------------------------------------------------

// The finished tenses from plain-verb forms: pronouns added, compound and negative forms built.
function assemble(p, base, ownImp) {
  const pron = p.pronominal;
  const encl = (list) => (pron ? wrapEncl(list) : list);
  const procl = (list) => (pron ? wrapProcl(list) : list);
  const futStem = (list, n) => (isDash(list[0]) ? null : list[0].slice(0, -n));
  const fs = futStem(base.fut, 2);
  const cs = futStem(base.cond, 2);
  const meso = (stem, endings) =>
    pron ? endings.map((e, i) => mesoclitic(stem, e, CLITICS[i])) : endings.map((e) => stem + e);
  const fut = fs === null ? dashes() : meso(fs, FUT);
  const cond = cs === null ? dashes() : meso(cs, COND);
  // Compound tenses: the auxiliary (ter) carries the pronoun, the participle stays bare.
  const compound = (tense, shape) => AUX[tense].map((a, i) => {
    if (shape === "encl") return pron ? `${enclitic(a, CLITICS[i])} ${base.p2}` : `${a} ${base.p2}`;
    return pron ? `${CLITICS[i]} ${a} ${base.p2}` : `${a} ${base.p2}`;
  });
  // ter-me-ei levantado, ter-me-ia levantado
  const terFut = (endings) => endings.map((e, i) => (pron ? `${mesoclitic("ter", e, CLITICS[i])} ${base.p2}` : `ter${e} ${base.p2}`));
  const imp = ownImp ?? (pron ? encliticImp(base.imp) : base.imp);
  return {
    praes: encl(base.praes),
    praet: encl(base.praet),
    perf: compound("perf", "encl"),
    imperf: encl(base.imperf),
    fut,
    cond,
    subj: procl(base.subj),
    subjImpf: procl(base.subjImpf),
    subjFut: procl(base.subjFut),
    imp,
    impNeg: base.subj.map((f, i) => (i === 0 || isDash(f) || isDash(imp[i]) ? DASH : `não ${pron ? `${CLITICS[i]} ` : ""}${f}`)),
    infPers: encl(base.infPers),
    plusc: compound("plusc", "encl"),
    plusSimp: encl(base.plusSimp),
    futPerf: terFut(FUT),
    condPerf: terFut(COND),
    subjPerf: compound("subjPerf", "procl"),
    subjPlusc: compound("subjPlusc", "procl"),
    subjFutPerf: compound("subjFutPerf", "procl"),
    ger: pron ? enclitic(base.ger, "se") : base.ger,
    p2: base.p2,
  };
}

function encliticImp(imp) {
  return imp.map((f, i) => (isDash(f) ? f : enclitic(f, CLITICS[i])));
}

// The plain verb's forms: stored tenses first, then what follows from them.
function plainForms(p, stored) {
  const reg = patternForms(p.plain);
  const get = (k) => (stored[k] ? split(stored[k]) : null);
  const praes = get("praes");
  const praet = get("praet") ?? reg.praet;
  const fut = get("fut");
  // tenho → tenha. Only an eu form in -o can carry the subjunctive; verbs like ser, saber store theirs.
  const fromEu = praes?.[0].endsWith("o")
    ? ENDINGS[p.type].subj.map((e) => praes[0].slice(0, -1) + e)
    : null;
  const subj = get("subj") ?? fromEu ?? reg.subj;
  // fut: farei → far + ia; a defective verb stores dashes.
  const cond = get("cond") ?? (fut ? (fut.every(isDash) ? dashes() : COND.map((e) => fut[0].slice(0, -2) + e)) : reg.cond);
  const tu = praes ? praes[2] : reg.imp[1];
  const vos = praes ? praes[4].slice(0, -1) : reg.imp[4];
  return {
    praes: praes ?? reg.praes,
    praet,
    imperf: get("imperf") ?? reg.imperf,
    fut: fut ?? reg.fut,
    cond,
    subj,
    subjImpf: get("subjImpf") ?? subjImpfFrom(praet),
    subjFut: get("subjFut") ?? subjFutFrom(praet),
    infPers: get("infPers") ?? infPersFrom(p.plain),
    plusSimp: plusSimpFrom(praet),
    imp: get("imp") ?? [DASH, tu, subj[2], subj[3], vos, subj[5]],
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
    return row;
  });
  const skipForList = new Set(["plusc", "futPerf", "condPerf", "subjPerf", "subjPlusc", "subjFutPerf"]);
  const every = rows.flatMap((r) => ROW_TENSES.filter((k) => !skipForList.has(k)).map((k) => r[k].f));
  const list = [...every, forms.ger, forms.p2, v.p2b].filter((f) => f && !isDash(f));
  return {
    ...v,
    id: safeId(v.inf),
    plain: p.plain,
    pronominal: p.pronominal,
    ger: forms.ger,
    p2: forms.p2,
    gerX: forms.ger !== pattern.ger,
    p2X: forms.p2 !== pattern.p2,
    // A tense without a full set of forms (poder has no imperative, haver no tu/vós command).
    defective: rows.some((r) => ROW_TENSES.some((k) => r.person > 0 && isDash(r[k].f))),
    rows,
    // What the search lens looks a verb up by (the simple tenses, perfeito composto, gerund, participle).
    forms: [...new Set(list)],
  };
}

export function buildAll(list) {
  const byInf = new Map(list.map((v) => [v.inf, v]));
  return list.map((v) => buildVerb(v, byInf));
}

// The bare pattern, as a learner would guess it: the wrong options in quizzes (fazi, fazido).
const wrapPattern = (inf, forms) => (parseInf(inf).pronominal ? wrapEncl(forms) : forms);
export const regularPraes = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).praes);
export const regularPraet = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).praet);
export const regularP2 = (inf) => patternForms(parseInf(inf).plain, false).p2;
