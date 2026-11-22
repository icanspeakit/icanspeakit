// Map geometry for /knowledge/accents (regional accents of French in France) — run once, output committed.
//
//   node scripts/generate-dialekte-karte.mjs
//
// No packages and no network: the coast comes from the Natural Earth outlines committed in the
// old Europe view (see karte-geo.mjs), whose projection is centred on France (4° E, 48° N), so
// France and Corsica are drawn at 1:50 m. It writes src/data/dialekte-karte.json: land around
// France, France's outline (mainland and Corsica) as `mask`, one <path d> per accent area, the
// two lines and the label and marker positions from src/data/dialekte.json.
//
// The areas are hand-drawn on purpose. Each one follows the borders of its regions and
// départements only roughly and runs generously past the coast and the frontier; the page clips
// them to `mask` with an SVG clipPath, so only the inner borders matter. Neighbouring areas
// share the vertex lists below, so they fit without gaps.
//
// If Natural Earth admin-1 outlines can be installed one day, replace SHAPES; dialekte.json need
// not change. The Spanish version (Spain with the Canary Islands in an inset box) is in the git
// history of this file in apps/spanish.
import fs from "node:fs";
import { loadSource, parseRings, contains, europeProjection, smooth, ringPath, linePath, r1 } from "./karte-geo.mjs";

const data = JSON.parse(fs.readFileSync("src/data/dialekte.json", "utf8"));
const source = loadSource().europe;
const base = europeProjection(source.w, source.h);

// ── rings ─────────────────────────────────────────────────────────────
const allRings = [...parseRings(source.land), ...Object.values(source.countries).flatMap(parseRings)];
const FRANCE_SEEDS = [[2.5, 46.5], [9.1, 42.1]]; // mainland, Corsica
const france = allRings.filter((r) => FRANCE_SEEDS.some((s) => contains(r, base(s))));
if (france.length !== FRANCE_SEEDS.length) throw new Error(`France: ${france.length} rings, expected ${FRANCE_SEEDS.length}`);
const others = allRings.filter((r) => !france.includes(r));

// ── frame ─────────────────────────────────────────────────────────────
// From the Channel coast of England to the south tip of Corsica, in the old view's pixels.
const frame = { x0: 228, x1: 502, y0: 230, y1: 480 };
const WIDTH = 760;
const scale = WIDTH / (frame.x1 - frame.x0);
const HEIGHT = Math.ceil((frame.y1 - frame.y0) * scale);
const toOut = ([x, y]) => [(x - frame.x0) * scale, (y - frame.y0) * scale];
const P = (ll) => toOut(base(ll));
const Pr = (ll) => P(ll).map(r1);

const inFrame = (ring) => ring.some(([x, y]) => x >= frame.x0 && x <= frame.x1 && y >= frame.y0 && y <= frame.y1);
const soft = (ring) => smooth(smooth(ring));
// The neighbours' rings reach across Europe: clamp their points to a box a little larger than
// the frame and drop the runs that collapse onto its edge, so the page ships no hidden coast.
const M = 12;
const clampRing = (ring) => {
  const c = ring.map(([x, y]) => [
    Math.min(frame.x1 + M, Math.max(frame.x0 - M, x)),
    Math.min(frame.y1 + M, Math.max(frame.y0 - M, y)),
  ]);
  const onEdge = ([x, y]) => x === frame.x0 - M || x === frame.x1 + M || y === frame.y0 - M || y === frame.y1 + M;
  return c.filter((p, i) => {
    const a = c[(i - 1 + c.length) % c.length], b = c[(i + 1) % c.length];
    return !(onEdge(p) && onEdge(a) && onEdge(b) && (a[0] === p[0] && b[0] === p[0] || a[1] === p[1] && b[1] === p[1]));
  });
};
const landPath = others.filter(inFrame).map((r) => ringPath(clampRing(soft(r)).map(toOut))).join("");
const francePaths = france.map((r) => ringPath(soft(r).map(toOut))).join("");

