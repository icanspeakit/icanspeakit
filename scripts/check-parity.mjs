#!/usr/bin/env node
// Course parity: every language course (apps/english, spanish, french, portuguese, italian)
// carries the same shell: the brand kit (brand/kit), the shared analytics, the deploy and check
// scripts, a manifest for its own path, and links to the other live courses. The courses are
// copies of each other that drift apart while their queues run; this check names the drift.
//
//   node scripts/check-parity.mjs                 all course apps that exist
//   node scripts/check-parity.mjs french italian  only these
//
// Exit 1 on any error. Warnings (audio, UI languages) don't fail.
// Reference: brand/kit (MANIFEST.md says where each kit file goes), apps/hub/src/lib/analytics.js,
// apps/hub/src/data/courses.ts (which courses are live).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KIT = join(ROOT, "brand/kit");
const COURSES = {
  english: { name: "English", lang: "en" },
  spanish: { name: "Spanish", lang: "es" },
  french: { name: "French", lang: "fr" },
  portuguese: { name: "Portuguese", lang: "pt" },
  italian: { name: "Italian", lang: "it" },
};
const UI_LANGS = ["en", "de", "es", "fr", "pt", "it"];

const read = (p) => readFileSync(p);
const text = (p) => readFileSync(p, "utf8");
const same = (a, b) => existsSync(a) && existsSync(b) && read(a).equals(read(b));
const files = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile()) : []);
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Live courses, from the hub's course list.
const hubCourses = text(join(ROOT, "apps/hub/src/data/courses.ts"));
const live = [...hubCourses.matchAll(/slug:\s*'([a-z]+)'[\s\S]*?live:\s*(true|false)/g)]
  .filter((m) => m[2] === "true")
  .map((m) => m[1]);

const wanted = process.argv.slice(2);
const apps = (wanted.length ? wanted : Object.keys(COURSES)).filter((a) => {
  if (!COURSES[a]) {
    console.error(`unknown course app: ${a}`);
    process.exit(2);
  }
  return existsSync(join(ROOT, "apps", a, "package.json"));
});

