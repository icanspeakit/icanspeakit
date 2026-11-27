// What the search lens in the nav can find, built once at build time and served as
// /suche.json. The overlay (SiteSearch.astro) fetches it the first time it opens, so no
// page pays for it until someone actually searches.
//
// Three kinds of hit, in the order a learner is likely to mean them:
//   topic  a grammar topic, a Präpositionen pack or a Kultur topic — matched on its name,
//          its subtitle and the KEYWORDS below, which are the words a learner types
//          ("der die das", "past tense", "wo wohin") rather than the name we gave it.
//   page   a trainer or exam hub (catalog.js).
//   word   every lexicon entry with a translation, linked to the Lernset it belongs to.
//   set    a Vokabelset (Lernset) with a page — matched on its title, its theme words
//          (lernsetKeywords.js: "Sport", "Landschaft", "food") and the words it teaches.
//
// Rows are arrays, not objects, for words: ~2700 of them, and the keys would be most of
// the file. The overlay knows the column order (see WORD_COLUMNS).
import { grammarCatalog } from "./grammarCatalog.js";
import { refPath, itemPath } from "./routes.js";
import { tools, exams } from "./catalog.js";
import { all, LEVELS } from "./lexicon.js";
import { lernsets, lernsetCards } from "./lernsets.js";
import kultur from "../data/kultur.json";
import kulturInsider from "../data/kultur-insider.json";
import { KULTUR_KEYWORDS } from "./kulturKeywords.js";
import { lernsetKeywords } from "./lernsetKeywords.js";
import redemittel from "../data/redemittel.json";
import seitenSuche from "../data/suche-seiten.json";
import zitate from "../data/zitate.json";
import { LIVE as RW_LIVE, eintraege as rwEintraege, hrefOf as rwHref } from "./redewendungenData.js";
import praepTrainer from "../data/praepositionen-trainer.json";
import conjugationTrainer from "../data/conjugation-trainer.json";
import { verbs as verbTables, verbHref } from "./verbtabellen.js";
import { fehlerPairs } from "./typischeFehler.js";
import { nachschlagenEntries } from "./nachschlagenIndex.js";
import { GAMES_HUB, GAME_TAGS, soloGames } from "./gamesCatalog.js";
import starkSchwach from "../data/nachschlagen/starke-schwache-verben.json";
import trennbar from "../data/nachschlagen/trennbare-verben.json";
import verbPraep from "../data/nachschlagen/verben-mit-praepositionen.json";

const workspaceMods = import.meta.glob("../data/grammatik/*.json", { eager: true });
const subtitles = Object.fromEntries(
  Object.values(workspaceMods).map((m) => m.default ?? m).map((w) => [w.slug ?? w.id, w.subtitle ?? ""]),
);

