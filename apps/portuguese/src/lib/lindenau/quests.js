// "The Legend of Vila Bruno" (/games/vila-bruno; internal id:
// lindenau): who stands where and what they say. One quest per person, A1, everyday errands in
// Vila Bruno, an invented Portuguese town (no real freguesia or município has the name; checked
// by games-dialogue, 2026-11-22). The Portuguese is the content (npc / de, European Portuguese);
// `en` is its English meaning, the 💡 Help line. (The key `de` is historical: it holds the
// Portuguese line the learner reads and builds.)
//
// The player's gender is unknown, so nothing the player says, and nothing said to the player, is
// gendered: no novo/a, bem-vindo/a, and the player never says obrigado / obrigada (they answer
// with Igualmente, É muito amável, Fique com o troco …). Bruno uses tu with the player; the shop
// people, the ticket office, the centro de saúde and the older neighbour use the formal third
// person (o que vai ser?, pode vir?), as is usual with strangers in Portugal, and the player
// follows them (Aqui tem, Fique com o troco).
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
// `outro` closes the quest; `item` is what the learner walks away with (o / a / os / as + noun);
// `words` are extra nouns for the monsters in the action levels, with their article, so the
// levels practise the gender too (game.js cannot pick lowercase nouns out of the sentences).
// No straight double quotes in any text (scripts/check-lindenau.mjs): use “ ”.
//
// The town comes in areas (AREAS at the end): each has its own map – streets, a square with a
// fountain, buildings (solid; a person stands at the door side), trees – its own Bruno lines
// and three quests. The second area opens once the first is done (game.js).

/**
 * All lines are European Portuguese (pt-PT). For a later Brazil mode (ptBR): the formal third
 * person with strangers becomes você (Para onde você vai?), enclisis becomes proclisis (Pode me
 * trazer a conta?), comboio → trem, linha (platform) → plataforma, pastelaria → padaria, carcaça →
 * pãozinho, galão → café com leite, número de utente → cartão do SUS, Faltam-te → Faltam,
 * estou a aprender → estou aprendendo, se faz favor → por favor.
 */
export const VARIETY = "pt-PT";

// --- Vila Bruno – Morning -------------------------------------------------------------------
const BRUNO_MORGEN = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Praça", x: 560, y: 500, clip: "bruno",
  intro: [
    { npc: "Olá! Sou o Bruno. Boas-vindas a Vila Bruno!", en: "Hi! I'm Bruno. Welcome to Vila Bruno!" },
    { npc: "Acabaste de chegar. Hoje tens três tarefas.", en: "You've just arrived. You have three jobs today." },
    { npc: "Compra pão na pastelaria, compra um bilhete na estação de comboios e marca uma consulta no centro de saúde.", en: "Buy bread at the pastelaria, buy a ticket at the train station and book an appointment at the health centre." },
    { npc: "Procura as pessoas com um ponto de exclamação e fala com elas. Boa sorte!", en: "Look for the people with an exclamation mark and talk to them. Good luck!" },
  ],
  waiting: (n) => [{ npc: n === 1 ? "Falta-te uma tarefa. Tu consegues!" : `Faltam-te ${n} tarefas. Tu consegues!`, en: n === 1 ? "You have one job left. You can do it!" : `You have ${n} jobs left. You can do it!` }],
  done: [
    { npc: "Pão, bilhete e consulta: está tudo feito! Muito bem!", en: "Bread, ticket and appointment: all done! Very good!" },
  ],
};

/** Bruno's review before a run, in every area: the sentences missed last time (game.js). */
export const BRUNO_REVIEW = {
  offer: { npc: "Que bom ver-te outra vez! Vamos rever um bocadinho? Umas frases da última vez.", en: "How nice to see you again! Shall we review a little? A few sentences from last time." },
  done: { npc: "Muito bem, agora está muito melhor! Vamos lá para a vila.", en: "Very good, much better now! Let's go into town." },
};

