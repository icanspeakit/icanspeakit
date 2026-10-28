// Brunos Bürgeramt: cases. A case is plain JSON (docs/buergeramt-tier0-v1.md, "Datenmodell"):
// a person, what they want (`anliegen`), the papers they slide across the desk, and the
// mistakes in them. Every field has an id "<doc>.<field>", and every mistake lists the field
// pairs that show it, so the Prüfen mode compares ids, never text. Besides the papers there are
// three things on the desk with fields of their own: the calendar (kalender.heute), the
// customer's request in the speech bubble (kunde.anliegen) and Regi's memo (memo.<rule>).
//
// The right stamp is never stored: it is worked out from the case as it is now (`richtig`).
// Open mistakes → ABGELEHNT, none → GENEHMIGT; a mistake fixed by the right question is no
// longer open. That way the game can't contradict itself.

import { FEHLER } from "./regeln.js";

// The paper kinds and their fields, in the order they are printed. The labels are the real
// German words (that's the vocabulary); `kind` groups fields that can be compared ("Passt.").
export const DOK_ARTEN = {
  ausweis: {
    titel: "Ausweis",
    felder: [
      ["familienname", "Familienname", "name"], ["vorname", "Vorname", "vorname"],
      ["geburtsdatum", "Geburtsdatum", "geburtsdatum"], ["geburtsort", "Geburtsort", "ort"],
      ["gueltig", "Gültig bis", "datum"], ["unterschrift", "Unterschrift", "unterschrift"],
    ],
  },
  pass: {
    titel: "Reisepass",
    felder: [
      ["familienname", "Familienname", "name"], ["vorname", "Vorname", "vorname"],
      ["geburtsdatum", "Geburtsdatum", "geburtsdatum"], ["geburtsort", "Geburtsort", "ort"],
      ["gueltig", "Gültig bis", "datum"], ["unterschrift", "Unterschrift", "unterschrift"],
    ],
  },
  meldeschein: {
    titel: "Meldeschein",
    felder: [
      ["formular", "Formular", "formular"],
      ["familienname", "Familienname", "name"], ["vorname", "Vorname", "vorname"],
      ["geburtsdatum", "Geburtsdatum", "geburtsdatum"],
      ["adresse", "Neue Adresse", "adresse"], ["einzug", "Einzugsdatum", "datum"],
      ["unterschrift", "Unterschrift", "unterschrift"],
    ],
  },
  abmeldung: {
    titel: "Meldeschein",
    felder: [
      ["formular", "Formular", "formular"],
      ["familienname", "Familienname", "name"], ["vorname", "Vorname", "vorname"],
      ["geburtsdatum", "Geburtsdatum", "geburtsdatum"],
      ["adresse", "Bisherige Adresse", "adresse"], ["auszug", "Auszugsdatum", "datum"],
      ["ziel", "Neue Adresse", "adresse"],
      ["unterschrift", "Unterschrift", "unterschrift"],
    ],
  },
  wgb: {
    titel: "Wohnungsgeberbestätigung",
    felder: [
      ["wohnungsgeber", "Wohnungsgeber", "person"], ["adresse", "Adresse der Wohnung", "adresse"],
      ["einzug", "Einzugsdatum", "datum"], ["personen", "Meldepflichtige Person", "name"],
      ["unterschrift", "Unterschrift Wohnungsgeber", "unterschrift"],
    ],
  },
  antrag: {
    titel: "Antrag",
    felder: [["titel", "Antrag auf", "formular"], ["name", "Name", "name"], ["rasse", "Rasse", "ort"], ["unterschrift", "Pfote", "unterschrift"]],
  },
};
// Fields the Lernmodus leaves out: fewer lines to read, nothing a rule needs before Tag 6.
export const LERN_OHNE = new Set(["geburtsort", "wohnungsgeber"]);

/** The kind of a field id, for "Passt." versus "nothing to compare". */
export function feldKind(fall, fid) {
  const [dok, feld] = fid.split(".");
  if (dok === "memo" || dok === "kalender" || dok === "kunde") return dok;
  const d = fall.dokumente.find((x) => x.id === dok);
  return DOK_ARTEN[d?.art]?.felder.find((f) => f[0] === feld)?.[2] ?? "?";
}

const samePair = (p, a, b) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

/**
 * What tapping fields a and b shows, given what is already noted:
 *   { art: "fehler", fehler }   a mistake, not noted yet
 *   { art: "schon", fehler }    noted before
 *   { art: "geloest", fehler }  it was a mistake, fixed since
 *   { art: "passt" }            comparable and fine
 *   { art: "egal" }             nothing to compare
 */
export function vergleiche(fall, a, b) {
  if (a === b) return { art: "egal" };
  const f = fall.fehler.find((x) => x.paare.some((p) => samePair(p, a, b)));
  if (f) return { art: f.status === "geloest" ? "geloest" : f.status === "notiert" ? "schon" : "fehler", fehler: f };
  const ka = feldKind(fall, a), kb = feldKind(fall, b);
  const loose = ["memo", "kalender", "kunde"];
  return ka === kb || loose.includes(ka) || loose.includes(kb) ? { art: "passt" } : { art: "egal" };
}

