// i18n dictionary check: `node scripts/check-i18n.mjs [--app french,spanish] [--show 5] [--json file] [--warn]`
//
// For each course app, every apps/<app>/public/i18n/<lang>.json is compared with en.json:
//   missing        key in en.json, absent in <lang>
//   extra          key in <lang>, absent in en.json
//   empty          value is "" / whitespace
//   same-as-key    value equals its own key
//   german         value still German (umlaut / ß word, or a word only de.json uses; allow-list in
//                  scripts/scan-german-ui.allow.json). Not run on de.json itself.
//   placeholder    {n} / {name} / %s / %d / HTML tags differ from en.json
// and, per app, keys used in src (t('...'), data-i18n*="...") that exist in no dictionary.
// Exceptions for that last check (files with an inline dictionary, parked keys): scripts/check-i18n.allow.json.
// Counts per app and language are printed, plus the first --show (default 5) examples per kind.
// Exit 1 when anything is found, unless --warn. Never edits any file.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf("--" + n);
  if (i < 0) return d;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};
const ROOT = path.resolve(import.meta.dirname, "..");
const ALL = ["english", "spanish", "french", "italian", "portuguese"];
const apps = opt("app") && opt("app") !== true ? String(opt("app")).split(",") : ALL;
const SHOW = +opt("show", 5);
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const allowPath = path.join(ROOT, "scripts/scan-german-ui.allow.json");
const allowCfg = fs.existsSync(allowPath) ? read(allowPath) : {};
// scripts/check-i18n.allow.json: exceptions for the undefined-key check (see the "//" note in that file)
const ownPath = path.join(ROOT, "scripts/check-i18n.allow.json");
const ownCfg = fs.existsSync(ownPath) ? read(ownPath) : {};
const cfgList = (name, app) => [...(ownCfg[name]?.["*"] ?? []), ...(ownCfg[name]?.[app] ?? [])];

