// Bruno's Front Desk: the rules of the counter and the mistakes papers can have.
//
// Bruno works desk 3 at Brambleford Town Hall, where residents apply for a resident parking
// permit. REGELN: one entry per rule. Regi pins the new ones on the memo each morning; `art` says
// whether it is how it usually works at UK councils ("echt", with a source; every council sets
// its own permit rules, so the texts say "many councils") or an openly made-up Brambleford rule
// ("lindenau"; the key value is kept so the code keeps working). `memo` is the line on the memo,
// the key word in **bold**; `wirklich` is the "How it really works" text.
//
// FEHLER: every mistake a case can carry. `regel` is the rule that makes it a mistake (only
// rules active today inject mistakes), `notiz` is what the notes say once the player has
// found it, `fragen` are the three questions offered, `passt` the one that fits; `loest` is the
// customer's answer when the right question fixes the case, `nicht` when it can't be fixed
// today. The key `de` holds the English being learnt (A2–B1); `en` is a plainer paraphrase.

export const REGELN = {
  name: {
    tag: 1,
    art: "echt",
    memo: { de: "The **name** and **date of birth** on the application must be the same as on the **photo ID**.", en: "Name and date of birth on the form and on the ID must match." },
    wirklich: { de: "Many councils ask for photo ID, such as a passport or a photocard driving licence, when you apply for a resident permit, and check that it matches the form.", en: "The council compares your form with your ID." },
    quelle: "GOV.UK: Get a parking permit (each council sets its own rules)",
    url: "https://www.gov.uk/parking-permit",
  },
  gueltig: {
    tag: 2,
    art: "echt",
    memo: { de: "The ID must not be **out of date**. Look at “valid until” and at the calendar.", en: "The ID must not be expired. Check the date on it and today's date." },
    wirklich: { de: "You must renew the photocard of a UK driving licence every 10 years, and an adult passport is usually valid for 10 years. An expired document is not normally accepted as ID.", en: "Old, expired ID usually doesn't count." },
    quelle: "GOV.UK: Renew your driving licence",
    url: "https://www.gov.uk/renew-driving-licence",
  },
  wgb: {
    tag: 3,
    art: "echt",
    memo: { de: "A resident permit needs **proof of address**, for example a **tenancy agreement**. Address, start date and name must match.", en: "You need a paper that shows where you live. Address, date and name must match." },
    wirklich: { de: "A resident permit is only for people who live in the zone, so councils ask for proof of address: a tenancy agreement, a council tax bill or a recent utility bill. Each council decides which papers it accepts.", en: "You show a paper with your name and address on it." },
    quelle: "GOV.UK: Get a parking permit (each council sets its own rules)",
    url: "https://www.gov.uk/parking-permit",
  },
  frist: {
    tag: 4,
    art: "lindenau",
    memo: { de: "Apply **within 2 weeks** of moving in. Later? Go to room 5 (Parking Fines) first.", en: "Apply less than 2 weeks after you moved in. If not, go to room 5 first." },
    wirklich: null,
  },
  formular: {
    tag: 5,
    art: "echt",
    memo: { de: "Tick the right **box**: new in Brambleford → **New permit**. Moving inside Brambleford → **Change of address**. Moving away → **Cancel permit**.", en: "The right box: new here, moving inside the town, or leaving." },
    wirklich: { de: "A resident permit belongs to one address. If you move inside the same council area, the permit is changed to the new address; if you move away, it is cancelled, and many councils refund the months you haven't used.", en: "When you move, you tell the council, and the permit is changed or cancelled." },
    quelle: "GOV.UK: Get a parking permit (each council sets its own rules)",
    url: "https://www.gov.uk/parking-permit",
  },
  unterschrift: {
    tag: 6,
    art: "echt",
    memo: { de: "No **signature**, no stamp.", en: "Without a signature there is no stamp." },
    wirklich: { de: "On a paper form you sign a declaration that what you wrote is true. Online forms ask you to tick a box instead.", en: "You sign to say that the form is true." },
    quelle: "Common practice on UK council paper forms",
    url: "https://www.gov.uk/parking-permit",
  },
  schreibweise: {
    tag: 6,
    art: "lindenau",
    memo: { de: "Don't mix up **surname** and **first name**. **Every letter** counts: McKenzie is not Mackenzie. If the passport says O’NEILL in capitals, O’Neill is fine.", en: "Surname and first name in the right boxes, spelt exactly as on the ID." },
    wirklich: null,
  },
  kuli: {
    tag: 6,
    art: "lindenau",
    memo: { de: "Today **black pen** only!", en: "Today only black pen!" },
    wirklich: null,
  },
  meldesachen: {
    tag: 7,
    art: "lindenau",
    memo: { de: "Desk 3 only does **parking permits**. ID only as the **original**, never as a fax.", en: "This desk is only for parking permits. Bring the real ID, not a fax." },
    wirklich: null,
  },
};