const QUESTS_MORGEN = [
  {
    id: "baeckerei", mascot: "hamsti", name: "Hamsti", role: "Pastelaria",
    x: 300, y: 405, item: { label: "o pão", icon: "1F950" },
    words: ["a carcaça", "o galão", "o euro"],
    turns: [
      {
        npc: "Bom dia! O que vai ser?", en: "Good morning! What'll it be?",
        task: { type: "choose", options: [
          { de: "Queria duas carcaças, se faz favor.", ok: true },
          { de: "Tenho duas carcaças, se faz favor.", why: "“Tenho” means “I have”. To order politely, say “Queria …, se faz favor” (I'd like …, please)." },
          { de: "Onde estão as carcaças?", why: "The bread is right in front of you. Say what you want to buy: “Queria …”. (A carcaça is a crusty bread roll.)" },
        ] },
      },
      {
        npc: "Muito bem. Mais alguma coisa?", en: "Very good. Anything else?",
        task: { type: "say", words: ["Um", "galão,", "se", "faz", "favor."], extra: ["Uma"],
          why: "“Galão” is masculine, so it's “um galão”, not “uma galão”. (A galão is milky coffee served in a glass.)" },
      },
      {
        npc: "São dois euros e quarenta.", en: "That's two euros forty.",
        task: { type: "choose", options: [
          { de: "Aqui tem: dois e quarenta.", ok: true },
          { de: "Aqui tem: doze e quarenta.", why: "Listen again: “dois” is 2, “doze” is 12. It's €2.40." },
          { de: "Igualmente.", why: "“Igualmente” (you too) answers a good wish. Here the shop assistant is waiting for your money." },
        ] },
      },
      {
        npc: "Aqui tem o troco. Tenha um bom dia!", en: "Here's your change. Have a nice day!",
        task: { type: "choose", options: [
          { de: "Igualmente! Até logo!", ok: true },
          { de: "Boa noite!", why: "It's morning. “Boa noite” is for the evening and the night." },
          { de: "Lamento!", why: "“Lamento” (I'm sorry) is for when something goes wrong. To answer a good wish, say “Igualmente!” (you too)." },
        ] },
      },
    ],
    outro: { npc: "Até logo!", en: "See you later!" },
  },
  {
    id: "bahnhof", mascot: "quaki", name: "Quaki", role: "Estação de comboios", x: 1000, y: 405,
    item: { label: "o bilhete", icon: "1F9FE" },
    words: ["o comboio", "a linha", "a estação"],
    turns: [
      {
        npc: "Bom dia. Para onde vai?", en: "Good morning. Where are you going?",
        task: { type: "say", words: ["Queria", "um", "bilhete", "para", "Lisboa,", "se", "faz", "favor."], extra: ["em"],
          why: "For the place you travel to, use “para”: um bilhete para Lisboa." },
      },
      {
        npc: "Só ida, ou ida e volta?", en: "One way, or return?",
        task: { type: "choose", options: [
          { de: "Ida e volta, se faz favor.", ok: true },
          { de: "Gosto muito de comboios.", why: "The question is which ticket you want: “só ida” (one way) or “ida e volta” (return)." },
          { de: "De comboio, se faz favor.", why: "You're already at the station. The question is: “só ida” or “ida e volta”?" },
        ] },
      },
      {
        npc: "E quando quer viajar?", en: "And when would you like to travel?",
        task: { type: "choose", options: [
          { de: "Amanhã às dez.", ok: true },
          { de: "Na estação.", why: "“Quando?” asks about time. “Na estação” answers “Onde?” (where)." },
          { de: "Duas horas.", why: "“Quando?” asks when. “Duas horas” answers “Quanto tempo?” (how long)." },
        ] },
      },
      {
        npc: "São vinte e dois euros. O seu comboio parte às dez e cinco da linha três.", en: "That's twenty-two euros. Your train leaves at five past ten from platform three.",
        task: { type: "choose", options: [
          { de: "Muito bem: linha três, às dez e cinco.", ok: true },
          { de: "Muito bem: linha dez, às três e cinco.", why: "Listen again: “a linha três”, “às dez e cinco”. At a Portuguese station the platform is “a linha”." },
          { de: "Muito bem: linha cinco, às três e dez.", why: "Listen again: “a linha três”, “às dez e cinco”." },
        ] },
      },
    ],
    outro: { npc: "Boa viagem!", en: "Have a good trip!" },
  },
  {
    id: "arzt", mascot: "aerztin", moji: "1F469-200D-2695", name: "Sónia", role: "Centro de saúde", x: 300, y: 555,
    item: { label: "a consulta", icon: "1F4C5" },
    words: ["o médico", "a cabeça", "a quinta-feira"],
    turns: [
      {
        npc: "Bom dia. Em que posso ajudar?", en: "Good morning. How can I help you?",
        task: { type: "say", words: ["Queria", "marcar", "uma", "consulta,", "se", "faz", "favor."], extra: ["fazer"],
          why: "The fixed phrase is “marcar uma consulta” (to book an appointment)." },
      },
      {
        npc: "Tem o número de utente?", en: "Do you have your health service user number?",
        task: { type: "choose", options: [
          { de: "Tenho, está aqui.", ok: true },
          { de: "Tenho trinta e seis anos.", why: "She's asking for your “número de utente”, your number in the National Health Service (SNS), not your age." },
          { de: "Não, não quero.", why: "“Não quero” turns down an offer. If you don't have the number with you, say “Não o tenho aqui” (I don't have it here)." },
        ] },
      },
      {
        npc: "O que é que tem?", en: "What's wrong?",
        task: { type: "choose", options: [
          { de: "Dói-me a cabeça.", ok: true },
          { de: "Tenho a cabeça.", why: "That only says “I have the head”. To say what hurts, use “Dói-me…”." },
          { de: "Estou bem, não é nada.", why: "If you're fine, you don't need an appointment. Say what hurts: “Dói-me…”." },
        ] },
      },
      {
        npc: "A sua data de nascimento, por favor?", en: "Your date of birth, please?",
        task: { type: "choose", options: [
          { de: "Quatro de maio de 1990.", ok: true },
          { de: "Tenho 36 anos.", why: "She's asking for your date of birth (day, month, year), not your age." },
          { de: "Hoje é quinta-feira.", why: "Your date of birth is the day, month and year you were born, not a day of the week." },
        ] },
      },
      {
        npc: "Pode vir na quinta-feira às dez?", en: "Can you come on Thursday at ten?",
        task: { type: "choose", options: [
          { de: "Posso, sim. Até quinta!", ok: true },
          { de: "Estou bem, sim. Até quinta!", why: "“Estou bem” says you feel OK. When a time suits you, say “Posso” (I can) or “Dá-me jeito” (that suits me)." },
          { de: "Posso, sim. Até ontem!", why: "“Ontem” is yesterday. The appointment is on Thursday: “Até quinta!”." },
        ] },
      },
    ],
    outro: { npc: "Muito bem. As melhoras, e até quinta!", en: "Very good. Get well soon, and see you on Thursday!" },
  },
];

