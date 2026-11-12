# Content plan: Spanish course → icanspeak Italian

Written 2026-11-11 by the `content-plan` run of the icanspeak Italian queue. It replaces the
Spanish plan (the full text of that plan is in git: `git show 1e433ae5:apps/italian/docs/content-plan.md`;
it also holds the per-item decision notes of the Spanish runs, which are history here).

**Every later item in the queue (`overclaude/projects/icanspeak-italian/QUEUE.md`) follows this
file.** A run that has to deviate (a mapping turns out not to work) changes this file in the same
commit, says why in its report and, if the question stays open, adds it to §13.

Starting point: `apps/italian` is a copy of `apps/spanish`. Today its data files hold the **Spanish
course** (DELE, SIELE, CCSE, Extranjería sim, DGT, Castilian Spanish, `es419` notes) in files
with German names. "Now" in the tables below means that Spanish course; "Italian" is what the slot
becomes. Slot ids, schemas and file names stay (§6).

Words used below:

- **keep**: stays as it is (code, infrastructure, language-neutral data).
- **convert**: same file, ids and schema, new Italian-course content.
- **add**: new file, page or module; English names from the start.
- **leave**: not touched by any content item, with the reason given (§9).
- **drop**: removed by `cleanup`, with a restore command recorded.

---

## 1. Global decisions

### 1.1 Learner, variety, levels

