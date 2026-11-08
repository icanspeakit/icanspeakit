# Content plan: Spanish course → icanspeak French

Written 2026-11-07 and checked against `apps/french` at `87df0a7e` (§14). It replaces the
English → Spanish plan, which is in git history (`git show 87df0a7e:apps/french/docs/content-plan.md`).

**Every later item in the queue (`overclaude/projects/icanspeak-french/QUEUE.md`) follows this
file.** A run that has to deviate (a mapping turns out not to work) changes this file in the same
commit, says why in its report and, if the question stays open, adds it to §13.

All paths are inside `apps/french`.

Words used below:

- **keep**: stays as it is (code, infrastructure, language-neutral data).
- **convert**: same file, ids and schema, new French-course content.
- **add**: new file, page or module; English names from the start.
- **leave**: not touched by any content item, with the reason given (§9).
- **drop**: removed by `cleanup`, with a restore command recorded in its report.

---

## 1. Global decisions

### 1.1 Learner, variety, levels

| Decision | Value |
|---|---|
| Brand | **icanspeak French**. No "icanspeak Spanish", "EnglishAcademy", "englishacademy", "deutschacademy" in anything a visitor sees (titles, meta, OG, JSON-LD, PDFs, llms.txt, rendered `source` strings). Internal code comments may keep the history. |
| Site and base | `site: 'https://icanspeak.it'`, `base: '/french'`. Both values live in `src/lib/paths.js` (`BASE_PATH`, `SITE_ORIGIN`); `astro.config.mjs` and `check-base.mjs` read them. Never a hard-coded root path. Browser code uses `withBase()`/`currentPath()` from `src/lib/paths.js`; server HTML is rebased centrally by `rebaseHtml()`. Data keeps writing site paths (`/grammar`), never `/french/…`. UI languages follow the base: `/french/de/…`. |
| Target learner | Adults (16+) learning French, any first language, with a **strong group of immigrants and residents in France** and learners heading for Canada. The préfecture, the médecin traitant, the landlord, the CAF and work beat tourist phrases. |
| Variety | **Standard French of France**: metropolitan vocabulary, standard pronunciation, current spelling with every accent. The 1990 spelling reform is accepted, the traditional spelling is taught first (§1.2). |
| Canada | Never mixed in silently. Vocabulary, grammar and audio items carry `variety: "fr-FR"`; where Québec usage differs, a `frCA` note (§1.5) records it, so a Canada mode can be switched on later without rewriting content. Nothing is shown for `frCA` yet. |
| Belgium, Switzerland, Africa | Notes only where they matter (*septante, nonante*), in the optional `regional` string (§1.5). Otherwise covered by `accents-languages`. |
| Levels | CEFR **A1–C1** for courses, grammar, placement; lexicon units keep **A1–C2**; exams cover **DELF A1–B2, DALF C1–C2** (C2: format page only, §2). |
| Explanation language | **English** (base dictionary `public/i18n/en.json`). A1/A2 explanations use simple English and let the French examples carry the rule. Fields named *einfach/leicht/Easy* get very simple English. |
| Question language | As in the Spanish course: prompts and options English at A1–A2, French at B1–B2 and above; `explain`, `title`, `blurb` always English; `phrases`, `model`, form labels and scripts always French. Exam sets: instructions English at A1–A2, French from B1. The civic test: questions French, `explain` English. |
| UI languages | English base; **German, Spanish, Portuguese, Italian** (§10.4). **French is removed** as a UI language. Arabic later, not in this queue. |
| Names in examples | Varied, realistic for France today: *Camille, Hugo, Léa, Nathan, Inès, Mamadou, Aïcha, Karim, Fatou, Thi Lan, Oksana, Ionuț, Wei, João, Marie-Claire*. Real big cities are fine (*Paris, Lyon, Marseille, Lille, Toulouse, Nantes*). Offices, shops, firms, schools are **invented**; no real company, brand or living private person. |
| Invented places | Game and sim town: **Montbruno** (working name; `games-dialogue` checks it against INSEE's list of communes, else picks another and updates this plan). Reading and listening places: **Valdaure**, **Montaubel** (same check, by `listening`). |
| Tone | Friendly, adult, no childish content, no party politics, no stereotypes about nationalities, regions or banlieues. Colonial history and *laïcité* are factual and neutral. |
| Law and administration | Préfecture, titre de séjour, ANEF, CAF, sécurité sociale, naturalisation, code de la route: **general orientation, never legal advice**. Every page says so in one line and points to the official source type (service-public.gouv.fr, the préfecture, ameli, the CAF). Every uncertain fact is "to verify" in the run report, and the page words it carefully ("usually", "as of <month year>, check the official page"). |
| Exams | Original practice material only. **Never copy or closely paraphrase** a France Éducation international or CCI Paris paper or sample paper, or an official civic question bank. Task types may be described and imitated; texts, items and answers are ours. The site says it is not affiliated with France Éducation international, CCI Paris Île-de-France, the French State or IRCC. |

### 1.2 Typography and answers

- **Accents**: every accent, on capitals too (*À, É, Ç*). Œ/œ and Æ/æ as ligatures (*cœur, sœur, œuf*).
- **Non-breaking space** in French text before `? ! : ;` and `»`, after `«`. Quotes in French text: « » (“ ” inside). English prose uses “ ”. Rendered text only: tiles and answer values never hold it.
- **Apostrophe in data**: straight `'` everywhere (`l'école`, `aujourd'hui`, `gender: "l'"`), because ids, matching and tiles depend on one character. `normalize()` folds `’` to `'` and NBSP to a space, so a learner's typed or pasted curly apostrophe is right. Displaying curly is a later typographic pass.
- Numbers and dates in France's format: `1 250,50 €`, `14 h 30`, `03/11/2026`; time zone Europe/Paris. Phone numbers: the ARCEP range reserved for fiction ("to verify"), else obvious placeholders; email `example.com`.
- **Answers keep their accents.** In French an accent can change the word (*a/à, ou/où, du/dû, la/là, sur/sûr, mais/maïs, cote/côte/côté*). Prefer choice/pill formats; where a learner types, the page offers an é è ê ë à â ù û î ï ô ç œ key row, and an answer that differs only in accents is marked wrong with "Check the accent." `accentOnly()` in `answerMatch.js`: **ç counts as an accent**; typed `oe` for `œ` is simply accepted.
- **1990 spelling**: teach the traditional form, accept the reformed one. Exercises list it in the `answer` array (*paraître / paraitre, oignon / ognon, week-end / weekend*); generated verb forms carry it in `alt`; lexicon words may carry `rectified` (§1.4). Never a wrong pill. Never a global rule that folds circumflexes, because *dû, sûr, mûr* stay.
- **Elision and tiles**: a build tile never splits at the apostrophe (`J'ai`, `l'école`, `qu'il`). A gap before a vowel shows its options whole (`le / la / l'`). Punctuation stays attached to the last tile. Any generator that writes `${article} ${word}` must use `withArticle()` (§1.4).
- `src/lib/audioSlug.js` `slugify()`: accents folded, ç→c, œ→oe, æ→ae, apostrophe and space → `-` (*aujourd'hui* → `aujourd-hui`, *s'appeler* → `s-appeler`). The ñ→ny rule goes. `drillSlug` keeps accents (*pécheur / pêcheur* must not share a recording).

### 1.3 Ids, slugs, file names

- **Content runs do not rename ids, data file names or storage keys.** They replace the content inside the existing ids. Ids are referenced across files.
- This includes the Spanish-named internals, which no visitor sees: `src/data/dgt/`, `src/data/business-spanish/` and its unit ids (`correos`, `llamadas` …), `businessSpanish.js`, `check-extranjeria.mjs`, deck ids `bv-dgt-…`. See §13.
- **One exception: conjugation-trainer set ids.** They appear in URLs (`?set=…`) and name Spanish topics (`ser-estar-a1`), so §4.2 gives them new ids. The site at `/french` is new, so no stored progress is lost.
- **URL slugs** are English, except proper names (`/delf-dalf`, `/tcf`, `/tef`) and French terms that learners search for (`/passe-compose-vs-imparfait`, `/y-and-en`). Slugs are ASCII. Only `routes` applies them.
- New ids, files and pages use English names.
- Mapping a slot to a different topic is fine; `level` may change with it, and `grammar-structure` fixes the order.
- Lexicon word ids: slug of the French lemma, without the article. Homographs: plain slug on the more basic word, the other suffixed by meaning or part of speech (`livre` / `livre-poids`, `tour` / `tour-batiment`, `poste` / `poste-emploi`, `avocat` / `avocat-fruit`, `peche` / `peche-faute`). A slug still held by a Spanish word of a level not yet migrated gets `-fr`. Ids are unique across levels.
- Word stories: the file name is the lemma slug.

### 1.4 Data fields: what they hold for French

The field that matters most: **in French the article can hide the gender.** *L'école* is feminine and *l'hôtel* masculine, and the plural *les* says nothing, so `gender` alone is no longer enough.

| Field / data | Spanish course | **French course** |
|---|---|---|
| lexicon noun `gender` | `el`, `la`, `el/la` | **The article as the learner says it:** `"le"`, `"la"`, `"l'"`, `"les"` (plural-only), `"le/la"` (true common gender: *le/la journaliste*). |
| lexicon `genus` | `"f"` only for *el agua* | **`"m"`, `"f"` or `"mf"`. Required where `gender` is `"l'"` or `"les"`**; absent otherwise. *l'école* f, *l'hôtel* m, *l'eau* f, *l'élève* mf, *les vacances* f, *les gens* m. |
| lexicon `hAspire` (**new**, optional) | – | `true` on a noun that starts with a vowel letter or h yet takes `le`/`la` (*le héros, la honte, le haricot, le onze*). The validator rejects `le`/`la` before a vowel or h without it, and `l'` before a consonant or with it. |
| lexicon `pluralOnly` | plural-only nouns | Same key; `gender: "les"`, `genus` set, `plural` = the form (*les lunettes, les ciseaux, les frais, les gens*). |
| lexicon `plural` | plural without article | Without article, written form (*maisons, chevaux, yeux, travaux, bijoux*); invariable nouns repeat the lemma (*le fils → fils, le prix → prix*). The article is always `les`. |
| lexicon `en` | English gloss | Short English gloss. Person nouns: masculine lemma, feminine named in the gloss (*le boulanger*: "baker (f: la boulangère)"); `le/la` only for true common gender. Current feminine forms where in use (*la professeure, la médecin*). |
| lexicon `example` | Castilian sentence | Natural metropolitan sentence at the unit's level. The card blanks the word, so verb examples need the lemma, a stem + at most 3 letters, or an exact listed form. |
| lexicon `ipa`, `ipaSource` | Castilian IPA, generated | Standard French IPA with syllable dots (*école* `e.kɔl`, *maison* `mɛ.zɔ̃`). **Authored per word**, not generated: French spelling doesn't map to sound reliably, so `scripts/es-ipa.mjs` is not ported. `ipaSource: "authored"`, or `"wiktionary"` when taken from there. No liaison in the lemma's IPA. |
| lexicon `audio` | lemma slug | Lemma slug (§1.2); files don't exist until a fr-FR TTS voice is wired. |
| lexicon `forms` (verbs) | yo present · él indefinido · participio | **je présent · il passé composé · participe passé**: `parle, a parlé, parlé`; `vais, est allé, allé`. Shows the auxiliary at a glance. |
| lexicon `aux` | unused | **Back in use:** `"avoir"`, `"être"`, or `"both"` (*monter, sortir, passer*). |
| lexicon `reflexive` | `true`, lemma with `-se` | `true`; lemma with the pronoun: `se lever`, `s'appeler`. |
| lexicon `prep` | dependent preposition | Same: *penser **à**, avoir besoin **de**, s'intéresser **à***. |
| lexicon `irregular` | any irregular tense | Verbs: `true` for third-group and other irregular verbs, not for spelling-only changes (*manger, commencer, appeler, acheter*). Adjectives: irregular comparatives (*bon → meilleur*). |
| lexicon `comparative` / `superlative` | irregular only | Only where irregular (*meilleur / le meilleur, pire / le pire*). |
| lexicon `fem` | adjectives | Feminine singular (*grand → grande, beau → belle, vieux → vieille, blanc → blanche*); same as lemma when invariable in writing (*jeune, rouge*). |
| lexicon `mascVowel` (**new**, optional) | – | The form before a vowel: *beau → bel, vieux → vieil, nouveau → nouvel*. |
| lexicon `rectified` (**new**, optional) | – | The 1990 spelling when it differs (*connaître → connaitre*). |
| lexicon `case`, `separable` | unused | Not used (keys omitted). |
| lexicon `i18n/<lang>.json` | Spanish → de, fr, pt, it | **French → `de`, `es`, `pt`, `it`** (§10.4). `pt` = Brazilian. `i18n/fr.json` is meaningless and is emptied by `vocab-a1`, deleted by `ui-lang-es`. Machine drafts; other languages stay empty. |
| lexicon `rank`, `source` | `es_50k`, `null` until downloaded | `fr_50k` (hermitdave/FrequencyWords, licence "to verify"). `rank: null` until a run can download it. It mixes France and Canada; level banding stays our own, never claimed to be an official list. |
| `SPANISH_LEVELS` (`src/lib/lexicon.js`) | levels whose nouns carry el/la | `FRENCH_LEVELS` (`vocab-a1`), same role. **The one in `src/lib/fertigkeiten.js` is another thing**: levels with target-language prompts. Rename it in `reading-writing`. |
| `artikel-sprint/words.json` | `el`/`la`, plurals | `article` + `genus`, French plural, plausible wrong plurals (*chevals, bijous, les yeuxs*), `english` = gloss. |
| 4-slot case fields | subject · direct · indirect · after preposition | **sujet · COD · COI · pronom tonique** (*je / me / me / moi; il / le / lui / lui; ils / les / leur / eux*). |
| `trennbare-verben` slots | pronominal verbs | Same (*se lever, se souvenir de, s'en aller*). Every je form starts with `me` or `m'`; the live quiz relies on that. |
| Verb tables | §4.1 | §4.1. |
| `translations` maps, `*-i18n`, `uebersetzungen/*` | Spanish → language | French → language; `translations.en` = English. Other languages only where reliable. Spanish-based entries are removed rather than left next to French. |
| `de` key in phrase, idiom, dialogue data | the Spanish phrase | **The French phrase.** The key name is history: it means "target-language text". `en` = English. |
| `deHint` | German gloss | Unchanged meaning: German gloss. |
| `status`: `entwurf`/`geprueft` | | Same values. New content enters as `entwurf` unless checked. Reports list topics for Edgar's review. |

**Helpers** (added by `variety-schema` in `src/lib/lexicon.js`, used everywhere):

- `withArticle(e)`: `l'école`, `le livre`, `la maison`, `les lunettes`, `le/la journaliste`. **No space after `l'`.** Replaces every `${e.gender} ${e.lemma}`: at least `spokenForm`, `hochstapler/themes.js`, `berufeWortschatz.js`, `liveQuiz/*`, print sheets; run a grep for `.gender}` and for `gender ` in templates.
- `genderOf(e)`: `"m"`, `"f"` or `"mf"`, from `genus` or the article.
- `indefinite(e)`: `un` / `une`. **Elided nouns are drilled through this** (§5.9).
- `pluralArticle(e)`: always `les`. Everything that branched on *los/las* simplifies.

While modules are still Spanish these helpers must keep working on `el`/`la` words (§1.6).

### 1.5 `variety`, `frCA` and `regional`

**Shape** (implemented and validated by `variety-schema`):

```json
"variety": "fr-FR",
"frCA": {
  "note": "In Québec: le courriel (France: le mail, un e-mail).",
  "form": "courriel",
  "gender": "le"
},
"regional": "Belgium and Switzerland: septante, nonante."
```

- `variety`: `"fr-FR"` for everything in this queue. `"fr-CA"` is reserved for a future Québec-only item; no run writes it now.
- `frCA` replaces `es419`, is optional, and appears only where Québec usage differs in a way a learner would notice. Same keys and limits as `es419`:
  - `note` (required): plain English, ≤ 160 characters.
  - `form` (optional): the Québec replacement for the item's main text.
  - `gender` (optional, nouns only): `le`, `la`, `l'` when it differs (*une job* in Québec vs *un job*).
  - `skip` (optional, `true`): the item makes no sense in a Canada mode.
- `regional` (optional string, ≤ 160): Belgium, Switzerland, Africa, where it matters. Allowed on the same items; not bound to any mode.
- No `frCA` = the same in Québec as far as this course goes. **Don't invent differences.** Typical real ones: *courriel, magasiner, char (voiture), déjeuner/dîner/souper (petit-déjeuner/déjeuner/dîner), fin de semaine, stationnement, cellulaire, dépanneur, breuvage, chum/blonde*, gender of some loans, *-tu* in spoken questions, more *tu* in everyday contact, affrication (*tu, dire* [tsy, dzɪʁ]), some vowel contrasts.
- **Institutions get no note** (*préfecture, CAF, carte Vitale, Pôle emploi/France Travail*): they name things in France; a Canada mode would need other content, not another word. Same for the sim and games: a file-level `variety` only.
- There is **no equivalent of `showsVosotros`**: French conjugation has no row that disappears. `variety-schema` removes it and its callers (`visibleRows` in `verbtabellen.js`, `conjugation.astro`, `conjugationTrainer.js`).

**Where the fields go** (the same modules as the Spanish `STRICT` list in `check-variety.mjs`):

| Data | `variety` on | `frCA` on |
|---|---|---|
| `content/lexicon/*.json` | every word | the word |
| `berufe/*`, `dgt/*`, `business-spanish/*` own entries | every own entry (refs inherit) | the entry |
| `wortschatz.json`, `redemittel.json` | every card / phrase | card / phrase |
| `grammatik/<slot>.json`, `paid/grammatik/*` | topic file (top level), exercises inherit | topic and items whose answer differs |
| `grammatik.json`, `akkusativ.json`, `praepositionen-trainer.json` | inherit; pack-level `variety` | item |
| `einstufung.json`, `grammatik-start/*`, `verbtabellen.json` | top level | item / verb |
| `conjugation-trainer.json` | top level and every set | set or item |
| `hoeren.json`, `aussprache-check.json`, `zungenbrecher.json`, `satzmelodie.json`, `ausspracheregeln.json` | every item | item (e.g. affrication on a *t/d* rule) |
| `redewendungen`, `wortfallen`, `typische-fehler`, `umgangssprache`, `synonyme` | per entry | entry |
| `fehler-nach-sprache`, `arbeitsblatt/*`, `partneruebungen/*`, `unterricht-wortschatz` | top level | where used |

Reading, writing, speaking tasks, culture, exams, word stories carry no `variety` key.

**`src/lib/variety.js`:** `DEFAULT_VARIETY = "fr-FR"`, `VARIETIES = ["fr-FR", "fr-CA"]`, **`CANADA_MODE = false`** (was `LATAM_MODE`), `FRCA_KEYS`, `FRCA_NOTE_MAX`, `FRCA_GENDERS`, `REGIONAL_MAX`, `varietyOf`, `frCAOf` (was `es419Of`), `textFor(item, text, canada = CANADA_MODE)`, `skippedFor`, `varietyProblems`.

### 1.6 Validators, and how the build survives the migration

**Every item ends with a green build while most of the app is still Spanish.** The Spanish runs show exactly where this breaks. These rules are binding:

1. **Legacy values.** `variety-schema` empties `STRICT` in `check-variety.mjs` and accepts `es-ES` and `es419` as legacy with a warning (never relabel Spanish data as `fr-FR`). Each content item adds its module id back in the commit that converts it. `cleanup` removes the legacy branch; the gate then rejects them.
2. **Both genders.** `validate-lexicon.mjs` and `berufeCore.js` `GENDERS` accept both the French values and `el`, `la`, `el/la` until the last level or deck has run. The lexicon drops them in `vocab-c1-c2`, `berufeCore.js` in `french-for-work`, with `genus` rules per §1.4.
3. **Deck and story refs.** A vocabulary item removes ids that other modules point to. As in the Spanish run, a missing lexicon ref in `berufe/*`, `dgt/*`, `business-spanish/*` and a word-story lemma outside the lexicon become **warnings** from `vocab-a1` on. `code-route-vocab`, `french-for-work`, `business-french`, `word-stories` each turn theirs back into errors. Note `dgt` and `business` have refs now, which the English → Spanish migration didn't have to handle.
4. **Beginner path.** A changed grammar topic breaks `gram:` refs in `einfach-pfad.json` **and the build**, and `scripts/repoint-einfach-grammar.mjs` no longer exists. `grammar-a1` writes it again (point each stale task at a valid item in the same topic; then re-sign with `node scripts/check-einfach-pfad.mjs --sign`), the later grammar items use it, and `beginner-path` deletes it. The same goes for `wort`/`artikel` tasks in `vocab-*`.
5. **Verb tables vs reference.** `check:verbtabellen` requires agreement between `verbtabellen.json` and `nachschlagen/starke-schwache-verben.json`, and `grammar-structure` runs before `conjugation-data`. `grammar-structure` pauses that comparison; `conjugation-data` restores it.
6. **Games and pools.** Filters on `el`/`la` empty pools as levels convert. Games must tolerate an empty pool until `games` and `games-arcade` run (they did in the Spanish course); don't fix them in `vocab-*`.
7. A content item that changes a module's values updates that module's validator **in the same commit**. Never drop a validator. If one must pause, move it to the "Not in the gate" list in `scripts/check-content.mjs` with the reason and the item that puts it back; `cleanup` puts every paused one back.
8. Check the *rules* in a validator, not just the data: many contain Spanish logic (§10.6).
9. **`check-i18n-luecken.mjs` is in the gate and counts visible text per file against `scripts/i18n-luecken-baseline.json`.** Two moves break it. Text inside `lang="es"` counts as deliberate, so changing `lang="es"` to `lang="fr"` turns it into gaps: `ui-components` makes the script accept both, and `cleanup` drops `es`. A renamed page is a new file above its baseline: `routes` rekeys the baseline's entries in the same commit as the rename. New pages write their text with `data-i18n` and need no entry.
10. **Coverage falls while `en.json` changes.** `GATES.ui` is 98 %, so `de`, `fr`, `pt` and `it` can drop out of the language menu during the queue. That is expected and not fixed by content items. `ui-lang-*` restores it with `pnpm lang:coverage`.

The gate is the `CHECKS` list in `scripts/check-content.mjs` (26 validators, none paused at the start of this queue).

---

## 2. Exams: existing slot → French exam

Slot ids stay (storage keys `da-exam-v1:<key>`, `src/lib/exam/registry.js`, `EXAM_PATHS`). Titles, subtitles, pass notes, module labels and names change.

**Code:** `EXAM_NAMES` in `src/lib/exam/names.js` can't stay a flat map: the `goethe` slot is DELF below C1 and DALF at C1. `examLabel(set)` returns `DELF A2 … DELF B2`, `DALF C1`, `TCF B1`. `exams-delf-dalf` changes it, plus the second copy of the same decision in `aufgabenKatalog.js` (`set.exam === "telc" ? "SIELE" : "DELE"`), which should call `examLabel`. `CONTENT_LANG = "fr"` in `pruefungEngine.js`. Registry module labels (`Questions on Spain`, `My comunidad (extra)`) and hrefs (`/dele/a1`, `/siele/practice-set`, `/ccse/test`) are in `registry.js`: labels go with the exam items, hrefs with `routes`.

| Slot (data) | Spanish course | **French course** | Level | Item |
|---|---|---|---|---|
| `start-deutsch-1` (`pruefungen/start-deutsch-1/uebungssatz-1.json`) | DELE A1 | **DELF A1 practice test** | A1 | `exams-delf-dalf` |
| `goethe` A2, B1, B2 (`saetze/goethe-{a2,b1,b2}-1.json`, `goethe-formate.json`) | DELE A2–B2 | **DELF A2, B1, B2**, one set each | A2–B2 | `exams-delf-dalf` |
| `goethe` C1 (`paid/pruefungen/saetze/goethe-c1-1.json`) | DELE C1 | **DALF C1** practice set | C1 | `exams-delf-dalf` |
| `goethe-c2` research entry | DELE C2, format only | **DALF C2**: format entry and hub card, **no set** (above the course range; two papers, so it doesn't fit the set shape anyway) | C2 | `exams-delf-dalf` |
| `sprachbausteine` (`sprachbausteine/satz-{1,2}.json`) | Uso de la lengua | **Language in use**: cloze and gap tasks B2–C1, framed as general practice, like the *lexique et structure* section of the TEF. Whether current TEF versions still include it: "to verify". The page must stay true either way. | B2–C1 | `exams-tcf-tef` (page `src/pages/dele/language-use.astro`, linked from `siele/levels/index.astro` and `teachers/classes/class.astro`; its `x:telc/sprachbausteine/…` refs stay) |
| `testdaf` (`testdaf/uebungssatz-1.json`, `testdaf-formate.json`) | SIELE reading + writing, score-based | **TEF practice set** (reading + writing, the slot's shape): `passPct: null`, no verdict. The hub covers TEF and TEF Canada. | B1–C1 | `exams-tcf-tef` |
| `telc` A2, B1, B2 (`saetze/telc-{a2,b1,b2}-1.json`, `telc-formate.json`) | SIELE by band | **TCF practice by band**, all four skills: fits, because TCF questions rise in difficulty and the result is a level. `scoring.passPct: null` (the engine supports it). The hub covers tout public, IRN, Canada. | A2–B2 | `exams-tcf-tef` |
| `telc` C1 (`paid/…/telc-c1-1.json`) | SIELE C1 | TCF C1-band set | C1 | `exams-tcf-tef` |
| `dtz` (`dtz/uebungssatz-1.json`, `src/lib/dtzTrainer.js`) | DELE A2 mock for nationality | **TCF IRN mock, aiming at A2–B1** (multi-year card, resident card). Trainer's nine-part shape stays, and the mock says it doesn't copy the real TCF IRN. Point bands are ours and say so. | A2–B1 | `nationality-path` |
| `dtz` paid (`paid/pruefungen/dtz/uebungssatz-2.json`) | DELE A2 mock 2 | **TCF IRN mock aiming at B1–B2** (naturalisation). If it can't be written well, it's removed, never left in Spanish. | B1–B2 | `nationality-path` |
| `leben-in-deutschland` (`leben-in-deutschland.json`) | CCSE | **Civic exam** (§2.2) | A2–B2 reading | `civic-exam` |
| `pruefungen/fallen.json` | traps | Traps for DELF/DALF, TCF, TEF, civic exam. `exams` values `delf`, `tcf`, `tef`, `civique`. French-specific: register in writing tasks (*vous*), word counts, the minimum per paper, no going back in timed computer tests ("to verify") | | `exams-delf-dalf`, `exams-tcf-tef` |
| `pruefungen/formate-a2-c1.research.json` | format research | Same shape, each entry with `checked` and `unverified`. | | both exam items |
| `saetze-index.json`, `paid-manifest.json` | generated | Regenerated by their scripts, never hand-edited | | whichever changes sets |
| **add** `/exams/delf-tcf-or-tef` (from `exams/dele-or-siele.astro`) | | By purpose: residence card, nationality, Canada immigration, university, work. | | `exams-tcf-tef` |
| **add** `/residence-and-nationality` (from `nationality.astro`) | | §2.3 | | `nationality-path` |

Set structure follows the Spanish sets: modules `reading`, `listening`, `writing`, `speaking`, no shared timer; no audio yet (fr-FR voices in `speakers`, open transcript). A validator match only proves a set equals our research, not the real exam.

### 2.1 Which test does what

| Purpose | Usually accepted (all "to verify") |
|---|---|
| Multi-year card, resident card, naturalisation in France | TCF IRN, TEF IRN, a DELF/DALF at or above the level; other diplomas in some cases |
| Canada immigration | TCF Canada, TEF Canada; scores converted to NCLC levels |
| University in France | DELF B2 / DALF, TCF DAP or TCF tout public depending on the institution |
| Work and CV | DELF/DALF (no expiry) or a recent TCF/TEF |

`/exams/delf-tcf-or-tef` is framed on this table. TCF DAP and TEF IRN get only a mention, with no set of their own.

### 2.2 Civic exam (`civic-exam`)

- **Replaces the CCSE** in `leben-in-deutschland.json`, `/civic-exam` (+ `/test`, `/facts`). `uebersetzungen/leben-in-deutschland.json` emptied unless reliable.
- Same file shape: `meta`, `topics`, `glossary`, `bundeslaender`, `questions`, top-level `variety`. Every question is `{ tarea, prompt, options, answer, explain }`.
- `meta.totalQuestions: 40`, `meta.passScore: 32`, `meta.minutes: 45`, all "to verify". `federalQuestions` = 40, `stateQuestions` = 0. `sourceNote`, `realTestNote` and their `*Easy` forms are rewritten; `stateFactsNote` says the regions are not part of the real test.
- **`meta.tareas` holds the exam's themes**, five entries `{ n, title, realCount, options }`, and each question's `tarea` points at one. Titles are the five themes below; `realCount` per theme and `options` (4 expected) are "to verify". The test draws by theme, so a wrong `realCount` gives a wrongly weighted mock, and the page must not claim the real distribution unless checked. Knowledge versus situation questions (the "28 + 12" figure from a prep site) is not modelled in this field: write some of each, and don't state the split unless confirmed.
- Slots: keep the six topic ids (`{ id, title, facts, factsEasy, words }`, the reading pages at `/civic-exam/facts`).

| `tarea` | Topic id | French civic theme |
|---|---|---|
| 1 | `values-law` | Principles and values of the Republic (*liberté, égalité, fraternité, laïcité*, symbols) |
| 2 | `government-parliament` | Institutions and political system |
| 3 | `elections` | Rights and duties (voting, justice, tax, equality) |
| 4 | `history` | History, geography, culture |
| 5 | `everyday-life` | Living in French society (health, school, work, housing) |
| – | `four-nations` | **Optional, unscored:** regions and overseas territories, clearly labelled as not part of the real test |

- `bundeslaender` (19 comunidades and cities now) becomes **France's regions**, 13 metropolitan and 5 overseas, in the same shape (`id, name, type, capital, population, borderCountries, parliamentName`; `parliamentName` = *conseil régional*). "Unscored" isn't a key on the topic: it comes from the registry module `land` with `scored: false`, `idsFrom: "lid-land"`, relabelled "My region (extra)". `bund` is relabelled "Questions on France".

- **The official bank and the published list of questions are deliberately not opened for writing questions**; the candidate manual may be read only for format. Questions are written from public facts (Constitution, Légifrance, vie-publique, service-public). Commercial sites advertising "official questions" are not sources either.
- Whether difficulty or content differs between the multi-year card, the resident card and naturalisation: "to verify".

### 2.3 Language levels and nationality (`nationality-path`)

Page `/residence-and-nationality`, general orientation:

| Step | Language level (as of 2026-11, "to verify") | Civic exam |
|---|---|---|
| First multi-year card | A2 | Yes |
| First resident card | B1 | Yes |
| Naturalisation by decree, declaration by marriage | B2 (oral and written) | Yes for naturalisation by decree; declaration by marriage "to verify" |
| Renewal | Not required as far as checked | Not required as far as checked |

Exemptions (over 65, certain nationalities and situations, disability) "to verify" and described carefully. Figures come from `meta`, not repeated. CCSE/DELE-specific Spanish text goes completely; Spain's rules have no equivalent. The *contrat d'intégration républicaine* and the OFII get a section.

### 2.4 Facts as found on 2026-11-07

Starting points only; each run re-checks and says what it read. See "To verify" in `reports/content-plan.md`.

- DELF A1–DALF C1: four papers of 25 points, pass 50/100, minimum 5/25 per paper. DALF C2: two papers of 50, minimum 10/50. Old official regulations and secondary sites.
- TCF IRN: four papers, about 1 h 35, valid 2 years (France Éducation international page, via search).
- TCF Canada: about 2 h 47 (secondary). TEF Canada: four papers, about 2 h 55 (secondary; centres disagree on question counts).
- Civic exam: 40 multiple-choice, ≥ 32 right, 45 min, since 1 January 2026 (Interior Ministry and service-public, via search). "28 knowledge + 12 situations" comes only from a prep site. Fees are unsettled.

---

## 3. Grammar: slot map (91 slots)

Each slot file in `src/data/grammatik/` (and `src/paid/grammatik/`, the same 11 C1 ids) becomes the French topic below. Same id, same schema. `src/data/arbeitsblatt/<id>.json` follows the id (`teachers`). "Level" is the new `level`; grammar items work **by new level**. Slugs are applied by `routes` only (`TOPIC_SLUGS`).

**91 slots are 90 files plus `akkusativ`.** That slot has no file in `grammatik/` and no worksheet: `grammarCatalog.js` keeps it off the `[id]` route, and its content is `src/data/akkusativ.json`, a flat array of questions with `difficulty`, on the bespoke page `/object-pronouns`. It is still listed in `GRAMMATIK_ORDER`, `grammatik-lehrplan.json` and `TOPIC_SLUGS`.

Moved levels: `negation` A2 → A1; `imperativ` B1 → A2; `negationswoerter` B2 → A2; `partizip-als-adjektiv` B1 → B2. Counts now: A1 19, A2 21, B1 27, B2 13, C1 11. Counts after the move: **A1 20, A2 22, B1 25, B2 13, C1 11**.

### A1 (20): `grammar-a1`

| Slot | French topic | New slug |
|---|---|---|
| `nomen` | Nouns and gender: masculine or feminine, helpful endings and exceptions | `noun-gender` |
| `artikel` | *le, la, l', les*; *un, une, des*; *au, aux, du, des* | `articles` |
| `personalpronomen` | Subject pronouns; *tu* or *vous*; *on*; *moi, toi* for emphasis and after prepositions | `subject-pronouns` |
| `praeteritum-sein-haben` | *être* and *avoir*: forms and first uses | `etre-avoir` |
| `praesens` | Present of *-er* verbs; silent endings; *j'* | `present-er-verbs` |
| `verb-position-2` | Present of *-ir* (*finir*) and *-re* (*vendre*) verbs | `present-ir-re-verbs` |
| `konjugation` | Key irregulars: *aller, faire, venir, prendre, mettre, voir, dire* | `present-irregular` |
| `negation` | *ne … pas*; *n'* before a vowel; dropped *ne* in speech (a note) | `ne-pas` |
| `berufe-mit-in` | *il y a*, *c'est*, *il est* (*Il est médecin. C'est un bon médecin.*) | `il-y-a-cest` |
| `w-fragen` | *qui, que/qu'est-ce que, où, quand, comment, combien, pourquoi, quel* | `question-words` |
| `ja-nein-fragen` | Yes/no: intonation, *est-ce que*, inversion for recognition; *oui, si, non* | `yes-no-questions` |
| `plural` | Plural of nouns and adjectives (*-s, -x, -aux*); silent in speech | `plurals` |
| `adjektive-nach-sein` | Adjective agreement; basic position | `adjective-agreement` |
| `possessivartikel` | *mon, ma, mes* …; *mon amie*; *de* for owners | `possessives` |
| `welcher-dieser` | *ce, cet, cette, ces*; *quel* | `demonstratives` |
| `gern` | *aimer, adorer, préférer, détester* + noun or infinitive | `aimer-infinitive` |
| `temporale-praepositionen` | Time and days: *Il est huit heures. Le lundi. Le matin.* | `time-and-days` |
| `aduso` | *et, ou, mais, parce que, aussi* | `et-ou-mais` |
| `zahlen` | Numbers, prices, phone numbers: *soixante-dix, quatre-vingts*; `regional`: *septante, nonante* | `numbers` |
| `wortarten` | Parts of speech in French | `parts-of-speech` |

### A2 (22): `grammar-a2`

| Slot | French topic | New slug |
|---|---|---|
| `perfekt` | Passé composé with *avoir*; participles | `passe-compose-avoir` |
| `zusammengesetzte-verben` | Passé composé with *être*; agreement with the subject | `passe-compose-etre` |
| `n-deklination` | Imparfait: forms, habits, descriptions | `imparfait` |
| `trennbare-verben` | Futur proche: *aller* + infinitive | `futur-proche` |
| `komposita` | *être en train de*, *venir de* | `en-train-de-venir-de` |
| `reflexive-verben` | Reflexive verbs, daily routine | `reflexive-verbs` |
| `akkusativ` (+ `akkusativ.json`, `/object-pronouns`) | Direct object pronouns *le, la, l', les*, position | `object-pronouns` (keep) |
| `dativ` | Indirect object pronouns *lui, leur, me, te, nous, vous* | `indirect-object-pronouns` |
| `modalverben` | *pouvoir, vouloir, devoir, savoir*; *il faut* | `pouvoir-vouloir-devoir` |
| `imperativ` | Imperative *tu, vous, nous*, negative, with pronouns (*Donne-le-moi.*) | `imperative` |
| `komparativ-superlativ` | *plus … que, aussi, moins, le plus*; *meilleur, mieux* | `comparatives` |
| `lokale-praepositionen` | *sur, sous, devant, derrière, à côté de, en face de*; *ici, là* | `prepositions-of-place` |
| `wechselpraepositionen` | Places: *à Paris, en France, au Maroc, aux États-Unis, chez* | `a-en-au-places` |
| `indefinitpronomen` | *quelqu'un, quelque chose, tout, chaque, autre* | `indefinites` |
| `satzstellung` | Partitive: *du, de la, de l', des*; *pas de, beaucoup de, un peu de* | `partitive-articles` |
| `negationswoerter` | *ne … plus, jamais, rien, personne* | `negation-more` |
| `nebensaetze-weil-dass` | *parce que, car, donc, alors*; *que*-clauses (*je pense que*) | `parce-que-donc` |
| `konjunktiv2-hoeflich` | Polite requests: *je voudrais, pourriez-vous, est-ce que je peux* | `polite-requests` |
| `positionsadverbien` | Frequency; adverb position; *toujours, souvent, parfois* | `frequency-adverbs` |
| `adjektivdeklination-a2` | Adverbs in *-ment*; *bon / bien* | `adverbs-ment` |
| `artikel-oder-nicht` | Article or none (*J'aime le café. Je n'ai pas de voiture. Elle est médecin.*) | `article-or-not` |
| `ordinalzahlen` | Ordinals, dates, floors (*le premier mai, au deuxième étage*) | `ordinals-dates` |

### B1 (25): `grammar-b1`

| Slot | French topic | New slug |
|---|---|---|
| `praeteritum-plusquamperfekt` | Passé composé or imparfait | `passe-compose-vs-imparfait` |
| `futur` | Futur simple | `futur-simple` |
| `funktionen-von-werden` | Conditionnel présent: politeness, advice, wishes | `conditional` |
| `infinitiv-mit-zu` | Subjonctif présent: forms | `subjonctif-present` |
| `verben-als-nomen` | Subjunctive after necessity, wishes, feelings (*il faut que, je veux que*) | `subjunctive-wishes` |
| `infinitiv-ohne-zu` | Infinitive or subjunctive (*je veux partir / je veux que tu partes*) | `infinitive-or-subjunctive` |
| `finalsaetze` | *pour* + infinitive, *pour que* + subjunctive | `pour-que` |
| `temporale-nebensaetze` | *quand, dès que, pendant que, avant de, après*; *quand* + futur | `time-clauses` |
| `konditionalsaetze` | *si* + présent, futur or imperative | `si-present` |
| `als-oder-wenn` | *quand* or *si* | `quand-or-si` |
| `temporale-praepositionen-b1` | *depuis, il y a, pendant, pour, en, dans* | `depuis-il-y-a` |
| `relativpronomen` | *qui, que, où, dont* | `relative-pronouns` |
| `indirekte-fragen` | Indirect questions: *si, ce que, ce qui, où* | `indirect-questions` |
| `lassen` | *faire* + infinitive, *laisser* + infinitive | `faire-laisser` |
| `konnektoren-grund-gegengrund` | *pourtant, cependant, en revanche, donc, ainsi* | `linkers` |
| `genitiv` | Possessive pronouns: *le mien, la tienne* | `possessive-pronouns` |
| `zustandspassiv` | Pronoun order: *je le lui donne, il m'en parle* | `double-object-pronouns` |
| `passiv-b1` | *celui, celle, ceux, celles*; *celui-ci* | `demonstrative-pronouns` |
| `adjektivdeklination` | Adjective position and meaning: *beau/bel*; *un grand homme, ma propre voiture* | `adjective-position` |
| `verben-praepositionen` | Verbs + *à* or *de*: *penser à, avoir besoin de, essayer de* | `verbs-prepositions` |
| `da-wo-woerter` | *y* and *en* | `y-and-en` |
| `nutzen-benutzen` | Confusable verbs: *savoir / connaître, visiter / rendre visite, amener / apporter* | `savoir-connaitre` |
| `positionsverben` | Verbs that work differently: *manquer à, plaire à, falloir, rester* | `verbs-like-plaire` |
| `wortbildung-nomen` | Word formation: *-tion, -age, -ment, -eur/-euse, -ette, re-, dé-* | `word-formation` |
| `adjektive-als-nomen` | *ce qui, ce que, ce dont*; *le plus important, c'est …* | `ce-qui-ce-que` |

### B2 (13): `grammar-b2`

| Slot | French topic | New slug |
|---|---|---|
| `konjunktiv2` | *si* clauses, all patterns; conditionnel passé | `si-clauses` |
| `modalsaetze` | Plus-que-parfait | `plus-que-parfait` |
| `passiv` | Passive; alternatives with *on* and *se faire* | `passive-voice` |
| `relativsaetze-was-wo` | *lequel, auquel, duquel*; subjunctive in relatives (*un ami qui puisse*) | `relative-lequel` |
| `zumal-wohingegen` | Reported speech with tense concordance | `reported-speech` |
| `zweiteilige-konnektoren` | Subjunctive in opinion and doubt (*je ne pense pas que, il est possible que*) | `subjunctive-opinion` |
| `konsekutivsaetze` | *bien que, quoique, si … que, de sorte que* | `bien-que` |
| `partizip-als-adjektiv` | Participle agreement, incl. *avoir* with a preceding direct object; reflexive verbs | `participle-agreement` |
| `irgend` | *n'importe qui, quoi, où, quel* | `nimporte` |
| `fokuspartikeln` | Gérondif and participe présent | `gerondif` |
| `modalpartikeln` | Spoken discourse markers: *bon, ben, enfin, quoi, du coup, voilà, bref* | `discourse-markers` |
| `adjektive-mit-praepositionen` | *content de, prêt à, capable de, fier de* | `adjectives-prepositions` |
| `nomen-verb-verbindungen` | *prendre une décision, faire attention, avoir envie, porter plainte* | `collocations` |

### C1 (11, free + paid): `grammar-c1`

| Slot | French topic | New slug |
|---|---|---|
| `konjunktiv-1` | Subjonctif passé; sequence of tenses | `subjonctif-passe` |
| `es-korrelat` | Emphasis: *c'est … qui, ce que … c'est* | `cleft-sentences` |
| `passiversatz` | Conditions without *si*: *à condition que, pourvu que, à moins que, au cas où* | `conditions-without-si` |
| `futur-2` | Futur antérieur | `futur-anterieur` |
| `irreale-vergleiche` | *comme si*; *quand bien même* | `comme-si` |
| `subjektive-modalverben` | Modal nuance: *il aurait dû*; journalistic conditional (*selon la police, il aurait fui*) | `modal-nuance` |
| `nominale-praepositionen` | Formal connectors: *en raison de, à l'égard de, néanmoins, toutefois* | `formal-connectors` |
| `nominalisierung` | Nominalisation in formal writing | `nominalisation` |
| `partizipialattribute` | Participle clauses: *Ayant terminé, … La réunion terminée, …* | `participle-clauses` |
| `textkohaerenz` | Cohesion: reference, register, *celui-ci, ce dernier* | `cohesion` |
| `verbpraefixe` | **Passé simple for reading**: recognise, don't produce | `passe-simple` |

No slot is dropped. Gaps for later: imparfait du subjonctif (recognition), verb prefixes as their own topic, *ne* explétif.

**Rules for all levels:** `grammatik.<slot>.intro` in `en.json` is updated with each subtitle, or the old text overwrites it at render time. `accepts` ignores case. `swapClauses` doesn't accept swapped clause order for French conjunctions unless `SUBORD` is extended, so hints state the order. New exercises are appended in topics the path uses, never inserted. After the paid split, edit the paid file directly and keep `slots` right in the free file.

### 3.1 Grammar side files

| File | French course | Item |
|---|---|---|
| `grammatik.json` quick quizzes | Follow the slot map | each `grammar-<level>` |
| `akkusativ.json` | COD pronouns | `grammar-a2` |
| `grammatik-lehrplan.json`, `GRAMMATIK_ORDER`, `grammatik-verwandt.json` | French syllabus order, related topics recomputed | `grammar-structure` |
| `kursinhalte.json`, `content/program.json` | French course plan; exam lines name exam + skill only | `grammar-structure` |
| `nachschlagen/starke-schwache-verben.json` | `schwach` = regular *-er, -ir*; `stark` = irregular; `gemischt` = spelling-change *-er* verbs; rows per §1.4 `forms` | `grammar-structure` |
| `nachschlagen/trennbare-verben.json` | Pronominal verbs reference; slug stays `reflexive-verbs-list` | `grammar-structure` |
| `nachschlagen/verben-mit-praepositionen.json` | Sections *à*, *de*, no preposition. A verb with two right prepositions is listed under both (*parler à/de, jouer à/de*); the quiz relies on it | `grammar-structure` |
| `wortarten.json`, `praepositionen-trainer.json` | French; packs *à / de / en*, *pour / par*, place, time; pack ids kept | `grammar-structure` |
| `uebersetzungen/grammatik*.json` (incl. `grammatik-themen.json`, read by `downloads.js` and `lang-coverage.mjs`) | Refill only if reliable; `grammatik-ui.json` **leave** (§9) | `grammar-structure` |
| `searchIndex.js`, `catalog.js` emojis, `stundenplan.js` patterns, `GRAMMAR_RULES` | Follow the topics; reword rules and plan together | `grammar-structure` |
| `grammatik-start/*`, `generate-grammatik-start-pdf.mjs`, `check-grammatik-start.mjs` | §5.1 | `grammar-start-book` |
| `artikel.json`, `artikel-packs.json`, `artikel-haeufigkeit.json` | §5.9 | `games` |

---

## 4. Modules converted from Spanish-specific ones

### 4.1 Conjugation tables (`conjugation-data`)

**Keep the trainer and the table code**, French verbs in `verbtabellen.json` (`about`, `variety`, `groups`, `verbs`). The generator is `src/lib/verbtabellenCore.js`; it needs French rules throughout. Six rows in `PERSONS`: `je · tu · il/elle/on · nous · vous · ils/elles`. A tense is a comma list of six forms. A regular verb stores only `inf, en, level, group, regular`; an irregular one stores only the tenses the generator can't produce. Same six group ids. The Spanish table has 69 verbs; the French minimum below is smaller on purpose, and a run grows it only with forms it has checked.

| Key | Holds | Stored or generated (`STORED_TENSES`, `ROW_TENSES`) |
|---|---|---|
| `inf` | infinitive (*parler*, *se lever*) | stored |
| `group` | `hilfsverb` = *être, avoir, aller*; `modal` = *pouvoir, vouloir, devoir, savoir, falloir*; `regelmaessig` = models *parler, finir, vendre*; `stem-change` = **spelling-change *-er*** (*manger, commencer, acheter, appeler, préférer, payer*); `unregelmaessig` = irregular; `trennbar` = pronominal | stored |
| `regular: true` | generated from the ending | stored |
| `aux` (**new**) | `avoir`, `être`, `both` | stored |
| `praes` | présent | stored where irregular |
| `praet` | **passé simple**; recognition, shown closed | stored where irregular |
| `p2` | participe passé | stored where irregular |
| `imperf` | imparfait, from the *nous* stem of the présent (*être* stored) | stored where irregular |
| `fut` | futur simple | stored where irregular |
| `cond` | conditionnel présent | **generated from the stem of `fut`** (*aurai → aurais*), as now |
| `subj` | subjonctif présent | stored where irregular |
| `subjImpf` | **imparfait du subjonctif**; recognition, shown closed, not drilled | **generated from `praet`**: the *tu* form + *-se* (*parlas → parlasse, fus → fusse*); the *il* form takes a circumflex (*parlât, fût*). This replaces the Spanish rule that reads the *ellos* form. |
| `imp` | impératif, six slots: `–, parle, –, parlons, parlez, –` | stored where irregular |
| `impNeg` | negative imperative: *ne parle pas, ne te lève pas* | generated |
| `perf` | **passé composé** with `aux` | generated |
| `plusc` | plus-que-parfait | generated |
| `futPerf` | futur antérieur | generated |
| `condPerf` | conditionnel passé | generated |
| `subjPerf` | subjonctif passé | generated |
| `subjPlusc` | subjonctif plus-que-parfait; recognition, not drilled | generated |
| `ger` | **participe présent** (*parlant*; the page shows the gérondif, *en parlant*) | stored where irregular |
| `note`, `frCA`, `en`, `level` | as in Spanish | stored |

Spanish code in `verbtabellenCore.js` that goes: `VOSOTROS`, `seForm` and the `-se` alternatives, `enclitic` (*dímelo*; French imperative pronouns are hyphenated, *donne-le-moi*), and the `AUX` table of *haber*, which becomes the *avoir* and *être* forms chosen by `aux`.

French rules the generator must add:

- **Elision in the row label:** *j'aime, j'habite*, but *je hais*. Forms are stored without the pronoun; a display helper elides. Pronominal: *me/m', te/t', se/s', nous, vous, se/s'*.
- **Agreement in generated compounds with *être***: show `allé(e)`, `allé(e)s`. `alt` also holds accepted variants (*je paie / je paye, je m'assieds / je m'assois*) and 1990 spellings (*connaître / connaitre*). The Spanish `alt` for `-se` goes.
- **Spelling-change forms** highlight as in Spanish: compares with the bare pattern.
- Defective: *falloir* (only *il*), *pleuvoir* (*il*, *ils*): `defective: true`, `–`.

Minimum set: models *parler, finir, vendre*; *être, avoir, aller, faire, venir, tenir, prendre, mettre, dire, voir, savoir, pouvoir, vouloir, devoir, falloir, pleuvoir, partir, sortir, dormir, ouvrir, écrire, lire, boire, croire, connaître, conduire, recevoir, vivre, suivre, mourir, naître, s'asseoir, envoyer, manger, commencer, acheter, appeler, préférer, payer*; pronominal *se lever, s'appeler, se souvenir, s'en aller*. Checked against a reference conjugation source; `check:verbtabellen` golden forms and accent rules are rewritten for French.

### 4.2 Conjugation trainer (`conjugation-trainer`): keep, French

`/grammar/conjugation`, `conjugationTrainer.js`, `conjugationTyped.js`, `conjugation-trainer.json`, `check:conjugation` all stay, including typed + pills behaviour.

- Drill choice (`drills.tenses`, same keys as §4.1): `praes, perf, imperf, plusc, fut, futPerf, cond, condPerf, subj, subjPerf, imp, impNeg`. In `drills.notDrilled`: `praet` (passé simple; recognition set only), `subjImpf`, `subjPlusc`. Each tense's `mood` is `indicatif`, `conditionnel`, `subjonctif` or `impératif`; `name` is the French name; `rule` is rewritten.
- `drills.groups`, one explicit verb list each, every verb present in `verbtabellen.json`: `reg-er`, `reg-ir`, `reg-re` (the old `reg-ar`, `reg-er`, `reg-ir` slots), spelling-change, irregular, reflexive. `drills.presets` are rewritten; `topicLinks` keys follow the slot map (§3) and their `drill:*` values point at the new presets.
- Accent key row from §1.2. A typed reflexive form without its pronoun gets its own hint. The learner types the verb form only, with the subject pronoun shown, so elision (`j'`) can't cause a false wrong answer.
- Hand-written sets (`kind: "choice"` as now) replace the 11 Spanish ones; all `ser-estar-*`, `por-para-b1`, `indefinido-*`, `subjuntivo-*`, `irregular-yo-a1`, `futuro-condicional-b1`, `imperativo-b1` ids go:

| New set id | Level | Drills |
|---|---|---|
| `irregular-present-a1` | A1 | *être, avoir, aller, faire* and other key irregulars |
| `avoir-etre-a2` | A2 | *avoir* or *être* in the passé composé |
| `agreement-etre-a2` | A2 | Participle agreement with *être* |
| `irregular-participles-a2` | A2 | *eu, été, fait, pris, mis, vu, dit* … |
| `imperative-a2` | A2 | Imperative, with pronouns |
| `avoir-etre-b1` | B1 | Harder cases: *monter, sortir, passer* with and without an object |
| `passe-compose-imparfait-b1` | B1 | Passé composé or imparfait in context |
| `futur-conditionnel-stems-b1` | B1 | *aur-, ser-, ir-, fer-, viendr-* … |
| `indicatif-subjonctif-b1` | B1 | Indicative or subjunctive: wishes, necessity |
| `indicatif-subjonctif-b2` | B2 | Indicative or subjunctive: opinion, doubt, concession |
| `agreement-avoir-b2` | B2 | Agreement with *avoir* and a preceding direct object |
| `agreement-reflexive-b2` | B2 | Agreement with reflexive verbs |
| `passe-simple-c1` | C1 | Recognition: which verb and person is this form? |

- `/prepositions` and `MORE` lose the link `?set=por-para-b1`.
- `drills.limits` drops real but unneeded forms (*imperative of pouvoir, falloir, pleuvoir*…).

### 4.3 Business French (`business-french`), B1–C1

Same six units, same ids and shape (`src/data/business-spanish/<unit>.json`): `correos` emails (*Madame, Monsieur, Je vous prie d'agréer…, Cordialement*), `llamadas` phone, `curriculum` CV and *lettre de motivation* (France's conventions: photo, length, age; "to verify"), `entrevista` interviews in France (*vous*, the *entretien*), `reuniones` meetings, `negociacion` (C1) negotiation and figures. Phrases carry `fr` where the Spanish had `es`. This is a deliberate exception to "keep the shape": `es` would otherwise read as the new Spanish UI language. `check-business-spanish.mjs` and the page read the key, so this item updates both. Differs from the everyday `b1-email-*` writing tasks. Page `/business-french`, `BUSINESS_SLUGS` unchanged.

### 4.4 Code de la route vocabulary (`code-route-vocab`)

**Vocabulary only**: no official exam questions, no copied text, no claim to prepare for the exam on its own. Deck `src/data/dgt/vocabulario.json`, same schema, `DGT` in `berufeCore.js`, ids `bv-dgt-…`, page `/code-de-la-route-vocabulary`. The ten group ids stay: `car` (parts), `controls`, `road` (*rocade, bretelle, bande d'arrêt d'urgence*), `users` (road users), `signs` (words only, no official images), `manoeuvres` (*céder le passage, doubler, se garer, priorité à droite*), `instructions`, `exam` (*auto-école, examen du code, permis B, points*), `documents` (papers and fines), `breakdown`. Groups mix `ref` entries into the lexicon and own `bv-dgt-…` entries. Titles lead with the French (*La voiture: parts of the car*). Short orientation box: official source is the government site; format and languages of the test "to verify". Do not carry over DGT-specific facts (V-16 beacon).

---

## 5. Module map (convert)

### 5.1 Placement, learner shell, grammar book

| Module | French course | Item |
|---|---|---|
| `einstufung.json` | Same design (6 per level, 2 drawn). A1: *être/avoir*, *-er* present, *le/la*, *ne…pas*, *est-ce que*, adjective agreement. A2: passé composé (avoir, être), imparfait, COD, futur proche, partitive. B1: PC/imparfait, subjonctif (wishes), *y/en*, *dont*, conditionnel, futur. B2: *si* patterns, *bien que*, passive, reported speech, participle agreement, gérondif. C1: subjonctif passé, cleft, *à condition que*, *comme si*, nominalisation, journalistic conditional. | `placement-test` |
| `einfach-pfad.json` | A1–B1, first steps for a newcomer in France (*bonjour*, *je m'appelle*, numbers, *où est…*, a rendez-vous, *la mairie*). All old ids stay. New ones only with a reason. `placementStart` rechecked. Tasks re-signed. | `beginner-path` |
| `/step-by-step` screens | `einfach-view.js`, `einfach-app.js`, `einfach-content.js`, `einfach-fixtures.js`, noscript in `step-by-step.astro`, `docs/easy-mode-tier1-v1.md`. `articleOptions`, `ARTICLE_PLACEHOLDERS` to `le / la`, `le / la / l'`, `un / une`. `artikel` tasks reject `l'`/`les`/`le/la` nouns, or ask `un / une`. Plural card: `les` + plural. Bruno's reactions simple French with English on tap. | `beginner-path-ui` |
| `grammatik-start/*` + generator | **"French Grammar Start A1–B1"**, brand icanspeak French, ten chapters in `k1`–`k10`: *être/avoir*, *-er* present, questions and *ne…pas*, nouns/articles/adjectives, irregular present, reflexive and object pronouns, modal verbs, passé composé, imparfait, B1 toolkit. Printed book says fr-CA in plain text where needed. The German edition is reset to a skeleton here and rewritten by `ui-lang-de`. Regenerate the PDF after `routes`. | `grammar-start-book` |

### 5.2 Vocabulary

| Module | French course | Item |
|---|---|---|
| `content/lexicon/a1…b2.json` | Same units and counts, France vocabulary, resident's needs first (*la mairie, la préfecture, le rendez-vous, le médecin traitant, la carte Vitale, la CAF, le bail, le loyer, la fiche de paie, le contrat*). Schema §1.4, `variety` §1.5. | `vocab-a1` … `vocab-b2` |
| `c1.json`, `c2.json` | Same conventions. Titles about Spanish change (*Loanwords in French, Informal French (France)*), with `ws.set.*`. | `vocab-c1-c2` |
| `wortschatz.json` | French phrase cards; `note` = English tip; `variety` | `vocab-a1` |
| `haeufigste-woerter.json` + scripts | Read `fr_50k` (§1.4) | `vocab-a1` |
| `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json` | Keep pictures, re-key to French ids | each `vocab-*` |
| `lexicon/i18n/<lang>.json` | `de`, `es`, `pt`, `it` per level | each `vocab-*` |
| `scripts/lexicon-import.mjs` | Keep, French source format; IPA from the source (§1.4); adds `-fr` on clashes. Slug-check lemmas first; empty the level and old ids before importing. | `vocab-a1` |

Spain topics become France's: *impôts, TVA, taxe foncière, Livret A, APL, RSA, collège, lycée, baccalauréat, Parcoursup, gendarmerie, police nationale, région, département, livret de famille, CDI, CDD, intérim, rupture conventionnelle, syndic, état des lieux, Assemblée nationale, Conseil d'État, Journal officiel, Défenseur des droits*: glossed as orientation only.

### 5.3 Listening (`hoeren.json`, ids kept) — `listening`

| Id | French script |
|---|---|
| `a1-ansage-bahnhof` | Station announcement (*voie*, *retard*) |
| `a1-anruf-arzt` | Voicemail from the *cabinet médical*: your rendez-vous |
| `a1-supermarkt` | At the supermarket: *Où est…?* |
| `a1-verabredung` | Phone call: *On se voit ?* |
| `a2-amt-termin` | At the *mairie*: changing a rendez-vous |
| `a2-wohnungsbesichtigung` | Viewing a flat |
| `a2-radio-wetter-verkehr` | Radio: weather and traffic |
| `a2-paketdienst` | Voicemails: a parcel (*point relais*) and the plumber |
| `b1-krankmeldung` | Calling in sick (*arrêt de travail*) |
| `b1-elterngespraech` | Meeting with the teacher |
| `b1-radio-muelltrennung` | Radio: recycling, the *bac jaune* |
| `b1-durchsage-ersatzverkehr` | Announcement: a strike or works, replacement bus |
| `b2-diskussion-homeoffice` | Team meeting: *télétravail* |
| `b2-interview-anerkennung` | Interview: getting a degree recognised |
| `b2-beschwerde-versicherung` | Complaint to an insurer |
| `b2-vortrag-ehrenamt` | Short talk: *bénévolat* |

`voices` = fr-FR voices (names "to verify" before a render); `seconds` estimated; every text `variety: "fr-FR"`. Elisions and dropped *ne* appear as spoken at A2+.

### 5.4 Reading and writing — `reading-writing`

| Module | French course |
|---|---|
| `lesen.json` | B1 set from life in France: notices (*copropriété*, school, gym), local news article, forum posts, interview; form = invented municipal form; writing prompt = email; error hunt = typical learner errors. Same ids. |
| `fertigkeiten/lesen.json`, `schreiben.json` | A1–B2 forms, messages, emails to a landlord, school, employer; *lettre de motivation*, *courrier administratif* (*Madame, Monsieur … Veuillez agréer*), the formal email, a complaint, an opinion text. `a2-padron-notice`/`a2-padron-form` ids stay; content = **notice from the mairie, form for an *inscription scolaire* or *carte de bibliothèque***, because France has no padrón. |
| `src/lib/schreibKorrektur.js` | LanguageTool `fr` behind `BACKEND.languageTool` (off); own rules: NBSP before `? ! : ;`, missing accents on common words, `ça`, *à/a* hints. |
| `wordRange()` | reads “(80–100 mots)” |

### 5.5 Speaking — `speaking`

| Module | French course |
|---|---|
| `sprechen.json`, `sprechen-b1b2.json` | Same pictures, check what each shows; stages in the style of DELF and TCF oral tasks; labelled "in the style of", "Not an official exam task". **tu/vous throughout**: each task states which. Player gender avoided. |
| `redemittel.json` | Same 14 set ids and phrase order (the path addresses `redemittel:<set>#<index>`); `de` = French phrase, `en` = real translation + usage note; `variety`. |
| `redemittel-i18n/<lang>.json` | `de`, `es`, `pt`, `it` from the French; `fr` emptied. |
| `cardPoint`, `resolveSprechen` | Strip *et*, French wrapper sentences |

### 5.6 Pronunciation — `pronunciation`

| Module | French course |
|---|---|
| `ausspracheregeln.json` | Rules in the old slots: oral vowels; **nasal vowels** (*an, on, in*; *un* merged for most speakers); **French r**; **u / ou** (*tu/tout*); **e muet**; **liaison** (required, forbidden, optional) and **enchaînement**; **silent final letters**; stress at the group's end; *é / è*; *eu*; *gn*, *ill*; h muet and aspiré; `ch / j`. `frCA` notes (affrication, *-tu*, vowels). |
| `aussprache-check.json` | A1–B1, pairs *tu/tout, vin/vent, dessus/dessous, poisson/poison, le/les*. Same ids. |
| `satzmelodie.json` | Rise in questions, *est-ce que*, question-word falls, lists, polite requests. `baseAs()`, the quiz and `melodyType` lose `¿…?` and read French question words. |
| `zungenbrecher.json` | French folk virelangues (*Les chaussettes de l'archiduchesse…, Un chasseur sachant chasser…*), public domain |
| `aussprache-muttersprache.json` + `fehler-nach-sprache.json` `area: "aussprache"` | **English, German, Spanish, Portuguese, Italian** first (e.g. English: *r*, *u*, nasal vowels, diphthongs, final stress; German: *z* vs *s*, final devoicing, nasal vowels; Spanish: *s/z*, *b/v*, *e muet*, *u*; Portuguese: nasal differences, *e muet*; Italian: double consonants, stress, *u*). Others only where reliable. They link both ways (`check:aussprache`). |
| `ausspracheTipps.js`, `LANG` in check libs, `aktivMode.js`, `spielKit.js`, `speak.js` | `focus` ids `r`, `u-ou`, `nasal`, `e-muet`, `liaison`, `silent`, `eu`, `e-accent`, `gn`, `h`; `fr-FR`. |

`audio` stays `false`. Browser voice fr-FR first, then any French voice; never another language's. Pair tests must not depend on a distinction the voice doesn't make (*brin/brun*; Canadian voices): check this at the audio render.

### 5.7 Idioms, mistakes, slang — `idioms-mistakes`

| Module | French course |
|---|---|
| `redewendungen.json` | Idioms and proverbs used in France, B1–C1 (*avoir le cafard, coûter les yeux de la tête, poser un lapin*); `de` = idiom, `en` = nearest English; `quellen` https; origin only where sourced. `REDEWENDUNGEN_LIVE` stays Edgar's call. |
| `umgangssprache.json` | **Everyday spoken French**: *ne* dropped, *on* for *nous*, *ça*, *t'as*, *y a*; slang (*boulot, bouquin, truc, mec, nana, bosser, sympa*); verlan basics (*meuf, relou, ouf, chelou*) with register notes; swearing with warnings, no slurs. |
| `typische-fehler.json` | Same 5 group ids (`gleich, gross, aehnlich, wendung, hinten`): *je suis 25 ans* (*j'ai*), *je suis chaud* (*j'ai chaud*), *j'ai allé* (*je suis allé*), *la problème* (*le*), *depuis* tense, *visiter* for people. |
| `fehler-nach-sprache.json` | **`franzoesisch` slot → `spanisch`**. Slots: `englisch`, `deutsch`, `spanisch`, `portugiesisch`, `italienisch` required; `arabisch` strongly preferred, as many learners in France speak it, written only if reliable; `rumaenisch`, `russisch`, `ukrainisch`, `chinesisch` only if reliable, otherwise removed with their drills. `langMark.js` follows. |
| `wortfallen.json` | False friends for English (*actuellement, attendre, librairie, blesser, sensible, monnaie*), German (*le gymnase* ≠ Gymnasium, *brave* ≠ brav), Spanish (*constipé* ≠ constipado, *large* ≠ largo, *salir* ≠ salir), Portuguese (*attendre* ≠ atender, *prétendre* ≠ pretender), Italian (*salir* ≠ salire, *fermer* ≠ fermare). These are starting points: the run checks each one. New ids, re-key `en.json`. |
| `synonyme.json` | Groups A1–B2, must really swap in a sentence; `nota` register |
| `wortarten.json` `fehler` | Filled with French pair ids |

### 5.8 Culture (France first, then the francophone world) — `culture`

`kultur.json` ids kept. No topic is left describing Spain.

| Id | Level | French course topic | New slug |
|---|---|---|---|
| `duzen-siezen` | A1 | *Tu* or *vous* | `tu-or-vous` |
| `pfand` | A1 | Greetings: *bonjour* first, *la bise*, handshake | `greetings` |
| `sonntagsruhe` | A1 | Daily rhythm: meal times, opening hours, Sundays | `daily-rhythm` |
| `trinkgeld` | A1 | Cafés, *service compris*, tipping, *l'addition* | `cafes-and-paying` |
| `bundeslaender` | A2 | Regions, departments, overseas | `regions-and-departments` |
| `feiertage` | A2 | Public holidays, *le pont* | `public-holidays` |
| `comida` | A2 | Food and meals | `food-and-meals` |
| `fiestas` | A2 | Festivals (*14 juillet, Fête de la musique*, Carnival…) | `festivals` |
| `muelltrennung` | A2 | Recycling: *bac jaune*, glass | `recycling` |
| `termine` | A2 | *Rendez-vous*: appointments, online booking | `rendez-vous` |
| `anmeldung` | B1 | **Proving your address** (*justificatif de domicile*): France has no registration | `proof-of-address` |
| `krankenversicherung` | B1 | *Ameli, carte Vitale, médecin traitant, mutuelle, urgences* | `health-system` |
| `mieten` | B1 | *Bail, dépôt de garantie, état des lieux, charges, APL* | `renting` |
| `schulsystem` | B1 | *Maternelle, élémentaire, collège, lycée, bac* | `school-system` |
| `arbeit-finden` | B1 | *France Travail, CV, CDI/CDD, intérim* | `finding-a-job` |
| `lenguas-cooficiales` | B1 | Regional languages (none official at national level) | `regional-languages` |
| `mundo-hispano` | B1 | The francophone world | `francophone-world` |
| `ausbildung` | B2 | *Apprentissage, université*, recognising degrees | `training-and-university` |
| `kuendigung` | B2 | *Démission, rupture conventionnelle, chômage* | `leaving-a-job` |
| `oeffentlich-rechtlicher-rundfunk` | B2 | France Télévisions, Radio France, others | `public-media` |
| `vereine` | B2 | *Associations loi 1901, bénévolat* | `associations` |
| `tradiciones-america` | B2 | Traditions of Québec, the Caribbean, West Africa | `francophone-traditions` |
| `foederalismus` | C1 | The *État*, decentralisation, *communes* | `state-and-decentralisation` |
| `sozialversicherung` | C1 | *Sécurité sociale, Urssaf*, contributions | `social-security` |
| `wahlen` | C1 | Elections, factual | `elections` |
| `historia-compartida` | C1 | France and its former colonies, factual | `france-and-its-former-colonies` |
| `erinnerungskultur` | C2 | Memory: Vichy, Algeria, factual and neutral | `historical-memory` |
| `grundgesetz` | C2 | Constitution of 1958, Conseil constitutionnel, *laïcité* | `constitution` |
| `mitbestimmung` | C2 | *Syndicats, CSE, conventions collectives* | `unions-and-agreements` |

`kultur-insider.json` (*l'apéro, bonjour first, la grève, the long lunch*), `kultur-bilder.json`, `wusstest-du.json`, `kalender-saetze.json`, `zitate.json` (authors who died before 1946), `kultur-filme.json` (France first). `WORLD_IDS` in `culture/index.astro`. `/explore/films` stays. Facts that change need a source and an "as of" date.

### 5.9 Games

**Principle:** an elided noun can't be asked as `le / la`, because *l'* gives nothing away, and neither can a plural, since *les* is always the same. So:

- Consonant-initial nouns: `le / la`.
- Vowel and h muet nouns: **`un / une`**, shown as such, with `genus`.
- `l'` is taught as a rule (*l'école, not la école*), in the trap tiles and the trainer's rule pack, not as a gender choice.
- `les` gates become **plural-form gates** (*le cheval → les chevaux / chevals*).

| Module | French course | Item |
|---|---|---|
| `artikel-sprint` (`/games/gender-sprint`), `questions.js` lanes | `le / la`, `un / une`, plural forms; traps *la plage, le musée, la main, l'eau (une), le lycée* | `games` |
| `/articles`, `generoDrill.js`, `artikelPacks.js`, `artikel*.json` | Rule packs: **-tion, -té, -ette, -ure, -ence → f**; **-age, -ment, -eau, -isme, -oir → m**, exceptions (*la plage, la page, la peau, l'eau, la main, la fin, la mer, le lycée, le musée*). `AMBIGUOUS`: nouns whose meaning changes with gender (*le/la livre, tour, poste, mode, voile, manche, mémoire, vase*) and *gens, après-midi, amour* | `games` |
| `artikelDiktat.js`, `ArtikelDiktat` | Article check: `le, la, l', les, un, une`; accents count | `games` |
| `quakiSpringt`, `hochstapler`, `satzregen` | French pools and themes. `satzregen`: French word order less free than Spanish, but list every other right order; the `{free …}` flag only where truly free; pronouns before the verb and *ne…pas* are the modes; tiles per §1.2. Clue starters in impostor avoid giving away gender | `games` |
| `spiele/domino.js`, `bingo`, `arbeitsblatt/wortschatz.js` | Filters on `le/la/l'`, labels; `teachers` owns page text | `games`, `teachers` |
| `nussnacht` | Shots **le / la**; elided creatures = **un / une** buttons; plural popper → plural-form choice. Bosses in `bosse.js` = gender traps above. Ending radar: per the rule packs. Cracker: compound nouns (*tire-bouchon, porte-monnaie, ouvre-boîte*, mostly m). | `games-arcade` |
| `hoerSafari` | Hear *le/la* + noun, hit the picture; `l'` nouns **out**, since hearing them can't tell gender. **No French audio exists**: browser voice, fr-FR first, then any French voice, never another language; without speech the word appears at once and the start card says why. Same exclusions of nouns whose picture doesn't show them. | `games-arcade` |
| `buergeramt` | §5.11 | `prefecture-sim` |
| `knigge` (`/games/manners`) | Scenes in France: *bonjour* first, *la bise*, tu/vous, meal times, the *boulangerie*, the *mairie*, *l'apéro*. `de` = French line, `en` = English, wheel `sie`/`du` = *vous*/*tu*. **Player's gender avoided**, which French agreement makes harder: not *enchanté(e)* or *ravi(e)* but *c'est un plaisir*; not *tu es arrivé(e)* but *tu viens d'arriver*. `check:knigge`, `check:lindenau` patterns rewritten for French. | `games-dialogue` |
| Town RPG (`/games/villabruno`, `src/lib/lindenau/*`) | **Montbruno**, an invented French town: *boulangerie, gare, cabinet médical, supermarché, voisin, café*. `label` carries the article (`withArticle`). *Le comte Crasse, le baron Poussière*; Super-Blubb stays. `VARIETY = "fr-FR"`. | `games-dialogue` |
| `/game` | Content from the teacher quiz | `teachers` |

### 5.10 Teachers — `teachers`

| Module | French course |
|---|---|
| `arbeitsblatt/<id>.json` | Tandem extras for each slot; blue tile: infinitive → form, *le/la*, *tu → vous*; choice tiles `à / de`, `avoir / être`. **French needs the subject**, so the Spanish bracket tile `(yo)` goes: tiles are `je`, `tu`, and the sheet handles *j'*. `?` with NBSP. `check-arbeitsblatt.mjs` rewritten (no `¿`). |
| `partneruebungen/*` | Same scenarios in France; drafts until reviewed |
| `unterricht-wortschatz.json`, `lernstunde-texte.json`, `stundenplan.js`, `stundenplanLinks.js` | French lesson modes; links as searches, not fixed videos |
| `downloads.json` | Official links: France Éducation international (DELF/DALF, TCF), CCI Paris (TEF), service-public, ANTS or Sécurité routière. Spanish entries go. |
| printable games, class test `GRAMMAR_WORD`, `liveQuiz/chapters.js`, nicknames | French; nickname animal + adjective with one form for both genders where possible |

`/teachers/cards` (`vokabelFoto`) stays out, as in Spanish (§9).

### 5.11 Life in France: civic exam, nationality, Préfecture sim

**Préfecture sim** (`prefecture-sim`): **Bruno at the desk**, in `src/data/buergeramt/kunden.json`, `src/lib/buergeramt/*`. Same engine, five days, roughly the same number of hand-written cases. France differs from Spain in two ways the sim must not hide: **most titre de séjour requests go online through ANEF**, and **there is no town-hall registration**. So the player is at a *point d'accueil numérique* / reception desk at the invented **préfecture and mairie of Montbruno** helping people get files complete, not deciding.

| Day | Desk | Papers |
|---|---|---|
| 1 | Mairie | *justificatif de domicile*, *attestation d'hébergement*, ID |
| 2 | Mairie | School enrolment, the same papers with new traps (old bills, wrong names) |
| 3 | ANEF help point | Online request: account, passport, photo, *justificatif de domicile* (*numéro de photo-signature, timbre fiscal*: "to verify") |
| 4 | *Récépissé*, CAF and *sécurité sociale* point: *carte Vitale, RIB, attestation* | Who can be helped here, who must go elsewhere |
| 5 | Questions: naturalisation, refusal, *OQTF*, asylum | **Always referred** to official information or legal aid (`derivar_*` kept; `derivar_arraigo` and `derivar_regularizacion` get French content under the same keys) |

- **Where it lives:** customers' lines are in `kunden.json` (`gruss`, `genehmigt`, `abgelehnt`, `zurueck`, `warten`); cases, papers and `WOERTER` in `lib/buergeramt/faelle.js`; `TAGE` and the rules in `regeln.js`; weekday names in `daten.js`; the desk in `tisch.js`. `TAGE[n].ort` values `padron`/`extranjeria` stay as ids; `titel` and the rule list follow the table above. The dates (`heute: "2027-03-15"` …) stay.
- **Stamps COMPLET / INCOMPLET**, keys C and I, never accepted/refused: no stamp may look like a decision about status. `genehmigt` holds the COMPLET lines, `abgelehnt` the INCOMPLET lines: neither may say anything about the person's status.
- A missing paper means "come back with it"; never "you can't stay".
- `de` = French, `en` = English shown under it. File-level `variety`. `art: "lindenau"` value kept, = made-up Montbruno rule; `"echt"` = usual practice with source type. `TAGE`, `WOERTER`, paper kinds kept, with new meanings (`meldeschein` = ANEF print-out, `wgb` = *justificatif de domicile*, `abmeldung` = the *récépissé*).
- `check:extranjeria` stays, script name included. "General orientation, not legal advice" on start and end cards. Page stays a noindex prototype outside the menu until Edgar decides.

### 5.12 French for work — `french-for-work`

Same 10 sector ids (progress keys). French sectors, where immigrants in France often work first:

| Id | Sector | Slug |
|---|---|---|
| `pflege` | Care: *aide à domicile, EHPAD, aide-soignant* | `care-work` |
| `gastronomie` | Restaurants and kitchens | `restaurants` |
| `kita` | **Cleaning and childcare** (*nettoyage, assistante maternelle, garde d'enfants*) | `cleaning-childcare` |
| `elektro-technik` | **Private security** (*agent de sécurité, gardiennage*) in place of Spain's agriculture. Immigrant employment is high and language use is constant. The licence rules for security staff are "to verify" and stay general. | `security` |
| `bau-handwerk` | Building, *le BTP* | `construction` |
| `einzelhandel` | Shops, *grande distribution* | `shops` |
| `lager-logistik` | Warehouse and logistics | `warehouse` |
| `kraftfahrer` | Driving and delivery (refs into the code de la route deck) | `driving` |
| `hotel` | Hotels and tourism | `hotels` |
| `buero` | Office (links to Business French) | `office` |

Conventions as §1.4. `translations.en`; `deHint` German; `variety`. Working conditions general, "to verify". `GENDERS` per §1.6. Photos: `hub-bilder.json` queries.

### 5.13 Word stories — `word-stories`

French etymology, new files by lemma slug, same schema: Latin (*maison, eau, parler, fromage*), Frankish (*jardin, guerre, bleu, riche*), Arabic (*café, sirop, chiffre, algèbre, toubib*), English loans and round trips (*tennis, budget, week-end, flirter*), others. About 30 A1–A2 words, every story sourced (TLFi via CNRTL, Wiktionary; only what was read). `status: "entwurf"`. Spanish stories deleted when their batch lands, the same `publishOn` dates reused. Lemmas must be in the lexicon. `entryLang`, `LANG_NAMES`, `PROSE_LANG`.

### 5.14 Accents and languages — `accents-languages`

| Module | French course |
|---|---|
| `/knowledge/accents` (`dialekte.json`, `dialekte-karte.json`) | Metropolitan first: northern/standard, southern France (*e muet* pronounced, *-ng*), Alsace, Corsica; `world` array: Québec, Acadie, Belgium, Switzerland, West Africa, North Africa, Caribbean, as notes. Regional languages as `lang: true` dots: Breton, Occitan, Alsatian, Corsican, Basque, Catalan. |
| `/knowledge/languages` (`sprachen-welt.json`, `sprachen-karte.json`) | Where French is spoken. Views `world` + `africa` instead of `americas`. Official/co-official countries; Canada, Belgium, Switzerland; Maghreb as `region`; figures from OIF, "to verify". Comparison = slots in `fehler-nach-sprache.json`, opens on English. **Decoder** turned: English → French patterns (`-ty → -té`, `-ous → -eux`). |
| Geometry | `scripts/karte-geo.mjs` from outlines in the repo. France's view needs its own hand-drawn region lines; `generate-*-karte.mjs`. Check whether the committed outlines include France in enough detail; Spanish history commit `edf6596` may not exist in this repo. |

---

## 6. Data-file naming

Data file names and folders stay (`einstufung.json`, `hoeren.json`, `grammatik/…`, `dgt/`, `business-spanish/`). New files use English names. A later clean-up of file names is out of this queue.

---

## 7. Modules dropped (removed by `cleanup`, restore commands in its report)

`cleanup` runs before the `ui-lang-*` items, so the `fr` UI row is the one thing still present when `cleanup` ends: `ui-lang-es` removes it, and `cleanup`'s closing grep treats `fr` UI hits as deliberate.

| What | Why |
|---|---|
| `fr` UI: `public/i18n/fr.json`, registry entry, entry pages, `og:locale`, `CORE` entry (done by `ui-lang-es`) | French learners don't need a French UI |
| `lexicon/i18n/fr.json`, `redemittel-i18n/fr.json`, `fr` blocks in `schreibKorrektur.js`, `elsewhere.fr` in word stories, `LanguageOffer.astro` line | Same |
| Empty lexicon sidecars (`ar, fa, hi, id, kmr, pl, ps, ro, ru, so, sq, ti, tl, tr, uk, vi`) if still empty | No reader; check `LANG` lists first |
| `scripts/es-ipa.mjs`, `showsVosotros`, `alt -se` logic, `¿ ¡` rules, `es419` legacy branch, `el/la` fallbacks | Spanish logic |
| Spanish PDFs (`public/downloads/grammatik-start*.pdf` until regenerated), Spanish images (`bildkarten`, `hub-bilder`) showing Spain only | Must not stay next to French content |
| `public/logos/icanspeak-spanish-*` (done by `base-path-and-brand`). The `icanspeakit-*` logos stay: they are the umbrella brand. | Wrong course |
| `uebersetzungen/woerter-uk.json`, read only by `generate-grammatik-pdf.mjs` (`grammar-structure` removes that read or refills the file) | Spanish-based glosses |
| `exams/dele-or-siele.astro` → renamed; `src/pages/nationality/dele-a2/` → renamed (`routes`) | |
| Any unwritten paid mock | Never left in Spanish |

---

## 8. Slugs to rename (`routes`)

No redirects from Spanish-course URLs: `/french` is new. Keep the guessed `/grammar/<slug>` → `/<slug>`. Every internal link, `catalog.js`, `suche-seiten.json`, `entry-pages.json`, sitemap, `llms.txt` follows. `pnpm check:links` is in the gate. Renamed pages rekey `scripts/i18n-luecken-baseline.json` in the same commit (§1.6 rule 9). `/tef/language-in-use` falls under `testdaf` in `examOfPath()`, not `goethe` as it did under `/dele`: check the course bar on that page.

| Current | New |
|---|---|
| `/dele` (+`/[slug]`) | `/delf-dalf` (+`/[slug]`: `a2`, `b1`, `b2`, `c1`) |
| `/dele/a1` | `/delf-dalf/a1` |
| `/dele/language-use` | `/tef/language-in-use` |
| `/siele` (+`/practice-set`) | `/tef` (+`/practice-set`) |
| `/siele/levels` (+`/[slug]`) | `/tcf` (+`/[slug]`) |
| `/nationality` | `/residence-and-nationality` |
| `/nationality/dele-a2` (+`/mock-test`, `/practice-set`) | `/residence-and-nationality/tcf-irn` (+ same) |
| `/ccse` (+`/test`, `/facts`) | `/civic-exam` (+ same) |
| `/exams/dele-or-siele` | `/exams/delf-tcf-or-tef` |
| `/spanish-for-work` (+`/[beruf]`) | `/french-for-work` (§5.12 slugs) |
| `/business-spanish` | `/business-french` |
| `/dgt-vocabulary` | `/code-de-la-route-vocabulary` |
| `/games/extranjeria` | `/games/prefecture` |
| `/games/villabruno` | `/games/montbruno` (or the settled name) |
| grammar topics | §3 |
| culture items | §5.8 |
| listening etc. item slugs (`ITEM_SLUGS`) | kebab-case of the new English title; leave an unmapped id out, **never map an id to itself** |
| kept | `/grammar`, `/grammar/conjugation`, `/grammar/reflexive-verbs-list`, `/vocabulary`, `/listening`, `/reading`, `/writing`, `/speaking`, `/pronunciation`, `/intonation`, `/tongue-twisters`, `/placement-test`, `/step-by-step`, `/object-pronouns`, `/prepositions`, `/culture`, `/knowledge/*`, `/teachers/*`, `/exams`, `/exams/traps`, `/exam-plan`, `/games/gender-sprint`, other games, legal pages |

**Code:** `EXAM_PATHS` = `{ goethe: "/delf-dalf", telc: "/tcf", dtz: "/residence-and-nationality/tcf-irn", testdaf: "/tef", "leben-in-deutschland": "/civic-exam", "start-deutsch-1": "/delf-dalf/a1" }`. `workPath()`, `businessPath()`, the `/spanish-for-work` section key. `examHref` in `stundenplan.js`. After routes: `pnpm generate:grammatik-start-pdf`, commit the PDFs; rerun `scripts/build-suche-seiten.mjs` after a build.

---

## 9. Modules left as is

| Module | Reason |
|---|---|
| Backend seam: `backend.js`, `supabase/browser.js`, `api.js`, `analytics.js`, `monitoring.js`, `pronunciation/browser.ts`, `access.js`, `PremiumLock` | No integrations; only the voice language where a module sets it |
| Server-only features (live quiz rooms, classes, sync, leaderboards) | Fail softly offline; texts via `ui-*` |
| `steuer.json`, `produkte.json`, `premium-features.json` | Business and legal settings; rendered strings via `ui-*`. `produkte.json` old names checked by `cleanup` |
| Image manifests (`*-bilder*.json`, `*.manifest.json`, `hub-emoji.json`, `einstieg-bilder.json`) | Language-neutral; photos showing Spain are replaced or dropped by their module's item |
| `paid-manifest.json`, `saetze-index.json`, `public/inhalt/*` | Generated |
| `uebersetzungen/grammatik-ui.json` | Keyed by German UI strings; harmless |
| `uebersetzungen/rechtliches.json`, legal facts (company, address, contact) | Legal facts unchanged; only language and brand (`ui-pages-m-z`). Binding language stays as it is |
| Mascots, design system page, icons, fonts, CSS, RTL, brand theme | Language-neutral; the Spanish course's `brand-theme` work carries over, which is why this queue has no such item |
| `src/lib/audioPacks.js`, `/account`, `/teachers/cards` + `vokabelFoto/*` | No app, no accounts; needs backends that don't exist |
| Data file names and ids (§6), storage keys | Code and progress key on them |
| `docs/inhalte-qa/` | Regenerated |
| `src/integrations/*` logic | Base-aware through config; language by `ui-lang-*` |

---

## 10. Infrastructure items

### 10.1 `base-path-and-brand`

The helper exists, and the hand copy already did part of this: `BASE_PATH = '/french'` in `src/lib/paths.js` (read by `astro.config.mjs` and `check-base.mjs`), `wrangler.jsonc` (name, routes; there is no `assets.base_path`, because `cf:prepare` nests the build under `french/` with the root `scripts/nest-dist.mjs`) and the package scripts. So the item confirms those and changes what is left:

- **Paths:** `/spanish` in `public/_headers`, `public/robots.txt`, `public/site.webmanifest` (name, `short_name`, `start_url`, `scope`, icons), `scripts/lib/pdf-brand.mjs`, comments in `astro.config.mjs` and `check-base.mjs`.
- **Logos:** `scripts/build-wordmark.mjs` reads `icanspeak-spanish-*`; point it at `icanspeak-french-*`, rerun it for `public/assets/logo.png`, the OG image, `favicon.ico` and `apple-touch-icon.png`. Then remove the Spanish logos. `Wordmark.astro`.
- **Brand:** the string "icanspeak Spanish" is **replaced across the whole app in this item**, not only in layouts: `en.json`, `Layout.astro`, `src/lib/**` (`seo/jsonld.ts`, `klassenDashboard.js`, `unterricht/lernseite.js`, `pruefungsplan.js` calendar `PRODID`, `widerrufsbelehrung.js`, `mascots.js` …), `src/integrations/llms-txt.mjs`, `src/pages/**` titles, scripts. Later items then only handle content. Grep for "icanspeak Spanish" and "icanspeak ES" must come back empty.
- `/french` and the deployment facts are not touched in the root `DEPLOY.md` (outside this app; it already lists `/french*`).

### 10.2 `variety-schema`

§1.4 helpers, §1.5 shape, §1.6 rule 1–2. `src/lib/variety.js`, `scripts/check-variety.mjs`, validators; callers in `conjugation.astro`, `conjugationTrainer.js`, `pronunciation.astro`, `verbtabellen.js`, `berufeCore.js`, `redemittelWortschatz.js`, `nussnacht/bosse.js`, `business-spanish/[unit]/index.astro`.

### 10.3 `ui-components`, `ui-pages-a-l`, `ui-pages-m-z`

Page titles, descriptions, leftover text (DELE, SIELE, CCSE, Spain, Castilian, Extranjería, Spanish strings) in `src/layouts`, `src/components`, `src/pages`. New strings into `en.json` with `data-i18n`. Data content is not theirs. Pages name the target exams, and hrefs stay on old slots until `routes`. Also the *lang* side: `lang="es"` → `lang="fr"` in their files, with `check-i18n-luecken.mjs` per §1.6 rule 9. The live-date `home3.pricing.live` is flagged to Edgar, not invented. `ui-components` also owns the visible text in `src/lib/ruleColumn.js` and `vorschau.js`; `ui-pages-m-z` owns `preise.js` and `widerrufsbelehrung.js` (language and brand only).

**Who owns which strings in `en.json`.** At the start of this queue, 456 of its 6,306 values name Spanish-course terms. The key prefix decides the owner, so two items don't both rewrite a block:

| Prefix | Item |
|---|---|
| `goethe`, `sd1`, `format`, `pruefungen`, `exam` | `exams-delf-dalf` |
| `delesiele`, `telc`, `telcSb`, `testdaf`, `tdf` | `exams-tcf-tef` |
| `lid` | `civic-exam` |
| `nat`, `dtz`, `dtzSet` | `nationality-path` |
| `grammatik` | each `grammar-<level>` |
| `vt` | `conjugation-data` |
| `ws.set` | each `vocab-*` |
| `wortfallen` | `idioms-mistakes` |
| `kultur`, `wissen` (culture blocks) | `culture` |
| `dialekte`, `sprachen` | `accents-languages` |
| `dgt` | `code-route-vocab` |
| `biz` | `business-french` |
| `berufe` | `french-for-work` |
| `ld` | `games-dialogue` |
| Everything else (`home`, `home3`, `nav`, `konto`, `kontoDel`, `loeschen`, `preise`, `fortschritt`, `auth`, `kl`, `uf`, `kt`, `lq`, `qb`, `sp` …) | The `ui-*` item that owns the page using it |

### 10.4 UI languages

| Item | What |
|---|---|
| `ui-lang-de` | `public/i18n/de.json` updated from `en.json` (it holds Spanish-course strings); `grammatik-start/de.json`; entry pages. `de` on `ui`, `cards` with `fetch: true`. |
| `ui-lang-es` | **New** `es`: registry entry (`draft`, urlPrefix `es`, hreflang `es`, `og:locale` `es_ES`), `public/i18n/es.json`, block in `entry-pages.json`, `lang:coverage`. **Removes `fr`**: §7. `CORE` in `languagePicker.js` becomes `en, de, es, pt, it`. Spanish of Spain, *tú* or *usted* chosen and stated. |
| `ui-lang-pt` | **Brazilian** (Spanish course's choice): code `pt`, hreflang `pt-BR`, `og:locale` `pt_BR`. `i18n/pt` sidecars Brazilian. Update as `ui-lang-de`. |
| `ui-lang-it` | Same. Informal *tu* as in the Spanish course. |

Language-close warning: for `es`, `pt`, `it` run a check for the French-looking cognate traps (a French word turned into a look-alike, as the Italian run found). Keep names of French institutions in French.

Registry rule: a surface is named only where text in that language exists. `fetch: true` keeps a language out of inline surfaces. Base key `de` on a question still means the French being learnt (`o.de ?? o[lang]`). Before registering `es`, grep for old `es` keys and blocks (the Spanish course's `es` fields, `uebersetzungen/*`, `entry-pages.json`): registering the language switches on whatever is already there.

### 10.5 `routes`, `cleanup`, `deploy-readme`

§8; §7, validators back in the gate, `pnpm check:base` and `pnpm check:variety` clean; README and `ARCHITECTURE.md` with Cloudflare Worker details per `DEPLOY.md`, file count against the 20,000-file limit. Hub flip in `apps/hub/src/data/courses.ts` is the one permitted file outside `apps/french`.

### 10.6 Spanish logic in code and validators

A content swap doesn't reach these. The item that owns the module changes them. A final grep in `cleanup` must return only deliberate hits (the `es` UI language, comparisons):

```
es-ES|lang="es"|¿|¡|Europe/Madrid|palabras|el/la|vosotros|los/las|DELE|SIELE|CCSE|Spanish|Castil|Extranjer|español|LATAM_MODE|es419
```

At `87df0a7e` that pattern hits 115 files in `src/lib`, 37 in `scripts`, 1 in `src/integrations`, 38 in `src/components`, 1 in `src/layouts` and 132 in `src/pages` (the last three belong to the `ui-*` items). Every `src/lib`, `scripts` and `src/integrations` file with a hit either falls under a row below or names its item in §10.1 or §10.3. Many hits are comments; those are fixed by the owning item only if it's touching the file, and `cleanup` handles the rest.

| Code | Spanish logic | Item |
|---|---|---|
| `answerMatch.js`, `audioSlug.js` | Accents, ñ | `grammar-a1`, `vocab-a1` |
| `practiceWorkspace.js`, `grammarWorkspace.js` (`SUBORD`, `PRON`), `.ak-accent-keys` | Key row, conjunctions | `grammar-a1` |
| `aktivMode.js`, `spielKit.js`, `artikelSprint/speak.js`, `einfach-sprechen.js`, `redewendungenAudio.js` | `es-ES` voice | Module's item; `pronunciation` for `aktivMode`, `games-dialogue` for `spielKit` |
| `exam/pruefungEngine.js` | `CONTENT_LANG` | `exams-delf-dalf` |
| `dtzTrainer.js` | Texts, `lang` | `nationality-path` |
| `verbtabellenCore.js`, `verbtabellen.js`, `arbeitsblatt/nachschlagen.js`, `liveQuiz/chapters.js` `verbGroups` | Endings, person list | `conjugation-data` |
| `conjugationTrainer.js`, `conjugationTyped.js`, `check-conjugation-trainer.mjs` | `-se`, pronoun hints | `conjugation-trainer` |
| `generoDrill.js`, `artikelPacks.js`, `artikelSprint/*`, `artikelDiktat.js`, `wortschatz-app.js` (incl. `SEPARABLE` if present) | el/la, los/las | `games` (`wortschatz-app.js`: `vocab-a1`) |
| `nussnacht/*`, `hoerSafari/*` | Same; `COMPOUNDS` | `games-arcade` |
| `einfach-*` | Article options, plural | `beginner-path-ui` |
| `satzmelodieData.js`, `satzmelodie.js`, `melodieLabyrinth.js`, `ausspracheCheck*.js`, `ausspracheFuerDich.js`, `ausspracheTipps.js` | `¿`, question words, sound ids | `pronunciation` |
| `schreibKorrektur.js`, `fertigkeiten.js` | LT language, levels, `wordRange()` | `reading-writing` |
| `satzregen/*`, `build-satzregen.mjs` | `{free}` rules, `¿` | `games` |
| `redewendungenData.js`, `redewendungenUebung.js`, `check-redewendungen.mjs` | Stop words | `idioms-mistakes` |
| `klassentest/*`, `partneruebungen/*`, `unterricht/einstieg.js`, `liveQuiz/builder.js`, `arbeitsblatt/*`, `check-arbeitsblatt.mjs`, `generate-*-pdf.mjs` | `GRAMMAR_WORD`, `¿`, tile rules | `teachers` |
| `knigge/*`, `lindenau/*`, `check-knigge.mjs`, `check-lindenau.mjs` | Gender patterns | `games-dialogue` |
| `buergeramt/*`, `check-extranjeria.mjs` | Rules | `prefecture-sim` |
| `wortgeschichteCore.js`, `validate-wortgeschichte.mjs` | `entryLang`, `PROSE_LANG` | `word-stories` |
| `check-sprachfallen.mjs`, `check-aussprache.mjs`, `check-satzmelodie.mjs`, `check-grammatik-start.mjs` | Spanish rules | Module's item |
| `check-links.mjs` `KNOWN`, `build-suche-seiten.mjs`, `seo-audit.mjs`, `searchIndex.js` | Slugs, keywords | `routes` |
| `aufgabenKatalog.js`, `pruefungsplan.js`, `exam/renderHelpers.js` | Exam names, `contentLang` | `exams-delf-dalf` |
| `exampleGap.js`, `berufeRows.js`, `attach-ranks.mjs`, `generate-wortschatz-pdf.mjs` | Card gap for Spanish verb forms and pronouns; level lists; ranks; print | `vocab-a1` |
| `drillAudio.js`, `ausspracheCheckFuerDich.js` | Accent in audio names; sound ids | `pronunciation` |
| `artikelHerkunft.js`, `artikelSprint/renderer.js`, `hochstapler/host.js` | Article origin, `lang="es"`, voice | `games` |
| `kulturKeywords.js`, `kulturMarks.js` | Search words per culture id; *tú/usted* marks become *tu/vous* | `culture` |
| `businessSpanishData.js` | Phrase key, texts | `business-french` |
| `generate-berufe-pdf.mjs` | Print | `french-for-work` |
| `generate-dialekte-karte.mjs`, `generate-sprachen-karte.mjs` | Map data | `accents-languages` |
| `generate-grammatik-pdf.mjs` | Print | `grammar-structure` |
| `klassenDashboard.js`, `klassentest/*` (`ergebnis`, `lehrkraft`, `schueler`), `partneruebungen/tandem.js`, `unterricht/lernseite.js`, `generate-partner-pdf.mjs` | Texts, `lang` | `teachers` |
| `check-i18n-luecken.mjs` | Deliberate-Spanish rule | `ui-components` (§1.6 rule 9) |
| `seo/jsonld.ts`, `mascots.js`, `integrations/llms-txt.mjs` | Brand | `base-path-and-brand` (§10.1) |

---

## 11. Queue item → files

| Item | Files it owns |
|---|---|
| `content-plan` | `docs/content-plan.md` |
| `base-path-and-brand` | §10.1; `public/logos/*`, manifest, `Wordmark.astro`, `Layout.astro` |
| `variety-schema` | §10.2 |
| `ui-components` | `src/layouts/**`, `src/components/**`, `en.json` |
| `ui-pages-a-l` | `src/pages/[a-l]*`, `en.json` |
| `ui-pages-m-z` | `src/pages/[m-z]*`, legal pages (language and brand only), `uebersetzungen/rechtliches.json`, `en.json` |
| `placement-test` | `einstufung.json`, `check-variety.mjs` |
| `grammar-a1` | The A1 slots of §3 in `grammatik/`, their `grammatik.json` entries and `grammatik.<slot>.*` in `en.json`, `einfach-pfad.json` refs; once: `answerMatch.js`, `practiceWorkspace.js`, `grammarWorkspace.js`, new `scripts/repoint-einfach-grammar.mjs` |
| `grammar-a2` | The same for A2; `akkusativ.json` and `object-pronouns.astro` text |
| `grammar-b1` | The same for B1 |
| `grammar-b2` | The same for B2 |
| `grammar-c1` | The same for C1; `paid/grammatik/*` |
| `grammar-structure` | §3.1, comparison pause in `check-verbtabellen.mjs` |
| `grammar-start-book` | `grammatik-start/*`, its generator and checker, committed PDF |
| `conjugation-data` | `verbtabellen.json`, `verbtabellenCore.js`, `verbtabellen.js`, `grammar/verbs.astro`, `arbeitsblatt/verbtabellen.json`, `check-verbtabellen.mjs` |
| `conjugation-trainer` | `conjugation-trainer.json`, `conjugationTrainer.js`, `conjugationTyped.js`, `grammar/conjugation.astro`, `check-conjugation-trainer.mjs`, `prepositions.astro` link, `en.json` |
| `beginner-path` | `einfach-pfad.json`; deletes the repoint script |
| `beginner-path-ui` | `einfach-view.js`, `einfach-app.js`, `einfach-content.js`, `einfach-fixtures.js`, `step-by-step.astro` (noscript), `docs/easy-mode-tier1-v1.md` |
| `vocab-a1` | `lexicon/a1.json`, `lexicon/i18n/*`, `bildkarten.json`, `wort-bilder.json`, `wortschatz-szenen.json`, `program.json` titles, `wortschatz.json`, `haeufigste-woerter.json` + scripts, `lexicon.js`, `audioSlug.js`, `validate-lexicon.mjs`, `lexicon-import.mjs`, `berufeCore.js` (ref warnings), `wortschatz-app.js` |
| `vocab-a2` | `lexicon/a2.json`, its i18n entries, pictures and scenes, `program.json` titles, `ws.set.*` |
| `vocab-b1` | The same for B1 |
| `vocab-b2` | The same for B2 |
| `vocab-c1-c2` | `c1.json`, `c2.json`, i18n; drops `el/la` from `validate-lexicon.mjs` |
| `listening` | `hoeren.json`, `uebersetzungen/hoeren.json` |
| `reading-writing` | `lesen.json`, `fertigkeiten/lesen.json`, `fertigkeiten/schreiben.json`, `uebersetzungen/lesen.json`, `schreiben.json`, `schreibKorrektur.js`, `fertigkeiten.js` |
| `speaking` | `sprechen.json`, `sprechen-b1b2.json`, `redemittel.json`, `redemittel-i18n/*`, `fertigkeiten/sprechen.json`, `uebersetzungen/sprechen.json`, `speaking/[id].astro` exam lines |
| `pronunciation` | §5.6 |
| `idioms-mistakes` | `redewendungen.json`, `umgangssprache.json`, `typische-fehler.json`, `fehler-nach-sprache.json` (other areas), `wortfallen.json`, `synonyme.json`, `wortarten.json` `fehler`, `langMark.js`, `check-sprachfallen.mjs`, `check-redewendungen.mjs`, `en.json` keys |
| `exams-delf-dalf` | `start-deutsch-1/*`, `saetze/goethe-*`, `paid/.../goethe-c1-1.json`, `goethe-formate.json`, `fallen.json`, research file, `exam/names.js`, `pruefungEngine.js`, `registry.js` texts, `saetze-index.json`, `PruefungSatz.astro` |
| `exams-tcf-tef` | `testdaf/*`, `testdaf-formate.json`, `saetze/telc-*`, `paid/.../telc-c1-1.json`, `telc-formate.json`, `sprachbausteine/*`, research file, `registry.js` texts, `exams/dele-or-siele.astro` content |
| `civic-exam` | `leben-in-deutschland.json`, `uebersetzungen/leben-in-deutschland.json`, `ccse/*` page texts, `lid.*` keys, `registry.js` |
| `nationality-path` | `dtz/*`, `paid/pruefungen/dtz/*`, `dtzTrainer.js`, `nationality.astro`, `nationality/dele-a2/*` texts, `dtz.*`, `nat.*` keys, `registry.js` |
| `prefecture-sim` | `buergeramt/kunden.json`, `lib/buergeramt/*`, `check-extranjeria.mjs`, `games/extranjeria.astro` text |
| `code-route-vocab` | `dgt/vocabulario.json`, `dgt-vocabulary*` page texts, `check-berufe.mjs` ref errors |
| `culture` | `kultur.json`, `uebersetzungen/kultur.json`, `kultur-insider.json`, `kultur-bilder.json`, `kultur-filme.json`, `wusstest-du.json`, `kalender-saetze.json`, `zitate.json`, `uebersetzungen/zitate.json`, `culture/index.astro`, `ITEM_SLUGS["/culture"]` |
| `accents-languages` | `dialekte.json`, `dialekte-karte.json`, `sprachen-welt.json`, `sprachen-karte.json`, generators, `accents.astro`, `languages.astro`, `dialekte.*`, `sprachen.*` keys |
| `games` | `artikel-sprint/*`, `artikel*.json`, `quakiSpringt/*`, `hochstapler/*`, `satzregen/*`, `generoDrill.js`, `artikelSprint/*`, `artikelPacks.js`, `artikelDiktat.js`, `spiele/domino.js`, `/articles` page |
| `games-arcade` | `lib/nussnacht/*`, `lib/hoerSafari/*` |
| `games-dialogue` | `lib/knigge/*`, `lib/lindenau/*`, `uebersetzungen/lindenau.json`, `spielKit.js`, `check-knigge.mjs`, `check-lindenau.mjs` |
| `teachers` | §5.10 |
| `word-stories` | `content/wortgeschichte/*`, `wortgeschichteCore.js` |
| `french-for-work` | `berufe/*`, `berufeCore.js`, `ITEM_SLUGS["/spanish-for-work"]` sector slugs |
| `business-french` | `business-spanish/*`, `businessSpanish.js`, `business-spanish/**` page texts, `check-business-spanish.mjs`, `biz.*` keys |
| `routes` | `routes.js`, `astro.config.mjs`, page folders, `suche-seiten.json`, `entry-pages.json`, `catalog.js`, links |
| `cleanup` | §7, §10.6 grep, validators in the gate, `check:base`, `check:variety` |
| `ui-lang-de` | §10.4: `languages.js`, `public/i18n/de.json`, `docs/lang-coverage.json`, `entry-pages.json`, entry pages, `grammatik-start/de.json` |
| `ui-lang-es` | §10.4: the same for `es`; removes `public/i18n/fr.json`, the `fr` registry entry, entry-page block and pages, the other `fr` rows of §7 |
| `ui-lang-pt` | §10.4: the same for `pt` |
| `ui-lang-it` | §10.4: the same for `it` |
| `deploy-readme` | `README.md`, `ARCHITECTURE.md`; `apps/hub/src/data/courses.ts` |

---

## 12. Quality rules for every content run

1. Correct, natural **standard French of France**; every example is something a speaker in France would say. English explanations clear and short.
2. Level discipline: vocabulary at or below the topic's CEFR level, except the target structure.
3. Each grammar topic: one clear rule, the forms, 4–8 examples, the 2–3 most common mistakes, exercises with unambiguous answers or listed alternatives. Accepted alternatives include the 1990 spelling and, where both are right, *on / nous*, inversion / *est-ce que*.
4. Distractors are wrong for a reason a learner can understand. A form that is also right is never a wrong pill.
5. **Elision and agreement** are checked by script where possible and by eye always: *de + voyelle, si + il, que + il; le → l'; h aspiré; participle agreement in every generated or written compound; NBSP in rendered text.*
6. **Register is labelled.** Spoken forms (*j'sais pas, t'as*) never appear as the taught form below the spoken-French module.
7. Facts carry a source and an "as of" date; when unsure, leave out or word carefully, and list "to verify" in the report.
8. Fewer, correct items beat many. No mixed Spanish/French items; no Spanish leftovers in a touched module.
9. Build: `timeout 1500 pnpm --dir apps/french build 2>&1 | tail -40`, foreground; then `timeout 600 pnpm --dir apps/french check:base`.

---

## 13. Open points

- **Edgar: review** the exam map (§2): TEF in the `testdaf` slot, TCF by band in `telc`, DALF C2 without a set, "Language in use" under `/tef`.
- **Edgar: review** `elektro-technik` → private security (§5.12), instead of agriculture.
- **Edgar: review** two trainer choices: passé simple recognition only, and imparfait du subjonctif not drilled.
- **Town and place names** (§1.1): Montbruno, Valdaure, Montaubel are unchecked against INSEE's list.
- **Canada mode:** data carries `frCA`; showing it is a later item. All TCF/TEF Canada content is framed for learners in the France standard, and the page says that Canadian accents appear in those tests ("to verify").
- **Audio:** every `audio` field points to files that don't exist until a fr-FR voice is wired.
- **Frequency ranks:** `fr_50k` licence and download.
- **Internal Spanish names** (`dgt/`, `business-spanish/`, `check-extranjeria.mjs`, `businessSpanish.js`): kept by §1.3; a rename pass is cheap after `cleanup` if wanted.
- **Arabic UI:** later. `fehler-nach-sprache.json` `arabisch` may come before it, because many learners in France speak it.
- **Inherited from the Spanish course, unresolved, for Edgar:** contact address `hello@englishacademy.com` in `src/lib/legal.js` (legal fact, unchanged); merch links landing on `/account`; `/privacy` and `/terms` describing the LanguageTool check as active; binding language of legal texts; `/about` describing German teaching; `/design-system` German sample text; `public/.well-known/tdmrep.json` missing; scope of AI-crawler `Disallow` for the umbrella `robots.txt`; `home3.pricing.live` date in the past; 15 grammar topics `entwurf` keep `/grammar/path` patchy until reviewed.
- **Gaps** (§3): imparfait du subjonctif, verb prefixes, *ne* explétif.
- **Civic mock weighting** (§2.2): `meta.tareas[].realCount` per theme is unverified, and the mock draws by it.
- **Nobody has checked the French in this plan.** Examples were written by the plan's author, unreviewed by a native speaker. Runs treat them as starting points.
- **Not checked for this plan:** see §14.
- **Decisions by `variety-schema`** (binding for later items):
  - The article helpers live in **`src/lib/articles.js`** (no imports, so client scripts and validators can use them without the lexicon bundle); `src/lib/lexicon.js` re-exports `withArticle`, `genderOf`, `indefinite`, `pluralArticle`. `genderProblems()` there is the one set of gender/genus/hAspire rules, used by `validate-lexicon.mjs` and `berufeCore.js`.
  - **Legacy vs French is decided by `variety`:** an entry with gender `el`/`el/la` or `variety` `es-ES`/`es-419` follows the Spanish rules; everything else the French ones. So **a converted entry must carry `variety: "fr-FR"` (or none), never keep `es-ES`**: a French `la` noun still marked `es-ES` would get `las` as plural article. The validators report `gender le on an entry still marked es-ES`.
  - `withArticle` takes `lemma`, else `front` (cards), else `word`; for `les` it uses `plural` when `pluralOnly`. `spokenForm` says `le` for `le/la` nouns, as the Spanish one said `el`.
  - Lexicon `aux` accepts `avoir`, `être`, `both` (and the old `haben`/`sein`); `mascVowel` (adjectives only) and `rectified` (≠ lemma) are shape-checked.
  - `regional` is shape-checked everywhere (non-empty, ≤ 160). An item may carry `frCA` or `es419`, not both; `frCA` on an item still marked `es-ES` is an error.
  - `check-variety.mjs --legacy` lists the files that still hold es-ES/es419; the summary prints one WARN line with the count.
  - Satzregen source (`quelle.txt`) takes a `{frCA …}` flag; `{es419 …}` stays legal for the Spanish lines until the file is French.
  - **Left for their owners** (they compose `${gender} ${lemma}` or carry Spanish article logic): `ArtikelTrainer.astro`, `artikelDiktat.js`, `generoDrill.js` (own `pluralArticle`), `spiele/domino.js`, `nussnacht/*`, `vokabelFoto/*` (`stripArticle`), `einfach-content.js` (`pluralWithArticle`, `ARTICLE_HINT`), `scripts/lexicon-import.mjs` (writes `es419` from `lat`). Each should switch to `articles.js` when its item runs (`games`, `games-arcade`, `beginner-path`, `vocab-a1`). CSS classes `pr-art--<gender>` in the print sheet need `le`/`la`/`l'`/`les` styles (`ui-components`: done, see below).
- **Decisions by `ui-components`** (binding for later items):
  - **Exam names in the chrome** (rail, level fold, topic rail, grammar "for the exam" links, progress shell, nav, homepage mocks): `goethe` = "DELF / DALF" (A1 = "DELF A1", C1 = "DALF C1"), `telc` = "TCF" / "TCF practice, <band> band", `testdaf` = "TEF" / "TEF practice set", `dtz` = "TCF IRN practice mock" (level A2–B1), `lid` = "Civic exam" (`exam.lid.name`, also used by the rail). Hrefs stay on the old slots until `routes`. The exam items may refine wording but should keep these short names consistent.
  - The disclaimer (`exam.disclaimer`) names France Éducation international, CCI Paris Île-de-France, the French State and IRCC, per §1.1.
  - Keys outside the `ui-*` prefixes were changed where a component shows them and the change is only a name: `exam.disclaimer`, `exam.lid.name`, `exam.tool.*.desc`, `berufe.xlink`, `biz.back`, `dgt.back`, `tool.berufe.*`. Their owners (§10.3) rewrite them freely.
  - `check-i18n-luecken.mjs` needed no code change: any `lang` attribute already covers, so `lang="es"` and `lang="fr"` both count (§1.6 rule 9). Components now say `lang="fr"`; the rest is for `ui-pages-*`, and `cleanup` greps for `lang="es"`.
  - Print sheet (`WortschatzDruck.astro`): the article's class is the gender from `genderOf()` (`pr-art--m`, `--f`, `--mf`, `--pl`), not the article, so `l'` and `les` nouns get a colour too (`src/styles/drucken.css`).
  - `LidGrafik.astro` (civic-exam infographics) now shows France: Constitution of 1958 and the three powers, the qualities of the vote, constitutional values, 13 + 5 regions and 101 départements, a 1789–1958 timeline, 112/15/17/18, school 3–16, 14 July. `civic-exam` should check them against its topic texts.
  - `LanguageOffer.astro` has an `es` row for the coming Spanish UI; its `fr` row goes with `ui-lang-es`.
  - **Left for their owners:** the Spanish article logic inside `ArtikelTrainer.astro` (options `el`/`la`, the `ap.ex.*` exception texts) → `games`; `sprint.*` keys → `games`; `home.footer.*`, `home3.*` (homepage) → `ui-pages-a-l`; `konto.*` (except `konto.wort.desc`), `preise.*`, `meinZugang.*`, `widerrufen.*` → the `ui-pages-*` item that owns the page; `nav.kultur.*`/`sprachen.*` comment lines in `catalog.js` → `culture`/`accents-languages`. `pronunciation.astro` still uses `pr-art--el/la` (`aussprache.css`) → `pronunciation`.
- **Decisions by `ui-pages-a-l`** (binding for later items):
  - **Pages owned by a content item** (§11: `ccse/*`, `business-spanish/**`, `dgt-vocabulary*`, `culture/**`, `dele*`, `exams/dele-or-siele`, `games/extranjeria`, `grammar/verbs`, `grammar/conjugation`, `knowledge/accents`, `knowledge/languages`): only the `<Layout>` title and description, `fitTitle`/breadcrumb/share titles and pure name swaps changed. Body text and keys under the owner's prefix are left to the owner. Name-only swaps outside the `ui-*` prefixes, in the same spirit as `ui-components` decision 2: `sd1.*` (DELE A1 → DELF A1), `telcSb.back`, `biz.title`/`biz.eyebrow`, `dgt.title`/`dgt.entry.blurb`, `nat.entry.*`, `delesiele.title`/`delesiele.entry.*` ("DELF, TCF or TEF?"), `ld.*` (Villabruno → Montbruno), `lid.fk.level.standard` ("En français").
  - **The exams hub (`exams/index.astro`) is page-owned**, so its `pruefungen.card.*`, `pruefungen.compare.*`, `pruefungen.hero.subtitle` and `pruefungen.levelNote` values were rewritten for the French slots (TCF by level, DELF / DALF, TEF, TCF IRN practice mock A2–B1, Civic exam). The TEF card and comparison show **A1–C2** (TEF results are matched to the whole CEFR scale; "to verify"). The exam items may refine them.
  - Level rows on the hub: the `telc` A2 set is listed as "TCF practice, A1–A2 band" at A1 and A2; C1 is "DALF C1"; C2 is "DALF C2 (format only)".
  - `exam-plan.astro` names the `goethe` slot DELF below C1 and DALF from C1 (local `examName()`; `exams-delf-dalf` may swap it for `examLabel`), and its "today" uses **Europe/Paris**.
  - `lang="es"` → `lang="fr"` across `src/pages/[id]` and `a–l` (124 places, also `localeCompare(…, "fr")`). The RTL isolation selectors in `fallen.css`, `fuehrerschein.css`, `wortgeschichte.css` now match `[lang="fr"]` and `[lang="es"]`; `cleanup` drops the `es` half.
  - **Voice texts left as they are**: `ak.proto` and `hs.noVoice`/`hs.about.voice` still say "Spanish voice", because the code still asks for `es-ES` (§10.6). Whoever switches the voice (`grammar-a1` for the workspace, `games-arcade` for `hoerSafari`) changes the text in the same commit.
  - Left for their owners in pages a–l: `satzmelodie.*` and the `¿ ¡` marks in `intonation.astro` → `pronunciation`; `hoeren.*.blurb` → `listening`; `grammatik.cj.sub`, `conj.withVosotros` → `conjugation-trainer`; `hs.about.p` and the el/la buttons in `games/nut-night.astro` → `games-arcade`; the `goethe.*` body of `dele.astro` → `exams-delf-dalf`; `rechtliches.json` lines 811 and 979 (terms page) → `ui-pages-m-z` (line 204, the legal notice, was changed here).
- **Decisions by `ui-pages-m-z`** (binding for later items):
  - Same owner split as `ui-pages-a-l`: on `nationality*`, `siele/**`, `spanish-for-work/**` only the `<Layout>` title, description and breadcrumb changed, plus pure name swaps: `ExamApp brand` and the "TEF —" heading on `siele/practice-set`, `exam.backToTestdaf`, `tdf.toPage`, `exam.backToDtz`, `dtzMock.exam`, `dtzSet.heroExam`, `telc.title` ("TCF by level"), `berufe.hero.title/lead`, `berufe.deck.tipps`, `sprechen.exam.*`, `sprechenB1B2.note` (DELF, TCF and TEF; not affiliated with France Éducation international or CCI Paris Île-de-France). All other body text and `dtz.*`, `dtzSet.*`, `nat.*`, `testdaf.*`, `tdf.*`, `telc.*` keys stay with `nationality-path`, `exams-tcf-tef` and `french-for-work`.
  - The `sprechen.exam.*` lookup map in `speaking/[id].astro` is keyed by the English strings in `sprechen.json`, so its keys still say "DELE and SIELE": `speaking` changes the data strings and the map keys together.
  - **The paid pack is named "TCF IRN pack"** in `preise.*`, `meinZugang.*`, `widerrufen.vertragPh` and `preise.js` (the `dtz` paid set becomes the TCF IRN mock, §2). `produkte.json` `name` still says "DELE A2 mock pack" in five languages: left for `cleanup` (§9), not rendered while payments are off.
  - Class due dates are computed in Europe/Berlin (`aufgabenStatus.js`), which has the same offset as Paris, so `kl.a.form.dueHint` says "Paris time" without a code change. Renaming the `TZ` constant to Europe/Paris is a cosmetic job for `teachers`.
  - Vocabulary worksheet part B asks "le, la or l'?" (answers come from lexicon `gender`), and the domino, photo-card and print labels say "le / la". Until the vocab items convert the lexicon, the answers there are still el/la.
  - `prepositions.astro`: description and the inline overview table ("Which preposition when?") are in French now. `praep.*` keys (pack names, `praep.wechsel.lead`, `praep.rule.note`, `praep.more.*`) and the `MORE` links stay with `grammar-structure`, which converts `praepositionen-trainer.json`, so they keep matching the packs.
  - `konto.teacher.title`, `konto.ms.desc` and `konto.lang.desc` (account page, left by `ui-pages-a-l`) now say French.
  - `lang="es"` → `lang="fr"` across pages m–z (owned pages included). Greetings in the target language use NBSP before `!` (*Salut !*, *Bingo !*).
  - Left for their owners in pages m–z: the body of `object-pronouns.astro` (Spanish table, `akk.regel.example`) → `grammar-a2`; `pronunciation*.astro`, `tongue-twisters` data, `ac.find.*` → `pronunciation`; `step-by-step` app → `beginner-path-ui`; `vp.hero.subtitle`, `verben.lead` → `conjugation-data`/`grammar-structure`; `mhelp.kultur.what`, `mhelp.wortgeschichte.what` (`mascotHelp.js`) → `culture`, `word-stories`; `intro.fkEasy*` → `civic-exam`; `sprint.*`, `hs.*` → `games`, `games-arcade`.
- **Decisions by `placement-test`** (binding for later items):
  - `einstufung` is in `STRICT` (`check-variety.mjs`); `variety: "fr-FR"` sits only at the top level, items inherit. frCA notes on two items (A1 carte Vitale → carte d'assurance maladie, B2 préfecture → IRCC). The variety summary counts frCA only on top-level items, so it prints "0 frCA notes" for this module.
  - Items are three-option gaps with the written standard as the only right answer: no option a native speaker could also accept (no *sonnait* next to *a sonné*, no plus-que-parfait next to the passé composé, no *aura fait* for the journalistic conditional), and spoken forms (dropped *ne*, unagreed participle, *C'est à … à qui*) are distractors.
  - Prompts carry NBSP before `? ! : ;` (§1.2); options and answers never do. `placement-test.astro` marks the quiz prompt and options `lang="fr"`.
  - Left for `beginner-path-ui`: the quick check on `/step-by-step` renders these A1 items with `lang="es"` (`einfach-view.js` lines 370, 374), and the comment on `einfach-app.js` lines 165–167 still lists the Spanish A1 features (ser, estar, hay, gustar); the A1 set now tests être/avoir, the -er present, le/la, ne…pas, est-ce que and adjective agreement.
- **Decisions by `grammar-a1`** (binding for later items):
  - **`status` kept as the slot had it** (geprueft, entwurf or none), against §1.4's "new content enters as entwurf": `topicStatus.js` hides every draft from the catalogue, menus, guided run, search and PDFs, so marking all 20 drafts would empty A1 on the site. The content is unreviewed all the same; the report lists all 20 for Edgar. Later grammar items should do the same and say so.
  - **Links in topic html use today's slugs** (`/stem-changing-verbs` for *être/avoir*, `/ser-estar-basics` for *-ir/-re*, `/gustar` for *aimer* …), because `check-links` only knows those; `routes` rewrites them with `TOPIC_SLUGS`.
  - **Elision in gaps:** a gap never sits glued to the next word. An answer that elides holds the whole unit (`l'école` vs `la école`, `J'ai` vs `Je ai`, `n'habite`, `Est-ce qu'elle`, `parce qu'il est`), or the item is a table row (`école` → `le / la / l'`).
  - **Every fill item has 2–3 choices**, so any item can serve the beginner path; each A1 topic has ≥ 10 such items and ≥ 3 build sentences.
  - **Answer check** (`answerMatch.js`): case forgiven, accents not; ’ → ', NBSP → space, oe/ae accepted for œ/æ; `accentOnly` covers grave, acute, circumflex, diaeresis, cedilla (not the tilde, so the remaining Spanish data keeps ñ as a letter). The German umlaut folding and the Sie/ihr rule are gone.
  - **Clause swap in build tiles** (`grammarWorkspace.js`): `SUBORD` = *quand, lorsque, si, puisque*; a fronted clause (*Quand il pleut, je reste…*) may move to the end without the comma, and a trailing *quand/lorsque/puisque* clause may move to the front with one; trailing *si* never moves (it is often "whether"). *parce que* and *comme* never swap. Hints with "first", "start", "begin" switch it off.
  - `practiceWorkspace.js` speaks **fr-FR** (used by object pronouns, prepositions, conjugation, business units and the article trainer, whose data is still Spanish until `grammar-a2`, `grammar-structure`, `games` …). Article colours: `le`/`un` and `la`/`une`; `l'`/`les` stay plain.
  - The write-mode key row in `aktivMode.js` is French (*é è ê ë à â ù û î ï ô ç œ*), label `ak.write.keys` = "Accented letters" (neutral, because `conjugationTyped.js` shares the key and still shows the Spanish row → `conjugation-trainer`).
  - **Left for others:** the `aktivMode.js` voice is still es-ES and `ak.proto` still says "Spanish voice" → `pronunciation` (§10.6), so the A1 topics' listen/hear/speak beats read French with a Spanish voice until then. Unit titles, claims, `grammar` labels and Spanish postcards of the A1 units in `einfach-pfad.json` no longer match the repointed tasks (*a1-who-where* now drills *-ir/-re* verbs, *a1-cafe* *être/avoir*) → `beginner-path`. `ARTICLE_PLACEHOLDERS` and `articleHint` in `einfach-content.js` still know only el/la → `beginner-path-ui`. `src/data/wortarten.json` (the parts-of-speech reference behind `lookup.chips`) is still Spanish → `grammar-structure`.
- **Decisions by `grammar-a2`** (binding for later items):
  - Same rules as `grammar-a1`: `status` kept as the slot had it (`geprueft` on zusammengesetzte-verben, komposita, reflexive-verben, komparativ-superlativ, lokale-praepositionen, nebensaetze-weil-dass, positionsadverbien, adjektivdeklination-a2, artikel-oder-nicht, ordinalzahlen; `entwurf` on trennbare-verben, dativ, indefinitpronomen, konjunktiv2-hoeflich; none on the rest), links on today's slugs, whole elided units in gaps, ≥ 10 path-ready items and ≥ 3 builds per topic. `imperativ` and `negationswoerter` now say `level: "A2"`; their order in `GRAMMATIK_ORDER` and the lehrplan is still the old one → `grammar-structure`.
  - **Story exercises may keep an exercise-level `choices` bank** (as the Spanish files had); a blank with two right answers holds both in an `answer` array and only one of them is in the bank. Where two answers are right (*donc/alors*, *parce que/car*, *deuxième/second*, *je voudrais/j'aimerais*, *vingt et unième/vingt-et-unième*), the answer is an array and the second form is never a wrong pill.
  - **Participle agreement with a preceding COD** is taught at A2 only in recognition plus two items (`akk-s1` *je l'ai vue*, `akk-s2` *les ai … lues*); the unagreed spoken form is the distractor (§1.6 written standard).
  - `akkusativ.json` keeps its 15 ids and three difficulties; the beginner-path `akk:` tasks keep their refs and got new hints. Ids `akk-*` are the only stable item ids in grammar data; topic exercises are still referenced by index (`gram:<slot>/<ex>/<item>@checksum`).
  - The other locales' `akk.regel.intro` / `akk.regel.example` hold the **English** text until `ui-lang-*` translate it (the old value explained the Spanish rule and failed `check-reichweite`'s tag comparison). Later items that rewrite an HTML key in `en.json` must do the same or translate it.
  - Titles: *docteur* with and without article (*Bonjour, docteur. / le docteur Martin*) stays in `artikel-oder-nicht`; *professeur* as a form of address was dropped (in France one says *Monsieur / Madame*).
  - **Left for others:** `check:grammatik-ui` (not in the gate) reports baseline drift for most rewritten A1 and A2 topics (counts of untranslated instruction strings): the baseline belongs to §9 (`grammatik-ui.json` leave) and to `cleanup`, which should run `pnpm check:grammatik-ui --update` once. The A2 units' titles, claims, `grammar` labels and Spanish postcards in `einfach-pfad.json` (*a2-objects* still claims *lo veo*) → `beginner-path`. The B1 unit *b1-kollegen* now points at the A2 imperative topic → `beginner-path` / `grammar-structure`. `grammatik.json` B1/B2 quizzes (praepositionen, passiv, konjunktiv2, relativpronomen) still Spanish → their grammar items.
- **Decisions by `grammar-b1`** (binding for later items):
  - Same rules as `grammar-a1`/`grammar-a2`: `status` kept as the slot had it (`geprueft` on futur, funktionen-von-werden, verben-als-nomen, infinitiv-ohne-zu, finalsaetze, temporale-nebensaetze, temporale-praepositionen-b1, relativpronomen, lassen, konnektoren-grund-gegengrund, genitiv, zustandspassiv, passiv-b1, da-wo-woerter, nutzen-benutzen, positionsverben, wortbildung-nomen, adjektive-als-nomen; `entwurf` on konditionalsaetze; none on the rest), links on today's slugs, whole elided units in gaps, ≥ 10 path-ready items and ≥ 3 builds per topic, answer arrays where two forms are right.
  - `partizip-als-adjektiv` is **not** touched here: §3 lists it under B2 (participle agreement), so `grammar-b2` converts it and sets `level: "B2"`. It is still the Spanish *estar* + participle topic with `level: "B1"`.
  - `verben-praepositionen` keeps `"id": "praepositionen"`, `slug` and `subtitleKey: "vp.hero.subtitle"`; the topic page reads its intro from that key, so `vp.hero.subtitle` in `en.json` now holds the French-course subtitle (it is used nowhere else).
  - **Match exercises must have one pairing only**: beginnings that could take each other's endings (*Il faut que* / *Je veux que* + *tu partes*) get context in the beginning (*Ton titre de séjour expire, il faut que* → *tu le renouvelles*). Several writer drafts had swappable pairs.
  - Time words with two right answers by meaning (*part dans six mois* vs *pour six mois*; *habité … il y a cinq ans* vs *pendant cinq ans*) are kept out of the pill set rather than explained by the hint.
  - At B1 the futur antérieur, *avant que* + subjunctive, *après* + past infinitive and the affirmative-imperative pronoun order (*donne-le-moi*, *vas-y*) are recognition only; the full *si* system is left to `konjunktiv2` (B2), the hypothetical *si* + imparfait appears only as one rule in the conditionnel topic.
  - The ne explétif after *avoir peur que* is mentioned as optional and formal, never required.
  - `grammatik.json`: the B1 quizzes `praepositionen` (verbs + *à / de*) and `relativpronomen` (*qui / que / où / dont*) are French, `variety: "fr-FR"`. Still Spanish: `passiv`, `konjunktiv2` (B2) → `grammar-b2`.
  - **Left for others:** the beginner path now drills the French B1 topics under unchanged Spanish unit texts; in particular the unit that used `passiv-b1` (pluperfect) now drills *celui / celle*, and `zustandspassiv` (perfecto vs indefinido) is now double object pronouns → `beginner-path`. `TOPIC_SLUGS` still says `/perfecto-vs-indefinido`, `/pluperfect`, `/para-que`, `/cuando-subjunctive`, `/si-real`, `/por-para`, `/desde-hace`, `/verbal-periphrases`, `/prepositional-pronouns`, `/ser-estar-advanced`, `/verbs-like-gustar`, `/lo-adjective` for these topics → `routes` (§3 has the new slugs). Worksheets `arbeitsblatt/<id>.json` for the B1 ids are still Spanish → `teachers`. The other locales' `grammatik.<slot>.intro` and `vp.hero.subtitle` hold Spanish-course text → `ui-lang-*`. `check:grammatik-ui` drift as for A1/A2 → `cleanup`.
- **Decisions by `grammar-b2`** (binding for later items):
  - Same rules as the earlier grammar items: `status` kept as the slot had it (`geprueft` on konjunktiv2, relativsaetze-was-wo, modalpartikeln, adjektive-mit-praepositionen; `entwurf` on modalsaetze, zumal-wohingegen, konsekutivsaetze; none on the rest), links on today's slugs, whole elided units in gaps, ≥ 10 path-ready items and ≥ 5 builds per topic, answer arrays where two forms are right. No beginner-path task points at a B2 topic, so nothing was repointed.
  - `partizip-als-adjektiv` is now participle agreement with `level: "B2"`; its place in `GRAMMATIK_ORDER` and the lehrplan is still the B1 one → `grammar-structure`.
  - **Split of the subjunctive and si topics:** `konjunktiv2` holds every *si* pattern (recap of *si* + présent, *si* + imparfait, *si* + plus-que-parfait, mixed); `modalsaetze` (plus-que-parfait) mentions *si seulement* only. `zweiteilige-konnektoren` = mood after opinion, doubt, possibility; `konsekutivsaetze` = *bien que / quoique / même si / malgré / si … que / tellement de / de sorte que / sans que*; `relativsaetze-was-wo` = *lequel* forms and the subjunctive in relatives.
  - **Where speech allows the indicative** (*je ne pense pas que*, *le meilleur … que je connaisse*, *le seul qui puisse*), the subjunctive is taught and the indicative is either listed in the `answer` array or kept out of the pills; the indicative is never a wrong pill there. Gaps that must be unambiguous use triggers that always take the subjunctive (*douter que*, *bien que*, *il est possible que*).
  - *malgré que* is mentioned as spoken only, never drilled. The *ne* explétif after *sans que* is optional and formal (as at B1).
  - `modalpartikeln` teaches the markers as spoken register; *genre* is labelled very informal and appears only for recognition; *du coup* → *donc / par conséquent* in writing. Its `frCA` note (Québec *fait que* / *so* for *du coup*) is the only `frCA` in B2.
  - `grammatik.json`: the B2 quizzes `passiv` (passive, *se parler*, *se faire*) and `konjunktiv2` (*si* clauses) are French, `variety: "fr-FR"`. All four quiz packs are now French; `grammar-c1` (the last grammar item) adds `grammatik` and `grammatik-quiz` to `STRICT` in `check-variety.mjs`.
  - The `TOPIC_SLUGS` entry `negationswoerter: "probability"` sits in the B2 block although the topic is A2 now → `routes`.
  - **Left for others:** `TOPIC_SLUGS` for the B2 ids still say `/imperfect-subjunctive`, `/si-unreal`, `/passive-and-se`, `/aunque-subjunctive`, `/estar-participle`, `/accidental-se`, `/verbs-of-change`, `/relative-clauses-advanced` (§3 has the new slugs) → `routes`. Worksheets `arbeitsblatt/<id>.json` for the B2 ids are Spanish → `teachers`. Other locales' B2 `grammatik.<slot>.intro` hold Spanish-course text → `ui-lang-*`. The topic files were re-serialised by script (one key per line), so their diffs are large; content-wise only the French text changed. `check:grammatik-ui` drift → `cleanup`.
- **Decisions by `grammar-c1`** (binding for later items):
  - Same rules as the earlier grammar items: `status` kept as the slot had it (`entwurf` on textkohaerenz, `geprueft` on the other ten), links on today's slugs, whole elided units in gaps, answer arrays where two forms are right, the indicative never a wrong pill where speech allows it. No `frCA` note in C1, because none of the eleven topics has a real Québec difference.
  - **Paid split workflow:** each topic was written in full in `src/data/grammatik/<id>.json` and then split with exactly the logic of `build-paid-manifest.mjs --split-grammar`, run per topic so that half-finished drafts were never split. The page file keeps titles, hints and `slots`; the items live in `src/paid/grammatik/<id>.json` with `variety: "fr-FR"`. To change a C1 exercise later, edit the paid file and keep `slots` right in the free file (§3).
  - **Scope per slot:** `konjunktiv-1` = subjonctif passé and "no sequence shift in modern French"; the imparfait / plus-que-parfait du subjonctif appear there for recognition only (this partly covers the §3 gap). `passiversatz` teaches the *ne* explétif after *à moins que* as optional and formal; one item accepts both forms. `irreale-vergleiche` = *comme si* (imparfait / plus-que-parfait only) and *quand bien même* + conditionnel against *même si* + indicative. `nominale-praepositionen` keeps the formal connectors (*en raison de, néanmoins, or*); `textkohaerenz` holds reference and ordering (*celui-ci, ce dernier, le premier … le second, d'une part … d'autre part, ledit*) without repeating them. `verbpraefixe` = **passé simple for recognition only**: the exercises identify the infinitive, the tense or the passé composé equivalent, and the speaking rounds produce the passé composé, never the passé simple. Verb prefixes as a topic remain a gap.
  - *Or* at the start of a sentence: a comma after it is allowed (it is common in examples), not forbidden.
  - `STRICT` in `check-variety.mjs` now holds `grammatik` and `grammatik-quiz` (101 grammar files and 7 quiz packs, all fr-FR, 0 legacy values). No `grammatik.json` quiz exists for a C1 topic.
  - **Left for others:** `TOPIC_SLUGS` for the C1 ids still say `/sequence-of-tenses`, `/non-finite-clauses` (futur-2), `/como-si`, `/modal-periphrases`, `/formal-relatives` (partizipialattribute), `/prefixes` (verbpraefixe); §3 has the new slugs → `routes`. Related topics, order and search keywords for C1 (`grammatik-verwandt.json`, `searchIndex.js`, `catalog.js`) → `grammar-structure`. Worksheets `arbeitsblatt/<id>.json` for the C1 ids are Spanish → `teachers`. Other locales' C1 `grammatik.<slot>.intro` hold Spanish-course text → `ui-lang-*`. `check:grammatik-ui` drift → `cleanup`.

---

## 14. What this plan was checked against

**Compared by script with `apps/french` at `87df0a7e`:**

- All 50 items in `QUEUE.md` have a row in §11.
- All 91 grammar slots in §3 against `grammatik/` and `akkusativ` (§3), and each slot's current level against the moves listed there.
- Every file named in this plan exists, except the ones it says are new or missing (`repoint-einfach-grammar.mjs`, `public/i18n/es.json`, `public/.well-known/tdmrep.json`). `apps/hub/src/data/courses.ts` and `scripts/nest-dist.mjs` are outside this app, and `paid/.../` is shorthand.
- The ids in §5.3 (16 listening items) and §5.8 (29 culture topics) against `hoeren.json` and `kultur.json`.
- The Spanish-logic pattern in §10.6: every hit in `src/lib`, `scripts` and `src/integrations` is named in this plan. That is a name match. Owners were assigned from the file names and, for about 20 of the files, the matching lines; the owning run checks the rest.

**Read in `apps/french`:** `variety.js`, `languages.js`, `exam/names.js`, the routes and exam parts of `routes.js`, `STRICT` in `check-variety.mjs`, `wrangler.jsonc`, the root `DEPLOY.md`, `check-content.mjs`, the stored/generated split in `verbtabellenCore.js`; the shapes of `leben-in-deutschland.json`, `verbtabellen.json`, `conjugation-trainer.json`, lexicon, `kunden.json`, `TAGE`, business and DGT decks, `fehler-nach-sprache.json`, `dtz`, the page list against §8.

**Not opened, taken from the Spanish plan:** the inner logic of `dtzTrainer.js`, `lib/knigge/*`, `lib/lindenau/*`, `lib/nussnacht/*`, `lib/hoerSafari/*`, and each module's validator rules. The run that owns a module reads its code first and corrects this plan if it differs.
