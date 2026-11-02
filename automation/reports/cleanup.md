# Run report: `cleanup` (2026-11-02)

Item: remove the modules docs/content-plan.md marks as dropped (§4, plus the German word stories
of §5.11) and put the content validators back into `prebuild`.

Status: **done**. `pnpm build` is green (1,700 pages, prebuild gate "check:content ok — 9
validators", postbuild leak checks ok).

## Commits

| Commit | What |
|---|---|
| `db88ba4` | Führerschein module + driving games `/games/stadtfahrt`, `/games/vorfahrt` |
| `44e3053` | EXPERIMENTE.md: the removing commit of the two games |
| `39c80ac` | Politics (`/politik`) |
| `e10d4a7` | Tax havens (`/steueroasen`) |
| `79f0d17` | German beer map on `/knowledge/accents` |
| `c69bf28` | German noun declension (`/grammar/deklination`, KasusChart) |
| `98a924f` | Lexicon sidecars `de-fill.json`, `de-syn.json` |
| `137a0d4` | 342 German word stories |
| `7add3d2` | Content validators in prebuild (`scripts/check-content.mjs`) |
| (this one) | Report, content-plan §4 status, queue tick |

## What was removed

- **Führerschein**: `src/pages/fuehrerschein/**`, `src/data/fuehrerschein/**`,
  `uebersetzungen/fuehrerschein.json`, components (`FahrSzene`, `fuehrerschein/*`), libs
  (`fahrQuiz*`, `fahrSpiel`, `fahrSzene*`, `fuehrerschein*`, `stadtfahrt.js`, `vorfahrt/`),
  styles (`fahrspiel.css`, `fahr-szene.css`, `vorfahrt.css`), `check-fuehrerschein.mjs`,
  `fetch-verkehrszeichen.mjs`, `public/img/verkehrszeichen/`. Shared code cleaned: the
  Fahrschul-Wortschatz tab in `LernsetPicker`, the `fuehrerschein` language surface, `fs-` refs
  in the English-for-work deck code and its scripts, exam registry and catalog entries, the
  Quaki-kreuzt game in the games menu, deck swap, attempt refs, breadcrumbs, llms.txt, hub emoji,
  the Life in the UK cross-link, the `/start` draft, search index, 391 dead `fs.*`/`sf.*`/`vf.*` keys.
- **Politics**: page, `data/politik/`, `lib/politik/`, styles, `check-politik.mjs`, help
  translations, culture-menu entry, 2 nav keys.
- **Tax havens**: page, `steueroasen.js`, `steueroasen-map.json`, styles.
- **Beer map**: `bier.json`, `bier-karte.json`, `dachMap.js` (it only served the beer map),
  `generate-bier-karte.mjs`, the hidden section and its script on `/knowledge/accents`, `.bk-*`
  CSS, 81 `dialekte.bier.*` keys.
- **Declension**: the page, `KasusChart`, `kasus-haeufigkeit.json`, `lib/deklination.js`, its
  CSS, 20 `dk.*` keys. Site search no longer adds a German case table to a noun hit; the
  reference page and `nachschlagenIndex.js` lost their noun rows (they only linked there).
- **Lexicon sidecars** `de-fill.json`, `de-syn.json`: both were down to a `_note`.
- **Word stories**: all 342 `status: "geprueft"` stories (German, reviewed for deutschacademy).
  The 30 English stories stay.

## Redirects

`DROPPED` in `astro.config.mjs` (301):
- `/fuehrerschein` and its 23 subpages → `/exams`
- `/games/stadtfahrt`, `/games/vorfahrt` (+ the `/spiele/…` forms) → `/exercises`
- `/politik`, `/steueroasen` → `/culture`
- `/grammar/deklination`, `/grammatik/deklination` → `/grammar`
- the 29 German word stories that were public on 2026-11-02 → `/knowledge/word-stories`

Checked in `dist/`: the redirect pages point where they should.

## Validators in prebuild

`prebuild` = `clean-prerender` → **`check-content`** → `build-paid-manifest`.
`scripts/check-content.mjs` runs, each in its own process, stopping at the first failure:
check-einfach-pfad, check-pruefungen, check-berufe, validate-wortgeschichte, check-premium,
check-pruefungsplan, check-lindenau, check-redewendungen (the old `check:content` set minus
check-fuehrerschein) and validate-lexicon. All are green and take under a second together.
`pnpm check:content` runs the same file.

`check-premium.mjs` read `public/i18n/de.json`, which does not exist in this repo; it now reads
the base dictionary `en.json`.

Left out on purpose (documented in the script header), run by hand:
- `check-aussprache`: fails on 177 drill texts without audio (waits for a TTS provider, plan §9).
- `check-karten`: 4,010 findings, a card-quality report still tuned to German cards.
- `check-downloads`: fetches external links (network); 24 problems at the moment.
- `check-inhalte`: a QA report, not a gate (1 error, 102 warnings right now). Note: running it
  rewrites `docs/inhalte-qa/befunde.json` and `bericht.md`. I ran it once for this survey; that
  folder was already untracked before this run and is not committed by me.

## Decisions

- **The dropped games go to `/exercises`**, not `/games`: there is no `/games` hub page.
- **`fuehrerschein.css` and `stadtfahrt.css` stay**: `/games/manners` and `/games/brambleford`
  import them for the hero, box, HUD and buttons. Only their header comments changed. Renaming
  them (e.g. `sim-base.css`) is a safe follow-up.
- **`warm.json` and `wild.json` were deleted too.** They are German stories, but `entryLang()`
  read them as English because the lemma is the same in both languages. With no German stories
  left, that heuristic no longer matters.
- **Hub image manifests** (`hub-bilder.json`, `hub-bilder.manifest.json`) keep their `politik*`
  entries, and `public/og/politik*.jpg` and the hub images stay: content-plan §4 says image
  manifests are not touched. Nothing links to them now.
- **`src/data/suche-seiten.json`** (generated search index for pages without a data source) lost
  the entries of removed pages. The rest of it is still the German-era text, so regenerate it
  with `scripts/build-suche-seiten.mjs` at some point.

## For Edgar to review

- **No word story is public now.** The 30 English stories are drafts until you set
  `"status": "geprueft"`, so `/knowledge/word-stories` and the homepage card show nothing, and
  the daily-mail buffer is 0/60.
- If an English story later uses one of the redirected German slugs (`restaurant`, `note`, …),
  delete that slug from `DROPPED` in `astro.config.mjs`, or the redirect and the page collide.
- `lid` still has the German flag 🇩🇪 in some places? In `hub-emoji.json` I changed
  `/life-in-the-uk` to 🇬🇧 while removing the `/fuehrerschein` row next to it.

## Left over (not part of this item)

- Code paths that only served German content still exist but do nothing: `entryLang()`'s `de`
  branch and the German quote style in the word-story code, the `syn`/`deFill` handling in
  `lexicon.js`, `wortschatz-app.js`, `liveQuiz/questions.js`, `sameMeaning.js`, and the
  gap-sentence check in `check-erklaerungen.mjs`. Removing them is a code refactor, not content.
- `scripts/lang-coverage.mjs` reads `public/i18n/de.json`, which does not exist (this predates this run).
- `scripts/build-emails.mjs` and `preview-wort-mails.mjs` import `emails/*`, which was not
  copied into the fork (this predates this run).
- The architecture-template modules that are still German (Leben in Deutschland data shape,
  Bürgeramt naming, …) were mapped by earlier items. This run removed only what §4 lists.
