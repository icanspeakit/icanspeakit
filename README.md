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

The site deploys as a **Cloudflare Worker with static assets only**, on the route
`icanspeak.it/spanish/*`. There is no Worker script, no adapter and no rewrite. This repo will
move into the icanspeakit monorepo as `apps/spanish`, and the Worker will be deployed from there.
The deploy is not set up yet.

The Worker config will look like this (Wrangler 4.148.0 or newer, which `assets.base_path` needs):

```jsonc
// apps/spanish/wrangler.jsonc
{
  "name": "icanspeak-spanish",
  "compatibility_date": "<date of the first deploy>",
  "routes": [{ "pattern": "icanspeak.it/spanish/*", "zone_name": "icanspeak.it" }],
  "assets": {
    "directory": "./dist",
    "base_path": "/spanish",
    "not_found_handling": "404-page"
  }
}
```

- `assets.base_path` maps `/spanish/about/` to `dist/about/index.html`, so the files stay at the
  root of `dist/`.
- `not_found_handling` makes unknown URLs show `dist/404.html` with a 404 status.
- `public/_headers` becomes `dist/_headers` and sets the response headers. Its rule paths are
  public URLs, so they start with `/spanish/`.

To deploy, run these from `apps/spanish`, in a clean checkout so no old files in `dist/` ship:

```sh
pnpm build && pnpm check:base
pnpm dlx wrangler@latest deploy
```

The build has to run in the app folder, because build-time code finds its data through
`process.cwd()`. `pnpm --filter icanspeak-spanish build` from the monorepo root also works, since
pnpm runs a package's scripts in that package's folder.

### After a deploy

Check these on the live site:

- `/spanish/` and `/spanish/de/` load with their styles and images.
- `/spanish/` still comes from this Worker and `/` still comes from the umbrella site.
- `/spanish` without the slash reaches the course. The route may not cover it (see below).
- An unknown URL such as `/spanish/nope` shows the course's 404 page with status 404.
- `/spanish/inhalt/` files send `X-Robots-Tag: noindex, nofollow`, and pages send
  `X-Content-Type-Options: nosniff`.
- `/spanish/sitemap.xml` and `/spanish/llms.txt` list only `https://icanspeak.it/spanish/` URLs.
- `pnpm check:site` passes; it crawls `https://icanspeak.it/spanish` by default.

### What the umbrella site has to do

Some things only work at the domain root, so this repo can't do them:

- **`/spanish` without a slash:** the route may not match it. If it doesn't, redirect it to
  `/spanish/` from the umbrella site, or add a second route for it.
- **`robots.txt`:** crawlers only read `https://icanspeak.it/robots.txt`. `public/robots.txt`
  holds the lines to merge there, including the sitemap line. Its AI-crawler group says
  `Disallow: /`, which would cover the whole domain once merged, so decide that scope on purpose.
- **Search Console:** submit `https://icanspeak.it/spanish/sitemap.xml`.
