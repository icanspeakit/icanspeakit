// German in a non-German interface. `node scripts/scan-german-ui.mjs --app french --base http://localhost:4393/francais`
//
// The course apps (french, spanish, italian, portuguese, english) were cloned from a German
// site. A reader whose UI language is not German must see no German. This crawls a running
// site (astro dev or a preview of dist) in a real browser, with the interface language set,
// and flags German in what the reader sees: text nodes, aria-label / title / alt /
// placeholder, <title>, meta description. It also checks the i18n dictionaries themselves:
// German values inside en/fr/es/it/pt.json, and keys that an offered language lacks.
//
//   --app <name>        french | spanish | italian | portuguese | english   (required)
//   --base <url>        site root incl. base path, e.g. http://localhost:4393/francais
//   --dist <dir>        instead of --base: serve a built dist/ (needs --prefix /francais) and scan that
//   --nojs              scripts off: what a search engine, a link preview or the first paint shows
//   --lang <code,...>   UI languages to test (default: en). "auto" = first visit, nothing stored
//   --max <n>           page limit (default 2000)    --paths a,b   only these paths (no crawl)
//   --conc <n>          parallel pages (default 4)   --json <file> write the findings
//   --dicts-only        only the dictionary checks   --no-dicts   skip them
//   --per-dir <n>       pages per parent directory taken from a crawl (default 5, not with --dist): the 78 grammar
//                       topics are one template; --all takes every page
//   --show <n>          lines per kind (default 400)
//
// What counts as German: an umlaut / ß in a word, or a word from the German-only lexicon (words
// in de.json that no other language file of the app uses). German on purpose is skipped:
// lang="de" / translate="no" / data-i18n-skip / <code> ancestors, and scripts/scan-german-ui.allow.json
// (words per app that look German to the lexicon but are not, each with a reason).
// Exit 1 when anything is found.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import http from "node:http";

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf("--" + n);
  if (i < 0) return d;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};
const app = opt("app");
if (!app || app === true) {
  console.error("--app <french|spanish|italian|portuguese|english> required");
  process.exit(2);
}
const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(ROOT, "apps", app);
const I18N = path.join(APP, "public", "i18n");
const langs = String(opt("lang", "en")).split(",");
const MAX = +opt("max", 2000);
const CONC = +opt("conc", 4);
const PER_DIR = opt("all") || (opt("dist") && opt("nojs") && !opt("per-dir")) ? Infinity : +opt("per-dir", 5);

const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const tokensOf = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/\{\w+\}/g, " ").match(/[A-Za-zÄÖÜäöüßÀ-ÿ]+/g) ?? [];

// ---- the German-only lexicon ----
const files = fs.readdirSync(I18N).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const dicts = Object.fromEntries(files.map((c) => [c, read(path.join(I18N, c + ".json"))]));
const others = new Set();
for (const c of files) if (c !== "de") for (const v of Object.values(dicts[c])) for (const t of tokensOf(v)) others.add(t.toLowerCase());
const GERMAN = new Set();
for (const v of Object.values(dicts.de ?? {})) for (const t of tokensOf(v)) {
  const l = t.toLowerCase();
  if (l.length >= 3 && !others.has(l)) GERMAN.add(l);
}
const allowFile = path.join(ROOT, "scripts/scan-german-ui.allow.json");
const allowCfg = fs.existsSync(allowFile) ? read(allowFile) : {};
const SELECTORS = allowCfg.selectors?.[app] ?? [];
const TEXTS = (allowCfg.texts?.[app] ?? []).map((t) => new RegExp(t));
const ALLOW = new Set(((fs.existsSync(allowFile) ? read(allowFile).words?.[app] : []) ?? []).map((w) => w.toLowerCase()));
const UMLAUT = /[A-Za-z]*(?:[äöÄÖßÜ]|ü(?![aeiouy]))[A-Za-z]*/g;

export function germanIn(text) {
  const hits = [];
  if (TEXTS.some((r) => r.test(text))) return hits;
  for (const m of text.matchAll(UMLAUT)) if (!ALLOW.has(m[0].toLowerCase())) hits.push(m[0]);
  for (const t of tokensOf(text)) {
    const l = t.toLowerCase();
    if (l.length >= 3 && GERMAN.has(l) && !ALLOW.has(l)) hits.push(t);
  }
  return [...new Set(hits)];
}

