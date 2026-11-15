/* /pas-a-pas — the prototype's three hand-written sittings, kept as test fixtures.
 *
 * Einfach lernen now plays the curated path (src/data/einfach-pfad.json, resolved by
 * src/lib/einfach-content.js). These three stay because they exercise word, article, gap and
 * build tasks with known answers and need no data build: open /pas-a-pas?fixtures to play
 * them instead of the path. Not shown to learners otherwise.
 *
 * French, like the path: both article screens (le / la for a noun that starts with a consonant,
 * un / une for one that elides to l'), an answer with an apostrophe, and build sentences that
 * end in "." and in " ?" with French spacing.
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
    postcard: { city: "Strasbourg", fact: "The European Parliament meets in Strasbourg." },
    tasks: [
      { type: "wort", front: "l'arrêt de bus", plural: "les arrêts de bus", back: "the bus stop", hint: "You wait for the bus here." },
      {
        type: "artikel",
        noun: "gare",
        answer: "la",
        options: ["le", "la"],
        back: "station",
        hint: "The ending doesn't help here. Take a guess.",
        why: "We say: la gare.",
      },
      {
        type: "luecke",
        before: "Pardon, pour aller",
        after: "gare, s'il vous plaît ?",
        options: ["à la", "au", "à le"],
        answer: "à la",
        why: "la gare → à la gare. Only à + le joins: au.",
        hint: "Gare takes la.",
      },
      { type: "wort", front: "tout droit", back: "straight ahead", hint: "Not left, not right." },
      {
        type: "satz",
        chips: ["Allez", "tout", "droit"],
        answer: ["Allez", "tout", "droit"],
        end: ".",
        why: "Allez is a polite instruction (vous), and it comes first.",
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
    postcard: { city: "Lyon", fact: "Lyon is famous for its food." },
    tasks: [
      { type: "wort", front: "la caisse", plural: "les caisses", back: "the checkout", hint: "You pay here." },
      {
        type: "artikel",
        noun: "épicerie",
        answer: "une",
        options: ["un", "une"],
        back: "small grocery shop",
        hint: "L' hides the gender. Un or une?",
        why: "We say: une épicerie (and l'épicerie).",
      },
      {
        type: "luecke",
        before: "Combien coûte",
        after: "pain ?",
        options: ["le", "la", "les"],
        answer: "le",
        why: "le pain: one thing, masculine.",
        hint: "Pain is masculine.",
      },
      { type: "wort", front: "le sac", plural: "les sacs", back: "the bag", hint: "At the checkout: « Vous voulez un sac ? »" },
      {
        type: "satz",
        chips: ["Je", "voudrais", "une", "baguette"],
        answer: ["Je", "voudrais", "une", "baguette"],
        end: ".",
        why: "Je voudrais … is the polite way to ask at any counter.",
        hint: "Start with: Je voudrais.",
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
    postcard: { city: "Bordeaux", fact: "Bordeaux is famous for its wine." },
    tasks: [
      { type: "wort", front: "le rendez-vous", plural: "les rendez-vous", back: "the appointment", hint: "At the doctor's, at the préfecture." },
      {
        type: "luecke",
        before: "Je voudrais un rendez-vous",
        after: "mardi.",
        options: ["pour", "à", "en"],
        answer: "pour",
        why: "An appointment for a day: un rendez-vous pour mardi.",
        hint: "Which day is it for?",
      },
      {
        type: "artikel",
        noun: "heure",
        answer: "une",
        options: ["un", "une"],
        back: "hour; time",
        hint: "L' hides the gender. Un or une?",
        why: "We say: une heure (and l'heure).",
      },
      {
        type: "luecke",
        before: "Ça vous va",
        after: "dix heures ?",
        options: ["à", "en", "de"],
        answer: "à",
        why: "Clock times take à: à dix heures.",
        hint: "You say this for clock times.",
      },
      {
        type: "satz",
        chips: ["Je", "peux", "changer", "le", "rendez-vous"],
        answer: ["Je", "peux", "changer", "le", "rendez-vous"],
        end: "?",
        why: "Je peux + infinitive: Je peux changer … ? In speech, the voice going up makes it a question.",
        hint: "Start with: Je peux …",
      },
    ],
  },
];
