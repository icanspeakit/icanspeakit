// "The Legend of Montbruno" (/jeux/montbruno; internal id: lindenau): who stands where and
// what they say. One quest per person, A1, everyday errands in Montbruno, an invented French
// town. The French is the content (npc / de); `en` is its English meaning, the 💡 Help line.
// (The key `de` is historical: it holds the French line the learner reads and builds.)
//
// The player's gender is unknown, so nothing the player says, and nothing said to the player, is
// gendered: no nouveau/nouvelle, enchanté(e), bienvenu(e) as an adjective; instead vous venez
// d'arriver, bienvenue (the noun). Bruno, the mascot who shows the player round, uses tu; everyone
// else (shop staff, the station, the surgery, the older neighbour) uses vous, as people in France
// do with a customer or a stranger, and the player follows them.
//
// A dialogue is a list of turns. Each turn is one line from the person, optionally followed
// by a task for the learner:
//   choose  three replies, exactly one `ok`; every wrong one carries `why` (what was off, English)
//   build   tap the words into order; `extra` are distractor tiles; `alts` other orders
//           that are just as right. Tiles carry their punctuation; an elided word is one tile
//           (s'il, J'ai). Build sentences end in a full stop: French puts a space before ? and !,
//           and a tile must never be split from its mark.
//   say     a build task the learner may also speak (game.js, taskSay): "Speak" is
//           scored by the pronunciation check's service, "Type instead" plays it as build.
//           At most one per quest.
// The line after a task is the person's reaction to it, so the talk reads as one talk.
// `outro` closes the quest; `item` is what the learner walks away with (le / la + noun); `words`
// are extra nouns for the monsters in the action levels, with le / la (never l', which hides the
// gender), so the levels practise the gender too (game.js cannot pick lowercase nouns out of the
// sentences). French text keeps a plain space before ? ! : ; the screen makes it a no-break space
// (spielKit.js frSpace). No straight double quotes in any text (scripts/check-lindenau.mjs): use “ ”.
//
// The town comes in areas (AREAS at the end): each has its own map – streets, a square with a
// fountain, buildings (solid; a person stands at the door side), trees – its own Bruno lines
// and three quests. The second area opens once the first is done (game.js).

/**
 * All lines are French of France. For a later fr-CA mode: Québec counts floors differently
 * (le premier étage = the ground floor, so “au premier” means something else), often says
 * « Bienvenue ! » for “you're welcome”, and a
 * pharmacy or clinic asks for the carte d'assurance maladie (RAMQ), not the carte Vitale.
 */
export const VARIETY = "fr-FR";

// --- Montbruno – Morning --------------------------------------------------------------------
const BRUNO_MORGEN = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Place du Marché", x: 560, y: 500, clip: "bruno",
  intro: [
    { npc: "Salut ! Moi, c'est Bruno. Bienvenue à Montbruno !", en: "Hi! I'm Bruno. Welcome to Montbruno!" },
    { npc: "Tu viens d'arriver. Aujourd'hui, tu as trois choses à faire.", en: "You've just arrived. You have three things to do today." },
    { npc: "Achète du pain à la boulangerie et un billet à la gare, et prends rendez-vous chez le médecin.", en: "Buy bread at the bakery and a ticket at the station, and make an appointment with the doctor." },
    { npc: "Cherche les personnes avec un point d'exclamation et parle avec elles. Bonne chance !", en: "Look for the people with an exclamation mark and talk to them. Good luck!" },
  ],
  waiting: (n) => [{ npc: n === 1 ? "Il te reste une chose à faire. Tu vas y arriver !" : `Il te reste ${n} choses à faire. Tu vas y arriver !`, en: n === 1 ? "You have one thing left to do. You can do it!" : `You have ${n} things left to do. You can do it!` }],
  done: [
    { npc: "Le pain, le billet, le rendez-vous : tout est fait ! Bravo !", en: "Bread, ticket, appointment: all done! Well done!" },
  ],
};

