// Brunos Bürgeramt: the rules of the counter and the mistakes papers can have.
//
// REGELN: one entry per rule. Regi pins the new ones on the memo each morning; `art` says
// whether it is how it really works in Germany ("echt", with its source, checked 2026-10-28,
// docs/buergeramt-tier0-v1.md) or an openly made-up Lindenau rule ("lindenau"). `memo` is the
// line on the memo, the key word in **bold**; `wirklich` is the "So ist es wirklich" text.
//
// FEHLER: every mistake a case can carry. `regel` is the rule that makes it a mistake (only
// rules active today inject mistakes), `notiz` is what the Notizzettel says once the player has
// found it, `fragen` are the three questions offered, `passt` the one that fits; `loest` is the
// customer's answer when the right question fixes the case, `nicht` when it can't be fixed
// today. The German is the content being learnt; `en` is the gloss.

export const REGELN = {
  name: {
    tag: 1,
    art: "echt",
    memo: { de: "**Name** und **Geburtsdatum** auf dem Meldeschein und im Ausweis müssen gleich sein.", en: "Name and date of birth on the registration form and in the ID must be the same." },
    wirklich: { de: "Zur Anmeldung füllst du den Meldeschein aus und zeigst deinen Personalausweis oder Pass. Das Amt vergleicht die Daten.", en: "To register you fill in the form and show your ID card or passport. The office compares the data." },
    quelle: "§ 23 Abs. 1 BMG",
    url: "https://www.gesetze-im-internet.de/bmg/__23.html",
  },
  gueltig: {
    tag: 2,
    art: "echt",
    memo: { de: "Der Ausweis darf nicht **abgelaufen** sein. Schau auf „gültig bis“ und auf den Kalender.", en: "The ID must not be expired. Look at “valid until” and at the calendar." },
    wirklich: { de: "Ein Personalausweis gilt 10 Jahre, wenn du unter 24 bist 6 Jahre. Ein abgelaufener Ausweis ist kein gültiges Dokument.", en: "An ID card is valid for 10 years, 6 years if you are under 24. An expired ID is not a valid document." },
    quelle: "§ 6 PAuswG",
    url: "https://www.gesetze-im-internet.de/pauswg/__6.html",
  },
  wgb: {
    tag: 3,
    art: "echt",
    memo: { de: "Zur **Anmeldung** gehört eine **Wohnungsgeberbestätigung**. Adresse, Einzugsdatum und Name müssen passen.", en: "Registering needs a landlord's confirmation. Address, move-in date and name must match." },
    wirklich: { de: "Der Vermieter (Wohnungsgeber) bestätigt schriftlich, dass du eingezogen bist: mit Adresse, Einzugsdatum und deinem Namen. Ein Mietvertrag reicht nicht.", en: "The landlord confirms in writing that you moved in: address, move-in date and your name. A rental contract is not enough." },
    quelle: "§ 19 Abs. 1 und 3 BMG",
    url: "https://www.gesetze-im-internet.de/bmg/__19.html",
  },
  frist: {
    tag: 4,
    art: "echt",
    memo: { de: "Anmelden **innerhalb von 2 Wochen** nach dem Einzug. Später? Erst zu Zimmer 5 (Bußgeldstelle).", en: "Register within 2 weeks after moving in. Later? First to room 5 (fines office)." },
    wirklich: { de: "Du musst dich innerhalb von zwei Wochen nach dem Einzug anmelden. Wer zu spät kommt, wird trotzdem angemeldet, kann aber ein Bußgeld bekommen (bis 1.000 €). Das Wegschicken zu Zimmer 5 gibt es nur in Lindenau.", en: "You must register within two weeks of moving in. If you are late you are still registered but can be fined (up to €1,000). Being sent to room 5 only happens in Lindenau." },
    quelle: "§ 17 Abs. 1 und § 54 BMG",
    url: "https://www.gesetze-im-internet.de/bmg/__17.html",
  },
  formular: {
    tag: 5,
    art: "echt",
    memo: { de: "Das richtige **Formular**: neu in Lindenau → **Anmeldung**. Umzug in Lindenau → **Ummeldung**. Ins Ausland → **Abmeldung**. In eine andere deutsche Stadt → dort anmelden, hier nichts.", en: "The right form: new in Lindenau → registration. Moving within Lindenau → change of address. Abroad → deregistration. To another German town → register there, nothing here." },
    wirklich: { de: "Ziehst du innerhalb Deutschlands um, meldest du dich nur am neuen Ort an – die alte Stadt erfährt es automatisch. Abmelden musst du dich nur, wenn du ins Ausland ziehst oder keine neue Wohnung in Deutschland hast.", en: "If you move within Germany, you only register at the new place – the old town is told automatically. You only deregister when you move abroad or have no new flat in Germany." },
    quelle: "§ 17 Abs. 2 BMG; service.berlin.de „Abmeldung einer Wohnung“",
    url: "https://service.berlin.de/dienstleistung/120335/",
  },
  unterschrift: {
    tag: 6,
    art: "echt",
    memo: { de: "Ohne **Unterschrift** kein Stempel.", en: "No signature, no stamp." },
    wirklich: { de: "Den Meldeschein musst du selbst unterschreiben.", en: "You have to sign the registration form yourself." },
    quelle: "§ 23 Abs. 1 BMG",
    url: "https://www.gesetze-im-internet.de/bmg/__23.html",
  },
  schreibweise: {
    tag: 6,
    art: "lindenau",
    memo: { de: "**Familienname** und **Vorname** nicht vertauschen. **Umlaute** zählen: Müller ist nicht Muller. Steht im Ausweis MUELLER, passt Müller.", en: "Don't swap family name and first name. Umlauts count: Müller is not Muller. If the ID says MUELLER, Müller is fine." },
    wirklich: null,
  },
  kuli: {
    tag: 6,
    art: "lindenau",
    memo: { de: "Heute nur **blauer Kuli**!", en: "Today only blue pen!" },
    wirklich: null,
  },
  meldesachen: {
    tag: 7,
    art: "lindenau",
    memo: { de: "An Schalter 3 nur **Meldesachen**. Ausweis nur im **Original**, nie als Fax.", en: "Counter 3 only does registrations. ID only as the original, never as a fax." },
    wirklich: null,
  },
};

