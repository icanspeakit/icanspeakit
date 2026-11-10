# Done: lane english (site-launch, step 1)

Date: 2026-11-10. Owner: apps/english only.

## Commits (in order)
- `c3bce557` feat(english): serve the course under /english (base path), tier 1
- `d4748dd7` feat(english): link check, and fix the links it found, tier 2
- `0cd3e9c4` feat(english): rename the course to "icanspeak English", tier 3
- `3cf43d2b` feat(english): the icanspeak brand on the course home and in the header, tier 4
- `0b687e44` docs(english): deploy section in the README; wrangler comment up to date, tier 5

Nothing pushed, nothing merged into main, no `wrangler deploy` (step 1 rule).

## What changed
- **Base path (tier 1):** `astro.config.mjs` uses `site: https://icanspeak.it` and `base: /english`.
  `src/lib/paths.js` is the one place for both values (copied from apps/spanish, base `/english`).
  Also `src/middleware.js`, `scripts/check-base.mjs`, base-aware build integrations, Layout, the
  topic and idiom pages, `robots.txt`, `_headers`, `site.webmanifest`, runtime `fetch()` calls,
  `location` navigations and pathname checks (`currentPath()` / `stripBase()`).
- **Link check (tier 2):** `scripts/check-links.mjs` (`pnpm check:links`) serves `dist/` under
  `/english/` and crawls from there: 2,144 URLs, 1,470 pages, no broken links. Fixes: the fakten
  PDF generator read the file size before the stream was flushed; the three Bayern booklets
  (German fork, no generator here) were removed from `life-in-the-uk/facts`; nine OpenMoji SVGs
  and the generated `public/downloads/` PDFs are committed.
- **Name (tier 3):** EnglishAcademy and English Academy are now "icanspeak English" in UI, titles,
  JSON-LD, manifest, llms.txt, footers, docs and the PDF footers. Domain text is `icanspeak.it/english`.
- **Brand (tier 4):** kit logos, favicons (`?v=3`), self-hosted Inter and Fraunces; kit tokens copied
  to `src/styles/brand-tokens.css` and mapped onto the app's token names in `global.css`; old
  deutschacademy `@font-face` rules and preloads removed; header lockup (wordmark + yellow "english"
  pill); home page rebuilt on the design in `design/english-landing/` (`src/pages/index.astro`,
  `src/styles/home4.css`, `src/styles/tiles.css`); teal and orange page-chrome hex mapped to the
  kit palette (292 replacements in 54 files); `docs/brand/BRAND.md` is the kit's file. New copy:
  `home4.*` keys in `public/i18n/en.json`.
- **Deploy (tier 5):** README "Deploy" section; `wrangler.jsonc` comment updated.

## Decisions I took
- Email addresses keep `englishacademy.com` (`hello@…` in `legal.js` and `en.json`, the ICS UID, the
  Instagram handle). No icanspeak.it mailbox is confirmed. **Edgar: decide the contact address before launch.**
- Other courses (español, français, português, italiano) are shown as pills in the glass band but are not
  linked: they are not live yet.
- Glass band uses `public/img/home/icanspeak-glass.svg` (the umbrella key visual, served from public).
- `--accent` (orange) became sun yellow for fills. Where orange was text it became deep amber `#7a4f00`.
- Functional colours (success, danger, warning, info, level colours) were not changed.

## Verified
- `pnpm build`: 1,700 pages. `check:base`: 5,269 files, every URL under `/english/`
  (last build: 5,269 files; `dist/` now holds 6,988 files including assets).
- `pnpm check:links`: 2,144 URLs, no broken links. One known-missing asset, `/english/audio/...mp3`,
  is reported as a note (recordings are not in the repo).
- `cf:prepare`: `cf-dist/english/` (6,988 files, includes `404.html`, `_headers`).
- Local smoke test of `cf-dist`: `/english/`, `/english/grammar`, `/english/progress`, `robots.txt`,
  `sitemap.xml`, `site.webmanifest` return 200.
- Dev server on port 4521 (`/english/`) renders the new home page; desktop 1280 wide checked by screenshot.

## Not verified / left
- **Browser checks are incomplete.** The home page was checked at desktop width. The other five page
  types (grammar topic, vocabulary trainer, exam page, game, placement test) were not checked after the
  brand change. Phone width (390 px) was not verified: the browser window would not resize.
- The Chrome profile for the localhost checks was lost mid-session (the default profile was no longer
  connected); this needs a decision from Edgar before the remaining screenshots.
- Dark mode: the dark token block is mapped by hand to navy tints, but not checked on any page.
- Runtime JS that builds links in `innerHTML` was not swept for root-absolute paths beyond the
  fetch/navigation/pathname sites; the crawler does not read inline scripts. Check in the browser.
- `src/lib/audioSource.js` still falls back to the network path on the old domain for audio that is
  not in the repo (`https://icanspeak.it/english` is now the fallback origin after the rename).
- Components outside the home still name the old German fonts in literal `font-family` fallbacks
  (`uhr.css`, `font.css` for the font test pages, `akkusativ.css`). Harmless, but not cleaned up.
- en.json still has two German-fork strings: `format.t.dfbfc5d2` (Start Deutsch 1) and `mhelp.wortschatz.s3`
  ("Auf Deutsch"). overclaude's `ui-lang-*` items cover the translations.
- The touchpoint hint "Where do I stand?" (a JS-injected pill from `touchpoints.js`) sits over the nav
  at 1280 px. This is shared app behaviour, not changed here.
- Tier 2's `check:links` does not cover links built only at runtime from JS strings.

## Queue
`overclaude/projects/icanspeak-english/QUEUE.md`: ticked `base-path`, `link-check`, `brand`, `brand-theme`,
`deploy-readme` with "(done in icanspeakit, site-launch, 2026-11-10)". `ui-lang-*` left for overclaude.

## Build
- `pnpm build`: about one minute on this machine (the 1,700-page build took 51 s in the last timed run).
- Files: 6,988 in `dist/` (and `cf-dist/english/`), under the 20,000-file Worker limit.
