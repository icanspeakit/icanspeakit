// Visual pass over a BUILT app (dist) in Chromium at 390x844 and 1440x900.
//
//   node scripts/visual-pass.mjs --app hub [--max 12] [--routes /,/a,/b] [--out docs/visual-qa/x]
//   node scripts/visual-pass.mjs --dist <abs dist> --base /english [...]
//
// --app     name under apps/ (dist = apps/<app>/dist, base read from its astro.config.* `base:`)
// --dist    dist folder (overrides --app)       --base  base path, e.g. /english (default: from config, else "/")
// --routes  comma list of routes WITHOUT the base (default: sample of the built pages, taken from
//           sitemap*.xml when present, else from the *.html files in dist)
// --max     sample size when sampling (default 12; always keeps "/")   --all  check every page
// --out     result folder (default docs/visual-qa/visual-pass-<app>); gets results.json, summary.md and
//           screenshots of failing routes only.
// Per route and viewport: HTTP status, console errors, page errors, failed requests/images, horizontal
// overflow, raw i18n keys / {placeholders}, "[object Object]", NaN / undefined in visible text.
// Playwright comes from the Pflegeplace checkout (not a dependency of this repo). Exit 1 on any failure.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const flag = (n) => args.includes(`--${n}`);

const app = opt("app");
const dist = resolve(opt("dist") ?? (app ? join(root, "apps", app, "dist") : ""));
if (!app && !opt("dist")) { console.error("usage: visual-pass.mjs --app <name> | --dist <dir> --base <path>"); process.exit(2); }
if (!existsSync(dist)) { console.error(`dist not found: ${dist} (build the app first)`); process.exit(2); }

function detectBase() {
  if (!app) return "/";
  for (const f of ["astro.config.mjs", "astro.config.ts"]) {
    const p = join(root, "apps", app, f);
    if (existsSync(p)) { const m = readFileSync(p, "utf8").match(/\bbase:\s*['"]([^'"]*)['"]/); if (m) return m[1]; }
  }
  // base may come from an imported constant (src/lib/paths.js: export const BASE_PATH = '/x')
  const lp = join(root, "apps", app, "src", "lib", "paths.js");
  if (existsSync(lp)) { const m = readFileSync(lp, "utf8").match(/export const BASE_PATH\s*=\s*['"]([^'"]*)['"]/); if (m) return m[1]; }
  return "/";
}
let base = opt("base") ?? detectBase();
base = "/" + base.replace(/^\/+|\/+$/g, "");
if (base === "/") base = "";
const out = resolve(opt("out") ?? join(root, "docs", "visual-qa", `visual-pass-${app ?? "dist"}`));
mkdirSync(out, { recursive: true });