| Decision | Value |
|---|---|
| Brand | **icanspeak Italian**. No "icanspeak Spanish", "EnglishAcademy", "englishacademy", "deutschacademy" in anything a visitor sees (titles, meta, OG, JSON-LD, PDFs, llms.txt, rendered `source` strings). Internal code comments may keep the history. |
| Site and base | `site: 'https://icanspeak.it'`, `base: '/italian'`. Never a hard-coded root path. Every URL goes through the base helper `src/lib/paths.js` (`withBase`, `absoluteUrl`, `langPath`) that the Spanish course already has; `base-path-and-brand` changes `/spanish` to `/italian` in it. UI-language prefixes come after the base: `/italian/de/…`. `pnpm check:base` checks `/italian/`. |
| Target learner | Adults (16+) learning Italian, any first language, **with a strong group of immigrants and residents in Italy and people applying for Italian citizenship**. Real situations (Questura, Comune, Anagrafe, ASL and medico di base, landlord, work, school) beat tourist phrases. |
| Variety | **Standard Italian (italiano standard)**: neutral, widely used vocabulary, standard pronunciation (open and closed *e/o*, geminates, /ʎ ɲ ʃ ts dz/), correct accents (*è, é, perché, città, più, può, là, lì*). Formal address: *Lei*. |
| Regional Italian | Italian has no second standard to switch to. Every vocabulary, grammar and audio item carries `variety: "it-IT"`. Where a learner meets a regional difference in daily life (north/south, Tuscany, Rome, Swiss Italian: *anguria/cocomero/melone d'acqua*, *pomeriggio* "di sera" in the south, *stare* for *essere* in the south, *passato remoto* in southern speech, *ho mangiato/mangiai*, *il sacchetto/la busta*) a `regional` note records it (§1.5). Notes are data only; nothing shows them yet. |
| Levels | CEFR **A1–C1** for courses, grammar, placement; lexicon units keep **A1–C2**; exams cover **A1–C2 formats** (C2: format entries only, no practice set, §2). |
| Explanation language | **English** (base dictionary `public/i18n/en.json`). Short, clear English; A1/A2 explanations use simple English and let the Italian examples carry the rule. Fields named *einfach/leicht/Easy* (`introEasy`, `historyEinfach`, `explainLeicht`) get very simple English. |
| UI languages | English base. **German, Spanish, French, Portuguese** through `src/lib/languages.js`, one queue item each (`ui-lang-de`, `-es`, `-fr`, `-pt`). The Spanish course's Italian UI is **removed** (`ui-lang-es`). Arabic later (RTL is already handled), not in this queue. Why these four: Spanish and Portuguese speakers learn Italian fast and in large numbers, German and French are the big neighbours; the immigrant groups (Romanian, Albanian, Arabic, Ukrainian, Chinese, Bengali, Filipino …) are covered by English for now. |
| Names in examples | Varied, realistic for Italy today: *Giulia, Marco, Chiara, Luca, Sofia, Matteo, Francesca, Davide, Elena, Giorgio, Amina, Youssef, Ionuț, Oksana, Wei, Kevin, Valentina, Gjergj, Rahim, Maria Teresa*. Places: real Italian cities are fine (*Roma, Milano, Torino, Napoli, Bologna, Palermo, Bari, Cagliari*); offices, shops, firms, schools are **invented** (no real company, brand or living private person; state bodies such as Questura, Comune, INPS, ASL are named as institutions, but never a real office's address or phone number). The invented town of the games and sims is **Casalbruno** (working name, §5.9). |
| Tone | Friendly, adult, no childish content, no party politics, no stereotypes about nationalities or regions. |
| Law and administration | Questura, permesso di soggiorno, Poste kit, codice fiscale, residenza, tessera sanitaria, citizenship (the rules changed in 2025), the Accordo di integrazione, the patente: **general orientation, never legal advice**. Every page that touches them says so in one line and points to the official source type (the Interior Ministry's portal, the Comune, the Prefettura, the consulate). Every uncertain fact is "to verify" in the run report, and the page words it carefully ("usually", "as of <month year>, check the official page"). |
| Exams | CILS, CELI, PLIDA, CERT.IT (§2). Original practice material only. **Never copy or closely paraphrase** a CILS, CELI, PLIDA or CERT.IT paper, sample paper (*prova d'esempio*) or any official question bank (including the official civic-knowledge or driving-theory quizzes). Task types may be described and imitated; texts, items and answer options are ours. The site says it is not affiliated with the issuing universities or the Società Dante Alighieri. Any exam fact not sure (formats, timings, pass marks, prices, required levels, rules) is "to verify" in the report and the page words it carefully. |

### 1.2 Typography and answers

- Italian text: every written accent (*è, perché, città, più, può, già, così, là, lì, né, sé, dà*).
  Grave accent is the default; the **acute** is for closed *e* in *perché, affinché, né, sé, poiché,
  benché, finché, trentatré* and *é* is never used where *è* (the verb) is meant. Apostrophes are
  real: *l'amico, un'amica, c'è, po', dov'è, quest'anno*. Quotes inside Italian text: « » (with
  “ ” inside); English prose uses “ ”.
- Numbers and dates in Italian format: `1.250,50 €`, `14:30` or `14.30` or *le due e mezza*,
  `11/11/2026` (day/month/year), months and weekdays in lower case (*lunedì, novembre*).
- **Answers keep their accents.** An accent changes the word (*e/è, da/dà, la/là, si/sì, ne/né*), so
  the checker never folds accents away. The existing `accentOnly()` hint "Check the accent." in
  `src/lib/answerMatch.js` and the accent key row (`.ak-accent-keys`) become **à è é ì ò ù** for
  Italian (the Spanish row á é í ó ú ü ñ ¿ ¡ goes); `ñ`, `¿`, `¡` are no longer typed. Prefer
  choice/pill formats; where a learner types, the page offers the key row.
- **Apostrophes in answers:** the typographic ’ and the straight ' are the same to the checker
  (normalised in `answerMatch.js` by `grammar-a1`); content stores the straight `'`.
  *L'amico* and *l' amico* are not the same answer: the checker does not insert or drop spaces.
- `src/lib/audioSlug.js` `slugify()` folds accents: à→a, è/é→e, ì→i, ò→o, ù→u, apostrophes dropped,
  spaces → `-` (*l'uovo* → `uovo`, *perché* → `perche`, *città* → `citta`). The Spanish `ñ→ny` rule
  is removed by `vocab-a1`. Ids and audio names use that slug.

### 1.3 Ids, slugs, file names

- **Content runs do not rename ids, data file names or storage keys.** They replace the content
  inside the existing ids (a slot that holds the Spanish topic *present-regular* becomes the Italian
  topic in the same slot). Ids are referenced across files (lehrplan, verwandt, arbeitsblatt,
  registry, localStorage keys).
- **URL slugs** are English (the UI language), except proper names and the terms learners search
  for: `/cils`, `/celi`, `/plida`, `/certit`, `/patente-vocabulary`, `/questura` games, and grammar
  topics such as `/piacere`, `/passato-prossimo-avere`. New slugs are in §3 and §8; `routes` applies
  them once.
- **New** ids, files and pages are allowed where this plan says so; they use English names
  (`conjugation-trainer.json`, `business-italian/`).
- Mapping a slot to a different topic is fine; the `level` field may change with it, and
  `grammar-structure` then fixes the syllabus order.
- Lexicon word ids: slug of the Italian lemma (§1.2). A noun/verb pair with one spelling keeps the
  plain slug on the more basic word and suffixes the other (`-noun`, `-verb`, `-adj`). An Italian
  slug already taken by a word of a level that still holds Spanish content (*casa, mesa, hotel, taxi,
  radio, chocolate, final, real*) gets `-it` (`casa-it`) until that level is converted; ids are
  unique across all levels, sidecars are keyed by id. `vocab-c1-c2` checks no `-it` is left that
  could be plain.
- Word stories (`src/content/wortgeschichte/`): the file name *is* the lemma, so Italian stories are
  new files named by the Italian lemma slug (`casa.json`, `arancia.json`, `ciao.json`).

### 1.4 Data fields: what they hold for Italian

| Field / data | Spanish course | **Italian course** |
|---|---|---|
| lexicon noun `gender` | `el` / `la` / `el/la` | **The singular definite article as the learner says it:** `"il"`, `"lo"`, `"la"` or `"l'"`; `"il/la"` for common-gender person nouns (*il/la collega, il/la turista*; also *lo/la*, *l'* where the sound needs it: use the masculine article, `fem` gives the feminine). `spokenForm()` prints `gender + lemma` with **no space after `l'`** (*l'amico*). The plural articles (`i`, `gli`, `le`) are **derived**, never stored: `il→i`, `lo→gli`, `la→le`, `l'`+m→`gli`, `l'`+f→`le`. |
| lexicon `genus` | `"f"` for *el agua* | **`"m"` or `"f"`, required whenever `gender` is `"l'"`** (the article hides the gender: *l'amico* m, *l'amica* f, *l'uovo* m, *l'ora* f). Optional and redundant elsewhere. |
| article validity | `el`/`la` | The article must fit the lemma's first sound (the validator checks it, §1.6): `lo`/`gli` before *z-, s+consonant, gn-, ps-, pn-, x-, y-* and *i+vowel* (*lo zaino, lo studente, lo gnocco, lo psicologo, lo yogurt*); `l'` before a vowel; `il`/`i` otherwise; `la`/`le`, `l'`. Noted exceptions: *il yogurt/lo yogurt*, *lo gnocco*, *il pneumatico/lo pneumatico* are written once, as the learner will most often hear them. |
| lexicon `pluralOnly` | `las gafas` | Same key: *i pantaloni, gli occhiali, le forbici* (when taught as plural); `gender` holds the singular-equivalent article of the gender (`"il"`, `"lo"` → *gli*, `"la"` → *le*), `plural` the full form. |
| lexicon `plural` | Spanish plural without article | Italian plural **without article** (*amici, uomini, zaini, città, il caffè → caffè, la mano → mani*). Irregular gender shifts: new optional **`pluralGender: "f"`** for the *-a* plurals of masculine nouns (*l'uovo → le uova, il braccio → le braccia, il dito → le dita*; `plural` holds *uova*, the article comes from `pluralGender`). |
| lexicon `en` | English gloss | **Short English translation/gloss** (*la casa → "house, home"*), plus a short qualifier (*il pomeriggio → "afternoon (in the south often: evening)"* is a `regional` note, not here). |
| lexicon `example` | Castilian sentence | Natural standard Italian at the unit's level. |
| lexicon `ipa`, `ipaSource` | Castilian IPA | Broad standard Italian IPA with syllable dots, stress and gemination (*casa* `ˈka.za`, *notte* `ˈnɔt.te`, *gnocchi* `ˈɲɔk.ki`, *scena* `ˈʃɛ.na`); open/closed *e, o* marked (ɛ ɔ / e o); `ipaSource: "authored"` unless from Wiktionary (`"wiktionary"`). |
| lexicon `audio` | lemma slug | Lemma slug (§1.2); files don't exist until an it-IT TTS voice is wired (`BACKEND.speech`). |
| lexicon `forms` (verbs) | yo present · él indefinido · participio | **io presente · participio passato · io imperfetto**: `parlo, parlato, parlavo`; `vado, andato, andavo`; `faccio, fatto, facevo`. The auxiliary is in `aux`. |
| lexicon `aux` (verbs) | unused | **`"avere"`, `"essere"` or `"avere/essere"`** for the passato prossimo (the field already exists from the German course): *mangiare* avere, *andare* essere, *cambiare/finire* avere/essere (transitive/intransitive; the note says which). |
| lexicon `reflexive` | `true` for pronominal verbs | `true` for reflexive and pronominal verbs; lemma with *-si* (*alzarsi, chiamarsi, andarsene, farcela*). |
| lexicon `prep` | dependent preposition | Same: *pensare **a**, dipendere **da**, sognare **di**, credere **in***. |
| lexicon `irregular` | irregular comparatives / verbs | Adjectives with irregular comparatives (*buono → migliore, cattivo → peggiore, grande → maggiore, piccolo → minore*); verbs `true` for any irregular tense. |
| lexicon `comparative` / `superlative` | only where irregular | Same (*migliore / il migliore, ottimo*). |
| lexicon `fem` (adjectives and mobile-gender nouns) | feminine singular | Feminine singular **lemma without article** (*alto → alta, italiano → italiana, studente → studentessa, grande → grande*). The feminine article follows from the sound (*la*, *l'* before a vowel). |
| lexicon `case`, `separable` | unused | Not used (keys omitted). |
| lexicon `i18n/<lang>.json` | Spanish → learner language | **Italian → learner language**: `de`, `es`, `fr`, `pt` first (the four UI languages). Other languages only where a run can translate reliably, otherwise the level's entries are removed (never a stale Spanish-based gloss next to Italian). `i18n/it.json` is meaningless: `vocab-a1` removes `it` from `TRANSLATION_LANGS`; `cleanup` deletes the file. |
| lexicon `rank`, `source` | Spanish OpenSubtitles | Italian OpenSubtitles 2018 list (hermitdave/FrequencyWords `it_50k`; licence "to verify" before attaching). Until a run can download it, `rank: null` and the words stay out of the frequency rounds. Level banding stays our own, never claimed to be the *Nuovo Vocabolario di Base* (De Mauro) or any exam list; those may be used as a cross-check only. |
| `SPANISH_LEVELS` (`src/lib/lexicon.js`) | levels whose nouns carry `el`/`la` | `vocab-a1` renames it `ITALIAN_LEVELS` (levels whose nouns carry `il/lo/la/l'`) with the same role and switches callers (`berufeRows.js`, `wortgeschichteCore.js`). `validate-lexicon.mjs` `GENDERS` accepts `il, lo, la, l', il/la` next to the Spanish values until `vocab-c1-c2`; then only the Italian ones. |
| `artikel-sprint/words.json` `article`, `plural`, `pluralWrong`, `english` | el/la | `il`/`lo`/`la`/`l'` (the article is chosen by the first sound, so the game teaches both the sound rule and gender); Italian plural; plausible wrong plurals (*amici → amichi, uomo → uomi, il braccio → i braccia*); `english` = gloss. |
| 4-slot case fields (Nominativ/Akkusativ/Dativ/Genitiv) | subject · direct object · indirect object · after a preposition | Same four slots for Italian: **subject · direct object · indirect object · after a preposition** (*io / mi / mi / me*; *lui / lo / gli / lui*; *lei / la / le / lei*; *loro / li / gli / loro*). |
| `trennbare-verben` slots | pronominal/reflexive verbs; particle field holds *se* | Pronominal and reflexive verbs (*alzarsi, accorgersi di, andarsene, cavarsela, farcela*); the particle field holds *si* (*-ne*, *-la* for the fixed ones). |
| Verb tables (`verbtabellen.json`) | six persons *yo … ustedes* | See §4.1: six person rows *io, tu, lui/lei/Lei, noi, voi, loro/Loro*, keys `praes`, `praet`, `p2` and new tense keys. |
| `translations` maps / `*-i18n` / `uebersetzungen/*` | Spanish → learner language | **Italian → learner language**; `translations.en` = English translation. Other languages only where reliable; check the UI falls back cleanly first. |
| `de` key in phrase/idiom/dialogue data (`redemittel.json`, `redewendungen.json`, knigge scenes) | the Spanish phrase | **The Italian phrase** (the key name is history: it means "target-language text"); `en` = English meaning or usage note. |
| `status`: `entwurf`/`geprueft` | draft / reviewed | Same values. A grammar topic keeps the `status` it has (flipping all to `entwurf` would empty the course); the run report lists topics for Edgar's review. New content enters as `entwurf` unless checked against sources. |

### 1.5 `variety` and the `regional` note

**Shape** (defined here, implemented and validated by `variety-schema`):

```json
"variety": "it-IT",
"regional": {
  "note": "Central Italy and the south say cocomero; the north and the standard say anguria.",
  "area": "general",
  "form": "cocomero",
  "gender": "il"
}
```

- `variety`: `"it-IT"` for everything in this queue. `"it-CH"` (Swiss Italian) is **reserved**
  for a future item that is Ticino-only (e.g. a Swiss listening text); no run writes it now.
- `regional` is **optional** (it replaces the Spanish course's `es419`) and present only where a
  learner will meet a regional difference in daily life. Keys:
  - `note` (required): plain English, ≤ 160 characters.
  - `area` (optional): one of `north`, `centre`, `south`, `islands`, `ch` (Swiss Italian),
    `general` (several areas / no single one).
  - `form` (optional): the regional alternative for the item's main text (lemma, phrase, form).
  - `gender` (optional, lexicon nouns only): `il/lo/la/l'` of the regional word when it differs.
  - There is **no `skip`**: no item is left out for a region (there is no second mode).
- No `regional` = used throughout Italy as far as this course goes. Don't invent differences.
  Typical real ones: *anguria / cocomero / melone d'acqua*, *pomeriggio / dopopranzo*, *mattino /
  mattina*, *il passato remoto in speech (south) vs passato prossimo (north)*, *stare + gerund/
  stare per essere (south)*, *sciocchezza / cavolata*, *prendere / pigliare (south)*, *il
  sacchetto / la busta / il sacco*, *i soldi / i schei*, *gli* for *loro*, Swiss Italian (*il
  natel, il posteggio, la cassa malati, il municipio*).
- **LATAM_MODE** in `src/lib/variety.js` becomes **inert**: the constant stays exported as `false`
  so no import breaks, but no helper reads it any more (`textFor(item, text)` returns `text`,
  `skippedFor()` returns `false`, the `latam` parameters go, `showsVosotros()` is removed and the
  verb tables always show all six persons incl. *voi*). Names change: `DEFAULT_VARIETY =
  "it-IT"`, `VARIETIES = ["it-IT","it-CH"]`, `ES419_KEYS` → `REGIONAL_KEYS`, `ES419_NOTE_MAX` →
  `REGIONAL_NOTE_MAX`, `ES419_GENDERS` → `REGIONAL_GENDERS = ["il","lo","la","l'"]`, `es419Of` →
  `regionalOf`; `varietyOf`, `varietyProblems` keep their names. Regional notes are **not shown**
  anywhere yet (a later item); the field and its validators stay.

**Where the fields go** (same as the Spanish course, `regional` for `es419`):

| Data | `variety` on | `regional` on |
|---|---|---|
| `content/lexicon/*.json` | every word | the word |
| `berufe/*.json`, `patente/*.json`, `business-italian/*.json` own entries | every own entry (refs inherit) | the entry |
| `wortschatz.json` phrase cards, `redemittel.json` phrases | every card / phrase | the card / phrase |
| `grammatik/<slot>.json`, `paid/grammatik/*` | the topic file (top-level key); exercises inherit | the topic (general note) and any exercise item whose usage is regional |
| `grammatik.json` quick quizzes, `akkusativ.json`, `praepositionen-trainer.json` packs | inherit from the topic/pack; pack-level `variety` | item |
| `einstufung.json` | top-level key | item |
| `verbtabellen.json` | top-level key | verb (usage notes, e.g. *stare* in the south, the *passato remoto*) |
| `conjugation-trainer.json` | every set | set or item |
| Audio items: `hoeren.json` scripts, `aussprache-check.json`, `zungenbrecher.json`, `satzmelodie.json` items, `ausspracheregeln.json` rules | every item | item (e.g. *gorgia toscana*, double *z*, *s* sonorous in the north) |

Reading, writing, speaking tasks, culture, exams carry no `variety` key (they are Italy content by
definition). Validators: `variety-schema` converts `scripts/check-variety.mjs`: allowed values,
`regional.note` present and ≤ 160 chars, `area` and `gender` values, no unknown `regional` keys,
**`es419` anywhere is an error once a module is strict**. Missing `variety` is a warning while a
module still holds Spanish content and becomes an error for a module once its item has run (the
item adds its file to the strict list in `check-variety.mjs`).

### 1.6 Validators

- A content item that changes a module's values updates that module's validator **in the same
  commit** (`validate-lexicon.mjs` GENDERS and the article-fits-lemma rule, `check-berufe.mjs`,
  `check-pruefungen.mjs`).
- Never drop a validator from the gate. If one must pause, move it to the "Not in the gate" list
  in `scripts/check-content.mjs` with the reason and the item that puts it back; `cleanup` puts
  every paused one back.
- New rule, added by `vocab-a1`: an Italian-article helper `src/lib/articles.js`
  (`articleFor(lemma, genus)`, `pluralArticle(article, genus)`) used by validator, trainer and games,
  so the *lo/gli/l'* choice is written once.

---

## 2. Exams: existing slot → Italian exam

Exam slot ids stay (they are storage keys: `da-exam-v1:<key>`, `src/lib/exam/registry.js`). Titles,
subtitles, pass notes, module labels and names change (`src/lib/exam/names.js`: `EXAM_NAMES =
{ goethe: "CILS", telc: "CELI" }`, level names `CILS B1`, `CELI 2 (B1)` …; the CELI level numbers
are "to verify").

**The four certifications** (all "to verify" in detail): CILS (Università per Stranieri di Siena),
CELI (Università per Stranieri di Perugia), PLIDA (Società Dante Alighieri), CERT.IT (Università
Roma Tre) are the four certifying bodies recognised by the Ministry of Foreign Affairs (*enti
certificatori*); their certificates at the required level are accepted as language proof for
citizenship and the long-term residence permit. **B1** is the usual language proof for citizenship
by residence or marriage; **A2** is the language level for the *permesso di soggiorno UE per
soggiornanti di lungo periodo* (a certificate at A2 or higher replaces the Italian test given by
the Prefettura). Which exact variants exist for these purposes (e.g. a "B1 cittadinanza" edition),
exemptions and the 2025 changes are "to verify".

| Slot (data / current page) | Now (Spanish course) | **Italian course** | Level | Item |
|---|---|---|---|---|
| `start-deutsch-1` (`pruefungen/start-deutsch-1/uebungssatz-1.json`, `/dele/a1`) | DELE A1 practice test | **A1 practice test in the style of the A1 exams** (CILS A1, CELI Impatto, PLIDA A1, CERT.IT A1; all four parts the set shape holds), unbranded "Italian A1 practice test"; page `/cils/a1` | A1 | `exams-cils-celi` |
| `goethe` A2/B1/B2 (`saetze/goethe-{a2,b1,b2}-1.json`, `goethe-formate.json`, `/dele`, `/dele/[slug]`) | DELE A2, B1, B2 | **CILS A2, B1, B2** practice sets, one per level, plus the format entries A1 and C2 in `goethe-formate.json` | A2–B2 | `exams-cils-celi` |
| `goethe` C1 (`paid/pruefungen/saetze/goethe-c1-1.json`) | DELE C1 | **CILS C1** practice set | C1 | `exams-cils-celi` |
| CILS C2 | format entry only | format entry in `goethe-formate.json` and a hub card, **no practice set** (above the course range) | C2 | `exams-cils-celi` |
| `telc` A2/B1/B2 (`saetze/telc-{a2,b1,b2}-1.json`, `telc-formate.json`, `/siele/levels`, `/siele/levels/[slug]`) | SIELE by band | **CELI practice sets A2, B1, B2** (CELI 1, 2, 3, numbering "to verify"), one per level. `exams-cils-celi` writes at least B1 and A2; a level set it cannot write well is **removed** (with registry entry and `saetze-index` regenerated; restore command in its report and in §13), never left in Spanish. | A2–B2 | `exams-cils-celi` |
| `telc` C1 (`paid/pruefungen/saetze/telc-c1-1.json`) | SIELE C1 band | **CELI 4 (C1)** set, or removed under the same rule | C1 | `exams-cils-celi` |
| `sprachbausteine` (`pruefungen/sprachbausteine/satz-{1,2}.json`, `/dele/language-use`) | "Uso de la lengua" | **"Strutture di comunicazione"**: cloze and gap tasks B2–C1 (grammar and vocabulary in context), framed as practice for the language-use tasks inside the written papers (CILS has a language-structures paper; which papers CELI/PLIDA/CERT.IT have: "to verify"); page `/cils/language-use` | B2–C1 | `exams-cils-celi` |
| `testdaf` (`pruefungen/testdaf/uebungssatz-1.json`, `testdaf-formate.json`, `/siele`) | SIELE Global practice set, `passPct: null` | **PLIDA practice set (B1)** and PLIDA format entries A1–C2 in `testdaf-formate.json`; PLIDA marks the four skills separately and its pass rule is "to verify", so `passPct: null` until checked; page `/plida` | B1 (+ format A1–C2) | `exams-plida-certit` |
| **add** CERT.IT | – | `certit-formate.json` (format entries) and **one** practice set (A2 or B1; the run decides and says which) under a new slot id `certit` in the registry; page `/certit`; scoring "to verify" | A2/B1 | `exams-plida-certit` |
| `dtz` (`pruefungen/dtz/uebungssatz-1.json`, `src/lib/dtzTrainer.js`, `/nationality/dele-a2` + `/mock-test`, `/practice-set`) | DELE A2 mock for nationality | **B1 mock for citizenship**: the full timed mock in the trainer shape (the slot's B1 skills mock fits the level), framed for the citizenship path (§5.11). Point bands are ours and say so; real pass rules "to verify". Page `/citizenship/b1-mock` | B1 | `citizenship-path` |
| `dtz` paid (`paid/pruefungen/dtz/uebungssatz-{2,3,4}.json`) | more A2 mocks | set 2 becomes the **A2 mock for the long-term permit** (`/citizenship/a2-mock`); sets 3 and 4 are converted if time allows, else removed by `cleanup` (restore command recorded) | A2/B1 | `citizenship-path` / `cleanup` |
| `leben-in-deutschland` (`leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json`, `/ccse` + `/test`, `/facts`) | CCSE practice | **Civic knowledge** practice for the Accordo di integrazione: own questions written from public facts (Constitution, institutions, the Republic, regions, health, school, work, taxes, rights and duties, daily life). **Never** an official question bank or manual text. The Spanish "comunidades autónomas" extra becomes an optional **regions** extra, clearly labelled as not part of any real test. How the Accordo and its civic session work: "to verify". Page `/civic-knowledge` | A2–B1 reading | `civic-knowledge` |
| `pruefungen/fallen.json` (`/exams/traps`) | traps for DELE, SIELE, CCSE | traps for CILS, CELI, PLIDA, CERT.IT and the civic test (timing, *tu/Lei* in writing tasks, accents and double consonants in written parts, word counts) | | `exams-cils-celi` |
| `pruefungen/formate-a2-c1.research.json` | DELE and SIELE format research | CILS and CELI format research (`exams-cils-celi`), PLIDA and CERT.IT (`exams-plida-certit`); every entry dated and marked "to verify" until checked against the official pages | | both |
| `saetze-index.json`, `paid-manifest.json` | generated | regenerated by their scripts; never hand-edited | | whichever item changes sets |
| **add** `/exams/which-exam` | – | page "CILS, CELI, PLIDA or CERT.IT?" by purpose: citizenship (B1), long-term permit (A2), work, university; validity, format, results, price ranges "to verify" | | `exams-plida-certit` |
| **add** `/citizenship` | – | the language and civic path: **B1 for citizenship**, **A2 for the long-term EU permit**, who is exempt, the 2025 changes, order of steps; general orientation, facts "to verify" | | `citizenship-path` |

Exam facts the runs must treat as "to verify" (never as settled): which bodies and variants are
accepted for which purpose, the required level for citizenship (B1) and the long-term permit (A2),
exemptions (e.g. holders of a long-term permit, school or university diplomas obtained in Italy,
Accordo di integrazione status), the 2025 citizenship changes, CILS/CELI/PLIDA/CERT.IT parts and
timings per level, pass rules and score scales, validity, CELI level numbering, prices, session
dates, the civic test or session of the Accordo. The pages word these carefully and date them.

---

## 3. Grammar: slot map (91 slots)

Each slot file in `src/data/grammatik/` (and `src/paid/grammatik/`, the 11 C1 ids) becomes the
Italian topic below: same id, same schema. `src/data/arbeitsblatt/<id>.json` follows the same id
(`teachers`). "Level" is the new `level` value; the grammar items work **by new level**. "New slug"
is applied by `routes` only (`TOPIC_SLUGS` in `src/lib/routes.js`). The order inside a level is
fixed by `grammar-structure` (`grammatik-lehrplan.json`); the tables are grouped, not ordered.
Italian terms learners search for stay Italian in the slug.

### A1 (19) — `grammar-a1`

| Slot | Now (Spanish) | Italian topic | New slug |
|---|---|---|---|
| `nomen` | Nouns and gender | Nouns and gender: *il/la*, *-o/-a/-e*, exceptions (*il problema, la mano, il turista/la turista, il/la collega*) | `noun-gender` |
| `artikel` | Articles el, la… | Articles: *il, lo, l', la, i, gli, le* / *un, uno, una, un'*; the sound rule (*lo zaino, gli studenti, l'amico*) | `articles` |
| `personalpronomen` | Subject pronouns | Subject pronouns; *tu* or *Lei*; dropping the pronoun (*Parlo italiano*) | `subject-pronouns` |
| `praesens` | Present of -ar/-er/-ir | Present of regular *-are, -ere, -ire* (incl. *-isc-*: *finisco, capisco*) | `present-regular` |
| `konjugation` | Key irregulars | Key irregular verbs in the present: *andare, fare, stare, venire, dare, uscire, dire, bere, sapere* (modals follow at A2) | `present-irregular` |
| `praeteritum-sein-haben` | Stem-changing verbs | **Essere and avere**: forms and uses (*sono di…, ho trent'anni, ho fame, ho sete*) | `essere-avere` |
| `verb-position-2` | *ser* and *estar* basics | *Essere* or *stare*: the basics (*Come stai? Sto bene. Sono stanco.*) | `essere-stare-basics` |
| `berufe-mit-in` | *hay* or *está* | ***C'è / ci sono*** and *dov'è, ecco* | `ce-ci-sono` |
| `w-fragen` | Question words | Question words: *che/che cosa/cosa, chi, dove, quando, come, quanto, perché, quale* | `question-words` |
| `ja-nein-fragen` | Yes/no questions | Yes/no questions (intonation, no inversion), negation with *non*, *sì/no* | `yes-no-questions` |
| `plural` | Plurals | Plural of nouns and adjectives (*-o→-i, -a→-e, -e→-i*; *-co/-go, -cia/-gia*; invariable *città, caffè*; *uomo→uomini, l'uovo→le uova*) | `plurals` |
| `adjektive-nach-sein` | Adjective agreement | Adjectives: agreement (-o/-a/-i/-e, -e/-i) and usual position (*una casa bianca, i libri nuovi*) | `adjective-agreement` |
| `possessivartikel` | Possessives | Possessives *mio, tuo, suo, nostro, vostro, loro* with the article (*il mio libro*; *mia madre* without it) | `possessives` |
| `welcher-dieser` | Demonstratives | *Questo* and *quello* (*quel, quell', quegli, quei* introduced lightly); *qui/lì* | `demonstratives` |
| `gern` | *gustar* | ***Piacere***: *mi piace / mi piacciono*, *anche a me / neanche a me*, *a me sì / no* | `piacere` |
| `temporale-praepositionen` | Time and days | Telling the time and days (*Che ore sono? Sono le otto. È l'una. A mezzogiorno. Il lunedì. Di mattina.*) | `time-and-days` |
| `aduso` | *y/e, o/u, pero…* | *e/ed, o, ma, perché, anche, neanche/nemmeno* | `e-ma-o-perche` |
| `zahlen` | Numbers | Numbers, prices, phone numbers (*uno/un/una, ventuno, cento, mille/duemila*) | `numbers` |
| `wortarten` | Parts of speech | Parts of speech in Italian | `parts-of-speech` |

### A2 (21) — `grammar-a2`

| Slot | Now (Spanish) | Italian topic | New slug |
|---|---|---|---|
| `perfekt` | *Pretérito perfecto* | **Passato prossimo with *avere***: *ho mangiato*, regular and irregular participles (*fatto, detto, preso, letto*) | `passato-prossimo-avere` |
| `zusammengesetzte-verben` | *Indefinido* | **Passato prossimo with *essere***: movement and change verbs, agreement (*sono andata*), avere or essere | `passato-prossimo-essere` |
| `n-deklination` | *Imperfecto* | **Imperfetto**: forms and use for habits and descriptions (*da bambino vivevo…*) | `imperfect` |
| `trennbare-verben` | *ir a* + infinitive | Talking about the future: present for plans, *andare a + infinitive* in speech, *stare per* | `near-future` |
| `komposita` | *estar* + gerund | ***Stare* + gerundio** (*sto lavorando*) and gerund forms (*leggendo, dormendo, facendo*) | `stare-gerund` |
| `reflexive-verben` | Reflexive verbs | Reflexive verbs and daily routine (*mi alzo, si lava*), passato prossimo with *essere* | `reflexive-verbs` |
| `akkusativ` (+ `akkusativ.json`, `/object-pronouns`) | Direct object pronouns + personal *a* | Direct object pronouns *lo, la, li, le* (and *l'*), with the passato prossimo (*l'ho visto, li ho comprati*) | `object-pronouns` (keep) |
| `dativ` | Indirect object pronouns | Indirect object pronouns *mi, ti, gli, le, ci, vi, gli* (*loro* formal), *a me / mi*, with *piacere* | `indirect-object-pronouns` |
| `modalverben` | *tener que, poder* | **Modal verbs** *potere, volere, dovere* + infinitive, *sapere* + infinitive, *bisogna*, auxiliary choice (*non ho potuto / non sono potuto andare* note) | `modal-verbs` |
| `komparativ-superlativ` | Comparatives | Comparatives and superlatives (*più… di/che, meno, (tanto)… quanto, il più…, -issimo*; *migliore, peggiore, maggiore, minore*, *meglio/peggio*) | `comparatives` |
| `lokale-praepositionen` | Place | Place: *a, in, da, di*; *sopra, sotto, accanto a, davanti a, dietro, di fronte a, dentro, fuori*; *qui/qua, lì/là* (*Vado a Roma / in Italia / dal dentista*) | `prepositions-of-place` |
| `wechselpraepositionen` | *a* or *en* | **Prepositions with articles** (*del, al, dal, nel, sul, alla, nei, sulle*) | `articulated-prepositions` |
| `indefinitpronomen` | *algo, nadie…* | *Qualcosa/niente, qualcuno/nessuno, qualche, nessun, altro, ogni, ciascuno* | `indefinites` |
| `satzstellung` | *muy, mucho* | **Quantity**: *molto, poco, troppo, abbastanza, tanto* (adverb vs adjective), *un po' di*, the partitive (*del pane, dei libri*) | `quantity-partitive` |
| `negation` | Negation | Negation: *non, mai, niente, nessuno, neanche, né… né*; double negation (*non… mai*) | `negation` |
| `nebensaetze-weil-dass` | *porque, como* | *Perché, siccome, quindi, allora*; *che*-clauses with *penso che, dice che* (indicative at this level) | `perche-siccome` |
| `konjunktiv2-hoeflich` | Polite requests | Polite requests: *Posso…? Può… (Lei)? Mi dà…? Vorrei… Le dispiace se…?* | `polite-requests` |
| `positionsadverbien` | Frequency | Frequency: *sempre, spesso, a volte/qualche volta, quasi mai, di solito, ogni giorno* | `frequency-adverbs` |
| `adjektivdeklination-a2` | Adverbs in *-mente* | Adverbs in *-mente*; *bene/male* and *buono/cattivo* | `adverbs-mente` |
| `artikel-oder-nicht` | Article or none | Article or no article (*Mi piace il caffè. Sono medico. Ho la macchina. Vado in Italia / negli Stati Uniti. Parlo italiano.*) | `article-or-not` |
| `ordinalzahlen` | Ordinals and dates | Ordinals (*primo … decimo*), dates (*il 3 maggio, il primo maggio*), floors (*il secondo piano*), centuries | `ordinals-dates` |

### B1 (27) — `grammar-b1`

| Slot | Now (Spanish) | Italian topic | New slug |
|---|---|---|---|
| `zustandspassiv` | *Perfecto* or *indefinido* | **Passato prossimo or imperfetto** in a story (*Ieri pioveva e sono rimasto a casa*) | `passato-vs-imperfetto` |
| `praeteritum-plusquamperfekt` | *Indefinido* or *imperfecto* | **Trapassato prossimo** (*avevo già mangiato*) | `trapassato-prossimo` |
| `passiv-b1` | *Pluscuamperfecto* | ***Ci* and *ne***: place, *ci vuole*, *ne* as quantity and "of it" (*Ne ho due*) | `ci-ne` |
| `futur` | *Futuro simple* | **Futuro semplice**: forms, plans, predictions, promises; futuro anteriore (intro) | `future-simple` |
| `funktionen-von-werden` | *Condicional* | **Condizionale presente**: forms, advice (*Io, al tuo posto…*), polite wishes | `condizionale` |
| `imperativ` | Imperative | **Imperative**: *tu, Lei, noi, voi*; negative *tu* = *non* + infinitive; with pronouns (*dimmelo, non dirmelo / non me lo dire, me lo dica*) | `imperative` |
| `infinitiv-mit-zu` | Present subjunctive: forms | **Congiuntivo presente**: forms (regular and key irregulars) | `congiuntivo-presente` |
| `verben-als-nomen` | Subjunctive after wishes | Congiuntivo after wishes, opinions and feelings: *voglio che, spero che, penso che, è bello che, magari* | `congiuntivo-wishes` |
| `infinitiv-ohne-zu` | Infinitive or subjunctive | Infinitive or congiuntivo: *voglio andare / voglio che tu vada* (same or different subject) | `infinitive-or-congiuntivo` |
| `finalsaetze` | *para que* | *Per* + infinitive / *perché, affinché* + congiuntivo | `per-affinche` |
| `temporale-nebensaetze` | *cuando* + subj | Time clauses: *quando, appena, dopo che, mentre, finché*; *prima di / prima che* + congiuntivo | `time-clauses` |
| `konditionalsaetze` | *si* real | Real conditions: *se* + present / future (*Se piove, resto a casa*) | `se-real` |
| `als-oder-wenn` | *por* or *para* | **Combined pronouns** (*me lo, te la, glielo, ce ne*) | `combined-pronouns` |
| `temporale-praepositionen-b1` | *desde, desde hace* | *Da, per, fa, fra/tra, durante, entro, ci vuole/ci vogliono*; *Abito qui da tre anni* | `da-per-fa` |
| `relativpronomen` | Relative clauses | Relative clauses: *che, cui, il quale, chi, quello che, ciò che* | `relative-clauses` |
| `indirekte-fragen` | Indirect questions | Indirect questions and reporting in the present (*dice che…, mi chiede se…, non so dove…*) | `indirect-questions` |
| `lassen` | Verbal periphrases | ***Fare* + infinitive** (causative: *faccio riparare la macchina*), *lasciare* + infinitive | `fare-causative` |
| `konnektoren-grund-gegengrund` | Linkers | Linkers: *anche se* (indicative), *però, tuttavia, inoltre, invece, quindi, dunque* | `linkers` |
| `genitiv` | Possessive pronouns | **Verbal periphrases**: *stare per, finire di, smettere di, cominciare a, continuare a, tornare a, riuscire a, provare a* | `verbal-periphrases` |
| `adjektivdeklination` | Adjective position | Adjective position and short forms: *bello, buono, grande, santo* (*un bel ragazzo, un buon amico, un grand'uomo*) | `adjective-position` |
| `partizip-als-adjektiv` | *estar* + participle | Participles: *essere/stare* + participle (*il negozio è chiuso*), irregular participles, agreement | `participles` |
| `verben-praepositionen` | Verbs + prepositions | Verbs + prepositions: *pensare a, sognare di, dipendere da, credere in, aiutare a, finire di* | `verbs-prepositions` |
| `da-wo-woerter` | Pronouns after prepositions | Stressed pronouns and after prepositions: *a me, per te, con lui, senza di noi, da loro* | `stressed-pronouns` |
| `nutzen-benutzen` | *ser/estar* advanced | ***Sapere* or *conoscere***; verbs that confuse: *portare/prendere, andare/venire, lasciare/partire/uscire* | `sapere-conoscere` |
| `positionsverben` | Verbs like *gustar* | Verbs like *piacere*: *servire, mancare, bastare, interessare, sembrare, dispiacere, occorrere* | `verbs-like-piacere` |
| `wortbildung-nomen` | Word formation | Word formation: *-zione, -tà, -mento, -ista, -aio/-aia, -eria*; diminutives *-ino, -etto, -ello* | `word-formation` |
| `adjektive-als-nomen` | *lo* + adjective | *Il* + adjective (*il bello è che…, l'importante è…*), *ciò che, quello che* | `adjective-as-noun` |

### B2 (13) — `grammar-b2`

| Slot | Now (Spanish) | Italian topic | New slug |
|---|---|---|---|
| `konjunktiv2` | Imperfect subjunctive | **Congiuntivo imperfetto**: forms and uses (*volevo che venissi*) | `congiuntivo-imperfetto` |
| `modalsaetze` | *si* unreal | **Periodo ipotetico** (types 1–2: *se* + imperfect subjunctive + condizionale; type 3 intro) | `periodo-ipotetico` |
| `passiv` | Passive and *se* | **Passive and *si***: *essere/venire/andare* + participle, *si passivante* (*Si affitta appartamento*), impersonal *si* | `passive-and-si` |
| `relativsaetze-was-wo` | Advanced relatives | Relative clauses with congiuntivo and prepositions (*cerco qualcuno che sappia…; la casa in cui abito; il quale*) | `relative-clauses-advanced` |
| `zumal-wohingegen` | Reported speech | **Discorso indiretto** with tense shifts (*ha detto che sarebbe venuto, mi ha chiesto di aiutarlo*) | `reported-speech` |
| `zweiteilige-konnektoren` | Subjunctive in opinion | Congiuntivo in opinion and doubt: *credo che, può darsi che, dubito che, nonostante, benché, sebbene* | `congiuntivo-opinion` |
| `konsekutivsaetze` | Concession and consequence | Concession and consequence: *benché/sebbene/nonostante* + congiuntivo, *così… che, tanto… che, in modo che* | `concession-consequence` |
| `negationswoerter` | Probability | Probability: future and condizionale of conjecture (*saranno le tre, sarà uscito, sarebbe stanco*), futuro anteriore, condizionale passato | `probability` |
| `irgend` | Accidental *se* | **Gerundio and participle constructions** (*avendo finito, andando a casa, essendo stanco*) | `gerundio-constructions` |
| `fokuspartikeln` | Verbs of change | Verbs of change: *diventare, farsi, rimanere, restare, finire per, andare a finire* | `verbs-of-change` |
| `modalpartikeln` | Discourse markers | Discourse markers in speech: *allora, dunque, cioè, insomma, ecco, magari, mica, mah, boh* | `discourse-markers` |
| `adjektive-mit-praepositionen` | Adjectives + prepositions | Adjectives + prepositions (*stufo di, capace di, contento di/per, interessato a, pronto a*) | `adjectives-prepositions` |
| `nomen-verb-verbindungen` | Collocations | Collocations: *prendere una decisione, fare un giro, dare una mano, avere voglia di, fare attenzione, presentare reclamo* | `collocations` |

### C1 (11, free + paid slots) — `grammar-c1`

| Slot | Now (Spanish) | Italian topic | New slug |
|---|---|---|---|
| `konjunktiv-1` | Sequence of tenses | **Concordanza dei tempi**: sequence of tenses with the congiuntivo, congiuntivo trapassato | `sequence-of-tenses` |
| `es-korrelat` | Cleft sentences | Emphasis and cleft sentences: *È Anna che…, Quello che mi serve è…, È qui che…*; dislocation (*Il libro, l'ho letto; a me, mi piace*) | `cleft-and-emphasis` |
| `passiversatz` | Conditions without *si* | Conditions without *se*: *qualora, purché, a patto che, a meno che non, nel caso in cui*, gerund conditions (*volendo*) | `conditions-without-se` |
| `futur-2` | Non-finite clauses | Non-finite clauses: *participio assoluto* (*finita la riunione, …*), gerundio, *dopo aver + participle*, *a dire il vero* | `non-finite-clauses` |
| `irreale-vergleiche` | *como si* | *Come se* + congiuntivo; periodo ipotetico type 3 and mixed (*Se l'avessi saputo, sarei venuto*) | `come-se-unreal` |
| `subjektive-modalverben` | Modal periphrases | **Passato remoto**: forms, recognising it in reading and in southern speech (*andai, fu, disse*) | `passato-remoto` |
| `nominale-praepositionen` | Formal connectors | Formal connectors: *a causa di, in virtù di, ai sensi di, tuttavia, pertanto, nondimeno* | `formal-connectors` |
| `nominalisierung` | Nominalisation | Nominalisation in formal and administrative writing (*la presentazione della domanda*) | `nominalisation` |
| `partizipialattribute` | Formal relatives | Formal relatives: *il quale, la cui, cui* + preposition; congiuntivo nuances | `formal-relatives` |
| `textkohaerenz` | Cohesion | Cohesion: reference, ellipsis, *ciò*, register, linkers | `cohesion` |
| `verbpraefixe` | Prefixes | Prefixes and derivation: *dis-, ri-, pre-, in-, sovra-, contro-, anti-*; alterations (*-one, -accio*) | `prefixes` |

No slot is dropped. Gaps noted for later (new files, English ids): *elision and truncation* (*un po', buon, qual è*), *si impersonale vs passivante* as a stand-alone usage topic, *ne* partitive drills, *stare/essere in the south*.

### 3.1 Grammar side files

| File | Italian course | Item |
|---|---|---|
| `grammatik.json` (quick quizzes per slot) | follow the slot map | each `grammar-<level>` for its slots |
| `akkusativ.json` (`/object-pronouns`) | direct object pronouns with agreement | `grammar-a2` |
| `grammatik-lehrplan.json`, `grammatik-verwandt.json` | Italian syllabus order per level, related topics recomputed | `grammar-structure` |
| `kursinhalte.json`, `content/program.json` | Italian course plan per level (`program.json` unit titles also by `vocab-*`) | `grammar-structure` |
| `nachschlagen/starke-schwache-verben.json` (`/grammar/irregular-verbs`) | irregular verbs reference: sections `schwach` = regular, `stark` = irregular (*essere, avere, andare, fare, dire, venire, potere, volere…*), `gemischt` = *-isc-* and verbs with spelling changes; rows *io presente · participio · imperfetto* + `aux` | `grammar-structure` |
| `nachschlagen/trennbare-verben.json` (`/grammar/reflexive-verbs-list`) | pronominal verbs reference (*accorgersi di, andarsene, cavarsela, farcela, mettersi a*) | `grammar-structure` |
| `nachschlagen/verben-mit-praepositionen.json` | verbs + prepositions reference | `grammar-structure` |
| `wortarten.json` | parts of speech (Italian) | `grammar-structure` |
| `praepositionen-trainer.json` (`/prepositions`) | packs: *a / in / da / di*, prepositions with articles, *da / per / fa*, place, time; pack ids kept | `grammar-structure` |
| `uebersetzungen/grammatik.json`, `grammatik-themen.json` | empty now; refill only with reliable translations | `grammar-structure` (optional) |
| `uebersetzungen/grammatik-ui.json` | keyed by German UI strings | **leave** (§9) |
| `verbtabellen.json` | Italian conjugation tables (§4.1) | `conjugation-data` |
| `grammatik-start/*` + generator | "Italian Grammar Start A1–B1" (§5.1) | `grammar-start-book` |
| `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json` (`/artikel` trainer) | **il / lo / la / l' trainer**: rule packs *-o → il (lo before z-, s+consonant, gn-, ps-)*, *-a → la*, *-e* (mixed: *il fiore, la notte*), *-zione/-sione/-tà/-tù → la*, *-ma (Greek) → il (il problema, il tema)*, *-ista → il/la*, vowel → *l'*, exceptions (*la mano, il/la…, l'uovo, il pneumatico*); plural articles *i/gli/le*; `artikel-haeufigkeit.json` stays empty until ranks exist | `games` |

---

## 4. New modules

### 4.1 Conjugation tables (`conjugation-data`)

`src/data/verbtabellen.json` keeps `about`, `groups`, `verbs`. Six person rows in `PERSONS`
(`src/lib/verbtabellen.js`): `io · tu · lui/lei/Lei · noi · voi · loro/Loro`. A tense is a comma
list of six forms (as now).

| Key | Holds |
|---|---|
| `inf` | infinitive (*parlare*, *alzarsi*) |
| `group` | `hilfsverb` = *essere, avere, stare, andare*; `modal` = *potere, volere, dovere, sapere*; `unregelmaessig` = irregular; `regelmaessig` = regular models *-are/-ere/-ire*; `trennbar` = reflexive/pronominal verbs; **new** `isc` = *-ire* verbs with *-isc-* (*finire, capire, preferire*) with its name and `what` in `groups`; **new** `spelling` = verbs with spelling changes (*mangiare, cominciare, pagare, giocare*) |
| `regular: true` | forms generated by `verbtabellen.js` from the ending (the run rewrites the Spanish generators as Italian *-are/-ere/-ire* generators incl. *-isc-* and the spelling rules *-care → -chi, -gare → -ghi, -ciare → -ci, -iare*) |
| `praes` | presente indicativo |
| `praet` | **imperfetto** (the everyday second tense; stays `praet` so the trainer's "tense 2" keeps working) |
| `p2` | participio passato (compound tenses: *avere/essere* + `p2`, generated, not stored: passato prossimo, trapassato prossimo, futuro anteriore, condizionale passato, congiuntivo passato and trapassato) |
| **new** `aux` | `"avere"`, `"essere"` or `"avere/essere"`: chooses the auxiliary of the compound tenses and shows participle agreement (*sono andato/a, siamo andati/e*) |
| **new** `rem` | passato remoto (shown in a reading-oriented section; irregulars stored, regulars generated) |
| **new** `fut` | futuro semplice |
| **new** `cond` | condizionale presente |
| **new** `subj` | congiuntivo presente |
| **new** `subjImpf` | congiuntivo imperfetto |
| **new** `imp` | imperativo, six slots, `–` for *io*: `–, parla, parli, parliamo, parlate, parlino`; the negative *tu* is generated (*non parlare*), the negative *Lei/noi/voi* from the affirmative with *non* |
| **new** `ger` | gerundio |
| `note` | usage note in English |
| `regional` | §1.5 (e.g. *stare* in the south, passato remoto in speech) |

Irregular verbs store only the tenses that are irregular; the generator fills the rest and flags
every form that differs from the regular pattern (`x`). Minimum set: the regular models (*parlare,
vedere/credere, dormire, finire*), the spelling-change verbs *mangiare, cominciare, pagare,
giocare, cercare*, then *essere, avere, stare, andare, fare, dare, dire, venire, uscire, potere,
volere, dovere, sapere, bere, rimanere, scegliere, tenere, togliere, vedere, leggere, scrivere,
prendere, mettere, chiudere, aprire, vivere, nascere, morire, piacere, sentire, salire, conoscere,
spegnere, tradurre, porre, decidere, perdere, rompere, offrire, apparire, sedersi*, reflexive models
*alzarsi, chiamarsi, andarsene*. Every form checked against a standard reference (Treccani,
Zingarelli, Wiktionary as a cross-check); accents (*farò, sarà, andò, perché*)
checked by script.

### 4.2 Conjugation trainer (`conjugation-trainer`) — keep for Italian

The trainer exists (Spanish course); it is kept and converted: `/grammar/conjugation`
(`src/pages/grammar/conjugation.astro`), `src/lib/conjugationTrainer.js`,
`src/data/conjugation-trainer.json`; styles and the practice workspace stay. No new dependencies.

- Drills generated from `verbtabellen.json`: choose tense/mood (presente, imperfetto, passato
  prossimo, trapassato prossimo, futuro, condizionale, congiuntivo presente/imperfetto/passato/
  trapassato, imperativo affirmative/negative, gerundio, passato remoto), verb group (regular
  *-are/-ere/-ire*, *-isc-*, spelling-change, irregular, reflexive) and persons (all six). Input:
  typed form with the key row **à è é ì ò ù**, or a choice of 3–4 forms on small screens. Accent
  rule §1.2 (`accentOnly`). Compound tenses ask for the auxiliary and the participle agreement
  (*siamo andati/e*).
- Hand-written sets in `conjugation-trainer.json` (`{ id, level, title, kind, variety, items }`,
  `kind`: `form` | `choice`): **avere or essere** in the passato prossimo (A2, B1), **passato
  prossimo or imperfetto** in context (B1), **participle agreement** (A2/B1), **indicativo or
  congiuntivo** (B1, B2), **-isc- or not** (A2). Every item: prompt with `___`, `options` (exactly
  one correct, or an `answer` list), `explain` in English, `variety`.

### 4.3 Business Italian (`business-italian`) — convert, B1–C1

The Spanish course's `business-spanish` module becomes **Business Italian**: page
`/business-italian` (+ `/business-italian/[unit]`), data `src/data/business-italian/<unit>.json`
(the current `business-spanish/` folder is renamed by `business-italian`, with its lib
`src/lib/businessSpanish.js` → `businessItalian.js` and `scripts/check-business-spanish.mjs` →
`check-business-italian.mjs`, and the page folder; the Italian run records the renames).

- Units (same ids as now): `correos` formal emails (*Gentile Dottor Rossi, Egregio…, In allegato…,
  In attesa di un Suo riscontro, Cordiali saluti, Distinti saluti*), `reuniones` meetings (opening,
  agreeing, disagreeing politely, summarising), `llamadas` phone calls (*Pronto, chi parla?, Le
  passo l'ufficio…*), `entrevista` job interviews in Italy (questions, talking about experience,
  *Lei*), `curriculum` CV and cover letter conventions in Italy (Europass, *autorizzo il trattamento
  dei dati personali* privacy line; photo and personal data conventions "to verify"), `negociacion`
  (C1) negotiating and presenting figures.
- Unit shape (as now, `es`→ `it` text key kept as the schema has it): `{ id, level, title,
  variety, reviewed, intro, introEasy, phrases: [{ use, <text>, en, register, variety, regional? }],
  models: [{ title, text, notes }], tips, words: [berufe deck entries or `{ ref, example, en?, deHint? }`],
  exercises: [{ id, context?, prompt, options, answer, explain, regional? }] }`. The phrase text
  key keeps the name the code reads (`es` is renamed to `it` by `business-italian` together with its
  validator and `src/lib/businessItalian.js`, in one commit; the report says so). Rules: tu/Lei,
  formal registers *Gentile/Egregio*, `regional` for differences; Italy conventions first.

### 4.4 Patente vocabulary (`patente-vocab`) — convert (DGT → Italy)

- **Vocabulary only**: no official quiz questions, no copied manual text, no claim to prepare for
  the exam on its own. Page **`/patente-vocabulary`** (replaces `/dgt-vocabulary`), data
  `src/data/patente/vocabolario.json` (replaces `src/data/dgt/vocabulario.json`; the folder and
  file are renamed by `patente-vocab`, the validator `check-berufe.mjs`/`berufeCore.js` reads
  `patente/`), in the **berufe deck schema** (groups of words with `gender`, `plural`, `example`,
  `translations.en`, `variety`; refs `{ ref, example }` into the lexicon).
- Groups: *l'auto* (parts, controls: *il volante, la frizione, il cambio, i freni, la cintura*),
  *la strada* (*l'autostrada, la corsia, la rotatoria, l'incrocio, il marciapiede, la banchina*),
  *i segnali* (sign families: *segnali di pericolo, divieto, obbligo, indicazione*; *precedenza,
  stop*; no images copied from official material), *le manovre* (*sorpassare, dare la precedenza,
  parcheggiare, svoltare, fare retromarcia*), *l'esame e l'autoscuola* (*patente B, esame di teoria,
  prova pratica, la Motorizzazione, i punti della patente, l'istruttore*), *documenti e multe*
  (*il libretto, l'assicurazione (RC auto), il bollo, la multa, l'autovelox, la ZTL, il Telepass*),
  and **converting a foreign licence** (*conversione/riconoscimento della patente, traduzione
  giurata*): orientation only, rules depend on the country of issue and are "to verify".
- Orientation box: the theory test can be taken in some other languages (which: "to verify"), and
  the Ministry of Infrastructure and Transport / Motorizzazione site is the official source.
- Terms in flux (*foglio rosa* replaced by the practice authorisation, price lists, test format)
  are "to verify" and the page uses the general words.

---

## 5. Module map (convert)

### 5.1 Placement, learner shell, grammar book

| Module | Italian course | Item |
|---|---|---|
| `einstufung.json` (6 items per level, 2 drawn, each tests one level-typical feature) | Same design, standard Italian. A1: *essere/stare*, present regular, *il/la/l'/lo*, *piacere*, *c'è*; A2: passato prossimo (avere/essere), imperfetto, object pronouns, prepositions with articles, comparatives; B1: *passato prossimo/imperfetto*, congiuntivo presente (wishes), *ci/ne*, condizionale, imperative; B2: congiuntivo imperfetto, periodo ipotetico, passive with *si*, reported speech, congiuntivo in relatives; C1: concordanza dei tempi, *come se*, conditions without *se*, formal relatives, cleft. | `placement-test` |
| `einfach-pfad.json` ("Learn step by step", A1–B1) | Beginner path built on the Italian grammar slots and A1–B1 vocab units; first steps for a newcomer in Italy (greetings, *mi chiamo*, numbers, *dov'è…?*, an appointment at the Comune, the *codice fiscale*) | `beginner-path` |
| `/step-by-step` screens (`src/lib/einfach-view.js`, `einfach-app.js`, `einfach-content.js`, noscript in `src/pages/step-by-step.astro`, `docs/easy-mode-tier1-v1.md`) | Italian units; the recipe doc rewritten for Italian units; *il/lo/la/l'* in the views. Where grammar refs break, `node scripts/repoint-einfach-grammar.mjs <topics>` repoints them (and is deleted when the path is done). | `beginner-path-ui` |
| `grammatik-start/en.json` (base book) + `scripts/generate-grammatik-start-pdf.mjs`, `check-grammatik-start.mjs` | **"Italian Grammar Start A1–B1"**, brand icanspeak Italian, 10 chapters on the Italian A1–B1 topics; key `titleDe` holds the English title (as now). The `de.json` (German explanations) is reset with `--skeleton de` unless the run writes German explanations. | `grammar-start-book` |

### 5.2 Vocabulary

| Module | Italian course | Item |
|---|---|---|
| `content/lexicon/a1…b2.json` (units of 25 words, topics) | Same units, unit ids and topic slugs where the topic fits; Italian lemmas for standard Italian, chosen by topic and frequency, with the resident's needs first (*la residenza, il permesso di soggiorno, il codice fiscale, la tessera sanitaria, il medico di base, il contratto, la busta paga, l'affitto*); schema §1.4, `variety` §1.5 | `vocab-a1` … `vocab-b2` |
| `content/lexicon/c1.json`, `c2.json` | 24 + 16 units, same conventions | `vocab-c1-c2` |
| `wortschatz.json` (phrase cards `front/note/translations`) | Italian phrase cards; `note` = usage tip in English (tu/Lei); `variety` | `vocab-a1` |
| `haeufigste-woerter.json` + `scripts/haeufigste-woerter.mjs`, `attach-ranks.mjs`, `artikel-haeufigkeit.mjs` | read `it_50k` (licence "to verify"); data regenerated only when the list can be downloaded | `vocab-a1` |
| `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json` | keep pictures, re-key to the Italian ids per level | each `vocab-*` |
| `lexicon/i18n/<lang>.json` | Italian → learner language (§1.4): `de`, `es`, `fr`, `pt` | each `vocab-*` for its level |
| `uebersetzungen/woerter-uk.json` | Ukrainian glosses of the old German words | `vocab-a1` decides: refill for Italian A1 if reliable, else empty it (`entries: {}`) |

### 5.3 Listening (`hoeren.json`, ids kept, settings in Italy) — `listening`

| Id | Italian script |
|---|---|
| `a1-ansage-bahnhof` | Announcement at a train station (*binario*, delay) |
| `a1-anruf-arzt` | Voicemail from the *medico di base* / ASL: your appointment |
| `a1-supermarkt` | At the supermarket: *Dov'è…?* |
| `a1-verabredung` | Phone call: *Ci vediamo?* |
| `a2-amt-termin` | At the Comune: changing an *appuntamento* |
| `a2-wohnungsbesichtigung` | Viewing a flat (*appartamento*) |
| `a2-radio-wetter-verkehr` | Radio: weather and *viabilità* |
| `a2-paketdienst` | Voicemails: a parcel and the plumber (*idraulico*) |
| `b1-krankmeldung` | Calling in sick at work (*certificato di malattia*) |
| `b1-elterngespraech` | Meeting with the class teacher (*colloquio con l'insegnante*) |
| `b1-radio-muelltrennung` | Radio feature: *raccolta differenziata* and the bin calendar |
| `b1-durchsage-ersatzverkehr` | Announcement: line closure and replacement bus |
| `b2-diskussion-homeoffice` | Team meeting: *smart working* |
| `b2-interview-anerkennung` | Interview: getting a foreign degree recognised (*riconoscimento del titolo*) |
| `b2-beschwerde-versicherung` | Complaint to an insurance company |
| `b2-vortrag-ehrenamt` | Short talk: volunteering (*volontariato*) |

`voices` = it-IT voices (Azure names "to verify" before the first render); every script carries
`variety: "it-IT"`; `uebersetzungen/hoeren.json` stays empty. Places and firms invented.

### 5.4 Reading and writing — `reading-writing`

| Module | Italian course |
|---|---|
| `lesen.json` (B1 short text, reading tasks 1–4, form task, writing prompt, error hunt) | B1 reading set from life in Italy: notices matching (*condominio*, school, gym), a local news article true/false, forum posts *chi lo dice?*, an interview; form = an invented municipal form (library card, sports-centre card); writing prompt = a formal email; error hunt = typical learner errors (*sono 20 anni, la problema, io ho andato*). Same ids, levels, types, `kind`s, `from` links; the Spanish-added ids (`a1-phone-messages`, `a2-padron-notice`, `a2-padron-form`, `a2-email-school`, `b1-email-landlord`, `b1-email-employer`, `b2-opinion-text`) keep their ids (content converted: `a2-padron-*` become the Comune/Anagrafe notice and form), their slugs are renamed by `routes`. |
| `fertigkeiten/lesen.json`, `fertigkeiten/schreiben.json`, `/writing/[id]` data | Italian reading/writing hubs and tasks A1–B2: forms, WhatsApp messages, formal email to a landlord/school/employer, a letter from the *Comune* or the *Agenzia delle Entrate*, a rental contract (*contratto di locazione*), complaint, opinion text |
| `uebersetzungen/lesen.json`, `schreiben.json` | stay empty |
| `src/lib/schreibKorrektur.js` | checks Italian (LanguageTool `it`, own rules for accents and apostrophes); LanguageTool is only called if the backend flag allows it (it is off) |

Formats: dates `11/11/2026`, times `17:30`, money `45 €`; phone numbers are obvious placeholders
(`3xx 000 0000` style; Italy has no reserved fiction range: "to verify"); emails use `example.com`.
Writing tasks use *Lei* in formal emails and sign-offs (*Cordiali saluti*).

### 5.5 Speaking — `speaking`

| Module | Italian course |
|---|---|
| `sprechen.json` (3 picture tasks) | 3 picture descriptions (A2) with follow-up questions, same pictures |
| `sprechen-b1b2.json` stages | B1/B2: **1 · The photo**, **2 · The talk**, **3 · Conversation/role play**; modelled on the oral tasks of CILS, CELI, PLIDA and CERT.IT; timings "to verify" and labelled "in the style of" |
| `redemittel.json` (14 functional sets) | same 14 set ids and phrase order (the beginner path addresses `redemittel:<set>#<index>`); key `de` = Italian phrase, `en` = English meaning/usage; **tu and Lei throughout** (both forms where the set needs them); the place set → *Dov'è la palla? Sotto il tavolo.*; `variety` on every phrase |
| `redemittel-i18n/<lang>.json` | re-keyed to the Italian phrases; `de`, `es`, `fr`, `pt` where reliable; `it.json` emptied (deleted by `cleanup`) |
| `fertigkeiten/sprechen.json`, `uebersetzungen/sprechen.json` | Italian hub; translations empty |

### 5.6 Pronunciation — `pronunciation`

| Module | Italian course |
|---|---|
| `ausspracheregeln.json` | Standard Italian rules in the old rule slots: the seven vowels (open/closed *e, o*, the standard marks them only in dictionaries), stress and written accents (*parola piana, tronca, sdrucciola*; *città, perché, papà*), **double consonants** (*pala/palla, caro/carro, nono/nonno*), *c/g* before e/i (/tʃ dʒ/) vs *ch/gh* (/k g/), *sc* (/ʃ/, *sci/sce/schi/sche*), *gl* (/ʎ/), *gn* (/ɲ/), *z* (/ts/, /dz/), *s* (voiced/unvoiced, regional), *r* trill, *h* silent, *qu*, linking and *raddoppiamento sintattico* (intro), elision |
| `aussprache-check.json` | sentences A1–B1 (minimal pairs *pena/penna, sete/sette, casa/cassa, capello/cappello, anno/ano*), question slots stay questions |
| `satzmelodie.json` | intonation: yes/no questions (rise), *wh*-questions (fall), lists, exclamations, polite requests |
| `zungenbrecher.json` | traditional Italian tongue twisters (*trentatré trentini…*, public domain) by level |
| `aussprache-muttersprache.json` | drills per first language: English (vowel reduction, double consonants, *r*, aspirated *p/t/k*), German (final devoicing, *z*, *ch/sch*, *h*), Spanish (double consonants, *z*, *gl/gn*, *b/v*, *s* sonorous), French (*r*, nasal vowels, stress on the last syllable, *gn*), Portuguese (vowel reduction, *-ão*, *lh/nh*, *s*); other slots only where reliable |
| `fehler-nach-sprache.json` `area: "aussprache"` | rewritten together with the drills (they link both ways: `pnpm check:aussprache`) |

Every `audio` flag stays `false` until it-IT recordings exist; the pages read with an it-IT browser
voice (`LANG = "it-IT"` in the check libs, the dialogue voice in `src/lib/spielKit.js`).
Regional pronunciation (*gorgia toscana*, Roman *-gl-*, northern *s*) goes into `regional` notes only.

### 5.7 Idioms, mistakes, slang — `idioms-mistakes`

| Module | Italian course |
|---|---|
| `redewendungen.json` | Italian idioms and proverbs B1–C1 (*in bocca al lupo, costare un occhio della testa, avere le mani in pasta, non vedere l'ora*); `de` = the idiom, `en` = English meaning; origin only where well sourced |
| `umgangssprache.json` | colloquial Italian (*figo, boh, mica, magari, che palle, dai, ci sta*) with register notes; mild-to-strong swearing with warnings, no slurs |
| `typische-fehler.json` | typical mistakes (*io ho 20 anni → ho 20 anni, ho andato → sono andato, la problema, mi piace i libri, sono d'accordo, la gente sono*) in the same 5 group ids |
| `fehler-nach-sprache.json` | mistakes per first language. Language slots: `italienisch` (Italian speakers) → **Spanish speakers** (id `spanisch`; interference gets its own set); keep `englisch`, `deutsch`, `franzoesisch`, `portugiesisch`; keep `arabisch`, `ukrainisch`, `russisch`, `chinesisch`, `rumaenisch` (large groups in Italy) only with reliable content; add `albanisch` only if reliable; `tuerkisch`, `persisch`, `polnisch`, `vietnamesisch`, `tagalog` kept only if the run writes reliable content, otherwise removed (with their drills) |
| `wortfallen.json` | false friends for English (*camera, parenti, libreria, morbido, educato, eventualmente, attualmente, firma, fattoria*), German (*bravo, mappa, gift/Gift*), Spanish (*burro, salire, cena, subito, largo, mancia*), French (*pomme/pomme de terre, camion, voiture*) and Portuguese (*oficina, esquisito, cadeira, apelido*) speakers; group ids new (English), en.json keys re-keyed in the same commit |
| `synonyme.json` | Italian synonym groups A1–B2 with register differences |

### 5.8 Culture and knowledge (Italy first, then the Italian-speaking world) — `culture`

`kultur.json` topics, ids kept:

| Id | Level | Italian course topic |
|---|---|---|
| `duzen-siezen` | A1 | *Tu* or *Lei*: how formal to be |
| `pfand` | A1 | Greetings: *baci*, handshake, *Ciao / Buongiorno / Salve* |
| `sonntagsruhe` | A1 | Daily rhythm: meal times, opening hours, *pausa pranzo*, Sundays and *festivi* |
| `trinkgeld` | A1 | The bar: coffee at the counter or at the table, *lo scontrino*, *il coperto*, tipping |
| `bundeslaender` | A2 | The 20 regions (5 with special statute), provinces and *comuni* |
| `feiertage` | A2 | Public holidays: national (25 aprile, 1 maggio, 2 giugno, Ferragosto), patron saints, *i ponti* |
| `muelltrennung` | A2 | *Raccolta differenziata*: the bins and calendar (rules vary by Comune) |
| `termine` | A2 | Appointments: booking online, *numero da ritirare*, CUP, Questura portal |
| `anmeldung` | B1 | *Residenza*: registering at the Anagrafe, *cambio di residenza* |
| `krankenversicherung` | B1 | Public health (SSN): *tessera sanitaria, medico di base, pronto soccorso, guardia medica, ticket*; registering at the ASL |
| `mieten` | B1 | Renting a flat: *contratto 4+4 / 3+2, caparra, spese condominiali*, registration of the contract |
| `schulsystem` | B1 | The school system: *scuola dell'infanzia, primaria, secondaria di primo e secondo grado, esame di maturità* |
| `arbeit-finden` | B1 | Finding a job: *Centro per l'impiego*, *curriculum*, contract types (*tempo determinato/indeterminato*), *CCNL* |
| `ausbildung` | B2 | Vocational training and university; recognition of qualifications (*equipollenza*, "to verify" bodies) |
| `kuendigung` | B2 | Leaving a job: *dimissioni*, *preavviso*, *TFR*, *NASpI* (general orientation) |
| `oeffentlich-rechtlicher-rundfunk` | B2 | Public media: RAI, the *canone*, regional offices |
| `vereine` | B2 | Associations: *pro loco*, volunteering (*volontariato*), the *oratorio* |
| `foederalismus` | C1 | State, regions, provinces, *comuni*; regions with special statute |
| `sozialversicherung` | C1 | *INPS, INAIL*, the *codice fiscale* and contributions |
| `wahlen` | C1 | Elections and the electoral system (factual, neutral) |
| `erinnerungskultur` | C2 | From the Republic of 1946 to today (factual, neutral) |
| `grundgesetz` | C2 | The Constitution of 1948 and the Constitutional Court |
| `mitbestimmung` | C2 | Unions, *CCNL* and workers' rights (*Statuto dei lavoratori*) |

| Other module | Italian course |
|---|---|
| `kultur-insider.json`, `kultur-bilder.json` | Italy insider tips (*l'aperitivo*, *il caffè al banco*, the *condominio* group chat, *la domenica a pranzo*); pictures only where they fit |
| `wusstest-du.json`, `kalender-saetze.json` | "Did you know?" about Italian; daily sentences in Italian with English |
| `zitate.json`, `uebersetzungen/zitate.json` | Italian-language quotes, public domain or properly attributed short quotes, verified attribution (author death year and public-domain status "to verify" per author) |
| `/explore` (+`/films`) | Italian films and series (titles and short own descriptions only), then Swiss Italian and the world |
| `/knowledge/country-and-culture`, `/knowledge/learning` | Italy and the Italian-speaking world, learning tips for Italian (text via `ui-pages-*`) |

Facts that change (fees, figures, rules) need a source and an "as of" date in the sourcing note.
Italian in Switzerland, San Marino and the world comes after Italy (`culture` second part).

### 5.9 Games

| Module | Italian course | Item |
|---|---|---|
| `artikel-sprint` (`/games/gender-sprint` → `/games/article-sprint`) | **Article sprint**: *il / lo / la / l'* gates, *i / gli / le* plural gates; traps *lo zaino, l'amica, il problema, la mano, gli studenti* | `games` |
| `/artikel` trainer + `artikel*.json` | il/lo/la/l' trainer (§3.1) | `games` |
| `quakiSpringt/fragen.json`, `turm.json` | Italian quiz pools per level | `games` |
| `hochstapler/themen.json`, `redemittel.json`, `strings.js` | Italian impostor themes on Italian lexicon ids, sentence starters A1–C1 | `games` |
| `satzregen/saetze.json` + `quelle.txt` | own Italian sentences; word order is freer than English: every other correct order is an `{alt}` in `quelle.txt`; mode ids kept (`v2` statements and questions, `janein` yes/no, `klammer` → clitic pronouns before the verb, `nebensatz` → indirect questions) | `games` |
| `nussnacht` (Nut night, `src/lib/nussnacht`) | shots *il / lo / la / l'* from lexicon `gender` (use `articles.js`; plural creatures take *i/gli/le*); bosses = the traps (*lo zaino, l'uovo, il problema, la mano, gli gnocchi*); "two-word cracker" upgrade → compound nouns (*il cavatappi, l'apriscatole* → *il/l'*) | `games-arcade` |
| `hoerSafari` (Listening safari) | hear article + noun, hit the picture; **no Italian audio exists**, so the browser it-IT voice speaks, and without speech the word is shown at once | `games-arcade` |
| `buergeramt` (`/games/extranjeria` → `/games/questura`, `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/*`) | **Questura and Comune sim**: the invented town of Casalbruno. Day 1 = *Anagrafe* desk at the Comune (residenza: ID, proof of address, *codice fiscale*); later days = the *Questura* appointment desk (permesso di soggiorno: the Poste kit and receipt, passport, photos, *marca da bollo*, fingerprints; renewal), then *Agenzia delle Entrate* (codice fiscale) and *ASL* (tessera sanitaria, choosing a *medico di base*). The player checks **paperwork completeness only**; citizenship and the Accordo di integrazione appear as customers who are referred to information ("this desk doesn't decide that") plus a "general orientation, not legal advice" box. Paper kinds keep their ids (`ausweis` = ID/passport, `pass` = passport, `meldeschein`/`abmeldung` = application form with boxes, `wgb` = rental contract / proof of address); rule `art: "echt"` = usual practice with a source type, `"lindenau"` (value kept) = made-up Casalbruno rule. Fee amounts, form names and the steps are "to verify". | `questura-sim` |
| `knigge` (`/games/manners`, `src/lib/knigge/scenes.js`) | manners in Italy: greetings and *baci*, *tu/Lei*, meal times, *il bar*, queuing (*la fila*) at the Comune, neighbours, punctuality; `de` = the Italian line, `en` = English meaning; wheel `sie`/`du` = *Lei*/*tu* | `games-dialogue` |
| Lindenau / Brambleford RPG (`/games/villabruno` → town name, `src/lib/lindenau/*`, `uebersetzungen/lindenau.json`) | **Casalbruno**, an invented Italian town (working name: `games-dialogue` checks no real *comune* has it, else picks another and updates this plan): errands at the *panetteria*, train station, ASL, supermarket, new neighbour, *il bar* | `games-dialogue` |
| `/game` (live-quiz join page) | content from the teacher quiz | `teachers` |

### 5.10 Teachers — `teachers`

| Module | Italian course |
|---|---|
| `arbeitsblatt/<id>.json` | tandem extras for the Italian topic in each slot (blue tile: infinitive → form, article, singular → plural, *tu → Lei*; choice tiles *avere / essere*, *il / lo*, *passato prossimo / imperfetto*); `src/lib/arbeitsblatt/wortschatz.js` must accept `il/lo/la/l'` nouns |
| `partneruebungen/*` | same scenarios in Italy: hairdresser, *scambio linguistico*, market stall, new room, passato prossimo memory, picnic, weekend bingo, *festa di quartiere*, shared-flat dice; drafts until reviewed |
| `unterricht-wortschatz.json`, `lernstunde-texte.json`, timetable texts in `src/lib/stundenplan.js` | Italian lesson-mode word fields and phase texts (phase detection strings adapted) |
| `downloads.json` | Italian download catalogue (links to the four certifying bodies, Treccani, the Interior and Infrastructure ministries' pages) |
| printable games, tests, surveys | domino *il / lo / la*, plurals, word ↔ meaning; class-test detection for Italian grammar words |
| `einstieg-bilder.json` | photo ids, language-neutral: keep |

### 5.11 Life in Italy: citizenship, civic knowledge, Questura

| Item | Files |
|---|---|
| `civic-knowledge` | `leben-in-deutschland.json` (meta: `totalQuestions`, `passScore` "to verify"; questions own, grouped by topic area; every fact with a source in the sourcing note), `uebersetzungen/leben-in-deutschland.json` (emptied unless reliable), `/civic-knowledge` pages (`/test`, `/facts`); the CCSE PDFs and downloads on `/facts` go |
| `citizenship-path` | `pruefungen/dtz/uebungssatz-1.json` (B1 mock), paid `dtz/uebungssatz-2.json` (A2 mock for the permit), `src/lib/dtzTrainer.js` texts, new `/citizenship` page (`src/pages/citizenship.astro`), registry `dtz` texts |
| `questura-sim` | `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/{regeln,faelle,daten,kunde,tisch}.js` texts |

### 5.12 Italian for work (`data/berufe/`, now `/spanish-for-work`) — `italian-for-work`

Same 10 sector ids (progress keys), content for Italy, sectors where immigrants in Italy often
work first (sector swaps kept from the Spanish course):

| Id | Italian course sector |
|---|---|
| `pflege` | Care work: elderly care at home and in residences (*assistente familiare / badante, RSA, OSS*) |
| `gastronomie` | Hospitality: bars, restaurants, kitchens (*ristorazione*) |
| `kita` | **Cleaning and domestic work** (*pulizie, colf*, incl. childcare in families) |
| `elektro-technik` | **Agriculture and farm work** (*campagna, raccolta, serre*; with workers' rights vocabulary: *contratto, busta paga, orario*) |
| `bau-handwerk` | Construction and trades (*cantiere, muratore, idraulico*) |
| `einzelhandel` | Shops and supermarkets |
| `lager-logistik` | Warehouse and logistics |
| `kraftfahrer` | Driving and delivery (*corriere, rider*); refs into `patente/vocabolario.json` allowed |
| `hotel` | Hotels and tourism |
| `buero` | Office and admin (links to Business Italian) |

Conventions as the lexicon (§1.4): own words `gender` il/lo/la/l', plural, `forms` per §1.4,
`translations.en` = English gloss, `deHint` = German translation (the German tab) or removed if the
`de` tab is dropped; `variety` on own entries. Working conditions (contracts, CCNL) only as general
orientation, "to verify". The page slug becomes `/italian-for-work` (`routes`). Validator
`src/lib/berufeCore.js` (`pnpm check:berufe`).

### 5.13 Word stories (`content/wortgeschichte/`) — `word-stories`

Italian etymology stories, new files by Italian lemma slug, same schema: Latin (*casa, acqua,
parlare*), Arabic (*zucchero, arancia, magazzino, algebra*), Germanic (*guerra, guardare, bianco,
ricco*), Greek (*telefono*), Italian words in other languages (*pizza, espresso, ciao ← s'ciào,
piano, studio*), modern loans. First batch about 30 A1–A2 words, every story sourced (Treccani,
DELI/Cortelazzo-Zolli via secondary sources, Wiktionary), `status: "entwurf"`, `checkedBy`/
`checkedAt` set. The Spanish stories are deleted when their Italian batch lands (the same
`publishOn` dates reused); `cleanup` removes any left. `entryLang` in `wortgeschichteCore.js`
gets `it`.

### 5.14 Accents and languages — `accents-languages`

| Module | Italian course |
|---|---|
| `/knowledge/accents` (`dialekte.json`, `dialekte-karte.json`, `dachMap.js`) | **regional varieties of Italian** (northern, Tuscan/Florentine, Roman, Neapolitan/southern, Sicilian, Sardinian regional Italian, Swiss Italian) with features (*gorgia toscana*, *s*, double consonants, *passato remoto* use) as notes; **Italy's other languages** (Sardinian, Friulian, Ladin, Neapolitan, Sicilian, German in South Tyrol, French in the Aosta Valley, Slovene, Albanian (Arbëreshë), Catalan in Alghero) as dots (`lang: true`). Map geometry from Natural Earth as the earlier runs did (geo packages in a scratch folder, never site dependencies). The old map labels (*bus/bath*) are replaced. |
| `/knowledge/languages` (`sprachen-welt.json`, `sprachen-karte.json`) | where Italian is spoken: Italy, San Marino, Vatican City, Switzerland (Ticino, parts of Graubünden), Slovenia/Croatia (Istria, local official status), plus large diaspora communities (Argentina, Brazil, USA, Australia, Germany …); status keys keep names with these meanings. The German→English **word decoder** (`#decoder`, `sprachen.dec.*`) and the *maken/machen* labels go. |

---

## 6. Data-file naming

Data file names and folders stay as they are (German names: `einstufung.json`, `hoeren.json`,
`grammatik/…`): code, generators and validators reference them, and renaming buys nothing for a
visitor. New files use English names. Exceptions this plan names: `business-spanish/` →
`business-italian/` and `dgt/vocabulario.json` → `patente/vocabolario.json` (modules whose names
are Spanish-course words). A later clean-up of file names is out of this queue.

---

## 7. Modules dropped (removed by `cleanup`)

| What | Why | Restore |
|---|---|---|
| Spanish-course leftovers no item converted (unwritten CELI level sets, paid DTZ sets 3–4 still in Spanish, CCSE downloads, Spanish word stories, `es419` keys) | must not stay next to Italian content | `git checkout <cleanup-commit>~1 -- <path>`; recorded in the `cleanup` report and §13 |
| `lexicon/i18n/it.json`, `redemittel-i18n/it.json`, `public/i18n/it.json`, the `it` registry entry and Italian entry pages (UI removed by `ui-lang-es`) | the Italian UI and Italian → Italian translation make no sense in an Italian course | same |
| `SPANISH_LEVELS`, `el/la` values left in `berufeCore.js` and the games, the Spanish `GENDERS` | no Spanish level left | same |
| Legacy redirects (`ROUTE_RENAMES` 301s in `astro.config.mjs`, `DROPPED`, `ACCOUNT_REDIRECTS`) that make no sense on a new site at `/italian` | nothing was ever public here | `git checkout <routes-commit>~1 -- astro.config.mjs src/lib/routes.js` |
| Empty sidecars, unused components, `src/oldux/` and generators that the Spanish `cleanup` left (check what is still present) | empty, unread, German or broken | `git checkout <cleanup-commit>~1 -- <path>` |

Experiment pages follow CLAUDE.md (`EXPERIMENTE.md` archive entry before removal). The
Führerschein, driving games, politics, tax havens, beer map and German declension were already
removed in the earlier forks; **nothing of them is restored** for the patente module (§4.4). If a
later item wants the driving-scene code, Edgar exports the files from the icanspeak-english repo
(`git -C <icanspeak-english> show db88ba4~1:<path>`; paths in `EXPERIMENTE.md`) and the item
records it in `EXPERIMENTE.md`.

---

## 8. Slugs to rename (`routes`)

Current (Spanish course) → Italian course. No redirects from the Spanish-course URLs: the site at
`/italian` is new and nothing was deployed. Every internal link, `catalog.js` menu,
`suche-seiten.json`, `entry-pages.json`, sitemap and `llms.txt` follows, base-aware.

| Current | New |
|---|---|
| `/dele` (+`/[slug]`) | `/cils` (+`/[slug]`: `a2`, `b1`, `b2`, `c1`) |
| `/dele/a1` | `/cils/a1` |
| `/dele/language-use` | `/cils/language-use` |
| `/siele` (+`/practice-set`) | `/plida` (+`/practice-set`) |
| `/siele/levels` (+`/[slug]`) | `/celi` (+`/[slug]`: `a2`, `b1`, `b2`, `c1`) |
| **new** | `/certit` (+`/practice-set`), `/exams/which-exam` |
| `/nationality` | `/citizenship` |
| `/nationality/dele-a2` (+`/mock-test`, `/practice-set`) | `/citizenship/b1-mock` (+`/mock-test`, `/practice-set`); the A2 mock is `/citizenship/a2-mock` |
| `/ccse` (+`/test`, `/facts`) | `/civic-knowledge` (+`/test`, `/facts`) |
| `/spanish-for-work` (+`/[beruf]`) | `/italian-for-work` (+ sector slugs per §5.12 titles: `care-work`, `hospitality`, `cleaning-domestic-work`, `agriculture`, …) |
| `/business-spanish` (+`/[unit]`) | `/business-italian` (+`/[unit]`) |
| `/dgt-vocabulary` | `/patente-vocabulary` |
| `/games/gender-sprint` | `/games/article-sprint` |
| `/games/extranjeria` | `/games/questura` |
| `/games/villabruno` | `/games/casalbruno` (or the name `games-dialogue` settles on) |
| grammar topics `/<slug>` | §3 "New slug" (`TOPIC_SLUGS`) |
| item slugs (listening, reading, writing, speaking, culture, phrases, work groups: `ITEM_SLUGS`, `WORK_GROUP_SLUGS`) | kebab-case of the new English title (`a1-ansage-bahnhof` → `a1-station-announcement`; `a2-padron-notice` → `a2-comune-notice`) |
| teacher worksheets `/teachers/worksheets/{grammar,tandem}/<slug>` | follow the topic slugs |
| kept | `/grammar`, `/grammar/conjugation`, `/grammar/reflexive-verbs-list`, `/vocabulary`, `/listening`, `/reading`, `/writing`, `/speaking`, `/pronunciation`, `/intonation`, `/tongue-twisters`, `/placement-test`, `/step-by-step`, `/object-pronouns`, `/prepositions`, `/culture`, `/knowledge/*`, `/teachers/*`, `/exams`, `/exam-plan`, other games, legal pages |

`EXAM_PATHS`, `TOPIC_SLUGS`, `REF_SLUGS`, `ITEM_SLUGS`, `WORK_GROUP_SLUGS` and `BUSINESS_SLUGS` in
`src/lib/routes.js` are the one table; ids, storage keys and data file names stay. `pnpm
check:links` (in the gate) checks that the source's internal links lead to a page.

---

## 9. Modules left as is

| Module | Reason |
|---|---|
| Backend seam: `src/lib/backend.js`, `supabase/browser.js`, `api.js`, `analytics.js`, `monitoring.js`, `pronunciation/browser.ts`, `access.js`, `PremiumLock` | no integrations (ARCHITECTURE.md); only voice language it-IT where a module sets it |
| Server-only features (live quiz rooms, classes, cloud sync, leaderboards) | fail softly offline; their texts are UI (`ui-*`), their content comes from `teachers` |
| `steuer.json`, `produkte.json`, `premium-features.json` | business/legal settings; only their rendered strings via `ui-*` |
| Image manifests (`*-bilder*.json`, `*.manifest.json`, `hub-emoji.json`, `einstieg-bilder.json`) | language-neutral |
| `paid-manifest.json`, `saetze-index.json`, `public/inhalt/*` | generated |
| `uebersetzungen/grammatik-ui.json` | keyed by German UI strings, read by `check-grammatik-ui`; harmless |
| `uebersetzungen/rechtliches.json` and legal facts (company, address, contact) on `/privacy`, `/terms`, `/legal-notice` | legal facts unchanged; only language and brand (`ui-pages-m-z`) |
| Mascots (Bruno, Quaki), design system page, icons, fonts, CSS, RTL setup | language-neutral; texts via `ui-*` |
| `src/lib/audioPacks.js` stub, `/account` page | no app, no accounts |
| Data file names and ids (§6), storage keys | code and saved progress key on them |
| `docs/inhalte-qa/` | QA reports, regenerated by `pnpm check:inhalte` |
| `src/integrations/*` logic | only made base-aware by `base-path-and-brand`, language handling by `ui-lang-*` |
| Italian logos in `public/logos` | wired by `base-path-and-brand`, never redrawn |

---

## 10. Infrastructure items

### 10.1 `base-path-and-brand`

`astro.config.mjs` (`site`, `base: '/italian'`, redirects base-aware); the helper
`src/lib/paths.js` (`withBase`, `absoluteUrl`, `langPath` → `/italian/de/…`) gets `/italian`;
every link, asset, fetch (`public/i18n/*.json`, data JSON endpoints), canonical, hreflang, sitemap,
OG image and `llms.txt` URL through it; brand strings in `public/i18n/en.json`, `Layout.astro`,
manifest, `brand/`, OG images; `scripts/check-base.mjs` / `pnpm check:base` (fails on root-absolute
`href/src/action/srcset/url()` in `dist/` that don't start with `/italian/`, and checks
`public/_headers`). Logos: the Italian kit in `public/logos` replaces the Spanish one, wired as
the Spanish kit was (favicons, apple-touch-icon, wordmark ± dark in header and footer, app icons
in the manifest, mark as OG/JSON-LD logo); the Spanish logos are removed. Footer keeps "part of
icanspeak.it". Every later item runs `pnpm check:base` after the build.

### 10.2 `variety-schema`

§1.5: `src/lib/variety.js` renamed exports and inert `LATAM_MODE`, `scripts/check-variety.mjs` (in
the gate), the validators that own lexicon/berufe/grammar files accept `variety`, `regional`,
`genus` (`m`/`f`), `fem`, `aux`, `pluralGender`, and reject `es419`; `pnpm check:variety` updated;
regional notes not shown yet.

### 10.3 `ui-components`, `ui-pages-a-l`, `ui-pages-m-z`

Page titles, descriptions, leftover Spanish-course UI text (DELE, SIELE, CCSE, Spain, Castilian,
Extranjería, Spanish strings) in `src/layouts`, `src/components`, `src/pages` (split a–l / m–z +
legal pages). New strings into `public/i18n/en.json` with `data-i18n`. Data content is not theirs.
Hrefs stay on the old slugs until `routes`.

### 10.4 `ui-lang-de`, `-es`, `-fr`, `-pt` (the `it` UI is removed)

Registry entry in `src/lib/languages.js` (`status: "draft"` on every surface that has text in that
language, in practice `ui` and `cards` with `fetch: true`; `urlPrefix`, `hreflang`), `public/i18n/
<code>.json` from `en.json`, `pnpm lang:coverage` (commit `docs/lang-coverage.json`, or the `ui`
gate hides the language), a block in `src/data/entry-pages.json`, entry pages at `/italian/<code>/`
with hreflang. `ui-lang-es` also **removes** the Italian UI: `public/i18n/it.json`, the `it`
registry entry, its entry pages and `lang-coverage.json` row, and its surfaces. Portuguese:
**keep the European/Brazilian choice the Spanish course made** (Brazilian `pt`, hreflang `pt-BR`)
and say it in the `ui-lang-pt` report. Spanish UI: `es`, hreflang `es` (neutral, not region-tagged).

### 10.5 `routes`, `cleanup`, `deploy-readme`

§8, §7; `deploy-readme`: README (pnpm commands, `pnpm check:base`), the Worker (assets only) per
the repo-root DEPLOY.md and `apps/italian/wrangler.jsonc`, route `icanspeak.it/italian/*`,
post-deploy checks, built file count against the 20,000-files limit; it also flips the italian card
to `live: true` in `apps/hub/src/data/courses.ts`.

---

## 11. Queue item → files

| Item | Files it owns |
|---|---|
| `content-plan` | `docs/content-plan.md` |
| `base-path-and-brand` | `astro.config.mjs`, `src/lib/paths.js`, `src/layouts/Layout.astro`, `src/lib/i18n.js`, `src/integrations/*`, root-absolute links in `src/components/**`, `src/pages/**`, `src/lib/**`, brand strings in `public/i18n/en.json`, `public/manifest*`, `brand/`, `public/logos`, OG images, `scripts/check-base.mjs`, `package.json` (`check:base`) |
| `variety-schema` | `src/lib/variety.js`, `scripts/check-variety.mjs`, `scripts/check-content.mjs`, `scripts/validate-lexicon.mjs`, `src/lib/berufeCore.js` |
| `ui-components` | `src/layouts/**`, `src/components/**`, `public/i18n/en.json` |
| `ui-pages-a-l` | `src/pages/[a-l]*`, `public/i18n/en.json` |
| `ui-pages-m-z` | `src/pages/[m-z]*` (incl. `privacy`, `terms`, `legal-notice`), `uebersetzungen/rechtliches.json` (language only), `public/i18n/en.json` |
| `placement-test` | `src/data/einstufung.json` |
| `grammar-a1` … `grammar-c1` | `src/data/grammatik/<slot>.json` per §3 (by **new** level), `src/paid/grammatik/*` (C1), `grammatik.json` entries of those slots, `akkusativ.json` (A2), `src/lib/answerMatch.js` (`grammar-a1`: Italian accent key row, apostrophe normalisation), `grammatik.<slot>.intro` keys in `en.json`, `node scripts/repoint-einfach-grammar.mjs <topics>` when `einfach-pfad.json` refs break |
| `grammar-structure` | `grammatik-lehrplan.json`, `grammatik-verwandt.json`, `nachschlagen/*`, `wortarten.json`, `kursinhalte.json`, `content/program.json` (module titles), `praepositionen-trainer.json`, `uebersetzungen/grammatik*.json` |
| `grammar-start-book` | `grammatik-start/*`, `scripts/generate-grammatik-start-pdf.mjs`, `scripts/check-grammatik-start.mjs` |
| `conjugation-data` | `verbtabellen.json`, `src/lib/verbtabellen.js`, `src/pages/grammar/verbs.astro` (labels), `arbeitsblatt/verbtabellen.json` |
| `conjugation-trainer` | `src/pages/grammar/conjugation.astro`, `src/lib/conjugationTrainer.js`, `src/data/conjugation-trainer.json`, `public/i18n/en.json` |
| `beginner-path` | `einfach-pfad.json` |
| `beginner-path-ui` | `src/lib/einfach-view.js`, `einfach-app.js`, `einfach-content.js`, `src/pages/step-by-step.astro` (noscript), `docs/easy-mode-tier1-v1.md` |
| `vocab-a1` … `vocab-b2` | `content/lexicon/<level>.json`, `lexicon/i18n/*` for that level, `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json`, `content/program.json` unit titles; `vocab-a1` also `wortschatz.json`, `haeufigste-woerter.json` + its scripts, `src/lib/lexicon.js` (`ITALIAN_LEVELS`, `TRANSLATION_LANGS`), `src/lib/articles.js` (new), `src/lib/audioSlug.js` (`slugify`), `scripts/validate-lexicon.mjs`, `uebersetzungen/woerter-uk.json` |
| `vocab-c1-c2` | `content/lexicon/c1.json`, `c2.json`, their i18n entries; drops the Spanish levels and `GENDERS` values |
| `listening` | `hoeren.json`, `uebersetzungen/hoeren.json` |
| `reading-writing` | `lesen.json`, `fertigkeiten/lesen.json`, `fertigkeiten/schreiben.json`, writing task data, `uebersetzungen/lesen.json`, `schreiben.json`, `src/lib/schreibKorrektur.js` |
| `speaking` | `sprechen.json`, `sprechen-b1b2.json`, `redemittel.json`, `redemittel-i18n/*`, `fertigkeiten/sprechen.json`, `uebersetzungen/sprechen.json`, exam lines in `src/pages/speaking/[id].astro` |
| `pronunciation` | `ausspracheregeln.json`, `aussprache-check.json`, `satzmelodie.json`, `zungenbrecher.json`, `aussprache-muttersprache.json`, `area: "aussprache"` of `fehler-nach-sprache.json`, `src/lib/ausspracheTipps.js`, `LANG` in the check libs |
| `idioms-mistakes` | `redewendungen.json`, `umgangssprache.json`, `typische-fehler.json`, `fehler-nach-sprache.json` (other areas), `wortfallen.json`, `synonyme.json`, matching `en.json` keys |
| `exams-cils-celi` | `pruefungen/start-deutsch-1/*`, `saetze/goethe-*`, `saetze/telc-*`, `paid/pruefungen/saetze/goethe-c1-1.json`, `telc-c1-1.json`, `goethe-formate.json`, `telc-formate.json`, `sprachbausteine/*`, `fallen.json`, CILS/CELI part of `formate-a2-c1.research.json`, `src/lib/exam/names.js`, `registry.js` texts, `saetze-index.json` (regenerated), exam hub |
| `exams-plida-certit` | `pruefungen/testdaf/*`, `testdaf-formate.json`, new `certit-formate.json` and its set, PLIDA/CERT.IT part of `formate-a2-c1.research.json`, `registry.js` texts (`testdaf`, `certit`), new `src/pages/exams/which-exam.astro`, `src/pages/certit*` |
| `civic-knowledge` | `leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json`, `/ccse` page texts (moved by `routes`), `registry.js` texts |
| `citizenship-path` | `pruefungen/dtz/*`, `paid/pruefungen/dtz/*`, `src/lib/dtzTrainer.js` texts, `src/pages/citizenship.astro`, `registry.js` (`dtz`) texts |
| `questura-sim` | `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/*` texts and rules |
| `patente-vocab` | `src/data/dgt/vocabulario.json` → `src/data/patente/vocabolario.json`, `src/pages/dgt-vocabulary*` content (slug by `routes`), `scripts/check-berufe.mjs` / `src/lib/berufeCore.js` (read `patente/`) |
| `culture` | `kultur.json`, `uebersetzungen/kultur.json`, `kultur-insider.json`, `kultur-bilder.json`, `wusstest-du.json`, `kalender-saetze.json`, `zitate.json`, `uebersetzungen/zitate.json`, `/explore/films` data |
| `accents-languages` | `dialekte.json`, `dialekte-karte.json`, `dachMap.js`, `sprachen-welt.json`, `sprachen-karte.json`, their generator scripts, `dialekte.*` / `sprachen.*` keys in `en.json` |
| `games` | `artikel-sprint/*`, `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json`, `quakiSpringt/*`, `hochstapler/*`, `satzregen/*`, game string tables, `src/lib/artikelSprint/*`, `artikelPacks.js`, `spiele/domino.js` |
| `games-arcade` | `src/lib/nussnacht/*`, `src/lib/hoerSafari/*` |
| `games-dialogue` | `src/lib/knigge/*`, `src/lib/lindenau/*`, `uebersetzungen/lindenau.json`, `src/lib/spielKit.js` voice |
| `teachers` | `arbeitsblatt/*`, `partneruebungen/*`, `unterricht-wortschatz.json`, `lernstunde-texte.json`, `downloads.json`, `src/lib/stundenplan.js`, `src/lib/unterricht/einstieg.js`, `src/lib/arbeitsblatt/wortschatz.js`, printable games and class test pool |
| `word-stories` | `src/content/wortgeschichte/*`, `src/lib/wortgeschichteCore.js` (`entryLang`, `LANG_NAMES`) |
| `italian-for-work` | `src/data/berufe/*`, `src/lib/berufeCore.js` |
| `business-italian` | `src/data/business-spanish/*` → `src/data/business-italian/*`, `src/pages/business-spanish/*` → `business-italian/*`, `src/lib/businessSpanish.js`, `scripts/check-business-spanish.mjs`, `en.json` keys |
| `routes` | `src/lib/routes.js`, `astro.config.mjs` redirects, page folders/file names, `suche-seiten.json`, `entry-pages.json`, `catalog.js`, links |
| `cleanup` | §7, validators back in the gate, `pnpm check:base` and `pnpm check:variety` clean |
| `ui-lang-de` / `-es` / `-fr` / `-pt` | `src/lib/languages.js`, `public/i18n/<code>.json`, `docs/lang-coverage.json`, `entry-pages.json`, entry pages (`-es` also removes the `it` UI) |
| `deploy-readme` | `README.md`, `apps/hub/src/data/courses.ts` (the one file outside `apps/italian`) |

Files with UI strings only (`premium-features.json`, `produkte.json`, `downloads.json` titles) are
handled by the `ui-*` items where they are rendered.

---

## 12. Quality rules for every content run

1. Correct, natural **standard Italian**; every example is something a speaker in Italy would
   actually say. English explanations clear and short. *Tu* for friends and peers, *Lei* for
   offices, officials, doctors and strangers; each dialogue says which and stays consistent.
2. Level discipline: example vocabulary at or below the topic's CEFR level, except the target
   structure.
3. Each grammar topic: one clear rule, the forms, 4–8 examples, the 2–3 most common learner
   mistakes, exercises with unambiguous answers (or listed alternatives). Where usage is regional,
   add a `regional` note.
4. Distractors are wrong for a reason a learner can understand.
5. Articles: every noun with its article, chosen by the sound rule (§1.4); accents and
   apostrophes exact (§1.2).
6. Facts (culture, exams, Life in Italy) carry a source and an "as of" date; when unsure, leave the
   fact out or word it carefully and list it "to verify" in the report. Law and administration:
   general orientation, never legal advice.
7. Fewer, correct items beat many.
8. No mixed Spanish/Italian items in the content a run touches; no German or Spanish-course
   leftovers (DELE, SIELE, CCSE, Spain, *vosotros*).
9. Build: `timeout 1500 pnpm --dir apps/italian build 2>&1 | tail -40` in the foreground; then
   `timeout 600 pnpm --dir apps/italian check:base`.

---

## 13. Open points

- **Edgar: review** the exam map (§2): CILS in the goethe slots, CELI in the telc slots, PLIDA in
  the testdaf slot, a new CERT.IT slot, the B1 citizenship mock in the DTZ slot and the A2 permit
  mock in paid set 2, "Strutture di comunicazione" in the Sprachbausteine slot, CILS C2 without a set.
- **Edgar: review** the sector swaps in Italian for work (§5.12): `elektro-technik` → agriculture,
  `kita` → cleaning and domestic work (kept from the Spanish course).
- **Town name** *Casalbruno* (§5.9) is a working name; `games-dialogue` checks that no real comune
  has it and may change it (and this plan).
- **Exam and law facts** are all "to verify" until Edgar or a run checks the official pages: the
  accepted certifications and levels for citizenship (B1) and the long-term permit (A2), the
  Prefettura test, exemptions, 2025 citizenship changes, the Accordo di integrazione and its civic
  session, CELI numbering, exam formats and prices (§2). See the report for the full list.
- **Frequency ranks**: `it_50k` licence and download (§1.4).
- **Audio**: every `audio` field points to files that don't exist until an it-IT TTS voice is wired
  (`BACKEND.speech`); validators that need the files stay off until then.
- **Regional notes**: data carries `regional` from the start; showing it is a later item, not in
  this queue (`variety.js` has no alternate mode).
- **Variety, how it is enforced** (`variety-schema`, 2026-11-12): the Spanish data still says
  `variety: "es-ES"` and carries `es419`. `variety.js` exports `LEGACY_VARIETIES` and tolerates both
  on items that still say es-ES; `es419` on an it-IT item is an error, and so are es-ES and `es419`
  anywhere in a module listed in `STRICT` (`check-variety.mjs`). `STRICT` was emptied (every module
  still holds Spanish content); **each content item adds its module id back** in the commit that
  converts it (module ids as in `MODULES`; `patente` and `business-italian` are listed already).
  `validate-lexicon.mjs` and `berufeCore.js` pick the rule set per word: Italian rules for
  `variety: "it-IT"` (gender `il, lo, la, l', il/la, lo/la`; `genus` m/f required with `l'`;
  `pluralGender: "f"`; `aux` `avere/essere`; `fem` on adjectives and mobile-gender nouns; `forms`
  io presente · participio · io imperfetto), Spanish rules otherwise; so **an item writes
  `variety: "it-IT"` on every Italian word** or the Spanish rules reject its articles.
  `isCourseStandard(v)` (it-IT, or es-ES while still Spanish) is what the file-level checks
  (`check-verbtabellen`, `check-conjugation-trainer`, `check-arbeitsblatt`, `check-sprachfallen`)
  require; `cleanup` drops es-ES from it and `LEGACY_VARIETIES`. `scripts/lexicon-import.mjs` still
  writes Spanish (es-ES, `lat=` → `es419`, Spanish grammar syntax, `es-ipa.mjs`): `vocab-a1`
  converts it (e.g. `reg=note~area~form~gender` → `regional`). `build-satzregen.mjs` and
  `nussnacht/bosse.js` still write/hold `es419`: `games` / `games-arcade`.
- **Arabic UI**: later, not in this queue (RTL ready).
- **Business Italian rename** (§4.3): the phrase text key `es` → `it` and the file/folder renames
  happen in one commit by `business-italian`; until then the module still reads `business-spanish`.
- **Hub share cards** (`public/og/*.jpg`, `src/data/hub-bilder.json`): switched off in
  `Layout.astro` (`HUB_CARDS = false`); every page shares `og-default.png`. The `ui-*` item that
  rewrites the hub titles reruns `pnpm hubs:build --force` and sets `HUB_CARDS = true`.
- **Contact e-mail** `hello@englishacademy.com` (`src/lib/legal.js`, two strings in `en.json`): a
  legal fact, left unchanged; Edgar: set the real icanspeak address. In which language are the
  legal texts binding (`legal.note.binding`, `widerruf.binding`)?
- **robots.txt and deploy**: crawlers only read `https://icanspeak.it/robots.txt` (umbrella site);
  `public/robots.txt` here is the template for the `/italian` lines; `public/_headers` rule paths
  carry the base. Open: `/italian` without a slash may need a redirect or a second route.
- **Base path, how it is enforced**: `src/lib/paths.js` is the helper. Browser code builds URLs
  with `withBase()`/`currentPath()`; server-rendered HTML keeps root-absolute links in templates
  and data and is rebased centrally by `rebaseHtml()` (`src/middleware.js` in dev and while
  prerendering, again in `src/integrations/base-language.mjs` on `dist/`), checked by `pnpm
  check:base`. New data keeps writing site paths (`/grammar`), never `/italian/…`.
- **Brand theme**: token names kept (`--brand-blue` is the navy); `--accent` a deeper amber for AA;
  details in `docs/brand/BRAND.md` and `src/styles/global.css`. Dead font CSS (`font.css`,
  `newfont.css`) can go in `cleanup`.
- **Inherited mechanics** from the Spanish runs that still apply: `accentOnly()` and the key row
  in `answerMatch.js`; `accepts` ignores case (an exercise about capitals must ask "capital or
  small?"); `check-variety.mjs` has strict lists per converted module; `grammatik.<slot>.intro` in
  `en.json` must follow each subtitle or the old text overwrites it at render time; `pnpm
  check:i18n-luecken` baseline and `validate-i18n.mjs` (needs `public/i18n/de.json`) are fixed by
  the `ui-lang-*` items; the **Spanish-course text links inside topics** use today's slugs and move
  with `routes`.
- **UI labels for the exam slots** (`ui-components`, 2026-11-12), used in ExamRail, LevelFold,
  TopicRail, GrammarRelated, LearnShell, the home mocks and the `exams` rows of `catalog.js`:
  start-deutsch-1 = "Italian A1 practice test", goethe = "CILS" (A1–C2), telc = "CELI" (A2–C1),
  testdaf = "PLIDA" (A1–C2; its set is B1), dtz = "B1 mock for citizenship", lid = "Civic
  knowledge test". The exam items may refine them; hrefs stay on the old slugs until `routes`.
  `ui-components` also changed the visible labels in `src/lib/catalog.js` (the nav renders them
  on every page); `routes` still owns its hrefs.
- **Left in components for later items** (they depend on data that is still Spanish): the
  article trainer's logic in `ArtikelTrainer.astro` (`options: ["el","la"]`, the `EXPLAIN` rules
  `afem`/`greek` and their `ap.ex.*` keys in `en.json`), `pluralArticle` with `["el","la"]` in
  `WortschatzDruck.astro`, the article regex in `wortgeschichte/WortEntry.astro` and
  `AusspracheRegeln.astro` `bare()`: `vocab-a1` / `games` with `src/lib/articles.js`.
  `LidGrafik.astro` (Spain's powers, comunidades, history timeline, `lang="es"`): `civic-knowledge`.
  `PruefungSatz.astro` treats a telc-slot set as one "band" of a multilevel test (SIELE); CELI sets
  are whole exams per level: `exams-cils-celi`. The "Spanish letters" fallbacks in
  `src/lib/aktivMode.js` and `conjugationTyped.js` (en.json already says "Italian letters"):
  `grammar-a1`. The word-decoder label in `catalog.js` (`sprachen.dec.title`): `accents-languages`.
- Gaps (§3): elision/truncation topic, *si* impersonale as its own topic, *ne* drills, *stare/essere*
  in the south.
