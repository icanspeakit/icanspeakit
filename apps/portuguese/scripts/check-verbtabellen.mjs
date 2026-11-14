// Checks the European Portuguese verb tables (docs/content-plan.md §4.1):
//
//   node scripts/check-verbtabellen.mjs          the gate
//   node scripts/check-verbtabellen.mjs --dump   also prints every form, for a human review
//
// 1. Shape: known groups, six forms in every stored tense, no forms stored on `regular: true`,
//    every minimum verb from the plan present.
// 2. Golden forms: hand-checked forms for the patterns the generator has to get right.
// 3. Spelling (1990 Orthographic Agreement, pt-PT): characters, the endings every verb shares,
//    no pre-1990 spellings.
// 4. Agreement with the reference list src/data/nachschlagen/starke-schwache-verben.json.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAll, DASH, ROW_TENSES, STORED_TENSES } from "../src/lib/verbtabellenCore.js";
import { isStandardVariety } from "../src/lib/variety.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(readFileSync(path.join(ROOT, f), "utf8"));
const data = read("src/data/verbtabellen.json");
const errors = [];
const verbs = buildAll(data.verbs);
const by = new Map(verbs.map((v) => [v.inf, v]));

// --- 1. shape --------------------------------------------------------------------------------
// haver de is a construction, not a verb row: it is taught in the haver card and the modal rule.
const MINIMUM = `falar comer partir ser estar haver ter ir vir fazer dizer poder querer saber pôr ver ler dar trazer
  ouvir pedir dormir vestir seguir sair cair perder medir preferir construir rir crer caber valer passear odiar
  levantar-se chamar-se ir-se dever costumar`.split(/\s+/);
for (const inf of MINIMUM) if (!by.has(inf)) errors.push(`${inf}: on the plan's minimum list, missing`);
const groupIds = new Set(data.groups.map((g) => g.id));
if (!isStandardVariety(data.variety) || data.variety !== "pt-PT") errors.push('top level: variety must be "pt-PT"');
if (!data.ptBR?.note) errors.push("top level: ptBR note missing");
const seen = new Set();
for (const v of data.verbs) {
  if (seen.has(v.inf)) errors.push(`${v.inf}: listed twice`);
  seen.add(v.inf);
  if (!groupIds.has(v.group)) errors.push(`${v.inf}: unknown group ${v.group}`);
  if (!v.en || !v.level) errors.push(`${v.inf}: needs en and level`);
  if (v.ptBR && (!v.ptBR.note || v.ptBR.note.length > 160)) errors.push(`${v.inf}: ptBR.note missing or over 160 characters`);
  if (v.p2b && !/\bter\b|\bser\b|usual/i.test(v.note ?? "")) errors.push(`${v.inf}: a second participle needs a note on which one goes where`);
  for (const k of STORED_TENSES) {
    if (v[k] === undefined) continue;
    if (v.regular) errors.push(`${v.inf}: regular, but stores ${k}`);
    const n = v[k].split(",").length;
    if (n !== 6) errors.push(`${v.inf}.${k}: ${n} forms, needs 6`);
  }
}
for (const g of data.groups) if (!data.verbs.some((v) => v.group === g.id)) errors.push(`group ${g.id}: no verbs`);

