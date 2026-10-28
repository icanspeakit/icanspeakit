// Lindenau (/spiele/lindenau): who stands where and what they say. One quest per person,
// A1, everyday situations. The German is the content; `en` is only the "Hilfe" gloss.
//
// A dialogue is a list of turns. Each turn is one line from the person, optionally followed
// by a task for the learner:
//   choose  three replies, exactly one `ok`; every wrong one carries `why` (what was off)
//   build   tap the words into order; `extra` are distractor tiles; `alts` other orders
//           that are just as right. Tiles carry their punctuation.
//   say     a build task the learner may also speak (game.js, taskSay): „Sprechen“ is
//           scored by the Aussprache-Check's service, „Lieber tippen“ plays it as build.
//           At most one per quest.
// The line after a task is the person's reaction to it, so the talk reads as one talk.
// `outro` closes the quest; `item` is what the learner walks away with.
//
// The town comes in areas (AREAS at the end): each has its own map – streets, a square with a
// fountain, buildings (solid; a person stands at the door side), trees – its own Bruno lines
// and three quests. The second area opens once the first is done (game.js).

// --- Lindenau – Morgen ----------------------------------------------------------------------
const BRUNO_MORGEN = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Marktplatz", x: 560, y: 500, clip: "bruno",
  intro: [
    { npc: "Hallo! Ich bin Bruno. Willkommen in Lindenau!", en: "Hello! I'm Bruno. Welcome to Lindenau!" },
    { npc: "Du bist neu hier. Heute hast du drei Aufgaben.", en: "You're new here. Today you have three tasks." },
    { npc: "Kauf Brötchen in der Bäckerei, kauf eine Fahrkarte am Bahnhof und mach einen Termin beim Arzt.", en: "Buy bread rolls at the bakery, buy a ticket at the station and make a doctor's appointment." },
    { npc: "Geh zu den Leuten mit dem Ausrufezeichen und sprich mit ihnen. Viel Erfolg!", en: "Go to the people with the exclamation mark and talk to them. Good luck!" },
  ],
  waiting: (n) => [{ npc: n === 1 ? "Noch eine Aufgabe. Du schaffst das!" : `Noch ${n} Aufgaben. Du schaffst das!`, en: n === 1 ? "One more task. You can do it!" : `${n} more tasks. You can do it!` }],
  done: [
    { npc: "Brötchen, Fahrkarte, Arzttermin – alles erledigt! Super gemacht!", en: "Rolls, ticket, appointment – all done! Well done!" },
  ],
};

/** Bruno's review before a run, in every area: the sentences missed last time (game.js). */
export const BRUNO_REVIEW = {
  offer: { npc: "Schön, dass du wieder da bist! Machen wir eine kurze Wiederholung? Ein paar Sätze vom letzten Mal.", en: "Nice that you're back! Shall we do a quick review? A few sentences from last time." },
  done: { npc: "Prima, das sitzt schon besser! Und jetzt los in die Stadt.", en: "Great, that's getting better! And now off into town." },
};

