// The Manners Simulator (/games/manners): the scenes of one day in the UK, in five areas.
//
// A scene = place + backdrop + people + turns. A turn: someone says something (`npc`, with
// its plain-English help `en`) or a `situation` sets the scene, then the learner picks one of
// 3–4 `options`. There is no single right answer: every option moves the liking of the
// turn's person (`who`) by `delta` (−20 … +20) and the reputation by delta / 2.
//   bands: best +12 … +20 · okay +3 … +8 · awkward −3 … −8 · barbarian −12 … −20
//   at least one option ≥ +10 per turn, never two with the same top delta.
// Each option: `de` (what you say, in English – the key name is kept from the German game;
// stage directions in parentheses), `en` (a plainer paraphrase for the 💡 help), `tag` (the
// floating label), `react` (the person's answer, said by `who` unless `by` names someone
// else) and `why` (one short sentence in easy English, shown for good answers too).
// `more` links the culture / insider topic that explains the scene.
// A `wheel: n` turn is the small-talk wheel instead (n topics to pick; `du` = a casual
// setting, so the topic is asked the casual way; see TOPICS below and the person's hidden `talk`).
//
// The English is the content (A2–B1, British English). Tone: funny, never mean – jokes about
// behaviour, never about groups; no comments on bodies, origin or gender; "many people", not
// "the British". Etiquette is common practice, not law.

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
 * neutral. Like +14, neutral +5, dislike −5, taboo −15. `say` is what the learner says (`sie`
 * = polite, `du` = casual; key names kept), `re` the person's answer per kind. A liked topic,
 * once found, shows a 💡 next time.
 */
