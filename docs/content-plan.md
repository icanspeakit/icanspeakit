# Content plan: English course → icanspeak Spanish

Written 2026-11-03 by the `content-plan` run. It replaces the German → English plan of the
EnglishAcademy fork (that file is in the icanspeak-english history; this repo starts from the
squashed snapshot `9577286` = icanspeak English @ `39ac46f`, so its old commit hashes such as
`db88ba4` do **not** exist here).

**Every later item in the queue (`overclaude/projects/icanspeak-spanish/QUEUE.md`) follows this
file.** A run that has to deviate (a mapping turns out not to work) changes this file in the same
commit, says why in its report and, if the question stays open, adds it to §13.

Inventory basis: `src/data/**`, `src/content/**`, `src/paid/**`, `src/pages/**`, `src/lib/**` on
the `content` branch at `9577286`.

Words used below:

- **keep**: stays as it is (code, infrastructure, language-neutral data).
- **convert**: same file, ids and schema, new Spanish-course content.
- **add**: new file, page or module; English names from the start.
- **leave**: not touched by any content item, with the reason given (§9).
- **drop**: removed by `cleanup`, with a restore command recorded.

---

## 1. Global decisions

### 1.1 Learner, variety, levels

| Decision | Value |
|---|---|
| Brand | **icanspeak Spanish**. No "EnglishAcademy", "englishacademy", "deutschacademy" in anything a visitor sees (titles, meta, OG, JSON-LD, PDFs, llms.txt, `source` strings that are rendered). Internal code comments may keep the history. |
| Site and base | `site: 'https://icanspeak.it'`, `base: '/spanish'`. Never a hard-coded root path. Every URL goes through the base-aware helper added by `base-path-and-brand` (§10.1); until it exists, `import.meta.env.BASE_URL`. UI-language prefixes come after the base: `/spanish/de/…`. |
| Target learner | Adults (16+) learning Spanish, any first language, **with a strong group of immigrants and residents in Spain**. Real situations (padrón, centro de salud, landlord, work, school) beat tourist phrases. |
| Variety | **Castilian Spanish (Spain)** is the standard: *vosotros*, Spain vocabulary (*ordenador, coche, móvil, piso, zumo, conducir*), distinción in pronunciation (/θ/ for *c, z*), RAE spelling with ¿ ¡ and every accent. |
| Latin America | Never mixed in silently. Every vocabulary, grammar and audio item carries `variety: "es-ES"`; where Latin American usage differs, an `es419` note (§1.4) records it so a LatAm mode can be switched on later without rewriting content. Nothing is shown for `es419` yet (`variety-schema`). |
| Levels | CEFR **A1–C1** for courses, grammar, placement; lexicon units keep **A1–C2**; exams cover **DELE A1–C2** (C2: format page only, §2). |
| Explanation language | **English** (base dictionary `public/i18n/en.json`). Explanations are clear, short English; A1/A2 explanations use simple English and let the Spanish examples carry the rule. Fields named *einfach/leicht/Easy* (`introEasy`, `historyEinfach`, `explainLeicht`) get very simple English. |
| UI languages | English base; German, French, Portuguese, Italian added through `src/lib/languages.js`, one queue item each (`ui-lang-*`). Arabic later (RTL is already handled), not in this queue. |
| Names in examples | Varied, realistic for Spain today: *Lucía, Javier, Carmen, Pablo, Aitana, Jordi, Iker, Nerea, Amina, Youssef, Ana María, Ionuț, Oksana, Wei, Kevin, Valentina*. Places: real Spanish cities are fine (*Madrid, Valencia, Sevilla, Zaragoza, Bilbao*); offices, shops, firms, schools are **invented** (no real company, brand or living private person). The invented town of the games and sims is **Villabruno** (§5.9). |
| Tone | Friendly, adult, no childish content, no party politics, no stereotypes about nationalities or regions. |
| Law and administration | Extranjería, NIE/TIE, empadronamiento, arraigo, the 2026 extraordinary regularisation, nationality, DGT: **general orientation, never legal advice**. Every page that touches them says so in one line and points to the official source type (sede electrónica, ayuntamiento, consulate). Every uncertain fact is "to verify" in the run report, and the page words it carefully ("usually", "as of <month year>, check the official page"). |
| Exams | Original practice material only. **Never copy or closely paraphrase** an Instituto Cervantes exam paper, model exam (*modelo de examen*) or the official CCSE question bank/manual. Task types may be described and imitated; texts, items and answer options are ours. The site says it is not affiliated with Instituto Cervantes or the SIELE partners. |

### 1.2 Typography and answers

- Spanish text: ¿ … ? and ¡ … ! always; every written accent (*está, también, cómo, él, tú, sé*);
  *ü* where needed (*pingüino*); no accent on *solo, este, guion* (RAE 2010); *o* without accent
  between numbers. Quotes inside Spanish text: « » (with “ ” inside); English prose uses “ ”.
- Numbers and dates in Spain format: `1.250,50 €`, `14:30` or *las dos y media*, `03/11/2026`.
- **Answers keep their accents.** In Spanish an accent changes the word (*tu/tú, el/él, hablo/habló,
  esta/está*), so the checker never folds accents away. Prefer choice/pill formats; where a
  learner types, the page offers an á é í ó ú ü ñ ¿ ¡ key row, and an answer that differs only in
  accents is marked wrong with the hint "check the accent" (added to `src/lib/answerMatch.js` by
  `grammar-a1`, the first item that needs it; `conjugation-trainer` reuses it).
- `src/lib/answerMatch.js` `normalize()` and `src/lib/audioSlug.js` `slugify()` fold German
  umlauts today; `slugify` drops á/ñ entirely (*año* → `a-o`). `vocab-a1` changes `slugify` to
  á→a, é→e, í→i, ó→o, ú→u, ü→u, **ñ→ny** (*año* → `anyo`, never `ano`), keeping the German
  mapping for leftovers; ids and audio names use that slug.
- Straight apostrophe in English answer fields (unchanged rule); Spanish has none.

### 1.3 Ids, slugs, file names

- **Content runs do not rename ids, data file names or storage keys.** They replace the content
  inside the existing ids (a slot that now holds the English topic *present-simple* becomes the
  Spanish topic in the same slot). Ids are referenced across files (lehrplan, verwandt,
  arbeitsblatt, registry, localStorage keys).
- **URL slugs** are English (the UI language), except proper names: `/dele`, `/siele`, `/ccse`,
  `/dgt-vocabulary`. Spanish grammar terms that learners search for stay Spanish inside the slug
  (`/ser-estar-basics`, `/por-para`, `/gustar`). New slugs are given in §3 and §8; the `routes`
  item applies them once.
- **New** ids, files and pages are allowed where this plan says so; they use English names
  (`conjugation-trainer.json`, `business-spanish/`).
- Mapping a slot to a different topic is fine; the `level` field may change with it, and
  `grammar-structure` then fixes the syllabus order.
- Lexicon word ids: slug of the Spanish lemma (§1.2 slug rule, *el año* → `anyo`). A noun/verb
  pair with one spelling keeps the plain slug on the more basic word and suffixes the other
  (`-noun`, `-verb`, `-adj`). A Spanish slug that is still taken by an English word of a level
  not migrated yet (*hotel, taxi, bar, radio, chocolate, final, real*) gets `-es` (`hotel-es`).
  Ids are unique across all levels; sidecars are keyed by id.
- Word stories (`src/content/wortgeschichte/`): the file name *is* the lemma, so Spanish stories
  are new files named by the Spanish lemma slug (`casa.json`, `almohada.json`, `anyo.json`).

### 1.4 Data fields: what they hold for Spanish

The English course left several German fields hollow or gave them English meanings. For Spanish:

| Field / data | English course | **Spanish course** |
|---|---|---|
| lexicon noun `gender` | `a` / `an` / `some` | **The singular definite article as the learner says it: `"el"` or `"la"`**; `"el/la"` for common-gender person nouns (*el/la estudiante, el/la periodista*). `spokenForm()` already prints `gender + lemma` (*la casa*). Games and drills use only `el`/`la` nouns. |
| lexicon `genus` (**new**, optional) | – | `"f"` only where the article hides the gender: feminine nouns with stressed *a-/ha-* (*el agua, el aula, el hambre, el águila, el área, el alma*): `gender: "el"`, `genus: "f"`, plural *las aguas*. Absent = gender follows the article. |
| lexicon `pluralOnly` | plural-only nouns | Same key: *las gafas, los pantalones* (when taught as plural); `gender` then holds the article of the gender (`"la"` for *gafas*), `plural` the full form. |
| lexicon `plural` | English plural | Spanish plural **without article** (*casas, lápices, jóvenes, el lunes → lunes*). The article *los/las* comes from `gender` (+ `genus`). |
| lexicon `en` | simple-English definition | **Short English translation/gloss** (*la casa → "house, home"*), plus a short qualifier where needed (*el piso → "flat, apartment; floor (storey)"*). |
| lexicon `example` | English sentence | Natural Castilian sentence at the unit's level. |
| lexicon `ipa`, `ipaSource` | British IPA | Broad Castilian IPA with syllable dots and stress (*casa* `ˈka.sa`, *cerveza* `θeɾˈβe.θa`, *ajo* `ˈa.xo`); `ipaSource: "authored"` unless taken from Wiktionary (`"wiktionary"`). |
| lexicon `audio` | lemma slug | Lemma slug (§1.2); files don't exist until an es-ES TTS voice is wired (`BACKEND.speech`). |
| lexicon `forms` (verbs) | 3rd sg, past, participle | **yo present · él indefinido · participio**: `hablo, habló, hablado`; `tengo, tuvo, tenido`. |
| lexicon `reflexive` | unused | `true` for pronominal verbs; lemma with *-se* (*levantarse*). |
| lexicon `prep` | dependent preposition | Same: *pensar **en**, depender **de**, soñar **con***. |
| lexicon `irregular` | good/bad/far | Adjectives with irregular comparatives (*bueno → mejor, malo → peor, grande → mayor, pequeño → menor*); verbs: `true` for irregular verbs (any irregular tense). |
| lexicon `comparative` / `superlative` | older/oldest | Only where irregular (*mejor / el mejor*); regular ones are built with *más*. |
| lexicon `fem` (**new**, adjectives) | – | Feminine singular form (*alto → alta*, *español → española*); same as lemma for invariable ones (*grande, feliz, verde*). |
| lexicon `aux`, `case`, `separable` | unused | Not used for Spanish (keys omitted). |
| lexicon `i18n/<lang>.json` | English → learner language | **Spanish → learner language.** `de`, `fr`, `pt`, `it` first (the coming UI languages); other languages only where a run can translate reliably, otherwise the level's entries are removed (never a stale English-based gloss next to Spanish). `i18n/es.json` is meaningless for a Spanish course: `vocab-a1` removes `es` from `TRANSLATION_LANGS` and empties it; `cleanup` deletes the file. |
| lexicon `rank`, `source` | English OpenSubtitles | Spanish OpenSubtitles 2018 list (hermitdave/FrequencyWords `es_50k`; licence "to verify" before attaching). Until a run can download it, `rank: null` and the words stay out of the frequency rounds, as in the English course. Note: OpenSubtitles Spanish mixes Spain and Latin America; level banding stays our own, never claimed to be the PCIC or any official list. |
| `ENGLISH_LEVELS` (`src/lib/lexicon.js`) | levels already English | `vocab-a1` adds `SPANISH_LEVELS` (levels whose nouns carry `el`/`la`) with the same role and switches the callers (`berufeRows.js`, `wortgeschichteCore.js`); `ENGLISH_LEVELS` goes once no English level is left (`vocab-c1-c2` or `cleanup`). `validate-lexicon.mjs` `GENDERS` accepts `el`, `la`, `el/la` next to the English values until then. |
| `artikel-sprint/words.json` `article`, `plural`, `pluralWrong`, `english` | a/an/some … | `el`/`la`; Spanish plural; plausible wrong plurals (*lápizes, los mapa, joven → jovenes*); `english` = gloss. |
| 4-slot case fields (Nominativ/Akkusativ/Dativ/Genitiv) | I/me/my/mine | **subject · direct object · indirect object · after a preposition** (*yo / me / me / mí*; *él / lo / le / él*). |
| `trennbare-verben` slots | phrasal verbs | **pronominal/reflexive verbs** (*levantarse, acordarse de, irse*); the particle field holds *se*. |
| Verb tables (`verbtabellen.json`) | 6 rows, present/past/perfect | See §4.1: six person rows *yo, tú, él/ella/usted, nosotros/as, vosotros/as, ellos/ellas/ustedes*, keys `praes` (presente), `praet` (pretérito indefinido), `p2` (participio), plus new tense keys. |
| `translations` maps / `*-i18n` / `uebersetzungen/*` | English → learner language | Spanish → learner language; `translations.en` = English translation. Other languages only where reliable; check the UI falls back cleanly first. |
| `de` key in phrase/idiom/dialogue data (`redemittel.json`, `redewendungen.json`, knigge scenes) | the English phrase | **The Spanish phrase** (the key name is history: it means "target-language text"); `en` = English meaning or usage note. |
| `status`: `entwurf`/`geprueft` | draft / reviewed | Same values. A grammar topic keeps the `status` it has (flipping all to `entwurf` would empty the course); the run report lists topics for Edgar's review. New content enters as `entwurf` unless checked against sources. |

