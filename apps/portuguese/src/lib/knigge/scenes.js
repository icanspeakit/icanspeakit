// The Manners Simulator (/jogos/boas-maneiras): the scenes of one day in Portugal, in five areas.
//
// A scene = place + backdrop + people + turns. A turn: someone says something (`npc`, European
// Portuguese, with its English meaning `en`) or a `situation` (English) sets the scene, then the
// learner picks one of 3–4 `options`. There is no single right answer: every option moves the
// liking of the turn's person (`who`) by `delta` (−20 … +20) and the reputation by delta / 2.
//   bands: best +12 … +20 · okay +3 … +8 · awkward −3 … −8 · barbarian −12 … −20
//   at least one option ≥ +10 per turn, never two with the same top delta.
// Each option: `de` (what you say, in Portuguese – the key name is kept from the German game;
// stage directions in parentheses are English), `en` (its English meaning, under 💡 Help),
// `tag` (the floating label, English), `react` (the person's answer in Portuguese, said by `who`
// unless `by` names someone else; only-parentheses reactions are English stage directions),
// `reactEn` (its English meaning; none for stage directions) and `why` (one short English
// sentence, shown for good answers too).
// `more` links the culture / insider topic that explains the scene.
// A `wheel: n` turn is the small-talk wheel instead (n topics to pick; `du` = tu, otherwise the
// formal third person without a pronoun; see TOPICS below and the person's hidden `talk`).
//
// The Portuguese is the content (A2–B1, European Portuguese: tu / o senhor / a senhora as used in
// Portugal, Portugal vocabulary, enclisis by default, AO90 spelling as in Portugal). The player's
// gender is unknown, so the player's lines and what people say to the player avoid gendered forms:
// no obrigado/obrigada, bem-vindo/a, cansado/a, novo/a, sozinho/a, atrasado/a in the player's
// mouth (thanks become agradeço, que simpatia, não era preciso …), and Alex in the date is written
// without gender too (scripts/check-knigge.mjs). The people the player meets have a known gender
// (name and role), so their own obrigado / obrigada agrees with them. Tone: funny, never mean –
// jokes about behaviour, never about groups; no comments on bodies, origin or gender; "many
// people", not "the Portuguese". Etiquette is common practice, not law.

/**
 * All lines are European Portuguese (pt-PT). A later Brazil mode (ptBR) must rewrite these rather
 * than swap words: the tu / o senhor / a senhora system (Brazil: você for almost everyone, tu only
 * in some regions), enclisis (Brazil: proclisis, "me mostra"), autocarro (ônibus), telemóvel
 * (celular), fatura (nota fiscal), galão / bica / imperial / fino (Brazil: café com leite,
 * cafezinho, chope), carcaça, couvert and número de contribuinte, Dona + first name, stôr,
 * diretora de turma and caderneta, fixe (legal), and customs that are Portugal's (dois beijinhos,
 * the meal times, the couvert).
 */
export const VARIETY = "pt-PT";

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
 * the formal third person, without o senhor / a senhora because the wheel is shared by people of
 * any gender; `du` = tu; key names kept), `re` the person's answer per kind (shared too, so no
 * obrigado / obrigada); `sayEn` and `reEn` are their English meanings. A liked topic, once found,
 * shows a 💡 next time.
 */
