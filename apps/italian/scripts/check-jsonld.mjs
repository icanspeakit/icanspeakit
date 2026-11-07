#!/usr/bin/env node
/* Checks the JSON-LD in the built HTML (SEO-BRAND-TIERED-PROMPT.md, Tier 1).
 *
 *   node scripts/check-jsonld.mjs              reads dist/
 *   node scripts/check-jsonld.mjs <outDir>     reads another build folder (e.g. under %TEMP%)
 *
 * Parses every <script type="application/ld+json">, counts @types per page and exits 1 when
 * a block is not valid JSON, when Organization or WebSite appear anywhere but on / (or not
 * exactly once there), or when an indexable nested page (two or more path segments) has no
 * BreadcrumbList. Prints the homepage JSON-LD at the end.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] ?? "dist");
const BASE = existsSync(path.join(ROOT, "client")) ? path.join(ROOT, "client") : ROOT;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : name.endsWith(".html") ? [full] : [];
  });

const routeOf = (file) => {
  const rel = path.relative(BASE, file).split(path.sep).join("/");
  return ("/" + rel.replace(/(^|\/)index\.html$/, "").replace(/\.html$/, "")).replace(/\/$/, "") || "/";
};

const typesOf = (node, out = []) => {
  if (Array.isArray(node)) node.forEach((n) => typesOf(n, out));
  else if (node && typeof node === "object") {
    if (node["@type"]) [node["@type"]].flat().forEach((t) => out.push(t));
    for (const [k, v] of Object.entries(node)) if (k !== "@type") typesOf(v, out);
  }
  return out;
};
// Top-level entities only (the @graph members, or the block itself), for the per-page rules.
const topTypes = (data) => [data["@graph"] ?? data].flat().flatMap((n) => [n?.["@type"] ?? []].flat());

const errors = [];
const totals = {};
let blocks = 0;
let pagesWithLd = 0;
let home = null;

for (const file of walk(BASE)) {
  const route = routeOf(file);
  if (route === "/404") continue;
  const html = readFileSync(file, "utf8");
  const indexable = !/<meta name="robots" content="noindex/.test(html) && /<link rel="canonical"/.test(html);
  const found = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  const top = [];
  for (const [, raw] of found) {
    blocks++;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      errors.push(`${route}: invalid JSON-LD (${e.message})`);
      continue;
    }
    for (const t of typesOf(data)) totals[t] = (totals[t] ?? 0) + 1;
    top.push(...topTypes(data));
    if (route === "/") home = data;
  }
  if (found.length) pagesWithLd++;
  const count = (t) => top.filter((x) => x === t).length;
  for (const t of ["Organization", "WebSite"]) {
    if (route === "/" ? count(t) !== 1 : count(t) > 0)
      errors.push(`${route}: ${count(t)} × ${t} (want ${route === "/" ? "exactly 1" : "0 off the homepage"})`);
  }
  if (indexable && route.split("/").filter(Boolean).length >= 2 && !count("BreadcrumbList"))
    errors.push(`${route}: nested page without BreadcrumbList`);
}

console.log(`${blocks} JSON-LD blocks on ${pagesWithLd} pages.`);
for (const [t, n] of Object.entries(totals).sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`);
if (home) console.log("\nHomepage JSON-LD:\n" + JSON.stringify(home, null, 2));
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors.slice(0, 50)) console.error("  " + e);
  process.exit(1);
}
console.log("\nOK");
