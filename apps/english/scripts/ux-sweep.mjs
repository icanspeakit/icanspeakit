// Mobile UX sweep: opens pages at a phone viewport and records what makes a page awkward to
// use with a thumb — not errors (scripts/error-sweep.mjs does those), but the things behind
// rage clicks and frustration scores in the session replays.
//
//   node scripts/ux-sweep.mjs                      # one page per route template, Android Chromium
//   node scripts/ux-sweep.mjs --device iphone      # real WebKit (iOS quirks: input zoom, …); --device both
//   node scripts/ux-sweep.mjs --taps               # also tap buttons and see what lands under the finger
//   node scripts/ux-sweep.mjs --paths /grammar/aduso,/game --shots
//   node scripts/ux-sweep.mjs --all --limit 200    # every page, not one per template
//   node scripts/ux-sweep.mjs --first-visit        # with the language offer and the intro tours
//
// By default the sweep is a returning visitor: the language offer and the one-time tours
// ("da-…-seen") count as done, or they would cover every page. Dev-only controls (the demo
// dock) are left out.
//   BASE=https://icanspeak.it/english node scripts/ux-sweep.mjs
//
// Pages: the sitemap at BASE (SITEMAP=<url|file> to take it from elsewhere); `astro dev` has
// none, so then the site is crawled from "/" by its links. Default BASE is the dev server.
//
// Rules (error = fix it, warn = look at it):
//   viewport-meta     error  no width=device-width, or zoom blocked (user-scalable=no, maximum-scale<2)
//   h-overflow        error  the page scrolls sideways; the elements sticking out are listed
//   tap-small         error  a tap target under 24 px (WCAG 2.5.8), warn under --min (default 40)
//   tap-crowded       error  two targets closer than 4 px where one is under 32 px: easy to hit the wrong one
//   tap-covered       error  a target under a fixed/sticky bar at the top or the bottom of the page,
//                            where scrolling cannot bring it out
//   tap-jump          error  (--taps) after a tap a different control sits where the finger was:
//                            a second tap hits something else (the Satzbau chips, d601641)
//   tap-dead          warn   (--taps) a tap changed nothing visible on the page
//   dead-button       warn   a greyed-out action button (Prüfen, Weiter, Starten …) with `disabled`:
//                            the tap goes nowhere and nothing says why (use src/lib/notReady.js)
//   input-zoom        warn   a form field under 16 px: iOS zooms the page in on focus
//   text-small        warn   running text under 12 px
//   text-clipped      warn   text cut off by its box (overflow hidden, no ellipsis)
//   fixed-heavy       warn   fixed/sticky bars cover more than 25 % of the screen (error over 40 %)
//   layout-shift      warn   CLS over 0.1 while loading (error over 0.25); Chromium only
//
// Read-only: analytics are blocked, and during --taps every non-GET request is aborted, so a
// tap cannot save, send or buy anything. Output: .ux-sweep/<timestamp>/report.json,
// summary.md (grouped by rule, then by element), and with --shots a PNG per page with the
// problems outlined. Exit 1 when there are errors (--no-fail to always exit 0).
import { chromium, webkit } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const BASE = (process.env.BASE ?? "http://localhost:4321").replace(/\/$/, "");
const DEVICE = opt("--device", "android");
const TAPS = flag("--taps");
const TAPS_PER_PAGE = Number(opt("--taps-per-page", 6));
const SHOTS = flag("--shots");
const ALL = flag("--all");
const LIMIT = Number(opt("--limit", Infinity));
const ONLY = opt("--only");
const PATHS = opt("--paths");
const MIN = Number(opt("--min", 40));
const PARALLEL = Number(opt("--parallel", 3));
const NO_FAIL = flag("--no-fail");
const FIRST_VISIT = flag("--first-visit");
const CRAWL_MAX = 600;

const UA_MARK = "icanspeak English-UxSweep/1.0";
const BLOCK = [
  /^https?:\/\/[^/]*posthog\.com\//,
  /^https?:\/\/[^/]+\/rel(\/|$)/,
  /^https?:\/\/[^/]+\/ingest/,
  /^https?:\/\/[^/]+\/_vercel\/(insights|speed-insights)/,
  /^https?:\/\/(www\.)?googletagmanager\.com\//,
  /^https?:\/\/[^/]*google-analytics\.com\//,
];
// Taps never press these: they leave, pay, delete or send.
const DONT_TAP = /lösch|delete|entfern|abmeld|logout|sign ?out|kauf|bezahl|checkout|buy|send|abschick|beenden|kündig/i;

