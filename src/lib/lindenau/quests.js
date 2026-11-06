// "The Legend of Villabruno" (/games/brambleford until `routes`; internal id: lindenau): who
// stands where and what they say. One quest per person, A1, everyday errands in Villabruno, an
// invented Spanish town. The Spanish is the content (npc / de); `en` is its English meaning, the
// 💡 Help line. (The key `de` is historical: it holds the Spanish line the learner reads and builds.)
//
// The player's gender is unknown, so nothing the player says, and nothing said to the player, is
// gendered: no nuevo/a, bienvenido/a. Shop people use tú, as many do in Spain; the ticket office
// and the health centre use usted, and the player follows them.
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
// `outro` closes the quest; `item` is what the learner walks away with (el / la + noun); `words`
// are extra nouns for the monsters in the action levels, with their article, so the levels
// practise the gender too (game.js cannot pick lowercase nouns out of the sentences).
// No straight double quotes in any text (scripts/check-lindenau.mjs): use “ ”.
//
// The town comes in areas (AREAS at the end): each has its own map – streets, a square with a
// fountain, buildings (solid; a person stands at the door side), trees – its own Bruno lines
// and three quests. The second area opens once the first is done (game.js).

// --- Villabruno – Morning -------------------------------------------------------------------
const BRUNO_MORGEN = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Plaza Mayor", x: 560, y: 500, clip: "bruno",
  intro: [
    { npc: "¡Hola! Soy Bruno. ¡Te doy la bienvenida a Villabruno!", en: "Hi! I'm Bruno. Welcome to Villabruno!" },
    { npc: "Acabas de llegar. Hoy tienes tres tareas.", en: "You've just arrived. You have three jobs today." },
    { npc: "Compra pan en la panadería, un billete en la estación y pide cita en el centro de salud.", en: "Buy bread at the bakery and a ticket at the station, and make an appointment at the health centre." },
    { npc: "Busca a las personas con un signo de exclamación y habla con ellas. ¡Mucha suerte!", en: "Look for the people with an exclamation mark and talk to them. Good luck!" },
  ],
  waiting: (n) => [{ npc: n === 1 ? "Te queda una tarea. ¡Tú puedes!" : `Te quedan ${n} tareas. ¡Tú puedes!`, en: n === 1 ? "You have one job left. You can do it!" : `You have ${n} jobs left. You can do it!` }],
  done: [
    { npc: "Pan, billete y cita: ¡todo hecho! ¡Muy bien!", en: "Bread, ticket and appointment: all done! Very good!" },
  ],
};

/** Bruno's review before a run, in every area: the sentences missed last time (game.js). */
export const BRUNO_REVIEW = {
  offer: { npc: "¡Qué alegría verte otra vez! ¿Repasamos un poco? Unas frases de la última vez.", en: "How nice to see you again! Shall we review a little? A few sentences from last time." },
  done: { npc: "¡Muy bien, ahora mucho mejor! Vamos a la ciudad.", en: "Very good, much better now! Let's go into town." },
};

