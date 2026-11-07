# icanspeak Spanish: architecture

icanspeak Spanish is built on the icanspeak-english codebase, itself a copy of **deutschacademy**
(Astro, static pages). The whole content, practice and game architecture came across, and **every
external integration was removed**. English is the base interface language, and more languages
are added through the language registry.

> **Deploy:** the site is served at `https://icanspeak.it/spanish/`, as a Cloudflare Worker with
> static assets only. The repo moves into the icanspeakit monorepo as `apps/spanish`. See
> `README.md`.

## Stack

| Layer | What | Where |
|---|---|---|
| Framework | Astro 7, `output: 'static'`, **no adapter** | `astro.config.mjs` |
| Islands | React 19 (available; the site itself is vanilla `.astro` + JS modules) | `src/components/*.jsx` |
| Styling | Plain CSS files, design tokens in `global.css`, RTL-ready via `postcss-rtlcss` | `src/styles/` |
| Content | JSON data + content collections, read at build time with `node:fs` | `src/data/`, `src/content/` |
| Client logic | ES modules per feature, progress in `localStorage` | `src/lib/` |
| i18n | `data-i18n` keys → `public/i18n/en.json`, language registry | `src/lib/i18n.js`, `src/lib/languages.js` |
| Build steps | base-language render, entry pages, sitemap, llms.txt | `src/integrations/` |
| Checks | content validators, leak checks, UX sweep | `scripts/`, `pnpm check:*` |

## Directory map

```
src/
  layouts/Layout.astro     one layout for every page: head, SEO/JSON-LD, pre-paint scripts, globals
  pages/                   routes (~65 top-level + feature folders); all prerendered
  components/              ~140 .astro components (+ sims/, mascots/, wortgeschichte/ …)
  lib/                     ~400 client/build modules, one file or folder per feature
  data/                    JSON content per module (grammar, vocab, exams, games, culture …)
  content/                 content collections (lexicon, word stories)
  paid/                    premium content, split out at build time (scripts/build-paid-manifest.mjs)
  integrations/            Astro build hooks (see "Build pipeline")
  styles/                  ~130 CSS files, one per feature + global/components/tokens
public/
  i18n/en.json             every UI string (6,280 keys), the base dictionary
  assets/ img/ og/ fonts/  static media
  inhalt/                  generated paid-content manifests
scripts/                   validators, generators (PDFs, images), audits
tests/                     node:test suites (pnpm test:unterricht)
```

## Feature modules (all carried over)

Each module is roughly `src/data/<module>` + `src/lib/<module>` + `src/pages/<route>` + `src/styles/<module>.css`.

- **Grammar**: topic JSON (`data/grammatik/`, ~90 topics), rules, exercises, reference tables (`nachschlagen`), syllabus order, worksheets.
- **Vocabulary**: lexicon collection (`content/lexicon`), decks, flashcard trainer with SRS (`lib/srs.js`), picture cards, printable sheets.
- **Exams**: exam registry (`lib/exam/`), practice sets (`data/pruefungen/`), exam app shell, study plan.
- **Skills**: listening, reading/writing, speaking, pronunciation (patterns + browser voice), sentence melody.
- **Games**: game kit (`lib/spielKit.js`) and games (sprint, Satzregen, Quaki, Hochstapler, Nussnacht, Lindenau RPG, Bürgeramt sim …).
- **Teachers**: worksheets, partner exercises, printable games, live quiz, classes, surveys, lesson mode (local mode only, see below).
- **Culture & knowledge**: culture hub, quotes, word stories, dialects, idioms.
- **Learner shell**: placement test, "Einfach lernen" path, progress dashboard, my mistakes, mascots and help, search.

## No integrations: the backend seam

`src/lib/backend.js` is the single switchboard; every flag is `false`. The modules that used to
talk to a service keep their **exact exports** but run offline:

