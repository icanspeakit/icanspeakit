// The Manners Simulator (/games/manners): the scenes of one day in Spain, in five areas.
//
// A scene = place + backdrop + people + turns. A turn: someone says something (`npc`, Spanish,
// with its English meaning `en`) or a `situation` (English) sets the scene, then the learner
// picks one of 3–4 `options`. There is no single right answer: every option moves the liking of
// the turn's person (`who`) by `delta` (−20 … +20) and the reputation by delta / 2.
//   bands: best +12 … +20 · okay +3 … +8 · awkward −3 … −8 · barbarian −12 … −20
//   at least one option ≥ +10 per turn, never two with the same top delta.
// Each option: `de` (what you say, in Spanish – the key name is kept from the German game;
// stage directions in parentheses are English), `en` (its English meaning, under 💡 Help),
// `tag` (the floating label, English), `react` (the person's answer in Spanish, said by `who`
// unless `by` names someone else; only-parentheses reactions are English stage directions),
// `reactEn` (its English meaning; none for stage directions) and `why` (one short English
// sentence, shown for good answers too).
// `more` links the culture / insider topic that explains the scene.
// A `wheel: n` turn is the small-talk wheel instead (n topics to pick; `du` = tú, otherwise
// usted; see TOPICS below and the person's hidden `talk`).
//
// The Spanish is the content (A2–B1, Castilian: vosotros, Spain vocabulary). The player's gender
// is unknown, so the player's lines and what people say to the player avoid gendered forms
// (no encantado/a, cansado/a, nuevo/a); Álex in the date is written without gender too
// (scripts/check-knigge.mjs). Tone: funny, never mean – jokes about behaviour, never about
// groups; no comments on bodies, origin or gender; "many people", not "the Spanish". Etiquette
// is common practice, not law.

/** The players' mascots; the people they meet are played by the other three. */
export const PLAYERS = ["bruno", "regi", "hamsti", "quaki"];

/** The mood bubble: OpenMoji by the last delta. */
export const MOODS = [
  { min: 12, icon: "1F604", expr: "celebrate" },
  { min: 3, icon: "1F642", expr: "happy" },
  { min: -2, icon: "1F914", expr: "thinking" },
  { min: -11, icon: "1F62C", expr: "oops" },
  { min: -99, icon: "1F631", expr: "oops" },
];

/** End-of-day titles by final reputation (`de` = the English fallback; key name kept). */
export const TITLES = [
  { min: 90, key: "kn.title.profi", de: "Etiquette pro", icon: "1F3A9" },
  { min: 75, key: "kn.title.charme", de: "Charmer", icon: "1F31F" },
  { min: 55, key: "kn.title.nett", de: "Nice person", icon: "1F642" },
  { min: 35, key: "kn.title.barbar", de: "Little barbarian", icon: "1F62C" },
  { min: -1, key: "kn.title.hoehle", de: "Cave dweller", icon: "1F9B4" },
];

export const titleFor = (ruf) => TITLES.find((x) => ruf >= x.min);

/**
 * The small-talk wheel: in a `wheel` turn the learner picks topics instead of replies. Each
 * person has hidden `talk` = { likes, dislikes, taboo } (topic ids); everything else is
 * neutral. Like +14, neutral +5, dislike −5, taboo −15. `say` is what the learner says (`sie` =
 * usted, `du` = tú; key names kept), `re` the person's answer per kind; `sayEn` and `reEn` are
 * their English meanings. A liked topic, once found, shows a 💡 next time.
 */
export const TOPICS = [
  { id: "wetter", label: "Weather", icon: "2600",
    say: { sie: "Hace un día estupendo, ¿verdad?", du: "Qué día más bueno hace, ¿no?" },
    sayEn: { sie: "It's a lovely day, isn't it?", du: "What a nice day, isn't it?" },
    re: { like: "¡Buenísimo! He salido a correr antes de trabajar.", ok: "Sí, da gusto ver el sol.", dislike: "Bueno. Hace el tiempo que hace." },
    reEn: { like: "Wonderful! I went for a run before work.", ok: "Yes, it's nice to see the sun.", dislike: "Well. The weather is the weather." } },
  { id: "wochenende", label: "Weekend", icon: "1F389",
    say: { sie: "¿Tiene planes para el fin de semana?", du: "¿Tienes planes para el finde?" },
    sayEn: { sie: "Do you have any plans for the weekend?", du: "Got any plans for the weekend?" },
    re: { like: "¡Sí! Me voy a la playa. ¡Qué ganas!", ok: "Nada especial, descansar.", dislike: "Ay, me toca trabajar." },
    reEn: { like: "Yes! I'm going to the beach. I can't wait!", ok: "Nothing special, just resting.", dislike: "Oh, I have to work." } },
  { id: "arbeit", label: "Work", icon: "1F4BC",
    say: { sie: "¿Y usted a qué se dedica?", du: "¿Mucho lío en el trabajo?" },
    sayEn: { sie: "And what do you do for a living?", du: "Busy at work?" },
    re: { like: "¡Me encanta mi trabajo!", ok: "Bien, gracias.", dislike: "Por favor, no hablemos de trabajo…" },
    reEn: { like: "I love my job!", ok: "Fine, thanks.", dislike: "Please, let's not talk about work…" } },
  { id: "hobbys", label: "Hobbies", icon: "1F3B8",
    say: { sie: "¿Qué le gusta hacer en su tiempo libre?", du: "¿Qué te gusta hacer en tu tiempo libre?" },
    sayEn: { sie: "What do you like doing in your free time?", du: "What do you like doing in your free time?" },
    re: { like: "Toco la guitarra, ¡casi todas las noches!", ok: "Me gusta leer.", dislike: "¿Tiempo libre? Ahora mismo no tengo." },
    reEn: { like: "I play the guitar, nearly every night!", ok: "I like reading.", dislike: "Free time? I don't have any right now." } },
  { id: "essen", label: "Food", icon: "1F35D",
    say: { sie: "¿Conoce algún sitio bueno para comer por aquí?", du: "¿Conoces algún sitio bueno para comer por aquí?" },
    sayEn: { sie: "Do you know a good place to eat around here?", du: "Do you know a good place to eat around here?" },
    re: { like: "¡Sí! A la vuelta de la esquina hay un bar con unas croquetas buenísimas.", ok: "Mmm, el bar de la esquina no está mal.", dislike: "Yo prefiero comer en casa." },
    reEn: { like: "Yes! Round the corner there's a bar with amazing croquettes.", ok: "Hmm, the bar on the corner isn't bad.", dislike: "I prefer eating at home." } },
  { id: "urlaub", label: "Holidays", icon: "1F3D6",
    say: { sie: "¿Ha ido de vacaciones este año?", du: "¿Has ido a algún sitio este verano?" },
    sayEn: { sie: "Have you been on holiday this year?", du: "Have you been anywhere this summer?" },
    re: { like: "¡Sí, a Asturias! Precioso.", ok: "Todavía no, quizá en otoño.", dislike: "¿Vacaciones? Ojalá." },
    reEn: { like: "Yes, to Asturias! Beautiful.", ok: "Not yet, maybe in the autumn.", dislike: "A holiday? I wish." } },
  { id: "gehalt", label: "Salary", icon: "1F4B6",
    say: { sie: "¿Y cuánto gana usted?", du: "¿Y tú cuánto ganas?" },
    sayEn: { sie: "And how much do you earn?", du: "And how much do you earn?" },
    re: { taboo: "Eso… prefiero no decirlo." },
    reEn: { taboo: "That's… something I'd rather not say." },
    why: "Many people don't talk about their pay with strangers or colleagues: they find it too private." },
  { id: "aussehen", label: "Looks", icon: "1FA9E",
    say: { sie: "Tiene usted mala cara.", du: "Qué mala cara tienes." },
    sayEn: { sie: "You don't look well.", du: "You look awful." },
    re: { taboo: "Vaya. Gracias. Muy amable…" },
    reEn: { taboo: "Well. Thanks. Very kind…" },
    why: "Comments on how someone looks or on their weight are best left out of small talk, even if you mean well." },
  { id: "politik", label: "Politics", icon: "1F5F3",
    say: { sie: "¿Qué opina usted del Gobierno?", du: "¿Qué te parece el Gobierno?" },
    sayEn: { sie: "What's your opinion of the government?", du: "What do you think of the government?" },
    re: { taboo: "Prefiero no hablar de eso.", like: "¡Buena pregunta! Yo creo que…", ok: "Mmm, es un tema complicado.", dislike: "Uf, mejor no." },
    reEn: { taboo: "I'd rather not talk about that.", like: "Good question! I think…", ok: "Hmm, that's a complicated subject.", dislike: "Ugh, better not." },
    why: "Friends in Spain may argue about politics happily, but with someone you've just met it's safer to avoid it." },
  { id: "liebe", label: "Love & exes", icon: "1F48D",
    say: { sie: "¿Tiene usted pareja?", du: "¿Y qué es de tu ex?" },
    sayEn: { sie: "Do you have a partner?", du: "So what's your ex up to?" },
    re: { taboo: "Eso es privado.", ok: "Uf, es una historia muy larga.", like: "¡Ay, justo me acabo de enamorar!", dislike: "Mejor hablamos de otra cosa." },
    reEn: { taboo: "That's private.", ok: "Ugh, it's a very long story.", like: "Oh, I've just fallen in love!", dislike: "Let's talk about something else." },
    why: "Love and exes are private. Friends talk about them; people who have only just met usually don't." },
];

export const topicById = (id) => TOPICS.find((x) => x.id === id) ?? null;
/** "like" | "ok" | "dislike" | "taboo" for a person's hidden taste. */
export const topicKind = (talk, id) =>
  talk?.taboo?.includes(id) ? "taboo" : talk?.likes?.includes(id) ? "like" : talk?.dislikes?.includes(id) ? "dislike" : "ok";
export const TOPIC_DELTA = { like: 14, ok: 5, dislike: -5, taboo: -15 };

