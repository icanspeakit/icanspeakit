// check:lindenau — the dialogues of /spiele/lindenau (src/lib/lindenau/quests.js) hold
// together: every turn has a German line and its English help, every `choose` has exactly
// one right reply and a why for each wrong one, every `build`/`say` is a sentence the tiles can
// actually make (alts too), distractor tiles are not part of the sentence, and every icon
// exists in public/img/openmoji/. Runs in prebuild; exit 1 on any error.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const mod = await import(pathToFileURL(ROOT + "src/lib/lindenau/quests.js").href);
const areas = mod.AREAS;

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const icon = (where, hex) => {
  if (hex && !existsSync(`${ROOT}public/img/openmoji/${hex}.svg`)) err(where, `Icon ${hex}.svg fehlt in public/img/openmoji/`);
};
const sorted = (a) => [...a].sort().join("\u0000");
const STRAIGHT = /"/;

function line(where, l) {
  if (!l?.npc?.trim()) err(where, "Zeile ohne `npc`");
  if (!l?.en?.trim()) err(where, "Zeile ohne `en`");
  if (STRAIGHT.test(l?.npc ?? "")) err(where, "gerade Anführungszeichen – „…“ verwenden");
}

let turns = 0;
for (const k of ["offer", "done"]) line(`BRUNO_REVIEW.${k}`, mod.BRUNO_REVIEW?.[k]);
const inside = (p, b) => p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h;
const ids = new Set();
for (const area of areas) {
  const A = `[${area.id}]`;
  if (ids.has(area.id)) err(A, "Gebiet doppelt");
  ids.add(area.id);
  const b = area.bruno;
  if (b) {
    for (const [k, l] of (b.intro ?? []).entries()) line(`${A} bruno.intro[${k}]`, l);
    for (const [k, l] of (b.done ?? []).entries()) line(`${A} bruno.done[${k}]`, l);
    if (typeof b.waiting === "function") for (const n of [1, 2, 3]) for (const l of b.waiting(n)) line(`${A} bruno.waiting(${n})`, l);
  }
  for (const bd of area.buildings ?? []) icon(`${A} ${bd.id}`, bd.icon);
  if (!b?.clip) err(A, "`bruno.clip` fehlt (Name der Audio-Dateien)");
  for (const p of [area.start, b, ...area.quests]) {
    const hit = area.buildings.find((bd) => inside(p, bd));
    if (hit) err(A, `${p.id ?? "start"} steht im Gebäude ${hit.id}`);
  }
  for (const q of area.quests) {
    const Q = `${A} ${q.id}`;
    if (ids.has(q.id)) err(Q, "id doppelt");
    ids.add(q.id);
    for (const k of ["mascot", "name", "role"]) if (!q[k]) err(Q, `\`${k}\` fehlt`);
    if (!q.item?.label) err(Q, "`item.label` fehlt");
    icon(Q, q.item?.icon);
    line(`${Q} outro`, q.outro);
    for (const [i, t] of q.turns.entries()) {
      const T = `${Q} Zug ${i + 1}`;
      line(T, t);
      if (!t.task) continue;
      turns++;
      if (t.task.type === "choose") {
        const opts = t.task.options ?? [];
        if (opts.length < 2) err(T, "weniger als 2 Antworten");
        const ok = opts.filter((o) => o.ok);
        if (ok.length !== 1) err(T, `${ok.length} richtige Antworten (genau 1)`);
        for (const o of opts) {
          if (!o.de?.trim()) err(T, "Antwort ohne Text");
          if (!o.ok && !o.why?.trim()) err(T, `„${o.de}“: falsch, aber ohne \`why\``);
          if (STRAIGHT.test(o.de + (o.why ?? ""))) err(T, `„${o.de}“: gerade Anführungszeichen`);
        }
        if (new Set(opts.map((o) => o.de)).size !== opts.length) err(T, "zwei gleiche Antworten");
      } else if (t.task.type === "build" || t.task.type === "say") {
        const { words = [], extra = [], alts = [], why } = t.task;
        const sentence = words.join(" ");
        if (words.length < 2) err(T, "Satz mit weniger als 2 Kacheln");
        if (!/[.?!]$/.test(sentence)) err(T, `„${sentence}“ endet nicht mit . ? !`);
        if (!/^[A-ZÄÖÜ]/.test(sentence)) err(T, `„${sentence}“ beginnt nicht groß`);
        if (!why?.trim()) err(T, "build ohne `why`");
        for (const x of extra) if (words.includes(x)) err(T, `Ablenker „${x}“ steht auch im Satz`);
        for (const a of alts) {
          if (!/[.?!]$/.test(a)) err(T, `alt „${a}“ endet nicht mit . ? !`);
          if (sorted(a.split(/\s+/)) !== sorted(words)) err(T, `alt „${a}“ lässt sich aus den Kacheln nicht bauen`);
          if (a === sentence) err(T, `alt „${a}“ ist der Satz selbst`);
        }
      } else err(T, `unbekannter Aufgabentyp „${t.task.type}“`);
    }
    if (q.turns.filter((t) => t.task?.type === "say").length > 1) err(Q, "mehr als eine Sprech-Aufgabe");
  }
}

if (errors.length) {
  console.error(`check:lindenau – ${errors.length} Fehler:\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`check:lindenau ok: ${areas.length} Gebiet(e), ${areas.reduce((n, a) => n + a.quests.length, 0)} Aufgaben, ${turns} Antworten.`);
