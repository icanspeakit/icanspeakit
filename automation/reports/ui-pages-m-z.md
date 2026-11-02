# Run report: `ui-pages-m-z`

Run: 2026-10-29, `content` branch, unattended. Fresh start (no earlier commits or report for this
item). Scope: `src/pages`, files and folders starting m–z (68 files) plus the legal pages
`datenschutz`, `impressum`, `nutzungsbedingungen`. Not touched on purpose: `politik`,
`steueroasen`, `spiele/stadtfahrt`, `spiele/vorfahrt` (dropped modules, `cleanup` deletes them),
`satzmelodie/pruefen` (internal tool), data files except the legal sidecar.

How the work was split: I did titles, the legal pages and all merging/review myself; four helper
agents made the page chrome English in parallel, one area each (games, knowledge hub, exams,
skills). They edited only their `.astro` files and handed over `en.json` changes as key files,
which I reviewed and merged. One commit per area.

## Commits

| Commit | What |
|---|---|
| `910fcb8` | English `<title>`, description, breadcrumbs, JSON-LD names and mascot lines on 53 pages |
| `56a70b2` | Legal pages (see below) |
| `6844651` | Game pages: a / an / some, Brambleford, Bruno's Front Desk, The Manners Simulator; 16 missing `kn.*` keys |
| `a7f9c05` | Writing, speaking, vocabulary, reference, my mistakes, lesson, intonation, tongue twisters |
| `1c12985` | Exam pages for the English exam map; Führerschein card and row off the `/pruefungen` hub |
| `cb7d100` | Follow-up for the a–l item: ExamShell header/title on `/goethe`, `/dtz`, `/leben-in-deutschland` still named the German exams |
| `faa1602` | Knowledge hub (accents, English worldwide, slang, idioms, word traps, quotes, word stories), mascots, about page, draft homepage `/start-neu` |
| `bd62fe0` | i18n gap baseline lowered for m–z |
| `73835a4` | `MASCOT_LABELS` in `src/lib/mascots.js` English (“Bruno, the dachshund” …) |

`en.json`: 40 keys added, ~165 values changed (values that described the German course or had US
spelling, e.g. `dash.*` “practiced” → “practised”).

## Decisions

1. **Same rules as the a–l run**: keys where chrome is shared; pages with no keys at all became
   English-only with `lang="en"` (`stunde`, `pruefungsplan`, `nussnacht`, `umgangssprache`,
   `land-und-kultur`, `maskottchen`, `ueber-mich`, `start-neu`). Text that comes from data stays
   German (with its `lang="de"`) until its content run. Only the chrome around it changed, e.g. the
   intonation aria-labels are now “Listen to …” / “Repeat “…” and check the melody”.
2. **Exam pages follow content-plan §2.** `/start-deutsch-1` is the unbranded A1 English practice
   test, and its 60 % pass line is stated as our own convention. `/telc` = Trinity ISE,
   `/telc/sprachbausteine` = Use of English practice, `/testdaf` = IELTS Academic, `/pruefungen` =
   the hub for all of them. I wrote only general, public facts: ISE levels and modules; IELTS bands
   0–9 with no pass mark; IELTS paper times (Listening ≈ 30, Reading 60, Writing 60, Speaking
   11–14 min); IELTS ≈ CEFR pairs B2 5.5–6.5, C1 7–8, C2 8.5–9; Life in the UK 24 questions,
   45 min, pass 18. The Goethe/telc points table (`ExamFacts`) on `/start-deutsch-1` was removed
   because it only described the German exams; it is in git history.
3. **Führerschein** (dropped, §4) is gone from the exams hub cards and comparison table. Its keys
   stay unused until `cleanup`. The `/start-neu` draft and `/wissen/land-und-kultur` keep their
   driving links with neutral labels (“Driving”, “Cars and driving”).
4. **Legal pages.**
   - **What they said vs. reality.** The privacy policy still described deutschacademy's services:
     Supabase accounts, PostHog, GA4, Sentry, Brevo, Google sign-in, the Android app, Azure speech
     and a consent banner. None of these exist here (`backend.js`: every flag false). The page's own
     header says it must change when the code does.
   - **New privacy text.** I rewrote it from the code: progress only in localStorage, no cookies,
     no analytics, host logs, and LanguageTool when a learner clicks “Correct my text”. Read-aloud
     uses the browser voice and recordings stay on the device.
   - **Terms and Impressum.** These now name the English exams and say there are no accounts.
   - **Withdrawal notice.** The *Widerrufsbelehrung* for paid products was taken out of the terms,
     because nothing is sold and `/widerruf` is gone. The comment in `nutzungsbedingungen.astro`
     says how to put it back.
   - **Binding version.** German stays the binding text (the existing `LegalTranslation`
     mechanism). The English translation in `src/data/uebersetzungen/rechtliches.json` was
     rewritten to match, and only the server `<title>` is English.
   - **Other languages in the sidecar.** For every changed key I removed the other-language
     translations (ar, tr, uk, …), so none of them translates old German. Unchanged keys keep
     them. They aren't shipped anyway while the registry has only `en`.
   - **Date.** `LEGAL.lastUpdated` is now 29 October 2026.
