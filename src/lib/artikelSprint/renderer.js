// Artikel-Flitzer: draws one frame on a Canvas 2D context. A simple pinhole projection:
// p = CAM_D / (CAM_D + z) scales both the lane offset and an object's height, and the ground
// line runs from the horizon (p → 0) down to the player's feet (p = 1).

import { LANE_W, Z_FAR } from "./game.js";
import { reducedMotion } from "../spieleEinstellungen.js";

const CAM_D = 9;
// Masculine articles blue, feminine red (the theme keys keep their old names: der = blue,
// die = red), the same as the Wortschatz. "el agua" shows EL in blue: the box is the article.
const ART = { EL: "der", LOS: "der", LA: "die", LAS: "die" };
// The trap box of the five-lane road (LO) and anything else without an article colour.
const NEUTRAL_BOX = "#64748b";

/** Colours from the site's tokens, so the gates use the same el/la hues as the Wortschatz. */
export function readTheme(el) {
  const cs = getComputedStyle(el);
  const v = (n, f) => cs.getPropertyValue(n).trim() || f;
  return {
    der: v("--info", "#2563eb"),
    die: v("--danger", "#c1462f"),
    das: v("--success", "#047857"),
    brand: v("--brand-blue", "#0d9488"),
    brandLight: v("--blue-300", "#5eead4"),
    accent: v("--accent", "#f97316"),
    ok: "#16a34a",
    bad: "#dc2626",
    font: v("--font-display", "sans-serif"),
    body: v("--font-body", "sans-serif"),
  };
}

