#!/usr/bin/env node
// Copies a static Astro build into cf-dist/<base>/ for a Cloudflare Worker on a path route.
//   node ../../scripts/nest-dist.mjs dist /english   →  cf-dist/english/…
// Why: with `base: '/english'`, Astro writes dist/index.html, dist/grammar/… (not
// dist/english/…). The Worker's route is icanspeak.it/english/*, and Workers static assets look
// files up by the full request path, so they have to sit under english/ in the assets folder.
// Assets-only Workers serve these without running (and billing) any Worker code.
// Apps built with the Cloudflare adapter (apps/linguistics) don't need this: the adapter
// already nests the client output under the base.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const [src = 'dist', base] = process.argv.slice(2);
if (!base || !base.startsWith('/') || base === '/') {
  console.error('usage: nest-dist.mjs <dist> </base>');
  process.exit(1);
}
if (!existsSync(src)) {
  console.error(`nest-dist: ${src} does not exist; build first`);
  process.exit(1);
}
const out = 'cf-dist';
rmSync(out, { recursive: true, force: true });
const target = join(out, base.replace(/^\/+|\/+$/g, ''));
mkdirSync(target, { recursive: true });
cpSync(src, target, { recursive: true });
console.log(`nest-dist: ${src} → ${target}`);
