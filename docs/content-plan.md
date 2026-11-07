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
| `einstufung.json` | top-level key | item with Spain-only wording (`form`) or *vosotros* only (`skip`) |
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
- Unit shape: `{ id, level, title, variety, reviewed, intro, introEasy, phrases: [{ use, es, en, register,
  variety, es419? }], models: [{ title, text, notes }], tips, words: [berufe deck entries or `{ ref, example, en?, deHint? }`],
  exercises: [{ id, context?, prompt, options, answer, explain, es419? }] }`. Spain conventions first; LatAm differences as
  `es419`. Rules: `src/lib/businessSpanish.js`, `scripts/check-business-spanish.mjs` (words: `check-berufe`).

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

Added by this item, next to the existing ids (§13 has why): reading `a1-phone-messages`,
`a2-padron-notice`; writing `a2-padron-form`, `a2-email-school`, `b1-email-landlord`,
`b1-email-employer`, `b2-opinion-text` (new type `opinion`).

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

As done (§13 has why): `redemittel-i18n` holds `de`, `fr`, `pt`, `it`; the other sidecars and the
inline `ar`/`uk`/`ru`/`tr` are gone. Stage 3 of `sprechen-b1b2.json` is a discussion in prompts
1, 3, 5, 6 and a role play in 2 and 4.

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
hablar*), Arabic (*aceite, almohada, azúcar, alcalde*; *ojalá, aldea* once the lexicon has them),
Germanic (*ropa, blanco*; *guerra, guardar* once the lexicon has them), Greek, American languages
(*chocolate, tomate, patata*), modern loans. First batch about
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
| a/an/some values left in `berufeCore.js` and the games (`ENGLISH_LEVELS` and the lexicon validator went with `vocab-c1-c2`) | no English level left | same |
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
- **Town name** *Villabruno* (§5.9) is settled (`games-dialogue`, 2026-11-06): a web search found no municipality of that name; the INE list itself was not checked.
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
- **Page text decisions** (`ui-pages-a-l`, 2026-11-03): pages a–l name the Spanish exams and
  describe the target module, while hrefs stay on the old slots until `routes`.
  `/cambridge/use-of-english` now links back to `/cambridge` (DELE, per §2); `/a1-test` and the
  DELE page link on to `/ielts` as "the SIELE page". The exam plan's `dtz` entry has level A2 and
  the plan's day uses Europe/Madrid. The CCSE facts table on `/life-in-the-uk/test` shows
  `meta.totalQuestions` / `meta.passScore` as bare figures (no fixed percent), so it still shows
  the UK's 24 / 18 until `ccse` sets `meta`. Its source link is `cervantes.org/es/examenes/ccse`
  (`examenes.cervantes.es` redirected to cervantes.org on 2026-11-03; items linking there should
  check). `/intonation` speaks with an es-ES voice. The pflegeplace.com boxes on the work pages are
  gone (a link carried over from the German course) and their `berufe.*` keys removed;
  `spanish-for-work` can drop `external` from `berufe/pflege.json`.
  **For `accents-languages`:** `/knowledge/languages` still has the German → English word decoder
  (`#decoder`, `sprachen.dec.*`, jump link), the maken/machen map labels and `deutsch` as the default
  comparison; `/knowledge/accents` has the bus/bath map labels. Replace or remove them (§5.14 doesn't
  mention them). **For `culture`:** the `kultur.*.cardIntro` values and the insider rule text are
  data and still about the UK. **For `exams-dele`:** `/exams/traps` task sources (`fallen.json`) still
  say ISE I; `registry.js` still titles the A1 test "A1 English practice test". **For `teachers`:**
  the official links on `/knowledge` (`downloads.json`, `wissen.link.*`) still point to Cambridge,
  IELTS, Trinity and GOV.UK. **Edgar:** `/about` describes your German teaching and says nothing
  about teaching Spanish; `home3.pricing.live` shows a date in the past (Fri 30 Oct).
- **Page text decisions, m–z** (`ui-pages-m-z`, 2026-11-03): `/trinity` is "SIELE by level" and
  `/trinity/ise-1` "DELE A2 for Spanish nationality", hrefs on the old slots until `routes`. The
  mock's "Solid B1 / Close to B1" bands now read "Well prepared / Getting close (our guide)"; the
  33 and 20 point figures stay ours. The `/trinity/ise-1/practice-set` facts table describes our
  mock only (its source is `cervantes.org/es/examenes/dele`). **For `nationality-path`:** check the
  `dtz.*` and `dtzSet.*` wording against the real DELE A2. `/trinity/ise-1/mock-test` calls the
  `lesen.json` tasks "level B1, a step above DELE A2", and `reading-writing` must keep them B1 or
  change that line. **For `exams-siele`:** `telc.format.source` and `telc-formate.json` still name
  Trinity, and `dtz.pt.*` part names are untouched. **For `grammar-a2`:** `/object-pronouns` now
  shows the Spanish rule and table (me, te, lo, la, nos, os, los, las, personal *a*, a one-line
  *le* note), while `akkusativ.json` is still English until that item runs. **For
  `grammar-structure`:** `praep.pack.*`, the `/reference` search index and `verben.group.trennbar.name`
  still say English prepositions and phrasal verbs; the `/reference` question for
  `/grammar/phrasal-verbs-list` already asks about reflexive verbs. **For `teachers`:** worksheet
  part B and domino label say el / la, but `src/lib/arbeitsblatt/wortschatz.js` still keeps only
  a/an/some nouns. **For `vocab-a1`:** `ab.lang.de` still says "In German", which fits if `hasDe`
  ends up meaning a German gloss. **For `pronunciation`:** the tongue-twister dialect take now says
  "¡Hola!"; `aussprache.bridge.lead` gives English and German examples. **For `speaking`,
  `reading-writing`, `vocab-*`:** the `sprechen.*`, `schreiben.*`, `lesen.*` task keys and `ws.set.*`
  are data translations and stay until those items run. **For the exam items:** `src/lib/exam/names.js` and `registry.js` (theirs per §11) still name Cambridge, Trinity, IELTS and Life in the UK, which shows on `/trinity/[slug]`, in the `/progress` no-script list and in `/exam-plan`. **Nav:** the drawer item `nav.merch` also still lands on `/account`. **Merch:** links are gone from `/mascots`,
  `/tongue-twisters`, `/teachers`, `/start` because `/merch` lands on `/account`; the home footer and
  `/knowledge/picture-dictionary` still link there (`cleanup` or Edgar). `/mascots` no longer points
  to a mascot switch, because no page offers one until accounts exist. **Due dates:** the class hint
  says Madrid time; `aufgabenStatus.js` still computes in Europe/Berlin, the same offset as mainland
  Spain. **`pnpm check:i18n-luecken`** still exits 1 overall (baseline not updated); no m–z file is
  over except the parser noise in `speaking/[id]`. `validate-i18n.mjs` crashes because it opens
  `public/i18n/de.json`, which doesn't exist until `ui-lang-de`.
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
- **Placement test decisions** (`placement-test`, 2026-11-04): §1.5 did not list `einstufung.json`;
  it now has a top-level `variety` and item-level `es419`, and is strict in `check-variety.mjs`.
  Each level has the plan's features plus one more to reach six: A1 *estar* next to *ser*, A2
  comparatives, B1 *cuando* + subjunctive, B2 unreal *si* in the past, C1 *ni que*. The perfecto
  item tests the participle (*escrito*), not *he ido / fui* for today, so it holds in both
  varieties. Neither `/placement-test` nor the `/step-by-step` quick check reads `es419` yet: a
  LatAm mode must apply `form` and `skip` in both. **For `beginner-path`:** the comment on
  `placementStart` in `src/lib/einfach-app.js` still names the English units the score skips, and
  its thresholds should be rechecked against the Spanish A1 set.
- **A1 grammar decisions** (`grammar-a1`, 2026-11-04): the 19 slots are Spanish; `konjugation`
  moved to level A1 while `imperativ` stays A1 until `grammar-b1`, so `/grammar` shows both until
  then. Answer check: `accentOnly()` in `answerMatch.js` drives "Check the accent." in fill, table,
  story and the typed Schreiben panel, which also has the á é í ó ú ü ñ ¿ ¡ key row. `ñ` does not
  count as an accent (*año/ano* is a plain wrong answer). `accepts` ignores case, so an exercise
  about capital letters must ask "capital or small?", never offer *lunes/Lunes* as pills.
  `aktivMode.js` now speaks es-ES. **For `grammar-a2`–`grammar-c1`:** when a topic that
  `einfach-pfad.json` references changes, the `gram:` refs break the build; run
  `node scripts/repoint-einfach-grammar.mjs <topics>` and commit the path with the topic. Add your
  slots to the `grammatik-a1` file list in `check-variety.mjs` (rename it when you do); `grammar-c1`
  makes `grammatik` strict. Update `grammatik.<slot>.intro` in `en.json` with each subtitle, or the
  old German-course text overwrites it at render time. **For `beginner-path`:** the repointed tasks
  are valid but only fit their unit's grammar theme: units are still English and the path's own
  hints on them are gone. Rewrite them and delete the script. **For `routes`:** links inside the
  topic text use today's slugs (`/word-order`, `/present-continuous`, `/was-were`, `/like-doing`,
  `/this-that`, `/prepositions-of-time` …), so they must move to the §3 slugs with the routes.
  **For `games`:** `ArtikelRegel.astro`'s intro text and `ENDINGS_CAPTION` are now English and
  match `artikel.json`; the trainer itself is still a/an/some. **For `grammar-structure`:**
  `grammatik-lehrplan.json` still has `konjugation` under A2, and `wortarten.json` (the chips on
  this topic's page) is still the English reference. **For `teachers`:** `arbeitsblatt/<slot>.json`
  files that exist for these 19 slots are still the English sheets. **For `conjugation-trainer`:** reuse `accentOnly` and the key
  row (`.ak-accent-keys`). **Other pages:** `lang="de"` remains on some UI code in `[id].astro`
  (`vp-brief`, euler panels); the `ak.write.*` keys and German fallbacks are untouched.
- **A2 grammar decisions** (`grammar-a2`, 2026-11-04): the 21 A2 slots are Spanish; `perfekt`,
  `zusammengesetzte-verben` and `n-deklination` are level A2 (the last two were B1). `check-variety`'s
  strict list is now `grammatik-done` (A1 + A2); `grammar-b1` onward add their slots to it. The
  `zimmer` room exercise moved from `wechselpraepositionen` to `lokale-praepositionen` (place words
  are that topic now); its tray labels are English in `src/lib/zimmerUebung.js` ("the bed") and the
  verb in its sentences is given, not a pill, because *pongo* and *cuelgo* both fit most things.
  `akkusativ.json` keeps its ids; `le` is never a wrong pill for a male person (leísmo is accepted
  in Spain). `grammatik.json` quiz topics `akkusativ`, `dativ`, `trennbare-verben` have `variety`;
  the other four stay English until their items run. **For `grammar-structure`:**
  `grammatik-lehrplan.json` and `GRAMMATIK_ORDER` still list `zusammengesetzte-verben` and
  `n-deklination` under B1, so the *indefinido* comes long after the *perfecto*; `searchIndex.js`
  still has German and English keywords for these slots. **For `beginner-path`:** 56 more tasks were
  repointed (`perfekt`, `n-deklination`, `trennbare-verben`, `dativ`, `modalverben`,
  `lokale-praepositionen`, `negation`, `konjunktiv2-hoeflich`) and the `a1-kleidung` claims and hints
  rewritten for *lo, la*, while its title is still "Say what you like". **For `routes`:** A2 topic
  text links today's slugs (`/past-simple`, `/present-perfect`, `/some-any`, `/negatives`,
  `/prepositions-of-movement`, `/prepositions-of-place`, `/pronouns-and-be`). **For `teachers`:**
  `arbeitsblatt/<slot>.json` for these slots are still English; `zimmerSzene.js` and `kuecheSzene.js`
  still belong to the `wechselpraepositionen` sheet. **For `grammar-b1`:** *perfecto vs indefinido*
  (`zustandspassiv`) can build on the short contrast exercise already in `zusammengesetzte-verben`.
