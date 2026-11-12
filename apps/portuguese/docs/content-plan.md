# Content plan: Spanish course → icanspeak Portuguese

Written 2026-11-11 by the `content-plan` run of the Portuguese queue
(`overclaude/projects/icanspeak-portuguese/QUEUE.md`). It replaces the English → Spanish plan.
The Spanish plan is in the git history of `apps/spanish` and of this app's first commit; its
implementation log (the "decisions" bullets of its §13) described how the Spanish course was
built and is **not** copied here, except where a lesson still applies (§13.2).

**Every later item in the queue follows this file.** A run that has to deviate (a mapping turns
out not to work) changes this file in the same commit, says why in its report and, if the
question stays open, adds it to §13.

Inventory basis: `apps/portuguese` as copied from `apps/spanish` (2026-11-07). Every module is
in its **finished Spanish state**: Spanish content, German file names, Spanish routes
(`/dele`, `/siele`, `/ccse`, `/dgt-vocabulary`, `/business-spanish`, `/spanish-for-work`),
`es419` notes, `LATAM_MODE`, Portuguese (pt-BR) UI.

Words used below:

- **keep**: stays as it is (code, infrastructure, language-neutral data).
- **convert**: same file, ids and schema, new Portuguese-course content.
- **add**: new file, page or module, English names from the start.
- **leave**: not touched by any content item, with the reason given (§9).
- **drop**: removed by `cleanup`, with a restore command recorded.

---

## 1. Global decisions

### 1.1 Learner, variety, levels

| Decision | Value |
|---|---|
| Brand | **icanspeak Portuguese**. No "icanspeak Spanish", "EnglishAcademy", "englishacademy", "deutschacademy" in anything a visitor sees (titles, meta, OG, JSON-LD, PDFs, llms.txt, rendered `source` strings). Internal code comments may keep the history. |
| Site and base | `site: 'https://icanspeak.it'`, `base: '/portuguese'`. Never a hard-coded root path. Every URL goes through the base helper `src/lib/paths.js` (`withBase`, `absoluteUrl`, `langPath`) that the Spanish course already has. UI-language prefixes come after the base: `/portuguese/de/…`. `pnpm check:base` checks `/portuguese/`. |
| Target learner | Adults (16+) learning Portuguese, any first language, with a strong group of **immigrants, digital nomads and residents in Portugal**. Real situations (AIMA, *centro de saúde*, *senhorio*, Finanças, the *Junta de Freguesia*, work) beat tourist phrases. |
| Variety | **European Portuguese (Portugal)** is the standard: Portugal vocabulary (*autocarro, comboio, pequeno-almoço, telemóvel, casa de banho, rapariga, ecrã, frigorífico, camisola*), *tu / você / o senhor, a senhora* as used in Portugal (§1.6), *estar a* + infinitive, European clitic placement (enclisis by default, mesoclisis where it belongs), European pronunciation (vowel reduction, *s* as /ʃ/ before consonants and at the end of a word), and the **1990 Orthographic Agreement as used in Portugal** (*facto, receção, perspetiva, contacto, aspeto, ótimo, diretor*). |
| Brazil | Never mixed in silently. Every vocabulary, grammar and audio item carries `variety: "pt-PT"`; where Brazilian usage differs in a way a learner would notice (*ônibus, trem, celular, café da manhã, você everywhere, estar + gerund, proclisis, fato/facto, recepção/receção*), an optional `ptBR` note (§1.5) records it so a Brazil mode can be switched on later without rewriting content. Nothing is shown for `ptBR` yet. |
| Other lusophone varieties | Angola, Mozambique, Cape Verde, Guinea-Bissau, São Tomé, Timor-Leste: described as notes on culture and accent pages only (`culture`, `accents-languages`). No `variety` value for them. |
| Levels | CEFR **A1–C1** for courses, grammar, placement; lexicon units keep **A1–C2**; the CAPLE exams cover **A1–C2** (C2: format page only, §2). |
| Explanation language | **English** (base dictionary `public/i18n/en.json`). Explanations are clear, short English; A1/A2 explanations use simple English and let the Portuguese examples carry the rule. Fields named *einfach/leicht/Easy* (`introEasy`, `historyEinfach`, `explainLeicht`) get very simple English. |
| UI languages | English base; **German, Spanish, French, Italian** through `src/lib/languages.js`, one queue item each (`ui-lang-de`, `-es`, `-fr`, `-it`). The Spanish course's **Portuguese UI is removed** (§10.4). Arabic later (RTL is already handled), not in this queue. |
| Names in examples | Varied, realistic for Portugal today: *Inês, João, Beatriz, Tiago, Mariana, Rui, Catarina, Duarte, Matilde, Gonçalo, Rita, Nuno*, plus learners and neighbours from many countries (*Amina, Oksana, Wei, Priya, Kevin, Valentina, Ionuț, Marcos*). Places: real Portuguese cities and regions are fine (*Lisboa, Porto, Coimbra, Braga, Faro, Évora, Funchal, Ponta Delgada*); offices, shops, firms, schools are **invented** (no real company, brand or living private person). The invented town of the games and sims is **Vila Soalheira** (§5.9). |
| Tone | Friendly, adult, no childish content, no party politics, no stereotypes about nationalities or regions. |
| Law and administration | AIMA, *autorização de residência*, NIF, NISS, *número de utente*, *atestado de residência*, Finanças, nationality, IMT: **general orientation, never legal advice**. Immigration and nationality rules changed in 2023–2025 (SEF dissolved into AIMA and the police in 2023; nationality-law reform under way in 2025). Every page that touches them says so in one line and points to the official source type (*Portal das Finanças*, *Segurança Social Direta*, AIMA portal, *Junta de Freguesia*, consulate, *Loja do Cidadão*). Every uncertain fact is "to verify" in the run report, and the page words it carefully ("usually", "as of <month year>, check the official page"). |
| Exams | Original practice material only. **Never copy or closely paraphrase** a CAPLE or Celpe-Bras paper, sample paper or official question bank. Task types may be described and imitated; texts, items and answer options are ours. The site says it is not affiliated with CAPLE, the University of Lisbon, or the Brazilian ministry of education. |

### 1.2 Typography and answers

- Portuguese text: **all written accents** (*à, á, â, ã, é, ê, í, ó, ô, õ, ú, ç*); *ü* does not exist
  since the 1990 agreement. Questions and exclamations take **no** inverted marks. Quotes inside
  Portuguese text: « » (with “ ” inside); English prose uses “ ”. Hyphens: clitics (*diz-me, fá-lo*),
  compounds (*guarda-chuva, couve-flor*) and prefix rules of the 1990 agreement (*anti-inflamatório,
  antissocial, pré-escolar, contra-ataque*) are checked per word, not by pattern.
- Numbers and dates in Portugal format: `1 250,50 €` (thin space or point as thousands sign, comma
  decimal), `14:30` or *duas e meia*, `11/11/2026`, `3 de novembro de 2026`; ordinals `1.º`, `2.ª`.
  Long scale: *bilião* = 10¹² (pt-BR *bilhão* = 10⁹): a `ptBR` note wherever it comes up.
- **Answers keep their accents.** In Portuguese an accent often changes the word (*e/é, à/a,
  para/pára* (old), *por/pôr, pelo/pêlo* (old), *esta/está, fala/falá-/falámos vs falamos*), so the
  checker never folds accents away. Prefer choice/pill formats; where a learner types, the page
  offers an `á à â ã ç é ê í ó ô õ ú` key row, and an answer that differs only in accents is marked
  wrong with the hint "check the accent". The Spanish course's `answerMatch.js` already has the
  accent logic and the Spanish key row: the first typing item (`grammar-a1`) switches the key row
  to the Portuguese set and drops `ñ ¿ ¡`.
- `src/lib/answerMatch.js` `normalize()` and `src/lib/audioSlug.js` `slugify()` currently fold
  Spanish accents and `ñ → ny`. `vocab-a1` changes `slugify` to: á à â ã → a, é ê → e, í → i,
  ó ô õ → o, ú → u, **ç → c**; `ñ` is dropped from the mapping (no Portuguese word needs it),
  leftovers keep the German mapping. Ids and audio names use that slug (*coração* → `coracao`,
  *pão* → `pao`). A lemma whose slug collides (*pão/pao*, *avó/avô → avo*) gets a suffix:
  `avo-f`, `avo-m` only where both are in the lexicon; otherwise the plain slug.
- Straight apostrophe in English answer fields (unchanged rule). Portuguese has apostrophes only
  in rare poetic or dialect forms (*d'ele*): not used.

### 1.3 Ids, slugs, file names

- **Content runs do not rename ids, data file names or storage keys.** They replace the content
  inside the existing ids (a slot that now holds the Spanish topic *ser/estar* becomes the
  Portuguese topic in the same slot). Ids are referenced across files (lehrplan, verwandt,
  arbeitsblatt, registry, localStorage keys). The Spanish course kept the same rule.
- **URL slugs** are English (the UI language), except proper names and exam names: `/caple`,
  `/civics`, `/imt-vocabulary`. Portuguese grammar terms that learners search for stay Portuguese
  inside the slug (`/ser-estar-basics`, `/por-para`, `/personal-infinitive`). New slugs are in §3
  and §8; the `routes` item applies them once.
- **New** ids, files and pages are allowed where this plan says so; they use English names
  (`business-portuguese/`, `imt/`).
- Mapping a slot to a different topic is fine; the `level` field may change with it, and
  `grammar-structure` then fixes the syllabus order.
- Lexicon word ids: slug of the Portuguese lemma (§1.2 slug rule). A noun/verb pair with one
  spelling keeps the plain slug on the more basic word and suffixes the other (`-noun`, `-verb`,
  `-adj`). A Portuguese slug still taken by a **Spanish** word of a level not yet migrated gets
  `-pt` (`hotel-pt`, `animal-pt`, `terrible-pt`) until `vocab-c1-c2` clears the collision. Ids are
  unique across all levels; sidecars are keyed by id.
- Word stories (`src/content/wortgeschichte/`): the file name *is* the lemma, so Portuguese stories
  are new files named by the Portuguese lemma slug (`casa.json`, `saudade.json`).

### 1.4 Data fields: what they hold for Portuguese

| Field / data | Spanish course | **Portuguese course** |
|---|---|---|
| lexicon noun `gender` | `el` / `la` / `el/la` | **The singular definite article: `"o"`, `"a"`, or `"o/a"`** for common-gender person nouns (*o/a estudante, o/a jornalista, o/a colega*). `spokenForm()` prints `gender + lemma` (*a casa*). Games and drills use only `o`/`a` nouns. |
| lexicon `genus` | `"f"` for *el agua* | **Not used** (Portuguese has no stressed-*a* article trick: *a água*). The key stays allowed by the schema so no validator breaks; the Portuguese course writes none. |
| lexicon `pluralOnly` | *las gafas* | Same key: *os óculos, as férias, as costas, as finanças* (when taught as plural); `gender` holds the singular-gender article (`"o"` for *óculos*, `"a"` for *férias*; the plural article is not stored), `plural` the full form. |
| lexicon `plural` | plural without article | Portuguese plural **without article** (*casas, canções, pães, animais, hotéis, lápis, jovens, os avós*). The article *os/as* comes from `gender`. |
| lexicon `en` | short English gloss | Same: short English translation/gloss with a qualifier where needed (*a casa → "house, home"*; *o rés-do-chão → "ground floor"*). |
| lexicon `example` | Castilian sentence | Natural European Portuguese sentence at the unit's level. |
| lexicon `ipa`, `ipaSource` | Castilian IPA | **European Portuguese** IPA with syllable dots and stress, reduction shown (*casa* `ˈka.zɐ`, *obrigado* `o.bɾi.ˈɡa.ðu`, *pão* `ˈpɐ̃ũ̯`, *telemóvel* `tɛ.lɨ.ˈmɔ.vɛl`); `ipaSource: "authored"` unless taken from Wiktionary (`"wiktionary"`, pt-PT transcription only). |
| lexicon `audio` | lemma slug | Lemma slug (§1.2); files don't exist until a **pt-PT** TTS voice is wired (`BACKEND.speech`). Browser voices are often pt-BR: say so wherever a page speaks (`listening`, `games-arcade`). |
| lexicon `forms` (verbs) | yo present · él indefinido · participio | **eu present · ele perfeito simples · particípio**: `falo, falou, falado`; `tenho, teve, tido`; `faço, fez, feito`. |
| lexicon `reflexive` | `true` for pronominal verbs | Same: `true` for pronominal verbs; lemma with hyphen + *-se* (*levantar-se, chamar-se*). |
| lexicon `prep` | dependent preposition | Same: *pensar **em**, depender **de**, sonhar **com**, gostar **de**, lembrar-se **de***. |
| lexicon `irregular` | comparatives / irregular verbs | Adjectives with irregular comparatives (*bom → melhor, mau → pior, grande → maior, pequeno → menor*); verbs: `true` for irregular verbs (any irregular tense). |
| lexicon `comparative` / `superlative` | only where irregular | Same: *melhor / o melhor*; regular ones are built with *mais*. |
| lexicon `fem` (adjectives, and nouns whose feminine differs) | feminine singular | Same: *alto → alta*, *português → portuguesa*, *professor → professora*; same as lemma for invariable ones (*grande, feliz, verde, simples*). |
| lexicon `aux`, `case`, `separable` | not used | Not used (keys omitted). |
| lexicon `i18n/<lang>.json` | Spanish → de, fr, pt, it | **Portuguese → de, es, fr, it** (the four UI languages). `i18n/pt.json` (Portuguese → Portuguese) is meaningless: `vocab-a1` removes `pt` from `TRANSLATION_LANGS`, adds `es`, and empties `pt.json`; `cleanup` deletes it. Other languages only where a run can translate reliably, otherwise the level's entries are removed (never a stale gloss next to Portuguese). |
| lexicon `rank`, `source` | Spanish OpenSubtitles | Portuguese OpenSubtitles 2018 list (hermitdave/FrequencyWords `pt_50k` is **pt-BR-heavy**; the list `pt` mixes Brazilian and European subtitles, and mostly Brazilian). Licence "to verify". Until a run can download it, `rank: null` and the words stay out of the frequency rounds. Level banding stays our own, never claimed to be the *Referencial* of any institution. If ranks are attached, the note "ranks are from a Brazil-heavy corpus" is written into the data source note. |
| `SPANISH_LEVELS` (`src/lib/lexicon.js`) | levels whose nouns carry `el`/`la` | `vocab-a1` renames it `PORTUGUESE_LEVELS` (levels whose nouns carry `o`/`a`) and switches the callers (`berufeRows.js`, `wortgeschichteCore.js`). `validate-lexicon.mjs` `GENDERS` accepts `o`, `a`, `o/a` next to `el`, `la`, `el/la` until `vocab-c1-c2`; `cleanup` removes the Spanish values. |
| `artikel-sprint/words.json` `article`, `plural`, `pluralWrong`, `english` | `el`/`la`, plurals | `o`/`a`; Portuguese plural; plausible wrong plurals (*pãos, canções → cançãos, animais → animals/animales*; *os mão*); `english` = gloss. |
| 4-slot case fields | subject · direct object · indirect object · after a preposition (*yo / me / me / mí*) | Same four slots: **subject · direct object · indirect object · after a preposition** (*eu / me / me / mim*; *ele / o / lhe / ele*; *tu / te / te / ti*). Third-person direct object has the alternants *o/a/os/as* with *-lo/-la* and *-no/-na* (§3 `object-pronouns`). |
| `trennbare-verben` slots | pronominal verbs | **Pronominal/reflexive verbs** (*levantar-se, lembrar-se de, ir-se embora, queixar-se*); the particle field holds *se*. |
| Verb tables (`verbtabellen.json`) | six person rows | §4.1 |
| `translations` maps / `*-i18n` / `uebersetzungen/*` | Spanish → learner language | Portuguese → learner language; `translations.en` = English translation. Other languages only where reliable. |
| `de` key in phrase/idiom/dialogue data | the Spanish phrase | **The Portuguese phrase** (the key name is history: "target-language text"); `en` = English meaning or usage note. |
| `status`: `entwurf` / `geprueft` | draft / reviewed | Same values. A grammar topic keeps the `status` it has (flipping all to `entwurf` would empty the course); the run report lists the topics for Edgar's review. New content enters as `entwurf` unless checked against sources. |

### 1.5 `variety` and the `ptBR` note

**Shape** (defined here, implemented and validated by `variety-schema`). The Spanish `es419`
object becomes `ptBR` (same four keys, same limits):

```json
"variety": "pt-PT",
"ptBR": {
  "note": "In Brazil: o ônibus. Autocarro is the Portugal word.",
  "form": "ônibus",
  "gender": "o"
}
```

- `variety`: `"pt-PT"` for everything in this queue. `"pt-BR"` is reserved for a future item
  that is Brazil-only (e.g. a Celpe-Bras-style listening text); no run writes it now.
- `ptBR` is **optional** and present only where Brazilian usage differs in a way a learner would
  notice. Keys:
  - `note` (required inside `ptBR`): plain English, ≤ 160 characters.
  - `form` (optional): the Brazilian replacement for the item's main text (lemma, phrase, answer,
    sentence, verb form). Spelling variants are `form` too (*receção → recepção*).
  - `gender` (optional, lexicon nouns only): `o`/`a` of the Brazilian word when it differs
    (*o autocarro → o ônibus* keeps `o`; *a rapariga → a moça*; *o comboio → o trem*).
  - `skip` (optional, `true`): the item makes no sense in Brazil mode (a *vós* drill, a clitic
    placement drill that needs enclisis, *pequeno-almoço* in a food-vocabulary unit whose point is
    that word, mesoclisis).
