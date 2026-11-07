// Bruno at the desk (Extranjería sim; code ids keep the German game's names): cases. A case is
// plain data: a person, what they want (`anliegen`), the papers they slide across the desk, and
// the mistakes in them. Every field has an id "<doc>.<field>", and every mistake lists the field
// pairs that show it, so the Check mode compares ids, never text. Besides the papers there are
// three things on the desk with fields of their own: the calendar (kalender.heute), the
// customer's request in the speech bubble (kunde.anliegen) and Regi's memo (memo.<rule>).
//
// The right stamp is never stored: it is worked out from the case as it is now (`richtig`).
// Open mistakes → DEVUELTO, none → COMPLETO; a mistake fixed by the right question is no
// longer open. That way the game can't contradict itself. COMPLETO only ever means "the papers
// are complete": no stamp in this game decides anybody's right to stay.
//
// All people, numbers, addresses and offices are invented. scripts/check-extranjeria.mjs checks
// that a case's papers contradict each other exactly where its mistakes say so.

import { FEHLER, TAGE } from "./regeln.js";
import { deDatum } from "./daten.js";

// The paper kinds and their fields, in the order they are printed. The labels are the words
// printed on Spanish papers (that's the vocabulary); `kind` groups fields that can be compared
// ("That matches."). Kind and field ids are kept from the German game: `ausweis` is the national
// ID card (DNI), `pass` the passport, `meldeschein` the padrón sheet, `abmeldung` the foreigners'
// office application with its NIE/TIE boxes, `wgb` the rental contract, `antrag` the library card
// request. `cita`, `tasa` and `foto` are new. `opciones` are the boxes of a `formular` field;
// `kopf` is the small line at the top of the paper.
export const DOK_ARTEN = {
  ausweis: {
    titel: "Documento de identidad", kopf: "Documento oficial",
    felder: [
      ["familienname", "Apellidos", "name"], ["vorname", "Nombre", "vorname"],
      ["geburtsdatum", "Nacimiento", "geburtsdatum"], ["geburtsort", "Lugar", "ort"],
      ["gueltig", "Válido hasta", "datum"], ["unterschrift", "Firma", "unterschrift"],
    ],
  },
  pass: {
    titel: "Pasaporte", kopf: "Documento de viaje",
    felder: [
      ["familienname", "Apellidos", "name"], ["vorname", "Nombre", "vorname"],
      ["nummer", "Número", "nummer"],
      ["geburtsdatum", "Nacimiento", "geburtsdatum"], ["geburtsort", "Lugar", "ort"],
      ["gueltig", "Caducidad", "datum"], ["unterschrift", "Firma", "unterschrift"],
    ],
  },
  meldeschein: {
    titel: "Hoja padronal", kopf: "Ayuntamiento de Villabruno",
    opciones: ["Alta", "Cambio de domicilio"],
    felder: [
      ["formular", "Motivo", "formular"],
      ["familienname", "Apellidos", "name"], ["vorname", "Nombre", "vorname"],
      ["geburtsdatum", "Nacimiento", "geburtsdatum"],
      ["adresse", "Domicilio", "adresse"], ["einzug", "Vivo aquí desde", "datum"],
      ["unterschrift", "Firma", "unterschrift"],
    ],
  },
  abmeldung: {
    titel: "Solicitud", kopf: "Oficina de Extranjería de Villabruno",
    opciones: ["NIE (EX-15)", "TIE (EX-17)"],
    felder: [
      ["formular", "Solicito", "formular"],
      ["familienname", "Apellidos", "name"], ["vorname", "Nombre", "vorname"],
      ["geburtsdatum", "Nacimiento", "geburtsdatum"],
      ["nummer", "N.º de pasaporte", "nummer"],
      ["adresse", "Domicilio en España", "adresse"],
      ["unterschrift", "Firma", "unterschrift"],
    ],
  },
  wgb: {
    titel: "Contrato de alquiler", kopf: "Contrato privado",
    felder: [
      ["wohnungsgeber", "Arrendador", "person"], ["adresse", "Vivienda", "adresse"],
      ["einzug", "Fecha de inicio", "datum"], ["personen", "Inquilino", "name"],
      ["unterschrift", "Firma del arrendador", "unterschrift"],
    ],
  },
  cita: {
    titel: "Cita previa", kopf: "Justificante de cita",
    felder: [
      ["name", "A nombre de", "name"], ["nummer", "Documento", "nummer"],
      ["tramite", "Trámite", "formular"], ["datum", "Fecha", "datum"], ["hora", "Hora", "hora"],
    ],
  },
  tasa: {
    titel: "Justificante de la tasa", kopf: "Modelo 790 · Código 012",
    felder: [
      ["name", "A nombre de", "name"], ["nummer", "Documento", "nummer"],
      ["tramite", "Trámite", "formular"], ["pagada", "Pagada el", "datum"],
    ],
  },
  foto: {
    titel: "Foto", kopf: "Foto tamaño carné",
    felder: [["fondo", "Fondo", "fondo"], ["hecha", "Hecha el", "datum"]],
  },
  antrag: {
    titel: "Carné de biblioteca", kopf: "Ayuntamiento de Villabruno",
    felder: [["titel", "Solicitud de", "formular"], ["name", "Nombre", "name"], ["rasse", "Raza", "ort"], ["unterschrift", "Huella", "unterschrift"]],
  },
};

