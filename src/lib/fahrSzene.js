// Top-down traffic scenes for the Führerschein section: a road layout, signs, vehicles and a
// sequence of steps — „Quaki fährt bis zur Haltlinie", „das Auto von rechts fährt zuerst" —
// drawn as one SVG and played as a short animation (FahrSzene.astro).
//
// One module, two readers: the page renders the SVG with renderSzene() at build time (so a
// page without JavaScript, or with reduced motion, shows the still: every vehicle at its start
// with numbered arrows for what happens next), and the browser imports the same path maths
// (pathOf / pointAt) to move the vehicles along exactly the arrows it drew.
//
// Scene data (src/data/fuehrerschein/szenen.json):
//   { id, title, layout, options?, signs?, props?, actors, steps }
//   layout   kreuzung | t-kreuzung | kreisverkehr | autobahn-3spurig | autobahn-auffahrt |
//            zebrastreifen | strasse | parkplatz
//   options  { vorfahrt?: ["s","w"], haltlinie?: ["s"], zone?: { y1, y2, label }, side?: [y1, y2], bays?: [y…] }
//   signs    [{ z: "205", x, y, s? }]  — a Verkehrszeichen (public/img/verkehrszeichen/<z>.svg)
//   props    [{ kind: "ampel" | "gruenpfeil", id, x, y, rot?, state: "rot"|"gelb"|"gruen"|"rotgelb"|"aus" }]
//   actors   [{ id, kind: car|bus|bike|pedestrian|ambulance, driver?: quaki|bruno|regi|hamsti,
//               color?, x, y, rot }]   rot in degrees, 0 = facing up, clockwise
//   steps    [{ who?, move?: [[x,y],…], slide?, also?: [{ who, move, slide? }], say?, speaker?,
//               expr?, highlight?, blink?: "left"|"right", lights?: { id: state }, wait?,
//               warn?: actorId, badge?: 0–1, mark?: "falsch" }]
//   stillAt  index of the step the still shows the scene before (default 0)
// The canvas is 400 × 400. A `move` lists the points after the actor's current position; the
// path through them is a Catmull-Rom curve, so three points make a turn. `slide` keeps the
// heading (a car edging sideways into a Rettungsgasse). `mark: "falsch"` draws the path in red
// with a ✗ and moves nobody — Quaki's mistake, shown rather than done.
//
// Drivers are the mascots' faces (mascots.js), cut round and set into the roof like a sunroof.
// They carry data-mascot-part, so „Maskottchen anzeigen: aus" leaves plain cars: the scene is
// content and stays; only the faces go.
import { mascotBody, mascotSvg } from "./mascots.js";

export const W = 400;
export const H = 400;

// The brand colours of mascots.js, one car colour per driver.
export const DRIVER_COLOR = { quaki: "#14b8a6", bruno: "#fb923c", regi: "#115e59", hamsti: "#f2a900" };
const PLAIN = ["#94a3b8", "#64748b", "#cbd5e1", "#a5b4fc"];
const INK = "#1a2230";
const ROAD = "#5b6472";
const SIDEWALK = "#e2e5ea";
const GRASS = "#cfe7c4";
const LINE = "#ffffff";

// Where each face sits on the mascot's 200×200 grid (front view): centre and radius of the
// round cut. Measured off the drawings in mascots.js.
const FACE = {
  bruno: { cx: 70, cy: 84, r: 50 },
  regi: { cx: 100, cy: 114, r: 62 },
  hamsti: { cx: 100, cy: 108, r: 64 },
  quaki: { cx: 100, cy: 108, r: 68 },
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Path maths — shared with the browser
// ---------------------------------------------------------------------------

/** Catmull-Rom through `pts`, sampled into a polyline with cumulative lengths. */
export function pathOf(pts) {
  const out = [];
  if (pts.length < 2) return { pts: pts.map(([x, y]) => ({ x, y, d: 0 })), len: 0 };
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = 16;
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  let d = 0;
  out.forEach((p, i) => { if (i) d += Math.hypot(p.x - out[i - 1].x, p.y - out[i - 1].y); p.d = d; });
  return { pts: out, len: d };
}

/** Heading in degrees (0 = up, clockwise) of a vector. */
export const heading = (dx, dy) => (Math.atan2(dx, -dy) * 180) / Math.PI;

/** Position and heading at distance `d` along a sampled path. */
export function pointAt(path, d) {
  const { pts } = path;
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, rot: null };
  let i = 1;
  while (i < pts.length - 1 && pts[i].d < d) i++;
  const a = pts[i - 1], b = pts[i];
  const t = b.d === a.d ? 1 : Math.min(1, Math.max(0, (d - a.d) / (b.d - a.d)));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, rot: heading(b.x - a.x, b.y - a.y) };
}

