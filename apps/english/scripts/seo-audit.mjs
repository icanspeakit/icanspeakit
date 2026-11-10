#!/usr/bin/env node
/* SEO audit of the built HTML (SEO-BRAND-TIERED-PROMPT.md, Tier 2).
 *
 *   pnpm seo:audit                 reads dist/
 *   pnpm seo:audit -- <outDir>     reads another build folder (e.g. one under %TEMP%)
 *
 * One row per indexable page (no `noindex`, has a canonical): path, <title>, its length,
 * description length, H1, canonical, flags. Writes docs/seo-audit-v1.md and exits 1 if a
 * page from PRIORITY has a flag or any two indexable pages share a title.
 *
 * Flags: title > 60 · no "– icanspeak English" suffix (the homepage starts with the brand
 * instead) · duplicate title · duplicate description · missing description · H1 missing
 * or more than one · "Da für Dich" in the title.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] ?? "dist");
// The Vercel adapter puts the static pages under client/; a plain static build does not.
const BASE = existsSync(path.join(ROOT, "client")) ? path.join(ROOT, "client") : ROOT;
const OUT = "docs/seo-audit-v1.md";
const BRAND = "icanspeak English";
const MAX_TITLE = 60;

const PRIORITY = [
  "/", "/trinity/ise-1", "/trinity/ise-1/mock-test", "/trinity/ise-1/practice-set", "/life-in-the-uk",
  "/life-in-the-uk/test", "/exams", "/trinity", "/cambridge", "/ielts",
  "/a1-test", "/placement-test", "/grammar", "/vocabulary", "/exercises",
  "/pronunciation-check",
];
const isPriority = (p) => PRIORITY.includes(p) || p.startsWith("/cambridge/");

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : name.endsWith(".html") ? [full] : [];
  });

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const text = (html) => decode(html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? decode(m[1] ?? m[2]) : null;
};
const metaTag = (html, key, val) =>
  (html.match(/<meta\b[^>]*>/gi) ?? []).find((t) => (attr(t, key) ?? "").toLowerCase() === val);

const pages = [];
for (const file of walk(BASE)) {
  const html = readFileSync(file, "utf8");
  const robots = metaTag(html, "name", "robots");
  if (robots && /noindex/i.test(attr(robots, "content") ?? "")) continue;
  const canonTag = (html.match(/<link\b[^>]*>/gi) ?? []).find((t) => attr(t, "rel") === "canonical");
  if (!canonTag) continue; // redirects, fragments, 404
  const canonical = attr(canonTag, "href");
  const rel = path.relative(BASE, file).replace(/\\/g, "/");
  const route = "/" + rel.replace(/(^|\/)index\.html$/, "").replace(/\.html$/, "");
  const title = text(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const descTag = metaTag(html, "name", "description");
  const description = descTag ? (attr(descTag, "content") ?? "").trim() : "";
  const body = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const h1s = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1]));
  pages.push({ route: route.replace(/\/$/, "") || "/", title, description, h1s, canonical });
}
pages.sort((a, b) => a.route.localeCompare(b.route));

const count = (key) => pages.reduce((m, p) => m.set(p[key], (m.get(p[key]) ?? 0) + 1), new Map());
const titles = count("title");
const descs = count("description");

for (const p of pages) {
  const f = [];
  if (p.title.length > MAX_TITLE) f.push("title>60");
  if (p.route === "/" ? !p.title.startsWith(BRAND) : !p.title.endsWith(`– ${BRAND}`)) f.push("no-suffix");
  if (titles.get(p.title) > 1) f.push("dup-title");
  if (!p.description) f.push("no-desc");
  else if (descs.get(p.description) > 1) f.push("dup-desc");
  if (p.h1s.length === 0) f.push("no-h1");
  if (p.h1s.length > 1) f.push("multi-h1");
  if (/da für dich/i.test(p.title)) f.push("slogan");
  p.flags = f;
}

const esc = (s) => s.replace(/\|/g, "\\|");
const prio = pages.filter((p) => isPriority(p.route));
const flagged = pages.filter((p) => p.flags.length);
const tally = flagged.flatMap((p) => p.flags).reduce((m, f) => m.set(f, (m.get(f) ?? 0) + 1), new Map());
const dupTitles = [...titles].filter(([, n]) => n > 1);
const row = (p) =>
  `| ${p.route} | ${esc(p.title)} | ${p.title.length} | ${p.description.length} | ${esc(p.h1s[0] ?? "—")}${p.h1s.length > 1 ? ` (+${p.h1s.length - 1})` : ""} | ${p.canonical.replace(/^https?:\/\/[^/]+/, "") || "/"} | ${p.flags.join(", ")} |`;
const head = "| Pfad | Titel | Länge | Beschr. | H1 | Canonical | Flags |\n|---|---|---|---|---|---|---|";

const md = `# SEO-Audit v1 (Titel, Beschreibungen, H1)

Erzeugt von \`scripts/seo-audit.mjs\` aus dem Build. ${pages.length} indexierbare Seiten (ohne \`noindex\`, mit Canonical).

**Prüfungs- und Kernseiten:** ${prio.filter((p) => p.flags.length).length} von ${prio.length} mit Flags.
**Doppelte Titel seitenweit:** ${dupTitles.length}.
**Seiten mit Flags insgesamt:** ${flagged.length} (${[...tally].map(([f, n]) => `${f}: ${n}`).join(", ") || "keine"}).

Flags: \`title>60\` · \`no-suffix\` (fehlt „– ${BRAND}“, Startseite: beginnt nicht mit der Marke) · \`dup-title\` · \`dup-desc\` · \`no-desc\` · \`no-h1\` · \`multi-h1\` · \`slogan\` („Da für Dich“ im Titel).

H1 „—“ bei client-gerenderten Seiten heißt: die Überschrift entsteht erst im Browser.

## Prüfungs- und Kernseiten

${head}
${prio.map(row).join("\n")}

## Alle indexierbaren Seiten

${head}
${pages.map(row).join("\n")}
`;
writeFileSync(OUT, md);
console.log(`${pages.length} Seiten, ${flagged.length} mit Flags, Kernseiten mit Flags: ${prio.filter((p) => p.flags.length).length}, doppelte Titel: ${dupTitles.length} → ${OUT}`);
process.exit(prio.some((p) => p.flags.length) || dupTitles.length ? 1 : 0);
