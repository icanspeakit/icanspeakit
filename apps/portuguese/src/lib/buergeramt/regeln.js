// Bruno at the desk (AIMA and Finanças sim): the rules of the counter and the mistakes papers can have.
//
// Bruno works window 3 in the invented town of Vilabruno, five days in five offices: the Junta de
// Freguesia (atestado de residência), the centro de saúde (número de utente), Finanças and
// Segurança Social (NIF, NISS), then two days at AIMA (autorização de residência, renewal, questions).
// The player checks that the PAPERWORK IS COMPLETE, nothing else: no stamp in this game decides
// anybody's right to stay.
//
// TAGE: the five days, each with the rules on Regi's memo that day (`regeln`) and today's date.
//
// REGELN: one entry per rule. `tag` is the first day it appears (it is highlighted as new then).
// `art` says whether it is how it usually works in Portugal ("echt", with a source type) or an
// openly made-up Vilabruno rule ("lindenau"; the key value is kept so the code keeps working).
// `memo` is the line on the memo, the key word in **bold**; `wirklich` is the "How it really works"
// text, general orientation and never legal advice. Facts were last checked in November 2026 and
// the ones still open are listed under "to verify" in the run report (aima-sim).
//
// FEHLER: every mistake a case can carry. `regel` is the rule that makes it a mistake, `notiz` is
// what the notes say once the player has found it, `fragen` are the three questions offered,
// `passt` the one that fits; `loest` is the customer's answer when the right question fixes the
// case, `nicht` when it can't be fixed today.
//
// Key `de` holds the European Portuguese being learnt (A2–B1, "o senhor/a senhora" and "pode…?"
// at the counter, variety pt-PT; the key name is kept from the German original); `en` is the
// English meaning. pt-BR note: in Brazil you would hear "o senhor" too, but "você" more widely,
// "boleto" for the payment slip and "CPF" instead of NIF; none of that is taught here.

const q = (de, en) => ({ de, en });

const FUENTE_PORTAL = "Official source type: ePortugal, the Portuguese government’s service portal";
const URL_PORTAL = "https://eportugal.gov.pt/";
const FUENTE_SNS = "Official source type: Serviço Nacional de Saúde (SNS), pages for users";
const URL_SNS = "https://www.sns.gov.pt/";
const FUENTE_AIMA = "Official source type: AIMA – Agência para a Integração, Migrações e Asilo";
const URL_AIMA = "https://aima.gov.pt/";
const FUENTE_FIN = "Official source type: Portal das Finanças (Autoridade Tributária e Aduaneira)";
const URL_FIN = "https://www.portaldasfinancas.gov.pt/";
const FUENTE_NAC = "Official source type: IRN – Instituto dos Registos e do Notariado, and AIMA";
const URL_NAC = "https://irn.justica.gov.pt/";

export const TAGE = {
  1: { heute: "2027-03-15", ort: "junta", titel: "Dia 1 · Junta de Freguesia", regeln: ["name", "wgb", "sinpermiso"] },
  2: { heute: "2027-03-16", ort: "saude", titel: "Dia 2 · Centro de saúde", regeln: ["name", "gueltig", "formular", "unterschrift", "meldesachen"] },
  3: { heute: "2027-03-17", ort: "financas", titel: "Dia 3 · Finanças e Segurança Social", regeln: ["name", "gueltig", "frist", "solicitud"] },
  4: { heute: "2027-03-18", ort: "aima", titel: "Dia 4 · AIMA", regeln: ["name", "tasa", "schreibweise", "foto", "original", "kuli"] },
  5: { heute: "2027-03-19", ort: "aima", titel: "Dia 5 · AIMA e dúvidas", regeln: ["name", "frist", "tasa", "derivar"] },
};
export const LETZTER_TAG = 5;