/** Where every actor stands before each step (index i = before step i; last = the end). */
export function statesOf(scene) {
  const cur = Object.fromEntries(scene.actors.map((a) => [a.id, { x: a.x, y: a.y, rot: a.rot ?? 0 }]));
  const states = [structuredClone(cur)];
  for (const st of scene.steps) {
    if (st.mark !== "falsch") {
      for (const m of movesOf(st)) {
        const a = cur[m.who];
        if (!a) continue;
        const path = pathOf([[a.x, a.y], ...m.move]);
        const end = pointAt(path, path.len);
        const before = pointAt(path, Math.max(0, path.len - 2));
        cur[m.who] = { x: end.x, y: end.y, rot: m.slide ? a.rot : (before.rot ?? a.rot) };
      }
    }
    states.push(structuredClone(cur));
  }
  return states;
}

/** The moves of a step: its own (who + move) and any `also`. */
export function movesOf(st) {
  const own = st.who && st.move ? [{ who: st.who, move: st.move, slide: st.slide }] : [];
  return [...own, ...(st.also ?? [])];
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function grassBlock(x, y, w, h, r = 16) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${SIDEWALK}"/>`
    + `<rect x="${x + 11}" y="${y + 11}" width="${w - 22}" height="${h - 22}" rx="${Math.max(4, r - 8)}" fill="${GRASS}"/>`;
}
const dash = (x1, y1, x2, y2, w = 3, d = "14 12") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="${w}" stroke-dasharray="${d}"/>`;
const solid = (x1, y1, x2, y2, w = 3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="${w}"/>`;

// The priority road as a soft yellow band along its arms (kreuzung / t-kreuzung).
const ARM = { n: [200, 0], s: [200, 400], w: [0, 200], e: [400, 200] };
function vorfahrtBand(arms) {
  if (!arms?.length) return "";
  const [a, b] = arms;
  const pa = ARM[a], pb = ARM[b ?? a];
  const straight = pa[0] === pb[0] || pa[1] === pb[1];
  const d = straight ? `M${pa[0]} ${pa[1]} L${pb[0]} ${pb[1]}` : `M${pa[0]} ${pa[1]} L200 200 L${pb[0]} ${pb[1]}`;
  return `<path class="fz-vorfahrt" d="${d}" fill="none" stroke="#fef08a" stroke-opacity=".5" stroke-width="80" stroke-linejoin="round"/>`;
}

// Haltlinien just before the junction, on the lane that drives towards it.
const HALT = { s: [200, 250, 240, 250], n: [160, 150, 200, 150], w: [150, 200, 150, 240], e: [250, 160, 250, 200] };
const haltlinien = (arms) => (arms ?? []).map((k) => HALT[k] ? `<line x1="${HALT[k][0]}" y1="${HALT[k][1]}" x2="${HALT[k][2]}" y2="${HALT[k][3]}" stroke="${LINE}" stroke-width="5"/>` : "").join("");