/** Bruno's review before a run, in every area: the sentences missed last time (game.js). */
export const BRUNO_REVIEW = {
  offer: { npc: "Ça me fait plaisir de te revoir ! On révise un peu ? Quelques phrases de la dernière fois.", en: "Nice to see you again! Shall we review a little? A few sentences from last time." },
  done: { npc: "Très bien, c'est beaucoup mieux ! Allez, on va en ville.", en: "Very good, much better now! Come on, let's go into town." },
};

const QUESTS_MORGEN = [
  {
    id: "baeckerei", mascot: "hamsti", name: "Hamsti", role: "Boulangerie",
    x: 300, y: 405, item: { label: "la baguette", icon: "1F956" },
    words: ["le pain", "le croissant", "la monnaie"],
    turns: [
      {
        npc: "Bonjour ! Qu'est-ce que je vous sers ?", en: "Hello! What can I get you?",
        task: { type: "choose", options: [
          { de: "Bonjour ! Une baguette, s'il vous plaît.", ok: true },
          { de: "J'ai une baguette, s'il vous plaît.", why: "“J'ai” means “I have”. To order, say “Une baguette, s'il vous plaît” or “Je voudrais une baguette”." },
          { de: "Une baguette, s'il vous plaît.", why: "The order is fine, but in France “Bonjour” comes first, in every shop: “Bonjour ! Une baguette, s'il vous plaît.”" },
        ] },
      },
      {
        npc: "Et avec ceci ?", en: "Anything else?",
        task: { type: "say", words: ["Je", "voudrais", "un", "croissant,", "s'il", "vous", "plaît."], extra: ["une"],
          why: "“Croissant” is masculine, so it's “un croissant”, not “une croissant”." },
      },
      {
        npc: "Ça fait deux euros vingt, s'il vous plaît.", en: "That's two euros twenty, please.",
        task: { type: "choose", options: [
          { de: "Voilà, deux euros vingt.", ok: true },
          { de: "Voilà, douze euros vingt.", why: "Listen again: “deux” is 2, “douze” is 12. It's €2.20." },
          { de: "Merci, vous aussi.", why: "“Vous aussi” (you too) answers a good wish. Here the baker is waiting for your money." },
        ] },
      },
      {
        npc: "Merci ! Bonne journée !", en: "Thank you! Have a nice day!",
        task: { type: "choose", options: [
          { de: "Merci, vous aussi ! Au revoir !", ok: true },
          { de: "Bonne nuit !", why: "It's morning. “Bonne nuit” is only for when someone goes to bed." },
          { de: "Pardon !", why: "“Pardon” is for when you bump into someone or need to get past. To answer a good wish, say “Merci, vous aussi !”." },
        ] },
      },
    ],
    outro: { npc: "Au revoir, à demain !", en: "Goodbye, see you tomorrow!" },
  },
  {
    id: "bahnhof", mascot: "quaki", name: "Quaki", role: "Gare", x: 1000, y: 405,
    item: { label: "le billet", icon: "1F9FE" },
    words: ["le train", "la voie", "la gare"],
    turns: [
      {
        npc: "Bonjour. Vous allez où ?", en: "Hello. Where are you going?",
        task: { type: "say", words: ["Je", "voudrais", "un", "billet", "pour", "Lyon,", "s'il", "vous", "plaît."], extra: ["à"],
          why: "A ticket goes “pour” a place: un billet pour Lyon. (You go “à Lyon”, but the ticket is “pour Lyon”.)" },
      },
      {
        npc: "Un aller simple ou un aller-retour ?", en: "One way or return?",
        task: { type: "choose", options: [
          { de: "Un aller-retour, s'il vous plaît.", ok: true },
          { de: "J'aime bien les trains.", why: "The question is which ticket you want: “un aller simple” (one way) or “un aller-retour” (return)." },
          { de: "En train, s'il vous plaît.", why: "You're already at the station. The question is: “aller simple” or “aller-retour”?" },
        ] },
      },
      {
        npc: "Vous voulez partir quand ?", en: "When do you want to leave?",
        task: { type: "choose", options: [
          { de: "Demain, à dix heures.", ok: true },
          { de: "À la gare.", why: "“Quand ?” asks about time. “À la gare” answers “Où ?” (where)." },
          { de: "Pendant deux heures.", why: "“Pendant deux heures” says how long (for two hours). “Quand ?” asks when." },
        ] },
      },
      {
        npc: "Ça fait quarante-deux euros. Votre train part à dix heures cinq, voie trois.", en: "That's forty-two euros. Your train leaves at five past ten, from platform three.",
        task: { type: "choose", options: [
          { de: "D'accord : voie trois, à dix heures cinq. Merci !", ok: true },
          { de: "D'accord : voie dix, à trois heures cinq. Merci !", why: "Listen again: “voie trois”, “à dix heures cinq”." },
          { de: "D'accord : voie cinq, à trois heures dix. Merci !", why: "Listen again: “voie trois”, “à dix heures cinq”." },
        ] },
      },
    ],
    outro: { npc: "Bon voyage !", en: "Have a good trip!" },
  },
  {
    id: "arzt", mascot: "aerztin", moji: "1F469-200D-2695", name: "Inès", role: "Cabinet médical", x: 300, y: 555,
    item: { label: "le rendez-vous", icon: "1F4C5" },
    words: ["le médecin", "la tête", "la carte"],
    turns: [
      {
        npc: "Cabinet médical, bonjour. Je peux vous aider ?", en: "Doctor's surgery, hello. Can I help you?",
        task: { type: "say", words: ["Je", "voudrais", "prendre", "rendez-vous", "avec", "le", "médecin."], extra: ["à"],
          why: "You make an appointment with someone: “prendre rendez-vous avec le médecin”." },
      },
      {
        npc: "Vous avez votre carte Vitale ?", en: "Do you have your carte Vitale (health insurance card)?",
        task: { type: "choose", options: [
          { de: "Oui, la voilà.", ok: true },
          { de: "Oui, je suis médecin.", why: "She's asking about your carte Vitale, the health insurance card you show at the doctor's. You're not the doctor!" },
          { de: "Non, merci.", why: "“Non, merci” turns down an offer. If you don't have the card with you, say “Non, je ne l'ai pas sur moi”." },
        ] },
      },
      {
        npc: "Qu'est-ce qui ne va pas ?", en: "What's wrong?",
        task: { type: "choose", options: [
          { de: "J'ai mal à la tête.", ok: true },
          { de: "J'ai la tête.", why: "That only says “I have the head”. To say what hurts, use “J'ai mal à…”." },
          { de: "Ça va bien, merci.", why: "If you're fine, you don't need an appointment. Say what hurts: “J'ai mal à…”." },
        ] },
      },
      {
        npc: "Votre date de naissance, s'il vous plaît ?", en: "Your date of birth, please?",
        task: { type: "choose", options: [
          { de: "Le 4 mai 1990.", ok: true },
          { de: "J'ai 36 ans.", why: "She's asking for your date of birth (day, month, year), not your age." },
          { de: "Aujourd'hui, c'est jeudi.", why: "Your date of birth is the day, month and year you were born, not a day of the week." },
        ] },
      },
      {
        npc: "Merci. Jeudi à dix heures, ça vous va ?", en: "Thank you. Thursday at ten, does that suit you?",
        task: { type: "choose", options: [
          { de: "Oui, ça me va. À jeudi !", ok: true },
          { de: "Oui, je vais bien. À jeudi !", why: "“Je vais bien” says you feel fine. When a time suits you, say “Ça me va”." },
          { de: "Oui, ça me va. À hier !", why: "“Hier” is yesterday. The appointment is on Thursday: “À jeudi !”." },
        ] },
      },
    ],
    outro: { npc: "Très bien. Bon rétablissement, et à jeudi !", en: "Very good. Get well soon, and see you on Thursday!" },
  },
];

