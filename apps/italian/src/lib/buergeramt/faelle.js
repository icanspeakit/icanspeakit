// Bruno at the desk (Questura and Comune sim; code ids keep the German game's names): cases. A case is
// plain data: a person, what they want (`anliegen`), the papers they slide across the desk, and
// the mistakes in them. Every field has an id "<doc>.<field>", and every mistake lists the field
// pairs that show it, so the Check mode compares ids, never text. Besides the papers there are
// three things on the desk with fields of their own: the calendar (kalender.heute), the
// customer's request in the speech bubble (kunde.anliegen) and Regi's memo (memo.<rule>).
//
// The right stamp is never stored: it is worked out from the case as it is now (`richtig`).
// Open mistakes → DA CORREGGERE, none → COMPLETO; a mistake fixed by the right question is no
// longer open. That way the game can't contradict itself. COMPLETO only ever means "the papers
// are complete": no stamp in this game decides anybody's right to stay.
//
// All people, numbers, addresses and offices are invented. scripts/check-extranjeria.mjs (name kept
// for the scripts list) checks that a case's papers contradict each other exactly where its
// mistakes say so.

import { FEHLER, TAGE } from "./regeln.js";
import { deDatum } from "./daten.js";

// The paper kinds and their fields, in the order they are printed. The labels are the words
// printed on Italian papers (that's the vocabulary); `kind` groups fields that can be compared
// ("That matches."). Kind and field ids are kept from the German game: `ausweis` is the national
// ID card (carta d'identità), `pass` the passport, `meldeschein` the Comune's residenza form,
// `abmeldung` the Questura application of the Poste kit with its two boxes, `wgb` the rental
// contract, `antrag` the library card request. `cita` is the Poste receipt with the Questura
// appointment (convocazione), `tasa` the payment receipt, `foto` the passport photo and `permesso`
// the permesso di soggiorno. `opciones` are the boxes of a `formular` field; `kopf` is the small
// line at the top of the paper.
export const DOK_ARTEN = {
  ausweis: {
    titel: "Carta d’identità", kopf: "Documento ufficiale",
    felder: [
      ["familienname", "Cognome", "name"], ["vorname", "Nome", "vorname"],
      ["geburtsdatum", "Data di nascita", "geburtsdatum"], ["geburtsort", "Luogo di nascita", "ort"],
      ["gueltig", "Valida fino al", "datum"], ["unterschrift", "Firma", "unterschrift"],
    ],
  },
  pass: {
    titel: "Passaporto", kopf: "Documento di viaggio",
    felder: [
      ["familienname", "Cognome", "name"], ["vorname", "Nome", "vorname"],
      ["nummer", "Numero", "nummer"],
      ["geburtsdatum", "Data di nascita", "geburtsdatum"], ["geburtsort", "Luogo di nascita", "ort"],
      ["gueltig", "Scadenza", "datum"], ["unterschrift", "Firma", "unterschrift"],
    ],
  },
  permesso: {
    titel: "Permesso di soggiorno", kopf: "Questura",
    felder: [
      ["familienname", "Cognome", "name"], ["vorname", "Nome", "vorname"],
      ["geburtsdatum", "Data di nascita", "geburtsdatum"],
      ["tipo", "Tipo", "tipo"], ["gueltig", "Scadenza", "datum"],
    ],
  },
  meldeschein: {
    titel: "Modulo di residenza", kopf: "Comune di Casalbruno",
    opciones: ["Nuova residenza", "Cambio di abitazione"],
    felder: [
      ["formular", "Motivo", "formular"],
      ["familienname", "Cognome", "name"], ["vorname", "Nome", "vorname"],
      ["geburtsdatum", "Data di nascita", "geburtsdatum"],
      ["adresse", "Indirizzo", "adresse"], ["einzug", "Abito qui dal", "datum"],
      ["unterschrift", "Firma", "unterschrift"],
    ],
  },
  abmeldung: {
    titel: "Richiesta", kopf: "Questura di Casalbruno",
    opciones: ["Primo rilascio", "Rinnovo"],
    felder: [
      ["formular", "Chiedo", "formular"],
      ["familienname", "Cognome", "name"], ["vorname", "Nome", "vorname"],
      ["geburtsdatum", "Data di nascita", "geburtsdatum"],
      ["nummer", "N. passaporto", "nummer"],
      ["adresse", "Indirizzo in Italia", "adresse"],
      ["unterschrift", "Firma", "unterschrift"],
    ],
  },
  wgb: {
    titel: "Contratto d’affitto", kopf: "Contratto privato",
    felder: [
      ["wohnungsgeber", "Locatore", "person"], ["adresse", "Abitazione", "adresse"],
      ["einzug", "Data di inizio", "datum"], ["personen", "Conduttore", "name"],
      ["unterschrift", "Firma del locatore", "unterschrift"],
    ],
  },
  cita: {
    titel: "Convocazione", kopf: "Ricevuta delle Poste",
    felder: [
      ["name", "Intestata a", "name"], ["nummer", "Documento", "nummer"],
      ["tramite", "Pratica", "formular"], ["datum", "Data", "datum"], ["hora", "Ora", "hora"],
    ],
  },
  tasa: {
    titel: "Ricevuta del versamento", kopf: "Bollettino e marca da bollo",
    felder: [
      ["name", "Intestata a", "name"], ["nummer", "Documento", "nummer"],
      ["tramite", "Pratica", "formular"], ["pagada", "Pagata il", "datum"],
    ],
  },
  foto: {
    titel: "Foto", kopf: "Fototessera",
    felder: [["fondo", "Sfondo", "fondo"], ["hecha", "Scattata il", "datum"]],
  },
  antrag: {
    titel: "Tessera della biblioteca", kopf: "Comune di Casalbruno",
    felder: [["titel", "Richiesta di", "formular"], ["name", "Nome", "name"], ["rasse", "Razza", "ort"], ["unterschrift", "Impronta", "unterschrift"]],
  },
};

