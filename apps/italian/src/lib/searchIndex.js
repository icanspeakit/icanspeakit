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
import starkSchwach from "../data/nachschlagen/starke-schwache-verben.json";
import trennbar from "../data/nachschlagen/trennbare-verben.json";
import verbPraep from "../data/nachschlagen/verben-mit-praepositionen.json";

const workspaceMods = import.meta.glob("../data/grammatik/*.json", { eager: true });
const subtitles = Object.fromEntries(
  Object.values(workspaceMods).map((m) => m.default ?? m).map((w) => [w.slug ?? w.id, w.subtitle ?? ""]),
);

// Extra words per grammar topic key: the Italian terms a textbook uses, the English ones a
// learner searches for, and the forms themselves.
const KEYWORDS = {
  artikel: "articles article il lo la l' i gli le un uno una un' definite indefinite the a an gender articolo determinativo",
  akkusativ: "direct object pronouns lo la li le mi ti ci vi l' pronomi diretti lo vedo la chiamo ti ascolto object pronoun",
  dativ: "indirect object pronouns mi ti gli le ci vi loro pronomi indiretti gli do le scrivo to him to her",
  plural: "plural plurals -i -e -a plurale amico amici uomo uomini invariable nouns adjectives il libro i libri",
  "verb-position-2": "essere stare basics to be sono sei è sto stai sta come stai who what where permanent temporary",
  praesens: "present tense presente indicativo regular verbs -are -ere -ire parlo parli parla conjugation endings beginner",
  konjugation: "irregular verbs present andare avere dare dire fare uscire venire essere stare bere volere vado faccio dico esco vengo key verbs",
  imperativ: "imperative imperativo commands orders parla non parlare parli dimmelo dammi stammi zitto Lei tu voi",
  aduso: "linking words e o ma perché anche pure però and but or because conjunctions congiunzioni",
  wortarten: "parts of speech word classes noun verb adjective adverb pronoun preposition conjunction article parti del discorso",
  nomen: "nouns noun gender masculine feminine il la -o -a -e uomo mano problema foto sostantivo genere",
  "ja-nein-fragen": "yes no questions negation non short answers sì no domande intonation è vero",
  "w-fragen": "question words che cosa cosa chi dove quando come quanto perché quale interrogatives domande",
  possessivartikel: "possessives possessive adjectives il mio il tuo il suo il nostro il vostro il loro mia tua suo my your his her",
  negation: "negation negatives non mai niente nessuno neanche nemmeno né double negation not never nothing nobody",
  perfekt: "passato prossimo present perfect ho mangiato hai fatto avere participle ieri oggi già ancora non ho ancora",
  modalverben: "modal verbs potere volere dovere sapere bisogna posso devo voglio must can have to should",
  satzstellung: "molto poco troppo abbastanza tanto un po' di del dei very much many little enough too quantity",
  wechselpraepositionen: "prepositions with articles preposizioni articolate del dello della al allo alla dal nel sul nello sulla nei sui contractions",
  "trennbare-verben": "future plans domani parto vado a chiamare sto per uscire going to near future progetti",
  "verben-praepositionen": "verbs with prepositions pensare a sognare di dipendere da credere in aiutare a finire di smettere di",
  adjektivdeklination: "adjective position short forms buon gran bel un buon amico un bel ragazzo un grande uomo un uomo grande bello quello",
  "adjektivdeklination-a2": "adverbs -mente rapidamente bene male buono cattivo manner adverbs well good",
  "als-oder-wenn": "combined pronouns pronomi combinati me lo te la glielo ce ne gliela se lo order of pronouns",
  "indirekte-fragen": "indirect questions reporting dice che chiede se non so dove reported speech presente",
  "infinitiv-mit-zu": "present subjunctive congiuntivo presente forms parli scriva venga sia abbia subjunctive credo che",
  "n-deklination": "imperfetto imperfect da bambino abitavo era facevo used to habits descriptions past",
  genitiv: "verbal periphrases stare per finire di smettere di riuscire a cominciare a continuare a just about to stop keep",
  "praeteritum-plusquamperfekt": "trapassato prossimo past perfect avevo già mangiato ero già uscito had done before",
  relativpronomen: "relative clauses che cui il quale chi quello che who which that relative pronoun la persona di cui parlo",
  konjunktiv2: "congiuntivo imperfetto imperfect subjunctive volevo che venissi pensavo che fosse se fossi",
  passiv: "passive passivo si passivante è stato firmato si affittano stanze impersonal si venire andare dire",
  fokuspartikeln: "verbs of change diventare farsi rimanere restare finire per to become get stay end up",
  irgend: "gerundio participio gerund participle andando a casa avendo finito essendo stanco clauses",
  negationswoerter: "probability conjecture future of probability sarà avrà fatto sarebbe forse deve essere must be",
  "nomen-verb-verbindungen": "collocations prendere una decisione fare la fila dare una mano fare una domanda avere fretta",
  "partizip-als-adjektiv": "essere + participle il negozio è chiuso la finestra è aperta rotto stanco irregular participles",
  "zweiteilige-konnektoren": "subjunctive opinion doubt credo che sia vero penso che è possibile che dubito che non so se",
  konditionalsaetze: "real conditions se + present first conditional se piove resto a casa if periodo ipotetico",
  konsekutivsaetze: "concession consequence benché sebbene nonostante così che tanto che anche se although even though",
  "zumal-wohingegen": "reported speech discorso indiretto ha detto che sarebbe venuto mi ha chiesto di tense shifts",
  modalsaetze: "periodo ipotetico unreal conditions se avessi tempo verrei se avessi saputo sarei venuto second third conditional if",
  "reflexive-verben": "reflexive verbs verbi riflessivi daily routine mi alzo si lava mi sono svegliato ci laviamo",
  "nebensaetze-weil-dass": "perché siccome quindi allora dice che so che penso di sì because since so therefore that clauses",
  "komparativ-superlativ": "comparatives superlatives più di meno di più che come tanto quanto il più -issimo migliore peggiore meglio peggio",
  "lokale-praepositionen": "place a in da di sopra sotto accanto a davanti a dietro vicino a lontano da where prepositions of place",
  personalpronomen: "subject pronouns io tu lui lei Lei noi voi loro tu or Lei dropping the pronoun parlo italiano",
  indefinitpronomen: "indefinites qualcosa niente qualcuno nessuno qualche nessun altro ogni ognuno some any someone nobody something",
  "temporale-praepositionen": "telling the time days che ore sono è l'una sono le otto lunedì di mattina la mattina weekdays",
  futur: "futuro semplice future parlerò avrò sarò farò plans predictions promises domani",
  "temporale-nebensaetze": "time clauses quando appena dopo che mentre finché prima di prima che when as soon as until",
  "da-wo-woerter": "stressed pronouns per me con te senza di noi da loro pronomi tonici with me with you",
  lassen: "fare + infinitive faccio riparare la macchina lasciami parlare fare lasciare causative have something done let",
  modalpartikeln: "discourse markers allora dunque cioè insomma ecco magari mica mah boh fillers spoken italian",
  "adjektive-mit-praepositionen": "adjectives with prepositions stufo di contento di interessato a capace di felice di fiero di",
  "konnektoren-grund-gegengrund": "linkers anche se però tuttavia inoltre invece quindi perciò although however moreover therefore",
  finalsaetze: "purpose per + infinitive perché affinché + congiuntivo in order to so that",
  "passiv-b1": "ci and ne particles ci vado ci penso ne ho due ne parlo ci sono pronomi avverbiali",
  "zusammengesetzte-verben": "passato prossimo with essere sono andato è arrivata siamo usciti auxiliary essere or avere agreement",
  "wortbildung-nomen": "word formation suffixes -zione -tà -mento -ista -aio -eria diminutive -ino -etto -ina",
  "welcher-dieser": "demonstratives questo quello codesto this that quel quell' quei quegli bello",
  ordinalzahlen: "ordinal numbers primo secondo terzo dates il 3 maggio floors il secondo piano ordinali",
  zahlen: "numbers uno due tre venti cento mille prices euros phone numbers counting numeri",
  "adjektive-nach-sein": "adjectives agreement position una casa bianca le macchine nuove gender number describing aggettivi",
  gern: "piacere mi piace mi piacciono a me anche a me neanche a me like likes",
  "praeteritum-sein-haben": "essere and avere sono ho siamo abbiamo to be to have auxiliary verbs",
  "berufe-mit-in": "c'è ci sono dov'è ecco there is there are where is here is",
  "konjunktiv2-hoeflich": "polite requests posso può mi dà vorrei le dispiace per favore please would could condizionale",
  komposita: "stare + gerundio sto lavorando sto leggendo sto dormendo present continuous right now",
  positionsadverbien: "frequency sempre spesso a volte quasi mai di solito how often always usually never",
  "temporale-praepositionen-b1": "da per fa fra tra entro since for ago within how long da quanto tempo",
  "infinitiv-ohne-zu": "infinitive or subjunctive voglio partire voglio che tu parta same subject different subject",
  positionsverben: "verbs like piacere servire mancare bastare interessare sembrare dispiacere mi serve mi manca mi basta",
  "adjektive-als-nomen": "il + adjective il bello l'importante quello che ciò che neuter the good thing",
  "funktionen-von-werden": "condizionale presente conditional vorrei potresti io andrei would advice politeness",
  zustandspassiv: "passato prossimo or imperfetto ieri pioveva e sono rimasto a casa while interrupted action background",
  "relativsaetze-was-wo": "relative clauses with congiuntivo and prepositions cerco qualcuno che sappia l'appartamento in cui",
  "konjunktiv-1": "concordanza dei tempi sequence of tenses penso che sia pensavo che fosse credevo che avesse capito consecutio temporum",
  "subjektive-modalverben": "passato remoto fu ebbe disse nacque andarono historical past southern italy reading",
  passiversatz: "conditions without se qualora purché a meno che nel caso in cui volendo provided that unless in case",
  partizipialattribute: "formal relatives il quale il cui cui il che whose which indicative or subjunctive",
  nominalisierung: "nominalisation nominalization formal writing la presentazione della domanda il pagamento la scadenza nouns from verbs",
  "nominale-praepositionen": "formal connectors a causa di in virtù di ai sensi di tuttavia pertanto nondimeno bureaucratic",
  "irreale-vergleiche": "come se + congiuntivo as if as though unreal past se l'avessi saputo sarei venuto",
  "futur-2": "non-finite clauses finita la riunione vedendo che dopo aver mangiato participle gerund absolute",
  "es-korrelat": "emphasis cleft sentences è Anna che ha chiamato quello che mi serve è tempo focus",
  textkohaerenz: "cohesion reference ellipsis ciò quest'ultimo lo register coherence linking text writing",
  verbpraefixe: "prefixes derivation ri- dis- in- pre- sovra- contro- anti- suffixes -ino -one -accio word formation",
  "nutzen-benutzen": "sapere or conoscere portare or prendere andare venire partire uscire verbs often confused",
  "verben-als-nomen": "subjunctive wishes feelings voglio che spero che sono contento che mi dispiace che hope want",
  "artikel-oder-nicht": "article or no article ho fame sono medico parlo italiano zero article without article professions",
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
    { t: "Object pronouns", s: "", k: KEYWORDS.akkusativ, l: "A1", h: "/pronomi-complemento", c: "grammatik" },
    { t: "Conjugation trainer", s: "Grammar", k: "conjugation verbs tenses drill trainer coniugazione verbi irregular subjunctive imperative", l: "", h: "/grammatica/coniugazione", c: "grammatik" },
    ...conjugationTrainer.sets.map((s) => ({
      t: s.title,
      s: "Conjugation trainer",
      k: `conjugation ${s.id.replace(/-/g, " ")}`,
      l: s.level,
      h: `/grammatica/coniugazione?set=${s.id}`,
      c: "grammatik",
    })),
    ...praepTrainer.packs.map((p) => ({
      t: p.title ?? p.name,
      s: "Prepositions",
      k: "präpositionen prepositions",
      l: p.id.slice(0, 2).toUpperCase(),
      h: "/preposizioni",
      c: "praep",
    })),
    ...kultur.topics.map((k) => ({
      t: k.title,
      s: "Kultur",
      k: kulturHay(k, "culture cultura italy italia"),
      l: k.level ?? "",
      h: itemPath("/cultura", k.id),
      c: "kultur",
    })),
    // „Deutschland von innen": matched on the same kind of keywords, so „Frau" or „Dating"
    // finds the topics about them, not only a title that happens to contain the word.
    ...kulturInsider.topics.map((k) => ({
      t: k.title,
      s: "Italy from the inside",
      k: kulturHay(k, "culture italy from the inside insider cultura"),
      l: k.level ?? "",
      h: itemPath("/cultura/dietro-le-quinte", k.id),
      c: "kultur",
    })),
  ];

  const pages = [...tools, ...exams].map((e) => ({
    t: e.title,
    s: e.desc ?? "",
    k: [e.short, e.id, e.keywords].filter(Boolean).join(" "),
    h: e.href,
  }));
  // Typische Fehler (/grammatica/errori-comuni) is a Nachschlagewerk page, not a catalog
  // topic: found by its pairs („man Mann", „seit seid") as well as by its name. Its
  // Tandembogen comes along for teachers who look for a pair sheet on it.
  const fehlerWords = [...new Set(fehlerPairs.flatMap((p) => [p.a.w, p.b.w]).map((w) => w.replace(/^(der|die|das) /, "")))].join(" ").toLowerCase();
  pages.push({
    t: "Typische Fehler",
    s: "Wörter, die man verwechselt: man oder Mann, das oder dass, seid oder seit",
    k: `typische fehler häufige fehler verwechseln verwechselt falsch richtig common mistakes confusing words ${fehlerWords}`,
    h: "/grammatica/errori-comuni",
  });
  pages.push({
    t: "Typische Fehler: Tandembogen",
    s: "Partnerübung zum Ausdrucken: fragen, antworten, mit Lösungsblatt",
    k: "typische fehler tandembogen tandem partnerübung partnerarbeit arbeitsblatt lehrkräfte unterricht ausdrucken worksheet pair work",
    h: "/insegnanti/schede/tandem/common-mistakes",
  });
  // The path to nationality: a guide page under the exam hub.
  pages.push({
    t: "Italian citizenship and the long-term permit: language and civic requirements",
    s: "How many years, who needs which test, who is exempt, and the steps in order",
    k: "italian citizenship cittadinanza residence permesso di soggiorno long-term eu permit b1 a2 language certificate exempt oath giuramento how to become italian passport",
    h: "/cittadinanza",
  });
  // The patente deck: words for the driving course, the road and the paperwork.
  pages.push({
    t: "Patente vocabulary",
    s: "Italian words for the car, the road, signs, the driving exam and the paperwork",
    k: "patente driving licence test theory exam italian italy autoscuola motorizzazione macchina strada segnali stradali multa ztl revisione punti conversione patente straniera vocabulary",
    h: "/vocabolario-patente",
  });
  // Business Italian: phrases, model texts and exercises for office work.
  pages.push({
    t: "Business Italian",
    s: "Emails, phone calls, CVs, job interviews, meetings and negotiating in Italy, B1 to C1",
    k: "business italian work office email formal letter phone call telefonata cv curriculum resume cover letter lettera di presentazione job interview colloquio meeting riunione negotiate trattativa figures presentation gentile cordiali saluti",
    h: "/italiano-commerciale",
  });
  // CILS, CELI, PLIDA or CERT.IT?: a comparison page under the exam hub.
  pages.push({
    t: "CILS, CELI, PLIDA or CERT.IT?",
    s: "Which Italian exam fits your purpose: citizenship, residence permit, university or work",
    k: "cils celi plida certit compare difference which exam comparison citizenship cittadinanza permit university work price validity",
    h: "/esami/quale-esame",
  });
  // Prüfungsfallen (/esami/trappole): a page under the exam hub, not an exam of its own.
  pages.push({
    t: "Exam traps: CILS, CELI, PLIDA, CERT.IT",
    s: "Parts of the exams with a catch, briefly explained, with an example and a task",
    k: "exam traps exam tips cils celi plida certit trappole esame consigli reading listening writing speaking language use",
    h: "/esami/trappole",
  });
  // Über mich (/chi-siamo): who teaches behind the site.
  pages.push({
    t: "Über mich: Edgar Kretschmann",
    s: "Deutschlehrer seit 2015 – China, Korea, Philippinen, Deutschland",
    k: "über mich ueber mich edgar kretschmann lehrer lehrkraft gründer team wer about me teacher founder",
    h: "/chi-siamo",
  });
  // The placement test is a hub tile (catalog.js), not one of the tools, so it needs its own row.
  pages.push({
    t: "Einstufungstest",
    s: "Wo stehst du? Höchstens acht Fragen, A1 bis B2",
    k: "einstufungstest einstufung einstufen test niveau niveautest sprachniveau level welches niveau habe ich mein niveau testen wo stehe ich deutschtest a1 a2 b1 b2 placement test level test what is my level",
    h: "/test-di-livello",
  });
  pages.push({
    t: "Stundenplan-Generator für Lehrkräfte",
    s: "Unterricht für einen Themenblock planen: Phasen, Zeiten, Aktivitäten, passende Übungen",
    k: "stundenplan unterrichtsplanung unterrichtsentwurf lehrplan verlaufsplan stunde planen lehrkräfte lehrer unterricht generator lesson plan teacher",
    h: "/insegnanti/orario",
  });
  pages.push({
    t: "Course content A1–C1",
    s: "What do you learn in each course? Topics, goals and grammar per level",
    k: "course content syllabus italian course curriculum plan topics goals progression level a1 a2 b1 b2 c1 a1.1 a1.2 b2.1 what do i learn programma corso di italiano",
    h: "/programma",
  });
  pages.push({
    t: "Einstufungstest für die Klasse",
    s: "Für Lehrkräfte: per QR-Code, mit dem Niveau jeder Person",
    k: "einstufungstest klasse klassentest thementest test erstellen lehrkräfte lehrer lehrerin unterricht kurs einstufung niveau einstufen grammatiktest prüfen ergebnisse schüler placement test teacher class test quiz results",
    h: "/insegnanti/test",
  });
  pages.push({
    t: "For teachers",
    s: "Worksheets, games, live quiz, class survey and lesson planning in one place",
    k: "teachers teacher teaching classroom class lesson material worksheets tutor insegnanti insegnante docente sondaggio lehrkräfte",
    h: "/insegnanti",
  });
  pages.push({
    t: "Live quiz",
    s: "The whole group joins with a QR code: a grammar or vocabulary quiz in class",
    k: "live quiz live-quiz livequiz quiz class group qr code qr-code kahoot classroom teacher teachers projector beamer insegnanti insegnante docente sondaggio",
    h: "/insegnanti/quiz",
  });
  pages.push({
    t: "Class survey",
    s: "Ask your class anonymously what they want to learn",
    k: "survey poll vote anonymous class teacher teachers classroom qr code insegnanti insegnante docente sondaggio",
    h: "/insegnanti/sondaggi",
  });
  pages.push({
    t: "Country and culture",
    s: "Every culture topic at a glance",
    k: "culture country italy all topics life in italy italian world cultura italia",
    h: "/conoscenze/paese-e-cultura",
  });
  pages.push({
    t: "Italy from the inside",
    s: "How people in Italy live, meet and talk",
    k: "culture italy from the inside insider dating manners everyday life aperitivo",
    h: "/cultura/dietro-le-quinte",
  });
  pages.push({
    t: "Italian around the world",
    s: "Map of where Italian is spoken, language family, how close is your language?",
    k: "italian around the world where is italian spoken official language countries europe world map italian-speaking switzerland ticino san marino vatican istria slovenia croatia malta albania eritrea diaspora argentina brazil united states australia canada language family tree romance indo-european related languages cognates english italian word decoder false friends sprachen weltkarte",
    h: "/conoscenze/lingue",
  });
  // The rest of the Nachschlagewerk: the overview, the three verb lists (found by their
  // verbs too: "warten auf" finds Verben mit Präpositionen) and the Wortarten.
  pages.push({
    t: "Nachschlagewerk",
    s: "Verbtabellen, Nomen in allen Fällen, Wortarten und mehr zum Nachschlagen",
    k: "nachschlagewerk nachschlagen nachschauen tabellen grammatik übersicht reference look up tables",
    h: "/consultazione",
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
    h: "/grammatica/parti-del-discorso",
  });
  pages.push({
    t: "Accents: the map",
    s: "Regional varieties of Italian, and Italy's other languages",
    k: "accents accent map dialects dialect regional italian italiano regionale north south milan turin genoa venice bologna florence tuscan gorgia toscana rome romanesco naples neapolitan sicilian sicily sardinian sardinia friulian ladin venetian south tyrol german aosta valley french slovene arberesh albanian alghero catalan swiss italian ticino anguria cocomero watermelon passato remoto casa voiced s minority languages dialekte",
    h: "/conoscenze/accenti",
  });
  // Every Redemittel set (/vocabolario/espressioni/<id>), found by its name and its phrases.
  for (const set of redemittel.sets) {
    pages.push({
      t: `Useful phrases: ${set.name}`,
      s: `${set.phrases.length} phrases, e.g. “${set.phrases[0]?.de ?? ""}”`,
      k: `useful phrases frases ${set.id} ${set.name} ${set.phrases.map((p) => `${p.de} ${p.en ?? ""}`).join(" ")}`.toLowerCase(),
      h: itemPath("/vocabolario/espressioni", set.id),
    });
  }
  // Redewendungen & Sprichwörter: the hub and every phrase, found by its words, its meaning
  // and the English equivalent. Only once released (redewendungenData.js LIVE).
  if (RW_LIVE) {
    pages.push({
      t: "Redewendungen & Sprichwörter",
      s: "Was sie bedeuten, wann man sie sagt und woher sie kommen",
      k: "redewendung redewendungen sprichwort sprichwörter idiom idioms proverb proverbs redensart redensarten",
      h: "/conoscenze/modi-di-dire",
    });
    for (const e of rwEintraege) {
      pages.push({ t: e.de, s: e.bedeutung, k: `${e.de} ${e.bedeutung} ${e.en} redewendung`.toLowerCase(), h: rwHref(e) });
    }
  }
  pages.push({
    t: "Umgangssprache, Slang und Schimpfwörter",
    s: "Wie man wirklich spricht – mit Hochdeutsch daneben und was man nie sagt",
    k: "umgangssprache slang jugendsprache jugendwort schimpfwörter schimpfwort fluchen vulgär beleidigung kurzformen haste biste nö gucken kriegen kohle bock krass digga alter chillen geil cringe lost zwo fuffzig mist scheiße colloquial swear words curse insults youth slang",
    h: "/conoscenze/gergo",
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
      `${builtSets.has(w.unit) ? `/vocabolario/${w.unit}` : `/vocabolario/${w.level.toLowerCase()}`}?wort=${encodeURIComponent(w.id)}`,
      w.pos ?? "",
    ]);

  // Verb tables (/grammatica/verbi): [infinitive, preview, href, every form]. Every form
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
      `/vocabolario/${s.id}`,
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

  // Pages without a data source of their own (scripts/build-suche-seiten.mjs reads them from
  // the sitemap): Berufe, Fertigkeiten, Prüfungen, Wortgeschichten, Spiele …
  // Only those not indexed above.
  const have = new Set(pages.map((p) => p.h));
  for (const p of seitenSuche) if (!have.has(p.h)) pages.push(p);
  // Zitat des Tages: found by every author, not by its 366 single quotes.
  const zitatHub = pages.find((p) => p.h === "/conoscenze/citazioni");
  if (zitatHub) zitatHub.k = `${zitatHub.k ?? ""} zitat zitate ${Object.values(zitate.authors).map((a) => a.name).join(" ")}`.toLowerCase();
  return { topics, pages, words, verbs, sets, refs };
}