- No `ptBR` = same in Brazil as far as this course goes. Don't invent differences. Typical real
  ones, to be used and checked by `variety-schema`'s warning list (§10.2):

| Area | pt-PT (the course) | pt-BR note |
|---|---|---|
| Vocabulary | *autocarro, comboio, casa de banho, pequeno-almoço, telemóvel, rapariga, ecrã, frigorífico, sumo, camisola, fato de treino, bilhete, miúdo, talho, pastelaria, bicha* (queue), *rés-do-chão* | *ônibus, trem, banheiro, café da manhã, celular, moça, tela, geladeira, suco, camiseta/blusa, agasalho, passagem/ingresso, garoto/guri, açougue, padaria/confeitaria, fila, térreo* |
| Address | *tu* (informal), *o senhor / a senhora*, name or title (*a Dona Marta, o Sr. Silva*), verb in the 3rd person with no pronoun; *você* used with care (can sound distant or rude) | *você* is the default everywhere; *tu* regional; *o senhor/a senhora* for respect |
| Progressive | *estou a trabalhar* | *estou trabalhando* |
| Clitics | enclisis by default (*Disse-me*, *Vejo-o*), proclisis after *não*, negative words, many adverbs, *que*, question words (*Não me disse*); mesoclisis in the future/conditional in formal writing (*dar-lhe-ei*) | proclisis in speech (*Me disse*, *Eu te vejo*), no mesoclisis |
| Object pronouns | *o, a, os, as* (and *lo, la, no, na* after consonant/nasal) in speech and writing | *ele/ela* as object in speech (*vi ele*), *te* for *você* |
| Spelling (AO90 as used) | *facto, receção, perspetiva, contacto, aspeto, ótimo, diretor, ação, Egito* | *fato, recepção, perspectiva, contato, aspecto, ótimo, diretor, ação, Egito* |
| Pronunciation | vowel reduction, dropped unstressed *e*, *s* → /ʃ/, *r* uvular or tapped | open vowels, *t/d* palatalised before /i/, *s* → /s/ or /ʃ/ by region |
| Past with time words | *perfeito composto* only for repeated action up to now (*tenho estado a ver*) | same, rarely used |
| Numbers | *bilião* = 10¹², *milhar*; *dezasseis, dezassete, dezanove* | *bilhão* = 10⁹; *dezesseis, dezessete, dezenove* |
| Verbs/prepositions | *ir a* + place (*vou a Lisboa*), *ter de* + infinitive, *chegar a*, *ficar* | *ir para*, *ter que*, *chegar em* |
| Existence | *há* (*Há um banco aqui?*) | *tem* in speech (*Tem um banco aqui?*) |
| Tones | *pá, pois, fixe, giro, bué* (slang), *se calhar* (maybe) | *cara, legal, bacana, tá*, *talvez* |

**Where the fields go:**