const QUESTS_MORGEN = [
  {
    id: "baeckerei", mascot: "hamsti", name: "Hamsti", role: "Panadería",
    x: 300, y: 405, item: { label: "el pan", icon: "1F950" },
    words: ["la barra", "el café", "el euro"],
    turns: [
      {
        npc: "¡Buenos días! ¿Qué te pongo?", en: "Good morning! What can I get you?",
        task: { type: "choose", options: [
          { de: "Quería dos barras de pan, por favor.", ok: true },
          { de: "Tengo dos barras de pan, por favor.", why: "“Tengo” means “I have”. To order politely, say “Quería …, por favor” (I'd like …, please)." },
          { de: "¿Dónde están las barras de pan?", why: "The bread is right in front of you. Say what you want to buy: “Quería …”." },
        ] },
      },
      {
        npc: "Muy bien. ¿Algo más?", en: "Very good. Anything else?",
        task: { type: "say", words: ["Un", "café", "con", "leche,", "por", "favor."], extra: ["Una"],
          why: "“Café” is masculine, so it's “un café”, not “una café”." },
      },
      {
        npc: "Son tres euros con cuarenta.", en: "That's three euros forty.",
        task: { type: "choose", options: [
          { de: "Aquí tienes: tres con cuarenta.", ok: true },
          { de: "Aquí tienes: trece con cuarenta.", why: "Listen again: “tres” is 3, “trece” is 13. It's €3.40." },
          { de: "Gracias, igualmente.", why: "“Igualmente” (you too) answers a good wish. Here the baker is waiting for your money." },
        ] },
      },
      {
        npc: "¡Gracias! ¡Que tengas un buen día!", en: "Thanks! Have a nice day!",
        task: { type: "choose", options: [
          { de: "¡Gracias, igualmente!", ok: true },
          { de: "¡Buenas noches!", why: "It's morning. “Buenas noches” is for the evening and the night." },
          { de: "¡Lo siento!", why: "“Lo siento” (I'm sorry) is for when something goes wrong. To answer a good wish, say “¡Gracias, igualmente!”." },
        ] },
      },
    ],
    outro: { npc: "¡Hasta luego!", en: "See you later!" },
  },
  {
    id: "bahnhof", mascot: "quaki", name: "Quaki", role: "Estación", x: 1000, y: 405,
    item: { label: "el billete", icon: "1F9FE" },
    words: ["el tren", "la vía", "la estación"],
    turns: [
      {
        npc: "Buenos días. ¿A dónde va?", en: "Good morning. Where are you going?",
        task: { type: "say", words: ["Quería", "un", "billete", "a", "Madrid,", "por", "favor."], extra: ["en"],
          why: "For the place you travel to, use “a”: un billete a Madrid." },
      },
      {
        npc: "¿Solo ida, o ida y vuelta?", en: "One way, or return?",
        task: { type: "choose", options: [
          { de: "Ida y vuelta, por favor.", ok: true },
          { de: "Me gustan los trenes.", why: "The question is which ticket you want: “solo ida” (one way) or “ida y vuelta” (return)." },
          { de: "En tren, por favor.", why: "You're already at the station. The question is: “solo ida” or “ida y vuelta”?" },
        ] },
      },
      {
        npc: "¿Y cuándo quiere viajar?", en: "And when would you like to travel?",
        task: { type: "choose", options: [
          { de: "Mañana a las diez.", ok: true },
          { de: "En la estación.", why: "“¿Cuándo?” asks about time. “En la estación” answers “¿Dónde?”." },
          { de: "Dos horas.", why: "“¿Cuándo?” asks when. “Dos horas” answers “¿Cuánto tiempo?” (how long)." },
        ] },
      },
      {
        npc: "Son treinta y nueve euros. Su tren sale a las diez y cinco de la vía tres.", en: "That's thirty-nine euros. Your train leaves at five past ten from platform three.",
        task: { type: "choose", options: [
          { de: "Vale: vía tres, a las diez y cinco. ¡Gracias!", ok: true },
          { de: "Vale: vía diez, a las tres y cinco. ¡Gracias!", why: "Listen again: “la vía tres”, “a las diez y cinco”." },
          { de: "Vale: vía cinco, a las tres y diez. ¡Gracias!", why: "Listen again: “la vía tres”, “a las diez y cinco”." },
        ] },
      },
    ],
    outro: { npc: "¡Buen viaje!", en: "Have a good trip!" },
  },
  {
    id: "arzt", mascot: "aerztin", moji: "1F469-200D-2695", name: "Inés", role: "Centro de salud", x: 300, y: 555,
    item: { label: "la cita", icon: "1F4C5" },
    words: ["el médico", "la cabeza", "el jueves"],
    turns: [
      {
        npc: "Buenos días. ¿En qué puedo ayudarle?", en: "Good morning. How can I help you?",
        task: { type: "say", words: ["Quería", "pedir", "cita", "con", "el", "médico,", "por", "favor."], extra: ["a"],
          why: "The fixed phrase is “pedir cita”, without any small word, and then “con el médico” (with the doctor)." },
      },
      {
        npc: "¿Tiene la tarjeta sanitaria?", en: "Do you have your health card?",
        task: { type: "choose", options: [
          { de: "Sí, aquí la tengo.", ok: true },
          { de: "Sí, soy médico.", why: "She's asking about your “tarjeta sanitaria”, the card you show at the health centre. You're not the doctor!" },
          { de: "No, gracias.", why: "“No, gracias” answers an offer. If you don't have the card with you, say “No, no la tengo”." },
        ] },
      },
      {
        npc: "¿Qué le pasa?", en: "What's wrong?",
        task: { type: "choose", options: [
          { de: "Me duele la cabeza.", ok: true },
          { de: "Tengo la cabeza.", why: "That only says “I have the head”. To say what hurts, use “Me duele…”." },
          { de: "Estoy bien, gracias.", why: "If you're fine, you don't need an appointment. Say what hurts: “Me duele…”." },
        ] },
      },
      {
        npc: "¿Su fecha de nacimiento, por favor?", en: "Your date of birth, please?",
        task: { type: "choose", options: [
          { de: "El 4 de mayo de 1990.", ok: true },
          { de: "Tengo 36 años.", why: "She's asking for your date of birth (day, month, year), not your age." },
          { de: "Hoy es jueves.", why: "Your date of birth is the day, month and year you were born, not a day of the week." },
        ] },
      },
      {
        npc: "Gracias. ¿Puede venir el jueves a las diez?", en: "Thank you. Can you come on Thursday at ten?",
        task: { type: "choose", options: [
          { de: "Sí, me va bien. ¡Hasta el jueves!", ok: true },
          { de: "Sí, estoy bien. ¡Hasta el jueves!", why: "“Estoy bien” says you feel OK. When a time suits you, say “Me va bien”." },
          { de: "Sí, me va bien. ¡Hasta ayer!", why: "“Ayer” is yesterday. The appointment is on Thursday: “¡Hasta el jueves!”." },
        ] },
      },
    ],
    outro: { npc: "Muy bien. ¡Que se mejore, y hasta el jueves!", en: "Very good. Get well soon, and see you on Thursday!" },
  },
];

