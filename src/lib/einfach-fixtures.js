/* /step-by-step — the prototype's three hand-written sittings, kept as test fixtures.
 *
 * Einfach lernen now plays the curated path (src/data/einfach-pfad.json, resolved by
 * src/lib/einfach-content.js). These three stay because they exercise word, article, gap and
 * build tasks with known answers and need no data build: open /step-by-step?fixtures to play
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
    postcard: { city: "Madrid", fact: "Madrid is the largest city in Spain." },
    tasks: [
      { type: "wort", front: "la parada", plural: "las paradas", back: "the (bus) stop", hint: "You wait for the bus here." },
      { type: "artikel", noun: "estación", answer: "la", back: "station", hint: "Look at the ending: -ción.", why: "Words in -ción take la: la estación." },
      {
        type: "luecke",
        before: "Perdone, ¿cómo llego",
        after: "estación?",
        options: ["a la", "al", "a el"],
        answer: "a la",
        why: "la estación → a la estación. Only a + el joins: al.",
        hint: "Estación takes la.",
      },
      { type: "wort", front: "todo recto", back: "straight ahead", hint: "Not left, not right." },
      {
        type: "satz",
        chips: ["Siga", "todo", "recto"],
        answer: ["Siga", "todo", "recto"],
        end: ".",
        why: "Siga is a polite instruction (usted), and it comes first.",
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
    postcard: { city: "Valencia", fact: "Valencia is the home of paella." },
    tasks: [
      { type: "wort", front: "la caja", plural: "las cajas", back: "the checkout", hint: "You pay here." },
      { type: "artikel", noun: "pan", answer: "el", back: "bread", hint: "The ending doesn't help here. Take a guess.", why: "We say: el pan." },
      {
        type: "luecke",
        before: "¿Cuánto cuesta",
        after: "pan?",
        options: ["el", "la", "los"],
        answer: "el",
        why: "el pan: one thing, masculine.",
        hint: "You just saw this word.",
      },
      { type: "wort", front: "la bolsa", plural: "las bolsas", back: "the bag", hint: "At the checkout: «¿Quiere una?»" },
      {
        type: "satz",
        chips: ["Quería", "una", "barra", "de", "pan"],
        answer: ["Quería", "una", "barra", "de", "pan"],
        end: ".",
        why: "Quería … is the polite way to ask at any counter.",
        hint: "Start with the verb: Quería.",
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
    postcard: { city: "Sevilla", fact: "The Giralda tower in Sevilla was once a minaret." },
    tasks: [
      { type: "wort", front: "la cita", plural: "las citas", back: "the appointment", hint: "At the doctor's, at the town hall." },
      {
        type: "luecke",
        before: "Quería una cita",
        after: "martes.",
        options: ["el", "en", "a"],
        answer: "el",
        why: "Days take el, with no preposition: el martes.",
        hint: "You say this for days of the week.",
      },
      { type: "artikel", noun: "hora", answer: "la", back: "hour; time of an appointment", hint: "Look at the last letter.", why: "We say: la hora." },
      {
        type: "luecke",
        before: "¿Le va bien",
        after: "las diez?",
        options: ["a", "en", "de"],
        answer: "a",
        why: "Clock times take a: a las diez.",
        hint: "You say this for clock times.",
      },
      {
        type: "satz",
        chips: ["¿Puedo", "cambiar", "la", "cita"],
        answer: ["¿Puedo", "cambiar", "la", "cita"],
        end: "?",
        why: "Puedo + infinitive: ¿Puedo cambiar …?",
        hint: "Start with the verb: ¿Puedo …",
      },
    ],
  },
];