// ── the areas (lon, lat): shared borders first ────────────────────────
const N = 52.2; // north of everything
const S = 41.0; // south of Corsica and the Pyrenees
const W = -6.5;
const E = 10.2;
const rev = (a) => [...a].reverse();

// Junctions where three areas meet.
const P1 = [1.5, 49.15]; // Paris, Nord, Ouest
const P2 = [3.5, 49.1]; // Paris, Nord, Est
const P3 = [3.55, 48.4]; // Paris, Est
const P4 = [3.0, 48.1]; // Paris, Est, Ouest
const P5 = [1.55, 48.3];
const P6 = [1.45, 48.8];
const J1 = [3.0, 46.75]; // Ouest, Est, Centre
const J2 = [4.0, 46.3]; // Est, Centre, Lyon
const J3 = [0.7, 45.95]; // Ouest, Centre, Sud-Ouest
const J4 = [3.0, 44.7]; // Centre, Sud-Ouest, Provence
const J5 = [4.3, 45.0]; // Centre, Lyon, Provence
const J6 = [1.75, 42.85]; // Sud-Ouest, Provence, Roussillon

const nordWest = [[0.6, N], [0.6, 50.4], [1.38, 50.06], [1.75, 49.7], [1.7, 49.25], P1];
const estNord = [[4.25, N], [4.2, 49.95], [4.0, 49.4], P2];
const ouestParis = [P1, P6, P5, P4];
const ouestEst = [P4, [3.1, 47.6], [3.0, 47.0], J1];
const ouestCentre = [J1, [2.6, 46.55], [2.0, 46.4], [1.2, 46.3], [0.85, 46.1], J3];
const ouestSud = [J3, [0.2, 45.8], [-0.4, 45.65], [-1.2, 45.6], [-2.7, 45.6]];
const bretagneEast = [[-2.0, 49.6], [-1.75, 48.75], [-1.5, 48.63], [-1.07, 48.5], [-1.0, 48.0], [-1.2, 47.75], [-1.8, 47.65], [-2.1, 47.5], [-2.45, 47.45], [-2.7, 47.0]];
// The Vosges crest, north to south.
const alsaceWest = [[7.65, 49.25], [7.55, 49.05], [7.3, 48.95], [7.05, 48.85], [7.15, 48.55], [7.05, 48.3], [6.95, 48.0], [6.85, 47.8], [6.85, 47.62], [7.0, 47.45], [7.0, 47.0]];
const estCentre = [J1, [3.7, 46.65], J2];
const lyonEst = [J2, [4.8, 46.25], [5.45, 46.3], [5.9, 46.2], [6.05, 46.4], [7.5, 46.6], [8.3, 46.6]];
const lyonCentre = [J2, [3.8, 45.95], [3.7, 45.55], [3.95, 45.25], J5];
const centreSud = [J3, [0.9, 45.5], [1.3, 45.15], [1.6, 44.95], [2.1, 44.85], [2.5, 44.65], J4];
const centreProv = [J4, [3.9, 44.75], J5];
const lyonProv = [J5, [4.85, 45.0], [5.5, 44.8], [5.9, 44.8], [6.35, 45.05], [7.2, 45.15], [8.3, 45.2]];
const sudProv = [J4, [3.25, 44.2], [2.95, 43.7], [2.55, 43.4], [1.95, 43.2], J6];
const roussNorth = [J6, [2.0, 42.85], [2.5, 42.9], [3.0, 42.95], [3.5, 42.95]];
const roussWest = [J6, [1.7, 42.5], [1.7, S]];
const basque = [[-2.7, 43.55], [-1.0, 43.55], [-0.5, 43.6], [-0.05, 43.55], [-0.1, 43.2], [0.0, 42.9], [0.0, S]];
const CORSE_W = 8.3; // the sea between the Riviera and Corsica
const CORSE_N = 43.3;