// Tapping a label (outside Check mode) shows its English meaning.
export const WOERTER = {
  "Documento de identidad": "identity document", "Pasaporte": "passport", "Hoja padronal": "padrón sheet",
  "Solicitud": "application", "Contrato de alquiler": "rental contract", "Cita previa": "appointment",
  "Justificante de la tasa": "fee receipt", "Foto": "photo", "Carné de biblioteca": "library card",
  "Apellidos": "surnames", "Nombre": "first name", "Nacimiento": "date of birth", "Lugar": "place of birth",
  "Válido hasta": "valid until", "Caducidad": "expiry date", "Firma": "signature", "Número": "number",
  "Motivo": "reason", "Domicilio": "address", "Vivo aquí desde": "I have lived here since", "Solicito": "I am applying for",
  "N.º de pasaporte": "passport number", "Domicilio en España": "address in Spain", "Arrendador": "landlord",
  "Vivienda": "home", "Fecha de inicio": "start date", "Inquilino": "tenant", "Firma del arrendador": "landlord’s signature",
  "A nombre de": "in the name of", "Documento": "document", "Trámite": "procedure", "Fecha": "date", "Hora": "time",
  "Pagada el": "paid on", "Fondo": "background", "Hecha el": "taken on", "Solicitud de": "application for",
  "Raza": "breed", "Huella": "paw print", "Hoy": "today",
};

// Fields the Lernmodus leaves out: fewer lines to read, nothing a rule needs.
export const LERN_OHNE = new Set(["geburtsort", "wohnungsgeber"]);

/** The kind of a field id, for "That matches." versus "nothing to compare". */
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

// ---- The five days: hand-written cases -------------------------------------------------
const DIR = {
  olmo: "Calle del Olmo 12, 2.º B", mayor17: "Calle Mayor 17, 1.º A", mayor71: "Calle Mayor 71, 1.º A",
  sol: "Plaza del Sol 3, bajo", rio: "Avenida del Río 25, 4.º C", huerta: "Calle de la Huerta 8, 3.º D",
};
const voll = (p) => `${p.vorname} ${p.familienname}`;
const firma = (p) => `${p.vorname[0]}. ${p.familienname.split(" ")[0]}`;
const gross = (s) => s.toLocaleUpperCase("es-ES");
const person = (vorname, familienname, geburtsdatum, geburtsort, look) => ({ vorname, familienname, geburtsdatum, geburtsort, look });

