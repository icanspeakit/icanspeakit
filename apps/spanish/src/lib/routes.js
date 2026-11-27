// Every URL that is derived from a data id, in one place.
//
// A grammar topic sits at the top level (/por-para), because every topic name is unique and is
// what a learner would type. Everything with generic ids (listening, reading, culture, speaking,
// writing, the ~500 vocabulary sets) keeps one level of section, so "/a1-supermarket" can never
// collide with a topic added later.
//
// Ids, data file names and localStorage keys stayed German (content-plan §1.3, §6), because code
// and saved progress key on them. Only the URL is the course's: English, except proper names
// (/dele, /siele, /ccse) and the Spanish grammar terms learners search for (/por-para, /gustar).
// The site was at /spanish until 2026-11-14; the hub 301s that (apps/hub/public/_redirects).

/** Pages that are hubs or overviews — places you pass through, not places you resume. */
export const NOT_RESUMABLE = new Set(["/", "/ejercicios", "/examenes", "/progreso", "/gramatica", "/conocimientos", "/profesores", "/juego",
  "/aviso-legal", "/privacidad", "/condiciones", "/prueba-de-nivel", "/cuenta",
  "/comprension-auditiva", "/comprension-lectora", "/expresion-escrita", "/expresion-oral", "/cultura", "/vocabulario", "/habilidades"]);

// Grammar topics live at the top level (/<slug>). The key (the workspace's `slug ?? id`, what
// progress, lehrplan and verwandt use) stays; the URL follows content-plan §3 "New slug".
// topicPath(key) is the one way from a key to its URL.
export const TOPIC_SLUGS = {
  // A1
  nomen: "genero-de-los-sustantivos", artikel: "articulos", personalpronomen: "pronombres-personales",
  praesens: "presente-regular", konjugation: "presente-irregular",
  "praeteritum-sein-haben": "verbos-con-cambio-vocalico", "verb-position-2": "ser-y-estar-basico",
  "berufe-mit-in": "hay-y-estar", "w-fragen": "interrogativos", "ja-nein-fragen": "preguntas-de-si-o-no",
  plural: "plurales", "adjektive-nach-sein": "concordancia-del-adjetivo", possessivartikel: "posesivos",
  "welcher-dieser": "demostrativos", gern: "gustar", "temporale-praepositionen": "tiempo-y-dias",
  aduso: "y-o-pero-porque", zahlen: "numeros", wortarten: "clases-de-palabras",
  // A2
  perfekt: "preterito-perfecto", "zusammengesetzte-verben": "preterito-indefinido", "n-deklination": "preterito-imperfecto",
  "trennbare-verben": "ir-a-infinitivo", komposita: "estar-gerundio",
  "reflexive-verben": "verbos-reflexivos", akkusativ: "pronombres-de-objeto",
  dativ: "pronombres-de-complemento-indirecto", modalverben: "tener-que-poder",
  "komparativ-superlativ": "comparativos", "lokale-praepositionen": "preposiciones-de-lugar",
  wechselpraepositionen: "a-or-en", indefinitpronomen: "indefinidos", satzstellung: "muy-mucho",
  negation: "negacion", "nebensaetze-weil-dass": "porque-como",
  "konjunktiv2-hoeflich": "peticiones-educadas", positionsadverbien: "frecuencia-y-soler",
  "adjektivdeklination-a2": "adverbios-en-mente", "artikel-oder-nicht": "articulo-o-no",
  ordinalzahlen: "ordinales-y-fechas",
  // B1
  zustandspassiv: "perfecto-vs-indefinido", "praeteritum-plusquamperfekt": "indefinido-o-imperfecto",
  "passiv-b1": "pluscuamperfecto", futur: "futuro-simple", "funktionen-von-werden": "condicional",
  imperativ: "imperativo", "infinitiv-mit-zu": "presente-de-subjuntivo",
  "verben-als-nomen": "subjuntivo-deseos", "infinitiv-ohne-zu": "infinitivo-o-subjuntivo",
  finalsaetze: "para-que", "temporale-nebensaetze": "cuando-con-subjuntivo",
  konditionalsaetze: "si-real", "als-oder-wenn": "por-para",
  "temporale-praepositionen-b1": "desde-hace", relativpronomen: "oraciones-de-relativo",
  "indirekte-fragen": "preguntas-indirectas", lassen: "perifrasis-verbales",
  "konnektoren-grund-gegengrund": "conectores", genitiv: "pronombres-posesivos",
  adjektivdeklination: "posicion-del-adjetivo", "partizip-als-adjektiv": "estar-participio",
  "verben-praepositionen": "verbos-y-preposiciones", "da-wo-woerter": "pronombres-preposicionales",
  "nutzen-benutzen": "ser-y-estar-avanzado", positionsverben: "verbos-como-gustar",
  "wortbildung-nomen": "formacion-de-palabras", "adjektive-als-nomen": "lo-con-adjetivo",
  // B2
  konjunktiv2: "imperfecto-de-subjuntivo", modalsaetze: "si-unreal", passiv: "pasiva-y-se-pasiva",
  "relativsaetze-was-wo": "relativos-avanzados", "zumal-wohingegen": "estilo-indirecto",
  "zweiteilige-konnektoren": "subjuntivo-y-opinion", konsekutivsaetze: "aunque-con-subjuntivo",
  negationswoerter: "probabilidad", irgend: "se-accidental", fokuspartikeln: "verbos-de-cambio",
  modalpartikeln: "marcadores-del-discurso", "adjektive-mit-praepositionen": "adjetivos-y-preposiciones",
  "nomen-verb-verbindungen": "colocaciones",
  // C1
  "konjunktiv-1": "concordancia-de-tiempos", "es-korrelat": "oraciones-hendidas",
  passiversatz: "condiciones-sin-si", "futur-2": "oraciones-no-finitas",
  "irreale-vergleiche": "como-si", "subjektive-modalverben": "perifrasis-modales",
  "nominale-praepositionen": "conectores-formales", nominalisierung: "nominalizacion",
  partizipialattribute: "relativos-formales", textkohaerenz: "cohesion", verbpraefixe: "prefijos",
};
const TOPIC_KEYS = Object.fromEntries(Object.entries(TOPIC_SLUGS).map(([k, v]) => [v, k]));