| Data | `variety` on | `ptBR` on |
|---|---|---|
| `content/lexicon/*.json` | every word | the word |
| `berufe/*.json`, `imt/*.json`, `business-portuguese/*.json` own entries | every own entry (refs inherit from the lexicon word) | the entry |
| `wortschatz.json` phrase cards, `redemittel.json` phrases | every card / phrase | the card / phrase |
| `grammatik/<slot>.json`, `paid/grammatik/*` | the topic file (top-level key); exercises inherit | the topic (general note, e.g. *estar a + infinitive vs gerund*) **and** any exercise item whose answer differs (`form`) or is Portugal-only (`skip`) |
| `grammatik.json` quick quizzes, `akkusativ.json`, `praepositionen-trainer.json` packs | inherit from the topic/pack; pack-level `variety` | item |
| `einstufung.json` | top-level key | item with Portugal-only wording (`form`) or Portugal-only structure (`skip`) |
| `verbtabellen.json` | top-level key | verb (usage notes); the *vós* row is handled by the helper (§4.1) |
| `conjugation-trainer.json` | every set | set or item |
| Audio items: `hoeren.json` scripts, `aussprache-check.json`, `zungenbrecher.json`, `satzmelodie.json` items, `ausspracheregeln.json` rules | every item | item (e.g. *t/d before /i/* note on a rule) |

Reading, writing, speaking tasks, culture, exams carry no `variety` key (they are Portugal content
by definition).

**The helper** `src/lib/variety.js` (written for Spanish by `variety-schema`) is **converted**,
not rewritten: `DEFAULT_VARIETY = "pt-PT"`, `VARIETIES = ["pt-PT", "pt-BR"]`,
**`BRAZIL_MODE = false`** (was `LATAM_MODE`), `PTBR_KEYS = ["note","form","gender","skip"]`,
`PTBR_NOTE_MAX = 160`, `PTBR_GENDERS = ["o","a"]`, `ptBROf(item)` (was `es419Of`),
`varietyOf(item, parent)`, `textFor(item, text, brazil = BRAZIL_MODE)`, `skippedFor(...)`, and
**`showsVos(brazil)`** (was `showsVosotros`; the *vós* row of the verb tables is hidden in Brazil
mode, §4.1). Callers are renamed in the same commit (`conjugationTrainer.js`, `verbtabellen.js`,
validators, `check-variety.mjs`). Nothing is shown for `ptBR` until a later item builds the mode.
Done by `variety-schema` (2026-11-12), plus `isStandardVariety()`, `isLegacy()` and
`LEGACY_ALLOWED` for the transition from the Spanish values (§13.1 "Variety transition").
`check-variety.mjs` is in the gate; the strict list is rewritten (a module is strict once its
Portuguese item has run; Spanish modules are warnings until then).

### 1.6 Forms of address in Portugal (used by every item)

- **tu**: friends, family, children, colleagues of the same age, young people in general, among
  most peers at work in many companies. Verb in the 2nd person singular (*falas, tens, vais*).
- **você**: used, but with care. In Portugal it can sound cold, distant or even rude to some
  people, or it reads as "someone below me". Learners are told to avoid it by default; it is
  taught as a word they will hear and read (verb in the 3rd person), and as the normal form in
  Brazil (`ptBR`).
- **o senhor / a senhora** (+ 3rd person), **o Sr. / a Sra. / a Dona + first name**, **the name or
  the title** (*o doutor, a engenheira, o professor*), or **simply the 3rd person with no
  pronoun** (*Quer um café?*): the polite forms to older people, officials, strangers, customers.
  Contexts: AIMA and Finanças staff address you with *o senhor/a senhora* or by your name; you
  answer in the same register.
- **vocês** (plural of tu and você alike); *vós* is archaic and shown only in the verb tables and
  in C1 reading.
- **a gente** (= we, colloquial, 3rd person singular verb) next to *nós*.
- The beginner path introduces **tu** first (A1), then *o senhor/a senhora* in the services
  situations (AIMA, *centro de saúde*), then *você* as a note.

### 1.7 Validators

- A content item that changes a module's values updates that module's validator **in the same
  commit** (e.g. `validate-lexicon.mjs` GENDERS, `check-berufe.mjs`, `check-pruefungen.mjs`).
- Never drop a validator from the gate. If one must pause, move it to the "Not in the gate" list
  in `scripts/check-content.mjs` with the reason and the item that puts it back; `cleanup` puts
  every paused one back.

---

## 2. Exams: existing slot → Portuguese exam

Exam slot ids stay (they are storage keys: `da-exam-v1:<key>`, `EXAM_PATHS` in `src/lib/routes.js`,
`src/lib/exam/registry.js`). Titles, subtitles, pass notes, module labels and names change
(`src/lib/exam/names.js`: `EXAM_NAMES = { goethe: "CAPLE", testdaf: "…" }`, level names
`CIPLE A2` …).

**The exams (Portugal): CAPLE** (*Centro de Avaliação de Português Língua Estrangeira*, run with
the University of Lisbon and the Camões institute) issues six certificates: **ACESSO** (A1),
**CIPLE** (A2), **DEPLE** (B1), **DIPLE** (B2), **DAPLE** (C1), **DUPLE** (C2). **CIPLE A2** is the
usual language proof for residence and nationality. **Celpe-Bras** (Brazil, intermediate to
advanced, a single certificate with levels) is **comparison only**: no practice set.

| Slot (data / current page) | Now (Spanish course) | **Portuguese course** | Level | Item |
|---|---|---|---|---|
| `start-deutsch-1` (`pruefungen/start-deutsch-1/uebungssatz-1.json`, `/dele/a1`) | DELE A1 practice test | **ACESSO A1 practice test** (all parts the set shape holds); slug `/caple/acesso-a1` | A1 | `exams-caple` |
| `goethe` A2/B1/B2 (`saetze/goethe-{a2,b1,b2}-1.json`, `goethe-formate.json`, `/dele`, `/dele/[slug]`) | DELE A2, B1, B2 | **CIPLE A2, DEPLE B1, DIPLE B2** practice sets, one per level; slugs `/caple/ciple-a2`, `/caple/deple-b1`, `/caple/diple-b2` | A2–B2 | `exams-caple` |
| `goethe` C1 (`paid/pruefungen/saetze/goethe-c1-1.json`) | DELE C1 | **DAPLE C1** practice set; `/caple/daple-c1` | C1 | `exams-caple` |
| DUPLE C2 | format entry only | **format entry in `goethe-formate.json` and a hub card, no practice set** (above the course range); `/caple/duple-c2` | C2 | `exams-caple` |
| `sprachbausteine` (`pruefungen/sprachbausteine/satz-{1,2}.json`, `/dele/language-use`) | "Uso de la lengua" B2–C1 | **"Uso da língua"**: cloze and gap tasks B2–C1 (grammar and vocabulary in context: tenses, personal infinitive, clitics, connectors), framed as practice for the language-in-context tasks of the DIPLE and DAPLE papers (which tasks and whether they exist as a separate paper: "to verify"). Slug `/caple/language-use`. | B2–C1 | `exams-caple` |
| `testdaf` (`pruefungen/testdaf/uebungssatz-1.json`, `testdaf-formate.json`, `/siele`) | SIELE Global practice, score-based, `passPct: null` | **"Level-check practice"**: a mixed-skills score-based set (no pass/fail, `passPct: null`) that is **not** an official exam; framed as a rehearsal of reading, listening and writing at a mix of A2–B2. `testdaf-formate.json` becomes the format note "how our level check works" (no claim about any official score scale). Slug `/caple/level-check`. If `exams-caple` cannot write it well, the slot is **removed** with its registry entry (restore command in the report and in §13). | A1–C1 | `exams-caple` |
| `telc` A2/B1/B2 (`saetze/telc-{a2,b1,b2}-1.json`, `telc-formate.json`, `/siele/levels`, `/siele/levels/[slug]`) | SIELE by band | **removed.** Portuguese has no second exam family with the CAPLE shape; the per-level practice lives in the `goethe` slot. `exams-caple` removes the sets, their registry entries, regenerates `saetze-index.json`, records the restore command in its report and in §13 (`git checkout <commit>~1 -- <path>`). The hub keeps no "by level" page. | | `exams-caple` |
| `telc` C1 (`paid/pruefungen/saetze/telc-c1-1.json`) | SIELE C1 band | removed under the same rule | | `exams-caple` |
| `dtz` (`pruefungen/dtz/uebungssatz-1.json`, `src/lib/dtzTrainer.js`, `/nationality/dele-a2` + `/mock-test`, `/practice-set`) | DELE A2 mock for nationality | **CIPLE A2 mock for residence and nationality**: the full timed mock in the trainer shape, framed for the residence/nationality path (§5.11). Point bands are ours and say so; real pass rule "to verify". Slug `/nationality/ciple-a2`. | A2 | `nationality-path` |
| `dtz` paid (`paid/pruefungen/dtz/uebungssatz-{2,3,4}.json`) | more DELE A2 mocks | more CIPLE A2 mocks; `nationality-path` converts what it can, the rest is removed by `cleanup` (restore command recorded) | A2 | `nationality-path` / `cleanup` |
| `leben-in-deutschland` (`leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json`, `/ccse` + `/test`, `/facts`) | CCSE practice | **Civics: "Portugal, how it works"** (§5.11; `/civics`): own questions from public facts. **Not** an official test (Portugal has no official civics test for nationality today as far as known; "to verify"). The "comunidades autónomas" extra becomes "the autonomous regions Madeira and the Azores and the *distritos*". | A2–B1 reading | `civics` |
| `pruefungen/fallen.json` (`/exams/traps`) | traps for DELE, SIELE, CCSE | traps for the CAPLE exams (timing, *tu/você/o senhor* register in writing tasks, word counts, accents, clitic placement in writing, *a gente* vs *nós* in formal answers) | | `exams-caple` |
| `pruefungen/formate-a2-c1.research.json` | DELE and SIELE format research | CAPLE format research, every entry dated and marked "to verify" until checked against the CAPLE site (caple.letras.ulisboa.pt) | | `exams-caple` |
| `saetze-index.json`, `paid-manifest.json` | generated | regenerated by their scripts; never hand-edited | | whichever item changes sets |
| **add** `/exams/ciple-deple-celpe-bras` | `/exams/dele-or-siele` | comparison page "CIPLE, DEPLE or Celpe-Bras?": by purpose (residence and nationality in Portugal → CIPLE A2; work/study → depends on the institution, often DEPLE/DIPLE; Brazil, Brazilian universities, Brazilian work permit → Celpe-Bras), validity (CAPLE certificates: no expiry as far as known, "to verify"), format, results, price ranges "to verify"; Celpe-Bras is described only, **no practice set** | | `exams-compare` |
| **add** `/nationality` | `/nationality` | the path to Portuguese residence and nationality: who needs what, who is exempt, order of steps; general orientation, facts "to verify" | | `nationality-path` |

Exam facts the runs must treat as "to verify" (never as settled): CAPLE paper structure, parts,
timings and pass rules per level (including the usual "at least 50 % per paper"-type rules),
whether CIPLE is required for nationality and the accepted alternatives (school completion in
Portugal, other certificates), exam dates and the centres (including abroad), prices, validity,
Celpe-Bras format (written and oral parts, levels, validity, price), the number of attempts.
The pages word these carefully and date them.

---

## 3. Grammar: slot map (91 slots + 3 new)

Each slot file in `src/data/grammatik/` (and `src/paid/grammatik/`, the same C1 ids) becomes the
Portuguese topic below: same id, same schema. `src/data/arbeitsblatt/<id>.json` follows the same
id (`teachers`). "Level" is the `level` value of the slot as it stands in the Spanish course (the
Portuguese syllabus keeps the A1/A2/B1/B2/C1 split of the table); the grammar items work **by
level** (§11). "New slug" is applied by `routes` only (`TOPIC_SLUGS` in `src/lib/routes.js`).

**What is different about Portuguese grammar** (so no run copies the Spanish logic):

- **Contractions** are everywhere (*de+o = do, em+a = na, a+o = ao, a+a = à, por+o = pelo,
  em+um = num, de+aqui = daqui*) and appear from A1.
- **Articles in more places**: possessives take the article in Portugal (*o meu livro*); names often
  take it in speech (*a Maria*); *o senhor*.
- **Clitics** go *after* the verb by default (*enclisis*: *Chamo-me João, Vejo-o*), *before* it after
  triggers (*Não me chamo*, *Quem te disse?*, *Já o vi*); in the future/conditional of formal
  writing they split (*mesoclisis*: *dar-lhe-ei*).
- **Personal infinitive** (*para fazermos, sem eles saberem*), a feature English, German, French,
  Italian and Spanish do not have.
- **Future subjunctive** (*quando chegares, se tiveres tempo, quem quiser*) where Spanish and
  others use the present subjunctive or indicative.
- **`estar a` + infinitive** is the progressive in Portugal.
- **`perfeito composto`** (*tenho falado*) is **not** the Spanish *he hablado*: it means a repeated
  or continuing action up to now. A single recent event uses the *perfeito simples* (*hoje comi
  cedo*, not *tenho comido*). This is the biggest trap for Spanish and English speakers.
- *Gostar* is **not** like Spanish *gustar*: the person is the subject (*eu gosto de música*). The
  Spanish-*gustar*-like verbs in Portuguese are *apetecer, interessar, doer, faltar, parecer, custar,
  fazer falta*.
- *Haver/ter*: *há* = there is (Portugal), *ter* is possession; *tem* for existence is Brazilian.
- Nasal vowels and *-ão* plurals (*-ões, -ães, -ãos*), the *-l* → *-is* plurals, **open/closed**
  vowels in verb forms (*fala/falámos* with accent in Portugal, *falamos* in Brazil).

The order inside a level is fixed by `grammar-structure` (`grammatik-lehrplan.json`); the tables
are grouped, not ordered.

### A1 (19) — `grammar-a1`

| Slot | Now (Spanish) | Portuguese topic | New slug |
|---|---|---|---|
| `nomen` | gender: el/la | Nouns and gender: *o/a*, *-o/-a*, *-ão*, *-dade/-ção* feminine, the exceptions (*o dia, o mapa, o planeta, a mão, a foto, a moto*), common-gender persons (*o/a colega*) | `noun-gender` |
| `artikel` | el, la, un, una; al, del | Articles *o, a, os, as* / *um, uma, uns, umas*, and the **contractions** *de/em/a/por + article* (*do, no, ao, pelo, num*) | `articles` |
| `personalpronomen` | pronouns; tú/usted/vosotros | Subject pronouns *eu, tu, ele/ela, nós/a gente, eles/elas*; **tu, você, o senhor/a senhora, vocês** (§1.6); dropping the pronoun; ptBR: *você* everywhere | `subject-pronouns` |
| `praesens` | regular -ar/-er/-ir present | Present tense of regular *-ar, -er, -ir* verbs | `present-regular` |
| `konjugation` | ser, estar, ir, tener… | Key irregular verbs in the present: *ser, estar, ir, ter, haver, fazer, vir, ver, ler, dar, dizer, poder, querer, saber* | `present-irregular` |
| `praeteritum-sein-haben` | stem-changing | Vowel-change and spelling verbs in the present: *pedir → peço, ouvir → ouço, dormir → durmo, vestir → visto, seguir → sigo, sair → saio, perder → perco, medir*, *-ar* verbs in *-ear/-iar* | `vowel-change-verbs` |
| `verb-position-2` | ser/estar basics | *ser* and *estar*: the basics (who/what vs where/how) | `ser-estar-basics` |
| `berufe-mit-in` | hay / está | *há* or *está/estão* (there is vs where it is); ptBR: *tem* | `ha-estar` |
| `w-fragen` | question words | Question words *o que, quem, onde, de onde, para onde, quando, como, quanto, qual, porquê*; *porque é que…?* | `question-words` |
| `ja-nein-fragen` | yes/no with ¿…? | Yes/no questions (rising intonation, no inversion, *não é?*), negation with *não*, short answers by repeating the verb (*Fala inglês? — Falo.*) | `yes-no-questions` |
| `plural` | plural -s/-es | Plurals: *-s, -es, -ões/-ães/-ãos, -l → -is (animal → animais), -m → -ns, -r/-z → -es, -s*; plurals with accent loss (*mês → meses, inglês → ingleses*) | `plurals` |
| `adjektive-nach-sein` | agreement and position | Adjectives: agreement in gender and number (*uma casa branca, carros novos, português/portuguesa*), position | `adjective-agreement` |
| `possessivartikel` | mi, tu, su | Possessives **with the article** *o meu, a minha, os teus, o seu, o nosso*; *de* for owners; ptBR: article often dropped | `possessives` |
| `welcher-dieser` | este, ese, aquel | Demonstratives *este, esse, aquele; isto, isso, aquilo*, with contractions (*neste, nisso, daquele*) | `demonstratives` |
| `gern` | gustar | ***Gostar de***: *gosto de, gosto muito de* + noun/infinitive; *também / também não / eu também*; why it is **not** the Spanish *gustar* | `gostar-de` |
| `temporale-praepositionen` | time and days | Telling the time and days: *Que horas são? É uma hora. São duas e meia. Às oito. Na segunda-feira. De manhã, à tarde.* | `time-and-days` |
| `aduso` | y/e, o/u, pero, porque | *e, ou, mas, porque, também, por isso* | `e-ou-mas-porque` |
| `zahlen` | numbers | Numbers, prices, phone numbers: *um/uma, dois/duas, dezasseis, cem/cento, mil, milhão*; Portugal numbers (*NIF 123 456 789*) | `numbers` |
| `wortarten` | parts of speech | Parts of speech in Portuguese (articles, prepositions that contract, clitic pronouns) | `parts-of-speech` |

### A2 (21) — `grammar-a2`

| Slot | Now (Spanish) | Portuguese topic | New slug |
|---|---|---|---|
| `perfekt` | pretérito perfecto | ***Pretérito perfeito simples***: regular forms (*falei, comi, parti*; *falámos* with accent in Portugal) and use for finished actions | `perfeito-simples` |
| `zusammengesetzte-verben` | indefinido | Key irregular *perfeito*: *fui (ser/ir), tive, fiz, estive, disse, pus, vim, vi, dei, pude, quis, soube, trouxe* | `perfeito-irregular` |
| `n-deklination` | imperfecto | ***Pretérito imperfeito***: forms and use for habits and descriptions (*antes vivia…*); irregular *ser, ter, vir, pôr* | `imperfeito` |
| `trennbare-verben` | ir a + infinitive | ***Ir* + infinitive** (near future: *vou comer*); *ir a* in the sense of "to go to": ptBR | `ir-infinitive` |
| `komposita` | estar + gerund | ***Estar a* + infinitive**: *estou a trabalhar*; ptBR: *estou trabalhando*; gerund in Portugal only in formal and some regional speech (Alentejo, Algarve, Azores) | `estar-a-infinitive` |
| `reflexive-verben` | reflexive verbs | Reflexive verbs and daily routine: *levantar-se, chamar-se, deitar-se*; enclisis (*levanto-me*) and the first proclisis (*não me levanto*) | `reflexive-verbs` |
| `akkusativ` (+ `akkusativ.json`, `/object-pronouns`) | lo, la; personal a | Direct-object pronouns *me, te, o, a, nos, os, as*; **enclisis** (*Vejo-o*), forms after *-r/-s/-z* (*fazê-lo, di-lo*) and nasal endings (*dão-no*); proclisis after *não* | `object-pronouns` (keep) |
| `dativ` | le, se lo | Indirect-object pronouns *me, te, lhe, nos, lhes*; combinations *mo, ta, lho, lha* (*dá-mo*; mostly written); ptBR | `indirect-object-pronouns` |
| `modalverben` | tener que, poder | Verb + infinitive: ***ter de* / *ter que***, *poder, dever, querer, saber, conseguir, precisar de*; ptBR *ter que* | `ter-de-poder` |
| `komparativ-superlativ` | más… que | Comparatives and superlatives (*mais… (do) que, tão… como, o mais…, -íssimo*; *melhor, pior, maior, menor*) | `comparatives` |
| `lokale-praepositionen` | place prepositions | Place: *em, em cima de, debaixo de, ao lado de, à frente de, em frente de, atrás de, entre, perto de*; *aqui, aí, ali, lá*; contractions with articles | `prepositions-of-place` |
| `wechselpraepositionen` | a / en | *a, para* and *em*: going and being (*vou a Lisboa / vou para casa / estou em Lisboa*), *de… a, desde… até*; ptBR *ir para* | `a-para-em` |
| `indefinitpronomen` | algo, alguien | *algo, nada, alguém, ninguém, algum/alguma, nenhum, outro, todo, cada, qualquer* | `indefinites` |
| `satzstellung` | muy, mucho | *muito, pouco, bastante, demasiado, tão, tanto* (adverb vs adjective) | `muito-pouco` |
| `negation` | no, nunca | Negation: *não, nunca, nem, nada, ninguém, nenhum, também não, já não*; double negation (*Não vejo ninguém.*) | `negation` |
| `nebensaetze-weil-dass` | porque, como | *porque, como, por isso, então, portanto*; *que*-clauses with *acho que, diz que* | `porque-como` |
| `konjunktiv2-hoeflich` | polite requests | Polite requests: *Pode…? Podia…? Queria… Gostava de… Importa-se de…?* (imperfeito for politeness) | `polite-requests` |
| `positionsadverbien` | frequency | Frequency: *sempre, muitas vezes, às vezes, quase nunca, nunca*; ***costumar*** + infinitive | `frequency-costumar` |
| `adjektivdeklination-a2` | -mente | Adverbs in *-mente*; *bem/mal, bom/mau*; *muito bom* vs *muito bem* | `adverbs-mente` |
| `artikel-oder-nicht` | article or not | Article or no article (*Gosto de café. Tenho carro. É médica. Falo português.* but *o Pedro, a minha mãe*) | `article-or-not` |
| `ordinalzahlen` | ordinals, dates | Ordinal numbers (*primeiro, segundo, 1.º*), dates and floors (*3 de maio, o segundo andar, rés-do-chão, 1.º esquerdo*) | `ordinals-dates` |

### B1 (27 + 1 new) — `grammar-b1`

| Slot | Now (Spanish) | Portuguese topic | New slug |
|---|---|---|---|
| `zustandspassiv` | perfecto vs indefinido | ***Perfeito composto* and *perfeito simples***: *tenho trabalhado* = repeated/continuing action up to now (*Ultimamente tenho dormido mal*) vs single events; **differs from Spanish and English**; ptBR | `perfeito-composto` |
| `praeteritum-plusquamperfekt` | indefinido vs imperfecto | *Perfeito* or *imperfeito* in a story | `perfeito-vs-imperfeito` |
| `passiv-b1` | pluscuamperfecto | ***Mais-que-perfeito composto*** (*tinha comido*); the simple form (*comera*) is only mentioned (C1 reading, §3 new slot) | `mais-que-perfeito` |
| `futur` | futuro simple | Future: *futuro simples* (*falarei*), ***ir* + infinitive** (the usual spoken future), present for plans; future of conjecture (*Serão duas horas*); mesoclisis is only mentioned | `future` |
| `funktionen-von-werden` | condicional | *Condicional*: forms (*falaria, faria, teria*), advice (*Eu, no teu lugar…*), polite wishes; the *imperfeito* as a spoken conditional | `conditional` |
| `imperativ` | imperative | Imperative: *tu* (= 3rd person present: *fala*), *você/o senhor* (subjunctive: *fale*), *nós, vocês*; negative with the subjunctive (*não fales*); with pronouns (*diz-me, não me digas, façam-no*); ptBR: *você* forms for everyone | `imperative` |
| `infinitiv-mit-zu` | present subjunctive | ***Conjuntivo presente***: forms (regular and key irregulars) | `present-subjunctive` |
| `verben-als-nomen` | subjunctive after wishes | Subjunctive after wishes and feelings: *quero que, espero que, tenho pena que, oxalá, tomara* | `subjunctive-wishes` |
| `infinitiv-ohne-zu` | infinitive or subjunctive | Infinitive or subjunctive: *quero ir / quero que vás*; the personal infinitive is only **previewed** (full: B2) | `infinitive-or-subjunctive` |
| `finalsaetze` | para que | *para* + infinitive / *para que* + subjunctive | `para-que` |
| `temporale-nebensaetze` | cuando + subjunctive | ***Futuro do conjuntivo***: regular and irregular forms (*falar, comer, partir; ver → vir, ser/ir → for, ter → tiver, estar → estiver*), and its use in time clauses: *quando, assim que, logo que, depois de, até que* (*Quando chegares, liga-me.*) | `quando-future-subjunctive` |
| `konditionalsaetze` | si real | Real conditions: ***se* + presente / futuro do conjuntivo** (*Se chover, fico em casa. Se tiveres tempo, passa por cá.*) | `se-real` |
| `als-oder-wenn` | por / para | ***Por* or *para*** | `por-para` |
| `temporale-praepositionen-b1` | desde hace | *há… que, desde, desde há, até, durante, faz… que*, *demorar, levar* + time (*Moro cá há três anos. Estudo português desde janeiro.*) | `ha-desde` |
| `relativpronomen` | relative clauses | Relative clauses with *que, onde, quem, o que, o qual* (indicative), prepositions before *que* (*a casa em que vivo*) | `relative-clauses` |
| `indirekte-fragen` | indirect questions | Indirect questions and reporting in the present (*diz que…, pergunta-me se…, não sei onde…*) | `indirect-questions` |
| `lassen` | verbal periphrases | Verbal periphrases: *acabar de, voltar a, começar a, deixar de, continuar a, estar a, andar a, ficar a* + infinitive | `verbal-periphrases` |
| `konnektoren-grund-gegengrund` | linkers | Linkers: *mas, no entanto, além disso, por outro lado, portanto, por isso, ainda assim* (*embora* with the subjunctive is B2) | `linkers` |
| `genitiv` | possessive pronouns | Possessive pronouns *o meu, a tua, o dele, o seu*; *dele/dela* to avoid *seu* ambiguity | `possessive-pronouns` |
| `adjektivdeklination` | adjective position | Adjective position and short forms: *bom/boa, grande, santo → são, primeiro*; *um grande homem / um homem grande* | `adjective-position` |
| `partizip-als-adjektiv` | estar + participle | *Estar* + participle (*a loja está fechada*); **double participles** (*aceitado/aceite, entregado/entregue, ganhado/ganho*) and irregular ones (*aberto, escrito, feito, dito, visto, posto, vindo*) | `estar-participle` |
| `verben-praepositionen` | verbs + prepositions | Verbs + prepositions: *pensar em, sonhar com, depender de, lembrar-se de, gostar de, precisar de, esquecer-se de* | `verbs-prepositions` |
| `da-wo-woerter` | prepositional pronouns | Pronouns after prepositions: *para mim, sem ti, comigo, contigo, connosco* (ptBR: *conosco*), *consigo* (and its ambiguity) | `prepositional-pronouns` |
| `nutzen-benutzen` | ser/estar advanced | *Ser* and *estar*: changing meaning (*ser/estar bom, aborrecido, rico, vivo*), events (*A festa é na sexta*) | `ser-estar-advanced` |
| `positionsverben` | verbs like gustar | **Verbs that work like Spanish *gustar*:** *apetecer, interessar, doer, parecer, custar, faltar, fazer falta, ficar bem, cair bem* (*Apetece-me um café. Dói-me a cabeça.*) | `verbs-like-apetecer` |
| `wortbildung-nomen` | word formation | Word formation: *-ção, -dade, -mento, -eiro/-eira, -aria, -ista*; diminutives *-inho, -zinho* | `word-formation` |
| `adjektive-als-nomen` | lo + adjective | ***O* + adjective** (*o bom, o importante é…*), *o que, aquilo que, o facto de* | `o-adjective` |
| **new** `clitic-placement` | – | **Clitic placement**: the rule set in one place: enclisis by default; proclisis after *não*, negative words (*nunca, ninguém*), *já, também, sempre, só*, subordinating conjunctions (*que, se, quando*), question words, *todos/muitos* subjects; *ir* + infinitive (*vou dizer-lhe*); ptBR proclisis. Mesoclisis only mentioned. | `clitic-placement` |

### B2 (13) — `grammar-b2`

| Slot | Now (Spanish) | Portuguese topic | New slug |
|---|---|---|---|
| `konjunktiv2` | imperfect subjunctive | ***Imperfeito do conjuntivo***: forms (*falasse, fizesse, tivesse, fosse*) and uses (*Queria que viesses*) | `imperfect-subjunctive` |
| `modalsaetze` | si unreal | Unreal conditions: *se* + imperfeito do conjuntivo + condicional (*Se eu tivesse tempo, viajaria*); *se tivesse… teria…* (past, intro) | `se-unreal` |
| `passiv` | passive and se | Passive: *ser* + participle, ***passiva com se*** (*Aluga-se quarto*), impersonal *se*, *estar a ser* | `passive-and-se` |
| `relativsaetze-was-wo` | relative clauses advanced | Relative clauses with the subjunctive and prepositions (*Procuro alguém que saiba…; a casa em que vivo; cujo, o qual, quem*) | `relative-clauses-advanced` |
| `zumal-wohingegen` | reported speech | Reported speech with tense shifts (*Disse que viria, pediu-me que fosse*) | `reported-speech` |
| `zweiteilige-konnektoren` | subjunctive opinion | Subjunctive in opinion and doubt: *(não) acho que, é possível que, duvido que, não é verdade que* | `subjunctive-opinion` |
| `konsekutivsaetze` | aunque + subjunctive | Concession and consequence: *embora* + subjunctive, *ainda que, por mais que, tão… que, de modo que* | `embora-subjunctive` |
| `negationswoerter` | probability | ***Infinitivo pessoal***: forms (*para falarmos, sem eles saberem, é importante estudares*), when it is used or not used (own subject, impersonal, after prepositions and expressions of opinion) | `personal-infinitive` |
| `irgend` | accidental se | ***Futuro do conjuntivo*, further uses**: relative and "-ever" clauses (*quem quiser, o que for, onde quer que, quando quer que, seja qual for*), *se* + future subjunctive in contracts and rules | `future-subjunctive-uses` |
| `fokuspartikeln` | verbs of change | Verbs of change: *ficar, tornar-se, passar a, virar, acabar por, deixar de* | `verbs-of-change` |
| `modalpartikeln` | discourse markers | Discourse markers in speech: *pois, pois é, então, bem, olha, ora, portanto, não é?, pá, se calhar, é assim* | `discourse-markers` |
| `adjektive-mit-praepositionen` | adjectives + prepositions | Adjectives + prepositions (*farto de, capaz de, contente com, interessado em*) | `adjectives-prepositions` |
| `nomen-verb-verbindungen` | collocations | Collocations: *tomar uma decisão, ter saudades, dar um passeio, fazer caso, apresentar queixa, dar-se conta* | `collocations` |

### C1 (11 + 2 new, free + paid slots) — `grammar-c1`

| Slot | Now (Spanish) | Portuguese topic | New slug |
|---|---|---|---|
| `konjunktiv-1` | sequence of tenses | **Sequence of tenses** with the subjunctive; *mais-que-perfeito do conjuntivo* (*tivesse feito*); *futuro composto do conjuntivo* (*tiver feito*) | `sequence-of-tenses` |
| `es-korrelat` | cleft sentences | Emphasis and cleft sentences: *Foi a Ana que…, O que preciso é de…, É aqui que…, Era isso que…* | `cleft-sentences` |
| `passiversatz` | conditions without si | Conditions without *se*: *caso* + subjunctive, *desde que, a não ser que, a menos que, contanto que, no caso de* + infinitive | `conditions-without-se` |
| `futur-2` | non-finite clauses | Non-finite clauses: *ao* + infinitive, gerund and participle clauses (*Terminada a reunião, …*) | `non-finite-clauses` |
| `irreale-vergleiche` | como si | *Como se* + imperfeito/mais-que-perfeito do conjuntivo; *nem que* | `como-se` |
| `subjektive-modalverben` | modal periphrases | Modal periphrases: *dever / dever de, ter de, haver de, vir a, chegar a, ir* + infinitive | `modal-periphrases` |
| `nominale-praepositionen` | formal connectors | Formal connectors: *devido a, em virtude de, no entanto, não obstante, por conseguinte, a fim de, mediante, ao abrigo de* | `formal-connectors` |
| `nominalisierung` | nominalisation | Nominalisation in formal writing (*A realização do evento…*) | `nominalisation` |
| `partizipialattribute` | formal relatives | Formal relatives: *o qual, cujo, quanto, pelo que, o que*; indicative vs subjunctive nuances | `formal-relatives` |
| `textkohaerenz` | cohesion | Cohesion: reference, ellipsis, *o que, isso, tal*, register (Portuguese letters of the *Finanças* and *Segurança Social* type) | `cohesion` |
| `verbpraefixe` | prefixes | Prefixes and derivation: *des-, re-, pré-, in-, sobre-, contra-, entre-*, with the 1990-agreement hyphen rules | `prefixes` |
| **new** `mesoclise` | – | **Mesoclisis** (*dar-lhe-ei, far-se-ia, dir-lhe-ia*) in formal writing and reading; why it exists; why speech avoids it; ptBR: not used (`skip`) | `mesoclisis` |
| **new** `mais-que-perfeito-simples` | – | **Simple *mais-que-perfeito*** (*comera, fora, tivera*) for reading literature and formal texts, with the rule that the compound form replaces it in speech | `simple-pluperfect` |

The 3 new ids (`clitic-placement`, `mesoclise`, `mais-que-perfeito-simples`) follow the existing
conventions of their level (the C1 ones are paid slots like their siblings, with the `src/paid/`
copy and `build-paid-manifest`), get `arbeitsblatt` files and `grammatik.json` quick quizzes, and
are ordered by `grammar-structure`.

Gaps noted for later (new files, English ids): *a gente vs nós* as a usage note, *tu/você* as a
register topic (§1.6 is the interim answer), *haver* impersonal (*Havia / houve*), the *"-lo/-la"*
forms with their stem changes as a short reference table.

### 3.1 Grammar side files

| File | Portuguese course | Item |
|---|---|---|
| `grammatik.json` (quick quizzes per slot) | follow the slot map | each `grammar-<level>` for its slots |
| `akkusativ.json` (`/object-pronouns`) | direct-object pronouns and their forms (*o/a/os/as, lo/la, no/na*) | `grammar-a2` |
| `grammatik-lehrplan.json`, `grammatik-verwandt.json` | Portuguese syllabus order per level, related topics recomputed | `grammar-structure` |
| `kursinhalte.json`, `content/program.json` | Portuguese course plan per level (`program.json` unit titles also by `vocab-*`) | `grammar-structure` |
| `nachschlagen/starke-schwache-verben.json` (`/grammar/irregular-verbs`) | irregular verbs reference: sections `schwach` = regular, `stark` = irregular (*ser, ir, ter, fazer, dizer, pôr, vir, ver, ler, dar…*), `gemischt` = vowel-change (*pedir, ouvir, dormir, vestir*); rows *eu presente · ele perfeito simples · particípio* | `grammar-structure` |
| `nachschlagen/trennbare-verben.json` (`/grammar/reflexive-verbs-list`) | pronominal verbs reference (*lembrar-se de, ir-se embora, queixar-se, sentar-se, zangar-se*) | `grammar-structure` |
| `nachschlagen/verben-mit-praepositionen.json` | verbs + prepositions reference | `grammar-structure` |
| `wortarten.json` | parts of speech (Portuguese) | `grammar-structure` |
| `praepositionen-trainer.json` (`/prepositions`) | packs: *a / para / em*, *por / para*, place, time (*desde, há, até, durante*), contractions (*do/no/ao/pelo*); pack ids kept | `grammar-structure` |
| `uebersetzungen/grammatik.json`, `grammatik-themen.json` | empty now; refill from the Portuguese topics only with reliable translations | `grammar-structure` (optional) |
| `uebersetzungen/grammatik-ui.json` | keyed by German UI strings | **leave** (§9) |
| `verbtabellen.json` | Portuguese conjugation tables (§4.1) | `conjugation-data` |
| `grammatik-start/*` + generator | "Portuguese Grammar Start A1–B1" (§5.1) | `grammar-start-book` |
| `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json` (`/artikel` trainer) | **o / a** trainer: rule packs *-o → o, -a → a*, *-ção/-dade/-gem → a*, *-ma (Greek) → o* (*o problema, o tema, o sistema*), exceptions (*o dia, a mão, o mapa, a foto, a moto, o planeta, a tribo*), plural article *os/as*; `artikel-haeufigkeit.json` stays empty until ranks exist | `games` |

---

## 4. New modules

### 4.1 Conjugation tables (`conjugation-data`)

`src/data/verbtabellen.json` keeps `about`, `groups`, `verbs`. Six person rows in `PERSONS`
(`src/lib/verbtabellen.js`):

`eu · tu · ele/ela/você · nós · vós · eles/elas/vocês`

The **vós** row is kept so the six-slot schema, drills and generators stay unchanged: it is shown
muted with the note "old/formal; you only read it" and **never drilled** by default
(the trainer's *persons* switch has it off). In Brazil mode `showsVos(true)` hides it (§1.5), and
the *tu* row gets the note "regional in Brazil". A tense is a comma list of six forms (as now).

| Key | Holds |
|---|---|
| `inf` | infinitive (*falar*, *levantar-se*) |
| `group` | `hilfsverb` = *ser, estar, haver, ter, ir*; `modal` = verbs + infinitive (*poder, querer, dever, saber, costumar*); `unregelmaessig` = irregular; `regelmaessig` = regular *-ar/-er/-ir* models; `trennbar` = pronominal/reflexive verbs; `stem-change` = vowel-change verbs (*pedir, ouvir, dormir, vestir, seguir, preferir*) |
| `regular: true` | forms generated by `verbtabellen.js` from the ending (the run rewrites the Spanish generators as Portuguese *-ar/-er/-ir* generators; the *-ar* 1pl perfeito has an accent in pt-PT: *falámos*, and `ptBR` note *falamos*) |
| `praes` | presente do indicativo |
| `praet` | **pretérito perfeito simples** |
| `p2` | particípio (compound tenses: *ter* + `p2`; generated: perfeito composto, mais-que-perfeito composto, futuro composto, condicional composto, conjuntivo perfeito, mais-que-perfeito do conjuntivo, futuro composto do conjuntivo). **Double participles** are a separate key `p2b` (*aceitado / aceite*), see below. |
| `imperf` | pretérito imperfeito |
| `fut` | futuro simples (generated from the infinitive for regular, irregular roots *farei, direi, trarei* stored); **mesoclisis** is not stored: the helper generates *dar-lhe-ei* for the reading table |
| `cond` | condicional |
| `subj` | conjuntivo presente |
| `subjImpf` | imperfeito do conjuntivo (*-asse/-esse/-isse*) |
| **new** `subjFut` | **futuro do conjuntivo** (*falar, falares, falar, falarmos, falardes, falarem*; irregular ones stored: *for, tiver, estiver, vier, puder, quiser, fizer, disser, vir, pôr→puser*) |
| `imp` | imperativo afirmativo, six slots, `–` for *eu*: `–, fala, fale, falemos, falai, falem`; the negative is generated from `subj` (*não fales, não fale*) |
| **new** `infPers` | **infinitivo pessoal** (*falar, falares, falar, falarmos, falardes, falarem*; regular = same as `subjFut`; differs for irregulars: *ser → ser, seres, ser…* vs *for, fores…*, *ter → ter, teres…* vs *tiver, tiveres…*) |
| **new** `p2b` | optional second participle for the 'double participle' verbs (*entregar: entregado/entregue, ganhar: ganhado/ganho, gastar, aceitar, pagar: pagado/pago*) with a note which one goes with *ter* and which with *ser/estar* |
| `ger` | gerúndio (*falando*; in Portugal mostly formal, used with *a* + inf in speech) |
| `note` | usage note in English |
| `ptBR` | §1.5 (e.g. *falamos/falámos*, *estar + gerund*); the *vós* row is hidden by the helper in Brazil mode |

Irregular verbs store only the tenses that are irregular; the generator fills the rest and flags
every form that differs from the regular pattern (`x`), so the table highlights what to learn.
Minimum set: the three regular models, *ser, estar, haver, ter, ir, vir, fazer, dizer, poder,
querer, saber, pôr, ver, ler, dar, trazer, ouvir, pedir, dormir, vestir, seguir, sair, cair, perder,
medir, preferir, construir, rir, crer, caber, valer, haver-de, passear* (-ear), *odiar* (-iar),
reflexive models *levantar-se, chamar-se, ir-se embora*. Every form checked against a Portuguese
conjugation source (Priberam, Infopédia, *Dicionário da Academia*; Wiktionary only as a check);
the 1990-agreement spelling in pt-PT; accents (*falámos, falávamos, comeríamos, estivéssemos*)
checked by script.

### 4.2 Conjugation trainer (`conjugation-trainer`) — keep, extend

The trainer built for Spanish (`/grammar/conjugation`, `src/lib/conjugationTrainer.js`,
`conjugationTyped.js`, `src/data/conjugation-trainer.json`, `pnpm check:conjugation`) **stays**:
same page, same engine, same `{ variety, ptBR, drills: {tenses, groups, notDrilled, limits,
presets}, topicLinks, sets }` shape (the Spanish key `es419` becomes `ptBR`). The Portuguese run
changes content only, plus these additions (§13.2 has the Spanish run's own lessons):

- **Drills** from `verbtabellen.json`: tense/mood presente, perfeito simples, imperfeito,
  perfeito composto, futuro, condicional, conjuntivo presente, imperfeito do conjuntivo,
  **futuro do conjuntivo (new)**, **infinitivo pessoal (new)**, imperativo (affirmative: *tu, você,
  nós, vocês*; negative from the subjunctive), compound tenses; verb groups regular *-ar, -er,
  -ir*, vowel-change, *eu*-irregular, fully irregular, reflexive; persons with the *vós* switch
  **off** by default (it was the *vosotros* switch). Input: typed form with the Portuguese key row,
  or pills on small screens.
- **Hand-written sets** in `conjugation-trainer.json` (`{ id, level, title, kind, variety, items }`,
  `kind`: `form` | `choice`): **ser/estar** (A1, A2, B1), **por/para** (B1, links to `/prepositions`
  pack), **perfeito/imperfeito** in context (B1), **subjunctive or indicative** (B1, B2),
  **personal infinitive** (B2: *para (nós) ___ / sem (eles) ___*, own subject or not), **future
  subjunctive** (B1, B2: *Quando (tu) ___ a casa, liga-me*; *Se (ele) ___ tempo…*), clitic form
  sets (*enclisis/proclisis*: B1, in `clitic-placement`'s drills), irregular sets for the *eu*
  present, *perfeito irregular*, futuro/condicional irregular, and imperative sets.
- **Left out of drills:** *vós* (default off), *gostar* whole as a "gustar-like" verb, mesoclisis
  forms (a separate reading set at C1 only), imperatives of *poder, querer, saber, dever*.
- Every item: prompt with `___`, `options` (exactly one correct, or `answer` list), `explain` in
  English, `ptBR` where Brazil differs (the *estar a/estar -ando* contrast gets `skip`).

### 4.3 Business Portuguese (`business-portuguese`) — convert, B1–C1

- Page **`/business-portuguese`** (+ `/business-portuguese/[unit]`), data
  `src/data/business-portuguese/<unit>.json` (the Spanish folder `business-spanish/` is renamed; the
  unit ids stay as they are, e.g. `correos` → `emails` is a **new id**, §13 decision below), reusing
  the berufe deck components for the vocabulary part and the practice workspace for exercises.
- Units (new ids in English, same shape): `emails` formal emails (*Exmo./Exma. Senhor/Senhora,
  Venho por este meio…, Aguardo a sua resposta, Com os melhores cumprimentos, Cumprimentos*),
  `meetings` (opening, agreeing, disagreeing politely, summarising), `calls` phone calls,
  `interviews` job interviews in Portugal (questions, talking about experience, *tu/você/o
  senhor* register, salary talk), `cv` CV and cover letter conventions in Portugal (Europass,
  *carta de apresentação*, *carta de motivação*; whether a photo is usual: "to verify"),
  `negotiation` (C1) negotiating and presenting figures. The Spanish unit ids (`correos`,
  `reuniones`, …) are **renamed** by `business-portuguese` together with `BUSINESS_SLUGS`; storage
  keys stay on the old ids by a small map in `src/lib/businessSpanish.js` (renamed
  `businessPortuguese.js`), so saved progress survives.
- Unit shape unchanged: `{ id, level, title, variety, reviewed, intro, introEasy, phrases: [{ use,
  pt, en, register, variety, ptBR? }], models: [{ title, text, notes }], tips, words: [berufe deck
  entries or `{ ref, example, en?, deHint? }`], exercises: [{ id, context?, prompt, options,
  answer, explain, ptBR? }] }`. **The phrase key `es` becomes `pt`** (`business-portuguese`
  renames it in data and in `businessSpanishData.js`, and the validator). Portugal conventions
  first (*Exmo. Sr. Dr.*, *V. Ex.ª*, *Cumprimentos*, *Assunto:*, *Em anexo*, *Venho informar que*);
  Brazil differences as `ptBR` (*Prezado Sr., Atenciosamente*).
- Rules: `src/lib/businessPortuguese.js`, `scripts/check-business-portuguese.mjs` (words:
  `check-berufe`).

### 4.4 IMT driving vocabulary (`imt-vocab`) — convert (replaces DGT vocabulary)

- **Vocabulary only**: no official IMT test questions, no copied manual text, no claim to prepare
  for the exam on its own. Page **`/imt-vocabulary`**, data `src/data/imt/vocabulario.json` (the
  `dgt/` folder is renamed `imt/`) in the **berufe deck schema** (groups of words with `gender`,
  `plural`, `example`, `translations.en`, `variety`; refs `{ ref, example }` into the lexicon),
  rendered with the berufe deck components; validator `check-berufe.mjs` (or its core) reads
  `src/data/imt/`.
- Groups: *o carro* (parts, controls), *a estrada* (road types, *rotunda, faixa de rodagem,
  berma, via rápida, autoestrada, portagem, Via Verde*), *os sinais* (sign families and their
  words, no images copied from official material), *manobras* (*ultrapassar, dar prioridade,
  estacionar, inverter a marcha*), *o exame e a escola de condução* (*exame de código/teórico,
  exame de condução, carta de condução, categoria B, pontos*), *documentos e coimas* (*carta,
  livrete/DUA, seguro, IUC, inspeção, IPO, coima, ANSR*), *trocar a carta estrangeira*
  (exchange of a foreign licence at the IMT; general orientation: EU/EEA licences are usually
  valid, other licences may need an exchange within a period after residence starts: "to verify"). A short
  orientation box: the theory exam language options (which: "to verify"), the official source is
  the IMT website; the Portuguese *código da estrada* uses vocabulary that differs in Brazil
  (*carta de condução → carteira de motorista/CNH*, `ptBR` notes).
- **Where the removed Führerschein module comes back from:** unchanged from the Spanish plan (not
  in this repo's history; the icanspeak-english commit `db88ba4~1`); **restores nothing**, the same
  decision, same reasons. Queue runs must not touch other repositories.

---

## 5. Module map (convert)

### 5.1 Placement, learner shell, grammar book

| Module | Portuguese course | Item |
|---|---|---|
| `einstufung.json` (6 items per level, 2 drawn, each tests one level-typical feature) | Same design, European Portuguese. A1: *ser/estar*, present regular, *o/a* and contractions, *gostar de*, *há*; A2: *perfeito simples*, *imperfeito*, object pronouns (enclisis), *ir* + infinitive, *estar a* + infinitive; B1: *perfeito vs imperfeito*, *perfeito composto* (the trap), present subjunctive (wishes), *por/para*, future subjunctive in time clauses, imperative; B2: imperfect subjunctive, *se* unreal, *se* passive, personal infinitive, reported speech; C1: sequence of tenses, mesoclisis (recognise), *como se*, conditions without *se*, formal relatives. | `placement-test` |
| `einfach-pfad.json` ("Learn step by step", A1–B1) | Same design on the Portuguese grammar slots and A1–B1 vocab units; first steps for a newcomer in Portugal (greetings, *chamo-me*, *tu* then *o senhor*, numbers, *onde fica…?*, the *Junta de Freguesia* and AIMA appointment, the *centro de saúde*). Append-only in topics the path uses (§13.2). | `beginner-path` |
| `/step-by-step` screens (`src/lib/einfach-view.js`, `einfach-app.js`, `einfach-content.js`, noscript in `src/pages/step-by-step.astro`, `docs/easy-mode-tier1-v1.md`) | Portuguese units; *o/a* article screens instead of *el/la*; the recipe doc rewritten for Portuguese units | `beginner-path-ui` |
| `grammatik-start/en.json` (base book) + `scripts/generate-grammatik-start-pdf.mjs`, `check-grammatik-start.mjs` | **"Portuguese Grammar Start A1–B1"**, brand icanspeak Portuguese, 10 chapters on the Portuguese A1–B1 topics; key `titleDe` holds the English title (as now). `de.json` is reset with `--skeleton de` unless the run writes German explanations; `es`, `fr`, `it` as skeletons only if the generator supports them (no new languages are added by this item). | `grammar-start-book` |

### 5.2 Vocabulary

| Module | Portuguese course | Item |
|---|---|---|
| `content/lexicon/a1…b2.json` (units of 25 words, topics) | Same units, unit ids and topic slugs where the topic fits; Portuguese lemmas for Portugal, chosen by topic and frequency, with the resident's needs first (*a Junta de Freguesia, o atestado de residência, o NIF, o NISS, o número de utente, o senhorio, a renda, o recibo de renda, o contrato de arrendamento, o centro de saúde, a receita, o IRS*); schema §1.4, `variety` and `ptBR` §1.5 | `vocab-a1` … `vocab-b2` |
| `content/lexicon/c1.json`, `c2.json` | 24 + 16 units, same conventions | `vocab-c1-c2` |
| `wortschatz.json` (phrase cards) | Portuguese phrase cards; `note` = usage tip in English; `variety` | `vocab-a1` |
| `haeufigste-woerter.json` + `scripts/haeufigste-woerter.mjs`, `attach-ranks.mjs`, `artikel-haeufigkeit.mjs` | read `pt_50k` (Brazil-heavy: §1.4) instead of `es_50k`; licence "to verify"; data regenerated only when the list can be downloaded | `vocab-a1` |
| `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json` | keep pictures, re-key to the Portuguese ids per level | each `vocab-*` |
| `lexicon/i18n/<lang>.json` | Portuguese → learner language (§1.4): `de`, `es`, `fr`, `it` | each `vocab-*` for its level |
| `uebersetzungen/woerter-uk.json` | Ukrainian glosses | `vocab-a1` decides: refill for Portuguese A1 if reliable, else empty it (`entries: {}`) |

### 5.3 Listening (`hoeren.json`, ids kept, settings in Portugal) — `listening`

| Id | Portuguese script |
|---|---|
| `a1-ansage-bahnhof` | Announcement at a railway station (CP, platform, delay) |
| `a1-anruf-arzt` | Voicemail from the *centro de saúde*: your appointment |
| `a1-supermarkt` | At the supermarket: *Onde fica…?* |
| `a1-verabredung` | Phone call: *Vamos tomar um café?* |
| `a2-amt-termin` | At the *Junta de Freguesia* or *Loja do Cidadão*: changing an appointment |
| `a2-wohnungsbesichtigung` | Viewing a flat (*apartamento, T2*) |
| `a2-radio-wetter-verkehr` | Radio: weather and traffic |
| `a2-paketdienst` | Voicemails: a parcel and the plumber (*canalizador*) |
| `b1-krankmeldung` | Calling in sick at work (*baixa médica*) |
| `b1-elterngespraech` | Meeting with the class tutor (*diretor de turma*) |
| `b1-radio-muelltrennung` | Radio feature: recycling and the coloured *ecopontos* |
| `b1-durchsage-ersatzverkehr` | Announcement: line closure and replacement bus |
| `b2-diskussion-homeoffice` | Team meeting: *teletrabalho* |
| `b2-interview-anerkennung` | Interview: getting a foreign degree recognised (*reconhecimento de graus*) |
| `b2-beschwerde-versicherung` | Complaint to an insurance company |
| `b2-vortrag-ehrenamt` | Short talk: volunteering |

`voices` = pt-PT voices (Azure names such as `pt-PT-RaquelNeural`, `pt-PT-DuarteNeural`, "to
verify" before the first render); every script carries `variety: "pt-PT"`;
`uebersetzungen/hoeren.json` stays empty. Places and firms invented. Note in the report: browser
voices are often pt-BR, so any page that speaks with a browser voice says so.

### 5.4 Reading and writing — `reading-writing`

| Module | Portuguese course |
|---|---|
| `lesen.json` (B1 short text, reading tasks 1–4, form task, writing prompt, error hunt) | B1 reading set from life in Portugal: notices matching (*condomínio, escola, ginásio*), a local news article true/false, forum posts *quem diz isto?*, an interview; form = an invented municipal form (e.g. library card, *Junta* certificate request); writing prompt = an email; error hunt = typical learner errors (*sou cansado, a problema, eu vou ao a casa, o meu amigo, sua casa*). Same ids, levels, types, `kind`s, `from` links. |
| `fertigkeiten/lesen.json`, `fertigkeiten/schreiben.json`, `/writing/[id]` data | Portuguese reading/writing hubs and writing tasks A1–B2 (forms, WhatsApp messages, emails to a *senhorio*/school/employer, complaint (*livro de reclamações*), opinion text, formal letters to Finanças and Segurança Social) |
| `uebersetzungen/lesen.json`, `schreiben.json` | stay empty |
| `src/lib/schreibKorrektur.js` | checks Portuguese (LanguageTool `pt-PT`, own rules for the clitic hyphen and accents); LanguageTool is only called if the backend flag allows it (it is off) |