export const REGELN = {
  name: {
    tag: 1,
    art: "echt",
    memo: q("O **nome** e a **data de nascimento** têm de ser iguais em todos os papéis e no **documento de identificação**.", "Name and date of birth must be the same on every paper and on the ID."),
    wirklich: q("Na Junta, no centro de saúde, nas Finanças e na AIMA confirmam os seus dados com um documento de identificação: Cartão de Cidadão, passaporte ou título de residência.", "At the Junta, the health centre, Finanças and AIMA, your details are checked against an identity document: a Cartão de Cidadão, a passport or a residence permit card."),
    quelle: FUENTE_PORTAL,
    url: URL_PORTAL,
  },
  wgb: {
    tag: 1,
    art: "echt",
    memo: q("Para confirmar a morada, peça o **contrato de arrendamento** ou outro comprovativo parecido. A **morada** tem de coincidir.", "To check the address, ask for the rental contract or a similar paper. The address must match."),
    wirklich: q("A Junta de Freguesia pode pedir um contrato de arrendamento, uma escritura, uma fatura da água, da luz ou da internet em seu nome, ou uma declaração de quem lhe cede a casa. Algumas Juntas aceitam também duas testemunhas. Cada Junta explica o que aceita e quanto custa o atestado.", "A Junta de Freguesia may ask for a rental contract, property deeds, a water, electricity or internet bill in your name, or a statement from the person who lets you the home. Some Juntas also accept two witnesses. Each Junta explains what it accepts and what the certificate costs."),
    quelle: FUENTE_PORTAL,
    url: URL_PORTAL,
  },
  sinpermiso: {
    tag: 1,
    art: "echt",
    memo: q("Neste balcão, o atestado **não depende** de ter título de residência.", "At this window the certificate doesn’t depend on having a residence permit."),
    wirklich: q("O atestado de residência diz apenas onde mora: não é um título de residência e não regulariza a estadia. Muitas Juntas passam-no a estrangeiros com passaporte e comprovativo de morada, mas as regras variam de Junta para Junta: pergunte na sua.", "The atestado de residência only says where you live: it is not a residence permit and does not make a stay legal. Many Juntas issue it to foreign nationals with a passport and proof of address, but the rules differ from one Junta to another, so ask at yours."),
    quelle: FUENTE_PORTAL,
    url: URL_PORTAL,
  },
  gueltig: {
    tag: 2,
    art: "echt",
    memo: q("O documento tem de estar **válido**. Veja a data de **validade** e o calendário.", "The document must be valid. Check the expiry date and the calendar."),
    wirklich: q("Um documento caducado normalmente não serve como identificação. Se está a renovar, leve também o comprovativo do pedido, mas confirme antes com o serviço. Na AIMA, o passaporte tem de estar válido.", "An expired document normally doesn’t count as identification. If you are renewing, also bring proof of your application, but check with the office first. At AIMA, your passport has to be valid."),
    quelle: FUENTE_AIMA,
    url: URL_AIMA,
  },
  formular: {
    tag: 2,
    art: "echt",
    memo: q("Marque a **caixa** certa: utente novo → **Inscrição**. Mudou de casa em Vilabruno → **Alteração de morada**.", "Tick the right box: new patient → Inscrição (registration). Moved house in Vilabruno → Alteração de morada (change of address)."),
    wirklich: q("Quem não tem médico de família inscreve-se no centro de saúde da sua área e recebe o número de utente do SNS. Quem muda de casa altera a morada na inscrição, e, se muda de área, pode ter de pedir a transferência. Os impressos e o processo online mudam de unidade para unidade.", "If you have no family doctor, you register at the health centre for your area and get your SNS utente number. If you move house you update the address on your registration, and if you move to another area you may have to ask for a transfer. Forms and the online process differ from one health unit to another."),
    quelle: FUENTE_SNS,
    url: URL_SNS,
  },
  unterschrift: {
    tag: 2,
    art: "echt",
    memo: q("Sem **assinatura**, não há carimbo.", "No signature, no stamp."),
    wirklich: q("Os pedidos em papel levam a sua assinatura. Online assina-se de outra forma, por exemplo com a Chave Móvel Digital.", "Paper applications carry your signature. Online you sign another way, for example with the Chave Móvel Digital."),
    quelle: FUENTE_PORTAL,
    url: URL_PORTAL,
  },
  meldesachen: {
    tag: 2,
    art: "lindenau",
    memo: q("O balcão 3 só atende o **centro de saúde**. A **biblioteca** fica na sala 12.", "Window 3 only deals with the health centre. The library is in room 12."),
    wirklich: null,
  },
  frist: {
    tag: 3,
    art: "echt",
    memo: q("A **marcação** tem de ser para **hoje**. Veja a data da marcação e o calendário.", "The appointment must be for today. Check its date and the calendar."),
    wirklich: q("Muitos serviços (Finanças, Segurança Social, AIMA) atendem com marcação, e é preciso ir no dia, à hora e ao balcão marcados. A marcação faz-se nos portais oficiais ou por telefone, e é gratuita: não pague a ninguém por ela.", "Many offices (Finanças, Segurança Social, AIMA) serve people by appointment, and you go on its day, at its time, to its office. You book on the official portals or by phone, and booking is free: don’t pay anybody for it."),
    quelle: FUENTE_PORTAL,
    url: URL_PORTAL,
  },
  tasa: {
    tag: 4,
    art: "echt",
    memo: q("É preciso o **comprovativo de pagamento da taxa** (referência Multibanco), em nome de quem faz o pedido.", "You need the fee receipt (Multibanco reference), in the name of the person making the application."),
    wirklich: q("Os pedidos à AIMA têm taxas, normalmente pagas com uma referência Multibanco ou no portal. Os valores mudam: consulte o site oficial e confirme quando e a quem se paga.", "Applications to AIMA carry fees, usually paid with a Multibanco reference or on the portal. The amounts change, so look them up on the official site and check when and to whom you pay."),
    quelle: FUENTE_AIMA,
    url: URL_AIMA,
  },
  solicitud: {
    tag: 3,
    art: "echt",
    memo: q("O **NIF** pede-se nas **Finanças**; o **NISS** na **Segurança Social**. A caixa tem de coincidir com o que a pessoa pede.", "The NIF is requested at Finanças; the NISS at Segurança Social. The box must match what the person is asking for."),
    wirklich: q("O NIF é o número de identificação fiscal, atribuído pelas Finanças. O NISS é o número de identificação da Segurança Social, preciso para trabalhar e descontar. São dois pedidos separados, em serviços diferentes: aqui aparecem na mesma folha só para simplificar o jogo. Quem não é residente pode precisar de um representante fiscal para o NIF.", "The NIF is the tax identification number, issued by Finanças. The NISS is the Social Security number, needed to work and pay contributions. They are two separate requests at different offices; the game puts them on one sheet to keep things simple. Someone who is not resident may need a tax representative for the NIF."),
    quelle: FUENTE_FIN,
    url: URL_FIN,
  },
  schreibweise: {
    tag: 4,
    art: "lindenau",
    memo: q("Não confunda **nome próprio** e **apelidos**. Conte **cada letra**. As maiúsculas do passaporte podem não ter acento: GONCALVES e Gonçalves valem.", "Don’t mix up first name and surnames. Every letter counts. Capitals in a passport may have no accent: GONCALVES and Gonçalves are both fine."),
    wirklich: null,
  },
  foto: {
    tag: 4,
    art: "echt",
    memo: q("Para o título de residência é preciso uma **fotografia** recente com **fundo claro**.", "For the residence card you need a recent photo with a light background."),
    wirklich: q("Para o título de residência pedem uma fotografia recente, tipo passe, de fundo claro e liso, e recolhem as impressões digitais. Confirme as medidas e quantas fotografias pede o seu serviço.", "For the residence card you are asked for a recent passport-type photo on a plain light background, and your fingerprints are taken. Check the size and how many photos your office asks for."),
    quelle: FUENTE_AIMA,
    url: URL_AIMA,
  },
  original: {
    tag: 4,
    art: "echt",
    memo: q("O passaporte tem de ser o **original**. Um **fax** não serve.", "The passport must be the original. A fax doesn’t count."),
    wirklich: q("Os serviços costumam querer ver o passaporte original, e muitos pedem também uma cópia. Leve os dois.", "Offices usually want to see your original passport, and many ask for a copy as well. Bring both."),
    quelle: FUENTE_AIMA,
    url: URL_AIMA,
  },
  kuli: {
    tag: 4,
    art: "lindenau",
    memo: q("Hoje, só **caneta preta**.", "Today, black pen only."),
    wirklich: null,
  },
  derivar: {
    tag: 5,
    art: "echt",
    memo: q("**Nacionalidade** e **manifestação de interesse**: aqui não se decide. Informe a pessoa e encaminhe-a para a **informação oficial**.", "Nationality and manifestação de interesse aren’t decided at this window. Inform the person and send them to the official information."),
    wirklich: q("O pedido de nacionalidade portuguesa trata-se nos serviços de registos (IRN), não na AIMA, e as regras (anos de residência, prova de língua) estão em mudança desde 2025. A manifestação de interesse, uma via que permitia pedir residência a quem tinha trabalho em Portugal, foi extinta em 2024. Cada caso é diferente: antes de agir, consulte a informação oficial, uma associação de apoio a migrantes ou um advogado.", "Applications for Portuguese nationality are handled by the registry services (IRN), not by AIMA, and the rules (years of residence, language proof) have been changing since 2025. The manifestação de interesse, a route that let people with work in Portugal apply for residence, was ended in 2024. Each case is different, so before you act, check the official information, a migrant support organisation or a lawyer."),
    quelle: FUENTE_NAC,
    url: URL_NAC,
  },
};

