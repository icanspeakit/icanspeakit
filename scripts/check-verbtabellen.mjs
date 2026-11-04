// Checks the Spanish verb tables (docs/content-plan.md §4.1):
//
//   node scripts/check-verbtabellen.mjs          the gate
//   node scripts/check-verbtabellen.mjs --dump   also prints every form, for a human review
//
// 1. Shape: known groups, six forms in every stored tense, no forms stored on `regular: true`,
//    every minimum verb from the plan present.
// 2. Golden forms: hand-checked forms for the patterns the generator has to get right.
// 3. Accents (RAE 2010): the endings every Spanish verb shares, and the spellings RAE dropped.
// 4. Agreement with the reference list src/data/nachschlagen/starke-schwache-verben.json.
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
const MINIMUM = `hablar comer vivir ser estar haber ir tener hacer decir poder querer saber poner salir venir
  ver dar traer oír conocer conducir pedir dormir jugar pensar volver sentir seguir empezar elegir construir caer
  caber andar levantarse llamarse irse deber soler`.split(/\s+/);
for (const inf of MINIMUM) if (!by.has(inf)) errors.push(`${inf}: on the plan's minimum list, missing`);
const groupIds = new Set(data.groups.map((g) => g.id));
if (data.variety !== "es-ES") errors.push('top level: variety must be "es-ES"');
const seen = new Set();
for (const v of data.verbs) {
  if (seen.has(v.inf)) errors.push(`${v.inf}: listed twice`);
  seen.add(v.inf);
  if (!groupIds.has(v.group)) errors.push(`${v.inf}: unknown group ${v.group}`);
  if (!v.en || !v.level) errors.push(`${v.inf}: needs en and level`);
  for (const k of STORED_TENSES) {
    if (v[k] === undefined) continue;
    if (v.regular) errors.push(`${v.inf}: regular, but stores ${k}`);
    const n = v[k].split(",").length;
    if (n !== 6) errors.push(`${v.inf}.${k}: ${n} forms, needs 6`);
  }
}
for (const g of data.groups) if (!data.verbs.some((v) => v.group === g.id)) errors.push(`group ${g.id}: no verbs`);

