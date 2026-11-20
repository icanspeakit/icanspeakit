#!/usr/bin/env node
// Fails when a built page links to something the build did not produce.
//   node scripts/check-links.mjs <app>                 e.g. english, spanish, hub (reads apps/<app>)
//   node scripts/check-links.mjs <dist dir> <base>     e.g. apps/english/dist /english
// Checked, per .html page: href, src, srcset/imagesrcset, poster, action, data-href, meta refresh,
// og:image/twitter:image, <link rel=canonical|alternate hreflang>; plus every <loc> of sitemap*.xml.
// Absolute URLs on the own origin are mapped to site paths. Relative URLs resolve against the
// page. A site path under <base> is looked up in the folder with the base stripped; a path
// outside <base> belongs to another app (check:base's job) and is skipped. For the hub
// (base "/") every path must exist unless it is another app's base.
// A target also counts as present when it is a literal source in _redirects (Cloudflare 301s).
// Build first (dist/ or cf-dist/); exit 1 lists each missing target with its source pages.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://icanspeak.it';
const APP_BASES = ['/english', '/espanol', '/francais', '/italiano', '/portugues', '/spanish', '/french', '/italian', '/portuguese', '/linguistics'];

const [a1 = '', a2] = process.argv.slice(2);
let dir, base;
if (a2 === undefined) {
  const app = join(root, 'apps', a1);
  if (!a1 || !existsSync(app)) { console.error('usage: check-links.mjs <app> | <dist dir> <base>'); process.exit(2); }
  const pj = join(app, 'src/lib/paths.js');
  base = existsSync(pj) ? (readFileSync(pj, 'utf8').match(/BASE_PATH\s*=\s*['"]([^'"]*)['"]/)?.[1] ?? '') : '';
  dir = ['dist', 'cf-dist'].map((d) => join(app, d)).find(existsSync);
  if (!dir) { console.error(`check:links: no dist/ or cf-dist/ in apps/${a1}; build it first`); process.exit(2); }
} else { dir = resolve(a1); base = a2; }
// "english" works as well as "/english" (Git Bash rewrites a leading-slash argument into a Windows path).
base = base.replace(/\/+$/, '');
if (base && !base.startsWith('/')) base = `/${base}`;
if (!existsSync(dir)) { console.error(`check:links: ${dir} does not exist`); process.exit(2); }

const redirects = new Set();
if (existsSync(join(dir, '_redirects'))) {
  for (const l of readFileSync(join(dir, '_redirects'), 'utf8').split('\n')) {
    const s = l.trim().split(/\s+/)[0];
    if (s && !s.startsWith('#') && !s.includes('*') && !s.includes(':')) redirects.add(s.replace(/\/+$/, '') || '/');
  }
}

const fileCache = new Map();
const isFile = (p) => {
  if (!fileCache.has(p)) { let r = false; try { r = statSync(p).isFile(); } catch { /* missing */ } fileCache.set(p, r); }
  return fileCache.get(p);
};
const under = (p, b) => p === b || p.startsWith(`${b}/`);
// true / false, or null when the path is another app's.
const exists = (sitePath) => {
  let p = sitePath;
  if (base) { if (!under(p, base)) return null; p = p.slice(base.length) || '/'; }
  else if (APP_BASES.some((b) => under(p, b))) return null;
  if (redirects.has(sitePath.replace(/\/+$/, '') || '/') || redirects.has(p.replace(/\/+$/, '') || '/')) return true;
  try { p = decodeURIComponent(p); } catch { /* keep raw */ }
  const rel = p.replace(/^\/+/, '');
  if (rel === '') return isFile(join(dir, 'index.html'));
  return [rel, `${rel.replace(/\/+$/, '')}/index.html`, `${rel}.html`].some((x) => isFile(join(dir, x)));
};

