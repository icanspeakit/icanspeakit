// The French conjugation generator behind the verb tables (docs/content-plan.md §4.1).
//
// Plain ESM with no Vite imports, so scripts/check-verbtabellen.mjs and the conjugation trainer
// run the same code as the page. Data lives in src/data/verbtabellen.json; the page reads it
// through src/lib/verbtabellen.js.
//
// A verb stores only the tenses it cannot derive. Everything else follows from:
//   praes, praet, p2          the endings of its group: -er (parler), -ir (finir, with -iss-),
//                             -re (vendre); -ger/-cer keep their sound (mangeons, commençons)
//   imperf, ger               the nous form of the présent (finissons → finissais, finissant)
//   fut                       the infinitive (-re drops its e: vendrai)
//   cond                      the stem of the futur (aurai → aurais)
//   subj                      the ils form of the présent (prennent → prenne), nous and vous from
//                             the imparfait (prenions, preniez)
//   subjImpf                  the passé simple (parla → parlasse, parlât)
//   imp                       tu, nous, vous of the présent; -es drops its s (parle, va)
//   impNeg                    ne … pas around the imperative (n'ouvre pas, ne te lève pas)
//   compound tenses           avoir or être (`aux`) + participle; with être the participle shows
//                             its agreement: allé(e), allé(e)s
// A pronominal verb (se lever, s'en aller) adds its pronoun to the forms of the plain verb, and
// takes the stored tenses of that verb when it is in the file (s'appeler → appeler).
//
// `alt` (an object of stored tenses) holds accepted variants: je paye beside je paie, je m'assois
// beside je m'assieds, and 1990 spellings (il connait). The variant runs through the same rules,
// and every cell where it differs carries it as `alt`.
//
// Each form carries `x`: it differs from what the bare pattern of its group would give, spelling
// changes included (mangeons, achète), so the table highlights what a learner has to notice.
// In the je row, `el: true` marks a form that elides the pronoun: j'aime, j'ai parlé.

export const PERSONS = ["je", "tu", "il/elle/on", "nous", "vous", "ils/elles"];
/** French has no row a Canada mode would hide; kept for the trainer until `conjugation-trainer`. */
export const VOSOTROS = -1;
export const DASH = "–";

/** Tenses a verb may store as a comma list of six forms. */
export const STORED_TENSES = ["praes", "praet", "imperf", "fut", "cond", "subj", "subjImpf", "imp"];
/** Every tense in a table row, in the order the page lists them. */
export const ROW_TENSES = [
  "praes", "perf", "imperf", "praet", "plusc", "fut", "futPerf", "cond", "condPerf",
  "subj", "subjPerf", "subjImpf", "subjPlusc", "imp", "impNeg",
];
const COMPOUND = { perf: "praes", plusc: "imperf", futPerf: "fut", condPerf: "cond", subjPerf: "subj", subjPlusc: "subjImpf" };

const AUX = {
  avoir: {
    praes: ["ai", "as", "a", "avons", "avez", "ont"],
    imperf: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
    fut: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
    cond: ["aurais", "aurais", "aurait", "aurions", "auriez", "auraient"],
    subj: ["aie", "aies", "ait", "ayons", "ayez", "aient"],
    subjImpf: ["eusse", "eusses", "eût", "eussions", "eussiez", "eussent"],
  },
  être: {
    praes: ["suis", "es", "est", "sommes", "êtes", "sont"],
    imperf: ["étais", "étais", "était", "étions", "étiez", "étaient"],
    fut: ["serai", "seras", "sera", "serons", "serez", "seront"],
    cond: ["serais", "serais", "serait", "serions", "seriez", "seraient"],
    subj: ["sois", "sois", "soit", "soyons", "soyez", "soient"],
    subjImpf: ["fusse", "fusses", "fût", "fussions", "fussiez", "fussent"],
  },
};

const IMPERF = ["ais", "ais", "ait", "ions", "iez", "aient"];
const FUT = ["ai", "as", "a", "ons", "ez", "ont"];
const SUBJ = ["e", "es", "e", "ions", "iez", "ent"];
const ENDINGS = {
  er: { praes: ["e", "es", "e", "ons", "ez", "ent"], praet: ["ai", "as", "a", "âmes", "âtes", "èrent"], p2: "é" },
  ir: { praes: ["is", "is", "it", "issons", "issez", "issent"], praet: ["is", "is", "it", "îmes", "îtes", "irent"], p2: "i" },
  re: { praes: ["s", "s", "", "ons", "ez", "ent"], praet: ["is", "is", "it", "îmes", "îtes", "irent"], p2: "u" },
};
ENDINGS.oir = ENDINGS.re;

