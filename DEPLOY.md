# Deploying icanspeak.it on Cloudflare

One domain, several apps. Each app in `apps/` is its own **Cloudflare Worker** with its own
path route on the `icanspeak.it` zone. Cloudflare picks the most specific matching route, so:

| Route | Worker | App | Kind |
|---|---|---|---|
| `icanspeak.it/english*` | `icanspeak-english` | `apps/english` | static assets only |
| `icanspeak.it/linguistics*` | `icanspeak-linguistics` | `apps/linguistics` | static + 2 API routes (TTS) |
| `icanspeak.it/*` (everything else) | `icanspeak-hub` | `apps/hub` | static assets only |
| later: `/spanish*`, `/french*`, `/portuguese*`, `/italian*` | `icanspeak-<lang>` | `apps/<lang>` | static assets only |

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
pnpm --filter @icanspeak/hub deploy
pnpm --filter @icanspeak/linguistics deploy
pnpm --filter englishacademy deploy        # only after the base-path item (see below)
```

or `pnpm deploy` for all of them. Each app's `deploy` script builds, then runs
`wrangler deploy` with that app's `wrangler.jsonc` (routes included).

Order for the first go-live: linguistics and english first, the hub last. The hub's
`icanspeak.it/*` route takes over the domain, including the old Vercel site's URLs.

## Before English can go live

`apps/english` still builds for the root (`site: englishacademy.com`, no base). The overclaude
queue `icanspeak-english` turns it into `/english` (`base-path`, `link-check`, then the brand
items). Until that is merged, don't deploy it; the hub's English card would point at a 404.

## Local preview

- `pnpm --filter @icanspeak/hub dev` on http://localhost:4320
- `pnpm --filter @icanspeak/linguistics dev` → http://localhost:4321/linguistics/
- `pnpm --filter englishacademy dev`
- `wrangler dev` in an app folder serves its built output as Cloudflare would (`preview`).

## Checks

`pnpm check:base` (root) runs every app's check: no built page may link to a root path outside
its own base, because on icanspeak.it that path belongs to another Worker.

## Old URLs

The old icanspeak.it paths (`/blog/…`, `/words/`, `/exercises/…`, `/dashboard/…`, `/de/…`,
`/former-site/…`) now live under `/linguistics/`. `apps/hub/public/_redirects` sends them there
with a 301.

## Vercel

Retired. `main` no longer deploys anywhere by itself; deploys are `pnpm deploy` (wrangler) only.
`vercel.json` is gone; delete the Vercel project in the Vercel dashboard if it still exists.

