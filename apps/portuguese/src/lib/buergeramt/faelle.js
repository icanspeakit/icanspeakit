// Bruno at the desk (AIMA and Finanças sim; code ids keep the German game's names): cases. A case is
// plain data: a person, what they want (`anliegen`), the papers they slide across the desk, and
// the mistakes in them. Every field has an id "<doc>.<field>", and every mistake lists the field
// pairs that show it, so the Check mode compares ids, never text. Besides the papers there are
// three things on the desk with fields of their own: the calendar (kalender.heute), the
// customer's request in the speech bubble (kunde.anliegen) and Regi's memo (memo.<rule>).
//
// The right stamp is never stored: it is worked out from the case as it is now (`richtig`).
// Open mistakes → DEVOLVIDO, none → COMPLETO; a mistake fixed by the right question is no
// longer open. That way the game can't contradict itself. COMPLETO only ever means "the papers
// are complete": no stamp in this game decides anybody's right to stay.
//
// All people, numbers, addresses and offices are invented. scripts/check-extranjeria.mjs checks
// that a case's papers contradict each other exactly where its mistakes say so.
//
// pt-BR note: the papers use Portugal's words and forms (NIF, NISS, "Morada", "Apelidos", "Nome
// próprio", "Multibanco"); in Brazil you would see CPF, "endereço", "sobrenome" and "boleto".

import { FEHLER, TAGE } from "./regeln.js";
import { deDatum } from "./daten.js";

