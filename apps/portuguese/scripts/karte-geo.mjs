// Shared by generate-dialekte-karte.mjs and generate-sprachen-karte.mjs: plain geometry, no
// packages. The outlines come from the map committed before the Spanish conversion, which holds
// Natural Earth (world-atlas, public domain) already projected to whole pixels:
//   git show edf6596:src/data/sprachen-karte.json
// That file has a Europe view (1:50 m) and a world view (1:110 m). Rings are told apart by a
// known point inside them. The two projections below reproduce its pixels exactly, so new
// coordinates (borders, markers, labels) line up with those outlines.
import { execFileSync } from "node:child_process";

export const SOURCE_COMMIT = "edf6596";

export function loadSource() {
  const raw = execFileSync("git", ["show", `${SOURCE_COMMIT}:src/data/sprachen-karte.json`], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
  return JSON.parse(raw);
}

// "M1,2L3,4ZM…" → [[[1,2],[3,4]],…], without repeated points; a ring needs three points.
export function parseRings(d) {
  return d
    .split("M")
    .filter(Boolean)
    .map((s) => {
      const pts = [];
      for (const p of s.replace(/Z/g, "").split("L")) {
        const [x, y] = p.split(",").map(Number);
        const last = pts[pts.length - 1];
        if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
      }
      if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
      return pts;
    })
    .filter((r) => r.length >= 3);
}

export function contains(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const distance = (ring, [x, y]) => Math.min(...ring.map(([a, b]) => Math.hypot(a - x, b - y)));

// One round of corner cutting: takes the staircase out of whole-pixel outlines once they are
// enlarged. Rings closed; lines keep their ends.
export function smooth(ring) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[(i + 1) % ring.length];
    out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
  }
  return out;
}

const num = (n) => String(Math.round(n * 10) / 10);
export const ringPath = (ring) => "M" + ring.map(([x, y]) => `${num(x)},${num(y)}`).join("L") + "Z";
export const linePath = (pts) => "M" + pts.map(([x, y]) => `${num(x)},${num(y)}`).join("L");
export const r1 = (n) => Math.round(n * 10) / 10;

const RAD = Math.PI / 180;

// d3's geoAzimuthalEqualArea().rotate([-4, -48]) fitted as the old Europe view was.
function azimuthalRaw([lon, lat]) {
  const l = (lon - 4) * RAD;
  const p = lat * RAD;
  const p0 = 48 * RAD;
  const k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l)));
  return [k * Math.cos(p) * Math.sin(l), -k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l))];
}
const EUROPE_FIT = [[-11, 51], [21, 51], [-9, 60.5], [17, 61], [14.5, 35.5], [-6, 35.8]];
export function europeProjection(w = 800, h = 600) {
  const pts = EUROPE_FIT.map(azimuthalRaw);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(w / (x1 - x0), h / (y1 - y0));
  const tx = (w - k * (x1 + x0)) / 2;
  const ty = (h - k * (y1 + y0)) / 2;
  return (lonlat) => {
    const [x, y] = azimuthalRaw(lonlat);
    return [tx + k * x, ty + k * y];
  };
}

// d3's geoEqualEarth() fitted to the whole globe, as the old world view was.
const [A1, A2, A3, A4] = [1.340264, -0.081106, 0.000893, 0.003796];
const M = Math.sqrt(3) / 2;
function equalEarthRaw([lon, lat]) {
  const lam = lon * RAD;
  const l = Math.asin(M * Math.sin(lat * RAD));
  const l2 = l * l;
  const l6 = l2 * l2 * l2;
  return [
    (lam * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))),
    -l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)),
  ];
}
export function worldProjection(w = 1000, h = 487, pad = 4) {
  const [xMax] = equalEarthRaw([180, 0]);
  const [, yMin] = equalEarthRaw([0, 90]);
  const k = Math.min((w - 2 * pad) / (2 * xMax), (h - 2 * pad) / (-2 * yMin));
  return (lonlat) => {
    const [x, y] = equalEarthRaw(lonlat);
    return [w / 2 + k * x, h / 2 + k * y];
  };
}
