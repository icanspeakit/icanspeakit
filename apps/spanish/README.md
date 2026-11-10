# icanspeak Spanish

A Spanish course for adults, A1 to C1, with Castilian Spanish as the standard, DELE, SIELE and
CCSE practice, and a strong focus on living in Spain. It lives at
<https://icanspeak.it/spanish/>. The domain root is a separate site.

It is a static Astro site with no backend and no integrations: everything runs in the browser.
See **ARCHITECTURE.md** for the structure and the backend seam (`src/lib/backend.js`), and
**docs/content-plan.md** for the content decisions.

## Build

You need Node 22.12 or newer and pnpm 10 (`packageManager` in `package.json` pins the version).
The build needs no environment variables, no network and no secrets.

```sh
pnpm install
pnpm dev            # http://localhost:4321/spanish/
pnpm build          # writes dist/, takes a few minutes
pnpm preview        # serves dist/ at http://localhost:4321/spanish/
pnpm check:base     # run after the build: every URL in dist/ stays under /spanish/
```

`pnpm build` includes these steps:

1. `prebuild` runs the content validators (`pnpm check:content`) and writes the practice data to
   `public/inhalt/`.
2. `astro build` writes the pages, then the integrations add the base-language text, the entry
   pages for each UI language, the sitemap and `llms.txt`.
3. `postbuild` runs the leak checks.

`pnpm check:base` is not part of the build, so run it yourself before a deploy. Other checks are
listed in `package.json` under `check:*`. `pnpm check:site` crawls a running site in Chromium.

## The base path

`src/lib/paths.js` holds the origin (`https://icanspeak.it`) and the base path (`/spanish`), and
`astro.config.mjs` reads them from there. Never hard-code a root-absolute URL: build it with
`withBase()` or `absoluteUrl()` from that file. UI languages are a prefix after the base, for
example `/spanish/de/`.

`dist/` is flat: `dist/index.html` is the page at `/spanish/`. There is no `dist/spanish/` folder.

## Deploy

The course is a Cloudflare Worker with **static assets only** (no Worker code). Its route is
`icanspeak.it/spanish` and `icanspeak.it/spanish/*` (`wrangler.jsonc`), the same setup as
`apps/english`. The root DEPLOY.md describes the account and the umbrella site.

```sh
pnpm --filter @icanspeak/spanish deploy   # build, then cf:prepare, then wrangler deploy
```

- **`pnpm build`** writes `dist/` (flat: `dist/index.html` is the page at `/spanish/`).
  `pnpm check:base` runs after it and fails on any URL outside `/spanish/`.
- **`pnpm cf:prepare`** runs `scripts/nest-dist.mjs`: it copies `dist/` to `cf-dist/spanish/`.
  The Worker looks up assets by the full request path, so the files must sit under `spanish/`.
  `cf-dist/` is generated and not committed.
- **`wrangler deploy`** uploads `cf-dist/` with `not_found_handling: "404-page"`: an unknown
  address under `/spanish/` serves `spanish/404.html`.

Size: the build has about 3,340 files (`dist/`, last build). The free plan allows 20,000 files per
Worker.

Not deployed yet. The deploy runs only after Edgar's ok, and the hub's course list and DEPLOY.md
change with it.

### After a deploy

Check these on the live site:

- `/spanish/` and `/spanish/de/` load with their styles and images.
- `/spanish/` still comes from this Worker and `/` still comes from the umbrella site.
- `/spanish` without the slash reaches the course (the route covers both forms).
- An unknown URL such as `/spanish/nope` shows the course's 404 page with status 404.
- `/spanish/inhalt/` files send `X-Robots-Tag: noindex, nofollow`, and pages send
  `X-Content-Type-Options: nosniff`.
- `/spanish/sitemap.xml` and `/spanish/llms.txt` list only `https://icanspeak.it/spanish/` URLs.
- `pnpm check:site` passes; it crawls `https://icanspeak.it/spanish` by default.

### What the umbrella site has to do

Some things only work at the domain root, so this repo can't do them:

- **`robots.txt`:** crawlers only read `https://icanspeak.it/robots.txt`. `public/robots.txt`
  holds the lines to merge there, including the sitemap line. Its AI-crawler group says
  `Disallow: /`, which would cover the whole domain once merged, so decide that scope on purpose.
- **Search Console:** submit `https://icanspeak.it/spanish/sitemap.xml`.
