# French course (apps/french, base /francais/) - slug map, English route -> French slug

Rules used: lowercase, hyphenated, no accents, elision written "d-" / "l-" / "s-" (entretiens-d-embauche).
Kept as is: proper/exam names (delf-dalf, tcf, tef, tcf-irn, montbruno), words identical in French
(intonation, prepositions, reference, culture, quiz, test, classes, tandem, bingo, domino, associations...).
Structure unchanged: same tree, only segment names change. Item ids / data keys / localStorage keys stay as they were.
Mechanism: ITEM_SLUGS / TOPIC_SLUGS tables in src/lib/routes.js hold the slug of data-driven pages;
old -> new redirects come from src/data/legacy-redirects.json (config) + dist/_redirects (real 301 on Cloudflare).

## Top-level and section routes
| English | French |
|---|---|
| /about | /a-propos |
| /account | /compte |
| /business-french | /francais-des-affaires |
| /card-set | /jeu-de-cartes |
| /civic-exam (/facts, /test) | /examen-civique (/faits, /test) |
| /code-de-la-route-vocabulary | /vocabulaire-code-de-la-route |
| /culture (/films-and-series, /insider, /mistakes, /quiz) | /culture (/films-et-series, /codes-sociaux, /erreurs, /quiz) |
| /delf-dalf, /tcf, /tef | unchanged |
| /tef/language-in-use, /practice-set | /tef/langue-en-situation, /serie-d-entrainement |
| /exam-plan | /plan-d-examen |
| /exams (/delf-tcf-or-tef, /traps) | /examens (/delf-tcf-ou-tef, /pieges) |
| /exercises | /exercices |
| /explore (/films) | /explorer (/films) |
| /french-for-work | /francais-au-travail |
| /game | /jeu |
| /games | /jeux |
| /grammar | /grammaire |
| /intonation (/check) | /intonation (/verification) |
| /join | /rejoindre |
| /knowledge | /savoirs |
| /legal-notice | /mentions-legales |
| /lesson | /lecon |
| /listening | /ecoute |
| /mascots | /mascottes |
| /my-mistakes | /mes-erreurs |
| /object-pronouns | /pronoms-complements |
| /placement-test | /test-de-niveau |
| /prepositions | /prepositions |
| /privacy | /confidentialite |
| /progress | /progression |
| /pronunciation | /prononciation |
| /pronunciation-check | /verification-prononciation |
| /reading | /lecture |
| /reading-writing | /lecture-ecriture |
| /reference | /reference |
| /residence-and-nationality/tcf-irn/(mock-test, practice-set) | /residence-et-nationalite/tcf-irn/(examen-blanc, serie-d-entrainement) |
| /skills | /competences |
| /speaking (/set) | /expression-orale (/serie) |
| /speaking-b1-b2 | /expression-orale-b1-b2 |
| /start | /demarrer |
| /step-by-step | /pas-a-pas |
| /survey | /sondage |
| /syllabus | /programme |
| /terms | /conditions-generales |
| /tongue-twisters | /virelangues |
| /vocabulary (/phrases, /print) | /vocabulaire (/formules, /impression) |
| /writing | /ecriture |

## Sub-routes
- business-french: units emails=courriels, phone-calls=appels-telephoniques, cv-and-cover-letter=cv-et-lettre-de-motivation, job-interviews=entretiens-d-embauche, meetings=reunions, negotiating=negociation; /words=/mots, /print=/impression
- games: listening-safari=safari-d-ecoute, gender-sprint=sprint-des-genres, impostor=imposteur, manners=bonnes-manieres, nut-night=nuit-des-noix, prefecture=prefecture, quaki-jumps=quaki-saute, sentence-rain=pluie-de-phrases, montbruno=montbruno
- grammar: common-mistakes=erreurs-frequentes, conjugation=conjugaison, parts-of-speech=natures-des-mots, path=parcours, quiz=quiz, verbs=verbes; reference tables irregular-verbs=verbes-irreguliers, reflexive-verbs-list=liste-verbes-pronominaux, verbs-with-prepositions=verbes-avec-prepositions
- knowledge: accents, country-and-culture=pays-et-culture, false-friends=faux-amis, idioms=expressions, languages=langues, learning=apprentissage, picture-dictionary=dictionnaire-visuel, quotes=citations (card=carte), slang=argot, word-stories=histoires-de-mots (review=revision, weekly=hebdomadaire)
- teachers=enseignants: cards=cartes, learn=apprendre, classes, class=classe, games=jeux, explain=expliquer, lesson=lecon, quiz/create=quiz/creer, surveys=sondages, result=resultat, tests, timetable=emploi-du-temps, worksheets=fiches, folder=classeur, grammar=grammaire, partner=binomes, tandem, vocabulary=vocabulaire
- Grammar topics (root /<slug>): the English-worded slugs became French (noun-gender=genre-des-noms, plurals=pluriels, subject-pronouns=pronoms-sujets, y-and-en=y-et-en, relative-pronouns=pronoms-relatifs ...); slugs that were already French stay. Full table: TOPIC_SLUGS in apps/french/src/lib/routes.js.
- Item pages (listening, reading, writing, speaking, culture, culture insider, vocabulary phrases, french-for-work sectors and groups): every slug translated, tables in ITEM_SLUGS / WORK_GROUP_SLUGS in routes.js.

## Fragment ids
| old | new |
|---|---|
| /skills#hoeren, #lesen, #schreiben, #sprechen | /competences#ecoute, #lecture, #ecriture, #expression-orale |
| #bestenliste (games) | #classement |
| #niveau-<x> (grammar, culture) | #niveau-<x> (already target-language-compatible, kept) |
| #tandem | #tandem |
| #offiziell (knowledge) | #officiel |
| #grammatik-start | #grammaire-debutant |
