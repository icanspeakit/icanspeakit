// Map geometry for /knowledge/accents (varieties of Portuguese in Portugal) — run once, output committed.
//
//   node scripts/generate-dialekte-karte.mjs
//
// No packages and no network: the coast comes from the Natural Earth outlines committed in the
// old Europe view (see karte-geo.mjs). It writes src/data/dialekte-karte.json: land around Portugal,
// Portugal's outline as `mask`, one <path d> per accent area, the Azores and Madeira in inset
// boxes, the two sound lines and the label and marker positions from src/data/dialekte.json.
//
// The areas are hand-drawn on purpose. Each one follows the old provinces only roughly (the Douro,
// the Tagus, the hills above the Algarve) and runs generously past the coast and the frontier; the
// page clips them to `mask` with an SVG clipPath, so only the inner borders matter. Neighbouring
// areas share the vertices below, so they fit without gaps. The Azores and Madeira are not in the
// old file (its Europe view stops at about 11° W), so AZORES and MADEIRA are drawn by hand too,
// from their real coordinates, roughly.
//
// The Spanish version (Spain with the Canary Islands): git log -- scripts/generate-dialekte-karte.mjs
import fs from "node:fs";
import { loadSource, parseRings, contains, europeProjection, smooth, ringPath, linePath, r1 } from "./karte-geo.mjs";

const data = JSON.parse(fs.readFileSync("src/data/dialekte.json", "utf8"));
const source = loadSource().europe;
const base = europeProjection(source.w, source.h);

// ── rings ─────────────────────────────────────────────────────────────
const allRings = [...parseRings(source.land), ...Object.values(source.countries).flatMap(parseRings)];
const PORTUGAL_SEEDS = [[-8, 39.5]];
const portugal = allRings.filter((r) => PORTUGAL_SEEDS.some((s) => contains(r, base(s))));
if (portugal.length !== PORTUGAL_SEEDS.length) throw new Error(`Portugal: ${portugal.length} rings, expected ${PORTUGAL_SEEDS.length}`);
const others = allRings.filter((r) => !portugal.includes(r));

// ── the islands, moved into boxes in the Atlantic ─────────────────────
const AZORES = [
  [[-31.13, 39.73], [-31.09, 39.73], [-31.08, 39.67], [-31.12, 39.67]], // Corvo
  [[-31.27, 39.52], [-31.13, 39.52], [-31.12, 39.4], [-31.2, 39.37], [-31.26, 39.43]], // Flores
  [[-28.84, 38.6], [-28.7, 38.64], [-28.6, 38.55], [-28.7, 38.52], [-28.8, 38.53]], // Faial
  [[-28.55, 38.55], [-28.3, 38.52], [-28.03, 38.42], [-28.1, 38.39], [-28.35, 38.41], [-28.53, 38.45]], // Pico
  [[-28.33, 38.72], [-28.05, 38.66], [-27.76, 38.58], [-27.75, 38.54], [-28.05, 38.6], [-28.32, 38.67]], // São Jorge
  [[-28.07, 39.09], [-27.95, 39.09], [-27.94, 39.01], [-28.03, 39.01]], // Graciosa
  [[-27.38, 38.75], [-27.2, 38.8], [-27.05, 38.75], [-27.06, 38.66], [-27.22, 38.64], [-27.37, 38.68]], // Terceira
  [[-25.86, 37.86], [-25.6, 37.83], [-25.45, 37.84], [-25.2, 37.86], [-25.13, 37.8], [-25.2, 37.73], [-25.45, 37.71], [-25.7, 37.74], [-25.85, 37.8]], // São Miguel
  [[-25.17, 37.01], [-25.03, 37.01], [-25.01, 36.93], [-25.15, 36.93]], // Santa Maria
];
const MADEIRA = [
  [[-17.27, 32.8], [-17.1, 32.87], [-16.9, 32.86], [-16.7, 32.75], [-16.68, 32.72], [-16.9, 32.64], [-17.1, 32.66], [-17.25, 32.72]], // Madeira
  [[-16.42, 33.07], [-16.3, 33.1], [-16.28, 33.04], [-16.38, 33.02]], // Porto Santo
];
// Madeira at the mainland's scale; the Azores spread over 600 km, so they are drawn smaller.
const pxPerDeg = base([-8, 39])[1] - base([-8, 40])[1];
const INSETS = {
  acores: { at: [50, 438], lon0: -31.45, lat0: 39.85, latc: 38.5, k: 0.7, box: [[-31.6, 39.97], [-24.85, 39.97], [-24.85, 36.8], [-31.6, 36.8], [-31.6, 39.97]] },
  madeira: { at: [96, 528], lon0: -17.4, lat0: 33.3, latc: 33, k: 1, box: [[-17.4, 33.3], [-16.15, 33.3], [-16.15, 32.52], [-17.4, 32.52], [-17.4, 33.3]] },
};
const insetOf = ([lon, lat]) => (lon < -20 ? INSETS.acores : lon < -13 ? INSETS.madeira : null);
const insetPx = (ins, [lon, lat]) => [
  ins.at[0] + (lon - ins.lon0) * Math.cos((ins.latc * Math.PI) / 180) * pxPerDeg * ins.k,
  ins.at[1] + (ins.lat0 - lat) * pxPerDeg * ins.k,
];