let errors = 0;
for (const slug of apps) {
  const app = join(ROOT, "apps", slug);
  const { name, lang } = COURSES[slug];
  const err = [];
  const warn = [];

  // 1. Kit logos, byte for byte; no retired logo sets.
  for (const f of files(join(KIT, "logos"))) {
    if (!same(join(KIT, "logos", f), join(app, "public/logos", f))) err.push(`public/logos/${f} missing or not the kit file`);
  }
  for (const f of files(join(app, "public/logos"))) {
    if (/^icanspeakit-|^icanspeak-(english|spanish|french|portuguese|italian)-|^favicon\./.test(f)) {
      err.push(`public/logos/${f} is a retired logo (the kit replaced it)`);
    }
  }

  // 2. Kit icons at the paths the course Layout uses (brand/kit/MANIFEST.md).
  const icons = {
    "favicon.svg": "favicon.svg",
    "favicon.ico": "favicon.ico",
    "favicon-16.png": "favicon-16x16.png",
    "favicon-32.png": "favicon-32x32.png",
    "apple-touch-icon.png": "apple-touch-icon.png",
    "icon-192.png": "icon-192.png",
    "icon-512.png": "icon-512.png",
    "icon-maskable-512.png": "icon-maskable-512.png",
    "og-default.png": "og/og-default.png",
  };
  for (const [k, p] of Object.entries(icons)) {
    if (!same(join(KIT, "icons", k), join(app, "public", p))) err.push(`public/${p} missing or not the kit's icons/${k}`);
  }

  // 3. Kit fonts, tokens, tiles.
  for (const f of files(join(KIT, "fonts")).filter((f) => f.endsWith(".woff2"))) {
    if (!same(join(KIT, "fonts", f), join(app, "public/fonts/icanspeak", f))) err.push(`public/fonts/icanspeak/${f} missing or not the kit file`);
  }
  const norm = (p) => (existsSync(p) ? text(p).replace(/\s+/g, " ").trim() : null);
  if (norm(join(KIT, "tokens.css")) !== norm(join(app, "src/styles/brand-tokens.css"))) err.push("src/styles/brand-tokens.css is not the kit's tokens.css");
  if (norm(join(KIT, "tiles.css")) !== norm(join(app, "src/styles/tiles.css"))) err.push("src/styles/tiles.css is not the kit's tiles.css");
  const globalCss = existsSync(join(app, "src/styles/global.css")) ? text(join(app, "src/styles/global.css")) : "";
  if (!/^@import "\.\/brand-tokens\.css";/m.test(globalCss)) err.push('src/styles/global.css does not start by importing "./brand-tokens.css"');
  const root = globalCss.match(/:root\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  for (const [token, want] of [["--brand-blue", "#172a6e"], ["--accent", "#ffc21a"]]) {
    const got = root.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();
    if (got !== want) err.push(`global.css :root ${token} is ${got ?? "missing"}, the kit wants ${want} (the pre-kit palette is still in place)`);
  }

  // 4. Retired logo files still referenced from code.
  const retired = /logos\/(icanspeakit-[a-z0-9-]+|icanspeak-(english|spanish|french|portuguese|italian)-[a-z0-9-]+|favicon)\.(svg|png|ico)/;
  for (const p of walk(join(app, "src"))) {
    if (!/\.(astro|js|ts|mjs|css|json)$/.test(p)) continue;
    const m = text(p).match(retired);
    if (m) err.push(`${p.slice(app.length + 1).replaceAll("\\", "/")} references the retired ${m[0]}`);
  }

  // 5. Shared analytics, wired with this course's name.
  if (!same(join(ROOT, "apps/hub/src/lib/analytics.js"), join(app, "src/lib/analytics.js"))) err.push("src/lib/analytics.js differs from apps/hub/src/lib/analytics.js");
  const layout = existsSync(join(app, "src/layouts/Layout.astro")) ? text(join(app, "src/layouts/Layout.astro")) : "";
  if (!layout.includes(`initAnalytics("${slug}")`)) err.push(`Layout.astro does not call initAnalytics("${slug}")`);
  const backend = existsSync(join(app, "src/lib/backend.js")) ? text(join(app, "src/lib/backend.js")) : "";
  if (!/analytics:\s*true/.test(backend)) err.push("src/lib/backend.js does not switch analytics on");

  // 6. Deploy and check scripts.
  const pkg = JSON.parse(text(join(app, "package.json")));
  for (const s of ["check:base", "check:links", "cf:prepare", "deploy"]) {
    if (!pkg.scripts?.[s]) err.push(`package.json has no "${s}" script`);
  }
  const wrangler = existsSync(join(app, "wrangler.jsonc")) ? text(join(app, "wrangler.jsonc")) : "";
  if (!wrangler.includes(`icanspeak.it/${slug}/*`)) err.push(`wrangler.jsonc has no route icanspeak.it/${slug}/*`);

  // 7. Web manifest for this course's path.
  try {
    const m = JSON.parse(text(join(app, "public/site.webmanifest")));
    if (m.name !== `icanspeak ${name}`) err.push(`site.webmanifest name is "${m.name}", want "icanspeak ${name}"`);
    if (m.start_url !== `/${slug}/` || m.scope !== `/${slug}/`) err.push(`site.webmanifest start_url/scope are not /${slug}/`);
    for (const i of m.icons ?? []) if (!i.src.startsWith(`/${slug}/icon-`)) err.push(`site.webmanifest icon ${i.src} is not a kit icon under /${slug}/`);
  } catch (e) {
    err.push(`public/site.webmanifest unreadable: ${e.message}`);
  }

  // 8. The course home links every other live course (the "five languages" pills).
  const home = existsSync(join(app, "src/pages/index.astro")) ? text(join(app, "src/pages/index.astro")) : "";
  for (const other of live) {
    if (other !== slug && !home.includes(`https://icanspeak.it/${other}/`)) err.push(`src/pages/index.astro does not link the live ${other} course (https://icanspeak.it/${other}/)`);
  }

  // 9. Audio slugs that Windows can't store as files (con.mp3, nul.mp3 …): git can't add them.
  const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
  for (const p of walk(join(app, "src/content/lexicon")).filter((p) => p.endsWith(".json"))) {
    let lex;
    try { lex = JSON.parse(text(p)); } catch { continue; }
    for (const u of lex.units ?? []) for (const w of u.words ?? []) {
      if (w.audio && RESERVED.test(w.audio)) err.push(`${p.slice(app.length + 1).replaceAll("\\", "/")}: audio slug "${w.audio}" is a reserved file name on Windows (use e.g. "${w.audio}-${w.pos ?? "x"}")`);
    }
  }

  // Warnings: things a course may legitimately lack for a while.
  const audio = walk(join(app, "public/audio")).length;
  if (audio === 0) warn.push("no spoken audio in public/audio (listening games fall back to text)");
  const ui = files(join(app, "public/i18n")).map((f) => f.replace(/\.json$/, ""));
  const wantUi = UI_LANGS.filter((l) => l !== lang || l === "en");
  const missingUi = wantUi.filter((l) => !ui.includes(l));
  if (missingUi.length) warn.push(`UI languages missing: ${missingUi.join(", ")}`);
  if (lang !== "en" && ui.includes(lang)) warn.push(`public/i18n/${lang}.json: the course's own language is also a UI language`);
  if (!live.includes(slug)) warn.push("not live on the hub yet (apps/hub/src/data/courses.ts)");

  console.log(`\n${slug}: ${err.length ? `${err.length} error(s)` : "ok"}${warn.length ? `, ${warn.length} warning(s)` : ""}`);
  for (const e of err) console.log(`  ✗ ${e}`);
  for (const w of warn) console.log(`  ! ${w}`);
  errors += err.length;
}
console.log(errors ? `\nparity: ${errors} error(s)` : "\nparity: ok");
process.exit(errors ? 1 : 0);
