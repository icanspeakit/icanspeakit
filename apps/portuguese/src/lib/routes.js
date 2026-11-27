// Every URL that is derived from a data id, in one place.
//
// A grammar topic sits at the top level (/por-para), because every topic name is unique and is
// what a learner would type. Everything with generic ids (listening, reading, culture, speaking,
// writing, the ~500 vocabulary sets) keeps one level of section, so "/a1-supermarket" can never
// collide with a topic added later.
//
// Ids, data file names and localStorage keys stayed German (content-plan §1.3, §6), because code
// and saved progress key on them. Only the URL is the course's: English, except proper names
// (/caple, /caple/ciple-a2) and the Portuguese grammar terms learners search for (/por-para,
// /gostar-de, /perfeito-simples, /estar-a-infinitive). Slugs per content-plan §3 and §8 (routes item).
// The site at /portugues is new, so there are no redirects from any earlier address (§7, §8).

/** Pages that are hubs or overviews — places you pass through, not places you resume. */
export const NOT_RESUMABLE = new Set(["/", "/exercicios", "/exames", "/progresso", "/gramatica", "/conhecimentos", "/professores", "/jogo",
  "/aviso-legal", "/privacidade", "/termos", "/teste-de-nivel", "/conta",
  "/compreensao-oral", "/leitura", "/escrita", "/expressao-oral", "/cultura", "/vocabulario", "/competencias"]);

// Grammar topics live at the top level (/<slug>). The key (the workspace's `slug ?? id`, what
// progress, lehrplan and verwandt use) stays; the URL follows content-plan §3 "New slug".
// topicPath(key) is the one way from a key to its URL.
export const TOPIC_SLUGS = {
  // A1
  nomen: "noun-gender", artikel: "articles", personalpronomen: "subject-pronouns",
  praesens: "present-regular", konjugation: "present-irregular",
  "praeteritum-sein-haben": "vowel-change-verbs", "verb-position-2": "ser-estar-basics",
  "berufe-mit-in": "ha-estar", "w-fragen": "question-words", "ja-nein-fragen": "yes-no-questions",
  plural: "plurals", "adjektive-nach-sein": "adjective-agreement", possessivartikel: "possessives",
  "welcher-dieser": "demonstratives", gern: "gostar-de", "temporale-praepositionen": "time-and-days",
  aduso: "e-ou-mas-porque", zahlen: "numbers", wortarten: "parts-of-speech",
  // A2
  perfekt: "perfeito-simples", "zusammengesetzte-verben": "perfeito-irregular", "n-deklination": "imperfeito",
  "trennbare-verben": "ir-infinitive", komposita: "estar-a-infinitive",
  "reflexive-verben": "reflexive-verbs", akkusativ: "object-pronouns",
  dativ: "indirect-object-pronouns", modalverben: "ter-de-poder",
  "komparativ-superlativ": "comparatives", "lokale-praepositionen": "prepositions-of-place",
  wechselpraepositionen: "a-para-em", indefinitpronomen: "indefinites", satzstellung: "muito-pouco",
  negation: "negation", "nebensaetze-weil-dass": "porque-como",
  "konjunktiv2-hoeflich": "polite-requests", positionsadverbien: "frequency-costumar",
  "adjektivdeklination-a2": "adverbs-mente", "artikel-oder-nicht": "article-or-not",
  ordinalzahlen: "ordinals-dates",
  // B1
  zustandspassiv: "perfeito-composto", "praeteritum-plusquamperfekt": "perfeito-vs-imperfeito",
  "passiv-b1": "mais-que-perfeito", futur: "future", "funktionen-von-werden": "conditional",
  imperativ: "imperative", "infinitiv-mit-zu": "present-subjunctive",
  "verben-als-nomen": "subjunctive-wishes", "infinitiv-ohne-zu": "infinitive-or-subjunctive",
  finalsaetze: "para-que", "temporale-nebensaetze": "quando-future-subjunctive",
  konditionalsaetze: "se-real", "als-oder-wenn": "por-para",
  "temporale-praepositionen-b1": "ha-desde", relativpronomen: "relative-clauses",
  "indirekte-fragen": "indirect-questions", lassen: "verbal-periphrases",
  "konnektoren-grund-gegengrund": "linkers", genitiv: "possessive-pronouns",
  adjektivdeklination: "adjective-position", "partizip-als-adjektiv": "estar-participle",
  "verben-praepositionen": "verbs-prepositions", "da-wo-woerter": "prepositional-pronouns",
  "nutzen-benutzen": "ser-estar-advanced", positionsverben: "verbs-like-apetecer",
  "wortbildung-nomen": "word-formation", "adjektive-als-nomen": "o-adjective",
  "clitic-placement": "clitic-placement",
  // B2
  konjunktiv2: "imperfect-subjunctive", modalsaetze: "se-unreal", passiv: "passive-and-se",
  "relativsaetze-was-wo": "relative-clauses-advanced", "zumal-wohingegen": "reported-speech",
  "zweiteilige-konnektoren": "subjunctive-opinion", konsekutivsaetze: "embora-subjunctive",
  negationswoerter: "personal-infinitive", irgend: "future-subjunctive-uses", fokuspartikeln: "verbs-of-change",
  modalpartikeln: "discourse-markers", "adjektive-mit-praepositionen": "adjectives-prepositions",
  "nomen-verb-verbindungen": "collocations",
  // C1
  "konjunktiv-1": "sequence-of-tenses", "es-korrelat": "cleft-sentences",
  passiversatz: "conditions-without-se", "futur-2": "non-finite-clauses",
  "irreale-vergleiche": "como-se", "subjektive-modalverben": "modal-periphrases",
  "nominale-praepositionen": "formal-connectors", nominalisierung: "nominalisation",
  partizipialattribute: "formal-relatives", textkohaerenz: "cohesion", verbpraefixe: "prefixes",
  mesoclise: "mesoclisis", "mais-que-perfeito-simples": "simple-pluperfect",
};
const TOPIC_KEYS = Object.fromEntries(Object.entries(TOPIC_SLUGS).map(([k, v]) => [v, k]));

