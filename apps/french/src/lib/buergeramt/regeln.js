// Bruno at the desk (Préfecture sim): the rules of the counter and the mistakes papers can have.
//
// Bruno helps at guichet 3 in the invented town of Montbruno: two days at the mairie (an
// inscription file for school and the town's services), then the ANEF help point (a residence
// request online), the CAF / sécurité sociale desk, and a day of questions that this desk never
// decides. The player checks that the PAPERWORK IS COMPLETE, nothing else: no stamp in this game
// decides anybody's right to stay, to a benefit or to a card.
//
// TAGE: the five days, each with the rules on Regi's memo that day (`regeln`) and today's date.
// (`ort` keeps the ids padron / extranjeria from the earlier game: padron = the mairie days,
// extranjeria = the days at the other desks.)
//
// REGELN: one entry per rule. `tag` is the first day it appears (it is highlighted as new then).
// `art` says whether it is how it usually works in France ("echt", with a source type) or an openly
// made-up Montbruno rule ("lindenau"; the key value is kept so the code keeps working). `memo` is
// the line on the memo, the key word in **bold**; `wirklich` is the "How it usually works" text,
// general orientation and never legal advice. Facts were last checked in November 2026, and the
// ones still open are listed under "to verify" in the run report.
//
// FEHLER: every mistake a case can carry. `regel` is the rule that makes it a mistake, `notiz` is
// what the notes say once the player has found it, `fragen` are the three questions offered,
// `passt` the one that fits; `loest` is the customer's answer when the right question fixes the
// case, `nicht` when it can't be fixed today. Nothing a customer says may sound like a decision
// about their status: a missing paper means "come back with it".
//
// Key `de` holds the French being learnt (A2–B1, standard French of France, vous at the counter;
// the key name is kept from the German original); `en` is the English meaning.

const q = (de, en) => ({ de, en });

const FUENTE_GEN = "Official source type: service-public.gouv.fr (the French administration’s information site)";
const URL_GEN = "https://www.service-public.gouv.fr/";
const FUENTE_ANEF = "Official source type: the ANEF site of the Ministry of the Interior, and your préfecture";
const URL_ANEF = "https://administration-etrangers-en-france.interieur.gouv.fr/";
const FUENTE_TIMBRE = "Official source type: the online tax-stamp service (timbres.impots.gouv.fr) and service-public.gouv.fr";
const URL_TIMBRE = "https://timbres.impots.gouv.fr/";
const FUENTE_CAF = "Official source type: caf.fr and ameli.fr (your CAF and your health-insurance office)";
const URL_CAF = "https://www.caf.fr/";

export const TAGE = {
  1: { heute: "2027-03-15", ort: "padron", titel: "Jour 1 · Mairie", regeln: ["name", "wgb", "sanstitre"] },
  2: { heute: "2027-03-16", ort: "padron", titel: "Jour 2 · Mairie (école)", regeln: ["name", "gueltig", "formular", "unterschrift", "recent", "meldesachen"] },
  3: { heute: "2027-03-17", ort: "extranjeria", titel: "Jour 3 · ANEF", regeln: ["name", "recent", "tasa", "solicitud", "foto"] },
  4: { heute: "2027-03-18", ort: "extranjeria", titel: "Jour 4 · CAF et sécu", regeln: ["name", "schreibweise", "recep", "rib", "original", "kuli"] },
  5: { heute: "2027-03-19", ort: "extranjeria", titel: "Jour 5 · Questions", regeln: ["name", "recep", "rib", "tasa", "derivar"] },
};
export const LETZTER_TAG = 5;

