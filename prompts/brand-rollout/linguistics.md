# Lane: linguistics

You own `apps/linguistics/**`. Source of truth: `brand/kit/` and its `MANIFEST.md`.

## Tier 1
- Tokens into `apps/linguistics/src/styles/global.css` (this file defined the old tokens; keep
  the names, change the values; keep the two radial glows only if they still fit the palette).
- Swap `public/logos/` for the kit's outlined versions (the old ones load Literata from Google
  and fall back to Georgia inside `<img>`). Update header, footer, favicons, OG/JSON-LD logo URLs.

## Tier 2
- Walk every page type (magazine home, a blog post, word cards, an exercise, study, dashboard,
  former-site) and fix anything the new palette breaks: hard-coded hex values, SVG fills,
  chart colours. `grep -rn "#[0-9a-fA-F]\{6\}" src` is your list; leave functional colours.
- Build, check, write `done/linguistics.md`, commit.