const unterwegs = [
  {
    id: "baeckerei", place: "At the bakery", backdrop: "baeckerei",
    props: [{ icon: "1F950", x: 14, y: 30 }, { icon: "1F35E", x: 30, y: 26 }, { icon: "1F370", x: 78, y: 28 }],
    people: [
      { id: "kunde", mascot: "quaki", name: "Señor Ruiz", role: "customer waiting" },
      { id: "verkaeuferin", mascot: "hamsti", name: "Nuria", role: "shop assistant" },
    ],
    turns: [
      {
        who: "kunde", situation: "Eight in the morning. A few people are standing around the shop, not in a line. You walk straight to the counter.",
        npc: "Perdona, pero yo estaba antes.", en: "Excuse me, but I was here before you.",
        options: [
          { de: "¡Uy, perdón! ¿Quién es el último?", en: "Oh, sorry! Who's last?", delta: 15, tag: "😊 Knows the ritual",
            react: "Yo. Vas detrás de mí.", reactEn: "Me. You're after me.", why: "A Spanish queue is often a loose group, not a line. When you come in, you ask ¿Quién es el último? (or ¿la última?) and then you know your turn." },
          { de: "¿Seguro? No te he visto.", en: "Are you sure? I didn't see you.", delta: 4, tag: "😐 A bit stubborn",
            react: "Sí, estaba junto a la estantería.", reactEn: "Yes, I was by the shelf.", why: "Asking is OK. But the people there know who came first, so listen to them." },
          { de: "Es que tengo mucha prisa.", en: "It's just that I'm in a big hurry.", delta: -8, tag: "😬 Queue jumper",
            react: "Y yo. Y todos.", reactEn: "So am I. So is everyone.", why: "You can ask ¿Me dejas pasar? (Can I go ahead?), but being in a hurry doesn't give you the turn." },
          { de: "¿Y qué? Aquí no hay números.", en: "So what? There are no numbers here.", delta: -16, tag: "😱 Elbows out",
            react: "Increíble…", reactEn: "Unbelievable…", why: "Even without numbers or a line, everyone keeps track of who came after whom." },
        ],
      },
      {
        who: "verkaeuferin", npc: "¡Buenos días! ¿Qué te pongo?", en: "Good morning! What can I get you?",
        options: [
          { de: "¡Buenos días! Ponme dos barras, por favor.", en: "Good morning! Two baguettes, please.", delta: 15, tag: "😊 Friendly and clear",
            react: "Marchando. ¿Algo más?", reactEn: "Coming up. Anything else?", why: "Ponme… sounds like a command in English, but in a Spanish shop it's normal and polite, especially after a greeting." },
          { de: "¿Qué es lo más barato?", en: "What's the cheapest thing?", delta: 3, tag: "😐 Bargain hunter",
            react: "La barra normal, a 1,40.", reactEn: "The ordinary baguette, at €1.40.", why: "Asking about prices is fine. A ¡Buenos días! first would be nicer." },
          { de: "Dos barras.", en: "Two baguettes (and nothing else).", delta: -4, tag: "😐 A bit short",
            react: "Buenos días, ¿eh?", reactEn: "Good morning to you too, then.", why: "Short orders are normal, but people do expect a greeting when you come in." },
          { de: "¡Eh, tú! ¡Dos barras, venga!", en: "Hey, you! Two baguettes, come on!", delta: -12, tag: "😬 Rude",
            react: "Un momento, que no soy una máquina.", reactEn: "Just a moment, I'm not a machine.", why: "Being direct is fine; ordering someone about is not. Start with a greeting and add por favor." },
        ],
      },
      {
        who: "verkaeuferin", npc: "Son 2,80. ¿Quieres bolsa?", en: "That's €2.80. Do you want a bag?",
        options: [
          { de: "No, gracias, traigo la mía.", en: "No, thanks, I've brought my own.", delta: 12, tag: "😊 Well prepared",
            react: "Perfecto, gracias.", reactEn: "Perfect, thanks.", why: "Many shops charge for bags, so many people bring their own." },
          { de: "Sí, por favor. Toma tres euros y quédate con el cambio.", en: "Yes, please. Here's three euros, keep the change.", delta: 6, tag: "🙂 Small tip",
            react: "¡Ay, gracias!", reactEn: "Oh, thank you!", why: "Nobody expects a tip in a bakery, but it's a nice gesture." },
          { de: "(Put the money down without a word and leave)", en: "(Pay, say nothing and go)", delta: -6, tag: "😬 Silent",
            react: "Adiós, ¿eh?", reactEn: "Goodbye, then.", why: "On the way out people say a quick Gracias, hasta luego. Hasta luego works even if you never come back." },
          { de: "¿2,80 por dos barras? ¡Qué robo!", en: "€2.80 for two baguettes? What a rip-off!", delta: -14, tag: "😱 Moaned",
            react: "Los precios no los pongo yo.", reactEn: "I don't set the prices.", why: "Complaining about prices doesn't help. The shop assistant can't change them." },
        ],
      },
    ],
    more: "/culture/insider/queues-and-personal-space",
  },
  {
    id: "sbahn", place: "On the metro", backdrop: "sbahn",
    props: [{ icon: "1F687", x: 84, y: 24 }, { icon: "1F6CD", x: 60, y: 70 }],
    people: [
      { id: "mann", mascot: "bruno", name: "Man with a bag", role: "passenger" },
      { id: "dame", mascot: "regi", name: "Señora Gómez", role: "passenger with a walking stick" },
    ],
    turns: [
      {
        who: "mann", situation: "The metro is full. A man's bag is on the only empty seat. He's looking at his phone.",
        options: [
          { de: "Perdone, ¿está libre este asiento?", en: "Excuse me, is this seat free?", delta: 15, tag: "😊 Asked politely",
            react: "¡Ay, perdón! Claro, siéntate.", reactEn: "Oh, sorry! Of course, sit down.", why: "¿Está libre? is the normal way to ask for a seat. Perdone is the usted form, safe with any stranger." },
          { de: "(Keep standing and say nothing)", en: "(Don't speak, just stand)", delta: 3, tag: "😐 Too shy",
            react: "(He doesn't notice.)", why: "That isn't rude. But you're allowed to ask, and it's normal." },
          { de: "(Sigh loudly) Hay que ver…", en: "(Sigh loudly) Honestly…", delta: -6, tag: "😬 Passive-aggressive",
            react: "¿Qué? Ah… toma, siéntate.", reactEn: "What? Oh… here, sit down.", why: "Loud sighing comes across as unfriendly. A direct, friendly question works better." },
          { de: "(Just put the bag on the floor)", en: "(Move his bag yourself)", delta: -14, tag: "😱 Hands off!",
            react: "¡Oye! ¡Que es mi bolsa!", reactEn: "Hey! That's my bag!", why: "You don't touch other people's things. Ask first." },
        ],
      },
      {
        who: "dame", situation: "Two stops later an older woman with a walking stick gets on. There are no free seats.",
        npc: "Uf, cuánta gente hay hoy.", en: "Phew, there are so many people today.",
        options: [
          { de: "¿Quiere sentarse? Tenga, siéntese aquí.", en: "Would you like to sit down? Here, sit here.", delta: 16, tag: "😊 Thoughtful",
            react: "Ay, muchas gracias. Qué amable.", reactEn: "Oh, thank you very much. How kind.", why: "Many people give up their seat here, and usted fits an older stranger. Metro and bus seats for people who need them are marked too." },
          { de: "Sí, por las mañanas siempre es así.", en: "Yes, mornings are always like this.", delta: 4, tag: "😐 Just small talk",
            react: "Ya, ya…", reactEn: "Yes, yes…", why: "A bit of small talk is OK. But what she really needs is a seat." },
          { de: "(Put your headphones in and look out of the window)", en: "(Listen to music and look away)", delta: -12, tag: "😬 Looked away",
            react: "(She holds on with difficulty.)", why: "Pretending not to see feels rude to many people. A quick offer costs nothing." },
        ],
      },
      {
        who: "dame", npc: "¿Sabe si este metro para en Plaza de España?", en: "Do you know if this train stops at Plaza de España?",
        options: [
          { de: "Sí, dentro de dos paradas. Yo le aviso.", en: "Yes, in two stops. I'll let you know.", delta: 14, tag: "😊 Helpful",
            react: "Qué amable, gracias.", reactEn: "How kind, thank you.", why: "Short, clear help and a promise to tell her. And le aviso keeps the usted she used with you." },
          { de: "Ni idea.", en: "No idea.", delta: -4, tag: "😐 Abrupt",
            react: "Ah. Bueno.", reactEn: "Oh. Well.", why: "Not knowing is fine. Friendlier: Lo siento, no lo sé." },
          { de: "Mire el plano de ahí arriba.", en: "Look at the map up there.", delta: -6, tag: "😬 Dismissive",
            react: "Sin gafas no veo nada.", reactEn: "I can't see a thing without my glasses.", why: "The tip is right, but it sounds cold. Better to check it quickly yourself." },
          { de: "¿Plaza de España? ¿Y a qué va usted allí?", en: "Plaza de España? And why are you going there?", delta: -12, tag: "😱 Too nosy",
            react: "Eso… no es asunto suyo.", reactEn: "That's… none of your business.", why: "You don't ask strangers about their plans. Just answer the question." },
        ],
      },
    ],
    more: "/culture/insider/queues-and-personal-space",
  },
  {
    id: "aufzug", place: "In the lift", backdrop: "aufzug",
    props: [{ icon: "1F6D7", x: 82, y: 30 }, { icon: "1F514", x: 16, y: 22 }],
    people: [
      { id: "herr", mascot: "bruno", name: "Señor Ferrer", role: "man in the lift",
        talk: { likes: ["wetter", "wochenende"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "botin", mascot: "quaki", name: "Amina", role: "courier with parcels" },
    ],
    turns: [
      {
        who: "herr", situation: "You get into the lift. An older man is already inside.",
        npc: "Buenos días.", en: "Good morning.",
        options: [
          { de: "Buenos días.", en: "Good morning.", delta: 12, tag: "😊 Said it back",
            react: "(He nods in a friendly way.)", why: "Many people greet in lifts and waiting rooms, and say Hasta luego when they get out. Buenos días or just ¡Buenas! is enough." },
          { de: "¡Hola, amigo!", en: "Hi, my friend!", delta: -4, tag: "😐 Too familiar",
            react: "… Hola.", reactEn: "… Hello.", why: "With an older stranger, Buenos días is right, without the amigo." },
          { de: "(Say nothing, look at your phone)", en: "(Don't answer, check your phone)", delta: -5, tag: "😐 Silent",
            react: "(He looks at the door.)", why: "Many people think it's unfriendly not to answer a greeting." },
          { de: "Buenos días. No he dormido nada, mi vecino ronca y la espalda me mata…", en: "Good morning. I haven't slept at all, my neighbour snores and my back is killing me…", delta: -8, tag: "😬 Too much information",
            react: "Ya… vaya.", reactEn: "Right… oh dear.", why: "In a lift a greeting and perhaps a word about the weather will do. Your back is for friends." },
        ],
      },
      {
        who: "herr", wheel: 1, situation: "The lift is slow. Seven more floors… The silence is getting awkward. Say something! He's an older stranger, so you use usted.",
      },
      {
        who: "botin", situation: "The lift stops on the second floor. A woman with two parcels wants to get in.",
        npc: "¿Hay sitio para una más?", en: "Is there room for one more?",
        options: [
          { de: "¡Claro, pasa! (Step aside a little)", en: "Of course, come in! (Make some space)", delta: 14, tag: "😊 Made room",
            react: "Gracias, muy amable.", reactEn: "Thanks, very kind.", why: "Making room is all it takes. People in Spain often stand fairly close, but a lift is a good moment to give a little space." },
          { de: "(Stay very close to her, although there's room)", en: "(Stand right next to her)", delta: -6, tag: "😬 Too close",
            react: "(She moves away.)", why: "Personal space may be smaller than you're used to, but if there's room, nobody needs you that close." },
          { de: "Uf, mejor espera al siguiente.", en: "Ugh, better wait for the next one.", delta: -12, tag: "😬 Turned away",
            react: "Ah. Pero si hay sitio de sobra.", reactEn: "Oh. But there's plenty of room.", why: "If there's room, you let people in. Anything else feels cold." },
          { de: "(Quickly press “close door”)", en: "(Shut the door on her)", delta: -18, tag: "😱 Door in her face",
            react: "¡Oiga! …", reactEn: "Hey! …", why: "Closing the door in someone's face is a real manners disaster." },
        ],
      },
      {
        who: "botin", npc: "Uf, cómo pesan. ¿Me pulsas el cuatro, por favor?", en: "Phew, these are heavy. Could you press four for me, please?",
        options: [
          { de: "¡Claro! ¿Te ayudo con uno?", en: "Of course! Shall I help you with one?", delta: 15, tag: "😊 Thought ahead",
            react: "Ay, sí, gracias. Eres un sol.", reactEn: "Oh, yes, thanks. You're a star.", why: "A little help when someone has their hands full makes almost anyone happy." },
          { de: "(Press four)", en: "(Press the button)", delta: 6, tag: "🙂 Done",
            react: "¡Gracias!", reactEn: "Thanks!", why: "Perfectly fine. A quick De nada makes it even friendlier." },
          { de: "¿Tengo pinta de ascensorista?", en: "Do I look like a lift attendant?", delta: -15, tag: "😱 Snappy",
            react: "Vaya. Vale.", reactEn: "Wow. OK.", why: "Saying no to a tiny favour and making fun of it is very rude." },
        ],
      },
    ],
    more: "/culture/insider/saying-hello",
  },
  {
    id: "weg", place: "In the street", backdrop: "strasse",
    props: [{ icon: "1F3DB", x: 82, y: 22 }, { icon: "1F333", x: 12, y: 26 }, { icon: "1F68F", x: 30, y: 30 }],
    people: [
      { id: "touristin", mascot: "hamsti", name: "A young woman", role: "asking the way" },
    ],
    turns: [
      {
        who: "touristin", npc: "Perdona, ¿cómo llego al ayuntamiento?", en: "Excuse me, how do I get to the town hall?",
        options: [
          { de: "Sigue todo recto y gira la segunda a la izquierda. Son unos cinco minutos.", en: "Go straight on and take the second left. It's about five minutes.", delta: 15, tag: "😊 Clear directions",
            react: "¡Genial, muchas gracias!", reactEn: "Great, thank you very much!", why: "Short and clear: that's how you give directions. She used tú, so you can too." },
          { de: "Lo siento, no lo sé. ¿Por qué no preguntas en el quiosco?", en: "Sorry, I don't know. Why don't you ask at the kiosk?", delta: 8, tag: "🙂 Honest",
            react: "Vale, ¡gracias igualmente!", reactEn: "OK, thanks anyway!", why: "Lo siento, no lo sé is perfectly fine, and with a tip it's even better." },
          { de: "¿El ayuntamiento? Pues por ahí… o por allí… creo.", en: "The town hall? Well, that way… or over there… I think.", delta: -6, tag: "😬 Confusing",
            react: "Eh… ¿gracias?", reactEn: "Er… thanks?", why: "Better to say you don't know than to send someone the wrong way." },
          { de: "(Walk on without answering)", en: "(Ignore her and keep walking)", delta: -14, tag: "😱 Ignored",
            react: "¿Hola? …", reactEn: "Hello? …", why: "When someone speaks to you, you answer briefly, even if it's only Perdona, voy con prisa." },
        ],
      },
      {
        who: "touristin", npc: "¿Me lo puedes enseñar en el mapa?", en: "Can you show me on the map?",
        options: [
          { de: "Claro. Estamos aquí, y el ayuntamiento está ahí.", en: "Of course. We're here, and the town hall is there.", delta: 12, tag: "😊 Patient",
            react: "¡Ah, ahora sí!", reactEn: "Ah, now I get it!", why: "Patience is friendly. On a map it's often easier." },
          { de: "Yo voy hacia allí. ¡Ven conmigo!", en: "I'm going that way. Come with me!", delta: 8, tag: "🙂 Very helpful",
            react: "¡Ay, qué amable!", reactEn: "Oh, how kind!", why: "Very friendly! But nobody has to go that far. Showing her is enough." },
          { de: "(Take her phone and tap on it for ages)", en: "(Take her phone and use it for a long time)", delta: -6, tag: "😬 Took over",
            react: "Eh… ¿me devuelves el móvil?", reactEn: "Er… can I have my phone back?", why: "You don't just take someone else's phone. Showing her is enough." },
          { de: "¿Y no tienes el móvil para eso?", en: "Don't you have your phone for that?", delta: -12, tag: "😱 Annoyed",
            react: "Sí, pero no me aclaro.", reactEn: "Yes, but I can't make sense of it.", why: "She's asking you because she needs help. Making fun of her doesn't help." },
        ],
      },
    ],
    more: "/culture/insider/please-and-thank-you",
  },
  {
    id: "menu-del-dia", place: "Lunch out", backdrop: "cafe",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "23F0", x: 80, y: 14 }, { icon: "1F9FE", x: 22, y: 44 }],
    people: [{ id: "camarero", mascot: "bruno", name: "Javi", role: "waiter" }],
    turns: [
      {
        who: "camarero", situation: "Half past twelve. You're hungry and walk into a restaurant. The tables are empty, and two people are having a coffee at the bar.",
        npc: "Hola, buenas. La cocina no abre hasta la una y media.", en: "Hello there. The kitchen doesn't open until half past one.",
        options: [
          { de: "Vale, entonces tomo algo mientras espero. ¿Me pones un café?", en: "OK, then I'll have something while I wait. Can I have a coffee?", delta: 14, tag: "😊 Knows the clock",
            react: "Claro, ahora mismo.", reactEn: "Of course, right away.", why: "Lunch in Spain is usually around 2 to 4 pm, so a kitchen may well not be open at 12:30." },
          { de: "¿Y hay algo para picar?", en: "And is there anything to nibble?", delta: 8, tag: "🙂 Good idea",
            react: "Sí, una tapa de tortilla.", reactEn: "Yes, a tapa of tortilla.", why: "Good thinking: many bars have something at the counter even when the kitchen is closed." },
          { de: "¡Pero si ya es hora de comer!", en: "But it's already lunchtime!", delta: -8, tag: "😬 Wrong clock",
            react: "Aquí, a las dos.", reactEn: "Here, at two.", why: "12:30 is late morning in Spain. The waiter isn't the one to argue with about it." },
          { de: "Pues vaya sitio. Aquí no se come nunca.", en: "What a place. You never get to eat here.", delta: -12, tag: "😱 Grumbled",
            react: "A la una y media, como le he dicho.", reactEn: "At half past one, as I told you.", why: "Different hours aren't bad service. Have a coffee, or come back later." },
        ],
      },
      {
        who: "camarero", situation: "You come back at two and the place is full.",
        npc: "¿Menú del día? De primero hay lentejas o ensalada, y de segundo, pollo o merluza.", en: "The set lunch? For the first course there's lentils or salad, and for the second, chicken or hake.",
        options: [
          { de: "De primero, lentejas, y de segundo, merluza, por favor.", en: "Lentils for the first course and hake for the second, please.", delta: 14, tag: "😊 Ordered like a local",
            react: "Muy bien. ¿Y de beber?", reactEn: "Very good. And to drink?", why: "The menú del día is a set price for two courses, and usually a drink and a dessert or coffee. De primero… de segundo… is how you order it." },
          { de: "¿Qué me recomiendas?", en: "What do you recommend?", delta: 8, tag: "🙂 Asked",
            react: "La merluza, que está muy buena hoy.", reactEn: "The hake, it's very good today.", why: "Always a good question, and people like being asked." },
          { de: "¿Puede ser solo el pollo, pero a mitad de precio?", en: "Can I just have the chicken, but at half price?", delta: -5, tag: "😐 Haggling",
            react: "Es que el menú es el menú.", reactEn: "The set menu is the set menu.", why: "It's asked politely, but set prices aren't for haggling. Some places do half menus, so you can ask if they have one." },
          { de: "¿Lentejas otra vez? ¡Vaya menú más pobre!", en: "Lentils again? What a poor menu!", delta: -14, tag: "😱 Insulted the food",
            react: "Pues son las de mi madre.", reactEn: "Well, they're my mother's.", why: "Lentils are a much-loved dish. Insulting the food is the fastest way to lose the waiter." },
        ],
      },
      {
        who: "camarero", situation: "You finished your coffee twenty minutes ago. Nobody has brought the bill, and you start to feel forgotten.",
        options: [
          { de: "(Catch his eye) ¿Me traes la cuenta cuando puedas?", en: "(Catch his eye) Can you bring me the bill when you can?", delta: 15, tag: "😊 Asked for the bill",
            react: "Enseguida.", reactEn: "Right away.", why: "In Spain the bill usually comes only when you ask. Bringing it early could feel like rushing you out." },
          { de: "(Wait another half hour, getting annoyed)", en: "(Keep waiting and get annoyed)", delta: -3, tag: "😐 Waiting for nothing",
            react: "(He thinks you're enjoying the sobremesa.)", why: "He isn't ignoring you. He's letting you sit as long as you like." },
          { de: "(Shout across the room) ¡Eh! ¡La cuenta!", en: "(Shout across the room) Hey! The bill!", delta: -6, tag: "😬 Too loud",
            react: "Ya voy, ya voy…", reactEn: "I'm coming, I'm coming…", why: "Bars can be loud, but a wave or Perdona, ¿me cobras? does the job much better." },
          { de: "(Decide they've forgotten and walk out)", en: "(Leave without paying)", delta: -18, tag: "😱 Did a runner",
            react: "¡Oiga! ¡Que no ha pagado!", reactEn: "Hey! You haven't paid!", why: "The bill not coming doesn't mean it's free. Ask for it." },
        ],
      },
    ],
    more: "/culture/daily-rhythm",
  },
];