/** The rules active on a day: everything up to it (day shift and endless mode play day 7). */
export const regelnBis = (tag) => Object.keys(REGELN).filter((id) => REGELN[id].tag <= tag);
export const neueRegeln = (tag) => Object.keys(REGELN).filter((id) => REGELN[id].tag === tag);

const q = (de, en) => ({ de, en });
// Questions that fit some other mistake; mixed into each list as the two wrong ones.
const F = {
  name: q("Could you check your name again, please?", "Please look at your name again."),
  datum: q("Could you check your date of birth again, please?", "Please look at your birthday again."),
  pass: q("Have you got any other ID, like a passport?", "Do you have a second ID?"),
  wgb: q("Could I see your proof of address, please?", "Please show me the paper with your address."),
  adresse: q("Is this address right? The house number here is different.", "The house numbers are not the same."),
  einzug: q("When exactly did you move in?", "On what day did you move in?"),
  wohin: q("Where are you moving to?", "Where is your new home?"),
  unterschreiben: q("Could you sign here, please?", "Please write your signature here."),
  familienname: q("Which is your surname, and which is your first name?", "What is your family name, and what is your first name?"),
  kuli: q("Could you sign again in black pen, please?", "Please sign again with a black pen."),
  original: q("Have you got the original ID with you?", "Do you have the real ID, not a copy?"),
  zimmer: q("Are you here for a library card?", "Do you want a library card?"),
};