### 1.5 `variety` and the `es419` note

**Shape** (defined here, implemented and validated by `variety-schema`):

```json
"variety": "es-ES",
"es419": {
  "note": "In most of Latin America: la computadora.",
  "form": "computadora",
  "gender": "la"
}
```

- `variety`: `"es-ES"` for everything in this queue. `"es-419"` is reserved for a future item
  that is Latin American only (e.g. a rioplatense listening text); no run writes it now.
- `es419` is **optional** and present only where Latin American usage differs in a way a learner
  would notice. Keys:
  - `note` (required inside `es419`): plain English, ≤ 160 characters.
  - `form` (optional): the Latin American replacement for the item's main text (lemma, phrase,
    answer, sentence, verb form).
  - `gender` (optional, lexicon nouns only): `el`/`la` of the LatAm word when it differs.
  - `skip` (optional, `true`): the item makes no sense in a LatAm mode (a *vosotros*-only drill,
    *pretérito perfecto* for "today" contrasted with *indefinido*).
- No `es419` = same in Latin America as far as this course goes. Don't invent differences;
  typical real ones: *vosotros → ustedes*, *ordenador/computadora, coche/carro (auto), móvil/celular,
  zumo/jugo, piso/departamento (apartamento), conducir/manejar, coger/tomar, gafas/lentes
  (anteojos), patata/papa, melocotón/durazno, vale/okey-dale (regional)*, seseo, *perfecto vs
  indefinido for recent past*, *leísmo* (Spain accepts *le* for male persons; LatAm prefers *lo*).

**Where the fields go:**

| Data | `variety` on | `es419` on |
|---|---|---|
| `content/lexicon/*.json` | every word | the word |
| `berufe/*.json`, `dgt/*.json`, `business-spanish/*.json` own entries | every own entry (refs inherit from the lexicon word) | the entry |
| `wortschatz.json` phrase cards, `redemittel.json` phrases | every card / phrase | the card / phrase |
| `grammatik/<slot>.json`, `paid/grammatik/*` | the topic file (top-level key); exercises inherit | the topic (general note, e.g. *ustedes* instead of *vosotros*) **and** any exercise item whose answer differs (`form`) or is Spain-only (`skip`) |
| `grammatik.json` quick quizzes, `akkusativ.json`, `praepositionen-trainer.json` packs | inherit from the topic/pack; pack-level `variety` | item |
| `verbtabellen.json` | top-level key | verb (usage notes, e.g. *coger*); the *vosotros* row is handled by the helper (hidden in LatAm mode, *ustedes* row shows the 3rd plural) |
| `conjugation-trainer.json` | every set | set or item |
| Audio items: `hoeren.json` scripts, `aussprache-check.json`, `zungenbrecher.json`, `satzmelodie.json` items, `ausspracheregeln.json` rules | every item | item (e.g. seseo note on a *c/z* rule) |

Reading, writing, speaking tasks, culture, exams carry no `variety` key (they are Spain content by
definition). The helper `src/lib/variety.js` (added by `variety-schema`): `DEFAULT_VARIETY =
"es-ES"`, `varietyOf(item, parent)` (item → parent → default), `es419Of(item)`,
`LATAM_MODE = false`. Validators: `variety-schema` adds `scripts/check-variety.mjs` to the gate
(`scripts/check-content.mjs`): allowed values, `es419.note` present and ≤ 160 chars, `gender` only
`el`/`la`, no unknown `es419` keys. Missing `variety` is a warning while modules are still English
and becomes an error for a module once its item has run (the item adds its file to the strict
list in `check-variety.mjs`).

### 1.6 Validators

- A content item that changes a module's values updates that module's validator **in the same
  commit** (e.g. `validate-lexicon.mjs` GENDERS, `check-berufe.mjs`, `check-pruefungen.mjs`).
- Never drop a validator from the gate. If one must pause, move it to the "Not in the gate"
  list in `scripts/check-content.mjs` with the reason and the item that puts it back; `cleanup`
  puts every paused one back.

---

## 2. Exams: existing slot → Spanish exam

Exam slot ids stay (they are storage keys: `da-exam-v1:<key>`, `EXAMS` in `src/lib/routes.js`,
`src/lib/exam/registry.js`). Titles, subtitles, pass notes, module labels and names change
(`src/lib/exam/names.js`: `EXAM_NAMES = { goethe: "DELE", telc: "SIELE" }`, level names
`DELE A2` …).

| Slot (data / current page) | Now (English course) | **Spanish course** | Level | Item |
|---|---|---|---|---|
| `start-deutsch-1` (`pruefungen/start-deutsch-1/uebungssatz-1.json`, `/a1-test`) | unbranded A1 test | **DELE A1 practice test** (all four parts the set shape holds) | A1 | `exams-dele` |
| `goethe` A2/B1/B2 (`saetze/goethe-{a2,b1,b2}-1.json`, `goethe-formate.json`, `/cambridge`, `/cambridge/[slug]`) | Cambridge Key/Preliminary/First | **DELE A2, B1, B2** practice sets, one per level | A2–B2 | `exams-dele` |
| `goethe` C1 (`paid/pruefungen/saetze/goethe-c1-1.json`) | still German | **DELE C1** practice set | C1 | `exams-dele` |
| DELE C2 | – | **add**: format entry in `goethe-formate.json` and a hub card, **no practice set** (above the course range) | C2 | `exams-dele` |
| `sprachbausteine` (`pruefungen/sprachbausteine/satz-{1,2}.json`, `/cambridge/use-of-english`) | Use of English cloze | **"Uso de la lengua"**: cloze and gap tasks B2–C1 (grammar and vocabulary in context), framed as practice for the language-use tasks inside DELE reading papers (which tasks: "to verify") | B2–C1 | `exams-dele` |
| `testdaf` (`pruefungen/testdaf/uebungssatz-1.json`, `testdaf-formate.json`, `/ielts`) | IELTS Academic, no pass mark | **SIELE Global** practice set: score-based, no pass/fail, `passPct: null` (like TestDaF/IELTS); score scale and CEFR bands "to verify" | A1–C1 | `exams-siele` |
| `telc` A2/B1/B2 (`saetze/telc-{a2,b1,b2}-1.json`, `telc-formate.json`, `/trinity`, `/trinity/[slug]`) | Trinity ISE | **SIELE practice by band** (tasks at the A2, B1, B2 band, by module). `exams-siele` must write at least one; any band set it cannot write well is **removed** (with registry entry and `saetze-index` regenerated; restore command in its report and in §13), never left in English. | A2–B2 | `exams-siele` |
| `telc` C1 (`paid/pruefungen/saetze/telc-c1-1.json`) | still German | SIELE C1-band set, or removed under the same rule | C1 | `exams-siele` |
| `dtz` (`pruefungen/dtz/uebungssatz-1.json`, `src/lib/dtzTrainer.js`, `/trinity/ise-1` + `/mock-test`, `/practice-set`) | B1 skills mock | **DELE A2 mock for nationality**: the full timed mock in the trainer shape, framed for the nationality path (§5.11). Point bands are ours and say so; real pass rule "to verify". | A2 | `nationality-path` |
| `dtz` paid (`paid/pruefungen/dtz/uebungssatz-{2,3,4}.json`) | still German | more DELE A2 mocks; `nationality-path` converts what it can, the rest is removed by `cleanup` (restore command recorded) | A2 | `nationality-path` / `cleanup` |
| `leben-in-deutschland` (`leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json`, `/life-in-the-uk` + `/test`, `/facts`) | Life in the UK | **CCSE** (Conocimientos Constitucionales y Socioculturales de España) practice: own questions written from public facts (Constitution of 1978, institutions, territorial organisation, geography, history, culture, society). **Never** the official question bank or manual text. The Life-in-the-UK "four nations" extra becomes an optional **comunidades autónomas** extra, clearly labelled as not part of the real test. Format (number of questions, tasks, time, pass mark) "to verify". | A2–B1 reading | `ccse` |
| `pruefungen/fallen.json` (`/exams/traps`) | exam traps | traps for DELE, SIELE, CCSE (timing, *tú/usted* in writing tasks, accents in written parts, word counts) | | `exams-dele` |
| `pruefungen/formate-a2-c1.research.json` | format research | DELE and SIELE format research, every entry dated and marked "to verify" until checked against examenes.cervantes.es / siele.org | | `exams-dele` (DELE), `exams-siele` (SIELE) |
| `saetze-index.json`, `paid-manifest.json` | generated | regenerated by their scripts; never hand-edited | | whichever item changes sets |
| **add** `/exams/dele-or-siele` | – | comparison page: purpose (nationality → DELE A2; work, university, visa → depends on the institution), validity, format, results, price ranges "to verify" | | `exams-siele` |
| **add** `/nationality` | – | the CCSE + DELE A2 path to Spanish nationality by residence: who needs what, who is exempt, order of steps; general orientation, facts "to verify" | | `nationality-path` |

Exam facts the runs must treat as "to verify" (never as settled): DELE parts and timings per level,
the DELE pass rule (grouped scores), SIELE score scale and CEFR bands, SIELE validity period and
module combinations (S1–S5), CCSE number of questions, tasks, time and pass mark, exemptions for
nationality, prices, exam dates. The pages word these carefully and date them.

---

## 3. Grammar: slot map (91 slots)

Each slot file in `src/data/grammatik/` (and `src/paid/grammatik/`, the same 11 C1 ids) becomes the
Spanish topic below: same id, same schema. `src/data/arbeitsblatt/<id>.json` follows the same id
(`teachers`). "Level" is the new `level` value; the grammar items work **by new level**.
"New slug" is applied by `routes` only (`TOPIC_SLUGS` in `src/lib/routes.js`).

The order inside a level is fixed by `grammar-structure` (`grammatik-lehrplan.json`); the
tables are grouped, not ordered.

### A1 (19) — `grammar-a1`