export const TOPICS = [
  { id: "wetter", label: "Weather", icon: "2600",
    say: { sie: "Está um dia lindo, não está?", du: "Que dia tão bom, não achas?" },
    sayEn: { sie: "It's a lovely day, isn't it?", du: "What a nice day, don't you think?" },
    re: { like: "Maravilhoso! Fui correr antes do trabalho.", ok: "Pois é, sabe bem ver o sol.", dislike: "Pois. O tempo é o que é." },
    reEn: { like: "Wonderful! I went for a run before work.", ok: "Yes, it's nice to see the sun.", dislike: "Well. The weather is the weather." } },
  { id: "wochenende", label: "Weekend", icon: "1F389",
    say: { sie: "Tem planos para o fim de semana?", du: "Tens planos para o fim de semana?" },
    sayEn: { sie: "Do you have any plans for the weekend?", du: "Got any plans for the weekend?" },
    re: { like: "Tenho! Vou para a praia. Mal posso esperar!", ok: "Nada de especial, descansar.", dislike: "Ai, tenho de trabalhar." },
    reEn: { like: "I do! I'm going to the beach. I can't wait!", ok: "Nothing special, just resting.", dislike: "Oh, I have to work." } },
  { id: "arbeit", label: "Work", icon: "1F4BC",
    say: { sie: "E o que é que faz na vida?", du: "Então, muito trabalho?" },
    sayEn: { sie: "And what do you do for a living?", du: "So, busy at work?" },
    re: { like: "Adoro o meu trabalho!", ok: "Vai-se andando.", dislike: "Por favor, não falemos de trabalho…" },
    reEn: { like: "I love my job!", ok: "Getting by.", dislike: "Please, let's not talk about work…" } },
  { id: "hobbys", label: "Hobbies", icon: "1F3B8",
    say: { sie: "O que é que gosta de fazer nos tempos livres?", du: "O que é que gostas de fazer nos tempos livres?" },
    sayEn: { sie: "What do you like doing in your free time?", du: "What do you like doing in your free time?" },
    re: { like: "Toco guitarra, quase todas as noites!", ok: "Gosto de ler.", dislike: "Tempos livres? Agora não tenho nenhuns." },
    reEn: { like: "I play the guitar, nearly every night!", ok: "I like reading.", dislike: "Free time? I don't have any right now." } },
  { id: "essen", label: "Food", icon: "1F35D",
    say: { sie: "Conhece algum sítio bom para comer aqui perto?", du: "Conheces algum sítio bom para comer aqui perto?" },
    sayEn: { sie: "Do you know a good place to eat around here?", du: "Do you know a good place to eat around here?" },
    re: { like: "Conheço! Ao virar da esquina há uma tasca com uns pastéis de bacalhau ótimos.", ok: "Hum, o café da esquina não é mau.", dislike: "Eu prefiro comer em casa." },
    reEn: { like: "I do! Round the corner there's a tasca with amazing codfish cakes.", ok: "Hmm, the café on the corner isn't bad.", dislike: "I prefer eating at home." } },
  { id: "urlaub", label: "Holidays", icon: "1F3D6",
    say: { sie: "Já foi de férias este ano?", du: "Já foste a algum lado este verão?" },
    sayEn: { sie: "Have you been on holiday this year?", du: "Have you been anywhere this summer?" },
    re: { like: "Fui aos Açores! Lindíssimo.", ok: "Ainda não, talvez no outono.", dislike: "Férias? Quem me dera." },
    reEn: { like: "I went to the Azores! Beautiful.", ok: "Not yet, maybe in the autumn.", dislike: "A holiday? I wish." } },
  { id: "gehalt", label: "Salary", icon: "1F4B6",
    say: { sie: "E quanto é que ganha?", du: "E tu, quanto é que ganhas?" },
    sayEn: { sie: "And how much do you earn?", du: "And how much do you earn?" },
    re: { taboo: "Isso… prefiro não dizer." },
    reEn: { taboo: "That's… something I'd rather not say." },
    why: "Many people don't talk about their pay with strangers or colleagues: they find it too private." },
  { id: "aussehen", label: "Looks", icon: "1FA9E",
    say: { sie: "Está com má cara.", du: "Estás com uma cara péssima." },
    sayEn: { sie: "You don't look well.", du: "You look awful." },
    re: { taboo: "Ah. Que simpatia…" },
    reEn: { taboo: "Oh. How kind…" },
    why: "Comments on how someone looks or on their weight are best left out of small talk, even if you mean well." },
  { id: "politik", label: "Politics", icon: "1F5F3",
    say: { sie: "O que é que acha do Governo?", du: "O que é que achas do Governo?" },
    sayEn: { sie: "What's your opinion of the government?", du: "What do you think of the government?" },
    re: { taboo: "Prefiro não falar disso.", like: "Boa pergunta! Eu acho que…", ok: "Hum, é um tema complicado.", dislike: "Ui, é melhor não." },
    reEn: { taboo: "I'd rather not talk about that.", like: "Good question! I think…", ok: "Hmm, that's a complicated subject.", dislike: "Ugh, better not." },
    why: "Friends in Portugal may happily argue about politics (and football), but with someone you've just met it's safer to avoid it." },
  { id: "liebe", label: "Love & exes", icon: "1F48D",
    say: { sie: "E tem alguém especial na sua vida?", du: "Então, ainda pensas no teu último amor?" },
    sayEn: { sie: "And is there someone special in your life?", du: "So, do you still think about your last love?" },
    re: { taboo: "Isso é privado.", ok: "Ui, é uma história muito comprida.", like: "Ai, acabei de me apaixonar!", dislike: "É melhor falarmos de outra coisa." },
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
    id: "baeckerei", place: "At the pastelaria", backdrop: "baeckerei",
    props: [{ icon: "1F950", x: 14, y: 30 }, { icon: "1F35E", x: 30, y: 26 }, { icon: "1F370", x: 78, y: 28 }],
    people: [
      { id: "kunde", mascot: "quaki", name: "Senhor Almeida", role: "customer waiting" },
      { id: "verkaeuferin", mascot: "hamsti", name: "Sandra", role: "shop assistant" },
    ],
    turns: [
      {
        who: "kunde", situation: "Eight in the morning in a busy pastelaria. A few people are standing around the counter, not in a line. You walk straight up to it.",
        npc: "Desculpe, mas eu estava primeiro.", en: "Excuse me, but I was here first.",
        options: [
          { de: "Ai, desculpe! Não tinha reparado. Quem é o último?", en: "Oh, sorry! I hadn't noticed. Who's last?", delta: 15, tag: "😊 Knows the ritual",
            react: "Sou eu. É a seguir a mim.", reactEn: "Me. You're after me.", why: "Where there's no ticket machine, people keep track of who came in after whom: Quem é o último? (or a última?) tells you your turn. At the post office, the butcher's or the Loja do Cidadão, look for the senha (ticket) machine first." },
          { de: "Tem a certeza? Não o vi.", en: "Are you sure? I didn't see you.", delta: 4, tag: "😐 A bit stubborn",
            react: "Tenho. Estava ali ao pé da montra.", reactEn: "I am. I was over there by the display.", why: "Asking is OK. But the people there know who came first, so listen to them." },
          { de: "É que estou com muita pressa.", en: "It's just that I'm in a big hurry.", delta: -8, tag: "😬 Queue jumper",
            react: "E eu. E toda a gente.", reactEn: "So am I. So is everyone.", why: "You can ask Importa-se que eu passe à frente? (Do you mind if I go first?), but being in a hurry doesn't give you the turn." },
          { de: "E então? Aqui não há senhas.", en: "So what? There are no tickets here.", delta: -16, tag: "😱 Elbows out",
            react: "Inacreditável…", reactEn: "Unbelievable…", why: "Even without tickets or a line, everyone knows who came after whom." },
        ],
      },
      {
        who: "verkaeuferin", npc: "Bom dia! O que vai ser?", en: "Good morning! What'll it be?",
        options: [
          { de: "Bom dia! Queria quatro carcaças e um pastel de nata, se faz favor.", en: "Good morning! I'd like four bread rolls and a custard tart, please.", delta: 15, tag: "😊 Friendly and clear",
            react: "É para já. Mais alguma coisa?", reactEn: "Coming right up. Anything else?", why: "Queria… (literally “I wanted…”) is the polite way to order in Portugal, softer than Quero. Se faz favor is as common as por favor." },
          { de: "O que é que é mais barato?", en: "What's the cheapest thing?", delta: 3, tag: "😐 Bargain hunter",
            react: "As carcaças, a 25 cêntimos.", reactEn: "The bread rolls, at 25 cents.", why: "Asking about prices is fine. A Bom dia! first would be nicer." },
          { de: "Quatro carcaças e um pastel de nata.", en: "Four rolls and a custard tart (and nothing else).", delta: -4, tag: "😐 A bit short",
            react: "Bom dia, não é?", reactEn: "Good morning to you too.", why: "Short orders are normal, but people do expect a Bom dia when you come in." },
          { de: "Ei, você! Quatro carcaças, rápido!", en: "Hey, you! Four rolls, quickly!", delta: -12, tag: "😬 Rude",
            react: "Um momento, que eu não sou nenhuma máquina.", reactEn: "Just a moment, I'm not a machine.", why: "Calling someone você to their face can sound rude in Portugal, and ordering people about is worse. Start with a greeting and add se faz favor." },
        ],
      },
      {
        who: "verkaeuferin", npc: "São 2,80. Quer saco?", en: "That's €2.80. Do you want a bag?",
        options: [
          { de: "Não é preciso, trago o meu.", en: "No need, I've brought my own.", delta: 12, tag: "😊 Well prepared",
            react: "Muito bem. Obrigada!", reactEn: "Very good. Thank you!", why: "Bags usually cost a few cents in Portuguese shops, so many people bring their own." },
          { de: "Quero, se faz favor. Tome três euros e fique com o troco.", en: "Yes, please. Here's three euros, keep the change.", delta: 6, tag: "🙂 Small tip",
            react: "Ai, muito obrigada!", reactEn: "Oh, thank you very much!", why: "Nobody expects a tip in a pastelaria, but it's a nice gesture. Note the answer: Portuguese says yes by repeating the verb (Quero, Tenho, Moro)." },
          { de: "(Put the money down without a word and leave)", en: "(Pay, say nothing and go)", delta: -6, tag: "😬 Silent",
            react: "Bom dia, então…", reactEn: "Have a good day, then…", why: "On the way out people say a quick thank you and Até logo. Obrigado or obrigada agrees with the person who thanks: a man says obrigado, a woman obrigada." },
          { de: "2,80? Que roubo!", en: "€2.80? What a rip-off!", delta: -14, tag: "😱 Moaned",
            react: "Os preços não sou eu que os ponho.", reactEn: "I'm not the one who sets the prices.", why: "Complaining about prices doesn't help. The shop assistant can't change them." },
        ],
      },
    ],
    more: "/cultura/appointments-and-senhas",
  },
  {
    id: "sbahn", place: "On the metro", backdrop: "sbahn",
    props: [{ icon: "1F687", x: 84, y: 24 }, { icon: "1F6CD", x: 60, y: 70 }],
    people: [
      { id: "mann", mascot: "bruno", name: "Man with a bag", role: "passenger" },
      { id: "dame", mascot: "regi", name: "Dona Graça", role: "passenger with a walking stick" },
    ],
    turns: [
      {
        who: "mann", situation: "The metro is packed. A man's bag is on the only free seat. He's looking at his phone.",
        options: [
          { de: "Desculpe, este lugar está livre?", en: "Excuse me, is this seat free?", delta: 15, tag: "😊 Asked politely",
            react: "Ai, desculpe! Claro, sente-se.", reactEn: "Oh, sorry! Of course, sit down.", why: "Este lugar está livre? is the normal question. Desculpe is the formal form, safe with any stranger." },
          { de: "(Keep standing and say nothing)", en: "(Don't speak, just stand)", delta: 3, tag: "😐 Too shy",
            react: "(He doesn't notice.)", why: "That isn't rude. But you're allowed to ask, and it's normal." },
          { de: "(Sigh loudly) Haja paciência…", en: "(Sigh loudly) Give me strength…", delta: -6, tag: "😬 Passive-aggressive",
            react: "Hã? Ah… pronto, sente-se.", reactEn: "Huh? Oh… there, sit down.", why: "Loud sighing comes across as unfriendly. A direct, friendly question works better." },
          { de: "(Just put the bag on the floor)", en: "(Move his bag yourself)", delta: -14, tag: "😱 Hands off!",
            react: "Então?! Esse saco é meu!", reactEn: "Hey! That's my bag!", why: "You don't touch other people's things. Ask first." },
        ],
      },
      {
        who: "dame", situation: "Two stops later an older woman with a walking stick gets on. There are no free seats.",
        npc: "Ai, tanta gente hoje.", en: "Oh, so many people today.",
        options: [
          { de: "Quer sentar-se? Faça favor, sente-se aqui.", en: "Would you like to sit down? Please, sit here.", delta: 16, tag: "😊 Thoughtful",
            react: "Ai, muito obrigada. Que simpatia.", reactEn: "Oh, thank you very much. How kind.", why: "Many people give up their seat, and the formal form fits an older stranger. Metro and bus seats for people who need them (lugares reservados) are marked too." },
          { de: "Pois é, de manhã é sempre assim.", en: "Yes, mornings are always like this.", delta: 4, tag: "😐 Just small talk",
            react: "Pois, pois…", reactEn: "Yes, yes…", why: "A bit of small talk is OK. But what she really needs is a seat." },
          { de: "(Put your headphones in and look out of the window)", en: "(Listen to music and look away)", delta: -12, tag: "😬 Looked away",
            react: "(She holds on with difficulty.)", why: "Pretending not to see feels rude to many people. A quick offer costs nothing." },
        ],
      },
      {
        who: "dame", npc: "Sabe se este metro para nos Restauradores?", en: "Do you know if this train stops at Restauradores?",
        options: [
          { de: "Para, daqui a duas estações. Eu aviso-a.", en: "It does, in two stops. I'll let you know.", delta: 14, tag: "😊 Helpful",
            react: "Que simpatia, obrigada.", reactEn: "How kind, thank you.", why: "Short, clear help and a promise to tell her. Eu aviso-a (I'll tell you, literally “I'll tell her”) is the formal you: a senhora takes the pronoun a." },
          { de: "Não faço ideia.", en: "No idea.", delta: -4, tag: "😐 Abrupt",
            react: "Ah. Pronto.", reactEn: "Oh. Fine.", why: "Not knowing is fine. Friendlier: Desculpe, não sei." },
          { de: "Veja no mapa ali em cima.", en: "Look at the map up there.", delta: -6, tag: "😬 Dismissive",
            react: "Sem óculos não vejo nada.", reactEn: "I can't see a thing without my glasses.", why: "The tip is right, but it sounds cold. Better to check it quickly yourself." },
          { de: "Restauradores? E vai lá fazer o quê?", en: "Restauradores? And what are you going there for?", delta: -12, tag: "😱 Too nosy",
            react: "Isso… não é da sua conta.", reactEn: "That's… none of your business.", why: "You don't ask strangers about their plans. Just answer the question." },
        ],
      },
    ],
    more: "/cultura/por-dentro/queues-and-personal-space",
  },
  {
    id: "aufzug", place: "In the lift", backdrop: "aufzug",
    props: [{ icon: "1F6D7", x: 82, y: 30 }, { icon: "1F514", x: 16, y: 22 }],
    people: [
      { id: "herr", mascot: "bruno", name: "Senhor Ferreira", role: "man in the lift",
        talk: { likes: ["wetter", "wochenende"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "botin", mascot: "quaki", name: "Amina", role: "courier with parcels" },
    ],
    turns: [
      {
        who: "herr", situation: "You get into the lift. An older man is already inside.",
        npc: "Bom dia.", en: "Good morning.",
        options: [
          { de: "Bom dia.", en: "Good morning.", delta: 12, tag: "😊 Said it back",
            react: "(He nods in a friendly way.)", why: "Many people greet in lifts, in waiting rooms and at the centro de saúde, and say Com licença or Até logo when they leave. Bom dia (Boa tarde after lunch) is enough." },
          { de: "Olá, amigo!", en: "Hi, my friend!", delta: -4, tag: "😐 Too familiar",
            react: "… Bom dia.", reactEn: "… Good morning.", why: "With an older stranger, Bom dia is right, without the amigo." },
          { de: "(Say nothing, look at your phone)", en: "(Don't answer, check your phone)", delta: -5, tag: "😐 Silent",
            react: "(He looks at the door.)", why: "Many people think it's unfriendly not to answer a greeting." },
          { de: "Bom dia. Não dormi nada, o meu vizinho ressona e as costas estão a matar-me…", en: "Good morning. I haven't slept at all, my neighbour snores and my back is killing me…", delta: -8, tag: "😬 Too much information",
            react: "Pois… que chatice.", reactEn: "Right… what a pain.", why: "In a lift a greeting and perhaps a word about the weather will do. Your back is for friends." },
        ],
      },
      {
        who: "herr", wheel: 1, situation: "The lift is slow. Seven more floors… The silence is getting awkward. Say something! He's an older stranger, so you speak formally: no tu.",
      },
      {
        who: "botin", situation: "The lift stops on the second floor. A woman with two parcels wants to get in.",
        npc: "Há espaço para mais uma?", en: "Is there room for one more?",
        options: [
          { de: "Claro, entre! (Step aside a little)", en: "Of course, come in! (Make some space)", delta: 14, tag: "😊 Made room",
            react: "Obrigada, muito amável.", reactEn: "Thanks, very kind.", why: "Making room is all it takes. People often stand fairly close here, but a lift is a good moment to give a little space." },
          { de: "(Stay very close to her, although there's room)", en: "(Stand right next to her)", delta: -6, tag: "😬 Too close",
            react: "(She moves away.)", why: "Personal space may be smaller than you're used to, but if there's room, nobody needs you that close." },
          { de: "Ui, é melhor esperar pelo próximo.", en: "Ugh, better wait for the next one.", delta: -12, tag: "😬 Turned away",
            react: "Ah. Mas há espaço de sobra.", reactEn: "Oh. But there's plenty of room.", why: "If there's room, you let people in. Anything else feels cold." },
          { de: "(Quickly press “close door”)", en: "(Shut the door on her)", delta: -18, tag: "😱 Door in her face",
            react: "Então?! …", reactEn: "Hey?! …", why: "Closing the door in someone's face is a real manners disaster." },
        ],
      },
      {
        who: "botin", npc: "Ufa, isto pesa. Pode carregar no quatro, por favor?", en: "Phew, these are heavy. Could you press four for me, please?",
        options: [
          { de: "Claro! Quer ajuda com uma?", en: "Of course! Would you like help with one?", delta: 15, tag: "😊 Thought ahead",
            react: "Ai, quero, obrigada. É um amor.", reactEn: "Oh, yes please, thanks. You're a star.", why: "A little help when someone has their hands full makes almost anyone happy." },
          { de: "(Press four)", en: "(Press the button)", delta: 6, tag: "🙂 Done",
            react: "Obrigada!", reactEn: "Thanks!", why: "Perfectly fine. A quick De nada makes it even friendlier." },
          { de: "Tenho cara de ascensorista?", en: "Do I look like a lift attendant?", delta: -15, tag: "😱 Snappy",
            react: "Ena. Pronto.", reactEn: "Wow. Fine.", why: "Saying no to a tiny favour and making fun of it is very rude." },
        ],
      },
    ],
    more: "/cultura/por-dentro/saying-hello",
  },
  {
    id: "weg", place: "In the street", backdrop: "strasse",
    props: [{ icon: "1F3DB", x: 82, y: 22 }, { icon: "1F333", x: 12, y: 26 }, { icon: "1F68F", x: 30, y: 30 }],
    people: [
      { id: "touristin", mascot: "hamsti", name: "A young woman", role: "asking the way" },
    ],
    turns: [
      {
        who: "touristin", npc: "Desculpe, como é que vou para a Câmara Municipal?", en: "Excuse me, how do I get to the town hall?",
        options: [
          { de: "Siga sempre em frente e vire na segunda à esquerda. São uns cinco minutos.", en: "Go straight on and take the second left. It's about five minutes.", delta: 15, tag: "😊 Clear directions",
            react: "Ótimo, muito obrigada!", reactEn: "Great, thank you very much!", why: "Short and clear: that's how you give directions. Strangers usually speak formally to each other (siga, vire), young people too." },
          { de: "Desculpe, não sei. Porque não pergunta no quiosque?", en: "Sorry, I don't know. Why don't you ask at the kiosk?", delta: 8, tag: "🙂 Honest",
            react: "Está bem, obrigada na mesma!", reactEn: "OK, thanks anyway!", why: "Desculpe, não sei is perfectly fine, and with a tip it's even better." },
          { de: "A Câmara? Olhe, é por ali… ou por acolá… acho eu.", en: "The town hall? Well, it's that way… or over there… I think.", delta: -6, tag: "😬 Confusing",
            react: "Hã… obrigada?", reactEn: "Er… thanks?", why: "Better to say you don't know than to send someone the wrong way." },
          { de: "(Walk on without answering)", en: "(Ignore her and keep walking)", delta: -14, tag: "😱 Ignored",
            react: "Olá? …", reactEn: "Hello? …", why: "When someone speaks to you, you answer briefly, even if it's only Desculpe, estou com pressa." },
        ],
      },
      {
        who: "touristin", npc: "Pode mostrar-me no mapa?", en: "Can you show me on the map?",
        options: [
          { de: "Claro. Estamos aqui, e a Câmara é ali.", en: "Of course. We're here, and the town hall is there.", delta: 12, tag: "😊 Patient",
            react: "Ah, agora sim!", reactEn: "Ah, now I get it!", why: "Patience is friendly. On a map it's often easier." },
          { de: "Eu vou para esses lados. Venha comigo!", en: "I'm going that way. Come with me!", delta: 8, tag: "🙂 Very helpful",
            react: "Ai, que simpatia!", reactEn: "Oh, how kind!", why: "Very friendly! But nobody has to go that far. Showing her is enough." },
          { de: "(Take her phone and tap on it for ages)", en: "(Take her phone and use it for a long time)", delta: -6, tag: "😬 Took over",
            react: "Hã… pode devolver-me o telemóvel?", reactEn: "Er… can I have my phone back?", why: "You don't just take someone else's phone. Showing her is enough." },
          { de: "E não tem telemóvel para isso?", en: "Don't you have your phone for that?", delta: -12, tag: "😱 Annoyed",
            react: "Tenho, mas não me entendo com ele.", reactEn: "I do, but I can't make sense of it.", why: "She's asking you because she needs help. Making fun of her doesn't help." },
        ],
      },
    ],
    more: "/cultura/por-dentro/please-and-thank-you",
  },
  {
    id: "menu-del-dia", place: "Lunch at a tasca", backdrop: "cafe",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "23F0", x: 80, y: 14 }, { icon: "1F9FE", x: 22, y: 44 }],
    people: [{ id: "camarero", mascot: "bruno", name: "Senhor Zé", role: "waiter" }],
    turns: [
      {
        who: "camarero", situation: "Five to one. The little restaurant is full, and two people are waiting by the door. A table near you is just being cleared.",
        npc: "Boa tarde! Um momentinho, que já se arranja mesa.", en: "Good afternoon! Just a moment, we'll find you a table.",
        options: [
          { de: "Com certeza. Eu espero aqui ao pé da porta.", en: "Of course. I'll wait here by the door.", delta: 14, tag: "😊 Waited to be seated",
            react: "Muito bem. É logo a seguir àqueles senhores.", reactEn: "Very good. You're right after those people.", why: "In most restaurants you wait to be shown to a table. Lunch in Portugal is usually between about 12:30 and 2 pm, so around one the small places fill up fast." },
          { de: "Posso beber um café ao balcão enquanto espero?", en: "Can I have a coffee at the counter while I wait?", delta: 8, tag: "🙂 Good idea",
            react: "Pode, pode. É para já.", reactEn: "Sure, sure. Coming right up.", why: "Good thinking: you can almost always have a coffee or a drink at the balcão (counter) while you wait." },
          { de: "(Sit down at the table that's just been cleared)", en: "(Grab the free table)", delta: -8, tag: "😬 Jumped in",
            react: "Desculpe, mas aqueles senhores estavam primeiro.", reactEn: "Sorry, but those people were here first.", why: "The people at the door were waiting for that table. Wait your turn and the waiter will seat you." },
          { de: "Isto está sempre assim cheio? Que falta de organização.", en: "Is it always this full? What poor organisation.", delta: -12, tag: "😱 Grumbled",
            react: "Está cheio porque a comida é boa.", reactEn: "It's full because the food is good.", why: "A full tasca at one o'clock is a good sign, not bad service. Wait, or come back later." },
        ],
      },
      {
        who: "camarero", situation: "You get a table. Before you order, the waiter puts bread, butter, olives and a small cheese on it.",
        npc: "Aqui tem. Já sabe o que vai comer?", en: "Here you are. Do you know what you'd like?",
        options: [
          { de: "Ainda não. E o queijo pode levar, se faz favor, que eu não vou comer.", en: "Not yet. And you can take the cheese away, please, I won't eat it.", delta: 14, tag: "😊 Knows the couvert",
            react: "Com certeza, sem problema.", reactEn: "Certainly, no problem.", why: "This is the couvert, and it isn't free: what you eat goes on the bill. If you don't want something, ask for it to be taken away. That's normal and nobody minds." },
          { de: "(Eat some bread and olives while you read the menu)", en: "(Enjoy the bread and olives)", delta: 6, tag: "🙂 Enjoyed it",
            react: "(He smiles. It will be on the bill.)", why: "Perfectly fine: you eat it, you pay for it, usually a euro or two. What you don't touch shouldn't be charged." },
          { de: "Isto é oferta da casa, não é?", en: "This is on the house, isn't it?", delta: -4, tag: "😐 Hopeful",
            react: "Não, não. O couvert paga-se.", reactEn: "No, no. You pay for the couvert.", why: "Most people learn this once. If you're not sure, just ask: Isto é pago?" },
          { de: "Eu não pedi nada disto! Leve já daqui.", en: "I didn't order any of this! Take it away right now.", delta: -12, tag: "😬 Snapped",
            react: "Pronto, pronto, eu levo.", reactEn: "All right, all right, I'll take it.", why: "Saying no to the couvert is fine. A calm Pode levar, se faz favor is enough." },
        ],
      },
      {
        who: "camarero", npc: "Hoje o prato do dia é bacalhau à Brás ou febras com batata frita. O que vai ser?", en: "Today's dish of the day is bacalhau à Brás or pork steaks with chips. What'll it be?",
        options: [
          { de: "Queria o bacalhau à Brás, se faz favor. E um copo de vinho da casa.", en: "I'd like the bacalhau à Brás, please. And a glass of house wine.", delta: 14, tag: "😊 Ordered like a local",
            react: "Muito bem, é para já.", reactEn: "Very good, coming right up.", why: "The prato do dia is often the cheapest and freshest choice in a tasca. Queria… se faz favor is how you order it." },
          { de: "O que é que me recomenda?", en: "What do you recommend?", delta: 8, tag: "🙂 Asked",
            react: "O bacalhau, que hoje está muito bom.", reactEn: "The bacalhau, it's very good today.", why: "Always a good question, and people like being asked." },
          { de: "Faz-me um desconto no bacalhau?", en: "Will you give me a discount on the bacalhau?", delta: -5, tag: "😐 Haggling",
            react: "O preço é o que está no quadro.", reactEn: "The price is what's on the board.", why: "Restaurant prices aren't for haggling. But many tascas do a meia dose (half portion) for less: just ask Tem meia dose?" },
          { de: "Bacalhau outra vez? Neste país só se come bacalhau!", en: "Bacalhau again? In this country all you eat is bacalhau!", delta: -14, tag: "😱 Insulted the food",
            react: "E é por isso que o fazemos tão bem.", reactEn: "And that's why we cook it so well.", why: "Bacalhau is a much-loved dish. Insulting the food is the fastest way to lose the waiter." },
        ],
      },
      {
        who: "camarero", situation: "You finished your coffee twenty minutes ago. Nobody has brought the bill, and you start to feel forgotten.",
        options: [
          { de: "(Catch his eye) A conta, se faz favor.", en: "(Catch his eye) The bill, please.", delta: 15, tag: "😊 Asked for the bill",
            react: "É para já.", reactEn: "Right away.", why: "In Portugal the bill usually comes only when you ask for it. Bringing it early could feel like rushing you out." },
          { de: "(Wait another half hour, getting annoyed)", en: "(Keep waiting and get annoyed)", delta: -3, tag: "😐 Waiting for nothing",
            react: "(He thinks you're enjoying your coffee.)", why: "He isn't ignoring you. He's letting you sit as long as you like." },
          { de: "(Shout across the room) Ó chefe! A conta!", en: "(Shout across the room) Hey, boss! The bill!", delta: -6, tag: "😬 Too loud",
            react: "Já vai, já vai…", reactEn: "Coming, coming…", why: "Ó chefe is heard in busy tascas, but shouting it across the room is a lot. A small wave and A conta, se faz favor work better." },
          { de: "(Decide they've forgotten and walk out)", en: "(Leave without paying)", delta: -18, tag: "😱 Did a runner",
            react: "Então?! Não pagou!", reactEn: "Hey! You haven't paid!", why: "The bill not coming doesn't mean it's free. Ask for it." },
        ],
      },
    ],
    more: "/cultura/food-and-meals",
  },
];

