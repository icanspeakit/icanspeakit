// Bruno at the desk (Questura and Comune sim): the rules of the counter and the mistakes papers can have.
//
// Bruno works sportello (window) 3 in the invented town of Casalbruno: two days at the town hall
// (Anagrafe: residenza), then three days at the Questura desk (permesso di soggiorno, the Poste kit,
// renewal), where on the last day people also ask where to get the codice fiscale (Agenzia delle
// Entrate) and the tessera sanitaria and a medico di base (ASL). The player checks that the PAPERWORK
// IS COMPLETE, nothing else: no stamp in this game decides anybody's right to stay.
//
// TAGE: the five days, each with the rules on Regi's memo that day (`regeln`) and today's date.
//
// REGELN: one entry per rule. `tag` is the first day it appears (it is highlighted as new then).
// `art` says whether it is how it usually works in Italy ("echt", with a source type) or an openly
// made-up Casalbruno rule ("lindenau"; the key value is kept so the code keeps working). `memo` is
// the line on the memo, the key word in **bold**; `wirklich` is the "How it really works" text,
// general orientation and never legal advice. Every fact in `wirklich` is "to verify" (listed in
// the run report of the questura-sim item): offices, forms, fees and rules change.
//
// FEHLER: every mistake a case can carry. `regel` is the rule that makes it a mistake, `notiz` is
// what the notes say once the player has found it, `fragen` are the three questions offered,
// `passt` the one that fits; `loest` is the customer's answer when the right question fixes the
// case, `nicht` when it can't be fixed today.
//
// Key `de` holds the Italian being learnt (A2–B1, standard Italian, Lei at the counter; the key
// name is kept from the German original); `en` is the English meaning.

const q = (de, en) => ({ de, en });

const FUENTE_ANAGRAFE = "Official source type: Ministry of the Interior and your Comune’s Anagrafe pages (iscrizione anagrafica)";
const URL_ANAGRAFE = "https://www.interno.gov.it/";
const FUENTE_QUESTURA = "Official source type: Polizia di Stato, permesso di soggiorno pages";
const URL_QUESTURA = "https://www.poliziadistato.it/";
const FUENTE_POSTE = "Official source type: Poste Italiane, kit for the permesso di soggiorno (Sportello Amico), and the Polizia di Stato";
const URL_POSTE = "https://www.poste.it/";
const FUENTE_ENTRATE = "Official source type: Agenzia delle Entrate, codice fiscale pages";
const URL_ENTRATE = "https://www.agenziaentrate.gov.it/";
const FUENTE_ASL = "Official source type: Ministry of Health and your regional ASL, enrolment in the national health service (SSN)";
const URL_ASL = "https://www.salute.gov.it/";
const FUENTE_CITT = "Official source type: Ministry of the Interior, citizenship and immigration pages (citizenship rules changed in 2025)";
const URL_CITT = "https://www.interno.gov.it/";

export const TAGE = {
  1: { heute: "2027-03-15", ort: "anagrafe", titel: "Giorno 1 · Anagrafe", regeln: ["name", "wgb", "sinpermiso"] },
  2: { heute: "2027-03-16", ort: "anagrafe", titel: "Giorno 2 · Anagrafe", regeln: ["name", "gueltig", "formular", "unterschrift", "meldesachen", "sinpermiso"] },
  3: { heute: "2027-03-17", ort: "questura", titel: "Giorno 3 · Questura: primo rilascio", regeln: ["name", "gueltig", "frist", "tasa", "solicitud"] },
  4: { heute: "2027-03-18", ort: "questura", titel: "Giorno 4 · Questura: rinnovo", regeln: ["name", "schreibweise", "foto", "original", "kuli"] },
  5: { heute: "2027-03-19", ort: "questura", titel: "Giorno 5 · Domande allo sportello", regeln: ["name", "frist", "tasa", "derivar", "sportello"] },
};
export const LETZTER_TAG = 5;