const MAP_MORGEN = {
  start: { x: 640, y: 660 },
  streets: [{ x: 0, y: 420, w: 1280, h: 120 }, { x: 585, y: 0, w: 110, h: 960 }],
  square: { x: 640, y: 480, r: 160, fountain: 48 },
  rails: { x: 760, y: 40, w: 520, h: 70 },
  buildings: [
    { id: "baeckerei", x: 150, y: 150, w: 300, h: 215, roof: "#c2553d", wall: "#f3e2c7", sign: "Pastelaria", icon: "1F950", door: "s" },
    { id: "bahnhof", x: 820, y: 130, w: 360, h: 235, roof: "#5f7d8c", wall: "#e7e2d8", sign: "Estação", icon: "1F689", door: "s" },
    { id: "arzt", x: 150, y: 595, w: 300, h: 215, roof: "#7d6a5a", wall: "#eef2f4", sign: "Centro de Saúde", icon: "1F3E5", door: "n" },
    { id: "haus1", x: 830, y: 610, w: 150, h: 170, roof: "#b07a3b", wall: "#f1e6d6", door: "n" },
    { id: "haus2", x: 1025, y: 610, w: 150, h: 170, roof: "#8a5a7a", wall: "#f1e6d6", door: "n" },
  ],
  trees: [
    [70, 80], [500, 70], [560, 250], [70, 480], [520, 860], [90, 900], [740, 880], [1230, 470],
    [1220, 880], [1240, 70], [740, 250], [500, 640], [780, 700], [1000, 890],
  ],
};

