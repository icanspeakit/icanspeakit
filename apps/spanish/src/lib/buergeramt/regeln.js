// Bruno at the desk (Extranjería sim): the rules of the counter and the mistakes papers can have.
//
// Bruno works window 3 in the invented town of Villabruno: two days at the town hall (padrón),
// then three days at the foreigners' office (NIE, TIE, questions). The player checks that the
// PAPERWORK IS COMPLETE, nothing else: no stamp in this game decides anybody's right to stay.
//
// TAGE: the five days, each with the rules on Regi's memo that day (`regeln`) and today's date.
//
// REGELN: one entry per rule. `tag` is the first day it appears (it is highlighted as new then).
// `art` says whether it is how it usually works in Spain ("echt", with a source type) or an openly
// made-up Villabruno rule ("lindenau"; the key value is kept so the code keeps working). `memo` is
// the line on the memo, the key word in **bold**; `wirklich` is the "How it really works" text,
// general orientation and never legal advice. Facts were last checked in November 2026, and the
// ones still open are listed under "to verify" in the run report.
//
// FEHLER: every mistake a case can carry. `regel` is the rule that makes it a mistake, `notiz` is
// what the notes say once the player has found it, `fragen` are the three questions offered,
// `passt` the one that fits; `loest` is the customer's answer when the right question fixes the
// case, `nicht` when it can't be fixed today.
//
// Key `de` holds the Spanish being learnt (A2–B1, Castilian, usted at the counter; the key name is
// kept from the German original); `en` is the English meaning.

const q = (de, en) => ({ de, en });

const FUENTE_PADRON = "BOE: instructions to town halls on the padrón (Resolution of 17 February 2020)";
const URL_PADRON = "https://www.boe.es/buscar/act.php?id=BOE-A-2020-4784";
const FUENTE_EXT = "Official source type: the Spanish government’s immigration pages and your Oficina de Extranjería";
const URL_EXT = "https://www.inclusion.gob.es/web/migraciones";
const FUENTE_CITA = "Official source type: the public administrations’ e-office (sede electrónica), cita previa";
const URL_CITA = "https://sede.administracionespublicas.gob.es/pagina/index/directorio/icpplus";
const FUENTE_POLICIA = "Official source type: Policía Nacional, foreign nationals’ pages";
const URL_POLICIA = "https://www.policia.es/_es/extranjeria_extranjeros.php";

export const TAGE = {
  1: { heute: "2027-03-15", ort: "padron", titel: "Día 1 · Padrón", regeln: ["name", "wgb", "sinpermiso"] },
  2: { heute: "2027-03-16", ort: "padron", titel: "Día 2 · Padrón", regeln: ["name", "gueltig", "formular", "unterschrift", "meldesachen"] },
  3: { heute: "2027-03-17", ort: "extranjeria", titel: "Día 3 · NIE", regeln: ["name", "gueltig", "frist", "tasa", "solicitud"] },
  4: { heute: "2027-03-18", ort: "extranjeria", titel: "Día 4 · TIE", regeln: ["name", "schreibweise", "foto", "original", "kuli"] },
  5: { heute: "2027-03-19", ort: "extranjeria", titel: "Día 5 · Consultas", regeln: ["name", "frist", "tasa", "derivar"] },
};
export const LETZTER_TAG = 5;