const LAYOUTS = {
  kreuzung: (o) => `
    <rect width="${W}" height="${H}" fill="${ROAD}"/>
    ${vorfahrtBand(o.vorfahrt)}
    ${grassBlock(-20, -20, 180, 180)}${grassBlock(240, -20, 180, 180)}
    ${grassBlock(-20, 240, 180, 180)}${grassBlock(240, 240, 180, 180)}
    ${dash(200, 0, 200, 150)}${dash(200, 250, 200, 400)}${dash(0, 200, 150, 200)}${dash(250, 200, 400, 200)}
    ${haltlinien(o.haltlinie)}`,
  "t-kreuzung": (o) => `
    <rect width="${W}" height="${H}" fill="${ROAD}"/>
    ${vorfahrtBand(o.vorfahrt)}
    ${grassBlock(-20, -20, 440, 180)}
    ${grassBlock(-20, 240, 180, 180)}${grassBlock(240, 240, 180, 180)}
    ${dash(0, 200, 400, 200)}${dash(200, 250, 200, 400)}`,
  kreisverkehr: () => `
    <rect width="${W}" height="${H}" fill="${GRASS}"/>
    <rect x="160" y="0" width="80" height="400" fill="${ROAD}"/>
    <rect x="0" y="160" width="400" height="80" fill="${ROAD}"/>
    <circle cx="200" cy="200" r="118" fill="${ROAD}"/>
    <circle cx="200" cy="200" r="60" fill="${SIDEWALK}"/>
    <circle cx="200" cy="200" r="50" fill="${GRASS}"/>
    ${dash(200, 0, 200, 70)}${dash(200, 330, 200, 400)}${dash(0, 200, 70, 200)}${dash(330, 200, 400, 200)}
    <circle cx="200" cy="200" r="118" fill="none" stroke="${LINE}" stroke-width="2" stroke-dasharray="4 10" opacity=".55"/>`,
  "autobahn-3spurig": () => `
    <rect width="${W}" height="${H}" fill="${GRASS}"/>
    <rect x="86" y="0" width="230" height="400" fill="${ROAD}"/>
    <rect x="76" y="0" width="8" height="400" fill="#9ca3af"/>
    ${solid(98, 0, 98, 400)}${solid(282, 0, 282, 400)}
    ${dash(160, 0, 160, 400, 3, "22 18")}${dash(221, 0, 221, 400, 3, "22 18")}`,
  zebrastreifen: () => `
    <rect width="${W}" height="${H}" fill="${GRASS}"/>
    <rect x="136" y="0" width="128" height="400" fill="${SIDEWALK}"/>
    <rect x="160" y="0" width="80" height="400" fill="${ROAD}"/>
    ${dash(200, 0, 200, 140)}${dash(200, 200, 200, 400)}
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${163 + i * 11}" y="146" width="7" height="48" fill="${LINE}"/>`).join("")}`,
  // A street with a parking strip on the right and a side street joining from the right.
  // `zone` marks the stretch where parking is not allowed, with its label (filled from the
  // research file by the caller, like every sentence of a scene).
  parkplatz: (o) => `
    <rect width="${W}" height="${H}" fill="${GRASS}"/>
    <rect x="126" y="0" width="146" height="400" fill="${SIDEWALK}"/>
    <rect x="138" y="0" width="80" height="400" fill="${ROAD}"/>
    <rect x="218" y="0" width="42" height="400" fill="#6b7381"/>
    <rect x="218" y="${(o.side ?? [40, 120])[0]}" width="182" height="${(o.side ?? [40, 120])[1] - (o.side ?? [40, 120])[0]}" fill="${ROAD}"/>
    ${dash(178, 0, 178, 400)}
    ${(o.bays ?? [190, 260, 330]).map((y) => solid(218, y, 260, y, 2)).join("")}
    ${solid(218, 0, 218, (o.side ?? [40, 120])[0], 2)}${solid(218, (o.side ?? [40, 120])[1], 218, 400, 2)}
    ${o.zone ? `<rect x="219" y="${o.zone.y1}" width="40" height="${o.zone.y2 - o.zone.y1}" fill="#ef4444" opacity=".35"/>
      <line x1="266" y1="${o.zone.y1}" x2="266" y2="${o.zone.y2}" stroke="#b91c1c" stroke-width="2"/>
      <line x1="262" y1="${o.zone.y1}" x2="270" y2="${o.zone.y1}" stroke="#b91c1c" stroke-width="2"/><line x1="262" y1="${o.zone.y2}" x2="270" y2="${o.zone.y2}" stroke="#b91c1c" stroke-width="2"/>
      <text x="274" y="${(o.zone.y1 + o.zone.y2) / 2 + 5}" font-size="14" font-weight="700" fill="#b91c1c" style="font-family:var(--font-voice,'Fredoka',sans-serif)">${esc(o.zone.label ?? "")}</text>` : ""}`,
  // A plain two-lane street with pavements (Schulbus, Radfahrer).
  strasse: () => `
    <rect width="${W}" height="${H}" fill="${GRASS}"/>
    <rect x="136" y="0" width="128" height="400" fill="${SIDEWALK}"/>
    <rect x="160" y="0" width="80" height="400" fill="${ROAD}"/>
    ${dash(200, 0, 200, 400)}`,
  // Two Autobahn lanes going up and an acceleration lane joining from the right.
  "autobahn-auffahrt": () => `
    <rect width="${W}" height="${H}" fill="${GRASS}"/>
    <path d="M110 0 H232 V400 H110 Z" fill="${ROAD}"/>
    <path d="M232 400 V170 L232 90 L292 170 V400 Z" fill="${ROAD}"/>
    <rect x="100" y="0" width="8" height="400" fill="#9ca3af"/>
    ${solid(116, 0, 116, 400)}
    ${dash(172, 0, 172, 400, 3, "22 18")}
    <line x1="232" y1="400" x2="232" y2="170" stroke="${LINE}" stroke-width="5" stroke-dasharray="10 8"/>
    ${solid(232, 0, 232, 90)}
    <line x1="286" y1="400" x2="286" y2="170" stroke="${LINE}" stroke-width="3"/><line x1="286" y1="170" x2="234" y2="94" stroke="${LINE}" stroke-width="3"/>`,
};

/** The car on the 200×200 grid, facing up: body, windows, lights, the indicator lamps. */
export function carPiece(color) {
  return `
    <rect x="58" y="10" width="84" height="180" rx="30" fill="${color}" stroke="${INK}" stroke-width="7"/>
    <rect x="44" y="40" width="16" height="30" rx="6" fill="${INK}"/><rect x="140" y="40" width="16" height="30" rx="6" fill="${INK}"/>
    <rect x="44" y="132" width="16" height="30" rx="6" fill="${INK}"/><rect x="140" y="132" width="16" height="30" rx="6" fill="${INK}"/>
    <path d="M70 62 Q100 48 130 62 L124 84 Q100 78 76 84 Z" fill="#cdeffd" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M76 160 Q100 166 124 160 L128 174 Q100 182 72 174 Z" fill="#cdeffd" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="74" cy="22" r="7" fill="#fef3c7" stroke="${INK}" stroke-width="3"/><circle cx="126" cy="22" r="7" fill="#fef3c7" stroke="${INK}" stroke-width="3"/>
    <circle class="fz-ind fz-ind-l" cx="64" cy="30" r="9" fill="#f59e0b"/><circle class="fz-ind fz-ind-r" cx="136" cy="30" r="9" fill="#f59e0b"/>
    <circle class="fz-ind fz-ind-l" cx="64" cy="178" r="9" fill="#f59e0b"/><circle class="fz-ind fz-ind-r" cx="136" cy="178" r="9" fill="#f59e0b"/>`;
}

function face(name, sceneId, size) {
  const f = FACE[name];
  if (!f) return "";
  const id = `fz-${sceneId}-${name}`;
  const box = `${f.cx - f.r} ${f.cy - f.r} ${f.r * 2} ${f.r * 2}`;
  return `<svg x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" viewBox="${box}" overflow="hidden" aria-hidden="true">
      <defs><clipPath id="${id}"><circle cx="${f.cx}" cy="${f.cy}" r="${f.r}"/></clipPath></defs>
      <circle cx="${f.cx}" cy="${f.cy}" r="${f.r}" fill="#fff"/>
      <g clip-path="url(#${id})">${mascotBody({ name, expr: "happy", view: "front" })}</g>
      <circle cx="${f.cx}" cy="${f.cy}" r="${f.r - 3}" fill="none" stroke="${INK}" stroke-width="7"/>
    </svg>`;
}

function vehicle(a, sceneId, i) {
  const color = a.color ?? (a.driver ? DRIVER_COLOR[a.driver] : PLAIN[i % PLAIN.length]);
  switch (a.kind) {
    case "bus":
      return `<g class="fz-body"><rect x="-19" y="-52" width="38" height="104" rx="8" fill="${a.color ?? "#facc15"}" stroke="${INK}" stroke-width="2.5"/>
        <rect x="-14" y="-47" width="28" height="12" rx="3" fill="#cdeffd" stroke="${INK}" stroke-width="1.5"/>
        <rect x="-12" y="-28" width="24" height="70" rx="3" fill="#fff" opacity=".35"/>
        <circle class="fz-ind fz-ind-l fz-ind-warn" cx="-16" cy="-49" r="3.6" fill="#f59e0b"/><circle class="fz-ind fz-ind-r fz-ind-warn" cx="16" cy="-49" r="3.6" fill="#f59e0b"/>
        <circle class="fz-ind fz-ind-l fz-ind-warn" cx="-16" cy="49" r="3.6" fill="#f59e0b"/><circle class="fz-ind fz-ind-r fz-ind-warn" cx="16" cy="49" r="3.6" fill="#f59e0b"/></g>`;
    case "ambulance":
      return `<g class="fz-body"><rect x="-17" y="-34" width="34" height="68" rx="7" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
        <rect x="-17" y="-2" width="34" height="8" fill="#ef4444"/>
        <path d="M-12 -24 Q0 -29 12 -24 L10 -16 Q0 -19 -10 -16 Z" fill="#cdeffd" stroke="${INK}" stroke-width="1.6"/>
        <rect class="fz-blau" x="-11" y="-10" width="9" height="6" rx="2" fill="#3b82f6"/><rect class="fz-blau fz-blau-b" x="2" y="-10" width="9" height="6" rx="2" fill="#3b82f6"/>
        <path d="M-3 14 h6 v5 h5 v6 h-5 v5 h-6 v-5 h-5 v-6 h5 Z" fill="#ef4444"/></g>`;
    case "bike":
      return `<g class="fz-body"><line x1="0" y1="-16" x2="0" y2="16" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="-7" y1="-10" x2="7" y2="-10" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        <ellipse cx="0" cy="0" rx="8" ry="5.5" fill="${a.color ?? "#8b5cf6"}" stroke="${INK}" stroke-width="2"/>
        <circle cx="0" cy="-1" r="4.4" fill="#fde68a" stroke="${INK}" stroke-width="1.8"/></g>`;
    case "pedestrian":
      return `<g class="fz-body" transform="scale(1.5)"><ellipse cx="0" cy="1" rx="9" ry="5.5" fill="${a.color ?? "#6366f1"}" stroke="${INK}" stroke-width="1.6"/>
        <circle cx="-7.5" cy="-3" r="2.4" fill="#f5c9a8" stroke="${INK}" stroke-width="1.2"/><circle cx="7.5" cy="-3" r="2.4" fill="#f5c9a8" stroke="${INK}" stroke-width="1.2"/>
        <circle cx="0" cy="0" r="4.8" fill="#7c4a2d" stroke="${INK}" stroke-width="1.4"/></g>`;
    default: {
      const k = 0.32; // 200 grid → a 32 × 58 car
      return `<g class="fz-body" transform="scale(${k}) translate(-100 -100)">${carPiece(color)}</g>`;
    }
  }
}

function actorSvg(a, sceneId, i) {
  const rot = a.rot ?? 0;
  const head = a.driver && (a.kind ?? "car") === "car"
    ? `<g class="fz-face" data-mascot-part transform="rotate(${-rot})">${face(a.driver, sceneId, 30)}</g>`
    : "";
  return `<g class="fz-actor fz-actor--${a.kind ?? "car"}${a.warn ? " is-warn" : ""}" data-actor="${esc(a.id)}" transform="translate(${r1(a.x)} ${r1(a.y)}) rotate(${r1(rot)})">${vehicle(a, sceneId, i)}${head}</g>`;
}

const LAMP = { rot: "#ef4444", gelb: "#f59e0b", gruen: "#22c55e" };
function propSvg(p) {
  if (p.kind === "gruenpfeil") {
    return `<g class="fz-prop" data-prop="${esc(p.id)}" transform="translate(${p.x} ${p.y})">
      <rect x="-9" y="-8" width="18" height="16" rx="2" fill="#111827" stroke="#fff" stroke-width="1.2"/>
      <path d="M-5 0 H3 M0 -4 L4 0 L0 4" fill="none" stroke="#22c55e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  if (p.kind !== "ampel") return "";
  const on = (c) => p.state === c || (p.state === "rotgelb" && (c === "rot" || c === "gelb"));
  const lamp = (c, y) => `<circle class="fz-lamp" data-lamp="${c}" cx="0" cy="${y}" r="4.6" fill="${on(c) ? LAMP[c] : "#334155"}"/>`;
  return `<g class="fz-prop fz-ampel" data-prop="${esc(p.id)}" transform="translate(${p.x} ${p.y}) rotate(${p.rot ?? 0})">
      <rect x="-8" y="-17" width="16" height="34" rx="4" fill="#111827" stroke="#fff" stroke-width="1.5"/>
      ${lamp("rot", -10)}${lamp("gelb", 0)}${lamp("gruen", 10)}</g>`;
}

