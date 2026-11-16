# Site launch: rules for every lane

Goal: icanspeak.it relaunches with the new brand (logo "i canspeak!" with the four-colour split,
the tile world, the four brand colours) and the **English course live at /english/**, next to the hub
at / and linguistics at /linguistics/. **English first, one language only**: once it is live and Edgar
is happy, the other courses get the same branding (Spanish next, then French, Portuguese, Italian).
The branding is identical on every course; only the course pill text changes (english, español, …).

You are one of several Claude Code sessions in `C:\Users\Edgar\Projects\icanspeakit` at the same
time, on the branch `monorepo`. Your lane name and dev-server port are in your start message.

## Read first
1. `brand/kit/BRAND.md` (the rules), `brand/kit/MANIFEST.md` (where each file goes),
   open `brand/kit/preview.html` in a browser once to see the kit.
2. `README.md` and `DEPLOY.md` at the repo root, then the README / CLAUDE.md of the app you own.
3. Your lane file `prompts/site-launch/<lane>.md`. Work through it tier by tier without stopping
   between tiers; only the ⛔ EDGAR points are stops.

## What never changes
- The mascots: `src/lib/mascots.js`, `src/components/mascots/*` and their colours.
- Course content, exercise logic, routes (except where your lane file says so), i18n texts beyond
  brand names.
- Other apps' folders. You own only the folders your lane file names; everything else is read-only.
  `brand/kit/**` is read-only for everyone (report kit problems in your done file instead).

## Git
- Stage your files by name (`git add apps/hub/src/…`). Never `git add .`, `-A`, `commit -a`,
  `stash`, `checkout -- .` or `reset`. `git diff --cached --stat` before every commit.
- One logical change per commit: `feat(<lane>): …`, `fix(<lane>): …`, `chore(<lane>): …`.
- `index.lock` exists → another lane is committing: wait 5 s, retry up to 10 times, never delete it.
- No push, no merge into `main`, no `wrangler deploy` in step 1. The `release` lane does that, with Edgar.

## Builds and servers
- Dev server only on your own port (`--port <yours> --host`); never stop another lane's server.
- `pnpm install` and builds one at a time across lanes: before either, create `_tmp_parallel.lock`
  containing your lane name and the time; if it exists and is younger than 20 minutes, wait 30 s and
  retry; delete it right after. The course builds are big (thousands of pages): use
  `pnpm --filter <app> build`, never the root `pnpm build`.
- `pnpm --filter <app> check:base` must pass for every course app you touch.

## Checks
- Real browser at 1280×800 and 390×844: header, hero, one inner page, footer, favicon in the tab.
  No console errors, no 404s for assets. Contrast AA for every text colour you set.
  Screenshots to `_tmp_screens/<lane>/` (not committed).

## When you are done
Write `prompts/site-launch/done/<lane>.md`: what changed (files), decisions you took, what is left,
commit hashes, build time and file count of your app. Commit it last. Steps: 1 english alone, 2 hub + linguistics, 3 release (deploy), 4 spanish (only after English is live).
The launcher opens the next step once every done file of the current step exists.
