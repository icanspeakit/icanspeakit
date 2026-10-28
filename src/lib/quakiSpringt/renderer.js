// Quaki springt: draws one room of the tower on a canvas. The room (360 × 640, 9:16) is scaled
// to fit the stage and centred; what is left of the stage on the sides shows the level's sky.
// The camera shows the room Quaki is in and slides to the next one in 0.25 s (reduced motion:
// it jumps there). Nothing here changes the run.

import { P } from "./physics.js";
import { mascotSvg } from "../mascots.js";

export const THEMES = [
  { sky: ["#bfe8ff", "#eaf7ff"], stone: "#c98d5b", stoneDark: "#9a6440", wood: "#b7793f", far: "#9cc9b3" }, // A1 Marktplatz
  { sky: ["#a9d8f5", "#f4f1e6"], stone: "#8f9aa8", stoneDark: "#5f6b7a", wood: "#a0663a", far: "#a8b4c4" }, // A2 Bahnhof
  { sky: ["#f9d9a7", "#fdf3e1"], stone: "#d6b27c", stoneDark: "#a8834f", wood: "#8f5a2e", far: "#e3c08c" }, // B1 Rathaus
  { sky: ["#c7c2ef", "#f1eefc"], stone: "#a6705a", stoneDark: "#76493a", wood: "#7a4b2a", far: "#b8aee0" }, // B2 Universität
  { sky: ["#1f3b73", "#f6a96b"], stone: "#6d6f86", stoneDark: "#474861", wood: "#6b4426", far: "#3b4c80" }, // C1 Bibliothek, Dach
];

const PAD_GREEN = "#3fa34d";
const PAD_DARK = "#24733a";