// Extra words per grammar topic key: the Portuguese terms a textbook uses, the English ones a
// learner searches for, and the forms themselves.
const KEYWORDS = {
  artikel: "articles article o a os as um uma uns umas do da no na ao à pelo num contractions definite indefinite the a an gender",
  akkusativ: "direct object pronouns o a os as me te nos vos -lo -la -no -na vejo-o não o vejo enclisis proclisis clitic object pronoun",
  dativ: "indirect object pronouns lhe lhes me te nos dou-lhe mo lho lha two objects clitic",
  plural: "plural plurals -s -es -ões -ães -ãos -is -ns animal animais mês meses nouns adjectives",
  "verb-position-2": "ser estar basics to be sou és é estou estás está who what where how permanent temporary",
  praesens: "present tense presente regular verbs -ar -er -ir conjugation falo comes vive endings beginner",
  konjugation: "irregular verbs present ser estar ir ter haver fazer vir ver ler dar dizer poder querer saber tenho faço venho key verbs",
  imperativ: "imperative imperativo commands orders fala fale não fales diz-me falem tu você o senhor instructions",
  aduso: "linking words e ou mas porque também por isso and but or because so conjunctions",
  wortarten: "parts of speech word classes noun verb adjective adverb pronoun preposition conjunction article number substantivo adjetivo",
  nomen: "nouns noun gender masculine feminine o a -o -a -ão -dade -ção dia mapa mão foto colega substantivo",
  "ja-nein-fragen": "yes no questions negation não short answers sim não é intonation",
  "w-fragen": "question words o que quem onde de onde para onde quando como quanto qual porquê porque é que interrogatives wh questions",
  possessivartikel: "possessives possessive adjectives o meu a minha o teu o seu o nosso dele dela my your his her",
  negation: "negation negatives não nunca nem nada ninguém nenhum também não já não double negation not never nothing nobody",
  perfekt: "pretérito perfeito simples simple past preterite falei comi parti falámos ontem finished actions",
  modalverben: "verb + infinitive ter de ter que poder dever querer saber conseguir precisar de must can have to should modal verbs",
  satzstellung: "muito pouco bastante demasiado tão tanto very much many little enough too quantity",
  wechselpraepositionen: "a para em going and being vou a lisboa vou para casa estou em lisboa de a desde até prepositions movement place",
  "trennbare-verben": "ir + infinitive near future vou ligar vamos going to future plans",
  "verben-praepositionen": "verbs with prepositions pensar em sonhar com depender de lembrar-se de precisar de gostar de esquecer-se de",
  adjektivdeklination: "adjective position bom boa grande são santo primeiro um grande homem um homem grande before after noun",
  "adjektivdeklination-a2": "adverbs -mente rapidamente bem mal bom mau muito bom muito bem manner adverbs well good",
  "als-oder-wenn": "por para difference por ou para for purpose reason cause destination",
  "indirekte-fragen": "indirect questions reporting diz que pergunta-me se não sei onde reported speech present",
  "infinitiv-mit-zu": "present subjunctive conjuntivo presente forms fale coma parta tenha faça vá seja subjunctive endings",
  "n-deklination": "pretérito imperfeito imperfect antes vivia era ia tinha used to habits descriptions past",
  genitiv: "possessive pronouns o meu a tua o dele o seu dele dela mine yours his hers",
  "praeteritum-plusquamperfekt": "perfeito imperfeito telling a story narrative past tenses contrast preterite imperfect",
  relativpronomen: "relative clauses que onde quem o que o qual who which that relative pronoun indicative",
  konjunktiv2: "imperfect subjunctive imperfeito do conjuntivo -sse queria que viesses falasse tivesse fosse",
  passiv: "passive se passiva com se aluga-se vende-se impersonal se ser participle foi construído estar a ser",
  fokuspartikeln: "verbs of change ficar tornar-se passar a virar acabar por deixar de to become get",
  irgend: "future subjunctive futuro do conjuntivo quem quiser o que for onde quer que seja qual for contracts rules whoever whatever",
  negationswoerter: "personal infinitive infinitivo pessoal para falarmos sem eles saberem é importante estudares",
  "nomen-verb-verbindungen": "collocations tomar uma decisão ter saudades dar um passeio fazer caso apresentar queixa dar-se conta fixed verb noun",
  "partizip-als-adjektiv": "estar + participle a loja está fechada double participles aceite entregue ganho irregular participles aberto escrito feito dito visto result state",
  "zweiteilige-konnektoren": "subjunctive opinion doubt não acho que é possível que duvido que não é verdade que indicative or subjunctive",
  konditionalsaetze: "real conditions se + future subjunctive se chover fico em casa se tiveres tempo first conditional if",
  konsekutivsaetze: "concession consequence embora + subjunctive ainda que por mais que tão que de modo que although even if so that",
  "zumal-wohingegen": "reported speech discurso indireto tense shifts disse que viria pediu-me que fosse indirect speech",
  modalsaetze: "unreal conditions se tivesse viajaria teria second conditional third conditional if i had imperfect subjunctive conditional",
  "reflexive-verben": "reflexive verbs pronominal daily routine levanto-me não me levanto chamar-se deitar-se me te se nos",
  "nebensaetze-weil-dass": "porque como por isso então portanto acho que diz que because since so therefore that clause",
  "komparativ-superlativ": "comparatives superlatives mais do que menos do que tão como o mais -íssimo melhor pior maior menor comparison",
  "lokale-praepositionen": "place em em cima de debaixo de ao lado de à frente de em frente de atrás de entre perto de aqui aí ali lá where prepositions of place",
  personalpronomen: "subject pronouns eu tu ele ela você nós a gente eles elas vocês o senhor a senhora tu or você dropping the pronoun pronouns",
  indefinitpronomen: "indefinites algo nada alguém ninguém algum nenhum outro todo cada qualquer some any someone nobody something nothing",
  "temporale-praepositionen": "telling the time days que horas são é uma hora são duas às oito na segunda-feira de manhã à tarde clock days of the week",
  futur: "futuro simples future falarei farei direi ir + infinitive plans predictions conjecture serão duas horas",
  "temporale-nebensaetze": "future subjunctive futuro do conjuntivo quando assim que logo que quando chegares liga-me when as soon as until time clauses",
  "da-wo-woerter": "pronouns after prepositions para mim sem ti comigo contigo connosco consigo with me",
  lassen: "verbal periphrases acabar de voltar a começar a deixar de continuar a andar a ficar a just again stop keep",
  modalpartikeln: "discourse markers pois pois é então bem olha ora portanto não é pá se calhar é assim fillers spoken portuguese",
  "adjektive-mit-praepositionen": "adjectives with prepositions farto de capaz de contente com interessado em fixed preposition",
  "konnektoren-grund-gegengrund": "linkers mas no entanto além disso por outro lado portanto por isso ainda assim although however moreover therefore contrast",
  finalsaetze: "purpose para + infinitive para que + subjunctive in order to so that",
  "passiv-b1": "mais-que-perfeito composto pluperfect past perfect tinha comido tinhas tinha had done",
  "zusammengesetzte-verben": "perfeito irregular simple past fui tive fiz estive disse pus vim vi dei pude quis soube trouxe ontem",
  "wortbildung-nomen": "word formation suffixes -ção -dade -mento -eiro -eira -aria -ista diminutive -inho -zinho",
  "welcher-dieser": "demonstratives este esse aquele isto isso aquilo neste nisso daquele this that",
  ordinalzahlen: "ordinal numbers primeiro segundo terceiro 1.º dates 3 de maio floors segundo andar rés-do-chão esquerdo direito",
  zahlen: "numbers um uma dois duas dezasseis cem cento mil milhão prices euros phone numbers nif counting",
  "adjektive-nach-sein": "adjectives agreement position uma casa branca carros novos português portuguesa gender number describing",
  gern: "gostar de gosto de gosto muito de também também não eu também like likes",
  "praeteritum-sein-haben": "vowel-change verbs spelling pedir peço ouvir ouço dormir durmo vestir visto seguir sigo sair saio perder perco -ear -iar",
  "berufe-mit-in": "há está estão fica there is there are há or estar",
  "konjunktiv2-hoeflich": "polite requests pode podia queria gostava de importa-se de please would could",
  komposita: "estar a + infinitive estou a trabalhar estar a ler present continuous right now progressive",
  positionsadverbien: "frequency sempre muitas vezes às vezes quase nunca nunca costumar costumo how often always usually never",
  "temporale-praepositionen-b1": "há que desde desde há até durante faz que demorar levar since for ago how long",
  "infinitiv-ohne-zu": "infinitive or subjunctive quero ir quero que vás same subject different subject personal infinitive",
  positionsverben: "verbs like apetecer interessar doer parecer custar faltar fazer falta ficar bem apetece-me dói-me",
  "adjektive-als-nomen": "o + adjective o bom o importante é o que aquilo que o facto de neuter the good thing",
  "funktionen-von-werden": "condicional conditional falaria faria teria gostaria eu no teu lugar would advice polite wishes",
  zustandspassiv: "perfeito composto or perfeito simples tenho trabalhado ultimamente tenho dormido present perfect continuing action",
  "relativsaetze-was-wo": "relative clauses subjunctive prepositions procuro alguém que saiba a casa em que vivo cujo o qual quem",
  "konjunktiv-1": "sequence of tenses subjunctive mais-que-perfeito do conjuntivo tivesse feito futuro composto do conjuntivo tiver feito",
  "subjektive-modalverben": "modal periphrases dever dever de ter de haver de vir a chegar a must probably",
  passiversatz: "conditions without se caso + subjunctive desde que a não ser que a menos que contanto que no caso de unless provided that",
  partizipialattribute: "formal relatives o qual cujo cuja quanto pelo que whose which indicative or subjunctive",
  nominalisierung: "nominalisation nominalization formal writing a realização decidir decisão nouns from verbs formal style",
  "nominale-praepositionen": "formal connectors devido a em virtude de no entanto não obstante por conseguinte a fim de mediante ao abrigo de due to nevertheless",
  "irreale-vergleiche": "como se nem que as if as though imperfect subjunctive pluperfect subjunctive unreal comparison",
  "futur-2": "non-finite clauses ao + infinitive gerund participle clauses ao chegar terminada a reunião",
  "es-korrelat": "emphasis cleft sentences foi a ana que o que preciso é de é aqui que focus",
  textkohaerenz: "cohesion reference ellipsis isso tal register coherence linking text writing formal letters",
  verbpraefixe: "prefixes derivation des- re- pré- in- sobre- contra- entre- hyphen word formation",
  "nutzen-benutzen": "ser estar advanced changing meaning ser bom estar bom aborrecido rico vivo events a festa é na sexta",
  "verben-als-nomen": "subjunctive wishes feelings quero que espero que tenho pena que oxalá tomara hope want",
  "artikel-oder-nicht": "article or no article gosto de café tenho carro é médica falo português o pedro a minha mãe zero article without article",
};