const CLITICS = ["me", "te", "se", "nous", "vous", "se"];
const CLITICS_EN = ["m'en", "t'en", "s'en", "nous en", "vous en", "s'en"];
const IMP_PRONOUN = { 1: "toi", 3: "nous", 4: "vous" };
const IMP_PRONOUN_EN = { 1: "t'en", 3: "nous-en", 4: "vous-en" };

const isDash = (f) => f === DASH;
const dashes = () => Array(6).fill(DASH);
const split = (s) => s.split(",").map((f) => f.trim());
export const unaccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
// A word that takes j', m', t', s', n' before it. Words with an h aspiré (je hais) are listed.
const H_ASPIRE = /^(ha[iï]|hurl|heurt|hiss|hach|hant|hasard|hât)/;
export const elides = (word) => /^[aeiouyâàäéèêëîïôöûùüœæ]/i.test(word) || (/^h/i.test(word) && !H_ASPIRE.test(word));

/** Infinitive → its parts. se lever: plain lever, type er, stem lev. s'en aller: en true. */
export function parseInf(inf) {
  const m = inf.match(/^(s'en |se |s')(.+)$/);
  const plain = m ? m[2] : inf;
  const type = plain.endsWith("er") ? "er" : plain.endsWith("oir") ? "oir" : plain.endsWith("ir") ? "ir" : "re";
  const stem = plain.slice(0, type === "oir" ? -3 : -2);
  return { inf, pronominal: !!m, en: m?.[1] === "s'en ", plain, type, stem };
}

// -ger and -cer keep the soft sound before a, â and o: mangeons, commençons, mangea.
function respell(stem, ending, type) {
  if (type !== "er" || !/^[aâo]/.test(ending)) return stem;
  if (stem.endsWith("g")) return `${stem}e`;
  if (stem.endsWith("c")) return `${stem.slice(0, -1)}ç`;
  return stem;
}
// …and lose it again before i: mangeons → mangions, commençons → commencions.
function beforeI(stem, ending) {
  if (!ending.startsWith("i")) return stem;
  if (stem.endsWith("ge")) return stem.slice(0, -1);
  if (stem.endsWith("ç")) return `${stem.slice(0, -1)}c`;
  return stem;
}

const nousStem = (praes) => (praes[3] && !isDash(praes[3]) && praes[3].endsWith("ons") ? praes[3].slice(0, -3) : null);
const imperfFrom = (praes) => {
  const st = nousStem(praes);
  return st ? IMPERF.map((e) => beforeI(st, e) + e) : dashes();
};
// tu of the imperative: parles → parle, ouvres → ouvre, vas → va; finis, vends stay.
const impTu = (tu) => (isDash(tu) ? tu : /es$/.test(tu) || tu === "vas" ? tu.slice(0, -1) : tu);
const impFrom = (praes) => [DASH, impTu(praes[1]), DASH, praes[3], praes[4], DASH];

// The subjunctive: ils stem + e, es, e, ent; nous and vous are those of the imparfait.
function subjFrom(praes, imperf) {
  const ils = praes[5];
  if (isDash(ils) || !ils.endsWith("ent")) return dashes();
  const st = ils.slice(0, -3);
  return SUBJ.map((e, i) => (i === 3 || i === 4 ? imperf[i] : st + e));
}

// From the il form of the passé simple: parla → parlasse, parlasses, parlât, parlassions …
function subjImpfFrom(praet) {
  const il = praet[2];
  if (isDash(il)) return dashes();
  const base = il.endsWith("t") ? il.slice(0, -1) : il;
  const i = Math.max(base.lastIndexOf("a"), base.lastIndexOf("i"), base.lastIndexOf("u"));
  const hat = base.slice(0, i) + { a: "â", i: "î", u: "û" }[base[i]] + base.slice(i + 1);
  const out = [`${base}sse`, `${base}sses`, `${hat}t`, `${base}ssions`, `${base}ssiez`, `${base}ssent`];
  return out.map((f, k) => (isDash(praet[k]) ? DASH : f));
}

// The cond from the futur, row by row (falloir has only il faudra → il faudrait).
function condFrom(fut) {
  const k = fut.findIndex((f) => !isDash(f));
  if (k < 0) return dashes();
  const st = fut[k].slice(0, -FUT[k].length);
  return fut.map((f, i) => (isDash(f) ? DASH : st + IMPERF[i]));
}

