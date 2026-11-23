# Preview deploys for branches

Status (2026-11-23): **not set up.** Nothing in the repo deploys by itself; this file is what the owner
has to do once. See `DEPLOY.md` for the production setup.

## How deploys work today

- No `.github/` folder, no `netlify.toml`, no `vercel.json` (Vercel retired, see DEPLOY.md).
- Each app in `apps/` is its own Cloudflare Worker (`apps/*/wrangler.jsonc`), assets only (except
  linguistics and rel), attached to a path route on the `icanspeak.it` zone.
- Production deploy = a person runs `pnpm run deploy` (builds, `cf:prepare`, `wrangler deploy`).
  A push to `main` deploys nothing. No Cloudflare Git integration is connected.
- So "every pushed branch gets a preview URL" needs something new: either Cloudflare Workers
  Builds (dashboard) or a GitHub Action (needs an API token as a repo secret). Both need a login
  or secret, so none was added by automation.

A preview is a Worker *version* uploaded with `wrangler versions upload`: it does not go live on the
route and gets its own `*.workers.dev` URL. Course apps are nested (`cf-dist/english/...`), so the
preview shows the course under `<preview-host>/english/`. Links to other apps inside a preview point
at production icanspeak.it (they are root paths on another Worker).

## Option A (recommended): GitHub Action + `wrangler versions upload`

Cost: free (GitHub Actions minutes for a private repo: 2,000/month on Free; Workers requests free).
Never touches production as long as the workflow is limited to non-`main` branches.

1. Cloudflare dashboard (account "Hello@deutschacademy.com's Account") → My Profile → API Tokens →
   Create Token → template "Edit Cloudflare Workers". Restrict to that account. Copy it.
2. Dashboard → Workers & Pages → right sidebar: copy the **Account ID**.
3. GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. Dashboard → Workers & Pages → each Worker → Settings → Domains & Routes: make sure the
   `workers.dev` route and **Preview URLs** are enabled (needs a workers.dev subdomain, set once
   under Workers & Pages → Account details).
5. Ask Claude to add `.github/workflows/preview.yml` with `on: push: branches-ignore: [main, monorepo]`,
   steps: checkout, pnpm + Node 22, `pnpm install --frozen-lockfile`, per changed app
   `pnpm --filter <app> build && cf:prepare && pnpm exec wrangler versions upload`, URL posted in
   the job summary. (Not committed here: it cannot run without steps 1-3 and could not be tested.)
6. Push a test branch; open the Actions run; the preview URL is in the summary.
7. Check `main` still has no workflow run (`branches-ignore`).

## Option B: Cloudflare Workers Builds (no GitHub secret, dashboard only)

Cost: free plan includes 3,000 build minutes/month, one build at a time. Nine Workers means nine
connections to set up.

1. Dashboard → Workers & Pages → the Worker (e.g. `icanspeak-hub`) → Settings → Builds → Connect.
2. Authorize the Cloudflare GitHub app for the repo, pick it.
3. Root directory: `/`. Build command: `pnpm --filter <app> run build && pnpm --filter <app> run cf:prepare`
   (hub and linguistics have no `cf:prepare`).
4. Deploy command: `npx wrangler deploy`. Non-production branch deploy command:
   `npx wrangler versions upload`.
5. Turn on "Builds for non-production branches".
6. **Watch out:** production branch builds then run `wrangler deploy` on every push to that branch,
   which makes a push to `main` deploy. That changes today's setup (push does not deploy). Set the
   production branch to a branch nobody pushes to, or accept auto-deploy. This is why Option A is
   recommended.
7. Repeat for the other eight Workers; set a build watch path (`apps/<app>/*`) so a hub change does
   not rebuild the English course (about 7,000 files).

## Not decided / to verify

- Whether preview URLs are on by default for the routes-only configs (the configs have no
  `workers_dev` key); step 4 of Option A covers it.
- The English course's 7,000+ files make every preview upload slow; limiting to changed apps matters.