// A Landeskunde topic's search words: its keywords (kulturKeywords.js), its eyebrow
// („Liebe & Beziehung") and the vocab words it teaches, articles dropped.
const kulturHay = (topic, base) => [
  base,
  KULTUR_KEYWORDS[topic.id] ?? "",
  (topic.eyebrow ?? "").replace(/&/g, " "),
  ...(topic.vocab ?? []).map((v) => v.word.replace(/^(der|die|das|sich) |\//g, " ")),
].join(" ").replace(/\s+/g, " ").trim().toLowerCase();

// A set's words for matching: lemma and each English gloss, articles and "to " dropped.
const lernsetCardsWords = (id) =>
  all()
    .filter((w) => w.unit === id)
    .flatMap((w) => [w.lemma, ...String(w.en ?? "").split(/[,;/()]/)])
    .map((x) => x.replace(/^\s*(der|die|das|to)\s+/i, "").trim())
    .filter(Boolean);

/** Word rows: [lemma, gender, plural, en, level, href, pos]. */
export const WORD_COLUMNS = ["lemma", "gender", "plural", "en", "level", "href", "pos"];

export function buildSearchIndex() {
  const topics = [
    ...grammarCatalog.map((t) => ({
      t: t.name,
      s: subtitles[t.key] ?? "",
      k: KEYWORDS[t.key] ?? "",
      l: t.level,
      h: t.href,
      c: "grammatik",
    })),
    // akkusativ has its own page outside the catalog's [id] route.
    { t: "Akkusativ", s: "", k: KEYWORDS.akkusativ, l: "A1", h: "/pronomes-complemento", c: "grammatik" },
    { t: "Conjugation trainer", s: "Grammar", k: "conjugation verbs tenses drill trainer conjugar verbos irregular subjunctive imperative", l: "", h: "/gramatica/conjugacao", c: "grammatik" },
    ...conjugationTrainer.sets.map((s) => ({
      t: s.title,
      s: "Conjugation trainer",
      k: `conjugation ${s.id.replace(/-/g, " ")}`,
      l: s.level,
      h: `/gramatica/conjugacao?set=${s.id}`,
      c: "grammatik",
    })),
    ...praepTrainer.packs.map((p) => ({
      t: p.title ?? p.name,
      s: "Prepositions",
      k: "präpositionen prepositions",
      l: p.id.slice(0, 2).toUpperCase(),
      h: "/preposicoes",
      c: "praep",
    })),
    ...kultur.topics.map((k) => ({
      t: k.title,
      s: "Kultur",
      k: kulturHay(k, "culture cultura portugal"),
      l: k.level ?? "",
      h: itemPath("/cultura", k.id),
      c: "kultur",
    })),
    // „Deutschland von innen": matched on the same kind of keywords, so „Frau" or „Dating"
    // finds the topics about them, not only a title that happens to contain the word.
    ...kulturInsider.topics.map((k) => ({
      t: k.title,
      s: "Portugal from the inside",
      k: kulturHay(k, "culture portugal from the inside insider cultura"),
      l: k.level ?? "",
      h: itemPath("/cultura/por-dentro", k.id),
      c: "kultur",
    })),
  ];

  const pages = [...tools, ...exams].map((e) => ({
    t: e.title,
    s: e.desc ?? "",
    k: [e.short, e.id, e.keywords].filter(Boolean).join(" "),
    h: e.href,
  }));
  // Typische Fehler (/gramatica/erros-comuns) is a Nachschlagewerk page, not a catalog
  // topic: found by its pairs („man Mann", „seit seid") as well as by its name. Its
  // Tandembogen comes along for teachers who look for a pair sheet on it.
  const fehlerWords = [...new Set(fehlerPairs.flatMap((p) => [p.a.w, p.b.w]).map((w) => w.replace(/^(der|die|das) /, "")))].join(" ").toLowerCase();
  pages.push({
    t: "Typische Fehler",
    s: "Wörter, die man verwechselt: man oder Mann, das oder dass, seid oder seit",
    k: `typische fehler häufige fehler verwechseln verwechselt falsch richtig common mistakes confusing words ${fehlerWords}`,
    h: "/gramatica/erros-comuns",
  });
  pages.push({
    t: "Typische Fehler: Tandembogen",
    s: "Partnerübung zum Ausdrucken: fragen, antworten, mit Lösungsblatt",
    k: "typische fehler tandembogen tandem partnerübung partnerarbeit arbeitsblatt lehrkräfte unterricht ausdrucken worksheet pair work",
    h: "/professores/fichas/tandem/common-mistakes",
  });
  // The path to nationality: a guide page under the exam hub.
  pages.push({
    t: "Portuguese residence and nationality: CIPLE A2",
    s: "Who needs which language proof, who is exempt, and the steps in order",
    k: "portuguese nationality citizenship residence nacionalidade portuguesa autorização de residência aima irn ciple a2 language proof exempt how to become portuguese passport",
    h: "/nationality",
  });
  // The IMT driving deck: words for the driving course, the road and the paperwork.
  pages.push({
    t: "IMT driving vocabulary",
    s: "Portuguese words for the car, the road, signs, the driving exam, the paperwork and exchanging a foreign licence",
    k: "imt driving licence test theory exam portuguese portugal carta de condução código da estrada escola de condução carro estrada sinais trânsito road signs car words coima multa inspeção IUC pontos trocar a carta exchange foreign licence vocabulary",
    h: "/imt-vocabulary",
  });
  // Business Portuguese: phrases, model texts and exercises for office work.
  pages.push({
    t: "Business Portuguese",
    s: "Emails, phone calls, CVs, job interviews, meetings and negotiating in Portugal, B1 to C1",
    k: "business portuguese work office email formal letter exmo cumprimentos phone call chamada telefone cv currículo curriculum resume cover letter carta de apresentação candidatura job interview entrevista meeting reunião ordem de trabalhos negotiate negociação figures faturação presentation",
    h: "/business-portuguese",
  });
  // CIPLE, DEPLE or Celpe-Bras?: a comparison page under the exam hub.
  pages.push({
    t: "CIPLE, DEPLE or Celpe-Bras?",
    s: "Which Portuguese exam fits your purpose: residence, nationality, work, study, Brazil",
    k: "ciple deple celpe-bras caple compare difference which exam comparison residence nationality university work brazil price validity",
    h: "/exames/ciple-deple-celpe-bras",
  });
  // Prüfungsfallen (/exames/armadilhas): a page under the exam hub, not an exam of its own.
  pages.push({
    t: "Exam traps: CAPLE, level check, civics",
    s: "Parts of the exams with a catch, briefly explained, with an example and a task",
    k: "exam traps exam tips caple acesso ciple deple diple daple level check civics armadilhas exame conselhos reading listening writing speaking language use uso da língua",
    h: "/exames/armadilhas",
  });
  // Über mich (/sobre): who teaches behind the site.
  pages.push({
    t: "Über mich: Edgar Kretschmann",
    s: "Deutschlehrer seit 2015 – China, Korea, Philippinen, Deutschland",
    k: "über mich ueber mich edgar kretschmann lehrer lehrkraft gründer team wer about me teacher founder",
    h: "/sobre",
  });
  // The placement test is a hub tile (catalog.js), not one of the tools, so it needs its own row.
  pages.push({
    t: "Einstufungstest",
    s: "Wo stehst du? Höchstens acht Fragen, A1 bis B2",
    k: "einstufungstest einstufung einstufen test niveau niveautest sprachniveau level welches niveau habe ich mein niveau testen wo stehe ich deutschtest a1 a2 b1 b2 placement test level test what is my level",
    h: "/teste-de-nivel",
  });
  pages.push({
    t: "Stundenplan-Generator für Lehrkräfte",
    s: "Unterricht für einen Themenblock planen: Phasen, Zeiten, Aktivitäten, passende Übungen",
    k: "stundenplan unterrichtsplanung unterrichtsentwurf lehrplan verlaufsplan stunde planen lehrkräfte lehrer unterricht generator lesson plan teacher",
    h: "/professores/horario",
  });
  pages.push({
    t: "Course content A1–C1",
    s: "What do you learn in each course? Topics, goals and grammar per level",
    k: "course content syllabus portuguese course curriculum plan topics goals progression level a1 a2 b1 b2 c1 a1.1 a1.2 b2.1 what do i learn conteúdos curso de português",
    h: "/programa",
  });
  pages.push({
    t: "Einstufungstest für die Klasse",
    s: "Für Lehrkräfte: per QR-Code, mit dem Niveau jeder Person",
    k: "einstufungstest klasse klassentest thementest test erstellen lehrkräfte lehrer lehrerin unterricht kurs einstufung niveau einstufen grammatiktest prüfen ergebnisse schüler placement test teacher class test quiz results",
    h: "/professores/testes",
  });
  pages.push({
    t: "For teachers",
    s: "Worksheets, games, live quiz, class survey and lesson planning in one place",
    k: "teachers teacher teaching classroom class lesson material worksheets tutor professores professor inquérito inquerito sondagem lehrkräfte",
    h: "/professores",
  });
  pages.push({
    t: "Live quiz",
    s: "The whole group joins with a QR code: a grammar or vocabulary quiz in class",
    k: "live quiz live-quiz livequiz quiz class group qr code qr-code kahoot classroom teacher teachers projector beamer professores professor inquérito inquerito sondagem",
    h: "/professores/quiz",
  });
  pages.push({
    t: "Class survey",
    s: "Ask your class anonymously what they want to learn",
    k: "survey poll vote anonymous class teacher teachers classroom qr code professores professor inquérito inquerito sondagem",
    h: "/professores/inqueritos",
  });
  pages.push({
    t: "Country and culture",
    s: "Every culture topic at a glance",
    k: "culture country portugal all topics life in portugal lusophone world cultura",
    h: "/conhecimentos/pais-e-cultura",
  });
  pages.push({
    t: "Portugal from the inside",
    s: "How people in Portugal live, meet and talk",
    k: "culture portugal from the inside insider dating manners everyday life beijinhos café",
    h: "/cultura/por-dentro",
  });
  pages.push({
    t: "Portuguese around the world",
    s: "World map, language family, how close is your language?",
    k: "portuguese around the world where is portuguese spoken official language countries world map portuguese-speaking countries lusophone lusofonia cplp brazil angola mozambique cape verde guinea-bissau sao tome timor-leste macau equatorial guinea diaspora france luxembourg switzerland emigrants creole kriolu language family tree romance indo-european related languages cognates english portuguese word decoder false friends sprachen weltkarte",
    h: "/conhecimentos/linguas",
  });
  // The rest of the Nachschlagewerk: the overview, the three verb lists (found by their
  // verbs too: "warten auf" finds Verben mit Präpositionen) and the Wortarten.
  pages.push({
    t: "Nachschlagewerk",
    s: "Verbtabellen, Nomen in allen Fällen, Wortarten und mehr zum Nachschlagen",
    k: "nachschlagewerk nachschlagen nachschauen tabellen grammatik übersicht reference look up tables",
    h: "/consulta",
  });
  for (const [ref, d, k] of [
    ["starke-schwache-verben", starkSchwach, "starke verben schwache verben unregelmäßige verben strong verbs weak verbs irregular verbs vokalwechsel ablaut präteritum partizip stammformen"],
    ["trennbare-verben", trennbar, "trennbare verben untrennbare verben separable inseparable verbs präfix vorsilbe betonung"],
    ["verben-mit-praepositionen", verbPraep, "verben mit präpositionen verbs with prepositions präpositionalobjekt rektion"],
  ]) {
    const items = d.sections.flatMap((x) => x.items.filter((it) => typeof it !== "string").map((it) => it[0].replace(/[[\]|]/g, "")));
    pages.push({ t: d.title, s: d.description ?? "", k: `${k} ${items.join(" ")}`.toLowerCase(), h: refPath(ref) });
  }
  pages.push({
    t: "Wortarten",
    s: "Nomen, Verb, Adjektiv und Co.: was sie sind, woran du sie erkennst",
    k: "wortarten wortart word classes parts of speech nomen substantiv verb adjektiv adverb pronomen präposition konjunktion artikel zahlwort",
    h: "/gramatica/classes-de-palavras",
  });
  pages.push({
    t: "Accents: the map",
    s: "Accents of Portuguese in Portugal, and Portugal's other languages",
    k: "accents accent map dialects dialect portuguese accents regional accents portugal sotaque sotaques porto nortenho minho tras-os-montes transmontano coimbra beiras lisbon lisboa alentejo alentejano algarve algarvio azores acores acoriano sao miguel madeira madeirense binho pexe mirandese mirandes barranquenho minderico sign language lgp brazilian portuguese brazil angola mozambique cape verde guinea-bissau sao tome timor european portuguese dialekte",
    h: "/conhecimentos/acentos",
  });
  // Every Redemittel set (/vocabulario/expressoes/<id>), found by its name and its phrases.
  for (const set of redemittel.sets) {
    pages.push({
      t: `Useful phrases: ${set.name}`,
      s: `${set.phrases.length} phrases, e.g. “${set.phrases[0]?.de ?? ""}”`,
      k: `useful phrases frases ${set.id} ${set.name} ${set.phrases.map((p) => `${p.de} ${p.en ?? ""}`).join(" ")}`.toLowerCase(),
      h: itemPath("/vocabulario/expressoes", set.id),
    });
  }
  // Redewendungen & Sprichwörter: the hub and every phrase, found by its words, its meaning
  // and the English equivalent. Only once released (redewendungenData.js LIVE).
  if (RW_LIVE) {
    pages.push({
      t: "Redewendungen & Sprichwörter",
      s: "Was sie bedeuten, wann man sie sagt und woher sie kommen",
      k: "redewendung redewendungen sprichwort sprichwörter idiom idioms proverb proverbs redensart redensarten",
      h: "/conhecimentos/expressoes-idiomaticas",
    });
    for (const e of rwEintraege) {
      pages.push({ t: e.de, s: e.bedeutung, k: `${e.de} ${e.bedeutung} ${e.en} redewendung`.toLowerCase(), h: rwHref(e) });
    }
  }
  pages.push({
    t: "Umgangssprache, Slang und Schimpfwörter",
    s: "Wie man wirklich spricht – mit Hochdeutsch daneben und was man nie sagt",
    k: "umgangssprache slang jugendsprache jugendwort schimpfwörter schimpfwort fluchen vulgär beleidigung kurzformen haste biste nö gucken kriegen kohle bock krass digga alter chillen geil cringe lost zwo fuffzig mist scheiße colloquial swear words curse insults youth slang",
    h: "/conhecimentos/giria",
  });

  // A word links to its Lernset when that set has a page, else to the level's full list,
  // opened on the word's own card (?wort=, read by src/lib/wortschatz-app.js).
  const builtSets = new Set(
    lernsets({ status: "built" }).map((s) => s.id).filter((id) => lernsetCards(id).length > 0),
  );
  const words = all()
    .filter((w) => w.en != null && LEVELS.includes(w.level))
    .map((w) => [
      w.lemma,
      w.gender ?? "",
      w.plural ?? "",
      w.en,
      w.level,
      `${builtSets.has(w.unit) ? `/vocabulario/${w.unit}` : `/vocabulario/${w.level.toLowerCase()}`}?wort=${encodeURIComponent(w.id)}`,
      w.pos ?? "",
    ]);

  // Verb tables (/gramatica/verbos): [infinitive, preview, href, every form]. Every form
  // so that "tengo", "hizo" or "haga" also find their verb.
  const verbs = verbTables.map((v) => [
    v.inf,
    `${v.rows.slice(0, 3).map((r) => r.praes.f).join(", ")} … · ${v.rows[2].praet.f} · ${v.rows[2].perf.f}`,
    verbHref(v),
    v.forms.join("|"),
  ]);

  // Vokabelsets: [title, level, href, theme words, its words]. Its words (lemma and
  // English, "|"-joined) let "Fußball" or "valley" find the set; the overlay only matches
  // those from the start of a word, so short queries don't pull in every set.
  const sets = lernsets({ status: "built" })
    .filter((s) => builtSets.has(s.id))
    .map((s) => [
      s.title,
      s.level ?? "",
      `/vocabulario/${s.id}`,
      [s.moduleTitle ?? "", ...(s.topics ?? []), lernsetKeywords(s.id)].join(" ").replace(/&/g, " ").replace(/\s+/g, " ").trim(),
      [...new Set(lernsetCardsWords(s.id))].join("|"),
    ]);

  // Nachschlagewerk rows the other kinds don't cover: the verb lists, word classes and
  // Typische-Fehler pairs, each opening on its entry. [label, preview, href, kind]. Verbs
  // and nouns are left out: the verb tables and the words above already find those, and
  // the overlay shows a noun as a word hit.
  const refs = nachschlagenEntries({ nouns: false })
    .filter(([, , , kind]) => kind !== "verb")
    .map(([label, sub, href, kind]) => [label, sub, href, kind]);

  // Games: the hub and every released game, straight from gamesCatalog.js (port of
  // deutschacademy e219f2c0 ff.), so a new game is found at once with what it practises.
  // The printable class games come from the sitemap snapshot below.
  const tagName = Object.fromEntries(GAME_TAGS.map((t) => [t.id, t.name]));
  pages.push({
    t: `Games for learning ${GAMES_HUB.course}`,
    s: "All games: on your own or together, with the game of the day",
    h: GAMES_HUB.href,
    k: `games game play playing learning games game of the day all games ${GAMES_HUB.href.slice(1)} spiele`,
  });
  const gameHrefs = new Set(pages.map((p) => p.h));
  for (const g of soloGames) {
    if (gameHrefs.has(g.href)) continue;
    pages.push({
      t: `${g.title} – game`,
      s: g.hint,
      h: g.href,
      k: ["game", "play", g.id.replace(/-/g, " "), ...g.practises.map((p) => tagName[p] ?? p), ...g.levels].join(" ").toLowerCase(),
    });
  }

  // Pages without a data source of their own (scripts/build-suche-seiten.mjs reads them from
  // the sitemap): Berufe, Fertigkeiten, Prüfungen, Wortgeschichten, Spiele …
  // Only those not indexed above.
  const have = new Set(pages.map((p) => p.h));
  for (const p of seitenSuche) if (!have.has(p.h)) pages.push(p);
  // Zitat des Tages: found by every author, not by its 366 single quotes.
  const zitatHub = pages.find((p) => p.h === "/conhecimentos/citacoes");
  if (zitatHub) zitatHub.k = `${zitatHub.k ?? ""} zitat zitate ${Object.values(zitate.authors).map((a) => a.name).join(" ")}`.toLowerCase();
  return { topics, pages, words, verbs, sets, refs };
}
