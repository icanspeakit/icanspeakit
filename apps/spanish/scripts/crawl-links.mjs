#!/usr/bin/env node
// pnpm check:links: crawl the built site and fail on broken internal links and missing assets.
//
// Serves dist/ under /english/ with node:http on a free port (the way the site is served from
// icanspeak.it/english/), starts at /english/, follows every page's links and checks every
// asset it references (href, src, poster, srcset, CSS url()). Anything that is not a 200 under
// the base is reported with the page that links to it. Root-absolute paths that do not start
// with /english/ are reported too: they leave the course.
//
// Only markup is read: inline <script> bodies are JS, not links. Assets listed in KNOWN_MISSING
// are not in the repository on purpose (recordings arrive from outside the build); they are
// reported as notes, not failures.
//
// Needs `pnpm build` first. No dependencies.
// Usage: node scripts/check-links.mjs [distDir]
import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_PATH, SITE_ORIGIN } from "../src/lib/paths.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.resolve(process.argv[2] ?? path.join(ROOT, "dist"));
if (!existsSync(DIST)) {
  console.error(`check:links: ${DIST} does not exist. Run pnpm build first.`);
  process.exit(2);
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp4": "video/mp4", ".webm": "video/webm", ".pdf": "application/pdf",
};

// Recordings and downloads that the repository does not contain (see the README, "Deploy").
const KNOWN_MISSING = [/^\/spanish\/audio\//];

// ── server: dist/ under BASE_PATH ─────────────────────────────────────────────────────────
function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  if (!clean.startsWith(BASE_PATH + "/") && clean !== BASE_PATH) return null;
  const rest = clean.slice(BASE_PATH.length) || "/";
  const direct = path.join(DIST, rest);
  if (rest.endsWith("/") || (existsSync(direct) && statSync(direct).isDirectory())) {
    const idx = path.join(direct, "index.html");
    return existsSync(idx) ? idx : null;
  }
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  if (existsSync(direct + ".html")) return direct + ".html";
  return null;
}