/** A grammar topic's URL slug (English) from its key (German id / slug). Unknown keys pass through. */
export const topicSlug = (key) => TOPIC_SLUGS[key] ?? key;
/** A grammar topic's key from its URL slug. Unknown slugs pass through. */
export const topicKeyFromSlug = (slug) => TOPIC_KEYS[slug] ?? slug;
/** The page of a grammar topic. */
export const topicPath = (key) => `/${topicSlug(key)}`;
/** The page where a student types the PIN of a live practice round (src/pages/ao-vivo.astro). */
export const LIVE_JOIN_PATH = "/ao-vivo";

// The reference tables under /gramatica/<ref> (src/data/nachschlagen/<file>.json). The file
// names stayed; the URL is English.
export const REF_SLUGS = {
  "starke-schwache-verben": "verbos-irregulares",
  "trennbare-verben": "lista-de-verbos-reflexivos",
  "verben-mit-praepositionen": "verbos-com-preposicoes",
};
/** A reference table's URL slug from its file name. */
export const refSlug = (file) => REF_SLUGS[file] ?? file;
/** The page of a reference table. */
export const refPath = (file) => `/gramatica/${refSlug(file)}`;

// Teachers' worksheets and tandem sheets per topic: keyed like the topic (plus the
// reference sheets nachschlagen-<file>, verbtabellen, typische-fehler); the URL is English.
const SHEET_SLUGS = { verbtabellen: "verb-tables", "typische-fehler": "common-mistakes" };
/** A worksheet's URL slug from its key. */
export const sheetSlug = (key) =>
  String(key).startsWith("nachschlagen-") ? `reference-${refSlug(String(key).slice("nachschlagen-".length))}`
    : SHEET_SLUGS[key] ?? topicSlug(key);
