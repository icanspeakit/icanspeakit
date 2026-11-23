// Usage: node scripts/check-built-audio.mjs <app> [basePath]
// Scans apps/<app>/dist (html, js, json, css) for /audio/... *.mp3 URLs (optionally prefixed with
// basePath) and checks each resolves to a file in dist. Prints a summary and the first missing ones.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = process.argv[2];
const dist = path.join(root, "apps", app, "dist");
if (!fs.existsSync(dist)) { console.log(`${app}: no dist`); process.exit(2); }
const refs = new Map();
const re = /(?:\/[a-z]+)?\/audio\/[A-Za-z0-9_\-./%]+?\.mp3/g;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|js|mjs|json|css|xml)$/.test(e.name)) {
      const t = fs.readFileSync(p, "utf8");
      for (const m of t.matchAll(re)) if (!refs.has(m[0])) refs.set(m[0], path.relative(dist, p));
    }
  }
})(dist);
const missing = [];
for (const [u, from] of refs) {
  const rel = decodeURIComponent(u.replace(/^\/[a-z]+(?=\/audio\/)/, ""));
  const cands = [path.join(dist, rel), path.join(dist, decodeURIComponent(u))];
  if (!cands.some((c) => fs.existsSync(c))) missing.push(`${u}  (in ${from})`);
}
console.log(`${app}: ${refs.size} distinct audio URLs referenced, ${missing.length} unresolved`);
missing.slice(0, 15).forEach((m) => console.log("  " + m));
process.exit(missing.length ? 1 : 0);