const problems = [];
const add = (kind, where, what, extra = "") => problems.push({ kind, where, what, extra });

// ---- dictionary checks ----
async function dictCheck() {
  const { langsFor } = await import(pathToFileURL(path.join(APP, "src/lib/languages.js")).href);
  const offered = langsFor("ui");
  const base = dicts.en;
  for (const c of files) {
    if (c === "de") continue;
    for (const [k, v] of Object.entries(dicts[c])) {
      const g = germanIn(String(v));
      if (g.length) add("dict-german", `${c}.json:${k}`, String(v).slice(0, 90), g.slice(0, 4).join(","));
    }
  }
  for (const c of offered) {
    if (c === "en" || !dicts[c]) continue;
    for (const k of Object.keys(base)) if (!(k in dicts[c])) add("dict-missing", `${c}.json`, k);
  }
}

// ---- crawl ----
const skipRe = /\/(intern|design-system|newfont|list|testnavbarlanguages|nav\d|api|_astro|admin)(\/|$)/;

async function main() {
  if (!opt("no-dicts")) await dictCheck();
  if (opt("dicts-only")) return finish();
  const playwright = createRequire(path.join(APP, "package.json"))("@playwright/test");
  let base = opt("base");
  let server;
  if (opt("dist") && opt("dist") !== true) {
    const dist = path.resolve(String(opt("dist"))), prefix = String(opt("prefix", ""));
    const mime = { html: "text/html; charset=utf-8", js: "text/javascript", css: "text/css", json: "application/json", svg: "image/svg+xml", png: "image/png", webp: "image/webp", jpg: "image/jpeg", mp3: "audio/mpeg", woff2: "font/woff2" };
    server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (prefix && p.startsWith(prefix)) p = p.slice(prefix.length) || "/";
      const cands = [p, p.replace(/\/$/, "") + "/index.html", p + ".html"];
      for (const c of cands) { const f = path.join(dist, c); if (f.startsWith(dist) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { "content-type": mime[f.split(".").pop()] ?? "application/octet-stream" }); return fs.createReadStream(f).pipe(res); } }
      res.writeHead(404); res.end("404");
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${server.address().port}${prefix}`;
  }
  if (!base || base === true) { console.error("--base http://localhost:PORT/basepath required"); process.exit(2); }
  base = String(base).replace(/\/$/, "");
  const origin = new URL(base).origin;
  const basePath = new URL(base).pathname;
  // The installed browser build may lag the playwright package: take the newest one on disk.
  let executablePath;
  try { executablePath = playwright.chromium.executablePath(); if (!fs.existsSync(executablePath)) throw 0; } catch {
    const dir = path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
    const c = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => b.slice(9) - a.slice(9)) : [];
    executablePath = c.length ? path.join(dir, c[0], "chrome-win64", "chrome.exe") : undefined;
  }
  const browser = await playwright.chromium.launch({ executablePath });
  for (const lang of langs) {
    const ctx = await browser.newContext({ locale: lang === "auto" ? "en-US" : lang === "en" ? "en-US" : lang, viewport: { width: 1280, height: 900 }, javaScriptEnabled: !opt("nojs") });
    if (lang !== "auto") await ctx.addInitScript((l) => { try { localStorage.setItem("da_lang", l); } catch {} }, lang);
    await ctx.route(/(posthog|sentry|google-analytics|googletagmanager|clarity|cloudflareinsights)/, (r) => r.abort());
    const seen = new Set();
    const perDir = new Map();
    const only = opt("paths") && opt("paths") !== true;
    const queue = only ? String(opt("paths")).split(",").map((p) => base + p) : [base + "/"];
    const norm = (u) => { const x = new URL(u, origin); return x.origin + x.pathname.replace(/\/$/, ""); };
    queue.forEach((u) => seen.add(norm(u)));
    let n = 0;
    const agg = new Map();
    const worker = async () => {
      const page = await ctx.newPage();
      while (queue.length && n < MAX) {
        const url = queue.shift();
        n++;
        if (n % 25 === 0) console.error(`[${lang}] ${n} pages, ${queue.length} queued`);
        try {
          const res = await page.goto(url, { waitUntil: opt("nojs") ? "domcontentloaded" : "load", timeout: 45000 });
          if (!res || res.status() >= 400) { if (res?.status() !== 404) add("http", url, String(res?.status())); continue; }
          if (!opt("nojs")) await page.waitForTimeout(600);
          const data = await page.evaluate((SELECTORS) => {
            const out = [];
            const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "CODE", "KBD"]);
            const skipped = (el) => {
              for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
                if (SKIP.has(e.tagName.toUpperCase())) return true;
                const l = (e.getAttribute && e.getAttribute("lang")) || "";
                if (/^de/i.test(l)) return true;
                if (e.getAttribute && e.getAttribute("translate") === "no") return true;
                if (SELECTORS.length && e.matches && e.matches(SELECTORS.join(","))) return true;
                if (e.hasAttribute && (e.hasAttribute("data-i18n-skip") || e.hasAttribute("data-scan-skip"))) return true;
              }
              return false;
            };
            const desc = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : "");
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            for (let nd; (nd = w.nextNode());) {
              const t = nd.nodeValue.replace(/\s+/g, " ").trim();
              if (t.length > 1 && !skipped(nd.parentElement)) out.push(["text", t, desc(nd.parentElement)]);
            }
            for (const el of document.querySelectorAll("[aria-label],[title],[alt],[placeholder],input[type=button],input[type=submit]")) {
              if (skipped(el)) continue;
              for (const a of ["aria-label", "title", "alt", "placeholder", "value"]) {
                if (a === "value" && !/^(button|submit)$/.test(el.type)) continue;
                const v = el.getAttribute(a);
                if (v && v.trim().length > 1) out.push([a, v.trim(), desc(el)]);
              }
            }
            out.push(["title", document.title, "title"]);
            for (const m of document.querySelectorAll('meta[name=description],meta[property="og:title"],meta[property="og:description"]')) out.push(["meta", m.content, m.getAttribute("name") || m.getAttribute("property")]);
            return { out, links: [...document.querySelectorAll("a[href]")].map((a) => a.href) };
          }, SELECTORS);
          const pth = new URL(url).pathname.slice(basePath.length) || "/";
          for (const [kind, text, el] of data.out) {
            const g = germanIn(text);
            if (!g.length) continue;
            const key = kind + "|" + text;
            const e = agg.get(key) ?? { kind, text, el, hits: g, pages: [] };
            if (e.pages.length < 400) e.pages.push(pth);
            agg.set(key, e);
          }
          if (!only) for (const l of data.links) {
            let u; try { u = new URL(l); } catch { continue; }
            if (u.origin !== origin || !u.pathname.startsWith(basePath)) continue;
            if (/\.(pdf|png|jpe?g|webp|svg|json|xml|txt|zip|mp3|mp4|ico|css|js)$/i.test(u.pathname) || skipRe.test(u.pathname)) continue;
            const k = norm(l);
            if (seen.has(k)) continue;
            const dir = k.slice(0, k.lastIndexOf("/")); const c = perDir.get(dir) ?? 0;
            if (c >= PER_DIR && k.slice(origin.length + basePath.length).split("/").length > 2) continue;
            perDir.set(dir, c + 1); seen.add(k); queue.push(k);
          }
        } catch (e) { add("error", url, String(e.message).slice(0, 100)); }
      }
      await page.close();
    };
    do { await Promise.all(Array.from({ length: CONC }, worker)); } while (queue.length && n < MAX);
    console.error(`[${lang}] ${n} pages crawled`);
    for (const e of agg.values()) add("page-german", `[${lang}] ${e.pages.length} page(s), e.g. ${e.pages.slice(0, 3).join(" ")}`, `${e.kind} <${e.el}> ${e.text.slice(0, 110)}`, e.hits.slice(0, 4).join(","));
    await ctx.close();
  }
  await browser.close();
  server?.close();
  finish();
}

function finish() {
  const out = opt("json");
  if (out && out !== true) fs.writeFileSync(out, JSON.stringify(problems, null, 1));
  const by = {};
  for (const p of problems) (by[p.kind] ??= []).push(p);
  for (const [k, list] of Object.entries(by)) {
    console.log(`\n== ${k}: ${list.length}`);
    for (const p of list.slice(0, +opt("show", 400))) console.log(`  ${p.where}\n      ${p.what}${p.extra ? `   <${p.extra}>` : ""}`);
  }
  console.log(`\nscan-german-ui ${app}: ${problems.length} finding(s)`);
  process.exit(problems.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