/** A grammar topic's URL slug (English) from its key (German id / slug). Unknown keys pass through. */
export const topicSlug = (key) => TOPIC_SLUGS[key] ?? key;
/** A grammar topic's key from its URL slug. Unknown slugs pass through. */
export const topicKeyFromSlug = (slug) => TOPIC_KEYS[slug] ?? slug;
/** The page of a grammar topic. */
export const topicPath = (key) => `/${topicSlug(key)}`;
/** The page where a student types the PIN of a live practice round (src/pages/en-directo.astro). */
export const LIVE_JOIN_PATH = "/en-directo";

// The reference tables under /gramatica/<ref> (src/data/nachschlagen/<file>.json). The file
// names stayed; the URL is English.
export const REF_SLUGS = {
  "starke-schwache-verben": "verbos-irregulares",
  "trennbare-verben": "lista-de-verbos-reflexivos",
  "verben-mit-praepositionen": "verbos-con-preposiciones",
};
/** A reference table's URL slug from its file name. */
export const refSlug = (file) => REF_SLUGS[file] ?? file;
/** The page of a reference table. */
export const refPath = (file) => `/gramatica/${refSlug(file)}`;

// Teachers' worksheets and tandem sheets per topic: keyed like the topic (plus the
// reference sheets nachschlagen-<file>, verbtabellen, typische-fehler); the URL is English.
const SHEET_SLUGS = { verbtabellen: "tablas-de-verbos", "typische-fehler": "errores-comunes" };
/** A worksheet's URL slug from its key. */
export const sheetSlug = (key) =>
  String(key).startsWith("nachschlagen-") ? `referencia-${refSlug(String(key).slice("nachschlagen-".length))}`
    : SHEET_SLUGS[key] ?? topicSlug(key);
