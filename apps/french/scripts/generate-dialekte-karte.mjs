// Map geometry for /knowledge/accents (varieties of Spanish in Spain) — run once, output committed.
//
//   node scripts/generate-dialekte-karte.mjs
//
// No packages and no network: the coast comes from the Natural Earth outlines committed in the
// old Europe view (see karte-geo.mjs). It writes src/data/dialekte-karte.json: land around Spain,
// Spain's outline as `mask`, one <path d> per accent area, the Canary Islands in an inset box,
// the two sound lines and the label and marker positions from src/data/dialekte.json.
//
// The areas are hand-drawn on purpose. Each one follows the borders of its autonomous communities
// only roughly and runs generously past the coast and the frontier; the page clips them to `mask`
// with an SVG clipPath, so only the inner borders matter. Neighbouring areas share the vertices
// below, so they fit without gaps. The Natural Earth Canary Islands are not in the old file
// (its Europe view stops at 35.6° N and the 1:110 m world view has no such small islands), so
// CANARIES is drawn by hand too, from their real coordinates.
//
// If Natural Earth subunits can be installed one day (world-atlas, or the admin-1 file for the
// real province borders), replace SHAPES and CANARIES; dialekte.json need not change.
//
// The English version (UK and Ireland, with polygon clipping): git show edf6596:scripts/generate-dialekte-karte.mjs
import fs from "node:fs";
import { loadSource, parseRings, contains, europeProjection, smooth, ringPath, linePath, r1 } from "./karte-geo.mjs";

const data = JSON.parse(fs.readFileSync("src/data/dialekte.json", "utf8"));
const source = loadSource().europe;
const base = europeProjection(source.w, source.h);

// ── rings ─────────────────────────────────────────────────────────────
const allRings = [...parseRings(source.land), ...Object.values(source.countries).flatMap(parseRings)];
const SPAIN_SEEDS = [[-3.7, 40.4], [3, 39.6], [4.1, 40], [1.4, 39], [1.45, 38.7]];
const spain = allRings.filter((r) => SPAIN_SEEDS.some((s) => contains(r, base(s))));
if (spain.length !== SPAIN_SEEDS.length) throw new Error(`Spain: ${spain.length} rings, expected ${SPAIN_SEEDS.length}`);
const others = allRings.filter((r) => !spain.includes(r));

// ── the Canary Islands, moved into a box in the Atlantic ──────────────
const CANARIES = [
  [[-18.16, 27.76], [-17.98, 27.82], [-17.88, 27.8], [-17.98, 27.64], [-18.12, 27.7]],
  [[-17.97, 28.85], [-17.78, 28.84], [-17.72, 28.7], [-17.77, 28.55], [-17.84, 28.46], [-17.93, 28.62]],
  [[-17.34, 28.14], [-17.2, 28.2], [-17.1, 28.1], [-17.2, 28.02], [-17.32, 28.06]],
  [[-16.92, 28.36], [-16.6, 28.4], [-16.32, 28.57], [-16.13, 28.57], [-16.38, 28.35], [-16.52, 28.05], [-16.7, 28.01], [-16.84, 28.22]],
  [[-15.7, 28.16], [-15.4, 28.18], [-15.36, 27.95], [-15.58, 27.74], [-15.8, 27.83], [-15.83, 28]],
  [[-14.01, 28.72], [-13.85, 28.75], [-13.83, 28.42], [-14.02, 28.2], [-14.33, 28.05], [-14.5, 28.09], [-14.22, 28.22], [-14, 28.42]],
  [[-13.86, 28.87], [-13.55, 28.95], [-13.42, 29.15], [-13.5, 29.24], [-13.73, 29.1]],
];
// Same scale as the mainland, so the islands are not drawn larger than they are.
const pxPerDeg = base([-5, 40])[1] - base([-5, 41])[1];
const INSET_AT = [30, 548]; // source pixels of lon -18.3, lat 29.5
const insetPx = ([lon, lat]) => [
  INSET_AT[0] + (lon + 18.3) * Math.cos((28.5 * Math.PI) / 180) * pxPerDeg,
  INSET_AT[1] + (29.5 - lat) * pxPerDeg,
];
const INSET_BOX = [[-18.45, 29.65], [-13.2, 29.65], [-13.2, 27.5], [-18.45, 27.5], [-18.45, 29.65]];

