// "The Legend of Brambleford" (/games/brambleford; internal id: lindenau): who stands where and
// what they say. One quest per person, A1, everyday situations in a British market town.
// The English is the content (npc / de); `en` is the simpler plain-English "Help" line.
// (The key `de` is historical: it holds the English line the learner reads and builds.)
//
// A dialogue is a list of turns. Each turn is one line from the person, optionally followed
// by a task for the learner:
//   choose  three replies, exactly one `ok`; every wrong one carries `why` (what was off)
//   build   tap the words into order; `extra` are distractor tiles; `alts` other orders
//           that are just as right. Tiles carry their punctuation.
//   say     a build task the learner may also speak (game.js, taskSay): "Speak" is
//           scored by the pronunciation check's service, "Type instead" plays it as build.
//           At most one per quest.
// The line after a task is the person's reaction to it, so the talk reads as one talk.
// `outro` closes the quest; `item` is what the learner walks away with; `words` are extra
// nouns for the monsters in the action levels (English nouns have no capital letter, so
// game.js cannot pick them out of the sentences).
// No straight double quotes in any text (scripts/check-lindenau.mjs): use “ ”.
//
// The town comes in areas (AREAS at the end): each has its own map – streets, a square with a
// fountain, buildings (solid; a person stands at the door side), trees – its own Bruno lines
// and three quests. The second area opens once the first is done (game.js).

// --- Brambleford – Morning ------------------------------------------------------------------
const BRUNO_MORGEN = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Market square", x: 560, y: 500, clip: "bruno",
  intro: [
    { npc: "Hello! I'm Bruno. Welcome to Brambleford!", en: "Hi! My name is Bruno. I am happy you are in Brambleford!" },
    { npc: "You're new here. Today you've got three jobs.", en: "You have not been here long. Today you have three things to do." },
    { npc: "Buy a sausage roll at the bakery, get a train ticket at the station and make an appointment at the GP surgery.", en: "Buy a sausage roll in the bakery. Buy a ticket for the train at the station. Ask for a time to see the doctor." },
    { npc: "Go to the people with the exclamation mark and talk to them. Good luck!", en: "Walk to the people with a “!” above them and speak to them. I hope it goes well!" },
  ],
  waiting: (n) => [{ npc: n === 1 ? "One more job. You can do it!" : `${n} more jobs. You can do it!`, en: n === 1 ? "You have one thing left to do. You can do it!" : `You have ${n} things left to do. You can do it!` }],
  done: [
    { npc: "Sausage roll, ticket, appointment – all done! Well done!", en: "You did all three things! Very good!" },
  ],
};

/** Bruno's review before a run, in every area: the sentences missed last time (game.js). */
export const BRUNO_REVIEW = {
  offer: { npc: "Nice to see you again! Shall we do a quick review? A few sentences from last time.", en: "I am happy you came back! Do you want to practise a little? We can do some sentences from before." },
  done: { npc: "Brilliant, that's much better! Now off into town.", en: "Very good, now you know them better! Now go into the town." },
};

