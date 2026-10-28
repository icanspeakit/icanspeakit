// Map geometry for /wissen/dialekte — run once, output committed.
//
// Builds the German-speaking area (DE, AT, LI, LU, the German-speaking cantons and parts of
// CH, Südtirol, Elsass, German Lorraine, Ostbelgien) from Natural Earth admin-1 shapes,
// cuts it into dialect areas with the hand-drawn outlines below, and writes
// src/data/dialekte-karte.json: pre-projected <path d> per dialect, neighbours as grey
// land, the other Swiss language areas, the state borders, the Benrath and Speyer lines,
// and the label/marker positions from src/data/dialekte.json.
//
// The dialect outlines are deliberately rough (Wiesinger-style overview maps, simplified):
// each one is drawn generously past the borders, clipped to the German-speaking area and
// to what earlier entries already took, so only the inner borders matter. Order matters:
// the Swiss areas first, Niederalemannisch last as the catch-all for the south-west.
//
// The geo packages are not dependencies of the site. To re-run:
//   mkdir /tmp/geo && cd /tmp/geo && npm i world-atlas@2 d3-geo@3 topojson-client@3 topojson-server@3 polygon-clipping@0.15
//   curl -o /tmp/geo/adm1.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
//   NODE_PATH=/tmp/geo/node_modules ADM1=/tmp/geo/adm1.geojson node scripts/generate-dialekte-karte.mjs
//
// scripts/generate-bier-karte.mjs imports the shapes and the projection from here; the file
// is only written when this script is run itself.
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const { geoPath, geoAzimuthalEqualArea } = require("d3-geo");
const { feature, mesh } = require("topojson-client");
const pc = require("polygon-clipping");

const data = JSON.parse(fs.readFileSync("src/data/dialekte.json", "utf8"));
const adm1 = JSON.parse(fs.readFileSync(process.env.ADM1 || "/tmp/geo/adm1.geojson", "utf8"));
const world = JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-10m.json"), "utf8"));

// ── helpers ───────────────────────────────────────────────────────────
const asMulti = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const union = (...gs) => gs.filter((g) => g && g.length).reduce((a, b) => pc.union(a, b));
const poly = (pts) => [[[...pts, pts[0]]]];
const A = new Map();
for (const f of adm1.features) {
  const p = f.properties;
  if (!["DEU", "AUT", "CHE", "LIE", "LUX", "ITA", "FRA"].includes(p.adm0_a3)) continue;
  A.set(`${p.adm0_a3}:${p.name}`, asMulti(f.geometry));
}
const state = (k) => { const g = A.get(k); if (!g) throw new Error("missing " + k); return g; };
const allOf = (iso) => union(...[...A].filter(([k]) => k.startsWith(iso + ":")).map(([, g]) => g));
const countries = feature(world, world.objects.countries).features;
const country = (id) => asMulti(countries.find((f) => f.id === id).geometry);

// ── the German-speaking area ──────────────────────────────────────────
const DEU = allOf("DEU"), AUT = allOf("AUT"), LIE = allOf("LIE"), LUX = allOf("LUX");
const CHE = allOf("CHE");
const cantonsFr = ["Genève", "Vaud", "Neuchâtel", "Jura"].map((c) => state("CHE:" + c));
// Inside bilingual cantons: rough outlines of the French, Italian and Romansh parts.
const notGerman = [
  pc.intersection(state("CHE:Bern"), poly([[6.85, 47.08], [7.22, 47.1], [7.42, 47.2], [7.55, 47.35], [7.2, 47.45], [6.85, 47.35]])),
  pc.intersection(state("CHE:Fribourg"), poly([[6.7, 47.05], [7.05, 46.98], [7.12, 46.9], [7.16, 46.8], [7.2, 46.7], [7.25, 46.58], [7.2, 46.35], [6.7, 46.35]])),
  pc.intersection(state("CHE:Valais"), poly([[6.7, 45.8], [7.58, 45.8], [7.6, 46.1], [7.58, 46.5], [6.7, 46.5]])),
  pc.intersection(state("CHE:Graubünden"), union(
    poly([[8.6, 46.75], [8.95, 46.88], [9.27, 46.86], [9.3, 46.78], [9.15, 46.66], [8.9, 46.52], [8.6, 46.55]]),       // Surselva
    poly([[9.45, 46.2], [9.5, 46.5], [9.7, 46.62], [9.9, 46.76], [10.15, 46.88], [10.3, 46.9], [10.6, 46.6], [10.3, 46.15]]), // Engadin, Bergell, Puschlav, Val Müstair
    poly([[8.95, 46.15], [8.95, 46.52], [9.25, 46.52], [9.3, 46.15]]),                                                    // Misox, Calanca
  )),
  state("CHE:Ticino"), ...cantonsFr,
].filter((g) => g.length);
const CHE_DE = pc.difference(CHE, ...notGerman);
const lorraine = pc.intersection(state("FRA:Moselle"),
  poly([[6.02, 49.47], [6.2, 49.3], [6.4, 49.1], [6.6, 48.95], [6.85, 48.85], [7.0, 48.75], [7.1, 48.55], [7.6, 48.55], [7.6, 49.7], [6.02, 49.7]]));