// --- Vila Bruno – Afternoon -----------------------------------------------------------------
const BRUNO_NACHMITTAG = {
  id: "bruno", mascot: "bruno", name: "Bruno", role: "Fonte", x: 860, y: 450, clip: "bruno-nachmittag",
  intro: [
    { npc: "Olá! Já é de tarde em Vila Bruno. Esta é a parte nova da vila.", en: "Hi! It's the afternoon in Vila Bruno now. This is the new part of town." },
    { npc: "Tens outra vez três tarefas: fazer compras na mercearia, cumprimentar a tua vizinha e lanchar no café.", en: "You have three jobs again: do some shopping at the grocer's, say hello to your neighbour and have an afternoon snack at the café." },
    { npc: "As pessoas com o ponto de exclamação já estão à tua espera. Até já!", en: "The people with the exclamation mark are already waiting for you. See you soon!" },
  ],
  waiting: BRUNO_MORGEN.waiting,
  done: [
    { npc: "Mercearia, vizinha e café: está tudo feito! O teu português já está muito bom!", en: "Grocer's, neighbour and café: all done! Your Portuguese is really good already!" },
  ],
};

const QUESTS_NACHMITTAG = [
  {
    id: "supermarkt", mascot: "quaki", name: "Quaki", role: "Mercearia", x: 310, y: 410,
    item: { label: "as compras", icon: "1F6D2" },
    words: ["o tomate", "a água", "o cartão"],
    turns: [
      {
        npc: "Boa tarde! Precisa de ajuda?", en: "Good afternoon! Do you need any help?",
        task: { type: "choose", options: [
          { de: "Preciso, sim. Onde estão os tomates?", ok: true },
          { de: "Preciso, sim. É um tomate?", why: "“É…?” asks who or what someone is. To find something in a shop, ask “Onde estão…?” (where are…?)." },
          { de: "Preciso, sim. Onde é a estação?", why: "You're in a shop and you want to buy something. Ask where it is: “Onde estão os tomates?”." },
        ] },
      },
      {
        npc: "Ali, ao lado das cenouras. Quantos quer?", en: "Over there, next to the carrots. How many would you like?",
        task: { type: "say", words: ["Um", "quilo", "de", "tomates,", "se", "faz", "favor."], extra: ["Uma", "em"],
          why: "After a quantity, use “de”: um quilo de tomates. And “quilo” is masculine: “um quilo”." },
      },
      {
        npc: "Mais alguma coisa?", en: "Anything else?",
        task: { type: "choose", options: [
          { de: "Sim, duas garrafas de água, se faz favor.", ok: true },
          { de: "Sim, duas garrafa de água, se faz favor.", why: "Uma garrafa, duas garrafas: after “duas” the noun takes the plural. (And it's duas, not dois, because garrafa is feminine.)" },
          { de: "Sim, não quero.", why: "“Sim” means you want something else, so say what: “Sim, duas garrafas de água”." },
        ] },
      },
      {
        npc: "São quatro euros e oitenta.", en: "That's four euros eighty.",
        task: { type: "choose", options: [
          { de: "Posso pagar com cartão?", ok: true },
          { de: "Posso pagar com cartaz?", why: "“Cartão” is a card. “Cartaz” is a poster!" },
          { de: "Posso pagar o cartão?", why: "“Pagar o cartão” means paying for the card itself. You pay “com cartão” (by card)." },
        ] },
      },
    ],
    outro: { npc: "Pode, claro. Até logo!", en: "Of course you can. See you later!" },
  },
  {
    id: "nachbarin", mascot: "nachbarin", moji: "1F475", name: "Dona Rosa", role: "Vizinha", x: 290, y: 620,
    item: { label: "a vizinha", icon: "1F44B" },
    words: ["o andar", "a vizinha", "o café"],
    turns: [
      {
        npc: "Olá! Chegou agora?", en: "Hello! Have you just arrived?",
        task: { type: "choose", options: [
          { de: "Cheguei. Moro aqui desde ontem.", ok: true },
          { de: "Sim, sou ontem.", why: "“Sou” says who you are, and you can't be yesterday! To say since when you live here, use “Moro aqui desde…”." },
          { de: "Sim, vou para a estação.", why: "Dona Rosa wants to know if you're new in the building. Tell her since when you live here." },
        ] },
      },
      {
        npc: "Que bom! Eu sou a Dona Rosa. De onde é?", en: "How nice! I'm Dona Rosa. Where are you from?",
        task: { type: "say", words: ["Sou", "do", "Brasil."], extra: ["de", "em"],
          why: "O Brasil takes the article, so de + o = do: Sou do Brasil. Countries without an article take de alone: Sou de Angola, Sou de Portugal." },
      },
      {
        npc: "Que bonito! E o que é que faz em Vila Bruno?", en: "How lovely! And what do you do in Vila Bruno?",
        task: { type: "choose", options: [
          { de: "Estou a aprender português aqui.", ok: true },
          { de: "Faço Vila Bruno.", why: "Dona Rosa is asking about your work or your course, for example: “Estou a aprender português aqui” (I'm learning Portuguese here)." },
          { de: "Sou de Vila Bruno.", why: "You've just said you're from Brazil, and you're new here. She's asking what you do here." },
        ] },
      },
      {
        npc: "Muito bem! Eu moro no primeiro andar. Venha tomar um café quando quiser!", en: "Very good! I live on the first floor. Come for a coffee whenever you like!",
        task: { type: "choose", options: [
          { de: "É muito amável, Dona Rosa!", ok: true },
          { de: "É muito velha, Dona Rosa!", why: "“Velha” means “old”, which is not a nice thing to say here! For a kind offer, say “É muito amável” (that's very kind of you)." },
          { de: "De nada.", why: "“De nada” is what you say when someone thanks you. Here you answer a kind offer: “É muito amável!”." },
        ] },
      },
    ],
    outro: { npc: "Ora essa! Agora já nos conhecemos.", en: "Not at all! Now we know each other." },
  },
  {
    id: "cafe", mascot: "hamsti", name: "Hamsti", role: "Café", x: 1140, y: 410,
    item: { label: "o bolo", icon: "1F370" },
    words: ["o chá", "a fatia", "a conta"],
    turns: [
      {
        npc: "Olá! O que vai beber?", en: "Hi! What would you like to drink?",
        task: { type: "choose", options: [
          { de: "Um chá, se faz favor.", ok: true },
          { de: "Ao pé da janela, se faz favor.", why: "Hamsti is asking what you want to drink, not where you want to sit." },
          { de: "Uma fatia de bolo, se faz favor.", why: "“Beber” is to drink. Cake is food: you eat it." },
        ] },
      },
      {
        npc: "Muito bem. Quer comer alguma coisa?", en: "Very good. Would you like something to eat?",
        task: { type: "say", words: ["Sim,", "uma", "fatia", "de", "bolo,", "se", "faz", "favor."], extra: ["um", "em"],
          why: "“Fatia” (slice) is feminine: “uma fatia”, even though “bolo” is masculine." },
      },
      {
        npc: "Então, o bolo está bom?", en: "So, is the cake good?",
        task: { type: "choose", options: [
          { de: "Está ótimo! Pode trazer-me a conta?", ok: true },
          { de: "Não, está ótimo.", why: "“Não” doesn't fit: the cake is good. Just say “Está ótimo!” (it's great)." },
          { de: "Está ótimo! Pode trazer-me o conto?", why: "“O conto” is a short story. The bill is “a conta”." },
        ] },
      },
      {
        npc: "São cinco euros e cinquenta.", en: "That's five euros fifty.",
        task: { type: "choose", options: [
          { de: "Aqui tem seis euros. Fique com o troco.", ok: true },
          { de: "Aqui tem cinco euros. Fique com o troco.", why: "Five euros isn't enough. It costs five euros fifty." },
          { de: "Aqui tem seis euros. As melhoras!", why: "“As melhoras” (get well soon) is for people who are ill. To leave a little extra, say “Fique com o troco” (keep the change)." },
        ] },
      },
    ],
    outro: { npc: "Agradeço imenso! Até à próxima!", en: "Thank you so much! See you next time!" },
  },
];