// The paper kinds and their fields, in the order they are printed. The labels are the words
// printed on Portuguese papers (that's the vocabulary); `kind` groups fields that can be compared
// ("That matches."). Kind and field ids are kept from the German game: `ausweis` is the national
// ID card, `pass` the passport, `atestado` the Junta's certificate request (day 1), `meldeschein`
// the centro de saúde registration form (day 2), `abmeldung` the Finanças / Segurança Social
// request with its NIF/NISS boxes (day 3), `aima` the AIMA application (days 4–5), `wgb` the
// rental contract, `antrag` the library card request. `cita`, `tasa` and `foto` are new.
// `opciones` are the boxes of a `formular` field; `kopf` is the small line at the top of the paper.
const CAMPOS_PESSOA = [
  ["familienname", "Apelidos", "name"], ["vorname", "Nome próprio", "vorname"],
  ["geburtsdatum", "Nascimento", "geburtsdatum"],
];
export const DOK_ARTEN = {
  ausweis: {
    titel: "Documento de identificação", kopf: "Documento oficial",
    felder: [
      ["familienname", "Apelidos", "name"], ["vorname", "Nome próprio", "vorname"],
      ["geburtsdatum", "Nascimento", "geburtsdatum"], ["geburtsort", "Local", "ort"],
      ["gueltig", "Válido até", "datum"], ["unterschrift", "Assinatura", "unterschrift"],
    ],
  },
  pass: {
    titel: "Passaporte", kopf: "Documento de viagem",
    felder: [
      ["familienname", "Apelidos", "name"], ["vorname", "Nome próprio", "vorname"],
      ["nummer", "Número", "nummer"],
      ["geburtsdatum", "Nascimento", "geburtsdatum"], ["geburtsort", "Local", "ort"],
      ["gueltig", "Validade", "datum"], ["unterschrift", "Assinatura", "unterschrift"],
    ],
  },
  atestado: {
    titel: "Pedido de atestado", kopf: "Junta de Freguesia de Vilabruno",
    opciones: ["Primeiro pedido", "Alteração de morada"],
    felder: [
      ["formular", "Motivo", "formular"], ...CAMPOS_PESSOA,
      ["adresse", "Morada", "adresse"], ["einzug", "Moro aqui desde", "datum"],
      ["unterschrift", "Assinatura", "unterschrift"],
    ],
  },
  meldeschein: {
    titel: "Inscrição no centro de saúde", kopf: "SNS · Centro de Saúde de Vilabruno",
    opciones: ["Inscrição", "Alteração de morada"],
    felder: [
      ["formular", "Motivo", "formular"], ...CAMPOS_PESSOA,
      ["adresse", "Morada", "adresse"], ["einzug", "Moro aqui desde", "datum"],
      ["unterschrift", "Assinatura", "unterschrift"],
    ],
  },
  abmeldung: {
    titel: "Pedido de número", kopf: "Finanças · Segurança Social de Vilabruno",
    opciones: ["NIF", "NISS"],
    felder: [
      ["formular", "Peço o", "formular"], ...CAMPOS_PESSOA,
      ["nummer", "N.º do passaporte", "nummer"],
      ["adresse", "Morada em Portugal", "adresse"],
      ["unterschrift", "Assinatura", "unterschrift"],
    ],
  },
  aima: {
    titel: "Pedido à AIMA", kopf: "AIMA · Balcão de Vilabruno",
    opciones: ["Autorização de residência", "Renovação"],
    felder: [
      ["formular", "Peço", "formular"], ...CAMPOS_PESSOA,
      ["nummer", "N.º do passaporte", "nummer"],
      ["adresse", "Morada em Portugal", "adresse"],
      ["unterschrift", "Assinatura", "unterschrift"],
    ],
  },
  wgb: {
    titel: "Contrato de arrendamento", kopf: "Contrato particular",
    felder: [
      ["wohnungsgeber", "Senhorio", "person"], ["adresse", "Imóvel", "adresse"],
      ["einzug", "Data de início", "datum"], ["personen", "Arrendatário", "name"],
      ["unterschrift", "Assinatura do senhorio", "unterschrift"],
    ],
  },
  cita: {
    titel: "Marcação", kopf: "Comprovativo de marcação",
    felder: [
      ["name", "Em nome de", "name"], ["nummer", "Documento", "nummer"],
      ["tramite", "Assunto", "formular"], ["datum", "Data", "datum"], ["hora", "Hora", "hora"],
    ],
  },
  tasa: {
    titel: "Comprovativo da taxa", kopf: "Referência Multibanco · AIMA",
    felder: [
      ["name", "Em nome de", "name"], ["nummer", "Documento", "nummer"],
      ["tramite", "Assunto", "formular"], ["pagada", "Paga em", "datum"],
    ],
  },
  foto: {
    titel: "Fotografia", kopf: "Fotografia tipo passe",
    felder: [["fondo", "Fundo", "fondo"], ["hecha", "Tirada em", "datum"]],
  },
  antrag: {
    titel: "Cartão de biblioteca", kopf: "Câmara Municipal de Vilabruno",
    felder: [["titel", "Pedido de", "formular"], ["name", "Nome", "name"], ["rasse", "Raça", "ort"], ["unterschrift", "Pata", "unterschrift"]],
  },
};

// Tapping a label (outside Check mode) shows its English meaning.
export const WOERTER = {
  "Documento de identificação": "identity document", "Passaporte": "passport", "Pedido de atestado": "request for a certificate",
  "Inscrição no centro de saúde": "registration at the health centre", "Pedido de número": "request for a number",
  "Pedido à AIMA": "application to AIMA", "Contrato de arrendamento": "rental contract", "Marcação": "appointment",
  "Comprovativo da taxa": "fee receipt", "Fotografia": "photo", "Cartão de biblioteca": "library card",
  "Apelidos": "surnames", "Nome próprio": "first name", "Nascimento": "date of birth", "Local": "place of birth",
  "Válido até": "valid until", "Validade": "expiry date", "Assinatura": "signature", "Número": "number",
  "Motivo": "reason", "Morada": "address", "Moro aqui desde": "I have lived here since", "Peço o": "I am asking for the",
  "Peço": "I am asking for", "N.º do passaporte": "passport number", "Morada em Portugal": "address in Portugal",
  "Senhorio": "landlord", "Imóvel": "property", "Data de início": "start date", "Arrendatário": "tenant",
  "Assinatura do senhorio": "landlord’s signature", "Em nome de": "in the name of", "Documento": "document",
  "Assunto": "subject", "Data": "date", "Hora": "time", "Paga em": "paid on", "Fundo": "background",
  "Tirada em": "taken on", "Pedido de": "request for", "Nome": "name", "Raça": "breed", "Pata": "paw print", "Hoje": "today",
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
  olival: "Rua do Olival 12, 2.º Esq.", direita17: "Rua Direita 17, 1.º Dto.", direita71: "Rua Direita 71, 1.º Dto.",
  sol: "Praça do Sol 3, r/c", rio: "Avenida do Rio 25, 4.º C", horta: "Rua da Horta 8, 3.º D",
};
const voll = (p) => `${p.vorname} ${p.familienname}`;
const firma = (p) => `${p.vorname[0]}. ${p.familienname.split(" ")[0]}`;
const gross = (s) => s.toLocaleUpperCase("pt-PT");
const person = (vorname, familienname, geburtsdatum, geburtsort, look) => ({ vorname, familienname, geburtsdatum, geburtsort, look });

