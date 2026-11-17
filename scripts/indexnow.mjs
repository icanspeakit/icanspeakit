#!/usr/bin/env node
// IndexNow (Bing, Yandex, Seznam; Bing's index feeds ChatGPT search): tell the engines which
// icanspeak.it URLs are new or changed, instead of waiting for a crawl.
//
//   node scripts/indexnow.mjs                    dry run: prints what it would send (default)
//   node scripts/indexnow.mjs --send             really submit
//   node scripts/indexnow.mjs --new              only URLs not in scripts/.indexnow-state.json
//   node scripts/indexnow.mjs --prefix /english/downloads   only URLs under that path (repeatable)
//   node scripts/indexnow.mjs --origin http://localhost:4321   read the sitemaps from another origin
//
// URLs come from the live sitemap index (https://icanspeak.it/sitemap.xml → every course's
// sitemap), so a new course or page is included by itself. The sitemaps carry no <lastmod>, so
// "changed" cannot be read from them: use --prefix for a section you just shipped, or --new to
// send only what was never submitted before (state file, not committed). Run it AFTER the deploy:
// the engines fetch the URLs right away.
// The key is the one in apps/hub/src/data/verification.ts; the file apps/hub/public/<key>.txt
// proves we own the host. SENDS ONLY WITH --send.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const values = (n) => args.flatMap((a, i) => (a === n && args[i + 1] ? [args[i + 1]] : []));
const HOST = 'icanspeak.it';
const origin = (values('--origin')[0] ?? `https://${HOST}`).replace(/\/$/, '');
const prefixes = values('--prefix');
const statePath = path.join(root, 'scripts', '.indexnow-state.json');

const key = readFileSync(path.join(root, 'apps/hub/src/data/verification.ts'), 'utf8').match(/INDEXNOW_KEY = '([0-9a-f]+)'/)?.[1];
if (!key) throw new Error('INDEXNOW_KEY not found in apps/hub/src/data/verification.ts');
if (!existsSync(path.join(root, 'apps/hub/public', `${key}.txt`))) throw new Error(`apps/hub/public/${key}.txt is missing`);

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
};
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
// Sitemaps list https://icanspeak.it/…; with --origin they are read from there but submitted as icanspeak.it.
const fetchable = (u) => u.replace(`https://${HOST}`, origin);

const urls = new Set();
for (const sm of locs(await get(`${origin}/sitemap.xml`))) {
  try {
    for (const u of locs(await get(fetchable(sm)))) urls.add(u);
  } catch (e) {
    console.warn(`skipped ${sm}: ${e.message}`);
  }
}
let list = [...urls].filter((u) => new URL(u).host === HOST);
if (prefixes.length) list = list.filter((u) => prefixes.some((p) => new URL(u).pathname.startsWith(p)));
const state = existsSync(statePath) ? new Set(JSON.parse(readFileSync(statePath, 'utf8'))) : new Set();
if (flag('--new')) list = list.filter((u) => !state.has(u));

console.log(`${list.length} URLs${flag('--send') ? '' : ' (dry run, nothing sent; add --send)'}`);
console.log(list.slice(0, 15).join('\n') + (list.length > 15 ? `\n… and ${list.length - 15} more` : ''));
if (!flag('--send') || !list.length) process.exit(0);

for (let i = 0; i < list.length; i += 10000) {
  const batch = list.slice(i, i + 10000);
  // --endpoint https://www.bing.com/indexnow when api.indexnow.org resets the connection (it
  // does from Edgar's machine); every IndexNow engine shares submissions with the others.
  const res = await fetch(values('--endpoint')[0] ?? 'https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList: batch }),
  });
  console.log(`batch ${i / 10000 + 1}: ${res.status} ${res.statusText}`); // 200/202 = accepted
  if (res.status >= 400) process.exit(1);
  batch.forEach((u) => state.add(u));
}
writeFileSync(statePath, JSON.stringify([...state].sort(), null, 0));