// Tapping a label (outside Check mode) shows its English meaning.
export const WOERTER = {
  "Carta d’identità": "identity card", "Passaporto": "passport", "Permesso di soggiorno": "residence permit", "Modulo di residenza": "residence form",
  "Richiesta": "application", "Contratto d’affitto": "rental contract", "Convocazione": "appointment letter",
  "Ricevuta del versamento": "payment receipt", "Foto": "photo", "Tessera della biblioteca": "library card",
  "Cognome": "surname", "Nome": "first name", "Data di nascita": "date of birth", "Luogo di nascita": "place of birth",
  "Valida fino al": "valid until", "Scadenza": "expiry date", "Firma": "signature", "Numero": "number", "Tipo": "type",
  "Motivo": "reason", "Indirizzo": "address", "Abito qui dal": "I have lived here since", "Chiedo": "I am asking for",
  "N. passaporto": "passport number", "Indirizzo in Italia": "address in Italy", "Locatore": "landlord",
  "Abitazione": "home", "Data di inizio": "start date", "Conduttore": "tenant", "Firma del locatore": "landlord’s signature",
  "Intestata a": "in the name of", "Documento": "document", "Pratica": "case", "Data": "date", "Ora": "time",
  "Pagata il": "paid on", "Sfondo": "background", "Scattata il": "taken on", "Richiesta di": "application for",
  "Razza": "breed", "Impronta": "paw print", "Oggi": "today",
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
  olmo: "Via dei Tigli 12, int. 4", mayor17: "Via Garibaldi 17, int. 2", mayor71: "Via Garibaldi 71, int. 2",
  sol: "Piazza del Sole 3, int. 1", rio: "Viale del Fiume 25, int. 9", huerta: "Via dell’Orto 8, int. 6",
};
const voll = (p) => `${p.vorname} ${p.familienname}`;
const firma = (p) => `${p.vorname[0]}. ${p.familienname.split(" ")[0]}`;
const gross = (s) => s.toLocaleUpperCase("it-IT");
const person = (vorname, familienname, geburtsdatum, geburtsort, look) => ({ vorname, familienname, geburtsdatum, geburtsort, look });

