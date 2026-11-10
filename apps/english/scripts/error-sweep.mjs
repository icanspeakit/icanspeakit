// Site error sweep: loads every page in the sitemap (plus the on-demand routes) in a real
// Chromium, desktop and phone, and records what a visitor's browser would complain about —
// console errors, uncaught exceptions, failed requests, broken images, dead internal links,
// mobile overflow. ERROR-SWEEP-TIERED-PROMPT.md, Tier 1.
//
//   node scripts/error-sweep.mjs [--limit N] [--only /path-prefix] [--no-mobile] [--mobile-sample]
//   BASE=http://localhost:4321 node scripts/error-sweep.mjs
//
// Read-only: GET/HEAD only, no forms, no sign-in. Analytics requests (PostHog via /rel,
// *.posthog.com, GA, Vercel insights) are aborted so the crawl never shows up as visitors.
// Output: .error-sweep/<timestamp>/report.json (everything, per page) and summary.md
// (grouped by error signature). Exit 1 on same-origin 4xx/5xx, pageerrors or dead
// internal links.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// The marker goes after a normal Chrome UA, not instead of it: with a bare bot UA,
// accounts.google.com answers /gsi/client with non-JS (ERR_BLOCKED_BY_ORB) and publishers
// answer links with 403/400 — errors a visitor never sees.
const UA_MARK = "icanspeak English-ErrorSweep/1.0";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const CHROME_MOBILE = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const UA = `${CHROME} ${UA_MARK}`;
const PARALLEL = 4;
const BATCH_PAUSE_MS = 250;
const PAGE_TIMEOUT = 30_000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = opt("--limit") ? Number(opt("--limit")) : Infinity;
const ONLY = opt("--only");
const NO_MOBILE = flag("--no-mobile");
const MOBILE_SAMPLE = flag("--mobile-sample");

const BASE_IN = (process.env.BASE ?? "https://icanspeak.it/english").replace(/\/$/, "");

// The routes that render on demand never appear in the sitemap but must not break for a
// logged-out visitor. The last one must answer with a real 404.
const EXTRA = ["/anmelden", "/konto", "/passwort-neu", "/404-test-does-not-exist"];
const EXPECT_404 = new Set(["/404-test-does-not-exist"]);

const BLOCK = [
  /^https?:\/\/[^/]*posthog\.com\//,
  /^https?:\/\/[^/]+\/rel(\/|$)/,
  /^https?:\/\/[^/]+\/ingest/,
  /^https?:\/\/[^/]+\/_vercel\/(insights|speed-insights)/,
  /^https?:\/\/(www\.)?googletagmanager\.com\//,
  /^https?:\/\/[^/]*google-analytics\.com\//,
];
const blocked = (url) => BLOCK.some((re) => re.test(url));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { method = "GET", timeout = 15_000, headers = {} } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { method, headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8", ...headers }, redirect: "follow", signal: ctl.signal });
    if (method === "GET" && !headers.range) await res.arrayBuffer().catch(() => {});
    else res.body?.cancel().catch(() => {});
    return { status: res.status, finalUrl: res.url, redirected: res.redirected };
  } catch (e) {
    return { status: 0, error: e.name === "AbortError" ? "timeout" : String(e.cause?.code ?? e.message) };
  } finally {
    clearTimeout(t);
  }
}

// --- URL list -------------------------------------------------------------------------
// The sitemap carries the canonical host; on production that host may redirect (apex →
// www). Crawl on the origin the sitemap request actually ended up on, so each page is
// one request and not a redirect, and note the host redirect once.
// `astro dev` writes no sitemap (it is built after the build): SITEMAP=<url or file> takes
// the list from elsewhere, e.g. .vercel/output/static/sitemap.xml, and crawls it on BASE.
const SITEMAP = process.env.SITEMAP;
let smRes, xml;
if (SITEMAP && !/^https?:/.test(SITEMAP)) {
  xml = await readFile(SITEMAP, "utf8");
  smRes = await fetch(BASE_IN + "/", { headers: { "user-agent": UA } });
} else {
  smRes = await fetch(SITEMAP ?? BASE_IN + "/sitemap.xml", { headers: { "user-agent": UA } });
  if (!smRes.ok) {
    console.error(`sitemap.xml: HTTP ${smRes.status}`);
    process.exit(2);
  }
  xml = await smRes.text();
  if (SITEMAP) smRes = await fetch(BASE_IN + "/", { headers: { "user-agent": UA } });
}
const ORIGIN = new URL(smRes.url).origin;
const SAME = new Set([new URL(BASE_IN).origin, ORIGIN]);
const sitemapPaths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
  const u = new URL(m[1]);
  SAME.add(u.origin);
  return u.pathname + u.search;
});
const hostNote = smRes.redirected ? `${BASE_IN} redirected to ${smRes.url}` : null;
const isSame = (u) => SAME.has(u.origin);