const ostbelgien = pc.intersection(country("056"),
  poly([[5.93, 50.72], [6.12, 50.73], [6.28, 50.62], [6.42, 50.35], [6.2, 50.12], [6.02, 50.15], [5.96, 50.35], [6.05, 50.47], [5.94, 50.6]]));
const MASK = union(DEU, AUT, LIE, LUX, CHE_DE, state("ITA:Bozen"), state("FRA:Bas-Rhin"), state("FRA:Haute-Rhin"), lorraine, ostbelgien);

// ── dialect outlines (lon, lat) ───────────────────────────────────────
const N = 55.6, S = 45.4, W = 4.8, E = 17.6;
const SHAPES = {
  hoechstalemannisch: pc.intersection(CHE_DE, poly([[6.9, 45.8], [8.6, 45.8], [8.6, 46.55], [8.35, 46.65], [8.0, 46.73], [7.6, 46.7], [7.2, 46.58], [6.9, 46.4]])),
  hochalemannisch: union(
    pc.difference(union(CHE_DE, LIE, state("AUT:Vorarlberg")), state("CHE:Basel-Stadt")),
    poly([[6.9, 47.68], [7.2, 47.68], [7.5, 47.62], [7.55, 47.5], [7.4, 47.38], [6.9, 47.38]]),             // Sundgau
    poly([[7.66, 47.58], [7.75, 47.7], [8.1, 47.8], [8.5, 47.8], [8.75, 47.72], [8.75, 47.55], [7.66, 47.55]]), // Südschwarzwald, Hochrhein
  ),
  nordniedersaechsisch: poly([[W, N], [11.0, N], [10.95, 54.0], [10.85, 53.7], [10.75, 53.35], [10.95, 53.0], [11.0, 52.5], [10.6, 52.65], [10.0, 52.7], [9.4, 52.6], [8.95, 52.45], [8.5, 52.5], [8.0, 52.55], [7.4, 52.6], [6.7, 52.55], [W, 52.55]]),
  westfaelisch: poly([[W, 52.55], [6.7, 52.55], [7.4, 52.6], [8.0, 52.55], [8.5, 52.5], [8.95, 52.45], [9.1, 52.2], [9.3, 51.9], [9.5, 51.6], [9.55, 51.35], [8.9, 51.2], [8.35, 51.08], [8.2, 51.05], [8.0, 51.07], [7.55, 51.12], [7.05, 51.15], [7.0, 51.25], [6.95, 51.45], [6.75, 51.65], [6.55, 51.9], [W, 52.0]]),
  ostfaelisch: poly([[8.95, 52.45], [9.4, 52.6], [10.0, 52.7], [10.6, 52.65], [11.0, 52.5], [11.4, 52.4], [11.8, 52.2], [11.95, 52.0], [11.9, 51.83], [11.3, 51.75], [10.4, 51.55], [9.8, 51.41], [9.55, 51.35], [9.5, 51.6], [9.3, 51.9], [9.1, 52.2]]),
  mecklenburgisch: poly([[11.0, N], [E, N], [E, 53.3], [15.0, 53.3], [14.2, 53.3], [13.6, 53.4], [13.0, 53.2], [12.3, 53.25], [11.5, 53.15], [10.75, 53.35], [10.85, 53.7], [10.95, 54.0]]),
  brandenburgisch: poly([[10.75, 53.35], [11.5, 53.15], [12.3, 53.25], [13.0, 53.2], [13.6, 53.4], [14.2, 53.3], [15.0, 53.3], [E, 53.3], [E, 52.3], [14.8, 52.3], [14.6, 52.3], [13.9, 51.95], [12.9, 51.9], [12.1, 51.85], [11.9, 51.83], [11.95, 52.0], [11.8, 52.2], [11.4, 52.4], [11.0, 52.5], [10.95, 53.0]]),
  niederrheinisch: poly([[W, 52.0], [6.55, 51.9], [6.75, 51.65], [6.95, 51.45], [7.0, 51.25], [7.05, 51.15], [6.88, 51.16], [6.45, 51.05], [5.95, 50.75], [W, 50.75]]),
  ripuarisch: poly([[W, 50.75], [5.95, 50.75], [6.45, 51.05], [6.88, 51.16], [7.05, 51.15], [7.55, 51.12], [8.0, 51.07], [7.85, 50.95], [7.6, 50.78], [7.25, 50.62], [7.0, 50.55], [6.6, 50.45], [6.1, 50.35], [W, 50.4]]),
  moselfraenkisch: poly([[W, 50.4], [6.1, 50.35], [6.6, 50.45], [7.0, 50.55], [7.25, 50.62], [7.6, 50.78], [7.85, 50.95], [8.0, 51.07], [8.2, 51.05], [8.35, 51.08], [8.3, 50.85], [8.2, 50.6], [8.0, 50.3], [7.75, 50.1], [7.5, 49.85], [7.2, 49.6], [6.9, 49.25], [6.75, 49.05], [6.6, 48.9], [W, 48.9]]),
  pfaelzisch: poly([[W, 48.9], [6.6, 48.9], [6.75, 49.05], [6.9, 49.25], [7.2, 49.6], [7.5, 49.85], [7.75, 50.1], [7.9, 49.98], [8.2, 49.98], [8.3, 50.0], [8.45, 49.9], [8.4, 49.7], [8.45, 49.6], [8.65, 49.55], [8.85, 49.45], [9.1, 49.4], [8.95, 49.3], [8.65, 49.25], [8.55, 49.3], [8.4, 49.2], [8.2, 49.0], [7.9, 49.0], [7.7, 48.95], [7.35, 48.85], [7.1, 48.7], [W, 48.62]]),
  hessisch: poly([[8.35, 51.08], [8.9, 51.2], [9.55, 51.35], [9.8, 51.41], [9.95, 51.2], [10.05, 51.0], [10.0, 50.8], [10.1, 50.55], [9.9, 50.45], [9.6, 50.3], [9.4, 50.2], [9.3, 50.05], [9.25, 49.8], [9.2, 49.55], [9.1, 49.4], [8.85, 49.45], [8.65, 49.55], [8.45, 49.6], [8.4, 49.7], [8.45, 49.9], [8.3, 50.0], [8.2, 49.98], [7.9, 49.98], [7.75, 50.1], [8.0, 50.3], [8.2, 50.6], [8.3, 50.85]]),
  thueringisch: poly([[9.8, 51.41], [10.4, 51.55], [11.3, 51.75], [11.9, 51.83], [12.1, 51.45], [12.2, 51.0], [12.25, 50.75], [12.2, 50.55], [11.9, 50.55], [11.5, 50.5], [11.1, 50.55], [10.8, 50.62], [10.4, 50.65], [10.1, 50.55], [10.0, 50.8], [10.05, 51.0], [9.95, 51.2]]),
  obersaechsisch: poly([[11.9, 51.83], [12.1, 51.85], [12.9, 51.9], [13.9, 51.95], [14.6, 52.3], [14.8, 52.3], [16.0, 52.3], [16.0, 50.0], [12.9, 50.2], [12.5, 50.4], [12.2, 50.55], [12.25, 50.75], [12.2, 51.0], [12.1, 51.45]]),
  ostfraenkisch: poly([[9.1, 49.4], [9.2, 49.55], [9.25, 49.8], [9.3, 50.05], [9.4, 50.2], [9.6, 50.3], [9.9, 50.45], [10.1, 50.55], [10.4, 50.65], [10.8, 50.62], [11.1, 50.55], [11.5, 50.5], [11.9, 50.55], [12.2, 50.55], [12.5, 50.4], [12.9, 50.2], [12.1, 50.15], [11.8, 49.95], [11.65, 49.7], [11.45, 49.45], [11.3, 49.2], [11.05, 49.0], [10.75, 48.95], [10.55, 48.95], [10.35, 49.05], [10.1, 49.0], [9.85, 49.05], [9.6, 49.2], [9.4, 49.3]]),
  suedfraenkisch: poly([[7.7, 48.95], [7.9, 49.0], [8.2, 49.0], [8.4, 49.2], [8.55, 49.3], [8.65, 49.25], [8.95, 49.3], [9.1, 49.4], [9.4, 49.3], [9.6, 49.2], [9.85, 49.05], [9.5, 49.05], [9.3, 49.0], [9.0, 49.0], [8.75, 48.9], [8.4, 48.8], [8.15, 48.85], [7.95, 48.9]]),
  schwaebisch: poly([[8.4, 48.8], [8.75, 48.9], [9.0, 49.0], [9.3, 49.0], [9.5, 49.05], [9.85, 49.05], [10.1, 49.0], [10.35, 49.05], [10.55, 48.95], [10.75, 48.95], [10.9, 48.7], [10.97, 48.4], [10.9, 48.1], [10.85, 47.8], [10.9, 47.5], [10.6, 47.5], [10.45, 47.55], [10.1, 47.7], [9.7, 47.75], [9.35, 47.85], [9.0, 47.9], [8.75, 48.05], [8.6, 48.3], [8.45, 48.55]]),
  nordbairisch: poly([[10.75, 48.95], [11.05, 49.0], [11.3, 49.2], [11.45, 49.45], [11.65, 49.7], [11.8, 49.95], [12.1, 50.15], [12.9, 50.2], [13.8, 49.5], [13.4, 49.2], [13.0, 49.25], [12.6, 49.15], [12.2, 49.05], [12.0, 49.0], [11.7, 48.95], [11.3, 48.85], [10.9, 48.7]]),
  mittelbairisch: poly([[10.9, 48.7], [11.3, 48.85], [11.7, 48.95], [12.0, 49.0], [12.2, 49.05], [12.6, 49.15], [13.0, 49.25], [13.4, 49.2], [13.8, 49.5], [E, 49.5], [E, 47.2], [16.6, 47.2], [16.1, 47.3], [15.5, 47.4], [14.8, 47.45], [14.2, 47.55], [13.5, 47.5], [12.8, 47.45], [12.2, 47.6], [11.5, 47.45], [10.9, 47.45], [10.9, 47.5], [10.85, 47.8], [10.9, 48.1], [10.97, 48.4]]),
  suedbairisch: poly([[10.9, 47.5], [10.9, 47.45], [11.5, 47.45], [12.2, 47.6], [12.8, 47.45], [13.5, 47.5], [14.2, 47.55], [14.8, 47.45], [15.5, 47.4], [16.1, 47.3], [16.6, 47.2], [E, 47.2], [E, S], [10.15, S], [10.15, 47.3], [10.45, 47.4], [10.6, 47.5]]),
  niederalemannisch: poly([[W, 48.62], [7.1, 48.7], [7.35, 48.85], [7.7, 48.95], [7.95, 48.9], [8.15, 48.85], [8.4, 48.8], [8.45, 48.55], [8.6, 48.3], [8.75, 48.05], [9.0, 47.9], [9.35, 47.85], [9.7, 47.75], [10.1, 47.7], [10.45, 47.55], [10.6, 47.5], [10.45, 47.4], [10.15, 47.3], [10.15, S], [W, S]]),
};
const ORDER = ["hoechstalemannisch", "hochalemannisch", ...Object.keys(SHAPES).filter((k) => !["hoechstalemannisch", "hochalemannisch"].includes(k))];
for (const r of data.regions) if (!SHAPES[r.id]) throw new Error("no shape for " + r.id);