const dni = (p, gueltig = "2031-05-11") => ({ id: "ausweis", art: "ausweis", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), geburtsdatum: deDatum(p.geburtsdatum), geburtsort: p.geburtsort, gueltig: deDatum(gueltig), unterschrift: firma(p) } });
const pasaporte = (p, nummer, gueltig = "2032-09-02", id = "ausweis") => ({ id, art: "pass", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), nummer, geburtsdatum: deDatum(p.geburtsdatum), geburtsort: p.geburtsort, gueltig: deDatum(gueltig), unterschrift: firma(p) } });
const hoja = (p, adresse, einzug, formular = "Alta", cambia = {}) => ({ id: "meldeschein", art: "meldeschein", felder: {
  formular, familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), adresse, einzug: deDatum(einzug), unterschrift: firma(p), ...cambia } });
const contrato = (p, adresse, einzug) => ({ id: "wgb", art: "wgb", felder: {
  wohnungsgeber: "Rosa Medina Gil", adresse, einzug: deDatum(einzug), personen: voll(p), unterschrift: "R. Medina" } });
const solicitud = (p, tramite, nummer, adresse, cambia = {}, extra = {}) => ({ id: "solicitud", art: "abmeldung", ...extra, felder: {
  formular: tramite === "NIE" ? "NIE (EX-15)" : "TIE (EX-17)", familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), nummer, adresse, unterschrift: firma(p), ...cambia } });
const cita = (p, tramite, nummer, datum, hora = "09:30") => ({ id: "cita", art: "cita", felder: {
  name: voll(p), nummer, tramite, datum: deDatum(datum), hora } });
const tasa = (p, tramite, nummer, pagada = "2027-03-10", cambia = {}) => ({ id: "tasa", art: "tasa", felder: {
  name: voll(p), nummer, tramite, pagada: deDatum(pagada), ...cambia } });
const foto = (fondo = "blanco") => ({ id: "foto", art: "foto", felder: { fondo, hecha: "02/03/2027" } });

const q = (de, en) => ({ de, en });
const ALTA = q("Buenos días. Acabo de llegar a Villabruno y quiero empadronarme.", "Good morning. I’ve just arrived in Villabruno and I want to register on the padrón.");
const MUDANZA = q("Buenos días. Me he mudado dentro de Villabruno y vengo a cambiar mi dirección.", "Good morning. I’ve moved inside Villabruno and I’ve come to change my address.");
const NIE = q("Buenos días. Tengo cita para pedir el NIE: voy a comprar un piso.", "Good morning. I have an appointment to apply for the NIE: I’m going to buy a flat.");
const TIE = q("Buenos días. Me han concedido la residencia y tengo cita para pedir la tarjeta, la TIE.", "Good morning. I’ve been granted residence and I have an appointment to apply for the card, the TIE.");