const QUESTS_MORGEN = [
  {
    id: "baeckerei", mascot: "hamsti", name: "Hamsti", role: "Bäckerei",
    x: 300, y: 405, item: { label: "Brötchen", icon: "1F950" },
    turns: [
      {
        npc: "Guten Morgen! Was darf es sein?", en: "Good morning! What would you like?",
        task: { type: "choose", options: [
          { de: "Ich möchte zwei Brötchen, bitte.", ok: true },
          { de: "Ich bin zwei Brötchen, bitte.", why: "„Ich bin“ sagt, wer du bist. Was du kaufen willst: „Ich möchte …“" },
          { de: "Wo sind zwei Brötchen?", why: "Die Brötchen liegen direkt vor dir. Sag, was du haben möchtest." },
        ] },
      },
      {
        npc: "Gern. Sonst noch etwas?", en: "Sure. Anything else?",
        task: { type: "say", words: ["Ich", "möchte", "noch", "einen", "Kaffee,", "bitte."], extra: ["ein"],
          why: "Der Kaffee → ich möchte einen Kaffee (Akkusativ). „ein“ passt hier nicht." },
      },
      {
        npc: "Das macht 3,40 Euro.", en: "That comes to 3.40 euros.",
        task: { type: "choose", options: [
          { de: "Hier, bitte. 3,40 Euro.", ok: true },
          { de: "Hier, bitte. 4,30 Euro.", why: "Hör nochmal hin: drei Euro vierzig – 3,40." },
          { de: "Danke, gleichfalls!", why: "„Gleichfalls“ sagt man auf einen Wunsch, z. B. „Schönen Tag!“. Hier geht es ums Bezahlen." },
        ] },
      },
      {
        npc: "Danke! Schönen Tag noch!", en: "Thanks! Have a nice day!",
        task: { type: "choose", options: [
          { de: "Danke, gleichfalls!", ok: true },
          { de: "Gute Nacht!", why: "Es ist Morgen – „Gute Nacht“ sagt man vor dem Schlafen." },
          { de: "Entschuldigung!", why: "„Entschuldigung“ sagt man, wenn etwas schiefgeht. Auf „Schönen Tag!“ passt „Danke, gleichfalls!“." },
        ] },
      },
    ],
    outro: { npc: "Tschüss, bis morgen!", en: "Bye, see you tomorrow!" },
  },
  {
    id: "bahnhof", mascot: "quaki", name: "Quaki", role: "Fahrkarten", x: 1000, y: 405,
    item: { label: "Fahrkarte", icon: "1F9FE" },
    turns: [
      {
        npc: "Hallo! Wohin möchten Sie fahren?", en: "Hello! Where would you like to go?",
        task: { type: "say", words: ["Ich", "möchte", "nach", "Berlin", "fahren."], extra: ["in"],
          why: "Mit „möchte“ steht das zweite Verb am Ende: Ich möchte … fahren. Für Städte sagt man „nach“." },
      },
      {
        npc: "Einfach oder hin und zurück?", en: "One way or return?",
        task: { type: "choose", options: [
          { de: "Hin und zurück, bitte.", ok: true },
          { de: "Ich fahre gern Zug.", why: "Quaki fragt, welche Fahrkarte du willst: einfach oder hin und zurück." },
          { de: "Mit dem Zug, bitte.", why: "Du bist schon am Bahnhof – die Frage ist: einfach oder hin und zurück?" },
        ] },
      },
      {
        npc: "Wann möchten Sie fahren?", en: "When would you like to travel?",
        task: { type: "choose", options: [
          { de: "Morgen um neun Uhr.", ok: true },
          { de: "Am Bahnhof.", why: "„Wann?“ fragt nach der Zeit, nicht nach dem Ort." },
          { de: "Zwei Stunden.", why: "„Wann?“ fragt nach dem Zeitpunkt. „Wie lange?“ wäre die Frage für „zwei Stunden“." },
        ] },
      },
      {
        npc: "Das kostet 59 Euro. Der Zug fährt um 9:05 Uhr von Gleis 3.", en: "That's 59 euros. The train leaves at 9:05 from platform 3.",
        task: { type: "choose", options: [
          { de: "Alles klar: Gleis 3, 9:05 Uhr. Danke!", ok: true },
          { de: "Alles klar: Gleis 9, 3:05 Uhr. Danke!", why: "Hör nochmal hin: Gleis drei, neun Uhr fünf." },
          { de: "Alles klar: Gleis 5, 9:03 Uhr. Danke!", why: "Hör nochmal hin: Gleis drei, neun Uhr fünf." },
        ] },
      },
    ],
    outro: { npc: "Gute Reise!", en: "Have a good trip!" },
  },
  {
    id: "arzt", mascot: "aerztin", moji: "1F469-200D-2695", name: "Dr. Igel", role: "Arztpraxis", x: 300, y: 555,
    item: { label: "Arzttermin", icon: "1F4C5" },
    turns: [
      {
        npc: "Praxis Dr. Igel, guten Tag. Was kann ich für Sie tun?", en: "Dr. Igel's practice, good day. What can I do for you?",
        task: { type: "say", words: ["Ich", "brauche", "einen", "Termin,", "bitte."], extra: ["ein"],
          why: "Der Termin → ich brauche einen Termin (Akkusativ)." },
      },
      {
        npc: "Was fehlt Ihnen denn?", en: "What's the matter?",
        task: { type: "choose", options: [
          { de: "Ich habe Kopfschmerzen.", ok: true },
          { de: "Ich bin Kopfschmerzen.", why: "Schmerzen hat man: „Ich habe Kopfschmerzen.“" },
          { de: "Mir geht's gut, danke.", why: "Wenn es dir gut geht, brauchst du keinen Termin. Sag, was dir wehtut." },
        ] },
      },
      {
        npc: "Passt Ihnen Donnerstag um 10 Uhr?", en: "Does Thursday at 10 work for you?",
        task: { type: "choose", options: [
          { de: "Ja, das passt gut.", ok: true },
          { de: "Ja, ich passe.", why: "Der Termin passt (dir) – nicht du. „Ja, das passt gut.“" },
          { de: "Nein, ich habe Donnerstag.", why: "Wenn es nicht geht, sag z. B.: „Nein, am Donnerstag kann ich leider nicht.“" },
        ] },
      },
      {
        npc: "Gut. Bringen Sie bitte Ihre Versichertenkarte mit.", en: "Good. Please bring your health insurance card.",
        task: { type: "choose", options: [
          { de: "Mache ich. Bis Donnerstag!", ok: true },
          { de: "Mache ich. Bis gestern!", why: "„Gestern“ ist vorbei. Der Termin ist am Donnerstag: „Bis Donnerstag!“" },
          { de: "Ich bringe Donnerstag.", why: "Du bringst die Karte mit – nicht den Donnerstag. „Mache ich. Bis Donnerstag!“" },
        ] },
      },
    ],
    outro: { npc: "Gute Besserung und bis Donnerstag!", en: "Get well soon, see you Thursday!" },
  },
];