const MAP_MORGEN = {
  start: { x: 640, y: 660 },
  streets: [{ x: 0, y: 420, w: 1280, h: 120 }, { x: 585, y: 0, w: 110, h: 960 }],
  square: { x: 640, y: 480, r: 160, fountain: 48 },
  rails: { x: 760, y: 40, w: 520, h: 70 },
  buildings: [
    { id: "baeckerei", x: 150, y: 150, w: 300, h: 215, roof: "#c2553d", wall: "#f3e2c7", sign: "Panadería", icon: "1F950", door: "s" },
    { id: "bahnhof", x: 820, y: 130, w: 360, h: 235, roof: "#5f7d8c", wall: "#e7e2d8", sign: "Estación", icon: "1F689", door: "s" },
    { id: "arzt", x: 150, y: 595, w: 300, h: 215, roof: "#7d6a5a", wall: "#eef2f4", sign: "Centro de salud", icon: "1F3E5", door: "n" },
    { id: "haus1", x: 830, y: 610, w: 150, h: 170, roof: "#b07a3b", wall: "#f1e6d6", door: "n" },
    { id: "haus2", x: 1025, y: 610, w: 150, h: 170, roof: "#8a5a7a", wall: "#f1e6d6", door: "n" },
  ],
  trees: [
    [70, 80], [500, 70], [560, 250], [70, 480], [520, 860], [90, 900], [740, 880], [1230, 470],
    [1220, 880], [1240, 70], [740, 250], [500, 640], [780, 700], [1000, 890],
  ],
};

// --- Villabruno – Afternoon -----------------------------------------------------------------
const BRUNO_NACHMITTAG = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Fuente", x: 860, y: 450, clip: "bruno-nachmittag",
  intro: [
    { npc: "¡Hola! Ya es por la tarde en Villabruno. Esta es la parte nueva de la ciudad.", en: "Hi! It's the afternoon in Villabruno now. This is the new part of town." },
    { npc: "Tienes tres tareas otra vez: hacer la compra, saludar a tu vecina y merendar en la cafetería.", en: "You have three jobs again: do the shopping, say hello to your neighbour and have an afternoon snack at the café." },
    { npc: "Las personas con el signo de exclamación ya te esperan. ¡Hasta luego!", en: "The people with the exclamation mark are already waiting for you. See you later!" },
  ],
  waiting: BRUNO_MORGEN.waiting,
  done: [
    { npc: "Compra, vecina y cafetería: ¡todo hecho! ¡Tu español ya es muy bueno!", en: "Shopping, neighbour and café: all done! Your Spanish is really good already!" },
  ],
};

