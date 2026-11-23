# Russian as a target language: options

*Written 2026-11-22 on the `russian-ui` branch (queue item `russian-course-options`). This is a
decision paper only: nothing has been built. It covers what an `apps/russian` course (Russian
taught to speakers of English, German, Spanish, French, Italian and Portuguese) would take, and
what Edgar has to decide first.*

Not to be confused with the work already done on this branch: there, Russian was added as an
**interface** language to the five existing courses (`docs/russian-ui-plan.md`). Some of that
work carries over (Cyrillic fonts, the glossary, `uiLocale()`). Most of the work for a Russian
**course** is new.

---

## 0. Summary

- **Clone source: `apps/italian`, not `apps/portuguese`.** Portuguese was copied last
  (2026-11-07, the same day as French and Italian), but on this base its content is still the
  Spanish clone. `src/content/lexicon/a1.json` holds `nombre`, `llamarse` and `es-ES`, its
  en.json still says "Learn Spanish", and its queue has 7 open items (UI languages, sync,
  brand kit, parity, deploy). Italian has the newest *finished* state. All 57 of its items are
  done, including `residual-audit`, `games-arcade-routes`, `pdf-base-slugs` and `final-verify`,
  and it has the brand kit and parity fixes. Cloning Italian saves the extra clean-up items
  the Portuguese queue still needs.
- **The engine assumes a Latin script.** All four other clones were Latin-to-Latin, so they
  could keep slugify, answer matching, articles and IPA almost as they were. For Russian, about
  a dozen engine files have to change before any content goes in (section 2). The worst case is
  `slugify()`, which turns every Cyrillic word into an empty file name.
- **New modules the other courses never needed:** alphabet and handwriting, a Cyrillic
  keyboard / phonetic input, stress marks, cases (declension), aspect pairs, motion verbs, and
  gendered past-tense forms in the conjugation trainer.
- **Estimated queue: about 75 items.** Italian had 57. About 45 map one-to-one onto Italian's
  items, about 12 are new Russian-specific items, and about 18 are larger because of Cyrillic.
  Each overclaude run handles one item, so this is about 75 runs, roughly 1.2 to 1.5 times
  the Italian queue. The amount of work is set mostly by content volume (≈2,200 lexicon
  entries, 91 grammar topics, exams, games), not by the engine.
- **The biggest risks are not technical.** They are which country the "life" modules are
  about, the exam and immigration facts (Russian rules changed a lot in 2024–2025), audience
  and payments, and voice/stress quality. See section 5.

---

## 1. The clone recipe

The other three courses were set up the same way ("Setup done (2026-11-07)" in each
overclaude QUEUE.md). For Russian, follow the same steps from `apps/italian`:

1. **Branch.** From the monorepo base branch (`monorepo` / whatever is current when it starts),
   create a project branch `content` in a new worktree. Never on `main`.
2. **Copy** `apps/italian` → `apps/russian`. Leave out `node_modules/`, `dist/`, `.astro/` and
   `public/audio/**`: all Italian clips are useless, and leaving them out also keeps the
   20,000-files-per-Worker limit in view. Do not copy git history (it is one repo; the copy
   is a plain file copy, committed as `chore(russian): copy apps/italian as the starting point`).
3. **Rename** in `apps/russian`:
   - `package.json` name → `@icanspeak/russian`;
   - `wrangler.jsonc` Worker → `icanspeak-russian`, route `icanspeak.it/<slug>/*`;
   - `BASE_PATH` / `base` in `astro.config.mjs` → `/<slug>`;
   - port in the dev scripts → the next free preview port (Italian used 4325).
4. **Slug** (Edgar decides, see section 6). Courses use the language's own name (`espanol`,
   `francais`, `italiano`). Russian's own name is Cyrillic, so the slug has to be a
   transliteration. Two things require plain ASCII: the hub regex `slug:\s*'([a-z]+)'` in
   `scripts/check-parity.mjs`, and percent-encoded URLs. Proposal: **`russkiy`**
   (BGN/PCGN romanisation of «русский»). The alternative is `russkij` (scholarly).
