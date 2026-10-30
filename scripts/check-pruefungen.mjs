// Checks the Übungssätze in src/data/pruefungen/saetze/ (free) and src/paid/pruefungen/saetze/
// (paid, kept out of the page HTML — see src/paid/README.md) against the engine's schema
// (src/lib/exam/pruefungEngine.js) and against the official structure they claim to follow
// (src/data/pruefungen/formate-a2-c1.research.json): same modules, same parts, same number
// of scored items per part. A key that points nowhere, an id used twice or a gap that is
// never placed in its text fails the build; missing audio is only reported.
//   pnpm check:pruefungen
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = [path.join(ROOT, "src/data/pruefungen/saetze"), path.join(ROOT, "src/paid/pruefungen/saetze")];
const research = JSON.parse(readFileSync(path.join(ROOT, "src/data/pruefungen/formate-a2-c1.research.json"), "utf8"));
const formats = Object.fromEntries(research.exams.map((e) => [e.id, e]));

const TYPES = new Set(["tf", "mc", "match", "gap-mc", "gap-bank", "write-in", "schreiben", "sprechen"]);
const TF = { richtig: 1, falsch: 1, ja: 1, nein: 1, "nicht im text": 1 };
const problems = [];
const notes = [];
const index = [];
let sets = 0, items = 0, clips = 0, missingAudio = 0;

