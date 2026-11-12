// Bruno at the desk (Préfecture sim; code ids keep the German game's names): cases. A case is
// plain data: a person, what they want (`anliegen`), the papers they slide across the desk, and
// the mistakes in them. Every field has an id "<doc>.<field>", and every mistake lists the field
// pairs that show it, so the Check mode compares ids, never text. Besides the papers there are
// three things on the desk with fields of their own: the calendar (kalender.heute), the
// customer's request in the speech bubble (kunde.anliegen) and Regi's memo (memo.<rule>).
//
// The right stamp is never stored: it is worked out from the case as it is now (`richtig`).
// Open mistakes → INCOMPLET, none → COMPLET; a mistake fixed by the right question is no
// longer open. That way the game can't contradict itself. COMPLET only ever means "the papers
// are complete": no stamp in this game decides anybody's right to stay or to a benefit.
//
// All people, numbers, addresses and offices are invented. scripts/check-extranjeria.mjs checks
// that a case's papers contradict each other exactly where its mistakes say so.

import { FEHLER, TAGE } from "./regeln.js";
import { deDatum } from "./daten.js";

// The paper kinds and their fields, in the order they are printed. The labels are the words
// printed on French papers (that's the vocabulary); `kind` groups fields that can be compared
// ("That matches."). Kind and field ids are kept from the German game, with new meanings:
// `ausweis` is the national ID card (CNI), `pass` the passport, `meldeschein` the mairie's
// inscription file (school and town services), `abmeldung` the summary of a procedure (ANEF
// request, CAF, carte Vitale), `wgb` the host's statement (attestation d'hébergement), `antrag`
// the library card request, `cita` the récépissé, `tasa` the electronic tax stamp. `justif`
// (proof of address) and `rib` (bank details) are new, `foto` stays. `opciones` are the boxes of
// a `formular` field; `kopf` is the small line at the top of the paper.
export const DOK_ARTEN = {
  ausweis: {
    titel: "Carte d’identité", kopf: "République française",
    felder: [
      ["familienname", "Nom", "name"], ["vorname", "Prénom", "vorname"],
      ["geburtsdatum", "Né(e) le", "geburtsdatum"], ["geburtsort", "Lieu de naissance", "ort"],
      ["gueltig", "Valable jusqu’au", "datum"], ["unterschrift", "Signature", "unterschrift"],
    ],
  },
  pass: {
    titel: "Passeport", kopf: "Document de voyage",
    felder: [
      ["familienname", "Nom", "name"], ["vorname", "Prénom", "vorname"],
      ["nummer", "N° du passeport", "nummer"],
      ["geburtsdatum", "Né(e) le", "geburtsdatum"], ["geburtsort", "Lieu de naissance", "ort"],
      ["gueltig", "Date d’expiration", "datum"], ["unterschrift", "Signature", "unterschrift"],
    ],
  },
  meldeschein: {
    titel: "Dossier d’inscription", kopf: "Mairie de Montbruno",
    opciones: ["Première inscription", "Changement d’adresse"],
    felder: [
      ["formular", "Motif", "formular"],
      ["familienname", "Nom", "name"], ["vorname", "Prénom", "vorname"],
      ["geburtsdatum", "Né(e) le", "geburtsdatum"],
      ["adresse", "Adresse", "adresse"], ["einzug", "J’habite ici depuis le", "datum"],
      ["unterschrift", "Signature", "unterschrift"],
    ],
  },
  abmeldung: {
    titel: "Demande", kopf: "Récapitulatif de la démarche",
    opciones: ["Titre de séjour (ANEF)", "Renouvellement de titre (ANEF)", "Allocation logement (CAF)", "Carte Vitale (ameli)"],
    felder: [
      ["formular", "Démarche", "formular"],
      ["familienname", "Nom", "name"], ["vorname", "Prénom", "vorname"],
      ["geburtsdatum", "Né(e) le", "geburtsdatum"],
      ["nummer", "N° de passeport", "nummer"],
      ["adresse", "Adresse en France", "adresse"],
      ["unterschrift", "Signature", "unterschrift"],
    ],
  },
  wgb: {
    titel: "Attestation d’hébergement", kopf: "Document de l’hébergeant",
    felder: [
      ["wohnungsgeber", "Hébergeant", "person"], ["adresse", "Adresse du logement", "adresse"],
      ["einzug", "Hébergé depuis le", "datum"], ["personen", "Personne hébergée", "name"],
      ["unterschrift", "Signature de l’hébergeant", "unterschrift"],
    ],
  },
  justif: {
    titel: "Justificatif de domicile", kopf: "Facture ou quittance",
    felder: [
      ["emetteur", "Émis par", "person"], ["titulaire", "Titulaire", "name"],
      ["adresse", "Adresse", "adresse"], ["datum", "Date du document", "datum"],
    ],
  },
  cita: {
    titel: "Récépissé", kopf: "Préfecture de Montbruno",
    felder: [
      ["name", "Au nom de", "name"], ["datum", "Valable jusqu’au", "datum"],
    ],
  },
  tasa: {
    titel: "Timbre fiscal", kopf: "Timbre électronique",
    felder: [
      ["tramite", "Démarche", "formular"], ["pagada", "Acheté le", "datum"],
    ],
  },
  rib: {
    titel: "RIB", kopf: "Relevé d’identité bancaire",
    felder: [
      ["titulaire", "Titulaire du compte", "name"], ["iban", "IBAN", "iban"],
    ],
  },
  foto: {
    titel: "Photo", kopf: "Photo d’identité",
    felder: [["fondo", "Fond", "fondo"], ["hecha", "Prise le", "datum"]],
  },
  antrag: {
    titel: "Carte de bibliothèque", kopf: "Mairie de Montbruno",
    felder: [["titel", "Demande de", "formular"], ["name", "Nom", "name"], ["rasse", "Race", "ort"], ["unterschrift", "Empreinte", "unterschrift"]],
  },
};