// --- 2. golden forms ------------------------------------------------------------------------
const P = { yo: 0, tu: 1, el: 2, nos: 3, vos: 4, ellos: 5 };
const GOLD = [
  ["hablar", "praes", "hablo hablas habla hablamos habláis hablan"],
  ["hablar", "praet", "hablé hablaste habló hablamos hablasteis hablaron"],
  ["hablar", "imperf", "hablaba hablabas hablaba hablábamos hablabais hablaban"],
  ["hablar", "fut", "hablaré hablarás hablará hablaremos hablaréis hablarán"],
  ["hablar", "cond", "hablaría hablarías hablaría hablaríamos hablaríais hablarían"],
  ["hablar", "subj", "hable hables hable hablemos habléis hablen"],
  ["hablar", "subjImpf", "hablara hablaras hablara habláramos hablarais hablaran"],
  ["hablar", "imp", "– habla hable hablemos hablad hablen"],
  ["comer", "praes", "como comes come comemos coméis comen"],
  ["comer", "praet", "comí comiste comió comimos comisteis comieron"],
  ["comer", "imperf", "comía comías comía comíamos comíais comían"],
  ["comer", "cond", "comería comerías comería comeríamos comeríais comerían"],
  ["comer", "subj", "coma comas coma comamos comáis coman"],
  ["comer", "subjImpf", "comiera comieras comiera comiéramos comierais comieran"],
  ["comer", "imp", "– come coma comamos comed coman"],
  ["vivir", "praes", "vivo vives vive vivimos vivís viven"],
  ["vivir", "imp", "– vive viva vivamos vivid vivan"],
  ["buscar", "praet", "busqué buscaste buscó buscamos buscasteis buscaron"],
  ["buscar", "subj", "busque busques busque busquemos busquéis busquen"],
  ["llegar", "subj", "llegue llegues llegue lleguemos lleguéis lleguen"],
  ["coger", "praes", "cojo coges coge cogemos cogéis cogen"],
  ["coger", "subj", "coja cojas coja cojamos cojáis cojan"],
  ["leer", "praet", "leí leíste leyó leímos leísteis leyeron"],
  ["leer", "subjImpf", "leyera leyeras leyera leyéramos leyerais leyeran"],
  ["empezar", "praet", "empecé empezaste empezó empezamos empezasteis empezaron"],
  ["jugar", "praet", "jugué jugaste jugó jugamos jugasteis jugaron"],
  ["oír", "praet", "oí oíste oyó oímos oísteis oyeron"],
  ["oír", "subj", "oiga oigas oiga oigamos oigáis oigan"],
  ["oír", "imp", "– oye oiga oigamos oíd oigan"],
  ["oír", "fut", "oiré oirás oirá oiremos oiréis oirán"],
  ["caer", "praet", "caí caíste cayó caímos caísteis cayeron"],
  ["construir", "praet", "construí construiste construyó construimos construisteis construyeron"],
  ["construir", "imp", "– construye construya construyamos construid construyan"],
  ["tener", "subj", "tenga tengas tenga tengamos tengáis tengan"],
  ["tener", "cond", "tendría tendrías tendría tendríamos tendríais tendrían"],
  ["tener", "subjImpf", "tuviera tuvieras tuviera tuviéramos tuvierais tuvieran"],
  ["decir", "subjImpf", "dijera dijeras dijera dijéramos dijerais dijeran"],
  ["ver", "subj", "vea veas vea veamos veáis vean"],
  ["dar", "imp", "– da dé demos dad den"],
  ["ser", "subjImpf", "fuera fueras fuera fuéramos fuerais fueran"],
  ["reír", "imp", "– ríe ría riamos reíd rían"],
];
const GOLD_MULTI = [
  ["levantarse", "imp", ["–", "levántate", "levántese", "levantémonos", "levantaos", "levántense"]],
  ["levantarse", "impNeg", ["–", "no te levantes", "no se levante", "no nos levantemos", "no os levantéis", "no se levanten"]],
  ["levantarse", "praes", ["me levanto", "te levantas", "se levanta", "nos levantamos", "os levantáis", "se levantan"]],
  ["levantarse", "perf", ["me he levantado", "te has levantado", "se ha levantado", "nos hemos levantado", "os habéis levantado", "se han levantado"]],
  ["sentarse", "imp", ["–", "siéntate", "siéntese", "sentémonos", "sentaos", "siéntense"]],
  ["acostarse", "imp", ["–", "acuéstate", "acuéstese", "acostémonos", "acostaos", "acuéstense"]],
  ["vestirse", "imp", ["–", "vístete", "vístase", "vistámonos", "vestíos", "vístanse"]],
  ["ponerse", "imp", ["–", "ponte", "póngase", "pongámonos", "poneos", "pónganse"]],
  ["irse", "imp", ["–", "vete", "váyase", "vámonos", "idos", "váyanse"]],
  ["irse", "impNeg", ["–", "no te vayas", "no se vaya", "no nos vayamos", "no os vayáis", "no se vayan"]],
  ["irse", "praet", ["me fui", "te fuiste", "se fue", "nos fuimos", "os fuisteis", "se fueron"]],
  ["hablar", "impNeg", ["–", "no hables", "no hable", "no hablemos", "no habléis", "no hablen"]],
  ["hablar", "subjPlusc", ["hubiera hablado", "hubieras hablado", "hubiera hablado", "hubiéramos hablado", "hubierais hablado", "hubieran hablado"]],
  ["volver", "plusc", ["había vuelto", "habías vuelto", "había vuelto", "habíamos vuelto", "habíais vuelto", "habían vuelto"]],
];
const check = (inf, tense, want) => {
  const v = by.get(inf);
  if (!v) return errors.push(`golden: ${inf} not in the file`);
  const got = v.rows.map((r) => r[tense].f);
  want.forEach((w, i) => { if (got[i] !== w) errors.push(`${inf}.${tense}[${i}]: "${got[i]}", expected "${w}"`); });
};
for (const [inf, t, s] of GOLD) check(inf, t, s.split(" "));
for (const [inf, t, l] of GOLD_MULTI) check(inf, t, l);
for (const [inf, ger, p2] of [["levantarse", "levantándose", "levantado"], ["irse", "yéndose", "ido"], ["vestirse", "vistiéndose", "vestido"],
  ["leer", "leyendo", "leído"], ["oír", "oyendo", "oído"], ["traer", "trayendo", "traído"], ["caer", "cayendo", "caído"], ["construir", "construyendo", "construido"], ["reír", "riendo", "reído"], ["ir", "yendo", "ido"], ["ser", "siendo", "sido"], ["hablar", "hablando", "hablado"]]) {
  const v = by.get(inf);
  if (v?.ger !== ger) errors.push(`${inf}: gerund "${v?.ger}", expected "${ger}"`);
  if (v?.p2 !== p2) errors.push(`${inf}: participle "${v?.p2}", expected "${p2}"`);
}
const alt = by.get("hablar").rows;
if (alt[P.nos].subjImpf.alt !== "hablásemos" || alt[P.vos].subjImpf.alt !== "hablaseis") errors.push(`-se forms wrong: ${alt[P.nos].subjImpf.alt}, ${alt[P.vos].subjImpf.alt}`);
if (alt[P.nos].subjPlusc.alt !== "hubiésemos hablado") errors.push(`-se pluperfect wrong: ${alt[P.nos].subjPlusc.alt}`);
if (by.get("hablar").rows.some((r) => ROW_TENSES.some((k) => r[k].x))) errors.push("hablar: a highlighted form on the model verb");
if (!by.get("tener").rows[0].praes.x || by.get("tener").rows[3].praes.x) errors.push("tener: highlight wrong (tengo yes, tenemos no)");