/** The worksheet page of a topic key. */
export const sheetPath = (key) => `/profesores/fichas/gramatica/${sheetSlug(key)}`;
/** The tandem (pair work) sheet of a topic key. */
export const tandemPath = (key) => `/profesores/fichas/tandem/${sheetSlug(key)}`;
// Item pages under a section (content-plan §1.3: "kebab-case of the English title, keep any
// level prefix"). Keyed by the section's English path, then by the item's id, which stays
// the key in the data, in progress and in class-task refs (h:<id>, l:<id>, k:<id> …).
export const ITEM_SLUGS = {
  "/comprension-auditiva": {
    "a1-ansage-bahnhof": "a1-aviso-estacion", "a1-anruf-arzt": "a1-mensaje-centro-de-salud",
    "a1-supermarkt": "a1-supermercado", "a1-verabredung": "a1-quedar",
    "a2-amt-termin": "a2-cita-ayuntamiento", "a2-wohnungsbesichtigung": "a2-visita-al-piso",
    "a2-radio-wetter-verkehr": "a2-radio-tiempo-y-trafico", "a2-paketdienst": "a2-mensajes-de-paqueteria",
    "b1-krankmeldung": "b1-baja-por-enfermedad", "b1-elterngespraech": "b1-reunion-de-tutoria",
    "b1-radio-muelltrennung": "b1-radio-reciclaje", "b1-durchsage-ersatzverkehr": "b1-autobuses-sustitutivos",
    "b2-diskussion-homeoffice": "b2-reunion-teletrabajo", "b2-interview-anerkennung": "b2-entrevista-homologacion",
    "b2-beschwerde-versicherung": "b2-queja-seguro", "b2-vortrag-ehrenamt": "b2-charla-voluntariado",
  },
  "/comprension-lectora": {
    "a1-schilder-im-haus": "a1-avisos-en-el-portal", "a1-nachricht-einladung": "a1-mensaje-invitacion",
    "a2-wohnungsanzeigen": "a2-anuncios-de-pisos", "a2-email-kurs-absage": "a2-correo-escuela-de-idiomas",
    "b1-digitales-buero": "b1-oficina-sin-papel", "b1-anzeigen": "b1-anuncios-emparejados",
    "b1-zeitungsartikel": "b1-noticia-local", "b1-forumsbeitraege": "b1-mensajes-de-foro",
    "b2-artikel-homeoffice": "b2-articulo-teletrabajo", "b2-kommentare-innenstadt": "b2-centro-sin-coches",
  },
  "/expresion-escrita": {
    "a1-formular-anmeldung": "a1-formulario-polideportivo", "a1-nachricht-absage": "a1-no-puedo-ir",
    "a2-email-nachbarn": "a2-correo-al-vecino", "a2-formular-arztpraxis": "a2-formulario-centro-de-salud",
    "a2-email-school": "a2-correo-al-colegio",
    "b1-email-landlord": "b1-correo-a-la-casera", "b1-email-employer": "b1-correo-dias-libres",
    "b1-formular-vhs": "b1-rellenar-un-formulario", "b1-brief-david": "b1-respuesta-a-javier",
    "b1-fehlerjagd": "b1-caza-de-errores", "b2-beschwerde-reiseveranstalter": "b2-reclamacion-de-viaje",
  },
  "/expresion-oral": {
    "a1-sich-vorstellen": "a1-presentarse", "a1-bild-bahnhof": "a1-imagen-estacion",
    "a1-bild-kueche": "a1-imagen-cocina", "a1-bild-supermarkt": "a1-imagen-supermercado",
    "a1-bild-spielplatz": "a1-imagen-parque", "a2-bild-gartenarbeit": "a2-imagen-trabajo-al-aire-libre",
    "a2-bild-bus": "a2-imagen-tranvia", "a2-bild-nachbarschaftsfest": "a2-imagen-comida-en-el-jardin",
    "a2-bild-wartezimmer": "a2-imagen-consulta", "b1-bild-rolltreppe": "b1-imagen-parque",
    "b1-bild-bewerbungsgespraech": "b1-imagen-entrevista-de-trabajo", "b1-bild-werkstatt": "b1-imagen-taller",
    "b1-bild-buergeramt": "b1-imagen-recepcion", "b2-vortrag-ehrenamt": "b2-charla-voluntariado",
    "b2-diskussion-ehrenamt-schule": "b2-debate-voluntariado-escolar", "b2-planen-abschiedsfeier": "b2-planear-fiesta-de-despedida",
    "b2-bild-wochenmarkt": "b2-imagen-mercado", "b2-bild-videokonferenz": "b2-imagen-videollamada",
    "b2-bild-baustelle-innenstadt": "b2-imagen-obras", "b2-bild-wertstoffhof": "b2-imagen-punto-limpio",
  },
  "/expresion-oral/serie": {
    "a1-zuhause": "a1-en-casa", "a2-unterwegs": "a2-por-ahi", "b1-arbeit": "b1-trabajo", "b2-gesellschaft": "b2-sociedad",
  },
  "/cultura": {
    "duzen-siezen": "tu-o-usted", pfand: "saludos", sonntagsruhe: "ritmo-del-dia", trinkgeld: "bares-y-cuentas",
    bundeslaender: "comunidades-autonomas", feiertage: "festivos", comida: "comidas", fiestas: "fiestas-populares",
    muelltrennung: "reciclaje", termine: "cita-previa",
    anmeldung: "empadronamiento", krankenversicherung: "sanidad-publica", mieten: "alquiler", schulsystem: "sistema-educativo",
    "arbeit-finden": "buscar-trabajo", "lenguas-cooficiales": "lenguas-de-espana", "mundo-hispano": "mundo-hispano",
    ausbildung: "fp-y-universidad", kuendigung: "dejar-un-trabajo",
    "oeffentlich-rechtlicher-rundfunk": "medios-publicos", vereine: "asociaciones-y-voluntariado",
    "tradiciones-america": "tradiciones-de-america",
    foederalismus: "estado-de-las-autonomias", sozialversicherung: "seguridad-social", wahlen: "elecciones",
    "historia-compartida": "espana-y-america",
    erinnerungskultur: "la-transicion", grundgesetz: "constitucion", mitbestimmung: "sindicatos-y-convenios",
  },
  "/cultura/por-dentro": {
    "hallo-sagen": "saludar", "naehe-abstand": "colas-y-espacio-personal", "hoefliche-notluegen": "por-favor-y-gracias",
    puenktlichkeit: "tiempo-y-puntualidad", "zusammen-oder-getrennt": "pagar-la-cuenta", "leute-kennenlernen": "charla-y-sobremesa",
    "freunde-finden": "hacer-amigos", "arbeit-finden": "como-se-contrata", "deutschland-und-das-auto": "coches-y-conducir",
    gleichberechtigung: "mujeres-y-hombres-en-el-trabajo", "erstes-date": "primera-cita", direktheit: "franqueza",
    vertrauen: "humor-y-bromas",
  },
  "/vocabulario/frases": {
    zustimmen: "estar-de-acuerdo", widersprechen: "no-estar-de-acuerdo", zweifeln: "dudar", troesten: "consolar",
    meinung: "opiniones", nachfragen: "comprobar-que-se-entiende", bitten: "pedir-ayuda", entschuldigen: "disculparse",
    danken: "dar-las-gracias", vorschlagen: "sugerencias", gratulieren: "felicitar", begruessen: "saludos",
    bildbeschreibung: "describir-imagenes", "wo-ist-der-ball": "donde-esta-la-pelota",
  },
  // English for work: the sectors; their word groups are WORK_GROUP_SLUGS (one table for
  // all sectors, because the group ids repeat: taetigkeiten, ablaeufe, kunden-team …).
  "/espanol-para-el-trabajo": {
    "bau-handwerk": "construccion", buero: "oficina", einzelhandel: "comercio", "elektro-technik": "agricultura",
    gastronomie: "hosteleria", hotel: "hoteles", kita: "limpieza-y-servicio-domestico", kraftfahrer: "conduccion",
    "lager-logistik": "almacen", pflege: "cuidados",
  },
};
export const WORK_GROUP_SLUGS = {
  "baustelle-werkzeug": "obra-y-herramientas", taetigkeiten: "tareas", ablaeufe: "procesos", sicherheit: "seguridad",
  "kunden-team": "clientes-y-equipo", "buero-geraete": "oficina-y-equipos", datenschutz: "proteccion-de-datos",
  "kasse-laden": "caja-y-tienda", "bauteile-geraete": "herramientas-y-maquinas", "kueche-geraete": "cocina-y-equipos",
  "hygiene-sicherheit": "higiene-y-seguridad", "gaeste-team": "huespedes-y-equipo", "rezeption-zimmer": "recepcion-y-habitaciones",
  "sicherheit-hygiene": "seguridad-y-limpieza", "kita-material": "productos-y-herramientas", tagesablauf: "jornada",
  "sicherheit-gesundheit": "seguridad-y-salud", "eltern-team": "familias-y-equipo", fahrzeug: "vehiculo",
  "sicherheit-regeln": "seguridad-y-normas", "lager-geraete": "almacen-y-equipos", team: "equipo",
  "pflege-kurz": "personas-y-lugares",
};
const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const ITEM_KEYS = Object.fromEntries(Object.entries(ITEM_SLUGS).map(([s, m]) => [s, invert(m)]));
const WORK_GROUP_KEYS = invert(WORK_GROUP_SLUGS);
const ITEM_SECTIONS = Object.keys(ITEM_SLUGS).sort((a, b) => b.length - a.length);