// ---- routes
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}
function allRoutes() {
  const set = new Set();
  for (const f of readdirSync(dist).filter((n) => /^sitemap.*\.xml$/.test(n) && n !== "sitemap-index.xml")) {
    for (const m of readFileSync(join(dist, f), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
      let p; try { p = new URL(m[1]).pathname; } catch { continue; }
      if (base && p.startsWith(base)) p = p.slice(base.length);
      set.add(p || "/");
    }
  }
  // A sitemap may list other apps' routes (hub); keep only pages this dist can serve.
  for (const r of [...set]) { const f = resolveFile(r); if (!f || !f.endsWith(".html")) set.delete(r); }
  if (set.size === 0) {
    for (const f of walk(dist)) {
      let r = "/" + f.slice(dist.length + 1).split(sep).join("/");
      if (/(^|\/)(404|500)\.html$/.test(r)) continue;
      r = r.replace(/index\.html$/, "").replace(/\.html$/, "");
      set.add(r || "/");
    }
  }
  return [...set].sort();
}
function sample(list, max) {
  if (list.length <= max) return list;
  const picked = new Set(list.includes("/") ? ["/"] : []);
  const step = list.length / (max - picked.size);
  for (let i = 0; picked.size < max && i < list.length; i++) picked.add(list[Math.floor(i * step)]);
  return [...picked].sort();
}
const routeArg = opt("routes");
const routes = routeArg
  ? routeArg.split(",").map((r) => (r.startsWith("/") ? r : "/" + r))
  : flag("all") ? allRoutes() : sample(allRoutes(), Number(opt("max", 12)));

// ---- static server honouring the base path
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon", ".woff": "font/woff",
  ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml", ".mp3": "audio/mpeg", ".webmanifest": "application/manifest+json" };
function resolveFile(rel) {
  const p = resolve(dist, "." + rel);
  if (p !== dist && !p.startsWith(dist + sep)) return null;
  for (const c of [p, join(p, "index.html"), p + ".html"]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}
const server = createServer((req, res) => {
  let path; try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { path = "/"; }
  if (base && path !== base && !path.startsWith(base + "/")) { res.writeHead(404); return res.end("outside base"); }
  const f = resolveFile(base ? path.slice(base.length) || "/" : path);
  if (!f) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("not found"); }
  res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

// ---- checks run inside the page
const inPage = () => {
  const vw = document.documentElement.clientWidth;
  const overflow = document.documentElement.scrollWidth - vw;
  const wide = [];
  if (overflow > 0) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 1) continue;
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) { clipped = true; break; }
        p = p.parentElement;
      }
      if (!clipped && getComputedStyle(el).position !== "fixed") wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} -> ${Math.round(r.right)}`);
      if (wide.length >= 4) break;
    }
  }
  const brokenImages = [...document.images]
    .filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src))
    .map((i) => i.currentSrc || i.src).slice(0, 8);
  // visible text only (innerText skips display:none, script, style)
  const text = document.body.innerText || "";
  const hits = (re) => [...new Set(text.match(re) ?? [])].slice(0, 6);
  const TLD = /\.(com|it|de|org|net|io|pdf|html|js|css|png|jpg|svg|json|txt|md|mjs|webp|mp3)\b/i;
  const rawKeys = hits(/\b[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9_]*){2,}\b/g).filter((k) => !TLD.test(k) && !/^www\./.test(k));
  return {
    overflow, wide, brokenImages, rawKeys,
    placeholders: hits(/\{\{?\s*[a-zA-Z_][\w.]*\s*\}\}?/g),
    objectObject: text.includes("[object Object]"),
    nanUndefined: hits(/\b(?:NaN|undefined|null)\b/g),
  };
};

const { chromium } = await import(pathToFileURL("C:/Users/Edgar/Projects/Pflegeplace/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch();
const results = [];
const VIEWPORTS = [[390, 844], [1440, 900]];

for (const route of routes) {
  for (const [w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024, isMobile: w < 1024 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    const consoleErrors = [], pageErrors = [], failedRequests = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
    page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 300)));
    page.on("requestfailed", (r) => failedRequests.push(`${r.url().replace(origin, "")} ${r.failure()?.errorText ?? ""}`));
    page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(origin)) failedRequests.push(`${r.url().replace(origin, "")} HTTP ${r.status()}`); });
    const rec = { route, viewport: `${w}x${h}`, status: null, problems: [] };
    try {
      const resp = await page.goto(origin + base + (route === "/" ? "/" : route), { waitUntil: "networkidle" });
      rec.status = resp?.status() ?? null;
      await page.waitForTimeout(300);
      const r = await page.evaluate(inPage);
      if (rec.status !== 200) rec.problems.push(`HTTP ${rec.status}`);
      if (consoleErrors.length) rec.problems.push(`console errors: ${consoleErrors.join(" | ")}`);
      if (pageErrors.length) rec.problems.push(`page errors: ${pageErrors.join(" | ")}`);
      if (failedRequests.length) rec.problems.push(`failed requests: ${[...new Set(failedRequests)].slice(0, 6).join(" | ")}`);
      if (r.overflow > 0) rec.problems.push(`horizontal overflow ${r.overflow}px ${r.wide.join(" | ")}`);
      if (r.brokenImages.length) rec.problems.push(`broken images: ${r.brokenImages.join(" | ")}`);
      if (r.rawKeys.length) rec.problems.push(`raw keys: ${r.rawKeys.join(", ")}`);
      if (r.placeholders.length) rec.problems.push(`placeholders: ${r.placeholders.join(", ")}`);
      if (r.objectObject) rec.problems.push("[object Object] in text");
      if (r.nanUndefined.length) rec.problems.push(`NaN/undefined/null in text: ${r.nanUndefined.join(", ")}`);
      if (rec.problems.length) {
        rec.screenshot = `${(route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "_")).slice(0, 80)}-${w}.png`;
        await page.screenshot({ path: join(out, rec.screenshot), fullPage: false });
      }
    } catch (e) {
      rec.problems.push(`navigation failed: ${String(e.message).split("\n")[0]}`);
    }
    results.push(rec);
    console.log(`${rec.problems.length ? "FAIL" : "ok  "} ${rec.viewport} ${route}${rec.problems.length ? "\n       " + rec.problems.join("\n       ") : ""}`);
    await ctx.close();
  }
}
await browser.close();
server.close();

const failed = results.filter((r) => r.problems.length);
writeFileSync(join(out, "results.json"), JSON.stringify({ app: app ?? null, base: base || "/", routes, results }, null, 2));
const md = [
  `# Visual pass: ${app ?? dist}`, "",
  `Base \`${base || "/"}\`, ${routes.length} routes x ${VIEWPORTS.length} viewports = ${results.length} checks, ${failed.length} with problems.`, "",
  failed.length ? "| Route | Viewport | Problems |\n|---|---|---|" : "No problems found.",
  ...failed.map((r) => `| \`${r.route}\` | ${r.viewport} | ${r.problems.join("<br>").replace(/\|/g, "\\|")}${r.screenshot ? ` (${r.screenshot})` : ""} |`),
  "", "Routes: " + routes.map((r) => `\`${r}\``).join(", "), "",
].join("\n");
writeFileSync(join(out, "summary.md"), md);
console.log(`\n${results.length} checks, ${failed.length} with problems. Results: ${out}`);
process.exit(failed.length ? 1 : 0);
