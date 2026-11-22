// The Manners Simulator (/jeux/bonnes-manieres): the scenes of one day in France, in five areas.
//
// A scene = place + backdrop + people + turns. A turn: someone says something (`npc`, French,
// with its English meaning `en`) or a `situation` (English) sets the scene, then the learner
// picks one of 3–4 `options`. There is no single right answer: every option moves the liking of
// the turn's person (`who`) by `delta` (−20 … +20) and the reputation by delta / 2.
//   bands: best +12 … +20 · okay +3 … +8 · awkward −3 … −8 · barbarian −12 … −20
//   at least one option ≥ +10 per turn, never two with the same top delta.
// Each option: `de` (what you say, in French – the key name is kept from the German game;
// stage directions in parentheses are English), `en` (its English meaning, under 💡 Help),
// `tag` (the floating label, English), `react` (the person's answer in French, said by `who`
// unless `by` names someone else; only-parentheses reactions are English stage directions),
// `reactEn` (its English meaning; none for stage directions) and `why` (one short English
// sentence, shown for good answers too).
// `more` links the culture / insider topic that explains the scene.
// A `wheel: n` turn is the small-talk wheel instead (n topics to pick; `du` = tu, otherwise
// vous; see TOPICS below and the person's hidden `talk`).
//
// The French is the content (A2–B1, standard French of France). French text keeps a plain space
// before ? ! : ; and inside « »; game.js turns it into the no-break space of French print when it
// renders the line (and check:knigge insists on the space). The player's gender is unknown, and French agrees
// adjectives and some past participles with it, so the player's lines and what people say to
// the player avoid every gendered form: no enchanté(e), ravi(e), désolé(e), je suis allé(e),
// tu es arrivé(e), soyez le/la bienvenu(e); instead ça me fait plaisir, pardon, je regrette,
// j'ai fait…, tu viens d'arriver, bienvenue (the noun). The small-talk answers are said by
// people of any gender, so they avoid the speaker's gender too, and Alex in the date is written
// without gender (scripts/check-knigge.mjs). Tone: funny, never mean – jokes about behaviour,
// never about groups; no comments on bodies, origin or gender; "many people", not "the French".
// Etiquette is common practice, not law.

/**
 * All lines are French of France. A later fr-CA mode must rewrite these rather than swap words:
 * Québec says dîner for lunch and souper for dinner, tutoie much sooner (colleagues, shops,
 * often a new manager), rarely does la bise with people it has just met, expects a 15–20 %
 * tip in restaurants (service is not included there), and says bienvenue for "you're welcome".
 */
export const VARIETY = "fr-FR";

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
 * vous, `du` = tu; key names kept), `re` the person's answer per kind; `sayEn` and `reEn` are
 * their English meanings. A liked topic, once found, shows a 💡 next time.
 */
export const TOPICS = [
  { id: "wetter", label: "Weather", icon: "2600",
    say: { sie: "Il fait un temps magnifique aujourd'hui, vous ne trouvez pas ?", du: "Il fait super beau aujourd'hui, hein ?" },
    sayEn: { sie: "It's lovely weather today, don't you think?", du: "It's really nice out today, isn't it?" },
    re: { like: "Magnifique ! J'ai même couru avant le travail.", ok: "Oui, ça fait du bien, un peu de soleil.", dislike: "Bof. Il fait le temps qu'il fait." },
    reEn: { like: "Wonderful! I even went for a run before work.", ok: "Yes, a bit of sun does you good.", dislike: "Meh. The weather is the weather." } },
  { id: "wochenende", label: "Weekend", icon: "1F389",
    say: { sie: "Vous avez des projets pour le week-end ?", du: "Tu fais quelque chose ce week-end ?" },
    sayEn: { sie: "Do you have any plans for the weekend?", du: "Doing anything this weekend?" },
    re: { like: "Oui ! Je pars à la mer. J'ai trop hâte !", ok: "Rien de spécial, me reposer.", dislike: "Ah, moi, je travaille." },
    reEn: { like: "Yes! I'm off to the seaside. I can't wait!", ok: "Nothing special, just rest.", dislike: "Oh, I'm working." } },
  { id: "arbeit", label: "Work", icon: "1F4BC",
    say: { sie: "Et vous, qu'est-ce que vous faites dans la vie ?", du: "Beaucoup de boulot en ce moment ?" },
    sayEn: { sie: "And what do you do for a living?", du: "Lots of work at the moment?" },
    re: { like: "J'adore mon travail !", ok: "Ça va, merci.", dislike: "Oh non, pas le travail…" },
    reEn: { like: "I love my job!", ok: "It's fine, thanks.", dislike: "Oh no, not work…" } },
  { id: "hobbys", label: "Hobbies", icon: "1F3B8",
    say: { sie: "Qu'est-ce que vous aimez faire pendant votre temps libre ?", du: "Qu'est-ce que tu aimes faire pendant ton temps libre ?" },
    sayEn: { sie: "What do you like doing in your free time?", du: "What do you like doing in your free time?" },
    re: { like: "Je joue de la guitare, presque tous les soirs !", ok: "J'aime bien lire.", dislike: "Du temps libre ? En ce moment, je n'en ai pas." },
    reEn: { like: "I play the guitar, nearly every evening!", ok: "I like reading.", dislike: "Free time? I don't have any right now." } },
  { id: "essen", label: "Food", icon: "1F35D",
    say: { sie: "Vous connaissez un bon restaurant par ici ?", du: "Tu connais un bon resto par ici ?" },
    sayEn: { sie: "Do you know a good restaurant around here?", du: "Do you know a good place to eat around here?" },
    re: { like: "Oui ! Au coin de la rue, il y a un bistrot avec une tarte aux pommes incroyable.", ok: "Hmm, la brasserie d'en face n'est pas mal.", dislike: "Moi, je préfère manger à la maison." },
    reEn: { like: "Yes! On the corner there's a bistro with an amazing apple tart.", ok: "Hmm, the brasserie across the road isn't bad.", dislike: "I prefer eating at home." } },
  { id: "urlaub", label: "Holidays", icon: "1F3D6",
    say: { sie: "Vous avez pris des vacances cette année ?", du: "Tu as pu partir cet été ?" },
    sayEn: { sie: "Have you had a holiday this year?", du: "Did you manage to get away this summer?" },
    re: { like: "Oui, en Bretagne ! C'était magnifique.", ok: "Pas encore, peut-être cet automne.", dislike: "Des vacances ? J'aimerais bien." },
    reEn: { like: "Yes, in Brittany! It was beautiful.", ok: "Not yet, maybe this autumn.", dislike: "A holiday? I wish." } },
  { id: "gehalt", label: "Salary", icon: "1F4B6",
    say: { sie: "Et vous gagnez combien ?", du: "Et toi, tu gagnes combien ?" },
    sayEn: { sie: "And how much do you earn?", du: "And how much do you earn?" },
    re: { taboo: "Ça… je préfère ne pas le dire." },
    reEn: { taboo: "That's… something I'd rather not say." },
    why: "Many people in France see money, and above all their pay, as a private matter, even with friends." },
  { id: "aussehen", label: "Looks", icon: "1FA9E",
    say: { sie: "Vous avez mauvaise mine.", du: "Tu as une tête affreuse aujourd'hui." },
    sayEn: { sie: "You don't look well.", du: "You look awful today." },
    re: { taboo: "Ah. Merci. Très aimable…" },
    reEn: { taboo: "Oh. Thanks. Very kind…" },
    why: "Comments on how someone looks or on their weight are best left out of small talk, even if you mean well." },
  { id: "politik", label: "Politics", icon: "1F5F3",
    say: { sie: "Qu'est-ce que vous pensez du gouvernement ?", du: "Tu penses quoi du gouvernement ?" },
    sayEn: { sie: "What do you think of the government?", du: "What do you think of the government?" },
    re: { taboo: "Je préfère ne pas parler de ça.", like: "Bonne question ! Moi, je pense que…", ok: "Hmm, c'est compliqué.", dislike: "Oh là là, pas ça." },
    reEn: { taboo: "I'd rather not talk about that.", like: "Good question! I think…", ok: "Hmm, it's complicated.", dislike: "Oh dear, not that." },
    why: "Many people in France enjoy a good argument about politics with friends, but with someone you've just met it's safer to wait." },
  { id: "liebe", label: "Love & exes", icon: "1F48D",
    say: { sie: "Vous avez quelqu'un dans votre vie ?", du: "Et ton ex, quoi de neuf ?" },
    sayEn: { sie: "Is there someone in your life?", du: "So what's new with your ex?" },
    re: { taboo: "Ça, c'est privé.", ok: "Oh là là, c'est une longue histoire.", like: "Ah, justement, je viens de rencontrer quelqu'un !", dislike: "Parlons d'autre chose." },
    reEn: { taboo: "That's private.", ok: "Oh dear, it's a long story.", like: "Oh, as it happens, I've just met someone!", dislike: "Let's talk about something else." },
    why: "Love and exes are private. Friends talk about them; people who have only just met usually don't." },
];

export const topicById = (id) => TOPICS.find((x) => x.id === id) ?? null;
/** "like" | "ok" | "dislike" | "taboo" for a person's hidden taste. */
export const topicKind = (talk, id) =>
  talk?.taboo?.includes(id) ? "taboo" : talk?.likes?.includes(id) ? "like" : talk?.dislikes?.includes(id) ? "dislike" : "ok";
export const TOPIC_DELTA = { like: 14, ok: 5, dislike: -5, taboo: -15 };