| Was | Now | File |
|---|---|---|
| Supabase auth/DB/realtime | fake client: signed out, queries resolve `{ data: null, error: OFFLINE }`, channels never connect | `src/lib/supabase/browser.js` |
| Server routes `/api/*` | `apiFetch()` answers 503 OFFLINE | `src/lib/api.js` |
| PostHog + GA4 + consent banner | no-op `track()` (dev logging via `localStorage["ea-debug-track"]`) | `src/lib/analytics.js`, `track.js` |
| Sentry | no-op | `src/lib/monitoring.js` |
| Stripe / paywall | `PUBLIC_PAYWALL` off; `<PremiumLock>` renders nothing but stays at every call site | `src/lib/access.js`, `components/PremiumLock.astro` |
| Azure speech (scoring, TTS) | browser provider: Web Speech voice, scoring reports `config` | `src/lib/pronunciation/browser.ts` |
| Brevo e-mail | removed | |
| Cloudflare Workers adapter, middleware, worker | removed: plain static `dist/` | |
| Capacitor Android app | removed (`audioPacks.js` kept as a stub) | |
| Account/checkout/merch pages | removed; their URLs redirect to `/account` | `astro.config.mjs` (`ACCOUNT_REDIRECTS`), `pages/account.astro` |

Features that only make sense with a server (live quiz rooms, teacher classes, cloud sync,
leaderboards) still compile and render, and they fail softly: you see "signed out / not
available", never a crash. To bring a service back, turn on its flag and replace the stand-in
module's body. Nothing else needs to change.

## i18n

- `src/lib/languages.js`: `LANGUAGE_REGISTRY` holds the languages, `BASE = "en"`. Add one with an
  entry plus `public/i18n/<code>.json`, then run `pnpm lang:coverage` (the `ui` surface only offers
  a language at 98 % in `docs/lang-coverage.json`). Fallback to `en` is automatic.
- `de` is a real language (German UI) **and**, in old data keys, the Spanish being learnt
  (`phrase.de`, `option.de`, `word.de`). Never look a value up with a UI code on such an object
  without checking; that's why `de` carries `cards.fetch` and stays out of the live quiz and games.
- A language with `urlPrefix` gets entry pages (`src/data/entry-pages.json` lists pages and
  per-language meta), e.g. `/spanish/de/`, with hreflang on both sides.
- Components carry server text plus a `data-i18n` key. **At build time**
  `src/integrations/base-language.mjs` fills every key from `en.json`, so the static HTML is
  English even without JS. In the browser, `src/lib/i18n.js` does the same for dynamic markup.
- RTL is already handled (postcss-rtlcss in `override` mode, `dir` set by `i18n.js`).
- Page `<title>`/`description` props and much body text inside the content JSON are still
  German. Those are content, not UI.

## Build pipeline

`pnpm build` runs:
1. `prebuild`: `clean-prerender` → `check-content` (the content validators, see below) → `build-paid-manifest` (paid content out of the public bundle)
2. `astro build`: prerender all pages
3. integrations, in order: `base-language` (English HTML) → `entry-pages` (per-language URLs; idle with one language) → `sitemap` → `llms-txt`
4. `postbuild`: `check-paid-leak` + `check-lehrwerk-leak`

The content validators gate the build again (since the `cleanup` run, 2026-11-02):
`scripts/check-content.mjs` runs them in prebuild, and `pnpm check:content` runs the same set by
hand. The file lists which validators are left out and why (audio, network, QA reports).

## Content migration (next phase)

For each module, in order of value:
1. Replace `src/data/<module>` JSON with English-course content in the same schema.
2. Rename German routes and slugs (`/wortschatz`, `/grammatik`, …) and add redirects.
3. Set page titles/descriptions in English.
4. Regenerate audio once a TTS provider is wired (`BACKEND.speech`).
5. Re-enable that module's validator in `prebuild`.

The old course's modules are converted: the exam slots hold DELE, SIELE and the CCSE, the
front-desk sim is the Extranjería sim, the driving module is the DGT vocabulary, and politics is
gone (docs/content-plan.md §2, §4.4, §5, §7). The data files keep their German names (§6).
