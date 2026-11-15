// "The Legend of Casalbruno" (/games/casalbruno; internal id: lindenau): who stands where and what
// they say. One quest per person, A1, everyday errands in Casalbruno, an invented Italian town.
// The Italian is the content (npc / de); `en` is its English meaning, the 💡 Help line. (The key
// `de` is historical: it holds the Italian line the learner reads and builds.)
//
// The player's gender is unknown, so nothing the player says, and nothing said to the player, is
// gendered: no benvenuto/a, stanco/a, sono arrivato/a. The baker, the station, the ASL, the
// supermarket and the bar use Lei, as people do with strangers, and the player follows them;
// the neighbour and Bruno use tu.
//
// A dialogue is a list of turns. Each turn is one line from the person, optionally followed
// by a task for the learner:
//   choose  three replies, exactly one `ok`; every wrong one carries `why` (what was off, English)
//   build   tap the words into order; `extra` are distractor tiles; `alts` other orders
//           that are just as right. Tiles carry their punctuation.
//   say     a build task the learner may also speak (game.js, taskSay): "Speak" is
//           scored by the pronunciation check's service, "Type instead" plays it as build.
//           At most one per quest.
// The line after a task is the person's reaction to it, so the talk reads as one talk.
// `outro` closes the quest; `item` is what the learner walks away with (il / lo / la / l' + noun);
// `words` are extra nouns for the monsters in the action levels, with their article, so the levels
// practise the gender too (game.js cannot pick lowercase nouns out of the sentences).
// No straight double quotes in any text (scripts/check-lindenau.mjs): use “ ”.
//
// The town comes in areas (AREAS at the end): each has its own map – streets, a square with a
// fountain, buildings (solid; a person stands at the door side), trees – its own Bruno lines
// and three quests. The second area opens once the first is done (game.js).

/** All lines are standard Italian (italiano standard). */
export const VARIETY = "it-IT";

// --- Casalbruno – Morning -------------------------------------------------------------------
const BRUNO_MORGEN = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Piazza", x: 560, y: 500, clip: "bruno",
  intro: [
    { npc: "Ciao! Sono Bruno. Ti accolgo a Casalbruno, la mia città!", en: "Hi! I'm Bruno. Welcome to Casalbruno!" },
    { npc: "Sei qui da poco. Oggi hai tre cose da fare.", en: "You've only just arrived. You have three jobs today." },
    { npc: "Compra il pane alla panetteria, un biglietto alla stazione e prendi un appuntamento all'ASL.", en: "Buy bread at the bakery and a ticket at the station, and make an appointment at the ASL (the local health office)." },
    { npc: "Cerca le persone con il punto esclamativo e parla con loro. Buona fortuna!", en: "Look for the people with an exclamation mark and talk to them. Good luck!" },
  ],
  waiting: (n) => [{ npc: n === 1 ? "Ti resta una cosa da fare. Ce la fai!" : `Ti restano ${n} cose da fare. Ce la fai!`, en: n === 1 ? "You have one job left. You can do it!" : `You have ${n} jobs left. You can do it!` }],
  done: [
    { npc: "Pane, biglietto e appuntamento: tutto fatto! Molto bene!", en: "Bread, ticket and appointment: all done! Very good!" },
  ],
};

/** Bruno's review before a run, in every area: the sentences missed last time (game.js). */
export const BRUNO_REVIEW = {
  offer: { npc: "Che bello rivederti! Ripassiamo un po'? Qualche frase dell'ultima volta.", en: "How nice to see you again! Shall we review a little? A few sentences from last time." },
  done: { npc: "Molto bene, adesso va molto meglio! Andiamo in città.", en: "Very good, much better now! Let's go into town." },
};