5. **Monorepo wiring**, outside the app, done by hand or as one small item:
   - `scripts/check-parity.mjs` `COURSES`: add
     `russian: { name: "Russian", lang: "ru", path: "russkiy" }`;
   - in the same file, add `russian` to the retired-logo regexes (lines ~80 and ~117);
   - `scripts/generate-vocab-audio.mjs` `VOICES`: add
     `russian: { lang: "ru-RU", voice: "ru-RU-SvetlanaNeural" }`;
   - `apps/hub/src/data/courses.ts`: add the card with `live: false`
     (`code: 'RU'`, `name: 'Русский'`, `english: 'Russian'`);
   - `scripts/scan-german-ui.mjs` / `check-base.mjs`: add the app.
6. **Brand.** The kit has no per-course logos any more. The course is shown by the HTML pill
   next to the kit wordmark (BRAND.md §1, "Course label"), so nothing has to be drawn. The pill
   text would be `русский`. BRAND.md asks for Fraunces 900, which has no Cyrillic, so the pill
   will render in the **Literata 900** stand-in that this branch already ships through
   `unicode-range` (§2.9). Edgar should look at it once. Never redraw the wordmark.
7. **Interface languages.** Base `en`, plus `de`, `es`, `fr`, `pt` and `it` (Italian's set plus
   `it`). The `ru` interface added on this branch has to be **removed** from the Russian
   course: every course drops its own language as an interface language, as the Italian queue
   did with `it` in `ui-lang-es`. A Russian speaker does not need a Russian course.
8. **First item = `content-plan`** with `[pause]`, as in every course: a keep / convert / add /
   leave table for every Italian module, written into `apps/russian/docs/content-plan.md`.
   Every later run follows it.

---

## 2. What must be rewritten for Cyrillic (engine)

These are code changes in `apps/russian/src/lib` and `scripts/`, made **before** the content
items. Without them the content items cannot work (no audio files, wrong answer checks,
empty slugs). They are measured on `apps/italian`.

### 2.1 Slugs and audio file names: blocking

`src/lib/audioSlug.js` `slugify()` maps a handful of Latin accents and then drops everything
outside `[a-z0-9]`. A Cyrillic word becomes `""`. `satzSlug()` then names every sentence file
just `-<hash>`, and the lexicon `audio` fields, the generators and the pages stop matching.
`scripts/check-parity.mjs` already flags reserved slugs (`con`), and empty or colliding slugs
would be worse.

- **Fix:** one transliteration table for slugs (BGN/PCGN-like, ASCII only: ж→zh, х→kh, ц→ts,
  ч→ch, ш→sh, щ→shch, ы→y, ь/ъ→"", й→y, ё→yo, ю→yu, я→ya). Strip stress marks first.
  Scripts and pages use the same module, as they do now.
- **Collision check:** the transliteration loses information (е/э, ь), so the lexicon
  validator needs a "two lemmas, one slug" check.
- Route slugs (pages) are ASCII transliterations too, or English. That is the content-plan's
  call. The Italian course uses Italian slugs, so the matching choice is `grammatika`,
  `slovar`, `proiznoshenie`, and so on.

### 2.2 Answer matching, search, folding: `NFD` breaks й and ё

20 files in `apps/italian` call `normalize("NFD")` and strip combining marks: `answerMatch.js`,
`conjugationTrainer.js`, `verbtabellenCore.js`, `SiteSearch.astro`, `schreibKorrektur.js`,
the pickers, `hochstapler`, `klassentest/pool.js` and others. In Cyrillic, **й = и + U+0306**
and **ё = е + U+0308**. Stripping all marks turns `мой` into `мои` (wrong meaning), and the
ё folding happens without anyone choosing it.

Russian needs its own fold:
- strip **only U+0301** (the stress mark) and U+0300;
- map ё→е for matching (Russian print usually leaves ё out), but keep it in display;
- **keep й**;
- map Latin look-alikes typed on a mixed keyboard (a, e, o, p, c, x, y, k, m, t, h, b) to the
  Cyrillic letters, but only inside a word that is otherwise Cyrillic.

`answerMatch.accentOnly()` (Italian: "check the accent") becomes "check the stress / ё". It
gives a hint, never an error, because learners do not type stress marks.

### 2.3 Regexes that mean "a letter"

39 files contain `[a-z…]`-style letter classes. Examples: `artikelSprint/lexWords.js`,
`nussnacht/woerter.js`, `satzmelodie.js`, `vokabelFoto/parse.js` (12 uses),
`ausspracheCheck*.js`, `partneruebungen/*`, `langCss.js`, `meldungRef.js`.
Each one needs a look. Most become `\p{L}` with the `u` flag, and some are about the UI
language and stay as they are. This is one engine item with a grep list, the same kind of
work as the Italian `residual-audit`.

