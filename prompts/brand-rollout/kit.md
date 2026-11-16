# Lane: kit (step 1, runs alone)

Build the brand kit every other lane copies from. You own `brand/kit/**` and the "Decided"
section of `brand-design.md`.

## Sources in the repo
- `design/umbrella/icanspeak-tiles.svg` (+ `.png`): the ¡canspeak! wordmark, already outlined, in
  the round 4 tile world. Take the wordmark paths from here instead of re-setting the type, and
  the palette (`#172A6E`, `#FFC21A`, `#FF6F5E`, `#6FD6FF`, white).
- `design/umbrella/icanspeak-glass.svg` (+ `.png`): the glass key visual, for dark heroes/splash
  only, never as a logo.

## Tier 1: tokens
- `brand/kit/tokens.css`: the palette from DECISION.md §3 as CSS custom properties, using the
  token names of `apps/linguistics/src/styles/global.css` (`--color-ink`, `--color-bg`,
  `--color-primary`, `--color-accent`, …) plus a dark-theme block. For `bright`, derive ink,
  text, muted, border and soft tints yourself; every text colour must pass AA on its background.
- `brand/kit/tokens.md`: the same as a table, with the contrast ratio of each text pair.

## Tier 2: logos (skip if DECISION says `umbrella: keep` and `course_icons: dot`)
- Build the logos DECISION.md asks for, as **outlined SVG paths** (no font needed to render).
  Get the font from `@fontsource/fraunces` (or the matching fontsource package) and outline with
  fonttools or opentype.js. Never load Google Fonts.
- Files, light and dark each:
  - umbrella: `icanspeakit-wordmark(-dark).svg`, `icanspeakit-mark(-dark).svg`, `-mark-1024.png`
  - per course (english, spanish, french, portuguese, italian — only those in DECISION §4):
    `icanspeak-<lang>-wordmark(-dark).svg`, `-mark(-dark).svg`, `-mark-1024.png`, `-app.svg`,
    `-app-512.png`, `-app-1024.png`, `-apple-touch-icon.png`, `favicon.svg`, `favicon.ico`
- Prove each mark at 16 px and in one colour: put a contact sheet in `brand/kit/proof.html`.
- ⛔ EDGAR: show the contact sheet (path + a screenshot) and wait for "ok" before tier 3.

## Tier 3: fonts and manifest
- Any new font weight a decision needs (e.g. Fraunces 900, Fredoka) goes into
  `brand/kit/fonts/` as woff2 with a `fonts.css` using relative URLs, like
  `apps/*/public/fonts/icanspeak/`.
- `brand/kit/MANIFEST.md`: every kit file and where it goes in each app
  (`apps/<app>/public/logos/…`, `public/fonts/icanspeak/…`, which CSS file gets the tokens).
- Update `brand-design.md`: a new section "Decided (date)" at the top with what DECISION.md says
  and where the kit is; mark section 5's decisions as done.
- Write `done/kit.md` and commit.