function signSvg(s, i) {
  const size = s.s ?? 30;
  return `<g class="fz-sign" data-sign="${esc(s.z)}" data-sign-i="${i}">
      <line x1="${s.x}" y1="${s.y}" x2="${s.x}" y2="${s.y + size * 0.5 + 6}" stroke="#475569" stroke-width="2.5"/>
      <image href="/img/verkehrszeichen/${esc(s.z)}.svg" x="${s.x - size / 2}" y="${s.y - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/></g>`;
}

/** The numbered arrows of the still: one per moving step (and per `also`), red for „falsch". */
function arrowsSvg(scene, states, from = 0) {
  const out = [];
  scene.steps.forEach((st, i) => {
    if (i < from) return;
    const wrong = st.mark === "falsch";
    for (const m of movesOf(st)) {
      const from = states[i][m.who];
      if (!from) continue;
      const path = pathOf([[from.x, from.y], ...m.move]);
      if (path.len < (st.slide || m.slide ? 4 : 24)) continue;
      const d = path.pts.map((p, k) => `${k ? "L" : "M"}${r1(p.x)} ${r1(p.y)}`).join(" ");
      // The number sits clear of the vehicle at the arrow's start (a car is 58 long) — and,
      // on a red arrow, near its end, so it never covers the right arrow drawn along the same road.
      // A step can place it itself (`badge`: 0–1 along the arrow) where two arrows cross.
      const at = (m.badge ?? st.badge) != null ? path.len * (m.badge ?? st.badge)
        : wrong ? path.len * 0.88 : Math.min(Math.max(44, path.len * 0.4), path.len - 6, 70);
      const mid = pointAt(path, at);
      out.push(`<g class="fz-arrow${wrong ? " fz-arrow--falsch" : ""}" data-step="${i}">
        <path d="${d}" fill="none" stroke="${wrong ? "#dc2626" : "#0f172a"}" stroke-width="7" stroke-linecap="round" opacity=".18"/>
        <path d="${d}" fill="none" stroke="${wrong ? "#dc2626" : "#fff"}" stroke-width="2.6" stroke-dasharray="6 5" stroke-linecap="round" marker-end="url(#fz-${scene.id}-${wrong ? "x" : "tip"})"/>
        <g transform="translate(${r1(mid.x)} ${r1(mid.y)})"><circle r="9.5" fill="${wrong ? "#dc2626" : "#0d9488"}" stroke="#fff" stroke-width="2"/>
        <text y="4" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" style="font-family:var(--font-voice,'Fredoka',sans-serif)">${i + 1}</text></g></g>`);
    }
  });
  return out.join("");
}