| Slot | Now (English) | Spanish topic | New slug |
|---|---|---|---|
| `nomen` | Nouns | Nouns and gender: el/la, *-o/-a* and the exceptions (*el día, la mano, el problema, la foto*) | `noun-gender` |
| `artikel` | a, an, the | Articles: *el, la, los, las* / *un, una, unos, unas*; *al, del* | `articles` |
| `personalpronomen` | pronouns + be | Subject pronouns; *tú* or *usted*; *vosotros* (es419: *ustedes*); dropping the pronoun | `subject-pronouns` |
| `praesens` | Present simple | Present tense of regular *-ar, -er, -ir* verbs | `present-regular` |
| `konjugation` | Present continuous | Key irregular verbs in the present: *ser, estar, ir, tener, hacer, venir* and *yo*-irregulars (*tengo, hago, salgo, pongo, conozco*) | `present-irregular` |
| `praeteritum-sein-haben` | was/were | Stem-changing verbs: *e→ie, o→ue, e→i, u→ue* (*quiero, puedo, pido, juego*) | `stem-changing-verbs` |
| `verb-position-2` | Word order | *ser* and *estar*: the basics (who/what vs where/how) | `ser-estar-basics` |
| `berufe-mit-in` | there is/are | *hay* or *está/están* | `hay-estar` |
| `w-fragen` | Wh- questions | Question words with accents: *qué, quién, dónde, adónde, cuándo, cómo, cuánto, por qué* | `question-words` |
| `ja-nein-fragen` | Yes/no questions | Yes/no questions with ¿…?, negation with *no*, short answers | `yes-no-questions` |
| `plural` | Plurals | Plural of nouns and adjectives (*-s, -es, z→ces*, accent shifts: *joven/jóvenes, canción/canciones*) | `plurals` |
| `adjektive-nach-sein` | Adjectives | Adjectives: agreement and position (*una casa blanca, los coches nuevos*) | `adjective-agreement` |
| `possessivartikel` | Possessives | Possessives: *mi, tu, su, nuestro, vuestro, su*; *de* for owners | `possessives` |
| `welcher-dieser` | this/that | Demonstratives: *este, ese, aquel*; *esto, eso* | `demonstratives` |
| `gern` | like/love + -ing | *gustar*: *me gusta / me gustan*, *a mí también / a mí tampoco* | `gustar` |
| `temporale-praepositionen` | in/on/at time | Telling the time and days: *¿Qué hora es? Es la una. A las ocho. El lunes. Por la mañana.* | `time-and-days` |
| `aduso` | and/but/or/so | *y/e, o/u, pero, porque, también/tampoco* | `y-o-pero-porque` |
| `zahlen` | Numbers | Numbers, prices, phone numbers (*uno/un/una, veintiún, cien/ciento*) | `numbers` |
| `wortarten` | Parts of speech | Parts of speech in Spanish | `parts-of-speech` |

### A2 (21) — `grammar-a2`

| Slot | Now (English) | Spanish topic | New slug |
|---|---|---|---|
| `perfekt` | Past simple | *Pretérito perfecto*: *he comido, has llegado* (with *hoy, esta semana, ya, todavía no*); es419 note | `present-perfect` |
| `zusammengesetzte-verben` | Present perfect vs past (B1) | *Pretérito indefinido*: regular forms and key irregulars (*fui, tuve, hice, estuve, dije*) | `preterite` |
| `n-deklination` | used to (B1) | *Pretérito imperfecto*: forms and use for habits and descriptions (*antes vivía…*) | `imperfect` |
| `trennbare-verben` | Phrasal verbs | *ir a* + infinitive (near future) | `ir-a-infinitive` |
| `komposita` | Compound nouns | *estar* + gerund (*estoy trabajando*) and gerund forms (*leyendo, durmiendo*) | `estar-gerund` |
| `reflexive-verben` | Reflexive pronouns | Reflexive verbs and daily routine (*me levanto, se ducha*) | `reflexive-verbs` |
| `akkusativ` (+ `akkusativ.json`, `/object-pronouns`) | Object pronouns (A1) | Direct object pronouns *lo, la, los, las* and personal *a* (*Veo a Ana. La veo.*); leísmo note | `object-pronouns` (keep) |
| `dativ` | two objects | Indirect object pronouns *me, te, le, nos, os, les*; *le → se* (*se lo doy*) | `indirect-object-pronouns` |
| `modalverben` | Modal verbs | Verb + infinitive: *tener que, hay que, poder, deber, querer, saber* | `tener-que-poder` |
| `komparativ-superlativ` | Comparatives | Comparatives and superlatives (*más… que, tan… como, el más…, -ísimo*; *mejor, peor, mayor, menor*) | `comparatives` |
| `lokale-praepositionen` | Prepositions of place | Place: *en, encima de, debajo de, al lado de, delante de, enfrente de*; *aquí, ahí, allí* | `prepositions-of-place` |
| `wechselpraepositionen` | Prepositions of movement | *a* and *en*: going and being (*voy a Madrid / estoy en Madrid*), *de… a, desde… hasta* | `a-or-en` |
| `indefinitpronomen` | some/any | *algo/nada, alguien/nadie, algún/ningún, otro* | `indefinites` |
| `satzstellung` | much/many | *muy, mucho, poco, bastante, demasiado* (adverb vs adjective) | `muy-mucho` |
| `negation` | Negatives | Negation: *no, nunca, tampoco, nada, nadie, ninguno*; double negation | `negation` |
| `nebensaetze-weil-dass` | because/so/that | *porque, como, así que, por eso*; *que*-clauses with *creo que, dice que* | `porque-como` |
| `konjunktiv2-hoeflich` | Polite requests | Polite requests: *¿Puede…?, ¿Me pone…?, quería, me gustaría, ¿Te importa…?* | `polite-requests` |
| `positionsadverbien` | Frequency adverbs | Frequency: *siempre, a menudo, a veces, casi nunca*; *soler* + infinitive | `frequency-soler` |
| `adjektivdeklination-a2` | Adverbs of manner | Adverbs in *-mente*; *bien/mal*, *bueno/malo* | `adverbs-mente` |
| `artikel-oder-nicht` | the or no article | Article or no article (*Me gusta el café. Tengo coche. Es médica. Hablo español.*) | `article-or-not` |
| `ordinalzahlen` | Ordinals and dates | Ordinal numbers (*primer, tercer*), dates and floors (*el 3 de mayo, el segundo piso*) | `ordinals-dates` |

### B1 (27) — `grammar-b1`

| Slot | Now (English) | Spanish topic | New slug |
|---|---|---|---|
| `zustandspassiv` | Present perfect continuous | *Perfecto* or *indefinido* (*hoy he ido / ayer fui*); es419: LatAm prefers *indefinido* | `perfecto-vs-indefinido` |
| `praeteritum-plusquamperfekt` | Narrative tenses | *Indefinido* or *imperfecto* in a story | `preterite-vs-imperfect` |
| `passiv-b1` | Passive basics | *Pluscuamperfecto* (*había comido*) | `pluperfect` |
| `futur` | Future forms | *Futuro simple*: forms, plans, predictions, promises | `future-simple` |
| `funktionen-von-werden` | Reported speech | *Condicional simple*: forms, advice (*yo que tú…*), polite wishes | `conditional` |
| `imperativ` | Imperatives (A1) | Imperative, affirmative and negative: *tú, usted, vosotros, ustedes*; with pronouns (*dímelo, no me lo digas*); es419 note | `imperative` |
| `infinitiv-mit-zu` | -ing or to | Present subjunctive: forms (regular and key irregulars) | `present-subjunctive` |
| `verben-als-nomen` | Gerunds | Subjunctive after wishes and feelings: *quiero que, espero que, me alegra que, ojalá* | `subjunctive-wishes` |
| `infinitiv-ohne-zu` | make/let/help | Infinitive or subjunctive: *quiero ir / quiero que vayas* | `infinitive-or-subjunctive` |
| `finalsaetze` | Purpose | *para* + infinitive / *para que* + subjunctive | `para-que` |
| `temporale-nebensaetze` | Time clauses | Time clauses: *cuando, en cuanto, hasta que* + indicative or subjunctive (*cuando llegues*) | `cuando-subjunctive` |
| `konditionalsaetze` | Conditionals 0/1/2 | Real conditions: *si* + present (*si llueve, me quedo en casa*) | `si-real` |
| `als-oder-wenn` | when or if | *por* or *para* | `por-para` |
| `temporale-praepositionen-b1` | for/since/ago | *desde, desde hace, hace… que, hasta, durante, llevar* + time | `desde-hace` |
| `relativpronomen` | Relative clauses | Relative clauses with *que, donde, lo que* (indicative) | `relative-clauses` |
| `indirekte-fragen` | Indirect questions | Indirect questions and reporting in the present (*dice que…, me pregunta si…, no sé dónde…*) | `indirect-questions` |
| `lassen` | have something done | Verbal periphrases: *acabar de, volver a, empezar a, dejar de, seguir* + gerund, *llevar* + gerund | `verbal-periphrases` |
| `konnektoren-grund-gegengrund` | Contrast linkers | Linkers: *aunque* (indicative), *sin embargo, además, en cambio, por lo tanto* | `linkers` |
| `genitiv` | 's or of | Possessive pronouns (*el mío, la tuya, los suyos*) | `possessive-pronouns` |
| `adjektivdeklination` | Adjective order | Adjective position and short forms: *buen, gran, primer, algún*; *un gran hombre / un hombre grande* | `adjective-position` |
| `partizip-als-adjektiv` | -ed/-ing adjectives | Participles: *estar* + participle (*la tienda está cerrada*), irregular participles | `estar-participle` |
| `verben-praepositionen` | Verbs + prepositions | Verbs + prepositions: *pensar en, soñar con, depender de, acordarse de, tardar en* | `verbs-prepositions` |
| `da-wo-woerter` | Prepositions at the end | Pronouns after prepositions: *para mí, sin ti, conmigo, contigo* | `prepositional-pronouns` |
| `nutzen-benutzen` | make or do | *ser* and *estar*: changing meaning (*ser/estar listo, aburrido, malo*), events (*la fiesta es en…*) | `ser-estar-advanced` |
| `positionsverben` | Confusing verbs | Verbs like *gustar*: *encantar, interesar, doler, molestar, parecer, quedar* | `verbs-like-gustar` |
| `wortbildung-nomen` | Noun suffixes | Word formation: *-ción, -dad, -miento, -ero/-era, -ería*; diminutives *-ito, -illo* | `word-formation` |
| `adjektive-als-nomen` | the + adjective, one | *lo* + adjective (*lo bueno, lo importante es…*), *lo que* | `lo-adjective` |

### B2 (13) — `grammar-b2`

| Slot | Now (English) | Spanish topic | New slug |
|---|---|---|---|
| `konjunktiv2` | Third conditional, wish | Imperfect subjunctive: forms (*-ra / -se*) and uses (*quería que vinieras*) | `imperfect-subjunctive` |
| `modalsaetze` | Modals of deduction | Unreal conditions: *si* + imperfect subjunctive + conditional; *si hubiera…* (intro) | `si-unreal` |
| `passiv` | The passive | Passive and *se*: *ser* + participle, *pasiva refleja* (*se alquila piso*), impersonal *se* | `passive-and-se` |
| `relativsaetze-was-wo` | Non-defining relatives | Relative clauses with subjunctive and prepositions (*busco a alguien que sepa…; el piso en el que vivo; quien*) | `relative-clauses-advanced` |
| `zumal-wohingegen` | Formal linkers | Reported speech with tense shifts (*dijo que vendría, me pidió que fuera*) | `reported-speech` |
| `zweiteilige-konnektoren` | Paired conjunctions | Subjunctive in opinion and doubt: *(no) creo que, es posible que, dudo que, no es verdad que* | `subjunctive-opinion` |
| `konsekutivsaetze` | so/such/too/enough | Concession and consequence: *aunque* + subjunctive, *por mucho que, tan… que, de modo que* | `aunque-subjunctive` |
| `negationswoerter` | Negative words | Probability: future and conditional of conjecture (*serán las tres, habrá salido, estaría cansado*), future and conditional perfect | `probability` |
| `irgend` | -ever words | Accidental *se*: *se me olvidó, se le ha roto, se nos acabó* | `accidental-se` |
| `fokuspartikeln` | Focus adverbs | Verbs of change: *ponerse, volverse, hacerse, quedarse, convertirse en* | `verbs-of-change` |
| `modalpartikeln` | Discourse markers | Discourse markers in speech: *pues, bueno, o sea, es que, vamos, venga, vale* | `discourse-markers` |
| `adjektive-mit-praepositionen` | Adjectives + prepositions | Adjectives + prepositions (*harto de, capaz de, contento con, interesado en*) | `adjectives-prepositions` |
| `nomen-verb-verbindungen` | Collocations | Collocations: *tomar una decisión, echar de menos, dar un paseo, hacer caso, poner una queja* | `collocations` |