const DEVICES = {
  android: {
    engine: chromium,
    ctx: {
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 ${UA_MARK}`,
    },
  },
  iphone: {
    engine: webkit,
    ctx: {
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 ${UA_MARK}`,
    },
  },
};
const devices = DEVICE === "both" ? ["android", "iphone"] : [DEVICE];
if (!devices.every((d) => DEVICES[d])) { console.error(`--device android | iphone | both`); process.exit(2); }

/* ------------------------------------------------------------------ pages ---- */
async function sitemapPaths() {
  const src = process.env.SITEMAP;
  try {
    const xml = src && !/^https?:/.test(src) ? await readFile(src, "utf8")
      : await fetch(src ?? `${BASE}/sitemap.xml`).then((r) => (r.ok ? r.text() : null));
    if (!xml || !xml.includes("<loc>")) return null;
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    // A sitemap index: the pages are in the child sitemaps.
    if (/<sitemapindex/.test(xml)) {
      const out = [];
      for (const loc of locs) {
        const child = await fetch(loc.replace(/^https?:\/\/[^/]+/, BASE)).then((r) => r.text()).catch(() => "");
        out.push(...[...child.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
      }
      return out;
    }
    return locs.map((l) => new URL(l).pathname);
  } catch {
    return null;
  }
}

/** No sitemap (astro dev): the pages "/" links to, and the pages they link to, breadth first. */
async function crawlPaths() {
  const seen = new Set(["/"]);
  const queue = ["/"];
  while (queue.length && seen.size < CRAWL_MAX) {
    const p = queue.shift();
    const html = await fetch(BASE + p).then((r) => (r.ok && /html/.test(r.headers.get("content-type") ?? "") ? r.text() : "")).catch(() => "");
    for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const next = m[1].replace(/\/$/, "") || "/";
      if (/\.\w{2,5}$/.test(next) || next.startsWith("/api/") || next.startsWith("/_")) continue;
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return [...seen];
}

// One page per route template: the first segments, a trailing slug collapsed.
const template = (p) => {
  const segs = p.split("/").filter(Boolean);
  return segs.length <= 1 ? p : "/" + segs.slice(0, -1).join("/") + "/*";
};

// Git Bash turns "/game" into "C:/Program Files/Git/spiel"; take that back off.
const cleanPath = (p) => "/" + p.trim().replace(/^[A-Za-z]:\/.*?\/Git\/?/, "").replace(/^\/+/, "");
let paths = PATHS ? PATHS.split(",").filter((s) => s.trim()).map(cleanPath) : (await sitemapPaths()) ?? (await crawlPaths());
if (ONLY) paths = paths.filter((p) => p.startsWith(ONLY));
if (!ALL && !PATHS) {
  const seen = new Set();
  paths = paths.filter((p) => (seen.has(template(p)) ? false : seen.add(template(p))));
}
paths = paths.slice(0, LIMIT);
console.log(`${BASE} · ${paths.length} pages · ${devices.join(" + ")}${TAPS ? " · taps" : ""}`);

/* ----------------------------------------------------------- in the page ---- */
// Runs inside the page (page.evaluate). Self-contained: no closures from Node.
function audit({ min, where }) {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const out = [];
  const docY = scrollY;

  const sel = (el) => {
    if (!el || el.nodeType !== 1) return "";
    const parts = [];
    let e = el;
    while (e && e.nodeType === 1 && e !== document.body && parts.length < 4) {
      if (e.id && !/^(astro|r)[-:_]/.test(e.id)) { parts.unshift("#" + CSS.escape(e.id)); break; }
      let p = e.tagName.toLowerCase();
      const cls = [...e.classList].filter((c) => !/^(is-|has-|astro-)/.test(c)).slice(0, 2);
      if (cls.length) p += "." + cls.map((c) => CSS.escape(c)).join(".");
      const par = e.parentElement;
      if (par) {
        const same = [...par.children].filter((c) => c.tagName === e.tagName);
        if (same.length > 1) p += `:nth-of-type(${same.indexOf(e) + 1})`;
      }
      parts.unshift(p);
      e = e.parentElement;
    }
    return parts.join(" > ");
  };
  const label = (el) => (el?.getAttribute?.("aria-label") || el?.textContent || el?.getAttribute?.("placeholder") || el?.getAttribute?.("title") || "").replace(/\s+/g, " ").trim().slice(0, 50);
  const box = (r) => ({ x: Math.round(r.left), y: Math.round(r.top + docY), w: Math.round(r.width), h: Math.round(r.height) });
  const add = (rule, sev, el, detail, r = el?.getBoundingClientRect()) =>
    out.push({ rule, sev, sel: sel(el), text: label(el), detail, box: r ? box(r) : null, where });

  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    if (el.closest("[aria-hidden=true], [inert], .demo-dock, astro-dev-toolbar")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  /* viewport-meta */
  if (where === "top") {
    const meta = document.querySelector("meta[name=viewport]")?.content ?? "";
    if (!/width=device-width/.test(meta)) add("viewport-meta", "error", null, `viewport meta: "${meta || "fehlt"}"`, null);
    const max = /maximum-scale=([\d.]+)/.exec(meta);
    if (/user-scalable=(no|0)/.test(meta) || (max && Number(max[1]) < 2)) add("viewport-meta", "error", null, `Zoomen gesperrt: "${meta}"`, null);
  }

  /* h-overflow: only the outermost offenders, and not inside a sideways scroller */
  if (where === "top" && document.documentElement.scrollWidth > vw + 1) {
    const scrolls = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o !== "visible") return true; } return false; };
    const wide = [...document.body.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && getComputedStyle(e).position !== "fixed" && !scrolls(e); });
    const outer = wide.filter((e) => !wide.some((o) => o !== e && o.contains(e))).slice(0, 5);
    add("h-overflow", "error", outer[0] ?? null, `Seite ${document.documentElement.scrollWidth}px breit bei ${vw}px; ragt heraus: ${outer.map(sel).join(" | ")}`, outer[0]?.getBoundingClientRect());
  }

  /* tap targets */
  const TARGET = "a[href], button, input:not([type=hidden]), select, textarea, summary, label[for], [role=button], [role=link], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=menuitem], [onclick], [tabindex]:not([tabindex='-1'])";
  const isInlineLink = (el) => {
    if (el.tagName !== "A" || getComputedStyle(el).display !== "inline") return false;
    const par = el.parentElement;
    return par && par.textContent.trim().length > el.textContent.trim().length + 10;
  };
  const targetRect = (el) => {
    // A checkbox or radio is tapped through its label: that is its size.
    if (el.tagName === "INPUT" && /checkbox|radio/.test(el.type)) {
      const lab = el.closest("label") ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
      if (lab && shown(lab)) return lab.getBoundingClientRect();
    }
    return el.getBoundingClientRect();
  };
  let targets = [...document.querySelectorAll(TARGET)]
    .filter((el) => !el.disabled && shown(el))
    // A control inside another (an icon button inside a link) is one target: the outer one.
    .filter((el) => !el.parentElement?.closest(TARGET) || el.matches("input, select, textarea"))
    .filter((el) => !(el.tagName === "INPUT" && /checkbox|radio/.test(el.type) && (el.closest("label") || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)))))
    .map((el) => ({ el, r: targetRect(el) }))
    .filter(({ r }) => r.right > 0 && r.left < vw);
  const inView = ({ r }) => r.bottom > 0 && r.top < vh;

  // Inside a fixed or sticky bar: content scrolls under it, so overlapping it is not crowding.
  const pinned = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) if (/fixed|sticky/.test(getComputedStyle(e).position)) return true; return false; };
  if (where === "top" || where === "mid") {
    for (const t of targets) {
      if (isInlineLink(t.el)) continue;
      const s = Math.min(t.r.width, t.r.height);
      if (s < 24) add("tap-small", "error", t.el, `${Math.round(t.r.width)}×${Math.round(t.r.height)}px (mind. 24)`, t.r);
      else if (s < min) add("tap-small", "warn", t.el, `${Math.round(t.r.width)}×${Math.round(t.r.height)}px (empfohlen ${min})`, t.r);
    }
    /* tap-crowded */
    const ts = targets.filter((t) => !isInlineLink(t.el)).map((t) => ({ ...t, pin: pinned(t.el) })).slice(0, 400);
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        if (ts[i].pin !== ts[j].pin) continue;
        const a = ts[i].r, b = ts[j].r;
        const gx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
        const gy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
        if (gx >= 4 || gy >= 4) continue;
        // Side by side: their widths matter; stacked: their heights.
        const along = gx > 0 || (gy === 0 && Math.abs(a.left - b.left) > Math.abs(a.top - b.top)) ? Math.min(a.width, b.width) : Math.min(a.height, b.height);
        const overlap = gx === 0 && gy === 0 && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
        if (along < 32 || overlap) {
          add("tap-crowded", "error", ts[i].el, `${overlap ? "überlappt" : `${Math.round(Math.max(gx, gy))}px Abstand`} zu ${sel(ts[j].el)} „${label(ts[j].el)}“`, a);
        }
      }
    }
  }

  /* tap-covered: at the very top and the very bottom nothing can scroll out from under a bar */
  if (where === "top" || where === "bottom") {
    for (const t of targets.filter(inView)) {
      const cx = Math.min(Math.max(t.r.left + t.r.width / 2, 1), vw - 1);
      const cy = Math.min(Math.max(t.r.top + t.r.height / 2, 1), vh - 1);
      const hit = document.elementFromPoint(cx, cy);
      // At the top only a bar up there traps a target, at the bottom only one down there.
      if (where === "top" ? cy > vh / 2 : cy < vh / 2) continue;
      if (!hit || hit === t.el || t.el.contains(hit) || hit.contains(t.el)) continue;
      let cover = hit;
      while (cover && cover !== document.body && !/fixed|sticky/.test(getComputedStyle(cover).position)) cover = cover.parentElement;
      if (!cover || cover === document.body || cover.contains(t.el)) continue;
      add("tap-covered", "error", t.el, `liegt unter ${sel(cover)} (${where === "top" ? "ganz oben" : "ganz unten"})`, t.r);
    }
  }

  if (where === "top") {
    /* dead-button: an action that is greyed out and swallows the tap without a word
       (CLAUDE.md, src/lib/notReady.js: aria-disabled + data-why instead) */
    const ACTION = /prüfen|auswerten|weiter|starten|start|testen|senden|abschicken|fertig|check|next|submit|send/i;
    for (const el of document.querySelectorAll("main button:disabled, main input[type=submit]:disabled")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || el.closest("[aria-hidden=true], [hidden]")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (ACTION.test(label(el)) || /check|submit|start|next|primary|send/.test(el.className)) add("dead-button", "warn", el, "gesperrt ohne Grund – aria-disabled + data-why (notReady.js) statt disabled");
    }
    /* input-zoom */
    for (const el of document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]), select, textarea")) {
      if (!shown(el) || el.disabled) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) add("input-zoom", "warn", el, `Schrift ${fs}px – iOS zoomt beim Antippen hinein`);
    }
    /* text-small: per element with its own text */
    const smallSeen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim().length > 2 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || smallSeen.has(el) || /^(SCRIPT|STYLE|NOSCRIPT|SVG|TEXT)$/i.test(el.tagName)) continue;
      smallSeen.add(el);
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12 && shown(el)) add("text-small", "warn", el, `${fs}px`);
    }
    /* text-clipped */
    for (const el of smallSeen) {
      if (!shown(el)) continue;
      const cs = getComputedStyle(el);
      if (!/hidden|clip/.test(cs.overflowX + cs.overflow) || cs.textOverflow === "ellipsis" || el.clientWidth === 0) continue;
      if (el.scrollWidth > el.clientWidth + 2) add("text-clipped", "warn", el, `${el.scrollWidth}px Text in ${el.clientWidth}px`);
    }
  }

  /* fixed-heavy, measured half way down where bars usually are all present */
  if (where === "mid") {
    const bars = [...document.body.querySelectorAll("*")].filter((e) => /fixed|sticky/.test(getComputedStyle(e).position) && shown(e))
      .filter((e, _, all) => !all.some((o) => o !== e && o.contains(e)))
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.bottom > 0 && r.top < vh && r.width > vw * 0.6 && r.height < vh * 0.6 && (r.top <= 2 || r.bottom >= vh - 2))
      // A sticky element in its normal place in the page is not a bar.
      .filter(({ e, r }) => getComputedStyle(e).position === "fixed" || r.top <= 2 || r.bottom >= vh - 2);
    const covered = bars.reduce((a, { r }) => a + Math.min(r.bottom, vh) - Math.max(r.top, 0), 0);
    const share = covered / vh;
    if (share > 0.25) add("fixed-heavy", share > 0.4 ? "error" : "warn", bars[0]?.e ?? null, `${Math.round(share * 100)} % des Bildschirms: ${bars.map(({ e, r }) => `${sel(e)} ${Math.round(r.height)}px`).join(" + ")}`, null);
  }
  return out;
}