Item ids added next to the existing ones: reading `a1-phone-messages`, `a2-junta-notice` (renamed
from `a2-padron-notice`), writing `a2-junta-form`, `a2-email-school`, `b1-email-landlord`,
`b1-email-employer`, `b2-opinion-text`. Formats: dates `11/11/2026`, times `17:30`, money `45 €`;
phone numbers are obvious placeholders (Portuguese mobiles start with 9: `9X0 000 0xx`: "to verify"
whether a reserved fiction range exists); emails use `example.com`; NIFs and NISSs written as
`000 000 000` placeholders.

### 5.5 Speaking — `speaking`

| Module | Portuguese course |
|---|---|
| `sprechen.json` (3 picture tasks) | 3 picture descriptions (A2) with follow-up questions, same pictures |
| `sprechen-b1b2.json` stages | B1/B2: **1 · The photo** (describe and imagine), **2 · The talk** (short monologue), **3 · Conversation/role play**; modelled on the speaking tasks of DEPLE B1 and DIPLE B2 (timings "to verify") and labelled "in the style of" |
| `redemittel.json` (14 functional sets) | same 14 set ids and phrase order (the beginner path addresses `redemittel:<set>#<index>`); key `de` = Portuguese phrase, `en` = English meaning/usage; Portugal forms of address throughout (*tu* in friends sets, *o senhor/a senhora* in services sets); `variety` on every phrase |
| `redemittel-i18n/<lang>.json` | re-keyed to the Portuguese phrases; **`de`, `es`, `fr`, `it`**; `pt.json` emptied (and deleted by `cleanup`); other sidecars only where reliable |
| `fertigkeiten/sprechen.json`, `uebersetzungen/sprechen.json` | Portuguese hub; translations empty |