/** The rules active on a day: everything up to it (Tagesschicht and Endlos play Tag 7). */
export const regelnBis = (tag) => Object.keys(REGELN).filter((id) => REGELN[id].tag <= tag);
export const neueRegeln = (tag) => Object.keys(REGELN).filter((id) => REGELN[id].tag === tag);

const q = (de, en) => ({ de, en });
// Questions that fit some other mistake; mixed into each list as the two wrong ones.
const F = {
  name: q("Können Sie Ihren Namen bitte noch einmal prüfen?", "Could you please check your name again?"),
  datum: q("Können Sie Ihr Geburtsdatum bitte noch einmal prüfen?", "Could you please check your date of birth again?"),
  pass: q("Haben Sie noch einen anderen Ausweis, zum Beispiel einen Reisepass?", "Do you have another ID, for example a passport?"),
  wgb: q("Können Sie mir bitte Ihre Wohnungsgeberbestätigung zeigen?", "Could you please show me your landlord's confirmation?"),
  adresse: q("Stimmt die Adresse? Hier steht eine andere Hausnummer.", "Is the address right? A different house number is written here."),
  einzug: q("Wann sind Sie genau eingezogen?", "When exactly did you move in?"),
  wohin: q("Wohin ziehen Sie denn?", "Where are you moving to?"),
  unterschreiben: q("Könnten Sie bitte hier unterschreiben?", "Could you please sign here?"),
  familienname: q("Was ist Ihr Familienname, und was ist Ihr Vorname?", "What is your family name, and what is your first name?"),
  kuli: q("Könnten Sie bitte noch einmal mit blauem Kuli unterschreiben?", "Could you please sign again with a blue pen?"),
  original: q("Haben Sie den Ausweis auch im Original dabei?", "Do you have the original ID with you?"),
  zimmer: q("Möchten Sie eine Hundesteuermarke?", "Would you like a dog tax tag?"),
};

