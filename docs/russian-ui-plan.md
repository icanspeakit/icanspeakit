# Russian UI (`ru`): plan

Written 2026-11-20 for the `russian-ui` queue (item `plan`), studied on apps/english. It covers where
the language lists live, what adding `ru` changes, fonts, plurals, numbers and dates, the
style rules, and a glossary. The `engine-*`, `hub-and-parity` and `review` items follow this
document. Where a later item finds that reality differs, it fixes the document in the same
commit.

Scope: Russian becomes an **interface** language of the five courses and the hub. Learning
content, routes and data schemas stay as they are. `de.json` is not touched.

---

## 1. How UI languages work today (apps/english, same design in every course app)

| Piece | File | What it does |
|---|---|---|
| Registry | `src/lib/languages.js` → `LANGUAGE_REGISTRY` | One entry per language: `code, native, de, en, word, dir, script, region, fontFamily, hreflang, urlPrefix, surfaces`. Everything else derives from it (`languagesFor`, `langsFor`, `entryLanguages`, `htmlLang`). |
| Gate | `GATES = { ui: 98 }` + `docs/lang-coverage.json` | The header picker only offers a language whose `ui` coverage is ≥ 98 %. The JSON is written by `pnpm lang:coverage` (`scripts/lang-coverage.mjs`). **No entry there means coverage `null`, so the language stays hidden.** |
| Dictionaries | `public/i18n/<code>.json` | Flat `key → string`. `en.json` is the base (6,326 keys in english). Every other file layers over it (`mergedDict`), so a missing key falls back to English. |
| Build-time render | `src/integrations/base-language.mjs` | Fills every `data-i18n`, `data-i18n-html` and `data-i18n-attr` from `en.json`, so the static HTML is English. |
| Runtime `t()` | `src/lib/i18n.js` | `getLang()` reads `localStorage.da_lang`. `applyLang()` sets `<html lang>` (`htmlLang`: hreflang or code) and `dir`, calls `loadScriptFont`, then repaints `[data-i18n]`, `[data-i18n-html]` and `[data-i18n-attr]`. Interpolation is `{name}` only, with no plural logic (see §5). |
| First paint | `src/layouts/Layout.astro` | `<html lang="en">`. An inline head script, built from `LANGUAGES` (`LANG_DIRS`, `LANG_TAGS`, `LANG_FONTS`), sets `lang`, `dir` and the script font before the first paint for a returning reader. |
| Per-language URLs | `src/integrations/entry-pages.mjs` + `src/data/entry-pages.json` | For each registry entry with `hreflang` and `urlPrefix`, it writes `/<prefix>/…` copies of 6 entry pages, with translated HTML, `<html lang dir>`, title, description, `og:locale` (`OG_LOCALE` map, fallback `hreflang`), canonical, and `<link rel="alternate" hreflang>` for every language plus x-default. The sitemap reads those links. |
| Switcher | `src/components/LanguagePicker.astro`, `src/lib/languagePicker.js` | Lists `languagesFor("ui")`. The button label adds the registry's `word` for the browser's language. `setLang()` jumps to the hreflang sibling URL when the page has one. |
| Offer bar | `src/components/LanguageOffer.astro` | **Hard-coded** per-language maps `EINFACH_OFFER` and `ASK` (en, ar, tr, uk, es, pt, vi, hi, id, tl, de; fr and it are already missing) plus the literal `close` string. |
| Consent banner | `src/components/ConsentBanner.astro` | **Hard-coded** map en/de/fr/es/it/pt. |
| Script fonts | `src/lib/scriptFonts.js` | `FACES` covers Arab, Ethi, Deva, Beng, Taml, Geor, Armn and Thai. The comment says "a Latin, Cyrillic or Greek language needs nothing". **That is wrong for this site:** the brand fonts ship Latin subsets only (§3). |
| Dates and numbers | many `toLocale*String("en-GB")` calls | Mostly hard-coded `en-GB` (some `de-DE`). A few use `getLang()`. See §6. |
| Checks | `scripts/check-i18n-keys.mjs`, `validate-i18n.mjs`, `check-reichweite.mjs`, `lang-coverage.mjs` | All read the registry: `languagesFor("ui", {gated:false})` and `entryLanguages()`. `check-i18n-keys` requires every key, a non-empty value and the **same `{placeholder}` set** as en.json. |