const QUESTS_MORGEN = [
  {
    id: "baeckerei", mascot: "hamsti", name: "Marco", role: "Panetteria",
    x: 300, y: 405, item: { label: "il pane", icon: "1F950" },
    words: ["il panino", "la focaccia", "l'euro"],
    turns: [
      {
        npc: "Buongiorno! Mi dica.", en: "Good morning! How can I help you? (literally: tell me)",
        task: { type: "choose", options: [
          { de: "Vorrei due panini, per favore.", ok: true },
          { de: "Ho due panini, per favore.", why: "“Ho” means “I have”. To order politely, say “Vorrei …, per favore” (I would like …, please)." },
          { de: "Voglio due panini.", why: "“Voglio” (I want) sounds too direct in a shop. Say “Vorrei …, per favore”." },
        ] },
      },
      {
        npc: "Va bene. Altro?", en: "All right. Anything else?",
        task: { type: "say", words: ["Anche", "un", "pezzo", "di", "focaccia,", "per", "favore."], extra: ["una"],
          why: "“Pezzo” (piece) is masculine, so it's “un pezzo”, even though “focaccia” is feminine." },
      },
      {
        npc: "Sono tre euro e quaranta.", en: "That's three euros forty.",
        task: { type: "choose", options: [
          { de: "Ecco, tre euro e quaranta.", ok: true },
          { de: "Ecco, tredici euro e quaranta.", why: "Listen again: “tre” is 3, “tredici” is 13. It's €3.40." },
          { de: "Grazie, altrettanto.", why: "“Altrettanto” (the same to you) answers a good wish. Here the baker is waiting for your money." },
        ] },
      },
      {
        npc: "Grazie! Buona giornata!", en: "Thanks! Have a nice day!",
        task: { type: "choose", options: [
          { de: "Grazie, altrettanto!", ok: true },
          { de: "Buonanotte!", why: "It's morning. “Buonanotte” is for the night, when people go to bed." },
          { de: "Mi dispiace!", why: "“Mi dispiace” (I'm sorry) is for when something goes wrong. To answer a good wish, say “Grazie, altrettanto!”." },
        ] },
      },
    ],
    outro: { npc: "Arrivederci!", en: "Goodbye!" },
  },
  {
    id: "bahnhof", mascot: "quaki", name: "Chiara", role: "Stazione", x: 1000, y: 405,
    item: { label: "il biglietto", icon: "1F9FE" },
    words: ["il treno", "il binario", "la stazione"],
    turns: [
      {
        npc: "Buongiorno. Dove va?", en: "Good morning. Where are you going?",
        task: { type: "say", words: ["Vorrei", "un", "biglietto", "per", "Bologna,", "per", "favore."], extra: ["a"],
          why: "A ticket to a place is “per”: un biglietto per Bologna." },
      },
      {
        npc: "Solo andata o andata e ritorno?", en: "One way, or return?",
        task: { type: "choose", options: [
          { de: "Andata e ritorno, per favore.", ok: true },
          { de: "Mi piacciono i treni.", why: "The question is which ticket you want: “solo andata” (one way) or “andata e ritorno” (return)." },
          { de: "In treno, per favore.", why: "You're already at the station. The question is: “solo andata” or “andata e ritorno”?" },
        ] },
      },
      {
        npc: "E quando vuole partire?", en: "And when would you like to leave?",
        task: { type: "choose", options: [
          { de: "Domani alle dieci.", ok: true },
          { de: "In stazione.", why: "“Quando?” asks about time. “In stazione” answers “Dove?” (where)." },
          { de: "Due ore.", why: "“Quando?” asks when. “Due ore” answers “Quanto tempo?” (how long)." },
        ] },
      },
      {
        npc: "Sono trentanove euro. Il treno parte alle dieci e cinque dal binario tre.", en: "That's thirty-nine euros. The train leaves at five past ten from platform three.",
        task: { type: "choose", options: [
          { de: "Va bene: binario tre, alle dieci e cinque. Grazie!", ok: true },
          { de: "Va bene: binario dieci, alle tre e cinque. Grazie!", why: "Listen again: “binario tre”, “alle dieci e cinque”." },
          { de: "Va bene: binario cinque, alle tre e dieci. Grazie!", why: "Listen again: “binario tre”, “alle dieci e cinque”." },
        ] },
      },
    ],
    outro: { npc: "Buon viaggio!", en: "Have a good trip!" },
  },
  {
    id: "arzt", mascot: "aerztin", moji: "1F469-200D-2695", name: "Elena", role: "ASL", x: 300, y: 555,
    item: { label: "l'appuntamento", icon: "1F4C5" },
    words: ["il medico", "la testa", "l'orario"],
    turns: [
      {
        npc: "Buongiorno. Come posso aiutarla?", en: "Good morning. How can I help you?",
        task: { type: "say", words: ["Vorrei", "un", "appuntamento", "con", "il", "medico,", "per", "favore."], extra: ["lo"],
          why: "“Medico” takes “il”: il medico. “Lo” is only for nouns starting with z, s + consonant, gn, ps, x or y (lo zaino, lo studente)." },
      },
      {
        npc: "Ha la tessera sanitaria?", en: "Do you have your health card?",
        task: { type: "choose", options: [
          { de: "Sì, ecco la tessera.", ok: true },
          { de: "Sì, sono medico.", why: "She's asking about your “tessera sanitaria”, the card you show at the ASL. You're not the doctor!" },
          { de: "No, grazie.", why: "“No, grazie” answers an offer. If you don't have the card with you, say “No, non ce l'ho”." },
        ] },
      },
      {
        npc: "Che problema ha?", en: "What's the problem?",
        task: { type: "choose", options: [
          { de: "Ho mal di testa.", ok: true },
          { de: "Ho la testa.", why: "That only says “I have the head”. To say what hurts, use “Ho mal di …” (or “Mi fa male …”)." },
          { de: "Sto bene, grazie.", why: "If you're fine, you don't need an appointment. Say what hurts: “Ho mal di …”." },
        ] },
      },
      {
        npc: "La sua data di nascita, per favore?", en: "Your date of birth, please?",
        task: { type: "choose", options: [
          { de: "Il 4 maggio 1990.", ok: true },
          { de: "Ho 36 anni.", why: "She's asking for your date of birth (day, month, year), not your age." },
          { de: "Oggi è giovedì.", why: "Your date of birth is the day, month and year you were born, not a day of the week." },
        ] },
      },
      {
        npc: "Grazie. Può venire giovedì alle dieci?", en: "Thank you. Can you come on Thursday at ten?",
        task: { type: "choose", options: [
          { de: "Sì, va bene. A giovedì!", ok: true },
          { de: "Sì, sto bene. A giovedì!", why: "“Sto bene” says you feel OK. When a time suits you, say “Va bene”." },
          { de: "Sì, va bene. A ieri!", why: "“Ieri” is yesterday. The appointment is on Thursday: “A giovedì!”." },
        ] },
      },
    ],
    outro: { npc: "Molto bene. Buona guarigione, e a giovedì!", en: "Very good. Get well soon, and see you on Thursday!" },
  },
];