const QUESTS_MORGEN = [
  {
    id: "baeckerei", mascot: "hamsti", name: "Hamsti", role: "Bakery",
    x: 300, y: 405, item: { label: "Sausage rolls", icon: "1F950" },
    words: ["coffee", "roll", "pounds"],
    turns: [
      {
        npc: "Good morning! What can I get you?", en: "Good morning! What do you want to buy?",
        task: { type: "choose", options: [
          { de: "Can I have two sausage rolls, please?", ok: true },
          { de: "Give me two sausage rolls.", why: "That sounds rude in English. Ask nicely: “Can I have …, please?” or “I'd like …, please.”" },
          { de: "Where are the sausage rolls?", why: "The sausage rolls are right in front of you. Say what you want to buy." },
        ] },
      },
      {
        npc: "Of course. Anything else?", en: "Yes, I can do that. Do you want something more?",
        task: { type: "say", words: ["I'd", "like", "a", "coffee,", "please."], extra: ["an"],
          why: "“Coffee” starts with a consonant sound, so we say “a coffee”, not “an coffee”." },
      },
      {
        npc: "That's £6.40, please.", en: "That is six pounds and forty pence. Please pay.",
        task: { type: "choose", options: [
          { de: "Here you are. £6.40.", ok: true },
          { de: "Here you are. £4.60.", why: "Listen again: six pounds forty – £6.40." },
          { de: "Thanks, you too!", why: "“You too!” answers a wish like “Have a nice day!”. Here the baker wants your money." },
        ] },
      },
      {
        npc: "Thank you! Have a nice day!", en: "Thanks! I hope your day is good!",
        task: { type: "choose", options: [
          { de: "Thanks, you too!", ok: true },
          { de: "Good night!", why: "It's morning. We say “Good night” before going to bed." },
          { de: "I'm sorry!", why: "“Sorry” is for when something goes wrong. To answer “Have a nice day!” say “Thanks, you too!”." },
        ] },
      },
    ],
    outro: { npc: "Bye, see you soon!", en: "Goodbye! I hope to see you again soon." },
  },
  {
    id: "bahnhof", mascot: "quaki", name: "Quaki", role: "Ticket office", x: 1000, y: 405,
    item: { label: "Train ticket", icon: "1F9FE" },
    words: ["train", "platform", "ticket"],
    turns: [
      {
        npc: "Hello! Where would you like to go?", en: "Hello! Which place do you want to go to?",
        task: { type: "say", words: ["I'd", "like", "a", "ticket", "to", "London,", "please."], extra: ["at"],
          why: "For the place you travel to, we say “to”: a ticket to London." },
      },
      {
        npc: "Single or return?", en: "One way, or there and back?",
        task: { type: "choose", options: [
          { de: "Return, please.", ok: true },
          { de: "I like trains.", why: "Quaki asks which ticket you want: single (one way) or return (there and back)." },
          { de: "By train, please.", why: "You are already at the station. The question is: single or return?" },
        ] },
      },
      {
        npc: "And when would you like to travel?", en: "And at what time do you want to go?",
        task: { type: "choose", options: [
          { de: "Tomorrow at ten o'clock.", ok: true },
          { de: "At the station.", why: "“When?” asks about time, not about place." },
          { de: "Two hours.", why: "“When?” asks for a time. “How long?” is the question for “two hours”." },
        ] },
      },
      {
        npc: "That's £39 for an off-peak return. Your train leaves at 10:05 from platform 3.", en: "The ticket costs 39 pounds. It is cheaper because it is for a quiet time of day. Your train goes at five past ten from platform number 3.",
        task: { type: "choose", options: [
          { de: "Great: platform 3, 10:05. Thank you!", ok: true },
          { de: "Great: platform 10, 3:05. Thank you!", why: "Listen again: platform three, ten oh five." },
          { de: "Great: platform 5, 10:03. Thank you!", why: "Listen again: platform three, ten oh five." },
        ] },
      },
    ],
    outro: { npc: "Have a good trip!", en: "I hope you have a nice journey!" },
  },
  {
    id: "arzt", mascot: "aerztin", moji: "1F469-200D-2695", name: "Dr Prickle", role: "GP surgery", x: 300, y: 555,
    item: { label: "Appointment", icon: "1F4C5" },
    words: ["doctor", "headache", "Thursday"],
    turns: [
      {
        npc: "Good morning, Prickle Surgery. How can I help?", en: "Good morning, this is the doctor's office. What do you need?",
        task: { type: "say", words: ["I", "need", "an", "appointment,", "please."], extra: ["a"],
          why: "“Appointment” starts with a vowel sound, so we say “an appointment”." },
      },
      {
        npc: "Are you registered here?", en: "Are you already a patient at this doctor's?",
        task: { type: "choose", options: [
          { de: "Yes, I'm registered here.", ok: true },
          { de: "Yes, I'm a doctor.", why: "The question is whether you are a patient here (registered). You are not the doctor!" },
          { de: "No, thank you.", why: "“No, thank you” answers an offer. This is a yes / no question: Yes, I am. / No, I'm not." },
        ] },
      },
      {
        npc: "What's the matter?", en: "What is wrong? What hurts?",
        task: { type: "choose", options: [
          { de: "I've got a headache.", ok: true },
          { de: "I'm a headache.", why: "You have a headache, you are not one: “I've got a headache.”" },
          { de: "I'm fine, thank you.", why: "If you are fine, you do not need an appointment. Say what hurts." },
        ] },
      },
      {
        npc: "Can I take your date of birth, please?", en: "What day, month and year were you born?",
        task: { type: "choose", options: [
          { de: "It's the fourth of May, 1990.", ok: true },
          { de: "I'm thirty-five.", why: "She asks for your date of birth (day, month, year), not your age." },
          { de: "It's Thursday.", why: "Your date of birth is the day, month and year you were born, not a day of the week." },
        ] },
      },
      {
        npc: "Thank you. Can you come on Thursday at 10 o'clock?", en: "Thanks. Is Thursday at ten OK for you?",
        task: { type: "choose", options: [
          { de: "Yes, that's fine. See you on Thursday!", ok: true },
          { de: "Yes, I'm fine. See you on Thursday!", why: "“I'm fine” says you feel OK. When a time suits you, say “That's fine.”" },
          { de: "Yes, that's fine. See you yesterday!", why: "Yesterday is in the past. The appointment is on Thursday." },
        ] },
      },
    ],
    outro: { npc: "Great. Get well soon, and see you on Thursday!", en: "Good. I hope you feel better soon. See you on Thursday!" },
  },
];