### C1 (11, free + paid slots) — `grammar-c1`

| Slot | Now (English) | Spanish topic | New slug |
|---|---|---|---|
| `konjunktiv-1` | Distancing | Sequence of tenses with the subjunctive; pluperfect subjunctive (*hubiera hecho*) | `sequence-of-tenses` |
| `es-korrelat` | Cleft sentences | Emphasis and cleft sentences: *Fue Ana quien…, Lo que necesito es…, Es aquí donde…* | `cleft-sentences` |
| `passiversatz` | Inversion | Conditions without *si*: *de* + infinitive, *como* + subjunctive, *a no ser que, siempre que, con tal de que* | `conditions-without-si` |
| `futur-2` | Future perfect | Non-finite clauses: *al* + infinitive, gerund and participle clauses (*Terminada la reunión, …*) | `non-finite-clauses` |
| `irreale-vergleiche` | Unreal past | *como si* + imperfect/pluperfect subjunctive; *ni que* | `como-si` |
| `subjektive-modalverben` | Modal perfects | Modal periphrases: *deber / deber de, tener que, haber de, venir a, llegar a* | `modal-periphrases` |
| `nominale-praepositionen` | Formal prepositions | Formal connectors: *debido a, a raíz de, en virtud de, no obstante, por consiguiente* | `formal-connectors` |
| `nominalisierung` | Nominalisation | Nominalisation in formal writing | `nominalisation` |
| `partizipialattribute` | Participle clauses | Formal relatives: *el cual, lo cual, cuyo*; indicative vs subjunctive nuances | `formal-relatives` |
| `textkohaerenz` | Cohesion | Cohesion: reference, ellipsis, *lo/ello*, register | `cohesion` |
| `verbpraefixe` | Verb prefixes | Prefixes and derivation: *des-, re-, pre-, in-, sobre-, contra-* | `prefixes` |

No slot is dropped. Gaps noted for later (new files, English ids): *voseo* as a world note, *leísmo/laísmo* as a C1 usage topic, *haber* impersonal (*hubo* vs *hubieron*).

### 3.1 Grammar side files

| File | Spanish course | Item |
|---|---|---|
| `grammatik.json` (quick quizzes per slot) | follow the slot map | each `grammar-<level>` for its slots |
| `akkusativ.json` (`/object-pronouns`) | direct object pronouns and personal *a* | `grammar-a2` |
| `grammatik-lehrplan.json`, `grammatik-verwandt.json` | Spanish syllabus order per level, related topics recomputed | `grammar-structure` |
| `kursinhalte.json`, `content/program.json` | Spanish course plan per level (`program.json` unit titles also by `vocab-*`) | `grammar-structure` |
| `nachschlagen/starke-schwache-verben.json` (`/grammar/irregular-verbs`) | irregular verbs reference: sections `schwach` = regular, `stark` = irregular (*ser, ir, tener, hacer, decir…*), `gemischt` = stem-changing; rows *yo presente · él indefinido · participio* | `grammar-structure` |
| `nachschlagen/trennbare-verben.json` (`/grammar/phrasal-verbs-list`) | pronominal verbs reference (*acordarse de, irse, quedarse, darse cuenta de*); slug `reflexive-verbs-list` | `grammar-structure` |
| `nachschlagen/verben-mit-praepositionen.json` | verbs + prepositions reference | `grammar-structure` |
| `wortarten.json` | parts of speech (Spanish) | `grammar-structure` |
| `praepositionen-trainer.json` (`/prepositions`) | packs: *a / en / de*, *por / para*, place, time (*desde, hasta, durante*); pack ids kept | `grammar-structure` |
| `uebersetzungen/grammatik.json`, `grammatik-themen.json` | empty now; refill from the Spanish topics only with reliable translations | `grammar-structure` (optional) |
| `uebersetzungen/grammatik-ui.json` | keyed by German UI strings | **leave** (§9) |
| `verbtabellen.json` | Spanish conjugation tables (§4.1) | `conjugation-data` |
| `grammatik-start/*` + generator | "Spanish Grammar Start A1–B1" (§5.1) | `grammar-start-book` |
| `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json` (`/artikel` trainer) | **el / la** trainer: rule packs *-o → el, -a → la*, *-ción/-dad/-tud → la*, *-ma (Greek) → el*, exceptions (*el día, la mano, el mapa, la foto, la moto*), *el agua* (genus f); `artikel-haeufigkeit.json` stays empty until ranks exist | `games` |

---

## 4. New modules

### 4.1 Conjugation tables (`conjugation-data`)

`src/data/verbtabellen.json` keeps `about`, `groups`, `verbs`. Six person rows in `PERSONS`
(`src/lib/verbtabellen.js`): `yo · tú · él/ella/usted · nosotros/as · vosotros/as ·
ellos/ellas/ustedes`. A tense is a comma list of six forms (as now).

| Key | Holds |
|---|---|
| `inf` | infinitive (*hablar*, *levantarse*) |
| `group` | `hilfsverb` = *ser, estar, haber, ir*; `modal` = verbs + infinitive (*poder, querer, deber, saber, soler*); `unregelmaessig` = irregular; `regelmaessig` = regular *-ar/-er/-ir* models; `trennbar` = pronominal/reflexive verbs; **new** `stem-change` = *e→ie, o→ue, e→i* (+ its name and `what` in `groups`) |
| `regular: true` | forms generated by `verbtabellen.js` from the ending (the run rewrites the English generators `thirdPerson`/`pastEd` as Spanish *-ar/-er/-ir* generators) |
| `praes` | presente de indicativo |
| `praet` | pretérito indefinido |
| `p2` | participio (compound tenses: *haber* + `p2`; generated, not stored: perfecto, pluscuamperfecto, futuro perfecto, condicional perfecto, perfecto and pluscuamperfecto de subjuntivo) |
| **new** `imperf` | pretérito imperfecto |
| **new** `fut` | futuro simple |
| **new** `cond` | condicional simple |
| **new** `subj` | presente de subjuntivo |
| **new** `subjImpf` | imperfecto de subjuntivo, *-ra* form (the *-se* form is generated and shown as the alternative) |
| **new** `imp` | imperativo afirmativo, six slots, `–` for *yo*: `–, habla, hable, hablemos, hablad, hablen`; the negative is generated from `subj` (*no hables, no habléis*) |
| **new** `ger` | gerundio |
| `note` | usage note in English |
| `es419` | §1.5 (e.g. *coger*); the *vosotros* row is hidden by the helper in a LatAm mode |

Irregular verbs store only the tenses that are irregular; the generator fills the rest and flags
every form that differs from the regular pattern (`x`), so the table highlights what to learn.
Minimum set: the three regular models, *ser, estar, haber, ir, tener, hacer, decir, poder,
querer, saber, poner, salir, venir, ver, dar, traer, oír, conocer, conducir, pedir, dormir,
jugar, pensar, volver, sentir, seguir, empezar, elegir, construir, caer, caber, andar*,
reflexive models *levantarse, llamarse, irse*. Every form checked against RAE/DLE conjugation
tables; accents (*habláis, comeríais, estéis*) checked by script.

### 4.2 Conjugation trainer (`conjugation-trainer`) — add

- Page **`/grammar/conjugation`** (`src/pages/grammar/conjugation.astro`), lib
  `src/lib/conjugationTrainer.js`, data `src/data/conjugation-trainer.json`, styles reuse
  `practice.css` and the workspace styles. Linked from `/grammar`, `/grammar/verbs` and the
  verb topics.
- Reuse, no new dependencies: the practice workspace of `/prepositions`
  (`mountPracticeWorkspace` in `src/lib/practiceWorkspace.js`, `mountRuleColumn`), answer
  checking through `src/lib/answerMatch.js` (§1.2 accent rule), progress in localStorage like the
  other trainers, `setWaiting` for not-ready buttons (CLAUDE.md).
- Drills generated from `verbtabellen.json`: choose tense/mood (presente, indefinido,
  imperfecto, futuro, condicional, subjuntivo presente/imperfecto, imperativo afirmativo/negativo,
  compound tenses), verb group (regular *-ar/-er/-ir*, stem-changing, *yo*-irregular, fully
  irregular, reflexive) and persons (with or without *vosotros*). Input: typed form with the
  accent key row, or choice of 3–4 forms on small screens.
- Hand-written sets in `conjugation-trainer.json` (`{ id, level, title, kind, variety, items }`,
  `kind`: `form` | `choice`): **ser/estar** (A1, A2, B1), **por/para** (B1, links to
  `/prepositions` pack), **indefinido/imperfecto** in context (B1), **subjunctive or indicative**
  (B1, B2). Every item: prompt with `___`, `options` (exactly one correct, or `answer` list),
  `explain` in English.

### 4.3 Business Spanish (`business-spanish`) — add, B1–C1

- Page **`/business-spanish`** (+ `/business-spanish/[unit]`), data
  `src/data/business-spanish/<unit>.json`, reusing the berufe deck components for the vocabulary
  part and the practice workspace for exercises.
- Units: `correos` formal emails (*Estimado/a…, Quedo a la espera de…, Un saludo*), `reuniones`
  meetings (opening, agreeing, disagreeing politely, summarising), `llamadas` phone calls,
  `entrevista` job interviews in Spain (questions, talking about experience, *tú/usted*),
  `curriculum` CV and cover letter conventions in Spain (photo, personal data, Europass;
  conventions "to verify"), `negociacion` (C1) negotiating and presenting figures.
- Unit shape: `{ id, level, title, intro, introEasy, phrases: [{ es, en, register, variety, es419? }],
  model: { title, text, notes }, words: [berufe deck entries or `{ ref, example }`],
  exercises: [practice items] }`. Spain conventions first; LatAm differences as `es419`.

### 4.4 DGT driving vocabulary (`dgt-vocab`) — add (replaces Führerschein)

- **Vocabulary only**: no official DGT test questions, no copied manual text, no claim to prepare
  for the exam on its own. Page **`/dgt-vocabulary`**, data `src/data/dgt/vocabulario.json` in the
  **berufe deck schema** (groups of words with `gender`, `plural`, `example`, `translations.en`,
  `variety`; refs `{ ref, example }` into the lexicon), rendered with the berufe deck components;
  validator `check-berufe.mjs` (or its core) extended to read `src/data/dgt/`.
- Groups: *el coche* (parts, controls), *la carretera* (road types, *rotonda, carril, arcén*),
  *las señales* (sign families and their words, no images copied from official material),
  *maniobras* (*adelantar, ceder el paso, estacionar*), *el examen y la autoescuela* (*examen
  teórico, práctico, permiso B, puntos*), *documentos y multas*. A short orientation box: the
  theory exam can be taken in some other languages (which: "to verify"), the official source is
  the DGT website.