let paths = [...new Set([...sitemapPaths, ...EXTRA])];
if (ONLY) paths = paths.filter((p) => p.startsWith(ONLY));
paths = paths.slice(0, LIMIT);

// One page per route template on the phone pass: the first two path segments, with a
// trailing slug collapsed (one grammar topic, one Wortschatz list, one Prüfung …).
function template(p) {
  const segs = p.split("/").filter(Boolean);
  if (segs.length <= 1) return p;
  return "/" + segs.slice(0, -1).join("/") + "/*";
}
let mobilePaths = NO_MOBILE ? [] : paths;
if (MOBILE_SAMPLE) {
  const seen = new Set();
  mobilePaths = paths.filter((p) => (seen.has(template(p)) ? false : seen.add(template(p))));
}

console.log(`origin ${ORIGIN} · ${paths.length} pages desktop · ${mobilePaths.length} mobile`);
if (hostNote) console.log(hostNote);

// --- Page pass ------------------------------------------------------------------------
const browser = await chromium.launch();
const CONTEXTS = {
  desktop: { viewport: { width: 1366, height: 900 }, userAgent: UA },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: `${CHROME_MOBILE} ${UA_MARK}` },
};

const links = new Map(); // internal path → Set(page)
const external = new Map(); // url → Set(page)
const assets = new Map(); // url → Set(page)

function addTo(map, key, page) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(page);
}

// A hard ceiling per page on top of the navigation timeout: page.evaluate() has none, and one
// page that never answers must not stall the whole crawl.
const HARD_LIMIT = 75_000;
async function visit(ctx, p, vp) {
  let timer;
  const hung = new Promise((res) => {
    timer = setTimeout(() => res({ path: p, viewport: vp, status: null, redirects: [], console: [], pageerrors: [], failed: [], badResponses: [], mixed: [], brokenImages: [], meta: null, overflow: null, timeout: true, navError: `page did not finish in ${HARD_LIMIT / 1000} s` }), HARD_LIMIT);
  });
  const rec = await Promise.race([visitPage(ctx, p, vp), hung]);
  clearTimeout(timer);
  return rec;
}

