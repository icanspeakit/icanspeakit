# Lane: english (icanspeak.it/english/)

You own `apps/english/**`. The course is complete in content but **still builds for the root as
"EnglishAcademy"**. This lane makes it deployable under `/english/` and puts it in the new brand.
The items below come from overclaude's queue `icanspeak-english` (in
`C:\Users\Edgar\Projects\overclaude\projects\icanspeak-english\QUEUE.md`); you do them here instead.

## Tier 1: base path  (queue item `base-path`)
In apps/english: set `site: 'https://icanspeak.it'` and `base: '/english'` in astro.config.mjs (SITE_URL
default too). Make every internal link, asset, fetch, redirect (ACCOUNT_REDIRECTS, DROPPED_REDIRECTS,
the generated redirect tables), canonical, hreflang, OG image and JSON-LD URL base-aware, including the
build integrations (base-language, entry-pages, sitemap, llms-txt) and client modules that build URLs
(i18n.js, search, data fetches, the service worker if any). Add
`"check:base": "node ../../scripts/check-base.mjs dist /english"` to apps/english/package.json and to
postbuild. `pnpm --dir apps/english cf:prepare` must produce `apps/english/cf-dist/english/`.
**apps/spanish already went through exactly this**: read how it did it (its astro.config.mjs, its URL
helpers, `src/middleware.js`, `src/integrations/base-language.mjs`, scripts/nest-dist.mjs) and do the same.

## Tier 2: link check  (queue item `link-check`)
Add `apps/english/scripts/check-links.mjs` + `pnpm check:links` (no dependencies): serve dist/ under
/english/ with node:http on a free port, crawl from /english/, report broken internal links and missing
assets. Fix what it finds. (If apps/spanish has one, copy it.)

## Tier 3: name  (queue item `brand`)
Rename EnglishAcademy to "icanspeak English" everywhere in apps/english: en.json strings, page titles and
descriptions, Layout head, JSON-LD (Organization/WebSite), manifest/app name, llms.txt, OG image text if
generated, footer (link to https://icanspeak.it/), README, ARCHITECTURE.md, CLAUDE.md. Keep the package
name `englishacademy` (root scripts filter on it) and keep localStorage keys working (migrate old keys if a
prefix changes). Grep for "EnglishAcademy", "englishacademy.com", "Deutsch" leftovers in UI strings.

## Tier 4: the new brand  (replaces queue item `brand-theme`)
- Kit files per `brand/kit/MANIFEST.md`: logos, favicons (bump `?v=2` → `?v=3`), manifest icons,
  OG default, fonts. Replace `docs/brand/BRAND.md` with the kit's.
- `src/styles/global.css`: import the kit tokens and map the app's tokens onto them, with a comment block
  at the top listing the mapping: `--brand-blue*`/`--blue-*` (today deutschacademy teal) → navy and the
  soft tints, `--accent*` (orange) → sun yellow for highlights / coral for accents, `--ink` → navy,
  `--page-bg` white, gradients → navy/brand. Fonts: `--font-display` Fraunces 900, `--font-body` Inter,
  `--font-voice` Fredoka; remove the deutschacademy fonts (DA Chevron, Sora, Big Shoulders, Bungee Shade,
  Albert Sans, Aktiv Grotesk) from every `@font-face` and preload once nothing uses them.
- Header (SiteNav) and footer: new wordmark + yellow course pill "english"; footer "part of icanspeak.it".
- **Home page** (`src/pages/index.astro`): rebuild in the BRAND.md §5 pattern, following
  `design/english-landing/D-canspeak-tiles.dc.html` section by section (ribbon, hero with the 3×3 mascot
  tile grid, navy "What you practise here" band with one card per mascot, ribbon, exercise cards from
  `src/lib/catalog.js`, glass band with the five languages, yellow placement-test band, footer). Use the
  app's Mascot component, not image copies. Keep the existing data-i18n keys where the text is the same,
  add keys for new text in en.json.
- Sweep: hard-coded teal/orange hex values in `src/styles/*.css` that are page chrome
  (`grep -rn "0d9488\|0f766e\|14b8a6\|f97316\|c2410c" src/styles`). Functional colours stay but must
  pass AA. Check 6 page types: home, a grammar topic, vocabulary trainer, an exam page, a game, the
  placement test.

## Tier 5: deploy readiness  (queue item `deploy-readme`)
README section "Deploy": the Cloudflare Worker (assets only) per the root DEPLOY.md and
apps/english/wrangler.jsonc, `pnpm --filter englishacademy deploy`, what `cf:prepare` does, the 404
handling, what to test after a deploy. Count the built files (must stay under 20,000 per Worker on the
free plan; say the number). Compare `wrangler.jsonc` with apps/spanish's (routes `icanspeak.it/english`
and `icanspeak.it/english/*`, assets `./cf-dist`, `not_found_handling: "404-page"`).

## Last
In overclaude's `QUEUE.md` for icanspeak-english, tick `base-path`, `link-check`, `brand`,
`brand-theme` and `deploy-readme` (`- [x]`) with "(done in icanspeakit, site-launch, <date>)", so
overclaude doesn't run them again. Leave the `ui-lang-*` items for overclaude. Done file, commit.
