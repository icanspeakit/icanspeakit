// Checks the French verb tables (docs/content-plan.md §4.1):
//
//   node scripts/check-verbtabellen.mjs                 the gate
//   node scripts/check-verbtabellen.mjs --dump [inf…]   also prints every form (* = highlighted,
//                                                       / = accepted variant), for a human review
//
// 1. Shape: known groups, six forms in every stored tense and variant, no forms stored on
//    `regular: true`, every minimum verb from the plan present, variety fr-FR.
// 2. Golden forms: hand-checked forms for the patterns the generator has to get right.
// 3. Spelling: the endings every French verb shares, the circumflexes of the passé simple and the
//    imparfait du subjonctif, elision, and misspellings learners (and generators) make.
// 4. Agreement with the reference list src/data/nachschlagen/starke-schwache-verben.json
//    (je présent · il passé composé · participe passé).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAll, DASH, ROW_TENSES, STORED_TENSES } from "../src/lib/verbtabellenCore.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(readFileSync(path.join(ROOT, f), "utf8"));
const data = read("src/data/verbtabellen.json");
const errors = [];
const verbs = buildAll(data.verbs);
const by = new Map(verbs.map((v) => [v.inf, v]));

// --- 1. shape --------------------------------------------------------------------------------
const MINIMUM = `parler finir vendre être avoir aller faire venir tenir prendre mettre dire voir savoir pouvoir
  vouloir devoir falloir pleuvoir partir sortir dormir ouvrir écrire lire boire croire connaître conduire recevoir
  vivre suivre mourir naître envoyer manger commencer acheter appeler préférer payer`.split(/\s+/)
  .concat(["s'asseoir", "se lever", "s'appeler", "se souvenir", "s'en aller"]);
for (const inf of MINIMUM) if (!by.has(inf)) errors.push(`${inf}: on the plan's minimum list, missing`);
const groupIds = new Set(data.groups.map((g) => g.id));
if (data.variety !== "fr-FR") errors.push('top level: variety must be "fr-FR"');
const seen = new Set();
const sixForms = (inf, k, s) => {
  if (typeof s !== "string") return errors.push(`${inf}.${k}: must be a comma list`);
  const n = s.split(",").length;
  if (n !== 6) errors.push(`${inf}.${k}: ${n} forms, needs 6`);
};
for (const v of data.verbs) {
  if (seen.has(v.inf)) errors.push(`${v.inf}: listed twice`);
  seen.add(v.inf);
  if (!groupIds.has(v.group)) errors.push(`${v.inf}: unknown group ${v.group}`);
  if (!v.en || !v.level) errors.push(`${v.inf}: needs en and level`);
  if (v.aux !== undefined && !["être", "both"].includes(v.aux)) errors.push(`${v.inf}: aux is avoir by default; store only être or both`);
  if (v.defective !== undefined && v.defective !== true) errors.push(`${v.inf}: defective is true or absent`);
  for (const k of STORED_TENSES) {
    if (v[k] === undefined) continue;
    if (v.regular) errors.push(`${v.inf}: regular, but stores ${k}`);
    sixForms(v.inf, k, v[k]);
  }
  for (const [k, s] of Object.entries(v.alt ?? {})) {
    if (!STORED_TENSES.includes(k)) errors.push(`${v.inf}.alt: unknown tense ${k}`);
    sixForms(v.inf, `alt.${k}`, s);
  }
  for (const k of ["es419", "praesX"]) if (k in v) errors.push(`${v.inf}: key ${k} doesn't belong in the French table`);
}
for (const g of data.groups) if (!data.verbs.some((v) => v.group === g.id)) errors.push(`group ${g.id}: no verbs`);

