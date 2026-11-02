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
import { refPath } from "./routes.js";
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

// Extra words per grammar topic key: the German terms a textbook uses, the English ones a
// learner coming from an English course uses, and the forms themselves.
const KEYWORDS = {
  artikel: "der die das genus geschlecht gender article artikel bestimmter unbestimmter ein eine",
  akkusativ: "akkusativ accusative den einen wen direct object kasus fall case",
  dativ: "dativ dative dem der einem mir dir ihm wem indirect object kasus fall case",
  plural: "plural mehrzahl plural endings -e -er -n -s umlaut",
  "verb-position-2": "verb-position-2 verb auf position 2 verbzweitstellung aussagesatz hauptsatz satzbau wortstellung satzstellung position 1 position 2 subjekt zeitangabe inversion verb second verb-second word order main clause statement sentence structure declarative clause",
  praesens: "präsens present tense gegenwart konjugation konjugation a1 konjugieren verben konjugieren verb endungen ich du er einfach anfänger regelmäßige verben sein haben ich bin du bist ich habe conjugation beginner simple present",
  konjugation: "konjugation conjugation verb tabelle zeiten tenses präsens präteritum perfekt futur",
  imperativ: "imperativ imperative befehl aufforderung bitte komm kommen sie",
  aduso: "aduso aduso regel aduso-regel konnektoren position 0 und aber oder denn sondern konjunktion konjunktionen hauptsätze verbinden komma vor aber sondern statt aber conjunctions and but or because",
  wortarten: "wortarten wortart word classes parts of speech nomen substantiv verb adjektiv adverb pronomen präposition konjunktion artikel trennbare verben trennbar separable verbs",
  nomen: "nomen noun nouns substantiv hauptwort was ist ein nomen großschreibung groß schreiben capital letter artikel der die das person tier sache ort idee -ung -heit -keit -chen",
  "ja-nein-fragen": "ja nein fragen yes no questions doch entscheidungsfrage",
  "w-fragen": "w-fragen fragewort question words wer was wo wann wie warum woher wohin",
  possessivartikel: "possessiv possessive mein dein sein ihr unser euer",
  negation: "negation verneinung nicht kein keine negative not no",
  perfekt: "perfekt past tense vergangenheit partizip ii haben sein gemacht gegangen present perfect",
  modalverben: "modalverben modal verbs müssen können dürfen sollen wollen mögen möchten",
  satzstellung: "satzstellung wortstellung word order verb position 2 position2 position zwei zweite position zweite stelle verb an zweiter stelle verbzweitstellung v2 position 1 vorfeld mittelfeld satzende satzklammer verbklammer satzbrücke satzbau inversion verb second second position",
  wechselpraepositionen: "wechselpräpositionen two-way prepositions wo wohin in an auf über unter vor hinter neben zwischen dativ akkusativ",
  "trennbare-verben": "trennbare verben separable verbs präfix aufstehen anrufen einkaufen",
  "verben-praepositionen": "verben mit präpositionen verbs with prepositions warten auf denken an sich freuen über",
  adjektivdeklination: "adjektivdeklination adjective endings adjektiv endungen deklination signal signale signalendung signalendungen starke endung signal ending",
  "adjektivdeklination-a2": "adjektivendungen a2 signal signale signalendung signalendungen wer zeigt das signal signal ending adjektivdeklination a2 adjektivdeklination einfach adjektiv endungen adjektivendung adjektive deklinieren adjektiv vor nomen der neue tisch ein neuer tisch ein neues sofa einen neuen den neuen mit dem neuen nach ein nach der -e -en -er -es nominativ akkusativ dativ adjective endings a2 adjective declension beginner easy",
  "als-oder-wenn": "als wenn when nebensatz vergangenheit temporal",
  "indirekte-fragen": "indirekte fragen indirect questions ob wissen sie nebensatz",
  "infinitiv-mit-zu": "infinitiv mit zu um zu ohne zu anstatt zu infinitive",
  "n-deklination": "n-deklination weak nouns schwache nomen student kollege herr",
  genitiv: "genitiv genitive wessen whose des der wegen trotz während statt innerhalb außerhalb besitz",
  "praeteritum-plusquamperfekt": "präteritum plusquamperfekt simple past past tense past perfect vergangenheit war hatte",
  relativpronomen: "relativpronomen relativsatz relative clause pronoun der die das welcher",
  "konjunktiv2": "konjunktiv ii subjunctive würde hätte wäre wunsch höflich conditional",
  passiv: "passiv passive voice werden modalverb wird gemacht",
  fokuspartikeln: "fokuspartikeln auch nur sogar position",
  irgend: "irgend irgendwer irgendwo irgendwie irgendwann",
  negationswoerter: "negationswörter nie niemand nichts nirgends nicht mehr",
  "nomen-verb-verbindungen": "nomen-verb-verbindungen funktionsverbgefüge feste verbindungen",
  "partizip-als-adjektiv": "partizip i partizip ii adjektiv participle",
  "zweiteilige-konnektoren": "zweiteilige konnektoren nicht nur sondern auch weder noch entweder oder sowohl als auch",
  konditionalsaetze: "falls sofern vorausgesetzt es sei denn wenn bedingung bedingungssatz konditionalsatz konditionalsätze voraussetzung ausnahme außer wenn im falle bei sollte konnektor nebensatz verb am ende if in case provided that unless condition exception requirement",
  konsekutivsaetze: "konsekutivsaetze konsekutivsatz folgesatz folge folgen sodass so dass derart solch folglich infolgedessen demnach also infolge genitiv konsequenz nebensatz verb am ende position 1 deshalb daher result consequence therefore consequently as a result so that such that",
  "zumal-wohingegen": "zumal wohingegen während insofern als jedoch hingegen dagegen grund zusatzgrund gegensatz einschränkung konnektor nebensatz verb am ende besides especially all the more since whereas while contrast restriction in this respect connector subordinate clause",
  modalsaetze: "modalsatz modalsätze indem dadurch dass ohne dass ohne zu anstatt dass statt dass mittel weg wie wodurch durch mit nominal modal means by doing manner clause without instead of how",
  "reflexive-verben": "reflexive verben reflexiv reflexive verbs reflexivpronomen reflexive pronoun sich mich mir dich dir uns euch myself yourself sich waschen sich freuen sich beeilen sich anziehen",
  "nebensaetze-weil-dass": "nebensatz nebensätze subordinate clause weil dass wenn because that if when verb am ende verb at the end satzende word order wortstellung konnektor komma denn",
  "komparativ-superlativ": "komparativ superlativ steigerung vergleich vergleichen comparative superlative comparison compare als wie so wie größer besser am besten mehr am meisten lieber am liebsten umlaut adjektiv adjective",
  "lokale-praepositionen": "lokale präpositionen ortsangabe woher wohin wo aus von zu nach in bei zum zur beim vom nach hause zu hause local prepositions place direction where from where to home",
  personalpronomen: "personalpronomen personal pronouns pronomen pronoun ich du er sie es wir ihr mich dich ihn uns euch mir dir ihm ihnen wie geht es dir akkusativ dativ accusative dative",
  indefinitpronomen: "indefinitpronomen indefinite pronouns man jemand niemand etwas nichts einer keiner welche jemanden jemandem niemanden niemandem someone anyone nobody no one something nothing one ones none ist jemand da gibt es etwas neues nichts neues hast du einen stift ja ich habe einen keinen",
  "temporale-praepositionen": "temporale präpositionen zeit präpositionen prepositions of time time wann when um am im in der nacht von bis seit ab vor nach uhrzeit uhr wochentag monat jahreszeit since from until ago",
  futur: "futur futur i future tense zukunft werden infinitiv ich werde wird wohl vermutung versprechen plan vorhersage will going to",
  "temporale-nebensaetze": "temporale nebensätze temporal clauses bevor nachdem während seit seitdem bis sobald before after while since until as soon as zeit konnektoren",
  "da-wo-woerter": "da-wörter wo-wörter darauf worauf damit womit daran woran darüber worüber dafür wofür davon wovon pronominaladverb präpositionaladverb auf wen mit wem sache person fragewort pronoun adverb where-words there-words what for about what",
  lassen: "lassen lässt ließ gelassen reparieren lassen veranlassen erlauben ersatzinfinitiv doppelter infinitiv infinitiv ohne zu let have something done allow leave causative",
  modalpartikeln: "modalpartikeln modal particles abtönungspartikeln partikel doch mal ja eben halt denn wohl schon ton höflich bitte flavoring particles tone",
  "adjektive-mit-praepositionen": "adjektive mit präpositionen adjectives with prepositions feste präposition fixed preposition stolz auf zufrieden mit abhängig von interessiert an froh über gewöhnt an bereit zu darauf dass worauf womit da-wort wo-wort",
  "konnektoren-grund-gegengrund": "weil da denn deshalb deswegen darum obwohl trotzdem aber grund gegengrund folge kausalsatz konzessivsatz konnektor nebensatz verb am ende because since therefore although nevertheless reason cause consequence connector",
  finalsaetze: "finalsatz finalsätze um zu damit wozu ziel zweck absicht final gleiches subjekt anderes subjekt purpose clause in order to so that what for goal",
  "passiv-b1": "passiv b1 vorgangspassiv passive voice werden partizip ii wird gebaut wurde gebaut ist gebaut worden worden geworden passiv präsens passiv präteritum passiv perfekt von dativ man",
  "zusammengesetzte-verben": "weg los zurück weiter fest mit weggehen wegwerfen wegfahren losgehen losfahren loslassen zurückkommen zurückgeben zurückrufen weitermachen weiterfahren weitersagen festhalten feststellen mitkommen mitbringen mitnehmen trennbare verben partikel separable verbs particle away back continue bus ist weg was ist los ich bin gleich zurück",
  "wortbildung-nomen": "wortbildung nomen suffix nachsilbe endung ung heit keit chen lein in er schaft ion ment um artikel diminutiv verkleinerung umlaut plural feminin word formation noun suffixes diminutive article ending",
  "welcher-dieser": "welcher welche welches welchen welchem dieser diese dieses diesen diesem jeder jede jedes which this that fragewort demonstrativartikel frageartikel artikelwort was für ein auswahl einkaufen pullover mantel choose shopping",
  "ordinalzahlen": "ordinalzahlen ordinalzahl ordnungszahlen datum erste zweite dritte wievielte stock stockwerk am dritten mai reihenfolge ordinal numbers date floor",
  "zahlen": "zahlen zahl zahlwort zahlen bis 1000 grundzahlen kardinalzahlen null eins zwei drei zwölf dreizehn zwanzig dreißig einundzwanzig hundert tausend preis preise euro cent telefonnummer hausnummer alter wie alt numbers counting cardinal numbers price phone number",
  "adjektive-nach-sein": "adjektive nach sein adjektiv prädikativ ohne endung ist klein groß schön teuer billig alt neu jung gegenteil gegensatz nicht sehr zu ganz werden bleiben adjectives after to be no ending opposites big small cheap expensive",
  "gern": "gern nicht gern ungern ja gern hobby hobbys freizeit gernhaben mögen ich mag spaß lieber am liebsten verb gern position like to enjoy doing don't like to hobbies",
  "praeteritum-sein-haben": "präteritum sein haben war warst waren wart hatte hattest hatten hattet vergangenheit gestern früher letzte woche vor zwei jahren wo warst du ich hatte keine zeit past tense was were had simple past",
  "berufe-mit-in": "berufe mit in lehrer lehrerin ärztin köchin kauffrau feuerwehrfrau krankenschwester krankenpflegerin weibliche berufsbezeichnung feminin endung -in -innen was sind sie von beruf ich bin ohne artikel female job titles profession occupation feminine ending",
  "konjunktiv2-hoeflich": "konjunktiv ii höflich bitten ratschlag ratschläge hätte gern ich hätte gern könnte könnten würde würden solltest sollten an deiner stelle würde ich höflichkeit amt arzt café polite request advice would could should please",
  "komposita": "zusammengesetzte nomen komposita kompositum haustür schreibtisch großstadt wortbildung letztes wort artikel plural fugenelement fuge nomen und nomen verb nomen adjektiv nomen compound nouns compound words last word decides article plural a2",
  "positionsadverbien": "oben unten vorne hinten drinnen draußen links rechts hier da dort hierher dorthin hin her rein raus rauf runter wo wohin woher ort richtung position direction adverb place where whereto here there up down inside outside left right",
  "temporale-praepositionen-b1": "temporale präpositionen b1 innerhalb außerhalb während bei beim nach vor seit bis zum zwischen über nacht übers wochenende frist genitiv zeit time prepositions within during while until between overnight deadline",
  "infinitiv-ohne-zu": "infinitiv ohne zu bare infinitive modalverben werden lassen sehen hören fühlen gehen fahren kommen bleiben lernen helfen versuchen anfangen vergessen zu oder nicht with without zu b1",
  "positionsverben": "positionsverben stellen stehen legen liegen setzen sitzen hängen stecken wohin wo position verben place put lay lie sit hang stand wechselpräpositionen akkusativ dativ perfekt präteritum regelmäßig unregelmäßig umzug wohnung büro",
  "adjektive-als-nomen": "adjektive als nomen substantivierte adjektive der bekannte die jugendliche der deutsche verwandte erwachsene angestellte kranke arbeitslose etwas neues nichts besonderes viel gutes wenig interessantes alles gute das beste adjectives as nouns nominalised adjectives",
  "funktionen-von-werden": "werden wird wurde würde geworden worden vollverb futur vermutung passiv konjunktiv funktionen become will would passive future assumption",
  zustandspassiv: "zustandspassiv vorgangspassiv passiv state passive statal passive sein partizip ii ist geöffnet ist geschlossen wird geöffnet war wurde worden ergebnis zustand vorgang",
  "relativsaetze-was-wo": "relativsätze relativsatz was wo wer worüber woran worauf wofür womit wovon alles was nichts was das beste was relative clause relative pronoun what where whoever",
  "konjunktiv-1": "konjunktiv i konjunktiv 1 indirekte rede redewiedergabe reported speech indirect speech subjunctive i habe sei werde könne ersatzform nachrichten zitat",
  "subjektive-modalverben": "subjektive modalverben subjective modal verbs vermutung assumption hörensagen hearsay behauptung claim muss dürfte könnte soll will angeblich wahrscheinlich vermutlich allegedly probably infinitiv perfekt gewusst haben",
  passiversatz: "passiversatz passiv ersatz ersatzformen sein zu haben zu sich lassen lässt sich bar lich lösbar machbar verständlich unvermeidbar ist zu lösen passive alternatives passive substitute can be done must be done c1",
  partizipialattribute: "partizipialattribut partizipialattribute erweitertes attribut erweiterte partizipien partizip i partizip ii zu partizip nominalphrase relativsatz umformen nominalstil participle attribute extended participle relative clause c1",
  nominalisierung: "nominalisierung nominalstil verbalstil nominalization nominal style verbal style substantivierung nomen aus verb -ung wegen trotz bei nach vor zur durch amtsdeutsch behördensprache wissenschaftssprache",
  "nominale-praepositionen": "nominale präpositionen genitiv präpositionen genitive prepositions aufgrund infolge angesichts mangels anlässlich bezüglich hinsichtlich zwecks ungeachtet zufolge dank because of according to due to regarding nominalstil",
  "irreale-vergleiche": "als ob als wenn irrealer vergleich irreale vergleiche konjunktiv ii als wäre als hätte tun als ob so tun als as if as though unreal comparison subjunctive",
  "futur-2": "futur ii futur 2 future perfect vollendete zukunft vermutung vergangenheit werden haben sein wird … haben wird gemacht haben bis dahin wohl bestimmt supposition",
  "es-korrelat": "es korrelat platzhalter vorfeld es gibt es regnet es geht um dass-satz expletive es dummy subject placeholder correlative pronoun anticipatory it there is",
  textkohaerenz: "textkohärenz textkohaerenz kohärenz kohäsion verweiswörter verweiswort satzverknüpfung verknüpfung zudem außerdem ferner darüber hinaus hingegen dagegen allerdings folglich somit demnach zunächst anschließend schließlich abschließend ersterer letzterer ersteres letzteres dieser jener dies pronominaladverb dafür damit darauf darüber gliederungssignale einleitend im folgenden thema rhema roter faden rezension kommentar text schreiben telc goethe c1 schriftlicher ausdruck coherence cohesion reference words connectors linking sentences discourse markers anaphora the former the latter",
  verbpraefixe: "verbpräfixe präfix trennbar untrennbar betonung übersetzen umfahren umgehen durch über um unter wieder voll partizip ge separable inseparable prefix stress verb prefixes",
  "nutzen-benutzen": "nutzen benutzen präfix suffix vorsilbe nachsilbe be- antworten beantworten bekommen kommen verstehen besuchen gehören gefallen einkaufen erwarten falsche freunde teilmenge schnittmenge euler prefix suffix use false friends become",
  "verben-als-nomen": "verben als nomen verb zu nomen nomen aus verben wortbildung substantivierung nominalisierung infinitiv als nomen das wandern die wanderung der wanderer -ung -ion -er -e beim zum artikel endung genus word formation verbal noun gerund noun from verb",
  "artikel-oder-nicht": "artikel oder nicht nullartikel null-artikel kein artikel ohne artikel artikellos bestimmter artikel unbestimmter artikel der oder ein ein oder kein fisch ein fisch der fisch kaffee ein kaffee beruf ohne artikel sie ist ärztin länder mit artikel die schweiz die türkei hunger haben zeit haben deutsch lernen auto fahren nach hause ein kilo äpfel aus holz kein nicht zero article no article without article omit article when no article definite article indefinite article the or a countable uncountable mass noun",
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
    { t: "Akkusativ", s: "", k: KEYWORDS.akkusativ, l: "A1", h: "/object-pronouns", c: "grammatik" },
    ...praepTrainer.packs.map((p) => ({
      t: p.title ?? p.name,
      s: "Prepositions",
      k: "präpositionen prepositions",
      l: p.id.slice(0, 2).toUpperCase(),
      h: "/prepositions",
      c: "praep",
    })),
    ...kultur.topics.map((k) => ({
      t: k.title,
      s: "Kultur",
      k: kulturHay(k, "kultur landeskunde culture"),
      l: k.level ?? "",
      h: `/culture/${k.id}`,
      c: "kultur",
    })),
    // „Deutschland von innen": matched on the same kind of keywords, so „Frau" or „Dating"
    // finds the topics about them, not only a title that happens to contain the word.
    ...kulturInsider.topics.map((k) => ({
      t: k.title,
      s: "The UK from the inside",
      k: kulturHay(k, "culture uk from the inside insider"),
      l: k.level ?? "",
      h: `/culture/insider/${k.id}`,
      c: "kultur",
    })),
  ];

  const pages = [...tools, ...exams].map((e) => ({
    t: e.title,
    s: e.desc ?? "",
    k: [e.short, e.id, e.keywords].filter(Boolean).join(" "),
    h: e.href,
  }));
  // Typische Fehler (/grammar/common-mistakes) is a Nachschlagewerk page, not a catalog
  // topic: found by its pairs („man Mann", „seit seid") as well as by its name. Its
  // Tandembogen comes along for teachers who look for a pair sheet on it.
  const fehlerWords = [...new Set(fehlerPairs.flatMap((p) => [p.a.w, p.b.w]).map((w) => w.replace(/^(der|die|das) /, "")))].join(" ").toLowerCase();
  pages.push({
    t: "Typische Fehler",
    s: "Wörter, die man verwechselt: man oder Mann, das oder dass, seid oder seit",
    k: `typische fehler häufige fehler verwechseln verwechselt falsch richtig common mistakes confusing words ${fehlerWords}`,
    h: "/grammar/common-mistakes",
  });
  pages.push({
    t: "Typische Fehler: Tandembogen",
    s: "Partnerübung zum Ausdrucken: fragen, antworten, mit Lösungsblatt",
    k: "typische fehler tandembogen tandem partnerübung partnerarbeit arbeitsblatt lehrkräfte unterricht ausdrucken worksheet pair work",
    h: "/teachers/worksheets/tandem/typische-fehler",
  });
  // Prüfungsfallen (/exams/traps): a page under the exam hub, not an exam of its own.
  pages.push({
    t: "Prüfungsfallen: DTZ und telc B1",
    s: "Stellen mit Haken in der Prüfung – kurz erklärt, mit Beispiel und Aufgabe",
    k: "prüfungsfallen pruefungsfallen fallen falle prüfung dtz telc b1 tipps fehler prüfungstipps hören lesen sprachbausteine schreiben sprechen exam traps exam tips",
    h: "/exams/traps",
  });
  // Über mich (/about): who teaches behind the site.
  pages.push({
    t: "Über mich: Edgar Kretschmann",
    s: "Deutschlehrer seit 2015 – China, Korea, Philippinen, Deutschland",
    k: "über mich ueber mich edgar kretschmann lehrer lehrkraft gründer team wer about me teacher founder",
    h: "/about",
  });
  // The placement test is a hub tile (catalog.js), not one of the tools, so it needs its own row.
  pages.push({
    t: "Einstufungstest",
    s: "Wo stehst du? Höchstens acht Fragen, A1 bis B2",
    k: "einstufungstest einstufung einstufen test niveau niveautest sprachniveau level welches niveau habe ich mein niveau testen wo stehe ich deutschtest a1 a2 b1 b2 placement test level test what is my level",
    h: "/placement-test",
  });
  pages.push({
    t: "Stundenplan-Generator für Lehrkräfte",
    s: "Unterricht für einen Themenblock planen: Phasen, Zeiten, Aktivitäten, passende Übungen",
    k: "stundenplan unterrichtsplanung unterrichtsentwurf lehrplan verlaufsplan stunde planen lehrkräfte lehrer unterricht generator lesson plan teacher",
    h: "/teachers/timetable",
  });
  pages.push({
    t: "Kursinhalte A1–C1",
    s: "Was lernst du in welchem Kurs? Themen, Lernziele und Grammatik pro Niveau",
    k: "kursinhalte kurs deutschkurs kursplan lehrplan curriculum themen lernziele progression niveau a1 a2 b1 b2 c1 a1.1 a1.2 b2.1 was lerne ich course content syllabus",
    h: "/syllabus",
  });
  pages.push({
    t: "Einstufungstest für die Klasse",
    s: "Für Lehrkräfte: per QR-Code, mit dem Niveau jeder Person",
    k: "einstufungstest klasse klassentest thementest test erstellen lehrkräfte lehrer lehrerin unterricht kurs einstufung niveau einstufen grammatiktest prüfen ergebnisse schüler placement test teacher class test quiz results",
    h: "/teachers/tests",
  });
  pages.push({
    t: "Land und Kultur",
    s: "Alle Landeskunde-Themen auf einen Blick",
    k: "landeskunde land kultur deutschland alle themen leben in deutschland culture germany life",
    h: "/knowledge/country-and-culture",
  });
  pages.push({
    t: "Deutschland von innen",
    s: "Wie Menschen in Deutschland leben, lieben und wählen",
    k: "landeskunde deutschland von innen insider liebe beziehung dating frau mann politik alltag",
    h: "/culture/insider",
  });
  pages.push({
    t: "English around the world",
    s: "World map, language family, how close is your language?",
    k: "english around the world where is english spoken official language countries world map english-speaking countries commonwealth language family tree indo-european germanic related languages cognates german english word decoder sound shift singlish pidgin creole sprachen weltkarte",
    h: "/knowledge/languages",
  });
  // The rest of the Nachschlagewerk: the overview, the three verb lists (found by their
  // verbs too: "warten auf" finds Verben mit Präpositionen) and the Wortarten.
  pages.push({
    t: "Nachschlagewerk",
    s: "Verbtabellen, Nomen in allen Fällen, Wortarten und mehr zum Nachschlagen",
    k: "nachschlagewerk nachschlagen nachschauen tabellen grammatik übersicht reference look up tables",
    h: "/reference",
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
    h: "/grammar/parts-of-speech",
  });
  pages.push({
    t: "Nomen in allen Fällen",
    s: "Deklinationstabellen: Nominativ, Akkusativ, Dativ, Genitiv – Singular und Plural",
    k: "deklination deklinieren nomen substantiv fälle fall kasus nominativ akkusativ dativ genitiv singular plural der den dem des ein einen einem eines declension noun cases case table",
    h: "/grammar/deklination",
  });
  pages.push({
    t: "Accents: the map",
    s: "Accents of English in the UK and Ireland",
    k: "accents accent map dialects dialect british accents regional accents uk ireland scouse geordie brummie cockney mancunian yorkshire west country estuary multicultural london english glaswegian scottish english welsh english irish english ulster bath trap foot strut bus rhotic hello hiya ey up alright bread roll barm cob bap dialekte",
    h: "/knowledge/accents",
  });
  // Every Redemittel set (/vocabulary/phrases/<id>), found by its name and its phrases.
  for (const set of redemittel.sets) {
    pages.push({
      t: `Redemittel: ${set.name}`,
      s: `${set.phrases.length} Sätze mit Audio, z. B. „${set.phrases[0]?.de ?? ""}“`,
      k: `redemittel sätze phrases ${set.id} ${set.name} ${set.phrases.map((p) => `${p.de} ${p.en ?? ""}`).join(" ")}`.toLowerCase(),
      h: `/vocabulary/phrases/${set.id}`,
    });
  }
  // Redewendungen & Sprichwörter: the hub and every phrase, found by its words, its meaning
  // and the English equivalent. Only once released (redewendungenData.js LIVE).
  if (RW_LIVE) {
    pages.push({
      t: "Redewendungen & Sprichwörter",
      s: "Was sie bedeuten, wann man sie sagt und woher sie kommen",
      k: "redewendung redewendungen sprichwort sprichwörter idiom idioms proverb proverbs redensart redensarten",
      h: "/knowledge/idioms",
    });
    for (const e of rwEintraege) {
      pages.push({ t: e.de, s: e.bedeutung, k: `${e.de} ${e.bedeutung} ${e.en} redewendung`.toLowerCase(), h: rwHref(e) });
    }
  }
  pages.push({
    t: "Umgangssprache, Slang und Schimpfwörter",
    s: "Wie man wirklich spricht – mit Hochdeutsch daneben und was man nie sagt",
    k: "umgangssprache slang jugendsprache jugendwort schimpfwörter schimpfwort fluchen vulgär beleidigung kurzformen haste biste nö gucken kriegen kohle bock krass digga alter chillen geil cringe lost zwo fuffzig mist scheiße colloquial swear words curse insults youth slang",
    h: "/knowledge/slang",
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
      `${builtSets.has(w.unit) ? `/vocabulary/${w.unit}` : `/vocabulary/${w.level.toLowerCase()}`}?wort=${encodeURIComponent(w.id)}`,
      w.pos ?? "",
    ]);

  // Verb tables (/grammar/verbs): [infinitive, preview, href, every form]. Every form
  // so that "hat", "ging" or "gegangen" also find their verb.
  const verbs = verbTables.map((v) => [
    v.inf,
    `${v.rows.slice(0, 3).map((r) => r.praes.f).join(", ")} … · ${v.rows[2].praet.f} · ${v.rows[2].perf.f}`,
    verbHref(v),
    [...new Set(v.rows.flatMap((r) => [r.praes.f, r.praet.f, r.perf.f]).concat(v.p2))].join("|"),
  ]);

  // Vokabelsets: [title, level, href, theme words, its words]. Its words (lemma and
  // English, "|"-joined) let "Fußball" or "valley" find the set; the overlay only matches
  // those from the start of a word, so short queries don't pull in every set.
  const sets = lernsets({ status: "built" })
    .filter((s) => builtSets.has(s.id))
    .map((s) => [
      s.title,
      s.level ?? "",
      `/vocabulary/${s.id}`,
      [s.moduleTitle ?? "", ...(s.topics ?? []), lernsetKeywords(s.id)].join(" ").replace(/&/g, " ").replace(/\s+/g, " ").trim(),
      [...new Set(lernsetCardsWords(s.id))].join("|"),
    ]);

  // Nachschlagewerk rows the other kinds don't cover: the verb lists, word classes and
  // Typische-Fehler pairs, each opening on its entry. [label, preview, href, kind]. Verbs
  // and nouns are left out: the verb tables and the words above already find those, and
  // the overlay adds a noun's case table to its word hit itself.
  const refs = nachschlagenEntries({ nouns: false })
    .filter(([, , , kind]) => kind !== "verb")
    .map(([label, sub, href, kind]) => [label, sub, href, kind]);

  // Pages without a data source of their own (scripts/build-suche-seiten.mjs reads them from
  // the sitemap): Berufe, Fertigkeiten, Prüfungen, Führerschein, Wortgeschichten, Spiele …
  // Only those not indexed above.
  const have = new Set(pages.map((p) => p.h));
  for (const p of seitenSuche) if (!have.has(p.h)) pages.push(p);
  // Zitat des Tages: found by every author, not by its 366 single quotes.
  const zitatHub = pages.find((p) => p.h === "/knowledge/quotes");
  if (zitatHub) zitatHub.k = `${zitatHub.k ?? ""} zitat zitate ${Object.values(zitate.authors).map((a) => a.name).join(" ")}`.toLowerCase();
  return { topics, pages, words, verbs, sets, refs };
}