export const REGELN = {
  name: {
    tag: 1,
    art: "echt",
    memo: q("Il **nome** e la **data di nascita** devono essere uguali su tutti i fogli e sul **documento d’identità**.", "Name and date of birth must be the same on every paper and on the ID."),
    wirklich: q("All’Anagrafe e in Questura i tuoi dati vengono confrontati con un documento d’identità: carta d’identità, passaporto o permesso di soggiorno.", "At the Anagrafe and at the Questura, your details are checked against an identity document: an identity card, a passport or a permesso di soggiorno."),
    quelle: FUENTE_ANAGRAFE,
    url: URL_ANAGRAFE,
  },
  wgb: {
    tag: 1,
    art: "echt",
    memo: q("Per controllare l’indirizzo, chiedi il **contratto d’affitto** o un documento simile. L’**indirizzo** deve coincidere.", "To check the address, ask for the rental contract or a similar paper. The address must match."),
    wirklich: q("Per la residenza il Comune di solito chiede un documento che mostri che abiti davvero in quella casa: un contratto d’affitto registrato, un atto di proprietà, un comodato o una dichiarazione di ospitalità. Dopo la richiesta la polizia locale può controllare che tu viva lì. Ogni Comune spiega cosa accetta.", "For the residenza the Comune usually asks for a paper showing that you really live in that home: a registered rental contract, property deeds, a loan-for-use agreement or a declaration of hospitality from the person who holds the home. After the application the local police may check that you live there. Each Comune explains what it accepts."),
    quelle: FUENTE_ANAGRAFE,
    url: URL_ANAGRAFE,
  },
  sinpermiso: {
    tag: 1,
    art: "echt",
    memo: q("I cittadini **UE** non hanno bisogno del permesso. Gli altri devono mostrare il **permesso di soggiorno** (o la ricevuta delle Poste per il rinnovo).", "EU citizens don’t need a permit. Everybody else has to show the permesso di soggiorno (or the Poste receipt for a renewal)."),
    wirklich: q("I cittadini dell’Unione europea si iscrivono all’Anagrafe con un documento d’identità. I cittadini di paesi fuori dall’UE di solito devono mostrare un permesso di soggiorno valido; se è in rinnovo, di solito basta la ricevuta delle Poste. Il permesso è un documento della Questura: l’Anagrafe non lo concede.", "Citizens of the European Union register at the Anagrafe with an identity document. Citizens of countries outside the EU usually have to show a valid permesso di soggiorno; if it is being renewed, the Poste receipt is usually enough. The permit itself is a Questura document: the Anagrafe doesn’t grant it."),
    quelle: FUENTE_ANAGRAFE,
    url: URL_ANAGRAFE,
  },
  gueltig: {
    tag: 2,
    art: "echt",
    memo: q("Il documento deve essere **valido**. Guarda la data di **scadenza** e il calendario.", "The document must be valid. Check the expiry date and the calendar."),
    wirklich: q("Un documento scaduto di solito non vale per la residenza e nemmeno in Questura. Per i cittadini non UE conta anche la scadenza del permesso di soggiorno. Controlla le scadenze con un po’ di anticipo.", "An expired document usually doesn’t count, neither for the residenza nor at the Questura. For non-EU citizens the expiry date of the permesso di soggiorno counts too. Check expiry dates in good time."),
    quelle: FUENTE_ANAGRAFE,
    url: URL_ANAGRAFE,
  },
  formular: {
    tag: 2,
    art: "echt",
    memo: q("Segna la **casella** giusta: nuovo a Casalbruno → **Nuova residenza**. Cambio di casa dentro Casalbruno → **Cambio di abitazione**.", "Tick the right box: new in Casalbruno → Nuova residenza (new residence). Moving inside Casalbruno → Cambio di abitazione (change of address)."),
    wirklich: q("Se ti trasferisci in un altro Comune, chiedi l’iscrizione anagrafica nel nuovo Comune. Se cambi casa nello stesso Comune, comunichi il cambio di abitazione. I moduli e le procedure online cambiano da un Comune all’altro.", "If you move to another municipality, you ask to be registered in the new one. If you move house inside the same municipality, you report a change of address. The forms and online procedures differ from one Comune to another."),
    quelle: FUENTE_ANAGRAFE,
    url: URL_ANAGRAFE,
  },
  unterschrift: {
    tag: 2,
    art: "echt",
    memo: q("Senza **firma**, niente timbro.", "No signature, no stamp."),
    wirklich: q("Le richieste su carta si firmano. Online ci si identifica in un altro modo, per esempio con lo SPID o con la carta d’identità elettronica (CIE).", "Paper applications are signed. Online you identify yourself another way, for example with SPID or the electronic identity card (CIE)."),
    quelle: FUENTE_ANAGRAFE,
    url: URL_ANAGRAFE,
  },
  meldesachen: {
    tag: 2,
    art: "lindenau",
    memo: q("Lo sportello 3 tratta solo la **residenza**. La **biblioteca** è nella stanza 12.", "Window 3 only deals with the residenza. The library is in room 12."),
    wirklich: null,
  },
  frist: {
    tag: 3,
    art: "echt",
    memo: q("La **convocazione** deve essere per **oggi**. Guarda la data e il calendario.", "The appointment must be for today. Check its date and the calendar."),
    wirklich: q("Dopo l’invio del kit allo sportello delle Poste, ricevi una ricevuta con la data della convocazione in Questura (per le impronte digitali e i documenti). Devi andare nel giorno, all’ora e nell’ufficio indicati. Non devi pagare nessuno per avere un appuntamento.", "After you send the kit at the post office counter, you get a receipt with the date of your appointment at the Questura (for fingerprints and documents). You go on that day, at that time, to that office. You don’t have to pay anybody to get an appointment."),
    quelle: FUENTE_POSTE,
    url: URL_POSTE,
  },
  tasa: {
    tag: 3,
    art: "echt",
    memo: q("Serve la **ricevuta del versamento** (con la marca da bollo), intestata a chi fa la richiesta.", "You need the payment receipt (with the revenue stamp), in the name of the person making the application."),
    wirklich: q("Per il permesso di soggiorno elettronico di solito si pagano una marca da bollo, un contributo per il rilascio (l’importo dipende dal tipo e dalla durata del permesso) e il servizio delle Poste. Gli importi cambiano: guardali sui siti ufficiali.", "For the electronic permesso di soggiorno you usually pay a revenue stamp (marca da bollo), a contribution for the issue (the amount depends on the type and length of the permit) and the Poste service. The amounts change, so look them up on the official sites."),
    quelle: FUENTE_POSTE,
    url: URL_POSTE,
  },
  solicitud: {
    tag: 3,
    art: "echt",
    memo: q("Nel kit puoi chiedere il **primo rilascio** o il **rinnovo**. La casella deve coincidere con quello che chiede la persona.", "In the kit you can ask for the first issue or for a renewal. The box must match what the person is asking for."),
    wirklich: q("Per molte richieste (primo rilascio, rinnovo, aggiornamento) si compila il kit giallo e lo si spedisce dallo sportello delle Poste (Sportello Amico). Poi arriva la convocazione in Questura. Non tutti i casi passano dal kit: nel dubbio, chiedi alla Questura o a un patronato.", "For many applications (first issue, renewal, update) you fill in the yellow kit and send it from the post office counter (Sportello Amico). Then you get the appointment at the Questura. Not every case goes through the kit: if in doubt, ask the Questura or a patronato."),
    quelle: FUENTE_POSTE,
    url: URL_POSTE,
  },
  schreibweise: {
    tag: 4,
    art: "lindenau",
    memo: q("Non confondere **nome** e **cognome**. Conta **ogni lettera**. Le maiuscole del passaporto possono non avere l’accento: NICOLO e Nicolò vanno bene.", "Don’t mix up first name and surname. Every letter counts. Capitals in a passport may have no accent: NICOLO and Nicolò are both fine."),
    wirklich: null,
  },
  foto: {
    tag: 4,
    art: "echt",
    memo: q("Per il rinnovo servono **fototessere** recenti con **sfondo bianco**.", "For the renewal you need recent passport photos with a white background."),
    wirklich: q("In Questura di solito servono fototessere recenti a colori, con sfondo chiaro e uniforme; di solito si prendono anche le impronte digitali. Controlla quante foto e quali documenti chiede la tua Questura.", "At the Questura you are usually asked for recent colour passport photos with a plain light background, and your fingerprints are usually taken too. Check how many photos and which documents your Questura asks for."),
    quelle: FUENTE_QUESTURA,
    url: URL_QUESTURA,
  },
  original: {
    tag: 4,
    art: "echt",
    memo: q("Il passaporto deve essere l’**originale**. Un **fax** non vale.", "The passport must be the original. A fax doesn’t count."),
    wirklich: q("Gli uffici di solito vogliono vedere il passaporto originale, e molti chiedono anche una fotocopia. Porta tutti e due.", "Offices usually want to see your original passport, and many ask for a photocopy as well. Bring both."),
    quelle: FUENTE_QUESTURA,
    url: URL_QUESTURA,
  },
  kuli: {
    tag: 4,
    art: "lindenau",
    memo: q("Oggi si firma solo con la **penna nera**.", "Today, black pen only."),
    wirklich: null,
  },
  derivar: {
    tag: 5,
    art: "echt",
    memo: q("**Cittadinanza** e **ricongiungimento familiare**: qui non si decidono. Informa la persona e mandala alle **informazioni ufficiali**.", "Citizenship and family reunification aren’t decided at this window. Inform the person and send them to the official information."),
    wirklich: q("La cittadinanza si chiede online sul portale del Ministero dell’Interno, non a uno sportello della Questura; le regole sono cambiate nel 2025 e dipendono dal tipo di richiesta. Il ricongiungimento familiare passa dallo Sportello unico per l’immigrazione della Prefettura. Ogni caso è diverso: prima di agire, leggi le informazioni ufficiali o rivolgiti a un patronato, a un’associazione o a un avvocato.", "Citizenship is applied for online on the Ministry of the Interior’s portal, not at a Questura window; the rules changed in 2025 and depend on the type of application. Family reunification goes through the Sportello unico per l’immigrazione at the Prefettura. Each case is different, so before you act, read the official information or ask a patronato, an advice organisation or a lawyer."),
    quelle: FUENTE_CITT,
    url: URL_CITT,
  },
  sportello: {
    tag: 5,
    art: "echt",
    memo: q("Il **codice fiscale** si chiede all’**Agenzia delle Entrate**. La **tessera sanitaria** e il **medico di base** sono compito dell’**ASL**. Qui si trattano solo i permessi.", "The codice fiscale is applied for at the Agenzia delle Entrate. The health card and the family doctor are for the ASL. Here we only deal with permits."),
    wirklich: q("Il codice fiscale si chiede all’Agenzia delle Entrate, di solito allo sportello con un documento valido, ed è gratuito. La tessera sanitaria e la scelta del medico di base si fanno all’ASL (il nome cambia secondo la regione), di solito con un documento, il permesso di soggiorno e il codice fiscale. Le condizioni per iscriversi al servizio sanitario dipendono dal tipo di permesso: controlla sul sito della tua ASL.", "The codice fiscale is applied for at the Agenzia delle Entrate, usually at the counter with a valid document, and it is free. The health card (tessera sanitaria) and the choice of a family doctor (medico di base) are done at the ASL (its name differs by region), usually with an identity document, the permesso di soggiorno and the codice fiscale. The conditions for enrolling in the health service depend on the type of permit: check your ASL’s website."),
    quelle: FUENTE_ENTRATE + "; " + FUENTE_ASL,
    url: URL_ENTRATE,
  },
};

