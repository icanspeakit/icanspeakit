# icanspeak Italian

An Italian course for adults, A1 to C1, with standard Italian (italiano standard) as the
standard, CILS, CELI, PLIDA and CERT.IT practice, and a strong focus on living in Italy
(permesso di soggiorno, residenza, citizenship). It lives at <https://icanspeak.it/italiano/>.
The rest of icanspeak.it belongs to the other apps of the monorepo (see `DEPLOY.md` at the repo
root).

It is a static Astro site with no backend and no integrations: everything runs in the browser.
See **ARCHITECTURE.md** for the structure and the backend seam (`src/lib/backend.js`), and
**docs/content-plan.md** for the content decisions.

## Build

You need Node 22.12 or newer and pnpm 10 (`packageManager` in `package.json` pins the version).
The build needs no environment variables, no network and no secrets.

From the repo root:

```sh
pnpm install
pnpm --filter @icanspeak/italian dev         # http://localhost:4321/italiano/
pnpm --filter @icanspeak/italian build       # writes apps/italian/dist/, about 5 minutes
pnpm --filter @icanspeak/italian check:base  # after the build: every URL stays under /italiano/
pnpm --filter @icanspeak/italian preview     # serves dist/ at http://localhost:4321/italiano/
```

Inside `apps/italian` the same scripts run as `pnpm dev`, `pnpm build`, `pnpm check:base` and so
on. Build-time code finds its data through `process.cwd()`, so the scripts must run in the app
folder; `pnpm --filter` does that for you.

`pnpm build` includes these steps:

1. `prebuild` clears old prerender output, runs the content validators (`pnpm check:content`) and
   writes the paid-content manifest.
2. `astro build` writes the pages, then the integrations add the base-language text, the entry
   pages for each UI language, `sitemap.xml`, `llms.txt` and the legacy redirects in
   `_redirects`.
3. `postbuild` runs the leak checks (`check-paid-leak`, `check-lehrwerk-leak`).

`pnpm check:base` is not part of the build, so run it yourself before a deploy (the root
`pnpm check:base` runs it for every app). Other checks are listed in `package.json` under
`check:*`; `pnpm check:links` checks the internal links of the build, and `pnpm check:site`
crawls a running site in Chromium.

## The base path

`src/lib/paths.js` holds the origin (`https://icanspeak.it`) and the base path (`/italiano`), and
`astro.config.mjs` reads them from there. Never hard-code a root-absolute URL: build it with
`withBase()` or `absoluteUrl()` from that file. UI languages are a prefix after the base, for
example `/italiano/de/`.

`dist/` is flat: `dist/index.html` is the page at `/italiano/`. There is no `dist/italiano/`
folder; `cf:prepare` creates the nested copy for the Worker (below).

The path was `/italian` in the first plans. Since 2026-11-15 it is the language's own name,
`/italiano`, like `/espanol` and `/francais`; the hub 301s `/italian` and `/italian/*` there
(`apps/hub/public/_redirects`).

## Deploy

The course is a **Cloudflare Worker with static assets only** (no Worker code, no adapter), the
same setup as `apps/spanish` and `apps/french`. The root `DEPLOY.md` describes the account, the
zone and the one-time setup (DNS, `wrangler login`). The Worker config is `wrangler.jsonc`:

- name `icanspeak-italian`
- routes `icanspeak.it/italiano` and `icanspeak.it/italiano/*` on the zone `icanspeak.it`, so the
  address without the trailing slash reaches the course too. Cloudflare picks the most specific
  route, so these win over the hub's `icanspeak.it/*`.
- `assets.directory: ./cf-dist`, `not_found_handling: "404-page"`

From the repo root:

```sh
pnpm --filter @icanspeak/italian run deploy   # build, then cf:prepare, then wrangler deploy
```