const MAP_MORGEN = {
  start: { x: 640, y: 660 },
  streets: [{ x: 0, y: 420, w: 1280, h: 120 }, { x: 585, y: 0, w: 110, h: 960 }],
  square: { x: 640, y: 480, r: 160, fountain: 48 },
  rails: { x: 760, y: 40, w: 520, h: 70 },
  buildings: [
    { id: "baeckerei", x: 150, y: 150, w: 300, h: 215, roof: "#c2553d", wall: "#f3e2c7", sign: "Bakery", icon: "1F950", door: "s" },
    { id: "bahnhof", x: 820, y: 130, w: 360, h: 235, roof: "#5f7d8c", wall: "#e7e2d8", sign: "Station", icon: "1F689", door: "s" },
    { id: "arzt", x: 150, y: 595, w: 300, h: 215, roof: "#7d6a5a", wall: "#eef2f4", sign: "GP surgery", icon: "1F3E5", door: "n" },
    { id: "haus1", x: 830, y: 610, w: 150, h: 170, roof: "#b07a3b", wall: "#f1e6d6", door: "n" },
    { id: "haus2", x: 1025, y: 610, w: 150, h: 170, roof: "#8a5a7a", wall: "#f1e6d6", door: "n" },
  ],
  trees: [
    [70, 80], [500, 70], [560, 250], [70, 480], [520, 860], [90, 900], [740, 880], [1230, 470],
    [1220, 880], [1240, 70], [740, 250], [500, 640], [780, 700], [1000, 890],
  ],
};

// --- Brambleford – Afternoon ----------------------------------------------------------------
const BRUNO_NACHMITTAG = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Fountain", x: 860, y: 450, clip: "bruno-nachmittag",
  intro: [
    { npc: "Hello! It's the afternoon in Brambleford now. This is the new part of town.", en: "Hi! Now it is the afternoon in Brambleford. This is the new part of the town." },
    { npc: "You've got three jobs again: do some shopping, meet your neighbour and have a cup of tea at the café.", en: "You have three things to do again: buy things in the shop, say hello to your neighbour and go to the café for tea." },
    { npc: "The people with the exclamation mark are already waiting. See you later!", en: "The people with a “!” are waiting for you. Goodbye for now!" },
  ],
  waiting: BRUNO_MORGEN.waiting,
  done: [
    { npc: "Shopping, neighbour, café – all done! Your English is really good already!", en: "You did all three things! Your English is already very good!" },
  ],
};