const MAP_NACHMITTAG = {
  start: { x: 700, y: 515 },
  streets: [{ x: 0, y: 460, w: 1280, h: 110 }, { x: 880, y: 0, w: 110, h: 960 }],
  square: { x: 935, y: 515, r: 130, fountain: 40 },
  rails: null,
  buildings: [
    { id: "supermarkt", x: 120, y: 140, w: 380, h: 230, roof: "#4f7a5a", wall: "#eef3ea", sign: "Mercearia", icon: "1F6D2", door: "s" },
    { id: "cafe", x: 1030, y: 160, w: 220, h: 210, roof: "#a0522d", wall: "#f6ead8", sign: "Café", icon: "2615", door: "s" },
    { id: "wohnhaus", x: 140, y: 660, w: 300, h: 220, roof: "#6a6f8a", wall: "#f1e6d6", sign: "Prédio", icon: "1F3E0", door: "n" },
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
  { id: "morgen", title: "Vila Bruno, de manhã", bruno: BRUNO_MORGEN, quests: QUESTS_MORGEN, ...MAP_MORGEN },
  { id: "nachmittag", title: "Vila Bruno, à tarde", bruno: BRUNO_NACHMITTAG, quests: QUESTS_NACHMITTAG, ...MAP_NACHMITTAG },
];
export const areaById = (id) => AREAS.find((a) => a.id === id) ?? AREAS[0];

/** What the shop people say when the learner comes too early or comes back. */
export const NOT_YET = { npc: "Olá! Primeiro fala com o Bruno, na praça.", en: "Hi! First, go and talk to Bruno in the square." };
export const AGAIN = { npc: "Que bom ver-te outra vez!", en: "How nice to see you again!" };

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
// There are no Portuguese clips yet (the folder does not exist): until they are generated,
// spielKit's voice falls back to the browser's Portuguese voice (pt-PT if installed, else the
// first pt voice, often pt-BR) for every line.
// Azure has only a few pt-PT neural voices (names to verify when the generate script is written),
// so some mascots share one; the learner's replies in one more voice (`du`).
export const VOICES = {
  bruno: "pt-PT-DuarteNeural",
  hamsti: "pt-PT-RaquelNeural",
  quaki: "pt-PT-DuarteNeural",
  // Regi is the player now (Super-Blubb); the health centre and the neighbour have their own voices.
  aerztin: "pt-PT-FernandaNeural",
  nachbarin: "pt-PT-RaquelNeural",
  du: "pt-PT-FernandaNeural",
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