const carta = (p, gueltig = "2031-05-11") => ({ id: "ausweis", art: "ausweis", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), geburtsdatum: deDatum(p.geburtsdatum), geburtsort: p.geburtsort, gueltig: deDatum(gueltig), unterschrift: firma(p) } });
const passaporto = (p, nummer, gueltig = "2032-09-02", id = "ausweis") => ({ id, art: "pass", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), nummer, geburtsdatum: deDatum(p.geburtsdatum), geburtsort: p.geburtsort, gueltig: deDatum(gueltig), unterschrift: firma(p) } });
const permesso = (p, tipo = "Lavoro subordinato", gueltig = "2028-06-30") => ({ id: "permesso", art: "permesso", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), geburtsdatum: deDatum(p.geburtsdatum), tipo, gueltig: deDatum(gueltig) } });
const modulo = (p, adresse, einzug, formular = "Nuova residenza", cambia = {}) => ({ id: "meldeschein", art: "meldeschein", felder: {
  formular, familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), adresse, einzug: deDatum(einzug), unterschrift: firma(p), ...cambia } });
const contratto = (p, adresse, einzug) => ({ id: "wgb", art: "wgb", felder: {
  wohnungsgeber: "Rosa Medici", adresse, einzug: deDatum(einzug), personen: voll(p), unterschrift: "R. Medici" } });
const richiesta = (p, tramite, nummer, adresse, cambia = {}, extra = {}) => ({ id: "solicitud", art: "abmeldung", ...extra, felder: {
  formular: tramite, familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), nummer, adresse, unterschrift: firma(p), ...cambia } });
const convocazione = (p, tramite, nummer, datum, hora = "09:30") => ({ id: "cita", art: "cita", felder: {
  name: voll(p), nummer, tramite, datum: deDatum(datum), hora } });
const versamento = (p, tramite, nummer, pagada = "2027-03-10", cambia = {}) => ({ id: "tasa", art: "tasa", felder: {
  name: voll(p), nummer, tramite, pagada: deDatum(pagada), ...cambia } });
const foto = (fondo = "bianco") => ({ id: "foto", art: "foto", felder: { fondo, hecha: "02/03/2027" } });

const q = (de, en) => ({ de, en });
const ALTA = q("Buongiorno. Vivo da poco a Casalbruno e vorrei chiedere la residenza.", "Good morning. I’ve recently moved to Casalbruno and I’d like to register my residence.");
const MUDANZA = q("Buongiorno. Ho cambiato casa, sempre a Casalbruno, e vengo a cambiare l’indirizzo.", "Good morning. I’ve moved house, still in Casalbruno, and I’ve come to change my address.");
const RILASCIO = q("Buongiorno. Ho la convocazione in Questura per il mio primo permesso di soggiorno.", "Good morning. I have an appointment at the Questura for my first permesso di soggiorno.");
const RINNOVO = q("Buongiorno. Devo rinnovare il permesso di soggiorno e ho la convocazione in Questura.", "Good morning. I have to renew my permesso di soggiorno and I have an appointment at the Questura.");

