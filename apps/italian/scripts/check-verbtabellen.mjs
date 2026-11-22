// Checks the Italian verb tables (docs/content-plan.md §4.1):
//
//   node scripts/check-verbtabellen.mjs          the gate
//   node scripts/check-verbtabellen.mjs --dump   also prints every form, for a human review
//
// 1. Shape: known groups, six forms in every stored tense, no forms stored on `regular: true`,
//    every minimum verb from the plan present, aux and regional note valid.
// 2. Golden forms: hand-checked forms for the patterns the generator has to get right.
// 3. Accents: a written accent only on the last vowel of a word (città, parlò, è), the ending
//    every verb shares (-ò / -à in the future, -ì / -ò / -é in the passato remoto).
// 4. Agreement with the reference list src/data/nachschlagen/starke-schwache-verben.json.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isCourseStandard } from "../src/lib/variety.js";
import { buildAll, DASH, ROW_TENSES, STORED_TENSES } from "../src/lib/verbtabellenCore.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(readFileSync(path.join(ROOT, f), "utf8"));
const data = read("src/data/verbtabellen.json");
const errors = [];
const verbs = buildAll(data.verbs);
const by = new Map(verbs.map((v) => [v.inf, v]));

// --- 1. shape --------------------------------------------------------------------------------
const MINIMUM = `parlare credere vedere dormire finire mangiare cominciare pagare giocare cercare essere avere stare andare
  fare dare dire venire uscire potere volere dovere sapere bere rimanere scegliere tenere togliere leggere scrivere
  prendere mettere chiudere aprire vivere nascere morire piacere sentire salire conoscere spegnere tradurre porre
  decidere perdere rompere offrire apparire sedersi alzarsi chiamarsi andarsene`.split(/\s+/);