const files = DIRS.flatMap((dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => [dir, f]) : []));
for (const [dir, file] of files) {
  const set = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  const P = (msg) => problems.push(`${file}: ${msg}`);
  sets++;
  for (const k of ["id", "slug", "exam", "level", "title", "formatRef", "sourcing", "origin", "modules"]) if (!set[k]) P(`fehlt: ${k}`);
  if (file !== `${set.id}.json`) P(`Dateiname passt nicht zur id "${set.id}"`);
  const fmt = formats[set.formatRef];
  if (!fmt) { P(`formatRef "${set.formatRef}" gibt es nicht in formate-a2-c1.research.json`); continue; }
  if (fmt.level !== set.level) P(`Niveau ${set.level} ≠ ${fmt.level} laut Format`);
  if (set.modules.length !== fmt.modules.length) P(`${set.modules.length} Module, das Format hat ${fmt.modules.length}`);

  index.push({
    id: set.id, slug: set.slug, exam: set.exam, level: set.level, title: set.title, scoring: set.scoring ?? null,
    ...(dir === DIRS[1] ? { paid: true } : {}),
    modules: set.modules.map((m) => ({
      key: m.key, name: m.name,
      parts: m.parts.map((p) => ({ teil: p.teil, scored: p.type !== "schreiben" && p.type !== "sprechen", ids: (p.type === "schreiben" || p.type === "sprechen" ? p.tasks : p.items).map((x) => x.id) })),
    })),
  });
  const ids = new Set();
  const useId = (id, where) => { if (!id) P(`${where}: ohne id`); else if (ids.has(id)) P(`${where}: id "${id}" doppelt`); else ids.add(id); };

  set.modules.forEach((m, mi) => {
    const fm = fmt.modules[mi];
    const where = `${m.name ?? m.key}`;
    if (!m.key || !m.name || !m.minutes) P(`${where}: key, name und minutes nötig`);
    if (fm && fm.minutes && m.minutes !== fm.minutes) notes.push(`${file}: ${where} ${m.minutes} Min., Format ${fm.minutes}`);
    if (fm && m.parts.length !== fm.parts.length) P(`${where}: ${m.parts.length} Teile, das Format hat ${fm.parts.length}`);
    m.parts.forEach((p, pi) => {
      const w = `${where} Teil ${p.teil ?? pi + 1}`;
      if (!TYPES.has(p.type)) { P(`${w}: Typ "${p.type}" unbekannt`); return; }
      if (!p.title) P(`${w}: ohne title`);
      if (p.type === "schreiben" || p.type === "sprechen") {
        if (!p.tasks?.length) P(`${w}: keine tasks`);
        for (const t of p.tasks ?? []) {
          useId(t.id, w);
          if (!t.model) P(`${w} ${t.id}: keine Musterlösung`);
          if (!t.checklist?.length) P(`${w} ${t.id}: keine Checkliste`);
          if (p.type === "schreiben" && !t.words) P(`${w} ${t.id}: kein Wortziel`);
        }
        return;
      }
      const want = fm?.parts[pi]?.items;
      if (want && p.items.length !== want) P(`${w}: ${p.items.length} Aufgaben, das Format hat ${want}`);
      const texts = new Set((p.texts ?? []).map((t) => t.id));
      const clipIds = new Set((p.clips ?? []).map((c) => c.id));
      for (const c of p.clips ?? []) {
        useId(c.id, `${w} Clip`);
        clips++;
        if (!c.script?.length) P(`${w} Clip ${c.id}: kein Skript`);
        for (const turn of c.script ?? []) {
          if (!set.speakers?.[turn.s]) P(`${w} Clip ${c.id}: Sprecher "${turn.s}" nicht in speakers`);
          if (!turn.t) P(`${w} Clip ${c.id}: leere Zeile`);
        }
        if (!existsSync(path.join(ROOT, "public/audio/pruefungen", set.id, `${c.id}.mp3`))) missingAudio++;
      }
      for (const t of p.texts ?? []) if (!t.paras?.length) P(`${w} Text ${t.id}: keine Absätze`);
      const gaps = new Set((p.segments ?? []).filter((s) => s.gap).map((s) => s.gap));
      for (const it of p.items) {
        items++;
        useId(it.id, w);
        const wi = `${w} ${it.id}`;
        if (it.text && !texts.has(it.text)) P(`${wi}: Text "${it.text}" fehlt`);
        if (it.clip && !clipIds.has(it.clip)) P(`${wi}: Clip "${it.clip}" fehlt`);
        if (p.clips && !it.clip && p.clips.length > 1) P(`${wi}: welcher Clip?`);
        const type = it.type ?? p.type;
        switch (type) {
          case "tf": {
            const labels = it.labels ?? p.labels ?? ["richtig", "falsch"];
            if (!it.statement) P(`${wi}: ohne statement`);
            if (!TF[it.correct] || !labels.includes(it.correct)) P(`${wi}: Lösung "${it.correct}" nicht in ${labels.join("/")}`);
            break;
          }
          case "mc":
          case "gap-mc":
            if (type === "mc" && !it.question) P(`${wi}: ohne question`);
            if (!Array.isArray(it.options) || it.options.length < 2) P(`${wi}: options fehlen`);
            else if (!(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < it.options.length)) P(`${wi}: Lösung ${it.correct} außerhalb der Optionen`);
            else if (new Set(it.options).size !== it.options.length) P(`${wi}: doppelte Option`);
            break;
          case "match":
            if (!p.pool) P(`${w}: kein pool`);
            else if (!(it.correct in p.pool) && !(it.correct === "x" && p.none)) P(`${wi}: Lösung "${it.correct}" nicht im Pool`);
            if (!it.prompt) P(`${wi}: ohne prompt`);
            break;
          case "write-in":
            if (!Array.isArray(it.accept) || !it.accept.length || it.accept.some((x) => !String(x).trim())) P(`${wi}: accept[] fehlt`);
            break;
          case "gap-bank":
            if (!p.bank) P(`${w}: keine bank`);
            else if (!(it.correct in p.bank)) P(`${wi}: Lösung "${it.correct}" nicht in der Wortliste`);
            break;
        }
        if ((p.type === "gap-mc" || p.type === "gap-bank" || (p.type === "write-in" && p.segments)) && !gaps.has(it.id)) P(`${wi}: Lücke steht nicht im Text`);
      }
      if (p.type === "match" && p.pool && !p.allowReuse) {
        const used = p.items.map((i) => i.correct).filter((c) => c !== "x");
        if (new Set(used).size !== used.length) P(`${w}: ein Pool-Eintrag ist zweimal die Lösung (allowReuse setzen, wenn das gewollt ist)`);
      }
      if (p.type === "gap-bank" && p.bank) {
        const used = p.items.map((i) => i.correct);
        if (new Set(used).size !== used.length) P(`${w}: ein Wort der Liste ist zweimal die Lösung`);
      }
    });
  });
}

