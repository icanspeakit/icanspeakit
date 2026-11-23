# icanspeakit house rules

pnpm monorepo for icanspeak.it. Course apps: `apps/english`, `spanish`, `french`, `italian`,
`portuguese` (clones of one German-origin site, they drift apart); `apps/hub` is the landing site.
Also `apps/admin`, `apps/linguistics`, `apps/rel`.

## Commands

- Install: `pnpm install` (pnpm 10, Node >= 22.12).
- Build one app: `pnpm --dir <abs path>/apps/<app> build`, or from the root `pnpm build:hub`,
  `build:english`, `build:spanish`, `build:french`, `build:italian`, `build:portuguese`,
  `build:linguistics`, `build:admin`. All apps: `pnpm build`.
- Shared checks: `node scripts/check-parity.mjs [app ...]` (every course carries the same shell;
  exit 1 on drift), `pnpm check:base` (per-app base-path check),
  `node scripts/scan-german-ui.mjs --app <name> --base <url>` (German text in a non-German UI;
  needs a running site or `--dist`, see the header of the script).
- `.githooks/pre-push` builds changed apps and runs check-parity; enable with
  `git config core.hooksPath .githooks`.

## Working rules

- Never use `cd`: use absolute paths, `git -C <path>`, `pnpm --dir <path>`, `node <abs path>`.
- Never switch branches, never push (a push deploys), never touch the base branch from a worktree.
- Stage by path, never `git add -A`. Leave the owner's uncommitted files untouched.
- Never print or commit secrets or `.env.local`.
- Keep changes mechanical and behaviour-neutral unless the task is content: the sites must look and
  work exactly as before.
- Per-app `CLAUDE.md` / `AGENTS.md` files are separate; don't edit them from here.

## Brand

Logo, icons, colours, fonts and the tile layout: `brand/kit/BRAND.md` (files and destinations in
`brand/kit/MANIFEST.md`). Never redraw or recolour the logo. The relaunch prompts are in
`prompts/site-launch/` (start with `start-site-launch.cmd`).

## Development (Astro)

Start the dev server in background mode: `astro dev --background`; manage it with
`astro dev stop`, `astro dev status`, `astro dev logs`. Docs: https://docs.astro.build
(routing, components, framework components, content collections, styling, i18n guides).
