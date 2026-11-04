// Bruno's Front Desk (code ids keep the German game's names): cases. A case is plain JSON (docs/buergeramt-tier0-v1.md, "Datenmodell"):
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

// The paper kinds and their fields, in the order they are printed. The labels are the words
// printed on real UK papers (that's the vocabulary); `kind` groups fields that can be compared
// ("That matches."). Kind and field ids are kept from the German game: `ausweis` is now the
// photocard driving licence, `meldeschein` / `abmeldung` the parking permit application,
// `wgb` the tenancy agreement as proof of address.
export const DOK_ARTEN = {
  ausweis: {
    titel: "Driving licence",
    felder: [
      ["familienname", "Surname", "name"], ["vorname", "First names", "vorname"],
      ["geburtsdatum", "Date of birth", "geburtsdatum"], ["geburtsort", "Place of birth", "ort"],
      ["gueltig", "Valid until", "datum"], ["unterschrift", "Signature", "unterschrift"],
    ],
  },
  pass: {
    titel: "Passport",
    felder: [
      ["familienname", "Surname", "name"], ["vorname", "Given names", "vorname"],
      ["geburtsdatum", "Date of birth", "geburtsdatum"], ["geburtsort", "Place of birth", "ort"],
      ["gueltig", "Date of expiry", "datum"], ["unterschrift", "Signature", "unterschrift"],
    ],
  },
  meldeschein: {
    titel: "Resident parking permit application",
    felder: [
      ["formular", "I am applying for", "formular"],
      ["familienname", "Surname", "name"], ["vorname", "First name", "vorname"],
      ["geburtsdatum", "Date of birth", "geburtsdatum"],
      ["adresse", "Address", "adresse"], ["einzug", "Date you moved in", "datum"],
      ["unterschrift", "Signature", "unterschrift"],
    ],
  },
  abmeldung: {
    titel: "Resident parking permit application",
    felder: [
      ["formular", "I am applying for", "formular"],
      ["familienname", "Surname", "name"], ["vorname", "First name", "vorname"],
      ["geburtsdatum", "Date of birth", "geburtsdatum"],
      ["adresse", "Current address", "adresse"], ["auszug", "Date you move out", "datum"],
      ["ziel", "New address", "adresse"],
      ["unterschrift", "Signature", "unterschrift"],
    ],
  },
  wgb: {
    titel: "Tenancy agreement",
    felder: [
      ["wohnungsgeber", "Landlord", "person"], ["adresse", "Property address", "adresse"],
      ["einzug", "Start date", "datum"], ["personen", "Tenant", "name"],
      ["unterschrift", "Landlord's signature", "unterschrift"],
    ],
  },
  antrag: {
    titel: "Application",
    felder: [["titel", "Application for", "formular"], ["name", "Name", "name"], ["rasse", "Breed", "ort"], ["unterschrift", "Paw print", "unterschrift"]],
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

// ---- Tier 1: three hand-written cases (day 1 rules) --------------------------------------
// The box values ("New permit") must be one of FORMULARE in tisch.js.
const anmeldungSatz = { de: "Hello! I've just moved to Brambleford, and I'd like a parking permit, please.", en: "Hi! I'm new in town and I want a permit for my car." };

export const HANDFAELLE = [
  {
    nr: 147, tag: 1, heute: "2027-03-15",
    person: { vorname: "Priya", familienname: "Sharma", geburtsdatum: "1994-07-02", geburtsort: "Leicester",
      look: { form: 1, haut: 2, haar: 1, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 2 } },
    anliegen: "anmeldung", satz: anmeldungSatz,
    dokumente: [
      { id: "ausweis", art: "ausweis", felder: { familienname: "SHARMA", vorname: "Priya", geburtsdatum: "02/07/1994", geburtsort: "Leicester", gueltig: "11/05/2031", unterschrift: "P. Sharma" } },
      { id: "meldeschein", art: "meldeschein", felder: { formular: "New permit", familienname: "Sharma", vorname: "Priya", geburtsdatum: "02/07/1994", adresse: "12 Lime Avenue, Brambleford", einzug: "06/03/2027", unterschrift: "P. Sharma" } },
    ],
    fehler: [],
    zeilen: { genehmigt: { de: "Brilliant, thank you so much! Have a nice day!", en: "Great, thanks! Have a good day!" } },
  },
  {
    nr: 148, tag: 1, heute: "2027-03-15",
    person: { vorname: "Tom", familienname: "Fletcher", geburtsdatum: "1988-11-23", geburtsort: "Norwich",
      look: { form: 2, haut: 0, haar: 0, haarfarbe: 3, brille: 0, bart: 2, kleid: 2, extra: 0 } },
    anliegen: "anmeldung", satz: anmeldungSatz,
    dokumente: [
      { id: "ausweis", art: "ausweis", felder: { familienname: "FLETCHER", vorname: "Thomas", geburtsdatum: "23/11/1988", geburtsort: "Norwich", gueltig: "30/08/2029", unterschrift: "T. Fletcher" } },
      { id: "meldeschein", art: "meldeschein", felder: { formular: "New permit", familienname: "Fletcher", vorname: "Thomas", geburtsdatum: "23/11/1998", adresse: "3 Market Square, Brambleford", einzug: "10/03/2027", unterschrift: "T. Fletcher" } },
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
      { id: "ausweis", art: "pass", felder: { familienname: "NGUYEN", vorname: "Thanh", geburtsdatum: "14/02/2001", geburtsort: "Hanoi", gueltig: "02/09/2032", unterschrift: "T. Nguyen" } },
      { id: "meldeschein", art: "meldeschein", felder: { formular: "New permit", familienname: "Nguyn", vorname: "Thanh", geburtsdatum: "14/02/2001", adresse: "7 Garden Lane, Brambleford", einzug: "12/03/2027", unterschrift: "T. Nguyen" } },
    ],
    fehler: [
      { code: "familienname", paare: [["meldeschein.familienname", "ausweis.familienname"]], loesbar: true,
        loesung: { setze: [{ f: "meldeschein.familienname", wert: "Nguyen" }] } },
    ],
  },
];
