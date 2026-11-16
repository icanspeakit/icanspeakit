# icanspeak French

A French course for adults, A1 to C1, with the standard French of France as the standard
(Canadian usage in notes), DELF, DALF, TCF and TEF practice, France's civic exam, and a strong
focus on living in France. It lives at <https://icanspeak.it/french/>.

It is the app `apps/french` in the icanspeakit monorepo. The rest of icanspeak.it belongs to
other apps (`apps/hub` at `/`, `apps/linguistics` at `/linguistics/`, the other courses at
`/english/`, `/spanish/` …). Each is its own Cloudflare Worker on its own path route; see
**DEPLOY.md** at the repo root. This app shares no code with the others.

It is a static Astro site with no backend and no integrations: everything runs in the browser.
See **ARCHITECTURE.md** for the structure and the backend seam (`src/lib/backend.js`), and
**docs/content-plan.md** for the content decisions.

## Build

You need Node 22.12 or newer and pnpm 10 (`packageManager` in `package.json` pins the version).
The build needs no environment variables, no network and no secrets.

From the repo root:

```sh
pnpm install
pnpm --filter @icanspeak/french dev          # http://localhost:4321/french/
pnpm --filter @icanspeak/french build        # writes apps/french/dist/, takes 2-4 minutes
pnpm --filter @icanspeak/french preview      # serves dist/ at http://localhost:4321/french/
pnpm --filter @icanspeak/french check:base   # run after the build: every URL stays under /french/
```

Inside `apps/french` the same scripts run as `pnpm dev`, `pnpm build`, `pnpm check:base` …
(`pnpm --dir apps/french build` also works). The build has to run in the app folder, because
build-time code finds its data through `process.cwd()`; `--filter` and `--dir` both do that.

`pnpm build` includes these steps:

1. `prebuild` runs the content validators (`pnpm check:content`) and writes the practice data to
   `public/inhalt/`.
2. `astro build` writes the pages, then the integrations add the base-language text, the entry
   pages for each UI language (de, es, pt, it), the sitemap and `llms.txt`.
3. `postbuild` runs the leak checks.

`pnpm check:base` is not part of the build, so run it yourself before every deploy. It fails on
any root-absolute URL outside `/french/`, because on icanspeak.it such a path belongs to another
Worker. Other checks are listed in `package.json` under `check:*`; `pnpm check:site` crawls a
running site in Chromium.

## The base path

`src/lib/paths.js` holds the origin (`https://icanspeak.it`) and the base path (`/french`), and
`astro.config.mjs` reads them from there. Never hard-code a root-absolute URL: build it with
`withBase()` or `absoluteUrl()` from that file. UI languages are a prefix after the base, for
example `/french/de/`.

`dist/` is flat: `dist/index.html` is the page at `/french/`. There is no `dist/french/` folder;
`cf:prepare` creates the nesting for the deploy (below).

## Deploy (Cloudflare Worker, static assets only)

The course is the Worker `icanspeak-french` (`wrangler.jsonc`), with **static assets only**: no
Worker script, no adapter, no server routes. Requests to static assets don't run Worker code.
Its routes on the `icanspeak.it` zone are `icanspeak.it/french` and `icanspeak.it/french/*`;
Cloudflare picks the most specific route, so these win over the hub's `icanspeak.it/*`.

The one-time setup (DNS on Cloudflare, `wrangler login`) is in the repo-root DEPLOY.md. Then,
from the repo root, in a clean checkout so no old files in `dist/` ship:

```sh
pnpm --filter @icanspeak/french build
pnpm --filter @icanspeak/french check:base
pnpm --filter @icanspeak/french deploy
```

`deploy` runs `pnpm build && pnpm cf:prepare && wrangler deploy` (so it builds again; the first
build is only there to run `check:base` on it). `pnpm cf:preview` runs `cf:prepare` and
`wrangler dev`, which serves the build as Cloudflare would.

### What `cf:prepare` does

1. `../../scripts/nest-dist.mjs dist /french` deletes `cf-dist/` and copies `dist/` to
   `cf-dist/french/`. Workers static assets look a file up by the full request path, so
   `/french/about/` has to be at `cf-dist/french/about/index.html`. `wrangler.jsonc` points
   `assets.directory` at `./cf-dist`. (`cf-dist/` is git-ignored.)
2. `scripts/cf-hoist-headers.mjs` moves `cf-dist/french/_headers` (and `_redirects`, if there
   ever is one) up to `cf-dist/_headers`. Cloudflare reads these files only at the root of the
   assets directory; nested, they would be ignored. Their rule paths already start with
   `/french/`. It then prints the file count and fails if it is over 20,000 (below).

Other settings: `not_found_handling: "404-page"` serves the nearest `404.html`
(`cf-dist/french/404.html`) with status 404 for unknown URLs under `/french/`.

### File count against the Worker limit

A Worker's static assets may hold at most **20,000 files on the free plan** (100,000 on Workers
Paid), and every file counts. On 2026-11-14 the build had **3,331 files** in `dist/` (1,594
pages; about 17% of the limit). `cf:prepare` prints the current count on every deploy. If the
course ever gets near the limit, the biggest levers are the per-item practice files in
`public/inhalt/` and the UI-language page copies; check those first.

### After a deploy

Check these on the live site:

- `/french/` and `/french/de/` (also `/es/`, `/pt/`, `/it/`) load with their styles, fonts and
  images.
- `/french/` comes from this Worker, `/` still comes from the hub, `/spanish/` and `/english/`
  from theirs.
- `/french` without the slash reaches `/french/` (the route `icanspeak.it/french` covers it).
- An unknown URL such as `/french/nope` shows the course's 404 page with status 404.
- The response headers apply: pages send `X-Content-Type-Options: nosniff`, and
  `/french/inhalt/` files send `X-Robots-Tag: noindex, nofollow`
  (e.g. `curl -sI https://icanspeak.it/french/ | grep -i x-content-type`). If they are missing,
  `_headers` did not end up at the root of `cf-dist/`.
- `/french/sitemap.xml` and `/french/llms.txt` list only `https://icanspeak.it/french/` URLs.
- A grammar page, a vocabulary set, the placement test and an exam page work (they fetch data
  and i18n JSON under `/french/`); the browser console shows no 404s.
- The hub's French card links to `/french/` (`apps/hub/src/data/courses.ts`, `live: true`).
- `pnpm check:site` passes; it crawls `https://icanspeak.it/french` by default.

### What the hub has to do

Some things only work at the domain root, so this app can't do them:

- **`robots.txt`:** crawlers only read `https://icanspeak.it/robots.txt`. `public/robots.txt`
  holds the `/french/` lines to merge there, including the sitemap line. Its AI-crawler group
  says `Disallow: /`, which would cover the whole domain once merged, so decide that scope on
  purpose.
- **Search Console:** submit `https://icanspeak.it/french/sitemap.xml`.
