# Run report: `ui-components`

Run: 2026-10-28/29, `content` branch, unattended. Scope: `src/layouts` and `src/components`
(page titles, descriptions, leftover German UI text). Data files were not changed, except
`public/i18n/en.json` (UI strings) and the i18n gap baseline.

## What I did

**Layout and SEO (`src/layouts/Layout.astro`, `src/lib/seo/jsonld.ts`)**
- Default `<title>` and meta description are English (Cambridge / IELTS / Trinity / Life in the UK, per content-plan §2).
- `og:locale` `de_DE` → `en_GB`; default OG image alt in English; JSON-LD `inLanguage` `de` → `en` (pages) and `de-DE` → `en-GB` (WebSite).
- Organization description in English; breadcrumb names (`SECTION_PAGES`, "Start" → "Home") in English, using the content-plan target names (e.g. `/goethe` → "Cambridge English", `/testdaf` → "IELTS Academic").
- Bug fix: the first-paint script fell back to `lang = "de"` when no language was stored, so every first visit got `<html lang="de">` and `dir="undefined"`. It now falls back to `BASE` (`en`).

**Missing keys** (the element kept its German server text): `ab.partner.melden`, `search.verbs`,
`tn.new.test(Text)`, and 20 nav menu keys that `src/lib/catalog.js` references but en.json
lacked (`nav.ueben.stunde*`, `nav.entdecken*`, `nav.kultur.landUndKultur*`, `nav.lk.kl*`/`kt*`,
`nav.wissen.zitate*` …). These showed German in the nav on every page.

**Untranslated text in components** got `data-i18n` keys (or English where the text is built
in JS): LearnShell (/fortschritt), EinfachEntry, NavDrawer, LanguageOffer, ExamShell,
FehlerSprache, GrammarActions, RefActions, LegalTranslation, ArtikelTrainer, ArtikelDiktat
(chrome only), AusspracheRegeln, LernsetPicker, TopicBar, VocabList, VokabelTrainer,
ShareButton, AbOrigin, ZitatAbo, ZitatCard, RwStrip, WortEntry, mocks. Single-word labels
(Präsentieren, Partnerblatt, Teilen, Prüfen …) were found with a relaxed scan: the repo's
`check:i18n-luecken` ignores one-word text.

**Rewritten in English (text lives in the component, not in data)**
- Homepage mocks (`mocks/DashboardMock.astro`, `mocks/UebungenMock.astro`): new English demo
  quiz items, vocabulary cards (word + learner definition, §1.4), speaking lines, exams
  (B1 Preliminary, IELTS Academic, B2 First), pronunciation phrases and notes.
- `LkWegweiser` (teacher guide on /lehrkraefte), `KursProgression` + `KursTimeline`
  (/kursinhalte), `NaechsteStunde`: were German-only by design (`lang="de"`, text in the
  markup/script); now English-only (`lang="en"`), same design.
- `PruefungSatz`: page title, description and JSON-LD of every exam practice set in English
  ("… practice test – free, with answers").
- `WortschatzDruck` (printable vocabulary sheet): English instructions; exercise B is
  "a, an or some?" and the article column defaults to `some` for plural-only nouns (§1.4).
- `GrammarRelated`, `TopicRail`, `SatzListe`: exam link labels mapped per content-plan §2.
- Dates in word stories and quotes format as `en-GB` (`formatDe` in `wortgeschichteCore.js`, `zitate.js`; name kept).

**en.json values for the English course.** About 130 existing English values used by components
still described the German course ("New to German?", "A complete DTZ practice set",
"Articles: der, die, das", "Do you teach German?", "Living in Germany" …). Rewritten for the
English course per content-plan: progress dashboard level blurbs (A1–B2 from the §3 grammar
map), exam entries, tool descriptions, nav hints (phrasal verbs, false friends, accents),
the exam disclaimer (Cambridge University Press & Assessment, IELTS partners, Trinity
College London, UK Home Office).

## Decisions

1. **Name of the beginner path: "Step by step"** (content-plan: “Learn step by step”, route
   `/step-by-step`). `nav.einfach` was "Easy mode"; now "Step by step" everywhere in the chrome.
