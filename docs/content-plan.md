# Content plan: German course → English course

Written 2026-10-28 by the `content-plan` run. **Every later item in `automation/QUEUE.md`
follows this file.** If a later run has to deviate (a mapping turns out not to work), it
changes this file in the same commit and says why in its report.

Inventory basis: `src/data/**`, `src/content/**`, `src/paid/**`, `src/pages/**` on the
`content` branch at commit `95fb672`.

---

## 1. Global decisions

### 1.1 Learner and variety

| Decision | Value |
|---|---|
| Target learner | Adults (16+) learning English as a foreign/second language, any first language |
| Variety | **British English** is the default: spelling (*colour, organise, centre, travelled*), vocabulary (*flat, lift, mobile, queue*), IPA (modern Standard Southern British, e.g. /bɑːθ/, non-rhotic). |
| American English | Taught as a **note**, never mixed silently: “US: *apartment*”, “US: /bæθ/”. Exercises accept the US spelling where the point of the exercise is not spelling (the run must check whether the answer field accepts alternatives; if it does not, avoid items where BrE/AmE differ). |
| Culture focus | **UK first** (it matches the exam and citizenship choices below), with short boxes for the US, Ireland, Canada, Australia where the difference is useful. |
| Levels | CEFR **A1–C1** for courses and grammar; lexicon units keep A1–C2; C1/C2 vocabulary was added by `vocab-c1-c2` (2026-11-02, §5.2). |
| Explanation language | Explanations are in **simple English at or below the topic's level** (A1/A2 topics: A1–A2 words, short sentences, examples carry the rule). Fields whose name says *einfach/leicht/Einfach* (e.g. `historyEinfach`, `explainLeicht`) get **very** simple English (A1–A2). |
| Names in examples | Varied, international first names (*Amira, Tom, Priya, Kwame, Zofia, Liam, Mei*). Places: real UK towns are fine; no real companies, brands or living private persons. |
| Tone | Friendly, adult, no childish content, no politics, no stereotypes about nationalities. |

### 1.2 Typography in data files

- Prose may use typographic quotes “ ” ‘ ’ and the apostrophe ’.
- **Answer fields, accepted solutions, `options`, `answer`, cloze gaps: straight apostrophe `'`
  only** (*don't, it's*). Learners type `'`; the answer checker may not normalise. A run that
  verifies the checker normalises both may relax this for its module and note it here.
- Contractions: teach both forms; in answer fields accept both where the schema allows
  alternatives, otherwise use the full form only when the gap is not about contractions.

### 1.3 IDs, slugs, filenames

- **Content runs do not rename ids, slugs or filenames.** They replace the content inside
  the existing ids (a German topic file becomes the English topic in the same slot, §3).
  Ids are referenced across files (lehrplan, verwandt, arbeitsblatt, registry, localStorage
  keys); renaming them is the `routes` item's job, done once, with redirects.
- The English target slug for every slot is given in this plan (§3 grammar, §6 routes).
  Where none is given, the `routes` run derives it: kebab-case of the English title, keep any
  level prefix (`a1-ansage-bahnhof` → `a1-station-announcement`).
- **Exception:** `src/content/wortgeschichte/` (word stories). The filename *is* the lemma, so
  English stories are new files named by the English lemma (`house.json`); see §5.11.
