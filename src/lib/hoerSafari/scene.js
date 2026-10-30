// Hör-Safari drawing: landscape, the Pieper birds, cards, the Gummi-Blaster, pellets,
// balloons with extras, the reload quiz bubbles. Pure canvas, no state of its own: game.js
// owns the state and calls these with what to draw where.

export const VIEW_H = 600;

// Depth layers. `par` = parallax factor, `plane` = how far along a pellet's flight (0…1)
// it crosses this layer; the hit test for the layer happens there.
export const DEPTHS = {
  far: { scale: 0.52, par: 0.35, pts: 25, y: [70, 210], speed: [45, 75], plane: 1.0 },
  mid: { scale: 0.76, par: 0.65, pts: 10, y: [95, 270], speed: [65, 105], plane: 0.75 },
  near: { scale: 1.0, par: 1.0, pts: 5, y: [120, 330], speed: [85, 135], plane: 0.55 },
};
// Divers are checked where the pellet reaches the aim point (the near plane), before the near
// birds: they are in front of everything, and the player must hit where they aim.
export const DIVE_PLANE = 0.55;

export const HILLS = {
  far: [330, 26, 0.004, 14, 0.011, 1],
  mid: [390, 22, 0.006, 10, 0.017, 4],
  near: [465, 10, 0.003, 5, 0.013, 2],
};

export function hillY(x, [base, a1, f1, a2, f2, p]) {
  return base + Math.sin(x * f1 + p) * a1 + Math.sin(x * f2 + p * 1.7) * a2;
}

const seeded = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function pill(ctx, text, x, y, { size = 18, bg = "rgba(15,23,42,.85)", fg = "#fff" } = {}) {
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  const w = ctx.measureText(text).width + size * 1.1;
  const h = size * 1.6;
  ctx.fillStyle = bg;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 1);
}

function cloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x, y, 46 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 26 * s, y + 4 * s, 26 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 22 * s, y - 8 * s, 28 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function tree(ctx, x, y, s) {
  ctx.fillStyle = "#7c4a24";
  ctx.fillRect(x - 3 * s, y - 30 * s, 6 * s, 30 * s);
  ctx.fillStyle = "#3d7a3a";
  ctx.beginPath();
  ctx.arc(x, y - 40 * s, 20 * s, 0, Math.PI * 2);
  ctx.arc(x - 12 * s, y - 30 * s, 14 * s, 0, Math.PI * 2);
  ctx.arc(x + 12 * s, y - 30 * s, 14 * s, 0, Math.PI * 2);
  ctx.fill();
}

function hills(ctx, w, cam, color, h) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let sx = 0; sx <= w + 20; sx += 16) ctx.lineTo(sx, hillY(sx + cam, h));
  ctx.lineTo(w + 20, VIEW_H);
  ctx.fill();
}

/** The landscape back to front; `after[depth]()` draws what lives in that layer. */
export function drawLandscape(ctx, { w, camX, time, layerW, after }) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "#7dd3fc");
  g.addColorStop(0.6, "#e0f2fe");
  g.addColorStop(1, "#fef9c3");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, VIEW_H);
  ctx.fillStyle = "rgba(253, 224, 71, .9)";
  ctx.beginPath();
  ctx.arc(w * 0.82 - camX * 0.05, 90, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.85)";
  for (let i = 0; i < 9; i++) {
    const cw = layerW(0.15) + 400;
    const cx = ((seeded(i) * cw + time * (6 + i)) % cw) - 200 - camX * 0.15;
    cloud(ctx, cx, 40 + seeded(i + 20) * 120, 0.6 + seeded(i + 40) * 0.8);
  }

  hills(ctx, w, camX * DEPTHS.far.par, "#a7c4a0", HILLS.far);
  after.far();

  const midCam = camX * DEPTHS.mid.par;
  hills(ctx, w, midCam, "#7fb069", HILLS.mid);
  for (let i = 0; i < 40; i++) {
    const tx = i * 140 + seeded(i + 3) * 80;
    const sx = tx - midCam;
    if (sx < -40 || sx > w + 40) continue;
    tree(ctx, sx, hillY(tx, HILLS.mid) + 4, 0.7 + seeded(i + 9) * 0.5);
  }
  after.mid();

  const nearCam = camX;
  hills(ctx, w, nearCam, "#5a9a4a", HILLS.near);
  ctx.strokeStyle = "#8b5e34";
  ctx.lineWidth = 5;
  for (let i = 0; i < 60; i++) {
    const fx = i * 110;
    const sx = fx - nearCam;
    if (sx < -20 || sx > w + 20) continue;
    const fy = hillY(fx, HILLS.near);
    ctx.beginPath();
    ctx.moveTo(sx, fy + 18);
    ctx.lineTo(sx, fy - 30);
    ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let sx = -10; sx <= w + 10; sx += 10) {
    const fy = hillY(sx + nearCam, HILLS.near) - 18;
    if (sx === -10) ctx.moveTo(sx, fy); else ctx.lineTo(sx, fy);
  }
  ctx.stroke();
  after.near();

  const fgCam = camX * 1.25;
  ctx.fillStyle = "#3f7d34";
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let sx = 0; sx <= w + 12; sx += 12) {
    const wx = sx + fgCam;
    ctx.lineTo(sx, 556 + Math.sin(wx * 0.05) * 6 - (Math.floor(wx / 12) % 3 === 0 ? 14 : 0));
  }
  ctx.lineTo(w + 12, VIEW_H);
  ctx.fill();
}