// Tapping a label (outside Check mode) shows its English meaning.
export const WOERTER = {
  "Carte d’identité": "ID card", "Passeport": "passport", "Dossier d’inscription": "registration file",
  "Demande": "request", "Attestation d’hébergement": "host’s statement (for someone staying with you)",
  "Justificatif de domicile": "proof of address", "Récépissé": "receipt for a residence request",
  "Timbre fiscal": "tax stamp", "RIB": "bank details slip", "Photo": "photo", "Carte de bibliothèque": "library card",
  "Nom": "surname", "Prénom": "first name", "Né(e) le": "born on", "Lieu de naissance": "place of birth",
  "Valable jusqu’au": "valid until", "Date d’expiration": "expiry date", "Signature": "signature", "N° du passeport": "passport number",
  "Motif": "reason", "Adresse": "address", "J’habite ici depuis le": "I have lived here since", "Démarche": "procedure",
  "N° de passeport": "passport number", "Adresse en France": "address in France", "Hébergeant": "host",
  "Adresse du logement": "address of the home", "Hébergé depuis le": "staying here since", "Personne hébergée": "person staying",
  "Signature de l’hébergeant": "host’s signature", "Émis par": "issued by", "Titulaire": "holder", "Date du document": "date of the document",
  "Au nom de": "in the name of", "Acheté le": "bought on", "Titulaire du compte": "account holder", "IBAN": "bank account number",
  "Fond": "background", "Prise le": "taken on", "Demande de": "request for", "Race": "breed", "Empreinte": "paw print",
  "Aujourd’hui": "today",
};

// Fields the Lernmodus leaves out: fewer lines to read, nothing a rule needs.
export const LERN_OHNE = new Set(["geburtsort", "wohnungsgeber", "emetteur", "iban"]);

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
  olmo: "12 rue des Tilleuls, 2e étage", mayor17: "17 rue Principale, 1er étage", mayor71: "71 rue Principale, 1er étage",
  sol: "3 place du Soleil, rez-de-chaussée", rio: "25 avenue de la Rivière, 4e étage", huerta: "8 rue du Verger, 3e étage",
};
const voll = (p) => `${p.vorname} ${p.familienname}`;
const firma = (p) => `${p.vorname[0]}. ${p.familienname.split(" ")[0]}`;
const gross = (s) => s.toLocaleUpperCase("fr-FR");
const person = (vorname, familienname, geburtsdatum, geburtsort, look) => ({ vorname, familienname, geburtsdatum, geburtsort, look });