### 2.4 Typing Cyrillic

Learners in this course do not have a Russian keyboard, and the deutschacademy engine has
many typed exercises: `conjugationTyped.js`, satzregen, dictation (`artikelDiktat.js`), gap
fills, the placement test and writing tasks.

- **Option A (recommended):** a small on-screen ЙЦУКЕН keyboard component plus **phonetic
  input** (type `privet` → `привет`, the "translit" layout people know). It is one shared
  component, switched on for every input that has `lang="ru"`.
- **Option B:** tell people to install a system keyboard layout. This is not enough on its
  own: A1 learners leave.
- Answers typed in Latin translit should also be accepted. Option A then makes it automatic.

### 2.5 Articles → gender and case

Russian has no articles. The article machinery is everywhere in the clone:
- `articles.js`;
- `artikelSprint/`, `artikelDiktat.js`, `artikelPacks.js`, `artikelHerkunft.js`,
  `artikelFreqChart.js`, `artikelVerlauf.js`;
- `artikel-haeufigkeit.json`, `artikel-packs.json`, `artikel.json`;
- `nussnacht` (articles as the game rule);
- the gender colours.

Convert them rather than delete them:
- **gender**: м / ж / ср, mostly predictable from the ending (-а/-я → ж, -о/-е → ср,
  consonant → м). The tricky ones (-ь, папа, кофе) make the drill worth doing.
  `articles.js` becomes `gender.js` with `genderFromEnding()` and an exceptions list;
- **case endings** as the game rule: the article games become ending games (pick the right
  ending of книга after в / без / с). This is where the German-origin engine helps.
  `dativ.json`, `genitiv.json`, `adjektivdeklination*.json`, `n-deklination.json`,
  `wechselpraepositionen.json`, `verbPairsArt.js` (stellen/stehen → ставить/стоять,
  класть/лежать) and `endingMarks.js` (braces marking the ending in table cells:
  `книг{у}`) were built for German cases and fit Russian better than they fitted Italian.
- **Lexicon schema** (`validate-lexicon.mjs`). Nouns: `gender` (m/f/n), `animate`, `genSg`,
  `nomPl`, `genPl`, stress pattern. Verbs: `aspect` (impf/pf), `pair` (lemma of the other
  aspect), conjugation class, `motion` (unidirectional / multidirectional), government
  (`+gen`, `+dat`, `+instr`). All forms are stored **stressed**.

### 2.6 Stress marks

Russian stress is free, mobile and not written. A course must show it. The usual practice in
textbooks is an acute accent (U+0301) on the stressed vowel in learning material, never in
"real" texts.

- **Store** stressed forms (`моло́ко`) in content. Show them by default, with an option to hide
  stress marks from B1 up (a setting next to the existing preferences).
- **Strip** them for matching (2.2), slugs (2.1), search and LanguageTool.
- **Fonts:** Inter (body), Literata (headings) and Nunito (bubbles) all have Cyrillic and the
  combining acute. Placement over Cyrillic vowels, especially uppercase and ё, needs a visual
  check (to verify).
- **Sources:** stressed forms are not in frequency lists. Options are Wiktionary (CC BY-SA;
  the app already has `scripts/fetch-wiktionary.mjs`) and OpenRussian.org data (CC BY-SA).
  Check the licence. A validator should require exactly one stress mark per word of two or
  more syllables, except for words with ё.
- **TTS:** Azure ru-RU usually stresses correctly but does get homographs wrong (за́мок /
  замо́к, му́ка / мука́). SSML `<phoneme>` or Azure's own stress handling for U+0301 must be
  tested before the bulk audio run (to verify; one small spike item).

### 2.7 Conjugation trainer and verb tables

`conjugationTrainer.js`, `conjugationTyped.js`, `verbtabellen.json` and `verbtabellenCore.js`
assume a person × tense grid. Russian needs:
- **aspect as a first dimension.** A perfective verb has no present. Its "present" forms are
  the future. The imperfective future is compound (буду + infinitive);
- **gendered past**: читал / читала / читало / читали, not persons. The grid needs gender
  columns for the past and the conditional (бы);
- **the 1st/2nd conjugation and consonant alternations** (писать → пишу, любить → люблю) and
  moving stress (as sets in the trainer);
- **motion verbs**: идти/ходить, ехать/ездить, plus prefixes. These are a separate drill;
  the German `trennbare-verben` / `verbpraefixe` slots are the natural place;