const MAP_MORGEN = {
  start: { x: 640, y: 660 },
  streets: [{ x: 0, y: 420, w: 1280, h: 120 }, { x: 585, y: 0, w: 110, h: 960 }],
  square: { x: 640, y: 480, r: 160, fountain: 48 },
  rails: { x: 760, y: 40, w: 520, h: 70 },
  buildings: [
    { id: "baeckerei", x: 150, y: 150, w: 300, h: 215, roof: "#c2553d", wall: "#f3e2c7", sign: "Boulangerie", icon: "1F950", door: "s" },
    { id: "bahnhof", x: 820, y: 130, w: 360, h: 235, roof: "#5f7d8c", wall: "#e7e2d8", sign: "Gare", icon: "1F689", door: "s" },
    { id: "arzt", x: 150, y: 595, w: 300, h: 215, roof: "#7d6a5a", wall: "#eef2f4", sign: "Cabinet médical", icon: "1F3E5", door: "n" },
    { id: "haus1", x: 830, y: 610, w: 150, h: 170, roof: "#b07a3b", wall: "#f1e6d6", door: "n" },
    { id: "haus2", x: 1025, y: 610, w: 150, h: 170, roof: "#8a5a7a", wall: "#f1e6d6", door: "n" },
  ],
  trees: [
    [70, 80], [500, 70], [560, 250], [70, 480], [520, 860], [90, 900], [740, 880], [1230, 470],
    [1220, 880], [1240, 70], [740, 250], [500, 640], [780, 700], [1000, 890],
  ],
};

