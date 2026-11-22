# Lane: courses (spanish, french, portuguese, italian)

You own `apps/spanish/**`, `apps/french/**`, `apps/portuguese/**`, `apps/italian/**` (only those
in DECISION §4). They are copies of the English course architecture, so do the same as
`english.md` tiers 1–3, once per app, **Spanish first**, then the others.

## Careful: overclaude writes content on other branches
- French is written by overclaude on `content-fr` (worktree in `overclaude\work\icanspeak-french`);
  Portuguese and Italian will follow. Your changes here will be merged with those branches later.
- So keep the change small and mechanical: token values in `global.css`, logo files, font files,
  the logo references in nav/footer/manifest. Do not restructure CSS files, rename classes or
  reformat. List every file you touched per app in your report, so a later merge is easy.

## Each app
- Tokens → `src/styles/global.css` (same mapping as english.md; copy the comment block).
- Logos → `public/logos/` (that course's files from the kit) and favicons/manifest.
- Update `docs/brand/BRAND.md`.
- Build that app (`pnpm --filter <name> build`, with the lock), `pnpm check:base`, commit
  per app: `feat(brand-courses): spanish …`.
- Write `done/courses.md` at the end, commit.