// --- 2. golden forms ------------------------------------------------------------------------
const GOLD = [
  ["falar", "praes", "falo falas fala falamos falais falam"],
  ["falar", "praet", "falei falaste falou falámos falastes falaram"],
  ["falar", "imperf", "falava falavas falava falávamos faláveis falavam"],
  ["falar", "fut", "falarei falarás falará falaremos falareis falarão"],
  ["falar", "cond", "falaria falarias falaria falaríamos falaríeis falariam"],
  ["falar", "subj", "fale fales fale falemos faleis falem"],
  ["falar", "subjImpf", "falasse falasses falasse falássemos falásseis falassem"],
  ["falar", "subjFut", "falar falares falar falarmos falardes falarem"],
  ["falar", "infPers", "falar falares falar falarmos falardes falarem"],
  ["falar", "plusSimp", "falara falaras falara faláramos faláreis falaram"],
  ["falar", "imp", "– fala fale falemos falai falem"],
  ["comer", "praes", "como comes come comemos comeis comem"],
  ["comer", "praet", "comi comeste comeu comemos comestes comeram"],
  ["comer", "imperf", "comia comias comia comíamos comíeis comiam"],
  ["comer", "cond", "comeria comerias comeria comeríamos comeríeis comeriam"],
  ["comer", "subj", "coma comas coma comamos comais comam"],
  ["comer", "subjImpf", "comesse comesses comesse comêssemos comêsseis comessem"],
  ["comer", "imp", "– come coma comamos comei comam"],
  ["partir", "praes", "parto partes parte partimos partis partem"],
  ["partir", "imp", "– parte parta partamos parti partam"],
  ["partir", "subjImpf", "partisse partisses partisse partíssemos partísseis partissem"],
  ["ficar", "praet", "fiquei ficaste ficou ficámos ficastes ficaram"],
  ["ficar", "subj", "fique fiques fique fiquemos fiqueis fiquem"],
  ["chegar", "subj", "chegue cheguess chegue cheguemos chegueis cheguem".replace("cheguess", "chegues")],
  ["começar", "praet", "comecei começaste começou começámos começastes começaram"],
  ["esquecer", "praes", "esqueço esqueces esquece esquecemos esqueceis esquecem"],
  ["esquecer", "subj", "esqueça esqueças esqueça esqueçamos esqueçais esqueçam"],
  ["dirigir", "praes", "dirijo diriges dirige dirigimos dirigis dirigem"],
  ["passear", "praet", "passeei passeaste passeou passeámos passeastes passearam"],
  ["sair", "praet", "saí saíste saiu saímos saístes saíram"],
  ["sair", "imperf", "saía saías saía saíamos saíeis saíam"],
  ["sair", "subjFut", "sair saíres sair sairmos sairdes saírem"],
  ["sair", "subjImpf", "saísse saísses saísse saíssemos saísseis saíssem"],
  ["construir", "praet", "construí construíste construiu construímos construístes construíram"],
  ["construir", "imp", "– constrói construa construamos construí construam"],
  ["cair", "praet", "caí caíste caiu caímos caístes caíram"],
  ["ser", "praes", "sou és é somos sois são"],
  ["ser", "praet", "fui foste foi fomos fostes foram"],
  ["ser", "subjImpf", "fosse fosses fosse fôssemos fôsseis fossem"],
  ["ser", "subjFut", "for fores for formos fordes forem"],
  ["ser", "infPers", "ser seres ser sermos serdes serem"],
  ["ser", "imp", "– sê seja sejamos sede sejam"],
  ["ir", "subjFut", "for fores for formos fordes forem"],
  ["ir", "imp", "– vai vá vamos ide vão"],
  ["estar", "praet", "estive estiveste esteve estivemos estivestes estiveram"],
  ["estar", "subjImpf", "estivesse estivesses estivesse estivéssemos estivésseis estivessem"],
  ["ter", "praes", "tenho tens tem temos tendes têm"],
  ["ter", "subj", "tenha tenhas tenha tenhamos tenhais tenham"],
  ["ter", "cond", "teria terias teria teríamos teríeis teriam"],
  ["ter", "subjImpf", "tivesse tivesses tivesse tivéssemos tivésseis tivessem"],
  ["ter", "subjFut", "tiver tiveres tiver tivermos tiverdes tiverem"],
  ["ter", "infPers", "ter teres ter termos terdes terem"],
  ["vir", "praes", "venho vens vem vimos vindes vêm"],
  ["vir", "subjFut", "vier vieres vier viermos vierdes vierem"],
  ["vir", "subjImpf", "viesse viesses viesse viéssemos viésseis viessem"],
  ["fazer", "fut", "farei farás fará faremos fareis farão"],
  ["fazer", "cond", "faria farias faria faríamos faríeis fariam"],
  ["fazer", "subj", "faça faças faça façamos façais façam"],
  ["fazer", "subjImpf", "fizesse fizesses fizesse fizéssemos fizésseis fizessem"],
  ["dizer", "subj", "diga digas diga digamos digais digam"],
  ["dizer", "subjFut", "disser disseres disser dissermos disserdes disserem"],
  ["pôr", "praes", "ponho pões põe pomos pondes põem"],
  ["pôr", "infPers", "pôr pores pôr pormos pordes porem"],
  ["pôr", "subjFut", "puser puseres puser pusermos puserdes puserem"],
  ["pôr", "fut", "porei porás porá poremos poreis porão"],
  ["ver", "praet", "vi viste viu vimos vistes viram"],
  ["ver", "subjFut", "vir vires vir virmos virdes virem"],
  ["ver", "subjImpf", "visse visses visse víssemos vísseis vissem"],
  ["ler", "subjImpf", "lesse lesses lesse lêssemos lêsseis lessem"],
  ["dar", "praes", "dou dás dá damos dais dão"],
  ["dar", "subj", "dê dês dê demos deis deem"],
  ["dar", "subjImpf", "desse desses desse déssemos désseis dessem"],
  ["dar", "subjFut", "der deres der dermos derdes derem"],
  ["poder", "praet", "pude pudeste pôde pudemos pudestes puderam"],
  ["poder", "subj", "possa possas possa possamos possais possam"],
  ["querer", "subj", "queira queiras queira queiramos queirais queiram"],
  ["saber", "subj", "saiba saibas saiba saibamos saibais saibam"],
  ["trazer", "praet", "trouxe trouxeste trouxe trouxemos trouxestes trouxeram"],
  ["pedir", "subj", "peça peças peça peçamos peçais peçam"],
  ["dormir", "subj", "durma durmas durma durmamos durmais durmam"],
  ["rir", "imp", "– ri ria riamos ride riam"],
];
const GOLD_MULTI = [
  ["levantar-se", "praes", ["levanto-me", "levantas-te", "levanta-se", "levantamo-nos", "levantais-vos", "levantam-se"]],
  ["levantar-se", "praet", ["levantei-me", "levantaste-te", "levantou-se", "levantámo-nos", "levantastes-vos", "levantaram-se"]],
  ["levantar-se", "fut", ["levantar-me-ei", "levantar-te-ás", "levantar-se-á", "levantar-nos-emos", "levantar-vos-eis", "levantar-se-ão"]],
  ["levantar-se", "cond", ["levantar-me-ia", "levantar-te-ias", "levantar-se-ia", "levantar-nos-íamos", "levantar-vos-íeis", "levantar-se-iam"]],
  ["levantar-se", "subj", ["me levante", "te levantes", "se levante", "nos levantemos", "vos levanteis", "se levantem"]],
  ["levantar-se", "imp", ["–", "levanta-te", "levante-se", "levantemo-nos", "levantai-vos", "levantem-se"]],
  ["levantar-se", "impNeg", ["–", "não te levantes", "não se levante", "não nos levantemos", "não vos levanteis", "não se levantem"]],
  ["levantar-se", "infPers", ["levantar-me", "levantares-te", "levantar-se", "levantarmo-nos", "levantardes-vos", "levantarem-se"]],
  ["levantar-se", "perf", ["tenho-me levantado", "tens-te levantado", "tem-se levantado", "temo-nos levantado", "tendes-vos levantado", "têm-se levantado"]],
  ["levantar-se", "futPerf", ["ter-me-ei levantado", "ter-te-ás levantado", "ter-se-á levantado", "ter-nos-emos levantado", "ter-vos-eis levantado", "ter-se-ão levantado"]],
  ["ir-se", "praes", ["vou-me", "vais-te", "vai-se", "vamo-nos", "ides-vos", "vão-se"]],
  ["ir-se", "imp", ["–", "vai-te", "vá-se", "vamo-nos", "ide-vos", "vão-se"]],
  ["ir-se", "impNeg", ["–", "não te vás", "não se vá", "não nos vamos", "não vos vades", "não se vão"]],
  ["falar", "impNeg", ["–", "não fales", "não fale", "não falemos", "não faleis", "não falem"]],
  ["falar", "perf", ["tenho falado", "tens falado", "tem falado", "temos falado", "tendes falado", "têm falado"]],
  ["falar", "subjPlusc", ["tivesse falado", "tivesses falado", "tivesse falado", "tivéssemos falado", "tivésseis falado", "tivessem falado"]],
  ["falar", "subjFutPerf", ["tiver falado", "tiveres falado", "tiver falado", "tivermos falado", "tiverdes falado", "tiverem falado"]],
  ["comer", "futPerf", ["terei comido", "terás comido", "terá comido", "teremos comido", "tereis comido", "terão comido"]],
  ["escrever", "plusc", ["tinha escrito", "tinhas escrito", "tinha escrito", "tínhamos escrito", "tínheis escrito", "tinham escrito"]],
  ["poder", "imp", ["–", "–", "–", "–", "–", "–"]],
];
const check = (inf, tense, want) => {
  const v = by.get(inf);
  if (!v) return errors.push(`golden: ${inf} not in the file`);
  const got = v.rows.map((r) => r[tense].f);
  want.forEach((w, i) => { if (got[i] !== w) errors.push(`${inf}.${tense}[${i}]: "${got[i]}", expected "${w}"`); });
};
for (const [inf, t, s] of GOLD) check(inf, t, s.split(" "));
for (const [inf, t, l] of GOLD_MULTI) check(inf, t, l);
for (const [inf, ger, p2] of [["levantar-se", "levantando-se", "levantado"], ["ir-se", "indo-se", "ido"], ["vestir", "vestindo", "vestido"],
  ["ler", "lendo", "lido"], ["ouvir", "ouvindo", "ouvido"], ["trazer", "trazendo", "trazido"], ["cair", "caindo", "caído"], ["sair", "saindo", "saído"],
  ["construir", "construindo", "construído"], ["rir", "rindo", "rido"], ["ir", "indo", "ido"], ["ser", "sendo", "sido"], ["falar", "falando", "falado"],
  ["pôr", "pondo", "posto"], ["vir", "vindo", "vindo"], ["fazer", "fazendo", "feito"], ["abrir", "abrindo", "aberto"], ["escrever", "escrevendo", "escrito"],
  ["ver", "vendo", "visto"], ["dizer", "dizendo", "dito"]]) {
  const v = by.get(inf);
  if (v?.ger !== ger) errors.push(`${inf}: gerund "${v?.ger}", expected "${ger}"`);
  if (v?.p2 !== p2) errors.push(`${inf}: participle "${v?.p2}", expected "${p2}"`);
}
for (const [inf, p2b] of [["aceitar", "aceite"], ["entregar", "entregue"], ["pagar", "pago"]]) if (by.get(inf)?.p2b !== p2b) errors.push(`${inf}: second participle should be ${p2b}`);
if (by.get("falar").rows.some((r) => ROW_TENSES.some((k) => r[k].x))) errors.push("falar: a highlighted form on the model verb");
if (!by.get("ter").rows[0].praes.x || by.get("ter").rows[3].praes.x) errors.push("ter: highlight wrong (tenho yes, temos no)");
if (!by.get("falar").rows[3].praet.f.endsWith("ámos")) errors.push("falar: nós perfeito must carry the pt-PT accent (falámos)");