5. **Gap baseline**: lowered for m–z files, removed the stale `mein-zugang`, `preise`, `widerruf`
   entries (files gone), and **added** `spiele/vorfahrt` (4) and `steueroasen` (19). Both were
   already failing the check before this run (not in the baseline), and they get deleted by
   `cleanup`, so keying them is wasted work.
6. `/pruefungen/fallen` chips: the data ids `dtz` / `telc` are both B1 slots that map to ISE I, so
   they read “ISE I mock test” / “ISE I practice tests”. `exams` should merge or rename them.
7. `wissen/sprachen`: the four stat tiles held facts about German (100 m native speakers, No. 1
   in the EU). They are hidden with `{false && …}` rather than replaced with English numbers I
   could not source here.

## Edgar, please review

- **Privacy policy (legal):**
  - I chose Art. 6 (1) (b) DSGVO as the legal basis for sending text to LanguageTool (requested
    function); (f) is the alternative.
  - Check “LanguageTooler GmbH” and the link `https://languagetool.org/legal/privacy`.
  - `li.hoster` says “Hosting-Anbieter” generically: name the host once one is chosen.
  - The `§ 25 Abs. 2 Nr. 2 TDDDG` sentence for localStorage is new.
  - Not legal advice; the sidecar stays `reviewed: false`.
- **LanguageTool is a live integration** the architecture says doesn't exist:
  `src/lib/schreibKorrektur.js` posts the learner's text to `api.languagetool.org` on click, with
  `language: "de-DE"`. The privacy policy now discloses it. Either gate it behind a `BACKEND` flag
  or keep it and switch it to `en-GB` (`reading-writing` item).
- **`/ueber-mich`:** a faithful translation and the facts are unchanged. The “Why this site?”
  paragraph now says EnglishAcademy takes the idea from his German teaching to English, and the
  lead says “I'm building EnglishAcademy for everyone who is learning English”. Please confirm the
  wording.
- **`/start-neu`:**
  - I dropped “tested in a real German class”.
  - “help in 11 languages” is no longer true while the UI is English-only.
- **IELTS C2 row** (8.5–9 ≈ C2) on the exams hub: a C2 entry exists only through IELTS.

## Left / uncertain

- **German UI in `src/lib`** behind these pages (not page files, outside this item):
  - games: `hochstapler/strings.js`, `quakiSpringt` `TXT`, `satzregen`, the `buergeramt` UI dict
    (it overwrites the English `data-ui` fallbacks at runtime), `nussnacht`, `knigge`, `lindenau`
  - `ausspracheCheck.js` (record button, `/zungenbrecher`)
  - `unterricht/lernseite.js` (`/stunde` content)
  - `pruefungsplan.js` (plan labels, `.ics` text)
  - `exam/saetze.js` / `registry.js` `EXAM_NAMES` (“Goethe-Zertifikat”, “telc Deutsch”)
  - `searchIndex.js` (“Prüfungsfallen”)
  - `melodieLabyrinth.js`
  
  Suggest a `ui-lib` queue item, or fold these into `games` / `exams` / `teachers`.
- **Still German data on these pages**, left for the content items:
  - writing and speaking tasks
  - `/praepositionen` rule tables (German cases)
  - `/satzmelodie` (German intonation throughout)
  - dialect map, beer map, language tree and decoder (`culture`)
  - culture topic titles on `/wissen/land-und-kultur`
  - slang groups (`idioms-mistakes`)
  - `downloads.json` PDF lists on `/wissen` (Goethe, telc, BAMF)
  - exam format blocks on `/telc/*` (`telc-formate.json`)
  - `fallen.json`, practice-set numbers (`sd1.row.*`, `tdf.row.*`, `telcSb.t.*`)
  - the zungenbrecher dialect take (“Bruno in Bavarian”)
  - German `alt` texts in `hub-bilder.json`
- **German game mechanics.** The artikel-sprint, nussnacht and hoer-safari mechanics are still
  der/die/das in code and data, with German voice files (`games`). The pages already say
  a / an / some. `/spiel` offers meaning languages en/ar/uk/ru/tr with English as the default,
  which fits the German course; rethink it for English.
- **a–l pages still have German `SectionMascot say="…"` lines** (e.g. `/grammatik`, `/aussprache`,
  `/berufe`). The gap check doesn't see props. Not fixed here (other item); a 10-minute follow-up.
- `scripts/validate-i18n.mjs` still crashes (expects `de.json`), inherited.

## Verification

- `timeout 1500 pnpm build`: **passed** (2438 pages, postbuild leak checks ok) at `bd62fe0`.
  The only later commit (`73835a4`) changes four label strings in an object literal.
- `node scripts/check-i18n-luecken.mjs`: “155 known gaps in 46 files, none new”.
- I scanned the built HTML of every m–z page (one sample per dynamic route) for German-looking
  text. What remains is data (task texts, topic titles, downloads, exam formats), the mascot names
  (fixed in `73835a4`) and image `alt` texts from the image manifest.
- Legal pages: every `data-lx` element on all three pages has an English translation in the
  shipped payload; the three `<title>`s are English.