// ── frame ─────────────────────────────────────────────────────────────
const frame = { x0: 38, x1: 244, y0: 428, y1: 578 };
const WIDTH = 600;
const scale = WIDTH / (frame.x1 - frame.x0);
const HEIGHT = Math.ceil((frame.y1 - frame.y0) * scale);
const toOut = ([x, y]) => [(x - frame.x0) * scale, (y - frame.y0) * scale];
// West of 13° W is an island.
const P = (ll) => {
  const ins = insetOf(ll);
  return toOut(ins ? insetPx(ins, ll) : base(ll));
};
const Pr = (ll) => P(ll).map(r1);

const inFrame = (ring) => ring.some(([x, y]) => x >= frame.x0 && x <= frame.x1 && y >= frame.y0 && y <= frame.y1);
const soft = (ring) => smooth(smooth(ring));
const landPath = others.filter(inFrame).map((r) => ringPath(soft(r).map(toOut))).join("");
const portugalPaths = portugal.map((r) => ringPath(soft(r).map(toOut))).join("");
const islandPaths = (list) => list.map((r) => ringPath(soft(r).map(P))).join("");
const azoresPaths = islandPaths(AZORES);
const madeiraPaths = islandPaths(MADEIRA);

// ── the areas (lon, lat): shared borders first ────────────────────────
const N = 42.7; // north of the Minho river
const S = 36.5; // south of the Algarve coast
const W = -10.3; // west of every coast
const E = -5.8; // east of the frontier
// Minho | Trás-os-Montes: roughly the Gerês and Marão hills, down to the Douro.
const montes = [[-8.05, N], [-8.05, 42.1], [-7.95, 41.8], [-7.85, 41.5], [-7.9, 41.15]];
// The Douro, west to east.
const douro = [[W, 41.05], [-8.6, 41.08], [-8.2, 41.1], [-7.9, 41.15], [-7.5, 41.15], [-7, 41.05], [-6.6, 41], [E, 41]];
// The Beiras | Lisbon and the Alentejo: from the coast near Leiria to the Tagus, then up the Tagus.
const beiraSouth = [[W, 39.85], [-8.9, 39.85], [-8.5, 39.65], [-8.2, 39.46], [-7.95, 39.5], [-7.67, 39.65], [-7.5, 39.66], [E, 39.66]];
// Lisbon and the Ribatejo | the Alentejo: from the Tagus at Abrantes to the coast south of Setúbal.
const lisboaEast = [[-8.2, 39.46], [-8.35, 39.1], [-8.5, 38.8], [-8.65, 38.55], [-8.85, 38.46], [W, 38.42]];
// The Alentejo | the Algarve: the hills of Monchique and Caldeirão.
const algarveNorth = [[W, 37.38], [-8.8, 37.38], [-8.3, 37.35], [-7.9, 37.38], [-7.5, 37.5], [E, 37.55]];
const rev = (a) => [...a].reverse();

const SHAPES = {
  minho: [[W, N], ...montes, ...rev(douro.slice(0, 3))],
  transmontano: [...montes, ...douro.slice(4), [E, N]],
  beiras: [...douro, ...rev(beiraSouth)],
  lisboa: [...beiraSouth.slice(0, 4), ...lisboaEast.slice(1)],
  alentejo: [...beiraSouth.slice(3), ...rev(algarveNorth), ...rev(lisboaEast).slice(0, -1)],
  algarve: [...algarveNorth, [E, S], [W, S]],
};
const ISLANDS = { acores: azoresPaths, madeira: madeiraPaths };
for (const r of data.regions) if (!SHAPES[r.id] && !ISLANDS[r.id]) throw new Error("no shape for " + r.id);
const dialects = Object.fromEntries(data.regions.map((r) => [r.id, ISLANDS[r.id] ?? ringPath(SHAPES[r.id].map(P))]));

const out = {
  _comment: "Generated by scripts/generate-dialekte-karte.mjs from the Natural Earth outlines (public domain) of the old Europe view; inner borders, the Azores and Madeira are hand-drawn and rough. Do not edit by hand. The Azores (reduced) and Madeira are drawn in inset boxes. `swiss` is empty (no other language area is hatched on this map); `benrath` is the line of the b/v merger, `speyer` the line where ei becomes ê.",
  w: WIDTH,
  h: HEIGHT,
  land: landPath,
  mask: portugalPaths + azoresPaths + madeiraPaths,
  swiss: "",
  states: linePath(INSETS.acores.box.map(P)) + linePath(INSETS.madeira.box.map(P)),
  borders: "",
  coast: portugalPaths + azoresPaths + madeiraPaths,
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
for (const [k, [x, y]] of Object.entries({ ...out.labels, ...out.markers, ...out.others })) {
  if (x < 0 || y < 0 || x > WIDTH || y > HEIGHT) console.log("OUTSIDE", k, x, y);
}

// Self-check: every point of the mainland falls in exactly one area.
let bad = 0, n = 0;
const rings = Object.fromEntries(Object.entries(SHAPES).map(([id, sh]) => [id, sh.map(P)]));
for (let x = 0; x < WIDTH; x += 3) for (let y = 0; y < HEIGHT; y += 3) {
  const src = [x / scale + frame.x0, y / scale + frame.y0];
  if (!portugal.some((r) => contains(r, src))) continue;
  n++;
  const hits = Object.keys(rings).filter((id) => contains(rings[id], [x, y]));
  if (hits.length !== 1) { bad++; if (bad < 12) console.log("partition", x, y, hits.join(",") || "none"); }
}
console.log("partition check:", n, "points,", bad, "bad");
if (bad > n * 0.002) throw new Error("areas do not partition Portugal");