const cni = (p, gueltig = "2031-05-11") => ({ id: "ausweis", art: "ausweis", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), geburtsdatum: deDatum(p.geburtsdatum), geburtsort: p.geburtsort, gueltig: deDatum(gueltig), unterschrift: firma(p) } });
const passeport = (p, nummer, gueltig = "2032-09-02", id = "ausweis") => ({ id, art: "pass", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), nummer, geburtsdatum: deDatum(p.geburtsdatum), geburtsort: p.geburtsort, gueltig: deDatum(gueltig), unterschrift: firma(p) } });
const dossier = (p, adresse, einzug, formular = "Première inscription", cambia = {}) => ({ id: "meldeschein", art: "meldeschein", felder: {
  formular, familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), adresse, einzug: deDatum(einzug), unterschrift: firma(p), ...cambia } });
const attestation = (p, adresse, einzug) => ({ id: "wgb", art: "wgb", felder: {
  wohnungsgeber: "Claire Fontaine", adresse, einzug: deDatum(einzug), personen: voll(p), unterschrift: "C. Fontaine" } });
const justificatif = (p, adresse, datum = "2027-02-18", id = "justif") => ({ id, art: "justif", felder: {
  emetteur: "Énergie Midi", titulaire: voll(p), adresse, datum: deDatum(datum) } });
const demande = (p, formular, nummer, adresse, cambia = {}, extra = {}) => ({ id: "solicitud", art: "abmeldung", ...extra, felder: {
  formular, familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), nummer, adresse, unterschrift: firma(p), ...cambia } });
const recepisse = (p, valable = "2027-06-30") => ({ id: "cita", art: "cita", felder: { name: voll(p), datum: deDatum(valable) } });
const timbre = (formular, achete = "2027-03-10") => ({ id: "tasa", art: "tasa", felder: { tramite: formular, pagada: deDatum(achete) } });
const rib = (p, titulaire = voll(p)) => ({ id: "rib", art: "rib", felder: { titulaire, iban: "FR76 3000 6000 0112 3456 7890 189" } });
const photo = (fondo = "uni clair") => ({ id: "foto", art: "foto", felder: { fondo, hecha: "02/03/2027" } });

const ANEF = "Titre de séjour (ANEF)", RENOUV = "Renouvellement de titre (ANEF)", CAF = "Allocation logement (CAF)", VITALE = "Carte Vitale (ameli)";

const q = (de, en) => ({ de, en });
const ALTA = q("Bonjour. Je viens d’arriver à Montbruno et je voudrais ouvrir mon dossier d’inscription à la mairie.", "Hello. I’ve just arrived in Montbruno and I’d like to open my registration file at the mairie.");
const ECOLE = q("Bonjour. Nous venons d’arriver à Montbruno. Je voudrais inscrire ma fille à l’école.", "Hello. We’ve just arrived in Montbruno. I’d like to enrol my daughter at school.");
const MUDANZA = q("Bonjour. Nous avons déménagé dans Montbruno. Je viens changer notre adresse pour l’école de mon fils.", "Hello. We’ve moved inside Montbruno. I’ve come to change our address for my son’s school.");
const ANEF_Q = q("Bonjour. J’ai créé mon compte sur le site de l’ANEF. Je voudrais faire ma demande de titre de séjour avec votre aide.", "Hello. I’ve created my account on the ANEF site. I’d like to make my residence-permit request with your help.");
const RENOUV_Q = q("Bonjour. Mon titre de séjour expire bientôt. Je voudrais faire ma demande de renouvellement en ligne.", "Hello. My residence permit expires soon. I’d like to make my renewal request online.");
const CAF_Q = q("Bonjour. J’ai un récépissé pour ma demande de titre. Je voudrais demander l’aide au logement de la CAF.", "Hello. I have a récépissé for my permit request. I’d like to apply for the CAF housing benefit.");
const VITALE_Q = q("Bonjour. Je voudrais ouvrir mes droits à l’Assurance maladie et avoir ma carte Vitale.", "Hello. I’d like to open my health-insurance rights and get my carte Vitale.");