const parts = {};
let taken = [];
for (const id of ORDER) {
  let g = pc.intersection(SHAPES[id], MASK);
  if (taken.length) g = pc.difference(g, taken);
  parts[id] = g;
  taken = taken.length ? pc.union(taken, g) : g;
}
// Anything the outlines missed: give each leftover piece to the dialect it touches most.
const rest = pc.difference(MASK, taken);
const ringArea = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x * y2 - x2 * y; }, 0) / 2);
let leftover = 0;
for (const p of rest) {
  const a = ringArea(p[0]);
  leftover += a;
  let best = null, bestD = Infinity;
  for (const id of ORDER) for (const q of parts[id]) for (const [x, y] of q[0]) for (const [px, py] of p[0]) {
    const d = (x - px) ** 2 + (y - py) ** 2;
    if (d < bestD) { bestD = d; best = id; }
  }
  if (best) parts[best] = pc.union(parts[best], [p]);
}
console.log("leftover deg²", leftover.toFixed(4), "pieces", rest.length);

// ── projection and output ─────────────────────────────────────────────
const WIDTH = 760;
const maskFeature = { type: "MultiPolygon", coordinates: MASK.map((p) => p.map((r) => [...r].reverse())) };
const proj = geoAzimuthalEqualArea().rotate([-11.2, -50.4]);
proj.fitWidth(WIDTH - 24, maskFeature);
const raw = geoPath(proj).bounds(maskFeature);
const HEIGHT = Math.ceil(raw[1][1] - raw[0][1] + 24);
proj.fitExtent([[12, 12], [WIDTH - 12, HEIGHT - 12]], maskFeature);
proj.clipExtent([[0, 0], [WIDTH, HEIGHT]]);

