// Map geometry for /knowledge/accents (accents of English in the UK and Ireland) — run once,
// output committed.
//
// Builds the UK (England, Scotland, Wales, Northern Ireland) and Ireland from Natural Earth
// map subunits, cuts them into accent areas with the hand-drawn outlines below, and writes
// src/data/dialekte-karte.json: pre-projected <path d> per accent area, neighbours (Isle of
// Man, France, Norway …) as grey land, the borders between the nations, the UK–Ireland
// border, the coast, the FOOT–STRUT (`benrath`) and TRAP–BATH (`speyer`) lines, and the
// label/marker positions from src/data/dialekte.json.
//
// Shetland lies far north of the rest; to keep the map from getting very tall it is moved
// into a box in the North Sea (SHETLAND_SHIFT), like an inset on a printed map.
//
// The outlines are deliberately rough: each is drawn generously past the coasts, clipped to
// the land and to what earlier entries already took, so only the inner borders matter. The
// last entry of each nation is the catch-all for the rest of it.
//
// The geo packages are not dependencies of the site. To re-run:
//   mkdir /tmp/geo && cd /tmp/geo && npm i world-atlas@2 d3-geo@3 topojson-client@3 topojson-server@3 polygon-clipping@0.15
//   curl -o /tmp/geo/subunits10.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_subunits.geojson
//   node scripts/generate-dialekte-karte.mjs /tmp/geo
// (the argument is the folder holding node_modules and subunits10.geojson).
//
// The German version (D-A-CH dialects, used by scripts/generate-bier-karte.mjs) is in git:
//   git show e3dffc9:scripts/generate-dialekte-karte.mjs
import fs from "fs";
import { createRequire } from "module";
import path from "path";
const GEO = path.resolve(process.argv[2] || "/tmp/geo");
const require = createRequire(GEO + "/");
const { geoPath, geoAzimuthalEqualArea } = require("d3-geo");
const { feature, mesh } = require("topojson-client");
const { topology } = require("topojson-server");
const pc = require("polygon-clipping");

const data = JSON.parse(fs.readFileSync("src/data/dialekte.json", "utf8"));
const sub = JSON.parse(fs.readFileSync(path.join(GEO, "subunits10.geojson"), "utf8"));
const world = JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8"));

// ── helpers ───────────────────────────────────────────────────────────
const asMulti = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const union = (...gs) => gs.filter((g) => g && g.length).reduce((a, b) => pc.union(a, b));
const poly = (pts) => [[[...pts, pts[0]]]];

// Shetland: every polygon north of 59.45° moves by this (lon, lat) offset.
const SHETLAND_SHIFT = [2.45, -1.75];
const SHETLAND_BOX = [[0.35, 57.65], [2.2, 59.2]];
const shiftShetland = (mpoly) => mpoly.map((p) =>
  p[0].some(([, y]) => y > 59.45) ? p.map((r) => r.map(([x, y]) => [x + SHETLAND_SHIFT[0], y + SHETLAND_SHIFT[1]])) : p);
const shiftPt = ([x, y]) => (y > 59.45 ? [x + SHETLAND_SHIFT[0], y + SHETLAND_SHIFT[1]] : [x, y]);

const NATIONS = { ENG: "England", SCT: "Scotland", WLS: "Wales", NIR: "Northern Ireland", IRL: "Ireland" };
const nationFeatures = Object.keys(NATIONS).map((su) => {
  const f = sub.features.find((x) => x.properties.SU_A3 === su);
  if (!f) throw new Error("missing subunit " + su);
  // Rockall (13.7° W) would widen the frame by a third: left out.
  const polys = asMulti(f.geometry).filter((p) => !p[0].every(([x]) => x < -11));
  return { type: "Feature", properties: { su }, geometry: { type: "MultiPolygon", coordinates: shiftShetland(polys) } };
});
const N = Object.fromEntries(nationFeatures.map((f) => [f.properties.su, f.geometry.coordinates]));
const MASK = union(...Object.values(N));