for (const inf of MINIMUM) if (!by.has(inf)) errors.push(`${inf}: on the plan's minimum list, missing`);
const groupIds = new Set(data.groups.map((g) => g.id));
if (!isCourseStandard(data.variety)) errors.push('top level: variety must be "it-IT"');
if ("es419" in data) errors.push("top level: es419 is gone");
const AUXES = new Set(["avere", "essere", "avere/essere"]);
const seen = new Set();
for (const v of data.verbs) {
  if (seen.has(v.inf)) errors.push(`${v.inf}: listed twice`);
  seen.add(v.inf);
  if (!groupIds.has(v.group)) errors.push(`${v.inf}: unknown group ${v.group}`);
  if (!v.en || !v.level) errors.push(`${v.inf}: needs en and level`);
  if (v.aux && !AUXES.has(v.aux)) errors.push(`${v.inf}: aux ${v.aux}`);
  if (v.regional && (!v.regional.note || v.regional.note.length > 160)) errors.push(`${v.inf}: regional.note missing or over 160 characters`);
  if (/(sene)$/.test(v.inf) && !v.imp) errors.push(`${v.inf}: a verb with ne stores its imperative`);
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
  ["parlare", "praes", "parlo parli parla parliamo parlate parlano"],
  ["parlare", "praet", "parlavo parlavi parlava parlavamo parlavate parlavano"],
  ["parlare", "rem", "parlai parlasti parlò parlammo parlaste parlarono"],
  ["parlare", "fut", "parlerò parlerai parlerà parleremo parlerete parleranno"],
  ["parlare", "cond", "parlerei parleresti parlerebbe parleremmo parlereste parlerebbero"],
  ["parlare", "subj", "parli parli parli parliamo parliate parlino"],
  ["parlare", "subjImpf", "parlassi parlassi parlasse parlassimo parlaste parlassero"],
  ["parlare", "imp", "– parla parli parliamo parlate parlino"],
  ["parlare", "perf", "ho/parlato hai/parlato ha/parlato abbiamo/parlato avete/parlato hanno/parlato"],
  ["credere", "praes", "credo credi crede crediamo credete credono"],
  ["credere", "rem", "credei credesti credé credemmo credeste crederono"],
  ["credere", "fut", "crederò crederai crederà crederemo crederete crederanno"],
  ["credere", "subj", "creda creda creda crediamo crediate credano"],
  ["credere", "imp", "– credi creda crediamo credete credano"],
  ["dormire", "praes", "dormo dormi dorme dormiamo dormite dormono"],
  ["dormire", "praet", "dormivo dormivi dormiva dormivamo dormivate dormivano"],
  ["dormire", "rem", "dormii dormisti dormì dormimmo dormiste dormirono"],
  ["dormire", "fut", "dormirò dormirai dormirà dormiremo dormirete dormiranno"],
  ["dormire", "subjImpf", "dormissi dormissi dormisse dormissimo dormiste dormissero"],
  ["finire", "praes", "finisco finisci finisce finiamo finite finiscono"],
  ["finire", "subj", "finisca finisca finisca finiamo finiate finiscano"],
  ["finire", "imp", "– finisci finisca finiamo finite finiscano"],
  ["finire", "rem", "finii finisti finì finimmo finiste finirono"],
  ["capire", "praes", "capisco capisci capisce capiamo capite capiscono"],
  ["mangiare", "praes", "mangio mangi mangia mangiamo mangiate mangiano"],
  ["mangiare", "fut", "mangerò mangerai mangerà mangeremo mangerete mangeranno"],
  ["mangiare", "subj", "mangi mangi mangi mangiamo mangiate mangino"],
  ["mangiare", "rem", "mangiai mangiasti mangiò mangiammo mangiaste mangiarono"],
  ["cominciare", "praes", "comincio cominci comincia cominciamo cominciate cominciano"],
  ["cominciare", "fut", "comincerò comincerai comincerà cominceremo comincerete cominceranno"],
  ["studiare", "praes", "studio studi studia studiamo studiate studiano"],
  ["pagare", "praes", "pago paghi paga paghiamo pagate pagano"],
  ["pagare", "fut", "pagherò pagherai pagherà pagheremo pagherete pagheranno"],
  ["pagare", "subj", "paghi paghi paghi paghiamo paghiate paghino"],
  ["pagare", "cond", "pagherei pagheresti pagherebbe pagheremmo paghereste pagherebbero"],
  ["giocare", "praes", "gioco giochi gioca giochiamo giocate giocano"],
  ["giocare", "fut", "giocherò giocherai giocherà giocheremo giocherete giocheranno"],
  ["cercare", "praes", "cerco cerchi cerca cerchiamo cercate cercano"],
  ["cercare", "subj", "cerchi cerchi cerchi cerchiamo cerchiate cerchino"],
  ["cercare", "imp", "– cerca cerchi cerchiamo cercate cerchino"],
  ["essere", "praes", "sono sei è siamo siete sono"],
  ["essere", "cond", "sarei saresti sarebbe saremmo sareste sarebbero"],
  ["essere", "perf", "sono/stato/a sei/stato/a è/stato/a siamo/stati/e siete/stati/e sono/stati/e"],
  ["essere", "plusc", "ero/stato/a eri/stato/a era/stato/a eravamo/stati/e eravate/stati/e erano/stati/e"],
  ["essere", "subjPlusc", "fossi/stato/a fossi/stato/a fosse/stato/a fossimo/stati/e foste/stati/e fossero/stati/e"],
  ["avere", "praes", "ho hai ha abbiamo avete hanno"],
  ["avere", "praet", "avevo avevi aveva avevamo avevate avevano"],
  ["avere", "rem", "ebbi avesti ebbe avemmo aveste ebbero"],
  ["avere", "fut", "avrò avrai avrà avremo avrete avranno"],
  ["avere", "subj", "abbia abbia abbia abbiamo abbiate abbiano"],
  ["avere", "subjImpf", "avessi avessi avesse avessimo aveste avessero"],
  ["avere", "imp", "– abbi abbia abbiamo abbiate abbiano"],
  ["stare", "praes", "sto stai sta stiamo state stanno"],
  ["stare", "fut", "starò starai starà staremo starete staranno"],
  ["stare", "imp", "– sta' stia stiamo state stiano"],
  ["andare", "praes", "vado vai va andiamo andate vanno"],
  ["andare", "fut", "andrò andrai andrà andremo andrete andranno"],
  ["andare", "cond", "andrei andresti andrebbe andremmo andreste andrebbero"],
  ["andare", "subj", "vada vada vada andiamo andiate vadano"],
  ["andare", "imp", "– va' vada andiamo andate vadano"],
  ["andare", "perf", "sono/andato/a sei/andato/a è/andato/a siamo/andati/e siete/andati/e sono/andati/e"],
  ["fare", "praes", "faccio fai fa facciamo fate fanno"],
  ["fare", "praet", "facevo facevi faceva facevamo facevate facevano"],
  ["fare", "rem", "feci facesti fece facemmo faceste fecero"],
  ["fare", "fut", "farò farai farà faremo farete faranno"],
  ["fare", "subj", "faccia faccia faccia facciamo facciate facciano"],
  ["fare", "subjImpf", "facessi facessi facesse facessimo faceste facessero"],
  ["dare", "praes", "do dai dà diamo date danno"],
  ["dare", "rem", "diedi desti diede demmo deste diedero"],
  ["dare", "subjImpf", "dessi dessi desse dessimo deste dessero"],
  ["dire", "praes", "dico dici dice diciamo dite dicono"],
  ["dire", "praet", "dicevo dicevi diceva dicevamo dicevate dicevano"],
  ["dire", "rem", "dissi dicesti disse dicemmo diceste dissero"],
  ["dire", "subj", "dica dica dica diciamo diciate dicano"],
  ["dire", "subjImpf", "dicessi dicessi dicesse dicessimo diceste dicessero"],
  ["dire", "imp", "– di' dica diciamo dite dicano"],
  ["venire", "praes", "vengo vieni viene veniamo venite vengono"],
  ["venire", "rem", "venni venisti venne venimmo veniste vennero"],
  ["venire", "fut", "verrò verrai verrà verremo verrete verranno"],
  ["venire", "cond", "verrei verresti verrebbe verremmo verreste verrebbero"],
  ["venire", "subj", "venga venga venga veniamo veniate vengano"],
  ["venire", "imp", "– vieni venga veniamo venite vengano"],
  ["uscire", "praes", "esco esci esce usciamo uscite escono"],
  ["uscire", "subj", "esca esca esca usciamo usciate escano"],
  ["potere", "praes", "posso puoi può possiamo potete possono"],
  ["potere", "rem", "potei potesti poté potemmo poteste poterono"],
  ["potere", "fut", "potrò potrai potrà potremo potrete potranno"],
  ["potere", "subj", "possa possa possa possiamo possiate possano"],
  ["volere", "praes", "voglio vuoi vuole vogliamo volete vogliono"],
  ["volere", "rem", "volli volesti volle volemmo voleste vollero"],
  ["volere", "cond", "vorrei vorresti vorrebbe vorremmo vorreste vorrebbero"],
  ["volere", "subj", "voglia voglia voglia vogliamo vogliate vogliano"],
  ["dovere", "praes", "devo devi deve dobbiamo dovete devono"],
  ["dovere", "cond", "dovrei dovresti dovrebbe dovremmo dovreste dovrebbero"],
  ["dovere", "subj", "debba debba debba dobbiamo dobbiate debbano"],
  ["sapere", "praes", "so sai sa sappiamo sapete sanno"],
  ["sapere", "rem", "seppi sapesti seppe sapemmo sapeste seppero"],
  ["sapere", "subj", "sappia sappia sappia sappiamo sappiate sappiano"],
  ["sapere", "imp", "– sappi sappia sappiamo sappiate sappiano"],
  ["bere", "praes", "bevo bevi beve beviamo bevete bevono"],
  ["bere", "praet", "bevevo bevevi beveva bevevamo bevevate bevevano"],
  ["bere", "rem", "bevvi bevesti bevve bevemmo beveste bevvero"],
  ["bere", "fut", "berrò berrai berrà berremo berrete berranno"],
  ["bere", "subj", "beva beva beva beviamo beviate bevano"],
  ["rimanere", "praes", "rimango rimani rimane rimaniamo rimanete rimangono"],
  ["rimanere", "fut", "rimarrò rimarrai rimarrà rimarremo rimarrete rimarranno"],
  ["rimanere", "rem", "rimasi rimanesti rimase rimanemmo rimaneste rimasero"],
  ["scegliere", "praes", "scelgo scegli sceglie scegliamo scegliete scelgono"],
  ["scegliere", "subj", "scelga scelga scelga scegliamo scegliate scelgano"],
  ["tenere", "praes", "tengo tieni tiene teniamo tenete tengono"],
  ["tenere", "fut", "terrò terrai terrà terremo terrete terranno"],
  ["togliere", "praes", "tolgo togli toglie togliamo togliete tolgono"],
  ["togliere", "subj", "tolga tolga tolga togliamo togliate tolgano"],
  ["vedere", "praes", "vedo vedi vede vediamo vedete vedono"],
  ["vedere", "rem", "vidi vedesti vide vedemmo vedeste videro"],
  ["vedere", "fut", "vedrò vedrai vedrà vedremo vedrete vedranno"],
  ["vedere", "subj", "veda veda veda vediamo vediate vedano"],
  ["leggere", "rem", "lessi leggesti lesse leggemmo leggeste lessero"],
  ["scrivere", "rem", "scrissi scrivesti scrisse scrivemmo scriveste scrissero"],
  ["prendere", "rem", "presi prendesti prese prendemmo prendeste presero"],
  ["mettere", "rem", "misi mettesti mise mettemmo metteste misero"],
  ["chiudere", "rem", "chiusi chiudesti chiuse chiudemmo chiudeste chiusero"],
  ["aprire", "praes", "apro apri apre apriamo aprite aprono"],
  ["aprire", "subj", "apra apra apra apriamo apriate aprano"],
  ["vivere", "fut", "vivrò vivrai vivrà vivremo vivrete vivranno"],
  ["vivere", "rem", "vissi vivesti visse vivemmo viveste vissero"],
  ["nascere", "rem", "nacqui nascesti nacque nascemmo nasceste nacquero"],
  ["morire", "praes", "muoio muori muore moriamo morite muoiono"],
  ["morire", "subj", "muoia muoia muoia moriamo moriate muoiano"],
  ["piacere", "praes", "piaccio piaci piace piacciamo piacete piacciono"],
  ["piacere", "subj", "piaccia piaccia piaccia piacciamo piacciate piacciano"],
  ["salire", "praes", "salgo sali sale saliamo salite salgono"],
  ["salire", "subj", "salga salga salga saliamo saliate salgano"],
  ["conoscere", "praes", "conosco conosci conosce conosciamo conoscete conoscono"],
  ["conoscere", "rem", "conobbi conoscesti conobbe conoscemmo conosceste conobbero"],
  ["conoscere", "subj", "conosca conosca conosca conosciamo conosciate conoscano"],
  ["spegnere", "praes", "spengo spegni spegne spegniamo spegnete spengono"],
  ["tradurre", "praes", "traduco traduci traduce traduciamo traducete traducono"],
  ["tradurre", "rem", "tradussi traducesti tradusse traducemmo traduceste tradussero"],
  ["tradurre", "fut", "tradurrò tradurrai tradurrà tradurremo tradurrete tradurranno"],
  ["tradurre", "subjImpf", "traducessi traducessi traducesse traducessimo traduceste traducessero"],
  ["porre", "praes", "pongo poni pone poniamo ponete pongono"],
  ["porre", "subj", "ponga ponga ponga poniamo poniate pongano"],
  ["porre", "fut", "porrò porrai porrà porremo porrete porranno"],
  ["porre", "subjImpf", "ponessi ponessi ponesse ponessimo poneste ponessero"],
  ["decidere", "rem", "decisi decidesti decise decidemmo decideste decisero"],
  ["perdere", "rem", "persi perdesti perse perdemmo perdeste persero"],
  ["rompere", "rem", "ruppi rompesti ruppe rompemmo rompeste ruppero"],
  ["apparire", "praes", "appaio appari appare appariamo apparite appaiono"],
  ["apparire", "subj", "appaia appaia appaia appariamo appariate appaiano"],
];
const GOLD_MULTI = [
  ["alzarsi", "praes", ["mi alzo", "ti alzi", "si alza", "ci alziamo", "vi alzate", "si alzano"]],
  ["alzarsi", "praet", ["mi alzavo", "ti alzavi", "si alzava", "ci alzavamo", "vi alzavate", "si alzavano"]],
  ["alzarsi", "perf", ["mi sono alzato/a", "ti sei alzato/a", "si è alzato/a", "ci siamo alzati/e", "vi siete alzati/e", "si sono alzati/e"]],
  ["alzarsi", "plusc", ["mi ero alzato/a", "ti eri alzato/a", "si era alzato/a", "ci eravamo alzati/e", "vi eravate alzati/e", "si erano alzati/e"]],
  ["alzarsi", "subj", ["mi alzi", "ti alzi", "si alzi", "ci alziamo", "vi alziate", "si alzino"]],
  ["alzarsi", "imp", ["–", "alzati", "si alzi", "alziamoci", "alzatevi", "si alzino"]],
  ["alzarsi", "impNeg", ["–", "non alzarti", "non si alzi", "non alziamoci", "non alzatevi", "non si alzino"]],
  ["chiamarsi", "imp", ["–", "chiamati", "si chiami", "chiamiamoci", "chiamatevi", "si chiamino"]],
  ["sedersi", "praes", ["mi siedo", "ti siedi", "si siede", "ci sediamo", "vi sedete", "si siedono"]],
  ["sedersi", "imp", ["–", "siediti", "si sieda", "sediamoci", "sedetevi", "si siedano"]],
  ["sedersi", "impNeg", ["–", "non sederti", "non si sieda", "non sediamoci", "non sedetevi", "non si siedano"]],
  ["sedersi", "perf", ["mi sono seduto/a", "ti sei seduto/a", "si è seduto/a", "ci siamo seduti/e", "vi siete seduti/e", "si sono seduti/e"]],
  ["andarsene", "praes", ["me ne vado", "te ne vai", "se ne va", "ce ne andiamo", "ve ne andate", "se ne vanno"]],
  ["andarsene", "perf", ["me ne sono andato/a", "te ne sei andato/a", "se ne è andato/a", "ce ne siamo andati/e", "ve ne siete andati/e", "se ne sono andati/e"]],
  ["andarsene", "fut", ["me ne andrò", "te ne andrai", "se ne andrà", "ce ne andremo", "ve ne andrete", "se ne andranno"]],
  ["andarsene", "imp", ["–", "vattene", "se ne vada", "andiamocene", "andatevene", "se ne vadano"]],
  ["andarsene", "impNeg", ["–", "non andartene", "non se ne vada", "non andiamocene", "non andatevene", "non se ne vadano"]],
  ["parlare", "impNeg", ["–", "non parlare", "non parli", "non parliamo", "non parlate", "non parlino"]],
  ["dire", "impNeg", ["–", "non dire", "non dica", "non diciamo", "non dite", "non dicano"]],
  ["parlare", "subjPlusc", ["avessi parlato", "avessi parlato", "avesse parlato", "avessimo parlato", "aveste parlato", "avessero parlato"]],
  ["parlare", "subjPerf", ["abbia parlato", "abbia parlato", "abbia parlato", "abbiamo parlato", "abbiate parlato", "abbiano parlato"]],
  ["parlare", "futPerf", ["avrò parlato", "avrai parlato", "avrà parlato", "avremo parlato", "avrete parlato", "avranno parlato"]],
  ["parlare", "condPerf", ["avrei parlato", "avresti parlato", "avrebbe parlato", "avremmo parlato", "avreste parlato", "avrebbero parlato"]],
  ["parlare", "plusc", ["avevo parlato", "avevi parlato", "aveva parlato", "avevamo parlato", "avevate parlato", "avevano parlato"]],
  ["andare", "condPerf", ["sarei andato/a", "saresti andato/a", "sarebbe andato/a", "saremmo andati/e", "sareste andati/e", "sarebbero andati/e"]],
  ["andare", "futPerf", ["sarò andato/a", "sarai andato/a", "sarà andato/a", "saremo andati/e", "sarete andati/e", "saranno andati/e"]],
  ["andare", "subjPerf", ["sia andato/a", "sia andato/a", "sia andato/a", "siamo andati/e", "siate andati/e", "siano andati/e"]],
  ["fare", "perf", ["ho fatto", "hai fatto", "ha fatto", "abbiamo fatto", "avete fatto", "hanno fatto"]],
  ["cominciare", "perf", ["ho cominciato", "hai cominciato", "ha cominciato", "abbiamo cominciato", "avete cominciato", "hanno cominciato"]],
  ["potere", "imp", ["–", "–", "–", "–", "–", "–"]],
  ["potere", "impNeg", ["–", "–", "–", "–", "–", "–"]],
];
const GOLD_ALT = [
  ["cominciare", "perf", ["sono cominciato/a", "sei cominciato/a", "è cominciato/a", "siamo cominciati/e", "siete cominciati/e", "sono cominciati/e"]],
  ["finire", "perf", ["sono finito/a", "sei finito/a", "è finito/a", "siamo finiti/e", "siete finiti/e", "sono finiti/e"]],
  ["salire", "plusc", ["ero salito/a", "eri salito/a", "era salito/a", "eravamo saliti/e", "eravate saliti/e", "erano saliti/e"]],
];
const check = (inf, tense, want, alt = false) => {
  const v = by.get(inf);
  if (!v) return errors.push(`golden: ${inf} not in the file`);
  const got = v.rows.map((r) => (alt ? r[tense].alt : r[tense].f));
  want.forEach((w, i) => { if (got[i] !== w) errors.push(`${inf}.${tense}${alt ? ".alt" : ""}[${i}]: "${got[i]}", expected "${w}"`); });
};
// "ho/parlato" in GOLD stands for "ho parlato": the slash replaces the space inside a space-split list.
for (const [inf, t, s] of GOLD) check(inf, t, s.split(" ").map((f) => f.replace(/^(\S+?)\/(\w.*)$/, (m, a, b) => (/^(ho|hai|ha|abbiamo|avete|hanno|sono|sei|è|siamo|siete|ero|eri|era|eravamo|eravate|erano|fossi|fosse|fossimo|foste|fossero)$/.test(a) ? `${a} ${b}` : m))));
for (const [inf, t, l] of GOLD_MULTI) check(inf, t, l);
for (const [inf, t, l] of GOLD_ALT) check(inf, t, l, true);
for (const [inf, ger, p2] of [["alzarsi", "alzandosi", "alzato"], ["andarsene", "andandosene", "andato"], ["sedersi", "sedendosi", "seduto"],
  ["fare", "facendo", "fatto"], ["dire", "dicendo", "detto"], ["bere", "bevendo", "bevuto"], ["essere", "essendo", "stato"], ["stare", "stando", "stato"],
  ["parlare", "parlando", "parlato"], ["credere", "credendo", "creduto"], ["dormire", "dormendo", "dormito"], ["finire", "finendo", "finito"],
  ["venire", "venendo", "venuto"], ["tradurre", "traducendo", "tradotto"], ["porre", "ponendo", "posto"], ["vedere", "vedendo", "visto"],
  ["mangiare", "mangiando", "mangiato"], ["rimanere", "rimanendo", "rimasto"], ["nascere", "nascendo", "nato"], ["morire", "morendo", "morto"]]) {
  const v = by.get(inf);
  if (v?.ger !== ger) errors.push(`${inf}: gerund "${v?.ger}", expected "${ger}"`);
  if (v?.p2 !== p2) errors.push(`${inf}: participle "${v?.p2}", expected "${p2}"`);
}
for (const [inf, aux] of [["andare", "essere"], ["fare", "avere"], ["alzarsi", "essere"], ["cominciare", "avere/essere"], ["finire", "avere/essere"], ["nascere", "essere"], ["piacere", "essere"], ["potere", "avere"]]) {
  if (by.get(inf)?.aux !== aux) errors.push(`${inf}: aux "${by.get(inf)?.aux}", expected "${aux}"`);
}
const model = by.get("parlare").rows;
if (model.some((r) => ROW_TENSES.some((k) => r[k].x))) errors.push("parlare: a highlighted form on the model verb");
if (!by.get("venire").rows[0].praes.x || by.get("venire").rows[3].praes.x) errors.push("venire: highlight wrong (vengo yes, veniamo no)");
if (!by.get("cercare").rows[1].praes.x || by.get("cercare").rows[0].praes.x) errors.push("cercare: highlight wrong (cerchi yes, cerco no)");
if (by.get("finire").rows.some((r) => ROW_TENSES.some((k) => r[k].x))) errors.push("finire: a highlighted form on the -isc- model (-isc- is the pattern of its group)");