/** The whole scene as an inline <svg> — the still a page without JS shows. */
export function renderSzene(scene, { arrows = true } = {}) {
  const draw = LAYOUTS[scene.layout];
  if (!draw) throw new Error(`fahrSzene: unbekanntes Layout „${scene.layout}“ (${scene.id})`);
  const states = statesOf(scene);
  const id = scene.id;
  // `stillAt`: the still shows the scene before that step (default: the start). A scene whose
  // first steps are small shuffles — the cars edging apart for a Rettungsgasse — reads better
  // as the moment that matters, with the steps before it in the list below.
  const at = scene.stillAt ?? 0;
  const shown = scene.actors.map((a) => ({ ...a, ...states[at][a.id] }));
  return `<svg class="fz-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="fz-${id}-t">
    <title id="fz-${id}-t">${esc(scene.title)}</title>
    <defs>
      <marker id="fz-${id}-tip" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#fff" stroke="#0f172a" stroke-width="1"/></marker>
      <marker id="fz-${id}-x" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.6" markerHeight="4.6"><path d="M1 1 L9 9 M9 1 L1 9" stroke="#dc2626" stroke-width="2.6" stroke-linecap="round"/></marker>
    </defs>
    <g class="fz-layout">${draw(scene.options ?? {})}</g>
    <g class="fz-signs">${(scene.signs ?? []).map(signSvg).join("")}</g>
    <g class="fz-props">${(scene.props ?? []).map(propSvg).join("")}</g>
    <g class="fz-arrows">${arrows ? arrowsSvg(scene, states, at) : ""}</g>
    <g class="fz-actors">${shown.map((a, i) => actorSvg(a, id, i)).join("")}</g>
    <g class="fz-hls"></g>
  </svg>`;
}