- **B1 grammar decisions** (`grammar-b1`, 2026-11-04): the 27 B1 slots are Spanish; `imperativ` moved
  from A1 to B1, so A1 path units that repoint to it now ask a B1 structure until `beginner-path`
  rewrites them. `verben-praepositionen.json` keeps `id: "praepositionen"`, `slug` and `subtitleKey`;
  its intro is `vp.hero.subtitle`, and the quiz topic `praepositionen` follows it. All 27 slots are in
  `grammatik-done`; the quiz topics `passiv` and `konjunktiv2` stay English until `grammar-b2`.
  **`es419` scope:** Spanish institutions and procedures (*padrón, empadronarse, NIE, Extranjería,
  tarjeta sanitaria, AVE*) get no language note: they name things in Spain, and a LatAm mode would
  need other content, not another word. Stories and `sprechen` items carry no item-level `es419`
  (as in A1/A2), except the `zustandspassiv` story, which is skipped as a whole. **Build sentences:**
  `swapClauses` in `grammarWorkspace.js` only knows German conjunctions and a build uses every tile, so
  a Spanish sentence with a comma tile can't be accepted without it (*Llámame cuando llegues*); the
  hints ask for the clause order instead. For `grammar-b2`: `alt` is compared without case; extending
  `SUBORD`/`PRON` and an optional comma would be a small code fix if clause swaps should count.
  **For `grammar-b2`:** B1 mentions as "coming at B2": *si tuviera*, *no creo que venga*, *aunque* +
  subjunctive, relative clauses with subjunctive, tense shifts in reported speech. **For
  `grammar-structure`:** `imperativ` is still under A1 in `grammatik-lehrplan.json` and
  `GRAMMATIK_ORDER`; `searchIndex.js` keywords and the `catalog.js` emojis still fit the old topics
  (`zustandspassiv` 🔒, `passiv-b1` 🏗️). **For `routes`:** B1 topic text contains no internal links.
  **For `teachers`:** `arbeitsblatt/<slot>.json` for these slots are still English.
  **For `grammar-start-book`:** `grammatik-start/en.json` refers to `futur` and `konditionalsaetze`.