const QUESTS_NACHMITTAG = [
  {
    id: "supermarkt", mascot: "quaki", name: "Quaki", role: "Supermarket", x: 310, y: 410,
    item: { label: "Shopping", icon: "1F6D2" },
    words: ["tomatoes", "water", "card"],
    turns: [
      {
        npc: "Hello! Can I help you?", en: "Hello! Do you want something?",
        task: { type: "choose", options: [
          { de: "Yes, please. Have you got any tomatoes?", ok: true },
          { de: "Yes, please. Are you tomatoes?", why: "“Are you …?” asks about a person. To ask if the shop has something, say “Have you got any …?”" },
          { de: "Yes, please. Where is the station?", why: "You are in a supermarket and want to buy something. Ask: “Have you got any …?”" },
        ] },
      },
      {
        npc: "Yes, they're over there, next to the carrots. How many would you like?", en: "Yes, they are at the back, near the carrots. How many do you want?",
        task: { type: "say", words: ["I'll", "take", "a", "kilo", "of", "tomatoes."], extra: ["an", "from"],
          why: "After a quantity we use “of”: a kilo of tomatoes. And it is “a kilo”, not “an kilo”." },
      },
      {
        npc: "Do you need anything else?", en: "Do you want something more?",
        task: { type: "choose", options: [
          { de: "Yes, two bottles of water, please.", ok: true },
          { de: "Yes, two bottle of water, please.", why: "One bottle, two bottles – after “two” we use the plural." },
          { de: "Yes, I don't need.", why: "“Yes” means you need something else. Then say what: “Yes, two bottles of water, please.”" },
        ] },
      },
      {
        npc: "That's £4.80, please.", en: "That is four pounds eighty. Please pay.",
        task: { type: "choose", options: [
          { de: "Can I pay by card?", ok: true },
          { de: "Can I pay by car?", why: "A “card” is the thing you pay with. A “car” is what you drive!" },
          { de: "Can I pay on card?", why: "In English we say “pay by card”. The small word is “by”." },
        ] },
      },
    ],
    outro: { npc: "Yes, of course. Thanks, and have a lovely day!", en: "Yes, that is fine. Thank you, and I hope your day is nice!" },
  },
  {
    id: "nachbarin", mascot: "nachbarin", moji: "1F475", name: "Mrs Linden", role: "Neighbour", x: 290, y: 620,
    item: { label: "Neighbour", icon: "1F44B" },
    words: ["neighbour", "floor", "tea"],
    turns: [
      {
        npc: "Hello! Are you new here?", en: "Hello! Did you come here not long ago?",
        task: { type: "choose", options: [
          { de: "Yes, I moved in yesterday.", ok: true },
          { de: "Yes, I am yesterday.", why: "“I am yesterday” says nothing useful. Say when you moved in: “I moved in yesterday.”" },
          { de: "No, I'm old.", why: "“New here” means you came to live here recently. “Old” does not fit – and you are new!" },
        ] },
      },
      {
        npc: "Welcome! I'm Mrs Linden. Where are you from?", en: "Welcome! My name is Mrs Linden. Which country are you from?",
        task: { type: "say", words: ["I'm", "from", "Spain."], extra: ["of", "in"],
          why: "For the country you come from, we say “from”: I'm from Spain." },
      },
      {
        npc: "Lovely! And what do you do here in Brambleford?", en: "Nice! And what are you doing here in Brambleford?",
        task: { type: "choose", options: [
          { de: "I'm learning English here.", ok: true },
          { de: "I do Brambleford.", why: "Mrs Linden asks about your work or your course, for example: “I'm learning English here.”" },
          { de: "I'm from Brambleford.", why: "You said you are from Spain, and you are new here. Mrs Linden asks what you do here." },
        ] },
      },
      {
        npc: "Great! I live on the first floor. Pop round for a cup of tea any time!", en: "Good! I live one floor up. Come and see me for a cup of tea when you like!",
        task: { type: "choose", options: [
          { de: "Thank you, that's very kind!", ok: true },
          { de: "Thank you, that's very old!", why: "“Old” does not fit here. For a nice offer, say “That's very kind!”" },
          { de: "You're welcome!", why: "“You're welcome” is what you say when someone thanks you. Here you say thanks: “Thank you, that's very kind!”" },
        ] },
      },
    ],
    outro: { npc: "My pleasure! Here's to good neighbours!", en: "You are welcome! I hope we will be good neighbours." },
  },
  {
    id: "cafe", mascot: "hamsti", name: "Hamsti", role: "Café", x: 1140, y: 410,
    item: { label: "Cake", icon: "1F370" },
    words: ["tea", "cake", "slice"],
    turns: [
      {
        npc: "Hello! What would you like to drink?", en: "Hello! What drink do you want?",
        task: { type: "choose", options: [
          { de: "A cup of tea, please.", ok: true },
          { de: "By the window, please.", why: "Hamsti asks what you want to drink, not where you want to sit." },
          { de: "A slice of cake, please.", why: "Hamsti asks about a drink. Cake is food – you eat it." },
        ] },
      },
      {
        npc: "Of course. Would you like something to eat too?", en: "Yes. Do you also want something to eat?",
        task: { type: "say", words: ["Yes,", "a", "slice", "of", "carrot", "cake,", "please."], extra: ["an", "some"],
          why: "Say “a slice of carrot cake”: “slice” starts with a consonant sound, so it is “a”, not “an”." },
      },
      {
        npc: "How is your cake?", en: "Do you like your cake?",
        task: { type: "choose", options: [
          { de: "It's lovely, thank you! Can I pay, please?", ok: true },
          { de: "No, it's lovely!", why: "“No” means you do not like it, but “lovely” means you like it very much." },
          { de: "It's lovely, thank you! Can I eat, please?", why: "You have already eaten. Now you want to pay: “Can I pay, please?”" },
        ] },
      },
      {
        npc: "That's £7.50, please.", en: "That is seven pounds fifty. Please pay.",
        task: { type: "choose", options: [
          { de: "Here's eight pounds. Keep the change!", ok: true },
          { de: "Here's seven pounds. Keep the change!", why: "Seven pounds is too little. It costs seven pounds fifty." },
          { de: "Here's eight pounds. Get well soon!", why: "“Get well soon” is for people who are ill. When you give a little extra, say “Keep the change!”" },
        ] },
      },
    ],
    outro: { npc: "Oh, thank you very much! Have a lovely afternoon!", en: "Oh, thanks a lot! I hope your afternoon is nice!" },
  },
];

