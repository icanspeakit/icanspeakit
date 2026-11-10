# Done: lane spanish (site-launch, step 4)

Date: 2026-11-10. Owner: apps/spanish only.

**Status: built and checked locally, not deployed.** SHARED.md puts this lane after the English
release, and the release lane has not run (no `release.md` done file, and the deploy needs Edgar's ok).
This work was started on Edgar's request. The deploy, the DEPLOY.md route and the hub's course switch
(`apps/hub/src/data/courses.ts`) are still to do, after the English release and Edgar's ok.

## Commits (in order)
- `8b05fce1` chore(spanish): crawl the built site for broken links (tier 1, no fixes needed)
- `027d20e6` feat(spanish): the icanspeak brand on the course home and in the header (tier 2)
- `052e4c86` fix(spanish): keep the i18n files in their own format (tier 2)
- `82e7af8b` fix(spanish): white page ground, as in the kit (tier 2)
- `5ead8608` docs(spanish): the Deploy section matches the current setup (tier 3)

This done file is committed after them.

## What changed
- **Tier 1, build:** `pnpm --filter @icanspeak/spanish build` passes (prebuild content checks
  included). `check:base`: 1,813 files, every URL under `/spanish/`. `cf:prepare`: `cf-dist/spanish/`,
  3,339 files (under 20,000). No fixes were needed. `scripts/crawl-links.mjs` is the crawler from
  apps/english, with the audio folder exempt: 2,130 URLs, 1,466 pages, no broken links.
- **Tier 2, brand:**
  - Kit logos (`public/logos/`), favicons and manifest icons (`?v=3`), OG default (`public/og/`).
  - Self-hosted Fraunces 900 and Fredoka added to `public/fonts/icanspeak/`.
  - Kit tokens in `src/styles/brand-tokens.css`, mapped onto the app's names in `global.css`
    (same script as English), plus `brand.css`, `tiles.css` and `home4.css`.
  - Header: wordmark and the yellow "español" pill (`SiteNav.astro`).
  - Home page (`src/pages/index.astro`): the English layout (ribbon, hero tile grid, navy band,
    exercise cards from `catalog.js`, glass band, yellow placement band, footer), with Spanish copy.
  - Teal and orange page chrome mapped to the kit palette (5 files, 10 replacements).
  - `docs/brand/BRAND.md` is the kit's file.
  - Layout: favicons and theme colour, the brand CSS import, the kit OG image.
  - Manifest rewritten for the kit.
- **Tier 3, deploy:** the README's Deploy section matched an earlier plan (`assets.base_path`). It now
  matches `wrangler.jsonc` and `cf:prepare`, as in apps/english.

## Decisions I took
- **Copy:** the course's UI base language is English, so the home keeps English UI strings
  (buttons, band titles, the exercise cards, the glass band and the placement band use `data-i18n`).
  The Spanish parts are the headline ("Aprende español. Paso a paso."), the eyebrow ("Español de A1 a C1"),
  the two hero buttons ("Empieza donde estás", "Ver los exámenes"), and the four card titles and
  descriptions. These are hard-coded with `lang="es"`, which is the validator's rule for intentional
  Spanish. The hero lead reuses the existing key `home3.hero.lead`. I wrote the new Spanish
  sentences myself, as plain translations, with no new claims: **Edgar, please check the wording.**
- **i18n:** the eleven `home4.*` UI keys were added to `en.json` and to `de`, `fr`, `it`, `pt`,
  because the content validator requires every key in every language. The four translations are mine.
- **Glass band:** español is the only live course pill (it links to `/`). The other four are shown but
  not linked, as in English.
- **Mascot colours:** the palette sweep first changed two mascot colours on the mascots page. I restored
  them (Bruno `#f97316`, Regi `#0d9488`). English had the same problem and got the same fix (`e2b6dad2`).
- **Page ground:** white (`#ffffff`), as the kit and English use.

## Verified
- Build, `check:base`, crawler, `cf:prepare` (see Tier 1).
- Dev server on port 4522 (`http://localhost:4522/spanish/`), desktop width, on Browser 1 (`ec7101e3`,
  chosen by Edgar). Screenshots checked for these six page types, all rendering with the new header
  and no blocking errors: home (`/spanish/`), grammar topic (`/gustar/`), vocabulary trainer
  (`/vocabulary/a1/`), DELE page (`/dele/a2/`), game (`/games/gender-sprint/`), placement test
  (`/placement-test/`).

## Not verified / left
- **Phone width (390 px)** was not checked. The browser window does not shrink below about 1,560 px.
- **Dark mode** is mapped by hand, not checked.
- **Old Spanish logo files** (`public/logos/icanspeak-spanish-*`, `icanspeakit-*`) are still referenced
  by `Wordmark.astro`, `PartOfIcanspeak.astro`, `browserName.js` and the JSON-LD. They stay until those
  stop using them, then go in the same commit as the last reference.
- **`scripts/check-links.mjs`** (Spanish's own source-scanning check) is kept as it was. The crawler is
  `scripts/crawl-links.mjs`.
- **Duplicate key** `wissen.link.dgt.note` in `en.json` (already in the file) was kept as it was.
- **Hub and DEPLOY.md** are not touched (step 4 says they change with the deploy).

## Build
- `pnpm --filter @icanspeak/spanish build`: about one minute on this machine.
- Files: 3,339 in `cf-dist/spanish/`, under the 20,000-file Worker limit.
