// The spec of a partner or group worksheet (src/data/partneruebungen/<id>.json), checked in
// plain JS. The skill `partner-arbeitsblatt` (references/spec-schema.md) gives the outline;
// this file is the exact contract the pages, the PDF generator and the Tandembögen share.
//
// validateSheet(spec) → [] when the sheet is fine, else a list of messages that each name
// the field („karten[1].schritte[0].items[2].kacheln: …“). Nothing here touches the file
// system, so the browser, the API route and the Node scripts use the same check.
//
// A card's steps (`karten[].schritte[]`), by `typ`:
//   allein     items to order alone: situation + scrambled tiles → own answer sentence.
//              An item may carry `frage` + `frageKacheln`: the question the partner asks it.
//   zusammen   ask the partner about `fragenAn` (letters of the partner's items); the card
//              shows each item's situation and question tiles, the answer is written down.
//   tabelle    an info-gap table: `spalten`, `zeilen` of cells; null = ask for it.
//   rolle      a role card: `rolle`, `ziel`, `infos`, `redemittel`.
//   raster     a 3×3 bingo/survey grid: `felder` (9).
//   bild       a picture drawn from icons: `szene` [{ icon, x, y, text? }] in percent.
//   wuerfel    `regel` [{ wurf, form }] and `felder` to play.
//   regeln     game rules as numbered `schritte`.
//   schreiben  a writing task: `vorgabe`, optional `kacheln`, `zeilen` to write on.
//   interview  `fragen` [{ frage | kacheln }], notes column, optional `bericht` sentence.
import { shuffle } from "../arbeitsblatt/seed.js";
import { hasIcon } from "./icons.js";

export const FORMATS = ["infogap-ab", "dialog-muster", "interview", "rollenspiel", "bingo-umfrage", "spiel", "bildvergleich", "wuerfel", "schreiben-zu-zweit"];
export const FORMAT_NAMES = {
  "infogap-ab": "Information gap",
  "dialog-muster": "Model dialogue",
  interview: "Interview",
  rollenspiel: "Role play",
  "bingo-umfrage": "Bingo / survey",
  spiel: "Game",
  bildvergleich: "Spot the difference",
  wuerfel: "Dice game",
  "schreiben-zu-zweit": "Writing in pairs",
};
export const STEP_TYPES = ["allein", "zusammen", "tabelle", "rolle", "raster", "bild", "wuerfel", "regeln", "schreiben", "interview"];
export const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const ROLES = ["A", "B", "C", "D"];