export const REGELN = {
  name: {
    tag: 1,
    art: "echt",
    memo: q("El **nombre** y la **fecha de nacimiento** deben ser iguales en todos los papeles y en el **documento de identidad**.", "Name and date of birth must be the same on every paper and on the ID."),
    wirklich: q("En el padrón y en Extranjería comprueban tus datos con un documento de identidad: DNI, pasaporte o tarjeta de extranjero.", "At the padrón and at Extranjería, your details are checked against an identity document: a Spanish DNI, a passport or a foreigner’s card."),
    quelle: FUENTE_PADRON,
    url: URL_PADRON,
  },
  wgb: {
    tag: 1,
    art: "echt",
    memo: q("Para comprobar la dirección, pide el **contrato de alquiler** u otro papel parecido. La **dirección** debe coincidir.", "To check the address, ask for the rental contract or a similar paper. The address must match."),
    wirklich: q("El ayuntamiento puede pedir un contrato de alquiler, una escritura u otro documento parecido. Si no tienes contrato, a veces sirve otra prueba, como una autorización de quien vive allí. Cada ayuntamiento explica qué acepta.", "The town hall may ask for a rental contract, property deeds or a similar paper. With no contract, other proof can sometimes work, such as written consent from the person who holds the home, and the town hall can check in other ways. A refusal has to be a reasoned decision. Ask your own town hall what it accepts."),
    quelle: FUENTE_PADRON,
    url: URL_PADRON,
  },
  sinpermiso: {
    tag: 1,
    art: "echt",
    memo: q("Para el padrón **no hace falta** permiso de residencia.", "You don’t need a residence permit for the padrón."),
    wirklich: q("El ayuntamiento no controla si tu estancia en España es legal o no: el padrón solo dice dónde vives. Si eres de fuera de la UE y no tienes residencia de larga duración, normalmente debes renovarlo cada dos años.", "The town hall does not check whether your stay in Spain is legal: the padrón only records where you live. If you are from outside the EU and have no long-term residence, you usually have to renew your entry every two years, or it lapses."),
    quelle: FUENTE_PADRON,
    url: URL_PADRON,
  },
  gueltig: {
    tag: 2,
    art: "echt",
    memo: q("El documento debe estar **en vigor**. Mira la fecha de **caducidad** y el calendario.", "The document must be valid. Check the expiry date and the calendar."),
    wirklich: q("Para el padrón, un documento caducado normalmente no vale, salvo que lleves también la solicitud de renovación. En Extranjería también suelen pedir un pasaporte en vigor.", "For the padrón an expired document normally doesn’t count, unless you also bring your renewal application. Extranjería usually asks for a valid passport too."),
    quelle: FUENTE_PADRON,
    url: URL_PADRON,
  },
  formular: {
    tag: 2,
    art: "echt",
    memo: q("Marca la **casilla** correcta: nuevo en Villabruno → **Alta**. Mudanza dentro de Villabruno → **Cambio de domicilio**.", "Tick the right box: new in Villabruno → Alta (new registration). Moving inside Villabruno → Cambio de domicilio (change of address)."),
    wirklich: q("Si te mudas a otro municipio, te das de alta en el nuevo. Si te mudas dentro del mismo municipio, pides un cambio de domicilio. Los impresos cambian de un ayuntamiento a otro.", "If you move to another municipality, you register in the new one. If you move inside the same municipality, you ask for a change of address. The paper forms differ from one town hall to another."),
    quelle: FUENTE_PADRON,
    url: URL_PADRON,
  },
  unterschrift: {
    tag: 2,
    art: "echt",
    memo: q("Sin **firma**, no hay sello.", "No signature, no stamp."),
    wirklich: q("Las solicitudes en papel llevan tu firma. Por internet se firma de otra forma, por ejemplo con certificado digital o Cl@ve.", "Paper applications carry your signature. Online you sign another way, for example with a digital certificate or Cl@ve."),
    quelle: FUENTE_EXT,
    url: URL_EXT,
  },
  meldesachen: {
    tag: 2,
    art: "lindenau",
    memo: q("La ventanilla 3 solo atiende el **padrón**. La **biblioteca** está en la sala 12.", "Window 3 only deals with the padrón. The library is in room 12."),
    wirklich: null,
  },
  frist: {
    tag: 3,
    art: "echt",
    memo: q("La **cita** debe ser para **hoy**. Mira la fecha de la cita y el calendario.", "The appointment must be for today. Check its date and the calendar."),
    wirklich: q("Muchos trámites de extranjería necesitan cita previa, y hay que ir el día, a la hora y a la oficina de la cita. Se pide en la sede electrónica de las administraciones públicas. La cita es gratis: no hace falta pagar a nadie por ella.", "Many immigration procedures need an appointment (cita previa), and you go on its day, at its time, to its office. You book on the public administrations’ e-office. The appointment itself is free, so you don’t have to pay anybody for one."),
    quelle: FUENTE_CITA,
    url: URL_CITA,
  },
  tasa: {
    tag: 3,
    art: "echt",
    memo: q("Hace falta el **justificante de la tasa** (modelo 790, código 012), a nombre de quien hace el trámite.", "You need the fee receipt (form 790, code 012), in the name of the person doing the procedure."),
    wirklich: q("Los trámites de NIE y TIE ante la policía suelen pagarse con el modelo 790, código 012, en el banco o por internet. El importe cambia: míralo en la web oficial.", "NIE and TIE procedures at the police are usually paid with form 790, code 012, at a bank or online. The amount changes, so look it up on the official site."),
    quelle: FUENTE_POLICIA,
    url: URL_POLICIA,
  },
  solicitud: {
    tag: 3,
    art: "echt",
    memo: q("El **NIE** es un **número**: impreso EX-15. La **TIE** es una **tarjeta**: impreso EX-17. La casilla debe coincidir con lo que pide la persona.", "The NIE is a number: form EX-15. The TIE is a card: form EX-17. The box must match what the person is asking for."),
    wirklich: q("El NIE es tu número de identidad de extranjero. La TIE es la tarjeta física que suelen necesitar quienes tienen autorización para más de seis meses. Son dos impresos separados: aquí van juntos solo para simplificar el juego.", "The NIE is your foreigner’s identity number. The TIE is the physical card, usually needed by people authorised to stay for more than six months. They are two separate forms; the game puts them on one sheet to keep things simple."),
    quelle: FUENTE_EXT,
    url: URL_EXT,
  },
  schreibweise: {
    tag: 4,
    art: "lindenau",
    memo: q("No confundas **nombre** y **apellidos**. Cuenta **cada letra**. Las mayúsculas del pasaporte pueden ir sin tilde: GARCIA y García valen.", "Don’t mix up first name and surnames. Every letter counts. Capitals in a passport may have no accent: GARCIA and García are both fine."),
    wirklich: null,
  },
  foto: {
    tag: 4,
    art: "echt",
    memo: q("Para la TIE hace falta una **foto** reciente con **fondo blanco**.", "For the TIE you need a recent photo with a white background."),
    wirklich: q("Para la TIE suelen pedir una foto reciente en color, tamaño carné y con fondo blanco. Normalmente también toman las huellas. Consulta cuántas fotos y qué papeles pide tu oficina.", "For the TIE you are usually asked for a recent colour photo, passport size, on a white background, and your fingerprints are usually taken too. Check how many photos and which papers your office asks for."),
    quelle: FUENTE_POLICIA,
    url: URL_POLICIA,
  },
  original: {
    tag: 4,
    art: "echt",
    memo: q("El pasaporte debe ser el **original**. Un **fax** no vale.", "The passport must be the original. A fax doesn’t count."),
    wirklich: q("Las oficinas suelen querer ver el pasaporte original, y muchas piden también una copia. Lleva los dos.", "Offices usually want to see your original passport, and many ask for a copy as well. Bring both."),
    quelle: FUENTE_EXT,
    url: URL_EXT,
  },
  kuli: {
    tag: 4,
    art: "lindenau",
    memo: q("Hoy, solo **bolígrafo negro**.", "Today, black pen only."),
    wirklich: null,
  },
  derivar: {
    tag: 5,
    art: "echt",
    memo: q("**Arraigo** y **regularización**: aquí no se decide. Informa a la persona y mándala a la **información oficial**.", "Arraigo and regularisation aren’t decided at this window. Inform the person and send them to the official information."),
    wirklich: q("El arraigo es una autorización de residencia para personas que ya viven en España, con varias modalidades; muchas piden unos dos años aquí y otros requisitos. La regularización extraordinaria de 2026 aceptó solicitudes hasta el 30 de junio de 2026. Antes de actuar, consulta la información oficial, una entidad de ayuda o un abogado de extranjería.", "Arraigo is a residence authorisation for people already living in Spain. It has several types, and many ask for about two years here plus other conditions. The 2026 extraordinary regularisation (Royal Decree 316/2026) took applications from 16 April to 30 June 2026; as of November 2026 we know of no new window. Each case is different, so before you act, check the official information, an advice organisation or an immigration lawyer."),
    quelle: "Official source type: La Moncloa, questions and answers on the 2026 regularisation; the Spanish government’s immigration pages",
    url: "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/Documents/2026/160426-preguntas-frecuentes-regularizacion-extraordinaria.pdf",
  },
};