### 5.6 Pronunciation — `pronunciation`

| Module | Portuguese course |
|---|---|
| `ausspracheregeln.json` | European Portuguese rules in the old rule slots: **vowel reduction and dropped unstressed *e*** (*pequeno* /pɨˈkenu/), open/closed vowels (*avó/avô, é/ê, ó/ô*), **nasal vowels and diphthongs** (*pão, mãe, bem, põe, muito*), *s/z* as /ʃ, ʒ/ before consonants and at the end of a word, *lh/nh*, *r/rr* (*rato, carro, caro*), stress and written accents (*aguda, grave, esdrúxula*), *ç, c, ch, j, g*, *x* (four values), the silent *h*, *-r* at the end, *ce/ci*, linking between words; notes `ptBR` (palatalised *t/d*, no reduction) |
| `aussprache-check.json` | sentences A1–B1 (*caro/carro, pais/país, avó/avô, para/pára* (old), *esta/está*), question slots stay questions |
| `satzmelodie.json` | intonation: yes/no questions (rise), *wh*-questions (fall), lists, exclamations, polite requests |
| `zungenbrecher.json` | traditional Portuguese tongue twisters (*Três pratos de trigo para três tigres tristes*, public domain) by level |
| `aussprache-muttersprache.json` | drills per first language: **English, German, Spanish, French, Italian** speakers first (e.g. Spanish: vowel reduction, *j/ch/lh/nh*, nasal vowels, *s → sh*; English: nasal vowels, *r*, open/closed *o/e*; German: *r*, reduced vowels, *ão*; French: *r*, *o/ô*, nasal vowels (same but different), *lh*; Italian: double consonants, *s/z*, reduced vowels); other slots only where reliable |
| `fehler-nach-sprache.json` `area: "aussprache"` | rewritten together with the drills (they link both ways: `pnpm check:aussprache`) |

Every `audio` flag stays `false` until pt-PT recordings exist; the pages read with a pt-PT browser
voice where one is installed (`LANG = "pt-PT"` in the check libs, the dialogue voice in
`src/lib/spielKit.js`), and say so when the browser has only a pt-BR voice.

### 5.7 Idioms, mistakes, slang — `idioms-mistakes`

