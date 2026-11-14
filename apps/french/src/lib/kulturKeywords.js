// Search keywords for the culture topics (kultur.json and kultur-insider.json): the words a
// learner types when looking for a topic, which are rarely the topic's title. „justificatif“ should
// find the proof-of-address topic, „deposit“ the renting topic. English and French, no accents needed for
// the terms people type without them. Read by src/lib/searchIndex.js, together with each topic's
// eyebrow and vocab words.

export const KULTUR_KEYWORDS = {
  // kultur.json
  "duzen-siezen": "tu vous formal informal polite address tutoyer vouvoyer vouvoiement",
  pfand: "greeting greetings hello bonjour la bise kiss handshake salut serrer la main",
  sonntagsruhe: "daily rhythm meal times opening hours sunday shops closed fermé horaires pause déjeuner",
  trinkgeld: "cafe café brasserie tip tipping bill l'addition service compris pourboire waiter serveur paying terrasse",
  bundeslaender: "regions departments départements overseas drom corsica map capitals prefecture préfecture numbers 75 13",
  feiertage: "public holidays jours fériés 14 juillet 1er mai pont calendar easter lundi de pâques",
  comida: "food meals breakfast lunch dinner menu du jour baguette cheese fromage petit-déjeuner déjeuner dîner souper",
  fiestas: "festivals fête de la musique 14 juillet bastille day noël chandeleur galette des rois carnaval beaujolais",
  muelltrennung: "recycling rubbish bins bac jaune verre déchetterie compost poubelle tri waste",
  termine: "appointment rendez-vous doctolib booking online préfecture anef prise de rendez-vous",
  anmeldung: "proof of address justificatif de domicile attestation d'hébergement facture quittance de loyer mairie register",
  krankenversicherung: "health doctor ameli carte vitale médecin traitant mutuelle urgences 15 112 pharmacie sécurité sociale",
  mieten: "rent renting flat apartment bail dépôt de garantie état des lieux charges apl caf landlord propriétaire locataire",
  schulsystem: "school education maternelle élémentaire collège lycée bac baccalauréat cantine rentrée children",
  "arbeit-finden": "hiring job cv photo interview probation contacts réseau",
  "lenguas-cooficiales": "regional languages breton occitan alsatian corsican basque catalan langues régionales constitution",
  "mundo-hispano": "francophone world belgium switzerland québec africa maghreb antilles oif septante nonante courriel",
  ausbildung: "apprenticeship apprentissage alternance cap bts licence university université parcoursup degree recognition naric",
  kuendigung: "leaving a job démission rupture conventionnelle licenciement préavis solde de tout compte chômage are",
  "oeffentlich-rechtlicher-rundfunk": "public media france télévisions radio france franceinfo france inter arte tv5monde rfi television",
  vereine: "associations clubs loi 1901 volunteering volunteer bénévolat forum des associations",
  "tradiciones-america": "francophone traditions québec fête nationale cabane à sucre poutine carnaval antilles gwoka zouk africa",
  foederalismus: "state decentralisation commune maire mayor préfet région département intercommunalité government",
  sozialversicherung: "social security sécurité sociale urssaf cotisations payslip fiche de paie pension retraite number",
  wahlen: "elections vote voting présidentielle législatives municipales carte électorale procuration",
  "historia-compartida": "history colonies former colonial algeria indochina africa decolonisation francophonie migration",
  erinnerungskultur: "memory vichy algerian war commemoration 11 novembre 8 mai history mémoire",
  grundgesetz: "constitution 1958 conseil constitutionnel laïcité secularism republic liberté égalité fraternité marianne",
  mitbestimmung: "unions syndicats cse convention collective strike grève prud'hommes workers rights",
  // kultur-insider.json
  "hallo-sagen": "hello greeting la bise handshake bonjour shop politeness salut",
  "naehe-abstand": "queue file d'attente personal space distance close loud noise",
  "hoefliche-notluegen": "please thank you s'il vous plaît merci polite tu vous rude",
  puenktlichkeit: "time punctual on time late lunch break dinner strike grève",
  "zusammen-oder-getrennt": "paying bill split l'addition chacun sa part invited round",
  "leute-kennenlernen": "small talk apéro conversation politics râler strangers",
  "freunde-finden": "friends making friends neighbours fête des voisins associations copropriété",
  "deutschland-und-das-auto": "cars driving trains tgv ter speed limit contrôle technique licence permis",
  gleichberechtigung: "women men equality pay gap parental leave surnames congé",
  "erstes-date": "dating date rendez-vous apps relationship",
  direktheit: "direct indirect politeness debate euphemism",
  vertrauen: "humour banter irony jokes second degré",
};