/** The worksheet page of a topic key. */
export const sheetPath = (key) => `/professores/fichas/gramatica/${sheetSlug(key)}`;
/** The tandem (pair work) sheet of a topic key. */
export const tandemPath = (key) => `/professores/fichas/tandem/${sheetSlug(key)}`;
// Item pages under a section (content-plan §1.3: "kebab-case of the English title, keep any
// level prefix"). Keyed by the section's English path, then by the item's id, which stays
// the key in the data, in progress and in class-task refs (h:<id>, l:<id>, k:<id> …).
export const ITEM_SLUGS = {
  "/compreensao-oral": {
    "a1-ansage-bahnhof": "a1-station-announcement", "a1-anruf-arzt": "a1-health-centre-voicemail",
    "a1-supermarkt": "a1-supermarket", "a1-verabredung": "a1-arranging-to-meet",
    "a2-amt-termin": "a2-junta-appointment", "a2-wohnungsbesichtigung": "a2-flat-viewing",
    "a2-radio-wetter-verkehr": "a2-radio-weather-traffic", "a2-paketdienst": "a2-parcel-voicemails",
    "b1-krankmeldung": "b1-calling-in-sick", "b1-elterngespraech": "b1-tutor-meeting",
    "b1-radio-muelltrennung": "b1-radio-recycling", "b1-durchsage-ersatzverkehr": "b1-replacement-buses",
    "b2-diskussion-homeoffice": "b2-working-from-home-meeting", "b2-interview-anerkennung": "b2-degree-recognition-interview",
    "b2-beschwerde-versicherung": "b2-insurance-complaint", "b2-vortrag-ehrenamt": "b2-volunteering-talk",
  },
  "/leitura": {
    "a1-schilder-im-haus": "a1-notices-in-flats", "a1-nachricht-einladung": "a1-text-invitation",
    "a2-wohnungsanzeigen": "a2-flat-adverts", "a2-email-kurs-absage": "a2-language-school-email",
    "b1-digitales-buero": "b1-paperless-office", "b1-anzeigen": "b1-matching-notices",
    "b1-zeitungsartikel": "b1-local-news-article", "b1-forumsbeitraege": "b1-forum-posts",
    "b2-artikel-homeoffice": "b2-teleworking-article", "b2-kommentare-innenstadt": "b2-car-free-town-centre",
  },
  "/escrita": {
    "a1-formular-anmeldung": "a1-sports-centre-form", "a1-nachricht-absage": "a1-cant-come",
    "a2-email-nachbarn": "a2-email-to-neighbour", "a2-formular-arztpraxis": "a2-health-centre-form",
    "a2-email-school": "a2-email-to-school",
    "b1-email-landlord": "b1-email-to-landlady", "b1-email-employer": "b1-time-off-email",
    "b1-formular-vhs": "b1-completing-a-form", "b1-brief-david": "b1-reply-to-tiago",
    "b1-fehlerjagd": "b1-error-hunt", "b2-beschwerde-reiseveranstalter": "b2-holiday-complaint",
  },
  "/expressao-oral": {
    "a1-sich-vorstellen": "a1-introducing-yourself", "a1-bild-bahnhof": "a1-picture-station",
    "a1-bild-kueche": "a1-picture-kitchen", "a1-bild-supermarkt": "a1-picture-supermarket",
    "a1-bild-spielplatz": "a1-picture-park", "a2-bild-gartenarbeit": "a2-picture-outdoor-work",
    "a2-bild-bus": "a2-picture-tram", "a2-bild-nachbarschaftsfest": "a2-picture-garden-meal",
    "a2-bild-wartezimmer": "a2-picture-doctors", "b1-bild-rolltreppe": "b1-picture-park",
    "b1-bild-bewerbungsgespraech": "b1-picture-job-interview", "b1-bild-werkstatt": "b1-picture-workshop",
    "b1-bild-buergeramt": "b1-picture-front-desk", "b2-vortrag-ehrenamt": "b2-talk-volunteering",
    "b2-diskussion-ehrenamt-schule": "b2-discussion-volunteering-school", "b2-planen-abschiedsfeier": "b2-planning-leaving-party",
    "b2-bild-wochenmarkt": "b2-picture-market", "b2-bild-videokonferenz": "b2-picture-video-call",
    "b2-bild-baustelle-innenstadt": "b2-picture-building-work", "b2-bild-wertstoffhof": "b2-picture-recycling-centre",
  },
  "/expressao-oral/serie": {
    "a1-zuhause": "a1-at-home", "a2-unterwegs": "a2-out-and-about", "b1-arbeit": "b1-work", "b2-gesellschaft": "b2-society",
  },
  "/cultura": {
    // Ids stay (progress keys k:<id>); the slugs follow the Portugal topics (culture run, 2026-11-21).
    "duzen-siezen": "tu-or-o-senhor", pfand: "greetings", sonntagsruhe: "daily-rhythm", trinkgeld: "cafes-and-paying",
    bundeslaender: "regions", feiertage: "public-holidays", comida: "food-and-meals", fiestas: "festivals",
    fado: "fado-and-music", muelltrennung: "recycling", termine: "appointments-and-senhas",
    anmeldung: "nif-niss-and-utente", krankenversicherung: "public-health", mieten: "renting", schulsystem: "school-system",
    "arbeit-finden": "finding-a-job", "lenguas-cooficiales": "languages-of-portugal", "mundo-hispano": "portuguese-speaking-world",
    ausbildung: "training-and-university", kuendigung: "leaving-a-job",
    "oeffentlich-rechtlicher-rundfunk": "public-media", vereine: "associations-and-volunteering",
    "tradiciones-america": "lusophone-traditions",
    foederalismus: "state-and-local-power", sozialversicherung: "seguranca-social", wahlen: "elections",
    "historia-compartida": "shared-history",
    erinnerungskultur: "25-april-1974", grundgesetz: "constitution", mitbestimmung: "unions-and-workers-rights",
  },
  "/cultura/por-dentro": {
    "hallo-sagen": "saying-hello", "naehe-abstand": "queues-and-personal-space", "hoefliche-notluegen": "please-and-thank-you",
    puenktlichkeit: "time-and-timing", "zusammen-oder-getrennt": "paying-the-bill", "leute-kennenlernen": "small-talk",
    "freunde-finden": "making-friends", "arbeit-finden": "how-hiring-works", "deutschland-und-das-auto": "cars-and-driving",
    gleichberechtigung: "women-and-men-at-work", "erstes-date": "dating", direktheit: "directness",
    vertrauen: "humour-and-banter",
  },
  "/vocabulario/expressoes": {
    zustimmen: "agreeing", widersprechen: "disagreeing", zweifeln: "doubt", troesten: "comforting",
    meinung: "opinions", nachfragen: "checking-understanding", bitten: "asking-for-help", entschuldigen: "apologising",
    danken: "thanking", vorschlagen: "suggestions", gratulieren: "congratulating", begruessen: "greetings",
    bildbeschreibung: "describing-pictures", "wo-ist-der-ball": "wheres-the-ball",
  },
  // English for work: the sectors; their word groups are WORK_GROUP_SLUGS (one table for
  // all sectors, because the group ids repeat: taetigkeiten, ablaeufe, kunden-team …).
  "/portuguese-for-work": {
    "bau-handwerk": "construction", buero: "office", einzelhandel: "shops", "elektro-technik": "agriculture",
    gastronomie: "hospitality", hotel: "hotels", kita: "cleaning-domestic-work", kraftfahrer: "driving",
    "lager-logistik": "warehouse", pflege: "care-work",
  },
};
export const WORK_GROUP_SLUGS = {
  "baustelle-werkzeug": "site-and-tools", taetigkeiten: "tasks", ablaeufe: "workflow", sicherheit: "safety",
  "kunden-team": "customers-and-team", "buero-geraete": "office-and-equipment", datenschutz: "data-protection",
  "kasse-laden": "till-and-shop-floor", "bauteile-geraete": "tools-and-machines", "kueche-geraete": "kitchen-and-equipment",
  "hygiene-sicherheit": "hygiene-and-safety", "gaeste-team": "guests-and-team", "rezeption-zimmer": "reception-and-rooms",
  "sicherheit-hygiene": "safety-and-cleaning", "kita-material": "products-and-tools", tagesablauf: "working-day",
  "sicherheit-gesundheit": "safety-and-health", "eltern-team": "family-and-team", fahrzeug: "vehicle",
  "sicherheit-regeln": "safety-and-rules", "lager-geraete": "warehouse-and-equipment", team: "team",
  "pflege-kurz": "people-and-places",
};
const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const ITEM_KEYS = Object.fromEntries(Object.entries(ITEM_SLUGS).map(([s, m]) => [s, invert(m)]));
const WORK_GROUP_KEYS = invert(WORK_GROUP_SLUGS);
const ITEM_SECTIONS = Object.keys(ITEM_SLUGS).sort((a, b) => b.length - a.length);

