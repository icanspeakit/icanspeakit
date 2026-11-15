// The Manners Simulator (/games/manners): the scenes of one day in Italy, in five areas.
//
// A scene = place + backdrop + people + turns. A turn: someone says something (`npc`, Italian,
// with its English meaning `en`) or a `situation` (English) sets the scene, then the learner
// picks one of 3–4 `options`. There is no single right answer: every option moves the liking of
// the turn's person (`who`) by `delta` (−20 … +20) and the reputation by delta / 2.
//   bands: best +12 … +20 · okay +3 … +8 · awkward −3 … −8 · barbarian −12 … −20
//   at least one option ≥ +10 per turn, never two with the same top delta.
// Each option: `de` (what you say, in Italian – the key name is kept from the German game;
// stage directions in parentheses are English), `en` (its English meaning, under 💡 Help),
// `tag` (the floating label, English), `react` (the person's answer in Italian, said by `who`
// unless `by` names someone else; only-parentheses reactions are English stage directions),
// `reactEn` (its English meaning; none for stage directions) and `why` (one short English
// sentence, shown for good answers too).
// `more` links the culture / insider topic that explains the scene.
// A `wheel: n` turn is the small-talk wheel instead (n topics to pick; `du` = tu, otherwise
// Lei; see TOPICS below and the person's hidden `talk`).
//
// The Italian is the content (A2–B1, standard Italian, it-IT). The player's gender is unknown,
// so the player's lines and what people say to the player avoid gendered forms (no contento/a,
// stanco/a, nuovo/a, "sono andato/a"); Alex in the date is written without gender too
// (scripts/check-knigge.mjs). Tone: funny, never mean – jokes about behaviour, never about
// groups; no comments on bodies, origin or gender; "many people", not "the Italians". Etiquette
// is common practice, not law.

/**
 * All lines are standard Italian as spoken in Italy. Customs that are Italy's: due baci, the
 * meal times (lunch around 1 pm, dinner after 8 pm), paying first at the cassa, the coperto,
 * il numerino at offices, the condominio.
 */
export const VARIETY = "it-IT";

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
 * Lei, `du` = tu; key names kept), `re` the person's answer per kind; `sayEn` and `reEn` are
 * their English meanings. A liked topic, once found, shows a 💡 next time.
 */
