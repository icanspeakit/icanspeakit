// Collects what the ops board shows, from the repo, at build time: per course, how many audio
// files exist per folder, which /audio/<folder> the code references that has no files yet, how
// many lexicon words there are, and the last commit that touched the app. Writes
// src/data/status.json. Nothing here needs the network.
import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ADMIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPS = path.resolve(ADMIN, "..");
const COURSES = [
  { id: "english", name: "English", path: "/english" },
  { id: "spanish", name: "Spanish", path: "/espanol" },
  { id: "french", name: "French", path: "/francais" },
  { id: "italian", name: "Italian", path: "/italiano" },
  { id: "portuguese", name: "Portuguese", path: "/portugues" },
];

const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((f) => statSync(path.join(p, f)).isDirectory()) : []);
const countFiles = (p) => {
  let n = 0;
  for (const f of existsSync(p) ? readdirSync(p) : []) {
    const full = path.join(p, f);
    n += statSync(full).isDirectory() ? countFiles(full) : f.endsWith(".mp3") ? 1 : 0;
  }
  return n;
};
function walk(p, out = []) {
  for (const f of existsSync(p) ? readdirSync(p) : []) {
    const full = path.join(p, f);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(astro|js|ts|mjs|json)$/.test(f)) out.push(full);
  }
  return out;
}
function git(args) {
  try { return execFileSync("git", args, { cwd: APPS, encoding: "utf8" }).trim(); } catch { return ""; }
}

const out = { generated: new Date().toISOString(), courses: [] };
for (const c of COURSES) {
  const app = path.join(APPS, c.id);
  if (!existsSync(app)) continue;
  const audioRoot = path.join(app, "public", "audio");
  const have = {};
  for (const d of dirs(audioRoot)) have[d] = countFiles(path.join(audioRoot, d));

  const referenced = new Set();
  for (const f of walk(path.join(app, "src"))) {
    for (const m of readFileSync(f, "utf8").matchAll(/\/audio\/([a-z][a-z0-9-]*)[\/"'`]/g)) referenced.add(m[1]);
  }
  const missing = [...referenced].filter((d) => !(d in have)).sort();

  let words = 0;
  const lex = path.join(app, "src", "content", "lexicon");
  for (const f of existsSync(lex) ? readdirSync(lex).filter((f) => f.endsWith(".json")) : []) {
    try { for (const u of JSON.parse(readFileSync(path.join(lex, f), "utf8")).units ?? []) words += (u.words ?? []).length; } catch {}
  }
  const [lastDate, lastSubject] = git(["log", "-1", "--format=%cs%x09%s", "--", `apps/${c.id}`]).split("\t");
  out.courses.push({ ...c, audio: have, audioTotal: Object.values(have).reduce((a, b) => a + b, 0), missing, words, lastDate: lastDate ?? "", lastSubject: lastSubject ?? "" });
}
writeFileSync(path.join(ADMIN, "src", "data", "status.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`collect: ${out.courses.length} courses`);
