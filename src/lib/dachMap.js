// Puts a (lon, lat) point onto the dialect map's outlines (src/data/dialekte-karte.json), so
// other maps can reuse that geometry without rerunning scripts/generate-dialekte-karte.mjs.
//
// The generator projects with d3's geoAzimuthalEqualArea().rotate([-11.2, -50.4]) and a
// fitExtent scale and offset. Those two numbers are not stored, so they are fitted here from
// the points it did project (markers and region labels): x = s·px + tx, y = −s·py + ty.
// The fit is exact to the generator's rounding (< 0.1 px) and follows a regenerated map.
import dl from "../data/dialekte.json";
import karte from "../data/dialekte-karte.json";

const R = Math.PI / 180;
const L0 = 11.2 * R, P0 = 50.4 * R;
const raw = ([lon, lat]) => {
  const l = lon * R - L0, p = lat * R;
  const k = Math.sqrt(2 / (1 + Math.sin(P0) * Math.sin(p) + Math.cos(P0) * Math.cos(p) * Math.cos(l)));
  return [k * Math.cos(p) * Math.sin(l), k * (Math.cos(P0) * Math.sin(p) - Math.sin(P0) * Math.cos(p) * Math.cos(l))];
};

const known = [
  ...dl.markers.map((m) => [m.at, karte.markers[m.id]]),
  ...dl.regions.map((r) => [r.label, karte.labels[r.id]]),
];
let n = 0, sx = 0, sy = 0, sX = 0, sY = 0, sq = 0, xX = 0, yY = 0;
for (const [ll, [X, Y]] of known) {
  const [x, y] = raw(ll);
  n++; sx += x; sy += y; sX += X; sY += Y; sq += x * x + y * y; xX += x * X; yY += y * Y;
}
const s = (xX - (sx * sX) / n - (yY - (sy * sY) / n)) / (sq - (sx * sx + sy * sy) / n);
const tx = (sX - s * sx) / n, ty = (sY + s * sy) / n;

/** @param {[number, number]} lonlat @returns {[number, number]} SVG x, y on the dialect map */
export function projectDach(lonlat) {
  const [x, y] = raw(lonlat);
  return [Math.round((s * x + tx) * 10) / 10, Math.round((-s * y + ty) * 10) / 10];
}
