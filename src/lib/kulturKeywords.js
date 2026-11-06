// Search keywords for the culture topics (kultur.json and kultur-insider.json): the words a
// learner types when looking for a topic, which are rarely the topic's title. „padrón“ should
// find empadronamiento, „deposit“ the renting topic. English and Spanish, no accents needed for
// the terms people type without them. Read by src/lib/searchIndex.js, together with each topic's
// eyebrow and vocab words.

export const KULTUR_KEYWORDS = {
  // kultur.json
  "duzen-siezen": "tu usted tú formal informal polite address vosotros ustedes tutear",
  pfand: "greeting greetings hello dos besos kiss handshake buenas hola saludar",
  sonntagsruhe: "daily rhythm meal times opening hours sunday shops closed festivo siesta horario",
  trinkgeld: "bar bars tip tipping bill la cuenta invitar propina waiter camarero paying",
  bundeslaender: "regions autonomous communities comunidades autonomas ceuta melilla map capitals andalucia cataluna galicia",
  feiertage: "public holidays festivos national regional local calendar puente",
  comida: "food meals breakfast lunch dinner menu del dia tapas paella comida cena desayuno regional dishes",
  fiestas: "festivals fiestas reyes carnaval semana santa easter fallas feria de abril sanfermines holidays town",
  muelltrennung: "recycling rubbish bins containers contenedor amarillo azul verde marron basura waste",
  termine: "appointment cita previa booking online sede electronica clave office",
  anmeldung: "empadronamiento padron register town hall ayuntamiento certificate address volante",
  krankenversicherung: "health doctor public health tarjeta sanitaria centro de salud urgencias 112 hospital",
  mieten: "rent renting flat piso fianza deposit landlord contract bills comunidad alquiler",
  schulsystem: "school education infantil primaria eso bachillerato fp children colegio",
  "arbeit-finden": "job work cv curriculum sepe contract indefinido temporal interview trabajo",
  "lenguas-cooficiales": "languages catalan gallego euskera basque valenciano aranes co-official castellano bilingual",
  "mundo-hispano": "hispanic world latin america vosotros ustedes coche carro countries varieties latam spanish speaking",
  ausbildung: "fp formacion profesional university universidad selectividad pau ebau homologacion degree",
  kuendigung: "leaving a job notice preaviso finiquito paro dismissal despido resign unemployment",
  "oeffentlich-rechtlicher-rundfunk": "rtve tve public media television radio broadcaster canal sur 3cat etb",
  vereine: "associations clubs penas volunteering volunteer ampa asociacion voluntariado",
  "tradiciones-america": "latin america traditions dia de muertos quinceanera inti raymi carnaval barranquilla mate arepas tacos",
  foederalismus: "state of autonomies provinces municipalities diputacion government estatuto competencias",
  sozialversicherung: "seguridad social number afiliacion contributions pension autonomos cotizar vida laboral",
  wahlen: "elections vote voting congreso senate dhondt electoral system ballot",
  "historia-compartida": "history latin america 1492 independence colonial 12 de octubre migration hispanidad",
  erinnerungskultur: "transition democracy transicion franco 1978 moncloa pacts memoria democratica history",
  grundgesetz: "constitution constitucion 1978 constitutional court tribunal constitucional amparo rights",
  mitbestimmung: "unions sindicatos convenio colectivo ccoo ugt workers rights strike huelga comite de empresa",

  // kultur-insider.json
  "hallo-sagen": "hello greeting dos besos handshake lift buenas hasta luego",
  "naehe-abstand": "queue quien es el ultimo personal space distance close loud noise",
  "hoefliche-notluegen": "please thank you por favor gracias polite vale perdona rude ponme",
  puenktlichkeit: "time punctual on time late ahora voy manana lunch dinner",
  "zusammen-oder-getrennt": "paying bill split invitar a escote bizum round cuenta",
  "leute-kennenlernen": "small talk sobremesa aperitivo conversation bar strangers",
  "freunde-finden": "friends making friends neighbours whatsapp comunidad penas intercambio",
  "arbeit-finden": "hiring job cv photo enchufe interview probation contacts",
  "deutschland-und-das-auto": "cars driving trains ave cercanias speed limit itv low emission zone licence",
  gleichberechtigung: "women men equality pay gap parental leave surnames birth leave",
  "erstes-date": "dating date quedar tomar algo apps relationship",
  direktheit: "direct indirect ya te dire a ver si quedamos politeness hombre no",
  vertrauen: "humour banter irony vacilar coña jokes chirigotas",
};