const P = {
  // Day 1
  amina: person("Amina", "Benali", "1994-07-02", "Rabat", { form: 1, haut: 2, haar: 2, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 2 }),
  julien: person("Julien", "Marchand", "1988-11-23", "Lyon", { form: 2, haut: 1, haar: 0, haarfarbe: 1, brille: 0, bart: 2, kleid: 2, extra: 0 }),
  wei: person("Wei", "Chen", "2001-02-14", "Hangzhou", { form: 0, haut: 1, haar: 7, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 0 }),
  valentina: person("Valentina", "Rojas Mendoza", "1996-09-30", "Cali", { form: 1, haut: 3, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 7, extra: 0 }),
  oksana: person("Oksana", "Kovalenko", "1985-04-19", "Kyiv", { form: 0, haut: 0, haar: 5, haarfarbe: 3, brille: 1, bart: 0, kleid: 5, extra: 0 }),
  // Day 2
  mathieu: person("Mathieu", "Girard", "1979-01-08", "Nantes", { form: 2, haut: 1, haar: 4, haarfarbe: 4, brille: 1, bart: 1, kleid: 6, extra: 0 }),
  camille: person("Camille", "Roux", "1999-06-12", "Marseille", { form: 1, haut: 2, haar: 2, haarfarbe: 1, brille: 0, bart: 0, kleid: 4, extra: 2 }),
  youssef: person("Youssef", "Amrani", "1991-12-03", "Casablanca", { form: 0, haut: 3, haar: 6, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 0 }),
  ines: person("Inès", "Lefèvre", "2000-03-21", "Bordeaux", { form: 0, haut: 0, haar: 7, haarfarbe: 5, brille: 0, bart: 0, kleid: 2, extra: 3 }),
  coco: person("Coco", "", "2021-05-01", "Montbruno", { form: 0, haut: 0, haar: 4, haarfarbe: 4, brille: 0, bart: 0, kleid: 0, extra: 0 }),
  nadine: person("Nadine", "Perrin", "1972-10-15", "Dijon", { form: 1, haut: 1, haar: 2, haarfarbe: 4, brille: 1, bart: 0, kleid: 3, extra: 2 }),
  hugo: person("Hugo", "Lambert", "1991-04-04", "Lille", { form: 2, haut: 1, haar: 2, haarfarbe: 2, brille: 0, bart: 1, kleid: 5, extra: 0 }),
  // Day 3
  kevin: person("Kevin", "Mensah", "1990-05-14", "Accra", { form: 2, haut: 5, haar: 0, haarfarbe: 0, brille: 0, bart: 0, kleid: 2, extra: 0 }),
  anamaria: person("Ana María", "Torres Quispe", "1987-08-25", "Lima", { form: 1, haut: 3, haar: 5, haarfarbe: 0, brille: 0, bart: 0, kleid: 0, extra: 3 }),
  ionut: person("Ionuț", "Popescu", "1993-11-02", "Cluj-Napoca", { form: 0, haut: 1, haar: 6, haarfarbe: 1, brille: 1, bart: 0, kleid: 4, extra: 0 }),
  priya: person("Priya", "Sharma", "1994-02-11", "Mumbai", { form: 1, haut: 3, haar: 1, haarfarbe: 0, brille: 0, bart: 0, kleid: 7, extra: 2 }),
  thanh: person("Thanh", "Nguyen", "2001-01-20", "Hanoï", { form: 0, haut: 1, haar: 0, haarfarbe: 0, brille: 1, bart: 0, kleid: 5, extra: 0 }),
  // Day 4
  mateo: person("Mateo", "García Ruiz", "1984-03-09", "Rosario", { form: 2, haut: 1, haar: 3, haarfarbe: 1, brille: 0, bart: 2, kleid: 1, extra: 0 }),
  fatou: person("Fatou", "Diallo", "1998-07-07", "Dakar", { form: 1, haut: 5, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 5, extra: 2 }),
  liang: person("Liang", "Wu", "1992-04-28", "Guangzhou", { form: 0, haut: 1, haar: 0, haarfarbe: 0, brille: 1, bart: 0, kleid: 6, extra: 0 }),
  daniela: person("Daniela", "Gutiérrez Paz", "1989-01-17", "Medellín", { form: 1, haut: 2, haar: 7, haarfarbe: 2, brille: 0, bart: 0, kleid: 3, extra: 3 }),
  omar: person("Omar", "Haddad", "1980-10-05", "Amman", { form: 2, haut: 3, haar: 4, haarfarbe: 0, brille: 1, bart: 2, kleid: 6, extra: 0 }),
  elena: person("Elena", "Petrova", "1995-12-01", "Sofia", { form: 0, haut: 0, haar: 1, haarfarbe: 3, brille: 0, bart: 0, kleid: 4, extra: 0 }),
  pedro: person("Pedro", "Silva", "1986-06-06", "Porto", { form: 2, haut: 1, haar: 3, haarfarbe: 1, brille: 1, bart: 1, kleid: 5, extra: 0 }),
  // Day 5
  diego: person("Diego", "Salazar Rivas", "1993-06-16", "Quito", { form: 0, haut: 3, haar: 0, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 1 }),
  nadia: person("Nadia", "Bouzid", "1992-08-30", "Tunis", { form: 0, haut: 2, haar: 7, haarfarbe: 1, brille: 1, bart: 0, kleid: 6, extra: 0 }),
  mariam: person("Mariam", "Keita", "1990-02-22", "Bamako", { form: 1, haut: 5, haar: 2, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 0 }),
  ali: person("Ali", "Rahimi", "1986-09-14", "Kaboul", { form: 2, haut: 2, haar: 0, haarfarbe: 4, brille: 0, bart: 2, kleid: 2, extra: 0 }),
  sofia: person("Sofía", "Cáceres Luna", "1997-11-11", "Asunción", { form: 1, haut: 2, haar: 1, haarfarbe: 1, brille: 0, bart: 0, kleid: 7, extra: 2 }),
  grace: person("Grace", "Okafor", "1994-08-08", "Lagos", { form: 0, haut: 4, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 3 }),
  pavel: person("Pavel", "Novak", "1983-03-27", "Prague", { form: 1, haut: 0, haar: 1, haarfarbe: 5, brille: 1, bart: 0, kleid: 2, extra: 0 }),
};