/** Quaki as images, one per pose, rasterised from the mascot drawing. */
function quakiImages() {
  const poses = { stand: "happy", charge: "thinking", jump: "celebrate", splat: "oops" };
  const out = {};
  for (const [k, expr] of Object.entries(poses)) {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mascotSvg({ name: "quaki", expr, size: 200, label: "" }).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))}`;
    out[k] = img;
  }
  return out;
}

export function createRenderer(canvas, { reduced = () => false } = {}) {
  const ctx = canvas.getContext("2d");
  const imgs = quakiImages();
  let w = 0, h = 0, dpr = 1;
  let camY = null;
  let fade = 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  /** Scale and offset of the room on the stage. */
  function view() {
    const s = Math.min(w / P.ROOM_W, h / P.ROOM_H);
    return { s, ox: (w - P.ROOM_W * s) / 2, oy: (h - P.ROOM_H * s) / 2 };
  }

  function wrap(text, maxW, font) {
    ctx.font = font;
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = word; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(x, y, ww, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, r);
    ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.closePath();
  }

  function drawTiles(world, room, theme) {
    const top = room.y / P.TILE;
    for (let r = top - 1; r < top + P.ROWS + 1; r++) {
      if (r < 0 || r >= world.R) continue;
      const row = world.grid[r];
      for (let c = 0; c < P.COLS; c++) {
        const ch = row[c];
        const x = c * P.TILE, y = r * P.TILE;
        if (ch === "#") {
          ctx.fillStyle = theme.stone;
          ctx.fillRect(x, y, P.TILE, P.TILE);
          ctx.fillStyle = theme.stoneDark;
          // brick joints
          ctx.fillRect(x, y + P.TILE - 2, P.TILE, 2);
          ctx.fillRect(x + ((r % 2) ? 4 : 14), y, 2, P.TILE - 2);
          const above = r > 0 ? world.grid[r - 1][c] : ".";
          if (above !== "#" && above !== "/" && above !== "\\") {
            ctx.fillStyle = "rgba(255,255,255,.35)";
            ctx.fillRect(x, y, P.TILE, 3);
          }
        } else if (ch === "=") {
          ctx.fillStyle = theme.wood;
          ctx.fillRect(x, y, P.TILE, P.TILE - 6);
          ctx.fillStyle = "rgba(0,0,0,.18)";
          ctx.fillRect(x, y + P.TILE - 8, P.TILE, 2);
          ctx.fillRect(x + P.TILE - 1, y, 1, P.TILE - 6);
          ctx.fillStyle = "rgba(255,255,255,.3)";
          ctx.fillRect(x, y, P.TILE, 2);
        } else if (ch === "/" || ch === "\\") {
          ctx.fillStyle = "#c0504d";
          ctx.beginPath();
          if (ch === "/") { ctx.moveTo(x, y + P.TILE); ctx.lineTo(x + P.TILE, y); ctx.lineTo(x + P.TILE, y + P.TILE); }
          else { ctx.moveTo(x, y); ctx.lineTo(x + P.TILE, y + P.TILE); ctx.lineTo(x, y + P.TILE); }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#8f3532";
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (ch === "/") { ctx.moveTo(x, y + P.TILE); ctx.lineTo(x + P.TILE, y); }
          else { ctx.moveTo(x, y); ctx.lineTo(x + P.TILE, y + P.TILE); }
          ctx.stroke();
        }
      }
    }
  }

  function drawFlags(world, run) {
    world.flags.forEach((f, i) => {
      const on = run.mode === "sanft";
      const got = run.s.flag >= i;
      ctx.globalAlpha = on ? 1 : 0.35;
      ctx.fillStyle = "#475569";
      ctx.fillRect(f.x - 1, f.y - 34, 2, 34);
      ctx.fillStyle = got ? "#16a34a" : "#f2a900";
      ctx.beginPath();
      ctx.moveTo(f.x + 1, f.y - 34);
      ctx.lineTo(f.x + 18, f.y - 28);
      ctx.lineTo(f.x + 1, f.y - 22);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    const g = world.goal;
    if (g) {
      ctx.fillStyle = "#f2a900";
      ctx.beginPath();
      const cx = g.x + P.TILE / 2, cy = g.y + P.TILE / 2;
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? 5 : 11;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.fill();
    }
  }

  function drawPads(world, run, time) {
    world.pads.forEach((p, i) => {
      const st = run.sim.padState(i);
      const x0 = p.c0 * P.TILE, x1 = (p.c1 + 1) * P.TILE, cx = (x0 + x1) / 2;
      let y = p.y + 6;
      const plan = run.plan.get(p.room);
      const text = plan ? plan.slots[p.slot] : "";
      if (st === -1) {
        // under water: rings where it was
        ctx.strokeStyle = "rgba(37,99,235,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, y + 4, (x1 - x0) / 2 + Math.sin(time * 3) * 3, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
      const wob = st > 0 ? Math.sin(time * 40) * 2 * st : 0;
      y += st * 8;
      ctx.fillStyle = PAD_DARK;
      ctx.beginPath();
      ctx.ellipse(cx + wob, y + 3, (x1 - x0) / 2, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAD_GREEN;
      ctx.beginPath();
      ctx.ellipse(cx + wob, y, (x1 - x0) / 2, 7, 0, 0.25, Math.PI * 2 - 0.25);
      ctx.lineTo(cx + wob, y);
      ctx.fill();
      if (!text) return;
      // the answer on a little card above the pad
      const font = "700 12px Fredoka, system-ui, sans-serif";
      ctx.font = font;
      const tw = ctx.measureText(text).width;
      const bw = Math.max(x1 - x0, tw + 12);
      const bx = Math.max(2, Math.min(P.ROOM_W - bw - 2, cx - bw / 2));
      ctx.fillStyle = "rgba(255,255,255,.95)";
      roundRect(bx + wob, y - 30, bw, 20, 6);
      ctx.fill();
      ctx.strokeStyle = PAD_DARK;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#1a2230";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx + bw / 2 + wob, y - 20);
    });
  }

  function drawSigns(world, run) {
    for (const sg of world.signs) {
      const plan = run.plan.get(sg.room);
      if (!plan) continue;
      const st = run.answers.get(sg.room);
      const reveal = st?.revealed;
      const bw = 168;
      const left = sg.x + P.TILE / 2 < P.ROOM_W / 2;
      const bx = left ? Math.max(2, sg.x - 6) : Math.min(P.ROOM_W - bw - 2, sg.x + P.TILE + 6 - bw);
      const font = "600 11.5px Fredoka, system-ui, sans-serif";
      const q = reveal ? plan.q.q.replace("___", plan.q.a[0]) : plan.q.q;
      const lines = wrap(q, bw - 14, font);
      // Sanft, after a wrong pad: the rule under the question, in green.
      const rule = reveal ? wrap(plan.q.r, bw - 14, "500 10px Fredoka, system-ui, sans-serif") : [];
      const bh = 12 + lines.length * 14 + rule.length * 12 + (rule.length ? 3 : 0);
      const by = sg.y + P.TILE - 22 - bh;
      // post
      ctx.fillStyle = "#7a4b2a";
      ctx.fillRect(sg.x + P.TILE / 2 - 2, by + bh, 4, sg.y + P.TILE - (by + bh));
      ctx.fillStyle = reveal ? "#ecfdf5" : "#fffbeb";
      roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.strokeStyle = reveal ? "#16a34a" : "#7a4b2a";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#1a2230";
      ctx.font = font;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      lines.forEach((l, i) => ctx.fillText(l, bx + 7, by + 7 + i * 14));
      if (rule.length) {
        ctx.fillStyle = "#15803d";
        ctx.font = "500 10px Fredoka, system-ui, sans-serif";
        rule.forEach((l, i) => ctx.fillText(l, bx + 7, by + 10 + lines.length * 14 + i * 12));
      }
    }
  }

  function drawQuaki(run, time, { ghost = false, sim = run.sim } = {}) {
    const s = sim.s;
    const cx = s.x + P.W / 2, by = s.y + P.H;
    let sx = 1, sy = 1, pose = "stand";
    if (s.charge >= 0) {
      const c = s.charge / P.CHARGE_MAX;
      sy = 1 - 0.25 * c;
      sx = 1 + 0.15 * c;
      pose = "charge";
    } else if (s.mode === "air") {
      pose = s.vy > 300 && s.y - s.apexY > P.QUAAK_AT ? "splat" : "jump";
      const v = Math.min(1, Math.abs(s.vy) / 900);
      sy = 1 + 0.18 * v;
      sx = 1 - 0.12 * v;
    } else if (run.splatUntil && s.tick < run.splatUntil && !ghost) {
      pose = "splat";
      sy = 0.75;
      sx = 1.25;
    }
    const img = imgs[pose];
    const size = 40;
    ctx.save();
    ctx.translate(cx, by + 2);
    ctx.scale((s.face < 0 ? -1 : 1) * sx, sy);
    if (ghost) ctx.globalAlpha = 0.35;
    if (img.complete && img.naturalWidth) ctx.drawImage(img, -size / 2, -size + 2, size, size);
    else {
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.ellipse(0, -11, 12, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (!ghost && s.charge >= 0) {
      const c = s.charge / P.CHARGE_MAX;
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, s.y + P.H / 2 - 4, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = c >= 1 ? "#ef4444" : c > 0.66 ? "#f97316" : "#0d9488";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, s.y + P.H / 2 - 4, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c);
      ctx.stroke();
      // aim arrow
      if (s.aim) {
        ctx.fillStyle = "#1a2230";
        ctx.beginPath();
        const ax = cx + s.aim * 32, ay = s.y + P.H / 2 - 4;
        ctx.moveTo(ax + s.aim * 7, ay);
        ctx.lineTo(ax - s.aim * 3, ay - 6);
        ctx.lineTo(ax - s.aim * 3, ay + 6);
        ctx.fill();
      }
    }
  }

  function render(world, run, { time = 0, dt = 0.016, ghost = null, grid = false } = {}) {
    const v = view();
    const theme = THEMES[run.level()] ?? THEMES[0];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const ri = Math.max(0, Math.min(world.rooms.length - 1, run.sim.room()));
    const room = world.rooms[ri];
    const target = room.y;
    if (camY === null || reduced()) {
      if (camY !== null && camY !== target) fade = 1;
      camY = target;
    } else camY += (target - camY) * Math.min(1, dt * 14);
    if (Math.abs(camY - target) < 0.5) camY = target;

    ctx.save();
    ctx.translate(v.ox, v.oy);
    ctx.scale(v.s, v.s);
    // the tower's room, a little lighter than the sky
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.fillRect(0, 0, P.ROOM_W, P.ROOM_H);
    ctx.beginPath();
    ctx.rect(-40, 0, P.ROOM_W + 80, P.ROOM_H);
    ctx.clip();
    ctx.translate(0, -camY);
    // rooms above/below while the camera slides
    const show = [room, world.rooms[ri + 1], world.rooms[ri - 1]].filter(Boolean);
    for (const r of show) drawTiles(world, r, THEMES[r.level] ?? theme);
    drawFlags(world, run);
    drawSigns(world, run);
    drawPads(world, run, time);
    if (ghost) drawQuaki(run, time, { ghost: true, sim: ghost });
    drawQuaki(run, time);
    if (grid) {
      ctx.strokeStyle = "rgba(0,0,0,.12)";
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= P.COLS; c++) { ctx.beginPath(); ctx.moveTo(c * P.TILE, room.y); ctx.lineTo(c * P.TILE, room.y + P.ROOM_H); ctx.stroke(); }
      for (let r = 0; r <= P.ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, room.y + r * P.TILE); ctx.lineTo(P.ROOM_W, room.y + r * P.TILE); ctx.stroke(); }
    }
    ctx.restore();
    // tower walls left and right of the room
    ctx.fillStyle = "rgba(26,34,48,.12)";
    ctx.fillRect(v.ox - 6, 0, 6, h);
    ctx.fillRect(v.ox + P.ROOM_W * v.s, 0, 6, h);
    if (fade > 0) {
      ctx.fillStyle = `rgba(255,255,255,${fade * 0.6})`;
      ctx.fillRect(0, 0, w, h);
      fade = Math.max(0, fade - dt * 4);
    }
  }

  return { resize, render, view, reset() { camY = null; } };
}