// --- 2. golden forms ------------------------------------------------------------------------
// Each line checked by hand against standard conjugation tables (traditional spelling).
const GOLD = [
  ["parler", "praes", "parle parles parle parlons parlez parlent"],
  ["parler", "imperf", "parlais parlais parlait parlions parliez parlaient"],
  ["parler", "praet", "parlai parlas parla parlâmes parlâtes parlèrent"],
  ["parler", "fut", "parlerai parleras parlera parlerons parlerez parleront"],
  ["parler", "cond", "parlerais parlerais parlerait parlerions parleriez parleraient"],
  ["parler", "subj", "parle parles parle parlions parliez parlent"],
  ["parler", "subjImpf", "parlasse parlasses parlât parlassions parlassiez parlassent"],
  ["parler", "imp", "– parle – parlons parlez –"],
  ["finir", "praes", "finis finis finit finissons finissez finissent"],
  ["finir", "imperf", "finissais finissais finissait finissions finissiez finissaient"],
  ["finir", "subj", "finisse finisses finisse finissions finissiez finissent"],
  ["finir", "subjImpf", "finisse finisses finît finissions finissiez finissent"],
  ["finir", "praet", "finis finis finit finîmes finîtes finirent"],
  ["finir", "imp", "– finis – finissons finissez –"],
  ["vendre", "praes", "vends vends vend vendons vendez vendent"],
  ["vendre", "fut", "vendrai vendras vendra vendrons vendrez vendront"],
  ["vendre", "praet", "vendis vendis vendit vendîmes vendîtes vendirent"],
  ["manger", "praes", "mange manges mange mangeons mangez mangent"],
  ["manger", "imperf", "mangeais mangeais mangeait mangions mangiez mangeaient"],
  ["manger", "praet", "mangeai mangeas mangea mangeâmes mangeâtes mangèrent"],
  ["manger", "subjImpf", "mangeasse mangeasses mangeât mangeassions mangeassiez mangeassent"],
  ["commencer", "imperf", "commençais commençais commençait commencions commenciez commençaient"],
  ["commencer", "praet", "commençai commenças commença commençâmes commençâtes commencèrent"],
  ["acheter", "subj", "achète achètes achète achetions achetiez achètent"],
  ["acheter", "cond", "achèterais achèterais achèterait achèterions achèteriez achèteraient"],
  ["appeler", "praes", "appelle appelles appelle appelons appelez appellent"],
  ["préférer", "fut", "préférerai préféreras préférera préférerons préférerez préféreront"],
  ["payer", "subj", "paie paies paie payions payiez paient"],
  ["être", "subjImpf", "fusse fusses fût fussions fussiez fussent"],
  ["être", "cond", "serais serais serait serions seriez seraient"],
  ["avoir", "imperf", "avais avais avait avions aviez avaient"],
  ["avoir", "subjImpf", "eusse eusses eût eussions eussiez eussent"],
  ["aller", "imp", "– va – allons allez –"],
  ["aller", "praet", "allai allas alla allâmes allâtes allèrent"],
  ["aller", "cond", "irais irais irait irions iriez iraient"],
  ["faire", "imperf", "faisais faisais faisait faisions faisiez faisaient"],
  ["faire", "imp", "– fais – faisons faites –"],
  ["venir", "subj", "vienne viennes vienne venions veniez viennent"],
  ["venir", "subjImpf", "vinsse vinsses vînt vinssions vinssiez vinssent"],
  ["prendre", "subj", "prenne prennes prenne prenions preniez prennent"],
  ["voir", "subj", "voie voies voie voyions voyiez voient"],
  ["voir", "imperf", "voyais voyais voyait voyions voyiez voyaient"],
  ["boire", "subj", "boive boives boive buvions buviez boivent"],
  ["recevoir", "subj", "reçoive reçoives reçoive recevions receviez reçoivent"],
  ["devoir", "subj", "doive doives doive devions deviez doivent"],
  ["mourir", "subj", "meure meures meure mourions mouriez meurent"],
  ["envoyer", "cond", "enverrais enverrais enverrait enverrions enverriez enverraient"],
  ["envoyer", "subj", "envoie envoies envoie envoyions envoyiez envoient"],
  ["ouvrir", "imp", "– ouvre – ouvrons ouvrez –"],
  ["partir", "praet", "partis partis partit partîmes partîtes partirent"],
  ["naître", "subjImpf", "naquisse naquisses naquît naquissions naquissiez naquissent"],
  ["dire", "imp", "– dis – disons dites –"],
  ["savoir", "imp", "– sache – sachons sachez –"],
];
const GOLD_MULTI = [
  ["aimer", "perf", ["ai aimé", "as aimé", "a aimé", "avons aimé", "avez aimé", "ont aimé"]],
  ["aller", "perf", ["suis allé(e)", "es allé(e)", "est allé(e)", "sommes allé(e)s", "êtes allé(e)s", "sont allé(e)s"]],
  ["aller", "subjPerf", ["sois allé(e)", "sois allé(e)", "soit allé(e)", "soyons allé(e)s", "soyez allé(e)s", "soient allé(e)s"]],
  ["parler", "impNeg", ["–", "ne parle pas", "–", "ne parlons pas", "ne parlez pas", "–"]],
  ["ouvrir", "impNeg", ["–", "n'ouvre pas", "–", "n'ouvrons pas", "n'ouvrez pas", "–"]],
  ["avoir", "impNeg", ["–", "n'aie pas", "–", "n'ayons pas", "n'ayez pas", "–"]],
  ["parler", "plusc", ["avais parlé", "avais parlé", "avait parlé", "avions parlé", "aviez parlé", "avaient parlé"]],
  ["parler", "futPerf", ["aurai parlé", "auras parlé", "aura parlé", "aurons parlé", "aurez parlé", "auront parlé"]],
  ["parler", "condPerf", ["aurais parlé", "aurais parlé", "aurait parlé", "aurions parlé", "auriez parlé", "auraient parlé"]],
  ["parler", "subjPlusc", ["eusse parlé", "eusses parlé", "eût parlé", "eussions parlé", "eussiez parlé", "eussent parlé"]],
  ["se lever", "praes", ["me lève", "te lèves", "se lève", "nous levons", "vous levez", "se lèvent"]],
  ["se lever", "perf", ["me suis levé(e)", "t'es levé(e)", "s'est levé(e)", "nous sommes levé(e)s", "vous êtes levé(e)s", "se sont levé(e)s"]],
  ["se lever", "plusc", ["m'étais levé(e)", "t'étais levé(e)", "s'était levé(e)", "nous étions levé(e)s", "vous étiez levé(e)s", "s'étaient levé(e)s"]],
  ["se lever", "imp", ["–", "lève-toi", "–", "levons-nous", "levez-vous", "–"]],
  ["se lever", "impNeg", ["–", "ne te lève pas", "–", "ne nous levons pas", "ne vous levez pas", "–"]],
  ["s'appeler", "praes", ["m'appelle", "t'appelles", "s'appelle", "nous appelons", "vous appelez", "s'appellent"]],
  ["s'en aller", "praes", ["m'en vais", "t'en vas", "s'en va", "nous en allons", "vous en allez", "s'en vont"]],
  ["s'en aller", "perf", ["m'en suis allé(e)", "t'en es allé(e)", "s'en est allé(e)", "nous en sommes allé(e)s", "vous en êtes allé(e)s", "s'en sont allé(e)s"]],
  ["s'en aller", "imp", ["–", "va-t'en", "–", "allons-nous-en", "allez-vous-en", "–"]],
  ["s'en aller", "impNeg", ["–", "ne t'en va pas", "–", "ne nous en allons pas", "ne vous en allez pas", "–"]],
  ["s'asseoir", "praes", ["m'assieds", "t'assieds", "s'assied", "nous asseyons", "vous asseyez", "s'asseyent"]],
  ["s'asseoir", "perf", ["me suis assis(e)", "t'es assis(e)", "s'est assis(e)", "nous sommes assis(es)", "vous êtes assis(es)", "se sont assis(es)"]],
  ["s'asseoir", "imp", ["–", "assieds-toi", "–", "asseyons-nous", "asseyez-vous", "–"]],
  ["se souvenir", "subj", ["me souvienne", "te souviennes", "se souvienne", "nous souvenions", "vous souveniez", "se souviennent"]],
  ["falloir", "praes", ["–", "–", "faut", "–", "–", "–"]],
  ["falloir", "perf", ["–", "–", "a fallu", "–", "–", "–"]],
  ["falloir", "cond", ["–", "–", "faudrait", "–", "–", "–"]],
  ["falloir", "subjImpf", ["–", "–", "fallût", "–", "–", "–"]],
  ["pleuvoir", "perf", ["–", "–", "a plu", "–", "–", "ont plu"]],
  ["mourir", "perf", ["suis mort(e)", "es mort(e)", "est mort(e)", "sommes mort(e)s", "êtes mort(e)s", "sont mort(e)s"]],
];
const check = (inf, tense, want) => {
  const v = by.get(inf);
  if (!v) return errors.push(`golden: ${inf} not in the file`);
  const got = v.rows.map((r) => r[tense].f);
  want.forEach((w, i) => { if (got[i] !== w) errors.push(`${inf}.${tense}[${i}]: "${got[i]}", expected "${w}"`); });
};
for (const [inf, t, s] of GOLD) check(inf, t, s.split(" "));
for (const [inf, t, l] of GOLD_MULTI) check(inf, t, l);
for (const [inf, ger, p2] of [["parler", "parlant", "parlé"], ["finir", "finissant", "fini"], ["vendre", "vendant", "vendu"],
  ["manger", "mangeant", "mangé"], ["commencer", "commençant", "commencé"], ["être", "étant", "été"], ["avoir", "ayant", "eu"],
  ["savoir", "sachant", "su"], ["faire", "faisant", "fait"], ["boire", "buvant", "bu"], ["devoir", "devant", "dû"],
  ["s'asseoir", "s'asseyant", "assis"], ["se lever", "se levant", "levé"], ["s'en aller", "s'en allant", "allé"],
  ["naître", "naissant", "né"], ["falloir", DASH, "fallu"], ["ouvrir", "ouvrant", "ouvert"], ["suivre", "suivant", "suivi"]]) {
  const v = by.get(inf);
  if (v?.ger !== ger) errors.push(`${inf}: participe présent "${v?.ger}", expected "${ger}"`);
  if (v?.p2 !== p2) errors.push(`${inf}: participle "${v?.p2}", expected "${p2}"`);
}
// Variants: both spellings shown, the traditional one first.
const altOf = (inf, k, i) => by.get(inf)?.rows[i][k].alt;
for (const [inf, k, i, want] of [["payer", "praes", 0, "paye"], ["payer", "fut", 0, "payerai"], ["payer", "subj", 5, "payent"],
  ["s'asseoir", "praes", 0, "m'assois"], ["s'asseoir", "imp", 4, "assoyez-vous"], ["s'asseoir", "fut", 0, "m'assoirai"],
  ["connaître", "praes", 2, "connait"], ["connaître", "cond", 0, "connaitrais"], ["préférer", "fut", 0, "préfèrerai"]]) {
  if (altOf(inf, k, i) !== want) errors.push(`${inf}.${k}[${i}]: variant "${altOf(inf, k, i)}", expected "${want}"`);
}
if (altOf("payer", "praes", 3)) errors.push("payer: nous payons has no variant");
// Highlights: nothing on the models, the spelling changes and the irregular forms do stand out.
for (const inf of ["parler", "finir", "vendre"]) {
  if (by.get(inf).rows.some((r) => ROW_TENSES.some((k) => r[k].x))) errors.push(`${inf}: a highlighted form on a model verb`);
}
const x = (inf, k, i) => by.get(inf)?.rows[i][k].x;
if (!x("manger", "praes", 3) || x("manger", "praes", 0)) errors.push("manger: highlight wrong (mangeons yes, mange no)");
if (!x("prendre", "praes", 5) || x("prendre", "praes", 0)) errors.push("prendre: highlight wrong (prennent yes, prends no)");
if (!by.get("venir").p2X || by.get("partir").p2X) errors.push("participle highlight wrong (venu yes, parti no)");
// Elision in the je row: j'aime, j'ai parlé, but je parle, je suis allé(e), je me lève.
const el = (inf, k) => !!by.get(inf)?.rows[0][k].el;
for (const [inf, k, want] of [["aimer", "praes", true], ["parler", "perf", true], ["parler", "praes", false], ["aller", "perf", false],
  ["aller", "fut", true], ["être", "imperf", true], ["se lever", "praes", false], ["habiter", "praes", true]]) {
  if (el(inf, k) !== want) errors.push(`${inf}.${k}: je row elision ${el(inf, k)}, expected ${want}`);
}