const fall = (nr, tag, p, anliegen, satz, dokumente, fehler = [], mehr = {}) => ({ nr, tag, heute: TAGE[tag].heute, person: p, anliegen, satz, dokumente, fehler, ...mehr });

// Day 3 and 5, an ANEF request: passport, summary, tax stamp; on day 3 also proof of address and photo.
const mesaAnef = (p, formular, nummer, adresse, { pagos = true, completo = true } = {}) => [
  passeport(p, nummer), demande(p, formular, nummer, adresse),
  ...(completo ? [justificatif(p, adresse)] : []),
  ...(pagos ? [timbre(formular)] : []),
  ...(completo ? [photo()] : []),
];
// Day 4 and 5, CAF or carte Vitale: passport, summary, récépissé, bank details.
const mesaCaf = (p, formular, nummer, adresse, { conRib = true, valable } = {}) => [
  passeport(p, nummer), demande(p, formular, nummer, adresse), recepisse(p, valable), ...(conRib ? [rib(p)] : []),
];
/** Replace one paper of a set by id. */
const con = (papeles, ...neu) => papeles.map((d) => neu.find((n) => n.id === d.id) ?? d);

const TIMBRE_FALTA = [["solicitud.formular", "memo.tasa"], ["kunde.anliegen", "memo.tasa"]];
const RECEP_MAL = [["cita.datum", "kalender.heute"], ["cita.datum", "memo.recep"]];
const CADUCADO = [["ausweis.gueltig", "kalender.heute"], ["ausweis.gueltig", "memo.gueltig"]];
const JUSTIF_VIEJO = [["justif.datum", "kalender.heute"], ["justif.datum", "memo.recent"]];
const RIB_FALTA = [["solicitud.formular", "memo.rib"], ["kunde.anliegen", "memo.rib"]];