- **Where the removed Führerschein module comes back from:** it is **not in this repo's
  history** (it starts at `9577286`, a squashed snapshot of icanspeak English @ `39ac46f`). The
  files were removed in icanspeak-english commit `db88ba4` (`cleanup`, 2026-11-02); the state
  before it is `db88ba4~1` in the **icanspeak-english** repo (paths in `EXPERIMENTE.md`:
  `src/data/fuehrerschein`, `src/lib/fahrQuiz.js`, `fahrQuizData.js`, `fahrSzene.js`,
  `fuehrerscheinData.js`, `stadtfahrt.js`, `src/lib/vorfahrt`, `src/pages/games/stadtfahrt.astro`,
  `vorfahrt.astro`, `src/styles/vorfahrt.css`; older still in deutschacademy).
  **Decision:** `dgt-vocab` restores **nothing**: the deck needs none of it, the German question
  bank is German-law content and must not come back, and queue runs must not touch other
  repositories. If a later item wants the driving scene code (`fahrSzene.js`) or the driving
  games, Edgar exports the files from icanspeak-english (`git -C <icanspeak-english> show
  db88ba4~1:<path>`) into this repo; that item then adapts them to Spanish rules and records it
  in `EXPERIMENTE.md`.

---

## 5. Module map (convert)

### 5.1 Placement, learner shell, grammar book

| Module | Spanish course | Item |
|---|---|---|
| `einstufung.json` (6 items per level, 2 drawn, each tests one level-typical feature) | Same design, Castilian standard. A1: *ser/estar*, present regular, *el/la*, *gustar*, *hay*; A2: *indefinido*, *perfecto*, *imperfecto*, object pronouns, *ir a*; B1: *indefinido/imperfecto*, present subjunctive (wishes), *por/para*, conditional, imperative; B2: imperfect subjunctive, *si* unreal, *se* passive, reported speech, subjunctive in relatives; C1: sequence of tenses, *como si*, conditions without *si*, formal relatives, cleft. | `placement-test` |
| `einfach-pfad.json` ("Learn step by step", A1–B1) | Beginner path built on the Spanish grammar slots and the A1–B1 vocab units; first steps for a newcomer in Spain (greetings, *me llamo*, numbers, *¿dónde está…?*, the padrón appointment) | `beginner-path` |
| `/step-by-step` screens (`src/lib/einfach-view.js`, `einfach-app.js`, `einfach-content.js`, noscript in `src/pages/step-by-step.astro`, `docs/easy-mode-tier1-v1.md`) | Spanish units; the recipe doc rewritten for Spanish units; *el/la* instead of *a/an/some* in the views | `beginner-path-ui` |
| `grammatik-start/en.json` (base book) + `scripts/generate-grammatik-start-pdf.mjs`, `check-grammatik-start.mjs` | **"Spanish Grammar Start A1–B1"**, brand icanspeak Spanish, 10 chapters on the Spanish A1–B1 topics; key `titleDe` holds the English title (as now). `de.json` (German explanations of the English book) is reset with `--skeleton de` unless the run writes German explanations of the Spanish book. | `grammar-start-book` |

### 5.2 Vocabulary

| Module | Spanish course | Item |
|---|---|---|
| `content/lexicon/a1…b2.json` (units of 25 words, topics) | Same units, unit ids and topic slugs where the topic fits; Spanish lemmas for Spain, chosen by topic and frequency, with the resident's needs first (*el padrón, la cita previa, el centro de salud, la nómina, el contrato*); schema §1.4, `variety` §1.5 | `vocab-a1` … `vocab-b2` |
| `content/lexicon/c1.json`, `c2.json` | 24 + 16 units, same conventions | `vocab-c1-c2` |
| `wortschatz.json` (phrase cards `front/note/translations`) | Spanish phrase cards; `note` = usage tip in English; `variety` | `vocab-a1` |
| `haeufigste-woerter.json` + `scripts/haeufigste-woerter.mjs`, `attach-ranks.mjs`, `artikel-haeufigkeit.mjs` | read `es_50k` instead of `en_50k` (licence "to verify"); data regenerated only when the list can be downloaded | `vocab-a1` |
| `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json` | keep pictures, re-key to the Spanish ids per level | each `vocab-*` |
| `lexicon/i18n/<lang>.json` | Spanish → learner language (§1.4) | each `vocab-*` for its level |
| `uebersetzungen/woerter-uk.json` | Ukrainian glosses of the old German words | `vocab-a1` decides: refill for Spanish A1 if reliable, else empty it (`entries: {}`) |

### 5.3 Listening (`hoeren.json`, ids kept, settings in Spain) — `listening`

| Id | Spanish script |
|---|---|
| `a1-ansage-bahnhof` | Announcement at a train station (platform, delay) |
| `a1-anruf-arzt` | Voicemail from the *centro de salud*: your appointment |
| `a1-supermarkt` | At the supermarket: *¿Dónde está…?* |
| `a1-verabredung` | Phone call: *¿Quedamos?* |
| `a2-amt-termin` | At the town hall: changing a *cita* |
| `a2-wohnungsbesichtigung` | Viewing a flat (*piso*) |
| `a2-radio-wetter-verkehr` | Radio: weather and traffic |
| `a2-paketdienst` | Voicemails: a parcel and the plumber (*fontanero*) |
| `b1-krankmeldung` | Calling in sick at work (*la baja*) |
| `b1-elterngespraech` | Meeting with the class tutor (*tutoría*) |
| `b1-radio-muelltrennung` | Radio feature: recycling and the coloured containers |
| `b1-durchsage-ersatzverkehr` | Announcement: line closure and replacement bus |
| `b2-diskussion-homeoffice` | Team meeting: *teletrabajo* |
| `b2-interview-anerkennung` | Interview: getting a foreign degree recognised (*homologación*) |
| `b2-beschwerde-versicherung` | Complaint to an insurance company |
| `b2-vortrag-ehrenamt` | Short talk: volunteering |

`voices` = es-ES voices (Azure names "to verify" before the first render); every script carries
`variety: "es-ES"`; `uebersetzungen/hoeren.json` stays empty. Places and firms invented.

### 5.4 Reading and writing — `reading-writing`

| Module | Spanish course |
|---|---|
| `lesen.json` (B1 short text, reading tasks 1–4, form task, writing prompt, error hunt) | B1 reading set from life in Spain: notices matching (*comunidad de vecinos*, school, gym), a local news article true/false, forum posts *¿quién lo dice?*, an interview; form = an invented municipal form (e.g. sports centre card, library card); writing prompt = an email; error hunt = typical learner errors (*soy cansado, la problema*). Same ids, levels, types, `kind`s, `from` links. |
| `fertigkeiten/lesen.json`, `fertigkeiten/schreiben.json`, `/writing/[id]` data | Spanish reading/writing hubs and writing tasks A1–B2 (forms, WhatsApp messages, emails to a landlord/school/employer, complaint, opinion text) |
| `uebersetzungen/lesen.json`, `schreiben.json` | stay empty |
| `src/lib/schreibKorrektur.js` | checks Spanish (LanguageTool `es`, own rules for ¿ ¡ and accents); LanguageTool is only called if the backend flag allows it (it is off) |

Formats: Spanish dates `03/11/2026`, times `17:30`, money `45 €`; phone numbers are obvious
placeholders (`600 000 0xx`; Spain has no reserved fiction range: "to verify"); emails use
`example.com`.

### 5.5 Speaking — `speaking`

| Module | Spanish course |
|---|---|
| `sprechen.json` (3 picture tasks) | 3 picture descriptions (A2) with follow-up questions, same pictures |
| `sprechen-b1b2.json` stages | B1/B2: **1 · The photo** (describe and imagine), **2 · The talk** (short monologue on a topic after notes), **3 · Conversation/role play**; modelled on DELE B1/B2 and SIELE oral task types; timings "to verify" and labelled "in the style of" |
| `redemittel.json` (14 functional sets) | same 14 set ids and phrase order (the beginner path addresses `redemittel:<set>#<index>`); key `de` = Spanish phrase, `en` = English meaning/usage; the last set → place (*¿Dónde está la pelota? Debajo de la mesa.*); `variety` on every phrase |
| `redemittel-i18n/<lang>.json` | re-keyed to the Spanish phrases; reliable languages only; `es.json` emptied (and deleted by `cleanup`) |
| `fertigkeiten/sprechen.json`, `uebersetzungen/sprechen.json` | Spanish hub; translations empty |

### 5.6 Pronunciation — `pronunciation`

| Module | Spanish course |
|---|---|
| `ausspracheregeln.json` | Castilian rules in the old rule slots: the five pure vowels, stress and written accents (*llana, aguda, esdrújula*), *c/z* = /θ/ (distinción; seseo/ceceo as `es419`/notes), *j/g* = /x/, *r/rr*, *b/v* = same sound (/b/ ~ [β]), *d* softening [ð], silent *h*, *ll/y* (yeísmo), *ñ*, linking (*sinalefa*), *qu/gu/gü* |
| `aussprache-check.json` | sentences A1–B1 (*pero/perro, caro/carro, casa/caza*), question slots stay questions |
| `satzmelodie.json` | intonation: yes/no questions (rise), *wh*-questions (fall), lists, exclamations, polite requests |
| `zungenbrecher.json` | traditional Spanish tongue twisters (public domain) by level |
| `aussprache-muttersprache.json` | drills per first language: English, German, French, Portuguese, Italian speakers first (e.g. English: vowel reduction, aspirated *p/t/k*, *r* tap; German: *b/v*, *z* = /θ/ not /ts/; French: *r*, nasal vowels, *u*; Portuguese: vowel reduction, *j*, *ll*; Italian: double consonants, *z*); other slots only where reliable |
| `fehler-nach-sprache.json` `area: "aussprache"` | rewritten together with the drills (they link both ways: `pnpm check:aussprache`) |

Every `audio` flag stays `false` until es-ES recordings exist; the pages read with an es-ES
browser voice (`LANG = "es-ES"` in the check libs, the dialogue voice in `src/lib/spielKit.js`).

### 5.7 Idioms, mistakes, slang — `idioms-mistakes`

| Module | Spanish course |
|---|---|
| `redewendungen.json` | Spanish idioms and proverbs B1–C1 used in Spain (*estar en las nubes, costar un ojo de la cara, ponerse las pilas*); `de` = the idiom, `en` = English meaning; origin only where well sourced |
| `umgangssprache.json` | colloquial Spain Spanish (*guay, currar, flipar, mola, tío/tía, vale*) with register notes; mild-to-strong swearing with warnings, no slurs; the UK law note goes |
| `typische-fehler.json` | typical mistakes (*soy cansado, la problema, me gusta los libros, estoy de acuerdo* vs *soy de acuerdo*, *pienso de*) in the same 5 group ids |
| `fehler-nach-sprache.json` | mistakes per first language. Language slots: `spanisch` (Spanish speakers) → **English speakers** (id `englisch`, it is free again); add `portugiesisch`; keep `deutsch`, `franzoesisch`, `italienisch`; keep `arabisch`, `ukrainisch`, `russisch`, `chinesisch` and add `rumaenisch` (large groups in Spain) only with reliable content; `tuerkisch`, `persisch`, `polnisch`, `vietnamesisch`, `tagalog` kept only if the run writes reliable content, otherwise removed (with their drills) |
| `wortfallen.json` | false friends for English (*embarazada, constipado, éxito, carpeta, librería, actualmente*), German (*el gimnasio* ≠ Gymnasium, *la tasa* ≠ Tasse, *el mantel* ≠ Mantel), French (*la carpeta* ≠ carpette, *largo* ≠ large), Portuguese (*exquisito, polvo, oficina*), Italian (*burro, salir*) speakers; group ids new (English), en.json keys re-keyed in the same commit |
| `synonyme.json` | Spanish synonym groups A1–B2 with register differences |

### 5.8 Culture and knowledge (Spain first, then the Hispanic world) — `culture`

`kultur.json` topics, ids kept:

