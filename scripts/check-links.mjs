#!/usr/bin/env node
/* Do the internal links in the source lead to a page? Runs in the content gate, without a build.
 *
 * The site has almost no redirects (docs/content-plan.md §7, §8), so a link to an address that
 * has no page is a 404. This scans src/ and public/i18n/en.json for strings that are a site path
 * ("/por-para", href="/dele/a2#lesen", `/listening/${id}`) and checks each one against the page
 * files in src/pages. A [param] folder accepts any segment, except where the id tables in
 * src/lib/routes.js know better: the top level takes only grammar topics, an item section takes
 * no raw data id that has a URL slug of its own. `pnpm check:base` looks at the built HTML; this
 * one also sees what scripts build, and needs no build.
 *
 * Usage: node scripts/check-links.mjs        exit 1 when a link has no page
 *        node scripts/check-links.mjs --all  also list what was skipped as not being a page
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEM_SLUGS, TOPIC_SLUGS, WORK_GROUP_SLUGS } from "../src/lib/routes.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PAGES = join(ROOT, "src/pages");

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ── The routes ────────────────────────────────────────────────────────────────────────────
const routes = walk(PAGES)
  .filter((p) => /\.(astro|ts)$/.test(p))
  .map((p) => relative(PAGES, p).split(sep).join("/").replace(/\.astro$|\.ts$/, "").replace(/(^|\/)index$/, ""))
  .map((r) => r.split("/").filter(Boolean));

const isParam = (seg) => /\[.*\]/.test(seg);
const segMatches = (pat, seg) => {
  if (!isParam(pat)) return pat === seg;
  // woerter-[level].json: the fixed parts must match.
  const re = new RegExp(`^${pat.replace(/[.*+?^${}()|\\]/g, "\\$&").replace(/\\?\[[^\]]+\\?\]/g, ".+")}$`);
  return re.test(seg);
};

// Static public files and folders are not pages.
const PUBLIC = new Set(readdirSync(join(ROOT, "public")));
const TOPICS = new Set(Object.values(TOPIC_SLUGS));
const isTopicPage = (p) => p.length === 1 && TOPICS.has(p[0]);

// A section's raw data id, when the id has a URL slug that differs from it: that link is dead.
const rawId = (segs) => {
  const path = `/${segs.join("/")}`;
  for (const [section, table] of Object.entries(ITEM_SLUGS)) {
    if (!path.startsWith(`${section}/`)) continue;
    const seg = path.slice(section.length + 1).split("/")[0];
    if (table[seg] && !Object.values(table).includes(seg)) return `${section}/${seg}`;
  }
  return null;
};

function resolves(segs) {
  if (segs.length === 0) return true;
  if (isTopicPage(segs)) return true;
  if (rawId(segs)) return false;
  // An id-based section with a work group: /spanish-for-work/<sector>/<group>.
  if (segs[0] === "spanish-for-work" && segs[1]) {
    if (!Object.values(ITEM_SLUGS["/spanish-for-work"]).includes(segs[1])) return false;
    if (segs[2] && segs[2] !== "print" && !Object.values(WORK_GROUP_SLUGS).includes(segs[2]) && segs[2] in WORK_GROUP_SLUGS) return false;
  }
  return routes.some((r) => {
    if (r.length !== segs.length) return false;
    // The top-level [id] page is the grammar topics, handled above.
    if (r.length === 1 && isParam(r[0])) return false;
    return r.every((pat, i) => segMatches(pat, segs[i]));
  });
}

// ── The links ─────────────────────────────────────────────────────────────────────────────
// A string that starts with one slash and a lowercase letter, right after a quote, a backtick,
// `(` of a markdown link or `=` of a query (?next=/x). Ends at a quote, #, ?, ) or \.
const LINK = /(?<=["'`(=])\/[a-z0-9][a-zA-Z0-9_./[\]-]*(?:\$\{[^}]*\}[a-zA-Z0-9_./-]*)*(?=["'`)#?\\&]|\$\{|$)/gm;

const SKIP_FILE = /[\\/](oldux|styles)[\\/]|\.css$|\.svg$|hub-bilder\.manifest\.json$/;
// Fields that hold a path that isn't this site's: API paths, data files read from public/.
const NOT_A_PAGE = /^\/(api|node_modules|src|tmp|usr|dev|bin|etc|sb-|_astro|\.)/;
// Looks like a link, is none, or is known to have no page. Say why, so the list stays short.
const KNOWN = new Map([
  ["/spanish", "the base path itself (src/lib/paths.js)"],
  ["/index.html", "a file name in the sitemap code"],
  ["/month", "price text: 9 € /month"],
  ["/audio", "recordings, which arrive with an es-ES voice; the player hides without them"],
  ["/teachers/cards/lexikon", "folder of the JSON endpoint lexikon/[level].json"],
  ["/test", "a class test needs a backend: no page until there is one (src/lib/klassentest)"],
  ["/game/hochstapler", "class mode of the impostor game needs live rooms: no page in this build"],
  ["/intern/meldungen", "demo dock only, not in a visitor's page"],
  ["/politik", "photo slots in hub-bilder.json, never linked; `cleanup` removes them"],
]);
const isKnown = (raw) => {
  const p = raw.replace(/\/+$/, "");
  // A sound in slashes in a pronunciation note: /x/, /s/, /θ/.
  if (/^\/[a-z]{1,2}\/$/.test(raw)) return true;
  return [...KNOWN.keys()].some((k) => p === k || p.startsWith(`${k}/`));
};

const files = [...walk(join(ROOT, "src")).filter((p) => /\.(astro|js|mjs|ts|tsx|json|md)$/.test(p) && !SKIP_FILE.test(p)),
  join(ROOT, "public/i18n/en.json")];

const dead = new Map();
const skipped = new Set();
let checked = 0;
const stripComments = (src, file) => {
  if (file.endsWith(".json") || file.endsWith(".md")) return src;
  // Comment lines and blocks describe; only code links.
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/^\s*\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
};

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const src = stripComments(readFileSync(file, "utf8"), file)
    // JSON "_note" and "_hinweis" fields talk about paths; they don't link.
    .replace(/^\s*"_[a-zA-Z]+":.*$/gm, "");
  for (const m of src.matchAll(LINK)) {
    const raw = m[0];
    const line = src.slice(0, m.index).split("\n").length;
    if (isKnown(raw) || NOT_A_PAGE.test(raw) || PUBLIC.has(raw.split("/")[1]) || /\.(png|jpe?g|webp|svg|gif|ico|mp3|mp4|webm|pdf|woff2?|css|js|txt|xml|map)$/.test(raw)) { skipped.add(raw); continue; }
    if (raw.endsWith(".json") && !raw.startsWith("/games/")) { skipped.add(raw); continue; }
    // A template part stands for one segment or more; check what is fixed around it.
    const parts = raw.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.some((s) => s.includes("${"))) {
      const pre = [];
      for (const s of parts) { if (s.includes("${")) break; pre.push(s); }
      if (pre.length && !routes.some((r) => pre.every((seg, i) => r[i] && segMatches(r[i], seg)))) {
        if (!dead.has(raw)) dead.set(raw, []);
        dead.get(raw).push(`${rel}:${line}`);
      } else skipped.add(raw);
      continue;
    }
    checked++;
    if (!resolves(parts)) {
      if (!dead.has(raw)) dead.set(raw, []);
      dead.get(raw).push(`${rel}:${line}`);
    }
  }
}

if (process.argv.includes("--all")) console.log(`Skipped as not a page:\n  ${[...skipped].sort().join("\n  ")}\n`);
if (dead.size) {
  console.error(`check-links: ${dead.size} internal link(s) lead to no page:`);
  for (const [link, where] of [...dead].sort()) console.error(`  ${link}  ← ${where.slice(0, 3).join(", ")}${where.length > 3 ? ` (+${where.length - 3})` : ""}`);
  process.exit(1);
}
console.log(`check-links: ${checked} internal links, ${routes.length} routes, all lead to a page.`);