const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isStrList = (v, min = 1) => Array.isArray(v) && v.length >= min && v.every(isStr);
/** Table headers and cells may be empty strings (a blank corner cell). */
const isCells = (v, min = 1) => Array.isArray(v) && v.length >= min && v.every((c) => typeof c === "string");
/** Words of a sentence without punctuation, for comparing tile orders. */
const words = (s) => String(s).toLowerCase().replace(/[.,!?;:„“"…]/g, " ").split(/\s+/).filter(Boolean);

/** The order a tile row is printed in: seeded by sheet id + item letter, never the solution's. */
export function tileOrder(id, letter, tiles, loesung) {
  let out = shuffle(tiles, `${id}:${letter}`);
  const right = loesung ? words(loesung).join(" ") : null;
  for (let i = 0; right && i < out.length && words(out.join(" ")).join(" ") === right; i++) out = [...out.slice(1), out[0]];
  return out;
}

/** Every item with a letter, across all cards: letter → { item, rolle }. */
export function itemsByLetter(spec) {
  const map = new Map();
  for (const k of spec.karten ?? []) {
    for (const s of k.schritte ?? []) for (const it of s.items ?? []) map.set(it.buchstabe, { item: it, rolle: k.rolle });
  }
  return map;
}

export function validateSheet(spec) {
  const err = [];
  const need = (cond, field, msg) => { if (!cond) err.push(`${field}: ${msg}`); };
  if (!spec || typeof spec !== "object") return ["spec: kein Objekt"];

  need(/^(pa|ga)-(a1|a2|b1|b2|c1)-[a-z0-9-]+$/.test(spec.id ?? ""), "id", "erwartet pa-<niveau>-<slug> oder ga-<niveau>-<slug>");
  need(isStr(spec.titel), "titel", "fehlt");
  need(isStr(spec.untertitel), "untertitel", "fehlt");
  need(LEVELS.includes(spec.niveau), "niveau", `eins von ${LEVELS.join(", ")}`);
  need(isStr(spec.thema), "thema", "fehlt");
  need(isStrList(spec.grammatik), "grammatik", "Liste mit mindestens einem Eintrag");
  need(FORMATS.includes(spec.format), "format", `eins von ${FORMATS.join(", ")}`);
  need(["paar", "gruppe"].includes(spec.modus), "modus", "paar oder gruppe");
  const group = spec.modus === "gruppe";
  need(group ? [3, 4].includes(spec.personen) : spec.personen === 2, "personen", group ? "3 oder 4 in einer Gruppe" : "2 bei einem Paar");
  need(Number.isInteger(spec.dauerMin) && spec.dauerMin >= 5 && spec.dauerMin <= 90, "dauerMin", "ganze Minuten, 5–90");
  if (spec.id) need(spec.id.startsWith(group ? "ga-" : "pa-"), "id", group ? "Gruppenblätter beginnen mit ga-" : "Paarblätter beginnen mit pa-");
  if (spec.id && spec.niveau) need(spec.id.split("-")[1] === spec.niveau.toLowerCase(), "id", "Niveau in der Id passt nicht zu niveau");

  // Intro
  const intro = spec.intro;
  if (!intro || typeof intro !== "object") err.push("intro: fehlt");
  else {
    const g = intro.grammatik;
    if (!g) err.push("intro.grammatik: fehlt");
    else {
      need(isStr(g.regel), "intro.grammatik.regel", "fehlt");
      need(Array.isArray(g.positionen) && g.positionen.length >= 1 && g.positionen.every((r) => isStrList(r, 2)), "intro.grammatik.positionen", "Liste von Zeilen mit mindestens zwei Zellen");
      if (g.kopf != null) need(isCells(g.kopf) && g.kopf.length === g.positionen?.[0]?.length, "intro.grammatik.kopf", "eine Überschrift je Spalte");
      for (const key of ["verb", "schluessel"]) {
        const ix = g.markiere?.[key];
        if (ix != null) need(Array.isArray(ix) && ix.every((i) => Number.isInteger(i) && i >= 0 && i < (g.positionen?.[0]?.length ?? 0)), `intro.grammatik.markiere.${key}`, "Spaltennummern der Positionstabelle");
      }
      if (g.tabelle != null) {
        need(isCells(g.tabelle.kopf), "intro.grammatik.tabelle.kopf", "Überschriften");
        need(Array.isArray(g.tabelle.zeilen) && g.tabelle.zeilen.every((r) => isCells(r) && r.length === g.tabelle.kopf?.length), "intro.grammatik.tabelle.zeilen", "Zeilen so breit wie kopf");
      }
    }
    need(Array.isArray(intro.redemittel) && intro.redemittel.length >= 1 && intro.redemittel.every((r) => isStr(r.p1) && isStr(r.p2) && (r.p3 == null || isStr(r.p3))), "intro.redemittel", "Liste von { p1, p2, p3? }");
    need(isStrList(intro.soGehts, 2), "intro.soGehts", "mindestens zwei Schritte");
  }

  // Cards
  const cards = Array.isArray(spec.karten) ? spec.karten : [];
  need(cards.length === (spec.personen ?? 2), "karten", `${spec.personen ?? 2} Karten (eine je Person)`);
  const roles = cards.map((k) => k.rolle);
  need(roles.every((r, i) => r === ROLES[i]), "karten", `Rollen der Reihe nach ${ROLES.slice(0, cards.length).join(", ")}`);
  const letters = new Set();
  const byLetter = itemsByLetter(spec);
  cards.forEach((k, ki) => {
    const f = `karten[${ki}]`;
    if (!k.tipp) err.push(`${f}.tipp: fehlt (der Tipp-Kasten steht oben auf jeder Karte)`);
    else {
      need(isStr(k.tipp.formel), `${f}.tipp.formel`, "fehlt");
      // Optional: a card whose first step shows a worked example row needs no second one here.
      if (k.tipp.beispiel != null) need(isStr(k.tipp.beispiel), `${f}.tipp.beispiel`, "ein Satz");
      if (k.tipp.hinweise != null) need(isStrList(k.tipp.hinweise, 0), `${f}.tipp.hinweise`, "Liste von Sätzen");
    }
    need(Array.isArray(k.schritte) && k.schritte.length >= 1, `${f}.schritte`, "mindestens ein Schritt");
    if (k.undSie != null) need(isStr(k.undSie), `${f}.undSie`, "ein Satz");
    (k.schritte ?? []).forEach((s, si) => validateStep(s, `${f}.schritte[${si}]`, { spec, card: k, letters, byLetter, need, err }));
  });

  // Info gap: a card never shows the answers it is meant to ask for.
  cards.forEach((k, ki) => {
    const asked = (k.schritte ?? []).flatMap((s) => (s.typ === "zusammen" ? s.fragenAn ?? [] : []));
    const text = JSON.stringify(k);
    for (const l of asked) {
      const it = byLetter.get(l)?.item;
      if (it?.loesung && text.includes(it.loesung)) err.push(`karten[${ki}]: zeigt die Lösung von ${l} („${it.loesung}“), nach der die Karte fragen soll`);
    }
  });

  if (spec.zusammen != null) {
    const z = spec.zusammen;
    if (z.freiFragen != null) need(isStrList(z.freiFragen), "zusammen.freiFragen", "Liste von Fragen");
    if (z.wortkarten != null) need(isStrList(z.wortkarten), "zusammen.wortkarten", "Liste von Wörtern");
    if (z.regeln != null) need(isStrList(z.regeln, 2), "zusammen.regeln", "Spielregeln für alle, mindestens zwei");
  }
  if (group) {
    const g = spec.gruppe;
    need(g && g.ergebnis && isStrList(g.ergebnis.spalten) && isStr(g.ergebnis.bericht), "gruppe.ergebnis", "{ spalten, bericht } für die gemeinsame Tabelle");
    need(g && isStr(g.rotation), "gruppe.rotation", "z. B. „Runde 2: Tauschen Sie die Karte nach links.“");
  } else need(spec.gruppe == null, "gruppe", "nur bei modus gruppe");

  need(Array.isArray(spec.loesungen) && spec.loesungen.length >= 1 && spec.loesungen.every((l) => isStr(l.antwort)), "loesungen", "Liste von { buchstabe?, frage?, antwort }");
  for (const l of spec.loesungen ?? []) if (l.buchstabe) need(letters.has(l.buchstabe), "loesungen", `Buchstabe ${l.buchstabe} gibt es auf keiner Karte`);

  const q = spec.quelle;
  need(q && q.veraenderung === 2, "quelle.veraenderung", "Website-Blätter haben Veränderungsgrad 2");
  need(q && typeof q.geprueft === "boolean", "quelle.geprueft", "true oder false");
  if (q?.intern != null) need(isStr(q.intern), "quelle.intern", "Text");
  return err;
}

function validateStep(s, f, { spec, card, letters, byLetter, need, err }) {
  need(STEP_TYPES.includes(s?.typ), `${f}.typ`, `eins von ${STEP_TYPES.join(", ")}`);
  need(isStr(s?.anweisung), `${f}.anweisung`, "fehlt");
  switch (s?.typ) {
    case "allein":
      need(Array.isArray(s.items) && s.items.length >= 1, `${f}.items`, "mindestens ein Item");
      (s.items ?? []).forEach((it, i) => {
        const g = `${f}.items[${i}]`;
        need(/^[A-H]$/.test(it.buchstabe ?? ""), `${g}.buchstabe`, "A–H");
        need(!letters.has(it.buchstabe), `${g}.buchstabe`, `${it.buchstabe} kommt doppelt vor`);
        letters.add(it.buchstabe);
        need(isStr(it.situation), `${g}.situation`, "fehlt");
        if (it.icon != null) need(hasIcon(it.icon), `${g}.icon`, `„${it.icon}“ gibt es nicht in src/lib/partneruebungen/icons.js`);
        if (it.zeilen != null) need(Number.isInteger(it.zeilen) && it.zeilen >= 1 && it.zeilen <= 4, `${g}.zeilen`, "1–4 Schreibzeilen");
        need(isStrList(it.kacheln, 2), `${g}.kacheln`, "mindestens zwei Kacheln");
        need(isStr(it.loesung), `${g}.loesung`, "fehlt");
        if (it.infinitive != null) need(Array.isArray(it.infinitive) && it.infinitive.every((w) => it.kacheln?.includes(w)), `${g}.infinitive`, "nur Wörter, die auch Kacheln sind");
        if (isStrList(it.kacheln, 2) && isStr(it.loesung)) {
          const shown = tileOrder(spec.id, it.buchstabe, it.kacheln, it.loesung);
          need(words(shown.join(" ")).join(" ") !== words(it.loesung).join(" "), `${g}.kacheln`, "stehen schon in der richtigen Reihenfolge");
        }
        if (it.frageKacheln != null) {
          need(isStrList(it.frageKacheln, 2), `${g}.frageKacheln`, "mindestens zwei Kacheln");
          need(isStr(it.frage), `${g}.frage`, "fehlt zu frageKacheln");
          if (isStrList(it.frageKacheln, 2) && isStr(it.frage)) {
            const shown = tileOrder(spec.id, `${it.buchstabe}?`, it.frageKacheln, it.frage);
            need(words(shown.join(" ")).join(" ") !== words(it.frage).join(" "), `${g}.frageKacheln`, "stehen schon in der richtigen Reihenfolge");
          }
        }
        if (it.frageInfinitive != null) need(Array.isArray(it.frageInfinitive) && it.frageInfinitive.every((w) => it.frageKacheln?.includes(w)), `${g}.frageInfinitive`, "nur Wörter, die auch Fragekacheln sind");
      });
      break;
    case "zusammen":
      need(isStrList(s.fragenAn), `${f}.fragenAn`, "Buchstaben der Partner-Items");
      for (const l of s.fragenAn ?? []) {
        const hit = byLetter.get(l);
        if (!hit) err.push(`${f}.fragenAn: ${l} gibt es auf keiner Karte`);
        else if (hit.rolle === card.rolle) err.push(`${f}.fragenAn: ${l} steht auf der eigenen Karte`);
        else need(isStrList(hit.item.frageKacheln, 2), `${f}.fragenAn`, `${l} braucht frage + frageKacheln`);
      }
      break;
    case "tabelle":
      need(isStrList(s.spalten, 2), `${f}.spalten`, "mindestens zwei Spalten");
      need(Array.isArray(s.zeilen) && s.zeilen.length >= 2 && s.zeilen.every((r) => Array.isArray(r) && r.length === s.spalten?.length && r.every((c) => c === null || isStr(c))), `${f}.zeilen`, "Zeilen so breit wie spalten; null = Lücke");
      need((s.zeilen ?? []).some((r) => r.includes(null)), `${f}.zeilen`, "ohne Lücke gibt es nichts zu fragen");
      break;
    case "rolle":
      need(isStr(s.rolle), `${f}.rolle`, "fehlt");
      need(isStr(s.ziel), `${f}.ziel`, "fehlt");
      need(isStrList(s.infos), `${f}.infos`, "mindestens eine Info");
      need(isStrList(s.redemittel), `${f}.redemittel`, "mindestens ein Redemittel");
      if (s.situationen != null) need(isStrList(s.situationen), `${f}.situationen`, "Liste");
      break;
    case "raster":
      need(isStrList(s.felder) && s.felder.length === 9, `${f}.felder`, "genau 9 Felder");
      break;
    case "bild":
      need(Array.isArray(s.szene) && s.szene.length >= 3 && s.szene.every((o) => hasIcon(o.icon) && o.x >= 0 && o.x <= 100 && o.y >= 0 && o.y <= 100), `${f}.szene`, "mindestens drei { icon, x, y } (x/y in Prozent, icon aus icons.js)");
      break;
    case "wuerfel":
      need(Array.isArray(s.regel) && s.regel.length >= 2 && s.regel.every((r) => isStr(r.wurf) && isStr(r.form)), `${f}.regel`, "Liste von { wurf, form }");
      need(isStrList(s.felder, 6), `${f}.felder`, "mindestens sechs Felder");
      break;
    case "regeln":
      need(isStrList(s.schritte, 2), `${f}.schritte`, "mindestens zwei Regeln");
      break;
    case "schreiben":
      need(Number.isInteger(s.zeilen) && s.zeilen >= 2 && s.zeilen <= 14, `${f}.zeilen`, "2–14 Schreibzeilen");
      if (s.kacheln != null) need(isStrList(s.kacheln), `${f}.kacheln`, "Liste");
      if (s.vorgabe != null) need(isStr(s.vorgabe), `${f}.vorgabe`, "Text");
      break;
    case "interview":
      need(Array.isArray(s.fragen) && s.fragen.length >= 2 && s.fragen.every((q) => isStr(q.frage) || isStrList(q.kacheln, 2)), `${f}.fragen`, "mindestens zwei { frage } oder { kacheln }");
      if (s.bericht != null) need(isStr(s.bericht), `${f}.bericht`, "ein Satzanfang");
      break;
  }
}

/** The spec as it may be shown: without quelle.intern (the catalogue id stays internal). */
export function publicSpec(spec) {
  const { quelle, ...rest } = spec;
  return { ...rest, quelle: { veraenderung: quelle?.veraenderung, geprueft: !!quelle?.geprueft } };
}
