// Every URL that is derived from a data id, in one place.
//
// A grammar topic sits at the top level (/y-et-en), because every topic name is unique and is
// what a learner would type. Everything with generic ids (listening, reading, culture, speaking,
// writing, the ~500 vocabulary sets) keeps one level of section, so "/a1-supermarket" can never
// collide with a topic added later.
//
// Ids, data file names and localStorage keys stayed German or Spanish (content-plan §1.3, §6),
// because code and saved progress key on them. Only the URL is the course's: English, except
// proper names (/delf-dalf, /tcf, /tef) and the French grammar terms learners search for
// (/passe-compose-vs-imparfait, /y-et-en). The site at /francais is new, so there are no
// redirects from any earlier address (§8); the one exception is /grammaire/<slug> → /<slug>.

/** Pages that are hubs or overviews — places you pass through, not places you resume. */
export const NOT_RESUMABLE = new Set(["/", "/exercices", "/examens", "/progression", "/grammaire", "/savoirs", "/enseignants", "/jeu",
  "/mentions-legales", "/confidentialite", "/conditions-generales", "/test-de-niveau", "/compte",
  "/ecoute", "/lecture", "/ecriture", "/expression-orale", "/culture", "/vocabulaire", "/competences"]);

// Grammar topics live at the top level (/<slug>). The key (the workspace's `slug ?? id`, what
// progress, lehrplan and verwandt use) stays; the URL follows content-plan §3 "New slug".
// topicPath(key) is the one way from a key to its URL.
export const TOPIC_SLUGS = {
  // A1
  nomen: "genre-des-noms", artikel: "articles", personalpronomen: "pronoms-sujets",
  "praeteritum-sein-haben": "etre-avoir", praesens: "present-verbes-er",
  "verb-position-2": "present-verbes-ir-re", konjugation: "present-irreguliers", negation: "ne-pas",
  "berufe-mit-in": "il-y-a-cest", "w-fragen": "mots-interrogatifs", "ja-nein-fragen": "questions-oui-non",
  plural: "pluriels", "adjektive-nach-sein": "accord-des-adjectifs", possessivartikel: "possessifs",
  "welcher-dieser": "demonstratifs", gern: "aimer-infinitive", "temporale-praepositionen": "temps-et-jours",
  aduso: "et-ou-mais", zahlen: "nombres", wortarten: "natures-des-mots",
  // A2
  perfekt: "passe-compose-avoir", "zusammengesetzte-verben": "passe-compose-etre",
  "n-deklination": "imparfait", "trennbare-verben": "futur-proche", komposita: "en-train-de-venir-de",
  "reflexive-verben": "verbes-pronominaux", akkusativ: "pronoms-complements", dativ: "pronoms-complements-indirects",
  modalverben: "pouvoir-vouloir-devoir", imperativ: "imperatif", "komparativ-superlativ": "comparatifs",
  "lokale-praepositionen": "prepositions-de-lieu", wechselpraepositionen: "a-en-au-places",
  indefinitpronomen: "indefinis", satzstellung: "articles-partitifs", negationswoerter: "negation-avancee",
  "nebensaetze-weil-dass": "parce-que-donc", "konjunktiv2-hoeflich": "demandes-polies",
  positionsadverbien: "adverbes-de-frequence", "adjektivdeklination-a2": "adverbes-en-ment",
  "artikel-oder-nicht": "article-ou-pas", ordinalzahlen: "ordinaux-et-dates",
  // B1
  "praeteritum-plusquamperfekt": "passe-compose-vs-imparfait", futur: "futur-simple",
  "funktionen-von-werden": "conditionnel", "infinitiv-mit-zu": "subjonctif-present",
  "verben-als-nomen": "subjonctif-souhaits", "infinitiv-ohne-zu": "infinitif-ou-subjonctif",
  finalsaetze: "pour-que", "temporale-nebensaetze": "subordonnees-de-temps", konditionalsaetze: "si-present",
  "als-oder-wenn": "quand-ou-si", "temporale-praepositionen-b1": "depuis-il-y-a",
  relativpronomen: "pronoms-relatifs", "indirekte-fragen": "questions-indirectes", lassen: "faire-laisser",
  "konnektoren-grund-gegengrund": "connecteurs", genitiv: "pronoms-possessifs",
  zustandspassiv: "doubles-pronoms", "passiv-b1": "pronoms-demonstratifs",
  adjektivdeklination: "place-des-adjectifs", "verben-praepositionen": "verbes-et-prepositions",
  "da-wo-woerter": "y-et-en", "nutzen-benutzen": "savoir-connaitre", positionsverben: "verbes-comme-plaire",
  "wortbildung-nomen": "formation-des-mots", "adjektive-als-nomen": "ce-qui-ce-que",
  // B2
  "konjunktiv2": "phrases-avec-si", modalsaetze: "plus-que-parfait", passiv: "voix-passive",
  "relativsaetze-was-wo": "relatifs-lequel", "zumal-wohingegen": "discours-rapporte",
  "zweiteilige-konnektoren": "subjonctif-opinion", konsekutivsaetze: "bien-que",
  "partizip-als-adjektiv": "accord-du-participe", irgend: "n-importe", fokuspartikeln: "gerondif",
  modalpartikeln: "marqueurs-du-discours", "adjektive-mit-praepositionen": "adjectifs-et-prepositions",
  "nomen-verb-verbindungen": "collocations",
  // C1
  "konjunktiv-1": "subjonctif-passe", "es-korrelat": "phrases-clivees", passiversatz: "conditions-sans-si",
  "futur-2": "futur-anterieur", "irreale-vergleiche": "comme-si", "subjektive-modalverben": "nuances-modales",
  "nominale-praepositionen": "connecteurs-formels", nominalisierung: "nominalisation",
  partizipialattribute: "propositions-participiales", textkohaerenz: "cohesion", verbpraefixe: "passe-simple",
};
const TOPIC_KEYS = Object.fromEntries(Object.entries(TOPIC_SLUGS).map(([k, v]) => [v, k]));