export const TOPICS = [
  { id: "wetter", label: "Weather", icon: "2600",
    say: { sie: "Lovely day today, isn't it?", du: "Lovely day, isn't it?" },
    re: { like: "Gorgeous! I went for a run before work.", ok: "Yes, nice to see the sun for once.", dislike: "Hmm. It's weather." } },
  { id: "wochenende", label: "Weekend", icon: "1F389",
    say: { sie: "Have you got any plans for the weekend?", du: "Got any plans for the weekend?" },
    re: { like: "Yes! I'm going to the seaside. Can't wait!", ok: "Nothing special, just relaxing.", dislike: "Oh, I'm working, unfortunately." } },
  { id: "arbeit", label: "Work", icon: "1F4BC",
    say: { sie: "So, what do you do for a living?", du: "Busy at work at the moment?" },
    re: { like: "Oh, I really enjoy my job!", ok: "Fine, thanks.", dislike: "Please, let's not talk about work …" } },
  { id: "hobbys", label: "Hobbies", icon: "1F3B8",
    say: { sie: "What do you like doing in your free time?", du: "What do you get up to in your free time?" },
    re: { like: "I play the guitar – nearly every evening!", ok: "I quite like reading.", dislike: "Hobbies? I haven't got time at the moment." } },
  { id: "essen", label: "Food", icon: "1F35D",
    say: { sie: "Do you know a good place to eat round here?", du: "Know anywhere good to eat round here?" },
    re: { like: "Yes! There's a brilliant curry house round the corner. The best!", ok: "Hmm, the café on the corner is nice.", dislike: "I prefer cooking at home." } },
  { id: "urlaub", label: "Holidays", icon: "1F3D6",
    say: { sie: "Have you been on holiday this year?", du: "Been anywhere nice on holiday this year?" },
    re: { like: "Yes, Portugal! It was beautiful.", ok: "Not yet, maybe in the autumn.", dislike: "A holiday? I wish." } },
  { id: "gehalt", label: "Salary", icon: "1F4B6",
    say: { sie: "So how much do you earn, then?", du: "So how much do you earn, then?" },
    re: { taboo: "That's … not something I talk about." },
    why: "Most people don't talk about their pay with strangers or colleagues – many find it too private." },
  { id: "aussehen", label: "Looks", icon: "1FA9E",
    say: { sie: "You look tired.", du: "You look really tired." },
    re: { taboo: "Oh. Thanks. Very kind …" },
    why: "Comments on how someone looks or on their weight are off-limits in small talk – even if you mean well." },
  { id: "politik", label: "Politics", icon: "1F5F3",
    say: { sie: "What do you think of the government?", du: "What do you reckon about the government?" },
    re: { taboo: "I'd rather not talk about that.", like: "Good question! I think …", ok: "Hmm, tricky subject.", dislike: "Oh, let's not." },
    why: "Politics can quickly turn into an argument. With people you've just met, it's safer to avoid it." },
  { id: "liebe", label: "Love & exes", icon: "1F48D",
    say: { sie: "Are you married?", du: "So, what's your ex up to these days?" },
    re: { taboo: "That's private.", ok: "Oh, it's a long story.", like: "Oh, I've just fallen in love!", dislike: "Let's talk about something else." },
    why: "Love, relationships and exes are private. Friends talk about them – not people who have only just met." },
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
      { id: "kunde", mascot: "quaki", name: "Mr Lane", role: "customer in the queue" },
      { id: "verkaeuferin", mascot: "hamsti", name: "Denise", role: "shop assistant" },
    ],
    turns: [
      {
        who: "kunde", situation: "Eight o'clock in the morning. The queue is long. You walk straight to the counter.",
        npc: "Excuse me, I think I was here first.", en: "Sorry, I think it was my turn before you.",
        options: [
          { de: "Oh, sorry! Please, go ahead.", en: "Oh, sorry! You go first.", delta: 15, tag: "😊 Played fair",
            react: "Thanks, that's very kind!", why: "Whoever came first is served first. A quick “sorry” is all you need." },
          { de: "Are you sure? I didn't see you.", en: "Really? I didn't see you there.", delta: 4, tag: "😐 A bit stubborn",
            react: "Yes, I was standing by the shelf.", why: "Asking is OK. If in doubt, let the other person go first." },
          { de: "But I'm in a hurry.", en: "I don't have much time.", delta: -8, tag: "😬 Queue jumper",
            react: "We all are.", why: "Being in a hurry is no reason to jump the queue. The queue is for everyone." },
          { de: "So what? There aren't any numbers here.", en: "Who cares? Nobody has a ticket.", delta: -16, tag: "😱 Elbows out",
            react: "Unbelievable …", why: "Even without tickets, the rule is clear: first come, first served. Many people take queues very seriously." },
        ],
      },
      {
        who: "verkaeuferin", npc: "Morning! What can I get you?", en: "Hello! What would you like?",
        options: [
          { de: "Morning! Could I have two sausage rolls, please?", en: "Hello! Two sausage rolls, please.", delta: 15, tag: "😊 Friendly and clear",
            react: "Course you can! Anything else?", why: "A greeting, “Could I have …?” and “please”: that's how to order politely." },
          { de: "What's the cheapest thing here?", en: "Which thing costs the least?", delta: 3, tag: "😐 Bargain hunter",
            react: "The plain rolls, 50p each.", why: "Asking about prices is fine. A “Morning!” first would be nicer." },
          { de: "Two sausage rolls.", en: "Two sausage rolls (nothing else).", delta: -4, tag: "😐 A bit short",
            react: "… Please?", why: "Without a greeting and without “please”, an order sounds like a command." },
          { de: "Gimme two sausage rolls.", en: "Give me two sausage rolls.", delta: -12, tag: "😬 Too casual",
            react: "Erm … right. Two sausage rolls.", why: "“Gimme” sounds rude to someone you don't know. Say “Could I have …, please?”" },
        ],
      },
      {
        who: "verkaeuferin", npc: "That's £2.80. Do you need a bag?", en: "It costs £2.80. Do you want a bag?",
        options: [
          { de: "No thanks, I've brought my own.", en: "No, I have a bag with me.", delta: 12, tag: "😊 Well prepared",
            react: "Great, thanks!", why: "Shops in England charge for carrier bags, so many people bring their own. It's completely normal." },
          { de: "Yes, please. And here's three pounds – keep the change!", en: "Yes, please. Here's £3 – you can keep the rest!", delta: 6, tag: "🙂 Small tip",
            react: "Oh, thank you!", why: "Nobody expects a tip in a bakery, but it's a nice gesture." },
          { de: "(Put the money down without a word and leave)", en: "(Pay, say nothing and go)", delta: -6, tag: "😬 Silent",
            react: "Bye, then …", why: "At the end you say a quick “Thanks, have a nice day!” or just “Cheers!”." },
          { de: "£2.80 for two sausage rolls? That's daylight robbery!", en: "That's far too expensive!", delta: -14, tag: "😱 Moaned",
            react: "I don't set the prices, love.", why: "Complaining about prices doesn't help. The shop assistant can't change them." },
        ],
      },
    ],
    more: "/culture/queuing",
  },
  {
    id: "sbahn", place: "On the train", backdrop: "sbahn",
    props: [{ icon: "1F687", x: 84, y: 24 }, { icon: "1F6CD", x: 60, y: 70 }],
    people: [
      { id: "mann", mascot: "bruno", name: "Man with a bag", role: "passenger" },
      { id: "dame", mascot: "regi", name: "Mrs Kaye", role: "passenger with a walking stick" },
    ],
    turns: [
      {
        who: "mann", situation: "The train is full. A man's bag is on the only empty seat. He's looking at his phone.",
        options: [
          { de: "Excuse me, is anyone sitting here?", en: "Sorry, is this seat free?", delta: 15, tag: "😊 Asked politely",
            react: "Oh, sorry, of course!", why: "“Is anyone sitting here?” is the polite way to ask for a seat." },
          { de: "(Keep standing and say nothing)", en: "(Don't speak, just stand)", delta: 3, tag: "😐 Too shy",
            react: "(He doesn't notice.)", why: "That isn't rude. But you're allowed to ask – it's normal." },
          { de: "(Sigh loudly: “Some people …”)", en: "(Make an annoyed noise and complain quietly)", delta: -6, tag: "😬 Passive-aggressive",
            react: "Huh? Oh … go on, then.", why: "Loud sighing comes across as unfriendly. A direct, friendly question works better." },
          { de: "(Just put the bag on the floor)", en: "(Move his bag yourself)", delta: -14, tag: "😱 Hands off!",
            react: "Oi! That's my bag!", why: "You don't touch other people's things. Ask first." },
        ],
      },
      {
        who: "dame", situation: "Two stops later an older woman with a walking stick gets on. There are no free seats.",
        npc: "Phew, it's busy today.", en: "There are a lot of people today.",
        options: [
          { de: "Would you like to sit down? Here you are!", en: "Do you want my seat? Please, take it!", delta: 16, tag: "😊 Thoughtful",
            react: "Oh, that's very kind of you. Thank you!", why: "Many people offer their seat to older people or someone with a walking stick." },
          { de: "Yeah, it's always like this in the morning.", en: "Yes, mornings are always full.", delta: 4, tag: "😐 Just small talk",
            react: "Hmm, yes …", why: "A bit of small talk is OK. But she's really looking for a seat." },
          { de: "(Put your headphones in and look out of the window)", en: "(Listen to music and look away)", delta: -12, tag: "😬 Looked away",
            react: "(She holds on with difficulty.)", why: "Pretending not to see feels rude to many people. A quick offer costs nothing." },
        ],
      },
      {
        who: "dame", npc: "Do you know if this train stops at Central Station?", en: "Does this train go to Central Station?",
        options: [
          { de: "Yes, in two stops. I'll let you know.", en: "Yes, it's the stop after next. I'll tell you.", delta: 14, tag: "😊 Helpful",
            react: "How kind, thank you!", why: "Short, clear help – and a promise to tell her. Perfect." },
          { de: "No idea.", en: "I don't know.", delta: -4, tag: "😐 Abrupt",
            react: "Oh. Right.", why: "Not knowing is fine. Friendlier: “Sorry, I'm not sure.”" },
          { de: "Just look at the map up there.", en: "Read the map yourself.", delta: -6, tag: "😬 Dismissive",
            react: "I can't read it without my glasses.", why: "The tip is right, but it sounds cold. Better to check it quickly yourself." },
          { de: "Central Station? What do you want to go there for?", en: "Why are you going there?", delta: -12, tag: "😱 Too nosy",
            react: "That's … none of your business.", why: "You don't ask strangers about their private plans. Just answer the question." },
        ],
      },
    ],
    more: "/culture/insider/personal-space",
  },
  {
    id: "aufzug", place: "In the lift", backdrop: "aufzug",
    props: [{ icon: "1F6D7", x: 82, y: 30 }, { icon: "1F514", x: 16, y: 22 }],
    people: [
      { id: "herr", mascot: "bruno", name: "Mr Richards", role: "man in the lift",
        talk: { likes: ["wetter", "wochenende"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "botin", mascot: "quaki", name: "Ms Yilmaz", role: "courier with parcels" },
    ],
    turns: [
      {
        who: "herr", situation: "You get into the lift. A man is already inside.",
        npc: "Morning.", en: "Good morning.",
        options: [
          { de: "Morning!", en: "Good morning!", delta: 12, tag: "😊 Said it back",
            react: "(He nods in a friendly way.)", why: "In lifts and on the stairs many people say a quick hello. “Morning!” is enough." },
          { de: "Hello, my friend!", en: "Hi, buddy!", delta: -4, tag: "😐 Too familiar",
            react: "… Hello.", why: "With strangers, “Morning!” or “Hello” is fine – without “my friend”." },
          { de: "(Say nothing, look at your phone)", en: "(Don't answer, check your phone)", delta: -5, tag: "😐 Silent",
            react: "(He looks at the door.)", why: "Many people think it's unfriendly not to answer a greeting." },
          { de: "Morning! I hardly slept, my neighbour snores, and my back …", en: "Hi! I slept badly, and here's why …", delta: -8, tag: "😬 Too much information",
            react: "Erm … right.", why: "In a lift, a greeting is enough. Personal stories are for friends." },
        ],
      },
      {
        who: "herr", wheel: 1, situation: "The lift is slow. Seven more floors … The silence is getting awkward. Say something!",
      },
      {
        who: "botin", situation: "The lift stops on the second floor. A woman with two parcels wants to get in.",
        npc: "Is there room for one more?", en: "Can I come in too?",
        options: [
          { de: "Sure, come in! (Step aside a little)", en: "Yes, come in! (Make some space)", delta: 14, tag: "😊 Made room",
            react: "Thanks, that's kind!", why: "Making room and keeping a little distance: that way everyone feels comfortable." },
          { de: "(Stay very close to her, although there's room)", en: "(Stand right next to her)", delta: -6, tag: "😬 Too close",
            react: "(She moves away.)", why: "Many people like some space, even in a lift. About an arm's length feels comfortable." },
          { de: "Nah, better wait for the next one.", en: "No, take the next lift.", delta: -12, tag: "😬 Turned away",
            react: "Oh. There's plenty of room, though.", why: "If there's room, you let people in. Anything else feels cold." },
          { de: "(Quickly press “close door”)", en: "(Shut the door on her)", delta: -18, tag: "😱 Door in her face",
            react: "Hello?! …", why: "Closing the door in someone's face is a real manners disaster." },
        ],
      },
      {
        who: "botin", npc: "Phew, these are heavy. Could you press four, please?", en: "My parcels are heavy. Please press the button for floor four.",
        options: [
          { de: "Sure! And shall I take one of those?", en: "Of course! Can I carry one for you?", delta: 15, tag: "😊 Thought ahead",
            react: "Oh, that would be great. Thanks!", why: "A little help when someone has their hands full makes almost anyone happy." },
          { de: "(Press four)", en: "(Press the button)", delta: 6, tag: "🙂 Done",
            react: "Thanks!", why: "Perfectly fine. A quick “No problem” makes it even friendlier." },
          { de: "Do I look like a lift attendant?", en: "That's not my job.", delta: -15, tag: "😱 Snappy",
            react: "Wow. OK.", why: "Saying no to a tiny favour and making fun of it is very rude." },
        ],
      },
    ],
    more: "/culture/insider/saying-hello",
  },
  {
    id: "weg", place: "In the street", backdrop: "strasse",
    props: [{ icon: "1F3DB", x: 82, y: 22 }, { icon: "1F333", x: 12, y: 26 }, { icon: "1F68F", x: 30, y: 30 }],
    people: [
      { id: "touristin", mascot: "hamsti", name: "A tourist", role: "asking the way" },
    ],
    turns: [
      {
        who: "touristin", npc: "Excuse me, how do I get to the town hall?", en: "Sorry, where is the town hall?",
        options: [
          { de: "Go straight on here and take the second left. It's about five minutes.", en: "Walk straight, then turn into the second street on the left. Five minutes.", delta: 15, tag: "😊 Clear directions",
            react: "Brilliant, thanks very much!", why: "Short and clear: that's how you give a stranger directions." },
          { de: "Sorry, I'm not sure. Maybe ask at the newsagent's over there?", en: "I don't know. Ask in that shop, maybe?", delta: 8, tag: "🙂 Honest",
            react: "OK, thanks anyway!", why: "“Sorry, I'm not sure” is perfectly fine – with a tip it's even better." },
          { de: "Town hall? Hmm, somewhere over there … or there … I think.", en: "I'm not sure, maybe there … or there.", delta: -6, tag: "😬 Confusing",
            react: "Erm … thanks?", why: "Better to say you don't know than to send someone the wrong way." },
          { de: "(Walk on without answering)", en: "(Ignore her and keep walking)", delta: -14, tag: "😱 Ignored",
            react: "Hello? …", why: "When someone speaks to you, you answer briefly – even just “Sorry, I'm in a rush”." },
        ],
      },
      {
        who: "touristin", npc: "Could you show me on the map?", en: "Can you point to it on my map?",
        options: [
          { de: "Sure. We're here, and the town hall is there.", en: "Of course. This is us, and that's the town hall.", delta: 12, tag: "😊 Patient",
            react: "Ah, now I get it!", why: "Patience is friendly. On the map it's often easier." },
          { de: "I'm going that way anyway. Come with me!", en: "I'm walking there too. Follow me!", delta: 8, tag: "🙂 Very helpful",
            react: "Oh, how kind!", why: "Very friendly! But nobody has to go that far – showing her is enough." },
          { de: "(Take her phone and tap on it for ages)", en: "(Take her phone and use it for a long time)", delta: -6, tag: "😬 Took over",
            react: "Erm … can I have my phone back?", why: "You don't just take someone else's phone. Showing her is enough." },
          { de: "Haven't you got Google Maps?", en: "Why don't you use your phone?", delta: -12, tag: "😱 Annoyed",
            react: "Yes, but I can't make sense of it.", why: "She's asking you because she needs help. Making fun of her doesn't help." },
        ],
      },
    ],
    more: "/culture/insider/sorry-please-thank-you",
  },
];

const arbeit = [
  {
    id: "kaffeekueche", place: "In the office kitchen", backdrop: "kueche",
    props: [{ icon: "2615", x: 20, y: 34 }, { icon: "1F370", x: 72, y: 36 }, { icon: "1F95B", x: 86, y: 30 }],
    people: [{ id: "lena", mascot: "regi", name: "Lena", role: "colleague",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "lena", situation: "Monday morning. Everyone in your team uses first names.",
        npc: "Morning! Good weekend?", en: "Hello! Did you have a nice weekend?",
        options: [
          { de: "Lovely, thanks! I went walking in the hills. How about you?", en: "Nice, thanks! I went hiking. And you?", delta: 15, tag: "😊 Asked back",
            react: "Ooh, nice! I went to the cinema.", why: "A short answer and a question back: perfect small talk." },
          { de: "Fine.", en: "Good (nothing more).", delta: -3, tag: "😐 Conversation over",
            react: "Oh … OK.", why: "Polite, but the chat is over at once. One more sentence and a question back help." },
          { de: "Oh, don't ask. My landlord, my back, my ex …", en: "It was terrible, let me tell you everything …", delta: -8, tag: "😬 Too personal",
            react: "Oh … that sounds like … a lot.", why: "Small talk isn't therapy. Save your problems for friends." },
          { de: "Why do you want to know?", en: "Why are you asking me that?", delta: -15, tag: "😱 Suspicious",
            react: "Erm … no reason.", why: "The question is just small talk, not a check on you." },
        ],
      },
      {
        who: "lena", npc: "I've brought in some cake, by the way. Help yourself!", en: "I brought cake for everyone. Take a piece!",
        options: [
          { de: "Oh, thanks! Did you make it yourself?", en: "Thank you! Did you bake it?", delta: 14, tag: "😊 Showed interest",
            react: "Yes, it's my nan's recipe!", why: "Saying thanks and asking a little question turns cake into a conversation." },
          { de: "Thanks, lovely! (Take a piece)", en: "Thank you! (Take one piece)", delta: 6, tag: "🙂 Polite",
            react: "Enjoy!", why: "Perfectly fine. A compliment afterwards would make her happy." },
          { de: "(Take three pieces and wrap one up for later)", en: "(Take a lot of cake)", delta: -8, tag: "😬 Greedy",
            react: "Oh … the others wanted some too.", why: "When someone brings something for everyone, you take one piece first." },
          { de: "No. Sugar is poison – you shouldn't eat it either.", en: "No, and you shouldn't eat sugar.", delta: -13, tag: "😱 Lecturing",
            react: "Erm … I was only trying to be nice.", why: "Saying no is fine, but without a lecture. “Not for me today, thanks” is enough." },
        ],
      },
      {
        who: "lena", wheel: 2, du: true, situation: "You're still in the kitchen with your tea. What do you talk to Lena about?",
      },
    ],
    more: "/culture/insider/small-talk",
  },
  {
    id: "erster-tag", place: "First day at work", backdrop: "buero",
    props: [{ icon: "1F4BB", x: 22, y: 34 }, { icon: "1F4C8", x: 78, y: 20 }, { icon: "23F0", x: 50, y: 12 }],
    people: [{ id: "chefin", mascot: "bruno", name: "Sarah Hughes", role: "your manager" }],
    turns: [
      {
        who: "chefin", situation: "Your first day in a new job. You arrive at 8:55; work starts at 9.",
        npc: "Good morning! You must be our new starter. I'm Sarah.", en: "Hello! You're the new person, right? My name is Sarah.",
        options: [
          { de: "Good morning! Yes, it's my first day. Nice to meet you, Sarah. (Shake hands)", en: "Hello! Yes, I'm new today. Nice to meet you. (Shake hands)", delta: 15, tag: "😊 Great first impression",
            react: "Nice to meet you too! Welcome to the team.", why: "Eye contact, a handshake and her first name, because she gave it: a great first impression." },
          { de: "(Nod and look at the floor)", en: "(Nod and look down)", delta: -4, tag: "😐 Unsure",
            react: "Don't worry, we don't bite.", why: "Being shy is OK. One short sentence and eye contact come across as friendlier." },
          { de: "Alright, mate! Yeah, I'm new. What's up?", en: "Hey, buddy! Yes, I'm new. How's it going?", delta: -12, tag: "😬 Too casual",
            react: "Erm … what's up? Well, work is.", why: "First names, yes – but “mate” is too casual for your new manager on day one." },
          { de: "Yes. What time do we finish, by the way?", en: "Yes. When can we go home?", delta: -14, tag: "😱 Wrong question",
            react: "Half five. But let's get started first.", why: "Asking about home time on your first day sounds as if you want to leave already." },
        ],
      },
      {
        who: "chefin", npc: "We've got a team meeting at nine tomorrow. Is that OK for you?", en: "There's a meeting tomorrow at 9 o'clock. Can you come?",
        options: [
          { de: "Yes, of course. I'll be there just before nine.", en: "Yes, sure. I'll come a few minutes before 9.", delta: 14, tag: "😊 On time",
            react: "Perfect!", why: "At work, being on time often means arriving a few minutes early." },
          { de: "Could I come at half nine? My bus …", en: "Can I come at 9:30? Because of my bus …", delta: 3, tag: "😐 Honest, but …",
            react: "We can talk about it if it keeps happening.", why: "Honesty is good. But on day one it doesn't make a strong impression." },
          { de: "Roughly. I'm not really a morning person.", en: "More or less. I don't like mornings.", delta: -6, tag: "😬 Unreliable",
            react: "Hmm. Nine means nine.", why: "Most people expect you to be on time for work meetings." },
          { de: "We'll see.", en: "Maybe.", delta: -12, tag: "😱 Couldn't care less",
            react: "Sorry?", why: "“We'll see” about a meeting with your manager sounds as if you don't care." },
        ],
      },
    ],
    more: "/culture/insider/being-on-time",
  },
  {
    id: "meeting", place: "In the meeting", backdrop: "buero",
    props: [{ icon: "1F4CA", x: 50, y: 14 }, { icon: "1F4CB", x: 18, y: 38 }, { icon: "2615", x: 84, y: 40 }],
    people: [{ id: "jonas", mascot: "hamsti", name: "Jonas", role: "colleague" }],
    turns: [
      {
        who: "jonas", situation: "Team meeting. Jonas is presenting an idea.",
        npc: "Here's my idea: from now on we have the team meeting at seven in the morning. What do you think?", en: "I want the meeting to be at 7 a.m. every time. Is that good?",
        options: [
          { de: "I can see why you'd want that. I'm just not sure seven works for everyone, though. How about nine?", en: "I understand the idea, but 7 is too early for some people. What about 9?", delta: 16, tag: "😊 Honest and kind",
            react: "Hmm, fair point. Nine works too.", why: "Disagree softly, give a reason and suggest something else: that's how many people like it at work." },
          { de: "Hmm, interesting idea.", en: "That's interesting (but I don't really like it).", delta: -4, tag: "😐 Too vague",
            react: "Thanks! Let's do that, then.", why: "In Britain “interesting” often means “I don't like it”, but not everyone hears that. Now the meeting is at seven." },
          { de: "(Say nothing and complain about it in the kitchen later)", en: "(Be quiet now, talk badly about it later)", delta: -12, tag: "😬 Behind his back",
            react: "(Jonas hears about it anyway.)", why: "Talking behind someone's back hurts the team. Disagree politely in the meeting instead." },
          { de: "That's the stupidest idea I've ever heard.", en: "That is a very bad idea.", delta: -16, tag: "😱 Far too harsh",
            react: "Wow. Thanks.", why: "Honest is good, hurtful isn't. Criticise the idea, not the person." },
        ],
      },
      {
        who: "jonas", situation: "After the meeting. His slides were very long and very colourful.",
        npc: "So, what did you think of my presentation?", en: "Did you like my presentation?",
        options: [
          { de: "The content was really good. I might make the slides a bit shorter.", en: "Good ideas! Maybe use fewer slides.", delta: 14, tag: "😊 Constructive",
            react: "Good tip, thanks!", why: "First the good part, then one clear tip, said softly: that kind of feedback is easy to accept." },
          { de: "Brilliant! It was perfect!", en: "It was great, everything was perfect!", delta: 4, tag: "😐 Too nice",
            react: "Really? I'll keep it like that, then.", why: "Kindly meant, but he learns nothing. At work, honest feedback helps more." },
          { de: "Too long, too colourful, too boring.", en: "It was long, too bright and boring.", delta: -12, tag: "😱 Brutal",
            react: "OK … that hurts.", why: "Criticism without a kind word or a tip sounds like an attack." },
        ],
      },
    ],
    more: "/culture/insider/understatement",
  },
  {
    id: "feierabend", place: "After work", backdrop: "kneipe",
    props: [{ icon: "1F37A", x: 30, y: 40 }, { icon: "1F3B6", x: 78, y: 18 }, { icon: "1F964", x: 66, y: 42 }],
    people: [{ id: "becker", mascot: "bruno", name: "Graham", role: "colleague from accounts",
      talk: { likes: ["urlaub", "wochenende"], dislikes: ["wetter"], taboo: ["gehalt", "politik", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "becker", situation: "Half past five on Friday. You don't know Graham very well yet.",
        npc: "Right, that's the week done! Fancy a quick drink at the pub?", en: "Work is finished! Do you want to come to the pub for a drink?",
        options: [
          { de: "I'd love to! I'll have a lime and soda, though.", en: "Yes, please! But no alcohol for me.", delta: 14, tag: "😊 In, your way",
            react: "Sure, no problem!", why: "Coming along is friendly. Nobody has to drink alcohol – a soft drink is completely normal." },
          { de: "Not tonight, sorry, but next time definitely!", en: "I can't today, but I'd like to next time!", delta: 8, tag: "🙂 Kind no",
            react: "OK, next time then!", why: "A friendly no with “next time” is perfectly fine." },
          { de: "Only if you're buying!", en: "Yes, if you pay for me!", delta: -3, tag: "😐 Cheeky joke",
            react: "Ha … we'll see.", why: "A joke – but in a group people usually take turns to buy a round." },
          { de: "No thanks, I don't socialise with colleagues.", en: "No, I don't go out with people from work.", delta: -6, tag: "😬 Cold",
            react: "Oh. Fair enough.", why: "Saying no is fine, but this sounds as if you don't like your colleagues." },
        ],
      },
      {
        who: "becker", situation: "In the pub round the corner.",
        npc: "So, how are you finding it so far?", en: "Do you like the job?",
        options: [
          { de: "Really good! The team's lovely. How long have you been here?", en: "Very much! The people are nice. When did you start here?", delta: 14, tag: "😊 Asked back",
            react: "Twelve years! Hard to believe.", why: "Say something positive and ask back: good after-work small talk." },
          { de: "Good. What do you think of the government, by the way?", en: "Good. And what do you think about politics?", delta: -6, tag: "😬 Risky topic",
            react: "Oh, erm … maybe not tonight.", why: "You can talk about politics, but over the first drink with a colleague it's risky." },
          { de: "Not bad. The boss is a bit of an idiot, though, isn't he?", en: "OK. But the boss is stupid, right?", delta: -12, tag: "😬 Gossip",
            react: "Hmm. I'll pretend I didn't hear that.", why: "Gossiping about your manager when you're new? Word gets around fast." },
          { de: "Good. So go on, how much do you earn?", en: "Good. Tell me, what's your salary?", delta: -14, tag: "😱 Pay question",
            react: "That's … something I'd rather keep to myself.", why: "Most people don't ask colleagues about their pay – many find it too private." },
        ],
      },
      {
        who: "becker", situation: "Graham comes back from the bar with the drinks.",
        npc: "There you go. Cheers!", en: "Here's your drink. Cheers!",
        options: [
          { de: "Cheers! Thanks – I'll get the next round.", en: "Cheers! Thank you – I'll buy the next drinks.", delta: 14, tag: "😊 Knows about rounds",
            react: "Good on you!", why: "In a pub group, people take turns to buy a round. Offering the next one is the right move." },
          { de: "Cheers! How much do I owe you?", en: "Thanks! What do I need to pay you?", delta: 6, tag: "🙂 Fair",
            react: "Don't worry, you can get the next one.", why: "Fair and polite. In a group, though, people usually just buy the next round." },
          { de: "(Drink it and say nothing)", en: "(Just drink)", delta: -5, tag: "😐 No thanks",
            react: "(He waits a moment.)", why: "A quick “Cheers!” or “Thanks” is part of it." },
          { de: "(Drink it and go home before your round)", en: "(Leave before you have to buy drinks)", delta: -14, tag: "😱 Skipped your round",
            react: "(Graham notices. Everyone notices.)", why: "Leaving just before it's your turn to buy is a famous pub sin." },
        ],
      },
      {
        who: "becker", wheel: 1, situation: "Graham sips his pint. Now it's your turn to pick a topic.",
      },
    ],
    more: "/culture/insider/paying-the-bill",
  },
];

const zuhause = [
  {
    id: "neue-nachbarin", place: "On the stairs", backdrop: "treppenhaus",
    props: [{ icon: "1F4EC", x: 16, y: 34 }, { icon: "1F6AA", x: 84, y: 22 }, { icon: "1F6CD", x: 62, y: 66 }],
    people: [{ id: "schulz", mascot: "regi", name: "Mrs Walker", role: "neighbour",
      talk: { likes: ["wetter", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } }],
    turns: [
      {
        who: "schulz", situation: "You've just moved into a block of flats. On the stairs you meet a woman with shopping bags.",
        npc: "Hello! Are you new in the building?", en: "Hi! Did you just move here?",
        options: [
          { de: "Yes, hello! I've just moved into the second floor. I'm … and you are?", en: "Yes, hi! I live on the second floor now. What's your name?", delta: 15, tag: "😊 Introduced yourself",
            react: "Jean. Jean Walker. Welcome to the building!", why: "Say who you are and ask for their name: that's how good neighbours start." },
          { de: "Yes! Can I give you a hand with those bags?", en: "Yes! Shall I help you carry the bags?", delta: 8, tag: "🙂 Helpful",
            react: "Oh, how kind – I'm fine, thanks!", why: "Offering help is kind. You can still introduce yourself." },
          { de: "Yes. Is it noisy here? The walls look thin.", en: "Yes. Is this building loud?", delta: -3, tag: "😐 Started with a moan",
            react: "Oh, it's not too bad. We're quiet people.", why: "Starting with criticism of the building doesn't feel very friendly." },
          { de: "Yes. (Walk on)", en: "Yes. (Keep walking)", delta: -6, tag: "😬 Abrupt",
            react: "Oh. Right, then.", why: "One more sentence makes a much better impression on your neighbours." },
        ],
      },
      {
        who: "schulz", situation: "Three days later you meet her by the post boxes.",
        npc: "Oh, hello! Are you settling in all right?", en: "Hi! Do you feel at home here now?",
        options: [
          { de: "Hello, Jean! Yes, thanks – I really like it here.", en: "Hi, Jean! Yes, thank you – I like it a lot.", delta: 15, tag: "😊 Remembered her name",
            react: "Oh, you remembered my name!", why: "Greeting people by name shows you listened. Almost everyone likes that." },
          { de: "Yes, thanks! Sorry, what was your name again? I'm terrible with names.", en: "Yes! Sorry, I forgot your name.", delta: 8, tag: "🙂 Honest",
            react: "Jean. Don't worry!", why: "Asking again honestly is much better than using the wrong name." },
          { de: "Hello, erm … Mrs … Wilson?", en: "Hi, Mrs … (wrong name)?", delta: -4, tag: "😐 Forgot her name",
            react: "Walker. But never mind.", why: "That happens to everyone. Better: ask again honestly." },
          { de: "Sort of. Who plays the radio so loud at six in the morning?", en: "Not really. Someone's radio is too loud early in the morning.", delta: -8, tag: "😬 Complaint, not a hello",
            react: "Oh … that's me. Sorry.", why: "You can mention a problem – but not as the answer to “Are you settling in?”." },
        ],
      },
      {
        who: "schulz", wheel: 1, situation: "Jean stays by the post boxes. She seems to have time for a bit of small talk.",
      },
    ],
    more: "/culture/insider/saying-hello",
  },
  {
    id: "paket", place: "At your front door", backdrop: "wohnungstuer",
    props: [{ icon: "1F4E6", x: 74, y: 60 }, { icon: "1F6AA", x: 18, y: 18 }, { icon: "1F514", x: 34, y: 30 }],
    people: [{ id: "koch", mascot: "bruno", name: "Mr Evans", role: "next-door neighbour" }],
    turns: [
      {
        who: "koch", situation: "The doorbell rings. Your neighbour is at the door.",
        npc: "Sorry to bother you. Could you take in a parcel for me today? I'm out until this evening.", en: "Sorry! Can you get a parcel for me today? I'm not home until the evening.",
        options: [
          { de: "Of course, no problem! I'm in all day.", en: "Sure! I'm at home all day.", delta: 14, tag: "😊 Good neighbour",
            react: "Brilliant, thanks so much!", why: "Taking in parcels for neighbours is completely normal in many streets." },
          { de: "Sorry, I'm out today as well. Maybe ask Jean upstairs?", en: "I'm not home either. Ask Jean?", delta: 6, tag: "🙂 Honest no",
            react: "Good idea, thanks!", why: "Saying no is fine – with a tip it's really kind." },
          { de: "What's in it?", en: "What is inside?", delta: -6, tag: "😬 Nosy",
            react: "Erm … books. Does it matter?", why: "What's in the parcel is none of your business. Yes or no is enough." },
          { de: "And what do I get for it?", en: "What will you give me?", delta: -12, tag: "😱 Business deal",
            react: "… I'll ask someone else.", why: "Taking in a parcel is a small favour between neighbours, not a business deal." },
        ],
      },
      {
        who: "koch", situation: "In the evening Mr Evans rings again.",
        npc: "Thanks again for today! Here, a little bar of chocolate for you.", en: "Thank you for helping! This chocolate is for you.",
        options: [
          { de: "Oh, that's really kind! You didn't have to.", en: "How nice! It was no problem.", delta: 14, tag: "😊 Modest thanks",
            react: "Still. Night!", why: "Being pleased and modest at the same time goes down well." },
          { de: "Thanks! Any time.", en: "Thank you! I'm happy to help again.", delta: 8, tag: "🙂 Friendly",
            react: "Nice to have such good neighbours!", why: "Short, friendly, all correct." },
          { de: "(Take the chocolate and close the door)", en: "(Take it without a word and shut the door)", delta: -6, tag: "😬 Silent",
            react: "(He stands at the door for a moment.)", why: "A quick “Thanks” is part of it." },
          { de: "Just chocolate? I'd rather have wine.", en: "Only chocolate? I prefer wine.", delta: -14, tag: "😱 Ungrateful",
            react: "Oh. Right then … night.", why: "You don't comment on a present. You just say thank you." },
        ],
      },
    ],
  },
  {
    id: "party", place: "Your party", backdrop: "party",
    props: [{ icon: "1F389", x: 20, y: 14 }, { icon: "1F3B6", x: 50, y: 10 }, { icon: "1F382", x: 82, y: 40 }],
    people: [{ id: "wolf", mascot: "hamsti", name: "Mr Wolfe", role: "downstairs neighbour" }],
    turns: [
      {
        who: "wolf", situation: "Saturday, quarter past eleven at night. Your birthday party is loud. The doorbell rings.",
        npc: "Evening. It's gone eleven. I've got to work early tomorrow.", en: "Hello. It's after 11 p.m. I start work early tomorrow.",
        options: [
          { de: "Oh, I'm so sorry! We'll turn the music down right now.", en: "Sorry! We'll make the music quieter now.", delta: 16, tag: "😊 Understanding",
            react: "Thanks, I appreciate it.", why: "Many people expect quiet after about 11 at night. Saying sorry and turning it down is the best answer." },
          { de: "Why don't you come in and join us!", en: "Come to the party!", delta: 6, tag: "🙂 Charming, but …",
            react: "Kind of you, but I want to sleep.", why: "A nice idea! But the music still has to go down." },
          { de: "It's Saturday! People are allowed to have fun.", en: "It's the weekend, so it's OK!", delta: -12, tag: "😱 Argued",
            react: "Noise keeps people awake on Saturdays too.", why: "Late-night noise bothers neighbours on any day, and councils can act against it." },
          { de: "(Close the door and carry on partying)", en: "(Ignore him and keep the music loud)", delta: -18, tag: "😱 Ignored",
            react: "(On Monday there's a letter from the council about noise.)", why: "If you ignore complaints about noise at night, you can quickly get into trouble with your landlord or the council." },
        ],
      },
      {
        who: "wolf", situation: "The next morning on the stairs. Mr Wolfe looks tired.",
        npc: "Morning.", en: "Good morning.",
        options: [
          { de: "Morning! Sorry again about last night.", en: "Good morning! I'm sorry about yesterday.", delta: 14, tag: "😊 Made it right",
            react: "It's fine. Thanks for turning it down.", why: "A second short apology shows it really matters to you." },
          { de: "Morning.", en: "Good morning (nothing more).", delta: 3, tag: "😐 Neutral",
            react: "(He nods.)", why: "Not wrong. A word about last night would have helped." },
          { de: "(Pretend you haven't seen him)", en: "(Look away)", delta: -6, tag: "😬 Avoided him",
            react: "(He shakes his head.)", why: "Avoiding him makes it worse. A greeting and one sentence help." },
          { de: "It wasn't that bad last night, was it?", en: "It wasn't too loud, right?", delta: -8, tag: "😬 Played it down",
            react: "It was. I hardly slept.", why: "The person who was disturbed decides whether it was bad – not you." },
        ],
      },
    ],
    more: "/culture/insider/sorry-please-thank-you",
  },
  {
    id: "einladung", place: "Invited for dinner", backdrop: "esszimmer",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "1F56F", x: 30, y: 46 }, { icon: "1F337", x: 76, y: 36 }],
    people: [{ id: "sara", mascot: "quaki", name: "Sara", role: "neighbour and friend" }],
    turns: [
      {
        who: "sara", situation: "Sara from the third floor has invited you for dinner.",
        npc: "Hiya, so glad you could come! Come in!", en: "Hi, great that you're here! Come inside!",
        options: [
          { de: "Hi! Thanks for having me – here, I've brought you some flowers.", en: "Hi! Thanks for inviting me – these flowers are for you.", delta: 15, tag: "😊 Brought a gift",
            react: "Oh, they're lovely! Thank you!", why: "Many people bring something small: flowers, a bottle of wine or chocolates." },
          { de: "Hi! Shall I take my shoes off?", en: "Hi! Do you want me to take off my shoes?", delta: 8, tag: "🙂 Thoughtful",
            react: "If you like – I don't mind.", why: "Some homes are shoes-off, some aren't. Asking is always good." },
          { de: "Hi! What's for dinner? I'm starving!", en: "Hi! What are we eating? I'm very hungry!", delta: -4, tag: "😐 Straight to the food",
            react: "Ha, soon! Come in first.", why: "First say hello and thank you, then talk about food." },
          { de: "Hi! I didn't bring anything – you've got plenty anyway.", en: "Hi! I brought nothing, you have enough.", delta: -12, tag: "😱 Empty-handed",
            react: "Erm … right. Come in.", why: "Coming empty-handed isn't terrible. Saying it like that is." },
        ],
      },
      {
        who: "sara", situation: "She's made a lentil stew. It's very spicy and you don't like it.",
        npc: "So? What do you think of my new recipe?", en: "Do you like my new dish?",
        options: [
          { de: "Ooh, that's different! Nice and spicy.", en: "It's unusual! Very hot.", delta: 12, tag: "😊 Polite white lie",
            react: "Isn't it? I love trying new things.", why: "A polite white lie protects the host's feelings. And “that's different” is even true." },
          { de: "To be honest, it's a bit too spicy for me. But I love the idea!", en: "Honestly, too hot for me. But a great idea!", delta: 8, tag: "🙂 Honest and kind",
            react: "Oh, shame! Less chilli next time.", why: "You can be honest and kind – with a nice word added." },
          { de: "Yuck. Have you got any bread?", en: "Horrible. Is there bread?", delta: -15, tag: "😱 Too honest",
            react: "… Yes. In the kitchen.", why: "Honesty is good, but not like that. Sara made an effort." },
          { de: "(Secretly tip the stew into the plant pot)", en: "(Hide the food in a flowerpot)", delta: -18, tag: "😱 Caught",
            react: "What … are you doing?!", why: "Getting rid of it in secret? If she finds out, it's much more embarrassing than an honest word." },
        ],
      },
      {
        who: "sara", npc: "Would you like some more?", en: "Do you want a second plate?",
        options: [
          { de: "I couldn't, thanks – I'm stuffed! But it's been a lovely evening.", en: "No, thank you, I'm full! But it was a great evening.", delta: 14, tag: "😊 Saved it nicely",
            react: "Aw, I'm glad!", why: "“I'm full” is a kind excuse – and the praise for the evening is true." },
          { de: "Yes, please!", en: "Yes, more please!", delta: 3, tag: "😐 Brave",
            react: "Great! Here's a big bowl!", why: "Very polite – but now you have to eat another bowl." },
          { de: "No.", en: "No (nothing more).", delta: -6, tag: "😬 Blunt",
            react: "Oh. OK.", why: "“No, thanks” and a kind sentence sound much friendlier." },
        ],
      },
    ],
    more: "/culture/insider/sorry-please-thank-you",
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
        npc: "Hi! Glad we finally made it!", en: "Hello! Good that we could meet!",
        options: [
          { de: "Hi! It's so nice to meet you in person!", en: "Hello! Great to see you in real life!", delta: 15, tag: "😊 Warm",
            react: "You too!", why: "Friendly and honest – without comparing them to their photos." },
          { de: "Hi! Hug or handshake?", en: "Hello! Shall we hug or shake hands?", delta: 8, tag: "🙂 Asked",
            react: "Ha, a hug's fine!", why: "Asking is never wrong. Many people even find it charming." },
          { de: "(Give a big hug straight away)", en: "(Hug them tightly at once)", delta: -6, tag: "😬 Too fast",
            react: "Oh! … Hi.", why: "Some people hug on a first meeting, some don't. Better to wait or ask." },
          { de: "Hi! You look different from your photos.", en: "Hello! You don't look like your pictures.", delta: -16, tag: "😱 Photo comparison",
            react: "… Thanks?", why: "A comment on their looks as your first words? Then the evening is over after ten seconds." },
        ],
      },
      {
        who: "alex", situation: "You sit down in the café. The waiter comes to your table: “What can I get you both?” Alex looks at you.",
        options: [
          { de: "Hi! Could I have a cappuccino, please? Thanks!", en: "Hello! A cappuccino for me, please. Thank you!", delta: 14, tag: "😊 Nice to the staff",
            react: "(Alex smiles.) Same for me, please!", why: "Your date notices at once how you speak to the staff." },
          { de: "You order for me, I never know what I want.", en: "You choose for me, please.", delta: 3, tag: "😐 Can't decide",
            react: "Erm, OK … two cappuccinos?", why: "Not terrible, but making a choice comes across as more confident." },
          { de: "(Keep looking at your phone and just point at the menu)", en: "(Look at your phone, point at the menu)", delta: -8, tag: "😬 Not really there",
            react: "(Alex looks at their phone too.)", why: "Your phone isn't your date. Look at the people you're talking to." },
          { de: "(Click your fingers) Oi, mate! Coffee!", en: "(Snap your fingers) Hey! Coffee!", delta: -16, tag: "😱 Finger clicking",
            react: "(Alex looks away, embarrassed.)", why: "How you speak to staff says a lot about you – clicking your fingers is a big no." },
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
        who: "alex", npc: "So tell me, what do you do when you're not working?", en: "What do you do in your free time?",
        options: [
          { de: "I love cooking, and I go walking a lot. What about you?", en: "I like cooking and I often go hiking. And you?", delta: 15, tag: "😊 Asked back",
            react: "Walking? Me too! Where did you go last?", why: "Tell them something about you and ask back: that's how a real conversation starts." },
          { de: "Not much. Work, sleep.", en: "Nothing really. I work and I sleep.", delta: -4, tag: "😐 Conversation over",
            react: "Oh … OK.", why: "Give your date something to talk about." },
          { de: "Well, it's a long story … (20 minutes about your car)", en: "(Talk only about yourself for a long time)", delta: -12, tag: "😱 Monologue",
            react: "(Alex is counting the tiles.)", why: "A conversation goes both ways. After two minutes: ask a question!" },
          { de: "My ex always said I haven't got any hobbies.", en: "My old partner said I have no hobbies.", delta: -14, tag: "😱 The ex",
            react: "Oh … right.", why: "Your ex stays at home on a first date. Always." },
        ],
      },
      {
        who: "alex", npc: "I'm a nurse, by the way. At the hospital.", en: "I work as a nurse in the hospital.",
        options: [
          { de: "Wow, that must be hard work. What do you like about it?", en: "That's a tiring job, I think. What do you enjoy about it?", delta: 14, tag: "😊 Interested",
            react: "The people! Every day's different.", why: "Real interest in the person is the best compliment." },
          { de: "Cool.", en: "Nice (nothing more).", delta: 3, tag: "😐 Short",
            react: "Yeah … and you?", why: "Friendly, but a question shows more interest." },
          { de: "A hospital? Ugh, I'd never work there.", en: "I would hate that job.", delta: -12, tag: "😬 Put it down",
            react: "Good thing other people do it, then.", why: "Putting down your date's job is a quick way to end the evening." },
          { de: "And how much do you get paid for that?", en: "What's your salary?", delta: -14, tag: "😱 Pay question",
            react: "That's … not a first-date topic.", why: "Money isn't a first-date topic. Many people find it awkward even with friends." },
        ],
      },
      {
        who: "alex", wheel: 2, du: true, situation: "Your cups are empty, but you don't want to leave yet. What do you talk about?",
      },
      {
        who: "alex", situation: "You're laughing a lot. You want to pay Alex a compliment.",
        options: [
          { de: "You've got a really lovely laugh.", en: "I like your laugh a lot.", delta: 14, tag: "😊 Charming",
            react: "Oh – thank you! That's nice to hear.", why: "A compliment about someone's laugh or humour is personal, but not too much." },
          { de: "You've got great taste in music.", en: "You like really good music.", delta: 8, tag: "🙂 Nice",
            react: "Thanks! We should go to a gig some time.", why: "A compliment about someone's interests is safe and friendly." },
          { de: "You're much nicer than I expected.", en: "I thought you would be worse.", delta: -6, tag: "😬 Own goal",
            react: "What were you expecting?", why: "A compliment sounds much better without “than I expected”." },
          { de: "You're perfect! Will you marry me?", en: "You're perfect, let's get married!", delta: -12, tag: "😱 Way too much",
            react: "Erm … we met an hour ago.", why: "That much feeling is too fast for a first date – even as a joke." },
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
      { id: "kellner", mascot: "hamsti", name: "Dan", role: "waiter" },
    ],
    turns: [
      {
        who: "kellner", npc: "Is that all together, or separately?", en: "Will one person pay, or will you pay one each?",
        options: [
          { de: "I'd be happy to get this – or would you rather split it?", en: "I can pay for both – or do you want to pay half each?", delta: 15, tag: "😊 Offered, didn't decide", by: "alex",
            react: "That's sweet! I'll get the next one, then.", why: "Offering and asking is fair. Splitting the bill is completely normal too." },
          { de: "Separately, please.", en: "One bill each, please.", delta: 6, tag: "🙂 Perfectly normal", by: "alex",
            react: "Sure, separately.", why: "Splitting the bill is normal. A quick look at your date first would be even nicer." },
          { de: "Separately. You had the salad for £12.50 and I had the burger – so you owe me 30p.", en: "Separately. I counted every penny: you owe me 30p.", delta: -12, tag: "😱 Penny counter", by: "alex",
            react: "… I'll give you the 30p.", why: "Splitting is normal. Counting every penny isn't attractive." },
          { de: "(Pretend you're looking for your wallet)", en: "(Act as if you can't find your money)", delta: -16, tag: "😱 The old trick", by: "alex",
            react: "Never mind … I'll pay.", why: "Everyone knows that trick. Saying honestly what you can afford is much better." },
        ],
      },
      {
        who: "kellner", npc: "That's £23.40, then. Service isn't included.", en: "It costs £23.40. The tip is not on the bill.",
        options: [
          { de: "Here's £26 – keep the change, thanks.", en: "Here is £26. The rest is for you.", delta: 12, tag: "😊 Tipped well",
            react: "Thanks very much! Have a lovely evening!", why: "In UK restaurants a tip of about 10% is usual when service isn't on the bill." },
          { de: "(Give £24) Keep the change.", en: "(Give a very small tip)", delta: 4, tag: "😐 Small tip",
            react: "Thanks.", why: "A little tip is nice. About 10% is usual." },
          { de: "(Put down exactly £23.40)", en: "(Pay the exact amount, no tip)", delta: -3, tag: "😐 No tip",
            react: "Thanks.", why: "Tipping isn't required, but in restaurants it's usual." },
          { de: "A tip? You get paid a wage!", en: "Why should I give you extra money?", delta: -12, tag: "😱 Stingy",
            react: "Of course. Good evening.", why: "Tipping isn't a must, but saying it like that is rude – in front of your date, too." },
        ],
      },
    ],
    more: "/culture/tipping",
  },
  {
    id: "date-tschuess", place: "Saying goodbye", backdrop: "abend",
    props: [{ icon: "1F319", x: 82, y: 12 }, { icon: "1F6B2", x: 16, y: 50 }, { icon: "1F306", x: 50, y: 8 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date" }],
    turns: [
      {
        who: "alex", npc: "That was a lovely evening. I've got to go now, though.", en: "I liked this evening. But I must leave now.",
        options: [
          { de: "Me too! Would you like to do it again some time?", en: "I liked it too! Shall we meet again?", delta: 14, tag: "😊 Asked openly",
            react: "Maybe – I'll message you!", why: "Asking in a friendly way is brave and fair. Alex decides the answer." },
          { de: "I'll walk you to the station, if you like.", en: "I can go with you to the station, if you want.", delta: 8, tag: "🙂 Thoughtful",
            react: "That'd be nice, thanks!", why: "A kind offer – and “if you like” takes the pressure off." },
          { de: "OK, bye.", en: "OK, goodbye (nothing more).", delta: -4, tag: "😐 Cool",
            react: "Bye …", why: "One sentence about the evening shows you enjoyed it." },
          { de: "Already? Come back to mine!", en: "So early? Come to my home!", delta: -14, tag: "😱 Too much pressure",
            react: "No. I'm going now.", why: "After a first date that's too soon. And no means no." },
        ],
      },
      {
        who: "alex", situation: "Two days later Alex messages: “Hey, you're really nice, but I don't think we're a match. All the best!”",
        options: [
          { de: "That's a shame, but thanks for being honest. All the best to you too!", en: "Sad, but thank you for telling me. Good luck to you too!", delta: 16, tag: "😊 Respectful",
            react: "Thanks, that's kind of you.", why: "Accepting a no and answering kindly: that's how to treat each other with respect." },
          { de: "(Don't reply at all)", en: "(Send no answer)", delta: -4, tag: "😐 Radio silence",
            react: "(No reaction.)", why: "Not replying is OK. A short, kind message is nicer, though." },
          { de: "Why? What did I do wrong? Give me another chance!", en: "Why not? Please try again with me!", delta: -12, tag: "😬 Put on pressure",
            react: "Please just accept it.", why: "Pushing puts the other person under pressure. No means no." },
          { de: "(At three in the morning) You still awake? 😏", en: "(Write again in the middle of the night)", delta: -18, tag: "😱 Crossed the line",
            react: "(Alex blocks you.)", why: "Messaging after a no – and in the middle of the night? Absolutely not." },
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
    people: [{ id: "albrecht", mascot: "regi", name: "Ms Clarke", role: "English teacher" }],
    turns: [
      {
        who: "albrecht", situation: "Your English class started at 9. It's quarter past, and the door is shut.",
        options: [
          { de: "(Knock and go in) Sorry I'm late. The bus was delayed.", en: "(Knock, enter) I'm sorry, my bus was late.", delta: 14, tag: "😊 Quick apology",
            react: "No problem, take a seat.", why: "Knock, say sorry briefly, sit down: that disturbs the class least." },
          { de: "(Come in quietly and sit down quickly)", en: "(Enter without speaking and sit)", delta: 4, tag: "😐 Low-key",
            react: "(She nods.)", why: "OK – but a quick “Sorry” would be more polite." },
          { de: "(Wait outside until the break)", en: "(Stay outside the room)", delta: -6, tag: "😬 Missed a lot",
            react: "Oh, were you outside? What a shame!", why: "Then you miss a lot. Better to knock and come in." },
          { de: "(Come in loudly) Morning, everyone! What have I missed?", en: "(Enter noisily) Hi all! What did I miss?", delta: -12, tag: "😱 Big entrance",
            react: "The beginning. Please sit down quietly.", why: "If you're late, keep it short and quiet." },
        ],
      },
      {
        who: "albrecht", npc: "We're on page 34, exercise 2.", en: "Open your book at page 34. We're doing exercise 2.",
        options: [
          { de: "Thanks! (Open your book)", en: "Thank you! (Find the page)", delta: 12, tag: "😊 Straight in",
            react: "Great. Let's carry on!", why: "Joining in quickly shows the class matters to you." },
          { de: "What? But we were only on page 30!", en: "No! Last time we were on page 30!", delta: -6, tag: "😬 Argued",
            react: "We've already done four pages today.", why: "The others were on time. Ask in the break instead." },
          { de: "Could you explain everything again from the start?", en: "Please start again for me.", delta: -8, tag: "😬 Stopped the lesson",
            react: "Ask me in the break, please.", why: "The others have moved on. Someone will explain the start to you in the break." },
        ],
      },
    ],
    more: "/culture/insider/being-on-time",
  },
  {
    id: "du-oder-sie", place: "First day of the course", backdrop: "klasse",
    props: [{ icon: "1F4DD", x: 22, y: 44 }, { icon: "270F", x: 36, y: 46 }, { icon: "1F4D6", x: 76, y: 40 }],
    people: [{ id: "novak", mascot: "bruno", name: "Martin Novak", role: "course teacher",
      talk: { likes: ["urlaub", "hobbys"], dislikes: ["wetter"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } }],
    turns: [
      {
        who: "novak", situation: "The first day of your new English course. The teacher comes into the room.",
        npc: "Good morning, everyone! I'm Martin Novak, your teacher.", en: "Hello, all! My name is Martin Novak. I'm your teacher.",
        options: [
          { de: "Good morning! Nice to meet you.", en: "Hello! I'm happy to meet you.", delta: 14, tag: "😊 Spot on",
            react: "Nice to meet you too!", why: "A greeting and “Nice to meet you” is all you need." },
          { de: "Good morning, Mr Martin!", en: "Hello, Mr (+ first name)!", delta: -3, tag: "😐 Mixed up",
            react: "Ha – it's Mr Novak. Or just Martin.", why: "“Mr” and “Ms” go with the family name: Mr Novak, not Mr Martin." },
          { de: "Hello, teacher!", en: "Hi, teacher!", delta: -6, tag: "😬 No name",
            react: "Martin. Call me Martin.", why: "Adults don't usually say “teacher” as a name in English. Use the person's name." },
          { de: "Morning, Novak!", en: "Hi, (family name only)!", delta: -12, tag: "😱 Surname only",
            react: "Mr Novak, if you don't mind. Or Martin.", why: "Just the surname, without “Mr” or “Ms”, sounds rude or like a sports coach shouting." },
        ],
      },
      {
        who: "novak", npc: "Please call me Martin. We all use first names here.", en: "Say Martin to me. Here we all use our first names.",
        options: [
          { de: "OK, great! Hi, Martin!", en: "OK! Hello, Martin!", delta: 14, tag: "😊 First names it is",
            react: "Great! Let's get started.", why: "When the teacher offers first names, you just use them." },
          { de: "I'd rather say Mr Novak, if that's OK.", en: "I prefer Mr Novak, if you don't mind.", delta: 4, tag: "😐 A bit stiff",
            react: "No problem, whatever you prefer.", why: "That's allowed. But when everyone uses first names, it can seem a bit distant." },
          { de: "OK, Martin, my brother!", en: "OK, Martin, my buddy!", delta: -6, tag: "😬 Too matey",
            react: "Erm … just Martin's fine.", why: "First names don't make you best mates. A simple “Hi, Martin” is right." },
          { de: "Great, so I can be late sometimes, then?", en: "Good, so being late is OK now?", delta: -8, tag: "😬 Got it wrong",
            react: "No. First names don't change the rules.", why: "First names make it more personal – the rules stay the same." },
        ],
      },
      {
        who: "novak", wheel: 1, du: true, situation: "Break time. Martin is standing next to you at the coffee machine.",
      },
    ],
    more: "/culture/names-and-titles",
  },
  {
    id: "elterngespraech", place: "Parents' evening", backdrop: "klasse",
    props: [{ icon: "1F4CB", x: 30, y: 46 }, { icon: "1F3A8", x: 80, y: 18 }, { icon: "1F392", x: 18, y: 56 }],
    people: [{ id: "weiss", mascot: "hamsti", name: "Mrs White", role: "your daughter's class teacher" }],
    turns: [
      {
        who: "weiss", situation: "It's parents' evening at your daughter Mia's school. You sit down with her class teacher.",
        npc: "Thanks for coming. Mia works very hard, but she does talk a lot in class.", en: "Good that you came. Mia is a hard worker, but she often chats in lessons.",
        options: [
          { de: "Thanks for telling me. What can we do at home to help?", en: "Thank you. How can we help at home?", delta: 16, tag: "😊 Constructive",
            react: "Good question! Maybe talk to her about the class rules.", why: "Saying thank you and asking how you can help: that makes parents' evening work." },
          { de: "OK.", en: "OK (nothing more).", delta: 3, tag: "😐 Passive",
            react: "… Do you have any idea why that might be?", why: "Not wrong, but the meeting is for both of you. Ask something!" },
          { de: "That can't be right. She's really quiet at home.", en: "No, she is quiet at home.", delta: -6, tag: "😬 Defensive",
            react: "I'm afraid it's different in class.", why: "The teacher sees Mia every day. Listening first helps more." },
          { de: "Maybe your lessons are just boring?", en: "Perhaps your lessons are not interesting.", delta: -16, tag: "😱 Attack",
            react: "I think we should keep this constructive.", why: "Attacking the teacher doesn't help your child. Stay calm and stick to the facts." },
        ],
      },
      {
        who: "weiss", npc: "Shall we have another chat in about four weeks?", en: "Can we talk again in four weeks?",
        options: [
          { de: "Yes, that would be great. Would the 25th at four suit you?", en: "Yes, good. Is the 25th at 4 p.m. OK for you?", delta: 14, tag: "😊 Made a date",
            react: "Yes, that works. I'll make a note.", why: "Suggesting a real date shows it matters to you." },
          { de: "Just give me a ring if anything comes up.", en: "Call me if there's a problem.", delta: 3, tag: "😐 Vague",
            react: "OK … I'll be in touch.", why: "Fine, but a fixed date is more reliable." },
          { de: "Just message me on WhatsApp.", en: "Send me a WhatsApp.", delta: -4, tag: "😐 Too private",
            react: "I'd rather do it through the school.", why: "Most teachers contact parents through the school, not on private apps." },
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
        who: "daniel", situation: "Group work in your English class: you have to make a poster together. Daniel just looks at his phone.",
        npc: "You lot do it, I'm knackered today.", en: "You do it, I'm very tired today.",
        options: [
          { de: "I get it. But I don't think it's fair if I do it all on my own. Could you write the heading?", en: "I understand. But it's unfair if I do everything. Can you write the title?", delta: 16, tag: "😊 “I” message",
            react: "Hmm … OK, fair enough. Pass me the pen.", why: "With “I don't think …” you say what bothers you without blaming him. And a small task helps." },
          { de: "No problem, have a rest!", en: "It's OK, sleep!", delta: 3, tag: "😐 Too nice",
            react: "Cheers, you're a star!", why: "Kind, but now you're doing everything yourself. It's OK to say what you need." },
          { de: "(Sigh and do it all yourself)", en: "(Do all the work and say nothing)", delta: -4, tag: "😐 Swallowed it",
            react: "(Daniel doesn't notice.)", why: "Swallowing your anger helps nobody. Say kindly what bothers you." },
          { de: "You're so lazy! You never do anything!", en: "You are lazy and you never help!", delta: -14, tag: "😱 Blame",
            react: "Oi, calm down!", why: "“You're …” and “never” sound like an attack. Then nobody wants to join in." },
        ],
      },
      {
        who: "daniel", npc: "OK, OK. What do you want me to do?", en: "Fine. What is my job?",
        options: [
          { de: "Great! You do the heading and find two pictures. I'll write the text.", en: "Good! Write the title and find two pictures. I'll do the writing.", delta: 14, tag: "😊 Clear jobs",
            react: "Right, on it!", why: "Clear jobs make group work easier." },
          { de: "Do whatever you want.", en: "I don't care what you do.", delta: -6, tag: "😬 Sulking",
            react: "Erm … OK?", why: "He wants to help now. Take the offer!" },
          { de: "It's too late now anyway.", en: "Now it's too late.", delta: -8, tag: "😬 Holding a grudge",
            react: "Fine, forget it then.", why: "Holding a grudge loses you help. Better to start again." },
        ],
      },
    ],
    more: "/culture/insider/understatement",
  },
];

export const AREAS = [
  { id: "oeffentlich", title: "Out and about", icon: "1F68F", scenes: unterwegs },
  { id: "arbeit", title: "At work", icon: "1F4BC", scenes: arbeit },
  { id: "zuhause", title: "Home and neighbours", icon: "1F3E0", scenes: zuhause },
  { id: "date", title: "The date", icon: "1F377", scenes: date },
  { id: "schule", title: "School and English class", icon: "1F3EB", scenes: schule },
];

export const areaById = (id) => AREAS.find((a) => a.id === id) ?? null;