// --- 3. accents ------------------------------------------------------------------------------
// Monosyllables (no written accent) and the -ar/-er/-ir verbs that break a line below.
const strip = (f) => f.replace(/^(no )?(me|te|se|nos|os) /, "");
const MONO_VOS = new Set(["sois", "vais", "dais", "veis"]);
const NO_ACCENT_EL = new Set(["fue", "dio", "vio", "rio", "hubo", "estuvo", "anduvo", "tuvo", "vino", "hizo", "puso", "dijo", "trajo", "condujo", "pudo", "quiso", "supo", "cupo"]);
const BANNED = new Set(["dió", "vió", "fué", "fuí", "rió", "riáis", "ví", "dí"]);
const rule = (ok, v, tense, i, f, msg) => { if (!ok) errors.push(`${v.inf}.${tense}[${i}] "${f}": ${msg}`); };
for (const v of verbs) {
  v.rows.forEach((r, i) => {
    for (const k of ROW_TENSES) {
      for (const f of [r[k].f, r[k].alt]) {
        if (!f) continue;
        if (BANNED.has(strip(f))) errors.push(`${v.inf}.${k}: "${f}" is not RAE spelling`);
        if (/[^a-záéíóúüñ –]/.test(f)) errors.push(`${v.inf}.${k}: odd character in "${f}"`);
        if (/,|\s{2}/.test(f)) errors.push(`${v.inf}.${k}: bad spacing in "${f}"`);
      }
    }
    const form = (k) => { const f = r[k].f; return f === DASH ? null : strip(f); };
    const on = (k, test, msg) => { const f = form(k); if (f) rule(test(f), v, k, i, f, msg); };
    if (i === 4) {
      on("praes", (f) => /(áis|éis|ís)$/.test(f) || MONO_VOS.has(f), "vosotros needs -áis / -éis / -ís");
      on("fut", (f) => f.endsWith("éis"), "futuro vosotros ends in -éis");
      on("cond", (f) => f.endsWith("íais"), "condicional vosotros ends in -íais");
      on("subj", (f) => /(éis|áis)$/.test(f) || f === "deis" || f === "riais", "subjuntivo vosotros needs -éis / -áis");
      on("imperf", (f) => /(abais|íais)$/.test(f) || f === "erais" || f === "ibais", "imperfecto vosotros: -abais or -íais");
      on("subjImpf", (f) => /rais$/.test(f) && !/[áéíóú]/.test(f), "imperfecto de subjuntivo vosotros: -rais, no accent");
      on("praet", (f) => /steis$/.test(f), "indefinido vosotros ends in -steis");
    }
    if (i === 3) {
      on("imperf", (f) => /(ábamos|íamos)$/.test(f) || f === "éramos" || f === "íbamos", "imperfecto nosotros: -ábamos or -íamos");
      on("cond", (f) => f.endsWith("íamos"), "condicional nosotros ends in -íamos");
      on("subjImpf", (f) => /[áéíóú]ramos$/.test(f), "imperfecto de subjuntivo nosotros needs an accent");
    }
    if (i === 2 && !NO_ACCENT_EL.has(form("praet"))) on("praet", (f) => /[óo]$/.test(f) && /ó$/.test(f), "indefinido él: -ó, or on the no-accent list");
    if (i === 2 && NO_ACCENT_EL.has(form("praet"))) on("praet", (f) => !/[áéíóú]/.test(f), "strong indefinido: no written accent");
    if (i === 0 && !["fui", "vi", "di", "reí"].includes(form("praet"))) on("praet", (f) => /(é|í|e)$/.test(f), "indefinido yo: -é, -í, or a strong stem in -e");
  });
}

// --- 4. agreement with the reference list -----------------------------------------------------
// That list is written by hand: "yo presente · él indefinido · participio". A mismatch means one
// of the two files is wrong.
const list = read("src/data/nachschlagen/starke-schwache-verben.json");
let compared = 0;
for (const s of list.sections) {
  for (const it of s.items) {
    if (!Array.isArray(it)) continue;
    const inf = String(it[0]).replace(/[[\]|]/g, "");
    const parts = String(it[1]).split(" · ").map((x) => x.trim());
    const v = by.get(inf);
    if (!v || parts.length !== 3) continue;
    compared++;
    const mine = [v.rows[0].praes.f, v.rows[2].praet.f, v.p2];
    parts.forEach((p, i) => { if (mine[i] !== p) errors.push(`${inf}: reference list has "${p}", the table has "${mine[i]}"`); });
  }
}

if (process.argv.includes("--dump")) {
  for (const v of verbs) {
    console.log(`\n# ${v.inf} (ger ${v.ger}, p2 ${v.p2})`);
    for (const k of ROW_TENSES) console.log(`${k}: ${v.rows.map((r) => r[k].f + (r[k].alt ? ` / ${r[k].alt}` : "")).join(", ")}`);
  }
}
for (const e of errors) console.error(`  ERROR ${e}`);
console.log(`verbtabellen: ${verbs.length} verbs, ${compared} compared with the reference list, ${errors.length} errors`);
if (errors.length) process.exit(1);