// The light index the /fortschritt registry imports in the browser (ids only, no content).
const indexPath = path.join(ROOT, "src/data/pruefungen/saetze-index.json");
const indexJson = JSON.stringify(index.sort((a, b) => a.id.localeCompare(b.id)), null, 2) + "\n";
if (!existsSync(indexPath) || readFileSync(indexPath, "utf8") !== indexJson) {
  writeFileSync(indexPath, indexJson);
  console.log("  saetze-index.json aktualisiert.");
}

// ── DTZ (own trainer, src/lib/dtzTrainer.js) ───────────────────────────────────────────
// Set 1 is free (src/data/pruefungen/dtz/), sets 2–4 are the DTZ-Paket (src/paid/…/dtz/).
// Every set has the official shape: nine parts in this order, ids 1–45 once each, two
// Schreiben tasks. Paid sets also carry a one-line `_why` per scored item for review
// (the trainer ignores unknown fields).
const DTZ_PARTS = [
  ["h1", "mc-audio", 4], ["h2", "mc-audio", 5], ["h3", "dialog", 8], ["h4", "statement-match", 3],
  ["l1", "toc", 5], ["l2", "ads", 5], ["l3", "texts", 6], ["l4", "regulative", 3], ["l5", "letter-gaps", 6],
];
const DTZ_DIRS = [["src/data/pruefungen/dtz", false], ["src/paid/pruefungen/dtz", true]];
let dtzSets = 0;
const isIdx = (c, opts) => Number.isInteger(c) && c >= 0 && c < (opts?.length ?? 0);
for (const [rel, paidSet] of DTZ_DIRS) {
  const dir = path.join(ROOT, rel);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const s = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    const P = (msg) => problems.push(`dtz/${file}: ${msg}`);
    dtzSets++;
    if (`${s.id}.json` !== file) P(`id "${s.id}" passt nicht zum Dateinamen`);
    for (const k of ["label", "meta", "parts", "schreiben"]) if (!s[k]) P(`fehlt: ${k}`);
    if (!s.meta?.title || !s.meta?.sourceNote) P("meta.title / meta.sourceNote fehlt");
    const ids = [];
    const scored = [];
    DTZ_PARTS.forEach(([key, type, n], pi) => {
      const p = s.parts?.[pi];
      if (!p) return P(`Teil ${key} fehlt`);
      const w = `${key}`;
      if (p.key !== key || p.type !== type) return P(`Teil ${pi + 1}: ${p.key}/${p.type}, erwartet ${key}/${type}`);
      if (!p.title || !p.instruction || !p.group || !p.label) P(`${w}: title/instruction/group/label fehlt`);
      const qs =
        type === "dialog" ? (p.groups ?? []).flatMap((g) => g.questions ?? [])
        : type === "texts" ? (p.texts ?? []).flatMap((t) => t.questions ?? [])
        : p.items ?? [];
      if (qs.length !== n) P(`${w}: ${qs.length} Aufgaben, erwartet ${n}`);
      for (const q of qs) { ids.push(q.id); scored.push([w, q]); }
      const tfOrMc = (q) =>
        q.type === "tf" ? ["richtig", "falsch"].includes(q.correct) || P(`${w} #${q.id}: tf-Lösung "${q.correct}"`)
        : q.type === "mc" ? (q.options?.length === 3 && isIdx(q.correct, q.options)) || P(`${w} #${q.id}: mc braucht 3 Optionen und gültige Lösung`)
        : P(`${w} #${q.id}: type muss tf oder mc sein`);
      switch (type) {
        case "mc-audio":
          for (const it of [...(p.example ? [p.example] : []), ...p.items]) {
            if (!it.transcript || !it.question) P(`${w} #${it.id ?? "bsp"}: transcript/question fehlt`);
            if (it.options?.length !== 3 || new Set(it.options).size !== 3 || !isIdx(it.correct, it.options)) P(`${w} #${it.id ?? "bsp"}: 3 verschiedene Optionen und gültige Lösung nötig`);
          }
          break;
        case "dialog":
          if ((p.groups ?? []).length !== 4) P(`${w}: 4 Gespräche erwartet`);
          for (const g of p.groups ?? []) {
            if (!Array.isArray(g.dialog) || g.dialog.length < 2 || g.dialog.some((t) => !Array.isArray(t) || t.length !== 2 || !t[1])) P(`${w}: Gespräch braucht [Sprecher, Text]-Zeilen`);
            if ((g.questions ?? []).length !== 2) P(`${w}: 2 Aufgaben pro Gespräch`);
            g.questions?.forEach(tfOrMc);
          }
          break;
        case "statement-match": {
          const keys = Object.keys(p.statements ?? {});
          if (keys.length !== 6) P(`${w}: 6 Aussagen (a–f) erwartet`);
          if (p.example && !keys.includes(p.example.answer)) P(`${w}: Beispiel-Lösung nicht in den Aussagen`);
          const used = [p.example?.answer, ...p.items.map((i) => i.correct)].filter(Boolean);
          if (new Set(used).size !== used.length) P(`${w}: eine Aussage ist zweimal die Lösung`);
          for (const it of p.items) if (!keys.includes(it.correct) || !it.transcript) P(`${w} #${it.id}: Lösung/Transkript`);
          break;
        }
        case "toc":
          if (!(p.toc ?? []).length) P(`${w}: toc leer`);
          for (const it of [...(p.example ? [p.example] : []), ...p.items]) if (!it.question || it.options?.length !== 3 || !isIdx(it.correct, it.options)) P(`${w} #${it.id ?? "bsp"}: Frage/3 Optionen/Lösung`);
          break;
        case "ads": {
          const keys = Object.keys(p.ads ?? {});
          if (keys.length < 6) P(`${w}: mindestens 6 Anzeigen`);
          for (const it of p.items) if (!it.question || !(keys.includes(it.correct) || it.correct === "x")) P(`${w} #${it.id}: Lösung "${it.correct}"`);
          const used = p.items.map((i) => i.correct).filter((c) => c !== "x");
          if (new Set(used).size !== used.length) P(`${w}: eine Anzeige ist zweimal die Lösung`);
          break;
        }
        case "texts":
          if ((p.texts ?? []).length !== 3) P(`${w}: 3 Texte erwartet`);
          for (const t of p.texts ?? []) {
            if (!t.title || !(t.paras ?? []).length) P(`${w}: Text ohne title/paras`);
            if ((t.questions ?? []).length !== 2) P(`${w}: 2 Aufgaben pro Text`);
            t.questions?.forEach(tfOrMc);
          }
          break;
        case "regulative":
          if (!p.readingTitle || !(p.paras ?? []).length) P(`${w}: readingTitle/paras fehlt`);
          for (const it of p.items) if (!it.question || !["richtig", "falsch"].includes(it.correct)) P(`${w} #${it.id}: richtig/falsch`);
          break;
        case "letter-gaps": {
          const blanks = (p.letterSegments ?? []).filter((x) => x.blank !== undefined).map((x) => x.blank);
          if (JSON.stringify(blanks) !== JSON.stringify(p.items.map((_, i) => i))) P(`${w}: Lücken 0–${p.items.length - 1} je einmal und in Reihenfolge`);
          for (const it of p.items) if (it.options?.length !== 3 || new Set(it.options).size !== 3 || !isIdx(it.correct, it.options)) P(`${w} #${it.id}: 3 verschiedene Optionen und gültige Lösung`);
          break;
        }
      }
    });
    const want = Array.from({ length: 45 }, (_, i) => i + 1);
    if (JSON.stringify(ids) !== JSON.stringify(want)) P(`Aufgaben-Nummern müssen 1–45 in Reihenfolge sein (sind: ${ids.join(",")})`);
    for (const t of ["taskA", "taskB"]) if (!s.schreiben?.[t]?.prompt || !(s.schreiben[t].points ?? []).length) P(`schreiben.${t} unvollständig`);
    if (paidSet) for (const [w, q] of scored) if (!q._why || String(q._why).length < 10) P(`${w} #${q.id}: _why (Begründung für die Durchsicht) fehlt`);
    items += 45;
  }
}

for (const n of notes) console.log("  Hinweis: " + n);
if (missingAudio) console.log(`  ${missingAudio} von ${clips} Hörtexten ohne mp3 — node --env-file=.env.local scripts/generate-pruefungen-audio.mjs`);
if (problems.length) {
  console.error(`check:pruefungen — ${problems.length} Problem(e):`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`check:pruefungen ok: ${sets} Übungssätze + ${dtzSets} DTZ-Sätze, ${items} bewertete Aufgaben, ${clips} Hörtexte.`);
