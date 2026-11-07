# Inhalts-Prüfung: Bericht

Erzeugt von `pnpm check:inhalte` (scripts/check-inhalte.mjs). Nicht von Hand bearbeiten; die Daten stehen in `befunde.json`.

| Offen | Anzahl |
|---|---|
| Fehler | 1 |
| Warnungen | 102 |
| Hinweise | 44 |
| geschlossen (erledigt, kein Fehler, doppelt) | 0 |

## Nach Prüfung (offen)

| Prüfung | Anzahl |
|---|---|
| `raten.nur-zwei-antworten` | 55 |
| `deutsch.anfuehrungszeichen` | 43 |
| `raten.laengste-antwort` | 37 |
| `hinweis.verraet-loesung` | 5 |
| `aktualitaet.ohne-stand` | 3 |
| `doppelt.frage` | 2 |
| `struktur.match-doppelt` | 1 |
| `niveau.satzlaenge` | 1 |

## Nach Datei

### src/data/fehler-nach-sprache.json (1)

**Warnung** (1)

- `k:fehler/q9` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (49 gegen höchstens 25 Zeichen) und lässt sich ohne Wissen erraten.

### src/data/grammatik/adjektive-als-nomen.json (1)

**Warnung** (1)

- `g:adjektive-als-nomen/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (one / ones) für 7 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/aduso.json (2)

**Warnung** (2)

- `g:aduso/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (right / wrong) für 6 Zeilen: Raten trifft jede zweite.
- `g:aduso/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (so / because) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/als-oder-wenn.json (4)

**Warnung** (3)

- `g:als-oder-wenn/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (when / if) für 8 Zeilen: Raten trifft jede zweite.
- `g:als-oder-wenn/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (when / if) für 7 Zeilen: Raten trifft jede zweite.
- `g:als-oder-wenn/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (when / if) für 5 Zeilen: Raten trifft jede zweite.

**Hinweis** (1)

- `g:als-oder-wenn/4/5` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Have some more ___ you are still hungry!"; deutsch: „…“.

### src/data/grammatik/artikel-oder-nicht.json (1)

**Warnung** (1)

- `g:artikel-oder-nicht/6` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (— / the) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/artikel.json (2)

**Warnung** (2)

- `g:artikel/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (a / an) für 10 Zeilen: Raten trifft jede zweite.
- `g:artikel/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (an / a) für 9 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/berufe-mit-in.json (3)

**Warnung** (3)

- `g:berufe-mit-in/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (is / are) für 6 Zeilen: Raten trifft jede zweite.
- `g:berufe-mit-in/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (isnt / arent) für 6 Zeilen: Raten trifft jede zweite.
- `g:berufe-mit-in/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (is / are) für 6 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/dativ.json (2)

**Warnung** (2)

- `g:dativ/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (to / for) für 8 Zeilen: Raten trifft jede zweite.
- `g:dativ/5` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (them / it) für 6 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/finalsaetze.json (2)

**Warnung** (2)

- `g:finalsaetze/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (to / so that) für 8 Zeilen: Raten trifft jede zweite.
- `g:finalsaetze/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (both / only so that) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/fokuspartikeln.json (1)

**Warnung** (1)

- `g:fokuspartikeln/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (middle / end) für 5 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/funktionen-von-werden.json (1)

**Warnung** (1)

- `g:funktionen-von-werden/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (told / said) für 7 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/genitiv.json (4)

**Fehler** (1)

- `g:genitiv/4` · struktur.match-doppelt: Zwei Paare haben dieselbe linke oder rechte Seite.

**Warnung** (2)

- `g:genitiv/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (s / of) für 8 Zeilen: Raten trifft jede zweite.
- `g:genitiv/5` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (s / of) für 6 Zeilen: Raten trifft jede zweite.

**Hinweis** (1)

- `g:genitiv/5/6` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "A friend ___ mine gave me this chair."; deutsch: „…“.

### src/data/grammatik/gern.json (1)

**Warnung** (1)

- `g:gern/7` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (likes / doesnt like) für 4 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/indefinitpronomen.json (2)

**Hinweis** (2)

- `g:indefinitpronomen/5/6` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Can I have ___ bread, please?"; deutsch: „…“.
- `g:indefinitpronomen/5/7` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen " She pays and says, "; deutsch: „…“.

### src/data/grammatik/ja-nein-fragen.json (3)

**Hinweis** (3)

- `g:ja-nein-fragen/2/jn1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "She works in a bank."; deutsch: „…“.
- `g:ja-nein-fragen/2/jn2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "They live in Cardiff."; deutsch: „…“.
- `g:ja-nein-fragen/2/jn3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Your brother is a teacher."; deutsch: „…“.

### src/data/grammatik/komparativ-superlativ.json (1)

**Warnung** (1)

