// check:redewendungen — the entries of /knowledge/idioms (src/data/redewendungen.json)
// hold together: unique ids, every required field, valid typ/thema/level/register/certainty,
// at least one source with an https URL, `aehnlich` ids that exist, `siehe` routes that
// exist, OpenMoji icons that exist, and every example sentence containing one of the
// phrase's key words (catches an example pasted under the wrong entry). Runs in prebuild;
// exit 1 on any error.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const data = JSON.parse(readFileSync(`${ROOT}src/data/redewendungen.json`, "utf8"));

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const icon = (where, hex) => {
  if (!existsSync(`${ROOT}public/img/openmoji/${hex}.svg`)) err(where, `Icon ${hex}.svg fehlt in public/img/openmoji/`);
};

const TYP = ["redewendung", "sprichwort"];
const LEVEL = ["B1", "B2", "C1"];
const REGISTER = ["neutral", "umgang"];
const CERTAINTY = ["sicher", "wahrscheinlich", "unklar"];
const STATUS = ["entwurf", "geprueft"];
const TEXT = ["de", "bild", "bedeutung", "wann", "en"];
const themen = new Set(data.themen.map((t) => t.id));
for (const t of data.themen) icon(`thema ${t.id}`, t.icon);

const ids = new Set();
for (const e of data.eintraege) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id ?? "")) err(e.id ?? "?", "id fehlt oder ist kein Slug (a–z, 0–9, -)");
  if (ids.has(e.id)) err(e.id, "id doppelt");
  ids.add(e.id);
}

/** A route on this site: a page file, or a published word history. */
function routeExists(path) {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "");
  const wg = clean.match(/^\/knowledge\/word-stories\/([^/]+)$/);
  if (wg) return existsSync(`${ROOT}src/content/wortgeschichte/${wg[1]}.json`);
  return [`${clean}.astro`, `${clean}/index.astro`].some((f) => existsSync(`${ROOT}src/pages${f}`));
}

// Words too common to prove an example belongs to its phrase.
const STOP = new Set("estar tener hacer para como pero algo alguien cada aquí muy unos unas este esta esto sobre desde hasta cuando donde quien".split(" "));
// A word counts by its first letters, so a conjugated verb still matches when its stem holds.
// Short names count too („Roma“), short other words don't.
const keys = (de) =>
  de.replace(/[„“"!?¿¡.,:;…]/g, " ").split(/\s+/)
    .filter((w, i) => (w.length >= 4 || (i > 0 && /^[A-ZÁÉÍÓÚÑ]/.test(w) && w.length >= 3)) && !STOP.has(w.toLowerCase()))
    .map((w) => w.toLowerCase().slice(0, 4));

for (const e of data.eintraege) {
  const at = e.id;
  for (const f of TEXT) if (typeof e[f] !== "string" || !e[f].trim()) err(at, `\`${f}\` fehlt`);
  if (!TYP.includes(e.typ)) err(at, `typ „${e.typ}“ unbekannt`);
  if (!themen.has(e.thema)) err(at, `thema „${e.thema}“ unbekannt`);
  if (!LEVEL.includes(e.level)) err(at, `level „${e.level}“ unbekannt`);
  if (!REGISTER.includes(e.register)) err(at, `register „${e.register}“ unbekannt`);
  if (!STATUS.includes(e.status)) err(at, `status „${e.status}“ unbekannt`);
  if (!CERTAINTY.includes(e.herkunft?.certainty)) err(at, `herkunft.certainty „${e.herkunft?.certainty}“ unbekannt`);
  if (!e.herkunft?.text?.trim()) err(at, "herkunft.text fehlt");
  if (!Array.isArray(e.quellen) || !e.quellen.some((q) => /^https:\/\/\S+$/.test(q?.url ?? "") && q?.name)) err(at, "keine Quelle mit Name und https-URL");
  if (!Array.isArray(e.bsp) || !e.bsp.length) err(at, "kein Beispiel (bsp)");
  const k = keys(e.de);
  for (const [i, b] of (e.bsp ?? []).entries()) {
    if (k.length && !k.some((w) => b.toLowerCase().includes(w))) err(at, `bsp[${i}] enthält kein Schlüsselwort der Wendung („${b}“)`);
  }
  if (!e.comic?.quaki?.trim()) err(at, "comic.quaki fehlt");
  for (const c of e.comic?.props ?? []) icon(at, c);
  for (const a of e.aehnlich ?? []) if (!ids.has(a)) err(at, `aehnlich „${a}“ gibt es nicht`);
  if (e.siehe && !routeExists(e.siehe)) err(at, `siehe „${e.siehe}“ führt ins Leere`);
  for (const f of [...TEXT, "herkunft"]) {
    const v = f === "herkunft" ? e.herkunft?.text : e[f];
    if (f !== "en" && /"/.test(v ?? "")) err(at, `gerade Anführungszeichen in \`${f}\` – „…“ verwenden`);
  }
}

if (errors.length) {
  console.error(`check:redewendungen – ${errors.length} Fehler:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`check:redewendungen – ${data.eintraege.length} Einträge in ${themen.size} Themen in Ordnung.`);
