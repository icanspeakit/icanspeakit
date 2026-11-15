// Map geometry for /knowledge/accents (regional varieties of Italian, Italy's other languages) —
// run once, output committed.
//
//   node scripts/generate-dialekte-karte.mjs
//
// No packages and no network: the coast comes from the Natural Earth outlines committed in the
// old Europe view (see karte-geo.mjs). It writes src/data/dialekte-karte.json: land around Italy,
// Italy's outline as `mask`, one <path d> per accent area, the two sound lines and the label and
// marker positions from src/data/dialekte.json.
//
// The areas are hand-drawn on purpose. Each one follows the borders of its regions only roughly
// and runs generously past the coast and the frontier; the page clips them to `mask` with an SVG
// clipPath, so only the inner borders matter. Neighbouring areas share the vertices below, so
// they fit without gaps. Italy's islands (Sicily, Sardinia, Elba, Pantelleria, Ischia) are in the
// outline; the smaller ones of the 1:50 m view are not (Capri, Lipari, Ustica ... are too small).
//
// If Natural Earth subunits can be installed one day (world-atlas, or the admin-1 file for the
// real region borders), replace SHAPES; dialekte.json need not change.
import fs from "node:fs";
import { loadSource, parseRings, contains, europeProjection, smooth, ringPath, linePath, r1 } from "./karte-geo.mjs";

const data = JSON.parse(fs.readFileSync("src/data/dialekte.json", "utf8"));
const source = loadSource().europe;
const base = europeProjection(source.w, source.h);

// ── rings ─────────────────────────────────────────────────────────────
const allRings = [...parseRings(source.land), ...Object.values(source.countries).flatMap(parseRings)];
// Mainland, Sicily, Sardinia, Elba, Pantelleria, Ischia.
const ITALY_SEEDS = [[12.5, 42.5], [14, 37.6], [9, 40], [10.3, 42.78], [11.95, 36.8], [13.9, 40.73]];
const italy = ITALY_SEEDS.map((s) => allRings.filter((r) => contains(r, base(s))).sort((a, b) => b.length - a.length)[0]);
if (italy.some((r) => !r) || new Set(italy).size !== ITALY_SEEDS.length) throw new Error("Italy: rings not found");
const others = allRings.filter((r) => !italy.includes(r));

// ── frame ─────────────────────────────────────────────────────────────
const corners = [[6.2, 47.5], [19.2, 47.5], [6.2, 36.3], [19.2, 36.3]].map(base);
const frame = {
  x0: Math.min(...corners.map((p) => p[0])),
  x1: Math.max(...corners.map((p) => p[0])),
  y0: Math.min(...corners.map((p) => p[1])),
  y1: Math.max(...corners.map((p) => p[1])),
};
const WIDTH = 760;
const scale = WIDTH / (frame.x1 - frame.x0);
const HEIGHT = Math.ceil((frame.y1 - frame.y0) * scale);
const toOut = ([x, y]) => [(x - frame.x0) * scale, (y - frame.y0) * scale];
const P = (ll) => toOut(base(ll));
const Pr = (ll) => P(ll).map(r1);

const inFrame = (ring) => ring.some(([x, y]) => x >= frame.x0 && x <= frame.x1 && y >= frame.y0 && y <= frame.y1);
const soft = (ring) => smooth(smooth(ring));
const landPath = others.filter(inFrame).map((r) => ringPath(soft(r).map(toOut))).join("");
const italyPaths = italy.map((r) => ringPath(soft(r).map(toOut))).join("");

// ── the areas (lon, lat): shared borders first ────────────────────────
const rev = (a) => [...a].reverse();
const NORTH = 47.6; // north of every north frontier

