# apps/admin: ops board at icanspeak.it/intern

Static Astro app, own Worker `icanspeak-admin`, route `icanspeak.it/intern*`.

- **Reminders:** `src/data/todos.json` (add an entry, set `done: true` when finished, redeploy).
- **Course status:** `scripts/collect.mjs` reads the repo at build time (audio files per folder,
  `/audio/<folder>` that pages reference but that has no files, lexicon size, last commit) into
  `src/data/status.json` (generated, git-ignored).
- **Deploy:** `pnpm --filter @icanspeak/admin run deploy`. The board refreshes only on deploy.

## Lock it first (Cloudflare Access)

The code has no login. Before the first deploy: Cloudflare dashboard → Zero Trust → Access →
Applications → Add → Self-hosted. Domain `icanspeak.it`, path `intern` (add a second entry for
`intern/*`). Policy: Allow, Emails = Edgar's address; login method One-time PIN. Check in a
private window that `https://icanspeak.it/intern` asks for the PIN. Pages also send
`X-Robots-Tag: noindex` and `Cache-Control: no-store`.
