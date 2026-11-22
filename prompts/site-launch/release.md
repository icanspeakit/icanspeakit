# Lane: release (step 2, runs alone)

english, hub and linguistics are done. Read their done files first. Spanish is not part of this release.

## Tier 1: align and verify
- Align header/footer markup between english and the hub where it's a small change.
- Build every app once, one after another (`pnpm --filter <app> build`): hub, linguistics, english
  (`englishacademy`). `check:base` for the two apps with a base. `check:links` for english.
- Local end-to-end: serve each app's `cf-dist` under its path (or `wrangler dev` per app) and click
  from the hub to /english/ and back. Favicons in the tab, no 404s.
- Update `DEPLOY.md`: the "Before English can go live" section removed, deploy order; update the
  root `README.md` table (English live, Spanish next).
- Update `brand-design.md`: a section "Live (date)" pointing to `brand/kit/`.
- ⛔ EDGAR: post a summary (commits per lane, file counts, screenshots of the hub and /english/ on
  desktop and phone) and wait for "go".

## Tier 2: merge and deploy (only after "go")
1. `git fetch`, then merge `monorepo` into `main` (fast-forward if possible, else a merge commit
   "Merge monorepo: icanspeak.it relaunch"), push `main`.
2. Deploy in this order, checking each URL before the next:
   `pnpm --filter @icanspeak/linguistics deploy` → https://icanspeak.it/linguistics/
   `pnpm --filter englishacademy deploy` → https://icanspeak.it/english/
   `pnpm --filter @icanspeak/hub deploy` → https://icanspeak.it/ (last: its `/*` route catches everything else)
3. After each: the home, one deep page, one asset, a 404, the favicon (hard refresh).
4. Write `done/release.md` with the deployed versions and anything left (ui languages for English
   stay with overclaude's queue; Spanish next: the next click on start-site-launch.cmd opens it, then French,
   Portuguese, Italian). Commit and push.

If a deploy fails, stop, write what happened in the done file and tell Edgar; don't retry blindly.
