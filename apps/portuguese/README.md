# icanspeak Portuguese

A European Portuguese course for adults, A1 to C1, with Portugal's Portuguese (pt-PT) as the
standard, CAPLE practice (CIPLE A2 is the usual language proof for residence and nationality)
and a strong focus on living in Portugal. Brazilian usage appears only as notes. It lives at
<https://icanspeak.it/portugues/> (the language's own name; the hub 301s `/portuguese*` there).

It is the app `apps/portuguese` in the icanspeakit monorepo. The rest of icanspeak.it belongs to
other apps (`apps/hub` at `/`, `apps/linguistics`, the other courses), each its own Cloudflare
Worker on a path route: see **DEPLOY.md** at the repo root. This app shares no code with them.

It is a static Astro site with no backend and no integrations: everything runs in the browser.
See **ARCHITECTURE.md** for the structure and the backend seam (`src/lib/backend.js`), and
**docs/content-plan.md** for the content decisions.

## Build

You need Node 22.12 or newer and pnpm 10 (`packageManager` in `package.json` pins the version).
The build needs no environment variables, no network and no secrets.

From `apps/portuguese` (or from the repo root with `pnpm --filter @icanspeak/portuguese <script>`):

```sh
pnpm install
pnpm dev            # http://localhost:4321/portugues/
pnpm build          # writes dist/, takes a few minutes
pnpm preview        # serves dist/ at http://localhost:4321/portugues/
pnpm check:base     # run after the build: every URL in dist/ stays under /portugues/
```

`pnpm build` includes these steps:

1. `prebuild` clears old prerender output, runs the content validators (`check-content.mjs`)
   and writes the paid-content manifest.
2. `astro build` writes the pages, then the integrations add the base-language text, the entry
   pages for each UI language (de, es, fr, it), the sitemap and `llms.txt`.
3. `postbuild` runs the leak checks (`check:paid-leak`, `check:lehrwerk-leak`).

`pnpm check:base` is not part of the build, so run it yourself before a deploy (the root
`pnpm check:base` runs it for every app). Other checks are listed in `package.json` under
`check:*`; before a deploy also run `pnpm check:links`, and from the repo root
`node scripts/check-parity.mjs portuguese`. `pnpm check:site` crawls a running site in Chromium.

The build has to run in the app folder, because build-time code finds its data through
`process.cwd()`. `pnpm --filter` does that for you: pnpm runs a package's scripts in its folder.

## The base path

`src/lib/paths.js` holds the origin (`https://icanspeak.it`) and the base path (`/portugues`),
and `astro.config.mjs` reads them from there. Never hard-code a root-absolute URL: build it with
`withBase()`, `langPath()` or `absoluteUrl()` from that file. UI languages are a prefix after the
base, for example `/portugues/de/`.

`dist/` is flat: `dist/index.html` is the page at `/portugues/`. There is no `dist/portugues/`
folder; `cf:prepare` makes one for the Worker (below).

## Deploy

The course is a **Cloudflare Worker with static assets only** (no Worker code, no adapter), the
same setup as `apps/spanish` and `apps/english`. `wrangler.jsonc`:

- `name`: `icanspeak-portuguese`, in the account that holds the `icanspeak.it` zone (DEPLOY.md).
- `routes`: `icanspeak.it/portugues` and `icanspeak.it/portugues/*`, so the address without the
  trailing slash reaches the course too. Cloudflare picks the most specific route, so these win
  over the hub's `icanspeak.it/*`.
- `assets.directory`: `./cf-dist`, with `not_found_handling: "404-page"`.

One command builds and deploys (log in once with `pnpm exec wrangler login`):

```sh
pnpm --filter @icanspeak/portuguese run deploy   # build, then cf:prepare, then wrangler deploy
```

Use `run deploy` from the repo root: plain `pnpm deploy` there is pnpm's own built-in command.
Inside `apps/portuguese`, `pnpm run deploy` does the same. Deploy from a clean checkout, so no
old files in `dist/` ship.

What the steps do:

- **`pnpm build`** writes `dist/` (see above). Run `pnpm check:base` after it.
- **`pnpm cf:prepare`** prepares the upload folder in two steps:
  1. `../../scripts/nest-dist.mjs dist /portugues` deletes `cf-dist/` and copies `dist/` to
     `cf-dist/portugues/`. Workers static assets look files up by the full request path, and the
     route keeps the `/portugues` prefix, so the files have to sit under `portugues/`.
  2. `scripts/cf-hoist-headers.mjs` moves `_headers` (and `_redirects`, if there is one) from
     `cf-dist/portugues/` up to `cf-dist/`, because Cloudflare reads them only at the root of
     the assets folder. Their rule paths already start with `/portugues/`. It then counts the
     files in `cf-dist/` and stops with an error above the free plan's 20,000 files per Worker.
  `cf-dist/` is generated and not committed.
- **`wrangler deploy`** uploads `cf-dist/` and sets the routes from `wrangler.jsonc`.

`pnpm cf:preview` runs `cf:prepare` and then `wrangler dev`, which serves the build the way
Cloudflare would, at http://localhost:8787/portugues/.

**Size:** the last build (2026-11-22) has **FILECOUNT files** in `dist/` (FILECOUNT_CF in
`cf-dist/` after `cf:prepare`). The free plan allows 20,000 files per Worker, Workers Paid
100,000. Most of the files are the practice data in `inhalt/` and the four UI-language copies of
the entry pages; watch the count when a UI language or a large data set is added.

**Not deployed yet.** The root `pnpm run deploy` leaves Portuguese out until it launches (see
DEPLOY.md, "Before a course goes live"): add it there, deploy this Worker, then redeploy the hub,
whose course card for Portuguese is already `live: true`, and the other courses, whose
"five languages" pills then link here.

### After a deploy

Check these on the live site:

- `/portugues/` and `/portugues/de/`, `/es/`, `/fr/`, `/it/` load with their styles, fonts and
  images, and the header logo leads to `https://icanspeak.it/`.
- `/portugues/` comes from this Worker and `/` still comes from the hub (the hub's language
  picker shows the Portuguese card as live and links to `/portugues/`).
- `/portugues` without the slash reaches the course (the route covers both forms).
- `/portuguese/` and `/portuguese/anything` 301 to `/portugues/…` (the hub's redirect).
- An unknown URL such as `/portugues/nope` shows the course's 404 page with status 404.
- `/portugues/inhalt/` files send `X-Robots-Tag: noindex, nofollow`, and pages send
  `X-Content-Type-Options: nosniff` (`curl -I https://icanspeak.it/portugues/`).
- `/portugues/sitemap.xml` and `/portugues/llms.txt` list only `https://icanspeak.it/portugues/`
  URLs.
- A grammar page, a vocabulary deck with audio, the placement test and a CIPLE A2 practice set
  work in the browser, with no errors in the console.
- `pnpm check:site` passes; it crawls the live course by default.

### What the umbrella site has to do

Some things only work at the domain root, so this app can't do them:

- **`robots.txt`:** crawlers only read `https://icanspeak.it/robots.txt` (the hub).
  `public/robots.txt` holds the lines to merge there, including the sitemap line. Its AI-crawler
  group says `Disallow: /`, which would cover the whole domain once merged, so decide that scope
  on purpose.
- **Search Console:** submit `https://icanspeak.it/portugues/sitemap.xml`.