const MAP_MORGEN = {
  start: { x: 640, y: 660 },
  streets: [{ x: 0, y: 420, w: 1280, h: 120 }, { x: 585, y: 0, w: 110, h: 960 }],
  square: { x: 640, y: 480, r: 160, fountain: 48 },
  rails: { x: 760, y: 40, w: 520, h: 70 },
  buildings: [
    { id: "baeckerei", x: 150, y: 150, w: 300, h: 215, roof: "#c2553d", wall: "#f3e2c7", sign: "Panetteria", icon: "1F950", door: "s" },
    { id: "bahnhof", x: 820, y: 130, w: 360, h: 235, roof: "#5f7d8c", wall: "#e7e2d8", sign: "Stazione", icon: "1F689", door: "s" },
    { id: "arzt", x: 150, y: 595, w: 300, h: 215, roof: "#7d6a5a", wall: "#eef2f4", sign: "ASL", icon: "1F3E5", door: "n" },
    { id: "haus1", x: 830, y: 610, w: 150, h: 170, roof: "#b07a3b", wall: "#f1e6d6", door: "n" },
    { id: "haus2", x: 1025, y: 610, w: 150, h: 170, roof: "#8a5a7a", wall: "#f1e6d6", door: "n" },
  ],
  trees: [
    [70, 80], [500, 70], [560, 250], [70, 480], [520, 860], [90, 900], [740, 880], [1230, 470],
    [1220, 880], [1240, 70], [740, 250], [500, 640], [780, 700], [1000, 890],
  ],
};

