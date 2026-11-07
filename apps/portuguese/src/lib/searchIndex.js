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

// Extra words per grammar topic key: the Spanish terms a textbook uses, the English ones a
// learner searches for, and the forms themselves.
const KEYWORDS = {
  artikel: "articles article el la los las un una unos unas al del definite indefinite the a an gender",
  akkusativ: "direct object pronouns lo la los las me te nos os personal a leísmo le object pronoun veo a ana la veo",
  dativ: "indirect object pronouns le les me te nos os se lo doy se lo dije two objects le doy",
  plural: "plural plurals -s -es z ces canción canciones joven jóvenes lápices nouns adjectives",
  "verb-position-2": "ser estar basics to be soy eres es estoy estás está who what where how permanent temporary",
  praesens: "present tense presente regular verbs -ar -er -ir conjugation hablo comes vive endings beginner",
  konjugation: "irregular verbs present ser estar ir tener hacer venir yo tengo hago salgo pongo conozco key verbs",
  imperativ: "imperative imperativo commands orders habla no hables dímelo hablad vosotros usted ustedes instructions",
  aduso: "linking words y e o u pero porque también tampoco and but or because conjunctions",
  wortarten: "parts of speech word classes noun verb adjective adverb pronoun preposition conjunction article number sustantivo adjetivo",
  nomen: "nouns noun gender masculine feminine el la -o -a día mano problema foto sustantivo",
  "ja-nein-fragen": "yes no questions negation no short answers sí preguntas ¿…?",
  "w-fragen": "question words qué quién dónde adónde cuándo cómo cuánto por qué accents interrogatives wh questions",
  possessivartikel: "possessives possessive adjectives mi tu su nuestro vuestro de my your his her",
  negation: "negation negatives no nunca tampoco nada nadie ninguno double negation not never nothing nobody",
  perfekt: "pretérito perfecto present perfect he comido has llegado haber participle hoy ya todavía no esta semana",
  modalverben: "verb + infinitive tener que hay que poder deber querer saber must can have to should modal verbs",
  satzstellung: "muy mucho poco bastante demasiado very much many little enough too quantity",
  wechselpraepositionen: "a en going and being voy a madrid estoy en madrid de a desde hasta prepositions movement place",
  "trennbare-verben": "ir a infinitive near future voy a llamar going to periphrastic future plans",
  "verben-praepositionen": "verbs with prepositions pensar en soñar con depender de acordarse de tardar en régimen preposicional",
  adjektivdeklination: "adjective position short forms buen gran primer algún un gran hombre un hombre grande apócope before after noun",
  "adjektivdeklination-a2": "adverbs -mente rápidamente bien mal bueno malo manner adverbs well good",
  "als-oder-wenn": "por para difference por o para for purpose reason cause destination",
  "indirekte-fragen": "indirect questions reporting dice que me pregunta si no sé dónde reported speech present",
  "infinitiv-mit-zu": "present subjunctive presente de subjuntivo forms hable coma viva tenga vaya sea subjunctive endings",
  "n-deklination": "pretérito imperfecto imperfect antes vivía era iba used to habits descriptions past",
  genitiv: "possessive pronouns el mío la tuya los suyos mine yours his hers",
  "praeteritum-plusquamperfekt": "indefinido imperfecto telling a story narrative past tenses contrast preterite imperfect",
  relativpronomen: "relative clauses que donde lo que who which that relative pronoun indicative",
  konjunktiv2: "imperfect subjunctive imperfecto de subjuntivo -ra -se quería que vinieras hablara tuviera fuera",
  passiv: "passive se pasiva refleja se alquila piso impersonal se ser participle fue construido se dice",
  fokuspartikeln: "verbs of change ponerse volverse hacerse quedarse convertirse en to become get",
  irgend: "accidental se involuntary se me olvidó se le ha roto se nos acabó i forgot it broke",
  negationswoerter: "probability conjecture future of probability serán las tres habrá salido estaría cansado future perfect conditional perfect guess",
  "nomen-verb-verbindungen": "collocations tomar una decisión echar de menos dar un paseo hacer caso poner una queja fixed verb noun",
  "partizip-als-adjektiv": "estar + participle la tienda está cerrada irregular participles abierto roto escrito hecho result state",
  "zweiteilige-konnektoren": "subjunctive opinion doubt no creo que es posible que dudo que no es verdad que indicative or subjunctive",
  konditionalsaetze: "real conditions si + present first conditional si llueve me quedo en casa if",
  konsekutivsaetze: "concession consequence aunque + subjunctive por mucho que tan que de modo que although even if so that",
  "zumal-wohingegen": "reported speech estilo indirecto tense shifts dijo que vendría me pidió que fuera indirect speech",
  modalsaetze: "unreal conditions si tuviera compraría si hubiera second conditional third conditional if i had imperfect subjunctive conditional",
  "reflexive-verben": "reflexive verbs pronominal daily routine me levanto se ducha me te se nos os levantarse",
  "nebensaetze-weil-dass": "porque como así que por eso creo que dice que because since so therefore that clause",
  "komparativ-superlativ": "comparatives superlatives más que menos que tan como el más -ísimo mejor peor mayor menor comparison",
  "lokale-praepositionen": "place en encima de debajo de al lado de delante de enfrente de aquí ahí allí where prepositions of place",
  personalpronomen: "subject pronouns yo tú él ella usted nosotros vosotros ellos ustedes tú or usted dropping the pronoun pronouns",
  indefinitpronomen: "indefinites algo nada alguien nadie algún ningún otro some any someone nobody something nothing",
  "temporale-praepositionen": "telling the time days qué hora es es la una a las ocho el lunes por la mañana clock days of the week",
  futur: "futuro simple future hablaré tendré podré haré plans predictions promises",
  "temporale-nebensaetze": "time clauses cuando en cuanto hasta que cuando llegues when as soon as until subjunctive after cuando",
  "da-wo-woerter": "pronouns after prepositions para mí sin ti conmigo contigo mí ti with me",
  lassen: "verbal periphrases acabar de volver a empezar a dejar de seguir llevar gerund just again stop keep",
  modalpartikeln: "discourse markers pues bueno o sea es que vamos venga vale fillers spoken spanish",
  "adjektive-mit-praepositionen": "adjectives with prepositions harto de capaz de contento con interesado en fixed preposition",
  "konnektoren-grund-gegengrund": "linkers aunque sin embargo además en cambio por lo tanto although however moreover therefore contrast",
  finalsaetze: "purpose para + infinitive para que + subjunctive in order to so that",
  "passiv-b1": "pluscuamperfecto pluperfect past perfect había comido habías había had done",
  "zusammengesetzte-verben": "pretérito indefinido preterite simple past hablé comí fui tuve hice estuve dije ayer",
  "wortbildung-nomen": "word formation suffixes -ción -dad -miento -ero -era -ería diminutive -ito -illo",
  "welcher-dieser": "demonstratives este ese aquel esta esa aquella esto eso this that",
  ordinalzahlen: "ordinal numbers primer tercer primero segundo dates el 3 de mayo floors el segundo piso",
  zahlen: "numbers uno un una veintiún cien ciento prices euros phone numbers counting",
  "adjektive-nach-sein": "adjectives agreement position una casa blanca los coches nuevos gender number describing",
  gern: "gustar me gusta me gustan a mí también a mí tampoco like likes",
  "praeteritum-sein-haben": "stem-changing verbs e ie o ue e i u ue quiero puedo pido juego radical boot verbs",
  "berufe-mit-in": "hay está están there is there are hay or estar",
  "konjunktiv2-hoeflich": "polite requests puede me pone quería me gustaría te importa please would could",
  komposita: "estar + gerund gerundio estoy trabajando leyendo durmiendo present continuous right now",
  positionsadverbien: "frequency siempre a menudo a veces casi nunca soler suelo how often always usually never",
  "temporale-praepositionen-b1": "desde desde hace hace que hasta durante llevar since for ago how long",
  "infinitiv-ohne-zu": "infinitive or subjunctive quiero ir quiero que vayas same subject different subject",
  positionsverben: "verbs like gustar encantar interesar doler molestar parecer quedar me duele me encanta",
  "adjektive-als-nomen": "lo + adjective lo bueno lo importante es lo que neuter the good thing",
  "funktionen-von-werden": "condicional simple conditional hablaría me gustaría yo que tú would advice polite wishes",
  zustandspassiv: "perfecto or indefinido hoy he ido ayer fui present perfect or preterite spain latin america past",
  "relativsaetze-was-wo": "relative clauses subjunctive prepositions busco a alguien que sepa el piso en el que vivo quien",
  "konjunktiv-1": "sequence of tenses subjunctive pluperfect subjunctive hubiera hecho hubiese consecutio temporum",
  "subjektive-modalverben": "modal periphrases deber deber de tener que haber de venir a llegar a must probably",
  passiversatz: "conditions without si de + infinitive como + subjunctive a no ser que siempre que con tal de que unless provided that",
  partizipialattribute: "formal relatives el cual la cual lo cual cuyo cuya whose which indicative or subjunctive",
  nominalisierung: "nominalisation nominalization formal writing decidir decisión nouns from verbs formal style",
  "nominale-praepositionen": "formal connectors debido a a raíz de en virtud de no obstante por consiguiente due to nevertheless",
  "irreale-vergleiche": "como si ni que as if as though imperfect subjunctive pluperfect subjunctive unreal comparison",
  "futur-2": "non-finite clauses al + infinitive gerund participle clauses al llegar terminada la reunión viendo que",
  "es-korrelat": "emphasis cleft sentences fue ana quien lo que necesito es es aquí donde focus",
  textkohaerenz: "cohesion reference ellipsis lo ello register coherence linking text writing",
  verbpraefixe: "prefixes derivation des- re- pre- in- sobre- contra- word formation",
  "nutzen-benutzen": "ser estar advanced changing meaning ser listo estar listo aburrido malo events la fiesta es en",
  "verben-als-nomen": "subjunctive wishes feelings quiero que espero que me alegra que ojalá hope want",
  "artikel-oder-nicht": "article or no article me gusta el café tengo coche es médica hablo español zero article without article",
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
    { t: "Conjugation trainer", s: "Grammar", k: "conjugation verbs tenses drill trainer conjugar verbos irregular subjunctive imperative", l: "", h: "/grammar/conjugation", c: "grammatik" },
    ...conjugationTrainer.sets.map((s) => ({
      t: s.title,
      s: "Conjugation trainer",
      k: `conjugation ${s.id.replace(/-/g, " ")}`,
      l: s.level,
      h: `/grammar/conjugation?set=${s.id}`,
      c: "grammatik",
    })),
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
      k: kulturHay(k, "culture cultura spain españa"),
      l: k.level ?? "",
      h: itemPath("/culture", k.id),
      c: "kultur",
    })),
    // „Deutschland von innen": matched on the same kind of keywords, so „Frau" or „Dating"
    // finds the topics about them, not only a title that happens to contain the word.
    ...kulturInsider.topics.map((k) => ({
      t: k.title,
      s: "Spain from the inside",
      k: kulturHay(k, "culture spain from the inside insider cultura españa"),
      l: k.level ?? "",
      h: itemPath("/culture/insider", k.id),
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
    h: "/teachers/worksheets/tandem/common-mistakes",
  });
  // The path to nationality: a guide page under the exam hub.
  pages.push({
    t: "Spanish nationality by residence: CCSE and DELE A2",
    s: "How many years, who needs which test, who is exempt, and the steps in order",
    k: "spanish nationality citizenship residence nacionalidad española residencia ccse dele a2 exempt dispensa oath jura registro civil how to become spanish passport",
    h: "/nationality",
  });
  // The DGT driving deck: words for the driving course, the road and the paperwork.
  pages.push({
    t: "DGT driving vocabulary",
    s: "Spanish words for the car, the road, signs, the driving exam and the paperwork",
    k: "dgt driving licence test theory exam spanish spain carné de conducir permiso autoescuela coche carretera señales tráfico road signs car words multa itv puntos canje vocabulary",
    h: "/dgt-vocabulary",
  });
  // Business Spanish: phrases, model texts and exercises for office work.
  pages.push({
    t: "Business Spanish",
    s: "Emails, phone calls, CVs, job interviews, meetings and negotiating in Spain, B1 to C1",
    k: "business spanish work office email correo formal letter phone call llamada cv currículum curriculum resume cover letter carta de presentación job interview entrevista meeting reunión negotiate negociación figures presentation estimado atentamente",
    h: "/business-spanish",
  });
  // DELE or SIELE?: a comparison page under the exam hub.
  pages.push({
    t: "DELE or SIELE?",
    s: "Which Spanish exam fits your purpose: nationality, university or work",
    k: "dele siele compare difference which exam comparison nationality university work price validity diferencia nacionalidad",
    h: "/exams/dele-or-siele",
  });
  // Prüfungsfallen (/exams/traps): a page under the exam hub, not an exam of its own.
  pages.push({
    t: "Exam traps: DELE, SIELE, CCSE",
    s: "Parts of the exams with a catch, briefly explained, with an example and a task",
    k: "exam traps exam tips dele siele ccse trampas examen consejos reading listening writing speaking language use uso de la lengua",
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
    t: "Course content A1–C1",
    s: "What do you learn in each course? Topics, goals and grammar per level",
    k: "course content syllabus spanish course curriculum plan topics goals progression level a1 a2 b1 b2 c1 a1.1 a1.2 b2.1 what do i learn contenidos curso de español",
    h: "/syllabus",
  });
  pages.push({
    t: "Einstufungstest für die Klasse",
    s: "Für Lehrkräfte: per QR-Code, mit dem Niveau jeder Person",
    k: "einstufungstest klasse klassentest thementest test erstellen lehrkräfte lehrer lehrerin unterricht kurs einstufung niveau einstufen grammatiktest prüfen ergebnisse schüler placement test teacher class test quiz results",
    h: "/teachers/tests",
  });
  pages.push({
    t: "Country and culture",
    s: "Every culture topic at a glance",
    k: "culture country spain all topics life in spain hispanic world cultura españa",
    h: "/knowledge/country-and-culture",
  });
  pages.push({
    t: "Spain from the inside",
    s: "How people in Spain live, meet and talk",
    k: "culture spain from the inside insider dating manners everyday life sobremesa",
    h: "/culture/insider",
  });
  pages.push({
    t: "Spanish around the world",
    s: "World map, language family, how close is your language?",
    k: "spanish around the world where is spanish spoken official language countries world map spanish-speaking countries latin america hispanic world language family tree romance indo-european related languages cognates english spanish word decoder false friends puerto rico equatorial guinea united states ladino sprachen weltkarte",
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
    t: "Accents: the map",
    s: "Accents of Spanish in Spain, and Spain's other languages",
    k: "accents accent map dialects dialect spanish accents regional accents spain andaluz andalusian canario canarian murciano extremeño castellano castilian madrid seville cadiz seseo ceceo distincion yeismo leismo laismo voseo ustedes vosotros guagua catalan valencian galician basque euskera aranese asturian aragonese co-official languages mexican caribbean andean rioplatense chilean latin america dialekte",
    h: "/knowledge/accents",
  });
  // Every Redemittel set (/vocabulary/phrases/<id>), found by its name and its phrases.
  for (const set of redemittel.sets) {
    pages.push({
      t: `Useful phrases: ${set.name}`,
      s: `${set.phrases.length} phrases, e.g. “${set.phrases[0]?.de ?? ""}”`,
      k: `useful phrases frases ${set.id} ${set.name} ${set.phrases.map((p) => `${p.de} ${p.en ?? ""}`).join(" ")}`.toLowerCase(),
      h: itemPath("/vocabulary/phrases", set.id),
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
      `/vocabulary/${s.id}`,
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
  const zitatHub = pages.find((p) => p.h === "/knowledge/quotes");
  if (zitatHub) zitatHub.k = `${zitatHub.k ?? ""} zitat zitate ${Object.values(zitate.authors).map((a) => a.name).join(" ")}`.toLowerCase();
  return { topics, pages, words, verbs, sets, refs };
}