| Module | Portuguese course |
|---|---|
| `redewendungen.json` | Portuguese idioms and proverbs B1–C1 used in Portugal (*estar com a cabeça na lua, custar os olhos da cara, pagar o pato, enfiar o barrete, a pedra no sapato, de pequenino se torce o pepino*); `de` = the idiom, `en` = English meaning; origin only where well sourced |
| `umgangssprache.json` | colloquial Portugal Portuguese (*fixe, giro, bué, pá, tipo, gajo/gaja, tasca, chato, aldrabão, desenrascar-se, pois, está bem*) with register notes; mild-to-strong swearing with warnings, no slurs |
| `typische-fehler.json` | typical mistakes (*eu sou cansado, a problema, eu gosto os livros, eu vou ao Lisboa, eu estou a falar* vs *estou falando* register, *sua casa*) in the same 5 group ids |
| `fehler-nach-sprache.json` | mistakes per first language. Language slots: `portugiesisch` (Portuguese speakers) → **free again**; **`spanisch`** (Spanish speakers) gets its own set: the *"portuñol" mistakes* (*obrigado/obrigada*, *muy* → *muito*, *tengo* → *tenho*, *gustar* → *gostar de*, *yo hablo*, *hay* vs *há*, *tú* vs *tu*, false friends, vowel reduction); keep `englisch`, `deutsch`, `franzoesisch`, `italienisch`, `arabisch`, `ukrainisch`, `russisch`, `chinesisch`; add `hindi`/`nepali` only with reliable content (large groups of residents in Portugal); `tuerkisch`, `persisch`, `polnisch`, `vietnamesisch`, `tagalog`, `rumaenisch` kept only if the run writes reliable content, otherwise removed (with their drills) |
| `wortfallen.json` | false friends for English (*actualmente → atualmente = at the moment, not actually; assistir; esquisito; pretender; costume = custom; ignorar*), German (*o ginásio* ≠ Gymnasium, *a taxa* ≠ Tasse, *o prémio*), **Spanish** (*esquisito* = odd, not exquisite; *polvo* = octopus; *oficina* = workshop; *salir → sair*; *embaraçada* ≠ *grávida*; *rato* = mouse/rat vs *rato* "moment"; *propina* = tuition fee), French (*assistir* ≠ assister = attend, *puxar* ≠ pousser), Italian (*burro* = stupid/donkey, *caldo* = broth) speakers; each entry "to verify" against a dictionary; group ids new, en.json keys re-keyed in the same commit |
| `synonyme.json` | Portuguese synonym groups A1–B2 with register differences |

### 5.8 Culture and knowledge (Portugal first, then the lusophone world) — `culture`

`kultur.json` topics, ids kept:

| Id | Level | Portuguese course topic |
|---|---|---|
| `duzen-siezen` | A1 | ***Tu* or *o senhor*: how formal to be in Portugal** (§1.6) |
| `pfand` | A1 | Greetings: *dois beijinhos*, handshake, *Bom dia*, *Olá, tudo bem?* |
| `sonntagsruhe` | A1 | Daily rhythm: meal times, opening hours, Sundays and *feriados*, *a hora do almoço* |
| `trinkgeld` | A1 | Cafés and paying: *a conta, o pequeno-almoço, a bica, o pastel de nata*, tipping |
| `bundeslaender` | A2 | The regions and *distritos* (18 mainland *distritos*, 2 autonomous regions, *NUTS* regions in short): Lisboa, Porto, Algarve, Alentejo, Madeira, Açores |
| `feiertage` | A2 | Public holidays: national, municipal (*Santo António, São João, São Martinho*) |
| `muelltrennung` | A2 | Recycling: *ecopontos* (blue, yellow, green), *contentores* |
| `termine` | A2 | Appointments and *senhas*: AIMA online, *Loja do Cidadão*, *Balcão Único* |
| `anmeldung` | B1 | **Registering your life: NIF, NISS, *atestado de residência*, *número de utente*** (the first administrative steps; general orientation) |
| `krankenversicherung` | B1 | Public health: SNS, *centro de saúde*, *urgências*, *médico de família*, *número de utente*, *taxas moderadoras* |
| `mieten` | B1 | Renting a flat: *contrato de arrendamento, caução, renda, condomínio, o recibo de renda eletrónico* |
| `schulsystem` | B1 | The school system: *pré-escolar, 1.º ciclo, 2.º ciclo, 3.º ciclo, secundário, ensino profissional*, *ensino superior* |
| `arbeit-finden` | B1 | Finding a job: IEFP, *currículo*, contract types (*contrato a termo, sem termo*) |
| `ausbildung` | B2 | Vocational training and university; *reconhecimento de habilitações* (recognition of foreign degrees) |
| `kuendigung` | B2 | Leaving a job: notice, *rescisão, despedimento, subsídio de desemprego* (general orientation) |
| `oeffentlich-rechtlicher-rundfunk` | B2 | Public media: RTP and regional broadcasters |
| `vereine` | B2 | Associations, *coletividades, ranchos folclóricos*, volunteering |
| `foederalismus` | C1 | **State and local power**: Republic, *Presidente*, *Assembleia da República*, *Governo*, *autarquias* (*freguesia, município*), the autonomous regions Madeira and Azores (not federal) |
| `sozialversicherung` | C1 | ***Segurança Social***: NISS, *Segurança Social Direta*, contributions, *reforma*, general orientation |
| `wahlen` | C1 | Elections and the electoral system (factual, neutral) |
| `erinnerungskultur` | C2 | **The 25 April 1974 revolution and the end of the dictatorship** (factual, neutral; *Estado Novo, Revolução dos Cravos*), and decolonisation |
| `grundgesetz` | C2 | The Constitution of 1976 and the Constitutional Court |
| `mitbestimmung` | C2 | Unions, *contratação coletiva* and workers' rights |

| Other module | Portuguese course |
|---|---|
| `kultur-insider.json`, `kultur-bilder.json` | Portugal insider tips (*o café da esquina, o prato do dia, a conversa de escada, o grupo de WhatsApp do condomínio, "pois", saudade*); pictures only where they fit |
| `wusstest-du.json`, `kalender-saetze.json` | "Did you know?" about Portuguese; daily sentences in Portuguese with English |
| `zitate.json`, `uebersetzungen/zitate.json` | Portuguese-language quotes (Pessoa, Camões, Saramago, Sophia, Eça…), public domain or properly attributed short quotes, verified attribution (author death year and public-domain status "to verify" per author); translator rights for English versions: our own translation |
| `/explore` (+`/films`) | Portuguese and lusophone films and series (Portugal first, then Brazil, Angola, Cape Verde, Mozambique): titles and short own descriptions only |
| `/knowledge/country-and-culture`, `/knowledge/learning` | Portugal and the lusophone world, learning tips for Portuguese (text via `ui-pages-*`) |

Facts that change (fees, figures, rules) need a source and an "as of" date in the sourcing note.

### 5.9 Games

| Module | Portuguese course | Item |
|---|---|---|
| `artikel-sprint` (`/games/gender-sprint`) | **Gender sprint**: *o / a* gates, *os / as* plural gates; traps *o dia, a mão, o mapa, a foto, o problema* | `games` |
| `/artikel` trainer + `artikel*.json` | o/a trainer (§3.1) | `games` |
| `quakiSpringt/fragen.json`, `turm.json` | Portuguese quiz pools per level | `games` |
| `hochstapler/themen.json`, `redemittel.json`, `strings.js` | Portuguese impostor themes on Portuguese lexicon ids, sentence starters A1–C1 | `games` |
| `satzregen/saetze.json` + `quelle.txt` | own Portuguese sentences; word order is freer than English: every other correct order is an `{alt}` in `quelle.txt`; mode ids kept (`v2` statements and questions, `janein` yes/no, `klammer` → object pronouns after the verb (enclisis), `nebensatz` → indirect questions) | `games` |
| `nussnacht` (`src/lib/nussnacht`) | shots *o / a* from lexicon `gender` (`g` 0 o, 1 a; plural creatures take *os/as*); bosses = the gender traps (*o mapa, a foto, o problema, a mão, o dia*); the "two-word cracker" upgrade → compound nouns (*guarda-chuva, abre-latas, quebra-nozes* → *o*) | `games-arcade` |
| `hoerSafari` (Listening safari) | hear *o/a* + noun, hit the picture; **no pt-PT audio exists**, so the browser voice speaks (pt-PT if installed, else pt-BR with a warning line), and without speech the word is shown at once | `games-arcade` |
| `buergeramt` (`/games/aima`, `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/*`) | **AIMA and Finanças sim**: desk in the invented town of Vila Soalheira. Days: *Junta de Freguesia* desk (*atestado de residência*: ID, proof of address, two witnesses/signature; "to verify" what is needed), *Finanças* desk (NIF: passport, proof of address/tax representative if non-resident), *Segurança Social* desk (NISS), *centro de saúde* desk (*número de utente*: *atestado de residência*, passport), AIMA appointment desk (*autorização de residência*, renewal: form, passport, photo, proof of address, NIF, NISS, fee payment; form names and fees "to verify"). The player checks **paperwork completeness only**; the nationality route and golden-visa-type requests appear as customers who are referred to information ("this desk doesn't decide that") plus a "general orientation, not legal advice" box. Paper kinds keep their ids (`ausweis` = national ID/passport, `pass` = passport, `meldeschein`/`abmeldung` = application form with boxes, `wgb` = rental contract / proof of address); rule `art: "echt"` = usual Portuguese practice with a source type, `"lindenau"` (value kept) = made-up Vila Soalheira rule. | `aima-sim` |
| `knigge` (`/games/manners`, `src/lib/knigge/scenes.js`) | manners in Portugal: greetings and *beijinhos*, meal times, *tu / o senhor / a senhora*, the café (*a bica*, *a conta*), neighbours, punctuality, *Dona*; `de` = the Portuguese line, `en` = English meaning; wheel `sie`/`du` = *o senhor/a senhora* / *tu* | `games-dialogue` |
| Lindenau / Villabruno RPG (`/games/vila-soalheira`, `src/lib/lindenau/*`, `uebersetzungen/lindenau.json`) | **Vila Soalheira**, an invented Portuguese town (working name: `games-dialogue` checks that no real *freguesia* or *município* has it, else picks another and updates this plan): errands at the *pastelaria*, the *estação de comboios*, *centro de saúde*, *mercearia*, new neighbour, *café* | `games-dialogue` |
| `/game` (live-quiz join page) | content from the teacher quiz | `teachers` |

### 5.10 Teachers — `teachers`

| Module | Portuguese course |
|---|---|
| `arbeitsblatt/<id>.json` | tandem extras for the Portuguese topic in each slot (blue tile: infinitive → form, *o/a*, singular → plural, *tu → o senhor*; choice tiles *ser / estar*, *por / para*, *o / a*) |
| `partneruebungen/*` | same scenarios in Portugal: hairdresser (*cabeleireiro*), *troca de línguas*, market stall (*feira*), new room, *perfeito simples* memory, picnic, weekend bingo, *festa da junta*, shared-flat dice; drafts until reviewed |
| `unterricht-wortschatz.json`, `lernstunde-texte.json`, timetable texts in `src/lib/stundenplan.js` | Portuguese lesson-mode word fields and phase texts (phase detection strings adapted) |
| `downloads.json` | Portuguese download catalogue (links to CAPLE, Camões I.P., Priberam/Infopédia, AIMA, IMT, Portal das Finanças, Segurança Social, official sources) |
| printable games, tests, surveys | domino *o / a*, plurals, word ↔ meaning; class-test detection for Portuguese grammar words |
| `einstieg-bilder.json` | photo ids, language-neutral: keep |

### 5.11 Life in Portugal: civics, nationality, AIMA

| Item | Files |
|---|---|
| `civics` | `leben-in-deutschland.json` (meta: `totalQuestions`, `passScore` as **our own** figures; questions own, grouped by topic area: the Republic and the Constitution of 1976, institutions, territory and the autonomous regions, geography, history (from the 12th century to 25 April and EU accession), culture, society; every fact with a source in the sourcing note), `uebersetzungen/leben-in-deutschland.json` (emptied unless reliable), `/civics` pages (`/test`, `/facts`); the CCSE-specific text and downloads on `/facts` go. **Decision:** Portugal's nationality rules, as far as known, ask for **Portuguese language proof** (usually A2), not a separate civics test; the reform debated in 2025 may add a knowledge-of-culture or civics requirement ("to verify"). So `civics` is a **general civics module, not a nationality test**; it is framed as "know the country you live in", and the page says that if a civics test becomes part of the nationality process, the user must check the official requirements. |
| `nationality-path` | `pruefungen/dtz/uebungssatz-1.json`, `src/lib/dtzTrainer.js` texts, paid `dtz/uebungssatz-{2,3,4}.json`, new `/nationality` page (`src/pages/nationality.astro`: general orientation only), registry `dtz` texts |
| `aima-sim` | `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/{regeln,faelle,daten,kunde,tisch}.js` texts |

Notes the pages carry, **all "to verify" in the reports**: AIMA (*Agência para a Integração,
Migrações e Asilo*) replaced SEF's administrative role in October 2023 and the processes (online
portal, appointments, *manifestação de interesse* ended in 2024) changed repeatedly; the
nationality route (residence years, language proof, the *Instituto dos Registos e do Notariado /
IRN* processes applications, Sephardic route ended 2024; the 2025 reform proposals) is in flux;
NIF at *Finanças* (a non-resident needs a tax representative: "to verify"); NISS at *Segurança
Social*; *número de utente* at the *centro de saúde* (usually with an *atestado de residência* from
the *Junta de Freguesia*: "to verify"); the *Cartão de Cidadão* is for citizens, residents get the
residence card.

### 5.12 Portuguese for work (`data/berufe/`, now `/spanish-for-work`) — `portuguese-for-work`

Same 10 sector ids (progress keys), content for Portugal, sectors where immigrants and remote
workers in Portugal often work. The sector assignment **stays as the Spanish course has it** where
it fits; two are swapped (see §13):

| Id | Portuguese course sector |
|---|---|
| `pflege` | Care work: elderly care at home and in *lares* (*cuidador/a, ajudante de ação direta*) |
| `gastronomie` | Hospitality: cafés, restaurants, kitchens (*restauração*) |
| `kita` | **Cleaning and domestic work** (*limpeza, empregada doméstica*, incl. childcare in families) |
| `elektro-technik` | **Agriculture and farm work** (*o campo, estufas, vindima, colheita; Alentejo, Algarve*) |
| `bau-handwerk` | Construction and trades (*construção civil, pedreiro, eletricista*) |
| `einzelhandel` | Shops and supermarkets |
| `lager-logistik` | Warehouse and logistics |
| `kraftfahrer` | Driving and delivery (*TVDE, estafeta, distribuição*); refs into `imt/vocabulario.json` allowed |
| `hotel` | Hotels, tourism and short-term rental (*alojamento local*) |
| `buero` | Office, admin and **tech/remote work** (links to Business Portuguese; the digital nomad group of learners) |

Conventions as the lexicon (§1.4): own words `gender` o/a, plural, `forms` per §1.4,
`translations.en` = English gloss, `deHint` = German translation (the German tab) or removed;
`variety` on own entries. Working conditions (contracts, *recibos verdes*, *trabalho independente*,
*TVDE* rules) only as general orientation, "to verify". Validator `src/lib/berufeCore.js`
(`pnpm check:berufe`).

### 5.13 Word stories (`content/wortgeschichte/`) — `word-stories`

Portuguese etymology stories, new files by Portuguese lemma slug, same schema: Latin (*casa,
falar* (< *fabulare*), *água*), Arabic (*azeite, almofada, açúcar, alface, alfândega, oxalá*),
Germanic (*guerra, branco, roupa*), Greek (*telefone, biblioteca*), **Age of Discovery loans in
both directions** (*chá, biombo, caravela, bazar, marmelada*; Portuguese words in Japanese, English
and others, e.g. *pão → pan*, only with a source: never claim an etymology without one), African and Brazilian loans (*banana, zebra, cachimbo, samba, mandioca*),
*saudade*. First batch about 30 A1–A2 words, every story sourced (Priberam, Infopédia, Machado's
*Dicionário Etimológico*, Wiktionary), `status: "entwurf"`, `checkedBy`/`checkedAt` set. The 30
Spanish stories are deleted when their Portuguese batch lands (the same `publishOn` dates reused);
`cleanup` removes any left. `entryLang` in `wortgeschichteCore.js` gets `pt`.

### 5.14 Accents and languages — `accents-languages`