- **imperative** (aspect matters), participles and verbal adverbs (B2+, reading only).

### 2.8 Pronunciation and IPA

- `aussprache*.json`, `ausspracheregeln.json`, `aussprache-check.json`, the
  `pronunciation/` patterns and the mother-tongue tips are rewritten for Russian:
  - vowel reduction (аканье / иканье);
  - hard/soft consonant pairs and palatalisation;
  - ы;
  - final devoicing and voicing assimilation;
  - ь and ъ;
  - ш / щ / ж / ч / ц;
  - the rolled р;
  - ё;
  - mobile stress.

  Tips per native language: English, German, Spanish, French, Italian, Portuguese.
- **Intonation** (ИК-1 … ИК-5: a question without a question word differs from a statement
  only by intonation). The existing `satzmelodie` module and `melodieLabyrinth.js` fit well:
  convert them rather than drop them.
- **IPA:** Italian and Spanish have rule-based generators (`build-lexicon-it.mjs`,
  `es-ipa.mjs`). Russian IPA can only be derived from the **stressed** spelling (reduction
  depends on stress). A generator `ru-ipa.mjs` is feasible but is its own item, with a test
  set of about 200 hand-checked words.
- **Speech recognition** (pronunciation check): Chrome's Web Speech API supports `ru-RU`. It
  goes through `src/lib/pronunciation/browser.ts` as now, with the language code changed.
  Browser TTS voices for ru-RU exist on Windows, macOS and Android (quality varies).

### 2.9 Fonts, PDFs, images

