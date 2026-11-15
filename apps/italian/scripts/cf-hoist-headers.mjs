#!/usr/bin/env node
// Runs after ../../scripts/nest-dist.mjs (see `cf:prepare` in package.json).
// nest-dist copies dist/ to cf-dist/italianoo/, so dist/_headers lands at cf-dist/italianoo/_headers.
// Cloudflare Workers static assets only read _headers (and _redirects) at the ROOT of the
// assets directory, so a nested copy would be served as a plain file and its rules ignored.
// This moves them to cf-dist/. Their rule paths already start with /italiano/ (public URLs),
// which is what Cloudflare matches against. Also prints the file count against the
// 20,000-files-per-Worker limit of the free plan.
import { existsSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const out = 'cf-dist';
const nested = join(out, 'italiano');
if (!existsSync(nested)) {
  console.error('cf-hoist-headers: cf-dist/italianoo does not exist; run nest-dist first');
  process.exit(1);
}
for (const name of ['_headers', '_redirects']) {
  const from = join(nested, name);
  if (existsSync(from)) {
    renameSync(from, join(out, name));
    console.log(`cf-hoist-headers: ${from} → ${join(out, name)}`);
  }
}

function count(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? count(join(dir, e.name)) : 1;
  }
  return n;
}
const files = count(out);
const LIMIT = 20000;
console.log(`cf-hoist-headers: ${files} files in ${out}/ (free-plan limit ${LIMIT} per Worker)`);
if (files > LIMIT) {
  console.error('cf-hoist-headers: over the free-plan limit; wrangler deploy will fail without Workers Paid');
  process.exit(1);
}