const QUESTS_NACHMITTAG = [
  {
    id: "supermarkt", mascot: "quaki", name: "Quaki", role: "Supermercado", x: 310, y: 410,
    item: { label: "la compra", icon: "1F6D2" },
    words: ["el tomate", "el agua", "la tarjeta"],
    turns: [
      {
        npc: "¡Hola! ¿Te ayudo?", en: "Hi! Can I help you?",
        task: { type: "choose", options: [
          { de: "Sí, gracias. ¿Dónde están los tomates?", ok: true },
          { de: "Sí, gracias. ¿Eres un tomate?", why: "“¿Eres…?” asks who or what a person is. To find something in a shop, ask “¿Dónde están…?”." },
          { de: "Sí, gracias. ¿Dónde está la estación?", why: "You're in a supermarket and you want to buy something. Ask where it is: “¿Dónde están los tomates?”." },
        ] },
      },
      {
        npc: "Ahí, al lado de las zanahorias. ¿Cuántos quieres?", en: "Over there, next to the carrots. How many would you like?",
        task: { type: "say", words: ["Un", "kilo", "de", "tomates,", "por", "favor."], extra: ["Una", "en"],
          why: "After a quantity, use “de”: un kilo de tomates. And “kilo” is masculine: “un kilo”." },
      },
      {
        npc: "¿Algo más?", en: "Anything else?",
        task: { type: "choose", options: [
          { de: "Sí, dos botellas de agua, por favor.", ok: true },
          { de: "Sí, dos botella de agua, por favor.", why: "Una botella, dos botellas: after “dos” the noun takes the plural." },
          { de: "Sí, no quiero.", why: "“Sí” means you want something else, so say what: “Sí, dos botellas de agua”." },
        ] },
      },
      {
        npc: "Son cuatro euros con ochenta.", en: "That's four euros eighty.",
        task: { type: "choose", options: [
          { de: "¿Puedo pagar con tarjeta?", ok: true },
          { de: "¿Puedo pagar con tarta?", why: "“Tarjeta” is a card. “Tarta” is a cake!" },
          { de: "¿Puedo pagar en tarjeta?", why: "In Spanish you pay “con tarjeta”. The small word is “con”." },
        ] },
      },
    ],
    outro: { npc: "Sí, claro. ¡Gracias, y hasta luego!", en: "Yes, of course. Thanks, and see you later!" },
  },
  {
    id: "nachbarin", mascot: "nachbarin", moji: "1F475", name: "Carmen", role: "Vecina", x: 290, y: 620,
    item: { label: "la vecina", icon: "1F44B" },
    words: ["el piso", "la vecina", "el café"],
    turns: [
      {
        npc: "¡Hola! ¿Acabas de llegar?", en: "Hello! Have you just arrived?",
        task: { type: "choose", options: [
          { de: "Sí, vivo aquí desde ayer.", ok: true },
          { de: "Sí, soy ayer.", why: "“Soy” says who you are, and you can't be yesterday. To say since when you live here, use “Vivo aquí desde…”." },
          { de: "Sí, voy a la estación.", why: "Carmen wants to know if you're new in the building. Tell her since when you live here." },
        ] },
      },
      {
        npc: "¡Qué bien! Yo soy Carmen. ¿De dónde eres?", en: "How nice! I'm Carmen. Where are you from?",
        task: { type: "say", words: ["Soy", "de", "Brasil."], extra: ["en", "a"],
          why: "For the country you come from, use “de”: Soy de Brasil." },
      },
      {
        npc: "¡Qué bonito! ¿Y qué haces en Villabruno?", en: "How lovely! And what do you do in Villabruno?",
        task: { type: "choose", options: [
          { de: "Aprendo español aquí.", ok: true },
          { de: "Hago Villabruno.", why: "Carmen is asking about your work or your course, for example: “Aprendo español aquí”." },
          { de: "Soy de Villabruno.", why: "You've just said you're from Brazil, and you're new here. She's asking what you do here." },
        ] },
      },
      {
        npc: "¡Muy bien! Yo vivo en el primero. ¡Ven a tomar un café cuando quieras!", en: "Very good! I live on the first floor. Come for a coffee whenever you like!",
        task: { type: "choose", options: [
          { de: "¡Gracias, muy amable!", ok: true },
          { de: "¡Gracias, muy vieja!", why: "“Vieja” means “old”, which is not a nice thing to say here! For a kind offer, say “Muy amable” (very kind)." },
          { de: "De nada.", why: "“De nada” is what you say when someone thanks you. Here you're the one saying thanks: “¡Gracias, muy amable!”." },
        ] },
      },
    ],
    outro: { npc: "¡De nada! Ya somos vecinos.", en: "You're welcome! Now we're neighbours." },
  },
  {
    id: "cafe", mascot: "hamsti", name: "Hamsti", role: "Cafetería", x: 1140, y: 410,
    item: { label: "la tarta", icon: "1F370" },
    words: ["el té", "el trozo", "la cuenta"],
    turns: [
      {
        npc: "¡Hola! ¿Qué quieres beber?", en: "Hi! What would you like to drink?",
        task: { type: "choose", options: [
          { de: "Un té, por favor.", ok: true },
          { de: "Junto a la ventana, por favor.", why: "Hamsti is asking what you want to drink, not where you want to sit." },
          { de: "Un trozo de tarta, por favor.", why: "“Beber” is to drink. Cake is food: you eat it." },
        ] },
      },
      {
        npc: "Muy bien. ¿Quieres comer algo?", en: "Very good. Would you like something to eat?",
        task: { type: "say", words: ["Sí,", "un", "trozo", "de", "tarta,", "por", "favor."], extra: ["una", "en"],
          why: "“Trozo” (piece) is masculine: “un trozo”, even though “tarta” is feminine." },
      },
      {
        npc: "¿Qué tal la tarta?", en: "How's the cake?",
        task: { type: "choose", options: [
          { de: "Muy rica, gracias. ¿Me traes la cuenta?", ok: true },
          { de: "No, muy rica.", why: "“No” doesn't fit here: the question is “how is it?”. Just say “Muy rica” (delicious)." },
          { de: "Muy rica, gracias. ¿Me traes el cuento?", why: "“El cuento” is a story. The bill is “la cuenta”." },
        ] },
      },
      {
        npc: "Son cinco euros con cincuenta.", en: "That's five euros fifty.",
        task: { type: "choose", options: [
          { de: "Aquí tienes seis euros. Quédate con el cambio.", ok: true },
          { de: "Aquí tienes cinco euros. Quédate con el cambio.", why: "Five euros isn't enough. It costs five euros fifty." },
          { de: "Aquí tienes seis euros. ¡Que te mejores!", why: "“Que te mejores” is for people who are ill. To leave a little extra, say “Quédate con el cambio”." },
        ] },
      },
    ],
    outro: { npc: "¡Muchas gracias! ¡Que vaya bien!", en: "Thank you very much! Take care!" },
  },
];

