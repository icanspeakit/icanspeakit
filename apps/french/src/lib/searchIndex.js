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

// Extra words per grammar topic key: the French terms a textbook uses, the English ones a
// learner searches for, and the forms themselves.
const KEYWORDS = {
  artikel: "articles article le la l' les un une des au aux du definite indefinite the a an gender elision",
  akkusativ: "direct object pronouns cod le la l' les me te nous vous object pronoun je le vois je la connais je l'ai vue",
  dativ: "indirect object pronouns coi lui leur me te nous vous je lui parle je leur téléphone parler à",
  plural: "plural plurals -s -x -aux les maisons chevaux yeux nouns adjectives silent s",
  "verb-position-2": "present -ir -re verbs finir vendre attendre je finis nous finissons je vends second group regular",
  praesens: "present tense présent regular verbs -er parler je parle tu parles conjugation endings beginner first group",
  konjugation: "irregular verbs present aller faire venir prendre mettre voir dire je vais je fais key verbs",
  imperativ: "imperative impératif commands orders parle ne parle pas donne-le-moi allez-y instructions",
  aduso: "linking words et ou mais parce que aussi and but or because conjunctions",
  wortarten: "parts of speech word classes noun verb adjective adverb pronoun preposition conjunction article number nom verbe adjectif",
  nomen: "nouns noun gender masculine feminine le la un une -tion -age -ment l'école l'hôtel nom",
  "ja-nein-fragen": "yes no questions est-ce que inversion intonation oui si non questions",
  "w-fragen": "question words qui que qu'est-ce que où quand comment combien pourquoi quel interrogatives wh questions",
  possessivartikel: "possessives possessive adjectives mon ma mes ton ta tes son sa ses notre votre leur my your his her",
  negation: "negation ne pas ne … pas n' not dropped ne in speech je ne sais pas",
  perfekt: "passé composé with avoir past tense j'ai mangé tu as fini participle participe passé perfect",
  modalverben: "modal verbs pouvoir vouloir devoir savoir il faut can want must have to know how to",
  satzstellung: "partitive articles du de la de l' des pas de beaucoup de un peu de some any quantity",
  wechselpraepositionen: "towns countries à en au aux à paris en france au maroc aux états-unis chez prepositions places",
  "trennbare-verben": "futur proche near future aller + infinitive je vais partir going to plans",
  "verben-praepositionen": "verbs with prepositions à de penser à avoir besoin de essayer de s'occuper de",
  adjektivdeklination: "adjective position beau bel belle nouveau nouvel vieux vieil grand homme propre before after noun meaning",
  "adjektivdeklination-a2": "adverbs -ment rapidement lentement bien mal bon bien manner adverbs well good",
  "als-oder-wenn": "quand or si when if whether difference",
  "indirekte-fragen": "indirect questions il demande si je ne sais pas où ce que ce qui reported questions",
  "infinitiv-mit-zu": "subjonctif présent present subjunctive forms que je parle que je finisse que j'aille que je sois subjunctive endings",
  "n-deklination": "imparfait imperfect je parlais j'étais j'avais used to habits descriptions past",
  genitiv: "possessive pronouns le mien la tienne les siens le nôtre mine yours his hers",
  "praeteritum-plusquamperfekt": "passé composé or imparfait telling a story narrative past tenses contrast perfect imperfect",
  relativpronomen: "relative pronouns qui que où dont who which that whose relative clauses",
  konjunktiv2: "si clauses conditional sentences si j'avais je ferais si j'avais su conditionnel passé if i had second third conditional",
  passiv: "passive voice être + participe passé par on se faire se vendre il a été construit",
  fokuspartikeln: "gérondif en + -ant en marchant participe présent while by doing",
  irgend: "n'importe qui n'importe quoi n'importe où n'importe quel anyone anything anywhere at all",
  negationswoerter: "negation ne plus ne jamais ne rien ne personne ne que no longer never nothing nobody",
  "nomen-verb-verbindungen": "collocations prendre une décision faire attention avoir envie porter plainte fixed verb noun",
  "partizip-als-adjektiv": "participle agreement accord du participe passé elle est partie je les ai vues elle s'est levée avoir preceding direct object",
  "zweiteilige-konnektoren": "subjunctive opinion doubt je ne pense pas que il est possible que je doute que indicative or subjunctive",
  konditionalsaetze: "real conditions si + présent first conditional s'il pleut je reste if",
  konsekutivsaetze: "concession bien que quoique même si si … que de sorte que sans que although even if so that",
  "zumal-wohingegen": "reported speech discours indirect concordance des temps il a dit qu'il viendrait indirect speech",
  modalsaetze: "plus-que-parfait pluperfect past perfect j'avais fini elle était partie had done",
  "reflexive-verben": "reflexive verbs pronominal verbs daily routine je me lève il se douche me te se nous vous se lever",
  "nebensaetze-weil-dass": "parce que car comme donc alors que clause je pense que because since so therefore",
  "komparativ-superlativ": "comparatives superlatives plus que moins que aussi que le plus meilleur mieux pire comparison",
  "lokale-praepositionen": "place prepositions sur sous devant derrière à côté de en face de entre ici là where",
  personalpronomen: "subject pronouns je tu il elle on nous vous ils elles tu or vous moi toi stressed pronouns",
  indefinitpronomen: "indefinites quelqu'un quelque chose tout chaque autre someone something every other",
  "temporale-praepositionen": "telling the time days quelle heure est-il il est huit heures à huit heures le lundi le matin clock days of the week",
  futur: "futur simple future je parlerai j'aurai je ferai plans predictions promises",
  "temporale-nebensaetze": "time clauses quand dès que pendant que avant de après quand + futur when as soon as while",
  "da-wo-woerter": "y and en pronouns j'y vais j'en ai il y en a there some of it",
  lassen: "faire + infinitive laisser + infinitive je fais réparer laisse-moi faire causative have something done let",
  modalpartikeln: "discourse markers bon ben enfin quoi du coup voilà bref fillers spoken french",
  "adjektive-mit-praepositionen": "adjectives with prepositions content de fier de prêt à capable de fixed preposition",
  "konnektoren-grund-gegengrund": "linkers pourtant cependant en revanche donc ainsi however yet therefore contrast",
  finalsaetze: "purpose pour + infinitive pour que + subjunctive afin de in order to so that",
  "passiv-b1": "demonstrative pronouns celui celle ceux celles celui-ci celle-là the one this one",
  "zusammengesetzte-verben": "passé composé with être je suis allé elle est partie agreement aller venir naître movement verbs",
  "wortbildung-nomen": "word formation suffixes prefixes -tion -age -ment -eur -euse -ette re- dé-",
  "welcher-dieser": "demonstratives ce cet cette ces quel quelle this that which",
  ordinalzahlen: "ordinal numbers premier deuxième dates le premier mai floors au deuxième étage",
  zahlen: "numbers un deux soixante-dix quatre-vingts septante nonante prices euros phone numbers counting",
  "adjektive-nach-sein": "adjective agreement feminine plural grand grande grands petite describing gender number",
  gern: "aimer adorer préférer détester j'aime le café j'aime nager like love prefer hate",
  "praeteritum-sein-haben": "être avoir to be to have je suis j'ai tu es tu as most important verbs",
  "berufe-mit-in": "il y a c'est il est there is there are c'est or il est il est médecin",
  "konjunktiv2-hoeflich": "polite requests je voudrais pourriez-vous est-ce que je peux j'aimerais please would could",
  komposita: "être en train de venir de just right now present continuous recent past",
  positionsadverbien: "frequency toujours souvent parfois rarement jamais adverb position how often always usually never",
  "temporale-praepositionen-b1": "depuis il y a pendant pour en dans since for ago how long",
  "infinitiv-ohne-zu": "infinitive or subjunctive je veux partir je veux que tu partes same subject different subject",
  positionsverben: "verbs like plaire manquer à plaire à falloir rester tu me manques ça me plaît",
  "adjektive-als-nomen": "ce qui ce que ce dont le plus important c'est what the thing that",
  "funktionen-von-werden": "conditionnel présent conditional je voudrais j'aimerais tu devrais would advice polite wishes",
  zustandspassiv: "double object pronouns pronoun order je le lui donne il m'en parle two pronouns",
  "relativsaetze-was-wo": "lequel laquelle auquel duquel relative pronouns after prepositions subjunctive in relative clauses",
  "konjunktiv-1": "subjonctif passé past subjunctive bien qu'il soit parti que j'aie fini sequence of tenses",
  "subjektive-modalverben": "modal nuance il aurait dû il a dû il doit être journalistic conditional selon la police il aurait",
  passiversatz: "conditions without si à condition que pourvu que à moins que au cas où unless provided that in case",
  partizipialattribute: "participle clauses ayant terminé une fois la réunion terminée participe passé composé formal writing",
  nominalisierung: "nominalisation nominalization formal writing décider la décision nouns from verbs formal style",
  "nominale-praepositionen": "formal connectors en raison de à l'égard de néanmoins toutefois or due to nevertheless",
  "irreale-vergleiche": "comme si quand bien même as if as though even if unreal comparison",
  "futur-2": "futur antérieur future perfect j'aurai fini quand tu seras arrivé will have done",
  "es-korrelat": "cleft sentences emphasis c'est … qui c'est … que ce que … c'est ce qui focus",
  textkohaerenz: "cohesion reference celui-ci ce dernier le premier le second register coherence linking text writing",
  verbpraefixe: "passé simple literary past il fut elle vint ils parlèrent reading recognise books",
  "nutzen-benutzen": "confusable verbs savoir connaître visiter rendre visite amener apporter emmener emporter",
  "verben-als-nomen": "subjunctive wishes feelings il faut que je veux que je suis content que j'ai peur que",
  "artikel-oder-nicht": "article or no article j'aime le café je n'ai pas de voiture elle est médecin zero article",
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
    { t: "Conjugation trainer", s: "Grammar", k: "conjugation conjugaison verbs verbes tenses temps drill trainer irregular subjunctive subjonctif imperative impératif passé composé avoir être agreement accord", l: "", h: "/grammar/conjugation", c: "grammatik" },
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
      s: "Culture",
      k: kulturHay(k, "culture france french culture"),
      l: k.level ?? "",
      h: itemPath("/culture", k.id),
      c: "kultur",
    })),
    // „Deutschland von innen": matched on the same kind of keywords, so „Frau" or „Dating"
    // finds the topics about them, not only a title that happens to contain the word.
    ...kulturInsider.topics.map((k) => ({
      t: k.title,
      s: "France from the inside",
      k: kulturHay(k, "culture france from the inside insider everyday life"),
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
    t: "Common mistakes: words people mix up",
    s: "a or à, ou or où, ce or se: French words that are easy to mix up, side by side",
    k: `common mistakes typical mistakes confusing words mix up wrong right homophones ${fehlerWords}`,
    h: "/grammar/common-mistakes",
  });
  pages.push({
    t: "Common mistakes: tandem sheet",
    s: "Pair work to print: ask, answer and check each other, with answers",
    k: "common mistakes tandem sheet pair work worksheet print teachers class",
    h: "/teachers/worksheets/tandem/common-mistakes",
  });
  // The path to nationality: a guide page under the exam hub.
  pages.push({
    t: "French residence card and nationality: language level and civic exam",
    s: "Which language level and civic exam each step asks for, who may be exempt, and the steps in order",
    k: "french nationality naturalisation citizenship residence titre de séjour carte de résident multi-year card tcf irn b1 b2 civic exam examen civique exempt contrat d integration republicaine ofii décret how to become french",
    h: "/residence-and-nationality",
  });
  // The code de la route deck: words for the driving course, the road and the paperwork.
  pages.push({
    t: "Code de la route vocabulary",
    s: "French words for the car, the road, signs, the driving exam and the paperwork",
    k: "code de la route driving licence test theory exam french france permis de conduire auto-école voiture route panneaux circulation amende contrôle technique carte grise points échange de permis road signs car words vocabulary",
    h: "/code-de-la-route-vocabulary",
  });
  // Business French: phrases, model texts and exercises for office work.
  pages.push({
    t: "Business French",
    s: "Emails, phone calls, CVs, job interviews, meetings and negotiating in France, B1 to C1",
    k: "business french work office email e-mail courriel formal letter phone call appel téléphone cv curriculum resume cover letter lettre de motivation candidature job interview entretien d'embauche meeting réunion compte rendu negotiate négociation figures chiffres presentation madame monsieur cordialement salutations distinguées vous tu",
    h: "/business-french",
  });
  // DELF, TCF or TEF?: a comparison page under the exam hub.
  pages.push({
    t: "DELF, TCF or TEF?",
    s: "Which French exam fits your purpose: residence card, nationality, Canada, university or work",
    k: "delf dalf tcf tef tcf irn tcf canada tef canada compare difference which exam comparison residence card titre de séjour nationality naturalisation canada immigration university work price validity",
    h: "/exams/delf-tcf-or-tef",
  });
  // Prüfungsfallen (/exams/traps): a page under the exam hub, not an exam of its own.
  pages.push({
    t: "Exam traps: DELF, DALF, TCF, TEF",
    s: "Parts of the exams with a catch, briefly explained, with an example and a task",
    k: "exam traps exam tips delf dalf tcf tef civic exam pièges examen conseils reading listening writing speaking language in use structures de la langue",
    h: "/exams/traps",
  });
  // About me (/about): who teaches behind the site.
  pages.push({
    t: "About me: Edgar Kretschmann",
    s: "Language teacher since 2015: China, Korea, the Philippines, Germany",
    k: "about me edgar kretschmann teacher founder team who",
    h: "/about",
  });
  // The placement test is a hub tile (catalog.js), not one of the tools, so it needs its own row.
  pages.push({
    t: "Placement test",
    s: "Where do you stand? A short test from A1 to C1",
    k: "placement test level test what is my level find my level french test niveau test de niveau a1 a2 b1 b2 c1",
    h: "/placement-test",
  });
  pages.push({
    t: "Lesson plan generator for teachers",
    s: "Plan lessons for a topic block: stages, timings, activities and matching exercises",
    k: "lesson plan lesson planning timetable generator teacher teachers class course plan stages",
    h: "/teachers/timetable",
  });
  pages.push({
    t: "Course content A1–C1",
    s: "What do you learn in each course? Topics, goals and grammar per level",
    k: "course content syllabus french course curriculum plan topics goals progression level a1 a2 b1 b2 c1 a1.1 a1.2 b2.1 what do i learn programme cours de français",
    h: "/syllabus",
  });
  pages.push({
    t: "Placement test for your class",
    s: "For teachers: via a QR code, with each person's level",
    k: "placement test class test topic test create teacher teachers course level grammar test results students quiz",
    h: "/teachers/tests",
  });
  pages.push({
    t: "Country and culture",
    s: "Every culture topic at a glance",
    k: "culture country france all topics life in france francophone world civic exam",
    h: "/knowledge/country-and-culture",
  });
  pages.push({
    t: "France from the inside",
    s: "How people in France really live, meet and talk",
    k: "culture france from the inside insider greetings la bise meal times tu vous neighbours friendship everyday life manners",
    h: "/culture/insider",
  });
  pages.push({
    t: "French around the world",
    s: "World map, language family, how close is your language?",
    k: "french around the world where is french spoken official language countries world map french-speaking countries francophonie francophone africa canada quebec belgium switzerland luxembourg haiti senegal maghreb morocco algeria tunisia overseas france louisiana language family tree romance indo-european related languages cognates english french word decoder false friends sprachen weltkarte",
    h: "/knowledge/languages",
  });
  // The rest of the Nachschlagewerk: the overview, the three verb lists (found by their
  // verbs too: "warten auf" finds Verben mit Präpositionen) and the Wortarten.
  pages.push({
    t: "Reference",
    s: "Verb tables, verbs and parts of speech to look up",
    k: "reference look up tables grammar overview verb tables",
    h: "/reference",
  });
  for (const [ref, d, k] of [
    ["starke-schwache-verben", starkSchwach, "regular verbs irregular verbs spelling change verbs past participle passé composé avoir être forms"],
    ["trennbare-verben", trennbar, "reflexive verbs pronominal verbs se s' daily routine"],
    ["verben-mit-praepositionen", verbPraep, "verbs with prepositions verbs with à verbs with de no preposition"],
  ]) {
    const items = d.sections.flatMap((x) => x.items.filter((it) => typeof it !== "string").map((it) => it[0].replace(/[[\]|]/g, "")));
    pages.push({ t: d.title, s: d.description ?? "", k: `${k} ${items.join(" ")}`.toLowerCase(), h: refPath(ref) });
  }
  pages.push({
    t: "Parts of speech",
    s: "Noun, verb, adjective and the others: what they are and how to recognise them",
    k: "parts of speech word classes noun verb adjective adverb pronoun preposition conjunction article number nom verbe adjectif",
    h: "/grammar/parts-of-speech",
  });
  pages.push({
    t: "Accents: the map",
    s: "Accents of French in France, and France's regional languages",
    k: "accents accent map dialects dialect french accents regional accents regional french france paris ch'ti nord picardy normandy lorraine alsace lyon marseille toulouse bordeaux midi southern accent accent du midi corsica chocolatine pain au chocolat serpillière wassingue panosse oil oc langue d'oc langue d'oïl regional languages breton occitan alsatian corsican basque catalan gallo franco-provençal quebec acadia belgium switzerland septante nonante huitante africa maghreb antilles dialekte",
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
      t: "Idioms and proverbs",
      s: "What they mean, when to say them and where they come from",
      k: "idiom idioms proverb proverbs sayings expressions expressions idiomatiques",
      h: "/knowledge/idioms",
    });
    for (const e of rwEintraege) {
      pages.push({ t: e.de, s: e.bedeutung, k: `${e.de} ${e.bedeutung} ${e.en} idiom`.toLowerCase(), h: rwHref(e) });
    }
  }
  pages.push({
    t: "Informal French and slang",
    s: "How people really talk in France, with standard French next to it and what never to say",
    k: "informal french slang colloquial spoken french verlan swear words youth slang bosser kiffer ouf fric boulot truc mec meuf relou chelou t'as y a",
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
  // so that "prends", "fait" or "fasse" also find their verb.
  const verbs = verbTables.map((v) => [
    v.inf,
    `${v.rows.slice(0, 3).map((r) => (r.praes.el ? `j'${r.praes.f}` : r.praes.f)).join(", ")} … · ${v.rows[2].perf.f} · ${v.rows[2].fut.f}`,
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