export const FEHLER = {
  familienname: {
    regel: "name",
    notiz: q("Familienname passt nicht", "Family name doesn't match"),
    fragen: [F.name, F.wgb, F.einzug], passt: 0,
    loest: q("Oh, ein Tippfehler! Ich korrigiere das sofort.", "Oh, a typo! I'll correct it right away."),
    nicht: q("Hm, ich bin mir nicht sicher … Ich komme morgen wieder.", "Hm, I'm not sure … I'll come back tomorrow."),
  },
  vorname: {
    regel: "name",
    notiz: q("Vorname passt nicht", "First name doesn't match"),
    fragen: [F.pass, F.name, F.unterschreiben], passt: 1,
    loest: q("Ach so, ja! Da fehlt ein Buchstabe. Ich korrigiere das.", "Oh yes! A letter is missing. I'll correct it."),
    nicht: q("Hm, ich bin mir nicht sicher … Ich komme morgen wieder.", "Hm, I'm not sure … I'll come back tomorrow."),
  },
  geburtsdatum: {
    regel: "name",
    notiz: q("Geburtsdatum passt nicht", "Date of birth doesn't match"),
    fragen: [F.adresse, F.wohin, F.datum], passt: 2,
    loest: q("Oh nein, die Zahlen sind vertauscht! Moment, ich schreibe es richtig.", "Oh no, the numbers are mixed up! One moment, I'll write it correctly."),
    nicht: q("Das weiß ich nicht genau … Ich frage meine Mutter und komme wieder.", "I don't know exactly … I'll ask my mother and come back."),
  },
  abgelaufen: {
    regel: "gueltig",
    notiz: q("Ausweis ist abgelaufen", "ID has expired"),
    fragen: [F.pass, F.unterschreiben, F.name], passt: 0,
    loest: q("Ja, hier ist mein Reisepass. Der ist noch gültig.", "Yes, here is my passport. It's still valid."),
    nicht: q("Nein, leider nicht. Ich beantrage einen neuen und komme wieder.", "No, unfortunately not. I'll apply for a new one and come back."),
  },
  wgb_fehlt: {
    regel: "wgb",
    notiz: q("Wohnungsgeberbestätigung fehlt", "Landlord's confirmation is missing"),
    fragen: [F.einzug, F.wgb, F.pass], passt: 1,
    loest: q("Ach ja, die ist noch in meiner Tasche. Bitte schön!", "Oh yes, it's still in my bag. Here you are!"),
    nicht: q("Die habe ich nicht. Ich frage meinen Vermieter.", "I don't have it. I'll ask my landlord."),
  },
  wgb_adresse: {
    regel: "wgb",
    notiz: q("Adresse passt nicht zur Wohnungsgeberbestätigung", "Address doesn't match the landlord's confirmation"),
    fragen: [F.adresse, F.datum, F.zimmer], passt: 0,
    loest: q("Stimmt, ich habe die Zahlen vertauscht. Ich korrigiere das.", "Right, I mixed up the numbers. I'll correct it."),
    nicht: q("Hm, mein Vermieter hat das falsch geschrieben. Ich komme mit einer neuen wieder.", "Hm, my landlord wrote it wrong. I'll come back with a new one."),
  },
  wgb_einzug: {
    regel: "wgb",
    notiz: q("Einzugsdatum passt nicht zur Wohnungsgeberbestätigung", "Move-in date doesn't match the landlord's confirmation"),
    fragen: [F.wohin, F.einzug, F.original], passt: 1,
    loest: q("Oh, der Vermieter hat recht. Ich korrigiere das Datum.", "Oh, the landlord is right. I'll correct the date."),
    nicht: q("Das weiß ich nicht mehr genau … Ich frage meinen Vermieter.", "I don't remember exactly … I'll ask my landlord."),
  },
  frist: {
    regel: "frist",
    notiz: q("Mehr als 2 Wochen nach dem Einzug", "More than 2 weeks after moving in"),
    fragen: [F.einzug, F.kuli, F.name], passt: 0,
    loest: q("Oh, da habe ich mich verschrieben! Ich bin erst letzte Woche eingezogen.", "Oh, I wrote it wrong! I only moved in last week."),
    nicht: q("Oje, das ist schon lange her … Dann gehe ich zu Zimmer 5.", "Oh dear, that was a while ago … Then I'll go to room 5."),
  },
  formular: {
    regel: "formular",
    notiz: q("Falsches Formular", "Wrong form"),
    fragen: [F.wgb, F.unterschreiben, F.wohin], passt: 2,
    loest: q("Ach so! Dann nehme ich das andere Formular. Hier, schon ausgefüllt.", "I see! Then I'll take the other form. Here, already filled in."),
    nicht: q("Ach so, dann muss ich hier gar nichts machen? Super, danke!", "Oh, so I don't have to do anything here? Great, thanks!"),
  },
  unterschrift: {
    regel: "unterschrift",
    notiz: q("Unterschrift fehlt", "Signature is missing"),
    fragen: [F.datum, F.unterschreiben, F.adresse], passt: 1,
    loest: q("Oh, vergessen! So, bitte.", "Oh, forgot! There you go."),
    nicht: q("Mein Kuli ist leer … Ich komme gleich wieder.", "My pen is empty … I'll be right back."),
  },
  vertauscht: {
    regel: "schreibweise",
    notiz: q("Vorname und Familienname vertauscht", "First name and family name swapped"),
    fragen: [F.familienname, F.pass, F.einzug], passt: 0,
    loest: q("Oh! Mein Familienname kommt in das andere Feld. Ich korrigiere das.", "Oh! My family name goes in the other box. I'll correct it."),
    nicht: q("Das verstehe ich nicht … Ich komme mit Hilfe wieder.", "I don't understand … I'll come back with help."),
  },
  umlaut: {
    regel: "schreibweise",
    notiz: q("Name falsch geschrieben (Umlaut)", "Name spelt wrong (umlaut)"),
    fragen: [F.wohin, F.name, F.kuli], passt: 1,
    loest: q("Stimmt, da fehlen die zwei Punkte! So ist es richtig.", "Right, the two dots are missing! That's correct now."),
    nicht: q("Hm, ich bin mir nicht sicher … Ich komme morgen wieder.", "Hm, I'm not sure … I'll come back tomorrow."),
  },
  kuli: {
    regel: "kuli",
    notiz: q("Unterschrift nicht mit blauem Kuli", "Signature not in blue pen"),
    fragen: [F.kuli, F.original, F.datum], passt: 0,
    loest: q("Blau? Na gut. So, jetzt ist sie blau.", "Blue? Fine. There, now it's blue."),
    nicht: q("Ich habe nur einen roten Kuli … Ich kaufe schnell einen blauen.", "I only have a red pen … I'll quickly buy a blue one."),
  },
  fax: {
    regel: "meldesachen",
    notiz: q("Ausweis nur als Fax", "ID only as a fax"),
    fragen: [F.unterschreiben, F.original, F.wohin], passt: 1,
    loest: q("Ach, Sie wollen das Original? Hier, bitte.", "Oh, you want the original? Here you go."),
    nicht: q("Das Original liegt zu Hause. Aber das Fax ist doch ganz neu!", "The original is at home. But the fax is brand new!"),
  },
  zimmer: {
    regel: "meldesachen",
    notiz: q("Falscher Schalter – Zimmer 12", "Wrong counter – room 12"),
    fragen: [F.zimmer, F.wgb, F.name], passt: 0,
    loest: null,
    nicht: q("Wuff! Ja, bitte! … Zimmer 12? Wuff, danke!", "Woof! Yes, please! … Room 12? Woof, thanks!"),
  },
};

// What a customer says to a question that doesn't fit their case.
export const WIRR = [
  q("Wie bitte? Das verstehe ich nicht.", "Sorry? I don't understand."),
  q("Ähm … warum fragen Sie das?", "Um … why are you asking that?"),
  q("Das steht doch alles da, oder?", "It's all written there, isn't it?"),
  q("Hm? Ich glaube, das ist nicht das Problem.", "Hm? I don't think that's the problem."),
];