export const TOPICS = [
  { id: "wetter", label: "Weather", icon: "2600",
    say: { sie: "Che bella giornata, vero?", du: "Che giornata stupenda, eh?" },
    sayEn: { sie: "It's a lovely day, isn't it?", du: "What a gorgeous day, isn't it?" },
    re: { like: "Splendida! Ho fatto una corsa prima di andare al lavoro.", ok: "Sì, fa piacere vedere il sole.", dislike: "Mah. Il tempo è quello che è." },
    reEn: { like: "Wonderful! I went for a run before work.", ok: "Yes, it's nice to see the sun.", dislike: "Well. The weather is the weather." } },
  { id: "wochenende", label: "Weekend", icon: "1F389",
    say: { sie: "Ha programmi per il fine settimana?", du: "Hai programmi per il weekend?" },
    sayEn: { sie: "Do you have any plans for the weekend?", du: "Got any plans for the weekend?" },
    re: { like: "Sì! Vado al mare. Non vedo l'ora!", ok: "Niente di speciale, riposo.", dislike: "Ahi, devo lavorare." },
    reEn: { like: "Yes! I'm going to the beach. I can't wait!", ok: "Nothing special, just resting.", dislike: "Oh, I have to work." } },
  { id: "arbeit", label: "Work", icon: "1F4BC",
    say: { sie: "E Lei di cosa si occupa?", du: "Tanto lavoro in questo periodo?" },
    sayEn: { sie: "And what do you do for a living?", du: "Busy at work lately?" },
    re: { like: "Adoro il mio lavoro!", ok: "Bene, grazie.", dislike: "Per favore, non parliamo di lavoro…" },
    reEn: { like: "I love my job!", ok: "Fine, thanks.", dislike: "Please, let's not talk about work…" } },
  { id: "hobbys", label: "Hobbies", icon: "1F3B8",
    say: { sie: "Cosa Le piace fare nel tempo libero?", du: "Cosa ti piace fare nel tempo libero?" },
    sayEn: { sie: "What do you like doing in your free time?", du: "What do you like doing in your free time?" },
    re: { like: "Suono la chitarra, quasi ogni sera!", ok: "Mi piace leggere.", dislike: "Tempo libero? Al momento non ne ho." },
    reEn: { like: "I play the guitar, nearly every night!", ok: "I like reading.", dislike: "Free time? I don't have any right now." } },
  { id: "essen", label: "Food", icon: "1F35D",
    say: { sie: "Conosce un buon posto dove mangiare qui vicino?", du: "Conosci un buon posto dove mangiare qui vicino?" },
    sayEn: { sie: "Do you know a good place to eat around here?", du: "Do you know a good place to eat around here?" },
    re: { like: "Sì! Dietro l'angolo c'è una trattoria con una carbonara fantastica.", ok: "Mmm, la trattoria all'angolo non è male.", dislike: "Io preferisco mangiare a casa." },
    reEn: { like: "Yes! Round the corner there's a trattoria with a fantastic carbonara.", ok: "Hmm, the trattoria on the corner isn't bad.", dislike: "I prefer eating at home." } },
  { id: "urlaub", label: "Holidays", icon: "1F3D6",
    say: { sie: "Ha già fatto qualche vacanza quest'anno?", du: "Hai fatto qualche viaggio quest'estate?" },
    sayEn: { sie: "Have you been on holiday this year?", du: "Have you been anywhere this summer?" },
    re: { like: "Sì, in Sardegna! Splendida.", ok: "Non ancora, forse in autunno.", dislike: "Vacanze? Magari." },
    reEn: { like: "Yes, to Sardinia! Beautiful.", ok: "Not yet, maybe in the autumn.", dislike: "A holiday? I wish." } },
  { id: "gehalt", label: "Salary", icon: "1F4B6",
    say: { sie: "E quanto guadagna Lei?", du: "E tu quanto guadagni?" },
    sayEn: { sie: "And how much do you earn?", du: "And how much do you earn?" },
    re: { taboo: "Ehm… preferisco non dirlo." },
    reEn: { taboo: "Um… I'd rather not say." },
    why: "Many people don't talk about their pay with strangers or colleagues: they find it too private." },
  { id: "aussehen", label: "Looks", icon: "1FA9E",
    say: { sie: "Ha una brutta cera, sa?", du: "Che brutta cera che hai." },
    sayEn: { sie: "You don't look well, you know.", du: "You look awful." },
    re: { taboo: "Ah. Grazie. Molto gentile…" },
    reEn: { taboo: "Ah. Thanks. Very kind…" },
    why: "Comments on how someone looks or on their weight are best left out of small talk, even if you mean well." },
  { id: "politik", label: "Politics", icon: "1F5F3",
    say: { sie: "Cosa pensa del Governo?", du: "Che ne pensi del Governo?" },
    sayEn: { sie: "What's your opinion of the government?", du: "What do you think of the government?" },
    re: { taboo: "Preferisco non parlarne.", like: "Bella domanda! Secondo me…", ok: "Mmm, è un tema complicato.", dislike: "Uff, meglio di no." },
    reEn: { taboo: "I'd rather not talk about that.", like: "Good question! I think…", ok: "Hmm, that's a complicated subject.", dislike: "Ugh, better not." },
    why: "Friends in Italy may argue about politics happily, but with someone you've just met it's safer to avoid it." },
  { id: "liebe", label: "Love & exes", icon: "1F48D",
    say: { sie: "Ha un compagno o una compagna?", du: "E il tuo ex, che fine ha fatto?" },
    sayEn: { sie: "Do you have a partner?", du: "So what's your ex up to?" },
    re: { taboo: "È una cosa privata.", ok: "Uff, è una storia lunga.", like: "Ah, proprio adesso ho perso la testa per qualcuno!", dislike: "Parliamo d'altro." },
    reEn: { taboo: "That's private.", ok: "Ugh, it's a very long story.", like: "Ah, I've just lost my head over someone!", dislike: "Let's talk about something else." },
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
      { id: "kunde", mascot: "quaki", name: "Signor Conti", role: "customer waiting" },
      { id: "verkaeuferin", mascot: "hamsti", name: "Giulia", role: "shop assistant" },
    ],
    turns: [
      {
        who: "kunde", situation: "Eight in the morning at the forno. A few people are standing around the shop, not in a line. You walk straight to the counter.",
        npc: "Scusi, ma c'ero prima io.", en: "Excuse me, but I was here before you.",
        options: [
          { de: "Oh, mi scusi! Chi è l'ultimo?", en: "Oh, sorry! Who's last?", delta: 15, tag: "😊 Knows the ritual",
            react: "Sono io. Dopo di me tocca a Lei.", reactEn: "Me. After me, it's your turn.", why: "A queue in a shop is often a loose group, not a line, so when you come in you ask Chi è l'ultimo? and then you know your turn." },
          { de: "Davvero? Non l'ho vista.", en: "Really? I didn't see you.", delta: 4, tag: "😐 A bit stubborn",
            react: "Sì, ero vicino agli scaffali.", reactEn: "Yes, I was by the shelves.", why: "Asking is OK. But the people there know who came first, so listen to them." },
          { de: "È che ho molta fretta.", en: "It's just that I'm in a big hurry.", delta: -8, tag: "😬 Queue jumper",
            react: "E io? E tutti gli altri?", reactEn: "And me? And everyone else?", why: "You can ask Posso passare? (Can I go ahead?), but being in a hurry doesn't give you the turn." },
          { de: "E allora? Qui mica c'è il numerino.", en: "So what? There's no number ticket here.", delta: -16, tag: "😱 Elbows out",
            react: "Incredibile…", reactEn: "Unbelievable…", why: "Even without a numerino or a line, everyone keeps track of who came after whom." },
        ],
      },
      {
        who: "verkaeuferin", npc: "Buongiorno! Mi dica.", en: "Good morning! What can I get you?",
        options: [
          { de: "Buongiorno! Vorrei due filoncini, per favore.", en: "Good morning! I'd like two loaves, please.", delta: 15, tag: "😊 Friendly and clear",
            react: "Subito. Altro?", reactEn: "Right away. Anything else?", why: "Vorrei… is the polite default; a greeting first and per favore make it sound friendly." },
          { de: "Qual è il pane più economico?", en: "What's the cheapest bread?", delta: 3, tag: "😐 Bargain hunter",
            react: "Il pane comune, a quattro euro al chilo.", reactEn: "The ordinary bread, at four euros a kilo.", why: "Asking about prices is fine. A Buongiorno! first would be nicer." },
          { de: "Due filoncini.", en: "Two loaves (and nothing else).", delta: -4, tag: "😐 A bit short",
            react: "Buongiorno, eh?", reactEn: "Good morning to you too, then.", why: "Short orders are normal, but people do expect a greeting when you come in." },
          { de: "Ehi, Lei! Due filoncini, forza!", en: "Hey, you! Two loaves, come on!", delta: -12, tag: "😬 Rude",
            react: "Un attimo, non sono mica una macchina.", reactEn: "Just a moment, I'm not a machine.", why: "Being direct is fine; ordering someone about is not. Start with a greeting and add per favore." },
        ],
      },
      {
        who: "verkaeuferin", npc: "Sono 2,80. Le serve un sacchetto?", en: "That's €2.80. Do you need a bag?",
        options: [
          { de: "No, grazie, ho la mia borsa.", en: "No, thanks, I've brought my own.", delta: 12, tag: "😊 Well prepared",
            react: "Perfetto, grazie.", reactEn: "Perfect, thanks.", why: "Bags cost a few cents in shops, so many people bring their own." },
          { de: "Sì, grazie. Ecco tre euro, tenga il resto.", en: "Yes, thanks. Here's three euros, keep the change.", delta: 6, tag: "🙂 Small tip",
            react: "Oh, grazie mille!", reactEn: "Oh, thanks a lot!", why: "Nobody expects a tip in a bakery, but it's a nice gesture." },
          { de: "(Put the money down without a word and leave)", en: "(Pay, say nothing and go)", delta: -6, tag: "😬 Silent",
            react: "Arrivederci, eh?", reactEn: "Goodbye, then.", why: "On the way out people say a quick Grazie, buona giornata or just Arrivederci." },
          { de: "2,80 per due filoncini? Un furto!", en: "€2.80 for two loaves? That's robbery!", delta: -14, tag: "😱 Moaned",
            react: "I prezzi non li faccio io.", reactEn: "I don't set the prices.", why: "Complaining about prices doesn't help. The shop assistant can't change them." },
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
      { id: "dame", mascot: "regi", name: "Signora Ferri", role: "passenger with a walking stick" },
    ],
    turns: [
      {
        who: "mann", situation: "The metro in Rome is full. A man's bag is on the only empty seat. He's looking at his phone.",
        options: [
          { de: "Scusi, questo posto è libero?", en: "Excuse me, is this seat free?", delta: 15, tag: "😊 Asked politely",
            react: "Ah, scusi! Certo, si sieda pure.", reactEn: "Oh, sorry! Of course, sit down.", why: "È libero? is the normal way to ask for a seat. Scusi is the Lei form, safe with any stranger." },
          { de: "(Keep standing and say nothing)", en: "(Don't speak, just stand)", delta: 3, tag: "😐 Too shy",
            react: "(He doesn't notice.)", why: "That isn't rude. But you're allowed to ask, and it's normal." },
          { de: "(Sigh loudly) Mah, incredibile…", en: "(Sigh loudly) Honestly…", delta: -6, tag: "😬 Passive-aggressive",
            react: "Come? Ah… prego, si sieda.", reactEn: "What? Oh… here, sit down.", why: "Loud sighing comes across as unfriendly. A direct, friendly question works better." },
          { de: "(Just put the bag on the floor)", en: "(Move his bag yourself)", delta: -14, tag: "😱 Hands off!",
            react: "Ehi! È la mia borsa!", reactEn: "Hey! That's my bag!", why: "You don't touch other people's things. Ask first." },
        ],
      },
      {
        who: "dame", situation: "Two stops later an older woman with a walking stick gets on. There are no free seats.",
        npc: "Uff, quanta gente oggi.", en: "Phew, there are so many people today.",
        options: [
          { de: "Vuole sedersi? Prego, si sieda qui.", en: "Would you like to sit down? Here, sit here.", delta: 16, tag: "😊 Thoughtful",
            react: "Che gentile, grazie mille.", reactEn: "How kind, thank you very much.", why: "Many people give up their seat, and Lei fits an older stranger. Some seats are also marked for people who need them." },
          { de: "Sì, la mattina è sempre così.", en: "Yes, mornings are always like this.", delta: 4, tag: "😐 Just small talk",
            react: "Eh già…", reactEn: "Yes, indeed…", why: "A bit of small talk is OK. But what she really needs is a seat." },
          { de: "(Put your headphones in and look out of the window)", en: "(Listen to music and look away)", delta: -12, tag: "😬 Looked away",
            react: "(She holds on with difficulty.)", why: "Pretending not to see feels rude to many people. A quick offer costs nothing." },
        ],
      },
      {
        who: "dame", npc: "Scusi, sa se questa linea ferma a Termini?", en: "Excuse me, do you know if this line stops at Termini?",
        options: [
          { de: "Sì, fra due fermate. Glielo dico io.", en: "Yes, in two stops. I'll tell you.", delta: 14, tag: "😊 Helpful",
            react: "Che gentile, grazie.", reactEn: "How kind, thank you.", why: "Short, clear help and a promise to tell her, in the Lei form she used with you." },
          { de: "Boh.", en: "No idea.", delta: -4, tag: "😐 Abrupt",
            react: "Ah. Va bene.", reactEn: "Oh. Well.", why: "Not knowing is fine. Friendlier: Mi dispiace, non lo so." },
          { de: "Guardi la mappa lì sopra.", en: "Look at the map up there.", delta: -6, tag: "😬 Dismissive",
            react: "Senza occhiali non vedo niente.", reactEn: "I can't see a thing without my glasses.", why: "The tip is right, but it sounds cold. Better to check it quickly yourself." },
          { de: "Termini? E cosa va a fare lì?", en: "Termini? And what are you going there for?", delta: -12, tag: "😱 Too nosy",
            react: "Non sono affari suoi.", reactEn: "That's none of your business.", why: "You don't ask strangers about their plans. Just answer the question." },
        ],
      },
    ],
    more: "/culture/insider/queues-and-personal-space",
  },
  {
    id: "aufzug", place: "In the lift", backdrop: "aufzug",
    props: [{ icon: "1F6D7", x: 82, y: 30 }, { icon: "1F514", x: 16, y: 22 }],
    people: [
      { id: "herr", mascot: "bruno", name: "Signor Bruni", role: "man in the lift",
        talk: { likes: ["wetter", "wochenende"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "botin", mascot: "quaki", name: "Amina", role: "courier with parcels" },
    ],
    turns: [
      {
        who: "herr", situation: "You get into the lift. An older man is already inside.",
        npc: "Buongiorno.", en: "Good morning.",
        options: [
          { de: "Buongiorno.", en: "Good morning.", delta: 12, tag: "😊 Said it back",
            react: "(He nods in a friendly way.)", why: "Many people greet in lifts and waiting rooms, and say Buona giornata when they get out. Buongiorno or just Salve is enough." },
          { de: "Ehilà, amico!", en: "Hi, my friend!", delta: -4, tag: "😐 Too familiar",
            react: "… Salve.", reactEn: "… Hello.", why: "With an older stranger, Buongiorno is right, without the amico." },
          { de: "(Say nothing, look at your phone)", en: "(Don't answer, check your phone)", delta: -5, tag: "😐 Silent",
            react: "(He looks at the door.)", why: "Many people think it's unfriendly not to answer a greeting." },
          { de: "Buongiorno. Non ho chiuso occhio, il vicino russa e la schiena mi uccide…", en: "Good morning. I haven't slept a wink, my neighbour snores and my back is killing me…", delta: -8, tag: "😬 Too much information",
            react: "Eh… mi dispiace.", reactEn: "Right… I'm sorry.", why: "In a lift a greeting and perhaps a word about the weather will do. Your back is for friends." },
        ],
      },
      {
        who: "herr", wheel: 1, situation: "The lift is slow. Seven more floors… The silence is getting awkward. Say something! He's an older stranger, so you use Lei.",
      },
      {
        who: "botin", situation: "The lift stops on the second floor. A woman with two parcels wants to get in.",
        npc: "C'è posto anche per me?", en: "Is there room for me too?",
        options: [
          { de: "Certo, prego! (Step aside a little)", en: "Of course, come in! (Make some space)", delta: 14, tag: "😊 Made room",
            react: "Grazie, molto gentile.", reactEn: "Thanks, very kind.", why: "Making room is all it takes. People often stand fairly close, but a lift is a good moment to give a little space." },
          { de: "(Stay very close to her, although there's room)", en: "(Stand right next to her)", delta: -6, tag: "😬 Too close",
            react: "(She moves away.)", why: "Personal space may be smaller than you're used to, but if there's room, nobody needs you that close." },
          { de: "Eh, meglio se aspetta il prossimo.", en: "Ugh, better wait for the next one.", delta: -12, tag: "😬 Turned away",
            react: "Ma c'è un sacco di posto.", reactEn: "But there's plenty of room.", why: "If there's room, you let people in. Anything else feels cold." },
          { de: "(Quickly press “close door”)", en: "(Shut the door on her)", delta: -18, tag: "😱 Door in her face",
            react: "Ehi! …", reactEn: "Hey! …", why: "Closing the door in someone's face is a real manners disaster." },
        ],
      },
      {
        who: "botin", npc: "Uff, quanto pesano. Mi premi il quattro, per favore?", en: "Phew, these are heavy. Could you press four for me, please?",
        options: [
          { de: "Certo! Ti do una mano con un pacco?", en: "Of course! Shall I help you with one parcel?", delta: 15, tag: "😊 Thought ahead",
            react: "Oh sì, grazie. Sei un angelo.", reactEn: "Oh, yes, thanks. You're an angel.", why: "A little help when someone has their hands full makes almost anyone happy." },
          { de: "(Press four)", en: "(Press the button)", delta: 6, tag: "🙂 Done",
            react: "Grazie!", reactEn: "Thanks!", why: "Perfectly fine. A quick Prego makes it even friendlier." },
          { de: "Ho l'aria di un ascensorista?", en: "Do I look like a lift attendant?", delta: -15, tag: "😱 Snappy",
            react: "Va bene… scusa se ho chiesto.", reactEn: "OK… sorry I asked.", why: "Saying no to a tiny favour and making fun of it is very rude." },
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
        who: "touristin", npc: "Scusa, come arrivo al Comune?", en: "Excuse me, how do I get to the town hall?",
        options: [
          { de: "Vai dritto e gira alla seconda a sinistra. Sono circa cinque minuti a piedi.", en: "Go straight on and take the second left. It's about five minutes on foot.", delta: 15, tag: "😊 Clear directions",
            react: "Perfetto, grazie mille!", reactEn: "Great, thank you very much!", why: "Short and clear: that's how you give directions. She used tu, so you can too." },
          { de: "Mi dispiace, non lo so. Perché non chiedi all'edicola?", en: "Sorry, I don't know. Why don't you ask at the newsstand?", delta: 8, tag: "🙂 Honest",
            react: "Ok, grazie lo stesso!", reactEn: "OK, thanks anyway!", why: "Mi dispiace, non lo so is perfectly fine, and with a tip it's even better." },
          { de: "Il Comune? Mah, di là… o forse di là… credo.", en: "The town hall? Well, that way… or over there… I think.", delta: -6, tag: "😬 Confusing",
            react: "Ehm… grazie?", reactEn: "Er… thanks?", why: "Better to say you don't know than to send someone the wrong way." },
          { de: "(Walk on without answering)", en: "(Ignore her and keep walking)", delta: -14, tag: "😱 Ignored",
            react: "Ciao? …", reactEn: "Hello? …", why: "When someone speaks to you, you answer briefly, even if it's only Scusa, vado di fretta." },
        ],
      },
      {
        who: "touristin", npc: "Me lo fai vedere sulla mappa?", en: "Can you show me on the map?",
        options: [
          { de: "Certo. Siamo qui, e il Comune è lì.", en: "Of course. We're here, and the town hall is there.", delta: 12, tag: "😊 Patient",
            react: "Ah, adesso ho capito!", reactEn: "Ah, now I get it!", why: "Patience is friendly. On a map it's often easier." },
          { de: "Vado anch'io da quella parte. Vieni con me!", en: "I'm going that way too. Come with me!", delta: 8, tag: "🙂 Very helpful",
            react: "Che gentile!", reactEn: "How kind!", why: "Very friendly! But nobody has to go that far. Showing her is enough." },
          { de: "(Take her phone and tap on it for ages)", en: "(Take her phone and use it for a long time)", delta: -6, tag: "😬 Took over",
            react: "Ehm… mi ridai il telefono?", reactEn: "Er… can I have my phone back?", why: "You don't just take someone else's phone. Showing her is enough." },
          { de: "Ma non hai il telefono per queste cose?", en: "Don't you have your phone for that?", delta: -12, tag: "😱 Annoyed",
            react: "Sì, ma non ci capisco niente.", reactEn: "Yes, but I can't make sense of it.", why: "She's asking you because she needs help. Making fun of her doesn't help." },
        ],
      },
    ],
    more: "/culture/insider/please-and-thank-you",
  },
  {
    id: "menu-del-dia", place: "Lunch out", backdrop: "cafe",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "23F0", x: 80, y: 14 }, { icon: "1F9FE", x: 22, y: 44 }],
    people: [{ id: "camarero", mascot: "bruno", name: "Matteo", role: "waiter" }],
    turns: [
      {
        who: "camarero", situation: "A quarter to twelve. You're hungry and walk into a trattoria. The tables are being laid, and two people are having a coffee at the banco.",
        npc: "Buongiorno. Il pranzo lo serviamo dalle dodici e mezza.", en: "Good morning. We serve lunch from half past twelve.",
        options: [
          { de: "Va bene, intanto prendo un cappuccino al banco.", en: "OK, in the meantime I'll have a cappuccino at the counter.", delta: 14, tag: "😊 Knows the clock",
            react: "Certo, glielo preparo subito.", reactEn: "Of course, I'll make it right away.", why: "Lunch is usually around 1 pm; a cappuccino is fine in the morning, and after a meal many people stay with an espresso, but nobody will stop you." },
          { de: "C'è qualcosa da stuzzicare?", en: "Is there anything to nibble?", delta: 8, tag: "🙂 Good idea",
            react: "Sì, dei crostini col pomodoro.", reactEn: "Yes, some crostini with tomato.", why: "Good thinking: many bars have a little something at the counter even when the kitchen is closed." },
          { de: "Ma è già ora di pranzo!", en: "But it's already lunchtime!", delta: -8, tag: "😬 Wrong clock",
            react: "Qui, alle dodici e mezza.", reactEn: "Here, at half past twelve.", why: "11:45 is still morning for many people. The waiter isn't the one to argue with about it." },
          { de: "Che posto. Qui non si mangia mai.", en: "What a place. You never get to eat here.", delta: -12, tag: "😱 Grumbled",
            react: "Dalle dodici e mezza, come Le ho detto.", reactEn: "From half past twelve, as I told you.", why: "Different hours aren't bad service. Have a coffee, or come back later." },
        ],
      },
      {
        who: "camarero", situation: "You come back at one and the place is full.",
        npc: "Menù del giorno? Come primo abbiamo la zuppa di lenticchie o le penne all'arrabbiata, e come secondo pollo arrosto o merluzzo.", en: "The set lunch? For the first course there's lentil soup or penne all'arrabbiata, and for the second, roast chicken or hake.",
        options: [
          { de: "Come primo la zuppa di lenticchie e come secondo il merluzzo, per favore.", en: "Lentil soup for the first course and hake for the second, please.", delta: 14, tag: "😊 Ordered like a local",
            react: "Benissimo. E da bere?", reactEn: "Very good. And to drink?", why: "The menù del giorno is a set price for two courses, often with water and a coffee. Come primo… come secondo… is how you order it." },
          { de: "Cosa mi consiglia?", en: "What do you recommend?", delta: 8, tag: "🙂 Asked",
            react: "Il merluzzo, oggi è ottimo.", reactEn: "The hake, it's very good today.", why: "Always a good question, and people like being asked." },
          { de: "Posso avere solo il pollo, ma a metà prezzo?", en: "Can I just have the chicken, but at half price?", delta: -5, tag: "😐 Haggling",
            react: "Il menù è il menù.", reactEn: "The set menu is the set menu.", why: "It's asked politely, but set prices aren't for haggling. Some places do a smaller menù ridotto, so you can ask if they have one." },
          { de: "Lenticchie ancora? Che menù povero!", en: "Lentils again? What a poor menu!", delta: -14, tag: "😱 Insulted the food",
            react: "Sono quelle di mia madre.", reactEn: "They're my mother's.", why: "Lentil soup is a much-loved dish. Insulting the food is the fastest way to lose the waiter." },
        ],
      },
      {
        who: "camarero", situation: "You finished your espresso twenty minutes ago. Nobody has brought the bill, and you start to feel forgotten.",
        options: [
          { de: "(Catch his eye) Mi porta il conto, per favore?", en: "(Catch his eye) Could you bring me the bill, please?", delta: 15, tag: "😊 Asked for the bill",
            react: "Subito.", reactEn: "Right away.", why: "The bill usually comes only when you ask: Il conto, per favore. Don't be surprised by the coperto, a small cover charge per person." },
          { de: "(Wait another half hour, getting annoyed)", en: "(Keep waiting and get annoyed)", delta: -3, tag: "😐 Waiting for nothing",
            react: "(He thinks you're enjoying the chat.)", why: "He isn't ignoring you. He's letting you sit as long as you like." },
          { de: "(Shout across the room) Ehi! Il conto!", en: "(Shout across the room) Hey! The bill!", delta: -6, tag: "😬 Too loud",
            react: "Arrivo, arrivo…", reactEn: "I'm coming, I'm coming…", why: "Trattorie can be loud, but a wave or Scusi, il conto? does the job much better." },
          { de: "(Decide they've forgotten and walk out)", en: "(Leave without paying)", delta: -18, tag: "😱 Did a runner",
            react: "Ehi! Non ha pagato!", reactEn: "Hey! You haven't paid!", why: "The bill not coming doesn't mean it's free. Ask for it." },
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
    people: [{ id: "lena", mascot: "regi", name: "Chiara", role: "colleague",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "lena", situation: "Monday morning at the macchinetta del caffè. Everyone in your team uses tu.",
        npc: "Buongiorno! Com'è andato il weekend?", en: "Good morning! How was your weekend?",
        options: [
          { de: "Benissimo, grazie! Ho fatto una gita in montagna. E tu?", en: "Very good, thanks! I went on a trip to the mountains. And you?", delta: 15, tag: "😊 Asked back",
            react: "Che bello! Io ho visto un film al cinema.", reactEn: "How nice! I saw a film at the cinema.", why: "A short answer and E tu?: perfect small talk." },
          { de: "Bene.", en: "Good (and nothing more).", delta: -3, tag: "😐 Conversation over",
            react: "Ah… ok.", reactEn: "Oh… OK.", why: "Polite, but the chat is over at once. One more sentence and E tu? help." },
          { de: "Uff, non chiedermelo. Il padrone di casa, la schiena, il mio ex…", en: "Ugh, don't even ask. My landlord, my back, my ex…", delta: -8, tag: "😬 Too personal",
            react: "Ah… che storia.", reactEn: "Oh… what a story.", why: "Small talk isn't therapy. Save your problems for friends." },
          { de: "E perché vuoi saperlo?", en: "And why do you want to know?", delta: -15, tag: "😱 Suspicious",
            react: "Boh… così, per chiedere.", reactEn: "Er… no reason, just asking.", why: "The question is only small talk, not a check on you." },
        ],
      },
      {
        who: "lena", npc: "A proposito, oggi è il mio compleanno. Ho portato dei cornetti, serviti pure!", en: "By the way, it's my birthday today. I've brought some croissants, help yourselves!",
        options: [
          { de: "Tanti auguri! Li hai fatti tu?", en: "Happy birthday! Did you make them yourself?", delta: 14, tag: "😊 Congratulated",
            react: "Sì, è la ricetta di mia nonna!", reactEn: "Yes, it's my grandmother's recipe!", why: "In many Italian workplaces the birthday person brings the treats. Auguri! comes first." },
          { de: "Grazie, che bell'aspetto! (Take one)", en: "Thanks, they look delicious! (Take one)", delta: 6, tag: "🙂 Polite",
            react: "Buon appetito!", reactEn: "Enjoy!", why: "Perfectly fine, but on a birthday an Auguri! wouldn't hurt." },
          { de: "(Take three and wrap one up for later)", en: "(Take a lot of pastries)", delta: -8, tag: "😬 Greedy",
            react: "Ah… sono per tutti.", reactEn: "Oh… they're for everyone.", why: "When someone brings something for everyone, you take one first." },
          { de: "No. Lo zucchero è un veleno, e non dovresti mangiarlo neanche tu.", en: "No. Sugar is poison, and you shouldn't eat it either.", delta: -13, tag: "😱 Lecturing",
            react: "Ehm… volevo solo essere gentile.", reactEn: "Er… I was only trying to be nice.", why: "Saying no is fine, but without a lecture. Oggi no, grazie, ma auguri! is enough." },
        ],
      },
      {
        who: "lena", wheel: 2, du: true, situation: "You're still at the coffee machine. What do you talk to Chiara about?",
      },
    ],
    more: "/culture/insider/small-talk-and-the-aperitivo",
  },
  {
    id: "erster-tag", place: "First day at work", backdrop: "buero",
    props: [{ icon: "1F4BB", x: 22, y: 34 }, { icon: "1F4C8", x: 78, y: 20 }, { icon: "23F0", x: 50, y: 12 }],
    people: [{ id: "chefin", mascot: "bruno", name: "Elena Ferraro", role: "your manager" }],
    turns: [
      {
        who: "chefin", situation: "Your first day in a new job. You arrive at 8:55; work starts at 9.",
        npc: "Buongiorno! Oggi inizi tu, giusto? Io sono Elena.", en: "Good morning! You start today, right? I'm Elena.",
        options: [
          { de: "Buongiorno! Sì, è il mio primo giorno. Piacere, Elena. (Shake hands)", en: "Good morning! Yes, it's my first day. Pleased to meet you, Elena. (Shake hands)", delta: 15, tag: "😊 Great first impression",
            react: "Piacere mio. Siamo contenti di averti con noi!", reactEn: "My pleasure. We're glad to have you with us!", why: "Piacere and a handshake are safe at work. If she leans in for due baci, go along with it." },
          { de: "(Nod and look at the floor)", en: "(Nod and look down)", delta: -4, tag: "😐 Unsure",
            react: "Rilassati, qui non mordiamo.", reactEn: "Relax, we don't bite here.", why: "Being shy is OK. One short sentence and eye contact come across as friendlier." },
          { de: "Ciao, capa! Sì, sono io, eccomi qui.", en: "Hi, boss! Yes, that's me, here I am.", delta: -12, tag: "😬 Too casual",
            react: "Ehm… capa? Beh, c'è da lavorare.", reactEn: "Er… boss? Well, there's work to do.", why: "Tu is fine, but Ciao, capa! is too casual for your first minute with your new manager." },
          { de: "Sì. A che ora si stacca, a proposito?", en: "Yes. What time do we finish, by the way?", delta: -14, tag: "😱 Wrong question",
            react: "Alle sei. Ma prima iniziamo.", reactEn: "At six. But let's start first.", why: "Asking about home time on your first day sounds as if you want to leave already." },
        ],
      },
      {
        who: "chefin", npc: "Qui ci diamo tutti del tu, anche con me. Va bene?", en: "Here we all use tu, even with me. All right?",
        options: [
          { de: "Volentieri, Elena. Grazie mille.", en: "Gladly, Elena. Thank you very much.", delta: 14, tag: "😊 Took the offer",
            react: "Perfetto. Vieni, ti faccio vedere tutto.", reactEn: "Perfect. Come on, I'll show you around.", why: "In many workplaces colleagues use tu, even with the boss. When someone offers it, you just take it." },
          { de: "D'accordo. Come preferisce, Elena.", en: "All right. As you prefer, Elena.", delta: 5, tag: "🙂 Stiff but right",
            react: "Non sono mica così seria, eh?", reactEn: "I'm not that serious, you know.", why: "It's correct, but a simple Va bene would sound less like talking to a general." },
          { de: "Sì, dottoressa Ferraro, come desidera.", en: "Yes, Dottoressa Ferraro, as you wish.", delta: -5, tag: "😐 Didn't listen",
            react: "Elena, davvero. E dammi del tu.", reactEn: "Elena, really. And use tu.", why: "Lei is polite, but once someone offers tu, staying on Lei creates distance." },
          { de: "Ottimo. Allora, amica mia, quante ferie ho?", en: "Great. So, my friend, how much holiday do I get?", delta: -12, tag: "😱 Went too far",
            react: "Del tu, ho detto. Non amica mia.", reactEn: "I said tu. Not “my friend”.", why: "Tu doesn't make you best friends. Amica mia is for friends, not for your manager on day one." },
        ],
      },
      {
        who: "chefin", npc: "Domani abbiamo la riunione di squadra alle nove. Ti va bene?", en: "We have a team meeting at nine tomorrow. Does that suit you?",
        options: [
          { de: "Certo. Ci sarò alle nove.", en: "Of course. I'll be there at nine.", delta: 14, tag: "😊 On time",
            react: "Perfetto!", reactEn: "Perfect!", why: "Friends may run ten minutes late, but at work and for appointments, on time means on time." },
          { de: "Posso arrivare alle nove e mezza? È che il mio autobus…", en: "Can I come at half past nine? It's just that my bus…", delta: 3, tag: "😐 Honest, but…",
            react: "Beh, se succede spesso, ne parliamo.", reactEn: "Well, if it keeps happening, we'll talk about it.", why: "Honesty is good, and many workplaces are flexible, but it's not a strong start on day one." },
          { de: "Più o meno. La mattina non sono una persona.", en: "More or less. I'm not human in the mornings.", delta: -6, tag: "😬 Unreliable",
            react: "Capisco. Ma le nove sono le nove.", reactEn: "I see. But nine means nine.", why: "It's a good joke for later, but with your new manager it just sounds unreliable." },
          { de: "Vedremo.", en: "We'll see.", delta: -12, tag: "😱 Couldn't care less",
            react: "Scusa?", reactEn: "Sorry?", why: "Vedremo about a meeting with your manager sounds as if you don't care." },
        ],
      },
    ],
    more: "/culture/insider/time-and-timing",
  },
  {
    id: "meeting", place: "In the meeting", backdrop: "buero",
    props: [{ icon: "1F4CA", x: 50, y: 14 }, { icon: "1F4CB", x: 18, y: 38 }, { icon: "2615", x: 84, y: 40 }],
    people: [{ id: "jonas", mascot: "hamsti", name: "Davide", role: "colleague" }],
    turns: [
      {
        who: "jonas", situation: "Team meeting. Davide is presenting an idea.",
        npc: "La mia idea è questa: da adesso la riunione di squadra è alle sette di mattina. Che ne pensate?", en: "Here's my idea: from now on, team meetings at seven in the morning. What do you all think?",
        options: [
          { de: "Capisco l'idea, ma non so se alle sette va bene a tutti. Che ne dici delle nove?", en: "I understand the idea, but I'm not sure seven suits us all. What about nine?", delta: 16, tag: "😊 Honest and kind",
            react: "Mmm, hai ragione. Anche alle nove va bene.", reactEn: "Hmm, you're right. Nine works too.", why: "Say what you think, give a reason and suggest something else: in a meeting that's normal, not rude." },
          { de: "Mmm, interessante.", en: "Hmm, interesting.", delta: -4, tag: "😐 Too vague",
            react: "Grazie! Allora lasciamo così.", reactEn: "Thanks! Let's leave it like that, then.", why: "If you're vague, people take it as a yes. Now the meeting is at seven." },
          { de: "(Say nothing and complain about it at the coffee machine later)", en: "(Be quiet now, talk badly about it later)", delta: -12, tag: "😬 Behind his back",
            react: "(Davide hears about it anyway.)", why: "Talking behind someone's back hurts the team. Disagree in the meeting instead." },
          { de: "È l'idea più stupida che abbia mai sentito.", en: "That's the stupidest idea I've ever heard.", delta: -16, tag: "😱 Far too harsh",
            react: "Ah. Grazie.", reactEn: "Oh. Thanks.", why: "Direct is fine, hurtful isn't. Criticise the idea, not the person, and give a reason." },
        ],
      },
      {
        who: "jonas", situation: "After the meeting. His slides were very long and very colourful.",
        npc: "Che ne pensi della mia presentazione?", en: "What did you think of my presentation?",
        options: [
          { de: "Il contenuto era molto buono. Io farei le slide un po' più corte.", en: "The content was very good. I might make the slides a bit shorter.", delta: 14, tag: "😊 Constructive",
            react: "Buon consiglio, grazie.", reactEn: "Good advice, thanks.", why: "First the good part, then one clear tip: that kind of feedback is easy to accept." },
          { de: "Bellissima! Perfetta!", en: "Great! Perfect!", delta: 4, tag: "😐 Too nice",
            react: "Davvero? Allora la lascio così.", reactEn: "Really? Then I'll leave it as it is.", why: "Kindly meant, but he learns nothing. At work, honest feedback helps more." },
          { de: "Troppo lunga, troppi colori, una noia.", en: "Too long, too many colours, a bore.", delta: -12, tag: "😱 Brutal",
            react: "Ok… questo fa male.", reactEn: "OK… that hurts.", why: "Criticism without a kind word or a tip sounds like an attack." },
        ],
      },
    ],
    more: "/culture/insider/directness",
  },
  {
    id: "feierabend", place: "After work", backdrop: "kneipe",
    props: [{ icon: "1F37A", x: 30, y: 40 }, { icon: "1F3B6", x: 78, y: 18 }, { icon: "1F964", x: 66, y: 42 }],
    people: [{ id: "becker", mascot: "bruno", name: "Giorgio", role: "colleague from accounts",
      talk: { likes: ["urlaub", "wochenende"], dislikes: ["wetter"], taboo: ["gehalt", "politik", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "becker", situation: "Friday, half past six. You don't know Giorgio very well yet.",
        npc: "Bene, settimana finita! Ci prendiamo un aperitivo?", en: "Right, that's the week done! Shall we go for an aperitivo?",
        options: [
          { de: "Volentieri! Io però prendo qualcosa di analcolico.", en: "Gladly! I'll have something non-alcoholic, though.", delta: 14, tag: "😊 In, your way",
            react: "Certo, nessun problema!", reactEn: "Sure, no problem!", why: "Coming along is what counts. Nobody has to drink alcohol: a juice, a bitter analcolico or just water is completely normal." },
          { de: "Oggi non posso, ma la prossima volta di sicuro.", en: "I can't today, but next time, for sure.", delta: 8, tag: "🙂 Kind no",
            react: "Ok, la prossima volta!", reactEn: "OK, next time!", why: "A friendly no with la prossima volta is perfectly fine." },
          { de: "Solo se offri tu.", en: "Only if you're paying.", delta: -3, tag: "😐 Cheeky joke",
            react: "Eh… vedremo.", reactEn: "Ha… we'll see.", why: "A joke. But in a group, people usually take turns to pay." },
          { de: "No, grazie, con i colleghi non esco.", en: "No, thanks, I don't go out with colleagues.", delta: -6, tag: "😬 Cold",
            react: "Ah. Va bene.", reactEn: "Oh. Well.", why: "Saying no is fine, but this sounds as if you don't like your colleagues." },
        ],
      },
      {
        who: "becker", situation: "In the bar round the corner.",
        npc: "Allora, come ti trovi? Ti piace qui?", en: "So, how's it going? Are you liking it here?",
        options: [
          { de: "Molto! La squadra è simpaticissima. Tu da quanto sei qui?", en: "A lot! The team is really nice. How long have you been here?", delta: 14, tag: "😊 Asked back",
            react: "Da dodici anni! Pare impossibile.", reactEn: "Twelve years! Hard to believe.", why: "Say something positive and ask back: good after-work talk." },
          { de: "Bene. A proposito, che ne pensi del Governo?", en: "Good. By the way, what do you think of the government?", delta: -6, tag: "😬 Risky topic",
            react: "Uff… oggi meglio di no.", reactEn: "Ugh… better not today.", why: "You can talk about politics, but over the first drink with a colleague it's risky." },
          { de: "Non male. Anche se il capo è un po' insopportabile, no?", en: "Not bad. Though the boss is a bit unbearable, isn't he?", delta: -12, tag: "😬 Gossip",
            react: "Mmm. Questo non l'ho sentito.", reactEn: "Hmm. I didn't hear that.", why: "Gossiping about your manager when you're new? Word gets around fast." },
          { de: "Bene. Dimmi, quanto guadagni?", en: "Good. Tell me, how much do you earn?", delta: -14, tag: "😱 Pay question",
            react: "Ehm… questo me lo tengo per me.", reactEn: "That's… something I'll keep to myself.", why: "Many people don't ask colleagues about their pay: they find it too private." },
        ],
      },
      {
        who: "becker", situation: "Giorgio comes back from the bar with the drinks.",
        npc: "Ecco qua. Cin cin!", en: "Here you go. Cheers!",
        options: [
          { de: "Cin cin! Grazie. Il prossimo giro lo offro io.", en: "Cheers! Thanks. I'll get the next round.", delta: 14, tag: "😊 Knows about rounds",
            react: "Questo è lo spirito!", reactEn: "That's the spirit!", why: "Friends and colleagues often pay for a giro in turns. Il prossimo lo offro io is the right move." },
          { de: "Cin cin! Quanto ti devo?", en: "Cheers! How much do I owe you?", delta: 6, tag: "🙂 Fair",
            react: "Niente, niente. Offri il prossimo.", reactEn: "Nothing at all. You can get the next one.", why: "Fair and polite. In a group, though, people usually just buy the next round." },
          { de: "(Drink it and say nothing)", en: "(Just drink)", delta: -5, tag: "😐 No thanks",
            react: "(He waits a moment.)", why: "A quick Cin cin! or Grazie is part of it." },
          { de: "(Drink it and go home before your round)", en: "(Leave before you have to pay)", delta: -14, tag: "😱 Skipped your round",
            react: "(Giorgio notices. Everyone notices.)", why: "Leaving just before it's your turn to pay is a famous bar sin." },
        ],
      },
      {
        who: "becker", wheel: 1, du: true, situation: "Giorgio sips his spritz. Now it's your turn to pick a topic.",
      },
    ],
    more: "/culture/the-bar-and-paying",
  },
];

const zuhause = [
  {
    id: "neue-nachbarin", place: "On the stairs", backdrop: "treppenhaus",
    props: [{ icon: "1F4EC", x: 16, y: 34 }, { icon: "1F6AA", x: 84, y: 22 }, { icon: "1F6CD", x: 62, y: 66 }],
    people: [{ id: "schulz", mascot: "regi", name: "Maria Teresa", role: "older neighbour",
      talk: { likes: ["wetter", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } }],
    turns: [
      {
        who: "schulz", situation: "You've just moved into a condominio. On the stairs you meet an older woman with shopping bags.",
        npc: "Buonasera. Abita qui adesso?", en: "Good afternoon. Do you live here now?",
        options: [
          { de: "Sì, buonasera. Ho appena traslocato al secondo piano. E Lei?", en: "Yes, good afternoon. I've just moved to the second floor. And you?", delta: 15, tag: "😊 Introduced yourself",
            react: "Maria Teresa, terzo piano. E diamoci del tu, per favore, che mi fa sentire vecchia.", reactEn: "Maria Teresa, third floor. And let's use tu, please, you're making me feel old.", why: "She used Lei, so you did too. And that's often how you get offered tu: the older person decides, often with Ci diamo del tu?" },
          { de: "Sì! Le do una mano con le buste?", en: "Yes! Shall I help you with the bags?", delta: 8, tag: "🙂 Helpful",
            react: "Che gentile, ma ce la faccio.", reactEn: "How kind, but I can manage.", why: "Offering help is kind, and Le do una mano is the right Lei form. You can still say who you are." },
          { de: "Sì. Qui si sente molto rumore? I muri sembrano sottili.", en: "Yes. Is it noisy here? The walls look thin.", delta: -3, tag: "😐 Started with a moan",
            react: "Beh, non così tanto.", reactEn: "Well, not that bad.", why: "Starting with criticism of the building doesn't feel very friendly." },
          { de: "Sì. E tu chi sei, cara?", en: "Yes. And who are you, dear?", delta: -8, tag: "😬 Too familiar",
            react: "Veramente io Le ho dato del Lei, eh.", reactEn: "Actually, I used Lei with you, you know.", why: "She said Lei to you, so that's how to start with an older neighbour, not with cara." },
        ],
      },
      {
        who: "schulz", situation: "Three days later you meet her by the letter boxes.",
        npc: "Ciao! Come va? Ti stai sistemando?", en: "Hello! How are you? Settling in all right?",
        options: [
          { de: "Ciao, Maria Teresa! Sì, grazie, mi trovo benissimo qui.", en: "Hello, Maria Teresa! Yes, thanks, I really like it here.", delta: 15, tag: "😊 Remembered her name",
            react: "Guarda un po', ti ricordi il mio nome!", reactEn: "Well, you remember my name!", why: "Greeting people by name shows you listened. And now it's tu, as she asked." },
          { de: "Sì, grazie! Scusa, come ti chiami? Sono un disastro con i nomi.", en: "Yes, thanks! Sorry, what's your name? I'm hopeless with names.", delta: 8, tag: "🙂 Honest",
            react: "Maria Teresa. Non ti preoccupare!", reactEn: "Maria Teresa. Don't worry!", why: "Asking again honestly is much better than using the wrong name." },
          { de: "Ciao… signora Rossi?", en: "Hello… Mrs Rossi?", delta: -4, tag: "😐 Forgot her name",
            react: "Maria Teresa. Ma non fa niente.", reactEn: "Maria Teresa. But never mind.", why: "That happens to everyone. Better: ask again honestly." },
          { de: "Così così. Chi mette la radio così forte alle sei di mattina?", en: "So-so. Who plays the radio so loud at six in the morning?", delta: -8, tag: "😬 Complaint, not a hello",
            react: "Ah… sono io. Scusa.", reactEn: "Oh… that's me. Sorry.", why: "You can mention a problem, but not as the answer to Come va?." },
        ],
      },
      {
        who: "schulz", wheel: 1, du: true, situation: "Maria Teresa stays by the letter boxes. She seems to have time for a chat.",
      },
    ],
    more: "/culture/tu-or-lei",
  },
  {
    id: "paket", place: "At your front door", backdrop: "wohnungstuer",
    props: [{ icon: "1F4E6", x: 74, y: 60 }, { icon: "1F6AA", x: 18, y: 18 }, { icon: "1F514", x: 34, y: 30 }],
    people: [{ id: "koch", mascot: "bruno", name: "Luca", role: "next-door neighbour" }],
    turns: [
      {
        who: "koch", situation: "The doorbell rings. Your neighbour is at the door.",
        npc: "Scusa il disturbo. Potresti ritirare un pacco per me oggi? Torno solo stasera.", en: "Sorry to bother you. Could you take in a parcel for me today? I won't be back until tonight.",
        options: [
          { de: "Certo, nessun problema! Oggi sono a casa tutto il giorno.", en: "Of course, no problem! I'm at home all day today.", delta: 14, tag: "😊 Good neighbour",
            react: "Perfetto, grazie mille!", reactEn: "Great, thanks very much!", why: "Taking in parcels for neighbours is a normal small favour." },
          { de: "Mi dispiace, oggi non ci sono neanch'io. Perché non chiedi a Maria Teresa?", en: "Sorry, I'm out today as well. Why don't you ask Maria Teresa?", delta: 6, tag: "🙂 Honest no",
            react: "Buona idea, grazie.", reactEn: "Good idea, thanks.", why: "Saying no is fine, and with a tip it's really kind." },
          { de: "E cosa c'è dentro?", en: "And what's inside?", delta: -6, tag: "😬 Nosy",
            react: "Ehm… libri. Importa?", reactEn: "Er… books. Does it matter?", why: "What's in the parcel is none of your business. Yes or no is enough." },
          { de: "E io cosa ci guadagno?", en: "And what do I get out of it?", delta: -12, tag: "😱 Business deal",
            react: "… Lo chiedo a qualcun altro.", reactEn: "… I'll ask someone else.", why: "Taking in a parcel is a small favour between neighbours, not a business deal." },
        ],
      },
      {
        who: "koch", situation: "In the evening Luca rings again, with a dish wrapped in foil.",
        npc: "Grazie ancora! Tieni, un po' di parmigiana fatta in casa.", en: "Thanks again! Here you are, some homemade parmigiana.",
        options: [
          { de: "Che bell'aspetto! Non dovevi, davvero. Ti riporto il contenitore più tardi.", en: "It looks delicious! You really shouldn't have. I'll bring the dish back later.", delta: 14, tag: "😊 Modest thanks",
            react: "Con calma, con calma. Buonanotte!", reactEn: "No rush at all. Good night!", why: "Non dovevi is the classic answer to a small present. And the dish always goes back to its owner, often with something inside." },
          { de: "Grazie! Per qualsiasi cosa, io ci sono.", en: "Thanks! Anything you need, I'm here.", delta: 8, tag: "🙂 Friendly",
            react: "Che bello avere dei vicini così!", reactEn: "It's great to have neighbours like this!", why: "Short, friendly, all correct." },
          { de: "(Take the dish and close the door)", en: "(Take it without a word and shut the door)", delta: -6, tag: "😬 Silent",
            react: "(He stands at the door for a moment.)", why: "A quick Grazie is part of it." },
          { de: "Solo parmigiana? Io preferisco il vino.", en: "Just parmigiana? I'd rather have wine.", delta: -14, tag: "😱 Ungrateful",
            react: "Ah. Ok… buonanotte.", reactEn: "Oh. OK… good night.", why: "You don't comment on a present. You just say thank you." },
        ],
      },
    ],
    more: "/culture/insider/please-and-thank-you",
  },
  {
    id: "party", place: "Your party", backdrop: "party",
    props: [{ icon: "1F389", x: 20, y: 14 }, { icon: "1F3B6", x: 50, y: 10 }, { icon: "1F382", x: 82, y: 40 }],
    people: [{ id: "wolf", mascot: "hamsti", name: "Signor Molina", role: "downstairs neighbour" }],
    turns: [
      {
        who: "wolf", situation: "Saturday, half past midnight. Your birthday party is loud. The doorbell rings.",
        npc: "Buonasera. Sono le dodici e mezza, e domani mi alzo presto.", en: "Good evening. It's half past twelve, and I get up early tomorrow.",
        options: [
          { de: "Oh, mi dispiace tantissimo! Abbassiamo subito la musica.", en: "Oh, I'm so sorry! We'll turn the music down right now.", delta: 16, tag: "😊 Understanding",
            react: "Grazie, lo apprezzo.", reactEn: "Thanks, I appreciate it.", why: "Many people go to bed late, but neighbours still need to sleep. Saying sorry and turning it down is the best answer." },
          { de: "Perché non entra a prendere qualcosa con noi?", en: "Why don't you come in and have a drink with us?", delta: 6, tag: "🙂 Charming, but…",
            react: "Molto gentile, ma voglio dormire.", reactEn: "Very kind, but I want to sleep.", why: "A friendly idea! But the music still has to go down." },
          { de: "È sabato! La gente ha il diritto di divertirsi.", en: "It's Saturday! People have a right to have fun.", delta: -12, tag: "😱 Argued",
            react: "Anche il sabato si dorme.", reactEn: "People sleep on Saturdays too.", why: "Night noise bothers neighbours on any day. The rules depend on your town and your building." },
          { de: "(Close the door and carry on partying)", en: "(Ignore him and keep the music loud)", delta: -18, tag: "😱 Ignored",
            react: "(An hour later the police ring the bell.)", why: "If you ignore a complaint about noise at night, neighbours can call the police, and the amministratore del condominio may hear about it too." },
        ],
      },
      {
        who: "wolf", situation: "The next morning on the stairs. Signor Molina looks tired.",
        npc: "Buongiorno.", en: "Good morning.",
        options: [
          { de: "Buongiorno! Mi scusi ancora per ieri sera.", en: "Good morning! Sorry again about last night.", delta: 14, tag: "😊 Made it right",
            react: "Non c'è problema. Grazie per aver abbassato la musica.", reactEn: "It's all right. Thanks for turning the music down.", why: "A second short apology shows it really matters to you." },
          { de: "Buongiorno.", en: "Good morning (and nothing more).", delta: 3, tag: "😐 Neutral",
            react: "(He nods.)", why: "Not wrong. A word about last night would have helped." },
          { de: "(Pretend you haven't seen him)", en: "(Look away)", delta: -6, tag: "😬 Avoided him",
            react: "(He shakes his head.)", why: "Avoiding him makes it worse. A greeting and one sentence help." },
          { de: "Non era mica così rumorosa ieri sera, no?", en: "It wasn't that loud last night, was it?", delta: -8, tag: "😬 Played it down",
            react: "Sì che lo era. Ho dormito pochissimo.", reactEn: "It was. I hardly slept.", why: "The person who was disturbed decides whether it was bad, not you." },
        ],
      },
    ],
    more: "/culture/insider/please-and-thank-you",
  },
  {
    id: "einladung", place: "Invited for dinner", backdrop: "esszimmer",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "1F56F", x: 30, y: 46 }, { icon: "1F337", x: 76, y: 36 }],
    people: [
      { id: "sara", mascot: "quaki", name: "Valentina", role: "neighbour and friend" },
      { id: "lucia", mascot: "regi", name: "Francesca", role: "Valentina's friend" },
    ],
    turns: [
      {
        who: "sara", situation: "Valentina from the third floor has invited you for dinner at half past eight. You ring at ten to nine.",
        npc: "Ciao! Che bello che ci sei! Entra, entra!", en: "Hi! How lovely that you're here! Come in, come in!",
        options: [
          { de: "Ciao! Grazie dell'invito. Tieni, ho portato un dolce.", en: "Hi! Thanks for the invitation. Here, I've brought a dessert.", delta: 15, tag: "😊 Brought something",
            react: "Che pensiero gentile! Non dovevi.", reactEn: "How thoughtful! You shouldn't have.", why: "Many people bring something small: dessert, wine or flowers. And ten minutes late is fine at a friend's home." },
          { de: "Ciao! Mi tolgo le scarpe?", en: "Hi! Shall I take my shoes off?", delta: 8, tag: "🙂 Thoughtful",
            react: "No, no, come preferisci.", reactEn: "No, no, as you like.", why: "In many Italian homes guests keep their shoes on, but asking is always fine." },
          { de: "Ciao! Cosa c'è per cena? Muoio di fame!", en: "Hi! What's for dinner? I'm starving!", delta: -4, tag: "😐 Straight to the food",
            react: "Ah, ci siamo quasi! Entra prima.", reactEn: "Ha, almost ready! Come in first.", why: "First say hello and thanks, then talk about food." },
          { de: "Ciao! Non ho portato niente, tanto tu hai già tutto.", en: "Hi! I haven't brought anything; you've got everything anyway.", delta: -12, tag: "😱 Empty-handed",
            react: "Ehm… ok. Entra.", reactEn: "Er… well. Come in.", why: "Coming empty-handed isn't terrible. Saying it like that is." },
        ],
      },
      {
        who: "lucia", situation: "In the living room Valentina says “Questa è Francesca”. Francesca smiles and leans towards you.",
        npc: "Ciao! Piacere!", en: "Hi! Nice to meet you!",
        options: [
          { de: "(Two kisses: cheek to cheek, one side, then the other) Ciao! Piacere.", en: "(Two kisses: cheek to cheek, one side, then the other) Hi! Nice to meet you.", delta: 14, tag: "😊 Due baci",
            react: "Piacere mio!", reactEn: "My pleasure!", why: "Due baci are common when friends introduce you. Cheeks touch and the kiss is mostly in the air." },
          { de: "(Smile and hold out your hand) Ciao! Piacere.", en: "(Smile and hold out your hand) Hi! Nice to meet you.", delta: 8, tag: "🙂 A handshake",
            react: "Piacere mio! (She shakes your hand.)", reactEn: "My pleasure!", why: "If you'd rather not kiss, for any reason, a handshake and a smile are always fine." },
          { de: "(Plant a loud, wet kiss on her cheek)", en: "(Give her a real kiss on the cheek)", delta: -5, tag: "😐 Real kiss",
            react: "Oh! Ciao…", reactEn: "Oh! Hi…", why: "With due baci, lips don't really land on the cheek. It's a touch of the cheeks." },
          { de: "(Jump back) Ehi! Ma cosa fai?", en: "(Jump back) Hey! What are you doing?", delta: -12, tag: "😱 Alarm",
            react: "Scusa… volevo solo salutarti.", reactEn: "Sorry… I was only going to say hello.", why: "You don't have to kiss anyone, but no alarm is needed: hold out your hand with a smile and people will follow." },
        ],
      },
      {
        who: "sara", situation: "She's made a new pasta all'arrabbiata with an extra dose of chilli. It's very spicy and you don't like it.",
        npc: "Allora? Che ne dici della mia nuova ricetta?", en: "So? What do you think of my new recipe?",
        options: [
          { de: "Oh, che originale! E com'è piccante.", en: "Oh, how original! And it's so spicy.", delta: 12, tag: "😊 Polite white lie",
            react: "Vero? Adoro provare cose nuove.", reactEn: "Isn't it? I love trying new things.", why: "A polite half-truth protects the host's feelings. And original is even true." },
          { de: "Sinceramente, per me è troppo piccante. Ma l'idea mi piace!", en: "To be honest, it's too spicy for me. But I love the idea!", delta: 8, tag: "🙂 Honest and kind",
            react: "Accidenti! La prossima volta meno peperoncino.", reactEn: "Oh no! Less chilli next time.", why: "You can be honest and kind, with a nice word added." },
          { de: "Bleah. C'è del pane?", en: "Yuck. Is there any bread?", delta: -15, tag: "😱 Too honest",
            react: "… Sì. In cucina.", reactEn: "… Yes. In the kitchen.", why: "Honesty is good, but not like that. Valentina made an effort." },
          { de: "(Secretly tip the pasta into the plant pot)", en: "(Hide the food in a flowerpot)", delta: -18, tag: "😱 Caught",
            react: "Ma… che fai?", reactEn: "But… what are you doing?", why: "Getting rid of it in secret? If she finds out, it's much more embarrassing than an honest word." },
        ],
      },
      {
        who: "sara", npc: "Dai, ancora un po'? Ce n'è tantissima!", en: "Come on, a little bit more? There's loads!",
        options: [
          { de: "Non ce la faccio più, davvero, non mi entra più niente! Grazie mille.", en: "I really can't eat any more, I couldn't fit another bite! Thank you very much.", delta: 14, tag: "😊 Saved it nicely",
            react: "Che bello, mi fa piacere!", reactEn: "Oh, I'm glad!", why: "Hosts often insist, and it's kind, not pushy. Non ce la faccio più, with a thank you, is the way out." },
          { de: "Sì, volentieri!", en: "Yes, please!", delta: 3, tag: "😐 Brave",
            react: "Perfetto! Tieni, un altro piatto pieno!", reactEn: "Great! Here, another full plate!", why: "Very polite, but now you have to eat a second plate." },
          { de: "No.", en: "No (and nothing more).", delta: -6, tag: "😬 Blunt",
            react: "Ah. Ok.", reactEn: "Oh. OK.", why: "No, grazie with a kind word sounds much friendlier." },
        ],
      },
      {
        who: "sara", situation: "It's half past eleven and dinner is over. Nobody is getting up.",
        npc: "Un caffè? Così restiamo ancora un po' a chiacchierare.", en: "A coffee? Then we can sit and chat for a while.",
        options: [
          { de: "Volentieri! Un caffè, grazie. Senti, da dove viene questa ricetta?", en: "Gladly! An espresso, thanks. Tell me, where's this recipe from?", delta: 14, tag: "😊 Stayed for the chat",
            react: "Eh, è una lunga storia!", reactEn: "Oh, that's a long story!", why: "The long chat at the table after eating is often the best part. Nobody is in a hurry." },
          { de: "Un po', sì, ma domani mi alzo presto. Alle dodici vado via.", en: "For a little while, yes, but I've got an early start. I'll go at twelve.", delta: 6, tag: "🙂 Fair",
            react: "Va bene, va bene, nessun problema.", reactEn: "OK, OK, no problem.", why: "Saying you have to get up early is a perfectly good reason to leave." },
          { de: "No, grazie. Ho cenato, quindi vado.", en: "No, thanks. I've had dinner, so I'm off.", delta: -12, tag: "😱 Ate and ran",
            react: "Ah… va bene. Ciao, allora.", reactEn: "Oh… well. Bye, then.", why: "Leaving as soon as the plates are empty sounds as if you only came for the food." },
        ],
      },
    ],
    more: "/culture/insider/small-talk-and-the-aperitivo",
  },
];

const date = [
  {
    id: "date-hallo", place: "Outside the café", backdrop: "cafe",
    props: [{ icon: "2615", x: 80, y: 40 }, { icon: "1F337", x: 16, y: 44 }, { icon: "1F4F1", x: 60, y: 18 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date" }],
    turns: [
      {
        who: "alex", situation: "Your first date. You only know each other from an app. Alex is already waiting outside the bar.",
        npc: "Ciao! Finalmente ci vediamo!", en: "Hi! We finally get to meet!",
        options: [
          { de: "Ciao! Che bello conoscerti di persona!", en: "Hi! How nice to meet you in person!", delta: 15, tag: "😊 Warm",
            react: "Anch'io!", reactEn: "Same here!", why: "Friendly and honest, without comparing Alex to any photos." },
          { de: "Ciao! Due baci o una stretta di mano?", en: "Hi! Two kisses or a handshake?", delta: 8, tag: "🙂 Asked",
            react: "Ah, due baci!", reactEn: "Ha, two kisses!", why: "Asking is never wrong. Many people even find it charming." },
          { de: "(Give a big hug straight away)", en: "(Hug tightly at once)", delta: -6, tag: "😬 Too fast",
            react: "Oh! … Ciao.", reactEn: "Oh! … Hi.", why: "Due baci are common, but a big hug is for people you know. Better to wait or ask." },
          { de: "Ciao! Nelle foto sembravi un'altra persona.", en: "Hi! In your photos you looked like a different person.", delta: -16, tag: "😱 Photo comparison",
            react: "… Grazie?", reactEn: "… Thanks?", why: "A comment on looks as your first words? Then the evening is over after ten seconds." },
        ],
      },
      {
        who: "alex", situation: "Inside, the bar is busy. Alex points at the till.",
        npc: "Qui prima si paga alla cassa, poi si ordina al banco con lo scontrino. Cosa prendi?", en: "Here you pay at the till first, then you order at the counter with the receipt. What will you have?",
        options: [
          { de: "Un caffè, grazie. Vado io alla cassa, poi ordiniamo al banco.", en: "An espresso, thanks. I'll go to the till, then we order at the counter.", delta: 14, tag: "😊 Knows the order",
            react: "Perfetto. Allora anch'io un caffè.", reactEn: "Perfect. Then an espresso for me too.", why: "Pay at the cassa, take the scontrino to the banco. A plain un caffè is an espresso; for milk ask for a cappuccino or a macchiato." },
          { de: "Ci sediamo al tavolo? Aspettiamo il cameriere.", en: "Shall we sit at a table? We wait for the waiter.", delta: 6, tag: "🙂 Table service",
            react: "Si può, ma al tavolo costa un po' di più.", reactEn: "We can, but it costs a bit more at a table.", why: "Table service often costs more than standing at the banco, and some bars add a coperto. Both are fine." },
          { de: "(Order straight at the counter) Un cappuccino, grazie!", en: "(Order straight at the counter) A cappuccino, thanks!", delta: -8, tag: "😬 Skipped the cassa",
            react: "(The barista points at the till.)", why: "In many bars the barista won't make anything until you show the scontrino." },
          { de: "(Click your fingers) Ehi, tu! Un caffè!", en: "(Click your fingers) Hey, you! A coffee!", delta: -16, tag: "😱 Finger clicking",
            react: "(Alex looks away, embarrassed.)", why: "How you speak to staff says a lot about you, and clicking your fingers is a big no." },
        ],
      },
    ],
    more: "/culture/insider/dating",
  },
  {
    id: "date-smalltalk", place: "In the café", backdrop: "cafe",
    props: [{ icon: "2615", x: 40, y: 52 }, { icon: "1F370", x: 60, y: 52 }, { icon: "1F56F", x: 84, y: 30 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "alex", npc: "Allora, raccontami, cosa fai quando non lavori?", en: "So tell me, what do you do when you're not working?",
        options: [
          { de: "Adoro cucinare e faccio lunghe passeggiate. E tu?", en: "I love cooking, and I go on long walks. And you?", delta: 15, tag: "😊 Asked back",
            react: "Passeggiate? Anch'io! Dove vai di solito?", reactEn: "Walks? Me too! Where do you usually go?", why: "Tell them something about you and ask back: that's how a real conversation starts." },
          { de: "Poco. Lavoro, dormo.", en: "Not much. Work, sleep.", delta: -4, tag: "😐 Conversation over",
            react: "Ah… ok.", reactEn: "Oh… OK.", why: "Give your date something to talk about." },
          { de: "Eh, è una lunga storia… (20 minutes about your car)", en: "Well, it's a long story… (Talk only about yourself for a long time)", delta: -12, tag: "😱 Monologue",
            react: "(Alex is counting the floor tiles.)", why: "A conversation goes both ways. After two minutes, ask a question!" },
          { de: "Il mio ex diceva sempre che non ho hobby.", en: "My ex always said I have no hobbies.", delta: -14, tag: "😱 The ex",
            react: "Ah… capisco.", reactEn: "Oh… I see.", why: "Your ex stays at home on a first date. Always." },
        ],
      },
      {
        who: "alex", npc: "Io lavoro in ospedale, a proposito. Al pronto soccorso.", en: "I work in a hospital, by the way. In A&E.",
        options: [
          { de: "Accidenti, deve essere dura. Cosa ti piace di più?", en: "Wow, that must be hard. What do you like most about it?", delta: 14, tag: "😊 Interested",
            react: "Le persone! Ogni giorno è diverso.", reactEn: "The people! Every day is different.", why: "Real interest in the person is the best compliment." },
          { de: "Che bello.", en: "How nice (and nothing more).", delta: 3, tag: "😐 Short",
            react: "Sì… e tu?", reactEn: "Yes… and you?", why: "Friendly, but a question shows more interest." },
          { de: "In ospedale? Uff, io lì non lavorerei mai.", en: "In a hospital? Ugh, I'd never work there.", delta: -12, tag: "😬 Put it down",
            react: "Meno male che c'è altra gente, allora.", reactEn: "Good thing there are other people, then.", why: "Putting down your date's job is a quick way to end the evening." },
          { de: "E quanto ti pagano per questo?", en: "And how much do they pay you for that?", delta: -14, tag: "😱 Pay question",
            react: "Ehm… non è un argomento da primo appuntamento.", reactEn: "That's… not a first-date topic.", why: "Money isn't a first-date topic. Many people find it awkward even with friends." },
        ],
      },
      {
        who: "alex", wheel: 2, du: true, situation: "Your cups are empty, but you don't want to leave yet. What do you talk about?",
      },
      {
        who: "alex", situation: "You're laughing a lot. You want to pay Alex a compliment.",
        options: [
          { de: "Adoro come ridi.", en: "I love the way you laugh.", delta: 14, tag: "😊 Charming",
            react: "Oh, grazie! Che dolce.", reactEn: "Oh, thank you! That's lovely.", why: "A compliment about someone's laugh or humour is personal, but not too much." },
          { de: "Hai davvero un ottimo gusto musicale.", en: "You've got really good taste in music.", delta: 8, tag: "🙂 Nice",
            react: "Grazie! Potremmo andare a un concerto.", reactEn: "Thanks! We could go to a concert.", why: "A compliment about someone's interests is safe and friendly." },
          { de: "Mi piaci molto di più di quanto pensassi.", en: "I like you much more than I expected.", delta: -6, tag: "😬 Own goal",
            react: "E cosa pensavi?", reactEn: "And what were you expecting?", why: "A compliment sounds much better without di quanto pensassi." },
          { de: "Questo è amore! Ci sposiamo?", en: "This is love! Shall we get married?", delta: -12, tag: "😱 Way too much",
            react: "Ehm… ci conosciamo da un'ora.", reactEn: "Er… we met an hour ago.", why: "That much feeling is too fast for a first date, even as a joke." },
        ],
      },
    ],
    more: "/culture/insider/dating",
  },
  {
    id: "date-rechnung", place: "The bill", backdrop: "cafe",
    props: [{ icon: "1F9FE", x: 50, y: 52 }, { icon: "1F4B3", x: 30, y: 54 }, { icon: "1F4B6", x: 72, y: 50 }],
    people: [
      { id: "alex", mascot: "quaki", name: "Alex", role: "your date" },
      { id: "kellner", mascot: "hamsti", name: "Luca", role: "waiter" },
    ],
    turns: [
      {
        who: "kellner", npc: "Tutto insieme o conti separati?", en: "All together, or separate bills?",
        options: [
          { de: "Se ti va, offro io. Oppure preferisci dividere?", en: "If you like, I'll get this. Or would you rather we split it?", delta: 15, tag: "😊 Offered, didn't decide", by: "alex",
            react: "Che gentile! Allora la prossima volta offro io.", reactEn: "How thoughtful! Then next time I'll pay.", why: "Offrire means “to treat”. Offering and asking is fair, and paying half each is normal too." },
          { de: "Facciamo alla romana, per favore.", en: "Let's split it equally, please.", delta: 6, tag: "🙂 Perfectly normal", by: "alex",
            react: "Va bene, alla romana.", reactEn: "OK, equal shares.", why: "Alla romana means everyone pays the same share, and small places often prefer it to separate bills. A quick look at your date first would be even nicer." },
          { de: "Separati. Tu hai preso la torta da 4,50 e io quella da 4,20, quindi mi devi 30 centesimi.", en: "Separately. You had the €4.50 cake and I had the €4.20 one, so you owe me 30 cents.", delta: -12, tag: "😱 Penny counter", by: "alex",
            react: "… Ecco i tuoi 30 centesimi.", reactEn: "… Here are your 30 cents.", why: "Splitting is normal. Counting every cent isn't attractive." },
          { de: "(Pretend you're looking for your wallet)", en: "(Act as if you can't find your money)", delta: -16, tag: "😱 The old trick", by: "alex",
            react: "Lascia stare… pago io.", reactEn: "Forget it… I'll pay.", why: "Everyone knows that trick. Saying honestly what you can afford is much better." },
        ],
      },
      {
        who: "kellner", npc: "Allora, in tutto sono 14,40.", en: "That's €14.40 in total.",
        options: [
          { de: "Ecco 15. Tenga il resto, grazie.", en: "Here's 15. Keep the change, thanks.", delta: 12, tag: "😊 Rounded up",
            react: "Grazie mille! Buona serata.", reactEn: "Thank you very much! Have a good evening.", why: "A tip isn't required in Italy. Rounding up or leaving a few coins is a small thank you for good service." },
          { de: "Con la carta, per favore. Grazie.", en: "By card, please. Thanks.", delta: 8, tag: "🙂 Perfectly normal",
            react: "Certo. Ecco a Lei.", reactEn: "Of course. Here you go.", why: "Service is often included in the price (or covered by the coperto), so paying exactly the bill is normal." },
          { de: "(Leave a five-cent coin and look at it proudly)", en: "(Make a show of leaving a tiny tip)", delta: -4, tag: "😐 Tiny show",
            react: "Grazie… suppongo.", reactEn: "Thanks… I suppose.", why: "No tip is fine, and so is a small one. Making a show of it is odd." },
          { de: "La mancia? Ma se avete già uno stipendio!", en: "A tip? You already get a wage!", delta: -12, tag: "😱 Stingy",
            react: "Certo. Buona serata.", reactEn: "Of course. Have a good evening.", why: "Tipping isn't a must, but nobody asked, and saying it like that is rude, in front of your date too." },
        ],
      },
    ],
    more: "/culture/the-bar-and-paying",
  },
  {
    id: "date-tschuess", place: "Saying goodbye", backdrop: "abend",
    props: [{ icon: "1F319", x: 82, y: 12 }, { icon: "1F6B2", x: 16, y: 50 }, { icon: "1F306", x: 50, y: 8 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date" }],
    turns: [
      {
        who: "alex", npc: "È stata una serata bellissima, ma devo proprio andare.", en: "It's been a lovely evening, but I really have to go.",
        options: [
          { de: "Anche per me! Ti va di rifarlo qualche volta?", en: "For me too! Do you fancy doing it again some day?", delta: 14, tag: "😊 Asked openly",
            react: "Forse… ti scrivo io!", reactEn: "Maybe… I'll message you!", why: "Asking in a friendly way is brave and fair. Alex decides the answer." },
          { de: "Ti accompagno alla stazione, se vuoi.", en: "I'll walk you to the station, if you like.", delta: 8, tag: "🙂 Thoughtful",
            react: "Ok, grazie!", reactEn: "OK, thanks!", why: "A kind offer, and se vuoi takes the pressure off." },
          { de: "Ok, ciao.", en: "OK, bye.", delta: -4, tag: "😐 Cool",
            react: "Ciao…", reactEn: "Bye…", why: "One sentence about the evening shows you enjoyed it." },
          { de: "Già? Vieni da me!", en: "Already? Come back to my place!", delta: -14, tag: "😱 Too much pressure",
            react: "No. Vado via adesso.", reactEn: "No. I'm going now.", why: "After a first date that's too soon. And no means no." },
        ],
      },
      {
        who: "alex", situation: "Two days later a message from Alex arrives.",
        npc: "Ehi, mi piaci molto, ma credo che non siamo compatibili. Ti auguro il meglio!", en: "Hey, I really like you, but I don't think we're a match. All the best!",
        options: [
          { de: "Peccato, ma grazie per avermelo detto. Tanti auguri anche a te!", en: "What a shame, but thanks for telling me. All the best to you too!", delta: 16, tag: "😊 Respectful",
            react: "Grazie, molto gentile.", reactEn: "Thanks, very kind.", why: "Accepting a no and answering kindly: that's how to treat each other with respect." },
          { de: "(Don't reply at all)", en: "(Send no answer)", delta: -4, tag: "😐 Radio silence",
            react: "(No reaction.)", why: "Not replying is OK. A short, kind message is nicer, though." },
          { de: "Perché? Cosa ho sbagliato? Dammi un'altra possibilità!", en: "Why? What did I do wrong? Give me another chance!", delta: -12, tag: "😬 Put on pressure",
            react: "Per favore, accettalo.", reactEn: "Please just accept it.", why: "Pushing puts the other person under pressure. No means no." },
          { de: "(At three in the morning) Dormi già? 😏", en: "(At three in the morning) Asleep yet?", delta: -18, tag: "😱 Crossed the line",
            react: "(Alex blocks you.)", why: "Messaging after a no, in the middle of the night? Absolutely not." },
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
    people: [{ id: "albrecht", mascot: "regi", name: "Paola", role: "Italian teacher" }],
    turns: [
      {
        who: "albrecht", situation: "Your Italian class started at 9. It's quarter past, and the door is shut.",
        options: [
          { de: "(Knock and go in) Scusi il ritardo. L'autobus è arrivato tardi.", en: "(Knock, enter) Sorry I'm late. The bus was late.", delta: 14, tag: "😊 Quick apology",
            react: "Nessun problema, siediti.", reactEn: "No problem, sit down.", why: "Knock, say sorry briefly, sit down: that disturbs the class least." },
          { de: "(Come in quietly and sit down quickly)", en: "(Enter without speaking and sit)", delta: 4, tag: "😐 Low-key",
            react: "(She nods.)", why: "OK, but a quick Scusi would be more polite." },
          { de: "(Wait outside until the break)", en: "(Stay outside the room)", delta: -6, tag: "😬 Missed a lot",
            react: "Ah, eri fuori? Peccato!", reactEn: "Oh, you were outside? What a shame!", why: "Then you miss a lot. Better to knock and come in." },
          { de: "(Come in loudly) Buongiorno a tutti! Di che cosa si parla?", en: "(Enter noisily) Hi, everyone! What are you talking about?", delta: -12, tag: "😱 Big entrance",
            react: "L'inizio. Siediti in silenzio, per favore.", reactEn: "The beginning. Please sit down quietly.", why: "If you're late, keep it short and quiet." },
        ],
      },
      {
        who: "albrecht", npc: "Siamo a pagina 34, esercizio 2.", en: "We're on page 34, exercise 2.",
        options: [
          { de: "Grazie! (Open your book)", en: "Thank you! (Find the page)", delta: 12, tag: "😊 Straight in",
            react: "Molto bene. Andiamo avanti!", reactEn: "Very good. Let's carry on!", why: "Joining in quickly shows the class matters to you." },
          { de: "Come? Ma eravamo a pagina 30!", en: "What? But we were on page 30!", delta: -6, tag: "😬 Argued",
            react: "Oggi abbiamo già fatto quattro pagine.", reactEn: "We've already done four pages today.", why: "The others were on time. Ask in the break instead." },
          { de: "Puoi rispiegare tutto dall'inizio?", en: "Can you explain it all again from the beginning?", delta: -8, tag: "😬 Stopped the lesson",
            react: "Durante la pausa, per favore.", reactEn: "In the break, please.", why: "The others have moved on. Someone can explain the start in the break." },
        ],
      },
    ],
    more: "/culture/insider/time-and-timing",
  },
  {
    id: "du-oder-sie", place: "First day of the course", backdrop: "klasse",
    props: [{ icon: "1F4DD", x: 22, y: 44 }, { icon: "270F", x: 36, y: 46 }, { icon: "1F4D6", x: 76, y: 40 }],
    people: [
      { id: "novak", mascot: "bruno", name: "Marco Bianchi", role: "course teacher",
        talk: { likes: ["urlaub", "hobbys"], dislikes: ["wetter"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "pilar", mascot: "hamsti", name: "Signora Pia", role: "older lady at the school office" },
    ],
    turns: [
      {
        who: "novak", situation: "The first day of your new Italian course. The teacher comes into the room.",
        npc: "Buongiorno a tutti! Sono Marco Bianchi, il vostro insegnante.", en: "Good morning, everyone! I'm Marco Bianchi, your teacher.",
        options: [
          { de: "Buongiorno! Piacere.", en: "Good morning! Nice to meet you.", delta: 14, tag: "😊 Spot on",
            react: "Piacere mio!", reactEn: "My pleasure!", why: "A greeting and Piacere is all you need." },
          { de: "Buongiorno, professore.", en: "Good morning, professor.", delta: 6, tag: "🙂 Classroom word",
            react: "Ottimo, già parli come da queste parti!", reactEn: "Very good, you already talk like people round here!", why: "Professore is a common, respectful word for teachers in Italy; among themselves students say il prof." },
          { de: "Buongiorno, signor Marco.", en: "Good morning, Mr Marco.", delta: -3, tag: "😐 Mixed up",
            react: "Ah, signor Bianchi. Oppure Marco, e basta.", reactEn: "Ah, Signor Bianchi. Or just Marco.", why: "Signor goes with the family name: signor Bianchi. With a first name alone, it's just Marco." },
          { de: "Ciao, Bianchi!", en: "Hi, Bianchi!", delta: -12, tag: "😱 Surname only",
            react: "Signor Bianchi, se non ti dispiace. O Marco.", reactEn: "Signor Bianchi, if you don't mind. Or Marco.", why: "A surname on its own sounds rude, or like a sports coach shouting." },
        ],
      },
      {
        who: "novak", npc: "Chiamatemi Marco, per favore. Qui ci diamo tutti del tu, va bene?", en: "Call me Marco, please. We all use tu here, all right?",
        options: [
          { de: "Volentieri! Ciao, Marco.", en: "Gladly! Hi, Marco.", delta: 14, tag: "😊 Tu it is",
            react: "Perfetto! Cominciamo.", reactEn: "Perfect! Let's start.", why: "When the teacher asks Ci diamo del tu?, you just use it." },
          { de: "Preferisco dare del Lei, se non Le dispiace.", en: "I'd rather use Lei with you, if you don't mind.", delta: 4, tag: "😐 A bit stiff",
            react: "Come preferisci, nessun problema.", reactEn: "Whatever you prefer, no problem.", why: "That's allowed. But when everyone uses tu, it can seem a bit distant." },
          { de: "Ok, Marco, amico, che si dice?", en: "OK, Marco, mate, what's up?", delta: -6, tag: "😬 Too matey",
            react: "Ehm… Marco va benissimo.", reactEn: "Er… Marco is fine.", why: "Tu doesn't make you best mates. A simple Ciao, Marco is right." },
          { de: "Fantastico, allora posso arrivare in ritardo, no?", en: "Great, so I can be late, then, right?", delta: -8, tag: "😬 Got it wrong",
            react: "No. Il tu non cambia le regole.", reactEn: "No. Tu doesn't change the rules.", why: "Tu makes things more personal; the rules stay the same." },
        ],
      },
      {
        who: "pilar", situation: "In the break you go to the school office to pay for the course. An older lady looks up from her desk.",
        npc: "Buongiorno. Posso aiutarLa?", en: "Good morning. Can I help you?",
        options: [
          { de: "Buongiorno. Vorrei pagare il corso, per favore. Posso farlo qui?", en: "Good morning. I'd like to pay for the course, please. Can I do it here?", delta: 14, tag: "😊 Matched her tone",
            react: "Certo. Si accomodi, prego.", reactEn: "Of course. Please take a seat.", why: "If someone uses Lei with you (aiutarLa), stay polite and formal too until they offer tu." },
          { de: "Ciao. Puoi dirmi dove si paga il corso?", en: "Hi. Can you tell me where I pay for the course?", delta: -3, tag: "😐 Slipped into tu",
            react: "Proprio qui. Mi dica il Suo nome.", reactEn: "Right here. Tell me your name.", why: "Not a disaster, as many people use tu quickly, but she spoke to you with Lei. Start with Può…?" },
          { de: "Ciao, bella! Come va, tutto bene?", en: "Hi, gorgeous! How's it going?", delta: -12, tag: "😱 Way too familiar",
            react: "Signora, se non Le dispiace.", reactEn: "Signora, if you don't mind.", why: "Bella and Come va? are for people you know well, not an older person you've just met." },
        ],
      },
      {
        who: "novak", wheel: 1, du: true, situation: "Back in class. Marco is standing next to you at the coffee machine.",
      },
    ],
    more: "/culture/tu-or-lei",
  },
  {
    id: "elterngespraech", place: "Meeting your daughter's teacher", backdrop: "klasse",
    props: [{ icon: "1F4CB", x: 30, y: 46 }, { icon: "1F3A8", x: 80, y: 18 }, { icon: "1F392", x: 18, y: 56 }],
    people: [{ id: "weiss", mascot: "hamsti", name: "Professoressa Conti", role: "your daughter's class teacher" }],
    turns: [
      {
        who: "weiss", situation: "You have a colloquio, a meeting with the class teacher at your daughter Sofia's school.",
        npc: "Grazie per essere qui. Sofia lavora molto, ma parla parecchio in classe.", en: "Thanks for coming. Sofia works hard, but she talks quite a lot in class.",
        options: [
          { de: "Grazie per avermelo detto. Cosa possiamo fare a casa per aiutarla?", en: "Thanks for telling me. What can we do at home to help?", delta: 16, tag: "😊 Constructive",
            react: "Bella domanda! Magari parlare con lei delle regole della classe.", reactEn: "Good question! Perhaps talk to her about the class rules.", why: "Saying thank you and asking how you can help: that makes a colloquio work." },
          { de: "Va bene.", en: "OK (and nothing more).", delta: 3, tag: "😐 Passive",
            react: "… Ha idea del perché?", reactEn: "… Do you have any idea why?", why: "Not wrong, but the meeting is for both of you. Ask something!" },
          { de: "Non può essere. A casa è molto silenziosa.", en: "That can't be right. She's very quiet at home.", delta: -6, tag: "😬 Defensive",
            react: "In classe è diverso.", reactEn: "In class it's different.", why: "The teacher sees Sofia every day. Listening first helps more." },
          { de: "Non sarà che le sue lezioni sono noiose?", en: "Could it be that your lessons are boring?", delta: -16, tag: "😱 Attack",
            react: "Penso sia meglio parlarne con calma.", reactEn: "I think it's better to talk calmly.", why: "Attacking the teacher doesn't help your child. Stay calm and stick to the facts." },
        ],
      },
      {
        who: "weiss", npc: "Ci risentiamo tra un mese?", en: "Shall we talk again in a month?",
        options: [
          { de: "Sì, volentieri. Le va bene il 25 alle cinque?", en: "Yes, gladly. Does the 25th at five suit you?", delta: 14, tag: "😊 Made a date",
            react: "Sì, perfetto. Lo segno.", reactEn: "Yes, perfect. I'll write it down.", why: "Suggesting a real date shows it matters to you." },
          { de: "Se succede qualcosa, mi chiami.", en: "If anything happens, call me.", delta: 3, tag: "😐 Vague",
            react: "Va bene… Le faccio sapere.", reactEn: "OK… I'll let you know.", why: "Fine, but a fixed date is more reliable." },
          { de: "Mi scriva su WhatsApp e basta.", en: "Just send me a WhatsApp message.", delta: -4, tag: "😐 Too private",
            react: "Meglio tramite il registro elettronico o la scuola.", reactEn: "Better through the online register or the school.", why: "Many teachers contact parents through the school's own channels, such as the registro elettronico, not a private phone." },
        ],
      },
    ],
    more: "/culture/school-system",
  },
  {
    id: "gruppenarbeit", place: "Group work", backdrop: "klasse",
    props: [{ icon: "1F4CC", x: 50, y: 14 }, { icon: "1F3A8", x: 28, y: 48 }, { icon: "1F4F1", x: 74, y: 50 }],
    people: [{ id: "daniel", mascot: "hamsti", name: "Daniele", role: "from your course" }],
    turns: [
      {
        who: "daniel", situation: "Group work in your Italian class: you have to make a poster together. Daniele just looks at his phone.",
        npc: "Fatelo voi, che oggi sono distrutto.", en: "You lot do it, I'm shattered today.",
        options: [
          { de: "Ti capisco, ma non mi sembra giusto fare tutto io. Scrivi tu il titolo?", en: "I understand, but I don't think it's fair for me to do it all. Will you write the title?", delta: 16, tag: "😊 “I” message",
            react: "Mmm… ok, hai ragione. Passami il pennarello.", reactEn: "Hmm… OK, you're right. Pass me the marker.", why: "With non mi sembra giusto you say what bothers you without blaming him. And a small task helps." },
          { de: "Ok, tranquillo, riposati.", en: "OK, no worries, have a rest.", delta: 3, tag: "😐 Too nice",
            react: "Grazie, sei un angelo!", reactEn: "Thanks, you're an angel!", why: "Kind, but now you're doing everything yourself. It's OK to say what you need." },
          { de: "(Sigh and do everything yourself)", en: "(Do all the work and say nothing)", delta: -4, tag: "😐 Swallowed it",
            react: "(Daniele doesn't notice.)", why: "Swallowing your anger helps nobody. Say kindly what bothers you." },
          { de: "Quanto sei pigro! Non fai mai niente!", en: "You're so lazy! You never do anything!", delta: -14, tag: "😱 Blame",
            react: "Ehi, calmati!", reactEn: "Hey, calm down!", why: "Quanto sei pigro and mai sound like an attack. Then nobody wants to join in." },
        ],
      },
      {
        who: "daniel", npc: "Va bene, va bene. Cosa vuoi che faccia?", en: "OK, OK. What do you want me to do?",
        options: [
          { de: "Perfetto! Tu fai il titolo e cerchi due foto. Io scrivo il testo.", en: "Great! You do the title and find two photos. I'll write the text.", delta: 14, tag: "😊 Clear jobs",
            react: "Fatto!", reactEn: "Done!", why: "Clear jobs make group work easier." },
          { de: "Fai quello che vuoi.", en: "Do whatever you want.", delta: -6, tag: "😬 Sulking",
            react: "Ehm… ok?", reactEn: "Er… OK?", why: "He wants to help now. Take the offer!" },
          { de: "Ormai è tardi.", en: "It's too late now.", delta: -8, tag: "😬 Holding a grudge",
            react: "Allora lascia stare.", reactEn: "Forget it, then.", why: "Holding a grudge loses you help. Better to start again." },
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
  { id: "schule", title: "School and Italian class", icon: "1F3EB", scenes: schule },
];

export const areaById = (id) => AREAS.find((a) => a.id === id) ?? null;