const MAP_NACHMITTAG = {
  start: { x: 700, y: 515 },
  streets: [{ x: 0, y: 460, w: 1280, h: 110 }, { x: 880, y: 0, w: 110, h: 960 }],
  square: { x: 935, y: 515, r: 130, fountain: 40 },
  rails: null,
  buildings: [
    { id: "supermarkt", x: 120, y: 140, w: 380, h: 230, roof: "#4f7a5a", wall: "#eef3ea", sign: "Supermercado", icon: "1F6D2", door: "s" },
    { id: "cafe", x: 1030, y: 160, w: 220, h: 210, roof: "#a0522d", wall: "#f6ead8", sign: "Cafetería", icon: "2615", door: "s" },
    { id: "wohnhaus", x: 140, y: 660, w: 300, h: 220, roof: "#6a6f8a", wall: "#f1e6d6", sign: "Pisos", icon: "1F3E0", door: "n" },
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
  { id: "morgen", title: "Villabruno, por la mañana", bruno: BRUNO_MORGEN, quests: QUESTS_MORGEN, ...MAP_MORGEN },
  { id: "nachmittag", title: "Villabruno, por la tarde", bruno: BRUNO_NACHMITTAG, quests: QUESTS_NACHMITTAG, ...MAP_NACHMITTAG },
];
export const areaById = (id) => AREAS.find((a) => a.id === id) ?? AREAS[0];

/** What the shop people say when the learner comes too early or comes back. */
export const NOT_YET = { npc: "¡Hola! Primero habla con Bruno, en la plaza.", en: "Hi! First, go and talk to Bruno in the square." };
export const AGAIN = { npc: "¡Qué alegría verte otra vez!", en: "How nice to see you again!" };

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
// There are no Spanish clips yet (the folder does not exist): until they are generated,
// spielKit's voice falls back to the browser's Spanish voice for every line.
// One voice per mascot (Spain); the learner's replies in one more voice (`du`).
export const VOICES = {
  bruno: "es-ES-AlvaroNeural",
  hamsti: "es-ES-ElviraNeural",
  quaki: "es-ES-DarioNeural",
  // Regi is the player now (Super-Blubb); the health centre and the neighbour have their own voices.
  aerztin: "es-ES-IreneNeural",
  nachbarin: "es-ES-EstrellaNeural",
  du: "es-ES-XimenaNeural",
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