// --- Casalbruno – Afternoon -----------------------------------------------------------------
const BRUNO_NACHMITTAG = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Fontana", x: 860, y: 450, clip: "bruno-nachmittag",
  intro: [
    { npc: "Ciao! A Casalbruno è già pomeriggio. Questa è la parte nuova della città.", en: "Hi! It's already afternoon in Casalbruno. This is the new part of town." },
    { npc: "Hai di nuovo tre cose da fare: la spesa, salutare la vicina e prendere un caffè al bar.", en: "You have three jobs again: do the shopping, say hello to your neighbour and have a coffee at the bar." },
    { npc: "Le persone con il punto esclamativo ti aspettano già. A dopo!", en: "The people with the exclamation mark are already waiting for you. See you later!" },
  ],
  waiting: BRUNO_MORGEN.waiting,
  done: [
    { npc: "Spesa, vicina e bar: tutto fatto! Il tuo italiano è già molto buono!", en: "Shopping, neighbour and bar: all done! Your Italian is really good already!" },
  ],
};

const QUESTS_NACHMITTAG = [
  {
    id: "supermarkt", mascot: "quaki", name: "Davide", role: "Supermercato", x: 310, y: 410,
    item: { label: "la spesa", icon: "1F6D2" },
    words: ["il pomodoro", "l'acqua", "la carta"],
    turns: [
      {
        npc: "Salve! Posso aiutarla?", en: "Hello! Can I help you?",
        task: { type: "choose", options: [
          { de: "Sì, grazie. Dove sono i pomodori?", ok: true },
          { de: "Sì, grazie. Lei è un pomodoro?", why: "“Lei è …?” asks who or what a person is. To find something in a shop, ask “Dove sono …?” (or “Dov'è …?” for one thing)." },
          { de: "Sì, grazie. Dov'è la stazione?", why: "You're in a supermarket and you want to buy something. Ask where it is: “Dove sono i pomodori?”." },
        ] },
      },
      {
        npc: "Là, vicino alle carote. Quanti pomodori vuole?", en: "Over there, next to the carrots. How many tomatoes would you like?",
        task: { type: "say", words: ["Un", "chilo", "di", "pomodori,", "per", "favore."], extra: ["Una", "in"],
          why: "After a quantity, use “di”: un chilo di pomodori. And “chilo” is masculine: “un chilo”." },
      },
      {
        npc: "Altro?", en: "Anything else?",
        task: { type: "choose", options: [
          { de: "Sì, due bottiglie d'acqua, per favore.", ok: true },
          { de: "Sì, due bottiglia d'acqua, per favore.", why: "Una bottiglia, due bottiglie: after “due” the noun is plural (-a becomes -e)." },
          { de: "Sì, non voglio.", why: "“Sì” means you want something else, so say what: “Sì, due bottiglie d'acqua”." },
        ] },
      },
      {
        npc: "Sono quattro euro e ottanta.", en: "That's four euros eighty.",
        task: { type: "choose", options: [
          { de: "Posso pagare con la carta?", ok: true },
          { de: "Posso pagare con la torta?", why: "“Carta” is a card. “Torta” is a cake!" },
          { de: "Posso pagare a carta?", why: "In Italian you pay “con la carta”. The small word is “con”." },
        ] },
      },
    ],
    outro: { npc: "Certo. Grazie e arrivederci!", en: "Of course. Thanks, and goodbye!" },
  },
  {
    id: "nachbarin", mascot: "nachbarin", moji: "1F475", name: "Signora Rossi", role: "Vicina", x: 290, y: 620,
    item: { label: "la vicina", icon: "1F44B" },
    words: ["l'appartamento", "la vicina", "il caffè"],
    turns: [
      {
        npc: "Ciao! Mi chiamo Maria Rossi. Abiti qui da poco?", en: "Hello! My name is Maria Rossi. Have you lived here for a short time?",
        task: { type: "choose", options: [
          { de: "Piacere! Sì, abito qui da ieri.", ok: true },
          { de: "Piacere! Sì, sono ieri.", why: "“Sono” says who you are, and you can't be yesterday. To say since when you live here, use “Abito qui da …”." },
          { de: "Piacere! Sì, vado alla stazione.", why: "Signora Rossi wants to know if you're new in the building. Tell her since when you live here." },
        ] },
      },
      {
        npc: "Che bello! Di dove sei?", en: "How nice! Where are you from?",
        task: { type: "say", words: ["Sono", "di", "Lisbona."], extra: ["a", "in"],
          why: "For the town you come from, use “di”: Sono di Lisbona. (Not “a” or “in”.)" },
      },
      {
        npc: "Che bella città! Ti piace Casalbruno?", en: "What a beautiful city! Do you like Casalbruno?",
        task: { type: "choose", options: [
          { de: "Sì, mi piace molto.", ok: true },
          { de: "Sì, mi piacciono molto.", why: "Casalbruno is one town, so it's the singular “mi piace”. “Mi piacciono” is for several things (mi piacciono i gatti)." },
          { de: "Sì, ho piace molto.", why: "“Mi piace” is a fixed phrase. It doesn't use “avere” (no “ho piace”)." },
        ] },
      },
      {
        npc: "Molto bene! Io abito al primo piano. Vieni a prendere un caffè quando vuoi!", en: "Very good! I live on the first floor. Come for a coffee whenever you like!",
        task: { type: "choose", options: [
          { de: "Grazie, sei molto gentile!", ok: true },
          { de: "Grazie, hai molto gentile!", why: "To describe a person, use “essere”: sei gentile. “Avere” (to have) doesn't work here." },
          { de: "Prego!", why: "“Prego” is what you say when someone thanks you. Here you're the one saying thanks." },
        ] },
      },
    ],
    outro: { npc: "Prego! Ormai siamo vicini.", en: "You're welcome! Now we're neighbours." },
  },
  {
    id: "cafe", mascot: "hamsti", name: "Giulia", role: "Bar", x: 1140, y: 410,
    item: { label: "la torta", icon: "1F370" },
    words: ["il caffè", "la fetta", "lo scontrino", "la cassa"],
    turns: [
      {
        npc: "Salve! Cosa vuole bere?", en: "Hello! What would you like to drink?",
        task: { type: "choose", options: [
          { de: "Un caffè, per favore.", ok: true },
          { de: "Vicino alla finestra, per favore.", why: "Giulia is asking what you want to drink, not where you want to sit." },
          { de: "Una fetta di torta, per favore.", why: "“Bere” is to drink. Cake is food: you eat it." },
        ] },
      },
      {
        npc: "Va bene. Vuole anche mangiare qualcosa?", en: "All right. Would you like something to eat too?",
        task: { type: "say", words: ["Sì,", "una", "fetta", "di", "torta,", "per", "favore."], extra: ["un", "in"],
          why: "“Fetta” (slice) is feminine: “una fetta”, not “un fetta”." },
      },
      {
        npc: "Sono cinque euro e cinquanta. Paghi alla cassa e porti lo scontrino al banco.", en: "That's five euros fifty. Pay at the till and bring the receipt to the counter.",
        task: { type: "choose", options: [
          { de: "Va bene. Ecco sei euro, grazie.", ok: true },
          { de: "Va bene. Ecco cinque euro, grazie.", why: "Five euros isn't enough. It costs five euros fifty." },
          { de: "Va bene. Ecco sessanta euro, grazie.", why: "Listen again: “sei” is 6, “sessanta” is 60." },
        ] },
      },
      {
        npc: "Ecco il suo caffè e la torta. Buon appetito!", en: "Here are your coffee and cake. Enjoy your meal!",
        task: { type: "choose", options: [
          { de: "Grazie, altrettanto!", ok: true },
          { de: "Buonanotte!", why: "“Buonanotte” is for going to bed. For “Buon appetito”, answer “Grazie, altrettanto!”." },
          { de: "Prego!", why: "“Prego” answers “grazie”. Here Giulia has wished you something nice." },
        ] },
      },
    ],
    outro: { npc: "Grazie a Lei! Buon pomeriggio!", en: "Thank you! Have a good afternoon!" },
  },
];