/** An item's URL slug in a section (English path, e.g. "/compreensao-oral"). Unknown ids pass through. */
export const itemSlug = (section, id) => ITEM_SLUGS[section]?.[id] ?? id;
/** An item's id from its URL slug. Unknown slugs pass through. */
export const itemKey = (section, slug) => ITEM_KEYS[section]?.[slug] ?? slug;
/** The page of an item. */
export const itemPath = (section, id) => `${section}/${itemSlug(section, id)}`;
/** Business Portuguese units: the id is the file name, the URL a slightly longer English slug. */
export const BUSINESS_SLUGS = {
  emails: "emails",
  calls: "phone-calls",
  cv: "cv-and-cover-letter",
  interviews: "job-interviews",
  meetings: "meetings",
  negotiation: "negotiating",
};
export const businessPath = (unit) => `/business-portuguese/${BUSINESS_SLUGS[unit] ?? unit}`;
/** A work sector, or one word group of it. */
export const workPath = (sector, group) => sector === "imt" ? `/imt-vocabulary${group ? `/${group}` : ""}` :
  sector === "business" ? (group ? `${businessPath(group)}/words` : "/business-portuguese") :
  `/portuguese-for-work/${itemSlug("/portuguese-for-work", sector)}${group ? `/${WORK_GROUP_SLUGS[group] ?? group}` : ""}`;
/** A work group's id from its URL slug. */
export const workGroupKey = (slug) => WORK_GROUP_KEYS[slug] ?? slug;

// The exam families: registry ids (localStorage keys, set.exam) stayed; their pages moved.
export const EXAM_PATHS = {
  goethe: "/caple", dtz: "/nationality/ciple-a2", testdaf: "/caple/level-check",
  "leben-in-deutschland": "/civics", "start-deutsch-1": "/caple/acesso-a1",
};
/** The overview page of an exam family (registry id → path). */
export const examPath = (exam) => EXAM_PATHS[exam] ?? `/${exam}`;
/** The exam family (registry id) a path belongs to, or null. Longest path first (/nationality/ciple-a2 is dtz). */
export function examOfPath(path) {
  const hit = Object.entries(EXAM_PATHS).sort((a, b) => b[1].length - a[1].length)
    .find(([, p]) => path === p || path.startsWith(p + "/"));
  return hit ? hit[0] : null;
}
