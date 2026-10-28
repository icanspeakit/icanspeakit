// Der Knigge-Simulator (/spiele/knigge): the scenes of one day, in five areas.
//
// A scene = place + backdrop + people + turns. A turn: someone says something (`npc`, with
// its English help `en`) or a `situation` sets the scene, then the learner picks one of
// 3–4 `options`. There is no single right answer: every option moves the Sympathie of the
// turn's person (`who`) by `delta` (−20 … +20) and the Ruf by delta / 2.
//   bands: best +12 … +20 · okay +3 … +8 · awkward −3 … −8 · barbar −12 … −20
//   at least one option ≥ +10 per turn, never two with the same top delta.
// Each option: `de` (what you say; stage directions in parentheses), `en` (help), `tag` (the
// floating label), `react` (the person's answer, said by `who` unless `by` names someone
// else) and `why` (one short sentence in easy German, shown for good answers too).
// `more` links the Insider / Kultur topic that explains the scene.
// A `wheel: n` turn is the Smalltalk-Rad instead (n topics to pick, `du` for the du-form;
// see TOPICS below and the person's hidden `talk`).
//
// The German is the content (A2–B1). Tone: funny, never mean – jokes about behaviour, never
// about groups; no comments on bodies, origin or gender; „viele“, not „die Deutschen“.

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

/** Tagesbilanz titles by final Ruf. */
export const TITLES = [
  { min: 90, key: "kn.title.profi", de: "Knigge-Profi", icon: "1F3A9" },
  { min: 75, key: "kn.title.charme", de: "Charmeur:in", icon: "1F31F" },
  { min: 55, key: "kn.title.nett", de: "Netter Mensch", icon: "1F642" },
  { min: 35, key: "kn.title.barbar", de: "Kleiner Barbar", icon: "1F62C" },
  { min: -1, key: "kn.title.hoehle", de: "Höhlenmensch", icon: "1F9B4" },
];

export const titleFor = (ruf) => TITLES.find((x) => ruf >= x.min);

/**
 * Das Smalltalk-Rad: in a `wheel` turn the learner picks topics instead of replies. Each
 * person has hidden `talk` = { likes, dislikes, taboo } (topic ids); everything else is
 * neutral. Like +14, neutral +5, dislike −5, taboo −15. `say` is what the learner says (Sie /
 * du), `re` the person's answer per kind. A liked topic, once found, shows a 💡 next time.
 */
export const TOPICS = [
  { id: "wetter", label: "Wetter", icon: "2600",
    say: { sie: "Schönes Wetter heute, oder?", du: "Schönes Wetter heute, oder?" },
    re: { like: "Ja, herrlich! Ich war heute schon draußen joggen.", ok: "Ja, endlich mal Sonne.", dislike: "Hm. Wetter halt." } },
  { id: "wochenende", label: "Wochenende", icon: "1F389",
    say: { sie: "Haben Sie am Wochenende etwas vor?", du: "Hast du am Wochenende was vor?" },
    re: { like: "Ja! Ich fahre an den See. Ich freue mich so!", ok: "Nichts Besonderes, ein bisschen ausruhen.", dislike: "Ach, da muss ich leider arbeiten." } },
  { id: "arbeit", label: "Arbeit", icon: "1F4BC",
    say: { sie: "Und, was machen Sie beruflich?", du: "Und, viel los bei der Arbeit?" },
    re: { like: "Oh, mein Job macht mir richtig Spaß!", ok: "Ganz okay, danke.", dislike: "Bitte nicht über die Arbeit reden …" } },
  { id: "hobbys", label: "Hobbys", icon: "1F3B8",
    say: { sie: "Was machen Sie gern in Ihrer Freizeit?", du: "Was machst du so in deiner Freizeit?" },
    re: { like: "Ich spiele Gitarre – fast jeden Abend!", ok: "Ich lese ganz gern.", dislike: "Hobbys? Dafür habe ich gerade keine Zeit." } },
  { id: "essen", label: "Essen", icon: "1F35D",
    say: { sie: "Kennen Sie hier ein gutes Restaurant?", du: "Kennst du hier ein gutes Restaurant?" },
    re: { like: "Ja! Um die Ecke gibt es eine tolle Pizzeria. Die beste!", ok: "Hm, die Bäckerei an der Ecke ist gut.", dislike: "Ich koche lieber selbst." } },
  { id: "urlaub", label: "Urlaub", icon: "1F3D6",
    say: { sie: "Waren Sie dieses Jahr schon im Urlaub?", du: "Warst du dieses Jahr schon im Urlaub?" },
    re: { like: "Ja, in Portugal! Es war wunderschön.", ok: "Noch nicht, vielleicht im Herbst.", dislike: "Urlaub? Schön wär's." } },
  { id: "gehalt", label: "Gehalt", icon: "1F4B6",
    say: { sie: "Was verdienen Sie eigentlich so?", du: "Was verdienst du eigentlich so?" },
    re: { taboo: "Das … möchte ich nicht sagen." },
    why: "Über Geld spricht man mit Fremden und Kollegen meistens nicht – das finden viele zu privat." },
  { id: "aussehen", label: "Aussehen", icon: "1FA9E",
    say: { sie: "Sie sehen aber müde aus.", du: "Du siehst aber müde aus." },
    re: { taboo: "Oh. Danke. Sehr nett …" },
    why: "Kommentare über Aussehen oder Gewicht sind beim Smalltalk tabu – auch gut gemeinte." },
  { id: "politik", label: "Politik", icon: "1F5F3",
    say: { sie: "Was halten Sie eigentlich von der Regierung?", du: "Was hältst du eigentlich von der Regierung?" },
    re: { taboo: "Darüber rede ich lieber nicht.", like: "Gute Frage! Ich finde …", ok: "Hm, schwieriges Thema.", dislike: "Ach, lieber nicht." },
    why: "Politik kann schnell zum Streit werden. Beim Smalltalk mit Fremden lieber nicht." },
  { id: "liebe", label: "Liebe & Ex", icon: "1F48D",
    say: { sie: "Sind Sie eigentlich verheiratet?", du: "Und, was macht eigentlich dein Ex?" },
    re: { taboo: "Das ist privat.", ok: "Ach, das ist eine lange Geschichte.", like: "Oh, ich bin seit Kurzem verliebt!", dislike: "Lieber ein anderes Thema." },
    why: "Liebe, Beziehung und die oder der Ex sind privat. Darüber reden Freunde – nicht Leute, die sich gerade kennenlernen." },
];

export const topicById = (id) => TOPICS.find((x) => x.id === id) ?? null;
/** "like" | "ok" | "dislike" | "taboo" for a person's hidden taste. */
export const topicKind = (talk, id) =>
  talk?.taboo?.includes(id) ? "taboo" : talk?.likes?.includes(id) ? "like" : talk?.dislikes?.includes(id) ? "dislike" : "ok";
export const TOPIC_DELTA = { like: 14, ok: 5, dislike: -5, taboo: -15 };

