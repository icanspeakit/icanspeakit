#!/usr/bin/env node
// check-untranslated: finds course apps that still carry text of another language.
//
// For every course app (english spanish french italian portuguese) it reads the string values of
// all JSON files under src/ (content and UI strings; i18n/ translation tables are skipped because
// they are meant to be multilingual) and counts two kinds of suspect strings:
//   foreign    the string looks like a language other than the app's own or English (the UI language of the
//             learner-facing text; stopword-count guess). English leftovers in a non-English app are not
//             flagged; German, or another course language, is
//   duplicate  the identical string (>= MIN_LEN chars) also occurs in another course app
// Ignored: short strings (< MIN_WORDS words), URLs, code-like strings, strings without enough
// stopword evidence. Proper names are mostly dropped by the stopword rule (they carry no stopwords).
//
// Usage: node scripts/check-untranslated.mjs [app ...] [--top N] [--json]
// Exit 1 when an app has more suspect strings than its baseline below (the state at the time
// this check was added, plus a small margin). To lower a baseline after cleanup, edit BASELINE.
// Note: the "own language" of a course app is its target language, but the course text is for
// learners with German/English UI, so "foreign" is only a signal; the baseline makes it a
// regression guard, not a verdict.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const APPS = { english: 'en', spanish: 'es', french: 'fr', italian: 'it', portuguese: 'pt' };
const MIN_WORDS = 6;
const MIN_LEN = 40;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', 'i18n', 'uebersetzungen']);

// Max allowed suspect strings (foreign + duplicate) per app; measured 2026-11-23: english 2364, spanish 2399, french 1697, italian 1348, portuguese 1997 (+10%).
const BASELINE = { english: 2600, spanish: 2650, french: 1870, italian: 1490, portuguese: 2200 };

const STOP = {
  de: 'der die das und ist nicht ein eine einen einem mit für auf von zu den dem des sich auch wie wenn oder aber wird sind sie ich wir er es im am bei nach noch nur dass kann wir hat haben dir dich mir mich du ihr was wo'.split(' '),
  en: 'the and is are of to in that it for with as on be this you your not or by an at from have has but we they which can will was what when how do does'.split(' '),
  es: 'el la los las de que y en un una es por con para no se lo su al del como más pero sus le ya o este sí porque esta son entre cuando muy sin sobre también me hasta hay donde'.split(' '),
  fr: 'le la les des et est un une du de que qui dans pour pas sur au avec ce il elle nous vous ils sont ne se par plus mais ou comme cette être fait aux ces leur son'.split(' '),
  it: 'il lo la i gli le di che e è un una per non con si da in del della dei delle al alla come più ma sono anche suo sua questo questa nel nella ho hanno se mi ti ci'.split(' '),
  pt: 'o a os as de que e em um uma é por com para não se do da dos das no na nos nas como mais mas ao à seu sua também são foi ser tem já ou isso este esta pelo pela'.split(' '),
};
const STOPSETS = Object.fromEntries(Object.entries(STOP).map(([l, w]) => [l, new Set(w)]));

function guess(text) {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) || [];
  const scores = {};
  for (const [l, set] of Object.entries(STOPSETS)) scores[l] = words.filter((w) => set.has(w)).length;
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [best, bs] = ranked[0];
  const second = ranked[1][1];
  // need real evidence: >= 3 stopwords and clearly ahead of the runner-up
  if (bs < 3 || bs < second + 2) return null;
  return best;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (name.endsWith('.json')) yield p;
  }
}

function* strings(node, path = '') {
  if (typeof node === 'string') yield [path, node];
  else if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) yield* strings(node[i], `${path}[${i}]`); }
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) yield* strings(v, path ? `${path}.${k}` : k);
}

function usable(s) {
  if (/https?:\/\/|[{};<>]|=>|\bfunction\b/.test(s)) return false;
  return (s.match(/\S+/g) || []).length >= MIN_WORDS;
}

const args = process.argv.slice(2);
const topN = args.includes('--top') ? Number(args[args.indexOf('--top') + 1]) : 10;
const asJson = args.includes('--json');
const wanted = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--top');
const apps = wanted.length ? wanted : Object.keys(APPS);

// pass 1: read everything (all apps, so duplicates are found even when only one app is selected)
const data = {};
const owners = new Map(); // normalized string -> Set(app)
for (const app of Object.keys(APPS)) {
  const src = join(ROOT, 'apps', app, 'src');
  data[app] = [];
  try { statSync(src); } catch { continue; }
  for (const file of walk(src)) {
    let json;
    try { json = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const rel = relative(join(ROOT, 'apps', app), file).split(sep).join('/');
    const list = [];
    for (const [path, s] of strings(json)) {
      if (!usable(s)) continue;
      list.push([path, s]);
      if (s.length >= MIN_LEN) {
        const key = s.trim().toLowerCase();
        if (!owners.has(key)) owners.set(key, new Set());
        owners.get(key).add(app);
      }
    }
    data[app].push({ rel, list });
  }
}

// pass 2: score
const report = {};
for (const app of apps) {
  if (!APPS[app]) { console.error(`unknown app: ${app}`); process.exit(2); }
  const own = APPS[app];
  let foreign = 0, duplicate = 0, checked = 0;
  const byLang = {};
  const files = [];
  for (const { rel, list } of data[app]) {
    let f = 0, d = 0;
    for (const [, s] of list) {
      checked++;
      const g = guess(s);
      if (g && g !== own && g !== 'en') { f++; byLang[g] = (byLang[g] || 0) + 1; }
      if (s.length >= MIN_LEN && owners.get(s.trim().toLowerCase()).size > 1) d++;
    }
    foreign += f; duplicate += d;
    if (f + d) files.push({ file: rel, foreign: f, duplicate: d, total: f + d });
  }
  files.sort((a, b) => b.total - a.total);
  report[app] = { checked, foreign, duplicate, suspect: foreign + duplicate, byLang, files };
}

if (asJson) console.log(JSON.stringify(report, null, 2));
let failed = false;
for (const app of apps) {
  const r = report[app];
  const limit = BASELINE[app];
  const over = r.suspect > limit;
  if (over) failed = true;
  if (asJson) continue;
  const langs = Object.entries(r.byLang).sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l}:${n}`).join(' ') || '-';
  console.log(`\n== ${app} (${APPS[app]}): ${r.checked} strings checked, ${r.suspect} suspect (${r.foreign} foreign [${langs}], ${r.duplicate} identical to another app); limit ${limit} ${over ? 'EXCEEDED' : 'ok'}`);
  for (const f of r.files.slice(0, topN)) console.log(`   ${String(f.total).padStart(5)}  ${f.file}  (foreign ${f.foreign}, identical ${f.duplicate})`);
}
if (failed) {
  console.error('\ncheck-untranslated: FAILED (an app is above its baseline; see scripts/check-untranslated.mjs BASELINE)');
  process.exit(1);
}
if (!asJson) console.log('\ncheck-untranslated: ok');