// What the customer asks for, as the box on the application says it (anliegen → box).
const TRAMITE = { nif: "NIF", niss: "NISS", ar: "Autorização de residência", renov: "Renovação" };

const bi = (p, gueltig = "2031-05-11") => ({ id: "ausweis", art: "ausweis", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), geburtsdatum: deDatum(p.geburtsdatum), geburtsort: p.geburtsort, gueltig: deDatum(gueltig), unterschrift: firma(p) } });
const passaporte = (p, nummer, gueltig = "2032-09-02", id = "ausweis") => ({ id, art: "pass", felder: {
  familienname: gross(p.familienname), vorname: gross(p.vorname), nummer, geburtsdatum: deDatum(p.geburtsdatum), geburtsort: p.geburtsort, gueltig: deDatum(gueltig), unterschrift: firma(p) } });
// Day 1 paper (the Junta) and day 2 paper (the centro de saúde): same doc id, different kind.
const atestado = (p, adresse, einzug, formular = "Primeiro pedido", cambia = {}) => ({ id: "meldeschein", art: "atestado", felder: {
  formular, familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), adresse, einzug: deDatum(einzug), unterschrift: firma(p), ...cambia } });
const inscricao = (p, adresse, einzug, formular = "Inscrição", cambia = {}) => ({ id: "meldeschein", art: "meldeschein", felder: {
  formular, familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), adresse, einzug: deDatum(einzug), unterschrift: firma(p), ...cambia } });
const contrato = (p, adresse, einzug) => ({ id: "wgb", art: "wgb", felder: {
  wohnungsgeber: "Rosa Medeiros Gil", adresse, einzug: deDatum(einzug), personen: voll(p), unterschrift: "R. Medeiros" } });
// `art` abmeldung = Finanças / Segurança Social (day 3), aima = AIMA (days 4–5)
const pedido = (p, tramite, nummer, adresse, cambia = {}, extra = {}) => ({ id: "solicitud", art: tramite === "NIF" || tramite === "NISS" ? "abmeldung" : "aima", ...extra, felder: {
  formular: tramite, familienname: p.familienname, vorname: p.vorname, geburtsdatum: deDatum(p.geburtsdatum), nummer, adresse, unterschrift: firma(p), ...cambia } });
const marcacao = (p, tramite, nummer, datum, hora = "09:30") => ({ id: "cita", art: "cita", felder: {
  name: voll(p), nummer, tramite, datum: deDatum(datum), hora } });
const taxa = (p, tramite, nummer, pagada = "2027-03-10", cambia = {}) => ({ id: "tasa", art: "tasa", felder: {
  name: voll(p), nummer, tramite, pagada: deDatum(pagada), ...cambia } });
const foto = (fondo = "claro") => ({ id: "foto", art: "foto", felder: { fondo, hecha: "02/03/2027" } });