const P = {
  // Day 1
  amina: person("Amina", "Benali", "1994-07-02", "Rabat", { form: 1, haut: 2, haar: 1, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 2 }),
  paolo: person("Paolo", "Ferrari", "1988-11-23", "Bologna", { form: 2, haut: 1, haar: 0, haarfarbe: 1, brille: 0, bart: 2, kleid: 2, extra: 0 }),
  wei: person("Wei", "Chen", "2001-02-14", "Hangzhou", { form: 0, haut: 1, haar: 7, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 0 }),
  ioana: person("Ioana", "Marin", "1996-09-30", "Bucarest", { form: 1, haut: 3, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 7, extra: 0 }),
  oksana: person("Oksana", "Kovalenko", "1985-04-19", "Kyiv", { form: 0, haut: 0, haar: 5, haarfarbe: 3, brille: 1, bart: 0, kleid: 5, extra: 0 }),
  samir: person("Samir", "Belkacem", "1990-03-27", "Algeri", { form: 2, haut: 2, haar: 0, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 0 }),
  // Day 2
  giorgio: person("Giorgio", "Rizzo", "1979-01-08", "Catania", { form: 2, haut: 1, haar: 4, haarfarbe: 4, brille: 1, bart: 1, kleid: 6, extra: 0 }),
  aurora: person("Aurora", "Greco", "1999-06-12", "Palermo", { form: 1, haut: 2, haar: 2, haarfarbe: 1, brille: 0, bart: 0, kleid: 4, extra: 2 }),
  youssef: person("Youssef", "Amrani", "1991-12-03", "Casablanca", { form: 0, haut: 3, haar: 6, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 0 }),
  nicole: person("Nicole", "Bianchi", "2000-03-21", "Torino", { form: 0, haut: 0, haar: 7, haarfarbe: 5, brille: 0, bart: 0, kleid: 2, extra: 3 }),
  coco: person("Coco", "", "2021-05-01", "Casalbruno", { form: 0, haut: 0, haar: 4, haarfarbe: 4, brille: 0, bart: 0, kleid: 0, extra: 0 }),
  carla: person("Carla", "Esposito", "1972-10-15", "Napoli", { form: 1, haut: 1, haar: 2, haarfarbe: 4, brille: 1, bart: 0, kleid: 3, extra: 2 }),
  // Day 3
  kevin: person("Kevin", "Mensah", "1990-05-14", "Accra", { form: 2, haut: 5, haar: 0, haarfarbe: 0, brille: 0, bart: 0, kleid: 2, extra: 0 }),
  anamaria: person("Ana María", "Torres Quispe", "1987-08-25", "Lima", { form: 1, haut: 3, haar: 5, haarfarbe: 0, brille: 0, bart: 0, kleid: 0, extra: 3 }),
  ionut: person("Ionuț", "Popescu", "1993-11-02", "Cluj-Napoca", { form: 0, haut: 1, haar: 6, haarfarbe: 1, brille: 1, bart: 0, kleid: 4, extra: 0 }),
  priya: person("Priya", "Sharma", "1994-02-11", "Mumbai", { form: 1, haut: 3, haar: 1, haarfarbe: 0, brille: 0, bart: 0, kleid: 7, extra: 2 }),
  thanh: person("Thanh", "Nguyen", "2001-01-20", "Hanoi", { form: 0, haut: 1, haar: 0, haarfarbe: 0, brille: 1, bart: 0, kleid: 5, extra: 0 }),
  // Day 4
  mateo: person("Mateo", "García Ruiz", "1984-03-09", "Rosario", { form: 2, haut: 1, haar: 3, haarfarbe: 1, brille: 0, bart: 2, kleid: 1, extra: 0 }),
  fatou: person("Fatou", "Diallo", "1998-07-07", "Dakar", { form: 1, haut: 5, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 5, extra: 2 }),
  liang: person("Liang", "Wu", "1992-04-28", "Canton", { form: 0, haut: 1, haar: 0, haarfarbe: 0, brille: 1, bart: 0, kleid: 6, extra: 0 }),
  daniela: person("Daniela", "Restrepo Paz", "1989-01-17", "Medellín", { form: 1, haut: 2, haar: 7, haarfarbe: 2, brille: 0, bart: 0, kleid: 3, extra: 3 }),
  omar: person("Omar", "Haddad", "1980-10-05", "Amman", { form: 2, haut: 3, haar: 4, haarfarbe: 0, brille: 1, bart: 2, kleid: 6, extra: 0 }),
  elena: person("Elena", "Petrova", "1995-12-01", "Sofia", { form: 0, haut: 0, haar: 1, haarfarbe: 3, brille: 0, bart: 0, kleid: 4, extra: 0 }),
  // Day 5
  diego: person("Diego", "Salazar Rivas", "1993-06-16", "Quito", { form: 0, haut: 3, haar: 0, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 1 }),
  nadia: person("Nadia", "Bouzid", "1992-08-30", "Tunisi", { form: 0, haut: 2, haar: 7, haarfarbe: 1, brille: 1, bart: 0, kleid: 6, extra: 0 }),
  mariam: person("Mariam", "Keita", "1990-02-22", "Bamako", { form: 1, haut: 5, haar: 2, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 0 }),
  ali: person("Ali", "Rahimi", "1986-09-14", "Kabul", { form: 2, haut: 2, haar: 0, haarfarbe: 4, brille: 0, bart: 2, kleid: 2, extra: 0 }),
  sofia: person("Sofía", "Cáceres Luna", "1997-11-11", "Asunción", { form: 1, haut: 2, haar: 1, haarfarbe: 1, brille: 0, bart: 0, kleid: 7, extra: 2 }),
  grace: person("Grace", "Okafor", "1994-08-08", "Lagos", { form: 0, haut: 4, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 3 }),
  ravi: person("Ravi", "Kumar", "1983-05-05", "Delhi", { form: 2, haut: 3, haar: 0, haarfarbe: 0, brille: 1, bart: 1, kleid: 5, extra: 0 }),
};