The 27 files in apps/english have their own `{(\w+)}` interpolator (games, quiz, exam, live quiz…). Any
change to the placeholder syntax would have to reach all of them, which is why §5 avoids one.

### Monorepo-level lists

| Where | List | Today |
|---|---|---|
| `scripts/check-parity.mjs` | `UI_LANGS = ["en","de","es","fr","pt","it"]` | warns "UI languages missing" per app (the course's own language is excluded, except en) |
| `scripts/scan-german-ui.mjs` | reads each app's `langsFor("ui")`; German-word tokens `[A-Za-zÄÖÜäöüßÀ-ÿ]` | Cyrillic text simply produces no tokens, so it passes. It does **not** catch English left in ru.json. |
| `apps/hub/src/data/hubText.ts` | `HUB_LANGS` (code, native, htmlLang) + one `Dict` per language + `HUB_TEXT` | en, de, es, pt(pt-PT), fr, it |
| `apps/hub/src/components/ConsentBanner.astro` | hard-coded map | en, de, fr, es, it, pt |
| `apps/hub/src/layouts/Hub.astro` | `<html lang="en">`, `/fonts/icanspeak/fonts.css` | repainted by the inline scripts in `index.astro` and `404.astro` from `HUB_LANGS` |

### Per app (measured 2026-11-20)

| App | Registry order | hreflang / prefix | Keys per dict | `OG_LOCALE` | Notes |
|---|---|---|---|---|---|
| english | en,de,es,pt,fr,it | de, es, pt-PT, fr, it | 6,326 | es_LA, pt_BR, vi, hi, id | `entry-pages.json` also carries vi, hi, id, tl (not in the registry, unused) |
| spanish | en,de,es,fr,pt,it | de, fr, pt-BR, it | 6,459 | de_DE, fr_FR, pt_BR, it_IT | es.json exists (own language: parity warning) |
| french | en,de,fr,es,pt,it | de, es, pt-BR, it | 6,428 | de_DE, es_ES, pt_BR, it_IT | fr.json exists (own language) |
| italian | en,de,fr,es,pt | de, fr, es, pt-BR | 6,373 | de_DE, fr_FR, pt_BR, es_ES | no it.json (correct) |
| portuguese | en,de,fr,es,pt,it | de, fr, es, pt-BR, it | 6,418 | de_DE, fr_FR, pt_BR, it_IT | pt.json exists (own language) |

No app has any Cyrillic font file (`public/fonts/icanspeak/*cyrillic*`: 0).

---

## 2. What must change to add `ru` (checklist for each `engine-<app>` item)

1. **Registry entry**, appended last in `LANGUAGE_REGISTRY`:
   ```js
   // Russian UI (ui-lang-ru): machine draft, ты-form, not yet read by a native speaker. Same gating as the others.
   {
     code: "ru", native: "Русский", de: "Russisch", en: "Russian", word: "Язык",
     dir: "ltr", script: "Cyrl", region: "europa", fontFamily: null,
     hreflang: "ru", urlPrefix: "ru",
     surfaces: { ui: { status: "draft" } },
   },
   ```
   Russian goes last everywhere, so nothing the existing learners see moves.
   `script: "Cyrl"` gets no `FACES` entry. The Cyrillic faces are static `@font-face` rules
   with a `unicode-range` (§3), so `loadScriptFont` stays a no-op for ru.
2. **`public/i18n/ru.json`**: every key of `en.json`, in the same order, with byte-identical
   placeholders, HTML tags and keys. Keep the dictionaries in step: from now on a new key goes
   into all seven files.
3. **Coverage**: run `pnpm lang:coverage` after ru.json exists. Without it the picker hides
   Russian (coverage `null` < 98).
4. **Entry pages**: add `ru: 'ru_RU'` to `OG_LOCALE` in `src/integrations/entry-pages.mjs`. Add
   `langs.ru` to `src/data/entry-pages.json`: `meta` (title and description) for each of the 6
   pages, and the home `intro` if that app's other languages have one. Copy the shape of the
   `it` or `fr` block.
5. **Hard-coded maps**: add `ru` to `LanguageOffer.astro` (`EINFACH_OFFER`, `ASK`; add `Закрыть`
   to the `close` string) and to `ConsentBanner.astro`. Before writing ru there, check that the
   suggestion logic reads the browser language. Offer Russian only to browsers that ask for
   `ru`, never to `uk`, `be` or `kk` (the registry's "Ukrainian learners are not sent to
   Russian" rule).
6. **Fonts**: copy the Cyrillic woff2 files and append the rules from §3 to
   `public/fonts/icanspeak/fonts.css`. Fix the `scriptFonts.js` comment ("Cyrillic needs
   nothing": it is covered by fonts.css).
7. **`<html lang>`**: nothing to do. `htmlLang("ru")` → `ru` through `i18n.js`, the head script
   and `entry-pages.mjs`.
8. **Dates**: follow §6. At minimum, any date or number a Russian reader sees must not come out
   in English (`en-GB` month names).
9. **Layout pass** in the dev server (home, grammar, vocabulary, pronunciation, account):
   Russian runs about 15–30 % longer than English, with long words (*Произношение*,
   *Достопримечательности*). Look for overflow in tiles, pills, buttons and the nav. Fixes, in
   order of preference: a shorter wording in ru.json; `hyphens: auto` on narrow containers
   (works because `<html lang="ru">`); a CSS change scoped by `:lang(ru)`.
10. **Checks**: `check-i18n-keys`, `validate-i18n`, `check-reichweite` and `lang-coverage` pick
    ru up from the registry. No edit is needed there.

Per-app drift to expect: italian has no `it`, and the order and `pt` hreflang differ. Insert ru
last regardless. Do not "fix" the other entries in an engine item.

**`hub-and-parity`**: add `{ code: 'ru', native: 'Русский', htmlLang: 'ru' }` last in `HUB_LANGS`,
a `ru: Dict` with every key of `en`, `ru` in `HUB_TEXT`, ru in the hub's `ConsentBanner`, and the
Cyrillic fonts in `apps/hub/public/fonts/icanspeak/`. Add `"ru"` to `UI_LANGS` in
`check-parity.mjs`. In `scan-german-ui.mjs`, add a check that a ru.json value has at least
one Cyrillic letter unless it is placeholder, punctuation, a brand or product name, or a code
sample. That catches English left in the Russian file. Also add the plural lint from §5.

---

## 3. Fonts: Cyrillic

Brand type (BRAND.md §4): Fraunces 900 for headings, Inter 400–700 for body and UI, Fredoka 600
for mascot bubbles only. Literata 500/600 is already self-hosted for reading text. All are
self-hosted from @fontsource (OFL), and no Google Fonts request is allowed.

Coverage per the Fontsource API (checked 2026-11-20):

| Family | Subsets upstream | Cyrillic? |
|---|---|---|
| Inter | cyrillic, cyrillic-ext, greek, latin, latin-ext, vietnamese | **yes**, same family |
| Fraunces | latin, latin-ext, vietnamese | **no** |
| Fredoka | hebrew, latin, latin-ext | **no** |
| Literata | cyrillic, cyrillic-ext, greek, latin, latin-ext, vietnamese (200–900) | yes |
| Nunito | cyrillic, cyrillic-ext, latin, latin-ext, vietnamese (200–1000) | yes |

**Decision**

- **Body and UI: Inter** itself. Add the `cyrillic` and `cyrillic-ext` subsets for 400, 500, 600
  and 700 (`@fontsource/inter`, OFL 1.1). This is the same typeface, so there is no brand
  deviation.
- **Headings: Literata 900** (`@fontsource/literata`, cyrillic + cyrillic-ext, weight 900, OFL 1.1)
  stands in for Fraunces. Reasons:
  - It is already one of the site's typefaces, so it adds no new voice.
  - It is a warm text serif with heavy weights that sits close to Fraunces' soft old-style
    shapes.
  - It is well-hinted for Cyrillic. Fraunces will never get Cyrillic.

  Piazzolla 900 was the runner-up (also OFL with Cyrillic), but it would be a third serif.
- **Mascot bubbles: Nunito 700** (`@fontsource/nunito`, cyrillic + cyrillic-ext, OFL 1.1) stands
  in for Fredoka 600. It has rounded terminals and a friendly, open feel, which makes it the
  closest Cyrillic match to Fredoka.
- **Logo**: untouched. The SVGs are outlined, and the wordmark and course pill stay Latin
  (`english`, `español` …). They are never transliterated.

**Mechanism: composite faces under the brand family names.** Append rules like these to
`fonts.css`, one per weight that is used:

```css
/* Cyrillic: Fraunces and Fredoka have none. These faces lend the glyphs U+0400–052F under the
   brand family names (Literata 900 for Fraunces, Nunito 700 for Fredoka), so every existing
   stack, including canvas code that names "Fredoka", gets Cyrillic without edits. The browser
   only downloads them when a Cyrillic glyph is drawn. */
@font-face { font-family: "Fraunces"; font-weight: 900; font-display: swap;
  src: url("./literata-cyrillic-900-normal.woff2") format("woff2");
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
@font-face { font-family: "Fredoka"; font-weight: 600; font-display: swap;
  src: url("./nunito-cyrillic-700-normal.woff2") format("woff2");
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
@font-face { font-family: "Inter"; font-weight: 400; font-display: swap;
  src: url("./inter-cyrillic-400-normal.woff2") format("woff2");
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
/* … plus the cyrillic-ext ranges (U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F),
   Inter 500/600/700, and Fraunces 400/500/600 → Literata 400/500/600 where those weights are used.
   Take the exact ranges from the @fontsource CSS of the version you copy. */
```

Why composite faces and not a new stack entry: "Fredoka" is named in 13 places (CSS and canvas JS),
and "Fraunces" also appears outside the tokens. A composite face fixes all of them in one file.
The `unicode-range` keeps the cost at zero for everyone who never sees Cyrillic. The one exception
is a reader who opens the language menu: it shows "Русский", which loads one Inter-Cyrillic file
of about 20 KB.

Copy the files into `public/fonts/icanspeak/` of each app and the hub. They are fetched from npm
(`@fontsource/inter`, `@fontsource/literata`, `@fontsource/nunito`) into a scratch folder, not
installed as dependencies. Note the version and licence in the fonts.css comment, as the
existing rules do. The brand kit gets the same files and rules, appended to
`brand/kit/fonts.css` and listed in MANIFEST.md, so a new app inherits them. This adds files to
the kit and does not touch the logo.

---

## 4. Style: how the Russian reads

- **Address the learner with ты**, in lowercase, in line with du, tú and tu in the other drafts and
  with the mascots' tone. Legal, consent and payment texts use impersonal phrasing where
  possible ("Данные удаляются безвозвратно").
- **Buttons and menu actions use the infinitive**, the Russian software convention: *Начать,
  Проверить, Сохранить, Удалить, Скачать*. Short nav items use nouns: *Грамматика, Слова*.
  **Instructions to the learner use the ты-imperative**: *Выбери правильный ответ. Послушай и
  повтори.*
- **Typography**: «ёлочки» for quotes and „лапки“ inside them. An em dash with spaces ` — `,
  with a no-break space before it where the line could break. Write **ё** consistently
  (*ещё, всё, учёба*). No space before `?` or `!`.
- **Kept untranslated**: the brand "icanspeak!", the mascot names (Regi, Bruno, Quaki, Hamsti,
  in Latin script), product names that stay English in the other languages ("Step by step"),
  exam names (Cambridge, IELTS, Trinity, DELE, DELF, CELI, CAPLE), CEFR levels (A1–C1), and
  English tense names (*Present Perfect*), which Russian ELT keeps in English.
- **Example words in the target language** stay as they are inside the Russian sentence: *Артикль
  «the» ставится…* Never translate or transliterate them.

---

## 5. Plurals: one, few and many

**What the format can do:** nothing. The dictionaries are flat strings with `{name}`
interpolation, done by `translate()` in i18n.js, by the build-time renderer, and by 27
interpolators in other files. A few call sites pick between two keys with `n === 1`:
`skills.words.one/many`, `uf.t.one/count`, `kt.t.one/count` and `kt.t.sum.one/n`.
`check-i18n-keys` and `validate-i18n` require the exact `{token}` set of en.json. In en.json, 368
of 726 placeholder strings put a count directly before a noun (`{n} topics`).

Russian needs three forms, **one** (1, 21, 101 → *тема*), **few** (2–4, 22–24 → *темы*) and
**many** (0, 5–20, 25 → *тем*), and the choice depends on the number at runtime.

**Decision: no new syntax in phase 1. Phrase counts so the noun never depends on the number.**
This works with every interpolator and passes the placeholder checks unchanged. It is also
idiomatic for Russian interfaces:

| en.json | ru.json (do) | not |
|---|---|---|
| `{n} topics` | `Тем: {n}` | `{n} тем` (wrong for 2–4 and 21) |
| `All {n} topics` | `Все темы ({n})` | `Все {n} тем` |
| `{n} topics · {q} exercises` | `Тем: {n} · упражнений: {q}` | |
| `{n} days ago` | `{n} дн. назад` | `{n} дней назад` |
| `{n} min` / `{n} seconds` | `{n} мин` / `{n} с` | |
| `Question {i} of {n}` | `Вопрос {i} из {n}` (the genitive after «из» works for any number) | |
| `up to {n} questions` | `Вопросов: до {n}` | `до {n} вопросов` (wrong for 21–24) |
| `<strong>{n}</strong> exercises{delta}` | `Упражнений: <strong>{n}</strong>{delta}` | |

The tools, in order: genitive-plural label plus a colon (*Слов: {n}*), parentheses
(*Карточки ({n})*), abbreviated units (*мин, с, ч, дн.*), «из {n}», and the noun moved in front
of the number. In the `n === 1` pairs the `.one` key says the singular naturally
(*1 ответ*), and the other key uses the neutral pattern (*Ответов: {n}*), because n = 21 or 22
also reaches it.

**Lint** (for `hub-and-parity`, in `scan-german-ui.mjs` or `check-i18n-keys.mjs` for ru): flag a
ru.json value where `{n}` (or another count placeholder) is directly followed by a Cyrillic
word, `/\{\w+\}(<\/\w+>)?\s+[а-яё]/i`. Allow the units `мин|с|ч|дн\.|нед\.|мес\.|г\.|%` and a
small allow-list.

**Later, if the neutral phrasing reads too stiff somewhere:** add a shared
`plural(lang, n, forms)` on `Intl.PluralRules` and a `{n|тема|темы|тем}` syntax. It would be
handled in `translate()`, `base-language.mjs`, `entry-pages.mjs` and both checks, and allowed
only for keys rendered through `data-i18n`. This is a code change for all five apps. It is not
needed for launch, and nothing in phase 1 depends on it.

---

## 6. Numbers and dates

- **Numbers**: `Intl.NumberFormat("ru")` → `12 345,6`, with a narrow no-break space as the
  thousands separator and a decimal comma. Percent is `50 %` (with a no-break space). Currency is
  `9,99 €`. In ru.json, write literal numbers the same way, and use a no-break space between a
  number and its unit.
- **Dates**: `Intl.DateTimeFormat("ru", …)` gives the correct genitive month names:
  - `{day:"numeric", month:"long"}` → «20 ноября»; with the year → «20 ноября 2026 г.»
  - `{day:"numeric", month:"short", year:"numeric"}` → «20 нояб. 2026 г.»
  - numeric → «20.11.2026»; with the weekday → «пт, 20.11»
  - time is 24-hour «14:05»

  Weekdays and months are lowercase. Never build dates from separate translated month words
  (the case would be wrong).
- **Code**: most date and number calls in the course apps hard-code `"en-GB"` (about 20 sites in
  apps/english: klassen*, liveQuiz, klassentest, umfrage, my-mistakes, exam-plan, zitate,
  wortgeschichteCore…) and two use `"de-DE"`. That is wrong for es, fr, it and pt today too. For
  each app, the engine item adds one helper in `src/lib/i18n.js`:
  ```js
  /** The BCP 47 locale for Intl formatting in the current interface language. */
  export const uiLocale = () => htmlLang(getLang());
  ```
  It replaces the **display** uses of `"en-GB"` and `"de-DE"` with `uiLocale()`, and keeps the
  **machine** uses (`"sv-SE"` and `"en-CA"` produce ISO `YYYY-MM-DD` keys) exactly as they are.
  If that grows large in one app, do the user-visible pages first (account, dashboard, my
  mistakes, exam plan) and list the rest in the report.
- **Relative time**: no `Intl.RelativeTimeFormat` is used. Keep strings like `{n} дн. назад` (§5).

---

## 7. Glossary (ru.json must use these consistently)

### Grammar (the explanations name things in Russian school terminology)

| English | Русский | Note |
|---|---|---|
| noun | существительное | |
| verb | глагол | |
| adjective | прилагательное | |
| adverb | наречие | |
| pronoun | местоимение | personal: личное; object pronoun: местоимение в объектном падеже |
| possessive | притяжательный | |
| demonstrative | указательный | |
| reflexive | возвратный | возвратный глагол / местоимение |
| preposition | предлог | |
| conjunction | союз | |
| article | артикль | never «статья». Definite: определённый; indefinite: неопределённый; partitive (fr): частичный |
| auxiliary verb | вспомогательный глагол | |
| modal verb | модальный глагол | |
| infinitive | инфинитив | |
| participle | причастие | past participle: причастие прошедшего времени (Past Participle) |
| gerund | герундий | (es) gerundio: герундий |
| phrasal verb | фразовый глагол | |
| regular / irregular verb | правильный / неправильный глагол | |
| conjugation | спряжение | to conjugate: спрягать |
| ending | окончание | |
| stem | основа | |
| tense | время | in text: «время глагола»; tense names stay English for English (Present Simple), Russian descriptor in brackets once |
| present / past / future | настоящее / прошедшее / будущее время | |
| continuous (progressive) | длительное время | Present Continuous: настоящее длительное |
| perfect | перфект | (es, pt) pretérito perfecto: перфект |
| imperfect | имперфект | |
| preterite / simple past (Romance) | претерит / простое прошедшее | (es) indefinido: претерит |
| mood | наклонение | |
| imperative | повелительное наклонение | an imperative form: императив |
| subjunctive | сослагательное наклонение | (es, it, pt, fr) subjuntivo, congiuntivo, subjonctif: in brackets on first use |
| conditional | условное наклонение | conditionals (en): условные предложения |
| active / passive voice | действительный / страдательный залог | Passive Voice may stay in brackets |
| reported (indirect) speech | косвенная речь | direct speech: прямая речь |
| question tag | разделительный вопрос | |
| yes/no question / wh-question | общий вопрос / специальный вопрос | |
| negation | отрицание | |
| subject / object / predicate | подлежащее / дополнение / сказуемое | direct and indirect object: прямое / косвенное дополнение |
| clause | предложение (часть сложного) | main: главное; subordinate: придаточное; relative: определительное придаточное |
| word order | порядок слов | |
| singular / plural | единственное / множественное число | |
| countable / uncountable | исчисляемые / неисчисляемые | |
| gender | род | masculine, feminine, neuter: мужской, женский, средний |
| agreement | согласование | |
| comparative / superlative | сравнительная / превосходная степень | |
| contraction | сокращённая форма | don't, l'ami, del |
| collocation | устойчивое сочетание | |
| idiom | идиома | |
| false friend | ложный друг переводчика | |
| pronunciation | произношение | |
| (word) stress | ударение | accent mark (es, it, pt, fr): знак ударения; diacritic: диакритический знак |
| vowel / consonant | гласный / согласный | |
| syllable | слог | |
| liaison / linking | связывание (liaison) | |
| level (CEFR) | уровень | «уровень B1», «по шкале CEFR» |

### Interface

| English | Русский | Note |
|---|---|---|
| Start | Начать | |
| Next | Далее | |
| Back | Назад | |
| Check | Проверить | |
| Skip | Пропустить | |
| Try again | Ещё раз | |
| Show answer | Показать ответ | |
| Hint | Подсказка | |
| Correct! / Not quite | Верно! / Не совсем | avoid a harsh «Неправильно!» |
| Close | Закрыть | |
| Exercise | упражнение | |
| Task | задание | |
| Lesson | урок | |
| Topic | тема | |
| Placement test | тест на уровень | heading: «Тест на определение уровня» |
| Step by step | Step by step | product name, unchanged |
| Progress | прогресс | |
| My mistakes | Мои ошибки | |
| Vocabulary (section) | Слова | in running text: лексика, словарный запас |
| Flashcards | карточки | |
| Deck | набор | not «колода» |
| Review (spaced repetition) | повторение | due: «к повторению» |
| Grammar | Грамматика | |
| Listening | Аудирование | |
| Reading | Чтение | |
| Writing | Письмо | |
| Speaking | Говорение | ELT term; a button: «Говорить» |
| Worksheet | рабочий лист | |
| Download / Print | Скачать / Распечатать | |
| Search | Поиск | |
| Free | бесплатно | |
| Account | аккаунт | |
| Sign in / Sign out / Sign up | Войти / Выйти / Зарегистрироваться | |
| Settings | Настройки | |
| Delete account | Удалить аккаунт | the typed confirmation word stays whatever the code compares (check per app; never translate a word the code checks literally) |
| Interface language | Язык интерфейса | |
| Teacher / class | преподаватель / группа | «класс» only for school classes |
| Streak | серия | «5 дней подряд» uses the neutral pattern: «Дней подряд: 5» |
| Play (audio) / Record | Слушать / Записать | |
| Accept / Decline / Details (cookies) | Принять / Отклонить / Подробнее | |
| Privacy policy | Политика конфиденциальности | |
| Legal notice (Impressum) | Выходные данные | |

---

## 8. Order of work (matches QUEUE.md)

1. `engine-english` builds the reference: the registry entry, ru.json, coverage, entry pages, the
   hard-coded maps, the fonts, `uiLocale()`, and a layout pass.
2. `engine-spanish`, `-french`, `-italian`, `-portuguese` reuse the font files and fonts.css
   block unchanged, and reuse every ru.json value whose key **and** en.json value are identical
   to apps/english. Only the drifted keys get a fresh translation.
3. `hub-and-parity`: the hub, `UI_LANGS`, the Cyrillic/English-leftover check, and the plural
   lint.
4. `review`: two independent reviewers check against §4, §5 and this glossary.

Open points for Edgar (not blocking):
- ты vs вы: I chose ты for consistency with the other drafts. A native reviewer may prefer вы for
  adult learners. Changing it later is a sweep through ru.json.
- The Literata and Nunito stand-ins are a brand decision on paper only. If they are accepted,
  add a line to BRAND.md §4 ("Cyrillic: Literata 900 for Fraunces, Nunito 700 for Fredoka, Inter
  as is").
- `LanguagePicker.astro` has a German leftover in its label (`"Sprache · Language"`), and
  `entry-pages.mjs` says `pt: 'pt_BR'` and `es: 'es_LA'` where english uses pt-PT. Both are
  outside this queue, so they are noted here and not fixed.
