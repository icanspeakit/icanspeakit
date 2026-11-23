# icanspeak.it

Monorepo for icanspeak.it: language courses, with linguistics as one section. pnpm workspace,
Astro 7, deployed as one Cloudflare Worker per app on path routes (see [DEPLOY.md](DEPLOY.md)).

| App | URL | What |
|---|---|---|
| `apps/hub` | `icanspeak.it/` | the language picker: choose a course, or go to linguistics |
| `apps/english` | `icanspeak.it/english/` | the English course (formerly the englishacademy / icanspeak-english repo, merged with its history) |
| `apps/linguistics` | `icanspeak.it/linguistics/` | the former icanspeak.it site: word-story magazine, word cards, speech exercises, study formats, dashboard, the archived former-site |
| later `apps/spanish`, `apps/french`, `apps/portuguese`, `apps/italian` | `/spanish/` … | more courses, each built from the previous one |

Each app is independent: its own `package.json`, build, `wrangler.jsonc` and deploy. Nothing
is shared at runtime; the brand kit (logos, fonts, BRAND.md) is copied into each app.

## Commands (from the repo root)

```
pnpm install
pnpm build                                  # all apps
pnpm --filter @icanspeak/hub dev            # one app; also englishacademy, @icanspeak/linguistics
pnpm check:base                             # no built link escapes its app's base path
pnpm deploy                                 # all apps to Cloudflare (DEPLOY.md first)
node scripts/check-parity.mjs               # course shell parity; check:i18n findings show up as warnings
pnpm check:i18n [--app french] [--show 20]  # every public/i18n/<lang>.json against en.json
```

`check:i18n` reports missing, extra, empty, same-as-key, still-German and placeholder-mismatched
values, plus keys used in `src` that no dictionary has. Exceptions (parked keys waiting for
de.json, files with an inline dictionary) live in `scripts/check-i18n.allow.json`. It is clean
when it prints `total findings: 0`; `check-parity` only warns, the build's key gate is separate.

## Conventions

- **Base paths.** Every app except the hub has a `base` in `astro.config.mjs`. Never hard-code
  a root path: in linguistics use `u()` from `src/lib/url.ts`, in the courses their base-aware
  URL helpers. `scripts/check-base.mjs` enforces it on the built output.
- **Static first.** Pages are prerendered. Only `apps/linguistics/src/pages/api/tts*.ts` run
  as Worker code (ElevenLabs, secret `ELEVENLABS_API_KEY`).
- **Course content** is written by overclaude (`C:\Users\Edgar\Projects\overclaude`), one
  project per course, each on its own branch in this repo; see `handoff-courses.md`.

Project history and open decisions: [handoff.md](handoff.md) (the linguistics side) and
[handoff-courses.md](handoff-courses.md) (the courses).