| Id | Level | Spanish course topic |
|---|---|---|
| `duzen-siezen` | A1 | *Tú* or *usted*: how formal to be in Spain |
| `pfand` | A1 | Greetings: *dos besos*, handshake, *¡Buenas!* |
| `sonntagsruhe` | A1 | Daily rhythm: meal times, opening hours, Sundays and *festivos* |
| `trinkgeld` | A1 | Bars and paying: *la cuenta*, *invitar*, tipping |
| `bundeslaender` | A2 | The 17 *comunidades autónomas* and 2 autonomous cities |
| `feiertage` | A2 | Public holidays: national, regional, local |
| `muelltrennung` | A2 | Recycling: the coloured containers |
| `termine` | A2 | *Cita previa*: an appointment for everything |
| `anmeldung` | B1 | *Empadronamiento*: registering at the town hall |
| `krankenversicherung` | B1 | Public health: *tarjeta sanitaria*, *centro de salud*, *urgencias* |
| `mieten` | B1 | Renting a flat: *fianza*, contract, bills, *comunidad* |
| `schulsystem` | B1 | The school system: *infantil, primaria, ESO, bachillerato, FP* |
| `arbeit-finden` | B1 | Finding a job: SEPE, *currículum*, contract types |
| `ausbildung` | B2 | *Formación profesional* and university; *homologación* |
| `kuendigung` | B2 | Leaving a job: notice, *finiquito*, *paro* (general orientation) |
| `oeffentlich-rechtlicher-rundfunk` | B2 | Public media: RTVE and regional broadcasters |
| `vereine` | B2 | Associations, *peñas*, volunteering |
| `foederalismus` | C1 | The State of Autonomies: State, communities, provinces, municipalities |
| `sozialversicherung` | C1 | *Seguridad Social*: number, *afiliación*, contributions |
| `wahlen` | C1 | Elections and the electoral system (factual, neutral) |
| `erinnerungskultur` | C2 | The Transition to democracy (factual, neutral) |
| `grundgesetz` | C2 | The Constitution of 1978 and the Constitutional Court |
| `mitbestimmung` | C2 | Unions, *convenios colectivos* and workers' rights |