/** Card size for a bird at scale s. */
// Word cards: never below 16 logical px, or the far birds' words are unreadable on a phone
// (22 × 0.52 = 11 px, then ×0.9 for the canvas scale).
export const wordFont = (s) => Math.max(16, Math.round(22 * s));
export function cardSize(ctx, mode, word, s) {
  if (mode === "wort") {
    ctx.font = `700 ${wordFont(s)}px system-ui, sans-serif`;
    return { w: Math.max(84 * s, ctx.measureText(word.w).width + 26 * Math.max(s, 0.7)), h: Math.max(46 * s, 30) };
  }
  return { w: 84 * s, h: 84 * s };
}

/**
 * The Pieper. `look`: { dizzy, angry, warn, golden, flap } — dizzy = stars around the head
 * after a pellet bonk; warn = red pulse before a dive.
 */
export function drawBird(ctx, { x, y, s, dir, color, word, mode, image, time, ph, look = {}, card = true }) {
  if (card) {
    const c = cardSize(ctx, mode, word, s);
    const top = y + 44 * s;
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y + 22 * s);
    ctx.lineTo(x - c.w / 3, top);
    ctx.moveTo(x + 6 * s, y + 22 * s);
    ctx.lineTo(x + c.w / 3, top);
    ctx.stroke();
    ctx.save();
    ctx.translate(x, top);
    ctx.rotate(Math.sin(time * 2 + ph) * 0.06);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = look.golden ? "#ca8a04" : look.warn ? "#dc2626" : "#1e293b";
    ctx.lineWidth = (look.golden || look.warn ? 4 : 2) * s;
    roundRect(ctx, -c.w / 2, 0, c.w, c.h, 10 * s);
    ctx.fill();
    ctx.stroke();
    if (mode === "wort") {
      ctx.fillStyle = "#0f172a";
      ctx.font = `700 ${wordFont(s)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word.w, 0, c.h / 2 + 1);
    } else if (image && image.complete && image.naturalWidth) {
      ctx.drawImage(image, -c.w / 2 + 7 * s, 7 * s, c.w - 14 * s, c.h - 14 * s);
    }
    ctx.restore();
  }

  if (look.warn) {
    const p = look.calm ? 0.6 : (Math.sin(time * 18) + 1) / 2; // calm = reduced motion: no flashing
    ctx.strokeStyle = `rgba(220, 38, 38, ${0.5 + p * 0.5})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 44 * s + p * 8 * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const flap = Math.sin(time * (look.fast ? 26 : 14) + ph);
  ctx.fillStyle = shade(color, -0.25);
  ctx.beginPath();
  ctx.moveTo(-22, -2);
  ctx.lineTo(-44, -14);
  ctx.lineTo(-40, 4);
  ctx.lineTo(-44, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ea580c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 22); ctx.lineTo(-6, 28);
  ctx.moveTo(6, 22); ctx.lineTo(6, 28);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(color, 0.55);
  ctx.beginPath();
  ctx.ellipse(6, 8, 15, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.3);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -24); ctx.lineTo(-4, -36);
  ctx.moveTo(5, -23); ctx.lineTo(6, -37);
  ctx.moveTo(10, -21); ctx.lineTo(15, -32);
  ctx.stroke();
  ctx.save();
  ctx.translate(-6, -4);
  ctx.rotate(-0.3 - flap * 0.7);
  ctx.fillStyle = shade(color, -0.15);
  ctx.beginPath();
  ctx.ellipse(-8, -6, 20, 10, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(13, -7, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = "#0f172a";
  if (look.dizzy) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.4) {
      const r = a * 0.55;
      ctx.lineTo(13 + Math.cos(a + time * 8) * r, -7 + Math.sin(a + time * 8) * r);
    }
    ctx.stroke();
  } else if (look.angry) {
    ctx.beginPath();
    ctx.arc(15, -6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, -17); ctx.lineTo(20, -12);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(15, -7, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // beak (open when warning or angry)
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  if (look.warn || look.angry) {
    ctx.moveTo(24, -6); ctx.lineTo(40, -6); ctx.lineTo(25, 0);
    ctx.moveTo(25, 2); ctx.lineTo(38, 8); ctx.lineTo(24, 8);
  } else {
    ctx.moveTo(24, -4); ctx.lineTo(38, 1); ctx.lineTo(24, 6);
  }
  ctx.closePath();
  ctx.fill();
  if (look.golden) {
    ctx.fillStyle = "#fff";
    const tw = (Math.sin(time * 10) + 1) / 2;
    star(ctx, -20, -26, 5 * tw + 2);
    star(ctx, 30, -24, 5 * (1 - tw) + 2);
  }
  ctx.restore();

  if (look.dizzy) {
    ctx.fillStyle = "#facc15";
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + (i * Math.PI * 2) / 3;
      star(ctx, x + Math.cos(a) * 26 * s, y - 34 * s + Math.sin(a) * 8 * s, 7 * s);
    }
  }
}

/** The Gummi-Blaster, seen from behind. Returns the muzzle point. */
export function drawGun(ctx, { x, y, tilt, recoil, ammo, mag, time, flash }) {
  const kick = recoil * 16;
  ctx.save();
  ctx.translate(x, y + kick);
  ctx.rotate(tilt);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.beginPath();
  ctx.ellipse(6, 40, 92, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = "#f97316";
  roundRect(ctx, -66, -58, 132, 120, 30);
  ctx.fill();
  ctx.fillStyle = "#fb923c";
  roundRect(ctx, -54, -50, 108, 34, 16);
  ctx.fill();
  // barrel (perspective: narrower at the far end)
  ctx.fillStyle = "#84cc16";
  ctx.beginPath();
  ctx.moveTo(-32, -40);
  ctx.lineTo(-18, -168);
  ctx.lineTo(18, -168);
  ctx.lineTo(32, -40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#65a30d";
  for (const [yy, hw] of [[-80, 27], [-122, 23]]) {
    ctx.fillRect(-hw, yy - 5, hw * 2, 10);
  }
  // safety tip and the bore
  ctx.fillStyle = "#ea580c";
  ctx.beginPath();
  ctx.ellipse(0, -170, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#431407";
  ctx.beginPath();
  ctx.ellipse(0, -170, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // hopper on the right: shows the pellets left
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.strokeStyle = "#9a3412";
  ctx.lineWidth = 3;
  roundRect(ctx, 52, -108, 44, 76, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#facc15";
  for (let i = 0; i < ammo; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    ctx.beginPath();
    ctx.arc(64 + col * 20, -42 - row * 16, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // grip hint
  ctx.fillStyle = "#c2410c";
  roundRect(ctx, -20, 30, 40, 40, 10);
  ctx.fill();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.beginPath();
    ctx.arc(0, -176, 18 + (1 - flash) * 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return { x: x + Math.sin(tilt) * 170, y: y + kick - Math.cos(tilt) * 170 };
}

export function drawPellet(ctx, x, y, r, trail) {
  ctx.fillStyle = "rgba(250, 204, 21, .35)";
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * (0.3 + (i / trail.length) * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#facc15";
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = Math.max(1, r * 0.3);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

export const ITEM_LOOK = {
  zeit: { color: "#3b82f6", icon: "⏱", label: "+5 seconds" },
  herz: { color: "#ef4444", icon: "❤", label: "+1 heart" },
  streu: { color: "#a855f7", icon: "✳", label: "Spread shot!" },
  zeitlupe: { color: "#14b8a6", icon: "🐌", label: "Slow motion!" },
};

export function drawBalloon(ctx, x, y, s, kind, time) {
  const look = ITEM_LOOK[kind];
  ctx.strokeStyle = "rgba(15,23,42,.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + 30 * s);
  ctx.quadraticCurveTo(x + Math.sin(time * 3) * 8, y + 50 * s, x, y + 70 * s);
  ctx.stroke();
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.ellipse(x, y, 26 * s, 30 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 5 * s, y + 32 * s);
  ctx.lineTo(x + 5 * s, y + 32 * s);
  ctx.lineTo(x, y + 27 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.beginPath();
  ctx.ellipse(x - 9 * s, y - 11 * s, 6 * s, 10 * s, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(24 * s)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(look.icon, x, y + 1);
  // sparkle so it reads as "special"
  const tw = (Math.sin(time * 7) + 1) / 2;
  ctx.fillStyle = "#fde047";
  star(ctx, x + 26 * s, y - 24 * s, (4 + tw * 4) * s);
}

/** The hidden things (windmill, signpost, balloon) at screen position x/y. */
export function drawHidden(ctx, id, x, y, found, spin) {
  if (id === "muehle") {
    ctx.fillStyle = "#e7e5e4";
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x - 10, y - 70);
    ctx.lineTo(x + 10, y - 70);
    ctx.lineTo(x + 16, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.moveTo(x - 13, y - 70);
    ctx.lineTo(x, y - 86);
    ctx.lineTo(x + 13, y - 70);
    ctx.fill();
    ctx.fillStyle = "#57534e";
    ctx.fillRect(x - 4, y - 14, 8, 14);
    ctx.save();
    ctx.translate(x, y - 74);
    ctx.rotate(spin);
    ctx.fillStyle = found ? "#fde047" : "#f5f5f4";
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(2, -4, 40, 9);
      ctx.strokeRect(2, -4, 40, 9);
    }
    ctx.restore();
  } else if (id === "wegweiser") {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x - 3, y - 76, 6, 76);
    ctx.fillStyle = found ? "#fde047" : "#fef3c7";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2;
    for (const [dy, d] of [[-70, 1], [-50, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy);
      ctx.lineTo(x + d * 34, y + dy);
      ctx.lineTo(x + d * 42, y + dy + 7);
      ctx.lineTo(x + d * 34, y + dy + 14);
      ctx.lineTo(x, y + dy + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (id === "ballon") {
    ctx.fillStyle = found ? "#fde047" : "#ef4444";
    ctx.beginPath();
    ctx.arc(x, y, 18, Math.PI, 0);
    ctx.quadraticCurveTo(x + 18, y + 14, x + 4, y + 24);
    ctx.lineTo(x - 4, y + 24);
    ctx.quadraticCurveTo(x - 18, y + 14, x - 18, y);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 3, y - 18, 6, 40);
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 24); ctx.lineTo(x - 4, y + 32);
    ctx.moveTo(x + 4, y + 24); ctx.lineTo(x + 4, y + 32);
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.fillRect(x - 5, y + 32, 10, 7);
  }
}

/** Feathers stuck on the view after a diver got through. k = 1 fresh … 0 gone. */
export function drawSmudge(ctx, w, k, seed) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.4);
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.beginPath();
  ctx.ellipse(w / 2, VIEW_H * 0.45, w * 0.32, VIEW_H * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = seeded(seed + i) * Math.PI * 2;
    const r = 40 + seeded(seed + i + 9) * 150;
    const x = w / 2 + Math.cos(a) * r;
    const y = VIEW_H * 0.45 + Math.sin(a) * r * 0.7 + (1 - k) * 60;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + (1 - k) * 2);
    ctx.fillStyle = ["#f59e0b", "#3b82f6", "#ec4899", "#10b981"][i % 4];
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(15,23,42,.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-24, 0); ctx.lineTo(22, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
