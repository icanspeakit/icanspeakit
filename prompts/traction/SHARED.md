# Traction: rules for every lane

## Why this batch exists

deutschacademy.com (`C:\Users\Edgar\Projects\deutschacademy`, same architecture as the course apps
here) grew from 210 to ~1,550 sessions a week between 2026-09-27 and 2026-11-08. PostHog (project
288176, last 30 days, measured 2026-11-14) says where it comes from:

- **ChatGPT is the engine:** 1,767 sessions with `utm_source=chatgpt.com`, 37 → ~475 a week. Most
  "direct" traffic is ChatGPT. Google brings 147, Bing 203. Instagram: 2.
- **ChatGPT lands people on free material:** `/wissen` (free PDFs + links to the official model
  exams) 631, `/` 99, `/spiele` 82, `/es/downloads` `/pt-br/downloads` `/id/downloads`
  `/vi/downloads` `/hi/downloads` ~170 together, then exam practice (`/goethe/b2`, `/telc/b1`,
  `/dtz/uebungssatz`) and single grammar pages.
- **Google/Bing land teachers on one printable worksheet per grammar topic:**
  `/lehrkraefte/arbeitsblaetter/grammatik/<topic>` (genitiv, als-oder-wenn, praeteritum-…).
- **One email to a directory keeps paying:** Deutscher Bildungsserver lists `/wissen`, ~40 sessions a
  month (`deutschacademy/docs/seo-outreach-v1.md`).
- deutschacademy is verified in Bing Webmaster Tools (`msvalidate.01` in its Layout). ChatGPT search
  leans on Bing's index.

icanspeak.it today: per-course sitemaps exist (`/english/sitemap.xml` ~1,585 URLs, `/espanol/` ~1,470,
`/francais/` ~1,472) and `llms.txt` per course, but the root `robots.txt` is Cloudflare's boilerplate
with no `Sitemap:` line, there is no Bing/Google verification, and the English course's
`/knowledge` downloads and `src/data/arbeitsblatt/*` are still **German** content inherited from
deutschacademy (`leben-in-deutschland-*.pdf`, `grammatik-a1.pdf`, `adjektivdeklination.json` …).

**Goal of the batch: make the English course (https://icanspeak.it/english/) the thing ChatGPT and
Bing recommend when someone asks for free English practice material, the way /wissen is for German.**
English first. Spanish (`/espanol/`) and French (`/francais/`) follow in a later batch with the same
recipe, so build things so they can be copied (data-driven, no English hard-coded in logic).

## Where things are
- Source of the ideas: `C:\Users\Edgar\Projects\deutschacademy` (read-only for you; never commit there).
- This repo: `C:\Users\Edgar\Projects\icanspeakit`, branch `monorepo`, pnpm workspace, apps in
  `apps/*`. Read the root `README.md`, `DEPLOY.md`, `CLAUDE.md`, and the CLAUDE.md of the app you touch.
- Brand: `brand/kit/BRAND.md`. Never redraw or recolour the logo; mascots stay as they are.

## Content rules
- Everything we publish must be ours to give away. No publisher material (Cambridge, Oxford,
  Pearson, Hueber, Klett …). Official free sample papers (Cambridge, IELTS, Trinity) are **linked**
  where they are published, never re-hosted. Same rights split as `deutschacademy/src/pages/wissen.astro`.
- English the learner reads must be correct and natural (British English, the course's choice; check
  `apps/english` for the convention). UI text goes through `public/i18n/en.json` + `data-i18n`, as the
  app's CLAUDE.md says.
- No invented numbers, testimonials or claims. Counts come from the data (as `inventory.js` does).
- Each new page: a real `<title>`, meta description, canonical, JSON-LD like deutschacademy's
  (`src/lib/seo/jsonld`), in the sitemap and in `llms.txt`.

## Git
- Several lanes and other Claude sessions work in this folder at once. Other people's uncommitted
  changes are not yours: never commit, revert, stash or clean them up.
- Stage your files by name. Never `git add .`, `-A`, `commit -a`, `stash`, `checkout -- .`, `reset`.
  A shared file that also has someone else's changes (e.g. `public/i18n/*.json`): stage only your
  hunks (`git add -p`, or write the blob with `git hash-object -w` + `git update-index --cacheinfo`).
- `git diff --cached --stat` before every commit. One logical change per commit:
  `feat(english): …`, `feat(hub): …`, `docs: …`. End messages with the Co-Authored-By line Claude
  Code gives you.
- `index.lock` exists → another lane is committing: wait 5 s, retry up to 10 times, never delete it.
- No push, no merge into `main`, no deploy in step 1. The `release` lane does that, with Edgar.

## Builds and servers
- Dev server only on your own port (`npx astro dev --port <yours> --host` inside the app, as a
  background job); never stop another lane's or session's server. `astro dev` may refuse because
  another server for the same app is registered in `.astro/dev.json`: then use that one, don't `--force`.
- `pnpm install` and builds one at a time across lanes: before either, create `_tmp_parallel.lock`
  containing your lane name and the time; if it exists and is younger than 20 minutes, wait 30 s and
  retry; delete it right after. Use `pnpm --filter <app> build`, never the root build.
- `pnpm --filter <app> check:base` (and `check:links` for english) must pass for an app you touch.
- Ad blockers block files named `analytics*.js`: never let new UI depend on analytics loading
  (see `apps/spanish/src/lib/track.js`).

## Checks
- Real browser at 1280×800 and 390×844 for every new page type: no console errors, no 404s, no
  horizontal scroll, print preview for printables. Any connected Chrome profile is fine for localhost.
  Screenshots to `_tmp_screens/traction-<lane>/` (not committed).

## When you are done
Write `prompts/traction/done/<lane>.md`: what changed (files, URLs), decisions, what is left for
Edgar (each item one line, with the exact click path), commit hashes. Commit it last.
Step 1: indexing, downloads, worksheets, outreach in parallel. Step 2: release.