export function createRenderer(canvas) {
  // "Reduce motion": no screen shake, no kart shudder, a faint colour wash instead of a flash, and
  // the speed lines of a warp stand still and thin out. Asked per frame, so a change in the system
  // setting counts straight away.
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, k = 1, cx = 0, horizon = 0, ground = 0;
  let theme = readTheme(canvas);
  let skyline = [];
  // Lanes on the road: 3, or 5 in a race room. The scale fits the road to the width.
  let N = 3;
  const halfRoad = () => LANE_W * (N / 2);

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // Pixels per world unit at the player: the track fills the width on a phone and is
    // capped on a wide screen so the runner does not become a giant.
    k = Math.min((w * 0.94) / (N * LANE_W), h * 0.13);
    cx = w / 2;
    horizon = h * 0.34;
    ground = h * 0.9;
    theme = readTheme(canvas);
    // A fixed, seeded skyline: the same every resize, no flicker.
    skyline = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let x = -20; x < w + 40; ) {
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

  function roundRect(x, y, rw, rh, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, rw, rh, r);
    else ctx.rect(x, y, rw, rh);
  }

  function drawBackground(s) {
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#9be7dc");
    sky.addColorStop(1, "#f3fbf9");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 1);
    // Sun
    ctx.fillStyle = "#ffd36b";
    ctx.beginPath();
    ctx.arc(w * 0.8, horizon * 0.42, Math.min(w, h) * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // Skyline, drifting very slowly with distance
    const off = (s.dist * 0.15) % 60;
    ctx.fillStyle = "#7fbfb7";
    for (const b of skyline) {
      const bx = b.x - off;
      ctx.fillRect(bx, horizon - b.h, b.w, b.h);
    }
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (const b of skyline) {
      if (!b.win) continue;
      const bx = b.x - off;
      for (let yy = horizon - b.h + 5; yy < horizon - 6; yy += 8)
        for (let xx = bx + 4; xx < bx + b.w - 5; xx += 7) ctx.fillRect(xx, yy, 3, 3);
    }
    // Grass
    const g = ctx.createLinearGradient(0, horizon, 0, h);
    g.addColorStop(0, "#9fd99a");
    g.addColorStop(1, "#5fb85f");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, w, h - horizon);
  }

  function drawTrack(s) {
    const half = halfRoad();
    const near = -3, far = Z_FAR;
    // Kerbs
    quad(proj(-half - 0.5, near), proj(-half, near), proj(-half, far), proj(-half - 0.5, far), "#e2e8f0");
    quad(proj(half, near), proj(half + 0.5, near), proj(half + 0.5, far), proj(half, far), "#e2e8f0");
    // Road
    quad(proj(-half, near), proj(half, near), proj(half, far), proj(-half, far), "#475569");
    // Moving stripes: kerb blocks and lane dashes, every 6 units
    const seg = 6;
    const start = -((s.dist % (seg * 2)));
    for (let z = start; z < far; z += seg * 2) {
      const z1 = Math.max(z, near), z2 = Math.min(z + seg, far);
      if (z2 <= z1) continue;
      quad(proj(-half - 0.5, z1), proj(-half, z1), proj(-half, z2), proj(-half - 0.5, z2), theme.accent);
      quad(proj(half, z1), proj(half + 0.5, z1), proj(half + 0.5, z2), proj(half, z2), theme.accent);
      for (let i = 1; i < N; i++) {
        const lx = -half + i * LANE_W;
        quad(proj(lx - 0.07, z1), proj(lx + 0.07, z1), proj(lx + 0.07, z2), proj(lx - 0.07, z2), "rgba(255,255,255,.75)");
      }
    }
    // Haze at the far end so things fade in instead of popping up
    const haze = ctx.createLinearGradient(0, horizon, 0, horizon + (ground - horizon) * 0.18);
    haze.addColorStop(0, "rgba(243,251,249,.95)");
    haze.addColorStop(1, "rgba(243,251,249,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon, w, (ground - horizon) * 0.18);
  }

  function box(x, z, bw, bh, depth, front, top, side) {
    const l = x - bw / 2, r = x + bw / 2;
    const f1 = proj(l, z, 0), f2 = proj(r, z, 0), f3 = proj(r, z, bh), f4 = proj(l, z, bh);
    const b3 = proj(r, z + depth, bh), b4 = proj(l, z + depth, bh);
    // Visible side face (towards the centre of the screen)
    if (x < -0.1) quad(f2, proj(r, z + depth, 0), b3, f3, side);
    else if (x > 0.1) quad(f1, proj(l, z + depth, 0), b4, f4, side);
    quad(f4, f3, b3, b4, top);
    quad(f1, f2, f3, f4, front);
    return { f1, f2, f3, f4 };
  }

  function drawCrate(o, z) {
    const x = o.lane * LANE_W;
    const { f1, f2, f3, f4 } = box(x, z, 1.5, 1.0, 1.2, "#c58b4e", "#dcaa72", "#a8713a");
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = Math.max(1, 3 * (f2.x - f1.x) / 80);
    ctx.strokeRect(f4.x, f4.y, f2.x - f1.x, f1.y - f4.y);
    ctx.beginPath();
    ctx.moveTo(f1.x, f1.y); ctx.lineTo(f3.x, f3.y);
    ctx.moveTo(f2.x, f2.y); ctx.lineTo(f4.x, f4.y);
    ctx.stroke();
  }

  function drawBarrier(o, z) {
    const x = o.lane * LANE_W;
    const bw = 2.0;
    // Posts
    for (const px of [x - bw / 2 + 0.1, x + bw / 2 - 0.1]) {
      const a = proj(px - 0.08, z, 0), b = proj(px + 0.08, z, 2.0);
      ctx.fillStyle = "#334155";
      ctx.fillRect(a.x, b.y, b.x - a.x, a.y - b.y);
    }
    // Striped board, high enough to duck under
    stripedBoard(proj(x - bw / 2, z, 2.0), proj(x + bw / 2, z, 1.4), "#fff", theme.die);
  }

  function stripedBoard(tl, br, base, stripeCol) {
    const bwPx = br.x - tl.x, bhPx = br.y - tl.y;
    if (bwPx < 1 || bhPx < 1) return;
    ctx.save();
    roundRect(tl.x, tl.y, bwPx, bhPx, bhPx * 0.2);
    ctx.clip();
    ctx.fillStyle = base;
    ctx.fillRect(tl.x, tl.y, bwPx, bhPx);
    ctx.fillStyle = stripeCol;
    const stripe = Math.max(bhPx * 1.2, 4);
    for (let i = -1; i < bwPx / stripe + 2; i += 2) {
      ctx.beginPath();
      ctx.moveTo(tl.x + i * stripe, br.y);
      ctx.lineTo(tl.x + (i + 1) * stripe, tl.y);
      ctx.lineTo(tl.x + (i + 2) * stripe, tl.y);
      ctx.lineTo(tl.x + (i + 1) * stripe, br.y);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCart(o, z) {
    const x = o.lane * LANE_W;
    const { f1, f2, f4 } = box(x, z, 1.8, 1.9, 2.4, "#f59e0b", "#fcd34d", "#d97706");
    const fw = f2.x - f1.x, fh = f1.y - f4.y;
    // Window band and lights so it reads as a parked cart, not another crate
    ctx.fillStyle = "#1e293b";
    roundRect(f4.x + fw * 0.12, f4.y + fh * 0.12, fw * 0.76, fh * 0.3, fw * 0.05);
    ctx.fill();
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.arc(f4.x + fw * 0.18, f4.y + fh * 0.65, fw * 0.06, 0, Math.PI * 2);
    ctx.arc(f4.x + fw * 0.82, f4.y + fh * 0.65, fw * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    const wr = fw * 0.11;
    ctx.beginPath();
    ctx.arc(f1.x + fw * 0.2, f1.y, wr, Math.PI, 0);
    ctx.arc(f1.x + fw * 0.8, f1.y, wr, Math.PI, 0);
    ctx.fill();
  }

  function drawCoin(o, z, t) {
    const c = proj(o.x ?? o.lane * LANE_W, z, o.y);
    const r = 0.32 * k * c.p;
    if (r < 0.6) return;
    const sx = Math.abs(Math.cos(t * 5 + o.pos));
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, Math.max(r * 0.15, r * sx), r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawHurdle(o, z) {
    const half = halfRoad();
    for (const px of [-half + 0.15, ...Array.from({ length: N - 1 }, (_, i) => -half + (i + 1) * LANE_W), half - 0.15]) {
      const a = proj(px - 0.07, z, 0), b = proj(px + 0.07, z, 0.75);
      ctx.fillStyle = "#334155";
      ctx.fillRect(a.x, b.y, Math.max(1, b.x - a.x), a.y - b.y);
    }
    stripedBoard(proj(-half, z, 0.75), proj(half, z, 0.42), "#f8fafc", theme.accent);
  }

  function drawBeam(o, z) {
    const half = halfRoad();
    for (const px of [-half - 0.15, half + 0.15]) {
      const a = proj(px - 0.12, z, 0), b = proj(px + 0.12, z, 2.0);
      ctx.fillStyle = "#334155";
      ctx.fillRect(a.x, b.y, Math.max(1, b.x - a.x), a.y - b.y);
    }
    stripedBoard(proj(-half - 0.15, z, 2.0), proj(half + 0.15, z, 1.4), "#facc15", "#1e293b");
    // A duck sign in the middle, so the bar reads as "under it" from far away.
    const c = proj(0, z, 1.7);
    const r = 0.22 * k * c.p;
    if (r > 4) {
      ctx.fillStyle = "#1e293b";
      ctx.beginPath(); ctx.arc(c.x, c.y, r * 1.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.font = `800 ${Math.round(r * 1.7)}px ${theme.font}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("↓", c.x, c.y + r * 0.08);
    }
  }

  function drawWarp(o, z, t) {
    const x = o.lane * LANE_W;
    const hw = LANE_W * 0.42, len = 4;
    const glow = o.used ? 0.35 : 0.75 + Math.sin(t * 10) * 0.15;
    quad(proj(x - hw, z), proj(x + hw, z), proj(x + hw, z + len), proj(x - hw, z + len), `rgba(14,165,233,${glow})`);
    // Chevrons pointing down the track, running forward
    const phase = (t * 3) % 1;
    for (let i = 0; i < 3; i++) {
      const cz = z + ((i + phase) / 3) * len * 0.7;
      const tip = proj(x, cz + 0.9), l = proj(x - hw * 0.8, cz), r = proj(x + hw * 0.8, cz);
      const li = proj(x - hw * 0.8, cz + 0.45), ri = proj(x + hw * 0.8, cz + 0.45), tipIn = proj(x, cz + 1.35);
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.beginPath();
      ctx.moveTo(l.x, l.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(r.x, r.y);
      ctx.lineTo(ri.x, ri.y); ctx.lineTo(tipIn.x, tipIn.y); ctx.lineTo(li.x, li.y);
      ctx.closePath(); ctx.fill();
    }
  }

  function drawMystery(o, z, t) {
    const x = o.lane * LANE_W;
    const { f1, f2, f4 } = box(x, z, 1.3, 1.1, 1.2, "#7c3aed", "#a78bfa", "#5b21b6");
    const fw = f2.x - f1.x, fh = f1.y - f4.y;
    ctx.strokeStyle = `rgba(250,204,21,${0.6 + Math.sin(t * 8) * 0.4})`;
    ctx.lineWidth = Math.max(1, fw * 0.05);
    ctx.strokeRect(f4.x, f4.y, fw, fh);
    if (fh > 8) {
      ctx.fillStyle = "#facc15";
      ctx.font = `800 ${Math.round(fh * 0.75)}px ${theme.font}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("?", f4.x + fw / 2, f4.y + fh / 2 + fh * 0.04);
    }
  }

  const ITEM = {
    shield: { c: "#0ea5e9", g: "shield" },
    magnet: { c: "#dc2626", g: "magnet" },
    jump: { c: "#16a34a", g: "↑" },
    double: { c: "#f97316", g: "×2" },
    heart: { c: "#e11d48", g: "♥" },
  };

  function glyph(kind, gx, gy, r) {
    const it = ITEM[kind];
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    if (it.g === "shield") {
      ctx.beginPath();
      ctx.moveTo(gx, gy - r * 0.6);
      ctx.lineTo(gx + r * 0.5, gy - r * 0.38);
      ctx.quadraticCurveTo(gx + r * 0.48, gy + r * 0.35, gx, gy + r * 0.62);
      ctx.quadraticCurveTo(gx - r * 0.48, gy + r * 0.35, gx - r * 0.5, gy - r * 0.38);
      ctx.closePath(); ctx.fill();
    } else if (it.g === "magnet") {
      ctx.lineWidth = r * 0.3;
      ctx.lineCap = "butt";
      ctx.beginPath(); ctx.arc(gx, gy, r * 0.38, 0, Math.PI); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx - r * 0.38, gy); ctx.lineTo(gx - r * 0.38, gy - r * 0.45);
      ctx.moveTo(gx + r * 0.38, gy); ctx.lineTo(gx + r * 0.38, gy - r * 0.45);
      ctx.stroke();
    } else {
      ctx.font = `800 ${Math.round(r * (it.g.length > 1 ? 0.95 : 1.25))}px ${theme.font}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(it.g, gx, gy + r * 0.06);
    }
  }

  function drawItem(o, z, t) {
    const bob = Math.sin(t * 4 + o.pos) * 0.12;
    const c = proj(o.lane * LANE_W, z, o.y + bob);
    const r = 0.42 * k * c.p;
    if (r < 1) return;
    // A shadow on the road, so a high item still shows its lane, and a soft halo.
    const sh = proj(o.lane * LANE_W, z, 0);
    ctx.fillStyle = "rgba(15,23,42,.18)";
    ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 0.9, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.beginPath(); ctx.arc(c.x, c.y, r * (1.3 + Math.sin(t * 6) * 0.08), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ITEM[o.kind].c;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    glyph(o.kind, c.x, c.y, r);
  }

  function drawParticles(s) {
    for (const p of s.particles) {
      const z = p.pos - s.dist;
      if (z < -2.5 || z > Z_FAR) continue;
      const c = proj(p.x, z, p.y);
      const r = Math.max(1.5, 0.13 * k * c.p);
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.c;
      ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawWarpLines(s) {
    const calm = reducedMotion();
    const a = Math.min(1, s.warp * 2);
    ctx.strokeStyle = `rgba(255,255,255,${(calm ? 0.2 : 0.55) * a})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < (calm ? 8 : 26); i++) {
      // Lines streak out of the vanishing point; each one moves with the clock.
      const ang = (i / 26) * Math.PI * 2 + i * 1.7;
      const ph = calm ? 0.35 + (i % 4) * 0.12 : (s.t * 2.2 + i * 0.37) % 1;
      const r1 = 40 + ph * Math.max(w, h) * 0.8, r2 = r1 + 30 + ph * 90;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, horizon + Math.sin(ang) * r1 * 0.6);
      ctx.lineTo(cx + Math.cos(ang) * r2, horizon + Math.sin(ang) * r2 * 0.6);
      ctx.stroke();
    }
  }

  /** An up arrow over the rider while a gate is close and the board is on the ground. */
  function drawJumpCue(s) {
    const g = s.objects.find((o) => o.type === "gate" && !o.done);
    if (!g || s.y > 0.05) return;
    const z = g.pos - s.dist;
    if (z > s.speed * 1.1 || z < 0) return;
    const head = proj(s.x, 0, 2.4 + Math.abs(Math.sin(s.t * 9)) * 0.3);
    const r = 0.32 * k;
    ctx.fillStyle = "rgba(15,23,42,.8)";
    ctx.beginPath(); ctx.arc(head.x, head.y, r, 0, Math.PI * 2); ctx.fill();
    // A solid arrow: the ↑ glyph is a hairline in the display font.
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(head.x, head.y - r * 0.62);
    ctx.lineTo(head.x + r * 0.5, head.y);
    ctx.lineTo(head.x + r * 0.2, head.y);
    ctx.lineTo(head.x + r * 0.2, head.y + r * 0.55);
    ctx.lineTo(head.x - r * 0.2, head.y + r * 0.55);
    ctx.lineTo(head.x - r * 0.2, head.y);
    ctx.lineTo(head.x - r * 0.5, head.y);
    ctx.closePath();
    ctx.fill();
  }

  function fitText(text, maxW, size, weight = 800, family = theme.font) {
    let s = size;
    ctx.font = `${weight} ${s}px ${family}`;
    while (s > 6 && ctx.measureText(text).width > maxW) {
      s -= 1;
      ctx.font = `${weight} ${s}px ${family}`;
    }
    return s;
  }

  function drawGate(o, z, s) {
    const half = halfRoad();
    const top = 3.4;
    const pl = proj(-half - 0.3, z, 0), plT = proj(-half, z, top);
    const pr = proj(half, z, 0), prT = proj(half + 0.3, z, top);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(pl.x, plT.y, plT.x - pl.x, pl.y - plT.y);
    ctx.fillRect(pr.x, prT.y, prT.x - pr.x, pr.y - prT.y);
    const beamA = proj(-half - 0.3, z, top + 0.35), beamB = proj(half + 0.3, z, top);
    ctx.fillStyle = theme.brand;
    ctx.fillRect(beamA.x, beamA.y, beamB.x - beamA.x, beamB.y - beamA.y);

    const isArt = o.q.kind === "artikel";
    for (let i = 0; i < o.q.options.length; i++) {
      const lx = (i - (o.q.options.length - 1) / 2) * LANE_W;
      // The box that was jumped into pops up a little.
      const pop = o.done && i === o.picked ? 0.35 : 0;
      const boxTop = 2.95 + pop, boxBot = 1.95 + pop;
      // Ropes from the beam: the boxes hang, the rider passes underneath without a jump.
      ctx.strokeStyle = "#1e293b";
      for (const rx of [lx - LANE_W * 0.3, lx + LANE_W * 0.3]) {
        const r1 = proj(rx, z, top), r2 = proj(rx, z, boxTop);
        ctx.lineWidth = Math.max(1, 0.05 * k * r1.p);
        ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.stroke();
      }
      const a = proj(lx - LANE_W * 0.42, z, boxTop), b = proj(lx + LANE_W * 0.42, z, boxBot);
      const pw = b.x - a.x, ph = b.y - a.y;
      let fill = isArt ? theme[ART[o.q.options[i]]] ?? NEUTRAL_BOX : theme.brand;
      if (o.done) {
        if (i === o.q.answer) fill = theme.ok;
        else if (i === o.picked) fill = theme.bad;
        else fill = "#94a3b8";
      }
      ctx.fillStyle = fill;
      roundRect(a.x, a.y, pw, ph, ph * 0.18);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = Math.max(1, ph * 0.06);
      ctx.stroke();
      if (ph > 7) {
        const label = o.q.options[i];
        const size = fitText(label, pw * 0.88, Math.round(ph * 0.62));
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `800 ${size}px ${theme.font}`;
        ctx.fillText(label, a.x + pw / 2, a.y + ph / 2 + size * 0.04);
      }
    }
    // The noun on the beam, once it is big enough to read
    const bh = beamB.y - beamA.y;
    if (bh > 9 && !o.done) {
      const size = fitText(o.q.prompt, (beamB.x - beamA.x) * 0.8, Math.round(bh * 0.85));
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(o.q.prompt, cx, beamA.y + bh / 2);
    }
  }

  /**
   * The rider. `g` = another rider in the race room ({ x, y, z, duck, color, name }): drawn at
   * its distance `z`, a little see-through, with its name above on a tag in its own colour.
   */
  function drawPlayer(s, g = null) {
    const lean = g ? 0 : Math.max(-1, Math.min(1, (s.lane * LANE_W - s.x) / LANE_W));
    const px = g ? g.x : s.x, py = g ? g.y : s.y, pz = g ? g.z : 0;
    const shadow = proj(px, pz, 0);
    const u = k * shadow.p; // px per unit at the rider's depth
    ctx.fillStyle = `rgba(15,23,42,${0.28 - Math.min(0.18, py * 0.08)})`;
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, u * (0.62 - py * 0.1), u * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!g && s.invuln > 0 && Math.floor(s.invuln * 12) % 2 === 0) return; // blink after a hit

    const ducking = g ? g.duck && py < 0.5 : s.duck > 0 && py < 0.5;
    const sq = ducking ? 0.62 : 1; // body height factor
    const base = proj(px, pz, py);
    ctx.save();
    if (g) ctx.globalAlpha = 0.82;
    ctx.translate(base.x, base.y);
    ctx.rotate(lean * 0.18);

    // Bruno Kart: Bruno in his kart, seen from behind and shaded so it reads as 3D, the way the
    // skater before him did. A rider of a race room drives a kart in its own colour. After a
    // hit (s.ouch) the kart shudders and stars circle over his head.
    const kartCol = g ? g.color : "#e11d48";
    const now = performance.now() / 1000;
    const ouch = !g && s.ouch > 0 ? s.ouch : 0;
    const shudder = ouch && !reducedMotion();
    if (shudder) ctx.rotate(Math.sin(now * 38) * 0.09 * ouch);
    const lin = (y0, y1, stops) => {
      const gr = ctx.createLinearGradient(0, y0 * u, 0, y1 * u);
      for (const [o, c] of stops) gr.addColorStop(o, c);
      return gr;
    };
    const ball = (x, y, r, light, dark) => {
      const gr = ctx.createRadialGradient((x - r * 0.35) * u, (y - r * 0.4) * u, r * 0.1 * u, x * u, y * u, r * u);
      gr.addColorStop(0, light);
      gr.addColorStop(1, dark);
      return gr;
    };

    // Rear tyres: chunky, with tread that rolls with the distance driven
    const roll = ((g ? now * 4 : s.dist * 3) % 0.1 + 0.1) % 0.1;
    for (const sx of [-1, 1]) {
      const x0 = sx * 0.6 - 0.16;
      ctx.fillStyle = lin(-0.42, 0, [[0, "#4b5563"], [0.5, "#1f2937"], [1, "#0b0f17"]]);
      roundRect(x0 * u, -0.42 * u, 0.32 * u, 0.42 * u, 0.09 * u);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.13)";
      ctx.lineWidth = 0.02 * u;
      ctx.beginPath();
      for (let ty = -0.38 + roll; ty < -0.03; ty += 0.1) {
        ctx.moveTo((x0 + 0.05) * u, ty * u);
        ctx.lineTo((x0 + 0.27) * u, ty * u);
      }
      ctx.stroke();
    }

    // Bruno: shoulders, teal collar, head, long dachshund ears that flap in the wind
    const seat = -0.5;
    const hy = seat - 0.75 * sq;
    ctx.fillStyle = ball(0, seat - 0.3 * sq, 0.36, "#fdba74", "#ea580c");
    ctx.beginPath();
    ctx.ellipse(0, (seat - 0.3 * sq) * u, 0.34 * u, 0.3 * sq * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lin(seat - 0.58 * sq, seat - 0.46 * sq, [[0, "#2dd4bf"], [1, "#0f766e"]]);
    ctx.beginPath();
    ctx.ellipse(0, (seat - 0.52 * sq) * u, 0.21 * u, 0.065 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(0, hy * u);
    if (shudder) ctx.rotate(Math.sin(now * 22) * 0.2 * ouch);
    ctx.fillStyle = ball(0, 0, 0.24, "#fed7aa", "#ea580c");
    ctx.beginPath();
    ctx.arc(0, 0, 0.24 * u, 0, Math.PI * 2);
    ctx.fill();
    // racing goggles: the strap round the back of his head, the lenses showing at the sides
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(-0.235 * u, -0.06 * u, 0.47 * u, 0.07 * u);
    for (const sx of [-1, 1]) {
      ctx.fillStyle = ball(sx * 0.23, -0.025, 0.07, "#99f6e4", "#0d9488");
      ctx.beginPath(); ctx.ellipse(sx * 0.23 * u, -0.025 * u, 0.04 * u, 0.065 * u, 0, 0, Math.PI * 2); ctx.fill();
    }
    // the long dachshund ears, out over the sides, flapping in the wind and into the curves
    const flap = Math.sin(now * 9 + (g ? 1.3 : 0)) * 0.14 - lean * 0.3;
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * 0.17 * u, -0.1 * u);
      ctx.rotate(-sx * 0.45 + flap);
      ctx.fillStyle = ball(0, 0.2, 0.24, "#c2410c", "#7c2d12");
      ctx.beginPath();
      ctx.ellipse(0, 0.2 * u, 0.1 * u, 0.24 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Seat back, over his lower back
    ctx.fillStyle = lin(seat - 0.22, seat + 0.08, [[0, "#4b5563"], [1, "#111827"]]);
    roundRect(-0.3 * u, (seat - 0.22) * u, 0.6 * u, 0.3 * u, 0.08 * u);
    ctx.fill();
    // and his tail, wagging over it
    const wag = Math.sin(now * (ouch ? 4 : 14)) * 0.12;
    ctx.strokeStyle = "#ea580c";
    ctx.lineCap = "round";
    ctx.lineWidth = 0.07 * u;
    ctx.beginPath();
    ctx.moveTo(0, (seat - 0.14) * u);
    ctx.quadraticCurveTo(wag * 0.4 * u, (seat - 0.24) * u, wag * u, (seat - 0.3) * u);
    ctx.stroke();

    // The tub in the kart colour, lit from above; bumper, twin exhausts, number plate
    roundRect(-0.52 * u, -0.5 * u, 1.04 * u, 0.38 * u, 0.12 * u);
    ctx.fillStyle = kartCol;
    ctx.fill();
    ctx.fillStyle = lin(-0.5, -0.12, [[0, "rgba(255,255,255,.4)"], [0.45, "rgba(255,255,255,0)"], [1, "rgba(0,0,0,.3)"]]);
    ctx.fill();
    ctx.fillStyle = lin(-0.2, -0.08, [[0, "#6b7280"], [1, "#111827"]]);
    roundRect(-0.66 * u, -0.2 * u, 1.32 * u, 0.12 * u, 0.05 * u);
    ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.fillStyle = ball(sx * 0.3, -0.27, 0.07, "#e5e7eb", "#6b7280");
      ctx.beginPath(); ctx.arc(sx * 0.3 * u, -0.27 * u, 0.07 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.beginPath(); ctx.arc(sx * 0.3 * u, -0.27 * u, 0.035 * u, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#fef3c7";
    roundRect(-0.17 * u, -0.44 * u, 0.34 * u, 0.1 * u, 0.02 * u);
    ctx.fill();
    if (u > 36) {
      ctx.fillStyle = "#1f2937";
      ctx.font = `800 ${Math.round(0.075 * u)}px ${theme.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("BRUNO", 0, -0.39 * u);
    }

    // Stars over his head after a hit
    if (ouch) {
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 0.015 * u;
      for (let i = 0; i < 3; i++) {
        const a = now * 6 + i * 2.1;
        const sx = Math.cos(a) * 0.32 * u, sy = (hy - 0.34 + Math.sin(a) * 0.07) * u, r = 0.08 * u;
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const rr = j % 2 ? r * 0.38 : r, aa = (j * Math.PI) / 4;
          ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    const headR = 0.24 * u;
    const headY = hy * u;
    if (g) {
      // The name above the head, readable at any distance it is drawn at.
      const size = Math.max(10, Math.min(18, 0.32 * u));
      ctx.globalAlpha = 1;
      ctx.font = `800 ${size}px ${theme.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const ty = headY - headR * 1.5;
      const tw = ctx.measureText(g.name).width + size * 0.8;
      ctx.fillStyle = g.color; // the colour of their kart
      roundRect(-tw / 2, ty - size * 1.25, tw, size * 1.35, size * 0.4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(g.name, 0, ty);
    } else if (s.power.shield > 0 || s.warp > 0) {
      // Blinks in the last second so the end does not come as a surprise.
      const left = Math.max(s.power.shield, s.warp);
      if (left > 1 || Math.floor(left * 10) % 2 === 0) {
        const col = s.warp > 0 && s.power.shield <= 0 ? "250,204,21" : "56,189,248";
        ctx.fillStyle = `rgba(${col},.22)`;
        ctx.strokeStyle = `rgba(${col},.9)`;
        ctx.lineWidth = 0.05 * u;
        ctx.beginPath();
        ctx.ellipse(0, -0.95 * sq * u, 0.78 * u, 1.05 * sq * u, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function render(s, opts = {}) {
    if ((s.lanes ?? 3) !== N) { N = s.lanes ?? 3; resize(); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (s.shake > 0 && !reducedMotion()) {
      const a = s.shake * 14;
      ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
    }
    drawBackground(s);
    drawTrack(s);

    const list = s.objects
      .map((o) => ({ o, z: o.pos - s.dist }))
      // The other riders of a race room (main.js sets s.ghosts), in depth order with the rest.
      .concat((s.ghosts ?? []).map((g) => ({ o: { type: "ghost", g }, z: g.z })))
      .filter(({ z }) => z < Z_FAR && z > -3)
      .sort((a, b) => b.z - a.z);
    // Objects behind the player's plane are drawn after the runner, so they pass in front.
    for (const { o, z } of list) if (z >= -0.2) drawObject(o, z, s);
    if (!opts.hidePlayer) drawPlayer(s);
    for (const { o, z } of list) if (z < -0.2) drawObject(o, z, s);
    drawParticles(s);
    if (!opts.hidePlayer && s.objects.length) drawJumpCue(s);
    if (s.warp > 0) drawWarpLines(s);

    if (s.flash) {
      const a = Math.max(0, (reducedMotion() ? 0.1 : 0.38) * (1 - s.flash.t / 0.5));
      ctx.fillStyle = s.flash.color === "ok" ? `rgba(22,163,74,${a})` : `rgba(220,38,38,${a})`;
      ctx.fillRect(-20, -20, w + 40, h + 40);
    }
  }

  function drawObject(o, z, s) {
    if (o.type === "crate") drawCrate(o, z);
    else if (o.type === "barrier") drawBarrier(o, z);
    else if (o.type === "cart") drawCart(o, z);
    else if (o.type === "coin") drawCoin(o, z, s.t);
    else if (o.type === "gate") drawGate(o, z, s);
    else if (o.type === "hurdle") drawHurdle(o, z);
    else if (o.type === "beam") drawBeam(o, z);
    else if (o.type === "warp") drawWarp(o, z, s.t);
    else if (o.type === "mystery") drawMystery(o, z, s.t);
    else if (o.type === "item") drawItem(o, z, s.t);
    else if (o.type === "ghost") drawPlayer(s, o.g);
  }

  resize();
  return { render, resize };
}
