# Lane: hub (icanspeak.it/)

You own `apps/hub/**`.

## Tier 1: kit
- Copy logos, favicons, apple-touch-icon, OG image and fonts per `brand/kit/MANIFEST.md`.
- Import `brand/kit/tokens.css` and `tiles.css` (copied into `src/styles/`), replace the old warm-paper
  tokens in `hub.css` with the kit's. Header: the new wordmark (light) / dark variant where the
  background is dark; remove the old `icanspeakit-*` logo files once nothing references them.
- `<head>`: favicon.svg + favicon-32.png + apple-touch-icon, `og:image` → og-default.png, theme-color `#172A6E`.

## Tier 2: the hub page in the tile world
Rebuild `src/pages/index.astro` as the language picker in the BRAND.md §5 pattern:
- White header with the wordmark (no course pill on the hub), ribbon below it.
- Hero: "Learn a language. Step by step." style h1 (Fraunces 900, yellow highlighter), one line of
  lead, and the language picker as **tiles**: one big card per course from `src/data/courses.ts`
  (english, español, français, português, italiano), each with its mascot-colour tile and its pill.
  **English is live** (link to `/english/`); Spanish, French, Portuguese and Italian show
  "coming soon" (not links, `aria-disabled` text, not greyed to illegibility).
- A smaller card for **Linguistics** (`/linguistics/`): the word-story magazine and speech exercises.
- Glass band with the five languages (use `design/umbrella/icanspeak-glass.png`, copied to public,
  cropped with `object-position` to the lower two thirds), navy footer with the white wordmark,
  legal links (Impressum, privacy) as they are now.
- Update `src/data/courses.ts`: english `live: true` (or whatever flag it uses), the others not yet.
- Take the header, footer and tile markup from `apps/english` (done in step 1) so the hub and the course look the same.
- `404.astro` in the same look.

## Tier 3
- Lighthouse-style sanity: no layout shift from the tiles, images have width/height, page weight
  under 500 KB without fonts.
- `pnpm --filter @icanspeak/hub build`, browser check, done file, commit.