const P = {
  // Day 1
  amina: person("Amina", "Benali", "1994-07-02", "Rabat", { form: 1, haut: 2, haar: 1, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 2 }),
  pablo: person("Pablo", "Romero Vega", "1988-11-23", "Zaragoza", { form: 2, haut: 1, haar: 0, haarfarbe: 1, brille: 0, bart: 2, kleid: 2, extra: 0 }),
  wei: person("Wei", "Chen", "2001-02-14", "Hangzhou", { form: 0, haut: 1, haar: 7, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 0 }),
  valentina: person("Valentina", "Rojas Mendoza", "1996-09-30", "Cali", { form: 1, haut: 3, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 7, extra: 0 }),
  oksana: person("Oksana", "Kovalenko", "1985-04-19", "Kiev", { form: 0, haut: 0, haar: 5, haarfarbe: 3, brille: 1, bart: 0, kleid: 5, extra: 0 }),
  // Day 2
  jordi: person("Jordi", "Puig Ferrer", "1979-01-08", "Girona", { form: 2, haut: 1, haar: 4, haarfarbe: 4, brille: 1, bart: 1, kleid: 6, extra: 0 }),
  aitana: person("Aitana", "Ruiz Molina", "1999-06-12", "Sevilla", { form: 1, haut: 2, haar: 2, haarfarbe: 1, brille: 0, bart: 0, kleid: 4, extra: 2 }),
  youssef: person("Youssef", "Amrani", "1991-12-03", "Casablanca", { form: 0, haut: 3, haar: 6, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 0 }),
  nerea: person("Nerea", "Aguirre Sanz", "2000-03-21", "Bilbao", { form: 0, haut: 0, haar: 7, haarfarbe: 5, brille: 0, bart: 0, kleid: 2, extra: 3 }),
  coco: person("Coco", "", "2021-05-01", "Villabruno", { form: 0, haut: 0, haar: 4, haarfarbe: 4, brille: 0, bart: 0, kleid: 0, extra: 0 }),
  carmen: person("Carmen", "Núñez Gálvez", "1972-10-15", "Córdoba", { form: 1, haut: 1, haar: 2, haarfarbe: 4, brille: 1, bart: 0, kleid: 3, extra: 2 }),
  // Day 3
  kevin: person("Kevin", "Mensah", "1990-05-14", "Acra", { form: 2, haut: 5, haar: 0, haarfarbe: 0, brille: 0, bart: 0, kleid: 2, extra: 0 }),
  anamaria: person("Ana María", "Torres Quispe", "1987-08-25", "Lima", { form: 1, haut: 3, haar: 5, haarfarbe: 0, brille: 0, bart: 0, kleid: 0, extra: 3 }),
  ionut: person("Ionuț", "Popescu", "1993-11-02", "Cluj-Napoca", { form: 0, haut: 1, haar: 6, haarfarbe: 1, brille: 1, bart: 0, kleid: 4, extra: 0 }),
  priya: person("Priya", "Sharma", "1994-02-11", "Bombay", { form: 1, haut: 3, haar: 1, haarfarbe: 0, brille: 0, bart: 0, kleid: 7, extra: 2 }),
  thanh: person("Thanh", "Nguyen", "2001-01-20", "Hanói", { form: 0, haut: 1, haar: 0, haarfarbe: 0, brille: 1, bart: 0, kleid: 5, extra: 0 }),
  // Day 4
  mateo: person("Mateo", "García Ruiz", "1984-03-09", "Rosario", { form: 2, haut: 1, haar: 3, haarfarbe: 1, brille: 0, bart: 2, kleid: 1, extra: 0 }),
  fatou: person("Fatou", "Diallo", "1998-07-07", "Dakar", { form: 1, haut: 5, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 5, extra: 2 }),
  liang: person("Liang", "Wu", "1992-04-28", "Cantón", { form: 0, haut: 1, haar: 0, haarfarbe: 0, brille: 1, bart: 0, kleid: 6, extra: 0 }),
  daniela: person("Daniela", "Gutiérrez Paz", "1989-01-17", "Medellín", { form: 1, haut: 2, haar: 7, haarfarbe: 2, brille: 0, bart: 0, kleid: 3, extra: 3 }),
  omar: person("Omar", "Haddad", "1980-10-05", "Amán", { form: 2, haut: 3, haar: 4, haarfarbe: 0, brille: 1, bart: 2, kleid: 6, extra: 0 }),
  elena: person("Elena", "Petrova", "1995-12-01", "Sofía", { form: 0, haut: 0, haar: 1, haarfarbe: 3, brille: 0, bart: 0, kleid: 4, extra: 0 }),
  // Day 5
  diego: person("Diego", "Salazar Rivas", "1993-06-16", "Quito", { form: 0, haut: 3, haar: 0, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 1 }),
  nadia: person("Nadia", "Bouzid", "1992-08-30", "Túnez", { form: 0, haut: 2, haar: 7, haarfarbe: 1, brille: 1, bart: 0, kleid: 6, extra: 0 }),
  mariam: person("Mariam", "Keita", "1990-02-22", "Bamako", { form: 1, haut: 5, haar: 2, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 0 }),
  ali: person("Ali", "Rahimi", "1986-09-14", "Kabul", { form: 2, haut: 2, haar: 0, haarfarbe: 4, brille: 0, bart: 2, kleid: 2, extra: 0 }),
  sofia: person("Sofía", "Cáceres Luna", "1997-11-11", "Asunción", { form: 1, haut: 2, haar: 1, haarfarbe: 1, brille: 0, bart: 0, kleid: 7, extra: 2 }),
  grace: person("Grace", "Okafor", "1994-08-08", "Lagos", { form: 0, haut: 4, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 3 }),
};