// Path strings: one decimal, collinear-ish points dropped (Douglas–Peucker, 0.35 px).
function dp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    // A closed ring starts and ends on the same point: measure from that point instead.
    for (let i = a + 1; i < b; i++) { const d = L ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L : Math.hypot(pts[i][0] - ax, pts[i][1] - ay); if (d > md) { md = d; mi = i; } }
    if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const stream = (geo) => {
  let d = "";
  const ctx = { pts: [], moveTo(x, y) { this.flush(); this.pts = [[x, y]]; }, lineTo(x, y) { this.pts.push([x, y]); },
    closePath() { this.flush(true); }, flush(close) { if (this.pts.length > 1) { const s = dp(this.pts, 0.35); if (s.length > 2 || !close) d += "M" + s.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L").replace(/\.0(?=[,LM]|$)/g, "") + (close ? "Z" : ""); } this.pts = []; }, arc() {} };
  geoPath(proj, ctx)(geo); ctx.flush(false);
  return d;
};
// polygon-clipping returns counter-clockwise outer rings (planar convention); d3-geo works
// on the sphere and reads those as "everything but", so every ring is reversed.
const rewind = (c) => c.map((p) => p.map((r) => [...r].reverse()));
const mp = (c) => ({ type: "MultiPolygon", coordinates: rewind(c) });
const P = (lonlat) => proj(lonlat).map((n) => Math.round(n * 10) / 10);

// Neighbours: every other country in the frame, merged; the DACH-side non-German land is
// drawn in the same grey, the Swiss language areas on top with their own pattern.
const countries50 = feature(JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8")), JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8")).objects.countries).features;
const others = countries50.filter((f) => !["276", "040", "756", "438", "442"].includes(f.id));
const land = others.map((f) => stream(f)).join("");
const otherSwiss = pc.difference(CHE, CHE_DE);
const dachOutline = mesh(world, world.objects.countries, (a, b) => {
  const D = ["276", "040", "756", "438", "442"]; return (D.includes(a.id) || D.includes(b.id)) && a !== b;
});
const coast = mesh(world, world.objects.countries, (a, b) => a === b && ["276", "040", "756", "438", "442"].includes(a.id));
// State borders inside DE, AT, CH (thin orientation lines): built as a topology so every
// shared border is drawn once and the country outline not at all.
const { topology } = require("topojson-server");
const stateFeatures = adm1.features.filter((f) => ["DEU", "AUT", "CHE"].includes(f.properties.adm0_a3));
const stateTopo = topology({ s: { type: "FeatureCollection", features: stateFeatures } }, 1e5);
const stateMesh = mesh(stateTopo, stateTopo.objects.s, (a, b) => a !== b && a.properties.adm0_a3 === b.properties.adm0_a3);
const out = {
  _comment: "Generated by scripts/generate-dialekte-karte.mjs from Natural Earth (public domain). Do not edit by hand.",
  w: WIDTH, h: HEIGHT,
  land, mask: stream(mp(MASK)), swiss: stream(mp(otherSwiss)),
  states: stream(stateMesh),
  borders: stream(dachOutline),
  coast: stream(coast),
  dialects: Object.fromEntries(data.regions.map((r) => [r.id, stream(mp(parts[r.id]))])),
  labels: Object.fromEntries(data.regions.map((r) => [r.id, P(r.label)])),
  markers: Object.fromEntries(data.markers.map((m) => [m.id, P(m.at)])),
  others: Object.fromEntries(data.others.map((o) => [o.id, P(o.at)])),
  benrath: stream({ type: "LineString", coordinates: data.lines.benrath }),
  speyer: stream({ type: "LineString", coordinates: data.lines.speyer }),
  benrathAt: P(data.lines.benrathAt), speyerAt: P(data.lines.speyerAt),
};
if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  fs.writeFileSync("src/data/dialekte-karte.json", JSON.stringify(out));
  console.log("size", (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0) + " KB", WIDTH + "x" + HEIGHT);
  for (const [k, v] of Object.entries(out.dialects)) if (!v) console.log("EMPTY", k);
}

export { pc, state, union, poly, MASK, CHE_DE, LIE, LUX, AUT, lorraine, ostbelgien, parts, proj, stream, mp, P, WIDTH, HEIGHT };
