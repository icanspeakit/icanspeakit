# URL map (2026-11-15)

The course-level addresses are Italian (see the end for what is not). Old English addresses redirect (301) via `src/data/legacy-redirects.json`, read by `astro.config.mjs`. The item, topic, reference, work-group and business-unit slugs live in `src/lib/routes.js`; the old values are in the redirect file.

| Old | New |
|---|---|
| /about | /chi-siamo |
| /card-set | /set-di-carte |
| /culture | /cultura |
| /culture/films-and-series | /cultura/film-e-serie |
| /culture/insider | /cultura/dietro-le-quinte |
| /culture/mistakes | /cultura/errori |
| /exam-plan | /piano-d-esame |
| /exams | /esami |
| /exams/traps | /esami/trappole |
| /exercises | /esercizi |
| /explore | /esplora |
| /explore/films | /esplora/film |
| /game | /gioco |
| /games | /giochi |
| /games/gender-sprint | /giochi/sprint-degli-articoli |
| /games/impostor | /giochi/impostore |
| /games/listening-safari | /giochi/safari-d-ascolto |
| /games/manners | /giochi/buone-maniere |
| /games/nut-night | /giochi/notte-delle-noci |
| /games/quaki-jumps | /giochi/salti-di-quaki |
| /games/sentence-rain | /giochi/pioggia-di-frasi |
| /grammar | /grammatica |
| /grammar/common-mistakes | /grammatica/errori-comuni |
| /grammar/conjugation | /grammatica/coniugazione |
| /grammar/irregular-verbs | /grammatica/verbi-irregolari |
| /grammar/parts-of-speech | /grammatica/parti-del-discorso |
| /grammar/path | /grammatica/percorso |
| /grammar/reflexive-verbs-list | /grammatica/elenco-verbi-riflessivi |
| /grammar/verbs | /grammatica/verbi |
| /grammar/verbs-with-prepositions | /grammatica/verbi-con-preposizioni |
| /intonation | /intonazione |
| /intonation/check | /intonazione/verifica |
| /join | /partecipa |
| /knowledge | /conoscenze |
| /knowledge/accents | /conoscenze/accenti |
| /knowledge/country-and-culture | /conoscenze/paese-e-cultura |
| /knowledge/false-friends | /conoscenze/falsi-amici |
| /knowledge/idioms | /conoscenze/modi-di-dire |
| /knowledge/languages | /conoscenze/lingue |
| /knowledge/learning | /conoscenze/apprendimento |
| /knowledge/picture-dictionary | /conoscenze/dizionario-illustrato |
| /knowledge/quotes | /conoscenze/citazioni |
| /knowledge/quotes/card | /conoscenze/citazioni/scheda |
| /knowledge/slang | /conoscenze/gergo |
| /knowledge/word-stories | /conoscenze/storie-di-parole |
| /knowledge/word-stories/review | /conoscenze/storie-di-parole/ripasso |
| /knowledge/word-stories/weekly | /conoscenze/storie-di-parole/settimanale |
| /legal-notice | /note-legali |
| /lesson | /lezione |
| /listening | /ascolto |
| /mascots | /mascotte |
| /my-mistakes | /i-miei-errori |
| /object-pronouns | /pronomi-complemento |
| /placement-test | /test-di-livello |
| /prepositions | /preposizioni |
| /progress | /progressi |
| /pronunciation | /pronuncia |
| /pronunciation-check | /verifica-pronuncia |
| /reading | /lettura |
| /reading-writing | /lettura-e-scrittura |
| /reference | /consultazione |
| /skills | /competenze |
| /speaking | /parlato |
| /speaking-b1-b2 | /parlato-b1-b2 |
| /speaking/set | /parlato/serie |
| /start | /inizia |
| /step-by-step | /passo-passo |
| /survey | /sondaggio |
| /syllabus | /programma |
| /teachers | /insegnanti |
| /teachers/cards | /insegnanti/carte |
| /teachers/cards/learn | /insegnanti/carte/impara |
| /teachers/cards/photo | /insegnanti/carte/foto |
| /teachers/classes | /insegnanti/classi |
| /teachers/classes/class | /insegnanti/classi/classe |
| /teachers/games | /insegnanti/giochi |
| /teachers/games/explain | /insegnanti/giochi/spiega |
| /teachers/lesson | /insegnanti/lezione |
| /teachers/quiz/create | /insegnanti/quiz/crea |
| /teachers/surveys | /insegnanti/sondaggi |
| /teachers/surveys/result | /insegnanti/sondaggi/risultato |
| /teachers/tests | /insegnanti/test |
| /teachers/tests/result | /insegnanti/test/risultato |
| /teachers/timetable | /insegnanti/orario |
| /teachers/worksheets | /insegnanti/schede |
| /teachers/worksheets/folder | /insegnanti/schede/cartella |
| /teachers/worksheets/grammar | /insegnanti/schede/grammatica |
| /teachers/worksheets/partner | /insegnanti/schede/coppie |
| /teachers/worksheets/tandem | /insegnanti/schede/tandem |
| /teachers/worksheets/vocabulary | /insegnanti/schede/vocabolario |
| /terms | /condizioni |
| /tongue-twisters | /scioglilingua |
| /vocabulary | /vocabolario |
| /vocabulary/phrases | /vocabolario/espressioni |
| /vocabulary/print | /vocabolario/stampa |
| /writing | /scrittura |

Fragments: `/competenze#ascolto|lettura|scrittura|parlato` (old #hoeren, #lesen, #schreiben, #sprechen still work), `#livello-a1`, `#gruppo-<id>`, `#classifica`, `#ufficiale`.

## The Italian course's own pages (sync-monorepo, 2026-11-16)

The Italian content (content-it branch) replaced the Spanish course's pages before the URLs moved;
the merge put its pages on Italian slugs in the same pattern. These English addresses were never
public, so they have no redirect.

| content-it (English) | Italian |
|---|---|
| /business-italian (+ /<unit>/words, /words/print) | /italiano-commerciale (+ /<unit>/parole, /parole/stampa) |
| /italian-for-work (+ /<sector>/<group>/print) | /italiano-per-il-lavoro (+ /<sector>/<group>/stampa) |
| /patente-vocabulary (+ /<group>/print) | /vocabolario-patente (+ /<group>/stampa) |
| /civic-knowledge, /civic-knowledge/facts, /civic-knowledge/test | /cultura-civica, /cultura-civica/fatti, /cultura-civica/test |
| /citizenship | /cittadinanza |
| /citizenship/b1-mock (+ /mock-test, /practice-set) | /cittadinanza/prova-b1 (+ /simulazione, /esercitazione) |
| /plida/practice-set | /plida/esercitazione |
| /cils/language-use | /cils/uso-della-lingua |
| /exams/which-exam | /esami/quale-esame |
| /games/article-sprint (Spanish /games/gender-sprint) | /giochi/sprint-degli-articoli |
| /games/questura (Spanish /games/extranjeria) | /giochi/questura |
| /games/casalbruno (Spanish /games/villabruno) | /giochi/casalbruno |

Unchanged: /cils, /celi, /plida, /certit (exam names) and every item, topic, unit and sector slug
inside a section (routes.js). The Spanish-only pages (/dele, /siele, /ccse, /nationality,
/business-spanish, /spanish-for-work, /dgt-vocabulary, /esami/dele-or-siele) are gone.
