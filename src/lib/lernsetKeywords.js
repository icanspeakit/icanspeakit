// Search words for the Vokabelsets (Lernsets): the theme a learner types ("Sport",
// "Landschaft", "food") rather than the set's exact title ("Sport & Draußen"). One theme
// lists its words once and the sets it covers, so "Sport" finds Freizeit & Hobbys,
// Sport & Bewegung, Körper & Bewegung and Verein & Sportbetrieb together. Used by
// src/lib/searchIndex.js; the set's own title and words are matched there as well.

const THEMES = [
  ["sport sports fitness training bewegung verein fußball schwimmen joggen laufen mannschaft wettkampf exercise football gym", ["a1-14", "a2-22", "b1-14", "b1-22", "b1-44", "b2-23", "b2-46"]],
  ["landschaft natur berg berge gebirge wald see meer fluss küste draußen nature landscape mountains forest outdoors countryside", ["a1-20", "b1-26", "b1-44", "b2-17", "b2-38", "c2-15"]],
  ["umwelt klima müll recycling energie nachhaltigkeit klimawandel environment climate waste energy sustainability", ["a2-26", "b1-06", "b1-27", "b2-06", "b2-29", "b2-32", "b2-38", "b2-55", "c1-21"]],
  ["wetter jahreszeiten regen sonne schnee klima weather seasons", ["a1-19", "b1-27", "b2-42"]],
  ["tiere tier haustier pflanzen animals pets plants", ["a1-20", "b1-26", "c2-15"]],
  ["essen trinken lebensmittel kochen küche restaurant café mahlzeit food drink cooking kitchen eating meal", ["a1-06", "a2-04", "a2-05", "b1-16", "b1-46", "b2-22"]],
  ["einkaufen shopping preise laden supermarkt kaufen kunde verbraucher umtausch shop buy", ["a1-07", "a1-08", "a2-17", "b1-16", "b1-24", "b2-28", "b2-45"]],
  ["kleidung mode farben anziehen clothes clothing fashion colours colors", ["a1-08", "b1-29", "b2-41"]],
  ["wohnen wohnung haus miete mieten möbel zimmer nachbarn umzug housing home apartment flat rent furniture", ["a1-04", "a1-05", "a2-01", "a2-02", "a2-03", "b1-03", "b1-25", "b1-34", "b2-16", "b2-49"]],
  ["gesundheit arzt ärztin krank krankheit körper medizin krankenhaus apotheke pflege health doctor illness body hospital medicine", ["a1-09", "a1-10", "a2-06", "a2-07", "a2-08", "b1-02", "b1-22", "b1-33", "b2-11", "b2-12", "b2-31", "c1-15"]],
  ["arbeit beruf berufe job bewerbung büro karriere kollegen firma work career office application", ["a1-12", "a2-09", "a2-10", "a2-11", "b1-01", "b1-19", "b1-32", "b2-01", "b2-21", "b2-30", "b2-35", "b2-53", "c1-09", "c1-11"]],
  ["schule lernen studium uni universität bildung ausbildung prüfung kurs school education study university exam", ["a1-13", "a2-11", "b1-05", "b1-28", "b1-36", "b2-10", "b2-25", "b2-56", "b2-60", "c1-02"]],
  ["familie kinder eltern beziehung partner erziehung family children parents relationship", ["a1-02", "b1-23", "b2-24", "b2-40"]],
  ["gefühle emotionen meinung stimmung feelings emotions opinion mood", ["a1-03", "a2-25", "b1-21", "b2-44", "c1-19"]],
  ["reisen reise urlaub ferien hotel ausflug travel holiday vacation trip", ["a1-17", "a2-20", "b1-15", "b2-48"]],
  ["verkehr auto bus bahn zug fahrrad straße führerschein mobilität transport traffic car train bike driving", ["a1-16", "a2-18", "a2-19", "b1-08", "b1-38", "b1-45", "b2-19"]],
  ["stadt orte gebäude city town places", ["a1-15", "b1-25", "b2-16", "b2-50"]],
  ["geld bank finanzen sparen konto money finance banking", ["a2-12", "b1-07", "b1-37", "b2-18", "c1-10", "c2-14"]],
  ["amt ämter behörde behörden formular formulare bürokratie aufenthalt visum antrag authorities forms office residence", ["a1-26", "a2-13", "b1-04", "b1-35", "b2-04", "b2-20"]],
  ["versicherung versicherungen insurance", ["a2-14"]],
  ["medien internet handy computer digital technik smartphone media technology", ["a2-15", "a2-16", "b1-09", "b1-13", "b1-39", "b2-07", "b2-57", "b2-58", "c1-22", "c1-23"]],
  ["freizeit hobby hobbys musik film kino lesen kunst kultur leisure hobbies music cinema reading art culture", ["a1-14", "a2-21", "a2-23", "b1-14", "b1-20", "b2-14", "b2-39", "c1-20"]],
  ["feste feiertage feiern weihnachten geburtstag tradition festivals holidays celebrations", ["a2-21", "b1-20"]],
  ["politik staat gesellschaft wahlen demokratie gemeinde politics state society elections democracy", ["b1-11", "b1-18", "b2-04", "b2-05", "b2-33", "b2-36", "b2-51", "c1-13", "c1-17", "c2-08"]],
  ["recht gesetz vertrag polizei gericht strafe law contract police court", ["b1-01", "b1-03", "b1-12", "b1-42", "b2-03", "b2-33", "b2-54", "c1-12", "c1-14", "c2-07"]],
  ["zeit uhrzeit datum termin termine kalender zahlen planung time date numbers appointments", ["a1-18", "a2-28", "b1-30", "b2-47"]],
  ["wissenschaft forschung science research", ["b1-31", "b2-08", "b2-37", "b2-52", "c1-01", "c1-02", "c2-05", "c2-15"]],
  ["person vorstellung charakter identität person introduction character personality", ["a1-01", "a2-24", "b2-43", "c1-18", "c2-09"]],
  ["integration ankommen migration flucht zuwanderung arriving immigration refugees", ["b1-17", "b2-13", "b2-35"]],
  ["kommunikation gespräch telefon e-mail diskussion streit communication conversation phone discussion conflict", ["a2-15", "b1-10", "b1-40", "b2-26", "b2-59", "c1-24", "c2-12"]],
  ["handwerk werkzeug maschinen werkstatt reparatur tools machines repair", ["a2-03", "b1-43", "b2-49"]],
  ["verben verbs", ["a1-21", "a1-22", "a2-27"]],
  ["adjektive gegensätze adjectives opposites", ["a1-23"]],
  ["präpositionen prepositions", ["a1-24"]],
  ["konnektoren funktionswörter connectors", ["a1-25", "c1-03"]],
  ["redemittel phrases", ["a2-28"]],
  ["redewendungen idiome sprichwörter idioms proverbs sayings", ["c1-07", "c2-01"]],
  ["stil register formell umgangssprache style register formal informal slang", ["c1-04", "c2-02", "c2-03", "c2-06"]],
  ["wortbildung fremdwörter präfixe word building prefixes suffixes loanwords", ["c1-05", "c2-04"]],
  ["phrasal verbs", ["c1-06"]],
  ["argumentieren argument debate reasoning", ["c1-01", "c1-08"]],
  ["charakter lob kritik character praise criticism", ["c1-18", "c2-09", "c2-10", "c2-11"]],
  ["verwechslung confusable confused words", ["c2-16"]],
  ["körper bewegung movement body", ["c2-13"]],
  ["psychologie psychology mind behaviour", ["c1-16"]],
];

const BY_SET = new Map();
for (const [words, sets] of THEMES) {
  for (const id of sets) BY_SET.set(id, `${BY_SET.get(id) ?? ""} ${words}`.trim());
}

/** The theme words for one Lernset id ("" when it belongs to no theme). */
export const lernsetKeywords = (id) => BY_SET.get(id) ?? "";
