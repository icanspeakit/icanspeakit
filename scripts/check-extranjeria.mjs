// check:extranjeria — the Extranjería sim (src/lib/buergeramt, src/data/buergeramt) is consistent:
// every mistake a case claims really shows on its papers, nothing else contradicts, every rule a
// mistake needs is on that day's memo, and the fixes leave the case with what the stamp expects.
// Also: Spanish lines have ¿ ¡, every line has English, no English-course leftovers.
import { readFileSync } from "node:fs";
import { HANDFAELLE, DOK_ARTEN, WOERTER, spielFall, loese, richtig } from "../src/lib/buergeramt/faelle.js";
import { REGELN, FEHLER, TAGE, WIRR, regelnBis } from "../src/lib/buergeramt/regeln.js";
import { gleicherName, isoDatum, deDatum, wochentag } from "../src/lib/buergeramt/daten.js";

const kunden = JSON.parse(readFileSync(new URL("../src/data/buergeramt/kunden.json", import.meta.url), "utf8"));
const errs = [];
const err = (m) => errs.push(m);

// ---- lines ------------------------------------------------------------------------------
function linea(l, wo) {
  if (!l?.de || !l?.en) return err(`${wo}: needs de and en`);
  for (const [abre, cierra] of [["¿", "?"], ["¡", "!"]]) {
    const a = l.de.split(abre).length - 1, c = l.de.split(cierra).length - 1;
    if (a !== c) err(`${wo}: ${abre}${cierra} don't pair up: ${l.de}`);
  }
  if (/\b(Brambleford|UK|council|parking)\b/i.test(`${l.de} ${l.en}`)) err(`${wo}: English-course leftover: ${l.de}`);
}
for (const [k, arr] of Object.entries(kunden)) if (Array.isArray(arr)) arr.forEach((l, i) => linea(l, `kunden.${k}[${i}]`));
WIRR.forEach((l, i) => linea(l, `WIRR[${i}]`));
for (const [id, r] of Object.entries(REGELN)) {
  linea(r.memo, `regel ${id}.memo`);
  if (r.art === "echt") {
    linea(r.wirklich, `regel ${id}.wirklich`);
    if (!r.quelle || !/^https:\/\//.test(r.url ?? "")) err(`regel ${id}: real rule needs a source and a URL`);
  } else if (r.art === "lindenau") {
    if (r.wirklich) err(`regel ${id}: a made-up rule has no real-life text`);
  } else err(`regel ${id}: unknown art ${r.art}`);
  if (!regelnBis(r.tag).includes(id)) err(`regel ${id}: not on the memo of its first day ${r.tag}`);
}
for (const [code, f] of Object.entries(FEHLER)) {
  if (!REGELN[f.regel]) err(`fehler ${code}: unknown rule ${f.regel}`);
  linea(f.notiz, `fehler ${code}.notiz`);
  if (f.fragen.length !== 3 || !f.fragen[f.passt]) err(`fehler ${code}: three questions and a right one`);
  if (new Set(f.fragen.map((x) => x.de)).size !== 3) err(`fehler ${code}: questions repeat`);
  f.fragen.forEach((x, i) => linea(x, `fehler ${code}.fragen[${i}]`));
  if (f.loest) linea(f.loest, `fehler ${code}.loest`);
  linea(f.nicht, `fehler ${code}.nicht`);
}
for (const [art, d] of Object.entries(DOK_ARTEN)) {
  if (!d.kopf) err(`${art}: no kopf`);
  for (const w of [d.titel, ...d.felder.map((x) => x[1])]) if (!WOERTER[w]) err(`${art}: no English for "${w}"`);
}
for (const [tag, d] of Object.entries(TAGE)) {
  for (const r of d.regeln) if (!REGELN[r]) err(`day ${tag}: unknown rule ${r}`);
  if (["sábado", "domingo"].includes(wochentag(d.heute))) err(`day ${tag}: ${d.heute} is a weekend, the office is closed`);
}

// ---- the papers -------------------------------------------------------------------------
/** Everything that contradicts on the desk, as sets of field ids (one per contradiction). */
function widersprueche(c) {
  const out = [];
  const docs = c.dokumente.filter((d) => !d.weg);
  const id = docs.find((d) => d.art === "ausweis" || d.art === "pass");
  const heute = deDatum(c.heute);
  const add = (...fids) => out.push(fids);
  if (id) {
    for (const d of docs) {
      if (d === id) continue;
      for (const k of ["familienname", "vorname"]) {
        if (d.felder[k] !== undefined && !gleicherName(d.felder[k], id.felder[k])) add(`${d.id}.${k}`, `${id.id}.${k}`);
      }
      if (d.felder.geburtsdatum !== undefined && d.felder.geburtsdatum !== id.felder.geburtsdatum) add(`${d.id}.geburtsdatum`, `${id.id}.geburtsdatum`);
      if (d.felder.nummer !== undefined && d.felder.nummer !== id.felder.nummer) add(`${d.id}.nummer`, `${id.id}.nummer`);
      if (d.art === "cita" || d.art === "tasa") {
        if (!gleicherName(d.felder.name, `${id.felder.vorname} ${id.felder.familienname}`)) add(`${d.id}.name`);
      }
    }
    if (isoDatum(id.felder.gueltig) <= c.heute) add(`${id.id}.gueltig`);
  }
  const by = (id2) => docs.find((d) => d.id === id2);
  const hoja = by("meldeschein"), wgb = by("wgb"), sol = by("solicitud"), cita = by("cita"), tasa = by("tasa"), foto = by("foto");
  if (hoja && wgb) {
    if (hoja.felder.adresse !== wgb.felder.adresse) add("meldeschein.adresse", "wgb.adresse");
    if (hoja.felder.einzug !== wgb.felder.einzug) add("meldeschein.einzug", "wgb.einzug");
    if (!gleicherName(wgb.felder.personen, `${hoja.felder.vorname} ${hoja.felder.familienname}`)) add("wgb.personen");
  }
  if (hoja) {
    if (!hoja.felder.unterschrift) add("meldeschein.unterschrift");
    if (TAGE[c.tag].regeln.includes("wgb") && !wgb) add("meldeschein.adresse");
    const quiere = c.anliegen === "cambio" ? "Cambio de domicilio" : "Alta";
    if (hoja.felder.formular !== quiere) add("meldeschein.formular");
    if (isoDatum(hoja.felder.einzug) > c.heute) add("meldeschein.einzug");
  }
  if (sol) {
    if (!sol.felder.unterschrift) add("solicitud.unterschrift");
    if (sol.tinte && sol.tinte !== "schwarz") add("solicitud.unterschrift");
    const quiere = c.anliegen === "nie" ? "NIE (EX-15)" : "TIE (EX-17)";
    if (sol.felder.formular !== quiere) add("solicitud.formular");
    if (TAGE[c.tag].regeln.includes("tasa") && !tasa) add("solicitud.formular");
  }
  if (cita && cita.felder.datum !== heute) add("cita.datum");
  if (cita && !sol) err(`case ${c.nr}: an appointment without an application`);
  for (const d of [cita, tasa]) if (d && sol && !sol.felder.formular.startsWith(d.felder.tramite) && !out.some((x) => x.includes("solicitud.formular"))) add("solicitud.formular");
  if (tasa && isoDatum(tasa.felder.pagada) > c.heute) add("tasa.pagada");
  if (foto && foto.felder.fondo !== "blanco") add("foto.fondo");
  if (id?.fax) add(`${id.id}.kopf`);
  return out;
}

const nrs = new Set();
for (const c0 of HANDFAELLE) {
  const wo = `case ${c0.nr}`;
  if (nrs.has(c0.nr)) err(`${wo}: number repeats`);
  nrs.add(c0.nr);
  if (!TAGE[c0.tag]) { err(`${wo}: unknown day`); continue; }
  linea(c0.satz, `${wo}.satz`);
  const c = spielFall(c0);
  for (const d of c.dokumente) {
    const art = DOK_ARTEN[d.art];
    if (!art) { err(`${wo}: unknown paper ${d.art}`); continue; }
    for (const k of Object.keys(d.felder)) if (!art.felder.some((x) => x[0] === k)) err(`${wo}: ${d.id}.${k} isn't a field of ${d.art}`);
    if (art.opciones && !art.opciones.includes(d.felder.formular)) err(`${wo}: box "${d.felder.formular}" isn't on ${d.art}`);
  }
  const existe = (fid) => {
    const [dok, feld] = fid.split(".");
    if (dok === "kunde") return feld === "anliegen";
    if (dok === "kalender") return feld === "heute";
    if (dok === "memo") return TAGE[c.tag].regeln.includes(feld);
    const d = c.dokumente.find((x) => x.id === dok);
    return d && (feld === "kopf" || d.felder[feld] !== undefined);
  };
  const codes = new Set();
  for (const f of c.fehler) {
    if (codes.has(f.code)) err(`${wo}: mistake ${f.code} twice`);
    codes.add(f.code);
    const info = FEHLER[f.code];
    if (!info) { err(`${wo}: unknown mistake ${f.code}`); continue; }
    if (!TAGE[c.tag].regeln.includes(info.regel)) err(`${wo}: ${f.code} needs rule ${info.regel}, not on the memo of day ${c.tag}`);
    if (!f.paare.length) err(`${wo}: ${f.code} has no pairs`);
    for (const p of f.paare) for (const fid of p) if (!existe(fid)) err(`${wo}: ${f.code} points at missing field ${fid}`);
    if (f.loesbar && (!f.loesung || !info.loest)) err(`${wo}: ${f.code} is fixable, but has no fix or line`);
    if (!f.loesbar && !info.nicht) err(`${wo}: ${f.code} can't be fixed and has no line`);
  }

  // The papers contradict exactly where the mistakes say: `derivar`, `zimmer` and missing-paper
  // mistakes are about the request, so the papers themselves need not contradict for those.
  const seen = widersprueche(c);
  const felderDerFehler = new Set(c.fehler.flatMap((f) => f.paare.flat()));
  for (const w of seen) if (!w.some((fid) => felderDerFehler.has(fid))) err(`${wo}: unlisted contradiction at ${w.join(" / ")}`);
  const ohneWiderspruchOk = new Set(["derivar_arraigo", "derivar_regularizacion", "zimmer"]);
  for (const f of c.fehler) {
    if (ohneWiderspruchOk.has(f.code)) continue;
    if (!seen.some((w) => w.some((fid) => f.paare.flat().includes(fid)))) err(`${wo}: mistake ${f.code} doesn't show on the papers`);
  }

  // Stamp logic, before and after every fix.
  if (richtig(c) !== (c.fehler.length ? "abgelehnt" : "genehmigt")) err(`${wo}: wrong stamp`);
  for (const f of c.fehler) if (f.loesbar) loese(c, f);
  const offen = c.fehler.filter((f) => !f.loesbar);
  if (richtig(c) !== (offen.length ? "abgelehnt" : "genehmigt")) err(`${wo}: wrong stamp after the fixes`);
  if (!offen.length) {
    const rest = widersprueche(c);
    if (rest.length) err(`${wo}: still contradicts after the fixes: ${rest.map((w) => w.join(" / ")).join("; ")}`);
  }
}

for (const tag of Object.keys(TAGE)) {
  const n = HANDFAELLE.filter((c) => c.tag === Number(tag));
  if (!n.length) err(`day ${tag}: no cases`);
  if (!n.some((c) => !c.fehler.length)) err(`day ${tag}: no case with complete papers, so stamping DEVUELTO always wins`);
}
const benutzt = new Set(HANDFAELLE.flatMap((c) => c.fehler.map((f) => f.code)));
for (const code of Object.keys(FEHLER)) if (!benutzt.has(code) && !["familienname", "vorname"].includes(code)) err(`mistake ${code} isn't used in any case`);

if (errs.length) {
  console.error(`check:extranjeria: ${errs.length} problem(s)\n` + errs.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check:extranjeria: ${HANDFAELLE.length} cases, ${Object.keys(REGELN).length} rules, ${Object.keys(FEHLER).length} mistakes, ${Object.keys(TAGE).length} days: OK`);
