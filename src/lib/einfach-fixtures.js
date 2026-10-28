/* /einfach — the prototype's three hand-written sittings, kept as test fixtures.
 *
 * Einfach lernen now plays the curated path (src/data/einfach-pfad.json, resolved by
 * src/lib/einfach-content.js). These three stay because they exercise every task type with
 * known answers and need no data build: open /einfach?fixtures to play them instead of the
 * path. Not shown to learners otherwise.
 */

/* ---------------------------------------------------------------- content

   Three sittings. Each is five tasks and claims one or two Kann-Sätze — the
   capability line the learner is shown at the end. The sitting is the unit the
   whole prototype is built around: it is small enough to name ("5 Aufgaben ·
   2 Minuten") and finishing one always buys something specific.
*/

export const FIXTURES = [
  {
    id: "weg",
    icon: "🧭",
    title: "Nach dem Weg fragen",
    level: "A1",
    minutes: 2,
    claims: ["Du fragst auf der Straße nach dem Weg.", "Du verstehst eine kurze Wegbeschreibung."],
    postcard: { city: "Hamburg", fact: "Hamburg hat mehr Brücken als Venedig und Amsterdam zusammen." },
    tasks: [
      { type: "wort", front: "die Haltestelle", back: "the (bus/tram) stop", hint: "Da wartest du auf den Bus." },
      { type: "artikel", noun: "Bahnhof", answer: "der", back: "station", hint: "Wie der Zug.", hintEn: "Like der Zug (train)." },
      {
        type: "luecke",
        before: "Entschuldigung, wie komme ich",
        after: "Bahnhof?",
        options: ["zum", "zur", "zu"],
        answer: "zum",
        why: "der Bahnhof → zu dem → zum.",
        hint: "Bahnhof ist maskulin: der Bahnhof.",
        hintEn: "Bahnhof is masculine: der Bahnhof.",
      },
      { type: "wort", front: "geradeaus", back: "straight ahead", hint: "Nicht links, nicht rechts." },
      {
        type: "satz",
        chips: ["Gehen", "Sie", "hier", "geradeaus"],
        answer: ["Gehen", "Sie", "hier", "geradeaus"],
        why: "Im Imperativ steht das Verb vorn: Gehen Sie …",
        hint: "Das Verb kommt zuerst.",
        hintEn: "The verb comes first.",
      },
    ],
  },
  {
    id: "einkauf",
    icon: "🛒",
    title: "Einkaufen gehen",
    level: "A1",
    minutes: 2,
    claims: ["Du kaufst im Supermarkt ein und fragst nach dem Preis."],
    postcard: { city: "München", fact: "Den Viktualienmarkt in München gibt es seit über 200 Jahren." },
    tasks: [
      { type: "wort", front: "die Kasse", back: "the checkout", hint: "Dort bezahlst du." },
      { type: "artikel", noun: "Brot", answer: "das", back: "bread", hint: "Wie das Wasser.", hintEn: "Like das Wasser (water)." },
      {
        type: "luecke",
        before: "Was kostet",
        after: "Brot?",
        options: ["das", "der", "die"],
        answer: "das",
        why: "das Brot — im Nominativ bleibt der Artikel gleich.",
        hint: "Welcher Artikel gehört zu Brot?",
        hintEn: "Which article goes with Brot?",
      },
      { type: "wort", front: "die Tüte", back: "the bag", hint: "An der Kasse: „Brauchen Sie eine?“" },
      {
        type: "satz",
        chips: ["Ich", "hätte", "gern", "ein", "Brot"],
        answer: ["Ich", "hätte", "gern", "ein", "Brot"],
        why: "„Ich hätte gern …“ ist der höfliche Satz für jede Theke.",
        hint: "Fang mit „Ich“ an.",
        hintEn: "Start with „Ich“.",
      },
    ],
  },
  {
    id: "termin",
    icon: "📅",
    title: "Einen Termin machen",
    level: "A2",
    minutes: 3,
    claims: ["Du machst am Telefon einen Termin aus.", "Du nennst Datum und Uhrzeit."],
    postcard: { city: "Berlin", fact: "In Berlin gibt es mehr als 170 Museen." },
    tasks: [
      { type: "wort", front: "der Termin", back: "the appointment", hint: "Beim Arzt, beim Amt, beim Friseur." },
      {
        type: "luecke",
        before: "Ich hätte gern einen Termin",
        after: "Dienstag.",
        options: ["am", "im", "um"],
        answer: "am",
        why: "Wochentage bekommen am: am Dienstag, am Wochenende.",
        hint: "Bei Tagen sagt man: … Montag.",
        hintEn: "For days of the week: … Montag.",
      },
      { type: "artikel", noun: "Uhrzeit", answer: "die", back: "the time (of day)", hint: "Denk an die Endung: -zeit.", hintEn: "Think of the ending: -zeit." },
      {
        type: "luecke",
        before: "Passt es Ihnen",
        after: "zehn Uhr?",
        options: ["um", "am", "in"],
        answer: "um",
        why: "Uhrzeiten bekommen um: um zehn, um halb drei.",
        hint: "Bei Uhrzeiten: … acht Uhr.",
        hintEn: "For clock times: … acht Uhr.",
      },
      {
        type: "satz",
        chips: ["Kann", "ich", "den", "Termin", "verschieben"],
        answer: ["Kann", "ich", "den", "Termin", "verschieben"],
        why: "Modalverb vorn, Infinitiv ans Ende — die Klammer.",
        hint: "Eine Frage: das Verb zuerst.",
        hintEn: "A question: the verb first.",
      },
    ],
  },
];

