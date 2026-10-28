// The pages the nav search (/suche.json, src/lib/searchIndex.js) has no data source for:
// Berufe, Fertigkeiten, Prüfungen, Führerschein, Wortgeschichten, Spiele, tools … Read from
// the sitemap, each fetched from a running dev server, and kept as title, description and
// headings in src/data/suche-seiten.json. searchIndex.js adds every entry whose page is
// not indexed already.
//
//   npx astro dev --port 4391   (or astro dev --background)
//   node scripts/build-suche-seiten.mjs [--base http://localhost:4391] [--sitemap <url>]
//
// Re-run when pages are added. Left out on purpose: print versions, worksheets, single
// quotes (the Zitate hub is found by its authors instead), the translated landing pages and
// the legal pages.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const BASE = arg("base", "http://localhost:4391");
const SITEMAP = arg("sitemap", "https://englishacademy.com/sitemap.xml");
const OUT = "src/data/suche-seiten.json";

const SKIP = [
  /^\/(es|hi|id|tl|vi|pt-br)(\/|$)/,
  /^\/wortschatz\/drucken\//,
  /^\/lehrkraefte\/arbeitsblaetter\//,
  /\/drucken$/,
  /^\/wissen\/zitate\/(?!$)/,
  /^\/wissen\/wortgeschichte\/(pruefen|umstellen)$/,
  /^\/(impressum|datenschutz|widerruf|nutzungsbedingungen|konto-loeschen)$/,
];

const decode = (s) => s
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const text = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const xml = await (await fetch(SITEMAP)).text();
const paths = [...new Set([...xml.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1].replace(/\/$/, "") || "/"))];

// What the search already finds from its own sources: the index minus this file's entries.
const ix = await (await fetch(`${BASE}/suche.json`)).json();
const indexed = new Set();
JSON.stringify(ix).replace(/"(\/[^"]*)"/g, (_, h) => { indexed.add(h.split(/[?#]/)[0].replace(/\/$/, "") || "/"); return ""; });
if (existsSync(OUT)) for (const e of JSON.parse(readFileSync(OUT, "utf8"))) indexed.delete(e.h);

const todo = paths.filter((p) => p !== "/" && !SKIP.some((re) => re.test(p)) && !indexed.has(p));
console.log(`${paths.length} in the sitemap, ${todo.length} to read`);

const out = [];
const failed = [];
let next = 0;
async function worker() {
  while (next < todo.length) {
    const p = todo[next++];
    try {
      const res = await fetch(BASE + p);
      if (!res.ok) { failed.push(`${p} ${res.status}`); continue; }
      const html = await res.text();
      if (/<meta name="robots" content="noindex/i.test(html)) continue;
      const title = text(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+[–|-]\s+EnglishAcademy$/, "");
      const desc = decode(/<meta name="description" content="([^"]*)"/i.exec(html)?.[1] ?? "");
      const main = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;
      const heads = [...main.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => text(m[1])).filter(Boolean);
      if (!title) { failed.push(`${p} no title`); continue; }
      out.push({ t: title, s: desc, heads: [...new Set(heads)], h: p });
    } catch (e) {
      failed.push(`${p} ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
// Headings that stand on many pages (the side nav's level list, „Deutsch für den Beruf“ …)
// say nothing about one page and would make every page match „a1": left out.
const seen = new Map();
for (const e of out) for (const x of e.heads) seen.set(x, (seen.get(x) ?? 0) + 1);
for (const e of out) {
  e.k = e.heads.filter((x) => seen.get(x) <= 5 && x.toLowerCase() !== e.t.toLowerCase()).join(" ").slice(0, 300).toLowerCase();
  delete e.heads;
}
out.sort((a, b) => a.h.localeCompare(b.h));
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`${out.length} pages written to ${OUT}`);
if (failed.length) console.log(`not read (${failed.length}):\n  ${failed.join("\n  ")}`);