// --- 3. spelling -----------------------------------------------------------------------------
const strip = (f) => f.replace(/^(ne |n')/, "").replace(/ pas$/, "").replace(/^(me |te |se |nous |vous |m'|t'|s')(en )?/, "");
// Forms that look plausible and are wrong; or a 1990 spelling where the traditional one goes first.
const BANNED = new Set(["mangons", "commencons", "appèle", "achette", "envoierai", "envoyerai", "disez", "faisez", "venirai",
  "prendu", "mettu", "devu", "voirai", "mouru", "naîtu", "assisté", "pouva", "connait", "nait", "connaitrai", "naitrai",
  "préfèrerai", "assoir", "allerai", "sontes", "faisons-nous", "vas-t'en", "va-t-en", "eûmes-nous", "aies-tu"]);
const rule = (ok, v, k, i, f, msg) => { if (!ok) errors.push(`${v.inf}.${k}[${i}] "${f}": ${msg}`); };
for (const v of verbs) {
  v.rows.forEach((r, i) => {
    for (const k of ROW_TENSES) {
      for (const f of [r[k].f, r[k].alt]) {
        if (!f) continue;
        if (f !== r[k].alt && BANNED.has(strip(f).split(" ")[0])) errors.push(`${v.inf}.${k}: "${f}" is not standard spelling (or the 1990 form shown first)`);
        if (/[^a-zàâäçéèêëîïôöùûüÿœæ' ()–-]/.test(f)) errors.push(`${v.inf}.${k}: odd character in "${f}"`);
        if (/\s{2}|^\s|\s$|,/.test(f)) errors.push(`${v.inf}.${k}: bad spacing in "${f}"`);
        if (/\b(me|te|se) [aeiouéèêâîôûh]/.test(f)) errors.push(`${v.inf}.${k}: "${f}" needs elision`);
      }
    }
    const form = (k) => (r[k].f === DASH ? null : strip(r[k].f));
    const on = (k, test, msg) => { const f = form(k); if (f) rule(test(f), v, k, i, f, msg); };
    if (i === 3) {
      on("praes", (f) => f.endsWith("ons") || f === "sommes", "présent nous ends in -ons");
      on("imperf", (f) => f.endsWith("ions"), "imparfait nous ends in -ions");
      on("fut", (f) => /rons$/.test(f), "futur nous ends in -rons");
      on("cond", (f) => /rions$/.test(f), "conditionnel nous ends in -rions");
      on("subj", (f) => f.endsWith("ions") || f === "soyons" || f === "ayons", "subjonctif nous ends in -ions");
      on("praet", (f) => /[âîû]n?mes$/.test(f), "passé simple nous: -âmes, -îmes, -ûmes, -înmes");
      on("subjImpf", (f) => /ssions$/.test(f), "imparfait du subjonctif nous ends in -ssions");
    }
    if (i === 4) {
      on("praes", (f) => f.endsWith("ez") || ["êtes", "faites", "dites"].includes(f), "présent vous: -ez, or êtes, faites, dites");
      on("imperf", (f) => f.endsWith("iez"), "imparfait vous ends in -iez");
      on("fut", (f) => /rez$/.test(f), "futur vous ends in -rez");
      on("cond", (f) => /riez$/.test(f), "conditionnel vous ends in -riez");
      on("subj", (f) => f.endsWith("iez") || f === "soyez" || f === "ayez", "subjonctif vous ends in -iez");
      on("praet", (f) => /[âîû]n?tes$/.test(f), "passé simple vous: -âtes, -îtes, -ûtes, -întes");
    }
    if (i === 2) {
      on("subjImpf", (f) => /[âîû]n?t$/.test(f), "imparfait du subjonctif il: circumflex (parlât, fût, vînt)");
      on("fut", (f) => /ra$/.test(f), "futur il ends in -ra");
      on("praet", (f) => !/[âîû]/.test(f), "passé simple il: no circumflex (il fut, il vint)");
    }
    if (i === 5) {
      on("praes", (f) => /(ent|ont)$/.test(f), "présent ils ends in -ent or -ont");
      on("imperf", (f) => f.endsWith("aient"), "imparfait ils ends in -aient");
      on("fut", (f) => /ront$/.test(f), "futur ils ends in -ront");
      on("praet", (f) => /(rent)$/.test(f), "passé simple ils ends in -rent");
    }
    if (i === 0) on("imperf", (f) => f.endsWith("ais"), "imparfait je ends in -ais");
  });
}

// --- 4. agreement with the reference list -----------------------------------------------------
// That list is written by hand. A mismatch means one of the two files is wrong. Turned back on by
// `conjugation-data` (2026-11-08) after `grammar-structure` paused it.
const list = read("src/data/nachschlagen/starke-schwache-verben.json");
const plainPart = (f) => f.replace(/\((e|es)\)s?$/, ""); // est allé(e) → est allé
let compared = 0;
for (const s of list.sections) {
  for (const it of s.items) {
    if (!Array.isArray(it)) continue;
    const inf = String(it[0]).replace(/[[\]|]/g, "");
    const parts = String(it[1]).split(" · ").map((p) => p.trim());
    const v = by.get(inf);
    if (!v || parts.length !== 3) continue;
    compared++;
    const mine = [v.rows[0].praes.f, plainPart(v.rows[2].perf.f), v.p2];
    parts.forEach((p, i) => { if (mine[i] !== p) errors.push(`${inf}: reference list has "${p}", the table has "${mine[i]}"`); });
  }
}

const dumpAt = process.argv.indexOf("--dump");
if (dumpAt >= 0) {
  const only = process.argv.slice(dumpAt + 1);
  for (const v of verbs) {
    if (only.length && !only.includes(v.inf)) continue;
    console.log(`\n# ${v.inf} (${v.auxName}; participe présent ${v.ger}${v.gerX ? "*" : ""}, participe passé ${v.p2}${v.p2X ? "*" : ""}${v.defective ? ", defective" : ""})`);
    for (const k of ROW_TENSES) console.log(`${k}: ${v.rows.map((r) => (r[k].el ? "j'" : "") + r[k].f + (r[k].x ? "*" : "") + (r[k].alt ? ` / ${r[k].alt}` : "")).join(", ")}`);
  }
}
for (const e of errors) console.error(`  ERROR ${e}`);
console.log(`verbtabellen: ${verbs.length} verbs, ${compared} compared with the reference list, ${errors.length} errors`);
if (errors.length) process.exit(1);