/* ------------------------------------------------------------------- run ---- */
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = path.join(".ux-sweep", stamp);
await mkdir(OUT, { recursive: true });

const results = []; // { device, path, issues: [], error? }

async function settle(page) {
  await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function checkPage(ctx, device, p) {
  const page = await ctx.newPage();
  const issues = [];
  try {
    const res = await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!res || res.status() >= 400) return { device, path: p, issues, error: `HTTP ${res?.status() ?? "?"}` };
    await settle(page);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    issues.push(...(await page.evaluate(audit, { min: MIN, where: "top" })));
    await page.evaluate((y) => scrollTo(0, y), Math.max(0, height / 2 - 422));
    await page.waitForTimeout(300);
    issues.push(...(await page.evaluate(audit, { min: MIN, where: "mid" })));
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(400);
    issues.push(...(await page.evaluate(audit, { min: MIN, where: "bottom" })));
    const cls = await page.evaluate(() => window.__ux ?? null);
    if (cls?.supported && cls.value > 0.1) {
      issues.push({ rule: "layout-shift", sev: cls.value > 0.25 ? "error" : "warn", sel: cls.sources[0] ?? "", text: "", detail: `CLS ${cls.value.toFixed(3)}; verschoben: ${cls.sources.slice(0, 4).join(" | ")}`, box: null, where: "load" });
    }
    if (TAPS) issues.push(...(await tapCheck(page, p)));
    if (SHOTS && issues.length) await shoot(page, device, p, issues);
  } catch (e) {
    return { device, path: p, issues, error: String(e.message ?? e).split("\n")[0] };
  } finally {
    await page.close().catch(() => {});
  }
  // The same element found at two scroll positions is one finding.
  const seen = new Set();
  const unique = issues.filter((i) => { const k = `${i.rule}|${i.sel}|${i.detail}`; return seen.has(k) ? false : seen.add(k); });
  return { device, path: p, issues: unique };
}