// --- 3. accents ------------------------------------------------------------------------------
const rule = (ok, v, tense, i, f, msg) => { if (!ok) errors.push(`${v.inf}.${tense}[${i}] "${f}": ${msg}`); };
const BANNED = new Set(["perche", "citta", "e'", "pò", "qual'è", "sè", "dà'", "fà", "stà", "và", "dì'"]);
for (const v of verbs) {
  v.rows.forEach((r, i) => {
    for (const k of ROW_TENSES) {
      for (const f of [r[k].f, r[k].alt]) {
        if (!f || f === DASH) continue;
        if (/[^a-zàèéìòù' /–]/.test(f)) errors.push(`${v.inf}.${k}: odd character in "${f}"`);
        if (/\s{2}|^\s|\s$/.test(f)) errors.push(`${v.inf}.${k}: bad spacing in "${f}"`);
        for (const w of f.split(" ")) {
          if (BANNED.has(w)) errors.push(`${v.inf}.${k}: "${w}" is not Italian spelling`);
          // A written accent only on the last letter, except in the stressed vowel of nothing else.
          if (/[àèéìòù]./.test(w.replace(/[àèéìòù]'$/, ""))) errors.push(`${v.inf}.${k}: accent inside the word "${w}" in "${f}"`);
          if (/é/.test(w) && k !== "rem") errors.push(`${v.inf}.${k}: é in "${w}" (only the passato remoto -é: credé, poté)`);
        }
      }
    }
    const bare = (k) => r[k].f.replace(/^(non )?((mi|ti|si|ci|vi|me ne|te ne|se ne|ce ne|ve ne) )/, "");
    {
      const futs = bare("fut");
      if (i === 0) rule(/ò$/.test(futs), v, "fut", i, futs, "futuro io ends in -ò");
      if (i === 2) rule(/à$/.test(futs), v, "fut", i, futs, "futuro lui ends in -à");
      if (i === 0) rule(/ei$/.test(bare("cond")), v, "cond", i, bare("cond"), "condizionale io ends in -ei");
      if (i === 2) rule(/ebbe$/.test(bare("cond")), v, "cond", i, bare("cond"), "condizionale lui ends in -ebbe");
      if (i === 2) rule(/[òìé]$/.test(bare("rem")) || /(e|fu)$/.test(bare("rem")), v, "rem", i, bare("rem"), "passato remoto lui: -ò, -ì, -é, or a strong form in -e");
      if (i === 0) rule(/(i|ai)$/.test(bare("rem")), v, "rem", i, bare("rem"), "passato remoto io ends in -i");
      if (i === 5) rule(/(ero|rono)$/.test(bare("rem")), v, "rem", i, bare("rem"), "passato remoto loro ends in -rono or -ero");
      if (i === 3) rule(/mo$/.test(bare("praes")) && /mo$/.test(bare("subj")), v, "praes", i, bare("praes"), "noi ends in -mo (presente, congiuntivo)");
      if (i === 4) rule(/(ate|ete|ite|te)$/.test(bare("praes")), v, "praes", i, bare("praes"), "voi ends in -te");
      if (i === 4) rule(/iate$|ate$|ete$|ite$|te$/.test(bare("subj")), v, "subj", i, bare("subj"), "congiuntivo voi ends in -te");
    }
  });
}

// --- 4. agreement with the reference list -----------------------------------------------------
// That list is written by hand: "io presente · participio passato · io imperfetto". A mismatch
// means one of the two files is wrong.
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
    const mine = [v.rows[0].praes.f, v.p2, v.rows[0].praet.f];
    parts.forEach((p, i) => { if (mine[i] !== p) errors.push(`${inf}: reference list has "${p}", the table has "${mine[i]}"`); });
  }
}

if (process.argv.includes("--dump")) {
  for (const v of verbs) {
    console.log(`\n# ${v.inf} (ger ${v.ger}, p2 ${v.p2}, aux ${v.aux})`);
    for (const k of ROW_TENSES) console.log(`${k}: ${v.rows.map((r) => r[k].f + (r[k].alt ? ` / ${r[k].alt}` : "")).join(", ")}`);
  }
}
for (const e of errors) console.error(`  ERROR ${e}`);
console.log(`verbtabellen: ${verbs.length} verbs, ${compared} compared with the reference list, ${errors.length} errors`);
if (errors.length) process.exit(1);