/** A grammar topic's URL slug (English) from its key (German id / slug). Unknown keys pass through. */
export const topicSlug = (key) => TOPIC_SLUGS[key] ?? key;
/** A grammar topic's key from its URL slug. Unknown slugs pass through. */
export const topicKeyFromSlug = (slug) => TOPIC_KEYS[slug] ?? slug;
/** The page of a grammar topic. */
export const topicPath = (key) => `/${topicSlug(key)}`;

// The reference tables under /grammaire/<ref> (src/data/nachschlagen/<file>.json). The file
// names stayed; the URL is French.
export const REF_SLUGS = {
  "starke-schwache-verben": "verbes-irreguliers",
  "trennbare-verben": "liste-verbes-pronominaux",
  "verben-mit-praepositionen": "verbes-avec-prepositions",
};
/** A reference table's URL slug from its file name. */
export const refSlug = (file) => REF_SLUGS[file] ?? file;
/** The page of a reference table. */
export const refPath = (file) => `/grammaire/${refSlug(file)}`;

// Teachers' worksheets and tandem sheets per topic: keyed like the topic (plus the
// reference sheets nachschlagen-<file>, verbtabellen, typische-fehler); the URL is French.
const SHEET_SLUGS = { verbtabellen: "tableaux-de-conjugaison", "typische-fehler": "erreurs-frequentes" };
/** A worksheet's URL slug from its key. */
export const sheetSlug = (key) =>
  String(key).startsWith("nachschlagen-") ? `reference-${refSlug(String(key).slice("nachschlagen-".length))}`
    : SHEET_SLUGS[key] ?? topicSlug(key);
