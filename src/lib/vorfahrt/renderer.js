// Vorfahrt-Flitzer: draws one frame on a Canvas 2D context, in Artikel-Flitzer's look (the same
// pinhole projection, sky, skyline and kerbs; see artikelSprint/renderer.js). The learner's car
// is seen from behind in the right lane; a crossing is a cross road with its sign on the right
// and the other road users around it.

import { RW, LANE_X, CW, Z_FAR } from "./game.js";
import { NO_CROSS_ROAD } from "./rules.js";
import { readTheme } from "../artikelSprint/renderer.js";
import { mascotImage, ready } from "../mascotImage.js";
import { reducedMotion } from "../spieleEinstellungen.js";

const CAM_D = 9;
const HOUSE = [["#fde68a", "#f59e0b"], ["#bfdbfe", "#3b82f6"], ["#fecaca", "#ef4444"], ["#e9d5ff", "#8b5cf6"], ["#e2e8f0", "#64748b"]];

export function createRenderer(canvas) {
  const quaki = mascotImage("quaki");
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, k = 1, cx = 0, horizon = 0, ground = 0;
  let theme = readTheme(canvas);
  let skyline = [];
  // Reduced motion: no screen shake, no sideways whip pan, a calm flash, a steady blue light.
  let calm = reducedMotion();
  try { matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => { calm = reducedMotion(); }); } catch {}

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    k = Math.min((w * 0.94) / (2 * RW + 1.6), h * 0.13);
    // The camera sits behind the car, a little to the left: the lane is under it, not the centre line.
    cx = w / 2 - LANE_X * k * 0.55;
    horizon = h * 0.36;
    // The car stands above the two driving buttons.
    ground = h * 0.8;
    theme = readTheme(canvas);
    skyline = [];
    let seed = 11;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let x = -w; x < w * 2 + 40; ) {
      const bw = 18 + rnd() * 34;
      skyline.push({ x, w: bw, h: 14 + rnd() * 46, win: rnd() > 0.4 });
      x += bw + 2 + rnd() * 6;
    }
  }

  const proj = (x, z, y = 0) => {
    const p = CAM_D / (CAM_D + Math.max(z, -CAM_D + 0.5));
    return { x: cx + x * k * p, y: horizon + (ground - horizon) * p - y * k * p, p };
  };

  function quad(a, b, c, d, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
  /** A flat rectangle on the road, x1..x2 across and z1..z2 along. */
  const flat = (x1, x2, z1, z2, fill) => {
    if (z2 < -3 || z1 > Z_FAR) return;
    z1 = Math.max(z1, -3); z2 = Math.min(z2, Z_FAR);
    quad(proj(x1, z1), proj(x2, z1), proj(x2, z2), proj(x1, z2), fill);
  };

  function roundRect(x, y, rw, rh, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, rw, rh, Math.max(0, r));
    else ctx.rect(x, y, rw, rh);
  }

  /** A box standing at (x, z), `y0` above the ground; returns its front face's corners. */
  function box(x, z, bw, bh, depth, front, top, side, y0 = 0) {
    const l = x - bw / 2, r = x + bw / 2;
    const f1 = proj(l, z, y0), f2 = proj(r, z, y0), f3 = proj(r, z, y0 + bh), f4 = proj(l, z, y0 + bh);
    const b3 = proj(r, z + depth, y0 + bh), b4 = proj(l, z + depth, y0 + bh);
    const cam = cx; // the side facing the camera
    if (f2.x < cam) quad(f2, proj(r, z + depth, y0), b3, f3, side);
    else if (f1.x > cam) quad(f1, proj(l, z + depth, y0), b4, f4, side);
    if (f4.y > horizon) quad(f4, f3, b3, b4, top);
    quad(f1, f2, f3, f4, front);
    return { f1, f2, f3, f4 };
  }

  function drawBackground(s) {
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#9be7dc");
    sky.addColorStop(1, "#f3fbf9");
    ctx.fillStyle = sky;
    ctx.fillRect(-w, 0, w * 3, horizon + 1);
    ctx.fillStyle = "#ffd36b";
    ctx.beginPath();
    ctx.arc(w * 0.8, horizon * 0.42, Math.min(w, h) * 0.06, 0, Math.PI * 2);
    ctx.fill();
    const off = ((s.dist * 0.15 + s.skyOff) % w + w) % w;
    ctx.fillStyle = "#7fbfb7";
    for (const b of skyline) ctx.fillRect(b.x - off, horizon - b.h, b.w, b.h);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (const b of skyline) {
      if (!b.win) continue;
      const bx = b.x - off;
      for (let yy = horizon - b.h + 5; yy < horizon - 6; yy += 8)
        for (let xx = bx + 4; xx < bx + b.w - 5; xx += 7) ctx.fillRect(xx, yy, 3, 3);
    }
    const g = ctx.createLinearGradient(0, horizon, 0, h);
    g.addColorStop(0, "#9fd99a");
    g.addColorStop(1, "#5fb85f");
    ctx.fillStyle = g;
    ctx.fillRect(-w, horizon, w * 3, h - horizon);
  }

  /** A circle lying on the ground, centre (x, z), as a polygon through the projection. */
  function disc(x, z, r, fill, stroke) {
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const zz = z + Math.sin(a) * r;
      if (zz < -2.5) continue;
      const p = proj(x + Math.cos(a) * r, zz);
      ctx[first ? "moveTo" : "lineTo"](p.x, p.y);
      first = false;
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  /** The stretches of main road between crossings, and each crossing's cross road. */
  function drawRoad(s) {
    const near = -3, far = Z_FAR;
    const crossing = s.crossings.filter((x) => !NO_CROSS_ROAD.has(x.c.control));
    const holes = crossing.map((x) => [x.pos - s.dist, x.pos - s.dist + CW]);
    // Pavement both sides, then the asphalt.
    flat(-RW - 1.4, -RW, near, far, "#cbd5e1");
    flat(RW, RW + 1.4, near, far, "#cbd5e1");
    flat(-RW, RW, near, far, "#475569");
    for (const [i, [z1, z2]] of holes.entries()) {
      const ctl = crossing[i].c.control;
      if (ctl === "bahn") {
        // Rails on gravel instead of a road: sleepers, then the two rails.
        flat(-80, 80, z1, z2, "#a8a29e");
        for (let x = -60; x < 60; x += 1.1) flat(x, x + 0.45, z1 + 1.2, z2 - 1.2, "#78716c");
        for (const rz of [z1 + 1.6, z2 - 1.6]) flat(-80, 80, rz - 0.1, rz + 0.1, "#334155");
        continue;
      }
      // The cross road and its pavements, wide enough to reach the screen's edges.
      flat(-80, 80, z1 - 1.4, z1, "#cbd5e1");
      flat(-80, 80, z2, z2 + 1.4, "#cbd5e1");
      flat(-80, 80, z1, z2, "#475569");

      // Its centre line, dashed, outside the junction
      for (let x = RW + 1; x < 60; x += 3) {
        flat(x, x + 1.5, z1 + CW / 2 - 0.08, z1 + CW / 2 + 0.08, "rgba(255,255,255,.75)");
        flat(-x - 1.5, -x, z1 + CW / 2 - 0.08, z1 + CW / 2 + 0.08, "rgba(255,255,255,.75)");
      }
    }
    // Kerb stones in the accent colour, as on the sprint track, broken at the crossings.
    const seg = 3;
    const start = -(s.dist % (seg * 2));
    for (let z = start + near; z < far; z += seg * 2) {
      const z1 = z, z2 = z + seg;
      if (holes.some(([a, b]) => z2 > a - 1.4 && z1 < b + 1.4)) continue;
      flat(-RW - 0.25, -RW, z1, z2, theme.accent);
      flat(RW, RW + 0.25, z1, z2, theme.accent);
    }
    // Centre line: dashes, solid shortly before a crossing.
    for (let z = start + near; z < far; z += seg * 2) {
      if (holes.some(([a, b]) => z + seg > a - 1 && z < b + 1)) continue;
      flat(-0.07, 0.07, z, z + seg, "rgba(255,255,255,.8)");
    }
    for (const x of s.crossings) {
      const z = x.pos - s.dist;
      if (x.c.control === "kreisel") {
        // The circle beyond the entry, over the road's markings: the ring, then the green island.
        disc(0, z + CW + 5, 10, "#475569");
        disc(0, z + CW + 5, 5.2, "#86c96f", "#f8fafc");
      }
      if (x.c.control === "zebra") {
        // Zebra stripes across the road, and the blue sign's twin on the left.
        for (let sx = -RW + 0.2; sx < RW - 0.2; sx += 0.9) flat(sx, sx + 0.5, z - 4, z - 1.6, "#f8fafc");
        continue;
      }
      if (x.c.control === "eng208" || x.c.control === "eng308") {
        // The narrow spot: red-and-white barriers on both sides, eating into the road.
        for (let sz = z; sz < z + 10; sz += 1) {
          const col = Math.floor(sz - z) % 2 ? "#f8fafc" : "#dc2626";
          flat(-RW, -RW + 0.7, sz, sz + 1, col);
          flat(RW - 0.7, RW, sz, sz + 1, col);
        }
        continue;
      }
      // Stop or give-way line in the learner's lane: solid for Stop, at lights and rails, dashed (shark teeth) for give way
      if (["stop", "rot", "gruen", "gelb", "pfeil", "bahn"].includes(x.c.control)) flat(0, RW, z - 0.55, z - 0.25, "#f8fafc");
      else if (x.c.control === "achten" || x.c.control === "kreisel") for (let sx = 0.1; sx < RW; sx += 0.6) flat(sx, sx + 0.35, z - 0.5, z - 0.3, "#f8fafc");
      // Pedestrian crossing on the side road where a pedestrian walks
      if (x.c.ped) {
        const dir = x.c.turn === "left" ? -1 : 1;
        for (let sz = z + 0.2; sz < z + CW - 0.2; sz += 0.9) flat(dir > 0 ? RW + 0.6 : -RW - 2.2, dir > 0 ? RW + 2.2 : -RW - 0.6, sz, sz + 0.5, "#f8fafc");
      }
    }
    const haze = ctx.createLinearGradient(0, horizon, 0, horizon + (ground - horizon) * 0.18);
    haze.addColorStop(0, "rgba(243,251,249,.95)");
    haze.addColorStop(1, "rgba(243,251,249,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(-w, horizon, w * 3, (ground - horizon) * 0.18);
  }

  function drawHouse(d, z) {
    const [wall, roof] = HOUSE[d.hue];
    if (d.tree) {
      const trunk = proj(d.x, z, 0), top = proj(d.x, z, 1.4);
      ctx.fillStyle = "#7c5a3a";
      ctx.fillRect(trunk.x - 0.12 * k * trunk.p, top.y, 0.24 * k * trunk.p, trunk.y - top.y);
      const c = proj(d.x, z, 2.4);
      ctx.fillStyle = "#3f9d4a";
      ctx.beginPath(); ctx.arc(c.x, c.y, 1.3 * k * c.p, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const { f1, f2, f4 } = box(d.x, z, d.w, d.h, d.d, wall, roof, shade(wall));
    const fw = f2.x - f1.x, fh = f1.y - f4.y;
    if (fw > 14) {
      ctx.fillStyle = "rgba(30,41,59,.55)";
      for (let i = 0; i < 2; i++) for (let j = 0; j < Math.floor(d.h / 1.4); j++) {
        ctx.fillRect(f4.x + fw * (0.2 + i * 0.4), f4.y + fh * (0.12 + j * 0.3), fw * 0.18, fh * 0.14);
      }
    }
  }
  const shade = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.round(v * 0.78);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };

  // ---- Signs -----------------------------------------------------------------------------
  function post(x, z, top) {
    const a = proj(x - 0.06, z, 0), b = proj(x + 0.06, z, top);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(a.x, b.y, Math.max(1, b.x - a.x), a.y - b.y);
  }

  function drawSign(xr, s) {
    const c = xr.c;
    if (c.control === "rvl") return;
    const z = xr.pos - s.dist - (c.control === "zebra" ? 4.6 : 2.2);
    // Only the next crossing's sign: a farther one would stand right behind it on screen.
    if (z < -2.5 || z > 75) return;
    const x = RW + 0.9;
    if (["rot", "gruen", "gelb", "pfeil"].includes(c.control)) {
      drawLight(x, z, c.control === "pfeil" ? "rot" : c.control);
      if (c.control === "pfeil") drawGreenArrow(x, z);
      return;
    }
    if (c.control === "bahn") return drawRail(x, z, c.train, s.t);
    post(x, z, 2.4);
    const m = proj(x, z, 3.0);
    const r = 0.75 * k * m.p;
    if (r < 1.2) return;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.lineJoin = "round";
    if (c.control === "hauptstrasse") {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#fff"; ctx.fillRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44);
      ctx.fillStyle = "#facc15"; ctx.fillRect(-r * 0.5, -r * 0.5, r, r);
      ctx.strokeStyle = "#1e293b"; ctx.lineWidth = Math.max(1, r * 0.04); ctx.strokeRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44);
    } else if (c.control === "naechste" || c.control === "achten") {
      const down = c.control === "achten";
      tri(r, down, "#dc2626", "#fff");
      if (!down) {
        // The black cross of „Vorfahrt an der nächsten Kreuzung“: a thick upright, a thinner bar.
        ctx.fillStyle = "#111827";
        ctx.fillRect(-r * 0.09, -r * 0.3, r * 0.18, r * 0.72);
        ctx.fillRect(-r * 0.3, -r * 0.02, r * 0.6, r * 0.12);
      }
    } else if (c.control === "stop") {
      ctx.fillStyle = "#fff";
      oct(r * 1.02);
      ctx.fillStyle = "#dc2626";
      oct(r * 0.9);
      if (r > 6) {
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${Math.round(r * 0.55)}px ${theme.font}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("STOP", 0, r * 0.03);
      }
    } else if (c.control === "kreisel") {
      // Z. 215 above Z. 205: the blue circle with three arrows going round, the give-way triangle under it.
      const cy = -r * 0.35;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, cy, r * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2563eb"; ctx.beginPath(); ctx.arc(0, cy, r * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineWidth = Math.max(1, r * 0.13); ctx.lineCap = "butt";
      for (let i = 0; i < 3; i++) {
        // Anticlockwise, as the traffic goes: each arc ends in an arrow head.
        const a0 = (i * 2 * Math.PI) / 3, a1 = a0 - 1.5;
        ctx.beginPath(); ctx.arc(0, cy, r * 0.48, a0, a1, true); ctx.stroke();
        const hx = Math.cos(a1) * r * 0.48, hy = cy + Math.sin(a1) * r * 0.48;
        const tx = Math.sin(a1), ty = -Math.cos(a1); // the direction of travel at the end
        ctx.beginPath();
        ctx.moveTo(hx + tx * r * 0.22, hy + ty * r * 0.22);
        ctx.lineTo(hx - ty * r * 0.16, hy + tx * r * 0.16);
        ctx.lineTo(hx + ty * r * 0.16, hy - tx * r * 0.16);
        ctx.closePath(); ctx.fill();
      }
      ctx.translate(0, r * 1.15);
      tri(r * 0.6, true, "#dc2626", "#fff");
    } else if (c.control === "eng208") {
      // Z. 208: red rim, the red arrow (yours) up, the black one (theirs) down.
      ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill();
      arrow(-r * 0.25, r, true, "#dc2626");
      arrow(r * 0.25, r, false, "#111827");
    } else if (c.control === "eng308") {
      // Z. 308: blue square, the white arrow (yours) up, the red one (theirs) down.
      ctx.fillStyle = "#fff"; ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
      ctx.fillStyle = "#2563eb"; ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
      arrow(-r * 0.25, r, true, "#fff");
      arrow(r * 0.25, r, false, "#dc2626");
    } else if (c.control === "zebra") {
      ctx.fillStyle = "#fff"; ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
      ctx.fillStyle = "#2563eb"; ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
      tri(r * 0.62, false, "#fff", "#fff");
      if (r > 5) walker(0, r * 0.12, r * 0.55, "#111827");
    }
    ctx.restore();
  }
  /** An upright arrow on a sign, `up` or down, centred at (x, 0). */
  function arrow(x, r, up, col) {
    const d = up ? -1 : 1;
    ctx.fillStyle = col;
    ctx.fillRect(x - r * 0.05, -r * 0.4, r * 0.1, r * 0.8);
    ctx.beginPath();
    ctx.moveTo(x, d * r * 0.55); ctx.lineTo(x - r * 0.17, d * r * 0.25); ctx.lineTo(x + r * 0.17, d * r * 0.25);
    ctx.closePath(); ctx.fill();
  }
  /** Z. 720 beside the light: a black plate with a green arrow to the right. */
  function drawGreenArrow(x, z) {
    const a = proj(x - 0.95, z, 2.9), b = proj(x - 0.5, z, 2.45);
    const bw = b.x - a.x, bh = b.y - a.y;
    if (bw < 2) return;
    ctx.fillStyle = "#111827"; roundRect(a.x, a.y, bw, bh, bw * 0.15); ctx.fill();
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(a.x + bw * 0.18, a.y + bh * 0.42, bw * 0.4, bh * 0.16);
    ctx.beginPath(); ctx.moveTo(a.x + bw * 0.85, a.y + bh * 0.5); ctx.lineTo(a.x + bw * 0.55, a.y + bh * 0.25); ctx.lineTo(a.x + bw * 0.55, a.y + bh * 0.75); ctx.closePath(); ctx.fill();
  }
  /** Z. 201, the Andreaskreuz, with the red light under it that flashes while a train comes. */
  function drawRail(x, z, train, t) {
    post(x, z, 3.2);
    const m = proj(x, z, 3.4);
    const r = 0.8 * k * m.p;
    if (r < 1.2) return;
    ctx.save();
    ctx.translate(m.x, m.y);
    for (const rot of [Math.PI / 4, -Math.PI / 4]) {
      ctx.save(); ctx.rotate(rot);
      ctx.fillStyle = "#dc2626"; ctx.fillRect(-r, -r * 0.16, r * 2, r * 0.32);
      ctx.fillStyle = "#fff"; ctx.fillRect(-r * 0.92, -r * 0.09, r * 1.84, r * 0.18);
      ctx.restore();
    }
    const on = train && (calm || Math.floor(t * 4) % 2 === 0);
    ctx.fillStyle = "#1e293b"; roundRect(-r * 0.32, r * 0.9, r * 0.64, r * 0.64, r * 0.15); ctx.fill();
    ctx.fillStyle = on ? "#ef4444" : "#450a0a";
    if (on) { ctx.shadowColor = "#ef4444"; ctx.shadowBlur = r * 0.9; }
    ctx.beginPath(); ctx.arc(0, r * 1.22, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  function tri(r, down, rim, fill) {
    const p = (s) => {
      ctx.beginPath();
      const d = down ? -1 : 1;
      ctx.moveTo(0, -d * s); ctx.lineTo(s * 0.92, d * s * 0.62); ctx.lineTo(-s * 0.92, d * s * 0.62);
      ctx.closePath();
    };
    ctx.fillStyle = rim; p(r); ctx.fill();
    ctx.fillStyle = fill; p(r * 0.62); ctx.fill();
  }
  function oct(r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }
  function walker(x, y, s, col) {
    ctx.fillStyle = col; ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, s * 0.14); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.4); ctx.lineTo(x, y + s * 0.05);
    ctx.moveTo(x, y + s * 0.05); ctx.lineTo(x - s * 0.22, y + s * 0.42);
    ctx.moveTo(x, y + s * 0.05); ctx.lineTo(x + s * 0.2, y + s * 0.42);
    ctx.moveTo(x - s * 0.22, y - s * 0.15); ctx.lineTo(x + s * 0.22, y - s * 0.25);
    ctx.stroke();
  }

  /** @param {"rot" | "gelb" | "gruen"} state */
  function drawLight(x, z, state) {
    post(x, z, 2.2);
    const a = proj(x - 0.42, z, 4.1), b = proj(x + 0.42, z, 2.2);
    const bw = b.x - a.x, bh = b.y - a.y;
    if (bw < 2) return;
    ctx.fillStyle = "#1e293b";
    roundRect(a.x, a.y, bw, bh, bw * 0.25); ctx.fill();
    const lamps = ["#ef4444", "#facc15", "#22c55e"];
    for (let i = 0; i < 3; i++) {
      const on = i === ["rot", "gelb", "gruen"].indexOf(state);
      const cy = a.y + bh * (0.18 + i * 0.32);
      ctx.fillStyle = on ? lamps[i] : "#334155";
      if (on) { ctx.shadowColor = lamps[i]; ctx.shadowBlur = bw * 0.8; }
      ctx.beginPath(); ctx.arc(a.x + bw / 2, cy, bw * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ---- Road users ------------------------------------------------------------------------
  /** A car seen from the side (cross traffic) or from the front (oncoming). */
  function drawCar(a, z, t) {
    const sideView = a.axis === "x";
    const bw = sideView ? 2.8 : 1.7, depth = sideView ? 1.5 : 3;
    const col = a.color;
    const { f1, f2, f4 } = box(a.x, z, bw, 0.75, depth, col, col, shade(col), 0.2);
    // The cabin, set back on a side view towards the car's rear.
    const cabX = sideView ? a.x + (a.to > a.x ? -0.25 : 0.25) : a.x;
    const cab = box(cabX, z + (sideView ? 0.15 : 0.6), sideView ? 1.6 : 1.4, 0.55, sideView ? 1.2 : 1.6, shade(col), col, shade(col), 0.95);
    const fw = f2.x - f1.x, fh = f1.y - f4.y;
    const cw = cab.f2.x - cab.f1.x, ch = cab.f1.y - cab.f4.y;
    ctx.fillStyle = "rgba(30,41,59,.85)";
    if (cw > 3) roundRect(cab.f4.x + cw * 0.1, cab.f4.y + ch * 0.15, cw * 0.8, ch * 0.75, ch * 0.2), ctx.fill();
    if (sideView) {
      ctx.fillStyle = "#111827";
      const wr = fh * 0.42;
      ctx.beginPath();
      ctx.arc(f1.x + fw * 0.2, f1.y, wr, 0, Math.PI * 2);
      ctx.arc(f1.x + fw * 0.8, f1.y, wr, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#fef9c3";
      ctx.beginPath();
      ctx.arc(f4.x + fw * 0.16, f4.y + fh * 0.4, fw * 0.08, 0, Math.PI * 2);
      ctx.arc(f4.x + fw * 0.84, f4.y + fh * 0.4, fw * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.fillRect(f1.x + fw * 0.05, f1.y - fh * 0.08, fw * 0.16, fh * 0.3);
      ctx.fillRect(f1.x + fw * 0.79, f1.y - fh * 0.08, fw * 0.16, fh * 0.3);
    }
    if (a.kind === "amb") {
      // Red band and the blue light, flashing.
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(f4.x, f4.y + fh * 0.45, fw, fh * 0.2);
      const l = proj(cabX, z + 0.6, 1.6);
      const on = calm || Math.floor(t * 8) % 2 === 0;
      ctx.fillStyle = on ? "#3b82f6" : "#1e3a8a";
      if (on) { ctx.shadowColor = "#60a5fa"; ctx.shadowBlur = 20 * l.p; }
      ctx.fillRect(l.x - 0.3 * k * l.p, l.y - 0.18 * k * l.p, 0.6 * k * l.p, 0.2 * k * l.p);
      ctx.shadowBlur = 0;
    }
  }

  /** A train from the side: locomotive and two coaches, as long boxes. */
  function drawTrain(a, z) {
    const back = Math.sign(a.x - a.to) || 1;
    for (let i = 2; i >= 0; i--) {
      const col = i === 0 ? "#dc2626" : "#e5e7eb";
      const f = box(a.x + i * 7.4 * back, z, 7, 2.3, 2.6, col, col, shade(col), 0.3);
      const fw = f.f2.x - f.f1.x, fh = f.f1.y - f.f4.y;
      ctx.fillStyle = "rgba(30,41,59,.8)";
      for (let wx = 0.08; wx < 0.9; wx += 0.2) ctx.fillRect(f.f4.x + fw * wx, f.f4.y + fh * 0.15, fw * 0.12, fh * 0.3);
      ctx.fillStyle = "#dc2626"; ctx.fillRect(f.f4.x, f.f4.y + fh * 0.62, fw, fh * 0.1);
    }
  }

  function drawPed(a, z, t) {
    const base = proj(a.x, z, 0);
    const s = 1.75 * k * base.p;
    if (s < 3) return;
    const walking = a.state === "go" || (a.state === "come" && Math.abs(a[a.axis] - a.wait) > 0.05);
    const swing = walking ? Math.sin(t * 9) * 0.18 : 0;
    ctx.fillStyle = "rgba(15,23,42,.2)";
    ctx.beginPath(); ctx.ellipse(base.x, base.y, s * 0.18, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1e3a8a"; ctx.lineCap = "round"; ctx.lineWidth = s * 0.09;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y - s * 0.48); ctx.lineTo(base.x - s * swing, base.y);
    ctx.moveTo(base.x, base.y - s * 0.48); ctx.lineTo(base.x + s * swing, base.y);
    ctx.stroke();
    ctx.fillStyle = a.color;
    roundRect(base.x - s * 0.12, base.y - s * 0.85, s * 0.24, s * 0.42, s * 0.06); ctx.fill();
    ctx.fillStyle = "#e0ac80";
    ctx.beginPath(); ctx.arc(base.x, base.y - s * 0.94, s * 0.1, 0, Math.PI * 2); ctx.fill();
  }

  /** The learner's car from behind: brake lights while braking, the indicator before a turn. */
  function drawPlayer(s) {
    const u = k;
    const b = proj(LANE_X, 0, 0);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = "rgba(15,23,42,.3)";
    ctx.beginPath(); ctx.ellipse(0, 0, u * 0.98, u * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    // Wheels
    ctx.fillStyle = "#0f172a";
    roundRect(-0.86 * u, -0.28 * u, 0.3 * u, 0.3 * u, 0.06 * u); ctx.fill();
    roundRect(0.56 * u, -0.28 * u, 0.3 * u, 0.3 * u, 0.06 * u); ctx.fill();
    // Cabin and rear window
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.moveTo(-0.72 * u, -0.95 * u); ctx.lineTo(-0.52 * u, -1.42 * u);
    ctx.lineTo(0.52 * u, -1.42 * u); ctx.lineTo(0.72 * u, -0.95 * u);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(-0.6 * u, -0.98 * u); ctx.lineTo(-0.46 * u, -1.34 * u);
    ctx.lineTo(0.46 * u, -1.34 * u); ctx.lineTo(0.6 * u, -0.98 * u);
    ctx.closePath(); ctx.fill();
    // Quaki at the wheel (Quaki kreuzt), seen through the rear window.
    if (ready(quaki)) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(quaki, -0.42 * u, -1.5 * u, 0.84 * u, 0.84 * u);
      ctx.restore();
    }
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.moveTo(-0.3 * u, -1.34 * u); ctx.lineTo(-0.12 * u, -1.34 * u); ctx.lineTo(-0.3 * u, -0.98 * u); ctx.lineTo(-0.48 * u, -0.98 * u);
    ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = "#dc2626";
    roundRect(-0.9 * u, -1.0 * u, 1.8 * u, 0.78 * u, 0.16 * u); ctx.fill();
    ctx.fillStyle = "#1f2937";
    roundRect(-0.88 * u, -0.34 * u, 1.76 * u, 0.14 * u, 0.06 * u); ctx.fill();
    // Number plate
    ctx.fillStyle = "#f8fafc";
    roundRect(-0.3 * u, -0.62 * u, 0.6 * u, 0.18 * u, 0.03 * u); ctx.fill();
    ctx.fillStyle = "#1d4ed8"; ctx.fillRect(-0.3 * u, -0.62 * u, 0.07 * u, 0.18 * u);
    if (u > 30) {
      ctx.fillStyle = "#111827";
      ctx.font = `700 ${Math.round(0.13 * u)}px ${theme.body}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("DA 2026", 0.03 * u, -0.53 * u);
    }
    // Rear lights: dim, or bright and glowing while braking
    const brake = s.braking;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = brake ? "#ff2d2d" : "#7f1d1d";
      if (brake) { ctx.shadowColor = "#ff4d4d"; ctx.shadowBlur = u * 0.5; }
      roundRect(sx > 0 ? 0.52 * u : -0.82 * u, -0.9 * u, 0.3 * u, 0.16 * u, 0.04 * u); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // The indicator the learner set (the ◀ / ▶ buttons), blinking
    if (s.blink && Math.floor(s.t * 3) % 2 === 0) {
      const sx = s.blink === "left" ? -1 : 1;
      ctx.fillStyle = "#f59e0b"; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = u * 0.4;
      roundRect(sx > 0 ? 0.62 * u : -0.84 * u, -0.72 * u, 0.22 * u, 0.12 * u, 0.03 * u); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function render(s) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let pan = 0, white = 0;
    if (s.turn) {
      const t = s.turn.t;
      const e = t < 0.5 ? t * 2 : (1 - t) * 2; // 0 → 1 → 0
      pan = calm ? 0 : -s.turn.dir * e * e * w * 0.7 * (t < 0.5 ? 1 : -1);
      white = Math.sin(Math.PI * Math.min(1, t)) * (calm ? 0.5 : 0.85);
    }
    if (s.shake > 0 && !calm) {
      const a = s.shake * 12;
      ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
    }
    ctx.translate(pan, 0);
    drawBackground(s);
    drawRoad(s);

    // No houses on a crossing, nor on a Kreisverkehr's circle beyond it.
    const crossZones = s.crossings.filter((x) => !NO_CROSS_ROAD.has(x.c.control))
      .map((x) => [x.pos - s.dist - 8, x.pos - s.dist + CW + (x.c.control === "kreisel" ? 18 : 8)]);
    const list = [];
    for (const d of s.decor) {
      const z = d.pos - s.dist;
      if (z > Z_FAR || z < 4 || crossZones.some(([a, b]) => z + d.d > a && z < b)) continue;
      list.push({ z: z + d.d / 2, draw: () => drawHouse(d, z) });
    }
    for (const x of s.crossings) {
      list.push({ z: x.pos - s.dist - 2.2, draw: () => drawSign(x, s) });
      for (const a of x.actors) {
        if (a.state === "gone") continue;
        const z = a.z - s.dist;
        if (z > Z_FAR - 10 || z < -3) continue;
        list.push({ z, draw: () => (a.kind === "ped" ? drawPed(a, z, s.t) : a.kind === "train" ? drawTrain(a, z) : drawCar(a, z, s.t)) });
      }
    }
    list.sort((a, b) => b.z - a.z);
    for (const o of list) if (o.z >= -0.3) o.draw();
    drawPlayer(s);
    for (const o of list) if (o.z < -0.3) o.draw();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (white > 0) {
      ctx.fillStyle = `rgba(243,251,249,${white})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (s.flash) {
      // A right one is a light green wink, a crash a hard red flash.
      const peak = s.flash.color === "ok" ? (calm ? 0.08 : 0.18) : (calm ? 0.16 : 0.4);
      const a = Math.max(0, peak * (1 - s.flash.t / 0.6));
      ctx.fillStyle = s.flash.color === "ok" ? `rgba(22,163,74,${a})` : `rgba(220,38,38,${a})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  resize();
  return { render, resize };
}