// ── accent outlines (lon, lat) ────────────────────────────────────────
// Each shape is intersected with one nation (or two, for Ulster), so the outlines only
// need to be right inside it.
const SHAPES = {
  // Scotland
  northernisles: [N.SCT, poly([[-4, 58.68], [3, 58.68], [3, 61], [-4, 61]])],
  northeastscotland: [N.SCT, poly([[-3.6, 58.68], [-3.35, 57.75], [-3.3, 57.5], [-3.15, 57.1], [-2.9, 56.95], [-2.4, 56.85], [-2.0, 56.75], [0, 56.7], [0, 58.68]])],
  highlands: [N.SCT, poly([[-8, 58.68], [-3.6, 58.68], [-3.35, 57.75], [-3.3, 57.5], [-3.15, 57.1], [-2.9, 56.95], [-3.5, 56.75], [-4.2, 56.55], [-4.75, 56.25], [-5.2, 56.0], [-5.6, 55.7], [-8, 55.7]])],
  lowlands: [N.SCT, poly([[-8, 54.5], [0, 54.5], [0, 61], [-8, 61]])],
  // North of England
  northeast: [N.ENG, poly([[-2.55, 56], [-2.65, 55.2], [-2.35, 54.95], [-2.2, 54.75], [-2.1, 54.55], [-1.75, 54.45], [-1.45, 54.42], [-1.0, 54.45], [-0.75, 54.55], [0, 54.6], [0, 56]])],
  cumbria: [N.ENG, poly([[-4, 55.3], [-2.65, 55.2], [-2.35, 54.95], [-2.2, 54.75], [-2.1, 54.55], [-2.3, 54.35], [-2.55, 54.2], [-2.85, 54.15], [-3.2, 54.05], [-4, 54.05]])],
  northwest: [N.ENG, poly([[-4, 54.05], [-3.2, 54.05], [-2.85, 54.15], [-2.55, 54.2], [-2.3, 54.0], [-2.05, 53.8], [-2.0, 53.55], [-2.05, 53.35], [-2.3, 53.3], [-2.75, 53.3], [-3.1, 53.25], [-4, 53.25]])],
  yorkshire: [N.ENG, poly([[-2.55, 54.2], [-2.3, 54.35], [-2.1, 54.55], [-1.75, 54.45], [-1.45, 54.42], [-1.0, 54.45], [-0.75, 54.55], [0.5, 54.6], [0.5, 53.6], [-0.5, 53.55], [-0.9, 53.45], [-1.3, 53.35], [-1.65, 53.3], [-2.0, 53.55], [-2.05, 53.8], [-2.3, 54.0]])],
  // Midlands
  eastmidlands: [N.ENG, poly([[-2.0, 53.55], [-1.65, 53.3], [-1.3, 53.35], [-0.9, 53.45], [-0.5, 53.55], [0.5, 53.6], [0.4, 52.95], [0.1, 52.8], [-0.45, 52.6], [-0.75, 52.3], [-1.05, 52.1], [-1.3, 52.3], [-1.6, 52.55], [-1.75, 52.85], [-1.85, 53.1]])],
  westmidlands: [N.ENG, poly([[-3.3, 53.3], [-2.75, 53.3], [-2.3, 53.3], [-2.05, 53.35], [-2.0, 53.55], [-1.85, 53.1], [-1.75, 52.85], [-1.6, 52.55], [-1.3, 52.3], [-1.05, 52.1], [-1.6, 51.95], [-2.1, 51.95], [-2.6, 51.9], [-3.3, 51.85]])],
  // South of England
  eastanglia: [N.ENG, poly([[0.4, 52.95], [0.1, 52.8], [-0.45, 52.6], [-0.3, 52.3], [0.1, 52.05], [0.6, 51.95], [1.3, 51.85], [2.5, 51.85], [2.5, 53.2]])],
  southwest: [N.ENG, poly([[-6.5, 51.9], [-2.6, 51.9], [-2.1, 51.95], [-1.95, 51.7], [-2.0, 51.3], [-1.95, 51.0], [-1.95, 50.6], [-1.9, 49.8], [-6.5, 49.8]])],
  southeast: [N.ENG, poly([[-3, 49.8], [3, 49.8], [3, 56], [-3, 56]])],
  // Wales
  southwales: [N.WLS, poly([[-6, 51.3], [-2.5, 51.3], [-2.6, 51.98], [-3.1, 51.98], [-3.6, 51.95], [-4.1, 51.9], [-4.55, 52.0], [-6, 52.1]])],
  northmidwales: [N.WLS, poly([[-6, 51.3], [-2, 51.3], [-2, 54], [-6, 54]])],
  // Ireland: Ulster = Northern Ireland plus Donegal, Monaghan and Cavan (roughly).
  ulster: [union(N.NIR, N.IRL), poly([[-9, 55.6], [-5, 55.6], [-5, 54.0], [-6.6, 53.9], [-7.3, 53.8], [-7.9, 53.95], [-8.2, 54.4], [-8.7, 54.45], [-9, 54.6]])],
  southirish: [N.IRL, poly([[-11, 51], [-5, 51], [-5, 56], [-11, 56]])],
};
const ORDER = Object.keys(SHAPES);
for (const r of data.regions) if (!SHAPES[r.id]) throw new Error("no shape for " + r.id);
const parts = {};
let taken = [];
for (const id of ORDER) {
  const [within, shape] = SHAPES[id];
  let g = pc.intersection(within, shape);
  if (taken.length) g = pc.difference(g, taken);
  parts[id] = g;
  taken = taken.length ? pc.union(taken, g) : g;
}
const rest = pc.difference(MASK, taken);
const ringArea = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x * y2 - x2 * y; }, 0) / 2);
console.log("leftover deg²", rest.reduce((s, p) => s + ringArea(p[0]), 0).toFixed(5), "pieces", rest.length);
// Anything the outlines missed (small islands): give each piece to the nearest area.
for (const p of rest) {
  let best = null, bestD = Infinity;
  for (const id of ORDER) for (const q of parts[id]) for (const [x, y] of q[0]) for (const [px, py] of p[0]) {
    const d = (x - px) ** 2 + (y - py) ** 2;
    if (d < bestD) { bestD = d; best = id; }
  }
  console.log("  piece at", p[0][0].map((n) => n.toFixed(2)).join(","), ringArea(p[0]).toFixed(5), "→", best);
  if (best) parts[best] = pc.union(parts[best], [p]);
}