const unterwegs = [
  {
    id: "baeckerei", place: "In der Bäckerei", backdrop: "baeckerei",
    props: [{ icon: "1F950", x: 14, y: 30 }, { icon: "1F35E", x: 30, y: 26 }, { icon: "1F370", x: 78, y: 28 }],
    people: [
      { id: "kunde", mascot: "quaki", name: "Herr Lange", role: "Kunde in der Schlange" },
      { id: "verkaeuferin", mascot: "hamsti", name: "Frau Brandt", role: "Verkäuferin" },
    ],
    turns: [
      {
        who: "kunde", situation: "Morgens um acht. Die Schlange ist lang. Du gehst direkt zur Theke.",
        npc: "Entschuldigung, ich glaube, ich war vor Ihnen dran.", en: "Excuse me, I think I was before you.",
        options: [
          { de: "Oh, Entschuldigung! Dann bitte, Sie zuerst.", en: "Oh, sorry! Then please, you first.", delta: 15, tag: "😊 Fair geblieben",
            react: "Danke, sehr nett!", why: "Wer zuerst da war, ist zuerst dran. Eine kurze Entschuldigung reicht." },
          { de: "Sind Sie sicher? Ich habe Sie nicht gesehen.", en: "Are you sure? I didn't see you.", delta: 4, tag: "😐 Etwas stur",
            react: "Ja, ich stand hier am Regal.", why: "Nachfragen ist okay. Im Zweifel lässt man den anderen vor." },
          { de: "Ich hab's aber eilig.", en: "But I'm in a hurry.", delta: -8, tag: "😬 Vorgedrängelt",
            react: "Das haben wir alle.", why: "Eile ist kein Grund zum Vordrängeln. Die Schlange gilt für alle." },
          { de: "Na und? Hier gibt's doch keine Nummern.", en: "So what? There are no numbers here.", delta: -16, tag: "😱 Ellbogen raus",
            react: "Unglaublich …", why: "Auch ohne Nummer gilt: Wer zuerst kommt, ist zuerst dran." },
        ],
      },
      {
        who: "verkaeuferin", npc: "Guten Morgen! Was darf's sein?", en: "Good morning! What can I get you?",
        options: [
          { de: "Guten Morgen! Ich hätte gern zwei Brötchen, bitte.", en: "Good morning! I'd like two rolls, please.", delta: 15, tag: "😊 Freundlich und klar",
            react: "Gern! Sonst noch etwas?", why: "Grüßen, „Ich hätte gern …“ und „bitte“: So bestellt man höflich." },
          { de: "Was ist hier am billigsten?", en: "What's the cheapest thing here?", delta: 3, tag: "😐 Sparfuchs",
            react: "Die Brötchen, 45 Cent das Stück.", why: "Nach dem Preis fragen ist okay. Ein „Guten Morgen“ vorher wäre netter." },
          { de: "Zwei Brötchen.", en: "Two rolls.", delta: -4, tag: "😐 Etwas kurz",
            react: "… bitte?", why: "Ohne Gruß und ohne „bitte“ klingt eine Bestellung wie ein Befehl." },
          { de: "Gib mal zwei Brötchen.", en: "Gimme two rolls.", delta: -12, tag: "😬 Zu locker",
            react: "Äh … gern. Zwei Brötchen.", why: "Fremde Erwachsene siezt man: „Ich hätte gern …“ statt „Gib mal …“." },
        ],
      },
      {
        who: "verkaeuferin", npc: "Das macht 1,80 Euro. Brauchen Sie eine Tüte?", en: "That's 1.80 euros. Do you need a bag?",
        options: [
          { de: "Nein danke, ich habe einen Beutel dabei.", en: "No thanks, I have a bag with me.", delta: 12, tag: "😊 Gut vorbereitet",
            react: "Super, danke!", why: "Viele bringen eigene Beutel mit. Das spart Müll und ist ganz normal." },
          { de: "Ja, bitte. Und hier sind zwei Euro – stimmt so!", en: "Yes, please. Here's two euros – keep the change!", delta: 6, tag: "🙂 Kleines Trinkgeld",
            react: "Oh, danke schön!", why: "Trinkgeld ist beim Bäcker nicht nötig, aber eine nette Geste." },
          { de: "(Wortlos das Geld hinlegen und gehen)", en: "(Put the money down without a word and leave)", delta: -6, tag: "😬 Wortlos",
            react: "Tschüss … auch.", why: "Zum Schluss sagt man kurz „Danke, schönen Tag noch!“." },
          { de: "1,80 für zwei Brötchen? Das ist ja Wucher!", en: "1.80 for two rolls? That's daylight robbery!", delta: -14, tag: "😱 Gemeckert",
            react: "Die Preise mache nicht ich.", why: "Über Preise meckern hilft nicht. Die Verkäuferin kann nichts dafür." },
        ],
      },
    ],
    more: "/kultur/insider/zusammen-oder-getrennt",
  },
  {
    id: "sbahn", place: "In der S-Bahn", backdrop: "sbahn",
    props: [{ icon: "1F687", x: 84, y: 24 }, { icon: "1F6CD", x: 60, y: 70 }],
    people: [
      { id: "mann", mascot: "bruno", name: "Mann mit Tasche", role: "Fahrgast" },
      { id: "dame", mascot: "regi", name: "Frau Kaiser", role: "Fahrgast mit Gehstock" },
    ],
    turns: [
      {
        who: "mann", situation: "Die S-Bahn ist voll. Auf dem einzigen freien Platz liegt die Tasche von einem Mann. Er schaut auf sein Handy.",
        options: [
          { de: "Entschuldigung, ist hier noch frei?", en: "Excuse me, is this seat free?", delta: 15, tag: "😊 Höflich gefragt",
            react: "Oh, klar, sorry!", why: "Mit „Ist hier noch frei?“ fragt man höflich nach einem Platz." },
          { de: "(Stehen bleiben und nichts sagen)", en: "(Keep standing and say nothing)", delta: 3, tag: "😐 Zu schüchtern",
            react: "(Er merkt nichts.)", why: "Das ist nicht unhöflich. Aber du darfst ruhig fragen – das ist normal." },
          { de: "(Laut seufzen: „Manche Leute …“)", en: "(Sigh loudly: “Some people …”)", delta: -6, tag: "😬 Passiv-aggressiv",
            react: "Hä? Ach so … bitte.", why: "Lautes Seufzen wirkt unfreundlich. Eine direkte, nette Frage klappt besser." },
          { de: "(Die Tasche einfach auf den Boden stellen)", en: "(Just put the bag on the floor)", delta: -14, tag: "😱 Übergriffig",
            react: "Hey! Das ist meine Tasche!", why: "Fremde Sachen fasst man nicht an. Erst fragen." },
        ],
      },
      {
        who: "dame", situation: "Zwei Stationen später steigt eine ältere Frau mit Gehstock ein. Kein Platz ist frei.",
        npc: "Puh, ist das voll heute.", en: "Phew, it's so full today.",
        options: [
          { de: "Möchten Sie sich setzen? Bitte!", en: "Would you like to sit down? Please!", delta: 16, tag: "😊 Aufmerksam",
            react: "Oh, das ist aber nett. Danke!", why: "Älteren Menschen oder Menschen mit Gehstock bietet man den Platz an." },
          { de: "Ja, total! Morgens ist es immer so.", en: "Yes, totally! It's always like this in the morning.", delta: 4, tag: "😐 Nur Smalltalk",
            react: "Hm, ja …", why: "Kurzer Smalltalk ist okay. Aber sie sucht eher einen Platz." },
          { de: "(Kopfhörer rein und aus dem Fenster schauen)", en: "(Put headphones in and look out of the window)", delta: -12, tag: "😬 Weggeschaut",
            react: "(Sie hält sich mühsam fest.)", why: "So tun, als sähe man nichts, finden viele unhöflich. Ein kurzes Angebot kostet nichts." },
        ],
      },
      {
        who: "dame", npc: "Wissen Sie, ob dieser Zug am Hauptbahnhof hält?", en: "Do you know if this train stops at the main station?",
        options: [
          { de: "Ja, in zwei Stationen. Ich sage Ihnen Bescheid.", en: "Yes, in two stops. I'll let you know.", delta: 14, tag: "😊 Hilfsbereit",
            react: "Wie lieb, danke!", why: "Kurz und klar helfen – und Bescheid sagen. Perfekt." },
          { de: "Keine Ahnung.", en: "No idea.", delta: -4, tag: "😐 Kurz angebunden",
            react: "Ach so. Na gut.", why: "Nicht wissen ist okay. Freundlicher: „Das weiß ich leider nicht.“" },
          { de: "Schauen Sie doch auf den Plan da oben.", en: "Just look at the map up there.", delta: -6, tag: "😬 Von oben herab",
            react: "Den kann ich ohne Brille nicht lesen.", why: "Der Tipp ist richtig, klingt aber abweisend. Lieber kurz selbst nachschauen." },
          { de: "Hauptbahnhof? Was wollen Sie denn da?", en: "Main station? What do you want there?", delta: -12, tag: "😱 Zu neugierig",
            react: "Das … geht Sie nichts an.", why: "Fremde fragt man nicht nach privaten Plänen. Einfach die Frage beantworten." },
        ],
      },
    ],
    more: "/kultur/insider/naehe-abstand",
  },
  {
    id: "aufzug", place: "Im Aufzug", backdrop: "aufzug",
    props: [{ icon: "1F6D7", x: 82, y: 30 }, { icon: "1F514", x: 16, y: 22 }],
    people: [
      { id: "herr", mascot: "bruno", name: "Herr Richter", role: "Mann im Aufzug",
        talk: { likes: ["wetter", "wochenende"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } },
      { id: "botin", mascot: "quaki", name: "Frau Yilmaz", role: "Botin mit Paketen" },
    ],
    turns: [
      {
        who: "herr", situation: "Du steigst in den Aufzug. Ein Mann steht schon drin.",
        npc: "Morgen.", en: "Morning.",
        options: [
          { de: "Guten Morgen!", en: "Good morning!", delta: 12, tag: "😊 Zurückgegrüßt",
            react: "(Er nickt freundlich.)", why: "Im Aufzug und im Treppenhaus grüßen viele kurz. Ein „Morgen“ reicht." },
          { de: "Hallo, mein Freund!", en: "Hello, my friend!", delta: -4, tag: "😐 Zu vertraut",
            react: "… Hallo.", why: "Zu Fremden sagt man „Guten Morgen“ oder „Hallo“ – ohne „mein Freund“." },
          { de: "(Nichts sagen, aufs Handy schauen)", en: "(Say nothing, look at your phone)", delta: -5, tag: "😐 Stumm",
            react: "(Er schaut auf die Tür.)", why: "Viele finden es unfreundlich, wenn man einen Gruß nicht erwidert." },
          { de: "Morgen! Ich hab kaum geschlafen, mein Nachbar schnarcht, und mein Rücken …", en: "Morning! I barely slept, my neighbour snores, and my back …", delta: -8, tag: "😬 Zu viel Info",
            react: "Äh … aha.", why: "Im Aufzug reicht ein Gruß. Private Geschichten sind für Freunde." },
        ],
      },
      {
        who: "herr", wheel: 1, situation: "Der Aufzug ist langsam. Noch sieben Stockwerke … Die Stille wird komisch. Sag etwas!",
      },
      {
        who: "botin", situation: "Im zweiten Stock hält der Aufzug. Eine Frau mit zwei Paketen will einsteigen.",
        npc: "Passt noch eine rein?", en: "Is there room for one more?",
        options: [
          { de: "Klar, kommen Sie! (Ein Stück zur Seite gehen)", en: "Sure, come in! (Step aside a little)", delta: 14, tag: "😊 Platz gemacht",
            react: "Danke, sehr nett!", why: "Platz machen und Abstand halten: So fühlen sich alle wohl." },
          { de: "(Ganz nah neben ihr stehen bleiben, obwohl Platz ist)", en: "(Stand very close to her, although there's room)", delta: -6, tag: "😬 Zu nah",
            react: "(Sie rückt weg.)", why: "Viele mögen Abstand, auch im Aufzug. Etwa eine Armlänge ist angenehm." },
          { de: "Nee, warten Sie lieber auf den nächsten.", en: "Nah, better wait for the next one.", delta: -12, tag: "😬 Abgewiesen",
            react: "Aha. Es ist doch genug Platz.", why: "Wenn Platz ist, lässt man andere rein. Alles andere wirkt kalt." },
          { de: "(Schnell auf „Tür zu“ drücken)", en: "(Quickly press “close door”)", delta: -18, tag: "😱 Tür vor der Nase",
            react: "Hallo?! …", why: "Die Tür vor der Nase zumachen ist eine echte Knigge-Katastrophe." },
        ],
      },
      {
        who: "botin", npc: "Puh, die sind schwer. Drücken Sie bitte die Vier?", en: "Phew, these are heavy. Could you press four, please?",
        options: [
          { de: "Klar! Und soll ich ein Paket nehmen?", en: "Sure! And shall I take one parcel?", delta: 15, tag: "😊 Mitgedacht",
            react: "Oh, das wäre super. Danke!", why: "Kurz helfen, wenn jemand die Hände voll hat: Das freut fast jeden." },
          { de: "(Die Vier drücken)", en: "(Press four)", delta: 6, tag: "🙂 Gemacht",
            react: "Danke!", why: "Völlig in Ordnung. Ein kurzes „Gern“ dazu klingt noch freundlicher." },
          { de: "Ich bin doch nicht Ihr Liftboy.", en: "I'm not your lift boy.", delta: -15, tag: "😱 Patzig",
            react: "Wow. Okay.", why: "Eine kleine Bitte ablehnen und dabei spotten wirkt sehr unhöflich." },
        ],
      },
    ],
    more: "/kultur/insider/hallo-sagen",
  },
  {
    id: "weg", place: "Auf der Straße", backdrop: "strasse",
    props: [{ icon: "1F3DB", x: 82, y: 22 }, { icon: "1F333", x: 12, y: 26 }, { icon: "1F68F", x: 30, y: 30 }],
    people: [
      { id: "touristin", mascot: "hamsti", name: "Eine Touristin", role: "fragt nach dem Weg" },
    ],
    turns: [
      {
        who: "touristin", npc: "Entschuldigung, wie komme ich zum Rathaus?", en: "Excuse me, how do I get to the town hall?",
        options: [
          { de: "Gehen Sie hier geradeaus und dann die zweite Straße links. Etwa fünf Minuten.", en: "Go straight on here and then take the second street on the left. About five minutes.", delta: 15, tag: "😊 Klar erklärt",
            react: "Super, vielen Dank!", why: "Kurz, deutlich und mit „Sie“: So erklärt man Fremden den Weg." },
          { de: "Das weiß ich leider nicht. Fragen Sie vielleicht am Kiosk da drüben?", en: "I'm afraid I don't know. Maybe ask at the kiosk over there?", delta: 8, tag: "🙂 Ehrlich",
            react: "Okay, danke trotzdem!", why: "„Das weiß ich leider nicht“ ist völlig in Ordnung – mit Tipp noch besser." },
          { de: "Rathaus? Hm, irgendwo da … oder da … glaube ich.", en: "Town hall? Hm, somewhere there … or there … I think.", delta: -6, tag: "😬 Verwirrend",
            react: "Äh … danke?", why: "Lieber ehrlich sagen, dass du es nicht weißt, als jemanden falsch zu schicken." },
          { de: "(Weitergehen, ohne zu antworten)", en: "(Walk on without answering)", delta: -14, tag: "😱 Ignoriert",
            react: "Hallo? …", why: "Wer angesprochen wird, antwortet kurz – zur Not mit „Tut mir leid, keine Zeit“." },
        ],
      },
      {
        who: "touristin", npc: "Können Sie mir das auf der Karte zeigen?", en: "Can you show me on the map?",
        options: [
          { de: "Klar. Hier sind wir, und da ist das Rathaus.", en: "Sure. We're here, and the town hall is there.", delta: 12, tag: "😊 Geduldig",
            react: "Ah, jetzt verstehe ich!", why: "Geduld ist freundlich. Auf der Karte ist es oft leichter." },
          { de: "Ich gehe sowieso in die Richtung. Kommen Sie mit!", en: "I'm going that way anyway. Come with me!", delta: 8, tag: "🙂 Sehr hilfsbereit",
            react: "Oh, wie nett!", why: "Sehr freundlich! Aber niemand muss so weit gehen – zeigen reicht." },
          { de: "(Das Handy nehmen und lange darauf herumtippen)", en: "(Take the phone and tap around on it for a long time)", delta: -6, tag: "😬 Übernommen",
            react: "Äh … kann ich mein Handy wiederhaben?", why: "Ein fremdes Handy nimmt man nicht einfach. Zeigen reicht." },
          { de: "Haben Sie kein Google Maps?", en: "Don't you have Google Maps?", delta: -12, tag: "😱 Genervt",
            react: "Doch, aber ich verstehe es nicht.", why: "Die Person fragt dich, weil sie Hilfe braucht. Spott hilft nicht." },
        ],
      },
    ],
    more: "/kultur/duzen-siezen",
  },
];

const arbeit = [
  {
    id: "kaffeekueche", place: "In der Kaffeeküche", backdrop: "kueche",
    props: [{ icon: "2615", x: 20, y: 34 }, { icon: "1F370", x: 72, y: 36 }, { icon: "1F95B", x: 86, y: 30 }],
    people: [{ id: "lena", mascot: "regi", name: "Lena", role: "Kollegin",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "lena", situation: "Montagmorgen. In eurem Team duzen sich alle.",
        npc: "Morgen! Na, wie war dein Wochenende?", en: "Morning! How was your weekend?",
        options: [
          { de: "Schön, danke! Ich war wandern. Und deins?", en: "Nice, thanks! I went hiking. And yours?", delta: 15, tag: "😊 Gut zurückgefragt",
            react: "Oh, wandern! Ich war im Kino.", why: "Kurz antworten und zurückfragen: perfekter Smalltalk." },
          { de: "Gut.", en: "Good.", delta: -3, tag: "😐 Gespräch tot",
            react: "Aha … okay.", why: "Höflich, aber das Gespräch ist sofort vorbei. Ein Satz mehr und eine Gegenfrage helfen." },
          { de: "Ach, frag nicht. Mein Vermieter, mein Rücken, meine Ex …", en: "Oh, don't ask. My landlord, my back, my ex …", delta: -8, tag: "😬 Zu privat",
            react: "Oh … das klingt … viel.", why: "Smalltalk ist kein Therapietermin. Probleme erzählt man Freunden." },
          { de: "Warum willst du das wissen?", en: "Why do you want to know?", delta: -15, tag: "😱 Misstrauisch",
            react: "Äh … nur so.", why: "Die Frage ist nur Smalltalk, keine Kontrolle." },
        ],
      },
      {
        who: "lena", npc: "Ich hab übrigens Kuchen mitgebracht. Nimm dir ruhig ein Stück!", en: "By the way, I brought cake. Help yourself to a piece!",
        options: [
          { de: "Oh, danke! Hast du den selbst gebacken?", en: "Oh, thanks! Did you bake it yourself?", delta: 14, tag: "😊 Interesse gezeigt",
            react: "Ja, nach dem Rezept von meiner Oma!", why: "Danke sagen und eine kleine Frage stellen: So wird aus Kuchen ein Gespräch." },
          { de: "Danke, gern! (Ein Stück nehmen)", en: "Thanks, I'd love one! (Take a piece)", delta: 6, tag: "🙂 Höflich",
            react: "Guten Appetit!", why: "Völlig in Ordnung. Ein Kompliment danach freut sie bestimmt." },
          { de: "(Drei Stücke nehmen und eins für später einpacken)", en: "(Take three pieces and pack one for later)", delta: -8, tag: "😬 Gierig",
            react: "Oh … die anderen wollten auch noch.", why: "Wenn jemand für alle etwas mitbringt, nimmt man erst mal ein Stück." },
          { de: "Nein. Zucker ist Gift – das solltest du auch nicht essen.", en: "No. Sugar is poison – you shouldn't eat it either.", delta: -13, tag: "😱 Belehrend",
            react: "Ähm … ich wollte nur nett sein.", why: "Ablehnen ist okay, aber ohne Vortrag. „Danke, heute nicht“ reicht." },
        ],
      },
      {
        who: "lena", wheel: 2, du: true, situation: "Ihr steht noch mit dem Kaffee in der Küche. Worüber redest du mit Lena?",
      },
    ],
    more: "/kultur/insider/direktheit",
  },
  {
    id: "erster-tag", place: "Erster Arbeitstag", backdrop: "buero",
    props: [{ icon: "1F4BB", x: 22, y: 34 }, { icon: "1F4C8", x: 78, y: 20 }, { icon: "23F0", x: 50, y: 12 }],
    people: [{ id: "chefin", mascot: "bruno", name: "Frau Hoffmann", role: "deine Chefin" }],
    turns: [
      {
        who: "chefin", situation: "Dein erster Tag im neuen Job. Du bist um 8:55 Uhr da, Beginn ist um 9 Uhr.",
        npc: "Guten Morgen! Sie sind sicher neu bei uns, oder?", en: "Good morning! You must be new here, right?",
        options: [
          { de: "Guten Morgen! Ja, heute ist mein erster Tag. Schön, Sie kennenzulernen. (Hand geben)", en: "Good morning! Yes, today is my first day. Nice to meet you. (Shake hands)", delta: 15, tag: "😊 Guter erster Eindruck",
            react: "Freut mich auch! Willkommen im Team.", why: "Mit „Sie“, Blickkontakt und Handschlag macht man bei der Chefin einen guten ersten Eindruck." },
          { de: "(Nicken und auf den Boden schauen)", en: "(Nod and look at the floor)", delta: -4, tag: "😐 Unsicher",
            react: "Keine Sorge, wir beißen nicht.", why: "Schüchtern sein ist okay. Ein kurzer Satz und Blickkontakt wirken freundlicher." },
          { de: "Hi! Ja, ich bin neu. Was geht?", en: "Hi! Yeah, I'm new. What's up?", delta: -12, tag: "😬 Zu locker",
            react: "Äh … was geht? Na, die Arbeit.", why: "Bei der Chefin bleibt man erst einmal beim „Sie“ und „Guten Morgen“." },
          { de: "Ja. Wann ist hier eigentlich Feierabend?", en: "Yes. When do we finish work here, by the way?", delta: -14, tag: "😱 Falsche Frage",
            react: "Um 17 Uhr. Aber erst mal fangen wir an.", why: "Am ersten Tag nach dem Feierabend fragen wirkt, als wolltest du schon wieder gehen." },
        ],
      },
      {
        who: "chefin", npc: "Morgen um neun ist unser Team-Meeting. Passt Ihnen das?", en: "Tomorrow at nine is our team meeting. Does that suit you?",
        options: [
          { de: "Ja, natürlich. Ich bin um kurz vor neun da.", en: "Yes, of course. I'll be there just before nine.", delta: 14, tag: "😊 Pünktlich",
            react: "Sehr gut!", why: "Pünktlich heißt bei der Arbeit oft: ein paar Minuten vorher da sein." },
          { de: "Kann ich auch erst um halb zehn kommen? Mein Bus …", en: "Can I come at half past nine? My bus …", delta: 3, tag: "😐 Ehrlich, aber …",
            react: "Das klären wir, wenn es öfter vorkommt.", why: "Ehrlich ist gut. Am ersten Tag macht es aber keinen starken Eindruck." },
          { de: "So ungefähr. Ich bin nicht so der Morgenmensch.", en: "Roughly. I'm not much of a morning person.", delta: -6, tag: "😬 Unzuverlässig",
            react: "Hm. Neun Uhr heißt neun Uhr.", why: "Bei Terminen im Job erwarten viele Pünktlichkeit." },
          { de: "Mal sehen.", en: "We'll see.", delta: -12, tag: "😱 Gleichgültig",
            react: "Bitte?", why: "„Mal sehen“ klingt bei einem Termin mit der Chefin, als wäre er dir egal." },
        ],
      },
    ],
    more: "/kultur/insider/puenktlichkeit",
  },
  {
    id: "meeting", place: "Im Meeting", backdrop: "buero",
    props: [{ icon: "1F4CA", x: 50, y: 14 }, { icon: "1F4CB", x: 18, y: 38 }, { icon: "2615", x: 84, y: 40 }],
    people: [{ id: "jonas", mascot: "hamsti", name: "Jonas", role: "Kollege" }],
    turns: [
      {
        who: "jonas", situation: "Teamsitzung. In diesem Team duzen sich alle. Jonas stellt eine Idee vor.",
        npc: "Mein Vorschlag: Wir machen die Teamsitzung ab jetzt um sieben Uhr morgens. Was meinst du?", en: "My suggestion: from now on we hold the team meeting at seven in the morning. What do you think?",
        options: [
          { de: "Ich verstehe die Idee. Aber um sieben können nicht alle. Wie wäre es mit neun?", en: "I get the idea. But not everyone can make it at seven. How about nine?", delta: 16, tag: "😊 Ehrlich und freundlich",
            react: "Hm, stimmt. Neun geht auch.", why: "Direkt sagen, was nicht passt, und einen Vorschlag machen: So mögen es viele im Job." },
          { de: "Interessanter Ansatz.", en: "Interesting approach.", delta: -4, tag: "😐 Zu vage",
            react: "Danke! Dann machen wir das so.", why: "„Interessanter Ansatz“ heißt oft „So nicht“. Aber Jonas hört ein Ja – und jetzt ist die Sitzung um sieben." },
          { de: "(Nichts sagen und später in der Küche lästern)", en: "(Say nothing and gossip in the kitchen later)", delta: -12, tag: "😬 Hintenrum",
            react: "(Jonas hört es später trotzdem.)", why: "Hinter dem Rücken reden schadet dem Team. Lieber im Meeting freundlich widersprechen." },
          { de: "Das ist die dümmste Idee, die ich je gehört habe.", en: "That's the stupidest idea I've ever heard.", delta: -16, tag: "😱 Zu hart",
            react: "Wow. Danke.", why: "Direkt ist gut, verletzend nicht. Die Kritik gilt der Idee, nicht der Person." },
        ],
      },
      {
        who: "jonas", situation: "Nach der Sitzung. Seine Folien waren sehr lang und sehr bunt.",
        npc: "Und, wie fandest du meine Präsentation?", en: "So, what did you think of my presentation?",
        options: [
          { de: "Die Inhalte sind gut. Die Folien würde ich kürzer machen.", en: "The content is good. I'd make the slides shorter.", delta: 14, tag: "😊 Konstruktiv",
            react: "Guter Tipp, danke!", why: "Erst das Gute, dann ein konkreter Tipp: So nimmt man Kritik gern an." },
          { de: "Super! Alles perfekt!", en: "Great! All perfect!", delta: 4, tag: "😐 Zu nett",
            react: "Echt? Dann lasse ich sie so.", why: "Nett gemeint, aber er lernt nichts. Im Job hilft ehrliches Feedback mehr." },
          { de: "Zu lang, zu bunt, zu langweilig.", en: "Too long, too colourful, too boring.", delta: -12, tag: "😱 Vernichtend",
            react: "Okay … das tut weh.", why: "Kritik ohne ein gutes Wort und ohne Tipp klingt wie ein Angriff." },
        ],
      },
    ],
    more: "/kultur/insider/direktheit",
  },
  {
    id: "feierabend", place: "Feierabend", backdrop: "kneipe",
    props: [{ icon: "1F37A", x: 30, y: 40 }, { icon: "1F3B6", x: 78, y: 18 }, { icon: "1F964", x: 66, y: 42 }],
    people: [{ id: "becker", mascot: "bruno", name: "Herr Becker", role: "Kollege aus der Buchhaltung",
      talk: { likes: ["urlaub", "wochenende"], dislikes: ["wetter"], taboo: ["gehalt", "politik", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "becker", situation: "17 Uhr. Herr Becker und du siezt euch noch.",
        npc: "Schönen Feierabend! Kommen Sie noch mit auf ein Bier?", en: "Have a nice evening! Are you coming along for a beer?",
        options: [
          { de: "Gern! Aber für mich bitte ein Alkoholfreies.", en: "I'd love to! But a non-alcoholic one for me, please.", delta: 14, tag: "😊 Dabei, auf deine Art",
            react: "Klar, kein Problem!", why: "Mitkommen ist nett. Alkohol muss niemand trinken – ein klares Nein ist normal." },
          { de: "Heute leider nicht, aber nächstes Mal gern!", en: "Not today, unfortunately, but next time I'd love to!", delta: 8, tag: "🙂 Freundlich abgesagt",
            react: "Okay, dann nächstes Mal!", why: "Eine freundliche Absage mit „nächstes Mal“ ist völlig okay." },
          { de: "Nur wenn Sie zahlen!", en: "Only if you pay!", delta: -3, tag: "😐 Schnorrer-Witz",
            react: "Haha … mal sehen.", why: "Ein Witz – aber beim ersten Bier mit Kollegen zahlt meistens jeder selbst." },
          { de: "Nein danke, ich trinke nicht mit Kollegen.", en: "No thanks, I don't drink with colleagues.", delta: -6, tag: "😬 Abweisend",
            react: "Oh. Na gut.", why: "Ablehnen ist okay, aber so klingt es, als möchtest du die Kollegen nicht." },
        ],
      },
      {
        who: "becker", situation: "In der Kneipe um die Ecke.",
        npc: "Und, wie gefällt Ihnen die Firma bisher?", en: "So, how do you like the company so far?",
        options: [
          { de: "Sehr gut! Das Team ist nett. Wie lange sind Sie schon hier?", en: "Very much! The team is nice. How long have you been here?", delta: 14, tag: "😊 Gut zurückgefragt",
            react: "Schon zwölf Jahre! Kaum zu glauben.", why: "Etwas Positives sagen und zurückfragen: ein guter Feierabend-Smalltalk." },
          { de: "Gut. Was halten Sie eigentlich von der Regierung?", en: "Good. What do you think of the government, by the way?", delta: -6, tag: "😬 Heikles Thema",
            react: "Oh, äh … lieber nicht heute.", why: "Über Politik kann man reden, aber beim ersten Feierabend-Bier ist es riskant." },
          { de: "Ganz okay. Aber der Chef ist ein Idiot, oder?", en: "It's okay. But the boss is an idiot, right?", delta: -12, tag: "😬 Gelästert",
            react: "Hm. Das sage ich jetzt mal nicht weiter.", why: "Als Neue oder Neuer über Vorgesetzte lästern? Das spricht sich schnell herum." },
          { de: "Gut. Sagen Sie mal, wie viel verdienen Sie eigentlich?", en: "Good. Tell me, how much do you earn, actually?", delta: -14, tag: "😱 Gehalt-Frage",
            react: "Das … behalte ich lieber für mich.", why: "Nach dem Gehalt fragt man Kollegen meistens nicht – das finden viele zu privat." },
        ],
      },
      {
        who: "becker", wheel: 1, situation: "Herr Becker trinkt sein Bier. Jetzt bist du mit einem Thema dran.",
      },
    ],
    more: "/kultur/duzen-siezen",
  },
];

const zuhause = [
  {
    id: "neue-nachbarin", place: "Im Treppenhaus", backdrop: "treppenhaus",
    props: [{ icon: "1F4EC", x: 16, y: 34 }, { icon: "1F6AA", x: 84, y: 22 }, { icon: "1F6CD", x: 62, y: 66 }],
    people: [{ id: "schulz", mascot: "regi", name: "Frau Schulz", role: "Nachbarin",
      talk: { likes: ["wetter", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } }],
    turns: [
      {
        who: "schulz", situation: "Du bist gerade eingezogen. Im Treppenhaus triffst du eine Frau mit Einkaufstüten.",
        npc: "Hallo! Sind Sie neu hier im Haus?", en: "Hello! Are you new in the building?",
        options: [
          { de: "Ja, guten Tag! Ich wohne jetzt im zweiten Stock. Wie heißen Sie?", en: "Yes, hello! I live on the second floor now. What's your name?", delta: 15, tag: "😊 Gut vorgestellt",
            react: "Schulz, Petra Schulz. Willkommen im Haus!", why: "Kurz vorstellen und nach dem Namen fragen: So beginnt gute Nachbarschaft." },
          { de: "Ja! Darf ich Ihnen mit den Tüten helfen?", en: "Yes! May I help you with the bags?", delta: 8, tag: "🙂 Hilfsbereit",
            react: "Oh, wie nett – geht schon, danke!", why: "Hilfe anbieten ist nett. Vorstellen kannst du dich trotzdem." },
          { de: "Ja. Ist das Haus eigentlich laut? Die Wände sind ja dünn.", en: "Yes. Is the building noisy, by the way? The walls are thin.", delta: -3, tag: "😐 Gleich gemeckert",
            react: "Ach, es geht. Wir sind ruhige Leute.", why: "Mit Kritik am Haus anfangen wirkt nicht so freundlich." },
          { de: "Ja. (Weitergehen)", en: "Yes. (Walk on)", delta: -6, tag: "😬 Kurz angebunden",
            react: "Aha. Na dann.", why: "Ein Satz mehr macht einen viel besseren Eindruck bei den Nachbarn." },
        ],
      },
      {
        who: "schulz", situation: "Drei Tage später triffst du sie am Briefkasten.",
        npc: "Ach, hallo! Haben Sie sich gut eingelebt?", en: "Oh, hello! Have you settled in well?",
        options: [
          { de: "Hallo, Frau Schulz! Ja, danke – es gefällt mir hier sehr.", en: "Hello, Mrs Schulz! Yes, thanks – I like it here a lot.", delta: 15, tag: "😊 Name gemerkt",
            react: "Oh, Sie wissen noch meinen Namen!", why: "Mit Namen grüßen zeigt: Du hast zugehört. Das freut fast alle." },
          { de: "Ja, danke! Wie war noch mal Ihr Name? Ich vergesse Namen so schnell.", en: "Yes, thanks! What was your name again? I forget names so quickly.", delta: 8, tag: "🙂 Ehrlich nachgefragt",
            react: "Schulz. Kein Problem!", why: "Ehrlich nachfragen ist viel besser, als einen falschen Namen zu sagen." },
          { de: "Hallo, äh … Frau … Müller?", en: "Hello, er … Mrs … Müller?", delta: -4, tag: "😐 Name vergessen",
            react: "Schulz. Aber egal.", why: "Das passiert jedem. Besser: ehrlich nachfragen." },
          { de: "Na ja. Wer hört hier eigentlich morgens um sechs so laut Radio?", en: "So-so. Who listens to the radio so loudly at six in the morning here?", delta: -8, tag: "😬 Beschwerde statt Gruß",
            react: "Oh … das bin ich. Tut mir leid.", why: "Ein Problem darfst du ansprechen – aber besser nicht als Antwort auf „Wie geht's?“." },
        ],
      },
      {
        who: "schulz", wheel: 1, situation: "Frau Schulz bleibt am Briefkasten stehen. Sie hat offenbar Zeit für ein bisschen Smalltalk.",
      },
    ],
    more: "/kultur/insider/hallo-sagen",
  },
  {
    id: "paket", place: "An der Wohnungstür", backdrop: "wohnungstuer",
    props: [{ icon: "1F4E6", x: 74, y: 60 }, { icon: "1F6AA", x: 18, y: 18 }, { icon: "1F514", x: 34, y: 30 }],
    people: [{ id: "koch", mascot: "bruno", name: "Herr Koch", role: "Nachbar von nebenan" }],
    turns: [
      {
        who: "koch", situation: "Es klingelt. Dein Nachbar steht vor der Tür.",
        npc: "Entschuldigung, dass ich störe. Könnten Sie heute ein Paket für mich annehmen? Ich bin bis abends weg.", en: "Sorry to bother you. Could you accept a parcel for me today? I'm away until the evening.",
        options: [
          { de: "Klar, kein Problem! Ich bin den ganzen Tag zu Hause.", en: "Sure, no problem! I'm at home all day.", delta: 14, tag: "😊 Gute Nachbarschaft",
            react: "Super, vielen Dank!", why: "Pakete für Nachbarn annehmen ist in vielen Häusern ganz normal." },
          { de: "Heute bin ich leider auch nicht da. Fragen Sie vielleicht Frau Schulz?", en: "Unfortunately I'm not here today either. Maybe ask Mrs Schulz?", delta: 6, tag: "🙂 Ehrliche Absage",
            react: "Gute Idee, danke!", why: "Nein sagen ist okay – mit einem Tipp sogar richtig nett." },
          { de: "Was ist denn drin?", en: "What's in it?", delta: -6, tag: "😬 Neugierig",
            react: "Äh … Bücher. Ist das wichtig?", why: "Was im Paket ist, geht dich nichts an. Annehmen oder nicht – das reicht." },
          { de: "Und was bekomme ich dafür?", en: "And what do I get for it?", delta: -12, tag: "😱 Geschäftsmann",
            react: "… Ich frage lieber jemand anderen.", why: "Ein Paket annehmen ist eine kleine Nachbarschaftshilfe, kein Geschäft." },
        ],
      },
      {
        who: "koch", situation: "Am Abend klingelt Herr Koch noch einmal.",
        npc: "Danke noch mal für heute! Hier, eine kleine Schokolade für Sie.", en: "Thanks again for today! Here, a little chocolate for you.",
        options: [
          { de: "Oh, das ist aber nett! Das war doch selbstverständlich.", en: "Oh, that's really kind! That went without saying.", delta: 14, tag: "😊 Bescheiden gedankt",
            react: "Trotzdem. Gute Nacht!", why: "Sich freuen und bescheiden bleiben: Das kommt gut an." },
          { de: "Danke! Gern wieder.", en: "Thanks! Any time.", delta: 8, tag: "🙂 Freundlich",
            react: "Schön, dass es so nette Nachbarn gibt!", why: "Kurz, freundlich, alles richtig." },
          { de: "(Die Schokolade nehmen und die Tür zumachen)", en: "(Take the chocolate and close the door)", delta: -6, tag: "😬 Wortlos",
            react: "(Er steht noch kurz vor der Tür.)", why: "Ein kurzes „Danke“ gehört dazu." },
          { de: "Nur Schokolade? Ich trinke lieber Wein.", en: "Only chocolate? I'd rather have wine.", delta: -14, tag: "😱 Undankbar",
            react: "Oh. Na dann … Gute Nacht.", why: "Ein Geschenk kommentiert man nicht. Man sagt einfach Danke." },
        ],
      },
    ],
  },
  {
    id: "party", place: "Deine Party", backdrop: "party",
    props: [{ icon: "1F389", x: 20, y: 14 }, { icon: "1F3B6", x: 50, y: 10 }, { icon: "1F382", x: 82, y: 40 }],
    people: [{ id: "wolf", mascot: "hamsti", name: "Herr Wolf", role: "Nachbar von unten" }],
    turns: [
      {
        who: "wolf", situation: "Samstag, 23:15 Uhr. Deine Geburtstagsparty ist laut. Es klingelt.",
        npc: "Guten Abend. Es ist nach elf. Ich muss morgen früh arbeiten.", en: "Good evening. It's after eleven. I have to work early tomorrow.",
        options: [
          { de: "Oh, das tut mir leid! Wir machen die Musik sofort leiser.", en: "Oh, I'm sorry! We'll turn the music down right away.", delta: 16, tag: "😊 Einsichtig",
            react: "Danke, das ist nett.", why: "Ab 22 Uhr gilt in vielen Häusern Nachtruhe. Entschuldigen und leiser machen ist die beste Lösung." },
          { de: "Kommen Sie doch rein und feiern Sie mit!", en: "Why don't you come in and celebrate with us!", delta: 6, tag: "🙂 Charmant, aber …",
            react: "Nett gemeint, aber ich will schlafen.", why: "Eine nette Idee! Aber die Musik muss trotzdem leiser werden." },
          { de: "Es ist Samstag! Da darf man feiern.", en: "It's Saturday! You're allowed to party.", delta: -12, tag: "😱 Gestritten",
            react: "Die Nachtruhe gilt auch am Samstag.", why: "Die Nachtruhe gilt meistens jeden Tag ab 22 Uhr – auch am Wochenende." },
          { de: "(Tür zumachen und weiterfeiern)", en: "(Close the door and keep partying)", delta: -18, tag: "😱 Ignoriert",
            react: "(Eine halbe Stunde später klingelt die Polizei.)", why: "Wer die Nachtruhe ignoriert, bekommt schnell Ärger – manchmal mit der Polizei." },
        ],
      },
      {
        who: "wolf", situation: "Am nächsten Morgen im Treppenhaus. Herr Wolf schaut müde aus.",
        npc: "Morgen.", en: "Morning.",
        options: [
          { de: "Guten Morgen! Entschuldigung noch mal für gestern.", en: "Good morning! Sorry again about last night.", delta: 14, tag: "😊 Wieder gutgemacht",
            react: "Schon gut. Danke, dass Sie leiser gemacht haben.", why: "Eine zweite kurze Entschuldigung zeigt: Es ist dir wirklich wichtig." },
          { de: "Morgen.", en: "Morning.", delta: 3, tag: "😐 Neutral",
            react: "(Er nickt.)", why: "Nicht falsch. Ein Wort zu gestern hätte die Stimmung verbessert." },
          { de: "(So tun, als hätte man ihn nicht gesehen)", en: "(Pretend you didn't see him)", delta: -6, tag: "😬 Ausgewichen",
            react: "(Er schüttelt den Kopf.)", why: "Ausweichen macht es schlimmer. Ein Gruß und ein Satz helfen." },
          { de: "War doch gar nicht so schlimm gestern, oder?", en: "It wasn't that bad last night, was it?", delta: -8, tag: "😬 Kleingeredet",
            react: "Doch. Ich habe kaum geschlafen.", why: "Wer gestört wurde, entscheidet, ob es schlimm war – nicht du." },
        ],
      },
    ],
    more: "/kultur/sonntagsruhe",
  },
  {
    id: "einladung", place: "Zum Essen eingeladen", backdrop: "esszimmer",
    props: [{ icon: "1F37D", x: 50, y: 52 }, { icon: "1F56F", x: 30, y: 46 }, { icon: "1F337", x: 76, y: 36 }],
    people: [{ id: "sara", mascot: "quaki", name: "Sara", role: "Nachbarin und Freundin" }],
    turns: [
      {
        who: "sara", situation: "Sara aus dem dritten Stock hat dich zum Abendessen eingeladen. Ihr duzt euch.",
        npc: "Hallo, schön, dass du da bist! Komm rein!", en: "Hi, great that you're here! Come in!",
        options: [
          { de: "Hallo! Danke für die Einladung – hier, ich habe dir Blumen mitgebracht.", en: "Hi! Thanks for the invitation – here, I brought you flowers.", delta: 15, tag: "😊 Mit Geschenk",
            react: "Oh, wie schön! Danke!", why: "Viele bringen eine Kleinigkeit mit: Blumen, Wein oder Schokolade." },
          { de: "Hallo! Soll ich die Schuhe ausziehen?", en: "Hi! Shall I take my shoes off?", delta: 8, tag: "🙂 Mitgedacht",
            react: "Wenn du magst – bei mir ist das egal.", why: "In vielen Wohnungen zieht man die Schuhe aus. Fragen ist immer gut." },
          { de: "Hallo! Was gibt's zu essen? Ich hab Hunger!", en: "Hi! What's for dinner? I'm hungry!", delta: -4, tag: "😐 Mit der Tür ins Haus",
            react: "Haha, gleich! Komm erst mal rein.", why: "Erst begrüßen und danken, dann übers Essen reden." },
          { de: "Hallo! Ich hab nichts mitgebracht – du hast ja eh genug.", en: "Hi! I didn't bring anything – you've got enough anyway.", delta: -12, tag: "😱 Mit leeren Händen",
            react: "Äh … ja. Komm rein.", why: "Mit leeren Händen kommen ist nicht schlimm. Es so zu sagen schon." },
        ],
      },
      {
        who: "sara", situation: "Es gibt einen Linsen-Eintopf. Er ist sehr scharf und schmeckt dir nicht.",
        npc: "Und? Wie schmeckt dir mein neues Rezept?", en: "So? How do you like my new recipe?",
        options: [
          { de: "Das ist mal was anderes! Schön scharf.", en: "That's something different! Nice and spicy.", delta: 12, tag: "😊 Höfliche Notlüge",
            react: "Ja, oder? Ich probiere gern Neues aus.", why: "Eine höfliche Notlüge schützt die Gefühle der Gastgeberin. „Das ist mal was anderes“ ist sogar wahr." },
          { de: "Ehrlich gesagt: zu scharf für mich. Aber die Idee ist toll!", en: "To be honest: too spicy for me. But the idea is great!", delta: 8, tag: "🙂 Ehrlich und nett",
            react: "Oh, schade! Nächstes Mal weniger Chili.", why: "Ehrlich und freundlich geht auch – mit einem netten Wort dazu." },
          { de: "Bäh. Hast du noch Brot?", en: "Yuck. Do you have any bread?", delta: -15, tag: "😱 Zu ehrlich",
            react: "… Ja. In der Küche.", why: "Ehrlichkeit ist gut, aber nicht so. Sara hat sich Mühe gegeben." },
          { de: "(Den Eintopf heimlich in den Blumentopf kippen)", en: "(Secretly pour the stew into the flower pot)", delta: -18, tag: "😱 Erwischt",
            react: "Was … machst du da?!", why: "Heimlich weg damit? Wenn das rauskommt, ist es viel peinlicher als ein ehrliches Wort." },
        ],
      },
      {
        who: "sara", npc: "Möchtest du noch einen Nachschlag?", en: "Would you like a second helping?",
        options: [
          { de: "Danke, ich bin schon pappsatt! Aber es war ein toller Abend.", en: "Thanks, I'm completely full! But it was a great evening.", delta: 14, tag: "😊 Elegant gerettet",
            react: "Das freut mich!", why: "„Ich bin schon satt“ ist eine nette Ausrede – und das Lob für den Abend stimmt." },
          { de: "Ja, gern!", en: "Yes, please!", delta: 3, tag: "😐 Tapfer",
            react: "Super! Hier, ein großer Teller!", why: "Sehr höflich – aber jetzt musst du noch einen Teller essen." },
          { de: "Nein.", en: "No.", delta: -6, tag: "😬 Knapp",
            react: "Oh. Okay.", why: "Ein „Nein, danke“ und ein netter Satz klingen viel freundlicher." },
        ],
      },
    ],
    more: "/kultur/insider/hoefliche-notluegen",
  },
];

const date = [
  {
    id: "date-hallo", place: "Vor dem Café", backdrop: "cafe",
    props: [{ icon: "2615", x: 80, y: 40 }, { icon: "1F337", x: 16, y: 44 }, { icon: "1F4F1", x: 60, y: 18 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "dein Date" }],
    turns: [
      {
        who: "alex", situation: "Euer erstes Date. Ihr kennt euch nur aus einer App. Alex wartet schon vor dem Café.",
        npc: "Hey! Schön, dass es geklappt hat!", en: "Hey! Great that it worked out!",
        options: [
          { de: "Hey! Schön, dich endlich in echt zu sehen!", en: "Hey! Nice to finally see you in real life!", delta: 15, tag: "😊 Herzlich",
            react: "Finde ich auch!", why: "Freundlich und ehrlich – ohne Foto-Vergleich." },
          { de: "Hey! Umarmung oder Hand?", en: "Hey! Hug or handshake?", delta: 8, tag: "🙂 Gefragt",
            react: "Haha, Umarmung ist okay!", why: "Fragen ist nie falsch. Viele finden das sogar sympathisch." },
          { de: "(Sofort fest umarmen)", en: "(Hug tightly straight away)", delta: -6, tag: "😬 Zu schnell",
            react: "Oh! … Hallo.", why: "Manche umarmen beim ersten Treffen, manche nicht. Besser abwarten oder fragen." },
          { de: "Hey! Auf den Fotos sahst du aber anders aus.", en: "Hey! You looked different in the photos.", delta: -16, tag: "😱 Foto-Vergleich",
            react: "… Danke?", why: "Kommentare zum Aussehen gleich bei der Begrüßung? Dann ist der Abend nach zehn Sekunden vorbei." },
        ],
      },
      {
        who: "alex", situation: "Ihr sitzt im Café. Die Bedienung kommt an euren Tisch und fragt: „Was darf ich euch bringen?“ Alex schaut dich an.",
        options: [
          { de: "Hallo! Für mich bitte einen Cappuccino. Danke!", en: "Hi! A cappuccino for me, please. Thanks!", delta: 14, tag: "😊 Nett zum Personal",
            react: "(Alex lächelt.) Für mich auch, bitte!", why: "Wie du mit dem Personal sprichst, merkt dein Date sofort." },
          { de: "Bestell du für mich, ich weiß nie, was ich will.", en: "You order for me, I never know what I want.", delta: 3, tag: "😐 Unentschlossen",
            react: "Äh, okay … zwei Cappuccino?", why: "Nicht schlimm, aber ein bisschen Entscheidung wirkt sicherer." },
          { de: "(Weiter aufs Handy schauen und nur auf die Karte zeigen)", en: "(Keep looking at your phone and just point at the menu)", delta: -8, tag: "😬 Abwesend",
            react: "(Alex schaut auch aufs Handy.)", why: "Das Handy ist nicht dein Date. Schau die Menschen an, mit denen du sprichst." },
          { de: "(Mit den Fingern schnippen) Hey, Chef! Kaffee!", en: "(Snap your fingers) Hey, boss! Coffee!", delta: -16, tag: "😱 Fingerschnippen",
            react: "(Alex schaut peinlich berührt weg.)", why: "Wie du mit dem Personal sprichst, sagt viel über dich – Fingerschnippen geht gar nicht." },
        ],
      },
    ],
    more: "/kultur/insider/date-knigge",
  },
  {
    id: "date-smalltalk", place: "Im Café", backdrop: "cafe",
    props: [{ icon: "2615", x: 40, y: 52 }, { icon: "1F370", x: 60, y: 52 }, { icon: "1F56F", x: 84, y: 30 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "dein Date",
      talk: { likes: ["hobbys", "urlaub", "essen"], dislikes: ["arbeit"], taboo: ["gehalt", "aussehen", "liebe"] } }],
    turns: [
      {
        who: "alex", npc: "Erzähl mal: Was machst du so, wenn du nicht arbeitest?", en: "Tell me: what do you do when you're not working?",
        options: [
          { de: "Ich koche gern und gehe oft wandern. Und du?", en: "I like cooking and I often go hiking. And you?", delta: 15, tag: "😊 Gut zurückgefragt",
            react: "Wandern? Ich auch! Wo warst du zuletzt?", why: "Etwas von dir erzählen und zurückfragen: So entsteht ein echtes Gespräch." },
          { de: "Nicht viel. Arbeiten, schlafen.", en: "Not much. Working, sleeping.", delta: -4, tag: "😐 Gespräch tot",
            react: "Aha … okay.", why: "Gib deinem Date etwas, worüber ihr reden könnt." },
          { de: "Also, das ist eine lange Geschichte … (20 Minuten nur über dein Auto)", en: "Well, it's a long story … (20 minutes only about your car)", delta: -12, tag: "😱 Monolog",
            react: "(Alex zählt die Fliesen.)", why: "Ein Gespräch geht in beide Richtungen. Nach zwei Minuten: zurückfragen!" },
          { de: "Meine Ex hat immer gesagt, ich habe keine Hobbys.", en: "My ex always said I don't have any hobbies.", delta: -14, tag: "😱 Die Ex",
            react: "Oh … okay.", why: "Die Ex bleibt beim ersten Date zu Hause. Immer." },
        ],
      },
      {
        who: "alex", npc: "Ich arbeite übrigens in der Pflege, im Krankenhaus.", en: "By the way, I work in nursing, at the hospital.",
        options: [
          { de: "Wow, das ist bestimmt anstrengend. Was magst du an deinem Job?", en: "Wow, that must be exhausting. What do you like about your job?", delta: 14, tag: "😊 Interessiert",
            react: "Die Menschen! Jeder Tag ist anders.", why: "Echtes Interesse an der Person ist das beste Kompliment." },
          { de: "Cool.", en: "Cool.", delta: 3, tag: "😐 Knapp",
            react: "Ja … und du?", why: "Freundlich, aber eine Frage zeigt mehr Interesse." },
          { de: "Krankenhaus? Igitt, da würde ich nie arbeiten.", en: "Hospital? Yuck, I'd never work there.", delta: -12, tag: "😬 Abwertend",
            react: "Gut, dass es andere machen, oder?", why: "Den Beruf vom Date schlechtmachen ist ein schneller Weg zum Ende." },
          { de: "Und wie viel verdient man da so?", en: "And how much do you earn doing that?", delta: -14, tag: "😱 Gehalt-Frage",
            react: "Das … erzähle ich beim ersten Date nicht.", why: "Über Geld spricht man beim ersten Date nicht. Viele finden das sogar unter Freunden unangenehm." },
        ],
      },
      {
        who: "alex", wheel: 2, du: true, situation: "Der Kaffee ist leer, aber ihr wollt noch nicht gehen. Worüber redet ihr?",
      },
      {
        who: "alex", situation: "Ihr lacht viel. Du möchtest Alex ein Kompliment machen.",
        options: [
          { de: "Du hast ein richtig schönes Lachen.", en: "You have a really lovely laugh.", delta: 14, tag: "😊 Charmant",
            react: "Oh – danke! Das hört man gern.", why: "Ein Kompliment über das Lachen oder den Humor ist persönlich, aber nicht zu viel." },
          { de: "Du hast einen tollen Musikgeschmack.", en: "You have great taste in music.", delta: 8, tag: "🙂 Nett",
            react: "Danke! Wir müssen mal zusammen auf ein Konzert.", why: "Ein Kompliment über Interessen ist sicher und freundlich." },
          { de: "Du bist viel netter, als ich dachte.", en: "You're much nicer than I thought.", delta: -6, tag: "😬 Eigentor",
            react: "Was hast du denn vorher gedacht?", why: "Ein Kompliment ohne „als ich dachte“ klingt viel besser." },
          { de: "Du bist perfekt! Willst du mich heiraten?", en: "You're perfect! Will you marry me?", delta: -12, tag: "😱 Viel zu viel",
            react: "Äh … wir kennen uns seit einer Stunde.", why: "So viel Gefühl ist beim ersten Date zu schnell – auch als Witz." },
        ],
      },
    ],
    more: "/kultur/insider/erstes-date",
  },
  {
    id: "date-rechnung", place: "Die Rechnung", backdrop: "cafe",
    props: [{ icon: "1F9FE", x: 50, y: 52 }, { icon: "1F4B3", x: 30, y: 54 }, { icon: "1F4B6", x: 72, y: 50 }],
    people: [
      { id: "alex", mascot: "quaki", name: "Alex", role: "dein Date" },
      { id: "kellner", mascot: "hamsti", name: "Herr Demir", role: "Kellner" },
    ],
    turns: [
      {
        who: "kellner", npc: "Zahlen Sie zusammen oder getrennt?", en: "Are you paying together or separately?",
        options: [
          { de: "Ich lade dich gern ein – oder möchtest du lieber getrennt zahlen?", en: "I'd be happy to treat you – or would you rather pay separately?", delta: 15, tag: "😊 Angeboten, nicht bestimmt", by: "alex",
            react: "Das ist lieb! Nächstes Mal lade ich dich ein.", why: "Einladen anbieten und fragen ist fair. Getrennt zahlen ist in Deutschland ganz normal." },
          { de: "Getrennt, bitte.", en: "Separately, please.", delta: 6, tag: "🙂 Ganz normal", by: "alex",
            react: "Klar, getrennt.", why: "Getrennt zahlen ist normal. Ein kurzer Blick zum Date vorher wäre noch netter." },
          { de: "Getrennt. Du hattest den Salat für 12,50, ich das Schnitzel – du schuldest mir noch 30 Cent.", en: "Separately. You had the salad for 12.50, I had the schnitzel – you still owe me 30 cents.", delta: -12, tag: "😱 Erbsenzähler", by: "alex",
            react: "… Ich gebe dir die 30 Cent.", why: "Getrennt zahlen ist normal. Auf den Cent genau rechnen ist unsexy." },
          { de: "(So tun, als würdest du dein Portemonnaie suchen)", en: "(Pretend to look for your wallet)", delta: -16, tag: "😱 Der alte Trick", by: "alex",
            react: "Schon gut … ich zahle.", why: "Den Trick kennen alle. Ehrlich sagen, was geht, ist viel besser." },
        ],
      },
      {
        who: "kellner", npc: "Das macht dann 23,40 Euro.", en: "That comes to 23.40 euros.",
        options: [
          { de: "Machen Sie 26, bitte.", en: "Make it 26, please.", delta: 12, tag: "😊 Trinkgeld richtig gegeben",
            react: "Vielen Dank! Schönen Abend noch!", why: "Im Restaurant gibt man oft etwa 5 bis 10 % Trinkgeld. Man sagt den Betrag beim Zahlen." },
          { de: "Stimmt so. (24 Euro geben)", en: "Keep the change. (Give 24 euros)", delta: 4, tag: "😐 Knapp",
            react: "Danke.", why: "Etwas Trinkgeld ist nett. Etwa 10 % sind üblich." },
          { de: "(Genau 23,40 hinlegen)", en: "(Put down exactly 23.40)", delta: -3, tag: "😐 Ohne Trinkgeld",
            react: "Danke.", why: "Trinkgeld ist keine Pflicht, aber im Restaurant üblich." },
          { de: "Trinkgeld? Sie bekommen doch einen Lohn!", en: "A tip? You get paid a wage!", delta: -12, tag: "😱 Geizig",
            react: "Natürlich. Schönen Abend.", why: "Trinkgeld ist kein Muss, aber das so zu sagen, ist unhöflich – auch vor deinem Date." },
        ],
      },
    ],
    more: "/kultur/trinkgeld",
  },
  {
    id: "date-tschuess", place: "Der Abschied", backdrop: "abend",
    props: [{ icon: "1F319", x: 82, y: 12 }, { icon: "1F6B2", x: 16, y: 50 }, { icon: "1F306", x: 50, y: 8 }],
    people: [{ id: "alex", mascot: "quaki", name: "Alex", role: "dein Date" }],
    turns: [
      {
        who: "alex", npc: "Das war ein schöner Abend. Ich muss jetzt aber los.", en: "That was a lovely evening. But I have to go now.",
        options: [
          { de: "Fand ich auch! Hast du Lust, das mal zu wiederholen?", en: "I thought so too! Would you like to do it again some time?", delta: 14, tag: "😊 Offen gefragt",
            react: "Mal sehen – ich schreib dir!", why: "Freundlich fragen ist mutig und fair. Die Antwort darf Alex selbst entscheiden." },
          { de: "Ich bring dich noch zur Bahn, wenn du magst.", en: "I'll walk you to the station, if you like.", delta: 8, tag: "🙂 Aufmerksam",
            react: "Gern, danke!", why: "Ein nettes Angebot – mit „wenn du magst“ ohne Druck." },
          { de: "Okay, tschüss.", en: "Okay, bye.", delta: -4, tag: "😐 Kühl",
            react: "Tschüss …", why: "Ein Satz zum Abend zeigt, dass er dir gefallen hat." },
          { de: "Schon? Komm doch noch mit zu mir!", en: "Already? Come back to my place!", delta: -14, tag: "😱 Zu viel Druck",
            react: "Nein. Ich gehe jetzt.", why: "Nach dem ersten Date ist das zu früh. Und ein Nein ist ein Nein." },
        ],
      },
      {
        who: "alex", situation: "Zwei Tage später schreibt Alex: „Hey, du bist echt nett, aber ich glaube, es passt nicht. Alles Gute!“",
        options: [
          { de: "Schade, aber danke für die ehrliche Nachricht. Alles Gute dir auch!", en: "Too bad, but thanks for the honest message. All the best to you too!", delta: 16, tag: "😊 Respektvoll",
            react: "Danke, das ist lieb von dir.", why: "Ein Nein akzeptieren und freundlich antworten: So geht man respektvoll miteinander um." },
          { de: "(Gar nicht antworten)", en: "(Don't answer at all)", delta: -4, tag: "😐 Funkstille",
            react: "(Keine Reaktion.)", why: "Keine Antwort ist okay. Eine kurze, nette Nachricht ist aber schöner." },
          { de: "Warum? Was habe ich falsch gemacht? Gib mir noch eine Chance!", en: "Why? What did I do wrong? Give me another chance!", delta: -12, tag: "😬 Druck gemacht",
            react: "Bitte akzeptier das einfach.", why: "Nachbohren setzt die andere Person unter Druck. Nein heißt Nein." },
          { de: "(Um drei Uhr nachts) Bist du noch wach? 😏", en: "(At three in the morning) Are you still awake? 😏", delta: -18, tag: "😱 Grenze überschritten",
            react: "(Alex blockiert dich.)", why: "Nach einem Nein weiter schreiben – und dann noch nachts? Das geht gar nicht." },
        ],
      },
    ],
    more: "/kultur/insider/nein-ist-nein",
  },
];

const schule = [
  {
    id: "zu-spaet", place: "Vor dem Kursraum", backdrop: "klasse",
    props: [{ icon: "23F0", x: 80, y: 14 }, { icon: "1F6AA", x: 16, y: 18 }, { icon: "1F4DA", x: 62, y: 46 }],
    people: [{ id: "albrecht", mascot: "regi", name: "Frau Albrecht", role: "Deutschlehrerin" }],
    turns: [
      {
        who: "albrecht", situation: "Der Deutschkurs hat um 9 Uhr angefangen. Es ist 9:15 Uhr, die Tür ist zu.",
        options: [
          { de: "(Anklopfen, reingehen) Entschuldigung, ich bin zu spät. Der Bus hatte Verspätung.", en: "(Knock, go in) Sorry I'm late. The bus was delayed.", delta: 14, tag: "😊 Kurz entschuldigt",
            react: "Kein Problem, setzen Sie sich.", why: "Anklopfen, kurz entschuldigen, hinsetzen: So stört man am wenigsten." },
          { de: "(Leise reinkommen und schnell hinsetzen)", en: "(Come in quietly and sit down quickly)", delta: 4, tag: "😐 Unauffällig",
            react: "(Sie nickt kurz.)", why: "Okay – ein kurzes „Entschuldigung“ wäre aber noch höflicher." },
          { de: "(Draußen warten bis zur Pause)", en: "(Wait outside until the break)", delta: -6, tag: "😬 Viel verpasst",
            react: "Oh, Sie waren draußen? Schade!", why: "Dann verpasst du viel. Lieber kurz anklopfen und reinkommen." },
          { de: "(Laut reinkommen) Morgen, Leute! Was hab ich verpasst?", en: "(Come in loudly) Morning, everyone! What did I miss?", delta: -12, tag: "😱 Großer Auftritt",
            react: "Den Anfang. Bitte setzen Sie sich leise.", why: "Wer zu spät kommt, macht es kurz und leise." },
        ],
      },
      {
        who: "albrecht", npc: "Wir sind auf Seite 34, Übung 2.", en: "We're on page 34, exercise 2.",
        options: [
          { de: "Danke! (Das Buch aufschlagen)", en: "Thanks! (Open the book)", delta: 12, tag: "😊 Gleich dabei",
            react: "Sehr gut. Weiter geht's!", why: "Schnell einsteigen zeigt: Der Kurs ist dir wichtig." },
          { de: "Was? Wir haben doch erst Seite 30 gemacht!", en: "What? We've only done page 30!", delta: -6, tag: "😬 Diskutiert",
            react: "Heute haben wir schon vier Seiten geschafft.", why: "Die anderen waren pünktlich. Frag lieber in der Pause nach." },
          { de: "Können Sie das alles noch mal von vorne erklären?", en: "Can you explain everything again from the beginning?", delta: -8, tag: "😬 Unterricht gestoppt",
            react: "Bitte fragen Sie in der Pause.", why: "Die anderen sind schon weiter. In der Pause erklärt dir bestimmt jemand den Anfang." },
        ],
      },
    ],
    more: "/kultur/insider/puenktlichkeit",
  },
  {
    id: "du-oder-sie", place: "Erster Kurstag", backdrop: "klasse",
    props: [{ icon: "1F4DD", x: 22, y: 44 }, { icon: "270F", x: 36, y: 46 }, { icon: "1F4D6", x: 76, y: 40 }],
    people: [{ id: "novak", mascot: "bruno", name: "Herr Novak", role: "Kursleiter",
      talk: { likes: ["urlaub", "hobbys"], dislikes: ["wetter"], taboo: ["gehalt", "aussehen", "politik", "liebe"] } }],
    turns: [
      {
        who: "novak", situation: "Der erste Tag im neuen Deutschkurs. Der Kursleiter kommt in den Raum.",
        npc: "Guten Morgen! Ich bin Herr Novak, Ihr Kursleiter.", en: "Good morning! I'm Mr Novak, your course teacher.",
        options: [
          { de: "Guten Morgen, Herr Novak!", en: "Good morning, Mr Novak!", delta: 14, tag: "😊 Richtig gesiezt",
            react: "Schön, dass Sie da sind!", why: "Lehrkräfte siezt man erst einmal – mit „Herr“ oder „Frau“ und Nachnamen." },
          { de: "Hallo! Darf ich du sagen?", en: "Hi! May I say du?", delta: -3, tag: "😐 Zu schnell",
            react: "Gleich, gleich – eins nach dem anderen.", why: "Das Du bietet meistens die Lehrkraft an. Bis dahin bleibt man beim Sie." },
          { de: "Hallo, Lehrer!", en: "Hello, teacher!", delta: -6, tag: "😬 Ohne Namen",
            react: "Novak. Herr Novak.", why: "„Lehrer“ ist im Deutschen keine Anrede. Man sagt „Herr Novak“." },
          { de: "Morgen, Novak!", en: "Morning, Novak!", delta: -12, tag: "😱 Nur der Nachname",
            react: "Herr Novak, bitte.", why: "Nur den Nachnamen ohne „Herr“ oder „Frau“ zu sagen, klingt unhöflich." },
        ],
      },
      {
        who: "novak", npc: "In unserem Kurs duzen sich alle – auch mich. Ich bin Martin.", en: "In our course everyone says du – to me too. I'm Martin.",
        options: [
          { de: "Okay, gern! Hallo, Martin!", en: "Okay, sure! Hi, Martin!", delta: 14, tag: "😊 Du angenommen",
            react: "Super! Dann legen wir los.", why: "Wenn die Lehrkraft das Du anbietet, nimmt man es einfach an." },
          { de: "Ich bleibe lieber beim Sie, Herr Novak.", en: "I'd rather stay with Sie, Mr Novak.", delta: 4, tag: "😐 Etwas steif",
            react: "Kein Problem, wie Sie möchten.", why: "Das ist erlaubt. Wenn sich alle duzen, wirkt es aber etwas distanziert." },
          { de: "Okay, Martin, mein Bruder!", en: "Okay, Martin, my brother!", delta: -6, tag: "😬 Zu kumpelhaft",
            react: "Ähm … einfach Martin reicht.", why: "Du heißt nicht gleich Kumpel. Ein einfaches „Hallo, Martin“ passt." },
          { de: "Super, dann kann ich ja auch mal zu spät kommen, oder?", en: "Great, so I can be late sometimes too, right?", delta: -8, tag: "😬 Falsch verstanden",
            react: "Nein. Das Du ändert nichts an den Regeln.", why: "Das Du macht es persönlicher – die Regeln bleiben gleich." },
        ],
      },
      {
        who: "novak", wheel: 1, du: true, situation: "Pause. Martin steht neben dir am Kaffeeautomaten.",
      },
    ],
    more: "/kultur/duzen-siezen",
  },
  {
    id: "elterngespraech", place: "Elterngespräch", backdrop: "klasse",
    props: [{ icon: "1F4CB", x: 30, y: 46 }, { icon: "1F3A8", x: 80, y: 18 }, { icon: "1F392", x: 18, y: 56 }],
    people: [{ id: "weiss", mascot: "hamsti", name: "Frau Weiß", role: "Klassenlehrerin von deiner Tochter" }],
    turns: [
      {
        who: "weiss", situation: "Die Klassenlehrerin von deiner Tochter Mia hat dich zu einem Gespräch eingeladen.",
        npc: "Schön, dass Sie da sind. Mia ist sehr fleißig, aber sie redet oft im Unterricht.", en: "Nice that you came. Mia is very hard-working, but she often talks in class.",
        options: [
          { de: "Danke für das Gespräch. Was können wir zu Hause tun, damit es besser wird?", en: "Thank you for the meeting. What can we do at home to make it better?", delta: 16, tag: "😊 Konstruktiv",
            react: "Gute Frage! Sprechen Sie mal mit ihr über die Regeln in der Klasse.", why: "Danken und fragen, wie man helfen kann: So wird ein Elterngespräch gut." },
          { de: "Okay.", en: "Okay.", delta: 3, tag: "😐 Passiv",
            react: "… Haben Sie eine Idee, woran das liegt?", why: "Nicht falsch, aber das Gespräch ist für euch beide. Frag nach!" },
          { de: "Das kann nicht sein. Zu Hause ist sie ganz ruhig.", en: "That can't be. At home she's very quiet.", delta: -6, tag: "😬 Abgewehrt",
            react: "In der Klasse ist das leider anders.", why: "Die Lehrerin sieht Mia jeden Tag. Erst mal zuhören hilft mehr." },
          { de: "Vielleicht ist Ihr Unterricht einfach langweilig?", en: "Maybe your lessons are just boring?", delta: -16, tag: "😱 Angriff",
            react: "Ich glaube, wir sollten sachlich bleiben.", why: "Ein Angriff auf die Lehrerin hilft deinem Kind nicht. Sachlich bleiben!" },
        ],
      },
      {
        who: "weiss", npc: "Können wir in vier Wochen noch einmal sprechen?", en: "Can we talk again in four weeks?",
        options: [
          { de: "Ja, gern. Passt Ihnen der 25. um 16 Uhr?", en: "Yes, gladly. Does the 25th at 4 pm suit you?", delta: 14, tag: "😊 Termin gemacht",
            react: "Ja, das passt. Ich schreibe es auf.", why: "Ein konkreter Termin zeigt: Dir ist das wichtig." },
          { de: "Rufen Sie mich einfach an, wenn was ist.", en: "Just call me if anything comes up.", delta: 3, tag: "😐 Unverbindlich",
            react: "Gut … ich melde mich.", why: "Okay, aber ein fester Termin ist verbindlicher." },
          { de: "Schreiben Sie mir doch einfach auf WhatsApp.", en: "Just text me on WhatsApp.", delta: -4, tag: "😐 Zu privat",
            react: "Das mache ich lieber über die Schule.", why: "Viele Lehrkräfte schreiben Eltern nicht privat. Termine macht man über die Schule." },
        ],
      },
    ],
    more: "/kultur/schulsystem",
  },
  {
    id: "gruppenarbeit", place: "Gruppenarbeit", backdrop: "klasse",
    props: [{ icon: "1F4CC", x: 50, y: 14 }, { icon: "1F3A8", x: 28, y: 48 }, { icon: "1F4F1", x: 74, y: 50 }],
    people: [{ id: "daniel", mascot: "hamsti", name: "Daniel", role: "aus deinem Kurs" }],
    turns: [
      {
        who: "daniel", situation: "Gruppenarbeit im Deutschkurs: Ihr sollt zusammen ein Plakat machen. Daniel schaut nur auf sein Handy.",
        npc: "Macht ihr mal, ich bin heute so müde.", en: "You do it, I'm so tired today.",
        options: [
          { de: "Verstehe. Aber ich finde es unfair, wenn ich alles allein mache. Kannst du die Überschrift schreiben?", en: "I understand. But I think it's unfair if I do everything alone. Can you write the heading?", delta: 16, tag: "😊 Ich-Botschaft",
            react: "Hm … okay, stimmt. Gib mal den Stift.", why: "Mit „Ich finde …“ sagst du klar, was dich stört – ohne Vorwurf. Und eine kleine Aufgabe hilft." },
          { de: "Kein Problem, schlaf ruhig!", en: "No problem, have a nap!", delta: 3, tag: "😐 Zu nett",
            react: "Danke, du bist super!", why: "Nett, aber jetzt machst du alles allein. Sag ruhig, was du brauchst." },
          { de: "(Seufzen und alles allein machen)", en: "(Sigh and do everything alone)", delta: -4, tag: "😐 Geschluckt",
            react: "(Daniel merkt nichts.)", why: "Ärger runterschlucken hilft niemandem. Sag freundlich, was dich stört." },
          { de: "Du bist so faul! Immer machst du nichts!", en: "You're so lazy! You never do anything!", delta: -14, tag: "😱 Vorwurf",
            react: "Hey, chill mal!", why: "„Du bist …“ und „immer“ klingen wie ein Angriff. Dann macht niemand gern mit." },
        ],
      },
      {
        who: "daniel", npc: "Okay, okay. Was soll ich machen?", en: "Okay, okay. What should I do?",
        options: [
          { de: "Super! Schreib die Überschrift und such zwei Bilder. Ich mache den Text.", en: "Great! Write the heading and find two pictures. I'll do the text.", delta: 14, tag: "😊 Klar verteilt",
            react: "Alles klar, mach ich!", why: "Klare Aufgaben machen Gruppenarbeit leichter." },
          { de: "Mach doch, was du willst.", en: "Do whatever you want.", delta: -6, tag: "😬 Beleidigt",
            react: "Äh … okay?", why: "Er will jetzt mitmachen. Nimm das Angebot an!" },
          { de: "Jetzt ist es eh zu spät.", en: "It's too late now anyway.", delta: -8, tag: "😬 Nachtragend",
            react: "Na dann eben nicht.", why: "Wer nachtragend ist, verliert Hilfe. Lieber neu anfangen." },
        ],
      },
    ],
    more: "/kultur/insider/direktheit",
  },
];

export const AREAS = [
  { id: "oeffentlich", title: "Unterwegs", icon: "1F68F", scenes: unterwegs },
  { id: "arbeit", title: "Bei der Arbeit", icon: "1F4BC", scenes: arbeit },
  { id: "zuhause", title: "Zu Hause & Nachbarn", icon: "1F3E0", scenes: zuhause },
  { id: "date", title: "Das Date", icon: "1F377", scenes: date },
  { id: "schule", title: "Schule & Deutschkurs", icon: "1F3EB", scenes: schule },
];

export const areaById = (id) => AREAS.find((a) => a.id === id) ?? null;