2. **Server text behind a key stays German.** `base-language.mjs` replaces it at build time and
   `i18n.js` in the browser, so the HTML is English. Rewriting ~thousands of fallback strings
   would be churn with no visible effect. Where the server text is *not* covered by a key, it was fixed.
3. **UI that describes the target course, ahead of the data.** E.g. the A1 level blurb now
   says "a, an and the" and the article trainer is the "a / an / some trainer", while the data
   is still German until `grammar-a1` / `vocab-a1` / `games` run. Same for breadcrumb and exam
   names (Cambridge for the Goethe slot etc.). Chosen so later content runs don't have to come
   back to the chrome.
4. **German-specific mechanics left alone**, only their chrome translated: ArtikelDiktat's
   checker (der/die/das, capital letters, umlaut keys), ArtikelTrainer's rule explanations,
   ConjTable headers (German conjugation table). They change with their content items.
5. **English hardcoded in JS-built components** (LkWegweiser, NaechsteStunde, KursProgression)
   instead of new keys: they were German-only with no keys before; marked `lang="en"` so the
   gap check treats them as fixed-language. Add keys if a second UI language comes.
6. **Gap baseline** (`scripts/i18n-luecken-baseline.json`): lowered only for components/layouts.
   `--update` would also have *added* failing pages to the baseline (accepting their gaps), so I
   reverted that part; pages are for `ui-pages-*`.
7. Image alt texts in `src/data/hub-bilder.manifest.json` are German, but content-plan says
   image manifests are not to be touched. Not changed (see below).

## Left for other items / uncertain

- **Pages (`ui-pages-a-l`, `ui-pages-m-z`)**: ~70 `data-i18n` keys used in pages are missing
  from en.json, so German shows: `/lehrkraefte/tests` (`kt.t.*`, ~45), `/spiele/knigge`
  (`kn.*`), `/fortschritt` (`fortschritt.tab.quiz`, `fortschritt.quiz.*`), `/grammatik`
  (`grammatik.tf.*`, `grammatik.vb.*`), `/lehrkraefte` (`lk.kt.*`, `lk.vf.*`), `/zungenbrecher`
  (`zb.pos`, `zb.best`). Found by comparing every `data-i18n="…"` and `*Key: "…"` in `src/`
  with en.json; the `ui-pages-*` runs should repeat that comparison.
  Page titles/descriptions (e.g. /fortschritt "Mein Fortschritt") are page props, not done here.
- **Content inside components** (owned by content items): `ArtikelRegel` (games/vocab),
  `LidGrafik` (exams, Life in the UK), `SatzRahmen` (grammar), `KasusChart` and
  `fuehrerschein/*` (dropped by `cleanup`), `VokabelTrainer` "Auf Deutsch" explanation option
  (`vocab-a1`), `WortEntry` relation labels (`word-stories`), `wissen.file.*` PDF descriptions.
- **Unused components** (no importer): Header, Hero, Footer, Classes, Stats, Team, Testimonials,
  WhatYouDo, WhyUs, PracticeHeader, NavVergleich, ArtikelTrainerT1/ArtikelPanelT1,
  intern/TageBalken, klassen/KontoKlassen, wortgeschichte/KontoWortAbo. Old "German school"
  site text; candidates for `cleanup` (check EXPERIMENTE.md first). Not translated.
- **LearnShell study variants A and C** (`study` prop, design study only) still German.
- **Mock URL bars** show the current German routes (`/grammatik` …); `routes` changes them.
- **Edgar, please check:** the B1 Preliminary part list in the homepage mock (Reading 6 parts ·
  45 min, Writing 2 parts · 45 min, Listening 4 parts · about 30 min, Speaking 4 parts ·
  12–17 min) is from memory of the 2020 format, not checked against cambridgeenglish.org
  this run. Also the exam disclaimer wording (which bodies to name).
- `hub-bilder.manifest.json` alt texts (German) need a decision: regenerate via
  `scripts/generate-hub-bilder.mjs` with English alts, or allow editing the manifest.

## Verification

- `pnpm build` (run after the main batches and again at the end): see the last section.
- `node scripts/check-i18n-luecken.mjs`: no component or layout above its baseline (pages still fail, as before this run).
- Spot check of `dist/index.html`: title/description English; nav menu labels English except
  data-driven topic names (grammar/culture titles from `src/data`).
