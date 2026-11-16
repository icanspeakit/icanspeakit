# Brand rollout: rules for every lane

You are one of several Claude sessions working in `C:\Users\Edgar\Projects\icanspeakit` at the
same time, on the branch `monorepo`. Your lane name and dev-server port are in your start message.

## Before anything
1. Read `prompts/brand-rollout/DECISION.md`. If it says `status: open`, stop and tell Edgar.
2. Read `brand-design.md` (repo root) and the README of every app you touch.
3. Read `prompts/brand-rollout/<your lane>.md` and work through it tier by tier without stopping
   between tiers. Only the ⛔ EDGAR points are stops.

## What never changes
- **The mascots.** Do not edit `src/lib/mascots.js`, `src/components/mascots/*` or any mascot
  colour in any app. Pages change colour around them.
- Functional colours (correct/wrong, levels, gender colours in exercises) stay functional; only
  harmonise them if they clash, and say so in your report.
- Course content, routes, i18n text. This is a look change, nothing else.

## Your area
Each lane owns its own folders (see your lane file). Outside them, read only. Shared files you
may need: `pnpm-lock.yaml`, root `package.json`, `brand-design.md`, `brand/kit/**`
(owned by the kit lane). Re-read a shared file right before editing it, change only your lines,
never revert or reformat lines you did not write.

## Git
- Commit only your own files, staged by name (`git add apps/hub/src/styles/hub.css …`). Never
  `git add .`, `-A`, `commit -a`, `stash`, `checkout -- .` or `reset`.
- Run `git diff --cached --stat` before each commit and check every file is yours.
- One logical change per commit: `feat(brand-<lane>): …` / `fix(brand-<lane>): …`.
- If git says `index.lock` exists, another lane is committing: wait 5 s and retry (up to 10 times).
  Never delete `index.lock` yourself.
- **No push.** Never merge into `main`. Edgar pushes.

## Builds and servers
- Dev server only on your own port (`--port <yours> --host`). Never stop another lane's server.
- `pnpm install` and full builds one at a time: before either, create `_tmp_parallel.lock` with
  your lane name and the time in it. If it exists and is younger than 15 minutes, wait 30 s and
  retry. Delete it right after. A single app build (`pnpm --filter <app> build`) counts too.
- `pnpm check:base` must pass for every app you touched.

## Checks
- Look at your pages in a real browser at 1280×800 and 390×844, light and dark if the app has a
  dark theme. No console errors. Check contrast (WCAG AA, 4.5:1 for body text) for every text
  colour you set. Screenshots go to `_tmp_screens/<lane>/` and are not committed.

## When you are done
Write `prompts/brand-rollout/done/<lane>.md`: what changed (files), what you decided instead of
assuming, what is left, commit hashes. Commit it as your last commit. The launcher uses these
files to know the step is finished.