const MAP_MORGEN = {
  start: { x: 640, y: 660 },
  streets: [{ x: 0, y: 420, w: 1280, h: 120 }, { x: 585, y: 0, w: 110, h: 960 }],
  square: { x: 640, y: 480, r: 160, fountain: 48 },
  rails: { x: 760, y: 40, w: 520, h: 70 },
  buildings: [
    { id: "baeckerei", x: 150, y: 150, w: 300, h: 215, roof: "#c2553d", wall: "#f3e2c7", sign: "Bäckerei", icon: "1F950", door: "s" },
    { id: "bahnhof", x: 820, y: 130, w: 360, h: 235, roof: "#5f7d8c", wall: "#e7e2d8", sign: "Bahnhof", icon: "1F689", door: "s" },
    { id: "arzt", x: 150, y: 595, w: 300, h: 215, roof: "#7d6a5a", wall: "#eef2f4", sign: "Arztpraxis", icon: "1F3E5", door: "n" },
    { id: "haus1", x: 830, y: 610, w: 150, h: 170, roof: "#b07a3b", wall: "#f1e6d6", door: "n" },
    { id: "haus2", x: 1025, y: 610, w: 150, h: 170, roof: "#8a5a7a", wall: "#f1e6d6", door: "n" },
  ],
  trees: [
    [70, 80], [500, 70], [560, 250], [70, 480], [520, 860], [90, 900], [740, 880], [1230, 470],
    [1220, 880], [1240, 70], [740, 250], [500, 640], [780, 700], [1000, 890],
  ],
};

// --- Lindenau – Nachmittag ------------------------------------------------------------------
const BRUNO_NACHMITTAG = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Brunnen", x: 860, y: 450, clip: "bruno-nachmittag",
  intro: [
    { npc: "Hallo! Jetzt ist Nachmittag in Lindenau. Hier ist die Neustadt.", en: "Hello! Now it's afternoon in Lindenau. This is the new part of town." },
    { npc: "Du hast wieder drei Aufgaben: Kauf im Supermarkt ein, lern deine Nachbarin kennen und geh ins Café.", en: "You have three tasks again: shop at the supermarket, meet your neighbour and go to the café." },
    { npc: "Die Leute mit dem Ausrufezeichen warten schon. Bis später!", en: "The people with the exclamation mark are already waiting. See you later!" },
  ],
  waiting: BRUNO_MORGEN.waiting,
  done: [
    { npc: "Einkauf, Nachbarin, Café – alles geschafft! Du sprichst schon richtig gut Deutsch!", en: "Shopping, neighbour, café – all done! Your German is really good already!" },
  ],
};