/** The rules on the memo on a given day. */
export const regelnBis = (tag) => TAGE[tag]?.regeln ?? [];
export const neueRegeln = (tag) => regelnBis(tag).filter((id) => REGELN[id].tag === tag);

// Questions that fit some mistake; mixed into each list as the two wrong ones.
const F = {
  name: q("Può controllare il suo nome, per favore?", "Could you check your name, please?"),
  datum: q("Può controllare la sua data di nascita, per favore?", "Could you check your date of birth, please?"),
  pass: q("Ha un altro documento valido?", "Do you have another valid document?"),
  wgb: q("Mi fa vedere il contratto d’affitto, per favore?", "Could you show me the rental contract, please?"),
  adresse: q("Questo indirizzo è giusto? Il numero non coincide.", "Is this address right? The number doesn’t match."),
  wohin: q("Viene da un altro Comune o ha cambiato casa a Casalbruno?", "Have you come from another Comune or moved house inside Casalbruno?"),
  unterschreiben: q("Può firmare qui, per favore?", "Could you sign here, please?"),
  familienname: q("Qual è il suo nome e qual è il suo cognome?", "Which is your first name and which is your surname?"),
  kuli: q("Può firmare di nuovo con la penna nera?", "Could you sign again in black pen?"),
  original: q("Ha il passaporto originale?", "Do you have the original passport?"),
  zimmer: q("Viene per la tessera della biblioteca?", "Are you here for a library card?"),
  cita: q("Può guardare la data della sua convocazione?", "Could you look at the date of your appointment?"),
  tasa: q("Ha la ricevuta del versamento?", "Do you have the payment receipt?"),
  tasaName: q("A nome di chi è il versamento?", "In whose name was the payment made?"),
  foto: q("Ha un’altra foto con lo sfondo bianco?", "Do you have another photo with a white background?"),
  tramite: q("Viene per il primo rilascio o per il rinnovo?", "Have you come for the first issue or for the renewal?"),
  sabe: q("Ha letto le informazioni ufficiali sul suo caso?", "Have you read the official information about your case?"),
  permesso: q("Ha il permesso di soggiorno o la ricevuta delle Poste?", "Do you have the permesso di soggiorno or the Poste receipt?"),
  dove: q("Sa a quale ufficio deve rivolgersi?", "Do you know which office you need to go to?"),
};