async function visitPage(ctx, p, vp) {
  const url = ORIGIN + p;
  const rec = { path: p, viewport: vp, status: null, redirects: [], console: [], pageerrors: [], failed: [], badResponses: [], mixed: [], brokenImages: [], meta: null, overflow: null, timeout: false };
  const page = await ctx.newPage();
  // A dialog would block every later call on this page; a visitor would close it too.
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  page.on("console", (m) => {
    const type = m.type();
    if (type !== "error" && type !== "warning") return;
    const loc = m.location();
    // The analytics requests we abort ourselves log "Failed to load resource".
    if (loc?.url && blocked(loc.url)) return;
    rec.console.push({ type, text: m.text().slice(0, 600), source: loc?.url ? `${loc.url}:${loc.lineNumber}` : "" });
  });
  page.on("pageerror", (e) => rec.pageerrors.push({ message: String(e.message).slice(0, 600), stack: String(e.stack ?? "").split("\n").slice(0, 4).join("\n") }));
  page.on("requestfailed", (r) => {
    if (blocked(r.url())) return;
    const u = new URL(r.url());
    if (u.protocol === "data:" || u.protocol === "blob:") return;
    rec.failed.push({ url: r.url(), type: r.resourceType(), error: r.failure()?.errorText ?? "", same: isSame(u) });
  });
  let mainReq = null;
  page.on("request", (r) => {
    if (!mainReq && r.isNavigationRequest() && r.frame() === page.mainFrame()) mainReq = r;
  });
  page.on("response", (r) => {
    const u = r.url();
    if (u.startsWith("http://") && url.startsWith("https://")) rec.mixed.push(u);
    if (r.status() >= 400 && r.request() !== mainReq) rec.badResponses.push({ url: u, status: r.status(), type: r.request().resourceType(), same: isSame(new URL(u)) });
  });

  let res = null;
  try {
    res = await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT });
  } catch (e) {
    if (/Timeout/i.test(e.message)) {
      rec.timeout = true;
      try {
        res = await page.goto(url, { waitUntil: "load", timeout: PAGE_TIMEOUT });
        await page.waitForTimeout(3000);
      } catch (e2) {
        rec.navError = e2.message.split("\n")[0];
      }
    } else rec.navError = e.message.split("\n")[0];
  }
  if (res) {
    rec.status = res.status();
    let r = res.request().redirectedFrom();
    while (r) {
      rec.redirects.unshift(r.url());
      r = r.redirectedFrom();
    }
    // The main document's own non-2xx answer is recorded as status, not as a resource.
    rec.badResponses = rec.badResponses.filter((b) => b.url !== res.url());
  }

  if (res && !rec.navError) {
    try {
      // Scroll once to the bottom so lazy images get a chance to load, then check.
      await page.evaluate(async () => {
        // Capped: a page that grows as it is scrolled would otherwise keep this going forever.
        const step = innerHeight;
        for (let y = 0, n = 0; y < document.documentElement.scrollHeight && n < 60; y += step, n++) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      const scan = await page.evaluate(() => {
        const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
        const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.getAttribute("src"))).map((i) => i.currentSrc || abs(i.getAttribute("src")));
        const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
        const media = [...document.querySelectorAll("audio[src], source[src], video[src]")].map((m) => abs(m.getAttribute("src")));
        const de = document.documentElement;
        return {
          imgs,
          hrefs,
          media,
          title: document.title.trim(),
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
          h1: document.querySelectorAll("h1").length,
          overflow: de.scrollWidth > de.clientWidth + 1 ? { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth } : null,
        };
      });
      rec.brokenImages = [...new Set(scan.imgs)];
      if (vp === "desktop") rec.meta = { title: scan.title, canonical: scan.canonical, h1: scan.h1 };
      if (vp === "mobile") rec.overflow = scan.overflow;
      for (const m of scan.media) if (m) addTo(assets, m, p);
      for (const raw of scan.hrefs) {
        if (!raw || /^(mailto:|tel:|javascript:|#|sms:|whatsapp:)/i.test(raw)) continue;
        let u;
        try { u = new URL(raw, page.url()); } catch { continue; }
        if (!/^https?:$/.test(u.protocol)) continue;
        u.hash = "";
        if (/\.(mp3|pdf|m4a|ogg|wav|zip|ics)$/i.test(u.pathname)) addTo(assets, u.href, p);
        else if (isSame(u)) addTo(links, u.pathname + u.search, p);
        else addTo(external, u.href, p);
      }
    } catch (e) {
      rec.scanError = e.message.split("\n")[0];
    }
  }
  await page.close({ runBeforeUnload: false }).catch(() => {});
  return rec;
}

async function pass(vp, list) {
  const ctx = await browser.newContext(CONTEXTS[vp]);
  await ctx.route("**/*", (route) => (blocked(route.request().url()) ? route.abort() : route.continue()));
  const out = [];
  for (let i = 0; i < list.length; i += PARALLEL) {
    const batch = list.slice(i, i + PARALLEL);
    out.push(...(await Promise.all(batch.map((p) => visit(ctx, p, vp)))));
    if ((i / PARALLEL) % 25 === 0) console.log(`  ${vp} ${Math.min(i + PARALLEL, list.length)}/${list.length}`);
    await sleep(BATCH_PAUSE_MS);
  }
  await ctx.close();
  return out;
}

const pages = [...(await pass("desktop", paths)), ...(await pass("mobile", mobilePaths))];
await browser.close();

// --- Link and asset checks -------------------------------------------------------------
const crawled = new Map(pages.filter((r) => r.viewport === "desktop").map((r) => [r.path, r.status]));

async function pool(items, n, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += n) {
    out.push(...(await Promise.all(items.slice(i, i + n).map(fn))));
    await sleep(100);
  }
  return out;
}

