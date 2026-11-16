# Lane: release (step 2, runs alone)

indexing, downloads, worksheets and outreach are done. Read their done files first.

## Tier 1: verify
- Build hub and english one after another (`pnpm --filter <app> build`, lock file per SHARED.md).
  `check:base` for english, `check:links` for english, `check:parity` (report new errors only;
  there are many old ones from other apps).
- Local check: `/english/knowledge`, two `/english/<lang>/downloads`, the worksheet index and three
  worksheets (print preview), the hub's `robots.txt`, `sitemap.xml`, `llms.txt`.
- Read `DEPLOY.md` and `memory`-style notes in the repo for how icanspeak.it deploys today
  (Cloudflare Workers via wrangler; check deploys with wrangler, never poll production in a loop).
- ⛔ EDGAR: post a summary (commits per lane, new URLs with counts, screenshots of /knowledge and
  one worksheet on desktop and phone, the EDGAR list from the done files) and wait for "go".

## Tier 2: merge and deploy (only after "go")
1. `git fetch`, then bring `monorepo` into `main` as DEPLOY.md says, push `main`.
2. Deploy english, then hub (hub last). After each: the home, `/english/knowledge`, one worksheet,
   one PDF, a 404, `https://icanspeak.it/robots.txt`, `https://icanspeak.it/sitemap.xml`.
3. Run `scripts/indexnow.mjs` for the new and changed URLs (the indexing lane's done file says how).
4. Write `done/release.md`: deployed versions, URLs submitted to IndexNow, Edgar's remaining
   clicks (Bing Webmaster, Search Console, outreach sends), and the date to re-measure in PostHog
   (project 344818, `utm_source = chatgpt.com` and referring domain bing/google, 4 weeks out).
   Commit and push.

If a deploy fails, stop, write what happened in the done file and tell Edgar; don't retry blindly.
