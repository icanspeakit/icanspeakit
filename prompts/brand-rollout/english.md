# Lane: english

You own `apps/english/**`. Source of truth: `brand/kit/` and its `MANIFEST.md`.

The English course still wears deutschacademy's teal and orange in `src/styles/global.css`
(`--brand-blue`, `--accent`, `--ink`, …). This lane moves its *page* colours to the icanspeak
palette. **The mascots keep their colours** (`src/lib/mascots.js` is not touched).

## Tier 1: tokens
- Map the kit's tokens onto the app's existing token names in `src/styles/global.css`
  (`--brand-blue*`, `--blue-50…900`, `--accent*`, `--ink`, `--muted`, `--border`, `--surface`,
  `--page-bg`, gradients, `--inverse-surface`). Write the mapping as a comment block at the top.
- Keep `--success`, `--danger`, `--warning`, `--info`, the gender colours and game palettes
  unless they fail AA or clash; list any change in your report.
- Fonts: the app uses "DA Chevron", Sora, Big Shoulders. Switch headings and body to the kit's
  fonts (Fraunces / Inter, or what DECISION says) via `--font-display` / `--font-body`. Keep
  `--font-voice` (Fredoka) for the mascots' speech.

## Tier 2: logos
- Replace `public/logos/*` and the favicons/web manifest at `public/` per the manifest; update
  header (SiteNav), footer ("part of icanspeak.it"), OG and JSON-LD.

## Tier 3: sweep
- Home, a grammar topic, vocabulary trainer, an exam page, a game, the placement test, teachers,
  account. Fix hard-coded teal/orange hex values in `src/styles/*.css` that are page chrome (not
  mascots, not functional). `grep -rn "0d9488\|0f766e\|f97316\|c2410c\|14b8a6" src/styles`.
- Update `docs/brand/BRAND.md` to the new state.
- Build, check, write `done/english.md`, commit.