const server = createServer(async (req, res) => {
  const file = resolveFile(req.url ?? "/");
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
  res.end(body);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// ── extraction ────────────────────────────────────────────────────────────────────────────
const ATTR = /\s(href|src|poster|action|formaction|data-src)\s*=\s*(["'])([^"']*)\2/gi;
const SRCSET = /\s(?:srcset|imagesrcset)\s*=\s*(["'])([^"']*)\1/gi;
const CSS_URL = /url\(\s*(["']?)([^)"']+)\1\s*\)/gi;
const IMPORT = /@import\s+(?:url\()?\s*(["'])([^"']+)\1/gi;

// Returns [{ url, kind }] for one HTML or CSS text.
function refs(text, isCss) {
  const out = [];
  const push = (raw, kind) => {
    const v = (raw ?? "").trim();
    if (!v || v.startsWith("#") || /^(mailto:|tel:|javascript:|data:|blob:)/i.test(v)) return;
    out.push({ url: v, kind });
  };
  if (isCss) {
    for (const m of text.matchAll(CSS_URL)) push(m[2], "asset");
    for (const m of text.matchAll(IMPORT)) push(m[2], "asset");
    return out;
  }
  const markup = text.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>");
  for (const tag of markup.match(/<[a-zA-Z][^>]*>/g) ?? []) {
    const name = /^<\s*([a-zA-Z0-9-]+)/.exec(tag)?.[1]?.toLowerCase();
    for (const m of tag.matchAll(ATTR)) push(m[3], name === "a" || name === "link" || name === "area" ? "link" : "asset");
    for (const m of tag.matchAll(SRCSET)) for (const part of m[2].split(",")) push(part.trim().split(/\s+/)[0] ?? "", "asset");
    for (const m of tag.matchAll(CSS_URL)) push(m[2], "asset");
  }
  for (const m of markup.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) for (const c of m[1].matchAll(CSS_URL)) push(c[2], "asset");
  return out;
}

// A reference as a site path under the base; null when it points at another site.
function toSitePath(ref, fromPath) {
  let u;
  try {
    u = new URL(ref, ORIGIN + fromPath);
  } catch {
    return { bad: "unparseable" };
  }
  const siteOrigin = new URL(SITE_ORIGIN).origin;
  if (u.origin !== ORIGIN && u.origin !== siteOrigin) return null;
  // The bare domain root is the umbrella site (icanspeak.it): a link to it is allowed, like check:base.
  if (u.origin === siteOrigin && u.pathname === "/") return null;
  if (u.origin === siteOrigin && !u.pathname.startsWith(BASE_PATH)) return { bad: `outside ${BASE_PATH}` };
  return { path: u.pathname + u.search };
}

// ── crawl ─────────────────────────────────────────────────────────────────────────────────
const checked = new Map(); // path -> { status, text, css }
const referrers = new Map(); // path -> Set of pages that link to it
const problems = [];
const seen = new Set([BASE_PATH + "/"]);
const pending = [BASE_PATH + "/"];

function note(p, from) {
  if (!referrers.has(p)) referrers.set(p, new Set());
  referrers.get(p).add(from);
}

async function statusOf(p) {
  if (checked.has(p)) return checked.get(p);
  const res = await fetch(ORIGIN + p, { redirect: "manual" });
  const type = res.headers.get("content-type") ?? "";
  let text = null;
  if (res.status === 200 && (type.includes("text/html") || type.includes("text/css"))) text = await res.text();
  else await res.arrayBuffer();
  const info = { status: res.status, text, css: type.includes("text/css") };
  checked.set(p, info);
  return info;
}

async function visit(p) {
  const info = await statusOf(p);
  if (info.status !== 200 || info.text === null) return;
  for (const r of refs(info.text, info.css)) {
    const sp = toSitePath(r.url, p);
    if (!sp) continue;
    if (sp.bad) {
      problems.push({ url: r.url, why: sp.bad, from: [p] });
      continue;
    }
    note(sp.path, p);
    // HTML pages are crawled for their own links; every other target is only status-checked.
    const target = sp.path.split("?")[0];
    if (!seen.has(target)) {
      seen.add(target);
      pending.push(target);
    }
  }
}

let active = 0;
async function worker() {
  while (true) {
    const p = pending.shift();
    if (p === undefined) {
      if (active === 0) return;
      await new Promise((r) => setTimeout(r, 5));
      continue;
    }
    active++;
    try {
      await visit(p);
    } finally {
      active--;
    }
  }
}

await Promise.all(Array.from({ length: 16 }, worker));

// Status of every referenced target (pages were fetched while crawling; this catches the rest).
for (const p of referrers.keys()) {
  const info = await statusOf(p.split("?")[0]);
  if (info.status !== 200) problems.push({ url: p, why: `HTTP ${info.status}`, from: [...referrers.get(p)] });
}
server.close();

const unique = problems.filter((x, i, a) => a.findIndex((y) => y.url === x.url && y.why === x.why) === i);
const missing = unique.filter((x) => KNOWN_MISSING.some((re) => re.test(x.url)));
const bad = unique.filter((x) => !KNOWN_MISSING.some((re) => re.test(x.url)));
const pageCount = [...checked.values()].filter((v) => v.status === 200 && v.text !== null && !v.css).length;

if (missing.length) console.log(`check:links: note, ${missing.length} known-missing asset(s) (not in the repo): ${missing.slice(0, 3).map((m) => m.url).join(", ")}${missing.length > 3 ? " …" : ""}`);
if (bad.length) {
  console.error(`check:links: ${bad.length} broken link(s) or asset(s); ${checked.size} URLs checked, ${pageCount} pages crawled:`);
  for (const b of bad.slice(0, 80)) {
    const from = b.from;
    console.error(`  ${b.url}  (${b.why})  <- ${from.slice(0, 3).join(", ")}${from.length > 3 ? ` (+${from.length - 3})` : ""}`);
  }
  if (bad.length > 80) console.error(`  ... and ${bad.length - 80} more`);
  process.exit(1);
}
console.log(`check:links: ok. ${checked.size} URLs checked, ${pageCount} pages crawled from ${BASE_PATH}/, no broken links.`);