- `g:komparativ-superlativ/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (than / as) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/konjugation.json (3)

**Warnung** (3)

- `g:konjugation/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (present simple / present continuous) für 8 Zeilen: Raten trifft jede zweite.
- `g:konjugation/4/2` · hinweis.verraet-loesung: Der Hinweis ist die Lösung.
- `g:konjugation/4/4` · hinweis.verraet-loesung: Der Hinweis ist die Lösung.

### src/data/grammatik/konjunktiv2-hoeflich.json (1)

**Warnung** (1)

- `g:konjunktiv2-hoeflich/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (can / would) für 5 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/modalpartikeln.json (1)

**Warnung** (1)

- `g:modalpartikeln/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (marker / not a marker) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/modalsaetze.json (1)

**Hinweis** (1)

- `g:modalsaetze/1/1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "I saw Tom on the bus!"; deutsch: „…“.

### src/data/grammatik/n-deklination.json (1)

**Warnung** (1)

- `g:n-deklination/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (used to only / used to or would) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/negation.json (1)

**Warnung** (1)

- `g:negation/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (no / not) für 6 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/nomen.json (2)

**Warnung** (2)

- `g:nomen/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (noun / not a noun) für 10 Zeilen: Raten trifft jede zweite.
- `g:nomen/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (capital / small) für 7 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/nutzen-benutzen.json (1)

**Warnung** (1)

- `g:nutzen-benutzen/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (make / do) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/personalpronomen.json (1)

**Hinweis** (1)

- `g:personalpronomen/7/6` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "___ am tired today."; deutsch: „…“.

### src/data/grammatik/plural.json (1)

**Warnung** (1)

- `g:plural/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (are / is) für 6 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/positionsverben.json (4)

**Hinweis** (4)

- `g:positionsverben/5/1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Can I ___ your ladder?"; deutsch: „…“.
- `g:positionsverben/5/2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Can I your ladder?"; deutsch: „…“.
- `g:positionsverben/5/3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Can I your ladder?"; deutsch: „…“.
- `g:positionsverben/5/4` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen " Amira yes. "; deutsch: „…“.

### src/data/grammatik/possessivartikel.json (4)

**Warnung** (4)

- `g:possessivartikel/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (his / her) für 6 Zeilen: Raten trifft jede zweite.
- `g:possessivartikel/6/2` · hinweis.verraet-loesung: Der Hinweis ist die Lösung.
- `g:possessivartikel/6/6` · hinweis.verraet-loesung: Der Hinweis ist die Lösung.
- `g:possessivartikel/7` · raten.nur-zwei-antworten: Nur 1 mögliche Antworten (its) für 5 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/praesens.json (1)

**Warnung** (1)

- `g:praesens/2/3` · hinweis.verraet-loesung: Der Hinweis ist die Lösung.

### src/data/grammatik/praeteritum-sein-haben.json (3)

**Warnung** (3)

- `g:praeteritum-sein-haben/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (was / were) für 6 Zeilen: Raten trifft jede zweite.
- `g:praeteritum-sein-haben/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (wasnt / werent) für 6 Zeilen: Raten trifft jede zweite.
- `g:praeteritum-sein-haben/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (was / were) für 6 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/reflexive-verben.json (3)

**Hinweis** (3)

- `g:reflexive-verben/5/2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Be careful, Kwame,"; deutsch: „…“.
- `g:reflexive-verben/5/3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Don't hurt !"; deutsch: „…“.
- `g:reflexive-verben/5/5` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "We did all the cooking by ___, so please eat a lot!"; deutsch: „…“.

### src/data/grammatik/relativpronomen.json (2)

**Warnung** (2)

- `g:relativpronomen/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (who / which) für 6 Zeilen: Raten trifft jede zweite.
- `g:relativpronomen/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (no / yes) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/relativsaetze-was-wo.json (1)

**Warnung** (1)

- `g:relativsaetze-was-wo/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (defining / non-defining) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/satzstellung.json (2)

**Warnung** (2)

- `g:satzstellung/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (countable / uncountable) für 8 Zeilen: Raten trifft jede zweite.
- `g:satzstellung/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (a few / a little) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/temporale-praepositionen-b1.json (2)

**Warnung** (2)

- `g:temporale-praepositionen-b1/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (for / since) für 8 Zeilen: Raten trifft jede zweite.
- `g:temporale-praepositionen-b1/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (until / by) für 6 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/temporale-praepositionen.json (1)

**Warnung** (1)

- `g:temporale-praepositionen/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (wrong / right) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/verb-position-2.json (1)

**Warnung** (1)

- `g:verb-position-2/5` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (right / wrong) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/wechselpraepositionen.json (1)

**Warnung** (1)