// --- Montbruno – Afternoon ------------------------------------------------------------------
const BRUNO_NACHMITTAG = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Fontaine", x: 860, y: 450, clip: "bruno-nachmittag",
  intro: [
    { npc: "Salut ! C'est l'après-midi à Montbruno. Ici, c'est le nouveau quartier.", en: "Hi! It's the afternoon in Montbruno now. This is the new part of town." },
    { npc: "Encore trois choses à faire : les courses, dire bonjour à ta voisine et une pause au café.", en: "Three more things to do: the shopping, saying hello to your neighbour and a break at the café." },
    { npc: "Les personnes avec le point d'exclamation t'attendent déjà. À tout à l'heure !", en: "The people with the exclamation mark are already waiting for you. See you later!" },
  ],
  waiting: BRUNO_MORGEN.waiting,
  done: [
    { npc: "Les courses, la voisine, le café : tout est fait ! Ton français est déjà très bon !", en: "Shopping, neighbour and café: all done! Your French is really good already!" },
  ],
};

const QUESTS_NACHMITTAG = [
  {
    id: "supermarkt", mascot: "quaki", name: "Quaki", role: "Supermarché", x: 310, y: 410,
    item: { label: "le sac de courses", icon: "1F6CD" },
    words: ["la tomate", "la bouteille", "la carte"],
    turns: [
      {
        npc: "Bonjour ! Je peux vous aider ?", en: "Hello! Can I help you?",
        task: { type: "choose", options: [
          { de: "Oui, merci. Où sont les tomates, s'il vous plaît ?", ok: true },
          { de: "Oui, merci. Vous êtes une tomate ?", why: "“Vous êtes… ?” asks who or what a person is. To find something in a shop, ask “Où sont… ?”." },
          { de: "Oui, merci. Où est la gare ?", why: "You're in a supermarket and you want to buy something. Ask where it is: “Où sont les tomates ?”." },
        ] },
      },
      {
        npc: "Là-bas, à côté des carottes. Vous en voulez combien ?", en: "Over there, next to the carrots. How many would you like?",
        task: { type: "say", words: ["Un", "kilo", "de", "tomates,", "s'il", "vous", "plaît."], extra: ["Une", "des"],
          why: "After a quantity, French uses just “de”: un kilo de tomates, not “des tomates”. And “kilo” is masculine: “un kilo”." },
      },
      {
        npc: "Et avec ça ?", en: "Anything else?",
        task: { type: "choose", options: [
          { de: "Deux bouteilles d'eau, s'il vous plaît.", ok: true },
          { de: "Deux bouteille d'eau, s'il vous plaît.", why: "Une bouteille, deux bouteilles: after “deux” the noun takes the plural -s. You can't hear it, but you write it." },
          { de: "Deux bouteilles de l'eau, s'il vous plaît.", why: "After a quantity, just “de” (d' before a vowel): deux bouteilles d'eau." },
        ] },
      },
      {
        npc: "Ça fait quatre euros quatre-vingts.", en: "That's four euros eighty.",
        task: { type: "choose", options: [
          { de: "Je peux payer par carte ?", ok: true },
          { de: "Je peux payer par carotte ?", why: "“Une carte” is a card. “Une carotte” is a carrot!" },
          { de: "Je peux payer avec carte ?", why: "In French you pay “par carte” (by card). The small word is “par”." },
        ] },
      },
    ],
    outro: { npc: "Oui, bien sûr. Merci, et bonne fin de journée !", en: "Yes, of course. Thanks, and have a good rest of the day!" },
  },
  {
    id: "nachbarin", mascot: "nachbarin", moji: "1F475", name: "Madame Perrin", role: "Voisine", x: 290, y: 620,
    item: { label: "la voisine", icon: "1F44B" },
    words: ["la voisine", "le café", "le pays"],
    turns: [
      {
        npc: "Bonjour ! Vous venez d'arriver dans l'immeuble ?", en: "Hello! Have you just moved into the building?",
        task: { type: "choose", options: [
          { de: "Oui, j'habite ici depuis hier.", ok: true },
          { de: "Oui, je suis hier.", why: "“Je suis” says who or what you are, and you can't be yesterday. To say since when you live here: “J'habite ici depuis…”." },
          { de: "Oui, je vais à la gare.", why: "Madame Perrin wants to know if you're new in the building. Tell her since when you live here." },
        ] },
      },
      {
        npc: "Ah, très bien ! Moi, c'est Madame Perrin. Vous venez d'où ?", en: "Oh, good! I'm Madame Perrin. Where are you from?",
        task: { type: "say", words: ["Je", "viens", "du", "Brésil."], extra: ["de", "en"],
          why: "Countries have an article in French: le Brésil, so “je viens du Brésil” (de + le = du). With a feminine country it's “de”: je viens de Turquie." },
      },
      {
        npc: "Oh, c'est loin ! Et qu'est-ce que vous faites à Montbruno ?", en: "Oh, that's far! And what do you do in Montbruno?",
        task: { type: "choose", options: [
          { de: "J'apprends le français ici.", ok: true },
          { de: "Je fais Montbruno.", why: "Madame Perrin is asking about your work or your course, for example: “J'apprends le français ici”." },
          { de: "Je viens de Montbruno.", why: "You've just said you come from Brazil, and you're new here. She's asking what you do here." },
        ] },
      },
      {
        npc: "Très bien ! J'habite au premier étage. Passez prendre un café quand vous voulez !", en: "Very good! I live on the first floor. Drop in for a coffee whenever you like!",
        task: { type: "choose", options: [
          { de: "Merci, c'est très gentil !", ok: true },
          { de: "Merci, vous êtes très vieille !", why: "“Vieille” means “old”, which is not a nice thing to say here! For a kind offer, say “C'est très gentil” (that's very kind)." },
          { de: "De rien.", why: "“De rien” is what you say when someone thanks you. Here you're the one saying thanks: “Merci, c'est très gentil !”." },
        ] },
      },
    ],
    outro: { npc: "Avec plaisir ! Bienvenue dans l'immeuble.", en: "My pleasure! Welcome to the building." },
  },
  {
    id: "cafe", mascot: "hamsti", name: "Hamsti", role: "Café", x: 1140, y: 410,
    item: { label: "la tarte", icon: "1F370" },
    words: ["le thé", "la part", "la fenêtre"],
    turns: [
      {
        npc: "Bonjour ! Qu'est-ce que je vous sers à boire ?", en: "Hello! What can I get you to drink?",
        task: { type: "choose", options: [
          { de: "Un thé, s'il vous plaît.", ok: true },
          { de: "Près de la fenêtre, s'il vous plaît.", why: "Hamsti is asking what you want to drink, not where you want to sit." },
          { de: "Une part de tarte, s'il vous plaît.", why: "“Boire” is to drink. Tart is food: you eat it." },
        ] },
      },
      {
        npc: "Très bien. Et vous voulez manger quelque chose ?", en: "Very good. And would you like something to eat?",
        task: { type: "say", words: ["Oui,", "une", "part", "de", "tarte", "aux", "pommes."], extra: ["un", "à"],
          why: "“Part” (slice) is feminine: “une part”. And for the flavour, French says “tarte aux pommes” (à + les = aux)." },
      },
      {
        npc: "Alors, elle est bonne, la tarte ?", en: "So, is the tart good?",
        task: { type: "choose", options: [
          { de: "Elle est délicieuse, merci ! L'addition, s'il vous plaît.", ok: true },
          { de: "Il est délicieux, merci ! L'addition, s'il vous plaît.", why: "“La tarte” is feminine, so it's “elle”, and the adjective is feminine too: “elle est délicieuse”." },
          { de: "Elle est délicieuse, merci ! L'addiction, s'il vous plaît.", why: "“L'addiction” is an addiction! The bill is “l'addition”." },
        ] },
      },
      {
        npc: "Ça fait cinq euros cinquante.", en: "That's five euros fifty.",
        task: { type: "choose", options: [
          { de: "Voilà six euros. Gardez la monnaie.", ok: true },
          { de: "Voilà cinq euros. Gardez la monnaie.", why: "Five euros isn't enough. It costs five euros fifty." },
          { de: "Voilà six euros. Bon rétablissement !", why: "“Bon rétablissement” is for people who are ill. To leave the rest as a small tip, say “Gardez la monnaie” (keep the change)." },
        ] },
      },
    ],
    outro: { npc: "Merci beaucoup ! Bonne fin de journée !", en: "Thank you very much! Have a good rest of the day!" },
  },
];