const fall = (nr, tag, p, anliegen, satz, dokumente, fehler = [], mehr = {}) => ({ nr, tag, heute: TAGE[tag].heute, person: p, anliegen, satz, dokumente, fehler, ...mehr });

// One day's window on Day 3–5: papers that agree, apart from what the case changes.
const mesa = (p, tramite, nummer, adresse, hoy, { pagos = true, conFoto = tramite === "TIE" } = {}) => [
  pasaporte(p, nummer), solicitud(p, tramite, nummer, adresse), cita(p, tramite, nummer, hoy),
  ...(pagos ? [tasa(p, tramite, nummer)] : []), ...(conFoto ? [foto()] : []),
];
/** Replace one paper of a set by id. */
const con = (papeles, ...neu) => papeles.map((d) => neu.find((n) => n.id === d.id) ?? d);

const TASA_FALTA = [["cita.tramite", "memo.tasa"], ["solicitud.formular", "memo.tasa"], ["kunde.anliegen", "memo.tasa"]];
const CITA_MAL = [["cita.datum", "kalender.heute"], ["cita.datum", "memo.frist"]];
const CADUCADO = [["ausweis.gueltig", "kalender.heute"], ["ausweis.gueltig", "memo.gueltig"]];

const D3 = TAGE[3].heute, D4 = TAGE[4].heute, D5 = TAGE[5].heute;