const northEastWest = [[10.4, NORTH], [10.4, 47.3], [10.45, 46.55], [10.5, 46.2], [10.65, 45.9], [10.7, 45.6], [10.75, 45.45], [10.9, 45.25], [11.2, 45.0]];
const poEast = [[11.2, 45.0], [11.6, 44.97], [12.0, 44.93], [12.55, 44.9], [13.2, 44.9]];
const poWest = [[11.2, 45.0], [10.65, 44.98], [10.2, 45.05], [9.7, 45.08], [9.3, 45.12]];
const emiliaWest = [[9.3, 45.12], [9.1, 44.95], [9.0, 44.65]];
const ligEmilia = [[9.0, 44.65], [9.2, 44.55], [9.5, 44.5], [9.8, 44.4], [9.9, 44.3]];
const ligTuscany = [[9.9, 44.3], [10.0, 44.12], [9.9, 43.9], [9.6, 43.3]];
const tuscEmilia = [[9.9, 44.3], [10.2, 44.28], [10.5, 44.22], [10.8, 44.18], [11.2, 44.12], [11.5, 44.05], [11.75, 43.88], [12.0, 43.78], [12.2, 43.75]];
const emiliaMarche = [[12.2, 43.75], [12.5, 43.85], [12.75, 43.95], [13.2, 44.1]];
const tuscUmbria = [[12.2, 43.75], [12.15, 43.45], [11.95, 43.15], [11.95, 42.75]];
const tuscLazio = [[11.95, 42.75], [11.7, 42.5], [11.5, 42.3], [11.2, 41.9]];
const umbriaLazio = [[11.95, 42.75], [12.3, 42.55], [12.75, 42.5], [13.1, 42.6], [13.3, 42.7]];
const marcheAbruzzo = [[13.3, 42.7], [13.6, 42.85], [13.9, 42.88], [14.5, 42.9]];
const lazioAbruzzo = [[13.3, 42.7], [13.35, 42.3], [13.6, 41.95], [13.85, 41.75], [14.0, 41.72]];
const lazioMolise = [[14.0, 41.72], [14.0, 41.58]];
const lazioCampania = [[14.0, 41.58], [13.85, 41.4], [13.75, 41.25], [13.7, 40.4]];
const abruzzoCampania = [[14.0, 41.58], [14.3, 41.5], [14.6, 41.45], [14.95, 41.4]];
const abruzzoPuglia = [[15.3, 42.3], [15.15, 41.92], [14.95, 41.6], [14.95, 41.4]];
const abruzzoSea = [[14.5, 42.9], [15.3, 42.3]];
const campaniaPuglia = [[14.95, 41.4], [15.2, 41.2], [15.35, 40.95], [15.4, 40.8]];
const campaniaCalabria = [[15.4, 40.8], [15.5, 40.65], [15.55, 40.4], [15.6, 40.1], [15.2, 39.8]];
const pugliaCalabria = [[15.4, 40.8], [15.9, 41.0], [16.1, 40.95], [16.35, 40.84], [16.7, 40.77], [16.85, 40.43], [17.5, 39.9]];