const MAP_NACHMITTAG = {
  start: { x: 700, y: 515 },
  streets: [{ x: 0, y: 460, w: 1280, h: 110 }, { x: 880, y: 0, w: 110, h: 960 }],
  square: { x: 935, y: 515, r: 130, fountain: 40 },
  rails: null,
  buildings: [
    { id: "supermarkt", x: 120, y: 140, w: 380, h: 230, roof: "#4f7a5a", wall: "#eef3ea", sign: "Supermarché", icon: "1F6D2", door: "s" },
    { id: "cafe", x: 1030, y: 160, w: 220, h: 210, roof: "#a0522d", wall: "#f6ead8", sign: "Café", icon: "2615", door: "s" },
    { id: "wohnhaus", x: 140, y: 660, w: 300, h: 220, roof: "#6a6f8a", wall: "#f1e6d6", sign: "Résidence", icon: "1F3E0", door: "n" },
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
  { id: "morgen", title: "Montbruno, le matin", bruno: BRUNO_MORGEN, quests: QUESTS_MORGEN, ...MAP_MORGEN },
  { id: "nachmittag", title: "Montbruno, l'après-midi", bruno: BRUNO_NACHMITTAG, quests: QUESTS_NACHMITTAG, ...MAP_NACHMITTAG },
];
export const areaById = (id) => AREAS.find((a) => a.id === id) ?? AREAS[0];

/** What the shop people say when the learner comes too early or comes back. */
export const NOT_YET = { npc: "Bonjour ! Allez d'abord voir Bruno, sur la place.", en: "Hello! First, go and see Bruno in the square." };
export const AGAIN = { npc: "Ça me fait plaisir de vous revoir !", en: "How nice to see you again!" };

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
// There are no French clips yet (the folder does not exist): until they are generated,
// spielKit's voice falls back to the browser's French voice for every line.
// One voice per mascot (France); the learner's replies in one more voice (`du`).
export const VOICES = {
  bruno: "fr-FR-HenriNeural",
  hamsti: "fr-FR-DeniseNeural",
  quaki: "fr-FR-AlainNeural",
  // Regi is the player now (Super-Blubb); the surgery and the neighbour have their own voices.
  aerztin: "fr-FR-CoralieNeural",
  nachbarin: "fr-FR-JacquelineNeural",
  du: "fr-FR-EloiseNeural",
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