- **Web fonts:** already done on this branch. `apps/italian/public/fonts/icanspeak` has the
  Inter, Literata (for Fraunces) and Nunito (for Fredoka) Cyrillic subsets through
  `unicode-range` (commit `788782b9`), so the clone inherits them. For the Russian course,
  Cyrillic is the main script, not a fallback. Most headings with Russian words will render in
  Literata 900, not Fraunces. Edgar should accept this or choose another display face with
  Cyrillic (BRAND.md §4 is Edgar's call).
- **PDF generators** (`scripts/fonts/`): Noto Sans already covers Cyrillic (README line 3).
  Check every `generate-*-pdf.mjs` for Fredoka/Fraunces use in Cyrillic titles.
- **Baked-in text in images:** maps (`generate-sprachen-karte.mjs`,
  `generate-dialekte-karte.mjs`), hub pictures, speaking thumbnails and word-scene images are
  regenerated or rewritten.

### 2.10 Writing check, search, other services

- `schreibKorrektur.js` → LanguageTool `language: "ru-RU"` (supported).
- Site search: Russian inflection means `книги` does not find `книга`. Add a light suffix
  stemmer or index the lemma plus the forms already in the lexicon (cheap, no dependency).
- `uiLocale()` and the date code are already on this branch. Target-language dates in content
  (in Russian) are text, not code.

### 2.11 The alphabet module: new

None of the other courses has one, so it is an addition, not a conversion:
- the 33 letters with name, sound, an example word and audio;
- "false friends" letters (В, Н, Р, С, Х, У look Latin but are not);
- **cursive / handwriting**: italic and handwritten т, д, и, п, г look different from print,
  and Russian speakers write in cursive. Use stroke-order drawings in the house style, like
  `verbPairsArt.js` (own SVGs);
- a reading-speed drill: syllables, then words, then signs (метро, аптека, вход / выход);
- an optional **transliteration toggle** for A1 (show romanisation under Cyrillic). It must
  switch off by itself after the alphabet path, or learners never learn to read;
- placement: the first units of the beginner path (`einfach-pfad.json`) become the alphabet.

---

## 3. Content: what maps from Italian and what is new

| Italian module | Russian version | Kind |
|---|---|---|
| grammar A1–C1 (91 topics, German file names) | Russian grammar: cases (each case its own topic: forms, uses, prepositions), adjectives, pronouns, numerals and the cases they govern (1 рубль / 2 рубля / 5 рублей), aspect, motion verbs, participles | convert, larger |
| `einstufung.json` placement test | Russian A1–C1 (alphabet-only start for zero beginners) | convert |
| conjugation data + trainer | aspect pairs, gendered past, motion verbs (2.7) | convert, larger |
| beginner path + UI | alphabet first, then A1 | convert, larger |
| lexicon A1–C2 (≈2,180 entries) + decks | Russian, stressed, gender/aspect/government fields | convert |
| listening, reading/writing, speaking | Russian scripts; forms of address ты / вы, имя-отчество | convert |
| pronunciation | 2.8 | convert, larger |
| idioms, typical mistakes, false friends | per native language (en/de/es/fr/it/pt) | convert |
| exams: CILS/CELI/PLIDA/CERT.IT slots | **ТРКИ / TORFL**: Элементарный (A1), Базовый (A2), ТРКИ-1 … ТРКИ-4 (B1–C2); practice sets original only | convert, facts to verify |
| civic knowledge (Accordo slot) | Edgar's decision (section 6): Russia's комплексный экзамен for migrants (language + history + law), or a neutral "how things work" civics module, or drop | decide |
| citizenship path | the same decision | decide |
| Questura/Comune sim (`buergeramt`) | МВД / МФЦ sim (registration, патент, СНИЛС, ИНН, ОМС), or a neutral setting (bank, post, housing office) | decide |
| patente vocabulary | ГИБДД driving vocabulary, or drop | decide |
| culture, accents & languages map | Russian culture and literature; Russian as spoken across the post-Soviet space, written neutrally (section 5) | convert, sensitive |
| games (satzregen, quaki, hochstapler, artikel-sprint, nussnacht, safari) | gender and case-ending games (2.5) | convert |
| manners sim (knigge), town RPG (lindenau) | Russian scenes (гости, тапочки, тосты, вы/ты), an invented town | convert |
| teachers, word stories, work, business | Russian; word stories are strong (Church Slavonic, Turkic, German, French loans) | convert |
| — | **alphabet + handwriting**, **keyboard/phonetic input**, **stress setting**, **IPA generator** | new |

---

## 4. Estimated queue by section

The item sizes are taken from the Italian queue (one item per run). "Engine" items come first
and are blockers. Numbers are estimates.

| Section | Items | Notes |
|---|---:|---|
| Setup and plan: `content-plan` [pause], `base-path-and-brand`, `variety-schema` (ru-RU, no alternate mode, as Italian) | 3 | as Italian |
| **Cyrillic engine** (new): slugify/transliteration + collision check; Russian fold for matching/search (2.2); letter-regex audit (2.3); on-screen keyboard + phonetic input; stress-mark model + setting + validator; gender/case replacing articles in `articles.js` and the lexicon schema; TTS stress spike (Azure ru-RU, homographs) | 7 | blockers for everything below |
| UI text: components, pages a–l, pages m–z | 3 | as Italian |
| **Alphabet** (new): letters + audio + reading drills; handwriting SVGs; beginner-path alphabet units | 3 | |
| Placement test | 1 | |
| Grammar A1, A2, B1, B2, C1, structure, start book | 7 → **9** | cases and aspect make A2/B1 about 1.5 times as big; split A2 and B1 in two |
| Conjugation data, trainer (aspect, gendered past), **motion verbs** (new) | 2 → **3** | |
| Beginner path + UI | 2 | |
| Vocabulary A1, A2, B1, B2, C1–C2 | 5 → **6** | the stressed forms and the extra fields slow every batch; split A1 |
| **IPA generator** `ru-ipa.mjs` + test set (new) | 1 | |
| Listening, reading/writing, speaking | 3 | |
| Pronunciation (incl. intonation/satzmelodie) | 1 → **2** | |
| Idioms and mistakes | 1 | |
| Exams: ТРКИ hub + A1/A2/B1; ТРКИ B2–C2 + "which exam?" | 2 | facts to verify |
| Life modules: civics, path, office sim, driving vocab | 0–4 | **depends on Edgar's decision** |
| Culture, accents & languages | 2 | sensitive wording |
| Games: data, arcade (case endings), dialogue (knigge/town) | 3 | |
| Teachers, word stories, work, business | 4 | |
| Routes, cleanup, residual audit, games routes, PDFs | 5 | as Italian's last round |
| UI languages de, es, fr, pt, it; remove ru UI | 5 | about 6,400 keys each, reused from the Italian app's dictionaries where the English is the same (5,854 of 6,418 strings were reusable this way in `engine-portuguese`) |
| Brand kit check, parity, deploy-readme | 3 | the kit layout is inherited from Italian, so it is a check, not a merge |
| **Audio** (separate queue, like icanspeak-audio): vocabulary, sentences, pronunciation, phrases, listening with ru-RU | 3–5 | needs the Azure key; watch the 20,000-files limit |
| Final verify [pause] | 1 | |
| **Total** | **≈ 72–80** | Italian: 57 |

### Suggested order

1. setup;
2. the 7 engine items;
3. one **vertical slice**: alphabet + vocab A1 + grammar A1 + audio for A1;
4. a pause for Edgar to try it on a phone;
5. the rest in Italian's order.

The slice shows early whether stress marks, input and TTS work together, before 2,000
lexicon entries are written in a format that might change.

---

## 5. Risks

1. **The engine breaks without errors.** Slugify returns `""`, and NFD folding swaps й for и.
   Neither throws: builds stay green while audio 404s and wrong answers count as right. The
   engine items need their own unit tests (`tests/`) and a check in `check-parity` or the
   lexicon validator: no empty slugs, no duplicate slugs, й kept.
2. **Stress data quality.** Every one of ≈2,200 lexicon entries, every example sentence and
   all grammar tables need correct stress. Model-written stress marks will contain errors that
   a reviewer has to catch. Plan a stress-review item (a native reader, or a Wiktionary
   cross-check script) before audio is generated, because regenerating clips costs Azure
   quota.
3. **TTS homographs and reduction.** Azure ru-RU voices (Svetlana, Dariya, Dmitry) are good but
   choose the wrong stress on homographs. Browser fallback voices vary more. Spike first (2.6).
4. **Which country, and politics.** The other courses carry "life in Spain / France / Italy"
   modules for immigrants. A "life in Russia" module (migration offices, the migrant exam,
   patents) means describing the Russian state in 2026, and its facts change often (the
   migrant-testing rules were tightened in 2024–2025). An audience living in Russia may face
   access, payment and legal issues (sanctions, Cloudflare/Stripe reach, data-localisation
   law). A culture and languages page about Russian across Ukraine, Belarus, Kazakhstan and the
   Baltics is sensitive whatever it says. Mitigation: the course teaches the language and the
   culture. The country-specific state modules are left out or kept neutral unless Edgar wants
   them, and wording about the post-Soviet space is reviewed.
5. **Audience size and fit.** Every other course targets immigrants and residents, and the
   whole engine is built around that (exams for residence, office sims, work module). Russian
   learners are more often heritage speakers, students, people with family ties and
   professionals. If the life modules are dropped, the course is thinner than its siblings
   unless something replaces them (e.g. more culture/literature, a heritage-speaker track).
6. **Brand.** The pill and every Cyrillic heading render in Literata, not Fraunces. The course
   will look slightly different from its siblings. The logo itself is unaffected (outlined
   SVG).
7. **Size and the Worker file limit.** A Russian course will have more audio than Italian
   (alphabet clips, stressed forms, motion-verb sets). Check the built file count against
   the 20,000-files-per-Worker limit early (Italian's deploy README has the method).
8. **Drift.** Every course is a clone, so fixes in Italian after the copy will not reach
   Russian automatically. The same is true now between the five courses. Copy from a tagged
   commit and record it in the content-plan, as the brand-kit items did with their three-way
   merges (`git merge-file`).
9. **Reviewer availability.** For Spanish, French and Italian, the reports mark exam and law
   facts "to verify" for Edgar. Russian also needs a native reviewer for stress, naturalness
   and the cursive drawings, and Edgar may not be able to do that.

---

## 6. Decisions for Edgar

1. **Go / no go**, and whether it starts before or after Portuguese is finished.
2. **Clone source:** `apps/italian` (recommended, finished) or wait for Portuguese.
3. **URL slug:** `russkiy` (recommended), `russkij`, or `russian`.
4. **Life modules:** Russia-specific (migrant exam, МВД/МФЦ sim, ГИБДД), neutral everyday
   civics, or none. This sets 0–4 queue items and most of the political risk.
5. **Exams:** ТРКИ/TORFL only (recommended), with original practice sets only.
6. **Stress marks:** shown by default with a "hide from B1" setting (recommended), or always.
7. **Typing:** an on-screen keyboard plus phonetic input (recommended), or "install a layout".
8. **Display face:** accept Literata 900 for Cyrillic headings and the `русский` pill (no
   change to BRAND.md needed beyond a note), or pick a Cyrillic display face.
9. **Native reviewer** for stress and naturalness: who, and at which pause points.
10. **Audio budget:** Azure quota for roughly 20–30k ru-RU clips.