/* Taps: press a few buttons, each on a freshly loaded page, and look at what is under the
   finger afterwards. A different control there means a quick second tap goes astray. */
async function tapCheck(page, p) {
  const found = [];
  const candidates = await page.evaluate((dontTap) => {
    const re = new RegExp(dontTap, "i");
    const sel = (el) => {
      const parts = [];
      let e = el;
      while (e && e.nodeType === 1 && e !== document.body && parts.length < 6) {
        if (e.id) { parts.unshift("#" + CSS.escape(e.id)); break; }
        let s = e.tagName.toLowerCase();
        const par = e.parentElement;
        if (par) s += `:nth-child(${[...par.children].indexOf(e) + 1})`;
        parts.unshift(s);
        e = e.parentElement;
      }
      return parts.join(" > ");
    };
    const sig = (el) => el.tagName + "." + [...el.classList].filter((c) => !/^is-|^has-/.test(c)).sort().join(".");
    const seen = new Set();
    return [...document.querySelectorAll("main button, main [role=button], main [role=tab], main [data-choice], main .chip")]
      .filter((el) => {
        if (el.disabled || el.closest("a[href]")) return false;
        if (el.tagName === "BUTTON" && el.type === "submit" && el.form) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || getComputedStyle(el).visibility === "hidden") return false;
        const text = (el.getAttribute("aria-label") || el.textContent || "").trim();
        if (re.test(text)) return false;
        const k = sig(el);
        return seen.has(k) ? false : seen.add(k);
      })
      .map((el) => ({ sel: sel(el), text: (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) }));
  }, DONT_TAP.source);

  await page.route("**/*", (route) => (["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.fallback() : route.abort()));
  for (const c of candidates.slice(0, TAPS_PER_PAGE)) {
    try {
      await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await settle(page);
      const loc = page.locator(c.sel).first();
      if (!(await loc.count())) continue;
      await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
      // Tap only once the target holds still: a page still shifting (fonts, late content)
      // moves things on its own — that is layout-shift, not this tap's doing.
      let r = await loc.boundingBox();
      for (let k = 0; k < 12; k++) {
        await page.waitForTimeout(250);
        const r2 = await loc.boundingBox();
        const still = r && r2 && Math.abs(r2.x - r.x) < 1 && Math.abs(r2.y - r.y) < 1;
        r = r2;
        if (still) break;
      }
      if (!r) continue;
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const before = await page.evaluate(([x, y]) => {
        window.__tapEl = document.elementFromPoint(x, y)?.closest("button, a, [role], input, select, label, [data-choice]") ?? null;
        return document.body.innerText.length + "|" + document.body.querySelectorAll("*").length + "|" + document.documentElement.scrollHeight;
      }, [x, y]);
      const url = page.url();
      await page.touchscreen.tap(x, y);
      await page.waitForTimeout(500);
      if (page.url().split("#")[0] !== url.split("#")[0]) continue; // it navigated: a link-like button, fine
      const after = await page.evaluate(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        const ctl = hit?.closest("button, a[href], [role=button], [role=tab], input, select, label, [data-choice]") ?? null;
        const was = window.__tapEl;
        // An overlay opening under the finger (menu, dialog, sheet) is what the tap was for.
        const overlay = hit?.closest("dialog, [role=dialog], [role=menu], [popover], [aria-modal=true]") || (() => { for (let e = hit; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).position === "fixed") return true; return false; })();
        const text = (el) => (el?.getAttribute("aria-label") || el?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
        return {
          // A row drawn again in place puts a new element with the same label there: no jump.
          jumped: !!ctl && !overlay && ctl !== was && text(ctl) !== text(was),
          now: text(ctl),
          state: document.body.innerText.length + "|" + document.body.querySelectorAll("*").length + "|" + document.documentElement.scrollHeight,
        };
      }, [x, y]);
      if (after.jumped) {
        found.push({ rule: "tap-jump", sev: "error", sel: c.sel, text: c.text, detail: `nach dem Tippen liegt „${after.now}“ unter dem Finger`, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, where: "tap" });
      } else if (after.state === before) {
        found.push({ rule: "tap-dead", sev: "warn", sel: c.sel, text: c.text, detail: "Tippen ändert nichts Sichtbares (oder nur Ton/Fokus)", box: null, where: "tap" });
      }
    } catch { /* one stubborn button does not stop the page */ }
  }
  await page.unroute("**/*");
  return found;
}

async function shoot(page, device, p, issues) {
  await page.evaluate((boxes) => {
    for (const b of boxes) {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;outline:2px solid ${b.sev === "error" ? "#e11" : "#f90"};z-index:2147483647;pointer-events:none`;
      document.body.append(d);
    }
  }, issues.filter((i) => i.box).map((i) => ({ ...i.box, sev: i.sev })));
  const name = `${device}${p.replace(/\W+/g, "_") || "_home"}.png`.slice(0, 120);
  await page.screenshot({ path: path.join(OUT, name), fullPage: true }).catch(() => {});
}

// CLS from the first paint on (Chromium; WebKit has no layout-shift entries).
const CLS_INIT = () => {
  window.__ux = { supported: false, value: 0, sources: [] };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__ux.value += e.value;
        for (const s of e.sources ?? []) {
          const n = s.node;
          if (n?.nodeType === 1 && window.__ux.sources.length < 8) window.__ux.sources.push(n.tagName.toLowerCase() + (n.id ? "#" + n.id : n.classList[0] ? "." + n.classList[0] : ""));
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
    window.__ux.supported = true;
  } catch {}
};

// A returning visitor: offers dismissed, one-time tours seen. Only where nothing is stored yet.
// Dev-only controls are not part of the page a learner sees. Smooth scrolling off: a box
// measured mid-scroll sends the tap somewhere else.
const HIDE_DEV = () => {
  const css = () => { const st = document.createElement("style"); st.textContent = ".demo-dock, #vp-dev-reset, astro-dev-toolbar { display: none !important; } html, body { scroll-behavior: auto !important; }"; document.head.append(st); };
  if (document.head) css(); else document.addEventListener("DOMContentLoaded", css);
};
const RETURNING = () => {
  const get = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    const v = get.call(this, k);
    if (v != null || this !== window.localStorage) return v;
    if (k === "da_lang_offer") return "dismissed";
    if (k === "da_einfach_offer") return "done";
    if (/seen$/i.test(k)) return "1";
    return v;
  };
};

for (const device of devices) {
  const { engine, ctx: opts } = DEVICES[device];
  const browser = await engine.launch();
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(CLS_INIT);
  await ctx.addInitScript(HIDE_DEV);
  if (!FIRST_VISIT) await ctx.addInitScript(RETURNING);
  await ctx.route("**/*", (route) => (BLOCK.some((re) => re.test(route.request().url())) ? route.abort() : route.fallback()));
  let i = 0;
  const worker = async () => {
    while (i < paths.length) {
      const p = paths[i++];
      const r = await checkPage(ctx, device, p);
      results.push(r);
      const e = r.issues.filter((x) => x.sev === "error").length;
      const w = r.issues.length - e;
      console.log(`${device.padEnd(7)} ${p.padEnd(50)} ${r.error ? `! ${r.error}` : `${e} errors · ${w} warnings`}`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  await browser.close();
}

/* --------------------------------------------------------------- report ---- */
const all = results.flatMap((r) => r.issues.map((i) => ({ ...i, device: r.device, path: r.path })));
const RULES = ["viewport-meta", "h-overflow", "tap-jump", "tap-covered", "tap-crowded", "tap-small", "dead-button", "fixed-heavy", "layout-shift", "input-zoom", "text-clipped", "text-small", "tap-dead"];
// The same element on many pages (a header button) is one thing to fix: group by its selector
// with the list positions taken out.
const shape = (s) => s.replace(/:nth-(of-type|child)\(\d+\)/g, "");
const lines = [
  `# Mobile UX sweep – ${stamp}`,
  "",
  `${BASE} · ${results.length} page loads · ${devices.join(" + ")}${TAPS ? " · taps" : ""}`,
  "",
  "| Regel | Fehler | Warnungen | Seiten |",
  "|---|---:|---:|---:|",
];
for (const rule of RULES) {
  const of = all.filter((i) => i.rule === rule);
  if (!of.length) continue;
  lines.push(`| ${rule} | ${of.filter((i) => i.sev === "error").length} | ${of.filter((i) => i.sev === "warn").length} | ${new Set(of.map((i) => i.path)).size} |`);
}
for (const rule of RULES) {
  const of = all.filter((i) => i.rule === rule);
  if (!of.length) continue;
  lines.push("", `## ${rule}`, "");
  const groups = new Map();
  for (const i of of) {
    const k = `${i.sev}|${shape(i.sel)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  }
  const sorted = [...groups.values()].sort((a, b) => (a[0].sev === b[0].sev ? b.length - a.length : a[0].sev === "error" ? -1 : 1));
  for (const g of sorted.slice(0, 25)) {
    const i = g[0];
    const pages = [...new Set(g.map((x) => x.path))];
    lines.push(`- **${i.sev}** \`${shape(i.sel) || "(Seite)"}\`${i.text ? ` „${i.text}“` : ""} – ${i.detail}  `);
    lines.push(`  ${g.length}× auf ${pages.length} Seite(n): ${pages.slice(0, 5).join(", ")}${pages.length > 5 ? " …" : ""}${devices.length > 1 ? ` (${[...new Set(g.map((x) => x.device))].join(", ")})` : ""}`);
  }
  if (sorted.length > 25) lines.push(`- … ${sorted.length - 25} weitere Gruppen in report.json`);
}
const failed = results.filter((r) => r.error);
if (failed.length) lines.push("", "## Nicht geprüft", "", ...failed.map((r) => `- ${r.device} ${r.path}: ${r.error}`));

await writeFile(path.join(OUT, "report.json"), JSON.stringify({ base: BASE, devices, taps: TAPS, results }, null, 2));
await writeFile(path.join(OUT, "summary.md"), lines.join("\n") + "\n");
const errors = all.filter((i) => i.sev === "error").length;
console.log(`\n${errors} errors · ${all.length - errors} warnings → ${path.join(OUT, "summary.md")}`);
process.exit(errors && !NO_FAIL ? 1 : 0);