export const offeneFehler = (fall) => fall.fehler.filter((f) => f.status !== "geloest");
export const notierteFehler = (fall) => fall.fehler.filter((f) => f.status === "notiert");
export const richtig = (fall) => (offeneFehler(fall).length ? "abgelehnt" : "genehmigt");
export const fehlerInfo = (f) => FEHLER[f.code];

/** A fresh, playable copy of a case (status per mistake, nothing asked yet). */
export function spielFall(fall) {
  const c = structuredClone(fall);
  for (const f of c.fehler) { f.status = "offen"; f.gefragt = false; }
  return c;
}

/**
 * The right question was asked: when the mistake can be fixed today, apply the fix
 * (`loesung`: set fields, or hand over a new paper) and mark it fixed. Returns what changed:
 * { geloest, neu: [doc ids], gesetzt: [field ids] }.
 */
export function loese(fall, f) {
  const out = { geloest: false, neu: [], gesetzt: [] };
  if (!f.loesbar || !f.loesung) return out;
  for (const s of f.loesung.setze ?? []) {
    const [dok, feld] = s.f.split(".");
    const d = fall.dokumente.find((x) => x.id === dok);
    if (d) { d.felder[feld] = s.wert; out.gesetzt.push(s.f); }
    if (s.tinte && d) d.tinte = s.tinte;
  }
  for (const d of f.loesung.neu ?? []) { fall.dokumente.push(structuredClone(d)); out.neu.push(d.id); }
  for (const id of f.loesung.weg ?? []) {
    const d = fall.dokumente.find((x) => x.id === id);
    if (d) d.weg = true;
  }
  f.status = "geloest";
  out.geloest = true;
  return out;
}

// ---- Tier 1: three hand-written cases (Tag 1 rules) --------------------------------------
const anmeldungSatz = { de: "Guten Tag! Ich bin neu in Lindenau und möchte mich anmelden.", en: "Hello! I'm new in Lindenau and would like to register." };

export const HANDFAELLE = [
  {
    nr: 147, tag: 1, heute: "2027-03-15",
    person: { vorname: "Ayşe", familienname: "Öztürk", geburtsdatum: "1994-07-02", geburtsort: "Izmir",
      look: { form: 1, haut: 2, haar: 1, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 2 } },
    anliegen: "anmeldung", satz: anmeldungSatz,
    dokumente: [
      { id: "ausweis", art: "ausweis", felder: { familienname: "ÖZTÜRK", vorname: "Ayşe", geburtsdatum: "02.07.1994", geburtsort: "Izmir", gueltig: "11.05.2031", unterschrift: "A. Öztürk" } },
      { id: "meldeschein", art: "meldeschein", felder: { formular: "Anmeldung", familienname: "Öztürk", vorname: "Ayşe", geburtsdatum: "02.07.1994", adresse: "Lindenallee 12, 04177 Lindenau", einzug: "06.03.2027", unterschrift: "A. Öztürk" } },
    ],
    fehler: [],
    zeilen: { genehmigt: { de: "Super, vielen Dank! Einen schönen Tag noch!", en: "Great, thank you! Have a nice day!" } },
  },
  {
    nr: 148, tag: 1, heute: "2027-03-15",
    person: { vorname: "Jonas", familienname: "Becker", geburtsdatum: "1988-11-23", geburtsort: "Leipzig",
      look: { form: 2, haut: 0, haar: 0, haarfarbe: 3, brille: 0, bart: 2, kleid: 2, extra: 0 } },
    anliegen: "anmeldung", satz: anmeldungSatz,
    dokumente: [
      { id: "ausweis", art: "ausweis", felder: { familienname: "BECKER", vorname: "Jonas", geburtsdatum: "23.11.1988", geburtsort: "Leipzig", gueltig: "30.08.2029", unterschrift: "J. Becker" } },
      { id: "meldeschein", art: "meldeschein", felder: { formular: "Anmeldung", familienname: "Becker", vorname: "Jonas", geburtsdatum: "23.11.1998", adresse: "Am Markt 3, 04177 Lindenau", einzug: "10.03.2027", unterschrift: "J. Becker" } },
    ],
    fehler: [
      { code: "geburtsdatum", paare: [["meldeschein.geburtsdatum", "ausweis.geburtsdatum"]], loesbar: false },
    ],
  },
  {
    nr: 149, tag: 1, heute: "2027-03-15",
    person: { vorname: "Thanh", familienname: "Nguyen", geburtsdatum: "2001-02-14", geburtsort: "Hanoi",
      look: { form: 0, haut: 1, haar: 7, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 0 } },
    anliegen: "anmeldung", satz: anmeldungSatz,
    dokumente: [
      { id: "ausweis", art: "pass", felder: { familienname: "NGUYEN", vorname: "Thanh", geburtsdatum: "14.02.2001", geburtsort: "Hanoi", gueltig: "02.09.2032", unterschrift: "T. Nguyen" } },
      { id: "meldeschein", art: "meldeschein", felder: { formular: "Anmeldung", familienname: "Nguyn", vorname: "Thanh", geburtsdatum: "14.02.2001", adresse: "Gartenweg 7, 04177 Lindenau", einzug: "12.03.2027", unterschrift: "T. Nguyen" } },
    ],
    fehler: [
      { code: "familienname", paare: [["meldeschein.familienname", "ausweis.familienname"]], loesbar: true,
        loesung: { setze: [{ f: "meldeschein.familienname", wert: "Nguyen" }] } },
    ],
  },
];