const QUESTS_NACHMITTAG = [
  {
    id: "supermarkt", mascot: "quaki", name: "Quaki", role: "Supermarkt", x: 310, y: 410,
    item: { label: "Einkauf", icon: "1F6D2" },
    turns: [
      {
        npc: "Guten Tag! Kann ich Ihnen helfen?", en: "Hello! Can I help you?",
        task: { type: "choose", options: [
          { de: "Ja, bitte. Haben Sie Tomaten?", ok: true },
          { de: "Ja, bitte. Sind Sie Tomaten?", why: "„Sind Sie …?“ fragt nach der Person. Ob es etwas gibt, fragt man so: „Haben Sie …?“" },
          { de: "Ja, bitte. Wo ist der Bahnhof?", why: "Du bist im Supermarkt und möchtest etwas kaufen. Frag: „Haben Sie …?“" },
        ] },
      },
      {
        npc: "Ja, da hinten beim Gemüse. Wie viel möchten Sie?", en: "Yes, back there with the vegetables. How much would you like?",
        task: { type: "say", words: ["Ich", "nehme", "ein", "Kilo", "Tomaten."], extra: ["von"],
          why: "Nach einer Menge kommt das Nomen direkt, ohne „von“: ein Kilo Tomaten." },
      },
      {
        npc: "Brauchen Sie noch etwas?", en: "Do you need anything else?",
        task: { type: "choose", options: [
          { de: "Ja, zwei Flaschen Wasser, bitte.", ok: true },
          { de: "Ja, zwei Flasche Wasser, bitte.", why: "Eine Flasche, zwei Flaschen – nach „zwei“ steht der Plural." },
          { de: "Ja, ich brauche nicht.", why: "„Ja“ heißt: Ich brauche noch etwas. Dann sag, was: „Ja, zwei Flaschen Wasser, bitte.“" },
        ] },
      },
      {
        npc: "Das macht 4,80 Euro.", en: "That's 4.80 euros.",
        task: { type: "choose", options: [
          { de: "Kann ich mit Karte zahlen?", ok: true },
          { de: "Kann ich mit Karte zählen?", why: "„Zählen“ ist 1, 2, 3 … Für Geld sagt man „zahlen“." },
          { de: "Kann ich mit Karte essen?", why: "Mit Karte kann man zahlen – essen nicht." },
        ] },
      },
    ],
    outro: { npc: "Ja, klar. Danke und einen schönen Tag noch!", en: "Yes, sure. Thanks and have a nice day!" },
  },
  {
    id: "nachbarin", mascot: "nachbarin", moji: "1F475", name: "Frau Linde", role: "Nachbarin", x: 290, y: 620,
    item: { label: "Nachbarin", icon: "1F44B" },
    turns: [
      {
        npc: "Hallo! Sind Sie neu hier?", en: "Hello! Are you new here?",
        task: { type: "choose", options: [
          { de: "Ja, ich wohne seit gestern hier.", ok: true },
          { de: "Ja, ich bin gestern.", why: "„Ich bin gestern“ sagt nichts. Sag, seit wann du hier wohnst: „Ich wohne seit gestern hier.“" },
          { de: "Nein, ich bin alt.", why: "„Neu hier“ heißt: Wohnen Sie erst kurz hier? „Alt“ passt nicht – und du bist ja neu." },
        ] },
      },
      {
        npc: "Herzlich willkommen! Ich heiße Frau Linde. Woher kommen Sie?", en: "Welcome! My name is Mrs Linde. Where are you from?",
        task: { type: "say", words: ["Ich", "komme", "aus", "Spanien."], extra: ["von"],
          why: "Bei Ländern und Städten sagt man „aus“: Ich komme aus Spanien." },
      },
      {
        npc: "Ah, schön! Und was machen Sie hier in Lindenau?", en: "Oh, nice! And what are you doing here in Lindenau?",
        task: { type: "choose", options: [
          { de: "Ich lerne hier Deutsch.", ok: true },
          { de: "Ich mache Lindenau.", why: "Frau Linde fragt nach deiner Arbeit oder deinem Kurs, zum Beispiel: „Ich lerne hier Deutsch.“" },
          { de: "Ich bin aus Lindenau.", why: "Du kommst aus Spanien und bist neu. Frau Linde fragt, was du hier machst." },
        ] },
      },
      {
        npc: "Toll! Ich wohne im ersten Stock. Klingeln Sie gern mal!", en: "Great! I live on the first floor. Feel free to ring the bell!",
        task: { type: "choose", options: [
          { de: "Danke, das ist sehr nett!", ok: true },
          { de: "Danke, das ist sehr alt!", why: "„Alt“ passt hier nicht. Zu einem netten Angebot sagt man: „Das ist sehr nett!“" },
          { de: "Bitte, gern geschehen!", why: "„Gern geschehen“ sagt man, wenn sich jemand bei dir bedankt. Hier bedankst du dich: „Danke, das ist sehr nett!“" },
        ] },
      },
    ],
    outro: { npc: "Gern! Auf gute Nachbarschaft!", en: "You're welcome! Here's to being good neighbours!" },
  },
  {
    id: "cafe", mascot: "hamsti", name: "Hamsti", role: "Café", x: 1140, y: 410,
    item: { label: "Kuchen", icon: "1F370" },
    turns: [
      {
        npc: "Hallo! Was möchten Sie trinken?", en: "Hello! What would you like to drink?",
        task: { type: "choose", options: [
          { de: "Einen Tee, bitte.", ok: true },
          { de: "Am Fenster, bitte.", why: "Hamsti fragt nach dem Getränk, nicht nach dem Platz." },
          { de: "Einen Kuchen, bitte.", why: "Hamsti fragt, was du trinken möchtest. Kuchen isst man." },
        ] },
      },
      {
        npc: "Gern. Möchten Sie auch etwas essen?", en: "Sure. Would you like something to eat too?",
        task: { type: "say", words: ["Ja,", "ein", "Stück", "Apfelkuchen,", "bitte."], extra: ["einen"],
          why: "Das Stück → ein Stück. „Apfelkuchen“ kommt direkt danach, ohne Artikel." },
      },
      {
        npc: "Schmeckt es Ihnen?", en: "Do you like it?",
        task: { type: "choose", options: [
          { de: "Ja, sehr lecker! Ich möchte bitte zahlen.", ok: true },
          { de: "Nein, sehr lecker!", why: "„Nein“ heißt: Es schmeckt nicht. Aber „lecker“ heißt: Es schmeckt gut." },
          { de: "Ja, sehr lecker! Ich möchte bitte essen.", why: "Du hast schon gegessen. Jetzt möchtest du die Rechnung: „Ich möchte bitte zahlen.“" },
        ] },
      },
      {
        npc: "Das macht 7,50 Euro.", en: "That's 7.50 euros.",
        task: { type: "choose", options: [
          { de: "Hier sind acht Euro. Stimmt so!", ok: true },
          { de: "Hier sind sieben Euro. Stimmt so!", why: "Sieben Euro sind zu wenig: Es kostet sieben Euro fünfzig." },
          { de: "Hier sind acht Euro. Gute Besserung!", why: "„Gute Besserung“ sagt man zu kranken Menschen. Mit Trinkgeld sagt man: „Stimmt so!“" },
        ] },
      },
    ],
    outro: { npc: "Oh, vielen Dank! Einen schönen Nachmittag noch!", en: "Oh, thank you very much! Have a nice afternoon!" },
  },
];