const arbeit = [
  {
    id: "kaffeekueche", place: "In the office kitchen", backdrop: "kueche",
    props: [{ icon: "2615", x: 20, y: 34 }, { icon: "1F370", x: 72, y: 36 }, { icon: "1F95B", x: 86, y: 30 }],
    people: [{ id: "lena", mascot: "regi", name: "Nerea", role: "colleague",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "lena", situation: "Monday morning. Everyone in your team uses tú.",
        npc: "¡Buenos días! ¿Qué tal el finde?", en: "Good morning! How was your weekend?",
        options: [
          { de: "¡Muy bien, gracias! Fui a la montaña. ¿Y tú?", en: "Very good, thanks! I went to the mountains. And you?", delta: 15, tag: "😊 Asked back",
            react: "¡Qué bien! Yo fui al cine.", reactEn: "How nice! I went to the cinema.", why: "A short answer and ¿Y tú?: perfect small talk." },
          { de: "Bien.", en: "Good (and nothing more).", delta: -3, tag: "😐 Conversation over",
            react: "Ah… vale.", reactEn: "Oh… OK.", why: "Polite, but the chat is over at once. One more sentence and ¿Y tú? help." },
          { de: "Uf, ni me preguntes. Mi casero, mi espalda, mi ex…", en: "Ugh, don't even ask. My landlord, my back, my ex…", delta: -8, tag: "😬 Too personal",
            react: "Vaya… qué fuerte.", reactEn: "Wow… that's a lot.", why: "Small talk isn't therapy. Save your problems for friends." },
          { de: "¿Y por qué quieres saberlo?", en: "And why do you want to know?", delta: -15, tag: "😱 Suspicious",
            react: "Eh… por nada.", reactEn: "Er… no reason.", why: "The question is only small talk, not a check on you." },
        ],
      },
      {
        who: "lena", npc: "Por cierto, hoy es mi cumple. He traído unos pasteles, ¡coged!", en: "By the way, it's my birthday today. I've brought some pastries, help yourselves!",
        options: [
          { de: "¡Muchas felicidades! ¿Los has hecho tú?", en: "Happy birthday! Did you make them yourself?", delta: 14, tag: "😊 Congratulated",
            react: "¡Sí, es la receta de mi abuela!", reactEn: "Yes, it's my grandmother's recipe!", why: "In many Spanish workplaces it's the birthday person who brings the treats. ¡Felicidades! comes first." },
          { de: "¡Gracias, qué buena pinta! (Take one)", en: "Thanks, they look delicious! (Take one)", delta: 6, tag: "🙂 Polite",
            react: "¡Que aproveche!", reactEn: "Enjoy!", why: "Perfectly fine, but on a birthday a ¡Felicidades! wouldn't hurt." },
          { de: "(Take three and wrap one up for later)", en: "(Take a lot of pastries)", delta: -8, tag: "😬 Greedy",
            react: "Ah… es que son para todos.", reactEn: "Oh… they're for everyone.", why: "When someone brings something for everyone, you take one first." },
          { de: "No. El azúcar es veneno, y tú tampoco deberías comerlo.", en: "No. Sugar is poison, and you shouldn't eat it either.", delta: -13, tag: "😱 Lecturing",
            react: "Eh… solo quería ser amable.", reactEn: "Er… I was only trying to be nice.", why: "Saying no is fine, but without a lecture. Hoy no, gracias, ¡pero felicidades! is enough." },
        ],
      },
      {
        who: "lena", wheel: 2, du: true, situation: "You're still in the kitchen with your coffee. What do you talk to Nerea about?",
      },
    ],
    more: "/culture/insider/small-talk-and-sobremesa",
  },
  {
    id: "erster-tag", place: "First day at work", backdrop: "buero",
    props: [{ icon: "1F4BB", x: 22, y: 34 }, { icon: "1F4C8", x: 78, y: 20 }, { icon: "23F0", x: 50, y: 12 }],
    people: [{ id: "chefin", mascot: "bruno", name: "Marta Vidal", role: "your manager" }],
    turns: [
      {
        who: "chefin", situation: "Your first day in a new job. You arrive at 8:55; work starts at 9.",
        npc: "¡Buenos días! Tú empiezas hoy, ¿verdad? Soy Marta.", en: "Good morning! You start today, right? I'm Marta.",
        options: [
          { de: "¡Buenos días! Sí, es mi primer día. Mucho gusto, Marta. (Shake hands)", en: "Good morning! Yes, it's my first day. Pleased to meet you, Marta. (Shake hands)", delta: 15, tag: "😊 Great first impression",
            react: "Igualmente. ¡Te damos la bienvenida al equipo!", reactEn: "Likewise. Welcome to the team!", why: "Mucho gusto and a handshake are safe at work. If she leans in for dos besos, go along with it." },
          { de: "(Nod and look at the floor)", en: "(Nod and look down)", delta: -4, tag: "😐 Unsure",
            react: "Tranquilidad, que aquí no mordemos.", reactEn: "Relax, we don't bite here.", why: "Being shy is OK. One short sentence and eye contact come across as friendlier." },
          { de: "¡Qué pasa, jefa! Sí, soy yo, aquí estoy.", en: "What's up, boss! Yes, that's me, here I am.", delta: -12, tag: "😬 Too casual",
            react: "Eh… ¿qué pasa? Pues que hay trabajo.", reactEn: "Er… what's up? Well, there's work to do.", why: "Tú, yes, but ¡Qué pasa, jefa! is too casual for your first minute with your new manager." },
          { de: "Sí. ¿A qué hora salimos, por cierto?", en: "Yes. What time do we finish, by the way?", delta: -14, tag: "😱 Wrong question",
            react: "A las seis. Pero vamos a empezar primero.", reactEn: "At six. But let's start first.", why: "Asking about home time on your first day sounds as if you want to leave already." },
        ],
      },
      {
        who: "chefin", npc: "Aquí nos tuteamos todos, así que trátame de tú, ¿vale?", en: "Everyone uses tú here, so use tú with me, OK?",
        options: [
          { de: "Vale, Marta. Muchas gracias.", en: "OK, Marta. Thank you very much.", delta: 14, tag: "😊 Took the offer",
            react: "Perfecto. Ven, que te enseño esto.", reactEn: "Perfect. Come on, I'll show you around.", why: "In many workplaces colleagues use tú, even with the boss. When someone offers it, you just take it." },
          { de: "De acuerdo. Como tú digas, Marta.", en: "All right. As you say, Marta.", delta: 5, tag: "🙂 Stiff but right",
            react: "Tampoco soy tan seria, ¿eh?", reactEn: "I'm not that serious, you know.", why: "It's correct. A simple Vale would sound less like talking to a general." },
          { de: "Sí, señora Vidal, como usted diga.", en: "Yes, Mrs Vidal, as you say.", delta: -5, tag: "😐 Didn't listen",
            react: "Marta, de verdad. De tú.", reactEn: "Marta, really. Tú.", why: "Usted is polite, but once someone asks you for tú, staying on usted creates distance." },
          { de: "Genial. Entonces, tía, ¿cuántas vacaciones tengo?", en: "Great. So, girl, how much holiday do I get?", delta: -12, tag: "😱 Went too far",
            react: "De tú, he dicho. No de tía.", reactEn: "I said tú. Not “girl”.", why: "Tú doesn't make you best friends. Tío and tía are for friends, not your manager on day one." },
        ],
      },
      {
        who: "chefin", npc: "Mañana tenemos reunión de equipo a las nueve. ¿Te viene bien?", en: "We have a team meeting at nine tomorrow. Does that suit you?",
        options: [
          { de: "Sí, claro. Allí estaré a las nueve.", en: "Yes, of course. I'll be there at nine.", delta: 14, tag: "😊 On time",
            react: "¡Perfecto!", reactEn: "Perfect!", why: "Friends may run ten minutes late, but at work and for appointments, on time means on time." },
          { de: "¿Puedo llegar a las nueve y media? Es que mi autobús…", en: "Can I come at half past nine? It's just that my bus…", delta: 3, tag: "😐 Honest, but…",
            react: "Bueno, si pasa más veces, lo hablamos.", reactEn: "Well, if it keeps happening, we'll talk about it.", why: "Honesty is good, and many workplaces are flexible, but it's not a strong start on day one." },
          { de: "Más o menos. Yo por las mañanas no soy persona.", en: "More or less. I'm not human in the mornings.", delta: -6, tag: "😬 Unreliable",
            react: "Ya. Pero a las nueve es a las nueve.", reactEn: "Right. But nine means nine.", why: "It's a good joke for later, but with your new manager it just sounds unreliable." },
          { de: "Ya veremos.", en: "We'll see.", delta: -12, tag: "😱 Couldn't care less",
            react: "¿Perdona?", reactEn: "Sorry?", why: "Ya veremos about a meeting with your manager sounds as if you don't care." },
        ],
      },
    ],
    more: "/culture/insider/time-and-timing",
  },
  {
    id: "meeting", place: "In the meeting", backdrop: "buero",
    props: [{ icon: "1F4CA", x: 50, y: 14 }, { icon: "1F4CB", x: 18, y: 38 }, { icon: "2615", x: 84, y: 40 }],
    people: [{ id: "jonas", mascot: "hamsti", name: "Pablo", role: "colleague" }],
    turns: [
      {
        who: "jonas", situation: "Team meeting. Pablo is presenting an idea.",
        npc: "Mi idea es esta: a partir de ahora, reunión de equipo a las siete de la mañana. ¿Qué os parece?", en: "Here's my idea: from now on, team meetings at seven in the morning. What do you all think?",
        options: [
          { de: "Entiendo la idea, pero no sé si a las siete nos viene bien a todos. ¿Y a las nueve?", en: "I understand the idea, but I'm not sure seven suits us all. What about nine?", delta: 16, tag: "😊 Honest and kind",
            react: "Mmm, tienes razón. A las nueve también vale.", reactEn: "Hmm, you're right. Nine works too.", why: "Say what you think, give a reason and suggest something else: in a Spanish meeting that's normal, not rude." },
          { de: "Mmm, interesante.", en: "Hmm, interesting.", delta: -4, tag: "😐 Too vague",
            react: "¡Gracias! Pues lo dejamos así.", reactEn: "Thanks! Let's leave it like that, then.", why: "If you're vague, people take it as a yes. Now the meeting is at seven." },
          { de: "(Say nothing and complain about it in the kitchen later)", en: "(Be quiet now, talk badly about it later)", delta: -12, tag: "😬 Behind his back",
            react: "(Pablo hears about it anyway.)", why: "Talking behind someone's back hurts the team. Disagree in the meeting instead." },
          { de: "Es la idea más tonta que he oído en mi vida.", en: "That's the stupidest idea I've ever heard.", delta: -16, tag: "😱 Far too harsh",
            react: "Vaya. Gracias.", reactEn: "Wow. Thanks.", why: "Direct is fine, hurtful isn't. Criticise the idea, not the person, and give a reason." },
        ],
      },
      {
        who: "jonas", situation: "After the meeting. His slides were very long and very colourful.",
        npc: "¿Qué te ha parecido mi presentación?", en: "What did you think of my presentation?",
        options: [
          { de: "El contenido, muy bueno. Yo quizá haría las diapositivas un poco más cortas.", en: "The content was very good. I might make the slides a bit shorter.", delta: 14, tag: "😊 Constructive",
            react: "Buen consejo, gracias.", reactEn: "Good advice, thanks.", why: "First the good part, then one clear tip: that kind of feedback is easy to accept." },
          { de: "¡Genial! ¡Perfecta!", en: "Great! Perfect!", delta: 4, tag: "😐 Too nice",
            react: "¿Sí? Pues la dejo así.", reactEn: "Yes? Then I'll leave it as it is.", why: "Kindly meant, but he learns nothing. At work, honest feedback helps more." },
          { de: "Demasiado larga, demasiados colores, un rollo.", en: "Too long, too many colours, a bore.", delta: -12, tag: "😱 Brutal",
            react: "Vale… eso duele.", reactEn: "OK… that hurts.", why: "Criticism without a kind word or a tip sounds like an attack." },
        ],
      },
    ],
    more: "/culture/insider/directness",
  },
  {
    id: "feierabend", place: "After work", backdrop: "kneipe",
    props: [{ icon: "1F37A", x: 30, y: 40 }, { icon: "1F3B6", x: 78, y: 18 }, { icon: "1F964", x: 66, y: 42 }],
    people: [{ id: "becker", mascot: "bruno", name: "Gorka", role: "colleague from accounts",
      talk: { likes: ["urlaub", "wochenende"], dislikes: ["wetter"], taboo: ["gehalt", "politik", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "becker", situation: "Friday, half past six. You don't know Gorka very well yet.",
        npc: "¡Bueno, semana terminada! ¿Nos tomamos unas cañas?", en: "Right, that's the week done! Shall we have a few beers?",
        options: [
          { de: "¡Venga! Aunque yo tomo un refresco.", en: "Come on, then! Though I'll have a soft drink.", delta: 14, tag: "😊 In, your way",
            react: "¡Claro, sin problema!", reactEn: "Sure, no problem!", why: "Coming along is what counts. Nobody has to drink alcohol: a soft drink or a caña sin (alcohol-free) is completely normal." },
          { de: "Hoy no puedo, pero la próxima, seguro.", en: "I can't today, but next time, for sure.", delta: 8, tag: "🙂 Kind no",
            react: "Vale, ¡la próxima!", reactEn: "OK, next time!", why: "A friendly no with la próxima is perfectly fine." },
          { de: "Solo si invitas tú.", en: "Only if you're paying.", delta: -3, tag: "😐 Cheeky joke",
            react: "Ja… ya veremos.", reactEn: "Ha… we'll see.", why: "A joke. But in a group, people usually take turns to pay." },
          { de: "No, gracias, yo con compañeros no salgo.", en: "No, thanks, I don't go out with colleagues.", delta: -6, tag: "😬 Cold",
            react: "Ah. Bueno.", reactEn: "Oh. Well.", why: "Saying no is fine, but this sounds as if you don't like your colleagues." },
        ],
      },
      {
        who: "becker", situation: "In the bar round the corner.",
        npc: "Bueno, ¿y qué tal? ¿Te va gustando esto?", en: "So, how's it going? Are you liking it here?",
        options: [
          { de: "¡Mucho! El equipo es muy majo. ¿Tú cuánto llevas aquí?", en: "A lot! The team is really nice. How long have you been here?", delta: 14, tag: "😊 Asked back",
            react: "¡Doce años! Parece mentira.", reactEn: "Twelve years! Hard to believe.", why: "Say something positive and ask back: good after-work talk." },
          { de: "Bien. Por cierto, ¿qué te parece el Gobierno?", en: "Good. By the way, what do you think of the government?", delta: -6, tag: "😬 Risky topic",
            react: "Uf… hoy mejor no.", reactEn: "Ugh… better not today.", why: "You can talk about politics, but over the first drink with a colleague it's risky." },
          { de: "No está mal. Aunque la jefa es un poco idiota, ¿no?", en: "Not bad. Though the boss is a bit of an idiot, isn't she?", delta: -12, tag: "😬 Gossip",
            react: "Mmm. Eso no lo he oído.", reactEn: "Hmm. I didn't hear that.", why: "Gossiping about your manager when you're new? Word gets around fast." },
          { de: "Bien. A ver, ¿tú cuánto ganas?", en: "Good. So, how much do you earn?", delta: -14, tag: "😱 Pay question",
            react: "Eso… mejor me lo guardo.", reactEn: "That's… something I'll keep to myself.", why: "Many people don't ask colleagues about their pay: they find it too private." },
        ],
      },
      {
        who: "becker", situation: "Gorka comes back from the bar with the drinks.",
        npc: "Toma. ¡Salud!", en: "Here you go. Cheers!",
        options: [
          { de: "¡Salud! Gracias. La siguiente la pago yo.", en: "Cheers! Thanks. I'll get the next one.", delta: 14, tag: "😊 Knows about rounds",
            react: "¡Eso, eso!", reactEn: "That's the spirit!", why: "Friends and colleagues often pay a ronda in turns. Saying La siguiente la pago yo is the right move." },
          { de: "¡Salud! ¿Cuánto te debo?", en: "Cheers! How much do I owe you?", delta: 6, tag: "🙂 Fair",
            react: "Nada, nada. Ya pagas la siguiente.", reactEn: "Nothing at all. You can get the next one.", why: "Fair and polite. In a group, though, people usually just buy the next round." },
          { de: "(Drink it and say nothing)", en: "(Just drink)", delta: -5, tag: "😐 No thanks",
            react: "(He waits a moment.)", why: "A quick ¡Salud! or Gracias is part of it." },
          { de: "(Drink it and go home before your round)", en: "(Leave before you have to pay)", delta: -14, tag: "😱 Skipped your round",
            react: "(Gorka notices. Everyone notices.)", why: "Leaving just before it's your turn to pay is a famous bar sin." },
        ],
      },
      {
        who: "becker", wheel: 1, du: true, situation: "Gorka sips his caña. Now it's your turn to pick a topic.",
      },
    ],
    more: "/culture/bars-and-paying",
  },
];

const zuhause = [
  {
    id: "neue-nachbarin", place: "On the stairs", backdrop: "treppenhaus",
    props: [{ icon: "1F4EC", x: 16, y: 34 }, { icon: "1F6AA", x: 84, y: 22 }, { icon: "1F6CD", x: 62, y: 66 }],
    people: [{ id: "schulz", mascot: "regi", name: "Carmen", role: "older neighbour",
      talk: { likes: ["wetter", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } }],
    turns: [
      {
        who: "schulz", situation: "You've just moved into a block of flats. On the stairs you meet an older woman with shopping bags.",
        npc: "Buenas tardes. ¿Vive usted aquí ahora?", en: "Good afternoon. Do you live here now?",
        options: [
          { de: "Sí, buenas tardes. Acabo de mudarme al segundo. ¿Y usted?", en: "Yes, good afternoon. I've just moved to the second floor. And you?", delta: 15, tag: "😊 Introduced yourself",
            react: "Soy Carmen, del tercero. Y de tú, por favor, que me haces mayor.", reactEn: "I'm Carmen, from the third floor. And tú, please, you're making me feel old.", why: "She used usted, so you did too. And that's often how you get offered tú: the older person decides." },
          { de: "¡Sí! ¿Le ayudo con las bolsas?", en: "Yes! Shall I help you with the bags?", delta: 8, tag: "🙂 Helpful",
            react: "Ay, qué amable, pero puedo yo.", reactEn: "Oh, how kind, but I can manage.", why: "Offering help is kind, and le ayudo is the right usted form. You can still say who you are." },
          { de: "Sí. ¿Aquí hay mucho ruido? Las paredes parecen finas.", en: "Yes. Is it noisy here? The walls look thin.", delta: -3, tag: "😐 Started with a moan",
            react: "Bueno, tampoco tanto.", reactEn: "Well, not that bad.", why: "Starting with criticism of the building doesn't feel very friendly." },
          { de: "Sí. ¿Y tú quién eres, guapa?", en: "Yes. And who are you, gorgeous?", delta: -8, tag: "😬 Too familiar",
            react: "Mira, guapa ya lo fui.", reactEn: "Look, I've been gorgeous already.", why: "Some older people use guapa with you, but it's not how you start with an older neighbour, who said usted to you." },
        ],
      },
      {
        who: "schulz", situation: "Three days later you meet her by the letter boxes.",
        npc: "¡Hola! ¿Qué tal? ¿Ya te vas instalando?", en: "Hello! How are you? Settling in all right?",
        options: [
          { de: "¡Hola, Carmen! Sí, gracias, estoy muy a gusto aquí.", en: "Hello, Carmen! Yes, thanks, I really like it here.", delta: 15, tag: "😊 Remembered her name",
            react: "¡Anda, te acuerdas de mi nombre!", reactEn: "Well, you remember my name!", why: "Greeting people by name shows you listened. And now it's tú, as she asked." },
          { de: "¡Sí, gracias! Perdona, ¿cómo te llamabas? Soy un desastre para los nombres.", en: "Yes, thanks! Sorry, what was your name? I'm hopeless with names.", delta: 8, tag: "🙂 Honest",
            react: "Carmen. ¡No te preocupes!", reactEn: "Carmen. Don't worry!", why: "Asking again honestly is much better than using the wrong name." },
          { de: "Hola… ¿señora Rodríguez?", en: "Hello… Mrs Rodríguez?", delta: -4, tag: "😐 Forgot her name",
            react: "Carmen. Pero no pasa nada.", reactEn: "Carmen. But never mind.", why: "That happens to everyone. Better: ask again honestly." },
          { de: "Más o menos. ¿Quién pone la radio tan alta a las seis de la mañana?", en: "So-so. Who plays the radio so loud at six in the morning?", delta: -8, tag: "😬 Complaint, not a hello",
            react: "Ay… pues soy yo. Perdona.", reactEn: "Oh… that's me. Sorry.", why: "You can mention a problem, but not as the answer to ¿Qué tal?." },
        ],
      },
      {
        who: "schulz", wheel: 1, du: true, situation: "Carmen stays by the letter boxes. She seems to have time for a chat.",
      },
    ],
    more: "/culture/tu-or-usted",
  },
  {
    id: "paket", place: "At your front door", backdrop: "wohnungstuer",
    props: [{ icon: "1F4E6", x: 74, y: 60 }, { icon: "1F6AA", x: 18, y: 18 }, { icon: "1F514", x: 34, y: 30 }],
    people: [{ id: "koch", mascot: "bruno", name: "Iker", role: "next-door neighbour" }],
    turns: [
      {
        who: "koch", situation: "The doorbell rings. Your neighbour is at the door.",
        npc: "Perdona que te moleste. ¿Me podrías recoger hoy un paquete? No vuelvo hasta la noche.", en: "Sorry to bother you. Could you take in a parcel for me today? I won't be back until tonight.",
        options: [
          { de: "¡Claro, sin problema! Hoy estoy en casa todo el día.", en: "Of course, no problem! I'm at home all day today.", delta: 14, tag: "😊 Good neighbour",
            react: "¡Genial, muchas gracias!", reactEn: "Great, thanks very much!", why: "Taking in parcels for neighbours is a normal small favour." },
          { de: "Lo siento, hoy yo tampoco estoy. ¿Por qué no le preguntas a Carmen?", en: "Sorry, I'm out today as well. Why don't you ask Carmen?", delta: 6, tag: "🙂 Honest no",
            react: "Buena idea, gracias.", reactEn: "Good idea, thanks.", why: "Saying no is fine, and with a tip it's really kind." },
          { de: "¿Y qué hay dentro?", en: "And what's inside?", delta: -6, tag: "😬 Nosy",
            react: "Eh… libros. ¿Importa?", reactEn: "Er… books. Does it matter?", why: "What's in the parcel is none of your business. Yes or no is enough." },
          { de: "¿Y yo qué gano?", en: "And what do I get out of it?", delta: -12, tag: "😱 Business deal",
            react: "… Se lo pido a otra persona.", reactEn: "… I'll ask someone else.", why: "Taking in a parcel is a small favour between neighbours, not a business deal." },
        ],
      },
      {
        who: "koch", situation: "In the evening Iker rings again, with a plastic tub.",
        npc: "¡Gracias otra vez! Toma, unas croquetas caseras.", en: "Thanks again! Here you are, some homemade croquettes.",
        options: [
          { de: "¡Qué buena pinta! No hacía falta, de verdad. Luego te devuelvo el táper.", en: "They look delicious! You really didn't need to. I'll give you the tub back later.", delta: 14, tag: "😊 Modest thanks",
            react: "Sin prisa, sin prisa. ¡Buenas noches!", reactEn: "No rush at all. Good night!", why: "No hacía falta is the classic answer to a small present. And a tub always goes back to its owner, often with something inside." },
          { de: "¡Gracias! Para lo que necesites.", en: "Thanks! Anything you need.", delta: 8, tag: "🙂 Friendly",
            react: "¡Da gusto tener estos vecinos!", reactEn: "It's great to have neighbours like this!", why: "Short, friendly, all correct." },
          { de: "(Take the tub and close the door)", en: "(Take it without a word and shut the door)", delta: -6, tag: "😬 Silent",
            react: "(He stands at the door for a moment.)", why: "A quick Gracias is part of it." },
          { de: "¿Solo croquetas? Yo prefiero vino.", en: "Just croquettes? I'd rather have wine.", delta: -14, tag: "😱 Ungrateful",
            react: "Ah. Vale… buenas noches.", reactEn: "Oh. OK… good night.", why: "You don't comment on a present. You just say thank you." },
        ],
      },
    ],
    more: "/culture/insider/please-and-thank-you",
  },
  {
    id: "party", place: "Your party", backdrop: "party",
    props: [{ icon: "1F389", x: 20, y: 14 }, { icon: "1F3B6", x: 50, y: 10 }, { icon: "1F382", x: 82, y: 40 }],
    people: [{ id: "wolf", mascot: "hamsti", name: "Señor Molina", role: "downstairs neighbour" }],
    turns: [
      {
        who: "wolf", situation: "Saturday, half past midnight. Your birthday party is loud. The doorbell rings.",
        npc: "Buenas noches. Son las doce y media, y mañana trabajo temprano.", en: "Good evening. It's half past twelve, and I work early tomorrow.",
        options: [
          { de: "¡Uy, lo siento mucho! Ahora mismo bajamos la música.", en: "Oh, I'm so sorry! We'll turn the music down right now.", delta: 16, tag: "😊 Understanding",
            react: "Gracias, se lo agradezco.", reactEn: "Thanks, I appreciate it.", why: "Spain goes to bed late, but neighbours still need to sleep. Saying sorry and turning it down is the best answer." },
          { de: "¿Por qué no pasa y se toma algo con nosotros?", en: "Why don't you come in and have a drink with us?", delta: 6, tag: "🙂 Charming, but…",
            react: "Muy amable, pero quiero dormir.", reactEn: "Very kind, but I want to sleep.", why: "A very Spanish idea, and nice! But the music still has to go down." },
          { de: "¡Es sábado! La gente tiene derecho a divertirse.", en: "It's Saturday! People have a right to have fun.", delta: -12, tag: "😱 Argued",
            react: "Los sábados también se duerme.", reactEn: "People sleep on Saturdays too.", why: "Night noise bothers neighbours on any day. The rules depend on your town and your building." },
          { de: "(Close the door and carry on partying)", en: "(Ignore him and keep the music loud)", delta: -18, tag: "😱 Ignored",
            react: "(An hour later the local police ring the bell.)", why: "If you ignore a complaint about noise at night, neighbours can call the local police, and the owners' association may hear about it too." },
        ],
      },
      {
        who: "wolf", situation: "The next morning on the stairs. Señor Molina looks tired.",
        npc: "Buenos días.", en: "Good morning.",
        options: [
          { de: "¡Buenos días! Perdone otra vez por lo de anoche.", en: "Good morning! Sorry again about last night.", delta: 14, tag: "😊 Made it right",
            react: "No pasa nada. Gracias por bajar la música.", reactEn: "It's all right. Thanks for turning the music down.", why: "A second short apology shows it really matters to you." },
          { de: "Buenos días.", en: "Good morning (and nothing more).", delta: 3, tag: "😐 Neutral",
            react: "(He nods.)", why: "Not wrong. A word about last night would have helped." },
          { de: "(Pretend you haven't seen him)", en: "(Look away)", delta: -6, tag: "😬 Avoided him",
            react: "(He shakes his head.)", why: "Avoiding him makes it worse. A greeting and one sentence help." },
          { de: "Tampoco fue para tanto anoche, ¿no?", en: "It wasn't that bad last night, was it?", delta: -8, tag: "😬 Played it down",
            react: "Sí lo fue. Casi no he dormido.", reactEn: "It was. I hardly slept.", why: "The person who was disturbed decides whether it was bad, not you." },
        ],
      },
    ],
    more: "/culture/insider/please-and-thank-you",
  },
  {
    id: "einladung", place: "Invited for dinner", backdrop: "esszimmer",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "1F56F", x: 30, y: 46 }, { icon: "1F337", x: 76, y: 36 }],
    people: [
      { id: "sara", mascot: "quaki", name: "Aitana", role: "neighbour and friend" },
      { id: "lucia", mascot: "regi", name: "Lucía", role: "Aitana's friend" },
    ],
    turns: [
      {
        who: "sara", situation: "Aitana from the third floor has invited you for dinner at half past nine. You ring at twenty to ten.",
        npc: "¡Hola! ¡Qué bien que has venido! ¡Pasa, pasa!", en: "Hi! I'm so glad you came! Come in, come in!",
        options: [
          { de: "¡Hola! Gracias por invitarme. Toma, he traído una botella de vino.", en: "Hi! Thanks for inviting me. Here, I've brought a bottle of wine.", delta: 15, tag: "😊 Brought something",
            react: "¡Qué detalle! No hacía falta.", reactEn: "How thoughtful! You didn't need to.", why: "Many people bring something small: wine, dessert or chocolates. And ten minutes late is fine at a friend's home." },
          { de: "¡Hola! ¿Me quito los zapatos?", en: "Hi! Shall I take my shoes off?", delta: 8, tag: "🙂 Thoughtful",
            react: "No, no, como quieras.", reactEn: "No, no, as you like.", why: "In many Spanish homes guests keep their shoes on, but asking is always fine." },
          { de: "¡Hola! ¿Qué hay de cena? ¡Me muero de hambre!", en: "Hi! What's for dinner? I'm starving!", delta: -4, tag: "😐 Straight to the food",
            react: "¡Ja, ya voy! Entra primero.", reactEn: "Ha, it's coming! Come in first.", why: "First say hello and thanks, then talk about food." },
          { de: "¡Hola! No he traído nada, total, tú tienes de todo.", en: "Hi! I haven't brought anything; you've got everything anyway.", delta: -12, tag: "😱 Empty-handed",
            react: "Eh… bueno. Pasa.", reactEn: "Er… well. Come in.", why: "Coming empty-handed isn't terrible. Saying it like that is." },
        ],
      },
      {
        who: "lucia", situation: "In the living room Aitana says “Esta es Lucía”. Lucía smiles and leans towards you.",
        npc: "¡Hola! ¿Qué tal?", en: "Hi! How are you?",
        options: [
          { de: "(Two kisses: cheek to cheek, one side, then the other) ¡Hola! Mucho gusto.", en: "(Two kisses: cheek to cheek, one side, then the other) Hi! Nice to meet you.", delta: 14, tag: "😊 Dos besos",
            react: "¡Igualmente!", reactEn: "Likewise!", why: "Dos besos are common when friends introduce you. Cheeks touch and the kiss is mostly in the air." },
          { de: "(Smile and hold out your hand) ¡Hola! Mucho gusto.", en: "(Smile and hold out your hand) Hi! Nice to meet you.", delta: 8, tag: "🙂 A handshake",
            react: "¡Igualmente! (She shakes your hand.)", reactEn: "Likewise!", why: "If you'd rather not kiss, for any reason, a handshake and a smile are always fine." },
          { de: "(Plant a loud, wet kiss on her cheek)", en: "(Give her a real kiss on the cheek)", delta: -5, tag: "😐 Real kiss",
            react: "¡Uy! Hola…", reactEn: "Oh! Hi…", why: "With dos besos, lips don't really land on the cheek. It's a touch of the cheeks." },
          { de: "(Jump back) ¡Eh! ¿Pero qué haces?", en: "(Jump back) Hey! What are you doing?", delta: -12, tag: "😱 Alarm",
            react: "Perdona… solo iba a saludarte.", reactEn: "Sorry… I was only going to say hello.", why: "You don't have to kiss anyone, but no alarm is needed: hold out your hand with a smile and people will follow." },
        ],
      },
      {
        who: "sara", situation: "She's made a lentil stew. It's very spicy and you don't like it.",
        npc: "¿Qué? ¿Qué te parece mi nueva receta?", en: "So? What do you think of my new recipe?",
        options: [
          { de: "¡Uy, qué original! Y cómo pica.", en: "Oh, how original! And it's so spicy.", delta: 12, tag: "😊 Polite white lie",
            react: "¿A que sí? Me encanta probar cosas.", reactEn: "Isn't it? I love trying things out.", why: "A polite half-truth protects the host's feelings. And original is even true." },
          { de: "La verdad, pica demasiado para mí. ¡Pero me encanta la idea!", en: "To be honest, it's too spicy for me. But I love the idea!", delta: 8, tag: "🙂 Honest and kind",
            react: "¡Vaya! La próxima, menos guindilla.", reactEn: "Oh no! Less chilli next time.", why: "You can be honest and kind, with a nice word added." },
          { de: "Puaj. ¿Hay pan?", en: "Yuck. Is there any bread?", delta: -15, tag: "😱 Too honest",
            react: "… Sí. En la cocina.", reactEn: "… Yes. In the kitchen.", why: "Honesty is good, but not like that. Aitana made an effort." },
          { de: "(Secretly tip the stew into the plant pot)", en: "(Hide the food in a flowerpot)", delta: -18, tag: "😱 Caught",
            react: "¿Pero… qué haces?", reactEn: "But… what are you doing?", why: "Getting rid of it in secret? If she finds out, it's much more embarrassing than an honest word." },
        ],
      },
      {
        who: "sara", npc: "Venga, ¿un poquito más? ¡Que hay muchísimo!", en: "Come on, a little bit more? There's loads!",
        options: [
          { de: "No puedo más, de verdad, ¡no me cabe nada! Muchas gracias.", en: "I really can't eat any more, I couldn't fit another bite! Thank you very much.", delta: 14, tag: "😊 Saved it nicely",
            react: "¡Ay, me alegro!", reactEn: "Oh, I'm glad!", why: "Hosts often insist, and it's kind, not pushy. No puedo más, de verdad, with a thank you, is the way out." },
          { de: "¡Sí, por favor!", en: "Yes, please!", delta: 3, tag: "😐 Brave",
            react: "¡Genial! ¡Toma, otro plato lleno!", reactEn: "Great! Here, another full plate!", why: "Very polite, but now you have to eat a second plate." },
          { de: "No.", en: "No (and nothing more).", delta: -6, tag: "😬 Blunt",
            react: "Ah. Vale.", reactEn: "Oh. OK.", why: "No, gracias with a kind word sounds much friendlier." },
        ],
      },
      {
        who: "sara", situation: "It's half past eleven and dinner is over. Nobody is getting up.",
        npc: "¿Un café? Así nos quedamos un rato de sobremesa.", en: "A coffee? Then we can sit and chat for a while.",
        options: [
          { de: "¡Claro! Un café solo, gracias. Oye, ¿y de dónde es esa receta?", en: "Of course! A black coffee, thanks. Hey, where's that recipe from?", delta: 14, tag: "😊 Stayed for the sobremesa",
            react: "¡Uy, pues es una larga historia!", reactEn: "Oh, that's a long story!", why: "The sobremesa, the long chat at the table after eating, is often the best part. Nobody is in a hurry." },
          { de: "Un ratito sí, pero mañana madrugo. A las doce me voy.", en: "For a little while, yes, but I've got an early start. I'll go at twelve.", delta: 6, tag: "🙂 Fair",
            react: "Vale, vale, sin problema.", reactEn: "OK, OK, no problem.", why: "Saying you have to get up early is a perfectly good reason to leave." },
          { de: "No, gracias. Ya he cenado, así que me voy.", en: "No, thanks. I've had dinner, so I'm off.", delta: -12, tag: "😱 Ate and ran",
            react: "Ah… bueno. Adiós, entonces.", reactEn: "Oh… well. Bye, then.", why: "Leaving as soon as the plates are empty sounds as if you only came for the food." },
        ],
      },
    ],
    more: "/culture/insider/small-talk-and-sobremesa",
  },
];

const date = [
  {
    id: "date-hallo", place: "Outside the café", backdrop: "cafe",
    props: [{ icon: "2615", x: 80, y: 40 }, { icon: "1F337", x: 16, y: 44 }, { icon: "1F4F1", x: 60, y: 18 }],
    people: [{ id: "alex", mascot: "quaki", name: "Álex", role: "your date" }],
    turns: [
      {
        who: "alex", situation: "Your first date. You only know each other from an app. Álex is already waiting outside the café.",
        npc: "¡Hola! ¡Por fin nos vemos!", en: "Hi! We finally get to meet!",
        options: [
          { de: "¡Hola! ¡Qué alegría conocerte en persona!", en: "Hi! How nice to meet you in person!", delta: 15, tag: "😊 Warm",
            react: "¡Lo mismo digo!", reactEn: "Same here!", why: "Friendly and honest, without comparing Álex to any photos." },
          { de: "¡Hola! ¿Dos besos, o mejor la mano?", en: "Hi! Two kisses, or a handshake?", delta: 8, tag: "🙂 Asked",
            react: "¡Ja, dos besos!", reactEn: "Ha, two kisses!", why: "Asking is never wrong. Many people even find it charming." },
          { de: "(Give a big hug straight away)", en: "(Hug tightly at once)", delta: -6, tag: "😬 Too fast",
            react: "¡Uy! … Hola.", reactEn: "Oh! … Hi.", why: "Dos besos are common, but a big hug is for people you know. Better to wait or ask." },
          { de: "¡Hola! En las fotos parecías otra persona.", en: "Hi! In your photos you looked like a different person.", delta: -16, tag: "😱 Photo comparison",
            react: "… ¿Gracias?", reactEn: "… Thanks?", why: "A comment on looks as your first words? Then the evening is over after ten seconds." },
        ],
      },
      {
        who: "alex", situation: "You sit down at a table. The waiter comes over: “¿Qué os pongo?” Álex looks at you.",
        options: [
          { de: "Hola, para mí un café con leche, por favor. ¡Gracias!", en: "Hello, a white coffee for me, please. Thanks!", delta: 14, tag: "😊 Nice to the staff",
            react: "(Álex smiles.) Yo también, por favor.", reactEn: "The same for me, please.", why: "Your date notices at once how you speak to the staff." },
          { de: "Elige tú por mí, yo nunca sé qué quiero.", en: "You choose for me, I never know what I want.", delta: 3, tag: "😐 Can't decide",
            react: "Eh, vale… ¿dos cafés?", reactEn: "Er, OK… two coffees?", why: "Not terrible, but making a choice comes across as more confident." },
          { de: "(Keep looking at your phone and just point at the menu)", en: "(Look at your phone, point at the menu)", delta: -8, tag: "😬 Not really there",
            react: "(Álex looks at their phone too.)", why: "Your phone isn't your date. Look at the people you're talking to." },
          { de: "(Click your fingers) ¡Eh, tú! ¡Un café!", en: "(Click your fingers) Hey, you! A coffee!", delta: -16, tag: "😱 Finger clicking",
            react: "(Álex looks away, embarrassed.)", why: "How you speak to staff says a lot about you, and clicking your fingers is a big no." },
        ],
      },
    ],
    more: "/culture/insider/dating",
  },
  {
    id: "date-smalltalk", place: "In the café", backdrop: "cafe",
    props: [{ icon: "2615", x: 40, y: 52 }, { icon: "1F370", x: 60, y: 52 }, { icon: "1F56F", x: 84, y: 30 }],
    people: [{ id: "alex", mascot: "quaki", name: "Álex", role: "your date",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "alex", npc: "A ver, cuéntame, ¿qué haces cuando no trabajas?", en: "So tell me, what do you do when you're not working?",
        options: [
          { de: "Me encanta cocinar, y salgo mucho a andar. ¿Y tú?", en: "I love cooking, and I go walking a lot. And you?", delta: 15, tag: "😊 Asked back",
            react: "¿A andar? ¡Yo también! ¿Por dónde vas?", reactEn: "Walking? Me too! Where do you go?", why: "Tell them something about you and ask back: that's how a real conversation starts." },
          { de: "Poca cosa. Trabajar, dormir.", en: "Not much. Work, sleep.", delta: -4, tag: "😐 Conversation over",
            react: "Ah… vale.", reactEn: "Oh… OK.", why: "Give your date something to talk about." },
          { de: "Pues es una larga historia… (20 minutes about your car)", en: "Well, it's a long story… (Talk only about yourself for a long time)", delta: -12, tag: "😱 Monologue",
            react: "(Álex is counting the floor tiles.)", why: "A conversation goes both ways. After two minutes, ask a question!" },
          { de: "Mi ex siempre decía que no tengo aficiones.", en: "My ex always said I have no hobbies.", delta: -14, tag: "😱 The ex",
            react: "Ah… ya.", reactEn: "Oh… right.", why: "Your ex stays at home on a first date. Always." },
        ],
      },
      {
        who: "alex", npc: "Yo trabajo en enfermería, por cierto. En el hospital.", en: "I work in nursing, by the way. At the hospital.",
        options: [
          { de: "Vaya, debe de ser duro. ¿Qué es lo que más te gusta?", en: "Wow, that must be hard. What do you like most about it?", delta: 14, tag: "😊 Interested",
            react: "¡La gente! Cada día es distinto.", reactEn: "The people! Every day is different.", why: "Real interest in the person is the best compliment." },
          { de: "Qué bien.", en: "How nice (and nothing more).", delta: 3, tag: "😐 Short",
            react: "Sí… ¿y tú?", reactEn: "Yes… and you?", why: "Friendly, but a question shows more interest." },
          { de: "¿En un hospital? Uf, yo ahí no trabajaría nunca.", en: "In a hospital? Ugh, I'd never work there.", delta: -12, tag: "😬 Put it down",
            react: "Menos mal que hay otra gente, entonces.", reactEn: "Good thing there are other people, then.", why: "Putting down your date's job is a quick way to end the evening." },
          { de: "¿Y cuánto te pagan por eso?", en: "And how much do they pay you for that?", delta: -14, tag: "😱 Pay question",
            react: "Eso… no es tema de primera cita.", reactEn: "That's… not a first-date topic.", why: "Money isn't a first-date topic. Many people find it awkward even with friends." },
        ],
      },
      {
        who: "alex", wheel: 2, du: true, situation: "Your cups are empty, but you don't want to leave yet. What do you talk about?",
      },
      {
        who: "alex", situation: "You're laughing a lot. You want to pay Álex a compliment.",
        options: [
          { de: "Me encanta cómo te ríes.", en: "I love the way you laugh.", delta: 14, tag: "😊 Charming",
            react: "¡Ay, gracias! Qué bonito.", reactEn: "Oh, thank you! That's lovely.", why: "A compliment about someone's laugh or humour is personal, but not too much." },
          { de: "Tienes muy buen gusto para la música.", en: "You've got really good taste in music.", delta: 8, tag: "🙂 Nice",
            react: "¡Gracias! Podríamos ir a un concierto.", reactEn: "Thanks! We could go to a concert.", why: "A compliment about someone's interests is safe and friendly." },
          { de: "Me caes mucho mejor de lo que esperaba.", en: "I like you much more than I expected.", delta: -6, tag: "😬 Own goal",
            react: "¿Y qué esperabas?", reactEn: "And what were you expecting?", why: "A compliment sounds much better without de lo que esperaba." },
          { de: "¡Esto es amor! ¿Nos casamos?", en: "This is love! Shall we get married?", delta: -12, tag: "😱 Way too much",
            react: "Eh… nos conocemos desde hace una hora.", reactEn: "Er… we met an hour ago.", why: "That much feeling is too fast for a first date, even as a joke." },
        ],
      },
    ],
    more: "/culture/insider/dating",
  },
  {
    id: "date-rechnung", place: "The bill", backdrop: "cafe",
    props: [{ icon: "1F9FE", x: 50, y: 52 }, { icon: "1F4B3", x: 30, y: 54 }, { icon: "1F4B6", x: 72, y: 50 }],
    people: [
      { id: "alex", mascot: "quaki", name: "Álex", role: "your date" },
      { id: "kellner", mascot: "hamsti", name: "Dani", role: "waiter" },
    ],
    turns: [
      {
        who: "kellner", npc: "¿Todo junto o por separado?", en: "All together, or separately?",
        options: [
          { de: "Si te parece, te invito yo. ¿O prefieres que paguemos a medias?", en: "If you like, I'll get this. Or would you rather we split it?", delta: 15, tag: "😊 Offered, didn't decide", by: "alex",
            react: "¡Qué detalle! Entonces la próxima invito yo.", reactEn: "How thoughtful! Then next time I'll pay.", why: "Te invito means “I'm paying”. Offering and asking is fair, and paying half each (a medias) is normal too." },
          { de: "A medias, por favor.", en: "Half each, please.", delta: 6, tag: "🙂 Perfectly normal", by: "alex",
            react: "Vale, a medias.", reactEn: "OK, half each.", why: "Splitting is normal, and small places often prefer it to separate bills. A quick look at your date first would be even nicer." },
          { de: "Por separado. Tú has tomado la tarta de 4,50 y yo la de 4,20, así que me debes 30 céntimos.", en: "Separately. You had the €4.50 cake and I had the €4.20 one, so you owe me 30 cents.", delta: -12, tag: "😱 Penny counter", by: "alex",
            react: "… Toma tus 30 céntimos.", reactEn: "… Here are your 30 cents.", why: "Splitting is normal. Counting every cent isn't attractive." },
          { de: "(Pretend you're looking for your wallet)", en: "(Act as if you can't find your money)", delta: -16, tag: "😱 The old trick", by: "alex",
            react: "Déjalo… ya pago yo.", reactEn: "Forget it… I'll pay.", why: "Everyone knows that trick. Saying honestly what you can afford is much better." },
        ],
      },
      {
        who: "kellner", npc: "Pues son 14,40 en total.", en: "That's €14.40 in total.",
        options: [
          { de: "Toma 15. Quédate con el cambio, gracias.", en: "Here's 15. Keep the change, thanks.", delta: 12, tag: "😊 Rounded up",
            react: "¡Muchas gracias! Que vaya bien.", reactEn: "Thank you very much! Take care.", why: "A tip isn't required in Spain. Rounding up or leaving a few coins is a small thank you for good service." },
          { de: "Con tarjeta, por favor. Gracias.", en: "By card, please. Thanks.", delta: 8, tag: "🙂 Perfectly normal",
            react: "Sí, claro. Aquí tienes.", reactEn: "Yes, of course. Here you go.", why: "Service is included in the price, so paying exactly the bill is normal." },
          { de: "(Leave a five-cent coin and look at it proudly)", en: "(Make a show of leaving a tiny tip)", delta: -4, tag: "😐 Tiny show",
            react: "Gracias… supongo.", reactEn: "Thanks… I suppose.", why: "No tip is fine, and so is a small one. Making a show of it is odd." },
          { de: "¿Propina? ¡Si ya te pagan un sueldo!", en: "A tip? You already get a wage!", delta: -12, tag: "😱 Stingy",
            react: "Claro. Buenas noches.", reactEn: "Of course. Good evening.", why: "Tipping isn't a must, but nobody asked, and saying it like that is rude, in front of your date too." },
        ],
      },
    ],
    more: "/culture/bars-and-paying",
  },
  {
    id: "date-tschuess", place: "Saying goodbye", backdrop: "abend",
    props: [{ icon: "1F319", x: 82, y: 12 }, { icon: "1F6B2", x: 16, y: 50 }, { icon: "1F306", x: 50, y: 8 }],
    people: [{ id: "alex", mascot: "quaki", name: "Álex", role: "your date" }],
    turns: [
      {
        who: "alex", npc: "Me lo he pasado muy bien, pero me tengo que ir.", en: "I've had a really good time, but I have to go.",
        options: [
          { de: "¡Yo también! ¿Te apetece repetir algún día?", en: "Me too! Do you fancy doing it again some day?", delta: 14, tag: "😊 Asked openly",
            react: "Puede… ¡te escribo!", reactEn: "Maybe… I'll message you!", why: "Asking in a friendly way is brave and fair. Álex decides the answer." },
          { de: "Te acompaño a la estación, si quieres.", en: "I'll walk you to the station, if you like.", delta: 8, tag: "🙂 Thoughtful",
            react: "¡Vale, gracias!", reactEn: "OK, thanks!", why: "A kind offer, and si quieres takes the pressure off." },
          { de: "Vale, adiós.", en: "OK, bye.", delta: -4, tag: "😐 Cool",
            react: "Adiós…", reactEn: "Bye…", why: "One sentence about the evening shows you enjoyed it." },
          { de: "¿Ya? ¡Vente a mi casa!", en: "Already? Come back to my place!", delta: -14, tag: "😱 Too much pressure",
            react: "No. Me voy ya.", reactEn: "No. I'm going now.", why: "After a first date that's too soon. And no means no." },
        ],
      },
      {
        who: "alex", situation: "Two days later a message from Álex arrives.",
        npc: "Oye, me caes muy bien, pero creo que no encajamos. ¡Que te vaya muy bien!", en: "Hey, I really like you, but I don't think we're a match. All the best!",
        options: [
          { de: "Qué pena, pero gracias por decírmelo. ¡Que te vaya muy bien a ti también!", en: "What a shame, but thanks for telling me. All the best to you too!", delta: 16, tag: "😊 Respectful",
            react: "Gracias, muy amable.", reactEn: "Thanks, very kind.", why: "Accepting a no and answering kindly: that's how to treat each other with respect." },
          { de: "(Don't reply at all)", en: "(Send no answer)", delta: -4, tag: "😐 Radio silence",
            react: "(No reaction.)", why: "Not replying is OK. A short, kind message is nicer, though." },
          { de: "¿Por qué? ¿Qué he hecho mal? ¡Dame otra oportunidad!", en: "Why? What did I do wrong? Give me another chance!", delta: -12, tag: "😬 Put on pressure",
            react: "Por favor, acéptalo.", reactEn: "Please just accept it.", why: "Pushing puts the other person under pressure. No means no." },
          { de: "(At three in the morning) ¿Duermes ya? 😏", en: "(At three in the morning) Asleep yet?", delta: -18, tag: "😱 Crossed the line",
            react: "(Álex blocks you.)", why: "Messaging after a no, in the middle of the night? Absolutely not." },
        ],
      },
    ],
    more: "/culture/insider/dating",
  },
];

const schule = [
  {
    id: "zu-spaet", place: "Outside the classroom", backdrop: "klasse",
    props: [{ icon: "23F0", x: 80, y: 14 }, { icon: "1F6AA", x: 16, y: 18 }, { icon: "1F4DA", x: 62, y: 46 }],
    people: [{ id: "albrecht", mascot: "regi", name: "Lola", role: "Spanish teacher" }],
    turns: [
      {
        who: "albrecht", situation: "Your Spanish class started at 9. It's quarter past, and the door is shut.",
        options: [
          { de: "(Knock and go in) Perdón por el retraso. El autobús ha llegado tarde.", en: "(Knock, enter) Sorry I'm late. The bus was late.", delta: 14, tag: "😊 Quick apology",
            react: "Tranquilidad, siéntate.", reactEn: "No problem, sit down.", why: "Knock, say sorry briefly, sit down: that disturbs the class least." },
          { de: "(Come in quietly and sit down quickly)", en: "(Enter without speaking and sit)", delta: 4, tag: "😐 Low-key",
            react: "(She nods.)", why: "OK, but a quick Perdón would be more polite." },
          { de: "(Wait outside until the break)", en: "(Stay outside the room)", delta: -6, tag: "😬 Missed a lot",
            react: "Anda, ¿estabas fuera? ¡Qué pena!", reactEn: "Oh, were you outside? What a shame!", why: "Then you miss a lot. Better to knock and come in." },
          { de: "(Come in loudly) ¡Buenas a todos! ¿Qué me he perdido?", en: "(Enter noisily) Hi, everyone! What have I missed?", delta: -12, tag: "😱 Big entrance",
            react: "El principio. Siéntate en silencio, por favor.", reactEn: "The beginning. Please sit down quietly.", why: "If you're late, keep it short and quiet." },
        ],
      },
      {
        who: "albrecht", npc: "Vamos por la página 34, ejercicio 2.", en: "We're on page 34, exercise 2.",
        options: [
          { de: "¡Gracias! (Open your book)", en: "Thank you! (Find the page)", delta: 12, tag: "😊 Straight in",
            react: "Muy bien. ¡Seguimos!", reactEn: "Very good. Let's carry on!", why: "Joining in quickly shows the class matters to you." },
          { de: "¿Cómo? ¡Pero si íbamos por la 30!", en: "What? But we were on page 30!", delta: -6, tag: "😬 Argued",
            react: "Hoy ya hemos hecho cuatro páginas.", reactEn: "We've already done four pages today.", why: "The others were on time. Ask in the break instead." },
          { de: "¿Puedes explicarlo todo otra vez desde el principio?", en: "Can you explain it all again from the beginning?", delta: -8, tag: "😬 Stopped the lesson",
            react: "En el descanso, por favor.", reactEn: "In the break, please.", why: "The others have moved on. Someone can explain the start in the break." },
        ],
      },
    ],
    more: "/culture/insider/time-and-timing",
  },
  {
    id: "du-oder-sie", place: "First day of the course", backdrop: "klasse",
    props: [{ icon: "1F4DD", x: 22, y: 44 }, { icon: "270F", x: 36, y: 46 }, { icon: "1F4D6", x: 76, y: 40 }],
    people: [
      { id: "novak", mascot: "bruno", name: "Javier Soler", role: "course teacher",
        talk: { likes: ["urlaub", "hobbys"], dislikes: ["wetter"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "pilar", mascot: "hamsti", name: "Doña Pilar", role: "older lady at the school office" },
    ],
    turns: [
      {
        who: "novak", situation: "The first day of your new Spanish course. The teacher comes into the room.",
        npc: "¡Buenos días a todos! Soy Javier Soler, vuestro profesor.", en: "Good morning, everyone! I'm Javier Soler, your teacher.",
        options: [
          { de: "¡Buenos días! Mucho gusto.", en: "Good morning! Nice to meet you.", delta: 14, tag: "😊 Spot on",
            react: "¡Igualmente!", reactEn: "Likewise!", why: "A greeting and Mucho gusto is all you need." },
          { de: "Buenos días, profe.", en: "Good morning, teacher.", delta: 6, tag: "🙂 Classroom word",
            react: "¡Muy bien, ya hablas como la gente de aquí!", reactEn: "Very good, you already talk like the people here!", why: "Profe is a friendly word many students use with teachers in Spain." },
          { de: "Buenos días, señor Javier.", en: "Good morning, Mr Javier.", delta: -3, tag: "😐 Mixed up",
            react: "Ja, señor Soler. O Javier, sin más.", reactEn: "Ha, señor Soler. Or just Javier.", why: "Señor and señora go with the family name: señor Soler. With a first name, the respectful form is don Javier." },
          { de: "¡Buenas, Soler!", en: "Hi, Soler!", delta: -12, tag: "😱 Surname only",
            react: "Señor Soler, si no te importa. O Javier.", reactEn: "Señor Soler, if you don't mind. Or Javier.", why: "A surname on its own sounds rude, or like a sports coach shouting." },
        ],
      },
      {
        who: "novak", npc: "Llamadme Javier, por favor. Aquí nos tratamos todos de tú.", en: "Call me Javier, please. We all use tú here.",
        options: [
          { de: "¡Vale, genial! Hola, Javier.", en: "OK, great! Hi, Javier.", delta: 14, tag: "😊 Tú it is",
            react: "¡Perfecto! Empezamos.", reactEn: "Perfect! Let's start.", why: "When the teacher offers tú, you just use it." },
          { de: "Prefiero tratarlo de usted, si no le importa.", en: "I'd rather use usted with you, if you don't mind.", delta: 4, tag: "😐 A bit stiff",
            react: "Como prefieras, sin problema.", reactEn: "Whatever you prefer, no problem.", why: "That's allowed. But when everyone uses tú, it can seem a bit distant." },
          { de: "Vale, Javi, tío, ¿qué pasa?", en: "OK, Javi, mate, what's up?", delta: -6, tag: "😬 Too matey",
            react: "Eh… Javier está bien.", reactEn: "Er… Javier is fine.", why: "Tú doesn't make you best mates. A simple Hola, Javier is right." },
          { de: "Genial, entonces puedo llegar tarde, ¿no?", en: "Great, so I can be late, then, right?", delta: -8, tag: "😬 Got it wrong",
            react: "No. El tú no cambia las normas.", reactEn: "No. Tú doesn't change the rules.", why: "Tú makes things more personal; the rules stay the same." },
        ],
      },
      {
        who: "pilar", situation: "In the break you go to the school office to pay for the course. An older lady looks up from her desk.",
        npc: "Buenos días. ¿En qué puedo ayudarle?", en: "Good morning. How can I help you?",
        options: [
          { de: "Buenos días. Quería pagar el curso, por favor. ¿Puedo hacerlo aquí?", en: "Good morning. I'd like to pay for the course, please. Can I do it here?", delta: 14, tag: "😊 Matched her tone",
            react: "Sí, claro. Siéntese, por favor.", reactEn: "Yes, of course. Please sit down.", why: "If someone uses usted with you (ayudarle), stay polite and formal too until they offer tú." },
          { de: "Hola. ¿Puedes decirme dónde pago el curso?", en: "Hi. Can you tell me where I pay for the course?", delta: -3, tag: "😐 Slipped into tú",
            react: "Aquí mismo. Dígame su nombre.", reactEn: "Right here. Tell me your name.", why: "Not a disaster, as many people use tú quickly, but she spoke to you with usted. Start with ¿Puede…?" },
          { de: "¡Hola, guapa! ¿Qué tal, cómo va eso?", en: "Hi, gorgeous! How's it going?", delta: -12, tag: "😱 Way too familiar",
            react: "Señora, si no le importa.", reactEn: "Señora, if you don't mind.", why: "Guapa and ¿cómo va eso? are for people you know well, not an older person you've just met." },
        ],
      },
      {
        who: "novak", wheel: 1, du: true, situation: "Back in class. Javier is standing next to you at the coffee machine.",
      },
    ],
    more: "/culture/tu-or-usted",
  },
  {
    id: "elterngespraech", place: "Meeting your daughter's teacher", backdrop: "klasse",
    props: [{ icon: "1F4CB", x: 30, y: 46 }, { icon: "1F3A8", x: 80, y: 18 }, { icon: "1F392", x: 18, y: 56 }],
    people: [{ id: "weiss", mascot: "hamsti", name: "Inma", role: "your daughter's class tutor" }],
    turns: [
      {
        who: "weiss", situation: "You have a tutoría, a meeting with the class tutor at your daughter Sofía's school.",
        npc: "Gracias por venir. Sofía trabaja mucho, pero habla bastante en clase.", en: "Thanks for coming. Sofía works hard, but she talks quite a lot in class.",
        options: [
          { de: "Gracias por decírmelo. ¿Qué podemos hacer en casa para ayudar?", en: "Thanks for telling me. What can we do at home to help?", delta: 16, tag: "😊 Constructive",
            react: "¡Buena pregunta! Quizá hablar con ella de las normas de clase.", reactEn: "Good question! Perhaps talk to her about the class rules.", why: "Saying thank you and asking how you can help: that makes a tutoría work." },
          { de: "Vale.", en: "OK (and nothing more).", delta: 3, tag: "😐 Passive",
            react: "… ¿Se te ocurre por qué puede ser?", reactEn: "… Can you think why that might be?", why: "Not wrong, but the meeting is for both of you. Ask something!" },
          { de: "No puede ser. En casa es muy callada.", en: "That can't be right. She's very quiet at home.", delta: -6, tag: "😬 Defensive",
            react: "Pues en clase es distinto.", reactEn: "Well, in class it's different.", why: "The tutor sees Sofía every day. Listening first helps more." },
          { de: "¿No será que tus clases son aburridas?", en: "Could it be that your classes are boring?", delta: -16, tag: "😱 Attack",
            react: "Creo que es mejor hablar con calma.", reactEn: "I think it's better to talk calmly.", why: "Attacking the tutor doesn't help your child. Stay calm and stick to the facts." },
        ],
      },
      {
        who: "weiss", npc: "¿Volvemos a hablar dentro de un mes?", en: "Shall we talk again in a month?",
        options: [
          { de: "Sí, muy bien. ¿Te viene bien el día 25 a las cinco?", en: "Yes, very good. Does the 25th at five suit you?", delta: 14, tag: "😊 Made a date",
            react: "Sí, perfecto. Lo apunto.", reactEn: "Yes, perfect. I'll write it down.", why: "Suggesting a real date shows it matters to you." },
          { de: "Si pasa algo, me llamas.", en: "If anything happens, call me.", delta: 3, tag: "😐 Vague",
            react: "Vale… ya te digo algo.", reactEn: "OK… I'll let you know.", why: "Fine, but a fixed date is more reliable." },
          { de: "Mándame un wasap y ya está.", en: "Just send me a WhatsApp.", delta: -4, tag: "😐 Too private",
            react: "Mejor por la agenda o por el colegio.", reactEn: "Better through the school diary or the school.", why: "Many teachers contact parents through the school's own channels, not a private phone." },
        ],
      },
    ],
    more: "/culture/school-system",
  },
  {
    id: "gruppenarbeit", place: "Group work", backdrop: "klasse",
    props: [{ icon: "1F4CC", x: 50, y: 14 }, { icon: "1F3A8", x: 28, y: 48 }, { icon: "1F4F1", x: 74, y: 50 }],
    people: [{ id: "daniel", mascot: "hamsti", name: "Daniel", role: "from your course" }],
    turns: [
      {
        who: "daniel", situation: "Group work in your Spanish class: you have to make a poster together. Daniel just looks at his phone.",
        npc: "Hacedlo vosotros, que hoy estoy reventado.", en: "You lot do it, I'm shattered today.",
        options: [
          { de: "Te entiendo, pero no me parece justo hacerlo todo yo. ¿Escribes tú el título?", en: "I understand, but I don't think it's fair for me to do it all. Will you write the title?", delta: 16, tag: "😊 “I” message",
            react: "Mmm… vale, tienes razón. Pásame el boli.", reactEn: "Hmm… OK, you're right. Pass me the pen.", why: "With no me parece justo you say what bothers you without blaming him. And a small task helps." },
          { de: "Vale, tranquilo, descansa.", en: "OK, no worries, have a rest.", delta: 3, tag: "😐 Too nice",
            react: "¡Gracias, eres un sol!", reactEn: "Thanks, you're a star!", why: "Kind, but now you're doing everything yourself. It's OK to say what you need." },
          { de: "(Sigh and do it all yourself)", en: "(Do all the work and say nothing)", delta: -4, tag: "😐 Swallowed it",
            react: "(Daniel doesn't notice.)", why: "Swallowing your anger helps nobody. Say kindly what bothers you." },
          { de: "¡Qué vago eres! ¡Nunca haces nada!", en: "You're so lazy! You never do anything!", delta: -14, tag: "😱 Blame",
            react: "¡Oye, relájate!", reactEn: "Hey, calm down!", why: "Qué vago eres and nunca sound like an attack. Then nobody wants to join in." },
        ],
      },
      {
        who: "daniel", npc: "Vale, vale. ¿Qué quieres que haga?", en: "OK, OK. What do you want me to do?",
        options: [
          { de: "¡Genial! Tú haces el título y buscas dos fotos. Yo escribo el texto.", en: "Great! You do the title and find two photos. I'll write the text.", delta: 14, tag: "😊 Clear jobs",
            react: "¡Hecho!", reactEn: "Done!", why: "Clear jobs make group work easier." },
          { de: "Haz lo que quieras.", en: "Do whatever you want.", delta: -6, tag: "😬 Sulking",
            react: "Eh… ¿vale?", reactEn: "Er… OK?", why: "He wants to help now. Take the offer!" },
          { de: "Ya es tarde.", en: "It's too late now.", delta: -8, tag: "😬 Holding a grudge",
            react: "Pues nada, déjalo.", reactEn: "Forget it, then.", why: "Holding a grudge loses you help. Better to start again." },
        ],
      },
    ],
    more: "/culture/insider/directness",
  },
];

export const AREAS = [
  { id: "oeffentlich", title: "Out and about", icon: "1F68F", scenes: unterwegs },
  { id: "arbeit", title: "At work", icon: "1F4BC", scenes: arbeit },
  { id: "zuhause", title: "Home and neighbours", icon: "1F3E0", scenes: zuhause },
  { id: "date", title: "The date", icon: "1F377", scenes: date },
  { id: "schule", title: "School and Spanish class", icon: "1F3EB", scenes: schule },
];

export const areaById = (id) => AREAS.find((a) => a.id === id) ?? null;