const q = (de, en) => ({ de, en });
const ATESTADO = q("Bom dia. Acabei de chegar a Vilabruno e preciso de um atestado de residência.", "Good morning. I’ve just arrived in Vilabruno and I need a certificate of residence.");
const INSCRICAO = q("Bom dia. Ainda não tenho médico de família e venho inscrever-me no centro de saúde.", "Good morning. I don’t have a family doctor yet and I’ve come to register at the health centre.");
const MUDANCA = q("Bom dia. Mudei-me dentro de Vilabruno e venho alterar a minha morada.", "Good morning. I’ve moved within Vilabruno and I’ve come to change my address.");
const NIF = q("Bom dia. Tenho marcação para pedir o NIF: preciso dele para o contrato de arrendamento.", "Good morning. I have an appointment to ask for the NIF: I need it for the rental contract.");
const NISS = q("Bom dia. Tenho marcação para pedir o NISS: vou começar a trabalhar.", "Good morning. I have an appointment to ask for the NISS: I’m about to start work.");
const AR = q("Bom dia. Tenho marcação na AIMA para pedir a autorização de residência: tenho contrato de trabalho.", "Good morning. I have an appointment at AIMA to apply for a residence permit: I have a work contract.");
const RENOV = q("Bom dia. O meu título de residência caduca em breve e venho pedir a renovação.", "Good morning. My residence card expires soon and I’ve come to ask for the renewal.");