export const FEHLER = {
  familienname: {
    regel: "name",
    notiz: q("Surname doesn't match", "The family name is different"),
    fragen: [F.name, F.wgb, F.einzug], passt: 0,
    loest: q("Oh, a typo! I'll correct it straight away.", "Oh, a small mistake! I'll fix it now."),
    nicht: q("Hmm, I'm not sure … I'll come back tomorrow.", "I don't know. I'll come again tomorrow."),
  },
  vorname: {
    regel: "name",
    notiz: q("First name doesn't match", "The first name is different"),
    fragen: [F.pass, F.name, F.unterschreiben], passt: 1,
    loest: q("Oh yes! There's a letter missing. I'll correct it.", "One letter is missing. I'll fix it."),
    nicht: q("Hmm, I'm not sure … I'll come back tomorrow.", "I don't know. I'll come again tomorrow."),
  },
  geburtsdatum: {
    regel: "name",
    notiz: q("Date of birth doesn't match", "The birthday is different"),
    fragen: [F.adresse, F.wohin, F.datum], passt: 2,
    loest: q("Oh no, I've mixed up the numbers! Hang on, I'll write it properly.", "The numbers are in the wrong order. I'll write them again."),
    nicht: q("I'm not completely sure … I'll check with my mum and come back.", "I don't know exactly. I'll ask my mother."),
  },
  abgelaufen: {
    regel: "gueltig",
    notiz: q("ID is out of date", "The ID has expired"),
    fragen: [F.pass, F.unterschreiben, F.name], passt: 0,
    loest: q("Yes, here's my passport. That's still valid.", "Here is my passport. It is still OK."),
    nicht: q("No, I'm afraid not. I'll renew it and come back.", "No. I'll get a new one and come again."),
  },
  wgb_fehlt: {
    regel: "wgb",
    notiz: q("Proof of address is missing", "There is no paper with the address"),
    fragen: [F.einzug, F.wgb, F.pass], passt: 1,
    loest: q("Oh yes, it's still in my bag. Here you are!", "It was in my bag. Here it is!"),
    nicht: q("I haven't got one. I'll ask my landlord.", "I don't have it. I'll ask the owner of my flat."),
  },
  wgb_adresse: {
    regel: "wgb",
    notiz: q("Address doesn't match the tenancy agreement", "The two addresses are different"),
    fragen: [F.adresse, F.datum, F.zimmer], passt: 0,
    loest: q("You're right, I swapped the numbers. I'll correct it.", "I wrote the numbers in the wrong order. I'll fix it."),
    nicht: q("Hmm, my landlord wrote it wrong. I'll come back with a new one.", "The owner made a mistake. I'll bring a new paper."),
  },
  wgb_einzug: {
    regel: "wgb",
    notiz: q("Move-in date doesn't match the tenancy agreement", "The two dates are different"),
    fragen: [F.wohin, F.einzug, F.original], passt: 1,
    loest: q("Oh, the agreement is right. I'll correct the date.", "The contract has the right date. I'll fix mine."),
    nicht: q("I can't remember exactly … I'll ask my landlord.", "I don't know the day. I'll ask the owner."),
  },
  frist: {
    regel: "frist",
    notiz: q("More than 2 weeks after moving in", "Moved in too long ago"),
    fragen: [F.einzug, F.kuli, F.name], passt: 0,
    loest: q("Oh, I wrote the wrong date! I only moved in last week.", "The date was wrong. I moved in last week."),
    nicht: q("Oh dear, that was a while ago … I'll go to room 5, then.", "That was long ago. I'll go to room 5."),
  },
  formular: {
    regel: "formular",
    notiz: q("Wrong box ticked", "The wrong kind of application"),
    fragen: [F.wgb, F.unterschreiben, F.wohin], passt: 2,
    loest: q("I see! Then I'll tick the other box. There you go.", "I'll choose the other box. Done."),
    nicht: q("Oh, so I don't need to do anything here? Brilliant, thanks!", "So I don't need this? Great, thank you!"),
  },
  unterschrift: {
    regel: "unterschrift",
    notiz: q("Signature is missing", "No signature"),
    fragen: [F.datum, F.unterschreiben, F.adresse], passt: 1,
    loest: q("Oops, I forgot! There you go.", "I forgot. Here it is."),
    nicht: q("My pen's run out … I'll be right back.", "My pen is empty. I'll come back soon."),
  },
  vertauscht: {
    regel: "schreibweise",
    notiz: q("First name and surname swapped", "The names are in the wrong boxes"),
    fragen: [F.familienname, F.pass, F.einzug], passt: 0,
    loest: q("Oh! My surname goes in the other box. I'll correct it.", "My family name goes in the other box. I'll fix it."),
    nicht: q("I don't understand … I'll come back with someone to help.", "I don't understand. I'll bring a helper."),
  },
  // code kept from the German umlaut mistake; in English it is any spelling slip
  umlaut: {
    regel: "schreibweise",
    notiz: q("Name spelt wrong", "The name has a spelling mistake"),
    fragen: [F.wohin, F.name, F.kuli], passt: 1,
    loest: q("You're right, I missed a letter! That's correct now.", "A letter was missing. Now it's right."),
    nicht: q("Hmm, I'm not sure … I'll come back tomorrow.", "I don't know. I'll come again tomorrow."),
  },
  kuli: {
    regel: "kuli",
    notiz: q("Signature not in black pen", "The signature is not black"),
    fragen: [F.kuli, F.original, F.datum], passt: 0,
    loest: q("Black? Fine. There, now it's black.", "OK, I'll sign in black. Done."),
    nicht: q("I've only got a red pen … I'll pop out and buy a black one.", "I only have a red pen. I'll buy a black one."),
  },
  fax: {
    regel: "meldesachen",
    notiz: q("ID only as a fax", "The ID is a fax, not the original"),
    fragen: [F.unterschreiben, F.original, F.wohin], passt: 1,
    loest: q("Oh, you want the original? Here you are.", "You want the real one? Here it is."),
    nicht: q("The original's at home. But the fax is brand new!", "The real ID is at home. But the fax is new!"),
  },
  zimmer: {
    regel: "meldesachen",
    notiz: q("Wrong desk – the library is in room 12", "Wrong desk – go to room 12"),
    fragen: [F.zimmer, F.wgb, F.name], passt: 0,
    loest: null,
    nicht: q("Woof! Yes, please! … Room 12? Woof, thanks!", "Woof! Yes! … Room 12? Woof, thank you!"),
  },
};

// What a customer says to a question that doesn't fit their case.
export const WIRR = [
  q("Sorry? I don't understand.", "Pardon? I don't understand."),
  q("Erm … why are you asking that?", "Why do you ask that?"),
  q("It's all on there, isn't it?", "Everything is written there, right?"),
  q("Hmm? I don't think that's the problem.", "That is not the problem, I think."),
];
