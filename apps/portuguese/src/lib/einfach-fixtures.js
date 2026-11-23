/* /passo-a-passo — the prototype's three hand-written sittings, kept as test fixtures.
 *
 * Einfach lernen now plays the curated path (src/data/einfach-pfad.json, resolved by
 * src/lib/einfach-content.js). These three stay because they exercise word, article, gap and
 * build tasks with known answers and need no data build: open /passo-a-passo?fixtures to play
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
    postcard: { city: "Lisboa", fact: "Lisbon is the capital and the largest city of Portugal." },
    tasks: [
      { type: "wort", front: "a paragem", plural: "as paragens", back: "the (bus) stop", hint: "You wait for the bus here." },
      { type: "artikel", noun: "estação", answer: "a", back: "station", hint: "Look at the ending: -ção.", why: "Words in -ção take a: a estação." },
      {
        type: "luecke",
        before: "Desculpe, como vou",
        after: "estação?",
        options: ["à", "ao", "a o"],
        answer: "à",
        why: "a + a estação → à estação. A joins with a; with o it becomes ao.",
        hint: "Estação takes a.",
      },
      { type: "wort", front: "sempre em frente", back: "straight ahead", hint: "Not left, not right." },
      {
        type: "satz",
        chips: ["Siga", "sempre", "em", "frente"],
        answer: ["Siga", "sempre", "em", "frente"],
        end: ".",
        why: "Siga is a polite instruction (o senhor, a senhora), and it comes first.",
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
    postcard: { city: "Porto", fact: "Porto is the city that gave Portugal its name." },
    tasks: [
      { type: "wort", front: "a caixa", plural: "as caixas", back: "the checkout", hint: "You pay here." },
      { type: "artikel", noun: "pão", answer: "o", back: "bread", hint: "The ending doesn't help here. Take a guess.", why: "We say: o pão." },
      {
        type: "luecke",
        before: "Quanto custa",
        after: "pão?",
        options: ["o", "a", "os"],
        answer: "o",
        why: "o pão: one thing, masculine.",
        hint: "You just saw this word.",
      },
      { type: "wort", front: "o saco", plural: "os sacos", back: "the bag", hint: "At the checkout: Quer um saco?" },
      {
        type: "satz",
        chips: ["Queria", "um", "pão", "de", "centeio"],
        answer: ["Queria", "um", "pão", "de", "centeio"],
        end: ".",
        why: "Queria … is the polite way to ask at any counter.",
        hint: "Start with the verb: Queria.",
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
    postcard: { city: "Coimbra", fact: "Coimbra has one of the oldest universities in Europe." },
    tasks: [
      { type: "wort", front: "a consulta", plural: "as consultas", back: "the appointment", hint: "At the doctor's, at the centro de saúde." },
      {
        type: "luecke",
        before: "Queria marcar uma consulta",
        after: "terça-feira.",
        options: ["para", "por", "em"],
        answer: "para",
        why: "para + a day: the day you want the appointment for.",
        hint: "The day you want it for.",
      },
      { type: "artikel", noun: "hora", answer: "a", back: "hour; time of an appointment", hint: "Look at the last letter.", why: "We say: a hora." },
      {
        type: "luecke",
        before: "Pode ser",
        after: "dez horas?",
        options: ["às", "em", "de"],
        answer: "às",
        why: "Clock times take às: às dez horas.",
        hint: "You say this for clock times.",
      },
      {
        type: "satz",
        chips: ["Posso", "mudar", "a", "consulta"],
        answer: ["Posso", "mudar", "a", "consulta"],
        end: "?",
        why: "Posso + infinitive: Posso mudar …?",
        hint: "Start with the verb: Posso …",
      },
    ],
  },
];