/** The rules on the memo on a given day. */
export const regelnBis = (tag) => TAGE[tag]?.regeln ?? [];
export const neueRegeln = (tag) => regelnBis(tag).filter((id) => REGELN[id].tag === tag);

// Questions that fit some mistake; mixed into each list as the two wrong ones.
const F = {
  name: q("¿Puede comprobar su nombre, por favor?", "Could you check your name, please?"),
  datum: q("¿Puede comprobar su fecha de nacimiento, por favor?", "Could you check your date of birth, please?"),
  pass: q("¿Tiene otro documento en vigor?", "Do you have another valid document?"),
  wgb: q("¿Me enseña el contrato de alquiler, por favor?", "Could you show me the rental contract, please?"),
  adresse: q("¿Esta dirección es correcta? El número no coincide.", "Is this address right? The number doesn’t match."),
  wohin: q("¿Viene de otro municipio o se ha mudado dentro de Villabruno?", "Have you come from another municipality or moved inside Villabruno?"),
  unterschreiben: q("¿Puede firmar aquí, por favor?", "Could you sign here, please?"),
  familienname: q("¿Cuál es su nombre y cuáles son sus apellidos?", "Which is your first name and which are your surnames?"),
  kuli: q("¿Puede firmar otra vez con bolígrafo negro?", "Could you sign again in black pen?"),
  original: q("¿Tiene el pasaporte original?", "Do you have the original passport?"),
  zimmer: q("¿Viene por un carné de biblioteca?", "Are you here for a library card?"),
  cita: q("¿Puede mirar la fecha de su cita?", "Could you look at the date of your appointment?"),
  tasa: q("¿Tiene el justificante de la tasa?", "Do you have the fee receipt?"),
  tasaName: q("¿A nombre de quién está pagada la tasa?", "In whose name was the fee paid?"),
  foto: q("¿Tiene otra foto con fondo blanco?", "Do you have another photo with a white background?"),
  tramite: q("¿Viene a pedir el NIE o la TIE?", "Have you come for the NIE or the TIE?"),
  sabe: q("¿Ha mirado la información oficial sobre su caso?", "Have you looked at the official information about your case?"),
};

