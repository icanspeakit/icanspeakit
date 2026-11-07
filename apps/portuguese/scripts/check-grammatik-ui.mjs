// Grammar-page instructions with no translation. `pnpm check:grammatik-ui`.
//
// src/data/uebersetzungen/grammatik-ui.json is keyed by the German text itself, so renaming an
// exercise title or rewording a hint drops its translation without any error: the page just
// falls back to German. This lists, per topic, every scaffolding string [id].astro passes to
// UiText / uiTr / langAttrs that has no entry, or an entry missing some help languages.
//
// Today's gaps are a baseline (scripts/grammatik-ui-baseline.json, topic → count), so the check
// guards against new ones instead of failing on old ones:
//   • a topic above its baseline (or new and not in it) fails
//   • a topic below it is reported; `--update` writes the lower numbers back
// `--list <topic>` prints the missing strings of one topic.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "src/data/grammatik");
const BASELINE = path.join(ROOT, "scripts", "grammatik-ui-baseline.json");
const ui = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/uebersetzungen/grammatik-ui.json"), "utf8")).strings ?? {};
const LANGS = ["en", "uk", "ar", "tr", "vi", "hi", "id", "es", "pt", "tl"];

/** Every German scaffolding string the topic page translates (mirrors src/pages/[id].astro). */
export function uiStrings(topic) {
  const out = [];
  const add = (s, where) => { if (typeof s === "string" && s.trim()) out.push({ de: s, where }); };
  const c = topic.concept ?? {};
  add(c.comicRule?.title, "comicRule.title");
  const ref = c.reference ?? {};
  add(ref.showLabel, "reference.showLabel");
  add(ref.hideLabel, "reference.hideLabel");
  for (const t of ref.tables ?? []) { add(t.caption, "table.caption"); add(t.note, "table.note"); }
  for (const b of ref.boxes ?? []) add(b.badge, "box.badge");
  const a = topic.aktiv ?? {};
  for (const l of a.listen ?? []) add(l.note, "aktiv.listen.note");
  add(a.hoeren?.instruction, "aktiv.hoeren.instruction");
  for (const r of a.sprechen?.rounds ?? []) { add(r.label, "aktiv.round.label"); add(r.instruction, "aktiv.round.instruction"); }
  for (const ex of topic.exercises ?? []) {
    add(ex.title, "exercise.title");
    add(ex.hint, "exercise.hint");
    add(ex.rule?.label, "exercise.rule.label");
    add(ex.rule?.disclaimer?.label, "exercise.rule.disclaimer.label");
    add(ex.rule?.disclaimer?.html, "exercise.rule.disclaimer.html");
  }
  return out;
}

/** Strings with no entry, or an entry lacking languages. */
export function missing(topic) {
  const seen = new Set();
  const res = [];
  for (const s of uiStrings(topic)) {
    if (seen.has(s.de)) continue;
    seen.add(s.de);
    const t = ui[s.de];
    const lacks = t ? LANGS.filter((l) => !t[l]) : LANGS;
    if (lacks.length) res.push({ ...s, lacks });
  }
  return res;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (isMain) {
  const args = process.argv.slice(2);
  const topics = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));

  const li = args.indexOf("--list");
  if (li >= 0) {
    const id = args[li + 1];
    const t = topics.find((x) => x.id === id);
    if (!t) { console.error(`Kein Thema „${id}“.`); process.exit(2); }
    for (const m of missing(t)) console.log(`${m.where.padEnd(30)} ${m.lacks.length === LANGS.length ? "fehlt" : "ohne " + m.lacks.join(",")}  ${m.de.slice(0, 90)}`);
    process.exit(0);
  }

  const counts = Object.fromEntries(topics.map((t) => [t.id, missing(t).length]));
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : {};
  const worse = [], better = [];
  for (const [id, n] of Object.entries(counts)) {
    const b = base[id] ?? 0;
    if (n > b) worse.push(`${id}: ${n} (Basis ${b})`);
    else if (n < b) better.push(`${id}: ${n} (Basis ${b})`);
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  if (args.includes("--update")) {
    const next = Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0));
    fs.writeFileSync(BASELINE, JSON.stringify(next, null, 2) + "\n");
    console.log(`Basis geschrieben: ${total} unübersetzte Anleitungen in ${Object.keys(next).length} Themen.`);
    process.exit(0);
  }
  if (better.length) console.log(`Weniger Lücken als die Basis (pnpm check:grammatik-ui --update):\n  ${better.join("\n  ")}`);
  if (worse.length) {
    console.error(`Neue unübersetzte Anleitungen (Liste: pnpm check:grammatik-ui --list <thema>):\n  ${worse.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`OK – ${total} bekannte Lücken, keine neuen.`);
}