/**
 * The forms of the plain verb from its ending alone, for every stored tense plus `ger` and `p2`.
 * `spelled: false` gives the bare pattern, which is what `x` compares against and what a learner
 * wrongly guesses (venissons, prendu); `spelled: true` keeps the sound of -ger/-cer verbs and is
 * what a verb without a stored tense uses.
 */
export function patternForms(plainInf, spelled = true) {
  const { stem, type } = parseInf(plainInf);
  const E = ENDINGS[type];
  const join = (ending) => (spelled ? respell(stem, ending, type) : stem) + ending;
  const praes = E.praes.map(join);
  const praet = E.praet.map(join);
  const imperf = spelled ? imperfFrom(praes) : IMPERF.map((e) => `${nousStem(praes)}${e}`);
  const futBase = type === "re" ? plainInf.slice(0, -1) : plainInf;
  const fut = FUT.map((e) => futBase + e);
  const subj = subjFrom(praes, imperf);
  return {
    praes,
    praet,
    imperf,
    fut,
    cond: condFrom(fut),
    subj,
    subjImpf: subjImpfFrom(praet),
    imp: impFrom(praes),
    ger: `${nousStem(praes)}ant`,
    p2: stem + E.p2,
  };
}

// The plain verb's forms: stored tenses first, then what follows from them.
function plainForms(p, stored) {
  const reg = patternForms(p.plain);
  const get = (k) => (stored[k] ? split(stored[k]) : null);
  const praes = get("praes") ?? reg.praes;
  const imperf = get("imperf") ?? imperfFrom(praes);
  const praet = get("praet") ?? reg.praet;
  const fut = get("fut") ?? reg.fut;
  const st = nousStem(praes);
  return {
    praes,
    praet,
    imperf,
    fut,
    cond: get("cond") ?? condFrom(fut),
    subj: get("subj") ?? subjFrom(praes, imperf),
    subjImpf: get("subjImpf") ?? subjImpfFrom(praet),
    imp: get("imp") ?? impFrom(praes),
    ger: stored.ger ?? (st ? `${st}ant` : DASH),
    p2: stored.p2 ?? reg.p2,
  };
}

// --- pronouns, auxiliaries, the finished rows ------------------------------------------------

/** The reflexive pronoun of person i before a word: me lève, m'appelle, m'en vais. */
function reflexive(p, i, word) {
  if (p.en) return `${CLITICS_EN[i]} ${word}`;
  const c = CLITICS[i];
  return c.endsWith("e") && i !== 3 && i !== 4 && elides(word) ? `${c[0]}'${word}` : `${c} ${word}`;
}
const negate = (core) => (elides(core) ? `n'${core} pas` : `ne ${core} pas`);

/** The participle as a compound tense shows it: agreement in brackets after être. */
export function agreed(p2, person, withEtre) {
  if (!withEtre) return p2;
  if (person < 3) return `${p2}(e)`;
  return p2.endsWith("s") ? `${p2}(es)` : `${p2}(e)s`;
}

// The finished tenses from plain-verb forms: pronouns added, compound and negative forms built.
function assemble(p, base, auxName, ownImp) {
  const wrap = (list) => list.map((f, i) => (isDash(f) ? f : p.pronominal ? reflexive(p, i, f) : f));
  const withEtre = auxName === "être";
  const out = {};
  for (const k of ["praes", "praet", "imperf", "fut", "cond", "subj", "subjImpf"]) out[k] = wrap(base[k]);
  for (const [k, simple] of Object.entries(COMPOUND)) {
    out[k] = AUX[auxName][simple].map((a, i) =>
      isDash(base[simple][i]) || isDash(base.p2) ? DASH : (p.pronominal ? reflexive(p, i, a) : a) + " " + agreed(base.p2, i, withEtre),
    );
  }
  const plainImp = base.imp;
  out.imp = ownImp ?? plainImp.map((f, i) => {
    if (isDash(f) || !p.pronominal) return f;
    return `${f}-${(p.en ? IMP_PRONOUN_EN : IMP_PRONOUN)[i]}`;
  });
  out.impNeg = plainImp.map((f, i) => (isDash(f) ? f : p.pronominal ? `ne ${reflexive(p, i, f)} pas` : negate(f)));
  out.ger = isDash(base.ger) ? DASH : p.pronominal ? reflexive(p, 2, base.ger) : base.ger;
  out.p2 = base.p2;
  return out;
}

