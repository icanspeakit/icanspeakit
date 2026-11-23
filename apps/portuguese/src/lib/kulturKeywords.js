// Search keywords for the culture topics (kultur.json and kultur-insider.json): the words a
// learner types when looking for a topic, which are rarely the topic's title. „nif“ should
// find the registering topic, „deposit“ the renting topic. English and Portuguese, no accents
// needed for the terms people type without them. Read by src/lib/searchIndex.js, together with
// each topic's eyebrow and vocab words. Portugal topics: culture run, 2026-11-21.

export const KULTUR_KEYWORDS = {
  // kultur.json
  "duzen-siezen": "tu voce o senhor a senhora formal informal polite address voces tratar por tu dona",
  pfand: "greeting greetings hello beijinhos kiss handshake bom dia boa tarde boa noite ola tudo bem obrigado obrigada",
  sonntagsruhe: "daily rhythm meal times opening hours sunday shops closed feriado almoco jantar farmacia de servico encerrado",
  trinkgeld: "cafe coffee bica galao pastel de nata tip tipping gorjeta bill conta couvert nif contribuinte paying multibanco",
  bundeslaender: "regions distritos map mainland continente azores acores madeira funchal ponta delgada norte centro alentejo algarve nuts islands",
  feiertage: "public holidays feriados national municipal regional calendar 25 de abril 10 de junho ponte carnaval",
  comida: "food meals breakfast pequeno almoco lunch almoco dinner jantar lanche prato do dia sopa bacalhau francesinha sardinhas espetada cozido das furnas sobremesa",
  fiestas: "festivals festas populares santos populares santo antonio sao joao marchas manjerico sardinhas romaria carnaval natal consoada pascoa espirito santo festa da flor",
  fado: "fado music musica guitarra portuguesa viola amalia casa de fados saudade coimbra cante alentejano unesco alfama",
  muelltrennung: "recycling rubbish waste ecoponto bins containers azul amarelo verde vidrao pilhao oleao monos lixo biorresiduos",
  termine: "appointment marcacao senha ticket office loja do cidadao espaco cidadao gov.pt chave movel digital aima atendimento prioritario balcao",
  anmeldung: "nif niss numero de utente atestado de residencia junta de freguesia financas contribuinte registration register crue aima residence permit tax number social security number first steps",
  krankenversicherung: "health doctor public health sns centro de saude usf medico de familia sns 24 808 112 urgencias hospital farmacia pharmacy receita prescription taxas moderadoras",
  mieten: "rent renting flat apartment casa t1 t2 renda caucao deposit fiador guarantor senhorio landlord contrato de arrendamento recibo de renda condominio bills",
  schulsystem: "school education pre-escolar jardim de infancia ensino basico ciclo secundario cursos profissionais exames nacionais matricula portal das matriculas children plnm",
  "arbeit-finden": "job work cv curriculo iefp centro de emprego contrato sem termo a termo periodo experimental recibos verdes salario minimo subsidio de ferias natal interview",
  "lenguas-cooficiales": "languages mirandes mirandese miranda do douro lingua gestual portuguesa sign language accent sotaque acordo ortografico spelling pluricentric",
  "mundo-hispano": "portuguese speaking world lusophone lusofonia cplp brazil brasil angola mozambique mocambique cabo verde cape verde guinea timor macau varieties accent pt-pt pt-br autocarro onibus telemovel celular acordo ortografico",
  ausbildung: "university universidade politecnico licenciatura mestrado doutoramento ctesp concurso nacional de acesso propinas dges reconhecimento degree recognition equivalencia ordem",
  kuendigung: "leaving a job notice aviso previo denuncia despedimento dismissal justa causa revogacao mutuo acordo compensacao subsidio de desemprego unemployment iefp resign",
  "oeffentlich-rechtlicher-rundfunk": "rtp rtp1 rtp2 rtp3 rtp play antena 1 public media television radio broadcaster contribuicao audiovisual sic tvi lusa erc",
  vereine: "associations associacao coletividade clubs banda filarmonica rancho folclorico bombeiros voluntarios volunteering voluntariado ipss misericordia socio quota immigrant",
  "tradiciones-america": "traditions lusophone brazil carnaval samba festas juninas feijoada morna cachupa cabo verde kizomba semba angola muamba marrabenta mozambique music food",
  foederalismus: "state local power republic municipio concelho camara municipal freguesia junta assembleia regiao autonoma acores azores madeira ccdr area metropolitana distrito unitary federal",
  sozialversicherung: "seguranca social social security niss contributions descontos tsu pension reforma retirement recibos verdes independente baixa sick pay subsidio abono segurança social direta",
  wahlen: "elections vote voting eleicoes legislativas presidenciais autarquicas europeias dhondt deputados assembleia da republica recenseamento assembleia de voto foreigners",
  "historia-compartida": "history shared lusophone descobrimentos discoveries empire colonial slavery brazil independence 1822 colonial war guerra colonial retornados timor macau 1999 cplp migration",
  erinnerungskultur: "25 de abril 1974 revolution carnation revolucao dos cravos estado novo salazar caetano pide mfa grandola prec dictatorship democracy liberdade",
  grundgesetz: "constitution constituicao 1976 tribunal constitucional constitutional court rights direitos provedor de justica ombudsman revision artigo 13 15",
  mitbestimmung: "unions sindicato sindicatos cgtp ugt convencao coletiva collective agreement greve strike comissao de trabalhadores act inspection codigo do trabalho workers rights",

  // kultur-insider.json
  "hallo-sagen": "hello greeting greetings dois beijinhos kiss handshake bom dia boa tarde boa noite ola com licenca prazer ate logo",
  "naehe-abstand": "queue queues senha ticket quem e o ultimo personal space distance atendimento prioritario priority desculpe",
  "hoefliche-notluegen": "please thank you por favor se faz favor obrigado obrigada queria polite desculpe peco desculpa de nada",
  puenktlichkeit: "time punctual on time late ja vou logo lunch almoco jantar dinner appointment",
  "zusammen-oder-getrennt": "paying bill split a meias mb way conta contribuinte nif receipt fatura hoje pago eu",
  "leute-kennenlernen": "small talk cafe da esquina o costume conversa de escada neighbours football benfica porto sporting weather",
  "freunde-finden": "friends making friends neighbours whatsapp condominio associacao coletividade language exchange volunteering",
  "arbeit-finden": "hiring job cv curriculo cunha iefp interview entrevista periodo experimental trial period contacts",
  "deutschland-und-das-auto": "cars driving trains cp comboios alfa pendular intercidades metro via verde portagens tolls speed limit alcohol imt licence inspecao",
  gleichberechtigung: "women men equality pay gap parental leave licenca parental cite surnames apelidos",
  "erstes-date": "dating date combinar tomar um cafe beber um copo apps relationship pagar a meias",
  direktheit: "direct indirect pois logo se ve se calhar politeness soft no vou ver o que posso fazer",
  vertrauen: "humour banter irony gozar brincar jokes alfacinhas tripeiros carnaval torres vedras satire",
};
