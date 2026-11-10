## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

On this machine a cold start often takes longer than the 30 s that `--background` waits
(hard-coded in astro's `cli/dev/background.js`); it then kills the server and reports
"failed to start within 30s". Check `astro dev status` first (one may already run). If not,
start it plainly as a background shell job, e.g. `npx astro dev --port 4391 --host > <log> 2>&1 &`,
and wait for the "ready" line in the log.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Project

icanspeak English: the deutschacademy architecture, English-only UI, **no integrations**.
Read ARCHITECTURE.md first. Rules that follow from it:

- Every service goes through `src/lib/backend.js` and its stand-in modules
  (`supabase/browser.js`, `api.js`, `analytics.js`, `monitoring.js`, `pronunciation/browser.ts`).
  Don't import a vendor SDK anywhere else.
- UI text: add the key to `public/i18n/en.json` and use `data-i18n` in the markup. The build
  renders it into the HTML (`src/integrations/base-language.mjs`).
- No server routes (`prerender = false`) until an adapter is added in `astro.config.mjs`.

## Git: one change, one commit

Several Claude sessions work in this folder at the same time. Other sessions' uncommitted
changes are NOT yours: never commit, revert, stash or "clean up" them.

- **Commit only the files you changed for this task.** Stage them by name:
  `git add src/data/grammatik/aduso.json public/i18n/en.json ...`
  Never `git add .`, `git add -A`, `git commit -a`, `git stash` or `git checkout -- .`
- Before committing, run `git diff --cached --stat` and check that every file listed belongs
  to your task. If a file you need also has someone else's changes in it (e.g. `public/i18n/*.json`),
  stage only your lines with `git add -p`, or stop and tell Edgar.
- **One logical change per commit.** A feature and an unrelated fix are two commits.
  Message format: `feat(area): what changed` / `fix(area): ...` / `docs: ...`, in English.
- **Push only when Edgar says so**, or when the prompt says "push". No remote or deploy target is set up yet.
- Before pushing: `git fetch`, then `git pull --rebase`. If the rebase fails because of
  uncommitted changes from other sessions, don't autostash; ask Edgar. Alternative: push from
  a temporary worktree (`git worktree add --detach <tmp> HEAD`, rebase there onto origin/main,
  `git push origin HEAD:main`, remove the worktree).
- Never commit `.env*`, `_tmp_*`, `.chk-tmp.mjs`, `dist/`, screenshots or reports.
- At the end, report: commit hash(es), the list of files, and whether it's pushed.

## Experimente: nie still löschen

Vergleichsseiten und Studien (z. B. `/nav1`–`/nav6`) werden in `EXPERIMENTE.md` geführt.
Bevor eins entfernt wird: dort unter „Archiv“ eintragen (was, Entscheidung, einführender und
entfernender Commit, Befehl zum Zurückholen). Wiederherstellen per `git revert` des
Entfernen-Commits oder `git checkout <commit>~1 -- <pfad>`.

## Knöpfe, die noch nicht bereit sind: nie `disabled`

Ein „Prüfen“, „Weiter“, „Starten“, das noch nicht geht (Lücken offen, nichts gewählt), bleibt
antippbar und sagt warum – sonst Wut-Klicks (Session-Replays). Statt `disabled`:
`waitAttrs(grund, markierung)` im HTML bzw. `setWaiting(btn, grund, markierung)` aus
`src/lib/notReady.js` (aria-disabled + data-why; Blase + Markierung kommen von dort, global).
`disabled` nur für „läuft gerade“ (senden, laden) und für Erledigtes. `npm run check:ux` meldet
graue Aktionsknöpfe ohne Grund.

## Marketing: immer als .md im Repo

Alles, was Marketing ist (Social-Posts, Newsletter, Ads, Store-Texte, Outreach-Mails,
Kampagnen-Ideen, Landingpage-Texte, Pressetexte …), entsteht als Markdown-Datei in
`docs/marketing/` – nicht als Artifact, Doc oder nur im Chat. Dateiname:
`<thema>-v1.md` (bei Überarbeitung `-v2` usw.). Danach in `docs/marketing/README.md` eine
Zeile ergänzen (Datei, Zweck, Datum) und nach den Git-Regeln oben committen (`docs: …`).
