// check:knigge — the scenes of the Manners Simulator (src/lib/knigge/scenes.js) hold together:
// every option has Spanish, English help and a why; deltas follow the bands of the file's header;
// Spanish opens what it closes (¿ ¡); reactions are translated unless they are only a stage
// direction; a wheel's people have a hidden taste; `more` links exist; nothing the player says,
// and nothing said to the player, carries a gender. Runs in check:content; exit 1 on any error.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const { AREAS, TOPICS } = await import(pathToFileURL(ROOT + "src/lib/knigge/scenes.js").href);
const { ITEM_SLUGS } = await import(pathToFileURL(ROOT + "src/lib/routes.js").href);
const kultur = JSON.parse(readFileSync(ROOT + "src/data/kultur.json", "utf8"));

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

// Spanish with the parenthesised English stage directions taken out.
const spanish = (s) => (s ?? "").replace(/\([^)]*\)/g, "").trim();
function marks(where, s) {
  const text = spanish(s);
  if (/\?/.test(text) && !text.includes("¿")) err(where, `¿ fehlt: ${s}`);
  if (/!/.test(text) && !text.includes("¡")) err(where, `¡ fehlt: ${s}`);
}
// Forms that would need to know the player's (or Álex's) gender.
const GENDERED = /(?<!la )\bbienvenid[oa]s?\b|\bencantad[oa]\b|\b(estoy|soy|eres|estás)\s+(muy\s+)?(nuev|cansad|reventad|list|segur|maj|sincer|despiert|llen|tranquil)[oa]\b|\bqué\s+maj[oa]\b/i;
const LEFTOVER = /\b(Mr|Mrs|Ms|pub|pint|queue|lift)\b|£|British|England|Britain|\bUK\b/;

const culture = new Set(Object.values(ITEM_SLUGS["/culture/insider"] ?? {}).map((s) => `/culture/insider/${s}`));
const topics = Array.isArray(kultur) ? kultur : kultur.topics ?? Object.values(kultur).find(Array.isArray);
for (const x of topics ?? []) culture.add(`/culture/${ITEM_SLUGS["/culture"]?.[x.id] ?? x.id}`);

const topicIds = new Set(TOPICS.map((t) => t.id));
for (const t of TOPICS) {
  const T = `Thema ${t.id}`;
  for (const k of ["sie", "du"]) {
    if (!t.say?.[k]?.trim()) err(T, `say.${k} fehlt`);
    if (!t.sayEn?.[k]?.trim()) err(T, `sayEn.${k} fehlt`);
    marks(T, t.say?.[k]);
    if (GENDERED.test(t.say?.[k] ?? "")) err(T, `Form mit Genus: ${t.say[k]}`);
  }
  for (const [kind, line] of Object.entries(t.re ?? {})) {
    if (!t.reEn?.[kind]?.trim()) err(T, `reEn.${kind} fehlt`);
    marks(T, line);
    if (GENDERED.test(line)) err(T, `Form mit Genus: ${line}`);
  }
  if (!existsSync(`${ROOT}public/img/openmoji/${t.icon}.svg`)) err(T, `Icon ${t.icon} fehlt`);
}

let scenes = 0, turns = 0, options = 0;
const ids = new Set();
for (const area of AREAS) {
  for (const sc of area.scenes) {
    scenes++;
    const S = `${area.id}/${sc.id}`;
    if (ids.has(sc.id)) err(S, "Szene doppelt");
    ids.add(sc.id);
    if (sc.more && !culture.has(sc.more)) err(S, `more führt ins Leere: ${sc.more}`);
    const who = new Map(sc.people.map((p) => [p.id, p]));
    for (const [i, tu] of sc.turns.entries()) {
      turns++;
      const T = `${S} Zug ${i + 1}`;
      const p = who.get(tu.who);
      if (!p) { err(T, `who „${tu.who}“ fehlt in people`); continue; }
      if (tu.npc) {
        marks(T, tu.npc);
        if (!tu.en?.trim()) err(T, "npc ohne en");
        if (GENDERED.test(tu.npc) && !/reventado/.test(tu.npc)) err(T, `Form mit Genus: ${tu.npc}`);
      }
      if (tu.wheel) {
        if (!tu.situation) err(T, "Rad ohne situation");
        if (!p.talk) err(T, `Rad, aber ${p.id} hat kein talk`);
        for (const list of Object.values(p.talk ?? {})) for (const id of list) if (!topicIds.has(id)) err(T, `Thema „${id}“ unbekannt`);
        continue;
      }
      const opts = tu.options ?? [];
      if (opts.length < 3 || opts.length > 4) err(T, `${opts.length} Antworten (3–4)`);
      const top = Math.max(...opts.map((o) => o.delta));
      if (top < 10) err(T, "keine Antwort ≥ +10");
      if (opts.filter((o) => o.delta === top).length > 1) err(T, "zwei Antworten mit dem besten delta");
      for (const o of opts) {
        options++;
        const O = `${T} „${o.de}“`;
        for (const k of ["de", "en", "tag", "react", "why"]) if (!o[k]?.trim()) err(O, `\`${k}\` fehlt`);
        const d = Math.abs(o.delta);
        if (!((d >= 3 && d <= 8) || (d >= 12 && d <= 20))) err(O, `delta ${o.delta} außerhalb der Bänder`);
        if (o.by && !who.has(o.by)) err(O, `by „${o.by}“ fehlt in people`);
        marks(O, o.de);
        marks(O, o.react);
        if (spanish(o.react) && !o.reactEn?.trim()) err(O, "react ohne reactEn");
        if (!spanish(o.react) && o.reactEn) err(O, "reine Regieanweisung mit reactEn");
        if (GENDERED.test(spanish(o.de))) err(O, "Form mit Genus");
        if (GENDERED.test(spanish(o.react))) err(O, `Form mit Genus: ${o.react}`);
        if (LEFTOVER.test(spanish(o.de) + " " + spanish(o.react))) err(O, "Rest aus dem Englischkurs");
        if (/£|British|Britain|England|\bUK\b/.test(`${o.why} ${o.en}`)) err(O, "Rest aus dem Englischkurs");
      }
    }
  }
}

if (errors.length) {
  console.error(`check:knigge – ${errors.length} Fehler:\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`check:knigge ok: ${AREAS.length} Bereiche, ${scenes} Szenen, ${turns} Züge, ${options} Antworten, ${TOPICS.length} Themen.`);