const tokensOf = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/\{\w+\}/g, " ").match(/[A-Za-zÄÖÜäöüßÀ-ÿ]+/g) ?? [];
const UMLAUT = /[A-Za-z]*(?:[äöÄÖßÜ]|ü(?![aeiouyáéíóú]))[A-Za-z]*/g;
const phSig = (s) => {
  const m = String(s).match(/\{\w+\}|%\d*\$?[sd]|<\/?[a-zA-Z][^>]*>/g) ?? [];
  return m.map((x) => (x.startsWith("<") ? x.replace(/\s[^>]*>$/, ">").replace(/\/>$/, ">") : x)).sort().join(" ");
};

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(astro|js|mjs|ts|tsx|jsx|md|mdx|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

const kinds = ["missing", "extra", "empty", "same-as-key", "german", "placeholder"];
const report = {};
let total = 0;
for (const app of apps) {
  const I18N = path.join(ROOT, "apps", app, "public/i18n");
  if (!fs.existsSync(I18N)) { console.log(`${app}: no public/i18n, skipped`); continue; }
  const langs = fs.readdirSync(I18N).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  const dicts = Object.fromEntries(langs.map((c) => [c, read(path.join(I18N, c + ".json"))]));
  const en = dicts.en;
  if (!en) { console.log(`${app}: no en.json`); continue; }

  const others = new Set();
  for (const c of langs) if (c !== "de") for (const v of Object.values(dicts[c])) for (const t of tokensOf(v)) others.add(t.toLowerCase());
  const GERMAN = new Set();
  for (const v of Object.values(dicts.de ?? {})) for (const t of tokensOf(v)) {
    const l = t.toLowerCase();
    if (l.length >= 3 && !others.has(l)) GERMAN.add(l);
  }
  const ALLOW = new Set((allowCfg.words?.[app] ?? []).map((w) => w.toLowerCase()));
  const TEXTS = (allowCfg.texts?.[app] ?? []).map((t) => new RegExp(t));
  const germanIn = (text) => {
    if (TEXTS.some((r) => r.test(text))) return [];
    const hits = [];
    for (const m of text.matchAll(UMLAUT)) if (!ALLOW.has(m[0].toLowerCase())) hits.push(m[0]);
    for (const t of tokensOf(text)) {
      const l = t.toLowerCase();
      if (l.length >= 3 && GERMAN.has(l) && !ALLOW.has(l)) hits.push(t);
    }
    return hits;
  };
  const gLabel = (k, g) => `${k}  [${[...new Set(g)].slice(0, 3).join(", ")}]`;

  const res = {};
  for (const c of langs) {
    if (c === "en") continue;
    const d = dicts[c];
    const r = Object.fromEntries(kinds.map((k) => [k, []]));
    for (const k of Object.keys(en)) if (!(k in d)) r.missing.push(k);
    for (const k of Object.keys(d)) {
      if (!(k in en)) { r.extra.push(k); continue; }
      const v = d[k];
      if (typeof v !== "string") continue;
      if (!v.trim()) { r.empty.push(k); continue; }
      if (v === k) r["same-as-key"].push(k);
      if (c !== "de") { const g = germanIn(v); if (g.length) r.german.push(gLabel(k, g)); }
      if (typeof en[k] === "string" && phSig(v) !== phSig(en[k])) r.placeholder.push(`${k}  en:[${phSig(en[k])}] ${c}:[${phSig(v)}]`);
    }
    res[c] = r;
  }
  // en.json itself: empty / same-as-key / German
  const enR = Object.fromEntries(kinds.map((k) => [k, []]));
  for (const [k, v] of Object.entries(en)) {
    if (typeof v !== "string") continue;
    if (!v.trim()) { enR.empty.push(k); continue; }
    if (v === k) enR["same-as-key"].push(k);
    const g = germanIn(v); if (g.length) enR.german.push(gLabel(k, g));
  }
  res.en = enR;

  // keys used in src
  const defined = new Set(langs.flatMap((c) => Object.keys(dicts[c])));
  const used = new Map();
  const reT = /(?<![\w.$])t\(\s*(['"])([A-Za-z0-9_.\-]+)\1/g;
  const reD = /data-i18n(?:-[a-z]+)*\s*=\s*(['"])([A-Za-z0-9_.\-]+)\1/g;
  const skipFiles = new Set(cfgList("ignoreFiles", app).map((f) => path.join(ROOT, "apps", app, f)));
  const skipKeys = new Set(cfgList("ignoreKeys", app));
  const pendingSet = new Set(cfgList("pending", app));
  for (const f of walk(path.join(ROOT, "apps", app, "src"))) {
    if (skipFiles.has(f)) continue;
    const s = fs.readFileSync(f, "utf8");
    for (const re of [reT, reD]) for (const m of s.matchAll(re)) if (!used.has(m[2]) && !skipKeys.has(m[2])) used.set(m[2], path.relative(ROOT, f));
  }
  const notDefined = [...used].filter(([k]) => !defined.has(k));
  const undefinedKeys = notDefined.filter(([k]) => !pendingSet.has(k)).map(([k, f]) => `${k}  (${f})`);
  const pendingKeys = notDefined.filter(([k]) => pendingSet.has(k)).map(([k]) => k);

  console.log(`\n== ${app}  (en.json: ${Object.keys(en).length} keys; keys used in src: ${used.size})`);
  const pad = (s, n) => String(s).padEnd(n);
  console.log("  " + pad("lang", 6) + kinds.map((k) => pad(k, 13)).join(""));
  const order = Object.keys(res).sort();
  for (const c of order) {
    const n = kinds.map((k) => res[c][k].length);
    total += n.reduce((a, b) => a + b, 0);
    console.log("  " + pad(c, 6) + n.map((x) => pad(x || "-", 13)).join(""));
  }
  console.log(`  undefined keys used in src: ${undefinedKeys.length || "-"}`);
  total += undefinedKeys.length;
  if (pendingKeys.length) console.log(`  pending (parked until de.json has them, not counted): ${pendingKeys.length}`);
  if (SHOW > 0) {
    const more = (l) => (l.length > SHOW ? ` … +${l.length - SHOW}` : "");
    for (const c of order) for (const k of kinds) {
      const l = res[c][k];
      if (l.length) console.log(`  [${c} ${k}] ` + l.slice(0, SHOW).join(" | ") + more(l));
    }
    if (undefinedKeys.length) console.log(`  [undefined] ` + undefinedKeys.slice(0, SHOW).join(" | ") + more(undefinedKeys));
  }
  report[app] = { ...res, undefinedKeys, pendingKeys };
}
if (opt("json") && opt("json") !== true) fs.writeFileSync(opt("json"), JSON.stringify(report, null, 1));
console.log(`\ntotal findings: ${total}`);
process.exit(total && !opt("warn") ? 1 : 0);