const arbeit = [
  {
    id: "kaffeekueche", place: "In the office kitchen", backdrop: "kueche",
    props: [{ icon: "2615", x: 20, y: 34 }, { icon: "1F370", x: 72, y: 36 }, { icon: "1F95B", x: 86, y: 30 }],
    people: [{ id: "lena", mascot: "regi", name: "Inês", role: "colleague",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "lena", situation: "Monday morning. Everyone in your team uses tu.",
        npc: "Bom dia! Então, que tal o fim de semana?", en: "Good morning! So, how was your weekend?",
        options: [
          { de: "Muito bom! Fui até à serra. E o teu?", en: "Very good! I went up to the hills. And yours?", delta: 15, tag: "😊 Asked back",
            react: "Que bom! Eu fui ao cinema.", reactEn: "How nice! I went to the cinema.", why: "A short answer and E o teu?: perfect small talk." },
          { de: "Bom.", en: "Good (and nothing more).", delta: -3, tag: "😐 Conversation over",
            react: "Ah… pronto.", reactEn: "Oh… OK.", why: "Polite, but the chat is over at once. One more sentence and E o teu? help." },
          { de: "Ui, nem me perguntes. O senhorio, as costas, o meu ex…", en: "Ugh, don't even ask. My landlord, my back, my ex…", delta: -8, tag: "😬 Too personal",
            react: "Ena… isso é muita coisa.", reactEn: "Wow… that's a lot.", why: "Small talk isn't therapy. Save your problems for friends." },
          { de: "E porque é que queres saber?", en: "And why do you want to know?", delta: -15, tag: "😱 Suspicious",
            react: "Hã… por nada.", reactEn: "Er… no reason.", why: "The question is only small talk, not a check on you." },
        ],
      },
      {
        who: "lena", npc: "Já agora, hoje faço anos. Trouxe um bolo, sirvam-se!", en: "By the way, it's my birthday today. I've brought a cake, help yourselves!",
        options: [
          { de: "Muitos parabéns! Foste tu que o fizeste?", en: "Happy birthday! Did you make it yourself?", delta: 14, tag: "😊 Congratulated",
            react: "Fui! É a receita da minha avó.", reactEn: "I did! It's my grandmother's recipe.", why: "In many Portuguese workplaces it's the birthday person who brings the cake. Parabéns! comes first." },
          { de: "Que bom aspeto! (Take a slice)", en: "That looks delicious! (Take a slice)", delta: 6, tag: "🙂 Polite",
            react: "Bom proveito!", reactEn: "Enjoy!", why: "Perfectly fine, but on a birthday a Parabéns! wouldn't hurt." },
          { de: "(Take three slices and wrap one up for later)", en: "(Take a lot of cake)", delta: -8, tag: "😬 Greedy",
            react: "Ah… é que é para todos.", reactEn: "Oh… it's for everyone.", why: "When someone brings something for everyone, you take one piece first." },
          { de: "Não. O açúcar é veneno, e tu também não devias comer.", en: "No. Sugar is poison, and you shouldn't eat it either.", delta: -13, tag: "😱 Lecturing",
            react: "Hã… só queria ser simpática.", reactEn: "Er… I was only trying to be nice.", why: "Saying no is fine, but without a lecture. Hoje não, mas parabéns! is enough." },
        ],
      },
      {
        who: "lena", wheel: 2, du: true, situation: "You're still in the kitchen with your coffee. What do you talk to Inês about?",
      },
    ],
    more: "/cultura/por-dentro/small-talk",
  },
  {
    id: "erster-tag", place: "First day at work", backdrop: "buero",
    props: [{ icon: "1F4BB", x: 22, y: 34 }, { icon: "1F4C8", x: 78, y: 20 }, { icon: "23F0", x: 50, y: 12 }],
    people: [{ id: "chefin", mascot: "bruno", name: "Marta Sousa", role: "your manager" }],
    turns: [
      {
        who: "chefin", situation: "Your first day in a new job. You arrive at 8:55; work starts at 9.",
        npc: "Bom dia! Começa hoje, não é? Sou a Marta Sousa.", en: "Good morning! You start today, don't you? I'm Marta Sousa.",
        options: [
          { de: "Bom dia! Sim, é o meu primeiro dia. Muito prazer. (Shake hands)", en: "Good morning! Yes, it's my first day. Pleased to meet you. (Shake hands)", delta: 15, tag: "😊 Great first impression",
            react: "Igualmente. Boas-vindas à equipa!", reactEn: "Likewise. Welcome to the team!", why: "Muito prazer and a handshake are safe at work. Later colleagues may greet with dois beijinhos (between women, or a man and a woman): follow the other person's lead." },
          { de: "(Nod and look at the floor)", en: "(Nod and look down)", delta: -4, tag: "😐 Unsure",
            react: "Calma, que aqui ninguém morde.", reactEn: "Relax, nobody bites here.", why: "Being shy is OK. One short sentence and eye contact come across as friendlier." },
          { de: "Então, chefe, tudo fixe?", en: "So, boss, all cool?", delta: -12, tag: "😬 Too casual",
            react: "Hã… tudo. E há trabalho para fazer.", reactEn: "Er… all fine. And there's work to do.", why: "Fixe (cool) and chefe are far too casual for your first minute with your new manager." },
          { de: "Sim. Já agora, a que horas saímos?", en: "Yes. By the way, what time do we finish?", delta: -14, tag: "😱 Wrong question",
            react: "Às seis. Mas primeiro vamos começar.", reactEn: "At six. But let's start first.", why: "Asking about home time on your first day sounds as if you want to leave already." },
        ],
      },
      {
        who: "chefin", npc: "Aqui tratamo-nos todos por tu, por isso trata-me por tu, está bem?", en: "We all use tu here, so use tu with me, OK?",
        options: [
          { de: "Combinado, Marta!", en: "Deal, Marta!", delta: 14, tag: "😊 Took the offer",
            react: "Ótimo. Anda, vou mostrar-te o escritório.", reactEn: "Great. Come on, I'll show you the office.", why: "In many offices, especially in tech and start-ups, colleagues use tu, even with the boss. When someone offers it, you take it. Banks, traditional firms and public services often stay formal much longer." },
          { de: "Com certeza. Como achares melhor, Marta.", en: "Certainly. Whatever you think best, Marta.", delta: 5, tag: "🙂 Stiff but right",
            react: "Também não sou assim tão séria, hã?", reactEn: "I'm not that serious, you know.", why: "It's correct. A simple Combinado! would sound less like talking to a general." },
          { de: "Sim, senhora doutora, como quiser.", en: "Yes, doctor, as you wish.", delta: -5, tag: "😐 Didn't listen",
            react: "Marta, a sério. Por tu.", reactEn: "Marta, really. Tu.", why: "Senhora doutora is a respectful address for a manager with a degree in many Portuguese workplaces. But once someone asks for tu, staying formal creates distance." },
          { de: "Fixe. Então, ó miúda, quantos dias de férias tenho?", en: "Cool. So, kid, how many days' holiday do I get?", delta: -12, tag: "😱 Went too far",
            react: "Por tu, disse eu. Não por miúda.", reactEn: "I said tu. Not “kid”.", why: "Tu doesn't make you best friends. Miúda (girl, kid) is for friends, not your manager on day one." },
        ],
      },
      {
        who: "chefin", npc: "Amanhã temos reunião de equipa às nove. Dá-te jeito?", en: "We have a team meeting at nine tomorrow. Does that suit you?",
        options: [
          { de: "Sim, claro. Às nove estou lá.", en: "Yes, of course. I'll be there at nine.", delta: 14, tag: "😊 On time",
            react: "Perfeito!", reactEn: "Perfect!", why: "Friends may arrive a little late, but at work and for appointments, on time means on time." },
          { de: "Posso chegar às nove e meia? É que o meu autocarro…", en: "Can I come at half past nine? It's just that my bus…", delta: 3, tag: "😐 Honest, but…",
            react: "Bem, se acontecer mais vezes, falamos.", reactEn: "Well, if it keeps happening, we'll talk about it.", why: "Honesty is good, and many workplaces are flexible, but it's not a strong start on day one." },
          { de: "Mais ou menos. De manhã não sou pessoa.", en: "More or less. I'm not human in the mornings.", delta: -6, tag: "😬 Unreliable",
            react: "Pois. Mas às nove é às nove.", reactEn: "Right. But nine means nine.", why: "It's a good joke for later, but with your new manager it just sounds unreliable." },
          { de: "Logo se vê.", en: "We'll see.", delta: -12, tag: "😱 Couldn't care less",
            react: "Desculpa?", reactEn: "Sorry?", why: "Logo se vê about a meeting with your manager sounds as if you don't care." },
        ],
      },
    ],
    more: "/cultura/por-dentro/time-and-timing",
  },
  {
    id: "meeting", place: "In the meeting", backdrop: "buero",
    props: [{ icon: "1F4CA", x: 50, y: 14 }, { icon: "1F4CB", x: 18, y: 38 }, { icon: "2615", x: 84, y: 40 }],
    people: [{ id: "jonas", mascot: "hamsti", name: "Pedro", role: "colleague" }],
    turns: [
      {
        who: "jonas", situation: "Team meeting. Pedro is presenting an idea.",
        npc: "A minha ideia é esta: a partir de agora, reunião de equipa às sete da manhã. O que é que acham?", en: "Here's my idea: from now on, team meetings at seven in the morning. What do you all think?",
        options: [
          { de: "Percebo a ideia, mas não sei se às sete dá jeito a todos. E às nove?", en: "I understand the idea, but I'm not sure seven suits everyone. What about nine?", delta: 16, tag: "😊 Honest and kind",
            react: "Hum, tens razão. Às nove também serve.", reactEn: "Hmm, you're right. Nine works too.", why: "Disagreement in Portuguese meetings is often soft and indirect: não sei se… with a reason and another suggestion says no without offending." },
          { de: "Hum, interessante.", en: "Hmm, interesting.", delta: -4, tag: "😐 Too vague",
            react: "Obrigado! Então fica assim.", reactEn: "Thanks! Then that's settled.", why: "If you're vague, people take it as a yes. Now the meeting is at seven." },
          { de: "(Say nothing and complain about it in the kitchen later)", en: "(Be quiet now, talk badly about it later)", delta: -12, tag: "😬 Behind his back",
            react: "(Pedro hears about it anyway.)", why: "Talking behind someone's back hurts the team. Disagree in the meeting instead." },
          { de: "É a ideia mais parva que já ouvi na vida.", en: "That's the stupidest idea I've ever heard.", delta: -16, tag: "😱 Far too harsh",
            react: "Ena. Obrigado.", reactEn: "Wow. Thanks.", why: "Direct is fine, hurtful isn't. Criticise the idea, not the person, and give a reason." },
        ],
      },
      {
        who: "jonas", situation: "After the meeting. His slides were very long and very colourful.",
        npc: "O que é que achaste da minha apresentação?", en: "What did you think of my presentation?",
        options: [
          { de: "O conteúdo estava muito bom. Eu talvez fizesse os diapositivos um bocadinho mais curtos.", en: "The content was very good. I might make the slides a bit shorter.", delta: 14, tag: "😊 Constructive",
            react: "Boa dica, obrigado.", reactEn: "Good tip, thanks.", why: "First the good part, then one clear tip: that kind of feedback is easy to accept." },
          { de: "Espetacular! Perfeita!", en: "Fantastic! Perfect!", delta: 4, tag: "😐 Too nice",
            react: "Sim? Então deixo-a assim.", reactEn: "Yes? Then I'll leave it as it is.", why: "Kindly meant, but he learns nothing. At work, honest feedback helps more." },
          { de: "Comprida demais, cores a mais, uma seca.", en: "Too long, too many colours, a bore.", delta: -12, tag: "😱 Brutal",
            react: "Pronto… essa doeu.", reactEn: "OK… that hurt.", why: "Criticism without a kind word or a tip sounds like an attack." },
        ],
      },
    ],
    more: "/cultura/por-dentro/directness",
  },
  {
    id: "feierabend", place: "After work", backdrop: "kneipe",
    props: [{ icon: "1F37A", x: 30, y: 40 }, { icon: "1F3B6", x: 78, y: 18 }, { icon: "1F964", x: 66, y: 42 }],
    people: [{ id: "becker", mascot: "bruno", name: "Gonçalo", role: "colleague from accounts",
      talk: { likes: ["urlaub", "wochenende"], dislikes: ["wetter"], taboo: ["gehalt", "politik", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "becker", situation: "Friday, half past six. You don't know Gonçalo very well yet.",
        npc: "Pronto, semana despachada! Vamos beber uma imperial?", en: "Right, that's the week done! Shall we have a beer?",
        options: [
          { de: "Bora! Mas eu bebo um sumo.", en: "Let's go! But I'll have a juice.", delta: 14, tag: "😊 In, your way",
            react: "Claro, sem problema!", reactEn: "Sure, no problem!", why: "Coming along is what counts. Nobody has to drink alcohol: a sumo or an imperial sem álcool is completely normal. (A small draught beer is an imperial in Lisbon and a fino in Porto.)" },
          { de: "Hoje não posso, mas para a próxima conta comigo.", en: "I can't today, but count me in next time.", delta: 8, tag: "🙂 Kind no",
            react: "Combinado, fica para a próxima!", reactEn: "Deal, next time then!", why: "A friendly no with para a próxima is perfectly fine." },
          { de: "Só se fores tu a pagar.", en: "Only if you're paying.", delta: -3, tag: "😐 Cheeky joke",
            react: "Ah, ah… logo se vê.", reactEn: "Ha… we'll see.", why: "A joke. But in a group, people often take turns to pay, or each pays their own." },
          { de: "Não, eu não saio com colegas.", en: "No, I don't go out with colleagues.", delta: -6, tag: "😬 Cold",
            react: "Ah. Pronto.", reactEn: "Oh. Fine.", why: "Saying no is fine, but this sounds as if you don't like your colleagues." },
        ],
      },
      {
        who: "becker", situation: "In the café round the corner.",
        npc: "Então, que tal? Estás a gostar disto?", en: "So, how's it going? Are you enjoying it here?",
        options: [
          { de: "Muito! A equipa é muito simpática. E tu, há quanto tempo estás cá?", en: "A lot! The team is really nice. And how long have you been here?", delta: 14, tag: "😊 Asked back",
            react: "Doze anos! Nem parece.", reactEn: "Twelve years! Hard to believe.", why: "Say something positive and ask back: good after-work talk." },
          { de: "Bem. Já agora, o que é que achas do Governo?", en: "Good. By the way, what do you think of the government?", delta: -6, tag: "😬 Risky topic",
            react: "Ui… hoje não.", reactEn: "Ugh… not today.", why: "You can talk about politics, but over the first drink with a colleague it's risky." },
          { de: "Não é mau. Se bem que a chefe é um bocado parva, não é?", en: "Not bad. Though the boss is a bit of an idiot, isn't she?", delta: -12, tag: "😬 Gossip",
            react: "Hum. Não ouvi nada.", reactEn: "Hmm. I didn't hear that.", why: "Gossiping about your manager when you're new? Word gets around fast." },
          { de: "Bem. Diz lá, quanto é que ganhas?", en: "Good. Go on, how much do you earn?", delta: -14, tag: "😱 Pay question",
            react: "Isso… fica para mim.", reactEn: "That's… something I'll keep to myself.", why: "Many people don't ask colleagues about their pay: they find it too private." },
        ],
      },
      {
        who: "becker", situation: "Gonçalo comes back from the counter with the drinks.",
        npc: "Toma. Saúde!", en: "Here you go. Cheers!",
        options: [
          { de: "Saúde! A próxima pago eu.", en: "Cheers! I'll get the next one.", delta: 14, tag: "😊 Knows about rounds",
            react: "Isso mesmo!", reactEn: "That's the spirit!", why: "Friends and colleagues often take turns paying a rodada (round). A próxima pago eu is the right move." },
          { de: "Saúde! Quanto é que te devo?", en: "Cheers! How much do I owe you?", delta: 6, tag: "🙂 Fair",
            react: "Nada, nada. Pagas a próxima.", reactEn: "Nothing at all. You get the next one.", why: "Fair and polite. In a group, though, people usually just pay the next round." },
          { de: "(Drink it and say nothing)", en: "(Just drink)", delta: -5, tag: "😐 No thanks",
            react: "(He waits a moment.)", why: "A quick Saúde! is part of it." },
          { de: "(Drink it and go home before your round)", en: "(Leave before you have to pay)", delta: -14, tag: "😱 Skipped your round",
            react: "(Gonçalo notices. Everyone notices.)", why: "Leaving just before it's your turn to pay is a famous sin." },
        ],
      },
      {
        who: "becker", wheel: 1, du: true, situation: "Gonçalo sips his imperial. Now it's your turn to pick a topic.",
      },
    ],
    more: "/cultura/cafes-and-paying",
  },
];

const zuhause = [
  {
    id: "neue-nachbarin", place: "On the stairs", backdrop: "treppenhaus",
    props: [{ icon: "1F4EC", x: 16, y: 34 }, { icon: "1F6AA", x: 84, y: 22 }, { icon: "1F6CD", x: 62, y: 66 }],
    people: [{ id: "schulz", mascot: "regi", name: "Dona Lurdes", role: "older neighbour",
      talk: { likes: ["wetter", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } }],
    turns: [
      {
        who: "schulz", situation: "You've just moved into a block of flats. On the stairs you meet an older woman with shopping bags.",
        npc: "Boa tarde. Agora mora cá?", en: "Good afternoon. Do you live here now?",
        options: [
          { de: "Moro, boa tarde. Mudei-me agora para o segundo direito. E a senhora?", en: "I do, good afternoon. I've just moved into the second floor, right. And you?", delta: 15, tag: "😊 Introduced yourself",
            react: "Eu sou a Lurdes, do terceiro esquerdo. Aqui toda a gente me chama Dona Lurdes.", reactEn: "I'm Lurdes, from the third floor, left. Everyone here calls me Dona Lurdes.", why: "She spoke formally, so you did too: a senhora is the polite “you” for an older woman. Flats go by floor and side: segundo direito = second floor, right-hand door." },
          { de: "Moro! Quer ajuda com os sacos?", en: "I do! Would you like help with the bags?", delta: 8, tag: "🙂 Helpful",
            react: "Ai, que simpatia, mas eu consigo.", reactEn: "Oh, how kind, but I can manage.", why: "Offering help is kind, and Quer ajuda? is the right formal question. You can still say who you are." },
          { de: "Moro. Isto aqui é barulhento? As paredes parecem finas.", en: "I do. Is it noisy here? The walls look thin.", delta: -3, tag: "😐 Started with a moan",
            react: "Bem, não é assim tanto.", reactEn: "Well, not that bad.", why: "Starting with criticism of the building doesn't feel very friendly." },
          { de: "Moro. E tu, quem és, querida?", en: "I do. And who are you, dear?", delta: -8, tag: "😬 Too familiar",
            react: "Querida? Olhe que eu já tenho netos.", reactEn: "Dear? I'll have you know I've got grandchildren.", why: "Tu and querida with an older neighbour who spoke formally to you is far too familiar." },
        ],
      },
      {
        who: "schulz", situation: "Three days later you meet her by the letter boxes.",
        npc: "Olá! Então, já se está a ambientar?", en: "Hello! So, are you settling in?",
        options: [
          { de: "Olá, Dona Lurdes! Estou, sim. Gosto muito de cá estar.", en: "Hello, Dona Lurdes! I am, yes. I really like it here.", delta: 15, tag: "😊 Remembered her name",
            react: "Olhe, lembrou-se do meu nome!", reactEn: "Well, you remembered my name!", why: "Greeting people by name shows you listened. Dona + first name is the warm, respectful way to address an older woman in Portugal." },
          { de: "Estou, sim! Desculpe, qual era o seu nome? Os nomes fogem-me.", en: "I am, yes! Sorry, what was your name? Names slip my mind.", delta: 8, tag: "🙂 Honest",
            react: "Lurdes. Não faz mal!", reactEn: "Lurdes. Never mind!", why: "Asking again honestly is much better than using the wrong name." },
          { de: "Olá… Dona… Lucinda?", en: "Hello… Dona… Lucinda?", delta: -4, tag: "😐 Wrong name",
            react: "Lurdes. Mas não faz mal.", reactEn: "Lurdes. But never mind.", why: "That happens to everyone. Better: ask again honestly." },
          { de: "Mais ou menos. Quem é que põe o rádio tão alto às seis da manhã?", en: "So-so. Who plays the radio so loud at six in the morning?", delta: -8, tag: "😬 Complaint, not a hello",
            react: "Ai… pois sou eu. Desculpe.", reactEn: "Oh… that's me. Sorry.", why: "You can mention a problem, but not as the answer to a friendly hello." },
        ],
      },
      {
        who: "schulz", wheel: 1, situation: "Dona Lurdes stays by the letter boxes. She seems to have time for a chat. She still speaks formally, and so do you.",
      },
    ],
    more: "/cultura/tu-or-o-senhor",
  },
  {
    id: "paket", place: "At your front door", backdrop: "wohnungstuer",
    props: [{ icon: "1F4E6", x: 74, y: 60 }, { icon: "1F6AA", x: 18, y: 18 }, { icon: "1F514", x: 34, y: 30 }],
    people: [{ id: "koch", mascot: "bruno", name: "Tiago", role: "next-door neighbour" }],
    turns: [
      {
        who: "koch", situation: "The doorbell rings. Your neighbour, about your age, is at the door.",
        npc: "Desculpa incomodar. Podes ficar-me com uma encomenda hoje? Só volto à noite.", en: "Sorry to bother you. Could you take in a parcel for me today? I won't be back until tonight.",
        options: [
          { de: "Claro, sem problema! Hoje estou em casa o dia todo.", en: "Of course, no problem! I'm at home all day today.", delta: 14, tag: "😊 Good neighbour",
            react: "Boa, muito obrigado!", reactEn: "Great, thanks very much!", why: "Taking in parcels for neighbours is a normal small favour." },
          { de: "Desculpa, hoje também não estou. Porque não perguntas à Dona Lurdes?", en: "Sorry, I'm out today as well. Why don't you ask Dona Lurdes?", delta: 6, tag: "🙂 Honest no",
            react: "Boa ideia, obrigado.", reactEn: "Good idea, thanks.", why: "Saying no is fine, and with a tip it's really kind." },
          { de: "E o que é que tem lá dentro?", en: "And what's inside?", delta: -6, tag: "😬 Nosy",
            react: "Hã… livros. Interessa?", reactEn: "Er… books. Does it matter?", why: "What's in the parcel is none of your business. Yes or no is enough." },
          { de: "E eu ganho o quê com isso?", en: "And what do I get out of it?", delta: -12, tag: "😱 Business deal",
            react: "… Peço a outra pessoa.", reactEn: "… I'll ask someone else.", why: "Taking in a parcel is a small favour between neighbours, not a business deal." },
        ],
      },
      {
        who: "koch", situation: "In the evening Tiago rings again, with a plastic box.",
        npc: "Obrigado outra vez! Toma, uns pastéis de bacalhau feitos por mim.", en: "Thanks again! Here you are, some codfish cakes I made myself.",
        options: [
          { de: "Que bom aspeto! Não era preciso, a sério. Depois devolvo-te a caixa.", en: "They look delicious! You really didn't need to. I'll give you the box back later.", delta: 14, tag: "😊 Modest thanks",
            react: "Sem pressa, sem pressa. Boa noite!", reactEn: "No rush at all. Good night!", why: "Não era preciso (you didn't have to) is the classic answer to a small present. And a box always goes back to its owner, often with something inside." },
          { de: "Que simpatia! Se precisares de alguma coisa, é só dizer.", en: "How kind! If you need anything, just say.", delta: 8, tag: "🙂 Friendly",
            react: "Assim dá gosto ter vizinhos!", reactEn: "Neighbours like this make it all worth it!", why: "Short, friendly, all correct." },
          { de: "(Take the box and close the door)", en: "(Take it without a word and shut the door)", delta: -6, tag: "😬 Silent",
            react: "(He stands at the door for a moment.)", why: "A quick word of thanks is part of it." },
          { de: "Só pastéis? Eu preferia vinho.", en: "Just codfish cakes? I'd rather have wine.", delta: -14, tag: "😱 Ungrateful",
            react: "Ah. Pronto… boa noite.", reactEn: "Oh. OK… good night.", why: "You don't comment on a present. You just say thank you." },
        ],
      },
    ],
    more: "/cultura/por-dentro/please-and-thank-you",
  },
  {
    id: "party", place: "Your party", backdrop: "party",
    props: [{ icon: "1F389", x: 20, y: 14 }, { icon: "1F3B6", x: 50, y: 10 }, { icon: "1F382", x: 82, y: 40 }],
    people: [{ id: "wolf", mascot: "hamsti", name: "Senhor Moreira", role: "downstairs neighbour" }],
    turns: [
      {
        who: "wolf", situation: "Saturday, half past midnight. Your birthday party is loud. The doorbell rings.",
        npc: "Boa noite. Já passa da meia-noite, e amanhã entro cedo.", en: "Good evening. It's past midnight, and I start work early tomorrow.",
        options: [
          { de: "Ai, peço imensa desculpa! Vamos já baixar a música.", en: "Oh, I'm so sorry! We'll turn the music down right away.", delta: 16, tag: "😊 Understanding",
            react: "Obrigado, agradeço.", reactEn: "Thanks, I appreciate it.", why: "Neighbours need to sleep, and late-night noise is restricted in Portugal, from about 11 pm. Saying sorry and turning it down is the best answer." },
          { de: "Porque não entra e bebe um copo connosco?", en: "Why don't you come in and have a drink with us?", delta: 6, tag: "🙂 Charming, but…",
            react: "Muito amável, mas eu quero é dormir.", reactEn: "Very kind, but what I want is sleep.", why: "A warm idea, and nice! But the music still has to go down." },
          { de: "É sábado! As pessoas têm direito a divertir-se.", en: "It's Saturday! People have a right to have fun.", delta: -12, tag: "😱 Argued",
            react: "Ao sábado também se dorme.", reactEn: "People sleep on Saturdays too.", why: "Night noise bothers neighbours on any day of the week." },
          { de: "(Close the door and carry on partying)", en: "(Ignore him and keep the music loud)", delta: -18, tag: "😱 Ignored",
            react: "(An hour later the police ring the bell.)", why: "If you ignore a noise complaint at night, neighbours can call the police (PSP in cities, GNR elsewhere), and the condomínio (the owners' association) may hear about it too." },
        ],
      },
      {
        who: "wolf", situation: "The next morning on the stairs. Senhor Moreira looks tired.",
        npc: "Bom dia.", en: "Good morning.",
        options: [
          { de: "Bom dia! Desculpe mais uma vez pelo barulho de ontem.", en: "Good morning! Sorry again about the noise last night.", delta: 14, tag: "😊 Made it right",
            react: "Não faz mal. Obrigado por ter baixado a música.", reactEn: "It's all right. Thanks for turning the music down.", why: "A second short apology shows it really matters to you." },
          { de: "Bom dia.", en: "Good morning (and nothing more).", delta: 3, tag: "😐 Neutral",
            react: "(He nods.)", why: "Not wrong. A word about last night would have helped." },
          { de: "(Pretend you haven't seen him)", en: "(Look away)", delta: -6, tag: "😬 Avoided him",
            react: "(He shakes his head.)", why: "Avoiding him makes it worse. A greeting and one sentence help." },
          { de: "Ontem também não foi assim tão mau, pois não?", en: "It wasn't that bad last night, was it?", delta: -8, tag: "😬 Played it down",
            react: "Foi, foi. Quase não dormi.", reactEn: "It was. I hardly slept.", why: "The person who was disturbed decides whether it was bad, not you." },
        ],
      },
    ],
    more: "/cultura/por-dentro/please-and-thank-you",
  },
  {
    id: "einladung", place: "Invited for dinner", backdrop: "esszimmer",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "1F56F", x: 30, y: 46 }, { icon: "1F337", x: 76, y: 36 }],
    people: [
      { id: "sara", mascot: "quaki", name: "Rita", role: "neighbour and friend" },
      { id: "lucia", mascot: "regi", name: "Joana", role: "Rita's friend" },
    ],
    turns: [
      {
        who: "sara", situation: "Rita from the third floor has invited you for dinner at eight. You ring at ten past.",
        npc: "Olá! Que bom que vieste! Entra, entra!", en: "Hi! I'm so glad you came! Come in, come in!",
        options: [
          { de: "Olá! Que convite tão simpático. Toma, trouxe uma garrafa de vinho.", en: "Hi! What a lovely invitation. Here, I've brought a bottle of wine.", delta: 15, tag: "😊 Brought something",
            react: "Ai, não era preciso!", reactEn: "Oh, you didn't need to!", why: "Many people bring something small: wine, a dessert, chocolates or flowers. And ten minutes late is fine at a friend's home." },
          { de: "Olá! Tiro os sapatos?", en: "Hi! Shall I take my shoes off?", delta: 8, tag: "🙂 Thoughtful",
            react: "Não, não, como quiseres.", reactEn: "No, no, as you like.", why: "In most Portuguese homes guests keep their shoes on, but asking is always fine." },
          { de: "Olá! O que é que há para o jantar? Estou a morrer de fome!", en: "Hi! What's for dinner? I'm starving!", delta: -4, tag: "😐 Straight to the food",
            react: "Ah, ah, já vai! Entra primeiro.", reactEn: "Ha, it's coming! Come in first.", why: "First say hello and something nice, then talk about food." },
          { de: "Olá! Não trouxe nada, afinal tu tens tudo.", en: "Hi! I haven't brought anything; you've got everything anyway.", delta: -12, tag: "😱 Empty-handed",
            react: "Hã… pronto. Entra.", reactEn: "Er… well. Come in.", why: "Coming empty-handed isn't terrible. Saying it like that is." },
        ],
      },
      {
        who: "lucia", situation: "In the living room Rita says “Esta é a Joana”. Joana smiles and leans towards you.",
        npc: "Olá! Tudo bem?", en: "Hi! How are you?",
        options: [
          { de: "(Two kisses: cheek to cheek, one side, then the other) Olá! Muito prazer.", en: "(Two kisses: cheek to cheek, one side, then the other) Hi! Nice to meet you.", delta: 14, tag: "😊 Dois beijinhos",
            react: "Igualmente!", reactEn: "Likewise!", why: "Dois beijinhos are the usual greeting when a friend introduces you to a woman (between men it's more often a handshake). Cheeks touch and the kiss is mostly in the air." },
          { de: "(Smile and hold out your hand) Olá! Muito prazer.", en: "(Smile and hold out your hand) Hi! Nice to meet you.", delta: 8, tag: "🙂 A handshake",
            react: "Igualmente! (She shakes your hand.)", reactEn: "Likewise!", why: "If you'd rather not kiss, for any reason, a handshake and a smile are always fine." },
          { de: "(Plant a loud, wet kiss on her cheek)", en: "(Give her a real kiss on the cheek)", delta: -5, tag: "😐 Real kiss",
            react: "Ui! Olá…", reactEn: "Oh! Hi…", why: "With beijinhos, lips don't really land on the cheek. It's a touch of the cheeks." },
          { de: "(Jump back) Ei! O que é que estás a fazer?", en: "(Jump back) Hey! What are you doing?", delta: -12, tag: "😱 Alarm",
            react: "Desculpa… só te ia cumprimentar.", reactEn: "Sorry… I was only going to say hello.", why: "You don't have to kiss anyone, but no alarm is needed: hold out your hand with a smile and people will follow." },
        ],
      },
      {
        who: "sara", situation: "She's made chicken with a lot of piri-piri. It's far too hot for you.",
        npc: "Então? O que é que achas da minha receita nova?", en: "So? What do you think of my new recipe?",
        options: [
          { de: "Uau, que original! E que picante.", en: "Wow, how original! And so spicy.", delta: 12, tag: "😊 Polite white lie",
            react: "Não é? Adoro experimentar coisas.", reactEn: "Isn't it? I love trying things out.", why: "A polite half-truth protects the host's feelings. And original is even true." },
          { de: "A verdade é que pica demais para mim. Mas adoro a ideia!", en: "To be honest, it's too hot for me. But I love the idea!", delta: 8, tag: "🙂 Honest and kind",
            react: "Ai! Para a próxima, menos piri-piri.", reactEn: "Oh no! Less piri-piri next time.", why: "You can be honest and kind, with a nice word added." },
          { de: "Credo. Há pão?", en: "Yuck. Is there any bread?", delta: -15, tag: "😱 Too honest",
            react: "… Há. Na cozinha.", reactEn: "… There is. In the kitchen.", why: "Honesty is good, but not like that. Rita made an effort." },
          { de: "(Secretly tip the chicken into the plant pot)", en: "(Hide the food in a flowerpot)", delta: -18, tag: "😱 Caught",
            react: "Mas… o que é que estás a fazer?", reactEn: "But… what are you doing?", why: "Getting rid of it in secret? If she finds out, it's much more embarrassing than an honest word." },
        ],
      },
      {
        who: "sara", npc: "Anda lá, só mais um bocadinho? Há imenso!", en: "Come on, just a little bit more? There's loads!",
        options: [
          { de: "Não consigo mesmo, a sério, já não me cabe nada! Estava tudo ótimo.", en: "I really can't, honestly, I couldn't fit another bite! It was all delicious.", delta: 14, tag: "😊 Saved it nicely",
            react: "Ai, ainda bem!", reactEn: "Oh, I'm glad!", why: "Hosts often insist, and it's kind, not pushy. Não consigo mesmo, a sério, with a compliment, is the way out." },
          { de: "Quero, se faz favor!", en: "Yes, please!", delta: 3, tag: "😐 Brave",
            react: "Boa! Toma, mais um prato cheio!", reactEn: "Great! Here, another full plate!", why: "Very polite, but now you have to eat a second plate." },
          { de: "Não.", en: "No (and nothing more).", delta: -6, tag: "😬 Blunt",
            react: "Ah. Pronto.", reactEn: "Oh. OK.", why: "Não, a sério, estou bem with a kind word sounds much friendlier." },
        ],
      },
      {
        who: "sara", situation: "It's half past ten and dinner is over. Nobody is getting up.",
        npc: "Um café? Assim ficamos aqui mais um bocado à conversa.", en: "A coffee? Then we can sit and chat a bit longer.",
        options: [
          { de: "Claro! Um café, se faz favor. Olha, e onde é que aprendeste esta receita?", en: "Of course! A coffee, please. Hey, where did you learn this recipe?", delta: 14, tag: "😊 Stayed to chat",
            react: "Ui, isso é uma longa história!", reactEn: "Oh, that's a long story!", why: "Staying at the table to talk after the meal is often the best part. Careful: in Portuguese sobremesa means dessert, not the chat afterwards." },
          { de: "Um bocadinho, sim, mas amanhã levanto-me cedo. Às onze vou andando.", en: "For a little while, yes, but I've got an early start. I'll head off at eleven.", delta: 6, tag: "🙂 Fair",
            react: "Está bem, está bem, sem problema.", reactEn: "OK, OK, no problem.", why: "Saying you have to get up early is a perfectly good reason to leave." },
          { de: "Não, deixa estar. Já jantei, por isso vou indo.", en: "No, don't bother. I've had dinner, so I'm off.", delta: -12, tag: "😱 Ate and ran",
            react: "Ah… pronto. Então, adeus.", reactEn: "Oh… well. Bye, then.", why: "Leaving as soon as the plates are empty sounds as if you only came for the food." },
        ],
      },
    ],
    more: "/cultura/greetings",
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
        npc: "Olá! Finalmente!", en: "Hi! At last!",
        options: [
          { de: "Olá! Que bom conhecer-te em pessoa!", en: "Hi! How nice to meet you in person!", delta: 15, tag: "😊 Warm",
            react: "Digo o mesmo!", reactEn: "Same here!", why: "Friendly and honest, without comparing Alex to any photos." },
          { de: "Olá! Dois beijinhos ou um aperto de mão?", en: "Hi! Two kisses, or a handshake?", delta: 8, tag: "🙂 Asked",
            react: "Ah, ah, dois beijinhos!", reactEn: "Ha, two kisses!", why: "Asking is never wrong. Many people even find it charming." },
          { de: "(Give a big hug straight away)", en: "(Hug tightly at once)", delta: -6, tag: "😬 Too fast",
            react: "Ui! … Olá.", reactEn: "Oh! … Hi.", why: "Beijinhos are common, but a big hug is for people you know. Better to wait or ask." },
          { de: "Olá! Nas fotos parecias outra pessoa.", en: "Hi! In your photos you looked like a different person.", delta: -16, tag: "😱 Photo comparison",
            react: "… Ah, sim?", reactEn: "… Oh, really?", why: "A comment on looks as your first words? Then the evening is over after ten seconds." },
        ],
      },
      {
        who: "alex", situation: "You sit down at a table. The waiter comes over: “O que é que vai ser?” Alex looks at you.",
        options: [
          { de: "Olá, para mim é um galão, se faz favor.", en: "Hello, a galão for me, please.", delta: 14, tag: "😊 Nice to the staff",
            react: "(Alex smiles.) Para mim também, se faz favor.", reactEn: "The same for me, please.", why: "Your date notices at once how you speak to the staff. A galão is milky coffee in a glass; um café (in Lisbon also uma bica) is a short espresso." },
          { de: "Escolhe tu por mim, eu nunca sei o que quero.", en: "You choose for me, I never know what I want.", delta: 3, tag: "😐 Can't decide",
            react: "Hã, está bem… dois cafés?", reactEn: "Er, OK… two coffees?", why: "Not terrible, but making a choice comes across as more confident." },
          { de: "(Keep looking at your phone and just point at the menu)", en: "(Look at your phone, point at the menu)", delta: -8, tag: "😬 Not really there",
            react: "(Alex looks at their phone too.)", why: "Your phone isn't your date. Look at the people you're talking to." },
          { de: "(Click your fingers) Ó amigo! Um café!", en: "(Click your fingers) Hey, mate! A coffee!", delta: -16, tag: "😱 Finger clicking",
            react: "(Alex looks away, embarrassed.)", why: "How you speak to staff says a lot about you, and clicking your fingers is a big no." },
        ],
      },
    ],
    more: "/cultura/por-dentro/dating",
  },
  {
    id: "date-smalltalk", place: "In the café", backdrop: "cafe",
    props: [{ icon: "2615", x: 40, y: 52 }, { icon: "1F370", x: 60, y: 52 }, { icon: "1F56F", x: 84, y: 30 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "alex", npc: "Então conta lá, o que é que fazes quando não estás a trabalhar?", en: "So tell me, what do you do when you're not working?",
        options: [
          { de: "Adoro cozinhar, e faço muitas caminhadas. E tu?", en: "I love cooking, and I go walking a lot. And you?", delta: 15, tag: "😊 Asked back",
            react: "Caminhadas? Eu também! Por onde é que costumas ir?", reactEn: "Walking? Me too! Where do you usually go?", why: "Tell them something about you and ask back: that's how a real conversation starts." },
          { de: "Pouca coisa. Trabalhar, dormir.", en: "Not much. Work, sleep.", delta: -4, tag: "😐 Conversation over",
            react: "Ah… está bem.", reactEn: "Oh… OK.", why: "Give your date something to talk about." },
          { de: "Bem, é uma longa história… (20 minutes about your car)", en: "Well, it's a long story… (Talk only about yourself for a long time)", delta: -12, tag: "😱 Monologue",
            react: "(Alex is counting the floor tiles.)", why: "A conversation goes both ways. After two minutes, ask a question!" },
          { de: "A minha ex dizia sempre que eu não tinha passatempos.", en: "My ex always said I had no hobbies.", delta: -14, tag: "😱 The ex",
            react: "Ah… pois.", reactEn: "Oh… right.", why: "Your ex stays at home on a first date. Always." },
        ],
      },
      {
        who: "alex", npc: "Já agora, eu trabalho em enfermagem. No hospital.", en: "I work in nursing, by the way. At the hospital.",
        options: [
          { de: "Ena, deve ser duro. De que é que gostas mais?", en: "Wow, that must be hard. What do you like most about it?", delta: 14, tag: "😊 Interested",
            react: "Das pessoas! Cada dia é diferente.", reactEn: "The people! Every day is different.", why: "Real interest in the person is the best compliment." },
          { de: "Que bom.", en: "How nice (and nothing more).", delta: 3, tag: "😐 Short",
            react: "Pois… e tu?", reactEn: "Yes… and you?", why: "Friendly, but a question shows more interest." },
          { de: "Num hospital? Ui, eu nunca lá trabalharia.", en: "In a hospital? Ugh, I'd never work there.", delta: -12, tag: "😬 Put it down",
            react: "Ainda bem que há outras pessoas, então.", reactEn: "Good thing there are other people, then.", why: "Putting down your date's job is a quick way to end the evening." },
          { de: "E quanto é que te pagam por isso?", en: "And how much do they pay you for that?", delta: -14, tag: "😱 Pay question",
            react: "Isso… não é tema para um primeiro encontro.", reactEn: "That's… not a first-date topic.", why: "Money isn't a first-date topic. Many people find it awkward even with friends." },
        ],
      },
      {
        who: "alex", wheel: 2, du: true, situation: "Your cups are empty, but you don't want to leave yet. What do you talk about?",
      },
      {
        who: "alex", situation: "You're laughing a lot. You want to pay Alex a compliment.",
        options: [
          { de: "Adoro a maneira como te ris.", en: "I love the way you laugh.", delta: 14, tag: "😊 Charming",
            react: "Ai, que coisa bonita de se dizer!", reactEn: "Oh, what a lovely thing to say!", why: "A compliment about someone's laugh or humour is personal, but not too much." },
          { de: "Tens muito bom gosto para música.", en: "You've got really good taste in music.", delta: 8, tag: "🙂 Nice",
            react: "A sério? Podíamos ir a um concerto.", reactEn: "Really? We could go to a concert.", why: "A compliment about someone's interests is safe and friendly." },
          { de: "Gosto muito mais de ti do que estava à espera.", en: "I like you much more than I expected.", delta: -6, tag: "😬 Own goal",
            react: "E estavas à espera de quê?", reactEn: "And what were you expecting?", why: "A compliment sounds much better without do que estava à espera." },
          { de: "Isto é amor! Casamos?", en: "This is love! Shall we get married?", delta: -12, tag: "😱 Way too much",
            react: "Hã… conhecemo-nos há uma hora.", reactEn: "Er… we met an hour ago.", why: "That much feeling is too fast for a first date, even as a joke." },
        ],
      },
    ],
    more: "/cultura/por-dentro/dating",
  },
  {
    id: "date-rechnung", place: "The bill", backdrop: "cafe",
    props: [{ icon: "1F9FE", x: 50, y: 52 }, { icon: "1F4B3", x: 30, y: 54 }, { icon: "1F4B6", x: 72, y: 50 }],
    people: [
      { id: "alex", mascot: "quaki", name: "Alex", role: "your date" },
      { id: "kellner", mascot: "hamsti", name: "Nuno", role: "waiter" },
    ],
    turns: [
      {
        who: "kellner", npc: "É tudo junto ou separado?", en: "All together, or separately?",
        options: [
          { de: "Se quiseres, pago eu. Ou preferes dividir?", en: "If you like, I'll pay. Or would you rather split it?", delta: 15, tag: "😊 Offered, didn't decide", by: "alex",
            react: "Que gentileza! Então a próxima pago eu.", reactEn: "How thoughtful! Then I'll pay next time.", why: "Pago eu means “I'm paying”. Offering and asking is fair, and splitting (dividir, or cada um paga o seu) is normal too." },
          { de: "Separado, se faz favor.", en: "Separately, please.", delta: 6, tag: "🙂 Perfectly normal", by: "alex",
            react: "Está bem, cada um paga o seu.", reactEn: "OK, we each pay our own.", why: "Paying separately is normal. A quick look at your date first would be even nicer." },
          { de: "Separado. Tu comeste a tarte de 4,50 e eu a de 4,20, por isso deves-me 30 cêntimos.", en: "Separately. You had the €4.50 tart and I had the €4.20 one, so you owe me 30 cents.", delta: -12, tag: "😱 Penny counter", by: "alex",
            react: "… Toma lá os teus 30 cêntimos.", reactEn: "… Here are your 30 cents.", why: "Splitting is normal. Counting every cent isn't attractive." },
          { de: "(Pretend you're looking for your wallet)", en: "(Act as if you can't find your money)", delta: -16, tag: "😱 The old trick", by: "alex",
            react: "Deixa… pago eu.", reactEn: "Forget it… I'll pay.", why: "Everyone knows that trick. Saying honestly what you can afford is much better." },
        ],
      },
      {
        who: "kellner", npc: "São 14,40 no total. Quer contribuinte na fatura?", en: "That's €14.40 in total. Do you want your tax number on the receipt?",
        options: [
          { de: "Não é preciso. Tome 15 e fique com o troco.", en: "No need. Here's 15, keep the change.", delta: 12, tag: "😊 Rounded up",
            react: "Muito obrigado! Boa noite.", reactEn: "Thank you very much! Good evening.", why: "A tip isn't required in Portugal. Rounding up or leaving a few coins is a small thank you for good service." },
          { de: "Quero, se faz favor. E pago com cartão.", en: "Yes, please. And I'll pay by card.", delta: 8, tag: "🙂 Perfectly normal",
            react: "Com certeza. Diga-me o número.", reactEn: "Certainly. Tell me the number.", why: "Contribuinte means your NIF, your tax number. Many residents put it on receipts because some spending counts on their tax return. Saying no is fine too, and paying by card is normal." },
          { de: "(Leave a five-cent coin and look at it proudly)", en: "(Make a show of leaving a tiny tip)", delta: -4, tag: "😐 Tiny show",
            react: "Obrigado… acho eu.", reactEn: "Thanks… I suppose.", why: "No tip is fine, and so is a small one. Making a show of it is odd." },
          { de: "Gorjeta? Mas já lhe pagam um ordenado!", en: "A tip? You already get a wage!", delta: -12, tag: "😱 Stingy",
            react: "Pois claro. Boa noite.", reactEn: "Of course. Good evening.", why: "Tipping isn't a must, but nobody asked, and saying it like that is rude, in front of your date too." },
        ],
      },
    ],
    more: "/cultura/por-dentro/paying-the-bill",
  },
  {
    id: "date-tschuess", place: "Saying goodbye", backdrop: "abend",
    props: [{ icon: "1F319", x: 82, y: 12 }, { icon: "1F6B2", x: 16, y: 50 }, { icon: "1F306", x: 50, y: 8 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "your date" }],
    turns: [
      {
        who: "alex", npc: "Diverti-me imenso, mas tenho de ir.", en: "I've had a great time, but I have to go.",
        options: [
          { de: "Eu também! Apetece-te repetir um dia destes?", en: "Me too! Do you fancy doing it again some time?", delta: 14, tag: "😊 Asked openly",
            react: "Talvez… eu mando-te mensagem!", reactEn: "Maybe… I'll message you!", why: "Asking in a friendly way is brave and fair. Alex decides the answer." },
          { de: "Se quiseres, acompanho-te à estação.", en: "I'll walk you to the station, if you like.", delta: 8, tag: "🙂 Thoughtful",
            react: "Pode ser!", reactEn: "Sure!", why: "A kind offer, and se quiseres takes the pressure off." },
          { de: "Pronto, adeus.", en: "OK, bye.", delta: -4, tag: "😐 Cool",
            react: "Adeus…", reactEn: "Bye…", why: "One sentence about the evening shows you enjoyed it." },
          { de: "Já? Anda lá a minha casa!", en: "Already? Come back to my place!", delta: -14, tag: "😱 Too much pressure",
            react: "Não. Vou-me embora já.", reactEn: "No. I'm leaving now.", why: "After a first date that's too soon. And no means no." },
        ],
      },
      {
        who: "alex", situation: "Two days later a message from Alex arrives.",
        npc: "Olha, achei-te muita piada, mas acho que não há química. Felicidades!", en: "Look, I really enjoyed your company, but I don't think there's any chemistry. All the best!",
        options: [
          { de: "Que pena, mas agradeço a sinceridade. Felicidades para ti também!", en: "What a shame, but thanks for being honest. All the best to you too!", delta: 16, tag: "😊 Respectful",
            react: "Muito amável da tua parte.", reactEn: "That's very kind of you.", why: "Accepting a no and answering kindly: that's how to treat each other with respect." },
          { de: "(Don't reply at all)", en: "(Send no answer)", delta: -4, tag: "😐 Radio silence",
            react: "(No reaction.)", why: "Not replying is OK. A short, kind message is nicer, though." },
          { de: "Porquê? O que é que eu fiz mal? Dá-me outra oportunidade!", en: "Why? What did I do wrong? Give me another chance!", delta: -12, tag: "😬 Put on pressure",
            react: "Por favor, aceita.", reactEn: "Please just accept it.", why: "Pushing puts the other person under pressure. No means no." },
          { de: "(At three in the morning) Já estás a dormir? 😏", en: "(At three in the morning) Asleep yet?", delta: -18, tag: "😱 Crossed the line",
            react: "(Alex blocks you.)", why: "Messaging after a no, in the middle of the night? Absolutely not." },
        ],
      },
    ],
    more: "/cultura/por-dentro/dating",
  },
];