const SHAPES = {
  paris: [P1, P2, P3, P4, P5, P6],
  nord: [[0.6, N], ...estNord, ...rev(nordWest).slice(0, -1)],
  ouest: [
    ...nordWest, ...ouestParis.slice(1), ...ouestEst.slice(1), ...ouestCentre.slice(1), ...ouestSud.slice(1),
    ...rev(bretagneEast), [-2.0, N],
  ],
  bretagne: [...bretagneEast, [W, 47.0], [W, 49.6]],
  est: [
    [4.25, N], [7.65, N], ...alsaceWest, [7.5, 46.6], ...rev(lyonEst).slice(2), ...estCentre.slice(1, -1).reverse(), J1,
    ...rev(ouestEst).slice(1), P3, P2, ...rev(estNord).slice(1, -1),
  ],
  alsace: [...alsaceWest, [E, 47.0], [E, 49.25]],
  centre: [...ouestCentre, ...centreSud.slice(1), ...centreProv.slice(1), ...rev(lyonCentre).slice(1), ...rev(estCentre).slice(1, -1)],
  lyon: [...lyonEst, [8.3, 45.2], ...rev(lyonProv).slice(1), ...rev(lyonCentre).slice(1, -1)],
  provence: [...centreProv, ...lyonProv.slice(1), [CORSE_W, 45.2], [CORSE_W, S], [3.5, S], ...rev(roussNorth), ...rev(sudProv).slice(1, -1)],
  roussillon: [...roussNorth, [3.5, S], ...rev(roussWest).slice(0, -1)],
  sudouest: [...rev(ouestSud), ...centreSud.slice(1), ...sudProv.slice(1), ...roussWest.slice(1), ...rev(basque)],
  paysbasque: [...basque, [-2.7, S]],
  corse: [[CORSE_W, CORSE_N], [E, CORSE_N], [E, S], [CORSE_W, S]],
};
for (const r of data.regions) if (!SHAPES[r.id]) throw new Error("no shape for " + r.id);
const dialects = Object.fromEntries(data.regions.map((r) => [r.id, ringPath(SHAPES[r.id].map(P))]));

const out = {
  _comment: "Generated by scripts/generate-dialekte-karte.mjs from the Natural Earth outlines (public domain) of the old Europe view; inner borders are hand-drawn and rough. Do not edit by hand. `swiss` and `states` are empty (nothing else is hatched or boxed on this map); `benrath` is the oïl/oc line, `speyer` the Breton language line.",
  w: WIDTH,
  h: HEIGHT,
  land: landPath,
  mask: francePaths,
  swiss: "",
  states: "",
  borders: "",
  coast: francePaths,
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

// Self-check: every point of France (mainland and Corsica) falls in exactly one area.
let bad = 0, n = 0;
const rings = Object.fromEntries(Object.entries(SHAPES).map(([id, sh]) => [id, sh.map(P)]));
for (let x = 0; x < WIDTH; x += 3) for (let y = 0; y < HEIGHT; y += 3) {
  const src = [x / scale + frame.x0, y / scale + frame.y0];
  if (!france.some((r) => contains(r, src))) continue;
  n++;
  const hits = Object.keys(rings).filter((id) => contains(rings[id], [x, y]));
  if (hits.length !== 1) { bad++; if (bad < 12) console.log("partition", x, y, hits.join(",") || "none"); }
}
console.log("partition check:", n, "points,", bad, "bad");
if (bad > n * 0.002) throw new Error("areas do not partition France");

// Every label and marker should sit inside France or its own area.
for (const r of data.regions) {
  const pt = P(r.label);
  if (!contains(rings[r.id], pt)) console.log("label outside its area:", r.id);
}
for (const m of data.markers) {
  const src = base(m.at);
  if (!france.some((r) => contains(r, src))) console.log("marker outside France:", m.id);
}