(`run` matters: `pnpm deploy` without it is pnpm's own command and fails.) The script does:

1. **`pnpm build`** writes `dist/` as above. Run `pnpm check:base` after it; the deploy script
   does not.
2. **`pnpm cf:prepare`**:
   - `../../scripts/nest-dist.mjs dist /italiano` deletes `cf-dist/` and copies `dist/` to
     `cf-dist/italiano/`. Workers static assets look a file up by the full request path, so
     `/italiano/grammatica/` has to sit at `cf-dist/italiano/grammatica/index.html`.
   - `scripts/cf-hoist-headers.mjs` moves `_headers` and `_redirects` from `cf-dist/italiano/`
     to the root of `cf-dist/`, the only place Cloudflare reads them (their rule paths already
     start with `/italiano/`). It then counts the files in `cf-dist/` and fails if there are more
     than 20,000.
   `cf-dist/` is generated and ignored by git.
3. **`wrangler deploy`** uploads `cf-dist/` with the routes from `wrangler.jsonc`. An unknown
   address under `/italiano/` serves `italiano/404.html` with status 404.

`pnpm cf:preview` runs `cf:prepare` and `wrangler dev`, which serves the build locally the way
the Worker will.

Run a deploy from a clean, up-to-date checkout of the merged branch, so no stale file in `dist/`
ships. The root `pnpm run deploy` leaves Italian out until it launches (see "Before a course goes
live" in `DEPLOY.md`): add `--filter @icanspeak/italian` to it when the course goes live.

### Size

Last build (2026-11-17): **4,586 files** in `cf-dist/`, of them 2,965 HTML pages (1,301 of them
in the sitemap; the rest are noindex pages and redirect stubs). The free plan allows **20,000 files per
Worker** (100,000 on Workers Paid), and `cf:prepare` stops the deploy when the count is over the
limit. `_redirects` holds 402 static and 11 dynamic rules; Cloudflare allows 2,000 static and
100 dynamic. Spoken vocabulary (`public/audio/`, about 5,000 clips per `DEPLOY.md`) is not
generated yet; with it the count lands near 10,000, still under the limit. If the course ever
grows past 20,000, either move to Workers Paid or serve the audio from R2.

### After a deploy

Check these on the live site:

- `/italiano/` and `/italiano/de/` load with their styles, fonts and images.
- `/italiano` without the slash reaches the course (the route covers both forms).
- `/italiano/` comes from this Worker and `/` still comes from the hub; `/espanol/` and
  `/linguistics/` still come from their own Workers.
- `/italian/` (the old path) 301s to `/italiano/` (hub `_redirects`).
- An unknown URL such as `/italiano/nope` shows the course's 404 page with status 404.
- A few old addresses from `_redirects` answer 301 to their new page.
- Pages send `X-Content-Type-Options: nosniff`, and `/italiano/inhalt/` files send
  `X-Robots-Tag: noindex, nofollow` (from `_headers`; if they are missing, `_headers` was not
  hoisted to the root of `cf-dist/`).
- `/italiano/sitemap.xml` and `/italiano/llms.txt` list only `https://icanspeak.it/italiano/`
  URLs.
- A practice page loads its data (`/italiano/inhalt/…` fetches); once `public/audio/` exists,
  a vocabulary clip plays.
- PostHog receives page views for the course (Layout calls `initAnalytics("italian")`).
- `pnpm check:site` passes; it crawls `https://icanspeak.it/italiano` by default.

Then follow "Before a course goes live" in `DEPLOY.md`: the hub card (`live: true` in
`apps/hub/src/data/courses.ts`), the course pills on the other course homes, the root `deploy`
script, and redeploy the hub and the other courses.

### What the domain root has to do

Some things only work at the domain root, so this app can't do them:

- **`robots.txt`:** crawlers only read `https://icanspeak.it/robots.txt` (the hub's).
  `public/robots.txt` holds the lines to merge there, including the sitemap line. Its AI-crawler
  group says `Disallow: /`, which would cover the whole domain once merged, so decide that scope
  on purpose.
- **Sitemap index:** the hub lists `/<slug>/sitemap.xml` for every course with `live: true`.
- **Search Console:** submit `https://icanspeak.it/italiano/sitemap.xml`.
