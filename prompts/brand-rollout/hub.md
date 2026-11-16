# Lane: hub

You own `apps/hub/**`. Source of truth: `brand/kit/` and its `MANIFEST.md`.

## Tier 1
- Copy the kit's tokens into `apps/hub/src/styles/hub.css` (replace the old values, keep names
  the app's CSS already uses; map them if they differ).
- Replace logos and favicons in `apps/hub/public/` per the manifest; update every reference in
  `src/layouts/Hub.astro`, `src/pages/*.astro` and the web manifest.
- New font weights: copy into `public/fonts/icanspeak/` and extend `fonts.css`.

## Tier 2
- The language picker cards (`src/data/courses.ts`, `src/pages/index.astro`): use the course
  marks from the kit. If DECISION says `inverted`, the cards show ¡en ¡es ¡fr ¡pt ¡it.
- If DECISION's notes ask for the round 4 tile world on the hub, build the hero as a CSS/SVG
  tile grid (no images), 200 px modules, wordmark in a white centre band.
- Build, check, write `done/hub.md`, commit.