/** An item's URL slug in a section (English path, e.g. "/comprension-auditiva"). Unknown ids pass through. */
export const itemSlug = (section, id) => ITEM_SLUGS[section]?.[id] ?? id;
/** An item's id from its URL slug. Unknown slugs pass through. */
export const itemKey = (section, slug) => ITEM_KEYS[section]?.[slug] ?? slug;
/** The page of an item. */
export const itemPath = (section, id) => `${section}/${itemSlug(section, id)}`;
/** Business Spanish units: the id is the Spanish name of the file, the URL says it in English. */
export const BUSINESS_SLUGS = {
  correos: "correos",
  llamadas: "llamadas",
  curriculum: "curriculum-y-carta",
  entrevista: "entrevistas-de-trabajo",
  reuniones: "reuniones",
  negociacion: "negociacion",
};
export const businessPath = (unit) => `/espanol-de-negocios/${BUSINESS_SLUGS[unit] ?? unit}`;
/** A work sector, or one word group of it. */
export const workPath = (sector, group) => sector === "dgt" ? `/vocabulario-dgt${group ? `/${group}` : ""}` :
  sector === "business" ? (group ? `${businessPath(group)}/palabras` : "/espanol-de-negocios") :
  `/espanol-para-el-trabajo/${itemSlug("/espanol-para-el-trabajo", sector)}${group ? `/${WORK_GROUP_SLUGS[group] ?? group}` : ""}`;
/** A work group's id from its URL slug. */
export const workGroupKey = (slug) => WORK_GROUP_KEYS[slug] ?? slug;

// The exam families: registry ids (localStorage keys, set.exam) stayed; their pages moved.
export const EXAM_PATHS = {
  goethe: "/dele", telc: "/siele/niveles", dtz: "/nacionalidad/dele-a2", testdaf: "/siele",
  "leben-in-deutschland": "/ccse", "start-deutsch-1": "/dele/a1",
};
/** The overview page of an exam family (registry id → path). */
export const examPath = (exam) => EXAM_PATHS[exam] ?? `/${exam}`;
/** The exam family (registry id) a path belongs to, or null. Longest path first (/nacionalidad/dele-a2 is dtz). */
export function examOfPath(path) {
  const hit = Object.entries(EXAM_PATHS).sort((a, b) => b[1].length - a[1].length)
    .find(([, p]) => path === p || path.startsWith(p + "/"));
  return hit ? hit[0] : null;
}