const fall = (nr, tag, p, anliegen, satz, dokumente, fehler = [], mehr = {}) => ({ nr, tag, heute: TAGE[tag].heute, person: p, anliegen, satz, dokumente, fehler, ...mehr });

// One day's window on Day 3–5: papers that agree, apart from what the case changes. Photos are
// part of the renewal.
const mesa = (p, tramite, nummer, adresse, hoy, { pagos = true, conFoto = tramite === "Rinnovo" } = {}) => [
  passaporto(p, nummer), richiesta(p, tramite, nummer, adresse), convocazione(p, tramite, nummer, hoy),
  ...(pagos ? [versamento(p, tramite, nummer)] : []), ...(conFoto ? [foto()] : []),
];
/** Replace one paper of a set by id. */
const con = (papeles, ...neu) => papeles.map((d) => neu.find((n) => n.id === d.id) ?? d);

const TASA_FALTA = [["cita.tramite", "memo.tasa"], ["solicitud.formular", "memo.tasa"], ["kunde.anliegen", "memo.tasa"]];
const CITA_MAL = [["cita.datum", "kalender.heute"], ["cita.datum", "memo.frist"]];
const SCADUTO = [["ausweis.gueltig", "kalender.heute"], ["ausweis.gueltig", "memo.gueltig"]];

const D3 = TAGE[3].heute, D4 = TAGE[4].heute, D5 = TAGE[5].heute;