const schule = [
  {
    id: "zu-spaet", place: "Outside the classroom", backdrop: "klasse",
    props: [{ icon: "23F0", x: 80, y: 14 }, { icon: "1F6AA", x: 16, y: 18 }, { icon: "1F4DA", x: 62, y: 46 }],
    people: [{ id: "albrecht", mascot: "regi", name: "Professora Ana", role: "Portuguese teacher" }],
    turns: [
      {
        who: "albrecht", situation: "Your Portuguese class started at 9. It's quarter past, and the door is shut.",
        options: [
          { de: "(Knock and go in) Peço desculpa pelo atraso. O autocarro atrasou-se.", en: "(Knock, enter) Sorry I'm late. The bus was late.", delta: 14, tag: "😊 Quick apology",
            react: "Não faz mal, sente-se.", reactEn: "That's all right, sit down.", why: "Knock, say sorry briefly, sit down: that disturbs the class least. Peço desculpa is a little more formal than Desculpe." },
          { de: "(Come in quietly and sit down quickly)", en: "(Enter without speaking and sit)", delta: 4, tag: "😐 Low-key",
            react: "(She nods.)", why: "OK, but a quick Desculpe would be more polite." },
          { de: "(Wait outside until the break)", en: "(Stay outside the room)", delta: -6, tag: "😬 Missed a lot",
            react: "Então, estava lá fora? Que pena!", reactEn: "Oh, were you outside? What a shame!", why: "Then you miss a lot. Better to knock and come in." },
          { de: "(Come in loudly) Olá a todos! O que é que perdi?", en: "(Enter noisily) Hi, everyone! What have I missed?", delta: -12, tag: "😱 Big entrance",
            react: "O início. Sente-se em silêncio, por favor.", reactEn: "The beginning. Please sit down quietly.", why: "If you're late, keep it short and quiet." },
        ],
      },
      {
        who: "albrecht", npc: "Estamos na página 34, exercício 2.", en: "We're on page 34, exercise 2.",
        options: [
          { de: "Certo! (Open your book)", en: "Right! (Find the page)", delta: 12, tag: "😊 Straight in",
            react: "Muito bem. Continuamos!", reactEn: "Very good. Let's carry on!", why: "Joining in quickly shows the class matters to you." },
          { de: "Como? Mas nós íamos na 30!", en: "What? But we were on page 30!", delta: -6, tag: "😬 Argued",
            react: "Hoje já fizemos quatro páginas.", reactEn: "We've already done four pages today.", why: "The others were on time. Ask in the break instead." },
          { de: "Pode explicar tudo outra vez desde o início?", en: "Can you explain it all again from the beginning?", delta: -8, tag: "😬 Stopped the lesson",
            react: "No intervalo, por favor.", reactEn: "In the break, please.", why: "The others have moved on. Someone can explain the start in the break." },
        ],
      },
    ],
    more: "/cultura/por-dentro/time-and-timing",
  },
  {
    id: "du-oder-sie", place: "First day of the course", backdrop: "klasse",
    props: [{ icon: "1F4DD", x: 22, y: 44 }, { icon: "270F", x: 36, y: 46 }, { icon: "1F4D6", x: 76, y: 40 }],
    people: [
      { id: "novak", mascot: "bruno", name: "Rui Matos", role: "course teacher",
        talk: { likes: ["urlaub", "hobbys"], dislikes: ["wetter"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "pilar", mascot: "hamsti", name: "Dona Fátima", role: "older lady at the school office" },
    ],
    turns: [
      {
        who: "novak", situation: "The first day of your new Portuguese course. The teacher comes into the room.",
        npc: "Bom dia a todos! Sou o Rui Matos, o vosso professor.", en: "Good morning, everyone! I'm Rui Matos, your teacher.",
        options: [
          { de: "Bom dia! Muito prazer.", en: "Good morning! Nice to meet you.", delta: 14, tag: "😊 Spot on",
            react: "Igualmente!", reactEn: "Likewise!", why: "A greeting and Muito prazer is all you need." },
          { de: "Bom dia, stôr!", en: "Morning, sir!", delta: 6, tag: "🙂 School slang",
            react: "Ah, ah! Já fala como os miúdos cá da escola!", reactEn: "Ha! You already talk like the kids at school here!", why: "Stôr and stôra (from senhor / senhora professor) are what Portuguese pupils call their teachers. Funny from an adult, but friendly. Professor is the neutral choice." },
          { de: "Bom dia, senhor Rui.", en: "Good morning, Mr Rui.", delta: -3, tag: "😐 Mixed up",
            react: "Ah, ah, professor Rui. Ou só Rui.", reactEn: "Ha, professor Rui. Or just Rui.", why: "Senhor + first name sounds like the man at the corner shop. A teacher is professor or professora, with or without the first name." },
          { de: "Olá, Matos!", en: "Hi, Matos!", delta: -12, tag: "😱 Surname only",
            react: "Professor Matos, se não se importa. Ou Rui.", reactEn: "Professor Matos, if you don't mind. Or Rui.", why: "A surname on its own sounds rude, or like a sports coach shouting." },
        ],
      },
      {
        who: "novak", npc: "Tratem-me por Rui, por favor. Aqui tratamo-nos todos por tu.", en: "Call me Rui, please. We all use tu here.",
        options: [
          { de: "Combinado! Olá, Rui.", en: "Deal! Hi, Rui.", delta: 14, tag: "😊 Tu it is",
            react: "Perfeito! Vamos começar.", reactEn: "Perfect! Let's start.", why: "When the teacher offers tu, you just use it." },
          { de: "Prefiro tratá-lo por professor, se não se importa.", en: "I'd rather call you professor, if you don't mind.", delta: 4, tag: "😐 A bit stiff",
            react: "Como preferir, sem problema.", reactEn: "Whatever you prefer, no problem.", why: "That's allowed, and many people keep professor out of respect. But when everyone uses tu, it can seem a bit distant." },
          { de: "Fixe, Rui! Então, meu, tudo em cima?", en: "Cool, Rui! So, mate, all good?", delta: -6, tag: "😬 Too matey",
            react: "Hã… Rui chega.", reactEn: "Er… Rui is enough.", why: "Tu doesn't make you best mates. A simple Olá, Rui is right." },
          { de: "Fixe, então já posso chegar tarde, certo?", en: "Cool, so I can come late now, right?", delta: -8, tag: "😬 Got it wrong",
            react: "Não. O tu não muda as regras.", reactEn: "No. Tu doesn't change the rules.", why: "Tu makes things more personal; the rules stay the same." },
        ],
      },
      {
        who: "pilar", situation: "In the break you go to the secretaria, the school office, to pay for the course. An older lady looks up from her desk.",
        npc: "Bom dia. Em que posso ajudar?", en: "Good morning. How can I help you?",
        options: [
          { de: "Bom dia. Queria pagar o curso, se faz favor. É aqui?", en: "Good morning. I'd like to pay for the course, please. Is it here?", delta: 14, tag: "😊 Matched her tone",
            react: "É, sim. Sente-se, faça favor.", reactEn: "It is, yes. Please sit down.", why: "She speaks formally to you, so stay formal too. Older staff in offices and shops often keep it formal for good." },
          { de: "Olá. Podes dizer-me onde é que se paga o curso?", en: "Hi. Can you tell me where you pay for the course?", delta: -3, tag: "😐 Slipped into tu",
            react: "É aqui mesmo. Diga-me o seu nome.", reactEn: "Right here. Tell me your name.", why: "Not a disaster, but tu with an older stranger in an office sounds too familiar. Use the formal form: Pode dizer-me…?" },
          { de: "Olá, querida! Então, tudo bem?", en: "Hi, love! So, how's it going?", delta: -12, tag: "😱 Way too familiar",
            react: "Dona Fátima, se não se importa.", reactEn: "Dona Fátima, if you don't mind.", why: "Querida and Então, tudo bem? are for people you know well, not an older person you've just met." },
        ],
      },
      {
        who: "novak", wheel: 1, du: true, situation: "Back in class. Rui is standing next to you at the coffee machine.",
      },
    ],
    more: "/cultura/tu-or-o-senhor",
  },
  {
    id: "elterngespraech", place: "Meeting your daughter's class teacher", backdrop: "klasse",
    props: [{ icon: "1F4CB", x: 30, y: 46 }, { icon: "1F3A8", x: 80, y: 18 }, { icon: "1F392", x: 18, y: 56 }],
    people: [{ id: "weiss", mascot: "hamsti", name: "Cláudia", role: "your daughter's diretora de turma" }],
    turns: [
      {
        who: "weiss", situation: "You have a meeting with the diretora de turma, the teacher in charge of your daughter Sofia's class.",
        npc: "Obrigada por ter vindo. A Sofia é muito trabalhadora, mas fala bastante nas aulas.", en: "Thank you for coming. Sofia works very hard, but she talks quite a lot in class.",
        options: [
          { de: "Agradeço que me tenha dito. O que é que podemos fazer em casa para ajudar?", en: "Thank you for telling me. What can we do at home to help?", delta: 16, tag: "😊 Constructive",
            react: "Boa pergunta! Talvez falar com ela sobre as regras da sala de aula.", reactEn: "Good question! Perhaps talk to her about the classroom rules.", why: "Saying thank you and asking how you can help: that makes a parents' meeting work." },
          { de: "Está bem.", en: "OK (and nothing more).", delta: 3, tag: "😐 Passive",
            react: "… Tem alguma ideia do que possa ser?", reactEn: "… Have you any idea what it might be?", why: "Not wrong, but the meeting is for both of you. Ask something!" },
          { de: "Não pode ser. Em casa ela é muito calada.", en: "That can't be right. She's very quiet at home.", delta: -6, tag: "😬 Defensive",
            react: "Pois, mas na aula é diferente.", reactEn: "Well, in class it's different.", why: "The teacher sees Sofia every day. Listening first helps more." },
          { de: "Se calhar as suas aulas é que são aborrecidas?", en: "Maybe it's your lessons that are boring?", delta: -16, tag: "😱 Attack",
            react: "Acho melhor falarmos com calma.", reactEn: "I think we'd better talk calmly.", why: "Attacking the teacher doesn't help your child. Stay calm and stick to the facts." },
        ],
      },
      {
        who: "weiss", npc: "Voltamos a falar daqui a um mês?", en: "Shall we talk again in a month?",
        options: [
          { de: "Sim, muito bem. Pode ser no dia 25, às cinco?", en: "Yes, very good. Could we say the 25th at five?", delta: 14, tag: "😊 Made a date",
            react: "Perfeito. Fica marcado.", reactEn: "Perfect. It's in the diary.", why: "Suggesting a real date shows it matters to you." },
          { de: "Se houver alguma coisa, ligue-me.", en: "If anything comes up, call me.", delta: 3, tag: "😐 Vague",
            react: "Está bem… depois digo-lhe alguma coisa.", reactEn: "All right… I'll let you know.", why: "Fine, but a fixed date is more reliable." },
          { de: "Mande-me uma mensagem pelo WhatsApp e pronto.", en: "Just send me a WhatsApp.", delta: -4, tag: "😐 Too private",
            react: "É melhor pela caderneta ou pelo e-mail da escola.", reactEn: "Better through the pupil's notebook or the school e-mail.", why: "Many schools contact parents through the caderneta (the pupil's notebook), the school e-mail or the school's own platform, not a private phone." },
        ],
      },
    ],
    more: "/cultura/school-system",
  },
  {
    id: "gruppenarbeit", place: "Group work", backdrop: "klasse",
    props: [{ icon: "1F4CC", x: 50, y: 14 }, { icon: "1F3A8", x: 28, y: 48 }, { icon: "1F4F1", x: 74, y: 50 }],
    people: [{ id: "daniel", mascot: "hamsti", name: "Daniel", role: "from your course" }],
    turns: [
      {
        who: "daniel", situation: "Group work in your Portuguese class: you have to make a poster together. Daniel just looks at his phone.",
        npc: "Façam vocês, que hoje estou de rastos.", en: "You lot do it, I'm shattered today.",
        options: [
          { de: "Percebo, mas não me parece justo fazer tudo eu. Escreves tu o título?", en: "I understand, but I don't think it's fair for me to do it all. Will you write the title?", delta: 16, tag: "😊 “I” message",
            react: "Hum… está bem, tens razão. Passa-me a caneta.", reactEn: "Hmm… OK, you're right. Pass me the pen.", why: "With não me parece justo you say what bothers you without blaming him. And a small task helps." },
          { de: "Pronto, está bem, descansa.", en: "OK, fine, have a rest.", delta: 3, tag: "😐 Too nice",
            react: "És um espetáculo!", reactEn: "You're a star!", why: "Kind, but now you're doing everything yourself. It's OK to say what you need." },
          { de: "(Sigh and do it all yourself)", en: "(Do all the work and say nothing)", delta: -4, tag: "😐 Swallowed it",
            react: "(Daniel doesn't notice.)", why: "Swallowing your anger helps nobody. Say kindly what bothers you." },
          { de: "És tão preguiçoso! Nunca fazes nada!", en: "You're so lazy! You never do anything!", delta: -14, tag: "😱 Blame",
            react: "Ei, tem calma!", reactEn: "Hey, calm down!", why: "És tão preguiçoso and nunca sound like an attack. Then nobody wants to join in." },
        ],
      },
      {
        who: "daniel", npc: "Pronto, pronto. O que é que queres que eu faça?", en: "OK, OK. What do you want me to do?",
        options: [
          { de: "Boa! Tu fazes o título e procuras duas fotos. Eu escrevo o texto.", en: "Great! You do the title and find two photos. I'll write the text.", delta: 14, tag: "😊 Clear jobs",
            react: "Combinado!", reactEn: "Deal!", why: "Clear jobs make group work easier." },
          { de: "Faz o que quiseres.", en: "Do whatever you want.", delta: -6, tag: "😬 Sulking",
            react: "Hã… está bem?", reactEn: "Er… OK?", why: "He wants to help now. Take the offer!" },
          { de: "Agora é tarde.", en: "It's too late now.", delta: -8, tag: "😬 Holding a grudge",
            react: "Então pronto, deixa estar.", reactEn: "Forget it, then.", why: "Holding a grudge loses you help. Better to start again." },
        ],
      },
    ],
    more: "/cultura/por-dentro/directness",
  },
];

export const AREAS = [
  { id: "oeffentlich", title: "Out and about", icon: "1F68F", scenes: unterwegs },
  { id: "arbeit", title: "At work", icon: "1F4BC", scenes: arbeit },
  { id: "zuhause", title: "Home and neighbours", icon: "1F3E0", scenes: zuhause },
  { id: "date", title: "The date", icon: "1F377", scenes: date },
  { id: "schule", title: "School and Portuguese class", icon: "1F3EB", scenes: schule },
];

export const areaById = (id) => AREAS.find((a) => a.id === id) ?? null;