- **New** ids/files are allowed where the plan says so; they use English names from the start.
- Mapping a slot to a different topic is fine (slot semantics don't matter to the code); the
  `level` field may change with it, and `grammar-structure` then fixes the syllabus order.

### 1.4 German-specific fields (keep the key, change the meaning)

| Field / data | German meaning | English meaning |
|---|---|---|
| lexicon noun `gender` (`der/die/das`) | grammatical gender | **`"a"` / `"an"` / `"some"`**: indefinite article for countable nouns, `"some"` for uncountable and plural-only nouns (*some water, some advice, some trousers*). This turns every “article” trainer into an **a / an / uncountable** trainer, which is a real learner problem. |
| lexicon `plural` | German plural | English plural; uncountable nouns follow whatever the German data used for nouns without a plural (check the A1 file for the convention, don't invent a new one). |
| lexicon `en` | English gloss of the German word | **Short learner definition in simple English** (*table → “a piece of furniture with a flat top and legs”*). |
| lexicon `ipa`, `ipaSource` | German IPA from Wiktionary | British IPA (SSB); `ipaSource` stays `"wiktionary"` only if taken from there, otherwise `"authored"`. |
| lexicon `audio` | `der-name` style filename | `<lemma>` (`name`, `ice-cream`); files don't exist yet (TTS later). |
| lexicon word id (`id` or slug of `lemma`) | German lemma slug | English lemma slug (**set by `vocab-a1`, 2026-10-30**). A noun/verb pair with one spelling keeps the plain slug on the more basic word and suffixes the other (`work` verb, `work-noun`; `love` verb, `love-noun`; `rain` noun, `rain-verb`), like the German data did (`husten-noun`). An English slug that is still taken by a German word of a later level gets `-en` (`computer-en`, `station-en`, `tablet-en`, `patient-en`, `jeans-en`; A2: `snack-en`, `vegan-en`, `virus-en`, `interview-en`, `budget-en`, `sender-en`, `ring-en`, `fit-en`, `fair-en`). An English word that repeats an A1 lemma in another part of speech gets a suffix too (A2: `break-noun`, `order-noun`, `text-verb`, `park-verb`, `train-verb`, `dry-verb`, `fine-noun`, `play-noun`, `fit-adj`, `patient-adj`, `post-online`, `university-degree`; B1: `live-adj`, `make-up-verb`, `volunteer-verb`, and `-en` on `global-en`, `promotion-en`, `allergen-en` for German B2+ slugs; B2 (`vocab-b2`, 2026-10-30) needed no suffix, because no German lexicon level is left and no B2 lemma repeats an A1–B1 lemma; C1/C2 (`vocab-c1-c2`, 2026-11-02) needed none either, and accented loanwords carry an explicit `id`/`audio` without the accent: `deja-vu`, `blase`, `doppelganger`): ids are unique across all levels, and the sidecars are keyed by id. Modules still in German must not resolve their ids into English levels: `ENGLISH_LEVELS` in `src/lib/lexicon.js`. |
| lexicon `forms` | 3rd sg, Präteritum, Partizip II | 3rd sg, past simple, past participle (`works, worked, worked`); modals (*can, must, should*) have none. Phrasal verbs (*get up*) carry `separable: true` and split forms (`gets up, got up, got up`). |
| lexicon `comparative`/`superlative`, `irregular` | *älter, am ältesten* | *older, oldest* / *more tired, most tired*; `irregular` only for *good, bad, far*. |
| lexicon `aux`, `case`, `reflexive` | haben/sein, Kasus, sich | not used for English words (keys omitted). `prep` holds a dependent preposition (*wait for, listen to*). |
| lexicon `i18n/de.json` | German explanation of a German word | **German translation** of the English word (nouns with article). |
| lexicon `rank`, `source` | German OpenSubtitles frequency | English OpenSubtitles 2018 frequency list (hermitdave/FrequencyWords, MIT, `en_50k`). Level banding stays frequency-derived; the UI must not claim it is the official Cambridge *English Vocabulary Profile* (copyrighted, may be consulted for level sanity checks, never copied). **`vocab-a1` (2026-10-30):** the list could not be downloaded in that run, so A1 has `rank: null` (no guessed ranks); `node scripts/attach-ranks.mjs a1` now ranks English levels against `en_50k` and fills it in one go. Until then the A1 words are out of the frequency rounds (`lernsets.js` cohorts). **`vocab-a2` (2026-10-30):** same for A2 (`rank: null`, `node scripts/attach-ranks.mjs a2`); the build has 59 frequency rounds left (2,339 pages instead of 2,387), because only B1/B2 words are ranked now. **`vocab-b1` (2026-10-30):** same for B1 (`rank: null`, `node scripts/attach-ranks.mjs b1`); only the German B2 words keep ranks until then. **`vocab-b2` (2026-10-30):** same for B2 (`rank: null`, `node scripts/attach-ranks.mjs b2`). **`vocab-c1-c2` (2026-11-02):** same for C1/C2 (`node scripts/attach-ranks.mjs c1 c2`). No word in A1–B2 has a rank now, so there are no frequency rounds at all (`/wortschatz/haeufigkeit-*` pages are gone, 2,221 pages) and `/artikel` leaves out its „Nach Häufigkeit“ view until the ranks are attached. |
| `artikel-sprint/words.json` `article`, `plural`, `pluralWrong`, `english` | der/die/das, plural, wrong plurals, gloss | `a`/`an`/`some`; English plural; plausible wrong plurals (*childs, mouses, informations*); `english` = short simple definition. |
| Case fields (Nominativ/Akkusativ/Dativ/Genitiv) | four cases | subject / object / possessive adjective / possessive pronoun where a 4-slot shape exists (*I / me / my / mine*); otherwise leave the key with `""` and note it. |
| Separable verbs (`trennbare-verben`) | *an-rufen* | **phrasal verbs** (*call back*, *give up*); the prefix field holds the particle. |
| Verb tables (`verbtabellen.json`, `nachschlagen/starke-schwache-verben.json`) | ich/du/er… forms, strong/weak | English principal parts: base, 3rd-person *-s*, past simple, past participle, *-ing*; strong/weak → irregular/regular. The run maps person slots to these forms and documents the mapping in its report. **Done by `grammar-structure` (2026-10-29):** `verbtabellen.json` keeps its six person rows (I, you, he/she/it, we, you, they) with present simple / past simple / present perfect, because English conjugates in exactly that shape; `nachschlagen/starke-schwache-verben.json` rows are *he/she/it · past simple · past participle*, sections schwach = regular, stark = irregular with past ≠ participle, gemischt = irregular with past = participle. |
| `translations` maps / `*-i18n` / `lexicon/i18n/<lang>.json` / `uebersetzungen/*` | German → learner language | English → learner language. `translations.en` (where present) becomes a plain-English paraphrase; `translations.de` becomes the German translation. Other languages: fill only where the run can translate reliably. Before leaving a language out, the run checks the UI falls back cleanly; if it does, missing language keys are allowed. Never leave a stale German-based translation next to English content. |
| `status`: `entwurf`/`geprueft` | draft / reviewed | Keep the same status values (code filters on them). New English content enters as reviewed only if the run checked it against sources; otherwise draft. **Grammar topics (changed by `grammar-a1`, 2026-10-29):** a topic file keeps the `status` it had (no status / `geprueft` / `entwurf`), because `entwurf` takes a topic out of the catalogue, menus, guided run, search and PDFs — flipping all of them would empty the course. The run report lists the topics for Edgar's review instead. |

---

## 2. Exams: German exam → English exam

| German slot (data / page) | English equivalent | Level | Notes |
|---|---|---|---|
| **Start Deutsch 1** (`pruefungen/start-deutsch-1/`, `/start-deutsch-1`) | **A1 English practice test** (unbranded) | A1 | No widely used adult A1 brand; an honest, unbranded A1 mock modelled on Cambridge A2 Key task types at A1 difficulty. The pass line (60 %) is our own convention and must say so. |
| **Goethe-Zertifikat** A2/B1/B2 (`/goethe`, `goethe/[slug]`, `saetze/goethe-*`, `goethe-formate.json`) | **Cambridge English**: A2 Key, B1 Preliminary, B2 First | A2–B2 | Main exam family of the site. C1 Advanced may be added later. |
| **telc Deutsch** A2/B1/B2 (`/telc`, `telc/[slug]`, `saetze/telc-*`, `telc-formate.json`) | **Trinity ISE**: ISE Foundation (A2), ISE I (B1), ISE II (B2) | A2–B2 | Integrated skills (Reading & Writing, Speaking & Listening). **Edgar: review**, alternative is to drop the telc slot. |
| **telc Sprachbausteine** (`pruefungen/sprachbausteine/`, `/telc/sprachbausteine`) | **Cambridge B2 First, Reading & Use of English** (parts 1–4: multiple-choice cloze, open cloze, word formation, key word transformation) | B2 | Same idea (cloze-based language use). Moves under the Cambridge area in `routes`. |
| **DTZ** (`pruefungen/dtz/`, `paid/pruefungen/dtz`, `/dtz`, `dtzTrainer.js`) | **Trinity ISE I full mock** | B1 | DTZ is the integration exam; ISE I is used for UK visa purposes (exams run: verify current SELT status before writing that on a page). |
| **TestDaF** (`pruefungen/testdaf/`, `/testdaf`) | **IELTS Academic** (Reading + Writing Task 2) | band 5–7 | Same logic as now: no pass mark (each institution sets its own band). TDN 3/4/5 → band scores. |
| **Leben in Deutschland** (`leben-in-deutschland.json`, `/leben-in-deutschland`) | **Life in the UK test** practice | B1 (reading) | Real test: 24 questions, pass 18 (75 %), 45 min. *Federal* questions → UK-wide; *Bundesland* questions → the four nations (England, Scotland, Wales, Northern Ireland). Own questions written from public facts; the official handbook is Crown copyright, never copy its text. Every fact needs a source in the data file's sourcing note. |
| `pruefungen/fallen.json` | exam traps for Cambridge / IELTS / Trinity | | |
| `pruefungen/formate-a2-c1.research.json` | format research for the above | | Must be checked against the official sites (cambridgeenglish.org, ielts.org, trinitycollege.com) and dated. |
| `saetze-index.json`, `paid-manifest.json` | regenerated by their scripts | | Don't hand-edit. |
| `examRegistry` (`src/lib/exam/registry.js`) | ids stay (they are localStorage keys); `title`, `subtitle`, `passNote`, `passPct`, module labels change | | Done by `exams`; ids renamed only by `routes`, with a storage migration if it renames them at all (recommendation: keep the storage keys). |

**Dropped:** none of the exam slots except as noted under Führerschein (§4).

**Done by `exams` (2026-10-30):** formats in `formate-a2-c1.research.json` (A2–B2 entries), `goethe-formate.json`, `telc-formate.json`, `testdaf-formate.json`; one practice set per exam: A2 Key, B1 Preliminary, B2 First, ISE Foundation, ISE I, ISE II (`saetze/*-1.json`), the A1 test, IELTS Academic (Reading + Writing Task 1), Use of English gap fills, Life in the UK bank (four nations as extra practice; the real test has none). Decisions: the `/dtz` slot is a **B1 skills mock** in the old trainer shape (the trainer can't hold the ISE task structure; `/telc/b1` is the ISE I-format set) with our own point bands; Cambridge names come from `src/lib/exam/names.js`. **Still German / open:** the paid sets (`src/paid/pruefungen/saetze/*-c1-1.json`, `dtz/uebungssatz-2..4.json`) and the C1 research entries; Life in the UK PDFs and the Bavaria downloads on `/leben-in-deutschland/fakten`; see `automation/reports/exams.md`.

---

## 3. Grammar: slot map (90 topic files + `akkusativ`)

Each German topic file in `src/data/grammatik/` (and `src/paid/grammatik/`, the same 11 C1
ids) becomes the English topic below, same id, same schema. `src/data/arbeitsblatt/<id>.json`
follows the same id (done by `teachers`). Level = the new `level` value. “New slug” is used
by `routes` only.

### A1

| Slot (German id) | Was | English topic | Level | New slug |
|---|---|---|---|---|
| `nomen` | Nomen | Nouns: people, things, places | A1 | `nouns` |
| `artikel` | der/die/das | Articles: *a, an, the* | A1 | `articles` |
| `personalpronomen` | Personalpronomen | Subject pronouns and the verb *be* (*I am, she is*) | A1 | `pronouns-and-be` |
| `akkusativ` (in `grammatik.json` + `akkusativ.json`) | Akkusativ | Object pronouns (*me, him, her, us, them*) | A1 | `object-pronouns` |
| `praesens` | Präsens | Present simple | A1 | `present-simple` |
| `verb-position-2` | Verb an Position 2 | Word order: subject–verb–object, place before time | A1 | `word-order` |
| `w-fragen` | W-Fragen | *Wh-* questions (*what, where, when, who, why, how*) | A1 | `wh-questions` |
| `ja-nein-fragen` | Ja/Nein-Fragen | Yes/no questions and short answers (*Do you…? – Yes, I do.*) | A1 | `yes-no-questions` |
| `plural` | Plural | Plural nouns (regular and irregular) | A1 | `plurals` |
| `possessivartikel` | Possessivartikel | Possessive adjectives and *'s* (*my, your… / Anna's*) | A1 | `possessives` |
| `imperativ` | Imperativ | Imperatives (*Sit down. Don't run.*) | A1 | `imperatives` |
| `temporale-praepositionen` | Zeit-Präpositionen | Prepositions of time: *in, on, at* | A1 | `prepositions-of-time` |
| `aduso` | aber/denn/und/sondern/oder | Linking words: *and, but, or, so* | A1 | `and-but-or-so` |
| `adjektive-nach-sein` | Adjektive nach sein | Adjectives: before nouns and after *be* | A1 | `adjectives` |
| `berufe-mit-in` | Lehrer/Lehrerin | *There is / there are* | A1 | `there-is-there-are` |
| `gern` | gern | *like / love / hate* + *-ing* | A1 | `like-doing` |
| `praeteritum-sein-haben` | war/hatte | Past of *be*: *was / were* | A1 | `was-were` |
| `wortarten` | Wortarten | Parts of speech | A1 | `parts-of-speech` |
| `zahlen` | Zahlen | Numbers, prices, time | A1 | `numbers` |

### A2

| Slot | Was | English topic | Level | New slug |
|---|---|---|---|---|
| `konjugation` | Konjugation | Present continuous (and present simple vs continuous) | A2 | `present-continuous` |
| `perfekt` | Perfekt | Past simple: regular and irregular verbs | A2 | `past-simple` |
| `welcher-dieser` | welcher/dieser | *this, that, these, those* | A1 | `this-that` |
| `modalverben` | Modalverben | Modal verbs: *can, must, have to, should* | A2 | `modal-verbs` |
| `komparativ-superlativ` | Komparativ/Superlativ | Comparatives and superlatives | A2 | `comparatives-superlatives` |
| `lokale-praepositionen` | lokale Präpositionen | Prepositions of place: *in, on, at, under, next to…* | A2 | `prepositions-of-place` |
| `wechselpraepositionen` | Wechselpräpositionen | Prepositions of movement: *into, out of, across, through…* | A2 | `prepositions-of-movement` |
| `dativ` | Dativ | Verbs with two objects (*give me the book / give it to me*) | A2 | `two-objects` |
| `indefinitpronomen` | Indefinitpronomen | *some / any / no* and *somebody, anything, nowhere…* | A2 | `some-any` |
| `satzstellung` | Satzstellung | Countable and uncountable: *much, many, a lot of, a few, a little* | A2 | `much-many` |
| `negation` | Negation | Negatives: *don't, doesn't, didn't, isn't, not* | A2 | `negatives` |
| `nebensaetze-weil-dass` | weil/dass | *because, so* and *that*-clauses | A2 | `because-so-that` |
| `konjunktiv2-hoeflich` | höflicher Konjunktiv II | Polite requests: *would like, could you, would you mind* | A2 | `polite-requests` |
| `positionsadverbien` | Positionsadverbien | Adverbs of frequency and their position | A2 | `adverbs-of-frequency` |
| `adjektivdeklination-a2` | Adjektivendungen A2 | Adverbs of manner (*quick → quickly*) | A2 | `adverbs-of-manner` |
| `artikel-oder-nicht` | Artikel oder nicht | *the* or no article (*I like music / the music in this film*) | A2 | `the-or-no-article` |
| `reflexive-verben` | reflexive Verben | Reflexive pronouns and *each other* | A2 | `reflexive-pronouns` |
| `trennbare-verben` | trennbare Verben | Phrasal verbs: the basics | A2 | `phrasal-verbs` |
| `komposita` | Komposita | Compound nouns (*bus stop, toothbrush*) | A2 | `compound-nouns` |
| `ordinalzahlen` | Ordinalzahlen | Ordinal numbers and dates | A2 | `ordinal-numbers-dates` |

### B1

| Slot | Was | English topic | Level | New slug |
|---|---|---|---|---|
| `futur` | Futur I | Future forms: *will, going to*, present continuous | B1 | `future-forms` |
| `zusammengesetzte-verben` | zusammengesetzte Verben | Present perfect vs past simple | B1 | `present-perfect` |
| `zustandspassiv` | Zustandspassiv | Present perfect continuous | B1 | `present-perfect-continuous` |
| `praeteritum-plusquamperfekt` | Präteritum/Plusquamperfekt | Narrative tenses: past continuous and past perfect | B1 | `narrative-tenses` |
| `n-deklination` | n-Deklination | *used to* and *would* for past habits | B1 | `used-to` |
| `konditionalsaetze` | Konditionalsätze | Zero, first and second conditional | B1 | `conditionals` |
| `passiv-b1` | Passiv B1 | The passive: present and past simple | B1 | `passive-basics` |
| `relativpronomen` | Relativpronomen | Defining relative clauses: *who, which, that* | B1 | `relative-clauses` |
| `funktionen-von-werden` | Funktionen von werden | Reported speech: statements and questions | B1 | `reported-speech` |
| `indirekte-fragen` | indirekte Fragen | Indirect questions (*Could you tell me where…?*) | B1 | `indirect-questions` |
| `infinitiv-mit-zu` | Infinitiv mit zu | Verb patterns: *-ing* or *to*-infinitive | B1 | `verb-ing-or-to` |
| `verben-als-nomen` | Verben als Nomen | Gerunds as subjects and after prepositions | B1 | `gerunds` |
| `infinitiv-ohne-zu` | Infinitiv ohne zu | *make, let, help* + infinitive | B1 | `make-let-help` |
| `lassen` | lassen | *have / get something done* | B1 | `have-something-done` |
| `finalsaetze` | Finalsätze | Purpose: *to, in order to, so that* | B1 | `purpose` |
| `temporale-nebensaetze` | temporale Nebensätze | Time clauses: *when, while, before, after, as soon as, until* | B1 | `time-clauses` |
| `als-oder-wenn` | als oder wenn | *when* or *if* | B1 | `when-or-if` |
| `temporale-praepositionen-b1` | Zeit-Präpositionen B1 | *for, since, during, ago, until, by* | B1 | `for-since-ago` |
| `konnektoren-grund-gegengrund` | Grund/Gegengrund | Contrast: *although, even though, despite, however* | B1 | `contrast-linkers` |
| `genitiv` | Genitiv | *'s* or *of* (*my sister's car / the end of the film*) | B1 | `s-or-of` |
| `adjektivdeklination` | Adjektivdeklination | Order of adjectives (*a lovely old wooden table*) | B1 | `adjective-order` |
| `partizip-als-adjektiv` | Partizip als Adjektiv | *-ed* and *-ing* adjectives (*bored / boring*) | B1 | `ed-ing-adjectives` |
| `verben-praepositionen` | Verben mit Präpositionen | Verbs + prepositions (*depend on, listen to*) | B1 | `verbs-prepositions` |
| `da-wo-woerter` | da-/wo-Wörter | Prepositions at the end (*What are you waiting for?*) | B1 | `prepositions-at-the-end` |
| `nutzen-benutzen` | nutzen/benutzen | *make* or *do* | B1 | `make-or-do` |
| `positionsverben` | stehen/stellen… | Confusing verbs: *say/tell, lie/lay, rise/raise, borrow/lend* | B1 | `confusing-verbs` |
| `wortbildung-nomen` | Wortbildung Nomen | Word formation: noun suffixes (*-tion, -ment, -ness, -er*) | B1 | `noun-suffixes` |
| `adjektive-als-nomen` | Adjektive als Nomen | *the* + adjective (*the rich*) and *one / ones* | B1 | `the-adjective-one` |

### B2

| Slot | Was | English topic | Level | New slug |
|---|---|---|---|---|
| `konjunktiv2` | Konjunktiv II | Third and mixed conditionals, *wish / if only* | B2 | `third-conditional-wish` |
| `passiv` | Passiv B2 | The passive: all tenses, with modals, *it is said that* (intro) | B2 | `passive` |
| `relativsaetze-was-wo` | Relativsätze was/wo | Non-defining relative clauses; *whose, where, when*; *which* for a whole clause | B2 | `non-defining-relatives` |
| `modalsaetze` | Modalsätze | Modals of deduction: *must, might, can't* (+ *have been*) | B2 | `modals-of-deduction` |
| `konsekutivsaetze` | Konsekutivsätze | *so…that, such…that, too, enough* | B2 | `so-such-too-enough` |
| `zweiteilige-konnektoren` | zweiteilige Konnektoren | *both…and, either…or, neither…nor, not only…but also* | B2 | `paired-conjunctions` |
| `zumal-wohingegen` | zumal/wohingegen | Formal linkers: *whereas, while, given that, as* | B2 | `formal-linkers` |
| `negationswoerter` | Negationswörter | *no, none, nobody, nothing, never*; avoiding double negatives | B2 | `negative-words` |
| `irgend` | irgend- | *-ever* words: *whatever, whoever, wherever, however* | B2 | `ever-words` |
| `fokuspartikeln` | Fokuspartikeln | Focus adverbs: *only, even, just, also* and their position | B2 | `focus-adverbs` |
| `modalpartikeln` | Modalpartikeln | Discourse markers in speech: *actually, anyway, well, by the way* | B2 | `discourse-markers` |
| `adjektive-mit-praepositionen` | Adjektive + Präpositionen | Adjectives + prepositions (*good at, interested in*) | B2 | `adjectives-prepositions` |
| `nomen-verb-verbindungen` | Nomen-Verb-Verbindungen | Collocations: *make a decision, take a risk, pay attention* | B2 | `collocations` |

### C1 (paid slots: same ids in `src/data/grammatik/` and `src/paid/grammatik/`)

| Slot | Was | English topic | Level | New slug |
|---|---|---|---|---|
| `konjunktiv-1` | Konjunktiv I | Distancing: *is said to, is believed to have, it is thought that* | C1 | `distancing` |
| `es-korrelat` | es-Korrelat | Cleft sentences and preparatory *it* (*It was Tom who…, What I need is…*) | C1 | `cleft-sentences` |
| `passiversatz` | Passiversatz | Inversion (*Never have I…, Not only did she…*) | C1 | `inversion` |
| `futur-2` | Futur II | Future continuous and future perfect | C1 | `future-perfect` |
| `irreale-vergleiche` | irreale Vergleiche | Unreal past: *as if, it's time, would rather, I'd sooner* | C1 | `unreal-past` |
| `subjektive-modalverben` | subjektive Modalverben | Modal perfects: *should have, needn't have, might have* | C1 | `modal-perfects` |
| `nominale-praepositionen` | nominale Präpositionen | Formal prepositions: *due to, owing to, in view of, regardless of* | C1 | `formal-prepositions` |
| `nominalisierung` | Nominalisierung | Nominalisation in formal writing | C1 | `nominalisation` |
| `partizipialattribute` | Partizipialattribute | Participle clauses (*Having finished…, The man sitting there…*) | C1 | `participle-clauses` |
| `textkohaerenz` | Textkohärenz | Cohesion: reference, substitution, ellipsis | C1 | `cohesion` |
| `verbpraefixe` | Verbpräfixe | Verb prefixes: *over-, under-, out-, re-, mis-* | C1 | `verb-prefixes` |

No grammar slot is dropped. Possible later additions (new files, English ids from the start):
question tags, *have got*, *can* for ability at A1, quantifiers at B2.

### Grammar side files

| File | English |
|---|---|
| `grammatik.json` (quick quizzes per topic) | follow the slot map; `akkusativ` → object pronouns |
| `grammatik-lehrplan.json` | English syllabus order per level (`grammar-structure`) |
| `grammatik-verwandt.json` | related topics, recomputed for the new topics |
| `grammatik-start/<lang>.json` | “English grammar for speakers of <lang>” intro; `en.json` = plain-English intro; `de.json` = for German speakers (a real audience). **Moved to its own queue item `grammar-start-book`** (2026-10-29, by `grammar-structure`): it is a whole 10-chapter PDF book whose base content (examples, tables, exercises) sits in `de.json` and whose generator (`scripts/generate-grammatik-start-pdf.mjs`) treats German as the subject; making it English needs the base moved to an English file, the generator changed, the book written and 17 translation files redone. **Done by `grammar-start-book` (2026-10-29):** `en.json` is the base book (“English Grammar Start A1–B1”, 10 chapters on the English A1–B1 topics; key `titleDe` holds the English title); the generator and `check-grammatik-start.mjs` read it. `de.json` = German explanations (draft), built as an edition only once `de` is in `src/lib/languages.js`. The 16 other help-language files explained the German chapters and were removed; a new language starts with `node scripts/check-grammatik-start.mjs --skeleton <code>`. |
| `nachschlagen/starke-schwache-verben.json` | irregular verbs reference |
| `nachschlagen/trennbare-verben.json` | phrasal verbs reference |
| `nachschlagen/verben-mit-praepositionen.json` | verbs + prepositions reference |
| `verbtabellen.json` | English verb forms (see §1.4) |
| `wortarten.json` | parts of speech (English) |
| `kursinhalte.json`, `content/program.json` | English course plan per level (`grammar-structure`; `program.json` unit titles with `vocab-*`) |
| `praepositionen-trainer.json` | prepositions of time/place trainer (in/on/at) |
| `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json` | a / an / uncountable (see §1.4); rule packs become *an* before vowel sounds (*an hour, a university*), uncountable groups (liquids, materials, abstract nouns: *advice, information, furniture*). Done by `games` unless `vocab-a1` needs them first. |
| `kasus-haeufigkeit.json` + `/grammatik/deklination` + `KasusChart` | **drop** (German case statistics and noun declension; no English equivalent) |

---

## 4. Modules dropped (removed by `cleanup`)

| Module | Files | Why |
|---|---|---|
| Führerschein (German driving licence theory) | `data/fuehrerschein/**`, `pages/fuehrerschein/**`, `uebersetzungen/fuehrerschein.json`, `fragen-index` import in `lib/exam/registry.js` | Large, legally sensitive, country-specific; a UK theory-test trainer would be a separate product. |
| Driving games built on it | `/spiele/stadtfahrt` (uses the Führerschein bank), `/spiele/vorfahrt` (German right-of-way rules) | Same reason. Both are listed in `EXPERIMENTE.md` → archive them there first. |
| Politics | `data/politik/**`, `/politik`, `uebersetzungen/politik.json` | German parties and parliaments; a neutral UK version is a big separate job. |
| Tax havens | `steueroasen.js`, `steueroasen-map.json`, `/steueroasen` | Off-topic for an English course. |
| German beer map | `bier.json`, `bier-karte.json` (and their use on `/wissen/dialekte`) | German-specific. |
| German case/declension | `kasus-haeufigkeit.json`, `/grammatik/deklination`, `KasusChart.astro` | No English equivalent. |
| German-only lexicon helpers | `lexicon/i18n/de-fill.json`, `de-syn.json` **if** `vocab-a1` finds they only serve German morphology | **Decided by `vocab-a1` (2026-10-30):** both only serve German words (gap answers of German hints, German synonyms). Their A1 entries are gone; the files stay while A2–B2 are German and are removed by the vocab item that migrates the last German level (or `cleanup`). |

`cleanup` must follow CLAUDE.md: archive entries in `EXPERIMENTE.md` for any experiment page,
and record the removing commit in its report. Redirect dropped URLs to the nearest hub
(`/fuehrerschein` → `/exams`, `/politik` and `/steueroasen` → `/culture`).

**Not content, don't touch:** `steuer.json` (VAT note for invoices, Kleinunternehmer — a
business/legal setting for Edgar), `produkte.json`, `premium-features.json` (only their UI
strings, via `ui-components`), image manifests (`*-bilder*.json`, `*.manifest.json`, `hub-emoji.json`).

---

## 5. Module map (everything else)

Each row: German module → English equivalent → queue item that does it.

### 5.1 Placement and learner shell

| German | English | Item |
|---|---|---|
| `einstufung.json` (6 items per level, 2 drawn; each tests one level-typical feature) | Same design. A1: *be*, present simple, *a/an*; A2: past simple, comparatives, *going to*, prepositions; B1: present perfect vs past, conditionals 1/2, passive, relatives, *used to*; B2: third conditional, reported speech, deduction, *wish*; C1: inversion, cleft, participle clauses, mixed conditional, distancing. | `placement-test` |
| `einfach-pfad.json` (“Einfach lernen”, A1–B1) | “Learn step by step” beginner path A1–B1 built on the English grammar slots and A1–B1 vocab units | `beginner-path` |

### 5.2 Vocabulary

| German | English | Item |
|---|---|---|
| `content/lexicon/a1…b2.json` (units of 25 words, topics) | Same units and topics (*Person & introductions, Family, Feelings, House & rooms…*); English lemmas chosen by English frequency + topic; schema per §1.4 | `vocab-a1` … `vocab-b2` |
| `content/lexicon/c1.json`, `c2.json` | Were empty in the scaffold. Now new English units (**done 2026-11-02**): C1 24 units (`c1-01`…`c1-24`), C2 16 units (`c2-01`…`c2-16`), 25 words each, same schema and conventions as A1–B2. Topic slugs from the §4 taxonomy put them into the same Bereiche groups as B1/B2; `program.json` C1/C2 stay `planned` with English module titles and no placed units. | `vocab-c1-c2` |
| `wortschatz.json` (phrase cards `front/note/translations`) | English phrases (*I'm of the opinion that…*), `note` = usage tip in simple English | `vocab-a1` (done 2026-10-30) |
| `haeufigste-woerter.json` | most frequent English words | `vocab-a1`: generator switched to English (`scripts/haeufigste-woerter.mjs`), **data not regenerated yet** (needs the `en_50k` download, see §1.4 rank). Only the grammar PDF script reads it. |
| `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json` | keep pictures; re-key to the English lexicon ids | `vocab-a1` (A1), later levels by their vocab item. Done for A1–B2 (2026-10-30; A2: 83, B1: 35, B2: 7 `wort-bilder.json` entries, only emoji with a local OpenMoji SVG): `bildkarten.json` has English ids plus a `drawings` map to the drawing names in `src/lib/bildwoerter.js`, which stay German; `wort-bilder.json` holds English ids only (A1–B2, in level order). |
| `lexicon/i18n/<lang>.json` | glosses English → <lang> (§1.4) | each `vocab-*` for its level |

### 5.3 Listening (`hoeren.json`, ids kept, UK settings)

| Id | English script |
|---|---|
| `a1-ansage-bahnhof` | Announcement at a railway station |
| `a1-anruf-arzt` | Voicemail from the GP surgery: your appointment |
| `a1-supermarkt` | In the supermarket: Where can I find…? |
| `a1-verabredung` | Phone call: When shall we meet? |
| `a2-amt-termin` | At the council office: changing an appointment |
| `a2-wohnungsbesichtigung` | Viewing a flat |
| `a2-radio-wetter-verkehr` | Radio: weather and traffic |
| `a2-paketdienst` | Voicemails: a parcel and the plumber |
| `b1-krankmeldung` | Calling in sick at work |
| `b1-elterngespraech` | Parents' evening at school |
| `b1-radio-muelltrennung` | Radio feature: recycling and bin day |
| `b1-durchsage-ersatzverkehr` | Announcement: disruption and rail replacement buses |
| `b2-diskussion-homeoffice` | Team meeting: working from home |
| `b2-interview-anerkennung` | Interview: getting foreign qualifications recognised in the UK |
| `b2-beschwerde-versicherung` | Complaint to an insurance company |
| `b2-vortrag-ehrenamt` | Short talk: volunteering in the UK |

`voices` describe British voices; audio is generated later (TTS). Item: `listening`.
**Done by `listening` (2026-10-30):** all 16 scripts English, same ids, levels, types and
speaker keys; titles are the English ones above (slightly shortened, e.g. *At the council:
changing an appointment*). Places and firms are made up (*Westbridge, Kingsford, Ashby Green,
Swiftline, Hartley Plumbing*), so no real local rule is misquoted. `voices` carry `en-GB` Azure
names and British ElevenLabs ids (to check before the first render; `frau2` has none yet).
`uebersetzungen/hoeren.json` is empty (`entries: {}`): it translated the German scripts, and
English is the only help language registered.

### 5.4 Reading and writing

| German | English | Item |
|---|---|---|
| `lesen.json` (B1 short text + DTZ reading tasks 1–4, form task, writing prompt, error hunt) | B1 reading set in the Trinity ISE I / generic B1 style: notices matching, newspaper article true/false, forum posts *who says this?*, interview; form = UK form (e.g. library card); writing prompt = email; error hunt = typical learner errors | `reading-writing` |
| `fertigkeiten/lesen.json`, `schreiben.json` | English reading/writing skill hubs | `reading-writing` |
| `/schreiben/[id]` pages' data | English writing tasks A1–B2 (forms, messages, emails, opinion essays) | `reading-writing` |

**Done by `reading-writing` (2026-10-30):** `lesen.json`, `fertigkeiten/lesen.json` and
`fertigkeiten/schreiben.json` are English, with the same ids, levels, types, `kind`s and `from`
links. The B1 simulation has one topic, *learning as an adult*, at the made-up *Westbridge Adult
Learning*. Its group titles say "B1 reading, task N" (no exam brand in the data; the `/dtz` page
frames it as ISE I practice). The writing prompt is David's visit, not the (past) 2026 World Cup.
Form answers use UK formats (`04/03/1996`, `3.30 pm`, `£45`) with plain hyphens; phone numbers
are Ofcom drama numbers (`0121 496 0xxx`, `07700 900xxx`), emails use `example.com`/`example.co.uk`.
`uebersetzungen/lesen.json` and `schreiben.json` are empty (`entries: {}`), as for listening.
`src/lib/schreibKorrektur.js` checks English (LanguageTool `en-GB`, English own rules).

### 5.5 Speaking

| German | English | Item |
|---|---|---|
| `sprechen.json` (3 DTZ picture tasks) | 3 picture-description tasks (same pictures where they fit: gardening group, people on a bus, young man helping an older woman) | `speaking` |
| `sprechen-b1b2.json` stages (picture description, short talk…) | Cambridge B1/B2 long turn + IELTS Speaking Part 2 style talk (1 min prep, 2 min talk), timings per the real formats | `speaking` |
| `redemittel.json` sets (agree, disagree, doubt, comfort, opinion, ask, request, apologise, thank, suggest, congratulate, greet, describe pictures, *Where is the ball?*) | same 14 functional sets in English; the last one → prepositions of place | `speaking` |
| `redemittel-i18n/<lang>.json` | translations of the English phrases (§1.4) | `speaking` |
| `fertigkeiten/sprechen.json` | English speaking hub | `speaking` |
| `hochstapler/redemittel.json` | game phrases in English | `games` |

**Done by `speaking` (2026-10-30):** `sprechen.json` (3 picture tasks, A2: description +
follow-up questions), `sprechen-b1b2.json` and `fertigkeiten/sprechen.json` (21 tasks A1–B2)
are English, with the same ids, slugs, types, sets, `from`/`index`/`stage` links and images.
B1/B2 stages: **1 · The photo** 60 s (Cambridge B1/B2 Part 2 long turn), **2 · The talk** 120 s
after one minute of notes (IELTS Part 2 topic card: `topic` ends in “You should say:”, the three
`points` follow), **3 · Discussion** 240 s. Every model answer describes the photo on disk.
`exam` lines are English and keyed by their text in `src/pages/sprechen/[id].astro`.
`redemittel.json`: same 14 set ids and phrase order (the beginner path addresses
`redemittel:<set>#<index>`); **the key `de` holds the English phrase**, `en` a plain-English
paraphrase or usage note, `ar/uk/ru/tr` stay as drafts (each English phrase keeps the meaning
of the German one they translated). `redemittel-i18n/*` are re-keyed to the English phrases
for the same reason. `uebersetzungen/sprechen.json` is empty (`entries: {}`), like listening.

### 5.6 Pronunciation

| German | English | Item |
|---|---|---|
| `ausspracheregeln.json` | English sounds and spelling: *th* /θ ð/, /w/ vs /v/, short/long vowels (/ɪ/–/iː/), schwa, silent letters, *-ed* endings, word stress, weak forms | `pronunciation` |
| `aussprache-muttersprache.json` | typical English pronunciation problems per first language | `pronunciation` |
| `aussprache-check.json` | minimal pairs (*ship/sheep, think/sink, van/wan*) | `pronunciation` |
| `satzmelodie.json` | intonation: questions, lists, sentence stress, polite vs flat | `pronunciation` |
| `zungenbrecher.json` | English tongue twisters (traditional, public domain) | `pronunciation` |

**Done by `pronunciation` (2026-10-30):** all five files are English (British English), with
the same keys and ids. `ausspracheregeln.json`: 14 rules in the old rule slots (word stress,
ship/sheep, /ə/ and weak forms, magic e, th, -ed, s-clusters, -s, voiced endings, non-rhotic r,
h, w/v, silent letters, linking), `match` regexes for English words. `aussprache-check.json`:
26 sentences A1–B1 in the old ids (question slots stay questions). `zungenbrecher.json`:
22 traditional twisters, levels `Easy`/`Medium`/`Hard` (was 25; no dialect take).
`satzmelodie.json`: 10 families, 10 stress items, 7 rules; family `topic` is now an English
word and its en.json key follows it (`satzmelodie.topic.plans` …). Sound/focus ids are English
now (`th`, `w-v`, `i-ee`, `ae`, `ed`, `s-cluster`, `h`, `r`, `ng`, `end`; `src/lib/ausspracheTipps.js`).
Every `audio` flag is `false` until English recordings exist; the pages read the text with an
en-GB browser voice (`LANG = "en-GB"` in the check libs). **Drills by first language
(`aussprache-muttersprache.json`):** 18 drills; ids that still name an English problem kept
their slot (`p-b`, `sp-st`, `h`, `auslaut`, `ende`, `kurz-lang` = ship/sheep, `w-b` = v/b, …),
`th`, `w-v`, `ae` are new, the German-only `ue-oe`, `ch`, `hart`, `g-h`, `z-w` are gone. Because
drills and mistakes link both ways (`pnpm check:aussprache`), this run also rewrote the
**`area: "aussprache"` entries of `fehler-nach-sprache.json`** in English (new ids where the
sound changed, e.g. `franzoesisch-th`, `polnisch-w-v`); every other area of that file is still
German and stays with `idioms-mistakes`. The language slot `englisch` (English speakers) has no
pronunciation mistakes or drills any more: `idioms-mistakes` should turn it into German
speakers (`deutsch`); the drills `w-v`, `th` and `auslaut` fit them.

### 5.7 Idioms, mistakes, slang

| German | English | Item |
|---|---|---|
| `redewendungen.json` | English idioms (B1–C1), meaning, example, origin only if well sourced | `idioms-mistakes` |
| `umgangssprache.json` | informal/spoken British English (*cheers, quid, knackered*) with register notes; no offensive slang | `idioms-mistakes` |
| `typische-fehler.json` | typical learner mistakes in English (*I am agree, informations, since 3 years*) | `idioms-mistakes` |
| `fehler-nach-sprache.json` | typical mistakes per first language | `idioms-mistakes` |
| `wortfallen.json` | false friends per first language (German: *become/bekommen, actual/aktuell*; Spanish: *embarrassed/embarazada*…) | `idioms-mistakes` |
| `synonyme.json` | English synonyms with register/collocation differences | `idioms-mistakes` |

**Done by `idioms-mistakes` (2026-10-30):** all six files are English (British English), same
keys and shapes. `redewendungen.json`: 60 entries (48 idioms in the 8 theme slots, 12 proverbs),
B1–C1, all `entwurf`; field names stay German (`de` = the English idiom, `en` = a plain-English
paraphrase, shown as “In plain words”); every entry cites its Wiktionary page, and an origin is
told only where Wiktionary's etymology supports it, otherwise the text says it is unknown.
`umgangssprache.json`: informal British English, slang and mild-to-strong swearing (no slurs),
the UK law note (Public Order Act 1986). `typische-fehler.json`: 32 pairs in the same 5 group
ids; `tr`/`regelTr` are `{}` (English is the only help language); `wortarten.json` `fehler`
links point to them. `wortfallen.json`: 17 look-alikes and false friends with **new English
group ids** (`kitchen`, `become`, `actual` …; only anchors and en.json keys use them, and
`wortfallen.<id>.*` in en.json was re-keyed in the same commit), `audio: false`.
`synonyme.json`: 128 English groups A1–B2 (word stories and the live quiz's same-language mode).
`fehler-nach-sprache.json`: every area in English; **language slot `englisch` is now
`deutsch` (German speakers)** with the drills `w-v`, `th`, `auslaut` (linked both ways in
`aussprache-muttersprache.json`, lettermark `De`). A learner whose stored first language is
`englisch` (localStorage `da-muttersprache`) simply has no matching tab any more.

### 5.8 Culture and knowledge (UK first)

`kultur.json` topics, ids kept:

| Id | Level | English topic |
|---|---|---|
| `duzen-siezen` | A1 | First names, *Mr/Ms/Dr*, and how formal to be |
| `pfand` | A1 | Queuing |
| `sonntagsruhe` | A1 | Shop opening hours and Sunday trading |
| `trinkgeld` | A1 | Tipping: UK vs US |
| `bundeslaender` | A2 | The four nations of the UK |
| `feiertage` | A2 | Bank holidays (different in each nation) |
| `muelltrennung` | A2 | Recycling and bin day |
| `termine` | A2 | Booking appointments |
| `anmeldung` | B1 | First steps: registering with a GP, National Insurance number |
| `krankenversicherung` | B1 | The NHS |
| `mieten` | B1 | Renting a flat: deposit, council tax, bills |
| `schulsystem` | B1 | The school system (England; Scotland differs) |
| `arbeit-finden` | B1 | Finding a job: CV, cover letter, references |
| `ausbildung` | B2 | Apprenticeships and university applications |
| `kuendigung` | B2 | Notice periods, leaving a job, references |
| `oeffentlich-rechtlicher-rundfunk` | B2 | The BBC and the TV licence |
| `vereine` | B2 | Clubs, volunteering and charity shops |
| `foederalismus` | C1 | Devolution: Westminster, Holyrood, the Senedd, Stormont |
| `sozialversicherung` | C1 | National Insurance and the welfare state |
| `wahlen` | C1 | General elections and first past the post |
| `erinnerungskultur` | C2 | Remembrance: Remembrance Sunday, poppies, memorials (factual, neutral) |
| `grundgesetz` | C2 | The uncodified constitution and the Supreme Court |
| `mitbestimmung` | C2 | Trade unions and workers' rights |

Facts that change (fees, figures, rules) need a source and an “as of” date in the sourcing note.

| Other German | English | Item |
|---|---|---|
| `kultur-insider.json`, `kultur-bilder.json` | UK insider tips; reuse pictures only where they fit | `culture` |
| `wusstest-du.json`, `kalender-saetze.json` | “Did you know?” facts about English; daily sentences in English | `culture` |
| `zitate.json` | English quotations (public domain or properly attributed short quotes; verified attribution only) | `culture` |
| `dialekte.json`, `dialekte-karte.json`, `dachMap.js` | Accents of English in the British Isles (Scouse, Geordie, Glaswegian, Welsh, Irish…). The map outlines are D-A-CH; if UK/Ireland outlines cannot be produced offline from data already in the repo, keep the list and hide the map, and note it. | `culture` |
| `sprachen-welt.json`, `sprachen-karte.json` | Where English is spoken (official/de facto language countries) on the existing world map | `culture` |
| `/spiele/knigge` (prototype) | Manners simulator in the UK | `games` |

**Status (`culture`, 2026-10-30):** `kultur.json` holds the 23 UK topics of the table above (ids kept, all `sourcing: "sachwissen"`, eyebrows *Language & manners / Everyday life & housing / State & society / Services & health / Education & work*); `uebersetzungen/kultur.json` entries emptied (they explained the German topics; the page hides the help block). `kultur-insider.json` is down to **13 UK topics** (24 German dating/gender-survey and politics topics dropped; etiquette topics have `sources: []` and say they describe common practice). `zitate.json`: **131** English public-domain quotes (rotation is modulo the list, 366 not needed); `uebersetzungen/zitate.json` quotes emptied. `wusstest-du.json`, `kalender-saetze.json`: English. **Split off** to the new queue item `accents-languages`: `dialekte.json`/`dialekte-karte.json`/`dachMap.js` (/wissen/dialekte) and `sprachen-welt.json`/`sprachen-karte.json` (/wissen/sprachen): both need new map geometry from geo packages that are not installed (see the generator scripts' headers) and about 260 prose keys in en.json (`dialekte.*`, `sprachen.*`).

**Status (`accents-languages`, 2026-11-02):** both pages are English; the map was redrawn from Natural Earth data (geo packages fetched into a scratch folder, not site dependencies). `/wissen/sprachen`: 38 countries plus 3 territories. The status keys keep their names with new meanings: `amtssprache` = main language, `region` = official language, `minderheit` = widely spoken but not official, `gemeinschaft` = small territories. The Europe view is centred on the British Isles, `benrath: []`. The comparison panel `englisch` is now `deutsch`, and the decoder runs German → English. `/wissen/dialekte`: 17 accent areas in 6 groups (North, Midlands, South, Scotland, Wales, Ireland), 6 city accents and 5 Celtic languages as dots (`lang: true`). `lines.benrath` is the FOOT–STRUT line and `lines.speyer` the TRAP–BATH line. Word mode covers "bread roll" and "hello", and Shetland sits in an inset. The German beer map (`bier.json`, `dialekte.bier.*`) is hidden, not deleted (left for `cleanup`); `dachMap.js` now only serves it.

### 5.9 Games

| German | English | Item |
|---|---|---|
| `artikel-sprint` (der/die/das sprint) | **Countable sprint**: *a / an / some* | `games` |
| `nussnacht` (article survivor, prototype) | same mechanic with *a / an / some* | `games` |
| `hoer-safari` (hear noun with article, hit picture) | hear *a/an* + noun, hit the picture | `games` |
| `satzregen/saetze.json` (+ `quelle.txt`) | English sentences to build; source must be English and licence-compatible (record in `quelle.txt`) | `games` |
| `quakiSpringt/fragen.json`, `turm.json` | English quiz questions per level | `games` |
| `hochstapler/themen.json`, `redemittel.json` | English impostor-word topics and phrases | `games` |
| `buergeramt/kunden.json` (Bürgeramt sim) | **Front desk sim** at a UK council office (customers want parking permits, council tax, a library card…) | `games` |
| Lindenau RPG (`uebersetzungen/lindenau.json`, its lib) | same RPG, set in a fictional English market town **Brambleford** | `games` |
| `/spiel` (single game page) | follow whatever it embeds | `games` |

**Status (`games`, 2026-10-30):** English: `artikel-sprint` (60 hand nouns + 30 verbs; gates A/AN/SOME, THE/ANY as race-room traps; uncountables only in the article gates; lexicon a/an/some nouns join per level), `quakiSpringt/fragen.json` (own pools A1 30 · A2 24 · B1 20 · B2 16 · C1 16) and `turm.json` texts, `hochstapler` (13 + 13 themes on English lexicon ids, theme ids kept; sentence starters A1–C1; game strings), `satzregen` (109 own sentences; modes keep their ids: `v2` = statements and wh-questions A1, `janein` = yes/no questions A1, `klammer` = auxiliaries and modals A2, `nebensatz` = indirect questions B1; **English has no verb-second rule, so `check.js` gives no automatic Vorfeld variants** and every other correct order is an `{alt}` in `quelle.txt`), and the `/artikel` trainer with `artikel.json`, `artikel-packs.json` (rule packs *an + vowel sound*, *a + consonant sound*, *some*; exceptions *a university, an hour*), `artikel-haeufigkeit.json` (emptied; German counts; `scripts/artikel-haeufigkeit.mjs` now reads `en_50k`). Game UI string tables that were German (`quakiSpringt/main.js` TXT, `satzregen/game.js` STR, `hochstapler/strings.js` S) were translated in place. **Split off** (their German rules, word lists and texts live in the game code, not in data files): `games-arcade` = `nussnacht` (bosses with der/die/das rules, compound splitting, upgrades text) and `hoer-safari` (needs spoken a/an + noun; English audio does not exist yet); `games-dialogue` = `buergeramt` → front desk (`kunden.json` + German office rules in `lib/buergeramt/regeln.js`, `faelle.js`), `knigge` → manners (`lib/knigge/scenes.js`, ~70 KB of German dialogue), Lindenau → Brambleford (`lib/lindenau/*`, `uebersetzungen/lindenau.json`, ~170 KB). `/spiel` is the live-quiz join page; its content is the teacher quiz (`teachers`).

**Status (`games-arcade`, 2026-10-30):** `nussnacht` (Nut night) in English: shots a / an / some from the lexicon's `gender` (word rows keep `{ id, w, g, a, pl, h }`; `g` 0 a, 1 an, 2 some), 25 bosses (first sound vs letter: *an hour, a hotel, a university, an uncle, a year*; uncountables: *advice, information, luggage, news, research* …), a first-sound radar instead of the ending radar, plural creatures take *some*, and the compound upgrade (`kompositum`, id kept) is the *two-word cracker* on the lexicon's open compounds (*bus stop, email address*; `h` = start of the second word, no German splitting). `hoer-safari` (Listening safari): only a / an nouns with a picture (239); **no English audio exists**, so the browser's British voice (speechSynthesis en-GB, as in Bruno Kart) says *a fork*, and without speech the word is shown at once; reload quiz *a / an*; hidden finds *a windmill, a signpost, a hot-air balloon*. Recorded *a/an + noun* clips would replace the synthetic voice (`say()` in `lib/hoerSafari/game.js`).

**Status (`games-dialogue`, 2026-10-30):** `buergeramt` = **Bruno's Front Desk**: desk 3 at Brambleford Town Hall checks **resident parking permit** applications (paper kinds kept: `ausweis` = photocard driving licence, `pass` = passport, `meldeschein`/`abmeldung` = permit application with the boxes *New permit / Change of address / Cancel permit*, `wgb` = tenancy agreement as proof of address); rules `art: "echt"` = usual UK council practice with GOV.UK sources (each council sets its own permit rules), `"lindenau"` (value kept) = made-up Brambleford rule; dates DD/MM/YYYY; stamps APPROVED (key A) / REJECTED (key R); default ink black (the made-up pen rule is *black pen only*). Only the 3 hand cases of day 1 are playable (the prototype has no generator yet). `knigge` = **Manners Simulator**: 19 UK scenes, 46 reply turns + wheel turns (scene and people ids kept; the pub scene got a *rounds* turn); `de` = the English line, `en` = a plainer paraphrase; the wheel's `sie`/`du` = polite/casual phrasing; `more` links point at the UK culture topics. Lindenau = **The Legend of Brambleford** (route `/spiele/lindenau` and ids kept): A1 errands bakery, station (off-peak return), GP surgery; supermarket, new neighbour, café; quests may carry `words` for the action levels' monster words; the ar/uk/tr sidecar `uebersetzungen/lindenau.json` was emptied (keyed by German lines). The shared dialogue-game voice (`lib/spielKit.js`) speaks en-GB; neither game has recorded English clips.

### 5.10 Teachers

| German | English | Item |
|---|---|---|
| `arbeitsblatt/<id>.json` | worksheets per grammar slot map (§3) | `teachers` |
| `partneruebungen/*` | same scenarios, anglicised: hairdresser appointment, language café → conversation club, farm shop, new room, past simple memory, picnic, weekend bingo, street party, flatshare dice | `teachers` |
| `unterricht-wortschatz.json`, `lernstunde-texte.json`, `einstieg-bilder.json` | English lesson-mode word fields and phase texts | `teachers` |
| `downloads.json` | English download catalogue (titles, levels) | `teachers` |
| printable games (bingo, domino, explain), tests, surveys, timetable | English data via the above | `teachers` |

**Status (`teachers`, 2026-10-30):** `arbeitsblatt/<id>.json` (60 files, keys kept) hold **tandem sheet extras for the English topic now in each slot**: `infinitiv` = the blue tile the answerer must change (base verb `be`, subject pronoun `he` → *him*, `I` → *my*, singular → plural, adjective → adverb or comparative, depending on the topic); choice tiles such as `"a / an"`, `"in / on / at"`, `"who / which"`, `"make / do"`, `"-self / each other"`; the sheet capitalises the first tile; English needs no German matching (switched off in `partneruebungen/render.js`). The 11 partner and group sheets are English A1 scenarios and **still drafts** (shown only by address until reviewed). `unterricht-wortschatz.json` = a task and words for the 50 A1 word fields of `kursinhalte.json`; `lernstunde-texte.json` and the timetable texts in `lib/stundenplan.js` are English (phase detection in `lib/unterricht/einstieg.js` matches *Quick round*, *Three questions*, *Photo prompt*; social forms in `stundenplan.js` read *in pairs*, *small group*, *whole group*); `einstieg-bilder.json` only holds Lernset photo ids (language-neutral, unchanged). `downloads.json`: English catalogue with Cambridge/IELTS/Trinity/GOV.UK links. Vocabulary worksheets and the learners' print sheet: part B is *a, an or some?* from lexicon `gender`; the meaning languages are `en` = simple English definition (default) and `de` = German translation. Printable games: domino *a / an / some*, plurals (*a lamp \| lamps*), word ↔ meaning. Class test pool: grammar-word detection is English. The class tools' UI strings without keys were translated in place (live practice, quiz record, survey base text, class labels); live-quiz nicknames are English (*Brave Fox*).

### 5.11 Word stories (`content/wortgeschichte/`, 366 reviewed German stories)

- English etymology stories, **new files named by English lemma** (`house.json`, `bread.json`),
  same schema. Pick concepts where English history is interesting and well documented
  (Old English, Old Norse, Norman French, Latin, borrowings: *window* < Norse *vindauga*,
  *beef/cow*, *bread/loaf*, *Wednesday*…).
- Sources: Etymonline, OED/Wiktionary entries; `sources` lists them; `checkedBy`/`checkedAt` set.
- When an English story replaces the German story for the same concept (`haus.json` →
  `house.json`), delete the German file in the same commit. German stories without an English
  counterpart stay until `cleanup`, which removes the rest (they are German etymology, not
  useful to learners of English).
- First batch (`word-stories` item): about 30 everyday A1–A2 words.

**Status (`word-stories`, 2026-11-02):** 30 English stories, all `status: "entwurf"` (the
validator refuses `geprueft` while `checkedBy` names Claude, so none is public until Edgar
approves): house, bread, window, egg, sky, Wednesday, Thursday, Saturday, cow, coffee, tea,
sugar, money, school, holiday, friend, husband, nice, breakfast, bus, taxi, hotel, sandwich,
tomato, potato, chocolate, knife, boss, dog, shampoo. 24 replace a German story (deleted in the
same commit, its `publishOn` reused); sky, husband, nice, breakfast, sandwich, shampoo are new
(publishOn 2027-10-02 … 07). Field values stay German where the code reads them (`certainty`:
sicher/wahrscheinlich/umstritten/unklar, `kind`: verwandt/entlehnt/zufall/parallele; en.json
prints them in English). Stage/tree `lang` labels are written out in English (Old English, Old
Norse …). `relatives.family` is always given by hand (an empty list = none), because the
computed family matches substrings (bus → business). Sources: Wiktionary checked by a second
model pass; Etymonline is listed but returned 403, so `checkedBy` says so. The page code now
picks the language per entry (`entryLang` in `wortgeschichteCore.js`): English stories get
`lang="en"`, ‘…’ quotes, *a house · houses* forms; the 342 German stories left keep German
rendering until `cleanup` removes them. `LANG_NAMES` are English.

### 5.12 English for work (`data/berufe/`, `/berufe`)

Same 10 sectors, ids kept: `pflege` care work · `gastronomie` restaurants & kitchens ·
`hotel` hotels · `einzelhandel` retail · `lager-logistik` warehouse & logistics ·
`kraftfahrer` drivers (van/HGV) · `bau-handwerk` construction & trades · `elektro-technik`
electrical work · `buero` office · `kita` childcare (nursery). Workplace phrases and
vocabulary in British English.

**Done by `english-for-work` (2026-11-02):** all 10 decks are English, same group ids
(learners' progress keys), ~85–95 entries per deck, `pflege` one short group of 30 (its
pflegeplace.com box is gone: `external: null`). Conventions: an own word's `gender` =
`a`/`an`/`some`, `plural` English (`null` for uncountables), `forms` = 3rd person · past ·
participle, no `aux`; `translations` holds only `en` (= short simple-English definition, the
only registered `berufe` language); `deHint` = **German translation** (the "German" tab,
like lexicon `i18n/de.json`). A lemma that exists in the English A1–B2 lexicon is a `{ ref,
example }` with a job-specific example (about half of all entries), a lemma from another deck is a
`bv-…` ref. `fs-…` refs (Führerschein) are gone. Validator: `src/lib/berufeCore.js`
(`pnpm check:berufe`). `liveDeck` now drops refs into levels that are **not** English.

---

## 6. Route renames (done by `routes`, with redirects from every old URL)

The site has no deploy target yet, so redirects are cheap insurance, not a must for SEO.
Put them in `astro.config.mjs` next to `ACCOUNT_REDIRECTS`.

| Old | New |
|---|---|
| `/grammatik` | `/grammar` (topics: §3 new slugs) |
| `/grammatik/lauf` · `/verben` · `/wortarten` · `/typische-fehler` · `/quiz` | `/grammar/path` · `/grammar/verbs` · `/grammar/parts-of-speech` · `/grammar/common-mistakes` · `/grammar/quiz` |
| `/grammatik/deklination` | dropped → `/grammar` |
| `/akkusativ` · `/praepositionen` | `/object-pronouns` · `/prepositions` |
| `/wortschatz` (+ `/redemittel`, `/drucken`, `/glossen`) | `/vocabulary` (+ `/phrases`, `/print`, `/glosses`) |
| `/hoeren` · `/lesen` · `/schreiben` · `/lesen-schreiben` | `/listening` · `/reading` · `/writing` · `/reading-writing` |
| `/sprechen` (+ `/set`) · `/sprechen-b1b2` | `/speaking` · `/speaking-b1-b2` |
| `/aussprache` · `/aussprache-check` · `/satzmelodie` (+`/pruefen`) · `/zungenbrecher` | `/pronunciation` · `/pronunciation-check` · `/intonation` · `/tongue-twisters` |
| `/einstufungstest` · `/einfach` · `/start-neu` | `/placement-test` · `/step-by-step` · `/start` |
| `/fortschritt` · `/meine-fehler` · `/kursinhalte` (+`/[level]`) · `/nachschlagewerk` | `/progress` · `/my-mistakes` · `/syllabus` · `/reference` |
| `/fertigkeiten` · `/uebungen` · `/spiel` · `/stunde` · `/kartenset` · `/umfrage` | `/skills` · `/exercises` · `/game` · `/lesson` · `/card-set` · `/survey` |
| `/spiele/*` | `/games/*`: `artikel-sprint`→`countable-sprint`, `buergeramt`→`front-desk`, `hochstapler`→`impostor`, `hoer-safari`→`listening-safari`, `knigge`→`manners`, `lindenau`→`brambleford`, `nussnacht`→`nut-night`, `quaki-springt`→`quaki-jumps`, `satzregen`→`sentence-rain` |
| `/pruefungen` (+`/fallen`) · `/pruefungsplan` | `/exams` (+`/traps`) · `/exam-plan` |
| `/goethe` (+`/[slug]`) | `/cambridge` |
| `/telc` (+`/[slug]`) | `/trinity`; `/telc/sprachbausteine` → `/cambridge/use-of-english` |
| `/dtz` (+`/mock-test`, `/uebungssatz`) | `/trinity/ise-1` (+`/mock-test`, `/practice-set`) |
| `/testdaf` (+`/uebungssatz`) | `/ielts` (+`/practice-set`) |
| `/start-deutsch-1` | `/a1-test` |
| `/leben-in-deutschland` (+`/test`, `/fakten`) | `/life-in-the-uk` (+`/test`, `/facts`) |
| `/kultur` (+`/[id]`, `/insider`, `/quiz`, `/fehler`) | `/culture` (+ same, `/fehler` → `/mistakes`) |
| `/wissen` (+ `bildwoerterbuch`, `dialekte`, `land-und-kultur`, `lernen`, `redewendungen`, `sprachen`, `umgangssprache`, `wortfallen`, `wortgeschichte`, `zitate`) | `/knowledge` (+ `picture-dictionary`, `accents`, `country-and-culture`, `learning`, `idioms`, `languages`, `slang`, `false-friends`, `word-stories`, `quotes`) |
| `/entdecken` (+`/filme`) | `/explore` (+`/films`) |
| `/lehrkraefte` (+ `arbeitsblaetter`, `karten`, `klassen`, `quiz`, `quiz-kapitel`, `spiele`, `stundenplan`, `tests`, `umfragen`, `unterricht`) | `/teachers` (+ `worksheets`, `cards`, `classes`, `quiz`, `quiz-chapters`, `games`, `timetable`, `tests`, `surveys`, `lesson`) |
| `/berufe` | `/english-for-work` |
| `/maskottchen` · `/ueber-mich` · `/beitreten` | `/mascots` · `/about` · `/join` |
| `/datenschutz` · `/nutzungsbedingungen` · `/impressum` | `/privacy` · `/terms` · `/legal-notice` (Edgar: the operator is in Germany, so the *Impressum* duty stays; only the URL changes) |
| `/fuehrerschein/**`, `/politik`, `/steueroasen` | dropped → `/exams`, `/culture`, `/culture` |

`suche-seiten.json` (search) and `entry-pages.json` are updated by `routes`.
Internal links, `catalog.js` menus and `llms.txt` follow the new routes in the same item.

---

## 7. Queue item → files (quick lookup)

| Item | Files it owns |
|---|---|
| `placement-test` | `einstufung.json` |
| `grammar-a1` … `grammar-c1` | `data/grammatik/<slot>.json` per §3 level (by **new** level), `paid/grammatik/*` (C1), `grammatik.json` entries of those slots, `akkusativ.json` (A1) |
| `grammar-structure` | `grammatik-lehrplan.json`, `grammatik-verwandt.json`, `nachschlagen/*`, `verbtabellen.json`, `wortarten.json`, `kursinhalte.json`, `praepositionen-trainer.json`, `uebersetzungen/grammatik.json`, `uebersetzungen/grammatik-themen.json` |
| `grammar-start-book` | `grammatik-start/*`, `scripts/generate-grammatik-start-pdf.mjs`, `scripts/check-grammatik-start.mjs` |
| `beginner-path` | `einfach-pfad.json` |
| `vocab-a1` … `vocab-b2` | `content/lexicon/<level>.json`, `lexicon/i18n/*` for that level, `wortschatz.json`, `haeufigste-woerter.json`, `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json`, `content/program.json` titles |
| `listening` | `hoeren.json`, `uebersetzungen/hoeren.json` |
| `reading-writing` | `lesen.json`, `fertigkeiten/lesen.json`, `fertigkeiten/schreiben.json`, schreiben data, `uebersetzungen/lesen.json`, `schreiben.json` |
| `speaking` | `sprechen.json`, `sprechen-b1b2.json`, `redemittel.json`, `redemittel-i18n/*`, `fertigkeiten/sprechen.json`, `uebersetzungen/sprechen.json` |
| `pronunciation` | §5.6 files |
| `idioms-mistakes` | §5.7 files |
| `exams` | `pruefungen/**`, `paid/pruefungen/**`, `leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json`, `lib/exam/registry.js` texts |
| `culture` | §5.8 files, `uebersetzungen/kultur.json`, `zitate.json`, `uebersetzungen/zitate.json` |
| `games` | §5.9 files, `artikel*.json` |
| `teachers` | §5.10 files |
| `word-stories` | `content/wortgeschichte/*` |
| `routes` | pages folders/filenames, redirects, `suche-seiten.json`, `entry-pages.json`, links |
| `cleanup` | §4, plus re-enabling validators in `prebuild` |

Files with UI strings only (`premium-features.json`, `produkte.json`, `downloads.json`
titles) are handled by the `ui-*` items where they are rendered.

---

## 8. Quality rules for every content run

1. Correct, natural British English; every example sentence must be something a native
   speaker would actually say.
2. Level discipline: example vocabulary at or below the topic's CEFR level, except the
   target structure itself.
3. Each grammar topic: one clear rule statement, the forms, 4–8 examples, the 2–3 most common
   learner mistakes, then exercises with unambiguous single answers (or listed alternatives).
4. Exercise answers: exactly one correct answer unless the schema holds alternatives;
   distractors must be wrong for a reason a learner can understand.
5. Facts (culture, exams, Life in the UK) carry a source and an “as of” date; when unsure,
   leave the fact out rather than guess.
6. Fewer, correct items beat many: keep the number of exercises the schema/UI needs, not
   the German count, if the German count would force filler.
7. Keep German leftovers out of the content you touch: no mixed German/English items.

---

## 9. Gaps and open points (not in the queue yet)

- **C1/C2 lexicon** (`content/lexicon/c1.json`, `c2.json`): done by `vocab-c1-c2` (2026-11-02), see §5.2.
  Open: ranks (`attach-ranks.mjs c1 c2`), and placing C1/C2 units into the `program.json` modules.
- **English for work** (`data/berufe/`): done by `english-for-work` (2026-11-02), see §5.12.
- **`uebersetzungen/grammatik*.json`, `woerter-uk.json`, `rechtliches.json`**: learner-language
  translations of grammar UI/topics, Ukrainian word glosses, legal texts. Grammar ones go with
  `grammar-structure`; `rechtliches.json` with `ui-pages-m-z` (legal pages); `woerter-uk.json`
  with `vocab-a1`. **Status (2026-10-29):** `grammar-structure` emptied `uebersetzungen/grammatik.json`
  (topic rules in ar/uk/tr/…) and `grammatik-themen.json` (topic names), because every entry
  explained the German topic of the slot; pages fall back to English. Refilling them from the
  English topics is open (no queue item yet). `grammatik-ui.json` is keyed by German UI strings and
  left alone.
- **Audio**: every `audio` field points to files that don't exist until a TTS provider is
  wired (`BACKEND.speech`). Content runs set the fields; validators that require the files stay
  off until then.
- **Confirmed by Edgar (2026-10-28):** British English as the default (§1.1); the exam map as written, incl. Trinity ISE for the telc/DTZ slots (§2); dropping Führerschein, the driving games, politics, tax havens and the beer map (§4). *Brambleford* stays unless he changes it.
- **Added to the queue (2026-10-28):** `english-for-work` (§5.12) and `vocab-c1-c2` (C1/C2 lexicon), both before `routes`.