const auxOf = (v, p) => (p.pronominal || v.aux === "être" || v.aux === "both" ? "être" : "avoir");
const safeId = (inf) => unaccent(inf.toLowerCase()).replace(/[\s']+/g, "-");

function storedFor(v, parent, key) {
  const stored = {};
  for (const k of [...STORED_TENSES, "ger", "p2"]) {
    const from = (src) => (key ? src?.[key]?.[k] : src?.[k]);
    if (from(parent) !== undefined) stored[k] = from(parent);
    if (from(v) !== undefined) stored[k] = from(v);
  }
  return stored;
}

/** One entry of verbtabellen.json → its rows. `byInf`: the file's verbs, for pronominal verbs. */
export function buildVerb(v, byInf = new Map()) {
  const p = parseInf(v.inf);
  const parent = p.pronominal ? byInf.get(p.plain) : null;
  const auxName = auxOf(v, p);
  const stored = storedFor(v, parent);
  const ownImp = p.pronominal && v.imp ? split(v.imp) : null;
  const forms = assemble(p, plainForms(p, stored), auxName, ownImp);
  const pattern = assemble(p, patternForms(p.plain, false), auxName);
  const altStored = { ...storedFor(v, parent, "alt") };
  const hasAlt = Object.keys(altStored).length > 0;
  const variant = hasAlt ? assemble(p, plainForms(p, { ...stored, ...altStored }), auxName, v.alt?.imp && p.pronominal ? split(v.alt.imp) : ownImp) : null;
  // A defective verb (falloir, pleuvoir): a person without a présent has no form anywhere.
  const gone = (i) => v.defective && isDash(forms.praes[i]);
  const rows = PERSONS.map((pron, i) => {
    const row = { pron, person: i };
    for (const k of ROW_TENSES) {
      const f = gone(i) ? DASH : forms[k][i];
      const cell = { f, x: !isDash(f) && f !== pattern[k][i] };
      const a = variant?.[k][i];
      if (a && !isDash(f) && !isDash(a) && a !== f) cell.alt = a;
      if (i === 0 && !isDash(f) && elides(f)) cell.el = true;
      row[k] = cell;
    }
    return row;
  });
  const simple = ["praes", "imperf", "praet", "fut", "cond", "subj", "subjImpf", "imp"];
  const every = rows.flatMap((r) => simple.flatMap((k) => [r[k].f, r[k].alt]));
  // A pronominal verb is also found by its bare forms: lève as well as me lève.
  const bare = p.pronominal ? every.filter(Boolean).map((f) => f.replace(/^(me |te |se |nous |vous |m'|t'|s')(en )?/, "").replace(/-(toi|nous|vous|t'en|nous-en|vous-en)$/, "")) : [];
  const list = [...every, ...bare, forms.ger, forms.p2].filter((f) => f && !isDash(f));
  return {
    ...v,
    id: safeId(v.inf),
    plain: p.plain,
    pronominal: p.pronominal,
    auxName,
    ger: forms.ger,
    p2: forms.p2,
    gerX: !isDash(forms.ger) && forms.ger !== pattern.ger,
    p2X: forms.p2 !== pattern.p2,
    // A tense without a full set of forms (falloir, pleuvoir). The imperative has only three
    // persons in French, and pouvoir none at all; that doesn't count.
    defective: !!v.defective || rows.some((r) => ROW_TENSES.some((k) => k !== "imp" && k !== "impNeg" && isDash(r[k].f))),
    rows,
    // What the search lens looks a verb up by (the simple tenses, participle, participe présent).
    forms: [...new Set(list)],
  };
}

export function buildAll(list) {
  const byInf = new Map(list.map((v) => [v.inf, v]));
  return list.map((v) => buildVerb(v, byInf));
}

/** The subject as written before a form in the je row: j'aime, je parle. */
export const subjectFor = (row, cell) => (row.person === 0 ? (cell.el ? "j'" : "je ") : `${row.pron} `);

// The bare pattern, as a learner would guess it: the wrong options in quizzes (venissons, prendu).
const wrapPattern = (inf, forms) => {
  const p = parseInf(inf);
  return p.pronominal ? forms.map((f, i) => reflexive(p, i, f)) : forms;
};
export const regularPraes = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).praes);
export const regularPraet = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).praet);
export const regularFut = (inf) => wrapPattern(inf, patternForms(parseInf(inf).plain, false).fut);
export const regularP2 =(inf) => patternForms(parseInf(inf).plain, false).p2;