export const REGELN = {
  name: {
    tag: 1,
    art: "echt",
    memo: q("Le **nom** et la **date de naissance** doivent être les mêmes sur tous les papiers et sur la **pièce d’identité**.", "Name and date of birth must be the same on every paper and on the ID."),
    wirklich: q("Les administrations vérifient vos informations avec une pièce d’identité : carte nationale d’identité, passeport, titre de séjour. Une faute d’une seule lettre peut bloquer un dossier.", "Administrations check your details against an identity document: an ID card, a passport, a residence card. A one-letter slip can hold up a file."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  wgb: {
    tag: 1,
    art: "echt",
    memo: q("Pour l’**adresse**, demandez un **justificatif de domicile** ou, si la personne est hébergée, une **attestation d’hébergement**. L’**adresse** doit être la même.", "For the address, ask for proof of address or, if the person is being put up, a host’s statement. The address must match."),
    wirklich: q("Pour prouver une adresse, on demande en général un justificatif de domicile récent : facture d’énergie, d’eau ou d’internet, quittance de loyer, avis d’imposition. Une personne hébergée apporte souvent une attestation de la personne qui l’héberge, avec une copie de sa pièce d’identité et un justificatif de domicile à son nom. Chaque organisme dit ce qu’il accepte.", "To prove an address you are usually asked for a recent proof of address: an energy, water or internet bill, a rent receipt, a tax notice. A person who is being put up often brings a statement from the person hosting them, with a copy of the host’s ID and a proof of address in the host’s name. Each organisation says what it accepts."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  sanstitre: {
    tag: 1,
    art: "echt",
    memo: q("Pour ce dossier, **pas besoin de titre de séjour**.", "You don’t need a residence permit for this file."),
    wirklich: q("Pour inscrire un enfant à l’école, la mairie ne demande en principe pas de titre de séjour aux parents : l’instruction est obligatoire dès l’âge de trois ans, quelle que soit la nationalité. Un dossier de mairie dit où l’on habite, pas quel est son statut. Si on vous demande un document de séjour pour l’école, renseignez-vous auprès du service de l’éducation de votre commune ou d’une association.", "To enrol a child in school, the mairie does not in principle ask the parents for a residence permit: schooling is compulsory from age three, whatever the nationality. A town file says where you live, not what your status is. If you are asked for a residence document for school, ask the education service of your commune or an advice organisation."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  gueltig: {
    tag: 2,
    art: "echt",
    memo: q("La pièce d’identité doit être **en cours de validité**. Regardez la date de **validité** et le calendrier.", "The ID must be valid. Check the expiry date and the calendar."),
    wirklich: q("En général, on demande une pièce d’identité ou un passeport en cours de validité. Certains services acceptent un document expiré depuis peu, d’autres non : demandez au service concerné avant de venir.", "You are generally asked for an ID or passport that is still valid. Some offices accept a document that expired recently, others don’t: ask the office before you go."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  formular: {
    tag: 2,
    art: "echt",
    memo: q("Cochez la bonne **case** : nouvel habitant → **Première inscription**. Déménagement dans Montbruno → **Changement d’adresse**.", "Tick the right box: new in Montbruno → Première inscription (first registration). Moving inside Montbruno → Changement d’adresse (change of address)."),
    wirklich: q("Les formulaires changent d’une mairie à l’autre. Si vous déménagez dans la même commune, vous signalez en général un changement d’adresse ; si vous arrivez d’une autre commune, c’est une première inscription.", "Forms differ from one mairie to another. If you move within the same commune, you usually report a change of address; if you arrive from another commune, it is a first registration."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  unterschrift: {
    tag: 2,
    art: "echt",
    memo: q("Pas de **signature**, pas de tampon.", "No signature, no stamp."),
    wirklich: q("Un formulaire papier se signe. En ligne, on s’identifie autrement, par exemple avec FranceConnect ou avec un compte personnel sur le site de l’organisme.", "A paper form is signed. Online you identify yourself another way, for example with FranceConnect or a personal account on the organisation’s site."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  recent: {
    tag: 2,
    art: "echt",
    memo: q("Le **justificatif de domicile** doit dater de **moins de 3 mois**. Regardez la date et le calendrier.", "The proof of address must be less than 3 months old. Check the date and the calendar."),
    wirklich: q("Beaucoup d’administrations demandent un justificatif de domicile de moins de trois mois : facture d’énergie, d’eau ou d’internet, quittance de loyer. La durée peut changer d’un service à l’autre : lisez la liste de pièces de votre démarche.", "Many administrations ask for a proof of address less than three months old: an energy, water or internet bill, a rent receipt. The period can differ from one office to another: read the list of papers for your procedure."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  meldesachen: {
    tag: 2,
    art: "lindenau",
    memo: q("Le guichet 3 ne traite que les **inscriptions**. La **bibliothèque** est en salle 12.", "Desk 3 only deals with registrations. The library is in room 12."),
    wirklich: null,
  },
  solicitud: {
    tag: 3,
    art: "echt",
    memo: q("Le **récapitulatif** doit montrer la **bonne démarche** : titre de séjour, renouvellement, CAF ou carte Vitale. La case doit correspondre à ce que la personne demande.", "The summary must show the right procedure: residence permit, renewal, CAF or carte Vitale. The box must match what the person is asking for."),
    wirklich: q("Une demande de titre de séjour se fait de plus en plus en ligne, sur le site de l’ANEF, avec un compte personnel ; selon le cas, il faut encore passer par la préfecture. La CAF et l’Assurance maladie sont d’autres organismes, avec leurs propres démarches : le jeu les met sur une même feuille pour simplifier.", "A residence-permit request is increasingly made online, on the ANEF site, with a personal account; depending on the case you may still have to go through the préfecture. The CAF and the health insurance are other bodies with their own procedures: the game puts them on one sheet to keep things simple."),
    quelle: FUENTE_ANEF,
    url: URL_ANEF,
  },
  tasa: {
    tag: 3,
    art: "echt",
    memo: q("Il faut le **timbre fiscal** électronique de la démarche.", "You need the electronic tax stamp for the procedure."),
    wirklich: q("Pour beaucoup de titres de séjour, on paie une taxe avec un timbre fiscal électronique, acheté en ligne ou chez un buraliste agréé. Les montants et les titres concernés changent : regardez toujours la page officielle de votre démarche.", "For many residence permits you pay a fee with an electronic tax stamp, bought online or at an authorised tobacconist. The amounts and the permits concerned change: always look at the official page for your procedure."),
    quelle: FUENTE_TIMBRE,
    url: URL_TIMBRE,
  },
  foto: {
    tag: 3,
    art: "echt",
    memo: q("Il faut une **photo d’identité** récente sur **fond uni clair**.", "You need a recent ID photo on a plain light background."),
    wirklich: q("Les photos d’identité suivent une norme : fond uni clair, visage dégagé, photo récente. Pour une demande en ligne, la photo est souvent prise dans un photomaton agréé, qui donne un code à saisir sur le site. Regardez les consignes de votre démarche.", "ID photos follow a standard: plain light background, face clear, recent photo. For an online request the photo is often taken in an approved photo booth, which gives a code to type into the site. Read the instructions for your procedure."),
    quelle: FUENTE_ANEF,
    url: URL_ANEF,
  },
  schreibweise: {
    tag: 4,
    art: "lindenau",
    memo: q("Ne confondez pas **nom** et **prénom**. Comptez **chaque lettre**. Les majuscules d’un passeport peuvent perdre leurs accents : LEFEVRE et Lefèvre, c’est pareil.", "Don’t mix up surname and first name. Every letter counts. Capitals in a passport may lose their accents: LEFEVRE and Lefèvre are the same."),
    wirklich: null,
  },
  recep: {
    tag: 4,
    art: "echt",
    memo: q("Le **récépissé** doit être **en cours de validité**. Regardez la date de validité et le calendrier.", "The récépissé (receipt for a residence request) must still be valid. Check its expiry date and the calendar."),
    wirklich: q("Pendant l’examen d’une demande de titre de séjour, la préfecture peut donner un récépissé ou une attestation, valable quelques mois et renouvelable. Ce qu’il permet (travail, aides, droits) dépend de sa mention : lisez-la bien et demandez à l’organisme concerné.", "While a residence request is being examined, the préfecture may issue a récépissé or an attestation, valid for a few months and renewable. What it allows (work, benefits, rights) depends on what it says: read it carefully and ask the organisation concerned."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  rib: {
    tag: 4,
    art: "echt",
    memo: q("Il faut un **RIB** au **nom** de la personne qui fait la demande.", "You need a bank details slip (RIB) in the name of the person making the request."),
    wirklich: q("La CAF et l’Assurance maladie versent en général l’argent sur un compte bancaire ouvert au nom du bénéficiaire. Un RIB au nom d’une autre personne pose souvent problème : demandez à l’organisme ce qu’il accepte.", "The CAF and the health insurance usually pay into a bank account held in the beneficiary’s name. A RIB in someone else’s name often causes trouble: ask the organisation what it accepts."),
    quelle: FUENTE_CAF,
    url: URL_CAF,
  },
  original: {
    tag: 4,
    art: "echt",
    memo: q("Le passeport doit être l’**original**. Une **photocopie** ne suffit pas.", "The passport must be the original. A photocopy isn’t enough."),
    wirklich: q("À un guichet, on demande en général à voir l’original de la pièce d’identité. Pour une démarche en ligne, on envoie plutôt des copies numérisées. Regardez ce que demande votre organisme.", "At a desk you are usually asked to show the original ID. For an online procedure you send scanned copies instead. Check what your organisation asks for."),
    quelle: FUENTE_GEN,
    url: URL_GEN,
  },
  kuli: {
    tag: 4,
    art: "lindenau",
    memo: q("Aujourd’hui, **stylo noir** uniquement.", "Today, black pen only."),
    wirklich: null,
  },
  derivar: {
    tag: 5,
    art: "echt",
    memo: q("**Refus**, **OQTF**, **asile**, **naturalisation** : on ne décide pas à ce guichet. Informez la personne et orientez-la vers l’**information officielle** ou l’**aide juridique**.", "Refusal, OQTF (an order to leave the country), asylum, naturalisation: none of these is decided at this desk. Inform the person and point them to the official information or legal aid."),
    wirklich: q("Un refus de titre de séjour, une obligation de quitter le territoire français (OQTF), une demande d’asile ou une demande de naturalisation sont des procédures juridiques, avec des règles précises et parfois des délais très courts. Un guichet d’accueil ne les décide pas et ne donne pas de conseil juridique. Si vous avez reçu une décision écrite, lisez bien les délais indiqués et contactez vite la préfecture, une association d’aide aux étrangers ou un avocat.", "A refusal of a residence permit, an obligation to leave French territory (OQTF), an asylum request or a naturalisation request are legal procedures with precise rules and sometimes very short deadlines. A reception desk does not decide them and gives no legal advice. If you have received a written decision, read the deadlines it states carefully and contact the préfecture, an organisation that helps foreign nationals, or a lawyer quickly."),
    quelle: "Official source type: service-public.gouv.fr, the préfecture, and legal-aid information for foreign nationals",
    url: URL_GEN,
  },
};

/** The rules on the memo on a given day. */
export const regelnBis = (tag) => TAGE[tag]?.regeln ?? [];
export const neueRegeln = (tag) => regelnBis(tag).filter((id) => REGELN[id].tag === tag);

// Questions that fit some mistake; mixed into each list as the two wrong ones.
const F = {
  name: q("Pouvez-vous vérifier votre nom, s’il vous plaît ?", "Could you check your name, please?"),
  datum: q("Pouvez-vous vérifier votre date de naissance, s’il vous plaît ?", "Could you check your date of birth, please?"),
  pass: q("Avez-vous une autre pièce d’identité en cours de validité ?", "Do you have another valid ID?"),
  wgb: q("Avez-vous un justificatif de domicile ou une attestation d’hébergement ?", "Do you have a proof of address or a host’s statement?"),
  adresse: q("Cette adresse est-elle correcte ? Elle ne correspond pas.", "Is this address right? It doesn’t match."),
  jung: q("Avez-vous un justificatif plus récent ?", "Do you have a more recent proof?"),
  wohin: q("Venez-vous d’une autre commune ou avez-vous déménagé dans Montbruno ?", "Have you come from another commune or moved inside Montbruno?"),
  unterschreiben: q("Pouvez-vous signer ici, s’il vous plaît ?", "Could you sign here, please?"),
  familienname: q("Quel est votre nom de famille et quel est votre prénom ?", "What is your surname and what is your first name?"),
  kuli: q("Pouvez-vous signer à nouveau au stylo noir ?", "Could you sign again in black pen?"),
  original: q("Avez-vous l’original de votre passeport ?", "Do you have your original passport?"),
  zimmer: q("Venez-vous pour une carte de bibliothèque ?", "Are you here for a library card?"),
  recep: q("Pouvez-vous regarder la date de validité de votre récépissé ?", "Could you look at the expiry date of your récépissé?"),
  timbre: q("Avez-vous le timbre fiscal ?", "Do you have the tax stamp?"),
  rib: q("Avez-vous un RIB ?", "Do you have a RIB?"),
  ribName: q("À quel nom est le compte bancaire ?", "In whose name is the bank account?"),
  foto: q("Avez-vous une autre photo sur fond clair ?", "Do you have another photo on a light background?"),
  tramite: q("Venez-vous pour le titre de séjour, la CAF ou la carte Vitale ?", "Have you come for the residence permit, the CAF or the carte Vitale?"),
  sabe: q("Avez-vous regardé l’information officielle sur votre situation ?", "Have you looked at the official information about your situation?"),
  decision: q("Avez-vous reçu une décision par écrit ?", "Have you received a decision in writing?"),
};

const VUELVO = q("Hmm, je ne sais pas comment l’arranger. Je reviens un autre jour.", "Hmm, I’m not sure how to fix it. I’ll come back another day.");

export const FEHLER = {
  familienname: {
    regel: "name",
    notiz: q("Les noms ne correspondent pas", "The surnames don’t match"),
    fragen: [F.name, F.wgb, F.unterschreiben], passt: 0,
    loest: q("Ah, une faute de frappe ! Je corrige tout de suite.", "Oh, a typo! I’ll correct it right now."),
    nicht: VUELVO,
  },
  vorname: {
    regel: "name",
    notiz: q("Le prénom ne correspond pas", "The first name doesn’t match"),
    fragen: [F.pass, F.name, F.unterschreiben], passt: 1,
    loest: q("C’est vrai ! Il manque une lettre. Je corrige.", "You’re right! A letter is missing. I’ll correct it."),
    nicht: VUELVO,
  },
  geburtsdatum: {
    regel: "name",
    notiz: q("La date de naissance ne correspond pas", "The date of birth doesn’t match"),
    fragen: [F.adresse, F.wohin, F.datum], passt: 2,
    loest: q("Oh là là, je me suis trompé de chiffre ! Attendez, je l’écris correctement.", "Oh dear, I got a number wrong! Just a moment, I’ll write it properly."),
    nicht: VUELVO,
  },
  abgelaufen: {
    regel: "gueltig",
    notiz: q("La pièce d’identité est périmée", "The ID has expired"),
    fragen: [F.pass, F.unterschreiben, F.name], passt: 0,
    loest: q("Oui, j’ai mon nouveau passeport ici. Celui-ci est valable.", "Yes, I have my new passport here. This one is valid."),
    nicht: q("Non, je n’en ai pas d’autre. Je le fais renouveler et je reviens.", "No, I don’t have another one. I’ll have it renewed and come back."),
  },
  wgb_fehlt: {
    regel: "wgb",
    notiz: q("Il manque le papier pour l’adresse", "The paper for the address is missing"),
    fragen: [F.name, F.wgb, F.pass], passt: 1,
    loest: q("Ah oui, il est dans mon sac à dos ! Voilà.", "Oh yes, it’s in my rucksack! Here you are."),
    nicht: q("Je vis chez une amie et je n’ai rien à mon nom. Je reviens avec son attestation d’hébergement, sa pièce d’identité et un justificatif à son nom.", "I live with a friend and have nothing in my own name. I’ll come back with her host’s statement, her ID and a proof of address in her name."),
  },
  wgb_adresse: {
    regel: "wgb",
    notiz: q("L’adresse ne correspond pas à l’attestation", "The address doesn’t match the host’s statement"),
    fragen: [F.adresse, F.datum, F.zimmer], passt: 0,
    loest: q("Vous avez raison, j’ai inversé les chiffres. Je corrige.", "You’re right, I swapped the numbers. I’ll correct it."),
    nicht: q("L’attestation est fausse : ma tante s’est trompée de numéro. Je reviens avec une attestation corrigée.", "The statement is wrong: my aunt got the number wrong. I’ll come back with a corrected one."),
  },
  justif_alt: {
    regel: "recent",
    notiz: q("Le justificatif de domicile date de plus de 3 mois", "The proof of address is more than 3 months old"),
    fragen: [F.name, F.jung, F.unterschreiben], passt: 1,
    loest: q("Ah, j’ai la facture de février dans mon sac ! La voilà.", "Oh, I have the February bill in my bag! Here it is."),
    nicht: q("C’est la seule que j’ai sur moi. Je télécharge la dernière facture et je reviens.", "It’s the only one I have on me. I’ll download the latest bill and come back."),
  },
  formular: {
    regel: "formular",
    notiz: q("La mauvaise case est cochée", "The wrong box is ticked"),
    fragen: [F.wgb, F.unterschreiben, F.wohin], passt: 2,
    loest: q("J’ai déménagé dans Montbruno. Alors je coche l’autre case. Voilà.", "I’ve moved inside Montbruno. So I’ll tick the other box. There you go."),
    nicht: VUELVO,
  },
  unterschrift: {
    regel: "unterschrift",
    notiz: q("La signature manque", "The signature is missing"),
    fragen: [F.datum, F.unterschreiben, F.adresse], passt: 1,
    loest: q("Oups, j’ai oublié ! Voilà.", "Oops, I forgot! There you go."),
    nicht: q("Mon stylo n’a plus d’encre… Je reviens tout de suite.", "My pen has run out… I’ll be right back."),
  },
  zimmer: {
    regel: "meldesachen",
    notiz: q("Mauvais guichet : la bibliothèque est en salle 12", "Wrong desk: the library is in room 12"),
    fragen: [F.zimmer, F.wgb, F.name], passt: 0,
    loest: null,
    nicht: q("Ouaf ! Oui, s’il vous plaît ! … Salle 12 ? Ouaf, merci !", "Woof! Yes, please! … Room 12? Woof, thank you!"),
  },
  recep_abgelaufen: {
    regel: "recep",
    notiz: q("Le récépissé n’est plus valable", "The récépissé is no longer valid"),
    fragen: [F.recep, F.kuli, F.name], passt: 0,
    loest: null,
    nicht: q("Ah, c’est vrai, il est périmé ! Je demande à la préfecture un nouveau récépissé et je reviens.", "Oh, you’re right, it has expired! I’ll ask the préfecture for a new récépissé and come back."),
  },
  tasa_fehlt: {
    regel: "tasa",
    notiz: q("Le timbre fiscal manque", "The tax stamp is missing"),
    fragen: [F.original, F.timbre, F.name], passt: 1,
    loest: q("Ah oui ! Je l’ai acheté hier en ligne. Le voici.", "Oh yes! I bought it online yesterday. Here it is."),
    nicht: q("Je ne l’ai pas encore acheté. Je vais le faire en ligne et je reviens.", "I haven’t bought it yet. I’ll do it online and come back."),
  },
  rib_fehlt: {
    regel: "rib",
    notiz: q("Le RIB manque", "The RIB is missing"),
    fragen: [F.foto, F.rib, F.recep], passt: 1,
    loest: q("Ah oui ! Pardon, je l’ai sur mon téléphone. Le voici.", "Yes! Sorry, I have it on my phone. Here it is."),
    nicht: VUELVO,
  },
  rib_name: {
    regel: "rib",
    notiz: q("Le RIB est au nom d’une autre personne", "The RIB is in someone else’s name"),
    fragen: [F.foto, F.recep, F.ribName], passt: 2,
    loest: null,
    nicht: q("C’est le compte de mon frère : je n’ai pas encore de compte. J’ouvre un compte à mon nom et je reviens avec mon RIB.", "It’s my brother’s account: I don’t have an account yet. I’ll open one in my own name and come back with my RIB."),
  },
  solicitud: {
    regel: "solicitud",
    notiz: q("La case ne correspond pas à ce que la personne demande", "The box doesn’t match what the person is asking for"),
    fragen: [F.tramite, F.datum, F.foto], passt: 0,
    loest: q("Ah, je me suis trompé de case ! Je la change tout de suite.", "Oh, I ticked the wrong box! I’ll change it now."),
    nicht: VUELVO,
  },
  foto_fondo: {
    regel: "foto",
    notiz: q("La photo n’est pas sur fond clair", "The photo isn’t on a light background"),
    fragen: [F.foto, F.kuli, F.timbre], passt: 0,
    loest: q("Oui, j’en ai fait plusieurs. Tenez, celle-ci est sur fond clair.", "Yes, I had several taken. Here, this one has a light background."),
    nicht: q("Je n’en ai pas d’autre. Je passe au photomaton et je reviens.", "I don’t have another one. I’ll go to the photo booth and come back."),
  },
  vertauscht: {
    regel: "schreibweise",
    notiz: q("Le nom et le prénom sont inversés", "The surname and first name are swapped"),
    fragen: [F.familienname, F.pass, F.recep], passt: 0,
    loest: q("Ah ! Mon nom de famille va sur l’autre ligne. Je corrige.", "Oh! My surname goes on the other line. I’ll correct it."),
    nicht: VUELVO,
  },
  kuli: {
    regel: "kuli",
    notiz: q("La signature n’est pas au stylo noir", "The signature isn’t in black pen"),
    fragen: [F.kuli, F.original, F.datum], passt: 0,
    loest: q("Noir ? D’accord. Voilà, maintenant elle est noire.", "Black? OK. There, now it’s black."),
    nicht: q("Je n’ai qu’un stylo rouge… Je vais en acheter un noir.", "I’ve only got a red pen… I’ll go and buy a black one."),
  },
  fax: {
    regel: "original",
    notiz: q("Le passeport est une photocopie, pas l’original", "The passport is a photocopy, not the original"),
    fragen: [F.unterschreiben, F.original, F.tramite], passt: 1,
    loest: q("Vous voulez l’original ? Le voici.", "You want the original? Here it is."),
    nicht: q("L’original est à la maison. Mais la photocopie est toute neuve !", "The original’s at home. But the photocopy is brand new!"),
  },
  derivar_arraigo: {
    regel: "derivar",
    notiz: q("Un refus de titre ne se traite pas à ce guichet", "A refusal of a permit isn’t dealt with at this desk"),
    fragen: [F.foto, F.decision, F.recep], passt: 1,
    loest: null,
    nicht: q("Oui, la lettre est dans mon sac. Alors je regarde l’information officielle et je demande conseil à une association. Merci.", "Yes, the letter is in my bag. Then I’ll look at the official information and ask an advice organisation. Thank you."),
  },
  derivar_regularizacion: {
    regel: "derivar",
    notiz: q("Une OQTF ne se traite pas à ce guichet", "An OQTF isn’t dealt with at this desk"),
    fragen: [F.sabe, F.kuli, F.timbre], passt: 0,
    loest: null,
    nicht: q("Pas encore. Les délais sont courts, n’est-ce pas ? Je lis la lettre en détail et je contacte une association ou un avocat aujourd’hui.", "Not yet. The deadlines are short, aren’t they? I’ll read the letter in detail and contact an association or a lawyer today."),
  },
  derivar_naturalisation: {
    regel: "derivar",
    notiz: q("Une demande de naturalisation ne se traite pas à ce guichet", "A naturalisation request isn’t dealt with at this desk"),
    fragen: [F.rib, F.sabe, F.foto], passt: 1,
    loest: null,
    nicht: q("Pas vraiment. Alors je regarde les conditions sur le site officiel et je pose mes questions à la préfecture. Merci.", "Not really. Then I’ll look at the conditions on the official site and ask my questions at the préfecture. Thank you."),
  },
};

// What a customer says to a question that doesn't fit their case.
export const WIRR = [
  q("Pardon ? Je ne comprends pas.", "Sorry? I don’t understand."),
  q("Euh… pourquoi me demandez-vous ça ?", "Erm… why are you asking me that?"),
  q("Mais tout est là, non ?", "But it’s all there, isn’t it?"),
  q("Comment ? Je crois que ce n’est pas le problème.", "What? I don’t think that’s the problem."),
];