| Module | Portuguese course |
|---|---|
| `/knowledge/accents` (`dialekte.json`, `dialekte-karte.json`, `dachMap.js`) | varieties of Portuguese **in Portugal** (northern, Central/Lisbon, Alentejo and Algarve, Azorean, Madeiran) with features (*vowel reduction, -ão vs -om, s → ʃ, ditongação*); world varieties (Brazilian, Angolan, Mozambican, Cape Verdean, Guinean, São Toméan, Timorese) as notes; **Mirandese** (official minority language, Terra de Miranda) and *Barranquenho* as dots (`lang: true`). Map geometry from Natural Earth as the previous runs did (geo packages in a scratch folder, never site dependencies). |
| `/knowledge/languages` (`sprachen-welt.json`, `sprachen-karte.json`) | where Portuguese is spoken: Portugal, Brazil, Angola, Mozambique, Guinea-Bissau, Cape Verde, São Tomé and Príncipe, Timor-Leste, Equatorial Guinea (official), Macau (co-official, small), plus large diaspora communities (France, Switzerland, Luxembourg, US, Canada, UK); status keys keep names with these meanings |

---

## 6. Data-file naming

Data file names and folders stay as they are (German names: `einstufung.json`, `hoeren.json`,
`grammatik/…`): code, generators and validators reference them, and renaming buys nothing for a
visitor. **Two folders are renamed by their Portuguese item** because they carry a Spanish name
that would leak into the repository vocabulary (not a visitor path): `src/data/business-spanish/`
→ `business-portuguese/` and `src/data/dgt/` → `imt/` (with `src/lib/businessSpanish*.js` →
`businessPortuguese*.js`, `scripts/check-business-spanish.mjs` → `check-business-portuguese.mjs`,
and the `package.json` script names in the same commit). New files use English names. A later
clean-up of other file names is out of this queue.

---

## 7. Modules dropped (removed by `cleanup`)

| What | Why | Restore |
|---|---|---|
| Spanish-course leftovers no item converted (e.g. the SIELE band sets `telc-*` and `/siele/levels`, paid DELE A2 mocks still in Spanish, unconverted word stories, CCSE downloads) | must not stay next to Portuguese content | `git checkout <cleanup-commit>~1 -- <path>`; recorded in the `cleanup` report and §13 |
| `lexicon/i18n/pt.json`, `redemittel-i18n/pt.json`, the Portuguese **UI** (`public/i18n/pt.json`, its `src/lib/languages.js` entry, its entry-pages block, `/pt/` pages, `docs/lang-coverage.json` row) | Portuguese → Portuguese makes no sense; the Spanish course's pt UI is removed by `ui-lang-es` (§10.4), the sidecars by `cleanup` | same |
| `es`-valued fields left in `berufeCore.js`, the games and `TRANSLATION_LANGS` after `vocab-a1` adds Spanish back as a **UI** language | handled by their items; `cleanup` greps for leftovers | same |
| `el/la`, `ES419_*`, `LATAM_MODE` names after the rename (§1.5), `SPANISH_LEVELS` | no Spanish value left | same |
| Spanish-course redirects in `astro.config.mjs` (`ROUTE_RENAMES`, `DROPPED`, `ACCOUNT_REDIRECTS` where the Spanish run kept any) | new site at `/portuguese`, no `/spanish` URL was ever public here | `git checkout <routes-commit>~1 -- astro.config.mjs src/lib/routes.js` |
| Empty sidecars, unused components, leftover generators and photos the Spanish `cleanup` already removed | already gone | – |
| `public/logos/` Spanish course logos, `public/og/` Spanish cards | replaced by the Portuguese logos (`base-path-and-brand`) | `git checkout <commit>~1 -- <path>` |

Experiment pages follow CLAUDE.md (`EXPERIMENTE.md` archive entry before removal).

---

## 8. Slugs to rename (`routes`)

Current (Spanish course) → Portuguese course. No redirects from Spanish-course URLs: the site at
`/portuguese` is new and nothing was deployed. Every internal link, `catalog.js` menu,
`suche-seiten.json`, `entry-pages.json`, sitemap and `llms.txt` follows, base-aware.

| Current | New |
|---|---|
| `/dele` (+`/[slug]`) | `/caple` (+`/[slug]`: `ciple-a2`, `deple-b1`, `diple-b2`, `daple-c1`, `duple-c2`) |
| `/dele/a1` | `/caple/acesso-a1` |
| `/dele/language-use` | `/caple/language-use` |
| `/siele` (+`/practice-set`) | `/caple/level-check` (+`/practice-set`) |
| `/siele/levels` (+`/[slug]`) | removed (§2) |
| `/nationality/dele-a2` (+`/mock-test`, `/practice-set`) | `/nationality/ciple-a2` (+`/mock-test`, `/practice-set`) |
| `/ccse` (+`/test`, `/facts`) | `/civics` (+`/test`, `/facts`) |
| `/spanish-for-work` (+`/[beruf]`) | `/portuguese-for-work` (+ sector slugs per §5.12 titles: `care-work`, `hospitality`, `cleaning-domestic-work`, `agriculture`, … unchanged where already English) |
| `/business-spanish` (+`/[unit]`) | `/business-portuguese` (+`/[unit]` per §4.3) |
| `/dgt-vocabulary` | `/imt-vocabulary` |
| `/exams/dele-or-siele` | `/exams/ciple-deple-celpe-bras` |
| `/games/extranjeria` | `/games/aima` |
| `/games/villabruno` | `/games/vila-soalheira` (or the name `games-dialogue` settles on) |
| `/games/gender-sprint`, `/grammar/reflexive-verbs-list` | kept |
| grammar topics `/<slug>` | §3 "New slug" (`TOPIC_SLUGS`) |
| item slugs (listening, reading, writing, speaking, culture, phrases, work groups: `ITEM_SLUGS`, `WORK_GROUP_SLUGS`) | kebab-case of the new English title where it changed (`a2-padron-notice` → `a2-junta-notice`) |
| teacher worksheets `/teachers/worksheets/{grammar,tandem}/<slug>` | follow the topic slugs |
| **new** | `/grammar/conjugation` kept; new topics `/clitic-placement`, `/mesoclisis`, `/simple-pluperfect` |
| kept | `/grammar`, `/vocabulary`, `/listening`, `/reading`, `/writing`, `/speaking`, `/pronunciation`, `/intonation`, `/tongue-twisters`, `/placement-test`, `/step-by-step`, `/object-pronouns`, `/prepositions`, `/culture`, `/knowledge/*`, `/teachers/*`, `/exams`, `/exam-plan`, `/nationality`, other games, legal pages |

`EXAM_PATHS`, `TOPIC_SLUGS`, `REF_SLUGS`, `ITEM_SLUGS`, `WORK_GROUP_SLUGS` and `BUSINESS_SLUGS` in
`src/lib/routes.js` are the one table; ids, storage keys and data file names stay.
`pnpm check:links` (in the gate) checks that the source's internal links lead to a page.

---

## 9. Modules left as is

| Module | Reason |
|---|---|
| Backend seam: `src/lib/backend.js`, `supabase/browser.js`, `api.js`, `analytics.js`, `monitoring.js`, `pronunciation/browser.ts`, `access.js`, `PremiumLock` | no integrations (ARCHITECTURE.md); only the voice language is pt-PT where a module sets it |
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
| `src/integrations/*` logic, `src/lib/paths.js`, `rebaseHtml()`, `scripts/check-base.mjs` | made base-aware once by the Spanish `base-path-and-brand`; this item only changes `BASE_PATH` to `/portuguese`; language handling by `ui-lang-*` |
| The conjugation trainer engine and the practice workspace (§4.2) | content changes only |
| `scripts/check-conjugation.mjs`, `check-einfach-pfad.mjs --sign`, `check-grammatik-start.mjs` mechanics | kept; their inputs change |
| Image-based hub tiles and photos not showing Spain or Spanish text | language-neutral; any photo with Spanish signs or Spanish text goes (`cleanup`) |

---

## 10. Infrastructure items

### 10.1 `base-path-and-brand`

`astro.config.mjs` (`site: 'https://icanspeak.it'`, `base: '/portuguese'`, redirects base-aware);
the helper `src/lib/paths.js` already exists (`withBase`, `absoluteUrl`, `langPath`): change
`BASE_PATH` and every `/spanish` literal (`wrangler.jsonc` already says `/portuguese`); brand strings
in `public/i18n/en.json`, `Layout.astro`, manifest, `brand/`, OG images: **"icanspeak Portuguese"**;
the Portuguese logos in `public/logos/` wired as favicons, apple-touch-icon, wordmark (+ `-dark`),
manifest app-512/1024, JSON-LD logo; the Spanish logos removed, never redrawn;
`scripts/check-base.mjs` (`pnpm check:base`) checks `/portuguese/`. Footer keeps "part of
icanspeak.it". Every later item runs `pnpm check:base` after the build.

### 10.2 `variety-schema`