- `g:wechselpraepositionen/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (position / movement) für 10 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/welcher-dieser.json (3)

**Warnung** (3)

- `g:welcher-dieser/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (this / that) für 6 Zeilen: Raten trifft jede zweite.
- `g:welcher-dieser/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (these / those) für 6 Zeilen: Raten trifft jede zweite.
- `g:welcher-dieser/5` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (which / what) für 5 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/wortarten.json (1)

**Warnung** (1)

- `g:wortarten/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (verb / noun) für 8 Zeilen: Raten trifft jede zweite.

### src/data/grammatik/zustandspassiv.json (1)

**Warnung** (1)

- `g:zustandspassiv/2` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (have / has) für 7 Zeilen: Raten trifft jede zweite.

### src/data/kultur-insider.json (38)

**Warnung** (13)

- `k:insider/hoefliche-notluegen/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (32 gegen höchstens 7 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/puenktlichkeit/q2` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (26 gegen höchstens 8 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/puenktlichkeit/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (35 gegen höchstens 12 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/zusammen-oder-getrennt/q1` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (62 gegen höchstens 25 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/leute-kennenlernen/q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (33 gegen höchstens 13 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/freunde-finden/q1` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (36 gegen höchstens 18 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/arbeit-finden/q1` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (46 gegen höchstens 18 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/arbeit-finden/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (58 gegen höchstens 25 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/gleichberechtigung/q2` · aktualitaet.ohne-stand: Kann veralten („2024“), aber kein „stand“-Feld.
- `k:insider/erstes-date/q1` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (37 gegen höchstens 15 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/erstes-date/q2` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (43 gegen höchstens 24 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/erstes-date/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (26 gegen höchstens 14 Zeichen) und lässt sich ohne Wissen erraten.
- `k:insider/vertrauen/q1` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (46 gegen höchstens 18 Zeichen) und lässt sich ohne Wissen erraten.

**Hinweis** (25)

- `k:insider/hallo-sagen/q2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "How are you?"; deutsch: „…“.
- `k:insider/hallo-sagen/q3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "See you later"; deutsch: „…“.
- `k:insider/naehe-abstand/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "queue"; deutsch: „…“.
- `k:insider/hoefliche-notluegen/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Cheers!"; deutsch: „…“.
- `k:insider/hoefliche-notluegen/q2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "You alright?"; deutsch: „…“.
- `k:insider/hoefliche-notluegen/q3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "What?"; deutsch: „…“.
- `k:insider/hoefliche-notluegen/q4` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Sorry about that."; deutsch: „…“.
- `k:insider/puenktlichkeit/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "half seven"; deutsch: „…“.
- `k:insider/puenktlichkeit/q3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "I'm running late."; deutsch: „…“.
- `k:insider/zusammen-oder-getrennt/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "round"; deutsch: „…“.
- `k:insider/leute-kennenlernen/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Lovely weather, isn't it?"; deutsch: „…“.
- `k:insider/leute-kennenlernen/q2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "What do you do?"; deutsch: „…“.
- `k:insider/freunde-finden/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "We should meet up sometime."; deutsch: „…“.
- `k:insider/freunde-finden/q3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Fancy a coffee sometime?"; deutsch: „…“.
- `k:insider/arbeit-finden/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "CV"; deutsch: „…“.
- `k:insider/arbeit-finden/q3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Tell me about a time when you worked in a team."; deutsch: „…“.
- `k:insider/erstes-date/q2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "ghosting"; deutsch: „…“.
- `k:insider/erstes-date/q4` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "No, thank you."; deutsch: „…“.
- `k:insider/direktheit/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Not bad."; deutsch: „…“.
- `k:insider/direktheit/q2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "With respect, ..."; deutsch: „…“.
- `k:insider/direktheit/q3` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "I'll bear it in mind."; deutsch: „…“.
- `k:insider/direktheit/q4` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Could you possibly send it by Friday?"; deutsch: „…“.
- `k:insider/vertrauen/q1` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "banter"; deutsch: „…“.
- `k:insider/vertrauen/q2` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Lovely weather!"; deutsch: „…“.
- `k:insider/vertrauen/q4` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "It was only banter"; deutsch: „…“.

### src/data/kultur.json (24)

**Warnung** (23)

- `k:termine/q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (40 gegen höchstens 23 Zeichen) und lässt sich ohne Wissen erraten.
- `k:anmeldung/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (47 gegen höchstens 22 Zeichen) und lässt sich ohne Wissen erraten.
- `k:anmeldung/q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (35 gegen höchstens 14 Zeichen) und lässt sich ohne Wissen erraten.
- `k:krankenversicherung/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (39 gegen höchstens 17 Zeichen) und lässt sich ohne Wissen erraten.
- `k:mieten/q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (62 gegen höchstens 29 Zeichen) und lässt sich ohne Wissen erraten.
- `k:arbeit-finden/q1` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (30 gegen höchstens 18 Zeichen) und lässt sich ohne Wissen erraten.
- `k:arbeit-finden/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (46 gegen höchstens 27 Zeichen) und lässt sich ohne Wissen erraten.
- `k:ausbildung/q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (51 gegen höchstens 28 Zeichen) und lässt sich ohne Wissen erraten.
- `k:kuendigung/q2` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (55 gegen höchstens 32 Zeichen) und lässt sich ohne Wissen erraten.
- `k:oeffentlich-rechtlicher-rundfunk/q1` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (53 gegen höchstens 32 Zeichen) und lässt sich ohne Wissen erraten.
- `k:oeffentlich-rechtlicher-rundfunk/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (52 gegen höchstens 29 Zeichen) und lässt sich ohne Wissen erraten.
- `k:oeffentlich-rechtlicher-rundfunk/q3` · aktualitaet.ohne-stand: Kann veralten („2027“), aber kein „stand“-Feld.
- `k:vereine/q1` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (64 gegen höchstens 31 Zeichen) und lässt sich ohne Wissen erraten.
- `k:vereine/q2` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (69 gegen höchstens 37 Zeichen) und lässt sich ohne Wissen erraten.
- `k:vereine/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (60 gegen höchstens 27 Zeichen) und lässt sich ohne Wissen erraten.
- `k:vereine/q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (45 gegen höchstens 26 Zeichen) und lässt sich ohne Wissen erraten.
- `k:foederalismus/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (68 gegen höchstens 33 Zeichen) und lässt sich ohne Wissen erraten.
- `k:foederalismus/q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (55 gegen höchstens 30 Zeichen) und lässt sich ohne Wissen erraten.
- `k:wahlen/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (73 gegen höchstens 41 Zeichen) und lässt sich ohne Wissen erraten.
- `k:wahlen/q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (34 gegen höchstens 20 Zeichen) und lässt sich ohne Wissen erraten.
- `k:mitbestimmung/q3` · aktualitaet.ohne-stand: Kann veralten („2025“), aber kein „stand“-Feld.
- `k:bundeslaender/q1` · doppelt.frage: Fast dieselbe Frage auch unter x:lid/wales/q1 (src/data/leben-in-deutschland.json, Ähnlichkeit 100 %).
- `k:foederalismus/q1` · doppelt.frage: Fast dieselbe Frage auch unter x:lid/northern-ireland/q2 (src/data/leben-in-deutschland.json, Ähnlichkeit 93 %).

**Hinweis** (1)

- `k:pfand/q3` · niveau.satzlaenge: A1-Frage mit 15 Wörtern.

### src/data/leben-in-deutschland.json (1)

**Warnung** (1)

- `x:lid/northern-ireland/q3` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (23 gegen höchstens 8 Zeichen) und lässt sich ohne Wissen erraten.

### src/data/pruefungen/saetze/goethe-a2-1.json (1)

**Warnung** (1)

- `x:goethe/goethe-a2-1/l4-2` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (30 gegen 18 Zeichen).

### src/data/pruefungen/saetze/goethe-b1-1.json (2)

**Warnung** (2)

- `x:goethe/goethe-b1-1/l1-q4` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (30 gegen 13 Zeichen).
- `x:goethe/goethe-b1-1/l4-q22` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (41 gegen 22 Zeichen).

### src/data/pruefungen/saetze/goethe-b2-1.json (1)

**Warnung** (1)

- `x:goethe/goethe-b2-1/l4-q6` · raten.laengste-antwort: Die richtige Antwort ist viel länger als die anderen (66 gegen 40 Zeichen).

### src/paid/grammatik/es-korrelat.json (1)

**Warnung** (1)

- `g:es-korrelat/3` · raten.nur-zwei-antworten: Nur 1 mögliche Antworten (it) für 6 Zeilen: Raten trifft jede zweite.

### src/paid/grammatik/irreale-vergleiche.json (1)

**Warnung** (1)

- `g:irreale-vergleiche/1` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (probably true / not true) für 6 Zeilen: Raten trifft jede zweite.

### src/paid/grammatik/passiversatz.json (1)

**Warnung** (1)

- `g:passiversatz/4` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (when / than) für 6 Zeilen: Raten trifft jede zweite.

### src/paid/grammatik/subjektive-modalverben.json (1)

**Warnung** (1)

- `g:subjektive-modalverben/3` · raten.nur-zwei-antworten: Nur 2 mögliche Antworten (neednt have / didnt need to) für 7 Zeilen: Raten trifft jede zweite.

### src/paid/grammatik/textkohaerenz.json (2)

**Hinweis** (2)

- `g:textkohaerenz/1/4` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Will it rain?"; deutsch: „…“.
- `g:textkohaerenz/1/8` · deutsch.anfuehrungszeichen: Gerade Anführungszeichen "Is the museum open?"; deutsch: „…“.