const P = {
  // Day 1
  amina: person("Amina", "Benali", "1994-07-02", "Rabat", { form: 1, haut: 2, haar: 1, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 2 }),
  pablo: person("Pablo", "Romero Vega", "1988-11-23", "Saragoça", { form: 2, haut: 1, haar: 0, haarfarbe: 1, brille: 0, bart: 2, kleid: 2, extra: 0 }),
  wei: person("Wei", "Chen", "2001-02-14", "Hangzhou", { form: 0, haut: 1, haar: 7, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 0 }),
  valentina: person("Valentina", "Rojas Mendoza", "1996-09-30", "Cali", { form: 1, haut: 3, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 7, extra: 0 }),
  oksana: person("Oksana", "Kovalenko", "1985-04-19", "Kiev", { form: 0, haut: 0, haar: 5, haarfarbe: 3, brille: 1, bart: 0, kleid: 5, extra: 0 }),
  // Day 2
  jordi: person("Jordi", "Puig Ferrer", "1979-01-08", "Girona", { form: 2, haut: 1, haar: 4, haarfarbe: 4, brille: 1, bart: 1, kleid: 6, extra: 0 }),
  aitana: person("Aitana", "Ruiz Molina", "1999-06-12", "Sevilha", { form: 1, haut: 2, haar: 2, haarfarbe: 1, brille: 0, bart: 0, kleid: 4, extra: 2 }),
  youssef: person("Youssef", "Amrani", "1991-12-03", "Casablanca", { form: 0, haut: 3, haar: 6, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 0 }),
  nerea: person("Nerea", "Aguirre Sanz", "2000-03-21", "Bilbau", { form: 0, haut: 0, haar: 7, haarfarbe: 5, brille: 0, bart: 0, kleid: 2, extra: 3 }),
  coco: person("Coco", "", "2021-05-01", "Vilabruno", { form: 0, haut: 0, haar: 4, haarfarbe: 4, brille: 0, bart: 0, kleid: 0, extra: 0 }),
  carmen: person("Carmen", "Núñez Gálvez", "1972-10-15", "Córdova", { form: 1, haut: 1, haar: 2, haarfarbe: 4, brille: 1, bart: 0, kleid: 3, extra: 2 }),
  // Day 3
  kevin: person("Kevin", "Mensah", "1990-05-14", "Acra", { form: 2, haut: 5, haar: 0, haarfarbe: 0, brille: 0, bart: 0, kleid: 2, extra: 0 }),
  anamaria: person("Ana Maria", "Torres Quispe", "1987-08-25", "Lima", { form: 1, haut: 3, haar: 5, haarfarbe: 0, brille: 0, bart: 0, kleid: 0, extra: 3 }),
  ionut: person("Ionuț", "Popescu", "1993-11-02", "Cluj-Napoca", { form: 0, haut: 1, haar: 6, haarfarbe: 1, brille: 1, bart: 0, kleid: 4, extra: 0 }),
  priya: person("Priya", "Sharma", "1994-02-11", "Bombaim", { form: 1, haut: 3, haar: 1, haarfarbe: 0, brille: 0, bart: 0, kleid: 7, extra: 2 }),
  thanh: person("Thanh", "Nguyen", "2001-01-20", "Hanói", { form: 0, haut: 1, haar: 0, haarfarbe: 0, brille: 1, bart: 0, kleid: 5, extra: 0 }),
  // Day 4
  mateo: person("Mateo", "García Ruiz", "1984-03-09", "Rosário", { form: 2, haut: 1, haar: 3, haarfarbe: 1, brille: 0, bart: 2, kleid: 1, extra: 0 }),
  fatou: person("Fatou", "Diallo", "1998-07-07", "Dacar", { form: 1, haut: 5, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 5, extra: 2 }),
  liang: person("Liang", "Wu", "1992-04-28", "Cantão", { form: 0, haut: 1, haar: 0, haarfarbe: 0, brille: 1, bart: 0, kleid: 6, extra: 0 }),
  daniela: person("Daniela", "Gutiérrez Paz", "1989-01-17", "Medellín", { form: 1, haut: 2, haar: 7, haarfarbe: 2, brille: 0, bart: 0, kleid: 3, extra: 3 }),
  omar: person("Omar", "Haddad", "1980-10-05", "Amã", { form: 2, haut: 3, haar: 4, haarfarbe: 0, brille: 1, bart: 2, kleid: 6, extra: 0 }),
  elena: person("Elena", "Petrova", "1995-12-01", "Sófia", { form: 0, haut: 0, haar: 1, haarfarbe: 3, brille: 0, bart: 0, kleid: 4, extra: 0 }),
  // Day 5
  diego: person("Diego", "Salazar Rivas", "1993-06-16", "Quito", { form: 0, haut: 3, haar: 0, haarfarbe: 0, brille: 0, bart: 1, kleid: 0, extra: 1 }),
  nadia: person("Nadia", "Bouzid", "1992-08-30", "Tunes", { form: 0, haut: 2, haar: 7, haarfarbe: 1, brille: 1, bart: 0, kleid: 6, extra: 0 }),
  mariam: person("Mariam", "Keita", "1990-02-22", "Bamaco", { form: 1, haut: 5, haar: 2, haarfarbe: 0, brille: 1, bart: 0, kleid: 1, extra: 0 }),
  ali: person("Ali", "Rahimi", "1986-09-14", "Cabul", { form: 2, haut: 2, haar: 0, haarfarbe: 4, brille: 0, bart: 2, kleid: 2, extra: 0 }),
  sofia: person("Sofia", "Cáceres Luna", "1997-11-11", "Assunção", { form: 1, haut: 2, haar: 1, haarfarbe: 1, brille: 0, bart: 0, kleid: 7, extra: 2 }),
  grace: person("Grace", "Okafor", "1994-08-08", "Lagos", { form: 0, haut: 4, haar: 3, haarfarbe: 0, brille: 0, bart: 0, kleid: 3, extra: 3 }),
};

const fall = (nr, tag, p, anliegen, satz, dokumente, fehler = [], mehr = {}) => ({ nr, tag, heute: TAGE[tag].heute, person: p, anliegen, satz, dokumente, fehler, ...mehr });

// One day's window on days 3–5: papers that agree, apart from what the case changes. Days 3 has no
// fee (NIF and NISS are free of an AIMA fee), AIMA days have fee receipt and photo.
const mesa = (p, anliegen, nummer, adresse, hoy, { pagos = anliegen === "ar" || anliegen === "renov", conFoto = pagos } = {}) => [
  passaporte(p, nummer), pedido(p, TRAMITE[anliegen], nummer, adresse), marcacao(p, TRAMITE[anliegen], nummer, hoy),
  ...(pagos ? [taxa(p, TRAMITE[anliegen], nummer)] : []), ...(conFoto ? [foto()] : []),
];
/** Replace one paper of a set by id. */
const con = (papeles, ...neu) => papeles.map((d) => neu.find((n) => n.id === d.id) ?? d);