/** The worksheet page of a topic key. */
export const sheetPath = (key) => `/enseignants/fiches/grammaire/${sheetSlug(key)}`;
/** The tandem (pair work) sheet of a topic key. */
export const tandemPath = (key) => `/enseignants/fiches/tandem/${sheetSlug(key)}`;
// Item pages under a section (content-plan §1.3: "kebab-case of the English title, keep any
// level prefix"). Keyed by the section's path, then by the item's id, which stays
// the key in the data, in progress and in class-task refs (h:<id>, l:<id>, k:<id> …).
export const ITEM_SLUGS = {
  "/ecoute": {
    "a1-ansage-bahnhof": "a1-annonce-gare", "a1-anruf-arzt": "a1-message-cabinet-medical",
    "a1-supermarkt": "a1-supermarche", "a1-verabredung": "a1-fixer-un-rendez-vous",
    "a2-amt-termin": "a2-rendez-vous-mairie", "a2-wohnungsbesichtigung": "a2-visite-d-appartement",
    "a2-radio-wetter-verkehr": "a2-radio-meteo-circulation", "a2-paketdienst": "a2-messages-colis",
    "b1-krankmeldung": "b1-arret-maladie", "b1-elterngespraech": "b1-reunion-parents-professeur",
    "b1-radio-muelltrennung": "b1-radio-tri-des-dechets", "b1-durchsage-ersatzverkehr": "b1-bus-de-remplacement",
    "b2-diskussion-homeoffice": "b2-reunion-teletravail", "b2-interview-anerkennung": "b2-entretien-reconnaissance-diplome",
    "b2-beschwerde-versicherung": "b2-reclamation-assurance", "b2-vortrag-ehrenamt": "b2-conference-benevolat",
  },
  "/lecture": {
    "a1-schilder-im-haus": "a1-affiches-dans-l-immeuble", "a1-nachricht-einladung": "a1-sms-invitation",
    "a2-wohnungsanzeigen": "a2-annonces-logement", "a2-email-kurs-absage": "a2-courriel-ecole-de-langues",
    "a2-padron-notice": "a2-avis-inscription-scolaire",
    "b1-digitales-buero": "b1-bureau-sans-papier", "b1-anzeigen": "b1-associer-les-annonces",
    "b1-zeitungsartikel": "b1-article-presse-locale", "b1-forumsbeitraege": "b1-messages-de-forum",
    "a1-phone-messages": "a1-messages-telephoniques", "b1-interview": "b1-entretien",
    "b2-artikel-homeoffice": "b2-article-teletravail", "b2-kommentare-innenstadt": "b2-centre-ville-sans-voiture",
  },
  "/ecriture": {
    "a1-formular-anmeldung": "a1-formulaire-centre-sportif", "a1-nachricht-absage": "a1-je-ne-peux-pas-venir",
    "a2-email-nachbarn": "a2-courriel-au-voisin", "a2-formular-arztpraxis": "a2-formulaire-centre-de-sante",
    "a2-email-school": "a2-courriel-a-l-ecole", "a2-padron-form": "a2-formulaire-inscription-scolaire",
    "b1-email-landlord": "b1-courriel-a-la-proprietaire", "b1-email-employer": "b1-courriel-demande-de-conge",
    "b1-formular-vhs": "b1-remplir-un-formulaire", "b1-brief-david": "b1-reponse-a-theo",
    "b1-fehlerjagd": "b1-chasse-aux-erreurs", "b2-opinion-text": "b2-texte-d-opinion", "b2-beschwerde-reiseveranstalter": "b2-reclamation-voyage",
  },
  "/expression-orale": {
    "a1-sich-vorstellen": "a1-se-presenter", "a1-bild-bahnhof": "a1-image-gare",
    "a1-bild-kueche": "a1-image-cuisine", "a1-bild-supermarkt": "a1-image-supermarche",
    "a1-bild-spielplatz": "a1-image-parc", "a2-bild-gartenarbeit": "a2-image-travail-en-plein-air",
    "a2-bild-bus": "a2-image-tramway", "a2-bild-nachbarschaftsfest": "a2-image-repas-au-jardin",
    "a2-bild-wartezimmer": "a2-image-salle-d-attente", "b1-bild-rolltreppe": "b1-image-parc",
    "b1-bild-bewerbungsgespraech": "b1-image-entretien-d-embauche", "b1-bild-werkstatt": "b1-image-atelier",
    "b1-bild-buergeramt": "b1-image-accueil", "b2-vortrag-ehrenamt": "b2-expose-benevolat",
    "b2-diskussion-ehrenamt-schule": "b2-discussion-benevolat-ecole", "b2-planen-abschiedsfeier": "b2-organiser-une-fete-de-depart",
    "b2-bild-wochenmarkt": "b2-image-marche", "b2-bild-videokonferenz": "b2-image-visioconference",
    "b2-bild-baustelle-innenstadt": "b2-image-chantier", "b2-bild-wertstoffhof": "b2-image-dechetterie",
  },
  "/expression-orale/serie": {
    "a1-zuhause": "a1-a-la-maison", "a2-unterwegs": "a2-en-ville", "b1-arbeit": "b1-travail", "b2-gesellschaft": "b2-societe",
  },
  "/culture": {
    "duzen-siezen": "tu-ou-vous",
    pfand: "salutations",
    sonntagsruhe: "rythme-du-quotidien",
    trinkgeld: "cafes-et-paiement",
    bundeslaender: "regions-et-departements",
    feiertage: "jours-feries",
    comida: "repas-et-gastronomie",
    fiestas: "fetes",
    muelltrennung: "tri-des-dechets",
    termine: "rendez-vous",
    anmeldung: "justificatif-de-domicile",
    krankenversicherung: "systeme-de-sante",
    mieten: "location-logement",
    schulsystem: "systeme-scolaire",
    "arbeit-finden": "trouver-un-emploi",
    "lenguas-cooficiales": "langues-regionales",
    "mundo-hispano": "monde-francophone",
    ausbildung: "formation-et-universite",
    kuendigung: "quitter-son-emploi",
    "oeffentlich-rechtlicher-rundfunk": "audiovisuel-public",
    vereine: "associations",
    "tradiciones-america": "traditions-francophones",
    foederalismus: "etat-et-decentralisation",
    sozialversicherung: "securite-sociale",
    wahlen: "elections",
    "historia-compartida": "france-et-anciennes-colonies",
    erinnerungskultur: "memoire-historique",
    grundgesetz: "constitution",
    mitbestimmung: "syndicats-et-conventions",
  },
  "/culture/codes-sociaux": {
    "hallo-sagen": "dire-bonjour",
    "naehe-abstand": "files-d-attente-et-distance",
    "hoefliche-notluegen": "s-il-vous-plait-et-merci",
    puenktlichkeit: "ponctualite",
    "zusammen-oder-getrennt": "payer-l-addition",
    "leute-kennenlernen": "conversation-et-apero",
    "freunde-finden": "se-faire-des-amis",
    "arbeit-finden": "comment-on-recrute",
    "deutschland-und-das-auto": "voiture-et-conduite",
    gleichberechtigung: "femmes-et-hommes-au-travail",
    "erstes-date": "rencontres-amoureuses",
    direktheit: "franchise",
    vertrauen: "humour-et-taquineries",
  },
  "/vocabulaire/formules": {
    zustimmen: "etre-d-accord", widersprechen: "ne-pas-etre-d-accord", zweifeln: "exprimer-le-doute", troesten: "reconforter",
    meinung: "donner-son-avis", nachfragen: "verifier-la-comprehension", bitten: "demander-de-l-aide", entschuldigen: "s-excuser",
    danken: "remercier", vorschlagen: "proposer", gratulieren: "feliciter", begruessen: "saluer",
    bildbeschreibung: "decrire-une-image", "wo-ist-der-ball": "ou-est-le-ballon",
  },
  // French for work: the sectors (content-plan §5.12); their word groups are WORK_GROUP_SLUGS (one
  // table for all sectors, because the group ids repeat: taetigkeiten, ablaeufe, kunden-team …).
  "/francais-au-travail": {
    "bau-handwerk": "batiment", buero: "bureau", einzelhandel: "commerce", "elektro-technik": "securite",
    gastronomie: "restauration", hotel: "hotellerie", kita: "nettoyage-petite-enfance", kraftfahrer: "conduite",
    "lager-logistik": "logistique", pflege: "soins",
  },
};
export const WORK_GROUP_SLUGS = {
  "baustelle-werkzeug": "chantier-et-outils", taetigkeiten: "taches", ablaeufe: "deroulement", sicherheit: "securite",
  "kunden-team": "clients-et-equipe", "buero-geraete": "bureau-et-materiel", datenschutz: "protection-des-donnees",
  "kasse-laden": "caisse-et-magasin", "bauteile-geraete": "equipements", "kueche-geraete": "cuisine-et-materiel",
  "hygiene-sicherheit": "hygiene-et-securite", "gaeste-team": "clientele-et-equipe", "rezeption-zimmer": "reception-et-chambres",
  "sicherheit-hygiene": "securite-et-proprete", "kita-material": "produits-et-outils", tagesablauf: "journee-de-travail",
  "sicherheit-gesundheit": "securite-et-sante", "eltern-team": "familles-et-equipe", fahrzeug: "vehicule",
  "sicherheit-regeln": "securite-et-regles", "lager-geraete": "entrepot-et-materiel", team: "equipe",
  "pflege-kurz": "personnes-et-lieux",
  breakdown: "panne", car: "voiture", controls: "commandes", exam: "examen", instructions: "consignes",
  road: "route", signs: "panneaux", users: "usagers",
};
const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const ITEM_KEYS = Object.fromEntries(Object.entries(ITEM_SLUGS).map(([s, m]) => [s, invert(m)]));
const WORK_GROUP_KEYS = invert(WORK_GROUP_SLUGS);
const ITEM_SECTIONS = Object.keys(ITEM_SLUGS).sort((a, b) => b.length - a.length);

