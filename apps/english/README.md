# icanspeak English

Static Astro site for learning English, served at **https://icanspeak.it/english/**.
No backend and no integrations yet: everything runs in the browser.

```sh
pnpm install
pnpm dev            # dev server (this lane uses port 4521: astro dev --port 4521 --host)
pnpm build          # → dist/ (plain static files, base /english)
pnpm check:base     # every URL in dist/ stays under /english/ (runs after build)
pnpm check:links    # crawls dist/ under /english/: broken links and missing assets
pnpm preview
pnpm check:content  # content validators (opt-in)
```

The domain and the base path live in one place: `src/lib/paths.js` (`SITE_ORIGIN`,
`BASE_PATH`). `astro.config.mjs` reads them. Every URL the course emits goes through that file
(`withBase`, `absoluteUrl`, `stripBase`, `currentPath`).

The brand is the icanspeak kit (`brand/kit/BRAND.md`). Colours, fonts and the tile layout come
from `src/styles/brand-tokens.css` (copied from the kit), `src/styles/tiles.css` and
`src/styles/brand.css`; the logos are in `public/logos/`.

See **ARCHITECTURE.md** for the structure, the backend seam (`src/lib/backend.js`) and the
content-migration plan.

## Deploy

The course is a Cloudflare Worker with **static assets only** (no Worker code). Its route is
`icanspeak.it/english` and `icanspeak.it/english/*` (`wrangler.jsonc`, the same setup as
`apps/spanish`). The root DEPLOY.md describes the account and the umbrella site.

```sh
pnpm --filter englishacademy deploy   # build, then cf:prepare, then wrangler deploy
```

- **`pnpm build`** writes `dist/`. The base path makes Astro write the pages without the
  `/english` prefix (`dist/index.html`, `dist/grammar/…`).
- **`pnpm cf:prepare`** runs `scripts/nest-dist.mjs`: it copies `dist/` to `cf-dist/english/`.
  The Worker's assets are looked up by the full request path, so the files must sit under
  `english/`. `cf-dist/` is generated and not committed.
- **`wrangler deploy`** uploads `cf-dist/` with `not_found_handling: "404-page"`: an unknown
  address under `/english/` serves `english/404.html`.

Size: the build has 6,988 files (`dist/`, last build). The free plan allows 20,000 files per
Worker, so there is room for about 13,000 more.

Known gaps at deploy time:
- Recordings under `/english/audio/` are not in the repository. `check:links` reports the one
  page that links to a missing recording as a note. The player hides without the file.
- `hello@englishacademy.com` (the contact address on the legal pages) is kept until an
  icanspeak.it mailbox exists.

After a deploy, check in a browser:
1. `https://icanspeak.it/english/` shows the new home page, the lockup (wordmark + yellow
   "english" pill) and the favicon in the tab.
2. One grammar topic, the vocabulary trainer, an exam page, one game and the placement test
   load without console errors.
3. `https://icanspeak.it/english/robots.txt` and `/english/sitemap.xml` answer 200.
4. An address that does not exist under `/english/` shows the course's 404 page.
5. `https://icanspeak.it/english/site.webmanifest` answers 200 and names the course.