const MAP_NACHMITTAG = {
  start: { x: 700, y: 515 },
  streets: [{ x: 0, y: 460, w: 1280, h: 110 }, { x: 880, y: 0, w: 110, h: 960 }],
  square: { x: 935, y: 515, r: 130, fountain: 40 },
  rails: null,
  buildings: [
    { id: "supermarkt", x: 120, y: 140, w: 380, h: 230, roof: "#4f7a5a", wall: "#eef3ea", sign: "Supermarket", icon: "1F6D2", door: "s" },
    { id: "cafe", x: 1030, y: 160, w: 220, h: 210, roof: "#a0522d", wall: "#f6ead8", sign: "Café", icon: "2615", door: "s" },
    { id: "wohnhaus", x: 140, y: 660, w: 300, h: 220, roof: "#6a6f8a", wall: "#f1e6d6", sign: "Flats", icon: "1F3E0", door: "n" },
    { id: "haus3", x: 520, y: 680, w: 150, h: 170, roof: "#b07a3b", wall: "#f1e6d6", door: "n" },
    { id: "haus4", x: 1040, y: 670, w: 170, h: 180, roof: "#8a5a7a", wall: "#f1e6d6", door: "n" },
  ],
  trees: [
    [60, 70], [560, 90], [640, 300], [780, 150], [60, 420], [560, 400], [740, 640], [800, 880],
    [480, 900], [60, 900], [1240, 440], [1240, 900], [1000, 900], [1240, 60],
  ],
};