/** The rules on the memo on a given day. */
export const regelnBis = (tag) => TAGE[tag]?.regeln ?? [];
export const neueRegeln = (tag) => regelnBis(tag).filter((id) => REGELN[id].tag === tag);

// Questions that fit some mistake; mixed into each list as the two wrong ones.
const F = {
  name: q("Pode confirmar o seu nome, por favor?", "Could you check your name, please?"),
  datum: q("Pode confirmar a sua data de nascimento, por favor?", "Could you check your date of birth, please?"),
  pass: q("Tem outro documento válido?", "Do you have another valid document?"),
  wgb: q("Pode mostrar-me o contrato de arrendamento, por favor?", "Could you show me the rental contract, please?"),
  adresse: q("Esta morada está certa? O número não coincide.", "Is this address right? The number doesn’t match."),
  wohin: q("É a primeira inscrição ou mudou de casa dentro de Vilabruno?", "Is this your first registration, or have you moved house inside Vilabruno?"),
  unterschreiben: q("Pode assinar aqui, por favor?", "Could you sign here, please?"),
  familienname: q("Qual é o seu nome próprio e quais são os seus apelidos?", "Which is your first name and which are your surnames?"),
  kuli: q("Pode assinar outra vez com caneta preta?", "Could you sign again in black pen?"),
  original: q("Tem o passaporte original?", "Do you have the original passport?"),
  zimmer: q("Vem por causa de um cartão de biblioteca?", "Are you here for a library card?"),
  cita: q("Pode ver a data da sua marcação?", "Could you look at the date of your appointment?"),
  tasa: q("Tem o comprovativo de pagamento da taxa?", "Do you have the fee receipt?"),
  tasaName: q("Em nome de quem foi paga a taxa?", "In whose name was the fee paid?"),
  foto: q("Tem outra fotografia com fundo claro?", "Do you have another photo with a light background?"),
  tramite: q("Vem pedir o NIF ou o NISS?", "Have you come to ask for the NIF or the NISS?"),
  sabe: q("Já consultou a informação oficial sobre o seu caso?", "Have you looked at the official information about your case?"),
};

