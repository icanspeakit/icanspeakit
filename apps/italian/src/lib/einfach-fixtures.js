/* /passo-passo — the prototype's three hand-written sittings, kept as test fixtures.
 *
 * Einfach lernen now plays the curated path (src/data/einfach-pfad.json, resolved by
 * src/lib/einfach-content.js). These three stay because they exercise word, article, gap and
 * build tasks with known answers and need no data build: open /passo-passo?fixtures to play
 * them instead of the path. Not shown to learners otherwise.
 */

/* ---------------------------------------------------------------- content

   Three sittings. Each is five tasks and claims one or two can-do lines — the
   capability line the learner is shown at the end. The sitting is the unit the
   whole prototype is built around: it is small enough to name ("5 tasks ·
   2 minutes") and finishing one always buys something specific.
*/

export const FIXTURES = [
  {
    id: "weg",
    icon: "🧭",
    title: "Ask the way",
    level: "A1",
    minutes: 2,
    claims: ["You ask the way in the street.", "You understand short directions."],
    postcard: { city: "Roma", fact: "Rome has been the capital of Italy since 1871." },
    tasks: [
      { type: "wort", front: "la fermata", plural: "le fermate", back: "the (bus) stop", hint: "You wait for the bus here." },
      { type: "artikel", noun: "stazione", answer: "la", options: ["il", "la"], back: "station", hint: "Look at the ending: -zione.", why: "Words in -zione take la: la stazione." },
      {
        type: "luecke",
        before: "Scusi, come arrivo",
        after: "stazione?",
        options: ["alla", "al", "allo"],
        answer: "alla",
        why: "la stazione → alla stazione. a + la joins: alla.",
        hint: "Stazione takes la.",
      },
      { type: "wort", front: "sempre dritto", back: "straight ahead", hint: "Not left, not right." },
      {
        type: "satz",
        chips: ["Vada", "sempre", "dritto"],
        answer: ["Vada", "sempre", "dritto"],
        end: ".",
        why: "Vada is a polite instruction (Lei), and it comes first.",
        hint: "The verb comes first.",
      },
    ],
  },
  {
    id: "einkauf",
    icon: "🛒",
    title: "Go shopping",
    level: "A1",
    minutes: 2,
    claims: ["You buy things and ask the price."],
    postcard: { city: "Napoli", fact: "The Neapolitan pizza maker's craft is on UNESCO's heritage list." },
    tasks: [
      { type: "wort", front: "la cassa", plural: "le casse", back: "the checkout", hint: "You pay here." },
      { type: "artikel", noun: "pane", answer: "il", options: ["il", "la"], back: "bread", hint: "The ending doesn't help here. Take a guess.", why: "We say: il pane." },
      {
        type: "luecke",
        before: "Quanto costa",
        after: "pane?",
        options: ["il", "la", "i"],
        answer: "il",
        why: "il pane: one thing, masculine.",
        hint: "You just saw this word.",
      },
      { type: "wort", front: "il sacchetto", plural: "i sacchetti", back: "the (small) bag", hint: "At the checkout: «Vuole un sacchetto?»" },
      {
        type: "satz",
        chips: ["Vorrei", "un", "chilo", "di", "pane"],
        answer: ["Vorrei", "un", "chilo", "di", "pane"],
        end: ".",
        why: "Vorrei … is the polite way to ask at any counter.",
        hint: "Start with the verb: Vorrei.",
      },
    ],
  },
  {
    id: "termin",
    icon: "📅",
    title: "Make an appointment",
    level: "A2",
    minutes: 3,
    claims: ["You make an appointment on the phone.", "You say the day and the time."],
    postcard: { city: "Firenze", fact: "The dome of Florence cathedral was finished in 1436." },
    tasks: [
      { type: "wort", front: "l'appuntamento", plural: "gli appuntamenti", back: "the appointment", hint: "At the doctor's, at the town hall." },
      {
        type: "luecke",
        before: "Vorrei un appuntamento",
        after: "martedì.",
        options: ["per", "a", "con"],
        answer: "per",
        why: "You book something for a day: un appuntamento per martedì.",
        hint: "Think “for Tuesday”.",
      },
      { type: "artikel", noun: "ora", answer: "l'", options: ["l'", "il", "la"], back: "hour; time of an appointment", hint: "Say it aloud. Listen to the first sound.", why: "We say: l'ora. The word is feminine (le ore); l' hides that." },
      {
        type: "luecke",
        before: "Le va bene",
        after: "dieci?",
        options: ["alle", "a", "di"],
        answer: "alle",
        why: "Clock times take alle: alle dieci. (Only one o'clock is all'una.)",
        hint: "You say this for clock times.",
      },
      {
        type: "satz",
        chips: ["Posso", "cambiare", "l'appuntamento"],
        answer: ["Posso", "cambiare", "l'appuntamento"],
        end: "?",
        why: "Posso + infinitive: Posso cambiare …?",
        hint: "Start with the verb: Posso …",
      },
    ],
  },
];