// --- 3. spelling -------------------------------------------------------------------------------
// Pre-1990 spellings that must never appear, and the endings every verb shares.
const strip = (f) => f.replace(/^(não )?(me|te|se|nos|vos) /, "").replace(/-(me|te|se|nos|vos)$/, "");
const BANNED = new Set(["veêm", "leêm", "creêm", "vêem", "lêem", "crêem", "vôo", "pára"]);
const rule = (ok, v, tense, i, f, msg) => { if (!ok) errors.push(`${v.inf}.${tense}[${i}] "${f}": ${msg}`); };
for (const v of verbs) {
  v.rows.forEach((r, i) => {
    for (const k of ROW_TENSES) {
      const f = r[k].f;
      if (f === DASH) continue;
      for (const w of f.split(/[ -]/)) if (BANNED.has(w)) errors.push(`${v.inf}.${k}: "${f}" has the old spelling ${w}`);
      if (/[^a-zçãõáéíóúâêô –-]/.test(f)) errors.push(`${v.inf}.${k}: odd character in "${f}"`);
      if (/,|\s{2}|--/.test(f)) errors.push(`${v.inf}.${k}: bad spacing in "${f}"`);
    }
    const form = (k) => { const f = r[k].f; return f === DASH ? null : strip(f); };
    const on = (k, test, msg) => { const f = form(k); if (f) rule(test(f), v, k, i, f, msg); };
    if (i === 4) {
      on("praet", (f) => /stes$/.test(f), "perfeito vós ends in -stes");
      on("cond", (f) => /íeis$/.test(f), "condicional vós ends in -íeis");
      on("subjImpf", (f) => /sseis$/.test(f), "imperfeito do conjuntivo vós ends in -sseis");
    }
    if (i === 3) {
      on("cond", (f) => /íamos$/.test(f), "condicional nós ends in -íamos");
      on("subjImpf", (f) => /ssemos$/.test(f) && /[áéêíóô]/.test(f.slice(-9)), "imperfeito do conjuntivo nós needs an accent");
    }
    if (i === 5) on("praes", (f) => /(am|em|ão|õem|êm)$/.test(f), "presente eles: -am, -em, -ão, -õem, -êm");
    if (i === 1) on("praes", (f) => /s$/.test(f), "presente tu ends in -s");
  });
}

// --- 4. agreement with the reference list -----------------------------------------------------
// That list is written by hand: "eu presente · ele perfeito · particípio". A mismatch means one
// of the two files is wrong.
const list = read("src/data/nachschlagen/starke-schwache-verben.json");
let compared = 0;
for (const s of by.has("falar") ? list.sections : []) {
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