export const HANDFAELLE = [
  // ---- Day 1: mairie ---------------------------------------------------------------------
  fall(147, 1, P.amina, "alta", ALTA, [passeport(P.amina, "RB204518"), dossier(P.amina, DIR.olmo, "2027-03-06"), justificatif(P.amina, DIR.olmo)]),
  fall(148, 1, P.julien, "alta", ALTA, [cni(P.julien), dossier(P.julien, DIR.sol, "2027-03-10", "Première inscription", { geburtsdatum: "23/11/1998" }), justificatif(P.julien, DIR.sol)], [
    { code: "geburtsdatum", paare: [["meldeschein.geburtsdatum", "ausweis.geburtsdatum"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.geburtsdatum", wert: "23/11/1988" }] } },
  ]),
  fall(149, 1, P.wei, "alta", ALTA, [passeport(P.wei, "EH730261"), dossier(P.wei, DIR.mayor17, "2027-03-12"), attestation(P.wei, DIR.mayor71, "2027-03-12")], [
    { code: "wgb_adresse", paare: [["meldeschein.adresse", "wgb.adresse"]], loesbar: false },
  ]),
  fall(150, 1, P.valentina, "alta",
    q("Bonjour. Je n’ai pas encore de titre de séjour. Je peux quand même ouvrir mon dossier ?", "Hello. I don’t have a residence permit yet. Can I still open my file?"),
    [passeport(P.valentina, "AV915044"), dossier(P.valentina, DIR.huerta, "2027-03-01"), justificatif(P.valentina, DIR.huerta)], [],
    { zeilen: { genehmigt: q("Vraiment ? Quel soulagement ! Merci beaucoup.", "Really? What a relief! Thank you very much.") } }),
  fall(151, 1, P.oksana, "alta", ALTA, [passeport(P.oksana, "FU482703"), dossier(P.oksana, DIR.rio, "2027-03-08")], [
    { code: "wgb_fehlt", paare: [["meldeschein.adresse", "memo.wgb"], ["kunde.anliegen", "memo.wgb"]], loesbar: false },
  ]),

  // ---- Day 2: mairie, school enrolment ----------------------------------------------------
  fall(152, 2, P.mathieu, "cambio", MUDANZA, [cni(P.mathieu), dossier(P.mathieu, DIR.rio, "2027-03-11"), justificatif(P.mathieu, DIR.rio)], [
    { code: "formular", paare: [["kunde.anliegen", "meldeschein.formular"], ["memo.formular", "meldeschein.formular"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.formular", wert: "Changement d’adresse" }] } },
  ]),
  fall(153, 2, P.camille, "alta", ECOLE, [cni(P.camille, "2027-02-10"), dossier(P.camille, DIR.olmo, "2027-03-09"), justificatif(P.camille, DIR.olmo)], [
    { code: "abgelaufen", paare: CADUCADO, loesbar: false },
  ]),
  fall(154, 2, P.youssef, "alta", ECOLE, [passeport(P.youssef, "MA118842", "2026-12-31"), dossier(P.youssef, DIR.mayor17, "2027-03-05"), justificatif(P.youssef, DIR.mayor17)], [
    { code: "abgelaufen", paare: CADUCADO, loesbar: true, loesung: { neu: [passeport(P.youssef, "MA640097", "2036-11-20", "pass2")], weg: ["ausweis"] } },
  ]),
  fall(155, 2, P.ines, "alta", ECOLE, [cni(P.ines), dossier(P.ines, DIR.huerta, "2027-03-13", "Première inscription", { unterschrift: "" }), justificatif(P.ines, DIR.huerta)], [
    { code: "unterschrift", paare: [["meldeschein.unterschrift", "memo.unterschrift"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.unterschrift", wert: firma(P.ines) }] } },
  ]),
  fall(156, 2, P.coco, "biblioteca", q("Ouaf ! Je voudrais une carte de bibliothèque, s’il vous plaît.", "Woof! I’d like a library card, please."),
    [{ id: "antrag", art: "antrag", felder: { titel: "Carte de bibliothèque", name: "Coco", rasse: "Caniche", unterschrift: "🐾" } }], [
    { code: "zimmer", paare: [["kunde.anliegen", "memo.meldesachen"], ["antrag.titel", "memo.meldesachen"]], loesbar: false },
  ], { hund: true }),
  fall(157, 2, P.nadine, "cambio", MUDANZA, [cni(P.nadine), dossier(P.nadine, DIR.sol, "2027-03-02", "Changement d’adresse"), justificatif(P.nadine, DIR.sol)]),
  fall(158, 2, P.hugo, "alta", ECOLE, [cni(P.hugo), dossier(P.hugo, DIR.mayor71, "2027-03-03"), justificatif(P.hugo, DIR.mayor71, "2026-11-24")], [
    { code: "justif_alt", paare: JUSTIF_VIEJO, loesbar: true, loesung: { neu: [justificatif(P.hugo, DIR.mayor71, "2027-02-18", "justif2")], weg: ["justif"] } },
  ]),

  // ---- Day 3: ANEF help point -------------------------------------------------------------
  fall(201, 3, P.kevin, "anef", ANEF_Q, mesaAnef(P.kevin, ANEF, "GH552031", DIR.olmo)),
  fall(202, 3, P.anamaria, "anef", ANEF_Q, con(mesaAnef(P.anamaria, ANEF, "PE307716", DIR.rio), justificatif(P.anamaria, DIR.rio, "2026-11-20")), [
    { code: "justif_alt", paare: JUSTIF_VIEJO, loesbar: false },
  ]),
  fall(203, 3, P.ionut, "anef", ANEF_Q, mesaAnef(P.ionut, ANEF, "RO640218", DIR.sol, { pagos: false }), [
    { code: "tasa_fehlt", paare: TIMBRE_FALTA, loesbar: true, loesung: { neu: [timbre(ANEF, "2027-03-16")] } },
  ]),
  fall(204, 3, P.priya, "anef", ANEF_Q, con(mesaAnef(P.priya, ANEF, "IN883150", DIR.huerta), demande(P.priya, RENOUV, "IN883150", DIR.huerta)), [
    { code: "solicitud", paare: [["kunde.anliegen", "solicitud.formular"], ["tasa.tramite", "solicitud.formular"], ["memo.solicitud", "solicitud.formular"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.formular", wert: ANEF }] } },
  ]),
  fall(205, 3, P.thanh, "anef", ANEF_Q, con(mesaAnef(P.thanh, ANEF, "VN109374", DIR.mayor71), photo("bleu")), [
    { code: "foto_fondo", paare: [["foto.fondo", "memo.foto"]], loesbar: false },
  ]),

  // ---- Day 4: CAF, carte Vitale, récépissé ------------------------------------------------
  fall(206, 4, P.mateo, "caf", CAF_Q, mesaCaf(P.mateo, CAF, "AR471120", DIR.sol)),
  fall(207, 4, P.fatou, "secu", VITALE_Q, mesaCaf(P.fatou, VITALE, "SN290657", DIR.olmo, { valable: "2027-03-01" }), [
    { code: "recep_abgelaufen", paare: RECEP_MAL, loesbar: false },
  ]),
  fall(208, 4, P.liang, "secu", VITALE_Q, con(mesaCaf(P.liang, VITALE, "CN755208", DIR.rio), demande(P.liang, VITALE, "CN755208", DIR.rio, { familienname: "Liang", vorname: "Wu" })), [
    { code: "vertauscht", paare: [["solicitud.familienname", "ausweis.familienname"], ["solicitud.vorname", "ausweis.vorname"], ["solicitud.familienname", "memo.schreibweise"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.familienname", wert: "Wu" }, { f: "solicitud.vorname", wert: "Liang" }] } },
  ]),
  fall(209, 4, P.daniela, "caf", CAF_Q, con(mesaCaf(P.daniela, CAF, "CO618493", DIR.huerta), rib(P.daniela, "Camilo Gutiérrez")), [
    { code: "rib_name", paare: [["rib.titulaire", "ausweis.vorname"], ["rib.titulaire", "ausweis.familienname"], ["rib.titulaire", "memo.rib"]], loesbar: false },
  ]),
  fall(210, 4, P.omar, "caf", CAF_Q, con(mesaCaf(P.omar, CAF, "JO302786", DIR.mayor17), { ...passeport(P.omar, "JO302786"), fax: true }), [
    { code: "fax", paare: [["ausweis.kopf", "memo.original"], ["ausweis.familienname", "memo.original"], ["ausweis.nummer", "memo.original"]], loesbar: false },
  ]),
  fall(211, 4, P.elena, "secu", VITALE_Q, con(mesaCaf(P.elena, VITALE, "BG936415", DIR.mayor71), demande(P.elena, VITALE, "BG936415", DIR.mayor71, {}, { tinte: "rot" })), [
    { code: "kuli", paare: [["solicitud.unterschrift", "memo.kuli"]], loesbar: true, loesung: { setze: [{ f: "solicitud.unterschrift", wert: firma(P.elena), tinte: "schwarz" }] } },
  ]),
  fall(212, 4, P.pedro, "caf", CAF_Q, mesaCaf(P.pedro, CAF, "PT815390", DIR.rio, { conRib: false }), [
    { code: "rib_fehlt", paare: RIB_FALTA, loesbar: true, loesung: { neu: [rib(P.pedro)] } },
  ]),

  // ---- Day 5: questions this desk doesn't decide -------------------------------------------
  fall(213, 5, P.diego, "arraigo", q("Bonjour. J’ai reçu une lettre de refus pour mon titre de séjour. Vous pouvez régler ça ici ?", "Hello. I’ve received a letter refusing my residence permit. Can you sort that out here?"),
    [passeport(P.diego, "EC417092")], [
    { code: "derivar_arraigo", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
  fall(214, 5, P.nadia, "renouv", RENOUV_Q, mesaAnef(P.nadia, RENOUV, "TN350984", DIR.olmo, { completo: false })),
  fall(215, 5, P.mariam, "regularizacion", q("Bonjour. J’ai reçu une lettre avec « OQTF » écrit dessus. Pouvez-vous m’aider à la traiter ici ?", "Hello. I’ve received a letter with “OQTF” written on it. Can you help me deal with it here?"),
    [passeport(P.mariam, "ML508263")], [
    { code: "derivar_regularizacion", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
  fall(216, 5, P.ali, "caf", CAF_Q, mesaCaf(P.ali, CAF, "AF263908", DIR.rio, { valable: "2027-03-12" }), [
    { code: "recep_abgelaufen", paare: RECEP_MAL, loesbar: false },
  ]),
  fall(217, 5, P.sofia, "caf", q("Bonjour. Mon récépissé est valable et j’ai tout apporté pour la demande d’aide au logement.", "Hello. My récépissé is valid and I’ve brought everything for the housing-benefit request."),
    mesaCaf(P.sofia, CAF, "PY184675", DIR.sol)),
  fall(218, 5, P.grace, "anef", ANEF_Q, mesaAnef(P.grace, ANEF, "NG730518", DIR.huerta, { pagos: false, completo: false }), [
    { code: "tasa_fehlt", paare: TIMBRE_FALTA, loesbar: false },
  ]),
  fall(219, 5, P.pavel, "naturalisation", q("Bonjour. J’habite en France depuis six ans. Pouvez-vous accepter ma demande de naturalisation ici ?", "Hello. I’ve lived in France for six years. Can you accept my naturalisation request here?"),
    [passeport(P.pavel, "CZ472086")], [
    { code: "derivar_naturalisation", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
];

export const faelleVonTag = (tag) => HANDFAELLE.filter((f) => f.tag === tag);