- **B2 grammar decisions** (`grammar-b2`, 2026-11-04): the 13 B2 slots are Spanish and in
  `grammatik-done`; the quiz topics `passiv` and `konjunktiv2` are Spanish too (all 7 quiz topics now
  have `variety`). **-ra and -se:** pills show only *-ra*, `answer` arrays also accept *-se*, except in
  the `modalsaetze` past table, which lists only some *hubiera/hubiese* mixes (tables are pills only, so
  this doesn't reach a learner). A *hubiera* result is accepted and never a wrong pill. **Overlapping
  items:** verbs of change, discourse markers and collocations are taught as tendencies; two right
  answers go into the array rather than being tested against each other (`hacer/sacar una foto` and
  `hacerse/volverse rico` are not tested). **Build sentences:** same comma-tile limit as B1 (no code
  change), so hints state the clause order; `alt` covers word order inside a clause only. Story pills are
  per gap, not single-use, so a story gap may accept several answers. **For `grammar-c1`:**
  `negationswoerter` points to *deber de* at C1; `modalsaetze` only introduces *si hubiera* and gives one
  mixed example, so `konjunktiv-1` carries the full forms; *de manera que* + subjunctive (purpose) has one
  line in `konsekutivsaetze`. Use the same -ra/-se rule. **For `grammar-structure`:** `searchIndex.js`
  keywords, `catalog.js` emojis and the `stundenplan.js` title patterns still fit the old B2 topics;
  `wissen.file.grammatik-b2.desc` in `en.json` still describes the English PDF. **For `routes`:** B2
  topic text contains no internal links; the slugs are still English (accidental *se* is at `/ever-words`,
  probability at `/negative-words`). **For `teachers`:** `arbeitsblatt/<slot>.json` for `konjunktiv2`,
  `passiv`, `relativsaetze-was-wo`, `zweiteilige-konnektoren`, `negationswoerter`, `irgend`,
  `fokuspartikeln`, `modalpartikeln`, `adjektive-mit-praepositionen`, `nomen-verb-verbindungen` are
  still English. **For `culture`:** `/grammar/quiz` on `passiv` still links to Culture with "More
  sentences like these" (`quiz.crosslink.passiv`, `kultur.link.passiv`); check that this still holds
  once the culture texts are Spanish.
- **C1 grammar decisions** (`grammar-c1`, 2026-11-04): the 11 C1 slots are Spanish; `grammatik` is
  strict in `check-variety.mjs` and the `grammatik-done` list is gone. The paid split stays: items in
  `src/paid/grammatik/`, titles, hints and counts in `src/data/grammatik/`. Paid files now carry a
  top-level `variety`, and `--split-grammar` keeps it. After the split, edit the paid file directly and
  keep `slots` right in the free file. `check-pillen` reads only `src/data/grammatik`, so it does not
  see C1 unless `PILLEN_DIR` points at a merged copy; worth building in if C1 keeps changing. **Topics
  still left out (§3 gaps):** *voseo*, *leísmo/laísmo*, impersonal *haber*. Same -ra/-se rule as B2.
  **For `routes`:** C1 topic text contains no internal links; the slugs are still English (conditions
  without *si* at `/inversion`, non-finite clauses at `/future-perfect`, sequence of tenses at
  `/distancing`). **For `grammar-structure`:** `searchIndex.js` keywords, `catalog.js` emojis and
  `stundenplan.js` patterns still fit the old C1 topics; `grammatik-verwandt.json` too. **For
  `teachers`:** `arbeitsblatt/<slot>.json` for C1 slots, where they exist, are still English. **For
  `exams-dele`:** these C1 topics are written as general C1 grammar; nothing here claims to match a DELE
  task.
- **Grammar structure decisions** (`grammar-structure`, 2026-11-04): the syllabus order is in
  `grammatik-lehrplan.json` and `GRAMMATIK_ORDER` (reason in the file's `note`); `wortarten` and
  `wortbildung-nomen` stay extra practice outside the run. `akkusativ` moved to A2. Reference rows are
  *yo presente · él indefinido · participio*; every yo form in `trennbare-verben.json` starts with `me`, which
  the live quiz relies on. `verben-mit-praepositionen.json`: the quiz blanks the section's preposition and offers
  the other sections, so a verb with two right prepositions must be listed under both (*hablar con/de,
  preocuparse de/por, enfadarse con/por*). Trainer packs got new topics in old slots: `b1-adjektive` = *por/para*,
  `b2-da-wo` = adjectives and nouns + prepositions; pack `level` is the level of the topic, so some B1 packs
  hold verbs first met at A2. `kursinhalte.json` exam lines name only exam + skill, with no tasks, timings or word
  counts, and start at A2.2. The lesson plan's fixed DW and Easy German video links became YouTube searches
  (`stundenplanLinks.js`). The new lines in `GRAMMAR_RULES` depend on the plan's wording, so reword both together.
  **For `routes`:** the `practice` links in `nachschlagen/*.json`, `wortarten.json` `learn`/`sub` hrefs, `MORE` in
  `prepositions.astro` and `examHref` in `stundenplan.js` (DELE → `/cambridge`, SIELE → `/trinity`) use today's slugs.
  `trennbare-verben` moves to `/grammar/reflexive-verbs-list` in `REF_SLUGS` and `ROUTE_RENAMES`, which also changes the
  worksheet URL `reference-phrasal-verbs-list`. **For `idioms-mistakes`:** `wortarten.json` `fehler` is empty on every class
  because the pairs were English; fill it with Spanish pair ids. **For `conjugation-data`:** `verben.group.trennbar.*` in
  `en.json` already says reflexive and pronominal; `verbTopic` in `arbeitsblatt/nachschlagen.js` and `verbGroups` in
  `liveQuiz/chapters.js` still have English prompts (*present simple*, *has*) and `regularPraes`. **For `vocab-*`:**
  `program.json` unit and module titles are lightly adapted only; `lernsetKeywords.js` still has English keywords
  (*phrasal verbs*). **For `teachers`:** the printed grammar PDFs (`generate:grammatik-pdf`) were not regenerated, so
  they may lag behind the `wissen.file.grammatik-*.desc` lines, which already describe Spanish; `stundenplan.js` activity
  texts were not reviewed here. **For Edgar:** 15 core topics are `entwurf` and so are left out of `/grammar/path`, among them
  *ser/estar* basics, adjective agreement, *gustar*, numbers and *ir a*; A1 has a gap until they are set to `geprueft`.
  **For `ui-lang-*`:** `check:grammatik-ui` (not part of the build) fails against its old baseline because the topics
  were rewritten; translate the instructions, then run it with `--update`.
- **Starter book decisions** (`grammar-start-book`, 2026-11-04): ten chapters in the old `k1`–`k10` slots: *ser/estar*,
  regular present, questions and negatives, nouns/articles/adjectives/*hay*, irregular present, *gustar*/reflexive/object
  pronouns, two-verb structures, *perfecto/indefinido*, *imperfecto*, B1 toolkit. *Por/para* and relative clauses stayed out
  for space. Top-level `variety` and `es419`, item `es419` on *vosotros* gaps and *perfecto* contrasts; `grammatik-start` is
  strict in `check-variety.mjs`. The printed book says *ustedes* and the LatAm *indefinido* in plain text, because a printed page
  has no LatAm mode. **`status: "skeleton"` is new:** `--skeleton` now writes it, such a file gets no PDF edition and no chapter
  titles on `/knowledge`, and the checker only names it. **The PDF is committed** (`public/downloads/grammatik-start.pdf`,
  `manifest.json`), the first file in that folder, because `/knowledge` hides a book without its file and the build doesn't run
  the generators. **For `routes`:** the chapter links are printed from `topicPath()`, so they show today's slugs (`/word-order`,
  `/like-doing`, `/used-to`). After changing `TOPIC_SLUGS`, rerun `pnpm generate:grammatik-start-pdf` and commit the PDF.
  **For `ui-lang-de`:** `grammatik-start/de.json` is a skeleton: translate it, set `status: "draft"`, run
  `node scripts/check-grammatik-start.mjs de`, generate the edition. `downloads.json` already lists `editions: ["de"]`; add the
  other languages when their file exists. **For `teachers` or `deploy-readme`:** the other books in `downloads.json`
  have no PDF in the repo, so they don't show on `/knowledge`; `check:downloads` reports them as missing.
- **Conjugation data decisions** (`conjugation-data`, 2026-11-04): 69 verbs in `verbtabellen.json`, in the six groups of §4.1. The
  generator is **`src/lib/verbtabellenCore.js`** (new, no Vite imports); `verbtabellen.js` adds the lexicon gloss and `visibleRows()`
  (drops *vosotros* through `showsVosotros()`). `pnpm check:verbtabellen` (in `check:content`) checks shape, golden forms, accent rules
  and agreement with `nachschlagen/starke-schwache-verben.json`, so a change to either file must keep both in step. `verbtabellen` is
  strict in `check-variety.mjs`. **Additions to §4.1:** verbs carry their own `en` and `level` (the lexicon is still English, and
  `lex` only adds help-language glosses once it has the lemma). A pronominal verb stores forms without the pronoun, takes the stored
  tenses of its plain verb when that verb is in the file (*irse*, *ponerse*), and stores `imp` only when written in full (*irse*).
  Beyond §4.1: *subj* is derived from a stored yo form, *subjImpf* from the indefinido, *cond* from a stored `fut`. **Highlighting** compares with the bare
  pattern, so spelling changes (*busqué*, *leíste*) count as highlighted though the verbs are `regular: true`. `–` marks a form not in use: *haber*
  and *soler* have no imperative, *soler* no future or conditional; such verbs have `defective: true` and aren't asked in the indefinido on the
  worksheet or in the quiz. *soler* keeps its rare *solió* and compound forms, with a note. **Page:** presente, indefinido and perfecto stay visible;
  every other tense sits in a closed `<details>` per card, and closed ones don't print. *Regular* now comes first in `groups`, and `oler` is
  filed under stem-changing. **Search:** every simple form finds its verb (*haga*, *tuviera*); `SiteSearch` no longer matches on the
  small words inside a longer form (*me, no, he*). **For `conjugation-trainer`:** import `buildAll`, `PERSONS`, `ROW_TENSES` from the core; each row
  has `{ f, x, alt? }` per tense (`alt` = the *-se* form); filter `–` and use `v.defective`. **For `vocab-*`:** when the lexicon has the Spanish
  verbs, `lex` starts to fill by itself; the table's `level` wins over the lexicon's, so keep the two in step. **For `routes`:** the page's practice
  buttons use `topicPath()`; the *reflexive verbs* link still points at `/grammar/phrasal-verbs-list`. **For `ui-lang-*`:** new keys are
  `verben.when.*`, `verben.mood.*`, `verben.allTenses`, `verben.ger`, `verben.p2`, `verben.group.stem-change.*`. The tandem sheet's phrases
  (`arbeitsblatt/verbtabellen.json`) are Spanish on purpose.
- **Conjugation trainer decisions** (`conjugation-trainer`, 2026-11-04): page `/grammar/conjugation`, topic key `conjugation`, history
  `da-conj-verlauf-v1`. **Additions to §4.2:** `conjugation-trainer.json` is `{ variety, es419, drills: { tenses, groups, notDrilled, limits, presets },
  topicLinks, sets }`; a set also has `lead`, `rule: { text, table? }` and optional `more`. Besides the planned sets there are three typed `form` sets for
  irregulars (`irregular-yo-a1`, `indefinido-irregular-a2`, `futuro-condicional-b1`) and `imperativo-b1`. The plan's five verb groups became seven drill
  groups (regular split into *-ar, -er, -ir*; `stem`, `yo`, `irregular`, `reflexive`), an explicit list per verb, not the `group` of `verbtabellen.json`, which
  mixes them. *enviar, construir, reír* count as stem-changing (the stem changes under stress); *escribir, abrir, romper* as regular with an irregular
  participle. **Left out of drills:** *gustar* whole (*yo gusto* teaches the wrong habit); `limits` drops correct forms nobody needs (imperative of *poder, querer,
  deber, saber, morir, caber, valer, oler, llamarse*; *haber* and *soler* to their real tenses). New file `src/lib/conjugationTyped.js`: `mountPracticeWorkspace`
  has no typed answers, so a small typed card sits beside it with the same classes and hooks; the shared engine stays unchanged. Drills start typed on a wide screen and on
  pills at ≤720 px; the learner's choice is remembered. A typed *-se* form counts as right; a reflexive form without its pronoun gets its own hint. Deep links:
  `?drill=<preset>`, `?set=<id>`, `?niveau=<level>`. `pnpm check:conjugation` (in `check:content`) checks the sets and generates **every** drilled question.
  `conjugation-trainer` is strict in `check-variety.mjs`. **For `routes`:** `src/pages/[id].astro` links 18 verb topics through `topicLinks` (keyed by topic id, so slugs may
  move); `grammar/verbs#gruppe-unregelmaessig` in a set's `more` follows the verb page's anchor; `/prepositions` links `?set=por-para-b1`, the set links back
  `/prepositions?niveau=B1`. **For `ui-lang-*`:** new keys are `conj.*`, `tool.konjugation.title`, `intro.conj*`, `grammatik.cj.*`; rule texts stay English like the
  rule boxes on the verb tables (`lang="en"`), and the hand-written `explain` lines aren't translated, as in `/prepositions`. **For `vocab-*`:** the drill's gloss is `en` from
  `verbtabellen.json`, not the lexicon. **For a LatAm mode:** `showsVosotros()` already drops the switch and the forms; `skip` items are filtered in `setQuestions`.
- **Beginner path decisions** (`beginner-path`, 2026-11-04): `einfach-pfad.json` is Spanish A1–B1, 35 units, 224 tasks, in lehrplan
  order except that *ser/estar* comes before the plural + adjective unit. All 28 old ids stay; seven new units have English ids (`a1-who-where`,
  `a1-describe`, `a1-why`, `a2-routine`, `a2-today`, `a2-before`, `a2-objects`). Only `luecke` and `satz` for now, because the lexicon, phrases,
  listening and pronunciation sources aren't Spanish yet. The path needed greetings and the padrón appointment and no A1 item had them, so
  `personalpronomen` (exercises 6, 7) and `temporale-praepositionen` (7, 8) each got two appended exercises; append only, never insert, in
  topics the path uses. Postcard facts are simple English (explanation language), all `source: "neu"`. `placementStart` now jumps to `a1-cafe` (5–6
  right) and `a1-who-where` (3–4 right). `scripts/repoint-einfach-grammar.mjs` is deleted: from now on, when a topic changes and a ref breaks,
  look at the item, fix the task by hand and re-sign with `node scripts/check-einfach-pfad.mjs --sign`. **For `beginner-path-ui`:** the resolver
  doesn't read an item's `choices` or `why`, so the path writes `options` and `why` on the task. It also ignores a build item's `alt`, and an inner
  comma in a build sentence ends up after the last word, so the path avoids those sentences. A table term with `___` shows the gap twice, also
  avoided. A `· ` term must be `person · verb`; `verb · person` reads badly. `ARTICLE_PLACEHOLDERS` still lists *a / an*, so *el / la* rows show as
  `mesa → ___`: switching it gives them the article screen, and `articleHint` and the `wort` plural (`two …`) need Spanish too. **For a LatAm
  mode:** no path task uses a `skip` item; three use `es419.form` (`personalpronomen/0/5`, `aduso/0/1`, `konjunktiv2-hoeflich/1/2`), which the resolver must apply.
  **For `vocab-a1`–`vocab-b1`, `speaking`, `listening`, `pronunciation`:** add `wort`/`artikel`, `redemittel` (greetings in `a1-vorstellen`, the
  padrón in `a1-amt`), `hoeren` and `sprechen` tasks to the units, keeping 5–7 per unit. **For `routes`:** a unit's `grammar` is a slot id and
  reaches the page through the slot's redirect (`/personalpronomen` → current slug), so those redirects must stay or `einfach-view.js` must link by slug.
- **Beginner path screens decisions** (`beginner-path-ui`, 2026-11-04): Bruno's reactions are simple Spanish with the English on tap (an `EN` tag marks them); the first hello, hints and
  verdicts stay English, because a beginner must understand them. Article rows (`el / la`, `el / la / los / las`, `un / una`, `un / una / unos / unas`) now show the article screen and count
  toward their own topic. The resolver reads an item's `choices` and `why`, accepts `alt` build orders (case and commas ignored; 100 items have one) and keeps inner commas on their word.
  `wort` cards show `los/las` + plural, also for invariable nouns (*los lunes*); `pluralOnly` shows only *las gafas*; an `artikel` task rejects `el/la` and plural-only nouns. The page resolves
  the a1, a2 and b1 lexicons. The link at the end of a unit now uses `topicPath()`, so **`routes`** no longer has to keep slot redirects for this page. `?fixtures` is Spanish.
  **For `ui-lang-*`:** every string in `einfach-view.js` is hard-coded English outside `en.json`, as it was in the English course, so `/step-by-step` won't translate until those strings move
  to i18n keys. Bruno's `help` is English too. **For `vocab-a1`:** an `artikel` or `wort` task needs the Spanish `gender`; keep `plural` without its article. **For a LatAm mode:** still to do in the
  resolver and the quick check: `es419.form` and `skip`.
- **A1 vocabulary decisions** (`vocab-a1`, 2026-11-04): `a1.json` is Spanish: same 26 units and titles, 25 words each, `rank: null` (the run had no network, so `es_50k` wasn't downloaded;
  `haeufigste-woerter.json` still holds the old German list and is regenerated with the scripts, which now read `es_50k`). **Tool:** `scripts/lexicon-import.mjs` + `scripts/es-ipa.mjs` turn a compact
  source (format in the script's header) into the level file, the `de`/`fr`/`pt`/`it` sidecars and `wort-bilder.json`, and write the old → new id map. **`vocab-a2`…:** use it; it adds `-es` on a clash with another level, and a Spanish id may clash with a later level until that level has run. Add your level's file to a `lexicon-<level>` strict module in `check-variety.mjs` as A1 did.
  **Grammar conventions added to §1.4:** person nouns with a separate feminine (*el médico / la médica*) keep the masculine lemma and name the feminine in `en`; `el/la` only for true common gender. Spelling-only changes (*coger/cojo, leer/leyó*) aren't `irregular`, matching `regular` in `verbtabellen.json`. Fourteen verbs moved to `level: A1` in `verbtabellen.json` to stay in step. `mayor`/`menor` stay as the comparatives of *grande*/*pequeño*
  as §1.4 says, but they mean older/younger: the gloss says so, and for size learners use *más grande*. `pos` of a noun phrase stays `noun` (*cita previa*); a set phrase is `phrase` (*hacer la maleta*). **Sidecars:** Spanish → language, machine draft; `pt` is European Portuguese. `de` shows as the “German” tab (`vt.lang.de`); `woerter-uk.json` is emptied (`uk: {}`): nothing there fits Spanish. `es` isn't in `TRANSLATION_LANGS` (only `en` is registered) and `es.json` was already empty.
  **Paused validators:** a `berufe` ref to a gone lexicon id and a word-story lemma/family/formsAlso outside the lexicon are warnings, not errors; **`spanish-for-work`** and **`word-stories`** must turn them back into errors. Berufe decks lost their A1 refs for now (`liveDeck` drops them; 93 warnings). **For `games`:** `ArtikelTrainer`/`T1` filter out `el`/`la` nouns until the trainer is el/la, so its A1 pool is empty; `artikelSprint/lexWords.js` likewise; `hochstapler/themen.json` A1 was re-keyed by the id map only, so pick real Spanish themes. `ArtikelDiktat` and `artikelDiktat.js` still say der/die/das. **For `games-arcade`:** Nut night has no A1 words until `ARTS` is el/la. **For `teachers`:** `unterricht-wortschatz.json` still lists English words, and worksheets part B now takes el/la. **For `word-stories`:** `formsOf()` and `entryLang()` already handle Spanish rows. **For `speaking`:** the path's greetings and padrón tasks in `a1-vorstellen`, `a1-amt` are still open (nine other A1 units got a `wort` or `artikel` task; `a1-vorstellen`, `a1-amt` are full at 7). **`check-einfach-pfad`** no longer needs a file for `wort` audio, because the word card has no play button.
- **A2 vocabulary decisions** (`vocab-a2`, 2026-11-04): `a2.json` is Spanish: same 28 units, 25 words each, `rank: null` as in A1 (no `es_50k` yet). Titles follow `program.json`: `a2-07` “At the pharmacy: medicine”, `a2-13` “Post office & official tasks (Correos)”, `a2-27` **“Reflexive & pronominal verbs”** (phrasal verbs don't exist in Spanish; `grammar-structure` had already named it); `ws.set.*` follow. The “Useful phrases” unit stays `a2-28`, `pos: phrase`, written with the *tú* form (tú/usted isn't a regional difference, so it gets no `es419` note).
  **Homographs:** the plain slug stays on the lower level; A2 uses `carta-menu`, `sobre-noun`, `paciente-adj`, `seguro-adj` (noun *el seguro* keeps `seguro`), `parte-noun`, `salud-brindis`. `-es` ids where an English word of a later level still holds the slug: `revision-es`, `tension-es`, `curriculum-es`, `tie-es`, `aficionado-es`, `carton-es`; they stay, because ids are progress keys. **Verb tables:** `irse` (A1) and `oler` (B1) moved to `level: A2`, in step with the lexicon. Accent-shift verbs (*graduarse, esquiar, reenviar*) are `irregular`, like *enviar* in the tables. The word-import tool no longer writes `…` into IPA. `lexicon-a2` is strict in `check-variety.mjs`. Seven A2 path units with six tasks got one `wort`/`artikel` task; the other five are full at 7.
  **For `games`:** the A2 pool of `ArtikelTrainer`, `artikelSprint/lexWords.js` (Bruno Kart) and `spiele/domino.js` is empty now, as A1's was: all still filter on a/an/some. Impostor A2 themes are hand-picked on Spanish ids. **For `games-arcade`:** Nut night and Listening safari lose A2 until `ARTS` and `w.g` are el/la (A1 and A2 empty, B1 still English). **For `spanish-for-work`:** the old A2 refs in `berufe/*` are gone like A1's (warnings, decks shorter); the replacement words are in `a2-09`, `a2-10`, `a2-03`, `a2-05`, `a2-19`. **For `word-stories`:** more lemmas have left. **For `culture`:** `wusstest-du.json` `a2-*` entries are still about English. **For `dgt-vocab`:** `a2-19` has the everyday car words (*carné de conducir, rotonda, ITV, paso de peatones*); reuse them by ref. **For `spanish-for-work` and `life-in-spain` items:** A2 adds *SEPE, vida laboral, permiso de trabajo, permiso de residencia, TIE, oficina de extranjería, gestoría, Seguridad Social, hoja de reclamaciones*, glossed as orientation only.
- **B1 vocabulary decisions** (`vocab-b1`, 2026-11-04): `b1.json` is Spanish: same 46 units and titles, 25 words each (1150), `rank: null`, 77 `es419` notes, `lexicon-b1` strict in `check-variety.mjs`. UK-only topics became Spain's: *Hacienda, IBI, IVA, Bizum, ingreso mínimo vital, ESO, bachillerato, selectividad, concertado, AMPA, Guardia Civil, Policía Nacional, comunidad autónoma, libro de familia, arraigo, regularización, cuesta de enero, DANA, calima*.
  **Homographs:** `grado-universidad`, `ensayo-teatro`, `demanda-mercado`, `sierra-montes`, `fuente-informacion`, `nota-examen`, `publico-adj`, `casero-adj`, `portero-futbol`. Inside B1 the plain id is on *ensayo* (essay), *demanda* (lawsuit), *sierra* (the tool, it keeps the saw picture) and *fuente* (fountain). `-es` ids, because English words of later levels hold the slug: `master-es`, `tribunal-es`, `culpable-es`, `nostalgia-es`; they stay.
  **Conventions:** *la jueza* counts as a separate feminine, so `juez` is `el` with the feminine in `en`. *Puntos* (stitches) and the plan's plural lemmas (*emisiones, recursos, ingresos, tasas de matrícula, pruebas, esposas*) are `pluralOnly`. *AMPA* is `el`, `genus: "f"`, like *el aula*. `criar`: the indefinido is written *crio*, following RAE. **Verb tables:** `seguir` moved to `level: B1`, in step with the lexicon (its first appearance); `morir`, `construir`, `caber`, `soler` are now in the lexicon, as the tables' B1 says. `soler` lists *solió, solido* for the `forms` schema though they are rare; its gloss points to *suelo, solía*. **Card gap:** a verb example needs the lemma or yo stem plus at most 3 letters or an exact listed form (*ensaya* yes, *ensayamos* no), and person nouns stay masculine in examples, or the card can't blank them. Five B1 path units with six tasks got one `wort`/`artikel` task; the other three are full at 7.
  **For `vocab-b2`, `vocab-c1-c2`:** before writing, slug-check your lemmas against A1–B1: `lexicon-import.mjs` silently adds `-es` on a clash, and the first field of a source line must be an old id or `-`: anything else is taken as an old id and can carry the wrong picture. Re-importing doesn't restore pictures whose old ids were already removed. **For `games`:** the B1 pools of `ArtikelTrainer`, `artikelSprint/lexWords.js` and `spiele/domino.js` are empty too, as A1's and A2's are: the trainer and the domino only have English nouns left at B2 and above, and `lexWords.js` (A1–B1) has none. **For `games-arcade`:** Nut night (`LEVELS` A1, A2, B1) now has **no words at any level**, and Listening safari keeps only B2 words (behind its B1 button), until `ARTS` and `w.g` are el/la. **For `spanish-for-work`:** old B1 refs in `berufe/*` are gone like A1's and A2's (warnings, shorter decks); replacements are in `b1-01`, `b1-32`, `b1-43`, `b1-33`. **For `word-stories`:** more lemmas have left. **For `culture`:** `wusstest-du.json` `b1-*` entries (46) are still about English. **For `dgt-vocab`:** `b1-08` and `b1-38` have the road words (*arcén, claxon, intermitente, carné por puntos, alcoholemia, ceda el paso, peaje*); reuse them by ref. **For `life-in-spain`:** B1 adds *empadronamiento, certificado de empadronamiento, apostilla, traducción jurada, antecedentes penales, compulsar, arraigo, regularización, ingreso mínimo vital, sede electrónica, certificado digital*, all glossed as orientation only.
- **B2 vocabulary decisions** (`vocab-b2`, 2026-11-05): `b2.json` is Spanish: same 60 units and titles, 25 words each (1500), `rank: null`, 33 `es419` notes, `lexicon-b2` strict in `check-variety.mjs`. No unit title was UK-only, so `ws.set.b2-*` stay. UK topics became Spain's: *Congreso de los Diputados, moción de censura, real decreto, ERTE, ERE, contrato fijo discontinuo, falso autónomo, cuota de autónomos, recurso de alzada, silencio administrativo, Defensor del Pueblo, OMIC, nota simple, arras, derrama, impuesto de transmisiones, turno de oficio, oposiciones, nota de corte, colegio mayor, Cercanías, España vaciada, dehesa, tarjeta azul, reagrupación familiar, homologación*, all glossed as orientation only.
  **Ids:** no `-es` ids and no homograph ids: lemmas that clashed with A1–B1 or with C1–C2 were replaced before writing, so a few topic words are multi-word or sit next to a B1 word (*alto cargo*, *plano de planta*, *fondo documental*, *punto del orden del día*). `secuelas` (plural-only, aftermath, `b2-32`) and `secuela` (film sequel, `b2-39`) are separate words. **Conventions:** a verb's `+prep` follows `!irr` in the source format (`absuelvo,absolvió,absuelto!irr+de`); `-zco`, `-uir` and accent-shift verbs are `irregular`, as at the lower levels. `PIB` keeps the IPA `piβ`, because Spain reads it as a word. `es-ipa.mjs` wrongly makes hiatus of *üí* (*lingüístico*) and joins *ti* + *hi* (*antihigiénico*): those three B2 words carry an `ipa=` override, and **`vocab-c1-c2`** should check the same patterns. Seven pictures moved to their Spanish words with `img=` (*trofeo, castillo, pulmón, hilo, vacunación, papeleta, parque nacional*). No B2 verb is in `verbtabellen.json`, so no table level moved.
  **For `vocab-c1-c2`:** `denunciar` is taken at B1, so `banear` took the place of flagging a post in `b2-58`; don't reuse `banear`. **For `games`:** `ArtikelTrainer` and `spiele/domino.js` (`artikel` type), which offer A1–B2, now have no noun at any level: the last English nouns they could reach were B2's. **For `games-arcade`:** Listening safari's page data now holds **0 words** at every level (its filter is `a`/`an`), joining Nut night. **For `spanish-for-work`:** old B2 refs in `berufe/*` are gone like the lower levels' (373 warnings, shorter decks); replacements are in `b2-01`, `b2-21`, `b2-30`, `b2-53`. **For `word-stories`:** more lemmas have left. **For `culture`:** `wusstest-du.json` `b2-*` entries are still about English and UK usage, and they print beside the Spanish B2 word sheets. **For `dgt-vocab`:** `b2-19` has *mediana, paso elevado, vía de servicio, carril de incorporación, zona de bajas emisiones, autovía*; reuse them by ref. **For `life-in-spain` items and `nationality-path`:** `b2-13`, `b2-20`, `b2-35` have the asylum, procedure and recognition words. **For `teachers` and `cleanup`:** `data/lernsets/lernsets.b2.json` is an old snapshot; one inline script comment on every built page still names the old brand (`Sentry DEUTSCHACADEMY-WEB-A`), invisible to visitors but in the page source.
- **C1/C2 vocabulary decisions** (`vocab-c1-c2`, 2026-11-05): `c1.json` and `c2.json` are Spanish: same 24 + 16 units, 25 words each (600 + 400), `rank: null`, 23 `es419` notes, `lexicon-c1` and `lexicon-c2` strict in `check-variety.mjs`. All six levels are Spanish now. **Titles:** three were about English and changed, with `ws.set.*`: `c1-06` “Verb expressions for discussion & work” (*poner de manifiesto, dar luz verde*: `pos: phrase`, because Spanish has no phrasal verbs), `c2-04` “Loanwords in Spanish”, `c2-06` “Informal Spanish (Spain)”. The other 37 stay. `c1-10`'s icon is 💶 instead of 💷; the search words for `c1-06`, `c2-04` and `c2-06` follow.
  **Ids:** no `-es` ids and no homograph ids: about 210 lemmas first planned were already taken at A1–B2 and were replaced before writing, so some topic words are less central than the English unit's (B2 had taken many core words of law, tech, media). Before importing, the two levels were emptied and their old ids taken out of the sidecars, because `lexicon-import.mjs` otherwise gives a Spanish word `-es` when the other level's English word holds the slug. **Conventions:** RAE forms for loanwords (*statu quo, motu proprio, espóiler, hándicap, esnob*; plurals *oxímoros, hipérbatos, superávits*), foreign-looking ones with an `ipa=` override. *opa* stays lowercase as the RAE writes it, *BOE* in capitals. `suscribir` and `prescribir` are `irregular` for their participles; `delinquir`, `titulizar` and other spelling-only verbs aren't. `escabullirse` isn't flagged (the *ll* absorbs the *i*). `es-ipa.mjs` wrongly joins vowels across a silent *h* in *quebrantahuesos*, *nihilismo*, *nihilista*: those carry a corrected `ipa`; the generator is unchanged.
  **Code:** `ENGLISH_LEVELS` is gone from `lexicon.js`, `berufeRows.js` (a ref now resolves if the lexicon has the id), `wortgeschichteCore.js` and `check-erklaerungen.mjs`; `validate-lexicon.mjs` `GENDERS` is only `el`, `la`, `el/la`. The §7 row for `cleanup` is done as far as the lexicon goes; **still on a/an/some, for their own items:** `ArtikelTrainer`, `artikelSprint`, `hoerSafari`, `nussnacht`, `spiele/domino.js` (`games`, `games-arcade`), `berufeCore.js` `GENDERS` and `berufeRows.js` `ownRow` (`spanish-for-work`).
  **For `games`, `games-arcade`:** the live quiz, the search and `/teachers/cards` now draw C1/C2 from Spanish rows; no game had a C1/C2 pool on a/an/some worth keeping. `quakiSpringt/fragen.json` still has English `qs-c1-*` and `qs-c2-*` questions. **For `spanish-for-work`:** any old C1/C2 refs in `berufe/*` are gone like the lower levels' (warnings, shorter decks); replacements are in `c1-09`, `c1-11`. **For `word-stories`:** the last English lemmas have left the lexicon, and `formsOf()` has no English branch any more. **For `culture`:** `wusstest-du.json` has no C1/C2 entries, so a C1/C2 sheet prints no leftover English fact. **For `dele`/exam items:** `c1-03` (connectors) and `c2-07` (legal formulas) suit C1/C2 task preparation. **For `life-in-spain` items:** `c1-11`, `c1-12` and `c2-07` add *excedencia, despido improcedente, indemnización por despido, comité de empresa, BOE, decreto ley, tutela judicial, usufructo, albacea, medida cautelar*, as orientation only. **For `cleanup`:** `synonyme.json` is still English groups, including C1/C2-era words (*nevertheless, substantial*) that no longer exist in the lexicon; `data/lernsets/lernsets.c1.json`, `lernsets.c2.json` and `lernsets.words.csv` are old English snapshots. `program.json` marks C1/C2 as `planned` with target counts of 2300 and 1500 and module titles with no units behind them, as for B1 and B2; the lexicon has 600 and 400.
- **Listening decisions** (`listening`, 2026-11-05): `hoeren.json` is Spanish: same 16 ids, types and script shape, 69 questions, `variety` on every text, 14 `es419` notes (`a1-anruf-arzt`, `b2-interview-anerkennung` have none), `hoeren` strict in `check-variety.mjs`. **Question language, not covered above:** prompts and options are English at A1–A2 (the check is about listening, not reading the question) and Spanish at B1–B2 (as exams do); `explain`, `title`, `blurb` and `es419.note` stay English. Scripts use *vosotros* and the *perfecto* for today where Spain would, and `es419` carries no `form` (a text has no single replacement). Invented places: Valdelora, Montealbar; invented firms: Envíos Albar, Seguros Albar, Radio Valdelora; big real cities appear only as destinations and in the weather. `seconds` are estimates from word count until a manifest exists. Four item slugs followed the new titles (`a1-health-centre-voicemail`, `a2-town-hall-appointment`, `b1-tutor-meeting`, `b2-degree-recognition-interview`), and the 16 listening rows of `suche-seiten.json` were updated by hand, since its generator needs a dev server.
  **For the audio render (no item yet):** `voices.*.azure` are es-ES names, to check against Microsoft's current list; every ElevenLabs `id` is now empty because the old ones were British voices. `scripts/generate-hoeren-audio.mjs` and `pnpm generate:hoeren`, named in code comments, are not in this repo, and `public/audio/hoeren/` does not exist. Listen for *briks* and the digit strings. **For `beginner-path` follow-ups:** the hand-off asking for `hoeren` tasks in the units is still open, because `check-einfach-pfad.mjs` rejects a task whose clip is not on disk; add them after the render, signing refs with `--sign`. Good first candidates: `a1-supermarkt` (`a1-einkaufen`), `a1-anruf-arzt` (`a1-arzt`), `a2-amt-termin` (`a1-amt` is A1, so use it in an A2 unit). **For `reading-writing`:** consider the same question-language rule, so skills match. **For `life-in-spain`:** `b1-krankmeldung`, `a2-amt-termin`, `b2-interview-anerkennung` touch the baja, the padrón and homologación as story detail; keep your wording consistent with theirs. **`uebersetzungen/hoeren.json`** stays empty as §5.3 says, so the transcript has no help bar until translations are written.
- **Reading and writing decisions** (`reading-writing`, 2026-11-05): `lesen.json`, `fertigkeiten/lesen.json` and `fertigkeiten/schreiben.json` are Spanish, set in Valdelora. Same ids and shape, plus seven new entries where §5.4 asks for situations the old ids didn't hold (school, landlord, employer, opinion text) or the padrón matters too much to leave out: reading `a1-phone-messages`, `a2-padron-notice`; writing `a2-padron-form`, `a2-email-school`, `b1-email-landlord`, `b1-email-employer`, `b2-opinion-text`, with the new type `opinion`. **Language:** same rule as listening: questions, `situation` and `points` are English at A1–A2 and Spanish at B1–B2; `title`, `blurb`, `explain`, `check` and `tips` are English; form labels, `phrases`, `source` and `model` are Spanish at every level, because a form in Spain is in Spanish. Word limits are written “(30–40 words)” or “(80–100 palabras)”, and `wordRange()` reads both. **Shape:** one new optional key, `writingPrompt.model`, because the B1 email was the only prompt without a model text. The B1 email asks for 70–90 words, not 60–80, because five points don't fit in 60; `lesen.wordCount.goal` and the `/reading-writing` counter follow. The group label “Learning as an adult” is now “Neighbourhood life”. The B1 set stays B1, so the `/trinity/ise-1/mock-test` line “level B1, a step above DELE A2” holds. **Error hunt:** still no answer key, as designed; its checklist now names the 20 mistakes' categories, and the full key is in the run report.
  **LanguageTool:** `BACKEND.languageTool` (new, `false`) gates the call, in `es`. Before this item the button called the public API whatever the flags said. With it off, “Correct my text” runs only the own rules and says they are basic checks, and `schreiben.privacy` says nothing is sent. **`src/lib/routes.js`:** never map an id to itself in `ITEM_SLUGS`: the redirect it generates replaced the page. `astro.config.mjs` now skips that case; leave an unmapped id out instead, since `itemSlug()` falls back to the id.
  **For `ccse`/`nationality-path`:** `dtz.fmt.ads.*`, `dtz.fmt.tf.what`, `dtz.pt.*` and `format.t.*` still say “adverts”; the mock's task 1 is now notices and adverts. **For `extranjeria-sim`:** `a2-padron-notice` and `a2-padron-form` are an invented town's version of the padrón; keep the wording consistent with them and with `a2-amt-termin`. **For `business-spanish`:** `b1-email-employer` and `b1-email-landlord` are the everyday versions; don't repeat them. **For `cleanup` or Edgar:** `/privacy` and `/terms` still describe the LanguageTool check as active (legal pages, left unchanged under rule 5), and they are wrong while the flag is off. `T.uk`, `T.ar`, `T.tr` in `schreibKorrektur.js` have no `ownOnly`/`noneOwn` and fall back to English. **Open:** quiz prompts at B1–B2 are Spanish but carry no `lang="es"`, because `quiz.js` renders them next to UI text (same for listening).
- **Speaking decisions** (`speaking`, 2026-11-05): `sprechen.json`, `sprechen-b1b2.json`, `fertigkeiten/sprechen.json` and `redemittel.json` are Spanish, with the same ids, indexes, set ids and phrase order. **Language:** same rule as listening and reading: `prompt`, `bullets`, `beschreibung`, `persoenlich`, topic cards are English at A1–A2 and Spanish at B1–B2; `title`, `blurb`, `check`, stage labels and hints are English; `phrases` and `model` are Spanish at every level. `sprechen.json` follows the level of the task that borrows it: pictures 0 and 1 (A2) English, picture 2 (B1) Spanish. `resolveSprechen` picks its wrapper sentence by level; `cardPoint` now strips *y*, and a topic card ends in “Explica:”. **Photos:** four photos in `sprechen-b1b2.json` didn't show what their questions asked about (an empty meeting room under “Building homes”, hands and documents under “Life on screen”), so their questions and titles now describe the real photo. Prompt 4's talk changes from “an app” to “a procedure at an office”, and its stage 3 to a rental role play. The same check on `fertigkeiten/sprechen.json` and `sprechen.json` corrected models and `imageNeeded`: `dtz-bus.jpg` shows a tram (title, slug `a2-picture-tram`), the “woman” on the swing is a teenage girl, and there is no name badge in the nursery photo. `b1-bild-buergeramt` shows staff in scrubs, so the model says it may be a medical reception and moves to the town hall as an example. **Exam lines:** each says “in the style of …” and “Not an official exam task”; DELE has no paired part as far as this run knows, so `b2-planen-abschiedsfeier` is described as a role play done with a partner. The note on `/speaking-b1-b2` says the site isn't affiliated. **`redemittel`:** `en` is now a real translation plus a short usage note, not a paraphrase; strict in `check-variety.mjs`; `toCard()` and `/pronunciation` no longer pass `variety`/`es419`/`bild` on as translations. No `es419` on the speaking tasks (§1.5).
  **Sidecars:** `de`, `fr`, `pt` (European), `it` are written from the Spanish, machine drafts. `es`, `fa`, `hi`, `id`, `kmr`, `pl`, `ps`, `ro`, `so`, `sq`, `ti`, `tl`, `uk`, `vi` are `{}`, and the inline `ar`, `uk`, `ru`, `tr` are removed: nobody here could check them against the Spanish, and only `en` is a registered card language, so no visitor loses anything. Restore from `git show 039887c:src/data/redemittel.json` as a starting point for a later run. **For `ui-lang-*`:** `languagesFor("cards", …)` decides whether a sidecar shows, so the phrase sidecars switch on when a language registers `cards`. **For `cleanup`:** delete the 14 empty sidecars, not only `es.json`. **For Arabic later:** phrases need a fresh `ar` sidecar.
  **Beginner path:** `a1-vorstellen` (`redemittel:begruessen#1`, replacing the *¿De dónde eres?* build) and `a1-amt` (`redemittel:nachfragen#1`, replacing the *contrato de alquiler* gap) each have a `redemittel` task, so both units stay at 7. `begruessen#1` has an `es419.form`, so the LatAm resolver must apply it on that task; `gratulieren#5` etc. have none. **Still open from the `beginner-path` hand-off:** `hoeren` and spoken tasks need audio or the `pronunciation` item; no `sprechen` task type exists (`einfach-sprechen.js` works from `aussprache` sentences). **For the audio render:** no `public/audio/redemittel/` exists; the player reads phrases with the browser voice and says so. **For `games`:** `hochstapler/redemittel.json` is a different file and still theirs.
- **Pronunciation decisions** (`pronunciation`, 2026-11-06): `ausspracheregeln.json`, `aussprache-check.json`, `zungenbrecher.json`, `satzmelodie.json`, `aussprache-muttersprache.json` and every `area: "aussprache"` entry of `fehler-nach-sprache.json` are Spanish; all four §1.5 modules are strict in `check-variety`. **Rules:** 16, in teaching order, the old slot ids plus `ll-y` and `enye`; seseo and ceceo are named in the *c/z* rule because a learner in Spain hears them, and a weak final *s* in the *s* rule. **Check sentences:** same ids, plus `a2-carro` and `a2-casa-caza` for the pairs §5.6 names. **Twisters:** 20, folk rhymes only (`fischers-fritz` and `freche-froesche` left the set); *empaca* became *empaqueta* and *en las mañanas* became *por las mañanas*, so these are the Spain forms. **Sound ids** (`focus`) are the ones in `ausspracheTipps.js`: `r`, `ce-zi`, `j-g`, `b-v`, `d`, `h`, `ll-y`, `enye`, `ch`, `qu-gu`, `acento`, `vocal`. **Melody:** Spanish yes/no questions often have statement word order, so the page's echo line and the yes/no line can read the same (`¿Vives en Madrid?`); `baseAs()` in `satzmelodieData.js` writes `¿…?` and `¡…!`, the quiz fills the opening mark only with the answer, and a new rule `cortes` (polite request) follows §5.6. `melodyType` reads a question word after a preposition (*¿De dónde…?*, *¿Por qué…?*). **Drills:** 22; old ids kept where they still fit (`p-b`, `e-i-o-u`, `h`, `s`, `ende`, `r-l`, `cluster`, `betonung`). `drillSlug` keeps accents (`papá` → `papa1`), because *papa/papá* must not share a recording. **Languages:** `spanisch` became `englisch` and `portugiesisch` is new, because `check:aussprache` needs the slot for a drill list; the five first languages now come first, then Arabic, Russian, Ukrainian, Chinese (§5.7's keep list). `tuerkisch`, `persisch`, `polnisch`, `vietnamesisch` and `tagalog` have **no** pronunciation mistakes and no drills now: the old ones were about English and I wrote none rather than guess. A language without drills drops out of the Check's picker by itself. **Gate:** missing drill audio is a note (`--audio` makes it a problem), so `check-aussprache` and `check-satzmelodie` joined `check:content`; §5.6's “links both ways” now holds in every build. `check-aussprache` also checks each `focus` against the sentence, `stress` keys, and each rule's `match` against its examples. **For `idioms-mistakes`:** `englisch` and `portugiesisch` hold pronunciation mistakes only; write their other areas. Every other language's non-pronunciation mistakes, `strengths` and the file's `note` and `quiz` are still about English, and `wortfallen.sheep.*` too. Keep or remove the five languages above as §5.7 says; `langMark.js` has both new ids. **For `games-dialogue`:** `spielKit.js` already speaks es-ES (§5.6), so English lines in `knigge` and `lindenau` sound wrong until your item runs. **For the audio render:** no script from the old comments exists; ids and slugs are ready (`public/audio/aussprache-check/<id>.mp3`, `zungenbrecher/<id>[-langsam].mp3`, `muttersprache/<drillSlug>.mp3`, `satzmelodie/<kind>-<satzSlug>.mp3`). The Hörtest on *c/z* pairs needs a voice with distinción, so an es-ES voice with seseo would make it unanswerable. **For `beginner-path` follow-ups:** still no `sprechen` tasks in the units: scoring needs a real pronunciation provider behind `backend.js`, and the stand-in can only speak.
- **Idioms and mistakes decisions** (`idioms-mistakes`, 2026-11-06): `redewendungen.json` (72 entries), `umgangssprache.json` (51), `typische-fehler.json` (44 pairs, same 5 group ids), `wortfallen.json` (25 traps), `synonyme.json` (94 groups) and the non-pronunciation part of `fehler-nach-sprache.json` are Spanish; `wortarten.json` `fehler` is filled, empty only for `num`. All six modules are strict in `check-variety`, which §1.5 didn't list: the fixed decision says every vocabulary and grammar item carries `variety`. `fehler-nach-sprache.json` has it at the top level, the others per entry. **Idioms:** `bedeutung` is the English meaning, `en` the nearest English expression, so `rw.facts.en` now says “In English”. Origins are told only where a source supports them (5 entries; `a-buenas-horas-mangas-verdes` tells the usual story and says it's disputed). `quellen` must hold an https link: Wikcionario where it has the phrase (checked through its API), otherwise the RAE dictionary entry of the key word or the Centro Virtual Cervantes proverb collection. RAE returns 403 to scripts, so those 31 links weren't opened one by one; `check:downloads` will flag them. `REDEWENDUNGEN_LIVE` stays `false`: Edgar's call. **Slang:** `data.recht` and its markup are gone, as §5.7 says. `std` is the standard word plus its English meaning, so it has no `lang="es"`. **Synonyms:** new optional `nota` (English register note, not shown yet); the quiz ignores it. Groups must really swap in an everyday sentence, so the set is smaller than the English one. **Languages:** ten slots: English, German, French, Portuguese, Italian, Romanian (new, no drills), Arabic, Russian, Ukrainian, Chinese. `tuerkisch`, `persisch`, `polnisch`, `vietnamesisch`, `tagalog` are removed: they had no drills, they aren't among the groups the plan names for Spain, and their old content was about English. Restore a starting point from `git show 00b4d1d:src/data/fehler-nach-sprache.json`, but it needs rewriting. A learner whose stored first language is one of these falls back to the normal view (`show()` in `fehlerSeite.js`). **Validator:** `scripts/check-sprachfallen.mjs` (new, in the gate, `pnpm check:sprachfallen`) covers the traps and their en.json rows, pairs, slang, synonyms and first-language mistakes; `check-redewendungen.mjs` has Spanish stop words. The live quiz's synonym mode and `/culture/mistakes` search rows follow. **For `culture`:** `kalender-saetze.json` still has English `redewendungen` lines; `redewendungen.json` can feed them. **For `games`:** `lernsetKeywords.js` still has English keywords. **For `ui-lang-*`:** `wortfallen.<id>.*` is re-keyed; `typische-fehler` `tr`/`regelTr` and the slang and idiom pages have no i18n rows, as before. **For the audio render:** no `public/audio/wortfallen` or `public/audio/redewendungen` exists; `generate-wortfallen-audio.mjs` and `generate-redewendungen-audio.mjs`, named in comments, aren't in the repo. Idioms use the browser's es-ES voice; the traps have no sound until recordings exist, so `wortfallen.quiz.lead` no longer promises any.
- **DELE decisions** (`exams-dele`, 2026-11-06): the format research entries `goethe-a1`…`goethe-c2` and `goethe-formate.json` hold six DELE formats; `goethe-a1` and `goethe-c2` have no set under the generic engine (A1 is the `start-deutsch-1` slot, C2 has no set). Each research entry has `checked` and `unverified`; the official guides could not be opened on 2026-11-06 (examenes.cervantes.es now redirects to `cervantes.org/es/examenes/dele`, a dates page) and the Cervantes centres' pages disagree, so **every timing, task count, item count and the pass rule is to verify** and the pages say so. **Sets follow one order and structure:** modules `reading`, `listening`, `writing`, `speaking` (C1: the same keys, integrated names), no shared timer, item counts as in the research file; a validator match only proves a set equals our research, not the real exam. Instructions are English at A1–A2 and Spanish from B1, like `speaking`; `why`, titles and checklists are English at all levels. **No audio yet:** the sets have es-ES voices in `speakers`, and the transcript is open. `scripts/generate-pruefungen-audio.mjs` has not been run. **A1 test:** stays in its own shape with 15 + 15 scored items (the real exam has more, the page says it is shorter) and gains an unscored `sprechen` block and a registry module (`sprechen`). **Engine:** `CONTENT_LANG = "es"` marks exam text as Spanish in `pruefungEngine.js`; `choiceCard` takes `contentLang`. `exams-siele` inherits both, and until it runs the `telc` and `testdaf` English text is tagged Spanish too. `mc` items now show `why`. `task.situation` splits on line breaks. **Names:** `examLabel` is now `DELE A2` / `SIELE A2`; `telc` label changes with it. **Traps:** `fallen.json` `exams` values are `dele`, `siele`, `ccse` (not slots any more), a card has `level`, and cards point to a part of a set rather than to a numbered item. New ids: `palabras-justas`, `reparte-el-tiempo`, `cortes-generales`. Old ids are kept with new content; `verb-nach-der-luecke` is now the written accents trap. **For `exams-siele`:** check the `siele` trap cards against the real SIELE (they are generic), and give `telc`/`testdaf` research entries a `checked` date so the page date changes (`PruefungSatz.astro` falls back to 30 October 2026). **For `ccse`:** `/exams/traps#cortes-generales` and `#reparte-el-tiempo` link to the CCSE or use it as a filter. **For `nationality-path`:** the `dtz` trap links are gone; add cards if the mock needs them. **For `routes`:** `fallen.json` hrefs and `/cambridge/use-of-english` follow the slug map, and `ROUTE_RENAMES` must cover the `#part` anchors. **For `cleanup`:** old `format.t.*` keys in `en.json` that no format file uses (German-exam leftovers) stay until then; `sd1.facts.*` too (only `sd1.facts.pass` is in use, on the CCSE test page). `downloads.json` still lists Cambridge entries (`teachers`, §5).
- **SIELE decisions** (`exams-siele`, 2026-11-06): unlike the DELE guides, the official SIELE exam guide could be read (copy on `seul.cervantes.es`, date unreadable, another copy says April 2021) and agrees with `siele.org/examenes`, so tasks, question counts, times, score bands, S1 to S5 and five-year validity come from there, dated; the guide's age keeps them on the to-verify list. **Slots:** the four `telc` sets hold the real tasks by the band they aim at, using the guide's task numbers in their titles: A2 = reading 1–2, listening 1–2, writing 1, speaking 1–2 (the slot's only A1 material, hence "the A1 and A2 tasks"); B1 = reading 3, listening 3, writing 1, speaking 3; B2 = reading 4 (two gap-bank parts), listening 4, writing 2, speaking 4; C1 (paid, as the slot was) = reading 5, listening 5–6, writing 2, speaking 5. Together they are one whole SIELE Global (38 + 38 items, 2 writing and 5 speaking tasks), though writing 1 and 2 each appear twice with different prompts. No band set was removed. `teil` counts within the set and titles carry the real task number. **Listening task 6** picks six ideas of twelve in any order for real; the engine marks one key per item, so ours has six sections with one idea each and says so. **`testdaf` slot:** same top-level keys; `aufgabe1` is the real B1 match task without the "no text fits" option, `aufgabe2` and `aufgabe3` are plain multiple choice at about B2 and C1 (`aufgabe3` items gained `options`), and `schreiben.grafik` is gone with the chart task, because the SIELE has neither Yes/No/Not given nor a chart. `testdaf-formate.json`, unused before, now has the `ExamFormat` shape plus `bands` and `modalities`, and `/ielts` reads it. **Engine:** `scoring.passPct: null` shows no verdict and no 60 % line. `PruefungSatz` hides an empty Points column and uses `ps.heroBand` and `ps.format.titleBand` for `telc` sets. `.ps-gap.is-filled` wraps, which also fixes long fragments in the DELE sets on phones. **Traps:** `reparte-el-tiempo` no longer lists `siele` (you can't return to a finished SIELE task); new `sin-vuelta-atras`, `habla-sola`. **No `variety` field** on exam sets, as with the DELE sets: `check-variety` doesn't cover them. Learners should expect other accents in the real SIELE, and `/ielts` and `/exams/dele-or-siele` say so. **For `routes`:** `/trinity/*`, `/ielts`, the `practice.href` of the two new traps and the links in `dele-or-siele.astro` follow the slug map; `/exams/dele-or-siele` stays. **For `nationality-path`:** the DELE-or-SIELE page says DELE A2 or above plus CCSE and points to the Ministry of Justice in general; link `/nationality` from its nationality row once the page exists, and reconcile the exemption wording. **For the audio render:** the band sets have es-ES voices; `generate-pruefungen-audio.mjs` has not been run. **For `cleanup`:** `.tdaf-*` chart styles, `testdaf.fmt.*` and `tdf.type.yesno` are unused now.
- **CCSE decisions** (`ccse`, 2026-11-06): the official guide could not be read (`ccse.cervantes.es` redirected to a maintenance page, and the copy on `agenda.cervantes.es` refused the connection), so the format comes from exam centres: 25 questions, tasks of 10 / 3 / 2 / 3 / 7, true or false in task 2 and three options elsewhere, 45 minutes (Universitat de València), 15 of 25 to pass with no penalty (Universidad de Alicante). All of it, the €85 fee and the 4-year validity are **to verify** and the pages word them that way. The official CCSE manual and question bank were **deliberately not opened**, so overlap is limited to facts anyone would ask about. **Language:** questions and options are Spanish because the test is; `explain` is English. On `/facts`, `facts` and `def` are Spanish, while `factsEasy` and `defEasy` are the **same fact in English**, not simpler Spanish. The switch reads "En español / In English" with the new key `lid.fk.level.en`; `lid.fk.level.easy` stays for ZitatCard. The translation switch is hidden while `uebersetzungen/leben-in-deutschland.json` is empty. **Additive fields:** top-level `variety`, `meta.tareas` (`n`, `title`, `realCount`, `options`), and `tarea` and `explain` on each question in `questions`. Topic ids stay as slots: `government-parliament`, `elections`, `values-law`, `four-nations` (territory), `history` (culture and history), `everyday-life` (society). `meta.federalQuestions` now means the size of our bank (58), and `totalQuestions` the real test (25). **Test:** one section per task, and only the 58 questions on Spain count towards the score, the share of the pass mark and the dashboard. The 19 comunidades and ciudades (4 questions each) are an unscored extra, `scored: false` in the registry. **Removed:** the three `lid-*` download entries and the PDF links; the UK gov link is now the Cervantes CCSE page. **For `routes`:** `/life-in-the-uk` becomes `/ccse`, including links in en.json (`lid.format.note`, `lid.test.hero`, `lid.fk.hero`, `pruefungen.levelNote`). The registry id and storage keys stay. **For `cleanup`:** `scripts/generate-fakten-pdf.mjs`, `generate-bundesland-pdf.mjs` and the `states` code in `src/lib/downloads.js` and `knowledge.astro` have no catalogue entry left; `src/oldux/LearnShell.astro` still has the old text. **For `ui-lang-*`:** `entry-pages.json` still describes the German test for `/life-in-the-uk` in six languages. **For `nationality-path`:** read the figures from `meta` rather than repeating them, and keep exemptions out of the CCSE pages, which only say that some applicants are exempt. **For `culture`:** `kultur.json` still links to these pages under "Life in the UK" labels. **Edgar:** when the guide is reachable, compare the format against it; meta and `lid.format.*` are the only places to change.
- **Nationality decisions** (`nationality-path`, 2026-11-06): `/nationality` rests on the Código Civil (arts. 21–23), RD 1004/2015, Orden JUS/1625/2016 and Ley 19/2015, read in the BOE; the Instituto Cervantes FAQ refused the connection. **Text source:** the page reads `en.json` directly, so each sentence lives in one file; CCSE figures come from `meta`. **Mock:** the trainer's nine-part shape stays (the validator fixes it), so the mock says it doesn't copy the real DELE A2, and `/cambridge/a2` is the set with the real parts. Questions, options and texts are Spanish; rubrics, part titles, writing prompts, points and checklists are English, like the other A2 sets. **Paid sets:** set 2 is written. **Sets 3 and 4 are removed now**, not in `cleanup`: with the paywall off `can()` is true, so their German opened for anyone. Restore with `git checkout 9525dbb~1 -- src/paid/pruefungen/dtz/uebungssatz-3.json src/paid/pruefungen/dtz/uebungssatz-4.json`, though what comes back is German. `preise.cell.dtz3` now says "+ 1 DELE A2 mock" (key name kept). **Timed:** the trainer gained an optional clock per skill (25, 45 and 30 minutes, ours), stored under `da-dtz-clock-v1:`; it never blocks. **Also fixed:** the trainer now shows `modelAnswer` and `checklist`, which the page promised but never rendered; "My mistakes" and the true/false and none buttons no longer use German or hard-coded text; the registry entry is A2. **For `routes`:** `/nationality` stays; the new links to `/trinity/ise-1/*`, `/cambridge/a2` and `/life-in-the-uk` in `nationality.astro` and `dtz.format.note` follow the slug map. **For `cleanup`:** `produkte.json` still has "DTZ" in its `de`, `ar`, `tr` and `uk` names; `scripts/check-pruefungen.mjs` and `check-pruefungsplan.mjs` keep DTZ names in comments and fixtures; `search` entries in `suche-seiten.json` with `dtz` in their keywords for other pages remain; `exam.h1.set1` may be unused. `scripts/validate-i18n.mjs` crashes because `public/i18n/de.json` doesn't exist yet (not caused by this item; `ui-lang-de` should see it clear). **For `extranjeria-sim`:** both mocks use the empadronamiento and the NIE only as everyday scenes, with invented offices; keep any rule statements on those pages. **Edgar:** read `/nationality` once with a lawyer's eye, see the to-verify list in `reports/nationality-path.md`.
- **Extranjería sim decisions** (`extranjeria-sim`, 2026-11-06): the game is **Bruno at the desk**, five days with 28 hand-written cases: days 1–2 padrón at Villabruno town hall, day 3 NIE, day 4 TIE, day 5 questions on arraigo and the regularisation. **Stamps are COMPLETO / DEVUELTO, not approve / reject**, because the player only checks paperwork and no stamp may look like a decision on someone's status; keys C and D. Arraigo and regularisation customers carry a `derivar_*` mistake: the right move is to send them to official information, and they always get DEVUELTO. Padrón rules follow the BOE instructions (Resolution of 17 February 2020): no residence permit needed, proof of address may be something other than a contract, so a missing contract means "come back with other proof", never "you can't register". Shape, additive only: `TAGE` in `regeln.js` holds each day's memo (`regelnBis` reads it, no longer cumulative); paper kinds `cita`, `tasa`, `foto`; `opciones` and `kopf` on `DOK_ARTEN`; `WOERTER` for tap-a-label glosses. `de` = Spanish, `en` = English, shown under the Spanish with an EN on/off button. The memo's `wirklich` texts, never shown before, are on the start and end cards with sources. Lines carry no item-level `variety` or `es419` (they name Spanish procedures, see the `es419` scope above); `kunden.json` has a file-level `variety: "es-ES"`. `pnpm check:extranjeria` checks that each case's papers contradict exactly where its mistakes say. **Hand-offs:** `routes` renames `/games/front-desk` to `/games/extranjeria`; `games-dialogue` may rename Villabruno, which is also in these texts. **Open:** the page stays a noindex prototype outside the menu (Edgar decides on release); its interface strings are in `UI` in `spiel.js`, not `en.json`, so the `ui-lang-*` items don't reach them until they move; facts "to verify" are in the run report, re-check them before release, especially regularisation dates.
- **DGT vocabulary decisions** (`dgt-vocab`, 2026-11-06): `/dgt-vocabulary`, one trainer page and one print page per group, `src/data/dgt/vocabulario.json` with `beruf: "dgt"` and 215 entries (120 own, the rest lexicon refs). Nothing restored from the old Führerschein module (§4.4). **Ten groups, not the plan's six:** the car became parts and controls, road users got their own group, and *instructions* (asked for by the queue) and *breakdowns* were added. **Shared code:** the deck is `DGT` in `berufeCore.js`, not in `BERUFE`, so it has no sector page; word ids are `bv-dgt-…` and unit ids `berufe-dgt-<group>`, so the print sheet, live quiz, side list and card swap work unchanged. **A ref may now carry `en`** as well as `deHint` and `example`, for a lexicon word whose first sense is another one (*volante, matrícula, turismo, parada*). **For `spanish-for-work`:** `kraftfahrer` can ref `bv-dgt-…` words. The side list shows the deck under the heading *Spanish for work*. **For `routes`:** the `DROPPED` redirects still send `/fuehrerschein*` to `/exams`; drop them as planned. **For `culture`:** `nav.kultur.autoHint` still says driving on the left and the MOT. **For a lexicon pass:** the example of `triangulo-de-emergencia` (b1) tells the learner to put the triangle out, but the DGT says the V-16 beacon replaced triangles from 1 January 2026; the deck overrides it, the lexicon does not yet. Facts to verify: `reports/dgt-vocab.md`.
- **Culture decisions** (`culture`, 2026-11-06): `kultur.json` has the plan's 23 topics plus six new ones: `comida`, `fiestas`, `lenguas-cooficiales`, `mundo-hispano`, `tradiciones-america`, `historia-compartida`. **Hub:** the levels hold the Spain topics; the three Hispanic-world topics follow in their own section (`WORLD_IDS` in `src/pages/culture/index.astro`, anchor `#hispanic-world`), while `/knowledge/country-and-culture` and the quiz still list them with the others. **Films:** new `/culture/films-and-series` with `src/data/kultur-filme.json`, because `/explore/films` is the set of short films about this site and stays that. **Translations:** `uebersetzungen/kultur.json` and `uebersetzungen/zitate.json` are empty on purpose (the old entries translated other topics); the pages hide the help block, and the `ui-lang-*` items or a help-language pass must fill them. **Quotes:** only authors who died before 1946. **For `routes`:** `kultur.json` (`grundgesetz`), `country-and-culture.astro` and the nav still link `/life-in-the-uk/facts`, correct until the rename to `/ccse/facts`. **For `games-dialogue`:** the `src/lib/knigge/scenes.js` slugs now point at the new culture slugs; the scenes themselves are yours. **For `teachers`:** `wissen.link.*` (Cambridge, IELTS, Trinity, gov.uk) and the unused `wissen.file.lid-bundesland.desc` are still English-course text. Facts to verify: `reports/culture.md`.
- **Accents and languages decisions** (`accents-languages`, 2026-11-06): `/knowledge/accents` has 13 areas in five groups (north and centre, transition zone, Andalusia, Canary Islands, regions with a second language), four city dots and six language dots; the plan's four co-official languages plus Asturian and Aragonese, whose texts say they are not co-official, so the badge reads "Language of Spain". Latin American varieties are a new `world` array with `dialekte.w.*` keys, shown under the map in `#mundo`. `benrath`/`speyer` are now the lines of weak final s and of seseo. `/knowledge/languages`: views are `world` (first) and `americas` instead of `europe`/`world`; 19 places as main language (Puerto Rico apart), Paraguay and Equatorial Guinea as `region`, the US, Belize and Andorra as `minderheit`, and Gibraltar, Western Sahara, the Philippines and Judeo-Spanish as `gemeinschaft`. The tree's home branch is Romance; the comparison uses the ten languages of `fehler-nach-sprache.json` and opens on English. **The decoder is kept and turned round**: English → Spanish patterns (`-tion → -ción`), same keys. **Geometry:** `npm install` and `curl` were not available in this unattended run, so neither package nor download was used: the generators read the Natural Earth outlines already committed in `git show edf6596:src/data/sprachen-karte.json` through `scripts/karte-geo.mjs` (no dependencies). The inner borders and the Canary Islands are hand-drawn and clipped by an SVG clipPath; the Americas view is the 1:110 m outline enlarged. `dachMap.js`, named in §5.14 and §9, does not exist. **Open:** real province borders and 1:50 m outlines for the Americas if the geo packages can be installed; `dialekte.json` need not change. **For `ui-lang-*`:** `sprachen.dec.*` and the decoder pairs are written for English speakers: a translation should keep the English column or drop the section, not translate the pairs. Map line labels ("clear s", "weak s") and region names sit in the page and data, not in `en.json`.
- **Games decisions** (`games`, 2026-11-06): **`/articles`** asks `el`/`la` over the 2 324 A1–B2 nouns `generoDrill.js` allows (out: `el/la`, plural-only, either-gender nouns). Rule packs test the noun's first word; acronyms and the set phrases in `noRule` have no rule. The plural on the card shows without an article, because *los/las* would give the answer away. The browser's es-ES voice says the answer (`speak` on a practice question, next to `audioSrc`). **Dictation:** one-word A1–A2 nouns; the accent counts, a capital at the start doesn't; no speech = the English meaning is the prompt. **Etymology card off:** `public/data/artikel-herkunft.json` and `public/data/herkunft/*` are German Wiktionary data on old ids; **`cleanup`** can delete them, `artikelHerkunft.js` stays for a later Spanish version. The frequency chart shows only once `artikel-haeufigkeit.json` has data. **Sentence Rain:** new `{free 1<2 3-4}` flag expands into `a` at build time. Accepted: the neutral order, time or place in front, subject after the verb. Not accepted: a final verb, an object before its verb, anything between a pronoun or question word and its verb. Only mode `v2` is offered in the game, as before. **Quaki:** 106 own items; a form that would also be right is never a wrong pad. **Impostor:** clue starters avoid *lo/la*, which would give away the word's gender. **Hand-offs:** `routes` still has `/games/countable-sprint`; **`teachers`** owns the printable domino page text; `ap.*`/`mhelp.*` keys with German labels in „…“ are outside this item (`mhelp.*`, `merch.*`, `hs.*`).

  **games-arcade:** **Nut Night:** shots are *el / la*; *los / las* buttons appear only after the Plural popper (B1), and the plural article comes from the gender (`pluralArticle`, so *el agua → las aguas*). The first-sound radar became an **ending radar** (-o/-a, then -ción, -dad, -umbre, -aje, -or, then the traps), which reads the head noun. The cracker is the **compound cracker**: verb + plural noun with a listed seam (`COMPOUNDS` in `nussnacht/woerter.js`); seams that change a letter (*paraguas, pararrayos*) stay out, and *paraguas* is a `lex: false` boss. Thirteen compounds not in the A1 to B1 lexicon are game-only rows at B1 (`comp-<word>`); **later vocab items** may add them to the lexicon, and the rows then step aside by themselves. **Listening Safari, no Spanish audio:** the browser voice speaks, es-ES first, then any Spanish voice. An English voice is never used for Spanish: a browser with no Spanish voice stays silent, shows the word at once and says why on the start card. A list of 0 voices still tries, and a failed utterance counts as no voice. Word list in `hoerSafari/woerter.js`: *casero, padrón, estrés, diversión, DNI, NIE* are out because their picture does not show the word, and *el médico, el profesor* use a man instead of the table's woman. **For `games-dialogue` or whoever edits `wort-bilder.json`:** those two pictures still show a woman everywhere else. **For `cleanup`:** the name Wachtelhuhn remains only in code comments.