const unterwegs = [
  {
    id: "baeckerei", place: "At the boulangerie", backdrop: "baeckerei",
    props: [{ icon: "1F956", x: 14, y: 30 }, { icon: "1F950", x: 30, y: 26 }, { icon: "1F370", x: 78, y: 28 }],
    people: [
      { id: "kunde", mascot: "quaki", name: "Monsieur Bernard", role: "customer in the queue" },
      { id: "verkaeuferin", mascot: "hamsti", name: "Sandrine", role: "shop assistant" },
    ],
    turns: [
      {
        who: "kunde", situation: "Eight in the morning. Four people are standing in a line along the wall. You don't see it and walk straight to the counter.",
        npc: "Excusez-moi, il y a la queue.", en: "Excuse me, there's a queue.",
        options: [
          { de: "Oh, pardon ! Je n'avais pas vu.", en: "Oh, sorry! I hadn't seen it.", delta: 15, tag: "😊 Joined the line",
            react: "Pas de souci.", reactEn: "No problem.", why: "In France people queue in a line and notice at once if someone skips it. A quick Pardon and a step back settles it." },
          { de: "Ah bon ? Vous êtes sûr ?", en: "Really? Are you sure?", delta: 4, tag: "😐 A bit stubborn",
            react: "Oui, la queue est là, le long du mur.", reactEn: "Yes, the queue is there, along the wall.", why: "Asking is OK, but the people waiting know the order. Have a look and go to the end." },
          { de: "C'est que j'ai un train dans dix minutes.", en: "It's just that I've got a train in ten minutes.", delta: -8, tag: "😬 Queue jumper",
            react: "Nous aussi.", reactEn: "So are we.", why: "Being in a hurry doesn't give you the turn. You can ask Je peux passer ? (Can I go ahead?), but people may say no." },
          { de: "Et alors ? Il n'y a pas de numéros ici.", en: "So what? There are no numbers here.", delta: -16, tag: "😱 Elbows out",
            react: "Incroyable…", reactEn: "Unbelievable…", why: "Even without numbers, everyone knows who came after whom." },
        ],
      },
      {
        who: "verkaeuferin", situation: "It's your turn. The shop assistant looks at you.",
        npc: "Bonjour ! Qu'est-ce que je vous sers ?", en: "Good morning! What can I get you?",
        options: [
          { de: "Bonjour ! Une baguette tradition, s'il vous plaît.", en: "Good morning! A traditional baguette, please.", delta: 15, tag: "😊 Bonjour first",
            react: "Et avec ceci ?", reactEn: "Anything else?", why: "Bonjour comes before anything else, in every shop, office and waiting room. Without it, even a perfect order sounds rude." },
          { de: "Bonjour madame ! C'est quoi, le moins cher ?", en: "Good morning! What's the cheapest thing?", delta: 4, tag: "😐 Bargain hunter",
            react: "La baguette, à un euro vingt.", reactEn: "The baguette, at one euro twenty.", why: "Asking about prices is fine, and the greeting is there. A short Bonjour madame is a very French touch." },
          { de: "Une baguette.", en: "A baguette (and nothing else).", delta: -8, tag: "😬 No bonjour",
            react: "Bonjour, d'abord !", reactEn: "Bonjour first!", why: "Starting without Bonjour is one of the biggest mistakes you can make in France. People really do say Bonjour d'abord !" },
          { de: "Hé ! Une baguette, vite !", en: "Hey! A baguette, quickly!", delta: -14, tag: "😱 Rude",
            react: "Un instant, je ne suis pas une machine.", reactEn: "Just a moment, I'm not a machine.", why: "Greet, ask, add s'il vous plaît: that's the whole recipe." },
        ],
      },
      {
        who: "verkaeuferin", npc: "Ça fera un euro quarante, s'il vous plaît.", en: "That'll be one euro forty, please.",
        options: [
          { de: "Voilà. Merci, bonne journée !", en: "Here you are. Thanks, have a good day!", delta: 13, tag: "😊 Nice goodbye",
            react: "Merci, à vous aussi ! Au revoir !", reactEn: "Thanks, you too! Goodbye!", why: "Merci, bonne journée ! and Au revoir on the way out are part of the ritual, like Bonjour on the way in." },
          { de: "Je peux payer par carte ?", en: "Can I pay by card?", delta: 6, tag: "🙂 Asked",
            react: "Oui, sans contact, allez-y.", reactEn: "Yes, contactless, go ahead.", why: "Most bakeries take cards, but some set a minimum amount, so asking first is wise." },
          { de: "(Put the coins down without a word and leave)", en: "(Pay, say nothing and go)", delta: -6, tag: "😬 Silent",
            react: "Au revoir, hein…", reactEn: "Goodbye, then…", why: "Leaving without Merci and Au revoir feels cold. Two words are enough." },
          { de: "Un euro quarante pour une baguette ? C'est du vol !", en: "One forty for a baguette? That's daylight robbery!", delta: -14, tag: "😱 Moaned",
            react: "Ce n'est pas moi qui fixe les prix.", reactEn: "I'm not the one who sets the prices.", why: "Complaining to the shop assistant doesn't help. And a traditional baguette is a craft product." },
        ],
      },
    ],
    more: "/culture/salutations",
  },
  {
    id: "sbahn", place: "On the métro", backdrop: "sbahn",
    props: [{ icon: "1F687", x: 84, y: 24 }, { icon: "1F6CD", x: 60, y: 70 }],
    people: [
      { id: "mann", mascot: "bruno", name: "Man with a bag", role: "passenger" },
      { id: "dame", mascot: "regi", name: "Madame Morel", role: "passenger with a walking stick" },
    ],
    turns: [
      {
        who: "mann", situation: "The métro is full. A man's bag is on the only empty seat. He's looking at his phone.",
        options: [
          { de: "Excusez-moi, la place est libre ?", en: "Excuse me, is this seat free?", delta: 15, tag: "😊 Asked politely",
            react: "Oh, pardon ! Bien sûr, allez-y.", reactEn: "Oh, sorry! Of course, go ahead.", why: "Excusez-moi plus a short question is the normal way. With strangers, vous is always safe." },
          { de: "(Keep standing and say nothing)", en: "(Don't speak, just stand)", delta: 3, tag: "😐 Too shy",
            react: "(He doesn't notice.)", why: "That isn't rude. But you're allowed to ask, and it's normal." },
          { de: "(Sigh loudly) Non mais vraiment…", en: "(Sigh loudly) Honestly…", delta: -6, tag: "😬 Passive-aggressive",
            react: "Quoi ? Ah… tenez, asseyez-vous.", reactEn: "What? Oh… here, sit down.", why: "Loud sighing comes across as unfriendly. A direct, polite question works better." },
          { de: "(Just put the bag on the floor)", en: "(Move his bag yourself)", delta: -14, tag: "😱 Hands off!",
            react: "Hé ! C'est mon sac !", reactEn: "Hey! That's my bag!", why: "You don't touch other people's things. Ask first." },
        ],
      },
      {
        who: "dame", situation: "Two stops later an older woman with a walking stick gets on. There are no free seats.",
        npc: "Oh là là, il y a du monde aujourd'hui.", en: "Oh dear, it's crowded today.",
        options: [
          { de: "Vous voulez vous asseoir ? Je vous en prie, prenez ma place.", en: "Would you like to sit down? Please, take my seat.", delta: 16, tag: "😊 Thoughtful",
            react: "Oh, merci beaucoup. C'est très gentil.", reactEn: "Oh, thank you very much. That's very kind.", why: "Many people give up their seat, and the métro has priority seats (places prioritaires) for those who need them." },
          { de: "Oui, le matin, c'est toujours comme ça.", en: "Yes, it's always like this in the morning.", delta: 4, tag: "😐 Just small talk",
            react: "Eh oui…", reactEn: "Yes, well…", why: "A bit of small talk is OK. But what she really needs is a seat." },
          { de: "(Put your headphones in and look out of the window)", en: "(Listen to music and look away)", delta: -12, tag: "😬 Looked away",
            react: "(She holds on with difficulty.)", why: "Pretending not to see feels rude to many people. A quick offer costs nothing." },
        ],
      },
      {
        who: "dame", npc: "Vous savez si ce métro s'arrête à Hôtel de Ville ?", en: "Do you know if this train stops at Hôtel de Ville?",
        options: [
          { de: "Oui, dans deux stations. Je vous préviens.", en: "Yes, in two stops. I'll let you know.", delta: 14, tag: "😊 Helpful",
            react: "C'est gentil, merci.", reactEn: "That's kind, thank you.", why: "Short, clear help and a promise to tell her. And you keep the vous she used with you." },
          { de: "Aucune idée.", en: "No idea.", delta: -4, tag: "😐 Abrupt",
            react: "Ah. Bon.", reactEn: "Oh. Right.", why: "Not knowing is fine. Friendlier: Je ne sais pas, pardon." },
          { de: "Regardez le plan, là-haut.", en: "Look at the map up there.", delta: -6, tag: "😬 Dismissive",
            react: "Sans mes lunettes, je ne vois rien.", reactEn: "I can't see a thing without my glasses.", why: "The tip is right, but it sounds cold. Better to check it quickly yourself." },
          { de: "Hôtel de Ville ? Et vous allez faire quoi, là-bas ?", en: "Hôtel de Ville? And what are you going to do there?", delta: -12, tag: "😱 Too nosy",
            react: "Ça… ce ne sont pas vos affaires.", reactEn: "That's… none of your business.", why: "You don't ask strangers about their plans. Just answer the question." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/files-d-attente-et-distance",
  },
  {
    id: "aufzug", place: "In the lift", backdrop: "aufzug",
    props: [{ icon: "1F6D7", x: 82, y: 30 }, { icon: "1F514", x: 16, y: 22 }],
    people: [
      { id: "herr", mascot: "bruno", name: "Monsieur Faure", role: "man in the lift",
        talk: { likes: ["wetter", "wochenende"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "botin", mascot: "quaki", name: "Amina", role: "courier with parcels" },
    ],
    turns: [
      {
        who: "herr", situation: "You get into the lift. An older man is already inside.",
        npc: "Bonjour.", en: "Good morning.",
        options: [
          { de: "Bonjour monsieur.", en: "Good morning (sir).", delta: 12, tag: "😊 Said it back",
            react: "(He nods in a friendly way.)", why: "Many people greet each other in lifts and waiting rooms, and Bonjour monsieur / Bonjour madame is the polite classic. Au revoir when you get out." },
          { de: "Salut, mon pote !", en: "Hi, mate!", delta: -4, tag: "😐 Too familiar",
            react: "… Bonjour.", reactEn: "… Good morning.", why: "Salut is for friends. With an older stranger, Bonjour monsieur." },
          { de: "(Say nothing, look at your phone)", en: "(Don't answer, check your phone)", delta: -5, tag: "😐 Silent",
            react: "(He looks at the door.)", why: "Not answering a Bonjour feels unfriendly to many people in France." },
          { de: "Bonjour. J'ai mal dormi, mon voisin ronfle et j'ai un mal de dos terrible…", en: "Good morning. I slept badly, my neighbour snores and my back is killing me…", delta: -8, tag: "😬 Too much information",
            react: "Ah… mince.", reactEn: "Oh… dear.", why: "In a lift a greeting and perhaps a word about the weather will do. Your back is for friends." },
        ],
      },
      {
        who: "herr", wheel: 1, situation: "The lift is slow. Seven more floors… The silence is getting awkward. Say something! He's an older stranger, so you use vous.",
      },
      {
        who: "botin", situation: "The lift stops on the second floor. A woman with two parcels wants to get in.",
        npc: "Je peux monter avec vous ?", en: "Can I come in with you?",
        options: [
          { de: "Bien sûr, allez-y ! (Step aside a little)", en: "Of course, come in! (Make some space)", delta: 14, tag: "😊 Made room",
            react: "Merci, c'est gentil.", reactEn: "Thanks, that's kind.", why: "Making room is all it takes, and a little distance is welcome in a lift." },
          { de: "(Stay very close to her, although there's room)", en: "(Stand right next to her)", delta: -6, tag: "😬 Too close",
            react: "(She moves away.)", why: "If there's room, nobody needs you that close." },
          { de: "Oh non, prenez le suivant.", en: "Oh no, take the next one.", delta: -12, tag: "😬 Turned away",
            react: "Ah. Mais il y a de la place…", reactEn: "Oh. But there's room…", why: "If there's room, you let people in. Anything else feels cold." },
          { de: "(Quickly press “close door”)", en: "(Shut the door on her)", delta: -18, tag: "😱 Door in her face",
            react: "Hé ! …", reactEn: "Hey! …", why: "Closing the door in someone's face is a real manners disaster." },
        ],
      },
      {
        who: "botin", npc: "Ouf, c'est lourd. Vous pouvez appuyer sur le quatre, s'il vous plaît ?", en: "Phew, these are heavy. Could you press four, please?",
        options: [
          { de: "Bien sûr ! Je vous aide avec un carton ?", en: "Of course! Shall I help you with a box?", delta: 15, tag: "😊 Thought ahead",
            react: "Oh oui, merci. C'est adorable.", reactEn: "Oh yes, thanks. That's so sweet.", why: "A little help when someone has their hands full makes almost anyone happy." },
          { de: "(Press four)", en: "(Press the button)", delta: 6, tag: "🙂 Done",
            react: "Merci !", reactEn: "Thanks!", why: "Perfectly fine. A quick Je vous en prie makes it even friendlier." },
          { de: "Je ne suis pas là pour ça, hein.", en: "That's not what I'm here for, you know.", delta: -15, tag: "😱 Snappy",
            react: "Ah. D'accord.", reactEn: "Oh. OK.", why: "Saying no to a tiny favour, and that sharply, is very rude." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/dire-bonjour",
  },
  {
    id: "weg", place: "In the street", backdrop: "strasse",
    props: [{ icon: "1F3DB", x: 82, y: 22 }, { icon: "1F333", x: 12, y: 26 }, { icon: "1F68F", x: 30, y: 30 }],
    people: [
      { id: "touristin", mascot: "hamsti", name: "A young woman", role: "asking the way" },
    ],
    turns: [
      {
        who: "touristin", npc: "Bonjour ! Excusez-moi, pour aller à la mairie, s'il vous plaît ?", en: "Hello! Excuse me, how do I get to the town hall, please?",
        options: [
          { de: "Bonjour ! Allez tout droit, puis prenez la deuxième à gauche. C'est à cinq minutes.", en: "Hello! Go straight on, then take the second left. It's five minutes away.", delta: 15, tag: "😊 Clear directions",
            react: "Super, merci beaucoup !", reactEn: "Great, thank you very much!", why: "Bonjour back, then short and clear: that's how you give directions." },
          { de: "Je ne sais pas, pardon. Demandez au tabac, peut-être ?", en: "I don't know, sorry. Ask at the tobacconist's, maybe?", delta: 8, tag: "🙂 Honest",
            react: "D'accord, merci quand même !", reactEn: "OK, thanks anyway!", why: "Not knowing is fine, and with a tip it's even better. The tabac on the corner often knows the area." },
          { de: "La mairie ? Euh, par là… ou par là… je crois.", en: "The town hall? Er, that way… or that way… I think.", delta: -6, tag: "😬 Confusing",
            react: "Euh… merci ?", reactEn: "Er… thanks?", why: "Better to say you don't know than to send someone the wrong way." },
          { de: "(Walk on without answering)", en: "(Ignore her and keep walking)", delta: -14, tag: "😱 Ignored",
            react: "Euh… bonjour ?", reactEn: "Er… hello?", why: "When someone greets you and asks you something, you answer, even if it's only Pardon, je n'ai pas le temps." },
        ],
      },
      {
        who: "touristin", npc: "Vous pouvez me montrer sur le plan ?", en: "Can you show me on the map?",
        options: [
          { de: "Bien sûr. On est ici, et la mairie est là.", en: "Of course. We're here, and the town hall is there.", delta: 12, tag: "😊 Patient",
            react: "Ah, maintenant je comprends !", reactEn: "Ah, now I get it!", why: "Patience is friendly. On a map it's often easier." },
          { de: "Je vais par là. Venez avec moi !", en: "I'm going that way. Come with me!", delta: 8, tag: "🙂 Very helpful",
            react: "Oh, c'est gentil !", reactEn: "Oh, that's kind!", why: "Very friendly! But nobody has to go that far. Showing her is enough." },
          { de: "(Take her phone and tap on it for ages)", en: "(Take her phone and use it for a long time)", delta: -6, tag: "😬 Took over",
            react: "Euh… vous me rendez mon téléphone ?", reactEn: "Er… can I have my phone back?", why: "You don't just take someone else's phone. Showing her is enough." },
          { de: "Vous n'avez pas de GPS sur votre téléphone ?", en: "Haven't you got maps on your phone?", delta: -12, tag: "😱 Annoyed",
            react: "Si, mais je ne m'y retrouve pas.", reactEn: "Yes, but I can't make sense of it.", why: "She's asking you because she needs help. Making fun of her doesn't help." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/s-il-vous-plait-et-merci",
  },
  {
    id: "mairie", place: "At the mairie", backdrop: "buero",
    props: [{ icon: "1F3DB", x: 82, y: 18 }, { icon: "1F4C4", x: 24, y: 46 }, { icon: "1F58A", x: 36, y: 48 }],
    people: [{ id: "agent", mascot: "regi", name: "Madame Roussel", role: "reception desk at the mairie" }],
    turns: [
      {
        who: "agent", situation: "You've come to the mairie to enrol your child at school. The woman at the reception desk looks up from her screen.",
        options: [
          { de: "Bonjour madame. Je voudrais inscrire mon enfant à l'école. C'est bien ici ?", en: "Good morning. I'd like to enrol my child at school. Is this the right place?", delta: 16, tag: "😊 Bonjour, then the question",
            react: "Bonjour ! Oui, c'est ici. Asseyez-vous.", reactEn: "Good morning! Yes, it's here. Have a seat.", why: "Bonjour madame opens every door. At a public counter it matters even more than in a shop." },
          { de: "Bonjour. L'école, c'est où ?", en: "Hello. School – where is it?", delta: 4, tag: "😐 A bit short",
            react: "Pour les inscriptions, c'est ici.", reactEn: "For enrolment, it's here.", why: "The greeting is there, but a full sentence (Je voudrais…) sounds much friendlier." },
          { de: "Inscription école, s'il vous plaît.", en: "School enrolment, please.", delta: -8, tag: "😬 No bonjour",
            react: "Bonjour, d'abord…", reactEn: "Good morning, first…", why: "Even with s'il vous plaît, skipping Bonjour comes across as rude. People notice." },
          { de: "(Wave your papers) Vite, j'ai besoin d'un papier !", en: "(Wave your papers) Quick, I need a form!", delta: -14, tag: "😱 Stormed in",
            react: "Calmez-vous. Il y a un ordre.", reactEn: "Calm down. There's an order to things.", why: "Rushing the agent never makes things faster. Greet, explain, wait." },
        ],
      },
      {
        who: "agent", npc: "Vous avez un justificatif de domicile récent ?", en: "Do you have a recent proof of address?",
        options: [
          { de: "Oui, voici ma dernière facture d'électricité.", en: "Yes, here's my latest electricity bill.", delta: 14, tag: "😊 Well prepared",
            react: "Parfait, c'est exactement ça.", reactEn: "Perfect, that's exactly it.", why: "A justificatif de domicile is usually a recent energy bill, rent receipt or similar. Each office says what it accepts, so check before you go." },
          { de: "Pardon, c'est quoi, un justificatif de domicile ?", en: "Sorry, what's a proof of address?", delta: 6, tag: "🙂 Asked",
            react: "Une facture récente ou une quittance de loyer, par exemple.", reactEn: "A recent bill or a rent receipt, for example.", why: "Asking is always better than guessing. Write the answer down for next time." },
          { de: "J'ai un vieux contrat de location, ça va ?", en: "I've got an old rental contract, is that OK?", delta: -4, tag: "😐 Out of date",
            react: "Il me faut quelque chose de récent.", reactEn: "I need something recent.", why: "Offices often want a document from the last few months. An old paper may not count." },
          { de: "Pourquoi vous voulez savoir où j'habite ?", en: "Why do you want to know where I live?", delta: -12, tag: "😱 Suspicious",
            react: "Parce que l'école dépend de l'adresse.", reactEn: "Because the school depends on your address.", why: "She isn't prying: the school your child goes to depends on where you live." },
        ],
      },
      {
        who: "agent", npc: "C'est bon, le dossier est complet. Vous recevrez un courrier.", en: "That's it, the file is complete. You'll get a letter.",
        options: [
          { de: "Parfait, merci beaucoup. Bonne journée !", en: "Perfect, thank you very much. Have a good day!", delta: 13, tag: "😊 Nice goodbye",
            react: "Merci, à vous aussi. Au revoir !", reactEn: "Thanks, you too. Goodbye!", why: "Merci, bonne journée ! closes the visit as nicely as Bonjour opened it." },
          { de: "Un courrier ? Vous ne pouvez pas le faire tout de suite ?", en: "A letter? Can't you do it right now?", delta: -5, tag: "😐 Impatient",
            react: "Non, ce n'est pas moi qui décide.", reactEn: "No, I'm not the one who decides.", why: "Many decisions are made by another department. The desk can't speed them up." },
          { de: "(Take your papers and leave without a word)", en: "(Leave without saying goodbye)", delta: -7, tag: "😬 Silent exit",
            react: "(She shakes her head.)", why: "Au revoir on the way out matters as much as Bonjour on the way in." },
        ],
      },
    ],
    more: "/culture/justificatif-de-domicile",
  },
  {
    id: "menu-del-dia", place: "Lunch out", backdrop: "cafe",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "23F0", x: 80, y: 14 }, { icon: "1F9FE", x: 22, y: 44 }],
    people: [{ id: "camarero", mascot: "bruno", name: "Karim", role: "waiter" }],
    turns: [
      {
        who: "camarero", situation: "A quarter to three. You're hungry and walk into a small restaurant. Two people are having a coffee.",
        npc: "Bonjour ! Ah, la cuisine est fermée, le service se termine à quatorze heures.", en: "Hello! Oh, the kitchen is closed, lunch service ends at two.",
        options: [
          { de: "Ah, dommage ! Je peux quand même prendre un café ?", en: "Oh, too bad! Can I still have a coffee?", delta: 14, tag: "😊 Knows the clock",
            react: "Bien sûr, tout de suite.", reactEn: "Of course, right away.", why: "Lunch in France is usually between noon and two, and many kitchens close until the evening. Brasseries with service continu serve all day." },
          { de: "Vous n'auriez pas un sandwich ou quelque chose de froid ?", en: "You wouldn't have a sandwich or something cold?", delta: 8, tag: "🙂 Good idea",
            react: "Il me reste un croque-monsieur, si vous voulez.", reactEn: "I've got a croque-monsieur left, if you like.", why: "Good thinking: some places can still offer something simple." },
          { de: "Mais il n'est même pas trois heures !", en: "But it isn't even three o'clock!", delta: -8, tag: "😬 Wrong clock",
            react: "Justement. Ici, on déjeune à midi.", reactEn: "Exactly. Here we have lunch at noon.", why: "In France, quarter to three is long after lunch. The waiter isn't the one to argue with." },
          { de: "Quel restaurant ! On ne peut jamais manger ici.", en: "What a restaurant! You can never eat here.", delta: -12, tag: "😱 Grumbled",
            react: "Revenez à midi, ou ce soir à partir de dix-neuf heures.", reactEn: "Come back at noon, or this evening from seven.", why: "Fixed meal times aren't bad service. Come back at the right time." },
        ],
      },
      {
        who: "camarero", situation: "The next day you come back at half past twelve. The place is full.",
        npc: "Aujourd'hui, la formule, c'est entrée-plat ou plat-dessert. En entrée, il y a une salade de chèvre, en plat, du poulet ou du poisson.", en: "Today's set menu is starter and main, or main and dessert. For a starter there's goat's cheese salad, for the main chicken or fish.",
        options: [
          { de: "Entrée-plat, s'il vous plaît : la salade de chèvre, puis le poisson. Et une carafe d'eau.", en: "Starter and main, please: the goat's cheese salad, then the fish. And a jug of water.", delta: 14, tag: "😊 Ordered like a local",
            react: "Très bien. C'est noté.", reactEn: "Very good. Got it.", why: "The formule is a fixed price for two or three courses. And a carafe d'eau (tap water) is free in restaurants." },
          { de: "Qu'est-ce que vous me conseillez ?", en: "What do you recommend?", delta: 8, tag: "🙂 Asked",
            react: "Le poisson, il est très bon aujourd'hui.", reactEn: "The fish, it's very good today.", why: "Always a good question, and people like being asked." },
          { de: "Je peux avoir juste le poulet, mais à moitié prix ?", en: "Can I just have the chicken, but at half price?", delta: -5, tag: "😐 Haggling",
            react: "Le plat seul, c'est sur la carte, à quatorze euros.", reactEn: "The main on its own is on the menu, at fourteen euros.", why: "Prices aren't for haggling. But you can always order from the carte instead of the formule." },
          { de: "Encore du poulet ? Il est vraiment nul, ce menu !", en: "Chicken again? This menu is really rubbish!", delta: -14, tag: "😱 Insulted the food",
            react: "C'est le chef qui va être content…", reactEn: "The chef will be delighted…", why: "Food matters a lot in France. Insulting it is the fastest way to lose the waiter." },
        ],
      },
      {
        who: "camarero", situation: "You finished your coffee twenty minutes ago. Nobody has brought the bill, and you start to feel forgotten.",
        options: [
          { de: "(Catch his eye) L'addition, s'il vous plaît !", en: "(Catch his eye) The bill, please!", delta: 15, tag: "😊 Asked for the bill",
            react: "J'arrive !", reactEn: "Coming!", why: "In France the bill usually comes only when you ask. Bringing it early would feel like rushing you out." },
          { de: "(Wait another half hour, getting annoyed)", en: "(Keep waiting and get annoyed)", delta: -3, tag: "😐 Waiting for nothing",
            react: "(He thinks you're enjoying your table.)", why: "He isn't ignoring you. Your table is yours as long as you like." },
          { de: "(Shout across the room) Garçon ! L'addition !", en: "(Shout across the room) Waiter! The bill!", delta: -6, tag: "😬 Garçon!",
            react: "Oui, oui, j'arrive…", reactEn: "Yes, yes, I'm coming…", why: "Garçon ! sounds old-fashioned and bossy today. Catch the waiter's eye, or say Excusez-moi ! or S'il vous plaît !" },
          { de: "(Decide they've forgotten and walk out)", en: "(Leave without paying)", delta: -18, tag: "😱 Did a runner",
            react: "Hé ! Vous n'avez pas payé !", reactEn: "Hey! You haven't paid!", why: "The bill not coming doesn't mean it's free. Ask for it." },
        ],
      },
    ],
    more: "/culture/rythme-du-quotidien",
  },
];

const arbeit = [
  {
    id: "kaffeekueche", place: "At the coffee machine", backdrop: "kueche",
    props: [{ icon: "2615", x: 20, y: 34 }, { icon: "1F950", x: 72, y: 36 }, { icon: "1F95B", x: 86, y: 30 }],
    people: [{ id: "lena", mascot: "regi", name: "Léa", role: "colleague",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "lena", situation: "Monday morning. Everyone in your team uses tu.",
        npc: "Salut ! Ça va ? Tu as passé un bon week-end ?", en: "Hi! How are you? Did you have a good weekend?",
        options: [
          { de: "Très bien, merci ! J'ai fait une randonnée. Et toi ?", en: "Very good, thanks! I went hiking. And you?", delta: 15, tag: "😊 Asked back",
            react: "Super ! Moi, j'ai vu un film génial.", reactEn: "Great! I saw a brilliant film.", why: "A short answer and Et toi ?: perfect small talk." },
          { de: "Bien.", en: "Good (and nothing more).", delta: -3, tag: "😐 Conversation over",
            react: "Ah… d'accord.", reactEn: "Oh… OK.", why: "Polite, but the chat is over at once. One more sentence and Et toi ? help." },
          { de: "Oh là là, ne m'en parle pas. Mon propriétaire, mon dos, mon ex…", en: "Oh dear, don't get me started. My landlord, my back, my ex…", delta: -8, tag: "😬 Too personal",
            react: "Ah… quand même.", reactEn: "Oh… that's a lot.", why: "Small talk isn't therapy. Save your problems for friends." },
          { de: "Pourquoi tu veux savoir ça ?", en: "Why do you want to know that?", delta: -15, tag: "😱 Suspicious",
            react: "Euh… pour rien.", reactEn: "Er… no reason.", why: "The question is only small talk, not a check on you." },
        ],
      },
      {
        who: "lena", npc: "Au fait, c'est mon anniversaire aujourd'hui. J'ai apporté des croissants, servez-vous !", en: "By the way, it's my birthday today. I've brought croissants, help yourselves!",
        options: [
          { de: "Joyeux anniversaire ! C'est trop gentil.", en: "Happy birthday! That's so kind.", delta: 14, tag: "😊 Congratulated",
            react: "Merci ! Ils viennent de la boulangerie d'en bas.", reactEn: "Thanks! They're from the bakery downstairs.", why: "In many French workplaces it's the birthday person who brings croissants or a cake. Joyeux anniversaire ! comes first." },
          { de: "Merci, ils ont l'air bons ! (Take one)", en: "Thanks, they look good! (Take one)", delta: 6, tag: "🙂 Polite",
            react: "Bon appétit !", reactEn: "Enjoy!", why: "Perfectly fine, but on a birthday a Joyeux anniversaire ! wouldn't hurt." },
          { de: "(Take three and wrap one up for later)", en: "(Take a lot of croissants)", delta: -8, tag: "😬 Greedy",
            react: "Euh… c'est pour tout le monde.", reactEn: "Er… they're for everyone.", why: "When someone brings something for everyone, you take one first." },
          { de: "Non. Le sucre, c'est du poison, et tu ne devrais pas en manger non plus.", en: "No. Sugar is poison, and you shouldn't eat it either.", delta: -13, tag: "😱 Lecturing",
            react: "Euh… je voulais juste faire plaisir.", reactEn: "Er… I just wanted to be nice.", why: "Saying no is fine, but without a lecture. Non merci, mais joyeux anniversaire ! is enough." },
        ],
      },
      {
        who: "lena", wheel: 2, du: true, situation: "You're still at the coffee machine. What do you talk to Léa about?",
      },
    ],
    more: "/culture/codes-sociaux/conversation-et-apero",
  },
  {
    id: "erster-tag", place: "First day at work", backdrop: "buero",
    props: [{ icon: "1F4BB", x: 22, y: 34 }, { icon: "1F4C8", x: 78, y: 20 }, { icon: "23F0", x: 50, y: 12 }],
    people: [{ id: "chefin", mascot: "bruno", name: "Nathalie Roche", role: "your manager" }],
    turns: [
      {
        who: "chefin", situation: "Your first day in a new job. You arrive at 8:55; work starts at 9.",
        npc: "Bonjour ! Vous commencez aujourd'hui, c'est ça ? Je suis Nathalie Roche.", en: "Good morning! You start today, is that right? I'm Nathalie Roche.",
        options: [
          { de: "Bonjour ! Oui, c'est mon premier jour. Ça me fait plaisir de vous rencontrer. (Shake hands)", en: "Good morning! Yes, it's my first day. It's a pleasure to meet you. (Shake hands)", delta: 15, tag: "😊 Great first impression",
            react: "Moi de même. Bienvenue dans l'équipe !", reactEn: "Likewise. Welcome to the team!", why: "A handshake and a polite sentence are safe at work. Some teams do la bise; let them lead." },
          { de: "(Nod and look at the floor)", en: "(Nod and look down)", delta: -4, tag: "😐 Unsure",
            react: "Détendez-vous, on ne mord pas, ici.", reactEn: "Relax, we don't bite here.", why: "Being shy is OK. One short sentence and eye contact come across as friendlier." },
          { de: "Salut ! Ça roule ?", en: "Hi! How's it going?", delta: -12, tag: "😬 Too casual",
            react: "Euh… ça roule, oui. Bon, au travail.", reactEn: "Er… it's going, yes. Right, let's get to work.", why: "She used vous. Salut ! Ça roule ? is for friends, not your first minute with your new manager." },
          { de: "Oui. On finit à quelle heure, au fait ?", en: "Yes. What time do we finish, by the way?", delta: -14, tag: "😱 Wrong question",
            react: "À dix-huit heures. Mais commençons d'abord.", reactEn: "At six. But let's start first.", why: "Asking about home time on your first day sounds as if you want to leave already." },
        ],
      },
      {
        who: "chefin", npc: "Ici, tout le monde se tutoie. Tu peux me dire tu, d'accord ?", en: "Everyone uses tu here. You can say tu to me, OK?",
        options: [
          { de: "D'accord, Nathalie. Merci !", en: "OK, Nathalie. Thanks!", delta: 14, tag: "😊 Took the offer",
            react: "Parfait. Viens, je te fais visiter.", reactEn: "Perfect. Come on, I'll show you around.", why: "Many French companies use tu, even with the boss; many others don't. When someone offers it, you take it." },
          { de: "Très bien. Comme tu veux, Nathalie.", en: "Very well. As you wish, Nathalie.", delta: 5, tag: "🙂 Stiff but right",
            react: "Je ne suis pas si sérieuse, tu sais.", reactEn: "I'm not that serious, you know.", why: "It's correct. A simple D'accord would sound less like talking to a general." },
          { de: "Bien, madame Roche, comme vous voudrez.", en: "Very well, Mrs Roche, as you wish.", delta: -5, tag: "😐 Didn't listen",
            react: "Nathalie, vraiment. Et tu.", reactEn: "Nathalie, really. And tu.", why: "Vous is polite, but once someone offers tu, staying on vous creates distance." },
          { de: "Super. Alors, ma grande, j'ai combien de jours de congé ?", en: "Great. So, love, how many days off do I get?", delta: -12, tag: "😱 Went too far",
            react: "Tu, j'ai dit. Pas « ma grande ».", reactEn: "I said tu. Not “love”.", why: "Tu doesn't make you best friends. Pet names are for friends, not your manager on day one." },
        ],
      },
      {
        who: "chefin", npc: "Demain, on a une réunion d'équipe à neuf heures. Ça te va ?", en: "We have a team meeting at nine tomorrow. Does that suit you?",
        options: [
          { de: "Oui, bien sûr. Je serai là à neuf heures.", en: "Yes, of course. I'll be there at nine.", delta: 14, tag: "😊 On time",
            react: "Parfait !", reactEn: "Perfect!", why: "At work and for appointments, on time means on time. The famous quart d'heure de politesse is for dinner at a friend's, not for meetings." },
          { de: "Je peux arriver à neuf heures et demie ? Parce que mon bus…", en: "Can I come at half past nine? It's just that my bus…", delta: 3, tag: "😐 Honest, but…",
            react: "Bon, si ça se répète, on en reparle.", reactEn: "Well, if it keeps happening, we'll talk about it.", why: "Honesty is good, and many workplaces are flexible, but it's not a strong start on day one." },
          { de: "Plus ou moins. Le matin, je ne suis pas du matin.", en: "More or less. In the morning, I'm not a morning person.", delta: -6, tag: "😬 Unreliable",
            react: "D'accord. Mais neuf heures, c'est neuf heures.", reactEn: "OK. But nine means nine.", why: "It's a good joke for later, but with your new manager it just sounds unreliable." },
          { de: "On verra.", en: "We'll see.", delta: -12, tag: "😱 Couldn't care less",
            react: "Pardon ?", reactEn: "Sorry?", why: "On verra about a meeting with your manager sounds as if you don't care." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/ponctualite",
  },
  {
    id: "meeting", place: "In the meeting", backdrop: "buero",
    props: [{ icon: "1F4CA", x: 50, y: 14 }, { icon: "1F4CB", x: 18, y: 38 }, { icon: "2615", x: 84, y: 40 }],
    people: [{ id: "jonas", mascot: "hamsti", name: "Thomas", role: "colleague" }],
    turns: [
      {
        who: "jonas", situation: "Team meeting. Thomas is presenting an idea.",
        npc: "Voilà mon idée : à partir de maintenant, réunion d'équipe à sept heures du matin. Qu'est-ce que vous en pensez ?", en: "Here's my idea: from now on, team meetings at seven in the morning. What do you all think?",
        options: [
          { de: "Je comprends l'idée, mais je ne sais pas si sept heures, ça convient à tout le monde. Et pourquoi pas neuf heures ?", en: "I understand the idea, but I'm not sure seven suits everyone. Why not nine?", delta: 16, tag: "😊 Honest and kind",
            react: "Hmm, tu as raison. Neuf heures, ça marche aussi.", reactEn: "Hmm, you're right. Nine works too.", why: "Say what you think, give a reason and suggest something else: in a French meeting a bit of debate is normal, even expected." },
          { de: "Hmm, intéressant.", en: "Hmm, interesting.", delta: -4, tag: "😐 Too vague",
            react: "Merci ! Alors on fait comme ça.", reactEn: "Thanks! Let's do that, then.", why: "If you're vague, people take it as a yes. Now the meeting is at seven." },
          { de: "(Say nothing and complain about it at the coffee machine later)", en: "(Be quiet now, talk badly about it later)", delta: -12, tag: "😬 Behind his back",
            react: "(Thomas hears about it anyway.)", why: "Talking behind someone's back hurts the team. Disagree in the meeting instead." },
          { de: "C'est l'idée la plus bête que j'aie jamais entendue.", en: "That's the stupidest idea I've ever heard.", delta: -16, tag: "😱 Far too harsh",
            react: "Ah. Merci.", reactEn: "Oh. Thanks.", why: "Debate is fine, insults aren't. Criticise the idea, not the person, and give a reason." },
        ],
      },
      {
        who: "jonas", situation: "After the meeting. His slides were very long and very colourful.",
        npc: "Tu as trouvé comment, ma présentation ?", en: "What did you think of my presentation?",
        options: [
          { de: "Le contenu était très bien. Moi, je ferais peut-être les diapos un peu plus courtes.", en: "The content was very good. I might make the slides a bit shorter.", delta: 14, tag: "😊 Constructive",
            react: "Bon conseil, merci.", reactEn: "Good advice, thanks.", why: "First the good part, then one clear tip: that kind of feedback is easy to accept." },
          { de: "Génial ! Parfaite !", en: "Great! Perfect!", delta: 4, tag: "😐 Too nice",
            react: "Ah oui ? Alors je la garde comme ça.", reactEn: "Really? Then I'll keep it like that.", why: "Kindly meant, but he learns nothing. At work, honest feedback helps more." },
          { de: "Trop longue, trop de couleurs, ennuyeuse.", en: "Too long, too many colours, boring.", delta: -12, tag: "😱 Brutal",
            react: "D'accord… ça fait mal.", reactEn: "OK… that hurts.", why: "Criticism without a kind word or a tip sounds like an attack." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/franchise",
  },
  {
    id: "feierabend", place: "Afterwork drinks", backdrop: "kneipe",
    props: [{ icon: "1F377", x: 30, y: 40 }, { icon: "1F3B6", x: 78, y: 18 }, { icon: "1F964", x: 66, y: 42 }],
    people: [{ id: "becker", mascot: "bruno", name: "Julien", role: "colleague from accounts",
      talk: { likes: ["urlaub", "wochenende"], dislikes: ["wetter"], taboo: ["gehalt", "politik", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "becker", situation: "Friday, half past six. You don't know Julien very well yet.",
        npc: "Allez, la semaine est finie ! On va boire un verre ?", en: "Right, the week's over! Shall we go for a drink?",
        options: [
          { de: "Avec plaisir ! Moi, je prendrai un jus de fruits.", en: "With pleasure! I'll have a fruit juice.", delta: 14, tag: "😊 In, your way",
            react: "Pas de problème !", reactEn: "No problem!", why: "Coming along is what counts. Nobody has to drink alcohol: a soft drink or a bière sans alcool is completely normal." },
          { de: "Pas ce soir, mais la prochaine fois, avec plaisir.", en: "Not tonight, but next time, with pleasure.", delta: 8, tag: "🙂 Kind no",
            react: "D'accord, la prochaine fois !", reactEn: "OK, next time!", why: "A friendly no with la prochaine fois is perfectly fine." },
          { de: "Seulement si c'est toi qui paies.", en: "Only if you're paying.", delta: -3, tag: "😐 Cheeky joke",
            react: "Ha… on verra.", reactEn: "Ha… we'll see.", why: "A joke. But nobody should expect to be paid for." },
          { de: "Non merci, je ne sors pas avec des collègues.", en: "No, thanks, I don't go out with colleagues.", delta: -6, tag: "😬 Cold",
            react: "Ah. Bon.", reactEn: "Oh. Right.", why: "Saying no is fine, but this sounds as if you don't like your colleagues." },
        ],
      },
      {
        who: "becker", situation: "In the bar round the corner.",
        npc: "Alors, ça te plaît, ici ?", en: "So, do you like it here?",
        options: [
          { de: "Beaucoup ! L'équipe est super sympa. Tu travailles ici depuis combien de temps ?", en: "A lot! The team is really nice. How long have you worked here?", delta: 14, tag: "😊 Asked back",
            react: "Douze ans ! Je n'arrive pas à y croire.", reactEn: "Twelve years! I can't believe it.", why: "Say something positive and ask back: good afterwork talk." },
          { de: "Ça va. Au fait, tu penses quoi du gouvernement ?", en: "It's fine. By the way, what do you think of the government?", delta: -6, tag: "😬 Risky topic",
            react: "Oh là là… pas ce soir.", reactEn: "Oh dear… not tonight.", why: "Many people in France love debating politics, but over the first drink with a colleague you barely know, it's risky." },
          { de: "Ça va. Mais la cheffe est un peu nulle, non ?", en: "It's fine. But the boss is a bit useless, isn't she?", delta: -12, tag: "😬 Gossip",
            react: "Hmm. Je n'ai rien entendu.", reactEn: "Hmm. I didn't hear that.", why: "Gossiping about your manager when you're new? Word gets around fast." },
          { de: "Ça va. Alors, tu gagnes combien, toi ?", en: "It's fine. So, how much do you earn?", delta: -14, tag: "😱 Pay question",
            react: "Ça… je le garde pour moi.", reactEn: "That's… something I'll keep to myself.", why: "Pay is one of the most private subjects in France, even between colleagues." },
        ],
      },
      {
        who: "becker", situation: "Julien comes back from the bar with the drinks.",
        npc: "Tiens. Santé !", en: "Here you go. Cheers!",
        options: [
          { de: "Santé ! (Look him in the eye as you clink) Merci, la prochaine, c'est pour moi.", en: "Cheers! (Look him in the eye as you clink) Thanks, the next one's on me.", delta: 14, tag: "😊 Eyes and rounds",
            react: "Ça marche !", reactEn: "Deal!", why: "Many people look each other in the eye when they clink glasses, and offering the next round (c'est ma tournée) is the friendly move." },
          { de: "Santé ! Je te dois combien ?", en: "Cheers! How much do I owe you?", delta: 6, tag: "🙂 Fair",
            react: "Rien du tout. Tu paieras la prochaine.", reactEn: "Nothing at all. You can get the next one.", why: "Fair and polite. Some groups each pay their own, others take turns." },
          { de: "(Clink while looking at your phone)", en: "(Clink glasses without looking up)", delta: -5, tag: "😐 Didn't look",
            react: "Hé, dans les yeux ! Sinon, ça porte malheur.", reactEn: "Hey, in the eyes! Otherwise it's bad luck.", why: "A popular superstition says that not looking each other in the eye when you clink brings bad luck." },
          { de: "(Finish your drink and go home just before your round)", en: "(Leave before you have to pay)", delta: -14, tag: "😱 Skipped your round",
            react: "(Julien notices. Everyone notices.)", why: "Leaving just before it's your turn to pay is remembered for a long time." },
        ],
      },
      {
        who: "becker", wheel: 1, du: true, situation: "Julien sips his drink. Now it's your turn to pick a topic.",
      },
    ],
    more: "/culture/codes-sociaux/conversation-et-apero",
  },
];

const zuhause = [
  {
    id: "neue-nachbarin", place: "On the stairs", backdrop: "treppenhaus",
    props: [{ icon: "1F4EC", x: 16, y: 34 }, { icon: "1F6AA", x: 84, y: 22 }, { icon: "1F6CD", x: 62, y: 66 }],
    people: [{ id: "schulz", mascot: "regi", name: "Madame Lefèvre", role: "older neighbour",
      talk: { likes: ["wetter", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } }],
    turns: [
      {
        who: "schulz", situation: "You've just moved into a block of flats. At seven in the evening you meet an older woman with shopping bags on the stairs.",
        npc: "Bonsoir. Vous habitez ici, maintenant ?", en: "Good evening. Do you live here now?",
        options: [
          { de: "Oui, bonsoir madame. Je viens d'emménager au deuxième. Et vous ?", en: "Yes, good evening. I've just moved in on the second floor. And you?", delta: 15, tag: "😊 Introduced yourself",
            react: "Monique Lefèvre, au troisième. Bienvenue dans l'immeuble !", reactEn: "Monique Lefèvre, third floor. Welcome to the building!", why: "She used vous, so you do too. Between neighbours vous can last for years, and that's perfectly normal." },
          { de: "Oui ! Je peux vous aider avec vos sacs ?", en: "Yes! Can I help you with your bags?", delta: 8, tag: "🙂 Helpful",
            react: "Oh, c'est gentil, mais ça va.", reactEn: "Oh, that's kind, but I'm fine.", why: "Offering help is kind. You can still say who you are." },
          { de: "Oui. C'est bruyant, ici ? Les murs ont l'air fins.", en: "Yes. Is it noisy here? The walls look thin.", delta: -3, tag: "😐 Started with a moan",
            react: "Bof, pas tant que ça.", reactEn: "Meh, not that much.", why: "Starting with criticism of the building doesn't feel very friendly." },
          { de: "Ouais. Et toi, t'es qui ?", en: "Yeah. And who are you?", delta: -8, tag: "😬 Too familiar",
            react: "Pardon ? On ne se connaît pas, il me semble.", reactEn: "Sorry? I don't think we know each other.", why: "Tu with an older stranger who used vous with you sounds rude in France." },
        ],
      },
      {
        who: "schulz", situation: "Three days later you meet her by the letter boxes.",
        npc: "Bonjour ! Alors, vous vous installez bien ?", en: "Hello! So, are you settling in all right?",
        options: [
          { de: "Bonjour, madame Lefèvre ! Oui, merci, je me plais beaucoup ici.", en: "Hello, Mrs Lefèvre! Yes, thanks, I really like it here.", delta: 15, tag: "😊 Remembered her name",
            react: "Oh, vous vous souvenez de mon nom !", reactEn: "Oh, you remember my name!", why: "Greeting people by name shows you listened. Madame + surname is right with a neighbour who uses vous." },
          { de: "Oui, merci ! Pardon, je ne me souviens plus de votre nom…", en: "Yes, thanks! Sorry, I can't remember your name…", delta: 8, tag: "🙂 Honest",
            react: "Lefèvre. Ce n'est pas grave !", reactEn: "Lefèvre. Never mind!", why: "Asking again honestly is much better than using the wrong name." },
          { de: "Bonjour… madame Leblanc ?", en: "Hello… Mrs Leblanc?", delta: -4, tag: "😐 Wrong name",
            react: "Lefèvre. Mais ce n'est rien.", reactEn: "Lefèvre. But it's nothing.", why: "That happens to everyone. Better: ask again honestly." },
          { de: "Bof. Qui met la radio si fort à six heures du matin ?", en: "Meh. Who plays the radio so loud at six in the morning?", delta: -8, tag: "😬 Complaint, not a hello",
            react: "Oh… c'est moi. Pardon.", reactEn: "Oh… that's me. Sorry.", why: "You can mention a problem, but not as the answer to a friendly hello." },
        ],
      },
      {
        who: "schulz", wheel: 1, situation: "Madame Lefèvre stays by the letter boxes. She seems to have time for a chat. Vous, of course.",
      },
    ],
    more: "/culture/tu-ou-vous",
  },
  {
    id: "paket", place: "At your front door", backdrop: "wohnungstuer",
    props: [{ icon: "1F4E6", x: 74, y: 60 }, { icon: "1F6AA", x: 18, y: 18 }, { icon: "1F514", x: 34, y: 30 }],
    people: [{ id: "koch", mascot: "bruno", name: "Mehdi", role: "next-door neighbour" }],
    turns: [
      {
        who: "koch", situation: "The doorbell rings. Your neighbour is at the door.",
        npc: "Bonjour, pardon de vous déranger. Vous pourriez récupérer un colis pour moi aujourd'hui ? Je ne rentre que ce soir.", en: "Hello, sorry to bother you. Could you take in a parcel for me today? I won't be back until tonight.",
        options: [
          { de: "Bien sûr, pas de problème ! Je suis là toute la journée.", en: "Of course, no problem! I'm here all day.", delta: 14, tag: "😊 Good neighbour",
            react: "Super, merci beaucoup !", reactEn: "Great, thanks very much!", why: "Taking in parcels for neighbours is a normal small favour." },
          { de: "Je regrette, je ne suis pas là non plus aujourd'hui. Demandez à madame Lefèvre ?", en: "I'm afraid I'm out today as well. Why not ask Mrs Lefèvre?", delta: 6, tag: "🙂 Honest no",
            react: "Bonne idée, merci.", reactEn: "Good idea, thanks.", why: "Saying no is fine, and with a tip it's really kind." },
          { de: "Et il y a quoi, dedans ?", en: "And what's inside?", delta: -6, tag: "😬 Nosy",
            react: "Euh… des livres. Ça change quelque chose ?", reactEn: "Er… books. Does it matter?", why: "What's in the parcel is none of your business. Yes or no is enough." },
          { de: "Et moi, j'y gagne quoi ?", en: "And what do I get out of it?", delta: -12, tag: "😱 Business deal",
            react: "… Je vais demander à quelqu'un d'autre.", reactEn: "… I'll ask someone else.", why: "Taking in a parcel is a small favour between neighbours, not a business deal." },
        ],
      },
      {
        who: "koch", situation: "In the evening Mehdi rings again, with a little box.",
        npc: "Merci encore ! Tenez, des cornes de gazelle faites maison.", en: "Thanks again! Here you are, some homemade almond pastries.",
        options: [
          { de: "Oh, elles ont l'air délicieuses ! Il ne fallait pas. Je vous rends la boîte bientôt.", en: "Oh, they look delicious! You shouldn't have. I'll give you the box back soon.", delta: 14, tag: "😊 Modest thanks",
            react: "Rien ne presse. Bonne soirée !", reactEn: "No rush. Have a good evening!", why: "Il ne fallait pas (you shouldn't have) is the classic answer to a small present. And a box always goes back to its owner, often with something inside." },
          { de: "Merci ! N'hésitez pas, si vous avez besoin.", en: "Thanks! Just ask if you ever need anything.", delta: 8, tag: "🙂 Friendly",
            react: "Ça fait plaisir d'avoir des voisins comme ça !", reactEn: "It's lovely to have neighbours like this!", why: "Short, friendly, all correct." },
          { de: "(Take the box and close the door)", en: "(Take it without a word and shut the door)", delta: -6, tag: "😬 Silent",
            react: "(He stands at the door for a moment.)", why: "A quick Merci is part of it." },
          { de: "Que des gâteaux ? Moi, je préfère le vin.", en: "Only pastries? I'd rather have wine.", delta: -14, tag: "😱 Ungrateful",
            react: "Ah. D'accord… bonne soirée.", reactEn: "Oh. OK… good evening.", why: "You don't comment on a present. You just say thank you." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/s-il-vous-plait-et-merci",
  },
  {
    id: "party", place: "Your party", backdrop: "party",
    props: [{ icon: "1F389", x: 20, y: 14 }, { icon: "1F3B6", x: 50, y: 10 }, { icon: "1F382", x: 82, y: 40 }],
    people: [{ id: "wolf", mascot: "hamsti", name: "Monsieur Garnier", role: "downstairs neighbour" }],
    turns: [
      {
        who: "wolf", situation: "Saturday, half past midnight. Your birthday party is loud. The doorbell rings.",
        npc: "Bonsoir. Il est minuit et demi, et je travaille tôt demain.", en: "Good evening. It's half past twelve, and I work early tomorrow.",
        options: [
          { de: "Oh, pardon ! On baisse la musique tout de suite.", en: "Oh, sorry! We'll turn the music down right away.", delta: 16, tag: "😊 Understanding",
            react: "Merci, c'est gentil.", reactEn: "Thanks, that's kind.", why: "Saying sorry and turning it down is the best answer. Next time, a note in the hall a few days before a party is a very French courtesy." },
          { de: "Vous voulez entrer boire un verre avec nous ?", en: "Would you like to come in and have a drink with us?", delta: 6, tag: "🙂 Charming, but…",
            react: "C'est gentil, mais je voudrais dormir.", reactEn: "That's kind, but I'd like to sleep.", why: "A nice idea! But the music still has to go down." },
          { de: "C'est samedi ! On a le droit de s'amuser.", en: "It's Saturday! We have a right to have fun.", delta: -12, tag: "😱 Argued",
            react: "Le samedi, on dort aussi.", reactEn: "People sleep on Saturdays too.", why: "Noise at night bothers neighbours on any day. In France, disturbing people's night (tapage nocturne) can even bring the police and a fine." },
          { de: "(Close the door and carry on partying)", en: "(Ignore him and keep the music loud)", delta: -18, tag: "😱 Ignored",
            react: "(An hour later the police ring the bell.)", why: "If you ignore a complaint about noise at night, neighbours can call the police, and the building's managing agent (le syndic) may hear about it too." },
        ],
      },
      {
        who: "wolf", situation: "The next morning on the stairs. Monsieur Garnier looks tired.",
        npc: "Bonjour.", en: "Good morning.",
        options: [
          { de: "Bonjour monsieur ! Pardon encore pour hier soir.", en: "Good morning! Sorry again about last night.", delta: 14, tag: "😊 Made it right",
            react: "Ce n'est rien. Merci d'avoir baissé la musique.", reactEn: "It's nothing. Thanks for turning the music down.", why: "A second short apology shows it really matters to you." },
          { de: "Bonjour.", en: "Good morning (and nothing more).", delta: 3, tag: "😐 Neutral",
            react: "(He nods.)", why: "Not wrong. A word about last night would have helped." },
          { de: "(Pretend you haven't seen him)", en: "(Look away)", delta: -6, tag: "😬 Avoided him",
            react: "(He shakes his head.)", why: "Avoiding him makes it worse. A greeting and one sentence help." },
          { de: "Ce n'était pas si terrible, hier soir, si ?", en: "It wasn't that bad last night, was it?", delta: -8, tag: "😬 Played it down",
            react: "Si. Je n'ai presque pas dormi.", reactEn: "It was. I hardly slept.", why: "The person who was disturbed decides whether it was bad, not you." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/s-il-vous-plait-et-merci",
  },
  {
    id: "einladung", place: "Invited for dinner", backdrop: "esszimmer",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "1F9C0", x: 30, y: 46 }, { icon: "1F337", x: 76, y: 36 }],
    people: [
      { id: "sara", mascot: "quaki", name: "Inès", role: "neighbour and friend" },
      { id: "lucia", mascot: "regi", name: "Camille", role: "Inès's friend" },
    ],
    turns: [
      {
        who: "sara", situation: "Inès from the third floor has invited you for dinner at eight. You ring at a quarter past.",
        npc: "Coucou ! Ça me fait plaisir que tu sois là ! Entre, entre !", en: "Hi! I'm so glad you're here! Come in, come in!",
        options: [
          { de: "Bonsoir ! Merci pour l'invitation. Tiens, j'ai apporté des chocolats.", en: "Good evening! Thanks for the invitation. Here, I've brought some chocolates.", delta: 15, tag: "😊 Brought something",
            react: "Oh, c'est gentil ! Il ne fallait pas.", reactEn: "Oh, how kind! You shouldn't have.", why: "Many people bring something small: chocolates, flowers, a bottle or dessert. And a quarter of an hour late (le quart d'heure de politesse) is fine, even polite, at a friend's home." },
          { de: "Bonsoir ! J'enlève mes chaussures ?", en: "Good evening! Shall I take my shoes off?", delta: 8, tag: "🙂 Thoughtful",
            react: "Non, non, garde-les, comme tu veux.", reactEn: "No, no, keep them on, as you like.", why: "In many French homes guests keep their shoes on, but asking is always fine." },
          { de: "Salut ! On mange quoi ? J'ai une faim de loup !", en: "Hi! What are we eating? I'm starving!", delta: -4, tag: "😐 Straight to the food",
            react: "Ha, ça vient ! Entre d'abord.", reactEn: "Ha, it's coming! Come in first.", why: "First say hello and thanks, then talk about food." },
          { de: "Salut ! Je n'ai rien apporté, de toute façon tu as tout.", en: "Hi! I haven't brought anything; you've got everything anyway.", delta: -12, tag: "😱 Empty-handed",
            react: "Euh… bon. Entre.", reactEn: "Er… well. Come in.", why: "Coming empty-handed isn't terrible. Saying it like that is." },
        ],
      },
      {
        who: "lucia", situation: "In the living room Inès says “Je te présente Camille”. Camille smiles and leans towards you.",
        npc: "Salut ! Ça va ?", en: "Hi! How are you?",
        options: [
          { de: "(La bise: cheek to cheek, one side, then the other) Salut ! Ça va, et toi ?", en: "(La bise: cheek to cheek, one side, then the other) Hi! Fine, and you?", delta: 14, tag: "😊 La bise",
            react: "Ça va, merci !", reactEn: "Fine, thanks!", why: "La bise is common when friends introduce you. It's usually two, but one to four depending on the region: let the other person lead." },
          { de: "(Smile and hold out your hand) Bonsoir ! Ça me fait plaisir.", en: "(Smile and hold out your hand) Good evening! Nice to meet you.", delta: 8, tag: "🙂 A handshake",
            react: "Moi aussi ! (She shakes your hand.)", reactEn: "Me too!", why: "If you'd rather not do la bise, for any reason, a handshake and a smile are always fine." },
          { de: "(Plant a loud, wet kiss on her cheek)", en: "(Give her a real kiss on the cheek)", delta: -5, tag: "😐 Real kiss",
            react: "Oh ! Salut…", reactEn: "Oh! Hi…", why: "With la bise, lips don't really land on the cheek. Cheeks touch and the kiss is mostly a sound." },
          { de: "(Jump back) Hé ! Qu'est-ce que tu fais ?", en: "(Jump back) Hey! What are you doing?", delta: -12, tag: "😱 Alarm",
            react: "Pardon… je voulais juste te dire bonjour.", reactEn: "Sorry… I only wanted to say hello.", why: "You don't have to do la bise, but no alarm is needed: hold out your hand with a smile and people will follow." },
        ],
      },
      {
        who: "sara", npc: "On prend l'apéro ? Il y a des olives et un peu de saucisson.", en: "Shall we have an apéritif? There are olives and a bit of saucisson.",
        options: [
          { de: "Avec plaisir ! (Take a few olives and chat)", en: "With pleasure! (Take a few olives and chat)", delta: 14, tag: "😊 Apéro pro",
            react: "Santé, tout le monde !", reactEn: "Cheers, everyone!", why: "L'apéro, a drink and nibbles before dinner, can easily last an hour. Enjoy it, but leave room for the meal." },
          { de: "Je peux avoir un jus de fruits ? Je ne bois pas d'alcool.", en: "Can I have a fruit juice? I don't drink alcohol.", delta: 8, tag: "🙂 Your way",
            react: "Bien sûr ! Jus d'orange ou de pomme ?", reactEn: "Of course! Orange or apple juice?", why: "Perfectly fine. There's no need to explain why." },
          { de: "(Eat half the saucisson on your own)", en: "(Eat most of the snacks yourself)", delta: -6, tag: "😬 Ate the apéro",
            react: "Tu as gardé de la place pour le dîner, j'espère ?", reactEn: "I hope you've kept some room for dinner?", why: "The apéro is a warm-up, not the meal. A few bites are enough." },
          { de: "On mange quand ? Il est déjà neuf heures !", en: "When do we eat? It's already nine!", delta: -12, tag: "😱 Impatient",
            react: "Euh… bientôt.", reactEn: "Er… soon.", why: "Nobody hurries at a French dinner. The apéro is part of the evening." },
        ],
      },
      {
        who: "sara", situation: "She's made a dish with lots of coriander. You don't like coriander.",
        npc: "Alors ? Comment tu trouves ma nouvelle recette ?", en: "So? What do you think of my new recipe?",
        options: [
          { de: "Hmm, c'est original ! Ça change.", en: "Hmm, it's original! It makes a change.", delta: 12, tag: "😊 Polite white lie",
            react: "N'est-ce pas ? J'adore essayer des trucs.", reactEn: "Isn't it? I love trying things out.", why: "A polite half-truth protects the host's feelings. And original is even true." },
          { de: "Pour être honnête, la coriandre, ce n'est pas trop mon truc. Mais l'idée me plaît beaucoup !", en: "To be honest, coriander isn't really my thing. But I really like the idea!", delta: 8, tag: "🙂 Honest and kind",
            react: "Oh ! La prochaine fois, j'en mettrai moins.", reactEn: "Oh! I'll put less in next time.", why: "You can be honest and kind, with a nice word added." },
          { de: "Beurk. Il y a du pain ?", en: "Yuck. Is there any bread?", delta: -15, tag: "😱 Too honest",
            react: "… Oui. Dans la cuisine.", reactEn: "… Yes. In the kitchen.", why: "Honesty is good, but not like that. Inès made an effort." },
          { de: "(Secretly tip your plate into the plant pot)", en: "(Hide the food in a flowerpot)", delta: -18, tag: "😱 Caught",
            react: "Mais… qu'est-ce que tu fais ?", reactEn: "But… what are you doing?", why: "Getting rid of it in secret? If she finds out, it's much more embarrassing than an honest word." },
        ],
      },
      {
        who: "sara", npc: "Un peu de fromage avant le dessert ?", en: "A bit of cheese before dessert?",
        options: [
          { de: "Oui, volontiers ! (Cut a thin slice along the side of the Brie)", en: "Yes, I'd love some! (Cut a thin slice along the side of the Brie)", delta: 14, tag: "😊 Cheese pro",
            react: "Tu connais les règles, toi !", reactEn: "You know the rules!", why: "Cheese often comes after the main course and before dessert. With a wedge of Brie you cut along the side, so everyone gets some of the creamy heart." },
          { de: "Non merci, vraiment, je n'en peux plus ! C'était délicieux.", en: "No, thank you, really, I can't eat any more! It was delicious.", delta: 8, tag: "🙂 Saved it nicely",
            react: "Ah, tant mieux !", reactEn: "Oh, good!", why: "A no with a compliment for the meal is always fine." },
          { de: "(Cut off the pointed tip of the Brie)", en: "(Take the tip of the cheese wedge)", delta: -5, tag: "😐 Took the tip",
            react: "Ah… tu as coupé le nez !", reactEn: "Oh… you cut off the nose!", why: "Half joke, half rule: the tip (le nez) is the best part, so you don't take it for yourself." },
          { de: "Du fromage après le plat ? C'est bizarre.", en: "Cheese after the main course? That's weird.", delta: -8, tag: "😬 Questioned the order",
            react: "Ici, c'est comme ça.", reactEn: "That's how it's done here.", why: "In France the order is often starter, main, cheese, dessert. Different isn't weird." },
        ],
      },
      {
        who: "sara", situation: "It's half past eleven and dinner is over. Nobody is getting up.",
        npc: "Un petit café ? On a tout notre temps.", en: "A little coffee? We've got all the time in the world.",
        options: [
          { de: "Volontiers ! Dis, elle vient d'où, cette recette ?", en: "I'd love one! Tell me, where's that recipe from?", delta: 14, tag: "😊 Stayed to chat",
            react: "Oh, c'est une longue histoire !", reactEn: "Oh, that's a long story!", why: "A dinner with friends can easily last three hours or more, and the talk over coffee is often the best part." },
          { de: "Un petit peu, mais je me lève tôt demain. Je pars vers minuit.", en: "For a little while, but I've got an early start. I'll go around midnight.", delta: 6, tag: "🙂 Fair",
            react: "D'accord, pas de souci.", reactEn: "OK, no problem.", why: "Saying you have to get up early is a perfectly good reason to leave." },
          { de: "Non merci. J'ai mangé, alors j'y vais.", en: "No, thanks. I've eaten, so I'm off.", delta: -12, tag: "😱 Ate and ran",
            react: "Ah… bon. Salut, alors.", reactEn: "Oh… right. Bye, then.", why: "Leaving as soon as the plates are empty sounds as if you only came for the food." },
        ],
      },
    ],
    more: "/culture/repas-et-gastronomie",
  },
];

const date = [
  {
    id: "date-hallo", place: "Outside the café", backdrop: "cafe",
    props: [{ icon: "2615", x: 80, y: 40 }, { icon: "1F337", x: 16, y: 44 }, { icon: "1F4F1", x: 60, y: 18 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date" }],
    turns: [
      {
        who: "alex", situation: "Your first date. You only know each other from an app. Alex is already waiting outside the café.",
        npc: "Salut ! Enfin, on se voit !", en: "Hi! We finally meet!",
        options: [
          { de: "Salut ! Ça me fait vraiment plaisir de te voir en vrai !", en: "Hi! It's really nice to see you in person!", delta: 15, tag: "😊 Warm",
            react: "Moi aussi !", reactEn: "Me too!", why: "Friendly and honest, without comparing Alex to any photos. People who meet on an app usually use tu straight away." },
          { de: "Salut ! On se fait la bise, ou tu préfères qu'on se serre la main ?", en: "Hi! Shall we do la bise, or would you rather shake hands?", delta: 8, tag: "🙂 Asked",
            react: "Ha, la bise !", reactEn: "Ha, la bise!", why: "Asking is never wrong. Many people even find it charming." },
          { de: "(Give a big hug straight away)", en: "(Hug tightly at once)", delta: -6, tag: "😬 Too fast",
            react: "Oh ! … Salut.", reactEn: "Oh! … Hi.", why: "La bise is common, but a big hug is for people you know. Better to wait or ask." },
          { de: "Salut ! Sur les photos, tu ne ressemblais pas du tout à ça.", en: "Hi! You didn't look like this at all in the photos.", delta: -16, tag: "😱 Photo comparison",
            react: "… Merci ?", reactEn: "… Thanks?", why: "A comment on looks as your first words? Then the evening is over after ten seconds." },
        ],
      },
      {
        who: "alex", situation: "You sit down at a table outside. The waiter comes over: “Bonjour ! Qu'est-ce que je vous sers ?” Alex looks at you.",
        options: [
          { de: "Bonjour ! Pour moi, un café crème, s'il vous plaît. Merci !", en: "Hello! A white coffee for me, please. Thanks!", delta: 14, tag: "😊 Nice to the staff",
            react: "(Alex smiles.) Pareil pour moi, s'il vous plaît.", reactEn: "The same for me, please.", why: "Your date notices at once how you speak to the staff." },
          { de: "Choisis pour moi, je ne sais jamais ce que je veux.", en: "You choose for me, I never know what I want.", delta: 3, tag: "😐 Can't decide",
            react: "Euh, d'accord… deux cafés ?", reactEn: "Er, OK… two coffees?", why: "Not terrible, but making a choice comes across as more confident." },
          { de: "(Keep looking at your phone and just point at the menu)", en: "(Look at your phone, point at the menu)", delta: -8, tag: "😬 Not really there",
            react: "(Alex looks at their phone too.)", why: "Your phone isn't your date. Look at the people you're talking to." },
          { de: "(Click your fingers) Hé, garçon ! Un café !", en: "(Click your fingers) Hey, waiter! A coffee!", delta: -16, tag: "😱 Finger clicking",
            react: "(Alex looks away, embarrassed.)", why: "How you speak to staff says a lot about you. Clicking your fingers and Garçon ! are a double no." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/rencontres-amoureuses",
  },
  {
    id: "date-smalltalk", place: "In the café", backdrop: "cafe",
    props: [{ icon: "2615", x: 40, y: 52 }, { icon: "1F370", x: 60, y: 52 }, { icon: "1F56F", x: 84, y: 30 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "alex", npc: "Alors, raconte : qu'est-ce que tu fais quand tu ne travailles pas ?", en: "So, tell me: what do you do when you're not working?",
        options: [
          { de: "J'adore cuisiner, et je fais beaucoup de randonnée. Et toi ?", en: "I love cooking, and I go hiking a lot. And you?", delta: 15, tag: "😊 Asked back",
            react: "De la randonnée ? Moi aussi ! Tu vas où ?", reactEn: "Hiking? Me too! Where do you go?", why: "Tell them something about you and ask back: that's how a real conversation starts." },
          { de: "Pas grand-chose. Travailler, dormir.", en: "Not much. Work, sleep.", delta: -4, tag: "😐 Conversation over",
            react: "Ah… d'accord.", reactEn: "Oh… OK.", why: "Give your date something to talk about." },
          { de: "Oh, c'est une longue histoire… (20 minutes about your car)", en: "Oh, it's a long story… (Talk only about yourself for a long time)", delta: -12, tag: "😱 Monologue",
            react: "(Alex is counting the floor tiles.)", why: "A conversation goes both ways. After two minutes, ask a question!" },
          { de: "Mon ex disait toujours que je n'ai pas de loisirs.", en: "My ex always said I have no hobbies.", delta: -14, tag: "😱 The ex",
            react: "Ah… d'accord.", reactEn: "Oh… right.", why: "Your ex stays at home on a first date. Always." },
        ],
      },
      {
        who: "alex", npc: "Moi, je travaille à l'hôpital, au fait. Dans un service de pédiatrie.", en: "I work at the hospital, by the way. On a children's ward.",
        options: [
          { de: "Ah oui ? Ça doit être dur. Qu'est-ce qui te plaît le plus ?", en: "Really? That must be hard. What do you like most about it?", delta: 14, tag: "😊 Interested",
            react: "Les enfants ! Chaque jour est différent.", reactEn: "The children! Every day is different.", why: "Real interest in the person is the best compliment." },
          { de: "C'est bien.", en: "That's nice (and nothing more).", delta: 3, tag: "😐 Short",
            react: "Oui… et toi ?", reactEn: "Yes… and you?", why: "Friendly, but a question shows more interest." },
          { de: "À l'hôpital ? Moi, je ne pourrais jamais.", en: "At the hospital? I could never do that.", delta: -12, tag: "😬 Put it down",
            react: "Heureusement qu'il y a d'autres gens, alors.", reactEn: "Good thing there are other people, then.", why: "Putting down your date's job is a quick way to end the evening." },
          { de: "Et ça paie bien ?", en: "And does it pay well?", delta: -14, tag: "😱 Pay question",
            react: "Ça… ce n'est pas un sujet de premier rendez-vous.", reactEn: "That's… not a first-date topic.", why: "Money isn't a first-date topic. Many people in France find it awkward even with friends." },
        ],
      },
      {
        who: "alex", wheel: 2, du: true, situation: "Your cups are empty, but you don't want to leave yet. What do you talk about?",
      },
      {
        who: "alex", situation: "You're laughing a lot. You want to pay Alex a compliment.",
        options: [
          { de: "J'adore ta façon de rire.", en: "I love the way you laugh.", delta: 14, tag: "😊 Charming",
            react: "Oh, merci ! C'est mignon.", reactEn: "Oh, thank you! That's sweet.", why: "A compliment about someone's laugh or humour is personal, but not too much." },
          { de: "Tu as très bon goût en musique.", en: "You've got really good taste in music.", delta: 8, tag: "🙂 Nice",
            react: "Merci ! On pourrait aller à un concert.", reactEn: "Thanks! We could go to a concert.", why: "A compliment about someone's interests is safe and friendly." },
          { de: "Tu me plais beaucoup plus que je ne pensais.", en: "I like you much more than I expected.", delta: -6, tag: "😬 Own goal",
            react: "Et tu pensais quoi ?", reactEn: "And what were you expecting?", why: "A compliment sounds much better without plus que je ne pensais." },
          { de: "C'est l'amour ! On se marie ?", en: "This is love! Shall we get married?", delta: -12, tag: "😱 Way too much",
            react: "Euh… on se connaît depuis une heure.", reactEn: "Er… we met an hour ago.", why: "That much feeling is too fast for a first date, even as a joke." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/rencontres-amoureuses",
  },
  {
    id: "date-rechnung", place: "The bill", backdrop: "cafe",
    props: [{ icon: "1F9FE", x: 50, y: 52 }, { icon: "1F4B3", x: 30, y: 54 }, { icon: "1F4B6", x: 72, y: 50 }],
    people: [
      { id: "alex", mascot: "quaki", name: "Alex", role: "your date" },
      { id: "kellner", mascot: "hamsti", name: "Hugo", role: "waiter" },
    ],
    turns: [
      {
        who: "kellner", npc: "Vous payez ensemble ou séparément ?", en: "Are you paying together or separately?",
        options: [
          { de: "Si tu veux, je t'invite. Ou tu préfères qu'on partage ?", en: "If you like, it's on me. Or would you rather we split it?", delta: 15, tag: "😊 Offered, didn't decide", by: "alex",
            react: "C'est gentil ! Alors la prochaine fois, c'est moi qui invite.", reactEn: "That's kind! Then next time, it's on me.", why: "Je t'invite means “I'm paying”. Offering and asking is fair, and splitting (on partage) is normal too." },
          { de: "Moitié-moitié, s'il vous plaît.", en: "Half each, please.", delta: 6, tag: "🙂 Perfectly normal", by: "alex",
            react: "D'accord, moitié-moitié.", reactEn: "OK, half each.", why: "Splitting is normal. A quick look at your date first would be even nicer." },
          { de: "Séparément. Tu as pris le gâteau à 4,50 € et moi celui à 4,20 €, donc tu me dois trente centimes.", en: "Separately. You had the €4.50 cake and I had the €4.20 one, so you owe me thirty cents.", delta: -12, tag: "😱 Penny counter", by: "alex",
            react: "… Tiens, tes trente centimes.", reactEn: "… Here are your thirty cents.", why: "Splitting is normal. Counting every cent isn't attractive." },
          { de: "(Pretend you're looking for your wallet)", en: "(Act as if you can't find your money)", delta: -16, tag: "😱 The old trick", by: "alex",
            react: "Laisse… je paie.", reactEn: "Leave it… I'll pay.", why: "Everyone knows that trick. Saying honestly what you can afford is much better." },
        ],
      },
      {
        who: "kellner", npc: "Ça fait quatorze euros quarante.", en: "That's fourteen euros forty.",
        options: [
          { de: "Voilà quinze euros. Gardez la monnaie, merci.", en: "Here's fifteen euros. Keep the change, thanks.", delta: 12, tag: "😊 Rounded up",
            react: "Merci beaucoup ! Bonne soirée.", reactEn: "Thank you very much! Have a nice evening.", why: "In France service is included in the price (service compris). Rounding up or leaving a few coins is a small thank you, never a must." },
          { de: "Par carte, s'il vous plaît. Merci.", en: "By card, please. Thanks.", delta: 8, tag: "🙂 Perfectly normal",
            react: "Bien sûr. Allez-y.", reactEn: "Of course. Go ahead.", why: "Service is included, so paying exactly the bill is normal." },
          { de: "(Leave a five-cent coin and look at it proudly)", en: "(Make a show of leaving a tiny tip)", delta: -4, tag: "😐 Tiny show",
            react: "Merci… je suppose.", reactEn: "Thanks… I suppose.", why: "No tip is fine, and so is a small one. Making a show of it is odd." },
          { de: "Un pourboire ? Vous avez déjà un salaire !", en: "A tip? You already get a wage!", delta: -12, tag: "😱 Stingy",
            react: "Bien sûr. Bonne soirée.", reactEn: "Of course. Good evening.", why: "Tipping isn't a must, but nobody asked, and saying it like that is rude, in front of your date too." },
        ],
      },
    ],
    more: "/culture/cafes-et-paiement",
  },
  {
    id: "date-tschuess", place: "Saying goodbye", backdrop: "abend",
    props: [{ icon: "1F319", x: 82, y: 12 }, { icon: "1F6B2", x: 16, y: 50 }, { icon: "1F306", x: 50, y: 8 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date" }],
    turns: [
      {
        who: "alex", npc: "J'ai passé une super soirée, mais je dois y aller.", en: "I've had a great evening, but I have to go.",
        options: [
          { de: "Moi aussi ! Ça te dirait qu'on se revoie un de ces jours ?", en: "Me too! Would you like to meet again some time?", delta: 14, tag: "😊 Asked openly",
            react: "Peut-être… je t'écris !", reactEn: "Maybe… I'll message you!", why: "Asking in a friendly way is brave and fair. Alex decides the answer." },
          { de: "Je t'accompagne à la gare, si tu veux.", en: "I'll walk you to the station, if you like.", delta: 8, tag: "🙂 Thoughtful",
            react: "D'accord, merci !", reactEn: "OK, thanks!", why: "A kind offer, and si tu veux takes the pressure off." },
          { de: "OK, salut.", en: "OK, bye.", delta: -4, tag: "😐 Cool",
            react: "Salut…", reactEn: "Bye…", why: "One sentence about the evening shows you enjoyed it." },
          { de: "Déjà ? Viens chez moi !", en: "Already? Come back to my place!", delta: -14, tag: "😱 Too much pressure",
            react: "Non. J'y vais.", reactEn: "No. I'm going.", why: "After a first date that's too soon. And no means no." },
        ],
      },
      {
        who: "alex", situation: "Two days later a message from Alex arrives.",
        npc: "Écoute, je t'aime bien, mais je crois que ça ne va pas marcher entre nous. Bonne continuation !", en: "Listen, I like you, but I don't think it's going to work between us. All the best!",
        options: [
          { de: "Dommage, mais merci de me l'avoir dit. Bonne continuation à toi aussi !", en: "What a shame, but thanks for telling me. All the best to you too!", delta: 16, tag: "😊 Respectful",
            react: "Merci, c'est gentil.", reactEn: "Thanks, that's kind.", why: "Accepting a no and answering kindly: that's how to treat each other with respect." },
          { de: "(Don't reply at all)", en: "(Send no answer)", delta: -4, tag: "😐 Radio silence",
            react: "(No reaction.)", why: "Not replying is OK. A short, kind message is nicer, though." },
          { de: "Pourquoi ? Qu'est-ce que j'ai fait de mal ? Laisse-moi une autre chance !", en: "Why? What did I do wrong? Give me another chance!", delta: -12, tag: "😬 Put on pressure",
            react: "S'il te plaît, accepte-le.", reactEn: "Please, just accept it.", why: "Pushing puts the other person under pressure. No means no." },
          { de: "(At three in the morning) Tu dors ? 😏", en: "(At three in the morning) Asleep yet?", delta: -18, tag: "😱 Crossed the line",
            react: "(Alex blocks you.)", why: "Messaging after a no, in the middle of the night? Absolutely not." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/rencontres-amoureuses",
  },
];

const schule = [
  {
    id: "zu-spaet", place: "Outside the classroom", backdrop: "klasse",
    props: [{ icon: "23F0", x: 80, y: 14 }, { icon: "1F6AA", x: 16, y: 18 }, { icon: "1F4DA", x: 62, y: 46 }],
    people: [{ id: "albrecht", mascot: "regi", name: "Sophie", role: "French teacher" }],
    turns: [
      {
        who: "albrecht", situation: "Your French class started at 9. It's quarter past, and the door is shut.",
        options: [
          { de: "(Knock and go in) Excusez-moi pour le retard. Le bus avait du retard.", en: "(Knock, enter) Sorry I'm late. The bus was late.", delta: 14, tag: "😊 Quick apology",
            react: "Ce n'est pas grave, asseyez-vous.", reactEn: "No problem, sit down.", why: "Knock, say sorry briefly, sit down: that disturbs the class least." },
          { de: "(Come in quietly and sit down quickly)", en: "(Enter without speaking and sit)", delta: 4, tag: "😐 Low-key",
            react: "(She nods.)", why: "OK, but a quick Pardon would be more polite." },
          { de: "(Wait outside until the break)", en: "(Stay outside the room)", delta: -6, tag: "😬 Missed a lot",
            react: "Tiens, vous attendiez dehors ? Dommage !", reactEn: "Oh, were you waiting outside? What a shame!", why: "Then you miss a lot. Better to knock and come in." },
          { de: "(Come in loudly) Salut tout le monde ! J'ai raté quoi ?", en: "(Enter noisily) Hi, everyone! What have I missed?", delta: -12, tag: "😱 Big entrance",
            react: "Le début. Asseyez-vous en silence, s'il vous plaît.", reactEn: "The beginning. Please sit down quietly.", why: "If you're late, keep it short and quiet." },
        ],
      },
      {
        who: "albrecht", npc: "Nous sommes page 34, exercice 2.", en: "We're on page 34, exercise 2.",
        options: [
          { de: "Merci ! (Open your book)", en: "Thank you! (Find the page)", delta: 12, tag: "😊 Straight in",
            react: "Très bien. On continue !", reactEn: "Very good. Let's carry on!", why: "Joining in quickly shows the class matters to you." },
          { de: "Comment ? Mais on était à la page 30 !", en: "What? But we were on page 30!", delta: -6, tag: "😬 Argued",
            react: "On a déjà fait quatre pages aujourd'hui.", reactEn: "We've already done four pages today.", why: "The others were on time. Ask in the break instead." },
          { de: "Vous pouvez tout réexpliquer depuis le début ?", en: "Can you explain it all again from the beginning?", delta: -8, tag: "😬 Stopped the lesson",
            react: "À la pause, s'il vous plaît.", reactEn: "In the break, please.", why: "The others have moved on. Someone can explain the start in the break." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/ponctualite",
  },
  {
    id: "du-oder-sie", place: "First day of the course", backdrop: "klasse",
    props: [{ icon: "1F4DD", x: 22, y: 44 }, { icon: "270F", x: 36, y: 46 }, { icon: "1F4D6", x: 76, y: 40 }],
    people: [
      { id: "novak", mascot: "bruno", name: "Antoine Mercier", role: "course teacher",
        talk: { likes: ["urlaub", "hobbys"], dislikes: ["wetter"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "pilar", mascot: "hamsti", name: "Madame Dubois", role: "older lady at the school office" },
    ],
    turns: [
      {
        who: "novak", situation: "The first day of your new French course. The teacher comes into the room.",
        npc: "Bonjour à tous ! Je m'appelle Antoine Mercier, je suis votre professeur.", en: "Good morning, everyone! My name is Antoine Mercier, I'm your teacher.",
        options: [
          { de: "Bonjour monsieur !", en: "Good morning (sir)!", delta: 14, tag: "😊 Spot on",
            react: "Bonjour, bonjour !", reactEn: "Good morning, good morning!", why: "Bonjour monsieur / Bonjour madame is the safe, polite greeting for a teacher you've just met." },
          { de: "Bonjour, monsieur Mercier.", en: "Good morning, Mr Mercier.", delta: 6, tag: "🙂 Correct",
            react: "Très bien !", reactEn: "Very good!", why: "Correct. In French, monsieur on its own is even more usual than monsieur + surname." },
          { de: "Bonjour, monsieur Antoine.", en: "Good morning, Mr Antoine.", delta: -3, tag: "😐 Mixed up",
            react: "Ha, monsieur Mercier. Ou Antoine, tout simplement.", reactEn: "Ha, Mr Mercier. Or just Antoine.", why: "Monsieur and madame go with the surname (monsieur Mercier), or stand alone. Monsieur + first name sounds odd." },
          { de: "Salut, Mercier !", en: "Hi, Mercier!", delta: -12, tag: "😱 Surname only",
            react: "Monsieur Mercier, si ça ne vous dérange pas.", reactEn: "Mr Mercier, if you don't mind.", why: "A surname on its own sounds rude, like a sports coach shouting." },
        ],
      },
      {
        who: "novak", npc: "Appelez-moi Antoine. Dans ce cours, on se tutoie, d'accord ?", en: "Call me Antoine. In this course we all use tu, OK?",
        options: [
          { de: "D'accord, super ! Bonjour, Antoine.", en: "OK, great! Hello, Antoine.", delta: 14, tag: "😊 Tu it is",
            react: "Parfait ! On commence.", reactEn: "Perfect! Let's start.", why: "When the teacher offers tu, you just use it." },
          { de: "Je préfère vous vouvoyer, si ça ne vous dérange pas.", en: "I'd rather use vous with you, if you don't mind.", delta: 4, tag: "😐 A bit stiff",
            react: "Comme tu préfères, pas de problème.", reactEn: "Whatever you prefer, no problem.", why: "That's allowed. But when everyone uses tu, it can seem a bit distant." },
          { de: "OK, Antoine, mon pote, ça roule ?", en: "OK, Antoine, mate, how's it going?", delta: -6, tag: "😬 Too matey",
            react: "Euh… Antoine, ça suffit.", reactEn: "Er… Antoine is enough.", why: "Tu doesn't make you best mates. A simple Bonjour, Antoine is right." },
          { de: "Super, alors je peux arriver en retard, non ?", en: "Great, so I can be late, then, right?", delta: -8, tag: "😬 Got it wrong",
            react: "Non. Le tu ne change pas les règles.", reactEn: "No. Tu doesn't change the rules.", why: "Tu makes things more personal; the rules stay the same." },
        ],
      },
      {
        who: "pilar", situation: "In the break you go to the school office to pay for the course. An older lady looks up from her desk.",
        npc: "Bonjour. Je peux vous aider ?", en: "Good morning. Can I help you?",
        options: [
          { de: "Bonjour madame. Je voudrais payer le cours, s'il vous plaît. C'est bien ici ?", en: "Good morning. I'd like to pay for the course, please. Is this the right place?", delta: 14, tag: "😊 Matched her tone",
            react: "Oui, bien sûr. Asseyez-vous, je vous en prie.", reactEn: "Yes, of course. Please, have a seat.", why: "She used vous with you, so you stay polite and formal too, until someone offers tu." },
          { de: "Salut. Tu peux me dire où on paie le cours ?", en: "Hi. Can you tell me where you pay for the course?", delta: -5, tag: "😐 Slipped into tu",
            react: "C'est ici. Votre nom, s'il vous plaît.", reactEn: "It's here. Your name, please.", why: "Not a disaster, but tu with an older stranger who uses vous sounds too familiar in France." },
          { de: "Salut ma belle ! Ça va ou quoi ?", en: "Hi, gorgeous! How's it going?", delta: -12, tag: "😱 Way too familiar",
            react: "Madame, s'il vous plaît.", reactEn: "Madame, please.", why: "Ma belle and Ça va ou quoi ? are for people you know well, not an older person you've just met." },
        ],
      },
      {
        who: "novak", wheel: 1, du: true, situation: "Back in class. Antoine is standing next to you at the coffee machine.",
      },
    ],
    more: "/culture/tu-ou-vous",
  },
  {
    id: "elterngespraech", place: "Meeting your daughter's teacher", backdrop: "klasse",
    props: [{ icon: "1F4CB", x: 30, y: 46 }, { icon: "1F3A8", x: 80, y: 18 }, { icon: "1F392", x: 18, y: 56 }],
    people: [{ id: "weiss", mascot: "hamsti", name: "Madame Petit", role: "your daughter's teacher" }],
    turns: [
      {
        who: "weiss", situation: "You have a meeting with the teacher at your daughter Lina's primary school.",
        npc: "Merci d'avoir pris le temps de venir. Lina travaille bien, mais elle bavarde beaucoup en classe.", en: "Thank you for taking the time to come. Lina works hard, but she chats a lot in class.",
        options: [
          { de: "Merci de me le dire. Qu'est-ce qu'on peut faire à la maison pour l'aider ?", en: "Thanks for telling me. What can we do at home to help?", delta: 16, tag: "😊 Constructive",
            react: "Bonne question ! Peut-être parler avec elle des règles de la classe.", reactEn: "Good question! Perhaps talk to her about the class rules.", why: "Saying thank you and asking how you can help: that makes a parent-teacher meeting work." },
          { de: "D'accord.", en: "OK (and nothing more).", delta: 3, tag: "😐 Passive",
            react: "… Vous avez une idée de pourquoi ?", reactEn: "… Do you have any idea why?", why: "Not wrong, but the meeting is for both of you. Ask something!" },
          { de: "Ce n'est pas possible. À la maison, elle est très calme.", en: "That can't be right. She's very quiet at home.", delta: -6, tag: "😬 Defensive",
            react: "En classe, c'est différent.", reactEn: "In class it's different.", why: "The teacher sees Lina every day. Listening first helps more." },
          { de: "Ce ne serait pas plutôt que vos cours sont ennuyeux ?", en: "Could it be that your lessons are boring?", delta: -16, tag: "😱 Attack",
            react: "Je crois qu'il vaut mieux parler calmement.", reactEn: "I think it's better to talk calmly.", why: "Attacking the teacher doesn't help your child. Stay calm and stick to the facts." },
        ],
      },
      {
        who: "weiss", npc: "On fait le point dans un mois ?", en: "Shall we review things in a month?",
        options: [
          { de: "Oui, très bien. Le 25 à dix-sept heures, ça vous va ?", en: "Yes, very good. Does the 25th at five suit you?", delta: 14, tag: "😊 Made a date",
            react: "Oui, parfait. Je le note.", reactEn: "Yes, perfect. I'll write it down.", why: "Suggesting a real date shows it matters to you. Teachers and parents usually stay on vous." },
          { de: "S'il y a un problème, appelez-moi.", en: "If there's a problem, call me.", delta: 3, tag: "😐 Vague",
            react: "D'accord… je vous tiens au courant.", reactEn: "OK… I'll keep you posted.", why: "Fine, but a fixed date is more reliable." },
          { de: "Envoyez-moi un WhatsApp, c'est plus simple.", en: "Just send me a WhatsApp, it's easier.", delta: -4, tag: "😐 Too private",
            react: "Je préfère passer par le carnet de liaison ou l'ENT.", reactEn: "I'd rather use the home-school notebook or the school's online platform.", why: "Schools in France usually talk to parents through the carnet de liaison or the school's online platform, not a private phone." },
        ],
      },
    ],
    more: "/culture/systeme-scolaire",
  },
  {
    id: "gruppenarbeit", place: "Group work", backdrop: "klasse",
    props: [{ icon: "1F4CC", x: 50, y: 14 }, { icon: "1F3A8", x: 28, y: 48 }, { icon: "1F4F1", x: 74, y: 50 }],
    people: [{ id: "daniel", mascot: "hamsti", name: "Lucas", role: "from your course" }],
    turns: [
      {
        who: "daniel", situation: "Group work in your French class: you have to make a poster together. Lucas just looks at his phone.",
        npc: "Faites-le, vous. Moi, je suis crevé aujourd'hui.", en: "You lot do it. I'm shattered today.",
        options: [
          { de: "Je comprends, mais je ne trouve pas ça juste de tout faire. Tu écris le titre ?", en: "I understand, but I don't think it's fair for me to do it all. Will you write the title?", delta: 16, tag: "😊 “I” message",
            react: "Hmm… d'accord, tu as raison. Passe-moi le feutre.", reactEn: "Hmm… OK, you're right. Pass me the marker.", why: "With je ne trouve pas ça juste you say what bothers you without blaming him. And a small task helps." },
          { de: "D'accord, pas de souci, repose-toi.", en: "OK, no worries, have a rest.", delta: 3, tag: "😐 Too nice",
            react: "Merci, t'es top !", reactEn: "Thanks, you're the best!", why: "Kind, but now you're doing everything yourself. It's OK to say what you need." },
          { de: "(Sigh and do it all yourself)", en: "(Do all the work and say nothing)", delta: -4, tag: "😐 Swallowed it",
            react: "(Lucas doesn't notice.)", why: "Swallowing your anger helps nobody. Say kindly what bothers you." },
          { de: "Qu'est-ce que tu es paresseux ! Tu ne fais jamais rien !", en: "You're so lazy! You never do anything!", delta: -14, tag: "😱 Blame",
            react: "Hé, calme-toi !", reactEn: "Hey, calm down!", why: "Paresseux and jamais sound like an attack. Then nobody wants to join in." },
        ],
      },
      {
        who: "daniel", npc: "Bon, bon. Qu'est-ce que tu veux que je fasse ?", en: "OK, OK. What do you want me to do?",
        options: [
          { de: "Super ! Tu fais le titre et tu cherches deux photos. Moi, j'écris le texte.", en: "Great! You do the title and find two photos. I'll write the text.", delta: 14, tag: "😊 Clear jobs",
            react: "Ça marche !", reactEn: "Deal!", why: "Clear jobs make group work easier." },
          { de: "Fais ce que tu veux.", en: "Do whatever you want.", delta: -6, tag: "😬 Sulking",
            react: "Euh… d'accord ?", reactEn: "Er… OK?", why: "He wants to help now. Take the offer!" },
          { de: "C'est trop tard, maintenant.", en: "It's too late now.", delta: -8, tag: "😬 Holding a grudge",
            react: "Bon, laisse tomber, alors.", reactEn: "Forget it, then.", why: "Holding a grudge loses you help. Better to start again." },
        ],
      },
    ],
    more: "/culture/codes-sociaux/franchise",
  },
];

export const AREAS = [
  { id: "oeffentlich", title: "Out and about", icon: "1F68F", scenes: unterwegs },
  { id: "arbeit", title: "At work", icon: "1F4BC", scenes: arbeit },
  { id: "zuhause", title: "Home and neighbours", icon: "1F3E0", scenes: zuhause },
  { id: "date", title: "The date", icon: "1F377", scenes: date },
  { id: "schule", title: "School and French class", icon: "1F3EB", scenes: schule },
];

export const areaById = (id) => AREAS.find((a) => a.id === id) ?? null;