const TAXA_FALTA = [["cita.tramite", "memo.tasa"], ["solicitud.formular", "memo.tasa"], ["kunde.anliegen", "memo.tasa"]];
const MARCACAO_MAL = [["cita.datum", "kalender.heute"], ["cita.datum", "memo.frist"]];
const CADUCADO = [["ausweis.gueltig", "kalender.heute"], ["ausweis.gueltig", "memo.gueltig"]];

const D3 = TAGE[3].heute, D4 = TAGE[4].heute, D5 = TAGE[5].heute;

export const HANDFAELLE = [
  // ---- Day 1: Junta de Freguesia, atestado de residência -----------------------------------
  fall(147, 1, P.amina, "alta", ATESTADO, [passaporte(P.amina, "RB204518"), atestado(P.amina, DIR.olival, "2027-03-06"), contrato(P.amina, DIR.olival, "2027-03-06")]),
  fall(148, 1, P.pablo, "alta", ATESTADO, [bi(P.pablo), atestado(P.pablo, DIR.sol, "2027-03-10", "Primeiro pedido", { geburtsdatum: "23/11/1998" }), contrato(P.pablo, DIR.sol, "2027-03-10")], [
    { code: "geburtsdatum", paare: [["meldeschein.geburtsdatum", "ausweis.geburtsdatum"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.geburtsdatum", wert: "23/11/1988" }] } },
  ]),
  fall(149, 1, P.wei, "alta", ATESTADO, [passaporte(P.wei, "EH730261"), atestado(P.wei, DIR.direita17, "2027-03-12"), contrato(P.wei, DIR.direita71, "2027-03-12")], [
    { code: "wgb_adresse", paare: [["meldeschein.adresse", "wgb.adresse"]], loesbar: false },
  ]),
  fall(150, 1, P.valentina, "alta",
    q("Bom dia. Ainda não tenho título de residência. Posso pedir o atestado na mesma?", "Good morning. I don’t have a residence permit yet. Can I still ask for the certificate?"),
    [passaporte(P.valentina, "AV915044"), atestado(P.valentina, DIR.horta, "2027-03-01"), contrato(P.valentina, DIR.horta, "2027-03-01")], [],
    { zeilen: { genehmigt: q("A sério? Que alívio! Muito obrigada.", "Really? What a relief! Thank you very much.") } }),
  fall(151, 1, P.oksana, "alta", ATESTADO, [passaporte(P.oksana, "FU482703"), atestado(P.oksana, DIR.rio, "2027-03-08")], [
    { code: "wgb_fehlt", paare: [["meldeschein.adresse", "memo.wgb"], ["kunde.anliegen", "memo.wgb"]], loesbar: false },
  ]),

  // ---- Day 2: centro de saúde, número de utente -------------------------------------------
  fall(152, 2, P.jordi, "cambio", MUDANCA, [bi(P.jordi), inscricao(P.jordi, DIR.rio, "2027-03-11")], [
    { code: "formular", paare: [["kunde.anliegen", "meldeschein.formular"], ["memo.formular", "meldeschein.formular"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.formular", wert: "Alteração de morada" }] } },
  ]),
  fall(153, 2, P.aitana, "alta", INSCRICAO, [bi(P.aitana, "2027-02-10"), inscricao(P.aitana, DIR.olival, "2027-03-09")], [
    { code: "abgelaufen", paare: CADUCADO, loesbar: false },
  ]),
  fall(154, 2, P.youssef, "alta", INSCRICAO, [passaporte(P.youssef, "MA118842", "2026-12-31"), inscricao(P.youssef, DIR.direita17, "2027-03-05")], [
    { code: "abgelaufen", paare: CADUCADO, loesbar: true, loesung: { neu: [passaporte(P.youssef, "MA640097", "2036-11-20", "pass2")], weg: ["ausweis"] } },
  ]),
  fall(155, 2, P.nerea, "alta", INSCRICAO, [bi(P.nerea), inscricao(P.nerea, DIR.horta, "2027-03-13", "Inscrição", { unterschrift: "" })], [
    { code: "unterschrift", paare: [["meldeschein.unterschrift", "memo.unterschrift"]], loesbar: true, loesung: { setze: [{ f: "meldeschein.unterschrift", wert: firma(P.nerea) }] } },
  ]),
  fall(156, 2, P.coco, "biblioteca", q("Au! Quero um cartão de biblioteca, por favor.", "Woof! I’d like a library card, please."),
    [{ id: "antrag", art: "antrag", felder: { titel: "Cartão de biblioteca", name: "Coco", rasse: "Caniche", unterschrift: "🐾" } }], [
    { code: "zimmer", paare: [["kunde.anliegen", "memo.meldesachen"], ["antrag.titel", "memo.meldesachen"]], loesbar: false },
  ], { hund: true }),
  fall(157, 2, P.carmen, "cambio", MUDANCA, [bi(P.carmen), inscricao(P.carmen, DIR.sol, "2027-03-02", "Alteração de morada")]),

  // ---- Day 3: Finanças (NIF) and Segurança Social (NISS) ----------------------------------
  fall(201, 3, P.kevin, "nif", NIF, mesa(P.kevin, "nif", "GH552031", DIR.olival, D3)),
  fall(202, 3, P.anamaria, "nif", NIF, con(mesa(P.anamaria, "nif", "PE307716", DIR.rio, D3), marcacao(P.anamaria, "NIF", "PE307716", "2027-03-18")), [
    { code: "frist", paare: MARCACAO_MAL, loesbar: false },
  ]),
  fall(203, 3, P.ionut, "niss", NISS, con(mesa(P.ionut, "niss", "RO640218", DIR.sol, D3), passaporte(P.ionut, "RO640218", "2027-02-28")), [
    { code: "abgelaufen", paare: CADUCADO, loesbar: false },
  ]),
  fall(204, 3, P.priya, "niss", NISS, con(mesa(P.priya, "niss", "IN883150", DIR.horta, D3), pedido(P.priya, "NIF", "IN883150", DIR.horta)), [
    { code: "solicitud", paare: [["kunde.anliegen", "solicitud.formular"], ["cita.tramite", "solicitud.formular"], ["memo.solicitud", "solicitud.formular"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.formular", wert: "NISS" }] } },
  ]),
  fall(205, 3, P.thanh, "nif", NIF, con(mesa(P.thanh, "nif", "VN109374", DIR.direita71, D3), pedido(P.thanh, "NIF", "VN109374", DIR.direita71, { vorname: "Tanh" })), [
    { code: "vorname", paare: [["solicitud.vorname", "ausweis.vorname"], ["solicitud.vorname", "cita.name"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.vorname", wert: "Thanh" }] } },
  ]),

  // ---- Day 4: AIMA, autorização de residência ---------------------------------------------
  fall(206, 4, P.mateo, "ar", AR, mesa(P.mateo, "ar", "AR471120", DIR.sol, D4)),
  fall(207, 4, P.fatou, "ar", AR, con(mesa(P.fatou, "ar", "SN290657", DIR.olival, D4), foto("azul")), [
    { code: "foto_fondo", paare: [["foto.fondo", "memo.foto"]], loesbar: true, loesung: { setze: [{ f: "foto.fondo", wert: "claro" }] } },
  ]),
  fall(208, 4, P.liang, "ar", AR, con(mesa(P.liang, "ar", "CN755208", DIR.rio, D4), pedido(P.liang, "Autorização de residência", "CN755208", DIR.rio, { familienname: "Liang", vorname: "Wu" })), [
    { code: "vertauscht", paare: [["solicitud.familienname", "ausweis.familienname"], ["solicitud.vorname", "ausweis.vorname"], ["solicitud.familienname", "memo.schreibweise"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.familienname", wert: "Wu" }, { f: "solicitud.vorname", wert: "Liang" }] } },
  ]),
  fall(209, 4, P.daniela, "ar", AR, con(mesa(P.daniela, "ar", "CO618493", DIR.horta, D4), pedido(P.daniela, "Autorização de residência", "CO618493", DIR.horta, { familienname: "Gutiérez Paz" })), [
    { code: "umlaut", paare: [["solicitud.familienname", "ausweis.familienname"], ["solicitud.familienname", "cita.name"], ["solicitud.familienname", "memo.schreibweise"]], loesbar: true,
      loesung: { setze: [{ f: "solicitud.familienname", wert: "Gutiérrez Paz" }] } },
  ]),
  fall(210, 4, P.omar, "ar", AR, con(mesa(P.omar, "ar", "JO302786", DIR.direita17, D4), { ...passaporte(P.omar, "JO302786"), fax: true }), [
    { code: "fax", paare: [["ausweis.kopf", "memo.original"], ["ausweis.familienname", "memo.original"], ["ausweis.nummer", "memo.original"]], loesbar: false },
  ]),
  fall(211, 4, P.elena, "ar", AR, con(mesa(P.elena, "ar", "BG936415", DIR.direita71, D4), pedido(P.elena, "Autorização de residência", "BG936415", DIR.direita71, {}, { tinte: "rot" })), [
    { code: "kuli", paare: [["solicitud.unterschrift", "memo.kuli"]], loesbar: true, loesung: { setze: [{ f: "solicitud.unterschrift", wert: firma(P.elena), tinte: "schwarz" }] } },
  ]),
  fall(218, 4, P.ionut, "ar", AR, mesa(P.ionut, "ar", "RO640218", DIR.sol, D4, { pagos: false, conFoto: true }), [
    { code: "tasa_fehlt", paare: TAXA_FALTA, loesbar: true, loesung: { neu: [taxa(P.ionut, "Autorização de residência", "RO640218", "2027-03-16")] } },
  ]),

  // ---- Day 5: renewals and questions this window doesn't decide ---------------------------
  fall(212, 5, P.diego, "nacionalidade", q("Bom dia. Vivo cá há alguns anos. Posso pedir aqui a nacionalidade portuguesa?", "Good morning. I’ve lived here for some years. Can I apply for Portuguese nationality here?"),
    [passaporte(P.diego, "EC417092")], [
    { code: "derivar_nacionalidade", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
  fall(213, 5, P.nadia, "renov", RENOV, mesa(P.nadia, "renov", "TN350984", DIR.olival, D5)),
  fall(214, 5, P.mariam, "manifestacao", q("Bom dia. Ouvi falar da manifestação de interesse. Posso entregar aqui os meus papéis?", "Good morning. I’ve heard about the manifestação de interesse. Can I hand in my papers here?"),
    [passaporte(P.mariam, "ML508263")], [
    { code: "derivar_manifestacao", paare: [["kunde.anliegen", "memo.derivar"]], loesbar: false },
  ]),
  fall(215, 5, P.ali, "renov", RENOV, con(mesa(P.ali, "renov", "AF263908", DIR.rio, D5), marcacao(P.ali, "Renovação", "AF263908", "2027-03-22")), [
    { code: "frist", paare: MARCACAO_MAL, loesbar: false },
  ]),
  fall(216, 5, P.sofia, "renov", RENOV, mesa(P.sofia, "renov", "PY184675", DIR.sol, D5)),
  fall(217, 5, P.grace, "renov", RENOV, mesa(P.grace, "renov", "NG730518", DIR.horta, D5, { pagos: false, conFoto: true }), [
    { code: "tasa_fehlt", paare: TAXA_FALTA, loesbar: false },
  ]),
  fall(219, 5, P.thanh, "renov", RENOV, con(mesa(P.thanh, "renov", "VN109374", DIR.direita71, D5), taxa(P.thanh, "Renovação", "VN109374", "2027-03-10", { name: "Minh Nguyen" })), [
    { code: "tasa_name", paare: [["tasa.name", "ausweis.vorname"], ["tasa.name", "solicitud.vorname"], ["tasa.name", "cita.name"], ["tasa.name", "memo.tasa"]], loesbar: false },
  ]),
];

export const faelleVonTag = (tag) => HANDFAELLE.filter((f) => f.tag === tag);