const VUELVO = q("Hum, não sei bem como resolver isto. Volto noutro dia.", "Hmm, I’m not sure how to fix it. I’ll come back another day.");

export const FEHLER = {
  familienname: {
    regel: "name",
    notiz: q("Os apelidos não coincidem", "The surnames don’t match"),
    fragen: [F.name, F.wgb, F.unterschreiben], passt: 0,
    loest: q("Ai, um erro de escrita! Corrijo já.", "Oh, a typo! I’ll correct it right now."),
    nicht: VUELVO,
  },
  vorname: {
    regel: "name",
    notiz: q("O nome próprio não coincide", "The first name doesn’t match"),
    fragen: [F.pass, F.name, F.unterschreiben], passt: 1,
    loest: q("É verdade! Falta uma letra. Já corrijo.", "You’re right! A letter is missing. I’ll correct it."),
    nicht: VUELVO,
  },
  geburtsdatum: {
    regel: "name",
    notiz: q("A data de nascimento não coincide", "The date of birth doesn’t match"),
    fragen: [F.adresse, F.wohin, F.datum], passt: 2,
    loest: q("Ui, enganei-me num número! Um momento, escrevo-o bem.", "Oh, I got a number wrong! Just a moment, I’ll write it properly."),
    nicht: VUELVO,
  },
  abgelaufen: {
    regel: "gueltig",
    notiz: q("O documento está caducado", "The document has expired"),
    fragen: [F.pass, F.unterschreiben, F.name], passt: 0,
    loest: q("Sim, aqui tenho o passaporte novo. Este está válido.", "Yes, I have my new passport here. This one is valid."),
    nicht: q("Não, não tenho outro. Renovo-o e volto.", "No, I don’t have another one. I’ll renew it and come back."),
  },
  wgb_fehlt: {
    regel: "wgb",
    notiz: q("Falta o comprovativo da morada", "The proof of address is missing"),
    fragen: [F.name, F.wgb, F.pass], passt: 1,
    loest: q("Ah, sim, tenho-o na mochila! Aqui está.", "Oh yes, it’s in my rucksack! Here you are."),
    nicht: q("Vivo com um amigo e não tenho contrato. Volto com uma declaração dele.", "I live with a friend and have no contract. I’ll come back with a statement from them."),
  },
  wgb_adresse: {
    regel: "wgb",
    notiz: q("A morada não coincide com o contrato", "The address doesn’t match the contract"),
    fragen: [F.adresse, F.datum, F.zimmer], passt: 0,
    loest: q("Tem razão, troquei os números. Corrijo.", "You’re right, I swapped the numbers. I’ll correct it."),
    nicht: q("O contrato está errado: o senhorio enganou-se. Volto com um corrigido.", "The contract is wrong: the landlord made a mistake. I’ll come back with a corrected one."),
  },
  formular: {
    regel: "formular",
    notiz: q("A caixa marcada não é a certa", "The wrong box is ticked"),
    fragen: [F.wgb, F.unterschreiben, F.wohin], passt: 2,
    loest: q("Mudei de casa dentro de Vilabruno. Então marco a outra caixa. Pronto.", "I’ve moved house inside Vilabruno. So I’ll tick the other box. There you go."),
    nicht: VUELVO,
  },
  unterschrift: {
    regel: "unterschrift",
    notiz: q("Falta a assinatura", "The signature is missing"),
    fragen: [F.datum, F.unterschreiben, F.adresse], passt: 1,
    loest: q("Ui, esqueci-me! Pronto.", "Oops, I forgot! There you go."),
    nicht: q("Acabou-se-me a tinta da caneta … Já volto.", "My pen has run out … I’ll be right back."),
  },
  zimmer: {
    regel: "meldesachen",
    notiz: q("Balcão errado: a biblioteca fica na sala 12", "Wrong window: the library is in room 12"),
    fragen: [F.zimmer, F.wgb, F.name], passt: 0,
    loest: null,
    nicht: q("Au! Sim, por favor! … Sala 12? Au, obrigado!", "Woof! Yes, please! … Room 12? Woof, thank you!"),
  },
  frist: {
    regel: "frist",
    notiz: q("A marcação não é para hoje", "The appointment isn’t for today"),
    fragen: [F.cita, F.kuli, F.name], passt: 0,
    loest: null,
    nicht: q("É verdade, não é hoje! Volto no dia da minha marcação.", "You’re right, it isn’t today! I’ll come back on the day of my appointment."),
  },
  tasa_fehlt: {
    regel: "tasa",
    notiz: q("Falta o comprovativo de pagamento da taxa", "The fee receipt is missing"),
    fragen: [F.original, F.tasa, F.name], passt: 1,
    loest: q("Ah, sim! Paguei ontem no Multibanco. Aqui está.", "Oh yes! I paid it at the ATM yesterday. Here it is."),
    nicht: q("Ainda não paguei. Vou ao Multibanco e marco outra vez, se for preciso.", "I haven’t paid yet. I’ll go to the ATM and book again if I need to."),
  },
  tasa_name: {
    regel: "tasa",
    notiz: q("A taxa está em nome de outra pessoa", "The fee is in someone else’s name"),
    fragen: [F.foto, F.cita, F.tasaName], passt: 2,
    loest: null,
    nicht: q("O meu irmão fez a referência com o nome dele. Pago outra taxa com o meu e volto.", "My brother made the reference in his name. I’ll pay another fee in mine and come back."),
  },
  solicitud: {
    regel: "solicitud",
    notiz: q("A caixa não coincide com o que a pessoa pede", "The box doesn’t match what the person is asking for"),
    fragen: [F.tramite, F.datum, F.foto], passt: 0,
    loest: q("Ah, enganei-me na caixa! Já a troco.", "Oh, I ticked the wrong box! I’ll change it now."),
    nicht: VUELVO,
  },
  foto_fondo: {
    regel: "foto",
    notiz: q("A fotografia não tem fundo claro", "The photo doesn’t have a light background"),
    fragen: [F.foto, F.kuli, F.tasa], passt: 0,
    loest: q("Sim, tirei várias. Tenha, esta tem fundo claro.", "Yes, I had several taken. Here, this one has a light background."),
    nicht: q("Não tenho outra. Tiro uma na cabine de fotografias e volto.", "I don’t have another one. I’ll get one in the photo booth and come back."),
  },
  vertauscht: {
    regel: "schreibweise",
    notiz: q("Nome próprio e apelidos estão trocados", "First name and surname are swapped"),
    fragen: [F.familienname, F.pass, F.cita], passt: 0,
    loest: q("Ah! O meu apelido vai na outra linha. Já corrijo.", "Oh! My surname goes on the other line. I’ll correct it."),
    nicht: VUELVO,
  },
  // code kept from the German umlaut mistake; here it is any spelling slip
  umlaut: {
    regel: "schreibweise",
    notiz: q("O apelido está mal escrito", "The surname is spelt wrong"),
    fragen: [F.tramite, F.name, F.kuli], passt: 1,
    loest: q("Tem razão, falta um erre. Agora está certo.", "You’re right, there’s an r missing. Now it’s right."),
    nicht: VUELVO,
  },
  kuli: {
    regel: "kuli",
    notiz: q("A assinatura não está a caneta preta", "The signature isn’t in black pen"),
    fragen: [F.kuli, F.original, F.datum], passt: 0,
    loest: q("Preta? Está bem. Pronto, agora é preta.", "Black? OK. There, now it’s black."),
    nicht: q("Só tenho uma vermelha … Vou lá fora comprar uma preta.", "I’ve only got a red one … I’ll pop out and buy a black one."),
  },
  fax: {
    regel: "original",
    notiz: q("O passaporte é um fax, não o original", "The passport is a fax, not the original"),
    fragen: [F.unterschreiben, F.original, F.tramite], passt: 1,
    loest: q("Quer o original? Aqui está.", "You want the original? Here it is."),
    nicht: q("O original está em casa. Mas o fax é novinho em folha!", "The original’s at home. But the fax is brand new!"),
  },
  derivar_nacionalidade: {
    regel: "derivar",
    notiz: q("A nacionalidade não se decide neste balcão", "Nationality isn’t decided at this window"),
    fragen: [F.foto, F.sabe, F.cita], passt: 1,
    loest: null,
    nicht: q("Ainda não. Então vejo o site oficial e pergunto numa associação de apoio. Obrigado.", "Not yet. Then I’ll look at the official website and ask at a support organisation. Thank you."),
  },
  derivar_manifestacao: {
    regel: "derivar",
    notiz: q("A manifestação de interesse não se decide neste balcão", "Manifestação de interesse isn’t decided at this window"),
    fragen: [F.sabe, F.kuli, F.tasa], passt: 0,
    loest: null,
    nicht: q("Não, só ouvi falar disso. Ainda se pode? Vejo o site oficial e peço conselho.", "No, I only heard about it. Is it still possible? I’ll look at the official website and get advice."),
  },
};

// What a customer says to a question that doesn't fit their case.
export const WIRR = [
  q("Desculpe? Não percebo.", "Sorry? I don’t understand."),
  q("Hã … porque é que me pergunta isso?", "Erm … why are you asking me that?"),
  q("Mas está tudo aí, não está?", "But it’s all there, isn’t it?"),
  q("Como? Acho que esse não é o problema.", "What? I don’t think that’s the problem."),
];