- **Dialogue games decisions** (`games-dialogue`, 2026-11-06): **Player's gender:** nobody knows it, so the player's lines and what people say to the player avoid gendered forms (*mucho gusto*, not *encantado/a*; *acabas de llegar*, not *eres nuevo/a*; *te doy la bienvenida*). Álex in the date is written the same way. `check:knigge` and `check:lindenau` catch the common forms. **Manners** (`knigge`): 21 scenes, one new (`menu-del-dia`, for meal times and asking for the bill), and new turns for *dos besos* (a handshake is always fine, for any reason), *trátame de tú*, usted at the school office and the *sobremesa*. `npc`, `de`, `react` and the wheel's `say` / `re` are Spanish; `situation`, `tag`, `why`, `place`, `role` and parenthesised stage directions are English. **New fields, additive:** `reactEn`, and `sayEn` / `reEn` on `TOPICS`; `game.js` shows them under the reaction, and the 💡 button now also appears on turns with no spoken line. New validator `scripts/check-knigge.mjs`, in `check:content`. **RPG** (`lindenau`): quest ids, maps and turn counts kept. `item.label` and `words` carry *el / la*, so the monsters practise gender; `role`, signs and area titles are Spanish. Shop people use tú, the ticket office and health centre usted. Count Grubby and Baron Dusty are *el conde Mugre* and *el barón Polvo*; *Super-Blubb* stays because it is the mascot's name across the site (`mascots.js`). Lines carry no item-level `variety` or `es419`, as in the Extranjería sim; each file exports `VARIETY = "es-ES"`, with a comment listing what a LatAm mode would have to rewrite. **No clips exist**, and `generate-lindenau-audio.mjs` is not in the repo; the browser's Spanish voice speaks, and `VOICES` already names es-ES voices for a later script.
  **For `routes`:** rename `/games/brambleford` to `/games/villabruno` (page file, `routes.js`, `catalog.js`, `suche-seiten.json`, `start.astro`, CSS comments). **For `ui-lang-*`:** `uebersetzungen/lindenau.json` is keyed by the Spanish lines and empty; other languages fall back to English. The Manners `en`, `reactEn`, `why` and `situation` texts have no sidecar at all, so those languages will show English. Facts to verify: `reports/games-dialogue.md`.