const SHAPES = {
  nordovest: [[5.5, NORTH], ...northEastWest, ...poWest.slice(1), ...emiliaWest.slice(1), ...ligEmilia.slice(1), ...ligTuscany.slice(1), [5.5, 43.3]],
  nordest: [...northEastWest, ...poEast.slice(1), [19, 44.9], [19, NORTH]],
  emilia: [...poEast, [13.2, 44.1], ...rev(emiliaMarche).slice(1), ...rev(tuscEmilia).slice(1), ...rev(ligEmilia).slice(1), ...rev(emiliaWest).slice(1), ...rev(poWest).slice(1, -1)],
  toscana: [...tuscEmilia, ...tuscUmbria.slice(1), ...tuscLazio.slice(1), [9.5, 41.9], ...rev(ligTuscany).slice(0, -1)],
  // Marche and Umbria: the Emilia border, the sea, the Abruzzo border, the Lazio border, the Tuscany border.
  marcheumbria: [...emiliaMarche, [14.5, 42.9], ...rev(marcheAbruzzo).slice(1), ...rev(umbriaLazio).slice(1), ...rev(tuscUmbria).slice(1, -1)],
  // Lazio: Tuscany border (from the sea up), Umbria, Abruzzo, Molise and Campania borders, the sea.
  lazio: [...rev(tuscLazio), ...umbriaLazio.slice(1), ...lazioAbruzzo.slice(1), ...lazioMolise.slice(1), ...lazioCampania.slice(1), [11.2, 40.4]],
  abruzzo: [...marcheAbruzzo.slice(0, -1), ...abruzzoSea, ...abruzzoPuglia.slice(1), ...rev(abruzzoCampania).slice(1), ...rev(lazioMolise).slice(1), ...rev(lazioAbruzzo).slice(1)],
  campania: [...abruzzoCampania, ...campaniaPuglia.slice(1), ...campaniaCalabria.slice(1), [13.7, 40.4], ...rev(lazioCampania).slice(1, -1)],
  puglia: [[15.3, 42.6], ...abruzzoPuglia, ...campaniaPuglia.slice(1), ...pugliaCalabria.slice(1), [18.6, 39.5], [19, 40], [19, 42.6]],
  calabria: [...pugliaCalabria, [17.5, 37.9], [15.58, 37.9], [15.68, 38.5], [15.2, 39.8], ...rev(campaniaCalabria).slice(1, -1)],
  sicilia: [[15.2, 39.8], [15.68, 38.5], [15.58, 37.9], [15.58, 35.0], [11.0, 35.0], [11.0, 40.4], [13.7, 40.4]],
  sardegna: [[7.3, 38.2], [10.6, 38.2], [10.6, 41.7], [7.3, 41.7]],
};
for (const r of data.regions) if (!SHAPES[r.id]) throw new Error("no shape for " + r.id);
const dialects = Object.fromEntries(data.regions.map((r) => [r.id, ringPath(SHAPES[r.id].map(P))]));

const out = {
  _comment: "Generated by scripts/generate-dialekte-karte.mjs from the Natural Earth outlines (public domain) of the old Europe view; inner borders are hand-drawn and rough. Do not edit by hand. `benrath` is the line of the s in casa (/z/ north, /s/ south), `speyer` the line of the passato remoto in speech; the key names are kept from the German page.",
  w: WIDTH,
  h: HEIGHT,
  land: landPath,
  mask: italyPaths,
  swiss: "",
  states: "",
  borders: "",
  coast: italyPaths,
  dialects,
  labels: Object.fromEntries(data.regions.map((r) => [r.id, Pr(r.label)])),
  markers: Object.fromEntries(data.markers.map((m) => [m.id, Pr(m.at)])),
  others: Object.fromEntries(data.others.map((o) => [o.id, Pr(o.at)])),
  benrath: linePath(data.lines.benrath.map(P)),
  speyer: linePath(data.lines.speyer.map(P)),
  benrathAt: Pr(data.lines.benrathAt),
  speyerAt: Pr(data.lines.speyerAt),
};
fs.writeFileSync("src/data/dialekte-karte.json", JSON.stringify(out));
console.log("size", (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0) + " KB", WIDTH + "x" + HEIGHT, "land rings", others.filter(inFrame).length);
for (const [k, v] of Object.entries(out.dialects)) if (!v) console.log("EMPTY", k);

// Self-check: every point of Italy's mainland and islands falls in exactly one area.
let bad = 0, n = 0;
const rings = Object.fromEntries(Object.entries(SHAPES).map(([id, sh]) => [id, sh.map(P)]));
const count = {};
for (let x = 0; x < WIDTH; x += 3) for (let y = 0; y < HEIGHT; y += 3) {
  const src = [x / scale + frame.x0, y / scale + frame.y0];
  if (!italy.some((r) => contains(r, src))) continue;
  n++;
  const hits = Object.keys(rings).filter((id) => contains(rings[id], [x, y]));
  hits.forEach((h) => (count[h] = (count[h] || 0) + 1));
  if (hits.length !== 1) { bad++; if (bad < 15) console.log("partition", x, y, hits.join(",") || "none"); }
}
console.log("partition check:", n, "points,", bad, "bad", JSON.stringify(count));
if (bad > n * 0.002) throw new Error("areas do not partition Italy");