/** The parts of town, in the order they open. */
export const AREAS = [
  { id: "morgen", title: "Brambleford – Morning", bruno: BRUNO_MORGEN, quests: QUESTS_MORGEN, ...MAP_MORGEN },
  { id: "nachmittag", title: "Brambleford – Afternoon", bruno: BRUNO_NACHMITTAG, quests: QUESTS_NACHMITTAG, ...MAP_NACHMITTAG },
];
export const areaById = (id) => AREAS.find((a) => a.id === id) ?? AREAS[0];

/** What the shop people say when the learner comes too early or comes back. */
export const NOT_YET = { npc: "Hello! Please talk to Bruno at the fountain first.", en: "Hi! First, go and speak to Bruno near the fountain." };
export const AGAIN = { npc: "Nice to see you again!", en: "I am happy to see you again!" };

/** Graded tasks in an area, for the result line. */
export const taskCount = (area) => area.quests.reduce((n, q) => n + q.turns.filter((t) => t.task).length, 0);

// --- audio ---------------------------------------------------------------------------------
// Every line has its own clip in public/audio/lindenau/ (scripts/generate-lindenau-audio.mjs):
//   <quest>-<turn>-npc.mp3   what the person says in that turn
//   <quest>-<turn>-du.mp3    the right reply (the sentence to build, or the right choice)
//   <quest>-outro-npc.mp3, <quest>-notyet-npc.mp3, <quest>-again-npc.mp3
//   <bruno>-intro-<i>-npc.mp3, <bruno>-done-<i>-npc.mp3, where <bruno> is the area's
//   `bruno.clip` ("bruno" in the first area, "bruno-nachmittag" in the second)
//   bruno-waiting-<n>-npc.mp3, bruno-review-offer-npc.mp3, bruno-review-done-npc.mp3
// There are no clips for the English text yet (the folder does not exist): until they are
// generated, spielKit's voice falls back to the browser's British voice for every line.
// One voice per mascot (British English); the learner's replies in one more voice (`du`).
export const VOICES = {
  bruno: "en-GB-RyanNeural",
  hamsti: "en-GB-SoniaNeural",
  quaki: "en-GB-ThomasNeural",
  // Regi is the player now (Super-Blubb); the doctor and the neighbour kept their own voices.
  aerztin: "en-GB-LibbyNeural",
  nachbarin: "en-GB-AbbiNeural",
  du: "en-GB-OliviaNeural",
};
export const clipPath = (clip) => `/audio/lindenau/${clip}.mp3`;

/** The right reply of a turn, as a sentence. */
export const solutionOf = (task) => (task.type === "choose" ? task.options.find((o) => o.ok).de : task.words.join(" "));

/** Every clip: { clip, text, voice }. The game looks lines up by the same names. */
export function allClips() {
  const out = [];
  const add = (clip, text, who) => out.push({ clip, text, voice: VOICES[who] });
  for (const n of [1, 2, 3]) add(`bruno-waiting-${n}-npc`, BRUNO_MORGEN.waiting(n)[0].npc, "bruno");
  add("bruno-review-offer-npc", BRUNO_REVIEW.offer.npc, "bruno");
  add("bruno-review-done-npc", BRUNO_REVIEW.done.npc, "bruno");
  for (const { bruno: b } of AREAS) {
    b.intro.forEach((l, i) => add(`${b.clip}-intro-${i}-npc`, l.npc, "bruno"));
    b.done.forEach((l, i) => add(`${b.clip}-done-${i}-npc`, l.npc, "bruno"));
  }
  for (const q of AREAS.flatMap((a) => a.quests)) {
    q.turns.forEach((t, i) => {
      add(`${q.id}-${i}-npc`, t.npc, q.mascot);
      if (t.task) add(`${q.id}-${i}-du`, solutionOf(t.task), "du");
    });
    add(`${q.id}-outro-npc`, q.outro.npc, q.mascot);
    add(`${q.id}-notyet-npc`, NOT_YET.npc, q.mascot);
    add(`${q.id}-again-npc`, AGAIN.npc, q.mascot);
  }
  return out;
}