- **Teachers decisions** (`teachers`, 2026-11-06): all 60 `arbeitsblatt/<id>.json` and all 11 `partneruebungen/*` are Spanish, with top-level `variety` (plus `es419` where a sheet uses something Spain-only), which §1.5 didn't list; `unterricht-wortschatz.json` too. All three are strict in `check-variety`. New validator `check-arbeitsblatt.mjs` joins the gate: ¿…? on questions, the blue verb among the tiles, no English left in what learners say, every partner sheet passes `validateSheet`; `--tiles` lists tiles the answer changes. **Tiles:** Spanish drops pronouns, so a person who isn't written is a tile in brackets, `(yo)`; a tile `x / y` is a choice and may be the blue tile (`por / para`). Sheets print `¿ ___ ?` on question lines. **Language:** instructions English, everything said or written Spanish, including the generic phrases in `tandem.js`; the sheets carry `lang="es"`. **a or en sheet:** the room and kitchen pictures stayed, but Spanish has no stand/lie difference, so `regel.lage` holds "always estar" and the trap *poner, meter, colgar, dejar + en*; its icon is gone. **Partner sheets stay drafts** (`geprueft: false`), as §5.10 says: they don't appear in lists or PDFs until Edgar sets them. **Word fields** follow the keys of `kursinhalte.json` A1 exactly. **Class test:** `GRAMMAR_WORD` is a closed Spanish set. **Live quiz nicknames** are animal + adjective with one form for both genders (*Zorro valiente*); `animalOf` reads the first word; a player's stored English animal simply shows a random avatar. **Meaning menus** of quiz, bingo and domino come from `languagesFor("cards")`, so the old Arabic, Ukrainian, Russian, Turkish options (0 Spanish glosses) are gone and `ui-lang-*` get theirs automatically. **Downloads:** Cambridge, IELTS, Trinity replaced by Cervantes (DELE, CCSE), SIELE, RAE (DLE, DPD), DGT; unused `wissen.file.lid-bundesland.desc` deleted. The Plan curricular link was left out because `cvc.cervantes.es` answered with a maintenance redirect on 2026-11-06; add it when it's back.
  **Left, not done:** `/teachers/cards` (`src/lib/vokabelFoto/*`) still parses German word lists (`der Tisch, -e`), its prompts and many strings are German, and it needs the upload and translation backends: it needs its own item once those exist. Only the PDFs in `downloads.json` that exist show on `/knowledge`, and just `grammatik-start.pdf` is committed; the grammar, word and partner PDFs were not generated (`deploy-readme` or a PDF item). `data/lernsets/lernsets.*.json` are outputs of `scripts/extract-lernsets.mjs` that no page reads and still hold old words: **for `cleanup`**. **For `spanish-for-work`:** berufe entries in `downloads.json` keep their titles (`Childcare (nursery)`), adapt them with the sectors. **For `routes`:** the teacher pages' hard-coded `/teachers/…` stay as they are. Facts to verify: `reports/teachers.md`.