async function check(url, timeout) {
  let r = await get(url, { method: "HEAD", timeout });
  if (r.status === 405 || r.status === 501 || r.status === 403 || r.status === 0) {
    r = await get(url, { method: "GET", timeout, headers: { range: "bytes=0-0" } });
  }
  return r;
}

console.log(`checking ${links.size} internal links, ${assets.size} audio/download links, ${external.size} external links`);
const linkResults = await pool([...links.keys()], PARALLEL, async (p) => {
  // API routes are not pages; a GET there could act. Report them, don't call them.
  if (p.startsWith("/api/")) return { path: p, status: null, skipped: "api" };
  const pathOnly = p.split("?")[0];
  if (crawled.has(p) || crawled.has(pathOnly)) return { path: p, status: crawled.get(p) ?? crawled.get(pathOnly), from: "crawl" };
  const r = await check(ORIGIN + p, 15_000);
  return { path: p, ...r };
});
const assetResults = await pool([...assets.keys()], PARALLEL, async (u) => ({ url: u, ...(await check(u, 15_000)) }));
const externalResults = await pool([...external.keys()], 8, async (u) => ({ url: u, ...(await check(u, 8_000)) }));

const okStatus = (s) => s >= 200 && s < 400;
const deadLinks = linkResults.filter((l) => !l.skipped && !okStatus(l.status)).map((l) => ({ ...l, pages: [...links.get(l.path)] }));
const deadAssets = assetResults.filter((a) => !okStatus(a.status)).map((a) => ({ ...a, pages: [...assets.get(a.url)] }));
const deadExternal = externalResults.filter((a) => !okStatus(a.status)).map((a) => ({ ...a, pages: [...external.get(a.url)] }));