const skip = /^(?:#|mailto:|tel:|sms:|data:|javascript:|blob:|about:|webcal:|whatsapp:|intent:)/i;
// A site path, or null when the URL is external, a template placeholder or not checkable.
const toSitePath = (raw, pageUrl) => {
  let u = raw.trim().replace(/&amp;/g, '&');
  if (!u || skip.test(u) || /[{}]|%7B/i.test(u) || u.includes('$')) return null;
  if (u.startsWith('//')) u = `https:${u}`;
  let path;
  if (/^https?:/i.test(u)) { if (!u.startsWith(ORIGIN)) return null; path = u.slice(ORIGIN.length) || '/'; }
  else if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null;
  else if (u.startsWith('/')) path = u;
  else path = new URL(u, ORIGIN + pageUrl).pathname;
  path = path.split(/[?#]/)[0];
  return path || null;
};

const walk = (d, out = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!['_worker.js', 'server', '.wrangler', 'node_modules'].includes(f)) walk(p, out); } else out.push(p);
  }
  return out;
};
const pageUrlOf = (file) => {
  let r = file.slice(dir.length).replace(/\\/g, '/');
  r = r.replace(/index\.html$/, '').replace(/\.html$/, '');
  return (base + (r.startsWith('/') ? r : `/${r}`)) || '/';
};

const attrRe = /\b(href|src|srcset|imagesrcset|poster|action|formaction|data-href|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const findings = new Map();
let checked = 0, pages = 0;
const check = (raw, pageUrl, srcFile, kind) => {
  const sp = toSitePath(raw, pageUrl);
  if (sp === null) return;
  checked++;
  if (exists(sp) === false) {
    const k = `${kind}\t${sp}`;
    if (!findings.has(k)) findings.set(k, { kind, target: sp, pages: new Set() });
    findings.get(k).pages.add(srcFile);
  }
};

for (const f of walk(dir)) {
  const rel = f.slice(dir.length + 1).replace(/\\/g, '/');
  if (extname(f) === '.html') {
    pages++;
    const url = pageUrlOf(f);
    // Drop comments and the bodies of inline <script>/<style> (their strings are not links).
    const html = readFileSync(f, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    for (const tag of html.matchAll(/<[a-z][^>]*>/gi)) {
      const t = tag[0];
      const linkRel = /^<link\b/i.test(t) ? (t.match(/\brel\s*=\s*["']([^"']*)/i)?.[1] ?? '') : '';
      for (const m of t.matchAll(attrRe)) {
        const name = m[1].toLowerCase(), val = m[2] ?? m[3];
        if (name === 'srcset' || name === 'imagesrcset') {
          for (const part of val.split(/,\s+|,(?=\/)/)) { const u = part.trim().split(/\s+/)[0]; if (u) check(u, url, rel, 'srcset'); }
        } else {
          const kind = linkRel.includes('canonical') ? 'canonical' : /hreflang/i.test(t) ? 'hreflang' : name;
          check(val, url, rel, kind);
        }
      }
      if (/^<meta\b/i.test(t)) {
        const content = t.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
        if (!content) continue;
        const c = content[1] ?? content[2];
        if (/http-equiv\s*=\s*["']?refresh/i.test(t)) { const u = c.match(/url\s*=\s*(.+)$/i)?.[1]; if (u) check(u.trim(), url, rel, 'meta-refresh'); }
        else if (/(?:property|name)\s*=\s*["'](?:og:image|og:url|twitter:image)/i.test(t)) check(c, url, rel, 'meta-image');
      }
    }
  } else if (/^sitemap.*\.xml$/i.test(rel.split('/').pop())) {
    for (const m of readFileSync(f, 'utf8').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) check(m[1], '/', rel, 'sitemap');
  }
}

const label = base || '/';
if (findings.size) {
  const list = [...findings.values()].sort((a, b) => b.pages.size - a.pages.size);
  console.error(`check:links: ${list.length} missing target(s) in ${dir} (base ${label}), ${pages} pages, ${checked} links checked:`);
  for (const { kind, target, pages: p } of list.slice(0, 200)) {
    const ex = [...p].slice(0, 3).join(', ');
    console.error(`  [${kind}] ${target}  <- ${p.size} page(s): ${ex}${p.size > 3 ? ', …' : ''}`);
  }
  if (list.length > 200) console.error(`  … ${list.length - 200} more`);
  process.exit(1);
}
console.log(`check:links: ok (${pages} pages, ${checked} links, base ${label})`);
