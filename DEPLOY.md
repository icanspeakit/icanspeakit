# Deploying icanspeak.it on Cloudflare

One domain, several apps. Each app in `apps/` is its own **Cloudflare Worker** with its own
path route on the `icanspeak.it` zone. Cloudflare picks the most specific matching route, so:

| Route | Worker | App | Kind |
|---|---|---|---|
| `icanspeak.it/english*` | `icanspeak-english` | `apps/english` | static assets only |
| `icanspeak.it/linguistics*` | `icanspeak-linguistics` | `apps/linguistics` | static + 2 API routes (TTS) |
| `icanspeak.it/rel/*` | `icanspeak-rel` | `apps/rel` | Worker code only: forwards analytics to PostHog EU (since 2026-11-17; deploy with `pnpm --filter @icanspeak/rel run deploy`) |
| `icanspeak.it/*` (everything else) | `icanspeak-hub` | `apps/hub` | static assets only |
| `icanspeak.it/espanol*` | `icanspeak-spanish` | `apps/spanish` | static assets only (was `/spanish*` until 2026-11-14; the hub 301s it) |
| `icanspeak.it/francais*` | `icanspeak-french` | `apps/french` | static assets only (was `/french*` until 2026-11-14; the hub 301s it) |
| `icanspeak.it/italiano*` | `icanspeak-italian` | `apps/italian` | static assets only (the hub 301s `/italian*`) |
| `icanspeak.it/intern*` | `icanspeak-admin` | `apps/admin` | ops board, static. **Not in the root `deploy` script**: set up Cloudflare Access for it first (apps/admin/README.md), then `pnpm --filter @icanspeak/admin run deploy` |
| later: `/portugues*` (the language's own name; base path already set, the hub 301s `/portuguese*`) | `icanspeak-portuguese` | `apps/portuguese` | static assets only |

Why one Worker per app: each deploys on its own (a course rebuild never touches the others),
and the static-asset limit applies per Worker: 20,000 files on the free plan, 100,000 on
Workers Paid. The English course is about 7,000 files today. Requests to static assets are
free; only the linguistics TTS routes run Worker code.

## One-time setup (Edgar)

Steps 1–5 are done: live on Cloudflare since 2026-11-05, www redirect since 2026-11-10.
The zone and the Workers are in "Hello@deutschacademy.com's Account".

1. **Move DNS to Cloudflare.** Add `icanspeak.it` as a site in Cloudflare and change the
   nameservers at the registrar. Routes only work on a zone Cloudflare serves.
2. **A proxied DNS record for the apex**, so requests reach Cloudflare at all: e.g. `A @ 192.0.2.1`
   or `AAAA @ 100::` (proxied, orange cloud). The Workers answer every path, so no real origin
   is needed. The old DNS-only wildcard `*.icanspeak.it → 216.198.79.1` (Vercel) was deleted
   on 2026-11-10. If the apex `A` still shows `216.198.79.1`, that's harmless while proxied (the
   hub Worker answers every path), but `192.0.2.1` is cleaner.
3. **www → apex:** a Redirect Rule `https://www.icanspeak.it/*` → `https://icanspeak.it/${1}`
   (301, preserve query string), plus a proxied `CNAME www → icanspeak.it`. Without the rule,
   www has no Worker route and falls through to the origin IP.
4. **Log in once:** `pnpm exec wrangler login` (from any app folder).
5. **Linguistics secret:** in `apps/linguistics`: `pnpm exec wrangler secret put ELEVENLABS_API_KEY`.

## Deploy

From the repo root, after `pnpm install`:

```
pnpm --filter @icanspeak/hub run deploy
pnpm --filter @icanspeak/linguistics run deploy
pnpm --filter englishacademy run deploy
pnpm --filter @icanspeak/spanish run deploy
pnpm --filter @icanspeak/french run deploy
pnpm --filter @icanspeak/italian run deploy
```

or `pnpm run deploy` for all live apps (it names them; Portuguese is left out until it launches, so a
half-converted copy never takes over its routes) (`pnpm deploy` without `run` is pnpm's own built-in command and fails with ERR_PNPM_INVALID_DEPLOY_TARGET). Each app's `deploy` script builds, then runs
`wrangler deploy` with that app's `wrangler.jsonc` (routes included).

Order for the first go-live: linguistics and english first, the hub last. The hub's
`icanspeak.it/*` route takes over the domain, including the old Vercel site's URLs.

## Before a course goes live

1. Its queue is done and merged into `monorepo`.
2. `pnpm check:parity` (root) passes for it: brand kit, analytics, scripts, manifest and the
   links to the other live courses are the same as in every other course (`scripts/check-parity.mjs`).
3. Spoken vocabulary: `node scripts/generate-vocab-audio.mjs <slug>` (Azure key in the root
   `.env.local`; about 5,000 clips, half an hour, rerunnable), then commit `public/audio/`.
4. Build, then `check:base` and `check:links` in the app.
5. Deploy the course, then flip its card to `live: true` in `apps/hub/src/data/courses.ts`, add
   its link to the "five languages" pills on every other course home (`src/pages/index.astro`,
   the parity check names the ones missing), add it to the root `deploy` script, and redeploy
   the hub and the other courses.

## Local preview

- `pnpm --filter @icanspeak/hub dev` on http://localhost:4320
- `pnpm --filter @icanspeak/linguistics dev` → http://localhost:4310/linguistics/ (the hub on 4320 sends its /linguistics links there)
- `pnpm --filter englishacademy dev`
- `wrangler dev` in an app folder serves its built output as Cloudflare would (`preview`).

## Checks

`pnpm check:parity` (root) compares every language course with the brand kit and with each other.

`pnpm check:base` (root) runs every app's check: no built page may link to a root path outside
its own base, because on icanspeak.it that path belongs to another Worker.

## Old URLs

The old icanspeak.it paths (`/blog/…`, `/words/`, `/exercises/…`, `/dashboard/…`, `/de/…`,
`/former-site/…`) now live under `/linguistics/`. `apps/hub/public/_redirects` sends them there
with a 301.

## Vercel

Retired. `main` no longer deploys anywhere by itself; deploys are `pnpm run deploy` (wrangler) only.
`vercel.json` is gone; delete the Vercel project in the Vercel dashboard if it still exists.