// --- Signatures -----------------------------------------------------------------------
// One bug on 300 pages is one line: messages are normalised (URLs, numbers, quoted ids
// stripped) and grouped; each group lists how many pages it hit and five examples.
const norm = (s) =>
  String(s)
    .replace(/https?:\/\/[^\s"')]+/g, "<url>")
    .replace(/\b[0-9a-f]{8,}\b/gi, "<hash>")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
const normPath = (u) => {
  try {
    const x = new URL(u);
    return (SAME.has(x.origin) ? "" : x.host) + x.pathname.replace(/\d+/g, "N");
  } catch {
    return norm(u);
  }
};

const sigs = new Map();
function hit(kind, text, pageRec, severity, extra) {
  const key = `${kind} | ${text}`;
  if (!sigs.has(key)) sigs.set(key, { kind, text, severity, pages: new Set(), viewports: new Set(), examples: [] });
  const s = sigs.get(key);
  const id = pageRec.path;
  if (!s.pages.has(id) && s.examples.length < 5) s.examples.push(extra ? `${id} — ${extra}` : id);
  s.pages.add(id);
  s.viewports.add(pageRec.viewport);
}

for (const r of pages) {
  const expected404 = EXPECT_404.has(r.path);
  if (expected404 && r.status !== 404) hit("doc-status", `expected 404, got ${r.status}`, r, "error");
  else if (!expected404 && r.status !== 200 && r.status != null) hit("doc-status", `HTTP ${r.status}`, r, r.status >= 400 ? "error" : "warn");
  if (r.redirects.length > 1) hit("redirect-chain", `${r.redirects.length} hops`, r, "warn", r.redirects.join(" → "));
  if (r.navError) hit("nav-error", norm(r.navError), r, "error");
  if (r.timeout) hit("timeout", "networkidle not reached in 30 s", r, "warn");
  for (const c of r.console) {
    // The 404 probe's own document logs "Failed to load resource: … 404" — that is the point.
    if (expected404 && r.status === 404 && c.source.startsWith(ORIGIN + r.path)) continue;
    hit(`console.${c.type}`, norm(c.text), r, c.type === "error" ? "warn" : "info", c.source);
  }
  for (const e of r.pageerrors) hit("pageerror", norm(e.message), r, "error", e.stack.split("\n")[1]?.trim());
  for (const b of r.badResponses) hit(b.same ? "same-origin-http" : "third-party-http", `${b.status} ${b.type} ${normPath(b.url)}`, r, b.same ? "error" : "info", b.url);
  for (const f of r.failed) hit(f.same ? "same-origin-failed" : "third-party-failed", `${f.error} ${f.type} ${normPath(f.url)}`, r, f.error === "net::ERR_ABORTED" ? "info" : "warn", f.url);
  for (const m of new Set(r.mixed)) hit("mixed-content", normPath(m), r, "warn", m);
  for (const i of r.brokenImages) hit("broken-image", normPath(i), r, "warn", i);
  if (r.overflow) hit("mobile-overflow", "scrollWidth > clientWidth", r, "info", `${r.overflow.scrollWidth}px`);
  if (r.meta && r.status === 200) {
    if (!r.meta.title) hit("seo", "missing <title>", r, "info");
    if (!r.meta.canonical) hit("seo", 'missing <link rel="canonical">', r, "info");
    if (r.meta.h1 > 1) hit("seo", "more than one <h1>", r, "info", `${r.meta.h1} h1`);
    if (r.meta.h1 === 0) hit("seo", "no <h1>", r, "info");
  }
}
for (const l of deadLinks) for (const p of l.pages) hit("dead-internal-link", `${l.status || l.error} ${l.path}`, { path: p, viewport: "desktop" }, "error");
for (const a of deadAssets) for (const p of a.pages) hit("dead-asset-link", `${a.status || a.error} ${normPath(a.url)}`, { path: p, viewport: "desktop" }, SAME.has(new URL(a.url).origin) ? "error" : "warn", a.url);
for (const x of deadExternal) for (const p of x.pages) hit("dead-external-link", `${x.status || x.error} ${x.url}`, { path: p, viewport: "desktop" }, "info");

const sigList = [...sigs.values()].map((s) => ({ ...s, pages: s.pages.size, viewports: [...s.viewports] })).sort((a, b) => b.pages - a.pages);

// --- Output ---------------------------------------------------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = path.join(".error-sweep", stamp);
await mkdir(dir, { recursive: true });

const byPage = {};
for (const r of pages) (byPage[r.path] ??= {})[r.viewport] = r;
await writeFile(
  path.join(dir, "report.json"),
  JSON.stringify({ base: BASE_IN, origin: ORIGIN, hostNote, when: new Date().toISOString(), counts: { desktop: paths.length, mobile: mobilePaths.length }, signatures: sigList, deadLinks, deadAssets, deadExternal, skippedApiLinks: linkResults.filter((l) => l.skipped), pages: byPage }, null, 2),
);

const sevRank = { error: 0, warn: 1, info: 2 };
const lines = [
  `# Error sweep — ${ORIGIN}`,
  "",
  `${new Date().toISOString()} · ${paths.length} pages desktop · ${mobilePaths.length} mobile${MOBILE_SAMPLE ? " (one per route template)" : ""} · ${links.size} internal links · ${assets.size} audio/download links · ${external.size} external links`,
  hostNote ? `\nNote: ${hostNote}` : "",
  "",
  `${sigList.length} signatures (${sigList.filter((s) => s.severity === "error").length} error, ${sigList.filter((s) => s.severity === "warn").length} warn, ${sigList.filter((s) => s.severity === "info").length} info)`,
  "",
];
for (const sev of ["error", "warn", "info"]) {
  const group = sigList.filter((s) => s.severity === sev);
  if (!group.length) continue;
  lines.push(`## ${sev}`, "");
  for (const s of group) {
    lines.push(`### [${s.kind}] ${s.text}`, `${s.pages} page(s) · ${s.viewports.join(", ")}`, "");
    for (const e of s.examples) lines.push(`- ${e}`);
    lines.push("");
  }
}
await writeFile(path.join(dir, "summary.md"), lines.join("\n"));

const fatal = sigList.filter((s) => ["pageerror", "dead-internal-link", "same-origin-http"].includes(s.kind) || (s.kind === "doc-status" && s.severity === "error") || (s.kind === "dead-asset-link" && s.severity === "error"));
console.log(`\n${sigList.length} signatures → ${dir}/summary.md`);
for (const s of sigList.slice(0, 15).sort((a, b) => sevRank[a.severity] - sevRank[b.severity])) console.log(`  ${s.severity.padEnd(5)} ${String(s.pages).padStart(4)}  [${s.kind}] ${s.text.slice(0, 110)}`);
process.exit(fatal.length ? 1 : 0);
