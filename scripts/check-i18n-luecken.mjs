// Visible interface text that no translation reaches. `pnpm check:i18n-luecken`.
//
// validate-i18n.mjs compares the keys that exist; nothing noticed text that never got a key:
// the Zitat-Abo box stayed German for an English interface with no check complaining. This
// scans every .astro page, component and layout for text between tags that has no
// data-i18n / data-i18n-html on its own element or an ancestor.
//
// Today's gaps are a baseline (scripts/i18n-luecken-baseline.json, file → count), so the
// check guards against new ones instead of failing on ~800 old ones:
//   • a file above its baseline (or new and not in it) fails
//   • a file below it is reported; `--update` writes the lower numbers back
// Fix a page, run `pnpm check:i18n-luecken --update`, commit the baseline with it.
//
// Text that is German on purpose (the words being taught, an exam's own wording, quotes)
// is marked where it stands, so it never counts:
//   lang="de" on the element or an ancestor · translate="no" · data-i18n-skip
// Not seen: strings built in JavaScript (innerHTML, textContent = "…"). Those go through
// t() keys by hand.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASELINE = path.join(ROOT, "scripts", "i18n-luecken-baseline.json");
const DIRS = ["src/pages", "src/components", "src/layouts"];
// Internal tools, design studies and the legal texts (German is the binding version).
const SKIP = [
  /^src\/pages\/intern\//,
  /^src\/pages\/(design-system|newfont|list|testnavbarlanguages|nav\d)\.astro$/,
  /^src\/pages\/satzmelodie\/pruefen\.astro$/,
  /^src\/pages\/(datenschutz|nutzungsbedingungen|impressum)\.astro$/,
  /^src\/(oldux|paid)\//,
];
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "use", "stop"]);
const COVER = /\sdata-i18n(-html)?=|\slang=|\stranslate=["']?no|\sdata-i18n-skip\b/;

function files() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".astro") && !SKIP.some((r) => r.test(p))) out.push(p);
    }
  };
  for (const d of DIRS) walk(d);
  return out.sort();
}

/** Untranslated text segments of one .astro file, with a sample for the report. */
export function gaps(src) {
  let s = src
    .replace(/^---[\s\S]*?\n---/, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  const stack = []; // { name, covered }
  const found = [];
  const re = /<(\/?)([a-zA-Z][\w.:-]*)((?:[^>"'{]|"[^"]*"|'[^']*'|\{[^}]*\})*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[5] != null) {
      // A text run between tags may hold the ends of a {…} expression that wraps markup:
      // "{cond && (" before a tag, ")}" after one. Only what is outside braces is text.
      let raw = m[5].replace(/\{[^{}]*\}/g, " ");
      const close = raw.lastIndexOf("}");
      if (close >= 0) raw = raw.slice(close + 1);
      const open = raw.indexOf("{");
      if (open >= 0) raw = raw.slice(0, open);
      const text = raw.replace(/&[a-z#0-9]+;/gi, " ").trim();
      if (!/[A-Za-zÄÖÜäöüß]{3,}/.test(text) || text.split(/\s+/).length < 2) continue;
      if (stack.some((e) => e.covered)) continue;
      found.push(text.replace(/\s+/g, " ").slice(0, 70));
      continue;
    }
    const [, close, name, attrs, self] = m;
    const lname = name.toLowerCase();
    if (close) {
      const i = stack.map((e) => e.name).lastIndexOf(lname);
      if (i >= 0) stack.length = i;
      continue;
    }
    if (self || VOID.has(lname)) continue;
    stack.push({ name: lname, covered: COVER.test(` ${attrs}`) || lname === "code" || lname === "kbd" });
  }
  return found;
}

const update = process.argv.includes("--update");
const verbose = process.argv.includes("--list");
const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : {};
const now = {};
const worse = [];
const better = [];
for (const f of files()) {
  const g = gaps(fs.readFileSync(path.join(ROOT, f), "utf8"));
  if (!g.length) continue;
  now[f] = g.length;
  const was = base[f] ?? 0;
  if (g.length > was) worse.push({ f, was, n: g.length, g });
  else if (g.length < was) better.push({ f, was, n: g.length });
  if (verbose) console.log(`${g.length}\t${f}\n\t${g.slice(0, 5).join("\n\t")}`);
}
for (const f of Object.keys(base)) if (!(f in now)) better.push({ f, was: base[f], n: 0 });

if (update) {
  // Only ever lower: raising the baseline is a decision, made by editing the file.
  const next = {};
  for (const f of Object.keys({ ...base, ...now }).sort()) {
    const v = Math.min(now[f] ?? 0, base[f] ?? Infinity);
    if (v > 0) next[f] = v;
  }
  if (!fs.existsSync(BASELINE)) Object.assign(next, now);
  fs.writeFileSync(BASELINE, JSON.stringify(next, null, 2) + "\n");
  console.log(`i18n-luecken: baseline written (${Object.values(next).reduce((a, b) => a + b, 0)} gaps in ${Object.keys(next).length} files).`);
}

const total = Object.values(now).reduce((a, b) => a + b, 0);
for (const b of better) console.log(`  besser: ${b.f} ${b.was} → ${b.n}${update ? "" : " (pnpm check:i18n-luecken --update)"}`);
if (worse.length && !update) {
  console.error(`i18n-luecken: ${worse.length} file(s) with new untranslated text:`);
  for (const w of worse) {
    console.error(`  ${w.f}: ${w.was} → ${w.n}`);
    for (const t of w.g.slice(0, 6)) console.error(`      „${t}“`);
  }
  console.error(`Add data-i18n keys (public/i18n/*.json), or mark German on purpose with lang="de" / data-i18n-skip.`);
  process.exit(1);
}
console.log(`i18n-luecken: ${total} known gaps in ${Object.keys(now).length} files, none new.`);
