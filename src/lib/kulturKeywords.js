// Search keywords for the Landeskunde topics (kultur.json and kultur-insider.json): the
// words a learner types when looking for a topic, which are rarely the topic's title.
// „queue“ should find the queuing topic, „licence fee“ the BBC one. The kultur.json entries are
// English (UK topics in the old German-named slots); the insider entries follow that file. Read by
// src/lib/searchIndex.js, together with each topic's eyebrow and vocab words.

export const KULTUR_KEYWORDS = {
  // kultur.json
  "duzen-siezen": "mr ms mrs dr title first name surname formal informal polite address call me",
  pfand: "queue queuing line wait jump the queue polite turn",
  sonntagsruhe: "sunday trading shop opening hours open closed supermarket corner shop",
  trinkgeld: "tip tipping service charge bill waiter restaurant pub",
  bundeslaender: "england scotland wales northern ireland four nations great britain uk capital map",
  feiertage: "bank holiday holidays public holiday christmas easter boxing day st patrick st andrew",
  muelltrennung: "rubbish recycling bin bin day council waste food caddy tip",
  termine: "appointment booking book gp doctor dentist nhs app 111 cancel",
  anmeldung: "register gp national insurance ni number bank account council tax electoral roll first steps",
  krankenversicherung: "nhs health doctor gp prescription a&e hospital 111 999 surcharge",
  mieten: "rent renting flat landlord deposit council tax bills tenancy letting agent",
  schulsystem: "school education primary secondary gcse a level reception year state school private scotland highers",
  "arbeit-finden": "job cv cover letter references application interview right to work",
  ausbildung: "apprenticeship university ucas personal statement tuition fees student loan",
  kuendigung: "notice period resign resignation dismissal leave a job p45 reference unfair dismissal",
  "oeffentlich-rechtlicher-rundfunk": "bbc tv licence licence fee iplayer broadcasting public broadcaster",
  vereine: "club society volunteering volunteer charity shop hobby",
  foederalismus: "devolution westminster holyrood senedd stormont parliament assembly council mayor",
  sozialversicherung: "national insurance welfare state pension universal credit sick pay benefits",
  wahlen: "election general election vote voting first past the post constituency mp prime minister",
  erinnerungskultur: "remembrance poppy armistice cenotaph two minutes silence war memorial history",
  grundgesetz: "constitution uncodified supreme court parliamentary sovereignty magna carta human rights act",
  mitbestimmung: "trade union union strike workers rights minimum wage living wage acas tribunal",

  // kultur-insider.json
  "hallo-sagen": "hello greeting handshake hug kiss hi hiya meet",
  "naehe-abstand": "personal space distance queue close escalator stand on the right",
  "hoefliche-notluegen": "sorry please thank you cheers ta polite politeness",
  puenktlichkeit: "time punctual on time late party half seven",
  "zusammen-oder-getrennt": "paying pay bill split round pub buy a round",
  "leute-kennenlernen": "small talk weather how are you conversation strangers",
  "freunde-finden": "friends making friends club society parkrun meet people",
  "arbeit-finden": "hiring job interview recruitment application cv right to work",
  "deutschland-und-das-auto": "car cars driving drive on the left mot speed limit mph licence bus train",
  gleichberechtigung: "women men equality gender pay gap maternity paternity leave work",
  "erstes-date": "dating date first date relationship partner",
  direktheit: "understatement indirect polite not bad i'll bear it in mind with respect direct",
  vertrauen: "banter irony sarcasm humour joke teasing",
};