/** An item's URL slug in a section (English path, e.g. "/ecoute"). Unknown ids pass through. */
export const itemSlug = (section, id) => ITEM_SLUGS[section]?.[id] ?? id;
/** An item's id from its URL slug. Unknown slugs pass through. */
export const itemKey = (section, slug) => ITEM_KEYS[section]?.[slug] ?? slug;
/** The page of an item. */
export const itemPath = (section, id) => `${section}/${itemSlug(section, id)}`;
/** Business French units: the id is the Spanish name of the file (kept, §6), the URL says it in English. */
export const BUSINESS_SLUGS = {
  correos: "courriels",
  llamadas: "appels-telephoniques",
  curriculum: "cv-et-lettre-de-motivation",
  entrevista: "entretiens-d-embauche",
  reuniones: "reunions",
  negociacion: "negociation",
};
export const businessPath = (unit) => `/francais-des-affaires/${BUSINESS_SLUGS[unit] ?? unit}`;
/** A work sector, or one word group of it. */
export const workPath = (sector, group) => sector === "dgt" ? `/vocabulaire-code-de-la-route${group ? `/${WORK_GROUP_SLUGS[group] ?? group}` : ""}` :
  sector === "business" ? (group ? `${businessPath(group)}/mots` : "/francais-des-affaires") :
  `/francais-au-travail/${itemSlug("/francais-au-travail", sector)}${group ? `/${WORK_GROUP_SLUGS[group] ?? group}` : ""}`;
/** A work group's id from its URL slug. */
export const workGroupKey = (slug) => WORK_GROUP_KEYS[slug] ?? slug;

// The exam families: registry ids (localStorage keys, set.exam) stayed; their pages moved.
export const EXAM_PATHS = {
  goethe: "/delf-dalf", telc: "/tcf", dtz: "/residence-et-nationalite/tcf-irn", testdaf: "/tef",
  "leben-in-deutschland": "/examen-civique", "start-deutsch-1": "/delf-dalf/a1",
};
/** The overview page of an exam family (registry id → path). */
export const examPath = (exam) => EXAM_PATHS[exam] ?? `/${exam}`;
/** The exam family (registry id) a path belongs to, or null. Longest path first (/delf-dalf/a1 is start-deutsch-1). */
export function examOfPath(path) {
  const hit = Object.entries(EXAM_PATHS).sort((a, b) => b[1].length - a[1].length)
    .find(([, p]) => path === p || path.startsWith(p + "/"));
  return hit ? hit[0] : null;
}