const MAP_NACHMITTAG = {
  start: { x: 700, y: 515 },
  streets: [{ x: 0, y: 460, w: 1280, h: 110 }, { x: 880, y: 0, w: 110, h: 960 }],
  square: { x: 935, y: 515, r: 130, fountain: 40 },
  rails: null,
  buildings: [
    { id: "supermarkt", x: 120, y: 140, w: 380, h: 230, roof: "#4f7a5a", wall: "#eef3ea", sign: "Supermarkt", icon: "1F6D2", door: "s" },
    { id: "cafe", x: 1030, y: 160, w: 220, h: 210, roof: "#a0522d", wall: "#f6ead8", sign: "Café", icon: "2615", door: "s" },
    { id: "wohnhaus", x: 140, y: 660, w: 300, h: 220, roof: "#6a6f8a", wall: "#f1e6d6", sign: "Wohnhaus", icon: "1F3E0", door: "n" },
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
  { id: "morgen", title: "Lindenau – Morgen", bruno: BRUNO_MORGEN, quests: QUESTS_MORGEN, ...MAP_MORGEN },
  { id: "nachmittag", title: "Lindenau – Nachmittag", bruno: BRUNO_NACHMITTAG, quests: QUESTS_NACHMITTAG, ...MAP_NACHMITTAG },
];
export const areaById = (id) => AREAS.find((a) => a.id === id) ?? AREAS[0];

/** What the shop people say when the learner comes too early or comes back. */
export const NOT_YET = { npc: "Guten Tag! Sprechen Sie bitte zuerst mit Bruno am Brunnen.", en: "Hello! Please talk to Bruno at the fountain first." };
export const AGAIN = { npc: "Schön, Sie wiederzusehen!", en: "Nice to see you again!" };

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
// One voice per mascot; the learner's replies in the site's own voice (Katja).
export const VOICES = {
  bruno: "de-DE-ConradNeural",
  hamsti: "de-DE-AmalaNeural",
  quaki: "de-DE-KillianNeural",
  // Regi is the player now (Super-Blubb); the doctor and the neighbour kept her voice, so
  // their clips stayed valid.
  aerztin: "de-DE-LouisaNeural",
  nachbarin: "de-DE-LouisaNeural",
  du: "de-DE-KatjaNeural",
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