export const HANDFAELLE = [
  // ---- Day 1: Anagrafe (residenza) ---------------------------------------------------------
  fall(147, 1, P.amina, "alta", ALTA, [passaporto(P.amina, "RB204518"), permesso(P.amina), modulo(P.amina, DIR.olmo, "2027-03-06"), contratto(P.amina, DIR.olmo, "2027-03-06")]),
  fall(148, 1, P.paolo, "alta", ALTA,[carta(P.paolo), modulo(P.paolo, DIR.sol, "2027-03-10", "Nuova residenza", { geburtsdatum: "23/11/1998" }), contratto(P.paolo, DIR.sol, "2027-03-10")], [
    { code: "geburtsdatum", paare: [["meldeschein.geburtsdatum", "ausweis.geburtsdatum"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.geburtsdatum", wert: "23/11/1988" }] } },
  ]),
  fall(149, 1, P.wei, "alta", ALTA, [passaporto(P.wei, "EH730261"), permesso(P.wei, "Studio", "2027-10-31"), modulo(P.wei, DIR.mayor17, "2027-03-12"), contratto(P.wei, DIR.mayor71, "2027-03-12")], [
    { code: "wgb_adresse", paare: [["meldeschein.adresse", "wgb.adresse"]], loesbar: false },
  ]),
  fall(150, 1, P.ioana, "alta",
    q("Buongiorno. Sono rumena e non ho un permesso di soggiorno. Posso chiedere lo stesso la residenza?", "Good morning. I’m Romanian and I don’t have a permesso di soggiorno. Can I still ask for the residenza?"),
    [carta(P.ioana), modulo(P.ioana, DIR.huerta, "2027-03-01"), contratto(P.ioana, DIR.huerta, "2027-03-01")], [],
    { zeilen: { genehmigt: q("Davvero? Che sollievo! Grazie mille.", "Really? What a relief! Thank you very much.") } }),
  fall(151, 1, P.oksana, "alta", ALTA, [passaporto(P.oksana, "FU482703"), permesso(P.oksana, "Protezione", "2028-01-15"), modulo(P.oksana, DIR.rio, "2027-03-08")], [
    { code: "wgb_fehlt", paare: [["meldeschein.adresse", "memo.wgb"], ["kunde.anliegen", "memo.wgb"]], loesbar: false },
  ]),
  fall(158, 1, P.samir, "alta", ALTA, [passaporto(P.samir, "TA920417"), modulo(P.samir, DIR.mayor17, "2027-03-09"), contratto(P.samir, DIR.mayor17, "2027-03-09")], [
    { code: "permesso_fehlt", paare: [["kunde.anliegen", "memo.sinpermiso"], ["ausweis.kopf", "memo.sinpermiso"]], loesbar: false },
  ]),

  // ---- Day 2: Anagrafe, more rules ---------------------------------------------------------
  fall(152, 2, P.giorgio, "cambio", MUDANZA, [carta(P.giorgio), modulo(P.giorgio, DIR.rio, "2027-03-11")], [
    { code: "formular", paare: [["kunde.anliegen", "meldeschein.formular"], ["memo.formular", "meldeschein.formular"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.formular", wert: "Cambio di abitazione" }] } },
  ]),
  fall(153, 2, P.aurora, "alta", ALTA, [carta(P.aurora, "2027-02-10"), modulo(P.aurora, DIR.olmo, "2027-03-09")], [
    { code: "abgelaufen", paare: SCADUTO, loesbar: false },
  ]),
  fall(154, 2, P.youssef, "alta", ALTA, [passaporto(P.youssef, "MA118842", "2026-12-31"), permesso(P.youssef, "Lavoro subordinato", "2028-02-28"), modulo(P.youssef, DIR.mayor17, "2027-03-05")], [
    { code: "abgelaufen", paare: SCADUTO, loesbar: true, loesung: { neu: [passaporto(P.youssef, "MA640097", "2036-11-20", "pass2")], weg: ["ausweis"] } },
  ]),
  fall(155, 2, P.nicole, "alta", ALTA, [carta(P.nicole), modulo(P.nicole, DIR.huerta, "2027-03-13", "Nuova residenza", { unterschrift: "" })], [
    { code: "unterschrift", paare: [["meldeschein.unterschrift", "memo.unterschrift"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.unterschrift", wert: firma(P.nicole) }] } },
  ]),
  fall(156, 2, P.coco, "biblioteca", q("Bau! Vorrei la tessera della biblioteca, per favore.", "Woof! I’d like a library card, please."),
    [{ id: "antrag", art: "antrag", felder: { titel: "Tessera della biblioteca", name: "Coco", rasse: "Barboncino", unterschrift: "🐾" } }], [
    { code: "zimmer", paare: [["kunde.anliegen", "memo.meldesachen"], ["antrag.titel", "memo.meldesachen"]], loesbar: false },
  ], { hund: true }),
  fall(157, 2, P.carla, "cambio", MUDANZA, [carta(P.carla), modulo(P.carla, DIR.sol, "2027-03-02", "Cambio di abitazione")]),

  // ---- Day 3: Questura, first issue (Poste kit) --------------------------------------------
  fall(201, 3, P.kevin, "rilascio", RILASCIO, mesa(P.kevin, "Primo rilascio", "GH552031", DIR.olmo, D3)),
  fall(202, 3, P.anamaria, "rilascio", RILASCIO, con(mesa(P.anamaria, "Primo rilascio", "PE307716", DIR.rio, D3), convocazione(P.anamaria, "Primo rilascio", "PE307716", "2027-03-18")), [
    { code: "frist", paare: CITA_MAL, loesbar: false },
  ]),
  fall(203, 3, P.ionut, "rilascio", RILASCIO, mesa(P.ionut, "Primo rilascio", "RO640218", DIR.sol, D3, { pagos: false }), [
    { code: "tasa_fehlt", paare: TASA_FALTA, loesbar: true, loesung: { neu: [versamento(P.ionut, "Primo rilascio", "RO640218", "2027-03-16")] } },
  ]),
  fall(204, 3, P.priya, "rilascio", RILASCIO, con(mesa(P.priya, "Primo rilascio", "IN883150", DIR.huerta, D3), richiesta(P.priya, "Rinnovo", "IN883150", DIR.huerta)), [
    { code: "solicitud", paare: [["kunde.anliegen", "solicitud.formular"], ["cita.tramite", "solicitud.formular"], ["tasa.tramite", "solicitud.formular"], ["memo.solicitud", "solicitud.formular"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.formular", wert: "Primo rilascio" }] } },
  ]),
  fall(205, 3, P.thanh, "rilascio", RILASCIO, con(mesa(P.thanh, "Primo rilascio", "VN109374", DIR.mayor71, D3), versamento(P.thanh, "Primo rilascio", "VN109374", "2027-03-10", { name: "Minh Nguyen" })), [
    { code: "tasa_name", paare: [["tasa.name", "ausweis.vorname"], ["tasa.name", "solicitud.vorname"], ["tasa.name", "cita.name"], ["tasa.name", "memo.tasa"]], loesbar: false },
  ]),

  // ---- Day 4: Questura, renewal ------------------------------------------------------------
  fall(206, 4, P.mateo, "rinnovo", RINNOVO, mesa(P.mateo, "Rinnovo", "AR471120", DIR.sol, D4)),
  fall(207, 4, P.fatou, "rinnovo", RINNOVO, con(mesa(P.fatou, "Rinnovo", "SN290657", DIR.olmo, D4), foto("blu")), [
    { code: "foto_fondo", paare: [["foto.fondo", "memo.foto"]], loesbar: true, loesung: { setze: [{ f: "foto.fondo", wert: "bianco" }] } },
  ]),
  fall(208, 4, P.liang, "rinnovo", RINNOVO, con(mesa(P.liang, "Rinnovo", "CN755208", DIR.rio, D4), richiesta(P.liang, "Rinnovo", "CN755208", DIR.rio, { familienname: "Liang", vorname: "Wu" })), [
    { code: "vertauscht", paare: [["solicitud.familienname", "ausweis.familienname"], ["solicitud.vorname", "ausweis.vorname"], ["solicitud.familienname", "memo.schreibweise"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.familienname", wert: "Wu" }, { f: "solicitud.vorname", wert: "Liang" }] } },
  ]),
  fall(209, 4, P.daniela, "rinnovo", RINNOVO, con(mesa(P.daniela, "Rinnovo", "CO618493", DIR.huerta, D4), richiesta(P.daniela, "Rinnovo", "CO618493", DIR.huerta, { familienname: "Restepo Paz" })), [
    { code: "umlaut", paare: [["solicitud.familienname", "ausweis.familienname"], ["solicitud.familienname", "cita.name"], ["solicitud.familienname", "memo.schreibweise"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.familienname", wert: "Restrepo Paz" }] } },
  ]),
  fall(210, 4, P.omar, "rinnovo", RINNOVO, con(mesa(P.omar, "Rinnovo", "JO302786", DIR.mayor17, D4), { ...passaporto(P.omar, "JO302786"), fax: true }), [
    { code: "fax", paare: [["ausweis.kopf", "memo.original"], ["ausweis.familienname", "memo.original"], ["ausweis.nummer", "memo.original"]], loesbar: false },
  ]),
  fall(211, 4, P.elena, "rinnovo", RINNOVO, con(mesa(P.elena, "Rinnovo", "BG936415", DIR.mayor71, D4), richiesta(P.elena, "Rinnovo", "BG936415", DIR.mayor71, {}, { tinte: "rot" })), [
    { code: "kuli", paare: [["solicitud.unterschrift", "memo.kuli"]], loesbar: true, loesung: { setze: [{ f: "solicitud.unterschrift", wert: firma(P.elena), tinte: "schwarz" }] } },
  ]),

  // ---- Day 5: questions this window doesn't decide -----------------------------------------
  fall(212, 5, P.diego, "cittadinanza", q("Buongiorno. Abito in Italia da più di dieci anni. Posso chiedere qui la cittadinanza?", "Good morning. I’ve lived in Italy for more than ten years. Can I apply for citizenship here?"),
    [passaporto(P.diego, "EC417092")], [
    { code: "derivar_cittadinanza", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
  fall(213, 5, P.nadia, "rilascio", RILASCIO, mesa(P.nadia, "Primo rilascio", "TN350984", DIR.olmo, D5)),
  fall(214, 5, P.mariam, "ricongiungimento", q("Buongiorno. Vorrei far venire in Italia mio marito. Posso consegnare qui i documenti?", "Good morning. I’d like to bring my husband to Italy. Can I hand in the documents here?"),
    [passaporto(P.mariam, "ML508263")], [
    { code: "derivar_ricongiungimento", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
  fall(215, 5, P.ali, "rilascio", RILASCIO, con(mesa(P.ali, "Primo rilascio", "AF263908", DIR.rio, D5), convocazione(P.ali, "Primo rilascio", "AF263908", "2027-03-22")), [
    { code: "frist", paare: CITA_MAL, loesbar: false },
  ]),
  fall(216, 5, P.sofia, "codice", q("Buongiorno. Mi serve il codice fiscale. Me lo può fare qui?", "Good morning. I need a codice fiscale. Can you do it for me here?"),
    [passaporto(P.sofia, "PY184675")], [
    { code: "sportello_codice", paare: [["kunde.anliegen", "memo.sportello"]], loesbar: false },
  ]),
  fall(217, 5, P.grace, "rilascio", RILASCIO, mesa(P.grace, "Primo rilascio", "NG730518", DIR.huerta, D5, { pagos: false }), [
    { code: "tasa_fehlt", paare: TASA_FALTA, loesbar: false },
  ]),
  fall(218, 5, P.ravi, "asl", q("Buongiorno. Vorrei la tessera sanitaria e scegliere il medico di base. Come faccio?", "Good morning. I’d like a health card and to choose a family doctor. How do I do that?"),
    [passaporto(P.ravi, "ZN602941")], [
    { code: "sportello_asl", paare: [["kunde.anliegen", "memo.sportello"]], loesbar: false },
  ]),
];

export const faelleVonTag = (tag) => HANDFAELLE.filter((f) => f.tag === tag);