const MAP_NACHMITTAG = {
  start: { x: 700, y: 515 },
  streets: [{ x: 0, y: 460, w: 1280, h: 110 }, { x: 880, y: 0, w: 110, h: 960 }],
  square: { x: 935, y: 515, r: 130, fountain: 40 },
  rails: null,
  buildings: [
    { id: "supermarkt", x: 120, y: 140, w: 380, h: 230, roof: "#4f7a5a", wall: "#eef3ea", sign: "Supermercato", icon: "1F6D2", door: "s" },
    { id: "cafe", x: 1030, y: 160, w: 220, h: 210, roof: "#a0522d", wall: "#f6ead8", sign: "Bar", icon: "2615", door: "s" },
    { id: "wohnhaus", x: 140, y: 660, w: 300, h: 220, roof: "#6a6f8a", wall: "#f1e6d6", sign: "Condominio", icon: "1F3E0", door: "n" },
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
  { id: "morgen", title: "Casalbruno, di mattina", bruno: BRUNO_MORGEN, quests: QUESTS_MORGEN, ...MAP_MORGEN },
  { id: "nachmittag", title: "Casalbruno, di pomeriggio", bruno: BRUNO_NACHMITTAG, quests: QUESTS_NACHMITTAG, ...MAP_NACHMITTAG },
];
export const areaById = (id) => AREAS.find((a) => a.id === id) ?? AREAS[0];

/** What the shop people say when the learner comes too early or comes back. */
export const NOT_YET = { npc: "Salve! Prima parla con Bruno, in piazza.", en: "Hi! First, go and talk to Bruno in the square." };
export const AGAIN = { npc: "Che bello rivederti!", en: "How nice to see you again!" };

/** Graded tasks in an area, for the result line. */
export const taskCount = (area) => area.quests.reduce((n, q) => n + q.turns.filter((t) => t.task).length, 0);

// --- audio ---------------------------------------------------------------------------------
// Every line can have its own clip in public/audio/lindenau/ (a future generate script):
//   <quest>-<turn>-npc.mp3   what the person says in that turn
//   <quest>-<turn>-du.mp3    the right reply (the sentence to build, or the right choice)
//   <quest>-outro-npc.mp3, <quest>-notyet-npc.mp3, <quest>-again-npc.mp3
//   <bruno>-intro-<i>-npc.mp3, <bruno>-done-<i>-npc.mp3, where <bruno> is the area's
//   `bruno.clip` ("bruno" in the first area, "bruno-nachmittag" in the second)
//   bruno-waiting-<n>-npc.mp3, bruno-review-offer-npc.mp3, bruno-review-done-npc.mp3
// There are no Italian clips yet (the folder does not exist): until they are generated,
// spielKit's voice falls back to the browser's it-IT voice for every line.
// One voice per mascot (Italy); the learner's replies in one more voice (`du`).
export const VOICES = {
  bruno: "it-IT-DiegoNeural",
  hamsti: "it-IT-ElsaNeural",
  quaki: "it-IT-BenignoNeural",
  // Regi is the player now (Super-Blubb); the ASL and the neighbour have their own voices.
  aerztin: "it-IT-IsabellaNeural",
  nachbarin: "it-IT-FabiolaNeural",
  du: "it-IT-PalmiraNeural",
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
