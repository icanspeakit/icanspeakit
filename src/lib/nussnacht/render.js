// Hamstis Nussnacht: draws one frame on a Canvas 2D context. Night garden, top-down, the
// camera on Hamsti. Reads the simulation's pools directly and interpolates between the last
// two ticks (alpha), so the picture is smooth at any refresh rate.
//
// Performance (300 creatures + 200 shots on a mid phone): everything that has text or soft
// shapes is drawn once to an offscreen canvas and then only blitted – the word labels (one per
// word), the blob bodies (six hues), the shot glows, the garden tiles. No text is laid out
// during a frame except the HUD's few numbers, which live in the DOM anyway.
import { mascotImage, ready } from "../mascotImage.js";
import { orbitPos } from "./sim.js";

export const VIEW = 520; // world units across the screen's shorter side
const ARTS = ["a", "an", "some"];
// The blob hues: from the word, never from its article (that would give the answer away).
const HUES = ["#f6c177", "#9ccfd8", "#c4a7e7", "#f2a7b8", "#a6da95", "#f5bde6"];

/** Article colours: the site's tokens (--info a, --danger an, --success some, as in Bruno
 *  Kart), lifted toward white so they read on the night garden. */
export function articleColours(el) {
  const cs = getComputedStyle(el);
  const v = (n, f) => cs.getPropertyValue(n).trim() || f;
  const base = [v("--info", "#2563eb"), v("--danger", "#c1462f"), v("--success", "#047857")];
  return base.map((c) => ({ base: c, light: mix(c, "#ffffff", 0.38) }));
}
function mix(a, b, t) {
  const p = (h) => {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const A = p(a), B = p(b);
  return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",")})`;
}

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function createRenderer(canvas, { reduced = () => false } = {}) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, k = 1; // k = pixels (CSS) per world unit
  let cols = articleColours(canvas);
  const font = getComputedStyle(canvas).getPropertyValue("--font-voice").trim() || "Fredoka, sans-serif";
  const hamsti = mascotImage("hamsti");
  const hamstiOops = mascotImage("hamsti", { expr: "oops" });

  // ---- caches (rebuilt on resize: they are drawn at the screen's scale) ----------------------
  let labels = new Map();
  let blobs = [];
  let glows = [];
  let tile = null;
  let artLabels = [];

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  function label(text, big) {
    const key = big ? `B|${text}` : text;
    let l = labels.get(key);
    if (l) return l;
    const px = (big ? 21 : 15) * k * dpr;
    const c = makeCanvas(1, 1);
    let g = c.getContext("2d");
    g.font = `700 ${px}px ${font}`;
    const w = g.measureText(text).width;
    const pad = px * 0.35;
    c.width = Math.ceil(w + pad * 2);
    c.height = Math.ceil(px * 1.5);
    g = c.getContext("2d");
    g.font = `700 ${px}px ${font}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.lineWidth = px * 0.22;
    g.strokeStyle = "rgba(20,24,40,0.85)";
    g.strokeText(text, c.width / 2, c.height / 2);
    g.fillStyle = "#fff";
    g.fillText(text, c.width / 2, c.height / 2);
    l = { c, w: c.width / (k * dpr), h: c.height / (k * dpr) };
    labels.set(key, l);
    return l;
  }

  function makeArtLabels() {
    artLabels = ARTS.map((a, i) => {
      const out = {};
      for (const [name, size] of [["s", 15], ["m", 19], ["l", 26]]) {
        const px = size * k * dpr;
        const c = makeCanvas(px * 3, px * 1.5);
        const g = c.getContext("2d");
        g.font = `800 ${px}px ${font}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineJoin = "round";
        g.lineWidth = px * 0.26;
        g.strokeStyle = "rgba(10,14,28,0.9)";
        g.strokeText(a, c.width / 2, c.height / 2);
        g.fillStyle = cols[i].light;
        g.fillText(a, c.width / 2, c.height / 2);
        out[name] = { c, w: c.width / (k * dpr), h: c.height / (k * dpr) };
      }
      return out;
    });
  }

  function makeBlobs() {
    const S = 96;
    blobs = HUES.map((hue) => {
      const c = makeCanvas(S, S);
      const g = c.getContext("2d");
      // soft body
      const grd = g.createRadialGradient(S * 0.4, S * 0.35, S * 0.05, S * 0.5, S * 0.55, S * 0.5);
      grd.addColorStop(0, mix(hue, "#ffffff", 0.45));
      grd.addColorStop(0.7, hue);
      grd.addColorStop(1, mix(hue, "#1a2230", 0.35));
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(S / 2, S * 0.54, S * 0.46, S * 0.42, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = S * 0.035;
      g.strokeStyle = "rgba(26,34,48,0.75)";
      g.stroke();
      // eyes
      for (const ex of [0.36, 0.64]) {
        g.fillStyle = "#fff";
        g.beginPath();
        g.ellipse(S * ex, S * 0.36, S * 0.075, S * 0.09, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#1a2230";
        g.beginPath();
        g.arc(S * ex + S * 0.01, S * 0.38, S * 0.042, 0, Math.PI * 2);
        g.fill();
      }
      return c;
    });
    // the white silhouette for the hit flash
    const c = makeCanvas(S, S);
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(S / 2, S * 0.54, S * 0.46, S * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    blobs.white = c;
  }

  function makeGlows() {
    glows = cols.map((col) => {
      const S = 32;
      const c = makeCanvas(S, S);
      const g = c.getContext("2d");
      const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0, "#fff");
      grd.addColorStop(0.3, col.light);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, S, S);
      return c;
    });
    const S = 32;
    const c = makeCanvas(S, S);
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, "rgba(255,250,200,1)");
    grd.addColorStop(0.35, "rgba(250,220,120,0.6)");
    grd.addColorStop(1, "rgba(250,220,120,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
    glows.firefly = c;
  }

  // The garden: one 512-unit tile with grass tufts, clover, pebbles and little flowers, drawn
  // from a fixed seed so it looks the same every time, repeated under the camera.
  const TILE = 512;
  function makeTile() {
    const px = TILE * k * dpr;
    const c = makeCanvas(px, px);
    const g = c.getContext("2d");
    g.scale(k * dpr, k * dpr);
    let s = 7;
    const r = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
    g.fillStyle = "#12302c";
    g.fillRect(0, 0, TILE, TILE);
    // darker and lighter patches of lawn
    for (let i = 0; i < 14; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(8,30,30,0.5)" : "rgba(40,80,60,0.25)";
      g.beginPath();
      g.ellipse(r() * TILE, r() * TILE, 40 + r() * 70, 25 + r() * 50, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // grass tufts
    g.strokeStyle = "rgba(90,150,110,0.45)";
    g.lineWidth = 1.6;
    g.lineCap = "round";
    for (let i = 0; i < 90; i++) {
      const x = r() * TILE, y = r() * TILE;
      for (let b = -1; b <= 1; b++) {
        g.beginPath();
        g.moveTo(x + b * 2, y);
        g.lineTo(x + b * 4 + (r() - 0.5) * 2, y - 6 - r() * 5);
        g.stroke();
      }
    }
    // pebbles
    for (let i = 0; i < 16; i++) {
      g.fillStyle = "rgba(160,170,180,0.22)";
      g.beginPath();
      g.ellipse(r() * TILE, r() * TILE, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // little night flowers
    for (let i = 0; i < 18; i++) {
      const x = r() * TILE, y = r() * TILE;
      const col = ["rgba(240,230,255,0.55)", "rgba(250,220,140,0.5)", "rgba(200,170,255,0.5)"][i % 3];
      g.fillStyle = col;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.8, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "rgba(250,210,90,0.7)";
      g.beginPath();
      g.arc(x, y, 1.4, 0, Math.PI * 2);
      g.fill();
    }
    tile = c;
  }

  // ---- render-side effects: sparks, pop-ups, rings (not part of the simulation) -------------
  const fx = [];
  for (let i = 0; i < 260; i++) fx.push({ on: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, col: "#fff", text: null, size: 1 });
  function addFx(kind, x, y, col, opts = {}) {
    for (const f of fx) {
      if (f.on) continue;
      f.on = true; f.kind = kind; f.x = x; f.y = y; f.t = 0;
      f.life = opts.life ?? 0.5; f.col = col; f.text = opts.text ?? null; f.size = opts.size ?? 1;
      f.vx = opts.vx ?? 0; f.vy = opts.vy ?? 0;
      return f;
    }
    return null;
  }
  /** Sparks: kind 0. Ring: kind 1. Text pop-up: kind 2 (text is a cached label). */
  function sparks(x, y, col, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120;
      addFx(0, x, y, col, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.2 });
    }
  }
  function ring(x, y, col, size, life = 0.5) { addFx(1, x, y, col, { size, life }); }
  function popup(x, y, text, col, life = 0.9, size = 1) { addFx(2, x, y, col, { text: label(text, size > 1), life, vy: -40, size }); }
  function popArt(x, y, art, size = "m", life = 0.9) { addFx(3, x, y, null, { text: artLabels[art][size], life, vy: -30 }); }

  // fireflies: drift in screen space around the camera, render only
  const flies = [];
  for (let i = 0; i < 26; i++) flies.push({ x: Math.random() * 1400 - 700, y: Math.random() * 1400 - 700, p: Math.random() * 6.28, s: 0.5 + Math.random() });

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    k = Math.min(W, H) / VIEW;
    cols = articleColours(canvas);
    labels = new Map();
    makeArtLabels();
    makeBlobs();
    makeGlows();
    makeTile();
  }

  // ---- the frame -----------------------------------------------------------------------------
  let time = 0;
  let shake = 0;
  function draw(S, alpha, dt) {
    time += dt;
    const red = reduced();
    const lerp = (a, b) => a + (b - a) * alpha;
    const camX = lerp(S.hpx, S.hx), camY = lerp(S.hpy, S.hy);
    let sx = 0, sy = 0;
    if (shake > 0 && !red) {
      sx = (Math.random() - 0.5) * shake * 10;
      sy = (Math.random() - 0.5) * shake * 10;
    }
    shake = Math.max(0, shake - dt * 2.5);
    const ox = W / 2 - camX * k + sx, oy = H / 2 - camY * k + sy;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // garden tiles
    const tw = TILE * k;
    const startX = Math.floor((camX - W / 2 / k) / TILE) * TILE;
    const startY = Math.floor((camY - H / 2 / k) / TILE) * TILE;
    for (let x = startX; x < camX + W / 2 / k; x += TILE) {
      for (let y = startY; y < camY + H / 2 / k; y += TILE) {
        ctx.drawImage(tile, Math.floor(ox + x * k), Math.floor(oy + y * k), Math.ceil(tw) + 1, Math.ceil(tw) + 1);
      }
    }

    ctx.setTransform(dpr * k, 0, 0, dpr * k, ox * dpr, oy * dpr);
    const vx0 = camX - W / 2 / k - 80, vx1 = camX + W / 2 / k + 80;
    const vy0 = camY - H / 2 / k - 80, vy1 = camY + H / 2 / k + 80;

    // lantern light on the ground
    const st = S.stats;
    const lr = st.lightR;
    const lg = ctx.createRadialGradient(camX, camY, 10, camX, camY, lr * 1.3);
    lg.addColorStop(0, "rgba(255,214,140,0.20)");
    lg.addColorStop(0.7, "rgba(255,200,120,0.07)");
    lg.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(camX - lr * 1.3, camY - lr * 1.3, lr * 2.6, lr * 2.6);

    // nuts
    for (const n of S.nuts) {
      if (!n.alive) continue;
      const x = lerp(n.px, n.x), y = lerp(n.py, n.y);
      if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      drawNut(x, y, n.acorn, n.v);
    }

    // creatures
    const radar = S.up.radar;
    for (const c of S.cre) {
      if (!c.alive) continue;
      const x = lerp(c.px, c.x), y = lerp(c.py, c.y);
      if (x < vx0 - c.r || x > vx1 + c.r || y < vy0 - c.r || y > vy1 + c.r) continue;
      const boss = c.kind === 3;
      const lab = label(c.text, boss);
      const hopP = time * (boss ? 3.2 : 5.5) + c.hop * 6.28;
      const hop = red ? 0 : Math.abs(Math.sin(hopP));
      const squash = red ? 1 : 1 - (1 - hop) * 0.1;
      const bh = c.r * 2 * squash;
      const bw = Math.max(c.r * 2 * (2 - squash), lab.w + 6);
      const by = y - hop * c.r * 0.25;
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(x, y + c.r * 0.85, bw * 0.4, c.r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // radar glow: in the article's colour, only for words the radar knows
      if (c.glow && c.glow <= radar) {
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 4 + c.hop * 6);
        ctx.strokeStyle = cols[c.art].light;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(x, by, bw * 0.55, bh * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const hue = blobs[boss ? 1 : hash(c.text) % blobs.length];
      ctx.drawImage(hue, x - bw / 2, by - bh / 2, bw, bh);
      if (c.hitT > 0) {
        ctx.globalAlpha = Math.min(1, c.hitT * 6);
        ctx.drawImage(blobs.white, x - bw / 2, by - bh / 2, bw, bh);
        ctx.globalAlpha = 1;
      }
      // angry brows
      if (c.angry > 0) {
        ctx.strokeStyle = "#1a2230";
        ctx.lineWidth = Math.max(1.5, c.r * 0.09);
        ctx.beginPath();
        ctx.moveTo(x - bw * 0.2, by - bh * 0.27);
        ctx.lineTo(x - bw * 0.07, by - bh * 0.2);
        ctx.moveTo(x + bw * 0.2, by - bh * 0.27);
        ctx.lineTo(x + bw * 0.07, by - bh * 0.2);
        ctx.stroke();
      }
      if (boss) {
        // a crown of leaves: bosses read as bosses on a phone
        ctx.fillStyle = "#f2a900";
        ctx.strokeStyle = "#1a2230";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cy = by - bh * 0.48, cw = c.r * 0.7;
        ctx.moveTo(x - cw, cy);
        ctx.lineTo(x - cw * 0.6, cy - c.r * 0.35);
        ctx.lineTo(x - cw * 0.2, cy - c.r * 0.08);
        ctx.lineTo(x, cy - c.r * 0.42);
        ctx.lineTo(x + cw * 0.2, cy - c.r * 0.08);
        ctx.lineTo(x + cw * 0.6, cy - c.r * 0.35);
        ctx.lineTo(x + cw, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // HP bar
        const f = Math.max(0, c.hp / c.maxHp);
        ctx.fillStyle = "rgba(10,14,28,0.7)";
        ctx.fillRect(x - c.r, by + bh * 0.55, c.r * 2, 5);
        ctx.fillStyle = "#f97316";
        ctx.fillRect(x - c.r, by + bh * 0.55, c.r * 2 * f, 5);
      }
      ctx.drawImage(lab.c, x - lab.w / 2, by + bh * 0.12 - lab.h / 2, lab.w, lab.h);
      // the article flashing on the word after a hit
      if (c.flashT > 0) {
        const a = artLabels[c.art][c.flashOk ? "s" : "m"];
        const fa = Math.min(1, c.flashT * 3);
        ctx.globalAlpha = fa;
        const up = (c.flashOk ? 0.7 : 0.9) - c.flashT;
        ctx.drawImage(a.c, x - a.w / 2, by - bh / 2 - a.h * 0.8 - up * 10, a.w, a.h);
        ctx.globalAlpha = 1;
      }
    }

    // orbiting acorns
    if (st.orbit > 0) {
      const tmp = [0, 0];
      const save = { hx: S.hx, hy: S.hy, orbX: S.orbX, orbY: S.orbY };
      for (let a = 0; a < st.orbit; a++) {
        orbitPos({ ...save, hx: camX, hy: camY }, a, st.orbit, tmp);
        drawNut(tmp[0], tmp[1], true, 1, 1.3);
      }
    }

    // shots
    for (const s of S.shots) {
      if (!s.alive) continue;
      const x = lerp(s.px, s.x), y = lerp(s.py, s.y);
      if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      ctx.drawImage(glows[s.art], x - 9, y - 9, 18, 18);
    }

    // Hamsti, the ring in the current article's colour, the article written big
    drawHamsti(S, camX, camY, red);

    // effects
    for (const f of fx) {
      if (!f.on) continue;
      f.t += dt;
      if (f.t >= f.life) { f.on = false; continue; }
      const p = f.t / f.life;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.kind === 0) {
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = f.col;
        ctx.fillRect(f.x - 2, f.y - 2, 4, 4);
      } else if (f.kind === 1) {
        ctx.globalAlpha = red ? 0.5 * (1 - p) : 1 - p;
        ctx.strokeStyle = f.col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(f.x, f.y, red ? f.size : f.size * (0.3 + 0.7 * p), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = p < 0.7 ? 1 : (1 - p) / 0.3;
        const l = f.text;
        const sc = f.kind === 2 && !red ? 1 + 0.25 * Math.max(0, 1 - p * 5) : 1;
        ctx.drawImage(l.c, f.x - (l.w * sc) / 2, f.y - (l.h * sc) / 2, l.w * sc, l.h * sc);
      }
      ctx.globalAlpha = 1;
    }

    // night: darker away from Hamsti's lantern
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hxS = W / 2 + sx, hyS = H / 2 + sy;
    const R = Math.hypot(W, H) / 2;
    const night = ctx.createRadialGradient(hxS, hyS, lr * k * 0.9, hxS, hyS, R);
    night.addColorStop(0, "rgba(4,10,24,0)");
    night.addColorStop(1, "rgba(4,10,24,0.55)");
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, W, H);

    // fireflies
    ctx.globalCompositeOperation = "lighter";
    for (const fl of flies) {
      const blink = red ? 0.6 : 0.35 + 0.65 * Math.max(0, Math.sin(time * fl.s * 1.7 + fl.p));
      let x = ((fl.x - camX * 0.6 + time * 8 * fl.s) % 1400 + 1400) % 1400 - 700;
      let y = ((fl.y - camY * 0.6 + Math.sin(time * 0.6 + fl.p) * 20) % 1400 + 1400) % 1400 - 700;
      x = W / 2 + x * k; y = H / 2 + y * k;
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      ctx.globalAlpha = blink;
      const s = 10 * k;
      ctx.drawImage(glows.firefly, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // bosses off screen: a small arrow at the edge
    for (const c of S.cre) {
      if (!c.alive || c.kind !== 3) continue;
      const x = W / 2 + (c.x - camX) * k, y = H / 2 + (c.y - camY) * k;
      if (x > 0 && x < W && y > 0 && y < H) continue;
      const m = 22;
      const ex = Math.max(m, Math.min(W - m, x)), ey = Math.max(m, Math.min(H - m, y));
      const a = Math.atan2(y - H / 2, x - W / 2);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a);
      ctx.fillStyle = "#f2a900";
      ctx.strokeStyle = "#1a2230";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function drawNut(x, y, acorn, v, scale = 1) {
    const s = (acorn ? 7 : 5 + Math.min(4, v)) * scale;
    ctx.fillStyle = acorn ? "#8bc34a" : "#c08a4a";
    ctx.strokeStyle = "#3b2414";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.8, s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = acorn ? "#6d4c2f" : "#8a5a2b";
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.65, s * 0.85, s * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawHamsti(S, x, y, red) {
    const col = cols[S.art];
    const moving = S.hvx !== 0 || S.hvy !== 0;
    const bob = moving && !red ? Math.abs(Math.sin(time * 11)) * 4 : 0;
    // ring
    ctx.strokeStyle = col.light;
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // body
    const hurt = S.iframes > 0;
    const img = hurt ? hamstiOops : hamsti;
    if (ready(img)) {
      const s = 62;
      const blink = hurt && !red && Math.floor(time * 16) % 2 === 0;
      ctx.globalAlpha = blink ? 0.45 : 1;
      ctx.save();
      ctx.translate(x, y - bob);
      if (S.hvx < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -s / 2, -s / 2 - 4, s, s);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "#e8a65d";
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    // the article, big
    const a = artLabels[S.art].l;
    ctx.drawImage(a.c, x - a.w / 2, y - 34 - a.h * 0.95, a.w, a.h);
    // HP bar under Hamsti
    const f = Math.max(0, S.hp / S.stats.maxHp);
    ctx.fillStyle = "rgba(10,14,28,0.75)";
    ctx.fillRect(x - 24, y + 31, 48, 6);
    ctx.fillStyle = f > 0.5 ? "#4ade80" : f > 0.25 ? "#facc15" : "#f87171";
    ctx.fillRect(x - 24, y + 31, 48 * f, 6);
  }

  return {
    resize,
    draw,
    sparks,
    ring,
    popup,
    popArt,
    shake: (n) => { shake = Math.max(shake, n); },
    colours: () => cols,
    worldToScreen: (S, x, y) => [W / 2 + (x - S.hx) * k, H / 2 + (y - S.hy) * k],
    clearLabels: () => { labels = new Map(); makeArtLabels(); },
    get scale() { return k; },
  };
}