const NAME = { bruno: "Bruno", quaki: "Quaki", regi: "Regi", hamsti: "Hamsti" };

/**
 * The whole figure: title, replay button, the SVG, step dots and the numbered steps — the
 * markup FahrSzene.astro renders and the quiz pages insert after an answer. `bare` is the
 * picture alone (a question's situation, before it is answered): no arrows, no steps.
 */
export function szeneFigureHtml(scene, { compact = false, bare = false } = {}) {
  const svg = renderSzene(scene, { arrows: !bare });
  if (bare) return `<figure class="fz fz--compact fz--bare" aria-label="Verkehrsszene: ${esc(scene.title)}"><div class="fz-stage">${svg}</div></figure>`;
  const who = (st) => st.speaker ?? "bruno";
  const head = (st) => mascotSvg({ name: who(st), expr: st.expr ?? (st.mark === "falsch" ? "oops" : "happy"), view: "three", size: 26, label: "" });
  const dots = scene.steps.map((_, i) => `<button type="button" class="fz-dot" data-fz-dot="${i}" aria-label="Schritt ${i + 1}"><span>${i + 1}</span></button>`).join("");
  const steps = scene.steps.map((st, i) => `<li class="fz-step${st.mark === "falsch" ? " fz-step--falsch" : ""}" data-fz-step="${i}">
      <span class="fz-num" aria-hidden="true">${i + 1}</span>
      <span class="fz-line"><span class="fz-who"><span class="fz-who-fig" data-mascot-part>${head(st)}</span><b>${NAME[who(st)]}</b></span><span class="fz-say" lang="de">${esc(st.say)}</span></span></li>`).join("");
  return `<figure class="fz${compact ? " fz--compact" : ""}" data-fahrszene aria-label="Verkehrsszene: ${esc(scene.title)}">
    <figcaption class="fz-head"><span class="fz-title">${esc(scene.title)}</span>
      <button type="button" class="fz-replay" data-fz-replay hidden data-i18n="fs.scene.replay">Nochmal ansehen</button></figcaption>
    <div class="fz-stage">${svg}</div>
    <div class="fz-dots" data-fz-dots hidden role="group" aria-label="Schritte" data-i18n-attr="aria-label:fs.scene.steps">${dots}</div>
    <ol class="fz-steps">${steps}</ol>
    <script type="application/json" data-fz-json>${JSON.stringify(scene).replace(/</g, "\\u003c")}</script>
  </figure>`;
}

