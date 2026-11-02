#!/usr/bin/env node
// One-off (content-plan §6, `routes` run, 2026-11-02): German routes → English routes.
//
//   node scripts/rename-routes.mjs --dry   list the page moves and the link counts only
//   node scripts/rename-routes.mjs         git mv the pages, fix their relative imports,
//                                          rewrite every internal path literal
//
// The table is ROUTE_RENAMES / TOPIC_SLUGS in src/lib/routes.js. A path literal is only
// rewritten where it starts a URL: after a quote, backtick, bracket, space, = , or >, so
// import specifiers ("../data/grammatik/x.json") and asset paths ("/audio/pruefungen/…")
// are left alone. src/lib/routes.js and astro.config.mjs hold the old paths on purpose
// and are skipped. Kept in the repo as the record of what was done; running it a second
// time finds nothing left to move.
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ROUTE_RENAMES, TOPIC_SLUGS } from "../src/lib/routes.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const PAGES = path.join(ROOT, "src/pages");
const posix = (p) => p.split(path.sep).join("/");

const BY_OLD = [...ROUTE_RENAMES].sort((a, b) => b[0].length - a[0].length);
function rename(route) {
  for (const [from, to] of BY_OLD) {
    if (route === from || (route.startsWith(from) && route[from.length] === "/")) return to + route.slice(from.length);
  }
  return null;
}

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) { if (!["node_modules", "dist", ".astro", "_tmp_routes"].includes(f)) walk(p, out); }
    else out.push(p);
  }
  return out;
}

// ── 1. Page moves ────────────────────────────────────────────────────────────────────────
// route of a page file: src/pages/a/b.astro → /a/b, a/index.astro → /a, x.json.ts → /x.json
const routeOf = (rel) => {
  const noExt = rel.replace(/\.(astro|ts|js|md)$/, "");
  const r = "/" + noExt.replace(/(^|\/)index$/, "");
  return { route: r === "/" ? "/" : r.replace(/\/$/, ""), index: /(^|\/)index$/.test(noExt), ext: rel.slice(noExt.length) };
};
const moves = [];
for (const abs of walk(PAGES)) {
  const rel = posix(path.relative(PAGES, abs));
  const { route, index, ext } = routeOf(rel);
  const to = rename(route);
  if (!to) continue;
  const newRel = (index ? `${to.slice(1)}/index` : to.slice(1)) + ext;
  moves.push({ from: rel, to: newRel });
}
const moveMap = new Map(moves.map((m) => [path.join(PAGES, m.from), path.join(PAGES, m.to)]));
console.log(`${moves.length} page files to move`);
if (DRY) for (const m of moves) console.log(`  ${m.from} → ${m.to}`);

// Relative specifiers in a moved file: resolve from the old place, follow the target if it
// moved too, re-relativize from the new place.
function fixRelative(text, oldAbs, newAbs) {
  return text.replace(/(["'`])(\.\.?\/[^"'`\n]*)\1/g, (all, q, spec) => {
    const target = path.resolve(path.dirname(oldAbs), spec.replace(/[?#].*$/, ""));
    const rest = spec.slice(spec.replace(/[?#].*$/, "").length);
    const moved = moveMap.get(target) ?? target;
    const isGlob = /[*{]/.test(spec);
    if (!isGlob && !existsSync(target) && !existsSync(moved)) return all;
    let rel = posix(path.relative(path.dirname(newAbs), moved));
    if (!rel.startsWith(".")) rel = "./" + rel;
    if (spec.endsWith("/") && !rel.endsWith("/")) rel += "/";
    return q + rel + rest + q;
  });
}

if (!DRY) {
  for (const m of moves) {
    const fromAbs = path.join(PAGES, m.from);
    const toAbs = path.join(PAGES, m.to);
    const before = readFileSync(fromAbs, "utf8");
    const after = fixRelative(before, fromAbs, toAbs);
    mkdirSync(path.dirname(toAbs), { recursive: true });
    execFileSync("git", ["mv", fromAbs, toAbs], { cwd: ROOT, stdio: "inherit" });
    if (after !== before) writeFileSync(toAbs, after);
  }
}

// ── 2. Path literals ─────────────────────────────────────────────────────────────────────
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BEFORE = `(?<=["'\`(\\s=,>\\[])`;
// A backslash ends a path too: href=\"/praesens\" inside a JSON string of HTML.
const AFTER = `(?=[/"'\`?#)\\s,<\\].:;\\\\]|$)`;
const sectionRe = new RegExp(BEFORE + "(" + BY_OLD.map(([f]) => esc(f)).join("|") + ")" + AFTER, "gm");
const sectionTo = Object.fromEntries(ROUTE_RENAMES);
// Half-renamed paths from the first run (the parent matched, the longer rule did not):
// /life-in-the-uk/fakten → /life-in-the-uk/facts.
const halfTo = {};
for (const [from, to] of ROUTE_RENAMES) {
  const parent = BY_OLD.find(([f]) => f !== from && from.startsWith(f + "/"));
  if (parent) halfTo[parent[1] + from.slice(parent[0].length)] = to;
}
const halfRe = new RegExp(BEFORE + "(" + Object.keys(halfTo).sort((a, b) => b.length - a.length).map(esc).join("|") + ")" + AFTER, "gm");
const topicKeys = Object.keys(TOPIC_SLUGS).filter((k) => TOPIC_SLUGS[k] !== k && !sectionTo[`/${k}`]).sort((a, b) => b.length - a.length);
const topicRe = new RegExp(BEFORE + "/(" + topicKeys.map(esc).join("|") + `)(?=["'\`?#)\\s,<\\]\\\\]|$)`, "gm");

const SKIP = new Set(["src/lib/routes.js", "scripts/rename-routes.mjs"].map((p) => path.join(ROOT, p)));
const TEXT = /\.(astro|js|mjs|cjs|ts|tsx|jsx|json|md|css|html|txt)$/;
const files = [
  ...walk(path.join(ROOT, "src")),
  ...walk(path.join(ROOT, "scripts")),
  ...walk(path.join(ROOT, "public/i18n")),
  path.join(ROOT, "public/robots.txt"),
].filter((f) => TEXT.test(f) && !SKIP.has(f) && existsSync(f));

let total = 0, changed = 0;
for (const f of files) {
  const t = readFileSync(f, "utf8");
  let n = 0;
  const out = t
    .replace(sectionRe, (m) => { n++; return sectionTo[m]; })
    .replace(halfRe, (m) => { n++; return halfTo[m]; })
    .replace(topicRe, (m, key) => { n++; return `/${TOPIC_SLUGS[key]}`; });
  if (n) {
    total += n; changed++;
    if (DRY) console.log(`  ${posix(path.relative(ROOT, f))}: ${n}`);
    else writeFileSync(f, out);
  }
}
console.log(`${total} path literals in ${changed} files${DRY ? " (dry run)" : " rewritten"}`);
