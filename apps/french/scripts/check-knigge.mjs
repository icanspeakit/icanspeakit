// check:knigge — the scenes of the Manners Simulator (src/lib/knigge/scenes.js) hold together:
// every option has French, English help and a why; deltas follow the bands of the file's header;
// French has its space before ? ! : ; and no ¿ ¡ or other Spanish leftovers; reactions are translated unless they are only a stage
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

// French with the parenthesised English stage directions taken out.
const spanish = (s) => (s ?? "").replace(/\([^)]*\)/g, "").trim();
// French print: a space before ? ! : ; (game.js makes it a no-break space on screen); no ¿ ¡.
function marks(where, s) {
  const text = spanish(s);
  if (/[¿¡]/.test(text)) err(where, `¿/¡ im Französischen: ${s}`);
  if (/[^\s(«"“][?!:;]/.test(text)) err(where, `Leerzeichen vor ? ! : ; fehlt: ${s}`);
}
// Forms that would need to know the player's (or Alex's) gender: an adjective or a past
// participle after je suis / tu es / vous êtes (and the other être forms), and the fixed
// phrases enchanté(e), ravi(e), désolé(e), soyez le/la bienvenu(e).
const L = "a-zàâçéèêëîïôûùüœ";
const START = `(?<![${L}'])`, END = `(?![${L}])`;
const AGREE = `(?:[${L}]+(?:é|ée|és|ées)|ravie?|venue?|perdue?|prête?|sûre?|contente?|nouveau|nouvelle|seule?|heureux|heureuse|certaine?|partie?|sortie?|prise?|surprise?|assise?|inquiète|inquiet)${END}`;
const ADV = String.raw`(?:pas\s+)?(?:très\s+|trop\s+|si\s+|tellement\s+|vraiment\s+|bien\s+)?`;
const ME = String.raw`(?:je\s+(?:ne\s+)?suis|j'étais|je\s+serai|je\s+serais)`;
const YOU = String.raw`(?:tu\s+(?:n')?es|t'es|vous\s+(?:n')?êtes|tu\s+étais|vous\s+étiez|tu\s+seras|vous\s+serez)`;
const WELCOME = String.raw`soyez\s+(?:le|la)\s+bienvenue?${END}`;
const FIXED = `(?:enchantée?|désolée?)${END}`;
// The speaker's own gender (the player; the any-gender small-talk answers; Alex).
const SELF = new RegExp(`${START}(?:${FIXED}|${ME}\\s+${ADV}${AGREE})`, "i");
// The player's gender in what is said to the player. NPCs may still speak about themselves
// (Lucas: je suis crevé), and the player may say vous êtes sûr ? to Monsieur Bernard.
const TO_PLAYER = new RegExp(`${START}(?:${WELCOME}|${YOU}\\s+${ADV}${AGREE})`, "i");
const GENDERED = { test: (s) => SELF.test(s) || TO_PLAYER.test(s) };
// Spanish leftovers in the French, English-course leftovers in the English.
const LEFTOVER = /[ñ¿¡]|\b(usted|señora?|gracias|hola|vale|vosotros|camarero|euros? con)\b/i;

const culture = new Set(Object.values(ITEM_SLUGS["/culture/codes-sociaux"] ?? {}).map((s) => `/culture/codes-sociaux/${s}`));
const topics = Array.isArray(kultur) ? kultur : kultur.topics ?? Object.values(kultur).find(Array.isArray);
for (const x of topics ?? []) culture.add(`/culture/${ITEM_SLUGS["/culture"]?.[x.id] ?? x.id}`);

const topicIds = new Set(TOPICS.map((t) => t.id));
for (const t of TOPICS) {
  const T = `Thema ${t.id}`;
  for (const k of ["sie", "du"]) {
    if (!t.say?.[k]?.trim()) err(T, `say.${k} fehlt`);
    if (!t.sayEn?.[k]?.trim()) err(T, `sayEn.${k} fehlt`);
    marks(T, t.say?.[k]);
    if (SELF.test(t.say?.[k] ?? "")) err(T, `Form mit Genus: ${t.say[k]}`);
    if (LEFTOVER.test(t.say?.[k] ?? "")) err(T, `Rest aus dem Spanischkurs: ${t.say[k]}`);
  }
  for (const [kind, line] of Object.entries(t.re ?? {})) {
    if (!t.reEn?.[kind]?.trim()) err(T, `reEn.${kind} fehlt`);
    marks(T, line);
    if (GENDERED.test(line)) err(T, `Form mit Genus: ${line}`);
    if (LEFTOVER.test(line)) err(T, `Rest aus dem Spanischkurs: ${line}`);
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
    // Alex (the date) has no gender: nothing Alex says may carry one, and the English
    // around Alex uses they/them.
    const toPlayer = (s, speaker) => (speaker === "alex" ? GENDERED : TO_PLAYER).test(s);
    if (who.has("alex")) {
      const english = sc.turns.flatMap((tu) => [tu.situation, tu.en, ...(tu.options ?? []).flatMap((o) => [o.en, o.reactEn, o.why, o.react])]).join(" ");
      const m = english.match(/\b(he|she|him|her|his|hers|himself|herself)\b/i);
      if (m) err(S, `Alex mit Genus im Englischen: „${m[0]}“`);
    }
    for (const [i, tu] of sc.turns.entries()) {
      turns++;
      const T = `${S} Zug ${i + 1}`;
      const p = who.get(tu.who);
      if (!p) { err(T, `who „${tu.who}“ fehlt in people`); continue; }
      if (tu.npc) {
        marks(T, tu.npc);
        if (!tu.en?.trim()) err(T, "npc ohne en");
        if (toPlayer(tu.npc, tu.who)) err(T, `Form mit Genus: ${tu.npc}`);
        if (LEFTOVER.test(tu.npc)) err(T, `Rest aus dem Spanischkurs: ${tu.npc}`);
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
        if (SELF.test(spanish(o.de))) err(O, "Form mit Genus");
        if (toPlayer(spanish(o.react), o.by ?? tu.who)) err(O, `Form mit Genus: ${o.react}`);
        if (LEFTOVER.test(spanish(o.de) + " " + spanish(o.react))) err(O, "Rest aus dem Spanischkurs");
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