/** Validation for the check script: layout, actors, step references, sign keys. */
export function checkSzene(scene, signOk) {
  const errs = [];
  if (!LAYOUTS[scene.layout]) errs.push(`Layout „${scene.layout}“ unbekannt`);
  const ids = new Set(scene.actors.map((a) => a.id));
  if (ids.size !== scene.actors.length) errs.push("Actor-ids doppelt");
  const props = new Set((scene.props ?? []).map((p) => p.id));
  for (const a of scene.actors) if (a.driver && !FACE[a.driver]) errs.push(`Fahrer „${a.driver}“ unbekannt`);
  scene.steps.forEach((st, i) => {
    for (const m of movesOf(st)) if (!ids.has(m.who)) errs.push(`Schritt ${i + 1}: „${m.who}“ gibt es nicht`);
    if (st.highlight && !ids.has(st.highlight) && !(scene.signs ?? []).some((s) => s.z === st.highlight) && !props.has(st.highlight)) errs.push(`Schritt ${i + 1}: highlight „${st.highlight}“ unbekannt`);
    for (const k of Object.keys(st.lights ?? {})) if (!props.has(k)) errs.push(`Schritt ${i + 1}: Ampel „${k}“ unbekannt`);
    if (!st.say) errs.push(`Schritt ${i + 1}: ohne „say“ — jeder Schritt braucht seinen Satz`);
  });
  for (const s of scene.signs ?? []) if (!signOk(s.z)) errs.push(`Zeichen „${s.z}“ ohne Datei/Lizenz`);
  return errs;
}