// ── projection and output ─────────────────────────────────────────────
const WIDTH = 760;
const rewind = (c) => c.map((p) => p.map((r) => [...r].reverse()));
const mp = (c) => ({ type: "MultiPolygon", coordinates: rewind(c) });
const maskFeature = mp(MASK);
const proj = geoAzimuthalEqualArea().rotate([4, -54.5]);
proj.fitWidth(WIDTH - 24, maskFeature);
const raw = geoPath(proj).bounds(maskFeature);
const HEIGHT = Math.ceil(raw[1][1] - raw[0][1] + 24);
proj.fitExtent([[12, 12], [WIDTH - 12, HEIGHT - 12]], maskFeature);
proj.clipExtent([[0, 0], [WIDTH, HEIGHT]]);

// Path strings: one decimal, collinear-ish points dropped (Douglas–Peucker, EPS px).
const EPS = 0.45;
function dp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) { const d = L ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L : Math.hypot(pts[i][0] - ax, pts[i][1] - ay); if (d > md) { md = d; mi = i; } }
    if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const stream = (geo) => {
  let d = "";
  const ctx = { pts: [], moveTo(x, y) { this.flush(); this.pts = [[x, y]]; }, lineTo(x, y) { this.pts.push([x, y]); },
    closePath() { this.flush(true); }, flush(close) { if (this.pts.length > 1) { const s = dp(this.pts, EPS); if (s.length > 2 || !close) d += "M" + s.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L").replace(/\.0(?=[,LM]|$)/g, "") + (close ? "Z" : ""); } this.pts = []; }, arc() {} };
  geoPath(proj, ctx)(geo); ctx.flush(false);
  return d;
};
const P = (lonlat) => proj(shiftPt(lonlat)).map((n) => Math.round(n * 10) / 10);

// Neighbours: every other country in the frame (the UK and Ireland are drawn from the
// subunits instead).
const countries50 = feature(world, world.objects.countries).features;
const land = countries50.filter((f) => !["826", "372"].includes(f.id)).map((f) => stream(f)).join("");
// Inner lines from one topology, so every shared border is drawn once.
const topo = topology({ n: { type: "FeatureCollection", features: nationFeatures } }, 1e5);
const isUK = (f) => f.properties.su !== "IRL";
const nationBorders = mesh(topo, topo.objects.n, (a, b) => a !== b && isUK(a) && isUK(b));
const ukIrl = mesh(topo, topo.objects.n, (a, b) => a !== b && isUK(a) !== isUK(b));
const coast = mesh(topo, topo.objects.n, (a, b) => a === b);
const [[bx0, by0], [bx1, by1]] = SHETLAND_BOX;
const box = { type: "LineString", coordinates: [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1], [bx0, by0]] };

const out = {
  _comment: "Generated by scripts/generate-dialekte-karte.mjs from Natural Earth (public domain). Do not edit by hand. Shetland is drawn in an inset box. `swiss` is empty (no other language area is hatched on this map); `benrath` is the FOOT–STRUT line, `speyer` the TRAP–BATH line.",
  w: WIDTH, h: HEIGHT,
  land, mask: stream(maskFeature), swiss: "",
  states: stream(nationBorders) + stream(box),
  borders: stream(ukIrl),
  coast: stream(coast),
  dialects: Object.fromEntries(data.regions.map((r) => [r.id, stream(mp(parts[r.id]))])),
  labels: Object.fromEntries(data.regions.map((r) => [r.id, P(r.label)])),
  markers: Object.fromEntries(data.markers.map((m) => [m.id, P(m.at)])),
  others: Object.fromEntries(data.others.map((o) => [o.id, P(o.at)])),
  benrath: stream({ type: "LineString", coordinates: data.lines.benrath }),
  speyer: stream({ type: "LineString", coordinates: data.lines.speyer }),
  benrathAt: P(data.lines.benrathAt), speyerAt: P(data.lines.speyerAt),
};
fs.writeFileSync("src/data/dialekte-karte.json", JSON.stringify(out));
console.log("size", (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0) + " KB", WIDTH + "x" + HEIGHT);
for (const [k, v] of Object.entries(out.dialects)) if (!v) console.log("EMPTY", k);
for (const [k, v] of Object.entries(out)) if (typeof v === "string" && k !== "_comment" && k !== "swiss" && !v) console.log("EMPTY", k);