// ── frame ─────────────────────────────────────────────────────────────
// The bottom edge is the old view's own (600), where Morocco is cut off anyway.
const frame = { x0: INSET_AT[0] - 10, x1: 402, y0: 372, y1: source.h };
const WIDTH = 760;
const scale = WIDTH / (frame.x1 - frame.x0);
const HEIGHT = Math.ceil((frame.y1 - frame.y0) * scale);
const toOut = ([x, y]) => [(x - frame.x0) * scale, (y - frame.y0) * scale];
// Latitudes south of 31° are the islands.
const P = (ll) => toOut(ll[1] < 31 ? insetPx(ll) : base(ll));
const Pr = (ll) => P(ll).map(r1);

const inFrame = (ring) => ring.some(([x, y]) => x >= frame.x0 && x <= frame.x1 && y >= frame.y0 && y <= frame.y1);
const soft = (ring) => smooth(smooth(ring));
const landPath = others.filter(inFrame).map((r) => ringPath(soft(r).map(toOut))).join("");
const spainPaths = spain.map((r) => ringPath(soft(r).map(toOut))).join("");
const canaryPaths = CANARIES.map((r) => ringPath(soft(r).map(P))).join("");

// ── the areas (lon, lat): shared borders first ────────────────────────
const COAST_N = 44.6; // north of every north coast
const SOUTH = 35; // south of every south coast
const galiciaEast = [[-7.05, 43.55], [-6.9, 43.1], [-6.85, 42.6], [-6.85, 42.1], [-6.75, 41.7]];
const asturiasSouth = [[-6.9, 43.1], [-6.2, 43], [-5.5, 43.05], [-4.85, 43.15], [-4.5, 43], [-4.2, 42.85], [-3.9, 42.8], [-3.75, 43], [-3.4, 43.15]];
const basqueWest = [[-3.4, 43.15], [-3.3, 43.1], [-3.25, 42.9], [-3, 42.6], [-2.85, 42.55], [-2.45, 42.5], [-2, 42.35], [-1.9, 41.95]];
const navarreEast = [[-1.9, 41.95], [-1.4, 41.95], [-1.1, 42.15], [-1, 42.45], [-1.05, 42.7], [-0.8, 42.95], [-0.75, 43.6]];
const aragonWest = [[-1.9, 41.95], [-2.05, 41.5], [-2, 41.15]];
const aragonSouth = [[-2, 41.15], [-1.8, 40.7], [-1.7, 40.35], [-1.35, 40.1], [-1.1, 40], [-0.85, 40.05], [-0.55, 40.25], [-0.2, 40.35], [-0.2, 40.75], [0.15, 40.8]];
const catalanWest = [[0.15, 40.8], [0.25, 41], [0.2, 41.3], [0.3, 41.6], [0.4, 42], [0.7, 42.4], [0.7, 42.85], [0.7, 43.6]];
const catalanSouth = [[0.15, 40.8], [0.4, 40.6], [0.52, 40.52], [1, 40.52]];
const manchaNorth = [[-2, 41.15], [-3.05, 41.2], [-3.05, 40.95], [-3.2, 40.6], [-3.05, 40.25], [-3.4, 40.05], [-3.75, 40.2], [-4.2, 40.2], [-4.55, 40.2], [-5, 40.15], [-5.35, 40.1]];
const extremaduraNorth = [[-5.35, 40.1], [-5.75, 40.25], [-6.1, 40.35], [-6.8, 40.25], [-7.6, 40.25]];
const extremaduraEast = [[-5.35, 40.1], [-5.35, 39.9], [-5.2, 39.45], [-5.05, 39.3], [-5.1, 38.85], [-4.9, 38.65]];
const extremaduraSouth = [[-4.9, 38.65], [-5.5, 38.4], [-5.85, 38.15], [-6.4, 38], [-7, 38.1], [-7.6, 38.1]];
const manchaSouth = [[-4.9, 38.65], [-4.25, 38.4], [-4, 38.4], [-3.3, 38.4], [-2.75, 38.35], [-2.35, 38.02]];
const manchaEast = [[-1.35, 40.1], [-1.15, 39.95], [-1.25, 39.6], [-1.4, 39.35], [-1.2, 39], [-1.03, 38.85], [-1, 38.65]];
const murciaNorth = [[-2.35, 38.02], [-2, 38.35], [-1.65, 38.45], [-1.4, 38.6], [-1, 38.65]];
const murciaEast = [[-1, 38.65], [-1, 38.3], [-1.05, 38], [-0.75, 37.85], [-0.2, 37.85]];
const murciaWest = [[-2.35, 38.02], [-2.15, 37.6], [-1.95, 37.4], [-1.65, 37.35], [-1.6, SOUTH]];
const andaluciaSplit = [[-4.25, 38.4], [-4.25, 37.9], [-4, 37.4], [-4.25, 37.2], [-4.15, 37.05], [-3.95, 36.75], [-3.8, SOUTH]];
const rev = (a) => [...a].reverse();