const VUELVO = q("Mmm, non so bene come sistemarlo. Torno un altro giorno.", "Hmm, I’m not sure how to fix it. I’ll come back another day.");

export const FEHLER = {
  familienname: {
    regel: "name",
    notiz: q("I cognomi non coincidono", "The surnames don’t match"),
    fragen: [F.name, F.wgb, F.unterschreiben], passt: 0,
    loest: q("Ah, un errore di battitura! Lo correggo subito.", "Oh, a typo! I’ll correct it right now."),
    nicht: VUELVO,
  },
  vorname: {
    regel: "name",
    notiz: q("Il nome non coincide", "The first name doesn’t match"),
    fragen: [F.pass, F.name, F.unterschreiben], passt: 1,
    loest: q("È vero! Manca una lettera. Lo correggo.", "You’re right! A letter is missing. I’ll correct it."),
    nicht: VUELVO,
  },
  geburtsdatum: {
    regel: "name",
    notiz: q("La data di nascita non coincide", "The date of birth doesn’t match"),
    fragen: [F.adresse, F.wohin, F.datum], passt: 2,
    loest: q("Accidenti, ho sbagliato numero! Aspetti, lo scrivo bene.", "Oh, I got a number wrong! Just a moment, I’ll write it properly."),
    nicht: VUELVO,
  },
  abgelaufen: {
    regel: "gueltig",
    notiz: q("Il documento è scaduto", "The document has expired"),
    fragen: [F.pass, F.unterschreiben, F.name], passt: 0,
    loest: q("Sì, ecco il passaporto nuovo. Questo è valido.", "Yes, here’s my new passport. This one is valid."),
    nicht: q("No, non ne ho un altro. Lo rinnovo e torno.", "No, I don’t have another one. I’ll renew it and come back."),
  },
  wgb_fehlt: {
    regel: "wgb",
    notiz: q("Manca il documento sull’indirizzo", "The paper for the address is missing"),
    fragen: [F.name, F.wgb, F.pass], passt: 1,
    loest: q("Ah, sì, ce l’ho nello zaino! Ecco.", "Oh yes, it’s in my rucksack! Here you are."),
    nicht: q("Abito da un amico e non ho un contratto. Torno con una sua dichiarazione di ospitalità.", "I live with a friend and have no contract. I’ll come back with a declaration of hospitality from them."),
  },
  wgb_adresse: {
    regel: "wgb",
    notiz: q("L’indirizzo non coincide con il contratto", "The address doesn’t match the contract"),
    fragen: [F.adresse, F.datum, F.zimmer], passt: 0,
    loest: q("Ha ragione, ho scambiato i numeri. Correggo.", "You’re right, I swapped the numbers. I’ll correct it."),
    nicht: q("Il contratto è sbagliato: il padrone di casa ha fatto un errore. Torno con uno corretto.", "The contract is wrong: the landlord made a mistake. I’ll come back with a corrected one."),
  },
  permesso_fehlt: {
    regel: "sinpermiso",
    notiz: q("Manca il permesso di soggiorno", "The permesso di soggiorno is missing"),
    fragen: [F.permesso, F.datum, F.zimmer], passt: 0,
    loest: null,
    nicht: q("Ho solo il passaporto. Il permesso è ancora in Questura. Torno quando ho la ricevuta o il permesso.", "I only have my passport. The permit is still at the Questura. I’ll come back when I have the receipt or the permit."),
  },
  formular: {
    regel: "formular",
    notiz: q("La casella segnata non è quella giusta", "The wrong box is ticked"),
    fragen: [F.wgb, F.unterschreiben, F.wohin], passt: 2,
    loest: q("Ho cambiato casa a Casalbruno. Allora segno l’altra casella. Ecco fatto.", "I’ve moved house inside Casalbruno. So I’ll tick the other box. There you go."),
    nicht: VUELVO,
  },
  unterschrift: {
    regel: "unterschrift",
    notiz: q("Manca la firma", "The signature is missing"),
    fragen: [F.datum, F.unterschreiben, F.adresse], passt: 1,
    loest: q("Ops, me ne sono dimenticata! Ecco fatto.", "Oops, I forgot! There you go."),
    nicht: q("Mi si è scaricata la penna … Torno subito.", "My pen has run out … I’ll be right back."),
  },
  zimmer: {
    regel: "meldesachen",
    notiz: q("Sportello sbagliato: la biblioteca è nella stanza 12", "Wrong window: the library is in room 12"),
    fragen: [F.zimmer, F.wgb, F.name], passt: 0,
    loest: null,
    nicht: q("Bau! Sì, grazie! … Stanza 12? Bau, grazie!", "Woof! Yes, please! … Room 12? Woof, thank you!"),
  },
  frist: {
    regel: "frist",
    notiz: q("La convocazione non è per oggi", "The appointment isn’t for today"),
    fragen: [F.cita, F.kuli, F.name], passt: 0,
    loest: null,
    nicht: q("È vero, non è oggi! Torno il giorno della mia convocazione.", "You’re right, it isn’t today! I’ll come back on the day of my appointment."),
  },
  tasa_fehlt: {
    regel: "tasa",
    notiz: q("Manca la ricevuta del versamento", "The payment receipt is missing"),
    fragen: [F.original, F.tasa, F.name], passt: 1,
    loest: q("Ah, sì! L’ho pagato ieri alle Poste. Ecco la ricevuta.", "Oh yes! I paid it at the post office yesterday. Here’s the receipt."),
    nicht: q("Non l’ho ancora pagato. Vado alle Poste e torno.", "I haven’t paid it yet. I’ll go to the post office and come back."),
  },
  tasa_name: {
    regel: "tasa",
    notiz: q("Il versamento è a nome di un’altra persona", "The payment is in someone else’s name"),
    fragen: [F.foto, F.cita, F.tasaName], passt: 2,
    loest: null,
    nicht: q("Mio fratello ha compilato il bollettino con il suo nome. Lo pago di nuovo a nome mio e torno.", "My brother filled in the payment slip with his name. I’ll pay again in mine and come back."),
  },
  solicitud: {
    regel: "solicitud",
    notiz: q("La casella non coincide con quello che chiede", "The box doesn’t match what the person is asking for"),
    fragen: [F.tramite, F.datum, F.foto], passt: 0,
    loest: q("Ah, ho sbagliato casella! La cambio subito.", "Oh, I ticked the wrong box! I’ll change it now."),
    nicht: VUELVO,
  },
  foto_fondo: {
    regel: "foto",
    notiz: q("La foto non ha lo sfondo bianco", "The photo doesn’t have a white background"),
    fragen: [F.foto, F.kuli, F.tasa], passt: 0,
    loest: q("Sì, ne ho fatte diverse. Tenga, questa ha lo sfondo bianco.", "Yes, I had several taken. Here, this one has a white background."),
    nicht: q("Non ne ho un’altra. Ne faccio una alla macchinetta e torno.", "I don’t have another one. I’ll get one in the photo booth and come back."),
  },
  vertauscht: {
    regel: "schreibweise",
    notiz: q("Nome e cognome sono scambiati", "First name and surname are swapped"),
    fragen: [F.familienname, F.pass, F.cita], passt: 0,
    loest: q("Ah! Il mio cognome va sull’altra riga. Lo correggo.", "Oh! My surname goes on the other line. I’ll correct it."),
    nicht: VUELVO,
  },
  // code kept from the German umlaut mistake; in Italian it is any spelling slip
  umlaut: {
    regel: "schreibweise",
    notiz: q("Il cognome è scritto male", "The surname is spelt wrong"),
    fragen: [F.tramite, F.name, F.kuli], passt: 1,
    loest: q("Ha ragione, manca una erre. Adesso è giusto.", "You’re right, there’s an r missing. Now it’s right."),
    nicht: VUELVO,
  },
  kuli: {
    regel: "kuli",
    notiz: q("La firma non è con la penna nera", "The signature isn’t in black pen"),
    fragen: [F.kuli, F.original, F.datum], passt: 0,
    loest: q("Nera? Va bene. Ecco, adesso è nera.", "Black? OK. There, now it’s black."),
    nicht: q("Ho solo una penna rossa … Esco a comprarne una nera.", "I’ve only got a red pen … I’ll pop out and buy a black one."),
  },
  fax: {
    regel: "original",
    notiz: q("Il passaporto è un fax, non l’originale", "The passport is a fax, not the original"),
    fragen: [F.unterschreiben, F.original, F.tramite], passt: 1,
    loest: q("Vuole l’originale? Ecco.", "You want the original? Here it is."),
    nicht: q("L’originale è a casa. Ma il fax è nuovo di zecca!", "The original’s at home. But the fax is brand new!"),
  },
  derivar_cittadinanza: {
    regel: "derivar",
    notiz: q("La cittadinanza non si decide a questo sportello", "Citizenship isn’t decided at this window"),
    fragen: [F.foto, F.sabe, F.cita], passt: 1,
    loest: null,
    nicht: q("Non ancora. Allora guardo il sito ufficiale e chiedo a un patronato. Grazie.", "Not yet. Then I’ll look at the official website and ask at a patronato. Thank you."),
  },
  derivar_ricongiungimento: {
    regel: "derivar",
    notiz: q("Il ricongiungimento familiare non si decide a questo sportello", "Family reunification isn’t decided at this window"),
    fragen: [F.sabe, F.kuli, F.tasa], passt: 0,
    loest: null,
    nicht: q("No, me ne hanno solo parlato. Allora guardo il sito ufficiale e chiedo consiglio.", "No, someone only told me about it. I’ll look at the official website and get advice."),
  },
  sportello_codice: {
    regel: "sportello",
    notiz: q("Il codice fiscale si chiede all’Agenzia delle Entrate", "The codice fiscale is applied for at the Agenzia delle Entrate"),
    fragen: [F.dove, F.foto, F.cita], passt: 0,
    loest: null,
    nicht: q("No, non lo so. Allora vado all’Agenzia delle Entrate con il passaporto. Grazie!", "No, I don’t know. Then I’ll go to the Agenzia delle Entrate with my passport. Thank you!"),
  },
  sportello_asl: {
    regel: "sportello",
    notiz: q("La tessera sanitaria e il medico di base sono compito dell’ASL", "The health card and the family doctor are for the ASL"),
    fragen: [F.tasa, F.dove, F.kuli], passt: 1,
    loest: null,
    nicht: q("Non lo sapevo. Allora vado all’ASL con il permesso e il codice fiscale. Grazie!", "I didn’t know that. Then I’ll go to the ASL with my permit and codice fiscale. Thank you!"),
  },
};

// What a customer says to a question that doesn't fit their case.
export const WIRR = [
  q("Scusi? Non la capisco.", "Sorry? I don’t understand."),
  q("Ehm … perché me lo chiede?", "Erm … why are you asking me that?"),
  q("Ma c’è tutto, no?", "But it’s all there, isn’t it?"),
  q("Come? Non credo che sia questo il problema.", "What? I don’t think that’s the problem."),
];