- **Word stories decisions** (`word-stories`, 2026-11-07): 30 stories, drafts, on the 30 dates the English ones held; the English stories are deleted. **Word choice:** the validator is strict again (lemma, family and formsAlso must be in the lexicon; file name = lexicon id; level = lexicon level), so *ojalá, aldea, guerra, guardar, naranja, aguacate, jamón* wait for a later batch: they are not in the lexicon. *almohada* and *alcalde* are B1, kept because §5.13 names them. **Page:** the headword, forms, family and synonyms are `lang=es`, everything written about them is `lang=en` (`PROSE_LANG`). **Sources:** RAE's DLE answers 403 to fetching, so the stories cite only what was read: Wiktionary and dechile.net (Corominas only where dechile.net quotes him). A DLE comparison is left for Edgar. Stories carry no `variety` key, like reading texts (§1.5); Spain/LatAm differences are told in the prose (*coche, ordenador, patata, tomate*). **For `ui-lang-*`:** `elsewhere` blocks exist for de, fr, pt, it where the sources support one; the texts are English. **Left, not done:** `scripts/preview-wort-mails.mjs` imports `emails/wortgeschichte.mjs`, which does not exist in this repo. Facts to verify: `reports/word-stories.md`.
- **Spanish for work decisions** (`spanish-for-work`, 2026-11-07): ten decks, 612 entries (336 own, 276 refs), level A2–B1, `reviewed: false`. Fewer words than the English decks on purpose (58–68 each, was about 85), but care work grew from one group of 30 to five groups. **Sectors and slugs:** ids stay as §5.12; hub order follows the §5.12 table; URLs are `agriculture`, `cleaning-domestic-work`, `hospitality` and `shops`, already changed in `routes.js`, because a farm deck can't sit under `electrical-and-plumbing`. Group ids stay; only farm work swapped `kunden-team` for `team`, and care work reuses `taetigkeiten`, `ablaeufe`, `sicherheit-gesundheit` and `eltern-team`. **Plan correction:** §5.12's *régimen especial de empleadas de hogar* is not the current name; the deck says *sistema especial para empleados de hogar*. **Person nouns** follow the lexicon (masculine lemma, the feminine in the gloss), except where a job is mostly done by women (*empleada de hogar, camarera de pisos, gobernanta*). **Validator:** `GENDERS` is `el`, `la`, `el/la`; a lexicon ref that is gone is an error again; `berufe` is strict in `check-variety`. A ref can't carry `es419`, so it inherits the lexicon word's note or has none. **Photos:** the `berufe-kita` and `berufe-elektro-technik` manifest entries are removed, so those two sectors show an emoji and no hero photo; `hub-bilder.json` has new queries and alt texts for `generate-hub-bilder`. **For `business-spanish`:** `buero` has no link to the module yet because the page doesn't exist; add it to the deck's `links`. **For `routes`:** rename the `/english-for-work` folder and its section keys; sector and group slugs are done. `src/data/entry-pages.json` still has German-course text under `/english-for-work` (*Alemán para el trabajo*), as do the other entries there. **For `cleanup`:** the old electrician and nursery photos are still in `public/assets/hubs` and `public/og`; `scripts/rename-routes.mjs` has an old slug in a comment. **For `deploy-readme` or a PDF item:** `generate-berufe-pdf.mjs` is now in English with `los`/`las` but has not been run. Facts to verify: `reports/spanish-for-work.md`.
- **Business Spanish decisions** (`business-spanish`, 2026-11-07): six units, drafts (`reviewed: false`): `correos` B1, `llamadas` B1, `curriculum` B1, `entrevista` B2, `reuniones` B2, `negociacion` C1; 157 phrases, 12 model texts, 121 words (27 own, 94 refs), 72 exercises. **Shape changed from §4.3 (now updated there):** `models` is a list, because every unit needs a formal and a less formal text; phrases add `use`, the group they are shown under; units add `tips` and exercises add `context`. **URLs:** the plan's `<unit>` ids stay as file names and progress keys, but the URLs are English (`BUSINESS_SLUGS` in `routes.js`: `emails`, `phone-calls`, `cv-and-cover-letter`, `job-interviews`, `meetings`, `negotiating`), with `/words` for the trainer and `/words/print` for the sheet. **Deck:** every unit's `words` is a group of one deck `business` (`businessDeck()`, ids `bv-business-…`), so the trainer, print sheet, live quiz and deck side list work unchanged. A ref can't carry `es419`, so words already in the lexicon inherit its note or have none. **Not added to:** the teachers' list of printable sets, because `printableSets()` lists sectors only. `es419` isn't shown while `LATAM_MODE` is off; the unit page already goes through `textFor` and `skippedFor`. **Phrase audio** is the browser's voice (no recordings); the button stays hidden without `speechSynthesis`. **For `routes`:** `/business-spanish` needs no rename; `entry-pages.json` has no entry for it, and `suche-seiten.json` is untouched (the search entry is in `searchIndex.js`, as for DGT). **For `ui-lang-*`:** the keys are `biz.*`; unit content (titles, intro, explanations) is English only, like the sector decks. **For the next full build:** these pages have been compiled but not yet built or seen in a browser. Facts to verify: `reports/business-spanish.md`.