| Other module | Spanish course |
|---|---|
| `kultur-insider.json`, `kultur-bilder.json` | Spain insider tips (*sobremesa*, *el aperitivo*, neighbours' WhatsApp group); pictures only where they fit |
| `wusstest-du.json`, `kalender-saetze.json` | "Did you know?" about Spanish; daily sentences in Spanish with English |
| `zitate.json`, `uebersetzungen/zitate.json` | Spanish-language quotes, public domain or properly attributed short quotes, verified attribution (author death year and public-domain status "to verify" per author) |
| `/explore` (+`/films`) | Spanish films and series from Spain, then Latin America (titles and short own descriptions only) |
| `/knowledge/country-and-culture`, `/knowledge/learning` | Spain/Hispanic world, learning tips for Spanish (text via `ui-pages-*`) |

Facts that change (fees, figures, rules) need a source and an "as of" date in the sourcing note.

### 5.9 Games

| Module | Spanish course | Item |
|---|---|---|
| `artikel-sprint` (`/games/countable-sprint`) | **Gender sprint**: *el / la* gates, *los / las* plural gates; traps *el agua, la mano, el día* | `games` |
| `/artikel` trainer + `artikel*.json` | el/la trainer (§3.1) | `games` |
| `quakiSpringt/fragen.json`, `turm.json` | Spanish quiz pools per level | `games` |
| `hochstapler/themen.json`, `redemittel.json`, `strings.js` | Spanish impostor themes on Spanish lexicon ids, sentence starters A1–C1 | `games` |
| `satzregen/saetze.json` + `quelle.txt` | own Spanish sentences; Spanish word order is freer than English: every other correct order is an `{alt}` in `quelle.txt`; mode ids kept (`v2` statements and questions, `janein` yes/no, `klammer` → object pronouns before the verb, `nebensatz` → indirect questions) | `games` |
| `nussnacht` (Nut night, `src/lib/nussnacht`) | shots *el / la* from lexicon `gender` (`g` 0 el, 1 la; plural creatures take *los/las*); bosses = the gender traps (*el mapa, la foto, el agua, el problema, la radio*); the "two-word cracker" upgrade → compound nouns (*sacacorchos, abrelatas* → *el*) | `games-arcade` |
| `hoerSafari` (Listening safari) | hear *el/la* + noun, hit the picture; **no Spanish audio exists**, so the browser es-ES voice speaks (as the English course did with en-GB), and without speech the word is shown at once | `games-arcade` |
| `buergeramt` (`/games/front-desk`, `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/*`) | **Extranjería sim**: desk at the invented town of Villabruno. Day 1 = *padrón* desk at the town hall (empadronamiento: ID, proof of address); later days = Extranjería appointment desk (NIE, TIE: form, passport, photo, fee receipt; form names and fee model numbers "to verify"). The player checks **paperwork completeness only**; arraigo and the 2026 extraordinary regularisation appear as customers who are referred to information ("this desk doesn't decide that") plus a "general orientation, not legal advice" box. Paper kinds keep their ids (`ausweis` = national ID/passport, `pass` = passport, `meldeschein`/`abmeldung` = application form with boxes, `wgb` = rental contract / proof of address); rule `art: "echt"` = usual Spanish practice with a source type, `"lindenau"` (value kept) = made-up Villabruno rule. | `extranjeria-sim` |
| `knigge` (`/games/manners`, `src/lib/knigge/scenes.js`) | manners in Spain: greetings and *dos besos*, meal times, *tú/usted*, the bar round, neighbours, punctuality; `de` = the Spanish line, `en` = English meaning; wheel `sie`/`du` = *usted*/*tú* | `games-dialogue` |
| Lindenau / Brambleford RPG (`/games/brambleford`, `src/lib/lindenau/*`, `uebersetzungen/lindenau.json`) | **Villabruno**, an invented Spanish town (working name: `games-dialogue` checks no real municipality has it, else picks another and updates this plan): errands at the *panadería*, train station, *centro de salud*, supermarket, new neighbour, *cafetería* | `games-dialogue` |
| `/game` (live-quiz join page) | content from the teacher quiz | `teachers` |

### 5.10 Teachers — `teachers`

| Module | Spanish course |
|---|---|
| `arbeitsblatt/<id>.json` | tandem extras for the Spanish topic in each slot (blue tile: infinitive → form, *el/la*, singular → plural, *tú → usted*; choice tiles *ser / estar*, *por / para*, *el / la*) |
| `partneruebungen/*` | same scenarios in Spain: hairdresser, *intercambio de idiomas*, market stall, new room, *indefinido* memory, picnic, weekend bingo, *fiesta del barrio*, shared-flat dice; drafts until reviewed |
| `unterricht-wortschatz.json`, `lernstunde-texte.json`, timetable texts in `src/lib/stundenplan.js` | Spanish lesson-mode word fields and phase texts (phase detection strings adapted) |
| `downloads.json` | Spanish download catalogue (links to Cervantes, RAE/DLE, DELE/SIELE/CCSE official pages, DGT) |
| printable games, tests, surveys | domino *el / la*, plurals, word ↔ meaning; class-test detection for Spanish grammar words |
| `einstieg-bilder.json` | photo ids, language-neutral: keep |

### 5.11 Life in Spain: nationality, CCSE, Extranjería

| Item | Files |
|---|---|
| `ccse` | `leben-in-deutschland.json` (meta: `totalQuestions`, `passScore`, time "to verify"; questions own, grouped by the public CCSE subject areas; every fact with a source in the sourcing note), `uebersetzungen/leben-in-deutschland.json` (emptied unless reliable), `/ccse` pages (`/test`, `/facts`); the Life in the UK PDFs and downloads on `/facts` go |
| `nationality-path` | `pruefungen/dtz/uebungssatz-1.json`, `src/lib/dtzTrainer.js` texts, paid `dtz/uebungssatz-{2,3,4}.json`, new `/nationality` page (`src/pages/nationality.astro`), registry `dtz` texts |
| `extranjeria-sim` | `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/{regeln,faelle,daten,kunde,tisch}.js` texts |

### 5.12 Spanish for work (`data/berufe/`, now `/english-for-work`) — `spanish-for-work`

Same 10 sector ids (progress keys), content for Spain, sectors where immigrants in Spain often
work first:

| Id | Spanish course sector |
|---|---|
| `pflege` | Care work: elderly care at home and in residences (*cuidador/a, residencia*) |
| `gastronomie` | Hospitality: bars, restaurants, kitchens (*hostelería*) |
| `kita` | **Cleaning and domestic work** (*limpieza, empleo del hogar*, incl. childcare in families) |
| `elektro-technik` | **Agriculture and farm work** (*el campo, invernaderos, recogida*) |
| `bau-handwerk` | Construction and trades |
| `einzelhandel` | Shops and supermarkets |
| `lager-logistik` | Warehouse and logistics |
| `kraftfahrer` | Driving and delivery (*reparto*); refs into `dgt/vocabulario.json` allowed |
| `hotel` | Hotels and tourism |
| `buero` | Office and admin (links to Business Spanish) |

Conventions as the lexicon (§1.4): own words `gender` el/la, plural, `forms` per §1.4,
`translations.en` = English gloss, `deHint` = German translation (the German tab) or removed if
the `de` tab is dropped; `variety` on own entries. Working conditions (contracts, *régimen
especial de empleadas de hogar*) only as general orientation, "to verify". Validator
`src/lib/berufeCore.js` (`pnpm check:berufe`).

### 5.13 Word stories (`content/wortgeschichte/`) — `word-stories`

Spanish etymology stories, new files by Spanish lemma slug, same schema: Latin (*casa, agua,
hablar*), Arabic (*aceite, almohada, azúcar, ojalá, alcalde, aldea*), Germanic (*guerra, guardar,
ropa*), Greek, American languages (*chocolate, tomate, patata*), modern loans. First batch about
30 A1–A2 words, every story sourced (DLE/RAE etymology, Corominas via secondary sources,
Wiktionary), `status: "entwurf"`, `checkedBy`/`checkedAt` set. The 30 English stories are deleted
when their Spanish batch lands (the same `publishOn` dates reused); `cleanup` removes any left.
`entryLang` in `wortgeschichteCore.js` gets `es`.

### 5.14 Accents and languages — `accents-languages`

| Module | Spanish course |
|---|---|
| `/knowledge/accents` (`dialekte.json`, `dialekte-karte.json`, `dachMap.js`) | varieties of Spanish **in Spain** (Castilian north/centre, Andalusian, Canarian, Murcian, Extremaduran, Spanish in Catalonia/Galicia/Basque Country) with features (seseo/ceceo, aspiration, yeísmo); world varieties (Mexican, Caribbean, Andean, Rioplatense, Chilean) as notes; Spain's co-official languages (Catalan/Valencian, Galician, Basque, Aranese) as dots (`lang: true`). Map geometry from Natural Earth as the English run did (geo packages in a scratch folder, never site dependencies). |
| `/knowledge/languages` (`sprachen-welt.json`, `sprachen-karte.json`) | where Spanish is spoken: 20 countries with Spanish as official/main language + Puerto Rico, Equatorial Guinea, the US as a large community; status keys keep names with these meanings |

---

## 6. Data-file naming

Data file names and folders stay as they are (German names: `einstufung.json`, `hoeren.json`,
`grammatik/…`): code, generators and validators reference them, and renaming buys nothing for a
visitor. New files use English names. A later clean-up of file names is out of this queue.

---

## 7. Modules dropped (removed by `cleanup`)

| What | Why | Restore |
|---|---|---|
| English-course leftovers no item converted (e.g. unwritten SIELE band sets, paid DTZ sets 2–4 still in English, Life-in-the-UK PDFs, English word stories) | must not stay next to Spanish content | `git checkout <cleanup-commit>~1 -- <path>`; recorded in the `cleanup` report and §13 |
| `lexicon/i18n/es.json`, `redemittel-i18n/es.json` | Spanish → Spanish translation makes no sense | same |
| `ENGLISH_LEVELS` and the a/an/some values in validators | no English level left | same |
| German → English legacy redirects (`ROUTE_RENAMES` 301s in `astro.config.mjs`, `DROPPED`, `ACCOUNT_REDIRECTS` targets) | new site at `/spanish`, no German URL was ever public here | done by `routes` (redirects), not `cleanup` |

Experiment pages follow CLAUDE.md (`EXPERIMENTE.md` archive entry before removal). The
Führerschein, driving games, politics, tax havens, beer map and German declension were already
removed in icanspeak-english (§4.4 for where they live).

---

## 8. Slugs to rename (`routes`)

Current (English course) → Spanish course. No redirects from the English-course URLs: the site
at `/spanish` is new and nothing was deployed. Every internal link, `catalog.js` menu,
`suche-seiten.json`, `entry-pages.json`, sitemap and `llms.txt` follows, base-aware.

| Current | New |
|---|---|
| `/cambridge` (+`/[slug]`) | `/dele` (+`/[slug]`: `a2`, `b1`, `b2`, `c1`) |
| `/a1-test` | `/dele/a1` |
| `/cambridge/use-of-english` | `/dele/language-use` |
| `/ielts` (+`/practice-set`) | `/siele` (+`/practice-set`) |
| `/trinity` (+`/[slug]`) | `/siele/levels` (+`/[slug]`) |
| `/trinity/ise-1` (+`/mock-test`, `/practice-set`) | `/nationality/dele-a2` (+`/mock-test`, `/practice-set`) |
| `/life-in-the-uk` (+`/test`, `/facts`) | `/ccse` (+`/test`, `/facts`) |
| `/english-for-work` (+`/[beruf]`) | `/spanish-for-work` (+ sector slugs per §5.12 titles: `care-work`, `hospitality`, `cleaning-domestic-work`, `agriculture`, …) |
| `/games/countable-sprint` | `/games/gender-sprint` |
| `/games/front-desk` | `/games/extranjeria` |
| `/games/brambleford` | `/games/villabruno` (or the name `games-dialogue` settles on) |
| `/grammar/phrasal-verbs-list` | `/grammar/reflexive-verbs-list` |
| grammar topics `/<slug>` | §3 "New slug" (`TOPIC_SLUGS`) |
| item slugs (listening, reading, writing, speaking, culture, phrases, work groups: `ITEM_SLUGS`, `WORK_GROUP_SLUGS`) | kebab-case of the new English title (`a1-ansage-bahnhof` → `a1-station-announcement`) |
| teacher worksheets `/teachers/worksheets/{grammar,tandem}/<slug>` | follow the topic slugs |
| **new** | `/grammar/conjugation`, `/business-spanish`, `/dgt-vocabulary`, `/nationality`, `/exams/dele-or-siele` |
| kept | `/grammar`, `/vocabulary`, `/listening`, `/reading`, `/writing`, `/speaking`, `/pronunciation`, `/intonation`, `/tongue-twisters`, `/placement-test`, `/step-by-step`, `/object-pronouns`, `/prepositions`, `/culture`, `/knowledge/*`, `/teachers/*`, `/exams`, `/exam-plan`, other games, legal pages |

`EXAMS`, `EXAM_PATHS`, `ROUTE_RENAMES`, `TOPIC_SLUGS`, `REF_SLUGS`, `ITEM_SLUGS`,
`WORK_GROUP_SLUGS` in `src/lib/routes.js` are the one table; ids, storage keys and data file
names stay.

---

## 9. Modules left as is

| Module | Reason |
|---|---|
| Backend seam: `src/lib/backend.js`, `supabase/browser.js`, `api.js`, `analytics.js`, `monitoring.js`, `pronunciation/browser.ts`, `access.js`, `PremiumLock` | no integrations (ARCHITECTURE.md); only voice language es-ES where a module sets it |
| Server-only features (live quiz rooms, classes, cloud sync, leaderboards) | fail softly offline; their texts are UI (`ui-*`), their content comes from `teachers` |
| `steuer.json`, `produkte.json`, `premium-features.json` | business/legal settings; only their rendered strings via `ui-*` |
| Image manifests (`*-bilder*.json`, `*.manifest.json`, `hub-emoji.json`, `einstieg-bilder.json`) | language-neutral |
| `paid-manifest.json`, `saetze-index.json`, `public/inhalt/*` | generated |
| `uebersetzungen/grammatik-ui.json` | keyed by German UI strings, read by `check-grammatik-ui`; harmless |
| `uebersetzungen/rechtliches.json` and legal facts (company, address, contact) on `/privacy`, `/terms`, `/legal-notice` | legal facts unchanged; only language and brand (`ui-pages-m-z`) |
| Mascots (Bruno, Quaki), design system page, icons, fonts, CSS, RTL setup | language-neutral; texts via `ui-*` |
| `src/lib/audioPacks.js` stub, `/account` page and its redirects | no app, no accounts |
| Data file names and ids (§6), storage keys | code and saved progress key on them |
| `docs/inhalte-qa/` | QA reports, regenerated by `pnpm check:inhalte` |
| `src/integrations/*` logic | only made base-aware by `base-path-and-brand`, language handling by `ui-lang-*` |

---

## 10. Infrastructure items

### 10.1 `base-path-and-brand`

`astro.config.mjs` (`site`, `base`, redirects base-aware); one helper **`src/lib/paths.js`**
(`withBase(path)`, `absoluteUrl(path)`, `langPath(lang, path)` → `/spanish/de/…`); every link,
asset, fetch (`public/i18n/*.json`, data JSON endpoints), canonical, hreflang, sitemap, OG image
and `llms.txt` URL through it (`src/layouts/Layout.astro`, `src/lib/i18n.js`, `src/integrations/*`,
components and pages that write `href="/…"`, `src` and `fetch("/…")`); brand strings in
`public/i18n/en.json`, `Layout.astro`, manifest, `brand/`, OG images; `scripts/check-base.mjs` +
`pnpm check:base` (fails on root-absolute `href`/`src`/`action`/`srcset`/`url()` in `dist/` that
don't start with `/spanish/`). Every later item runs `pnpm check:base` after the build.

### 10.2 `variety-schema`

§1.5: `src/lib/variety.js`, `scripts/check-variety.mjs` (in the gate), the validators that own
lexicon/berufe/grammar files accept `variety`, `es419`, `genus`, `fem`.

### 10.3 `ui-components`, `ui-pages-a-l`, `ui-pages-m-z`

Page titles, descriptions, leftover English-course/German UI text (Cambridge, IELTS, UK, British
English, German strings) in `src/layouts`, `src/components`, `src/pages` (split a–l / m–z + legal
pages). New strings into `public/i18n/en.json` with `data-i18n`. Data content is not theirs.

### 10.4 `ui-lang-de`, `-fr`, `-pt`, `-it`

Registry entry in `src/lib/languages.js` (`status: "draft"` on every surface, `urlPrefix`,
`hreflang`), `public/i18n/<code>.json` from `en.json`, entry pages at `/spanish/<code>/` with
hreflang. Portuguese: **recommendation Brazilian** (`pt`, hreflang `pt-BR`): the larger group of
Portuguese speakers learning Spanish, in Spain and worldwide; `ui-lang-pt` decides and says so.

### 10.5 `routes`, `cleanup`, `deploy-readme`

§8, §7; `deploy-readme`: README (pnpm commands, `pnpm check:base`), static Vercel project
(framework Astro, build `pnpm build`, output `dist`, base `/spanish`), the umbrella rewrite of
`icanspeak.it/spanish/*` to this project, post-deploy checks.

---

## 11. Queue item → files

| Item | Files it owns |
|---|---|
| `content-plan` | `docs/content-plan.md`, `EXPERIMENTE.md` (Führerschein source note) |
| `base-path-and-brand` | `astro.config.mjs`, `src/lib/paths.js` (new), `src/layouts/Layout.astro`, `src/lib/i18n.js`, `src/integrations/*`, root-absolute links in `src/components/**`, `src/pages/**`, `src/lib/**`, brand strings in `public/i18n/en.json`, `public/manifest*`, `brand/`, OG images, `scripts/check-base.mjs` (new), `package.json` (`check:base`) |
| `variety-schema` | `src/lib/variety.js` (new), `scripts/check-variety.mjs` (new), `scripts/check-content.mjs`, `scripts/validate-lexicon.mjs`, `src/lib/berufeCore.js` |
| `ui-components` | `src/layouts/**`, `src/components/**`, `public/i18n/en.json` |
| `ui-pages-a-l` | `src/pages/[a-l]*`, `public/i18n/en.json` |
| `ui-pages-m-z` | `src/pages/[m-z]*` (incl. `privacy`, `terms`, `legal-notice`), `uebersetzungen/rechtliches.json` (language only), `public/i18n/en.json` |
| `placement-test` | `src/data/einstufung.json` |
| `grammar-a1` … `grammar-c1` | `src/data/grammatik/<slot>.json` per §3 (by **new** level), `src/paid/grammatik/*` (C1), `grammatik.json` entries of those slots, `akkusativ.json` (A2), `src/lib/answerMatch.js` accent hint (`grammar-a1`); German/English UI fallbacks in `src/lib/grammarWorkspace.js` where a topic needs them |
| `grammar-structure` | `grammatik-lehrplan.json`, `grammatik-verwandt.json`, `nachschlagen/*`, `wortarten.json`, `kursinhalte.json`, `content/program.json` (module titles), `praepositionen-trainer.json`, `uebersetzungen/grammatik*.json` |
| `grammar-start-book` | `grammatik-start/*`, `scripts/generate-grammatik-start-pdf.mjs`, `scripts/check-grammatik-start.mjs` |
| `conjugation-data` | `verbtabellen.json`, `src/lib/verbtabellen.js`, `src/pages/grammar/verbs.astro` (labels), `arbeitsblatt/verbtabellen.json` |
| `conjugation-trainer` | `src/pages/grammar/conjugation.astro` (new), `src/lib/conjugationTrainer.js` (new), `src/data/conjugation-trainer.json` (new), links on `/grammar` and `/grammar/verbs`, `public/i18n/en.json` |
| `beginner-path` | `einfach-pfad.json` |
| `beginner-path-ui` | `src/lib/einfach-view.js`, `einfach-app.js`, `einfach-content.js`, `src/pages/step-by-step.astro` (noscript), `docs/easy-mode-tier1-v1.md` |
| `vocab-a1` … `vocab-b2` | `content/lexicon/<level>.json`, `lexicon/i18n/*` for that level, `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json`, `content/program.json` unit titles; `vocab-a1` also `wortschatz.json`, `haeufigste-woerter.json` + its scripts, `src/lib/lexicon.js` (`SPANISH_LEVELS`), `src/lib/audioSlug.js` (`slugify`), `scripts/validate-lexicon.mjs`, `uebersetzungen/woerter-uk.json` |
| `vocab-c1-c2` | `content/lexicon/c1.json`, `c2.json`, their i18n entries; drops `ENGLISH_LEVELS` if no English level is left |
| `listening` | `hoeren.json`, `uebersetzungen/hoeren.json` |
| `reading-writing` | `lesen.json`, `fertigkeiten/lesen.json`, `fertigkeiten/schreiben.json`, writing task data, `uebersetzungen/lesen.json`, `schreiben.json`, `src/lib/schreibKorrektur.js` |
| `speaking` | `sprechen.json`, `sprechen-b1b2.json`, `redemittel.json`, `redemittel-i18n/*`, `fertigkeiten/sprechen.json`, `uebersetzungen/sprechen.json`, exam lines in `src/pages/speaking/[id].astro` |
| `pronunciation` | `ausspracheregeln.json`, `aussprache-check.json`, `satzmelodie.json`, `zungenbrecher.json`, `aussprache-muttersprache.json`, `area: "aussprache"` of `fehler-nach-sprache.json`, `src/lib/ausspracheTipps.js`, `LANG` in the check libs |
| `idioms-mistakes` | `redewendungen.json`, `umgangssprache.json`, `typische-fehler.json`, `fehler-nach-sprache.json` (other areas), `wortfallen.json`, `synonyme.json`, matching `en.json` keys |
| `exams-dele` | `pruefungen/start-deutsch-1/*`, `saetze/goethe-*`, `paid/pruefungen/saetze/goethe-c1-1.json`, `goethe-formate.json`, `sprachbausteine/*`, `fallen.json`, DELE part of `formate-a2-c1.research.json`, `src/lib/exam/names.js`, `registry.js` texts (`start-deutsch-1`, goethe sets), `saetze-index.json` (regenerated) |
| `exams-siele` | `pruefungen/testdaf/*`, `testdaf-formate.json`, `saetze/telc-*`, `paid/pruefungen/saetze/telc-c1-1.json`, `telc-formate.json`, SIELE part of `formate-a2-c1.research.json`, `registry.js` texts (`testdaf`, telc sets), new `src/pages/exams/dele-or-siele.astro` |
| `ccse` | `leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json`, `/life-in-the-uk` page texts (moved by `routes`), `registry.js` texts |
| `nationality-path` | `pruefungen/dtz/*`, `paid/pruefungen/dtz/*`, `src/lib/dtzTrainer.js` texts, new `src/pages/nationality.astro`, `registry.js` (`dtz`) texts |
| `extranjeria-sim` | `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/*` texts and rules |
| `dgt-vocab` | new `src/data/dgt/vocabulario.json`, new `src/pages/dgt-vocabulary.astro`, `scripts/check-berufe.mjs` / `src/lib/berufeCore.js` (read `dgt/`), `EXPERIMENTE.md` only if code is restored |
| `culture` | `kultur.json`, `uebersetzungen/kultur.json`, `kultur-insider.json`, `kultur-bilder.json`, `wusstest-du.json`, `kalender-saetze.json`, `zitate.json`, `uebersetzungen/zitate.json`, `/explore/films` data |
| `accents-languages` | `dialekte.json`, `dialekte-karte.json`, `dachMap.js`, `sprachen-welt.json`, `sprachen-karte.json`, their generator scripts, `dialekte.*` / `sprachen.*` keys in `en.json` |
| `games` | `artikel-sprint/*`, `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json`, `quakiSpringt/*`, `hochstapler/*`, `satzregen/*`, game string tables, `src/lib/artikelSprint/*`, `artikelPacks.js`, `spiele/domino.js` |
| `games-arcade` | `src/lib/nussnacht/*`, `src/lib/hoerSafari/*` |
| `games-dialogue` | `src/lib/knigge/*`, `src/lib/lindenau/*`, `uebersetzungen/lindenau.json`, `src/lib/spielKit.js` voice |
| `teachers` | `arbeitsblatt/*`, `partneruebungen/*`, `unterricht-wortschatz.json`, `lernstunde-texte.json`, `downloads.json`, `src/lib/stundenplan.js`, `src/lib/unterricht/einstieg.js`, printable games and class test pool |
| `word-stories` | `src/content/wortgeschichte/*`, `src/lib/wortgeschichteCore.js` (`entryLang`, `LANG_NAMES`) |
| `spanish-for-work` | `src/data/berufe/*`, `src/lib/berufeCore.js` |
| `business-spanish` | new `src/data/business-spanish/*`, new `src/pages/business-spanish/*`, `en.json` keys |
| `routes` | `src/lib/routes.js`, `astro.config.mjs` redirects, page folders/file names, `suche-seiten.json`, `entry-pages.json`, `catalog.js`, links |
| `cleanup` | §7, validators back in the gate, `pnpm check:base` clean |
| `ui-lang-de` / `-fr` / `-pt` / `-it` | `src/lib/languages.js`, `public/i18n/<code>.json`, `entry-pages.json`, entry pages |
| `deploy-readme` | `README.md` |

Files with UI strings only (`premium-features.json`, `produkte.json`, `downloads.json` titles)
are handled by the `ui-*` items where they are rendered.

---

## 12. Quality rules for every content run

1. Correct, natural **Castilian Spanish**; every example is something a speaker in Spain would
   actually say. English explanations clear and short.
2. Level discipline: example vocabulary at or below the topic's CEFR level, except the target
   structure.
3. Each grammar topic: one clear rule, the forms, 4–8 examples, the 2–3 most common learner
   mistakes, exercises with unambiguous answers (or listed alternatives). Where *vosotros* or
   Spain-only usage is the answer, add the `es419` item note.
4. Distractors are wrong for a reason a learner can understand.
5. Facts (culture, exams, Life in Spain) carry a source and an "as of" date; when unsure, leave
   the fact out or word it carefully and list it "to verify" in the report.
6. Fewer, correct items beat many.
7. No mixed English/Spanish items in the content a run touches; no German leftovers.
8. Build: `timeout 1500 pnpm build 2>&1 | tail -40` in the foreground; then `pnpm check:base`
   once it exists.

---

## 13. Open points

- **Edgar: review** the exam map (§2): SIELE in the TestDaF + telc slots, DELE A2 nationality
  mock in the DTZ slot, "Uso de la lengua" in the Sprachbausteine slot, DELE C2 without a set.
- **Edgar: review** the sector swap in Spanish for work (§5.12): `elektro-technik` → agriculture,
  `kita` → cleaning and domestic work.
- **Town name** *Villabruno* (§5.9) is a working name; `games-dialogue` checks it.
- **Führerschein restore**: only by Edgar, from icanspeak-english `db88ba4~1` (§4.4).
- **Frequency ranks**: `es_50k` licence and download (§1.4).
- **Audio**: every `audio` field points to files that don't exist until an es-ES TTS voice is
  wired (`BACKEND.speech`); validators that need the files stay off until then.
- **LatAm mode**: data carries `es419` from the start; showing it is a later item, not in this
  queue.
- **Arabic UI**: later, not in this queue (RTL ready).
- Gaps (§3): *voseo* note, *leísmo/laísmo* topic, impersonal *haber*.
- **Base path, how it is enforced** (`base-path-and-brand`, 2026-11-03): `src/lib/paths.js` is
  the helper. Browser code builds URLs with `withBase()`/`currentPath()`; server-rendered HTML
  keeps its root-absolute links in templates and data and is rebased centrally by
  `rebaseHtml()` (`src/middleware.js` in dev and while prerendering, again in
  `src/integrations/base-language.mjs` on `dist/`), checked by `pnpm check:base`. A click
  handler in `Layout.astro` rebases a stray root-absolute `<a href>` added by a script at run
  time. New data keeps writing site paths (`/grammar`), never `/spanish/…`.
- **Hub share cards** (`public/og/*.jpg`, `src/data/hub-bilder.json`): still German titles and
  the deutschacademy brand; switched off in `Layout.astro` (`HUB_CARDS = false`), every page
  shares `og-default.png`. The `ui-*` item that rewrites the hub titles reruns
  `pnpm hubs:build --force` and sets `HUB_CARDS = true`.
- **Logo** (done in `brand-theme`, 2026-11-03): the icanspeak.it kit in `public/logos/` is wired
  (favicons, apple-touch-icon, manifest app icons, JSON-LD logo = `-mark-1024.png`, the
  wordmark in every header and footer through `Wordmark.astro`). `public/assets/logo.png` and
  `og-default.png` are rasterised from the kit by `scripts/build-wordmark.mjs`. The old
  `iS` placeholders (`public/icon-*.png`, `favicon-16/32x32.png`) are no longer linked.
- **Brand theme decisions** (`brand-theme`, 2026-11-03; details in `docs/brand/BRAND.md` and
  the comments in `src/styles/global.css`): token names kept (`--brand-blue` is now the navy);
  `--accent` is a deeper amber (#946620) than the brand's #b3812e and `--muted` a darker
  #6b6152 than #7a6f60, both for AA; the brand amber is `--brand-amber` for marks without
  text. Mascot voice and label fonts fall back to Fraunces/Inter (no Fredoka, Albert Sans,
  Sora, Big Shoulders, Bungee Shade, arrow font). Every page except the home page (whose
  footer has it) ends in a slim "part of icanspeak.it" row (`Layout` prop `umbrella`).
  Open: `src/styles/font.css` and `newfont.css` (styles of the fork's font comparison pages,
  which this repo no longer has) name faces that are no longer loaded; dead CSS. Canvas games
  (lindenau, quaki-springt, nussnacht) still name Fredoka and fall back to system-ui.
- **Contact e-mail** `hello@englishacademy.com` (`src/lib/legal.js`, two strings in `en.json`):
  a legal fact, left unchanged; Edgar: set the real icanspeak address.
- **robots.txt and deploy**: crawlers only read `https://icanspeak.it/robots.txt` (umbrella
  site); `public/robots.txt` here is the template for the `/spanish` lines. `public/_headers`
  is a Cloudflare/Netlify file Vercel ignores; `deploy-readme` decides (vercel.json headers,
  and whether the Vercel project also rewrites `/spanish/*` → `/*` so its own domain works).
- **UI chrome decisions** (`ui-components`, 2026-11-03): component and nav chrome already
  names the Spanish exams by slot (goethe = DELE, testdaf = SIELE, telc = "SIELE by level",
  dtz = "DELE A2 for nationality", Life in the UK = "CCSE nationality test", `/a1-test` = DELE
  A1) and describes target modules ("el / la trainer", "Spanish for work"); each content item
  makes its line true. Hrefs stay on the old slots until `routes`, which should also point the
  `/progress` "Language use" row (LearnShell id `telc`) at `/dele/language-use`. The vocabulary
  trainer's `de` side is labelled "Spanish" (`vt.*`); `vocab-a1` revisits that if the `de` tab
  becomes a German translation. `HubBild` reads alt texts from `hub-bilder.json` (the manifest
  can't be regenerated without the original photos, which are not in the repo, so share cards
  stay off). `WortschatzDruck` part B follows the nouns' articles, but
  `src/lib/arbeitsblatt/wortschatz.js` still keeps only `a/an/some` nouns: `vocab-a1`/`teachers`
  must accept `el/la` there. `lid.fk.level.easy` is shared by quotes and CCSE facts, so
  `culture` gives ZitatCard its own key. Unused components with old text (`Footer`, `Hero`,
  `WhatYouDo`, `WhyUs`, `Testimonials`, `Classes`, `Team`, `Stats`, `ArtikelTrainerT1`,
  `ArtikelPanelT1`, `NavVergleich` per EXPERIMENTE.md) go in `cleanup`. **Edgar:** in which
  language are the legal texts binding (`legal.note.binding`, `widerruf.binding` still say
  German)?
- **Variety schema decisions** (`variety-schema`, 2026-11-03): `src/lib/variety.js` adds, next
  to the §1.5 names, `textFor(item, text)` (es419 `form` in LatAm mode), `skippedFor(item)`,
  `showsVosotros()` and `varietyProblems(obj)` (the shape rules, shared by every validator).
  `pnpm check:variety` (in `check:content`) checks the shape of every `variety`/`es419` key in
  any JSON under `src/data`, `src/content`, `src/paid`, and prints per-module coverage. Coverage
  units: lexicon words, own deck entries (`berufe`, `dgt`, `business-spanish`), `wortschatz`
  cards, `redemittel` phrases, each grammar topic file (top level), each `grammatik.json` quiz
  topic, each `praepositionen-trainer` pack, `verbtabellen.json` (top level),
  `conjugation-trainer` sets, `hoeren` texts, `aussprache-check`/`zungenbrecher` sentences,
  `satzmelodie` families + stress + rules, `ausspracheregeln` rules. `akkusativ.json` items
  inherit from their grammar topic (no own `variety`; `es419` allowed). A content item adds its
  module id to `STRICT` in `scripts/check-variety.mjs` in the commit that converts the module.
  `es419.gender` is rejected on non-nouns in lexicon/deck entries; `es419` on an `es-419` item is
  an error. A deck `ref` carries neither key (it inherits from the referenced word).
  `validate-lexicon.mjs` and `berufeCore.js` already accept `el`/`la`/`el/la`, `genus: "f"`
  (only with `gender: "el"`) and `fem` (adjectives only).