export const HANDFAELLE = [
  // ---- Day 1: padrón ---------------------------------------------------------------------
  fall(147, 1, P.amina, "alta", ALTA, [pasaporte(P.amina, "RB204518"), hoja(P.amina, DIR.olmo, "2027-03-06"), contrato(P.amina, DIR.olmo, "2027-03-06")]),
  fall(148, 1, P.pablo, "alta", ALTA, [dni(P.pablo), hoja(P.pablo, DIR.sol, "2027-03-10", "Alta", { geburtsdatum: "23/11/1998" }), contrato(P.pablo, DIR.sol, "2027-03-10")], [
    { code: "geburtsdatum", paare: [["meldeschein.geburtsdatum", "ausweis.geburtsdatum"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.geburtsdatum", wert: "23/11/1988" }] } },
  ]),
  fall(149, 1, P.wei, "alta", ALTA, [pasaporte(P.wei, "EH730261"), hoja(P.wei, DIR.mayor17, "2027-03-12"), contrato(P.wei, DIR.mayor71, "2027-03-12")], [
    { code: "wgb_adresse", paare: [["meldeschein.adresse", "wgb.adresse"]], loesbar: false },
  ]),
  fall(150, 1, P.valentina, "alta",
    q("Buenos días. Todavía no tengo permiso de residencia. ¿Puedo empadronarme igualmente?", "Good morning. I don’t have a residence permit yet. Can I still register on the padrón?"),
    [pasaporte(P.valentina, "AV915044"), hoja(P.valentina, DIR.huerta, "2027-03-01"), contrato(P.valentina, DIR.huerta, "2027-03-01")], [],
    { zeilen: { genehmigt: q("¿De verdad? ¡Qué alivio! Muchas gracias.", "Really? What a relief! Thank you very much.") } }),
  fall(151, 1, P.oksana, "alta", ALTA, [pasaporte(P.oksana, "FU482703"), hoja(P.oksana, DIR.rio, "2027-03-08")], [
    { code: "wgb_fehlt", paare: [["meldeschein.adresse", "memo.wgb"], ["kunde.anliegen", "memo.wgb"]], loesbar: false },
  ]),

  // ---- Day 2: padrón, more rules ----------------------------------------------------------
  fall(152, 2, P.jordi, "cambio", MUDANZA, [dni(P.jordi), hoja(P.jordi, DIR.rio, "2027-03-11")], [
    { code: "formular", paare: [["kunde.anliegen", "meldeschein.formular"], ["memo.formular", "meldeschein.formular"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.formular", wert: "Cambio de domicilio" }] } },
  ]),
  fall(153, 2, P.aitana, "alta", ALTA, [dni(P.aitana, "2027-02-10"), hoja(P.aitana, DIR.olmo, "2027-03-09")], [
    { code: "abgelaufen", paare: CADUCADO, loesbar: false },
  ]),
  fall(154, 2, P.youssef, "alta", ALTA, [pasaporte(P.youssef, "MA118842", "2026-12-31"), hoja(P.youssef, DIR.mayor17, "2027-03-05")], [
    { code: "abgelaufen", paare: CADUCADO, loesbar: true, loesung: { neu: [pasaporte(P.youssef, "MA640097", "2036-11-20", "pass2")], weg: ["ausweis"] } },
  ]),
  fall(155, 2, P.nerea, "alta", ALTA, [dni(P.nerea), hoja(P.nerea, DIR.huerta, "2027-03-13", "Alta", { unterschrift: "" })], [
    { code: "unterschrift", paare: [["meldeschein.unterschrift", "memo.unterschrift"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.unterschrift", wert: firma(P.nerea) }] } },
  ]),
  fall(156, 2, P.coco, "biblioteca", q("¡Guau! Quiero un carné de biblioteca, por favor.", "Woof! I’d like a library card, please."),
    [{ id: "antrag", art: "antrag", felder: { titel: "Carné de biblioteca", name: "Coco", rasse: "Caniche", unterschrift: "🐾" } }], [
    { code: "zimmer", paare: [["kunde.anliegen", "memo.meldesachen"], ["antrag.titel", "memo.meldesachen"]], loesbar: false },
  ], { hund: true }),
  fall(157, 2, P.carmen, "cambio", MUDANZA, [dni(P.carmen), hoja(P.carmen, DIR.sol, "2027-03-02", "Cambio de domicilio")]),

  // ---- Day 3: foreigners' office, NIE -----------------------------------------------------
  fall(201, 3, P.kevin, "nie", NIE, mesa(P.kevin, "NIE", "GH552031", DIR.olmo, D3)),
  fall(202, 3, P.anamaria, "nie", NIE, con(mesa(P.anamaria, "NIE", "PE307716", DIR.rio, D3), cita(P.anamaria, "NIE", "PE307716", "2027-03-18")), [
    { code: "frist", paare: CITA_MAL, loesbar: false },
  ]),
  fall(203, 3, P.ionut, "nie", NIE, mesa(P.ionut, "NIE", "RO640218", DIR.sol, D3, { pagos: false }), [
    { code: "tasa_fehlt", paare: TASA_FALTA, loesbar: true, loesung: { neu: [tasa(P.ionut, "NIE", "RO640218", "2027-03-16")] } },
  ]),
  fall(204, 3, P.priya, "nie", NIE, con(mesa(P.priya, "NIE", "IN883150", DIR.huerta, D3), solicitud(P.priya, "NIE", "IN883150", DIR.huerta, { formular: "TIE (EX-17)" })), [
    { code: "solicitud", paare: [["kunde.anliegen", "solicitud.formular"], ["cita.tramite", "solicitud.formular"], ["tasa.tramite", "solicitud.formular"], ["memo.solicitud", "solicitud.formular"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.formular", wert: "NIE (EX-15)" }] } },
  ]),
  fall(205, 3, P.thanh, "nie", NIE, con(mesa(P.thanh, "NIE", "VN109374", DIR.mayor71, D3), tasa(P.thanh, "NIE", "VN109374", "2027-03-10", { name: "Minh Nguyen" })), [
    { code: "tasa_name", paare: [["tasa.name", "ausweis.vorname"], ["tasa.name", "solicitud.vorname"], ["tasa.name", "cita.name"], ["tasa.name", "memo.tasa"]], loesbar: false },
  ]),

  // ---- Day 4: foreigners' office, TIE -----------------------------------------------------
  fall(206, 4, P.mateo, "tie", TIE, mesa(P.mateo, "TIE", "AR471120", DIR.sol, D4)),
  fall(207, 4, P.fatou, "tie", TIE, con(mesa(P.fatou, "TIE", "SN290657", DIR.olmo, D4), foto("azul")), [
    { code: "foto_fondo", paare: [["foto.fondo", "memo.foto"]], loesbar: true, loesung: { setze: [{ f: "foto.fondo", wert: "blanco" }] } },
  ]),
  fall(208, 4, P.liang, "tie", TIE, con(mesa(P.liang, "TIE", "CN755208", DIR.rio, D4), solicitud(P.liang, "TIE", "CN755208", DIR.rio, { familienname: "Liang", vorname: "Wu" })), [
    { code: "vertauscht", paare: [["solicitud.familienname", "ausweis.familienname"], ["solicitud.vorname", "ausweis.vorname"], ["solicitud.familienname", "memo.schreibweise"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.familienname", wert: "Wu" }, { f: "solicitud.vorname", wert: "Liang" }] } },
  ]),
  fall(209, 4, P.daniela, "tie", TIE, con(mesa(P.daniela, "TIE", "CO618493", DIR.huerta, D4), solicitud(P.daniela, "TIE", "CO618493", DIR.huerta, { familienname: "Gutiérez Paz" })), [
    { code: "umlaut", paare: [["solicitud.familienname", "ausweis.familienname"], ["solicitud.familienname", "cita.name"], ["solicitud.familienname", "memo.schreibweise"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.familienname", wert: "Gutiérrez Paz" }] } },
  ]),
  fall(210, 4, P.omar, "tie", TIE, con(mesa(P.omar, "TIE", "JO302786", DIR.mayor17, D4), { ...pasaporte(P.omar, "JO302786"), fax: true }), [
    { code: "fax", paare: [["ausweis.kopf", "memo.original"], ["ausweis.familienname", "memo.original"], ["ausweis.nummer", "memo.original"]], loesbar: false },
  ]),
  fall(211, 4, P.elena, "tie", TIE, con(mesa(P.elena, "TIE", "BG936415", DIR.mayor71, D4), solicitud(P.elena, "TIE", "BG936415", DIR.mayor71, {}, { tinte: "rot" })), [
    { code: "kuli", paare: [["solicitud.unterschrift", "memo.kuli"]], loesbar: true, loesung: { setze: [{ f: "solicitud.unterschrift", wert: firma(P.elena), tinte: "schwarz" }] } },
  ]),

  // ---- Day 5: questions this window doesn't decide -----------------------------------------
  fall(212, 5, P.diego, "arraigo", q("Buenos días. Llevo más de dos años en Villabruno. ¿Me pueden dar aquí el arraigo?", "Good morning. I’ve been in Villabruno for more than two years. Can I get arraigo here?"),
    [pasaporte(P.diego, "EC417092")], [
    { code: "derivar_arraigo", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
  fall(213, 5, P.nadia, "nie", NIE, mesa(P.nadia, "NIE", "TN350984", DIR.olmo, D5)),
  fall(214, 5, P.mariam, "regularizacion", q("Hola, buenos días. He oído lo de la regularización de 2026. ¿Puedo entregar aquí mis papeles?", "Hello, good morning. I’ve heard about the 2026 regularisation. Can I hand in my papers here?"),
    [pasaporte(P.mariam, "ML508263")], [
    { code: "derivar_regularizacion", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
  fall(215, 5, P.ali, "nie", NIE, con(mesa(P.ali, "NIE", "AF263908", DIR.rio, D5), cita(P.ali, "NIE", "AF263908", "2027-03-22")), [
    { code: "frist", paare: CITA_MAL, loesbar: false },
  ]),
  fall(216, 5, P.sofia, "tie", q("Buenos días. Me concedieron la residencia con la regularización y tengo cita para pedir la TIE.", "Good morning. I was granted residence through the regularisation and I have an appointment to apply for the TIE."),
    mesa(P.sofia, "TIE", "PY184675", DIR.sol, D5)),
  fall(217, 5, P.grace, "nie", NIE, mesa(P.grace, "NIE", "NG730518", DIR.huerta, D5, { pagos: false }), [
    { code: "tasa_fehlt", paare: TASA_FALTA, loesbar: false },
  ]),
];

export const faelleVonTag = (tag) => HANDFAELLE.filter((f) => f.tag === tag);