const VUELVO = q("Mmm, no estoy seguro de cómo arreglarlo. Vuelvo otro día.", "Hmm, I’m not sure how to fix it. I’ll come back another day.");

export const FEHLER = {
  familienname: {
    regel: "name",
    notiz: q("Los apellidos no coinciden", "The surnames don’t match"),
    fragen: [F.name, F.wgb, F.unterschreiben], passt: 0,
    loest: q("¡Ay, una errata! Lo corrijo ahora mismo.", "Oh, a typo! I’ll correct it right now."),
    nicht: VUELVO,
  },
  vorname: {
    regel: "name",
    notiz: q("El nombre no coincide", "The first name doesn’t match"),
    fragen: [F.pass, F.name, F.unterschreiben], passt: 1,
    loest: q("¡Es verdad! Falta una letra. Ya lo corrijo.", "You’re right! A letter is missing. I’ll correct it."),
    nicht: VUELVO,
  },
  geburtsdatum: {
    regel: "name",
    notiz: q("La fecha de nacimiento no coincide", "The date of birth doesn’t match"),
    fragen: [F.adresse, F.wohin, F.datum], passt: 2,
    loest: q("¡Vaya, me he equivocado de número! Espere, que lo escribo bien.", "Oh, I got a number wrong! Just a moment, I’ll write it properly."),
    nicht: VUELVO,
  },
  abgelaufen: {
    regel: "gueltig",
    notiz: q("El documento está caducado", "The document has expired"),
    fragen: [F.pass, F.unterschreiben, F.name], passt: 0,
    loest: q("Sí, aquí tengo el pasaporte nuevo. Este está en vigor.", "Yes, I have my new passport here. This one is valid."),
    nicht: q("No, no tengo otro. Lo renuevo y vuelvo.", "No, I don’t have another one. I’ll renew it and come back."),
  },
  wgb_fehlt: {
    regel: "wgb",
    notiz: q("Falta el papel de la dirección", "The paper for the address is missing"),
    fragen: [F.name, F.wgb, F.pass], passt: 1,
    loest: q("¡Ah, sí, lo tengo en la mochila! Aquí tiene.", "Oh yes, it’s in my rucksack! Here you are."),
    nicht: q("Vivo con un amigo y no tengo contrato. Vuelvo con una autorización suya.", "I live with a friend and have no contract. I’ll come back with written consent from them."),
  },
  wgb_adresse: {
    regel: "wgb",
    notiz: q("La dirección no coincide con el contrato", "The address doesn’t match the contract"),
    fragen: [F.adresse, F.datum, F.zimmer], passt: 0,
    loest: q("Tiene razón, he cambiado los números. Lo corrijo.", "You’re right, I swapped the numbers. I’ll correct it."),
    nicht: q("El contrato está mal: el casero se ha equivocado. Vuelvo con uno corregido.", "The contract is wrong: the landlord made a mistake. I’ll come back with a corrected one."),
  },
  formular: {
    regel: "formular",
    notiz: q("La casilla marcada no es la correcta", "The wrong box is ticked"),
    fragen: [F.wgb, F.unterschreiben, F.wohin], passt: 2,
    loest: q("Me he mudado dentro de Villabruno. Entonces marco la otra casilla. Ya está.", "I’ve moved inside Villabruno. So I’ll tick the other box. There you go."),
    nicht: VUELVO,
  },
  unterschrift: {
    regel: "unterschrift",
    notiz: q("Falta la firma", "The signature is missing"),
    fragen: [F.datum, F.unterschreiben, F.adresse], passt: 1,
    loest: q("¡Huy, se me ha olvidado! Ya está.", "Oops, I forgot! There you go."),
    nicht: q("Se me ha acabado el bolígrafo … Ahora vuelvo.", "My pen has run out … I’ll be right back."),
  },
  zimmer: {
    regel: "meldesachen",
    notiz: q("Ventanilla equivocada: la biblioteca está en la sala 12", "Wrong window: the library is in room 12"),
    fragen: [F.zimmer, F.wgb, F.name], passt: 0,
    loest: null,
    nicht: q("¡Guau! ¡Sí, por favor! … ¿Sala 12? ¡Guau, gracias!", "Woof! Yes, please! … Room 12? Woof, thank you!"),
  },
  frist: {
    regel: "frist",
    notiz: q("La cita no es para hoy", "The appointment isn’t for today"),
    fragen: [F.cita, F.kuli, F.name], passt: 0,
    loest: null,
    nicht: q("¡Es verdad, no es hoy! Vuelvo el día de mi cita.", "You’re right, it isn’t today! I’ll come back on the day of my appointment."),
  },
  tasa_fehlt: {
    regel: "tasa",
    notiz: q("Falta el justificante de la tasa", "The fee receipt is missing"),
    fragen: [F.original, F.tasa, F.name], passt: 1,
    loest: q("¡Ah, sí! Lo pagué ayer en el banco. Aquí lo tiene.", "Oh yes! I paid it at the bank yesterday. Here it is."),
    nicht: q("Todavía no la he pagado. Voy al banco y pido otra cita si hace falta.", "I haven’t paid it yet. I’ll go to the bank and book another appointment if I need to."),
  },
  tasa_name: {
    regel: "tasa",
    notiz: q("La tasa está a nombre de otra persona", "The fee is in someone else’s name"),
    fragen: [F.foto, F.cita, F.tasaName], passt: 2,
    loest: null,
    nicht: q("Mi hermano rellenó el impreso con su nombre. Pago otra tasa con el mío y vuelvo.", "My brother filled in the form with his name. I’ll pay another fee in mine and come back."),
  },
  solicitud: {
    regel: "solicitud",
    notiz: q("La casilla no coincide con lo que pide", "The box doesn’t match what the person is asking for"),
    fragen: [F.tramite, F.datum, F.foto], passt: 0,
    loest: q("¡Ah, me he confundido de casilla! Ya la cambio.", "Oh, I ticked the wrong box! I’ll change it now."),
    nicht: VUELVO,
  },
  foto_fondo: {
    regel: "foto",
    notiz: q("La foto no tiene fondo blanco", "The photo doesn’t have a white background"),
    fragen: [F.foto, F.kuli, F.tasa], passt: 0,
    loest: q("Sí, me hice varias. Tenga, esta tiene el fondo blanco.", "Yes, I had several taken. Here, this one has a white background."),
    nicht: q("No tengo otra. Me hago una en el fotomatón y vuelvo.", "I don’t have another one. I’ll get one in the photo booth and come back."),
  },
  vertauscht: {
    regel: "schreibweise",
    notiz: q("Nombre y apellidos están cambiados", "First name and surname are swapped"),
    fragen: [F.familienname, F.pass, F.cita], passt: 0,
    loest: q("¡Ah! Mi apellido va en la otra línea. Ya lo corrijo.", "Oh! My surname goes on the other line. I’ll correct it."),
    nicht: VUELVO,
  },
  // code kept from the German umlaut mistake; in Spanish it is any spelling slip
  umlaut: {
    regel: "schreibweise",
    notiz: q("El apellido está mal escrito", "The surname is spelt wrong"),
    fragen: [F.tramite, F.name, F.kuli], passt: 1,
    loest: q("Tiene razón, falta una erre. Ahora está bien.", "You’re right, there’s an r missing. Now it’s right."),
    nicht: VUELVO,
  },
  kuli: {
    regel: "kuli",
    notiz: q("La firma no está en bolígrafo negro", "The signature isn’t in black pen"),
    fragen: [F.kuli, F.original, F.datum], passt: 0,
    loest: q("¿Negro? Vale. Ya está, ahora es negra.", "Black? OK. There, now it’s black."),
    nicht: q("Solo tengo uno rojo … Salgo a comprar uno negro.", "I’ve only got a red one … I’ll pop out and buy a black one."),
  },
  fax: {
    regel: "original",
    notiz: q("El pasaporte es un fax, no el original", "The passport is a fax, not the original"),
    fragen: [F.unterschreiben, F.original, F.tramite], passt: 1,
    loest: q("¿Quiere el original? Aquí lo tiene.", "You want the original? Here it is."),
    nicht: q("El original está en casa. ¡Pero el fax es nuevecito!", "The original’s at home. But the fax is brand new!"),
  },
  derivar_arraigo: {
    regel: "derivar",
    notiz: q("El arraigo no se decide en esta ventanilla", "Arraigo isn’t decided at this window"),
    fragen: [F.foto, F.sabe, F.cita], passt: 1,
    loest: null,
    nicht: q("Todavía no. Entonces lo miro en la web oficial y pregunto en una entidad de ayuda. Gracias.", "Not yet. Then I’ll look at the official website and ask at an advice organisation. Thank you."),
  },
  derivar_regularizacion: {
    regel: "derivar",
    notiz: q("La regularización no se decide en esta ventanilla", "Regularisation isn’t decided at this window"),
    fragen: [F.sabe, F.kuli, F.tasa], passt: 0,
    loest: null,
    nicht: q("No, solo lo he oído en la radio. ¿Ya terminó el plazo? Lo miro en la web oficial y pido consejo.", "No, I only heard about it on the radio. Has the deadline passed? I’ll look at the official website and get advice."),
  },
};

// What a customer says to a question that doesn't fit their case.
export const WIRR = [
  q("¿Perdón? No le entiendo.", "Sorry? I don’t understand."),
  q("Eh … ¿por qué me pregunta eso?", "Erm … why are you asking me that?"),
  q("Pero si está todo ahí, ¿no?", "But it’s all there, isn’t it?"),
  q("¿Cómo? Creo que ese no es el problema.", "What? I don’t think that’s the problem."),
];