§1.5: `src/lib/variety.js` converted (not rewritten); `scripts/check-variety.mjs` (in the gate);
the validators that own lexicon/berufe/grammar files accept `variety: "pt-PT"`, `ptBR`, `fem` and
still accept `genus`. **Brazilian-form check** (a warning list, not errors, so a deliberate
pt-BR example inside a `ptBR` note or in an explanation about Brazil does not break the build; it
applies to pt-PT fields `de`, `example`, `text`, `phrase`, `front`, not to `ptBR.*`, `note`, `en`,
`explain` or `why`): `ônibus, trem (not "o treino"), celular, café da manhã, geladeira, banheiro,
suco, moça (as girl), garoto, fato (as "fact"), recepção, perspectiva, contato, aspecto, tela (as
screen), gerund after *estar* (`estar|estou|está|estamos|estão|estava|estive` + `-ando/-endo/-indo`
without `a`), `você` as default address in pt-PT instruction sentences, `ter` for existence (`tem
um|uma` in example sentences: heuristic), *a gente* only in speech context,
`dezesseis/dezessete/dezenove`, `bilhão`, `ele` as direct object (`vi ele`: heuristic), `ta bom`.
The list is data (`scripts/data/brazilianisms.json`), extendable by later items.

### 10.3 `ui-components`, `ui-pages-a-l`, `ui-pages-m-z`

Page titles, descriptions, leftover Spanish-course/German UI text (DELE, SIELE, CCSE, Spain,
Castilian, Extranjería, Spanish strings, *el/la*) in `src/layouts`, `src/components`, `src/pages`
(split a–l / m–z + legal pages). New strings into `public/i18n/en.json` with `data-i18n`. Data
content is not theirs. Pages name the Portuguese exams by slot (goethe = CAPLE, testdaf = level
check, dtz = CIPLE A2 for residence and nationality, `leben-in-deutschland` = civics) while hrefs
stay on the old slots until `routes`.

### 10.4 `ui-lang-de`, `-es`, `-fr`, `-it`

Registry entry in `src/lib/languages.js` (`status: "draft"` on every surface **that has text in
that language**, `ui` and `cards` with `fetch: true`; `urlPrefix`, `hreflang`), `public/i18n/<code>.json`
from `en.json`, `pnpm lang:coverage` (commit `docs/lang-coverage.json`, or the `ui` gate hides the
language), a block in `src/data/entry-pages.json`, entry pages at `/portuguese/<code>/` with
hreflang. **UI languages: `de`, `es`, `fr`, `it`.** `ui-lang-es` also **removes the Portuguese UI**
that the Spanish course had (registry entry `pt` with `hreflang: "pt-BR"`, `public/i18n/pt.json`,
the entry-pages block, `/pt/` pages, `lang-coverage.json` row), since a course in Portuguese does
not offer a Portuguese UI; `de` and the others still carry Spanish-course strings and are
refreshed by their own items. Spanish UI: `hreflang: "es"` (neutral; Castilian strings are fine
and the page text avoids local forms), `urlPrefix: "es"`. Arabic later, not in this queue.

### 10.5 `routes`, `cleanup`, `deploy-readme`

§8, §7; `deploy-readme`: README (pnpm commands, `pnpm check:base`), deploy target: this app
(`apps/portuguese`) deploys as a Cloudflare Worker with static assets only on the route
`icanspeak.it/portuguese/*` (no Vercel, no rewrites), per the repo-root `DEPLOY.md` and
`apps/portuguese/wrangler.jsonc`, the built-file count against the 20,000-files-per-Worker limit;
post-deploy checks; flips the hub card `live: true` in `apps/hub/src/data/courses.ts` (the only
file outside `apps/portuguese` any item may change).

---

## 11. Queue item → files

| Item | Files it owns |
|---|---|
| `content-plan` | `docs/content-plan.md` |
| `base-path-and-brand` | `astro.config.mjs`, `src/lib/paths.js` (`BASE_PATH`), `src/layouts/Layout.astro`, `src/lib/i18n.js`, `src/integrations/*`, root-absolute links in `src/components/**`, `src/pages/**`, `src/lib/**`, brand strings in `public/i18n/en.json`, `public/manifest*`, `brand/`, `public/logos/`, OG images, `scripts/check-base.mjs`, `package.json` (`check:base`), `public/_headers` and `public/robots.txt` paths |
| `variety-schema` | `src/lib/variety.js`, `scripts/check-variety.mjs`, `scripts/data/brazilianisms.json` (new), `scripts/check-content.mjs`, `scripts/validate-lexicon.mjs`, `src/lib/berufeCore.js`, every caller of `LATAM_MODE`, `es419Of`, `showsVosotros` |
| `ui-components` | `src/layouts/**`, `src/components/**`, `public/i18n/en.json` |
| `ui-pages-a-l` | `src/pages/[a-l]*`, `public/i18n/en.json` |
| `ui-pages-m-z` | `src/pages/[m-z]*` (incl. `privacy`, `terms`, `legal-notice`), `uebersetzungen/rechtliches.json` (language only), `public/i18n/en.json` |
| `placement-test` | `src/data/einstufung.json` |
| `grammar-a1` … `grammar-c1` | `src/data/grammatik/<slot>.json` per §3, `src/paid/grammatik/*` (C1), `grammatik.json` entries of those slots, `akkusativ.json` (A2), `src/lib/answerMatch.js` key row and accent hint (`grammar-a1`), `src/lib/grammarWorkspace.js` fallbacks; `grammar-b1` also the new `clitic-placement` slot, `grammar-c1` the new `mesoclise` and `mais-que-perfeito-simples` slots |
| `grammar-structure` | `grammatik-lehrplan.json`, `grammatik-verwandt.json`, `nachschlagen/*`, `wortarten.json`, `kursinhalte.json`, `content/program.json` (module titles), `praepositionen-trainer.json`, `uebersetzungen/grammatik*.json` |
| `grammar-start-book` | `grammatik-start/*`, `scripts/generate-grammatik-start-pdf.mjs`, `scripts/check-grammatik-start.mjs` |
| `conjugation-data` | `verbtabellen.json`, `src/lib/verbtabellen.js`, `src/pages/grammar/verbs.astro` (labels), `arbeitsblatt/verbtabellen.json` |
| `conjugation-trainer` | `src/data/conjugation-trainer.json`, `src/lib/conjugationTrainer.js`, `conjugationTyped.js`, `src/pages/grammar/conjugation.astro`, `scripts/check-conjugation.mjs`, links on `/grammar` and `/grammar/verbs`, `public/i18n/en.json` |
| `beginner-path` | `einfach-pfad.json` |
| `beginner-path-ui` | `src/lib/einfach-view.js`, `einfach-app.js`, `einfach-content.js`, `src/pages/step-by-step.astro` (noscript), `docs/easy-mode-tier1-v1.md` |
| `vocab-a1` … `vocab-b2` | `content/lexicon/<level>.json`, `lexicon/i18n/*` for that level, `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json`, `content/program.json` unit titles; `vocab-a1` also `wortschatz.json`, `haeufigste-woerter.json` + its scripts, `src/lib/lexicon.js` (`PORTUGUESE_LEVELS`), `src/lib/audioSlug.js` (`slugify`), `scripts/validate-lexicon.mjs`, `uebersetzungen/woerter-uk.json`, `src/lib/arbeitsblatt/wortschatz.js` (`o/a` nouns) |
| `vocab-c1-c2` | `content/lexicon/c1.json`, `c2.json`, their i18n entries; drops the Spanish gender values and `SPANISH_LEVELS` if no Spanish level is left |
| `listening` | `hoeren.json`, `uebersetzungen/hoeren.json` |
| `reading-writing` | `lesen.json`, `fertigkeiten/lesen.json`, `fertigkeiten/schreiben.json`, writing task data, `uebersetzungen/lesen.json`, `schreiben.json`, `src/lib/schreibKorrektur.js` |
| `speaking` | `sprechen.json`, `sprechen-b1b2.json`, `redemittel.json`, `redemittel-i18n/*`, `fertigkeiten/sprechen.json`, `uebersetzungen/sprechen.json`, exam lines in `src/pages/speaking/[id].astro` |
| `pronunciation` | `ausspracheregeln.json`, `aussprache-check.json`, `satzmelodie.json`, `zungenbrecher.json`, `aussprache-muttersprache.json`, `area: "aussprache"` of `fehler-nach-sprache.json`, `src/lib/ausspracheTipps.js`, `LANG` in the check libs |
| `idioms-mistakes` | `redewendungen.json`, `umgangssprache.json`, `typische-fehler.json`, `fehler-nach-sprache.json` (other areas), `wortfallen.json`, `synonyme.json`, matching `en.json` keys |
| `exams-caple` | `pruefungen/start-deutsch-1/*`, `saetze/goethe-*`, `paid/pruefungen/saetze/goethe-c1-1.json`, `goethe-formate.json`, `sprachbausteine/*`, `testdaf/*`, `testdaf-formate.json`, the removal of `saetze/telc-*` and `paid/.../telc-c1-1.json` and `telc-formate.json`, `fallen.json`, `formate-a2-c1.research.json`, `src/lib/exam/names.js`, `registry.js` texts, `saetze-index.json` (regenerated) |
| `exams-compare` | new `src/pages/exams/ciple-deple-celpe-bras.astro` (the Spanish file `dele-or-siele.astro` renamed), `public/i18n/en.json` keys |
| `civics` | `leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json`, `/civics` page texts, `registry.js` texts |
| `nationality-path` | `pruefungen/dtz/*`, `paid/pruefungen/dtz/*`, `src/lib/dtzTrainer.js` texts, `src/pages/nationality.astro`, `registry.js` (`dtz`) texts |
| `aima-sim` | `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/*` texts and rules |
| `imt-vocab` | `src/data/dgt/` → `src/data/imt/vocabulario.json`, `src/pages/dgt-vocabulary.astro` → `imt-vocabulary.astro`, `scripts/check-berufe.mjs` / `src/lib/berufeCore.js` (read `imt/`) |
| `culture` | `kultur.json`, `uebersetzungen/kultur.json`, `kultur-insider.json`, `kultur-bilder.json`, `wusstest-du.json`, `kalender-saetze.json`, `zitate.json`, `uebersetzungen/zitate.json`, `/explore/films` data |
| `accents-languages` | `dialekte.json`, `dialekte-karte.json`, `dachMap.js`, `sprachen-welt.json`, `sprachen-karte.json`, their generator scripts, `dialekte.*` / `sprachen.*` keys in `en.json` |
| `games` | `artikel-sprint/*`, `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json`, `quakiSpringt/*`, `hochstapler/*`, `satzregen/*`, game string tables, `src/lib/artikelSprint/*`, `artikelPacks.js`, `spiele/domino.js` |
| `games-arcade` | `src/lib/nussnacht/*`, `src/lib/hoerSafari/*` |
| `games-dialogue` | `src/lib/knigge/*`, `src/lib/lindenau/*`, `uebersetzungen/lindenau.json`, `src/lib/spielKit.js` voice |
| `teachers` | `arbeitsblatt/*`, `partneruebungen/*`, `unterricht-wortschatz.json`, `lernstunde-texte.json`, `downloads.json`, `src/lib/stundenplan.js`, `src/lib/unterricht/einstieg.js`, printable games and class test pool |
| `word-stories` | `src/content/wortgeschichte/*`, `src/lib/wortgeschichteCore.js` (`entryLang`, `LANG_NAMES`) |
| `portuguese-for-work` | `src/data/berufe/*`, `src/lib/berufeCore.js` |
| `business-portuguese` | `src/data/business-spanish/*` → `business-portuguese/*`, `src/pages/business-spanish/*` → `business-portuguese/*`, `src/lib/businessSpanish*.js` → `businessPortuguese*.js`, `scripts/check-business-spanish.mjs`, `package.json` script, `en.json` keys |
| `routes` | `src/lib/routes.js`, `astro.config.mjs` redirects, page folders/file names, `suche-seiten.json`, `entry-pages.json`, `catalog.js`, links |
| `cleanup` | §7, validators back in the gate, `pnpm check:base` and `pnpm check:variety` clean |
| `ui-lang-de` / `-es` / `-fr` / `-it` | `src/lib/languages.js`, `public/i18n/<code>.json`, `entry-pages.json`, entry pages, `docs/lang-coverage.json`; `ui-lang-es` also removes the pt UI |
| `deploy-readme` | `README.md`, `apps/hub/src/data/courses.ts` (portuguese card `live: true`) |

Files with UI strings only (`premium-features.json`, `produkte.json`, `downloads.json` titles) are
handled by the `ui-*` items where they are rendered.

---

## 12. Quality rules for every content run

1. Correct, natural **European Portuguese**; every example is something a speaker in Portugal
   would actually say. **Never let Brazilian forms slip into pt-PT content** (check against §1.5
   and `check-variety`). English explanations clear and short.
2. Level discipline: example vocabulary at or below the topic's CEFR level, except the target
   structure.
3. Each grammar topic: one clear rule, the forms, 4–8 examples, the 2–3 most common learner
   mistakes, exercises with unambiguous answers (or listed alternatives). Where Brazilian usage
   differs, add the `ptBR` item note; where Spanish speakers (the largest group of learners) fall
   into a trap, say so in the English explanation.
4. Distractors are wrong for a reason a learner can understand.
5. Facts (culture, exams, life in Portugal) carry a source and an "as of" date; when unsure,
   leave the fact out or word it carefully and list it "to verify" in the report.
6. Fewer, correct items beat many.
7. No mixed English/Portuguese items in the content a run touches; no Spanish or German leftovers.
8. Build: `timeout 1500 pnpm --dir apps/portuguese build 2>&1 | tail -40` in the foreground; then
   `pnpm --dir apps/portuguese check:base` (timeout 600).

---

## 13. Open points and decisions

### 13.1 Decisions made by this plan (for review)

- **Edgar: review the exam map (§2).** CAPLE exams sit in the `goethe` slot (ACESSO A1 in
  `start-deutsch-1`); the `testdaf` slot becomes a "level-check" practice set (not an official
  exam) or is removed; the `telc` slots are **removed**, because Portuguese has no second exam
  family; `dtz` = CIPLE A2 mock; Celpe-Bras: comparison page only (`exams-compare`).
- **Civics (§5.11):** as far as known Portugal asks for language proof (usually A2) for
  nationality, **not a separate civics test**; the 2025 reform debate may add one ("to verify").
  So `civics` is a general civics module, not a nationality exam.
- **Business Portuguese unit ids** are renamed (`correos` → `emails`, etc.) with a progress-key map
  (§4.3); the phrase key `es` becomes `pt`.
- **Portuguese UI removed**; UI languages are de, es, fr, it. Spanish UI uses `hreflang: "es"`.
- **Three new grammar slots** (`clitic-placement`, `mesoclise`, `mais-que-perfeito-simples`) because
  clitic placement, mesoclisis and the simple pluperfect are Portuguese-specific and no existing
  slot fits.
- **Brazil mode name:** `BRAZIL_MODE`; JSON key `ptBR`; `showsVos()` hides the *vós* row.
- **`genus` is unused** in Portuguese; the key stays in the schema.
- **Gender sprint, Nut night** keep their ids and files; only values change.
- **Town name** *Vila Soalheira* is a working name: `games-dialogue` checks no real *freguesia* or
  *município* has it.
- **Sector swap** kept from the Spanish course (`elektro-technik` = agriculture, `kita` = cleaning
  and domestic work); `buero` gets the tech/remote-work angle.
- **Führerschein restore:** only by Edgar, from icanspeak-english `db88ba4~1`, as before.
- **Frequency ranks:** `pt_50k` is Brazil-heavy; licence "to verify"; ranks only with a note.
- **Audio:** every `audio` field points to files that don't exist until a pt-PT TTS voice is wired
  (`BACKEND.speech`); browser voices are often pt-BR.
- **Brazil mode** is a later item, not in this queue. **Arabic UI** later, not in this queue.
- **Logo rasters (`base-path-and-brand`):** the course PNGs in the kit (Spanish and Portuguese) were
  empty renders, and `favicon.ico` was still the Spanish one. `scripts/build-wordmark.mjs` now
  rasterises app-512/1024, mark-1024, the apple-touch icon (flattened onto the icon paper),
  `favicon.ico` (16/32/48) and the root icon copies from the SVG masters; the SVGs are untouched.
  Edgar: check whether the umbrella kit's own PNG exports are broken too.
- **Brand sweep (`base-path-and-brand`):** "icanspeak Spanish" became "icanspeak Portuguese" everywhere,
  including sentences whose subject is still Spanish (DELE, SIELE, CCSE …); the content items rewrite
  those sentences. Route slugs (`/spanish-for-work`, `/business-spanish`) wait for the routes item.
- **Variety transition (`variety-schema`):** the data still carries ~6,600 Spanish `variety: "es-ES"`
  values and `es419` notes. They are **not** relabelled pt-PT (that would mark Spanish text as
  Portuguese and switch the Brazilian-form scan on for it). `src/lib/variety.js` accepts them while
  `LEGACY_ALLOWED = true`; `isStandardVariety()` lets the module validators (verb tables,
  conjugation sets, worksheets, word traps) accept `pt-PT` or, until then, `es-ES`.
  `check-variety.mjs` `STRICT` starts **empty**: each content item that converts a module adds its
  module id there (ids as in `MODULES`: `lexicon-a1` … `lexicon-c2`, `berufe`, `imt`, `business`,
  `grammatik`, `hoeren` …), and from then on a missing `variety`, an `es-ES` or an `es419` in that
  module is an error. When the content item converts an `es419` note it writes `ptBR` only where
  Brazil really differs (§1.5), never by renaming the Spanish note. `cleanup` sets
  `LEGACY_ALLOWED = false` and removes the Spanish genders from `validate-lexicon.mjs` and
  `berufeCore.js` (both accept `o`/`a`/`o/a` now, and `fem` on nouns).
- **Brazilian-form scan (`variety-schema`):** runs only on items whose own or inherited variety is
  explicitly `pt-PT`, in the fields `de, pt, example, text, phrase, front, lemma, sentence`
  (strings and string lists), never inside `ptBR`, `es419`, `translations`, `note`, `en`,
  `explain`, `why`. Warnings only; the full list with `node scripts/check-variety.mjs --all`.
  Each pattern in `scripts/data/brazilianisms.json` carries `hits`/`clean` examples that the check
  runs first (a broken pattern is an error). Additions beyond §10.2: initial proclisis
  (*Me diz*), *equipe, registro, esporte, aluguel, xícara*. *se* and *nos* are left out of the
  proclisis pattern (*Se calhar*, *Nos Açores*).
- **Left to their content items (not `variety-schema`):** `scripts/lexicon-import.mjs` still writes
  `variety: "es-ES"` / `es419` and el/la genders (`vocab-a1` rewrites it for pt-PT/`ptBR`);
  `scripts/build-satzregen.mjs` and `src/data/satzregen/quelle.txt` use an `{es419 …}` flag
  (its content item switches to `{ptBR …}`); the games' `VARIETY = "es-ES"` constants
  (`knigge/scenes.js`, `lindenau/quests.js`, `nussnacht/bosse.js`, with inline `es419` notes);
  browser-speech and assessment language `"es-ES"` in about 15 files (`u.lang`, `language:`) must
  become `"pt-PT"` in the item that converts each module's text, not before (a pt-PT voice reading
  Spanish text would be worse).

### 13.2 Carried over from the Spanish build (still true)

- **Base path enforcement:** `src/lib/paths.js` is the helper; browser code uses `withBase()` /
  `currentPath()`; server-rendered HTML keeps root-absolute site paths in templates and data and is
  rebased by `rebaseHtml()` (`src/middleware.js` in dev and while prerendering, again in
  `src/integrations/base-language.mjs` on `dist/`), checked by `pnpm check:base`. New data writes
  site paths (`/grammar`), never `/portuguese/…`.
- **Brand theme and logos:** token names and fonts as documented in `docs/brand/BRAND.md` and the
  comments in `src/styles/global.css`; every page except the home page ends in the slim "part of
  icanspeak.it" row.
- **Contact e-mail** (`src/lib/legal.js`): a legal fact, left unchanged; Edgar: set the real
  icanspeak address.
- **robots.txt and deploy:** crawlers read `https://icanspeak.it/robots.txt` (umbrella site);
  `public/robots.txt` is the template for the `/portuguese` lines; `public/_headers` rule paths
  carry the base (checked by `pnpm check:base`). Open: `/portuguese` without a slash may need a
  redirect or a second route; Edgar decides the AI-crawler scope in the umbrella `robots.txt`.
- **Conjugation trainer (Spanish build):** `conjugation-trainer.json` is `{ variety, es419,
  drills: { tenses, groups, notDrilled, limits, presets }, topicLinks, sets }` (key now `ptBR`);
  a set has `lead`, `rule: { text, table? }`, optional `more`; the typed card is
  `conjugationTyped.js`; drills start typed on wide screens and on pills at ≤ 720 px; deep links
  `?drill=<preset>`, `?set=<id>`, `?niveau=<level>`; `pnpm check:conjugation` generates **every**
  drilled question; `src/pages/[id].astro` links verb topics through `topicLinks` (keyed by topic
  id, so slugs may move).
- **Beginner path (Spanish build):** append, never insert, exercises in topics the path uses; when
  a topic changes and a reference breaks, fix the task by hand and re-sign with
  `node scripts/check-einfach-pfad.mjs --sign`; the resolver reads `choices`, `why`, `alt`; article
  rows show the article screen (`ARTICLE_PLACEHOLDERS` lists the articles: `beginner-path-ui` must
  change it from `el / la` to `o / a`); every string in `einfach-view.js` is hard-coded English
  outside `en.json` (these do not translate until moved to i18n keys: open for the `ui-lang-*`
  items).
- **UI wiring:** `ZitatCard` has its own key; `WortschatzDruck` part B follows the nouns' articles
  (`arbeitsblatt/wortschatz.js` must accept `o/a`); `HubBild` reads alt texts from
  `hub-bilder.json`; hub share cards are off (`HUB_CARDS = false` in `Layout.astro`).
- **Dead CSS** (`font.css`, `newfont.css`) and canvas-game fonts: open, harmless.
- **Gaps (§3):** *a gente vs nós*, *tu/você* register topic, impersonal *haver*, the *-lo/-la* table.

### 13.3 "To verify" facts used in this plan (every run re-lists those it touches)

- CAPLE: the six certificates and their names/levels (stated here from general knowledge), paper
  structure, timings, pass rules, validity, prices, centres and dates; the "language-in-context"
  task in DIPLE/DAPLE.
- CIPLE A2 as the language proof for residence and nationality; accepted alternatives; exemptions.
- Whether any civics/culture test is required or planned for nationality (2025 reform).
- Nationality rules: residence years, IRN process, Sephardic route end, the 2022 changes, the 2025
  reform status.
- AIMA: creation date (Oct 2023), what it handles now, appointment process, fees, forms,
  *manifestação de interesse* end; NIF for non-residents; NISS process; *número de utente* and the
  *atestado de residência*; the *Cartão de Cidadão* vs the residence card.
- IMT: foreign-licence exchange rules and deadlines; theory-exam languages; *código da estrada*
  terms.
- Celpe-Bras: format, levels, validity, price.
- Frequency list licence and its Brazil bias; Azure pt-PT voice names; Portuguese mobile number
  placeholder ranges; whether a Portuguese *freguesia/município* is called Vila Soalheira.