const SHAPES = {
  galicia: [[-10.5, COAST_N], [-7.05, COAST_N], ...galiciaEast, [-10.5, 41.7]],
  asturias: [[-7.05, COAST_N], [-3.15, COAST_N], [-3.15, 43.35], ...rev(asturiasSouth), [-7.05, 43.55]],
  euskadi: [[-3.15, COAST_N], [-0.75, COAST_N], ...rev(navarreEast), ...rev(basqueWest), [-3.15, 43.35]],
  aragon: [...navarreEast, ...rev(catalanWest), ...rev(aragonSouth), ...rev(aragonWest)],
  catalunya: [...catalanWest, [5, 43.6], [5, 37.5], [1, 37.5], [1, 40.52], ...rev(catalanSouth)],
  centro: [
    ...galiciaEast.slice(1), [-7.6, 41.7], ...rev(extremaduraNorth),
    ...rev(manchaNorth).slice(1), ...rev(aragonWest).slice(1), ...rev(basqueWest).slice(1), ...rev(asturiasSouth).slice(1),
  ],
  mancha: [...manchaNorth, ...extremaduraEast.slice(1), ...manchaSouth.slice(1), ...murciaNorth.slice(1), ...rev(manchaEast).slice(1), ...rev(aragonSouth.slice(1, 3))],
  extremadura: [...extremaduraNorth, [-7.6, 38.1], ...rev(extremaduraSouth).slice(1), ...rev(extremaduraEast).slice(1)],
  valencia: [...catalanSouth, [1, 37.85], ...rev(murciaEast), ...rev(manchaEast).slice(1), ...aragonSouth.slice(4)],
  murcia: [...murciaNorth, ...murciaEast.slice(1), [-0.2, SOUTH], [-1.6, SOUTH], ...rev(murciaWest).slice(1)],
  andaluciaoc: [...extremaduraSouth, [-7.6, SOUTH], [-3.8, SOUTH], ...rev(andaluciaSplit).slice(1, -1), [-4.25, 38.4]],
  andaluciaor: [[-4.25, 38.4], [-4, 38.4], [-3.3, 38.4], [-2.75, 38.35], ...murciaWest, ...rev(andaluciaSplit).slice(0, -1)],
};
for (const r of data.regions) if (r.id !== "canarias" && !SHAPES[r.id]) throw new Error("no shape for " + r.id);
const dialects = Object.fromEntries(data.regions.map((r) => [
  r.id,
  r.id === "canarias" ? canaryPaths : ringPath(SHAPES[r.id].map(P)),
]));

const out = {
  _comment: "Generated by scripts/generate-dialekte-karte.mjs from the Natural Earth outlines (public domain) of the old Europe view; inner borders and the Canary Islands are hand-drawn and rough. Do not edit by hand. The Canary Islands are drawn in an inset box. `swiss` is empty (no other language area is hatched on this map); `benrath` is the line of weak final s, `speyer` the line of seseo and ceceo.",
  w: WIDTH,
  h: HEIGHT,
  land: landPath,
  mask: spainPaths + canaryPaths,
  swiss: "",
  states: linePath(INSET_BOX.map(P)),
  borders: "",
  coast: spainPaths + canaryPaths,
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

// Self-check: every point of Spain's mainland and islands falls in exactly one area.
const inside = (ring, [x, y]) => contains(ring, [x, y]);
let bad = 0, n = 0;
const rings = Object.fromEntries(Object.entries(SHAPES).map(([id, sh]) => [id, sh.map(P)]));
for (let x = 0; x < WIDTH; x += 4) for (let y = 0; y < HEIGHT; y += 4) {
  const src = [x / scale + frame.x0, y / scale + frame.y0];
  if (!spain.some((r) => contains(r, src))) continue;
  n++;
  const hits = Object.keys(rings).filter((id) => inside(rings[id], [x, y]));
  if (hits.length !== 1) { bad++; if (bad < 12) console.log("partition", x, y, hits.join(",") || "none"); }
}
console.log("partition check:", n, "points,", bad, "bad");
if (bad > n * 0.002) throw new Error("areas do not partition Spain");
